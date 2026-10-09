# Intranet Bolbaite — Planificador de producción y seguimiento de ventas (demo)

Fecha: 2026-10-09 · Estado: pendiente de revisión

## 1. Objetivo

Dos herramientas internas, en modo **demo con datos inventados**, para enseñar a dirección y al equipo cómo se podría trabajar:

1. **Producción:** evitar fabricar "a ojo". Antes de lanzar una orden se ve qué material y máquinas consume, cuánto cuesta y cuánto se tardaría en vender lo fabricado. Un BI por familias muestra dónde se acumula stock y dónde falta.
2. **Ventas:** seguimiento de la evolución de ventas por provincia, familia, cliente y comercial (Álvaro, Javi, Javi jefe), con un informe semanal de alertas accionables.

### Criterios de éxito
- Al planificar una o varias referencias se ven al instante las materias primas necesarias con una barra de stock restante (verde / naranja < 50 % / rojo < 20 % o "faltan X"), las horas por máquina, el coste por apartado, el total (€ y horas) y los meses que se tardaría en vender según las medias de 3 m, 6 m, 1 año y 3 años.
- El caso "800 discos de sisal" deja las grapas en rojo, con faltante.
- En el BI de producción se identifica de un vistazo la familia con sobrestock (franela) y la familia en riesgo de rotura (sisal), además de la tendencia de ventas de cada familia.
- En ventas, el informe semanal muestra los cinco tipos de alerta con frases claras, se puede filtrar por comercial y se puede imprimir.
- Todo se abre con doble clic (`file://`), sin servidor ni build.

## 2. Restricciones y decisiones

- HTML, CSS y JS estáticos, coherentes con el resto del repo. Sin framework ni paso de build.
- **Sin módulos ES** (no funcionan con `file://`). Cada JS es un script clásico que publica un espacio de nombres global (`window.BolbaiteDatos`, `window.BolbaiteCalculos`…) y, si existe `module`, también lo exporta con `module.exports` para poder probarlo con Node.
- Chart.js `4.4.1` desde jsDelivr (la misma versión que la calculadora).
- Estilo de las herramientas internas: rojo corporativo `#a70013` y grises, igual que `calculadora_comercial_bolbaite.html`.
- Páginas internas: **no** se enlazan desde la web pública. Se documentan en el README.
- Datos deterministas: generador con semilla fija y fechas relativas a "hoy" (que se puede inyectar para los tests).
- Las órdenes confirmadas se guardan en `localStorage` (clave `bolbaite-demo-ordenes`). Todo acceso va dentro de `try/catch` y la página funciona igual sin `localStorage`.

## 3. Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `produccion.html` | Maquetación del módulo de producción (pestañas *Planificador* y *BI Producción*). |
| `ventas.html` | Maquetación del módulo de ventas (pestañas *BI Ventas*, *Clientes y comerciales* e *Informes y alertas*). |
| `assets/css/intranet.css` | Estilos comunes: cabecera de la intranet, pestañas, tarjetas, KPI, tablas, barras de estado, estilos de impresión y responsive. |
| `assets/js/datos-demo.js` | `generarDatosDemo({ hoy, semilla })` → objeto con todo el modelo de datos (sección 4). Sin acceso al DOM. |
| `assets/js/calculos.js` | Funciones puras de cálculo (secciones 5 y 6). Sin acceso al DOM. |
| `assets/js/ui-comun.js` | Formato (€, números, fechas en español), pestañas, cabecera, valores por defecto de Chart.js, colores de estado, persistencia de órdenes. |
| `assets/js/produccion.js` | Lógica de interfaz de `produccion.html`. |
| `assets/js/ventas.js` | Lógica de interfaz de `ventas.html`. |
| `tests/calculos.test.js` | Tests unitarios de `calculos.js` (`node --test`). |
| `tests/datos-demo.test.js` | Tests de determinismo y de los casos preparados de la demo. |

La cabecera de la intranet es común: marca Grupo Bolbaite, navegación **Producción · Ventas**, la fecha de hoy y un botón **Reiniciar demo** (borra las órdenes guardadas).

