/**
 * js/dashboard.js — Live Progress Rendering
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE  : Replaces the hardcoded numbers in pages/dashboard.html
 *            with real values from window.LWProgress: overall percent
 *            complete, signs practiced, per-unit status, the
 *            "Continue Learning" hero destination, and the
 *            "Signs You've Learned" recap grid.
 * CONNECTS : pages/dashboard.html (after js/data.js + js/engine/progress.js)
 * TODO     : Once Firestore is live, LWProgress itself swaps its
 *            storage backend — this file doesn't need to change.
 *
 * REV 4 — PHASE 4: `LEVELS` + `renderLevelCard(level)` + the hardcoded
 * `[data-level-card]` markup in dashboard.html are gone. Progress is
 * rendered from window.LWProgress.getOrderedLiveCategories() (the
 * same flat cross-unit chain js/learn.js's trail view walks) and
 * window.LWData.getUnits() — one aggregate card plus one row per
 * unit, both fully data-driven (no unit hardcoded here), matching
 * SYSTEM_ARCHITECTURE.md Rev 4's "Progress / unlock model changes"
 * section. See PIVOT_CHECKLIST.md Phase 4's last item.
 *
 * DASHBOARD UX REVIEW — PRIORITY 0 #1 (2026-08-21, code session):
 * added the "Continue Learning" hero card (renderContinueCard()) per
 * PIVOT_CHECKLIST.md's "Dashboard UX Review Checklist" → Priority 0
 * item #1 ("Make 'Continue Learning' the primary action").
 *
 * Factored the "find the learner's current unlocked-but-unpassed
 * category" walk out of renderWelcomeBanner() and renderContinueButton()
 * (previously two separate, nearly-identical copies of the same walk)
 * into one shared getCurrentDestination() helper, now also consumed by
 * renderContinueCard(). This keeps the checklist's own "do not create a
 * second progress/unlock algorithm" rule true for the dashboard's OWN
 * code, too, not just the app-wide progress engine.
 *
 * DASHBOARD UX REVIEW — PRIORITY 0 #2 (2026-08-21, same day, code
 * session): "Replace the dashboard's current 'report' feeling." Three
 * of the four checklist sub-items were pure HTML/CSS (moving/demoting
 * the aggregate section — see pages/dashboard.html and
 * css/dashboard.css). The one JS-level change is here:
 * renderWelcomeBanner() used to restate the exact unit/category name
 * the new hero card (Priority 0 #1) already shows one section below it
 * — two places naming the same destination at effectively equal
 * visual weight, which is precisely the checklist's own "avoid showing
 * the same information...three different ways" rule. Simplified below
 * to a short, generic nudge with no destination-specific text; the
 * hero card is now the single canonical place that names where the
 * learner is. `getCurrentDestination()`'s shape and every other
 * function's behavior are UNCHANGED by this — only
 * renderWelcomeBanner()'s own output text changed.
 *
 * DASHBOARD UX REVIEW — PRIORITY 1, §10 (this session): "Reduce
 * dashboard duplication." PIVOT_CHECKLIST.md §10 asks for an audit of
 * three surfaces (Dashboard / Learn trail / Lesson sidebar) that all
 * show overlapping unit/progress concepts, on the premise that overlap
 * is fine as long as each surface has a distinct JOB and the WORDING
 * for shared concepts agrees. `js/learn.js` and `js/lesson.js` were
 * read for comparison but NOT modified — out of this session's scope
 * per PIVOT_CHECKLIST.md §20 ("Explicitly excluded: js/learn.js"; the
 * Rev 5 course-player sidebar in lesson.js isn't in the preferred-files
 * list either, and every prior Priority 1 session has stayed inside
 * pages/dashboard.html / js/dashboard.js / css/dashboard.css only).
 *
 * Audit result — the three surfaces DO have distinct jobs today, so no
 * structural change was needed:
 *   - Dashboard (this file): compact summary + one "next action" CTA.
 *     Never renders individual sign-level navigation.
 *   - Learn (js/learn.js, untouched): the full trail — every unit,
 *     every category picker, every sign grid. The only place a learner
 *     actually BROWSES the whole path.
 *   - Lesson (js/lesson.js's renderCourseSidebar(), untouched): a
 *     course-player sidebar for moving between signs INSIDE a unit
 *     you're already in, shown as icon+percentage, not status prose.
 * Three wording mismatches were found BETWEEN this file and the other
 * two surfaces' existing (unchanged) text, and fixed on this file's
 * side only:
 *   1. The Fingerspell-Your-Name unit row said "Interactive drill";
 *      js/learn.js's equivalent trail-node label has always said
 *      "Practice drill". Changed to match verbatim.
 *   2. The Phrasebook (reference) unit row said "Reference · browse
 *      only, no assessment" — restating "Reference" a SECOND time in
 *      the same row (the `.unit-progress-row__reference-badge` chip
 *      already says it), which is exactly the kind of same-info-twice
 *      duplication this checklist item is about. Shortened to "Browse
 *      only, no assessment yet" — drops the redundant prefix and
 *      matches the *shape* of js/learn.js's "Browse only, no quiz yet"
 *      for the same unit.
 *   3. This file's own two "how many assessments passed" strings
 *      disagreed with EACH OTHER: renderOverallProgress() (Priority 0
 *      #3, locked in and explicitly not to be re-worded — see that
 *      function's comment) says "X / Y category assessments passed";
 *      unitRowHtml()'s per-unit line said "X/Y assessments passed" —
 *      missing "category". Added "category" to the per-unit line so
 *      the same underlying concept reads the same way in both places.
 * Flagged, NOT fixed (would require editing excluded files):
 *   - js/learn.js uses "quiz" in learner-facing copy ("Browse only, no
 *     quiz yet", "No quiz or camera check yet") where every dashboard
 *     string and PIVOT_CHECKLIST.md's own §3/§7/§12 vocabulary use
 *     "assessment" for the identical `progress.assessment.passed`
 *     concept. This looks like the real direction of travel (assessment)
 *     with learn.js as the not-yet-updated outlier, not the other way
 *     around — but that's a call for whoever next has learn.js in
 *     scope, not this session.
 *   - js/lesson.js's renderCourseSidebar() header comment (the "One
 *     deliberate difference from dashboard.js" note) says dashboard's
 *     unit rows show "X/Y categories passed" — that was true before
 *     Priority 1 §4 changed the wording to "assessments passed"
 *     (and now "category assessments passed" per fix #3 above). The
 *     comment is stale documentation in a file outside this session's
 *     scope; flagging so a future lesson.js session updates it rather
 *     than trusting it at face value.
 * No new unit-ordering/unlock logic was added anywhere — confirmed by
 * re-reading this file's own renderUnitList()/renderUnitRow(): both
 * still walk window.LWData.getUnits() in its existing order, exactly
 * as before this session.
 *
 * pages/dashboard.html also gained a new "Learning Path" heading above
 * the unit list (previously it had no heading of its own — it just
 * ran on directly under "Overall Progress", which is arguably its own
 * small duplication/ambiguity, since the unit list is a different
 * thing from the aggregate percentage above it). "Learning Path" is
 * the exact phrase js/learn.js's own <h1> already uses ("Your ASL
 * Learning Path"), and is also PIVOT_CHECKLIST.md §18's own wireframe
 * label for this block — so this is adopting existing, already-decided
 * wording, not inventing new copy. Presentational only; no JS change
 * needed for it.
 *
 * NOT part of Priority 0 #2: renderOverallProgress() itself. Its
 * output (a bare "%") was intentionally untouched that session —
 * relabeling what that number means (vs. mastery) was left as
 * Priority 0 item #3.
 *
 * DASHBOARD UX REVIEW — PRIORITY 0 #3 (2026-08-21, later same day,
 * code session): "Fix the meaning of the 9% progress number." Turned
 * out to be a markup-only fix — see pages/dashboard.html's Overall
 * Progress section (the badge that read "Your ASL Path" now reads
 * "Practice Progress"; the label under the % was reworded to say
 * "not a mastery score"). renderOverallProgress() below is BYTE-FOR-
 * BYTE UNCHANGED: it already wrote the practice count and the
 * `X / Y category assessments passed` line to two separate elements
 * ([data-overall-count] / [data-overall-status]), which is exactly
 * the "keep practice completion and assessment mastery as two
 * numbers, not one" rule PIVOT_CHECKLIST.md's Priority 0 #3 asks for
 * — that separation already existed, it just wasn't labeled. Nothing
 * here needed to move or combine.
 *
 * DASHBOARD UX REVIEW — PRIORITY 1, §4 (2026-08-21, code session):
 * renderUnitRow()/renderUnitList() now turn each unit row into a compact
 * learning-path summary. Graded units expose practiced/total signs,
 * assessment passed/total, and a practice bar; the unit containing the
 * shared getCurrentDestination() is marked "You are here". Locked units
 * remain subdued. Unit 7 stays explicitly reference-only, and Unit 0/2
 * keep descriptive non-graded states because they are excluded from the
 * flat grading chain by Rev 4.
 *
 * CRITICAL BUGFIX (this session — see AI_MEMORY.md session log for the
 * full writeup): the §4 patch that landed the paragraph above ALSO
 * deleted renderRecap(), renderContinueButton(), and renderContinueCard()
 * from this file — while document.addEventListener('DOMContentLoaded', …)
 * below still called all three. Function declarations for all three were
 * simply gone; nothing else in the file redefined them. That's not a
 * syntax error (`node --check` stays clean, since it never proves a
 * called name is declared), it's a runtime ReferenceError — thrown on
 * the very first missing call, which aborted every render() after it in
 * the same DOMContentLoaded handler. In practice that meant: the
 * "Signs You've Learned" recap grid never rendered, the primary
 * "Continue Learning" button never got an href, and the Priority 0 #1
 * hero card (arguably the dashboard's single most important element)
 * never rendered AT ALL on a real page load — while every earlier
 * session's "verification" (node --check + grep + tag-balance) reported
 * clean, because none of those checks execute the script. Restored all
 * three functions below, unchanged from their pre-§4 implementation —
 * this was a restore, not a rewrite; see git history / the diff in this
 * session's patch for confirmation nothing else about them changed.
 *
 * DASHBOARD UX REVIEW — PRIORITY 1, §5 (2026-08-21, this session):
 * "Add a 'You are here' state." §4 already added a bare "You are here"
 * badge to the current unit's row. §5 asks for more: the label must
 * name the current Unit AND lesson/sign, using the SAME destination
 * object §4's badge and the hero card already use — no second "current
 * lesson" algorithm. renderUnitRow() now also computes a
 * `currentSignLabel` from destination.cat / destination.nextSign (the
 * identical fields renderContinueCard() already reads) and unitRowHtml()
 * renders it as a `Next: {category} → {sign}` line beneath the "You are
 * here" badge, only for the one row that has it.
 *
 * DASHBOARD UX REVIEW — PRIORITY 1, §6 (2026-08-21, this session):
 * "Add a review/repetition entry point." Per PIVOT_CHECKLIST.md §6 and
 * SYSTEM_ARCHITECTURE.md's Dashboard UX Review Addendum → "Review
 * entry point," this is explicitly NOT a spaced-repetition trainer —
 * no new algorithm was written, and js/engine/progress.js was not
 * modified (renderReviewEntry() below only calls the ALREADY-exported
 * window.LWProgress.getAllLearnedSigns() — the exact same call
 * renderRecap() already makes). The MVP action reuses the existing
 * lesson/camera-practice route by reopening the learner's most
 * recently practiced sign, matching the addendum's own guidance to
 * "reuse the existing detected-sign infrastructure." When a dedicated
 * Review/Trainer route ships later, renderReviewEntry() is the only
 * function that should need to change — see its own doc comment.
 *
 * DASHBOARD UX REVIEW — PRIORITY 1, §7 (2026-08-21, this session):
 * "Improve 'Signs You've Learned'." renderRecap() now also writes a
 * "N signs practiced" count into [data-recap-count], and supports
 * revealing more than the RECAP_COLLAPSED_LIMIT (24, same value the
 * old hardcoded `.slice(-24)` used) chips via a "View all" toggle
 * ([data-recap-foot]/[data-recap-toggle], new handleRecapToggle()) that
 * re-renders the SAME grid rather than navigating anywhere — per the
 * checklist's own "do not turn this section into another lesson
 * browser" instruction. The "recently practiced, not mastery" framing
 * the checklist also asked for is a markup/copy change only (a new
 * subtitle line in pages/dashboard.html) — no change needed here, since
 * this function never used the word "mastered"/"learned" in its output
 * to begin with. See PIVOT_CHECKLIST.md §7 for the full sub-item list
 * and SYSTEM_ARCHITECTURE.md's Dashboard UX Review Addendum for why
 * duplicate-sign chips and a spaced-repetition algorithm are explicitly
 * OUT of scope for this item (the former was already fixed in an
 * earlier session — see the BUG FIX comment above renderRecap(); the
 * latter is §6's job, not §7's).
 *
 * DASHBOARD UX REVIEW — PRIORITY 1, §8 (2026-08-21, this session):
 * "Fix the 'Current Level: Basic' product inconsistency" (PIVOT_CHECKLIST.md
 * §8, SYSTEM_ARCHITECTURE.md's "Current Level field" section). `user.level`
 * is a fixed `'basic'` constant written by every account since Phase 5
 * (see js/auth.js's register() — untouched here), so displaying it as
 * "Current Level: Basic" implied a selectable tier that no longer exists.
 * New renderCurrentUnit() reads the SAME shared `destination` object
 * getCurrentDestination() already computes once in DOMContentLoaded below
 * — no second "what unit is the learner on" algorithm — and writes
 * `Unit {order} · {title}` into the account card, matching the checklist's
 * own "Recommended replacement" example exactly.
 *
 * pages/dashboard.html's account card markup changed from
 * `[data-user-level]` (previously filled generically, on every page, by
 * js/main.js's initUserDetails() as `capitalize(user.level)`) to
 * `[data-user-unit]`, filled only here. This was a deliberate RENAME, not
 * an additional attribute layered on top of the old one: `data-user-level`
 * doesn't appear on any other page (confirmed via grep across pages/*.html),
 * so nothing else reads or depends on it, and leaving both attributes in
 * place would have raced two different scripts writing two different
 * strings into the same visible element depending on DOMContentLoaded
 * listener order. js/main.js and js/auth.js are both untouched —
 * `user.level` still exists in the session object for anything else that
 * reads it later (e.g. Firestore).
 *
 * BUGFIX (carried over, unrelated to any session above): the OLD
 * renderContinueButton() looped `LEVELS` in a fixed basic→medium→
 * intermediate order, and *within* a level used `liveCategoriesFor(level)`
 * — sorted by that category's own in-level `order` field, NOT by unit.
 * Phase 1 didn't renumber `order` when it introduced `unit` (see
 * AI_MEMORY.md's Phase 1 session log — the `requests` category still
 * has order:9 even though it's unit:4, ahead of unit:5's `family`/
 * `places`/etc, which have order:1-4). Fixed by walking
 * window.LWProgress.getOrderedLiveCategories() directly — already in
 * the correct flat order and doesn't take a level at all. Still true
 * of getCurrentDestination() below, since it's the same walk.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';

// One icon per UNITS entry — same map js/learn.js uses for its trail
// nodes, kept in sync manually (two small copies were judged simpler
// and lower-risk than introducing a shared module/global just for an
// icon lookup — see the Phase 4 session log for the reasoning). Also
// reused by the Continue Learning hero card below.
const UNIT_ICONS = {
  welcome: '👋', alphabet: '🔤', fingerspell_name: '🖊️', numbers: '🔢',
  everyday_essentials: '🙏', common_things_people: '🗂️',
  basic_phrases: '💬', phrasebook: '📖',
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Aggregate card in "Overall Progress" — the whole flat chain
 *  combined into one percentage, replacing what used to be three
 *  separate per-level percentages.
 *
 *  NOTE (2026-08-21): this is the "practice progress" number
 *  PIVOT_CHECKLIST.md's Priority 0 item #3 asked to have explicitly
 *  relabeled (not "mastery"). That relabel is DONE, but entirely in
 *  pages/dashboard.html's markup (a badge's text + a supporting <p>'s
 *  text) — this function's own output was not part of the fix and is
 *  unchanged: it still writes a bare "N%" into [data-overall-pct], the
 *  practice count into [data-overall-count], and the separate
 *  "X / Y category assessments passed" mastery signal into
 *  [data-overall-status]. Don't re-derive a "relabel" here — the label
 *  lives in the HTML next to [data-overall-pct], not in this string. */
