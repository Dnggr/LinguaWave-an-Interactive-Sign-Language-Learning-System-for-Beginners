# PIVOT_CHECKLIST.md — Curriculum pivot implementation tracker

> Tracks execution of `SYSTEM_ARCHITECTURE.md` → **Rev 4**. This file is
> the *what/done-or-not*; that section is the *why*. Check items off as
> they land. **`js/auth.js` is out of scope — teammate owns it.**
>
> Compressed 2026-08-22: completed phases collapsed to one line each
> (full reasoning previously here is now redundant with the finished
> code + `AI_MEMORY.md`'s changelog). Only genuinely open items keep
> their detail. Add new work below the `## Open / backlog` section —
> that's the room this compression freed up.

---

## Phases 1–6 — ✅ all app-code phases done

- [x] **Phase 0 — Planning** (2026-08-17). Adviser feedback → unit map;
  `AI_MEMORY.md` §0 + `SYSTEM_ARCHITECTURE.md` Rev 4 written.
- [x] **Phase 1 — `data.js` restructure** (2026-08-18). `UNITS` array,
  `unit` field on every category, Unit 0 static-text content,
  `sequence_demo` tagged unit 6, Unit 5 comingSoon split (4 trained
  sub-categories shown, 8 untrained hidden).
- [x] **Phase 2 — Fingerspell Your Name drill** (2026-08-18). Extension
  of `lesson.js`, reuses the existing phrase-chaining pipeline with a
  runtime-built letter sequence, zero new training data. Reachable from
  the trail nav as of Phase 4, and directly via
  `lesson.html?level=basic&category=fingerspell_name`.
- [x] **Phase 3 — `progress.js` unlock-chain flattening** (2026-08-18).
  `getOrderedLiveCategories()` walks `UNITS` in one flat cross-level
  chain; storage key bumped `lw_progress_v2`→`v3`, no migration shim
  (reset accepted, per Joshua). Unit 0/Unit 7/Unit 2 structurally
  excluded from gating (not `category-group` kind).
- [x] **Phase 4 — `learn.js`/`dashboard.js` trail-view UI** (2026-08-19).
  Three-tab switcher → single scrollable trail, locked/current/done
  nodes. **Reintroduced real per-category locking** — reverses an old
  Rev 3 "never lock" decision, flagged for a second look (see
  `AI_MEMORY.md` §0). Dashboard: one aggregate card + one row/unit.
- [x] **Phase 5 — signup-time level picker removed** (2026-08-19).
  `index.html`'s level `<select>` gone; `auth.js`'s `register()` no
  longer takes `level` (every account hardcodes `'basic'`).
- [x] **Phase 6 — `quiz.js`/`lesson.js` assessment changes** (2026-08-20).
  "Quick Check" recall MC every ~3 signs; Unit 6 camera round now does
  ordered sign-by-sign phrase detection, not just 4-option MC; both stay
  optional/non-gating. **Level Final Assessment CTA retired** (mechanism
  untouched, still reachable via `quiz.html?final=1`) — a real product
  call made by an AI session, flagged for confirmation.

## Phase 7 — Capture + retrain (content/ML, not app code) — the only open phase

- [ ] Capture + retrain 16 Essential Words: `PLEASE`, `SORRY`, `YES`,
  `NO`, `HELP`, `GOOD`, `BAD`, `WHAT`, `WHERE`, `WHY`, `WATER`, `FOOD`,
  `GO`, `COME`, `BATHROOM` (was tracked as `RESTROOM` — see
  2026-08-23 merge note below), `HUNGRY`. Needs camera capture + Colab
  retrain — not doable in an AI chat session.
  **Correction (2026-08-23, audited for the reorder below): this list
  is NOT one bucket in `data.js`.** Traced each signId:
  `PLEASE`/`HELP`/`WHAT`/`WHERE`/`WHY` live in Unit 4 `requests`;
  `SORRY`/`GOOD`/`BAD` live in Unit 5 `feelings` (**comingSoon: true —
  hidden from the UI today**); `WATER`/`HUNGRY` live in Unit 5 `food`
  (also comingSoon); `GO`/`COME` live in Unit 5 `places` (**not**
  comingSoon — the Unit Map below calls "places" trained & working,
  which is only true for its other ~7 words). `YES`/`NO`/`RESTROOM`/
  `FOOD` (the word) have **no `data.js` SIGNS entry at all** — only the
  disabled `dictionary.js` placeholder, no lesson page to attach a
  retrained label to yet. Same story for `HELLO` (tracked below,
  outside this 16): zero `data.js` content.
  **Update (2026-08-23, implementing the reorder):** all 16 now live in
  `data.js`'s Everyday Essentials/Greetings/Basic Responses/Polite
  Expressions units (see "Unit reorder" section below for the exact new
  category per word) — `HELLO`/`YES`/`NO`/`FOOD` got real content
  written this session (previously zero), and `RESTROOM` turned out to
  already exist under the label `BATHROOM` (Unit 5 `health`) — merged
  rather than duplicated. **Still capture/retrain-blocked** — none of
  the 16 have a trained model class; only their `data.js`/`dictionary.js`
  bookkeeping changed, not their detection status.
- [ ] Capture + retrain 5 phrase placeholders: `NICE TO MEET YOU`,
  `HOW ARE YOU`, `WHERE IS`, `I AM LEARNING`, `WHAT IS YOUR NAME`.
- [ ] Capture + retrain `HELLO`/`THANK YOU` (Unit 4) and `HOT`/`COLD`
  (Unit 5 temperature) — currently `disabled: true` placeholders in
  `dictionary.js` so they fail cleanly instead of silently.
- [ ] Capture + retrain digits `6`/`9`/`10` for `asl_motion_model` —
  routing is already fixed (`detectionType: 'motion'` set correctly in
  both `data.js` and `dictionary.js`), but `asl_motion_model/labels.json`
  has zero digit classes today, so nothing actually detects yet.
- [ ] **NEW (2026-08-23, code-read audit — see "Bugs found this session"
  → Phase A below).** Capture + retrain digits `0,1,2,3,4,5,7,8` for
  `asl_static_model` — previously believed already trained
  (`SYSTEM_ARCHITECTURE.md`'s Unit Map said so), actually has zero digit
  classes in `asl_static_model/labels.json` today, same root problem as
  `6`/`9`/`10` above just on the other model. **Numbers is effectively a
  0%-trained unit, not a mostly-done one** — worth knowing before
  planning a capture session's scope/time. Decide static vs. motion model
  for these 8 before capturing (see Phase A's note).

---

## Dashboard UX pass — ✅ done (Priority 0–2, 2026-08-21/22)

All 15 items from the 2026-08-21 learner-perspective review are
implemented in `dashboard.html`/`dashboard.js`/`dashboard.css` only —
`auth.js`/`data.js`/`learn.js`/`progress.js` untouched throughout, per
scope. One-line summary of each:

- [x] Continue Learning hero card is now the primary element (was: 9%
  aggregate card dominant).
- [x] "Practice Progress" relabeled, explicit "not a mastery score."
- [x] Unit rows show real per-unit progress, "You are here" state.
- [x] Review entry point added, later upgraded to show 3 recent signs
  (not 1).
- [x] "Signs You've Learned" recap deduped (was showing each sign
  twice).
- [x] `Current Level: Basic` field replaced with `Current Unit`.
- [x] First-viewport layout compacted around the hero card.
- [x] Reduced duplication with `learn.js`'s trail / `lesson.js`'s
  sidebar — wording aligned, unit rows kept as a lighter-weight summary.
- [x] Stats tiles, clearer status vocabulary, accessibility labels,
  responsive breakpoints, error/loading states.

**Still open from this pass:**
- [ ] **First-viewport-without-scrolling** not separately confirmed
  (resize/narrow-width was confirmed good by Joshua in a real browser
  2026-08-22, but that's a different check than "fits above the fold
  on initial load").
- [ ] **Full real-browser verification of locked/current/done row
  states** — blocked on `DEBUG_UNLOCK_ALL` (currently `true`, so no row
  renders locked to check against). Joshua will flip it back himself
  once done testing; not an AI action item.
- [ ] `assets/images/basic/M.png` existence — can't check from a
  text-only export, needs a human filesystem check.
- [ ] Alphabet page "what to do next" instructional gap — needs a
  dedicated `learn.js`-scoped session (out of this pass's scope).

**Reference used by that review, still useful for scoping future
dashboard work:**
- Preferred files: `dashboard.html`, `dashboard.js`, `dashboard.css`.
- Excluded: `auth.js` (teammate), `data.js`/`learn.js`/`progress.js`
  (dashboard should only *consume* their existing exports —
  `getOrderedLiveCategories`, `getCategoryProgress`,
  `isCategoryUnlocked`, `getUnits`, `getCategorySigns`,
  `getAllLearnedSigns` — never add new unlock/ordering logic here).
- Target flow: `Dashboard → Continue Learning → Lesson/Course Player →
  Quick Check → Optional Camera Practice → Category Assessment → Next
  Unit`, and separately `Dashboard → Learning Path → Learn`, and later
  `Dashboard → Review → previously practiced signs`. Full wireframe
  sketch (now realized in code, semantic CSS states instead of literal
  ✓/→/○/🔒 glyphs — flagged as a deliberate, unconfirmed substitution)
  is in git history if needed again.

---

## Bugs observed — 2026-08-22 screenshot review (dashboard → learn → learn?category=numbers)

> Screenshot-based observations from a live local server (`127.0.0.1:5500`),
> same discipline as the earlier §16 review. **Confirmed against the
> actual code and fixed/resolved same day (2026-08-22, later session)** —
> see each item. `auth.js` not implicated in any of these.

- [x] **`learn.html` root trail has no visible locked/current/done
  state.** Root cause confirmed: `learn.js`'s `getUnitState()` marked
  *every* unlocked-and-incomplete category-group unit `'current'`
  independently, instead of picking the one unit that's actually next.
  Normally invisible (sequential unlocking usually leaves only one such
  unit at a time), but `DEBUG_UNLOCK_ALL` unlocks all of them at once, so
  all 8 rows got the identical accent-border/shadow treatment — which
  reads as "nothing is highlighted" rather than "everything is." This is
  also why it disagreed with the dashboard's own mini preview: that page
  already stops at the first unlocked-but-unpassed category
  (`getCurrentDestination()`); `learn.js` didn't have an equivalent
  single-current rule until now. **Fix:** added `findCurrentUnitId()` to
  `learn.js`, mirroring `dashboard.js`'s walk-and-stop-at-first pattern;
  only that one unit gets `status: 'current'` now, every other
  unlocked-incomplete unit renders neutral (`'available'`, no special
  border). Independent of `DEBUG_UNLOCK_ALL` — true either way, but the
  visual difference will be much less obvious until the flag is flipped
  back (only then does the trail normally have just one unlocked+
  incomplete unit to show as current in the first place). `js/learn.js`.
- [x] **"← Back to Trail" wording.** Confirmed literal — all 6 occurrences
  (5 in `learn.js`, 1 static fallback in `learn.html`) said "Trail".
  Changed to "← Back to Learning Path" everywhere, matching the page's
  own H1 and the dashboard's "LEARNING PATH" heading. `js/learn.js`,
  `pages/learn.html`.
- [x] **Dashboard "Continue" doesn't account for "fully practiced, not
  yet assessed."** Confirmed: `getCurrentDestination()`'s `nextSign`
  falls back to `signs[0]` once every sign is practiced (nothing left
  unpracticed to find), and nothing downstream branched on that case —
  so Continue kept pointing at "Alphabet → Letter A" at 26/26. **Fix:**
  added a `readyForAssessment` flag to `getCurrentDestination()`'s
  return value (`practicedCount === signs.length`); `renderContinueCard()`
  now shows a distinct "📝 Take Assessment" state instead of falling
  into the sign-practice branch, `renderContinueButton()` routes its
  href to `quiz.html?level=X&category=Y` instead of `lesson.html?...&
  sign=...`, and the matching unit-row "Next: …" detail (same bug, same
  fallback, second surface) got the same branch so the hero card and the
  unit row can't disagree with each other. `js/dashboard.js`.
- [x] **Undocumented "Open Unit 1 Path" button.** Confirmed real and
  working as designed (`[data-continue-secondary]`, added in the
  Priority 2 §13 session) — not a functional bug. Added to
  `SYSTEM_ARCHITECTURE.md`'s dashboard description so it doesn't get
  flagged as drift again.

**Not re-verified in a real browser this session** (text-only repo
export, same limitation as every prior AI session) — the fixes above are
confirmed against the actual code paths, but Joshua should still eyeball
`learn.html`'s trail and the dashboard hero card once, ideally after
flipping `DEBUG_UNLOCK_ALL` back to `false` per `AI_MEMORY.md` §0, since
that's also when the trail's single-current-unit fix becomes visually
meaningful (today, with the flag on, there's usually nothing else
unlocked+incomplete to contrast the one 'current' unit against).

---

## Unit reorder — Omen's request (2026-08-22) — ✅ mapping + Fingerspell-as-assessment implemented 2026-08-23

Differs from the live Unit Map in `SYSTEM_ARCHITECTURE.md` → **Rev 6**
(supersedes the Rev 4 table). Goal stated by Omen: restructure for
better data collection for the detection engine.

**Target order (original request):**
1. ASL History — new content. Current Unit 0 ("Welcome to ASL") is
   generic background + how-camera-practice-works, not history
   specifically — needs new copy, not just a rename. **Not done** —
   still generic Unit 0 content, needs a dedicated content-writing pass.
2. Letters (= current Unit 1, unchanged) ✅
3. Fingerspell — **as an assessment.** ✅ **Confirmed 2026-08-23
   ("Yes, make it graded") and implemented same day** — see
   `SYSTEM_ARCHITECTURE.md` Rev 6 for the `gated`/`unitAssessments`
   mechanism. Pass condition is lenient (completing the drill once = 
   pass, matching its existing forgiving retry behavior) — flagged as a
   simplification, not re-confirmed separately.
4. Numbers (= current Unit 3, unchanged) ✅ — now also gated behind #3.
5. Everyday Essentials ✅ — narrowed, see mapping below.
6. Greetings and Introduction ✅ — new unit + category.
7. Basic Responses ✅ — new unit + category.
8. Polite Expressions ✅ — new unit + category.
9. Days of the Week — current `time` category (`DAY`/`WEEK`/`MONTH`/
   `YEAR`/`TODAY`) is generic time vocabulary, **not** the 7 weekday
   names (Monday–Sunday). **Not done** — no new content/training data
   was available to build this from; `time` was left alone (still Unit
   8 today, unrenamed).
10. Everything else already in the app — just categorize, no reshuffle
    urgency. ✅ (bumped to units 8/9/10, content unchanged).

**Mapping — confirmed 2026-08-23, then implemented same session:**

| Category (unit) | SignIds | Content status |
|---|---|---|
| Greetings and Introduction (5) | `HELLO` | New `data.js` entry written this session (had zero content before). |
| Basic Responses (6) | `YES`, `NO`, `GOOD`, `BAD`, `WHO`, `WHAT`, `WHERE`, `WHEN`, `WHY`, `HOW` | `YES`/`NO` are new entries; the rest moved in with existing content unchanged. |
| Polite Expressions (7) | `PLEASE`, `THANK YOU`, `EXCUSE`, `SORRY` | All moved in with existing content unchanged. |
| Everyday Essentials (4, narrowed) | `HELP`, `STOP`, `WATER`, `FOOD`, `HUNGRY`, `BATHROOM`, `GO`, `COME` | `FOOD` is a new entry. `BATHROOM` — see merge note below, **not** a new `RESTROOM` entry. |

**Resolved this session — the "RESTROOM" list item was a duplicate,
not a gap.** Traced it against `data.js` before writing new content:
`RESTROOM` (dictionary.js-only, from the original 16-word list) and the
pre-existing `BATHROOM` entry (Unit 5 `health`, still comingSoon,
description: T-hand shake, note already said "also commonly used for
restroom/toilet") are the same physical sign, tracked under two
different labels in two different files that never referenced each
other. Merged: moved `BATHROOM` into Everyday Essentials, renamed
`dictionary.js`'s `RESTROOM` key to `BATHROOM` to match, wrote no new
"RESTROOM" content. Worth a scan for other Phase-7-list-vs-existing-
content collisions like this one if more essential words get added
later — this one wasn't caught by either the original request or last
session's audit.

**Naming collision — resolved.** `data.js`'s `CATEGORIES` already had
Unit-7-Phrasebook (now Unit 10) categories with ids `basic_responses`
and `polite_expressions`. The 2 new basic-level categories use
`essentials_basic_responses`/`essentials_polite_expressions` instead —
no collision, both sets of ids now coexist.

**Not done / open follow-ups:**
- ASL History (Unit 0) and Days-of-the-Week (item 9) content — flagged
  above, need dedicated content-writing sessions.
- `learn.js`'s Fingerspell unit card label updated to reflect gated
  state (was hardcoded "always open" regardless) — **not verified in a
  real browser**, same limitation as every prior session. Worth an
  eyeball once `DEBUG_UNLOCK_ALL` is back to `false`.
- Fingerspell's lenient pass condition (see #3 above) — flag for a
  second look if a stricter assessment mode is wanted later.

---

## Bugs found this session — 2026-08-23 (auditing Phase 7 for the reorder)

- [x] **`dictionary.js` missing 5 disabled placeholders.** Unit 4's
  `requests` category has 11 signIds; only 6 (`PLEASE`/`THANK YOU`/
  `HELP`/`WHERE`/`WHY`/`WHAT`) had a `disabled: true` entry — `EXCUSE`/
  `WHO`/`WHEN`/`HOW`/`STOP` had no entry at all. Functionally near-
  identical today (neither model has any of these 11 labels), but
  `getAllowedLabelsForSign()` returns unrestricted matching (`null`) for
  a missing entry vs. a real Set for a disabled one, and it reads as an
  oversight rather than a decision. **Fixed** — added the 5 missing
  placeholders, same pattern as the existing 6. `js/engine/dictionary.js`.
- [x] **Stale comment in `data.js` claiming `COME`/`GO` are "already
  separately captured/trained."** False — confirmed against
  `asl_motion_model/labels.json` (neither label exists) and
  `dictionary.js` (`disabled: true` on both). They're on the Phase 7
  list like the other Essential Words. **Fixed** — comment corrected so
  a future session doesn't skip them assuming Unit 5's `places` category
  is fully live. `js/data.js` (comment only, no logic change).
- [ ] **`SYSTEM_ARCHITECTURE.md`'s Unit Map row for Unit 5 says
  "family/places/time trained & working" without qualification** — true
  for ~7 of `places`' words, not for `COME`/`GO`. Corrected in that file
  this session (see its own note).

---

## Design pass — learn.html / lesson.html sidebar not yet matching dashboard — 2026-08-23 (✅ implemented, this session — see follow-up note below)

Omen's observation, confirmed by code read: `learn.css`/`lesson.css` share the
same design tokens as `dashboard.css` (no color/font drift), so this isn't a
token problem — it's that the 2026-08-21/22 Dashboard UX pass (Priority 0–2)
shipped several polish items to `dashboard.html`/`.css` only, and they were
never extended to `learn.html`, the "back to trail"/`#learn-back-link`
flow, the category views inside `learn.js`, or `lesson.html`'s course
sidebar. Concretely, dashboard had and the other three didn't:

- [x] **Skip link** (`.skip-link`) — accessibility, keyboard users on
  learn/lesson previously tabbed through the whole navbar first. Added to
  `learn.html` (jumps to `#lesson-grid`) and `lesson.html` (jumps to
  `#lesson-content`, i.e. skips the ENTIRE course-outline sidebar — a
  bigger tab-order cost than dashboard's navbar, since the sidebar can be
  dozens of links deep). Both target elements got `tabindex="-1"` so a
  plain `<div>` can actually receive focus on jump.
- [x] **`:focus-visible` states** on interactive cards — added to
  `learn.css` (`.lesson-card`, `.trail-node`) and `lesson.css`
  (`.course-sidebar__unit--flat`, `.course-sidebar__unit-head`,
  `.course-sidebar__cat-head`, `.course-sidebar__sign`). Same
  outline:none + box-shadow-ring substitution dashboard.css uses, minus
  the `inset` (neither page clips overflow the way dashboard's
  `.unit-progress-list` does).
- [x] **Loading-state shimmer** — `#lesson-grid` (learn.html) and
  `#course-sidebar` (lesson.html) now start with a static
  "Loading…" placeholder using `.loading-pulse`, naturally overwritten
  the first time `js/learn.js`/`js/lesson.js` render (both already do a
  full `innerHTML =` replace, so no extra cleanup code was needed).
- [x] **Error/fallback state** — `js/learn.js` (`showLearnUnavailable()`)
  and `js/lesson.js` (`showSidebarUnavailable()`, inside
  `renderCourseSidebar()`) now show a real `.alert--error` fallback
  (with a working link back to Dashboard/Learn) instead of leaving a
  blank or stuck-loading grid/sidebar if `window.LWData` never loads or
  a render call throws. **Narrower than dashboard's version on
  purpose:** only `window.LWData` is treated as a hard requirement —
  every `window.LWProgress` call in both files already goes through
  `?.` + `?? default`, so a missing/slow `LWProgress` degrades
  gracefully (unlocked-state defaults) rather than needing its own
  fallback path, unlike dashboard.js which required both.

`quiz.html`/`quiz.css` has the identical gap (checked while auditing this)
but still wasn't named in the request — still flagged as a bonus, still not
in scope unless wanted.

**Implementation note vs. the prior session's suggested approach:** the
`.skip-link`/loading-pulse rules were made "generic and reusable" by
*adding* page-agnostic copies to `css/style.css` (new §16 —
`.skip-link`, `.loading-pulse`) rather than by moving/renaming
`dashboard.css`'s existing `.skip-link`/`.dash-loading-pulse` — moving
them would've meant editing an already-shipped, working page for a
rename with zero visual benefit to it. `dashboard.css` still has its own
identical copies untouched (harmless duplication — `dashboard.css` loads
after `style.css` on `dashboard.html`, so its rule still wins there at
equal specificity); new pages should reach for the `css/style.css`
versions going forward. `SYSTEM_ARCHITECTURE.md`'s "Dashboard design
principles" section has the fuller writeup.

**Not verified in a real browser this session** (Node-only: `node --check`
on both touched `.js` files, brace-balance check on all 3 touched `.css`
files, a Python HTML parse pass on both touched `.html` files — all
clean). Worth a real-browser keyboard-tab-order + screen-reader pass
before calling this fully done.

---

## Bugs found this session — 2026-08-23 (later, code-read audit — no fixes applied)

> Full-repo read, not just a screenshot review. Organized into short,
> independent phases so a future chat only needs to paste the ONE phase
> being worked, not this whole file — each phase stands alone. `auth.js`
> internals not audited beyond what's needed to explain a progress.js/
> dashboard.js-visible symptom, per scope (teammate owns it). None of the
> below fixed — analysis only, this was an explicit request this session.

### Phase A — Model/label alignment (read this before any camera capture)

- [ ] **CRITICAL — Numbers `0,1,2,3,4,5,7,8` (7 of 10 digits) cannot be
  detected at all today, not just "not yet captured."** Confirmed by
  reading the actual model files, not just the docs: `asl_static_model/
  labels.json` has 25 classes and every one is a letter (`A`–`Y` minus
  `J`/`Z`, +`NONE`) — zero digit classes exist. `classifier.js`'s
  `classifyGesture()` returns `rawLabel` straight from that file, and
  `lesson.js`'s practice/assessment handlers do a direct
  `result.label !== expectedStep` string compare against the digit signId
  (e.g. `'0'`). A digit signId can never equal a letter string, so this
  fails 100% of the time — not probabilistically, structurally. This
  directly **contradicts `AI_MEMORY.md` §0 / `SYSTEM_ARCHITECTURE.md`'s
  own Unit Map**, which says Unit 3's "static 0–9 trained" — that line is
  wrong and self-contradicts the same file's own §5 model-reference table
  (correctly lists static = letters only, no digits). **Practical impact:
  Phase 7's tracked digit list ("6·9·10 need capture") is incomplete —
  it's actually all 10 digits, not 3.** Worth deciding before a capture
  session: do 0–5/7/8 get folded into the `asl_static_model` retrain (new
  digit classes there) or moved to `asl_motion_model` alongside 6/9/10 for
  consistency? Either way, updating the Unit Map's Unit 3 row and Phase
  7's checklist item once a plan is picked is a small doc fix, not
  discussed further here since it's a decision, not a bug fix.

### Phase B — Auth/session hygiene (cross-file; coordinate with teammate before touching `auth.js` itself)

- [ ] **Confirmed reachable — `logout()` leaves stale progress in
  `localStorage` on 2 pages.** `js/auth.js`'s `logout()` does
  `localStorage.removeItem(window.LWProgress?.STORE_KEY)`. `feedback.html`
  and `intro-to-asl.html` both render a working "Log out" link
  (`[data-logout]`, wired by `main.js`) but neither loads `progress.js` —
  so `window.LWProgress` is `undefined` there, the optional chain resolves
  to `undefined`, and `removeItem(undefined)` clears a key literally named
  `"undefined"` instead of `lw_progress_v3`. On a shared/public computer,
  logging out from either of those two pages leaves the previous learner's
  progress in place for whoever logs in next. Fix is one line
  (`localStorage.removeItem('lw_progress_v3')`, hardcoded, not derived
  from a maybe-missing global) but it's inside `auth.js` — flagging for
  the teammate rather than touching it.
- [ ] **Pointer, not new — already visible from `dashboard.js`'s own
  comments (Priority 2 §15):** `js/auth.js`'s `onAuthStateChanged`
  callback awaits `getDoc(userRef)` with no `try/catch`. If that call
  rejects (offline, ad-blocker on `gstatic.com`, Firestore rule error),
  the callback throws before reaching `authReady = true` /
  `dispatchEvent('lwauth-ready')` — so `whenAuthReady()` **and**
  `requireAuth()` never resolve on ANY guarded page, not just the
  progress-hydration hang dashboard.js already found and worked around
  locally. `dashboard.js`'s fix is a dashboard-only timeout net around
  `whenProgressReady()`; it does not (and can't, from outside `auth.js`)
  fix `requireAuth()` itself, which has no timeout anywhere. Confirmed by
  reading `auth.js`'s `requireAuth()`/`whenAuthReady()` directly — both
  wait on the `'lwauth-ready'` event with no fallback path. Root fix is a
  `try/catch/finally` around the `getDoc` call in `auth.js`, teammate's
  call on timing/priority.

### Phase C — Page lifecycle & camera hygiene (small, independent, safe to hand to any session)

- [ ] `js/quiz.js` has no `visibilitychange` handler — `js/lesson.js` stops
  the camera when the tab is backgrounded (`document.hidden`), `quiz.js`
  only stops it on `beforeunload` / when the camera round finishes. If a
  learner tabs away mid camera-round assessment, the webcam stays live
  (indicator light on) until they return or leave the page.
- [ ] `js/camera/cameraUtils.js`'s `startCamera()` assumes `canvasElement`
  is always passed and non-null (`canvasElement.width !== …`) — a null
  canvas throws instead of failing gracefully. Every current call site
  does pass one, so this is latent, not currently triggered.
- [ ] `js/engine/classifier.js`'s `classifyGesture()`/`classifyMotion()`
  allocate `input = tf.tensor2d(...)` OUTSIDE `tf.tidy()` and call
  `input.dispose()` after the tidy block, not in a `finally`. If
  `staticModel.predict()`/`.dataSync()` throws inside the tidy callback,
  `input.dispose()` is skipped and that tensor leaks in WebGL memory for
  the rest of the session.

### Phase D — Reconciling `CLAUDE_TASKS.md` (a second, un-merged audit already sitting in the repo)

`CLAUDE_TASKS.md` (repo root) is a separate 16-item QA audit, not
referenced by any entry in this file's Session Log or `AI_MEMORY.md` —
looks like output from a different AI/tool session that was never folded
in. Re-checked its claims against the actual current code this session so
a future session doesn't re-verify or re-fix things that are already
done:

- **Already fixed, claim is stale:** progress.js/auth.js hydration
  destructure crash → dashboard.js already has a documented workaround
  (see Phase B above for the part that's still genuinely open); quiz.js
  legacy `isLevelFinalUnlocked`/level-partition routing in
  `buildActionButtons()` → already rewritten to walk
  `getOrderedLiveCategories()` (see the `REV 4 PHASE 6` block comment in
  `quiz.js`); `dictionary.js` missing `EXCUSE`/`WHO`/`WHEN`/`HOW`/`STOP`
  placeholders → all 5 present (added in the 08-23 session, see this
  file's own entry above); dashboard's "Current Level: Basic" → already
  renamed to "Current Unit" (Priority 1 §8).
- **Checked, not actually a bug:** `pages/intro-to-asl.html`'s
  `learn.html?level=basic` link — `learn.js`'s `boot()` still explicitly
  reads a legacy `?level=` param and scrolls to the right unit
  (`scrollToLevel()`), documented as deliberate backward-compat in
  `pages/learn.html`'s own header comment. Works today; just an older URL
  shape, not broken.
- **Still open, not yet verified against current code this session (low
  priority, no evidence either way):** lesson.js phrase-step cooldown
  timer overlap (partially mitigated already — `startPhraseStep()` now
  clears `motionCountdownTimer` and force-sets `cooldown = true` at its
  top — but `enterCooldown()`'s own internal timer isn't itself
  cancelable, so a narrow one-tick race may still exist between two
  back-to-back `setTimeout` firings; much smaller window than originally
  described, not confirmed either way with a real timer trace);
  `handleAssessmentFrame()`'s debounce-frame `lastDetected` tracking for
  static signs; quiz.js camera-round countdown/buffering UI; button text
  mismatch (`'🎥 Start Assessment'` vs spec's "optional" wording).
- **Confirmed still open, already tracked elsewhere — not new:**
  `js/feedback.js` (`AI_MEMORY.md` §4's existing TODO — no Firestore
  write, no `?level=` read, no validation).
- **Not re-checked this session:** the file's "Optimization & Edge Cases"
  section (TF.js memory beyond what Phase C above independently found,
  MediaPipe background-tab throttling, canvas retina scaling, offline/PWA
  caching) — plausible, not verified against current code either way.

**Suggested next step, not done here:** either delete `CLAUDE_TASKS.md` (its
still-valid items are now folded into Phases A–C above) or add one line at
its top pointing here, so it stops being a second, contradictory source of
truth. Left as-is this session — deleting another file felt outside "just
find bugs."

---

## Open / backlog (suggested, not adviser-required — low priority)

- [ ] Review/Trainer mode — spaced-repetition-style camera drill over
  already-passed signs.
- [ ] Optional placement/skip test for learners who already know some
  ASL.
- [ ] Sign-variation callouts (e.g. "HOW" has two accepted forms).
- [ ] `pages/intro-to-asl.html` vs. Unit 0's `UNIT0_CONTENT` overlap —
  needs a decision (merge, or keep both cross-linked as-is).
- [ ] Later dashboard stat tiles: current streak, review due, best
  assessment score.

*(Add new session's tasks here.)*