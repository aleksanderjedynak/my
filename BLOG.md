# Blog - instrukcja

## Architektura

```
Notion (posty) → Cloudflare Worker (proxy + cache) → blog.html (frontend)
```

- **Notion** - piszesz posty w bazie "Blog Posts"
- **Cloudflare Worker** - proxy API (token Notion nie jest widoczny w kodzie frontendu), cache 24h
- **blog.html** - wyswietla posty, renderuje formatowanie Notion

Dlaczego Worker? Token Notion API nie moze byc w kodzie frontendu (kazdy by go widzial).
Worker trzyma token jako secret i poredniczy miedzy frontendem a Notion API.

---

## Instalacja od zera (gdybys musial to robic jeszcze raz)

### 1. Notion - baza danych i integracja

#### Utworz integracje Notion

1. Wejdz na https://www.notion.so/my-integrations
2. Kliknij "New integration"
3. Nazwa: np. "Blog API"
4. Ustawienia capabilities:
   - Content Capabilities: **Read content** (TYLKO to)
   - User Capabilities: **No user information**
5. Zapisz i skopiuj token (zaczyna sie od `ntn_...`)

#### Utworz baze danych w Notion

Stworz nowa baze danych (Table view) z kolumnami:

| Kolumna | Typ | Opis |
|---------|-----|------|
| Title | Title | Tytul posta |
| Slug | Rich text | URL-friendly nazwa (np. `moj-pierwszy-post`) |
| Date | Date | Data publikacji |
| Description | Rich text | Krotki opis widoczny na liscie |
| Tags | Multi-select | Kategorie (np. JavaScript, Python, Tutorial) |
| Cover | URL | Link do obrazka naglowkowego (opcjonalny) |
| Published | Checkbox | Tylko zaznaczone posty sa widoczne |

#### Udostepnij baze integracji

1. Otworz baze w Notion
2. Kliknij `...` (menu) → "Connections" → Znajdz swoja integracje → "Connect"

#### Skopiuj ID bazy

Z URL-a bazy: `https://www.notion.so/TUTAJ_JEST_ID?v=...`
ID to ten dlugi ciag hex miedzy `/` a `?` (32 znaki).

### 2. Cloudflare Worker

#### Zaloz konto Cloudflare

1. https://dash.cloudflare.com/sign-up (darmowe)
2. Wystarczy plan Free - Workers maja 100k requestow/dzien za darmo

#### Zainstaluj zaleznosci Workera

```bash
cd cloudflare-worker
npm install
```

#### Skonfiguruj wrangler.toml

Edytuj `cloudflare-worker/wrangler.toml`:

```toml
[vars]
NOTION_DATABASE_ID = "twoje_id_bazy_notion"      # z kroku 1
ALLOWED_ORIGIN = "https://twoja-domena.com"       # domena frontendu
CACHE_TTL = "86400"                               # cache 24h (w sekundach)
```

#### Zaloguj sie do Cloudflare

```bash
cd cloudflare-worker
npx wrangler login
# Otworzy przegladarke - zaloguj sie i autoryzuj
```

#### Dodaj token Notion jako secret

```bash
cd cloudflare-worker
npx wrangler secret put NOTION_API_TOKEN
# Wklej token Notion (ntn_...) i nacisnij Enter
```

WAZNE: Uzyj `wrangler secret put NOTION_API_TOKEN` - podajesz NAZWE zmiennej,
a potem wklejasz WARTOSC tokenu. NIE wklejaj tokenu jako nazwy!

#### Deploy Workera

```bash
cd cloudflare-worker
npx wrangler deploy
```

Przy pierwszym deployu Cloudflare zapyta o subdomain - wybierz jaki chcesz.
Worker bedzie dostepny pod URL-em: `https://blog-api.<twoj-subdomain>.workers.dev`

#### Zaktualizuj URL w blog.js

W pliku `js/blog.js` zmien URL produkcyjny:

```javascript
const WORKER_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8787'
    : 'https://blog-api.<twoj-subdomain>.workers.dev';  // ← tutaj
```

### 3. Utworz plik .dev.vars do pracy lokalnej

```bash
cat > cloudflare-worker/.dev.vars << 'EOF'
NOTION_API_TOKEN=ntn_twoj_token_notion
ALLOWED_ORIGIN=*
EOF
```

Ten plik NIE jest commitowany (jest w .gitignore). Zawiera sekrety tylko do dev.

---

## Lokalne uruchamianie

```bash
./scripts/dev.sh
```

Uruchamia dwa serwery rownolegle:
- Frontend: http://localhost:3000/blog.html
- Worker API: http://localhost:8787

Zatrzymanie: `Ctrl+C`

### Wymagania do pracy lokalnej

- Node.js + npm (do Cloudflare Worker / wrangler)
- Python 3 (do serwera HTTP dla frontendu)
- Plik `cloudflare-worker/.dev.vars` (patrz punkt 3 wyzej)

### Reczne uruchamianie (zamiast skryptu)

Jesli wolisz odpalac recznie w dwoch terminalach:

**Terminal 1 - Worker:**
```bash
cd cloudflare-worker
npx wrangler dev --port 8787
```

