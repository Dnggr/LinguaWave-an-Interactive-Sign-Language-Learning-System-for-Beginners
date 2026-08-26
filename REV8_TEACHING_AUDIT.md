# LinguaWave — Rev 8 Teaching Audit

> **Authority note:** this is a reasoning/handoff document, not a
> canonical source. If it conflicts with `AI_MEMORY.md`,
> `PIVOT_CHECKLIST.md`, or `SYSTEM_ARCHITECTURE.md`, those three win.
> If the implementation changes, update this file — don't let it go
> stale and get trusted as permanent truth.

- **Status:** Analysis complete, both identified fixes implemented +
  verified (§11), and the feature itself has since been **removed
  entirely** (§12, 2026-08-26, separate session). This file is kept as
  the historical reasoning/handoff record for §1–§11; §12 is the final
  update.
- **Date:** 2026-08-26 (audit) / 2026-08-26 (fix implementation) /
  2026-08-26 (removal, separate same-day session)
- **Scope:** Rev 8's personalization card (`#personalize-card`/
  `#personalize-summary`, `initPersonalization()` in `js/lesson.js`) —
  originally *where it should live*, not the Quick Check changes
  (those are settled, low-risk, and not revisited here). Superseded by
  §12: the feature was removed rather than moved.
- **Current decision:** **Personalization removed** (§12). Not moved
  to the Dashboard, not replaced with any other onboarding/preference
  system — removed per explicit request. §1–§11 below are preserved as
  the record of the feature's design, the two bugs found and fixed in
  it, and the reasoning at the time — none of that reasoning was wrong,
  the product decision simply changed after it was written.
- **Open questions:** see §7 — moot now (§12); the Dashboard-move
  question in particular no longer applies to anything, since there's
  no personalization left to move.
- **Architectural constraints:** unchanged from the standing rules in
  `AI_MEMORY.md`'s header — `auth.js` out of scope; no curriculum/
  unlock/ordering changes; no new progress/order algorithm.

---

## 1. Current implementation summary

`initPersonalization()` runs once per page load, from `boot()`, on
every `lesson.html` navigation (each sign is a full page load, not an
SPA route). Two optional questions (audience, daily minutes),
`localStorage`-only (`lw_personalize_v1` + `lw_personalize_skipped_v1`),
rendered as the first children inside `.lesson-content-panel`, above
the sign header. Verified via direct code read (not just the other
docs' claims):

- Confirmed **zero references** to personalization state anywhere in
  `progress.js`, `data.js`, `learn.js`, `dashboard.js`, `quiz.js` —
  the "doesn't touch curriculum/unlocks" claim is accurate.
- `buildQuickCheckQuestion()` and `QUICK_CHECK_CLUSTER_SIZE` changes
  are genuinely extended-not-duplicated — confirmed by reading the
  function directly.
- **The "shown at most once" framing is only half true.** The full
  question *card* shows once. The collapsed one-line *summary* renders
  on every single sign's page load, forever, because `boot()` (and
  therefore `initPersonalization()`) reruns on every navigation. This
  wasn't called out clearly in the other docs and is worth fixing
  regardless of the placement decision (§6).

## 2. Why personalization is currently in the lesson

The Rev 8 task was framed as implementing the reference app's
PERSONALIZE→TEACH→...→CONTINUE *rhythm*. The prior session read this
as a page-level flow and attached PERSONALIZE to the page that already
had the rest of the loop (`lesson.html`, since Rev 4/5), keeping the
edit surface to 3 files per the standing "smallest edit surface"
discipline. It was never checked against **this repo's own** Dashboard/
Learn/Lesson/Quiz role table in `SYSTEM_ARCHITECTURE.md` — that
comparison is the actual gap this audit closes.

## 3. Dashboard vs. Lesson analysis

Dashboard's own charter ("What should I do next?" → next action +
compact summary) is a closer semantic match for "who are you learning
for / how much time do you have" than Lesson's ("teach and practice
*this sign*"). Dashboard also loads once per visit, which suits a
"shown once, editable" preference far better than a page that reloads
per sign.

Against moving now: Dashboard has a **documented history of fighting
clutter** (Session Log 08-21/22 — "de-report-ify," the rule against
saying the same thing three ways), and `dashboard.js`'s own file
header documents multiple past boot-sequence race-condition bugs.
Adding a new init hook there is real risk. Nothing reads the answers
anywhere today, so moving buys zero present user-facing benefit — the
case gets much stronger once/if the answers start shaping Dashboard's
"what's next" copy.

**Conclusion:** Dashboard is the correct *eventual* owner. Not urgent
today. Re-evaluate when the data becomes actionable, not before.

## 4. Efficiency findings