function renderOverallProgress() {
  if (!window.LWProgress || !window.LWData) return;
  const chain = window.LWProgress.getOrderedLiveCategories();

  const pctEl    = document.querySelector('[data-overall-pct]');
  const barEl    = document.querySelector('[data-overall-progress]');
  const countEl  = document.querySelector('[data-overall-count]');
  const statusEl = document.querySelector('[data-overall-status]');
  if (!pctEl) return;

  let totalSigns = 0, practicedSigns = 0, passedCategories = 0;
  chain.forEach(cat => {
    const signs = window.LWData.getCategorySigns(cat.level, cat.id);
    const prog  = window.LWProgress.getCategoryProgress(cat.level, cat.id);
    totalSigns     += signs.length;
    practicedSigns += signs.filter(s => !!prog.signs[s]).length;
    if (prog.assessment?.passed) passedCategories++;
  });

  const pct = totalSigns > 0 ? Math.round((practicedSigns / totalSigns) * 100) : 0;
  pctEl.textContent = `${pct}%`;
  if (barEl) { barEl.dataset.progress = pct; barEl.style.width = `${pct}%`; }
  if (countEl) countEl.textContent = `${practicedSigns} / ${totalSigns || '—'} signs practiced`;
  if (statusEl) {
    statusEl.textContent = chain.length === 0
      ? 'No lessons trained yet.'
      : `${passedCategories} / ${chain.length} category assessments passed`;
  }
}

