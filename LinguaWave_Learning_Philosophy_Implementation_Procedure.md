# LinguaWave — Implementation Procedure for the Learning-Philosophy Curriculum

**Source of the pedagogy:** Section 3 of `LinguaWave_Visual_Structure_and_Implementation_Guide.docx` —
the seven-stage rhythm printed across the top of Figure 1:

> **LEARN → OBSERVE → RECALL → PRACTICE → APPLY → REVIEW LATER → UNLOCK**

This is not a new curriculum of *content* — the alphabet/word/phrase curriculum in `js/data.js`
stays exactly as-is. It's a curriculum of **learning psychology**: the sequence of cognitive steps
a learner should move through for *every* sign, instead of the current "watch → quiz → next"
shortcut. This document is the step-by-step procedure for retrofitting that psychology into the
existing LinguaWave codebase (from the repomix export) without breaking the standing architecture.

---

## 0. Preflight — rules this procedure must not violate

Your own repo already enforces a discipline for exactly this kind of change. Confirmed from
`AI_MEMORY.md`, `PIVOT_CHECKLIST.md`, and `REV8_TEACHING_AUDIT.md`:

| Rule | Why it matters here |
|---|---|
| `js/auth.js` is out of scope | The loop touches lesson/review UI only — never open auth.js. |
| No new progress/order algorithm; no curriculum reordering | Review-scheduling logic must sit **beside** `js/engine/progress.js`, not inside its unlock/order functions. |
| Additive over rewrite | Rev 7 and Rev 8 both kept `data.js`'s `UNITS`/`SIGNS` shape and `lesson.html`'s page mechanism untouched — this pass should too. |
| Smallest edit surface | Rev 8 shipped the whole teaching-rhythm tightening across **3 files**. Use that as the benchmark per stage, not a rewrite of `lesson.js`. |
| uid-scoped local storage | `lw_progress_v3` reconciles against `user.uid`. The audit in `REV8_TEACHING_AUDIT.md` §5 found a real cross-account leak in a feature that skipped this. Any new stored state (review due-dates, confidence scores) must follow the same `uid` pattern from day one. |
| One Session Log line after each session | `date — what changed — files touched`, appended to `AI_MEMORY.md`. |

**Read before writing any code:** `AI_MEMORY.md` → `PIVOT_CHECKLIST.md` → `SYSTEM_ARCHITECTURE.md`
(Rev 7 section), in that order — exactly as the repo's own header instructs.

---

## 1. Lock the open decisions first (guide §1.3)

The two reference boards disagree with each other in a few places. Building against an
unresolved conflict is how you get rework. Pick one answer per row **before Phase 1 starts**
and write the decision into `SYSTEM_ARCHITECTURE.md`:

1. **"Mission" vs "Level"** — the guide uses both for the same concept in different panels. The
   repo already uses `level` (basic/medium/intermediate) and `UNITS`/`CATEGORIES` internally —
   decide whether learner-facing copy says "Mission" (Figure 2 language) or keeps "Level/Unit"
   (current app language), and use that word everywhere new copy is written.
2. **Percentage progress-bar gradient vs. the 4-color status legend** — the guide is explicit
   that these are two separate systems (§2, "Status color legend"). Confirm no new UI reuses the
   semantic green/orange/blue/gray legend as a continuous gradient.
3. **"Review" as its own sidebar destination** (guide §11) — this procedure assumes yes, since
   Phase 3 below adds Review Today/Session/Results pages that need a home. If the team decides
   Review stays nested under Progress instead, adjust Phase 3's nav step accordingly.
4. **"Try Again" placement** in empty vs. error states (guide §6) — confirm before writing the
   shared system-states component in Phase 5.

---

## 2. Gap analysis — current loop vs. the seven-stage rhythm

Read directly from `js/lesson.js`'s existing functions (`showQuickCheck`, `startMotionRecording`,
`startAssessment`, `handleAssessmentFrame`, `showFeedback`, `markCurrentSignPracticed`):

