import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, relative, dirname, sep, posix } from 'node:path';

const root = resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '.');
const dry = process.argv.includes('--dry');
const SKIP = new Set(['node_modules', 'dist', '.git']);

function* htmlFiles(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(item.name) || item.name.startsWith('.')) continue;
    const full = resolve(dir, item.name);
    if (item.isDirectory()) yield* htmlFiles(full);
    else if (item.name.endsWith('.html')) yield full;
  }
}

const OLD_ICON_LINK = /[ \t]*<link\b[^>]*\brel=["'](?:shortcut icon|icon|apple-touch-icon)["'][^>]*>[ \t]*\r?\n?/gi;

let changed = 0, same = 0, skipped = 0;
for (const file of htmlFiles(root)) {
  let html = readFileSync(file, 'utf8');
  if (!/<\/head>/i.test(html)) { console.log('skip (no </head>):', relative(root, file)); skipped++; continue; }

  const up = relative(dirname(file), root).split(sep).filter(Boolean).map(() => '..').join('/');
  const base = (up ? up + '/' : '') + posix.join('assets/icon');
  const nl = html.includes('\r\n') ? '\r\n' : '\n';
  const block = [
    `  <link rel="icon" href="${base}/favicon.ico" sizes="any" />`,
    `  <link rel="icon" type="image/png" href="${base}/favicon.png" />`,
    `  <link rel="apple-touch-icon" href="${base}/apple-touch-icon.png" />`,
  ].join(nl) + nl;

  const stripped = html.replace(OLD_ICON_LINK, '');
  const at = stripped.toLowerCase().lastIndexOf('</head>');
  const lineStart = stripped.lastIndexOf('\n', at) + 1;
  const insertAt = /^[ \t]*$/.test(stripped.slice(lineStart, at)) ? lineStart : at;
  const next = stripped.slice(0, insertAt) + block + stripped.slice(insertAt);
  if (next === html) { same++; continue; }
  console.log((dry ? 'would update: ' : 'updated: ') + relative(root, file));
  if (!dry) writeFileSync(file, next, 'utf8');
  changed++;
}
console.log(`\n${dry ? 'Dry run - ' : ''}${changed} page(s) ${dry ? 'would change' : 'updated'}, ${same} already correct, ${skipped} skipped.`);