/**
 * PIVOT_CHECKLIST.md Priority 0 #1 (2026-08-21).
 *
 * Finds the learner's current destination: the first category in the
 * flat cross-unit chain that's unlocked but not yet passed, plus
 * everything the UI needs to describe it (unit, live signs, practiced
 * count, next unpracticed sign).
 *
 * This is the SAME walk that used to be duplicated between
 * renderWelcomeBanner() and renderContinueButton() — factored out here
 * so there's exactly one place that answers "where is the learner /
 * what's next," consumed by three render functions below. No new
 * unlock/ordering rule was introduced; `getOrderedLiveCategories()` /
 * `getCategoryProgress()` / `isCategoryUnlocked()` are the same
 * window.LWProgress calls both prior functions already made.
 *
 * UNCHANGED by the Priority 0 #2 session — only renderWelcomeBanner()'s
 * own output text changed, not what this helper returns.
 *
 * @returns {null | {
 *   chain: object[],
 *   cat: object|null,        // null means every live category is passed (or chain is empty)
 *   unit: object|null,
 *   signs: string[],
 *   prog: object|null,
 *   practicedCount: number,
 *   nextSign: string|null,
 * }}
 */
function getCurrentDestination() {
  if (!window.LWProgress || !window.LWData) return null;
  const chain = window.LWProgress.getOrderedLiveCategories();

  for (const cat of chain) {
    const prog = window.LWProgress.getCategoryProgress(cat.level, cat.id);
    if (!prog.assessment?.passed && window.LWProgress.isCategoryUnlocked(cat.level, cat.id)) {
      const unit = window.LWData.getUnits().find(u => u.order === cat.unit) ?? null;
      const signs = window.LWData.getCategorySigns(cat.level, cat.id);
      const practicedCount = signs.filter(s => !!prog.signs[s]).length;
      const nextSign = signs.find(s => !prog.signs[s]) || signs[0] || null;
      return { chain, cat, unit, signs, prog, practicedCount, nextSign };
    }
  }
  // Every live category in the chain is already passed (or the chain
  // itself is empty — e.g. pre-launch with everything still comingSoon).
  return { chain, cat: null, unit: null, signs: [], prog: null, practicedCount: 0, nextSign: null };
}