| Stage | Current state in the repo | Gap | Target file(s) |
|---|---|---|---|
| **Learn** | Sign name + description + image render on page load. | None — already matches guide §4.4. | — |
| **Observe** | Video player with timeline exists on the same page. | None functionally, but there's no separate "watch, then proceed" gate — it's just present alongside Learn content. | `pages/lesson.html`, `js/lesson.js` (`boot`) |
| **Recall** | Rev 8 added a "recall question format" to the Quick Check cluster, but the guide's Recall Practice (§5.3 — "close your eyes, try to remember, then reveal") is a distinct screen/step that doesn't exist yet. | Missing a genuine pre-reveal recall gate before the answer is shown. | New: recall step inside `js/lesson.js`, reusing `buildQuickCheckQuestion` |
| **Practice** | Camera practice exists (`bootDetectionEngine`, `startMotionRecording`, `handlePracticeFrame`) and is already optional (`Continue Without Camera` per guide §4.6). | None — already matches. | — |
| **Apply** | Nothing — no context-usage step exists anywhere in `lesson.js` or `data.js`. | Full gap. Needs Context Practice (guide §5.4). | New: `pages/context-practice.html` or an in-page step, `js/lesson.js` |
| **Review Later** | `progress.js` tracks `recordSignPracticed`/assessments, but there is no due-date, confidence score, or dedicated Review flow. | Full gap. Needs Review Today/Session/Results + Mistake Review (guide §5.5–5.9). | New: `js/engine/review.js`, `pages/review.html` (+ session/results states) |
| **Unlock** | `isCategoryUnlocked`/`isLevelUnlocked`/`gatesClearedBefore` already gate progression. | Functionally present, but not **communicated** to the learner as "Unlock" — no "You can now: …" ability statement (guide §5.8). | `js/quiz.js` or a new Mission Results view, reading existing `getLevelStats` |

This table is the actual scope. Three stages already exist and need no new engineering — the
real work is Recall (tighten), Apply (build), Review Later (build), Unlock (surface).

---

## 3. Phased procedure

Follow the guide's own §14 order, since it already sequences bug fixes before new features and
main-flow polish before additions — do not reorder it to build Review Later before Phase 1's
fixes land, or the new screens will inherit the same hydration/scroll bugs.

### Phase 1 — Fix experience-breaking issues (prerequisite for everything else)

These aren't optional cleanup — Review Later and Apply both add new page loads and new stored
state, which is exactly where the existing bugs (flicker, scroll reset, dark scrollbar) would
otherwise multiply.

1. **Hydration flicker** — audit every page that renders a name/stat before `whenProgressReady()`
   resolves; replace hardcoded fallback strings with a loading skeleton. Files: `dashboard.js`,
   `progress-page.js`, `lesson.js`.
2. **Sidebar reset/scroll** — confirm `restoreCourseSidebarScroll`/`bindCourseSidebarScrollSave`
   fire correctly when a new "Review" nav item is added in Phase 3 (below) — this is the moment
   a new sidebar entry could reintroduce the bug.
3. **Theme-aware scrollbar** — fix now, since Phase 3/4 add new scrollable panels (Review list,
   Recall/Context cards) that must inherit the fix, not repeat the bug.
4. **Reduce assessment popups** — confirm `showQuickCheckModal`/`showFeedback` already follow the
   guide §4.7 "inline check, not full-screen popup" rule; if not, fix before Recall (Phase 2)
   adds a second, distinct pre-reveal interaction that would compound the popup problem.
5. **Lock the Mission-vs-Level decision** from Section 1 above before writing any new copy.

**Exit check:** re-run the four bugs in `PIVOT_CHECKLIST.md`'s existing format; all four marked
fixed and verified before Phase 2 starts.

### Phase 2 — Tighten the existing loop (Learn → Observe → Recall → Practice)

1. **Recall gate.** In `js/lesson.js`, insert a step between Observe and the existing Quick
   Check: show the prompt "Try to remember the sign" (guide §5.3 wording) with a single
   **Show Sign** button and a plain-text **"I need a hint"** link underneath it (not a second
   button — the guide is explicit this is a conflict point already resolved in the board).
   Reuse `buildQuickCheckQuestion` for the reveal content rather than writing a parallel question
   generator.
2. Keep `startMotionRecording`/camera Practice exactly where it is — sequence becomes
   Learn → Observe (video) → Recall (new) → Practice (existing, still optional).
