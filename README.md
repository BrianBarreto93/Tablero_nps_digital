# Tablero NPS Digital

Tablero HTML estático de las cuatro encuestas digitales que forman el NPS Digital: **Mi Claro APP/WEB**, **WhatsApp Bot**,
**E-commerce Compra** y **Claro Bot** (Qualtrics). Mismo sistema visual y mismo ETL que los tableros de Soporte y Fallas
masivas y de Factura, pago y cobro.

- Publicado: https://servidor.lan.qwertylab.dev/umm/DIGITAL/NPS_Digital.html
- Abrir local: `tablero/NPS_Digital.html` (doble clic, sin servidor ni internet; la descarga de la base sí necesita servidor).

## Corrida mensual

```bash
cd /opt/apps/claro_tablero_focos/claro_tablero_digital
.venv/bin/python -m etl.construir          # Oracle (4 tablas) → data/periodos/AAAAMM.json → tablero/datos.js
.venv/bin/python -m pytest -q              # limpieza, contrato, datos personales, cifras contra Oracle y el Power BI
.venv/bin/python -m etl.publicar           # SFTP LAN + verificación HTTP
```

- `--periodo 202611` procesa un solo mes (se puede repetir). `--solo-ensamblar` rehace `datos.js` con lo ya guardado, sin Oracle.
- Cada corrida reemplaza solo los meses que encuentra en Oracle. Si el proceso de origen recarga las tablas solo con el
  último corte, **la historia sigue en `data/periodos/`: no borrar esa carpeta**.
- Un chequeo de calidad en **error** detiene la corrida sin escribir nada, y `etl.publicar` tampoco sube.
- Al 2026-11-17 Oracle trae **mayo a noviembre** (noviembre hasta el 17). **Claro Bot (`TBL_DIGITAL_TOUCHPOINT`) solo
  tiene mayo, junio y noviembre**: de julio a octubre el NPS Digital va sin Claro Bot (el Power BI sí lo trae: ago 998,
  sep 852, oct 1.028 encuestas), la línea de Claro Bot se corta en esos meses y el hallazgo de tendencia avisa que la
  comparación no es pareja. Cuando se carguen, basta con correr `etl.construir`.

## Fuentes (Oracle `INVITADO_15`, solo lectura)

| Estudio | Tabla | NPS | NSU | CES | FCR | Cortes |
|---|---|---|---|---|---|---|
| Mi Claro APP/WEB | `TBL_DIGITAL_APP_WEB` | Q3 | Q2 (4–5 de 5) | Q8 | — | Canal: Super App (`TIPO_APP = SUPERAPP`) o Web. Módulo y segmento salen de `MODULO_APP`/`MODULO_WEB` (`hog_pagar_factura` → Hogar · Pagar factura) |
| WhatsApp Bot | `TBL_DIGITAL_WHATSAPP_BOT` | Q3 | Q2 (4–5 de 5) | Q8 | Q10 | Segmento: `SEGMENTACION_CLIENTE` |
| E-commerce Compra | `TBL_DIGITAL_ECOMMERCE` | Q2 | — | — | — | Canal: `DISPOSITIVO` (móvil/web). Q8 y Q10 (facilidad de compra y de pago) van aparte: el Power BI no las cuenta como CES |
| Claro Bot | `TBL_DIGITAL_TOUCHPOINT` | Q9 | Q2 (7–10 de 10) | — | Q8 | Q3 lo que menos gustó, Q7 lo que más |

Todo lo que cambia de un corte a otro (columnas, catálogos, nombres de módulos, topes de comentarios) está en `etl/config.py`.

### Cuadre con el Power BI

Agosto a octubre (meses cerrados): Mi Claro (NPS 38,71 · 44,82 · 40,64; CES 70,97 · 74,49 · 72,46) y E-commerce
(76,87 · 73,65 · 77,90) cuadran exacto con la matriz. WhatsApp trae ~2 % más encuestas (abajo) y Claro Bot no está en Oracle
esos meses, por eso el total difiere (oct: Power BI 45,15 con 103.439 respuestas; tablero 45,10 con 102.931).

#### Noviembre con corte al 10-nov

`tests/test_etl.py::test_cuadra_con_power_bi_al_10_nov` lo comprueba mientras Oracle traiga noviembre:

| Corte | Power BI | Tablero |
|---|---|---|
| Super App | NPS 46,75 · n 20.710 · NSU 79,83 · CES 75,17 | 46,74 · 20.703 · 79,83 · 75,17 |
| Web | 6,90 · 2.014 · 64,45 · 52,77 | igual |
| E-commerce | 73,17 · 533 | igual |
| Claro Bot | 17,95 · 390 · NSU 64,67 · FCR 60,32 | igual |
| **WhatsApp** | 53,60 · 8.472 | 8.631 encuestas (~2 % más) |

**WhatsApp no cuadra en n**: el Power BI trae ~2 % menos encuestas todos los meses (ago 13.298 vs 13.606, sep 15.587 vs
15.861 y oct 27.226 vs 27.783 en los exportes de Qualtrics de vista_360). Se probó deduplicar por cuenta, teléfono, cédula,
caso o perfil (también por día), quitar las anónimas, las sin terminar y por fecha de inicio: ninguna regla da la diferencia.
El tablero cuenta todas. **Pendiente: preguntar a quien mantiene el Power BI qué filtro aplica a WhatsApp.**

## Cómo está hecho

