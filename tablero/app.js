/* Tablero NPS Digital (Mi Claro APP/WEB, WhatsApp Bot, E-commerce Compra, Claro Bot).
   datos.js = cubo de CONTEOS (filas = combinación de dimensiones + medidas sumables). Todo indicador se calcula
   sumando las filas que pasan los filtros: el NPS Digital suma las encuestas de los cuatro estudios (no promedia).
   comentarios.js (voz del cliente) se carga después de pintar. Mismo sistema visual que Soporte-FM y Factura. */
'use strict';
(() => {
const D = window.DATOS;
if (!D) { document.getElementById('stage').innerHTML = '<p class="vacio">No se encontró datos.js. Corre el ETL (python -m etl.construir).</p>'; return; }

// ------------------------------------------------------------------ índices
const DIMS = D.dims, ND = DIMS.length, V = D.valores;
const DI = Object.fromEntries(DIMS.map((d, i) => [d, i]));
const MI = Object.fromEntries(D.medidas.map((m, i) => [m, ND + i]));
const NMIN = D.n_minimo, PERIODOS = V.periodo, EST = V.estudio;
const N_APP = 'Mi Claro APP/WEB', N_WA = 'WhatsApp Bot', N_ECOM = 'E-commerce Compra', N_BOT = 'Claro Bot';
const CE = {[N_APP]: 'var(--s-app)', [N_WA]: 'var(--s-wa)', [N_ECOM]: 'var(--s-ecom)', [N_BOT]: 'var(--s-bot)', 'NPS Digital': 'var(--ink)'};
const CORTO = {[N_APP]: 'Mi Claro', [N_WA]: 'WhatsApp', [N_ECOM]: 'E-commerce', [N_BOT]: 'Claro Bot'};
const ei = n => EST.indexOf(n);
const SUPER = 'Mi Claro App (Super App)', WEB = 'Mi Claro Web';
const MULTI = [['canal', 'Canal'], ['segmento', 'Segmento'], ['modulo', 'Módulo de Mi Claro']];
const TEMAS = new Map(); for (const [r, t, c] of D.temas_filas) { if (!TEMAS.has(r)) TEMAS.set(r, []); TEMAS.get(r).push([t, c]); }
const PREG = D.preguntas;

// ------------------------------------------------------------------ formato es-CO
const nf0 = new Intl.NumberFormat('es-CO', {maximumFractionDigits: 0});
const nf1 = new Intl.NumberFormat('es-CO', {minimumFractionDigits: 1, maximumFractionDigits: 1});
const f0 = x => nf0.format(x).replace('-', '−'), f1 = x => nf1.format(x).replace('-', '−');
const fpp = x => (x > 0 ? '+' : '') + f1(x);
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const mesC = p => `${MES[+p.slice(4) - 1]}-${p.slice(2, 4)}`, mesL = p => `${MESL[+p.slice(4) - 1]} ${p.slice(0, 4)}`;
const semC = s => { const [, m, d] = s.split('-'); return `${+d} ${MES[+m - 1]}`; };
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const ICO = {
  resumen: '<path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 4v4h6V4z"/>',
  app: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  wa: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.4A8 8 0 1 1 21 12z"/><path d="M9 10h6M9 13.5h4"/>',
  bot: '<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 8V4.5M9.5 13h.01M14.5 13h.01M9.5 16.5h5"/><circle cx="12" cy="4" r="1"/>',
  ecom: '<path d="M3 4h2.5l2.2 10.5h10.6L20.5 7H7"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>',
  voz: '<path d="M4 6h16M4 10h10M4 14h16M4 18h7"/>',
  calidad: '<path d="M12 3l8 3v6c0 4.4-3.4 8-8 9-4.6-1-8-4.6-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  luna: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  izq: '<path d="M15 5l-7 7 7 7"/>', der: '<path d="M9 5l7 7-7 7"/>',
};
const svgI = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICO[k]}</svg>`;

// ------------------------------------------------------------------ indicadores
const prop = (x, b) => b ? {v: x / b * 100, n: b, ic: 196 * Math.sqrt((x / b) * (1 - x / b) / b)} : null;
const npsDe = (n, prom, det) => n ? (prom - det) / n * 100 : null;
const IND = {
  nps: {nombre: 'NPS Digital', corto: 'NPS', min: -100, max: 100, rango: [0, 70], donde: 'los cuatro estudios',
    def: '% promotores (9–10) − % detractores (0–6) en la recomendación de 0 a 10. NPS Digital = suma de las respuestas de los cuatro estudios (no el promedio de sus NPS), igual que el Power BI.',
    calc: a => { if (!a.nps_n) return null; const p = a.prom / a.nps_n, d = a.det / a.nps_n; return {v: (p - d) * 100, n: a.nps_n, ic: 196 * Math.sqrt((p + d - (p - d) ** 2) / a.nps_n)}; }},
  nsu: {nombre: 'NSU · satisfacción', corto: 'NSU', min: 0, max: 100, rango: [50, 95], donde: 'Mi Claro, WhatsApp y Claro Bot',
    def: 'Satisfacción con la atención: % que califica 4 o 5 de 5 (Mi Claro y WhatsApp, Q2) o 7 a 10 de 10 (Claro Bot, Q2). E-commerce no la pregunta.',
    calc: a => prop(a.nsu_ok, a.nsu_n)},
  ces: {nombre: 'CES · facilidad', corto: 'CES', min: 0, max: 100, rango: [40, 90], donde: 'Mi Claro y WhatsApp',
    def: 'Facilidad para recibir solución: (Fácil + Muy fácil) / respuestas válidas de «¿Qué tan fácil fue realizar tu consulta o trámite?» (Mi Claro Q8) y «¿Qué tan fácil fue recibir una solución?» (WhatsApp Q8). Más alto = mejor.',
    calc: a => prop(a.ces_4 + a.ces_5, a.ces_1 + a.ces_2 + a.ces_3 + a.ces_4 + a.ces_5)},
  fcr: {nombre: 'FCR · resolución', corto: 'FCR', min: 0, max: 100, rango: [50, 100], donde: 'WhatsApp y Claro Bot',
    def: '% que responde «Sí» a «¿Lograste realizar la consulta?» (WhatsApp Q10) o «¿ClaroBot resolvió tu requerimiento?» (Claro Bot Q8). Base: Sí + No.',
    calc: a => prop(a.fcr_si, a.fcr_si + a.fcr_no)},
};
const KS = ['nps', 'nsu', 'ces', 'fcr'];
const fmt = (k, r) => r == null ? '—' : (k === 'nps' ? f1(r.v) : f1(r.v) + ' %');
const uni = k => k === 'nps' ? 'pts' : 'pp';

// ------------------------------------------------------------------ estado + URL
const TABS = [['resumen', 'Resumen'], ['app', 'Mi Claro'], ['wa', 'WhatsApp'], ['bot', 'Claro Bot'], ['ecom', 'E-commerce'], ['voz', 'Voces'], ['calidad', 'Calidad']];
const TAB_EST = {app: N_APP, wa: N_WA, bot: N_BOT, ecom: N_ECOM};
const st = {periodo: PERIODOS.length - 1, meses: [PERIODOS.length - 1], estudio: null, tab: 'resumen', evo: 'nps', modo: PERIODOS.length > 1 ? 'mes' : 'semana',
  ...Object.fromEntries(MULTI.map(([k]) => [k, new Set()]))};
function leerHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.has('periodo')) { const ms = h.get('periodo').split('|').map(p => PERIODOS.indexOf(p)).filter(i => i >= 0); if (ms.length) fijarMeses(ms); }
  st.estudio = h.has('estudio') && EST.includes(h.get('estudio')) ? EST.indexOf(h.get('estudio')) : null;
  if (h.has('tab') && TABS.some(t => t[0] === h.get('tab'))) st.tab = h.get('tab');
  for (const [k] of MULTI) st[k] = new Set((h.get(k) || '').split('|').filter(Boolean).map(v => V[k].indexOf(v)).filter(i => i >= 0));
}
function escribirHash() {
  const h = new URLSearchParams();
  h.set('periodo', st.meses.map(i => PERIODOS[i]).join('|'));
  if (st.estudio != null) h.set('estudio', EST[st.estudio]);
  for (const [k] of MULTI) if (st[k].size) h.set(k, [...st[k]].map(i => V[k][i]).join('|'));
  if (st.tab !== 'resumen') h.set('tab', st.tab);
  history.replaceState(null, '', '#' + h);
}

// ------------------------------------------------------------------ motor
const ultimo = a => a[a.length - 1];
function fijarMeses(ms) { st.meses = [...new Set(ms)].sort((a, b) => a - b); st.periodo = ultimo(st.meses); }
function mesesAnteriores() {
  const m = st.meses, n = m.length, ini = m[0];
  if (ultimo(m) - ini !== n - 1 || ini - n < 0) return null;
  return Array.from({length: n}, (_, i) => ini - n + i);
}
const etqMeses = ms => ms.length === 1 ? mesL(PERIODOS[ms[0]]) : ultimo(ms) - ms[0] === ms.length - 1 ? `${mesC(PERIODOS[ms[0]])} a ${mesC(PERIODOS[ultimo(ms)])}` : ms.map(i => mesC(PERIODOS[i])).join(', ');
const etqCorta = ms => ms.length === 1 ? mesC(PERIODOS[ms[0]]) : etqMeses(ms);
// o.periodo: null = todos, número = un mes, arreglo = esos meses; o.estudio: índice o null (todos); si no vienen, los del estado
function pasa(r, o = {}) {
  const per = 'periodo' in o ? o.periodo : st.meses, est = 'estudio' in o ? o.estudio : st.estudio;
  if (per != null && (Array.isArray(per) ? !per.includes(r[0]) : r[0] !== per)) return false;
  if (est != null && r[DI.estudio] !== est) return false;
  for (const [k] of MULTI) if (k !== o.ignorar && st[k].size && !st[k].has(r[DI[k]])) return false;
  if (o.donde) for (const k in o.donde) if (r[DI[k]] !== o.donde[k]) return false;
  return true;
}
const filas = o => { const out = []; D.cubo.forEach((r, i) => { if (pasa(r, o)) out.push(i); }); return out; };
function sumar(idx) {
  const a = Object.fromEntries(D.medidas.map(m => [m, 0]));
  for (const i of idx) { const r = D.cubo[i]; for (const m of D.medidas) a[m] += r[MI[m]]; }
  return a;
}
const A = o => sumar(filas(o));
function porDim(idx, dim) {
  const g = new Map();
  for (const i of idx) { const v = D.cubo[i][DI[dim]]; if (!g.has(v)) g.set(v, []); g.get(v).push(i); }
  return [...g].map(([v, ix]) => ({v, nombre: V[dim][v], idx: ix, a: sumar(ix)})).sort((x, y) => x.v - y.v);
}
const ests = () => st.estudio == null ? EST.map((_, i) => i) : [st.estudio];
const alcance = () => st.estudio == null ? 'NPS Digital (4 estudios)' : EST[st.estudio];
// Pestañas de un estudio: muestran solo ese estudio (con los demás filtros), sin importar el botón de estudio
const soloEst = () => TAB_EST[st.tab] ? ei(TAB_EST[st.tab]) : undefined;
function serie(k, modo, e) {
  const idx = filas(modo === 'mes' ? {periodo: null, estudio: e} : {estudio: e});
  return porDim(idx, modo === 'mes' ? 'periodo' : 'semana')
    .map(g => ({x: g.v, et: modo === 'mes' ? mesC(V.periodo[g.v]) : semC(V.semana[g.v]), r: IND[k].calc(g.a)}))
    .filter(p => p.r).sort((a, b) => a.x - b.x);
}

// ------------------------------------------------------------------ tooltip
const tip = document.getElementById('tip');
function verTip(html, x, y) {
  tip.innerHTML = html; tip.classList.add('ver');
  const w = tip.offsetWidth, h = tip.offsetHeight;
  tip.style.left = Math.min(innerWidth - w - 8, Math.max(8, x + 14)) + 'px';
  tip.style.top = (y + h + 18 > innerHeight ? y - h - 12 : y + 14) + 'px';
}
document.addEventListener('mousemove', e => { const t = e.target.closest ? e.target.closest('[data-tip]') : null; if (t) verTip(t.dataset.tip, e.clientX, e.clientY); else tip.classList.remove('ver'); });
document.addEventListener('focusin', e => { const t = e.target.closest ? e.target.closest('[data-tip]') : null; if (t) { const b = t.getBoundingClientRect(); verTip(t.dataset.tip, b.left, b.bottom); } });
document.addEventListener('focusout', () => tip.classList.remove('ver'));
const tipAttr = html => `data-tip="${esc(html)}"`;
const G = window.GRAF;
G.config({tip: tipAttr});
const tipInd = (k, r, extra = '') => r == null ? 'Sin respuestas válidas' :
  `<div class="t">${IND[k].nombre}: ${fmt(k, r)}</div>n = ${f0(r.n)} · IC 95 % ±${f1(r.ic)} ${uni(k)}${r.n < NMIN ? '<br><b>Muestra baja</b>: lectura indicativa' : ''}${extra}`;
const bajo = r => r && r.n < NMIN ? ' <span class="bajo">muestra baja</span>' : '';

// ------------------------------------------------------------------ comentarios (carga diferida)
let C = null;
function cargarComentarios() {
  if (C || document.getElementById('js-com')) return;
  const s = document.createElement('script'); s.src = 'comentarios.js'; s.id = 'js-com';
  s.onload = () => {
    const cm = window.COMENTARIOS, ix = Object.fromEntries(cm.campos.map((c, i) => [c, i]));
    C = cm.filas.map(f => ({r: f, grupo: f[ix.grupo], q2: f[ix.nps], ces: f[ix.ces], fcr: f[ix.fcr], preg: PREG[f[ix.pregunta]], texto: f[ix.texto]}));
    delete window.COMENTARIOS;
    conComentarios();
    setTimeout(calentarNube, 400);
  };
  s.onerror = () => { C = []; conComentarios(); };
  document.body.appendChild(s);
}
// Lentes: qué comentarios ilustran cada lado. lados = de qué preguntas (lo malo, neutras o lo bueno)
const LENTES = {
  det: {t: 'Detractores', malo: true, pred: v => v.grupo === 0, lados: ['neg', 'neu']},
  pro: {t: 'Promotores', pred: v => v.grupo === 2, lados: ['pos', 'neu']},
  dif: {t: 'Les pareció difícil', malo: true, pred: v => v.ces === 1 || v.ces === 2, lados: ['neg', 'neu']},
  nores: {t: 'No resolvió', malo: true, pred: v => v.fcr === 0, lados: ['neg', 'neu']},
  res: {t: 'Sí resolvió', pred: v => v.fcr === 1, lados: ['pos', 'neu']},
};
const pasaCom = (v, L, q, est) => (!L || (L.pred(v) && L.lados.includes(v.preg.lado))) && pasa(v.r, est === undefined ? {} : {estudio: est}) && (!q || (v.nt || (v.nt = norm(v.texto))).includes(q));
function ejemplos(lente, k = 12, q = '', est) {
  if (!C) return null;
  const L = lente ? LENTES[lente] : null;
  const cand = C.filter(v => v.texto.length >= 25 && pasaCom(v, L, q, est));
  const total = cand.length;
  cand.sort((a, b) => Math.abs(a.texto.length - 150) - Math.abs(b.texto.length - 150));
  // Variados: se reparte entre estudio, canal y módulo
  const porM = new Map(); for (const v of cand) { const m = v.r[DI.estudio] + '|' + v.r[DI.canal] + '|' + v.r[DI.modulo]; if (!porM.has(m)) porM.set(m, []); porM.get(m).push(v); }
  const colas = [...porM.values()].sort((a, b) => b.length - a.length), out = [], vistos = new Set();
  for (let i = 0; out.length < k && colas.some(c => c.length > i); i++)
    for (const c of colas) { const v = c[i]; if (v && !vistos.has(v.texto) && out.length < k) { vistos.add(v.texto); out.push(v); } }
  return {total, items: out};
}
const colNota = n => n == null || n < 0 ? 'var(--ink-3)' : n <= 6 ? 'var(--d-2)' : n <= 8 ? 'var(--ink-3)' : 'var(--d2)';
const chipNota = v => `<span class="nota-nps" style="background:${colNota(v.q2)}" ${tipAttr(`Recomendación: ${v.q2 < 0 ? '—' : v.q2 + ' de 10'}`)}>${v.q2 < 0 ? '–' : v.q2}</span>`;
const lugar = v => { const e = V.estudio[v.r[DI.estudio]], m = V.modulo[v.r[DI.modulo]]; return e === N_APP ? `${V.canal[v.r[DI.canal]] === WEB ? 'Web' : 'App'} · ${m}` : e === N_WA ? V.segmento[v.r[DI.segmento]] : V.canal[v.r[DI.canal]]; };
function tarjeta(v) {
  const e = V.estudio[v.r[DI.estudio]];
  return `<article class="voz" tabindex="0"><q>${esc(v.texto)}</q><div class="m">${chipNota(v)}
    <span><i class="punto" style="background:${CE[e]}"></i> ${esc(CORTO[e])} · ${mesC(PERIODOS[v.r[0]])}</span><span class="mc" title="${esc(v.preg.texto)}">${esc(v.preg.texto)} · ${esc(lugar(v))}</span></div></article>`;
}
const carEst = {};
function carrusel(id, lentes, est) {
  if (!carEst[id]) carEst[id] = {lente: lentes[0]};
  const e = carEst[id], ej = ejemplos(e.lente, 12, '', est);
  const cards = ej == null ? Array(5).fill('<div class="esqueleto" aria-hidden="true"></div>').join('') :
    ej.items.length ? ej.items.map(tarjeta).join('') : '<p class="vacio">Sin comentarios con estos filtros</p>';
  return `<section class="panel" data-car="${id}" data-lentes="${lentes.join('|')}"${est === undefined ? '' : ` data-est="${est}"`}><header><h2>Lo que dicen los clientes <span class="nota" style="font-weight:600;margin-left:6px" ${tipAttr('Ejemplos variados por estudio, canal y módulo, con los filtros actuales. Clic en una tarjeta para leerla completa. Datos personales tapados. En Mi Claro y WhatsApp se guarda una muestra de los comentarios de cada mes (ver Calidad).')}>${ej ? `${f0(ej.total)} comentarios · ${ej.items.length} ejemplos` : 'cargando…'}</span></h2>
      <div class="seg" role="group" aria-label="Tipo de comentario">${lentes.map(l => `<button type="button" data-lente="${l}" aria-pressed="${e.lente === l}">${LENTES[l].t}</button>`).join('')}</div></header>
    <div class="voces"><button type="button" class="flecha izq" aria-label="Anteriores">${svgI('izq')}</button><div class="riel-v">${cards}</div><button type="button" class="flecha der" aria-label="Siguientes">${svgI('der')}</button></div></section>`;
}
function repintarCarruseles(raiz) {
  raiz.querySelectorAll('[data-car]').forEach(s => { s.outerHTML = carrusel(s.dataset.car, s.dataset.lentes.split('|'), s.dataset.est === undefined ? undefined : +s.dataset.est); });
  montarCarrusel(raiz);
}
function montarCarrusel(raiz) {
  raiz.querySelectorAll('[data-car]').forEach(p => {
    p.querySelectorAll('[data-lente]').forEach(b => b.onclick = () => { carEst[p.dataset.car].lente = b.dataset.lente; repintarCarruseles(p.parentNode); });
    const riel = p.querySelector('.riel-v');
    p.querySelector('.izq').onclick = () => riel.scrollBy({left: -riel.clientWidth * .9, behavior: 'smooth'});
    p.querySelector('.der').onclick = () => riel.scrollBy({left: riel.clientWidth * .9, behavior: 'smooth'});
  });
  raiz.querySelectorAll('.voz').forEach(c => { c.onclick = () => c.classList.toggle('abierta'); c.onkeydown = e => { if (e.key === 'Enter') c.classList.toggle('abierta'); }; });
}

// ------------------------------------------------------------------ barra superior
const ctrl = document.getElementById('ctrl'), barF = document.getElementById('filtros');
function pintarCtrl() {
  ctrl.innerHTML = `
    <div class="mes-f" id="f-per"><button type="button" class="sel" aria-haspopup="true" aria-expanded="false" title="Elegir uno o varios meses">${etqMeses(st.meses)}${st.meses.length > 1 ? ` <b>· ${st.meses.length} meses</b>` : ''}</button>
      <div class="pop" hidden role="group" aria-label="Meses"><div class="atajos"><button type="button" data-m="ult">Solo el último</button><button type="button" data-m="todos">Todos</button></div>
        ${PERIODOS.map((p, i) => i).reverse().map(i => `<label class="op"><input type="checkbox" value="${i}"${st.meses.includes(i) ? ' checked' : ''}><span>${mesL(PERIODOS[i])}</span><small>${f0(D.periodos[PERIODOS[i]].n)}</small></label>`).join('')}
        <p class="nota" style="margin:6px 8px 2px">Con varios meses, las cifras suman todas sus encuestas y se comparan con los mismos meses justo antes.</p></div></div>
    <div class="seg" role="group" aria-label="Estudio" id="f-est"><button type="button" data-v="" aria-pressed="${st.estudio == null}">Todos</button>${EST.map((e, i) => `<button type="button" data-v="${i}" aria-pressed="${st.estudio === i}"><i style="background:${CE[e]}"></i>${CORTO[e]}</button>`).join('')}</div>`;
  const fp_ = ctrl.querySelector('#f-per'), bp = fp_.querySelector('button.sel'), pp = fp_.querySelector('.pop');
  bp.onclick = e => { e.stopPropagation(); const si = pp.hidden; document.querySelectorAll('.pop:not([hidden])').forEach(x => { x.hidden = true; }); pp.hidden = !si; bp.setAttribute('aria-expanded', si); };
  fp_.addEventListener('keydown', e => { if (e.key === 'Escape') { pp.hidden = true; bp.setAttribute('aria-expanded', false); bp.focus(); } });
  pp.querySelectorAll('input[type=checkbox]').forEach(c => { c.onchange = () => {
    const ms = new Set(st.meses); if (c.checked) ms.add(+c.value); else ms.delete(+c.value);
    if (!ms.size) { c.checked = true; return; }
    fijarMeses([...ms]); refrescar({mantener: '__mes'}); }; });
  pp.querySelectorAll('[data-m]').forEach(b => { b.onclick = () => { fijarMeses(b.dataset.m === 'ult' ? [PERIODOS.length - 1] : PERIODOS.map((_, i) => i)); refrescar({mantener: '__mes'}); }; });
  ctrl.querySelectorAll('#f-est button').forEach(b => b.onclick = () => { st.estudio = b.dataset.v === '' ? null : +b.dataset.v; refrescar(); });
}
function pintarFiltros() {
  barF.innerHTML = MULTI.map(([k, et]) => {
    const n = st[k].size, txt = n === 0 ? et : n === 1 ? `${et}: <b>${esc(V[k][[...st[k]][0]])}</b>` : `${et}: <b>${n}</b>`;
    return `<div class="pill-f" data-k="${k}"><button type="button" class="${n ? 'activo' : ''}" aria-haspopup="true" aria-expanded="false"><span>${n ? '' : '+ '}${txt}</span></button><div class="pop" hidden role="group" aria-label="${et}"></div></div>`;
  }).join('') + `<button type="button" class="limpiar" id="f-limpiar" ${MULTI.some(([k]) => st[k].size) || st.estudio != null ? '' : 'hidden'}>Limpiar filtros</button>`;
  barF.querySelectorAll('.pill-f').forEach(montarPop);
  barF.querySelector('#f-limpiar').onclick = () => { MULTI.forEach(([k]) => st[k].clear()); st.estudio = null; refrescar(); };
}
function montarPop(caja) {
  const k = caja.dataset.k, btn = caja.querySelector('button'), pop = caja.querySelector('.pop');
  const abrir = si => { pop.hidden = !si; btn.setAttribute('aria-expanded', si); if (si) { pintar(); const b = pop.querySelector('.buscar'); if (b) b.focus(); } };
  btn.onclick = e => { e.stopPropagation(); document.querySelectorAll('.pop:not([hidden])').forEach(p => { if (p !== pop) p.hidden = true; }); abrir(pop.hidden); };
  caja.addEventListener('keydown', e => { if (e.key === 'Escape') { abrir(false); btn.focus(); } });
  function pintar() {
    const cnt = new Map(porDim(filas({ignorar: k}), k).map(g => [g.v, g.a.n]));
    const ops = V[k].map((nombre, i) => ({i, nombre, n: cnt.get(i) || 0})).filter(o => o.n || st[k].has(o.i));
    pop.innerHTML = (ops.length > 8 ? `<input class="buscar" type="search" placeholder="Buscar…" aria-label="Buscar">` : '') +
      ops.map(o => `<label class="op"><input type="checkbox" value="${o.i}"${st[k].has(o.i) ? ' checked' : ''}><span>${esc(o.nombre)}</span><small>${f0(o.n)}</small></label>`).join('') +
      (k !== 'canal' ? `<p class="nota" style="margin:6px 8px 2px">${k === 'segmento' ? 'Solo Mi Claro y WhatsApp traen segmento: al elegir uno salen E-commerce y Claro Bot («No aplica»).' : 'Solo Mi Claro trae módulo: al elegir uno salen los demás estudios («No aplica»).'}</p>` : '');
    pop.querySelectorAll('input[type=checkbox]').forEach(c => c.onchange = () => { if (c.checked) st[k].add(+c.value); else st[k].delete(+c.value); refrescar({mantener: k}); });
    const b = pop.querySelector('.buscar'); if (b) b.oninput = () => { const q = norm(b.value); pop.querySelectorAll('.op').forEach(o => o.hidden = !norm(o.textContent).includes(q)); };
  }
}
document.addEventListener('click', e => { if (!e.target.closest('.mes-f')) { const mp = document.querySelector('.mes-f .pop'); if (mp && !mp.hidden) { mp.hidden = true; mp.previousElementSibling.setAttribute('aria-expanded', false); } } });
document.addEventListener('click', e => { if (!e.target.closest('.pill-f')) document.querySelectorAll('.pill-f .pop:not([hidden])').forEach(p => { p.hidden = true; p.previousElementSibling.setAttribute('aria-expanded', false); }); });
function alternar(dim, i) {
  if (dim === 'estudio') { st.estudio = st.estudio === i ? null : i; refrescar(); return; }
  if (!MULTI.some(([k]) => k === dim)) return;
  if (st[dim].has(i)) st[dim].delete(i); else st[dim].add(i);
  refrescar();
}

// ------------------------------------------------------------------ navegación
const nav = document.getElementById('nav');
function pintarNav() {
  const inf = D.periodos[PERIODOS[st.periodo]], av = (inf ? inf.calidad : []).filter(c => c.nivel !== 'ok').length;
  nav.innerHTML = TABS.map(([k, t]) => `<button role="tab" id="t-${k}" aria-controls="p-${k}" aria-selected="${st.tab === k}" tabindex="${st.tab === k ? 0 : -1}">${svgI(k)}${t}${k === 'calidad' && av ? `<span class="badge" aria-label="${av} avisos">${av}</span>` : ''}</button>`).join('');
  nav.querySelectorAll('[role=tab]').forEach((b, i, all) => {
    b.onclick = () => irA(b.id.slice(2));
    b.onkeydown = e => {
      const j = ['ArrowDown', 'ArrowRight'].includes(e.key) ? (i + 1) % all.length : ['ArrowUp', 'ArrowLeft'].includes(e.key) ? (i - 1 + all.length) % all.length : -1;
      if (j >= 0) { e.preventDefault(); irA(TABS[j][0]); nav.querySelector('#t-' + TABS[j][0]).focus(); }
    };
  });
  TABS.forEach(([k]) => document.getElementById('p-' + k).hidden = k !== st.tab);
}
function irA(k) { st.tab = k; pintarNav(); pintarTab(); escribirHash(); pintarDescarga(); const t = document.querySelector('.top'); if (scrollY > t.offsetTop) scrollTo({top: t.offsetTop}); }

// ------------------------------------------------------------------ piezas
function delta(k, act, ant, etq) {
  if (!act) return '';
  if (!ant) return `<span class="nota">${st.meses.length > 1 ? 'sin un periodo anterior igual para comparar' : 'sin mes anterior'}</span>`;
  const d = act.v - ant.v, c = Math.abs(d) < .05 ? 'igual' : d > 0 ? 'mejora' : 'empeora';
  return `<span class="delta ${c}" ${tipAttr(`${etq}: ${fmt(k, ant)} · n ${f0(ant.n)}`)}>${c === 'igual' ? '■' : d > 0 ? '▲' : '▼'} ${fpp(d)} ${uni(k)}<span class="sr"> ${c}</span></span><span class="nota">vs ${etq}</span>`;
}
function spark(k) {
  const series = ests().map(e => ({color: CE[EST[e]], pts: serie(k, 'mes', e).map(p => ({i: p.x, v: p.r.v}))})).filter(s => s.pts.length > 1);
  return series.length ? G.spark(series, PERIODOS.length, st.meses, {alto: 40}) : '';
}
// Correlación de Pearson con la recomendación (0–10), con los filtros actuales
function corr(k, a) {
  const n = a['r_' + k + '_n'];
  if (n == null || n < NMIN) return null;
  const mx = a['r_' + k + '_x'] / n, my = a['r_' + k + '_y'] / n;
  const vx = a['r_' + k + '_xx'] / n - mx * mx, vy = a['r_' + k + '_yy'] / n - my * my, cv = a['r_' + k + '_xy'] / n - mx * my;
  return vx > 0 && vy > 0 ? {r: cv / Math.sqrt(vx * vy), n} : null;
}
const fuerza = r => Math.abs(r) >= .5 ? 'fuerte' : Math.abs(r) >= .3 ? 'moderada' : 'baja';
const nf2 = new Intl.NumberFormat('es-CO', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const NOTA_CORR = {nsu: 'la satisfacción (Q2)', ces: 'la facilidad (1 a 5)', fcr: 'si resolvió (sí o no)'};
function corrTxt(k, a) {
  const c = corr(k, a);
  if (!c) return ` · <span class="corr na" ${tipAttr('<div class="t">Correlación con el NPS</div>Menos de ' + NMIN + ' encuestas con ambas respuestas: no se calcula.')}>—</span>`;
  const v = nf2.format(c.r).replace('-', '−'), f = fuerza(c.r);
  return ` · <span class="corr ${f}" ${tipAttr(`<div class="t">Correlación con el NPS: ${v} (${f})</div>Pearson entre ${NOTA_CORR[k]} y la recomendación de 0 a 10, encuesta por encuesta (${f0(c.n)} pares, con los filtros actuales).<br>Verde ≥ 0,50 fuerte · amarillo 0,30 a 0,49 moderada · rojo < 0,30 baja.<br>Correlación no es causa.`)}><span class="sr">Correlación con el NPS, ${f}: </span>${v}</span>`;
}
// Gráfico de líneas: una serie por estudio y, sin filtro de estudio, la del NPS Digital (tinta)
const lineasPH = (k, modo, id, est) => `<div class="chart" data-lineas="${k}" data-modo="${modo}" id="${id}"${est === undefined ? '' : ` data-est="${est}"`} role="img" aria-label="${IND[k].nombre} por ${modo}"></div>`;
const tablaPH = id => `<details class="equiv"><summary>Tabla</summary><div class="tw" data-tabla="${id}"></div></details>`;
function seriesDe(k, modo, est) {
  const es = est !== undefined ? [est] : ests();
  const S = es.map(e => ({e: EST[e], pts: serie(k, modo, e)}));
  if (est === undefined && st.estudio == null) S.push({e: 'NPS Digital', total: true, pts: serie(k, modo, null)});
  return S.filter(s => s.pts.length);
}
function dibujarLineas(raiz) {
  raiz.querySelectorAll('[data-lineas]').forEach(el => {
    const k = el.dataset.lineas, modo = el.dataset.modo, W = el.clientWidth, H = el.clientHeight;
    if (!W || !H) return;
    const S = seriesDe(k, modo, el.dataset.est === undefined ? undefined : +el.dataset.est);
    const xs = [...new Set(S.flatMap(s => s.pts.map(p => p.x)))].sort((a, b) => a - b);
    const tabla = raiz.querySelector(`[data-tabla="${el.id}"]`);
    if (!xs.length) { el.innerHTML = '<p class="vacio">Sin datos con estos filtros</p>'; return; }
    const etq = x => S.flatMap(s => s.pts).find(p => p.x === x).et;
    const L = 38, R = 64, T = 14, B = 24, vals = S.flatMap(s => s.pts.map(p => p.r.v));
    let lo = Math.min(...vals), hi = Math.max(...vals); const pad = Math.max(4, (hi - lo) * .15);
    lo = Math.max(IND[k].min, Math.floor((lo - pad) / 10) * 10); hi = Math.min(IND[k].max, Math.ceil((hi + pad) / 10) * 10);
    const X = i => xs.length === 1 ? (L + W - R) / 2 : L + (W - L - R) * i / (xs.length - 1), Y = v => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
    const paso = hi - lo > 60 ? 20 : 10, cada = Math.max(1, Math.ceil(xs.length / Math.max(2, Math.floor((W - L - R) / 52))));
    const id = 'gl-' + el.id, base = H - B, quieto = document.documentElement.hasAttribute('data-sin-anim');
    let s = `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true" data-guia${quieto ? ' class="quieto"' : ''}><defs>${G.gradY(id + '-y', lo, hi, IND[k].min, IND[k].max)}${S.map((sr, i) => G.gradArea(`${id}-a${i}`, CE[sr.e], sr.total ? .06 : undefined)).join('')}</defs>`;
    if (modo === 'mes') st.meses.filter(m => xs.includes(m)).forEach(m => { s += `<rect x="${X(xs.indexOf(m)) - 16}" y="${T - 6}" width="32" height="${H - T - B + 12}" rx="10" fill="var(--panel-2)"/>`; });
    for (let v = Math.ceil(lo / paso) * paso; v <= hi; v += paso) s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L - 10}" y="${Y(v) + 4}" text-anchor="end">${f0(v)}</text>`;
    s += `<rect class="g-rampa-y" x="${L - 5}" y="${Y(hi)}" width="3.5" height="${Y(lo) - Y(hi)}" rx="1.75" fill="url(#${id}-y)"/>`;
    if (lo < 0 && hi > 0) s += `<line class="eje" x1="${L}" x2="${W - R}" y1="${Y(0)}" y2="${Y(0)}"/>`;
    xs.forEach((x, i) => { if (i % cada === 0 || i === xs.length - 1) s += `<text x="${X(i)}" y="${H - 6}" text-anchor="middle"${modo === 'mes' && st.meses.includes(x) ? ' style="fill:var(--ink);font-weight:800"' : ''}>${esc(etq(x))}</text>`; });
    s += `<line class="g-guia-l" x1="0" x2="0" y1="${T - 6}" y2="${base}"/>`;
    // Etiquetas al final de cada línea, separadas para que no se monten
    const fin = S.map((sr, si) => { const p = sr.pts[sr.pts.length - 1]; return {si, y: Y(p.r.v), x: X(xs.indexOf(p.x)), p}; }).sort((a, b) => a.y - b.y);
    for (let i = 1; i < fin.length; i++) if (fin[i].y - fin[i - 1].y < 13) fin[i].y = fin[i - 1].y + 13;
    S.forEach(({e, pts, total}, si) => {
      const c = CE[e], pos = pts.map(p => [X(xs.indexOf(p.x)), Y(p.r.v), p]);
      // La línea se corta donde el estudio no tiene datos (p. ej., Claro Bot sin meses en Oracle): no se inventa el tramo
      const segs = []; pos.forEach((q, j) => { if (!j || xs.indexOf(q[2].x) - xs.indexOf(pos[j - 1][2].x) > 1) segs.push([]); segs[segs.length - 1].push(q); });
      const tramo = sg => sg.map((q, j) => (j ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' '), d = segs.map(tramo).join(' ');
      if (!total) segs.filter(sg => sg.length > 1).forEach(sg => { s += `<path d="${tramo(sg)} L${sg[sg.length - 1][0].toFixed(1)} ${base} L${sg[0][0].toFixed(1)} ${base} Z" class="l-ap" style="fill:url(#${id}-a${si});animation-delay:${.55 + si * .1}s"/>`; });
      s += `<path d="${d}" pathLength="1" fill="none" stroke="${c}" stroke-width="${total ? 2.8 : 2}"${total ? ' stroke-dasharray="0"' : ''} stroke-linejoin="round" stroke-linecap="round" data-an="traza" data-i="${si * 2}"/>`;
      s += pos.map(([x, y, p], j) => `<circle class="g-pt l-pop" data-x="${p.x}" cx="${x}" cy="${y}" r="${total ? 4.2 : 3.6}" fill="${p.r.n < NMIN ? 'var(--panel)' : c}" stroke="${p.r.n < NMIN ? c : 'var(--panel)'}" stroke-width="2" style="animation-delay:${(.15 + si * .1 + 1.1 * j / Math.max(1, pos.length - 1)).toFixed(2)}s"/>`).join('');
    });
    fin.forEach(f => { s += `<text class="val l-ap" x="${f.x + 8}" y="${f.y + 4}" style="animation-delay:${1.3 + f.si * .1}s">${fmt(k, f.p.r)}</text>`; });
    xs.forEach((x, i) => {
      const x0 = i ? (X(i - 1) + X(i)) / 2 : L, x1 = i < xs.length - 1 ? (X(i) + X(i + 1)) / 2 : W - R;
      const t = S.map(({e, pts}) => { const p = pts.find(p => p.x === x); return p ? `<i style="background:${CE[e]}"></i>${CORTO[e] || e}: <b>${fmt(k, p.r)}</b> · n ${f0(p.r.n)}${p.r.n < NMIN ? ' (muestra baja)' : ''}` : ''; }).filter(Boolean).join('<br>');
      s += `<rect class="hit" data-x="${x}" data-cx="${X(i)}" x="${x0}" y="${T}" width="${x1 - x0}" height="${H - T - B}" ${tipAttr(`<div class="t">${modo === 'mes' ? '' : 'Semana del '}${esc(etq(x))}</div>${t}`)}/>`;
    });
    el.innerHTML = s + '</svg>';
    G.guia(el);
    if (tabla) tabla.innerHTML = `<table class="rk"><thead><tr><th>${modo === 'mes' ? 'Mes' : 'Semana'}</th>${S.map(s => `<th class="num">${CORTO[s.e] || s.e}</th><th class="num">n</th>`).join('')}</tr></thead><tbody>${xs.map(x => `<tr><td>${esc(etq(x))}</td>${S.map(s => { const p = s.pts.find(p => p.x === x); return `<td class="num">${p ? fmt(k, p.r) : '—'}</td><td class="num">${p ? f0(p.r.n) : '—'}</td>`; }).join('')}</tr>`).join('')}</tbody></table>`;
  });
}
// Leyenda de series de líneas (texto en tinta, el color va en la marca)
const leyendaSeries = est => {
  const es = est !== undefined ? [est] : ests();
  return es.map(e => `<span><i class="l" style="background:${CE[EST[e]]}"></i>${CORTO[EST[e]]}</span>`).join('') + (est === undefined && st.estudio == null ? '<span><i class="l" style="background:var(--ink);height:4px"></i><b>NPS Digital</b></span>' : '');
};
// Distribuciones (graficos.js)
const divergente = (grupos, pref = 'ces_', fin = g => `${fmt('ces', IND.ces.calc(g.a))}<small>CES</small>`) =>
  G.divergente(grupos.map(g => ({nombre: g.nombre, sub: g.sub, cuentas: [1, 2, 3, 4, 5].map(i => g.a[pref + i]), fin: fin(g)})), D.facilidad);
