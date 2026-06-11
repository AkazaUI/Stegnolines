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
  carriers: [],        // [{ index: number, vsKey: Uint8Array }] — extracted carriers
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
  if (bar) {
    if (bar.style.display === 'none' || !bar.style.display) {
      bar.style.display = 'flex';
      setTimeout(() => {
        bar.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  }

  const labelEl = document.getElementById('scannerProgressLabel');
  if (labelEl) labelEl.textContent = label;

  const subtitleEl = document.getElementById('scannerProgressSubLabel');
  if (subtitleEl) {
    const currentLang = localStorage.getItem('stegoLang') || 'en';
    if (step === 1) {
      subtitleEl.textContent = currentLang === 'ar' ? 'جاري تصفية واستخراج نصوص المحادثة...' : 'Analyzing and filtering chat messages...';
    } else if (step === 2) {
      subtitleEl.textContent = currentLang === 'ar' ? 'جاري استخراج أحرف الـ Variation Selectors المخفية...' : 'Searching for and extracting hidden Variation Selectors...';
    } else if (step === 3) {
      subtitleEl.textContent = currentLang === 'ar' ? 'جاري تجربة فك التشفير ومطابقة خرائط الغلاف والمفاتيح...' : 'Testing key combinations and resolving decryption maps...';
    }
  }

  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById('progStep' + i);
    if (el) {
      el.classList.remove('active', 'done');
      const icon = el.querySelector('.step-status-icon');
      if (i < step) {
        el.classList.add('done');
        if (icon) {
          icon.textContent = 'check_circle';
          icon.style.fontVariationSettings = "'FILL' 1";
          icon.style.animation = 'none';
        }
      } else if (i === step) {
        el.classList.add('active');
        if (icon) {
          icon.textContent = 'sync';
          icon.style.fontVariationSettings = "'FILL' 0";
          icon.style.animation = 'spinClockwise 1.5s linear infinite';
        }
      } else {
        if (icon) {
          icon.textContent = 'circle';
          icon.style.fontVariationSettings = "'FILL' 0";
          icon.style.animation = 'none';
        }
      }
    }
  }
}


/**
 * Hide the progress bar with a smooth fade-out animation.
 */
async function _hideProgress() {
  const bar = document.getElementById('scannerProgressBar');
  if (!bar || bar.style.display === 'none') return;
  
  bar.classList.add('hiding');
  await _delay(400); // Wait for the 400ms fadeOut keyframes to complete
  
  bar.style.display = 'none';
  bar.classList.remove('hiding');
}


/**
 * Reset all scanner result cards.
 */
function _resetScannerResults() {
  document.getElementById('scannerStep1Card').style.display = 'none';
  document.getElementById('scannerStep2Card').style.display = 'none';
  document.getElementById('scannerStep3Card').style.display = 'none';
  const timeEl = document.getElementById('scannerTimeTaken');
  if (timeEl) timeEl.style.display = 'none';
}

/**
 * Display the scanner execution duration badge.
 * @param {number} durationMs - Execution time in milliseconds.
 */
function _displayScannerTime(durationMs) {
  const timeEl = document.getElementById('scannerTimeTaken');
  const timeVal = document.getElementById('scannerTimeVal');
  if (timeEl && timeVal) {
    const currentLang = localStorage.getItem('stegoLang') || 'en';
    timeVal.setAttribute('data-duration', durationMs);
    timeVal.textContent = currentLang === 'ar'
      ? `${durationMs.toFixed(1)} ملي ثانية`
      : `${durationMs.toFixed(1)} ms`;
    timeEl.style.display = 'flex';
  }
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

  let totalDurationMs = 0;

  // ── Step 1: Filter ──
  _updateProgress(1, '① Filtering messages...', 15);
  await _delay(100);

  const t1 = performance.now();
  const filterSuccess = _runFilterStep(rawText);
  totalDurationMs += (performance.now() - t1);

  if (!filterSuccess) {
    await _hideProgress();
    return;
  }

  _updateProgress(1, '① Filter completed ✓', 33);
  await _delay(150);

  // ── Step 2: Extract VS ──
  _updateProgress(2, '② Extracting VS characters...', 50);
  await _delay(100);

  const t2 = performance.now();
  _runExtractStep();
  totalDurationMs += (performance.now() - t2);

  if (_scannerState.carriers.length === 0) {
    await _hideProgress();
    _showStep2Results(true);
    _displayScannerTime(totalDurationMs);
    return showToast('❌ No hidden key in the chat.');
  }

  _updateProgress(2, '② VS extracted successfully ✓', 66);
  await _delay(150);

  // ── Step 3: Try password ──
  _updateProgress(3, '③ Testing candidate covers...', 80);
  await _delay(100);

  const t3 = performance.now();
  try {
    await _runTryStep();
  } catch (e) {
    console.error('[Scanner] _runTryStep crashed:', e);
    showToast('❌ Scanner Step 3 error: ' + (e.message || e));
  }
  totalDurationMs += (performance.now() - t3);

  _updateProgress(3, '✅ Scan completed', 100);
  await _delay(500);
  await _hideProgress();

  // Show all result cards (collapsed by default, Step 3 expanded)
  _showStep1Results(false);
  _showStep2Results(false);

  _displayScannerTime(totalDurationMs);
}


/**
 * Verify Filter mode: runs Filter + Extract, then shows results
 * expanded so the user can verify correctness and see VS characters.
 */
async function scannerVerifyFilter() {
  const rawText = document.getElementById('scannerChatInput').value;
  if (!rawText.trim()) return showToast('⚠ Please paste the chat first.');

  _resetScannerResults();

  let totalDurationMs = 0;

  // ── Step 1: Filter ──
  const t1 = performance.now();
  const filterSuccess = _runFilterStep(rawText);
  totalDurationMs += (performance.now() - t1);

  if (!filterSuccess) return;
  _showStep1Results(true);

  // ── Step 2: Extract VS ──
  const t2 = performance.now();
  _runExtractStep();
  totalDurationMs += (performance.now() - t2);

  _showStep2Results(true);

  _displayScannerTime(totalDurationMs);

  if (_scannerState.carriers.length > 0) {
    showToast(`✅ Filtered ${_scannerState.messages.length} messages + extracted ${_scannerState.carriers.length} VS keys.`);
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
  const carriers = [];

  for (let i = 0; i < messages.length; i++) {
    const { vsBytes, cleanText } = extractVSFromText(messages[i].message);
    cleanMessages.push(cleanText);

    if (vsBytes.length > 0) {
      carriers.push({
        index: i,
        vsKey: vsBytes
      });
    }
  }

  _scannerState.cleanMessages = cleanMessages;
  _scannerState.carriers = carriers;
}


/**
 * Step 3 (internal): Try the password against all clean messages.
 *
 * For each non-carrier message, attempts to reverse the XOR using
 * the VS key extracted from the carrier. If the result is valid
 * UTF-8 printable text, it's a match.
 */
async function _runTryStep() {
  const carriers = _scannerState.carriers;
  const cleanMessages = _scannerState.cleanMessages;

  // Gather all stego keys and filter unique
  const stegoInputs = Array.from(document.querySelectorAll('.scanner-stego-key-input'));
  const stegoKeys = Array.from(new Set(stegoInputs.map(inp => inp.value.trim())));

  // Gather all AES encryption keys and filter unique
  const aesInputs = Array.from(document.querySelectorAll('.scanner-aes-key-input'));
  const aesKeys = Array.from(new Set(aesInputs.map(inp => inp.value.trim())));

  // Ensure there is at least one blank AES key tested (for unencrypted CTR messages)
  if (!aesKeys.includes("")) {
    aesKeys.push("");
  }

  if (carriers.length === 0) return;

  const currentLang = localStorage.getItem('stegoLang') || 'en';
  let totalMatchesCount = 0;
  const carrierResults = [];

  for (let c = 0; c < carriers.length; c++) {
    const carrier = carriers[c];
    const carrierIndex = carrier.index;
    const vsKey = carrier.vsKey;
    const xorKeyBinary = bytesToBinary(vsKey);

    const matches = [];

    // 1. Try the carrier's own clean text first (fallback or normal embedding)
    const carrierCleanText = cleanMessages[carrierIndex];
    let carrierMatched = false;

    for (const stKey of stegoKeys) {
      for (const aesKey of aesKeys) {
        const carrierResult = await _tryOneCover(carrierCleanText, xorKeyBinary, stKey, aesKey);
        if (carrierResult.match) {
          matches.push({
            index: carrierIndex + 1,
            coverText: carrierCleanText,
            secretMessage: carrierResult.secretMessage,
            hint: carrierResult.hint,
            type: 'carrier_fallback',
            usedStegoKey: stKey
          });
          carrierMatched = true;
          break;
        }
      }
      if (carrierMatched) break;
    }

    // 2. Try other clean messages in the chat if carrier fallback didn't match
    if (!carrierMatched) {
      for (let i = 0; i < cleanMessages.length; i++) {
        if (i === carrierIndex) continue;

        const candidateCover = cleanMessages[i];
        let foundMatchForCover = false;

        for (const stKey of stegoKeys) {
          for (const aesKey of aesKeys) {
             const result = await _tryOneCover(candidateCover, xorKeyBinary, stKey, aesKey);
            if (result.match) {
              const isDuplicate = matches.some(m => m.secretMessage === result.secretMessage);
              if (!isDuplicate) {
                matches.push({
                  index: i + 1,
                  coverText: candidateCover,
                  secretMessage: result.secretMessage,
                  hint: result.hint,
                  type: 'normal',
                  usedStegoKey: stKey
                });
              }
              foundMatchForCover = true;
              break;
            }
          }
          if (foundMatchForCover) break;
        }
      }
    }

    carrierResults.push({
      carrierIndex,
      vsKeyLength: vsKey.length,
      matches
    });
    totalMatchesCount += matches.length;
  }

  // Build Premium Dashboard Summary Layout
  let html = `<div class="scanner-results-container" style="display: flex; flex-direction: column; gap: var(--space-lg); width: 100%;">`;

  // 1. Metrics Grid
  const labelCarriers = currentLang === 'ar' ? 'الناقلات المكتشفة' : 'Carriers Detected';
  const labelDecrypted = currentLang === 'ar' ? 'الرسائل المستخرجة' : 'Decrypted Secrets';
  const labelCombos = currentLang === 'ar' ? 'الاحتمالات المجربة' : 'Key Combos Tested';

  html += `
    <div class="scanner-dashboard-summary">
      <div class="summary-metric-card">
        <span class="metric-icon">🔑</span>
        <div class="metric-info">
          <span class="metric-value">${carriers.length}</span>
          <span class="metric-label">${labelCarriers}</span>
        </div>
      </div>
      <div class="summary-metric-card ${totalMatchesCount > 0 ? 'success' : 'warning'}">
        <span class="metric-icon">${totalMatchesCount > 0 ? '🔓' : '🔒'}</span>
        <div class="metric-info">
          <span class="metric-value">${totalMatchesCount}</span>
          <span class="metric-label">${labelDecrypted}</span>
        </div>
      </div>
      <div class="summary-metric-card">
        <span class="metric-icon">⚙️</span>
        <div class="metric-info">
          <span class="metric-value">${stegoKeys.length * aesKeys.length}</span>
          <span class="metric-label">${labelCombos}</span>
        </div>
      </div>
    </div>
  `;

  const matchedCarriers = carrierResults.filter(r => r.matches.length > 0);
  const unmatchedCarriers = carrierResults.filter(r => r.matches.length === 0);

  // 2. Results List
  if (totalMatchesCount > 0) {
    html += `<div style="display: flex; flex-direction: column; gap: var(--space-md); width: 100%;">`;
    for (const cr of matchedCarriers) {
      const headerTitle = currentLang === 'ar' ? `رسالة الناقلة رقم #${cr.carrierIndex + 1}` : `Carrier Message #${cr.carrierIndex + 1}`;
      const badgeText = currentLang === 'ar' ? `${cr.vsKeyLength} بايت` : `${cr.vsKeyLength} bytes VS`;

      html += `
        <div class="scanner-carrier-group">
          <div class="scanner-carrier-header">
            <div class="scanner-carrier-header-title">
              <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 20px;">lock_open</span>
              <span>${headerTitle}</span>
            </div>
            <span class="badge badge--success text-label-md">${badgeText}</span>
          </div>
          <div class="scanner-carrier-body">
      `;
      for (const m of cr.matches) {
        html += _buildMatchHTML(m.index, m.coverText, m.secretMessage, m.hint, m.type, m.usedStegoKey);
      }
      html += `
          </div>
        </div>`;
    }
    html += `</div>`;

    // Compact list of unmatched carriers if any
    if (unmatchedCarriers.length > 0) {
      const toggleTitle = currentLang === 'ar' ? `ناقلات لم يتم فكها (${unmatchedCarriers.length})` : `Unresolved Carriers (${unmatchedCarriers.length})`;
      const unresolvedLabel = currentLang === 'ar' ? 'لا يوجد مطابقة' : 'No Match';

      html += `
        <div class="scanner-unmatched-section">
          <div class="scanner-unmatched-toggle" onclick="document.getElementById('scannerUnmatchedList').classList.toggle('open'); this.classList.toggle('active');" style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-sm) var(--space-md); background: var(--color-surface-container-low); border: 1px solid var(--color-outline-variant); border-radius: var(--radius-lg); cursor: pointer; font-size: var(--fs-body-sm); color: var(--color-on-surface-variant); font-weight: 500;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="material-symbols-outlined" style="font-size: 18px;">help_center</span>
              <span>${toggleTitle}</span>
            </div>
            <span class="material-symbols-outlined unmatched-chevron" style="font-size: 18px;">expand_more</span>
          </div>
          <div id="scannerUnmatchedList" class="scanner-unmatched-list" style="flex-direction: column; gap: var(--space-xs); margin-top: var(--space-xs); padding-left: 2px;">
      `;
      for (const u of unmatchedCarriers) {
        const uLabel = currentLang === 'ar' ? `رسالة الناقلة (#${u.carrierIndex + 1} — تحتوي ${u.vsKeyLength} رموز)` : `Carrier Message (#${u.carrierIndex + 1} — contains ${u.vsKeyLength} VS)`;
        html += `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-sm) var(--space-md); background: var(--color-surface-container-lowest); border: 1px solid var(--color-outline-variant); border-radius: var(--radius-md); font-size: var(--fs-body-sm); color: var(--color-on-surface-variant);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: bold; background: var(--color-surface-container-high); color: var(--color-on-surface); padding: 1px 6px; border-radius: 4px; font-family: monospace; font-size: 11px;">#${u.carrierIndex + 1}</span>
              <span>${uLabel}</span>
            </div>
            <span style="color: var(--color-error); font-size: 11px; font-weight: 600; text-transform: uppercase;">${unresolvedLabel}</span>
          </div>`;
      }
      html += `
          </div>
        </div>`;
    }
  } else {
    // Zero matches found
    const emptyTitle = currentLang === 'ar' ? 'لم يتم فك أي رسائل مخفية' : 'No Hidden Messages Decrypted';
    const emptyDesc = currentLang === 'ar'
      ? `تم اكتشاف ${carriers.length} رسالة تحتوي على رموز مخفية، ولكن لم نتمكن من استرجاع أي محتوى سري. تم تجربة ${stegoKeys.length} مفتاح Stego و ${aesKeys.length} مفتاح تشفير AES.`
      : `We found ${carriers.length} message(s) containing Variation Selectors, but could not decrypt any hidden content. Tested ${stegoKeys.length} Stego-Key(s) and ${aesKeys.length} AES decryption key(s).`;
    const tipsTitle = currentLang === 'ar' ? 'نصائح لاستكشاف الأخطاء وإصلاحها:' : 'Troubleshooting Tips:';
    const tip1 = currentLang === 'ar' ? 'تأكد من نسخ المحادثة بالكامل بما في ذلك رسالة الناقل ورسائل الغلاف.' : 'Verify you have pasted the complete chat log, including the carrier and corresponding covers.';
    const tip2 = currentLang === 'ar' ? 'تحقق من صحة كتابة مفتاح Stego ومفتاح تشفير AES.' : 'Double-check the Stego-Key and AES key spelling.';
    const tip3 = currentLang === 'ar' ? 'تأكد من تحديد المنصة الصحيحة للمحادثة أو الكشف التلقائي.' : 'Ensure the correct platform was selected or auto-detected.';

    html += `
      <div class="scanner-empty-state-card" style="margin-bottom: var(--space-md);">
        <span class="material-symbols-outlined empty-state-icon">lock</span>
        <h3 class="empty-state-title">${emptyTitle}</h3>
        <p class="empty-state-desc">${emptyDesc}</p>
        <div style="margin-top: var(--space-md); padding: var(--space-md); background: rgba(0, 0, 0, 0.02); border-radius: var(--radius-md); border: 1px solid var(--color-outline-variant); text-align: left; width: 100%;">
          <div style="font-weight: 600; font-size: var(--fs-body-sm); margin-bottom: var(--space-sm); display: flex; align-items: center; gap: 6px;">
            <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-primary);">info</span>
            <span>${tipsTitle}</span>
          </div>
          <ul style="font-size: var(--fs-body-sm); color: var(--color-on-surface-variant); padding-left: var(--space-md); margin: 0; display: flex; flex-direction: column; gap: 4px; line-height: 1.4;">
            <li>${tip1}</li>
            <li>${tip2}</li>
            <li>${tip3}</li>
          </ul>
        </div>
      </div>
    `;

    // Compact list of carriers detected
    const listHeader = currentLang === 'ar' ? `الناقلات المكتشفة (${carriers.length}):` : `Detected Carriers (${carriers.length}):`;
    const noMatchLabel = currentLang === 'ar' ? 'بلا مطابقة' : 'No Match';

    html += `
      <div style="display: flex; flex-direction: column; gap: var(--space-xs); width: 100%;">
        <div style="font-weight: 600; font-size: var(--fs-body-sm); color: var(--color-on-surface-variant); margin-bottom: var(--space-xs);">
          ${listHeader}
        </div>
    `;
    for (const u of unmatchedCarriers) {
      const uLabel = currentLang === 'ar' ? `رسالة ناقل تحتوي على ${u.vsKeyLength} بايت من البيانات المخفية` : `Carrier Message containing ${u.vsKeyLength} bytes of hidden data`;
      html += `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-md); background: var(--color-surface-container-low); border: 1px solid var(--color-outline-variant); border-radius: var(--radius-lg); font-size: var(--fs-body-sm); color: var(--color-on-surface-variant); width: 100%;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: bold; background: var(--color-surface-container-high); color: var(--color-on-surface); padding: 2px 8px; border-radius: 4px; font-family: monospace; font-size: 11px;">#${u.carrierIndex + 1}</span>
            <span>${uLabel}</span>
          </div>
          <span class="badge badge--danger text-label-sm" style="font-family: var(--font-label);">${noMatchLabel}</span>
        </div>`;
    }
    html += `</div>`;
  }

  html += `</div>`;

  // Inject trial summary status into Step 3 trigger count element
  const countSpan = document.getElementById('scannerStep3Count');
  if (countSpan) {
    countSpan.replaceChildren();
    const badge = document.createElement('span');
    if (totalMatchesCount > 0) {
      badge.className = 'badge badge--encrypted text-label-md';
      badge.style.marginLeft = '8px';
      badge.textContent = currentLang === 'ar' ? `تم الفك! (${totalMatchesCount}/${carriers.length})` : `Decrypted! (${totalMatchesCount}/${carriers.length})`;
    } else {
      badge.className = 'badge badge--danger text-label-md';
      badge.style.marginLeft = '8px';
      badge.textContent = currentLang === 'ar' ? 'بلا مطابقة' : 'No Match';
    }
    countSpan.appendChild(badge);
  }

  const container = document.getElementById('scannerTryResults');
  container.innerHTML = html; // SECURITY: All dynamic values are escaped via escapeHtml()
  document.getElementById('scannerStep3Card').style.display = 'block';

  if (totalMatchesCount > 0) {
    showToast(currentLang === 'ar' ? '✅ تم العثور على رسالة مخفية!' : '✅ Hidden message found!');
  } else {
    showToast(currentLang === 'ar' ? '❌ لم يتم العثور على أي مطابقة.' : '❌ No match found.');
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
function _buildMatchHTML(msgNum, coverText, secretMessage, hint, type, usedStegoKey) {
  let typeLabel = '';
  if (type === 'carrier_fallback') {
    typeLabel = '<span class="badge badge--draft text-label-sm" style="background: rgba(187,209,0,0.1); color: var(--color-primary); font-family: var(--font-label);">(Cover = Carrier)</span>';
  }

  let keyLabel = '';
  if (usedStegoKey) {
    keyLabel = `
      <div style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; background: var(--color-surface-container-high); padding: 2px 8px; border-radius: var(--radius-full); font-weight: 600; color: var(--color-primary); font-family: var(--font-label);">
        <span class="material-symbols-outlined" style="font-size: 12px;">key</span>
        <span>${escapeHtml(usedStegoKey)}</span>
      </div>`;
  }

  return `
    <div class="scanner-match-card">
      <!-- Top info -->
      <div class="scanner-match-header">
        <div class="scanner-match-meta">
          <span class="scanner-match-meta-index">#${msgNum}</span>
          <span>Extracted from cover message <strong>#${msgNum}</strong></span>
          ${typeLabel}
        </div>
        ${keyLabel}
      </div>

      <!-- Secret Message Box -->
      <div>
        <div class="scanner-match-secret-label-row">
          <span class="scanner-match-secret-label">Secret Message</span>
          <button class="btn btn--secondary" data-secret="${escapeHtml(secretMessage)}" onclick="navigator.clipboard.writeText(this.getAttribute('data-secret')); showToast('📋 Secret message copied successfully!');" style="padding: 2px var(--space-sm); font-size: 11px; display: inline-flex; align-items: center; gap: 4px; border-radius: var(--radius-default); background: var(--color-surface-container); border: 1px solid var(--color-outline-variant); height: 24px;">
            <span class="material-symbols-outlined" style="font-size: 14px;">content_copy</span>
            <span>Copy</span>
          </button>
        </div>
        <div class="scanner-match-secret-text" dir="auto">${escapeHtml(secretMessage)}</div>
      </div>

      <!-- Hint (if present) -->
      ${hint ? `
      <div class="scanner-hint-box">
        <span class="material-symbols-outlined" style="color: #D97706; font-size: 18px; margin-top: 1px;">lightbulb</span>
        <div style="text-align: left;">
          <div class="scanner-hint-title">Hint:</div>
          <div class="scanner-hint-text" dir="auto">${escapeHtml(hint)}</div>
        </div>
      </div>` : ''}

    </div>`;
}


/**
 * Build HTML for a non-matching cover result.
 */
function _buildNoMatchHTML(msgNum, candidateText, reasonObj) {
  return '';
}


/**
 * Build HTML for a skipped carrier message.
 */
function _buildSkippedHTML(msgNum) {
  return `
    <div style="background: var(--color-surface-container-low); border: 1px solid var(--color-outline-variant); border-radius: var(--radius-lg); padding: var(--space-md) var(--space-lg); display: flex; align-items: center; justify-content: space-between; opacity: 0.75; width: 100%;">
      <div style="display: flex; align-items: center; gap: 8px; font-size: var(--fs-body-sm); color: var(--color-on-surface-variant); font-family: var(--font-body);">
        <span style="font-weight: bold; background: var(--color-surface-container-high); color: var(--color-on-surface); padding: 2px 8px; border-radius: 4px; font-family: monospace; font-size: 11px;">#${msgNum}</span>
        <span>Extracted Carrier Message (Contains VS)</span>
      </div>
      <span class="badge badge--draft text-label-sm" style="color: var(--color-on-surface-variant); font-family: var(--font-label);">Skipped (Carrier)</span>
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
  container.innerHTML = html; // SECURITY: All dynamic values are escaped via escapeHtml()

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
  const carriers = _scannerState.carriers;

  const container = document.getElementById('scannerExtractedList');
  let html = `
    <div class="stego-table" style="margin-top: 0;">
      <div class="stego-table__body">`;

  if (carriers.length > 0) {
    for (let c = 0; c < carriers.length; c++) {
      const carrier = carriers[c];
      const hexDisplay = Array.from(carrier.vsKey).map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
      html += `
        <div class="stego-table__row stego-table__row--warning">
          <div class="stego-table__cell" dir="ltr" style="padding: var(--space-md);">
            <div style="font-family: var(--font-body); font-size: var(--fs-body-md); color: var(--color-on-surface-variant); margin-bottom: var(--space-sm);">
              🔑 Carrier Message #${carrier.index + 1} (${carrier.vsKey.length} bytes VS)
            </div>
            <div class="stego-table__hex-container" dir="ltr" style="margin-top: 0; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--color-on-surface); border: 1px solid var(--color-outline-variant);">${hexDisplay}</div>
          </div>
        </div>`;
    }
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
  container.innerHTML = html; // SECURITY: All dynamic values are escaped via escapeHtml()

  // Update count badge
  const countText = carriers.length > 0
    ? `(🔑 Extracted ${carriers.length} VS keys)`
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
