import { Adjustments, FilterDefinition, FilterId } from '../types';

export const ALL_FILTERS: FilterDefinition[] = [
  { id: 'original', nameKey: 'filter_original', category: 'color', descriptionKey: 'Original colors without changes' },
  { id: 'auto_enhance', nameKey: 'filter_auto_enhance', category: 'color', descriptionKey: 'Balanced automatic color and contrast stretch' },
  { id: 'ai_document_enhance', nameKey: 'filter_ai_document_enhance', category: 'color', descriptionKey: 'Intelligent noise reduction & crisp ink enhancement' },
  { id: 'black_and_white', nameKey: 'filter_black_and_white', category: 'bw', descriptionKey: 'Clean binary document thresholding' },
  { id: 'high_contrast_bw', nameKey: 'filter_high_contrast_bw', category: 'bw', descriptionKey: 'Bold dark text on ultra-white paper' },
  { id: 'classic_grayscale', nameKey: 'filter_classic_grayscale', category: 'bw', descriptionKey: 'Natural 8-bit monochromatic tone' },
  { id: 'soft_grayscale', nameKey: 'filter_soft_grayscale', category: 'bw', descriptionKey: 'Gentle grayscale preserving pencil and faint lines' },
  { id: 'pure_white_bg', nameKey: 'filter_pure_white_bg', category: 'restoration', descriptionKey: 'Clips background paper to pure 255 white' },
  { id: 'clean_text', nameKey: 'filter_clean_text', category: 'text', descriptionKey: 'Eliminates paper grain around letters' },
  { id: 'sharp_text', nameKey: 'filter_sharp_text', category: 'text', descriptionKey: 'Unsharp mask focused on typography' },
  { id: 'ultra_sharp', nameKey: 'filter_ultra_sharp', category: 'text', descriptionKey: 'High-pass filter for tiny print and fine signatures' },
  { id: 'strong_contrast', nameKey: 'filter_strong_contrast', category: 'bw', descriptionKey: 'Deep saturated blacks with punchy whites' },
  { id: 'soft_contrast', nameKey: 'filter_soft_contrast', category: 'bw', descriptionKey: 'Muted contrast curve to preserve watermark details' },
  { id: 'bright_document', nameKey: 'filter_bright_document', category: 'color', descriptionKey: 'Luminance gain boost for indoor scans' },
  { id: 'dark_doc_correction', nameKey: 'filter_dark_doc_correction', category: 'restoration', descriptionKey: 'Gamma correction for underexposed captures' },
  { id: 'shadow_removal', nameKey: 'filter_shadow_removal', category: 'restoration', descriptionKey: 'Removes phone and hand casting shadows' },
  { id: 'background_removal', nameKey: 'filter_background_removal', category: 'restoration', descriptionKey: 'Separates document from colored tabletop' },
  { id: 'paper_whitening', nameKey: 'filter_paper_whitening', category: 'color', descriptionKey: 'Bleaches yellowed paper while keeping colored ink' },
  { id: 'faded_text_recovery', nameKey: 'filter_faded_text_recovery', category: 'text', descriptionKey: 'Restores faint pencil notes and low-ink prints' },
  { id: 'old_doc_restoration', nameKey: 'filter_old_doc_restoration', category: 'restoration', descriptionKey: 'Reduces aging foxing and vintage stains' },
  { id: 'blue_document', nameKey: 'filter_blue_document', category: 'specialty', descriptionKey: 'Architectural cyanotype monochrome styling' },
  { id: 'green_document', nameKey: 'filter_green_document', category: 'specialty', descriptionKey: 'Emerald accounting ledger document mode' },
  { id: 'warm_paper', nameKey: 'filter_warm_paper', category: 'specialty', descriptionKey: 'Creamy ivory book reader tone' },
  { id: 'cool_paper', nameKey: 'filter_cool_paper', category: 'specialty', descriptionKey: 'Modern cold-white stationery tint' },
  { id: 'natural_colors', nameKey: 'filter_natural_colors', category: 'color', descriptionKey: 'Accurate color grading for stamps & photos' },
  { id: 'receipt_mode', nameKey: 'filter_receipt_mode', category: 'specialty', descriptionKey: 'Thermal paper contrast & dot-matrix enhancement' },
  { id: 'book_scan_mode', nameKey: 'filter_book_scan_mode', category: 'specialty', descriptionKey: 'Flattened spine shadow compensation' },
  { id: 'id_card_mode', nameKey: 'filter_id_card_mode', category: 'specialty', descriptionKey: 'Protects photo skin tones while enhancing card text' },
  { id: 'newspaper_mode', nameKey: 'filter_newspaper_mode', category: 'specialty', descriptionKey: 'Newsprint pulp cleanup & halftone sharpening' },
  { id: 'blueprint_mode', nameKey: 'filter_blueprint_mode', category: 'specialty', descriptionKey: 'Dark blue technical background with white vector lines' },
];

