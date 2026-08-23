/*
  js/camera/cameraUtils.js — Webcam Streaming Setup Module
  ─────────────────────────────────────────────────────────────────
  PURPOSE  : Requests webcam access, pipes stream into a <video> element,
             syncs the <canvas> overlay dimensions. No MediaPipe knowledge here.
  CONNECTS : Imported by js/lesson.js (the lesson-page orchestrator).
  MIGRATED : Ported from system_with_motion_detection/js/camera/cameraUtils.js
             with error-display ID updated to match LinguaWave's lesson.html DOM.

  FIX — Camera zoom / resolution:
    Previously used `ideal: 1280x720` constraints which caused browsers to
    either zoom/crop into the stream or return a mismatched resolution that
    the CSS `object-fit: cover` then further cropped.
    Fix: remove hard-coded ideal dimensions so the browser picks the camera's
    native resolution. The CSS side is also fixed (object-fit: contain) so the
    video is never cropped — it fits within the viewport at its natural ratio.
  ─────────────────────────────────────────────────────────────────
*/

/**
 * Starts the webcam stream and attaches it to the <video> element.
 * Syncs the <canvas> dimensions to match the video size.
 *
 * @param {HTMLVideoElement}   videoElement  - <video id="lw-webcam">
 * @param {HTMLCanvasElement}  canvasElement - <canvas id="lw-canvas">
 * @returns {Promise<void>} Resolves when stream is live and dimensions are set
 */
