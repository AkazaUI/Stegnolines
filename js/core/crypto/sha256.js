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

  const subtle = (typeof crypto !== 'undefined' && crypto.subtle)
    ? crypto.subtle
    : (typeof self !== 'undefined' && self.crypto && self.crypto.subtle ? self.crypto.subtle : null);

  if (subtle && typeof subtle.digest === 'function') {
    const hashBuffer = await subtle.digest('SHA-256', data);
    const hashBytes = Array.from(new Uint8Array(hashBuffer));
    return hashBytes.map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Pure JavaScript Fallback for non-secure HTTP contexts or missing WebCrypto
  if (typeof sha256Bytes === 'function') {
    const hashBytes = Array.from(sha256Bytes(data));
    return hashBytes.map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  throw new Error('SHA-256 digest engine is unavailable. Please ensure your domain is served over HTTPS.');
}

