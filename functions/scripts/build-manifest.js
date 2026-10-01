/**
 * Builds functions/curriculum-manifest.json from js/missions.js (the curriculum's single source
 * of truth). The Cloud Functions use it to know which missions/items exist, so a client can't
 * claim XP for an item that isn't real.
 *
 *   node functions/scripts/build-manifest.js
 *
 * RE-RUN whenever missions.js changes (new sign/category/mission) and redeploy functions.
 * Item ids follow missions.js's itemId(): `${mission.id}_${index}_${kind}_${signId||category}`.
 */
'use strict';
const fs = require('fs');
const path = require('path');

global.window = global;
const store = {};
global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
global.sessionStorage = global.localStorage;
require(path.join(__dirname, '..', '..', 'js', 'missions.js'));

const missions = {};
const signs = new Set();
window.LWMissions.getAllMissions().forEach((m) => {
  const items = m.items.map((it) => [it.kind, it.signId || it.category || '', it.bonusXP || 0]);
  const lessonSigns = m.items.filter((it) => it.kind === 'LESSON').map((it) => it.signId);
  lessonSigns.forEach((s) => signs.add(s));
  missions[m.id] = { category: m.category, signCount: lessonSigns.length, items };
});

const out = { generatedAt: new Date().toISOString(), missions, signs: Array.from(signs).sort() };
const file = path.join(__dirname, '..', 'curriculum-manifest.json');
fs.writeFileSync(file, JSON.stringify(out));
console.log(`missions: ${Object.keys(missions).length}, signs: ${signs.size}, wrote ${file}`);
