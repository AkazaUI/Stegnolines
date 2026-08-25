// ══════════════════════════════════════════════════════════════
// Stage 3 — Hide | Step 4: VS Codec (Ultra-High-Performance VS Encoding)
// ══════════════════════════════════════════════════════════════
//
// Performance Highlights:
//   1. Precomputed Direct Lookup Table (LUT): Instant O(1) byte-to-character conversion.
//   2. Direct bitwise parsing in xorKeyToVSString.
//
// Mapping:
//   Byte 0–15   → VS1–VS16    (U+FE00 – U+FE0F)   — BMP range
//   Byte 16–255 → VS17–VS256  (U+E0100 – U+E01EF) — Supplementary range
//
// Dependencies: shared/text_codec (bytesToBinary)
//
// ══════════════════════════════════════════════════════════════

'use strict';

/** Start of the base Variation Selector range (VS1–VS16, BMP). */
const VS_BASE_START = 0xFE00;
/** End of the base Variation Selector range (inclusive). */
const VS_BASE_END   = 0xFE0F;

/** Start of the supplementary Variation Selector range (VS17–VS256). */
const VS_SUPPLEMENT_START = 0xE0100;
/** End of the supplementary Variation Selector range (inclusive). */
const VS_SUPPLEMENT_END   = 0xE01EF;

/**
 * Precomputed 256-entry Lookup Table mapping byte values [0..255] to Variation Selector characters.
 */
const BYTE_TO_VS_LUT = new Array(256);
for (let b = 0; b < 16; b++) {
  BYTE_TO_VS_LUT[b] = String.fromCodePoint(VS_BASE_START + b);
}
for (let b = 16; b < 256; b++) {
  BYTE_TO_VS_LUT[b] = String.fromCodePoint(VS_SUPPLEMENT_START + b - 16);
}

// ── Range Check Helpers ─────────────────────────────────────

function isBaseVariationSelector(codePoint) {
  return codePoint >= VS_BASE_START && codePoint <= VS_BASE_END;
}

function isSupplementaryVariationSelector(codePoint) {
  return codePoint >= VS_SUPPLEMENT_START && codePoint <= VS_SUPPLEMENT_END;
}

// ── Byte ↔ VS Conversion ─────────────────────────────────────

function toVariationSelector(byteValue) {
  if (byteValue >= 0 && byteValue < 256) {
    return BYTE_TO_VS_LUT[byteValue];
  }
  return null;
}

function fromVariationSelector(codePoint) {
  if (codePoint >= VS_BASE_START && codePoint <= VS_BASE_END) {
    return codePoint - VS_BASE_START;
  }
  if (codePoint >= VS_SUPPLEMENT_START && codePoint <= VS_SUPPLEMENT_END) {
    return 16 + (codePoint - VS_SUPPLEMENT_START);
  }
  return null;
}

// ── Binary Key → VS String ───────────────────────────────────

function padBinaryToByteAlignment(binaryString) {
  const rem = binaryString.length & 7;
  if (rem === 0) return binaryString;
  return binaryString.padEnd(binaryString.length + (8 - rem), '0');
}

function xorKeyToVSString(binaryKey) {
  const paddedKey = padBinaryToByteAlignment(binaryKey);
  const totalBytes = paddedKey.length >> 3;
  const bytesArr = new Array(totalBytes);
  const vsChars = new Array(totalBytes);

  for (let i = 0; i < totalBytes; i++) {
    const base = i << 3;
    const byteVal = ((paddedKey.charCodeAt(base) & 1) << 7) |
                    ((paddedKey.charCodeAt(base + 1) & 1) << 6) |
                    ((paddedKey.charCodeAt(base + 2) & 1) << 5) |
                    ((paddedKey.charCodeAt(base + 3) & 1) << 4) |
                    ((paddedKey.charCodeAt(base + 4) & 1) << 3) |
                    ((paddedKey.charCodeAt(base + 5) & 1) << 2) |
                    ((paddedKey.charCodeAt(base + 6) & 1) << 1) |
                    (paddedKey.charCodeAt(base + 7) & 1);

    bytesArr[i] = byteVal;
    vsChars[i] = BYTE_TO_VS_LUT[byteVal];
  }

  return { vsStr: vsChars.join(''), bytesArr };
}
