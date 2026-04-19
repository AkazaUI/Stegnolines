// ══════════════════════════════════════════════════════════════
// Stage 3 — Hide | Step 2: Stego-Payload
// ══════════════════════════════════════════════════════════════
//
// بناء وتحليل الحمولة (Payload)
// تنسيق الحمولة: [0xFF marker] [1 byte hint_length] [hint bytes...] [message bytes...]
// التنسيق القديم:  [message bytes...]  (أول بايت ≠ 0xFF)
//
// ══════════════════════════════════════════════════════════════


const PAYLOAD_MARKER = 0xFF;

/**
 * Build payload bytes from secret message and optional hint.
 * Returns Uint8Array.
 */
function buildPayload(secret, hint) {
  const secretBytes = new TextEncoder().encode(secret);
  const hintBytes = (hint && hint.trim())
    ? new TextEncoder().encode(hint.trim())
    : new Uint8Array(0);

  const payload = new Uint8Array(2 + hintBytes.length + secretBytes.length);
  payload[0] = PAYLOAD_MARKER;
  payload[1] = hintBytes.length;
  if (hintBytes.length > 0) {
    payload.set(hintBytes, 2);
  }
  payload.set(secretBytes, 2 + hintBytes.length);
  return payload;
}

/**
 * Parse payload bytes → { secret, hint }.
 * Handles both new format (with marker) and legacy (raw message).
 */
function parsePayload(bytes) {
  if (bytes.length >= 2 && bytes[0] === PAYLOAD_MARKER) {
    // New format
    const hintLen = bytes[1];
    const hint = hintLen > 0
      ? new TextDecoder().decode(bytes.slice(2, 2 + hintLen))
      : '';
    const secret = new TextDecoder().decode(bytes.slice(2 + hintLen));
    return { secret, hint };
  } else {
    // Legacy format — entire payload is the message
    return { secret: new TextDecoder().decode(bytes), hint: '' };
  }
}
