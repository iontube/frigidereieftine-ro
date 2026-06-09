// Affiliate cloaking. Curated main /out -> profitshare (committed src/data/main-out.txt). Feed fridges ->
// Pages Function functions/out/[slug].js (the Function intercepts ALL /out/* so curated MUST be in its MAP too).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

let curated = [];
try { curated = readFileSync(fileURLToPath(new URL('../src/data/main-out.txt', import.meta.url)), 'utf-8').trim().split('\n').filter(Boolean); } catch {}
let redirects = '', mainN = 0;
for (const line of curated) { const [path, url, code = '302'] = line.trim().split(/\s+/); if (!path || !url) continue; redirects += `${path} ${url} ${code}\n`; redirects += `${path}/ ${url} ${code}\n`; mainN++; }
let dropped = {};
try { dropped = JSON.parse(readFileSync(fileURLToPath(new URL('../.cache/dropped.json', import.meta.url)), 'utf-8')); } catch {}
let dn = 0;
for (const [slug, target] of Object.entries(dropped)) { redirects += `/frigider/${slug}/ ${target} 301\n`; redirects += `/frigider/${slug} ${target} 301\n`; dn++; }
const ruleCount = redirects.split('\n').length - 1;
if (ruleCount > 1800) console.warn(`  WARN: _redirects ${ruleCount} rules (cap 2000)`);
writeFileSync(fileURLToPath(new URL('../public/_redirects', import.meta.url)), redirects);
console.log(`_redirects: ${mainN} curated + ${dn} dropped (${ruleCount} rules)`);

let recs = [];
try { recs = JSON.parse(readFileSync(fileURLToPath(new URL('../src/data/frigidere.json', import.meta.url)), 'utf-8')); } catch {}
const map = {};
for (const line of curated) { const [path, url] = line.trim().split(/\s+/); if (path && url) { const s = path.replace(/^\/out\//, '').replace(/\/$/, ''); map[s] = url; } }
for (const p of recs) for (const o of (p.offers || [])) if (o.outKey && o.affiliate && !map[o.outKey]) map[o.outKey] = o.affiliate;
mkdirSync(fileURLToPath(new URL('../functions/out', import.meta.url)), { recursive: true });
writeFileSync(fileURLToPath(new URL('../functions/out/[slug].js', import.meta.url)),
`// AUTO-GENERATED — cloaked affiliate redirect for /out/<key>/
const MAP = ${JSON.stringify(map)};
export function onRequest(context) {
  const url = MAP[context.params.slug];
  if (url) return Response.redirect(url, 302);
  return Response.redirect(new URL('/oferte/', context.request.url).toString(), 302);
}
`);
console.log(`functions/out/[slug].js: ${Object.keys(map).length} keys (curated + feed)`);
