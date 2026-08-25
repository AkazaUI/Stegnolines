// ══════════════════════════════════════════════════════════════
// Stage 3 — Hide | Step 4: VS Codec (Audited & Hardened VS Encoding with S-Box Permutation)
// ══════════════════════════════════════════════════════════════
//
// Performance Highlights:
//   1. Dynamic Key-Dependent Permutation (VS S-Box Shuffle):
//      Generates a deterministic bijective permutation table (π: [0..255] ↔ [0..255])
//      derived from the Stego-Key via PBKDF2-HMAC-SHA256 and AES-256-CTR CSPRNG
//      using the Durstenfeld Fisher-Yates shuffle with Unbiased Rejection Sampling.
//   2. Bounded LRU Cache: Fixed-capacity (MAX_VS_CACHE_ENTRIES = 128) preventing RAM leaks.
//   3. Precomputed Direct Lookup Table (LUT): Instant O(1) byte-to-character conversion.
//   4. Direct bitwise parsing in xorKeyToVSString.
//
// Mapping:
//   Byte 0–15   → VS1–VS16    (U+FE00 – U+FE0F)   — BMP range
//   Byte 16–255 → VS17–VS256  (U+E0100 – U+E01EF) — Supplementary range
//
// Dependencies: step2_prng (pbkdf2HmacSha256, createAes256CtrCsprng, getUnbiasedRandomInt)
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

/** Maximum capacity for the LRU permutation cache. */
const MAX_VS_CACHE_ENTRIES = 128;

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

/**
 * Standard identity inverse mapping array (0..255 -> 0..255).
 */
const IDENTITY_INV_MAP = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
  IDENTITY_INV_MAP[i] = i;
}

const _VS_DOMAIN_SALT_BYTES = (function() {
  const saltStr = "StegoLine::VS_SBox_Permutation::v1::2026";
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(saltStr);
  const bytes = new Uint8Array(saltStr.length);
  for (let i = 0; i < saltStr.length; i++) bytes[i] = saltStr.charCodeAt(i);
  return bytes;
})();

const _vsPermutationCache = new Map();

function _setVsCacheEntry(key, value) {
  if (_vsPermutationCache.has(key)) {
    _vsPermutationCache.delete(key);
  } else if (_vsPermutationCache.size >= MAX_VS_CACHE_ENTRIES) {
    const oldestKey = _vsPermutationCache.keys().next().value;
    _vsPermutationCache.delete(oldestKey);
  }
  _vsPermutationCache.set(key, value);
}

/**
 * Generates or retrieves the key-dependent Variation Selector permutation tables.
 * @param {string} [stegoKey] - The pre-shared stego key.
 * @returns {{ fwdLut: string[], invMap: Uint8Array, isIdentity: boolean }}
 */
function getVsPermutation(stegoKey) {
  if (!stegoKey || typeof stegoKey !== 'string' || !stegoKey.trim()) {
    return { fwdLut: BYTE_TO_VS_LUT, invMap: IDENTITY_INV_MAP, isIdentity: true };
  }

  const cacheKey = stegoKey.trim();
  if (_vsPermutationCache.has(cacheKey)) {
    const cached = _vsPermutationCache.get(cacheKey);
    _vsPermutationCache.delete(cacheKey);
    _vsPermutationCache.set(cacheKey, cached);
    return cached;
  }

  if (typeof pbkdf2HmacSha256 === 'function' &&
      typeof createAes256CtrCsprng === 'function' &&
      typeof getUnbiasedRandomInt === 'function') {

    const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
    const passwordBytes = encoder
      ? encoder.encode(cacheKey)
      : new Uint8Array(Array.from(cacheKey).map(c => c.charCodeAt(0)));

    const keyBytes = pbkdf2HmacSha256(passwordBytes, _VS_DOMAIN_SALT_BYTES, 10000, 32);
    const csprng = createAes256CtrCsprng(keyBytes);

    const perm = new Uint8Array(256);
    for (let i = 0; i < 256; i++) perm[i] = i;

    for (let i = 255; i > 0; i--) {
      const j = getUnbiasedRandomInt(i + 1, csprng);
      const temp = perm[i];
      perm[i] = perm[j];
      perm[j] = temp;
    }

    const fwdLut = new Array(256);
    const invMap = new Uint8Array(256);

    for (let b = 0; b < 256; b++) {
      const vsIndex = perm[b];
      fwdLut[b] = BYTE_TO_VS_LUT[vsIndex];
      invMap[vsIndex] = b;
    }

    const result = { fwdLut, invMap, isIdentity: false };
    _setVsCacheEntry(cacheKey, result);
    return result;
  }

  return { fwdLut: BYTE_TO_VS_LUT, invMap: IDENTITY_INV_MAP, isIdentity: true };
}

