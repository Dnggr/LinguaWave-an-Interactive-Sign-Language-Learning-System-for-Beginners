/**
 * Pure LinguaWave XP engine for Spark/browser and Node.
 *
 * There is no Firebase, DOM, local storage, or window access in this module.
 * These limits make the engine easy to import in Node and keep game/lesson
 * calculations in one place. Since a browser owns the writes on Spark, the
 * client rules are best-effort guardrails: a determined learner can forge
 * claims inside the Firestore caps.
 */

// ── Time Attack word bank ─────────────────────────────────────────────────────────────────────────────────────
// Only handshapes the static model can classify: no J or Z (motion letters) and no 6 or 9 (motion digits). 'ak 47' etc. use '_'
// for a space in the label. The first four words are the original run and keep their ids.
const FINGERSPELL_WORD_LIST =
  'car america ak_47 hamburger ' +
  // 3-letter words (338)
  'ace add age ago aid aim air all and ant any ape arc are arm art ash ask ate awe axe bad bag ban bar bat bay bed ' +
  'bee beg bet bib bid big bin bit bow box boy bud bug bun bus but buy cab cam can cap cat cob cod cog cot cow cry ' +
  'cub cup cut dad dam day den dew did die dig dim dip doe dog dot dry due dug duo dye ear eat eel egg elf elk elm ' +
  'end era eve ewe eye fan far fat fed fee few fig fin fir fit fix fly foe fog for fox fry fun fur gap gas gel gem ' +
  'get got gum guy gym had ham has hat hay hem hen her hid him hip his hog hop hot how hub hue hug hum hut ice icy ' +
  'ill ink inn ion ivy kid key kin kit lab lad lag lap law lay led leg let lid lie lip lit log lot low mad man map ' +
  'mat may men met mix mom mop mud mug nap net new nod nor not now nun nut oak oar oat odd off oil old one orb our ' +
  'out owe owl own pad pal pan pat paw pay pea peg pen pet pie pig pin pit pod pop pup put rag ram ran rat raw ray ' +
  'red rib rid rim rip rod rot row rub rug run rye sad sap sat saw say sea see set sew shy sip sir sit six ski sky ' +
  'sly son sow soy spa spy sub sum sun tab tag tan tap tar tax tea ten the tie tin tip toe ton too top toy try tub ' +
  'tug two urn use van vat vet vow wag war was wax way web wed wet who why wig win wit woe won wow yak yam yes yet ' +
  'you yum mp3 b12 4wd h2o co2 abc dvd gps usa atm cpu diy faq fyi 123 321 505 247 380 150 720 840 100 200 300 400 ' +
  '500 700 ' +
  // 4-letter words (559)
  'able arch area army aunt baby back ball band bank barn base bath bean bear beat bell belt bend bike bird blue ' +
  'boat body bone book boom boot born bowl bulb bush busy cake call calm camp card care cart case cash cave chin ' +
  'chip city clam clap clay clip club coat code coin cold cook cool corn cost crab crew crop cube cure dark dart ' +
  'data date dawn deal deer desk dial dice diet dime dish dive door dove down drag draw drum duck dust duty each ' +
  'earn east easy edge face fact fail fair fall farm fast fear feed feel fern file fill film find fine fire firm ' +
  'fish five flag flat flew flip flow foam fold folk food foot fork form fort four free frog from fuel full fund ' +
  'game gate gear gift girl give glad glow glue goal goat gold golf good grab gray grew grid grin grip grow gulf ' +
  'hair half hall hand hang hard harm hawk heal heap hear heat help herb hero hide high hike hill hint hive hold ' +
  'hole home hood hook hope horn host hour huge hunt hurt idea inch iron isle item keen keep kick kind king kite ' +
  'knee knit knob knot know lace lack lady lake lamb lamp land lane last late lawn lead leaf lean leap left lend ' +
  'lens life lift like lily limb lime line link lion list live load loaf loan lock loft long look loop lose loud ' +
  'love luck lung made mail main make mall many mark mask mass mate meal mean meat meet melt menu mild milk mind ' +
  'mine mint miss mist moon more moss most moth move much nail name navy near neck need nest news nice nine node ' +
  'noon nose note once only open oval oven over pace pack page pail pain pair palm park part pass past path peak ' +
  'pear peel pink pipe plan play plot plug plum poem pole pond pony pool poor port pose post pour pray pull pump ' +
  'pure push quit race rain rank rare rate read real rent rest rice rich ride ring rise risk road roar rock role ' +
  'roll roof room root rope rose ruby rule rush safe sail salt same sand save seal seat seed seek self sell send ' +
  'shed ship shoe shop show shut sick side sign silk sing sink site skin skip slam slap sled slid slim slip slow ' +
  'snow soap sock soft soil sold sole some song soon sort soul soup spin spot star stay stem step stir stop such ' +
  'suit sure swan swim tail take tale talk tall tank tape task team tear tell tent term test text than that them ' +
  'then they thin this tide tidy tile till time tiny tire toad told toll tone took tool town trap tray tree trim ' +
  'trio trip true tube tune turn twin type unit upon used vase vast verb very vest view vine visa vote wage wait ' +
  'wake walk wall want warm warn wash wave weak wear week well went were west what when whom wide wife wild will ' +
  'wind wine wing wink wise wish with wolf wood wool word wore work worm wrap yard yarn yawn year yell yoga your ' +
  '1234 4321 2024 2025 2020 2010 2000 1812 8421 1357 1010 3030 4040 5050 7070 8080 1111 2222 3333 4444 5555 7777 ' +
  '8888 1212 1313 2323 2345 3245 4528 5421 7245 ' +
  // 7-letter words (181)
  'animals balance balloon bananas bedroom blanket brother cabbage cabinet captain carpets carrots chicken chimney ' +
  'clothes college compass concert cookies cottage country courage cousins cricket curtain dentist diamond dolphin ' +
  'dragons drawing dresser explore fabrics factory farmers feather fiction fishing flowers freedom friends general ' +
  'giraffe glasses grocery habitat hammock harvest healthy helpers history holiday husband kitchen kingdom ladders ' +
  'lantern leaders leaving lessons letters library lobster machine magnets mailbox mammals marbles markets meadows ' +
  'medical members mineral mirrors monkeys morning mothers mystery napkins natural needles network nothing numbers ' +
  'octopus orchard outdoor oysters package painter palaces parents parrots pastels patient pattern peanuts penguin ' +
  'pencils pickles picnics pigeons pillows pirates planets plastic players pockets popcorn pottery printer pumpkin ' +
  'puppets rabbits railway rainbow readers recipes reports rockets rooster sailors sandals scarves schools scooter ' +
  'seagull seasons shadows sharing shelter shovels skating sneaker snowman soldier spiders sponges stadium station ' +
  'stories streets student sunrise sunsets teacher tickets trouble trumpet tunnels turkeys turtles uniform vehicle ' +
  'village violins visitor walnuts weather weekend whistle windows wonders workers writers younger grandpa harmony ' +
  'oatmeal quietly thirsty victory whisper 1234578 8754321 1357024 catch_22 2345781 3457812 8123457 7531248 ' +
  // 9-letter words (250)
  'bookshelf butterfly dragonfly evergreen footsteps furniture gymnasium hairbrush happiness important pineapple ' +
  'raspberry snowflake spaghetti starlight stopwatch tangerine valentine vegetable volcanoes waterfall wonderful ' +
  'adventure afternoon alligator ambulance beautiful blueberry bookstore breakfast chocolate classroom community ' +
  'crocodile delicious dinosaurs education elephants excellent exercises favorites fireworks flamingos fountains ' +
  'gardening gentleman hurricane knowledge landscape mountains neighbors newspaper nightmare orchestra porcupine ' +
  'president scarecrow scientist seahorses signature snowstorm sparkling squirrels sunflower surprised telephone ' +
  'thousands tornadoes tradition treasures umbrellas yesterday abilities apartment artichoke astronaut attention ' +
  'beginning blackbird boardwalk bookmarks brightest broadcast buildings cardboard carefully carpenter catalogue ' +
  'celebrate challenge champions character clubhouse collected companion competing conductor connected continent ' +
  'cranberry creatures cucumbers customers daffodils dandelion daydreams delighted detective different discovery ' +
  'dumplings elevators emergency energetic engineers envelopes expensive explorers fantastic fireplace fisherman ' +
  'fragrance frequency gathering geography gladiator goldfinch grassland gratitude guidebook hairdryer halloween ' +
  'handshake harmonica headlight heartbeat hibernate historian honeybees horseback hospitals household imaginary ' +
  'interview invention invisible kilometer leftovers lifeboats lightning limestone lollipops lunchtime marmalade ' +
  'meanwhile meatballs megaphone memorable merchants milkshake moonlight motorbike mushrooms mysteries nightfall ' +
  'notebooks nutrition occasions octopuses offspring operation opponents orangutan ornaments outsiders overnight ' +
  'packaging paintings parachute paragraph passenger pavements performer periscope pinecones pirouette policemen ' +
  'pollution principal professor protected railroads reception recycling relatives remainder resources riverbank ' +
  'sailboats saxophone scorpions seashells secretary sentences seventeen shipwreck shoelaces shortcake skeletons ' +
  'snowboard solutions somewhere sparklers spectacle spiderweb spotlight sprinkler stockings stoplight storybook ' +
  'submarine superhero supporter surprises survivors swordfish teaspoons telescope textbooks toothache transport ' +
  'traveling triangles turquoise vacations violinist volunteer warehouse wardrobes whirlwind wolfhound woodlands ' +
  'workbench wristband 123457810 187543210 102030405 345781234 827412345 120345781 ' +
  '';
