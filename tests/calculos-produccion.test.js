'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../assets/js/calculos.js');
const { HOY, fecha, datosBase, pedido } = require('./ayudas.js');

const cerca = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test('mesesCompletos excluye el mes en curso', () => {
  assert.deepEqual(C.mesesCompletos(HOY, 3), ['2026-07', '2026-08', '2026-09']);
  assert.deepEqual(C.mesesCompletos(new Date(2026, 0, 15), 2), ['2025-11', '2025-12']);
});

test('inicioSemana devuelve el lunes', () => {
  const lunes = C.inicioSemana(HOY);
  assert.equal(lunes.getDay(), 1);
  assert.equal(lunes.getDate(), 5);
  assert.equal(C.inicioSemana(new Date(2026, 9, 11)).getDate(), 5); // domingo
});

test('necesidadesMaterial suma entre líneas y marca faltantes', () => {
  const d = datosBase();
  const r = C.necesidadesMaterial(d, [{ productoId: 'p1', cantidad: 100 }, { productoId: 'p2', cantidad: 20 }]);
  const tela = r.find(x => x.materialId === 'm1');
  const grapas = r.find(x => x.materialId === 'm2');
  cerca(tela.necesario, 50);
  cerca(tela.quedaria, 50);
  assert.equal(tela.estado, 'ok');
  cerca(tela.coste, 100);
  cerca(grapas.necesario, 1400);
  cerca(grapas.quedaria, -400);
  assert.equal(grapas.estado, 'falta');
  assert.deepEqual(grapas.usadoPor.sort(), ['p1', 'p2']);
});

test('estadoMaterial respeta los límites 0,5 / 0,2', () => {
  assert.equal(C.estadoMaterial(50, 100), 'ok');
  assert.equal(C.estadoMaterial(49, 100), 'aviso');
  assert.equal(C.estadoMaterial(20, 100), 'aviso');
  assert.equal(C.estadoMaterial(19, 100), 'critico');
  assert.equal(C.estadoMaterial(0, 100), 'critico');
  assert.equal(C.estadoMaterial(-1, 100), 'falta');
  assert.equal(C.estadoMaterial(-5, 0), 'falta');
});

test('necesidadesMaquina cuenta la preparación una vez por línea', () => {
  const d = datosBase();
  const r = C.necesidadesMaquina(d, [{ productoId: 'p1', cantidad: 100 }, { productoId: 'p2', cantidad: 20 }]);
  const k1 = r.find(x => x.maquinaId === 'k1');
  const k2 = r.find(x => x.maquinaId === 'k2');
  cerca(k1.horasPreparacion, 1);
  cerca(k1.horasProduccion, 140 / 60);
  cerca(k1.horas, 200 / 60);
  cerca(k2.horas, 6);
  cerca(k2.costeMaquina, 72);
  cerca(k2.costeManoObra, 240);
});

test('resumenOrden: totales, coste unitario y plazo por cuello de botella', () => {
  const d = datosBase();
  const r = C.resumenOrden(d, [{ productoId: 'p1', cantidad: 100 }]);
  // materiales 100 × (0,5×2 + 10×0,01) = 110
  cerca(r.costeMateriales, 110);
  // k1: 130 min → 2,1667 h × 10 = 21,667 ; k2: 360 min → 6 h × 12 = 72
  cerca(r.costeMaquina, 130 / 60 * 10 + 72);
  // mano de obra: 2,1667 × 1 × 20 + 6 × 2 × 20
  cerca(r.costeManoObra, 130 / 60 * 20 + 240);
  cerca(r.total, 110 + 130 / 60 * 30 + 72 + 240);
  cerca(r.horas, 130 / 60 + 6);
  cerca(r.plazoJornadas, 6 / 8);
  assert.equal(r.lineas.length, 1);
  cerca(r.lineas[0].costeUnidad, r.total / 100);
});

test('las cantidades vacías, 0 o negativas se ignoran sin NaN', () => {
  const d = datosBase();
  const lineas = [{ productoId: 'p1', cantidad: 0 }, { productoId: 'p2', cantidad: '' }, { productoId: 'p1', cantidad: -5 }, { productoId: 'p2', cantidad: NaN }];
  assert.deepEqual(C.necesidadesMaterial(d, lineas), []);
  assert.deepEqual(C.necesidadesMaquina(d, lineas), []);
  const r = C.resumenOrden(d, lineas);
  assert.equal(r.total, 0);
  assert.equal(r.horas, 0);
  assert.equal(r.plazoJornadas, 0);
  assert.ok(!Number.isNaN(r.total));
});

test('ventaMediaMensual usa meses completos', () => {
  const d = datosBase();
  pedido(d, 'c1', fecha(2026, 9, 10), 'p1', 30);
  pedido(d, 'c1', fecha(2026, 8, 3), 'p1', 60);
  pedido(d, 'c1', fecha(2026, 10, 2), 'p1', 999); // mes en curso: no cuenta
  cerca(C.ventaMediaMensual(d, 'p1', 3), 30);
  cerca(C.ventaMediaMensual(d, 'p1', 1), 30);
  cerca(C.ventaMediaMensual(d, 'p2', 3), 0);
});