**Terminal 2 - Frontend:**
```bash
python3 -m http.server 3000
```

Otworz: http://localhost:3000/blog.html

### Rozwiazywanie problemow

**CORS error w konsoli przegladarki:**
- Upewnij sie ze Worker dziala na porcie 8787
- Sprawdz czy `cloudflare-worker/.dev.vars` zawiera `ALLOWED_ORIGIN=*`
- Zrestartuj Worker (`Ctrl+C` → ponownie `npx wrangler dev`)

**"Nie udalo sie zaladowac postow":**
- Sprawdz czy Worker odpowiada: `curl http://localhost:8787/posts`
- Sprawdz czy token Notion jest poprawny w `.dev.vars`
- Sprawdz czy baza Notion jest udostepniona integracji (Connections)

**Worker crash / undefined error:**
- Sprawdz logi w terminalu gdzie dziala `wrangler dev`
- Najczesciej: brak tokenu lub baza nie jest podlaczona do integracji

---

## Deploy na produkcje

```bash
./scripts/deploy.sh
```

To deployuje Cloudflare Worker. Frontend (HTML/CSS/JS) jest na GitHub Pages - wystarczy `git push`.

### Po zmianach w kodzie Workera

```bash
./scripts/deploy.sh
```

### Po zmianach w kodzie frontendu (HTML/CSS/JS)

```bash
git add . && git commit -m "opis zmian" && git push
```

GitHub Pages odswieza sie automatycznie po pushu.

---

## Dodawanie postow

1. Otworz baze "Blog Posts" w Notion
2. Dodaj nowa strone z wypelnionymi polami:
   - **Title** - tytul posta
   - **Slug** - URL-friendly nazwa (np. `moj-pierwszy-post`, bez spacji, male litery)
   - **Date** - data publikacji
   - **Description** - krotki opis (widoczny na liscie postow)
   - **Tags** - kategorie
   - **Cover** - URL obrazka naglowkowego (opcjonalny)
   - **Published** - zaznacz checkbox aby post byl widoczny na stronie
3. Napisz tresc posta w Notion - formatowanie jest renderowane 1:1
4. Post pojawi sie na stronie po wygasnieciu cache (max 24h)

### Obsugiwane formatowanie Notion

- Paragrafy, naglowki (H1, H2, H3)
- Listy punktowane i numerowane (w tym zagniezdzone)
- Bloki kodu (z jezykiem i przyciskiem kopiowania)
- Cytaty, callout (z emoji)
- Obrazki (z caption), video (YouTube embed)
- Tabele, toggle (zwijanki), checkboxy (to-do)
- Bookmarki, dzielniki (divider)
- Kolumny, embeddy
- Formatowanie tekstu: bold, italic, underline, strikethrough, inline code
- 10 kolorow tekstu + 10 kolorow tla Notion

### Uwaga o obrazkach

Obrazki wgrane bezposrednio do Notion maja URL wygasajacy po 1h.
Uzyj zewnetrznych URL-i zamiast wgrywania plikow:
- Wklej link do obrazka z Cloudinary, ImgBB, Imgur itp.
- Albo uzyj pol "Cover" z zewnetrznym URL-em

---

## Konfiguracja

### cloudflare-worker/wrangler.toml

```toml
[vars]
NOTION_DATABASE_ID = "id_bazy"              # ID bazy Notion
ALLOWED_ORIGIN = "https://twoja-domena.com" # dozwolony origin (CORS)
CACHE_TTL = "86400"                         # czas cache w sekundach (86400 = 24h)
```

### cloudflare-worker/.dev.vars (tylko lokalne, NIE commitowac)

```
NOTION_API_TOKEN=ntn_twoj_token
ALLOWED_ORIGIN=*
```

### js/blog.js

URL Workera wykrywany automatycznie:
- localhost → `http://localhost:8787`
- produkcja → URL z Cloudflare Workers

---

## Struktura plikow

| Plik | Opis |
|------|------|
| `blog.html` | Strona bloga |
| `js/blog.js` | Logika frontendu (routing, fetch, renderowanie kart/postow) |
| `js/notion-renderer.js` | Konwerter blokow Notion → HTML |
| `css/blog.css` | Style Notion-like (dark theme) |
| `cloudflare-worker/src/index.js` | Worker - proxy do Notion API z cache i CORS |
| `cloudflare-worker/wrangler.toml` | Konfiguracja Workera (zmienne, ID bazy) |
| `cloudflare-worker/.dev.vars` | Lokalne sekrety (NIE commitowac!) |
| `scripts/dev.sh` | Skrypt uruchamiania lokalnego (Worker + HTTP server) |
| `scripts/deploy.sh` | Skrypt deploy Workera na produkcje |

---

## Przydatne komendy

```bash
# Sprawdz czy Worker odpowiada (lokalnie)
curl http://localhost:8787/posts

# Sprawdz konkretny post (lokalnie)
curl http://localhost:8787/posts/slug-posta

# Sprawdz produkcje
curl https://blog-api.blog-api-aleksander.workers.dev/posts

# Logi Workera na produkcji (real-time)
cd cloudflare-worker && npx wrangler tail
```
