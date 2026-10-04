/**
 * LEGACY: Generates js/xp-config.js (display-only mirror) from functions/xp-config.js.
 *   node functions/scripts/build-client-config.js
 * The active Spark economy is in js/xp-engine.mjs. Do not use this script for economy changes.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { CONFIG, TIERS, buildBadgeCatalog } = require('../xp-config');
const { xpForLevel } = require('../xp-engine');

const thresholds = [];
for (let l = 1; l <= CONFIG.MAX_LEVEL; l++) thresholds.push(xpForLevel(l));

const payload = {
  MAX_LEVEL: CONFIG.MAX_LEVEL,
  LEVEL_XP: thresholds,                       // LEVEL_XP[l-1] = total XP needed to reach level l
  TIERS,
  BADGES: buildBadgeCatalog(),
  GAME: { MIN_LEARNED_BRICKS: CONFIG.GAME.MIN_LEARNED_BRICKS, DAILY_XP_CAP: CONFIG.GAME.DAILY_XP_CAP },
};
const banner = `/**\n * js/xp-config.js — legacy display-only mirror of the former Functions economy.\n * Active XP calculations live in js/xp-engine.mjs; this provides UI labels/icons only.\n */\n`;
fs.writeFileSync(path.join(__dirname, '..', '..', 'js', 'xp-config.js'),
  `${banner}window.LW_XP_CONFIG = ${JSON.stringify(payload)};\n`);
console.log('wrote js/xp-config.js');
