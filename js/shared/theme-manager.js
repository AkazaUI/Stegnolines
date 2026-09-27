// ══════════════════════════════════════════════════════════════
// Shared UX — Theme & System Preferences Manager
// ══════════════════════════════════════════════════════════════
//
// Blocking preferences check to prevent Flash of Unstyled Content (FOUC).
// Immediately sets class dark/light on <html>.
// Manages themes (dark/light/system), languages, typography, and storage stats.
//
// ══════════════════════════════════════════════════════════════

(function() {
  try {
    const path = window.location.pathname.toLowerCase();
    const match = path.match(/^\/(en|ar|fr|zh|la)(\/|$)/);
    if (match) {
      const routeLang = match[1];
      localStorage.setItem('stegoLang', routeLang);
      document.documentElement.setAttribute('lang', routeLang);
      document.documentElement.setAttribute('dir', routeLang === 'ar' ? 'rtl' : 'ltr');
    } else {
      const urlParams = new URLSearchParams(window.location.search);
      const paramLang = urlParams.get('lang');
      if (paramLang && (paramLang === 'ar' || paramLang === 'en' || paramLang === 'fr' || paramLang === 'zh' || paramLang === 'la')) {
        localStorage.setItem('stegoLang', paramLang);
        document.documentElement.setAttribute('lang', paramLang);
        document.documentElement.setAttribute('dir', paramLang === 'ar' ? 'rtl' : 'ltr');
      }
    }
  } catch (e) {}
  const savedTheme = localStorage.getItem('stegoTheme') || 'system';
  applyThemeByMode(savedTheme);
})();

function applyThemeByMode(mode) {
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  let isDark = false;

  if (mode === 'dark') {
    isDark = true;
  } else if (mode === 'light') {
    isDark = false;
  } else {
    // system auto
    isDark = systemPrefersDark;
  }

  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.classList.toggle('light', !isDark);
  document.documentElement.setAttribute('data-theme-mode', mode);

  // Sync checkboxes
  const toggleDarkModeCheck = document.getElementById('toggle-dark-mode');
  const toggleDarkModeModal = document.getElementById('toggle-dark-mode-modal');
  if (toggleDarkModeCheck) toggleDarkModeCheck.checked = isDark;
  if (toggleDarkModeModal) toggleDarkModeModal.checked = isDark;

  // Sync theme mode preview cards
  document.querySelectorAll('.theme-card').forEach(card => {
    const cardMode = card.id.replace('theme-btn-', '');
    card.classList.toggle('active', cardMode === mode);
  });
}

function setThemeMode(mode) {
  localStorage.setItem('stegoTheme', mode);
  applyThemeByMode(mode);
}

// Global function to synchronize theme toggles (checkboxes)
function syncThemeToggle(isDark) {
  setThemeMode(isDark ? 'dark' : 'light');
}

// Listen for system/preferences changes dynamically
function initThemeManager() {
  const savedTheme = localStorage.getItem('stegoTheme') || 'system';
  applyThemeByMode(savedTheme);

  // Watch system color scheme changes if mode is 'system'
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const currentMode = localStorage.getItem('stegoTheme') || 'system';
    if (currentMode === 'system') {
      applyThemeByMode('system');
    }
  });

  // Dynamic event delegation for theme switches
  document.addEventListener('change', (e) => {
    if (e.target && (e.target.id === 'toggle-dark-mode' || e.target.id === 'toggle-dark-mode-modal')) {
      syncThemeToggle(e.target.checked);
    }
  });

  // Initialize language, font, and storage stats
  const path = window.location.pathname.toLowerCase();
  const match = path.match(/^\/(en|ar|fr|zh|la)(\/|$)/);
  let activeLang = 'en';

  if (match) {
    // 1. Physical subfolder route (/ar/, /fr/, etc.) has highest priority
    activeLang = match[1];
  } else {
    // 2. Query param (?lang=) takes priority for incoming shared links
    const urlParams = new URLSearchParams(window.location.search);
    const paramLang = urlParams.get('lang');
    const savedLang = localStorage.getItem('stegoLang');

    if (paramLang && ['ar', 'en', 'fr', 'zh', 'la'].includes(paramLang)) {
      activeLang = paramLang;
    } else if (savedLang && ['ar', 'en', 'fr', 'zh', 'la'].includes(savedLang)) {
      // 3. User's saved preference in localStorage takes priority when returning to root
      activeLang = savedLang;
    } else {
      // 4. Default to document lang attribute or 'en'
      const docLang = document.documentElement.getAttribute('lang');
      activeLang = (docLang && ['ar', 'en', 'fr', 'zh', 'la'].includes(docLang)) ? docLang : 'en';
    }
  }

  localStorage.setItem('stegoLang', activeLang);

  // If the document is already pre-rendered statically with this language,
  // DO NOT overwrite DOM text with client-side translation!
  const currentDocLang = document.documentElement.getAttribute('lang');
  const isSsgRendered = document.documentElement.getAttribute('data-ssg-rendered') === 'true' && currentDocLang === activeLang;

  if (isSsgRendered) {
    updateLanguageControlsOnly(activeLang);
  } else {
    applyLanguageUI(activeLang);
  }
  
  let savedFont = localStorage.getItem('stegoFont') || 'cairo';
  if (savedFont === 'thmanyah') {
    savedFont = 'cairo';
    localStorage.setItem('stegoFont', 'cairo');
  }
  applyArabicFontUI(savedFont);

  updateStorageFootprintUI();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initThemeManager);
} else {
  initThemeManager();
}

