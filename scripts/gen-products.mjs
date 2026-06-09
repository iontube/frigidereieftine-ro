// Generate the cheap-fridges (<=1500 lei) dataset from OUR 2Performant catalog (pretulverde.db).
// Real household fridges only (accessories/parts/toys/car-coolers/services excluded). DEDUP across
// merchants -> one page per model+capacity+color, cheapest offer per merchant ("Vezi oferta pe X,Y,Z").
import Database from '/sites/pretulverde.ro/node_modules/better-sqlite3/lib/index.js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DB = '/sites/pretulverde.ro/pretulverde.db';
const CAMPAIGN = JSON.parse(readFileSync('/sites/pretulverde.ro/_data/campaign.json', 'utf8'));
const AFF = '2ace29e87';
const IMG_HOST = 'https://img.frigidereieftine.ro';
const SITE_NAME = 'FrigidereIeftine.ro';
const OUT = fileURLToPath(new URL('../src/data/frigidere.json', import.meta.url));

const db = new Database(DB, { readonly: true });
const FRIDGE = `(lower(title) LIKE '%frigider%' OR lower(title) LIKE '%combina frigorifica%' OR lower(title) LIKE '%minibar%' OR lower(title) LIKE '%mini bar%' OR lower(title) LIKE '%congelator%')`;
const NOT_WORDS = ['magnet', 'accesori', 'filtru', 'filtre', 'raft', 'sertar', 'balama', 'garnitura', 'garnitură', 'termostat', 'suport', 'husa', 'folie', 'maner', 'mâner', 'rotila', 'rotile', 'bec ', 'vopsea', 'autocolant', 'sticker', 'transformator', 'carcasa', 'carcasă', 'ventilator', 'ecran', 'cos ', 'coș ', 'joc ', 'jucarie', 'jucărie', 'puzzle', 'set de joaca', 'mini brands', 'play go', 'playgo', 'my smart fridge', '12v', 'auto portabil', 'frigider auto', 'pentru masina', 'pentru mașina', 'turistic', 'organizator', 'dozator', 'termometru', 'alarma', 'plasa', 'perie', 'spray', 'curatare', 'curățare', 'montaj', 'kit ', 'panou', 'conexiune', 'schimbare', 'instalare', ' service', 'racord', 'sticle', 'pahare', 'protectie', 'protecție', 'capac'];
const NOT_SQL = NOT_WORDS.map((w) => `lower(title) NOT LIKE '%${w}%'`).join(' AND ');
const BRAND_BLOCK = ['smartheater', 'gave', 'tenq', 'tenq.ro', 'svoora', 'zuru', 'playgo', 'play go', 'melissa', 'melissa & doug', 'gossi', 'aosom', 'noriel', 'lego', 'hasbro', 'simba', 'mattel', 'atelier 49', 'ukonic', 'spectral mobila', 'spectral'];
const BRAND_SQL = BRAND_BLOCK.map((b) => `lower(coalesce(brand,'')) <> '${b}'`).join(' AND ');
const rows = db.prepare(`SELECT id, slug, title, price, oldPrice, brand, brandSlug, merchant, merchantSlug, img, descr
  FROM products WHERE (megaSlug='casa-gradina' OR megaSlug='electronice-it') AND ${FRIDGE} AND ${NOT_SQL} AND ${BRAND_SQL}
  AND img IS NOT NULL AND img <> '' AND price >= 150 AND price <= 1500 ORDER BY price DESC`).all();

// ---- helpers ----
const esc = (s) => String(s || '');
const money = (n) => Number(n).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' lei';
const sl = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').slice(0, 70).replace(/^-+|-+$/g, '');
const seedOf = (s) => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const strip = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
const COLORS = ['alb', 'alba', 'inox', 'silver', 'argintiu', 'argintie', 'negru', 'neagra', 'gri', 'grafit', 'crem', 'rosu', 'rosie', 'retro', 'bej', 'white', 'black', 'red', 'cream'];
const M_NAMES = { evomag: 'evoMAG', dwyn: 'Dwyn', ozone: 'Ozone', flanco: 'Flanco', vonmag: 'Vonmag', flip: 'Flip', bsgmag: 'BSGmag', xxxlutz: 'XXXLutz', dacrisnet: 'Dacris' };
const merchSlugOf = (m) => (m || '').replace(/\/+$/, '').split('.')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'magazin';

function imgUrl(poolImg, name) {
  const m = /([0-9a-f]{16})\.webp$/.exec(poolImg || '');
  if (!m) return '';
  return `${IMG_HOST}/${sl(name).slice(0, 55).replace(/-+$/, '')}-${m[1]}.webp`;
}

