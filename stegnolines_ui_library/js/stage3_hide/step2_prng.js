// ══════════════════════════════════════════════════════════════
// Stage 3 — Hide | Step 2: PRNG Position Generator
// ══════════════════════════════════════════════════════════════
//
// Generates deterministic pseudo-random positions from a password:
//   Password → DJB2 Hash → Seed → Mulberry32 PRNG → Fisher-Yates → Positions
//
// The same password always produces the same positions, allowing
// the receiver to reconstruct the identical mapping during extraction.
//
// Components:
//   1. SHA-256 Hash       — For auto-generated passwords from cover text
//   2. DJB2 Hash          — Fast password-to-seed conversion
//   3. Mulberry32 PRNG    — Deterministic pseudo-random number generator
//   4. Fisher-Yates Shuffle — Generates unique random positions in cover
//
// Dependencies: shared/text_codec (SHARED_TEXT_ENCODER)
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
  const data = SHARED_TEXT_ENCODER.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashBytes = Array.from(new Uint8Array(hashBuffer));
  return hashBytes.map(byte => byte.toString(16).padStart(2, '0')).join('');
}


// ── SEEDED PRNG (Mulberry32) ──────────────────────────────────

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


// ── UNIQUE RANDOM POSITIONS (Partial Fisher-Yates) ────────────

/**
 * Generate `count` unique random positions in the range [0, maxLength - 1].
 *
 * Uses a partial Fisher-Yates shuffle: instead of shuffling the entire
 * array, we only shuffle the first `count` elements, making it O(count)
 * rather than O(maxLength). The PRNG is seeded by the stego-key, so the
 * same stego-key always produces the same positions — this is what allows
 * the receiver to reconstruct the same mapping during extraction.
 *
 * @param {number} maxLength - The total number of available positions (cover bit length).
 * @param {number} count     - How many unique positions to select.
 * @param {string} stegoKey  - The stego-key used to seed the PRNG.
 * @returns {number[]} An array of `count` unique position indices.
 */
function generatePositions(maxLength, count, stegoKey) {
  const rng = mulberry32(stegoKeyToSeed(stegoKey));
  const pool = Array.from({ length: maxLength }, (_, index) => index);
  const positions = [];

  for (let i = 0; i < count && i < maxLength; i++) {
    const swapIndex = i + Math.floor(rng() * (maxLength - i));
    [pool[i], pool[swapIndex]] = [pool[swapIndex], pool[i]];
    positions.push(pool[i]);
  }

  return positions;
}
