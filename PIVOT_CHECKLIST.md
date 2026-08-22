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