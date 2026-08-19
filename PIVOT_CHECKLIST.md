# PIVOT_CHECKLIST.md — Curriculum pivot implementation tracker

> Tracks execution of the plan in `SYSTEM_ARCHITECTURE.md` → **Rev 4**.
> Read that section for the *why* behind each item — this file is just the
> *what/done-or-not*. Check items off as they land; add a one-line note
> with the date if something was skipped, changed, or deferred.
>
> **AI assistants:** update this file in the same session you complete a
> checklist item. Don't mark something done without having actually made
> the change. If you only partially complete an item, leave it unchecked
> and add a note.

---

## Phase 0 — Planning
- [x] Deep-planning session with adviser feedback translated into a concrete unit map (2026-08-17)
- [x] `AI_MEMORY.md` §0 added — pointer for future AI sessions
- [x] `SYSTEM_ARCHITECTURE.md` Rev 4 added — full plan (unit map, data model, assessment, progress, additions/removals)
- [x] **Open questions answered by Joshua before Phase 1 starts** (see Rev 4 §Open questions) — answered 2026-08-18:
  - [x] `localStorage` progress: **accept a reset** (simplest, pre-launch). Not yet applied to code — this decision belongs to Phase 3 (storage key bump), not Phase 1.
  - [x] Unit 0 content: **static text** (fastest to ship) — implemented in Phase 1, see below.
  - [x] Unit 5 sub-category order: **only the 4 trained ones** (family/places/time/temperature) show; the other 8 (food/clothes/health/feelings/amounts/colors/money/animals) are `comingSoon` — implemented in Phase 1, see below.

## Phase 1 — `data.js` restructure
- [x] Add top-level `UNITS` array (`{ id, order, title, kind }`) — done 2026-08-18. Note: added a 4th `kind` value, `'reference'`, for Unit 7 (Phrasebook) beyond the three (`info`/`category-group`/`interactive`) named in Rev 4's data-model note — flagging for Joshua/adviser sign-off since Phrasebook is neither gradeable nor an info screen.
- [x] Add `unit` field to every existing `CATEGORIES` entry, matching the Unit Map table in Rev 4 — done 2026-08-18, all 34 categories tagged (2 basic → units 1/3, 14 medium → units 4/5/6, 18 intermediate → unit 7; see note below on `requests`).
  - Note: `requests` (medium) went to **unit 4** (Everyday Essentials), not unit 5, per the Unit Map table — Rev 4 groups it there since HELLO/THANK YOU-style essentials/courtesy content maps to Unit 4, not the Unit 5 thematic-vocab group.
