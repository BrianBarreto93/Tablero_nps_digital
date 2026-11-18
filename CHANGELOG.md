# Cambios

## 2026-11-18 · v1.4

- Filtros de la barra de arriba con la selección resaltada, como los filtros de Voces: cada grupo es una cápsula con su
  nombre sobre el borde (Mes, Estudio/Segmento/Proceso/Negocio); la opción elegida se rellena con su color y, si el grupo
  filtra algo (no «Todos»), el borde y el nombre toman ese color y la cápsula brilla; al cambiar, late una vez. Los filtros
  de lista (+ Región…) con algo elegido pasan a cápsula roja con el nombre arriba y solo el valor adentro.
- Menú de vistas que se esconde: en pantalla ancha flota como una cápsula de vidrio (el contenido usa todo el ancho) y,
  si no se usa, se disuelve en un asa delgada con un punto por vista (la activa, alargada en rojo). Vuelve con un resorte
  al acercar el cursor al borde izquierdo, al pasar por el asa o con el teclado; los íconos entran en cascada, crecen
  como en un dock según la cercanía del cursor y una luz roja sigue a la vista activa. En el celular, la barra de abajo
  se esconde al bajar y vuelve al subir o al tocar el asa.
- Todo en `tablero/navegacion.js` + `navegacion.css` (misma copia en Factura, Soporte-FM y Digital): decora lo que pinta
  app.js, sin cambiar su lógica.

## 2026-11-18 · v1.3

- Gráficos de líneas nuevos (`GRAF.lineas` en `graficos.js`, la misma copia en Factura, Soporte-FM y Digital): curva suave
  que no inventa picos entre meses, área en degradado y resplandor del color de la serie. Al entrar en pantalla la línea se
  traza con un cometa, cada punto aparece cuando la línea llega a él y la cifra final, en píldora, cuenta hasta su valor; el
  último punto late unos segundos. Mes elegido en píldora oscura. Redibujar con los mismos datos (tamaño, tema) no repite la
  animación; al imprimir o con «reducir movimiento» se ve quieto.
- Sparks de los KPI con curva suave, más color en el área y un punto final que late.
  La serie total (NPS Digital) va más gruesa y sin área.

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
