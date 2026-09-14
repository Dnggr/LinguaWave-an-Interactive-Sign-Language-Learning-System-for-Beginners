# LinguaWave — the Missions system

_Renamed from `V2_README.md`. This used to describe the separate
`LinguaWaveV2/` folder the "dataV2 pilot" lived in; that folder has now
been merged into the main app (`pages/`, `js/`, `css/`) and every
`v2-`/`data-v2`/`datav2` file name and identifier was dropped in favor
of plain names. See `AI_MEMORY.md`'s 09-13 "V2 naming removed" entry for
exactly what moved where. This file is rewritten (not append-only, unlike
`AI_MEMORY.md`) since it's describing current layout, not a session log._

For the full status of what's built vs. not, see
`Missions_LinguaWave_Progress_Tracker.md` at the repo root (itself
renamed from `DataV2_LinguaWave_Progress_Tracker.md` — its own session
log below its header is left untouched as history). This README is just
"what's in the app and how it's reached" — the tracker is the source of
truth for progress/decisions.

## Contents

```
pages/
├── dashboard.html          Mission-based Dashboard (base app shell + live data)
├── learn.html              Mission-based Learning Path (base app shell + live data)
├── mission-overview.html   Per-mission detail + live Mastery Hearts
├── orientation.html        The single ungated intro row above the chapter list
├── progress.html           Mission-based Progress (overall %, chapters, Needs Review)
├── lesson.html             Walks one mission's items via the Sign Learning Loop
├── mastery-quiz.html       Native Mastery Quiz, sampled to all 12 chapters (see js/mastery-quiz.js)
├── settings.html           Profile & Preferences (incl. hidden ?dev=1 dev block)
├── feedback.html           Feedback form
├── camera-practice.html    Sign Lesson Viewer + Live Camera Assessment (was pages/lesson.html
│                           pre-rename — the real MediaPipe/TF.js detection engine, untouched)
├── missions-preview.html   Dev-only: browse any of the 65 migrated missions, toggle the flag
└── missions-compare.html   Dev-only: current system vs. missions, one browser/category at a time

js/
├── missions.js               The content layer itself — mission schema, builder, streak + Hearts
├── missions-preview.js       Renders pages/missions-preview.html
├── missions-compare.js       Comparison logic (reads lw_progress_v3 + lw_missions_progress_v1)
├── missions-compare-page.js  Renders pages/missions-compare.html
├── dashboard.js               Renders pages/dashboard.html
├── learn.js                   Renders pages/learn.html
├── mission-overview.js        Renders pages/mission-overview.html
├── progress-page.js           Renders pages/progress.html
├── lesson-loop.js             Sign Learning Loop engine — near-neighbor pairs, duplicate-sign
│                               detection, planForItem()
├── lesson.js                  Renders pages/lesson.html using lesson-loop.js's plan
├── mastery-quiz.js             Renders pages/mastery-quiz.html — sampled to all 12 chapters
├── camera-practice.js          Renders pages/camera-practice.html (was js/lesson.js pre-rename)
├── _test_lesson-loop.node.js   Node test harness for lesson-loop.js (not loaded by any page)
└── _test_missions-sync.node.js Node test harness for the Firestore sync helpers in missions.js

css/
├── missions-preview.css   Styling for the dev preview page only
├── missions-compare.css   Styling for the dev compare page + the mission/category pickers
└── app.css                Styling for the mission pages, including lesson.html — extends
                            css/style.css tokens, doesn't replace them
```

**Two different kinds of page here, on purpose:** `missions-preview.html`/
`missions-compare.html` are internal dev tools — deliberately bare, `noindex`,
reachable only via a hidden `?dev=1` block. Everything else is the real,
shipped product.

**What was deliberately left alone in this rename pass:** a handful of
internal-only identifiers that never render or get typed by a user —
`getSignV2`/`getCategoryV2`/`UNITS_V2`/etc. (missions.js's own forked
content accessors), and the Firestore-facing names `getCurrentUidV2()`,
`pushFieldToFirestoreV2()`, and the `userProgressV2/{uid}` collection
path in `js/missions.js` (this one especially: it's a real Firestore path
real synced accounts may already be writing to, so renaming it is a
data-migration decision, not a cosmetic one — flagged here rather than
done silently). Everything that's visible in a URL, a DOM id/class, a
page title, a localStorage key, or a filename has had "V2"/"dataV2"
removed.
