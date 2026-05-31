// ══════════════════════════════════════════════════════════════
// Feature: Chat Scanner — Bulk Message Extraction
// ══════════════════════════════════════════════════════════════
//
// Scans a pasted chat conversation to find hidden steganographic
// messages. Simplified UX with two action modes:
//
//   🚀 One-Click: Filter → Extract VS → Try all (full pipeline)
//   🔍 Verify:   Filter → Extract VS (show results for review)
//
// Dependencies: F_chat_parser, step1–step5, shared/text_codec, utils
//
// ══════════════════════════════════════════════════════════════


// ── STATE — holds intermediate results between steps ──────────
let _scannerState = {
  messages: [],        // [{ sender, message }]  — raw parsed messages
  cleanMessages: [],   // [string]               — messages without VS
  vsKey: null,         // Uint8Array | null       — extracted VS bytes
  carrierIndex: -1,    // index of carrier message
  platform: 'generic', // detected platform key
};


// ══════════════════════════════════════════════════════════════
// UI HELPERS — Progress bar, collapsible sections
// ══════════════════════════════════════════════════════════════

/**
 * Toggle a collapsible scanner result section.
 * @param {string} bodyId - The ID of the body element to toggle.
 */
function toggleScannerResult(bodyId) {
  const body = document.getElementById(bodyId);
  const toggle = body.parentElement.querySelector('.scanner-result-toggle');
  const chevron = toggle ? toggle.querySelector('.scanner-chevron') : null;

  if (body.style.display === 'none') {
    body.style.display = 'block';
    if (chevron) chevron.classList.add('rotated');
  } else {
    body.style.display = 'none';
    if (chevron) chevron.classList.remove('rotated');
  }
}


/**
 * Update the progress bar UI.
 * @param {number} step    - Current step (1–3).
 * @param {string} label   - Progress label text.
 * @param {number} percent - Fill percentage (0–100).
 */
function _updateProgress(step, label, percent) {
  const bar = document.getElementById('scannerProgressBar');
  bar.style.display = 'block';

  document.getElementById('scannerProgressLabel').textContent = label;
  document.getElementById('scannerProgressFill').style.width = percent + '%';

  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById('progStep' + i);
    el.classList.remove('active', 'done');
    if (i < step) el.classList.add('done');
    if (i === step) el.classList.add('active');
  }
}


/**
 * Hide the progress bar.
 */
function _hideProgress() {
  document.getElementById('scannerProgressBar').style.display = 'none';
}


/**
 * Reset all scanner result cards.
 */
function _resetScannerResults() {
  document.getElementById('scannerStep1Card').style.display = 'none';
  document.getElementById('scannerStep2Card').style.display = 'none';
  document.getElementById('scannerStep3Card').style.display = 'none';
}


/**
 * Yield control to the browser for UI updates (used in async pipeline).
 * @param {number} ms - Milliseconds to wait.
 */
function _delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


// ══════════════════════════════════════════════════════════════
// ONE-CLICK PIPELINE: Filter → Extract → Try
// ══════════════════════════════════════════════════════════════

/**
 * Run the full scanner pipeline in one click:
 * Step 1 (Filter) → Step 2 (Extract VS) → Step 3 (Try password).
 */
async function scannerOneClick() {
  const rawText = document.getElementById('scannerChatInput').value;
  if (!rawText.trim()) return showToast('⚠ Please paste the chat first.');

  _resetScannerResults();

  // ── Step 1: Filter ──
  _updateProgress(1, '① Filtering messages...', 15);
  await _delay(100);

  if (!_runFilterStep(rawText)) return _hideProgress();

  _updateProgress(1, '① Filter completed ✓', 33);
  await _delay(150);

  // ── Step 2: Extract VS ──
  _updateProgress(2, '② Extracting VS characters...', 50);
  await _delay(100);

  _runExtractStep();

  if (!_scannerState.vsKey) {
    _hideProgress();
    _showStep2Results(true);
    return showToast('❌ No hidden key in the chat.');
  }

  _updateProgress(2, '② VS extracted successfully ✓', 66);
  await _delay(150);

  // ── Step 3: Try password ──
  _updateProgress(3, '③ Testing candidate covers...', 80);
  await _delay(100);

  try {
    await _runTryStep();
  } catch (e) {
    console.error('[Scanner] _runTryStep crashed:', e);
    showToast('❌ Scanner Step 3 error: ' + (e.message || e));
  }

  _updateProgress(3, '✅ Scan completed', 100);
  await _delay(500);
  _hideProgress();

  // Show all result cards (collapsed by default, Step 3 expanded)
  _showStep1Results(false);
  _showStep2Results(false);
}


