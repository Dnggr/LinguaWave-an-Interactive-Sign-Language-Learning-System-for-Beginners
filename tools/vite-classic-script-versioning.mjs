/**
 * vite-classic-script-versioning.mjs — cache busting for NON-module scripts.
 *
 * WHY: Vite only hashes <script type="module"> and CSS. LinguaWave's pages also
 * load ~30 classic scripts (main.js, missions.js, theme.js, role-guard.js ...).
 * Vite leaves those untouched, so after a deploy a browser could keep running an
 * old copy next to freshly hashed modules.
 *
 * WHAT: run AFTER the build (and after js/ has been copied into dist/). For every
 * built .html file, each classic <script src="..."> that points at a file inside
 * dist/ gets "?v=<first 8 hex of sha256(file content)>" appended. Same file
 * content -> same URL (still cacheable); changed content -> new URL.
 *
 * Deliberately NOT touched:
 *   - <script type="module"> (Vite already hashed those)
 *   - external URLs (https:, //, data:) and srcs that already have a ?query
 *   - anything inside an HTML comment or the body of an inline <script>
 *     (this repo has comments that mention tags; see the </head> bug in index.html)
 *   - srcs that don't resolve to a real file in dist/ (left as-is, reported)
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const hashCache = new Map();

function hashFile(file) {
  let h = hashCache.get(file);
  if (!h) {
    h = createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 8);
    hashCache.set(file, h);
  }
  return h;
}

function findHtmlFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) findHtmlFiles(full, out);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) out.push(full);
  }
  return out;
}

const COMMENT_OR_SCRIPT = /<!--[\s\S]*?-->|<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const SRC_ATTR = /(\bsrc\s*=\s*)(["'])([^"']*)\2/i;
const IS_MODULE = /\btype\s*=\s*["']?module\b/i;
const IS_ABSOLUTE_URL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

export function versionHtml(html, htmlFile, distDir, stats) {
  return html.replace(COMMENT_OR_SCRIPT, (match, attrs) => {
    if (match.startsWith('<!--')) return match;                 // comment: leave alone
    if (attrs === undefined || IS_MODULE.test(attrs)) return match;
    const srcMatch = SRC_ATTR.exec(attrs);
    if (!srcMatch) return match;                                // inline script
    const src = srcMatch[3];
    if (!src || IS_ABSOLUTE_URL.test(src) || /[?#]/.test(src)) return match;

    const file = src.startsWith('/')
      ? resolve(distDir, '.' + src)
      : resolve(dirname(htmlFile), src);
    const inside = file === distDir || file.startsWith(distDir + sep);
    let isFile = false;
    try { isFile = inside && statSync(file).isFile(); } catch { /* missing */ }
    if (!isFile) {
      stats.missing.push(`${relative(distDir, htmlFile)} -> ${src}`);
      return match;
    }

    stats.tags += 1;
    stats.files.add(relative(distDir, file).split(sep).join('/'));
    const versioned = `${src}?v=${hashFile(file)}`;
    return match.replace(SRC_ATTR, (_m, pre, quote) => `${pre}${quote}${versioned}${quote}`);
  });
}

export function versionClassicScripts(distDir) {
  distDir = resolve(distDir);
  const stats = { pages: 0, tags: 0, files: new Set(), missing: [] };
  for (const htmlFile of findHtmlFiles(distDir)) {
    const before = readFileSync(htmlFile, 'utf8');
    const after = versionHtml(before, htmlFile, distDir, stats);
    if (after !== before) {
      writeFileSync(htmlFile, after);
      stats.pages += 1;
    }
  }
  return stats;
}
