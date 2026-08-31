# AI_MEMORY.md — Read this first

> **For any AI assistant working on this repo:** read this file, then
> `PIVOT_CHECKLIST.md` (done/not-done tracker), then `SYSTEM_ARCHITECTURE.md`
> → **Rev 7** (the current plan — supersedes Rev 4/5/6, all archived in
> that file's own history) before touching `data.js`, `learn.js`,
> `dashboard.js`, `progress.js`, or `auth.js`.
>
> **`js/auth.js` is explicitly out of scope — Omen's teammate owns it.**
> Don't open, audit, or suggest edits to it unless explicitly asked.
>
> **After a session**, add ONE line to the Session Log at the bottom:
> `date — what changed — files touched`. If something's still open,
> say so in a few words. This is a changelog, not a transcript — full
> reasoning belongs in your own PR/commit message, not here. **These
> three docs get pasted into chat via repomix — every line costs
> tokens. Keep entries terse.**

---

## 0c. Homepage pivot (2026-08-26)

**Unit 0 ("Welcome to ASL: A Brief History") is no longer a curriculum
unit.** The authenticated flow is now `Login/Register → pages/homepage.html
→ Dashboard or Learn`, not straight to Dashboard. Unit 0's `UNITS` entry
(`order:0`, `kind:'info'`) is REMOVED from `data.js`; its content
(former `UNIT0_CONTENT`, also removed from `data.js`) now lives as
static markup in the new `pages/homepage.html`. Alphabet/Fingerspell/
Numbers unchanged at `order` 1/2/3 — not renumbered, the gap at 0 is
intentional. `js/engine/progress.js`/`js/auth.js` **not modified** —
both inspected, confirmed unnecessary to touch (progress.js already
only walked `kind:'category-group'` units; auth.js's `login()`/
`register()`/`redirectIfLoggedIn()` already took a destination
argument, so only the 3 destination strings in `index.html` changed).
Full writeup: `SYSTEM_ARCHITECTURE.md` → "Homepage (2026-08-26 pivot)";
`PIVOT_CHECKLIST.md` → "Homepage pivot" for the regression-check detail.

## 0a. Teaching-rhythm pass (Rev 8 in SYSTEM_ARCHITECTURE.md — 2026-08-25)

**Additive, not a curriculum change** — Rev 7's 72-unit structure
(§0 below) is completely unaffected; nothing about unit/category
ordering, ids, or unlocks changed this session. Rev 8 tightened
`pages/lesson.html`'s existing per-sign teaching loop (image →
description → video → Quick Check → optional camera → Prev/Next) to
match a requested reference teaching rhythm — same page, same
mechanism, just a smaller Quick Check cluster size and one new recall
question format. `js/data.js`/`js/learn.js`/`js/engine/progress.js`/
`js/auth.js` were **not modified** — read for context, confirmed
unnecessary to touch. Full writeup: `SYSTEM_ARCHITECTURE.md` →
"Rev 8"; `PIVOT_CHECKLIST.md` → "Rev 8" for the checklist/verification
detail.

**Personalization removed 2026-08-26** — Rev 8 originally also shipped
a "light personalization" card (2 optional questions, localStorage
only); it was removed wholesale per explicit request and is gone from
the app entirely — not relocated to the Dashboard, not replaced with
any other onboarding/preference system. See the 2026-08-26 session log
entry below, `REV8_TEACHING_AUDIT.md` → "Current decision," and
`Rev8_Personalization_Feature_Checklist.md` (now REMOVED/CANCELLED)
for full detail. The rest of Rev 8 (Quick Check changes, above) is
still live and unaffected.

## 0. Curriculum pivot status (Rev 7 in SYSTEM_ARCHITECTURE.md — supersedes Rev 4/5/6)

**Rev 7 (2026-08-24) replaced the entire Unit Map with Omen's uploaded
curriculum ("updated fixed lesson.txt") — 72 units now, not 11.** Read
`SYSTEM_ARCHITECTURE.md`'s Rev 7 section and its full 72-row Unit Map
before assuming any unit number from an older mental model of this app
(Rev 6's Unit 4 ≠ Rev 7's Unit 4 — almost every unit's content and
number changed). Short version: `data.js`'s `UNITS`/`CATEGORIES` arrays
were rewritten wholesale to implement the uploaded 68-topic vocabulary
list in the order given, one topic = one unit, with the pre-existing
Rev 6 mechanisms kept where the new list didn't cover them (Fingerspell
Your Name gate at Unit 2, Basic Phrases + Phrasebook moved to the very
end, Units 70/71). Every category id that had **real** SIGNS/
dictionary.js content (`alphabet`, `numbers`, `family`, `places`,
`time`, `temperature`, `requests`, `essentials_greetings`,
`essentials_basic_responses`, `essentials_polite_expressions`,
`sequence_demo`, `health`, `amounts`, `money`, the 18 Phrasebook
categories) kept its id and its SIGNS/dictionary.js entries byte-
identical — only `unit`/`title`/`words[]` changed. **`dictionary.js`
and `classifier.js` were NOT touched this session** — zero detection-
routing risk. `SIGNS`/`QUESTIONS`/`UNIT0_CONTENT`/every helper function
in `data.js` are also unchanged. See `PIVOT_CHECKLIST.md` → "Rev 7" for
the full mapping table, every id/placement decision, and open flags.

**Phase 7 (real camera capture + model retraining) is still the only
work that actually unlocks detection**, and is now a much bigger list
than before — see `PIVOT_CHECKLIST.md` → Phase 7. The new Unit Map
doesn't change what's trained today: still just `alphabet`/`family`/
`places`/`time`/`sequence_demo` (Units 1, 22, 48, 53, 70), plus
Fingerspell Your Name (Unit 2, reuses the alphabet model). Everything
else — all 66 new-plan topics plus `numbers`/`temperature`/`requests`/
`essentials_*` — is unchanged in detection status, just moved/retitled.

One-line model of the product: LinguaWave is **one linear "Basic ASL"
path** (no user-picked level tiers) — background → letters → your name
fingerspelled (now gated) → numbers → essentials → greetings → basic
responses → polite expressions → thematic vocab → phrases →
(future) conversations. `level`/`category` internal field names in
`data.js`/`dictionary.js` are unchanged (legacy grouping keys) — the
`UNITS` array + each category's `unit` field is what actually drives
ordering now. Full rationale: `SYSTEM_ARCHITECTURE.md` → Rev 4 (base
model) + Rev 6 (this reorder).

**Two decisions made unilaterally by AI sessions, not pre-approved by
Joshua — worth a nod of confirmation:**
- Phase 4 reintroduced real per-category locking in the trail (reverses
  an old Rev 3 "never lock categories" decision).
