// ══════════════════════════════════════════════════════════════
// Stage 3 — Hide | Step 3: Stego-Key Generation
// ══════════════════════════════════════════════════════════════
//
// توليد مفتاح الإخفاء (Stego-Key) من كلمة المرور:
//   Password → SHA-256 (auto) → Seed → PRNG → Positions → XOR Key
//
// المكونات:
//   1. SHA-256 Hash  (للباسورد التلقائي من Cover)
//   2. Mulberry32 PRNG  (مولد أرقام شبه عشوائية)
//   3. Fisher-Yates Positions  (مواقع فريدة في Cover)
//   4. XOR Key Generation  (مقارنة بتات Cover مع Payload)
//
// ══════════════════════════════════════════════════════════════


// ── SHA-256 HASH ──────────────────────────────────────────────

/**
 * Compute SHA-256 hash of a string synchronously using SubtleCrypto.
 * Returns a Promise<string> (hex digest).
 */
async function sha256(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}


// ── SEEDED PRNG (Mulberry32) ──────────────────────────────────

function passwordToSeed(pw) {
  let h = 5381;
  for (let i = 0; i < pw.length; i++)
    h = ((h << 5) + h + pw.charCodeAt(i)) | 0;
  return h >>> 0;
}

function mulberry32(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}


// ── UNIQUE RANDOM POSITIONS (Partial Fisher-Yates) ────────────

/**
 * Generate `count` unique positions in [0, maxLen-1].
 * Seeded by password → deterministic.
 */
function generatePositions(maxLen, count, password) {
  const rng = mulberry32(passwordToSeed(password));
  const pool = Array.from({ length: maxLen }, (_, i) => i);
  const out = [];
  for (let i = 0; i < count && i < maxLen; i++) {
    const j = i + Math.floor(rng() * (maxLen - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
    out.push(pool[i]);
  }
  return out;
}


// ── XOR KEY GENERATION ────────────────────────────────────────

/**
 * Compare cover bit at each position with the desired message bit.
 * If they match → '0', if they differ → '1'.
 * Result: a binary string (only 0s and 1s) — easy to compress.
 */
function generateXORKey(coverBits, basePositions, msgBits) {
  let key = '';
  for (let i = 0; i < msgBits.length; i++) {
    const coverBit = coverBits[basePositions[i]];
    const msgBit   = msgBits[i];
    key += (coverBit === msgBit) ? '0' : '1';
  }
  return key;
}