/**
 * NEW — PIVOT_CHECKLIST.md Priority 1 §8 (2026-08-21, this session).
 * "Fix the 'Current Level: Basic' product inconsistency." Fills the
 * "Your Account" card's [data-user-unit] field (renamed from
 * [data-user-level] — see this file's header comment for why) with the
 * learner's actual current Unit instead of the stale, always-'basic'
 * `user.level`. Reads the SAME `destination` object every other "where
 * is the learner" render below already consumes — no new lookup.
 *
 * Mirrors renderContinueCard()'s three states so the account card never
 * contradicts the hero card immediately above it on the page:
 *   - chain.length === 0 → nothing trained yet, no unit to name.
 *   - destination.cat === null → every live category already passed.
 *   - otherwise → `Unit {order} · {title}` (falls back to the bare
 *     category title on the rare case a category has no matching UNITS
 *     entry), exactly matching the checklist's own "Recommended
 *     replacement" example.
 *
 * @param {ReturnType<typeof getCurrentDestination>} destination
 */
function renderCurrentUnit(destination) {
  const el = document.querySelector('[data-user-unit]');
  if (!el || !destination) return;

  if (destination.chain.length === 0) {
    el.textContent = 'Not started yet';
    return;
  }
  if (!destination.cat) {
    el.textContent = 'All units complete';
    return;
  }
  const { cat, unit } = destination;
  el.textContent = unit ? `Unit ${unit.order} · ${unit.title}` : cat.title;
}

