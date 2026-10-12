/* ============================================================
   GRUPO BOLBAITE — Botón flotante de WhatsApp
   · Fijo en la esquina inferior derecha de todas las páginas
   · Se puede arrastrar en vertical por el lateral derecho
   · La posición elegida se recuerda en el navegador (localStorage)
   ============================================================ */
(function () {
  'use strict';

  var TELEFONO = '34627906802'; // +34 627 906 802
  var CLAVE_POSICION = 'bolbaite-wa-bottom';
  var MARGEN = 12;          // separación mínima respecto a los bordes
  var UMBRAL_ARRASTRE = 6;  // px de movimiento para contar como arrastre y no como clic

  /* ---------- Estilos ---------- */
  var estilo = document.createElement('style');
  estilo.textContent = [
    '.wa-flotante{',
    '  position:fixed;right:14px;bottom:14px;z-index:2000;',
    '  width:46px;height:46px;display:flex;align-items:center;justify-content:center;',
    '  background:#25d366;border-radius:50%;',
    '  box-shadow:0 4px 14px rgba(0,0,0,.28);',
    '  transition:transform .18s ease,box-shadow .18s ease;',
    '  touch-action:none;cursor:grab;-webkit-tap-highlight-color:transparent;',
    '}',
    '.wa-flotante svg{width:24px;height:24px;fill:#fff;pointer-events:none;}',
    '.wa-flotante:hover{transform:scale(1.08);box-shadow:0 6px 18px rgba(0,0,0,.32);}',
    '.wa-flotante:active{cursor:grabbing;transition:none;}',
    '.wa-flotante-etiqueta{',
    '  position:absolute;right:56px;top:50%;transform:translateY(-50%);',
    '  background:#fff;color:#3a3a3a;',
    "  font:600 .78rem 'Arimo',Arial,Helvetica,sans-serif;",
    '  padding:.35rem .65rem;border-radius:6px;white-space:nowrap;',
    '  box-shadow:0 2px 8px rgba(0,0,0,.18);',
    '  opacity:0;visibility:hidden;transition:opacity .18s ease;',
    '  pointer-events:none;',
    '}',
    '.wa-flotante:hover .wa-flotante-etiqueta,.wa-flotante:focus-visible .wa-flotante-etiqueta{opacity:1;visibility:visible;}',
    '@media (max-width:640px){.wa-flotante{width:42px;height:42px;}.wa-flotante svg{width:22px;height:22px;}.wa-flotante-etiqueta{display:none;}}'
  ].join('\n');
  document.head.appendChild(estilo);

  /* ---------- Botón ---------- */
  var boton = document.createElement('a');
  boton.className = 'wa-flotante';
  boton.href = 'https://wa.me/' + TELEFONO;
  boton.target = '_blank';
  boton.rel = 'noopener';
  boton.setAttribute('aria-label', 'Escríbenos por WhatsApp');
  boton.title = 'Escríbenos por WhatsApp';
  boton.innerHTML =
    '<svg viewBox="0 0 448 512" aria-hidden="true" focusable="false">' +
    '<path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>' +
    '</svg>' +
    '<span class="wa-flotante-etiqueta">¿Hablamos?</span>';
  document.body.appendChild(boton);

  /* ---------- Posición: restaurar, fijar y recordar ---------- */
  function alturaBoton() { return boton.offsetHeight || 46; }

  function limitarBottom(valor) {
    var maximo = window.innerHeight - alturaBoton() - MARGEN;
    return Math.min(Math.max(valor, MARGEN), Math.max(maximo, MARGEN));
  }

  function fijarBottom(valor) {
    boton.style.top = 'auto';
    boton.style.bottom = limitarBottom(valor) + 'px';
  }

  function guardarBottom(valor) {
    try { localStorage.setItem(CLAVE_POSICION, String(Math.round(valor))); } catch (e) { /* sin almacenamiento */ }
  }

  try {
    var guardada = parseFloat(localStorage.getItem(CLAVE_POSICION));
    if (Number.isFinite(guardada)) fijarBottom(guardada);
  } catch (e) { /* sin almacenamiento */ }

  window.addEventListener('resize', function () {
    var actual = parseFloat(boton.style.bottom);
    if (Number.isFinite(actual)) fijarBottom(actual);
  });

  /* ---------- Arrastre en vertical por el lateral derecho ---------- */
  var arrastrando = false;
  var movido = false;
  var yInicio = 0;
  var bottomInicio = 0;

  boton.addEventListener('dragstart', function (e) { e.preventDefault(); });

  boton.addEventListener('pointerdown', function (e) {
    if (e.button !== undefined && e.button !== 0) return; // solo botón principal o dedo
    arrastrando = true;
    movido = false;
    yInicio = e.clientY;
    bottomInicio = parseFloat(boton.style.bottom) || parseFloat(getComputedStyle(boton).bottom) || 14;
    try { boton.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
    e.preventDefault(); // evita seleccionar texto o iniciar el arrastre nativo del enlace
  });

  boton.addEventListener('pointermove', function (e) {
    if (!arrastrando) return;
    var dy = e.clientY - yInicio;
    if (!movido && Math.abs(dy) < UMBRAL_ARRASTRE) return;
    movido = true;
    fijarBottom(bottomInicio - dy); // arrastrar hacia arriba sube el botón
  });

  function soltar() {
    if (!arrastrando) return;
    arrastrando = false;
    if (movido) guardarBottom(parseFloat(boton.style.bottom));
  }

  boton.addEventListener('pointerup', soltar);
  boton.addEventListener('pointercancel', function () { arrastrando = false; });

  // Si se arrastró, el "clic" no debe abrir el chat
  boton.addEventListener('click', function (e) {
    if (movido) {
      e.preventDefault();
      movido = false;
    }
  });
})();
