// ══════════════════════════════════════════════════════════════
// Stage 3 — Hide | Step 3: XOR Key Engine (Refactored)
// ══════════════════════════════════════════════════════════════
//
// Generates and recovers the XOR key by comparing cover bits
// at PRNG-selected positions with payload bits.
//
// Embedding:   coverBits[pos[i]] ⊕ messageBits[i] → xorKey[i]
// Extraction:  coverBits[pos[i]] ⊕ xorKey[i]      → payloadBits[i]
//
// The XOR operation is its own inverse: (a ⊕ b) ⊕ b = a
//
// Dependencies: None
//
// ══════════════════════════════════════════════════════════════

/**
 * Generate the XOR key by comparing cover bits at selected positions
 * with the desired message bits.
 *
 * For each bit position:
 *   - If coverBit === messageBit → key bit is '0' (no change needed)
 *   - If coverBit !== messageBit → key bit is '1' (flip needed)
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
