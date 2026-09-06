# Integration Patch (v2 — corrected) — wiring the Learning Philosophy loop into the real app

This supersedes the original `INTEGRATION_PATCH.md`. It was produced by extracting the actual
repo from the repomix export and checking every `FIND` block against it byte-for-byte. Five
things in the v1 patch didn't hold up; all five are fixed below. See "What changed from v1" at
the bottom for the diff and the reasoning.

Every `FIND` block below is quoted **verbatim** and confirmed to appear **exactly once** in the
named file. New files (from this bundle) go in the same paths shown by their folders:
`js/engine/reviewEngine.js`, `js/engine/learningLoop.js`, `pages/review.html`, `css/review.css`,
`js/review-page.js` — these four are unchanged from v1 and were already verified correct.

---

## 1. `pages/lesson.html` — load the two new engines + add Recall/Apply panels

**Script tags** — find the existing engine include and add the two new ones right after it:

```html
<!-- FIND (existing, do not remove) -->
  <script defer src="../js/engine/progress.js"></script>

<!-- ADD immediately after it -->
  <script defer src="../js/engine/reviewEngine.js"></script>
  <script defer src="../js/engine/learningLoop.js"></script>
```

(v2 fix: `learningLoop.js` now carries `defer` too — v1 left it non-deferred for no reason, which
made it execute in a different relative order than every other engine script.)

**Recall panel** — v2 fix: v1's anchor ("the `<!-- ── QUICK CHECK ... -->` comment") actually
matches the *second*, unrelated QUICK CHECK comment (the correct-answer takeover modal, which
sits *after* `#quick-check-card`), not the one before it — inserting there put Recall in the
wrong place. The real, verbatim, unique anchor is the closing markup of the Observe (video)
block, right before the *first* QUICK CHECK comment:

```html
<!-- FIND (verbatim, appears once) -->
            <p class="alert alert--info lesson-video-tip mt-4">
              💡 Watch the movement once, then try to remember it before replaying.
            </p>
          </div>

<!-- REPLACE WITH (same text, plus the new Recall card right after it) -->
            <p class="alert alert--info lesson-video-tip mt-4">
              💡 Watch the movement once, then try to remember it before replaying.
            </p>
          </div>

          <div class="card mt-8" id="recall-card" tabindex="-1" style="display:none;">
            <span class="section__eyebrow" style="margin-bottom:0;">🧠 Recall</span>
            <p class="mt-2" id="recall-prompt">Close your eyes or look away. Try to remember the sign.</p>
            <button class="btn btn--primary mt-3" id="btn-recall-show">Show Sign</button>
            <p class="mt-2"><a href="#" id="recall-hint-link" style="display:none;">I need a hint</a></p>
            <p class="text-muted mt-2" id="recall-hint-text" style="display:none;"></p>
            <div id="recall-reveal" style="display:none;">
              <img id="recall-reveal-image" alt="" style="max-width:100%; border-radius: var(--radius-md); margin-top: var(--space-3);" />
              <p class="mt-2" id="recall-reveal-description"></p>
            </div>
          </div>
```

This means Recall lands right after Observe and right *before* the existing Quick Check card —
that's a real, achievable placement given the actual DOM order (Quick Check already sits above
the camera/Practice panel in this file; see "What changed from v1" for why the original
Learn→Recall→Practice→Apply→Quick Check sequence in v1's checklist wasn't actually achievable
without restructuring the whole page, which is out of scope for an additive patch).

**Apply panel** — this anchor was already verbatim-correct in v1 (`</div><!-- /camera-panel -->`
appears exactly once), so it's unchanged, but the CSS classes inside it are fixed (see item 1a
below for why):

```html
<!-- FIND (verbatim, appears once) -->
        </div><!-- /camera-panel -->

<!-- REPLACE WITH -->
        </div><!-- /camera-panel -->

        <div class="card mt-8" id="apply-card" tabindex="-1" style="display:none;">
          <span class="section__eyebrow" style="margin-bottom:0;">🗣️ Apply</span>
          <p class="mt-2" id="apply-scenario"></p>
          <p style="font-weight:600;" id="apply-question">What would you sign first?</p>
          <div class="apply-card__options mt-3" id="apply-options"></div>
        </div>
```

