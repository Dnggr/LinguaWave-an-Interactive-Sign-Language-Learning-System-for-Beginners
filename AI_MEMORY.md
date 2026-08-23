# AI_MEMORY.md — Read this first

> **For any AI assistant working on this repo:** read this file, then
> `PIVOT_CHECKLIST.md` (done/not-done tracker), then `SYSTEM_ARCHITECTURE.md`
> → **Rev 4** (the full plan) before touching `data.js`, `learn.js`,
> `progress.js`, or `auth.js`.
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

## 0. Curriculum pivot status (Rev 4 in SYSTEM_ARCHITECTURE.md, superseded by Rev 6)

**Phases 1–6 (all app-code phases) are done.** Only **Phase 7** — real
camera capture + model retraining for the Essential Words / phrase
placeholders / HELLO / THANK YOU / HOT / COLD / **all 10 digits**
(corrected 2026-08-23 — was tracked as just `6`·`9`·`10`; `0,1,2,3,4,5,7,8`
turn out to have zero classes in `asl_static_model` too, so Numbers is
0%-trained, not mostly-done) — remains, and it needs a human with a
camera + Colab, not another AI session. See `PIVOT_CHECKLIST.md` → Phase
7 for the exact class list.

**Rev 6 (2026-08-23) reordered/split units on top of Rev 4** — read
`SYSTEM_ARCHITECTURE.md`'s Rev 6 section and its updated Unit Map before
assuming Unit 4/5/6/7 mean what an older mental model of this app might
expect. Short version: 3 new units inserted (Greetings and Introduction,
Basic Responses, Polite Expressions, orders 5–7), the old Unit 5/6/7
bumped to 8/9/10, Unit 4 narrowed, and Unit 2 (Fingerspell Your Name) is
now a real assessment gate instead of always-open practice.

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
session — e.g. `PIVOT_CHECKLIST.md`'s still-open ASL History (Unit 0) and
literal Days-of-the-Week content — check ASLU's own treatment of a topic
before drafting new `data.js` copy, for consistency with what's already
in the app.

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
- `js/feedback.js` — survey answers just `console.log`, still not
  written to Firestore (`TODO` in file).
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