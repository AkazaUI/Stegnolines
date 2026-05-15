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
  if (!rawText.trim()) return showToast('⚠ الرجاء لصق المحادثة أولاً.');

  _resetScannerResults();

  // ── Step 1: Filter ──
  _updateProgress(1, '① جاري فلترة الرسائل…', 15);
  await _delay(100);

  if (!_runFilterStep(rawText)) return _hideProgress();

  _updateProgress(1, '① تمت الفلترة ✓', 33);
  await _delay(150);

  // ── Step 2: Extract VS ──
  _updateProgress(2, '② جاري استخراج أحرف VS…', 50);
  await _delay(100);

  _runExtractStep();

  if (!_scannerState.vsKey) {
    _hideProgress();
    _showStep2Results(true);
    return showToast('❌ لا يوجد مفتاح مخفي في المحادثة.');
  }

  _updateProgress(2, '② تم استخراج VS ✓', 66);
  await _delay(150);

  // ── Step 3: Try password ──
  _updateProgress(3, '③ جاري تجربة المفتاح…', 80);
  await _delay(100);

  await _runTryStep();

  _updateProgress(3, '✅ اكتمل الفحص', 100);
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
  if (!rawText.trim()) return showToast('⚠ الرجاء لصق المحادثة أولاً.');

  _resetScannerResults();

  // ── Step 1: Filter ──
  if (!_runFilterStep(rawText)) return;
  _showStep1Results(true);

  // ── Step 2: Extract VS ──
  _runExtractStep();
  _showStep2Results(true);

  if (_scannerState.vsKey) {
    showToast(`✅ تم فلترة ${_scannerState.messages.length} رسالة + استخراج مفتاح VS (${_scannerState.vsKey.length} بايت).`);
  } else {
    showToast(`✅ تم فلترة ${_scannerState.messages.length} رسالة — لا يوجد أحرف VS مخفية.`);
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
    showToast('⚠ لم يتم العثور على أي رسائل.');
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
 */
async function _runTryStep() {
  const vsKey = _scannerState.vsKey;
  const cleanMessages = _scannerState.cleanMessages;
  const carrierIndex = _scannerState.carrierIndex;
  const password = document.getElementById('scannerPassword').value;

  if (!vsKey) return;

  const xorKeyBinary = bytesToBinary(vsKey);
  let foundMatch = false;
  let html = '<div class="space-y-2">';

  for (let i = 0; i < cleanMessages.length; i++) {
    // Skip carrier message itself
    if (i === carrierIndex) {
      html += `
        <div class="p-2 rounded border border-brand-400/10 text-sm" style="background:rgba(255,255,255,0.02);">
          <span class="text-brand-400/30 text-xs">#${i + 1}</span>
          <span class="text-brand-400/30 text-xs mr-2">[تخطي — الحامل]</span>
        </div>`;
      continue;
    }

    const candidateCover = cleanMessages[i];
    const coverBits = stringToBinary(candidateCover);

    // Check if cover is long enough
    if (xorKeyBinary.length > coverBits.length) {
      html += `
        <div class="p-2 rounded border border-brand-400/10 text-sm" style="background:rgba(255,255,255,0.02);">
          <span class="text-brand-400/30 text-xs">#${i + 1}</span>
          <span class="text-red-400/40 text-xs mr-2">[قصيرة جداً — ${coverBits.length} بت < ${xorKeyBinary.length} بت]</span>
        </div>`;
      continue;
    }

    try {
      const { resolvedStegoKey } = await resolveStegoKey(password, candidateCover);
      const positions = generatePositions(coverBits.length, xorKeyBinary.length, resolvedStegoKey);
      const recoveredBinary = recoverPayloadBits(coverBits, positions, xorKeyBinary);
      const payloadBytes = binaryToBytes(recoveredBinary);

      const strictDecoder = new TextDecoder('utf-8', { fatal: true });
      const decoded = strictDecoder.decode(payloadBytes);

      if (decoded.length > 0 && isPrintableText(decoded)) {
        const { secretMessage, hint } = parsePayload(payloadBytes);

        foundMatch = true;
        html += `
          <div class="p-3 rounded-lg border-2 border-brand-400/40" style="background:rgba(0,255,65,0.06);">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-brand-400/30 text-xs">#${i + 1}</span>
              <span class="text-brand-400 text-sm font-bold">✅ تطابق!</span>
            </div>
            <div class="text-xs text-brand-400/50 mb-1">الغلاف:</div>
            <div class="text-sm text-brand-400/70 mb-2 font-mono">${escapeHtml(candidateCover)}</div>
            <div class="p-3 rounded border border-brand-400/25 text-center" style="background:rgba(0,255,65,0.08);">
              <div class="text-xs text-brand-400/50 mb-1">💬 الرسالة السرية:</div>
              <div class="text-lg font-bold text-brand-400">${escapeHtml(secretMessage)}</div>
            </div>
            ${hint ? `
            <div class="p-2 rounded border border-yellow-400/20 mt-2" style="background:rgba(234,179,8,0.05);">
              <span class="text-xs text-yellow-400/60">💡 تلميح:</span>
              <span class="text-sm text-yellow-300 mr-1">${escapeHtml(hint)}</span>
            </div>` : ''}
          </div>`;
      } else {
        html += `
          <div class="p-2 rounded border border-brand-400/10 text-sm" style="background:rgba(255,255,255,0.02);">
            <span class="text-brand-400/30 text-xs">#${i + 1}</span>
            <span class="text-red-400/40 text-xs mr-2">[لا تطابق — نص غير مقروء]</span>
          </div>`;
      }
    } catch {
      html += `
        <div class="p-2 rounded border border-brand-400/10 text-sm" style="background:rgba(255,255,255,0.02);">
          <span class="text-brand-400/30 text-xs">#${i + 1}</span>
          <span class="text-red-400/40 text-xs mr-2">[لا تطابق — UTF-8 غير صالح]</span>
        </div>`;
    }
  }

  html += '</div>';

  if (!foundMatch) {
    html += `
      <div class="p-3 rounded-lg border border-red-400/20 mt-4" style="background:rgba(239,68,68,0.05);">
        <div class="text-sm text-red-400/80">❌ لم يتم العثور على تطابق.</div>
        <div class="text-xs text-red-400/50 mt-1">تأكد من كلمة المرور ومن أن المحادثة تحتوي الغلاف الأصلي.</div>
      </div>`;
  }

  const container = document.getElementById('scannerTryResults');
  container.innerHTML = html;
  document.getElementById('scannerStep3Card').style.display = 'block';

  if (foundMatch) {
    showToast('✅ تم العثور على رسالة مخفية!');
  } else {
    showToast('❌ لم يتم العثور على تطابق.');
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
  const platformLabel = CHAT_PLATFORMS[platform]?.name || 'نص عادي';

  // Build HTML
  const container = document.getElementById('scannerFilteredList');
  let html = `<div class="text-xs text-brand-400/40 mb-3">📱 ${platformLabel} — ${messages.length} رسالة</div>`;
  html += '<div class="space-y-2">';

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const senderLabel = msg.sender ? `<span class="text-brand-400/50 text-xs">${escapeHtml(msg.sender)}:</span> ` : '';
    html += `
      <div class="p-2 rounded border border-brand-400/10 text-sm" style="background:rgba(0,255,65,0.02);">
        <span class="text-brand-400/30 text-xs">#${i + 1}</span>
        ${senderLabel}
        <span class="text-brand-400/70">${escapeHtml(msg.message)}</span>
      </div>`;
  }

  html += '</div>';
  container.innerHTML = html;

  // Update count badge
  document.getElementById('scannerStep1Count').textContent = `(${messages.length} رسالة)`;

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
      <div class="p-3 rounded-lg border border-yellow-400/20 mb-4" style="background:rgba(234,179,8,0.05);">
        <div class="text-xs text-yellow-400/70 mb-1">🔑 مفتاح VS مستخرج من الرسالة #${carrierIndex + 1} (${vsKey.length} بايت)</div>
        <div class="text-xs text-yellow-300/60 font-mono break-all">${hexDisplay}</div>
      </div>`;
  } else {
    html += `
      <div class="p-3 rounded-lg border border-red-400/20 mb-4" style="background:rgba(239,68,68,0.05);">
        <div class="text-sm text-red-400/80">❌ لا يوجد أحرف مخفية (VS) في أي رسالة.</div>
        <div class="text-xs text-red-400/50 mt-1">تأكد من لصق المحادثة كاملة بما فيها الرسالة التي تحمل المفتاح المخفي.</div>
      </div>`;
  }

  // ── Clean messages (each separated, showing VS presence)
  html += '<div class="text-xs text-brand-400/40 mb-2">📄 الرسائل المفصولة (بدون أحرف مخفية):</div>';
  html += '<div class="space-y-2">';

  for (let i = 0; i < cleanMessages.length; i++) {
    const isCarrier = (i === carrierIndex);
    const borderColor = isCarrier ? 'border-yellow-400/30' : 'border-brand-400/10';
    const bgColor = isCarrier ? 'rgba(234,179,8,0.03)' : 'rgba(0,255,65,0.02)';
    const tag = isCarrier
      ? '<span class="text-yellow-400/60 text-xs ml-2">[الحامل — VS مستخرج]</span>'
      : '';

    html += `
      <div class="p-2 rounded border ${borderColor} text-sm" style="background:${bgColor};">
        <span class="text-brand-400/30 text-xs">#${i + 1}</span>${tag}
        <span class="text-brand-400/70 block mt-1">${escapeHtml(cleanMessages[i])}</span>
      </div>`;
  }

  html += '</div>';
  container.innerHTML = html;

  // Update count badge
  const countText = vsKey
    ? `(${vsKey.length} VS بايت)`
    : '(لا يوجد VS)';
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