export async function startCamera(videoElement, canvasElement) {
  // BUGFIX (PIVOT_CHECKLIST.md Phase C) — this function assumed
  // canvasElement (and videoElement) were always passed and non-null;
  // a null canvasElement threw a raw, unhandled TypeError from deep
  // inside the onReady()/resolve() path below (`canvasElement.width !==
  // videoElement.videoWidth`) instead of failing gracefully like every
  // other startup problem here does. Every current call site does pass
  // both elements, so this was latent, not currently triggered — this
  // guard just makes that assumption explicit and safe if a future call
  // site ever gets it wrong.
  if (!videoElement || !canvasElement) {
    showCameraError('Camera setup is missing required page elements. Please reload the page.');
    throw new Error('startCamera: videoElement and canvasElement are required');
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showCameraError('Your browser does not support camera access. Please use Chrome or Edge.');
    throw new Error('getUserMedia not supported');
  }

  // FIX (original): Don't force a specific resolution — let the browser
  // use the camera's native resolution. This prevented zoom/crop artifacts
  // caused by the browser trying to scale a mismatched stream into a fixed
  // constraint box.
  //
  // CHANGED (perf pass — "so laggy"): re-added a resolution cap, but as
  // `ideal` (a hint, not a hard requirement) rather than the old fixed
  // 1280x720 `min`/exact-style constraint that caused the original crop
  // bug. The crop bug was actually caused by object-fit: cover fighting
  // an aspect-ratio mismatch, not by capping resolution itself — and
  // css/lesson-camera.css now uses object-fit: contain (see that file's
  // own fix notes), so a smaller/mismatched stream just letterboxes
  // instead of cropping. Feeding HolisticLandmarker a smaller frame
  // (pose + full face mesh + both hands, every detection) is one of the
  // biggest wins available for the lag complaint — this pairs with the
  // GPU delegate + detection throttle in js/tracking/mediapipe.js.
  const constraints = {
    video: {
      facingMode: 'user',   // Front-facing (selfie) camera
      width:  { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 30, max: 30 },
    },
    audio: false,
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    // NEW — always zoom out to the widest field of view.
    // Some webcams (and some OS-level camera drivers, notably on
    // Windows and macOS Continuity Camera) default to a digital zoom
    // greater than 1x, which crops in tighter than the sensor's actual
    // field of view. object-fit:contain (see lesson-camera.css) already
    // stops the BROWSER from cropping the stream further, but it can't
    // undo a zoom the camera itself already applied before the frame
    // ever reaches the page. If the camera exposes a `zoom` capability
    // (part of the standard MediaTrackConstraints — most external
    // webcams and modern laptop cameras do), explicitly set it to the
    // capability's minimum, which is the widest angle the hardware can
    // produce. Safe no-op wrapped in try/catch: unsupported devices/
    // browsers just skip this silently and keep their default zoom.
    try {
      const [track] = stream.getVideoTracks();
      const capabilities = track.getCapabilities?.();
      if (capabilities?.zoom) {
        await track.applyConstraints({ advanced: [{ zoom: capabilities.zoom.min }] });
        console.log(`[cameraUtils] Zoomed out to widest FOV (zoom=${capabilities.zoom.min}).`);
      }
    } catch (zoomErr) {
      // Non-fatal — camera still works, it just keeps its default zoom.
      console.log('[cameraUtils] Camera does not support zoom control; using default.', zoomErr);
    }

    await new Promise((resolve, reject) => {
      // BUG FIX: previously the onloadedmetadata handler was attached
      // AFTER srcObject was assigned. Because <video> has the `autoplay`
      // attribute, the browser can fire `loadedmetadata` synchronously
      // (or on a microtask) the instant srcObject is set — sometimes
      // before this handler is registered. When that happened, resolve()
      // never ran and the UI hung forever on "Starting camera…".
      // Fix: attach the listener FIRST, then assign srcObject. We also
      // guard for the case where metadata is somehow already available
      // (readyState >= 1) by checking immediately after wiring stream up.

      let settled = false;

      const onReady = () => {
        if (settled) return;
        videoElement.play()
          .then(() => {
            if (settled) return;
            settled = true;
            // Only set canvas dimensions if they actually changed (prevents unnecessary clear)
            if (canvasElement.width  !== videoElement.videoWidth)  canvasElement.width  = videoElement.videoWidth;
            if (canvasElement.height !== videoElement.videoHeight) canvasElement.height = videoElement.videoHeight;
            cleanup();
            resolve();
          })
          .catch((playErr) => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(playErr);
          });
      };

      const onError = (e) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(e);
      };

      function cleanup() {
        videoElement.removeEventListener('loadedmetadata', onReady);
        videoElement.removeEventListener('error', onError);
      }

      videoElement.addEventListener('loadedmetadata', onReady);
      videoElement.addEventListener('error', onError);

      videoElement.srcObject = stream;

      // Safety net: if metadata was already loaded by the time we get
      // here (readyState HAVE_METADATA = 1 or higher), the event above
      // may never fire again. Trigger manually in that case.
      if (videoElement.readyState >= 1) {
        onReady();
      }

      // Extra safety net: some browsers can stall indefinitely (e.g. tab
      // backgrounded right as permission was granted, flaky hardware).
      // Don't let "Starting camera…" hang forever with no feedback.
      setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('Camera took too long to start. Please reload and try again.'));
      }, 8000);
    });

    console.log(`[cameraUtils] Camera ready: ${videoElement.videoWidth}x${videoElement.videoHeight}`);

  } catch (err) {
    handleCameraError(err);
    throw err;
  }
}

/**
 * Stops all active camera tracks and releases the hardware.
 * Call on page unload (beforeunload / visibilitychange) to turn off the camera light.
 *
 * @param {HTMLVideoElement} videoElement
 */
export function stopCamera(videoElement) {
  if (videoElement && videoElement.srcObject) {
    videoElement.srcObject.getTracks().forEach(track => track.stop());
    videoElement.srcObject = null;
    console.log('[cameraUtils] Camera stopped.');
  }
}

// ─────────────────────────────────────────────────────────
// Internal error handling
// ─────────────────────────────────────────────────────────

function handleCameraError(err) {
  let message = '';
  switch (err.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      message = 'Camera access was denied. Please allow camera permissions in your browser settings and reload.';
      break;
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      message = 'No webcam detected. Please connect a camera and reload.';
      break;
    case 'NotReadableError':
    case 'TrackStartError':
      message = 'Your camera is already in use by another app. Please close it and try again.';
      break;
    default:
      message = `Camera error: ${err.message || 'Unknown error'}. Please reload the page.`;
  }
  console.error('[cameraUtils]', err.name, err.message);
  showCameraError(message);
}

function showCameraError(message) {
  const el = document.getElementById('camera-status');
  if (el) {
    el.innerHTML = `<p style="color:var(--clr-red);font-size:var(--fs-sm);text-align:center;padding:1rem;">⚠️ ${message}</p>`;
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
  }
}