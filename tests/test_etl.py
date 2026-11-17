"""Pruebas del ETL. Las de cifras contra Oracle y el Power BI se saltan si no hay conexión o si Oracle ya no trae el mes."""
import json

import pandas as pd
import pytest

from etl import agregar, calidad, verbatims
from etl.config import DIR_PERIODOS, ESTUDIOS, RAIZ
from etl.construir import indicadores
from etl.limpiar import limpiar_estudio, modulo, motivos, temas, texto_opcion


def _crudo(clave, **over):
    comun = dict(RESPONSEID="R_1", RECORDEDDATE=pd.Timestamp("2026-11-04 09:52:00"), FINISHED="Verdadero",
                 FECHA_CARGA=pd.Timestamp("2026-11-17"), RECIPIENTFIRSTNAME="Maria", RECIPIENTLASTNAME="Gomez")
    por = {
        "app": dict(Q3="10", Q3_NPS_GROUP="Promotor", Q2="5", Q8="😄\n\nMuy fácil", Q7="😄 Feliz", Q4="Muy práctica", Q5=None,
                    Q6=None, Q9=None, Q10=None, Q6_TOPICS=None, Q9_TOPICS=None, TIPO_APP="SUPERAPP", SEGMENTO_APP="pos",
                    MODULO_APP="hog_pagar_factura", MODULO_WEB=None, DISTRIBUTIONCHANNEL="si_appsdk", NOMBRE_DEL_CLIENTE_APP="MARIA GOMEZ"),
        "wa": dict(Q3="3", Q3_NPS_GROUP="Detractor", Q2="2", Q8="😢\n\nMuy difícil", Q10="No", Q7="😡 Enojado", Q4=None, Q5=None,
                   Q6="No me resolvieron, la asesora Laura Pérez colgó", Q9=None, Q11="No había opción", Q6_TOPICS="Resolutividad,Atención",
                   Q9_TOPICS=None, Q11_TOPICS="Unknown", SEGMENTACION_CLIENTE="Postpago", SEGMENTO_CLIENTE="PERSONAS",
                   DIAMANTE="false", NOMBRE_CLIENTE="Maria Gomez"),
        "ecom": dict(Q2="8", Q2_NPS_GROUP="Pasivo", Q6="Funcionamiento de la Tienda online ,Opciones de pago  ", Q7="😊 Satisfecho",
                     Q8="😊\n\nFácil", Q10="😶\nNi fácil ni difícil", Q3=None, Q4="Lenta", Q5=None, Q9=None, Q11=None, Q6_5_TEXT=None,
                     Q5_TOPICS=None, Q9_TOPICS=None, Q11_TOPICS=None, DISPOSITIVO="Móvil"),
        "bot": dict(Q9="0", Q9_NPS_GROUP="Detractor", Q2="7", Q8="Si", Q3="No encontré lo que necesitaba", Q7=None, Q4=None,
                    Q5=None, Q6="Quería saber mi saldo", Q3_9_TEXT=None, Q10_2_TEXT=None, Q10_1_TEXT=None, Q7_9_TEXT=None),
    }[clave]
    base = {**comun, **por}
    base.update(over)
    return pd.DataFrame([base])


# ------------------------------------------------------------------ limpieza
@pytest.mark.parametrize("crudo,esperado", [
    ("😄\n\nMuy fácil", "Muy fácil"), ("😶\nNi fácil ni difícil", "Ni fácil ni difícil"), ("MÃ³vil", "Móvil"),
    ("  ", None), (None, None), (float("nan"), None), ("😡 Enojado", "Enojado"), ("Otro ¿Cuál?", "Otro ¿Cuál?")])
def test_texto_opcion(crudo, esperado):
    assert texto_opcion(crudo) == esperado


def test_modulo_y_segmento():
    assert modulo("hog_pagar_factura") == ("Pagar factura", "Hogar")
    assert modulo("pos_equi_finan") == modulo("equipos_financiados")[:1] + ("Postpago",)
    assert modulo("hog_pagar_factura_domiciliacion") == ("Domiciliar el pago", "Hogar")
    assert modulo("registro_exitoso") == ("Registro", None)
    assert modulo(None) == (None, None)


def test_temas_quita_padres():
    assert temas("APP,Fallas App,No carga- Se Bloquea,Esfuerzo Uso,Pagar,Incovenientes en Pago") == ["No carga- se bloquea", "Inconvenientes en pago"]
    assert temas("Unknown") == [] and temas("Resolutividad,Atención") == ["Resolutividad", "Atención"]


def test_motivos_ecommerce():
    assert motivos("Funcionamiento de la Tienda online ,Opciones de pago  ") == ([0, 1], [])
    assert motivos("Algo nuevo") == ([], ["Algo nuevo"])


