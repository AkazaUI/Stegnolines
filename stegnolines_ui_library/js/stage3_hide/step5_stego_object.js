// ══════════════════════════════════════════════════════════════
// Stage 3 — Hide | Step 5: Stego-Object (Zero-Allocation Span Slicing & Assembly with S-Box Support)
// ══════════════════════════════════════════════════════════════
//
// Performance Highlights:
//   Zero-Allocation Span Slicing: Eliminates per-character heap churn,
//   slicing contiguous blocks of clean text in O(1) chunks.
//
// Dependencies: step4_vs_codec (fromVariationSelector, isBaseVariationSelector, isSupplementaryVariationSelector, invertVsBytes)
//
// ══════════════════════════════════════════════════════════════

'use strict';

/**
 * Extract all Variation Selector bytes from a text string.
 *
 * Algorithmic Optimization (Span Slicing):
 * Slices clean text spans directly, avoiding per-character string pushes.
 *
 * @param {string} text - The stego-object (cover text + hidden VS characters).
 * @param {string} [stegoKey] - Optional stego key for S-Box inversion.
 * @returns {{ vsBytes: Uint8Array, cleanText: string, rawVsIndices: Uint8Array }}
 */
function extractVSFromText(text, stegoKey) {
  if (!text) return { vsBytes: new Uint8Array(0), cleanText: '', rawVsIndices: new Uint8Array(0) };

  const len = text.length;
  const rawVsIndices = [];
  const cleanChunks = [];

  let i = 0;
  let cleanStart = 0;

  while (i < len) {
    const code = text.charCodeAt(i);

    // 1. Check BMP Variation Selectors (VS1–VS16: 0xFE00..0xFE0F)
    if (code >= 0xFE00 && code <= 0xFE0F) {
      if (cleanStart < i) {
        cleanChunks.push(text.slice(cleanStart, i));
      }
      rawVsIndices.push(code - 0xFE00);
      i++;
      cleanStart = i;
    }
    // 2. Check Supplementary Variation Selectors (VS17–VS256: Surrogate Pair 0xDB40, 0xDD00..0xDDEF)
    else if (code === 0xDB40 && i + 1 < len) {
      const low = text.charCodeAt(i + 1);
      if (low >= 0xDD00 && low <= 0xDDEF) {
        if (cleanStart < i) {
          cleanChunks.push(text.slice(cleanStart, i));
        }
        rawVsIndices.push(16 + (low - 0xDD00));
        i += 2;
        cleanStart = i;
      } else {
        i++;
      }
    } else {
      i++;
    }
  }

  if (cleanStart < len) {
    cleanChunks.push(text.slice(cleanStart, len));
  }

  const cleanText = cleanChunks.length === 1 ? cleanChunks[0] : cleanChunks.join('');
  const rawIndicesArray = new Uint8Array(rawVsIndices);
  const vsBytes = (typeof invertVsBytes === 'function')
    ? invertVsBytes(rawIndicesArray, stegoKey)
    : rawIndicesArray;

  return {
    vsBytes,
    cleanText,
    rawVsIndices: rawIndicesArray
  };
}

/**
 * Build the stego-object by prepending the VS key to the cover-text.
 *
 * @param {string} coverText - The original cover-text.
 * @param {string} vsKeyStr  - The invisible VS-encoded XOR key.
 * @returns {string} The stego-object ready for transmission.
 */
function buildStegoObject(coverText, vsKeyStr) {
  return (vsKeyStr || '') + (coverText || '');
}