/**
 * Inverts an array/typed-array of raw extracted VS character indices into original bytes.
 * Guaranteed immutable output.
 * @param {Uint8Array|number[]} rawVsIndices
 * @param {string} [stegoKey]
 * @returns {Uint8Array}
 */
function invertVsBytes(rawVsIndices, stegoKey) {
  if (!rawVsIndices || rawVsIndices.length === 0) return new Uint8Array(0);
  const { invMap, isIdentity } = getVsPermutation(stegoKey);
  const len = rawVsIndices.length;
  const out = new Uint8Array(len);

  if (isIdentity) {
    for (let i = 0; i < len; i++) {
      out[i] = rawVsIndices[i];
    }
    return out;
  }

  for (let i = 0; i < len; i++) {
    const idx = rawVsIndices[i];
    out[i] = idx < 256 ? invMap[idx] : 0;
  }
  return out;
}

// ── Range Check Helpers ─────────────────────────────────────

function isBaseVariationSelector(codePoint) {
  return typeof codePoint === 'number' && codePoint >= VS_BASE_START && codePoint <= VS_BASE_END;
}

function isSupplementaryVariationSelector(codePoint) {
  return typeof codePoint === 'number' && codePoint >= VS_SUPPLEMENT_START && codePoint <= VS_SUPPLEMENT_END;
}

// ── Byte ↔ VS Conversion ─────────────────────────────────────

function toVariationSelector(byteValue, stegoKey) {
  if (typeof byteValue === 'number' && Number.isInteger(byteValue) && byteValue >= 0 && byteValue < 256) {
    const { fwdLut } = getVsPermutation(stegoKey);
    return fwdLut[byteValue];
  }
  return null;
}

function fromVariationSelector(codePoint, stegoKey) {
  if (typeof codePoint !== 'number' || !Number.isInteger(codePoint)) return null;

  let vsIndex = null;
  if (isBaseVariationSelector(codePoint)) {
    vsIndex = codePoint - VS_BASE_START;
  } else if (isSupplementaryVariationSelector(codePoint)) {
    vsIndex = codePoint - VS_SUPPLEMENT_START + 16;
  }

  if (vsIndex !== null) {
    const { invMap } = getVsPermutation(stegoKey);
    return invMap[vsIndex];
  }
  return null;
}

// ── Binary Key → VS String ───────────────────────────────────

function padBinaryToByteAlignment(binaryString) {
  if (typeof binaryString !== 'string' || binaryString.length === 0) return '';
  const rem = binaryString.length & 7;
  if (rem === 0) return binaryString;
  return binaryString.padEnd(binaryString.length + (8 - rem), '0');
}

function xorKeyToVSString(binaryKey, stegoKey) {
  if (typeof binaryKey !== 'string' || binaryKey.length === 0) {
    return { vsStr: '', bytesArr: [] };
  }

  const paddedKey = padBinaryToByteAlignment(binaryKey);
  const totalBytes = paddedKey.length >> 3;
  const bytesArr = new Array(totalBytes);
  const vsChars = new Array(totalBytes);
  const { fwdLut } = getVsPermutation(stegoKey);

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
    vsChars[i] = fwdLut[byteVal];
  }

  return { vsStr: vsChars.join(''), bytesArr };
}
