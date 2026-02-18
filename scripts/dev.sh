#!/bin/bash
# Uruchamia lokalne srodowisko deweloperskie bloga
# - Serwer HTTP dla frontendu (port 3000)
# - Cloudflare Worker lokalnie (port 8787)

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Blog DEV ==="
echo ""

# Sprawdz czy .dev.vars istnieje
if [ ! -f "$ROOT_DIR/cloudflare-worker/.dev.vars" ]; then
    echo "BLAD: Brak pliku cloudflare-worker/.dev.vars"
    echo "Utworz go z zawartoscia:"
    echo "  NOTION_API_TOKEN=twoj_token"
    echo "  ALLOWED_ORIGIN=*"
    exit 1
fi

# Sprawdz czy node_modules istnieje
if [ ! -d "$ROOT_DIR/cloudflare-worker/node_modules" ]; then
    echo "Instaluje zaleznosci Workera..."
    (cd "$ROOT_DIR/cloudflare-worker" && npm install)
fi

echo "Uruchamiam Worker na http://localhost:8787"
echo "Uruchamiam frontend na http://localhost:3000"
echo ""
echo "Otworz: http://localhost:3000/blog.html"
echo "Ctrl+C aby zatrzymac"
echo ""

# Uruchom oba serwery rownolegle
(cd "$ROOT_DIR/cloudflare-worker" && npx wrangler dev --port 8787) &
WORKER_PID=$!

(cd "$ROOT_DIR" && python3 -m http.server 3000) &
HTTP_PID=$!

# Zatrzymaj oba po Ctrl+C
trap "kill $WORKER_PID $HTTP_PID 2>/dev/null; exit" INT TERM
wait