const FINGERSPELL_WORDS = Object.freeze(FINGERSPELL_WORD_LIST.split(/\s+/).filter(Boolean).map((entry) => {
  const label = entry.replace(/_/g, ' '), id = entry.replace(/_/g, '').toLowerCase();
  return Object.freeze({ id, label, symbols: Object.freeze([...id.toUpperCase()]) });
}));

export const CONFIG = Object.freeze({
  VERSION: 1,
  MAX_LEVEL: 30,
  LEVEL_BASE: 100,
  LEVEL_STEP: 25,
  LESSON_ITEM_XP: Object.freeze({ LESSON: 6, BOOSTER: 3, PRACTICE: 5 }),
  MISSION_BONUS: Object.freeze({ base: 25, perSign: 3, max: 80 }),
  MISSION_SKIP_FACTOR: 0.4,
  MISSION_FULL_LESSON_RATIO: 0.8,
  LESSON_DAILY_SOFT_CAP: 800,
  LESSON_OVER_CAP_FACTOR: 0.5,
  MIN_CLAIM_GAP_MS: 2000,
  MIN_SKIP_CLAIM_GAP_MS: 90000,
  BACKFILL_FACTOR: 0.5,
  BACKFILL_MAX_XP: 1500,
  BACKFILL_WINDOW_DAYS: 14,
  LAUNCH_AT_ISO: '2026-10-01T00:00:00Z',
  TZ_CHANGE_COOLDOWN_DAYS: 14,
  GAME: Object.freeze({
    MIN_LEARNED_BRICKS: 6,
    BRICK_XP: Object.freeze({ static: 1, motion: 2 }),
    CLEAR_BONUS: 3,
    FLAWLESS_BONUS: 3,
    ACC_TIERS: Object.freeze([{ min: 0.85, mult: 1 }, { min: 0.60, mult: 0.8 }, { min: 0, mult: 0.5 }]),
    WALL_DECAY: Object.freeze([{ upTo: 3, mult: 1 }, { upTo: 5, mult: 0.5 }, { upTo: 7, mult: 0.25 }, { upTo: 999, mult: 0 }]),
    DAILY_XP_CAP: 90,
    MAX_BRICKS: 21,
    MIN_GAP_MS: Object.freeze({ static: 400, motion: 3000 }),
    CLOCK_SLACK_MS: 3000,
    SESSION_TTL_MS: 30 * 60 * 1000,
    SPEED_BADGE_MS_PER_BRICK: 6000,
    VETERAN_WALLS: 5,
  }),
  // Construct a Sentence. Open to every verified learner (no learned signs needed). XP is 1 per word; it shares GAME.DAILY_XP_CAP.
  SENTENCE: Object.freeze({
    WORD_XP: 1,
    DIFFICULTY_MULT: Object.freeze({ easy: 1, medium: 1.25, hard: 1.5 }),
    MAX_ROUNDS: 10,
    MIN_WORDS: 3,
    MAX_WORDS: 8,
    MIN_MS_PER_WORD: 500,
    VETERAN_RUNS: 5,
  }),
  // Time Attack (fingerspelling). The learner spells each word letter by letter; the longer the word, the more XP.
  // Balanced like Construct a Sentence: small per-letter XP plus the shared CLEAR/FLAWLESS bonuses, and it counts
  // against the same GAME.DAILY_XP_CAP (90/day). car 3, ak 47 4, america 7, hamburger 9 (+3 clear, +3 flawless = 29 per run).
  FINGERSPELL: Object.freeze({
    // 1332 words, listed in FINGERSPELL_WORD_LIST below. Every run spells ONE random word per length in RUN_LENGTHS, so every
    // run is 23 letters and worth the same XP/leaderboard weight as any other run, whichever words were drawn.
    RUN_LENGTHS: Object.freeze([3, 4, 7, 9]),
    WORDS: FINGERSPELL_WORDS,
    LETTER_XP: 1,               // XP per letter/number, so a word is worth its length
    MIN_MS_PER_LETTER: 450,     // a letter needs a 500 ms steady hold, so nobody can honestly beat this
  }),
});