- Phase 6 retired the "Take Level Final Assessment" CTA (mechanism
  still works via `quiz.html?final=1`, just isn't offered anymore).

**⚠️ `js/engine/progress.js`'s `isCategoryUnlocked()` currently always
returns `true`** — `DEBUG_UNLOCK_ALL` near the top of that IIFE is
`true`. Intentional, at Joshua's request, while he tests. **Flip it back
to `false` before any deploy** — he said he'll do this himself once done
testing, not an AI action item.

## 1. What this project is

LinguaWave — browser-based ASL learning app. Static HTML/CSS/JS, no
build step, no framework. Auth is Firebase but currently real (not
bypass — see `SYSTEM_ARCHITECTURE.md` §6). Real-time sign detection
runs client-side via MediaPipe (hand+face landmarks) + two TF.js models.

**Content source: Joshua uses ASLU (ASL University, Dr. Bill Vicars) for
lesson/category content.** Relevant for any future content-writing
session — e.g. `PIVOT_CHECKLIST.md`'s still-open literal Days-of-the-Week
content — check ASLU's own treatment of a topic before drafting new
`data.js` copy, for consistency with what's already in the app. (ASL
History for Unit 0 — the other item that used to be listed here — was
written and ASLU-checked 2026-08-23, see Session Log.)

`README.md` is stale (describes an old "no gesture recognition" pitch).
Trust `SYSTEM_ARCHITECTURE.md` over it for anything about how detection/
assessment/progress work today.

## 2. Core architecture, in one pass

- **`js/data.js`** — all lesson content: `UNITS` (order/kind), `CATEGORIES`
  (level+unit+category metadata), `SIGNS` (per-sign content). The file a
  non-engineer edits to add content. `window.LWData` exposes `getSign`,
  `getCategorySigns`, `getCategoriesForLevel`, `getCategoriesForUnit`,
  `getUnits`, `getCategory`.
- **`js/engine/dictionary.js`** — `SIGN_DICTIONARY`: one entry per
  detectable signId (`{ fingerStates, description, category,
  detectionType?, disabled? }`). `detectionType` defaults to `'static'`
  — only set `'motion'` explicitly. `disabled: true` marks a sign that's
  in the UI but has no trained model data yet (clean "no-match" instead
  of a silent wrong-classifier fallback). **`fingerStates`/`tiebreakers`/
  `tbWeight` are dead — not read by any matching code**, don't hand-tune.
- **`js/engine/classifier.js`** — loads `asl_static_model/` /
  `asl_motion_model/` dynamically off `labels.json`. Adding a class is a
  **data-only change** (swap `labels.json`+`model.json`+`.bin`) as long
  as label strings exactly match `SIGN_DICTIONARY` keys — mismatches
  silently become "no match," not an error.
- Two models by movement: `asl_static_model` (single frame) vs
  `asl_motion_model` (40-frame LSTM-ish sequence). A sign's
  `detectionType` picks which one.
- `classifyGesture`/`classifyMotion` take an optional `allowedLabels`
  (`Set|null`, via `getAllowedLabelsForSign(signId)`) that restricts
  softmax candidates to the active lesson's category **before** argmax
  — prevents e.g. a correctly-signed `6` losing to `W` on a near-tie.
  Depends on every dictionary entry having a correct `category`; a
  missing one silently falls back to unrestricted matching.
- **`js/learn.js`** — trail UI (`pages/learn.html`) over
  `getUnits()`, locked/current/done nodes, unit-scoped not level-scoped.
  A unit with >1 category shows a category-list screen
  (`renderUnitCategoryList`/`renderCategoryCard`); a unit with exactly 1
  skips straight to it. `learn.js?category=X`/`?unit=X` deep links
  re-check the lock and bounce to the trail root if locked/comingSoon.
- **`js/dashboard.js`** — one aggregate progress card + one row per unit
  (`getOrderedLiveCategories()` + `getUnits()`).
- **`js/lesson.js`** (Rev 5) — also renders a persistent course-outline
  sidebar (`renderCourseSidebar()`), same lock/progress calls as
  `learn.js`/`dashboard.js` so the three surfaces can't disagree.
- Category field on a `SIGNS` entry **must be set explicitly** beyond the
  alphabet — the `data.js` auto-backfill only defaults unset `basic`
  entries to `'alphabet'`.

## 3. Established conventions

- **Comment tags**: `NEW`/`CHANGED`/`BUGFIX`/`REV N`/`BUG N FIX`, each
  with a one-line "why" above the code. `grep -rn "CHANGED\|BUGFIX\|NEW —"`
  to see the in-code history.
- **Data-driven over hardcoded**: extend `data.js`/`dictionary.js` before
  adding `if (category === 'x')` branches. Where a lookup table is
  unavoidable (`BASIC_LABEL_PREFIX`, `FLAT_GRID_CATEGORIES` in
  `learn.js`), keep it a one-line-per-category table.
- **Single-char signId ≠ "is a letter."** `sign.length === 1` broke once
  Numbers (`'0'`–`'9'`) shipped. Branch on `category`. A new short-signId
  flat-grid category needs an entry in `learn.js`'s
  `BASIC_LABEL_PREFIX`/`FLAT_GRID_CATEGORIES` and `lesson.js`'s
  `singleCharPrefix`.
- **Gated interactive units** (NEW, Rev 6): a `kind:'interactive'` UNITS
  entry with no CATEGORIES entry of its own (e.g. `fingerspell_name`)
  can still block later units — tag it `gated: true` in `data.js`,
  record a pass via `LWProgress.recordUnitAssessment(unitId, result)`
  wherever that unit's own logic decides "passed" (see `lesson.js`'s
  phrase-complete handler), and `isCategoryUnlocked()` picks it up
  automatically via `gatesClearedBefore()` — no per-unit special-casing
  needed elsewhere. See `SYSTEM_ARCHITECTURE.md` Rev 6.

## 4. Open threads / known gaps

- **Phase 7 content capture is the only real remaining work** — see
  `PIVOT_CHECKLIST.md`. Everything below is smaller.
- Motion model has no "background/not a sign" class — noise can get
  confidently misclassified (`classifier.js`, search `MATCH_THRESHOLD`).
- `food`/`clothes`/`health`/`feelings`/`colors`/`money`/`animals`/
  `amounts` (Unit 5 extras) and all 18 Unit 7 Phrasebook categories have
  `data.js` content but **zero `SIGN_DICTIONARY` entries** — by design
  (comingSoon / read-only reference), not a bug to silently fix.
