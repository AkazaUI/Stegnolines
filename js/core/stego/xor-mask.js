// ══════════════════════════════════════════════════════════════
// Stage 3 — Hide | Step 3: High-Performance XOR Key Engine
// ══════════════════════════════════════════════════════════════
//
// Performance Engineering Highlights:
//   1. Pre-allocated Array Buffers: Eliminates continuous dynamic array resizes.
//   2. Direct Character Code Checking: Reads charCode (48/49) directly without string allocations.
//   3. In-Place Bit Reversal: Zero memory overhead for XOR transformation.
//
// Embedding:   coverBits[pos[i]] ⊕ messageBits[i] → xorKey[i]
// Extraction:  coverBits[pos[i]] ⊕ xorKey[i]      → payloadBits[i]
//
// ══════════════════════════════════════════════════════════════

'use strict';

/**
 * Generate the XOR key by comparing cover bits at selected positions
 * with the desired message bits.
 *
 * @param {string}   coverBits     - Binary representation of the cover text.
 * @param {number[]} basePositions - Selected bit positions in the cover.
 * @param {string}   messageBits   - Binary representation of the payload.
 * @returns {string} The XOR key as a binary string.
 */
function generateXORKey(coverBits, basePositions, messageBits) {
  if (!messageBits) return '';
  const len = messageBits.length;
  const keyChars = new Array(len);

  for (let i = 0; i < len; i++) {
    const pos = basePositions[i];
    // Compare character codes directly ('0'=48, '1'=49)
    keyChars[i] = coverBits.charCodeAt(pos) === messageBits.charCodeAt(i) ? '0' : '1';
  }

  return keyChars.join('');
}

/**
 * Recover the original payload bits by XOR-reversing cover bits with the key.
 *
 * @param {string}   coverBits     - Binary representation of the cover text.
 * @param {number[]} basePositions - Selected bit positions in the cover.
 * @param {string}   xorKeyBinary  - The XOR key as a binary string.
 * @returns {string} The recovered payload as a binary string.
 */
function recoverPayloadBits(coverBits, basePositions, xorKeyBinary) {
  if (!xorKeyBinary) return '';
  const len = xorKeyBinary.length;
  const payloadChars = new Array(len);

  for (let i = 0; i < len; i++) {
    const pos = basePositions[i];
    payloadChars[i] = coverBits.charCodeAt(pos) === xorKeyBinary.charCodeAt(i) ? '0' : '1';
  }

  return payloadChars.join('');
}