/**
 * Verify Filter mode: runs Filter + Extract, then shows results
 * expanded so the user can verify correctness and see VS characters.
 */
async function scannerVerifyFilter() {
  const rawText = document.getElementById('scannerChatInput').value;
  if (!rawText.trim()) return showToast('⚠ Please paste the chat first.');

  _resetScannerResults();

  // ── Step 1: Filter ──
  if (!_runFilterStep(rawText)) return;
  _showStep1Results(true);

  // ── Step 2: Extract VS ──
  _runExtractStep();
  _showStep2Results(true);

  if (_scannerState.vsKey) {
    showToast(`✅ Filtered ${_scannerState.messages.length} messages + extracted VS key (${_scannerState.vsKey.length} bytes).`);
  } else {
    showToast(`✅ Filtered ${_scannerState.messages.length} messages — no hidden VS characters.`);
  }
}


// ══════════════════════════════════════════════════════════════
// INTERNAL STEP FUNCTIONS (shared by both modes)
// ══════════════════════════════════════════════════════════════

/**
 * Step 1 (internal): Parse and filter chat text.
 * @param {string} rawText - The raw pasted chat text.
 * @returns {boolean} True if messages were found, false otherwise.
 */
function _runFilterStep(rawText) {
  const platformSelect = document.getElementById('scannerPlatform');
  const selectedPlatform = platformSelect ? platformSelect.value : 'auto';

  const platform = (selectedPlatform === 'auto')
    ? detectPlatform(rawText)
    : selectedPlatform;

  const messages = parseChat(rawText, platform);

  if (messages.length === 0) {
    showToast('⚠ No messages found.');
    return false;
  }

  _scannerState.messages = messages;
  _scannerState.platform = platform;
  return true;
}


/**
 * Step 2 (internal): Extract VS bytes from all messages.
 */
function _runExtractStep() {
  const messages = _scannerState.messages;
  const cleanMessages = [];
  let vsKey = null;
  let carrierIndex = -1;

  for (let i = 0; i < messages.length; i++) {
    const { vsBytes, cleanText } = extractVSFromText(messages[i].message);
    cleanMessages.push(cleanText);

    if (vsBytes.length > 0 && !vsKey) {
      vsKey = vsBytes;
      carrierIndex = i;
    }
  }

  _scannerState.cleanMessages = cleanMessages;
  _scannerState.vsKey = vsKey;
  _scannerState.carrierIndex = carrierIndex;
}


/**
 * Step 3 (internal): Try the password against all clean messages.
 *
 * For each non-carrier message, attempts to reverse the XOR using
 * the VS key extracted from the carrier. If the result is valid
 * UTF-8 printable text, it's a match.
 */