## 4. Modelo de datos de la demo (`datos-demo.js`)

`generarDatosDemo({ hoy = new Date(), semilla = 1970 })` devuelve:

```js
{
  hoy,                          // Date
  config: { costeOperarioHora: 22, horasJornada: 8 },
  familias:  [{ id, nombre, tipo: 'propia' | 'distribucion' }],
  materiales:[{ id, nombre, unidad, costeUd, stock }],
  maquinas:  [{ id, nombre, tarifaHora, operarios }],
  productos: [{ id, ref, nombre, familiaId, precioVenta, stock,
                escandallo?: [{ materialId, cantidad }],              // por unidad
                ruta?:       [{ maquinaId, minPreparacion, minUnidad }] }],
  comerciales:[{ id, nombre }],                                      // alvaro, javi, javi-jefe
  clientes:  [{ id, nombre, provincia, comercialId, fechaAlta }],
  pedidos:   [{ id, clienteId, fecha, lineas: [{ productoId, cantidad, importe }] }],
  produccionHistorica: [{ productoId, mes: 'AAAA-MM', unidades }],  // últimos 12 meses
  visitas:   [{ id, clienteId, comercialId, fecha, nota }],
  muestras:  [{ id, clienteId, productoId, comercialId, fechaEnvio,
                estado: 'pendiente' | 'positivo' | 'negativo' | 'pedido', feedback }]
}
```

### Contenido
- **Familias propias (9):** Discos de tela, Sisal, Franela, Malla abrasiva, Tela tejana, Cuerda y esparto, ALBAIT corte, ALBAIT láminas, Pastas de pulido.
- **Familias de distribución (4, solo ventas):** 3M, sia, Klingspor, Fein.
- **Productos:** unas 24 referencias propias (2–3 por familia, p. ej. *Disco de tela algodón Ø150 × 12 mm*, *Disco de sisal Ø200 grapado*, *Corte ALBAIT inox 125 × 1,0*) y unas 8 de distribución. Solo las propias tienen escandallo y ruta.
- **Materiales (~15):** tela de algodón (m²), tela tejana (m²), franela (m²), sisal tejido (m²), malla abrasiva (m²), cuerda de sisal (m), esparto (kg), hilo de coser (m), grapas (uds), centros de cartón (uds), bujes metálicos (uds), resina fenólica (kg), grano abrasivo (kg), malla de fibra de vidrio (uds), cera / base de pasta (kg), etiquetas (uds), cajas (uds).
- **Máquinas (10):** Cortadora 1, Cortadora 2, Cortadora 3, Cosedora 1, Cosedora 2, Grapadora, Prensa hidráulica, Horno de curado, Mezcladora de pastas, Línea de embalaje. Cada una con su tarifa €/h (amortización + energía) y su número de operarios.
- **Clientes (~45)** en Valencia, Alicante, Castellón, Murcia, Albacete, Madrid, Barcelona y Zaragoza.
  - Álvaro: Valencia norte y Castellón.
  - Javi: Valencia sur, Alicante, Murcia y Albacete.
  - Javi jefe: cuentas grandes, Madrid, Barcelona y Zaragoza.
  - Unos 5 clientes dados de alta en los últimos 90 días.
- **Pedidos (36 meses):** cada cliente tiene un perfil de compra (qué referencias, intervalo en días, cantidad, tendencia anual). Variación aleatoria: intervalo ±15 %, cantidad ±20 %.
- **Visitas:** de 0 a 6 por cliente en los últimos 6 meses. Algunos clientes activos sin visitar en más de 60 días.
- **Muestras:** unas 15 en los últimos 6 meses, con estados variados. Al menos 3 pendientes con más de 14 días.

