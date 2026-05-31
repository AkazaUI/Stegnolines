// ══════════════════════════════════════════════════════════════
// Stage 3 — Hide | Embedding Orchestrator
// ══════════════════════════════════════════════════════════════
//
// Orchestrates the full embedding pipeline by executing Steps 0–5
// in sequence, then updating the UI with results and feature widgets:
//
//   1. Read user inputs (cover-text, secret message, hint, stego-key)
//   2. Build Stego-Payload (Step 1: message + optional hint → bytes)
//   3. Compress payload via Brotli Stream (Step 0: raw bytes → compressed bytes)
//   4. Convert Cover-text → Binary (shared/text_codec)
//   5. Validate embedding capacity (payload bits ≤ cover bits)
//   6. Generate PRNG positions (Step 2: stego-key → positions)
//   7. Generate XOR key (Step 3: cover bits ⊕ payload bits)
//   8. Encode via VS Codec (Step 4: XOR key → VS characters)
//   9. Build Stego-Object (Step 5: VS key + cover-text)
//  10. Update feature widgets (visualization, meters, hint log)
//
// Dependencies: step1, step2, step3, step4, step5, shared/text_codec,
//               utils, F_stego_capacity, F_stego_analysis, F_stego_hint,
//               stage1_Compress/Wasm_Load_&_Init, stage1_Compress/compression
// ══════════════════════════════════════════════════════════════


/**
 * Read and sanitize all user inputs from the embedding panel DOM elements.
 *
 * @returns {{ coverText: string, secretMessage: string, hint: string, stegoKey: string, fakeCoverText: string }}
 */
function readEmbeddingInputs() {
  return {
    coverText: document.getElementById('embedCover').value.trim(),
    secretMessage: document.getElementById('embedSecretMessage').value.trim(),
    hint: document.getElementById('embedHint').value.trim(),
    stegoKey: document.getElementById('embedStegoKey').value.trim(),
    fakeCoverText: document.getElementById('embedFakeCover').value.trim(),
  };
}


/**
 * Write embedding results to the DOM output elements.
 *
 * Switches between two output modes:
 *   - Normal mode: single stego-text (cover + VS)
 *   - Split mode:  clean cover (message #1) + fake cover with VS (message #2)
 *
 * @param {object} results - The embedding pipeline outputs.
 * @param {number[]} results.basePositions - The PRNG-generated bit positions.
 * @param {string}   results.xorKey        - The binary XOR key.
 * @param {string}   [results.stegoText]   - Normal mode: the completed stego-text.
 * @param {string}   [results.cleanCover]  - Split mode: the clean cover text.
 * @param {string}   [results.fakeCoverWithVS] - Split mode: fake cover text with VS prepended.
 * @param {boolean}  results.isSplitMode   - Whether split mode is active.
 */
