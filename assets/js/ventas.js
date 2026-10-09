/* ============================================================
   GRUPO BOLBAITE — Intranet demo · Ventas
   BI de ventas (provincia, familia, cliente, comercial), cartera
   de clientes por comercial e informe semanal de alertas.
   ============================================================ */
(function () {
  'use strict';

  const C = window.BolbaiteCalculos;
  const U = window.BolbaiteUI;
  const { eur, num, esc, chip, fecha, COLORES } = U;

  const datos = U.datosDemo();
  const familias = C.mapa(datos.familias);
  const comerciales = C.mapa(datos.comerciales);

  const estado = {
    pestana: 'bi',
    comercialId: '',
    meses: 12,
    provincia: null,
    familiaId: null,
    busqueda: '',
    orden: { campo: 'ventas12', dir: -1 },
    baseAlerta: 6,
  };

  const $ = id => document.getElementById(id);
  const nombreComercial = id => (comerciales.get(id) || { nombre: id }).nombre;
  const chipComercial = id => `<span class="chip">${esc(nombreComercial(id))}</span>`;
  const iniciales = nombre => nombre.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();

  function filtros(conComercial = true) {
    return { comercialId: conComercial ? estado.comercialId : '', provincia: estado.provincia, familiaId: estado.familiaId };
  }

  function rangoTexto(meses, desplazamiento = 0) {
    const k = C.mesesCompletos(datos.hoy, meses, desplazamiento);
    return `${U.mesCorto(k[0])} – ${U.mesCorto(k[k.length - 1])}`;
  }

  function ultimaCompra() {
    const m = new Map();
    for (const p of datos.pedidos) if (!m.has(p.clienteId) || p.fecha > m.get(p.clienteId)) m.set(p.clienteId, p.fecha);
    return m;
  }
  const ultimasCompras = ultimaCompra();

  /* =================== Filtros =================== */

  function renderFiltros() {
    const chips = [];
    if (estado.provincia) chips.push(`<span class="chip-filtro">Provincia: ${esc(estado.provincia)} <button type="button" data-quitar="provincia" aria-label="Quitar filtro de provincia">×</button></span>`);
    if (estado.familiaId) chips.push(`<span class="chip-filtro">Familia: ${esc(familias.get(estado.familiaId).nombre)} <button type="button" data-quitar="familiaId" aria-label="Quitar filtro de familia">×</button></span>`);
    $('filtrosCruzados').innerHTML = chips.join('');
    $('filtrosCruzados').hidden = !chips.length || estado.pestana === 'informes';
    $('bloquePeriodo').hidden = estado.pestana !== 'bi';
    const notas = {
      bi: `Periodo: ${rangoTexto(estado.meses)}${estado.meses < 36 ? ` · comparado con ${rangoTexto(estado.meses, 12)}` : ''}`,
      clientes: `Ventas de los últimos 12 meses completos (${rangoTexto(12)})`,
      informes: 'Los informes usan solo el filtro de comercial',
    };
    $('notaFiltros').textContent = notas[estado.pestana];
  }

  function alternarFiltro(campo, valor) {
    estado[campo] = estado[campo] === valor ? null : valor;
    renderTodo();
  }

  /* =================== BI Ventas =================== */

  function renderKpis() {
    const k = C.kpisVentas(datos, filtros(), estado.meses);
    const cartera = datos.clientes.filter(c => (!estado.comercialId || c.comercialId === estado.comercialId) && (!estado.provincia || c.provincia === estado.provincia)).length;
    $('kpisVentas').innerHTML = `
      <div class="kpi kpi-marca"><div class="kpi-nombre">Ventas ${estado.meses} meses</div><div class="kpi-valor">${eur(k.ventas)}</div>
        <div class="kpi-detalle">${k.ventasAnterior === null ? 'Sin año anterior completo para comparar' : k.variacion === null ? 'Sin ventas en el mismo periodo del año anterior' : `${U.delta(k.variacion)} frente al año anterior`}</div></div>
      <div class="kpi"><div class="kpi-nombre">Clientes activos</div><div class="kpi-valor">${num(k.clientesActivos)}</div><div class="kpi-detalle">de ${num(cartera)} en cartera</div></div>
      <div class="kpi"><div class="kpi-nombre">Ticket medio</div><div class="kpi-valor">${eur(k.ticketMedio)}</div><div class="kpi-detalle">${num(k.pedidos)} pedidos en el periodo</div></div>
      <div class="kpi"><div class="kpi-nombre">Clientes nuevos</div><div class="kpi-valor">${num(k.clientesNuevos)}</div><div class="kpi-detalle">Dados de alta en el periodo</div></div>`;
  }

  function renderEvolucion() {
    const claves = C.mesesCompletos(datos.hoy, 36);
    const serie = C.serieMensual(C.ventasFiltradas(datos, filtros()), claves);
    const anterior = serie.map((_, i) => (i >= 12 ? serie[i - 12] : null));
    const desde = 36 - estado.meses;
    const sombreado = {
      id: 'sombreadoPeriodo',
      beforeDatasetsDraw(chart) {
        const x = chart.scales.x;
        const paso = (x.getPixelForValue(1) - x.getPixelForValue(0)) / 2;
        const izq = Math.max(chart.chartArea.left, x.getPixelForValue(desde) - paso);
        const der = Math.min(chart.chartArea.right, x.getPixelForValue(35) + paso);
        const ctx = chart.ctx;
        ctx.save();
        ctx.fillStyle = 'rgba(26, 24, 147, 0.05)';
        ctx.fillRect(izq, chart.chartArea.top, der - izq, chart.chartArea.bottom - chart.chartArea.top);
        ctx.restore();
      },
    };
    $('leyendaEvolucion').innerHTML = `<span><i style="background:${COLORES.serie1}"></i>Ventas del mes</span><span><i style="background:${COLORES.gris}"></i>Mismo mes del año anterior</span>`;
    U.grafica('graficaEvolucion', {
      type: 'line',
      data: {
        labels: claves.map(U.mesCorto),
        datasets: [
          { label: 'Ventas', data: serie, borderColor: COLORES.serie1, backgroundColor: COLORES.serie1, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, tension: 0.25 },
          { label: 'Año anterior', data: anterior, borderColor: COLORES.gris, backgroundColor: COLORES.gris, borderWidth: 1.5, pointRadius: 0, pointHoverRadius: 4, tension: 0.25 },
        ],
      },
      options: {
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: { beginAtZero: true, grid: { color: COLORES.rejilla }, ticks: { callback: v => (v >= 1000 ? num(v / 1000) + ' k€' : num(v) + ' €') } },
          x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 14 } },
        },
        plugins: { tooltip: { callbacks: { label: c => `${c.dataset.label}: ${c.parsed.y === null ? '—' : eur(c.parsed.y)}` } } },
      },
      plugins: [sombreado],
    });
    U.tablaDatos('datosEvolucion', ['Mes', 'Ventas', 'Año anterior', 'Variación'],
      claves.map((k, i) => [U.mesCorto(k), eur(serie[i]), anterior[i] === null ? '—' : eur(anterior[i]), anterior[i] ? U.delta(C.variacion(serie[i], anterior[i])) : '—']).reverse());
  }

  // Ranking de una dimensión ignorando su propio filtro (filtro cruzado).
  function ranking(campo, clave) {
    const f = filtros();
    f[campo] = null;
    const actual = C.agregarPor(C.ventasFiltradas(datos, { ...f, meses: C.mesesCompletos(datos.hoy, estado.meses) }), clave);
    const previo = estado.meses < 36
      ? new Map(C.agregarPor(C.ventasFiltradas(datos, { ...f, meses: C.mesesCompletos(datos.hoy, estado.meses, 12) }), clave).map(a => [a.clave, a.importe]))
      : null;
    return actual.map(a => ({ ...a, variacion: previo ? C.variacion(a.importe, previo.get(a.clave) || 0) : null }));
  }

  function renderRanking(idCont, campo, clave, etiqueta, detalle) {
    const filas = ranking(campo, clave);
    const max = filas.reduce((m, f) => Math.max(m, f.importe), 0);
    const seleccion = estado[campo];
    const cont = $(idCont);
    if (!filas.length) { cont.innerHTML = '<p class="vacio">Sin ventas con estos filtros.</p>'; return; }
    cont.innerHTML = `<div class="ranking">${filas.map(f => `
      <button type="button" class="ranking-fila${seleccion === f.clave ? ' activa' : seleccion ? ' atenuada' : ''}" data-campo="${campo}" data-valor="${esc(f.clave)}" aria-pressed="${seleccion === f.clave}">
        <span class="ranking-nombre">${esc(etiqueta(f.clave))}${detalle ? `<small>${esc(detalle(f.clave))}</small>` : ''}</span>
        <span class="ranking-pista" aria-hidden="true"><span class="ranking-barra" style="display:block;width:${max ? (f.importe / max * 100).toFixed(1) : 0}%"></span></span>
        <span class="ranking-valor">${eur(f.importe)}</span>
        <span class="ranking-delta">${U.delta(f.variacion)}</span>
      </button>`).join('')}</div>`;
  }

  function renderComerciales() {
    const f = filtros(false);
    const datosCom = datos.comerciales.map(c => {
      const k = C.kpisVentas(datos, { ...f, comercialId: c.id }, estado.meses);
      const cartera = datos.clientes.filter(cl => cl.comercialId === c.id);
      const provincias = [...new Set(cartera.map(cl => cl.provincia))];
      return { c, k, cartera, provincias };
    });
    const total = datosCom.reduce((t, d) => t + d.k.ventas, 0);
    $('comerciales').innerHTML = datosCom.map(({ c, k, cartera, provincias }) => `
      <button type="button" class="tarjeta-comercial" data-comercial="${esc(c.id)}" aria-pressed="${estado.comercialId === c.id}">
        <header>
          <span class="comercial-nombre"><span class="avatar" aria-hidden="true">${esc(iniciales(c.nombre))}</span><span><b>${esc(c.nombre)}</b><small>${esc(provincias.join(', '))}</small></span></span>
          ${U.delta(k.variacion)}
        </header>
        <div class="comercial-cifra">${eur(k.ventas)}</div>
        <div class="comercial-datos"><span>${num(total ? k.ventas / total * 100 : 0)} % del total</span><span>${num(k.clientesActivos)} activos de ${num(cartera.length)}</span><span>Ticket ${eur(k.ticketMedio)}</span></div>
        <div class="cuota" aria-hidden="true"><span style="width:${total ? (k.ventas / total * 100).toFixed(1) : 0}%"></span></div>
      </button>`).join('');
  }

  function renderTop() {
    const claves = C.mesesCompletos(datos.hoy, estado.meses);
    const filas = C.agregarPor(C.ventasFiltradas(datos, { ...filtros(), meses: claves }), 'clienteId').slice(0, 10);
    const previo = estado.meses < 36
      ? new Map(C.agregarPor(C.ventasFiltradas(datos, { ...filtros(), meses: C.mesesCompletos(datos.hoy, estado.meses, 12) }), 'clienteId').map(a => [a.clave, a.importe]))
      : null;
    const clientes = C.mapa(datos.clientes);
    if (!filas.length) { $('topClientes').innerHTML = '<p class="vacio">Sin ventas con estos filtros.</p>'; return; }
    $('topClientes').innerHTML = `<div class="tabla-scroll"><table class="tabla">
      <thead><tr><th>#</th><th>Cliente</th><th>Provincia</th><th>Comercial</th><th class="num">Ventas</th><th class="num">Variación</th><th class="num">Última compra</th></tr></thead>
      <tbody>${filas.map((f, i) => {
        const c = clientes.get(f.clave);
        return `<tr><td>${i + 1}</td><td class="celda-principal"><b>${esc(c.nombre)}</b><small>${esc(c.localidad)}</small></td><td>${esc(c.provincia)}</td><td>${chipComercial(c.comercialId)}</td>
          <td class="num"><b>${eur(f.importe)}</b></td><td class="num">${previo ? U.delta(C.variacion(f.importe, previo.get(f.clave) || 0)) : '—'}</td><td class="num">${fecha(ultimasCompras.get(c.id))}</td></tr>`;
      }).join('')}</tbody></table></div>`;
  }

  function renderBi() {
    renderKpis();
    renderEvolucion();
    renderRanking('rankingProvincias', 'provincia', 'provincia', v => v);
    renderRanking('rankingFamilias', 'familiaId', 'familiaId', v => familias.get(v).nombre, v => (familias.get(v).tipo === 'propia' ? 'propia' : 'distribución'));
    renderComerciales();
    renderTop();
  }

  /* =================== Clientes y comerciales =================== */

  function renderCarteras() {
    const f = filtros(false);
    const filas = datos.comerciales
      .filter(c => !estado.comercialId || c.id === estado.comercialId)
      .map(c => {
        const cartera = datos.clientes.filter(cl => cl.comercialId === c.id && (!estado.provincia || cl.provincia === estado.provincia));
        const k = C.kpisVentas(datos, { ...f, comercialId: c.id }, 12);
        const nuevos = cartera.filter(cl => C.diasEntre(cl.fechaAlta, datos.hoy) <= 90).length;
        return { c, cartera, k, nuevos, provincias: [...new Set(cartera.map(cl => cl.provincia))] };
      });
    $('tablaCarteras').innerHTML = `<div class="tabla-scroll"><table class="tabla">
      <thead><tr><th>Comercial</th><th>Provincias</th><th class="num">Clientes</th><th class="num">Activos 12 m</th><th class="num">Nuevos 90 días</th><th class="num">Ventas 12 m</th><th class="num">Variación</th></tr></thead>
      <tbody>${filas.map(({ c, cartera, k, nuevos, provincias }) => `<tr>
        <td><span class="comercial-nombre"><span class="avatar" aria-hidden="true">${esc(iniciales(c.nombre))}</span><b>${esc(c.nombre)}</b></span></td>
        <td>${esc(provincias.join(', ') || '—')}</td><td class="num">${num(cartera.length)}</td><td class="num">${num(k.clientesActivos)}</td><td class="num">${num(nuevos)}</td>
        <td class="num"><b>${eur(k.ventas)}</b></td><td class="num">${U.delta(k.variacion)}</td></tr>`).join('')}</tbody>
    </table></div>`;
  }

  const COLUMNAS = [
    { campo: 'cliente', titulo: 'Cliente' },
    { campo: 'provincia', titulo: 'Provincia' },
    { campo: 'comercialId', titulo: 'Comercial' },
    { campo: 'ventas12', titulo: 'Ventas 12 m', num: true },
    { campo: 'variacion12', titulo: 'Variación', num: true },
    { campo: null, titulo: 'Familias que compra' },
    { campo: 'ultimaCompra', titulo: 'Última compra', num: true },
    { campo: 'ultimaVisita', titulo: 'Última visita', num: true },
  ];

  function comparar(a, b, campo) {
    const va = a[campo], vb = b[campo];
    const nulo = v => v === null || v === undefined;
    if (nulo(va) && nulo(vb)) return 0;
    if (nulo(va)) return 1;
    if (vb === null || vb === undefined) return -1;
    if (typeof va === 'string') return va.localeCompare(vb, 'es');
    return va - vb;
  }

  function renderClientes() {
    renderCarteras();
    const texto = estado.busqueda.trim().toLowerCase();
    const clientes = C.mapa(datos.clientes);
    let filas = C.carteraClientes(datos, filtros())
      .filter(c => !texto || (c.cliente + ' ' + clientes.get(c.clienteId).localidad + ' ' + c.provincia).toLowerCase().includes(texto));
    const { campo, dir } = estado.orden;
    filas = filas.sort((a, b) => {
      const r = comparar(a, b, campo);
      const nulo = a[campo] === null || a[campo] === undefined || b[campo] === null || b[campo] === undefined;
      return nulo ? r : r * dir;
    });
    const total = filas.reduce((t, f) => t + f.ventas12, 0);
    $('resumenCartera').textContent = `${num(filas.length)} cliente${filas.length === 1 ? '' : 's'} · ${eur(total)} en los últimos 12 meses`;
    if (!filas.length) { $('tablaClientes').innerHTML = '<p class="vacio">Ningún cliente coincide con la búsqueda y los filtros.</p>'; return; }
    $('tablaClientes').innerHTML = `<div class="tabla-scroll"><table class="tabla">
      <thead><tr>${COLUMNAS.map(c => c.campo
        ? `<th class="ordenable${c.num ? ' num' : ''}" data-orden="${c.campo}" tabindex="0" aria-sort="${campo === c.campo ? (dir === 1 ? 'ascending' : 'descending') : 'none'}">${c.titulo}</th>`
        : `<th>${c.titulo}</th>`).join('')}</tr></thead>
      <tbody>${filas.map(f => {
        const cli = clientes.get(f.clienteId);
        const nuevo = C.diasEntre(f.fechaAlta, datos.hoy) <= 90;
        const diasVisita = f.ultimaVisita ? C.diasEntre(f.ultimaVisita, datos.hoy) : null;
        const fams = f.familias.slice(0, 4).map(n => `<span class="chip">${esc(n)}</span>`).join('') + (f.familias.length > 4 ? `<span class="chip">+${f.familias.length - 4}</span>` : '');
        return `<tr>
          <td class="celda-principal"><b>${esc(f.cliente)}${nuevo ? '<span class="etiqueta-nuevo">Nuevo</span>' : ''}</b><small>${esc(cli.localidad)}</small></td>
          <td>${esc(f.provincia)}</td><td>${chipComercial(f.comercialId)}</td>
          <td class="num"><b>${eur(f.ventas12)}</b></td><td class="num">${U.delta(f.variacion12)}</td>
          <td><div class="familias-chips">${fams || '—'}</div></td>
          <td class="num">${fecha(f.ultimaCompra)}</td>
          <td class="num">${f.ultimaVisita ? `<span class="${diasVisita > 60 ? 'visita-antigua' : ''}">${fecha(f.ultimaVisita)}</span><br><small class="tarjeta-sub">hace ${num(diasVisita)} días</small>` : '<span class="visita-antigua">Sin visitas</span>'}</td>
        </tr>`;
      }).join('')}</tbody></table></div>`;
  }

  /* =================== Informes y alertas =================== */

  function listaAlertas(items) {
    return `<ul class="lista-alertas">${items.map(i => `<li>${i.chip}<span class="alerta-texto">${i.texto}${i.detalle ? `<small>${i.detalle}</small>` : ''}</span><span class="alerta-meta">${i.meta || ''}</span></li>`).join('')}</ul>`;
  }

  function sinAlertas(texto) {
    return `<p class="sin-alertas">✓ ${esc(texto)}</p>`;
  }

  function contador(partes) {
    const visibles = partes.filter(p => p.n > 0);
    return visibles.length ? visibles.map(p => chip(p.contexto, p.estado, `${num(p.n)} ${p.texto}`)).join('') : chip('alerta', 'ok');
  }

  function renderInformes() {
    const f = { comercialId: estado.comercialId };
    const lunes = C.inicioSemana(datos.hoy);
    const domingo = C.sumarDias(lunes, 6);
    $('tituloInforme').textContent = `Informe semanal · semana del ${fecha(lunes)} al ${fecha(domingo)}`;
    $('subtituloInforme').textContent = `Comercial: ${estado.comercialId ? nombreComercial(estado.comercialId) : 'todos'} · generado el ${fecha(datos.hoy)} con los datos de la demo`;

    // 1 · Bajo consumo
    const bajo = C.alertasBajoConsumo(datos, { base: estado.baseAlerta, comercialId: estado.comercialId });
    const criticos = bajo.filter(a => a.nivel === 'critico').length;
    $('cont-consumo').innerHTML = contador([
      { n: criticos, contexto: 'alerta', estado: 'critico', texto: criticos === 1 ? 'crítico' : 'críticos' },
      { n: bajo.length - criticos, contexto: 'alerta', estado: 'aviso', texto: bajo.length - criticos === 1 ? 'aviso' : 'avisos' },
    ]);
    $('listaConsumo').innerHTML = bajo.length
      ? listaAlertas(bajo.map(a => ({ chip: chip('alerta', a.nivel), texto: esc(a.texto), detalle: `Periodo reciente: últimos ${a.ventana} días`, meta: chipComercial(a.comercialId) })))
      : sinAlertas('Ningún cliente está por debajo de su consumo medio.');

    // 2 · Próximos pedidos
    const pedidos = C.alertasProximoPedido(datos, f);
    const grupo = e => pedidos.filter(p => p.estado === e);
    const retrasados = grupo('retrasado');
    const semana = grupo('esta-semana');
    const proximas = grupo('proximas');
    const itemPedido = p => ({ chip: chip('pedido', p.estado), texto: esc(p.texto), detalle: `Previsto el ${fecha(p.prevista)}`, meta: chipComercial(p.comercialId) });
    $('cont-pedidos').innerHTML = contador([
      { n: retrasados.length, contexto: 'pedido', estado: 'retrasado', texto: retrasados.length === 1 ? 'retrasado' : 'retrasados' },
      { n: semana.length, contexto: 'pedido', estado: 'esta-semana', texto: 'esta semana' },
    ]);
    $('listaPedidos').innerHTML = `
      ${retrasados.length ? `<div class="subinforme"><h3>Retrasados · llamar al cliente</h3>${listaAlertas(retrasados.map(itemPedido))}</div>` : ''}
      <div class="subinforme"><h3>Les toca pedir esta semana</h3>${semana.length ? listaAlertas(semana.map(itemPedido)) : sinAlertas('No hay pedidos previstos para esta semana.')}</div>
      ${proximas.length ? `<details class="mas"><summary>Ver previstos en las 2 semanas siguientes (${proximas.length})</summary>${listaAlertas(proximas.map(itemPedido))}</details>` : ''}`;

    // 3 · Clientes nuevos y visitas
    const cv = C.informeClientesYVisitas(datos, f);
    $('cont-clientes').innerHTML = contador([
      { n: cv.nuevos.length, contexto: 'pedido', estado: 'proximas', texto: cv.nuevos.length === 1 ? 'alta nueva' : 'altas nuevas' },
      { n: cv.sinVisita.length, contexto: 'alerta', estado: 'aviso', texto: 'sin visita > 60 días' },
    ]);
    const itemSinVisita = s => ({
      chip: chip('alerta', 'aviso', s.dias === null ? 'Nunca visitado' : `${num(s.dias)} días`),
      texto: `<b>${esc(s.cliente)}</b>`,
      detalle: `${s.ultimaVisita ? `Última visita ${fecha(s.ultimaVisita)}` : 'Sin visitas registradas'} · última compra ${fecha(s.ultimaCompra)}`,
      meta: chipComercial(s.comercialId),
    });
    $('listaClientes').innerHTML = `
      <div class="subinforme"><h3>Altas de los últimos 90 días</h3>
        ${cv.nuevos.length ? `<div class="tabla-scroll"><table class="tabla">
          <thead><tr><th>Cliente</th><th>Provincia</th><th>Comercial</th><th class="num">Alta</th><th class="num">Primera compra</th><th class="num">Comprado</th></tr></thead>
          <tbody>${cv.nuevos.map(n => `<tr><td><b>${esc(n.cliente)}</b></td><td>${esc(n.provincia)}</td><td>${chipComercial(n.comercialId)}</td><td class="num">${fecha(n.fechaAlta)}</td><td class="num">${n.primeraCompra ? fecha(n.primeraCompra) : 'Pendiente'}</td><td class="num">${eur(n.ventas)}</td></tr>`).join('')}</tbody>
        </table></div>` : sinAlertas('No hay altas en los últimos 90 días.')}
      </div>
      <div class="subinforme"><h3>Clientes activos sin visita en más de 60 días</h3>
        ${cv.sinVisita.length ? listaAlertas(cv.sinVisita.slice(0, 8).map(itemSinVisita)) : sinAlertas('Todos los clientes activos se han visitado en los últimos 60 días.')}
        ${cv.sinVisita.length > 8 ? `<details class="mas"><summary>Ver los ${cv.sinVisita.length - 8} restantes</summary>${listaAlertas(cv.sinVisita.slice(8).map(itemSinVisita))}</details>` : ''}
      </div>
      <div class="subinforme"><h3>Últimas visitas</h3>
        ${cv.ultimasVisitas.length ? listaAlertas(cv.ultimasVisitas.map(v => ({ chip: `<span class="chip">${fecha(v.fecha)}</span>`, texto: `<b>${esc(v.cliente)}</b>`, detalle: esc(v.nota), meta: chipComercial(v.comercialId) }))) : sinAlertas('Sin visitas registradas.')}
      </div>`;

    // 4 · Muestras
    const mu = C.informeMuestras(datos, f);
    const productos = C.mapa(datos.productos);
    $('cont-muestras').innerHTML = contador([{ n: mu.pendientesAlerta, contexto: 'muestra', estado: 'sin-feedback', texto: 'sin feedback > 14 días' }]);
    const accion = m => (m.alerta ? '<span class="accion">Llamar para pedir feedback</span>'
      : m.estado === 'pendiente' ? '<span class="tarjeta-sub">Esperando prueba del cliente</span>'
      : m.estado === 'positivo' ? `<span class="feedback">${esc(m.feedback)}</span><br><span class="accion">Preparar oferta</span>`
      : `<span class="feedback">${esc(m.feedback)}</span>`);
    $('listaMuestras').innerHTML = mu.muestras.length ? `
      <div class="mini-kpis">
        <div><small>Enviadas (6 meses)</small><b>${num(mu.enviadas6m)}</b></div>
        <div><small>Convertidas en pedido</small><b>${num(mu.convertidas)}</b></div>
        <div><small>Conversión</small><b>${mu.conversion === null ? '—' : U.pct(mu.conversion)}</b></div>
        <div><small>Sin feedback > 14 días</small><b>${num(mu.pendientesAlerta)}</b></div>
      </div>
      <div class="tabla-scroll"><table class="tabla">
        <thead><tr><th class="num">Envío</th><th>Cliente</th><th>Producto</th><th class="num">Días</th><th>Estado</th><th>Feedback / acción</th><th>Comercial</th></tr></thead>
        <tbody>${mu.muestras.map(m => `<tr>
          <td class="num">${fecha(m.fechaEnvio)}</td><td><b>${esc(m.cliente)}</b></td>
          <td class="celda-principal"><b>${esc(productos.get(m.productoId).ref)}</b><small>${esc(m.producto)}</small></td>
          <td class="num">${num(m.dias)}</td><td>${chip('muestra', m.alerta ? 'sin-feedback' : m.estado)}</td><td>${accion(m)}</td><td>${chipComercial(m.comercialId)}</td></tr>`).join('')}</tbody>
      </table></div>` : sinAlertas('No hay muestras enviadas.');

    // 5 · Crecimiento
    const cr = C.alertasCrecimiento(datos, f);
    $('cont-crecimiento').innerHTML = cr.length ? chip('muestra', 'positivo', `${num(cr.length)} cliente${cr.length === 1 ? '' : 's'} al alza`) : chip('muestra', 'pendiente', 'Ninguno');
    $('listaCrecimiento').innerHTML = cr.length
      ? listaAlertas(cr.map(a => ({
        chip: `<span class="estado estado-ok"><i aria-hidden="true">▲</i>${num(Math.max(a.var12 || 0, a.var3 || 0) * 100)} %</span>`,
        texto: esc(a.texto),
        detalle: `Últimos 3 meses ${a.var3 === null ? '—' : (a.var3 >= 0 ? '+' : '−') + num(Math.abs(a.var3) * 100) + ' %'} · últimos 12 meses ${a.var12 === null ? '—' : (a.var12 >= 0 ? '+' : '−') + num(Math.abs(a.var12) * 100) + ' %'}`,
        meta: chipComercial(a.comercialId),
      })))
      : sinAlertas('Ningún cliente sube más de un 20 %.');

    // Resumen de la semana
    const resumen = [
      ['inf-consumo', 'Bajo consumo', bajo.length, criticos ? chip('alerta', 'critico', `${criticos} crítico${criticos === 1 ? '' : 's'}`) : bajo.length ? chip('alerta', 'aviso', 'Revisar') : chip('alerta', 'ok')],
      ['inf-pedidos', 'Pedidos a reclamar', retrasados.length + semana.length, retrasados.length ? chip('pedido', 'retrasado', `${retrasados.length} retrasado${retrasados.length === 1 ? '' : 's'}`) : chip('pedido', 'esta-semana', `${semana.length} esta semana`)],
      ['inf-clientes', 'Altas nuevas', cv.nuevos.length, chip('alerta', 'aviso', `${cv.sinVisita.length} sin visitar`)],
      ['inf-muestras', 'Muestras sin feedback', mu.pendientesAlerta, chip('muestra', 'pedido', `${mu.conversion === null ? '—' : U.pct(mu.conversion)} conversión`)],
      ['inf-crecimiento', 'Clientes al alza', cr.length, chip('muestra', 'positivo', 'Oportunidad')],
    ];
    $('resumenInforme').innerHTML = resumen.map(([id, titulo, n, extra]) => `<a class="resumen-item" href="#${id}" data-ir="${id}"><small>${titulo}</small><b>${num(n)}</b>${extra}</a>`).join('');
  }

  function prepararImpresion() {
    let estadosPrevios = [];
    window.addEventListener('beforeprint', () => {
      if (estado.pestana !== 'informes') renderInformes();
      estadosPrevios = [...document.querySelectorAll('#panel-informes details')].map(d => [d, d.open]);
      estadosPrevios.forEach(([d]) => { d.open = true; });
    });
    window.addEventListener('afterprint', () => {
      estadosPrevios.forEach(([d, abierto]) => { d.open = abierto; });
    });
    $('btnImprimir').addEventListener('click', () => window.print());
  }

  /* =================== Arranque =================== */

  function renderTodo() {
    renderFiltros();
    if (estado.pestana === 'bi') renderBi();
    else if (estado.pestana === 'clientes') renderClientes();
    else renderInformes();
  }

  U.iniciarCabecera(datos);
  const marcarComercial = U.segmentado($('filtroComercial'), estado.comercialId, v => { estado.comercialId = v; renderTodo(); });
  U.segmentado($('filtroPeriodo'), estado.meses, v => { estado.meses = Number(v); renderTodo(); });
  U.segmentado($('baseAlerta'), estado.baseAlerta, v => { estado.baseAlerta = Number(v); renderInformes(); });

  $('filtrosCruzados').addEventListener('click', ev => {
    const btn = ev.target.closest('[data-quitar]');
    if (btn) { estado[btn.dataset.quitar] = null; renderTodo(); }
  });
  ['rankingProvincias', 'rankingFamilias'].forEach(id => $(id).addEventListener('click', ev => {
    const fila = ev.target.closest('[data-campo]');
    if (fila) alternarFiltro(fila.dataset.campo, fila.dataset.valor);
  }));
  $('comerciales').addEventListener('click', ev => {
    const tarjeta = ev.target.closest('[data-comercial]');
    if (!tarjeta) return;
    estado.comercialId = estado.comercialId === tarjeta.dataset.comercial ? '' : tarjeta.dataset.comercial;
    marcarComercial(estado.comercialId);
    renderTodo();
  });
  $('buscadorClientes').addEventListener('input', ev => { estado.busqueda = ev.target.value; renderClientes(); });
  const ordenar = th => {
    const campo = th.dataset.orden;
    estado.orden = { campo, dir: estado.orden.campo === campo ? -estado.orden.dir : (['cliente', 'provincia', 'comercialId'].includes(campo) ? 1 : -1) };
    renderClientes();
    const cabecera = document.querySelector(`#tablaClientes th[data-orden="${campo}"]`);
    if (cabecera) cabecera.focus();
  };
  $('tablaClientes').addEventListener('click', ev => { const th = ev.target.closest('[data-orden]'); if (th) ordenar(th); });
  $('tablaClientes').addEventListener('keydown', ev => {
    const th = ev.target.closest('[data-orden]');
    if (th && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); ordenar(th); }
  });
  $('resumenInforme').addEventListener('click', ev => {
    const a = ev.target.closest('[data-ir]');
    if (!a) return;
    ev.preventDefault();
    const destino = $(a.dataset.ir);
    destino.open = true;
    destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  prepararImpresion();

  U.iniciarPestanas(id => { estado.pestana = id; renderTodo(); });
})();