async function _runTryStep() {
  const vsKey = _scannerState.vsKey;
  const cleanMessages = _scannerState.cleanMessages;
  const carrierIndex = _scannerState.carrierIndex;
  const password = document.getElementById('scannerPassword').value.trim();
  const encryptionKey = document.getElementById('scannerEncryptionKey').value.trim();

  if (!vsKey) return;

  const xorKeyBinary = bytesToBinary(vsKey);
  const matches = [];
  const nonMatches = [];
  const skipped = [];

  for (let i = 0; i < cleanMessages.length; i++) {
    if (i === carrierIndex) {
      skipped.push({ index: i + 1, type: 'carrier' });
      continue;
    }

    const candidateCover = cleanMessages[i];
    const result = await _tryOneCover(candidateCover, xorKeyBinary, password, encryptionKey);

    if (result.match) {
      matches.push({
        index: i + 1,
        coverText: candidateCover,
        secretMessage: result.secretMessage,
        hint: result.hint,
        type: 'normal'
      });
    } else {
      nonMatches.push({
        index: i + 1,
        coverText: candidateCover,
        reasonObj: result
      });
    }
  }

  // ── Carrier fallback: also try the carrier's own clean text ──
  // In normal mode (VS embedded in cover), the carrier IS the cover.
  // The scanner extracted VS from it and skipped it above.
  // Try its clean text as a last-resort cover candidate.
  if (matches.length === 0 && carrierIndex >= 0 && cleanMessages[carrierIndex]) {
    const carrierCleanText = cleanMessages[carrierIndex];
    const result = await _tryOneCover(carrierCleanText, xorKeyBinary, password, encryptionKey);

    if (result.match) {
      matches.push({
        index: carrierIndex + 1,
        coverText: carrierCleanText,
        secretMessage: result.secretMessage,
        hint: result.hint,
        type: 'carrier_fallback'
      });

      // Remove carrier from skipped list since we found a match on it
      const skippedIdx = skipped.findIndex(s => s.index === (carrierIndex + 1));
      if (skippedIdx !== -1) {
        skipped.splice(skippedIdx, 1);
      }
    }
  }

  let html = `
    <div class="stego-table" style="margin-top: 0;">
      <div class="stego-table__body">`;

  if (matches.length === 0) {
    html += `
      <div class="stego-table__row stego-table__row--error">
        <div class="stego-table__cell" style="padding: var(--space-lg);">
          <div style="display: flex; align-items: flex-start; gap: 12px; text-align: left;" dir="ltr">
            <span class="material-symbols-outlined" style="color: var(--color-error); font-size: 24px; margin-top: 2px;">error</span>
            <div>
              <h4 style="margin: 0; color: var(--color-error); font-weight: 700; font-size: 14px; margin-bottom: 6px; font-family: var(--font-primary);">No Matching Secret Message Found</h4>
              <p style="margin: 0; color: var(--color-on-surface-variant); font-size: 12px; line-height: 1.5; font-family: var(--font-body);">
                All messages were tested using the extracted VS key, but none matched the password. 
                Please verify your <strong>password</strong> and ensure the pasted text contains the original cover message.
              </p>
            </div>
          </div>
        </div>
      </div>`;
  }

  // 1. Render matches
  for (const m of matches) {
    html += _buildMatchHTML(m.index, m.coverText, m.secretMessage, m.hint, m.type);
  }

  // 2. Render skipped items
  for (const s of skipped) {
    html += _buildSkippedHTML(s.index);
  }

  // 3. Render non-matches
  for (const n of nonMatches) {
    html += _buildNoMatchHTML(n.index, n.coverText, n.reasonObj);
  }

  html += `
      </div>
    </div>`;

  // Inject trial summary status into Step 3 trigger count element
  const countSpan = document.getElementById('scannerStep3Count');
  if (countSpan) {
    if (matches.length > 0) {
      countSpan.innerHTML = `<span class="badge badge--encrypted text-label-md" style="margin-left: 8px;">Decrypted! (${matches.length})</span>`;
    } else {
      countSpan.innerHTML = `<span class="badge badge--danger text-label-md" style="margin-left: 8px;">No Match</span>`;
    }
  }

  const container = document.getElementById('scannerTryResults');
  container.innerHTML = html;
  document.getElementById('scannerStep3Card').style.display = 'block';

  if (matches.length > 0) {
    showToast('✅ Hidden message found!');
  } else {
    showToast('❌ No match found.');
  }
}


/**
 * Try a single cover text candidate against the VS key.
 *
 * @param {string} candidateCover - The cover text to test.
 * @param {string} xorKeyBinary  - The XOR key as a binary string.
 * @param {string} password      - The user-supplied password.
 * @returns {Promise<{ match: boolean, secretMessage?: string, hint?: string, reason?: string, details?: any, errorMsg?: string }>}
 */
