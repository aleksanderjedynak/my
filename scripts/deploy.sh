#!/bin/bash
# Wdrazanie Cloudflare Workera na produkcje
# Frontend (HTML/CSS/JS) jest hostowany na GitHub Pages - wystarczy git push

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Blog DEPLOY ==="
echo ""

# 1. Deploy Worker
echo "[1/2] Deploying Cloudflare Worker..."
(cd "$ROOT_DIR/cloudflare-worker" && npx wrangler deploy)

echo ""
echo "[2/2] Worker deployed!"
echo ""
echo "Frontend (GitHub Pages) - zrob git push aby wdrozyc zmiany HTML/CSS/JS"
echo ""
echo "URL-e:"
echo "  Worker API: https://blog-api.blog-api-aleksander.workers.dev"
echo "  Blog:       https://aleksanderone.website/blog.html"
