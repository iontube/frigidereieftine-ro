import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PRODUCTS_FILE = join(ROOT, 'src', 'data', 'products.json');
const REDIRECTS_FILE = join(ROOT, 'public', '_redirects');

const products = JSON.parse(await readFile(PRODUCTS_FILE, 'utf-8'));

const lines = products.map(p => `/out/${p.id} ${p.affiliateUrl} 302`);

await writeFile(REDIRECTS_FILE, lines.join('\n') + '\n');
console.log(`Generated ${lines.length} redirects in public/_redirects`);