const wafNps = grupos => G.waffle(grupos.filter(g => g.a.nps_n).map(g => ({nombre: g.nombre, sub: g.sub, cuentas: [g.a.det, g.a.nps_n - g.a.det - g.a.prom, g.a.prom],
  fin: `${fmt('nps', IND.nps.calc(g.a))}<small>NPS</small>`})), ['Detractores 0–6', 'Pasivos 7–8', 'Promotores 9–10']);
const donasFcr = grupos => G.donas(grupos.map(g => ({nombre: g.nombre, sub: g.sub, cuentas: [g.a.fcr_no, g.a.fcr_si]})), ['No resolvió', 'Resolvió'], {centro: 'resolvió', dec: 1});
// NPS de quien resolvió frente a quien no (o de quien lo encontró fácil frente a difícil)
const brechaFcr = grupos => G.brecha(grupos.map(g => { const a = g.a;
  return {nombre: g.nombre, sub: `${fmt('fcr', IND.fcr.calc(a))} resolvió`,
    bueno: a.fcr_si ? {v: npsDe(a.fcr_si, a.prom_fsi, a.det_fsi), n: a.fcr_si} : null,
    malo: a.fcr_no ? {v: npsDe(a.fcr_no, a.prom_fno, a.det_fno), n: a.fcr_no} : null}; }), {etqBueno: 'Resolvió', etqMalo: 'No resolvió', unidad: 'pts de NPS'});
