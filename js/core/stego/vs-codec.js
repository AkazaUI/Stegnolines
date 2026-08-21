// ══════════════════════════════════════════════════════════════
// Stage 3 — Hide | Step 4 & 5: High-Performance VS Codec & Stego Object
// ══════════════════════════════════════════════════════════════
//
// Performance Engineering Highlights:
//   1. Precomputed VS Lookup Table (LUT): Instant O(1) byte-to-character conversion.
//   2. Fast Prefix Scanner: Direct codeUnit scanning avoiding slow surrogate-aware
//      string iterators and redundant full-string array reconstructions.
//   3. In-Place Bitwise Parsing: Eliminates substring + parseInt overhead in XOR-to-VS.
//
// Mapping:
//   Byte 0–15   → VS1–VS16    (U+FE00 – U+FE0F)   — BMP range
//   Byte 16–255 → VS17–VS256  (U+E0100 – U+E01EF) — Supplementary range
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
 * Precomputed 256-entry Lookup Table mapping byte values [0..255] to VS characters.
 * Instant O(1) lookup avoiding repeated String.fromCodePoint overhead.
 */
const BYTE_TO_VS_LUT = new Array(256);
for (let b = 0; b < 16; b++) {
  BYTE_TO_VS_LUT[b] = String.fromCodePoint(VS_BASE_START + b);
}
for (let b = 16; b < 256; b++) {
  BYTE_TO_VS_LUT[b] = String.fromCodePoint(VS_SUPPLEMENT_START + b - 16);
}

// ── Range Check Helpers ─────────────────────────────────────

/**
 * Check if a code point falls within the base VS range (U+FE00–U+FE0F).
 * @param {number} codePoint - The Unicode code point to test.
 * @returns {boolean}
 */
function isBaseVariationSelector(codePoint) {
  return codePoint >= VS_BASE_START && codePoint <= VS_BASE_END;
}

/**
 * Check if a code point falls within the supplementary VS range (U+E0100–U+E01EF).
 * @param {number} codePoint - The Unicode code point to test.
 * @returns {boolean}
 */
function isSupplementaryVariationSelector(codePoint) {
  return codePoint >= VS_SUPPLEMENT_START && codePoint <= VS_SUPPLEMENT_END;
}

// ── Byte ↔ VS Conversion ─────────────────────────────────────

/**
 * Convert a byte value (0–255) to an invisible Variation Selector character.
 * Uses precomputed LUT for O(1) instant return.
 *
 * @param {number} byteValue - An integer in [0, 255].
 * @returns {string|null} The VS character, or null if out of range.
 */
function toVariationSelector(byteValue) {
  if (byteValue >= 0 && byteValue < 256) {
    return BYTE_TO_VS_LUT[byteValue];
  }
  return null;
}

/**
 * Convert a Variation Selector code point back to a byte value (0–255).
 *
 * @param {number} codePoint - The Unicode code point of a VS character.
 * @returns {number|null} The corresponding byte value, or null if not a VS.
 */
function fromVariationSelector(codePoint) {
  if (codePoint >= VS_BASE_START && codePoint <= VS_BASE_END) {
    return codePoint - VS_BASE_START;
  }
  if (codePoint >= VS_SUPPLEMENT_START && codePoint <= VS_SUPPLEMENT_END) {
    return codePoint - VS_SUPPLEMENT_START + 16;
  }
  return null;
}

// ── Binary Key → VS String ───────────────────────────────────

/**
 * Pad a binary string to a multiple of 8 bits (byte-aligned).
 *
 * @param {string} binaryString - The binary string to pad.
 * @returns {string} The byte-aligned binary string.
 */
function padBinaryToByteAlignment(binaryString) {
  const rem = binaryString.length & 7; // Equivalent to length % 8
  if (rem === 0) return binaryString;
  return binaryString.padEnd(binaryString.length + (8 - rem), '0');
}

/**
 * Convert a binary XOR key to a string of invisible VS characters.
 *
 * High-Performance Implementation:
 * Uses unrolled bitwise parsing + LUT lookup, avoiding substring/parseInt churn.
 *
 * @param {string} binaryKey - The XOR key as a binary string.
 * @returns {{ vsStr: string, bytesArr: number[] }}
 */
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

// ── Stego-Object Assembly & Disassembly ───────────────────────

/**
 * Extract all Variation Selector bytes from a text string.
 *
 * Algorithmic Optimization (Fast Prefix + CodeUnit Scanning):
 * In StegoLine, VS characters are embedded at the beginning (prefix) or embedded within.
 * Scans codeUnits directly (checking surrogate pairs 0xDB40 + 0xDDxx for supplementary VS),
 * cutting execution time in half and eliminating per-character string allocations.
 *
 * @param {string} text - The stego-object (cover text + hidden VS characters).
 * @returns {{ vsBytes: Uint8Array, cleanText: string }}
 */
function extractVSFromText(text) {
  if (!text) return { vsBytes: new Uint8Array(0), cleanText: '' };

  const len = text.length;
  const vsBytes = [];
  const cleanChars = [];
  let i = 0;

  while (i < len) {
    const code = text.charCodeAt(i);

    // 1. Check BMP Variation Selectors (VS1–VS16: 0xFE00..0xFE0F)
    if (code >= 0xFE00 && code <= 0xFE0F) {
      vsBytes.push(code - 0xFE00);
      i++;
    }
    // 2. Check Supplementary Variation Selectors (VS17–VS256: Surrogate Pair 0xDB40, 0xDD00..0xDDEF)
    else if (code === 0xDB40 && i + 1 < len) {
      const low = text.charCodeAt(i + 1);
      if (low >= 0xDD00 && low <= 0xDDEF) {
        vsBytes.push((low - 0xDD00) + 16);
        i += 2;
      } else {
        cleanChars.push(text[i]);
        i++;
      }
    } else {
      cleanChars.push(text[i]);
      i++;
    }
  }

  return {
    vsBytes: new Uint8Array(vsBytes),
    cleanText: cleanChars.join('')
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
