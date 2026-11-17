"""Cubo de CONTEOS sumables. El navegador suma las filas que pasan los filtros y recién ahí calcula cada indicador,
así cualquier combinación (un estudio, los cuatro, varios meses…) da el valor ponderado correcto, nunca un promedio de %.
"""
import pandas as pd

from etl.config import BOT_MAS, BOT_MENOS, ECOM_MOTIVOS, EMOCIONES

DIMS = ["periodo", "semana", "estudio", "canal", "segmento", "modulo"]

# Correlación con la recomendación (0–10), encuesta por encuesta: n, Σx, Σy, Σx², Σy², Σxy por indicador
CORR_NPS = ["nsu", "ces", "fcr"]

MEDIDAS = (
    ["n", "nps_n", "prom", "det", "nsu_n", "nsu_ok"]
    + [f"ces_{i}" for i in range(1, 6)]
    + ["fcr_si", "fcr_no", "prom_fsi", "det_fsi", "prom_fno", "det_fno",      # NPS según resolvió o no
       "n_cfac", "prom_cfac", "det_cfac", "n_cdif", "prom_cdif", "det_cdif"]  # NPS según fácil (4–5) o difícil (1–2)
    + [f"emo_{i}" for i in range(len(EMOCIONES))]
    + [f"ecc_{i}" for i in range(1, 6)] + [f"ecp_{i}" for i in range(1, 6)]
    + [f"ecm_{i}" for i in range(len(ECOM_MOTIVOS))] + ["ecm_n"]
    + [f"bmen_{i}" for i in range(len(BOT_MENOS))] + [f"bmas_{i}" for i in range(len(BOT_MAS))]
    + ["prom_bmen", "det_bmen", "n_bmen"]
    + ["com_temas"]                                                             # base de los % de temas
    + [f"r_{k}_{m}" for k in CORR_NPS for m in ("n", "x", "y", "xx", "yy", "xy")]
)


def _indicadoras(d):
    m = pd.DataFrame(index=d.index)
    nps = d.nps
    prom, det = (nps >= 9).astype(int), (nps <= 6).astype(int)
    m["n"] = 1
    m["nps_n"] = nps.notna().astype(int)
    m["prom"], m["det"] = prom, det
    m["nsu_n"] = d.nsu_ok.notna().astype(int)
    m["nsu_ok"] = (d.nsu_ok == 1).astype(int)
    for k in range(1, 6):
        m[f"ces_{k}"] = (d.ces == k).astype(int)
    si, no = (d.fcr == 1).astype(int), (d.fcr == 0).astype(int)
    m["fcr_si"], m["fcr_no"] = si, no
    m["prom_fsi"], m["det_fsi"], m["prom_fno"], m["det_fno"] = prom * si, det * si, prom * no, det * no
    fac, dif = ((d.ces >= 4) & nps.notna()).astype(int), ((d.ces <= 2) & nps.notna()).astype(int)
    m["n_cfac"], m["prom_cfac"], m["det_cfac"] = fac, prom * fac, det * fac
    m["n_cdif"], m["prom_cdif"], m["det_cdif"] = dif, prom * dif, det * dif
    for i, e in enumerate(EMOCIONES):
        m[f"emo_{i}"] = (d.emocion == e).astype(int)
    for k in range(1, 6):
        m[f"ecc_{k}"] = (d.ecc == k).astype(int)
        m[f"ecp_{k}"] = (d.ecp == k).astype(int)
    for i in range(len(ECOM_MOTIVOS)):
        m[f"ecm_{i}"] = d.motivos.map(lambda ms, i=i: int(i in ms))
    m["ecm_n"] = d.motivos.map(lambda ms: int(bool(ms)))
    for i in range(len(BOT_MENOS)):
        m[f"bmen_{i}"] = (d.menos == i).astype(int)
    for i in range(len(BOT_MAS)):
        m[f"bmas_{i}"] = (d.mas == i).astype(int)
    con = (d.menos.notna() & nps.notna()).astype(int)
    m["n_bmen"], m["prom_bmen"], m["det_bmen"] = con, prom * con, det * con
    m["com_temas"] = d.com_temas
    xs = {"nsu": d.nsu, "ces": d.ces, "fcr": d.fcr}
    for k in CORR_NPS:
        par = nps.notna() & xs[k].notna()
        x, y = xs[k].where(par, 0), nps.where(par, 0)
        m[f"r_{k}_n"], m[f"r_{k}_x"], m[f"r_{k}_y"] = par.astype(int), x, y
        m[f"r_{k}_xx"], m[f"r_{k}_yy"], m[f"r_{k}_xy"] = x * x, y * y, x * y
    return m[MEDIDAS].fillna(0).astype(int)


def cubo(d):
    """Filas = combinaciones de DIMS presentes; medidas = conteos. Temas (multi-etiqueta) en un dict aparte."""
    m = pd.concat([d[DIMS], _indicadoras(d)], axis=1)
    g = m.groupby(DIMS, dropna=False, sort=True)[MEDIDAS].sum().reset_index()
    ex = d[DIMS + ["temas"]].explode("temas").dropna(subset=["temas"])
    tm = ex.groupby(DIMS + ["temas"]).size()
    filas = []
    for r in g.itertuples(index=False):
        clave = tuple(getattr(r, k) for k in DIMS)
        fila = {"d": dict(zip(DIMS, clave)), "m": [int(getattr(r, k)) for k in MEDIDAS]}
        try:
            fila["tm"] = {str(k): int(v) for k, v in tm.loc[clave].items()}
        except KeyError:
            pass
        filas.append(fila)
    return filas