const brechaCes = grupos => G.brecha(grupos.map(g => { const a = g.a;
  return {nombre: g.nombre, sub: `${fmt('ces', IND.ces.calc(a))} fácil`,
    bueno: a.n_cfac ? {v: npsDe(a.n_cfac, a.prom_cfac, a.det_cfac), n: a.n_cfac} : null,
    malo: a.n_cdif ? {v: npsDe(a.n_cdif, a.prom_cdif, a.det_cdif), n: a.n_cdif} : null}; }), {etqBueno: 'Fácil o muy fácil', etqMalo: 'Difícil o muy difícil', unidad: 'pts de NPS'});
function temasDe(idx, tope = 9) {
  const c = new Map(); for (const i of idx) for (const [t, n] of TEMAS.get(i) || []) c.set(t, (c.get(t) || 0) + n);
  const o = [...c].map(([t, n]) => ({nombre: D.temas[t], c: n})).sort((a, b) => b.c - a.c);
  if (o.length <= tope) return o;
  const r = o.slice(tope - 1); return [...o.slice(0, tope - 1), {nombre: `Otros ${r.length} temas`, c: r.reduce((x, y) => x + y.c, 0), cod: true}];
}
const opciones = (a, pref, nombres) => nombres.map((nombre, i) => ({nombre, c: a[pref + i]})).filter(x => x.c).sort((x, y) => y.c - x.c);

