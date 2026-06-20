// ══════════════════════════════════════════════════════════════
// JavaScript Features — Extraction UI Controller
// ══════════════════════════════════════════════════════════════
//
// Hooks DOM events for extract.html, reads user inputs, invokes
// decomposeStego from the core business logic, and renders extracted output.
// Handles localization, settings, themes, and UI metrics.
//
// Dependencies:
//   - js/core/stego/stego-composer.js
//   - js/shared/ui-helpers.js
//
// ══════════════════════════════════════════════════════════════

/* ── DOM refs (using OLD IDs that the JS pipeline expects) ── */
var stegoInput       = document.getElementById('extractCover');
var exPresharedInput = document.getElementById('extractStegoKey');
var exCopyBtn        = document.getElementById('ex-copy-btn');
var extractBtn       = document.getElementById('extract-btn');

/* ── Live metrics update ── */
function updateMetrics() {
  if (!exPresharedInput) return;
  const keyLen = exPresharedInput.value ? exPresharedInput.value.length : 0;
  const counterEl = document.getElementById('ex-preshared-counter');
  if (counterEl) counterEl.textContent = `${keyLen} chars`;
}

/* ── Copy action ── */
async function copyResult() {
  const el = document.getElementById('extractedResult');
  const text = el ? (el.textContent || el.innerText) : '';
  if (!text) { showToast('⚠ Nothing to copy. Run extraction first.'); return; }
  try { await navigator.clipboard.writeText(text); }
  catch { /* fallback */ }
  showToast('📋 Copied to clipboard!');
}

/**
 * Display extraction results in the DOM.
 *
 * Shows the recovered secret message (and renders as image if base64 data URL),
 * and optionally the hint card with its content.
 *
 * @param {string} secretMessage - The recovered secret message.
 * @param {string} hint          - The recovered hint (empty string if none).
 */
