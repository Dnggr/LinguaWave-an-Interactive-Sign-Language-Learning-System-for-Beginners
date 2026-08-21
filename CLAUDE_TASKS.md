# LinguaWave QA Audit & Bug Fix Task List

---

## Summary

This repository is a client-side ASL (American Sign Language) interactive learning web application that utilizes MediaPipe HolisticLandmarker for landmark tracking, TensorFlow.js for static and motion neural network inference, and Firebase (Auth + Firestore) for user persistence and cloud progress synchronization. The project recently underwent a transition to **Rev 4 (Single Continuous Trail Architecture)**.

### Project Health Overview
- **Core Tracking & ML Pipeline**: Well-engineered face-relative normalization and multi-person filtering, but suffers from model-label mismatches (Numbers 0–9 missing from static model, untrained categories exposed as playable), top-level unhandled CDN injection rejections, and frame debouncing anomalies.
- **State Management & Async Hydration**: Severe race conditions between ES Module script evaluation (`auth.js`) and classic script evaluation (`progress.js`), leading to unhandled `TypeError` crashes and indefinite dashboard UI hangs.
- **Timer & Cooldown Concurrency**: Race conditions in multi-step phrase/fingerspelling countdowns where overlapping `setTimeout` calls prematurely clear cooldown states.
- **Architectural Parity (Rev 4)**: `quiz.js` still retains legacy level-final assessment logic (`isLevelFinalUnlocked`), generating obsolete level-final prompts and out-of-date redirect parameters.
- **Total Issues Identified**: **16 actionable bugs/defects** (4 Critical, 5 High, 4 Medium, 3 Low).

---

## Bug Fix Checklist

### `js/engine/progress.js`

- [ ] **[CRITICAL] Fix Async Module Race Condition in `hydrateStore()` Crashing `progress.js`**
  - **Issue**: `progress.js` is a classic script executed before `auth.js` (an ES module fetching Firebase from CDN) finishes evaluating. At load time, `hydrateStore()` executes `await window.LWAuth?.whenAuthReady?.()`. Because `window.LWAuth` is `undefined`, `await undefined` resolves immediately on the microtask. Subsequent destructuring `const { db, doc, getDoc, getCurrentUser } = window.LWAuth;` throws `TypeError: Cannot destructure property 'db' of 'window.LWAuth' as it is undefined.`, leaving `progressReady` unfulfilled and permanently hanging the dashboard.
  - **Fix**: Implement a robust `waitForAuth()` helper that polls or listens for `'lwauth-ready'` before accessing `window.LWAuth`, and add guard clauses before destructuring `window.LWAuth`:
    ```javascript
    async function waitForAuth() {
      if (window.LWAuth) {
        await window.LWAuth.whenAuthReady();
        return;
      }
      await new Promise((resolve) => {
        const onReady = () => { resolve(); };
        window.addEventListener('lwauth-ready', onReady, { once: true });
        const interval = setInterval(() => {
          if (window.LWAuth) {
            clearInterval(interval);
            window.removeEventListener('lwauth-ready', onReady);
            window.LWAuth.whenAuthReady().then(resolve);
          }
        }, 50);
      });
    }
    ```
    Call `await waitForAuth();` at the beginning of `hydrateStore()` and verify `window.LWAuth` exists before destructuring in both `hydrateStore()` and `saveStore()`. Ensure `resolveProgressReady()` is always called in a `finally` block.

- [ ] **[MEDIUM] Guard against Missing `window.LWData` in `progress.js` Helpers**
  - **Issue**: In `liveCategoriesFor()`, `getOrderedLiveCategories()`, and `getLevelStats()`, methods like `window.LWData.getCategorySigns(...)` are invoked without optional chaining or fallbacks. If `data.js` fails to load, the script crashes.
  - **Fix**: Wrap `window.LWData` calls with optional chaining and fallback to empty arrays: `window.LWData?.getCategorySigns?.(c.level, c.id) ?? []`.

---

### `js/auth.js`

- [ ] **[HIGH] Fix Broken Progress Cache Invalidation on `logout()`**
  - **Issue** (Line 222): `localStorage.removeItem(window.LWProgress?.STORE_KEY);` fails when logging out from pages that do not load `progress.js` (e.g. `feedback.html` or `index.html`). On those pages, `window.LWProgress` is `undefined`, so `localStorage.removeItem(undefined)` is called (removing key `"undefined"`), leaving `lw_progress_v3` data in localStorage for subsequent users.
  - **Fix**: Hardcode or explicitly delete the known storage key along with session keys:
    ```javascript
    localStorage.removeItem('lw_progress_v3');
    localStorage.removeItem(LW_SESSION_KEY);
    ```