// Ranking: un indicador por una dimensión, con selector de indicador
const rkEst = {};
function ranking(id, ks, dims, o = {}) {
  if (!rkEst[id]) rkEst[id] = {k: ks[0], dim: dims[0][0], orden: 'n', todos: false};
  const e = rkEst[id], k = e.k, tope = o.tope || 10; e.args = [ks, dims, o];
  const idx = filas(o.est === undefined ? {} : {estudio: o.est}), tot = IND[k].calc(sumar(idx));
  const g = porDim(idx, e.dim).filter(x => !['No aplica', 'Sin dato'].includes(x.nombre) || x.a.n).map(x => ({...x, r: IND[k].calc(x.a)})).filter(x => x.r && x.nombre !== 'No aplica');
  const val = x => x.r.n < NMIN ? (e.orden === 'peor' ? 1e9 : -1e9) : x.r.v;
  g.sort(e.orden === 'n' ? (a, b) => b.r.n - a.r.n : e.orden === 'peor' ? (a, b) => val(a) - val(b) : (a, b) => val(b) - val(a));
  const vis = e.todos ? g : g.slice(0, tope), {min, max} = IND[k], X = v => (v - min) / (max - min) * 100, fil = e.dim === 'estudio' || MULTI.some(([m]) => m === e.dim);
  const nomDim = dims.find(d => d[0] === e.dim)[1], sel = i => e.dim === 'estudio' ? st.estudio === i : st[e.dim] && st[e.dim].has(i);
  return `<section class="panel" data-rk="${id}"><header><h2>${IND[k].corto} por ${nomDim.toLowerCase()}</h2>
    <div class="herr">${ks.length > 1 ? `<div class="seg" role="group" aria-label="Indicador">${ks.map(x => `<button type="button" data-k="${x}" aria-pressed="${k === x}">${IND[x].corto}</button>`).join('')}</div>` : ''}
    ${dims.length > 1 ? `<div class="seg" role="group" aria-label="Abrir por">${dims.map(([d, t]) => `<button type="button" data-dim="${d}" aria-pressed="${e.dim === d}">${t}</button>`).join('')}</div>` : ''}
    <div class="seg" role="group" aria-label="Ordenar"><button type="button" data-ord="n" aria-pressed="${e.orden === 'n'}">Volumen</button><button type="button" data-ord="peor" aria-pressed="${e.orden === 'peor'}">Peor</button><button type="button" data-ord="mejor" aria-pressed="${e.orden === 'mejor'}">Mejor</button></div></div>
    ${o.sub ? `<p class="sub">${o.sub}</p>` : ''}</header>
    <div class="tw"><table class="rk"><caption class="sr">${IND[k].nombre} por ${nomDim}</caption><thead><tr><th>${nomDim}</th><th class="num">n</th><th class="num">% n</th><th class="num">${IND[k].corto}</th><th><span aria-hidden="true">│ total ${fmt(k, tot)}</span><span class="sr">barra</span></th><th class="num">vs total</th></tr></thead><tbody>
    ${vis.map((x, i) => { const d = tot ? x.r.v - tot.v : 0, b = min < 0 ? `left:${Math.min(X(0), X(x.r.v))}%;width:${Math.abs(X(x.r.v) - X(0))}%` : `left:0;width:${X(x.r.v)}%`;
      const col = x.r.n < NMIN ? '' : `;background:${G.tonoDif(d, min < 0 ? 40 : 20)}`, ori = min < 0 && x.r.v < 0 ? 'r' : 'l';
      return `<tr class="${x.r.n < NMIN ? 'poca' : ''}${fil ? ' clic' : ''}${fil && sel(x.v) ? ' sel' : ''}" ${fil ? `tabindex="0" data-v="${x.v}"` : ''}><td class="nom">${esc(x.nombre)}${bajo(x.r)}</td><td class="num">${f0(x.r.n)}</td><td class="num">${tot ? f1(x.r.n / tot.n * 100) : '—'}</td><td class="num"><b>${fmt(k, x.r)}</b></td><td class="bar"><div class="mini" ${tipAttr(tipInd(k, x.r))}><b style="${b}${col}" data-an="barra" data-o="${ori}" data-i="${i}"></b>${tot ? `<span class="ref" style="left:${X(tot.v)}%"></span>` : ''}</div></td><td class="num"><span class="dif ${x.r.n < NMIN || Math.abs(d) < .05 ? '' : d > 0 ? 'mejora' : 'empeora'}">${fpp(d)}</span></td></tr>`; }).join('') || '<tr><td colspan="6" class="vacio">Sin datos</td></tr>'}
    </tbody></table></div>${g.length > tope ? `<button type="button" class="mas">${e.todos ? 'Ver menos' : `Ver los ${g.length}`}</button>` : ''}
    <p class="nota" style="margin:6px 0 0">${fil ? 'Clic en una fila para filtrar todo el tablero. ' : ''}% n = participación en las respuestas del indicador. Gris = menos de ${NMIN} respuestas (no se ordena por valor).</p></section>`;
}
function reemplazar(viejo, html) { const tmp = document.createElement('div'); tmp.innerHTML = html; const n = tmp.firstElementChild; viejo.replaceWith(n); return n; }
function repintarRanking(p) {
  const e = rkEst[p.dataset.rk], nuevo = reemplazar(p, ranking(p.dataset.rk, e.args[0], e.args[1], e.args[2]));
  montarRanking(nuevo.parentNode); G.animar(nuevo, {inmediato: true});
}
function montarRanking(raiz) {
  raiz.querySelectorAll('[data-rk]').forEach(p => {
    const e = rkEst[p.dataset.rk];
    p.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { e.k = b.dataset.k; repintarRanking(p); });
    p.querySelectorAll('[data-dim]').forEach(b => b.onclick = () => { e.dim = b.dataset.dim; e.todos = false; repintarRanking(p); });
    p.querySelectorAll('[data-ord]').forEach(b => b.onclick = () => { e.orden = b.dataset.ord; repintarRanking(p); });
    const mas = p.querySelector('.mas'); if (mas) mas.onclick = () => { e.todos = !e.todos; repintarRanking(p); };
    p.querySelectorAll('tr.clic').forEach(tr => { const f = () => alternar(e.dim, +tr.dataset.v); tr.onclick = f; tr.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); f(); } }; });
  });
}

// ------------------------------------------------------------------ matriz tipo Power BI
// Celda con el tono de la rampa: dónde cae el valor dentro de un rango de referencia por indicador (rojo = bajo, verde = alto)
function celda(k, r, rAnt) {
  if (!r) return `<td class="na">—</td><td class="na"></td>`;
  const [lo, hi] = IND[k].rango, t = (r.v - lo) / (hi - lo);
  let dd = '';
  if (rAnt) { const d = r.v - rAnt.v, c = Math.abs(d) < .05 ? 'igual' : d > 0 ? 'mejora' : 'empeora'; dd = `<span class="dd ${c}">${c === 'igual' ? '■' : d > 0 ? '▲' : '▼'} ${fpp(d)}</span>`; }
  return `<td class="sep"><span class="cel" style="background:${G.tono(t)};color:${G.tinta(t)}" ${tipAttr(tipInd(k, r, rAnt ? `<br>Antes: ${fmt(k, rAnt)} · n ${f0(rAnt.n)}` : ''))}>${fmt(k, r)}</span>${dd}</td><td class="n">${f0(r.n)}${r.n < NMIN ? ' <span class="bajo">baja</span>' : ''}</td>`;
}
function matriz() {
  const ant = mesesAnteriores(), filaH = (cls, nombre, a, aA, attrs, punto) => `<tr class="${cls}" ${attrs || ''}><td>${punto ? `<i class="punto" style="background:${punto}"></i> ` : ''}${esc(nombre)}</td>${KS.map(k => celda(k, IND[k].calc(a), aA ? IND[k].calc(aA) : null)).join('')}</tr>`;
  let h = '';
  for (const e of ests()) {
    const a = A({estudio: e}); if (!a.n) continue;
    h += filaH('est clic' + (st.estudio === e ? ' sel' : ''), EST[e], a, ant ? A({estudio: e, periodo: ant}) : null, `tabindex="0" data-dim="estudio" data-v="${e}"`, CE[EST[e]]);
    const cs = porDim(filas({estudio: e}), 'canal').filter(c => c.a.n);
    if (cs.length > 1) cs.forEach(c => { h += filaH('sub clic' + (st.canal.has(c.v) ? ' sel' : ''), c.nombre, c.a, ant ? A({estudio: e, periodo: ant, donde: {canal: c.v}}) : null, `tabindex="0" data-dim="canal" data-v="${c.v}"`); });
  }
  if (st.estudio == null) h += filaH('tot', 'Total NPS Digital', A(), ant ? A({periodo: ant}) : null);
  return `<section class="panel" id="matriz"><header><h2>Indicadores por estudio y canal</h2><span class="nota">${etqMeses(st.meses)}${ant ? ` · ▲▼ vs ${etqCorta(ant)}` : ''}</span>
    <p class="sub">Igual que la matriz del Power BI: el total suma las respuestas de los cuatro estudios. Color: dónde cae el valor en su escala de referencia (rojo = bajo, verde = alto). Clic en una fila para filtrar.</p></header>
    <div class="tw"><table class="mtz"><thead><tr><th></th>${KS.map(k => `<th colspan="2" class="ind sep">${IND[k].corto}</th>`).join('')}</tr>
      <tr><th>Estudio</th>${KS.map(k => `<th class="sep" ${tipAttr(esc(IND[k].def))}>${IND[k].corto}</th><th># ${IND[k].corto}</th>`).join('')}</tr></thead><tbody>${h}</tbody></table></div></section>`;
}
function montarMatriz(raiz) {
  raiz.querySelectorAll('.mtz tr.clic').forEach(tr => { const f = () => alternar(tr.dataset.dim, +tr.dataset.v); tr.onclick = f; tr.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); f(); } }; });
}
// De dónde sale el NPS Digital: peso de cada estudio y cuánto lo sube o lo baja
function aporte() {
  const tot = A(), T = IND.nps.calc(tot);
  if (!T || st.estudio != null) return '';
  const fs = EST.map((n, e) => { const a = A({estudio: e}), r = IND.nps.calc(a); return r ? {n, e, r, peso: a.nps_n / tot.nps_n, ap: a.nps_n / tot.nps_n * (r.v - T.v)} : null; }).filter(Boolean);
  const M = Math.max(1, ...fs.map(f => Math.abs(f.ap)));
  return `<section class="panel" id="aporte"><header><h2 ${tipAttr('Aporte = peso del estudio × (su NPS − NPS Digital). Las cuatro filas suman cero: lo que unos suben, otros lo bajan.')}>Qué estudios suben y bajan el NPS Digital <span class="info">?</span></h2>
    <p class="sub">NPS Digital ${f1(T.v)} · cada estudio pesa según sus respuestas.</p></header>
    <div class="mix" role="img" aria-label="Peso de cada estudio">${fs.map(f => `<span style="width:${f.peso * 100}%;background:${CE[f.n]}" ${tipAttr(`<div class="t">${CORTO[f.n]}</div>${f1(f.peso * 100)} % de las respuestas de NPS (${f0(f.r.n)})`)}></span>`).join('')}</div>
    <div class="leyenda" style="margin-bottom:10px">${fs.map(f => `<span><i style="background:${CE[f.n]}"></i>${CORTO[f.n]} ${f1(f.peso * 100)} %</span>`).join('')}</div>
    <div class="aporte">${fs.map((f, i) => `<div class="ap"><div class="et"><i class="punto" style="background:${CE[f.n]}"></i><div>${CORTO[f.n]}<small>NPS ${f1(f.r.v)} · ${f1(f.peso * 100)} %</small></div></div>
      <div class="pz2" ${tipAttr(`<div class="t">${CORTO[f.n]}</div>NPS ${f1(f.r.v)} vs ${f1(T.v)} del total (${fpp(f.r.v - T.v)} pts) × peso ${f1(f.peso * 100)} % = <b>${fpp(f.ap)} pts</b> sobre el NPS Digital`)}><span class="cero"></span>
        <b style="${f.ap < 0 ? `right:50%;width:${Math.abs(f.ap) / M * 50}%` : `left:50%;width:${f.ap / M * 50}%`};background:${G.tonoDif(f.ap, M)}" data-an="barra" data-o="${f.ap < 0 ? 'r' : 'l'}" data-i="${i}"></b></div>
      <div class="v">${G.cuenta(f.ap, 2, {signo: true})}<small>pts</small></div></div>`).join('')}</div></section>`;
}

