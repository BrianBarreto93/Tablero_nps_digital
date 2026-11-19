"""Orquesta el ETL: Oracle (4 tablas) → limpieza → contrato de calidad → cubo + comentarios + base
→ data/periodos/AAAAMM.json → tablero/datos.js (todos los periodos guardados, codificados por diccionario).

Idempotente por periodo: cada corrida reemplaza solo los meses que encuentra en Oracle y conserva los demás (si el
proceso de origen recarga las tablas solo con el último corte, la historia sigue en data/periodos/). Si algún chequeo
de nivel «error» falla, no se escribe nada.

Uso:
    .venv/bin/python -m etl.construir                   # todos los periodos que haya en Oracle
    (en Windows: .venv\Scripts\python.exe, o actualizar_tablero.bat que corre construir → pytest → publicar)
    .venv/bin/python -m etl.construir --periodo 202611  # uno solo (se puede repetir)
    .venv/bin/python -m etl.construir --solo-ensamblar  # rehace datos.js con lo ya guardado (sin Oracle)
"""
import argparse
import json
import sys
from collections import Counter
from datetime import datetime

import pandas as pd

from etl import agregar, base, calidad, extraer, verbatims
from etl.config import (BOT_MAS, BOT_MENOS, DIR_PERIODOS, ECOM_MOTIVOS, EMOCIONES, ESQUEMA, ESTUDIOS, FACILIDAD,
                        N_MINIMO, NO_APLICA, ORDEN_ESTUDIOS, SALIDA_JS, SIN_DATO)
from etl.limpiar import limpiar_estudio

CANALES = ["Mi Claro App (Super App)", "Mi Claro Web", "WhatsApp Bot", "Tienda online · móvil", "Tienda online · web",
           "Tienda online · sin dato", "Claro Bot"]
SEGMENTOS = ["Postpago", "Hogar", "Prepago"]


def _ahora():
    return datetime.now().strftime("%Y-%m-%d %H:%M")


def _anterior(p):
    return f"{int(p[:4]) - (p[4:] == '01')}{(int(p[4:]) - 2) % 12 + 1:02d}"


def procesar(periodos_pedidos=None):
    conn = extraer.conectar()
    crudos, ds, carga = {}, {}, {}
    for k in ORDEN_ESTUDIOS:
        calidad.esquema(k, extraer.columnas_tabla(conn, k))
        crudos[k] = extraer.encuestas(conn, k)
        ds[k] = limpiar_estudio(k, crudos[k])
        if ds[k].periodo.isna().any():
            raise calidad.ErrorCalidad(f"{ESTUDIOS[k]['tabla']}: {int(ds[k].periodo.isna().sum())} encuestas sin RECORDEDDATE")
        carga[k] = str(crudos[k].FECHA_CARGA.max())[:16] if len(crudos[k]) else None
    conn.close()
    verbatims.fijar_nombres_globales([v for k in crudos for c in ESTUDIOS[k]["nombres"] for v in crudos[k][c].dropna()])

    periodos = sorted({p for d in ds.values() for p in d.periodo.unique()})
    if periodos_pedidos:
        faltan = set(periodos_pedidos) - set(periodos)
        if faltan:
            raise SystemExit(f"Oracle no tiene los periodos {sorted(faltan)}; tiene {periodos}")
        periodos = sorted(periodos_pedidos)

    DIR_PERIODOS.mkdir(parents=True, exist_ok=True)
    salidas, errores = {}, []
    for p in periodos:
        prev = DIR_PERIODOS / f"{_anterior(p)}.json"
        # el mes anterior puede venir en esta misma corrida (aún sin escribir a disco)
        n_ant = salidas[_anterior(p)]["n_estudio"] if _anterior(p) in salidas else json.loads(prev.read_text(encoding="utf-8"))["n_estudio"] if prev.exists() else {}
        chk, subs, vb, bf, escaneo, conteo, n_est = [], [], [], [], [], {}, {}
        for k in ORDEN_ESTUDIOS:
            sel = ds[k].periodo == p
            if not sel.any():
                continue
            sub, cr = ds[k][sel], crudos[k][sel]
            n_est[k] = int(len(sub))
            chk += calidad.evaluar(k, cr, sub, n_ant.get(k))
            v, esc, cnt = verbatims.construir(k, cr, sub, p)
            b, esc_b = base.construir(k, cr, sub)
            vb += v; bf += b; escaneo += esc + esc_b; subs.append(sub)
            conteo[k] = cnt
        todo = pd.concat(subs)
        chk.insert(0, calidad.faltantes(p, n_est))
        chk.insert(1, calidad.periodo_parcial(p, todo.fecha))
        actual = DIR_PERIODOS / f"{p}.json"
        if actual.exists():
            n_viejo = json.loads(actual.read_text(encoding="utf-8"))["n"]
            if n_viejo != len(todo):
                chk.append(calidad._chk("reemplazo", "aviso", "El corte reemplaza uno ya guardado",
                                        f"Antes {calidad.num(n_viejo)} encuestas, ahora {calidad.num(len(todo))}", len(todo)))
        hall = calidad.escanear_pii(escaneo)
        chk.append(calidad._chk("pii", "error" if hall else "ok", "Sin datos personales en los comentarios",
                                f"{len(hall)} hallazgos: {hall[:3]}" if hall else
                                f"{calidad.num(len(escaneo))} textos revisados: sin correos, cifras largas ni nombres", len(hall)))
        errores += [f"{p} · {c['titulo']}: {c['detalle']}" for c in chk if c["nivel"] == "error"]
        salidas[p] = {
            "periodo": p, "n": int(len(todo)), "n_estudio": n_est, "generado": _ahora(),
            "fecha_carga": {k: carga[k] for k in n_est}, "hasta": todo.fecha.max().strftime("%Y-%m-%d %H:%M"),
            "filas": agregar.cubo(todo), "verbatims": vb, "comentarios": conteo, "base": bf, "calidad": chk,
        }

    if errores:
        print("CORRIDA DETENIDA: el contrato de calidad falló. No se escribió nada.", file=sys.stderr)
        for e in errores:
            print("  ✗", e, file=sys.stderr)
        raise SystemExit(1)

    for p, s in salidas.items():
        (DIR_PERIODOS / f"{p}.json").write_text(json.dumps(s, ensure_ascii=False, separators=(",", ":"), default=str),
                                                encoding="utf-8")
        avisos = [c["titulo"] for c in s["calidad"] if c["nivel"] == "aviso"]
        print(f"{p}: {s['n']} encuestas, {len(s['verbatims'])} comentarios, {len(avisos)} avisos")
    return list(salidas)


