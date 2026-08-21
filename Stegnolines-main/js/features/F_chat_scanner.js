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
 * Toggle a collapsible scanner result section with smooth downward slide animation
 * and automatic smooth focus/scroll into view.
 * @param {string} bodyId - The ID of the body element to toggle.
 * @param {boolean} [forceOpen] - Optional explicit state (true = open, false = close).
 */
function toggleScannerResult(bodyId, forceOpen) {
  const body = document.getElementById(bodyId);
  if (!body) return;

  const card = body.closest('.accordion') || body.parentElement;
  const toggle = card ? card.querySelector('.scanner-result-toggle, .accordion__trigger') : null;
  const chevron = toggle ? (toggle.querySelector('.scanner-chevron') || toggle.querySelector('.material-symbols-outlined')) : null;

  // Determine current visibility state
  const isCurrentlyOpen = card.classList.contains('accordion--open') || body.classList.contains('accordion__body--open') || (body.style.display !== 'none' && body.offsetHeight > 0);
  const shouldOpen = (forceOpen !== undefined) ? forceOpen : !isCurrentlyOpen;

  if (shouldOpen) {
    // Open section smoothly
    card.classList.add('accordion--open');
    body.classList.add('accordion__body--open');
    body.style.display = 'block';

    if (chevron) chevron.classList.add('rotated');

    // Focus pulse glow highlight on the opened card
    card.classList.remove('scanner-card-focus-pulse');
    void card.offsetWidth; // Trigger reflow
    card.classList.add('scanner-card-focus-pulse');
    setTimeout(() => card.classList.remove('scanner-card-focus-pulse'), 850);

    // Smoothly scroll page to bring content into view with sticky header offset
    setTimeout(() => {
      const yOffset = -90; // Accounts for sticky navbar header
      const y = card.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }, 50);

  } else {
    // Close section smoothly
    card.classList.remove('accordion--open');
    body.classList.remove('accordion__body--open');
    if (chevron) chevron.classList.remove('rotated');

    // Allow CSS transition to complete before setting display:none
    setTimeout(() => {
      if (!card.classList.contains('accordion--open')) {
        body.style.display = 'none';
      }
    }, 350);
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
  
  // Smoothly scroll down to focus on results card with top padding for the sticky navbar
  const resultsCard = document.getElementById('scannerStep3Card');
  if (resultsCard && resultsCard.style.display !== 'none') {
    const yOffset = -90; // Accounts for sticky header height + breathing space
    const y = resultsCard.getBoundingClientRect().top + window.scrollY + yOffset;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });

    resultsCard.classList.remove('scanner-card-focus-pulse');
    void resultsCard.offsetWidth;
    resultsCard.classList.add('scanner-card-focus-pulse');
    setTimeout(() => resultsCard.classList.remove('scanner-card-focus-pulse'), 850);
  }

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
  const inputValidation = (typeof window.getScannerInputValidation === 'function')
    ? window.getScannerInputValidation()
    : { status: 'empty', text: '' };

  const curLang = localStorage.getItem('stegoLang') || 'en';

  if (inputValidation.status === 'conflict') {
    const conflictMsg = curLang === 'ar'
      ? '⚠ تعارض في المدخلات: يرجى فحص نوع واحد فقط (إما نص المحادثة أو الملف المرفوع)، قم بمسح أحدهما للمتابعة.'
      : '⚠ Input Conflict: Please inspect only one source at a time (either pasted chat or uploaded file). Remove one to proceed.';
    return showToast(conflictMsg);
  }

  const rawText = inputValidation.text;

  // ── EMOJI INPUT VALIDATION ──
  const keyInputs = Array.from(document.querySelectorAll('.scanner-stego-key-input, .scanner-aes-key-input')).map(el => ({
    el,
    name: { en: "Key Field", ar: "حقل المفتاح" }
  }));
  const emojiError = validateEmojiInputs(keyInputs);
  if (emojiError) return;

  if (!rawText || !rawText.trim()) {
    const msg = curLang === 'ar' ? '⚠ يرجى لصق نص المحادثة أو رفع ملف أولاً.' : '⚠ Please paste chat history or upload a file first.';
    return showToast(msg);
  }

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

  _showStep1Results(false);
  _updateProgress(1, '① Filter completed ✓', 33);
  await _delay(150);

  // ── Step 2: Extract VS ──
  _updateProgress(2, '② Extracting VS characters...', 50);
  await _delay(100);

  const t2 = performance.now();
  _runExtractStep();
  totalDurationMs += (performance.now() - t2);

  // Render Step 2 results card (shows extracted keys or clear "No VS detected" report)
  _showStep2Results(true);

  if (_scannerState.carriers.length === 0) {
    await _delay(200);
    _updateProgress(3, '✅ Analysis completed', 100);
    await _delay(400);
    await _hideProgress();
    _displayScannerTime(totalDurationMs);

    const step2Card = document.getElementById('scannerStep2Card');
    if (step2Card) {
      step2Card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    return;
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

  _displayScannerTime(totalDurationMs);

  const resultsCard = document.getElementById('scannerStep3Card') || document.getElementById('scannerStep2Card');
  if (resultsCard) {
    resultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}


/**
 * Verify Filter mode: runs Filter + Extract, then shows results
 * expanded so the user can verify correctness and see VS characters.
 */
async function scannerVerifyFilter() {
  const inputValidation = (typeof window.getScannerInputValidation === 'function')
    ? window.getScannerInputValidation()
    : { status: 'empty', text: '' };

  const curLang = localStorage.getItem('stegoLang') || 'en';

  if (inputValidation.status === 'conflict') {
    const conflictMsg = curLang === 'ar'
      ? '⚠ تعارض في المدخلات: يرجى فحص نوع واحد فقط (إما نص المحادثة أو الملف المرفوع)، قم بمسح أحدهما للمتابعة.'
      : '⚠ Input Conflict: Please inspect only one source at a time (either pasted chat or uploaded file). Remove one to proceed.';
    return showToast(conflictMsg);
  }

  const rawText = inputValidation.text;

  if (!rawText || !rawText.trim()) {
    const msg = curLang === 'ar' ? '⚠ يرجى لصق نص المحادثة أو رفع ملف أولاً.' : '⚠ Please paste chat history or upload a file first.';
    return showToast(msg);
  }

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
  // Strip Windows carriage returns \r and UTF-8 BOM (U+FEFF)
  rawText = (rawText || '').replace(/^\uFEFF/, '').replace(/\r/g, '');

  const platformSelect = document.getElementById('scannerPlatform');
  const selectedPlatform = platformSelect ? platformSelect.value : 'auto';

  let platform = (selectedPlatform === 'auto')
    ? detectPlatform(rawText)
    : selectedPlatform;

  let messages = parseChat(rawText, platform);

  // Fallback to generic if platform parsing yielded 0 messages
  if (messages.length === 0 && platform !== 'generic') {
    platform = 'generic';
    messages = parseChat(rawText, 'generic');
  }

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

  // Ensure empty string is included in candidate stego keys
  if (!stegoKeys.includes("")) {
    stegoKeys.push("");
  }

  // Gather all AES encryption keys and filter unique
  const aesInputs = Array.from(document.querySelectorAll('.scanner-aes-key-input'));
  const aesKeys = Array.from(new Set(aesInputs.map(inp => inp.value.trim())));

  // Ensure empty string is included in candidate AES keys
  if (!aesKeys.includes("")) {
    aesKeys.push("");
  }

  if (carriers.length === 0) return;

  const currentLang = localStorage.getItem('stegoLang') || 'en';
  let totalMatchesCount = 0;
  const carrierResults = [];

  // Helper to retrieve candidate cover strings for message at index
  function getCandidateCovers(index) {
    const msg = _scannerState.messages[index];
    if (!msg) return [];
    const cleanBody = _scannerState.cleanMessages[index] || '';
    const rawClean = (msg.rawText && typeof extractVSFromText === 'function')
      ? extractVSFromText(msg.rawText).cleanText
      : '';

    const candidates = [cleanBody];
    if (msg.sender) {
      candidates.push(`${msg.sender}: ${cleanBody}`);
      candidates.push(`${msg.sender} - ${cleanBody}`);
    }
    if (rawClean) {
      candidates.push(rawClean);
    }
    return Array.from(new Set(candidates.filter(c => c && c.length > 0)));
  }

  for (let c = 0; c < carriers.length; c++) {
    const carrier = carriers[c];
    const carrierIndex = carrier.index;
    const vsKey = carrier.vsKey;
    const xorKeyBinary = bytesToBinary(vsKey);

    const matches = [];

    // 1. Try carrier's own cover text variations first (fallback / normal embedding)
    const carrierCoverCandidates = getCandidateCovers(carrierIndex);
    let carrierMatched = false;

    for (const carrierCover of carrierCoverCandidates) {
      const carrierCoverBits = stringToBinary(carrierCover);
      if (carrierCoverBits.length < xorKeyBinary.length) continue;

      for (const stKey of stegoKeys) {
        let resolvedStegoKey = stKey;
        try {
          const res = await resolveStegoKey(stKey, carrierCover);
          resolvedStegoKey = res.resolvedStegoKey;
        } catch (e) {
          resolvedStegoKey = stKey || "";
        }

        const candidateAesKeys = Array.from(new Set([...aesKeys, resolvedStegoKey, stKey, ""]));
        for (const aesKey of candidateAesKeys) {
          const carrierResult = await _tryOneCover(carrierCover, carrierCoverBits, xorKeyBinary, resolvedStegoKey, aesKey);
          if (carrierResult.match) {
            matches.push({
              index: carrierIndex + 1,
              coverText: carrierCover,
              secretMessage: carrierResult.secretMessage,
              hint: carrierResult.hint,
              type: 'carrier_fallback',
              usedStegoKey: stKey || (currentLang === 'ar' ? 'افتراضي (بدون مفتاح)' : 'Default (No Key)')
            });
            carrierMatched = true;
            break;
          }
        }
        if (carrierMatched) break;
      }
      if (carrierMatched) break;
    }

    // 2. Try other clean messages in the chat if carrier fallback didn't match
    if (!carrierMatched) {
      for (let i = 0; i < cleanMessages.length; i++) {
        if (i === carrierIndex) continue;

        const candidateCovers = getCandidateCovers(i);
        let foundMatchForMsg = false;

        for (const candidateCover of candidateCovers) {
          const candidateCoverBits = stringToBinary(candidateCover);
          if (candidateCoverBits.length < xorKeyBinary.length) continue;

          for (const stKey of stegoKeys) {
            let resolvedStegoKey = stKey;
            try {
              const res = await resolveStegoKey(stKey, candidateCover);
              resolvedStegoKey = res.resolvedStegoKey;
            } catch (e) {
              resolvedStegoKey = stKey || "";
            }

            const candidateAesKeysOther = Array.from(new Set([...aesKeys, resolvedStegoKey, stKey, ""]));
            for (const aesKey of candidateAesKeysOther) {
              const result = await _tryOneCover(candidateCover, candidateCoverBits, xorKeyBinary, resolvedStegoKey, aesKey);
              if (result.match) {
                const isDuplicate = matches.some(m => m.secretMessage === result.secretMessage);
                if (!isDuplicate) {
                  matches.push({
                    index: i + 1,
                    coverText: candidateCover,
                    secretMessage: result.secretMessage,
                    hint: result.hint,
                    type: 'normal',
                    usedStegoKey: stKey || (currentLang === 'ar' ? 'افتراضي (بدون مفتاح)' : 'Default (No Key)')
                  });
                }
                foundMatchForMsg = true;
                break;
              }
            }
            if (foundMatchForMsg) break;
          }
          if (foundMatchForMsg) break;
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

  // 2. Results List
  if (totalMatchesCount === 0) {
    const emptyTitle = currentLang === 'ar' ? 'تنبيه: لم يتم فك أي رسائل سرية' : 'Warning: No Secret Messages Decrypted';
    const emptyDesc = currentLang === 'ar'
      ? 'تم الكشف عن رموز مخفية (Variation Selectors) في نص المحادثة، ولكن لم نتمكن من استرجاع أي محتوى سري. يرجى التحقق من صحة المفاتيح المستخدمة أو سلامة النص المنسوخ.'
      : 'We detected Variation Selectors in the chat text, but could not decrypt any hidden content. Please verify that the correct keys are used and the chat was fully copied.';
    const tipsTitle = currentLang === 'ar' ? 'نقاط التحقق المقترحة:' : 'Suggested Checkpoints:';
    const tip1 = currentLang === 'ar' ? 'تأكد من نسخ المحادثة بالكامل بما في ذلك رسائل الغلاف والناقل.' : 'Ensure you copied the entire chat transcript including cover messages.';
    const tip2 = currentLang === 'ar' ? 'تحقق من تطابق مفتاح Stego ومفتاح AES المستخدم.' : 'Double-check that the Stego-Key and AES key are correct.';
    const tip3 = currentLang === 'ar' ? 'تأكد من تحديد المنصة الصحيحة للمحادثة.' : 'Make sure the correct platform is selected.';

    html += `
      <div class="scanner-global-error-card">
        <div class="scanner-global-error-header">
          <span class="material-symbols-outlined error-icon">warning</span>
          <h3 class="error-title">${emptyTitle}</h3>
        </div>
        <p class="error-desc">${emptyDesc}</p>
        <div class="scanner-empty-tips-container">
          <div class="scanner-empty-tips-title">
            <span class="material-symbols-outlined">info</span>
            <span>${tipsTitle}</span>
          </div>
          <ul class="scanner-empty-tips-list">
            <li>${tip1}</li>
            <li>${tip2}</li>
            <li>${tip3}</li>
          </ul>
        </div>
      </div>
    `;
  }

  // Render Grid of Carriers (both matched and unmatched)
  html += `<div class="scanner-results-grid">`;
  for (const cr of carrierResults) {
    const isMatched = cr.matches.length > 0;
    const headerTitle = currentLang === 'ar' ? `رسالة الناقلة رقم #${cr.carrierIndex + 1}` : `Carrier Message #${cr.carrierIndex + 1}`;
    const badgeText = currentLang === 'ar' ? `${cr.vsKeyLength} بايت` : `${cr.vsKeyLength} bytes VS`;

    if (isMatched) {
      html += `
        <div class="scanner-carrier-group">
          <div class="scanner-carrier-header">
            <div class="scanner-carrier-header-title">
              <span class="material-symbols-outlined">lock_open</span>
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
    } else {
      // Unmatched carrier (in red, styled exactly like matched carrier group but red)
      html += `
        <div class="scanner-carrier-group scanner-carrier-group--error">
          <div class="scanner-carrier-header">
            <div class="scanner-carrier-header-title">
              <span class="material-symbols-outlined">lock</span>
              <span>${headerTitle}</span>
            </div>
            <span class="badge badge--danger text-label-md">${badgeText}</span>
          </div>
          <div class="scanner-carrier-body">
            ${_buildUnmatchedHTML(cr.carrierIndex + 1, cr.vsKeyLength)}
          </div>
        </div>`;
    }
  }
  html += `</div>`;
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
    showToast(currentLang === 'ar' 
      ? '❌ لم يتم العثور على أي رسائل مخفية! قد يكون هناك خطأ في المفتاح المشترك أو في لصق النص.' 
      : '❌ No hidden messages decrypted! Ensure the shared key is correct and the text was pasted fully.');
  }
}


/**
 * Try a single cover text candidate against the VS key.
 *
 * @param {string} candidateCover - The cover text to test.
 * @param {string} coverBits      - The binary string representation of candidateCover.
 * @param {string} xorKeyBinary   - The XOR key as a binary string.
 * @param {string} resolvedStegoKey - The resolved stego key.
 * @param {string} encryptionKey  - The user-supplied AES encryption key.
 * @returns {Promise<{ match: boolean, secretMessage?: string, hint?: string, reason?: string, details?: any, errorMsg?: string }>}
 */
async function _tryOneCover(candidateCover, coverBits, xorKeyBinary, resolvedStegoKey, encryptionKey) {
  try {
    const positions = generatePositions(coverBits.length, xorKeyBinary.length, resolvedStegoKey);
    const recoveredBinary = recoverPayloadBits(coverBits, positions, xorKeyBinary);
    const recoveredPayload = binaryToBytes(recoveredBinary);

    const parseAndDecodePayload = (bytes) => {
      if (!bytes) return null;
      const strictDecoder = new TextDecoder('utf-8', { fatal: true });
      let payloadBytes;

      try {
        if (bytes[0] === 0xFE) {
          payloadBytes = doStreamDecompress(bytes.subarray(1));
        } else {
          payloadBytes = bytes;
        }

        const delimiterIndex = payloadBytes.indexOf(0xFF);
        let msgBytes, hintBytes = null;
        if (delimiterIndex !== -1) {
          msgBytes = payloadBytes.subarray(0, delimiterIndex);
          hintBytes = payloadBytes.subarray(delimiterIndex + 1);
        } else {
          msgBytes = payloadBytes;
        }

        const decodedMsg = strictDecoder.decode(msgBytes);
        const decodedHint = hintBytes ? strictDecoder.decode(hintBytes) : '';

        if (decodedMsg.length > 0 && isPrintableText(decodedMsg)) {
          return { match: true, secretMessage: decodedMsg, hint: decodedHint };
        }
      } catch (e) {}

      return null;
    };

    // If an explicit non-empty encryptionKey is provided:
    if (encryptionKey && encryptionKey.trim().length > 0) {
      try {
        const decPayload = await decryptPayloadCtr(recoveredPayload, encryptionKey, candidateCover);
        const res = parseAndDecodePayload(decPayload);
        if (res) return res;
      } catch (err) {}
    } else {
      // Empty AES key: Test RAW unencrypted first!
      const rawRes = parseAndDecodePayload(recoveredPayload);
      if (rawRes) return rawRes;

      // Test resolvedStegoKey AES fallback second!
      if (resolvedStegoKey) {
        try {
          const decPayload = await decryptPayloadCtr(recoveredPayload, resolvedStegoKey, candidateCover);
          const res = parseAndDecodePayload(decPayload);
          if (res) return res;
        } catch (err) {}
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
  const currentLang = localStorage.getItem('stegoLang') || 'en';
  
  const copyText = currentLang === 'ar' ? 'نسخ' : 'Copy';
  const toastMsg = currentLang === 'ar' ? '📋 تم نسخ الرسالة السرية بنجاح!' : '📋 Secret message copied successfully!';
  const extractedLabel = currentLang === 'ar' 
    ? `تم الاستخراج من رسالة الغلاف <strong>#${msgNum}</strong>`
    : `Extracted from cover message <strong>#${msgNum}</strong>`;
  const secretMsgLabel = currentLang === 'ar' ? 'الرسالة السرية' : 'Secret Message';
  const hintLabel = currentLang === 'ar' ? 'تلميح:' : 'Hint:';

  let typeLabel = '';
  if (type === 'carrier_fallback') {
    const fallbackText = currentLang === 'ar' ? '(الغلاف = الناقل)' : '(Cover = Carrier)';
    typeLabel = `<span class="badge badge--draft text-label-sm">${fallbackText}</span>`;
  }

  let keyLabel = '';
  if (usedStegoKey) {
    keyLabel = `
      <div class="scanner-match-key-badge">
        <span class="material-symbols-outlined">key</span>
        <span>${escapeHtml(usedStegoKey)}</span>
      </div>`;
  }

  return `
    <div class="scanner-match-card">
      <!-- Top info -->
      <div class="scanner-match-header">
        <div class="scanner-match-meta">
          <span class="scanner-match-meta-index">#${msgNum}</span>
          <span>${extractedLabel}</span>
          ${typeLabel}
        </div>
        ${keyLabel}
      </div>

      <!-- Secret Message Box -->
      <div class="scanner-match-secret-container">
        <div class="scanner-match-secret-label-row">
          <span class="scanner-match-secret-label">${secretMsgLabel}</span>
          <button class="btn btn-copy-secret" data-secret="${escapeHtml(secretMessage)}" onclick="navigator.clipboard.writeText(this.getAttribute('data-secret')); showToast('${toastMsg}');">
            <span class="material-symbols-outlined">content_copy</span>
            <span>${copyText}</span>
          </button>
        </div>
        <div class="scanner-match-secret-text" dir="auto">${escapeHtml(secretMessage)}</div>
      </div>

      <!-- Hint (if present) -->
      ${hint ? `
      <div class="scanner-hint-box">
        <span class="material-symbols-outlined hint-icon">lightbulb</span>
        <div class="scanner-hint-content">
          <div class="scanner-hint-title">${hintLabel}</div>
          <div class="scanner-hint-text" dir="auto">${escapeHtml(hint)}</div>
        </div>
      </div>` : ''}

    </div>`;
}


/**
 * Build HTML for an unmatched cover result.
 */
function _buildUnmatchedHTML(msgNum, vsKeyLength) {
  const currentLang = localStorage.getItem('stegoLang') || 'en';
  
  const unresolvedLabel = currentLang === 'ar' ? 'لا يوجد مطابقة' : 'No Match';
  const label = currentLang === 'ar' 
    ? `تم الكشف عن رموز مخفية (${vsKeyLength} رموز VS)، ولكن لم يتم فك التشفير.` 
    : `Detected hidden Variation Selectors (${vsKeyLength} VS), but decryption failed.`;
  const desc = currentLang === 'ar'
    ? 'يرجى التحقق من المفتاح المشترك (Stego-Key) أو مفتاح AES، والتأكد من نسخ النص كاملاً بدون نقصان.'
    : 'Please verify the shared key (Stego-Key) or AES key, and ensure the stego-text was pasted completely.';

  return `
    <div class="scanner-match-card scanner-match-card--error">
      <!-- Top info -->
      <div class="scanner-match-header">
        <div class="scanner-match-meta">
          <span class="scanner-match-meta-index">#${msgNum}</span>
          <span class="scanner-unmatched-status">
            <span class="material-symbols-outlined">error</span>
            <span>${unresolvedLabel}</span>
          </span>
        </div>
      </div>

      <!-- Error Content Box -->
      <div class="scanner-match-secret-container">
        <div class="scanner-unmatched-explanation">
          <strong>${label}</strong>
          <span>${desc}</span>
        </div>
      </div>
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
  const currentLang = localStorage.getItem('stegoLang') || 'en';
  const label = currentLang === 'ar' ? 'رسالة ناقل مستخرجة (تحتوي رموز VS)' : 'Extracted Carrier Message (Contains VS)';
  const badgeLabel = currentLang === 'ar' ? 'تم تخطيها (ناقل)' : 'Skipped (Carrier)';

  return `
    <div class="scanner-skipped-card">
      <div class="scanner-skipped-info">
        <span class="scanner-skipped-index">#${msgNum}</span>
        <span>${label}</span>
      </div>
      <span class="badge badge--draft text-label-sm">${badgeLabel}</span>
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

  // Show card & toggle body visibility with smooth animation & focus
  const card = document.getElementById('scannerStep1Card');
  card.style.display = 'block';

  toggleScannerResult('scannerStep1Body', expanded);
}


/**
 * Show Step 2 results card (extracted VS characters).
 * @param {boolean} expanded - Whether to show the body expanded.
 */
function _showStep2Results(expanded) {
  const carriers = _scannerState.carriers;
  const currentLang = localStorage.getItem('stegoLang') || 'en';

  const container = document.getElementById('scannerExtractedList');
  let html = `
    <div class="stego-table" style="margin-top: 0;">
      <div class="stego-table__body">`;

  if (carriers.length > 0) {
    for (let c = 0; c < carriers.length; c++) {
      const carrier = carriers[c];
      const hexDisplay = Array.from(carrier.vsKey).map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
      const label = currentLang === 'ar' ? 'رسالة الناقل' : 'Carrier Message';
      const bytesLabel = currentLang === 'ar' ? 'رموز VS' : 'bytes VS';
      html += `
        <div class="stego-table__row stego-table__row--warning">
          <div class="stego-table__cell scanner-carrier-details" dir="ltr">
            <div class="scanner-carrier-meta-row">
              🔑 ${label} #${carrier.index + 1} (${carrier.vsKey.length} ${bytesLabel})
            </div>
            <div class="stego-table__hex-container scanner-carrier-hex" dir="ltr">${hexDisplay}</div>
          </div>
        </div>`;
    }
  } else {
    const emptyText = currentLang === 'ar'
      ? 'لم يتم الكشف عن أي رموز Variation Selector مخفية. تأكد من نسخ سجل المحادثة بالكامل، بما في ذلك رسالة الناقل التي تحتوي على مفاتيح VS المخفية.'
      : 'No hidden Variation Selector characters were detected. Ensure you paste the entire chat history, including the carrier message containing the hidden VS keys.';
    html += `
      <div class="stego-table__row stego-table__row--error">
        <div class="stego-table__cell scanner-carrier-details" dir="ltr">
          <div class="scanner-carrier-empty-text">${emptyText}</div>
        </div>
      </div>`;
  }

  html += `
      </div>
    </div>`;
  container.innerHTML = html; // SECURITY: All dynamic values are escaped via escapeHtml()

  // Update count badge
  const countText = carriers.length > 0
    ? (currentLang === 'ar' ? `(🔑 تم استخراج ${carriers.length} مفاتيح VS)` : `(🔑 Extracted ${carriers.length} VS keys)`)
    : (currentLang === 'ar' ? '(❌ لم يتم الكشف عن رموز VS)' : '(❌ No VS detected)');
  document.getElementById('scannerStep2Count').textContent = countText;

  // Show card & toggle body visibility with smooth animation & focus
  const card = document.getElementById('scannerStep2Card');
  card.style.display = 'block';

  toggleScannerResult('scannerStep2Body', expanded);
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

  const chars = [...text];
  for (const char of chars) {
    const code = char.codePointAt(0);

    // Reject control characters 0x00-0x1F except \n, \r, \t, and 0x7F-0x9F
    if (code < 0x20 && code !== 0x0A && code !== 0x0D && code !== 0x09) {
      return false;
    }
    if (code === 0x7F || (code >= 0x80 && code <= 0x9F)) {
      return false;
    }

    const isPrintable = (
      (code >= 0x20 && code <= 0x7E) ||       // ASCII printable (letters, numbers, punctuation, spaces)
      (code >= 0x0600 && code <= 0x06FF) ||   // Arabic
      (code >= 0x0750 && code <= 0x077F) ||   // Arabic Supplement
      (code >= 0xFB50 && code <= 0xFDFF) ||   // Arabic Presentation Forms-A
      (code >= 0xFE70 && code <= 0xFEFF) ||   // Arabic Presentation Forms-B
      (code >= 0x4E00 && code <= 0x9FFF) ||   // CJK
      (code >= 0xAC00 && code <= 0xD7AF) ||   // Korean
      (code >= 0x1F300 && code <= 0x1FAFF) ||  // Emoji
      code === 0x0A || code === 0x0D ||        // Newline, CR
      code === 0x09                            // Tab
    );

    if (isPrintable) {
      printableCount++;
    }

    if (
      /[\p{L}\p{N}]/u.test(char) ||
      (code >= 0x1F300 && code <= 0x1FAFF)
    ) {
      hasLetterOrDigitOrEmoji = true;
    }
  }

  const totalLen = chars.length;
  const ratio = printableCount / totalLen;

  if (totalLen <= 50) {
    return ratio === 1.0 && hasLetterOrDigitOrEmoji;
  }

  return ratio >= 0.95 && hasLetterOrDigitOrEmoji;
}


/**
 * Escape HTML special characters to prevent XSS.
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
