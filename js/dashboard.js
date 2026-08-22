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
 * RESOLVED (PIVOT_CHECKLIST.md §12 "status vocabulary" session,
 * 2026-08-22): both items flagged directly below as "NOT fixed" were
 * fixed once learn.js/lesson.js were actually in scope. Left the
 * original flag text in place (rather than deleting it) since it's
 * still useful context for why the fix looked the way it did — see
 * js/learn.js's renderWordPicker()/getUnitState() and js/lesson.js's
 * renderCourseSidebar() header comment for the actual changes.
 *   - js/learn.js used "quiz" in learner-facing copy ("Browse only, no
 *     quiz yet", "No quiz or camera check yet") where every dashboard
 *     string and PIVOT_CHECKLIST.md's own §3/§7/§12 vocabulary use
 *     "assessment" for the identical `progress.assessment.passed`
 *     concept. This looked like the real direction of travel (assessment)
 *     with learn.js as the not-yet-updated outlier, not the other way
 *     around — confirmed and changed to "assessment" in both spots,
 *     matching this file's own strings verbatim.
 *   - js/lesson.js's renderCourseSidebar() header comment (the "One
 *     deliberate difference from dashboard.js" note) said dashboard's
 *     unit rows show "X/Y categories passed" — that was true before
 *     Priority 1 §4 changed the wording to "assessments passed"
 *     (and now "category assessments passed" per fix #3 above). The
 *     comment was stale documentation in a file outside that session's
 *     scope; now corrected to match this file's actual current string.
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
 *
 * DASHBOARD UX REVIEW — PRIORITY 2, §11 (2026-08-22, this session):
 * "Add learning statistics that actually motivate." Implemented the
 * checklist's own recommended MVP subset — Practice Progress,
 * Assessments Passed, Signs Practiced, Current Unit — as a new 4-tile
 * "Progress Snapshot" grid (renderStatsSnapshot()). The other three
 * bulleted items (streak, review due, best assessment score) are
 * explicitly marked "Later" in PIVOT_CHECKLIST.md §11 and were NOT
 * built — there's no streak/review-due/best-score data source to read
 * yet, and inventing one would be exactly the "new algorithm" §19
 * warns against.
 *
 * Two small refactors made this possible without a second copy of
 * either existing computation (same "one shared helper, not two
 * copies of the same walk" rule getCurrentDestination() already
 * established in this file):
 *   1. renderOverallProgress()'s inline chain-walk (totalSigns /
 *      practicedSigns / passedCategories / pct) is now
 *      computeOverallStats(), called by BOTH renderOverallProgress()
 *      and the new renderStatsSnapshot(). renderOverallProgress()'s
 *      own output is byte-for-byte unchanged — same fields, same
 *      values, same rounding — this is a refactor, not a behavior
 *      change.
 *   2. renderCurrentUnit()'s inline 3-branch label logic is now
 *      getCurrentUnitLabel(destination), called by BOTH
 *      renderCurrentUnit() (Your Account card) and the new "Current
 *      Unit" tile. Output unchanged.
 *
 * DUPLICATION, flagged deliberately (see renderStatsSnapshot()'s own
 * doc comment for the full reasoning): three of these four tiles
 * restate numbers already visible elsewhere (Overall Progress card;
 * Your Account's Current Unit). This is a considered exception to the
 * §10 "don't show the same concept twice" rule, not an oversight —
 * §10's own test is "distinct job + agreeing wording," and a glanceable
 * stat strip vs. a detailed labeled card meets that test. Flagging for
 * a second look rather than declaring it settled, same as every other
 * judgment call in this file gets flagged.
 *
 * Markup: pages/dashboard.html gained a `.stats-grid` of 4
 * `.stat-tile`s, placed inside the EXISTING "Overall Progress"
 * `section--tight` container (between that heading and its
 * progress-card), not a new `<section>` — preserves Priority 1 §9's
 * first-viewport padding budget, same reasoning §10 already used when
 * it added the "Learning Path" heading to this same container instead
 * of a new section. New CSS: `.stats-grid`/`.stat-tile`/
 * `.stat-tile__value`/`.stat-tile__value--text`/`.stat-tile__label` in
 * css/dashboard.css (auto-fit grid, no new media query needed).
 *
 * DASHBOARD UX REVIEW — PRIORITY 2, §13 ("Dashboard accessibility and
 * feedback", 2026-08-22, this session): implements PIVOT_CHECKLIST.md
 * §13's six sub-items, scoped to pages/dashboard.html / js/dashboard.js
 * / css/dashboard.css only, same as every Priority 1/2 session before
 * it. js/auth.js excluded per explicit user instruction, same as always.
 *
 * Audit first, then fixes — three of the six sub-items were already
 * satisfied by earlier sessions and needed no code change (documented
 * here so a future session doesn't re-derive the same audit):
 *   - "Keep text state labels" — already true. Locked rows have always
 *     shown "Locked · finish the previous unit first" as visible text
 *     (unitRowHtml()'s statusText branch), and the current-unit badge
 *     ("You are here") has been text, not a color/icon-only signal,
 *     since Priority 1 §4/§5.
 *   - "Ensure progress percentages remain understandable without
 *     color" — already true everywhere a percentage/fraction appears
 *     on this page: the hero card's within-destination progress
 *     ([data-continue-progress-label], "N/M signs practiced in
 *     {category}"), the Overall Progress card ([data-overall-pct] +
 *     [data-overall-count] + [data-overall-status], all plain text
 *     next to the bar, not color-only), the Priority 2 §11 stat tiles
 *     (plain numbers, no color coding at all), and each unit row's own
 *     "{practiced}/{total} signs practiced" / "{passed}/{total}
 *     category assessment(s) passed" lines. Every one of these pairs
 *     the number with adjacent text; color (where used, e.g. the
 *     assessment line turning `--clr-success` on a done row) is always
 *     a supplement to a number that already says the same thing, never
 *     the only signal. Checked, not changed.
 *   - CTA labels were already mostly action-verb-led ("▶ Start Lesson"
 *     / "▶ Continue" / "↺ Review Your Path" / `↺ Review "{sign}"`),
 *     EXCEPT the hero card's secondary "Open Path" button, which named
 *     an action but not WHICH path — fixed below.
 *
 * Three real changes followed from the audit:
 *
 * 1. "Current/locked/done state must not rely only on border color."
 *    Locked and current rows already had a non-color signal (status
 *    text / "You are here" badge); a fully "done" row (passedCount ===
 *    assessmentTotal) had NONE — only the left border color and
 *    background tint flipping from accent to `--clr-success` told a
 *    learner a unit was finished, exactly the failure mode this bullet
 *    names. renderUnitRow()'s graded branch now also passes a `done`
 *    flag into unitRowHtml(), which renders a third badge —
 *    `.unit-progress-row__done-badge`, "✓ Completed" — alongside the
 *    existing "You are here" / "Reference" badges (same markup/CSS
 *    pattern, see css/dashboard.css). Text + checkmark, not color
 *    alone.
 *
 * 2. "Ensure CTA labels describe the action" (the "Open Path" gap
 *    above). renderContinueCard()'s secondary button now reads
 *    `Open Unit {order} Path` when a specific unit is known (the exact
 *    same `unit` field the eyebrow line above it already names), and
 *    falls back to the previous generic "Open Path" only in the
 *    destination-less edge cases (empty chain / everything passed)
 *    where renderContinueCard() hides the secondary button entirely
 *    anyway — so the fallback string is dead code today, kept only for
 *    defensiveness if that branch ever changes.
 *    Separately, each unit row's own accessible name (its `aria-label`)
 *    is new: previously a screen reader linearized the row's visible
 *    text/nested-aria-label content into one run-on string with no
 *    verb ("Unit 3 · Everyday Essentials You are here Next: Requests →
 *    HELLO 45% practice progress 0/1 category assessment passed" — the
 *    45%/etc. reads oddly out of visual context). Every graded/info/
 *    interactive/reference row now gets an explicit `aria-label`
 *    starting "Open Unit N: {title} — …", built entirely from fields
 *    renderUnitRow() already computes (no new lookup) — see
 *    unitRowHtml()'s own comment. Locked and "coming soon" rows are
 *    plain `<div>`s, not links, so they were never focusable and don't
 *    need one.
 *
 * 3. "Ensure keyboard navigation reaches Continue first." The Continue
 *    Learning button was already the first focusable element in the
 *    page's OWN content (right after the header, per Priority 0 #1's
 *    placement) — but a keyboard user still has to tab through the
 *    entire navbar (logo, 2 nav links, theme toggle, "Log out") first.
 *    Added a standard "skip link" — a visually-hidden-until-focused
 *    `<a href="#continue-cta">Skip to Continue Learning</a>` as the
 *    very first element in `<body>`, jumping straight to the primary
 *    CTA (`id="continue-cta"` added to the SAME `[data-continue-learning]`
 *    anchor — no new element). New CSS only (`.skip-link` in
 *    css/dashboard.css, page-scoped the same way `.section--tight` is —
 *    see that rule's own comment for why page-scoping a class in this
 *    file never leaks to learn.html/lesson.html/etc.). No JS change for
 *    this item.
 *
 * "Ensure interactive unit rows have visible focus states" — the last
 * sub-item — is CSS-only (css/dashboard.css: `a.unit-progress-row:
 * focus-visible`), see that file. Nothing here changed for it. Scoped
 * to unit rows only, per the item's literal wording — other buttons on
 * this page (`.btn`) already show the browser's default focus outline
 * (nothing in css/style.css removes it for `.btn`), so they were left
 * alone; flagging a general `.btn` focus-style pass as a possible
 * future item if a session ever wants one, not something this item
 * asked for.
 *
 * Verification performed this session: node --check (clean),
 * declaration-vs-call-site check (all functions resolve), a Node + vm
 * harness running renderUnitRow() against mocked LWData/LWProgress
 * across locked/current/done/interactive/info/reference states
 * (confirmed the done badge appears only on fully-passed rows, and
 * every linked row's aria-label is present and HTML-escaped — tested
 * with a unit title containing `&`/`<`), and a manual DOM-order trace
 * confirming the skip link is the first element in <body> and
 * `#continue-cta` resolves to exactly one element. See
 * PIVOT_CHECKLIST.md §13 and SYSTEM_ARCHITECTURE.md's matching entry
 * for the full writeup. NOT exercised in a real browser or with an
 * actual screen reader (VoiceOver/NVDA) — flagged same as every
 * session before this one, but called out specifically here since a
 * screen-reader pass is the one check that would most directly confirm
 * an accessibility item actually worked; that's the single biggest
 * follow-up before treating §13 as fully closed.
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
/**
 * NEW (Priority 2 §11, 2026-08-22) — factored out of
 * renderOverallProgress()'s own body so a second consumer
 * (renderStatsSnapshot() below) can read the exact same aggregate
 * numbers without re-walking window.LWProgress.getOrderedLiveCategories()
 * a second time with a slightly different loop. Same "one shared
 * helper, not two copies of the same walk" rule getCurrentDestination()
 * already established for the "where's the learner" walk (see this
 * file's header comment). renderOverallProgress() below is now just
 * this helper plus its own DOM writes — its OUTPUT is byte-for-byte
 * unchanged (same fields, same values, same rounding); this is a
 * refactor, not a behavior change.
 *
 * @returns {null | {
 *   chain: object[],
 *   totalSigns: number,
 *   practicedSigns: number,
 *   passedCategories: number,
 *   pct: number,
 * }}
 */
function computeOverallStats() {
  if (!window.LWProgress || !window.LWData) return null;
  const chain = window.LWProgress.getOrderedLiveCategories();

  let totalSigns = 0, practicedSigns = 0, passedCategories = 0;
  chain.forEach(cat => {
    const signs = window.LWData.getCategorySigns(cat.level, cat.id);
    const prog  = window.LWProgress.getCategoryProgress(cat.level, cat.id);
    totalSigns     += signs.length;
    practicedSigns += signs.filter(s => !!prog.signs[s]).length;
    if (prog.assessment?.passed) passedCategories++;
  });

  const pct = totalSigns > 0 ? Math.round((practicedSigns / totalSigns) * 100) : 0;
  return { chain, totalSigns, practicedSigns, passedCategories, pct };
}

function renderOverallProgress() {
  const stats = computeOverallStats();
  if (!stats) return;
  const { chain, totalSigns, practicedSigns, passedCategories, pct } = stats;

  const pctEl    = document.querySelector('[data-overall-pct]');
  const barEl    = document.querySelector('[data-overall-progress]');
  const countEl  = document.querySelector('[data-overall-count]');
  const statusEl = document.querySelector('[data-overall-status]');
  if (!pctEl) return;

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
/**
 * NEW (Priority 2 §11, 2026-08-22) — factored out of
 * renderCurrentUnit()'s own body so the new "Current Unit" stat tile
 * (renderStatsSnapshot() below) shows the exact same three-state label
 * ("Not started yet" / "All units complete" / "Unit N · Title") instead
 * of a second copy of this branch. renderCurrentUnit() below now just
 * calls this helper — its own output is unchanged.
 *
 * @param {ReturnType<typeof getCurrentDestination>} destination
 * @returns {string}
 */
function getCurrentUnitLabel(destination) {
  if (!destination || destination.chain.length === 0) return 'Not started yet';
  if (!destination.cat) return 'All units complete';
  const { cat, unit } = destination;
  return unit ? `Unit ${unit.order} · ${unit.title}` : cat.title;
}

function renderCurrentUnit(destination) {
  const el = document.querySelector('[data-user-unit]');
  if (!el || !destination) return;
  el.textContent = getCurrentUnitLabel(destination);
}

/**
 * NEW — PIVOT_CHECKLIST.md Priority 2 §11 ("Add learning statistics
 * that actually motivate", 2026-08-22 session). Fills the 4-tile
 * "Progress Snapshot" grid: Practice Progress, Assessments Passed,
 * Signs Practiced, Current Unit — the exact MVP subset §11 recommends
 * ("Recommended MVP: only add the first four"; streak / review due /
 * best assessment score are explicitly "Later" items and NOT built
 * here — there's no streak or best-score data source to read yet, and
 * adding one would be exactly the "new algorithm" §19 warns against).
 *
 * Deliberately reuses computeOverallStats() and getCurrentUnitLabel()
 * rather than re-deriving any of these four numbers a second way — see
 * this file's header comment for why. Every number here is guaranteed
 * to agree with the Overall Progress card and the Your Account card,
 * because they call the exact same two functions; there's no way for
 * this tile grid to drift out of sync with either one.
 *
 * DUPLICATION NOTE (flagging per this project's own §10 audit
 * precedent, not an oversight): three of these four numbers ARE already
 * visible elsewhere on the page — the Overall Progress card's
 * %/count/status line, and Your Account's Current Unit field. §10's
 * own test for whether overlap is OK is "distinct job + agreeing
 * wording": this grid's job is a single-glance, Cisco/Duolingo-style
 * stat strip read in under a second, sitting directly under the
 * primary CTA; the Overall Progress card's job is the fuller, labeled
 * explanation (progress bar, "not a mastery score" caption) a learner
 * reads once they want more detail. Wording matches exactly ("Practice
 * Progress", the "category assessments passed" pattern, "Current
 * Unit") rather than inventing synonyms. If a future session decides
 * the overlap isn't worth keeping, this function and its markup block
 * (`.stats-grid` in pages/dashboard.html) can be deleted without
 * touching anything else — nothing downstream reads from it.
 *
 * "Signs Practiced" specifically uses computeOverallStats()'s
 * chain-scoped `practicedSigns` (the same number as
 * [data-overall-count]'s numerator) — NOT
 * window.LWProgress.getAllLearnedSigns().length, the number
 * renderRecap() shows via [data-recap-count]. Those two CAN differ in
 * principle: getAllLearnedSigns() returns every sign ever recorded in
 * the store, including any outside the current live grading chain,
 * while computeOverallStats() only counts the live chain — the same
 * scope "Practice Progress" and "Assessments Passed" already use in
 * this same tile row. Picked the chain-scoped number so all four tiles
 * in ONE row stay internally consistent with each other; renderRecap()
 * keeps its own broader number because its job ("everything you've
 * ever practiced") is genuinely different from this row's job
 * ("progress through the current curriculum"). Not verified against
 * real localStorage data whether the two numbers ever actually diverge
 * in practice today — flagging so a future session checks with real
 * data rather than assuming they always match.
 *
 * @param {ReturnType<typeof getCurrentDestination>} destination
 */
function renderStatsSnapshot(destination) {
  const stats = computeOverallStats();
  if (!stats) return;

  const pctEl    = document.querySelector('[data-stat-practice-pct]');
  const assessEl = document.querySelector('[data-stat-assessments]');
  const signsEl  = document.querySelector('[data-stat-signs]');
  const unitEl   = document.querySelector('[data-stat-unit]');
  if (!pctEl && !assessEl && !signsEl && !unitEl) return;

  if (pctEl)    pctEl.textContent = `${stats.pct}%`;
  if (assessEl) assessEl.textContent = `${stats.passedCategories}/${stats.chain.length}`;
  if (signsEl)  signsEl.textContent = `${stats.practicedSigns}`;
  if (unitEl)   unitEl.textContent = getCurrentUnitLabel(destination);
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
  // NEW (Priority 2 §13, 2026-08-22) — short suffix appended to a row's
  // aria-label when it's the learner's current unit, shared across the
  // info/interactive/graded branches below so "you are here" isn't
  // spelled three different ways in the accessible name.
  const hereSuffix = isCurrentUnit ? ', you are here' : '';

  if (unit.kind === 'info') {
    return unitRowHtml(icon, unit, 'Welcome · no assessment', 'learn.html?unit=welcome',
      isCurrentUnit ? 'current' : null, {
        current: isCurrentUnit,
        ariaLabel: `Open Unit ${unit.order}: ${unit.title} — welcome guide, no assessment${hereSuffix}`,
      });
  }

  if (unit.kind === 'interactive') {
    return unitRowHtml(icon, unit, 'Practice drill · always open',
      'lesson.html?level=basic&category=fingerspell_name',
      isCurrentUnit ? 'current' : null, {
        current: isCurrentUnit,
        ariaLabel: `Open Unit ${unit.order}: ${unit.title} — practice drill, always open${hereSuffix}`,
      });
  }

  if (unit.kind === 'reference') {
    return unitRowHtml(icon, unit, 'Browse only, no assessment yet',
      'learn.html?unit=phrasebook', null, {
        reference: true,
        ariaLabel: `Open Unit ${unit.order}: ${unit.title} — reference, browse only, no assessment yet`,
      });
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

  // NEW (Priority 2 §13, 2026-08-22) — aria-label for the graded case,
  // built from the exact same numbers the visible row already renders
  // (no new computation): "completed" when passedCount===assessmentTotal
  // (matches the new doneBadge in unitRowHtml()), otherwise the
  // practiced/passed fractions, plus the "you are here"/"next" suffix
  // on the current row.
  const assessmentWord = `category assessment${assessmentTotal === 1 ? '' : 's'}`;
  const ariaStatus = done
    ? `completed, ${passedCount} of ${assessmentTotal} ${assessmentWord} passed`
    : `${practicedSigns} of ${totalSigns} signs practiced, ${passedCount} of ${assessmentTotal} ${assessmentWord} passed`;
  const ariaLabel = `Open Unit ${unit.order}: ${unit.title} — ${ariaStatus}${hereSuffix}` +
    (isCurrentUnit && currentSignLabel ? `, next: ${currentSignLabel}` : '');

  return unitRowHtml(icon, unit, '', href, state, {
    current: isCurrentUnit,
    done,
    currentDetail: currentSignLabel,
    practicePct,
    practicedSigns,
    totalSigns,
    passedCount,
    assessmentTotal,
    ariaLabel,
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
  // NEW (Priority 2 §13, 2026-08-22) — "Current/locked/done state must
  // not rely only on border color." Locked rows already say so in
  // `statusText` ("Locked · finish the previous unit first"); current
  // rows already had `currentBadge` above. A fully-done row
  // (passedCount === assessmentTotal) had NO non-color signal at all
  // before this — only the left border/background flipping to
  // `--clr-success` told a learner a unit was finished. Same
  // text-badge shape as the two badges above it, see css/dashboard.css.
  const doneBadge = metrics.done
    ? '<span class="unit-progress-row__done-badge">✓ Completed</span>'
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
        ${currentBadge}${doneBadge}${referenceBadge}
      </span>
      ${currentDetailMarkup}
      ${practiceMarkup}
    </span>
  `;

  // NEW (Priority 2 §13, 2026-08-22) — "Ensure CTA labels describe the
  // action." Without this, a screen reader linearized a row's visible
  // text + nested aria-labels into one run-on string with no verb
  // ("Unit 3 · Everyday Essentials You are here Next: Requests → HELLO
  // 45% practice progress 0/1 category assessment passed"). Every
  // linked row now gets an explicit `aria-label` starting "Open Unit
  // N: {title} — …", built entirely from fields renderUnitRow() already
  // computed (see that function) — no new lookup. Only applied when
  // `href` exists: locked/"coming soon" rows render as plain <div>s (no
  // href), were never focusable, and an aria-label on a non-interactive
  // div wouldn't help a keyboard/screen-reader user here anyway.
  const ariaAttr = href && metrics.ariaLabel
    ? ` aria-label="${escapeHtml(metrics.ariaLabel)}"`
    : '';

  return href
    ? `<a class="unit-progress-row${stateClass}" href="${href}"${ariaAttr}>${inner}</a>`
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
    // CHANGED (Priority 2 §13, 2026-08-22) — "Ensure CTA labels
    // describe the action." Previously always read the generic "Open
    // Path" no matter which unit it opened; now names the unit, same
    // `unit` field the eyebrow line above already shows. The plain
    // "Open Path" fallback only survives for the case where this
    // button is visible with no `unit` — today unreachable, since both
    // branches above that lack a `unit` (empty chain / everything
    // passed) already leave `secondaryBtn.style.display` as 'none' —
    // kept only for defensiveness, not currently exercised.
    secondaryBtn.textContent = unit ? `Open Unit ${unit.order} Path` : 'Open Path';
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
  renderStatsSnapshot(destination);
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