/* ============================================================
   GRUPO BOLBAITE — Intranet demo · Cálculos
   Funciones puras (sin DOM) para producción y ventas.
   Script clásico: publica window.BolbaiteCalculos y, en Node,
   module.exports (para los tests con `node --test`).
   ============================================================ */
(function (raiz) {
  'use strict';

  const DIA = 86400000;
  const DIAS_MES = 30.44;
  const LOTE_ESTANDAR = 500;

  /* ---------- Fechas ---------- */

  function mesClave(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function soloDia(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function sumarDias(d, n) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  }

  // Días de a → b (positivo si b es posterior)
  function diasEntre(a, b) {
    return Math.round((soloDia(b) - soloDia(a)) / DIA);
  }

  // Las `n` claves de mes completas anteriores al mes en curso (de la más antigua a la más reciente),
  // desplazadas `desplazamiento` meses hacia atrás.
  function mesesCompletos(hoy, n, desplazamiento = 0) {
    const claves = [];
    for (let i = n + desplazamiento; i > desplazamiento; i--) {
      claves.push(mesClave(new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)));
    }
    return claves;
  }

  function inicioSemana(d) {
    const dia = (d.getDay() + 6) % 7; // lunes = 0
    return sumarDias(d, -dia);
  }

  /* ---------- Índices en caché ---------- */

  const cacheMapas = new WeakMap();
  function mapa(lista) {
    let m = cacheMapas.get(lista);
    if (!m) {
      m = new Map(lista.map(x => [x.id, x]));
      cacheMapas.set(lista, m);
    }
    return m;
  }

  // Líneas de venta aplanadas con todo el contexto, en caché por array de pedidos.
  const cacheLineas = new WeakMap();
  function lineasVenta(datos) {
    let lineas = cacheLineas.get(datos.pedidos);
    if (lineas) return lineas;
    const clientes = mapa(datos.clientes);
    const productos = mapa(datos.productos);
    const familias = mapa(datos.familias);
    lineas = [];
    for (const p of datos.pedidos) {
      const cli = clientes.get(p.clienteId);
      const mes = mesClave(p.fecha);
      for (const l of p.lineas) {
        const prod = productos.get(l.productoId);
        const fam = familias.get(prod.familiaId);
        lineas.push({
          pedidoId: p.id,
          fecha: p.fecha,
          mes,
          clienteId: p.clienteId,
          comercialId: cli.comercialId,
          provincia: cli.provincia,
          productoId: l.productoId,
          familiaId: prod.familiaId,
          tipoFamilia: fam ? fam.tipo : 'propia',
          cantidad: l.cantidad,
          importe: l.importe,
        });
      }
    }
    cacheLineas.set(datos.pedidos, lineas);
    return lineas;
  }

  // productoId → { 'AAAA-MM': unidades }
  const cacheMensual = new WeakMap();
  function unidadesMensuales(datos) {
    let m = cacheMensual.get(datos.pedidos);
    if (m) return m;
    m = new Map();
    for (const l of lineasVenta(datos)) {
      let porMes = m.get(l.productoId);
      if (!porMes) { porMes = {}; m.set(l.productoId, porMes); }
      porMes[l.mes] = (porMes[l.mes] || 0) + l.cantidad;
    }
    cacheMensual.set(datos.pedidos, m);
    return m;
  }

  /* ---------- Producción ---------- */

  function cantidadValida(c) {
    const n = Number(c);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function lineasValidas(datos, lineas) {
    const productos = mapa(datos.productos);
    return (lineas || [])
      .map(l => ({ productoId: l.productoId, cantidad: cantidadValida(l.cantidad), producto: productos.get(l.productoId) }))
      .filter(l => l.cantidad > 0 && l.producto && l.producto.escandallo);
  }

  function ventaMediaMensual(datos, productoId, meses) {
    const porMes = unidadesMensuales(datos).get(productoId);
    if (!porMes) return 0;
    let total = 0;
    for (const k of mesesCompletos(datos.hoy, meses)) total += porMes[k] || 0;
    return total / meses;
  }

  function unidadesEnFabricacion(datos, productoId) {
    let total = 0;
    for (const o of datos.ordenes || []) {
      for (const l of o.lineas) if (l.productoId === productoId) total += cantidadValida(l.cantidad);
    }
    return total;
  }

  function stockMaterialDisponible(datos, materialId) {
    const mat = mapa(datos.materiales).get(materialId);
    let consumido = 0;
    for (const o of datos.ordenes || []) {
      for (const l of lineasValidas(datos, o.lineas)) {
        for (const e of l.producto.escandallo) {
          if (e.materialId === materialId) consumido += e.cantidad * l.cantidad;
        }
      }
    }
    return mat.stock - consumido;
  }

  function estadoMaterial(quedaria, stock) {
    if (quedaria < 0) return 'falta';
    const pct = stock > 0 ? quedaria / stock : 0;
    if (pct >= 0.5) return 'ok';
    if (pct >= 0.2) return 'aviso';
    return 'critico';
  }

  function necesidadesMaterial(datos, lineas) {
    const materiales = mapa(datos.materiales);
    const acumulado = new Map();
    for (const l of lineasValidas(datos, lineas)) {
      for (const e of l.producto.escandallo) {
        let a = acumulado.get(e.materialId);
        if (!a) { a = { necesario: 0, usadoPor: new Set() }; acumulado.set(e.materialId, a); }
        a.necesario += e.cantidad * l.cantidad;
        a.usadoPor.add(l.productoId);
      }
    }
    const resultado = [];
    for (const [materialId, a] of acumulado) {
      const mat = materiales.get(materialId);
      const stock = stockMaterialDisponible(datos, materialId);
      const quedaria = stock - a.necesario;
      resultado.push({
        materialId,
        nombre: mat.nombre,
        unidad: mat.unidad,
        necesario: a.necesario,
        stock,
        quedaria,
        pct: stock > 0 ? quedaria / stock : (quedaria < 0 ? -1 : 0),
        estado: estadoMaterial(quedaria, stock),
        coste: a.necesario * mat.costeUd,
        usadoPor: [...a.usadoPor],
      });
    }
    return resultado;
  }

  function necesidadesMaquina(datos, lineas) {
    const maquinas = mapa(datos.maquinas);
    const tarifaOperario = datos.config.costeOperarioHora;
    const acumulado = new Map();
    for (const l of lineasValidas(datos, lineas)) {
      for (const r of l.producto.ruta || []) {
        let a = acumulado.get(r.maquinaId);
        if (!a) { a = { minPreparacion: 0, minProduccion: 0, usadoPor: new Set() }; acumulado.set(r.maquinaId, a); }
        a.minPreparacion += r.minPreparacion;
        a.minProduccion += r.minUnidad * l.cantidad;
        a.usadoPor.add(l.productoId);
      }
    }
    const resultado = [];
    for (const [maquinaId, a] of acumulado) {
      const maq = maquinas.get(maquinaId);
      const horas = (a.minPreparacion + a.minProduccion) / 60;
      resultado.push({
        maquinaId,
        nombre: maq.nombre,
        operarios: maq.operarios,
        horasPreparacion: a.minPreparacion / 60,
        horasProduccion: a.minProduccion / 60,
        horas,
        costeMaquina: horas * maq.tarifaHora,
        costeManoObra: horas * maq.operarios * tarifaOperario,
        usadoPor: [...a.usadoPor],
      });
    }
    return resultado;
  }

  function resumenOrden(datos, lineas) {
    const validas = lineasValidas(datos, lineas);
    const materiales = necesidadesMaterial(datos, validas);
    const maquinas = necesidadesMaquina(datos, validas);
    const suma = (lista, campo) => lista.reduce((t, x) => t + x[campo], 0);

    const porLinea = validas.map(l => {
      const una = [{ productoId: l.productoId, cantidad: l.cantidad }];
      const mats = necesidadesMaterial(datos, una);
      const maqs = necesidadesMaquina(datos, una);
      const coste = suma(mats, 'coste') + suma(maqs, 'costeMaquina') + suma(maqs, 'costeManoObra');
      return { productoId: l.productoId, cantidad: l.cantidad, coste, costeUnidad: coste / l.cantidad, horas: suma(maqs, 'horas') };
    });

    const costeMateriales = suma(materiales, 'coste');
    const costeMaquina = suma(maquinas, 'costeMaquina');
    const costeManoObra = suma(maquinas, 'costeManoObra');
    const horasMax = maquinas.reduce((m, x) => Math.max(m, x.horas), 0);
    const cuello = maquinas.find(x => x.horas === horasMax);
    return {
      materiales,
      maquinas,
      lineas: porLinea,
      costeMateriales,
      costeMaquina,
      costeManoObra,
      total: costeMateriales + costeMaquina + costeManoObra,
      horas: suma(maquinas, 'horas'),
      plazoJornadas: horasMax / datos.config.horasJornada,
      cuelloBotella: cuello ? cuello.nombre : null,
      unidades: suma(validas, 'cantidad'),
    };
  }

  function costeUnitarioEstandar(datos, productoId) {
    const r = resumenOrden({ ...datos, ordenes: [] }, [{ productoId, cantidad: LOTE_ESTANDAR }]);
    return r.lineas.length ? r.lineas[0].costeUnidad : 0;
  }

  function mesesParaVender(cantidad, media) {
    if (!(cantidad > 0)) return 0;
    return media > 0 ? cantidad / media : Infinity;
  }

  function estadoTiempoVenta(meses) {
    if (meses <= 6) return 'ok';
    if (meses <= 12) return 'aviso';
    return 'critico';
  }

  function cantidadSugerida(datos, productoId, mesesObjetivo, base) {
    const prod = mapa(datos.productos).get(productoId);
    const media = ventaMediaMensual(datos, productoId, base);
    const necesidad = media * mesesObjetivo - prod.stock - unidadesEnFabricacion(datos, productoId);
    return Math.max(0, Math.ceil(necesidad));
  }

  function cobertura(stock, media) {
    if (media > 0) return stock / media;
    return stock > 0 ? Infinity : null;
  }

  function estadoCobertura(meses) {
    if (meses === null || meses === undefined || Number.isNaN(meses)) return 'sin-datos';
    if (meses < 1) return 'rotura';
    if (meses < 2) return 'bajo';
    if (meses <= 6) return 'correcto';
    if (meses <= 12) return 'alto';
    return 'sobrestock';
  }

  function productosDeFamilia(datos, familiaId) {
    return datos.productos.filter(p => p.familiaId === familiaId);
  }

  function tendenciaFamilia(datos, familiaId) {
    const meses = mesesCompletos(datos.hoy, 36);
    const unidades = meses.map(() => 0);
    const importe = meses.map(() => 0);
    const indice = new Map(meses.map((k, i) => [k, i]));
    for (const l of lineasVenta(datos)) {
      if (l.familiaId !== familiaId) continue;
      const i = indice.get(l.mes);
      if (i === undefined) continue;
      unidades[i] += l.cantidad;
      importe[i] += l.importe;
    }
    const ultimos = unidades.slice(-3).reduce((a, b) => a + b, 0);
    const anterior = unidades.slice(-15, -12).reduce((a, b) => a + b, 0);
    return { meses, unidades, importe, variacion: anterior > 0 ? ultimos / anterior - 1 : null };
  }

  function fabricadoUltimosMeses(datos, productoId, meses) {
    const claves = new Set(mesesCompletos(datos.hoy, meses));
    let total = 0;
    for (const p of datos.produccionHistorica || []) {
      if (p.productoId === productoId && claves.has(p.mes)) total += p.unidades;
    }
    return total;
  }

  function resumenProducto(datos, prod, base) {
    const media = ventaMediaMensual(datos, prod.id, base);
    const enFabricacion = unidadesEnFabricacion(datos, prod.id);
    const cob = cobertura(prod.stock + enFabricacion, media);
    const costeUd = costeUnitarioEstandar(datos, prod.id);
    return {
      productoId: prod.id,
      ref: prod.ref,
      nombre: prod.nombre,
      familiaId: prod.familiaId,
      stock: prod.stock,
      enFabricacion,
      media,
      cobertura: cob,
      estado: estadoCobertura(cob),
      costeUd,
      valorStock: prod.stock * costeUd,
      fabricado12: fabricadoUltimosMeses(datos, prod.id, 12),
      vendido12: ventaMediaMensual(datos, prod.id, 12) * 12,
    };
  }

  function resumenProductos(datos, familiaId, base) {
    return productosDeFamilia(datos, familiaId)
      .filter(p => p.escandallo)
      .map(p => resumenProducto(datos, p, base));
  }

  function resumenFamilias(datos, base) {
    return datos.familias.filter(f => f.tipo === 'propia').map(f => {
      const prods = resumenProductos(datos, f.id, base);
      const suma = campo => prods.reduce((t, p) => t + p[campo], 0);
      const media = suma('media');
      const stock = suma('stock');
      const enFabricacion = suma('enFabricacion');
      const cob = cobertura(stock + enFabricacion, media);
      return {
        familiaId: f.id,
        nombre: f.nombre,
        productos: prods,
        stock,
        enFabricacion,
        media,
        cobertura: cob,
        estado: estadoCobertura(cob),
        valorStock: suma('valorStock'),
        fabricado12: suma('fabricado12'),
        vendido12: suma('vendido12'),
      };
    });
  }

  /* ---------- Formato para los textos de las alertas ---------- */

  // Agrupa miles con punto siempre (Intl en es-ES no agrupa números de 4 cifras).
  function numero(n, decimales = 0) {
    const [entera, dec] = Math.abs(n).toFixed(decimales).split('.');
    const agrupada = entera.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (n < 0 && Number(entera + (dec || '')) !== 0 ? '−' : '') + agrupada + (dec ? ',' + dec : '');
  }

  function fechaCorta(d) {
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  }

  /* ---------- Ventas ---------- */

  function ventasFiltradas(datos, filtros = {}) {
    const meses = filtros.meses ? new Set(filtros.meses) : null;
    return lineasVenta(datos).filter(l =>
      (!filtros.comercialId || l.comercialId === filtros.comercialId) &&
      (!filtros.provincia || l.provincia === filtros.provincia) &&
      (!filtros.familiaId || l.familiaId === filtros.familiaId) &&
      (!filtros.clienteId || l.clienteId === filtros.clienteId) &&
      (!meses || meses.has(l.mes)));
  }

  function agregarPor(lineas, clave) {
    const obtener = typeof clave === 'function' ? clave : l => l[clave];
    const acumulado = new Map();
    for (const l of lineas) {
      const k = obtener(l);
      let a = acumulado.get(k);
      if (!a) { a = { clave: k, importe: 0, cantidad: 0 }; acumulado.set(k, a); }
      a.importe += l.importe;
      a.cantidad += l.cantidad;
    }
    return [...acumulado.values()].sort((a, b) => b.importe - a.importe);
  }

  function serieMensual(lineas, claves, campo = 'importe') {
    const indice = new Map(claves.map((k, i) => [k, i]));
    const serie = claves.map(() => 0);
    for (const l of lineas) {
      const i = indice.get(l.mes);
      if (i !== undefined) serie[i] += l[campo];
    }
    return serie;
  }

  function sumaImporte(lineas) {
    return lineas.reduce((t, l) => t + l.importe, 0);
  }

  function variacion(actual, anterior) {
    return anterior > 0 ? actual / anterior - 1 : null;
  }

  function kpisVentas(datos, filtros, meses) {
    const claves = mesesCompletos(datos.hoy, meses);
    const actuales = ventasFiltradas(datos, { ...filtros, meses: claves });
    const ventas = sumaImporte(actuales);
    const anterior = meses >= 36 ? null : sumaImporte(ventasFiltradas(datos, { ...filtros, meses: mesesCompletos(datos.hoy, meses, 12) }));
    const pedidos = new Set(actuales.map(l => l.pedidoId)).size;
    const desde = new Date(datos.hoy.getFullYear(), datos.hoy.getMonth() - meses, 1);
    const hasta = new Date(datos.hoy.getFullYear(), datos.hoy.getMonth(), 1);
    const clientesNuevos = datos.clientes.filter(c =>
      (!filtros.comercialId || c.comercialId === filtros.comercialId) &&
      (!filtros.provincia || c.provincia === filtros.provincia) &&
      c.fechaAlta >= desde && c.fechaAlta < hasta).length;
    return {
      ventas,
      ventasAnterior: anterior,
      variacion: anterior === null ? null : variacion(ventas, anterior),
      clientesActivos: new Set(actuales.map(l => l.clienteId)).size,
      pedidos,
      ticketMedio: pedidos ? ventas / pedidos : 0,
      clientesNuevos,
      meses: claves,
    };
  }

  function clientesDe(datos, comercialId) {
    return datos.clientes.filter(c => !comercialId || c.comercialId === comercialId);
  }

  // Pedidos agregados (fecha + cantidad) por grupo, ordenados por fecha.
  function pedidosAgrupados(lineas, clave) {
    const grupos = new Map();
    for (const l of lineas) {
      const k = clave(l);
      let g = grupos.get(k);
      if (!g) { g = { muestra: l, pedidos: new Map() }; grupos.set(k, g); }
      let p = g.pedidos.get(l.pedidoId);
      if (!p) { p = { fecha: l.fecha, cantidad: 0 }; g.pedidos.set(l.pedidoId, p); }
      p.cantidad += l.cantidad;
    }
    for (const g of grupos.values()) g.lista = [...g.pedidos.values()].sort((a, b) => a.fecha - b.fecha);
    return grupos;
  }

  function mediana(valores) {
    const v = [...valores].sort((a, b) => a - b);
    const m = Math.floor(v.length / 2);
    return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
  }

  function intervalos(lista) {
    const r = [];
    for (let i = 1; i < lista.length; i++) r.push(diasEntre(lista[i - 1].fecha, lista[i].fecha));
    return r;
  }

  // Uds/mes de un conjunto de pedidos. Cada pedido cubre ~`intervalo` días, así que el periodo
  // va del primer pedido hasta el final de la ventana o hasta que se agota el último pedido.
  function tasaConsumo(pedidos, finVentana, intervalo) {
    if (!pedidos.length) return 0;
    const primero = pedidos[0].fecha;
    const finCobertura = sumarDias(pedidos[pedidos.length - 1].fecha, intervalo);
    const fin = finCobertura > finVentana ? finCobertura : finVentana;
    const dias = Math.max(1, diasEntre(primero, fin));
    return pedidos.reduce((t, p) => t + p.cantidad, 0) / dias * DIAS_MES;
  }

  const NOMBRE_BASE = { 3: 'trimestral', 6: 'semestral', 12: 'anual' };

  function alertasBajoConsumo(datos, { base = 6, comercialId } = {}) {
    const hoy = soloDia(datos.hoy);
    const hace24m = sumarDias(hoy, -730);
    const clientes = mapa(datos.clientes);
    const familias = mapa(datos.familias);
    const grupos = pedidosAgrupados(ventasFiltradas(datos, { comercialId }), l => l.clienteId + '|' + l.familiaId);
    const alertas = [];
    for (const g of grupos.values()) {
      const lista = g.lista.filter(p => p.fecha > hace24m && p.fecha <= hoy);
      if (lista.length < 3) continue;
      const anteriores = lista.filter(p => diasEntre(p.fecha, hoy) > 60);
      if (anteriores.length < 2) continue;
      const intervalo = Math.max(1, Math.round(mediana(intervalos(anteriores))));
      const ventana = Math.min(180, Math.max(60, 2 * intervalo));
      const inicioReciente = sumarDias(hoy, -ventana);
      const inicioBase = sumarDias(inicioReciente, -Math.round(base * DIAS_MES));
      const pedidosBase = lista.filter(p => p.fecha > inicioBase && p.fecha <= inicioReciente);
      if (!pedidosBase.length) continue;
      const recientes = lista.filter(p => p.fecha > inicioReciente);
      const tasaBase = tasaConsumo(pedidosBase, inicioReciente, intervalo);
      const tasaReciente = tasaConsumo(recientes, hoy, intervalo);
      const caida = 1 - tasaReciente / tasaBase;
      if (caida < 0.25) continue;
      const cli = clientes.get(g.muestra.clienteId);
      const fam = familias.get(g.muestra.familiaId);
      const reciente = recientes.length
        ? `reciente ${numero(tasaReciente)} uds/mes`
        : `sin pedidos en los últimos ${ventana} días`;
      alertas.push({
        clienteId: cli.id,
        cliente: cli.nombre,
        comercialId: cli.comercialId,
        familiaId: fam.id,
        familia: fam.nombre,
        caida,
        tasaBase,
        tasaReciente,
        ventana,
        base,
        nivel: caida >= 0.5 ? 'critico' : 'aviso',
        texto: `${cli.nombre} está un ${numero(caida * 100)} % por debajo de su consumo medio de ${fam.nombre} (media ${NOMBRE_BASE[base] || base + ' meses'} ${numero(tasaBase)} uds/mes · ${reciente})`,
      });
    }
    return alertas.sort((a, b) => b.caida - a.caida);
  }

  const ORDEN_ESTADO_PEDIDO = { retrasado: 0, 'esta-semana': 1, proximas: 2 };

  function alertasProximoPedido(datos, { comercialId } = {}) {
    const hoy = soloDia(datos.hoy);
    const hace24m = sumarDias(hoy, -730);
    const lunes = inicioSemana(hoy);
    const domingo = sumarDias(lunes, 6);
    const limiteProximas = sumarDias(domingo, 14);
    const clientes = mapa(datos.clientes);
    const productos = mapa(datos.productos);
    const grupos = pedidosAgrupados(ventasFiltradas(datos, { comercialId }), l => l.clienteId + '|' + l.productoId);
    const alertas = [];
    for (const g of grupos.values()) {
      const lista = g.lista.filter(p => p.fecha > hace24m && p.fecha <= hoy);
      if (lista.length < 3) continue;
      const ultimos = lista.slice(-7);
      const difs = intervalos(ultimos);
      const intervalo = Math.round(difs.reduce((a, b) => a + b, 0) / difs.length);
      if (intervalo < 1) continue;
      const cantidadMedia = ultimos.slice(-6).reduce((t, p) => t + p.cantidad, 0) / Math.min(6, ultimos.length);
      const ultimo = ultimos[ultimos.length - 1].fecha;
      const prevista = sumarDias(ultimo, intervalo);
      let estado = null;
      let retraso = 0;
      if (prevista < lunes) {
        retraso = diasEntre(prevista, hoy);
        if (retraso <= intervalo) estado = 'retrasado';
      } else if (prevista <= domingo) {
        estado = 'esta-semana';
      } else if (prevista <= limiteProximas) {
        estado = 'proximas';
      }
      if (!estado) continue;
      const cli = clientes.get(g.muestra.clienteId);
      const prod = productos.get(g.muestra.productoId);
      const cuando = estado === 'esta-semana' ? 'le toca esta semana'
        : estado === 'retrasado' ? `lleva ${retraso} días de retraso`
        : `previsto el ${fechaCorta(prevista)}`;
      alertas.push({
        clienteId: cli.id,
        cliente: cli.nombre,
        comercialId: cli.comercialId,
        productoId: prod.id,
        producto: prod.nombre,
        intervalo,
        cantidadMedia,
        ultimo,
        prevista,
        estado,
        retraso,
        texto: `${cli.nombre} pide ${prod.nombre} cada ~${intervalo} días (~${numero(cantidadMedia)} uds). Último pedido ${fechaCorta(ultimo)}: ${cuando}`,
      });
    }
    return alertas.sort((a, b) =>
      ORDEN_ESTADO_PEDIDO[a.estado] - ORDEN_ESTADO_PEDIDO[b.estado] ||
      (a.estado === 'retrasado' ? b.retraso - a.retraso : a.prevista - b.prevista));
  }

  function ultimaVisitaPorCliente(datos) {
    const m = new Map();
    for (const v of datos.visitas) {
      const actual = m.get(v.clienteId);
      if (!actual || v.fecha > actual) m.set(v.clienteId, v.fecha);
    }
    return m;
  }

  function ultimaCompraPorCliente(datos) {
    const m = new Map();
    for (const p of datos.pedidos) {
      const actual = m.get(p.clienteId);
      if (!actual || p.fecha > actual) m.set(p.clienteId, p.fecha);
    }
    return m;
  }

  function informeClientesYVisitas(datos, { comercialId } = {}) {
    const hoy = soloDia(datos.hoy);
    const clientes = clientesDe(datos, comercialId);
    const ids = new Set(clientes.map(c => c.id));
    const porId = mapa(datos.clientes);
    const ultimaVisita = ultimaVisitaPorCliente(datos);
    const ultimaCompra = ultimaCompraPorCliente(datos);

    const nuevos = clientes
      .filter(c => diasEntre(c.fechaAlta, hoy) <= 90)
      .map(c => {
        const pedidos = datos.pedidos.filter(p => p.clienteId === c.id);
        const primera = pedidos.reduce((m, p) => (!m || p.fecha < m ? p.fecha : m), null);
        const ventas = pedidos.reduce((t, p) => t + p.lineas.reduce((s, l) => s + l.importe, 0), 0);
        return { clienteId: c.id, cliente: c.nombre, provincia: c.provincia, comercialId: c.comercialId, fechaAlta: c.fechaAlta, primeraCompra: primera, ventas };
      })
      .sort((a, b) => b.fechaAlta - a.fechaAlta);

    const ultimasVisitas = datos.visitas
      .filter(v => ids.has(v.clienteId))
      .sort((a, b) => b.fecha - a.fecha)
      .slice(0, 15)
      .map(v => ({ ...v, cliente: porId.get(v.clienteId).nombre }));

    const sinVisita = clientes
      .filter(c => { const u = ultimaCompra.get(c.id); return u && diasEntre(u, hoy) <= 183; })
      .map(c => {
        const v = ultimaVisita.get(c.id) || null;
        return { clienteId: c.id, cliente: c.nombre, comercialId: c.comercialId, ultimaVisita: v, dias: v ? diasEntre(v, hoy) : null, ultimaCompra: ultimaCompra.get(c.id) };
      })
      .filter(s => s.dias === null || s.dias > 60)
      .sort((a, b) => (b.dias === null ? Infinity : b.dias) - (a.dias === null ? Infinity : a.dias));

    return { nuevos, ultimasVisitas, sinVisita };
  }

  function informeMuestras(datos, { comercialId } = {}) {
    const hoy = soloDia(datos.hoy);
    const clientes = mapa(datos.clientes);
    const productos = mapa(datos.productos);
    const muestras = datos.muestras
      .filter(m => !comercialId || m.comercialId === comercialId)
      .map(m => {
        const dias = diasEntre(m.fechaEnvio, hoy);
        return { ...m, cliente: clientes.get(m.clienteId).nombre, producto: productos.get(m.productoId).nombre, dias, alerta: m.estado === 'pendiente' && dias > 14 };
      })
      .sort((a, b) => b.fechaEnvio - a.fechaEnvio);
    const recientes = muestras.filter(m => m.dias <= 183);
    const convertidas = recientes.filter(m => m.estado === 'pedido').length;
    return {
      muestras,
      enviadas6m: recientes.length,
      convertidas,
      conversion: recientes.length ? convertidas / recientes.length : null,
      pendientesAlerta: muestras.filter(m => m.alerta).length,
    };
  }

  function alertasCrecimiento(datos, { comercialId } = {}) {
    const hoy = datos.hoy;
    const familias = mapa(datos.familias);
    const periodos = {
      a12: new Set(mesesCompletos(hoy, 12)), b12: new Set(mesesCompletos(hoy, 12, 12)),
      a3: new Set(mesesCompletos(hoy, 3)), b3: new Set(mesesCompletos(hoy, 3, 3)),
    };
    const alertas = [];
    for (const c of clientesDe(datos, comercialId)) {
      const lineas = ventasFiltradas(datos, { clienteId: c.id });
      const total = (p, fam) => lineas.reduce((t, l) => t + (periodos[p].has(l.mes) && (!fam || l.familiaId === fam) ? l.importe : 0), 0);
      const a12 = total('a12');
      if (a12 < 1000) continue;
      const var12 = variacion(a12, total('b12'));
      const var3 = variacion(total('a3'), total('b3'));
      const sube12 = var12 !== null && var12 >= 0.2;
      const sube3 = var3 !== null && var3 >= 0.2;
      if (!sube12 && !sube3) continue;
      const [pa, pb, meses, v] = sube12 ? ['a12', 'b12', 12, var12] : ['a3', 'b3', 3, var3];
      let mejor = null;
      for (const famId of new Set(lineas.map(l => l.familiaId))) {
        const inc = total(pa, famId) - total(pb, famId);
        if (!mejor || inc > mejor.inc) mejor = { famId, inc };
      }
      const fam = familias.get(mejor.famId);
      alertas.push({
        clienteId: c.id,
        cliente: c.nombre,
        comercialId: c.comercialId,
        var12,
        var3,
        meses,
        familiaId: fam.id,
        familia: fam.nombre,
        incremento: mejor.inc,
        texto: `${c.nombre} sube un ${numero(v * 100)} % en los últimos ${meses} meses (${numero(total(pa))} € frente a ${numero(total(pb))} €), sobre todo por ${fam.nombre} (+${numero(mejor.inc)} €)`,
      });
    }
    return alertas.sort((a, b) => Math.max(b.var12 || 0, b.var3 || 0) - Math.max(a.var12 || 0, a.var3 || 0));
  }

  function carteraClientes(datos, filtros = {}) {
    const familias = mapa(datos.familias);
    const ultimaVisita = ultimaVisitaPorCliente(datos);
    const ultimaCompra = ultimaCompraPorCliente(datos);
    const a12 = new Set(mesesCompletos(datos.hoy, 12));
    const b12 = new Set(mesesCompletos(datos.hoy, 12, 12));
    const porCliente = new Map();
    for (const l of ventasFiltradas(datos, { familiaId: filtros.familiaId })) {
      let c = porCliente.get(l.clienteId);
      if (!c) { c = { a: 0, b: 0, familias: new Set() }; porCliente.set(l.clienteId, c); }
      if (a12.has(l.mes)) { c.a += l.importe; c.familias.add(l.familiaId); }
      else if (b12.has(l.mes)) c.b += l.importe;
    }
    return datos.clientes
      .filter(c =>
        (!filtros.comercialId || c.comercialId === filtros.comercialId) &&
        (!filtros.provincia || c.provincia === filtros.provincia) &&
        (!filtros.familiaId || porCliente.has(c.id)))
      .map(c => {
        const v = porCliente.get(c.id) || { a: 0, b: 0, familias: new Set() };
        return {
          clienteId: c.id,
          cliente: c.nombre,
          provincia: c.provincia,
          comercialId: c.comercialId,
          fechaAlta: c.fechaAlta,
          ventas12: v.a,
          variacion12: variacion(v.a, v.b),
          familias: [...v.familias].map(id => familias.get(id).nombre),
          ultimaCompra: ultimaCompra.get(c.id) || null,
          ultimaVisita: ultimaVisita.get(c.id) || null,
        };
      })
      .sort((a, b) => b.ventas12 - a.ventas12);
  }

  const api = {
    DIA, DIAS_MES, LOTE_ESTANDAR,
    mesClave, soloDia, sumarDias, diasEntre, mesesCompletos, inicioSemana,
    mapa, lineasVenta, numero, fechaCorta,
    ventaMediaMensual, unidadesEnFabricacion, stockMaterialDisponible,
    estadoMaterial, necesidadesMaterial, necesidadesMaquina, resumenOrden,
    costeUnitarioEstandar, mesesParaVender, estadoTiempoVenta, cantidadSugerida,
    cobertura, estadoCobertura, tendenciaFamilia, resumenProductos, resumenFamilias,
    ventasFiltradas, agregarPor, serieMensual, kpisVentas, variacion,
    alertasBajoConsumo, alertasProximoPedido, informeClientesYVisitas,
    informeMuestras, alertasCrecimiento, carteraClientes,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.BolbaiteCalculos = api;
})(typeof window !== 'undefined' ? window : globalThis);
