# FrigidereIeftine.ro

Site one-page SEO de afiliere pentru frigidere ieftine. Construit cu Astro, optimizat pentru Cloudflare Pages.

## Structura proiectului

```
src/
  data/
    products.json          ← FIȘIERUL PRINCIPAL CU PRODUSE (editează aici)
    products.example.json  ← exemplu de referință
  components/              ← componente Astro (Hero, ProductCard, FAQ etc.)
  layouts/Layout.astro     ← layout-ul principal
  pages/index.astro        ← pagina principală
  styles/global.css        ← stiluri
public/
  assets/images/products/  ← imaginile produselor (descărcate local)
  robots.txt
  favicon.svg
scripts/
  download-images.mjs      ← script pentru descărcarea imaginilor
```

## Cum completezi produsele

### 1. Editează `src/data/products.json`

Fiecare produs are această structură:

```json
{
  "id": "slug-unic",
  "name": "Numele Produsului",
  "price": 1299,
  "currency": "RON",
  "affiliateUrl": "https://www.emag.ro/produs/pd/ABC123/?ref=aff",
  "imageUrl": "https://www.emag.ro/images/produs.jpg",
  "localImage": "/assets/images/products/slug-unic.webp",
  "capacity": "306 litri",
  "coolingType": "Static",
  "energyClass": "E",
  "height": "185 cm",
  "features": ["Feature 1", "Feature 2", "Feature 3"],
  "badge": "Best Buy",
  "subcategories": ["buget", "nofrost", "garsoniera", "mic"]
}
```

**Ce trebuie să completezi tu:**

- `affiliateUrl` – linkul tău de afiliere (eMAG, PCGarage etc.)
- `imageUrl` – URL-ul imaginii originale a produsului (pentru descărcare)
- Restul datelor: nume, preț, specificații, badge, subcategorii

**Badge-uri disponibile:** `Best Buy`, `Cel mai ieftin`, `No Frost`, `Potrivit pentru garsonieră`, `Consum bun`

**Subcategorii disponibile:** `buget`, `nofrost`, `garsoniera`, `mic`

### 2. Descarcă imaginile local

```bash
npm run download-images
```

Scriptul:
- citește `products.json`
- descarcă fiecare imagine din `imageUrl`
- o salvează în `public/assets/images/products/`
- nu redescarcă imaginile deja existente
- detectează extensia corectă automat

### 3. Regenerează pagina

```bash
npm run build
```

## Rulare locală (development)

```bash
# Instalează dependențele
npm install

# Pornește serverul de dezvoltare
npm run dev
```

Serverul pornește pe `http://localhost:4321`

## Build

```bash
npm run build
```

Fișierele statice sunt generate în folderul `dist/`.

Preview local al build-ului:

```bash
npm run preview
```

## Deploy pe Cloudflare Pages

### Varianta 1: Cu Wrangler (recomandat)

```bash
# Instalează wrangler (deja în devDependencies)
npm install

# Build + deploy
npm run deploy
```

La primul deploy, Wrangler te va ghida prin procesul de autentificare și creare a proiectului.

### Varianta 2: Direct din Cloudflare Dashboard

1. Conectează repo-ul la Cloudflare Pages
2. Build command: `npm run build`
3. Build output directory: `dist`
4. Node.js version: `18` sau mai nou

### Setări necesare

- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Node version:** 18+

## Flux complet de lucru

```bash
# 1. Editează src/data/products.json cu produsele tale
# 2. Descarcă imaginile
npm run download-images

# 3. Testează local
npm run dev

# 4. Build
npm run build

# 5. Deploy
npm run deploy
```

## Adaptare pentru alt domeniu

Proiectul este gândit să fie reutilizabil. Pentru un alt site (ex: masini-de-spalat-ieftine.ro):

1. Modifică `astro.config.mjs` – schimbă `site`
2. Modifică `wrangler.toml` – schimbă `name`
3. Înlocuiește conținutul din componente (Hero, BuyingGuide, FAQ, Conclusion)
4. Înlocuiește produsele din `src/data/products.json`
5. Actualizează Schema Markup în `SchemaMarkup.astro`
