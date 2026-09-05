# LinguaWave × SoloLearn DataV2 — Progress Tracker

Companion to `LinguaWave_SoloLearn_Learning_Psychology_DataV2_Integration_Plan.docx`.
This file tracks **what's actually been built**, section by section, so
nobody has to re-read session logs to answer "did we do this yet?"

**How to keep this current:** after any dataV2 work session, update the
status + note for whatever row changed, and add a line to the Session
Log at the bottom (same convention as this repo's own `AI_MEMORY.md`).
Don't rewrite history — append.

**Status legend**

| Symbol | Meaning |
|---|---|
| ✅ Done | Built and verified (see note for how) |
| 🔄 Partial | Built, but with a known simplification or gap |
| ⬜ Not started | Nothing built yet |
| 🚫 Not planned | Deliberately not doing this (non-goal) |

---

## 1. Rollout phases (plan §7)

| Phase | Status | Note |
|---|---|---|
| **Phase 0** — Isolated scaffolding (`js/data-v2.js`, feature flag, default OFF) | ✅ Done | `js/data-v2.js` created, `lw-datav2-enabled` localStorage flag, never imported by `data.js`/`progress.js`. |
| **Phase 1** — One pilot mission, behind the flag, dev-only | ✅ Done | Built against REAL content (Unit 4 "Greetings" / `essentials_greetings`, all 9 signs) — not the plan's placeholder `hello`/`m01` ids. Dev preview at `pages/datav2-preview.html`, reachable only via Settings → Developer (`?dev=1`). |
| **Phase 2** — Internal comparison (completion rate / drop-off vs. current system) | 🔄 Partial | Built `js/data-v2-compare.js` + `pages/datav2-compare.html`. **Caveat:** this repo has no analytics backend, so it's a same-browser, single-session local observation tool, not an aggregate multi-user A/B test. Nobody has actually *read* the comparison output yet to make a go/no-go call. |
| **Phase 3** — Decide before expanding; migrate remaining missions | 🔄 Partial | Schema work is done for all 65 live categories (`getAllMissions()`/`getMissionForCategory()`). **Caveat:** the plan says this should happen only *after* Phase 2 shows a benefit — that gate was explicitly skipped on request, so the schema exists but **no product decision or content review** has happened on top of it (see §3 below, "content review" row). |

---

## 2. Pattern-by-pattern (plan §3)

| # | Pattern | Status | Note |
|---|---|---|---|
| 3.1 | Micro-lesson chaining (interleave drills across a mission) | ✅ Done | `buildItemsForCategory()` — never two LESSONs in a row, verified across all 65 missions. |
| 3.2 | Scenario-themed practice items | 🔄 Partial | Hand-curated per-sign scenario titles exist **only** for `essentials_greetings` (the pilot). All 64 other categories use a generic template (`Using "<Sign>" — <Category Title>`) — situational in form, but not individually written/reviewed like the plan's §3.2 describes. **Needs a content pass before these are shown to real learners.** |
| 3.3 | Variable, intermittent bonus rewards | ✅ Done | Fixed (non-random, reproducible) subset — curated pick for Greetings, a positional 1-in-3 rule elsewhere. Never on the Mastery Quiz, per plan §6. |
| 3.4 | Dual-horizon progress bars (mission + lesson) | ✅ Done | `getMissionProgress()` / `getLessonProgress()`, rendered as two bars on the preview page, and as the single mission-level bar on `v2-mission-overview.html`. |
| 3.5 | Item ticks + accordion collapse for mastered missions | 🔄 Partial | `ui.collapseMasteredMissions` flag exists in the schema; **not actually wired into any real Learn-page UI** — only visualized item-by-item on the dev preview page. |
| 3.6 | Recognition-based input + progressive distractors | 🔄 Partial | `difficultyRamp: ['2-option', '3-option+distractor']` is present on every PRACTICE item; **not wired into the real quiz/practice rendering** (`js/quiz.js` untouched) — schema-only so far. |
| 3.7 | Motivational framing / intro moment before a mission | 🔄 Partial | `introMoment.pitch` exists for every mission; only Greetings has a hand-written pitch + illustration id. Other 64 use a generic one-liner. |
| 3.8 | Lesson Takeaways (recap + next-lesson teaser) | ✅ Done | `getRecap()` generates recap bullets at runtime from real completed LESSON items; `nextTeaser` is static copy (curated for Greetings, generic elsewhere). |
| 3.9 | Always-visible, low-stakes help ("Need a hint?") | 🔄 Partial | `ui.hintAvailableOn` config exists and is shown on the dev preview page; **not wired into the real Recall/Apply/Quick Check UI** (`js/lesson.js`/`js/quiz.js` untouched). |
| 3.10 | Hearts shown throughout (not just at Mastery Quiz) | 🔄 Partial | `ui.showHeartsOn: 'everyLessonScreen'` config exists. A REAL Hearts module now exists (`getHeartsState()`/`consumeHeartForMastery()` in `js/data-v2.js`) and is rendered live on `v2-mission-overview.html` — but only there; it is not yet shown on every lesson screen as the config name implies, and real hearts logic still doesn't touch `js/quiz.js`/`js/lesson.js`. |
| 3.11 | Visible economy — recommendation: XP only, no second currency | ✅ Done (decision recorded) | No gem/second-currency concept anywhere in the schema, per plan §6 non-goal. Nothing to build here — the recommendation itself *is* the deliverable. |
| 3.12 | Social proof via discussion counts | 🔄 Reserved, not active | `ui.discussionCount: null` field reserved in the schema per the plan's own instruction; stays hidden until there's a real number to show. Not a gap — this is exactly what the plan asked for at this stage. |
| 3.13 | Non-blocking monetization nudge | 🚫 Not planned | Explicit non-goal per plan §6 — no PRO tier exists or is planned. Nothing to track. |
| 3.14 | Terminal reward escalation (path-completion celebration) | ⬜ Not started | No dedicated "finished the whole path" screen exists yet — scoped for after more than one mission is real, which hasn't happened. |
| 3.15 | Identity & meta-progression (streaks) | ✅ Done | Real (non-fake) `currentStreak`/`longestStreak`/`streakForgivenessRemaining` calculator over its own `lw_datav2_streak_v1` key, verified with 1-day and 3-day-consecutive test cases. Not yet rendered anywhere but the dev preview page. |

---

## 3. Cross-cutting / infrastructure

| Item | Status | Note |
|---|---|---|
| Isolation (dataV2 never modifies `data.js`/`progress.js`) | ✅ Done | Confirmed by design and by the Node harness (loads real `data.js`/`progress.js` untouched). |
| Feature flag default OFF | ✅ Done | `lw-datav2-enabled`, default OFF, toggle hidden behind Settings `?dev=1`. |
| Dev preview UI (all missions browsable) | ✅ Done | `pages/datav2-preview.html` — mission picker added Phase 3, defaults to Greetings. |
| Phase 2 comparison dashboard | ✅ Done (as a tool) | `pages/datav2-compare.html` — but see Phase 2 caveat above: nobody has used it to make a real decision yet. |
| Content review of 64 non-Greetings scenario titles | ⬜ Not started | Explicitly flagged as needed before real learners see anything but Greetings. |
| Wiring dataV2 config into the REAL lesson/quiz/learn UI (hints, hearts, distractors, accordion) | ⬜ Not started | Everything in §2 marked "schema-only" above is config that exists but has no effect on `js/lesson.js`/`js/quiz.js`/`js/learn.js` yet. This is the actual "migration," not just data. The new Hearts module is real logic, but it lives entirely in `js/data-v2.js` + the new V2 pages — it still does not touch `js/quiz.js`. |
| Real analytics backend for a true Phase 2 A/B comparison | 🚫 Not available | Doesn't exist anywhere in this repo; Phase 2 is local-observation only until/unless one is built. |
| Go/no-go decision on expanding past the pilot | ⬜ Not started | Per the plan's own §7 Phase 3 framing, this should happen before real learners see any non-Greetings mission — schema being *ready* isn't the same as this decision being *made*. |

---

## 4. Files (current state)

| File | Status |
|---|---|
| `js/data-v2.js` | New (Phase 0/1) → generalized (Phase 3) → timestamps added (Phase 2) → Hearts module added (Mission Overview session) |
| `js/data-v2-preview.js` | New (Phase 1) → mission picker added (Phase 3) |
| `pages/datav2-preview.html` | New (Phase 1) → mission picker markup added (Phase 3) |
| `css/datav2-preview.css` | New (Phase 1), unchanged since |
| `js/data-v2-compare.js` | New (Phase 2) |
| `js/data-v2-compare-page.js` | New (Phase 2) |
| `pages/datav2-compare.html` | New (Phase 2) |
| `css/datav2-compare.css` | New (Phase 2) |
| `pages/settings.html` | Modified (Phase 1: hidden dev block) → modified (Phase 2: second link) |
| `js/settings-page.js` | Modified (Phase 1: `initDataV2DevBlock()`) |
| `LinguaWaveV2/pages/v2-dashboard.html`, `v2-learn.html` | New (base-format pass) |
| `LinguaWaveV2/pages/v2-mission-overview.html` | New (Mission Overview session) |
| `LinguaWaveV2/js/v2-dashboard.js`, `v2-learn.js` | New (base-format pass) → routing updated to `v2-mission-overview.html` (Mission Overview session) |
| `LinguaWaveV2/js/v2-mission-overview.js` | New (Mission Overview session) |
| `LinguaWaveV2/css/v2-app.css` | New (base-format pass) → Mission Overview/Hearts styles added (Mission Overview session) |
| `js/data.js`, `js/engine/progress.js`, `js/learn.js`, `js/lesson.js`, `js/quiz.js` | **Untouched** — by design, per the plan's "non-destructive" principle |

---

## 5. Open questions before going further

1. **Content:** who writes/reviews real scenario titles + intro pitches for the other 64 categories, and on what timeline?
2. **Decision:** has anyone actually opened `datav2-compare.html`, played through Greetings both ways, and looked at the numbers? Phase 3's schema work got done ahead of this per an explicit request — the decision itself is still open.
3. **Real wiring:** if/when the decision is "yes, expand" — the next real work is wiring `ui.hintAvailableOn`/`ui.showHeartsOn`/`difficultyRamp`/`collapseMasteredMissions` into the actual `js/lesson.js`/`js/quiz.js`/`js/learn.js`, which is a bigger and riskier change than anything done so far (those files have been deliberately untouched this whole project).
4. **Analytics:** is a real backend event pipeline worth building at all, or does this stay a solo/small-team project where local observation is good enough?
5. **10 missions vs. 65 categories:** the implementation guide's V2 section specifies one continuous path of exactly 10 numbered missions. dataV2's schema (and now `v2-learn.html`) has 65 — one per live category, unrenumbered. Someone needs to decide whether the 65 map onto the 10 (several categories per numbered mission), whether the path is genuinely all 65, or whether "10" was aspirational/illustrative in the guide. Building Mission Overview / Lesson / Mastery Quiz screens without this answer risks building the wrong shape twice — `v2-mission-overview.html` numbers missions 1–65 for now, same open risk.
6. **Mission-detail screens:** Mission Overview (§6) is now built (`v2-mission-overview.html`) — number/title, goal, "You'll practice" chips, an estimated-effort figure, the mastery requirement, and a live Mastery Hearts display. The guide's Lesson Architecture (§7–8) and a dedicated Mastery Quiz screen (§9) still don't exist as V2 pages — "Start Mission"/"Start Mastery Quiz" hand off to the existing `pages/lesson.html`/`pages/quiz.html` for now. That's the natural next build once question 5 is answered.
7. **Heart consumption timing:** `consumeHeartForMastery()` is currently called when the Mission Overview launches the Mastery Quiz (attempt *start*), not when the quiz is *submitted*, because `pages/quiz.js` remains untouched by design. Fixing this properly means adding a submit-time hook to `pages/quiz.js` — a small, contained change, but still a change to a file this project has deliberately left alone so far.

---

## Session Log

*(mirrors `AI_MEMORY.md`'s own convention — terse, one entry per session)*

| Date | What happened | Files |
|---|---|---|
| 09-05 | Phase 0 + Phase 1: isolated `data-v2.js` + feature flag + one real pilot mission (Greetings) + dev preview page + hidden Settings toggle. | `js/data-v2.js`, `js/data-v2-preview.js`, `pages/datav2-preview.html`, `css/datav2-preview.css`, `pages/settings.html`, `js/settings-page.js` |
| 09-05 | Phase 2 + Phase 3: generalized mission builder to all 65 live categories; added completedAt timestamps + drop-off tracking; built the Phase 2 comparison tool/dashboard. Verified against real `data.js`/`progress.js` via Node harness. Content review + real UI wiring + the actual go/no-go decision remain open (see §5). | `js/data-v2.js`, `js/data-v2-preview.js`, `pages/datav2-preview.html`, `js/data-v2-compare.js`, `js/data-v2-compare-page.js`, `pages/datav2-compare.html`, `css/datav2-compare.css`, `pages/settings.html` |
| 09-05 | **File layout change, no behavior change:** moved every dataV2 file (`js/data-v2*.js`, `css/datav2-*.css`, `pages/datav2-*.html`) out of the real app's shared folders into a new top-level `LinguaWaveV2/` folder — see its `README.md`. Fixed the two moved pages' relative asset paths accordingly. Added a second, visible entry point — a dashed-outline "LinguaWave V2" link + "WIP" badge in the real app's sidebar nav (`pages/dashboard.html`/`learn.html`/`progress.html`/`settings.html`/`feedback.html`) — alongside (not replacing) the original hidden `?dev=1` block, so the team doesn't need the query param while actively iterating. Both entry points are explicitly commented as temporary/removable. This row is infrastructure only — doesn't change status on any §1–§3 row above; still no content review of the 64 non-Greetings categories, still no real UI wiring into `js/lesson.js`/`js/quiz.js`/`js/learn.js`, still no go/no-go decision made. | `LinguaWaveV2/` (all files, moved), `LinguaWaveV2/README.md` (new), `css/style.css`, `pages/dashboard.html`, `pages/learn.html`, `pages/progress.html`, `pages/settings.html`, `pages/feedback.html` |
| 09-05 | **Bugfix — broken relative paths after the folder move above.** `pages/datav2-preview.html`/`datav2-compare.html` still pointed `../css/style.css`, `../js/data.js`, `../js/engine/progress.js`, and `settings.html?dev=1` only ONE level up, which was correct before the move but wrong after it (the pages now sit one folder deeper, under `LinguaWaveV2/pages/`). Result in practice: `css/style.css` 404'd silently (unstyled/plain preview page), and `js/data.js` 404'd silently → `window.LWData` undefined → the preview showed "No categories found" + "js/data.js did not load — cannot build the pilot mission." Fixed by adding the missing `../` per README.md's own documented path convention. No schema/logic changes. | `LinguaWaveV2/pages/datav2-preview.html`, `LinguaWaveV2/pages/datav2-compare.html` |
| 09-05 | **First real (non-dev-only) V2 pages, base-format pass.** Built `v2-dashboard.html` + `v2-learn.html` on the SAME app shell (sidebar/header/`.card`/`.badge`/`.progress-bar` tokens from `css/style.css`) the v1 app uses, per the implementation guide's §4.2/§4.3 structure — Continue-Your-Mission hero, Today's Summary tile, Your Learning Journey rail, and a full searchable mission list with number/title/goal/status-pill/progress/chevron rows. All content is live from `window.LWDataV2.getAllMissions()` / `window.LWData` — no hardcoded names or percentages. Updated the real app's sidebar "LinguaWave V2" link (5 pages) to point here instead of straight at `datav2-preview.html`, so the loud entry point now leads to the actual product pages; the dev preview/compare tools are unchanged and still reachable via Settings → Developer (`?dev=1`). **Scope, explicitly not done:** Mission Overview, Lesson, Mastery Quiz, Hearts, Review System (guide §6–12) — "Continue Learning" and each path row still hand off to the existing `pages/lesson.html`/`pages/quiz.html`. **Open decision carried forward, not resolved:** the guide's V2 section specifies a fixed 10-numbered-mission path; `v2-learn.html` currently shows all 65 live-category missions dataV2 already builds, unrenumbered — this still needs the same content/product decision flagged in §5 below, just now visible on a real page instead of only the dev preview. | `LinguaWaveV2/pages/v2-dashboard.html` (new), `LinguaWaveV2/pages/v2-learn.html` (new), `LinguaWaveV2/js/v2-dashboard.js` (new), `LinguaWaveV2/js/v2-learn.js` (new), `LinguaWaveV2/css/v2-app.css` (new), `pages/dashboard.html`, `pages/learn.html`, `pages/progress.html`, `pages/settings.html`, `pages/feedback.html` |
| 09-05 | **Mission Overview page + Hearts module — closes part of §5 open question 6.** Added `v2-mission-overview.html` (guide §6/§5.1): mission number/title, goal, "You'll practice" sign chips, an explicitly-labeled effort *estimate*, the mastery requirement, and a live Mastery Hearts display, sourced entirely from `window.LWDataV2`/`window.LWData`. Added a real Hearts module to `js/data-v2.js` (`getHeartsState()`/`consumeHeartForMastery()`, own `lw_datav2_hearts_v1` key, 3-heart pool with a 4-hour-per-heart refill, verified in a Node harness including the zero-hearts case) — guide §10's "keep all learning activities available, gate only the next Mastery Quiz attempt" rule is respected: hitting zero hearts disables only the Start-Mastery-Quiz action, lesson/practice links stay open. `v2-learn.html` rows and `v2-dashboard.html`'s Continue Learning / journey cards now route through this page instead of straight to `pages/quiz.html`. **Known limitation, stated in the code, not hidden:** the guide's spec is "consume a heart on Mastery Quiz *submit*"; `pages/quiz.js` is still deliberately untouched (see prior rows), so this page consumes the heart on attempt *start* instead — true submit-time consumption needs a `js/quiz.js` change that's still out of scope. **Also explicitly not built:** the "Know some already?" diagnostic challenge (guide §6) — shown as a disabled "Coming soon" button rather than faked. Verified in a Node harness against the real `data.js`/`data-v2.js`: all 65 missions load; Greetings still resolves 9 unique signs and a reasonable estimate; hearts pool starts at 3/3, drops correctly on `consumeHeartForMastery()`, floors at 0 rather than going negative, and an individual lost heart's timestamp correctly refills independently after its own 4-hour window (simulated by advancing the stored timestamp, not real wall-clock time). Also confirmed `getElementById('v2-mo-start-quiz')` — injected via `innerHTML` then queried right after — is a valid render-then-wire reference, not a missing id, same discipline as this repo's established convention. **Not done:** no real browser/jsdom click-through (no registry access in this environment, same caveat as every prior dataV2 session); content review of the 64 generic scenario titles and the actual go/no-go decision remain open. | `LinguaWaveV2/pages/v2-mission-overview.html` (new), `LinguaWaveV2/js/v2-mission-overview.js` (new), `LinguaWaveV2/js/data-v2.js` (Hearts module added), `LinguaWaveV2/css/v2-app.css`, `LinguaWaveV2/js/v2-learn.js`, `LinguaWaveV2/js/v2-dashboard.js` |