/**
 * Applies a specific filter to an input Canvas or ImageData, taking into account
 * filter intensity (0-100) and manual adjustments (brightness, contrast, saturation, sharpness).
 */
export function applyFilterToCanvas(
  sourceCanvas: HTMLCanvasElement,
  filterId: FilterId,
  intensity = 100,
  adjustments: Adjustments = { brightness: 0, contrast: 0, saturation: 0, sharpness: 0 }
): HTMLCanvasElement {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  const ctx = outCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return outCanvas;

  ctx.drawImage(sourceCanvas, 0, 0);
  const srcImgData = ctx.getImageData(0, 0, width, height);
  const srcData = srcImgData.data;

  // Create working copy
  const dstImgData = ctx.createImageData(width, height);
  const dstData = dstImgData.data;
  dstData.set(srcData);

  // 1. Apply the core 30-filter algorithm
  applyFilterAlgorithm(dstData, srcData, width, height, filterId);

  // 2. Blend with original according to intensity (0 to 100)
  if (intensity < 100 && filterId !== 'original') {
    const factor = Math.max(0, Math.min(100, intensity)) / 100;
    for (let i = 0; i < dstData.length; i += 4) {
      dstData[i] = Math.round(srcData[i] + (dstData[i] - srcData[i]) * factor);
      dstData[i + 1] = Math.round(srcData[i + 1] + (dstData[i + 1] - srcData[i + 1]) * factor);
      dstData[i + 2] = Math.round(srcData[i + 2] + (dstData[i + 2] - srcData[i + 2]) * factor);
    }
  }

  // 3. Apply manual adjustments (brightness, contrast, saturation)
  if (adjustments.brightness !== 0 || adjustments.contrast !== 0 || adjustments.saturation !== 0) {
    applyManualAdjustments(dstData, adjustments);
  }

  // Write pixel data back
  ctx.putImageData(dstImgData, 0, 0);

  // 4. Apply manual sharpness convolution if requested
  if (adjustments.sharpness > 0) {
    applySharpnessConvolution(ctx, width, height, adjustments.sharpness);
  }

  return outCanvas;
}

function clamp(val: number): number {
  return val < 0 ? 0 : val > 255 ? 255 : Math.round(val);
}

