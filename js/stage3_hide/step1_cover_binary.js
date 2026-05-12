// ══════════════════════════════════════════════════════════════
// Stage 3 — Hide | Step 1: Cover Binary
// ══════════════════════════════════════════════════════════════
//
// Converts text (Cover / Secret) to binary representation and back.
// This step is the foundation upon which all subsequent steps build.
//
// Encoding: UTF-8 (variable-length, 1–4 bytes per character)
// Binary unit: 8 bits per byte
//
// ══════════════════════════════════════════════════════════════


// ── Shared Encoder/Decoder (DRY) ──────────────────────────────
// Single instances reused across all modules (step1, step2, step3)
// to avoid repeated instantiation on every function call.

/** @type {TextEncoder} Shared UTF-8 encoder — used by step1, step2, step3. */
const SHARED_TEXT_ENCODER = new TextEncoder();

/** @type {TextDecoder} Shared UTF-8 decoder — used by step1, step2. */
const SHARED_TEXT_DECODER = new TextDecoder();


/**
 * Convert a UTF-8 string to its binary representation.
 *
 * Each character is encoded using the standard UTF-8 encoding via
 * TextEncoder, then each resulting byte is converted to an 8-bit
 * binary string. This ensures consistent handling of multi-byte
 * characters (e.g., Arabic, emoji).
 *
 * @param {string} str - The input string to convert.
 * @returns {string} A binary string (e.g., "0100100001101001" for "Hi").
 */
function stringToBinary(str) {
  if (!str) return '';
  const encodedBytes = SHARED_TEXT_ENCODER.encode(str);
  return bytesToBinary(encodedBytes);
}


/**
 * Convert a binary string back to a readable UTF-8 text string.
 *
 * The binary string is split into 8-bit chunks, each chunk is parsed
 * as a byte, and the resulting byte array is decoded using TextDecoder.
 *
 * @param {string} binaryString - A string of '0' and '1' characters.
 * @returns {string} The decoded UTF-8 text.
 */
function binaryToString(binaryString) {
  if (!binaryString) return '';
  const decodedBytes = binaryToBytes(binaryString);
  return SHARED_TEXT_DECODER.decode(decodedBytes);
}


/**
 * Convert a Uint8Array of bytes to a binary string.
 *
 * Uses Array.from + map + join for efficient string construction,
 * avoiding O(n²) cost of repeated string concatenation.
 *
 * @param {Uint8Array} bytes - The byte array to convert.
 * @returns {string} A binary string where each byte is represented as 8 bits.
 */
function bytesToBinary(bytes) {
  return Array.from(bytes, byte => byte.toString(2).padStart(8, '0')).join('');
}


/**
 * Convert a binary string to a Uint8Array of bytes.
 *
 * Splits the binary string into 8-character chunks and parses
 * each chunk as a base-2 integer. Any trailing bits that don't
 * form a complete byte are ignored.
 *
 * @param {string} binaryString - A string of '0' and '1' characters.
 * @returns {Uint8Array} The resulting byte array.
 */
function binaryToBytes(binaryString) {
  const byteCount = Math.floor(binaryString.length / 8);
  const bytes = new Uint8Array(byteCount);
  for (let i = 0; i < byteCount; i++) {
    bytes[i] = parseInt(binaryString.substring(i * 8, i * 8 + 8), 2);
  }
  return bytes;
}
