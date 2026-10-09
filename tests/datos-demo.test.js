'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { generarDatosDemo } = require('../assets/js/datos-demo.js');
const C = require('../assets/js/calculos.js');

const FECHAS = [new Date(2026, 9, 9), new Date(2027, 2, 17)];
const porNombre = (datos, nombre) => datos.clientes.find(c => c.nombre === nombre);

test('es determinista con la misma semilla y fecha', () => {
  const a = generarDatosDemo({ hoy: FECHAS[0] });
  const b = generarDatosDemo({ hoy: FECHAS[0] });
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

test('estructura coherente', () => {
  const d = generarDatosDemo({ hoy: FECHAS[0] });
  const ids = lista => new Set(lista.map(x => x.id));
  const materiales = ids(d.materiales);
  const maquinas = ids(d.maquinas);
  const familias = ids(d.familias);
  const productos = ids(d.productos);
  const clientes = ids(d.clientes);

  assert.equal(d.familias.filter(f => f.tipo === 'propia').length, 9);
  assert.equal(d.familias.filter(f => f.tipo === 'distribucion').length, 4);
  const propios = d.productos.filter(p => p.escandallo);
  assert.ok(propios.length >= 20);
  for (const p of d.productos) assert.ok(familias.has(p.familiaId), p.id);
  for (const p of propios) {
    assert.ok(p.ruta.length > 0, p.id);
    for (const e of p.escandallo) assert.ok(materiales.has(e.materialId), `${p.id} → ${e.materialId}`);
    for (const r of p.ruta) assert.ok(maquinas.has(r.maquinaId), `${p.id} → ${r.maquinaId}`);
  }
  assert.ok(d.clientes.length >= 40);
  assert.deepEqual([...new Set(d.clientes.map(c => c.comercialId))].sort(), ['alvaro', 'javi', 'javi-jefe']);
  assert.equal(d.clientes.filter(c => C.diasEntre(c.fechaAlta, d.hoy) <= 90).length, 5);
  const inicio = new Date(2023, 9, 1);
  for (const p of d.pedidos) {
    assert.ok(clientes.has(p.clienteId));
    assert.ok(p.fecha <= d.hoy && p.fecha >= inicio, p.fecha.toISOString());
    for (const l of p.lineas) assert.ok(productos.has(l.productoId) && l.cantidad > 0 && l.importe > 0);
  }
  for (const v of d.visitas) assert.ok(clientes.has(v.clienteId) && v.fecha <= d.hoy);
  assert.ok(d.muestras.length >= 12);
  assert.ok(d.muestras.filter(m => m.estado === 'pendiente' && C.diasEntre(m.fechaEnvio, d.hoy) > 14).length >= 3);
  assert.deepEqual(d.ordenes, []);
});

for (const hoy of FECHAS) {
  const etiqueta = C.fechaCorta(hoy);

  test(`casos preparados de producción (${etiqueta})`, () => {
    const d = generarDatosDemo({ hoy });
    const familias = C.resumenFamilias(d, 12);
    const franela = familias.find(f => f.familiaId === 'franela');
    const sisal = familias.find(f => f.familiaId === 'sisal');
    assert.ok(franela.cobertura >= 24 && franela.cobertura <= 36, `franela ${franela.cobertura}`);
    assert.equal(franela.estado, 'sobrestock');
    assert.ok(sisal.cobertura < 1, `sisal ${sisal.cobertura}`);
    assert.equal(sisal.estado, 'rotura');
    assert.ok(franela.fabricado12 > franela.vendido12);

    const grapas = C.necesidadesMaterial(d, [{ productoId: 'DS-200-G', cantidad: 800 }]).find(m => m.materialId === 'grapas');
    assert.equal(grapas.estado, 'falta');
    const pocas = C.necesidadesMaterial(d, [{ productoId: 'DS-200-G', cantidad: 100 }]).find(m => m.materialId === 'grapas');
    assert.equal(pocas.estado, 'ok');
  });

  test(`casos preparados de ventas (${etiqueta})`, () => {
    const d = generarDatosDemo({ hoy });
    const alba = porNombre(d, 'Talleres Alba');
    const bajo = C.alertasBajoConsumo(d, { base: 6 });
    const albaSisal = bajo.find(a => a.clienteId === alba.id && a.familiaId === 'sisal');
    assert.ok(albaSisal, 'Talleres Alba debería tener alerta de sisal');
    assert.ok(albaSisal.caida >= 0.4, `caída ${albaSisal.caida}`);
    assert.ok(bajo.length >= 3 && bajo.length <= 15, `alertas de bajo consumo: ${bajo.length}`);

    const gandia = porNombre(d, 'Distribuciones Gandía');
    const proximo = C.alertasProximoPedido(d, {}).find(a => a.clienteId === gandia.id && a.productoId === 'AC-125-10');
    assert.ok(proximo, 'Gandía debería tener próximo pedido de corte inox');
    assert.equal(proximo.estado, 'esta-semana');
    assert.ok(Math.abs(proximo.intervalo - 90) <= 1);

    const turia = porNombre(d, 'Inoxidables del Turia');
    const crece = C.alertasCrecimiento(d, {}).find(a => a.clienteId === turia.id);
    assert.ok(crece && crece.var12 >= 0.35, `crecimiento ${crece && crece.var12}`);

    const visitas = C.informeClientesYVisitas(d, {});
    assert.equal(visitas.nuevos.length, 5);
    assert.ok(visitas.sinVisita.length >= 3);
  });
}
