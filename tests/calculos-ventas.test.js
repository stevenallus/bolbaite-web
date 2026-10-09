'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../assets/js/calculos.js');
const { HOY, fecha, haceDias, datosBase, pedido } = require('./ayudas.js');

const cerca = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

// Pedidos periódicos: un pedido cada `intervalo` días, desde `desde` hasta `hasta` días atrás.
function periodicos(d, clienteId, productoId, intervalo, desde, hasta, cantidad) {
  for (let dias = desde; dias >= hasta; dias -= intervalo) {
    pedido(d, clienteId, haceDias(dias), productoId, typeof cantidad === 'function' ? cantidad(dias) : cantidad);
  }
}

test('alertasBajoConsumo: 30 % → aviso, 60 % → crítico, estable → nada', () => {
  const d = datosBase();
  // Sisal (p2) cada 30 días; en los últimos 60 días baja la cantidad
  periodicos(d, 'c1', 'p2', 30, 710, 20, dias => (dias < 60 ? 70 : 100));
  periodicos(d, 'c2', 'p2', 30, 710, 20, dias => (dias < 60 ? 40 : 100));
  // Tela (p1) cada 90 días, estable
  periodicos(d, 'c1', 'p1', 90, 710, 80, 400);

  const alertas = C.alertasBajoConsumo(d, { base: 6 });
  assert.equal(alertas.length, 2);
  const [primera, segunda] = alertas; // ordenadas por caída
  assert.equal(primera.clienteId, 'c2');
  assert.equal(primera.nivel, 'critico');
  cerca(primera.caida, 0.6, 0.01);
  assert.equal(segunda.clienteId, 'c1');
  assert.equal(segunda.nivel, 'aviso');
  cerca(segunda.caida, 0.3, 0.01);
  assert.match(segunda.texto, /^Talleres Uno está un 30 % por debajo de su consumo medio de Sisal \(media semestral 101 uds\/mes · reciente 71 uds\/mes\)$/);

  const soloAlvaro = C.alertasBajoConsumo(d, { base: 6, comercialId: 'alvaro' });
  assert.deepEqual(soloAlvaro.map(a => a.clienteId), ['c1']);
});

test('alertasBajoConsumo: sin pedidos recientes → caída del 100 %', () => {
  const d = datosBase();
  periodicos(d, 'c1', 'p2', 30, 700, 200, 100);
  const [a] = C.alertasBajoConsumo(d, { base: 12 });
  assert.equal(a.nivel, 'critico');
  cerca(a.caida, 1);
  assert.match(a.texto, /media anual/);
});

test('alertasProximoPedido: esta semana, retrasado, próximas y descartado', () => {
  const d = datosBase();
  periodicos(d, 'c1', 'p1', 30, 118, 28, 50);  // prevista dentro de 2 días (domingo)
  periodicos(d, 'c1', 'p2', 30, 130, 40, 20);  // prevista hace 10 días
  periodicos(d, 'c2', 'p1', 30, 110, 20, 60);  // prevista dentro de 10 días
  periodicos(d, 'c2', 'p2', 30, 190, 100, 10); // prevista hace 70 días: descartado

  const r = C.alertasProximoPedido(d, {});
  const estado = (c, p) => (r.find(x => x.clienteId === c && x.productoId === p) || {}).estado;
  assert.equal(estado('c1', 'p1'), 'esta-semana');
  assert.equal(estado('c1', 'p2'), 'retrasado');
  assert.equal(estado('c2', 'p1'), 'proximas');
  assert.equal(estado('c2', 'p2'), undefined);
  const retrasado = r.find(x => x.estado === 'retrasado');
  assert.equal(retrasado.retraso, 10);
  assert.equal(retrasado.intervalo, 30);
  assert.equal(r[0].estado, 'retrasado'); // primero los retrasados
  const estaSemana = r.find(x => x.estado === 'esta-semana');
  assert.match(estaSemana.texto, /^Talleres Uno pide Disco A cada ~30 días \(~50 uds\)\. Último pedido 11\/09\/2026: le toca esta semana$/);
});

test('informeMuestras: alerta tras 14 días sin feedback y conversión', () => {
  const d = datosBase();
  const muestra = (id, dias, estado) => d.muestras.push({ id, clienteId: 'c1', productoId: 'p1', comercialId: 'alvaro', fechaEnvio: haceDias(dias), estado, feedback: '' });
  muestra('s1', 15, 'pendiente');
  muestra('s2', 10, 'pendiente');
  muestra('s3', 30, 'pedido');
  muestra('s4', 300, 'pedido'); // fuera de los 6 meses para la conversión
  const r = C.informeMuestras(d, {});
  const porId = id => r.muestras.find(m => m.id === id);
  assert.equal(porId('s1').alerta, true);
  assert.equal(porId('s1').dias, 15);
  assert.equal(porId('s2').alerta, false);
  assert.equal(r.pendientesAlerta, 1);
  cerca(r.conversion, 1 / 3);
  assert.equal(r.muestras[0].id, 's2'); // más recientes primero
});

