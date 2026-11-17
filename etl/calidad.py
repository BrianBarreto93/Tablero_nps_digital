"""Contrato de datos. Cada chequeo devuelve {id, nivel, titulo, detalle, n}.
nivel = 'error' → la corrida se detiene y no se publica; 'aviso' → se muestra en la pestaña Calidad; 'ok'.
"""
import calendar
import re

from etl.config import ESTUDIOS, VARIACION_N_AVISO, columnas


class ErrorCalidad(RuntimeError):
    pass


def _chk(id_, nivel, titulo, detalle, n=0):
    return {"id": id_, "nivel": nivel, "titulo": titulo, "detalle": detalle, "n": int(n)}


def num(n):
    return f"{int(n):,}".replace(",", ".")


def _pct(a, b):
    if not b:
        return "0"
    return f"{num(a)} de {num(b)} (" + f"{a / b * 100:.1f}".replace(".", ",") + " %)"


def esquema(clave, columnas_oracle):
    e = ESTUDIOS[clave]
    faltan = sorted(set(columnas(clave) + e["nombres"]) - set(columnas_oracle))
    if faltan:
        raise ErrorCalidad(f"Faltan columnas en {e['tabla']}: {', '.join(faltan)}")


def evaluar(clave, crudo, d, n_anterior=None):
    """Chequeos de UN estudio en UN periodo (crudo y d ya filtrados, mismo índice)."""
    e, n, out = ESTUDIOS[clave], len(d), []
    nom = e["nombre"]
    pre = f"{clave}_"

    dup = int(crudo.RESPONSEID.duplicated().sum())
    out.append(_chk(pre + "id_unico", "error" if dup else "ok", f"{nom}: una fila por respuesta",
                    f"{dup} RESPONSEID repetidos" if dup else f"{num(n)} respuestas, sin repetidos", dup))

    fuera = int((d.nps_txt.notna() & d.nps.isna()).sum())
    out.append(_chk(pre + "nps_rango", "error" if fuera else "ok", f"{nom}: recomendación ({e['nps']}) entre 0 y 10",
                    f"{fuera} respuestas fuera de rango" if fuera else "Todas válidas", fuera))
    inc = int((d.grupo_fuente.notna() & d.nps.notna() & (d.grupo != d.grupo_fuente)).sum())
    out.append(_chk(pre + "nps_grupo", "error" if inc else "ok", f"{nom}: grupo NPS de Qualtrics coincide con la nota",
                    f"{inc} filas con grupo distinto al que da la nota" if inc else "Coincide en todas", inc))

    catalogos = [("nsu", e["nsu"] and e["nsu"][0], "satisfacción"), ("ces", e.get("ces"), "facilidad (CES)"),
                 ("fcr", e.get("fcr"), "resolución (FCR)"), ("ecc", e.get("facil_compra"), "facilidad de la compra"),
                 ("ecp", e.get("facil_pago"), "facilidad del pago"), ("menos", e.get("menos"), "lo que menos gustó"),
                 ("mas", e.get("mas"), "lo que más gustó")]
    for col, q, txt in catalogos:
        if not q:
            continue
        malos = d[f"{col}_txt"].notna() & d[col].isna()
        k = int(malos.sum())
        ej = ", ".join(sorted(map(str, d.loc[malos, f"{col}_txt"].unique()))[:3])
        out.append(_chk(f"{pre}{col}_catalogo", "error" if k else "ok", f"{nom}: {txt} ({q}) dentro del catálogo",
                        f"{k} valores fuera del catálogo: {ej}. Agregarlos en etl/config.py" if k else "Todos en el catálogo", k))
    if e.get("motivos"):
        malos = [m for ms in d.motivos_malos for m in ms]
        out.append(_chk(pre + "motivos_catalogo", "error" if malos else "ok",
                        f"{nom}: motivos ({e['motivos']}) dentro del catálogo",
                        f"{len(malos)} opciones desconocidas: {', '.join(sorted(set(malos))[:3])}" if malos else "Todos en el catálogo",
                        len(malos)))

    # ---- avisos
    sin_nps = int(d.nps.isna().sum())
    if sin_nps:
        out.append(_chk(pre + "nps_vacio", "aviso", f"{nom}: encuestas sin recomendación",
                        f"{_pct(sin_nps, n)}. No cuentan en el NPS; sí en los demás indicadores que respondieron.", sin_nps))
    inc_ = int((~d.terminada).sum())
    out.append(_chk(pre + "incompletas", "aviso" if inc_ else "ok", f"{nom}: encuestas sin terminar",
                    f"{_pct(inc_, n)}. Cuentan en cada indicador que alcanzaron a responder; por eso cada uno tiene su propio n.", inc_))
    for col, titulo in [("segmento", "segmento"), ("modulo", "módulo")]:
        k = int((d[col] == "Sin dato").sum())
        if k:
            out.append(_chk(f"{pre}{col}_sin_dato", "aviso", f"{nom}: {titulo} sin dato", _pct(k, n), k))
    if n_anterior:
        var = n / n_anterior - 1
        out.append(_chk(pre + "volumen", "aviso" if abs(var) > VARIACION_N_AVISO else "ok", f"{nom}: volumen frente al mes anterior",
                        f"{num(n)} encuestas vs {num(n_anterior)} ({var * 100:+.0f} %)", n))
    return out


def periodo_parcial(p, fechas):
    """Aviso si el mes todavía no está completo (última respuesta antes del último día del mes)."""
    ult = fechas.max()
    fin = calendar.monthrange(int(p[:4]), int(p[4:]))[1]
    if ult.day < fin:
        return _chk("parcial", "aviso", "Mes en curso o incompleto",
                    f"Las respuestas llegan hasta el {ult.day} de {fin} días ({ult:%Y-%m-%d %H:%M}). "
                    "Compárelo con cuidado contra meses completos.", ult.day)
    return _chk("parcial", "ok", "Mes completo", f"Respuestas hasta el {ult:%Y-%m-%d}", ult.day)


def faltantes(p, presentes):
    k = [ESTUDIOS[c]["nombre"] for c in ESTUDIOS if c not in presentes]
    return _chk("estudios", "aviso" if k else "ok", "Los cuatro estudios tienen encuestas en el mes",
                f"Sin encuestas: {', '.join(k)}. El NPS Digital del mes no los incluye." if k else "Los cuatro llegaron", len(k))


# ------------------------------------------------------------------ escaneo de datos personales en la salida
_CORREO = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")
_DIGITOS = re.compile(r"\d[\d .-]{5,}\d")  # 7+ dígitos, aunque vengan con espacios o guiones


def escanear_pii(items):
    """items = [(texto, nombres_del_encuestado), …]. Devuelve los hallazgos (lista vacía = limpio)."""
    hall = []
    for t, nombres in items:
        if not t:
            continue
        if _CORREO.search(t):
            hall.append(("correo", t[:60]))
        if any(sum(c.isdigit() for c in m.group()) >= 7 for m in _DIGITOS.finditer(t)):
            hall.append(("número largo", t[:60]))
        for nom in nombres or ():
            if nom and len(nom) >= 3 and re.search(rf"\b{re.escape(nom)}\b", t, re.I):
                hall.append(("nombre del encuestado", t[:60]))
                break
    return hall
