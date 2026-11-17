# Cambios

## 2026-11-17 · v1.2

- Histórico mayo–noviembre 2026 desde Oracle (496.157 encuestas). Claro Bot sin julio–octubre en `TBL_DIGITAL_TOUCHPOINT`.
- Los CLOB se leen como texto (`oracledb.defaults.fetch_lobs = False`): con varios meses la lectura perezosa fallaba al
  cerrar la conexión.
- El aviso de volumen ±40 % compara contra el mes anterior aunque venga en la misma corrida.
- Las líneas y sparks se cortan donde un estudio no tiene datos; el hallazgo de tendencia avisa si el mes anterior no tiene
  todos los estudios.

## 2026-11-17 · v1.1

- «Facilidad y recomendación», «¿Logró hacer la consulta?» y «¿Resolvió el requerimiento?»: las columnas con dos puntos
  se cambian por barras desde NPS 0 (verde a la derecha, rojo a la izquierda) con una frase que dice la diferencia.
  Mismo cambio en `graficos.js/.css` de Soporte-FM y Factura.
- Mi Claro, WhatsApp y Claro Bot reacomodados en columnas apiladas para no dejar paneles con espacio vacío.

## 2026-11-17 · v1

- ETL desde Oracle `INVITADO_15`: `TBL_DIGITAL_APP_WEB`, `TBL_DIGITAL_WHATSAPP_BOT`, `TBL_DIGITAL_ECOMMERCE` y
  `TBL_DIGITAL_TOUCHPOINT` (noviembre 1–17, 52.935 encuestas), con contrato de calidad por estudio, tapado de datos
  personales, muestra fija de comentarios y base descargable.
- Indicadores como el Power BI: NPS Digital = suma de las respuestas de los cuatro estudios. Mi Claro, E-commerce y Claro Bot
  cuadran con la matriz del Power BI al 10-nov; WhatsApp trae ~2 % más encuestas que el Power BI (filtro sin identificar).
- Tablero con siete pestañas (Resumen con hallazgos y matriz, Mi Claro, WhatsApp, Claro Bot, E-commerce, Voces, Calidad),
  filtros de mes, estudio, canal, segmento y módulo en la URL, y el mismo sistema visual de Soporte-FM y Factura.
- Publicado en `/umm/DIGITAL/NPS_Digital.html`.
