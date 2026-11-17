"""Normalización de las cuatro encuestas a un esquema común. Una fila de entrada = una fila de salida (nunca se
descartan encuestas); lo que no se puede interpretar queda en None / «Sin dato» y lo cuenta calidad.py.
"""
import re
import unicodedata

import pandas as pd

from etl.config import (BOT_MAS, BOT_MENOS, ECOM_MOTIVOS, EMOCIONES, ESTUDIOS, FACILIDAD, MODULOS, NO_APLICA, SEGMENTOS,
                        SI_NO, SIN_DATO, TEMAS_CORRIGE, TEMAS_PADRE)

_PREFIJO = re.compile(r"^[^\wÁÉÍÓÚÜÑáéíóúüñ¿]+")


def texto_opcion(v):
    """'😄\\n\\nMuy fácil' → 'Muy fácil'; 'MÃ³vil' → 'Móvil'. None si viene vacío."""
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    s = str(v)
    if "Ã" in s:  # UTF-8 leído como Latin-1 en la carga
        try:
            s = s.encode("latin-1").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            pass
    s = unicodedata.normalize("NFC", _PREFIJO.sub("", s))
    s = re.sub(r"\s+", " ", s).strip()
    return s or None


def a_entero(v, lo, hi):
    s = texto_opcion(v)
    if s is None or not re.fullmatch(r"-?\d+(\.0+)?", s):
        return None
    n = int(float(s))
    return n if lo <= n <= hi else None


def _num(serie, lo, hi):
    return pd.to_numeric(serie.map(lambda v: a_entero(v, lo, hi)), errors="coerce")


def _cat(serie, catalogo):
    """Texto limpio y su posición en el catálogo (lista) o su valor (dict)."""
    txt = serie.map(texto_opcion)
    if isinstance(catalogo, dict):
        val = txt.map(catalogo)
    else:
        val = txt.map(lambda t: catalogo.index(t) if t in catalogo else None)
    return txt, pd.to_numeric(val, errors="coerce")


def modulo(v):
    """'hog_pagar_factura' → ('Pagar factura', 'Hogar'); 'equipos_financiados' → ('Equipos financiados', None)."""
    s = (texto_opcion(v) or "").lower()
    if not s:
        return None, None
    m = re.match(r"^(pos|hog|pre)_(.+)$", s)
    seg, base = (SEGMENTOS[m.group(1)], m.group(2)) if m else (None, s)
    return MODULOS.get(base, base.replace("_", " ").capitalize()), seg


def temas(v):
    """'APP,Fallas App,Lentitud' → ['Lentitud'] (sin las etiquetas que solo agrupan)."""
    s = texto_opcion(v)
    if not s:
        return []
    out = []
    for t in s.split(","):
        t = t.strip()
        if t and t not in TEMAS_PADRE:
            t = t[:1].upper() + t[1:].lower()
            t = TEMAS_CORRIGE.get(t, t)
            if t not in out:
                out.append(t)
    return out


def motivos(v):
    """Opción múltiple de E-commerce: 'Funcionamiento de la Tienda online ,Opciones de pago  ' → ([0, 1], [])."""
    s = texto_opcion(v)
    if not s:
        return [], []
    ok, malos = [], []
    for t in s.split(","):
        t = re.sub(r"\s+", " ", t).strip()
        if not t:
            continue
        (ok if t in ECOM_MOTIVOS else malos).append(ECOM_MOTIVOS.index(t) if t in ECOM_MOTIVOS else t)
    return ok, malos


