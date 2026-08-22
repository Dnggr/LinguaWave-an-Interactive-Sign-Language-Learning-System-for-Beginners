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

## 0. Curriculum pivot status (Rev 4 in SYSTEM_ARCHITECTURE.md)

**Phases 1–6 (all app-code phases) are done.** Only **Phase 7** — real
camera capture + model retraining for the Essential Words / phrase
placeholders / HELLO / THANK YOU / HOT / COLD / digits 6·9·10 — remains,
and it needs a human with a camera + Colab, not another AI session. See
`PIVOT_CHECKLIST.md` → Phase 7 for the exact class list.

One-line model of the product: LinguaWave is **one linear "Basic ASL"
path** (no user-picked level tiers) — background → letters → your name
fingerspelled → numbers → essentials → thematic vocab → phrases →
(future) conversations. `level`/`category` internal field names in
`data.js`/`dictionary.js` are unchanged (legacy grouping keys) — the
`UNITS` array + each category's `unit` field is what actually drives
ordering now. Full rationale: `SYSTEM_ARCHITECTURE.md` → Rev 4.

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