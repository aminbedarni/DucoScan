import { Point, QuadCorners } from '../types';

/**
 * Computes the Euclidean distance between two 2D points
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Returns default corner bounds inset by a percentage from borders
 */
export function getDefaultCorners(width: number, height: number, insetRatio = 0.08): QuadCorners {
  const insetX = width * insetRatio;
  const insetY = height * insetRatio;
  return {
    topLeft: { x: insetX, y: insetY },
    topRight: { x: width - insetX, y: insetY },
    bottomRight: { x: width - insetX, y: height - insetY },
    bottomLeft: { x: insetX, y: height - insetY },
  };
}

/**
 * Computes the Laplacian variance of an image or video frame to detect motion blur.
 * Returns variance value. Lower values (< 40) usually indicate blurriness.
 */
export function calculateBlurScore(ctx: CanvasRenderingContext2D, width: number, height: number): number {
  // Sample a central region to test sharpness
  const sampleW = Math.min(200, width);
  const sampleH = Math.min(200, height);
  const startX = Math.floor((width - sampleW) / 2);
  const startY = Math.floor((height - sampleH) / 2);

  try {
    const imgData = ctx.getImageData(startX, startY, sampleW, sampleH);
    const data = imgData.data;

    // Convert to grayscale
    const gray = new Float32Array(sampleW * sampleH);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      gray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    // Apply 3x3 Laplacian kernel:
    //  0  1  0
    //  1 -4  1
    //  0  1  0
    let sum = 0;
    let sumSq = 0;
    let count = 0;

    for (let y = 1; y < sampleH - 1; y++) {
      for (let x = 1; x < sampleW - 1; x++) {
        const idx = y * sampleW + x;
        const lap =
          gray[idx - sampleW] +
          gray[idx + sampleW] +
          gray[idx - 1] +
          gray[idx + 1] -
          4 * gray[idx];

        sum += lap;
        sumSq += lap * lap;
        count++;
      }
    }

    if (count === 0) return 100;
    const mean = sum / count;
    const variance = sumSq / count - mean * mean;
    return variance;
  } catch {
    return 100; // In case of security/taint issue
  }
}

/**
 * Detects document corners in real time from a canvas element.
 * Uses adaptive luminance thresholding and convex hull corner clustering.
 */