function parseSpecs(t, descr, brand) {
  const s = t + ' ' + (descr || ''); const sl_ = s.toLowerCase();
  // capacity total (largest L value)
  const caps = [...s.matchAll(/(\d{2,3})\s*[lL]\b/g)].map((m) => +m[1]).filter((n) => n >= 20 && n <= 700);
  const capacity = caps.length ? Math.max(...caps) : null;
  // type
  let type = 'Frigider';
  if (/side ?by ?side/i.test(s)) type = 'Side by Side';
  else if (/combina frigorifica|combină frigorifică/i.test(s)) type = 'Combină frigorifică';
  else if (/lada frigorifica|ladă frigorifică/i.test(s)) type = 'Ladă frigorifică';
  else if (/congelator/i.test(s) && !/frigider/i.test(s)) type = 'Congelator';
  else if (/minibar|mini ?bar|mini ?frigider/i.test(s)) type = 'Minibar';
  else if (/2 usi|doua usi|două uși|french door/i.test(s)) type = 'Frigider 2 uși';
  else if (/o usa|o ușă|1 usa/i.test(s)) type = 'Frigider cu o ușă';
  const energyClass = (s.match(/clasa\s*([A-G]\+{0,3})/i) || s.match(/\b([A-G]\+{2,3})\b/) || [])[1] || '';
  const noFrost = /no.?frost/i.test(s);
  const height = (s.match(/[H]\s*(\d{2,3})\s*cm/i) || s.match(/(\d{3})\s*cm/) || [])[1] || null;
  let color = ''; const ss = strip(t);
  for (const c of COLORS) { if (new RegExp('\\b' + c + '\\b').test(ss)) { color = c; break; } }
  return { brand: brand || '', capacity, type, energyClass: energyClass ? energyClass.toUpperCase() : '', noFrost, height, color };
}

function modelKey(title, brandSlug, sp) {
  let core = strip(title).split(',')[0]
    .replace(/\b(frigider|combina frigorifica|combină frigorifică|minibar|mini ?bar|congelator|lada frigorifica|side ?by ?side|no.?frost|clasa [a-g+]+|cu o usa|cu doua usi|l\b|cm)\b/g, ' ');
  for (const c of COLORS) core = core.replace(new RegExp('\\b' + c + '\\b', 'g'), ' ');
  if (brandSlug) core = core.replace(new RegExp('\\b' + brandSlug.replace(/-/g, ' ') + '\\b', 'g'), ' ');
  core = core.replace(/[^a-z0-9]+/g, '');
  return `${brandSlug || 'x'}|${core}|${sp.capacity || 0}|${sp.color}`;
}

function band(sp) {
  const c = sp.capacity || 0;
  if (/minibar/i.test(sp.type) || c < 60) return 'minibar';
  if (c < 200) return 'mic';
  if (c < 300) return 'mediu';
  return 'mare';
}
const BAND_LABELS = { minibar: 'Minibar', mic: 'Compact', mediu: 'Mediu', mare: 'Mare' };
const VALUE_BRANDS = new Set(['heinner', 'arctic', 'samus', 'albatros', 'daewoo', 'star-light', 'tesla', 'nei', 'hcf']);

