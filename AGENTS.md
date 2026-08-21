# Testing & QA Guidelines for LinguaWave

## Overview
This file establishes the engineering, QA, and pair-programming rules automatically loaded by Antigravity (agy) and AI coding agents when working within this repository.

---

## 1. Code Integrity & Architecture Rules
- **Do Not Break Trail Architecture (Rev 4)**: LinguaWave operates on a single continuous trail ordered by `UNITS` in `js/data.js`. Do not re-introduce hardcoded 3-level branching or level-restricted progress locks.
- **Maintain Feature Vector Parity**: Feature vectors passed into TensorFlow.js models must remain exactly 130 dimensions (`[63 left][63 right][2 presence][2 face distances]`). Any change to landmark layout must stay in exact lockstep between `capture.html`, `mediapipe.js`, and `classifier.js`.
- **Preserve Documentation & Comments**: Always maintain non-obvious design rationale, architectural comments, and bug logs in existing files.

---

## 2. Testing & Verification Checklist
Before submitting code changes, agents must verify:
- [ ] **No Unhandled Async / Race Conditions**: Verify that `window.LWAuth` and `window.LWProgress` are awaited or safely guarded before invoking methods or destructuring properties.
- [ ] **Camera & MediaPipe Lifecycle**: Ensure `stopCamera()` and `cancelAnimationFrame` are called on page unload/visibility change to prevent camera hardware locks and memory leaks.
- [ ] **Timer & Cooldown Safety**: All `setTimeout` and `requestAnimationFrame` IDs must be tracked and cleared upon state reset, prompt advance, or page navigation.
- [ ] **Model Label Alignment**: Check that any playable category/sign in `data.js` has a corresponding label in `asl_static_model/labels.json` or `asl_motion_model/labels.json` and is enabled in `SIGN_DICTIONARY`.
- [ ] **DOM & Navigation Integrity**: Ensure all elements referenced by `getElementById` or query selectors exist across all HTML pages, and navigation URLs use proper `encodeURIComponent`.

---

## 3. Strict Pre-Commit QA Standards
- Run a static check for syntax errors or invalid imports across all JS files.
- Test both user authentication flows (login, register, logout) and guest/error states.
- Test static letter detection, motion word detection, multi-step fingerspelling, and category quiz assessments.
