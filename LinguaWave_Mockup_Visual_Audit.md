# LinguaWave — Mockup vs. Current Implementation: Visual Audit

Source mockup: `1788149250908_image.png` (12 screens + "Extra UI Elements" strip)
Repo audited: `LinguaWave-an-Interactive-Sign-Language-Learning-System-for-Beginners` (current `main`)

Legend: ✅ matches closely · 🟡 partial / needs polish · ❌ missing or structurally different

---

## 1. Homepage (mockup) — public landing page
**Mockup:** Top nav = `LinguaWave | Dashboard  Learn  About  [Sign In]`. Single hero: "Learn to Sign. Connect. Communicate." + subcopy + `Start Learning` / `Explore ASL` buttons + hand illustration, right. Below: 3-card "Why Learn ASL?" row (Communicate / Easy to Learn / Track Progress). Nothing else.

**Current file:** `index.html` (this is the actual entry point — there is no separate logged-out "homepage"; `pages/homepage.html` is for *authenticated* users, see below).

| Element | Status | Note |
|---|---|---|
| Nav bar | 🟡 | Current nav is just `Logo · Log In · theme toggle` — no `Dashboard / Learn / About` links (correct, since a logged-out visitor can't reach those), but doesn't visually match the mockup's 4-item nav. |
| Hero copy | 🟡 | Current: "Learn ASL — one sign at a time." / capstone eyebrow. Mockup: "Learn to Sign. Connect. Communicate." Different headline, same intent. |
| Hero CTAs | 🟡 | Current has `Get Started Free` + `Log In` (scrolls to inline auth card). Mockup has `Start Learning` / `Explore ASL` as two clearly separate buttons with no inline auth form — auth is presumably a separate `Sign In` flow. |
| Inline auth card in hero | ❌ | Current embeds the whole login/register form directly in the hero grid. Mockup shows **no auth form on this screen at all** — sign-in is a nav-bar action/separate flow. This is the single biggest structural difference on this page. |
| Hand illustration | ❌ | Mockup has a soft-line illustration of two hands signing, right side of hero. Current hero has no illustration — right column is entirely the auth card. |
| "Why Learn ASL?" 3-card row | ❌ | Not present. Current page instead has: Topic Preview chips → Why LinguaWave (3 cards, different copy/icons than mockup) → About ASL (4 cards) → Closing CTA. Current page is ~5 sections long; mockup screen is one hero + one 3-card row. |

**Verdict:** Current `index.html` is a much longer marketing page serving a different content strategy (topic preview + full ASL primer) than the mockup's short single-hero landing page. If matching the mockup exactly is the goal, this needs a real rebuild: pull the auth form out of the hero into a `Sign In` nav action/modal, add the hand illustration, and either trim the page down to hero + 3-card row, or keep the extra sections but reorder/restyle the top to match.

---

## 2. Dashboard
**Mockup:** Left sidebar (Dashboard/Learn/Progress/Quiz/Feedback/Settings). "Welcome back, Learner! 👋" header. "Continue Learning" card (Greetings → Hello, 60% complete, progress bar, ▶ Continue Lesson button) + a "Your Progress" side card (60% Overall Progress ring, 12 Signs Learned, 3 Quizzes Completed). Below: "Learning Path" list with per-level rows showing `X/Y` fraction + chevron.

**Current file:** `pages/dashboard.html` + `js/dashboard.js`

| Element | Status | Note |
|---|---|---|
| Sidebar nav | 🟡 | ✅ Dashboard/Learn/Progress/Feedback/Settings icons present and match mockup's icon-rail style closely. ❌ **Mockup sidebar includes a "Quiz" item; current sidebar has no direct Quiz link** (quiz is only reached via in-lesson/in-path CTAs). |
| Welcome header | ✅ | `Your Dashboard` / "Keep going, {name}!" — same idea, slightly different copy from mockup's "Welcome back, Learner! 👋". Easy copy tweak if literal match wanted. |
| Continue Learning card | ✅ | `.continue-card` with icon, eyebrow, title, progress bar + fill, CTA button — structurally matches mockup's hero card closely. |
| Side "Your Progress" mini-card next to Continue card | ❌ | Mockup places a compact ring+stats card **beside** the Continue card (two-column hero row). Current layout puts Overall Progress as its own **full-width section below** the Continue card, not side-by-side. Layout differs: mockup = 2-col hero row; current = stacked sections. |
| Overall Progress stat strip | 🟡 | Present (`dash-heading--secondary` + stat cards per `PIVOT_CHECKLIST`/dashboard.js), but confirm the 3 stat values match mockup's exact set: Overall % ring, Signs Learned count, Quizzes Completed count. |
| Learning Path list | ✅ | Present as compact per-unit rows — matches mockup's `Level 1 — Alphabet & Numbers   8/10 ›` row style conceptually. |

**Verdict:** Closest match of all pages. Main gaps: no Quiz sidebar item, and the Progress summary is stacked below instead of side-by-side with Continue Learning.

---

## 3. Learn Page (Learning Path)
**Mockup:** Sidebar + "Learning Path" header + "Choose a level to start learning." subcopy. A **flat vertical list of Level rows** (Level 1–6), each expandable/clickable, with one row (`Alphabet (A–Z)` `Completed`, `Numbers (0–10)` `Continue`) shown expanded under Level 1.

**Current file:** `pages/learn.html` + `js/learn.js`

| Element | Status | Note |
|---|---|---|
| Sidebar | ✅ | Matches. |
| Header | 🟡 | Current: `📖 Your ASL Learning Path` (with emoji). Mockup: plain `Learning Path` + subcopy line. Minor copy/icon diff. |
| List structure | 🟡 | Needs direct comparison — confirm current `learn.js` renders a single **flattened Level→Category accordion list** (Rev 4's "single continuous trail," per `AI_MEMORY.md`) matching the mockup's Level-row-with-expandable-children pattern, vs. any leftover tab/level-switcher UI from pre-Rev-4 designs. |
| Right-side "sidebar progress/continue" panel | ❌ | Mockup screen 3 shows **no second right-hand panel** — just the single-column level list. Current `learn.html` comment mentions `#learn-sidebar-progress` / `#learn-sidebar-continue`, implying an extra panel not present in the mockup. Confirm whether that's intentional extra functionality to keep, or should be removed/hidden to match. |

---

## 4. Lesson Page — Learn Sign
**Mockup:** No left sidebar — simple top bar (`← Back to Learn` ... `Level 2 - Basic Communication` ... `6/28`). Big sign name ("HELLO"), photo/video thumbnail left, numbered "How to perform the sign" steps right, "QUICK CHECK" mini quiz strip at bottom (3 answer chips, one pre-highlighted green).

**Current file:** `pages/lesson.html`

| Element | Status | Note |
|---|---|---|
| No sidebar, simple top nav | ✅ | Current uses `<nav class="navbar">`, not the app-sidebar — correctly matches the mockup's minimal lesson-page chrome (this is *not* a bug; lesson/quiz intentionally opt out of the app shell). |
| `← Back to Learn` + level/progress counter | 🟡 | Need to confirm `course-sidebar`/header markup shows the `Level X - Category  N/Total` counter in the same top-bar position as the mockup, rather than only inside the `course-sidebar` aside. |
| Sign title + numbered instructions layout | 🟡 | Confirm `#lesson-title` + "How to form this sign" section renders as **numbered steps (1/2/3)** like the mockup, not a plain paragraph — worth checking `css/lesson.css` for a `.step-list` / ordered-list style. |
| Quick Check strip inline on this same screen | 🟡 | Mockup shows the Quick Check answer chips **directly under the instructions, same screen** (screen 4), separate from the standalone "Quick Check Feedback" confirmation screen (screen 7). Confirm `lesson.html` renders Quick Check inline like this, with one option pre-styled green/correct as a static mock state. |

---

## 5. Lesson Page — Video Demonstration
**Mockup:** Same minimal top bar, centered video player card with play controls, timestamp, fullscreen icon, and a tip callout below (💡 "Practice in a well-lit area and keep your hand visible.").

**Current file:** `pages/lesson.html` (`<h3>Video Demonstration</h3>` section, confirmed present at line ~200)

| Element | Status | Note |
|---|---|---|
| Section exists | ✅ | Confirmed present. |
| Tip callout under video | 🟡 | Confirm a styled tip banner (`💡 Tip: …`) exists under the video in current markup/CSS — not confirmed from headings scan alone. |

---

## 6. Lesson Page — Camera Practice (optional)
**Mockup:** Two-column: live camera feed (with a red "● Recording" chip) on the left, a result card on the right (`Recognition Result: Hello — 92% Accuracy — "Great job!"` + a bulleted Tips list: keep hand in frame / use good lighting / position hand clearly) + `Stop Practice` button.

**Current file:** `pages/lesson.html` (`<h2>Live Camera</h2>` section) + `css/lesson-camera.css` (495 lines) + `js/lesson.js`

| Element | Status | Note |
|---|---|---|
| Live camera section exists | ✅ | Substantial dedicated CSS file already exists for this. |
| "● Recording" indicator chip | 🟡 | Confirm this exact visual exists (vs. a generic "camera active" state). |
| Side-by-side Recognition Result card (label + confidence % + "Great job!" microcopy) | 🟡 | `CLAUDE_TASKS.md`'s button-text bug item (`'🎥 Practice Check (optional)'`) implies this general flow exists, but the specific **result card with a big colored label + accuracy % + Tips bullet list** shown in the mockup should be checked against current markup — this is a fairly specific layout that's easy to miss even if the underlying detection logic is solid. |
| `Stop Practice` button | 🟡 | Confirm exact label match (vs. e.g. "Stop Camera" / "Close"). |

**This is the single most likely screen to need real markup work** — the mockup's result card (colored label, %, tips list) is a distinct component that may not exist yet even if camera capture itself works.

---

## 7. Quick Check Feedback (standalone confirmation)
**Mockup:** Full-screen-ish centered confetti/checkmark card: green circular checkmark icon, "Correct!", "This sign means 'Hello'. You're doing great!", `Continue` button, `View Explanation` link below.

**Current file:** Not confirmed as a distinct component — likely an inline state within `lesson.html`'s Quick Check strip (screen 4) rather than its own full-card takeover.

| Element | Status | Note |
|---|---|---|
| Standalone full-card "Correct!" state (separate from the inline quiz strip) | ❌ / 🟡 | This needs direct confirmation. If Quick Check answers are currently graded inline (chip turns green, no full-card takeover), this is a **missing state**, not just a style gap. |
| Confetti/decorative dots | ❌ | No evidence of a confetti-style success animation anywhere in the CSS scan. |
| `View Explanation` secondary link | ❌ | Not confirmed to exist. |

---

## 8. Quiz Page
**Mockup:** No sidebar, top bar `← Back to Learn` + red progress bar + `3/10`. "What does this ASL sign mean?" + image, then a **2×2 grid of lettered options** (A/B/C/D) with one pre-highlighted green (correct/selected state).

**Current file:** `pages/quiz.html` + `css/quiz.css`

| Element | Status | Note |
|---|---|---|
| Top navbar (no sidebar) | ✅ | Matches — quiz.html correctly uses the minimal navbar, not the app shell. |
| Progress bar + `N/Total` counter | 🟡 | Confirm current progress bar renders as the mockup's thin red/coral bar with a numeric counter beside it, not just a percentage label. |
| 2×2 lettered option grid (A/B/C/D) | 🟡 | This is a very specific layout choice — confirm `quiz.html`'s option markup renders as a 2-column grid with `A/B/C/D` badges, not a vertical list. |
| Optional Camera Check section | ➕ | Current `quiz.html` includes `<h2>🎥 Optional Camera Check</h2>` — this is **extra functionality not shown in the mockup's Quiz screen at all**. Not a gap, but worth flagging: the mockup's quiz flow may be simpler (MC-only) than what's actually built. Keep it — just note the mockup doesn't visually spec this state. |

---

## 9. Quiz Feedback
**Mockup:** Same "Correct!" checkmark card pattern as screen 7, but titled/framed as Quiz Feedback: "This sign means 'Hello'. Well done!", `Continue`, `View Explanation`.

**Current file:** `pages/quiz.html` (`<h2 id="results-title">You passed! 🎉</h2>` confirmed)

| Element | Status | Note |
|---|---|---|
| Results screen exists | ✅ | `#results-title` confirmed. |
| Per-question "Correct!" card (mockup screens 7 & 9 look like the *same reusable component*, one for lesson Quick Check, one for quiz) | 🟡 | Current `results-title` sounds like an **end-of-quiz summary** ("You passed!"), not a **per-question** "Correct!" card shown after each answer. If so, this is a structural gap: the mockup wants immediate per-answer feedback (screen 9), separate from a final pass/fail summary. Worth confirming which one(s) `quiz.js` currently implements. |

---

## 10. Progress Page
**Mockup:** Sidebar + "Your Progress" header. Row of: 65% ring, `24 Signs Learned`, `5 Quizzes Completed` stat cards, plus a "Progress by Level" bar-list (Level 1–4, percentages). Below: "Recent Activity" feed (Learned Hello — Today / Completed Quiz: Greetings — Yesterday / Practiced Thank You — 2 days ago).

**Current file:** `pages/progress.html`

| Element | Status | Note |
|---|---|---|
| Sidebar | ✅ | Matches. |
| 65% ring (`.progress-hero-ring`) | ✅ | Confirmed present, conic-gradient ring, matches mockup's ring almost exactly. |
| Signs Learned / Quizzes Completed stat cards | 🟡 | Need to confirm both exact stat cards exist beside the ring. |
| "Progress by Level" bar list | 🟡 | Not confirmed in the heading scan — check for a per-level horizontal bar list matching the mockup's Level 1–4 rows. |
| "Recent Activity" feed | ❌ | Not found in the structural scan (no `recent-activity`-style heading turned up). This looks like a genuinely **missing section** — a timestamped activity list is a distinct, checkable feature, not just a style difference. |

---

## 11. Feedback Page
**Mockup:** Sidebar + "We value your feedback!" header. "How was your experience?" — 5 emoji-rating buttons (Very Easy → Very Difficult). "Would you recommend LinguaWave?" Yes/Maybe/No pill buttons. Optional comments textarea. `Skip for now` + `Submit Feedback` buttons.

**Current file:** `pages/feedback.html` + `js/feedback.js`

| Element | Status | Note |
|---|---|---|
| Sidebar | ✅ | Matches. |
| Header | 🟡 | Current: `How was your experience?` as the `<h1>`. Mockup uses `We value your feedback!` as the big header, with "How was your experience?" as a **sub-question above the emoji row**. Minor hierarchy/copy swap. |
| 5-emoji rating row | 🟡 | Need to confirm exact 5-option emoji set (Very Easy…Very Difficult) exists vs. a different scale. |
| Yes/Maybe/No recommend row | 🟡 | Confirm this exact second question exists — `CLAUDE_TASKS.md`'s feedback item talks about "q1–q4" validation, suggesting more like 4 questions total, which may or may not map 1:1 to the mockup's 2 visible questions + comments. |
| Dynamic `#level-name` / URL-param-driven copy | ⚠️ | Per `CLAUDE_TASKS.md`, this is a **known, already-flagged bug** (hardcoded "Basic — A–Z Alphabet", not read from `?level=`) — unrelated to the mockup but worth fixing in the same pass since you'll be in this file anyway. |

---

## 12. Profile / Settings Page
**Mockup:** Sidebar + "Profile" header, avatar circle, name/email, `Edit Profile` button. "Preferences" section: Theme (dropdown, "Light"), Notifications (toggle, on), Sound Effects (toggle, on). `Log Out` button at bottom.

**Current file:** `pages/settings.html`

| Element | Status | Note |
|---|---|---|
| Sidebar | ✅ | Matches. |
| Toggle switches | ✅ | `.toggle-switch` component confirmed (3 instances — matches Notifications/Sound Effects, need to confirm the 3rd). |
| Theme control | 🟡 | Current uses a **theme-toggle switch** (`#theme-toggle-settings`, binary light/dark). Mockup shows a **dropdown** (`Theme  [Light ▾]`) — a select-style control, not a toggle. This is a real component-type mismatch, not just styling. |
| Avatar + name/email + Edit Profile | 🟡 | Not confirmed from the heading scan — check the top of `settings.html`'s markup for this profile block. |

---

## Extra UI Elements (bottom strip)
Mockup shows a **standalone component reference sheet**: Primary/Secondary/Icon buttons, 2 progress bar variants (65%/30%), lesson-status pills (Completed/In Progress/Locked), a toast notification ("Great job! You earned 10 XP"), an empty state ("No lessons found. Try another category."), and a Dark Mode preview card.

| Element | Status | Note |
|---|---|---|
| Individual components (buttons, progress bars, status pills, toast, empty state) | ✅ (scattered) | Every individual component almost certainly already exists somewhere in the app — `css/toast.css` exists, `.progress-bar`, `.badge`, `.btn--primary/--secondary` all confirmed in `css/style.css`. |
| A single page/artifact that **catalogs them together** | ❌ | This doesn't exist anywhere in the repo as its own file. It's a documentation/style-guide screen, not a functional app page — lowest priority for end users, but useful for design QA and onboarding future contributors. |

---

## Summary — Priority Ranking

**Structural gaps (missing states/sections, not just styling):**
1. Quiz page needs a **Quick Check sidebar item** (mockup screens 2–3 show it; current sidebar doesn't).
2. Screens 7 & 9 ("Correct!" full-card feedback) — confirm whether this exists as a **standalone takeover component** at all, both after Quick Check and after each quiz question, vs. only an end-of-quiz summary.
3. Progress page's **"Recent Activity" feed** — not found; looks genuinely missing.
4. Homepage's **inline auth form** vs. mockup's separate `Sign In` nav action + hand illustration — biggest single structural difference in the whole audit.
5. Settings' **Theme control type** (toggle vs. dropdown) — small but a real component swap, not CSS.
6. Camera Practice's **Recognition Result card** (label + % + tips list) — likely the most work-intensive UI gap since it pairs with live ML output, not just static markup.

**Polish-only gaps (confirm & tighten, likely quick):**
- Learn page header copy/icon, Feedback page header hierarchy, Dashboard's Continue-card/Progress-card side-by-side layout, Quiz option grid shape (2×2 vs list), Lesson page's numbered-steps styling.

Recommend tackling in this order: **(4) homepage auth restructure → (6) camera result card → (2) Correct! feedback component → (3) recent activity feed → (1) sidebar Quiz link → (5) settings theme dropdown** → sweep the remaining polish items page by page.
