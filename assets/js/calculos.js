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

  const api = {
    DIA, DIAS_MES, LOTE_ESTANDAR,
    mesClave, soloDia, sumarDias, diasEntre, mesesCompletos, inicioSemana,
    mapa, lineasVenta,
    ventaMediaMensual, unidadesEnFabricacion, stockMaterialDisponible,
    estadoMaterial, necesidadesMaterial, necesidadesMaquina, resumenOrden,
    costeUnitarioEstandar, mesesParaVender, estadoTiempoVenta, cantidadSugerida,
    cobertura, estadoCobertura, tendenciaFamilia, resumenProductos, resumenFamilias,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.BolbaiteCalculos = api;
})(typeof window !== 'undefined' ? window : globalThis);