// ------------------------------------------------------------------ hallazgos (se recalculan con los filtros)
function hallazgos() {
  const out = [], T = IND.nps.calc(A()), inc = n => ei(n) >= 0 && (st.estudio == null || st.estudio === ei(n)) && A({estudio: ei(n)}).n;
  if (!T) return out;
  // 1. Quién baja el NPS Digital
  if (st.estudio == null) {
    const tot = A(), fs = EST.map((n, e) => { const a = A({estudio: e}), r = IND.nps.calc(a); return r ? {n, r, peso: a.nps_n / tot.nps_n, ap: a.nps_n / tot.nps_n * (r.v - T.v)} : null; }).filter(Boolean);
    const peor = fs.slice().sort((a, b) => a.ap - b.ap)[0], mejor = fs.slice().sort((a, b) => b.r.v - a.r.v)[0];
    if (peor && peor.ap < -.2) out.push({tono: 'alerta', cifra: fpp(peor.ap), u: 'pts', tab: TABS.find(t => TAB_EST[t[0]] === peor.n)[0],
      t: `${CORTO[peor.n]} le resta ${f1(-peor.ap)} pts al NPS Digital`,
      p: `Es el ${f0(peor.peso * 100)} % de las respuestas y su NPS (${f1(peor.r.v)}) está ${f1(T.v - peor.r.v)} pts por debajo del total (${f1(T.v)}). Por su peso, lo que pase en ${CORTO[peor.n]} mueve el indicador.`});
    if (mejor && mejor.peso < .05) out.push({tono: 'bien', cifra: f1(mejor.r.v), u: 'NPS', tab: TABS.find(t => TAB_EST[t[0]] === mejor.n)[0],
      t: `${CORTO[mejor.n]} tiene el mejor NPS, pero pesa poco`, p: `Con ${f0(mejor.r.n)} respuestas es apenas el ${f1(mejor.peso * 100)} % del NPS Digital: su buen resultado casi no mueve el total.`});
  }
  // 2. Web vs Super App (y el mismo trámite, para descartar que sea por la mezcla)
  if (inc(N_APP)) {
    const e = ei(N_APP), cs = porDim(filas({estudio: e}), 'canal'), sp = cs.find(c => c.nombre === SUPER), wb = cs.find(c => c.nombre === WEB);
    const rs = sp && IND.nps.calc(sp.a), rw = wb && IND.nps.calc(wb.a);
    if (rs && rw && rw.n >= NMIN) {
      const mods = porDim(filas({estudio: e}), 'modulo').map(m => ({m, s: IND.nps.calc(A({estudio: e, donde: {modulo: m.v, canal: sp.v}})), w: IND.nps.calc(A({estudio: e, donde: {modulo: m.v, canal: wb.v}}))}))
        .filter(x => x.s && x.w && x.w.n >= NMIN && x.m.nombre !== 'Sin dato').sort((a, b) => Math.min(b.s.n, b.w.n) - Math.min(a.s.n, a.w.n));
      const mm = mods[0];
      out.push({tono: rw.v < rs.v - 10 ? 'alerta' : 'ojo', cifra: fpp(rw.v - rs.v), u: 'pts', tab: 'app',
        t: `La web de Mi Claro está ${f1(rs.v - rw.v)} pts por debajo de la Super App`,
        p: `NPS ${f1(rw.v)} en la web (${f0(rw.n)} respuestas) frente a ${f1(rs.v)} en la app.${mm ? ` No es por el tipo de trámite: en «${mm.m.nombre}» la brecha es de ${f1(mm.s.v - mm.w.v)} pts (${f1(mm.w.v)} vs ${f1(mm.s.v)}).` : ''}`});
    }
    // 3. Trámites que más le restan a Mi Claro: peso × distancia al NPS de Mi Claro (no solo el peor valor)
    const tA = IND.nps.calc(A({estudio: e})), ms = porDim(filas({estudio: e}), 'modulo').map(m => ({m, r: IND.nps.calc(m.a)}))
      .filter(x => x.r && x.r.n >= 100 && !['Sin dato', 'No aplica'].includes(x.m.nombre)).map(x => ({...x, resta: x.r.n / tA.n * (tA.v - x.r.v)})).sort((a, b) => b.resta - a.resta);
    if (ms.length > 1 && tA && ms[0].resta >= .3) {
      const otros = ms.slice(1, 3).filter(x => x.resta >= .2);
      out.push({tono: 'alerta', cifra: f1(ms[0].r.v), u: 'NPS', tab: 'app', t: `«${ms[0].m.nombre}» es el trámite que más le resta a Mi Claro`,
        p: `NPS ${f1(ms[0].r.v)} con ${f0(ms[0].r.n)} respuestas (${f1(ms[0].r.n / tA.n * 100)} % de Mi Claro): ${f1(tA.v - ms[0].r.v)} pts debajo de Mi Claro (${f1(tA.v)}). Si calificara como el promedio, Mi Claro subiría ${f1(ms[0].resta)} pts.${otros.length ? ` Le siguen ${otros.map(x => `«${x.m.nombre}» (NPS ${f1(x.r.v)}, n ${f0(x.r.n)})`).join(' y ')}.` : ''}`});
    }
    // 4. Segmento
    const sg = porDim(filas({estudio: e}), 'segmento').map(s => ({s, r: IND.nps.calc(s.a)})).filter(x => x.r && x.r.n >= NMIN && !['Sin dato', 'No aplica'].includes(x.s.nombre)).sort((a, b) => a.r.v - b.r.v);
    if (sg.length > 1 && sg[sg.length - 1].r.v - sg[0].r.v >= 3)
      out.push({tono: 'ojo', cifra: f1(sg[0].r.v), u: 'NPS', tab: 'app', t: `En Mi Claro, ${sg[0].s.nombre} es el segmento con menor NPS`,
        p: `${f1(sg[0].r.v)} frente a ${f1(sg[sg.length - 1].r.v)} de ${sg[sg.length - 1].s.nombre} (${f0(sg[0].r.n)} y ${f0(sg[sg.length - 1].r.n)} respuestas).`});
  }
  // 5. Facilidad: lo que pesa encontrar difícil el trámite
  const a = A();
  if (a.n_cdif >= NMIN && a.n_cfac >= NMIN) {
    const dif = npsDe(a.n_cdif, a.prom_cdif, a.det_cdif), fac = npsDe(a.n_cfac, a.prom_cfac, a.det_cfac), cv = a.ces_1 + a.ces_2 + a.ces_3 + a.ces_4 + a.ces_5;
    out.push({tono: 'alerta', cifra: f1(dif), u: 'NPS', tab: st.estudio === ei(N_WA) ? 'wa' : 'app', t: 'Quien encuentra difícil el trámite casi nunca recomienda',
      p: `El NPS de quien lo calificó difícil o muy difícil es ${f1(dif)}, frente a ${f1(fac)} de quien lo encontró fácil: ${f0(fac - dif)} pts de diferencia. ${f1((a.ces_1 + a.ces_2) / cv * 100)} % lo encontró difícil (${f0(a.ces_1 + a.ces_2)} respuestas).`});
  }
  // 6. Resolución
  if (a.fcr_no >= NMIN && a.fcr_si >= NMIN) {
    const no = npsDe(a.fcr_no, a.prom_fno, a.det_fno), si = npsDe(a.fcr_si, a.prom_fsi, a.det_fsi);
    out.push({tono: 'ojo', cifra: fpp(no - si), u: 'pts', tab: st.estudio === ei(N_BOT) ? 'bot' : 'wa', t: 'Cuando el bot no resuelve, el NPS se desploma',
      p: `NPS ${f1(no)} cuando no resolvió frente a ${f1(si)} cuando sí. No resolvió el ${f1(a.fcr_no / (a.fcr_si + a.fcr_no) * 100)} % (${f0(a.fcr_no)} respuestas de WhatsApp y Claro Bot).`});
  }
  // 7. Claro Bot
  if (inc(N_BOT)) {
    const b = A({estudio: ei(N_BOT)}), rb = IND.nps.calc(b), fb = IND.fcr.calc(b), mo = opciones(b, 'bmen_', D.bot_menos), bm = mo.reduce((s, x) => s + x.c, 0);
    if (rb && rb.n >= NMIN && mo.length) out.push({tono: rb.v < T.v - 10 ? 'alerta' : 'ojo', cifra: f1(rb.v), u: 'NPS', tab: 'bot', t: `Claro Bot: NPS ${f1(rb.v)} y resuelve ${fb ? f0(fb.v) : '—'} de cada 100`,
      p: `Lo que menos gustó: «${mo[0].nombre}» (${f0(mo[0].c / bm * 100)} % de ${f0(bm)} respuestas)${mo[1] ? ` y «${mo[1].nombre}» (${f0(mo[1].c / bm * 100)} %)` : ''}.`});
  }
  // 8. Tema #1 de lo que falló en Mi Claro
  if (inc(N_APP)) {
    const idx = filas({estudio: ei(N_APP)}), ts = temasDe(idx, 40).filter(x => !x.cod), base = sumar(idx).com_temas;
    if (ts.length && base >= NMIN) out.push({tono: 'ojo', cifra: f0(ts[0].c / base * 100), u: '%', tab: 'app', t: `«${ts[0].nombre}» es lo que más se queja en Mi Claro`,
      p: `${f0(ts[0].c)} de ${f0(base)} comentarios sobre lo que impidió una buena experiencia o fue difícil.${ts[1] ? ` Siguen «${ts[1].nombre}» (${f0(ts[1].c / base * 100)} %) y «${ts[2] ? ts[2].nombre : ''}» (${ts[2] ? f0(ts[2].c / base * 100) : 0} %).` : ''}`});
  }
  // 9. Tendencia contra el periodo anterior
  const ant = mesesAnteriores();
  if (ant) {
    const r0 = IND.nps.calc(A({periodo: ant}));
    // Si el periodo anterior no tiene algún estudio (Oracle sin esos meses), la comparación del total no es pareja: se avisa
    const sin = ests().filter(e => A({estudio: e}).n && !A({periodo: ant, estudio: e}).n).map(e => CORTO[EST[e]]);
    if (r0) { const d = T.v - r0.v; out.push({tono: d >= 0 ? 'bien' : 'alerta', cifra: fpp(d), u: 'pts', tab: 'resumen', t: `${alcance()} ${d >= 0 ? 'sube' : 'baja'} frente a ${etqCorta(ant)}`, p: `${f1(r0.v)} → ${f1(T.v)}. ${sin.length ? `Ojo: ${etqCorta(ant)} no tiene encuestas de ${sin.join(' ni ')}, así que la comparación no es pareja. ` : ''}Revise en la matriz qué estudio y canal explica el cambio.`}); }
  }
  return out;
}
function vHallazgos() {
  const hs = hallazgos(), ico = {alerta: '!', ojo: '◆', bien: '✓'};
  return `<section class="panel" id="hallazgos"><header><h2>Hallazgos</h2><span class="nota">${alcance()} · ${etqMeses(st.meses)} · se recalculan con los filtros</span></header>
    ${hs.length ? `<ul class="hall">${hs.map((h, i) => `<li class="hl ${h.tono}" data-an="aparece" data-i="${i}"><span class="ic" aria-hidden="true">${ico[h.tono]}</span>
      <div class="cifra">${h.cifra}<small>${h.u}</small></div><b class="t">${esc(h.t)}</b><p>${esc(h.p)}</p>${h.tab && h.tab !== st.tab ? `<button type="button" class="ir-tab" data-ir="${h.tab}">Ver detalle ›</button>` : ''}</li>`).join('')}</ul>` : '<p class="vacio">Sin hallazgos con estos filtros</p>'}
    ${D.periodos[PERIODOS[st.periodo]] && D.periodos[PERIODOS[st.periodo]].calidad.some(c => c.id === 'parcial' && c.nivel === 'aviso') ? `<p class="nota" style="margin:10px 0 0">Ojo: ${esc(mesL(PERIODOS[st.periodo]))} está incompleto (${esc(D.periodos[PERIODOS[st.periodo]].calidad.find(c => c.id === 'parcial').detalle.split('.')[0])}).</p>` : ''}</section>`;
}

