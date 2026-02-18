# Blog - instrukcja

## Architektura

```
Notion (posty) → Cloudflare Worker (proxy + cache) → blog.html (frontend)
```

- **Notion** - piszesz posty w bazie "Blog Posts"
- **Cloudflare Worker** - proxy API (token Notion nie jest widoczny w kodzie frontendu), cache 24h
- **blog.html** - wyswietla posty, renderuje formatowanie Notion

## Lokalne uruchamianie

```bash
./scripts/dev.sh
```

Uruchamia dwa serwery:
- Frontend: `http://localhost:3000/blog.html`
- Worker API: `http://localhost:8787`

### Wymagania

1. Node.js + npm
2. Python 3 (dla serwera HTTP)
3. Plik `cloudflare-worker/.dev.vars`:
   ```
   NOTION_API_TOKEN=twoj_token_notion
   ALLOWED_ORIGIN=*
   ```

## Deploy na produkcje

```bash
./scripts/deploy.sh
```

To deployuje Cloudflare Worker. Frontend (HTML/CSS/JS) jest na GitHub Pages - wystarczy `git push`.

### Pierwszy deploy - konfiguracja secretow

```bash
cd cloudflare-worker
npx wrangler secret put NOTION_API_TOKEN
# Wklej token Notion i nacisnij Enter
```

## Dodawanie postow

1. Otworz baze "Blog Posts" w Notion
2. Dodaj nowa strone z wypelnionymi polami:
   - **Title** - tytul posta
   - **Slug** - URL-friendly nazwa (np. `moj-pierwszy-post`)
   - **Date** - data publikacji
   - **Description** - krotki opis (widoczny na liscie)
   - **Tags** - kategorie
   - **Cover** - URL obrazka naglowkowego (opcjonalny, uzyj zewnetrznego URL)
   - **Published** - zaznacz checkbox aby post byl widoczny
3. Napisz tresc posta w Notion - formatowanie jest renderowane 1:1
4. Post pojawi sie na stronie po wygasnieciu cache (max 24h) lub po redeployu Workera

### Uwaga o obrazkach

Obrazki wgrane bezposrednio do Notion maja URL wygasajacy po 1h. Uzyj zewnetrznych URL-i (np. z Cloudinary, ImgBB).

## Pliki

| Plik | Opis |
|------|------|
| `blog.html` | Strona bloga |
| `js/blog.js` | Logika frontendu (routing, fetch, renderowanie) |
| `js/notion-renderer.js` | Konwerter blokow Notion → HTML |
| `css/blog.css` | Style Notion-like (dark theme) |
| `cloudflare-worker/src/index.js` | Worker - proxy Notion API |
| `cloudflare-worker/wrangler.toml` | Konfiguracja Workera |
| `cloudflare-worker/.dev.vars` | Lokalne sekrety (NIE commitowac!) |
| `scripts/dev.sh` | Skrypt uruchamiania lokalnego |
| `scripts/deploy.sh` | Skrypt deploy produkcyjnego |