3. Update `updateLessonMeta`'s header logic only if the added Recall step changes the visible
   step-count (guide §4.4's "3/6" indicator) — otherwise leave `lesson.html`'s header untouched.
4. Do **not** touch `data.js`, `progress.js`, or unlock logic in this phase — this is a page-flow
   change only, mirroring how Rev 8 did the same kind of tightening in exactly 3 files.

**Exit check:** one sign's full loop, start to finish, walks Learn → Observe → Recall →
Practice without a page reload between steps, and `progress.js`'s existing
`recordSignPracticed` still fires at the same point it always did.

### Phase 3 — Build Apply and Review Later (the two real gaps)

**Apply (Context Practice):**
1. New lightweight step, reachable from the end of a lesson's Practice stage: a one-line scenario
   (guide example: *"You meet someone and want to introduce yourself."*), the prompt *"What would
   you sign first?"*, three lettered option cards, an outlined **Check Answer** button.
2. Content source: add a small `CONTEXT_SCENARIOS` structure to `data.js`, keyed by `signId` or
   `categoryId` — same editing pattern as `SIGNS`/`QUESTIONS`, so it drops into Firestore later
   the same way the rest of `data.js` is designed to.
3. Wire correctness into the *existing* `recordSignPracticed`/assessment recording path — do not
   create a second, parallel scoring mechanism.

**Review Later:**
1. New file `js/engine/review.js` — deliberately separate from `progress.js` (per the "no new
   progress/order algorithm" rule — this is a scheduler that *reads* progress data, it does not
   reorder or gate the curriculum). Minimum viable fields per the guide's own scope note (§5.5):
   last-reviewed date, incorrect-answer count, a confidence score, a review-due flag.
2. Store review state uid-scoped from the start (e.g. `lw_review_v1`, following the exact
   `lw_progress_v3` pattern with a `uid` field and reconciliation check) — this is the specific
   mistake `REV8_TEACHING_AUDIT.md` flags in the personalization feature; don't repeat it.
3. New pages, reusing existing CSS/component patterns rather than new styles:
   - **Review Today** (`pages/review.html`) — "Review Today — N signs ready," one row per sign,
     status dot on the existing green/orange/blue scale, "Start Review Session" button.
   - **Review Session** — "Review: [SIGN]," 4-point confidence scale (😟😐🙂😄), same page or a
     modal state, writing back into `review.js`'s confidence field.
   - **Review Results** — "Review Complete!," 3-column strong/needs-practice/not-remembered
     breakdown, "Back to Path."
   - **Mistake Review** — a filtered view over the same `review.js` data for signs missed in the
     most recent quiz, not a separate data source.
4. Sidebar: add **Review** as its own nav item per the Section 1 decision, next to Dashboard ·
   Learn · Progress · Feedback · Settings. Verify against Phase 1's scroll-state fix immediately.

**Exit check:** Review Today correctly surfaces signs from real `progress.js` data (no mock
values), and a full Review Session round-trip updates `review.js` state without touching
`progress.js`'s unlock/order functions.

### Phase 4 — Surface Unlock explicitly

1. Confirm existing `isCategoryUnlocked`/`gatesClearedBefore`/`getLevelStats` already compute
   what's needed — this phase is presentation, not new logic.
2. Build **Mission Results** (guide §5.8): "Mission Complete! 🎉" + mission title, then a
   "You can now:" list of concrete ability statements (e.g. "greet someone," "say goodbye")
   derived from the signs just completed, then "Next Mission." Source the ability copy from the
   sign/category metadata already in `data.js` rather than inventing a new content table.
3. On `pages/progress.html`, prefer the Mastered / Learning / Needs Review model the guide
   recommends (§4.10) over a single percentage, built from `review.js` + `progress.js` data
   together.

### Phase 5 — Supporting system polish

Only after Phases 1–4 are functionally complete:
1. Loading/empty/error/success states for every new screen from Phases 3–4, applying the
   Section 1 "Try Again" placement decision.
2. Responsive behavior for the new pages (stack, full-width, drawer nav) per guide §7.
3. Confirm the new pages use the shared semantic theme tokens (`--bg`, `--surface`, `--primary`,
   etc.) rather than hardcoded colors — this is also where the scrollbar fix from Phase 1 gets
   verified on the new scrollable Review list.
4. Accessibility pass (focus rings, keyboard nav, reduced motion, text alongside color) across
   every screen touched in Phases 2–4.
5. Notification bell (guide §2) — explicitly scoped as Phase-4-or-later in the guide itself;
   fine to defer past this pass entirely if time is short.

---

## 4. Documentation handoff (repo convention — do this every phase, not just at the end)

After each phase:
1. Append one line to `AI_MEMORY.md`'s Session Log: `date — what changed — files touched`.
2. Update `PIVOT_CHECKLIST.md` with the phase's items marked done/not-done.
3. Add a short section to `SYSTEM_ARCHITECTURE.md` describing what changed and why, in the same
   terse style as the existing Rev 7/Rev 8 sections — this is what let this analysis reconstruct
   the whole project's history from three files instead of guessing.

---

## 5. One-paragraph summary of the whole procedure

Fix the four known bugs first, because the new screens would otherwise inherit them. Then
tighten the existing per-sign loop by inserting one new Recall step between Observe and
Practice — no new files, three files touched, the way Rev 8 already did the last pass like this.
Then build the two genuinely missing stages, Apply and Review Later, as additive
features that read from `progress.js` but never modify its ordering or unlock logic, storing any
new state with the same uid-scoping discipline `progress.js` already uses. Then surface the
Unlock stage as a "You can now" ability statement instead of a bare percentage, using data the
unlock functions already compute. Polish system states, responsiveness, theming, and
accessibility last, and write down every decision in the same three docs the project already
maintains for exactly this purpose.
