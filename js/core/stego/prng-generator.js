// ══════════════════════════════════════════════════════════════
// Stage 3 — Hide | Step 2: PRNG Position Generator (Upgraded)
// ══════════════════════════════════════════════════════════════
//
// Generates deterministic pseudo-random positions from a password
// using a cryptographic-strength pipeline:
//
//   Password → PBKDF2-HMAC-SHA256 (100K rounds) → 256-bit Key
//   Key → AES-256-CTR CSPRNG → Unbiased Rejection Sampling
//   → O(K) Lazy Fisher-Yates → Positions
//
// Includes a legacy fallback engine (DJB2 + Mulberry32) for
// backward compatibility with messages hidden by older versions.
//
// Components:
//   1. SHA-256 & HMAC-SHA256  — Bitwise-optimized pure JS implementation
//   2. PBKDF2 Key Derivation  — 100,000 iterations with domain salt & cache
//   3. AES-256-CTR CSPRNG      — Block cipher stream generator
//   4. Rejection Sampling      — Eliminates modulo bias completely
//   5. Lazy Fisher-Yates       — O(K) memory via Map (not O(N) array)
//   6. Legacy PRNG Fallback    — DJB2 + Mulberry32 for backward compat
//   7. Smart Key Resolver      — Auto-derives key from SHA-256(coverText)
//
// Dependencies: js/core/crypto/sha256.js (for resolveStegoKey auto-derive)
//
// ══════════════════════════════════════════════════════════════


// ══════════════════════════════════════════════════════════════
// Unit 1: SHA-256 & HMAC-SHA256 (Bitwise-Optimized Pure JS)
// ══════════════════════════════════════════════════════════════

/**
 * SHA-256 constants: first 32 bits of the fractional parts
 * of the cube roots of the first 64 primes.
 */
const _SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
  0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);

/**
 * Compute SHA-256 hash of a byte array.
 *
 * Pure JavaScript implementation using bitwise operations and
 * Uint32Array for maximum performance in non-WebCrypto contexts.
 *
 * @param {Uint8Array} messageBytes - The input bytes to hash.
 * @returns {Uint8Array} 32-byte SHA-256 digest.
 */
