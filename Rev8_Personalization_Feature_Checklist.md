# LinguaWave — Session Notes (2026-09-03)

Paste this file alongside `linguawave.xml` (repo context) and the current
`capture.html` when starting a new Claude session on this project. It gives
Claude the "why" behind recent changes without having to re-derive it from
the diff alone.

## Context for Claude

This is `capture.html` from the LinguaWave ASL data-capture tool — a
single-file webcam app (MediaPipe Holistic + TensorFlow.js) used to record
training data and train the static-sign and motion-sign classifiers. The
session below made three unrelated rounds of changes to it. Read this before
touching the file again, especially the feature-vector section — it explains
constraints that aren't otherwise obvious from the code.

---

## 1. Deployment + responsive layout

**Problem:** teammate needed to use the tool without setting up Git/GitHub;
separately, the layout broke (columns overlapping/clipping) when the browser
window was narrowed or minimized.

**Fixes in `capture.html`:**
- `.workspace` used to be `height: calc(100vh - 76px)`, hardcoding the
  assumption that the top bar is always exactly one line tall. Narrow
  windows wrap the top bar to two lines, which broke this. Changed `body`
  to `display:flex; flex-direction:column` and `.workspace` to `flex:1 1
  auto; min-height:0`, so it always fills whatever space is actually left.
- Added a `@media (max-width: 860px)` breakpoint: the camera sidebar
  (`.cam-col`) stacks above content instead of squeezing beside it, and the
  drag-to-resize handle (`.panel-resizer`) hides since it's meaningless once
  stacked.
- Added a `@media (max-width: 520px)` breakpoint that trims the header
  (drops the subtitle, shrinks tab buttons) so it doesn't wrap awkwardly on
  very narrow screens.
- Stripped a stray trailing `</file>` tag that had been present in the
  uploaded file (harmless to browsers, but not valid markup).

**Deployment:** recommended Vercel's drag-and-drop static deploy (no Git
needed) — zip `capture.html` renamed to `index.html`, drag onto
vercel.com's "Deploy without Git" flow. Flagged that captured data /
trained models live in each user's own browser storage (localStorage +
IndexedDB) and do **not** sync between people using the deployed URL.

---

## 2. Feature vector expansion: body-relative + palm-orientation features

**Motivation:** many signs were being confused by the classifier. Diagnosis
(via the existing per-sign accuracy view) pointed to two likely causes the
old 130-value feature vector couldn't capture:
1. Signs distinguished by location relative to the **torso** (chest/waist),
   not just the face — only 2 face-relative distances (chin, forehead)
   existed before.
2. Signs distinguished by **palm orientation** (palm-in vs palm-out),
   which raw fingertip coordinates only encode indirectly.

**What changed — `FEATURE_LEN` went from 130 → 138:**
- Added shoulder-center / hip-center tracking (`currentShoulderCenter`,
  `currentHipCenter`), derived from Holistic's pose landmarks (indices
  11/12 shoulders, 23/24 hips — same BlazePose topology already used for
  wrist indices 15/16). Same ghost-fill pattern as the existing
  forehead/chin anchors (`TORSO_GHOST_FRAMES`), so a brief pose dropout
  doesn't zero these out mid-sign.
- `faceRelativeFeatures()` now returns 4 values instead of 2:
  `[handToChin, handToForehead, handToShoulder, handToHip]`, all normalized
  by face height (falls back to shoulder-to-hip span as the unit if the
  face is briefly out of frame).
- New `palmOrientation(handPts)` helper: cross product of
  wrist→index-MCP and wrist→pinky-MCP gives a unit "which way the palm
  roughly faces" vector, 3 values per hand (6 total). Zero-filled per
  hand's existing `HAND_ZERO` convention when that hand isn't present.
  Caveat documented in the code: MediaPipe's per-hand z is a relative-depth
  estimate, not true 3D, so this is an approximation — still useful for
  telling palm-in from palm-out.
- Vector layout is now: `[63 left xyz][63 right xyz][leftPresent]
  [rightPresent][handToChin][handToForehead][handToShoulder][handToHip]
  [leftPalmOrientation x3][rightPalmOrientation x3]` = 138 values.
- Extended the debug visualization (`drawFacePoints()`) to also draw the
  shoulder/hip anchors and wrist→shoulder/hip lines, so what's actually
  being fed to the model is visible on screen, not just the face anchors.
- **Breaking change, handled safely:** added `modelFeatureLenMatches()` —
  on load, any previously-trained model whose input shape doesn't match
  the current `FEATURE_LEN` (i.e. anything trained before this session) is
  discarded with a console warning instead of being silently reused and
  then throwing a cryptic tensor-shape error the next time you train or
  predict. **Both models need retraining from scratch after this change.**
  Raw captures are unaffected (they're re-derived from video/live
  detection each time, not stored in the old vector shape).

**Open item flagged but not yet acted on:** whether the webcam framing
consistently includes shoulders/hips in frame. If it's cropped tight (just
hands/face), `handToShoulder`/`handToHip` will read 0 most of the time and
won't help. Framing should be **consistent across all captures**, not
tightened per-sign — otherwise the model partly learns camera framing as a
spurious cue instead of the sign itself.

---

## 3. Curriculum fix: three signs merged into their identical twins

**Problem found:** while reviewing `HOW_TO_SIGN` descriptions for signs that
depend on facial motion (which none of the current features capture), three
entries turned out to be **physically identical** to another sign already in
the list, with facial expression/context as the *only* real-world
disambiguator — something no amount of hand/torso/orientation features can
fix:

| Removed | Physically identical to | Note in original description |
|---|---|---|
| `NEAT` | `CLEAN` (/`NICE`) | "context and facial expression carry the difference, not handshape" |
| `BITTER` | `SOUR` | "a stronger, more pinched facial expression sets it apart" |
| `TOILET` | `BATHROOM` | "context (and often raised eyebrows) tells them apart" |

**What changed:**
- Removed `NEAT`, `BITTER`, `TOILET` from `MOTION_SIGNS` and from the
  Appearance / Taste / Bathroom groups in `MOTION_CATEGORIES`.
- Removed their entries from the `HOW_TO_SIGN` reference dictionary.
- Left a dated comment in the code (near the `MOTION_SIGNS` array)
  explaining the merge and reasoning, so it isn't a mystery later.
- `CLEAN`, `SOUR`, `BATHROOM` are untouched.

**Action needed if not already done:** any previously-recorded capture data
labeled `NEAT`, `BITTER`, or `TOILET` is now orphaned (those labels no
longer exist in the sign lists). Re-label those clips under the twin
(`CLEAN`/`SOUR`/`BATHROOM`) or discard them before the next training run.

**Not yet done:** a systematic pass through the rest of `HOW_TO_SIGN`
(~480 entries) for other "physically identical, face-only distinction"
pairs beyond these three — only checked the ones that came up in
conversation. Worth doing if accuracy issues persist after retraining.

---

## Suggested next steps (not started this session)

- Retrain both static and motion models (required — old models were
  invalidated by the `FEATURE_LEN` change).
- Check webcam framing includes shoulders/hips consistently.
- Consider a small UI indicator (e.g. "torso: ✓/✗") next to the existing
  "face ✓/✗" status text, so it's obvious live when torso anchors aren't
  being captured.
- Broader pass through `HOW_TO_SIGN` for other same-sign/face-only pairs.


i want to apply the changes to the linguawave
give me the modified ready to paste code