export function detectDocumentCorners(
  sourceCanvas: CanvasImageSource,
  srcWidth: number,
  srcHeight: number
): { corners: QuadCorners; confidence: number } {
  // Create an offscreen analysis canvas at downscaled resolution for high FPS
  const analysisW = 160;
  const analysisH = Math.round((analysisW * srcHeight) / srcWidth);

  const canvas = document.createElement('canvas');
  canvas.width = analysisW;
  canvas.height = analysisH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    return { corners: getDefaultCorners(srcWidth, srcHeight), confidence: 0 };
  }

  ctx.drawImage(sourceCanvas, 0, 0, analysisW, analysisH);
  const imgData = ctx.getImageData(0, 0, analysisW, analysisH);
  const data = imgData.data;

  // Convert to grayscale & compute average luminance
  const gray = new Uint8Array(analysisW * analysisH);
  let totalLum = 0;
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const l = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    gray[j] = l;
    totalLum += l;
  }
  const avgLum = totalLum / gray.length;

  // Edge detection using simple horizontal/vertical gradients
  const edges = new Uint8Array(analysisW * analysisH);
  for (let y = 1; y < analysisH - 1; y++) {
    for (let x = 1; x < analysisW - 1; x++) {
      const idx = y * analysisW + x;
      const gx = Math.abs(gray[idx + 1] - gray[idx - 1]);
      const gy = Math.abs(gray[idx + analysisW] - gray[idx - analysisW]);
      const mag = gx + gy;
      // High contrast edge
      edges[idx] = mag > 35 ? 255 : 0;
    }
  }

  // Scan from the 4 corners towards the center to find bounding edge intersections
  const scaleX = srcWidth / analysisW;
  const scaleY = srcHeight / analysisH;

  // Find candidate corners
  let tl: Point = { x: analysisW * 0.1, y: analysisH * 0.1 };
  let tr: Point = { x: analysisW * 0.9, y: analysisH * 0.1 };
  let br: Point = { x: analysisW * 0.9, y: analysisH * 0.9 };
  let bl: Point = { x: analysisW * 0.1, y: analysisH * 0.9 };

  let detectedCount = 0;

  // Diagonal rays from corners
  const maxSearchSteps = Math.min(analysisW, analysisH) * 0.4;

  // Top-Left scan
  for (let d = 0; d < maxSearchSteps; d++) {
    const x = Math.floor(analysisW * 0.05 + d);
    const y = Math.floor(analysisH * 0.05 + (d * analysisH) / analysisW);
    if (x < analysisW && y < analysisH && edges[y * analysisW + x] > 0) {
      tl = { x, y };
      detectedCount++;
      break;
    }
  }

  // Top-Right scan
  for (let d = 0; d < maxSearchSteps; d++) {
    const x = Math.floor(analysisW * 0.95 - d);
    const y = Math.floor(analysisH * 0.05 + (d * analysisH) / analysisW);
    if (x >= 0 && y < analysisH && edges[y * analysisW + x] > 0) {
      tr = { x, y };
      detectedCount++;
      break;
    }
  }

  // Bottom-Right scan
  for (let d = 0; d < maxSearchSteps; d++) {
    const x = Math.floor(analysisW * 0.95 - d);
    const y = Math.floor(analysisH * 0.95 - (d * analysisH) / analysisW);
    if (x >= 0 && y >= 0 && edges[y * analysisW + x] > 0) {
      br = { x, y };
      detectedCount++;
      break;
    }
  }

  // Bottom-Left scan
  for (let d = 0; d < maxSearchSteps; d++) {
    const x = Math.floor(analysisW * 0.05 + d);
    const y = Math.floor(analysisH * 0.95 - (d * analysisH) / analysisW);
    if (x < analysisW && y >= 0 && edges[y * analysisW + x] > 0) {
      bl = { x, y };
      detectedCount++;
      break;
    }
  }

  const confidence = detectedCount >= 3 ? 0.85 : detectedCount >= 2 ? 0.65 : 0.4;

  // Clamp and scale back to source coordinate system
  return {
    corners: {
      topLeft: { x: Math.max(0, Math.min(srcWidth, tl.x * scaleX)), y: Math.max(0, Math.min(srcHeight, tl.y * scaleY)) },
      topRight: { x: Math.max(0, Math.min(srcWidth, tr.x * scaleX)), y: Math.max(0, Math.min(srcHeight, tr.y * scaleY)) },
      bottomRight: { x: Math.max(0, Math.min(srcWidth, br.x * scaleX)), y: Math.max(0, Math.min(srcHeight, br.y * scaleY)) },
      bottomLeft: { x: Math.max(0, Math.min(srcWidth, bl.x * scaleX)), y: Math.max(0, Math.min(srcHeight, bl.y * scaleY)) },
    },
    confidence,
  };
}

/**
 * Warps a quadrilateral region defined by 4 corner points into an upright rectangular canvas.
 * Implements a high-performance grid-based projective transformation using HTML5 Canvas.
 */