function genProse(p, sp, offerCount) {
  const r = rng(seedOf(p.slug));
  const b = sp.brand || 'acest producător';
  const price = money(p.price);
  const m = esc(p.merchant).replace(/\/+$/, '');
  const reduced = p.oldPrice > p.price;
  const capTxt = sp.capacity ? `${sp.capacity} litri` : 'o capacitate potrivită pentru nevoi obișnuite';
  const typeTxt = sp.type.toLowerCase();
  const useCase = sp.capacity ? (sp.capacity < 60 ? 'ideal pentru birou, garsonieră, cameră de cămin sau ca al doilea frigider' : sp.capacity < 200 ? 'potrivit pentru o persoană, un cuplu sau o bucătărie mică' : sp.capacity < 300 ? 'bun pentru o familie mică, de 2-3 persoane' : 'încăpător pentru o familie de 3-4 persoane') : 'potrivit pentru utilizare zilnică';
  const energyTxt = sp.energyClass ? `clasă energetică ${sp.energyClass}` : 'consum echilibrat';
  const opener = pick(r, [
    `${esc(p.title)} este un ${typeTxt} ieftin de la ${b}, disponibil de la ${price}${reduced ? ` (redus de la ${money(p.oldPrice)})` : ''}.`,
    `La ${price}${reduced ? `, sub prețul vechi de ${money(p.oldPrice)},` : ''} ${esc(p.title)} este oferta ${b} pe care o urmărim în segmentul accesibil.`,
    `Cauți un frigider ieftin și bun? ${esc(p.title)} de la ${b} pornește de la ${price}.`,
  ]);
  const specSent = pick(r, [
    `Are ${capTxt} și ${energyTxt}${sp.noFrost ? ', cu tehnologie No Frost (nu mai necesită dezghețare manuală)' : ''}${sp.color ? `, finisaj ${sp.color}` : ''}.`,
    `Vine cu ${capTxt}, ${energyTxt}${sp.noFrost ? ' și No Frost' : ''}${sp.color ? `, culoare ${sp.color}` : ''}.`,
  ]);
  const offerSent = offerCount > 1 ? ` Îl găsești la ${offerCount} magazine — mai jos îți arătăm fiecare ofertă, de la cea mai mică.` : ` Disponibil prin ${m}.`;
  const intro = `${opener} ${specSent} Cu ${capTxt}, este ${useCase}.${offerSent}`;
  const guide = [
    `${sp.capacity ? `Capacitatea de ${sp.capacity} litri îl face ${useCase}.` : 'Alege capacitatea în funcție de câte persoane sunt în casă.'} ${sp.noFrost ? 'Sistemul No Frost previne formarea gheții și menține o temperatură uniformă, fără să fie nevoie să-l dezgheți manual.' : 'Verifică dacă are dezghețare automată la compartimentul frigider.'}`,
    `${sp.energyClass ? `Clasa energetică ${sp.energyClass} înseamnă un consum decent pe an — important la un frigider care merge non-stop.` : 'La un frigider care funcționează continuu, clasa energetică contează pe termen lung.'} La modelele ieftine, verifică nivelul de zgomot și tipul de control (mecanic sau electronic).`,
  ];
  const faq = [
    { q: `Cât costă ${esc(p.title)}?`, a: `${esc(p.title)} pornește de la ${price}${reduced ? ` (redus de la ${money(p.oldPrice)})` : ''}.${offerCount > 1 ? ` Este listat la ${offerCount} magazine; afișăm fiecare ofertă.` : ''} Prețurile sunt actualizate periodic.` },
    ...(sp.capacity ? [{ q: `Ce capacitate are?`, a: `Are ${capTxt}, ${useCase}.` }] : []),
    ...(sp.energyClass ? [{ q: `Ce clasă energetică are?`, a: `Are ${energyTxt}.` }] : []),
    { q: `Are No Frost?`, a: sp.noFrost ? `Da, are tehnologie No Frost, deci nu necesită dezghețare manuală.` : `Verifică specificațiile — acest model nu este listat cu No Frost, deci poate necesita dezghețare manuală.` },
    { q: `De unde îl pot cumpăra?`, a: `Prin ${SITE_NAME} — îți arătăm ${offerCount > 1 ? 'toate ofertele și' : ''} prețul curent și te ducem direct la magazin.` },
  ];
  return { intro, guide, faq };
}

// ---- DEDUP: cheapest offer per merchant, per model identity ----
const winners = {};
for (const row of rows) {
  const img = imgUrl(row.img, row.title); if (!img) continue;
  const cu = (CAMPAIGN[row.merchantSlug] || {}).c; if (!cu) continue;
  const sp = parseSpecs(row.title, row.descr, row.brand);
  const mkey = modelKey(row.title, row.brandSlug, sp);
  const mSlug = merchSlugOf(row.merchant);
  const offer = { mSlug, mName: M_NAMES[mSlug] || cap(mSlug), price: row.price, oldPrice: row.oldPrice > row.price ? row.oldPrice : null, affiliate: `https://event.2performant.com/events/click?ad_type=product_store&aff_code=${AFF}&unique=${encodeURIComponent(row.id)}&campaign_unique=${cu}`, row, sp, img };
  const w = winners[mkey] || (winners[mkey] = { byMerchant: {} });
  const cur = w.byMerchant[mSlug];
  if (!cur || offer.price < cur.price) w.byMerchant[mSlug] = offer;
}

const LEDGER = fileURLToPath(new URL('../.cache/modified-ledger.json', import.meta.url));
const oldLedger = existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, 'utf8')) : {};
const newLedger = {};
const BUILD_DATE = new Date().toISOString().slice(0, 10);

