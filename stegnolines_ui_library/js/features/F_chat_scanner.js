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
  bar.style.display = 'flex';

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
  if (!rawText.trim()) return showToast('⚠ Please paste the chat history first.');

  _resetScannerResults();

  // ── Step 1: Filter ──
  _updateProgress(1, '① Filtering messages…', 15);
  await _delay(100);

  if (!_runFilterStep(rawText)) return _hideProgress();

  _updateProgress(1, '① Filtering complete ✓', 33);
  await _delay(150);

  // ── Step 2: Extract VS ──
  _updateProgress(2, '② Extracting characters VS…', 50);
  await _delay(100);

  _runExtractStep();

  if (!_scannerState.vsKey) {
    _hideProgress();
    _showStep2Results(true);
    return showToast('❌ No hidden key found in the conversation.');
  }

  _updateProgress(2, '② Extracted VS ✓', 66);
  await _delay(150);

  // ── Step 3: Try password ──
  _updateProgress(3, '③ Testing the key…', 80);
  await _delay(100);

  await _runTryStep();

  _updateProgress(3, '✅ Scanning complete', 100);
  await _delay(500);
  _hideProgress();

  // NOTE: Step 1 & Step 2 result cards only appear when clicking "Verify Filter"
}


/**
 * Verify Filter mode: runs Filter + Extract, then shows results
 * expanded so the user can verify correctness and see VS characters.
 */
