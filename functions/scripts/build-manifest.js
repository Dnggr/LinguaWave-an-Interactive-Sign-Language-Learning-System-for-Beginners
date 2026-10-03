/**
 * Builds functions/curriculum-manifest.json from js/missions.js (curriculum) and the routing
 * metadata in js/engine/dictionary.js. Cloud Functions use it to validate lesson claims and
 * enforce the same static/motion model type as the browser classifier.
 *
 *   node functions/scripts/build-manifest.js
 *
 * RE-RUN whenever missions.js changes (new sign/category/mission) and redeploy functions.
 * Item ids follow missions.js's itemId(): `${mission.id}_${index}_${kind}_${signId||category}`.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

global.window = global;
const store = {};
global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
global.sessionStorage = global.localStorage;
require(path.join(__dirname, '..', '..', 'js', 'missions.js'));

// getDetectionType() defaults to static. Read its explicit motion overrides from the
// authoritative dictionary source, avoiding a second hand-maintained type table.
const dictionarySource = fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'engine', 'dictionary.js'), 'utf8');
const dictionaryMatch = /export const SIGN_DICTIONARY = (\{[\s\S]*?^\});/m.exec(dictionarySource);
if (!dictionaryMatch) throw new Error('Could not read SIGN_DICTIONARY from js/engine/dictionary.js');
const signDictionary = vm.runInNewContext(`(${dictionaryMatch[1]})`);

const missions = {};
const signs = new Set();
const detectionTypes = {};
window.LWMissions.getAllMissions().forEach((m) => {
  const items = m.items.map((it) => [it.kind, it.signId || it.category || '', it.bonusXP || 0]);
  const lessonSigns = m.items.filter((it) => it.kind === 'LESSON').map((it) => it.signId);
  lessonSigns.forEach((signId) => {
    signs.add(signId);
    const type = signDictionary[signId]?.detectionType === 'motion' ? 'motion' : 'static';
    // This matches dictionary.js's getDetectionType(): explicit motion override, static default.
    if (detectionTypes[signId] !== 'motion') detectionTypes[signId] = type;
  });
  missions[m.id] = { category: m.category, signCount: lessonSigns.length, items };
});

const out = { generatedAt: new Date().toISOString(), missions, signs: Array.from(signs).sort(), detectionTypes };
const file = path.join(__dirname, '..', 'curriculum-manifest.json');
fs.writeFileSync(file, JSON.stringify(out));
console.log(`missions: ${Object.keys(missions).length}, signs: ${signs.size}, wrote ${file}`);
