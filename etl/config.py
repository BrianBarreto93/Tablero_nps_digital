"""Constantes del tablero NPS Digital: tablas fuente, lista blanca de columnas, preguntas de cada indicador,
catálogos y umbrales. Todo lo que cambie de un corte a otro se ajusta aquí, no en la lógica.

Los cuatro estudios juntos forman el NPS Digital (mismo cálculo que el Power BI del usuario: se suman las encuestas
de los cuatro, no se promedian los NPS de cada uno).
"""
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DIR_PERIODOS = RAIZ / "data" / "periodos"     # un JSON agregado por mes (histórico acumulado: no borrar)
SALIDA_JS = RAIZ / "tablero" / "datos.js"
ESQUEMA = "INVITADO_15"

# Escalas compartidas
FACILIDAD = {"Muy difícil": 1, "Difícil": 2, "Ni fácil ni difícil": 3, "Fácil": 4, "Muy fácil": 5}
SI_NO = {"Sí": 1, "Si": 1, "SI": 1, "No": 0, "NO": 0}
EMOCIONES = ["Enojado", "Decepcionado", "Molesto", "Frustrado", "Ninguna", "Tranquilo", "Confiado", "Satisfecho", "Feliz"]

# ClaroBot: aspecto que menos gustó (Q3) y que más gustó (Q7), selección única
BOT_MENOS = ["No encontré lo que necesitaba", "La información no me ayudó con mi necesidad",
             "La respuesta nada tenía que ver con lo que necesitaba", "No fue fácil interactuar con el robot",
             "Las opciones no son claras", "Se demoraba mucho en responder", "Otro ¿Cuál?"]
BOT_MAS = ["Encontré lo que necesitaba", "La información me ayudó con mi necesidad",
           "Las respuestas fueron preciso lo que necesitaba", "Fue fácil interactuar con el robot",
           "Las opciones fueron claras", "La atención fue rápida", "Otro ¿Cuál?"]
# E-commerce: motivo de la calificación (Q6, hasta 2 opciones, separadas por coma)
ECOM_MOTIVOS = ["Funcionamiento de la Tienda online", "Opciones de pago", "Variedad en los productos",
                "Registro o Ingreso a la Tienda Online", "Otro ¿Cuál?"]

# Módulo de Mi Claro (MODULO_APP / MODULO_WEB sin el prefijo de segmento pos_/hog_/pre_)
MODULOS = {
    "pagar_factura": "Pagar factura", "pagar_factura_domiciliacion": "Domiciliar el pago",
    "registro_exitoso": "Registro", "equi_finan": "Equipos financiados", "equipos_financiados": "Equipos financiados",
    "detalle_consumo": "Detalle de consumo", "detalle_plan": "Detalle del plan", "personaliza_wifi": "Personalizar WiFi",
    "paquetes_recargas": "Paquetes y recargas", "gestionar_equipo": "Gestionar equipo", "gest_equipo": "Gestionar equipo",
    "consulta_saldo": "Consulta de saldo", "elegidos": "Números elegidos", "eleg": "Números elegidos",
    "visitas_tecnicas": "Visitas técnicas",
}
SEGMENTOS = {"pos": "Postpago", "hog": "Hogar", "pre": "Prepago", "postpago": "Postpago", "prepago": "Prepago",
             "hogar": "Hogar"}