/**
 * CHANGED (Priority 0 #2, 2026-08-21, same day as Priority 0 #1).
 * Previously restated the exact unit/category name here too
 * ("You're making great progress on {unit}"), which duplicated the
 * Continue Learning hero card immediately below at effectively equal
 * visual weight — the checklist's own "avoid showing the same
 * information...three different ways" rule. The hero card
 * (renderContinueCard()) is now the single canonical place that names
 * the destination; this banner stays a short, generic nudge instead of
 * a second copy of the same sentence. Still three states, since a flat
 * "Ready to pick up where you left off?" doesn't honestly cover either
 * end of the chain:
 *   - nothing trained at all (chain.length === 0) — generic opener,
 *     no unit name to reference. (Unchanged from before this session —
 *     this branch never named a specific unit to begin with.)
 *   - a real current category exists — one short, non-specific line,
 *     varied only by whether anything's been practiced yet.
 *   - every trained category passed — says so, instead of repeating
 *     the last unit's name forever. (Unchanged from before this
 *     session — also never unit-specific.)
 *
 * @param {ReturnType<typeof getCurrentDestination>} destination
 */
function renderWelcomeBanner(destination) {
  const el = document.querySelector('[data-welcome-banner]');
  if (!el || !destination) return;

  if (destination.chain.length === 0) {
    el.textContent = "Let's get you started on your ASL journey!";
    return;
  }

  if (!destination.cat) {
    el.textContent = "You've completed every unit that's trained so far — nice work!";
    return;
  }

  el.textContent = destination.practicedCount > 0
    ? 'Ready to pick up where you left off?'
    : 'Your next lesson is ready when you are.';
}

/** One compact row per unit — the "no more three level cards"
 *  replacement. Deliberately lighter-weight than js/learn.js's own
 *  trail nodes (no full lesson-card treatment, no separate CSS
 *  component reused from there) since this is a secondary summary,
 *  not the primary navigation surface — that's still the trail on
 *  pages/learn.html itself. Already satisfied Priority 0 #2's "keep
 *  the unit list as a compact summary, not the main feature" item
 *  as-is; no change needed here for that session. */
/**
 * DASHBOARD UX REVIEW — PRIORITY 1 (2026-08-21)
 *
 * Turns the unit list from a status-only report into a compact learning-path
 * summary. The dashboard still does NOT re-create the Learn trail: it only
 * aggregates the existing unit/category progress APIs into one row per unit.
 */
function renderUnitRow(unit, destination) {
  const icon = UNIT_ICONS[unit.id] ?? '🔖';
  const isCurrentUnit = !!destination?.unit && destination.unit.order === unit.order;

  if (unit.kind === 'info') {
    return unitRowHtml(icon, unit, 'Welcome · no assessment', 'learn.html?unit=welcome',
      isCurrentUnit ? 'current' : null, { current: isCurrentUnit });
  }

  if (unit.kind === 'interactive') {
    return unitRowHtml(icon, unit, 'Practice drill · always open',
      'lesson.html?level=basic&category=fingerspell_name',
      isCurrentUnit ? 'current' : null, { current: isCurrentUnit });
  }

  if (unit.kind === 'reference') {
    return unitRowHtml(icon, unit, 'Browse only, no assessment yet',
      'learn.html?unit=phrasebook', null, { reference: true });
  }

  const allCats  = window.LWData.getCategoriesForUnit(unit.order);
  const liveCats = allCats.filter(
    c => !c.comingSoon && window.LWData.getCategorySigns(c.level, c.id).length > 0
  );

  if (liveCats.length === 0) {
    return unitRowHtml(icon, unit, 'Coming soon', null, 'locked');
  }

  const unlocked = window.LWProgress.isCategoryUnlocked(liveCats[0].level, liveCats[0].id);
  if (!unlocked) {
    return unitRowHtml(icon, unit, 'Locked · finish the previous unit first', null, 'locked');
  }

  let totalSigns = 0;
  let practicedSigns = 0;
  let passedCount = 0;

  liveCats.forEach(cat => {
    const signs = window.LWData.getCategorySigns(cat.level, cat.id);
    const prog = window.LWProgress.getCategoryProgress(cat.level, cat.id);
    totalSigns += signs.length;
    practicedSigns += signs.filter(sign => !!prog.signs?.[sign]).length;
    if (prog.assessment?.passed) passedCount++;
  });

  const assessmentTotal = liveCats.length;
  const practicePct = totalSigns > 0
    ? Math.round((practicedSigns / totalSigns) * 100)
    : 0;
  const done = passedCount === assessmentTotal;
  const state = done ? 'done' : (isCurrentUnit ? 'current' : null);
  const href = `learn.html?unit=${encodeURIComponent(unit.id)}`;

  // PRIORITY 1 §5: "Show the current Unit and lesson/sign." Reuses
  // destination.cat / destination.nextSign — the exact fields
  // renderContinueCard() already reads for the hero card's own
  // "{category} → {sign}" line — instead of deriving a second walk.
  // isCurrentUnit guarantees destination.cat belongs to THIS unit (see
  // getCurrentDestination(): unit is looked up from cat.unit), so no
  // extra matching is needed here.
  const currentSignLabel = isCurrentUnit && destination.cat
    ? `${destination.cat.title} → ${window.LWData.getSign?.(destination.cat.level, destination.nextSign)?.title ?? destination.nextSign}`
    : null;

  return unitRowHtml(icon, unit, '', href, state, {
    current: isCurrentUnit,
    currentDetail: currentSignLabel,
    practicePct,
    practicedSigns,
    totalSigns,
    passedCount,
    assessmentTotal
  });
}