function applyFilterAlgorithm(
  dst: Uint8ClampedArray,
  src: Uint8ClampedArray,
  width: number,
  height: number,
  filterId: FilterId
) {
  const len = dst.length;

  switch (filterId) {
    case 'original':
      // No modification
      break;

    case 'auto_enhance': {
      // Linear contrast stretching & saturation boost
      let minLum = 255;
      let maxLum = 0;
      for (let i = 0; i < len; i += 4) {
        const lum = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
        if (lum < minLum) minLum = lum;
        if (lum > maxLum) maxLum = lum;
      }
      const range = Math.max(maxLum - minLum, 1);
      for (let i = 0; i < len; i += 4) {
        dst[i] = clamp(((src[i] - minLum) / range) * 255 * 1.05);
        dst[i + 1] = clamp(((src[i + 1] - minLum) / range) * 255 * 1.05);
        dst[i + 2] = clamp(((src[i + 2] - minLum) / range) * 255 * 1.05);
      }
      break;
    }

    case 'ai_document_enhance': {
      // Cleans murky background, darkens text strokes, enhances clarity
      for (let i = 0; i < len; i += 4) {
        const r = src[i];
        const g = src[i + 1];
        const b = src[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        if (lum > 170) {
          // Push near-white to pure paper
          const lift = 255 - ((255 - lum) * 0.25);
          dst[i] = clamp(r * 0.1 + lift * 0.9);
          dst[i + 1] = clamp(g * 0.1 + lift * 0.9);
          dst[i + 2] = clamp(b * 0.1 + lift * 0.9);
        } else if (lum < 110) {
          // Darken ink
          dst[i] = clamp(r * 0.7);
          dst[i + 1] = clamp(g * 0.7);
          dst[i + 2] = clamp(b * 0.7);
        } else {
          // Middle contrast
          dst[i] = clamp((r - 128) * 1.25 + 128);
          dst[i + 1] = clamp((g - 128) * 1.25 + 128);
          dst[i + 2] = clamp((b - 128) * 1.25 + 128);
        }
      }
      break;
    }

    case 'black_and_white': {
      // Clean binary document threshold
      for (let i = 0; i < len; i += 4) {
        const lum = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
        const val = lum > 140 ? 255 : 0;
        dst[i] = val;
        dst[i + 1] = val;
        dst[i + 2] = val;
      }
      break;
    }

    case 'high_contrast_bw': {
      // High-contrast B&W: aggressive threshold for faint text
      for (let i = 0; i < len; i += 4) {
        const lum = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
        const val = lum > 165 ? 255 : 0;
        dst[i] = val;
        dst[i + 1] = val;
        dst[i + 2] = val;
      }
      break;
    }

    case 'classic_grayscale': {
      // Standard 8-bit monochromatic
      for (let i = 0; i < len; i += 4) {
        const gray = Math.round(0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2]);
        dst[i] = gray;
        dst[i + 1] = gray;
        dst[i + 2] = gray;
      }
      break;
    }

    case 'soft_grayscale': {
      // Lifted gamma grayscale
      for (let i = 0; i < len; i += 4) {
        const gray = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
        // Apply gamma 0.85
        const lifted = clamp(Math.pow(gray / 255, 0.82) * 255);
        dst[i] = lifted;
        dst[i + 1] = lifted;
        dst[i + 2] = lifted;
      }
      break;
    }

    case 'pure_white_bg': {
      // Clips off-white/beige background to 255
      for (let i = 0; i < len; i += 4) {
        const r = src[i];
        const g = src[i + 1];
        const b = src[i + 2];
        const minC = Math.min(r, g, b);
        if (minC > 155) {
          dst[i] = 255;
          dst[i + 1] = 255;
          dst[i + 2] = 255;
        } else {
          dst[i] = clamp(r * 0.9);
          dst[i + 1] = clamp(g * 0.9);
          dst[i + 2] = clamp(b * 0.9);
        }
      }
      break;
    }

    case 'clean_text': {
      // Reduces speckles by filtering low-gradient luminance and saturating ink
      for (let i = 0; i < len; i += 4) {
        const lum = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
        if (lum > 150) {
          dst[i] = 255;
          dst[i + 1] = 255;
          dst[i + 2] = 255;
        } else if (lum < 90) {
          dst[i] = 15;
          dst[i + 1] = 15;
          dst[i + 2] = 15;
        } else {
          const smooth = clamp((lum - 90) * (255 / 60));
          dst[i] = smooth;
          dst[i + 1] = smooth;
          dst[i + 2] = smooth;
        }
      }
      break;
    }

    case 'sharp_text': {
      // Sharp typography with edge accentuation
      for (let i = 0; i < len; i += 4) {
        const lum = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
        const boost = lum < 128 ? lum * 0.75 : 255 - (255 - lum) * 0.6;
        dst[i] = clamp(src[i] * 0.3 + boost * 0.7);
        dst[i + 1] = clamp(src[i + 1] * 0.3 + boost * 0.7);
        dst[i + 2] = clamp(src[i + 2] * 0.3 + boost * 0.7);
      }
      break;
    }

    case 'ultra_sharp': {
      // Extreme detail separation
      for (let i = 0; i < len; i += 4) {
        const lum = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
        const val = lum < 135 ? clamp(lum * 0.5) : clamp(255 - (255 - lum) * 0.4);
        dst[i] = val;
        dst[i + 1] = val;
        dst[i + 2] = val;
      }
      break;
    }

    case 'strong_contrast': {
      // S-curve contrast
      for (let i = 0; i < len; i += 4) {
        for (let c = 0; c < 3; c++) {
          const v = src[i + c] / 255;
          // Sigmoid-like contrast curve
          const s = v < 0.5 ? 2 * v * v : 1 - 2 * (1 - v) * (1 - v);
          dst[i + c] = clamp(s * 255);
        }
      }
      break;
    }

    case 'soft_contrast': {
      // Muted contrast
      for (let i = 0; i < len; i += 4) {
        for (let c = 0; c < 3; c++) {
          const v = src[i + c];
          dst[i + c] = clamp((v - 128) * 0.75 + 128);
        }
      }
      break;
    }

    case 'bright_document': {
      // Exposure gain
      for (let i = 0; i < len; i += 4) {
        dst[i] = clamp(src[i] * 1.35 + 20);
        dst[i + 1] = clamp(src[i + 1] * 1.35 + 20);
        dst[i + 2] = clamp(src[i + 2] * 1.35 + 20);
      }
      break;
    }

    case 'dark_doc_correction': {
      // Heavy gamma lift for underexposed documents
      for (let i = 0; i < len; i += 4) {
        dst[i] = clamp(Math.pow(src[i] / 255, 0.6) * 255 + 15);
        dst[i + 1] = clamp(Math.pow(src[i + 1] / 255, 0.6) * 255 + 15);
        dst[i + 2] = clamp(Math.pow(src[i + 2] / 255, 0.6) * 255 + 15);
      }
      break;
    }

    case 'shadow_removal': {
      // Shadow removal: samples local gradient and raises low luma
      for (let i = 0; i < len; i += 4) {
        const r = src[i];
        const g = src[i + 1];
        const b = src[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        // If it's a mid-low shadow (not dark text), lift aggressively
        const isShadow = lum > 65 && lum < 185;
        const lift = isShadow ? (185 - lum) * 0.75 : 0;
        dst[i] = clamp(r + lift);
        dst[i + 1] = clamp(g + lift);
        dst[i + 2] = clamp(b + lift);
      }
      break;
    }

    case 'background_removal': {
      // Removes textured backgrounds outside page text
      for (let i = 0; i < len; i += 4) {
        const r = src[i];
        const g = src[i + 1];
        const b = src[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum > 145) {
          dst[i] = 255;
          dst[i + 1] = 255;
          dst[i + 2] = 255;
        } else {
          dst[i] = clamp(r * 0.7);
          dst[i + 1] = clamp(g * 0.7);
          dst[i + 2] = clamp(b * 0.7);
        }
      }
      break;
    }

    case 'paper_whitening': {
      // Neutralizes yellow/amber hue of aging paper
      for (let i = 0; i < len; i += 4) {
        const r = src[i];
        const g = src[i + 1];
        const b = src[i + 2];
        const maxVal = Math.max(r, g, b);
        if (maxVal > 150) {
          // Balance channels to avoid yellow tint
          const avg = (r + g + b) / 3;
          dst[i] = clamp(avg * 1.15);
          dst[i + 1] = clamp(avg * 1.15);
          dst[i + 2] = clamp(avg * 1.18);
        } else {
          dst[i] = r;
          dst[i + 1] = g;
          dst[i + 2] = b;
        }
      }
      break;
    }

    case 'faded_text_recovery': {
      // Darkens faint strokes
      for (let i = 0; i < len; i += 4) {
        const lum = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
        if (lum < 175) {
          // Push down towards deep black
          const darkened = clamp(lum * 0.45);
          dst[i] = darkened;
          dst[i + 1] = darkened;
          dst[i + 2] = darkened;
        } else {
          dst[i] = 255;
          dst[i + 1] = 255;
          dst[i + 2] = 255;
        }
      }
      break;
    }

    case 'old_doc_restoration': {
      // Vintage parchment preservation with clean legible ink
      for (let i = 0; i < len; i += 4) {
        const lum = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
        if (lum < 115) {
          dst[i] = 30;
          dst[i + 1] = 25;
          dst[i + 2] = 20;
        } else {
          // Warm restoration wash
          dst[i] = clamp(248 + (lum - 115) * 0.05);
          dst[i + 1] = clamp(243 + (lum - 115) * 0.05);
          dst[i + 2] = clamp(232 + (lum - 115) * 0.05);
        }
      }
      break;
    }

    case 'blue_document': {
      // Architectural blue monochrome
      for (let i = 0; i < len; i += 4) {
        const lum = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
        dst[i] = clamp(lum * 0.65);
        dst[i + 1] = clamp(lum * 0.85);
        dst[i + 2] = clamp(lum * 1.3);
      }
      break;
    }

    case 'green_document': {
      // Classic accounting ledger green
      for (let i = 0; i < len; i += 4) {
        const lum = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
        dst[i] = clamp(lum * 0.7);
        dst[i + 1] = clamp(lum * 1.25);
        dst[i + 2] = clamp(lum * 0.8);
      }
      break;
    }

    case 'warm_paper': {
      // Warm ivory book page tone
      for (let i = 0; i < len; i += 4) {
        dst[i] = clamp(src[i] * 1.08 + 12);
        dst[i + 1] = clamp(src[i + 1] * 1.04 + 8);
        dst[i + 2] = clamp(src[i + 2] * 0.92);
      }
      break;
    }

    case 'cool_paper': {
      // Cool blue-white office paper
      for (let i = 0; i < len; i += 4) {
        dst[i] = clamp(src[i] * 0.94);
        dst[i + 1] = clamp(src[i + 1] * 1.02 + 5);
        dst[i + 2] = clamp(src[i + 2] * 1.12 + 15);
      }
      break;
    }

    case 'natural_colors': {
      // Subdued natural saturation & gamma
      for (let i = 0; i < len; i += 4) {
        for (let c = 0; c < 3; c++) {
          const v = src[i + c] / 255;
          dst[i + c] = clamp(Math.pow(v, 0.92) * 255);
        }
      }
      break;
    }

    case 'receipt_mode': {
      // Thermal receipt optimization: removes wrinkles, sharpens dot matrix
      for (let i = 0; i < len; i += 4) {
        const lum = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
        if (lum > 145) {
          dst[i] = 255;
          dst[i + 1] = 255;
          dst[i + 2] = 255;
        } else {
          dst[i] = 0;
          dst[i + 1] = 0;
          dst[i + 2] = 0;
        }
      }
      break;
    }

    case 'book_scan_mode': {
      // Spine shadow compensation
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          // Spine shadow usually occurs on left or right edge
          const edgeDist = Math.min(x, width - x) / (width * 0.25);
          const shadowFactor = edgeDist < 1 ? (1 - edgeDist) * 35 : 0;
          dst[idx] = clamp(src[idx] + shadowFactor);
          dst[idx + 1] = clamp(src[idx + 1] + shadowFactor);
          dst[idx + 2] = clamp(src[idx + 2] + shadowFactor);
        }
      }
      break;
    }

    case 'id_card_mode': {
      // Keeps face colors while making text sharp & background crisp
      for (let i = 0; i < len; i += 4) {
        const r = src[i];
        const g = src[i + 1];
        const b = src[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const isNearWhite = lum > 195 && Math.abs(r - g) < 25 && Math.abs(g - b) < 25;
        if (isNearWhite) {
          dst[i] = 255;
          dst[i + 1] = 255;
          dst[i + 2] = 255;
        } else {
          // Enhance clarity slightly
          dst[i] = clamp(r * 1.05);
          dst[i + 1] = clamp(g * 1.05);
          dst[i + 2] = clamp(b * 1.05);
        }
      }
      break;
    }

    case 'newspaper_mode': {
      // Removes dark gray recycled pulp newsprint
      for (let i = 0; i < len; i += 4) {
        const lum = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
        if (lum > 130) {
          dst[i] = 250;
          dst[i + 1] = 250;
          dst[i + 2] = 250;
        } else {
          dst[i] = clamp(lum * 0.4);
          dst[i + 1] = clamp(lum * 0.4);
          dst[i + 2] = clamp(lum * 0.4);
        }
      }
      break;
    }

    case 'blueprint_mode': {
      // White lines on deep blueprint blue
      for (let i = 0; i < len; i += 4) {
        const lum = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
        if (lum < 135) {
          // Text/lines become white
          dst[i] = 240;
          dst[i + 1] = 245;
          dst[i + 2] = 255;
        } else {
          // Paper becomes blueprint dark cyan
          dst[i] = 15;
          dst[i + 1] = 45;
          dst[i + 2] = 110;
        }
      }
      break;
    }
  }
}