export const TIERS = Object.freeze([
  { from: 1, name: 'Ripple', icon: '💧', color: '#38bdf8' },
  { from: 5, name: 'Current', icon: '🌊', color: '#22d3ee' },
  { from: 10, name: 'Tide', icon: '🐚', color: '#2dd4bf' },
  { from: 15, name: 'Swell', icon: '🏄', color: '#818cf8' },
  { from: 20, name: 'Crest', icon: '🔱', color: '#c084fc' },
  { from: 25, name: 'Tsunami', icon: '🌋', color: '#f59e0b' },
]);

function tierForLevel(level) {
  let tier = TIERS[0];
  for (const candidate of TIERS) if (level >= candidate.from) tier = candidate;
  return tier;
}

export function xpForLevel(level) {
  const n = Math.max(1, Math.min(CONFIG.MAX_LEVEL, Number(level) | 0)) - 1;
  return n * CONFIG.LEVEL_BASE + CONFIG.LEVEL_STEP * n * (n - 1) / 2;
}

export const LEVEL_XP = Object.freeze(Array.from({ length: CONFIG.MAX_LEVEL }, (_, i) => xpForLevel(i + 1)));

export function buildBadgeCatalog() {
  const badges = {};
  for (let level = 1; level <= CONFIG.MAX_LEVEL; level++) {
    const tier = tierForLevel(level);
    badges[`lesson_L${level}`] = { id: `lesson_L${level}`, group: 'lesson', level, icon: '📘', color: tier.color,
      name: `${tier.name} Scholar · Lv ${level}`, desc: `Finish a lesson once you have reached level ${level}.` };
    badges[`game_L${level}`] = { id: `game_L${level}`, group: 'game', level, icon: '🧱', color: tier.color,
      name: `${tier.name} Wall Breaker · Lv ${level}`, desc: `Clear a Wall Breaker wall once you have reached level ${level}.` };
  }
  for (let level = 1; level <= CONFIG.MAX_LEVEL; level++) {
    badges[`sentence_L${level}`] = { id: `sentence_L${level}`, group: 'sentence', level, icon: '🧩', color: tierForLevel(level).color,
      name: `Sentence Builder · Lv ${level}`, desc: `Finish a Construct a Sentence run once you have reached level ${level}.` };
  }
  for (const days of [3, 7, 14, 30, 60, 100]) badges[`streak_${days}`] = {
    id: `streak_${days}`, group: 'streak', icon: '🔥', color: '#f97316', name: `${days}-Day Streak`, desc: `Learn on ${days} days in a row.`,
  };
  badges.game_first = { id: 'game_first', group: 'game', icon: '🧱', color: '#38bdf8', name: 'First Wall', desc: 'Clear your first counted wall.' };
  badges.game_flawless = { id: 'game_flawless', group: 'game', icon: '💎', color: '#22d3ee', name: 'Flawless', desc: 'Clear a counted wall with no misses.' };
  badges.game_speed = { id: 'game_speed', group: 'game', icon: '⚡', color: '#facc15', name: 'Speed Breaker', desc: 'Clear a counted wall at 6 seconds a brick or faster.' };
  badges.game_veteran = { id: 'game_veteran', group: 'game', icon: '🏗️', color: '#f59e0b', name: 'Wall Veteran', desc: `Clear ${CONFIG.GAME.VETERAN_WALLS} counted walls.` };
  badges.sentence_first = { id: 'sentence_first', group: 'sentence', icon: '💬', color: '#38bdf8', name: 'First Sentence', desc: 'Finish your first counted Construct a Sentence run.' };
  badges.sentence_flawless = { id: 'sentence_flawless', group: 'sentence', icon: '✨', color: '#22d3ee', name: 'Word Perfect', desc: 'Finish a counted sentence run with no misses.' };
  badges.sentence_hard = { id: 'sentence_hard', group: 'sentence', icon: '🧠', color: '#c084fc', name: 'Memory Master', desc: 'Finish a counted sentence run on Hard.' };
  badges.sentence_veteran = { id: 'sentence_veteran', group: 'sentence', icon: '📜', color: '#f59e0b', name: 'Sentence Veteran', desc: `Finish ${CONFIG.SENTENCE.VETERAN_RUNS} counted sentence runs.` };
  for (const [count, id, name, icon, color] of [
    [1, 'missions_1', 'First Lesson', '🎓', '#38bdf8'],
    [10, 'missions_10', 'Ten Lessons', '📚', '#2dd4bf'],
    [25, 'missions_25', 'Twenty-Five Lessons', '🏅', '#c084fc'],
  ]) badges[id] = { id, group: 'lesson', icon, color, name, desc: `Complete ${count === 1 ? 'your first lesson' : `${count} lessons`}.` };
  return badges;
}

export const BADGES = Object.freeze(buildBadgeCatalog());
export const STREAK_BADGE_DAYS = Object.freeze([3, 7, 14, 30, 60, 100]);
export const MISSION_COUNT_BADGES = Object.freeze([[1, 'missions_1'], [10, 'missions_10'], [25, 'missions_25']]);

export function levelFromXp(xp) {
  let level = 1;
  while (level < CONFIG.MAX_LEVEL && xp >= xpForLevel(level + 1)) level++;
  return level;
}

export function levelProgress(xp) {
  const level = levelFromXp(xp);
  if (level >= CONFIG.MAX_LEVEL) return { level, into: 0, need: 0, pct: 100, maxed: true };
  const lo = xpForLevel(level), hi = xpForLevel(level + 1);
  return { level, into: xp - lo, need: hi - lo, pct: Math.floor((xp - lo) * 100 / (hi - lo)), maxed: false };
}

export function isValidTz(tz) {
  if (typeof tz !== 'string' || tz.length < 1 || tz.length > 64) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}