function unitRowHtml(icon, unit, statusText, href, state, metrics = {}) {
  const stateClass = state ? ` unit-progress-row--${state}` : '';
  const currentBadge = metrics.current
    ? '<span class="unit-progress-row__current-badge">You are here</span>'
    : '';
  const referenceBadge = metrics.reference
    ? '<span class="unit-progress-row__reference-badge">Reference</span>'
    : '';
  // PRIORITY 1 §5 — see renderUnitRow()'s own comment for where this
  // string comes from. Only ever set alongside currentBadge.
  const currentDetailMarkup = metrics.currentDetail
    ? `<span class="unit-progress-row__current-detail">Next: ${escapeHtml(metrics.currentDetail)}</span>`
    : '';

  const practiceMarkup = Number.isFinite(metrics.practicePct)
    ? `
        <div class="unit-progress-row__progress" aria-label="${metrics.practicePct}% practice progress">
          <div class="progress-bar" aria-hidden="true">
            <div class="progress-bar__fill" style="width:${metrics.practicePct}%"></div>
          </div>
          <span class="unit-progress-row__metric">${metrics.practicedSigns}/${metrics.totalSigns} signs practiced</span>
        </div>
        <span class="unit-progress-row__assessment">
          ${metrics.passedCount}/${metrics.assessmentTotal} category assessment${metrics.assessmentTotal === 1 ? '' : 's'} passed
        </span>
      `
    : `<span class="unit-progress-row__status">${escapeHtml(statusText)}</span>`;

  const inner = `
    <span class="unit-progress-row__icon" aria-hidden="true">${icon}</span>
    <span class="unit-progress-row__body">
      <span class="unit-progress-row__head">
        <span class="unit-progress-row__title">Unit ${unit.order} · ${escapeHtml(unit.title)}</span>
        ${currentBadge}${referenceBadge}
      </span>
      ${currentDetailMarkup}
      ${practiceMarkup}
    </span>
  `;

  return href
    ? `<a class="unit-progress-row${stateClass}" href="${href}">${inner}</a>`
    : `<div class="unit-progress-row${stateClass}">${inner}</div>`;
}

function renderUnitList(destination) {
  const container = document.getElementById('unit-progress-list');
  if (!container || !window.LWData || !window.LWProgress) return;
  container.innerHTML = window.LWData.getUnits().map(unit => renderUnitRow(unit, destination)).join('');
}

/**
 * RESTORED (2026-08-21 earlier session — see the CRITICAL BUGFIX note
 * in the file header). The chip-rendering logic itself is unchanged
 * from before the §4 session that accidentally deleted it.
 *
 * BUG FIX (2026-08-20, review session): this used to render signId
 * twice per card — once inside .recap-card__img's pill and again in
 * a sibling <span> — showing as "A A" / "Y Y" / "Z Z" etc. The pill
 * was redesigned (see css/dashboard.css's own BUG FIX comment above
 * .recap-card__img) specifically to be a self-contained chip that
 * already shows the full sign text, including multi-word entries
 * like "I AM FINE" — the extra <span> was a leftover from before
 * that redesign. Removed rather than kept-but-hidden, since nothing
 * else in css/dashboard.css targets a bare <span> inside .recap-card.
 *
 * PRIORITY 1 §7 (2026-08-21, this session) — PIVOT_CHECKLIST.md's
 * "Improve 'Signs You've Learned'". Three additions, all still reading
 * the SAME window.LWProgress.getAllLearnedSigns() call as before — no
 * progress.js change, no new store read:
 *   1. [data-recap-count] gets "N signs practiced".
 *   2. The chip grid now supports showing more than RECAP_COLLAPSED_LIMIT
 *      (still 24, same cap the old hardcoded `.slice(-24)` used) via the
 *      recapExpanded toggle below, instead of silently truncating with
 *      no way to see the rest.
 *   3. [data-recap-foot]/[data-recap-toggle] are shown only when there
 *      ARE more than RECAP_COLLAPSED_LIMIT signs to reveal.
 * Deliberately NOT done here, per the checklist's own instructions:
 *   - no navigation to a new "all signs" page (checklist: "do not turn
 *     this section into another lesson browser") — "View all" expands
 *     the SAME grid in place instead;
 *   - no title/category lookup added to each chip — still just the
 *     raw signId, same as before (checklist: "keep the visual chips
 *     lightweight").
 */