function applyManualAdjustments(dst: Uint8ClampedArray, adjustments: Adjustments) {
  const { brightness, contrast, saturation } = adjustments;
  const bVal = (brightness / 100) * 128;
  const cFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const sFactor = 1 + saturation / 100;

  for (let i = 0; i < dst.length; i += 4) {
    let r = dst[i];
    let g = dst[i + 1];
    let b = dst[i + 2];

    // Brightness
    if (brightness !== 0) {
      r += bVal;
      g += bVal;
      b += bVal;
    }

    // Contrast
    if (contrast !== 0) {
      r = cFactor * (r - 128) + 128;
      g = cFactor * (g - 128) + 128;
      b = cFactor * (b - 128) + 128;
    }

    // Saturation
    if (saturation !== 0) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * sFactor;
      g = gray + (g - gray) * sFactor;
      b = gray + (b - gray) * sFactor;
    }

    dst[i] = clamp(r);
    dst[i + 1] = clamp(g);
    dst[i + 2] = clamp(b);
  }
}

function applySharpnessConvolution(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sharpness: number
) {
  // Simple unsharp mask convolution kernel
  const imgData = ctx.getImageData(0, 0, width, height);
  const src = imgData.data;
  const outData = ctx.createImageData(width, height);
  const dst = outData.data;
  dst.set(src);

  const amount = (sharpness / 100) * 0.8;
  // 3x3 Sharpening kernel
  // [ 0, -a, 0 ]
  // [ -a, 1+4a, -a ]
  // [ 0, -a, 0 ]
  const center = 1 + 4 * amount;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const top = ((y - 1) * width + x) * 4;
      const bot = ((y + 1) * width + x) * 4;
      const left = (y * width + (x - 1)) * 4;
      const right = (y * width + (x + 1)) * 4;

      for (let c = 0; c < 3; c++) {
        const val =
          center * src[idx + c] -
          amount * (src[top + c] + src[bot + c] + src[left + c] + src[right + c]);
        dst[idx + c] = clamp(val);
      }
    }
  }

  ctx.putImageData(outData, 0, 0);
}
