// ══════════════════════════════════════════════════════════════
// Stage 3 — Hide | Step 3: Stego-Key Generation
// ══════════════════════════════════════════════════════════════
//
// Generates the steganographic key from a password:
//   Password → DJB2 Hash → Seed → Mulberry32 PRNG → Positions → XOR Key
//
// Components:
//   1. SHA-256 Hash       — For auto-generated passwords from cover text
//   2. DJB2 Hash          — Fast password-to-seed conversion
//   3. Mulberry32 PRNG    — Deterministic pseudo-random number generator
//   4. Fisher-Yates Shuffle — Generates unique random positions in cover
//   5. XOR Key Generation — Compares cover bits with payload bits
//
// ══════════════════════════════════════════════════════════════


// ── SHA-256 HASH ──────────────────────────────────────────────

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
  const data = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashBytes = Array.from(new Uint8Array(hashBuffer));
  return hashBytes.map(byte => byte.toString(16).padStart(2, '0')).join('');
}


// ── SEEDED PRNG (Mulberry32) ──────────────────────────────────

/**
 * Convert a password string to a 32-bit unsigned integer seed.
 *
 * Uses the DJB2 hash algorithm (Dan Bernstein), which is a fast
 * non-cryptographic hash suitable for seeding a PRNG. The formula is:
 *   hash = hash * 33 + charCode   (for each character)
 *
 * @param {string} password - The password string to hash.
 * @returns {number} A 32-bit unsigned integer seed.
 */
function passwordToSeed(password) {
  let hash = 5381;
  for (let i = 0; i < password.length; i++) {
    hash = ((hash << 5) + hash + password.charCodeAt(i)) | 0;
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


// ── UNIQUE RANDOM POSITIONS (Partial Fisher-Yates) ────────────

/**
 * Generate `count` unique random positions in the range [0, maxLength - 1].
 *
 * Uses a partial Fisher-Yates shuffle: instead of shuffling the entire
 * array, we only shuffle the first `count` elements, making it O(count)
 * rather than O(maxLength). The PRNG is seeded by the password, so the
 * same password always produces the same positions — this is what allows
 * the receiver to reconstruct the same mapping during extraction.
 *
 * @param {number} maxLength - The total number of available positions (cover bit length).
 * @param {number} count     - How many unique positions to select.
 * @param {string} password  - The password used to seed the PRNG.
 * @returns {number[]} An array of `count` unique position indices.
 */
function generatePositions(maxLength, count, password) {
  const rng = mulberry32(passwordToSeed(password));
  const pool = Array.from({ length: maxLength }, (_, index) => index);
  const positions = [];

  for (let i = 0; i < count && i < maxLength; i++) {
    const swapIndex = i + Math.floor(rng() * (maxLength - i));
    [pool[i], pool[swapIndex]] = [pool[swapIndex], pool[i]];
    positions.push(pool[i]);
  }

  return positions;
}


// ── XOR KEY GENERATION ────────────────────────────────────────

/**
 * Generate the XOR key by comparing cover bits at selected positions
 * with the desired message bits.
 *
 * For each bit position:
 *   - If coverBit === messageBit → key bit is '0' (no change needed)
 *   - If coverBit !== messageBit → key bit is '1' (flip needed)
 *
 * The resulting key is a binary string of 0s and 1s. Because cover text
 * has natural randomness, roughly 50% of bits will match, making the
 * key highly compressible.
 *
 * @param {string}   coverBits     - Binary representation of the cover text.
 * @param {number[]} basePositions - Selected bit positions in the cover.
 * @param {string}   messageBits   - Binary representation of the payload.
 * @returns {string} The XOR key as a binary string.
 */
function generateXORKey(coverBits, basePositions, messageBits) {
  const keyBits = [];
  for (let i = 0; i < messageBits.length; i++) {
    keyBits.push(coverBits[basePositions[i]] === messageBits[i] ? '0' : '1');
  }
  return keyBits.join('');
}


/**
 * Recover the original payload bits by XOR-reversing cover bits with the key.
 *
 * This is the inverse of generateXORKey — used during extraction.
 * For each bit:
 *   - If coverBit === keyBit → recovered payload bit is '0'
 *   - If coverBit !== keyBit → recovered payload bit is '1'
 *
 * This works because XOR is its own inverse: (a XOR b) XOR b = a.
 *
 * @param {string}   coverBits     - Binary representation of the cover text.
 * @param {number[]} basePositions - Selected bit positions in the cover.
 * @param {string}   xorKeyBinary  - The XOR key as a binary string.
 * @returns {string} The recovered payload as a binary string.
 */
function recoverPayloadBits(coverBits, basePositions, xorKeyBinary) {
  const payloadBits = [];
  for (let i = 0; i < xorKeyBinary.length; i++) {
    payloadBits.push(coverBits[basePositions[i]] === xorKeyBinary[i] ? '0' : '1');
  }
  return payloadBits.join('');
}