- 3-file edit surface confirmed minimal; no other file touched.
- Quick Check genuinely extended, not duplicated.
- `localStorage` was the right storage *layer* for today's decorative-
  only scope — but its *execution* is incomplete: it doesn't follow
  this repo's own established uid-scoping convention (see §5).
- Real, current weakness: the collected preferences have **no effect
  anywhere** beyond reflecting themselves back as a sentence. This is
  a timing/product gap, not a build-quality one — self-reported
  accurately in `PIVOT_CHECKLIST.md`/`SYSTEM_ARCHITECTURE.md`, and
  confirmed independently here by grep.
- The real inefficiency isn't file count or line count — it's that
  `lesson.js` now owns cross-session learner-profile state that has
  nothing to do with any specific sign on screen.

## 5. Regression / risk findings

- **Cross-account leak (the one concrete bug this audit found):**
  `progress.js`'s own `lw_progress_v3` cache stores a `uid` and
  reconciles it against the logged-in user on every load
  (`hydrateStore()`, `cached.uid === user.uid`). `lw_personalize_v1`
  has no `uid` field and no such check. On a shared browser/device,
  User B can silently inherit or silently suppress User A's
  personalization state on login. Fixable independent of the
  Dashboard question — mirror the existing pattern.
- **Accessibility regression:** the page's own `"Skip to lesson
  content"` skip-link targets `#lesson-content`, whose first child is
  the personalize card/summary — so every keyboard/screen-reader user,
  on every sign, hits personalization chrome before the teaching
  content the skip-link was built to reach. Works against the intent
  of this repo's own accessibility pass.
- **Permanent chrome, not one-time:** direct consequence of
  `initPersonalization()` rerunning on every sign's page load (see §1).
- Curriculum isolation confirmed clean (grep across all 5 relevant
  files) — unit ordering, unlocks, progress, and assessments are
  unaffected.
- Camera/Quick Check/nav/sidebar: no code-path conflicts found.

## 6. Important architectural decisions

- Personalization stays a `localStorage`-only, learner-*context*
  concept — never a proficiency level, never read by unlock/ordering
  logic. Reaffirmed, not changed.
- Do **not** move to Dashboard yet. Revisit once/if the answers are
  actually consumed by "what's next" logic — at that point Dashboard
  becomes the only correct home, and the migration is mechanical
  (same storage key, no shim needed).
- Two in-place fixes are worth doing regardless of future surface,
  independent of the move decision:
  1. uid-scope the storage key, mirroring `progress.js`'s existing
     pattern.
  2. Stop rendering the summary unconditionally on every sign's page
     (e.g. first-sign-of-category only) — resolves both the permanent-
     chrome and skip-link findings without touching Dashboard.

## 7. Decisions that remain unresolved

- Is a shared-device/multi-account usage pattern realistic for this
  product? Still open — determines how much the uid-scoping fix (now
  shipped, §11) actually matters in practice versus being defensive-
  only; doesn't change whether the fix was correct to make.
- ~~Should the collapsed summary persist forever, or show once per
  session?~~ **Resolved by implementation (§11): once per browser
  session**, via `sessionStorage`. Chosen over "first sign of
  category" because real entry points into this page (Continue
  Learning, review links, `?sign=` deep-links) don't reliably land on
  signIdx 0. This was an engineering call made to unblock the fix, not
  a deep product decision — revisit if product feedback says session-
  scoped is still too naggy or not naggy enough.
- Is shaping Dashboard's "what's next" copy from these answers still
  the near-term roadmap, or was this meant to stay decorative? Still
  open — decides whether the Dashboard move is worth scheduling soon
  at all. Unaffected by this session's fixes.

## 8. Recommended next implementation step

Smallest correct next step is **not** the full Dashboard move. It's
the two in-place fixes in §6 — both small, both inside `lesson.js`'s
existing edit surface, both fix a real (not hypothetical) bug. Revisit
the Dashboard move as its own separate task once personalization
answers have an actual consumer.

## 9. Minimal files involved

**This section's original prediction (`js/lesson.js` only) turned out
to be incomplete — see §11.** `pages/lesson.html` also needed a small
change: the session-gate alone still leaves one page load per session
where personalization renders as the literal first child inside the
skip-link's target, so the skip-link's `id="lesson-content"`/
`tabindex="-1"` was retargeted too. Actual files touched:
`js/lesson.js`, `pages/lesson.html`. If/when the Dashboard move
happens: `pages/dashboard.html`, `js/dashboard.js`, `css/dashboard.css`
(add) + `pages/lesson.html`, `js/lesson.js`, `css/lesson.css` (remove).

## 10. Explicit files/systems that must remain untouched

`js/auth.js`, `js/data.js`, `js/engine/progress.js`, `js/learn.js` —
none opened for editing this pass; audit confirms none needed to be.
Still true after implementation (§11) — neither fix touched any of
these four.