async function _tryOneCover(candidateCover, xorKeyBinary, password, encryptionKey) {
  const coverBits = stringToBinary(candidateCover);

  if (xorKeyBinary.length > coverBits.length) {
    return {
      match: false,
      reason: 'too_short',
      details: { needed: xorKeyBinary.length, available: coverBits.length }
    };
  }

  try {
    const { resolvedStegoKey } = await resolveStegoKey(password, candidateCover);

    const positions = generatePositions(coverBits.length, xorKeyBinary.length, resolvedStegoKey);
    const recoveredBinary = recoverPayloadBits(coverBits, positions, xorKeyBinary);
    const recoveredPayload = binaryToBytes(recoveredBinary);

    // ── Try decryption first (use provided key or fallback to resolvedStegoKey) ──
    let decryptedPayload = recoveredPayload;
    let decryptionSucceeded = false;
    const decryptionKey = encryptionKey || resolvedStegoKey;
    try {
      decryptedPayload = await decryptPayloadCtr(recoveredPayload, decryptionKey, candidateCover);
      decryptionSucceeded = true;
    } catch (err) {
      // Ignore decryption error, fallback will handle it
    }

    // Try processing the decrypted payload
    let payloadBytes;
    let decompressedSucceeded = false;
    try {
      if (decryptedPayload[0] === 0xFE) {
        payloadBytes = doStreamDecompress(decryptedPayload.subarray(1));
        decompressedSucceeded = true;
      } else {
        payloadBytes = decryptedPayload;
      }
    } catch (e) {
      // Decompress failed for decrypted payload, set to raw recovered payload to trigger fallback
      payloadBytes = null;
    }

    const strictDecoder = new TextDecoder('utf-8', { fatal: true });

    if (payloadBytes) {
      // Separate message and hint bytes
      const delimiterIndex = payloadBytes.indexOf(0xFF);
      let msgBytes, hintBytes = null;
      if (delimiterIndex !== -1) {
        msgBytes = payloadBytes.subarray(0, delimiterIndex);
        hintBytes = payloadBytes.subarray(delimiterIndex + 1);
      } else {
        msgBytes = payloadBytes;
      }

      try {
        const decodedMsg = strictDecoder.decode(msgBytes);
        const decodedHint = hintBytes ? strictDecoder.decode(hintBytes) : '';

        if (decodedMsg.length > 0 && isPrintableText(decodedMsg)) {
          return { match: true, secretMessage: decodedMsg, hint: decodedHint };
        }
      } catch (e) {
        // Decode failed for decrypted payload, fallback will handle it
      }
    }

    // ── Fallback: if we decrypted but failed, try unencrypted raw payload ──
    if (decryptionSucceeded) {
      let rawPayloadBytes;
      try {
        if (recoveredPayload[0] === 0xFE) {
          rawPayloadBytes = doStreamDecompress(recoveredPayload.subarray(1));
        } else {
          rawPayloadBytes = recoveredPayload;
        }

        const rawDelimiterIndex = rawPayloadBytes.indexOf(0xFF);
        let rawMsgBytes, rawHintBytes = null;
        if (rawDelimiterIndex !== -1) {
          rawMsgBytes = rawPayloadBytes.subarray(0, rawDelimiterIndex);
          rawHintBytes = rawPayloadBytes.subarray(rawDelimiterIndex + 1);
        } else {
          rawMsgBytes = rawPayloadBytes;
        }

        const rawDecodedMsg = strictDecoder.decode(rawMsgBytes);
        const rawDecodedHint = rawHintBytes ? strictDecoder.decode(rawHintBytes) : '';
        if (rawDecodedMsg.length > 0 && isPrintableText(rawDecodedMsg)) {
          return { match: true, secretMessage: rawDecodedMsg, hint: rawDecodedHint };
        }
      } catch (e) {
        // Fallback failed too
      }
    }

    return { match: false, reason: 'unreadable' };
  } catch (err) {
    return { match: false, reason: 'invalid_utf8', errorMsg: err.message || err };
  }
}


/**
 * Build HTML for a matching cover result.
 */
