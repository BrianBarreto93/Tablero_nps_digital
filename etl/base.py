"""Base descargable: una fila por encuesta, sin datos personales (sin nombre, teléfono, correo, cédula ni cuenta).
Los comentarios van con los mismos tapados que los verbatims. El tablero la filtra con los filtros activos.
"""
import pandas as pd

from etl.config import BOT_MAS, BOT_MENOS, ECOM_MOTIVOS, ESTUDIOS, SIN_DATO
from etl.limpiar import texto_opcion
from etl.verbatims import nombres_de, tapar, util

# Las numéricas y de fecha deben coincidir con NUMERICAS y FECHAS de tablero/exportar.js
COLUMNAS = ["ID respuesta", "Fecha respuesta", "Mes", "Semana", "Estudio", "Canal", "Segmento", "Módulo",
            "Recomendación (0-10)", "Grupo NPS", "Satisfacción (nota)", "Satisfecho (NSU)", "Facilidad", "Facilidad (1-5)",
            "Resolvió (FCR)", "Emoción", "Facilidad compra (1-5)", "Facilidad pago (1-5)", "Motivos de la calificación",
            "Lo que menos gustó", "Lo que más gustó", "Encuesta terminada", "Temas Qualtrics",
            "Comentario: lo que falló", "Comentario: otros", "Comentario: lo que gustó"]
# Columnas con las que el tablero filtra la base (dimensión del cubo → columna)
FILTRO = {"periodo": "Mes", "estudio": "Estudio", "canal": "Canal", "segmento": "Segmento", "modulo": "Módulo"}
_FAC = {1: "Muy difícil", 2: "Difícil", 3: "Ni fácil ni difícil", 4: "Fácil", 5: "Muy fácil"}


def _n(v):
    return "" if v is None or pd.isna(v) else str(int(v))


def _cat(v, lista):
    return "" if v is None or pd.isna(v) else lista[int(v)]


def construir(clave, crudo, d):
    """Devuelve (filas, escaneo): filas en el orden de COLUMNAS; escaneo = [(texto, nombres)] para calidad.escanear_pii."""
    e, filas, escaneo = ESTUDIOS[clave], [], []
    for i in d.index:
        nombres = nombres_de(crudo, i, clave)
        com = {"neg": [], "neu": [], "pos": []}
        for q, (_, lado) in e["abiertas"].items():
            t = texto_opcion(crudo.at[i, q])
            if t and util(t):
                t = tapar(t, nombres)
                escaneo.append((t, nombres))
                com[lado].append(t)
        p, fr = d.at[i, "periodo"], d.at[i, "fecha"]
        sat = d.at[i, "nsu_ok"]
        fila = [
            str(crudo.at[i, "RESPONSEID"]), fr.strftime("%Y-%m-%d %H:%M:%S") if pd.notna(fr) else "",
            f"{p[:4]}-{p[4:]}", d.at[i, "semana"], d.at[i, "estudio"], d.at[i, "canal"], d.at[i, "segmento"], d.at[i, "modulo"],
            _n(d.at[i, "nps"]), d.at[i, "grupo"] if isinstance(d.at[i, "grupo"], str) else "",
            _n(d.at[i, "nsu"]), "" if pd.isna(sat) else ("Sí" if sat else "No"),
            _FAC.get(d.at[i, "ces"], ""), _n(d.at[i, "ces"]),
            {1: "Sí", 0: "No"}.get(None if pd.isna(d.at[i, "fcr"]) else int(d.at[i, "fcr"]), ""),
            d.at[i, "emocion"] if isinstance(d.at[i, "emocion"], str) else "",_n(d.at[i, "ecc"]), _n(d.at[i, "ecp"]),
            ", ".join(ECOM_MOTIVOS[m] for m in d.at[i, "motivos"]),
            _cat(d.at[i, "menos"], BOT_MENOS), _cat(d.at[i, "mas"], BOT_MAS),
            "Sí" if d.at[i, "terminada"] else "No", ", ".join(d.at[i, "temas"]),
            " | ".join(com["neg"]), " | ".join(com["neu"]), " | ".join(com["pos"]),
        ]
        filas.append([SIN_DATO if v is None else v for v in fila])
    return filas, escaneo
