'use strict';
const fs = require('fs');
const path = require('path');
const { CONFIG, TIERS, buildBadgeCatalog } = require('../xp-config');
const { xpForLevel } = require('../xp-engine');

const thresholds = [];
for (let l = 1; l <= CONFIG.MAX_LEVEL; l++) thresholds.push(xpForLevel(l));

const payload = {
  MAX_LEVEL: CONFIG.MAX_LEVEL,
  LEVEL_XP: thresholds,
  TIERS,
  BADGES: buildBadgeCatalog(),
  GAME: { MIN_LEARNED_BRICKS: CONFIG.GAME.MIN_LEARNED_BRICKS, DAILY_XP_CAP: CONFIG.GAME.DAILY_XP_CAP },
};
const banner = `/**\n * js/xp-config.js — legacy display-only mirror of the former Functions economy.\n * Active XP calculations live in js/xp-engine.mjs; this provides UI labels/icons only.\n */\n`;
fs.writeFileSync(path.join(__dirname, '..', '..', 'js', 'xp-config.js'),
  `${banner}window.LW_XP_CONFIG = ${JSON.stringify(payload)};\n`);
console.log('wrote js/xp-config.js');