// ── GLOBAL PREFERENCES MANAGER ──

/**
 * Update the application UI language.
 *
 * @param {string} lang - 'en', 'ar', 'fr', 'zh', or 'la'
 */
function setLanguage(lang) {
  // 1. Trigger smooth fade/blur transition animation
  document.documentElement.classList.add('i18n-transition-active');

  setTimeout(() => {
    // 2. Persist chosen language in localStorage
    localStorage.setItem('stegoLang', lang);

    // 3. Instant real-time in-memory translation (DOM switch)
    applyLanguageUI(lang);

    // 4. Synchronize URL search parameter (?lang=) without page reload
    try {
      const url = new URL(window.location.href);
      if (lang === 'en') {
        url.searchParams.delete('lang');
      } else {
        url.searchParams.set('lang', lang);
      }
      window.history.replaceState({}, '', url.toString());
    } catch (e) {}

    // 5. Dispatch custom callbacks for specific page components if active
    if (typeof renderVisualDiff === 'function') renderVisualDiff();
    if (typeof renderHexMatrix === 'function') renderHexMatrix();
    if (typeof updateCoverMessageCounter === 'function') updateCoverMessageCounter();
    
    // 6. Smoothly remove transition class after content updates
    setTimeout(() => {
      document.documentElement.classList.remove('i18n-transition-active');
    }, 150);
  }, 100);
}

function updateLanguageControlsOnly(lang) {
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

  document.querySelectorAll('.lang-pill, .lang-card').forEach(btn => {
    const btnLang = btn.id.replace('lang-btn-', '');
    btn.classList.toggle('active', btnLang === lang);
  });

  const arFontToggle = document.getElementById('ar-font-toggle-wrap');
  if (arFontToggle) {
    arFontToggle.style.display = lang === 'ar' ? 'flex' : 'none';
  }

  if (window.ChatScanner && typeof window.ChatScanner.applyLanguage === 'function') {
    window.ChatScanner.applyLanguage(lang);
  }

  if (typeof window.translateInjectedTemplates === 'function') {
    window.translateInjectedTemplates(lang);
  }
}

/**
 * Apply CSS class modifications and translate UI elements for the given language.
 *
 * @param {string} lang - 'en', 'ar', 'fr', 'zh', or 'la'
 */