## 11. Implementation result — 2026-08-26

Both fixes from §6 implemented, in the files predicted in §9 plus one
(see below). Full narrative also in `AI_MEMORY.md`'s Session Log and
`PIVOT_CHECKLIST.md`'s new "Audit fixes" sub-section — kept terse here
since those two are canonical for the "what changed" record; this
section is about what §1–§8's analysis got right, what it missed, and
what's still uncertain.

**Fix 1 (uid-scoping) — matches §6's recommendation exactly.**
`getCurrentUid()` added, mirrors `window.LWAuth?.getCurrentUser?.()`
(the same access pattern already used elsewhere in `lesson.js`, for
`getLearnerNameLetters()`). `loadPersonalization()`/
`savePersonalization()`/`markPersonalizationSkipped()`/
`wasPersonalizationSkipped()` all now stamp/check `uid`, exactly
mirroring `progress.js`'s `cached.uid === user.uid` shape as §5/§6
recommended. One judgment call §6 didn't spell out: what happens to a
pre-fix record with no `uid` field at all. Decided: treat as
non-matching (same as a different uid), i.e. "not answered" — NOT
auto-adopted by whoever loads it first. This fully closes the leak
window with no transition period, at the cost of every existing
learner seeing the card once more post-fix. Alternative considered and
rejected: auto-adopt a uid-less record for whoever's currently logged
in, which would avoid that one-time re-ask but leaves a real (if
narrow, time-limited) leak window open on shared devices for anyone
who already had pre-fix data — judged not worth it for a fix whose
whole point is closing exactly that leak.

**Fix 2 (stop rendering on every sign) — implemented differently than
§6's parenthetical example.** §6 suggested "first-sign-of-category
only" as an example. Investigated and rejected: this repo's real entry
points into `lesson.html` (Dashboard's Continue Learning hero, the
review entry point, direct `?sign=` deep-links) don't reliably land on
signIdx 0, so gating on it would make the Edit affordance unreachable
in most real sessions — worse than the bug it fixes. Implemented
once-per-browser-session gating instead (`sessionStorage`), which
degrades safely regardless of entry point and self-documents via the
"once per session" language §7 already listed as one of the two
options. The genuinely first-ever (never answered, never skipped) card
is exempt from this gate, unchanged.

**Beyond §6's plan: the skip-link needed a direct fix too.**
Session-gating alone stops the *unconditional, every-sign* rendering,
but on the one page load per session where the summary (or first-ever
card) genuinely does render, it's still the first child inside
`#lesson-content` — the exact structural cause §5 named for the
accessibility regression. Rather than leave that one-load-per-session
edge case as a residual, known gap, retargeted `#lesson-content`
itself: `id`/`tabindex="-1"` moved from the outer `.lesson-layout`
wrapper down onto `.lesson-header`, confirmed (grep) not referenced by
any CSS rule or JS `getElementById`/`querySelector` call, so this is a
pure retarget, not a structural change to anything else. Skip-link now
lands past personalization unconditionally, every load, not just most.