function displayExtractionResults(secretMessage, hint) {
  const resultCard = document.getElementById('extract-results-panel') || document.getElementById('extractResultCard');
  if (resultCard) {
    resultCard.style.display = 'block';
  }
  
  const innerCard = document.getElementById('extractResultCard');
  if (innerCard) {
    innerCard.style.display = 'block';
  }
  
  const el = document.getElementById('extractedResult');
  const cleanSecret = secretMessage.trim();
  
  if (cleanSecret.startsWith('data:image/')) {
    if (el) el.style.display = 'none';
    let imgPreview = document.getElementById('extractedImagePreview');
    if (!imgPreview && el) {
      imgPreview = document.createElement('img');
      imgPreview.id = 'extractedImagePreview';
      imgPreview.style.maxWidth = '100%';
      imgPreview.style.maxHeight = '300px';
      imgPreview.style.borderRadius = 'var(--radius-md)';
      imgPreview.style.marginTop = '8px';
      imgPreview.style.border = '1px solid var(--color-outline-variant)';
      el.parentNode.insertBefore(imgPreview, el.nextSibling);
    }
    if (imgPreview) {
      imgPreview.src = cleanSecret;
      imgPreview.style.display = 'block';
    }
  } else {
    if (el) {
      el.textContent = secretMessage;
      el.style.display = 'flex';
    }
    const imgPreview = document.getElementById('extractedImagePreview');
    if (imgPreview) imgPreview.style.display = 'none';
  }

  // Show or hide the hint card
  const hintCard = document.getElementById('extractHintCard');
  if (hintCard) {
    if (hint) {
      hintCard.style.display = 'block';
      const hintEmojiEl = document.getElementById('extractHintEmoji');
      if (hintEmojiEl) hintEmojiEl.textContent = hint;
      const hintTextEl = document.getElementById('extractHintText');
      if (hintTextEl) hintTextEl.textContent = 'The next message will be here ☝️';

      // Persist received hint to localStorage for the hints tab
      if (typeof saveHint === 'function') {
        saveHint({
          type: 'received',
          hint: hint,
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      hintCard.style.display = 'none';
    }
  }
}

/**
 * Main extraction UI orchestrator.
 */
async function performExtraction() {
  const timeEl = document.getElementById('extractTimeTaken');
  if (timeEl) timeEl.style.display = 'none';

  const stegoTextEl = document.getElementById('extractCover');
  const stegoText = stegoTextEl ? stegoTextEl.value.trim() : '';

  const rawStegoKeyEl = document.getElementById('extractStegoKey');
  const rawStegoKey = rawStegoKeyEl ? rawStegoKeyEl.value.trim() : '';

  if (!stegoText) return showToast('⚠ Please input the stego-text.');
  if (!rawStegoKey) return showToast('⚠ Please input the Pre-Shared Key (Stego-Key).');

  try {
    const encryptionKeyEl = document.getElementById('extractEncryptionKey');
    const encryptionKey = encryptionKeyEl ? encryptionKeyEl.value.trim() : "";

    const startTime = performance.now();
    // Run the pure business logic decompose pipeline
    const result = await decomposeStego(stegoText, rawStegoKey, encryptionKey);
    const durationMs = performance.now() - startTime;

    // Display extraction results in the DOM
    displayExtractionResults(result.secretMessage, result.hint);

    const timeVal = document.getElementById('extractTimeVal');
    const decompressCard = document.getElementById('extractDecompressCard');
    const decompressTimeVal = document.getElementById('extractDecompressTimeVal');
    const decompressBadge = document.getElementById('extractDecompressTimeBadge');
    
    if (timeEl && timeVal) {
      const currentLang = localStorage.getItem('stegoLang') || 'en';
      
      // Update Extraction Duration
      timeVal.setAttribute('data-duration', durationMs);
      timeVal.textContent = currentLang === 'ar'
        ? `${durationMs.toFixed(1)} ملي ثانية`
        : `${durationMs.toFixed(1)} ms`;
        
      // Update Decompression Duration (Brotli)
      if (decompressCard && decompressTimeVal && decompressBadge) {
        if (result.decompressed) {
          const brotliTime = result.brotliDurationMs || 0;
          decompressTimeVal.setAttribute('data-duration', brotliTime);
          decompressTimeVal.textContent = currentLang === 'ar'
            ? `${brotliTime.toFixed(1)} ملي ثانية`
            : `${brotliTime.toFixed(1)} ms`;
            
          decompressBadge.setAttribute('data-i18n', 'badgeBrotliActive');
          decompressBadge.textContent = currentLang === 'ar' ? 'Brotli نشط' : 'Brotli Active';
          decompressBadge.className = 'metric-card__badge metric-card__badge--amber';
          decompressCard.style.display = 'flex';
        } else {
          decompressCard.style.display = 'none';
        }
      }
      
      timeEl.style.display = 'grid';
    }

    showToast('✅ Message extracted successfully!');

  } catch (error) {
    showToast('❌ ' + error.message);
  }
}

// Translations are loaded externally from js/i18n/
const TRANSLATIONS = window.translations;

function applyLanguage(lang) {
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

  // Update active selector state inside Settings pill switcher
  document.querySelectorAll('.lang-pill').forEach(pill => {
    pill.classList.toggle('active', pill.id === `lang-btn-${lang}`);
  });

  // Sync layout for fonts toggle (now a sidebar navigation button)
  const arFontToggle = document.getElementById('ar-font-toggle-wrap');
  if (arFontToggle) {
    if (lang === 'ar') {
      arFontToggle.style.display = 'flex';
    } else {
      arFontToggle.style.display = 'none';
      if (arFontToggle.classList.contains('active')) {
        const generalBtn = document.querySelector('.settings-nav-item[data-target="general"]');
        if (generalBtn) generalBtn.click();
      }
    }
  }

  // Translate all data-i18n static labels
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
      // Preserve child structures like Material Symbol icons
      const hasIcon = el.querySelector('.material-symbols-outlined');
      if (hasIcon) {
        el.childNodes.forEach(child => {
          if (child.nodeType === Node.TEXT_NODE && child.textContent.trim().length > 0) {
            child.textContent = TRANSLATIONS[lang][key];
          }
        });
      } else {
        el.textContent = TRANSLATIONS[lang][key];
      }
    }
  });

  // Translate input text placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
      el.setAttribute('placeholder', TRANSLATIONS[lang][key]);
    }
  });

  // Translate title attributes
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
      el.setAttribute('title', TRANSLATIONS[lang][key]);
    }
  });

  // Translate tooltips
  document.querySelectorAll('[data-i18n-tooltip]').forEach(el => {
    const key = el.getAttribute('data-i18n-tooltip');
    if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
      el.setAttribute('data-tooltip', TRANSLATIONS[lang][key]);
    }
  });

  // Update current selected platform text if it has a dynamic i18n
  const selectLabel = document.getElementById('platformSelectLabel');
  if (selectLabel) {
    const key = selectLabel.getAttribute('data-i18n');
    if (key && TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
      if (typeof syncPlatformSelectLabel === 'function') {
        syncPlatformSelectLabel(lang);
      } else {
        selectLabel.textContent = TRANSLATIONS[lang][key];
      }
    }
  }

  // Update dynamic time badges if they have data-duration
  const extractTimeVal = document.getElementById('extractTimeVal');
  if (extractTimeVal && extractTimeVal.getAttribute('data-duration')) {
    const duration = parseFloat(extractTimeVal.getAttribute('data-duration'));
    extractTimeVal.textContent = lang === 'ar'
      ? `${duration.toFixed(1)} ملي ثانية`
      : `${duration.toFixed(1)} ms`;
  }
  const extractDecompressTimeVal = document.getElementById('extractDecompressTimeVal');
  if (extractDecompressTimeVal && extractDecompressTimeVal.getAttribute('data-duration')) {
    const duration = parseFloat(extractDecompressTimeVal.getAttribute('data-duration'));
    extractDecompressTimeVal.textContent = lang === 'ar'
      ? `${duration.toFixed(1)} ملي ثانية`
      : `${duration.toFixed(1)} ms`;
  }
  const extractDecompressTimeBadge = document.getElementById('extractDecompressTimeBadge');
  if (extractDecompressTimeBadge) {
    const key = extractDecompressTimeBadge.getAttribute('data-i18n');
    if (key && TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
      extractDecompressTimeBadge.textContent = TRANSLATIONS[lang][key];
    }
  }
  const imgDecompressTimeVal = document.getElementById('imgDecompressTimeVal');
  if (imgDecompressTimeVal && imgDecompressTimeVal.getAttribute('data-duration')) {
    const duration = parseFloat(imgDecompressTimeVal.getAttribute('data-duration'));
    imgDecompressTimeVal.textContent = lang === 'ar'
      ? `${duration.toFixed(1)} ملي ثانية`
      : `${duration.toFixed(1)} ms`;
  }
  const imgExtractTimeVal = document.getElementById('imgExtractTimeVal');
  if (imgExtractTimeVal && imgExtractTimeVal.getAttribute('data-duration')) {
    const duration = parseFloat(imgExtractTimeVal.getAttribute('data-duration'));
    imgExtractTimeVal.textContent = lang === 'ar'
      ? `${duration.toFixed(1)} ملي ثانية`
      : `${duration.toFixed(1)} ms`;
  }
  const scannerTimeVal = document.getElementById('scannerTimeVal');
  if (scannerTimeVal && scannerTimeVal.getAttribute('data-duration')) {
    const duration = parseFloat(scannerTimeVal.getAttribute('data-duration'));
    scannerTimeVal.textContent = lang === 'ar'
      ? `${duration.toFixed(1)} ملي ثانية`
      : `${duration.toFixed(1)} ms`;
  }

  // Refresh metrics text count localization
  updateMetrics();
}

