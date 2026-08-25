// ══════════════════════════════════════════════════════════════
// Shared UI Helpers & Component Controllers
// ══════════════════════════════════════════════════════════════
//
// Shared routines for standard UI interactions (toasts, tabs,
// accordion, clipboard, escaping). Refactored from utils.js.
//
// ══════════════════════════════════════════════════════════════

// ── TOAST NOTIFICATIONS ───────────────────────────────────────

/**
 * Display a temporary toast notification at the bottom of the screen.
 * Removes any existing toast before showing the new one. The toast
 * auto-dismisses after 3.5 seconds.
 *
 * @param {string} message - The notification message to display.
 */
function showToast(message) {
  const wrap = document.getElementById('sec-toast-wrap');
  const currentLang = localStorage.getItem('stegoLang') || 'en';
  
  // Fallback to legacy toast if wrap is somehow missing
  if (!wrap) {
    document.querySelectorAll('.toast-msg').forEach(el => el.remove());
    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
    return;
  }

  // Prevent duplicate toasts from stacking
  const cleanMessageText = message.replace(/[❌⚠✅📋🗑🔑]/g, '').trim();
  const existingMsgs = wrap.querySelectorAll('.sec-toast__msg');
  for (const existingEl of existingMsgs) {
    if (existingEl.textContent.trim() === cleanMessageText) {
      return; // Skip duplicate identical toast
    }
  }

  // Cap active toasts to max 2
  const activeToasts = wrap.querySelectorAll('.sec-toast');
  if (activeToasts.length >= 2) {
    activeToasts[0].remove();
  }

  // Determine if it's an error or success message
  const isError = message.includes('❌') || message.includes('⚠') || message.toLowerCase().includes('error');
  
  // Clean emojis from the message for the monospace text
  const cleanMsg = message.replace(/[❌⚠✅📋🗑🔑]/g, '').trim();
  
  // Translation database for common alerts
  const toastTranslations = (typeof I18N_TOASTS !== 'undefined') ? I18N_TOASTS : {};

  // Find translation or fallback to cleanMsg
  const cleanMsgKey = cleanMsg;
  const translatedMsg = (toastTranslations[cleanMsgKey] && toastTranslations[cleanMsgKey][currentLang]) || cleanMsg;

  // Title translations
  const titleTranslations = (typeof I18N_TOAST_TITLES !== 'undefined') ? I18N_TOAST_TITLES : {};

  let titleKey = "success";
  if (isError) titleKey = "error";
  const lowerMsg = cleanMsg.toLowerCase();
  if (lowerMsg.includes('copied')) titleKey = "copied";
  if (lowerMsg.includes('extracted')) titleKey = "extract";
  if (lowerMsg.includes('please input') || lowerMsg.includes('paste')) titleKey = "missing";
  if (isError && lowerMsg.includes('key')) titleKey = "key";

  const dynamicTitle = (titleTranslations[titleKey] && titleTranslations[titleKey][currentLang]) || (titleTranslations[titleKey] ? titleTranslations[titleKey]["en"] : "Success");

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `sec-toast ${isError ? 'sec-toast--error' : 'sec-toast--success'}`;
  
  // SAFE: Build toast content programmatically (no innerHTML)
  const iconSpan = document.createElement('span');
  iconSpan.className = 'material-symbols-outlined sec-toast__icon';
  iconSpan.textContent = isError ? 'gpp_bad' : 'check_circle';

  const textWrap = document.createElement('div');

  const titleDiv = document.createElement('div');
  titleDiv.className = 'sec-toast__title';
  titleDiv.textContent = dynamicTitle;

  const msgDiv = document.createElement('div');
  msgDiv.className = 'sec-toast__msg';
  msgDiv.textContent = translatedMsg;

  textWrap.appendChild(titleDiv);
  textWrap.appendChild(msgDiv);

  // Create toast progress bar element
  const progressDiv = document.createElement('div');
  progressDiv.className = 'sec-toast__progress';
  progressDiv.style.animationDuration = '3.5s';

  toast.replaceChildren(iconSpan, textWrap, progressDiv);

  // Append to wrapper (handles multiple toasts stacking nicely)
  wrap.appendChild(toast);

  // Auto-hide and remove after 3.5 seconds
  setTimeout(() => {
    toast.classList.add('fading');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3500);
}


// ── TAB SWITCHING & CONTROLLER ─────────────────────────────────

/**
 * Scoped, clean, and robust tab controller.
 * Initializes all tab navigations on the page, hooks click events,
 * manages sliding indicators, and synchronizes with URL hashes.
 */
function initTabController() {
  const tabsNavs = document.querySelectorAll('.tabs-nav');
  if (tabsNavs.length === 0) return;

  tabsNavs.forEach(tabsNav => {
    // 1. Add sliding indicator element if missing
    let indicator = tabsNav.querySelector('.tabs-nav__indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'tabs-nav__indicator';
      tabsNav.appendChild(indicator);
    }

    const tabBtns = tabsNav.querySelectorAll('.tab-btn');
    const container = tabsNav.closest('main, body') || document.body;

    // Helper to position the sliding indicator
    function syncIndicator(activeBtn) {
      if (!indicator || !activeBtn) return;
      const left = activeBtn.offsetLeft;
      const width = activeBtn.offsetWidth;
      indicator.style.left = `${left}px`;
      indicator.style.width = `${width}px`;
    }

    // Bind click listeners to tab buttons
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetTab = btn.getAttribute('data-tab');
        if (!targetTab) return;

        // a) Update active button state within this tab navigation group only
        tabBtns.forEach(b => {
          b.classList.toggle('active', b === btn);
          b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
        });

        // b) Show the target panel and hide other panels associated with this group
        const groupTabNames = Array.from(tabBtns).map(b => b.getAttribute('data-tab'));
        groupTabNames.forEach(name => {
          const panel = container.querySelector(`#tab-${name}`);
          if (panel) {
            if (name === targetTab) {
              panel.classList.remove('hidden');
              panel.classList.add('active');
            } else {
              panel.classList.add('hidden');
              panel.classList.remove('active');
            }
          }
        });

        // c) Synchronize indicator position
        syncIndicator(btn);

        // d) Update hash without jumping page scroll
        if (window.location.hash !== `#${targetTab}`) {
          history.replaceState(null, null, `#${targetTab}`);
        }

        // e) Trigger callback for hints log rendering if the Hints tab becomes active
        if (targetTab === 'hints' && typeof renderHintsLog === 'function') {
          renderHintsLog();
        }
      });
    });

    // Initial positioning of sliding indicator and synchronization of tab panel visibility
    const activeBtn = tabsNav.querySelector('.tab-btn.active');
    if (activeBtn) {
      setTimeout(() => syncIndicator(activeBtn), 150);

      // Sync panel visibility based on activeBtn on load
      const targetTab = activeBtn.getAttribute('data-tab');
      if (targetTab) {
        const groupTabNames = Array.from(tabBtns).map(b => b.getAttribute('data-tab'));
        groupTabNames.forEach(name => {
          const panel = container.querySelector(`#tab-${name}`);
          if (panel) {
            if (name === targetTab) {
              panel.classList.add('active');
              panel.classList.remove('hidden');
            } else {
              panel.classList.remove('active');
              panel.classList.add('hidden');
            }
          }
        });
      }
    }

    // Re-align indicator on window resize
    window.addEventListener('resize', () => {
      const currentActive = tabsNav.querySelector('.tab-btn.active');
      if (currentActive) syncIndicator(currentActive);
    });
  });

  // Run initial tab selection based on URL hash
  selectTabFromHash();
}