### Casos preparados para la demo (garantizados y cubiertos por tests)
1. **Franela en sobrestock:** cobertura de unos 30 meses (media de 12 m). La producción histórica supera a las ventas.
2. **Sisal en riesgo de rotura:** cobertura < 1 mes.
3. **800 discos de sisal ⇒ faltan grapas:** la necesidad de grapas para 800 uds del disco de sisal estrella supera el stock.
4. **Talleres Alba:** consumo de Sisal ≥ 40 % por debajo de su media semestral.
5. **Distribuciones Gandía:** pide *Corte ALBAIT inox 125* cada ~90 días (~400 uds). El próximo pedido previsto cae en la semana actual.
6. **Cliente en crecimiento:** un cliente sube ≥ 35 % en los últimos 12 meses respecto a los 12 anteriores.

Los casos 4–6 se construyen ajustando las fechas a `hoy`, así que funcionan sea cual sea el día en que se abra la demo.

## 5. Módulo Producción

### 5.1 Cálculos (`calculos.js`)

Las medias de venta se calculan sobre **meses naturales completos** (se excluye el mes en curso). Las ventanas son de 3, 6, 12 y 36 meses.

- `ventaMediaMensual(datos, productoId, meses)` = unidades vendidas en los últimos `meses` meses completos ÷ `meses`.
- `necesidadesMaterial(datos, lineas)` → por material: `necesario = Σ cantidad × escandallo`, `stock`, `quedaria = stock − necesario`, `pct = quedaria / stock`, `estado`, `coste = necesario × costeUd`, `usadoPor` (referencias que lo consumen).
  - `estado`: `'ok'` si pct ≥ 0,5 · `'aviso'` si 0,2 ≤ pct < 0,5 · `'critico'` si pct < 0,2 · `'falta'` si quedaria < 0 (o stock 0 con necesidad > 0).
  - El stock de material ya descuenta las órdenes confirmadas.
- `necesidadesMaquina(datos, lineas)` → por máquina: `horas = Σ (minPreparacion + cantidad × minUnidad) / 60` (la preparación se cuenta una vez por línea), `costeMaquina = horas × tarifaHora`, `costeManoObra = horas × operarios × costeOperarioHora`.
- `resumenOrden(...)` → coste de materiales, de máquina y de mano de obra, total en €, horas totales, coste por unidad de cada línea y plazo estimado = `max(horas por máquina) / horasJornada` jornadas (la máquina cuello de botella).
- `mesesParaVender(cantidad, mediaMensual)` → `cantidad / media`, o `Infinity` si la media es 0 (se muestra como "sin ventas").
- `estadoTiempoVenta(meses)`: `'ok'` ≤ 6 · `'aviso'` de 6 a 12 · `'critico'` > 12.
- `costeUnitarioEstandar(datos, productoId)` = coste por unidad de `resumenOrden` para una orden de 500 uds de esa referencia (sirve para valorar el stock de producto terminado).
- `cantidadSugerida(datos, productoId, mesesObjetivo, base)` = `max(0, ceil(media(base) × mesesObjetivo − stock − enFabricacion))`.
- `cobertura(stock, media)` y `estadoCobertura(meses)`:
  - `'rotura'` < 1
  - `'bajo'` de 1 a 2
  - `'correcto'` de 2 a 6
  - `'alto'` de 6 a 12
  - `'sobrestock'` > 12
- `tendenciaFamilia(datos, familiaId)` → serie de 36 meses (uds y €) y variación % de los últimos 3 meses frente a los mismos 3 meses del año anterior.

### 5.2 Pestaña Planificador
- **Lista de referencias propias** a la izquierda, con buscador y agrupadas por familia. Cada referencia muestra stock, cobertura (color + texto) y el botón **Fabricar**.
- **Orden de fabricación:** una línea por referencia, con cantidad editable, botón de quitar y atajos *Cubrir 3 meses* / *Cubrir 6 meses* (`cantidadSugerida`). Un selector de base de media (3 m / 6 m / 1 año / 3 años, por defecto 6 m) controla los atajos. Una referencia que ya está en la orden no se duplica: se enfoca su línea.
- **Bloques de resultado** (se recalculan con cada cambio):
  1. *Materias primas:* tabla (material, necesario, stock, quedaría, coste) con una barra de estado debajo de cada fila y el texto "faltan X uds" cuando procede.
  2. *Máquinas y horas:* tabla (máquina, horas de preparación, horas de producción, operarios, coste de máquina, coste de mano de obra) más el total de horas y el plazo estimado. Incluye un campo editable *Coste operario €/h* (por defecto 22).
  3. *Costes:* tarjetas con los costes de materiales, máquina y mano de obra y el total (€ y horas), más el coste unitario por línea.
  4. *Tiempo de venta:* tabla por línea con las cuatro medias, dos filas por referencia ("solo lo fabricado" y "stock + fabricado"), con color por celda. Mensaje destacado con la peor cifra según la media de 1 año.
