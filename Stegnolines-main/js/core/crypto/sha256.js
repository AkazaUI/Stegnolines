// ══════════════════════════════════════════════════════════════
// Core Cryptography — SHA-256 Hashing Service
// ══════════════════════════════════════════════════════════════

/**
 * Compute the SHA-256 hash of a string using the Web Crypto API.
 *
 * Used when no password is provided — the cover text itself is hashed
 * to produce a deterministic, reproducible password.
 *
 * @param {string} message - The input string to hash.
 * @returns {Promise<string>} The hex-encoded SHA-256 digest.
 */
async function sha256(message) {
  const encoder = typeof SHARED_TEXT_ENCODER !== 'undefined' ? SHARED_TEXT_ENCODER : new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashBytes = Array.from(new Uint8Array(hashBuffer));
  return hashBytes.map(byte => byte.toString(16).padStart(2, '0')).join('');
}