- `pages/intro-to-asl.html` and Unit 0's `UNIT0_CONTENT` screen overlap
  (cross-linked, not merged) — needs a product decision, not blocking.
- `assets/images/basic/M.png` (and the rest of the number/letter set):
  can't verify from a text-only repo export whether the file exists on
  disk — the placeholder/fallback mechanism itself is correct either way.
  Needs a human filesystem check.
- Alphabet category page (`learn.js`) has no "what to do next" nudge
  beyond the tile grid — flagged, needs a `learn.js`-scoped session.

## 5. Model / label reference (keep in sync when models change)

| Model | Folder | Classes today | Feature vector |
|---|---|---|---|
| Static | `asl_static_model/` | A–Y minus J,Z (25, incl. `NONE`) | 130-wide |
| Motion | `asl_motion_model/` | J, Z, ~30 words (33, incl. `NONE`) | 40 frames × 130 |

Both Keras-3-exported, loaded via `classifier.js`'s
`loadKeras3CompatModel` (patches `DTypePolicy`/`InputLayer` quirks) —
don't simplify without checking it still round-trips a fresh export.

---

## Session Log

> Compressed 2026-08-22 — 33 verbose entries rolled into this table.
> Full session-by-session reasoning existed only to justify decisions
> that are now just facts in §0–§4 above and in `PIVOT_CHECKLIST.md`'s
> checkboxes; nothing here should contradict those two sources. Going
> forward, one line per session — expand only if a decision needs
> real justification for a future reader.

