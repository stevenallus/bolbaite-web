#!/usr/bin/env bash
# ============================================================
#  sincronizar-publicar.sh
#  Regenera ../publicar a partir de esta carpeta (bolbaite-web).
#
#  · Copia todo el contenido web (páginas, assets, .htaccess,
#    robots.txt, sitemap.xml) EXCLUYENDO los archivos de
#    desarrollo (README.md, servidor-local.pl, pdf-images/,
#    .git, .gitignore y este mismo script).
#  · Convierte los enlaces internos al formato de producción:
#      href="catalogo.html"        →  href="/catalogo"
#      href="index.html#contacto"  →  href="/#contacto"
#    (las URLs limpias las resuelve el .htaccess del hosting)
#  · Normaliza los finales de línea a LF (formato del servidor).
#
#  Uso:  bash sincronizar-publicar.sh   (desde bolbaite-web o desde cualquier sitio)
# ============================================================
set -euo pipefail

ORIGEN="$(cd "$(dirname "$0")" && pwd)"
DESTINO="$(cd "$ORIGEN/.." && pwd)/publicar"

if [ ! -d "$DESTINO" ]; then
  echo "ERROR: no existe la carpeta destino: $DESTINO"
  exit 1
fi

echo "→ Regenerando $DESTINO desde $ORIGEN …"

# 1. Vaciar la carpeta de publicación (se regenera entera)
find "$DESTINO" -mindepth 1 -delete

# 2. Copiar todo salvo los archivos de desarrollo
tar -C "$ORIGEN" \
    --exclude=./.git \
    --exclude=./.gitignore \
    --exclude=./README.md \
    --exclude=./servidor-local.pl \
    --exclude=./pdf-images \
    --exclude=./sincronizar-publicar.sh \
    -cf - . | tar -C "$DESTINO" -xf -

# 3. Enlaces internos al formato de producción (URLs limpias)
for html in "$DESTINO"/*.html; do
  sed -i -E \
    -e 's|href="index\.html(#[a-zA-Z-]+)?"|href="/\1"|g' \
    -e 's|href="([a-z-]+)\.html(#[a-zA-Z-]+)?"|href="/\1\2"|g' \
    "$html"
done

# 4. Finales de línea LF en archivos de texto
find "$DESTINO" -type f \( -name "*.html" -o -name "*.css" -o -name "*.js" \
  -o -name "*.txt" -o -name "*.xml" -o -name ".htaccess" \) \
  -exec sed -i 's/\r$//' {} +

# 5. Comprobación: no debe quedar ningún enlace interno con .html
sobrantes=$(grep -lE 'href="[a-z-]+\.html' "$DESTINO"/*.html || true)
if [ -n "$sobrantes" ]; then
  echo "✗ AVISO: enlaces sin transformar en:"
  echo "$sobrantes"
  exit 1
fi

paginas=$(ls "$DESTINO"/*.html | wc -l)
echo "✓ publicar regenerada: $paginas páginas HTML, enlaces en formato limpio, sin archivos de desarrollo."
