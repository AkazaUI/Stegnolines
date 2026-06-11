// ══════════════════════════════════════════════════════════════
// Stage 3 — Hide | Step 4 & 5: VS Codec & Stego Object (Refactored)
// ══════════════════════════════════════════════════════════════
//
// Encodes and decodes data using invisible Unicode Variation Selector
// characters. VS characters are invisible and do not alter rendered
// text, making them ideal for steganographic embedding.
//
// Mapping:
//   Byte 0–15   → VS1–VS16    (U+FE00 – U+FE0F)   — BMP range
//   Byte 16–255 → VS17–VS256  (U+E0100 – U+E01EF) — Supplementary range
//
// Dependencies: None
//
// ══════════════════════════════════════════════════════════════

/** Start of the base Variation Selector range (VS1–VS16, BMP). */
const VS_BASE_START = 0xFE00;
/** End of the base Variation Selector range (inclusive). */
const VS_BASE_END   = 0xFE0F;

/** Start of the supplementary Variation Selector range (VS17–VS256). */
const VS_SUPPLEMENT_START = 0xE0100;
/** End of the supplementary Variation Selector range (inclusive). */
const VS_SUPPLEMENT_END   = 0xE01EF;


// ── Range Check Helpers ─────────────────────────────────

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
 *
 * Bytes 0–15 map to the BMP range (VS1–VS16), and bytes 16–255 map to the
 * supplementary range (VS17–VS256).
 *
 * @param {number} byteValue - An integer in [0, 255].
 * @returns {string|null} The VS character, or null if out of range.
 */
function toVariationSelector(byteValue) {
  if (byteValue >= 0 && byteValue < 16) {
    return String.fromCodePoint(VS_BASE_START + byteValue);
  }
  if (byteValue >= 16 && byteValue < 256) {
    return String.fromCodePoint(VS_SUPPLEMENT_START + byteValue - 16);
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
  if (isBaseVariationSelector(codePoint)) {
    return codePoint - VS_BASE_START;
  }
  if (isSupplementaryVariationSelector(codePoint)) {
    return codePoint - VS_SUPPLEMENT_START + 16;
  }
  return null;
}


// ── Binary Key → VS String ───────────────────────────────────

/**
 * Pad a binary string to a multiple of 8 bits (byte-aligned).
 *
 * Trailing '0' bits are appended. This is necessary because the XOR key
 * length might not be a multiple of 8, but VS encoding works on whole bytes.
 *
 * @param {string} binaryString - The binary string to pad.
 * @returns {string} The byte-aligned binary string.
 */
function padBinaryToByteAlignment(binaryString) {
  const targetLength = Math.ceil(binaryString.length / 8) * 8;
  return binaryString.padEnd(targetLength, '0');
}

/**
 * Convert a binary XOR key to a string of invisible VS characters.
 *
 * Pipeline: binary string → pad to 8-bit alignment → split into bytes →
 * convert each byte to a VS character.
 *
 * @param {string} binaryKey - The XOR key as a binary string.
 * @returns {{ vsStr: string, bytesArr: number[] }}
 *   vsStr    — The invisible VS character string.
 *   bytesArr — The intermediate byte values (for visualization).
 */
function xorKeyToVSString(binaryKey) {
  const paddedKey = padBinaryToByteAlignment(binaryKey);
  const bytesArr = [];
  const vsChars = [];

  for (let i = 0; i + 8 <= paddedKey.length; i += 8) {
    const byteValue = parseInt(paddedKey.substring(i, i + 8), 2);
    bytesArr.push(byteValue);
    vsChars.push(toVariationSelector(byteValue));
  }

  return { vsStr: vsChars.join(''), bytesArr };
}


// ── Stego-Object Assembly & Disassembly ───────────────────────

/**
 * Extract all Variation Selector bytes from a text string.
 *
 * Iterates over every character, separating VS characters (converted to
 * byte values) from visible text. This is the first step of extraction.
 *
 * @param {string} text - The stego-object (cover text + hidden VS characters).
 * @returns {{ vsBytes: Uint8Array, cleanText: string }}
 *   vsBytes   — The extracted VS byte values.
 *   cleanText — The visible text with all VS characters removed.
 */
function extractVSFromText(text) {
  const vsBytes = [];
  const visibleChars = [];

  for (const char of text) {
    const codePoint = char.codePointAt(0);
    const byteValue = fromVariationSelector(codePoint);

    if (byteValue !== null) {
      vsBytes.push(byteValue);
    } else {
      visibleChars.push(char);
    }
  }

  return { vsBytes: new Uint8Array(vsBytes), cleanText: visibleChars.join('') };
}

/**
 * Build the stego-object by prepending the VS key to the cover-text.
 *
 * The VS characters are invisible, so the stego-object looks identical
 * to the original cover-text to the human eye.
 *
 * @param {string} coverText - The original cover-text.
 * @param {string} vsKeyStr  - The invisible VS-encoded XOR key.
 * @returns {string} The stego-object ready for transmission.
 */
function buildStegoObject(coverText, vsKeyStr) {
  return vsKeyStr + coverText;
}