const RECAP_COLLAPSED_LIMIT = 24; // unchanged value, now a named constant instead of a magic number in .slice(-24)

// Toggle state for the §7 "View all" control. Module-level (not a
// closure-local) because the click handler and renderRecap() both need
// to read/flip it, and renderRecap() is the one function that already
// owns re-rendering the grid — simplest to have the toggle just flip
// this and call the same render function again, rather than duplicating
// the chip-building markup in a second place.
let recapExpanded = false;

function renderRecap() {
  const grid     = document.getElementById('recap-grid');
  const empty    = document.getElementById('recap-empty');
  const countEl  = document.querySelector('[data-recap-count]');
  const footEl   = document.querySelector('[data-recap-foot]');
  const toggleEl = document.querySelector('[data-recap-toggle]');
  if (!grid || !window.LWProgress) return;

  const learned = window.LWProgress.getAllLearnedSigns();

  if (learned.length === 0) {
    if (empty) empty.style.display = '';
    if (countEl) countEl.textContent = '';
    if (footEl) footEl.style.display = 'none';
    return;
  }
  if (empty) empty.style.display = 'none';

  if (countEl) {
    countEl.textContent = `${learned.length} sign${learned.length === 1 ? '' : 's'} practiced`;
  }

  // Most-recently-practiced first — same insertion-order assumption
  // the old `.slice(-24).reverse()` already relied on (see
  // renderReviewEntry()'s doc comment for why that assumption holds).
  const ordered = learned.slice().reverse();
  const visible = recapExpanded ? ordered : ordered.slice(0, RECAP_COLLAPSED_LIMIT);

  grid.innerHTML = visible.map(({ signId }) => `
    <div class="recap-card">
      <div class="recap-card__img" aria-label="ASL sign for ${signId}">${signId}</div>
    </div>
  `).join('');

  const canToggle = ordered.length > RECAP_COLLAPSED_LIMIT;
  if (footEl && toggleEl) {
    footEl.style.display = canToggle ? '' : 'none';
    if (canToggle) {
      toggleEl.textContent = recapExpanded ? 'Show fewer' : `View all ${ordered.length}`;
    }
  }
}

/** Click handler for [data-recap-toggle] — flips recapExpanded and
 *  re-renders the SAME grid (see renderRecap()'s §7 doc comment for
 *  why this expands in place rather than navigating anywhere). Bound
 *  once in DOMContentLoaded, not inside renderRecap() itself, so it
 *  doesn't get re-attached (and double-fire) on every re-render. */
function handleRecapToggle() {
  recapExpanded = !recapExpanded;
  renderRecap();
}

/**
 * NEW (Priority 1 §6, 2026-08-21) — fills the "Review recent signs"
 * card's action slot. See the file header's §6 note for why this is
 * deliberately NOT a spaced-repetition trainer.
 *
 * window.LWProgress.getAllLearnedSigns() has no timestamp field, but
 * (same assumption renderRecap()'s own most-recent-first ordering
 * already relies on) it returns signs in the order they were recorded — JS
 * preserves object-key insertion order — so the LAST entry is the
 * most recently practiced sign. Reads only that one existing,
 * already-exported function; no new progress.js code, no new
 * algorithm, no second store read/parse.
 *
 * Mirrors the `href ? <a> : <div>` pattern unitRowHtml() already uses
 * for locked units: when there's nothing to review yet (or the
 * practiced sign's category/level couldn't be resolved — see
 * getAllLearnedSigns()'s own comment on why `level` can be null),
 * render a non-interactive placeholder instead of a button pointing
 * at a broken link.
 */
function renderReviewEntry() {
  const actionsEl = document.querySelector('[data-review-actions]');
  if (!actionsEl || !window.LWProgress) return;

  const learned = window.LWProgress.getAllLearnedSigns();
  const last = learned[learned.length - 1];

  if (!last || !last.level) {
    actionsEl.innerHTML = '<span class="btn btn--ghost" aria-disabled="true">Practice a sign to unlock Review</span>';
    return;
  }

  const signTitle = window.LWData?.getSign?.(last.level, last.signId)?.title ?? last.signId;
  const href = `lesson.html?level=${encodeURIComponent(last.level)}&category=${encodeURIComponent(last.category)}&sign=${encodeURIComponent(last.signId)}`;
  actionsEl.innerHTML = `<a class="btn btn--secondary" href="${href}" data-review-link>↺ Review "${escapeHtml(signTitle)}"</a>`;
}

/** RESTORED (this session, unchanged) — "Continue Learning" button —
 *  points at the first category that's unlocked but not yet passed.
 *  Behavior is UNCHANGED by either Priority 0 session (same href
 *  construction); it just reads the shared `destination` object
 *  instead of re-walking the chain itself. See the BUGFIX note in the
 *  file header for why this doesn't loop LEVELS.
 *
 * @param {ReturnType<typeof getCurrentDestination>} destination
 */
function renderContinueButton(destination) {
  const btn = document.querySelector('[data-continue-learning]');
  if (!btn || !destination) return;

  if (!destination.cat) {
    btn.href = 'learn.html';
    return;
  }

  const { cat, nextSign } = destination;
  btn.href = `lesson.html?level=${encodeURIComponent(cat.level)}&category=${encodeURIComponent(cat.id)}&sign=${encodeURIComponent(nextSign)}`;
}

