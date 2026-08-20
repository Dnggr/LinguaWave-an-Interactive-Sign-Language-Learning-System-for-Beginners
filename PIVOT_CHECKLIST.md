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
- Still open after this phase (not blocking, see AI_MEMORY.md §4 for full detail): `pages/intro-to-asl.html` vs. Unit 0's new `UNIT0_CONTENT` screen now overlap (cross-linked, not merged); Level Final Assessment CTAs have no `learn.js` entry point anymore (underlying feature untouched, still reachable via `quiz.js`'s own flow — this is the same open question Phase 3 flagged for Phase 6). **Level Final Assessment question resolved in Phase 6** — see that section: CTA retired, mechanism kept.

## Phase 5 — Remove signup-time level picker — ✅ Done 2026-08-19
- [x] `index.html` — remove "choose your proficiency level" step from the Sign Up form — done 2026-08-19: removed the `#reg-level` `<select>` (Beginner/Intermediate/Advanced) and its `form-group` from the register form; `handleRegister()` no longer reads it.
- [x] `js/auth.js`'s `register()` — drop the `level` param (or default everyone to the same starting point) — done 2026-08-19: dropped the 4th `level` param from `register(name, email, password)` entirely (not just defaulted); the written user doc now hardcodes `level: 'basic'` as a fixed constant. Kept the commented-out bypass-mode reference version of `register()` in sync (same param drop) so it doesn't reintroduce the picker if bypass mode is ever restored from that comment.
- [x] Everyone starts at Unit 0 — confirm no page still assumes a user-chosen `level` exists at first login — confirmed 2026-08-19 via grep across `js/`/`pages/` for `user.level`/`session.level`/`getCurrentUser().level`: the **only** consumer is `js/main.js`'s `initUserDetails()` (fills `[data-user-level]`, i.e. `pages/dashboard.html`'s "Current Level" field) — purely cosmetic. Nothing in the unlock/trail/gating path (`progress.js`, `learn.js`, `dashboard.js`'s unit rows) reads the user's profile `level` at all — the flat trail chain (`getOrderedLiveCategories()`, Phase 3) is 100% progress-based, not level-based, so there was nothing to break here. (Every other `.level`/`c.level`/`s.level` hit in that grep was `data.js` `CATEGORIES`/`SIGNS`' own internal grouping field — a same-named but unrelated concept per Rev 4's data-model note, correctly left alone.)
- Note (2026-08-19, from Phase 4): `pages/dashboard.html`'s `data-user-level` account field ("Current Level") is untouched and still displays whatever the user picked at signup — this phase is what makes that field make sense to remove/repurpose.
- **Flagging, not resolved this phase:** the above is now true but in the least satisfying way — `data-user-level` will show "Basic" for every single new signup forever, since `register()` hardcodes it. The field isn't broken (no crash, no `undefined`), just permanently uninformative. Deliberately did NOT touch `pages/dashboard.html`/`js/main.js` to repurpose or remove it — that's a UI/product call (show "Current Unit" instead? drop the field entirely?) outside this phase's 3 checklist items, and doing it well would mean pulling unit-progress data into `main.js`'s `initUserDetails()` or `dashboard.js`, which is more than a signup-form change. See AI_MEMORY.md's Phase 5 session log for the same flag. Recommend a real decision (from Joshua, or folded into Phase 6) before shipping this — right now it's a small but real "why does it always say Basic" support question waiting to happen.

## Phase 6 — `js/quiz.js` assessment format changes — ✅ Done 2026-08-20
- [x] Add non-blocking mini-check after each sign (or small cluster) inside `lesson.html`, reusing the existing Practice Check UI, instead of only checking at category end — done 2026-08-20: new "Quick Check" card (`#quick-check-card` in `lesson.html`, logic in `lesson.js`) shows a 4-option recall MC question after every 3rd sign and always on a category's last sign. "Reusing the existing Practice Check UI" was interpreted as reusing that panel's optional/skippable, never-blocking INTERACTION PATTERN, not the camera mechanism itself — see `lesson.js`'s Phase 6 header comment for the full reasoning; flagging this interpretation the same way earlier phases have flagged theirs. Purely formative: no `LWProgress` write, no effect on the graded category assessment.
- [x] Add sign-ordering/fingerspelling-challenge question type for Unit 6 (phrase-chaining via camera instead of only 4-option MC) — done 2026-08-20: the existing optional camera round in `quiz.js` now detects phrase-type signs (any `SIGNS` entry with a `sequence` array — today that's Unit 6/`sequence_demo`) step by step in order, reusing `lesson.js`'s `phraseSteps`/`phraseStepIdx` pattern rather than the single atomic `classifyMotion`/`classifyGesture` call that would never have matched a phrase signId anyway. `quiz.html`'s camera-gate card shows an extra note when the category has a phrase item in scope.
- [x] Confirm Camera Check + the new ordering challenge both stay optional/bonus, matching Rev 3's existing "practice, not a gate" reasoning — confirmed 2026-08-20: the phrase branch only ever writes into `cameraRoundData`, same object the plain atomic path already used, and `computeGradedScore()` never reads it — structurally incapable of affecting pass/fail. See the confirmation comment above `computeGradedScore()` in `quiz.js`.
- Note (2026-08-18, from Phase 3): `js/engine/progress.js`'s `recordLevelAssessment`/`getLevelAssessment`/`isLevelFinalUnlocked`/`LEVEL_ORDER` were all left **unchanged** in Phase 3 — level-final assessments are still a per-level concept today. Whether "level final" still makes sense once the trail is one continuous path is a call for this phase, not Phase 3 — flagging so it isn't assumed already decided.
- Note (2026-08-19, from Phase 4): this question got more pressing, not less — `learn.js`'s trail no longer has any UI entry point into a level-final assessment (there's no honest per-level slot left in a cross-level trail to put the old CTA in). The feature itself is untouched — `quiz.html?final=1` and `quiz.js`'s own post-pass "Next Level" CTA still work exactly as before — it's just only reachable via that existing in-quiz flow now, not from the trail directly. This phase needs to actually decide: keep level-finals as-is (and maybe add a trail entry point back), redesign as a trail-wide review, or retire the concept.
- **Decided 2026-08-20:** retire the CTA, keep the mechanism. `quiz.js`'s `buildActionButtons()` no longer offers "🏁 Take Level Final Assessment" after a category pass — that was the one remaining entry point anywhere in the app. Nothing in `progress.js` changed and `quiz.html?final=1` still runs a full, working level-final assessment for anyone who has it bookmarked; this only stops *offering* it. Reasoning: re-adding a trail entry point would resurface the three-level framing Rev 4 is deliberately moving away from (a category's `level` field and its trail position can now disagree — see Unit 4's `requests`), and "redesign as a trail-wide review" is a real new feature, not a small follow-on, so it wasn't attempted here. **Flagging this decision explicitly** (same spirit as Phase 4's category-locking-reversal flag) — it's a real product call made by this session, not something Joshua explicitly signed off on. See the full reasoning block above `buildActionButtons()` in `quiz.js`.
- Bonus fix (not a checklist item, found by this session while touching `buildActionButtons()` for the item above): the "Next Category" CTA on a category pass was computed from `liveCategoriesFor(level)` — the OLD per-level walk, same bug class Phase 4 already found and fixed in `dashboard.js`'s `renderContinueButton()`, but `quiz.js` was untouched at the time. Fixed by walking `getOrderedLiveCategories()` instead, same as Phase 4's fix. Concretely, this used to mean finishing the last basic-level category could silently fall back to "Back to Lessons" instead of correctly pointing at the next unit's first category.

## Phase 7 — Capture + retrain (content/ML work, not app code)
- [x] Fix `SIGN_DICTIONARY['6']`/`['9']` → add `detectionType: 'motion'` — **verified already done in-repo, 2026-08-20 (AI session).** Confirmed by reading `js/engine/dictionary.js` directly: both entries carry `detectionType: 'motion'`, with an existing "PHASE 7 (2026-08-20)" block comment above the numbers block explaining the fix. `data.js`'s `basic_6`/`basic_9` `SIGNS` entries were also checked and already carry the matching `detectionType: 'motion'` override. No further code change needed for this item — just confirming it's real and checking it off (it was previously left unchecked here despite being done in code).
- [x] Add `SIGN_DICTIONARY['10']` + `data.js` entry — **verified already done in-repo, 2026-08-20 (AI session).** `dictionary.js` has a full `'10'` entry (`category: 'numbers'`, `detectionType: 'motion'`); `data.js` has a matching `basic_10` `SIGNS` entry (`order: 37`). Same as above — confirming and checking off, not re-implementing.
  - **Not functional yet, by design:** `asl_motion_model/labels.json` (checked directly this session) has zero digit classes today, so `6`/`9`/`10` are correctly *routed* to the motion model but still won't actually detect anything until real capture + retraining happens for them specifically. That capture/retrain work is still open (see below) — the routing fix only fixed where the request goes, not the missing training data.
- [x] Curate 5–8 real Unit 6 phrases built only from words trained by Unit 6 (replacing `CAR_SPELL`/`HOME_WORK_DEMO`) — **done 2026-08-20 (AI session), code applied directly to `data.js`.** 6 phrases added (`MOM_HOME`, `DAD_WORK`, `TODAY_SCHOOL`, `FINISH_WORK`, `SISTER_STORE`, `TODAY_GRANDMA_HOME`), built only from family/places/time words individually grepped against this repo's actual `asl_motion_model/labels.json` (not assumed). `sequence_demo` category title changed from `'Basic Phrases (Demo content)'` → `'Basic Phrases'`; `id` kept as `'sequence_demo'` per the existing Phase 1 note. Ran `node --check` on the edited `data.js` — no syntax errors.
  - **Verified this session:** each `sequence`-type entry's top-level `detectionType: 'motion'` field is NOT what drives detection for a phrase. Read `lesson.js`'s `getActiveSignId()`/`getPhraseSequence()`/`needsExplicitStart()`: the camera step-through resolves `detectionType` **per step** via `getDetectionType(stepSignId)` (e.g. `'MOM'`, then `'HOME'`), never via the phrase entry's own `signId` (`'MOM_HOME'`). Field is harmless required-schema shape for these entries — closes the open question the previous draft of this checklist flagged.
  - **Flagging (2026-08-20):** while cross-checking which words are actually trained, confirmed two separate real issues (not previously this precisely documented):
    1. `HELLO`/`THANK YOU` (`dictionary.js`, Unit 4) are **not** marked `disabled: true` — i.e. the app treats them as usable — but `asl_motion_model/labels.json` has no `HELLO` or `THANK YOU` class at all. Any learner attempt at these two will run the motion classifier and can never match. Confirmed by grepping the actual labels.json this session, not inferred from a missing flag.
    2. `HOT`/`COLD` (Unit 5, `temperature` sub-category) are worse: they have **zero `SIGN_DICTIONARY` entry in `dictionary.js` at all** — not even a `disabled: true` placeholder like the 16 Essential Words have. `data.js` has real `SIGNS` entries for both (with descriptions/tips/media paths), so they render fine in the UI, but `getDetectionType()`'s `?? 'static'` fallback means any camera attempt silently runs the wrong (static-alphabet) classifier and can never succeed. `SYSTEM_ARCHITECTURE.md`'s Unit Map currently claims "family/places/time/temperature trained" for Unit 5 — that's only true for 3 of the 4 sub-categories.
  - Deliberately did NOT use `HELLO`/`THANK_YOU`/`HOT`/`COLD` in any Unit 6 phrase as a result of the above.
- [ ] Capture + retrain Essential Words placeholders: `PLEASE`, `SORRY`, `YES`, `NO`, `HELP`, `GOOD`, `BAD`, `WHAT`, `WHERE`, `WHY`, `WATER`, `FOOD`, `GO`, `COME`, `RESTROOM`, `HUNGRY` — **not started; needs an actual camera capture session + Colab retrain, outside what an AI session can do in chat.**
- [ ] Capture + retrain the 5 phrase placeholders: `NICE TO MEET YOU`, `HOW ARE YOU`, `WHERE IS`, `I AM LEARNING`, `WHAT IS YOUR NAME` — **not started, same reason.**
- [x] **NEW (2026-08-20):** either mark `HELLO`/`THANK YOU` `disabled: true` in `dictionary.js` until real capture/retraining backs them, or explicitly scope a capture session for those two specifically — right now they're silently broken, not just "not yet built." Small code change (add `disabled: true`) is safe for an AI session to make on request; deciding whether to hide them from the UI vs. leave them visible-but-broken is a product call, so left unchanged pending a decision. — **Done 2026-08-20 (later session):** took the "small code change" option — both now carry `disabled: true` in `dictionary.js`, matching the 16 Essential Words' pattern. The "hide from UI vs. leave visible-but-broken" product call was NOT made (still visible in the lesson picker, same as the Essential Words already are) — this only fixed the classifier's failure mode from "silently wrong" to "cleanly no-match."
- [x] **NEW (2026-08-20):** add real (even if `disabled: true`) `SIGN_DICTIONARY` placeholder entries for `HOT`/`COLD` so they at least match the Essential Words pattern, and correct `SYSTEM_ARCHITECTURE.md`'s Unit 5 row to stop claiming `temperature` is trained until they are. Then capture + retrain both, same as the other placeholders above. — **Placeholder entries + doc correction done 2026-08-20 (later session)** — both added to `dictionary.js` with `disabled: true`, `SYSTEM_ARCHITECTURE.md`'s Unit 5 row updated. Capture + retrain still open (needs camera + Colab, same as every other item in this phase).

> **Not part of this pivot, but touched the same files:** a 2026-08-20
> (later) session merged `pages/learn.html`'s trail browsing directly
> into `pages/lesson.html` (a persistent course-outline sidebar), at
> the user's request — a UI/UX change, not curriculum content, so it's
> tracked in `SYSTEM_ARCHITECTURE.md` → **Rev 5** and `AI_MEMORY.md`'s
> matching session log entry instead of as a phase here. `learn.html`
> itself was NOT changed by that session.

---

## Review session (2026-08-20) — bugs found/fixed + new suggestions
> Not part of this pivot either — a real-browser verification pass
> (using actual screenshots) of Rev 5's course-player sidebar, done by
> walking the dashboard→lesson journey as a learner would. Full trace
> for each item is in `AI_MEMORY.md`'s matching Session Log entry.
> `js/auth.js` was excluded from this session at the user's request
> (teammate owns it) — not reviewed, not touched.

**Bugs found and fixed this session:**
- [x] `js/lesson.js` `handlePracticeFrame()` — plain single-sign
  practice showed a false "✅ Nice!" success message (and green
  Detected Sign color) for ANY confidently-classified sign in the
  lesson's category, never actually compared to the sign being taught.
  Fixed: now compares `result.label` against the active `sign`, same
  as assessment mode and phrase-mode practice already do.
- [x] `js/lesson.js` `updateLessonMeta()` — Fingerspell Your Name
  lesson showed a stale "Add image to assets/images/basic/A.png" hint
  (the Letter A default, never overwritten since this drill's
  `signData` is null by design). Fixed: sets an appropriate hint for
  the name drill directly.
- [x] `js/dashboard.js` `renderRecap()` — "Signs You've Learned" chips
  showed each sign twice ("A A", "Y Y", "Z Z"). Fixed: removed the
  redundant `<span>` left over from before `.recap-card__img` was
  redesigned into a self-contained pill.
- [x] `pages/lesson.html` + `js/lesson.js` (4 sites) — the
  "🎥 Start Assessment" button text never matched this file's own Rev 3
  header comment (which always said it should read "🎥 Practice Check
  (optional)") — a pre-existing, already-flagged mismatch, not newly
  found this session, but fixed now since it sits on the exact page
  being reviewed and was already marked "safe, just needs a session."

**New suggestions from the 2026-08-20 review session — ALL 5 now done,
2026-08-21 (this session), at the user's explicit "do this" go-ahead
(including the one item above that had been left as "needs a decision
first" — see AI_MEMORY.md's 2026-08-21 session log for the decision
made and full reasoning on each):**
- [x] `js/lesson.js` `updateConfidenceUI()` — the "Detected Sign"
  readout's green/muted color and the confidence bar's fill are no
  longer driven by raw `result.matched` alone — **done 2026-08-21**:
  now also requires `result.label === getActiveSignId()` (the same
  mode-agnostic "what's expected right now" resolver
  `handlePracticeFrame`/`handleAssessmentFrame`'s phrase branches
  already used) before showing green, in BOTH practice and assessment
  mode — no mode branch needed, since `getActiveSignId()` already
  covers both. A matched-but-wrong guess still shows yellow/muted, same
  as before.
- [x] `pages/dashboard.html` — the welcome banner hardcoded "You're
  making great progress on the ASL Alphabet" regardless of which unit
  the learner is actually on — **done 2026-08-21**: new
  `renderWelcomeBanner()` in `js/dashboard.js` walks the same
  `getOrderedLiveCategories()` chain `renderContinueButton()` already
  uses to find the learner's real current category, maps its unit to a
  friendly phrase, with separate copy for "nothing trained yet,"
  "current unit, not started," "current unit, in progress," and
  "everything trained is passed." `data-user-level`'s own "always says
  Basic" issue (flagged back in Phase 5) is a different field and is
  still open — not touched by this fix.
- [x] Terminology: `learn.js`'s per-category badge said "X/26 viewed"
  while the dashboard's aggregate card said "X/91 signs practiced" —
  **done 2026-08-21**: both `learn.js` badge strings now say
  "practiced," matching the term already used by the underlying
  `practicedCount` variable, `LWProgress.recordSignPracticed()`, and
  the dashboard's own aggregate card.
- [x] Direct URL access to a locked category's `pages/lesson.html`
  (e.g. typing `?level=basic&category=numbers` before Unit 1 is
  passed) wasn't blocked — **done 2026-08-21**: `boot()` now checks
  `isCategoryUnlocked(level, category)` before doing anything else; if
  locked, toasts and redirects to `learn.html?category=X` (which
  already re-checks the same lock itself). Still client-side-only, per
  this item's own original note — no backend to truly enforce it
  either way, this only closes the UI-level gap.
- [x] First-open UX: the camera panel showed two orange/neutral warning
  states ("No hand detected" pill / "Face not detected — step back so
  your whole head is visible" box) immediately on page load, before
  the learner had done anything — **done 2026-08-21**: root-caused to
  `lastFaceSeenAt`/`lastHandSeenAt` being stamped at module-load time,
  before `bootDetectionEngine()`'s own model/camera loading (which
  routinely takes a second-plus) — by the time the render loop's first
  frame ran, both were already stale past their hold thresholds. Fixed
  by stamping both to `Date.now()` immediately before
  `startRenderLoop()` is called, the exact same fix pattern
  `startAssessment()` already had (its own "BUG 11 FIX" comment) for
  the same staleness problem at a different call site.

---

## Explicitly deferred / not in scope for this pivot
- [ ] The 18 `intermediate` phrase categories (~100 sentences, all of Unit 7/Phrasebook including `greetings_intro`) — demoted to a read-only Phrasebook per Rev 4, not a graded unit. **Implemented in Phase 4**: `learn.js` renders these in `isReference` mode — browsable, no assessment CTA, never locked. Revisit only if full-sentence detection becomes realistic later. (Note: this item previously said "17 non-`greetings_intro`" — corrected 2026-08-19, since Phase 1's actual code tags all 18 uniformly as `unit: 7` and none of the 18 have `SIGN_DICTIONARY` entries, per the correction already noted in AI_MEMORY.md §0.)
- [ ] Review/Trainer mode (spaced-repetition-style camera drill) — suggested addition, not required by the adviser. Pick up after Phase 6 if time allows.
- [ ] Optional placement/skip test — suggested addition, same as above.
- [ ] Sign-variation callouts (e.g. "HOW" has two accepted forms) — suggested addition, low priority.
- [ ] `pages/intro-to-asl.html` vs. Unit 0's `UNIT0_CONTENT` screen content overlap — surfaced in Phase 4 (see AI_MEMORY.md §4), not resolved. Needs a real decision (merge one into the other, or keep both cross-linked as Phase 4 left them) but isn't blocking anything.


---

## Dashboard UX Review Checklist — 2026-08-21
> Not part of the Rev 4 curriculum pivot, and no code was changed — a
> learner-perspective UX review of `pages/dashboard.html` (walked
> Dashboard → Learn → Lesson using screenshots), producing this
> checklist as the plan for a future dashboard-only implementation
> session. `js/auth.js` excluded, same as every session since it was
> first excluded. See `AI_MEMORY.md`'s matching 2026-08-21 Session Log
> entry and `SYSTEM_ARCHITECTURE.md`'s matching Dashboard UX Review
> Addendum for the narrative version of the same findings.

> Purpose: learner-first dashboard review and implementation plan.
> Scope: dashboard only.
> Excluded by user request: `js/auth.js`.
>
> Important: This checklist does **not** authorize changes to `data.js`,
> `learn.js`, `progress.js`, or `auth.js`. The current Rev 4/5 state was
> checked first. The dashboard should consume the existing trail/progress APIs
> rather than changing the curriculum model.

---

### 0. Current-state verdict

#### Overall judgment

The dashboard is functional, but it currently behaves more like a **progress report**
than a **learning home page**.

A learner should answer these questions within about 5 seconds:

1. Where am I?
2. What should I do next?
3. How much have I completed?
4. What should I review?
5. What have I already mastered?

The current dashboard answers #3 and #5 reasonably well, partially answers #1,
and is weak on #2 and #4.

#### Main UX direction

Make the dashboard the learner's **home/base**, while `learn.html` remains the
full learning-path browser and `lesson.html` remains the course player.

Do not make the dashboard another copy of the trail.

---

### 1. Priority 0 — Make "Continue Learning" the primary action

- [ ] Make the top of the dashboard visually centered around a **Continue Learning** card.
- [ ] Show the exact current destination:
  - Unit number + Unit title
  - Category
  - Current sign / lesson
  - Example: `Unit 1 · The Alphabet → Letter M`
- [ ] Show progress inside that destination, not only the global 9%.
- [ ] Show one clear primary CTA: `Continue`.
- [ ] Show a secondary CTA only when useful: `Review` / `Open Path`.
- [ ] The first viewport should expose the next learning action without scrolling.
- [ ] Preserve the existing `renderContinueButton()` logic as the source of truth
      for the destination.
- [ ] Do **not** create a second progress/unlock algorithm in the dashboard.

#### Acceptance criteria

A learner who returns to the dashboard can immediately continue from their
real next lesson without opening `learn.html` first.

---

### 2. Priority 0 — Replace the dashboard's current "report" feeling

Current problem:

The screenshot shows `Overall Progress` first, followed by a long stack of unit
rows. This is useful information, but it feels like an admin/status page instead
of a learning home.

- [ ] Move the learner's next action above the aggregate progress card.
- [ ] Keep overall progress, but make it secondary to the next action.
- [ ] Keep the unit list as a compact learning-path summary, not the main feature.
- [ ] Avoid showing the same information at equal visual weight three different ways.

#### Rule

Dashboard = **What should I do now?**

Learn = **Where can I go?**

Lesson = **Teach and practice this thing.**

---

### 3. Priority 0 — Fix the meaning of the 9% progress number

Current implementation calculates the overall percentage from **signs practiced**
rather than assessment mastery.

That is valid as a "practice completion" metric, but the current presentation
can be read as "I am 9% proficient in ASL."

- [ ] Rename the metric explicitly to `Practice Progress` or `Signs Practiced`.
- [ ] Keep `9%` as practice completion if desired.
- [ ] Do not call it mastery.
- [ ] Keep `X / Y category assessments passed` separate.
- [ ] Consider a second metric for mastery:
      `Assessments Passed` / `Categories Passed`.
- [ ] Do not combine practice completion and assessment mastery into one number.

#### Recommended dashboard summary

`9% Practice Progress`

`0 / 8 Assessments Passed`

This makes the difference between **exposure/practice** and **mastery** obvious.

---

### 4. Priority 1 — Turn unit rows into a real learning-path summary

Current screenshot:

Unit rows are visually consistent, but they are mostly just labels such as
`0/1 categories passed`, `Locked`, or `Browse only`.

- [ ] Show a compact progress indicator for each graded unit when useful.
- [ ] Show `practiced / total signs` for the current unit.
- [ ] Show `assessment passed` separately from practice.
- [ ] Make the current unit visually dominant.
- [ ] Keep locked units subdued.
- [ ] Keep Unit 7 clearly labeled as reference/read-only.
- [ ] Avoid adding a full second trail UI here; `learn.html` already owns that.

#### Example information hierarchy

`Unit 1 · The Alphabet`
`8 / 26 signs practiced`
`0 / 1 assessment passed`

This is more useful to the learner than only `0/1 categories passed`.

---

### 5. Priority 1 — Add a "You are here" state

- [ ] Add one unmistakable current-learning label:
      `You are here`
- [ ] Connect it to the same category discovered by the existing
      `renderContinueButton()` / flat progress chain.
- [ ] Show the current Unit and lesson/sign.
- [ ] Do not derive a second "current lesson" algorithm.

#### Why

The dashboard currently makes the learner infer their position from a list of
unit states. A learning product should state the current position directly.

---

### 6. Priority 1 — Add a review/repetition entry point

Current issue:

The dashboard has `Signs You've Learned`, but this is mostly a recap display.
It does not tell the learner what to review.

- [ ] Add a future-ready `Review` section.
- [ ] MVP can be a simple link/button to a review/trainer route once available.
- [ ] Do not implement a new spaced-repetition algorithm in this dashboard task.
- [ ] Do not change `progress.js` for this checklist item.
- [ ] When Review/Trainer mode is implemented later, expose it from the dashboard.

#### Suggested copy

`Review recent signs`

`Refresh the signs you already learned so they stick.`

---

### 7. Priority 1 — Improve "Signs You've Learned"

Current implementation already fixed the duplicate chips.

- [x] Keep the existing duplicate-sign fix.
- [ ] Add a small count:
      `8 signs practiced`
- [ ] Prefer a "recently practiced" interpretation instead of implying mastery.
- [ ] Consider a `View all` link if the list grows.
- [ ] Keep the visual chips lightweight.
- [ ] Do not turn this section into another lesson browser.

#### Important terminology

Use:
- `Practiced`
- `Assessed`
- `Passed`
- `Review`

Avoid using:
- `Mastered` unless an explicit mastery rule exists.

---

### 8. Priority 1 — Fix the "Current Level: Basic" product inconsistency

This is already documented as an open Rev 4 follow-up.

- [ ] Replace `Current Level` with `Current Unit`, OR
- [ ] Remove the field entirely.
- [ ] Prefer `Current Unit` because the application is now a single continuous path.
- [ ] Do not modify `auth.js` to solve this.
- [ ] Do not reintroduce user-selectable levels.

#### Recommended replacement

`Current Unit`

`Unit 1 · The Alphabet`

This aligns the account card with the actual Rev 4 product model.

---

### 9. Priority 1 — Improve first-viewport layout

The provided screenshot is already scrolled into `Overall Progress`, which means
the learner's dashboard content is long enough that key information can disappear
below the first viewport.

- [ ] Put the primary learning action in the first viewport.
- [ ] Reduce vertical duplication between sections.
- [ ] Keep the account card compact.
- [ ] Keep the overall-progress card compact.
- [ ] Avoid making every unit row look like a large standalone card.
- [ ] Keep the page readable at desktop and narrow desktop widths.

#### Visual target

Top of page should feel like:

`Welcome`
↓
`Continue Learning`
↓
`Practice Progress + Assessment Progress`
↓
`Learning Path summary`
↓
`Recent/Practiced Signs`

Not:

`Account`
↓
`Overall Progress`
↓
`Every Unit`
↓
`Signs`

---

### 10. Priority 1 — Reduce dashboard duplication

The same concepts currently appear across:

- Dashboard
- Learn trail
- Lesson sidebar

This is acceptable only if each surface has a different job.

- [ ] Dashboard: summary + next action.
- [ ] Learn: full path navigation.
- [ ] Lesson: course player + current lesson navigation.
- [ ] Keep wording consistent across all three.
- [ ] Do not introduce new dashboard-specific versions of unit ordering.

---

### 11. Priority 2 — Add learning statistics that actually motivate

Optional, but recommended for a Cisco/learning-platform-style feel:

- [ ] `Practice Progress`
- [ ] `Assessments Passed`
- [ ] `Signs Practiced`
- [ ] `Current Unit`
- [ ] Later: `Current streak`
- [ ] Later: `Review due`
- [ ] Later: `Best assessment score`

Do not build all of these at once.

Recommended MVP: only add the first four.

---

### 12. Priority 2 — Add clearer status vocabulary

Use a small controlled vocabulary across dashboard + learn + lesson:

- `Not started`
- `In progress`
- `Practiced`
- `Assessment passed`
- `Locked`
- `Reference`

- [ ] Audit dashboard wording against this vocabulary.
- [ ] Keep `Browse only, no quiz yet` for Unit 7 if desired.
- [ ] Avoid mixing `viewed`, `practiced`, and `learned` when the metric is actually practice.

---

### 13. Priority 2 — Dashboard accessibility and feedback

- [ ] Current/locked/done state must not rely only on border color.
- [ ] Keep text state labels.
- [ ] Ensure CTA labels describe the action.
- [ ] Ensure interactive unit rows have visible focus states.
- [ ] Ensure keyboard navigation reaches `Continue` first.
- [ ] Ensure progress percentages remain understandable without color.

---

### 14. Priority 2 — Responsive behavior

- [ ] Test desktop.
- [ ] Test ~1200px.
- [ ] Test ~900px.
- [ ] Test mobile/narrow width.
- [ ] Ensure account metadata wraps cleanly.
- [ ] Ensure Continue CTA remains obvious when the header wraps.
- [ ] Ensure unit rows remain readable and clickable.
- [ ] Ensure recap chips do not dominate the page.

---

### 15. Priority 2 — Error/loading states

The current JS waits for `LWProgress` readiness.

- [ ] Provide a visible lightweight loading state if progress takes noticeable time.
- [ ] Do not leave a blank unit list with no explanation.
- [ ] Show a safe fallback if progress data is unavailable.
- [ ] Do not make auth handling part of this task.

---

### 16. Current bugs / problems observed during the 2026-08-21 learner review

These are observations, not claims that every one is a confirmed code defect.

- [ ] **Dashboard is too report-like.**
      The screenshot gives priority to the 9% aggregate card and full unit list,
      while the learner's next action is not the dominant element.
- [ ] **Practice percentage is easy to misread as mastery.**
      The code explicitly counts practiced signs, while the page visually presents
      it as a general progress percentage.
- [ ] **Current location is not prominent.**
      The learner must infer where to continue from the unit list / Continue button.
- [ ] **Current Unit is missing from the account summary.**
      `Current Level: Basic` is now conceptually obsolete under Rev 4.
- [ ] **Dashboard repeats the learning path.**
      This is useful as a compact summary, but it should not become a second copy
      of `learn.html`.
- [ ] **No review action is visible.**
      "Signs You've Learned" is retrospective; it does not tell the learner what
      to review next.
- [ ] **Long page / below-the-fold risk.**
      The provided screenshot starts around `Overall Progress`, so the top-level
      learner action can disappear from view depending on scroll position.
- [ ] **Lesson screenshot: missing M image asset/hint.**
      The current screenshot still shows `Add image to ../assets/images/basic/M.png`
      in the lesson's reference-image area. Verify whether the asset actually exists
      before treating this as intentional placeholder UI.
- [ ] **Lesson screenshot: camera warning state needs real-browser verification.**
      The screenshot shows `No hand detected` and `Face not detected` immediately on
      load. The codebase memory says this first-load warning race was fixed, but the
      current screenshot still shows the warning. This needs another real-browser check.
- [ ] **Lesson screenshot: detected C while teaching M is visually confusing.**
      The confidence is yellow rather than green, which is directionally correct,
      but the UI should make "wrong sign" unmistakable.
- [ ] **Alphabet page status is understandable but not very instructional.**
      `8/26 practiced` and `Category Assessment` communicate status, but there is no
      obvious "what to do next" beyond selecting a tile.

---

### 17. Recommended learning-site structure

Use the current Cisco/Lingvano-style course-player direction as inspiration:

`Dashboard`
→ `Continue Learning`
→ `Lesson / Course Player`
→ `Quick Check`
→ `Optional Camera Practice`
→ `Category Assessment`
→ `Next Unit`

And separately:

`Dashboard`
→ `Learning Path`
→ `Learn`
→ choose/review an unlocked unit

And later:

`Dashboard`
→ `Review`
→ previously practiced signs

#### Product principle

The user should never have to ask:

> "Okay... what am I supposed to click now?"

---

### 18. Suggested dashboard wireframe

```text
┌───────────────────────────────────────────────────────────────┐
│ Welcome back, Learner                                         │
│ Unit 1 · The Alphabet                                         │
│                                                               │
│ ┌────────────── CONTINUE LEARNING ──────────────────────────┐ │
│ │ Letter M                                                   │ │
│ │ Learn → Practice → Quick Check                             │ │
│ │ ████████████░░░░░░ 8 / 26 practiced                       │ │
│ │                                                           │ │
│ │                              [ Continue ]                  │ │
│ └───────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌────────────── PROGRESS SNAPSHOT ──────────────────────────┐ │
│ │  9% Practice     0/8 Assessments     8 Signs Practiced     │ │
│ └───────────────────────────────────────────────────────────┘ │
│                                                               │
│ Learning Path                                                 │
│  ✓ Unit 0  Welcome                                           │
│  → Unit 1  The Alphabet       8/26                            │
│  ○ Unit 2  Fingerspell Name   Available                       │
│  🔒 Unit 3  Numbers                                          │
│  ...                                                         │
│                                                               │
│ Recent Signs                      Review                       │
│ [A] [B] [I] [J] [K] [L] ...       [ Review ]                 │
└───────────────────────────────────────────────────────────────┘
```

This is intentionally **not code**. It is the target behavior/layout for the next
implementation session.

---

### 19. Code/data flow to preserve

```text
pages/dashboard.html
        │
        ▼
   js/dashboard.js
        │
        ├──────────────► window.LWProgress
        │                 ├─ getOrderedLiveCategories()
        │                 ├─ getCategoryProgress()
        │                 ├─ isCategoryUnlocked()
        │                 └─ getAllLearnedSigns()
        │
        └──────────────► window.LWData
                          ├─ getUnits()
                          ├─ getCategorySigns()
                          └─ getCategoriesForUnit()

        │
        ▼
    dashboard DOM
        │
        └──────────────► css/dashboard.css
```

#### Do not do this

```text
dashboard
   └─► new unlock algorithm
   └─► new category ordering
   └─► direct changes to progress model
```

The dashboard must consume the existing Rev 4/5 architecture.

---

### 20. Allowed implementation scope for the next dashboard session

#### Preferred files

- [ ] `pages/dashboard.html`
- [ ] `js/dashboard.js`
- [ ] `css/dashboard.css`

#### Explicitly excluded

- [ ] `js/auth.js` — teammate owns this.
- [ ] `js/data.js` — no curriculum change is needed for dashboard UX.
- [ ] `js/learn.js` — learn/trail architecture is already complete.
- [ ] `js/engine/progress.js` — dashboard should consume existing progress APIs.

Only expand this scope if a real blocker is discovered and documented first.

---

### 21. Definition of done

The dashboard redesign is complete when:

- [ ] A learner sees the next action immediately.
- [ ] The current Unit and current lesson/sign are obvious.
- [ ] Practice progress and assessment mastery are visually distinct.
- [ ] The dashboard is a summary, not a duplicate of the Learn trail.
- [ ] `Current Level: Basic` is gone/replaced.
- [ ] A review path is visible or deliberately deferred.
- [ ] The first viewport works without scrolling.
- [ ] Desktop + narrow desktop layouts are tested.
- [ ] Existing Rev 4/Rev 5 progress APIs are reused.
- [ ] `auth.js` is untouched.
- [ ] No curriculum/data/progress model is changed just to improve the dashboard.
- [ ] Real-browser verification is performed after implementation.

---

### 22. Session status

**This session did not implement the dashboard redesign.**

The task was treated as a UX/code-review + checklist session because the user explicitly
said **"don't code"**.

The result of this session is:
- learner-perspective critique,
- screenshot-based bug/UX review,
- code-flow visualization,
- dashboard redesign direction,
- this ready-to-paste checklist,
- memory/architecture update text in companion files.