async function scannerVerifyFilter() {
  const rawText = document.getElementById('scannerChatInput').value;
  if (!rawText.trim()) return showToast('⚠ Please paste the chat history first.');

  _resetScannerResults();

  // ── Step 1: Filter ──
  if (!_runFilterStep(rawText)) return;
  _showStep1Results(true);

  // ── Step 2: Extract VS ──
  _runExtractStep();
  _showStep2Results(true);

  if (_scannerState.vsKey) {
    showToast(`✅ Filtered ${_scannerState.messages.length} message + extracted key VS (${_scannerState.vsKey.length} bytes).`);
  } else {
    showToast(`✅ Filtered ${_scannerState.messages.length} message — No characters VS hidden.`);
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
    showToast('⚠ text text text text text messages.');
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
  let rawCarrierMessage = '';
  let carrierIndex = -1;

  for (let i = 0; i < messages.length; i++) {
    const { vsBytes, cleanText } = extractVSFromText(messages[i].message);
    cleanMessages.push(cleanText);

    if (vsBytes.length > 0 && !vsKey) {
      vsKey = vsBytes;
      rawCarrierMessage = messages[i].message;
      carrierIndex = i;
    }
  }

  _scannerState.cleanMessages = cleanMessages;
  _scannerState.rawCarrierMessage = rawCarrierMessage;
  _scannerState.vsKey = vsKey;
  _scannerState.carrierIndex = carrierIndex;
}


/**
 * Step 3 (internal): Try the password against all clean messages.
 */
async function _runTryStep() {
  const vsKey = _scannerState.vsKey;
  const cleanMessages = _scannerState.cleanMessages;
  const carrierIndex = _scannerState.carrierIndex;
  const rawCarrierMessage = _scannerState.rawCarrierMessage;
  const password = document.getElementById('scannerPassword').value;

  if (!vsKey) return;

  let foundMatch = false;
  let html = '<div class="space-y-2">';

  const cleanCoverBitsMap = cleanMessages.map(msg => stringToBinary(msg));

  for (let i = 0; i < cleanMessages.length; i++) {
    // Skip carrier message itself
    if (i === carrierIndex) {
      html += `
        <div class="scanner-status-box">
          <span style="color:var(--color-on-surface-variant); font-size:var(--fs-label-md);">#${i + 1}</span>
          <span style="color:var(--color-on-surface-variant); font-size:var(--fs-label-md); margin-right:var(--space-sm);">[Skipped — Carrier]</span>
        </div>`;
      continue;
    }

    const candidateCover = cleanMessages[i];
    const coverBits = cleanCoverBitsMap[i];
    const xorKeyBinary = bytesToBinary(vsKey);

    // Check if cover is long enough
    if (xorKeyBinary.length > coverBits.length) {
      html += `
        <div class="scanner-status-box">
          <span style="color:var(--color-on-surface-variant); font-size:var(--fs-label-md);">#${i + 1}</span>
          <span style="color:var(--color-error); font-size:var(--fs-label-md); margin-right:var(--space-sm);">[Too short — ${coverBits.length} bits < ${xorKeyBinary.length} bits]</span>
        </div>`;
      continue;
    }

    try {
      const { resolvedStegoKey } = await resolveStegoKey(password, candidateCover);
      const strictDecoder = new TextDecoder('utf-8', { fatal: true });

      function tryEngine(posFn) {
        try {
          const positions = posFn(coverBits.length, xorKeyBinary.length, resolvedStegoKey);
          const recoveredBinary = recoverPayloadBits(coverBits, positions, xorKeyBinary);
          const payloadBytes = binaryToBytes(recoveredBinary);
          const decoded = strictDecoder.decode(payloadBytes);
          if (decoded.length > 0 && isPrintableText(decoded)) {
            return parsePayload(payloadBytes);
          }
        } catch (e) {}
        return null;
      }

      // 1. Try Modern Engine
      let parsed = tryEngine(generatePositions);
      // 2. Fallback to Legacy Engine
      if (!parsed && typeof generatePositionsLegacy === 'function') {
        parsed = tryEngine(generatePositionsLegacy);
      }

      if (parsed) {
        const { secretMessage, hint } = parsed;
        foundMatch = true;
        html += `
          <div class="scanner-status-box success" style="border-width:2px; margin-bottom:var(--space-sm);">
            <div style="display:flex; align-items:center; gap:var(--space-sm); margin-bottom:var(--space-sm);">
              <span style="color:var(--color-on-surface-variant); font-size:var(--fs-label-md);">#${i + 1}</span>
              <span style="color:var(--color-primary); font-size:var(--fs-body-md); font-weight:700;">✅ Match!</span>
            </div>
            <div style="color:var(--color-on-surface-variant); font-size:var(--fs-label-md); margin-bottom:var(--space-xs);">Cover text:</div>
            <div style="color:var(--color-on-surface); font-size:var(--fs-body-sm); font-family:monospace; margin-bottom:var(--space-md);">${escapeHtml(candidateCover)}</div>
            <div class="scanner-status-box success" style="text-align:center;">
              <div style="color:var(--color-on-surface-variant); font-size:var(--fs-label-md); margin-bottom:var(--space-xs);">💬 Extracted Message:</div>
              <div style="color:var(--color-primary); font-size:var(--fs-body-lg); font-weight:700;">${escapeHtml(secretMessage)}</div>
            </div>
            ${hint ? `
            <div class="scanner-status-box warning" style="margin-top:var(--space-md);">
              <span style="color:var(--color-on-surface-variant); font-size:var(--fs-label-md);">💡 Hint:</span>
              <span style="color:var(--color-on-surface); font-size:var(--fs-body-sm); margin-left:var(--space-xs);">${escapeHtml(hint)}</span>
            </div>` : ''}
          </div>`;
      } else {
        html += `
          <div class="scanner-status-box">
            <span style="color:var(--color-on-surface-variant); font-size:var(--fs-label-md);">#${i + 1}</span>
            <span style="color:var(--color-error); font-size:var(--fs-label-md); margin-right:var(--space-sm);">[Mismatch — Unreadable Text]</span>
          </div>`;
      }
    } catch {
      html += `
        <div class="scanner-status-box">
          <span style="color:var(--color-on-surface-variant); font-size:var(--fs-label-md);">#${i + 1}</span>
          <span style="color:var(--color-error); font-size:var(--fs-label-md); margin-right:var(--space-sm);">[Mismatch — Invalid UTF-8]</span>
        </div>`;
    }
  }

  html += '</div>';

  if (!foundMatch) {
    html += `
      <div class="scanner-status-box error" style="margin-top:var(--space-md);">
        <div style="color:var(--color-error); font-size:var(--fs-body-md); font-weight:600;">❌ No Match Found.</div>
        <div style="color:var(--color-on-surface-variant); font-size:var(--fs-label-md); margin-top:var(--space-xs);">We could not find the secret message using this key.</div>
      </div>`;
  }

  const container = document.getElementById('scannerTryResults');
  container.innerHTML = html;
  document.getElementById('scannerStep3Card').style.display = 'block';

  if (foundMatch) {
    showToast('success', 'Success', 'Secret message found!');
  } else {
    showToast('error', 'Error', 'No matching message found.');
  }
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
  const platformLabel = CHAT_PLATFORMS[platform]?.name || 'plain text';

  // Build HTML
  const container = document.getElementById('scannerFilteredList');
  let html = `<div style="color:var(--color-on-surface-variant); font-size:var(--fs-label-md); margin-bottom:var(--space-md);">📱 ${platformLabel} — ${messages.length} message(s)</div>`;
  html += '<div style="display:flex; flex-direction:column; gap:var(--space-sm);">';

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const senderLabel = msg.sender ? `<span style="color:var(--color-on-surface-variant); font-size:var(--fs-label-md); margin-right:4px;">${escapeHtml(msg.sender)}:</span> ` : '';
    html += `
      <div class="scanner-status-box success" style="margin-bottom:0;">
        <span style="color:var(--color-on-surface-variant); font-size:var(--fs-label-md);">#${i + 1}</span>
        ${senderLabel}
        <span style="color:var(--color-on-surface); font-size:var(--fs-body-sm); display:block; margin-top:var(--space-xs);">${escapeHtml(msg.message)}</span>
      </div>`;
  }

  html += '</div>';
  container.innerHTML = html;

  // Update count badge
  document.getElementById('scannerStep1Count').textContent = `(${messages.length} message)`;

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
  const cleanMessages = _scannerState.cleanMessages;
  const vsKey = _scannerState.vsKey;
  const carrierIndex = _scannerState.carrierIndex;

  const container = document.getElementById('scannerExtractedList');
  let html = '';

  // ── VS Key extraction result
  if (vsKey) {
    const hexDisplay = Array.from(vsKey).map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
    html += `
      <div class="scanner-status-box warning" style="margin-bottom:var(--space-md);">
        <div style="color:var(--color-on-surface-variant); font-size:var(--fs-label-md); margin-bottom:var(--space-xs);">🔑 Variation Selectors (VS) extracted from message #${carrierIndex + 1} (${vsKey.length} bytes)</div>
        <div style="color:var(--color-on-surface); font-size:0.75rem; font-family:monospace; word-break:break-all;">${hexDisplay}</div>
      </div>`;
  } else {
    html += `
      <div class="scanner-status-box error" style="margin-bottom:var(--space-md);">
        <div style="color:var(--color-error); font-size:var(--fs-body-md); font-weight:600;">❌ No hidden characters (VS) found.</div>
        <div style="color:var(--color-on-surface-variant); font-size:var(--fs-label-md); margin-top:var(--space-xs);">There are no hidden steganographic bytes in this chat.</div>
      </div>`;
  }

  // ── Clean messages (each separated, showing VS presence)
  html += '<div style="color:var(--color-on-surface-variant); font-size:var(--fs-label-md); margin-bottom:var(--space-sm);">📄 Clean messages (VS removed):</div>';
  html += '<div style="display:flex; flex-direction:column; gap:var(--space-sm);">';

  for (let i = 0; i < cleanMessages.length; i++) {
    const isCarrier = (i === carrierIndex);
    const boxClass = isCarrier ? 'scanner-status-box warning' : 'scanner-status-box success';
    const tag = isCarrier
      ? '<span style="color:#FDE047; font-size:var(--fs-label-md); margin-left:var(--space-sm);">[Carrier — VS extracted]</span>'
      : '';

    html += `
      <div class="${boxClass}" style="margin-bottom:0;">
        <span style="color:var(--color-on-surface-variant); font-size:var(--fs-label-md);">#${i + 1}</span>${tag}
        <span style="color:var(--color-on-surface); font-size:var(--fs-body-sm); display:block; margin-top:var(--space-xs);">${escapeHtml(cleanMessages[i])}</span>
      </div>`;
  }

  html += '</div>';
  container.innerHTML = html;

  // Update count badge
  const countText = vsKey
    ? `(${vsKey.length} VS bytes)`
    : '(None / No VS)';
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
 * Implements a strict noise filter for short strings to prevent false positives.
 */
function isPrintableText(text) {
  if (!text || text.length === 0) return false;

  let printableCount = 0;
  let hasLetterOrDigitOrEmoji = false;
  let hasSuspiciousChar = false;

  const chars = [...text];
  for (const char of chars) {
    const code = char.codePointAt(0);
    
    const isPrintable = (
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
    );

    if (isPrintable) {
      printableCount++;
    }

    // Check if it's a letter, digit, or emoji
    if (
      /[\p{L}\p{N}]/u.test(char) ||
      (code >= 0x1F300 && code <= 0x1FAFF)
    ) {
      hasLetterOrDigitOrEmoji = true;
    }

    // Check for suspicious characters in short strings
    if (
      code === 0x7B || code === 0x7D || // { }
      code === 0x5B || code === 0x5D || // [ ]
      code === 0x5C || code === 0x7C || // \ |
      code === 0x5E || code === 0x7E || // ^ ~
      code === 0x60 ||                  // `
      code === 0x7F                     // DEL
    ) {
      hasSuspiciousChar = true;
    }
  }

  const totalLen = chars.length;
  const ratio = printableCount / totalLen;

  if (totalLen <= 8) {
    // Short message must be 100% printable, contain at least one letter/digit/emoji, and have no suspicious characters
    return ratio === 1.0 && hasLetterOrDigitOrEmoji && !hasSuspiciousChar;
  }

  // Longer messages need to be at least 80% printable
  return ratio >= 0.8;
}


/**
 * Escape HTML special characters to prevent XSS.
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
