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
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showCameraError('Your browser does not support camera access. Please use Chrome or Edge.');
    throw new Error('getUserMedia not supported');
  }

  // FIX: Don't force a specific resolution — let the browser use the camera's
  // native resolution. This prevents zoom/crop artifacts caused by the browser
  // trying to scale a mismatched stream into a fixed constraint box.
  const constraints = {
    video: {
      facingMode: 'user',   // Front-facing (selfie) camera
    },
    audio: false,
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

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