def test_limpiar_cuatro_estudios():
    a = limpiar_estudio("app", _crudo("app")).iloc[0]
    assert (a.periodo, a.semana, a.canal, a.segmento, a.modulo) == ("202611", "2026-11-02", "Mi Claro App (Super App)", "Hogar", "Pagar factura")
    assert (a.nps, a.grupo, a.nsu_ok, a.ces, a.emocion) == (10, "Promotor", True, 5, "Feliz") and pd.isna(a.fcr)
    w = limpiar_estudio("wa", _crudo("wa")).iloc[0]
    assert (w.nps, w.grupo, w.nsu_ok, w.ces, w.fcr, w.segmento) == (3, "Detractor", False, 1, 0, "Postpago")
    assert w.temas == ["Resolutividad", "Atención"] and w.com_temas == 1
    e = limpiar_estudio("ecom", _crudo("ecom")).iloc[0]
    assert (e.canal, e.ecc, e.ecp, e.motivos, e.segmento) == ("Tienda online · móvil", 4, 3, [0, 1], "No aplica")
    b = limpiar_estudio("bot", _crudo("bot")).iloc[0]
    assert (b.nps, b.nsu_ok, b.fcr, b.menos) == (0, True, 1, 0) and pd.isna(b.mas)


# ------------------------------------------------------------------ contrato de calidad
def _errores(clave, **over):
    c = _crudo(clave, **over)
    return {x["id"] for x in calidad.evaluar(clave, c, limpiar_estudio(clave, c)) if x["nivel"] == "error"}


@pytest.mark.parametrize("clave", list(ESTUDIOS))
def test_calidad_limpia_sin_errores(clave):
    assert _errores(clave) == set()


@pytest.mark.parametrize("clave,over,id_", [
    ("app", dict(Q3="11"), "app_nps_rango"), ("app", dict(Q3_NPS_GROUP="Detractor"), "app_nps_grupo"),
    ("app", dict(Q8="Regular"), "app_ces_catalogo"), ("app", dict(Q2="7"), "app_nsu_catalogo"),
    ("wa", dict(Q10="Tal vez"), "wa_fcr_catalogo"), ("bot", dict(Q3="Opción nueva"), "bot_menos_catalogo"),
    ("ecom", dict(Q6="Opción nueva"), "ecom_motivos_catalogo"), ("ecom", dict(Q10="Fácilísimo"), "ecom_ecp_catalogo")])
def test_calidad_bloquea(clave, over, id_):
    assert id_ in _errores(clave, **over)


def test_calidad_bloquea_ids_repetidos():
    c = pd.concat([_crudo("bot"), _crudo("bot")], ignore_index=True)
    assert any(x["id"] == "bot_id_unico" and x["nivel"] == "error" for x in calidad.evaluar("bot", c, limpiar_estudio("bot", c)))


def test_esquema_incompleto():
    with pytest.raises(calidad.ErrorCalidad):
        calidad.esquema("app", {"RESPONSEID", "Q3"})


# ------------------------------------------------------------------ datos personales
def test_tapar_y_escanear():
    t = verbatims.tapar("Soy maria, la asesora Laura Pérez Gómez no ayudó; cuenta 1234567 tel 300 123 4567 x@y.com", ["Maria", "Gomez"])
    assert "maria" not in t.lower() and "Laura" not in t and "1234567" not in t and "@" not in t
    assert calidad.escanear_pii([(t, ["Maria", "Gomez"])]) == []
    assert calidad.escanear_pii([("llamar al 3001234567", [])]) and calidad.escanear_pii([("x@y.com", [])])


def test_nombres_globales_solo_pares():
    verbatims.fijar_nombres_globales(["DIEGO FERNANDO SOLER", "ROSA MARTINEZ"])
    try:
        assert verbatims.tapar("Me atendió Diego Fernando muy bien", []) == "Me atendió [nombre] muy bien"
        assert verbatims.tapar("Esperanza Rosa", []) == "Esperanza Rosa"     # palabras comunes no cuentan
    finally:
        verbatims.fijar_nombres_globales([])


def test_genericos_no_se_guardan():
    assert not verbatims.util("Excelente servicio") and not verbatims.util("ok.") and verbatims.util("No carga la factura")


# ------------------------------------------------------------------ cubo
def test_cubo_suma_conteos():
    d = pd.concat([limpiar_estudio(k, _crudo(k)) for k in ESTUDIOS], ignore_index=True)
    filas = agregar.cubo(d)
    m = dict(zip(agregar.MEDIDAS, [sum(c) for c in zip(*[f["m"] for f in filas])]))
    assert (m["n"], m["nps_n"], m["prom"], m["det"]) == (4, 4, 1, 2)
    assert (m["nsu_n"], m["nsu_ok"], m["ces_5"], m["ces_1"], m["fcr_si"], m["fcr_no"]) == (3, 2, 1, 1, 1, 1)
    assert (m["det_fno"], m["det_fsi"], m["n_cfac"], m["prom_cfac"], m["n_cdif"], m["det_cdif"]) == (1, 1, 1, 1, 1, 1)
    assert (m["ecc_4"], m["ecp_3"], m["ecm_0"], m["ecm_1"], m["ecm_n"], m["bmen_0"]) == (1, 1, 1, 1, 1, 1)
    assert (m["r_fcr_n"], m["r_fcr_x"], m["r_fcr_y"], m["r_fcr_xy"]) == (2, 1, 3, 0)
    assert indicadores(m)["nps"] == -25.0


