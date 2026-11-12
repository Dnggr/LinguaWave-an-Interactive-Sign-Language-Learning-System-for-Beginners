# Testing & QA Guidelines for LinguaWave

## Overview
This file establishes the engineering, QA, and pair-programming rules automatically loaded by Antigravity (agy) and AI coding agents when working within this repository.

---

## 1. Code Integrity & Architecture Rules
- **Do Not Break Trail Architecture (Rev 4)**: LinguaWave operates on a single continuous trail ordered by `UNITS_V2` in `js/missions.js` (read via `window.LWMissions.getUnits()`; `js/data.js` / `LWData` no longer exist). Do not re-introduce hardcoded 3-level branching or level-restricted progress locks.
- **Maintain Feature Vector Parity**: Feature vectors passed into TensorFlow.js models must remain exactly 138 dimensions (`[63 left][63 right][2 presence][4 body-relative distances][6 palm-orientation]`, updated 2026-09-03 from the earlier 130-dim `[63 left][63 right][2 presence][2 face distances]` layout — both asl_static_model and asl_motion_model must be retrained on the new layout before deploying). Any change to landmark layout must stay in exact lockstep between `capture.html`, `mediapipe.js`, and `classifier.js`.
- **Preserve Documentation & Comments**: Always maintain non-obvious design rationale, architectural comments, and bug logs in existing files.

---

## 2. Testing & Verification Checklist
Before submitting code changes, agents must verify:
- [ ] **No Unhandled Async / Race Conditions**: Verify that `window.LWAuth` and `window.LWProgress` are awaited or safely guarded before invoking methods or destructuring properties.
- [ ] **Camera & MediaPipe Lifecycle**: Ensure `stopCamera()` and `cancelAnimationFrame` are called on page unload/visibility change to prevent camera hardware locks and memory leaks.
- [ ] **Timer & Cooldown Safety**: All `setTimeout` and `requestAnimationFrame` IDs must be tracked and cleared upon state reset, prompt advance, or page navigation.
- [ ] **Model Label Alignment**: Check that any playable category/sign in `js/missions.js` (`SIGNS_V2`) has a corresponding label in `asl_static_model/labels.json` or `asl_motion_model/labels.json` and is enabled in `SIGN_DICTIONARY`.
- [ ] **DOM & Navigation Integrity**: Ensure all elements referenced by `getElementById` or query selectors exist across all HTML pages, and navigation URLs use proper `encodeURIComponent`.

---

## 3. Strict Pre-Commit QA Standards
- Run a static check for syntax errors or invalid imports across all JS files.
- Test both user authentication flows (login, register, logout) and guest/error states.
- Test static letter detection, motion word detection, multi-step fingerspelling, and category quiz assessments.

## XP / levels / badges / leaderboards (added 2026-09-30) — READ XP_SYSTEM.md FIRST
* Spark-plan decision: browser code writes XP to Firestore. `functions/` XP code is legacy and is not deployed; do not restore a Functions-only XP path or add a Blaze dependency.
* `js/xp-engine.mjs` is the pure XP economy and `js/xp.js` (`window.LWXP`) serializes claims through one page queue and writes `xpState` + `publicProfiles` atomically. Firestore rules cap writes but this is a best-effort honor system: browser claims and game timing can be forged within those caps.
* Preserve the `window.LWXP` API. Learned-sign eligibility in both games must use `LWXP.getLearnedSigns()` (xpState learned signs union completed LESSON items from `LWMissions`); do not reintroduce separate Wall Breaker / Time Attack pools.
* `js/xp-config.js` is a display-only legacy mirror. Economy changes belong in `js/xp-engine.mjs`; do not regenerate it from `functions/xp-config.js`. `functions/curriculum-manifest.json` and manifest build scripts are legacy for XP and are not required by the browser engine.
* "Level" in XP code means the XP level 1-30, unrelated to `users.level` (basic/medium/intermediate).
* Legacy Functions tests do not exercise the Spark bridge. Run `node js/_test_xp-engine.node.mjs` for the pure engine and `node js/_test_xp-client.node.mjs` for transaction/queue behavior.