function applyLanguageUI(lang) {
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  
  // Dynamically update active states for any lang selector buttons/cards
  document.querySelectorAll('.lang-pill, .lang-card').forEach(btn => {
    const btnLang = btn.id.replace('lang-btn-', '');
    btn.classList.toggle('active', btnLang === lang);
  });

  const arFontToggle = document.getElementById('ar-font-toggle-wrap');
  if (arFontToggle) {
    arFontToggle.style.display = lang === 'ar' ? 'flex' : 'none';
  }

  // If page-specific applyLanguage exists, delegate to it
  if (typeof applyLanguage === 'function') {
    applyLanguage(lang);
  } else {
    // Translate all tags bearing [data-i18n] on page
    const dict = (typeof translations !== 'undefined') ? translations : ((typeof TRANSLATIONS !== 'undefined') ? TRANSLATIONS : null);
    if (dict && dict[lang]) {
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[lang][key]) {
          const hasIcon = el.querySelector('.material-symbols-outlined');
          if (hasIcon) {
            el.childNodes.forEach(child => {
              if (child.nodeType === Node.TEXT_NODE && child.textContent.trim().length > 0) {
                child.textContent = dict[lang][key];
              }
            });
          } else {
            el.textContent = dict[lang][key];
          }
        }
      });

      document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (dict[lang][key]) {
          el.setAttribute('placeholder', dict[lang][key]);
        }
      });

      document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (dict[lang][key]) {
          el.setAttribute('title', dict[lang][key]);
        }
      });

      document.querySelectorAll('[data-i18n-tooltip]').forEach(el => {
        const key = el.getAttribute('data-i18n-tooltip');
        if (dict[lang][key]) {
          el.setAttribute('data-tooltip', dict[lang][key]);
        }
      });

      // Dynamically update document title & meta description for SEO & AEO
      const pageTitleKey = document.querySelector('h1[data-i18n]')?.getAttribute('data-i18n');
      if (pageTitleKey && dict[lang] && dict[lang][pageTitleKey]) {
        const brandName = lang === 'ar' ? 'السطور المخفية — ' : 'StegoLines — ';
        document.title = brandName + dict[lang][pageTitleKey];
      }
      const pageDescKey = document.querySelector('p[data-i18n]')?.getAttribute('data-i18n');
      if (pageDescKey && dict[lang] && dict[lang][pageDescKey]) {
        const metaDescEl = document.querySelector('meta[name="description"]');
        if (metaDescEl) {
          metaDescEl.setAttribute('content', dict[lang][pageDescKey]);
        }
      }
    }
  }

  // Update ChatScanner instance if present on any page
  if (window.ChatScanner && typeof window.ChatScanner.applyLanguage === 'function') {
    window.ChatScanner.applyLanguage(lang);
  }

  if (typeof window.translateInjectedTemplates === 'function') {
    window.translateInjectedTemplates(lang);
  }
}

/**
 * Update the Arabic font selection.
 *
 * @param {string} font - 'cairo' or 'alexandria'
 */
function setArabicFont(font) {
  if (font === 'thmanyah') font = 'cairo';
  localStorage.setItem('stegoFont', font);
  applyArabicFontUI(font);
}

/**
 * Apply the selected Arabic font stylesheet layout attributes.
 *
 * @param {string} font - 'cairo' or 'alexandria'
 */
function applyArabicFontUI(font) {
  if (font === 'thmanyah') font = 'cairo';
  document.documentElement.setAttribute('data-arabic-font', font);
  
  document.querySelectorAll('.font-card').forEach(card => {
    const cardFont = card.id.replace('font-card-', '');
    card.classList.toggle('active', cardFont === font);
  });

  const modalBtnCairo = document.getElementById('font-btn-cairo') || document.getElementById('font-btn-thmanyah');
  const modalBtnAlexandria = document.getElementById('font-btn-alexandria');
  if (modalBtnCairo) {
    modalBtnCairo.classList.toggle('active', font === 'cairo');
  }
  if (modalBtnAlexandria) {
    modalBtnAlexandria.classList.toggle('active', font === 'alexandria');
  }

  if (typeof applyArabicFont === 'function') {
    applyArabicFont(font);
  }
}

/**
 * Update Local Storage footprint display in settings.
 */
function updateStorageFootprintUI() {
  const usageEl = document.getElementById('settings-storage-usage-text');
  const countEl = document.getElementById('settings-storage-count-text');
  if (!usageEl && !countEl) return;

  let totalBytes = 0;
  let itemCount = 0;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const val = localStorage.getItem(key) || '';
      totalBytes += (key.length + val.length) * 2; // UTF-16 approx
      itemCount++;
    }
  } catch (e) {
    // ignore
  }

  const kb = (totalBytes / 1024).toFixed(1);
  if (usageEl) usageEl.textContent = `${kb} KB`;
  if (countEl) countEl.textContent = `${itemCount} items`;
}

/**
 * Reset all stored application preferences and clear local storage.
 */
function resetAllSettingsPreferences() {
  if (typeof showCustomConfirm === 'function') {
    const lang = localStorage.getItem('stegoLang') || 'en';
    const isAr = lang === 'ar';
    showCustomConfirm(
      isAr ? 'إعادة ضبط التفضيلات' : 'Reset Preferences',
      isAr ? 'هل أنت متأكد من رغبتك في إعادة ضبط جميع التفضيلات وحذف البيانات المخزنة محلياً؟' : 'Are you sure you want to reset all preferences and clear local cache?',
      () => {
        localStorage.clear();
        setLanguage('en');
        setThemeMode('system');
        setArabicFont('cairo');
        updateStorageFootprintUI();
        if (typeof showToast === 'function') {
          showToast(isAr ? 'تمت إعادة ضبط التفضيلات بنجاح' : 'Preferences reset successfully', 'success');
        }
      }
    );
  } else {
    localStorage.clear();
    setLanguage('en');
    setThemeMode('system');
    setArabicFont('cairo');
    updateStorageFootprintUI();
  }
}
