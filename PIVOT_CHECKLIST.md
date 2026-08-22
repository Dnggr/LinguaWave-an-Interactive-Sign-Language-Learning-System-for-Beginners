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
  `GO`, `COME`, `RESTROOM`, `HUNGRY`. Needs camera capture + Colab
  retrain — not doable in an AI chat session.
- [ ] Capture + retrain 5 phrase placeholders: `NICE TO MEET YOU`,
  `HOW ARE YOU`, `WHERE IS`, `I AM LEARNING`, `WHAT IS YOUR NAME`.
- [ ] Capture + retrain `HELLO`/`THANK YOU` (Unit 4) and `HOT`/`COLD`
  (Unit 5 temperature) — currently `disabled: true` placeholders in
  `dictionary.js` so they fail cleanly instead of silently.
- [ ] Capture + retrain digits `6`/`9`/`10` for `asl_motion_model` —
  routing is already fixed (`detectionType: 'motion'` set correctly in
  both `data.js` and `dictionary.js`), but `asl_motion_model/labels.json`
  has zero digit classes today, so nothing actually detects yet.

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

## Proposed Unit reorder — Omen's request (2026-08-22, NOT yet implemented)

Differs from the live Unit Map in `SYSTEM_ARCHITECTURE.md` → Rev 4.
Goal stated by Omen: restructure for better data collection for the
detection engine. This needs its own planning pass before touching
`data.js` — same weight as the original Rev 4 planning session, not a
quick edit — so treat this as a plan to confirm, not a to-do to just
execute.

**Target order:**
1. ASL History — new content. Current Unit 0 ("Welcome to ASL") is
   generic background + how-camera-practice-works, not history
   specifically — needs new copy, not just a rename.
2. Letters (= current Unit 1, unchanged)
3. Fingerspell — **as an assessment.** Current Unit 2 is an ungated
   practice drill (Camera Check has been optional/bonus everywhere
   since Rev 3, reaffirmed through Phase 6). Making it a graded gate is
   a real policy reversal, not just a reorder — flag for an explicit
   decision before implementing, same way Phase 4's locking reversal
   and Phase 6's Level-Final retirement were each called out.
4. Numbers (= current Unit 3, unchanged)
5. Everyday Essentials
6. Greetings and Introduction
7. Basic Responses
8. Polite Expressions
9. Days of the Week — current `time` category (`DAY`/`WEEK`/`MONTH`/
   `YEAR`/`TODAY`) is generic time vocabulary, **not** the 7 weekday
   names (Monday–Sunday). If literal weekdays are wanted, that's new
   content/training data, not a relabel of what exists.
10. Everything else already in the app — just categorize, no reshuffle
    urgency (today's Unit 5 remainder, Unit 6 phrases, Unit 7
    Phrasebook).

**Blocking question before this can become a `data.js` phase:** items
5–8 above are currently one bucket — Unit 4 "Everyday Essentials"
holds all 16 `requests`-category placeholder signs (`PLEASE`, `SORRY`,
`YES`, `NO`, `HELP`, `GOOD`, `BAD`, `WHAT`, `WHERE`, `WHY`, `WATER`,
`FOOD`, `GO`, `COME`, `RESTROOM`, `HUNGRY`) plus `HELLO`/`THANK YOU`.
Splitting that one bucket into 4 named categories needs someone to sort
which specific signs go in Everyday Essentials vs. Greetings vs. Basic
Responses vs. Polite Expressions before any code changes — recommend
Omen sketch that mapping first (mirrors how Rev 4's own planning
session worked before Phase 1 touched `data.js`).

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