function _buildMatchHTML(msgNum, coverText, secretMessage, hint, type) {
  let typeLabel = '';
  if (type === 'carrier_fallback') {
    typeLabel = '<span class="badge badge--draft text-label-md" style="margin-left: 8px;">(Cover = Carrier)</span>';
  }

  return `
    <div class="stego-table__row stego-table__row--success">
      <div class="stego-table__cell" style="padding: var(--space-lg); text-align: left;" dir="ltr">
        
        <!-- 1. Secret Message Box -->
        <div style="background: var(--color-surface-container); border: 1px solid var(--color-outline-variant); border-radius: var(--radius-xl); padding: var(--space-md); margin-bottom: var(--space-md);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-sm);">
            <div style="display: inline-flex; align-items: center; gap: var(--space-sm);">
              <span class="material-symbols-outlined" style="color: var(--color-secondary); font-size: 20px;">lock_open</span>
              <span style="font-family: var(--font-primary); font-weight: 700; color: var(--color-secondary); font-size: var(--fs-body-md);">Secret Message:</span>
            </div>
            <button class="btn btn--secondary" data-secret="${escapeHtml(secretMessage)}" onclick="navigator.clipboard.writeText(this.getAttribute('data-secret')); showToast('📋 Secret message copied successfully!');" style="padding: var(--space-xs) var(--space-sm); font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">
              <span class="material-symbols-outlined" style="font-size: 14px;">content_copy</span>
              <span>Copy</span>
            </button>
          </div>
          <div style="font-size: var(--fs-headline-md); font-weight: 700; color: var(--color-on-surface); word-break: break-all; font-family: var(--font-primary); line-height: 1.4;">${escapeHtml(secretMessage)}</div>
        </div>

        <!-- 2. Attached Stego Hint (if present) -->
        ${hint ? `
        <div style="margin-bottom: var(--space-md); background: var(--color-surface-container-low); border: 1px solid var(--color-outline-variant); border-radius: var(--radius-xl); padding: var(--space-md); display: flex; align-items: flex-start; gap: 12px;">
          <span class="material-symbols-outlined" style="color: var(--color-tertiary); font-size: 20px; margin-top: 2px;">lightbulb</span>
          <div>
            <div style="font-size: var(--fs-body-sm); font-weight: bold; color: var(--color-tertiary); font-family: var(--font-label); margin-bottom: 2px;">Hint:</div>
            <div style="font-size: var(--fs-body-md); color: var(--color-on-surface); font-family: var(--font-body); line-height: 1.5;">${escapeHtml(hint)}</div>
          </div>
        </div>` : ''}

        <!-- 3. Source Cover Message Descriptor -->
        <div style="display: flex; align-items: center; gap: var(--space-sm); font-family: var(--font-body); font-size: var(--fs-body-sm); color: var(--color-on-surface-variant);">
          <span class="stego-table__index">#${msgNum}</span>
          <span>Extracted from cover message <strong>#${msgNum}</strong></span>
          ${typeLabel}
        </div>

      </div>
    </div>`;
}


/**
 * Build HTML for a non-matching cover result.
 */
