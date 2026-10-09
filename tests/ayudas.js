// Datos mínimos escritos a mano para los tests de calculos.js
'use strict';

const HOY = new Date(2026, 9, 9); // viernes 9 oct 2026

function fecha(a, m, d) {
  return new Date(a, m - 1, d);
}

function haceDias(n, hoy = HOY) {
  return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - n);
}

function datosBase() {
  return {
    hoy: HOY,
    config: { costeOperarioHora: 20, horasJornada: 8 },
    familias: [
      { id: 'f1', nombre: 'Discos de tela', tipo: 'propia' },
      { id: 'f2', nombre: 'Sisal', tipo: 'propia' },
    ],
    materiales: [
      { id: 'm1', nombre: 'Tela de algodón', unidad: 'm²', costeUd: 2, stock: 100 },
      { id: 'm2', nombre: 'Grapas', unidad: 'uds', costeUd: 0.01, stock: 1000 },
    ],
    maquinas: [
      { id: 'k1', nombre: 'Cortadora 1', tarifaHora: 10, operarios: 1 },
      { id: 'k2', nombre: 'Cosedora 1', tarifaHora: 12, operarios: 2 },
    ],
    productos: [
      {
        id: 'p1', ref: 'DT-A', nombre: 'Disco A', familiaId: 'f1', precioVenta: 5, stock: 50,
        escandallo: [{ materialId: 'm1', cantidad: 0.5 }, { materialId: 'm2', cantidad: 10 }],
        ruta: [
          { maquinaId: 'k1', minPreparacion: 30, minUnidad: 1 },
          { maquinaId: 'k2', minPreparacion: 60, minUnidad: 3 },
        ],
      },
      {
        id: 'p2', ref: 'DS-B', nombre: 'Disco B', familiaId: 'f2', precioVenta: 8, stock: 0,
        escandallo: [{ materialId: 'm2', cantidad: 20 }],
        ruta: [{ maquinaId: 'k1', minPreparacion: 30, minUnidad: 2 }],
      },
    ],
    comerciales: [
      { id: 'alvaro', nombre: 'Álvaro' },
      { id: 'javi', nombre: 'Javi' },
    ],
    clientes: [
      { id: 'c1', nombre: 'Talleres Uno', provincia: 'Valencia', comercialId: 'alvaro', fechaAlta: fecha(2020, 1, 1) },
      { id: 'c2', nombre: 'Pulidos Dos', provincia: 'Alicante', comercialId: 'javi', fechaAlta: fecha(2020, 1, 1) },
    ],
    pedidos: [],
    produccionHistorica: [],
    visitas: [],
    muestras: [],
    ordenes: [],
  };
}

let contador = 0;
function pedido(datos, clienteId, fechaPedido, productoId, cantidad) {
  const prod = datos.productos.find(p => p.id === productoId);
  datos.pedidos.push({
    id: 'x' + (++contador),
    clienteId,
    fecha: fechaPedido,
    lineas: [{ productoId, cantidad, importe: cantidad * prod.precioVenta }],
  });
}

module.exports = { HOY, fecha, haceDias, datosBase, pedido };