export function dayKey(ms, tz) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
}

export function shiftDayKey(key, delta) {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + delta));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function tzOffsetMs(ms, tz) {
  const parts = {};
  new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .formatToParts(new Date(ms)).forEach((part) => { parts[part.type] = part.value; });
  return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second) - Math.floor(ms / 1000) * 1000;
}

export function startOfDayMs(key, tz) {
  const [year, month, day] = key.split('-').map(Number);
  const guess = Date.UTC(year, month - 1, day);
  return guess - tzOffsetMs(guess - tzOffsetMs(guess, tz), tz);
}

export function weekKeyUtc(ms) {
  const date = new Date(ms);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/* ── Day Streak (same GRACE rule as js/missions.js) ───────────────────
 * ONE missed day in a row is forgiven (the streak counts ACTIVE days, so Tue, Thu, Fri = 3),
 * TWO missed days in a row reset it. Keep this in step with STREAK_MAX_MISSED_DAYS in missions.js. */
export const STREAK_MAX_MISSED_DAYS = 1;

/** Whole calendar days from day key `from` to day key `to` (negative when `to` is earlier). */
export function dayGap(from, to) {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
}

export function applyStreak(streak, today) {
  const current = streak || { current: 0, longest: 0, lastDay: null };
  if (current.lastDay) {
    const gap = dayGap(current.lastDay, today);
    if (gap <= 0) return { ...current };            // same day, or the device clock went backwards: nothing changes
    if (gap - 1 <= STREAK_MAX_MISSED_DAYS) {
      const next = (current.current || 0) + 1;
      return { current: next, longest: Math.max(current.longest || 0, next), lastDay: today };
    }
  }
  return { current: 1, longest: Math.max(current.longest || 0, 1), lastDay: today };
}

/** What to DISPLAY on local day `today`: live until a SECOND missed day in a row has passed. */
export function effectiveStreak(streak, today) {
  if (!streak?.lastDay) return 0;
  const gap = dayGap(streak.lastDay, today);
  return gap - 1 <= STREAK_MAX_MISSED_DAYS ? (streak.current || 0) : 0;
}

export function lessonItemXp(kind, bonusXP = 0) {
  const base = CONFIG.LESSON_ITEM_XP[kind];
  if (!base) return 0;
  return base + (kind === 'PRACTICE' && Number(bonusXP) ? Number(bonusXP) : 0);
}

export function missionBonus(signCount) {
  return Math.min(CONFIG.MISSION_BONUS.max, CONFIG.MISSION_BONUS.base + CONFIG.MISSION_BONUS.perSign * signCount);
}

export function applyLessonSoftCap(rawXp, lessonXpToday) {
  const room = Math.max(0, CONFIG.LESSON_DAILY_SOFT_CAP - lessonXpToday);
  if (rawXp <= room) return rawXp;
  return room + Math.floor((rawXp - room) * CONFIG.LESSON_OVER_CAP_FACTOR);
}

export function wallDecayMult(wallsAlreadyToday) {
  return CONFIG.GAME.WALL_DECAY.find((tier) => wallsAlreadyToday < tier.upTo)?.mult || 0;
}

export function gameWallXp({ bricks, wrong, wallsToday, gameXpToday }) {
  const game = CONFIG.GAME;
  const learnedBricks = bricks.filter((brick) => brick.learned);
  if (learnedBricks.length < game.MIN_LEARNED_BRICKS) return { eligible: false, xp: 0, raw: 0, reason: 'not_enough_learned' };
  const accuracy = bricks.length / Math.max(1, bricks.length + wrong);
  const accMult = (game.ACC_TIERS.find((tier) => accuracy >= tier.min) || game.ACC_TIERS.at(-1)).mult;
  const base = learnedBricks.reduce((sum, brick) => sum + (brick.motion ? game.BRICK_XP.motion : game.BRICK_XP.static), 0);
  const flawless = wrong === 0;
  const raw = base * accMult + game.CLEAR_BONUS + (flawless ? game.FLAWLESS_BONUS : 0);
  const decay = wallDecayMult(wallsToday);
  const room = Math.max(0, game.DAILY_XP_CAP - gameXpToday);
  const xp = Math.min(Math.round(raw * decay), room);
  return { eligible: true, xp, raw: Math.round(raw), accuracy, flawless, decay,
    capped: xp < Math.round(raw * decay) || (decay > 0 && room === 0),
    reason: xp === 0 ? (decay === 0 ? 'diminished' : 'daily_cap') : null };
}

export function validateGameTiming({ sessionSigns, broken, elapsedMs }) {
  const game = CONFIG.GAME;
  if (!Array.isArray(broken) || broken.length !== sessionSigns.length) return 'incomplete_wall';
  const seen = new Set();
  const expected = new Set(sessionSigns);
  let previous = 0;
  let minTotal = 0;
  for (const brick of broken) {
    if (!brick || typeof brick.s !== 'string' || !expected.has(brick.s) || seen.has(brick.s)) return 'bad_bricks';
    seen.add(brick.s);
    if (typeof brick.t !== 'number' || !Number.isFinite(brick.t) || brick.t < previous) return 'bad_timing';
    const minGap = game.MIN_GAP_MS[brick.m ? 'motion' : 'static'];
    if (brick.t - previous < minGap) return 'too_fast';
    minTotal += minGap;
    previous = brick.t;
  }
  if (previous > elapsedMs + game.CLOCK_SLACK_MS) return 'clock_mismatch';
  if (elapsedMs < minTotal) return 'too_fast';
  return null;
}

export function nextLevelBadge(group, level, owned) {
  for (let current = 1; current <= Math.min(level, CONFIG.MAX_LEVEL); current++) {
    const id = `${group}_L${current}`;
    if (!owned[id]) return id;
  }
  return null;
}

export const streakBadgesFor = (current) => STREAK_BADGE_DAYS.filter((days) => current >= days).map((days) => `streak_${days}`);
export const missionCountBadgesFor = (count) => MISSION_COUNT_BADGES.filter(([required]) => count >= required).map(([, id]) => id);

export function newState(now) {
  return {
    v: 1, xp: 0, level: 1, weeklyXp: 0, weekKey: weekKeyUtc(now), tz: null, tzChangedAt: 0,
    streak: { current: 0, longest: 0, lastDay: null }, badges: {}, lessonItems: {}, missionsDone: {}, learnedSigns: [],
    daily: { day: null, lessonXp: 0, gameXp: 0, walls: 0, timeAttacks: 0 },
    totals: { lessonXp: 0, gameXp: 0, walls: 0, countedWalls: 0, timeAttacks: 0, missions: 0, sentences: 0, wallXp: 0, timeAttackXp: 0, sentenceXp: 0 },
    lastClaimAt: 0, lastSkipAt: 0, backfilled: false, hidden: false, createdAt: now,
  };
}

export function normalizeState(raw, now) {
  const empty = newState(now);
  const state = { ...empty, ...(raw || {}) };
  state.streak = { ...empty.streak, ...(state.streak || {}) };
  state.daily = { ...empty.daily, ...(state.daily || {}) };
  state.totals = { ...empty.totals, ...(state.totals || {}) };
  state.badges ||= {};
  state.lessonItems ||= {};
  state.missionsDone ||= {};
  state.learnedSigns ||= [];
  return state;
}

export function resolveTimezone(state, hint, now) {
  if (!state.tz) {
    state.tz = isValidTz(hint) ? hint : 'UTC';
    state.tzChangedAt = now;
  } else if (isValidTz(hint) && hint !== state.tz && now - (state.tzChangedAt || 0) >= CONFIG.TZ_CHANGE_COOLDOWN_DAYS * 86400000) {
    // This cooldown limits accidental timezone flips; changing the device clock can still cheat day boundaries.
    state.tz = hint;
    state.tzChangedAt = now;
  }
}

export function rollover(state, now) {
  const today = dayKey(now, state.tz || 'UTC');
  if (state.daily.day !== today) state.daily = { day: today, lessonXp: 0, gameXp: 0, walls: 0, timeAttacks: 0 };
  const week = weekKeyUtc(now);
  if (state.weekKey !== week) {
    state.weekKey = week;
    state.weeklyXp = 0;
  }
  return today;
}

export function addXp(state, value, out) {
  if (value <= 0) return;
  const before = state.level;
  state.xp += value;
  state.weeklyXp += value;
  state.level = levelFromXp(state.xp);
  for (let level = before + 1; level <= state.level; level++) (out.levelUps ||= []).push(level);
}

export function grantBadge(state, id, out, now) {
  if (!BADGES[id] || state.badges[id]) return;
  state.badges[id] = now;
  (out.newBadges ||= []).push(id);
}

export function applyActivityStreak(state, today, out, now) {
  state.streak = applyStreak(state.streak, today);
  streakBadgesFor(state.streak.current).forEach((id) => grantBadge(state, id, out, now));
}

/**
 * Catch-up for a streak that was stored under the old strict rule (Tue, Thu, Fri saved as 2, should be 3).
 * `missions` is the summary js/missions.js keeps from the real activity days: { currentStreak, lastActivityDate }.
 * Raises state.streak.current toward it and grants the streak badges that unlocks. Returns true when it changed.
 * It only ever RAISES a streak that is still live and ends on the same day as the missions one, and it moves
 * ONE step per call because firestore.rules cap a single write at streak.current <= previous + 1
 * (js/xp.js syncStreak() simply calls it again until it reports nothing left to heal).
 */
export function healStreakFromMissions(state, today, out, now, missions) {
  const last = state.streak?.lastDay;
  if (!last || !missions || missions.lastActivityDate !== last) return false;
  if (!effectiveStreak(state.streak, today)) return false;
  const target = Math.floor(Number(missions.currentStreak) || 0);
  const have = state.streak.current || 0;
  if (target <= have) return false;
  const next = have + 1;
  state.streak = { ...state.streak, current: next, longest: Math.max(state.streak.longest || 0, next) };
  streakBadgesFor(next).forEach((id) => grantBadge(state, id, out, now));
  return true;
}

export function applyLessonItem(state, mission, itemIndex, { now, today }) {
  const item = mission.items[itemIndex];
  if (!item || !CONFIG.LESSON_ITEM_XP[item.kind]) return { ok: false, reason: 'invalid_item' };
  const claimed = state.lessonItems[mission.id] || [];
  if (claimed.includes(itemIndex)) return { ok: true, duplicate: true, xpGained: 0, skipStateWrite: true };
  if (state.lastClaimAt && now - state.lastClaimAt < CONFIG.MIN_CLAIM_GAP_MS) {
    return { ok: false, reason: 'too_fast', retryAfterMs: CONFIG.MIN_CLAIM_GAP_MS - (now - state.lastClaimAt), skipStateWrite: true };
  }
  const xp = applyLessonSoftCap(lessonItemXp(item.kind, item.bonusXP), state.daily.lessonXp);
  const out = { ok: true, xpGained: xp };
  state.lessonItems[mission.id] = claimed.concat(itemIndex).sort((a, b) => a - b);
  state.lastClaimAt = now;
  if (item.kind === 'LESSON' && item.signId && !state.learnedSigns.includes(item.signId)) state.learnedSigns.push(item.signId);
  state.daily.lessonXp += xp;
  state.totals.lessonXp += xp;
  addXp(state, xp, out);
  applyActivityStreak(state, today, out, now);
  return out;
}

export function applyMissionComplete(state, mission, { now, today }) {
  if (state.missionsDone[mission.id]) return { ok: true, duplicate: true, xpGained: 0, skipStateWrite: true };
  const lessonIndexes = mission.items.map((item, index) => item.kind === 'LESSON' ? index : -1).filter((index) => index >= 0);
  const claimed = new Set(state.lessonItems[mission.id] || []);
  const done = lessonIndexes.filter((index) => claimed.has(index)).length;
  const full = !lessonIndexes.length || done / lessonIndexes.length >= CONFIG.MISSION_FULL_LESSON_RATIO;
  if (!full && state.lastSkipAt && now - state.lastSkipAt < CONFIG.MIN_SKIP_CLAIM_GAP_MS) {
    return { ok: false, reason: 'too_fast', retryAfterMs: CONFIG.MIN_SKIP_CLAIM_GAP_MS - (now - state.lastSkipAt), skipStateWrite: true };
  }
  const out = { ok: true, path: full ? 'full' : 'skip' };
  const raw = Math.round(missionBonus(lessonIndexes.length) * (full ? 1 : CONFIG.MISSION_SKIP_FACTOR));
  const xp = applyLessonSoftCap(raw, state.daily.lessonXp);
  state.missionsDone[mission.id] = full ? 'full' : 'skip';
  lessonIndexes.forEach((index) => {
    const signId = mission.items[index].signId;
    if (signId && !state.learnedSigns.includes(signId)) state.learnedSigns.push(signId);
  });
  state.daily.lessonXp += xp;
  state.totals.lessonXp += xp;
  state.totals.missions += 1;
  state.lastClaimAt = now;
  if (!full) state.lastSkipAt = now;
  addXp(state, xp, out);
  applyActivityStreak(state, today, out, now);
  missionCountBadgesFor(state.totals.missions).forEach((id) => grantBadge(state, id, out, now));
  const badge = nextLevelBadge('lesson', state.level, state.badges);
  if (badge) grantBadge(state, badge, out, now);
  out.xpGained = xp;
  return out;
}

export function applyBackfill(state, missions, completedItemIds, { now }) {
  if (state.backfilled) return { ok: true, duplicate: true, backfilled: true, xpGained: 0, skipStateWrite: true };
  const completed = new Set(completedItemIds || []);
  let raw = 0;
  for (const mission of missions) {
    const have = new Set(state.lessonItems[mission.id] || []);
    mission.items.forEach((item, index) => {
      const itemKey = `${mission.id}_${index}_${item.kind}_${item.signId || mission.category || ''}`;
      if (!completed.has(itemKey) || have.has(index)) return;
      if (item.kind === 'QUIZ') {
        if (!state.missionsDone[mission.id]) {
          state.missionsDone[mission.id] = 'backfill';
          state.totals.missions += 1;
          raw += missionBonus(mission.items.filter((candidate) => candidate.kind === 'LESSON').length);
        }
        return;
      }
      if (!CONFIG.LESSON_ITEM_XP[item.kind]) return;
      have.add(index);
      if (item.kind === 'LESSON' && item.signId && !state.learnedSigns.includes(item.signId)) state.learnedSigns.push(item.signId);
      raw += lessonItemXp(item.kind, item.bonusXP);
    });
    if (have.size) state.lessonItems[mission.id] = [...have].sort((a, b) => a - b);
  }
  const xp = Math.min(CONFIG.BACKFILL_MAX_XP, Math.round(raw * CONFIG.BACKFILL_FACTOR));
  state.backfilled = true;
  state.totals.lessonXp += xp;
  state.daily.lessonXp += xp;
  const out = { ok: true, backfilled: true, xpGained: xp };
  addXp(state, xp, out);
  missionCountBadgesFor(state.totals.missions).forEach((id) => grantBadge(state, id, out, now));
  return out;
}

export function validateGameSigns(signs, mode, signTypes) {
  const max = mode === 'timeAttack' ? 10 : CONFIG.GAME.MAX_BRICKS;
  if (!['wall', 'timeAttack'].includes(mode) || !Array.isArray(signs) || !signs.length || signs.length > max ||
      signs.some((sign) => typeof sign !== 'string' || !signTypes[sign]) || new Set(signs).size !== signs.length) return false;
  return true;
}

/** XP for one fingerspelling word at 100% accuracy (before the run bonuses): longer words are worth more. */
export const fingerspellWordXp = (symbolCount) => CONFIG.FINGERSPELL.LETTER_XP * symbolCount;
const FINGERSPELL_BY_ID = new Map(CONFIG.FINGERSPELL.WORDS.map((word) => [word.id, word]));
export const fingerspellWordById = (id) => FINGERSPELL_BY_ID.get(id) || null;
/** Most letters a run may contain: one word per RUN_LENGTHS entry. */
export const FINGERSPELL_RUN_LETTERS = CONFIG.FINGERSPELL.RUN_LENGTHS.reduce((sum, n) => sum + n, 0);

/**
 * Draw a Time Attack run: one random word for each length in RUN_LENGTHS (short -> long), so every run has the same
 * number of letters. `usable(word)` filters words the classifier cannot check; `avoid` is a list of word ids to skip
 * (the previous run) unless that would leave a length with nothing to draw. A length with no usable word is left out.
 */
export function pickFingerspellRun(usable = () => true, { rng = Math.random, avoid = [] } = {}) {
  const skip = new Set(avoid);
  const run = [];
  for (const length of CONFIG.FINGERSPELL.RUN_LENGTHS) {
    const pool = CONFIG.FINGERSPELL.WORDS.filter((word) => word.symbols.length === length && usable(word));
    const fresh = pool.filter((word) => !skip.has(word.id));
    const from = fresh.length ? fresh : pool;
    if (from.length) run.push(from[Math.min(from.length - 1, Math.floor(rng() * from.length))]);
  }
  return run;
}

/**
 * Time Attack (fingerspelling) session check. `session` = { signs, words: [wordId, ...] }.
 * `signs` is the de-duplicated letters/numbers across the chosen words (letters repeat inside a word, so the
 * one-of-each rule of Wall Breaker cannot apply). `signTypes` maps signId -> 'static' | 'motion'.
 */
export function validateFingerspellSession(session, signTypes) {
  if (!session || !Array.isArray(session.words) || !Array.isArray(session.signs)) return false;
  const { words, signs } = session;
  if (!words.length || words.length > CONFIG.FINGERSPELL.RUN_LENGTHS.length || new Set(words).size !== words.length) return false;
  const used = new Set();
  let letters = 0;
  for (const id of words) {
    const word = fingerspellWordById(id);
    if (!word) return false;
    letters += word.symbols.length;
    for (const symbol of word.symbols) {
      if (signTypes[symbol] !== 'static') return false;   // fingerspelling is checked with the static model only
      used.add(symbol);
    }
  }
  if (letters > FINGERSPELL_RUN_LETTERS) return false;   // a run can never be longer than one word per length tier
  if (signs.some((sign) => typeof sign !== 'string') || new Set(signs).size !== signs.length) return false;
  return signs.length === used.size && signs.every((sign) => used.has(sign));
}

/** Timing/order check for a fingerspelling run. `log` = [{ w, t }]: word index and ms from the session start. */
export function validateFingerspellTiming({ words, log, elapsedMs }) {
  const cfg = CONFIG.FINGERSPELL;
  if (!Array.isArray(log) || log.length !== words.length) return 'incomplete_run';
  let previous = 0;
  let minTotal = 0;
  for (let index = 0; index < log.length; index++) {
    const entry = log[index];
    if (!entry || entry.w !== index) return 'bad_bricks';
    if (typeof entry.t !== 'number' || !Number.isFinite(entry.t) || entry.t < previous) return 'bad_timing';
    const minGap = fingerspellWordById(words[index]).symbols.length * cfg.MIN_MS_PER_LETTER;
    if (entry.t - previous < minGap) return 'too_fast';
    minTotal += minGap;
    previous = entry.t;
  }
  if (previous > elapsedMs + CONFIG.GAME.CLOCK_SLACK_MS) return 'clock_mismatch';
  if (elapsedMs < minTotal) return 'too_fast';
  return null;
}

export function applyFingerspellFinish(state, session, log, wrong, learnedSigns, { now, today }) {
  const cfg = CONFIG.FINGERSPELL;
  const game = CONFIG.GAME;
  const elapsed = now - session.startedAt;
  if (elapsed > game.SESSION_TTL_MS) return { ok: false, reason: 'expired' };
  const timingIssue = validateFingerspellTiming({ words: session.words, log, elapsedMs: elapsed });
  if (timingIssue) return { ok: false, reason: timingIssue };

  const learned = new Set(learnedSigns);
  const words = session.words.map((id) => fingerspellWordById(id));
  const letters = words.reduce((sum, word) => sum + word.symbols.length, 0);
  const accuracy = letters / Math.max(1, letters + wrong);
  const accMult = (game.ACC_TIERS.find((tier) => accuracy >= tier.min) || game.ACC_TIERS.at(-1)).mult;
  // A word pays out only when every letter/number in it has been learned (same gate the old Time Attack used).
  const perWord = words.map((word) => {
    const eligible = word.symbols.every((symbol) => learned.has(symbol));
    return { id: word.id, label: word.label, letters: word.symbols.length, eligible,
      xp: eligible ? Math.round(fingerspellWordXp(word.symbols.length) * accMult) : 0 };
  });
  if (!perWord.some((word) => word.eligible)) {
    return { ok: true, reason: 'not_enough_learned', xpGained: 0, counted: false, skipStateWrite: true, words: perWord };
  }
  // Same shape as Construct a Sentence and Wall Breaker: base XP x accuracy, plus one clear bonus and a flawless bonus.
  const flawless = wrong === 0;
  const raw = perWord.reduce((sum, word) => sum + word.xp, 0) + game.CLEAR_BONUS + (flawless ? game.FLAWLESS_BONUS : 0);
  const room = Math.max(0, game.DAILY_XP_CAP - state.daily.gameXp);
  const xp = Math.min(raw, room);
  const out = { ok: true, counted: false };
  state.daily.gameXp += xp;
  state.daily.timeAttacks += 1;
  state.totals.gameXp += xp;
  state.totals.timeAttackXp = (state.totals.timeAttackXp || 0) + xp;
  state.totals.timeAttacks += 1;
  addXp(state, xp, out);
  if (xp > 0) applyActivityStreak(state, today, out, now);
  Object.assign(out, { counted: xp > 0, xpGained: xp, rawXp: raw, accuracy, flawless, words: perWord,
    reason: xp ? null : 'daily_cap' });
  return out;
}

/**
 * Construct a Sentence session check. `session` = { signs, rounds: [[signId, ...], ...], difficulty }.
 * `isKnown(signId)` says whether a sign exists in the app. Pure: no DOM, no Firebase.
 */
export function validateSentenceSession(session, isKnown) {
  const cfg = CONFIG.SENTENCE;
  if (!session || !Array.isArray(session.rounds) || !Array.isArray(session.signs)) return false;
  if (!Object.hasOwn(cfg.DIFFICULTY_MULT, session.difficulty)) return false;
  const { rounds, signs } = session;
  if (!rounds.length || rounds.length > cfg.MAX_ROUNDS) return false;
  const used = new Set();
  for (const words of rounds) {
    if (!Array.isArray(words) || words.length < cfg.MIN_WORDS || words.length > cfg.MAX_WORDS) return false;
    if (words.some((w) => typeof w !== 'string' || !w || !isKnown(w)) || new Set(words).size !== words.length) return false;
    words.forEach((w) => used.add(w));
  }
  if (signs.some((w) => typeof w !== 'string') || new Set(signs).size !== signs.length) return false;
  return signs.length === used.size && signs.every((w) => used.has(w));
}

/** Timing/order check for a sentence run. `log` = [{ i, t }] with t = ms from the session start. Returns an error reason or null. */
export function validateSentenceTiming({ rounds, log, elapsedMs }) {
  const cfg = CONFIG.SENTENCE;
  if (!Array.isArray(log) || log.length !== rounds.length) return 'incomplete_run';
  let previous = 0;
  let minTotal = 0;
  for (let index = 0; index < log.length; index++) {
    const entry = log[index];
    if (!entry || entry.i !== index) return 'bad_bricks';
    if (typeof entry.t !== 'number' || !Number.isFinite(entry.t) || entry.t < previous) return 'bad_timing';
    const minGap = rounds[index].length * cfg.MIN_MS_PER_WORD;
    if (entry.t - previous < minGap) return 'too_fast';
    minTotal += minGap;
    previous = entry.t;
  }
  if (previous > elapsedMs + CONFIG.GAME.CLOCK_SLACK_MS) return 'clock_mismatch';
  if (elapsedMs < minTotal) return 'too_fast';
  return null;
}

export function applySentenceFinish(state, session, log, wrong, _learnedSigns, { now, today }) {
  const cfg = CONFIG.SENTENCE;
  const game = CONFIG.GAME;
  const elapsed = now - session.startedAt;
  if (elapsed > game.SESSION_TTL_MS) return { ok: false, reason: 'expired' };
  const timingIssue = validateSentenceTiming({ rounds: session.rounds, log, elapsedMs: elapsed });
  if (timingIssue) return { ok: false, reason: timingIssue };

  // Every sentence in the run counts: this game does not need any lesson progress.
  const words = session.rounds.reduce((sum, list) => sum + list.length, 0);
  const accuracy = session.rounds.length / Math.max(1, session.rounds.length + wrong);
  const accMult = (game.ACC_TIERS.find((tier) => accuracy >= tier.min) || game.ACC_TIERS.at(-1)).mult;
  const flawless = wrong === 0;
  const raw = Math.round(words * cfg.WORD_XP * accMult * cfg.DIFFICULTY_MULT[session.difficulty] + game.CLEAR_BONUS + (flawless ? game.FLAWLESS_BONUS : 0));
  const room = Math.max(0, game.DAILY_XP_CAP - state.daily.gameXp);
  const xp = Math.min(raw, room);

  const out = { ok: true, counted: false, accuracy, flawless, difficulty: session.difficulty };
  if (xp > 0) {
    state.daily.gameXp += xp;
    state.totals.gameXp += xp;
    state.totals.sentenceXp = (state.totals.sentenceXp || 0) + xp;
    state.totals.sentences = (state.totals.sentences || 0) + 1;
    addXp(state, xp, out);
    applyActivityStreak(state, today, out, now);
    grantBadge(state, 'sentence_first', out, now);
    if (flawless) grantBadge(state, 'sentence_flawless', out, now);
    if (session.difficulty === 'hard') grantBadge(state, 'sentence_hard', out, now);
    if (state.totals.sentences >= cfg.VETERAN_RUNS) grantBadge(state, 'sentence_veteran', out, now);
    const badge = nextLevelBadge('sentence', state.level, state.badges);
    if (badge) grantBadge(state, badge, out, now);
    out.counted = true;
  }
  out.xpGained = xp;
  if (!xp) out.reason = 'daily_cap';
  return out;
}

export function applyGameFinish(state, session, broken, wrong, learnedSigns, signTypes, { now, today }) {
  if (session.mode === 'sentence') return applySentenceFinish(state, session, broken, wrong, learnedSigns, { now, today });
  if (session.mode === 'fingerspell') return applyFingerspellFinish(state, session, broken, wrong, learnedSigns, { now, today });
  const elapsed = now - session.startedAt;
  if (elapsed > CONFIG.GAME.SESSION_TTL_MS) return { ok: false, reason: 'expired' };
  const timingIssue = validateGameTiming({ sessionSigns: session.signs, broken, elapsedMs: elapsed });
  if (timingIssue) return { ok: false, reason: timingIssue };
  if (broken.some((brick) => (brick.m === true) !== (signTypes[brick.s] === 'motion'))) return { ok: false, reason: 'sign_type_mismatch' };

  const learned = new Set(learnedSigns);
  const out = { ok: true, counted: false };
  if (session.mode === 'timeAttack') {
    const targets = broken.map((brick) => ({ learned: learned.has(brick.s), motion: brick.m === true }));
    if (targets.length !== session.signs.length || targets.some((target) => !target.learned)) {
      return { ok: true, reason: 'not_enough_learned', xpGained: 0, counted: false, skipStateWrite: true };
    }
    const accuracy = targets.length / Math.max(1, targets.length + wrong);
    const multiplier = (CONFIG.GAME.ACC_TIERS.find((tier) => accuracy >= tier.min) || CONFIG.GAME.ACC_TIERS.at(-1)).mult;
    const rawBase = targets.reduce((sum, target) => sum + (target.motion ? CONFIG.GAME.BRICK_XP.motion : CONFIG.GAME.BRICK_XP.static), 0);
    const flawless = wrong === 0;
    const raw = Math.round(rawBase * multiplier + CONFIG.GAME.CLEAR_BONUS + (flawless ? CONFIG.GAME.FLAWLESS_BONUS : 0));
    const xp = Math.min(raw, Math.max(0, CONFIG.GAME.DAILY_XP_CAP - state.daily.gameXp));
    state.daily.gameXp += xp;
    state.daily.timeAttacks += 1;
    state.totals.gameXp += xp;
    state.totals.timeAttackXp = (state.totals.timeAttackXp || 0) + xp;
    state.totals.timeAttacks += 1;
    addXp(state, xp, out);
    if (xp > 0) applyActivityStreak(state, today, out, now);
    Object.assign(out, { counted: xp > 0, xpGained: xp, accuracy, flawless, targetCount: targets.length,
      reason: xp ? null : (state.daily.gameXp >= CONFIG.GAME.DAILY_XP_CAP ? 'daily_cap' : 'no_xp') });
    return out;
  }

  const bricks = broken.map((brick) => ({ learned: learned.has(brick.s), motion: brick.m === true }));
  const result = gameWallXp({ bricks, wrong, wallsToday: state.daily.walls, gameXpToday: state.daily.gameXp });
  if (!result.eligible) return { ok: true, counted: false, xpGained: 0, reason: result.reason, skipStateWrite: true };
  state.daily.walls += 1;
  state.totals.walls += 1;
  Object.assign(out, { accuracy: result.accuracy, flawless: result.flawless, multiplier: result.decay, capped: !!result.capped });
  if (result.xp > 0) {
    state.daily.gameXp += result.xp;
    state.totals.gameXp += result.xp;
    state.totals.wallXp = (state.totals.wallXp || 0) + result.xp;
    state.totals.countedWalls += 1;
    addXp(state, result.xp, out);
    applyActivityStreak(state, today, out, now);
    grantBadge(state, 'game_first', out, now);
    if (result.flawless) grantBadge(state, 'game_flawless', out, now);
    if (elapsed / session.signs.length <= CONFIG.GAME.SPEED_BADGE_MS_PER_BRICK) grantBadge(state, 'game_speed', out, now);
    if (state.totals.countedWalls >= CONFIG.GAME.VETERAN_WALLS) grantBadge(state, 'game_veteran', out, now);
    const badge = nextLevelBadge('game', state.level, state.badges);
    if (badge) grantBadge(state, badge, out, now);
    out.counted = true;
  }
  out.xpGained = result.xp;
  if (!result.xp) out.reason = result.reason;
  return out;
}

export function profileData(state, name, now, avatar) {
  const tz = state.tz || 'UTC';
  const streak = state.streak.current;
  const recentBadges = Object.entries(state.badges).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
  return {
    name: (String(name || 'Learner').trim().slice(0, 30) || 'Learner'),
    xp: state.xp,
    level: state.level,
    weeklyXp: state.weeklyXp,
    weekKey: state.weekKey,
    streak,
    longestStreak: state.streak.longest,
    streakExpiresAt: streak ? startOfDayMs(shiftDayKey(state.streak.lastDay, STREAK_MAX_MISSED_DAYS + 2), tz) : null,
    badgeCount: Object.keys(state.badges).length,
    recentBadges,
    // XP earned per game, for the per-game leaderboards (each is part of the shared daily game cap).
    wallXp: state.totals.wallXp || 0,
    timeAttackXp: state.totals.timeAttackXp || 0,
    sentenceXp: state.totals.sentenceXp || 0,
    ...(avatar && /^avatar-\d{2}$/.test(avatar) ? { avatar } : {}),
  };
}

export function summary(state, now, out = {}) {
  return {
    ok: true, ...out, xp: state.xp, level: state.level, weeklyXp: state.weeklyXp,
    streak: effectiveStreak(state.streak, dayKey(now, state.tz || 'UTC')),
    longestStreak: state.streak.longest,
    dailyLessonXp: state.daily.lessonXp,
    dailyGameXp: state.daily.gameXp,
    dailyGameCap: CONFIG.GAME.DAILY_XP_CAP,
  };
}
