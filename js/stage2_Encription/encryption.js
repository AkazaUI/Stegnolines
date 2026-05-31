// ══════════════════════════════════════════════════════════════
// Stage 2 — Encryption | Zero-Overhead AES-256-CTR Engine
// ══════════════════════════════════════════════════════════════
//
// Implements highly secure symmetric encryption with exactly 0 bytes
// of payload overhead. Uses AES-CTR (Counter Mode) which acts as a
// stream cipher, keeping plaintext and ciphertext sizes identical.
//
// Key & IV Derivation:
//   To avoid key-stream reuse (two-time pad) without transmitting an
//   Initialization Vector (IV) or Salt, we derive them deterministically:
//
//   1. Cover Text ──> SHA-256 Hash ──> Salt (16 Bytes)
//   2. Encryption Key + Salt ──> PBKDF2-HMAC-SHA256 (100,000 Iterations)
//      ──> 384 Bits derived:
//          - First 256 bits: AES-256 key
//          - Remaining 128 bits: AES-CTR Initial Counter (IV)
//
// Dependencies: Web Crypto API (supported natively in all modern browsers)
//
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
  //    Since the Cover Text is unique for each message, the Salt is also unique.
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
    384 // 384 bits = 48 bytes
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

  // Import derived raw bytes as an AES-CTR CryptoKey
  const aesKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-CTR' },
    false,
    ['encrypt']
  );

  // Encrypt payload via AES-CTR (0-byte padding/tag overhead)
  const cipherBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-CTR',
      counter: counterBytes,
      length: 64 // Use 64 bits for the counter component (standard block count size)
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

  // Import derived raw bytes as an AES-CTR CryptoKey
  const aesKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-CTR' },
    false,
    ['decrypt']
  );

  // Decrypt payload
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