- **Confirmar orden:** guarda la orden en `localStorage`. Las materias primas se descuentan y las unidades aparecen como "en fabricación". Se vacía la orden y se muestra un aviso.
- **Orden vacía:** mensaje de ayuda ("Pulsa *Fabricar* en una referencia para empezar").

### 5.3 Pestaña BI Producción
- **Selector de base de media** (3 m / 6 m / 1 año / 3 años, por defecto 1 año), que afecta a todos los bloques.
- **KPI:** valor del stock de producto terminado (stock × `costeUnitarioEstandar`), nº de familias en sobrestock, nº de familias en riesgo de rotura y unidades fabricadas en los últimos 12 meses.
- **Cobertura por familia:** barras horizontales con los meses de (stock + en fabricación) ÷ media, sobre bandas de fondo por estado, con la etiqueta del estado en texto. Eje acotado a 36 meses (los valores mayores se muestran como "> 36").
- **Fabricado frente a vendido** en los últimos 12 meses, por familia (barras agrupadas, en unidades).
- **Tendencia por familia:** cuadrícula de mini-gráficas (36 meses) con la variación % y ▲▼. Al hacer clic se abre una gráfica grande con las unidades mensuales y una media móvil de 3 meses.
- **Detalle de familia:** al hacer clic en una familia (en la barra o en la tarjeta) se abre una tabla de sus referencias (stock, en fabricación, media, cobertura, estado) con el botón **Fabricar**, que lleva al planificador con esa línea ya añadida.

## 6. Módulo Ventas

### 6.1 Filtros globales
- **Comercial:** Todos / Álvaro / Javi / Javi jefe.
- **Periodo:** 3 m / 6 m / 12 m / 36 m (por defecto 12 m).
- **Filtro cruzado:** provincia o familia al hacer clic en los rankings. Se ve como un chip que se puede quitar.

Los filtros afectan a todas las pestañas salvo donde se indique.

### 6.2 Cálculos (`calculos.js`)
- `ventasFiltradas(datos, filtros)` → líneas de pedido aplanadas con cliente, provincia, comercial y familia.
- `agregarPor(lineas, clave)` y `serieMensual(lineas, meses)`.
- `variacionInteranual(datos, filtros)`: periodo frente al mismo periodo del año anterior. Para 36 m no hay año anterior completo: se devuelve `null` y se muestra "—".
- **Alerta 1 · `alertasBajoConsumo(datos, { base })`**, con base de 3, 6 o 12 meses.
  - Se evalúa por (cliente, familia) con ≥ 3 pedidos en los últimos 12 meses.
  - Ventana reciente `R = clamp(2 × intervalo medio de pedido, 60, 180)` días.
  - Base = los `base` meses inmediatamente anteriores a la ventana reciente.
  - `caída = 1 − (uds/mes recientes ÷ uds/mes base)`.
  - Niveles: `'aviso'` con caída ≥ 25 % · `'critico'` con caída ≥ 50 %.
  - Frase: *"{Cliente} está un {X} % por debajo de su consumo medio de {Familia} (media {trimestral|semestral|anual} {B} uds/mes · reciente {R} uds/mes)"*.