test('alertasCrecimiento: +25 % con ≥ 1.000 € sí; con 800 € o estable no', () => {
  const d = datosBase();
  d.clientes.push({ id: 'c3', nombre: 'Estable Tres', provincia: 'Valencia', comercialId: 'alvaro', fechaAlta: fecha(2020, 1, 1) });
  const meses = C.mesesCompletos(HOY, 24); // 2024-10 … 2026-09
  meses.forEach((k, i) => {
    const [a, m] = k.split('-').map(Number);
    const ultimoAno = i >= 12;
    pedido(d, 'c1', fecha(a, m, 15), 'p1', ultimoAno ? 20 : 16); // 1.200 € frente a 960 €
    if (i % 12 < 10) pedido(d, 'c2', fecha(a, m, 15), 'p1', ultimoAno ? 16 : 12.8); // 800 € frente a 640 €
    pedido(d, 'c3', fecha(a, m, 15), 'p1', 30);
  });
  const r = C.alertasCrecimiento(d, {});
  assert.deepEqual(r.map(x => x.clienteId), ['c1']);
  cerca(r[0].var12, 0.25);
  cerca(r[0].var3, 0);
  assert.equal(r[0].familia, 'Discos de tela');
  assert.match(r[0].texto, /^Talleres Uno sube un 25 % en los últimos 12 meses \(1\.200 € frente a 960 €\), sobre todo por Discos de tela \(\+240 €\)$/);

  const k12 = C.kpisVentas(d, { comercialId: 'alvaro' }, 12);
  cerca(k12.ventas, 1200 + 30 * 5 * 12);
  cerca(k12.variacion, (1200 + 1800) / (960 + 1800) - 1);
  assert.equal(k12.pedidos, 24);
  cerca(k12.ticketMedio, 3000 / 24);
  assert.equal(k12.clientesActivos, 2);
  assert.equal(C.kpisVentas(d, {}, 36).variacion, null);
});

test('informeClientesYVisitas: altas, últimas visitas y clientes sin visitar', () => {
  const d = datosBase();
  d.clientes.push({ id: 'c3', nombre: 'Nuevo Tres', provincia: 'Murcia', comercialId: 'javi', fechaAlta: haceDias(30) });
  pedido(d, 'c1', haceDias(40), 'p1', 10);
  pedido(d, 'c3', haceDias(20), 'p1', 10);
  pedido(d, 'c3', haceDias(5), 'p1', 4);
  d.visitas.push({ id: 'v1', clienteId: 'c1', comercialId: 'alvaro', fecha: haceDias(70), nota: 'Revisión' });
  d.visitas.push({ id: 'v2', clienteId: 'c3', comercialId: 'javi', fecha: haceDias(5), nota: 'Alta' });

  const r = C.informeClientesYVisitas(d, {});
  assert.deepEqual(r.nuevos.map(n => n.clienteId), ['c3']);
  assert.equal(r.nuevos[0].ventas, 70);
  assert.equal(C.diasEntre(r.nuevos[0].primeraCompra, HOY), 20);
  assert.equal(r.ultimasVisitas[0].clienteId, 'c3');
  assert.deepEqual(r.sinVisita.map(s => [s.clienteId, s.dias]), [['c1', 70]]);

  const javi = C.informeClientesYVisitas(d, { comercialId: 'javi' });
  assert.equal(javi.sinVisita.length, 0);
  assert.equal(javi.ultimasVisitas.length, 1);
});

test('ventasFiltradas, agregarPor y carteraClientes', () => {
  const d = datosBase();
  pedido(d, 'c1', fecha(2026, 9, 1), 'p1', 10); // 50 €
  pedido(d, 'c2', fecha(2026, 9, 2), 'p2', 10); // 80 €
  pedido(d, 'c2', fecha(2026, 8, 2), 'p1', 2);  // 10 €
  const lineas = C.ventasFiltradas(d, { meses: C.mesesCompletos(HOY, 3) });
  assert.equal(lineas.length, 3);
  const prov = C.agregarPor(lineas, 'provincia');
  assert.deepEqual(prov.map(p => [p.clave, p.importe]), [['Alicante', 90], ['Valencia', 50]]);
  assert.equal(C.ventasFiltradas(d, { familiaId: 'f2' }).length, 1);
  assert.equal(C.ventasFiltradas(d, { comercialId: 'alvaro', provincia: 'Alicante' }).length, 0);

  const cartera = C.carteraClientes(d, {});
  const c2 = cartera.find(c => c.clienteId === 'c2');
  assert.equal(c2.ventas12, 90);
  assert.deepEqual(c2.familias.sort(), ['Discos de tela', 'Sisal']);
  assert.equal(C.diasEntre(c2.ultimaCompra, fecha(2026, 9, 2)), 0);
  assert.equal(c2.ultimaVisita, null);
});