**Verification:** `node --check` clean; HTML tag-balance parse, 0
errors; no duplicate ids introduced; DOM-hook cross-reference clean
(only the same pre-existing `btn-personalize-edit` exception as the
original Rev 8 session). New this pass: a jsdom runtime harness that
executes the real, verbatim-extracted post-fix code against a real DOM
built from the real, post-fix `pages/lesson.html` — 11 groups / 46
assertions, all passing. Notably includes the exact cross-account
scenario §5 described (User B, same localStorage as User A, must not
see or inherit User A's card/skip state, and vice versa) and the exact
multi-navigation scenario §1 described (3 simulated sign page loads in
one session, summary suppressed on loads 2 and 3, reappears on a
simulated new session). **Not browser-tested** — no real keyboard tab-
order or screen-reader pass confirming the skip-link's practical
behavior; the jsdom check confirms DOM structure and `tabindex`
placement only, not actual assistive-tech behavior. Flagged, not
closed, same as every prior session's identical gap.

**Remaining uncertainty, honestly stated:**

- The "re-ask once" cost of the uid-scoping fix (see Fix 1 above) was
  never confirmed with a human — it's the technically-safer of two
  reasonable options, but it IS a small, real behavior change for any
  existing learner with pre-fix saved prefs. Flagged, not separately
  confirmed.
- Once-per-session cadence (Fix 2) is, per §7, an engineering call
  made to unblock the fix — not verified against actual product intent
  for how naggy/quiet this should be.
- No real-browser accessibility verification exists yet for this
  feature at all, before or after this session — the jsdom harness is
  real DOM/interaction coverage but not a substitute for an actual
  screen-reader pass.

---

## 12. Removal — 2026-08-26 (separate session, after §11)

**Why removed.** Explicit product request: the personalization card
("Who do you want to use ASL with?" / "How much time can you
practice?") was no longer wanted on the lesson page. The request was
unambiguous that this is a *removal*, not a redesign — no replacement
onboarding/preference system, and no relocation to the Dashboard (which
§7/§8 above had flagged as the open "next step" question). That
question is now moot: there's nothing left to move. This doesn't
reflect anything wrong with §1–§11's analysis or the two bug fixes
recorded there — the feature was working as designed and as fixed;
the product decision about whether to have it at all simply changed.

**What was deleted.** Everything §11 touched, plus the original Rev 8
markup/CSS:
- `js/lesson.js` — the DOM element refs (`personalizeCardEl` and
  siblings), `PERSONALIZE_STORAGE_KEY`/`PERSONALIZE_SKIPPED_KEY`/
  `PERSONALIZE_SESSION_SHOWN_KEY` and `PERSONALIZE_AUDIENCE_LABELS`,
  every storage/UI function (`getCurrentUid`, `loadPersonalization`,
  `savePersonalization`, `markPersonalizationSkipped`,
  `wasPersonalizationSkipped`, `personalizeSummaryText`,
  `updatePersonalizeSaveEnabled`, `renderPersonalizeSelection`,
  `openPersonalizeCard`, `closePersonalizeCard`,
  `wirePersonalizeControls`, `hasShownPersonalizationChromeThisSession`,
  `markPersonalizationChromeShownThisSession`, `initPersonalization`),
  and the `initPersonalization()` call site inside `boot()`.
- `pages/lesson.html` — `#personalize-card` (both question groups,
  Save/Skip buttons), `#personalize-summary`, and the "LIGHT
  PERSONALIZATION" block comment above them. The skip-link comment at
  the top of `<body>`, which explained the §11 tabindex retarget in
  terms of personalization's DOM position, was trimmed to drop the
  now-dead reasoning — the retarget itself (`tabindex="-1"` on
  `.lesson-header`) was left in place since it's a harmless, unrelated
  accessibility fix, not something the removal needed to revert.
- `css/lesson.css` — the `.personalize-card__*`/`.personalize-summary*`
  rule block.

Confirmed NOT touched: Quick Check (both this Rev 8 session's own
`QUICK_CHECK_CLUSTER_SIZE` change and the picture-prompt format),
camera/MediaPipe pipeline, Prev/Next nav, course sidebar, and —
unchanged from every session above — `js/auth.js`, `js/data.js`,
`js/engine/progress.js`, `js/learn.js`, curriculum/unlock/progress
logic.

**Verification.** `node --check` on the edited `lesson.js`: clean.
HTML tag-balance parse on the edited `lesson.html`: 0 errors. CSS
brace-balance on the edited `lesson.css`: 59/59. Grep for
`personaliz`/`PERSONALIZE_`/`lw_personalize` across all three edited
files: zero remaining matches. DOM-hook cross-reference (every
`getElementById()` call in `lesson.js` resolves to a real static id in
`lesson.html`): clean, no exceptions needed anymore — removing the
personalization functions also removed the one pre-existing
`btn-personalize-edit` dynamic-id exception §9/§11 had to carry. jsdom
runtime harness: 30 structural assertions (every removed id/class
confirmed absent, every kept id — Quick Check, camera, nav, sidebar —
confirmed present, `#lesson-content` confirmed still correctly
targeted) plus a full top-to-bottom execution of the real edited
`lesson.js` (imports stubbed, `boot()`'s auto-invoke suppressed so the
harness only exercises module-level declarations) against the real
edited `lesson.html`, zero runtime errors, and existence/no-throw
checks on the untouched Quick Check/sidebar functions
(`buildQuickCheckQuestion`, `showQuickCheck`, `renderCourseSidebar`,
`updateLessonMeta`, `shuffleArr`, `escapeHtml`) confirming the removal
didn't collaterally break anything they depend on. **Not
browser-tested** — same flagged gap as every session above; no real
keyboard/screen-reader pass confirming the skip-link's post-removal
behavior in an actual browser.

**Remaining uncertainty, honestly stated:**

- The skip-link comment trim (see "What was deleted" above) is a
  documentation-only change — didn't re-verify with a fresh
  keyboard/screen-reader pass that the skip-link still behaves
  correctly now that personalization's gone; structurally nothing
  changed there (same id, same tabindex, same target element), so this
  is treated as low-risk, not zero-risk.
- No product sign-off captured here on whether the Quick Check
  cluster-size/picture-prompt changes from the same Rev 8 session
  should also be reconsidered now that personalization — the other
  half of that session's "teaching rhythm" framing — is gone. Out of
  scope for this removal (explicitly not touched), flagged as a
  reasonable follow-up question, not a decision made either way.