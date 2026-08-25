// ══════════════════════════════════════════════════════════════
// Stage 3 — Hide | Step 2: Modern CSPRNG Position Generator
// ══════════════════════════════════════════════════════════════
//
// Architectural Flow:
//   StegoKey + DomainSalt → PBKDF2-HMAC-SHA256 (100,000 Iterations)
//                         → 256-bit Key
//                         → AES-256-CTR CSPRNG
//                         → Unbiased Rejection Sampling
//                         → O(K) Lazy Swap Shuffle via Map
//                         → Output Unique Positions
//
// Clean Code & Defensive Performance Highlights:
//   1. PBKDF2 Key Stretching: In-place bitwise optimization with O(1) memoization cache.
//   2. AES-256-CTR CSPRNG: Guarantees next-bit unpredictability and state security.
//   3. Unbiased Rejection Sampling: Completely eliminates Modulo Bias with 0-freeze threshold safety.
//   4. O(K) Lazy Swap: Zero full-array allocation; memory and time scale with message size K only.
//   5. Defensive Boundary Guards: Prevents integer wrap bugs or endless loops on powers of 2.
//
// ══════════════════════════════════════════════════════════════

'use strict';

const STEGO_DOMAIN_SALT_BYTES = new Uint8Array([
  0x53, 0x74, 0x65, 0x67, 0x6F, 0x4C, 0x69, 0x6E,
  0x65, 0x3A, 0x3A, 0x43, 0x53, 0x50, 0x52, 0x4E,
  0x47, 0x3A, 0x3A, 0x76, 0x32, 0x3A, 0x3A, 0x53,
  0x61, 0x6C, 0x74, 0x32, 0x30, 0x32, 0x36, 0x21
]);

const PBKDF2_ITERATION_COUNT = 100000;
const _derivedKeyCache = new Map();

// ── MODULE 1: SHA-256 & HMAC-SHA256 Core Engine ──

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);

function sha256Bytes(messageBytes) {
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const msgLen = messageBytes.length;
  const bitLenHi = Math.floor(msgLen / 0x20000000);
  const bitLenLo = (msgLen * 8) >>> 0;

  const paddedLen = (((msgLen + 8) >> 6) + 1) << 6;
  const padded = new Uint8Array(paddedLen);
  padded.set(messageBytes);
  padded[msgLen] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, bitLenHi, false);
  view.setUint32(paddedLen - 4, bitLenLo, false);

  const w = new Uint32Array(64);

  for (let chunk = 0; chunk < paddedLen; chunk += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(chunk + (i << 2), false);
    }

    for (let i = 16; i < 64; i++) {
      const s0 = ((w[i - 15] >>> 7) | (w[i - 15] << 25)) ^ ((w[i - 15] >>> 18) | (w[i - 15] << 14)) ^ (w[i - 15] >>> 3);
      const s1 = ((w[i - 2] >>> 17) | (w[i - 2] << 15)) ^ ((w[i - 2] >>> 19) | (w[i - 2] << 13)) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

    for (let i = 0; i < 64; i++) {
      const s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ ((~e) & g);
      const temp1 = (h + s1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;

      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0, false);
  outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false);
  outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false);
  outView.setUint32(20, h5, false);
  outView.setUint32(24, h6, false);
  outView.setUint32(28, h7, false);
  return out;
}

function hmacSha256(keyBytes, messageBytes) {
  let key = keyBytes;
  if (key.length > 64) {
    key = sha256Bytes(key);
  }

  const kPad = new Uint8Array(64);
  kPad.set(key);

  const innerMsg = new Uint8Array(64 + messageBytes.length);
  const outerMsg = new Uint8Array(64 + 32);

  for (let i = 0; i < 64; i++) {
    innerMsg[i] = kPad[i] ^ 0x36;
    outerMsg[i] = kPad[i] ^ 0x5C;
  }

  innerMsg.set(messageBytes, 64);
  const innerHash = sha256Bytes(innerMsg);

  outerMsg.set(innerHash, 64);
  return sha256Bytes(outerMsg);
}

