/* ============================================================
   GRUPO BOLBAITE — Intranet demo · Utilidades de interfaz
   Formatos en español, chips de estado, pestañas, gráficas
   (Chart.js con aviso si no carga) y persistencia de órdenes.
   ============================================================ */
(function () {
  'use strict';

  const C = window.BolbaiteCalculos;
  const CLAVE_ORDENES = 'bolbaite-demo-ordenes';
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  /* ---------- Formatos ---------- */

  const num = (n, dec = 0) => C.numero(n, dec);
  const eur = (n, dec = 0) => C.numero(n, dec) + ' €';
  const pct = (r, dec = 0) => C.numero(r * 100, dec) + ' %';
  const fecha = d => (d ? C.fechaCorta(d) : '—');

  function mesCorto(clave) {
    const [a, m] = clave.split('-');
    return MESES[Number(m) - 1] + ' ' + a.slice(2);
  }

  function meses(n) {
    if (n === null || n === undefined || Number.isNaN(n)) return '—';
    if (!Number.isFinite(n)) return 'sin ventas';
    if (n >= 24) return C.numero(n / 12, 1) + ' años';
    return C.numero(n, 1) + (n === 1 ? ' mes' : ' meses');
  }

  function esc(texto) {
    return String(texto).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function delta(r) {
    if (r === null || r === undefined || Number.isNaN(r)) return '<span class="delta-igual">—</span>';
    if (Math.abs(r) < 0.005) return '<span class="delta-igual">= 0 %</span>';
    const sube = r > 0;
    return `<span class="${sube ? 'delta-sube' : 'delta-baja'}">${sube ? '▲' : '▼'} ${C.numero(Math.abs(r) * 100)} %</span>`;
  }

  /* ---------- Estados: color + icono + texto ---------- */

  const ESTADOS = {
    material: {
      ok: ['ok', '✓', 'Suficiente'],
      aviso: ['serio', '!', 'Queda < 50 %'],
      critico: ['critico', '✕', 'Queda < 20 %'],
      falta: ['critico', '✕', 'Falta material'],
    },
    venta: {
      ok: ['ok', '✓', 'Rápida'],
      aviso: ['serio', '!', 'Lenta'],
      critico: ['critico', '✕', 'Muy lenta'],
    },
    cobertura: {
      rotura: ['critico', '▼', 'Riesgo de rotura'],
      bajo: ['serio', '▼', 'Bajo'],
      correcto: ['ok', '✓', 'Correcto'],
      alto: ['aviso', '▲', 'Alto'],
      sobrestock: ['critico', '▲', 'Sobrestock'],
      'sin-datos': ['neutro', '–', 'Sin ventas'],
    },
    alerta: {
      ok: ['ok', '✓', 'Sin alertas'],
      aviso: ['serio', '!', 'Aviso'],
      critico: ['critico', '✕', 'Crítico'],
    },
    pedido: {
      retrasado: ['critico', '!', 'Retrasado'],
      'esta-semana': ['serio', '●', 'Esta semana'],
      proximas: ['neutro', '→', 'Próximas 2 semanas'],
    },
    muestra: {
      pendiente: ['neutro', '…', 'Pendiente'],
      'sin-feedback': ['serio', '!', 'Sin feedback'],
      positivo: ['ok', '✓', 'Positivo'],
      negativo: ['critico', '✕', 'Negativo'],
      pedido: ['ok', '★', 'Pedido'],
    },
  };

  function chip(contexto, estado, texto) {
    const def = (ESTADOS[contexto] || {})[estado] || ['neutro', '–', estado];
    return `<span class="estado estado-${def[0]}"><i aria-hidden="true">${def[1]}</i>${esc(texto || def[2])}</span>`;
  }

  const COLORES = {
    serie1: '#2a78d6',
    serie2: '#eb6834',
    serie3: '#1baf7a',
    gris: '#b9b8b1',
    tinta: '#555351',
    tinta3: '#85837d',
    rejilla: '#ececf0',
    ok: '#0ca30c',
    aviso: '#fab219',
    serio: '#ec835a',
    critico: '#d03b3b',
    neutro: '#b9b8b1',
  };

  function colorEstado(contexto, estado) {
    const def = (ESTADOS[contexto] || {})[estado];
    return def ? COLORES[def[0]] : COLORES.neutro;
  }

  /* ---------- Datos de la demo y órdenes guardadas ---------- */

  let ordenesEnMemoria = null; // respaldo si localStorage no está disponible

  function cargarOrdenes() {
    try {
      const crudo = localStorage.getItem(CLAVE_ORDENES);
      const lista = crudo ? JSON.parse(crudo) : [];
      return lista
        .filter(o => o && Array.isArray(o.lineas))
        .map(o => ({ ...o, fecha: new Date(o.fecha) }));
    } catch (e) {
      return ordenesEnMemoria || [];
    }
  }

  function guardarOrdenes(lista) {
    ordenesEnMemoria = lista;
    try {
      localStorage.setItem(CLAVE_ORDENES, JSON.stringify(lista));
      return true;
    } catch (e) {
      return false;
    }
  }

  function reiniciarDemo() {
    ordenesEnMemoria = [];
    try { localStorage.removeItem(CLAVE_ORDENES); } catch (e) { /* sin persistencia */ }
  }

  function datosDemo() {
    const datos = window.BolbaiteDatos.generarDatosDemo({ hoy: new Date() });
    datos.ordenes = cargarOrdenes();
    return datos;
  }

  /* ---------- Cabecera, pestañas y avisos ---------- */

  function iniciarCabecera(datos) {
    document.querySelectorAll('[data-hoy]').forEach(el => { el.textContent = fecha(datos.hoy); });
    document.querySelectorAll('[data-reiniciar]').forEach(btn => btn.addEventListener('click', () => {
      if (window.confirm('¿Reiniciar la demo? Se borrarán las órdenes de fabricación confirmadas.')) {
        reiniciarDemo();
        window.location.reload();
      }
    }));
  }

  function iniciarPestanas(alCambiar) {
    const pestanas = [...document.querySelectorAll('.pestana')];
    function activar(id) {
      pestanas.forEach(p => {
        const activa = p.dataset.panel === id;
        p.setAttribute('aria-selected', String(activa));
        p.tabIndex = activa ? 0 : -1;
        document.getElementById('panel-' + p.dataset.panel).hidden = !activa;
      });
      try { history.replaceState(null, '', '#' + id); } catch (e) { /* file:// sin historial */ }
      if (alCambiar) alCambiar(id);
    }
    pestanas.forEach((p, i) => {
      p.addEventListener('click', () => activar(p.dataset.panel));
      p.addEventListener('keydown', ev => {
        if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
        const siguiente = pestanas[(i + (ev.key === 'ArrowRight' ? 1 : pestanas.length - 1)) % pestanas.length];
        siguiente.focus();
        activar(siguiente.dataset.panel);
      });
    });
    const inicial = window.location.hash.slice(1);
    activar(pestanas.some(p => p.dataset.panel === inicial) ? inicial : pestanas[0].dataset.panel);
    return activar;
  }

  function segmentado(contenedor, valorInicial, alCambiar) {
    const botones = [...contenedor.querySelectorAll('button')];
    function marcar(valor) {
      botones.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.valor === String(valor))));
    }
    botones.forEach(b => b.addEventListener('click', () => { marcar(b.dataset.valor); alCambiar(b.dataset.valor); }));
    marcar(valorInicial);
    return marcar;
  }

  let temporizadorAviso = null;
  function aviso(texto) {
    let el = document.getElementById('avisoToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'avisoToast';
      el.className = 'aviso-toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = texto;
    el.classList.add('visible');
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => el.classList.remove('visible'), 3800);
  }

  /* ---------- Gráficas ---------- */

  const hayChart = typeof window.Chart !== 'undefined';
  if (hayChart) {
    const Ch = window.Chart;
    Ch.defaults.font.family = "'Arimo', Arial, Helvetica, sans-serif";
    Ch.defaults.font.size = 12;
    Ch.defaults.color = COLORES.tinta;
    Ch.defaults.borderColor = COLORES.rejilla;
    Ch.defaults.animation.duration = 350;
    Ch.defaults.maintainAspectRatio = false;
    Ch.defaults.plugins.legend.display = false;
    Ch.defaults.plugins.tooltip.backgroundColor = '#292929';
    Ch.defaults.plugins.tooltip.padding = 10;
    Ch.defaults.plugins.tooltip.cornerRadius = 8;
    Ch.defaults.plugins.tooltip.titleFont = { weight: '700' };
    Ch.defaults.plugins.tooltip.boxPadding = 4;
  }

  function grafica(idCanvas, config) {
    const canvas = document.getElementById(idCanvas);
    if (!canvas) return null;
    if (!hayChart) {
      canvas.outerHTML = '<div class="grafica-sin-conexion">Gráfica no disponible sin conexión.</div>';
      return null;
    }
    // Libera las gráficas cuyo canvas ya no está en la página (se re-renderizó su contenedor):
    // si no, Chart.js las mantiene vivas y escuchando cambios del documento.
    Object.values(window.Chart.instances).forEach(g => { if (!g.canvas || !g.canvas.isConnected) g.destroy(); });
    const existente = window.Chart.getChart(canvas);
    if (existente) existente.destroy();
    return new window.Chart(canvas, config);
  }

  // Tabla equivalente de una gráfica, dentro de un desplegable que conserva su estado.
  function tablaDatos(idContenedor, cabeceras, filas, titulo = 'Ver datos en tabla') {
    const cont = document.getElementById(idContenedor);
    if (!cont) return;
    const previo = cont.querySelector('details');
    const abierto = previo ? previo.open : !hayChart;
    cont.innerHTML = `<details class="ver-datos"${abierto ? ' open' : ''}><summary>${esc(titulo)}</summary>
      <div class="tabla-scroll"><table class="tabla"><thead><tr>${cabeceras.map((c, i) => `<th${i ? ' class="num"' : ''}>${esc(c)}</th>`).join('')}</tr></thead>
      <tbody>${filas.map(f => `<tr>${f.map((v, i) => `<td${i ? ' class="num"' : ''}>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
  }

  window.BolbaiteUI = {
    num, eur, pct, fecha, mesCorto, meses, esc, delta, chip, colorEstado, COLORES, ESTADOS,
    cargarOrdenes, guardarOrdenes, reiniciarDemo, datosDemo,
    iniciarCabecera, iniciarPestanas, segmentado, aviso, grafica, tablaDatos, hayChart,
  };
})();
