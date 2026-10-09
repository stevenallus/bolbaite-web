# Web Grupo Bolbaite — Maqueta

Maqueta HTML de la nueva web de **Grupo Bolbaite** (industrialbolbaite.es), abrasivos desde 1970.

## Contenido

- `index.html` — Maqueta principal de la página de inicio
- `assets/img/` — Logo, discos ALBAIT, logos de marcas (3M, sia, Klingspor, Fein) y poster del hero
- `assets/video/` — Vídeo de fondo del hero (stock de demostración, pendiente de sustituir por vídeo propio)
- `pdf-images/` — Imágenes extraídas del PDF con las instrucciones de diseño

## Intranet (demo con datos inventados)

Herramientas internas, **no enlazadas desde la web pública**. Se abren con doble clic, sin servidor ni instalación:

- `produccion.html` — **Planificador** de producción y compra: eliges una o varias referencias y cantidades, y muestra materias primas (con barra de stock restante: naranja < 50 %, rojo < 20 % o falta), propuesta de compra, máquinas y horas, costes (materiales, máquina, mano de obra) y cuánto se tardaría en vender según la media de 3 meses, 6 meses, 1 año y 3 años. **BI Producción**: semáforo de meses de stock por familia (rotura ↔ sobrestock), fabricado frente a vendido, detalle por referencia y tendencia de ventas.
- `ventas.html` — **BI Ventas** por provincia, familia, cliente y comercial (Álvaro, Javi, Javi jefe), **cartera de clientes** por comercial e **informe semanal** imprimible con 5 alertas: consumo por debajo de la media, próximos pedidos previstos, clientes nuevos y visitas, muestras y clientes en crecimiento.

Los datos se generan en el navegador (`assets/js/datos-demo.js`) de forma determinista y con fechas relativas a hoy, así que la demo siempre parece actual. Las órdenes confirmadas en el planificador se guardan en el navegador; el botón **Reiniciar demo** las borra. Los cálculos están en `assets/js/calculos.js` y tienen tests:

```bash
node --test
```

Diseño y plan: `docs/superpowers/specs/2026-10-09-intranet-produccion-ventas-design.md` y `docs/superpowers/plans/2026-10-09-intranet-produccion-ventas.md`.

## Cómo verla

Abrir `index.html` directamente en un navegador, o servir la carpeta:

```bash
python3 -m http.server 8765
# http://127.0.0.1:8765
```

## Identidad de marca

| Elemento | Valor |
|---|---|
| Azul principal | `#1a1893` |
| Gris texto | `#555351` |
| Rojo acento | `#a70013` |
| Tipografía | Arimo (Google Fonts) |