# --------------------------------------------------------------------------- ensamblado
def _orden(valores, peso, fijo=()):
    resto = [v for v in valores if v not in (SIN_DATO, NO_APLICA) and v not in fijo]
    vals = [v for v in fijo if v in valores] + sorted(resto, key=lambda v: (-peso[v], v))
    return vals + [v for v in (SIN_DATO, NO_APLICA) if v in valores]


def ensamblar():
    archivos = sorted(DIR_PERIODOS.glob("*.json"))
    if not archivos:
        raise SystemExit("No hay periodos guardados en data/periodos/")
    per = [json.loads(a.read_text(encoding="utf-8")) for a in archivos]
    dims = agregar.DIMS
    peso = {k: Counter() for k in dims}
    for s in per:
        for f in s["filas"]:
            for k in dims:
                peso[k][f["d"][k]] += f["m"][0]
    fijos = {"estudio": [ESTUDIOS[k]["nombre"] for k in ORDEN_ESTUDIOS], "canal": CANALES, "segmento": SEGMENTOS}
    dic = {k: sorted(peso[k]) if k in ("periodo", "semana") else _orden(list(peso[k]), peso[k], fijos.get(k, ()))
           for k in dims}
    idx = {k: {v: i for i, v in enumerate(dic[k])} for k in dims}
    temas = sorted({t for s in per for f in s["filas"] for t in f.get("tm", {})})
    tidx = {t: i for i, t in enumerate(temas)}
    grupos = ["Detractor", "Pasivo", "Promotor"]
    preguntas = [f"{k}:{q}" for k in ORDEN_ESTUDIOS for q in ESTUDIOS[k]["abiertas"]]
    pidx = {q: i for i, q in enumerate(preguntas)}

    cubo, tm, vb = [], [], []
    for s in per:
        for f in s["filas"]:
            r = len(cubo)
            cubo.append([idx[k][f["d"][k]] for k in dims] + f["m"])
            for t, c in f.get("tm", {}).items():
                tm.append([r, tidx[t], c])
        for v in s["verbatims"]:
            g = -1 if v["nps"] is None else 0 if v["nps"] <= 6 else 1 if v["nps"] <= 8 else 2
            vb.append([idx[k][v[k]] for k in dims] + [g, -1 if v["nps"] is None else v["nps"], -1 if v["ces"] is None else v["ces"],
                                                     -1 if v["fcr"] is None else v["fcr"], pidx[v["pregunta"]], v["texto"]])
    datos = {
        "generado": _ahora(), "esquema": ESQUEMA, "n_minimo": N_MINIMO,
        "tablas": {ESTUDIOS[k]["nombre"]: ESTUDIOS[k]["tabla"] for k in ORDEN_ESTUDIOS},
        "claves": {ESTUDIOS[k]["nombre"]: k for k in ORDEN_ESTUDIOS},
        "dims": dims, "valores": dic, "medidas": agregar.MEDIDAS,
        "emociones": EMOCIONES, "facilidad": list(FACILIDAD), "ecom_motivos": ECOM_MOTIVOS,
        "bot_menos": BOT_MENOS, "bot_mas": BOT_MAS, "temas": temas, "grupos": grupos,
        "preguntas": [{"cod": q, "estudio": ESTUDIOS[q.split(":")[0]]["nombre"], "texto": ESTUDIOS[q.split(":")[0]]["abiertas"][q.split(":")[1]][0],
                       "lado": ESTUDIOS[q.split(":")[0]]["abiertas"][q.split(":")[1]][1]} for q in preguntas],
        "base": {"columnas": base.COLUMNAS, "filtro": base.FILTRO, "periodos": [s["periodo"] for s in per if s.get("base")]},
        "cubo": cubo, "temas_filas": tm, "n_comentarios": len(vb),
        "periodos": {s["periodo"]: {"n": s["n"], "n_estudio": s["n_estudio"], "fecha_carga": s["fecha_carga"], "hasta": s["hasta"],
                                    "generado": s["generado"], "comentarios": s["comentarios"], "calidad": s["calidad"]} for s in per},
    }
    js = "window.DATOS=" + json.dumps(datos, ensure_ascii=False, separators=(",", ":")) + ";\n"
    SALIDA_JS.write_text(js, encoding="utf-8")
    # Los comentarios pesan la mayor parte: van aparte y el tablero los carga después de pintar
    vjs = ("window.COMENTARIOS={\"campos\":" + json.dumps(dims + ["grupo", "nps", "ces", "fcr", "pregunta", "texto"])
           + ",\"filas\":" + json.dumps(vb, ensure_ascii=False, separators=(",", ":")) + "};\n")
    (SALIDA_JS.parent / "comentarios.js").write_text(vjs, encoding="utf-8")
    dir_base = SALIDA_JS.parent / "base"
    dir_base.mkdir(exist_ok=True)
    for f in dir_base.glob("*.js"):
        f.unlink()
    for s in per:
        (dir_base / f"{s['periodo']}.js").write_text(
            f"(window.BASE=window.BASE||{{}})[\"{s['periodo']}\"]=" + json.dumps(s.get("base", []), ensure_ascii=False, separators=(",", ":")) + ";\n",
            encoding="utf-8")
    print(f"datos.js: {len(cubo)} filas de cubo, {len(js) / 1024:.0f} KB · comentarios.js: {len(vb)} comentarios, "
          f"{len(vjs) / 1024:.0f} KB → {SALIDA_JS.parent}")
    return datos