function deriveKeyPbkdf2(stegoKey, saltBytes = STEGO_DOMAIN_SALT_BYTES, iterations = PBKDF2_ITERATION_COUNT) {
  const cacheKey = stegoKey;
  if (_derivedKeyCache.has(cacheKey)) {
    return _derivedKeyCache.get(cacheKey);
  }

  const encoder = typeof SHARED_TEXT_ENCODER !== 'undefined' ? SHARED_TEXT_ENCODER : (typeof TextEncoder !== 'undefined' ? new TextEncoder() : { encode: s => Uint8Array.from(unescape(encodeURIComponent(s)), c => c.charCodeAt(0)) });
  const passwordBytes = encoder.encode(stegoKey);

  let key = passwordBytes;
  if (key.length > 64) {
    key = sha256Bytes(key);
  }
  const kPad = new Uint8Array(64);
  kPad.set(key);

  const iPad = new Uint8Array(64);
  const oPad = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    iPad[i] = kPad[i] ^ 0x36;
    oPad[i] = kPad[i] ^ 0x5C;
  }

  const innerBuf = new Uint8Array(64 + 32);
  innerBuf.set(iPad, 0);

  const outerBuf = new Uint8Array(64 + 32);
  outerBuf.set(oPad, 0);

  const saltBlock = new Uint8Array(saltBytes.length + 4);
  saltBlock.set(saltBytes, 0);
  saltBlock[saltBytes.length + 3] = 0x01;

  let u = hmacSha256(passwordBytes, saltBlock);
  const result = new Uint8Array(u);

  for (let i = 1; i < iterations; i++) {
    innerBuf.set(u, 64);
    const innerDigest = sha256Bytes(innerBuf);
    outerBuf.set(innerDigest, 64);
    u = sha256Bytes(outerBuf);

    for (let j = 0; j < 32; j++) {
      result[j] ^= u[j];
    }
  }

  _derivedKeyCache.set(cacheKey, result);
  return result;
}

// ── MODULE 2: AES-256 Core Cipher & CTR Mode Stream ──

const AES_SBOX = new Uint8Array([
  0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
  0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
  0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
  0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
  0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
  0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
  0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
  0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
  0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
  0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
  0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
  0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
  0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
  0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
  0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
  0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16
]);

const AES_RCON = new Uint32Array([
  0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36
]);

function aes256ExpandKey(keyBytes) {
  const w = new Uint32Array(60);
  const view = new DataView(keyBytes.buffer, keyBytes.byteOffset, keyBytes.byteLength);

  for (let i = 0; i < 8; i++) {
    w[i] = view.getUint32(i << 2, false);
  }

  for (let i = 8; i < 60; i++) {
    let temp = w[i - 1];
    if (i % 8 === 0) {
      temp = ((AES_SBOX[(temp >>> 16) & 0xFF] << 24) |
              (AES_SBOX[(temp >>> 8) & 0xFF] << 16) |
              (AES_SBOX[temp & 0xFF] << 8) |
              (AES_SBOX[(temp >>> 24) & 0xFF])) ^ (AES_RCON[i >> 3] << 24);
    } else if (i % 8 === 4) {
      temp = (AES_SBOX[(temp >>> 24) & 0xFF] << 24) |
             (AES_SBOX[(temp >>> 16) & 0xFF] << 16) |
             (AES_SBOX[(temp >>> 8) & 0xFF] << 8) |
             (AES_SBOX[temp & 0xFF]);
    }
    w[i] = (w[i - 8] ^ temp) >>> 0;
  }
  return w;
}

function xtime(b) {
  return ((b << 1) ^ (((b >>> 7) & 1) * 0x11b)) & 0xFF;
}