function displayEmbeddingResults({ basePositions, xorKey, stegoText, cleanCover, fakeCoverWithVS, isSplitMode }) {
  // 1. Maintain fallback legacy textareas if present
  const baseMapOutputEl = document.getElementById('baseMapOutput');
  if (baseMapOutputEl) {
    baseMapOutputEl.value = '[' + basePositions.join(', ') + ']';
  }
  const shiftKeyOutputEl = document.getElementById('shiftKeyOutput');
  if (shiftKeyOutputEl) {
    shiftKeyOutputEl.value = xorKey;
  }

  // 2. Render modern HTML Base Map coordinate chips
  const baseMapHtml = document.getElementById('baseMapHtml');
  if (baseMapHtml) {
    if (basePositions && basePositions.length > 0) {
      let chipsHtml = `<div class="chips-container">`;
      basePositions.forEach(pos => {
        chipsHtml += `<span class="pos-chip"><span style="opacity:0.5; margin-right:1px;">#</span>${pos}</span>`;
      });
      chipsHtml += `</div>`;
      baseMapHtml.innerHTML = chipsHtml;
    } else {
      baseMapHtml.innerHTML = `<span style="opacity:0.5; font-style:italic;">No positions mapped.</span>`;
    }
  }

  // 3. Render modern HTML binary XOR mask bit stream
  const xorKeyHtml = document.getElementById('xorKeyHtml');
  if (xorKeyHtml) {
    if (xorKey) {
      let activeCount = 0;
      let inactiveCount = 0;
      let bitsHtml = `<div class="bits-container">`;
      for (let i = 0; i < xorKey.length; i++) {
        const bit = xorKey[i];
        if (bit === '1') {
          activeCount++;
          bitsHtml += `<span class="bit bit--active" title="Position #${i + 1}: Bit modified (1)">1</span>`;
        } else if (bit === '0') {
          inactiveCount++;
          bitsHtml += `<span class="bit bit--inactive" title="Position #${i + 1}: Bit identical (0)">0</span>`;
        } else {
          bitsHtml += bit;
        }
      }
      bitsHtml += `</div>`;

      const totalBits = xorKey.length;
      const activePercent = totalBits > 0 ? ((activeCount / totalBits) * 100).toFixed(1) : 0;
      const inactivePercent = totalBits > 0 ? ((inactiveCount / totalBits) * 100).toFixed(1) : 0;

      const statsBarHtml = `
        <div class="xor-stats-bar" style="display: flex; flex-direction: column; gap: var(--space-xs); margin-bottom: var(--space-md); padding-bottom: var(--space-sm); border-bottom: 1px dashed var(--color-outline-variant); width: 100%;">
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.72rem; font-family: 'Sora', sans-serif; font-weight: 600; color: var(--color-on-surface-variant); opacity: 0.85;">
            <span>XOR DISTRIBUTION STATUS</span>
            <span style="letter-spacing: 0.5px;">Entropy Ratio: ${activePercent}% / ${inactivePercent}%</span>
          </div>
          <div style="display: flex; height: 6px; border-radius: var(--radius-full); overflow: hidden; background: rgba(94, 92, 96, 0.15); margin: 2px 0;">
            <div style="width: ${activePercent}%; background: var(--color-primary); transition: width 0.3s ease;"></div>
            <div style="width: ${inactivePercent}%; background: rgba(94, 92, 96, 0.35); transition: width 0.3s ease;"></div>
          </div>
          <div style="display: flex; gap: var(--space-md); font-size: 0.65rem; color: var(--color-on-surface-variant); opacity: 0.8; font-family: 'Sora', sans-serif; font-weight: 500;">
            <span style="display: inline-flex; align-items: center; gap: 4px;">
              <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--color-primary);"></span>
              ${activeCount} Active Bits (1s) &bull; ${activePercent}%
            </span>
            <span style="display: inline-flex; align-items: center; gap: 4px;">
              <span style="width: 6px; height: 6px; border-radius: 50%; background: rgba(176, 176, 176, 0.6);"></span>
              ${inactiveCount} Inactive Bits (0s) &bull; ${inactivePercent}%
            </span>
          </div>
        </div>
      `;

      xorKeyHtml.innerHTML = statsBarHtml + bitsHtml;
    } else {
      xorKeyHtml.innerHTML = `<span style="opacity:0.5; font-style:italic;">No XOR key mask generated.</span>`;
    }
  }

  const normalDiv = document.getElementById('outputModeNormal');
  const splitDiv = document.getElementById('outputModeSplit');

  if (isSplitMode) {
    // Split mode: show two separate outputs
    normalDiv.style.display = 'none';
    splitDiv.style.display = 'block';
    document.getElementById('splitCleanCover').value = cleanCover;
    document.getElementById('splitFakeCoverOutput').value = fakeCoverWithVS;
    // Also populate stegoText for copyToExtractTab compatibility
    document.getElementById('stegoText').value = stegoText || '';
  } else {
    // Normal mode: single stego-text
    normalDiv.style.display = 'block';
    splitDiv.style.display = 'none';
    document.getElementById('stegoText').value = stegoText;
  }
}


/**
 * Main embedding pipeline — orchestrates the full embedding process.
 *
 * Supports two output modes based on whether a fake cover text is provided:
 *   - No fake cover: VS characters are embedded in the cover text (normal)
 *   - With fake cover: VS characters are moved to the fake cover text (split)
 */
