// ══════════════════════════════════════════════════════════════
// Stage 3 — Hide | Step 1: Stego-Payload
// ══════════════════════════════════════════════════════════════
//
// Builds and parses the steganographic payload.
//
// Payload Format (v2 — with marker):
//   Byte 0:        0xFF marker (signals new format)
//   Byte 1:        Hint length in bytes (0–255)
//   Bytes 2..N:    Hint string (UTF-8 encoded)
//   Bytes N+1..M:  Secret message (UTF-8 encoded)
//
// Legacy Format (v1 — no marker):
//   Entire payload is the raw secret message (first byte ≠ 0xFF)
//
// Dependencies: shared/text_codec (SHARED_TEXT_ENCODER, SHARED_TEXT_DECODER)
//
// ══════════════════════════════════════════════════════════════


/**
 * Marker byte that distinguishes the v2 payload format from legacy.
 *
 * 0xFF is chosen because it is never the leading byte of a valid
 * UTF-8 sequence, so it unambiguously flags a structured payload
 * versus raw text.
 */
const PAYLOAD_MARKER = 0xFF;

/** Maximum hint size in bytes — constrained by the single-byte length field. */
const MAX_HINT_BYTES = 255;


/**
 * Build a structured payload from a secret message and an optional hint.
 *
 * The payload is assembled in the v2 format:
 *   [0xFF] [hintLength] [hintBytes...] [secretMessageBytes...]
 *
 * @param {string} secretMessage - The secret message to embed.
 * @param {string} hint          - An optional hint string (e.g., emoji or text).
 * @returns {Uint8Array} The assembled payload byte array.
 * @throws {Error} If the hint exceeds 255 bytes when UTF-8 encoded.
 */
function buildPayload(secretMessage, hint) {
  // Guard: ensure at least a secret message exists
  if (!secretMessage && (!hint || !hint.trim())) {
    return new Uint8Array(0);
  }

  const secretMessageBytes = SHARED_TEXT_ENCODER.encode(secretMessage || '');
  const trimmedHint = hint && hint.trim();
  const hintBytes   = trimmedHint
    ? SHARED_TEXT_ENCODER.encode(trimmedHint)
    : new Uint8Array(0);

  // Validate hint size — the length field is a single byte (0–255)
  if (hintBytes.length > MAX_HINT_BYTES) {
    throw new Error(
      `التلميح كبير جداً (${hintBytes.length} bytes) — الحد الأقصى ${MAX_HINT_BYTES} bytes.`
    );
  }

  // Allocate: 1 byte marker + 1 byte hint length + hint + secretMessage
  const payload = new Uint8Array(2 + hintBytes.length + secretMessageBytes.length);
  payload[0] = PAYLOAD_MARKER;
  payload[1] = hintBytes.length;

  if (hintBytes.length > 0) {
    payload.set(hintBytes, 2);
  }
  payload.set(secretMessageBytes, 2 + hintBytes.length);

  return payload;
}


/**
 * Parse a payload byte array into its secret message and hint components.
 *
 * Automatically detects the payload format:
 * - If the first byte is 0xFF → v2 format (extract hint + secret message).
 * - Otherwise → legacy format (entire payload is the secret message).
 *
 * @param {Uint8Array} bytes - The raw payload bytes.
 * @returns {{ secretMessage: string, hint: string }} The parsed components.
 */
function parsePayload(bytes) {
  const isNewFormat = bytes.length >= 2 && bytes[0] === PAYLOAD_MARKER;

  if (isNewFormat) {
    const hintLength = bytes[1];
    const hint = hintLength > 0
      ? SHARED_TEXT_DECODER.decode(bytes.subarray(2, 2 + hintLength))
      : '';
    const secretMessage = SHARED_TEXT_DECODER.decode(bytes.subarray(2 + hintLength));
    return { secretMessage, hint };
  }

  // Legacy format — entire payload is the raw secret message
  return { secretMessage: SHARED_TEXT_DECODER.decode(bytes), hint: '' };
}