# Cada estudio: tabla, preguntas de cada indicador y columnas que se leen (nunca SELECT *: las tablas traen cédula,
# correo, teléfono, IP, coordenadas y nombre). `nombres` se leen SOLO para tapar el nombre en los comentarios.
# abiertas = {columna: (texto corto, lado)}; lado = "neg" (lo malo), "pos" (lo bueno) o "neu".
ESTUDIOS = {
    "app": {
        "nombre": "Mi Claro APP/WEB", "tabla": "TBL_DIGITAL_APP_WEB",
        "nps": "Q3", "nps_grupo": "Q3_NPS_GROUP", "nsu": ("Q2", 1, 5, 4), "ces": "Q8", "fcr": None, "emocion": "Q7",
        "abiertas": {"Q6": ("Qué le impidió una buena experiencia", "neg"), "Q9": ("Qué fue difícil", "neg"),
                     "Q5": ("Qué le haría falta para recomendarla", "neu"), "Q10": ("Qué le gustaría encontrar", "neu"),
                     "Q4": ("Lo que más le gustó", "pos")},
        "temas": ["Q6", "Q9"],
        "extra": ["TIPO_APP", "SEGMENTO_APP", "MODULO_APP", "MODULO_WEB", "DISTRIBUTIONCHANNEL"],
        "nombres": ["RECIPIENTFIRSTNAME", "RECIPIENTLASTNAME", "NOMBRE_DEL_CLIENTE_APP"],
    },
    "wa": {
        "nombre": "WhatsApp Bot", "tabla": "TBL_DIGITAL_WHATSAPP_BOT",
        "nps": "Q3", "nps_grupo": "Q3_NPS_GROUP", "nsu": ("Q2", 1, 5, 4), "ces": "Q8", "fcr": "Q10", "emocion": "Q7",
        "abiertas": {"Q6": ("Experiencia no satisfactoria", "neg"), "Q11": ("Por qué no logró la consulta", "neg"),
                     "Q9": ("Qué fue difícil", "neg"), "Q5": ("Motivo de la calificación", "neu"),
                     "Q4": ("Experiencia positiva", "pos")},
        "temas": ["Q6", "Q9", "Q11"],
        "extra": ["SEGMENTACION_CLIENTE", "SEGMENTO_CLIENTE", "DIAMANTE"],
        "nombres": ["RECIPIENTFIRSTNAME", "RECIPIENTLASTNAME", "NOMBRE_CLIENTE"],
    },
    "ecom": {
        "nombre": "E-commerce Compra", "tabla": "TBL_DIGITAL_ECOMMERCE",
        "nps": "Q2", "nps_grupo": "Q2_NPS_GROUP", "nsu": None, "ces": None, "fcr": None, "emocion": "Q7",
        "facil_compra": "Q8", "facil_pago": "Q10", "motivos": "Q6",
        "abiertas": {"Q5": ("Experiencia no satisfactoria", "neg"), "Q9": ("Qué fue difícil al comprar", "neg"),
                     "Q11": ("Qué fue difícil al pagar", "neg"), "Q6_5_TEXT": ("Otro motivo", "neu"),
                     "Q4": ("Motivo de la calificación", "neu"), "Q3": ("Experiencia positiva", "pos")},
        "temas": ["Q5", "Q9", "Q11"],
        "extra": ["DISPOSITIVO"],
        "nombres": ["RECIPIENTFIRSTNAME", "RECIPIENTLASTNAME"],
    },
    "bot": {
        "nombre": "Claro Bot", "tabla": "TBL_DIGITAL_TOUCHPOINT",
        "nps": "Q9", "nps_grupo": "Q9_NPS_GROUP", "nsu": ("Q2", 0, 10, 7), "ces": None, "fcr": "Q8", "emocion": None,
        "menos": "Q3", "mas": "Q7",
        "abiertas": {"Q4": ("Lo que buscaba", "neg"), "Q5": ("Su necesidad y lo que respondió", "neg"),
                     "Q6": ("Lo que buscaba y lo que respondió", "neg"), "Q3_9_TEXT": ("Otro aspecto que no gustó", "neg"),
                     "Q10_2_TEXT": ("Comentario sobre ClaroBot", "neu"), "Q10_1_TEXT": ("Comentario sobre Claro", "neu"),
                     "Q7_9_TEXT": ("Otro aspecto que gustó", "pos")},
        "temas": [],
        "extra": [],
        "nombres": ["RECIPIENTFIRSTNAME", "RECIPIENTLASTNAME"],
    },
}
ORDEN_ESTUDIOS = ["app", "wa", "ecom", "bot"]          # mismo orden del Power BI
COMUNES = ["RESPONSEID", "RECORDEDDATE", "FINISHED", "FECHA_CARGA"]


def columnas(clave):
    """Columnas que el ETL lee de la tabla del estudio (lista blanca)."""
    e = ESTUDIOS[clave]
    cols = list(COMUNES) + [e["nps"], e["nps_grupo"]]
    for k in ("ces", "fcr", "emocion", "facil_compra", "facil_pago", "motivos", "menos", "mas"):
        if e.get(k):
            cols.append(e[k])
    if e["nsu"]:
        cols.append(e["nsu"][0])
    cols += list(e["abiertas"]) + [f"{q}_TOPICS" for q in e["temas"]] + e["extra"]
    return list(dict.fromkeys(cols))


# Temas de Qualtrics: se descartan las etiquetas que solo agrupan (niveles 1–2 de la jerarquía) y las vacías
TEMAS_PADRE = {"Unknown", "APP", "App", "Otros Comentarios", "Otros Procesos", "Esfuerzo Uso", "Fallas App",
               "Percepción Uso", "Pagar", "Sugerencias", "Sin Información", "Sin Comentario", "Sin Comentarios",
               "Faltan Opciones", "Mejorar Funcionamiento App", "No Aplica", "No indica"}

# Erratas de la analítica de Qualtrics
TEMAS_CORRIGE = {"Incovenientes en pago": "Inconvenientes en pago", "Registar elegidos": "Registrar elegidos"}

SIN_DATO = "Sin dato"
NO_APLICA = "No aplica"
N_MINIMO = 30                 # cortes con menos encuestas se marcan «muestra baja» en el tablero
VARIACION_N_AVISO = 0.40      # aviso si el n de un estudio cambia más de ±40 % frente al mes anterior
# Tope de comentarios por mes, estudio y pregunta (los demás entran todos). Mi Claro deja ~35.000 comentarios al mes:
# se toma una muestra aleatoria fija para que comentarios.js no pese decenas de MB. El tablero dice cuántos hay en total.
TOPE_COMENTARIOS = {("app", "Q6"): 2000, ("app", "Q9"): 1200, ("app", "Q5"): 600, ("app", "Q10"): 1000, ("app", "Q4"): 800,
                    ("wa", "Q6"): 1200, ("wa", "Q5"): 600, ("wa", "Q4"): 800, ("wa", "Q9"): 800, ("wa", "Q11"): 800}
