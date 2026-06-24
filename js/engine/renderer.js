/*
  js/engine/renderer.js — Canvas Skeleton Drawing Module
  ─────────────────────────────────────────────────────────────────
  PURPOSE  : Draws the hand skeleton overlay on the <canvas> element
             in lesson.html. Only handles drawing — no detection logic.
  CONNECTS : Imported by js/lesson.js.
  MIGRATED : Ported from system_with_motion_detection/js/ui/renderer.js
  ─────────────────────────────────────────────────────────────────

  MediaPipe hand bone connections:
  [0,1],[1,2],[2,3],[3,4]          Thumb
  [0,5],[5,6],[6,7],[7,8]          Index finger
  [0,9],[9,10],[10,11],[11,12]     Middle finger
  [0,13],[13,14],[14,15],[15,16]   Ring finger
  [0,17],[17,18],[18,19],[19,20]   Pinky finger
  [5,9],[9,13],[13,17]             Palm knuckle row

  NOTE: CSS mirror (transform: scaleX(-1)) is applied to both the <video>
  and <canvas> in CSS. Do NOT flip coordinates in JS here.
*/

const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];

const FINGERTIP_INDICES = [4, 8, 12, 16, 20];

/**
 * Draws the hand skeleton onto the canvas for all detected hands.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<Array<{x,y,z}>>}   allLandmarks  - Array of hands, each with 21 landmarks
 * @param {number}                  canvasWidth
 * @param {number}                  canvasHeight
 */
export function drawSkeleton(ctx, allLandmarks, canvasWidth, canvasHeight) {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  if (!allLandmarks || allLandmarks.length === 0) return;

  for (const landmarks of allLandmarks) {
    if (!landmarks || landmarks.length !== 21) continue;

    // Scale normalized (0–1) coords to canvas pixels
    const pts = landmarks.map(lm => ({
      x: lm.x * canvasWidth,
      y: lm.y * canvasHeight,
    }));

    // Draw bone connections
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth   = 2;
    for (const [a, b] of HAND_CONNECTIONS) {
      ctx.beginPath();
      ctx.moveTo(pts[a].x, pts[a].y);
      ctx.lineTo(pts[b].x, pts[b].y);
      ctx.stroke();
    }

    // Draw joint dots
    ctx.fillStyle = '#34D399';   // emerald green
    for (let i = 0; i < 21; i++) {
      ctx.beginPath();
      ctx.arc(pts[i].x, pts[i].y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Highlight fingertips
    ctx.fillStyle = '#FFFFFF';
    for (const idx of FINGERTIP_INDICES) {
      ctx.beginPath();
      ctx.arc(pts[idx].x, pts[idx].y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Clears the canvas. Call when no hand is detected.
 */
export function clearCanvas(ctx, canvasWidth, canvasHeight) {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
}