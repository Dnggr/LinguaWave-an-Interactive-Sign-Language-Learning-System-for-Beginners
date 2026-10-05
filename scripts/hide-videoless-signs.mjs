#!/usr/bin/env node
/**
 * scripts/hide-videoless-signs.mjs
 * Finds SIGNS_V2 entries in js/missions.js whose videoUrl file is missing
 * on disk, lists them, and (with --apply) comments them out.
 *
 *   node scripts/hide-videoless-signs.mjs            # dry run: list only
 *   node scripts/hide-videoless-signs.mjs --apply    # comment them out (+ .bak)
 *
 * Run from the project root. Only local (../assets/...) videoUrls are checked;
 * http(s) URLs are skipped. Filename case is compared EXACTLY, because the
 * live host is case-sensitive even if your Windows disk is not.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const FILE = path.join(ROOT, 'js', 'missions.js');
const APPLY = process.argv.includes('--apply');

const src = fs.readFileSync(FILE, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
const lines = src.split(/\r?\n/);

const start = lines.findIndex((l) => l.startsWith('const SIGNS_V2'));
if (start < 0) throw new Error('const SIGNS_V2 not found');
const end = lines.findIndex((l, i) => i > start && l.startsWith('];'));

const dirCache = new Map();
function lookup(absPath) {
  const dir = path.dirname(absPath);
  if (!dirCache.has(dir)) {
    dirCache.set(dir, fs.existsSync(dir) ? fs.readdirSync(dir) : null);
  }
  const names = dirCache.get(dir);
  if (!names) return 'missing';
  const base = path.basename(absPath);
  if (names.includes(base)) return 'ok';
  return names.some((n) => n.toLowerCase() === base.toLowerCase()) ? 'case' : 'missing';
}

const missing = [];
const caseMismatch = [];
let total = 0;

for (let i = start + 1; i < end; i++) {
  if (!/^  \{/.test(lines[i])) continue;
  let j = i;
  while (j < end && !/^  \},?\s*$/.test(lines[j])) j++;
  const code = lines.slice(i, j + 1).filter((l) => !l.trim().startsWith('//')).join('\n');
  const id = (code.match(/\bid:\s*'([^']+)'/) || [])[1] || '?';
  const url = (code.match(/videoUrl:\s*(['"])(.*?)\1/) || [])[2] || '';
  total++;
  const rec = { id, url, from: i, to: j };
  if (/^https?:/i.test(url)) { i = j; continue; }
  const state = url ? lookup(path.resolve(ROOT, 'js', url)) : 'missing';
  if (state === 'missing') missing.push(rec);
  else if (state === 'case') caseMismatch.push(rec);
  i = j;
}

console.log(`Checked ${total} signs.`);
console.log(`\nNo video file (${missing.length}):`);
for (const m of missing) console.log(`  ${m.id}  ->  ${m.url || '(no videoUrl)'}`);
if (caseMismatch.length) {
  console.log(`\nFile exists but filename case differs — will 404 on a case-sensitive host (${caseMismatch.length}); NOT hidden, fix the path/filename:`);
  for (const m of caseMismatch) console.log(`  ${m.id}  ->  ${m.url}`);
}

fs.writeFileSync(
  path.join(ROOT, 'signs-without-videos.txt'),
  missing.map((m) => `${m.id}\t${m.url}`).join('\n') + '\n'
);

if (!APPLY) {
  console.log('\nDry run — nothing changed. Re-run with --apply to comment these out.');
  process.exit(0);
}

fs.copyFileSync(FILE, FILE + '.bak');
for (const m of missing) {
  for (let k = m.from; k <= m.to; k++) lines[k] = '// ' + lines[k];
  lines[m.from] = `// HIDDEN (no video file) — restore by removing the leading "// " on this entry` + eol + lines[m.from];
}
fs.writeFileSync(FILE, lines.join(eol));
console.log(`\nCommented out ${missing.length} entries in js/missions.js (backup: js/missions.js.bak).`);
