import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const root = resolve(args.find((a) => !a.startsWith('--')) || '.');
const pagesDir = join(root, 'pages');
if (!existsSync(pagesDir)) { console.error('No "pages" folder here. Run this from the project root.'); process.exit(1); }

let changed = 0, same = 0, problems = 0;

for (const name of readdirSync(pagesDir).filter((n) => /^admin-.*\.html$/.test(n))) {
  const file = join(pagesDir, name);
  const html = readFileSync(file, 'utf8');
  const nl = html.includes('\r\n') ? '\r\n' : '\n';

  if (html.includes('app-sidebar__foot--admin')) { same++; continue; }

  const start = html.search(/[ \t]*<div class="app-sidebar__foot"[^>]*>/);
  const end = html.indexOf('</aside>', start);
  if (start < 0 || end < 0) { console.log(`skip (no sidebar footer found): ${name}`); problems++; continue; }

  const oldFoot = html.slice(start, end);
  const theme = oldFoot.match(/<button\b[^>]*\bclass="theme-switch"[\s\S]*?<\/button>/);
  const logout = oldFoot.match(/<a\b[^>]*\bdata-logout="([^"]*)"[^>]*>/);
  if (!theme || !logout) { console.log(`skip (theme switch or Log out link not found): ${name}`); problems++; continue; }

  const themeBlock = ['          ' + theme[0]];

  const newFoot = [
    '      <div class="app-sidebar__foot app-sidebar__foot--account app-sidebar__foot--admin">',
    '        <div class="app-sidebar__foot-row">',
    `          <a href="#" class="app-sidebar__logout" data-logout="${logout[1]}">`,
    '            <span class="app-sidebar__icon" aria-hidden="true" data-lw-icon="log_out"></span>',
    '            Log out',
    '          </a>',
    ...themeBlock,
    '        </div>',
    '      </div>',
    '    ',
  ].join(nl);

  console.log((dry ? 'would update: ' : 'updated: ') + name);
  if (!dry) writeFileSync(file, html.slice(0, start) + newFoot + html.slice(end), 'utf8');
  changed++;
}

const cssFile = join(root, 'css', 'admin.css');
const MARK = '/* admin sidebar footer (scripts/update-admin-sidebar.mjs) */';
if (existsSync(cssFile)) {
  const css = readFileSync(cssFile, 'utf8');
  if (css.includes(MARK)) console.log('css/admin.css already has the rule.');
  else {
    const nl = css.includes('\r\n') ? '\r\n' : '\n';
    const rule = [`${nl}${MARK}`, '.app-sidebar__foot--admin .app-sidebar__foot-row { margin-top: 0; padding-top: 0; border-top: 0; }', ''].join(nl);
    console.log((dry ? 'would add' : 'added') + ' the footer rule to css/admin.css');
    if (!dry) writeFileSync(cssFile, css.replace(/\s*$/, '') + nl + rule, 'utf8');
  }
} else { console.log('css/admin.css not found - add the rule by hand (see the message).'); problems++; }

console.log(`\n${dry ? 'Dry run - ' : ''}${changed} page(s) ${dry ? 'would change' : 'updated'}, ${same} already done, ${problems} problem(s).`);
