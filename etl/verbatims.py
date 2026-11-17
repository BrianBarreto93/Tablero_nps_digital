"""Comentarios abiertos limpios. Se tapan: correos, cifras de 5+ dígitos (cuentas, teléfonos, cédulas), el nombre del
propio encuestado (todas las columnas de nombre del estudio), los nombres propios que siguen a «asesor», «señor»… y los
pares «Nombre Apellido» cuyas dos palabras son nombres de alguna encuesta del corte.

Mi Claro deja ~35.000 comentarios al mes: se guardan los que dicen algo y, si una pregunta pasa su tope
(TOPE_COMENTARIOS), una muestra aleatoria fija.
"""
import random
import re
import unicodedata

import pandas as pd

from etl.config import ESTUDIOS, TOPE_COMENTARIOS
from etl.limpiar import texto_opcion

_NO_NOMBRE = {"DE", "DEL", "LA", "LAS", "LOS", "Y", "SAN", "SANTA", "VDA", "VIUDA", "NULL", "NONE", "NAN"}
_CORREO = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")
_CIFRA = re.compile(r"\d(?:[\d .-]{3,}\d)")  # 5+ caracteres empezando y terminando en dígito
_ROL = re.compile(
    r"\b((?i:(?:el|la|al|un|una)?\s*(?:asesor(?:a|es)?|se[ñn]or(?:a|ita)?|sr\.?|sra\.?|don|do[ñn]a|agente|t[ée]cnic[oa]|"
    r"funcionari[oa]|de nombre|me llamo|mi nombre es|soy))\s+)"
    r"([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,3})")
_PAR_TITULO = re.compile(r"\b([A-ZÁÉÍÓÚÑ][a-záéíóúñü]{2,})\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñü]{2,})\b")
_MINIMO = 3
# Comentarios que no dicen nada concreto: no se guardan (sí cuentan en los indicadores)
GENERICO = re.compile(
    r"^(n/?a|na|ninguna?o?|nada|no|si|sí|ok|okey|bien|muy bien|bueno|buena|buen servicio|excelente|excelente servicio|"
    r"todo|todo bien|todo está bien|todo esta bien|gracias|muchas gracias|mal[oa]?|regular|ningún comentario|"
    r"sin comentarios?|no tengo|nada más|nada mas|\W*|\d+)\W*$", re.I)
_NO_GLOBAL = {"CLARO", "MOVIL", "HOGAR", "FIBRA", "NEQUI", "DAVIPLATA", "BANCOLOMBIA", "FACTURA", "PAGO", "SERVICIO",
              "CLIENTE", "TODO", "BIEN", "PLAN", "INTERNET", "COLOMBIA", "MUY", "BUENA", "BUENO", "EXCELENTE", "GRACIAS",
              "WHATSAPP", "APP", "MI", "LUZ", "PAZ", "ROSA", "ESPERANZA", "SOL", "MAR", "ANGEL", "CRUZ", "DIOS", "FE"}
_GLOBAL = set()


def _clave(t):
    return unicodedata.normalize("NFD", t.upper()).encode("ascii", "ignore").decode()


def tokens_nombre(*partes):
    out = []
    for p in partes:
        if p is None or (isinstance(p, float) and pd.isna(p)):
            continue
        for t in re.split(r"[\s,.-]+", str(p)):
            if len(t) >= 3 and t.upper() not in _NO_NOMBRE and not t.isdigit() and "@" not in t:
                out.append(t)
    return out


def fijar_nombres_globales(textos):
    """Nombres de todas las encuestas del corte: un par «Nombre Apellido» se tapa si sus dos palabras están aquí."""
    _GLOBAL.clear()
    _GLOBAL.update({_clave(t) for t in tokens_nombre(*textos)} - {_clave(w) for w in _NO_GLOBAL})


def tapar(texto, nombres=()):
    s = _CORREO.sub("[correo]", texto)
    s = _CIFRA.sub(lambda m: "[#]" if sum(c.isdigit() for c in m.group()) >= 5 else m.group(), s)
    for nom in sorted(set(nombres), key=len, reverse=True):
        s = re.sub(rf"\b{re.escape(nom)}\b", "[nombre]", s, flags=re.I)
    s = _ROL.sub(lambda m: m.group(1) + "[nombre]", s)
    if _GLOBAL:
        s = _PAR_TITULO.sub(lambda m: "[nombre]" if all(_clave(g) in _GLOBAL for g in m.groups()) else m.group(), s)
    s = re.sub(r"(\[nombre\][\s,]*){2,}", "[nombre] ", s)
    return re.sub(r"\s+", " ", s).strip()


def util(texto):
    """True si el comentario dice algo (no es «ninguna», «ok», «excelente», un número…)."""
    return bool(texto) and sum(c.isalpha() for c in texto) >= _MINIMO and not GENERICO.match(texto.strip())


def nombres_de(crudo, i, clave):
    return tokens_nombre(*[crudo.at[i, c] for c in ESTUDIOS[clave]["nombres"]])


def construir(clave, crudo, d, periodo):
    """Comentarios de un estudio en un periodo (crudo y d con el mismo índice).
    Devuelve (filas, escaneo, conteo): filas con dims + notas + pregunta + texto; escaneo = [(texto, nombres)] para
    calidad.escanear_pii; conteo = {pregunta: [útiles, guardados]}."""
    from etl.agregar import DIMS
    por_q = {q: [] for q in ESTUDIOS[clave]["abiertas"]}
    escaneo = []
    for i in d.index:
        nombres = nombres_de(crudo, i, clave)
        for q in por_q:
            t = texto_opcion(crudo.at[i, q])
            if not util(t):
                continue
            limpio = tapar(t, nombres)
            if not util(limpio.replace("[nombre]", "")):
                continue
            escaneo.append((limpio, nombres))
            fila = {k: d.at[i, k] for k in DIMS}
            fila.update({"nps": None if pd.isna(d.at[i, "nps"]) else int(d.at[i, "nps"]),
                         "ces": None if pd.isna(d.at[i, "ces"]) else int(d.at[i, "ces"]),
                         "fcr": None if pd.isna(d.at[i, "fcr"]) else int(d.at[i, "fcr"]),
                         "pregunta": f"{clave}:{q}", "texto": limpio})
            por_q[q].append(fila)
    filas, conteo = [], {}
    for q, fs in por_q.items():
        tope = TOPE_COMENTARIOS.get((clave, q))
        guardar = random.Random(f"{periodo}{clave}{q}").sample(fs, tope) if tope and len(fs) > tope else fs
        conteo[q] = [len(fs), len(guardar)]
        filas += guardar
    return filas, escaneo, conteo
