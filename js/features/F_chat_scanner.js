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
const STEP1_PAGE_SIZE = 15;
let _step1RenderedCount = 0;

let _scannerState = {
  messages: [],        // [{ sender, message, timestamp, lineNumber }]  — raw parsed messages
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
 * @param {number} step         - Current step (1–3).
 * @param {string} label        - Progress label text (optional).
 * @param {number} percent      - Fill percentage (0–100).
 * @param {string} statusDetail - Detailed progress subtitle / status (optional).
 */
function _updateProgress(step, label, percent, statusDetail) {
  const bar = document.getElementById('scannerProgressBar');
  if (bar) {
    if (bar.style.display === 'none' || !bar.style.display) {
      bar.style.display = 'flex';
      setTimeout(() => {
        if (typeof bar.scrollIntoView === 'function') {
          bar.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    }
  }

  if (label) {
    const labelEl = document.getElementById('scannerProgressLabel');
    if (labelEl) labelEl.textContent = label;
  }

  const currentLang = localStorage.getItem('stegoLang') || 'en';

  const subtitleEl = document.getElementById('scannerProgressSubLabel');
  if (subtitleEl) {
    if (statusDetail) {
      subtitleEl.textContent = statusDetail;
    } else {
      if (step === 1) {
        subtitleEl.textContent = currentLang === 'ar' ? 'جاري تصفية واستخراج نصوص المحادثة...' : 'Analyzing and filtering chat messages...';
      } else if (step === 2) {
        subtitleEl.textContent = currentLang === 'ar' ? 'جاري استخراج أحرف الـ Variation Selectors المخفية...' : 'Searching for and extracting hidden Variation Selectors...';
      } else if (step === 3) {
        subtitleEl.textContent = currentLang === 'ar' ? 'جاري تجربة فك التشفير ومطابقة خرائط الغلاف والمفاتيح...' : 'Testing key combinations and resolving decryption maps...';
      }
    }
  }

  // Update Stage Badge above Progress Bar (1 / 3, 2 / 3, 3 / 3)
  const stageNumEl = document.getElementById('scannerStageNumber');
  const stageNameEl = document.getElementById('scannerStageName');
  if (stageNumEl) {
    stageNumEl.textContent = `${step} / 3`;
  }
  if (stageNameEl) {
    if (step === 1) {
      stageNameEl.textContent = currentLang === 'ar' ? 'تصفية الرسائل' : 'Filter Messages';
    } else if (step === 2) {
      stageNameEl.textContent = currentLang === 'ar' ? 'استخراج الرموز' : 'Extract VS Keys';
    } else if (step === 3) {
      stageNameEl.textContent = currentLang === 'ar' ? 'فك التشفير والمطابقة' : 'Test Combinations';
    }
  }

  // Update progress track fill, percentage labels and formatted status text
  const cleanDetail = statusDetail ? statusDetail.replace(/\s*\.{0,3}\s*\d+%\s*$/, '...') : null;

  if (typeof percent === 'number') {
    const clampedPct = Math.min(100, Math.max(0, Math.round(percent)));
    const fillEl = document.getElementById('scannerProgressFill');
    if (fillEl) fillEl.style.width = clampedPct + '%';

    const pctTextEl = document.getElementById('scannerProgressPctText');
    if (pctTextEl) pctTextEl.textContent = clampedPct + '%';
  }

  const statusTextEl = document.getElementById('scannerProgressStatusText');
  if (statusTextEl) {
    if (cleanDetail) {
      statusTextEl.textContent = cleanDetail;
    } else if (label) {
      statusTextEl.textContent = label;
    } else {
      if (step === 1) {
        statusTextEl.textContent = currentLang === 'ar' ? 'جاري تصفية واستخراج نصوص المحادثة...' : 'Analyzing and filtering chat messages...';
      } else if (step === 2) {
        statusTextEl.textContent = currentLang === 'ar' ? 'جاري استخراج أحرف الـ Variation Selectors المخفية...' : 'Searching for and extracting hidden Variation Selectors...';
      } else if (step === 3) {
        statusTextEl.textContent = currentLang === 'ar' ? 'جاري فحص وتجربة خرائط الأغلفة والمفاتيح...' : 'Testing key combinations and resolving decryption maps...';
      }
    }
  }

  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById('progStep' + i);
    if (el) {
      if (el.classList && typeof el.classList.remove === 'function') {
        el.classList.remove('active', 'done');
      }
      const icon = (typeof el.querySelector === 'function') ? el.querySelector('.step-status-icon') : null;
      if (i < step) {
        if (el.classList && typeof el.classList.add === 'function') el.classList.add('done');
        if (icon) {
          icon.textContent = 'check_circle';
          icon.style.fontVariationSettings = "'FILL' 1";
          icon.style.animation = 'none';
        }
      } else if (i === step) {
        if (el.classList && typeof el.classList.add === 'function') el.classList.add('active');
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
  _step1RenderedCount = 0;
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


/**
 * Check if at least one Stego-Key or AES key has been entered.
 * @returns {boolean} True if any key input contains non-empty text.
 */
function hasAnyScannerKeyEntered() {
  if (typeof document === 'undefined') return false;
  const stegoInputs = Array.from(document.querySelectorAll('.scanner-stego-key-input'));
  const aesInputs = Array.from(document.querySelectorAll('.scanner-aes-key-input'));
  const hasStego = stegoInputs.some(inp => inp && inp.value && inp.value.trim().length > 0);
  const hasAes = aesInputs.some(inp => inp && inp.value && inp.value.trim().length > 0);
  return hasStego || hasAes;
}

/**
 * Update the visual enabled/disabled state of the Scan & Extract button in real time.
 */
function updateScannerOneClickButtonState() {
  if (typeof document === 'undefined') return;
  const btn = document.getElementById('btn-scanner-one-click');
  if (!btn) return;

  const hasKey = hasAnyScannerKeyEntered();
  if (hasKey) {
    btn.classList.remove('is-disabled');
    btn.removeAttribute('aria-disabled');
    btn.removeAttribute('title');
  } else {
    btn.classList.add('is-disabled');
    btn.setAttribute('aria-disabled', 'true');
    const curLang = localStorage.getItem('stegoLang') || 'en';
    btn.setAttribute('title', curLang === 'ar' ? 'يرجى إدخال مفتاح واحد على الأقل للمتابعة' : 'Enter at least one key to proceed');
  }
}

// Delegate input events on key fields to keep button state updated
if (typeof document !== 'undefined') {
  document.addEventListener('input', function(e) {
    if (e.target && (e.target.matches('.scanner-stego-key-input') || e.target.matches('.scanner-aes-key-input'))) {
      updateScannerOneClickButtonState();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateScannerOneClickButtonState);
  } else {
    setTimeout(updateScannerOneClickButtonState, 0);
  }
}

// ══════════════════════════════════════════════════════════════
// ONE-CLICK PIPELINE: Filter → Extract → Try
// ══════════════════════════════════════════════════════════════

/**
 * Run the full scanner pipeline in one click:
 * Step 1 (Filter) → Step 2 (Extract VS) → Step 3 (Try password).
 */
async function scannerOneClick() {
  const curLang = localStorage.getItem('stegoLang') || 'en';

  // ── KEY REQUIREMENT VALIDATION ──
  if (!hasAnyScannerKeyEntered()) {
    const noKeyMsg = curLang === 'ar'
      ? '⚠ يرجى إدخال مفتاح واحد على الأقل (مفتاح Stego-Key أو مفتاح AES) لبدء فك التشفير والاستخراج.'
      : '⚠ Please enter at least one key (Stego-Key or AES key) to begin decryption and extraction.';
    showToast(noKeyMsg);

    const firstKeyInput = document.getElementById('scannerPassword') || document.getElementById('scannerEncryptionKey');
    if (firstKeyInput) {
      firstKeyInput.focus();
      firstKeyInput.classList.add('scanner-input-pulse');
      setTimeout(() => firstKeyInput.classList.remove('scanner-input-pulse'), 1200);
    }
    return;
  }

  const inputValidation = (typeof window.getScannerInputValidation === 'function')
    ? window.getScannerInputValidation()
    : { status: 'empty', text: '' };

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
  _updateProgress(1, curLang === 'ar' ? '① تصفية الرسائل...' : '① Filtering messages...', 10, curLang === 'ar' ? 'جاري تحليل وفصل الرسائل...' : 'Analyzing and filtering messages...');
  await _delay(60);

  const t1 = performance.now();
  const filterSuccess = _runFilterStep(rawText);
  totalDurationMs += (performance.now() - t1);

  if (!filterSuccess) {
    await _hideProgress();
    return;
  }

  // NOTE: Step 1 results card (Filtered Messages) only appears when clicking "Verify Filter"
  _updateProgress(1, curLang === 'ar' ? '① اكتملت التصفية ✓' : '① Filter completed ✓', 18, curLang === 'ar' ? `تم استخراج ${_scannerState.messages.length} رسالة` : `Parsed ${_scannerState.messages.length} messages`);
  await _delay(60);

  // ── Step 2: Extract VS ──
  _updateProgress(2, curLang === 'ar' ? '② استخراج رموز VS...' : '② Extracting VS keys...', 24, curLang === 'ar' ? 'جاري فحص الأحرف المخفية...' : 'Scanning for invisible Variation Selectors...');
  await _delay(60);

  const t2 = performance.now();
  _runExtractStep();
  totalDurationMs += (performance.now() - t2);

  // NOTE: Step 2 results card (Extraction Results) only appears when clicking "Verify Filter"
  if (_scannerState.carriers.length === 0) {
    await _delay(150);
    _updateProgress(2, curLang === 'ar' ? '✅ اكتمل التحليل' : '✅ Analysis completed', 100, curLang === 'ar' ? 'لم يتم الكشف عن رموز مخفية' : 'No hidden VS characters detected');
    await _delay(350);
    await _hideProgress();
    _displayScannerTime(totalDurationMs);

    const noVsMsg = curLang === 'ar'
      ? 'لم يتم الكشف عن أي رموز مخفية (Variation Selectors) في نص المحادثة.'
      : 'No hidden Variation Selectors detected in the chat.';
    showToast('ℹ ' + noVsMsg);
    return;
  }

  _updateProgress(2, curLang === 'ar' ? '② تم استخراج الرموز بنجاح ✓' : '② VS extracted successfully ✓', 30, curLang === 'ar' ? `تم العثور على ${_scannerState.carriers.length} رسالة ناقلة` : `Detected ${_scannerState.carriers.length} carrier messages`);
  await _delay(60);

  // ── Step 3: Try password ──
  _updateProgress(3, curLang === 'ar' ? '③ فك التشفير والمطابقة...' : '③ Testing candidate covers...', 32, curLang === 'ar' ? 'جاري بدء الفحص السريع عبر Web Worker...' : 'Starting high-speed background matching...');
  await _delay(40);

  const t3 = performance.now();
  try {
    await _runTryStep();
  } catch (e) {
    console.error('[Scanner] _runTryStep crashed:', e);
    showToast('❌ Scanner Step 3 error: ' + (e.message || e));
  }
  totalDurationMs += (performance.now() - t3);

  _updateProgress(3, curLang === 'ar' ? '✅ اكتمل الفحص' : '✅ Scan completed', 100, curLang === 'ar' ? 'اكتملت جميع العمليات بنجاح!' : 'All operations completed successfully!');
  await _delay(400);
  await _hideProgress();

  _displayScannerTime(totalDurationMs);

  const resultsCard = document.getElementById('scannerStep3Card');
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
    const { vsBytes, cleanText, rawVsIndices } = extractVSFromText(messages[i].message);
    cleanMessages.push(cleanText);

    const actualIndices = (rawVsIndices && rawVsIndices.length > 0) ? rawVsIndices : vsBytes;
    if (actualIndices && actualIndices.length > 0) {
      // Reconstruct the exact Unicode VS character sequence deterministically from indices
      const vsChars = Array.from(actualIndices).map(b => (b < 16 ? String.fromCodePoint(0xFE00 + b) : String.fromCodePoint(0xE0100 + b - 16))).join('');
      carriers.push({
        index: i,
        vsKey: vsBytes || actualIndices,
        rawVsIndices: actualIndices,
        vsPrefix: vsChars
      });
    }
  }

  _scannerState.cleanMessages = cleanMessages;
  _scannerState.carriers = carriers;
}


/**
 * Step 3 (internal): Try the password against all clean messages.
 *
 * Fully supports:
 * 1. Multiple Stego Keys and AES Encryption Keys.
 * 2. Normal Direct Embedding.
 * 3. Fake Cover (Split-Mode) Embedding across all messages in the chat.
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
    // Case 5: If message is also a carrier (contains VS), test its raw versions as well
    if (msg.message && msg.message !== cleanBody) {
      candidates.push(msg.message);
    }
    if (msg.rawText && msg.rawText !== rawClean) {
      candidates.push(msg.rawText);
    }
    return Array.from(new Set(candidates.filter(c => c && c.length > 0)));
  }

  // Pre-calculate candidate covers map for lightning fast worker dispatch
  const candidateCoversMap = {};
  for (let i = 0; i < cleanMessages.length; i++) {
    candidateCoversMap[i] = getCandidateCovers(i);
  }

  const scanPayload = {
    carriers: carriers.map(c => ({
      index: c.index,
      vsKey: c.vsKey,
      rawVsIndices: c.rawVsIndices,
      vsPrefix: c.vsPrefix,
      carrierMessage: _scannerState.messages[c.index] ? _scannerState.messages[c.index].message : '',
      cleanBody: _scannerState.cleanMessages[c.index] || ''
    })),
    cleanMessages,
    candidateCoversMap,
    stegoKeys,
    aesKeys,
    currentLang
  };

  // Execute Combinatorial Cryptographic Extraction inside Background Web Worker with Automatic Fallback
  let scanResult = null;
  const progressCb = ({ percent, statusDetail }) => {
    _updateProgress(3, null, percent, statusDetail);
  };

  try {
    if (typeof StegoWorkerService !== 'undefined' && typeof StegoWorkerService.scanChatPayloadsAsync === 'function') {
      scanResult = await StegoWorkerService.scanChatPayloadsAsync(scanPayload, progressCb);
    }
  } catch (workerErr) {
    console.warn('[Scanner] Web Worker execution failed, activating main-thread fallback:', workerErr);
    scanResult = null;
  }

  // Fallback to local main-thread execution if Web Worker was unavailable or failed
  if (!scanResult) {
    if (typeof StegoWorkerService !== 'undefined' && typeof StegoWorkerService._fallbackScanChatPayloads === 'function') {
      scanResult = await StegoWorkerService._fallbackScanChatPayloads(scanPayload, progressCb);
    } else if (typeof _fallbackScanChatPayloads === 'function') {
      scanResult = await _fallbackScanChatPayloads(scanPayload, progressCb);
    } else {
      scanResult = { carrierResults: [], totalMatchesCount: 0 };
    }
  }

  const carrierResults = (scanResult && scanResult.carrierResults) || [];
  totalMatchesCount = (scanResult && scanResult.totalMatchesCount) || 0;

  // 100% Completion Checkpoint
  _updateProgress(3, null, 100, currentLang === 'ar' ? 'اكتمل الفحص بنجاح!' : 'Scan completed successfully!');
  await new Promise(r => setTimeout(r, 50));

  _scannerState.carrierResults = carrierResults;
  _scannerState.totalMatchesCount = totalMatchesCount;

  // Build Results Container Layout
  let html = `<div class="scanner-results-container" style="display: flex; flex-direction: column; gap: var(--space-md); width: 100%;">`;

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

  // Render Rows of Detected Secrets and Unmatched Carriers (Fluent Cyber Cards)
  html += `<div class="scanner-results-rows" style="display: flex; flex-direction: column; gap: 14px; width: 100%;">`;
  let displayCounter = 1;

  for (const cr of carrierResults) {
    if (cr.matches && cr.matches.length > 0) {
      for (const m of cr.matches) {
        html += _buildMatchHTML(m, cr, displayCounter++);
      }
    } else {
      html += _buildUnmatchedHTML(cr, displayCounter++);
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
 * Uses Dual-Engine architecture: first attempts the modern CSPRNG
 * engine, then falls back to the legacy Mulberry32 engine for
 * backward compatibility with older hidden messages.
/**
 * Internal: Try to extract a hidden payload from a candidate cover message.
 *
 * Supports Dual-Engine (AES-CTR CSPRNG & Mulberry32) and Key-Dependent VS S-Box Inversion.
 *
 * @param {string} candidateCover - The cover text to test.
 * @param {string} coverBits      - The binary string representation of candidateCover.
 * @param {Uint8Array|number[]|string} rawVsBytesOrIndices - The raw VS indices or XOR key binary.
 * @param {string} resolvedStegoKey - The resolved stego key.
 * @param {string} encryptionKey  - The user-supplied AES encryption key.
 * @returns {Promise<{ match: boolean, secretMessage?: string, hint?: string, reason?: string, details?: any, errorMsg?: string }>}
 */
async function _tryOneCover(candidateCover, coverBits, rawVsBytesOrIndices, resolvedStegoKey, encryptionKey, isCarrierCover = false) {
  const parseAndDecodePayload = (bytes) => {
    if (!bytes) return null;
    const strictDecoder = new TextDecoder('utf-8', { fatal: true });
    let payloadBytes;

    try {
      if (bytes[0] === 0xFE && typeof doStreamDecompress === 'function') {
        try {
          payloadBytes = doStreamDecompress(bytes.subarray(1));
        } catch (e) {
          payloadBytes = bytes;
        }
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

  const rawIndices = rawVsBytesOrIndices instanceof Uint8Array
    ? rawVsBytesOrIndices
    : (Array.isArray(rawVsBytesOrIndices) ? new Uint8Array(rawVsBytesOrIndices) : null);

  /**
   * Internal: attempt extraction with a given position-generation function and VS mode.
   *
   * @param {function} posFn - Either generatePositions (modern) or generatePositionsLegacy.
   * @param {boolean} useVsPermutation - Whether to apply key-dependent inverse S-Box.
   * @returns {Promise<object|null>} Extraction result, or null if it fails.
   */
  async function attemptExtraction(posFn, useVsPermutation) {
    try {
      let xorKeyBinary;
      if (rawIndices) {
        const currentVsBytes = useVsPermutation && typeof invertVsBytes === 'function'
          ? invertVsBytes(rawIndices, resolvedStegoKey)
          : rawIndices;
        xorKeyBinary = bytesToBinary(currentVsBytes);
      } else {
        xorKeyBinary = rawVsBytesOrIndices;
      }

      if (xorKeyBinary.length > coverBits.length) return null;

      const positions = posFn(coverBits.length, xorKeyBinary.length, resolvedStegoKey);
      const recoveredBinary = recoverPayloadBits(coverBits, positions, xorKeyBinary);
      const recoveredPayload = binaryToBytes(recoveredBinary);

      // If an explicit non-empty encryptionKey is provided:
      if (encryptionKey && encryptionKey.trim().length > 0) {
        try {
          const decPayload = await decryptPayloadCtr(recoveredPayload, encryptionKey, candidateCover);
          const res = parseAndDecodePayload(decPayload);
          if (res) return res;
        } catch (err) {}
      } else {
        // Empty AES key: Test RAW unencrypted first (0.00 ms)!
        const rawRes = parseAndDecodePayload(recoveredPayload);
        if (rawRes) return rawRes;

        // Test resolvedStegoKey AES fallback ONLY on carrier cover to prevent scanning freeze!
        if (isCarrierCover && resolvedStegoKey) {
          try {
            const decPayload = await decryptPayloadCtr(recoveredPayload, resolvedStegoKey, candidateCover);
            const res = parseAndDecodePayload(decPayload);
            if (res) return res;
          } catch (err) {}
        }
      }
    } catch (e) {}
    return null;
  }

  // ── Multi-Tier Fallback Strategy ──

  // Attempt 1: Modern CSPRNG + Key-Dependent Permuted VS S-Box
  const res1 = await attemptExtraction(generatePositions, true);
  if (res1 && res1.match) return res1;

  // Attempt 2: Modern CSPRNG + Standard Linear Identity VS
  const res2 = await attemptExtraction(generatePositions, false);
  if (res2 && res2.match) return res2;

  // Attempt 3: Legacy Mulberry32 + Standard Linear Identity VS
  if (typeof generatePositionsLegacy === 'function') {
    const res3 = await attemptExtraction(generatePositionsLegacy, false);
    if (res3 && res3.match) return res3;

    // Attempt 4: Legacy Mulberry32 + Permuted VS S-Box
    const res4 = await attemptExtraction(generatePositionsLegacy, true);
    if (res4 && res4.match) return res4;
  }

  return { match: false, reason: 'unreadable' };
}


/**
 * Build HTML for a matching cover result using the Fluent Cyber Card layout.
 * Strictly adheres to Clean Code and Clean Omission principles.
 *
 * @param {object} match - The match details from the cryptographic scanner.
 * @param {object} carrierResult - The parent carrier result metadata.
 * @param {number} displayIndex - 1-indexed display sequence number.
 * @returns {string} Clean HTML string.
 */
function _buildMatchHTML(match, carrierResult, displayIndex) {
  const currentLang = localStorage.getItem('stegoLang') || 'en';
  const isAr = currentLang === 'ar';

  const carrierIdx = carrierResult.carrierIndex;
  const carrierMsg = (_scannerState.messages && _scannerState.messages[carrierIdx]) || {};
  const carrierSender = carrierMsg.sender || '';
  const carrierTime = carrierMsg.timestamp || '';
  const carrierLine = carrierMsg.lineNumber || (carrierIdx + 1);
  const carrierText = carrierMsg.message || carrierMsg.rawText || '';

  const vsCount = carrierResult.vsKeyLength || 0;
  const secretMessage = match.secretMessage || '';
  const usedStegoKey = match.usedStegoKey || '';
  const usedAesKey = match.usedAesKey || '';
  const isDirect = match.type === 'carrier_fallback';

  // Fake cover data (only populated when in split-mode and fakeCoverIndex exists)
  let fakeMsg = null;
  let fakeSender = '';
  let fakeTime = '';
  let fakeLine = 0;
  let fakeText = '';
  if (!isDirect && match.fakeCoverIndex !== undefined && match.fakeCoverIndex !== null) {
    fakeMsg = (_scannerState.messages && _scannerState.messages[match.fakeCoverIndex]) || {};
    fakeSender = fakeMsg.sender || '';
    fakeTime = fakeMsg.timestamp || '';
    fakeLine = fakeMsg.lineNumber || (match.fakeCoverIndex + 1);
    fakeText = match.coverText || fakeMsg.message || '';
  }

  // 1. Top Header Meta Tags (Clean Omission: render only what exists)
  let metaTagsHtml = '';
  if (carrierSender) {
    metaTagsHtml += `
      <span class="sender-tag">
        <span class="material-symbols-outlined">account_circle</span>
        <span>${escapeHtml(carrierSender)}</span>
      </span>
    `;
  }
  if (carrierSender && carrierTime) {
    metaTagsHtml += `<span style="color:var(--color-outline-variant);">•</span>`;
  }
  if (carrierTime) {
    metaTagsHtml += `
      <span class="time-tag">
        <span class="material-symbols-outlined">schedule</span>
        <span>${escapeHtml(carrierTime)}</span>
      </span>
    `;
  }

  const idxFormatted = '#' + String(displayIndex).padStart(2, '0');
  const vsLabel = isAr ? `${vsCount} رمز VS` : `${vsCount} VS Symbols`;

  // 2. Secret Payload Section
  const secretTitle = isAr ? 'الرسالة السرية المستخرجة' : 'Extracted Secret Message';
  const copyBtnText = isAr ? 'نسخ الرسالة' : 'Copy Message';
  const toastText = isAr ? '📋 تم نسخ الرسالة السرية بنجاح!' : '📋 Secret message copied successfully!';

  // 3. Security Keys Pills (Clean Omission: omit AES if not used)
  let keysHtml = '';
  if (usedStegoKey) {
    const stegoLabel = isAr ? 'إخفاء:' : 'Stego:';
    keysHtml += `
      <span class="crypto-pill">
        <span class="material-symbols-outlined">key</span>
        <span>${stegoLabel} <strong>${escapeHtml(usedStegoKey)}</strong></span>
      </span>
    `;
  }
  if (usedAesKey) {
    const encLabel = isAr ? 'تشفير:' : 'Cipher:';
    keysHtml += `
      <span class="crypto-pill">
        <span class="material-symbols-outlined">shield</span>
        <span>${encLabel} <strong>${escapeHtml(usedAesKey)}</strong></span>
      </span>
    `;
  }

  // 4. Text Covers Drawer Components
  const textCoversBtn = isAr ? 'الأغلفة النصية' : 'Text Covers';
  const carrierCoverTitle = isAr ? 'الغلاف المستخرج منه:' : 'Carrier Cover:';
  const fakeCoverTitle = isAr ? 'الغلاف الكاذب (Fake Cover):' : 'Fake Cover:';
  const lineLabel = isAr ? 'السطر' : 'Line';

  let carrierDrawerBadges = '';
  if (carrierSender) {
    carrierDrawerBadges += `
      <span class="forensic-tag">
        <span class="material-symbols-outlined">account_circle</span>
        <span>${escapeHtml(carrierSender)}</span>
      </span>
    `;
  }
  carrierDrawerBadges += `
    <span class="forensic-tag">
      <span class="material-symbols-outlined">format_list_numbered</span>
      <span>${lineLabel} ${carrierLine}</span>
    </span>
  `;
  if (carrierTime) {
    carrierDrawerBadges += `
      <span class="forensic-tag">
        <span class="material-symbols-outlined">schedule</span>
        <span>${escapeHtml(carrierTime)}</span>
      </span>
    `;
  }

  let fakeDrawerHtml = '';
  if (!isDirect && fakeText) {
    let fakeDrawerBadges = '';
    if (fakeSender) {
      fakeDrawerBadges += `
        <span class="forensic-tag">
          <span class="material-symbols-outlined" style="color:var(--color-secondary)">account_circle</span>
          <span>${escapeHtml(fakeSender)}</span>
        </span>
      `;
    }
    fakeDrawerBadges += `
      <span class="forensic-tag">
        <span class="material-symbols-outlined" style="color:var(--color-secondary)">format_list_numbered</span>
        <span>${lineLabel} ${fakeLine}</span>
      </span>
    `;
    if (fakeTime) {
      fakeDrawerBadges += `
        <span class="forensic-tag">
          <span class="material-symbols-outlined" style="color:var(--color-secondary)">schedule</span>
          <span>${escapeHtml(fakeTime)}</span>
        </span>
      `;
    }

    fakeDrawerHtml = `
      <div class="forensic-field">
        <div class="forensic-field-header">
          <span class="forensic-field-title" style="color:var(--color-secondary)">
            <span class="material-symbols-outlined" style="font-size:13px">theater_comedy</span>
            <span>${fakeCoverTitle}</span>
          </span>
          <div class="forensic-meta-badges">
            ${fakeDrawerBadges}
          </div>
        </div>
        <div class="forensic-field-box" style="color:var(--color-secondary); border-color:rgba(125,163,0,0.25);" dir="auto">
          "${escapeHtml(fakeText)}"
        </div>
      </div>
    `;
  }

  // 5. Optional Hint Box
  let hintHtml = '';
  if (match.hint) {
    const hintLabel = isAr ? 'تلميح:' : 'Hint:';
    hintHtml = `
      <div class="scanner-hint-box" style="margin-top: 10px;">
        <span class="material-symbols-outlined hint-icon">lightbulb</span>
        <div class="scanner-hint-content">
          <div class="scanner-hint-title">${hintLabel}</div>
          <div class="scanner-hint-text" dir="auto">${escapeHtml(match.hint)}</div>
        </div>
      </div>
    `;
  }

  return `
    <article class="cyber-card-row">
      <div class="cyber-card-header">
        <div class="header-info-group">
          <span class="idx-pill">${idxFormatted}</span>
          ${metaTagsHtml}
        </div>
        <span class="vs-count-badge" title="${isAr ? 'عدد رموز Variation Selectors' : 'Detected Variation Selectors'}">
          <span class="material-symbols-outlined">fingerprint</span>
          <span>${vsLabel}</span>
        </span>
      </div>

      <div class="cyber-payload-box">
        <div class="payload-top-bar">
          <span class="payload-label">
            <span class="material-symbols-outlined" style="font-size:14px">lock_open</span>
            <span>${secretTitle}</span>
          </span>
          <button type="button" class="btn-copy-action" data-secret="${escapeHtml(secretMessage)}" onclick="navigator.clipboard.writeText(this.getAttribute('data-secret')); showToast('${toastText}');">
            <span class="material-symbols-outlined">content_copy</span>
            <span>${copyBtnText}</span>
          </button>
        </div>
        <div class="payload-content-text" dir="auto">${escapeHtml(secretMessage)}</div>
        ${hintHtml}
      </div>

      <div class="cyber-card-footer">
        <div class="keys-group">
          ${keysHtml}
        </div>
        <button type="button" class="btn-forensics-toggle" onclick="_toggleScannerForensics(this)">
          <span class="material-symbols-outlined" style="font-size:15px">description</span>
          <span>${textCoversBtn}</span>
          <span class="material-symbols-outlined chevron">expand_more</span>
        </button>
      </div>

      <div class="forensic-drawer">
        <div class="forensic-field">
          <div class="forensic-field-header">
            <span class="forensic-field-title">
              <span class="material-symbols-outlined" style="font-size:13px">description</span>
              <span>${carrierCoverTitle}</span>
            </span>
            <div class="forensic-meta-badges">
              ${carrierDrawerBadges}
            </div>
          </div>
          <div class="forensic-field-box" dir="auto">
            "${escapeHtml(carrierText)}"
          </div>
        </div>
        ${fakeDrawerHtml}
      </div>
    </article>
  `;
}


/**
 * Build HTML for an unmatched / corrupted carrier result.
 * Shows visual indicators (soft red outline, red badge) with clean omission of filler text.
 *
 * @param {object} carrierResult - Carrier result metadata.
 * @param {number} displayIndex - 1-indexed display sequence number.
 * @returns {string} Clean HTML string.
 */
function _buildUnmatchedHTML(carrierResult, displayIndex) {
  const currentLang = localStorage.getItem('stegoLang') || 'en';
  const isAr = currentLang === 'ar';

  const carrierIdx = carrierResult.carrierIndex;
  const carrierMsg = (_scannerState.messages && _scannerState.messages[carrierIdx]) || {};
  const carrierSender = carrierMsg.sender || '';
  const carrierTime = carrierMsg.timestamp || '';
  const carrierLine = carrierMsg.lineNumber || (carrierIdx + 1);
  const carrierText = carrierMsg.message || carrierMsg.rawText || '';
  const vsCount = carrierResult.vsKeyLength || 0;

  // Header meta tags (Clean Omission: render only what exists)
  let metaTagsHtml = '';
  if (carrierSender) {
    metaTagsHtml += `
      <span class="sender-tag">
        <span class="material-symbols-outlined">account_circle</span>
        <span>${escapeHtml(carrierSender)}</span>
      </span>
    `;
  }
  if (carrierSender && carrierTime) {
    metaTagsHtml += `<span style="color:var(--color-outline-variant);">•</span>`;
  }
  if (carrierTime) {
    metaTagsHtml += `
      <span class="time-tag">
        <span class="material-symbols-outlined">schedule</span>
        <span>${escapeHtml(carrierTime)}</span>
      </span>
    `;
  }

  const idxFormatted = '#' + String(displayIndex).padStart(2, '0');
  const vsLabel = isAr ? `${vsCount} رمز VS` : `${vsCount} VS Symbols`;
  const resultTitle = isAr ? 'نتيجة الفحص' : 'Scan Result';
  const failedNotice = isAr
    ? `[تعذر فك التشفير]: تم رصد (${vsCount}) رمز مخفي ولكن لم تتطابق المفاتيح المدخلة أو حدث تشويش في النص.`
    : `[DECRYPTION_MISMATCH]: Detected (${vsCount}) hidden VS symbols, but keys did not match or payload is corrupted.`;
  const textCoversBtn = isAr ? 'الأغلفة النصية' : 'Text Covers';
  const carrierCoverTitle = isAr ? 'الغلاف المستخرج منه:' : 'Carrier Cover:';
  const lineLabel = isAr ? 'السطر' : 'Line';

  let carrierDrawerBadges = '';
  if (carrierSender) {
    carrierDrawerBadges += `
      <span class="forensic-tag">
        <span class="material-symbols-outlined">account_circle</span>
        <span>${escapeHtml(carrierSender)}</span>
      </span>
    `;
  }
  carrierDrawerBadges += `
    <span class="forensic-tag">
      <span class="material-symbols-outlined">format_list_numbered</span>
      <span>${lineLabel} ${carrierLine}</span>
    </span>
  `;
  if (carrierTime) {
    carrierDrawerBadges += `
      <span class="forensic-tag">
        <span class="material-symbols-outlined">schedule</span>
        <span>${escapeHtml(carrierTime)}</span>
      </span>
    `;
  }

  return `
    <article class="cyber-card-row is-corrupted">
      <div class="cyber-card-header">
        <div class="header-info-group">
          <span class="idx-pill">${idxFormatted}</span>
          ${metaTagsHtml}
        </div>
        <span class="vs-count-badge" title="${isAr ? 'عدد رموز Variation Selectors' : 'Detected Variation Selectors'}">
          <span class="material-symbols-outlined">fingerprint</span>
          <span>${vsLabel}</span>
        </span>
      </div>

      <div class="cyber-payload-box" style="border-color: rgba(229,115,115,0.25); background: rgba(229,115,115,0.03);">
        <div class="payload-top-bar">
          <span class="payload-label">
            <span class="material-symbols-outlined" style="font-size:14px">lock</span>
            <span>${resultTitle}</span>
          </span>
        </div>
        <div class="corrupted-block">
          <div class="corrupted-raw-text">${escapeHtml(failedNotice)}</div>
        </div>
      </div>

      <div class="cyber-card-footer">
        <div class="keys-group">
          <span class="crypto-pill">
            <span class="material-symbols-outlined" style="color:#E57373">warning</span>
            <span>${isAr ? 'بيانات غير مطابقة' : 'Unmatched Payload'}</span>
          </span>
        </div>
        <button type="button" class="btn-forensics-toggle" onclick="_toggleScannerForensics(this)">
          <span class="material-symbols-outlined" style="font-size:15px">description</span>
          <span>${textCoversBtn}</span>
          <span class="material-symbols-outlined chevron">expand_more</span>
        </button>
      </div>

      <div class="forensic-drawer">
        <div class="forensic-field">
          <div class="forensic-field-header">
            <span class="forensic-field-title">
              <span class="material-symbols-outlined" style="font-size:13px">description</span>
              <span>${carrierCoverTitle}</span>
            </span>
            <div class="forensic-meta-badges">
              ${carrierDrawerBadges}
            </div>
          </div>
          <div class="forensic-field-box" dir="auto">
            "${escapeHtml(carrierText)}"
          </div>
        </div>
      </div>
    </article>
  `;
}


/**
 * Interactive toggle for expanding/collapsing the Text Covers drawer.
 * @param {HTMLElement} btn - The clicked button element.
 */
function _toggleScannerForensics(btn) {
  btn.classList.toggle('expanded');
  const card = btn.closest('.cyber-card-row');
  if (card) {
    const drawer = card.querySelector('.forensic-drawer');
    if (drawer) {
      drawer.classList.toggle('open');
    }
  }
}

// Expose toggle globally to ensure inline onclick operates reliably
if (typeof window !== 'undefined') {
  window._toggleScannerForensics = _toggleScannerForensics;
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
/**
 * Build HTML row for a single Step 1 message.
 * @param {Object} msg - Parsed message object.
 * @param {number} i - 0-based index.
 * @returns {string} HTML string.
 */
function _buildStep1MessageRow(msg, i) {
  const senderLabel = msg.sender ? `<span class="stego-table__sender" style="margin-right: var(--space-xs); font-weight: 600;">${escapeHtml(msg.sender)}:</span>` : '';
  const timeLabel = msg.timestamp ? `<span class="stego-table__timestamp" style="font-size: 11px; opacity: 0.65; margin-inline-start: var(--space-xs); font-family: monospace;">${escapeHtml(msg.timestamp)}</span>` : '';
  const lineLabel = msg.lineNumber ? `<span class="stego-table__line" style="font-size: 10px; opacity: 0.5; margin-inline-start: auto; font-family: monospace;">L${msg.lineNumber}</span>` : '';

  return `
    <div class="stego-table__row">
      <div class="stego-table__cell" dir="ltr">
        <div class="stego-table__meta">
          <div class="stego-table__title-row" style="width: 100%; display: flex; align-items: center;">
            <span class="stego-table__index">#${i + 1}</span>
            ${senderLabel}
            ${timeLabel}
            ${lineLabel}
          </div>
        </div>
        <div class="stego-table__content" dir="auto">${escapeHtml(msg.message)}</div>
      </div>
    </div>`;
}

/**
 * Get pagination info text in the current language.
 * @param {number} current - Currently displayed count.
 * @param {number} total - Total messages.
 * @param {string} curLang - 'ar' or 'en'.
 * @returns {string} Formatted text.
 */
function _getStep1PaginationInfoText(current, total, curLang) {
  if (current >= total) {
    return curLang === 'ar'
      ? `✓ تم عرض جميع الرسائل (${total} رسالة)`
      : `✓ All ${total} messages displayed`;
  }
  return curLang === 'ar'
    ? `يتم عرض أول ${current} من أصل ${total} رسالة`
    : `Showing first ${current} of ${total} messages`;
}

/**
 * Show Step 1 results card (filtered messages).
 * Displays the first 15 messages initially to prevent browser lag on large chats.
 * @param {boolean} expanded - Whether to show the body expanded.
 */
function _showStep1Results(expanded) {
  const messages = _scannerState.messages || [];
  const platform = _scannerState.platform;
  const platformLabel = CHAT_PLATFORMS[platform]?.name || 'Plain Text';
  const curLang = localStorage.getItem('stegoLang') || 'en';

  _step1RenderedCount = Math.min(STEP1_PAGE_SIZE, messages.length);

  const container = document.getElementById('scannerFilteredList');
  if (!container) return;

  if (messages.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding: var(--space-md); color: var(--color-on-surface-variant);">${curLang === 'ar' ? 'لا توجد رسائل مستخرجة' : 'No messages parsed'}</div>`;
    document.getElementById('scannerStep1Count').textContent = `(📱 ${platformLabel} — 0)`;
    document.getElementById('scannerStep1Card').style.display = 'block';
    toggleScannerResult('scannerStep1Body', expanded);
    return;
  }

  let rowsHtml = '';
  for (let i = 0; i < _step1RenderedCount; i++) {
    rowsHtml += _buildStep1MessageRow(messages[i], i);
  }

  let html = `
    <div class="stego-table" style="margin-top: 0;">
      <div class="stego-table__body" id="scannerFilteredTableBody">
        ${rowsHtml}
      </div>
    </div>`;

  // Add Pagination / Load More Controls if total messages exceed 15
  if (messages.length > STEP1_PAGE_SIZE) {
    const nextBatch = Math.min(STEP1_PAGE_SIZE, messages.length - _step1RenderedCount);
    html += `
      <div class="scanner-step1-pagination" id="scannerStep1Pagination">
        <div class="scanner-step1-pagination-info" id="scannerStep1PaginationInfo">
          ${_getStep1PaginationInfoText(_step1RenderedCount, messages.length, curLang)}
        </div>
        <div class="scanner-step1-pagination-actions" id="scannerStep1PaginationActions">
          <button type="button" class="btn-scanner-pagination" onclick="scannerStep1LoadMore()">
            <span class="material-symbols-outlined" style="font-size: 16px;">expand_more</span>
            <span id="btnScannerStep1LoadMoreText">${curLang === 'ar' ? `عرض المزيد (+${nextBatch})` : `Load More (+${nextBatch})`}</span>
          </button>
          <button type="button" class="btn-scanner-pagination btn-scanner-pagination--all" onclick="scannerStep1ShowAll()">
            <span class="material-symbols-outlined" style="font-size: 16px;">visibility</span>
            <span id="btnScannerStep1ShowAllText">${curLang === 'ar' ? `عرض كل الرسائل (${messages.length})` : `Show All Messages (${messages.length})`}</span>
          </button>
        </div>
      </div>`;
  }

  container.innerHTML = html; // SECURITY: All dynamic values are escaped via escapeHtml()

  // Update count badge
  const countBadgeText = curLang === 'ar'
    ? `(📱 ${platformLabel} — ${messages.length} رسالة)`
    : `(📱 ${platformLabel} — ${messages.length} messages)`;
  document.getElementById('scannerStep1Count').textContent = countBadgeText;

  // Show card & toggle body visibility with smooth animation & focus
  const card = document.getElementById('scannerStep1Card');
  card.style.display = 'block';

  toggleScannerResult('scannerStep1Body', expanded);
}

/**
 * Load the next batch of 15 messages in Step 1 (Filtered Messages).
 */
function scannerStep1LoadMore() {
  const messages = _scannerState.messages || [];
  const curLang = localStorage.getItem('stegoLang') || 'en';
  const tableBody = document.getElementById('scannerFilteredTableBody');
  const paginationInfo = document.getElementById('scannerStep1PaginationInfo');
  const paginationActions = document.getElementById('scannerStep1PaginationActions');
  const loadMoreBtnText = document.getElementById('btnScannerStep1LoadMoreText');

  if (!tableBody || _step1RenderedCount >= messages.length) return;

  const startIndex = _step1RenderedCount;
  const endIndex = Math.min(_step1RenderedCount + STEP1_PAGE_SIZE, messages.length);

  let newRowsHtml = '';
  for (let i = startIndex; i < endIndex; i++) {
    newRowsHtml += _buildStep1MessageRow(messages[i], i);
  }

  tableBody.insertAdjacentHTML('beforeend', newRowsHtml);
  _step1RenderedCount = endIndex;

  if (paginationInfo) {
    paginationInfo.textContent = _getStep1PaginationInfoText(_step1RenderedCount, messages.length, curLang);
  }

  if (_step1RenderedCount >= messages.length) {
    if (paginationActions) paginationActions.style.display = 'none';
  } else {
    if (loadMoreBtnText) {
      const remainingNext = Math.min(STEP1_PAGE_SIZE, messages.length - _step1RenderedCount);
      loadMoreBtnText.textContent = curLang === 'ar' ? `عرض المزيد (+${remainingNext})` : `Load More (+${remainingNext})`;
    }
  }
}

/**
 * Load all remaining messages in Step 1 (Filtered Messages).
 */
function scannerStep1ShowAll() {
  const messages = _scannerState.messages || [];
  const curLang = localStorage.getItem('stegoLang') || 'en';
  const tableBody = document.getElementById('scannerFilteredTableBody');
  const paginationInfo = document.getElementById('scannerStep1PaginationInfo');
  const paginationActions = document.getElementById('scannerStep1PaginationActions');

  if (!tableBody || _step1RenderedCount >= messages.length) return;

  const startIndex = _step1RenderedCount;
  const endIndex = messages.length;

  let newRowsHtml = '';
  for (let i = startIndex; i < endIndex; i++) {
    newRowsHtml += _buildStep1MessageRow(messages[i], i);
  }

  tableBody.insertAdjacentHTML('beforeend', newRowsHtml);
  _step1RenderedCount = endIndex;

  if (paginationInfo) {
    paginationInfo.textContent = _getStep1PaginationInfoText(_step1RenderedCount, messages.length, curLang);
  }

  if (paginationActions) {
    paginationActions.style.display = 'none';
  }
}

// Expose on window for inline handlers
if (typeof window !== 'undefined') {
  window.scannerStep1LoadMore = scannerStep1LoadMore;
  window.scannerStep1ShowAll = scannerStep1ShowAll;
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
 * Optimized for high performance and universal environment execution.
 *
 * @param {string} text - Raw string to escape.
 * @returns {string} Escaped HTML string.
 */
function escapeHtml(text) {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
