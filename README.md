# Web Grupo Bolbaite — Carpeta de trabajo

Versión de trabajo de la web de **Grupo Bolbaite** (industrialbolbaite.es), abrasivos desde 1970.
Aquí se hacen y se revisan los cambios; la copia lista para subir al hosting está en `../publicar`.

## Contenido

- `index.html`, `catalogo.html`, `grupo-bolbaite.html` — Páginas del sitio
- `aviso-legal.html`, `politica-privacidad.html`, `politica-cookies.html` — Páginas legales
- `assets/img/` — Logo, discos ALBAIT, logos de marcas (3M, sia, Klingspor, Fein) y poster del hero
- `assets/video/` — Vídeo de fondo del hero (generado con IA)
- `pdf-images/` — Imágenes extraídas del PDF con las instrucciones de diseño (solo desarrollo)
- `.htaccess`, `robots.txt`, `sitemap.xml` — Archivos de despliegue (se copian a publicar)
- `servidor-local.pl` — Servidor estático para probar en local (solo desarrollo)

## Cómo verla

Abrir `index.html` directamente en un navegador, o servir la carpeta:

```bash
python3 -m http.server 8765
# http://127.0.0.1:8765
```

## Flujo de trabajo con `../publicar`

1. **Todos los cambios se hacen aquí** (`bolbaite-web`): es la fuente única (y la que lleva git).
2. Después se regenera la carpeta de publicación:

```bash
bash sincronizar-publicar.sh
```

El script copia todo a `../publicar` salvo los archivos de desarrollo (README, servidor local,
pdf-images, .git), convierte los enlaces internos al formato de producción (`catalogo.html` →
`/catalogo`, que resuelve el `.htaccess` del hosting) y normaliza los finales de línea.

**No edites directamente en `publicar`**: el script la regenera entera y perderías los cambios.

## Identidad de marca

| Elemento | Valor |
|---|---|
| Azul principal | `#1a1893` |
| Gris texto | `#555351` |
| Rojo acento | `#a70013` |
| Tipografía | Arimo (Google Fonts) |
