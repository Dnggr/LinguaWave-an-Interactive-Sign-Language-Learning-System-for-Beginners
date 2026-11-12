import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const V = '0.10.21';
const OUT = path.join('assets', 'mediapipe');
const files = [
  { url: 'https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/1/holistic_landmarker.task',
    dest: path.join(OUT, 'holistic_landmarker.task') },
];
if (process.argv.includes('--wasm')) {
  for (const f of ['vision_wasm_internal.js', 'vision_wasm_internal.wasm', 'vision_wasm_nosimd_internal.js', 'vision_wasm_nosimd_internal.wasm']) {
    files.push({ url: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${V}/wasm/${f}`, dest: path.join(OUT, 'wasm', f) });
  }
}

for (const { url, dest } of files) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  process.stdout.write('Downloading ' + path.basename(dest) + ' ... ');
  const res = await fetch(url);
  if (!res.ok) { console.error('FAILED (HTTP ' + res.status + ') ' + url); process.exit(1); }
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(dest));
  console.log((fs.statSync(dest).size / 1048576).toFixed(1) + ' MB');
}
console.log('\nDone. Upload assets/mediapipe/ with your site.');
if (process.argv.includes('--wasm')) console.log('Then set SELF_HOST_WASM = true in js/mediapipe-assets.js (only if your server compresses .wasm - see notes).');
