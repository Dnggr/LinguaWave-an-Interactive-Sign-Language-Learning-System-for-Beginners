
export async function startCamera(videoElement, canvasElement) {
  if (!videoElement || !canvasElement) {
    showCameraError('Camera setup is missing required page elements. Please reload the page.');
    throw new Error('startCamera: videoElement and canvasElement are required');
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showCameraError('Your browser does not support camera access. Please use Chrome or Edge.');
    throw new Error('getUserMedia not supported');
  }

  const constraints = {
    video: {
      facingMode: 'user',
      width:  { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30, max: 30 },
    },
    audio: false,
  };

  try {
    const stream = await new Promise((resolve, reject) => {
      let settled = false;
      const timeoutId = setTimeout(() => {
        settled = true;
        const error = new Error('Camera permission or startup took too long. Check the browser permission prompt and try again.');
        error.name = 'CameraTimeoutError';
        reject(error);
      }, 12000);
      navigator.mediaDevices.getUserMedia(constraints).then((lateStream) => {
        if (settled) {
          lateStream.getTracks().forEach((track) => track.stop());
          return;
        }
        settled = true;
        clearTimeout(timeoutId);
        resolve(lateStream);
      }, (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        reject(error);
      });
    });

    try {
      const [track] = stream.getVideoTracks();
      const capabilities = track.getCapabilities?.();
      if (capabilities?.zoom) {
        await track.applyConstraints({ advanced: [{ zoom: capabilities.zoom.min }] });
        console.log(`[cameraUtils] Zoomed out to widest FOV (zoom=${capabilities.zoom.min}).`);
      }
    } catch (zoomErr) {
      console.log('[cameraUtils] Camera does not support zoom control; using default.', zoomErr);
    }

    await new Promise((resolve, reject) => {

      let settled = false;

      const onReady = () => {
        if (settled) return;
        videoElement.play()
          .then(() => {
            if (settled) return;
            settled = true;
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

      if (videoElement.readyState >= 1) {
        onReady();
      }

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

export function stopCamera(videoElement) {
  if (videoElement && videoElement.srcObject) {
    videoElement.srcObject.getTracks().forEach(track => track.stop());
    videoElement.srcObject = null;
    console.log('[cameraUtils] Camera stopped.');
  }
}


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
    el.innerHTML = `<p style="color:var(--clr-red);font-size:var(--fs-sm);text-align:center;padding:1rem;">${window.LWIcons.markup('warning', { size: 'sm' })}<span class="lw-icon-label">${message}</span></p>`;
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
  }
}