- [ ] **[HIGH] Wrap `onAuthStateChanged` Profile Fetch in Try/Catch to Prevent Auth Hangs**
  - **Issue** (Lines 70–94): If `getDoc(userRef)` rejects due to network failure or Firestore security rules, the unhandled promise rejection halts the callback. `authReady` and `hasFiredReady` remain `false`, `'lwauth-ready'` never fires, and all pages running `requireAuth()` hang indefinitely on a blank screen.
  - **Fix**: Wrap the body of `onAuthStateChanged` in a `try...catch...finally` block. In case of error, fall back to basic profile details from `firebaseUser` (e.g. email username) and ensure `authReady = true` and `window.dispatchEvent(new Event('lwauth-ready'))` always execute.

---

### `js/lesson.js`

- [ ] **[HIGH] Fix `enterCooldown` and `startPhraseStep` Countdown Timer Race Condition**
  - **Issue** (Lines 1217–1225, 1408–1425): In phrase/fingerspelling sequences, `enterCooldown(PHRASE_STEP_DELAY)` (700ms) sets `cooldown = true` and schedules `cooldown = false` in 700ms. Concurrently, `setTimeout(() => startPhraseStep(), 700)` triggers `startPhraseStep()`. When `startPhraseStep()` runs, it sets `cooldown = true` and begins `runMotionCountdown(0)` (which takes 1800ms). However, the `enterCooldown` timer fires at the exact same time (700ms) and sets `cooldown = false`. This allows static gesture detection to evaluate input and score frames *while the 3-2-1 countdown is still counting down*.
  - **Fix**: Store the active cooldown timer ID in a module-level variable `let cooldownTimer = null;`. In `enterCooldown(ms)`, cancel any existing timer with `clearTimeout(cooldownTimer)`. In `startPhraseStep()`, explicitly call `clearTimeout(cooldownTimer); cooldown = true;` to guarantee no pending cooldown timer resets `cooldown` during the countdown.

- [ ] **[HIGH] Fix Debounce Frame Counting in `handleAssessmentFrame` for Static Signs**
  - **Issue** (Lines 1447–1450): Unlike `handlePracticeFrame` (which checks `lastDetected === result.label`), `handleAssessmentFrame` increments `debounceCount++` on any matched frame without verifying that the detected label is identical to `lastDetected`. If 44 noisy/transitional frames occur and the 45th frame detects any sign, it triggers the assessment completion using the 45th frame's label.
  - **Fix**: Track `lastDetected` consistently in `handleAssessmentFrame`:
    ```javascript
    if (!isMotion) {
      if (lastDetected === result.label) {
        debounceCount++;
      } else {
        lastDetected = result.label;
        debounceCount = 1;
      }
      if (debounceCount < DEBOUNCE_FRAMES) return;
      debounceCount = 0;
    }
    ```

- [ ] **[LOW] Align Assessment Button Text with Architecture Specification**
  - **Issue** (Lines 721, 1535, 1648): Button `.textContent` is set to `'🎥 Start Assessment'`, conflicting with Rev 3/4 specifications stating in-lesson camera checks are optional and should read `'🎥 Practice Check (optional)'`.
  - **Fix**: Update button text to `'🎥 Practice Check (optional)'` across all state resets in `lesson.js`.

---

### `js/quiz.js`

- [ ] **[CRITICAL] Synchronize `quiz.js` Assessment Scope with Rev 4 Flattened Unit Trail**
  - **Issue** (Lines 493–530): `buildActionButtons()` and `buildScope()` still use legacy `level` partitions and `isLevelFinalUnlocked(level)`. Passing Unit 3 (Numbers, `level: 'basic'`) causes `isLevelFinalUnlocked('basic')` to return `true`, prompting the user with `"🏁 Take Level Final Assessment"` and redirecting to `learn.html?level=medium`, breaking the continuous Units 1–7 trail.
  - **Fix**: Refactor `buildActionButtons(passed)` to use `window.LWProgress.getOrderedLiveCategories()`. After passing a category assessment, route to the next unlocked category in the cross-unit order rather than triggering a level final.

- [ ] **[HIGH] Add Motion Capture Countdown and Buffering Status in Quiz Camera Round**
  - **Issue** (Lines 354–405): `runCameraRound()` runs `classifyMotion()` continuously without a 3-2-1 countdown or buffering progress feedback. The user has no visual indicator when motion recording begins or ends during the 2.5s capture window.
  - **Fix**: Integrate a 3-2-1 countdown state into `nextCameraPrompt()` before calling `classifyMotion()`, and add a buffer progress bar into `#camera-round-card` inside `pages/quiz.html`.