const seen = new Set();
const products = [];
for (const [mkey, w] of Object.entries(winners)) {
  const offers = Object.values(w.byMerchant).sort((a, b) => a.price - b.price).slice(0, 6);
  const best = offers[0];
  const { row, sp, img } = best;
  const name = row.title.trim();
  let slug = oldLedger[mkey] && oldLedger[mkey].s;
  if (!slug) { slug = (sl(name).slice(0, 55).replace(/-+$/, '') || 'frig') + '-' + seedOf(mkey).toString(36); if (seen.has(slug)) { let k = 2; while (seen.has(slug + '-' + k)) k++; slug += '-' + k; } }
  seen.add(slug);
  const offerCount = offers.length;
  const prose = genProse({ title: name, slug, price: best.price, oldPrice: best.oldPrice || 0, merchant: best.row.merchant }, sp, offerCount);
  const brandSlug = row.brandSlug || (sp.brand ? sl(sp.brand) : '');
  const bnd = band(sp);
  const offerList = offers.map((o, i) => ({ merchantSlug: o.mSlug, merchantName: o.mName, price: o.price, oldPrice: o.oldPrice, affiliate: o.affiliate, outKey: i === 0 ? slug : `${slug}~${o.mSlug}` }));
  const chash = seedOf(`${best.price}|${best.oldPrice}|${name}|${img}|${JSON.stringify(sp)}|${offers.map((o) => o.mSlug + o.price).join()}`);
  const modified = (oldLedger[mkey] && oldLedger[mkey].h === chash) ? oldLedger[mkey].m : BUILD_DATE;
  newLedger[mkey] = { h: chash, m: modified, s: slug, b: brandSlug, z: bnd, d: BUILD_DATE };
  products.push({
    slug, id: row.id, name, brand: sp.brand, brandSlug, price: best.price, oldPrice: best.oldPrice,
    merchant: best.row.merchant, merchantSlug: best.mSlug, merchantName: best.mName, img, affiliate: best.affiliate, modified, band: bnd, bandLabel: BAND_LABELS[bnd], type: sp.type, offerCount,
    offers: offerList,
    specs: { Brand: sp.brand || '—', Tip: sp.type, ...(sp.capacity ? { Capacitate: `${sp.capacity} L` } : {}), ...(sp.energyClass ? { 'Clasă energetică': sp.energyClass } : {}), ...(sp.noFrost ? { 'No Frost': 'Da' } : {}), ...(sp.height ? { Înălțime: `${sp.height} cm` } : {}), ...(sp.color ? { Culoare: cap(sp.color) } : {}) },
    prose,
  });
}

// dropped -> 301 to a similar surviving model
const RETAIN_DAYS = 150;
const cutoff = new Date(new Date(BUILD_DATE + 'T00:00:00Z').getTime() - RETAIN_DAYS * 864e5).toISOString().slice(0, 10);
const byBrandBand = {};
for (const p of products) (byBrandBand[`${p.brandSlug}|${p.band}`] ||= []).push(p);
const brandPages = new Set();
{ const bc = {}; for (const p of products) if (p.brandSlug) bc[p.brandSlug] = (bc[p.brandSlug] || 0) + 1; for (const b in bc) if (bc[b] >= 4) brandPages.add(b); }
const dropped = {};
for (const mkey of Object.keys(oldLedger)) {
  if (newLedger[mkey]) continue;
  const e = oldLedger[mkey]; if (!e || !e.s) continue;
  if ((e.d || '0') < cutoff) continue;
  const sim = byBrandBand[`${e.b}|${e.z}`];
  dropped[e.s] = (sim && sim.length) ? `/frigider/${sim[0].slug}/` : (brandPages.has(e.b) ? `/brand/${e.b}/` : '/oferte/');
  newLedger[mkey] = e;
}

mkdirSync(fileURLToPath(new URL('../src/data', import.meta.url)), { recursive: true });
writeFileSync(OUT, JSON.stringify(products));
mkdirSync(fileURLToPath(new URL('../.cache', import.meta.url)), { recursive: true });
writeFileSync(LEDGER, JSON.stringify(newLedger));
writeFileSync(fileURLToPath(new URL('../.cache/dropped.json', import.meta.url)), JSON.stringify(dropped));
const multi = products.filter((p) => p.offerCount > 1).length;
console.log(`  ${rows.length} offers -> ${products.length} distinct fridges (${multi} multi-merchant); ${Object.keys(dropped).length} dropped 301s`);
const bands = {}; for (const p of products) bands[p.band] = (bands[p.band] || 0) + 1;
const brands = {}; for (const p of products) brands[p.brand] = (brands[p.brand] || 0) + 1;
console.log(`  bands: ${JSON.stringify(bands)}`);
console.log('  top brands:', Object.entries(brands).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k}:${v}`).join(', '));
