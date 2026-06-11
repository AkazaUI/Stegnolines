// ══════════════════════════════════════════════════════════════
// Stage 3 — Hide | Step 1: Stego-Payload
// ══════════════════════════════════════════════════════════════
//
// Builds and parses the steganographic payload.
//
// Format Selection (automatic — zero-overhead when no hint):
//
//   Without hint (raw format — 0 bytes overhead):
//     [secretMessageBytes...]
//
//   With hint (delimiter format — 1 byte overhead):
//     [secretMessageBytes...][0xFF][hintBytes...]
//
// 0xFF is safe as a delimiter because it NEVER appears in valid
// UTF-8 encoded text (it's an illegal byte in the UTF-8 spec).
// So the first occurrence of 0xFF unambiguously marks the boundary.
//
// Dependencies: shared/text_codec (SHARED_TEXT_ENCODER, SHARED_TEXT_DECODER)
//
// ══════════════════════════════════════════════════════════════


/**
 * Delimiter byte that separates the secret message from the hint.
 *
 * 0xFF is chosen because it never appears in valid UTF-8 encoded
 * text, so it can serve as an unambiguous single-byte separator.
 */
const HINT_DELIMITER = 0xFF;


/**
 * Build a payload from a secret message and an optional hint.
 *
 * Format is chosen automatically for minimal overhead:
 *   - No hint → raw bytes:         [messageBytes...]          (0 bytes overhead)
 *   - With hint → delimited:       [messageBytes...][0xFF][hintBytes...]  (1 byte overhead)
 *
 * @param {string} secretMessage - The secret message to embed.
 * @param {string} hint          - An optional hint string (e.g., emoji or text).
 * @returns {Uint8Array} The assembled payload byte array.
 */
function buildPayload(secretMessage, hint) {
  // Guard: ensure at least a secret message exists
  if (!secretMessage && (!hint || !hint.trim())) {
    return new Uint8Array(0);
  }

  const secretMessageBytes = SHARED_TEXT_ENCODER.encode(secretMessage || '');
  const trimmedHint = hint && hint.trim();

  // ── No hint → raw format (zero overhead)
  if (!trimmedHint) {
    return secretMessageBytes;
  }

  // ── With hint → delimiter format (1 byte overhead)
  const hintBytes = SHARED_TEXT_ENCODER.encode(trimmedHint);

  // Allocate: message + 1 byte delimiter + hint
  const payload = new Uint8Array(secretMessageBytes.length + 1 + hintBytes.length);
  payload.set(secretMessageBytes, 0);
  payload[secretMessageBytes.length] = HINT_DELIMITER;
  payload.set(hintBytes, secretMessageBytes.length + 1);

  return payload;
}


/**
 * Parse a payload byte array into its secret message and hint components.
 *
 * Scans for the 0xFF delimiter byte:
 *   - Found → everything before = secret message, everything after = hint
 *   - Not found → entire payload is the secret message (no hint)
 *
 * @param {Uint8Array} bytes - The raw payload bytes.
 * @returns {{ secretMessage: string, hint: string }} The parsed components.
 */
function parsePayload(bytes) {
  // Scan for the delimiter byte
  const delimiterIndex = bytes.indexOf(HINT_DELIMITER);

  if (delimiterIndex !== -1) {
    const secretMessage = SHARED_TEXT_DECODER.decode(bytes.subarray(0, delimiterIndex));
    const hint = SHARED_TEXT_DECODER.decode(bytes.subarray(delimiterIndex + 1));
    return { secretMessage, hint };
  }

  // No delimiter — entire payload is the raw secret message
  return { secretMessage: SHARED_TEXT_DECODER.decode(bytes), hint: '' };
}