// ------------------------------------------------------------------ vistas
function vResumen(p) {
  const a = A(), ant = mesesAnteriores(), aAnt = ant ? A({periodo: ant}) : null, etA = ant ? etqCorta(ant) : '';
  const kpis = KS.map((k, i) => {
    const r = IND[k].calc(a), pr = aAnt ? IND[k].calc(aAnt) : null;
    return `<article class="kpi${i === 0 ? ' estrella' : ''}">${i === 0 ? '<span class="glow"></span>' : ''}
      ${r ? G.anillo(r.v, IND[k].min, IND[k].max, {tip: tipInd(k, r), tam: i === 0 ? 64 : 56, grosor: i === 0 ? 7 : 6}) : ''}
      <div class="et">${i === 0 ? (st.estudio == null ? IND[k].nombre : 'NPS ' + CORTO[EST[st.estudio]]) : IND[k].nombre} <span class="info" tabindex="0" ${tipAttr(esc(IND[k].def))}>?</span></div>
      <div class="v" ${tipAttr(tipInd(k, r))}>${r ? `${G.cuenta(r.v, 1)}<small>${k === 'nps' ? 'pts' : '%'}</small>` : '—'}</div>
      <div class="pie">${delta(k, r, pr, etA)}</div>
      ${spark(k)}
      <div class="pie"><span>n ${r ? f0(r.n) : 0}${r ? ` · ±${f1(r.ic)}` : ''}${k === 'nps' ? '' : corrTxt(k, a)}</span>${bajo(r)}<span class="nota" style="margin-left:auto">${k === 'nps' ? '' : IND[k].donde}</span></div></article>`;
  }).join('');
  p.innerHTML = `
    <section class="kpis" aria-label="Indicadores de ${etqMeses(st.meses)}">${kpis}</section>
    ${vHallazgos()}
    ${matriz()}
    <div class="g g-2-1">${panelEvo()}${aporte() || `<section class="panel"><header><h2>${esc(EST[st.estudio])}</h2></header>${wafNps([{nombre: CORTO[EST[st.estudio]], a}])}</section>`}</div>
    ${carrusel('res', ['det', 'pro', 'dif', 'nores'])}`;
  montarEvo(p); montarMatriz(p);
}
function panelEvo() {
  return `<section class="panel" id="evo-p"><header><h2>${IND[st.evo].nombre} · ${st.modo === 'mes' ? 'mes a mes' : 'semana a semana, ' + etqMeses(st.meses)}</h2>
        <div class="herr"><div class="seg" role="group" aria-label="Indicador" id="evo-k">${KS.map(k => `<button type="button" data-k="${k}" aria-pressed="${st.evo === k}">${IND[k].corto}</button>`).join('')}</div>
        ${PERIODOS.length > 1 ? `<div class="seg" role="group" aria-label="Agrupar" id="evo-m"><button type="button" data-m="mes" aria-pressed="${st.modo === 'mes'}">Mes</button><button type="button" data-m="semana" aria-pressed="${st.modo === 'semana'}">Semana</button></div>` : ''}</div>
        <div class="leyenda" style="flex-basis:100%">${leyendaSeries()}<span class="nota">Punto hueco = menos de ${NMIN} respuestas${st.modo === 'semana' ? ' · semanas de lunes a domingo; la primera y la última pueden estar incompletas' : ''}</span>${tablaPH('evo')}</div></header>
        ${lineasPH(st.evo, st.modo, 'evo')}</section>`;
}
function repintarEvo() { const n = reemplazar(document.getElementById('evo-p'), panelEvo()); montarEvo(n); dibujarLineas(n); G.animar(n, {inmediato: true}); }
function montarEvo(raiz) {
  raiz.querySelectorAll('#evo-k button').forEach(b => b.onclick = () => { st.evo = b.dataset.k; repintarEvo(); });
  raiz.querySelectorAll('#evo-m button').forEach(b => b.onclick = () => { st.modo = b.dataset.m; repintarEvo(); });
}
const avisoEst = e => st.estudio != null && st.estudio !== e ? `<p class="nota" style="margin:0">Esta sección muestra solo ${esc(EST[e])}; el botón de estudio de arriba no la afecta.</p>` : '';
const sinEst = (p, n) => { p.innerHTML = `<p class="vacio">No hay encuestas de ${esc(n)} con estos filtros.</p>`; };
// Mini tabla comparativa de dos o más grupos con los indicadores que aplican
function comparar(grupos, ks) {
  const r0 = grupos.map(g => ks.map(k => IND[k].calc(g.a)));
  const br = grupos.length === 2 ? ks.map((k, j) => r0[0][j] && r0[1][j] ? r0[1][j].v - r0[0][j].v : null) : null;
  return `<table class="cmp"><thead><tr><th></th>${ks.map(k => `<th>${IND[k].corto}</th>`).join('')}</tr></thead><tbody>
    ${grupos.map((g, i) => `<tr><td>${g.punto ? `<i class="punto" style="background:${g.punto}"></i> ` : ''}${esc(g.nombre)}<small>${f0(g.a.n)} encuestas</small></td>${ks.map((k, j) => { const r = r0[i][j]; return `<td ${tipAttr(tipInd(k, r))}>${r ? `<b>${fmt(k, r)}</b>` : '—'}<small>${r ? 'n ' + f0(r.n) : ''}</small></td>`; }).join('')}</tr>`).join('')}
    ${br ? `<tr><td>Brecha<small>${esc(grupos[1].nombre)} − ${esc(grupos[0].nombre)}</small></td>${br.map((d, j) => `<td>${d == null ? '—' : `<b class="dif ${Math.abs(d) < .05 ? '' : d > 0 ? 'mejora' : 'empeora'}">${fpp(d)}</b><small>${uni(ks[j])}</small>`}</td>`).join('')}</tr>` : ''}</tbody></table>`;
}
function vApp(p) {
  const e = ei(N_APP), idx = filas({estudio: e}), a = sumar(idx);
  if (!a.n) return sinEst(p, N_APP);
  const cs = porDim(idx, 'canal').filter(c => c.a.n).map(c => ({nombre: c.nombre === SUPER ? 'Super App' : c.nombre === WEB ? 'Web' : c.nombre, a: c.a}));
  const segs = porDim(idx, 'segmento').filter(s => s.a.n && s.nombre !== 'No aplica').map(s => ({nombre: s.nombre, a: s.a}));
  p.innerHTML = `${avisoEst(e)}
    <div class="g g2"><section class="panel"><header><h2>Super App frente a la web</h2><p class="sub">Mi Claro · ${etqMeses(st.meses)}. La brecha es web − app.</p></header>${comparar(cs, ['nps', 'nsu', 'ces'])}
        <div style="margin-top:14px">${wafNps(cs)}</div></section>
      <div class="pila"><section class="panel"><header><h2>Facilidad y recomendación</h2><p class="sub">NPS de quien encontró fácil el trámite (Q8) frente a quien lo encontró difícil.</p></header>${brechaCes(cs)}</section>
      <section class="panel"><header><h2>Qué falló</h2><p class="sub">Temas de Qualtrics en «¿Qué te impidió tener una buena experiencia?» (Q6) y «¿Qué fue difícil?» (Q9) · % sobre ${f0(a.com_temas)} encuestas que escribieron algo.</p></header>${G.paletas(temasDe(idx), a.com_temas)}</section></div></div>
    ${ranking('app-mod', ['nps', 'ces', 'nsu'], [['modulo', 'Módulo'], ['segmento', 'Segmento'], ['canal', 'Canal']], {est: e, tope: 12, sub: 'Módulo = trámite desde el que se lanzó la encuesta (pagar factura, detalle del plan…). Registro no tiene segmento.'})}
    <section class="panel"><header><h2>¿Qué tan fácil fue el trámite?</h2><p class="sub">Q8 · centrado en «Ni fácil ni difícil».</p></header>${divergente([...cs, ...segs.filter(s => s.nombre !== 'Sin dato')])}</section>
    ${carrusel('app', ['det', 'dif', 'pro'], e)}`;
}
function vWa(p) {
  const e = ei(N_WA), idx = filas({estudio: e}), a = sumar(idx);
  if (!a.n) return sinEst(p, N_WA);
  const segs = porDim(idx, 'segmento').filter(s => s.a.n && s.nombre !== 'No aplica').map(s => ({nombre: s.nombre, a: s.a}));
  const gr = [{nombre: 'WhatsApp', a}, ...segs];
  p.innerHTML = `${avisoEst(e)}
    <div class="g g2"><div class="pila"><section class="panel"><header><h2>¿Logró hacer la consulta?</h2><p class="sub">Q10 · NPS de quien lo logró frente a quien no, por segmento.</p></header>${brechaFcr(gr)}</section>
      <section class="panel"><header><h2>Facilidad y recomendación</h2><p class="sub">NPS de quien encontró fácil recibir solución frente a quien lo encontró difícil.</p></header>${brechaCes(gr)}</section></div>
      <section class="panel comp"><header><h2>Composición</h2><p class="sub">Arriba, si logró la consulta. Abajo, cómo recomiendan: cada cuadrito es 1 % de las encuestas.</p></header>
        <div class="comp-b"><h3>¿Resolvió?</h3>${donasFcr(gr)}</div><div class="comp-b"><h3>NPS</h3>${wafNps(gr)}</div></section></div>
    <div class="g g2">${ranking('wa-seg', ['nps', 'nsu', 'ces', 'fcr'], [['segmento', 'Segmento']], {est: e})}
      <section class="panel"><header><h2>Qué falló</h2><p class="sub">Temas de Qualtrics en la experiencia no satisfactoria (Q6), lo difícil (Q9) y por qué no logró la consulta (Q11) · % sobre ${f0(a.com_temas)} encuestas con comentario.</p></header>${G.paletas(temasDe(idx), a.com_temas)}</section></div>
    <section class="panel"><header><h2>¿Qué tan fácil fue recibir una solución?</h2><p class="sub">Q8 · centrado en «Ni fácil ni difícil».</p></header>${divergente(gr)}</section>
    ${carrusel('wa', ['nores', 'det', 'pro'], e)}`;
}
function vBot(p) {
  const e = ei(N_BOT), idx = filas({estudio: e}), a = sumar(idx);
  if (!a.n) return sinEst(p, N_BOT);
  const gr = [{nombre: 'Claro Bot', a}], men = opciones(a, 'bmen_', D.bot_menos), mas = opciones(a, 'bmas_', D.bot_mas);
  const bm = men.reduce((s, x) => s + x.c, 0), bp = mas.reduce((s, x) => s + x.c, 0), nBm = npsDe(a.n_bmen, a.prom_bmen, a.det_bmen);
  p.innerHTML = `${avisoEst(e)}
    <section class="panel"><header><h2>Claro Bot en cifras</h2><p class="sub">Canal de autoatención en la web. NPS = recomendación del canal (Q9); NSU = satisfacción 7 a 10 (Q2); FCR = «¿resolvió tu requerimiento?» (Q8).</p></header>${comparar([{nombre: 'NPS Digital (total)', a: A({estudio: null})}, {nombre: 'Claro Bot', a, punto: CE[N_BOT]}], ['nps', 'nsu', 'fcr'])}</section>
    <div class="g g2"><section class="panel"><header><h2>¿Resolvió el requerimiento?</h2><p class="sub">Q8 · NPS de quien dice que sí frente a quien dice que no.</p></header>${brechaFcr(gr)}</section>
      <section class="panel comp"><header><h2>Composición</h2></header><div class="comp-lado"><div class="comp-b"><h3>¿Resolvió?</h3>${donasFcr(gr)}</div><div class="comp-b"><h3>NPS</h3>${wafNps(gr)}</div></div></section></div>
    <div class="g g2"><section class="panel"><header><h2>Lo que menos gustó</h2><p class="sub">Q3 · % sobre ${f0(bm)} respuestas${nBm != null ? ` (su NPS: ${f1(nBm)})` : ''}.</p></header>${G.paletas(men, bm)}</section>
      <section class="panel"><header><h2>Lo que más gustó</h2><p class="sub">Q7 · % sobre ${f0(bp)} respuestas.</p></header>${G.paletas(mas, bp, {color: () => 'var(--t7)'})}</section></div>
    ${carrusel('bot', ['det', 'nores', 'pro'], e)}`;
}
function vEcom(p) {
  const e = ei(N_ECOM), idx = filas({estudio: e}), a = sumar(idx);
  if (!a.n) return sinEst(p, N_ECOM);
  const cs = porDim(idx, 'canal').filter(c => c.a.n).map(c => ({nombre: c.nombre.replace('Tienda online · ', 'Desde ').replace('Desde sin dato', 'Sin dato'), a: c.a}));
  const gr = [{nombre: 'Tienda online', a}, ...(cs.length > 1 ? cs : [])], mo = opciones(a, 'ecm_', D.ecom_motivos);
  const fac = (pref, g) => { const v = g.a[pref + 1] + g.a[pref + 2] + g.a[pref + 3] + g.a[pref + 4] + g.a[pref + 5]; return v ? `${f1((g.a[pref + 4] + g.a[pref + 5]) / v * 100)} %<small>fácil</small>` : '—'; };
  p.innerHTML = `${avisoEst(e)}
    <div class="g g2"><section class="panel"><header><h2>Recomendación después de comprar</h2><p class="sub">Q2 · cada cuadrito es 1 % de las encuestas. Dispositivo desde el que compró.</p></header>${wafNps(gr)}</section>
      <section class="panel" style="align-self:start"><header><h2>Motivos de la calificación</h2><p class="sub">Q6 · hasta 2 opciones · % sobre ${f0(a.ecm_n)} encuestas que eligieron alguno.</p></header>${G.paletas(mo, a.ecm_n, {color: () => 'var(--cat)'})}</section></div>
    <section class="panel"><header><h2>¿Qué tan fácil fue comprar y pagar?</h2><p class="sub">Q8 (compra) y Q10 (pago) · el Power BI no las cuenta como CES del NPS Digital; se muestran aparte.</p></header>
      ${G.divergente([{nombre: 'Comprar', cuentas: [1, 2, 3, 4, 5].map(i => a['ecc_' + i]), fin: fac('ecc_', {a})}, {nombre: 'Pagar', cuentas: [1, 2, 3, 4, 5].map(i => a['ecp_' + i]), fin: fac('ecp_', {a})}], D.facilidad)}</section>
    ${carrusel('ecom', ['det', 'pro'], e)}`;
}
// ------------------------------------------------------------------ nube de comentarios (Voces)
// Temas de los comentarios digitales (texto normalizado: minúsculas, sin tildes). Un comentario puede caer en varios.
const NUBE_CFG = (() => {
  const cats = [
    ['pago', 'Pagos y factura', 'pag(o|ar|ue|ando|os)\\b|factur|recibo|pse|tarjeta|debit|cobr|domicili|referencia de pago|no (se )?(refleja|aplic)|valor|cuota|saldo'],
    ['falla', 'La app falla o es lenta', 'no (carga|abre|funciona|sirve|deja|permite|entra|abria|cargaba)|se (cierra|bloquea|cae|traba|queda|congela)|lent|error|falla|bloque|actualiz|caid|pantalla en blanco|no responde|demora en cargar|se demora'],
    ['ingreso', 'Ingreso, registro y claves', 'ingres|registr|contrase|clave|usuario|codigo|sesion|verificac|token|correo|otp|iniciar|login|acceso|cuenta (nueva|bloqueada)'],
    ['uso', 'Difícil de usar o de encontrar', 'complicad|dificil|confus|enredad|no (encontre|encuentro|hay) (la )?opcion|no aparece|opciones|menu|interfaz|amigable|intuitiv|claridad|claro (el|la)|facil de usar|no entiendo|pasos'],
    ['bot', 'Bot y asesor humano', 'bot|robot|asesor|humano|persona|automatic|respuestas? (automatic|predetermin)|no entiende|no responde|chat|whats|atencion|atiend'],
    ['solucion', 'No resolvió', 'no (me )?(resolv|soluciona|solucion|ayud|sirvio|dieron|dan)|sin (solucion|respuesta)|no hay (solucion|respuesta)|no logr|no pude|no se pudo|nada que ver|no era lo que'],
    ['plan', 'Planes, paquetes y precios', 'plan|paquete|recarga|datos|gigas|megas|minutos|promoci|oferta|descuent|precio|caro|costos|tarifa|beneficio'],
    ['compra', 'Compra y crédito', 'compra|credito|cupo|financ|equipo|celular|telefono nuevo|envio|entrega|pedido|tienda|producto|iphone|samsung'],
    ['servicio', 'Internet, señal y servicio', 'internet|senal|wifi|red\\b|cobertura|velocidad|servicio tecnico|tecnico|visita|television|tv\\b|fibra|modem'],
    ['elogio', 'Elogios', '^(?![\\s\\S]*\\b(no|nada|pero|mal|mala|malo|pesim\\w*|falla|lent\\w*|demora\\w*)\\b)[\\s\\S]*(excelent|muy (bien|buen|facil|rapid|practic|util|agil)|buen[ao]? (servicio|atencion|app|aplicacion|experiencia)|facil|rapid|practic|agil|util|comod|me gusta|me encanta|perfect|genial|gracias)'],
  ];
  const stop = {}; 'app aplicacion claro mi web pagina hogar movil cliente usuario todo nada bien mal bueno buena mejor gracias favor hacer hace puedo pueden poder sea ser muy mas menos solo siempre cada vez veces dia dias'.split(' ').forEach(w => { stop[w] = 1; });
  const unir = {}; Object.entries({pago: 'pagar pague pagos pagando pagado', factura: 'facturas facturacion', falla: 'fallas fallando fallo', carga: 'cargar cargando', asesor: 'asesores asesora asesoras', ingreso: 'ingresar ingresando ingrese'}).forEach(([k, ws]) => ws.split(' ').forEach(w => { unir[w] = k; }));
  return {categorias: cats.map(([k, nombre, re]) => ({k, nombre, re: new RegExp(re)})), stop, unir, otros: 'Otros temas', nota: v => (v.q2 != null && v.q2 >= 0 ? v.q2 / 10 : null)};
})();
const exEst = {lente: '', q: '', nube: {}, items: null, ancho: 0}, nubeEl = document.createElement('div');
const etqNotaNube = x => `recomendación media ${f1(x * 10)} de 10`;
const metaCom = v => { const e = V.estudio[v.r[DI.estudio]]; return `<i class="punto" style="background:${CE[e]}"></i> ${esc(CORTO[e])} · ${mesC(PERIODOS[v.r[0]])} · ${esc(v.preg.texto)} · ${esc(lugar(v))}`; };
function calentarNube(i = 0) {
  if (!window.NUBE || !C || i >= C.length) return;
  const fin = Math.min(C.length, i + 1200);
  for (let j = i; j < fin; j++) NUBE.preparar(C[j], NUBE_CFG);
  setTimeout(() => calentarNube(fin), 40);
}
function montarNube(quieto) {
  if (!window.NUBE) { nubeEl.innerHTML = '<p class="vacio">Falta nube.js junto al tablero.</p>'; return; }
  NUBE.montar(nubeEl, {items: exEst.items, cfg: NUBE_CFG, estado: exEst.nube, etqNota: etqNotaNube, chip: chipNota, meta: metaCom, quieto: !!quieto});
  exEst.ancho = nubeEl.clientWidth;
}
function vVoz(p, o = {}) {
  const idx = filas(), a = sumar(idx);
  const EMO_C = ['var(--d-2)', 'var(--d-2)', 'var(--d-1)', 'var(--d-1)', 'var(--d0)', 'var(--d1)', 'var(--d1)', 'var(--d2)', 'var(--d2)'];
  const emos = D.emociones.map((e, i) => ({nombre: e, c: a['emo_' + i], i})).filter(x => x.c), be = emos.reduce((s, x) => s + x.c, 0);
  const neg = emos.filter(x => x.i < 4).reduce((s, x) => s + x.c, 0);
  let total = 0;
  if (C) { const L = exEst.lente ? LENTES[exEst.lente] : null, q = norm(exEst.q); exEst.items = [];
    for (const v of C) if (pasaCom(v, L, q)) { total++; exEst.items.push(v); } }
  const inf = D.periodos[PERIODOS[st.periodo]], cm = inf ? inf.comentarios : {};
  const util = Object.values(cm).reduce((s, x) => s + Object.values(x).reduce((t, y) => t + y[0], 0), 0), guard = Object.values(cm).reduce((s, x) => s + Object.values(x).reduce((t, y) => t + y[1], 0), 0);
  p.innerHTML = `
    <div class="g g2"><section class="panel"><header><h2>Emociones</h2><p class="sub">Q7 de Mi Claro, WhatsApp y E-commerce (Claro Bot no la pregunta) · ${be ? `${f1(neg / be * 100)} % negativas` : ''} · rojo = negativas, verde = positivas.</p></header>${G.paletas(emos, be, {color: x => EMO_C[x.i]})}</section>
      ${ranking('voz-est', ['nps', 'nsu', 'ces', 'fcr'], [['estudio', 'Estudio'], ['canal', 'Canal']], {sub: 'Cómo se comparan los estudios con los filtros actuales.'})}</div>
    <section class="panel"><header><h2>Nube de comentarios</h2><span class="nota" ${C ? tipAttr(`${f0(total)} comentarios con estos filtros. En ${esc(mesL(PERIODOS[st.periodo]))} hubo ${f0(util)} comentarios con contenido y se guardaron ${f0(guard)}: en Mi Claro y WhatsApp, una muestra aleatoria por pregunta (ver Calidad). Los vacíos o genéricos («ok», «excelente») no entran. Datos personales tapados.`) : ''}>${C ? `${f0(exEst.items.length)} comentarios` : 'Cargando…'}</span>
      <p class="sub">Cada comentario cae en uno o varios temas. Elige un tema a la izquierda o una palabra para leer los comentarios que más se repiten.</p></header>
      <div class="ex-herr"><input type="search" id="ex-q" placeholder="Buscar: factura, clave, asesor, cupo…" value="${esc(exEst.q)}" aria-label="Buscar en comentarios">
        <div class="seg" role="group" aria-label="Tipo"><button type="button" data-l="" aria-pressed="${!exEst.lente}">Todos</button>${Object.entries(LENTES).map(([k, l]) => `<button type="button" data-l="${k}" aria-pressed="${exEst.lente === k}">${l.t}</button>`).join('')}</div></div>
      <div id="ex-nube">${C ? '' : '<div class="nb-esq"><div class="esqueleto"></div><div class="esqueleto"></div></div>'}</div></section>`;
  if (C) { const ph = p.querySelector('#ex-nube'); ph.appendChild(nubeEl); montarNube(o.quieto); }
  const q = p.querySelector('#ex-q'); let t;
  q.oninput = () => { clearTimeout(t); t = setTimeout(() => { exEst.q = q.value.trim(); pintarTab({anim: false, quieto: true}); const n = p.querySelector('#ex-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };
  p.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { exEst.lente = b.dataset.l; pintarTab({anim: false}); });
}
function vCalidad(p) {
  const per = PERIODOS[st.periodo], inf = D.periodos[per], o = {error: 0, aviso: 1, ok: 2}, ico = {ok: '✓', aviso: '!', error: '✕'};
  const ch = [...inf.calidad].sort((a, b) => o[a.nivel] - o[b.nivel]), n = l => ch.filter(c => c.nivel === l).length;
  const PREGT = Object.fromEntries(PREG.map(q => [q.cod, q.texto]));
  p.innerHTML = `
    <div class="g g-2-1"><section class="panel"><header><h2>Contrato de datos · ${mesL(per)}</h2><span class="nota">${n('ok')} correctos · ${n('aviso')} avisos · ${n('error')} errores</span><p class="sub">Un «error» detiene la actualización y no se publica. Los avisos se explican aquí. Elige el mes:</p></header>
      <div class="meses" role="group" aria-label="Mes">${PERIODOS.map((pp, i) => { const a = D.periodos[pp].calidad.filter(c => c.nivel !== 'ok').length; return `<button type="button" data-i="${i}" aria-pressed="${i === st.periodo}">${mesC(pp)} · ${a} avisos</button>`; }).join('')}</div><div style="height:10px"></div>
      <div class="checks">${ch.map(c => `<div class="check ${c.nivel}"><span class="ico" aria-hidden="true">${ico[c.nivel]}</span><div><b>${esc(c.titulo)}</b><span class="sr"> (${c.nivel})</span><p>${esc(c.detalle)}</p></div></div>`).join('')}</div></section>
      <div class="g" style="align-content:start"><section class="panel"><header><h2>Fuentes</h2></header><dl class="defs">${Object.entries(D.tablas).map(([e, t]) => `<dt><i class="punto" style="background:${CE[e]}"></i> ${esc(CORTO[e])}</dt><dd>${esc(D.esquema)}.${esc(t)} · ${f0(inf.n_estudio[D.claves[e]] || 0)} encuestas · carga ${esc(inf.fecha_carga[D.claves[e]] || '—')}</dd>`).join('')}
          <dt>Respuestas hasta</dt><dd>${esc(inf.hasta)}</dd><dt>Procesado</dt><dd>${esc(inf.generado)} · Oracle, solo lectura</dd><dt>Comentarios</dt><dd>${f0(D.n_comentarios)} guardados en total, con datos personales tapados</dd></dl></section>
        <section class="panel"><header><h2>Comentarios del mes</h2><p class="sub">Con contenido → guardados. Mi Claro deja decenas de miles al mes: se guarda una muestra aleatoria fija por pregunta.</p></header>
          <table class="rk"><thead><tr><th>Pregunta</th><th class="num">Con contenido</th><th class="num">Guardados</th></tr></thead><tbody>${Object.entries(inf.comentarios).flatMap(([k, qs]) => Object.entries(qs).map(([q, [u, g]]) => `<tr><td class="nom">${esc(CORTO[PREG.find(x => x.cod === k + ':' + q).estudio])} · ${esc(PREGT[k + ':' + q])}</td><td class="num">${f0(u)}</td><td class="num">${f0(g)}</td></tr>`)).join('')}</tbody></table></section>
        <section class="panel"><header><h2>Definiciones</h2></header><dl class="defs">${KS.map(k => `<dt>${IND[k].corto}</dt><dd>${esc(IND[k].def)}</dd>`).join('')}
          <dt>Mes</dt><dd>Mes de RECORDEDDATE (cuando Qualtrics registró la respuesta), igual que el Power BI.</dd><dt>Unidad</dt><dd>La encuesta (RESPONSEID). Cada indicador usa sus propias respuestas válidas como base.</dd>
          <dt>WhatsApp vs Power BI</dt><dd>El Power BI muestra ~2 % menos encuestas de WhatsApp cada mes (p. ej., oct-26: 27.226 vs 27.783 del exporte de Qualtrics) y no se encontró qué filtro aplica. Aquí entran todas; Mi Claro, E-commerce y Claro Bot cuadran.</dd>
          <dt>IC 95 %</dt><dd>Margen de error por muestreo. Diferencias menores pueden ser ruido.</dd></dl></section></div></div>`;
  p.querySelectorAll('.meses button').forEach(b => b.onclick = () => { fijarMeses([+b.dataset.i]); refrescar(); });
}
function conComentarios() {
  if (st.tab === 'voz') pintarTab({anim: false});
  else repintarCarruseles(document.getElementById('p-' + st.tab));
}
const VISTAS = {resumen: vResumen, app: vApp, wa: vWa, bot: vBot, ecom: vEcom, voz: vVoz, calidad: vCalidad};
function pintarTab(o = {}) {
  const p = document.getElementById('p-' + st.tab);
  VISTAS[st.tab](p, o);
  montarRanking(p); montarCarrusel(p); dibujarLineas(p);
  p.querySelectorAll('[data-ir]').forEach(b => b.onclick = () => irA(b.dataset.ir));
  if (o.anim !== false) G.animar(p);
  if (!C && st.tab !== 'calidad') cargarComentarios();
}

// ------------------------------------------------------------------ descarga de la base (filtros activos)
const dl = document.getElementById('dl'), dlPop = document.getElementById('dl-pop'), dlAbrir = document.getElementById('dl-abrir');
const dlEst = {alcance: 'mes', formato: 'xlsx'};
const slug = t => norm(t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const estDl = () => soloEst() !== undefined ? soloEst() : st.estudio;
const filtrosTxt = () => [estDl() != null ? EST[estDl()] : '', ...MULTI.filter(([k]) => st[k].size).map(([k, et]) => `${et}: ${[...st[k]].map(i => V[k][i]).join(', ')}`)].filter(Boolean).join(' · ') || 'Sin filtros';
function dlPeriodos() { return dlEst.alcance === 'mes' ? st.meses.map(i => PERIODOS[i]) : D.base.periodos; }
function dlNombre() {
  const ps = dlPeriodos(), f = [estDl() != null ? slug(CORTO[EST[estDl()]]) : '', ...MULTI.filter(([k]) => st[k].size).map(([k]) => [...st[k]].map(i => slug(V[k][i])).join('-'))].filter(Boolean);
  return `nps_digital_base_${ps[0]}${ps.length > 1 ? '_a_' + ps[ps.length - 1] : ''}${f.length ? '_' + f.join('_').slice(0, 80) : ''}.${dlEst.formato}`;
}
function pintarDescarga() {
  if (dlPop.hidden) return;
  const n = A(dlEst.alcance === 'mes' ? {estudio: estDl()} : {periodo: null, estudio: estDl()}).n;
  const b0 = dlPop.querySelector('.ir'); if (b0 && b0.dataset.estado === 'trabajando') return;
  dlPop.innerHTML = `<h3>Descargar base de encuestas</h3>
    <div><div class="et-dl">Meses</div><div class="seg" role="group" aria-label="Meses"><button type="button" data-a="mes" aria-pressed="${dlEst.alcance === 'mes'}">${etqMeses(st.meses)}</button><button type="button" data-a="todos" aria-pressed="${dlEst.alcance === 'todos'}">Todos (${mesC(D.base.periodos[0])} a ${mesC(D.base.periodos[D.base.periodos.length - 1])})</button></div></div>
    <div><div class="et-dl">Formato</div><div class="seg" role="group" aria-label="Formato"><button type="button" data-f="xlsx" aria-pressed="${dlEst.formato === 'xlsx'}" title="Libro de Excel (.xlsx)">Excel</button><button type="button" data-f="csv" aria-pressed="${dlEst.formato === 'csv'}" title="Texto separado por punto y coma">CSV</button><button type="button" data-f="parquet" aria-pressed="${dlEst.formato === 'parquet'}" title="Columnar y comprimido, para Python o Power BI">Parquet</button></div></div>
    <div class="resumen-dl"><b>${f0(n)} encuestas</b>${esc(filtrosTxt())}</div>
    <button type="button" class="ir"${n ? '' : ' disabled'}><span>Descargar ${dlEst.formato === 'xlsx' ? 'Excel' : dlEst.formato.toUpperCase()}</span></button>
    <p class="nota" style="margin:0">Una fila por encuesta con indicadores, canal, segmento, módulo y comentarios completos (no la muestra). Sin datos personales: no trae nombre, teléfono, correo, cédula ni cuenta; los comentarios van con [nombre], [#] y [correo] tapados.${n > 100000 ? ' Más de 100.000 filas: Excel puede tardar; CSV o Parquet son más rápidos.' : ''}</p>`;
  dlPop.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { dlEst.alcance = b.dataset.a; pintarDescarga(); });
  dlPop.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { dlEst.formato = b.dataset.f; pintarDescarga(); });
  dlPop.querySelector('.ir').onclick = e => descargarBase(e.currentTarget);
}
const cargarBase = p => new Promise((ok, mal) => {
  if (window.BASE && window.BASE[p]) return ok(window.BASE[p]);
  const sc = document.createElement('script'); sc.src = `base/${p}.js`;
  sc.onload = () => window.BASE && window.BASE[p] ? ok(window.BASE[p]) : mal(new Error(p)); sc.onerror = () => mal(new Error(p));
  document.body.appendChild(sc);
});
const lineaCSV = f => f.map(v => /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v).join(';');
async function descargarBase(btn) {
  if (btn.dataset.estado === 'trabajando') return;
  const txt = btn.querySelector('span'), etq = txt.textContent, aviso = (e, t, p) => { btn.dataset.estado = e; txt.textContent = t; btn.style.setProperty('--p', (p || 0) + '%'); };
  try {
    const cols = D.base.columnas, ci = c => cols.indexOf(c), ps = dlPeriodos(), conds = [];
    if (estDl() != null) { const j = ci(D.base.filtro.estudio), v = EST[estDl()]; conds.push(r => r[j] === v); }
    for (const [k] of MULTI) if (st[k].size) { const j = ci(D.base.filtro[k]), vs = new Set([...st[k]].map(i => V[k][i])); conds.push(r => vs.has(r[j])); }
    const w = EXPORTAR.crear(dlEst.formato, cols);
    let n = 0;
    for (let i = 0; i < ps.length; i++) {
      aviso('trabajando', `Preparando ${Math.round(i / ps.length * 100)} %`, i / ps.length * 100);
      const rows = (await cargarBase(ps[i])).filter(r => conds.every(c => c(r)));
      for (let j = 0; j < rows.length; j += 5000) await w.agregar(rows.slice(j, j + 5000).map(lineaCSV));
      n += rows.length;
    }
    aviso('trabajando', 'Generando archivo…', 100);
    const blob = await w.cerrar(), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = dlNombre(); a.addEventListener('click', e => e.stopPropagation()); a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    aviso('listo', `Listo: ${f0(n)} filas`, 100);
  } catch (e) {
    console.warn(e); aviso('error', 'No se pudo descargar (¿abierto sin servidor?)', 0);
  }
  setTimeout(() => { delete btn.dataset.estado; txt.textContent = etq; btn.style.removeProperty('--p'); }, 3500);
}
dlAbrir.onclick = e => { e.stopPropagation(); const si = dlPop.hidden; dlPop.hidden = !si; dlAbrir.setAttribute('aria-expanded', si); if (si) { pintarDescarga(); const b = dlPop.querySelector('.ir'); if (b) b.focus(); } };
dlPop.addEventListener('click', e => e.stopPropagation());
dl.addEventListener('keydown', e => { if (e.key === 'Escape' && !dlPop.hidden) { dlPop.hidden = true; dlAbrir.setAttribute('aria-expanded', false); dlAbrir.focus(); } });
document.addEventListener('click', e => { const b = dlPop.querySelector('.ir'); if (!dl.contains(e.target) && !dlPop.hidden && !(b && b.dataset.estado === 'trabajando')) { dlPop.hidden = true; dlAbrir.setAttribute('aria-expanded', false); } });

// ------------------------------------------------------------------ tema
const btnTema = document.getElementById('tema');
function pintarTema() {
  const osc = document.documentElement.dataset.theme === 'dark';
  btnTema.innerHTML = svgI(osc ? 'sol' : 'luna') + `<span class="tx">${osc ? 'Modo claro' : 'Modo oscuro'}</span>`;
  btnTema.setAttribute('aria-label', osc ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  btnTema.title = osc ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
}
btnTema.onclick = () => {
  const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = t; try { localStorage.setItem('digital-tema', t); } catch (e) { /* sin almacenamiento */ }
  pintarTema(); pintarTab({anim: false, quieto: true});
};

// ------------------------------------------------------------------ ciclo
function refrescar(o = {}) {
  pintarCtrl(); pintarFiltros();
  if (o.mantener === '__mes') { const b = ctrl.querySelector('#f-per button.sel'); if (b) b.click(); }
  else if (o.mantener) { const b = barF.querySelector(`.pill-f[data-k="${o.mantener}"] button`); if (b) b.click(); }
  pintarNav(); pintarTab(); escribirHash(); pintarDescarga();
}
leerHash();
const ult = PERIODOS[PERIODOS.length - 1];
document.getElementById('actualizado').textContent = D.generado.slice(0, 10).split('-').reverse().join('/');
document.getElementById('sello').textContent = `${mesC(PERIODOS[0])}${PERIODOS.length > 1 ? ' a ' + mesC(ult) : ''} · ${f0(PERIODOS.reduce((s, p) => s + D.periodos[p].n, 0))} encuestas`;
pintarTema(); refrescar();
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => {
  const h = document.documentElement; h.setAttribute('data-sin-anim', '');
  dibujarLineas(document.getElementById('p-' + st.tab));
  if (st.tab === 'voz' && nubeEl.isConnected && Math.abs(nubeEl.clientWidth - exEst.ancho) > 8) montarNube(true);
  h.removeAttribute('data-sin-anim'); }, 150); });
addEventListener('hashchange', () => { leerHash(); refrescar(); });
addEventListener('beforeprint', () => { if (st.tab === 'voz' && nubeEl.isConnected) montarNube(true); });
})();