function _buildNoMatchHTML(msgNum, candidateText, reasonObj) {
  const reason = reasonObj.reason;
  const details = reasonObj.details || {};
  const errorMsg = reasonObj.errorMsg || '';

  let explanationHtml = '';
  let statusBadge = '';
  let rowClass = 'stego-table__row--error';

  const previewText = candidateText.length > 60 ? candidateText.substring(0, 60) + '...' : candidateText;

  if (reason === 'too_short') {
    rowClass = 'stego-table__row--warning';
    statusBadge = `<span class="badge badge--draft text-label-md">⚠️ Too Short</span>`;
    explanationHtml = `
      <div style="font-size: 12px; color: var(--color-tertiary); margin-top: 6px; font-weight: 600; font-family: var(--font-primary);">Message is too short to be the cover text</div>
      <div class="stego-table__content" style="font-size: 11px; margin-top: 2px; line-height: 1.4; font-family: var(--font-body);">
        The current message size (<strong style="color: var(--color-on-surface); font-family: monospace;">${details.available} bits</strong>) is smaller than the required VS key size (<strong style="color: var(--color-on-surface); font-family: monospace;">${details.needed} bits</strong>). It is too short to carry the hidden steganographic payload.
      </div>
    `;
  } else if (reason === 'unreadable') {
    statusBadge = `<span class="badge badge--danger text-label-md">❌ Unreadable</span>`;
    explanationHtml = `
      <div style="font-size: 12px; color: var(--color-error); margin-top: 6px; font-weight: 600; font-family: var(--font-primary);">Decrypted payload is unreadable (garbage data)</div>
      <div class="stego-table__content" style="font-size: 11px; margin-top: 2px; line-height: 1.4; font-family: var(--font-body);">
        Decapsulation and reverse XOR completed, but the recovered binary representation yielded random, unprintable characters. This usually happens when testing a wrong candidate cover or using an incorrect password.
      </div>
    `;
  } else if (reason === 'invalid_utf8') {
    statusBadge = `<span class="badge badge--danger text-label-md">🛑 Malformed Encoding</span>`;
    explanationHtml = `
      <div style="font-size: 12px; color: var(--color-error); margin-top: 6px; font-weight: 600; font-family: var(--font-primary);">Invalid UTF-8 binary encoding</div>
      <div class="stego-table__content" style="font-size: 11px; margin-top: 2px; line-height: 1.4; font-family: var(--font-body);">
        The recovered binary payload does not represent a valid UTF-8 text string, indicating data corruption or cover text mismatch.
      </div>
      <div style="font-size: 10px; font-family: 'JetBrains Mono', monospace; color: var(--color-on-surface-variant); background: var(--color-surface-container); padding: 4px 8px; border-radius: 4px; margin-top: 6px; word-break: break-all; text-align: left;" dir="ltr">
        Technical error: ${escapeHtml(errorMsg)}
      </div>
    `;
  } else {
    statusBadge = `<span class="badge badge--draft text-label-md">⚠️ Scan Error</span>`;
    explanationHtml = `
      <div style="font-size: 12px; color: var(--color-on-surface-variant); margin-top: 6px; font-weight: 600; font-family: var(--font-primary);">Verification trial failed</div>
      <div class="stego-table__content" style="font-size: 11px; margin-top: 2px; line-height: 1.4; font-family: var(--font-body);">
        The scan trial failed due to an unknown reason: ${escapeHtml(reason || 'unspecified')}
      </div>
    `;
  }

  return `
    <div class="stego-table__row ${rowClass}">
      <div class="stego-table__cell">
        <div class="stego-table__meta">
          <div class="stego-table__title-row">
            <span class="stego-table__index">#${msgNum}</span>
            <span class="stego-table__sender" style="color: var(--color-on-surface-variant); font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;" title="${escapeHtml(candidateText)}">
              "${escapeHtml(previewText)}"
            </span>
          </div>
          ${statusBadge}
        </div>
        ${explanationHtml}
      </div>
    </div>`;
}


/**
 * Build HTML for a skipped carrier message.
 */
function _buildSkippedHTML(msgNum) {
  return `
    <div class="stego-table__row stego-table__row--skipped">
      <div class="stego-table__cell">
        <div class="stego-table__meta">
          <div class="stego-table__title-row">
            <span class="stego-table__index">#${msgNum}</span>
            <span class="stego-table__sender" style="color: var(--color-on-surface-variant); font-weight: 500;">
              Extracted Carrier Message (Contains VS)
            </span>
          </div>
          <span class="badge badge--draft text-label-md">
            Skipped (Carrier)
          </span>
        </div>
      </div>
    </div>`;
}


// ══════════════════════════════════════════════════════════════
// RESULT DISPLAY HELPERS
// ══════════════════════════════════════════════════════════════

/**
 * Show Step 1 results card (filtered messages).
 * @param {boolean} expanded - Whether to show the body expanded.
 */
function _showStep1Results(expanded) {
  const messages = _scannerState.messages;
  const platform = _scannerState.platform;
  const platformLabel = CHAT_PLATFORMS[platform]?.name || 'Plain Text';

  // Build HTML
  const container = document.getElementById('scannerFilteredList');
  let html = `
    <div class="stego-table" style="margin-top: 0;">
      <div class="stego-table__body">`;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const senderLabel = msg.sender ? `<span class="stego-table__sender" style="margin-right: var(--space-xs);">${escapeHtml(msg.sender)}:</span>` : '';
    html += `
      <div class="stego-table__row">
        <div class="stego-table__cell" dir="ltr">
          <div class="stego-table__meta">
            <div class="stego-table__title-row">
              <span class="stego-table__index">#${i + 1}</span>
              ${senderLabel}
            </div>
          </div>
          <div class="stego-table__content" dir="auto">${escapeHtml(msg.message)}</div>
        </div>
      </div>`;
  }

  html += `
      </div>
    </div>`;
  container.innerHTML = html;

  // Update count badge
  document.getElementById('scannerStep1Count').textContent = `(📱 ${platformLabel} — ${messages.length} messages)`;

  // Show card
  const card = document.getElementById('scannerStep1Card');
  card.style.display = 'block';

  // Toggle body visibility
  const body = document.getElementById('scannerStep1Body');
  const chevron = card.querySelector('.scanner-chevron');

  if (expanded) {
    body.style.display = 'block';
    if (chevron) chevron.classList.add('rotated');
  } else {
    body.style.display = 'none';
    if (chevron) chevron.classList.remove('rotated');
  }
}


