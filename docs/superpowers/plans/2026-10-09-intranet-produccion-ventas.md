# Intranet Bolbaite (demo) — Plan de implementación

> **Para agentes:** ejecución nativa (el usuario pidió ejecutar sin más preguntas). Pasos con casillas `- [ ]`.

**Objetivo:** construir `produccion.html` y `ventas.html` con datos de demo deterministas, cálculos probados con `node --test` e interfaz con Chart.js.

**Arquitectura:** scripts clásicos (sin módulos ES, para que funcionen con `file://`). Los datos (`datos-demo.js`) y los cálculos (`calculos.js`) son puros y se exportan también con `module.exports` para los tests. La interfaz va en `ui-comun.js`, `produccion.js` y `ventas.js`.

**Tecnología:** HTML, CSS y JS vanilla, Chart.js 4.4.1 (jsDelivr) y Node 23 (`node --test`).

**Spec:** `docs/superpowers/specs/2026-10-09-intranet-produccion-ventas-design.md`

## Restricciones globales
- Sin build ni dependencias npm. Todo se abre con doble clic.
- Espacios de nombres globales: `window.BolbaiteDatos`, `window.BolbaiteCalculos` y `window.BolbaiteUI`.
- Clave de `localStorage`: `bolbaite-demo-ordenes`. Todo acceso va dentro de `try/catch`.
- Formatos en español (`Intl.NumberFormat('es-ES')`).
- Umbrales exactamente como en la spec (materiales 0,5 / 0,2; tiempo de venta 6 / 12; cobertura 1 / 2 / 6 / 12).

## Puntos de revisión (no los cubren los tests de una tarea concreta)
1. Cantidad vacía, 0 o negativa en una línea: la línea se ignora en los cálculos y nunca aparece `NaN`.
2. Referencia sin ventas: la media es 0, se muestra "sin ventas" y nunca `Infinity` ni `NaN`.
3. Sin `localStorage` (modo privado): la página funciona igual, solo que sin persistencia.
4. Sin Chart.js (sin conexión): los KPI y las tablas se siguen viendo y cada gráfica muestra un aviso.
5. Filtro de comercial y filtro cruzado sin resultados: estados vacíos con texto, sin errores.

Los puntos 1 y 2 se fijan con tests en la tarea 1. Los puntos 3 a 5 se verifican en el navegador (tareas 5 a 8).

---

### Tarea 1: Cálculos de producción (`assets/js/calculos.js`)
**Interfaces producidas:** `mesClave(d)`, `mesesCompletos(hoy, n)`, `diasEntre(a, b)`, `inicioSemana(d)`, `ventaMediaMensual(datos, productoId, meses)`, `unidadesEnFabricacion(datos, productoId)`, `stockMaterialDisponible(datos, materialId)`, `necesidadesMaterial(datos, lineas)`, `necesidadesMaquina(datos, lineas)`, `resumenOrden(datos, lineas)`, `mesesParaVender(cantidad, media)`, `estadoMaterial(quedaria, stock)`, `estadoTiempoVenta(meses)`, `costeUnitarioEstandar(datos, productoId)`, `cantidadSugerida(datos, productoId, mesesObjetivo, base)`, `cobertura(stock, media)`, `estadoCobertura(meses)`, `tendenciaFamilia(datos, familiaId)`, `resumenFamilias(datos, base)`, `resumenProductos(datos, familiaId, base)`.
`lineas` = `[{ productoId, cantidad }]`. `datos.ordenes` = `[{ id, fecha, lineas }]` (órdenes confirmadas).
- [ ] Tests en `tests/calculos.test.js` con un `datos` mínimo hecho a mano: suma de materiales entre líneas, estados en los límites (pct 0,5 → ok; 0,49 → aviso; 0,2 → aviso; 0,19 → crítico; negativo → falta; stock 0 → falta), preparación contada una vez por línea, plazo por cuello de botella, media con meses completos (excluye el mes en curso), meses para vender con media 0 → `Infinity`, cantidad ≤ 0 ignorada, cantidad sugerida, límites de cobertura y descuento de órdenes confirmadas.
- [ ] Ejecutar (falla) → implementar → ejecutar (pasa) → commit.