- [x] Add Unit 0 "Welcome to ASL" content (background + how camera practice works + 1–2 Deaf-culture notes) — done 2026-08-18 as a new `UNIT0_CONTENT` const (static text, 4 sections: what ASL is, how practice/Camera Check works, 2 Deaf-culture notes). No screen renders it yet — that's Phase 4.
- [x] Promote `sequence_demo` → real Basic Phrases category (keep the mechanism, replace the "(Demo)" framing once Phase 7's phrases exist — can stay as a TODO marker until then) — done 2026-08-18: id/title kept mostly as-is (`'Basic Phrases (Demo content)'`), tagged `unit: 6`, added an explicit `TODO(Phase 7)` comment. Full rename to a clean "Basic Phrases" title is deferred to Phase 7 per the checklist's own wording, once `CAR_SPELL`/`HOME_WORK_DEMO` are replaced with real phrases.
- [x] Reorder Unit 5 sub-categories per the answer to the Phase 0 open question above — done 2026-08-18: `family`/`places`/`time`/`temperature` stay `comingSoon: false`; `food`/`clothes`/`health`/`feelings`/`amounts`/`colors`/`money`/`animals` flipped to `comingSoon: true`. "Reorder" was implemented as a comingSoon split rather than changing the `order` integers — the trained four already have lower `order` values (1–4) than the untrained eight (5–13 minus `requests`), so they already render first; no `order` renumbering was needed. Flag this interpretation for Joshua if a literal array-position reorder was intended instead.

## Phase 2 — Fingerspell Your Name (interactive drill)
- [x] New lesson type/page (or extension of `lesson.js`) that reads the learner's name and builds a dynamic `sequence` array from its letters — done 2026-08-18, as an extension of `lesson.js` (not a new page/route). See Session Log for the full list of touched functions.
- [x] Reuse the existing phrase-chaining pipeline (`sequence`-based `finalizeMotionWindow`/detection flow) — confirm it accepts a runtime-built sequence, not just static `data.js` ones — done 2026-08-18: confirmed TRUE by reading every consumer of `phraseSteps`/`phraseStepIdx` (`handleTryItClick`, `handlePracticeFrame`, `handleAssessmentFrame`, `startPhraseStep`, `updatePhrasePromptText`, `needsExplicitStart`, `getActiveAllowedLabels`) — none of them assume the array came from `data.js`, they only ever read whatever plain array `getPhraseSequence()` last returned. One injection point (`getPhraseSequence()`) was extended to return a runtime-built letter array for the name drill; zero other functions needed to change.
- [ ] Wire into the Unit 2 slot in the trail (depends on Phase 4's UI, but the drill logic itself doesn't have to wait) — **intentionally still unchecked.** The drill itself is fully functional today via a direct URL: `pages/lesson.html?level=basic&category=fingerspell_name`. Did not add a temporary entry point in `learn.js` or `dashboard.html` — Phase 4 owns the trail UI and this checklist's own header says not to touch `learn.js` without checking phase status first; `learn.js` is still Phase 4, not started. Flag for Joshua: say the word and a temporary dashboard link is a 5-minute add if you want it testable without typing the URL by hand before Phase 4 lands.

## Phase 3 — `js/engine/progress.js` unlock-chain flattening
- [x] Replace level→category nesting with a flat walk over `UNITS` — done 2026-08-18. New `getOrderedLiveCategories()` walks `getUnits()` (filtered to `kind === 'category-group'`) → `getCategoriesForUnit(order)`, building one cross-level chain. `isCategoryUnlocked(level, categoryId)` now walks that chain instead of `liveCategoriesFor(level)`; `level` param kept for call-site compatibility only (see AI_MEMORY.md Session Log for the full behavioral diff — e.g. Unit 4's `requests` now gates on Unit 3 `numbers` passing, not on being "first in the medium level").
- [x] Bump storage key `lw_progress_v2` → `lw_progress_v3` — done 2026-08-18.
- [x] Apply the Phase 0 decision on migration shim vs. reset — done 2026-08-18: **no migration shim written**, per Joshua's answer. Old `lw_progress_v2` data is simply left under its old key and never read by the new code — a returning learner starts Phase 3's tracking from zero. Storage shape itself also changed (flat `{ categories, levelAssessments }` instead of nested `{ levels: { [level]: { categories, levelAssessment } } }`), which is *why* a shim wasn't cheap enough to be worth writing pre-launch.
- [x] Confirm Unit 0 and the Phase 7 Phrasebook are excluded from the gating logic (no 80% threshold, nothing to unlock behind them) — confirmed 2026-08-18: `getOrderedLiveCategories()` only walks units with `kind === 'category-group'` — Unit 0 (`kind:'info'`) and Unit 7/Phrasebook (`kind:'reference'`) are structurally excluded, not special-cased. Unit 2 (Fingerspell Your Name, `kind:'interactive'`) is excluded too, but incidentally — it has zero `CATEGORIES` entries to begin with (see AI_MEMORY.md Phase 2 log), so the kind filter is redundant for it specifically. Verified with a standalone mock-data test harness (see AI_MEMORY.md Session Log) — chain correctly excluded a phrasebook-style unit-7 category and correctly cross-level-gated a unit-4 category behind a unit-3 one.

## Phase 4 — `js/learn.js` trail-view UI
- [x] Replace the three-tab (`basic`/`medium`/`intermediate`) switcher with a single scrollable trail over `UNITS` — done 2026-08-19. `renderTrail()` walks `window.LWData.getUnits()` into a single vertical list (`.trail`/`.trail-node`, new CSS — not the existing auto-fill card grid); `pages/learn.html`'s old `.level-tabs` markup removed.
- [x] Each category renders as a node: locked / current / done — done 2026-08-19, via `getUnitState()`. **Flagging explicitly (see AI_MEMORY.md §0 and the Phase 4 session log): this required reintroducing real per-category locking**, reversing a deliberate Rev 3 decision ("categories should never be locked" — see the old `renderCategories()`'s BUGFIX comment). Rev 4's ask only makes sense with real locking, so this phase implemented it via `LWProgress.isCategoryUnlocked` (already built cross-unit in Phase 3), but it's a real, visible behavior change worth a second look before shipping — no one can freely browse ahead into medium/intermediate content anymore.
- [x] Retire `renderBasicCategory()`/`renderCategories()`/`renderWordPicker()`'s three-way split in favor of one generic renderer walking `UNITS` — done 2026-08-19, partial rewrite rather than a from-scratch one (the checklist item's own parenthetical allowed either): `renderCategories()`/`MODULE_GROUPS` retired entirely, replaced by unit-scoped `renderUnitCategoryList()`/`renderCategoryCard()`. `renderBasicCategory()` → `renderBasicCategoryGrid()` (kept — still the right UI for Alphabet/Numbers' flat single-char tiles — but dropped its old Alphabet/Numbers sub-tab switcher, since those are two separate trail units now, not two views of one "basic" level). `renderWordPicker()` kept (still the right UI for word/phrase categories) but now takes a resolved category object and gained an `isReference` mode for Phrasebook. A unit with exactly one category (Alphabet, Numbers, Everyday Essentials, Basic Phrases) skips the category-list screen and opens directly — `renderUnitView()` branches on live category count, not a hardcoded per-unit list.
- [x] `pages/dashboard.html` progress display updated to match the flat model (no more three level cards) — done 2026-08-19. Replaced the `.grid-3` of three `[data-level-card]` cards with one aggregate progress card (whole flat chain combined) + one data-driven row per unit, both rendered by `js/dashboard.js` from `window.LWProgress.getOrderedLiveCategories()`/`window.LWData.getUnits()`.
- Note (2026-08-18, from Phase 3): `js/engine/progress.js` now exports `getOrderedLiveCategories()` — the same flat cross-unit chain the unlock logic uses — specifically so this phase doesn't have to re-derive the trail order from `UNITS`/`CATEGORIES` by hand. **Consumed as intended** — both `learn.js` and `dashboard.js` use it directly.
- Bonus fix (not a checklist item, found by this session's own test): `js/dashboard.js`'s `renderContinueButton()` had a real ordering bug — it looped `LEVELS` then each level's own in-level category `order`, which doesn't match unit order (Phase 1 never renumbered `order` when it added `unit`). Could recommend a category out of true trail sequence. Fixed by walking `getOrderedLiveCategories()` directly, same as the rest of this phase's changes. See AI_MEMORY.md's Phase 4 session log for the concrete before/after.
- Still open after this phase (not blocking, see AI_MEMORY.md §4 for full detail): `pages/intro-to-asl.html` vs. Unit 0's new `UNIT0_CONTENT` screen now overlap (cross-linked, not merged); Level Final Assessment CTAs have no `learn.js` entry point anymore (underlying feature untouched, still reachable via `quiz.js`'s own flow — this is the same open question Phase 3 flagged for Phase 6).

## Phase 5 — Remove signup-time level picker
- [ ] `index.html` — remove "choose your proficiency level" step from the Sign Up form
- [ ] `js/auth.js`'s `register()` — drop the `level` param (or default everyone to the same starting point)
- [ ] Everyone starts at Unit 0 — confirm no page still assumes a user-chosen `level` exists at first login
- Note (2026-08-19, from Phase 4): `pages/dashboard.html`'s `data-user-level` account field ("Current Level") is untouched and still displays whatever the user picked at signup — this phase is what makes that field make sense to remove/repurpose.

## Phase 6 — `js/quiz.js` assessment format changes
- [ ] Add non-blocking mini-check after each sign (or small cluster) inside `lesson.html`, reusing the existing Practice Check UI, instead of only checking at category end
- [ ] Add sign-ordering/fingerspelling-challenge question type for Unit 6 (phrase-chaining via camera instead of only 4-option MC)
- [ ] Confirm Camera Check + the new ordering challenge both stay optional/bonus, matching Rev 3's existing "practice, not a gate" reasoning
- Note (2026-08-18, from Phase 3): `js/engine/progress.js`'s `recordLevelAssessment`/`getLevelAssessment`/`isLevelFinalUnlocked`/`LEVEL_ORDER` were all left **unchanged** in Phase 3 — level-final assessments are still a per-level concept today. Whether "level final" still makes sense once the trail is one continuous path is a call for this phase, not Phase 3 — flagging so it isn't assumed already decided.
- Note (2026-08-19, from Phase 4): this question got more pressing, not less — `learn.js`'s trail no longer has any UI entry point into a level-final assessment (there's no honest per-level slot left in a cross-level trail to put the old CTA in). The feature itself is untouched — `quiz.html?final=1` and `quiz.js`'s own post-pass "Next Level" CTA still work exactly as before — it's just only reachable via that existing in-quiz flow now, not from the trail directly. This phase needs to actually decide: keep level-finals as-is (and maybe add a trail entry point back), redesign as a trail-wide review, or retire the concept.

## Phase 7 — Capture + retrain (content/ML work, not app code)
- [ ] Capture + retrain Essential Words placeholders: `PLEASE`, `SORRY`, `YES`, `NO`, `HELP`, `GOOD`, `BAD`, `WHAT`, `WHERE`, `WHY`, `WATER`, `FOOD`, `GO`, `COME`, `RESTROOM`, `HUNGRY`
- [ ] Capture + retrain the 5 phrase placeholders: `NICE TO MEET YOU`, `HOW ARE YOU`, `WHERE IS`, `I AM LEARNING`, `WHAT IS YOUR NAME`
- [ ] Fix `SIGN_DICTIONARY['6']`/`['9']` → add `detectionType: 'motion'` (pre-existing open item, predates this pivot)
- [ ] Add `SIGN_DICTIONARY['10']` + `data.js` entry (pre-existing open item)
- [ ] Curate 5–8 real Unit 6 phrases built only from words trained by Unit 6 (replacing `CAR_SPELL`/`HOME_WORK_DEMO`)

---

## Explicitly deferred / not in scope for this pivot
- [ ] The 18 `intermediate` phrase categories (~100 sentences, all of Unit 7/Phrasebook including `greetings_intro`) — demoted to a read-only Phrasebook per Rev 4, not a graded unit. **Implemented in Phase 4**: `learn.js` renders these in `isReference` mode — browsable, no assessment CTA, never locked. Revisit only if full-sentence detection becomes realistic later. (Note: this item previously said "17 non-`greetings_intro`" — corrected 2026-08-19, since Phase 1's actual code tags all 18 uniformly as `unit: 7` and none of the 18 have `SIGN_DICTIONARY` entries, per the correction already noted in AI_MEMORY.md §0.)
- [ ] Review/Trainer mode (spaced-repetition-style camera drill) — suggested addition, not required by the adviser. Pick up after Phase 6 if time allows.
- [ ] Optional placement/skip test — suggested addition, same as above.
- [ ] Sign-variation callouts (e.g. "HOW" has two accepted forms) — suggested addition, low priority.
- [ ] `pages/intro-to-asl.html` vs. Unit 0's `UNIT0_CONTENT` screen content overlap — surfaced in Phase 4 (see AI_MEMORY.md §4), not resolved. Needs a real decision (merge one into the other, or keep both cross-linked as Phase 4 left them) but isn't blocking anything.