async function performEmbedding() {
  try {
    // ── Read and sanitize inputs
    const { coverText, secretMessage, hint, stegoKey, fakeCoverText } = readEmbeddingInputs();

    // ── Validate required fields
    if (!coverText.trim()) return showToast('⚠ Please input the cover text.');
    if (!secretMessage) return showToast('⚠ Please input the secret message.');
    if (!stegoKey.trim()) return showToast('⚠ Please input the Pre-Shared Key (Stego-Key).');

    // ── Validate fake cover size (must be >= secret message size)
    const hasFakeCover = fakeCoverText.trim().length > 0;
    if (hasFakeCover && fakeCoverText.length < secretMessage.length) {
      showToast(`❌ Fake Cover size (${fakeCoverText.length} chars) is less than secret message (${secretMessage.length} chars). It must be >= secret message size.`);
      return;
    }

    // ── Resolve stego-key
    const { resolvedStegoKey } = await resolveStegoKey(stegoKey, coverText);

    // ── Step 1: Build Stego-Payload (secret message + optional hint → bytes)
    const payloadBytes = buildPayload(secretMessage, hint);

    // ── Step 0: Compress payload via Brotli Stream (with overhead guard)
    //    If compression reduces size → prepend flag 0xFE + compressed bytes
    //    If compression causes overhead → use raw bytes as-is (NO flag, zero overhead)
    //    0xFE is safe: it never appears as a valid UTF-8 start byte
    const compressedBytes = doStreamCompress(payloadBytes);

    let finalPayload;
    if (compressedBytes.length < payloadBytes.length) {
      // Compression saved space → prepend 0xFE flag + compressed data
      finalPayload = new Uint8Array(1 + compressedBytes.length);
      finalPayload[0] = 0xFE;
      finalPayload.set(compressedBytes, 1);
    } else {
      // Compression caused overhead → raw payload, no flag, zero overhead
      finalPayload = payloadBytes;
    }

    // ── Stage 2: AES-256-CTR Encryption (0-byte overhead)
    const encryptionKeyEl = document.getElementById('embedEncryptionKey');
    // If AES-CTR key is empty, fall back to the resolved Stego-Key for derivation
    const encryptionKey = (encryptionKeyEl && encryptionKeyEl.value.trim()) || resolvedStegoKey;
    
    finalPayload = await encryptPayloadCtr(finalPayload, encryptionKey, coverText);

    const messageBits = bytesToBinary(finalPayload);

    // ── shared/text_codec: Cover-text → Binary
    const coverBits = stringToBinary(coverText);

    // ── Embedding capacity validation (payload must fit within cover-text)
    if (messageBits.length > coverBits.length) {
      showToast(`❌ You need ${messageBits.length} bits but the cover contains only ${coverBits.length} bits.`);
      return;
    }

    // ── Step 2: Generate PRNG positions (stego-key → seed → positions)
    const basePositions = generatePositions(coverBits.length, messageBits.length, resolvedStegoKey);

    // ── Step 3: Generate XOR key (cover bits ⊕ payload bits at positions)
    const xorKey = generateXORKey(coverBits, basePositions, messageBits);

    // ── Step 4: Encode via VS Codec (XOR key → invisible VS characters)
    const { vsStr, bytesArr } = xorKeyToVSString(xorKey);

    // ── Step 5: Build output based on mode
    let finalStegoText = "";
    let finalFakeCoverWithVS = "";
    if (hasFakeCover) {
      // Split mode: VS goes to fake cover, cover stays clean
      finalFakeCoverWithVS = vsStr + fakeCoverText;
      finalStegoText = buildStegoObject(coverText, vsStr); // for extract tab compatibility

      displayEmbeddingResults({
        basePositions, xorKey,
        stegoText: finalStegoText,
        cleanCover: coverText,
        fakeCoverWithVS: finalFakeCoverWithVS,
        isSplitMode: true,
      });

      showToast('✅ Generated — Cover is clean + VS characters in the Fake Cover!');
    } else {
      // Normal mode: VS embedded in cover
      finalStegoText = buildStegoObject(coverText, vsStr);

      displayEmbeddingResults({
        basePositions, xorKey,
        stegoText: finalStegoText,
        isSplitMode: false,
      });

      showToast('✅ Key generated and embedded in the cover!');
    }

    // ── Feature: VS Visualization (hex breakdown of key bytes)
    updateVSVisualization(xorKey, bytesArr);

    // ── Feature: Key Size Meter (key bytes vs cover characters ratio)
    updateKeySizeMeter(bytesArr.length, coverText.length);

    // ── Feature: Save hint to localStorage (if provided)
    if (hint) {
      saveHint({
        type: 'sent',
        emoji: hint,
        timestamp: new Date().toISOString(),
      });
    }

    // ── Feature: Refresh Embedding Capacity Meter
    updateCapacityMeter();

    // ── Feature: Save complete embedding trace for deep diagnostics details page
    try {
      const traceData = {
        coverText,
        secretMessage,
        hint,
        resolvedStegoKey,
        encryptionKey,
        payloadSize: payloadBytes.length,
        compressed: compressedBytes.length < payloadBytes.length,
        compressedSize: compressedBytes.length,
        messageBitsLength: messageBits.length,
        coverBitsLength: coverBits.length,
        basePositions,
        xorKey,
        bytesArr,
        stegoText: hasFakeCover ? coverText : finalStegoText,
        isSplitMode: hasFakeCover,
        fakeCoverText: hasFakeCover ? fakeCoverText : "",
        fakeCoverWithVS: hasFakeCover ? finalFakeCoverWithVS : "",
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('stegoTrace', JSON.stringify(traceData));
    } catch (e) {
      console.error('Failed to save stegoTrace:', e);
    }

  } catch (error) {
    showToast('❌ Embedding error: ' + error.message);
  }
}