### Tarea 2: Cálculos de ventas y alertas (`calculos.js`)
**Interfaces producidas:** `lineasVenta(datos)` (en caché), `rangoMeses(hoy, meses, desplazamiento)`, `ventasFiltradas(datos, filtros)`, `agregarPor(lineas, clave)`, `serieMensual(lineas, claves)`, `kpisVentas(datos, filtros, meses)`, `alertasBajoConsumo(datos, { base, comercialId })`, `alertasProximoPedido(datos, { comercialId })`, `informeClientesYVisitas(datos, { comercialId })`, `informeMuestras(datos, { comercialId })`, `alertasCrecimiento(datos, { comercialId })`, `carteraClientes(datos, filtros)`.
**Precisión sobre la alerta 1** (más robusta que la versión inicial de la spec, que se actualiza en consecuencia): el intervalo típico es la mediana de los intervalos anteriores a la ventana reciente. La tasa de cada ventana es `Σ uds / (max(finVentana, últimoPedido + intervalo) − primerPedido)`. Esto evita falsas alarmas debidas a la fase del ciclo de pedido. Se exigen ≥ 3 pedidos en 24 meses.
- [ ] Tests: caída del 30 % → aviso; del 60 % → crítico; cliente estable con pedidos cada 90 días → sin alerta; próximo pedido en esta semana, retrasado, próximas y descartado; muestra pendiente de 15 días → alerta y de 10 → no; crecimiento del 25 % con 1.200 € → sí, del 25 % con 800 € → no, y estable → no; KPI interanual con 36 m → `null`.
- [ ] Ejecutar (falla) → implementar → ejecutar (pasa) → commit.

### Tarea 3: Generador de datos de demo (`assets/js/datos-demo.js`)
**Interfaz producida:** `generarDatosDemo({ hoy, semilla })` con el modelo de la sección 4 de la spec, más `ordenes: []`.
- [ ] Tests en `tests/datos-demo.test.js`: determinismo; los seis casos preparados con dos fechas `hoy` distintas (2026-10-09 y 2027-03-17); alertas de bajo consumo semestral entre 3 y 15.
- [ ] Ejecutar (falla) → implementar → ajustar los parámetros hasta que pase → commit.

### Tarea 4: Base de interfaz (`assets/css/intranet.css`, `assets/js/ui-comun.js`)
**Interfaces producidas:** `BolbaiteUI.eur(n, dec)`, `num(n, dec)`, `pct(n)`, `fecha(d)`, `mesCorto(clave)`, `meses(n)`, `COLORES`, `ETIQUETAS`, `cargarOrdenes()`, `guardarOrdenes(lista)`, `reiniciarDemo()`, `iniciarPestanas(raiz, alCambiar)`, `crearGrafica(canvas, config)` (con aviso si falta Chart.js), `pintarCabecera(activa)`, `datos()` (los datos de demo más las órdenes guardadas).
- [ ] Implementar y comprobar en el navegador con una página mínima (dentro de la tarea 5) → commit junto con la tarea 5.

### Tarea 5: Planificador (`produccion.html`, `assets/js/produccion.js`)
- [ ] Lista de referencias con buscador, orden de varias líneas, atajos de cobertura, los cuatro bloques de resultado, confirmar orden y reiniciar.
- [ ] Verificar en el navegador: 800 × DS-200-G → grapas "faltan", cantidad vacía sin `NaN`, flujo de confirmar → stock descontado. Commit.

### Tarea 6: BI Producción (`produccion.js`)
- [ ] KPI, cobertura por familia con bandas, fabricado frente a vendido, mini-gráficas de tendencia con detalle, detalle de familia → Fabricar.
- [ ] Verificar en el navegador (franela en sobrestock, sisal en rotura, consola limpia). Commit.

### Tarea 7: BI Ventas y cartera (`ventas.html`, `assets/js/ventas.js`)
- [ ] Filtros de comercial y periodo, filtro cruzado, KPI, evolución, rankings, top 10, comerciales y tabla de cartera ordenable.
- [ ] Verificar en el navegador con cada comercial y con un filtro cruzado. Commit.

### Tarea 8: Informes y alertas (`ventas.js`)
- [ ] Cinco tarjetas desplegables, selector de base de la alerta 1 y vista de impresión.
- [ ] Verificar en el navegador (aparecen Talleres Alba y Distribuciones Gandía, impresión). Commit.

### Tarea 9: Cierre
- [ ] Actualizar el README (páginas internas y cómo ejecutar los tests) y sincronizar la spec con la precisión de la alerta 1.
- [ ] `node --test tests/` en verde, revisión en el navegador a 375 px y a 1280 px, revisión independiente del código y corrección de lo que encuentre. Commit final.
