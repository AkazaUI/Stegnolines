// ══════════════════════════════════════════════════════════════
// Stage 3 — Hide | Stego Composer Orchestrator (Upgraded)
// ══════════════════════════════════════════════════════════════
//
// A pure calculation pipeline orchestrator linking Brotli, AES-CTR,
// PRNG, XOR, and VS Codecs. Agnostic of DOM elements.
//
// Upgrade: Dual-Engine architecture — new messages are hidden with
// the modern CSPRNG engine, while extraction automatically falls
// back to the legacy Mulberry32 engine for backward compatibility.
//
// Dependencies:
//   - js/core/crypto/aes-ctr.js
//   - js/core/crypto/sha256.js
//   - js/core/compression/brotli-service.js
//   - js/core/stego/payload-codec.js
//   - js/core/stego/prng-generator.js
//   - js/core/stego/xor-mask.js
//   - js/core/stego/vs-codec.js
//   - js/shared/text_codec.js
//
// ══════════════════════════════════════════════════════════════

/**
 * Main pure embedding pipeline. Orchestrates Steps 0 to 5.
 *
 * Uses the MODERN cryptographic engine (PBKDF2 + AES-256-CTR CSPRNG)
 * for all new embeddings.
 *
 * @param {string} coverText     - The original cover text.
 * @param {string} secretMessage - The secret message to hide.
 * @param {string} hint          - Optional hint (1 byte delimiter overhead if present).
 * @param {string} stegoKey      - Pre-shared stego key for seed generation.
 * @param {string} encryptionKey - Optional AES-CTR key. If empty, falls back to resolved stego key.
 * @param {string} fakeCoverText - Optional fake cover text (for split mode).
 * @returns {Promise<object>} Detailed metrics and output stego text structures.
 */
async function composeStego(coverText, secretMessage, hint, stegoKey, encryptionKey, fakeCoverText) {
  // 1. Resolve stego key
  const { resolvedStegoKey } = await resolveStegoKey(stegoKey, coverText);

  // 2. Step 1: Build payload bytes
  const payloadBytes = buildPayload(secretMessage, hint);

  // 3. Step 0: Compress payload via Brotli
  const startTimeBrotli = performance.now();
  const compressedBytes = doStreamCompress(payloadBytes);
  const brotliDurationMs = performance.now() - startTimeBrotli;

  let finalPayload;
  let compressed = false;
  if (compressedBytes.length < payloadBytes.length) {
    finalPayload = new Uint8Array(1 + compressedBytes.length);
    finalPayload[0] = 0xFE;
    finalPayload.set(compressedBytes, 1);
    compressed = true;
  } else {
    finalPayload = payloadBytes;
  }

  const payloadSize = finalPayload.length;
  const compressedSize = compressed ? compressedBytes.length : payloadBytes.length;

  // 4. Stage 2: AES-256-CTR Encryption
  const keyToUse = encryptionKey || resolvedStegoKey;
  finalPayload = await encryptPayloadCtr(finalPayload, keyToUse, coverText);

  // 5. Binary bits conversion
  const messageBits = bytesToBinary(finalPayload);
  const coverBits = stringToBinary(coverText);

  // 6. Capacity check
  if (messageBits.length > coverBits.length) {
    throw new Error(`Capacity exceeded: You need ${messageBits.length} bits but the cover contains only ${coverBits.length} bits.`);
  }

  // 7. Step 2: Generate positions (MODERN engine — PBKDF2 + AES-256-CTR CSPRNG)
  const basePositions = generatePositions(coverBits.length, messageBits.length, resolvedStegoKey);

  // 8. Step 3: XOR key generation
  const xorKey = generateXORKey(coverBits, basePositions, messageBits);

  // 9. Step 4: Convert XOR key to Variation Selector characters (with key-dependent S-Box permutation)
  const { vsStr, bytesArr } = xorKeyToVSString(xorKey, resolvedStegoKey);

  // 10. Step 5: Build output
  const hasFakeCover = fakeCoverText && fakeCoverText.trim().length > 0;
  let stegoText = "";
  let fakeCoverWithVS = "";

  if (hasFakeCover) {
    fakeCoverWithVS = vsStr + fakeCoverText;
    stegoText = buildStegoObject(coverText, vsStr); // for extract compatibility
  } else {
    stegoText = buildStegoObject(coverText, vsStr);
  }

  return {
    success: true,
    resolvedStegoKey,
    encryptionKey: keyToUse,
    payloadSize,
    compressed,
    compressedSize,
    messageBitsLength: messageBits.length,
    coverBitsLength: coverBits.length,
    basePositions,
    xorKey,
    bytesArr,
    stegoText,
    isSplitMode: hasFakeCover,
    fakeCoverText: hasFakeCover ? fakeCoverText : "",
    fakeCoverWithVS: hasFakeCover ? fakeCoverWithVS : "",
    brotliDurationMs
  };
}