function aes256EncryptBlock(expandedKey, inBlock, outBlock) {
  const s = new Uint8Array(16);
  s.set(inBlock);

  for (let i = 0; i < 4; i++) {
    const k = expandedKey[i];
    s[i << 2]     ^= (k >>> 24) & 0xFF;
    s[(i << 2) + 1] ^= (k >>> 16) & 0xFF;
    s[(i << 2) + 2] ^= (k >>> 8)  & 0xFF;
    s[(i << 2) + 3] ^= k & 0xFF;
  }

  for (let round = 1; round <= 13; round++) {
    const t0 = AES_SBOX[s[0]],  t1 = AES_SBOX[s[5]],  t2 = AES_SBOX[s[10]], t3 = AES_SBOX[s[15]];
    const t4 = AES_SBOX[s[4]],  t5 = AES_SBOX[s[9]],  t6 = AES_SBOX[s[14]], t7 = AES_SBOX[s[3]];
    const t8 = AES_SBOX[s[8]],  t9 = AES_SBOX[s[13]], t10 = AES_SBOX[s[2]], t11 = AES_SBOX[s[7]];
    const t12 = AES_SBOX[s[12]], t13 = AES_SBOX[s[1]], t14 = AES_SBOX[s[6]], t15 = AES_SBOX[s[11]];

    const kBase = round * 4;
    const k0 = expandedKey[kBase], k1 = expandedKey[kBase + 1], k2 = expandedKey[kBase + 2], k3 = expandedKey[kBase + 3];

    s[0] = (xtime(t0 ^ t1) ^ t1 ^ t2 ^ t3 ^ (k0 >>> 24)) & 0xFF;
    s[1] = (xtime(t1 ^ t2) ^ t2 ^ t3 ^ t0 ^ (k0 >>> 16)) & 0xFF;
    s[2] = (xtime(t2 ^ t3) ^ t3 ^ t0 ^ t1 ^ (k0 >>> 8))  & 0xFF;
    s[3] = (xtime(t3 ^ t0) ^ t0 ^ t1 ^ t2 ^ k0)          & 0xFF;

    s[4] = (xtime(t4 ^ t5) ^ t5 ^ t6 ^ t7 ^ (k1 >>> 24)) & 0xFF;
    s[5] = (xtime(t5 ^ t6) ^ t6 ^ t7 ^ t4 ^ (k1 >>> 16)) & 0xFF;
    s[6] = (xtime(t6 ^ t7) ^ t7 ^ t4 ^ t5 ^ (k1 >>> 8))  & 0xFF;
    s[7] = (xtime(t7 ^ t4) ^ t4 ^ t5 ^ t6 ^ k1)          & 0xFF;

    s[8]  = (xtime(t8 ^ t9) ^ t9 ^ t10 ^ t11 ^ (k2 >>> 24)) & 0xFF;
    s[9]  = (xtime(t9 ^ t10) ^ t10 ^ t11 ^ t8 ^ (k2 >>> 16)) & 0xFF;
    s[10] = (xtime(t10 ^ t11) ^ t11 ^ t8 ^ t9 ^ (k2 >>> 8))  & 0xFF;
    s[11] = (xtime(t11 ^ t8) ^ t8 ^ t9 ^ t10 ^ k2)          & 0xFF;

    s[12] = (xtime(t12 ^ t13) ^ t13 ^ t14 ^ t15 ^ (k3 >>> 24)) & 0xFF;
    s[13] = (xtime(t13 ^ t14) ^ t14 ^ t15 ^ t12 ^ (k3 >>> 16)) & 0xFF;
    s[14] = (xtime(t14 ^ t15) ^ t15 ^ t12 ^ t13 ^ (k3 >>> 8))  & 0xFF;
    s[15] = (xtime(t15 ^ t12) ^ t12 ^ t13 ^ t14 ^ k3)          & 0xFF;
  }

  const kBase = 56;
  const k0 = expandedKey[kBase], k1 = expandedKey[kBase + 1], k2 = expandedKey[kBase + 2], k3 = expandedKey[kBase + 3];

  outBlock[0]  = AES_SBOX[s[0]]  ^ ((k0 >>> 24) & 0xFF);
  outBlock[1]  = AES_SBOX[s[5]]  ^ ((k0 >>> 16) & 0xFF);
  outBlock[2]  = AES_SBOX[s[10]] ^ ((k0 >>> 8) & 0xFF);
  outBlock[3]  = AES_SBOX[s[15]] ^ (k0 & 0xFF);

  outBlock[4]  = AES_SBOX[s[4]]  ^ ((k1 >>> 24) & 0xFF);
  outBlock[5]  = AES_SBOX[s[9]]  ^ ((k1 >>> 16) & 0xFF);
  outBlock[6]  = AES_SBOX[s[14]] ^ ((k1 >>> 8) & 0xFF);
  outBlock[7]  = AES_SBOX[s[3]]  ^ (k1 & 0xFF);

  outBlock[8]  = AES_SBOX[s[8]]  ^ ((k2 >>> 24) & 0xFF);
  outBlock[9]  = AES_SBOX[s[13]] ^ ((k2 >>> 16) & 0xFF);
  outBlock[10] = AES_SBOX[s[2]]  ^ ((k2 >>> 8) & 0xFF);
  outBlock[11] = AES_SBOX[s[7]]  ^ (k2 & 0xFF);

  outBlock[12] = AES_SBOX[s[12]] ^ ((k3 >>> 24) & 0xFF);
  outBlock[13] = AES_SBOX[s[1]]  ^ ((k3 >>> 16) & 0xFF);
  outBlock[14] = AES_SBOX[s[6]]  ^ ((k3 >>> 8) & 0xFF);
  outBlock[15] = AES_SBOX[s[11]] ^ (k3 & 0xFF);
}