- **Alerta 2 · `alertasProximoPedido(datos)`**
  - Se evalúa por (cliente, producto) con ≥ 3 pedidos en los últimos 24 meses.
  - Intervalo medio (últimos ≤ 6 intervalos), cantidad media y `prevista = último pedido + intervalo`.
  - Estados (semana de lunes a domingo):
    - `'retrasado'`: la prevista es anterior a la semana actual y el retraso es ≤ 1 intervalo. Si el retraso es mayor, se descarta (lo recoge la alerta 1).
    - `'esta-semana'`: la prevista cae en la semana actual.
    - `'proximas'`: la prevista cae en los próximos 14 días después de esta semana.
  - Frase: *"{Cliente} pide {Producto} cada ~{N} días (~{Q} uds). Último pedido {fecha}: {le toca esta semana | lleva X días de retraso | previsto el {fecha}}"*.
- **Alerta 3 · `informeClientesYVisitas(datos)`**
  - Altas de los últimos 90 días, con su primera compra y las ventas acumuladas.
  - Las 15 últimas visitas.
  - Clientes activos (con compra en los últimos 6 meses) con más de 60 días sin visita.
- **Alerta 4 · `informeMuestras(datos)`**
  - Lista con los días desde el envío.
  - Alerta si el estado es `'pendiente'` y han pasado > 14 días.
  - Conversión = muestras en estado `'pedido'` ÷ muestras enviadas en los últimos 6 meses.
- **Alerta 5 · `alertasCrecimiento(datos)`**
  - Clientes con ≥ 1.000 € en los últimos 12 meses y (variación de 3 m frente a los 3 m anteriores ≥ 20 % o variación de 12 m frente a los 12 m anteriores ≥ 20 %), en €.
  - Se indica la familia con mayor incremento absoluto.

### 6.3 Pestaña BI Ventas
- **KPI:** ventas del periodo (€) con su variación interanual, clientes activos (con al menos un pedido en el periodo), ticket medio (ventas ÷ nº de pedidos del periodo) y clientes nuevos (dados de alta dentro del periodo).
- **Evolución mensual:** línea de 36 meses en €, más la línea "año anterior" desplazada 12 meses (solo donde hay datos). El periodo seleccionado se resalta con fondo sombreado.
- **Ranking por provincia** y **ranking por familia:** barras horizontales en € con la variación interanual. Al hacer clic se aplica el filtro cruzado.
- **Top 10 clientes:** tabla (cliente, provincia, comercial, ventas, variación, última compra).
- **Comparativa de comerciales:** tarjetas por comercial (ventas, nº de clientes, variación). No depende del filtro de comercial.

### 6.4 Pestaña Clientes y comerciales
- Tabla de la cartera: cliente, provincia, comercial, ventas de 12 m, variación interanual, familias que compra (chips), última compra y última visita.
- Buscador por nombre y ordenación al pulsar la cabecera. Respeta los filtros de comercial y cruzados (el periodo no aplica: siempre son 12 m).

### 6.5 Pestaña Informes y alertas (informe semanal)
- Cabecera: *"Informe semanal · semana del {lunes} al {domingo}"* y el comercial filtrado.
- Cinco tarjetas desplegables (alertas 1 a 5), cada una con su contador y su nivel máximo (color). Dentro, un listado de frases con un chip de comercial y otro de estado.
- La alerta 1 tiene su propio selector de base: trimestre / semestre / año (por defecto semestre).
- Botón **Imprimir informe semanal:** estilos `@media print` que despliegan todas las tarjetas y ocultan la navegación y los filtros.

## 7. Comportamiento común e interfaz
- **Responsive:** pensado para escritorio (≥ 1280 px). Por debajo de 900 px las columnas se apilan y las tablas tienen desplazamiento horizontal propio. La página nunca se desplaza en horizontal.
- **Accesibilidad:** el estado nunca se comunica solo con color (siempre hay texto o un icono). Las pestañas son botones con `aria-selected`.
- **Formatos en español:** `1.234,5 €`, fechas `dd/mm/aaaa` y meses abreviados (`ene 26`).
- **Si falla Chart.js** (por ejemplo, sin conexión): las tablas y los KPI se siguen mostrando y en lugar de cada gráfica aparece el aviso *"Gráfica no disponible sin conexión"*.