| Date | Session | Files touched |
|---|---|---|
| 08-17 | Numbers (0–9) category added to Basic | `data.js`, `dictionary.js`, `lesson.js`, `learn.js` |
| 08-17 | Time category + SCHOOL wired to motion model | `dictionary.js` |
| 08-17 | `10` moved static→motion; category-scoped detection (`allowedLabels`) added, fixing a live `6`-losing-to-`W` scoring bug | `capture.html`, `classifier.js`, `quiz.js`, `lesson.js` |
| 08-17 | Adviser-directed pivot: deep planning session, no code | `AI_MEMORY.md`, `SYSTEM_ARCHITECTURE.md` (Rev 4 added) |
| 08-18 | Pivot Phase 1 — `data.js` restructure (`UNITS`, `unit` field, Unit 0 content, Unit 5 comingSoon split) | `data.js` |
| 08-18 | Pivot Phase 2 — Fingerspell Your Name drill | `lesson.js` |
| 08-18 | Pivot Phase 3 — `progress.js` unlock-chain flattened, storage key → `lw_progress_v3` (no migration shim, reset accepted) | `progress.js` |
| 08-19 | Pivot Phase 4 — `learn.js`/`dashboard.js` trail-view UI; reintroduced real category locking (flagged) | `learn.js`, `dashboard.js`, css |
| 08-19 | Pivot Phase 5 — signup-time level picker removed | `index.html`, `auth.js` |
| 08-20 | Pivot Phase 6 — Quick Check mini-questions, Unit 6 ordering/fingerspell camera round, Level Final CTA retired (mechanism kept, flagged) | `quiz.js`, `lesson.js` |
| 08-20 | Phase 7 partial — 6/9/10 routing confirmed, 6 real Unit 6 phrases curated, HELLO/THANK YOU + HOT/COLD found broken and marked `disabled: true` | `data.js`, `dictionary.js` |
| 08-20 | Rev 5 — `learn.html` trail sidebar merged into `lesson.html` (course player) | `lesson.html`, `lesson.css`, `lesson.js` |
| 08-20 | Real-browser review via screenshots — 4 bugs found/fixed (false "Nice!" in practice mode, stale name-drill image hint, duplicated recap text, stale button label) | `lesson.js`, `dashboard.js`, `lesson.html` |
| 08-21 | Cleared all 4 review-session items + `updateConfidenceUI()` color-correctness decision (5 fixes) | `lesson.js`, `dashboard.js` |
| 08-21 | Dashboard UX review from learner perspective — no code, produced the Priority 0–2 checklist in `PIVOT_CHECKLIST.md` | — |
| 08-21 | Dashboard Priority 0 #1–#3 implemented (Continue Learning hero, de-report-ified layout, practice-vs-mastery relabel) | `dashboard.html/js/css` |
| 08-21 | Dashboard Priority 1 §4–§9 implemented (unit-row summaries, "you are here," review entry point, recap fix, Current Unit field, first-viewport compaction) + a critical §4 regression fix; `DEBUG_UNLOCK_ALL` added at Joshua's request | `dashboard.html/js/css` |
| 08-22 | Dashboard Priority 1 §10 — dedup audit vs. `learn.js`/`lesson.js` (read-only), wording alignment | `dashboard.html/js/css` |
| 08-22 | Dashboard Priority 2 §11–§15 implemented (stats tiles, status vocabulary, accessibility, responsive, error/loading states) | `dashboard.html/js/css` |
| 08-22 | §16 learner-review audit — 6 items already resolved, 2 real bugs fixed (camera warm-up grace window, explicit "C — not M" wrong-match text), 1 unverifiable (M.png), 1 deferred (Alphabet nudge) | `lesson.js` |
| 08-22 | §17 audit — Review entry point upgraded from 1 to 3 recent signs | `dashboard.html/js/css` |
| 08-22 | §18 wireframe audit — already fully implemented, no code change; §21 Definition-of-Done reconciled (9/12 checked); Joshua confirmed real-browser resize check | `PIVOT_CHECKLIST.md`, `SYSTEM_ARCHITECTURE.md` |
| 08-22 | **Docs compression** — `AI_MEMORY.md`/`PIVOT_CHECKLIST.md`/`SYSTEM_ARCHITECTURE.md` rewritten to cut repomix token cost; no app code touched. See each file's own top note. | `AI_MEMORY.md`, `PIVOT_CHECKLIST.md`, `SYSTEM_ARCHITECTURE.md` |
| 08-22 (later) | Screenshot review (dashboard/learn/learn?category=numbers) — 4 UI bugs flagged, none fixed; logged Omen's proposed Unit reorder (ASL History→Letters→Fingerspell-as-assessment→Numbers→Everyday Essentials→Greetings→Basic Responses→Polite Expressions→Days of the Week→rest) as a plan, not yet implemented — needs a sign-to-category mapping decision first. No app code touched. | `PIVOT_CHECKLIST.md` |
| 08-22 (later, follow-up) | Confirmed + fixed 3 of the 4 flagged screenshot-review bugs: trail now has a single 'current' unit instead of marking every unlocked-incomplete unit current (`findCurrentUnitId()`, new); "← Back to Trail"→"← Back to Learning Path" everywhere; dashboard Continue/unit-row next-action now detects "fully practiced, not yet assessed" and routes to `quiz.html` instead of `signs[0]` (`readyForAssessment` flag, new). 4th (undocumented "Open Unit N Path" button) was real/working, just undocumented — added to `SYSTEM_ARCHITECTURE.md`. Not re-verified in a real browser. | `js/learn.js`, `js/dashboard.js`, `SYSTEM_ARCHITECTURE.md`, `PIVOT_CHECKLIST.md` |
| 08-23 | Audited Omen's proposed reorder before touching anything: found `PIVOT_CHECKLIST.md`'s "16 Essential Words = one Unit 4 bucket" assumption was wrong (actually spans Unit 4 `requests` + Unit 5 `feelings`/`food`/`places`, 5 signIds with zero `data.js` content); drafted a corrected 4-category mapping as an unconfirmed proposal, not implemented; flagged a real `basic_responses`/`polite_expressions` category-id collision with existing Unit 7 Phrasebook categories. Fixed 2 small bugs found along the way (5 missing `dictionary.js` disabled placeholders for `requests`-category signs; a stale `data.js` comment claiming `COME`/`GO` are trained when both are `disabled: true`). No `learn.js`/`progress.js`/`auth.js` touched; `data.js` touched for one comment only, no logic/data change. | `js/engine/dictionary.js`, `js/data.js` (comment only), `AI_MEMORY.md`, `PIVOT_CHECKLIST.md`, `SYSTEM_ARCHITECTURE.md` |
| 08-23 (later, follow-up — "Rev 6") | Mapping + Fingerspell-as-assessment both confirmed by Joshua/Omen via chat, then implemented same session. `data.js`: inserted 3 units (order 5/6/7), bumped 31 downstream `CATEGORIES` entries' `unit` field to match (5/6/7→8/9/10 — categories link by numeric order, not id, this was the main risk area); narrowed `requests`→"Everyday Essentials"; wrote new content for `HELLO`/`YES`/`NO`/`FOOD` (previously zero); found `RESTROOM` (Phase 7 tracking) and pre-existing `BATHROOM` entry are the same physical sign — merged instead of duplicating, renamed `dictionary.js`'s key to match. `progress.js`: added `gated` flag support (`getOrderedGates`/`gatesClearedBefore`/`recordUnitAssessment`/`getUnitAssessment`, new `unitAssessments` store map) so Fingerspell Your Name can block Numbers onward without being a CATEGORIES entry itself — data-driven via `UNITS[].gated`, not hardcoded by unit id. `lesson.js`: records a pass when the name-drill phrase sequence completes (drill's existing forgiving retry-on-mistake behavior means completion = pass, no separate strict mode built). `learn.js`: Fingerspell's unit-card label no longer hardcodes "always open" regardless of state. Verified in Node only (no browser): `data.js` parses clean, `UNITS` order contiguous 0–10, every touched category resolves to intended signIds, zero duplicate ids, gate-clearing logic unit-tested standalone. **Not done:** ASL History (Unit 0) and Days-of-the-Week content — both need new copywriting, flagged not attempted. | `js/data.js`, `js/engine/dictionary.js`, `js/engine/progress.js`, `js/lesson.js`, `js/learn.js`, `AI_MEMORY.md`, `PIVOT_CHECKLIST.md`, `SYSTEM_ARCHITECTURE.md` |
| 08-23 (later, third session) | Analysis-only, no code: (1) full-repo code-read bug audit, phased in `PIVOT_CHECKLIST.md` so future sessions can paste one phase at a time — headline finding: digits `0,1,2,3,4,5,7,8` (not just `6,9,10`) have zero classes in `asl_static_model/labels.json`, so they can never be detected today, contradicting the Unit Map's "static 0–9 trained" line (now flagged wrong, not yet corrected — see Phase A). Also reconciled a second, previously un-merged audit file (`CLAUDE_TASKS.md`) against current code — several of its claims were already fixed, one was never actually broken (learn.js's legacy `?level=` link), a few are still genuinely open. (2) Design gap logged, not implemented: `learn.html`/back-to-trail/category views (and `lesson.html`'s sidebar) never got the Dashboard Priority 2 UX-pass polish (skip link, focus-visible states, loading shimmer, error fallback) — see `PIVOT_CHECKLIST.md`'s new "Design pass" section. (3) Noted ASLU (Dr. Bill Vicars) as the content reference source (§1 above), relevant to the still-open ASL History / Days-of-the-Week content items. | `AI_MEMORY.md`, `PIVOT_CHECKLIST.md` |
| 08-23 (later, fourth session) | Implemented the "Design pass" item the previous session had only logged: `learn.html`+`lesson.html` now have a skip link, `:focus-visible` rings on every card/sidebar row, a loading-state placeholder, and a real error fallback (`js/learn.js`'s `showLearnUnavailable()`, `js/lesson.js`'s `showSidebarUnavailable()` inside `renderCourseSidebar()`) — matching dashboard.html's Priority 2 UX pass, narrower on purpose (only `window.LWData` treated as a hard requirement; every `LWProgress` call in both files already degrades gracefully via `?.`). `.skip-link`/`.loading-pulse` made reusable via a new `css/style.css` §16 (additive — `dashboard.css`'s own copies untouched, zero regression risk to that page). Verified Node-only this session (`node --check` both `.js` files, brace-balance on all 3 `.css` files, HTML-parse pass on both `.html` files) — **not yet checked in a real browser** (keyboard tab order, screen reader). `quiz.html`/`quiz.css` has the identical gap, still out of scope (not named in the request). | `css/style.css`, `css/learn.css`, `css/lesson.css`, `pages/learn.html`, `pages/lesson.html`, `js/learn.js`, `js/lesson.js`, `PIVOT_CHECKLIST.md`, `SYSTEM_ARCHITECTURE.md`, `AI_MEMORY.md` |
| 08-23 (later, fifth session) | Phase A closed out (doc-only, no app code touched): merged Phase 7's split `6/9/10` + `0,1,2,3,4,5,7,8` digit items into one; corrected Phase A's own stale "decide static vs. motion" framing — `dictionary.js`'s 2026-08-20 comment already settled it, nothing was open; traced `classifyGesture()`'s `allowedLabels` restriction to confirm untrained digits already fail cleanly (no wrong-letter readout), not just structurally-always-false; updated this file's §0 digit count. Camera capture itself is still open (Phase 7, needs a human). | `AI_MEMORY.md`, `PIVOT_CHECKLIST.md` |
| 08-23 (later, sixth session) | Phase C closed out, all 3 items fixed: `quiz.js` gained a `visibilitychange` handler (mirrors `lesson.js`'s existing pattern — camera no longer stays live if a learner tabs away mid camera-round); `cameraUtils.js`'s `startCamera()` now guards a missing/null `videoElement`/`canvasElement` with a normal `showCameraError()` + throw instead of a raw TypeError; `classifier.js`'s `classifyGesture()`/`runMotionInference()` input tensors now dispose in a `finally` so a mid-inference throw can't leak them in WebGL memory. `auth.js`/Phase B explicitly left alone this session (teammate's, per request). Node-only verification (`node --check` × 3), not browser-tested. | `js/quiz.js`, `js/camera/cameraUtils.js`, `js/engine/classifier.js`, `AI_MEMORY.md`, `PIVOT_CHECKLIST.md` |
| 08-23 (later, seventh session) | Extended the "Design pass" (fourth session, above) to `quiz.html`/`quiz.css`, the one page it had left out: skip link (`#question-card`), `:focus-visible` ring on `.quiz-option`, `.loading-pulse` on the static "Loading…" text, and a real error fallback (new `js/quiz.js` `showQuizUnavailable()` + a `!window.LWData` guard + try/catch in `boot()` — previously a missing `LWData` silently showed the wrong message, `showEmptyState()`'s "no trained content yet," instead of a load error). Reused `css/style.css` §16's `.skip-link`/`.loading-pulse` as instructed, no duplication. Found and fixed one pre-existing bug along the way, unrelated to the design pass: `quiz.js`'s DOMContentLoaded bootstrap was the two-line form that double-calls `boot()` in the normal case (unlike `lesson.js`'s already-fixed "BUG 3" version of the same idiom) — switched to `lesson.js`'s mutually-exclusive if/else form. `window.LWProgress` calls inside `buildActionButtons()` (post-assessment, outside boot-time scope) still lack `?.` guards — flagged, not fixed. `auth.js` untouched, per request. Node-only verification (`node --check` on `quiz.js`, brace-balance on `quiz.css`/`style.css`, HTML-parse on `quiz.html`) — not browser-tested. | `pages/quiz.html`, `css/quiz.css`, `js/quiz.js`, `AI_MEMORY.md`, `PIVOT_CHECKLIST.md`, `SYSTEM_ARCHITECTURE.md` |
| 08-23 (later, eighth session) | ASL History content pass for Unit 0 (`PIVOT_CHECKLIST.md` → "Unit reorder" item 1, `SYSTEM_ARCHITECTURE.md` Rev 6 Unit Map row 0). Unit 0 previously had zero history content despite the title implying it — replaced that gap with a new `brief_history` section in `UNIT0_CONTENT` (Gallaudet/Clerc/Cogswell, American School for the Deaf, 1817, Hartford CT, Martha's Vineyard Sign Language's contribution), fact-checked against ASLU/lifeprint.com (Dr. Bill Vicars' own "evolution of sign language" page and the Martha's Vineyard topic page) per §1's standing instruction, original wording throughout (no text lifted). Kept short and deliberately non-duplicative of `intro-to-asl.html`'s own fuller "A short history" section, which it still links out to — that page/Unit-0 overlap remains an open, un-resolved product decision (unchanged this session). Retitled the unit `'Welcome to ASL'` → `'Welcome to ASL: A Brief History'` (content-only — confirmed nothing keys off the literal title string or off `unit.id`, both unchanged) — flagged as a call made without a separate confirmation, same spirit as the two unilateral decisions already logged in §0. `auth.js` untouched, excluded per this session's request (teammate's, unchanged from every prior session). Verified in Node: `node --check data.js` clean, and the edited file evaluated in a sandboxed VM context to confirm `UNIT0_CONTENT` has 5 unique-id sections and `UNITS` order is still a contiguous, unique 0–10 — not browser-tested. | `js/data.js`, `AI_MEMORY.md`, `PIVOT_CHECKLIST.md`, `SYSTEM_ARCHITECTURE.md` |
| 08-25 (Rev 8) | Rev 7 content-capture queue, Actions/Hand Actions/Communication (Units 9–11): flipped all 3 to `comingSoon:false` with full ASLU-checked (lifeprint.com) `data.js` SIGNS content for every `words[]` entry (23 + 11 + 7 = 41 new signs written this session, plus 6 relocated). Resolved the standing `people` (Unit 6) `I`/`HE`/`SHE` flag — dropped from `words[]` per the decision the comment itself already documented (ME covers I; HE/SHE aren't a distinct handshape). Found and fixed 6 orphaned SIGNS entries left over from earlier sessions — `GO`/`COME`/`STOP` (`requests`), `DRINK` (`food`), `SLEEP` (`health`), `CRY` (`feelings`) — each had real content under a `category` field their own category's `words[]` never actually claimed (confirmed via a scripted cross-check before moving anything, same discipline as the Rev 7 orphan-reference check); relocated all 6 to `actions` instead of duplicating. `health`'s `NICE/CLEAN` renamed to `CLEAN` and relocated the same way (same physical sign, reused rather than invented a second entry — same precedent as the existing `BATHROOM`/`RESTROOM` merge). `communication`'s `words[]` had `HELP`, which is already live under `requests` (Needs) — dropped instead of duplicated. Added 45 matching `disabled:true` `dictionary.js` placeholders (same parity pattern as the HELLO/HOT-COLD/16-Essential-Words fixes) — the task's own scoping analysis said not to touch `dictionary.js` for content-only work, but this repo's established convention (multiple prior sessions, see 08-23 above) treats a SIGNS entry with no matching dictionary.js key as a bug, not neutral, so added them anyway; flagged the disagreement rather than silently picking one. Populated the previously-dead `referenceUrl` field (wired up in `lesson.js`, never used by any entry before now) for the 16 signs I directly confirmed a lifeprint.com URL for via search; left it unset for the rest rather than guess a URL. **Found, not fixed (out of scope — Units 9-11 only):** `classroom_actions` (Unit 31, School group) is also `comingSoon:false` with zero real signs, `words[]` overlapping this session's new content (READ/WRITE/DRAW/LISTEN/LOOK/SIT/STAND/ASK/ANSWER/SHARE/HELP) — same bug class as what this session fixed, needs its own pass. Verified in Node only: `node --check` on both files, and a sandboxed VM eval of the full `data.js` confirming zero duplicate `(level, signId)` pairs, all 3 categories' `words[]` exactly match their real SIGNS coverage (no missing, no extra), and every relocated signId's `getSign()` now resolves to `category:'actions'` — not browser-tested. | `js/data.js`, `js/engine/dictionary.js`, `AI_MEMORY.md`, `PIVOT_CHECKLIST.md` |
| 08-24 (Rev 7 pivot) | Implemented Omen's uploaded "updated fixed lesson.txt" as the new curriculum: `data.js`'s `UNITS`/`CATEGORIES` rewritten from 11→72 units, one topic per unit, exact source order (background→Alphabet→Fingerspell[kept]→Numbers→...→Answers→Basic Phrases[kept]→Phrasebook[kept]). Every category id with real SIGNS/dictionary.js content kept its id/content byte-identical, only unit/title/words[] moved — `dictionary.js`/`classifier.js` untouched, zero detection-routing risk (verified: no orphaned SIGNS category refs, no invalid unit refs, UNITS order contiguous 0–71, all ids unique — sandboxed VM check on the full file). Found and fixed 3 real bugs along the way: (1) `health`/`amounts`/`money` — legacy categories with real authored SIGNS content but comingSoon:true — were about to be silently dropped since the new plan doesn't mention them; caught by the orphan-check, restored as secondary categories under the closest-fit new unit (Dressing/Size/Personal Items) instead of deleted. (2) `UNIT_ICONS` in `learn.js`/`lesson.js`/`dashboard.js` and `CATEGORY_ICONS` in `learn.js`/`lesson.js` only had entries for the old Rev 6 ids — every one of the 66 new units/categories would have silently rendered the generic fallback icon; extended all icon maps to cover the new ids (cosmetic-only, additive, no logic touched). (3) two source-list topics are both "Requests"-flavored (topic 7 "Needs" vs. literal topic 67 "Requests") — kept as two separate categories (`requests` vs. new `making_requests`) rather than merged, matching the source file's own structure; flagged the near-collision. Also flagged, not fixed: `money` has no good conceptual home in the new 68-topic list at all (parked under Personal Items); several now-legacy categories' `words[]` preview is considerably broader than their real trained/placeholder SIGNS set (pre-existing pattern, just wider now — see PIVOT_CHECKLIST.md); Phase 7's capture priority list doesn't yet reflect the new unit order. `auth.js` untouched, per scope. Verified: `node --check` on `data.js`/`learn.js`/`lesson.js`/`dashboard.js`, full structural validation via a sandboxed VM eval (see above) — not browser-tested. | `js/data.js`, `js/learn.js`, `js/lesson.js`, `js/dashboard.js`, `AI_MEMORY.md`, `PIVOT_CHECKLIST.md`, `SYSTEM_ARCHITECTURE.md` |
| 08-25 (Rev 8 — teaching-rhythm pass) | Verified the previous AI's file-scope analysis against the real files (accurate; one stale note flagged — see below) before editing. Tightened the existing per-sign lesson loop toward PERSONALIZE→TEACH→SEE A REAL SIGNER→RECALL→FEEDBACK→OPTIONAL PRACTICE→CONTINUE without any new teaching engine: (1) `QUICK_CHECK_CLUSTER_SIZE` 3→1 — Quick Check now fires every sign, not every 3rd; (2) `buildQuickCheckQuestion()` extended (not duplicated) with a ~50/50 picture-identification format alongside the original text-description format, reusing each sign's existing `imageUrl`, `onerror`-safe; (3) new light personalization (`initPersonalization()`, `#personalize-card`/`#personalize-summary`) — 2 optional questions, `localStorage`-only (`lw_personalize_v1`/`lw_personalize_skipped_v1`), confirmed unread by any `progress.js`/unlock/ordering function. `js/data.js`/`js/learn.js`/`js/engine/progress.js`/`js/auth.js`/`js/quiz.js` untouched (read-only context, confirmed unnecessary to edit). One stale-assumption note: the request doc's "existing violet accent" doesn't match this codebase's actual token (`--clr-accent: #3fb950`, green, per this file's own §6 design table) — cosmetic-only, didn't affect implementation since only the CSS variable was referenced, never a hardcoded color; flagged, not corrected (out of scope, no color literal was touched). Verified beyond the usual Node-syntax check: HTML tag-balance parse (0 errors), CSS brace-balance (68/68), full DOM-hook cross-reference (`getElementById` calls vs. real ids — one intentional exception, a dynamically-created Edit button), and **a jsdom runtime harness** that actually executes the real edited code (verbatim slice, not retyped) against a real DOM built from the real edited `lesson.html`, with mocked `LWData`/real `localStorage`/simulated clicks — 14 test groups, 25 assertions, all passing (Quick Check shape/variety/rendering/click-feedback; full personalization lifecycle including no-re-nag-on-repeat-load and the skip path). Not browser-tested (no real webcam; camera/MediaPipe imports stubbed for the harness since this pass never calls into that code path). | `js/lesson.js`, `pages/lesson.html`, `css/lesson.css`, `AI_MEMORY.md`, `PIVOT_CHECKLIST.md`, `SYSTEM_ARCHITECTURE.md` |
| 08-26 (Rev 8 audit fixes) | Implemented the 2 concrete fixes `REV8_TEACHING_AUDIT.md` had identified against the prior session's personalization feature, both verified against the real code first (audit was accurate on both). **(1) UID-scoped `lw_personalize_v1`/`lw_personalize_skipped_v1`** — mirrors `js/engine/progress.js`'s own `cached.uid === user.uid` reconcile pattern (read for reference, not modified): both keys now store a `uid` (via the same `window.LWAuth?.getCurrentUser?.()` access already used elsewhere in this file) and a mismatch — including a pre-fix record with no `uid` field at all — is treated as "not answered," not auto-adopted. Deliberate, flagged tradeoff: anyone with pre-fix locally-saved prefs sees the card once more post-fix (same "reset accepted, no migration shim" precedent as `lw_progress_v2→v3`, see 08-18 above) — chosen over silent adoption because that would leave a real cross-account leak window on shared devices, which is the actual bug being fixed. **(2) Stopped the summary/invite from rendering on every sign** — `initPersonalization()` reran on every full page load (every sign = its own page load), so `#personalize-summary` was permanent chrome, not one-time; gated the unprompted render to once per browser session via a new `sessionStorage` flag (`lw_personalize_summary_shown_v1`), not once-per-category-first-sign (rejected: Continue Learning/review/`?sign=` deep-links don't reliably land on signIdx 0, which would make Edit effectively unreachable most sessions). The genuine first-ever (never answered/skipped) card is exempt from the gate — still shown, still uid-scoped. **Also retargeted the skip-link**, beyond what the audit's own file-scope note anticipated (it expected `js/lesson.js`-only): confirmed the session-gate alone still leaves ONE page load per session where personalization renders as the literal first child inside the skip-link's `#lesson-content` target, so moved `id="lesson-content"`/`tabindex="-1"` from the outer `.lesson-layout` wrapper down onto `.lesson-header` (checked first: not referenced by any CSS or `getElementById`/`querySelector` call) — skip-link now lands past personalization unconditionally, not just on most loads. Verified: `node --check` clean; HTML tag-balance (0 errors); no duplicate ids; DOM-hook cross-reference clean (same one pre-existing intentional exception as the prior session); **jsdom runtime harness**, verbatim-extracted real code against the real edited HTML — 11 groups / 46 assertions, all passing: uid isolation both directions (User B can't see/inherit User A's prefs or skip-state, and vice versa), User A's own prefs still load correctly post-fix, session-gating holds across 3 simulated sign navigations then re-opens on a simulated new session, Edit still reopens and pre-fills, corrupt/legacy localStorage fails safe on 3 shapes, Quick Check/camera/nav DOM hooks unaffected. Not browser-tested (no real focus-order/screen-reader pass — flagged, same as every prior session). | `js/lesson.js`, `pages/lesson.html`, `AI_MEMORY.md`, `REV8_TEACHING_AUDIT.md`, `Rev8_Personalization_Feature_Checklist.md` |
| 08-26 (personalization removal) | Removed the Rev 8 "Light personalization" feature entirely, per explicit request — not relocated, not replaced with any other onboarding/preference system. Deleted `#personalize-card`/`#personalize-summary` + block comment (`lesson.html`), all storage helpers/UI functions/`initPersonalization()` + its `boot()` call site (`lesson.js`), and the `.personalize-card__*`/`.personalize-summary*` rules (`lesson.css`). Quick Check (cluster-size + picture-prompt), camera, nav, sidebar, curriculum/unlock/progress code untouched. Verified: `node --check` clean, HTML tag-balance 0 errors, CSS braces 59/59, DOM-hook cross-reference clean, zero remaining `personaliz`/`lw_personalize` references, jsdom runtime harness (30 structural assertions + full top-to-bottom execution of the real edited `lesson.js` against the real edited `lesson.html`, zero errors). Not browser-tested. | `js/lesson.js`, `pages/lesson.html`, `css/lesson.css`, `AI_MEMORY.md`, `PIVOT_CHECKLIST.md`, `REV8_TEACHING_AUDIT.md`, `Rev8_Personalization_Feature_Checklist.md`, `SYSTEM_ARCHITECTURE.md` |
| 08-26 (Homepage pivot) | Verified the request doc's own conclusions against the real files before changing anything (all confirmed accurate — no stale assumptions caught this time, unlike some prior sessions). Unit 0 ("Welcome to ASL: A Brief History", `order:0`/`kind:'info'`) is REMOVED from `UNITS` — it's no longer a curriculum unit. `UNIT0_CONTENT` (5 sections) REMOVED from `data.js` entirely (Option B) and moved VERBATIM into new **`pages/homepage.html`**, a static (no `homepage.js`) authenticated landing page now shown right after login/register/already-logged-in — only `index.html`'s 3 destination strings changed (`redirectIfLoggedIn`, login redirect, register redirect: `pages/dashboard.html`→`pages/homepage.html`); `js/auth.js` itself untouched. Alphabet/Fingerspell/Numbers KEPT their existing `order` values (1/2/3) unchanged — no renumbering, gap at 0 is intentional, confirmed nothing indexes `UNITS` positionally (`getUnits()`/`getCategoriesForUnit()`/`progress.js`'s `getOrderedLiveCategories()` all key by `.id`/`.order` value, not array index). **`js/engine/progress.js` inspected directly and left 100% untouched** — it already only walks `kind:'category-group'` units, so Unit 0 was structurally excluded from gating even before this removal; no change needed or made. Removed genuinely-dead code that only existed to render/link Unit 0, now unreachable: `learn.js`'s `renderUnitInfo()` + its `kind==='info'` branches in `renderUnitView()`/`getUnitState()`; `dashboard.js`'s `kind==='info'` row branch in `renderUnitRow()`; `lesson.js`'s sidebar `kind==='info'` branch; the `welcome` icon entry in all three files' `UNIT_ICONS`. **Repurposed, not deleted**, `css/learn.css`'s `.unit-info`/`.unit-info__section`/`.lesson-card--intro` rules (built for the now-removed `renderUnitInfo()` screen) — `pages/homepage.html` reuses them directly for its own intro sections and "Want more? Read the full Introduction to ASL" banner, avoiding a duplicate CSS copy. `pages/intro-to-asl.html` UNCHANGED (still the deeper long-form reference page Homepage links out to — no dependency/content overlap found that would make it redundant). No curriculum/unlock/assessment architecture changed, no second ordering/unlock algorithm created, `quiz.js`/`quiz.html`/camera/classifier/dictionary/MediaPipe untouched (out of scope, not in this session's targeted repomix export at all). Verified: `node --check` clean on all 5 edited `.js` files; `js/data.js` evaluated in a sandboxed VM confirming 71 units, unique/contiguous `order` 1–71, no `order:0`/no `id:'welcome'`; CSS brace-balance clean; HTML tag-balance parse clean (0 errors) on both edited `index.html` and new `homepage.html`; inline `<script>` blocks in both syntax-checked; grep sweep confirmed zero remaining live (non-comment) `kind==='info'`/`UNIT0_CONTENT`/`unit=welcome`/`welcome`-icon references anywhere in the codebase. **Not browser-tested** — no real click-through of Login→Homepage→Learn/Dashboard, no real screen-reader/focus-order pass on the new skip link, same limitation as every prior session's Node-only verification. | `js/data.js`, `js/learn.js`, `js/dashboard.js`, `js/lesson.js`, `css/learn.css`, `index.html`, `pages/homepage.html` (NEW), `AI_MEMORY.md`, `PIVOT_CHECKLIST.md`, `SYSTEM_ARCHITECTURE.md` |
| 08-27 (Homepage v2 + Learn redesign) | Follow-up per screenshot feedback (Cisco Networking Academy reference): (1) `pages/homepage.html` REV 2 — rebuilt as a marketing-landing-page shape: hero (banner pill + 2-line headline + subtext + Start Learning/Go to Dashboard CTAs), a stats bar of REAL content counts (71 units, 300+ signs, 2 detection models — not fabricated adoption numbers), a centered quote block, and a new 8-card "Browse Topics" grid (Alphabet/Fingerspell/Numbers/Greetings/Polite Words/People/Feelings/Needs — the first 8 real `UNITS` ids/icons, each linking `learn.html?unit=X`). The prior revision's 5-section ASL/Deaf-culture content is KEPT, just demoted below the new sections, unchanged. (2) Navbar profile-block on Homepage ONLY is now an `<a href="dashboard.html">` (was a plain `<span>`) — "click your profile → Dashboard", matching the reference; NOT propagated to dashboard/learn/lesson/intro-to-asl's navbars this session (ask if that's wanted everywhere). (3) `pages/learn.html`/`js/learn.js`/`css/learn.css` REV 2 — the single-column ".trail"/".trail-node" row list is REPLACED with a "My Learning"-style responsive `.course-grid`/`.course-card` grid (thumbnail block with icon+badge, then title/status body) plus a new two-column `.learn-layout` (main grid + a right `.learn-sidebar` with "Your Progress" done/total tally and "Continue Learning" pointing at `findCurrentUnitId()`'s pick) and a client-side search box (`#learn-search-input`, filters whatever's currently in `#lesson-grid` by text, reset on every view change via `setContext()`). `getUnitState()`/`findCurrentUnitId()`/the URL scheme/gating are ALL UNCHANGED — this was a markup+CSS visual swap plus two small additive UI features (sidebar, search), not a logic rewrite; no new `window.LWProgress` calls, no new data model. Caught and fixed 4 stale `'trail'` class references left behind mid-edit (`showLearnUnavailable()` + 3 view-switch call sites) via a full-tree grep sweep before finalizing. Verified: `node --check` clean; CSS brace-balance clean (55/55); HTML tag-balance clean on both edited/new pages; **jsdom runtime harness** (real `data.js`+`progress.js`+`learn.js` executed against the real edited `learn.html`, `window.LWAuth` stubbed since `js/auth.js` is out of scope) — 16/16 assertions passed: 71 course-cards render, correct order-1/2/3 titles, zero Unit 0 references, sidebar panels populate with real done/total + continue-unit data, search actually filters the live DOM (typed "Numbers" → exactly 1 card visible, and it's the right one), clicking a card navigates and correctly clears `course-grid` class. Homepage DOM-checked separately (profile link → dashboard.html confirmed, all 8 topic-card hrefs confirmed against real unit ids). **Not browser-tested visually** — no real screenshot/visual QA of the new layouts, no responsive-breakpoint click-through, same Node-only-verification caveat as every prior session. | `pages/homepage.html`, `pages/learn.html`, `js/learn.js`, `css/learn.css`, `AI_MEMORY.md` |
| 08-31 [jocxsyUI] (Mockup audit follow-through, screens 1-12 + Extra UI) | Fixed the real bug this session opened with: the sidebar "Quiz" nav link (dashboard/learn/progress/feedback/settings) pointed at bare `quiz.html` with no `?level=&category=`, so `buildScope()` rendered the literal string "null" as the assessment title/subtitle and mislabeled it as an untrained category. Added `progress.js`'s `getNextAssessmentTarget()` (walks `getOrderedLiveCategories()`, returns the first unlocked not-yet-passed category, or a retake of the last unlocked one) and had `quiz.js` redirect to it on a param-less load, before `buildScope()` ever runs on a null `categoryId`; kept a plain-language fallback (not "null") for the genuine edge case of zero unlocked categories. Re-verified `LinguaWave_Mockup_Visual_Audit.md`'s remaining open items (8-12 + Extra UI Elements) against current code rather than trusting the doc, which was written before several since-completed sessions: screen 9's per-question "Correct!" takeover (`#quiz-modal`) and screen 10's Recent Activity feed (`progress-page.js`'s `renderRecentActivity()`) were both already implemented — audit is stale on those two, not fixed again. Screen 11 (Feedback) was genuinely still open — implemented all 3 TODOs `feedback.js`'s own header and `CLAUDE_TASKS.md` had flagged: `?level=` now fills `#level-name` (replacing a hardcoded, stale "Basic — A–Z Alphabet"), Q1-Q4 are validated required before submit (toast + scroll-to-question via the existing `window.LinguaWave.showToast()` helper, no new mechanism), and answers now write to Firestore's `surveys` collection via `window.LWAuth`'s already-exported `db`/`doc`/`setDoc` — used a deterministic `${uid}_${level}_${timestamp}` doc id instead of `addDoc`/`collection` since neither is exported from `auth.js`, keeping `auth.js` itself untouched per this repo's standing convention. Screen 12 (Settings theme dropdown vs. toggle) was re-confirmed as a previously-made, already-documented decision (see `pages/settings.html`'s own comment) to keep the single toggle rather than add a second, competing theme control — not re-litigated. Extra UI Elements catalog page (component style-guide) remains genuinely not built — lowest priority per the audit's own ranking, flagged not attempted, same as it was before this session. Verified: `node --check` on `progress.js`/`feedback.js` clean; `quiz.js` syntax-checked with its `import` lines stripped (ESM, can't `node --check` directly) — clean. Not browser-tested (no real click-through of the sidebar-Quiz redirect or a real Firestore write). **Extended same-day, same session:** widened the re-verification from screens 8-12 (the original request) to the full 1-12 + Extra UI list, since screens 1-2 (Homepage, Dashboard) had *also* already been fixed by an earlier same-day "mockup alignment pass" already baked into `index.html`/`dashboard.html` before this session started (hero auth modal + illustration + Why-Learn-ASL row on Homepage; `.dash-hero-row` 2-col grid on Dashboard) — confirmed via direct code read, not assumed from the pass's own header comments. Screens 4-6 (Lesson page) were re-checked the same way: numbered instruction steps, inline Quick Check, and the video tip callout were all already correct (audit was stale on all three); the Lesson page's minimal-top-bar and Learn page's flat-list premises are themselves now stale for a different reason — both were deliberately superseded by later redesigns (Rev 5's course-sidebar merge, 08-27's course-grid + learn-sidebar) that predate this session and were reconfirmed intentional, not reverted. Screen 6's Camera Practice Recognition Result card remains the one genuine structural gap left in the entire 12-screen audit — read the real `.detection-panel` markup this time (not just headings) to confirm the current live-readout implementation, while richer than the mockup's static card, still doesn't reproduce its specific layout; flagged as the most implementation-heavy remaining item, not attempted. `LinguaWave_Mockup_Visual_Audit.md` rewritten end-to-end (all 12 screens + Extra UI + Summary/Priority Ranking) to stop being a point-in-time snapshot and reflect current reality, with superseded-by-later-redesign called out separately from genuinely-open so a future session doesn't try to "fix" screens 3/4/12 by reverting real product decisions. | `js/engine/progress.js`, `js/quiz.js`, `js/feedback.js`, `pages/feedback.html`, `CLAUDE_TASKS.md`, `LinguaWave_Mockup_Visual_Audit.md`, `AI_MEMORY.md` |