/**
 * Switch the active tab in the UI programmatically.
 * Maintains backwards compatibility but scopes the operation to avoid bugs.
 *
 * @param {string} tabName - The tab identifier (e.g. 'text', 'image', 'standard', 'scanner', 'hints').
 */
function switchTab(tabName) {
  const targetBtn = document.querySelector(`.tabs-nav .tab-btn[data-tab="${tabName}"]`);
  if (targetBtn) {
    targetBtn.click();
  } else {
    // Fallback: manually toggle if button is not in a tabs-nav wrapper
    document.querySelectorAll('.tab-btn').forEach(button => {
      const isTarget = button.getAttribute('data-tab') === tabName;
      button.classList.toggle('active', isTarget);
      button.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    document.querySelectorAll('.tab-panel').forEach(panel => {
      const isTarget = panel.id === 'tab-' + tabName;
      if (isTarget) {
        panel.classList.remove('hidden');
        panel.classList.add('active');
      } else {
        panel.classList.add('hidden');
        panel.classList.remove('active');
      }
    });

    if (tabName === 'hints' && typeof renderHintsLog === 'function') {
      renderHintsLog();
    }
  }
}

/**
 * Switch tab based on the current window location hash.
 */
function selectTabFromHash() {
  const hash = window.location.hash.slice(1);
  if (!hash) return;

  const validTabs = ['standard', 'scanner', 'hints', 'text', 'image', 'direct', 'chat-extractor'];
  if (validTabs.includes(hash)) {
    const targetBtn = document.querySelector(`.tabs-nav .tab-btn[data-tab="${hash}"]`);
    if (targetBtn) {
      // Click the button to toggle panels, update active classes and sliding indicators
      targetBtn.click();
      
      const mainHeader = document.querySelector('.main-header');
      if (mainHeader) {
        mainHeader.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }
}


// ── CLIPBOARD ─────────────────────────────────────────────────

/**
 * Copy the text content of a DOM element to the clipboard.
 * Works with both form elements (uses `.value`) and regular
 * elements (uses `.textContent`). Shows a toast on success or failure.
 *
 * @param {string} elementId - The ID of the DOM element to copy from.
 */
function copyToClipboard(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return showToast('⚠ Element not found.');

  const text = element.value || element.textContent;

  if (!text) return showToast('⚠ Nothing to copy.');

  navigator.clipboard.writeText(text).then(
    () => showToast('📋 Copied!'),
    () => showToast('❌ Copy failed.')
  );
}


// ── COPY TO EXTRACT TAB ──────────────────────────────────────

/**
 * Copy the stego-object and stego-key to the extraction tab.
 */
function copyToExtractTab() {
  const stegoTextEl = document.getElementById('stegoText');
  const stegoText = stegoTextEl ? stegoTextEl.value : '';
  if (!stegoText) return showToast('⚠ No final output to copy.');

  const stegoKeyEl = document.getElementById('embedStegoKey');
  const stegoKey = stegoKeyEl ? stegoKeyEl.value : '';
  const encKeyEl = document.getElementById('embedEncryptionKey');
  const encKey = encKeyEl ? encKeyEl.value : '';

  // Switch to the extraction tab and populate the fields
  switchTab('extract');

  const exCoverEl = document.getElementById('extractCover');
  if (exCoverEl) exCoverEl.value = stegoText;

  const exKeyEl = document.getElementById('extractStegoKey');
  if (exKeyEl) exKeyEl.value = stegoKey;
  
  const extractEncKeyEl = document.getElementById('extractEncryptionKey');
  if (extractEncKeyEl) {
    extractEncKeyEl.value = encKey;
  }

  showToast('📋 Output and keys copied to extraction page!');
}


// ── HTML ESCAPING (XSS Prevention) ────────────────────────────

/**
 * Escape a string to prevent XSS when inserting into HTML.
 *
 * @param {string} str - The raw string to escape.
 * @returns {string} The HTML-escaped string.
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}


// ── TOGGLE DETAILS ────────────────────────────────────────────

/**
 * Self-contained module for toggling the detail sections.
 */
const DetailsToggle = (function () {
  let isVisible = false;

  function toggle() {
    isVisible = !isVisible;
    const accordion = document.querySelector('.diag-accordion');
    if (accordion) {
      accordion.classList.toggle('open', isVisible);
      
      // Auto-scroll/Focus on content when opened
      if (isVisible) {
        accordion.classList.remove('scanner-card-focus-pulse');
        void accordion.offsetWidth;
        accordion.classList.add('scanner-card-focus-pulse');
        setTimeout(() => accordion.classList.remove('scanner-card-focus-pulse'), 850);

        setTimeout(() => {
          const yOffset = -90;
          const y = accordion.getBoundingClientRect().top + window.scrollY + yOffset;
          window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
          
          // Lock accordion textareas' min-height once they become visible
          accordion.querySelectorAll('textarea').forEach(textarea => {
            if (textarea.clientHeight > 0 && !textarea.style.minHeight) {
              textarea.style.minHeight = textarea.clientHeight + 'px';
            }
          });
        }, 150);
      }
    }
  }

  return { toggle };
})();

// Global alias for backward compatibility with HTML onclick attributes
function toggleDetails() {
  DetailsToggle.toggle();
}

/**
 * Animates a counter from zero to a specified target value.
 * @param {HTMLElement} element - The DOM element containing the text to animate.
 * @param {number} targetValue - The final target value.
 * @param {string} suffix - Optional text suffix (e.g. '%', ' chars').
 * @param {number} duration - Animation duration in ms (default: 1000).
 */
function animateCounter(element, targetValue, suffix = '', duration = 1000) {
  if (!element) return;
  let startTime = null;
  const startValue = 0;

  function update(currentTime) {
    if (!startTime) startTime = currentTime;
    const progress = Math.min((currentTime - startTime) / duration, 1);
    const easeProgress = progress * (2 - progress); // easeOutQuad
    const currentValue = Math.floor(easeProgress * (targetValue - startValue) + startValue);
    
    element.textContent = currentValue + suffix;
    
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = targetValue + suffix;
    }
  }
  
  requestAnimationFrame(update);
}

// ── SCROLL TO TOP FLOATING BUTTON ────────────────────────────

/**
 * Initialize a scroll-to-top button that appears dynamically on scroll
 * and smooth-scrolls the window back to top. Supports dynamic i18n tooltips.
 */
function initScrollToTop() {
  if (document.querySelector('.scroll-to-top-btn')) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'scroll-to-top-btn';
  btn.setAttribute('data-i18n-tooltip', 'scrollToTopTooltip');

  // Set initial localized tooltip safely
  const currentLang = localStorage.getItem('stegoLang') || 'en';
  const dict = (typeof translations !== 'undefined') ? translations : ((typeof TRANSLATIONS !== 'undefined') ? TRANSLATIONS : null);
  let tooltipText = 'Scroll to Top';
  if (dict && dict[currentLang] && dict[currentLang]['scrollToTopTooltip']) {
    tooltipText = dict[currentLang]['scrollToTopTooltip'];
  } else if (currentLang === 'ar') {
    tooltipText = 'العودة للأعلى';
  }
  btn.setAttribute('data-tooltip', tooltipText);
  btn.setAttribute('aria-label', tooltipText);

  // Material symbols arrow icon
  const icon = document.createElement('span');
  icon.className = 'material-symbols-outlined';
  icon.textContent = 'arrow_upward';
  btn.appendChild(icon);

  document.body.appendChild(btn);

  // Track scroll position to toggle visibility
  const threshold = 300;
  window.addEventListener('scroll', () => {
    if (window.scrollY > threshold) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  });

  // Handle smooth scroll back to top
  btn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

// ── DEFENSIVE UX: AUTO-LOCK TEXTAREA MIN-HEIGHT ────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Initialize unified tab controller
  initTabController();

  // Initialize Scroll to Top button
  initScrollToTop();

  setTimeout(() => {
    document.querySelectorAll('textarea').forEach(textarea => {
      if (textarea.clientHeight > 0 && !textarea.style.minHeight) {
        textarea.style.minHeight = textarea.clientHeight + 'px';
      }
    });
  }, 100);

  // Hash-based Tab Routing listeners
  window.addEventListener('hashchange', selectTabFromHash);
});

/**
 * Retrieve the translated label for "chars" from the active translations dictionary.
 * Fallback to English "chars" if not found or translation is missing.
 * 
 * @returns {string}
 */
function getCharsLabel() {
  const dict = (typeof window.translations !== 'undefined') ? window.translations : ((typeof translations !== 'undefined') ? translations : null);
  const lang = localStorage.getItem('stegoLang') || 'en';
  return (dict && dict[lang] && dict[lang].charsLabel) ? dict[lang].charsLabel : 'chars';
}

// ── PROJECT-WIDE EMOJI INPUT VALIDATION ───────────────────────

/**
 * Detects if a string contains any emoji character using Unicode Extended_Pictographic.
 * @param {string} str - Input text string.
 * @returns {boolean} True if emoji is found, false otherwise.
 */
function containsEmoji(str) {
  if (!str) return false;
  try {
    return /\p{Extended_Pictographic}/u.test(str);
  } catch (e) {
    return /[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(str);
  }
}

/**
 * Validates a list of input fields for emojis.
 * Shows an explicit error toast message, adds visual error highlights, and focuses the field if an emoji is found.
 *
 * @param {Array<{el: HTMLElement|string, name: {en: string, ar: string, fr?: string, zh?: string, la?: string}}>} fields
 * @returns {boolean} True if an emoji error was found (validation failed), false if clean.
 */
function validateEmojiInputs(fields) {
  const currentLang = localStorage.getItem('stegoLang') || 'en';
  for (const item of fields) {
    const el = typeof item.el === 'string' ? document.getElementById(item.el) : item.el;
    if (!el) continue;
    
    const val = el.value || '';
    if (containsEmoji(val)) {
      const targetWrap = el.closest('.cover-editor') || el;
      targetWrap.classList.add('form-input--error');
      setTimeout(() => targetWrap.classList.remove('form-input--error'), 4000);
      
      el.focus();
      
      const nameObj = item.name || {};
      const fieldName = nameObj[currentLang] || nameObj['en'] || (currentLang === 'ar' ? 'المدخل' : 'Input');
      
      let msg;
      if (currentLang === 'ar') {
        msg = `❌ خطأ: لا يُسمح بأحرف الإيموجي (Emojis) في المدخلات! يرجى إزالة الرموز التعبيرية من (${fieldName}).`;
      } else if (currentLang === 'fr') {
        msg = `❌ Erreur : Les émojis ne sont pas autorisés dans les saisies ! Veuillez les supprimer de (${fieldName}).`;
      } else if (currentLang === 'zh') {
        msg = `❌ 错误：输入中不允许使用表情符号！请从 (${fieldName}) 中删除表情符号。`;
      } else if (currentLang === 'la') {
        msg = `❌ Error: Emojis in intritis non permittuntur! Delere emojis ex (${fieldName}).`;
      } else {
        msg = `❌ Error: Emojis are not allowed in inputs! Please remove emojis from (${fieldName}).`;
      }
      
      showToast(msg);
      return true; // Indicates emoji error found
    }
  }
  return false; // All clear
}

/**
 * Attaches real-time live input validation to flag inputs when emojis are typed or pasted.
 */
function initLiveEmojiValidation() {
  const inputs = document.querySelectorAll('input[type="text"], input[type="password"], textarea, .form-input, .form-textarea');
  inputs.forEach(input => {
    if (input.dataset.emojiValidated) return;
    input.dataset.emojiValidated = 'true';
    
    const checkLive = () => {
      if (containsEmoji(input.value)) {
        const targetWrap = input.closest('.cover-editor') || input;
        targetWrap.classList.add('form-input--error');
      } else {
        const targetWrap = input.closest('.cover-editor') || input;
        targetWrap.classList.remove('form-input--error');
      }
    };
    
    input.addEventListener('input', checkLive);
    input.addEventListener('blur', checkLive);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initLiveEmojiValidation();
});

// Export functions globally
window.containsEmoji = containsEmoji;
window.validateEmojiInputs = validateEmojiInputs;
window.initLiveEmojiValidation = initLiveEmojiValidation;