function applyArabicFont(font) {
  document.documentElement.setAttribute('data-arabic-font', font);
  document.querySelectorAll('.font-pill').forEach(pill => {
    pill.classList.toggle('active', pill.id === `font-btn-${font}`);
  });
}

/* ── DOM Init Logic on load ── */
document.addEventListener('DOMContentLoaded', () => {
  // Bind standard text extraction button
  if (extractBtn) {
    extractBtn.addEventListener('click', async () => {
      updateMetrics();
      await performExtraction();
      // Show the independent results panel and scroll to it
      const card = document.getElementById('extractResultCard');
      if (card && card.style.display !== 'none') {
        document.getElementById('extract-results-panel').style.display = 'block';
        setTimeout(() => document.getElementById('extract-results-panel').scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
    });
  }

  if (exCopyBtn) {
    exCopyBtn.addEventListener('click', copyResult);
  }

  /* ── Eye toggles ── */
  const exEyeToggleBtn = document.getElementById('ex-eye-toggle-btn');
  if (exEyeToggleBtn && exPresharedInput) {
    exEyeToggleBtn.addEventListener('click', () => {
      const isHidden = exPresharedInput.type === 'password';
      exPresharedInput.type = isHidden ? 'text' : 'password';
      document.getElementById('ex-eye-icon').textContent = isHidden ? 'visibility_off' : 'visibility';
    });
  }

  const exEncEyeToggleBtn = document.getElementById('ex-enc-eye-toggle-btn');
  const extractEncryptionKey = document.getElementById('extractEncryptionKey');
  if (exEncEyeToggleBtn && extractEncryptionKey) {
    exEncEyeToggleBtn.addEventListener('click', () => {
      const isHidden = extractEncryptionKey.type === 'password';
      extractEncryptionKey.type = isHidden ? 'text' : 'password';
      document.getElementById('ex-enc-eye-icon').textContent = isHidden ? 'visibility_off' : 'visibility';
    });
  }

  /* ── Input listeners for metrics ── */
  if (stegoInput) stegoInput.addEventListener('input', updateMetrics);
  if (exPresharedInput) exPresharedInput.addEventListener('input', updateMetrics);
  if (extractEncryptionKey) extractEncryptionKey.addEventListener('input', updateMetrics);

  // Initialize dark mode based on local storage persistence or system preferences
  const toggleDarkModeCheck = document.getElementById('toggle-dark-mode');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const savedTheme = localStorage.getItem('stegoTheme');

  // Determine the active theme based on explicit user setting, falling back to system preference
  let isDarkThemeActive;
  if (savedTheme === 'dark') {
    isDarkThemeActive = true;
  } else if (savedTheme === 'light') {
    isDarkThemeActive = false;
  } else {
    isDarkThemeActive = systemPrefersDark;
  }

  // Apply the active theme classes to the html element and update the toggle state
  if (isDarkThemeActive) {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
    if (toggleDarkModeCheck) toggleDarkModeCheck.checked = true;
  } else {
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
    if (toggleDarkModeCheck) toggleDarkModeCheck.checked = false;
  }

  // Setup dark mode toggle listener to persist changes
  if (toggleDarkModeCheck) {
    toggleDarkModeCheck.addEventListener('change', function () {
      const isCurrentlyChecked = this.checked;
      document.documentElement.classList.toggle('dark', isCurrentlyChecked);
      document.documentElement.classList.toggle('light', !isCurrentlyChecked);
      localStorage.setItem('stegoTheme', isCurrentlyChecked ? 'dark' : 'light');
    });
  }

  // Mark Extract tab as active in navbar safely
  const navExtract = document.getElementById('nav-extract');
  if (navExtract) {
    navExtract.style.background = 'var(--color-surface-container-high)';
    navExtract.style.color      = 'var(--color-on-surface)';
  }

  // Auto-populate stego-text AND stego-key if forwarded from Embed page
  const forwarded = localStorage.getItem('stegoTextPayload');
  if (forwarded && stegoInput) {
    stegoInput.value = forwarded;
    localStorage.removeItem('stegoTextPayload');
  }
  const forwardedKey = localStorage.getItem('stegoKeyPayload');
  if (forwardedKey) {
    if (exPresharedInput) exPresharedInput.value = forwardedKey;
    const scanPresharedField = document.getElementById('scannerPassword');
    if (scanPresharedField) {
      scanPresharedField.value = forwardedKey;
    }
    localStorage.removeItem('stegoKeyPayload');
    updateMetrics();
  }
  const forwardedEncKey = localStorage.getItem('stegoEncKeyPayload');
  if (forwardedEncKey) {
    const encField = document.getElementById('extractEncryptionKey');
    if (encField) {
      encField.value = forwardedEncKey;
    }
    const scanEncField = document.getElementById('scannerEncryptionKey');
    if (scanEncField) {
      scanEncField.value = forwardedEncKey;
    }
    localStorage.removeItem('stegoEncKeyPayload');
    updateMetrics();
  }

  // Settings modal open/close logic
  const settingsBtn = document.getElementById('top-nav-settings');
  const settingsModal = document.getElementById('settings-modal');
  const settingsBackdrop = document.getElementById('settings-modal-backdrop');
  const settingsCloseBtn = document.getElementById('settings-modal-close');

  function openSettingsModal() {
    settingsModal.style.display = 'flex';
    requestAnimationFrame(() => {
      settingsModal.classList.add('active');
      settingsBackdrop.classList.add('active');
      document.body.classList.add('settings-modal-open');
    });
    // Sync dark-mode toggle state inside modal
    const navToggle = document.getElementById('toggle-dark-mode');
    const modalToggle = document.getElementById('toggle-dark-mode-modal');
    if (navToggle && modalToggle) modalToggle.checked = navToggle.checked;
  }

  function closeSettingsModal() {
    settingsModal.classList.remove('active');
    settingsBackdrop.classList.remove('active');
    document.body.classList.remove('settings-modal-open');
    setTimeout(() => { settingsModal.style.display = 'none'; }, 300);
  }

  if (settingsBtn && settingsModal) {
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openSettingsModal();
    });
    settingsCloseBtn.addEventListener('click', closeSettingsModal);
    settingsBackdrop.addEventListener('click', closeSettingsModal);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && settingsModal.classList.contains('active')) closeSettingsModal();
    });
    // Sync modal dark-mode toggle with the nav bar toggle
    const modalDarkToggle = document.getElementById('toggle-dark-mode-modal');
    const navDarkToggle = document.getElementById('toggle-dark-mode');
    if (modalDarkToggle && navDarkToggle) {
      modalDarkToggle.addEventListener('change', () => {
        navDarkToggle.checked = modalDarkToggle.checked;
        navDarkToggle.dispatchEvent(new Event('change'));
      });
    }

    // Split Settings Modal Section Navigation switching
    const navItems = settingsModal.querySelectorAll('.settings-nav-item');
    const sections = settingsModal.querySelectorAll('.settings-section-content');
    const sectionTitle = document.getElementById('active-section-title');

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const target = item.getAttribute('data-target');
        navItems.forEach(btn => btn.classList.toggle('active', btn === item));
        sections.forEach(sec => sec.classList.toggle('active', sec.id === `section-${target}`));
        
        if (sectionTitle) {
          const spanText = item.querySelector('span:not(.material-symbols-outlined)').textContent;
          sectionTitle.textContent = spanText;
          const i18nAttr = item.querySelector('span:not(.material-symbols-outlined)').getAttribute('data-i18n');
          if (i18nAttr) sectionTitle.setAttribute('data-i18n', i18nAttr);
          else sectionTitle.removeAttribute('data-i18n');
        }
      });
    });
  }

  // Initialize Language from Storage
  const initLang = localStorage.getItem('stegoLang') || 'en';
  applyLanguage(initLang);
  const initFont = localStorage.getItem('stegoFont') || 'thmanyah';
  applyArabicFont(initFont);
});