def totales(datos):
    """{(periodo, estudio): medidas sumadas}, con estudio = 'NPS Digital' para el total del mes."""
    M = {m: i + len(datos["dims"]) for i, m in enumerate(datos["medidas"])}
    ie, ip = datos["dims"].index("estudio"), datos["dims"].index("periodo")
    acc = {}
    for r in datos["cubo"]:
        p = datos["valores"]["periodo"][r[ip]]
        for e in (datos["valores"]["estudio"][r[ie]], "NPS Digital"):
            a = acc.setdefault((p, e), Counter())
            for m, i in M.items():
                a[m] += r[i]
    return acc


def indicadores(a):
    """NPS, NSU, CES y FCR (en %) de unas medidas sumadas; None si no hay base."""
    pct = lambda x, b: round(x / b * 100, 2) if b else None
    ces_n = sum(a[f"ces_{i}"] for i in range(1, 6))
    return {"nps": pct(a["prom"] - a["det"], a["nps_n"]), "nps_n": a["nps_n"], "nsu": pct(a["nsu_ok"], a["nsu_n"]), "nsu_n": a["nsu_n"],
            "ces": pct(a["ces_4"] + a["ces_5"], ces_n), "ces_n": ces_n,
            "fcr": pct(a["fcr_si"], a["fcr_si"] + a["fcr_no"]), "fcr_n": a["fcr_si"] + a["fcr_no"]}


def resumen(datos):
    """Indicadores por periodo y estudio, para cuadrar contra la fuente en consola."""
    f = lambda v: "   —  " if v is None else f"{v:6.2f}"
    for (p, e), a in sorted(totales(datos).items(), key=lambda x: (x[0][0], x[0][1] == "NPS Digital", x[0][1])):
        i = indicadores(a)
        print(f"  {p} {e:17s} n={a['n']:6d}  NPS={f(i['nps'])} ({i['nps_n']})  NSU={f(i['nsu'])}  CES={f(i['ces'])}  FCR={f(i['fcr'])}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--periodo", action="append", help="AAAAMM; se puede repetir")
    ap.add_argument("--solo-ensamblar", action="store_true")
    a = ap.parse_args()
    if not a.solo_ensamblar:
        try:
            procesar(a.periodo)
        except calidad.ErrorCalidad as e:
            print(f"CORRIDA DETENIDA: {e}", file=sys.stderr)
            raise SystemExit(1)
    resumen(ensamblar())


if __name__ == "__main__":
    main()
