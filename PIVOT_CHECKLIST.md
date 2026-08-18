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
- [ ] **Open questions answered by Joshua before Phase 1 starts** (see Rev 4 §Open questions):
  - [ ] `localStorage` progress: accept reset on storage-key bump, or write a migration shim?
  - [ ] Unit 0 content: static text, or reuse the `capture.html` YouTube reference-video panel?
  - [ ] Unit 5 sub-category order: show all 12, or only the trained ones (family/places/time/temperature) with the rest `comingSoon`?

## Phase 1 — `data.js` restructure
- [ ] Add top-level `UNITS` array (`{ id, order, title, kind }`)
- [ ] Add `unit` field to every existing `CATEGORIES` entry, matching the Unit Map table in Rev 4
- [ ] Add Unit 0 "Welcome to ASL" content (background + how camera practice works + 1–2 Deaf-culture notes)
- [ ] Promote `sequence_demo` → real Basic Phrases category (keep the mechanism, replace the "(Demo)" framing once Phase 7's phrases exist — can stay as a TODO marker until then)
- [ ] Reorder Unit 5 sub-categories per the answer to the Phase 0 open question above

## Phase 2 — Fingerspell Your Name (interactive drill)
- [ ] New lesson type/page (or extension of `lesson.js`) that reads the learner's name and builds a dynamic `sequence` array from its letters
- [ ] Reuse the existing phrase-chaining pipeline (`sequence`-based `finalizeMotionWindow`/detection flow) — confirm it accepts a runtime-built sequence, not just static `data.js` ones
- [ ] Wire into the Unit 2 slot in the trail (depends on Phase 4's UI, but the drill logic itself doesn't have to wait)

## Phase 3 — `js/engine/progress.js` unlock-chain flattening
- [ ] Replace level→category nesting with a flat walk over `UNITS`
- [ ] Bump storage key `lw_progress_v2` → `lw_progress_v3`
- [ ] Apply the Phase 0 decision on migration shim vs. reset
- [ ] Confirm Unit 0 and the Phase 7 Phrasebook are excluded from the gating logic (no 80% threshold, nothing to unlock behind them)

## Phase 4 — `js/learn.js` trail-view UI
- [ ] Replace the three-tab (`basic`/`medium`/`intermediate`) switcher with a single scrollable trail over `UNITS`
- [ ] Each category renders as a node: locked / current / done
- [ ] Retire `renderBasicCategory()`/`renderCategories()`/`renderWordPicker()`'s three-way split in favor of one generic renderer walking `UNITS` (or confirm they can be reused as-is per-unit — check before rewriting from scratch)
- [ ] `pages/dashboard.html` progress display updated to match the flat model (no more three level cards)

## Phase 5 — Remove signup-time level picker
- [ ] `index.html` — remove "choose your proficiency level" step from the Sign Up form
- [ ] `js/auth.js`'s `register()` — drop the `level` param (or default everyone to the same starting point)
- [ ] Everyone starts at Unit 0 — confirm no page still assumes a user-chosen `level` exists at first login

## Phase 6 — `js/quiz.js` assessment format changes
- [ ] Add non-blocking mini-check after each sign (or small cluster) inside `lesson.html`, reusing the existing Practice Check UI, instead of only checking at category end
- [ ] Add sign-ordering/fingerspelling-challenge question type for Unit 6 (phrase-chaining via camera instead of only 4-option MC)
- [ ] Confirm Camera Check + the new ordering challenge both stay optional/bonus, matching Rev 3's existing "practice, not a gate" reasoning

## Phase 7 — Capture + retrain (content/ML work, not app code)
- [ ] Capture + retrain Essential Words placeholders: `PLEASE`, `SORRY`, `YES`, `NO`, `HELP`, `GOOD`, `BAD`, `WHAT`, `WHERE`, `WHY`, `WATER`, `FOOD`, `GO`, `COME`, `RESTROOM`, `HUNGRY`
- [ ] Capture + retrain the 5 phrase placeholders: `NICE TO MEET YOU`, `HOW ARE YOU`, `WHERE IS`, `I AM LEARNING`, `WHAT IS YOUR NAME`
- [ ] Fix `SIGN_DICTIONARY['6']`/`['9']` → add `detectionType: 'motion'` (pre-existing open item, predates this pivot)
- [ ] Add `SIGN_DICTIONARY['10']` + `data.js` entry (pre-existing open item)
- [ ] Curate 5–8 real Unit 6 phrases built only from words trained by Unit 6 (replacing `CAR_SPELL`/`HOME_WORK_DEMO`)

---

## Explicitly deferred / not in scope for this pivot
- [ ] The 17 non-`greetings_intro` `intermediate` phrase categories (~100 sentences) — demoted to a read-only Phrasebook per Rev 4, not a graded unit. Revisit only if full-sentence detection becomes realistic later.
- [ ] Review/Trainer mode (spaced-repetition-style camera drill) — suggested addition, not required by the adviser. Pick up after Phase 6 if time allows.
- [ ] Optional placement/skip test — suggested addition, same as above.
- [ ] Sign-variation callouts (e.g. "HOW" has two accepted forms) — suggested addition, low priority.