function createAes256CtrCsprng(key256Bytes) {
  const expandedKey = aes256ExpandKey(key256Bytes);
  const counterBlock = new Uint8Array(16);
  const keystreamBlock = new Uint8Array(16);
  const keystreamView = new DataView(keystreamBlock.buffer);

  let byteOffset = 16;

  function incrementCounter() {
    for (let i = 15; i >= 0; i--) {
      counterBlock[i] = (counterBlock[i] + 1) & 0xFF;
      if (counterBlock[i] !== 0) break;
    }
  }

  return {
    nextUint32() {
      if (byteOffset >= 16) {
        aes256EncryptBlock(expandedKey, counterBlock, keystreamBlock);
        incrementCounter();
        byteOffset = 0;
      }
      const val = keystreamView.getUint32(byteOffset, false);
      byteOffset += 4;
      return val;
    }
  };
}

// ── MODULE 3: Unbiased Rejection Sampling Engine ──

function getUnbiasedRandomInt(range, csprng) {
  if (range <= 1) return 0;

  const LIMIT_32 = 4294967296;
  if (range >= LIMIT_32) return csprng.nextUint32();

  const remainder = LIMIT_32 % range;
  const validThreshold = LIMIT_32 - remainder;

  let raw;
  let safetyCounter = 0;
  do {
    raw = csprng.nextUint32();
    if (++safetyCounter > 1000) break;
  } while (raw >= validThreshold);

  return raw % range;
}

// ── MODULE 4: O(K) Lazy Swap Shuffle Engine ──

function generatePositions(maxLength, count, stegoKey) {
  if (typeof maxLength !== 'number' || maxLength <= 0) return [];
  if (typeof count !== 'number' || count <= 0) return [];
  if (!stegoKey || typeof stegoKey !== 'string' || !stegoKey.trim()) {
    throw new Error("Stego-key is mandatory and cannot be empty.");
  }

  const k = Math.min(count, maxLength);
  const key256 = deriveKeyPbkdf2(stegoKey);
  const csprng = createAes256CtrCsprng(key256);

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

function djb2Hash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & 0xFFFFFFFF;
  }
  return hash >>> 0;
}

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generatePositionsLegacy(maxLength, count, stegoKey) {
  if (typeof maxLength !== 'number' || maxLength <= 0) return [];
  if (typeof count !== 'number' || count <= 0) return [];
  const k = Math.min(count, maxLength);
  const seed = djb2Hash(stegoKey || '');
  const prng = mulberry32(seed);
  const positions = [];
  const pool = Array.from({ length: maxLength }, (_, i) => i);
  for (let i = 0; i < k; i++) {
    const idx = Math.floor(prng() * pool.length);
    positions.push(pool.splice(idx, 1)[0]);
  }
  return positions;
}

async function resolveStegoKey(stegoKey, coverText) {
  if (stegoKey && stegoKey.trim()) {
    return { resolvedStegoKey: stegoKey.trim(), wasAutoGenerated: false };
  }
  if (coverText && typeof sha256 === 'function') {
    const hash = await sha256(coverText);
    return { resolvedStegoKey: hash, wasAutoGenerated: true };
  }
  throw new Error("Stego-key is empty and cannot be derived from empty cover text.");
}