function sha256Bytes(messageBytes) {
  // Pre-processing: pad message to 512-bit blocks
  const msgLen = messageBytes.length;
  const bitLen = msgLen * 8;

  // Calculate padded length: msg + 1 byte (0x80) + padding + 8 bytes (length)
  const paddedLen = Math.ceil((msgLen + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(messageBytes);
  padded[msgLen] = 0x80;

  // Append original length as 64-bit big-endian
  const dv = new DataView(padded.buffer);
  dv.setUint32(paddedLen - 4, bitLen, false);

  // Initial hash values (first 32 bits of fractional parts of sqrt of first 8 primes)
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const W = new Uint32Array(64);

  // Process each 512-bit (64-byte) block
  for (let offset = 0; offset < paddedLen; offset += 64) {
    // Prepare message schedule
    for (let t = 0; t < 16; t++) {
      W[t] = dv.getUint32(offset + t * 4, false);
    }
    for (let t = 16; t < 64; t++) {
      const s0 = ((W[t-15] >>> 7) | (W[t-15] << 25)) ^ ((W[t-15] >>> 18) | (W[t-15] << 14)) ^ (W[t-15] >>> 3);
      const s1 = ((W[t-2] >>> 17) | (W[t-2] << 15)) ^ ((W[t-2] >>> 19) | (W[t-2] << 13)) ^ (W[t-2] >>> 10);
      W[t] = (W[t-16] + s0 + W[t-7] + s1) | 0;
    }

    // Initialize working variables
    let a = h0, b = h1, c = h2, d = h3;
    let e = h4, f = h5, g = h6, h = h7;

    // Compression function
    for (let t = 0; t < 64; t++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + _SHA256_K[t] + W[t]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g; g = f; f = e;
      e = (d + temp1) | 0;
      d = c; c = b; b = a;
      a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }

  // Produce final hash as 32 bytes
  const hash = new Uint8Array(32);
  const hashView = new DataView(hash.buffer);
  hashView.setUint32(0, h0, false);  hashView.setUint32(4, h1, false);
  hashView.setUint32(8, h2, false);  hashView.setUint32(12, h3, false);
  hashView.setUint32(16, h4, false); hashView.setUint32(20, h5, false);
  hashView.setUint32(24, h6, false); hashView.setUint32(28, h7, false);
  return hash;
}

/**
 * Compute HMAC-SHA256 of a message with a given key.
 *
 * @param {Uint8Array} keyBytes     - The HMAC key.
 * @param {Uint8Array} messageBytes - The message to authenticate.
 * @returns {Uint8Array} 32-byte HMAC-SHA256 output.
 */
function hmacSha256(keyBytes, messageBytes) {
  const blockSize = 64; // SHA-256 block size

  // If key is longer than block size, hash it first
  let key = keyBytes;
  if (key.length > blockSize) {
    key = sha256Bytes(key);
  }

  // Pad key to block size
  const paddedKey = new Uint8Array(blockSize);
  paddedKey.set(key);

  // Compute inner and outer padded keys
  const ipad = new Uint8Array(blockSize);
  const opad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    ipad[i] = paddedKey[i] ^ 0x36;
    opad[i] = paddedKey[i] ^ 0x5C;
  }

  // Inner hash: H(ipad || message)
  const innerInput = new Uint8Array(blockSize + messageBytes.length);
  innerInput.set(ipad);
  innerInput.set(messageBytes, blockSize);
  const innerHash = sha256Bytes(innerInput);

  // Outer hash: H(opad || innerHash)
  const outerInput = new Uint8Array(blockSize + 32);
  outerInput.set(opad);
  outerInput.set(innerHash, blockSize);
  return sha256Bytes(outerInput);
}


// ══════════════════════════════════════════════════════════════
// Unit 2: PBKDF2-HMAC-SHA256 with Instant Cache
// ══════════════════════════════════════════════════════════════

/**
 * Fixed domain-specific salt for PRNG key derivation.
 * This ensures deterministic output for the same password across sessions.
 */
const _STEGO_DOMAIN_SALT_BYTES = (function() {
  const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
  if (encoder) return encoder.encode("StegoLine::CSPRNG::v2::Salt2026!");
  // Fallback for environments without TextEncoder
  const str = "StegoLine::CSPRNG::v2::Salt2026!";
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
})();

/** Cache for derived keys to avoid recomputation for the same password. */
const _derivedKeyCache = new Map();

/**
 * Asynchronously derive a 256-bit key from a password using WebCrypto PBKDF2-HMAC-SHA256
 * (100,000 iterations), falling back to pure JS if WebCrypto is unavailable.
 *
 * @param {string} passwordStr - The password string.
 * @returns {Promise<Uint8Array>} 32-byte derived key.
 */
async function deriveKeyPbkdf2Async(passwordStr) {
  if (_derivedKeyCache.has(passwordStr)) {
    return _derivedKeyCache.get(passwordStr);
  }

  const cryptoObj = (typeof crypto !== 'undefined' && crypto.subtle)
    ? crypto
    : (typeof self !== 'undefined' && self.crypto && self.crypto.subtle ? self.crypto : null);

  if (cryptoObj && cryptoObj.subtle) {
    try {
      const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : new TextEncoder();
      const passwordBytes = encoder.encode(passwordStr);
      const keyMaterial = await cryptoObj.subtle.importKey(
        'raw',
        passwordBytes,
        'PBKDF2',
        false,
        ['deriveBits']
      );
      const derivedBits = await cryptoObj.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: _STEGO_DOMAIN_SALT_BYTES,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        256
      );
      const keyBytes = new Uint8Array(derivedBits);
      _derivedKeyCache.set(passwordStr, keyBytes);
      return keyBytes;
    } catch (e) {
      console.warn('[deriveKeyPbkdf2Async] WebCrypto error, falling back to pure JS:', e);
    }
  }

  return deriveKeyPbkdf2(passwordStr);
}

/**
 * Derive a 256-bit key from a password using PBKDF2-HMAC-SHA256 (Synchronous).
 *
 * Uses 100,000 iterations per NIST SP 800-132 recommendation.
 * Results are cached to avoid redundant computation.
 *
 * @param {string} passwordStr - The password string to derive a key from.
 * @returns {Uint8Array} 32-byte derived key.
 */
function deriveKeyPbkdf2(passwordStr) {
  if (_derivedKeyCache.has(passwordStr)) {
    return _derivedKeyCache.get(passwordStr);
  }

  const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
  let passwordBytes;
  if (encoder) {
    passwordBytes = encoder.encode(passwordStr);
  } else {
    passwordBytes = new Uint8Array(passwordStr.length);
    for (let i = 0; i < passwordStr.length; i++) passwordBytes[i] = passwordStr.charCodeAt(i);
  }

  const keyBytes = pbkdf2HmacSha256(passwordBytes, _STEGO_DOMAIN_SALT_BYTES, 100000, 32);
  _derivedKeyCache.set(passwordStr, keyBytes);
  return keyBytes;
}

/**
 * PBKDF2-HMAC-SHA256 implementation per RFC 2898 / NIST SP 800-132.
 *
 * @param {Uint8Array} password   - The password bytes.
 * @param {Uint8Array} salt       - The salt bytes.
 * @param {number}     iterations - Number of HMAC iterations.
 * @param {number}     dkLen      - Desired derived key length in bytes.
 * @returns {Uint8Array} The derived key.
 */
function pbkdf2HmacSha256(password, salt, iterations, dkLen) {
  const hashLen = 32; // SHA-256 output length
  const numBlocks = Math.ceil(dkLen / hashLen);
  const dk = new Uint8Array(numBlocks * hashLen);

  for (let blockIndex = 1; blockIndex <= numBlocks; blockIndex++) {
    // U_1 = HMAC(password, salt || INT_32_BE(blockIndex))
    const saltPlusIndex = new Uint8Array(salt.length + 4);
    saltPlusIndex.set(salt);
    saltPlusIndex[salt.length]     = (blockIndex >>> 24) & 0xFF;
    saltPlusIndex[salt.length + 1] = (blockIndex >>> 16) & 0xFF;
    saltPlusIndex[salt.length + 2] = (blockIndex >>> 8)  & 0xFF;
    saltPlusIndex[salt.length + 3] = blockIndex & 0xFF;

    let U = hmacSha256(password, saltPlusIndex);
    const T = new Uint8Array(U);

    // U_2 ... U_iterations
    for (let iter = 1; iter < iterations; iter++) {
      U = hmacSha256(password, U);
      for (let j = 0; j < hashLen; j++) {
        T[j] ^= U[j];
      }
    }

    dk.set(T, (blockIndex - 1) * hashLen);
  }

  return dk.slice(0, dkLen);
}


// ══════════════════════════════════════════════════════════════
// Unit 3: AES-256-CTR CSPRNG (Block Cipher Stream Generator)
// ══════════════════════════════════════════════════════════════

/**
 * AES S-Box: Precomputed substitution box for AES encryption.
 */
const _AES_SBOX = new Uint8Array([
  0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
  0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
  0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
  0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
  0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
  0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
  0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
  0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
  0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
  0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
  0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
  0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
  0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
  0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
  0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
  0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16
]);

/**
 * AES Rcon: Round constants for AES key expansion.
 */
const _AES_RCON = new Uint8Array([
  0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36
]);

/**
 * Galois Field multiplication by 2 in GF(2^8).
 * @param {number} x - Input byte.
 * @returns {number} Result byte.
 */
function _gfMul2(x) {
  return ((x << 1) ^ (((x >>> 7) & 1) * 0x1b)) & 0xFF;
}

/**
 * Expand a 256-bit AES key into 15 round keys (240 bytes).
 *
 * @param {Uint8Array} key - 32-byte AES-256 key.
 * @returns {Uint32Array} Expanded key schedule (60 words).
 */
function _aes256KeyExpansion(key) {
  const Nk = 8; // AES-256: 8 words in key
  const Nr = 14; // AES-256: 14 rounds
  const W = new Uint32Array(4 * (Nr + 1)); // 60 words

  // Copy original key into first 8 words
  for (let i = 0; i < Nk; i++) {
    W[i] = (key[4*i] << 24) | (key[4*i+1] << 16) | (key[4*i+2] << 8) | key[4*i+3];
  }

  for (let i = Nk; i < 4 * (Nr + 1); i++) {
    let temp = W[i - 1];
    if (i % Nk === 0) {
      // RotWord + SubWord + Rcon
      temp = ((_AES_SBOX[(temp >>> 16) & 0xFF] << 24) |
              (_AES_SBOX[(temp >>> 8) & 0xFF] << 16) |
              (_AES_SBOX[temp & 0xFF] << 8) |
              _AES_SBOX[(temp >>> 24) & 0xFF]) ^
             (_AES_RCON[(i / Nk) - 1] << 24);
    } else if (Nk > 6 && i % Nk === 4) {
      // SubWord only
      temp = (_AES_SBOX[(temp >>> 24) & 0xFF] << 24) |
             (_AES_SBOX[(temp >>> 16) & 0xFF] << 16) |
             (_AES_SBOX[(temp >>> 8) & 0xFF] << 8) |
             _AES_SBOX[temp & 0xFF];
    }
    W[i] = W[i - Nk] ^ temp;
  }

  return W;
}

/**
 * Encrypt a single 128-bit (16-byte) block with AES-256.
 *
 * @param {Uint8Array}  block - 16-byte plaintext block.
 * @param {Uint32Array} W     - Expanded key schedule from _aes256KeyExpansion.
 * @returns {Uint8Array} 16-byte ciphertext block.
 */
function _aes256EncryptBlock(block, W) {
  const Nr = 14;

  // Load state as column-major 4x4 matrix
  const state = new Uint8Array(16);
  for (let i = 0; i < 16; i++) state[i] = block[i];

  // AddRoundKey (round 0)
  for (let c = 0; c < 4; c++) {
    const w = W[c];
    state[4*c]     ^= (w >>> 24) & 0xFF;
    state[4*c + 1] ^= (w >>> 16) & 0xFF;
    state[4*c + 2] ^= (w >>> 8) & 0xFF;
    state[4*c + 3] ^= w & 0xFF;
  }

  for (let round = 1; round <= Nr; round++) {
    // SubBytes
    for (let i = 0; i < 16; i++) {
      state[i] = _AES_SBOX[state[i]];
    }

    // ShiftRows
    // Row 1: shift left by 1
    let t = state[1];
    state[1] = state[5]; state[5] = state[9]; state[9] = state[13]; state[13] = t;
    // Row 2: shift left by 2
    t = state[2]; state[2] = state[10]; state[10] = t;
    t = state[6]; state[6] = state[14]; state[14] = t;
    // Row 3: shift left by 3
    t = state[15];
    state[15] = state[11]; state[11] = state[7]; state[7] = state[3]; state[3] = t;

    // MixColumns (skip in final round)
    if (round < Nr) {
      for (let c = 0; c < 4; c++) {
        const s0 = state[4*c], s1 = state[4*c+1], s2 = state[4*c+2], s3 = state[4*c+3];
        state[4*c]     = _gfMul2(s0) ^ _gfMul2(s1) ^ s1 ^ s2 ^ s3;
        state[4*c + 1] = s0 ^ _gfMul2(s1) ^ _gfMul2(s2) ^ s2 ^ s3;
        state[4*c + 2] = s0 ^ s1 ^ _gfMul2(s2) ^ _gfMul2(s3) ^ s3;
        state[4*c + 3] = _gfMul2(s0) ^ s0 ^ s1 ^ s2 ^ _gfMul2(s3);
      }
    }

    // AddRoundKey
    for (let c = 0; c < 4; c++) {
      const w = W[round * 4 + c];
      state[4*c]     ^= (w >>> 24) & 0xFF;
      state[4*c + 1] ^= (w >>> 16) & 0xFF;
      state[4*c + 2] ^= (w >>> 8) & 0xFF;
      state[4*c + 3] ^= w & 0xFF;
    }
  }

  return state;
}

/**
 * Create an AES-256-CTR based CSPRNG seeded with a 256-bit key.
 *
 * Encrypts an incrementing 128-bit counter to produce a stream of
 * cryptographically random bytes. Each call to nextUint32() returns
 * 32 bits from the stream.
 *
 * @param {Uint8Array} key256 - 32-byte derived key from PBKDF2.
 * @returns {{ nextUint32: function(): number }} CSPRNG instance.
 */
function createAes256CtrCsprng(key256) {
  const expandedKey = _aes256KeyExpansion(key256);

  // 128-bit counter (16 bytes), starts at zero
  const counter = new Uint8Array(16);

  // Buffer to hold current block output
  let buffer = null;
  let bufferOffset = 16; // Start exhausted to trigger first block generation

  /**
   * Increment the 128-bit counter by 1 (big-endian).
   */
  function incrementCounter() {
    for (let i = 15; i >= 0; i--) {
      counter[i] = (counter[i] + 1) & 0xFF;
      if (counter[i] !== 0) break; // No carry
    }
  }

  return {
    /**
     * Return the next 32-bit unsigned integer from the CSPRNG stream.
     * @returns {number} A uniformly random uint32.
     */
    nextUint32: function() {
      if (bufferOffset >= 16) {
        // Encrypt current counter to produce new 16-byte block
        buffer = _aes256EncryptBlock(counter, expandedKey);
        incrementCounter();
        bufferOffset = 0;
      }

      // Read 4 bytes as big-endian uint32
      const val = ((buffer[bufferOffset] << 24) |
                   (buffer[bufferOffset + 1] << 16) |
                   (buffer[bufferOffset + 2] << 8) |
                   buffer[bufferOffset + 3]) >>> 0;
      bufferOffset += 4;
      return val;
    }
  };
}


// ══════════════════════════════════════════════════════════════
// Unit 4: Unbiased Rejection Sampling
// ══════════════════════════════════════════════════════════════

/**
 * Generate a uniformly random integer in [0, range) without modulo bias.
 *
 * Uses rejection sampling: discards any raw value that falls into the
 * biased "tail" of 2^32 % range, ensuring every output value has
 * exactly equal probability.
 *
 * Expected iterations: < 2 (practically instant).
 *
 * @param {number} range  - The exclusive upper bound (must be > 0).
 * @param {{ nextUint32: function(): number }} csprng - The CSPRNG instance.
 * @returns {number} A uniformly random integer in [0, range).
 */
function getUnbiasedRandomInt(range, csprng) {
  if (range <= 1) return 0;

  const limit = 0x100000000; // 2^32
  const threshold = limit - (limit % range); // Rejection threshold

  let raw;
  do {
    raw = csprng.nextUint32();
  } while (raw >= threshold);

  return raw % range;
}


// ══════════════════════════════════════════════════════════════
// Unit 5: O(K) Lazy Fisher-Yates Shuffle (Modern Engine)
// ══════════════════════════════════════════════════════════════

/**
 * Generate `count` unique random positions using the modern cryptographic engine.
 *
 * Uses PBKDF2-HMAC-SHA256 for key derivation, AES-256-CTR CSPRNG for
 * random number generation, rejection sampling for unbiased selection,
 * and a lazy Fisher-Yates shuffle that only tracks K swaps via Map
 * instead of allocating an O(N) array.
 *
 * @param {number} maxLength - The total number of available positions.
 * @param {number} count     - How many unique positions to select.
 * @param {string} stegoKey  - The stego-key used to derive the CSPRNG seed.
 * @returns {number[]} An array of `count` unique position indices.
 */
function generatePositions(maxLength, count, stegoKey, precomputedKey256) {
  if (typeof maxLength !== 'number' || maxLength <= 0) return [];
  if (typeof count !== 'number' || count <= 0) return [];
  if (!precomputedKey256 && (!stegoKey || typeof stegoKey !== 'string' || !stegoKey.trim())) {
    throw new Error("Stego-key is mandatory and cannot be empty.");
  }

  const k = Math.min(count, maxLength);
  const key256 = precomputedKey256 || deriveKeyPbkdf2(stegoKey);
  const csprng = createAes256CtrCsprng(key256);

  // Lazy swap map: only stores swapped indices (O(K) memory)
  const lazyMap = new Map();
  const positions = new Array(k);

  for (let i = 0; i < k; i++) {
    const remaining = maxLength - i;
    const offset = getUnbiasedRandomInt(remaining, csprng);
    const targetIndex = i + offset;

    const valI = lazyMap.has(i) ? lazyMap.get(i) : i;
    const valTarget = lazyMap.has(targetIndex) ? lazyMap.get(targetIndex) : targetIndex;

    lazyMap.set(i, valTarget);
    lazyMap.set(targetIndex, valI);

    positions[i] = valTarget;
  }

  return positions;
}


// ══════════════════════════════════════════════════════════════
// Unit 6: Legacy PRNG Fallback (DJB2 + Mulberry32)
// ══════════════════════════════════════════════════════════════

/**
 * Convert a stego-key string to a 32-bit unsigned integer seed.
 *
 * Uses the DJB2 hash algorithm (Dan Bernstein), which is a fast
 * non-cryptographic hash suitable for seeding a PRNG. The formula is:
 *   hash = hash * 33 + charCode   (for each character)
 *
 * @param {string} stegoKey - The stego-key string to hash.
 * @returns {number} A 32-bit unsigned integer seed.
 */
function stegoKeyToSeed(stegoKey) {
  let hash = 5381;
  for (let i = 0; i < stegoKey.length; i++) {
    hash = ((hash << 5) + hash + stegoKey.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

/**
 * Create a Mulberry32 pseudo-random number generator.
 *
 * Mulberry32 is a simple 32-bit PRNG with good statistical properties
 * and a period of 2^32. It produces values in [0, 1) — same range as
 * Math.random() but deterministic given the same seed.
 *
 * @param {number} seed - The 32-bit integer seed.
 * @returns {function(): number} A function that returns the next random number in [0, 1).
 */
function mulberry32(seed) {
  let state = seed | 0;
  return function nextRandom() {
    state = (state + 0x6D2B79F5) | 0;
    let intermediate = Math.imul(state ^ (state >>> 15), 1 | state);
    intermediate = (intermediate + Math.imul(intermediate ^ (intermediate >>> 7), 61 | intermediate)) ^ intermediate;
    return ((intermediate ^ (intermediate >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate `count` unique random positions using the LEGACY engine.
 *
 * This is the original DJB2 + Mulberry32 + Fisher-Yates algorithm.
 * Kept for backward compatibility — allows extraction of messages
 * hidden with previous versions of StegoLines.
 *
 * @param {number} maxLength - The total number of available positions.
 * @param {number} count     - How many unique positions to select.
 * @param {string} stegoKey  - The stego-key used to seed the PRNG.
 * @returns {number[]} An array of `count` unique position indices.
 */
function generatePositionsLegacy(maxLength, count, stegoKey) {
  const k = Math.min(count, maxLength);
  const seed = stegoKeyToSeed(stegoKey || '');
  const prng = mulberry32(seed);
  const swapMap = new Map();
  const positions = new Array(k);

  for (let i = 0; i < k; i++) {
    const remaining = maxLength - i;
    const offset = Math.floor(prng() * remaining);
    const j = i + offset;

    const valI = swapMap.has(i) ? swapMap.get(i) : i;
    const valJ = swapMap.has(j) ? swapMap.get(j) : j;

    swapMap.set(j, valI);
    positions[i] = valJ;
  }

  return positions;
}


// ══════════════════════════════════════════════════════════════
// Unit 7: Smart Stego-Key Resolver (Auto-Deriving)
// ══════════════════════════════════════════════════════════════

/**
 * Resolve the stego-key to use for PRNG seeding.
 *
 * If the user provides a key, it is trimmed and used directly.
 * If the key is empty, it is auto-derived from SHA-256(coverText)
 * to ensure deterministic reproducibility without user input.
 *
 * @param {string} stegoKey  - The user-supplied stego-key (may be empty).
 * @param {string} coverText - The cover text used for auto-derivation.
 * @returns {Promise<{ resolvedStegoKey: string, wasAutoGenerated: boolean }>}
 */
async function resolveStegoKey(stegoKey, coverText) {
  if (stegoKey && stegoKey.trim()) {
    return { resolvedStegoKey: stegoKey.trim(), wasAutoGenerated: false };
  }

  // Auto-derive from cover text hash
  if (coverText && typeof sha256 === 'function') {
    const hash = await sha256(coverText);
    return { resolvedStegoKey: hash, wasAutoGenerated: true };
  }

  throw new Error("Stego-key is empty and cannot be derived from empty cover text.");
}