/**
 * RESTORED (this session, unchanged) — PIVOT_CHECKLIST.md Dashboard UX
 * Review Checklist → Priority 0 item #1 ("Make 'Continue Learning' the
 * primary action", 2026-08-21).
 *
 * Fills in the hero card: exact destination (Unit + category + next
 * sign), progress WITHIN that destination (not the global aggregate
 * % — that's the separate "Overall Progress" card lower on the page;
 * relabeling that one is Priority 0 item #3, out of scope here), a
 * primary CTA whose LABEL changes with state (Start Lesson / Continue
 * / Review Your Path), and a secondary "Open Path" CTA shown only when
 * there's a specific unit worth linking to (checklist: "secondary CTA
 * only when useful").
 *
 * Does NOT set the primary button's `href` — renderContinueButton()
 * above already owns that, so the two functions don't race to set the
 * same attribute from two different code paths.
 *
 * @param {ReturnType<typeof getCurrentDestination>} destination
 */
function renderContinueCard(destination) {
  const iconEl      = document.querySelector('[data-continue-icon]');
  const eyebrowEl   = document.querySelector('[data-continue-eyebrow]');
  const titleEl     = document.querySelector('[data-continue-title]');
  const progWrapEl  = document.querySelector('[data-continue-progress-wrap]');
  const progFillEl  = document.querySelector('[data-continue-progress-fill]');
  const progLabelEl = document.querySelector('[data-continue-progress-label]');
  const primaryBtn  = document.querySelector('[data-continue-learning]');
  const secondaryBtn = document.querySelector('[data-continue-secondary]');
  if (!destination) return;

  // State: nothing live in the chain at all (defensive — e.g. a
  // fresh Rev 4 install pre-Phase-7 where a whole unit is still
  // comingSoon end-to-end). Shouldn't happen post-launch but costs
  // nothing to handle explicitly rather than showing a blank card.
  if (destination.chain.length === 0) {
    if (iconEl) iconEl.textContent = '👋';
    if (eyebrowEl) eyebrowEl.textContent = 'Get started';
    if (titleEl) titleEl.textContent = "Let's get you started on your ASL journey!";
    if (progWrapEl) progWrapEl.style.display = 'none';
    if (primaryBtn) primaryBtn.textContent = '▶ Start Learning';
    if (secondaryBtn) secondaryBtn.style.display = 'none';
    return;
  }

  // State: every live category in the chain is already passed.
  if (!destination.cat) {
    if (iconEl) iconEl.textContent = '🏆';
    if (eyebrowEl) eyebrowEl.textContent = 'All caught up';
    if (titleEl) titleEl.textContent = "You've completed every unit that's trained so far!";
    if (progWrapEl) progWrapEl.style.display = 'none';
    if (primaryBtn) primaryBtn.textContent = '↺ Review Your Path';
    if (secondaryBtn) secondaryBtn.style.display = 'none';
    return;
  }

  // State: a real next destination exists.
  const { cat, unit, signs, practicedCount, nextSign } = destination;
  const icon = UNIT_ICONS[unit?.id] ?? '🔖';
  const signTitle = window.LWData.getSign?.(cat.level, nextSign)?.title ?? nextSign;

  if (iconEl) iconEl.textContent = icon;
  if (eyebrowEl) eyebrowEl.textContent = unit ? `Unit ${unit.order} · ${unit.title}` : cat.title;
  if (titleEl) titleEl.textContent = `${cat.title} → ${signTitle}`;

  if (progWrapEl && progFillEl && progLabelEl && signs.length > 0) {
    const pct = Math.round((practicedCount / signs.length) * 100);
    progWrapEl.style.display = '';
    progFillEl.style.width = `${pct}%`;
    progLabelEl.textContent = `${practicedCount}/${signs.length} signs practiced in ${cat.title}`;
  } else if (progWrapEl) {
    progWrapEl.style.display = 'none';
  }

  if (primaryBtn) primaryBtn.textContent = practicedCount > 0 ? '▶ Continue' : '▶ Start Lesson';

  if (secondaryBtn) {
    secondaryBtn.href = unit ? `learn.html?unit=${encodeURIComponent(unit.id)}` : 'learn.html';
    secondaryBtn.textContent = 'Open Path';
    secondaryBtn.style.display = '';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[dashboard.js] waiting for progress...');
  await window.LWProgress?.whenProgressReady?.();
  console.log('[dashboard.js] progress ready, rendering now');

  // Computed once, consumed by all three "where's the learner" renders
  // below — see getCurrentDestination()'s doc comment for why this
  // replaced two separate copies of the same walk.
  const destination = getCurrentDestination();

  renderOverallProgress();
  renderCurrentUnit(destination);
  renderWelcomeBanner(destination);
  renderUnitList(destination);
  renderRecap();
  renderReviewEntry();
  renderContinueButton(destination);
  renderContinueCard(destination);

  // PRIORITY 1 §7 (2026-08-21) — bound once here, not inside renderRecap()
  // itself, so re-renders (e.g. from the toggle click) never re-attach
  // (and double-fire) the same listener. No-op if the button doesn't
  // exist for some reason (e.g. a future markup change) — same optional
  // chaining pattern the rest of this handler already uses.
  document.querySelector('[data-recap-toggle]')?.addEventListener('click', handleRecapToggle);
});