/**
 * Show Step 2 results card (extracted VS characters).
 * @param {boolean} expanded - Whether to show the body expanded.
 */
function _showStep2Results(expanded) {
  const vsKey = _scannerState.vsKey;
  const carrierIndex = _scannerState.carrierIndex;

  const container = document.getElementById('scannerExtractedList');
  let html = `
    <div class="stego-table" style="margin-top: 0;">
      <div class="stego-table__body">`;

  // ── 1. VS Key Row (if exists)
  if (vsKey) {
    const hexDisplay = Array.from(vsKey).map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
    html += `
      <div class="stego-table__row stego-table__row--warning">
        <div class="stego-table__cell" dir="ltr" style="padding: var(--space-md);">
          <div style="font-family: var(--font-body); font-size: var(--fs-body-md); color: var(--color-on-surface-variant); margin-bottom: var(--space-sm);">
            Found in: <strong>Message #${carrierIndex + 1}</strong>
          </div>
          <div class="stego-table__hex-container" dir="ltr" style="margin-top: 0; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--color-on-surface); border: 1px solid var(--color-outline-variant);">${hexDisplay}</div>
        </div>
      </div>`;
  } else {
    html += `
      <div class="stego-table__row stego-table__row--error">
        <div class="stego-table__cell" dir="ltr" style="padding: var(--space-md);">
          <div style="font-family: var(--font-body); font-size: var(--fs-body-sm); color: var(--color-on-surface-variant); line-height: 1.5;">
            No hidden Variation Selector characters were detected. Ensure you paste the entire chat history, including the carrier message containing the hidden VS keys.
          </div>
        </div>
      </div>`;
  }

  html += `
      </div>
    </div>`;
  container.innerHTML = html;

  // Update count badge
  const countText = vsKey
    ? `(🔑 Extracted ${vsKey.length} bytes)`
    : '(❌ No VS detected)';
  document.getElementById('scannerStep2Count').textContent = countText;

  // Show card
  const card = document.getElementById('scannerStep2Card');
  card.style.display = 'block';

  // Toggle body visibility
  const body = document.getElementById('scannerStep2Body');
  const chevron = card.querySelector('.scanner-chevron');

  if (expanded) {
    body.style.display = 'block';
    if (chevron) chevron.classList.add('rotated');
  } else {
    body.style.display = 'none';
    if (chevron) chevron.classList.remove('rotated');
  }
}


// ── HELPER ────────────────────────────────────────────────────

/**
 * Check if a string contains mostly printable/readable characters.
 */
function isPrintableText(text) {
  if (!text || text.length === 0) return false;

  let printableCount = 0;
  for (const char of text) {
    const code = char.codePointAt(0);
    if (
      (code >= 0x20 && code <= 0x7E) ||  // ASCII printable
      (code >= 0x0600 && code <= 0x06FF) ||  // Arabic
      (code >= 0x0750 && code <= 0x077F) ||  // Arabic Supplement
      (code >= 0xFB50 && code <= 0xFDFF) ||  // Arabic Presentation Forms-A
      (code >= 0xFE70 && code <= 0xFEFF) ||  // Arabic Presentation Forms-B
      (code >= 0x4E00 && code <= 0x9FFF) ||  // CJK
      (code >= 0xAC00 && code <= 0xD7AF) ||  // Korean
      (code >= 0x1F300 && code <= 0x1FAFF) || // Emoji
      code === 0x0A || code === 0x0D ||       // Newline, CR
      code === 0x09                           // Tab
    ) {
      printableCount++;
    }
  }

  return (printableCount / [...text].length) >= 0.8;
}


/**
 * Escape HTML special characters to prevent XSS.
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