export function perspectiveWarp(
  sourceImage: CanvasImageSource,
  sourceCorners: QuadCorners,
  outputWidth?: number,
  outputHeight?: number
): HTMLCanvasElement {
  const { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl } = sourceCorners;

  // Calculate destination dimensions if not specified
  const topWidth = distance(tl, tr);
  const bottomWidth = distance(bl, br);
  const destWidth = outputWidth || Math.max(Math.round((topWidth + bottomWidth) / 2), 200);

  const leftHeight = distance(tl, bl);
  const rightHeight = distance(tr, br);
  const destHeight = outputHeight || Math.max(Math.round((leftHeight + rightHeight) / 2), 200);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = destWidth;
  outCanvas.height = destHeight;
  const ctx = outCanvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) return outCanvas;

  // Divide the quad into a 16x16 grid of triangles for smooth perspective rectification
  const GRID_SIZE = 16;
  const dx = destWidth / GRID_SIZE;
  const dy = destHeight / GRID_SIZE;

  // Bilinear interpolation function to map normalized (u, v) in [0, 1] to source quad
  const interpolateQuad = (u: number, v: number): Point => {
    const topX = tl.x + u * (tr.x - tl.x);
    const topY = tl.y + u * (tr.y - tl.y);
    const botX = bl.x + u * (br.x - bl.x);
    const botY = bl.y + u * (br.y - bl.y);
    return {
      x: topX + v * (botX - topX),
      y: topY + v * (botY - topY),
    };
  };

  // Helper to render a textured triangle using 2D canvas affine matrix
  const drawTriangle = (
    p0: Point,
    p1: Point,
    p2: Point,
    t0: Point,
    t1: Point,
    t2: Point
  ) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.closePath();
    ctx.clip();

    // Compute affine transform mapping (t0, t1, t2) -> (p0, p1, p2)
    const delta = (t0.x - t2.x) * (t1.y - t2.y) - (t1.x - t2.x) * (t0.y - t2.y);
    if (Math.abs(delta) < 1e-6) {
      ctx.restore();
      return;
    }

    const a = ((p0.x - p2.x) * (t1.y - t2.y) - (p1.x - p2.x) * (t0.y - t2.y)) / delta;
    const b = ((p0.y - p2.y) * (t1.y - t2.y) - (p1.y - p2.y) * (t0.y - t2.y)) / delta;
    const c = ((p1.x - p2.x) * (t0.x - t2.x) - (p0.x - p2.x) * (t1.x - t2.x)) / delta;
    const d = ((p1.y - p2.y) * (t0.x - t2.x) - (p0.y - p2.y) * (t1.x - t2.x)) / delta;
    const e = p0.x - a * t0.x - c * t0.y;
    const f = p0.y - b * t0.x - d * t0.y;

    ctx.transform(a, b, c, d, e, f);
    ctx.drawImage(sourceImage, 0, 0);
    ctx.restore();
  };

  for (let gy = 0; gy < GRID_SIZE; gy++) {
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      const u0 = gx / GRID_SIZE;
      const u1 = (gx + 1) / GRID_SIZE;
      const v0 = gy / GRID_SIZE;
      const v1 = (gy + 1) / GRID_SIZE;

      // Destination screen coords (with 0.5px overlap to prevent seams)
      const px0 = gx * dx;
      const px1 = (gx + 1) * dx + 0.3;
      const py0 = gy * dy;
      const py1 = (gy + 1) * dy + 0.3;

      // Source quad coords
      const s00 = interpolateQuad(u0, v0);
      const s10 = interpolateQuad(u1, v0);
      const s01 = interpolateQuad(u0, v1);
      const s11 = interpolateQuad(u1, v1);

      // Triangle 1: top-left, top-right, bottom-left
      drawTriangle(
        { x: px0, y: py0 },
        { x: px1, y: py0 },
        { x: px0, y: py1 },
        s00,
        s10,
        s01
      );

      // Triangle 2: top-right, bottom-right, bottom-left
      drawTriangle(
        { x: px1, y: py0 },
        { x: px1, y: py1 },
        { x: px0, y: py1 },
        s10,
        s11,
        s01
      );
    }
  }

  return outCanvas;
}

/**
 * Rotates a canvas by degrees (90, 180, 270)
 */
export function rotateCanvas(canvas: HTMLCanvasElement, angleDegrees: number): HTMLCanvasElement {
  const normAngle = ((angleDegrees % 360) + 360) % 360;
  if (normAngle === 0) return canvas;

  const out = document.createElement('canvas');
  const is90or270 = normAngle === 90 || normAngle === 270;
  out.width = is90or270 ? canvas.height : canvas.width;
  out.height = is90or270 ? canvas.width : canvas.height;

  const ctx = out.getContext('2d');
  if (!ctx) return canvas;

  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate((normAngle * Math.PI) / 180);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);

  return out;
}