# ------------------------------------------------------------------ cifras contra Oracle y el Power BI
def _oracle():
    try:
        from etl import extraer
        return extraer.conectar()
    except Exception as e:  # sin red o sin .env
        pytest.skip(f"sin Oracle: {e}")


# Power BI del usuario (matriz «Detalle», noviembre con corte al 10-nov-2026): (NPS, n NPS, NSU, CES, FCR)
PBI_NOV10 = {
    "Mi Claro App (Super App)": (46.75, 20710, 79.83, 75.17, None),
    "Mi Claro Web": (6.90, 2014, 64.45, 52.77, None),
    "E-commerce Compra": (73.17, 533, None, None, None),
    "Claro Bot": (17.95, 390, 64.67, None, 60.32),
}


def test_cuadra_con_power_bi_al_10_nov():
    """E-commerce, Claro Bot y Mi Claro cuadran con el Power BI (Super App: 7 encuestas más en el PBI, ±0,1).
    WhatsApp no: el Power BI trae ~2 % menos encuestas cada mes y no se encontró el filtro (ver README)."""
    from etl import extraer
    conn = _oracle()
    d = pd.concat([limpiar_estudio(k, extraer.encuestas(conn, k)) for k in ("app", "ecom", "bot")], ignore_index=True)
    conn.close()
    d = d[(d.fecha >= "2026-11-01") & (d.fecha < "2026-11-11")]
    if not len(d):
        pytest.skip("Oracle ya no trae noviembre")
    d["corte"] = d.canal.where(d.clave == "app", d.estudio)
    for corte, (nps, n, nsu, ces, fcr) in PBI_NOV10.items():
        a = dict(zip(agregar.MEDIDAS, agregar._indicadoras(d[d.corte == corte]).sum()))
        i = indicadores(a)
        assert abs(i["nps_n"] - n) <= 7, corte
        assert abs(i["nps"] - nps) <= .1, corte
        for k, v in (("nsu", nsu), ("fcr", fcr)):
            if v is not None:
                assert abs(i[k] - v) <= .1, (corte, k)
        if ces is not None:
            assert abs(i["ces"] - ces) <= .1, (corte, "ces")


def test_cubo_cuadra_con_sql_directo():
    """n y NPS por estudio y mes del tablero = SQL directo a cada tabla (lo último que se construyó)."""
    from etl import extraer
    from etl.construir import totales
    js = (RAIZ / "tablero" / "datos.js").read_text(encoding="utf-8")
    datos = json.loads(js[len("window.DATOS="):].rstrip().rstrip(";"))
    tot = totales(datos)
    conn = _oracle()
    for k, e in ESTUDIOS.items():
        q = e["nps"]
        sql = (f"SELECT TO_CHAR(RECORDEDDATE,'YYYYMM') P, COUNT(*) N, COUNT({q}) NN, "
               f"SUM(CASE WHEN TO_NUMBER({q}) >= 9 THEN 1 ELSE 0 END) PR, SUM(CASE WHEN TO_NUMBER({q}) <= 6 THEN 1 ELSE 0 END) DE "
               f"FROM INVITADO_15.{e['tabla']} GROUP BY TO_CHAR(RECORDEDDATE,'YYYYMM')")
        for r in extraer._df(conn, sql).itertuples():
            a = tot[(r.P, e["nombre"])]
            assert (a["n"], a["nps_n"], a["prom"], a["det"]) == (r.N, r.NN, r.PR, r.DE), (k, r.P)
    conn.close()


# ------------------------------------------------------------------ salida
def test_salida_sin_datos_personales():
    js = (RAIZ / "tablero" / "comentarios.js").read_text(encoding="utf-8")
    datos = json.loads(js[len("window.COMENTARIOS="):].rstrip().rstrip(";"))
    assert calidad.escanear_pii([(v[-1], []) for v in datos["filas"]]) == []
    assert not calidad._CORREO.search(js)


def test_base_descargable():
    from etl import base
    for f in sorted(DIR_PERIODOS.glob("*.json")):
        s = json.loads(f.read_text(encoding="utf-8"))
        assert len(s["base"]) == s["n"], f.name                      # una fila por encuesta
        assert all(len(r) == len(base.COLUMNAS) for r in s["base"])
        textos = [v for r in s["base"] for v in r[-3:] if v]
        assert calidad.escanear_pii([(t, []) for t in textos]) == [], f.name
    prohibidas = {"cuenta", "teléfono", "telefono", "correo", "cédula", "identificación", "nombre"}
    assert not [c for c in base.COLUMNAS if any(p in c.lower() for p in prohibidas)]
