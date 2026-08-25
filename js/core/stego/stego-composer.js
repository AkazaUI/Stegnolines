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

  // 9. Step 4: Convert XOR key to Variation Selector characters
  const { vsStr, bytesArr } = xorKeyToVSString(xorKey);

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
 * Main pure extraction pipeline with Dual-Engine Fallback.
 *
 * Attempts extraction using the MODERN engine first (PBKDF2 + AES-256-CTR).
 * If that fails, automatically falls back to the LEGACY engine (DJB2 + Mulberry32)
 * to support messages hidden by older versions.
 *
 * @param {string} stegoText     - The stego text (with invisible VS characters).
 * @param {string} rawStegoKey   - User-supplied pre-shared key.
 * @param {string} encryptionKey - Optional AES-CTR key. If empty, falls back to resolved stego key.
 * @returns {Promise<object>} Decrypted secret message and hint components.
 */
async function decomposeStego(stegoText, rawStegoKey, encryptionKey) {
  // 1. Step 5 (Reverse): Extract VS bytes and clean text
  const { vsBytes, cleanText: coverText } = extractVSFromText(stegoText);

  if (vsBytes.length === 0) {
    throw new Error('No hidden VS characters found in the message. Make sure to paste the complete final message.');
  }

  // 2. Step 4 (Reverse): Convert VS bytes to binary bits
  const xorKeyBinary = bytesToBinary(vsBytes);

  // 3. Resolve stego key
  const { resolvedStegoKey } = await resolveStegoKey(rawStegoKey, coverText);

  // 4. Convert cover text to binary
  const coverBits = stringToBinary(coverText);

  if (xorKeyBinary.length > coverBits.length) {
    throw new Error(`The key contains ${xorKeyBinary.length} bits but the cover contains only ${coverBits.length} bits.`);
  }

  const decryptionKey = encryptionKey || resolvedStegoKey;

  /**
   * Internal: attempt full decompose with a given position-generation function.
   *
   * @param {function} posFn - Either generatePositions (modern) or generatePositionsLegacy.
   * @returns {Promise<object|null>} Extraction result, or null if it fails.
   */
  async function attemptDecompose(posFn) {
    try {
      // 5. Step 2 (Reverse): Regenerate PRNG positions
      const basePositions = posFn(coverBits.length, xorKeyBinary.length, resolvedStegoKey);

      // 6. Step 3 (Reverse): Recover payload bits via XOR reversal
      const recoveredBinary = recoverPayloadBits(coverBits, basePositions, xorKeyBinary);
      const recoveredPayload = binaryToBytes(recoveredBinary);

      // 7. Stage 2 (Reverse): Decrypt payload
      let decryptedPayload;
      try {
        decryptedPayload = await decryptPayloadCtr(recoveredPayload, decryptionKey, coverText);
      } catch (e) {
        // If decryption fails, try using raw payload (might be unencrypted)
        decryptedPayload = recoveredPayload;
      }

      // 8. Step 0 (Reverse): Brotli Decompression
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

      // 9. Step 1 (Reverse): Parse payload
      const { secretMessage, hint } = parsePayload(payloadBytes);

      if (secretMessage && secretMessage.length > 0) {
        return {
          success: true,
          secretMessage,
          hint,
          coverText,
          vsBytes,
          brotliDurationMs,
          decompressed
        };
      }
    } catch (err) {
      // Silently fail — the other engine will be tried
    }
    return null;
  }

  // ── Dual-Engine Extraction Strategy ──

  // Attempt 1: Modern cryptographic engine (AES-CTR CSPRNG)
  const modernResult = await attemptDecompose(generatePositions);
  if (modernResult) return modernResult;

  // Attempt 2: Legacy fallback engine (DJB2 + Mulberry32)
  if (typeof generatePositionsLegacy === 'function') {
    const legacyResult = await attemptDecompose(generatePositionsLegacy);
    if (legacyResult) return legacyResult;
  }

  throw new Error('Decryption failed — make sure the Pre-Shared Key or Encryption Key is correct.');
}
