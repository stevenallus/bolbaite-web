/* ============================================================
   GRUPO BOLBAITE — Intranet demo · Producción
   Planificador de órdenes (materiales, máquinas, costes, tiempo
   de venta y compra) y BI de stock / ventas por familia.
   ============================================================ */
(function () {
  'use strict';

  const C = window.BolbaiteCalculos;
  const U = window.BolbaiteUI;
  const { eur, num, esc, chip, meses, COLORES } = U;

  const datos = U.datosDemo();
  const productos = C.mapa(datos.productos);
  const familias = C.mapa(datos.familias);
  const propios = datos.productos.filter(p => p.escandallo);
  const ORDEN_FAMILIAS = datos.familias.filter(f => f.tipo === 'propia').map(f => f.id);
  const NOMBRE_BASE = { 3: '3 meses', 6: '6 meses', 12: 'último año', 36: '3 años' };

  const estado = {
    orden: [],          // [{ productoId, cantidad }]
    baseOrden: 6,
    baseBi: 12,
    filtro: '',
    familiaDetalle: null,
    tendencia: null,
  };

  const $ = id => document.getElementById(id);

  function cantidadMaterial(n, unidad) {
    return num(n, unidad !== 'uds' && Math.abs(n) < 100 ? 1 : 0) + ' ' + unidad;
  }

  // Solo cantidades enteras y positivas cuentan para la orden.
  function cantidadOk(valor) {
    const n = Number(valor);
    return Number.isInteger(n) && n > 0;
  }

  function enFabricacion(id) {
    return C.unidadesEnFabricacion(datos, id);
  }

  function coberturaProducto(id, base) {
    const p = productos.get(id);
    const media = C.ventaMediaMensual(datos, id, base);
    const cob = C.cobertura(p.stock + enFabricacion(id), media);
    return { media, cob, estado: C.estadoCobertura(cob) };
  }

  /* =================== PLANIFICADOR =================== */

  function renderLista() {
    const texto = estado.filtro.trim().toLowerCase();
    const enOrden = new Set(estado.orden.map(l => l.productoId));
    const grupos = ORDEN_FAMILIAS.map(famId => {
      const fam = familias.get(famId);
      const items = propios.filter(p => p.familiaId === famId && (!texto ||
        (p.ref + ' ' + p.nombre + ' ' + fam.nombre).toLowerCase().includes(texto)));
      if (!items.length) return '';
      return `<div class="grupo-familia"><h3><span>${esc(fam.nombre)}</span><span>${items.length}</span></h3>
        ${items.map(p => {
          const c = coberturaProducto(p.id, estado.baseOrden);
          const fab = enFabricacion(p.id);
          return `<div class="item-ref${enOrden.has(p.id) ? ' en-orden' : ''}">
            <div class="item-ref-texto">
              <b>${esc(p.ref)}</b><span title="${esc(p.nombre)}">${esc(p.nombre)}</span>
              <div class="item-ref-datos">Stock ${num(p.stock)}${fab ? ` · +${num(fab)} en fabr.` : ''} · ${meses(c.cob)} ${chip('cobertura', c.estado)}</div>
            </div>
            <button type="button" class="btn btn-mini btn-fabricar" data-fabricar="${esc(p.id)}" aria-label="Fabricar ${esc(p.nombre)}">${enOrden.has(p.id) ? 'En orden' : 'Fabricar'}</button>
          </div>`;
        }).join('')}</div>`;
    }).join('');
    $('listaReferencias').innerHTML = grupos || '<p class="vacio">Ninguna referencia coincide con la búsqueda.</p>';
  }

  function anadirLinea(productoId) {
    const existente = estado.orden.findIndex(l => l.productoId === productoId);
    if (existente === -1) {
      const sugerida = C.cantidadSugerida(datos, productoId, 3, estado.baseOrden);
      estado.orden.push({ productoId, cantidad: sugerida > 0 ? Math.ceil(sugerida / 10) * 10 : 100 });
    }
    renderOrden();
    renderLista();
    const fila = document.querySelector(`[data-linea="${CSS.escape(productoId)}"]`);
    if (fila) {
      fila.classList.remove('destello');
      void fila.offsetWidth;
      fila.classList.add('destello');
      const input = fila.querySelector('input');
      if (input) input.focus({ preventScroll: true });
      fila.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function renderOrden() {
    const cont = $('ordenLineas');
    if (!estado.orden.length) {
      cont.innerHTML = '<p class="tarjeta-sub">Todavía no hay referencias en la orden.</p>';
    } else {
      cont.innerHTML = estado.orden.map(l => {
        const p = productos.get(l.productoId);
        const c = coberturaProducto(p.id, estado.baseOrden);
        const s3 = C.cantidadSugerida(datos, p.id, 3, estado.baseOrden);
        const s6 = C.cantidadSugerida(datos, p.id, 6, estado.baseOrden);
        const valida = cantidadOk(l.cantidad);
        return `<div class="linea-orden" data-linea="${esc(p.id)}">
          <div class="linea-ref"><b>${esc(p.ref)}</b><small>${esc(p.nombre)}</small></div>
          <div class="linea-datos">Stock <b>${num(p.stock)}</b>${enFabricacion(p.id) ? ` + ${num(enFabricacion(p.id))} en fabr.` : ''}<br>Venta <b>${num(c.media, c.media < 10 ? 1 : 0)}</b>/mes (${NOMBRE_BASE[estado.baseOrden]})</div>
          <label class="entrada-cantidad${valida ? '' : ' invalida'}">
            <span class="sr-only">Cantidad a fabricar de ${esc(p.ref)}</span>
            <input type="number" min="0" step="1" inputmode="numeric" value="${esc(l.cantidad)}" data-cantidad="${esc(p.id)}">
            <span>uds</span>
          </label>
          <div class="atajos">
            <button type="button" class="btn btn-secundario btn-mini" data-atajo="${esc(p.id)}" data-valor="${s3}" title="Venta media × 3 − stock − en fabricación">Cubrir 3 m · ${num(s3)}</button>
            <button type="button" class="btn btn-secundario btn-mini" data-atajo="${esc(p.id)}" data-valor="${s6}" title="Venta media × 6 − stock − en fabricación">Cubrir 6 m · ${num(s6)}</button>
          </div>
          <button type="button" class="btn btn-icono" data-quitar="${esc(p.id)}" aria-label="Quitar ${esc(p.ref)} de la orden" title="Quitar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          ${s3 === 0 ? '<p class="tarjeta-sub" style="grid-column:1/-1">Con el stock actual ya se cubren más de 3 meses de venta: no haría falta fabricar.</p>' : ''}
        </div>`;
      }).join('');
    }
    renderResultados();
  }

  function lineasValidas() {
    return estado.orden.filter(l => cantidadOk(l.cantidad)).map(l => ({ productoId: l.productoId, cantidad: Number(l.cantidad) }));
  }

  function renderResultados() {
    const validas = lineasValidas();
    const hayLineas = estado.orden.length > 0;
    $('ordenAcciones').hidden = !hayLineas;
    $('btnConfirmar').disabled = !validas.length;
    $('planVacio').hidden = validas.length > 0;
    $('planResultados').hidden = !validas.length;
    if (hayLineas && !validas.length) {
      $('planVacio').innerHTML = '<strong>Introduce una cantidad entera mayor que 0</strong> en alguna línea para calcular la orden.';
    } else if (!hayLineas) {
      $('planVacio').innerHTML = '<strong>La orden está vacía.</strong><br>Pulsa <b>Fabricar</b> en una referencia (por ejemplo, el disco de sisal Ø200) para ver materiales, máquinas, costes y tiempo de venta.';
    }
    const unidades = validas.reduce((t, l) => t + l.cantidad, 0);
    $('ordenResumen').innerHTML = `${estado.orden.length} referencia${estado.orden.length === 1 ? '' : 's'} · <b>${num(unidades)} uds</b>`;
    if (!validas.length) return;

    const r = C.resumenOrden(datos, validas);
    renderKpisOrden(r, validas);
    renderMensajeVenta(validas);
    renderMateriales(r.materiales);
    renderMaquinas(r);
    renderCostes(r);
    renderVenta(validas);
  }

  function renderKpisOrden(r, validas) {
    const faltan = r.materiales.filter(m => m.estado === 'falta').length;
    const criticos = r.materiales.filter(m => m.estado === 'critico').length;
    const estadoMat = faltan ? chip('material', 'falta', `Faltan ${faltan}`) : criticos ? chip('material', 'critico', `${criticos} bajo 20 %`) : chip('material', 'ok', 'Hay material');
    $('kpisOrden').innerHTML = `
      <div class="kpi kpi-marca"><div class="kpi-nombre">Coste total</div><div class="kpi-valor">${eur(r.total)}</div><div class="kpi-detalle">${eur(r.total / r.unidades, 2)} por unidad de media</div></div>
      <div class="kpi"><div class="kpi-nombre">Horas de máquina</div><div class="kpi-valor">${num(r.horas, 1)} h</div><div class="kpi-detalle">${r.maquinas.length} máquinas · ${validas.length} referencia${validas.length === 1 ? '' : 's'}</div></div>
      <div class="kpi"><div class="kpi-nombre">Plazo estimado</div><div class="kpi-valor">${num(Math.max(r.plazoJornadas, 0.1), 1)} jornadas</div><div class="kpi-detalle">Cuello de botella: ${esc(r.cuelloBotella || '—')}</div></div>
      <div class="kpi"><div class="kpi-nombre">Materias primas</div><div class="kpi-valor">${r.materiales.length} refs.</div><div class="kpi-detalle">${estadoMat}</div></div>`;
  }

  function tiemposVenta(linea) {
    const p = productos.get(linea.productoId);
    const total = p.stock + enFabricacion(p.id) + linea.cantidad;
    return [3, 6, 12, 36].map(base => {
      const media = C.ventaMediaMensual(datos, p.id, base);
      const soloOrden = C.mesesParaVender(linea.cantidad, media);
      const conStock = C.mesesParaVender(total, media);
      return { base, media, soloOrden, conStock };
    });
  }

  // El mensaje se basa en "stock + orden": es lo que de verdad hay que vender antes de agotar lo fabricado.
  function renderMensajeVenta(validas) {
    const anual = validas.map(l => ({ l, t: tiemposVenta(l).find(x => x.base === 12) }));
    const peor = anual.reduce((a, b) => (b.t.conStock > a.t.conStock ? b : a));
    const est = C.estadoTiempoVenta(peor.t.conStock);
    const p = productos.get(peor.l.productoId);
    const el = $('mensajeVenta');
    el.className = 'mensaje-venta ' + (est === 'ok' ? 'ok' : est === 'aviso' ? 'serio' : 'critico');
    if (est === 'ok') {
      el.innerHTML = `<span class="icono" aria-hidden="true">✓</span><div>Con la media del último año, <strong>todo lo fabricado se vende en ${meses(peor.t.conStock)} o menos</strong>, contando el stock actual. Fabricación alineada con la demanda.</div>`;
      return;
    }
    if (!Number.isFinite(peor.t.conStock)) {
      el.innerHTML = `<span class="icono" aria-hidden="true">✕</span><div><strong>${esc(p.nombre)} no tiene ventas en el último año.</strong> Fabricar ${num(peor.l.cantidad)} uds solo aumentaría el stock parado.</div>`;
      return;
    }
    const stockPrevio = p.stock + enFabricacion(p.id);
    const s6 = C.cantidadSugerida(datos, p.id, 6, 12);
    const consejo = s6 > 0 ? `Para cubrir 6 meses bastarían <strong>${num(s6)} uds</strong>.` : 'Con el stock actual ya hay venta para más de 6 meses: <strong>no haría falta fabricar</strong>.';
    el.innerHTML = `<span class="icono" aria-hidden="true">${est === 'aviso' ? '!' : '✕'}</span><div>Con la media del último año, las <strong>${num(peor.l.cantidad)} uds de ${esc(p.nombre)}</strong> tardarían ${meses(peor.t.soloOrden)} en venderse y, sumando el stock actual (${num(stockPrevio)} uds), <strong>${meses(peor.t.conStock)}</strong>. ${consejo}</div>`;
  }

  const ORDEN_ESTADO_MAT = { falta: 0, critico: 1, aviso: 2, ok: 3 };

  function renderMateriales(materiales) {
    const lista = [...materiales].sort((a, b) => ORDEN_ESTADO_MAT[a.estado] - ORDEN_ESTADO_MAT[b.estado] || b.coste - a.coste);
    const colores = { ok: COLORES.ok, aviso: COLORES.serio, critico: COLORES.critico, falta: COLORES.critico };
    const faltan = lista.filter(m => m.estado === 'falta').length;
    $('resumenMateriales').innerHTML = faltan
      ? chip('material', 'falta', `${faltan} material${faltan === 1 ? '' : 'es'} sin stock suficiente`)
      : chip('material', 'ok', 'Stock suficiente para la orden');
    const filas = lista.map(m => {
      const pct = Math.max(0, Math.min(1, m.pct));
      const usado = m.usadoPor.map(id => productos.get(id).ref).join(', ');
      const texto = m.estado === 'falta'
        ? `<b>Faltan ${cantidadMaterial(-m.quedaria, m.unidad)}</b>`
        : `Quedaría <b>${num(pct * 100)} %</b>`;
      return `<div class="fila-material">
        <div class="material-cabecera">
          <div class="material-nombre"><b>${esc(m.nombre)}</b><small>Usado por ${esc(usado)}</small>${m.stock < 0 ? `<small class="aviso-comprometido">Las órdenes ya confirmadas dejan un déficit de ${cantidadMaterial(-m.stock, m.unidad)}</small>` : ''}</div>
          <div class="valor"><small>Necesario</small>${cantidadMaterial(m.necesario, m.unidad)}</div>
          <div class="valor"><small>Stock disponible</small>${cantidadMaterial(Math.max(0, m.stock), m.unidad)}</div>
          <div class="valor"><small>Quedaría</small>${cantidadMaterial(m.quedaria, m.unidad)}</div>
          <div class="valor"><small>Coste</small>${eur(m.coste, m.coste < 100 ? 2 : 0)}</div>
        </div>
        <div class="barra-material">
          <div class="barra-pista${m.estado === 'falta' ? ' falta' : ''}" role="img" aria-label="${esc(m.nombre)}: ${m.estado === 'falta' ? 'falta material' : 'quedaría el ' + num(pct * 100) + ' %'}">
            <div class="barra-relleno" style="width:${(pct * 100).toFixed(1)}%;background:${colores[m.estado]}"></div>
          </div>
          <span class="barra-texto">${texto}</span>
          ${chip('material', m.estado)}
        </div>
      </div>`;
    }).join('');

    const compra = C.propuestaCompra(materiales);
    const bloqueCompra = compra.length ? `
      <div class="pila-margen">
        <h3 class="tarjeta-titulo">Propuesta de compra</h3>
        <p class="tarjeta-sub">Cantidad para que, tras fabricar, quede al menos el 50 % del stock actual</p>
        <div class="tabla-scroll"><table class="tabla">
          <thead><tr><th>Material</th><th>Motivo</th><th class="num">Comprar</th><th class="num">Coste estimado</th></tr></thead>
          <tbody>${compra.map(c => `<tr><td>${esc(c.nombre)}</td><td>${chip('material', c.motivo)}</td><td class="num">${cantidadMaterial(c.comprar, c.unidad)}</td><td class="num">${eur(c.coste, c.coste < 100 ? 2 : 0)}</td></tr>`).join('')}</tbody>
          <tfoot><tr><td colspan="3">Total compra propuesta</td><td class="num">${eur(compra.reduce((t, c) => t + c.coste, 0))}</td></tr></tfoot>
        </table></div>
      </div>` : '';

    $('tablaMateriales').innerHTML = `
      <div class="material-cabecera cabecera-columnas"><span>Material</span><span>Necesario</span><span>Stock disponible</span><span>Quedaría</span><span>Coste</span></div>
      ${filas}${bloqueCompra}`;
  }

  function renderMaquinas(r) {
    const lista = [...r.maquinas].sort((a, b) => b.horas - a.horas);
    const tot = campo => lista.reduce((t, m) => t + m[campo], 0);
    $('tablaMaquinas').innerHTML = `<div class="tabla-scroll"><table class="tabla">
      <thead><tr><th>Máquina</th><th class="num" title="Horas de preparación">Prep.</th><th class="num" title="Horas de producción">Prod.</th><th class="num">Horas</th><th class="num">Oper.</th><th class="num">€ máquina</th><th class="num">€ mano obra</th><th class="num">€ total</th></tr></thead>
      <tbody>${lista.map(m => `<tr>
        <td><b>${esc(m.nombre)}</b>${m.nombre === r.cuelloBotella && lista.length > 1 ? '<span class="etiqueta-cuello">cuello de botella</span>' : ''}<br><small class="tarjeta-sub">${esc(m.usadoPor.map(id => productos.get(id).ref).join(', '))}</small></td>
        <td class="num">${num(m.horasPreparacion, 1)} h</td>
        <td class="num">${num(m.horasProduccion, 1)} h</td>
        <td class="num"><b>${num(m.horas, 1)} h</b></td>
        <td class="num">${num(m.operarios, m.operarios % 1 ? 1 : 0)}</td>
        <td class="num">${eur(m.costeMaquina)}</td>
        <td class="num">${eur(m.costeManoObra)}</td>
        <td class="num"><b>${eur(m.costeMaquina + m.costeManoObra)}</b></td>
      </tr>`).join('')}</tbody>
      <tfoot><tr><td>Total · plazo ${num(Math.max(r.plazoJornadas, 0.1), 1)} jornadas</td><td class="num">${num(tot('horasPreparacion'), 1)} h</td><td class="num">${num(tot('horasProduccion'), 1)} h</td><td class="num">${num(r.horas, 1)} h</td><td></td><td class="num">${eur(r.costeMaquina)}</td><td class="num">${eur(r.costeManoObra)}</td><td class="num">${eur(r.costeMaquina + r.costeManoObra)}</td></tr></tfoot>
    </table></div>`;
  }

  function renderCostes(r) {
    const partes = [
      ['Materiales', r.costeMateriales, COLORES.serie1],
      ['Máquina', r.costeMaquina, COLORES.serie2],
      ['Mano de obra', r.costeManoObra, COLORES.serie3],
    ];
    $('composicionCostes').innerHTML = `<div class="rejilla-kpis">
        ${partes.map(([n, v]) => `<div class="kpi"><div class="kpi-nombre">${n}</div><div class="kpi-valor">${eur(v)}</div><div class="kpi-detalle">${num(r.total ? v / r.total * 100 : 0)} % del total</div></div>`).join('')}
        <div class="kpi kpi-marca"><div class="kpi-nombre">Total orden</div><div class="kpi-valor">${eur(r.total)}</div><div class="kpi-detalle">${num(r.horas, 1)} h de máquina</div></div>
      </div>
      <div class="composicion">
        <div class="composicion-barra" role="img" aria-label="Reparto del coste: ${partes.map(([n, v]) => `${n} ${num(r.total ? v / r.total * 100 : 0)} %`).join(', ')}">
          ${partes.map(([n, v, c]) => `<span style="width:${r.total ? (v / r.total * 100).toFixed(2) : 0}%;background:${c}" title="${n}: ${eur(v)}"></span>`).join('')}
        </div>
        <div class="leyenda">${partes.map(([n, v, c]) => `<span><i style="background:${c}"></i>${n} · ${eur(v)}</span>`).join('')}</div>
      </div>`;
    $('tablaCostes').innerHTML = `<div class="tabla-scroll"><table class="tabla">
      <thead><tr><th>Referencia</th><th class="num">Cantidad</th><th class="num">Horas</th><th class="num">Coste total</th><th class="num">Coste / ud</th><th class="num">Precio venta</th><th class="num">Margen / ud</th></tr></thead>
      <tbody>${r.lineas.map(l => {
        const p = productos.get(l.productoId);
        const margen = (p.precioVenta - l.costeUnidad) / p.precioVenta;
        return `<tr><td class="celda-principal"><b>${esc(p.ref)}</b><small>${esc(p.nombre)}</small></td>
          <td class="num">${num(l.cantidad)}</td><td class="num">${num(l.horas, 1)} h</td><td class="num">${eur(l.coste)}</td>
          <td class="num"><b>${eur(l.costeUnidad, 2)}</b></td><td class="num">${eur(p.precioVenta, 2)}</td>
          <td class="num ${margen < 0.2 ? 'margen-bajo' : ''}">${eur(p.precioVenta - l.costeUnidad, 2)} · ${num(margen * 100)} %</td></tr>`;
      }).join('')}</tbody>
    </table></div>`;
  }

  function celdaMeses(m) {
    const est = C.estadoTiempoVenta(m);
    return `<span class="celda-meses"><b>${meses(m)}</b>${chip('venta', est)}</span>`;
  }

  function renderVenta(validas) {
    const filas = validas.map(l => {
      const p = productos.get(l.productoId);
      const t = tiemposVenta(l);
      const total = p.stock + enFabricacion(p.id) + l.cantidad;
      return `<tr class="fila-ref"><td colspan="5"><b>${esc(p.ref)}</b> · ${esc(p.nombre)}</td></tr>
        <tr><td class="escenario">Venta media / mes</td>${t.map(x => `<td class="num">${num(x.media, x.media < 10 ? 1 : 0)} uds</td>`).join('')}</tr>
        <tr><td class="escenario">Solo lo fabricado (${num(l.cantidad)} uds)</td>${t.map(x => `<td class="num">${celdaMeses(x.soloOrden)}</td>`).join('')}</tr>
        <tr><td class="escenario">Stock + en fabricación + orden (${num(total)} uds)</td>${t.map(x => `<td class="num">${celdaMeses(x.conStock)}</td>`).join('')}</tr>`;
    }).join('');
    $('tablaVenta').innerHTML = `<div class="tabla-scroll"><table class="tabla tabla-venta">
      <thead><tr><th>Escenario</th><th class="num">Media 3 meses</th><th class="num">Media 6 meses</th><th class="num">Media 1 año</th><th class="num">Media 3 años</th></tr></thead>
      <tbody>${filas}</tbody></table></div>`;
  }

  function confirmarOrden() {
    const validas = lineasValidas();
    if (!validas.length) return;
    const r = C.resumenOrden(datos, validas);
    const faltan = r.materiales.filter(m => m.estado === 'falta');
    if (faltan.length && !window.confirm(`Faltan materiales: ${faltan.map(m => `${m.nombre} (${cantidadMaterial(-m.quedaria, m.unidad)})`).join(', ')}.\n\n¿Confirmar la orden igualmente? Habrá que comprarlos antes de fabricar.`)) return;
    const orden = { id: 'OF-' + String(datos.ordenes.length + 1).padStart(3, '0'), fecha: new Date(), lineas: validas };
    datos.ordenes.push(orden);
    const guardada = U.guardarOrdenes(datos.ordenes);
    estado.orden = [];
    renderOrden();
    renderLista();
    U.aviso(`Orden ${orden.id} confirmada: ${num(r.unidades)} uds en fabricación y materias primas descontadas${guardada ? '' : ' (solo en esta sesión)'}.`);
  }

  function iniciarPlanificador() {
    $('buscador').addEventListener('input', ev => { estado.filtro = ev.target.value; renderLista(); });
    $('listaReferencias').addEventListener('click', ev => {
      const btn = ev.target.closest('[data-fabricar]');
      if (btn) anadirLinea(btn.dataset.fabricar);
    });
    $('ordenLineas').addEventListener('input', ev => {
      const input = ev.target.closest('[data-cantidad]');
      if (!input) return;
      const linea = estado.orden.find(l => l.productoId === input.dataset.cantidad);
      linea.cantidad = input.value;
      input.parentElement.classList.toggle('invalida', !cantidadOk(input.value));
      renderResultados();
    });
    $('ordenLineas').addEventListener('click', ev => {
      const atajo = ev.target.closest('[data-atajo]');
      if (atajo) {
        const linea = estado.orden.find(l => l.productoId === atajo.dataset.atajo);
        linea.cantidad = Number(atajo.dataset.valor);
        renderOrden();
        if (linea.cantidad === 0) U.aviso('Con el stock actual ya está cubierto ese periodo: cantidad 0.');
        return;
      }
      const quitar = ev.target.closest('[data-quitar]');
      if (quitar) {
        estado.orden = estado.orden.filter(l => l.productoId !== quitar.dataset.quitar);
        renderOrden();
        renderLista();
      }
    });
    $('btnVaciar').addEventListener('click', () => { estado.orden = []; renderOrden(); renderLista(); });
    $('btnConfirmar').addEventListener('click', confirmarOrden);
    const operario = $('costeOperario');
    operario.value = datos.config.costeOperarioHora;
    operario.addEventListener('input', () => {
      if (operario.value.trim() === '') return; // campo a medio escribir: se mantiene el último valor
      const v = Number(operario.value);
      if (Number.isFinite(v) && v >= 0) { datos.config.costeOperarioHora = v; renderResultados(); }
    });
    U.segmentado($('baseOrden'), estado.baseOrden, v => { estado.baseOrden = Number(v); renderOrden(); renderLista(); });
    renderLista();
    renderOrden();
  }

  /* =================== BI PRODUCCIÓN =================== */

  // Posición (0–100 %) dentro de cinco zonas de igual ancho: rotura, bajo, correcto, alto, sobrestock.
  const ZONAS = [
    { estado: 'rotura', desde: 0, hasta: 1, texto: 'Rotura · < 1 m' },
    { estado: 'bajo', desde: 1, hasta: 2, texto: 'Bajo · 1–2 m' },
    { estado: 'correcto', desde: 2, hasta: 6, texto: 'Correcto · 2–6 m' },
    { estado: 'alto', desde: 6, hasta: 12, texto: 'Alto · 6–12 m' },
    { estado: 'sobrestock', desde: 12, hasta: 36, texto: 'Sobrestock · > 12 m' },
  ];

  function posicionCobertura(cob) {
    if (cob === null) return 0;
    if (!Number.isFinite(cob)) return 100;
    const i = ZONAS.findIndex((z, k) => cob < z.hasta || k === ZONAS.length - 1);
    const z = ZONAS[i];
    const dentro = Math.min(1, Math.max(0, (cob - z.desde) / (z.hasta - z.desde)));
    return (i + dentro) * 20;
  }

  function fondoZona(est) {
    const def = U.ESTADOS.cobertura[est][0];
    return `var(--${def}-fondo)`;
  }

  function renderKpisBi(fams) {
    const valor = fams.reduce((t, f) => t + f.valorStock, 0);
    const sobre = fams.filter(f => f.estado === 'sobrestock');
    const rotura = fams.filter(f => f.estado === 'rotura');
    const fab = fams.reduce((t, f) => t + f.fabricado12, 0);
    const vend = fams.reduce((t, f) => t + f.vendido12, 0);
    const lista = (l, est) => l.length ? chip('cobertura', est, l.map(f => f.nombre).join(', ')) : chip('cobertura', 'correcto', 'Ninguna');
    $('kpisBi').innerHTML = `
      <div class="kpi"><div class="kpi-nombre">Valor del stock terminado</div><div class="kpi-valor">${eur(valor)}</div><div class="kpi-detalle">A coste estándar de fabricación</div></div>
      <div class="kpi"><div class="kpi-nombre">Familias en sobrestock</div><div class="kpi-valor">${sobre.length}</div><div class="kpi-detalle">${lista(sobre, 'sobrestock')}</div></div>
      <div class="kpi"><div class="kpi-nombre">Familias en riesgo de rotura</div><div class="kpi-valor">${rotura.length}</div><div class="kpi-detalle">${lista(rotura, 'rotura')}</div></div>
      <div class="kpi"><div class="kpi-nombre">Fabricado últimos 12 meses</div><div class="kpi-valor">${num(fab)} uds</div><div class="kpi-detalle">Vendido ${num(vend)} uds · ${U.delta(vend ? fab / vend - 1 : null)}</div></div>`;
  }

  function renderSemaforo(fams) {
    $('leyendaCobertura').innerHTML = ['rotura', 'bajo', 'correcto', 'alto', 'sobrestock'].map(e => chip('cobertura', e)).join(' ');
    const cabecera = `<div class="semaforo-fila semaforo-cabecera"><span></span><div class="semaforo-zonas">${ZONAS.map(z => `<span>${z.texto}</span>`).join('')}</div><span></span></div>`;
    const filas = fams.map(f => {
      const pos = posicionCobertura(f.cobertura);
      const color = U.colorEstado('cobertura', f.estado);
      const valor = f.cobertura === null ? 'sin ventas' : Number.isFinite(f.cobertura) ? (f.cobertura > 36 ? '> 36 m' : num(f.cobertura, 1) + ' m') : 'sin ventas';
      return `<button type="button" class="semaforo-fila${estado.familiaDetalle === f.familiaId ? ' activa' : ''}" data-familia="${esc(f.familiaId)}" aria-label="${esc(f.nombre)}: ${valor} de stock, ${esc(U.ESTADOS.cobertura[f.estado][2])}">
        <span class="semaforo-nombre"><b>${esc(f.nombre)}</b><small>${num(f.stock + f.enFabricacion)} uds · ${num(f.media)}/mes</small></span>
        <span class="semaforo-pista" aria-hidden="true">
          ${ZONAS.map(z => `<i style="background:${fondoZona(z.estado)}"></i>`).join('')}
          ${f.cobertura === null ? '' : `<span class="semaforo-marca" style="left:${pos.toFixed(2)}%;background:${color}"></span>`}
          <span class="semaforo-valor" style="left:${pos.toFixed(2)}%" data-lado="${pos > 80 ? 'izq' : 'der'}">${valor}</span>
        </span>
        <span class="semaforo-estado">${chip('cobertura', f.estado)}</span>
      </button>`;
    }).join('');
    $('contCobertura').innerHTML = `<div class="semaforo">${cabecera}${filas}</div>`;
  }

  function renderFabVend(fams) {
    const lista = fams.filter(f => f.vendido12 > 0).map(f => ({ ...f, indice: f.fabricado12 / f.vendido12 * 100 })).sort((a, b) => b.indice - a.indice);
    const lineaCien = {
      id: 'lineaCien',
      afterDatasetsDraw(chart) {
        const x = chart.scales.x.getPixelForValue(100);
        const { top, bottom } = chart.chartArea;
        const ctx = chart.ctx;
        ctx.save();
        ctx.strokeStyle = COLORES.tinta;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, top - 4); ctx.lineTo(x, bottom); ctx.stroke();
        ctx.fillStyle = COLORES.tinta;
        ctx.font = '700 11px Arimo, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('100 = se fabrica lo que se vende', x, top - 8);
        ctx.restore();
      },
    };
    U.grafica('graficaFabVend', {
      type: 'bar',
      data: {
        labels: lista.map(f => f.nombre),
        datasets: [{ data: lista.map(f => Math.round(f.indice)), backgroundColor: COLORES.serie1, borderRadius: 4, borderSkipped: 'start', barPercentage: 0.7, categoryPercentage: 0.9 }],
      },
      options: {
        indexAxis: 'y',
        layout: { padding: { top: 18, right: 8 } },
        scales: {
          x: { beginAtZero: true, suggestedMax: 150, grid: { color: COLORES.rejilla }, ticks: { callback: v => v } },
          y: { grid: { display: false } },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: ctx => {
                const f = lista[ctx.dataIndex];
                return [`Índice ${ctx.parsed.x}`, `Fabricado ${num(f.fabricado12)} uds`, `Vendido ${num(f.vendido12)} uds`];
              },
            },
          },
        },
      },
      plugins: [lineaCien],
    });
    U.tablaDatos('datosFabVend', ['Familia', 'Fabricado 12 m', 'Vendido 12 m', 'Índice'],
      lista.map(f => [esc(f.nombre), num(f.fabricado12) + ' uds', num(f.vendido12) + ' uds', num(f.indice)]));
  }

  function renderTablaFamilias(fams) {
    $('tablaFamilias').innerHTML = `<div class="tabla-scroll"><table class="tabla">
      <thead><tr><th>Familia</th><th class="num">Stock</th><th class="num">En fabricación</th><th class="num">Valor stock</th><th class="num">Venta / mes</th><th class="num">Cobertura</th><th>Estado</th><th class="num">Fabricado 12 m</th><th class="num">Vendido 12 m</th><th class="num">Tendencia</th></tr></thead>
      <tbody>${fams.map(f => `<tr class="clicable${estado.familiaDetalle === f.familiaId ? ' activa' : ''}" data-familia="${esc(f.familiaId)}" tabindex="0">
        <td><b>${esc(f.nombre)}</b></td><td class="num">${num(f.stock)}</td><td class="num">${f.enFabricacion ? num(f.enFabricacion) : '—'}</td>
        <td class="num">${eur(f.valorStock)}</td><td class="num">${num(f.media)}</td><td class="num">${meses(f.cobertura)}</td><td>${chip('cobertura', f.estado)}</td>
        <td class="num">${num(f.fabricado12)}</td><td class="num">${num(f.vendido12)}</td><td class="num">${U.delta(C.tendenciaFamilia(datos, f.familiaId).variacion)}</td></tr>`).join('')}</tbody>
    </table></div>`;
  }

  function renderDetalleFamilia() {
    const cont = $('detalleFamilia');
    if (!estado.familiaDetalle) { cont.innerHTML = ''; return; }
    const fam = familias.get(estado.familiaDetalle);
    const refs = C.resumenProductos(datos, fam.id, estado.baseBi);
    cont.innerHTML = `<section class="tarjeta tarjeta-destacada pila-margen" aria-labelledby="tituloDetalle">
      <div class="tarjeta-cabecera">
        <div><h2 class="tarjeta-titulo" id="tituloDetalle">Detalle · ${esc(fam.nombre)}</h2><p class="tarjeta-sub">Media de ventas: ${NOMBRE_BASE[estado.baseBi]}</p></div>
        <button type="button" class="btn btn-secundario btn-mini" data-cerrar-detalle>Cerrar</button>
      </div>
      <div class="tabla-scroll"><table class="tabla">
        <thead><tr><th>Referencia</th><th class="num">Stock</th><th class="num">En fabr.</th><th class="num">Venta/mes</th><th class="num">Cobertura</th><th>Estado</th><th class="num">Fabricado 12 m</th><th class="num">Vendido 12 m</th><th></th></tr></thead>
        <tbody>${refs.map(r => `<tr>
          <td class="celda-principal"><b>${esc(r.ref)}</b><small>${esc(r.nombre)}</small></td>
          <td class="num">${num(r.stock)}</td><td class="num">${r.enFabricacion ? num(r.enFabricacion) : '—'}</td>
          <td class="num">${num(r.media, r.media < 10 ? 1 : 0)}</td><td class="num">${meses(r.cobertura)}</td><td>${chip('cobertura', r.estado)}</td>
          <td class="num">${num(r.fabricado12)}</td><td class="num">${num(r.vendido12)}</td>
          <td><button type="button" class="btn btn-mini btn-fabricar" data-fabricar-bi="${esc(r.productoId)}">Fabricar</button></td></tr>`).join('')}</tbody>
      </table></div>
    </section>`;
  }

  function mediaMovil(serie, n) {
    return serie.map((_, i) => (i < n - 1 ? null : serie.slice(i - n + 1, i + 1).reduce((a, b) => a + b, 0) / n));
  }

  function renderTendencias() {
    const tendencias = ORDEN_FAMILIAS.map(id => ({ fam: familias.get(id), t: C.tendenciaFamilia(datos, id) }));
    $('rejillaTendencias').innerHTML = tendencias.map(({ fam, t }) => {
      const ult3 = t.unidades.slice(-3).reduce((a, b) => a + b, 0);
      return `<button type="button" class="mini-tendencia" data-tendencia="${esc(fam.id)}" aria-pressed="${estado.tendencia === fam.id}">
        <header><b>${esc(fam.nombre)}</b>${U.delta(t.variacion)}</header>
        <p>${num(ult3)} uds en los últimos 3 meses</p>
        <div class="mini-grafica"><canvas id="spark-${esc(fam.id)}" aria-hidden="true"></canvas></div>
      </button>`;
    }).join('');
    for (const { fam, t } of tendencias) {
      U.grafica('spark-' + fam.id, {
        type: 'line',
        data: { labels: t.meses.map(U.mesCorto), datasets: [{ data: mediaMovil(t.unidades, 3), borderColor: COLORES.serie1, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, tension: 0.3, spanGaps: true }] },
        options: {
          animation: false,
          scales: { x: { display: false }, y: { display: false, beginAtZero: true } },
          plugins: { tooltip: { intersect: false, mode: 'index', callbacks: { label: c => `${num(c.parsed.y)} uds/mes (media 3 m)` } } },
          layout: { padding: 2 },
        },
      });
    }
    renderTendenciaAmpliada();
  }

  function renderTendenciaAmpliada() {
    const cont = $('tendenciaAmpliada');
    if (!estado.tendencia) { cont.innerHTML = ''; return; }
    const fam = familias.get(estado.tendencia);
    const t = C.tendenciaFamilia(datos, fam.id);
    const movil = mediaMovil(t.unidades, 3);
    cont.innerHTML = `<div class="tarjeta-interior">
      <div class="tarjeta-cabecera">
        <div><h3 class="tarjeta-titulo">${esc(fam.nombre)} · unidades vendidas por mes</h3><p class="tarjeta-sub">Variación últimos 3 meses frente al año anterior: ${U.delta(t.variacion)}</p></div>
        <div class="leyenda"><span><i style="background:${COLORES.serie1}"></i>Unidades / mes</span><span><i style="background:${COLORES.serie2}"></i>Media móvil 3 meses</span></div>
      </div>
      <div class="grafica grafica-alta"><canvas id="graficaTendencia" aria-label="Tendencia de ventas de ${esc(fam.nombre)}"></canvas></div>
      <div id="datosTendencia"></div>
    </div>`;
    U.grafica('graficaTendencia', {
      type: 'line',
      data: {
        labels: t.meses.map(U.mesCorto),
        datasets: [
          { label: 'Unidades / mes', data: t.unidades, borderColor: COLORES.serie1, backgroundColor: COLORES.serie1, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, tension: 0.25 },
          { label: 'Media móvil 3 meses', data: movil, borderColor: COLORES.serie2, backgroundColor: COLORES.serie2, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, tension: 0.25 },
        ],
      },
      options: {
        interaction: { mode: 'index', intersect: false },
        scales: { y: { beginAtZero: true, grid: { color: COLORES.rejilla }, ticks: { callback: v => num(v) } }, x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 12 } } },
        plugins: { tooltip: { callbacks: { label: c => `${c.dataset.label}: ${c.parsed.y === null ? '—' : num(c.parsed.y)} uds` } } },
      },
    });
    U.tablaDatos('datosTendencia', ['Mes', 'Unidades', 'Importe'], t.meses.map((m, i) => [U.mesCorto(m), num(t.unidades[i]), eur(t.importe[i])]).reverse());
  }

  function renderBi() {
    const fams = C.resumenFamilias(datos, estado.baseBi);
    renderKpisBi(fams);
    renderSemaforo(fams);
    renderDetalleFamilia();
    renderFabVend(fams);
    renderTablaFamilias(fams);
    renderTendencias();
  }

  function seleccionarFamilia(id) {
    estado.familiaDetalle = estado.familiaDetalle === id ? null : id;
    const fams = C.resumenFamilias(datos, estado.baseBi);
    renderSemaforo(fams);
    renderTablaFamilias(fams);
    renderDetalleFamilia();
    if (estado.familiaDetalle) $('detalleFamilia').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  let activarPestana = null;

  function iniciarBi() {
    U.segmentado($('baseBi'), estado.baseBi, v => { estado.baseBi = Number(v); renderBi(); });
    $('contCobertura').addEventListener('click', ev => {
      const fila = ev.target.closest('[data-familia]');
      if (fila) seleccionarFamilia(fila.dataset.familia);
    });
    $('tablaFamilias').addEventListener('click', ev => {
      const fila = ev.target.closest('[data-familia]');
      if (fila) seleccionarFamilia(fila.dataset.familia);
    });
    $('tablaFamilias').addEventListener('keydown', ev => {
      const fila = ev.target.closest('[data-familia]');
      if (fila && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); seleccionarFamilia(fila.dataset.familia); }
    });
    $('detalleFamilia').addEventListener('click', ev => {
      if (ev.target.closest('[data-cerrar-detalle]')) { seleccionarFamilia(estado.familiaDetalle); return; }
      const btn = ev.target.closest('[data-fabricar-bi]');
      if (btn) {
        activarPestana('planificador');
        anadirLinea(btn.dataset.fabricarBi);
      }
    });
    $('rejillaTendencias').addEventListener('click', ev => {
      const btn = ev.target.closest('[data-tendencia]');
      if (!btn) return;
      estado.tendencia = estado.tendencia === btn.dataset.tendencia ? null : btn.dataset.tendencia;
      document.querySelectorAll('.mini-tendencia').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tendencia === estado.tendencia)));
      renderTendenciaAmpliada();
      if (estado.tendencia) $('tendenciaAmpliada').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  /* =================== Arranque =================== */

  U.iniciarCabecera(datos);
  iniciarPlanificador();
  iniciarBi();
  activarPestana = U.iniciarPestanas(id => {
    if (id === 'bi') renderBi();
    else { renderLista(); renderOrden(); }
  });
})();
