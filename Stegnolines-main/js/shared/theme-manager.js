// ══════════════════════════════════════════════════════════════
// Shared UX — Theme Manager Script
// ══════════════════════════════════════════════════════════════
//
// Blocking preferences check to prevent Flash of Unstyled Content (FOUC).
// Immediately sets class dark/light on <html>.
// Also initializes active settings page toggles on load.
//
// ══════════════════════════════════════════════════════════════

(function() {
  const savedTheme = localStorage.getItem('stegoTheme');
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  } else {
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
  }
})();

// Global function to synchronize theme toggles and classes
function syncThemeToggle(isDark) {
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.classList.toggle('light', !isDark);
  localStorage.setItem('stegoTheme', isDark ? 'dark' : 'light');

  const toggleDarkModeCheck = document.getElementById('toggle-dark-mode');
  const toggleDarkModeModal = document.getElementById('toggle-dark-mode-modal');

  if (toggleDarkModeCheck) toggleDarkModeCheck.checked = isDark;
  if (toggleDarkModeModal) toggleDarkModeModal.checked = isDark;
}

// Listen for system/preferences changes dynamically
function initThemeManager() {
  const currentlyDark = document.documentElement.classList.contains('dark');
  syncThemeToggle(currentlyDark);

  // Dynamic event delegation for theme switches (critical for dynamic templates)
  document.addEventListener('change', (e) => {
    if (e.target && (e.target.id === 'toggle-dark-mode' || e.target.id === 'toggle-dark-mode-modal')) {
      syncThemeToggle(e.target.checked);
    }
  });

  // Initialize language and font on load
  const savedLang = localStorage.getItem('stegoLang') || 'en';
  applyLanguageUI(savedLang);
  const savedFont = localStorage.getItem('stegoFont') || 'thmanyah';
  applyArabicFontUI(savedFont);
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
  localStorage.setItem('stegoLang', lang);
  
  // Silk-Smooth i18n Transition animation
  document.documentElement.classList.add('i18n-transition-active');
  
  setTimeout(() => {
    applyLanguageUI(lang);
    
    // Dispatch custom callbacks for specific page components if active
    if (typeof renderVisualDiff === 'function') renderVisualDiff();
    if (typeof renderHexMatrix === 'function') renderHexMatrix();
    if (typeof updateCoverMessageCounter === 'function') updateCoverMessageCounter();
    
    setTimeout(() => {
      document.documentElement.classList.remove('i18n-transition-active');
    }, 60);
  }, 220);
}

/**
 * Apply CSS class modifications for translations.
 *
 * @param {string} lang - 'en', 'ar', 'fr', 'zh', or 'la'
 */
function applyLanguageUI(lang) {
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  
  // Dynamically update active states for any lang selector buttons
  document.querySelectorAll('.lang-pill, .lang-card').forEach(btn => {
    const btnLang = btn.id.replace('lang-btn-', '');
    btn.classList.toggle('active', btnLang === lang);
  });

  const btnEn = document.getElementById('lang-btn-en');
  const btnAr = document.getElementById('lang-btn-ar');
  if (btnEn) btnEn.classList.toggle('active', lang === 'en');
  if (btnAr) btnAr.classList.toggle('active', lang === 'ar');

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
    }
  }

  // If page-specific applyLanguage exists, delegate to it
  if (typeof applyLanguage === 'function') {
    applyLanguage(lang);
  }

  // Update ChatScanner instance if present on any page
  if (window.ChatScanner && typeof window.ChatScanner.applyLanguage === 'function') {
    window.ChatScanner.applyLanguage(lang);
  }
}

/**
 * Update the Arabic font selection.
 *
 * @param {string} font - 'thmanyah' or 'alexandria'
 */
function setArabicFont(font) {
  localStorage.setItem('stegoFont', font);
  applyArabicFontUI(font);
}

/**
 * Apply the selected Arabic font stylesheet layout attributes.
 *
 * @param {string} font - 'thmanyah' or 'alexandria'
 */
function applyArabicFontUI(font) {
  document.documentElement.setAttribute('data-arabic-font', font);
  
  const modalBtnThmanyah = document.getElementById('font-btn-thmanyah');
  const modalBtnAlexandria = document.getElementById('font-btn-alexandria');
  if (modalBtnThmanyah && modalBtnAlexandria) {
    modalBtnThmanyah.classList.toggle('active', font === 'thmanyah');
    modalBtnAlexandria.classList.toggle('active', font === 'alexandria');
  }

  if (typeof applyArabicFont === 'function') {
    applyArabicFont(font);
  }
}