## 8. Pruebas
- `node --test tests/`, sin dependencias.
- `calculos.test.js`, con datos mínimos escritos a mano:
  - Necesidades de material: suma entre líneas y estados en los límites (0,5 / 0,2 / negativo / stock 0).
  - Horas y costes por máquina: la preparación cuenta una vez por línea.
  - Medias con meses completos y meses para vender (incluido el caso de media 0).
  - Estados de cobertura en los límites.
  - Cantidad sugerida.
  - Alerta 1: caída del 30 % → aviso; caída del 60 % → crítico; cliente estable → sin alerta.
  - Alerta 2: esta semana, retrasado, próximas y descartado.
  - Alerta 4: más de 14 días pendiente.
  - Alerta 5: umbrales del 20 % y de 1.000 €.
- `datos-demo.test.js`:
  - Con la misma semilla y el mismo `hoy` se obtienen los mismos datos.
  - Se cumplen los seis casos preparados de la sección 4 para dos fechas `hoy` distintas.
  - El total de alertas de bajo consumo con base semestral está entre 3 y 15 (la demo no queda ni vacía ni saturada).
- **Verificación manual en el navegador:** las dos páginas sin errores de consola, los flujos Fabricar → Confirmar → BI y el filtro por comercial, la vista de impresión y un ancho de 375 px.

## 9. Fuera de alcance
- Conexión con el ERP, importación de Excel, backend, login y permisos por comercial.
- Envío de emails o informes programados (el informe semanal es una vista imprimible).
- Edición de datos maestros desde la interfaz (escandallos, máquinas, clientes). Solo son editables las cantidades de la orden y el coste del operario.
- Mapas geográficos.
- Enlaces desde la web pública.

## 10. Cambios durante la implementación

Ajustes respecto al diseño original, decididos al ver la demo funcionando:

- **Alerta 1 (bajo consumo) más robusta.** El intervalo típico es la mediana de los intervalos anteriores a la ventana reciente. La tasa de cada ventana es `Σ uds / (max(fin de la ventana, último pedido + intervalo) − primer pedido)`, lo que evita falsas alarmas por la fase del ciclo de pedido. Se exigen ≥ 3 pedidos en 24 meses (no en 12, para no perder a los clientes que han dejado de comprar) y no se avisa de consumos medios por debajo de **100 €/mes**, que solo metían ruido.
- **Cobertura por familia como semáforo.** En lugar de barras en escala lineal, cada familia tiene una pista con cinco zonas de igual ancho (rotura · bajo · correcto · alto · sobrestock) y un punto dentro de su zona. Con escala lineal las zonas de 0 a 2 meses eran casi invisibles.
- **Fabricado frente a vendido como índice** (vendido = 100). Las familias tienen volúmenes muy distintos (corte ~70.000 uds/año frente a franela ~1.300), así que las barras agrupadas en unidades ocultaban las familias pequeñas. Las unidades están en la tabla "Ver datos".
- **Propuesta de compra** en el planificador. Para cada material en falta o por debajo del 20 % se propone la cantidad que deja, tras fabricar, al menos el 50 % del stock actual (`propuestaCompra` en `calculos.js`).
- **El mensaje de tiempo de venta usa "stock + orden".** Es lo que de verdad hay que vender antes de agotar lo fabricado. Ejemplo: 500 uds de franela se venden en 7,6 meses, pero con el stock actual tardarían más de 3 años.
- **Tendencia de la demanda por familia en los datos.** Franela −28 %/año, sisal +18 %, etc. Así la demo cuenta la historia completa: la franela se acumula porque se sigue fabricando igual aunque la demanda cae.
- **Estilos por página** (`assets/css/produccion.css` y `assets/css/ventas.css`) además de `intranet.css`.
- **Sobrestock en rojo, igual que la rotura.** Se distinguen por la posición en el semáforo y por el icono y el texto (▲ Sobrestock / ▼ Riesgo de rotura).