- [ ] **[MEDIUM] Guard against `window.LWProgress` Undefined in `quiz.js` Scope Initialization**
  - **Issue** (Lines 46, 110): `const PASS_THRESHOLD = window.LWProgress?.PASS_THRESHOLD ?? 0.80;` executes at top-level. If `progress.js` is loaded with `defer`, `window.LWProgress` is not yet attached to `window`.
  - **Fix**: Initialize `PASS_THRESHOLD` inside `boot()` after `DOMContentLoaded`.

---

### `js/engine/classifier.js`

- [ ] **[CRITICAL] Replace Top-Level `await` Script Injection with Resilient Loader**
  - **Issue** (Lines 43–52): `classifier.js` contains a top-level `await new Promise(...)` that injects the TF.js CDN `<script>`. If the network fails or CDN is blocked, the ES module fails evaluation and throws an unhandled rejection, breaking `lesson.js` and `quiz.js` completely.
  - **Fix**: Check `if (window.tf)` before creating the script tag. Wrap script loading inside `loadModels()` or an exported `initTensorFlow()` function with structured error reporting, ensuring that failure to load TF.js displays non-blocking UI warnings without halting the camera stream.

- [ ] **[CRITICAL] Address Numbers 0–9 Missing from `asl_static_model`**
  - **Issue**: `asl_static_model/labels.json` only contains alphabet letters `A`–`Y` (25 classes). When Numbers 0–9 are practiced, `getAllowedLabelsForSign()` restricts the candidate set to `{ '0', '1', ..., '9' }`. Because none of these labels exist in `staticLabels`, `candidateIdxs` is empty and `classifyGesture()` returns `{ label: null, confidence: 0, matched: false }` indefinitely.
  - **Fix**: Document that the static model must be retrained to include labels `"0"` through `"9"`. In software, add a fallback check in `classifyGesture`: if `candidateIdxs.length === 0`, log a warning and return `{ label: null, confidence: 0, matched: false, unsupportedModelClass: true }` so `lesson.js` can display an informative banner: `"Camera detection for Numbers 0-9 requires an updated model."`

---

### `js/data.js` & `js/engine/dictionary.js`

- [ ] **[HIGH] Correct `comingSoon` Status for Untrained Categories (`requests`, `temperature`)**
  - **Issue**: In `js/data.js` (lines 188, 221), `temperature` and `requests` have `comingSoon: false`. However, `temperature` signs (`HOT`, `COLD`) and most `requests` signs (`PLEASE`, `EXCUSE`, `HELP`, etc.) do not exist in `asl_motion_model/labels.json` and are missing or marked `disabled: true` in `dictionary.js`. `progress.js` includes them in the live trail, but camera detection silently fails.
  - **Fix**: Mark `comingSoon: true` on `temperature` and untrained Unit 4/5 categories in `js/data.js` until model weights and dictionary entries are trained and enabled.

- [ ] **[LOW] Add Missing Dictionary Entries for Supported Signs**
  - **Issue**: `data.js` has entries for `EXCUSE`, `WHO`, `WHEN`, `HOW`, `STOP` in `requests`, but `SIGN_DICTIONARY` has no corresponding keys at all.
  - **Fix**: Add placeholder entries with `disabled: true` in `js/engine/dictionary.js` to ensure metadata consistency across the dictionary and content files.

---

### `js/camera/cameraUtils.js`

- [ ] **[LOW] Add Null Safety Check for `canvasElement` in `startCamera`**
  - **Issue** (Lines 108–109): `if (canvasElement.width !== videoElement.videoWidth)` assumes `canvasElement` is always passed and non-null. If invoked with a null canvas, it throws a `TypeError`.
  - **Fix**: Add `if (canvasElement) { ... }` around canvas dimension assignments.

---

### `js/feedback.js` & `pages/feedback.html`

- [ ] **[MEDIUM] Dynamic Level Name & Survey Validation / Firestore Write**
  - **Issue**: `feedback.html` hardcodes `Basic — A–Z Alphabet` in `#level-name`. `feedback.js` never reads `?level=` from the URL, does not validate required radio questions (q1–q4), and logs answers to console without writing to Firestore.
  - **Fix**: Update `feedback.js` on page load to read `new URLSearchParams(window.location.search).get('level')` and populate `#level-name`. In `submitSurvey()`, validate that radio groups are selected, write to Firestore collection `surveys` via `window.LWAuth.db`, and show a confirmation toast before redirecting.

---

### `pages/intro-to-asl.html` & `pages/dashboard.html`

- [ ] **[LOW] Update Legacy Navigation Links to Rev 4 Trail URLs**
  - **Issue**: `pages/intro-to-asl.html` line 279 links to `learn.html?level=basic`. Under Rev 4, level tabs are deprecated.
  - **Fix**: Change link to `learn.html?unit=alphabet` or `learn.html`.
