# LinguaWaveV2 — dataV2 pilot (isolated folder)

This folder holds **every file the dataV2 pilot needs**, kept physically
separate from the real app's `pages/`, `js/`, and `css/` folders. Nothing
in here is wired into `js/data.js`, `js/engine/progress.js`, `js/learn.js`,
`js/lesson.js`, or `js/quiz.js` — those files are untouched by design.

For the full status of what's built vs. not, see
`DataV2_LinguaWave_Progress_Tracker.md` at the repo root. This README is
just "what's in this folder and how it's reached" — the tracker is the
source of truth for progress/decisions.

## Why a separate folder

Up through Phase 3, these files lived interleaved with the real app
(`js/data-v2.js` next to `js/data.js`, `pages/datav2-preview.html` next
to `pages/learn.html`, etc.). That worked, but made it harder to see at
a glance which files belong to the pilot vs. the real, shipped app. This
folder makes that split physical, not just a naming convention
(`data-v2*` vs `data*`).

## Contents

```
LinguaWaveV2/
├── pages/
│   ├── datav2-preview.html   Dev-only: browse any of the 65 migrated missions, toggle the flag
│   ├── datav2-compare.html   Dev-only, Phase 2: current system vs. dataV2, one browser/category at a time
│   ├── v2-dashboard.html     REAL product page — mission-based Dashboard (base app shell + live data)
│   └── v2-learn.html         REAL product page — mission-based Learning Path (base app shell + live data)
├── js/
│   ├── data-v2.js            The content layer itself — mission schema, builder, streak calculator
│   ├── data-v2-preview.js    Renders datav2-preview.html
│   ├── data-v2-compare.js    Phase 2 comparison logic (reads lw_progress_v3 + lw_datav2_progress_v1)
│   ├── data-v2-compare-page.js  Renders datav2-compare.html
│   ├── v2-dashboard.js       Renders v2-dashboard.html
│   └── v2-learn.js           Renders v2-learn.html
└── css/
    ├── datav2-preview.css    Styling for the dev preview page only
    ├── datav2-compare.css    Styling for the dev compare page + the mission/category pickers both use
    └── v2-app.css            Styling for the real V2 pages — extends css/style.css tokens, doesn't replace them
```

**Two different kinds of page in this folder, on purpose:** `datav2-preview.html`/
`datav2-compare.html` are internal dev tools — deliberately bare, `noindex`,
reachable only via a hidden `?dev=1` block. `v2-dashboard.html`/`v2-learn.html`
are the actual start of the V2 product rebuild — they use the real app's
sidebar/header/`.card` shell (same as `pages/dashboard.html`) and are what
the sidebar's "LinguaWave V2" link now points to. See
`DataV2_LinguaWave_Progress_Tracker.md` §5 for what's still undecided
(notably: 65 live-category missions vs. the guide's 10-numbered-path spec)
before building the next V2 screens (Mission Overview, Lesson, Mastery Quiz).

## How it's reached right now (two doors, on purpose)

1. **The sidebar** — every page with the real app's left nav (Dashboard,
   Learn, Progress, Settings, Feedback) has a **temporary** "LinguaWave V2"
   link near the bottom, marked with a dashed outline and a "WIP" badge
   so it doesn't read as a finished feature. This is the loud, easy-to-find
   door, added specifically because the team is actively building this out
   and shouldn't have to remember a hidden query param every time.
2. **`pages/settings.html?dev=1`** — the original quiet door from Phase 1,
   still there, still hidden unless you add `?dev=1` to the URL. Also has
   the `dataV2 pilot mission` on/off toggle (the actual feature flag,
   `lw-datav2-enabled` in localStorage) that the sidebar link doesn't.

**Before dataV2 ships or is dropped** (see the tracker's §5 open
questions), remove door #1 — the sidebar `<a class="app-sidebar__link--dev">`
block in each of those 5 pages, and the matching `.app-sidebar__link--dev`
/ `.badge--dev` rules in `css/style.css` §8b. Door #2 can stay as-is
either way (it already assumed it was temporary from Phase 1).

## Path convention

Every file here that needs something from the real app reaches **up two
levels** (`../../css/style.css`, `../../js/data.js`,
`../../js/engine/progress.js`) since `LinguaWaveV2/pages/*.html` sits one
folder deeper than the real app's own `pages/*.html`. Files within this
folder reach each other with a single `../` (`../js/data-v2.js`,
`../css/datav2-preview.css`), same as the real app's own internal
convention — only the "how far up" changed, not the pattern.

## If you delete this folder

Everything genuinely optional lives here. Deleting `LinguaWaveV2/`
entirely and then:

- removing the 5 sidebar `<a class="app-sidebar__link--dev">` blocks,
- removing the hidden `#settings-datav2-dev` block + its script tag in
  `pages/settings.html`, and
- removing the `.badge--dev` / `.app-sidebar__link--dev` rules in
  `css/style.css`

...returns the app to exactly its pre-dataV2 state. No file outside this
folder has any other dependency on it.