| Paso | Archivo | Qué hace |
|---|---|---|
| Extraer | `etl/extraer.py` | Un `SELECT` por tabla con lista blanca de columnas (`etl/config.py`), nunca `SELECT *`: las tablas traen cédula, correo, teléfono, IP y coordenadas. Los nombres se leen solo para taparlos en los comentarios. |
| Limpiar | `etl/limpiar.py` | Lleva los cuatro estudios a un esquema común (NPS, NSU, CES, FCR, emoción, canal, segmento, módulo). Quita emojis de las opciones, corrige erratas de los temas de Qualtrics y deja solo los temas hoja (sin «APP», «Fallas App»…). |
| Calidad | `etl/calidad.py` | Contrato por estudio y mes. Bloquean: ID repetido, nota fuera de 0–10, grupo NPS de Qualtrics distinto a la nota, opción fuera de catálogo, columna faltante y datos personales en la salida. Avisos: mes incompleto, estudio sin encuestas, encuestas sin terminar, segmento sin dato, volumen ±40 %. |
| Comentarios | `etl/verbatims.py` | Tapa correos, cifras de 5+ dígitos, el nombre del encuestado, nombres tras «asesor», «señor»… y pares «Nombre Apellido» de nombres del corte. No guarda los genéricos («ok», «excelente»). Mi Claro deja ~35.000 comentarios al mes: por pregunta se guarda una muestra aleatoria fija (`TOPE_COMENTARIOS`); la pestaña Calidad dice cuántos hay y cuántos se guardaron. |
| Agregar | `etl/agregar.py` | Cubo de **conteos sumables** por periodo × semana × estudio × canal × segmento × módulo, con NPS según resolvió o no y según fácil o difícil, y las sumas para la correlación con el NPS. |
| Tablero | `tablero/app.js` | Suma las filas que pasan los filtros y calcula ahí cada indicador: cualquier combinación da el valor ponderado correcto. Los hallazgos se recalculan con los filtros. |
| Base | `etl/base.py` → `tablero/base/AAAAMM.js` | Una fila por encuesta, con todos los comentarios (no la muestra), sin datos personales. «Descargar base» la filtra y la baja en Excel, CSV o Parquet (`tablero/exportar.js`). |

### Pestañas

1. **Resumen**: KPI (NPS Digital, NSU, CES, FCR, con su n, margen de error y correlación con el NPS), **hallazgos**, matriz
   por estudio y canal como la del Power BI (con ▲▼ contra el periodo anterior cuando lo hay), evolución semanal o mensual
   y «qué estudios suben y bajan el NPS Digital» (peso × distancia al total).
2. **Mi Claro**: Super App frente a web, facilidad y recomendación, ranking por módulo/segmento/canal, CES y temas de lo que falló.
3. **WhatsApp**: NPS según si logró la consulta, composición, ranking por segmento, CES y temas.
4. **Claro Bot**: cifras contra el total, resolución, lo que menos y más gustó.
5. **E-commerce**: NPS por dispositivo, motivos de la calificación y facilidad de compra y de pago.
6. **Voces**: emociones, comparación de estudios y nube de comentarios.
7. **Calidad**: contrato de datos, fuentes, comentarios guardados y definiciones.

### Diseño

Mismo sistema que Soporte-FM y Factura: banner de Claro, riel lateral, barra de filtros fija, claro por defecto y oscuro con
el botón, cortes en 1300 y 760 px. `graficos.js/.css`, `nube.js/.css`, `exportar.js`, `vendor/motion.js` y `fuentes/` son
copias de esos tableros (si se cambia la librería allá, copiarla aquí). Colores de estudio en el orden de la paleta validada
(azul Mi Claro, naranja WhatsApp, aguamarina E-commerce, amarillo Claro Bot): pasa el validador de color en claro y oscuro
para pares vecinos; la tinta va siempre en texto y el color solo en marcas y leyendas.

### Definiciones

- **NPS** = % promotores (9–10) − % detractores (0–6). **NPS Digital** = el de la suma de las respuestas de los cuatro estudios.
- **NSU** = % satisfecho: 4–5 de 5 (Mi Claro, WhatsApp) o 7–10 de 10 (Claro Bot).
- **CES** = (Fácil + Muy fácil) / respuestas válidas de facilidad (Mi Claro y WhatsApp). Más alto = mejor.
- **FCR** = Sí / (Sí + No) a «¿lograste realizar la consulta?» (WhatsApp) o «¿resolvió tu requerimiento?» (Claro Bot).
- Mes = mes de `RECORDEDDATE`. Semana = lunes a domingo, recortada al día 1 del mes. Unidad = encuesta (`RESPONSEID`).
  Cada indicador usa sus propias respuestas válidas. Muestra baja = n < 30.

## Primeros hallazgos (noviembre 1–17, 52.935 encuestas)

- NPS Digital 47,2; Mi Claro (69 % de las respuestas, NPS 44,6) le resta 1,8 pts; WhatsApp (53,3) le suma 1,7.
- La web de Mi Claro (NPS 7,7) está 40 pts debajo de la Super App (48,2), y no por el trámite: en «Pagar factura» la brecha es de 36 pts.
- «Detalle del plan» (NPS 3,5, 2.546 respuestas) es el trámite que más le resta a Mi Claro (2,9 pts). Siguen Personalizar WiFi (12,7) y Detalle de consumo (34,6).
- Quien encuentra difícil el trámite tiene NPS −86 frente a 82 de quien lo encuentra fácil; 13,7 % lo encontró difícil.
- Cuando WhatsApp o Claro Bot no resuelven, el NPS cae a −75 (71 cuando sí).
- Claro Bot: NPS 22,4 y FCR 62 %; lo que menos gustó es «No encontré lo que necesitaba» (33 %).
- «Inconvenientes en pago» es la queja #1 de Mi Claro (22 % de los comentarios de lo que falló).