/**
 * Main pure extraction pipeline with Dual-Engine Fallback & S-Box Inversion.
 *
 * Extraction Strategy:
 *   1. Modern Engine (PBKDF2 + AES-256-CTR CSPRNG) + Permuted VS S-Box
 *   2. Modern Engine + Standard Linear Identity VS
 *   3. Legacy Engine (DJB2 + Mulberry32) + Standard Linear Identity VS
 *   4. Legacy Engine + Permuted VS S-Box
 *
 * @param {string} stegoText     - The stego text (with invisible VS characters).
 * @param {string} rawStegoKey   - User-supplied pre-shared key.
 * @param {string} encryptionKey - Optional AES-CTR key. If empty, falls back to resolved stego key.
 * @returns {Promise<object>} Decrypted secret message and hint components.
 */
async function decomposeStego(stegoText, rawStegoKey, encryptionKey) {
  // 1. Step 5 (Reverse): Extract raw VS indices and clean cover text
  const { cleanText: coverText, rawVsIndices } = extractVSFromText(stegoText);

  if (!rawVsIndices || rawVsIndices.length === 0) {
    throw new Error('No hidden VS characters found in the message. Make sure to paste the complete final message.');
  }

  // 2. Resolve stego key
  const { resolvedStegoKey } = await resolveStegoKey(rawStegoKey, coverText);

  // 3. Convert cover text to binary
  const coverBits = stringToBinary(coverText);
  const decryptionKey = encryptionKey || resolvedStegoKey;

  /**
   * Internal: attempt full decompose with a given position-generation function
   * and VS inversion mode (permuted vs identity).
   *
   * @param {function} posFn - Either generatePositions (modern) or generatePositionsLegacy.
   * @param {boolean} useVsPermutation - Whether to apply key-dependent inverse S-Box.
   * @returns {Promise<object|null>} Extraction result, or null if it fails.
   */
  async function attemptDecompose(posFn, useVsPermutation) {
    try {
      const currentVsBytes = useVsPermutation && typeof invertVsBytes === 'function'
        ? invertVsBytes(rawVsIndices, resolvedStegoKey)
        : rawVsIndices;

      const xorKeyBinary = bytesToBinary(currentVsBytes);
      if (xorKeyBinary.length > coverBits.length) return null;

      // Regenerate PRNG positions
      const basePositions = posFn(coverBits.length, xorKeyBinary.length, resolvedStegoKey);

      // Recover payload bits via XOR reversal
      const recoveredBinary = recoverPayloadBits(coverBits, basePositions, xorKeyBinary);
      const recoveredPayload = binaryToBytes(recoveredBinary);

      // Decrypt payload
      let decryptedPayload;
      try {
        decryptedPayload = await decryptPayloadCtr(recoveredPayload, decryptionKey, coverText);
      } catch (e) {
        decryptedPayload = recoveredPayload;
      }

      // Brotli Decompression
      let payloadBytes;
      let brotliDurationMs = 0;
      let decompressed = false;
      if (decryptedPayload[0] === 0xFE && typeof doStreamDecompress === 'function') {
        try {
          const startTimeBrotli = performance.now();
          payloadBytes = doStreamDecompress(decryptedPayload.subarray(1));
          brotliDurationMs = performance.now() - startTimeBrotli;
          decompressed = true;
        } catch (e) {
          payloadBytes = decryptedPayload;
        }
      } else {
        payloadBytes = decryptedPayload;
      }

      // Parse payload
      const { secretMessage, hint } = parsePayload(payloadBytes);

      if (secretMessage && secretMessage.length > 0) {
        return {
          success: true,
          secretMessage,
          hint,
          coverText,
          vsBytes: currentVsBytes,
          brotliDurationMs,
          decompressed
        };
      }
    } catch (err) {
      // Silently fail — other engines / modes will be tested
    }
    return null;
  }

  // ── Multi-Tier Fallback Strategy ──

  // Attempt 1: Modern CSPRNG + Key-Dependent Permuted VS S-Box
  const resModernPermuted = await attemptDecompose(generatePositions, true);
  if (resModernPermuted) return resModernPermuted;

  // Attempt 2: Modern CSPRNG + Standard Linear Identity VS
  const resModernIdentity = await attemptDecompose(generatePositions, false);
  if (resModernIdentity) return resModernIdentity;

  // Attempt 3: Legacy Mulberry32 + Standard Linear Identity VS
  if (typeof generatePositionsLegacy === 'function') {
    const resLegacyIdentity = await attemptDecompose(generatePositionsLegacy, false);
    if (resLegacyIdentity) return resLegacyIdentity;

    // Attempt 4: Legacy Mulberry32 + Permuted VS S-Box
    const resLegacyPermuted = await attemptDecompose(generatePositionsLegacy, true);
    if (resLegacyPermuted) return resLegacyPermuted;
  }

  throw new Error('Decryption failed — make sure the Pre-Shared Key or Encryption Key is correct.');
}
