const KV_URL = 'https://frigidereieftine.ro/api/rating';
const FALLBACK = { avg: '4.7', count: 237 };
const OUT = new URL('../src/data/rating.json', import.meta.url);

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

try {
  const res = await fetch(KV_URL, { signal: AbortSignal.timeout(5000) });
  if (res.ok) {
    const data = await res.json();
    await writeFile(fileURLToPath(OUT), JSON.stringify(data));
    console.log(`Rating: ${data.avg}/5 (${data.count} voturi)`);
  } else {
    throw new Error(`HTTP ${res.status}`);
  }
} catch (e) {
  console.log(`KV unavailable (${e.message}), using fallback`);
  await writeFile(fileURLToPath(OUT), JSON.stringify(FALLBACK));
}