Note the container class is `apply-card__options`, **not** `quiz-options` — see item 1a.

### 1a. `css/lesson.css` — new fix, wasn't in v1 at all

v1's Apply card used `.quiz-options`/`.quiz-option` — classes that only exist in `css/quiz.css`,
which `lesson.html` never loads (confirmed: its only stylesheets are `style.css`, `lesson.css`,
`lesson-camera.css`, `toast.css`). Applied as-is, the Apply buttons would render with no border,
no grid, no correct/wrong color states — just bare text. `lesson.css` already establishes the
right pattern for this exact problem (see its own comment above `.quick-check__options`,
explaining why Quick Check's options are restated locally instead of pulling in quiz.css). Apply
needs the same treatment, under its own namespace:

```css
/* ── ADD to the end of css/lesson.css ──────────────────────────────
   Apply (Context Practice) — NEW, Learning Philosophy rework.
   Same reasoning as the Quick Check block above: lesson.html doesn't
   load quiz.css, so this is deliberately NOT .quiz-option — a
   separate .apply-card__ namespace, visually matched to Quick
   Check's own restated .quick-check__ options. */
.apply-card__options { display: grid; grid-template-columns: 1fr; gap: var(--space-3); }
.apply-card__option {
  padding: var(--space-3) var(--space-4); background: var(--clr-surface-2);
  border: 2px solid var(--clr-border); border-radius: var(--radius-md);
  color: var(--clr-text); font-size: var(--fs-sm); font-family: var(--font-body);
  text-align: left; cursor: pointer;
  transition: border-color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease);
}
.apply-card__option:hover:not(:disabled) { border-color: var(--clr-accent); background: var(--clr-accent-soft); }
.apply-card__option:disabled { cursor: default; opacity: .85; }
.apply-card__option--correct { border-color: var(--clr-success); background: var(--clr-success-soft); }
.apply-card__option--wrong   { border-color: var(--clr-red);     background: var(--clr-red-soft); }
```

---

## 2. `js/lesson.js` — drive the Recall and Apply panels

### 2a. Seed a review record + mark mistakes from Apply

Unchanged from v1 — this FIND block is verbatim-confirmed at the real `markCurrentSignPracticed`
definition inside `setupNavButtons()`:

```js
// FIND
  function markCurrentSignPracticed() {
    if (!isNameDrill) window.LWProgress?.recordSignPracticed?.(level, category, sign);
  }

// REPLACE WITH
  function markCurrentSignPracticed() {
    if (!isNameDrill) window.LWProgress?.recordSignPracticed?.(level, category, sign);
    if (!isNameDrill) window.LWReview?.seedSign?.(sign);
  }
```

### 2b. New functions — add near `buildQuickCheckQuestion`/`showQuickCheck`

Same as v1, **except** the Apply function's class names are fixed to match the new
`.apply-card__` CSS from item 1a:

```js
/** RECALL stage — guide §5.3. Shown once per sign, before Quick Check. */
function showRecallCard() {
  const card = document.getElementById('recall-card');
  if (!card || isNameDrill) return;

  const data = window.LWLearningLoop?.buildRecallPrompt?.(level, sign);
  if (!data) { card.style.display = 'none'; return; }

  card.style.display = '';
  document.getElementById('recall-prompt').textContent = data.prompt;

  const hintLink = document.getElementById('recall-hint-link');
  const hintText = document.getElementById('recall-hint-text');
  if (data.hint) {
    hintLink.style.display = '';
    hintLink.onclick = (e) => {
      e.preventDefault();
      hintText.textContent = data.hint;
      hintText.style.display = '';
      hintLink.style.display = 'none';
    };
  } else {
    hintLink.style.display = 'none';
  }

  document.getElementById('btn-recall-show').onclick = () => {
    const reveal = document.getElementById('recall-reveal');
    document.getElementById('recall-reveal-description').textContent = data.revealDescription;
    const img = document.getElementById('recall-reveal-image');
    if (data.revealImage) { img.src = data.revealImage; img.style.display = ''; }
    else { img.style.display = 'none'; }
    reveal.style.display = '';
  };
}

/** APPLY stage — guide §5.4. Shown after Practice, before Prev/Next. */
function showApplyCard() {
  const card = document.getElementById('apply-card');
  if (!card || isNameDrill) return;

  const data = window.LWLearningLoop?.buildApplyPrompt?.(level, category, sign);
  if (!data) { card.style.display = 'none'; return; }

  card.style.display = '';
  document.getElementById('apply-scenario').textContent = data.scenario;

  const optionsEl = document.getElementById('apply-options');
  const letters = ['A', 'B', 'C'];
  optionsEl.innerHTML = data.options.map((opt, i) => `
    <button type="button" class="apply-card__option" data-correct="${opt.correct}">
      <strong>${letters[i]}.</strong> ${opt.signId}
    </button>`).join('');

  optionsEl.querySelectorAll('.apply-card__option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const correct = btn.dataset.correct === 'true';
      optionsEl.querySelectorAll('.apply-card__option').forEach((b) => (b.disabled = true));
      btn.classList.add(correct ? 'apply-card__option--correct' : 'apply-card__option--wrong');
      if (!correct) window.LWReview?.recordMistake?.(sign);
    }, { once: true });
  });
}
```

**Deviation from the Procedure doc, flagged intentionally:** the Procedure's Phase 3 says Apply
should "wire correctness into the *existing* `recordSignPracticed`/assessment recording path."
This patch doesn't do that — a wrong Apply answer only calls `window.LWReview.recordMistake()`,
a separate mechanism, same as v1. Apply is explicitly formative here (like Quick Check), so this
is a reasonable choice, but it's a real deviation from what the Procedure doc specifies and
should get its own `AI_MEMORY.md` line if you proceed with it as-is.

### 2c. Call both from `boot()` — find the existing call to `showQuickCheck()`

Unchanged from v1 — verified to appear exactly once, inside `updateLessonMeta()`:

```js
// FIND (the existing call site)
  showQuickCheck();

// REPLACE WITH
  showQuickCheck();
  showRecallCard();
  showApplyCard();
```

---

## 3. `js/quiz.js` — record mistakes + surface Unlock ability statements

Unchanged from v1 — both FIND blocks verified verbatim, appearing exactly once each.

### 3a. Record a mistake when a quiz question is answered wrong

```js
// FIND (inside selectAnswer(), right after the roundResults bookkeeping)
  const correct = btn.dataset.option === q.signId;
  if (correct) roundResults[round.key].correct++;

// REPLACE WITH
  const correct = btn.dataset.option === q.signId;
  if (correct) roundResults[round.key].correct++;
  else window.LWReview?.recordMistake?.(q.signId);
```

### 3b. "You can now: …" ability statements on a passed assessment

```js
// FIND
  if (resultsActionsEl) resultsActionsEl.innerHTML = buildActionButtons(passed);

// REPLACE WITH
  if (passed && resultsMsgEl && window.LWLearningLoop) {
    const signIds = window.LWData?.getCategorySigns?.(level, categoryId) || [];
    const abilities = window.LWLearningLoop.getAbilityStatements(signIds);
    if (abilities.length) {
      const list = document.createElement('ul');
      list.className = 'mt-3';
      list.innerHTML = `<li style="font-weight:600; list-style:none;">You can now:</li>` +
        abilities.map((a) => `<li>${a}</li>`).join('');
      resultsMsgEl.insertAdjacentElement('afterend', list);
    }
  }
  if (resultsActionsEl) resultsActionsEl.innerHTML = buildActionButtons(passed);
```

Note: for a final level assessment (`isFinal === true`), `categoryId` is `null` by design (see
quiz.js's own early-return guard), so `getCategorySigns(level, null)` returns `[]` and no
ability list renders there — that's an acceptable no-op, not a bug, but worth knowing.

Add `<script defer src="../js/engine/learningLoop.js"></script>` and
`<script defer src="../js/engine/reviewEngine.js"></script>` to `pages/quiz.html`, next to its
existing `<script src="../js/engine/progress.js"></script>` include.

**v2 fix:** `pages/quiz.html`'s existing `progress.js` include has **no** `defer` attribute
(unlike `lesson.html`'s, which does) — it's a plain `<script src="../js/engine/progress.js">`.
Add `reviewEngine.js`/`learningLoop.js` as plain (non-defer) scripts too, immediately after it,
to match quiz.html's actual convention rather than copying lesson.html's:

```html
<!-- FIND (verbatim, in pages/quiz.html) -->
  <script src="../js/engine/progress.js"></script>

<!-- REPLACE WITH -->
  <script src="../js/engine/progress.js"></script>
  <script src="../js/engine/reviewEngine.js"></script>
  <script src="../js/engine/learningLoop.js"></script>
```

---

## 4. Sidebar — add "Review" as its own nav item (guide §11's decision)

**v2 fix:** v1 listed `pages/quiz.html` among the pages to patch. It has no `app-sidebar` at
all — just a top `<nav class="navbar">` — so there's nothing to insert there. Dropped from the
list below.

On these five pages only — `pages/dashboard.html`, `pages/learn.html`, `pages/progress.html`,
`pages/feedback.html`, `pages/settings.html` — find the existing Progress link and add Review
right after it. **The exact class attribute differs by file** (confirmed by direct inspection),
so match the right variant:

**`dashboard.html` and `settings.html`** (`class="app-sidebar__link"`, no trailing space):

```html
<!-- FIND -->
        <a href="progress.html" class="app-sidebar__link">
          <span class="app-sidebar__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span>
          Progress
        </a>

<!-- ADD immediately after it -->
        <a href="review.html" class="app-sidebar__link">
          <span class="app-sidebar__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg></span>
          Review
        </a>
```

**`learn.html` and `feedback.html`** (`class="app-sidebar__link "`, trailing space): same FIND
text but with `class="app-sidebar__link "` (trailing space before the closing quote) instead.

**`progress.html`** (the Progress link already carries `app-sidebar__link active`): find
`class="app-sidebar__link active"` instead, and insert the same Review link after it, without
the `active` class.

**v2 scope note (replaces v1's badge claim):** `pages/review.html` already has its own copy of
this sidebar with a `#review-sidebar-count` badge, populated by `review-page.js`'s `boot()` —
that only runs on `review.html` itself. The plain link above (added to the other five pages)
intentionally does **not** include a due-count badge, because populating it there would require
loading `reviewEngine.js` on every one of those five pages just for a sidebar number — a bigger
edit surface than this patch's scope. If you want the badge everywhere, that's a deliberate
follow-up, not a one-line addition; the verification checklist below reflects the smaller, real
scope.

---

## 5. `js/progress-page.js` — make "Review Today" real instead of the honest stub

Unchanged from v1 — FIND block verified verbatim:

```js
// FIND
function renderReviewEntry() {
  const actionsEl = document.querySelector('[data-review-actions]');
  if (!actionsEl || !window.LWProgress) return;

  const learned = window.LWProgress.getAllLearnedSigns();
  const recent = [];
  for (let i = learned.length - 1; i >= 0 && recent.length < REVIEW_ENTRY_LIMIT; i--) {
    if (learned[i]?.level) recent.push(learned[i]);
  }

  if (recent.length === 0) {
    actionsEl.innerHTML = '<span class="btn btn--ghost" aria-disabled="true">Practice a sign to unlock Review</span>';
    return;
  }

  actionsEl.innerHTML = recent.map(entry => {
    const signTitle = window.LWData?.getSign?.(entry.level, entry.signId)?.title ?? entry.signId;
    const href = `lesson.html?level=${encodeURIComponent(entry.level)}&category=${encodeURIComponent(entry.category)}&sign=${encodeURIComponent(entry.signId)}`;
    return `<a class="btn btn--secondary btn--sm" href="${href}" data-review-link>↺ ${escapeHtml(signTitle)}</a>`;
  }).join('');
}

// REPLACE WITH
function renderReviewEntry() {
  const actionsEl = document.querySelector('[data-review-actions]');
  if (!actionsEl || !window.LWProgress) return;

  const learned = window.LWProgress.getAllLearnedSigns().filter(e => e?.level);
  const knownSignIds = learned.map(e => e.signId);
  const due = window.LWReview ? window.LWReview.getDueSigns(knownSignIds) : [];

  if (due.length === 0) {
    actionsEl.innerHTML = learned.length === 0
      ? '<span class="btn btn--ghost" aria-disabled="true">Practice a sign to unlock Review</span>'
      : '<span class="btn btn--ghost" aria-disabled="true">You\'re all caught up!</span>';
    return;
  }

  actionsEl.innerHTML = `<a class="btn btn--secondary btn--sm" href="review.html">↺ Review ${due.length} sign${due.length === 1 ? '' : 's'}</a>`;
}
```

Add `<script defer src="../js/engine/reviewEngine.js"></script>` to `pages/progress.html`, next
to its existing `<script defer src="../js/engine/progress.js"></script>` include (confirmed
verbatim at that location).

### 5a. `#progress-review-due` stat tile — v2 fix, v1 only described this in prose

v1 said to update this "the same way" without giving code. It's inside a *different* function,
`renderHero()`, not `renderReviewEntry()`. Verbatim FIND/REPLACE:

```js
// FIND (inside renderHero(), in js/progress-page.js)
  // See header comment — no real "due" concept exists in the data;
  // this is "how many review shortcuts are currently available."
  const recent = [];
  for (let i = learned.length - 1; i >= 0 && recent.length < REVIEW_ENTRY_LIMIT; i--) {
    if (learned[i]?.level) recent.push(learned[i]);
  }
  const reviewEl = document.getElementById('progress-review-due');
  if (reviewEl) reviewEl.textContent = recent.length;

// REPLACE WITH
  const knownSignIds = learned.filter(e => e?.level).map(e => e.signId);
  const due = window.LWReview ? window.LWReview.getDueSigns(knownSignIds) : [];
  const reviewEl = document.getElementById('progress-review-due');
  if (reviewEl) reviewEl.textContent = due.length;
```

---

## 6. `js/dashboard.js`'s own `renderReviewEntry()` — v2 fix, v1 only described this in prose

v1 said "same patch as Section 5" without giving code, and dashboard.js's copy is formatted
slightly differently from progress-page.js's (an `entry` variable instead of an inline check).
Verbatim FIND/REPLACE against the real file:

```js
// FIND
function renderReviewEntry() {
  const actionsEl = document.querySelector('[data-review-actions]');
  if (!actionsEl || !window.LWProgress) return;

  const learned = window.LWProgress.getAllLearnedSigns();

  const recent = [];
  for (let i = learned.length - 1; i >= 0 && recent.length < REVIEW_ENTRY_LIMIT; i--) {
    const entry = learned[i];
    if (entry && entry.level) recent.push(entry);
  }

  if (recent.length === 0) {
    actionsEl.innerHTML = '<span class="btn btn--ghost" aria-disabled="true">Practice a sign to unlock Review</span>';
    return;
  }

  actionsEl.innerHTML = recent.map(entry => {
    const signTitle = window.LWData?.getSign?.(entry.level, entry.signId)?.title ?? entry.signId;
    const href = `lesson.html?level=${encodeURIComponent(entry.level)}&category=${encodeURIComponent(entry.category)}&sign=${encodeURIComponent(entry.signId)}`;
    return `<a class="btn btn--secondary btn--sm" href="${href}" data-review-link>↺ ${escapeHtml(signTitle)}</a>`;
  }).join('');
}

// REPLACE WITH
function renderReviewEntry() {
  const actionsEl = document.querySelector('[data-review-actions]');
  if (!actionsEl || !window.LWProgress) return;

  const learned = window.LWProgress.getAllLearnedSigns().filter(e => e && e.level);
  const knownSignIds = learned.map(e => e.signId);
  const due = window.LWReview ? window.LWReview.getDueSigns(knownSignIds) : [];

  if (due.length === 0) {
    actionsEl.innerHTML = learned.length === 0
      ? '<span class="btn btn--ghost" aria-disabled="true">Practice a sign to unlock Review</span>'
      : '<span class="btn btn--ghost" aria-disabled="true">You\'re all caught up!</span>';
    return;
  }

  actionsEl.innerHTML = `<a class="btn btn--secondary btn--sm" href="review.html">↺ Review ${due.length} sign${due.length === 1 ? '' : 's'}</a>`;
}
```

Add `<script defer src="../js/engine/reviewEngine.js"></script>` to `pages/dashboard.html`, next
to its existing `<script defer src="../js/engine/progress.js"></script>` include (confirmed
verbatim at that location).

---

## Verification checklist (v2 — corrected to match what this patch actually produces)

- [ ] A full lesson walk-through now shows, in this real order: Learn/Observe (existing) →
      **Recall** (new, blind-then-reveal) → Quick Check (existing, unchanged position) →
      Practice (existing, still optional) → **Apply** (new, context scenario) → Prev/Next.
      *(This is not the same order the v1 checklist claimed — see "What changed from v1.")*
- [ ] Apply's option buttons are visibly styled (bordered cards with hover/correct/wrong states),
      not bare unstyled text — confirms the `.apply-card__` CSS from item 1a loaded correctly.
- [ ] Getting an Apply question wrong writes a mistake into `lw_review_v1`
      (check via `window.LWReview.getSignRecord(<signId>)` in devtools).
- [ ] `pages/review.html` loads, shows due signs pulled from real progress data (no mock
      values), and a full Review Session round-trip updates confidence.
- [ ] Passing a category assessment in `quiz.html` now shows a "You can now: …" list before the
      existing action buttons.
- [ ] "Review" appears in the sidebar on `dashboard.html`, `learn.html`, `progress.html`,
      `feedback.html`, and `settings.html` (not `quiz.html`, which has no sidebar), and doesn't
      reset scroll/theme state when clicked.
- [ ] The `#progress-review-due` stat tile on `progress.html` and the "Review Today" card's
      count both reflect real `getDueSigns()` output, not the old "3 most recent" placeholder.
- [ ] `js/auth.js`, `js/data.js`'s `SIGNS`/`CATEGORIES`/`UNITS` arrays, and `progress.js`'s
      unlock/order functions are all byte-for-byte unchanged.

**Not covered by this patch, on purpose (see Section 4's scope note):** a due-count badge in the
sidebar on every page. Only `review.html`'s own sidebar shows one. Also not covered: the
Procedure doc's Phase 1 (hydration flicker / sidebar scroll / scrollbar / popup fixes) — nothing
in this patch or its predecessor touches those, even though the Procedure doc calls them a
prerequisite. Recommend doing that pass before shipping this one, per the doc's own ordering.

---

## What changed from v1 (for the record / `AI_MEMORY.md` line)

1. **Apply card CSS** — was reusing `.quiz-option`/`.quiz-options`, which don't exist on
   `lesson.html` (quiz.css is never loaded there). Now uses a new `.apply-card__` namespace in
   `lesson.css`, matching the file's own established pattern for this exact problem.
2. **`quiz.html` dropped from the sidebar patch list** — it has no `app-sidebar` shell to patch.
3. **Recall panel anchor corrected** — v1's anchor text matched the wrong comment block and would
   have inserted Recall in the wrong place. Now anchored to the real, unique end of the Observe
   block. Order in the checklist corrected to match what's actually achievable without
   restructuring the page.
4. **Due-count badge claim removed** for the five plain sidebar links — it was never actually
   wired up outside `review.html`. Scope explicitly noted instead of silently under-delivering.
5. **`progress-review-due` stat tile and `dashboard.js`'s `renderReviewEntry()`** — v1 described
   both only in prose ("update the same way," "same patch as Section 5"). Both now have real,
   verbatim FIND/REPLACE blocks against the actual files.

Also flagged, not fixed (judgment calls, not bugs): Apply's wrong-answer handling doesn't feed
into `recordSignPracticed()` as the Procedure doc's Phase 3 specifies (Section 2b), and Phase 1's
prerequisite bug fixes were never done before this Phase 2/3 work, contrary to the Procedure
doc's own stated ordering.