- [ ] **[LOW] Update Vestigial `data-user-level` Display in `dashboard.html`**
  - **Issue**: `pages/dashboard.html` line 111 displays "Current Level: Basic". Starting levels were removed in Rev 4 Phase 5.
  - **Fix**: Update the label to "Current Path" or dynamically populate with the learner's active Unit title.

---

## Optimization & Edge Cases

1. **TensorFlow.js Memory Management & Leak Prevention**:
   - `classifier.js` uses `tf.tidy()` during prediction, but input tensors are allocated outside `tf.tidy()`: `const input = tf.tensor2d([flat]);` (line 384) and disposed manually with `input.dispose()`.
   - If an exception occurs inside `tf.tidy()` or before `input.dispose()`, the tensor leaks in WebGL memory.
   - *Recommendation*: Wrap inference blocks in `try...finally` ensuring `input?.dispose()` always executes.

2. **MediaPipe Holistic Detection Throttling & Background Tab Optimization**:
   - `mediapipe.js` throttles detection to ~20 FPS via `DETECT_INTERVAL_MS = 50`.
   - When a browser tab is backgrounded or minimized, `requestAnimationFrame` throttles to 1 FPS or stops.
   - *Recommendation*: Ensure `videoElement.srcObject` tracks are paused or Holistic execution is skipped when `document.hidden` is true (handled in `lesson.js`, but should also be standard in `quiz.js`).

3. **High-DPI / Retina Display Canvas Scaling in `renderer.js`**:
   - `renderer.js` draws skeleton joints and bones directly on canvas dimensions matching `videoElement.videoWidth` (e.g. 640x480).
   - On high-DPI (Retina) displays, canvas scaling can appear slightly blurry when stretched via CSS `width: 100%`.
   - *Recommendation*: Support `window.devicePixelRatio` scaling on `<canvas>` context for crisper skeleton line rendering.

4. **Offline Resilience & PWA Caching**:
   - The application relies heavily on CDNs (`cdn.jsdelivr.net` for TensorFlow.js and MediaPipe, `www.gstatic.com` for Firebase).
   - If an internet connection drops mid-lesson, model fetches and CDN scripts fail.
   - *Recommendation*: Implement a Service Worker caching core CDN bundles and local model JSON/binary shards for offline reliability.

---

## Instructions for Claude

Follow these steps sequentially to execute the bug fixes:

1. **Phase 1: State Management & Auth Synchronization**
   - Open `js/auth.js` and `js/engine/progress.js`.
   - Fix the `hydrateStore()` async race condition and ensure `waitForAuth()` properly awaits Firebase auth resolution before accessing Firestore.
   - Fix the `logout()` progress key removal in `js/auth.js`.
   - Add try/catch error handling to `onAuthStateChanged`.

2. **Phase 2: ML & Gesture Pipeline Stability**
   - Open `js/engine/classifier.js`.
   - Wrap TF.js dynamic script loading inside `loadModels()` with graceful error handling.
   - Add safety guards for missing model classes (Numbers 0–9).
   - Open `js/data.js` and `js/engine/dictionary.js` to correct `comingSoon` flags for untrained categories (`requests`, `temperature`).

3. **Phase 3: Lesson Orchestrator & Debounce Concurrency**
   - Open `js/lesson.js`.
   - Fix the cooldown cancellation race in `startPhraseStep()`.
   - Ensure `handleAssessmentFrame()` strictly validates `lastDetected === result.label` for static signs.
   - Update lesson button text to `'🎥 Practice Check (optional)'`.

4. **Phase 4: Quiz & Rev 4 Architecture Alignment**
   - Open `js/quiz.js`.
   - Refactor `buildActionButtons()` and `buildScope()` to align with `window.LWProgress.getOrderedLiveCategories()`.
   - Add 3-2-1 countdown logic for motion signs in `nextCameraPrompt()`.

5. **Phase 5: UI & Feedback Enhancements**
   - Open `pages/feedback.html` and `js/feedback.js`.
   - Make `#level-name` dynamic based on URL query parameters and implement basic validation and Firestore persistence in `submitSurvey()`.
   - Update legacy links in `pages/intro-to-asl.html` and `pages/dashboard.html`.

6. **Verification & Testing**:
   - Test user registration and login flows.
   - Verify that the dashboard loads immediately without console errors or `TypeError` crashes.
   - Test navigating through the Trail in `learn.html`.
   - Test camera check in `lesson.html` for both static alphabet letters and motion signs.
   - Verify that completing category assessments unlocks the next Unit node in the continuous trail.