def limpiar_estudio(clave, crudo):
    e = ESTUDIOS[clave]
    d = pd.DataFrame(index=crudo.index)
    d["clave"] = clave
    d["estudio"] = e["nombre"]
    # Periodo = mes de RECORDEDDATE (cuando Qualtrics registró la respuesta), igual que el Power BI
    fr = pd.to_datetime(crudo.RECORDEDDATE, errors="coerce")
    d["fecha"] = fr
    d["periodo"] = fr.dt.strftime("%Y%m")
    # Semana = lunes de la semana, recortado al día 1 del mes (la semana que empieza en el mes anterior se rotula «1 nov»)
    lunes = fr.dt.normalize() - pd.to_timedelta(fr.dt.day_of_week, unit="D")
    d["semana"] = lunes.where(lunes >= fr.dt.to_period("M").dt.start_time, fr.dt.to_period("M").dt.start_time).dt.strftime("%Y-%m-%d")
    d["terminada"] = crudo.FINISHED.map(texto_opcion).isin(["Verdadero", "True", "1"])

    d["nps_txt"] = crudo[e["nps"]].map(texto_opcion)
    d["nps"] = _num(crudo[e["nps"]], 0, 10)
    d["grupo"] = pd.cut(d.nps, [-1, 6, 8, 10], labels=["Detractor", "Pasivo", "Promotor"]).astype(object)
    d["grupo_fuente"] = crudo[e["nps_grupo"]].map(texto_opcion)

    if e["nsu"]:
        q, lo, hi, corte = e["nsu"]
        d["nsu_txt"] = crudo[q].map(texto_opcion)
        d["nsu"] = _num(crudo[q], lo, hi)
        d["nsu_ok"] = (d.nsu >= corte).where(d.nsu.notna())
    else:
        d["nsu_txt"], d["nsu"], d["nsu_ok"] = None, float("nan"), float("nan")

    for col, q, cat in [("ces", e.get("ces"), FACILIDAD), ("fcr", e.get("fcr"), SI_NO),
                        ("ecc", e.get("facil_compra"), FACILIDAD), ("ecp", e.get("facil_pago"), FACILIDAD),
                        ("menos", e.get("menos"), BOT_MENOS), ("mas", e.get("mas"), BOT_MAS)]:
        if q:
            d[col + "_txt"], d[col] = _cat(crudo[q], cat)
        else:
            d[col + "_txt"], d[col] = None, float("nan")
    d["emocion"] = crudo[e["emocion"]].map(lambda v: texto_opcion(v) if texto_opcion(v) in EMOCIONES else None) \
        if e.get("emocion") else None
    d["emocion_txt"] = crudo[e["emocion"]].map(texto_opcion) if e.get("emocion") else None
    if e.get("motivos"):
        m = crudo[e["motivos"]].map(motivos)
        d["motivos"], d["motivos_malos"] = m.str[0], m.str[1]
    else:
        d["motivos"] = [[] for _ in range(len(d))]
        d["motivos_malos"] = [[] for _ in range(len(d))]

    # Canal, segmento y módulo (cada estudio trae cosas distintas; lo que no existe queda «No aplica»)
    if clave == "app":
        d["canal"] = crudo.TIPO_APP.map(lambda v: "Mi Claro App (Super App)" if texto_opcion(v) == "SUPERAPP" else "Mi Claro Web")
        mods = [modulo(a) if texto_opcion(a) else modulo(w) for a, w in zip(crudo.MODULO_APP, crudo.MODULO_WEB)]
        d["modulo"] = [m or SIN_DATO for m, _ in mods]
        seg_col = crudo.SEGMENTO_APP.map(lambda v: SEGMENTOS.get((texto_opcion(v) or "").lower()))
        d["segmento"] = [s or (sc if isinstance(sc, str) else None) or SIN_DATO for (_, s), sc in zip(mods, seg_col)]
    elif clave == "wa":
        d["canal"] = "WhatsApp Bot"
        d["modulo"] = NO_APLICA
        d["segmento"] = crudo.SEGMENTACION_CLIENTE.map(lambda v: SEGMENTOS.get((texto_opcion(v) or "").lower(), SIN_DATO))
    elif clave == "ecom":
        d["canal"] = crudo.DISPOSITIVO.map(lambda v: {"Móvil": "Tienda online · móvil", "Web": "Tienda online · web"}
                                           .get(texto_opcion(v), "Tienda online · sin dato"))
        d["modulo"] = d["segmento"] = NO_APLICA
    else:
        d["canal"] = "Claro Bot"
        d["modulo"] = d["segmento"] = NO_APLICA

    # Temas de la analítica de texto de Qualtrics en las preguntas de lo malo (una lista por encuesta)
    tem = [[] for _ in range(len(d))]
    com = pd.Series(0, index=d.index)
    for q in e["temas"]:
        com = com | crudo[q].map(lambda v: texto_opcion(v) is not None).astype(int)
        for i, ts in enumerate(crudo[f"{q}_TOPICS"].map(temas)):
            tem[i] += [t for t in ts if t not in tem[i]]
    d["temas"] = tem
    d["com_temas"] = com.astype(int)
    return d


def limpiar(crudos):
    """crudos = {clave: DataFrame de Oracle}. Devuelve un DataFrame con el esquema común de los cuatro estudios."""
    partes = [limpiar_estudio(k, c.reset_index(drop=True)) for k, c in crudos.items() if len(c)]
    return pd.concat(partes, ignore_index=True) if partes else pd.DataFrame()
