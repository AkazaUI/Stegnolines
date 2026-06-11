// ══════════════════════════════════════════════════════════════
// Core Cryptography — Zero-Overhead AES-256-CTR Engine
// ══════════════════════════════════════════════════════════════

/**
 * Deterministically derives the 256-bit AES key and the 128-bit CTR counter block
 * using PBKDF2-HMAC-SHA256 based on the password and the Cover Text.
 *
 * @param {string} encryptionKey - The user's secret password.
 * @param {string} coverText     - The stego carrier text (available to both parties).
 * @returns {Promise<{ keyBytes: Uint8Array, counterBytes: Uint8Array }>}
 */
async function deriveAesCtrParams(encryptionKey, coverText) {
  const encoder = typeof SHARED_TEXT_ENCODER !== 'undefined' ? SHARED_TEXT_ENCODER : new TextEncoder();

  // 1. Derive a unique, high-entropy 16-byte Salt from the Cover Text
  const coverBytes = encoder.encode(coverText || '');
  const coverHashBuffer = await crypto.subtle.digest('SHA-256', coverBytes);
  const salt = new Uint8Array(coverHashBuffer).slice(0, 16);

  // 2. Import the raw password string for PBKDF2 derivation
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(encryptionKey),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  // 3. Derive 384 bits (48 bytes) of cryptographic key material
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    384
  );

  const derivedBytes = new Uint8Array(derivedBits);
  const keyBytes = derivedBytes.slice(0, 32);     // First 256 bits for AES-256 Key
  const counterBytes = derivedBytes.slice(32, 48); // Remaining 128 bits for Counter block

  return { keyBytes, counterBytes };
}

/**
 * Encrypts payload bytes using AES-256-CTR with 0-byte size overhead.
 *
 * @param {Uint8Array} plainBytes    - The input bytes to encrypt (compressed or raw).
 * @param {string}     encryptionKey - The password entered by the user.
 * @param {string}     coverText     - The stego carrier text used to derive the IV.
 * @returns {Promise<Uint8Array>} The encrypted ciphertext bytes (exactly same length as input).
 */
async function encryptPayloadCtr(plainBytes, encryptionKey, coverText) {
  if (!encryptionKey) return plainBytes;

  const { keyBytes, counterBytes } = await deriveAesCtrParams(encryptionKey, coverText);

  const aesKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-CTR' },
    false,
    ['encrypt']
  );

  const cipherBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-CTR',
      counter: counterBytes,
      length: 64
    },
    aesKey,
    plainBytes
  );

  return new Uint8Array(cipherBuffer);
}

/**
 * Decrypts ciphertext bytes using AES-256-CTR.
 *
 * @param {Uint8Array} cipherBytes   - The encrypted bytes to decrypt.
 * @param {string}     encryptionKey - The password entered by the user.
 * @param {string}     coverText     - The stego carrier text used to derive the IV.
 * @returns {Promise<Uint8Array>} The decrypted plaintext bytes.
 * @throws {Error} If decryption fails (e.g. wrong key, corrupted data).
 */
async function decryptPayloadCtr(cipherBytes, encryptionKey, coverText) {
  if (!encryptionKey) return cipherBytes;

  const { keyBytes, counterBytes } = await deriveAesCtrParams(encryptionKey, coverText);

  const aesKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-CTR' },
    false,
    ['decrypt']
  );

  const plainBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-CTR',
      counter: counterBytes,
      length: 64
    },
    aesKey,
    cipherBytes
  );

  return new Uint8Array(plainBuffer);
}
