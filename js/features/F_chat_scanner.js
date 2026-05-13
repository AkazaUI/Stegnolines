// ══════════════════════════════════════════════════════════════
// Feature: Chat Scanner — Bulk Message Extraction
// ══════════════════════════════════════════════════════════════
//
// Scans a pasted chat conversation to find hidden steganographic
// messages. Three clear visual steps:
//
//   Step 1: Filter — parse chat, remove names/dates
//   Step 2: Extract — find VS bytes + separate clean messages
//   Step 3: Try — brute-match password+key against each message
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
// STEP 1: FILTER — Parse and clean pasted chat
// ══════════════════════════════════════════════════════════════

/**
 * Step 1: Parse raw chat text, filter metadata (names, timestamps),
 * and display individual messages.
 */
function scannerStep1_Filter() {
  const rawText = document.getElementById('scannerChatInput').value;
  if (!rawText.trim()) return showToast('⚠ الرجاء لصق المحادثة أولاً.');

  const platformSelect = document.getElementById('scannerPlatform');
  const selectedPlatform = platformSelect ? platformSelect.value : 'auto';

  // Detect or use selected platform
  const platform = (selectedPlatform === 'auto')
    ? detectPlatform(rawText)
    : selectedPlatform;

  // Parse into individual messages
  const messages = parseChat(rawText, platform);

  if (messages.length === 0) {
    return showToast('⚠ لم يتم العثور على أي رسائل.');
  }

  // Save state
  _scannerState.messages = messages;
  _scannerState.platform = platform;

  // Display filtered messages
  const container = document.getElementById('scannerFilteredList');
  const platformLabel = CHAT_PLATFORMS[platform]?.name || 'نص عادي';

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

  // Show Step 1 result card + Step 2 button
  document.getElementById('scannerStep1Card').style.display = 'block';
  document.getElementById('scannerStep2Btn').style.display = 'block';

  // Reset steps 2 & 3 results
  document.getElementById('scannerStep2Card').style.display = 'none';
  document.getElementById('scannerStep3Btn').style.display = 'none';
  document.getElementById('scannerStep3Card').style.display = 'none';

  showToast(`✅ تم فلترة ${messages.length} رسالة.`);
}


// ══════════════════════════════════════════════════════════════
// STEP 2: EXTRACT — Find VS key + separate clean messages
// ══════════════════════════════════════════════════════════════

/**
 * Step 2: Scan all filtered messages for VS characters.
 * Extract VS key separately and display clean messages.
 */
function scannerStep2_Extract() {
  const messages = _scannerState.messages;
  if (messages.length === 0) return showToast('⚠ قم بالخطوة 1 أولاً.');

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

  // Save state
  _scannerState.cleanMessages = cleanMessages;
  _scannerState.vsKey = vsKey;
  _scannerState.carrierIndex = carrierIndex;

  // Build display
  const container = document.getElementById('scannerExtractedList');
  let html = '';

  // ── 2a: VS Key extraction result
  if (vsKey) {
    html += `
      <div class="p-3 rounded-lg border border-yellow-400/20 mb-4" style="background:rgba(234,179,8,0.05);">
        <div class="text-xs text-yellow-400/70 mb-1">🔑 مفتاح VS مستخرج من الرسالة #${carrierIndex + 1} (${vsKey.length} بايت)</div>
        <div class="text-xs text-yellow-300/60 font-mono break-all">${Array.from(vsKey).map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(' ')}</div>
      </div>`;
  } else {
    html += `
      <div class="p-3 rounded-lg border border-red-400/20 mb-4" style="background:rgba(239,68,68,0.05);">
        <div class="text-sm text-red-400/80">❌ لا يوجد أحرف مخفية (VS) في أي رسالة.</div>
        <div class="text-xs text-red-400/50 mt-1">تأكد من لصق المحادثة كاملة بما فيها الرسالة التي تحمل المفتاح المخفي.</div>
      </div>`;
  }

  // ── 2b: Clean messages (each separated)
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

  // Show Step 2 result + Step 3 button (only if VS key found)
  document.getElementById('scannerStep2Card').style.display = 'block';
  if (vsKey) {
    document.getElementById('scannerStep3Btn').style.display = 'block';
  }
  // Reset Step 3 results
  document.getElementById('scannerStep3Card').style.display = 'none';

  if (vsKey) {
    showToast(`✅ تم استخراج مفتاح VS (${vsKey.length} بايت) + ${cleanMessages.length} رسالة مفصولة.`);
  } else {
    showToast('❌ لا يوجد مفتاح مخفي في المحادثة.');
  }
}


// ══════════════════════════════════════════════════════════════
// STEP 3: TRY — Brute-match password + key against each message
// ══════════════════════════════════════════════════════════════

/**
 * Step 3: Try the entered password with the extracted VS key
 * against each clean message individually.
 */
async function scannerStep3_Try() {
  const vsKey = _scannerState.vsKey;
  const cleanMessages = _scannerState.cleanMessages;
  const carrierIndex = _scannerState.carrierIndex;
  const password = document.getElementById('scannerPassword').value;

  if (!vsKey) return showToast('⚠ لا يوجد مفتاح VS — قم بالخطوة 2 أولاً.');

  const container = document.getElementById('scannerTryResults');
  container.innerHTML = '<p class="text-brand-400/50 text-center py-4">⏳ جاري تجربة المفتاح على كل رسالة...</p>';
  document.getElementById('scannerStep3Card').style.display = 'block';

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
      // Resolve stego-key
      const { resolvedStegoKey } = await resolveStegoKey(password, candidateCover);

      // Generate PRNG positions
      const positions = generatePositions(coverBits.length, xorKeyBinary.length, resolvedStegoKey);

      // Recover payload bits
      const recoveredBinary = recoverPayloadBits(coverBits, positions, xorKeyBinary);
      const payloadBytes = binaryToBytes(recoveredBinary);

      // Strict UTF-8 validation
      const strictDecoder = new TextDecoder('utf-8', { fatal: true });
      const decoded = strictDecoder.decode(payloadBytes);

      // Extra check: is it printable text?
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

  container.innerHTML = html;

  if (foundMatch) {
    showToast('✅ تم العثور على رسالة مخفية!');
  } else {
    showToast('❌ لم يتم العثور على تطابق.');
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
      (code >= 0x20 && code <= 0x7E)   ||  // ASCII printable
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
