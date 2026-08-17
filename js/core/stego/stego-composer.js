// ══════════════════════════════════════════════════════════════
// Stage 3 — Hide | Stego Composer Orchestrator (Refactored)
// ══════════════════════════════════════════════════════════════
//
// A pure calculation pipeline orchestrator linking Brotli, AES-CTR,
// PRNG, XOR, and VS Codecs. Agnostic of DOM elements.
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

  // 3. Step 0: Compress payload via Brotli (with safe fallback)
  const startTimeBrotli = performance.now();
  let compressedBytes = payloadBytes;
  let brotliDurationMs = 0;
  let compressed = false;
  try {
    if (typeof doStreamCompress === 'function') {
      const result = doStreamCompress(payloadBytes);
      brotliDurationMs = performance.now() - startTimeBrotli;
      if (result && result.length > 0 && result.length < payloadBytes.length) {
        compressedBytes = result;
        compressed = true;
      }
    }
  } catch (err) {
    console.warn("Brotli compression fallback:", err);
    compressed = false;
  }

  let finalPayload;
  if (compressed) {
    finalPayload = new Uint8Array(1 + compressedBytes.length);
    finalPayload[0] = 0xFE;
    finalPayload.set(compressedBytes, 1);
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

  // 7. Step 2: Generate positions
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
 * Main pure extraction pipeline. Reverses composeStego.
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

  // 5. Step 2 (Reverse): Regenerate PRNG positions
  const basePositions = generatePositions(coverBits.length, xorKeyBinary.length, resolvedStegoKey);

  // 6. Step 3 (Reverse): Recover payload bits via XOR reversal
  const recoveredBinary = recoverPayloadBits(coverBits, basePositions, xorKeyBinary);
  const recoveredPayload = binaryToBytes(recoveredBinary);

  // 7. Stage 2 (Reverse): Decrypt payload
  const decryptionKey = encryptionKey || resolvedStegoKey;
  let decryptedPayload;
  try {
    decryptedPayload = await decryptPayloadCtr(recoveredPayload, decryptionKey, coverText);
  } catch (e) {
    throw new Error('Decryption failed — make sure the Pre-Shared Key or Encryption Key is correct.');
  }

  // 8. Step 0 (Reverse): Brotli Decompression
  let payloadBytes;
  let brotliDurationMs = 0;
  let decompressed = false;
  if (decryptedPayload[0] === 0xFE) {
    const startTimeBrotli = performance.now();
    payloadBytes = doStreamDecompress(decryptedPayload.subarray(1));
    brotliDurationMs = performance.now() - startTimeBrotli;
    decompressed = true;
  } else {
    payloadBytes = decryptedPayload;
  }

  // 9. Step 1 (Reverse): Parse payload
  const { secretMessage, hint } = parsePayload(payloadBytes);

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