test('mesesParaVender y estadoTiempoVenta', () => {
  assert.equal(C.mesesParaVender(100, 0), Infinity);
  cerca(C.mesesParaVender(100, 50), 2);
  assert.equal(C.mesesParaVender(0, 0), 0);
  assert.equal(C.estadoTiempoVenta(6), 'ok');
  assert.equal(C.estadoTiempoVenta(6.01), 'aviso');
  assert.equal(C.estadoTiempoVenta(12), 'aviso');
  assert.equal(C.estadoTiempoVenta(12.1), 'critico');
  assert.equal(C.estadoTiempoVenta(Infinity), 'critico');
});

test('cobertura y estadoCobertura en los límites', () => {
  assert.equal(C.cobertura(10, 0), Infinity);
  assert.equal(C.cobertura(0, 0), null);
  cerca(C.cobertura(30, 10), 3);
  assert.equal(C.estadoCobertura(0.99), 'rotura');
  assert.equal(C.estadoCobertura(1), 'bajo');
  assert.equal(C.estadoCobertura(1.99), 'bajo');
  assert.equal(C.estadoCobertura(2), 'correcto');
  assert.equal(C.estadoCobertura(6), 'correcto');
  assert.equal(C.estadoCobertura(6.01), 'alto');
  assert.equal(C.estadoCobertura(12), 'alto');
  assert.equal(C.estadoCobertura(12.01), 'sobrestock');
  assert.equal(C.estadoCobertura(Infinity), 'sobrestock');
  assert.equal(C.estadoCobertura(null), 'sin-datos');
});

test('cantidadSugerida descuenta stock y órdenes en fabricación', () => {
  const d = datosBase();
  for (let m = 4; m <= 9; m++) pedido(d, 'c1', fecha(2026, m, 15), 'p1', 100);
  assert.equal(C.cantidadSugerida(d, 'p1', 3, 6), 250); // 300 − 50 de stock
  d.ordenes.push({ id: 'o1', fecha: HOY, lineas: [{ productoId: 'p1', cantidad: 100 }] });
  assert.equal(C.unidadesEnFabricacion(d, 'p1'), 100);
  assert.equal(C.cantidadSugerida(d, 'p1', 3, 6), 150);
  assert.equal(C.cantidadSugerida(d, 'p1', 0.1, 6), 0);
});

test('las órdenes confirmadas descuentan materia prima', () => {
  const d = datosBase();
  d.ordenes.push({ id: 'o1', fecha: HOY, lineas: [{ productoId: 'p1', cantidad: 20 }] });
  assert.equal(C.stockMaterialDisponible(d, 'm1'), 90);
  const r = C.necesidadesMaterial(d, [{ productoId: 'p1', cantidad: 10 }]);
  assert.equal(r.find(x => x.materialId === 'm1').stock, 90);
});

test('costeUnitarioEstandar usa una orden de 500 uds', () => {
  const d = datosBase();
  // p2: materiales 500×20×0,01 = 100 ; k1 (30 + 1000) min = 17,1667 h → 171,67 € máquina + 343,33 € mano de obra
  cerca(C.costeUnitarioEstandar(d, 'p2'), (100 + 1030 / 60 * 30) / 500);
});

test('tendenciaFamilia: 36 meses y variación de 3 m frente al año anterior', () => {
  const d = datosBase();
  pedido(d, 'c1', fecha(2026, 7, 10), 'p1', 40);
  pedido(d, 'c1', fecha(2026, 9, 10), 'p1', 80);
  pedido(d, 'c1', fecha(2025, 8, 10), 'p1', 100);
  const t = C.tendenciaFamilia(d, 'f1');
  assert.equal(t.meses.length, 36);
  assert.equal(t.meses[35], '2026-09');
  assert.equal(t.unidades[35], 80);
  cerca(t.variacion, 0.2);
  assert.equal(C.tendenciaFamilia(d, 'f2').variacion, null);
});

test('resumenFamilias agrega stock, media y estado por familia propia', () => {
  const d = datosBase();
  for (let m = 1; m <= 12; m++) pedido(d, 'c1', fecha(m >= 10 ? 2025 : 2026, m, 15), 'p1', 10);
  const r = C.resumenFamilias(d, 12);
  const f1 = r.find(x => x.familiaId === 'f1');
  cerca(f1.media, 10);
  assert.equal(f1.stock, 50);
  cerca(f1.cobertura, 5);
  assert.equal(f1.estado, 'correcto');
  assert.equal(r.find(x => x.familiaId === 'f2').estado, 'sin-datos');
});

test('propuestaCompra: repone faltantes y críticos hasta dejar el 50 % del stock', () => {
  const d = datosBase();
  const mats = C.necesidadesMaterial(d, [{ productoId: 'p1', cantidad: 100 }, { productoId: 'p2', cantidad: 20 }]);
  // tela: queda 50 de 100 → ok, no se compra · grapas: faltan 400 → comprar 400 + 500
  const r = C.propuestaCompra(mats);
  assert.equal(r.length, 1);
  assert.equal(r[0].materialId, 'm2');
  assert.equal(r[0].comprar, 900);
  cerca(r[0].coste, 9);
  assert.equal(r[0].motivo, 'falta');
  d.materiales[1].stock = 0;
  const sinStock = C.propuestaCompra(C.necesidadesMaterial(d, [{ productoId: 'p2', cantidad: 10 }]));
  assert.equal(sinStock[0].comprar, 200);
  d.materiales[1].stock = 1000;
  const critico = C.propuestaCompra(C.necesidadesMaterial(d, [{ productoId: 'p2', cantidad: 45 }])); // necesita 900, queda 100 (10 %)
  assert.equal(critico[0].comprar, 400);
  assert.equal(critico[0].motivo, 'critico');
});
