// ══════════════════════════════════════════════════════════════
// Shared UX — Dynamic Path-Aware Template Loader
// ══════════════════════════════════════════════════════════════
//
// Dynamically builds and injects the premium shared navigation header,
// footer, and settings modal panels. Automatically resolves nested
// document subdirectory paths for offline file:// and standard servers.
//
// ══════════════════════════════════════════════════════════════

(function() {
  // Inject custom CSS styles for the Policies tab controls
  const styles = `
    .btn-reset-policy-custom {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      font-size: 0.72rem;
      font-weight: 600;
      font-family: inherit;
      background: rgba(239, 68, 68, 0.06);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      white-space: nowrap;
    }
    .btn-reset-policy-custom:hover {
      background: #ef4444;
      color: #ffffff;
      border-color: #ef4444;
      transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(239, 68, 68, 0.25);
    }
    .btn-reset-policy-custom:active {
      transform: translateY(0);
    }
    html[dir="rtl"] .btn-reset-policy-custom {
      flex-direction: row-reverse;
    }
    
    /* Ensure custom select fits well in settings-row__control */
    #settingsHintsStorageWrapper {
      position: relative;
      width: 220px;
    }
    
    #settingsHintsStorageTrigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      background: var(--color-surface-container-high);
      color: var(--color-on-surface);
      border: 1px solid var(--color-outline-variant);
      border-radius: var(--radius-sm);
      padding: 6px 12px;
      font-size: var(--fs-body-sm);
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    #settingsHintsStorageTrigger:hover {
      border-color: var(--color-primary);
    }
    
    #settingsHintsStorageOptions {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--color-surface-container-high);
      border: 1px solid var(--color-outline-variant);
      border-radius: var(--radius-sm);
      margin-top: 4px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 100;
      display: none;
    }
    #settingsHintsStorageOptions.open {
      display: block;
    }
    
    /* Policy Reset Card hover effect */
    .policy-reset-card:hover {
      background: rgba(187, 209, 0, 0.05) !important;
      border-color: rgba(187, 209, 0, 0.25) !important;
    }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);

  // ── Path Prefix Resolver (Critical for nested /docs/ & /Scanner feature/ folders) ──
  function getPathPrefix() {
    const href = window.location.href.replace(/\\/g, '/');
    if (href.includes('/docs/getting-started/') || 
        href.includes('/docs/user-guide/') || 
        href.includes('/docs/technical-reference/') || 
        href.includes('/docs/development/')) {
      return '../../';
    } else if (href.includes('/docs/') || href.includes('/Scanner feature/') || href.includes('/Scanner%20feature/')) {
      return '../';
    }
    return '';
  }

  const prefix = getPathPrefix();

  // ── HTML Navbar Template Builder ──
  function buildNavbarHtml() {
    return `
      <div class="top-nav__inner">
        <!-- Brand logo -->
        <a class="top-nav__brand" href="${prefix}index.html" id="brand-link">
          <img class="top-nav__brand-logo top-nav__brand-logo--light" src="${prefix}assets/brand/logo-dark.png" alt="STEGNOLINES" onerror="this.style.display='none'"/>
          <img class="top-nav__brand-logo top-nav__brand-logo--dark" src="${prefix}assets/brand/logo-light.png" alt="STEGNOLINES" onerror="this.style.display='none'"/>
        </a>

        <!-- Desktop Navigation Links -->
        <nav class="top-nav__links" id="desktop-nav">
          <div class="top-nav__dropdown" id="nav-embed-dropdown">
            <button class="top-nav__dropdown-trigger" id="nav-embed" aria-expanded="false" aria-haspopup="true">
              <span class="material-symbols-outlined">lock</span>
              <span class="text-label-md" data-i18n="navEmbed">Embed</span>
              <span class="material-symbols-outlined top-nav__dropdown-chevron">expand_more</span>
            </button>
            <div class="top-nav__dropdown-panel" id="embed-dropdown-panel">
              <a class="top-nav__dropdown-item" href="${prefix}index.html#text" data-tab="text">
                <div class="top-nav__dropdown-item-icon">
                  <span class="material-symbols-outlined">description</span>
                </div>
                <div class="top-nav__dropdown-item-text">
                  <span class="top-nav__dropdown-item-title" data-i18n="emTabText">Text Embed</span>
                  <span class="top-nav__dropdown-item-desc" data-i18n="navDropdownTextDesc">Conceal secret text inside cover text</span>
                </div>
              </a>
              <a class="top-nav__dropdown-item" href="${prefix}index.html#image" data-tab="image">
                <div class="top-nav__dropdown-item-icon">
                  <span class="material-symbols-outlined">image</span>
                </div>
                <div class="top-nav__dropdown-item-text">
                  <span class="top-nav__dropdown-item-title" data-i18n="emTabImage">Image Embed</span>
                  <span class="top-nav__dropdown-item-desc" data-i18n="navDropdownImageDesc">Hide a mini image inside cover text</span>
                </div>
              </a>
            </div>
          </div>

          <div class="top-nav__dropdown" id="nav-extract-dropdown">
            <button class="top-nav__dropdown-trigger" id="nav-extract" aria-expanded="false" aria-haspopup="true">
              <span class="material-symbols-outlined">lock_open</span>
              <span class="text-label-md" data-i18n="navExtract">Extract</span>
              <span class="material-symbols-outlined top-nav__dropdown-chevron">expand_more</span>
            </button>
            <div class="top-nav__dropdown-panel" id="extract-dropdown-panel">
              <a class="top-nav__dropdown-item" href="${prefix}extract.html#standard" data-tab="standard">
                <div class="top-nav__dropdown-item-icon">
                  <span class="material-symbols-outlined">screen_search_desktop</span>
                </div>
                <div class="top-nav__dropdown-item-text">
                  <span class="top-nav__dropdown-item-title" data-i18n="exTabStandard">Standard Extract</span>
                  <span class="top-nav__dropdown-item-desc" data-i18n="navDropdownStandardDesc">Decrypt with key & params</span>
                </div>
              </a>
              <a class="top-nav__dropdown-item" href="${prefix}extract.html#scanner" data-tab="scanner">
                <div class="top-nav__dropdown-item-icon">
                  <span class="material-symbols-outlined">cell_tower</span>
                </div>
                <div class="top-nav__dropdown-item-text">
                  <span class="top-nav__dropdown-item-title" data-i18n="exTabScanner">Scanner</span>
                  <span class="top-nav__dropdown-item-desc" data-i18n="navDropdownScannerDesc">Scan chat history for secrets</span>
                </div>
              </a>
              <a class="top-nav__dropdown-item" href="${prefix}extract.html#hints" data-tab="hints">
                <div class="top-nav__dropdown-item-icon">
                  <span class="material-symbols-outlined">lightbulb</span>
                </div>
                <div class="top-nav__dropdown-item-text">
                  <span class="top-nav__dropdown-item-title" data-i18n="exTabHints">Hints</span>
                  <span class="top-nav__dropdown-item-desc" data-i18n="navDropdownHintsDesc">View stego hints log</span>
                </div>
              </a>
              <a class="top-nav__dropdown-item" href="${prefix}extract.html#image" data-tab="image">
                <div class="top-nav__dropdown-item-icon">
                  <span class="material-symbols-outlined">image</span>
                </div>
                <div class="top-nav__dropdown-item-text">
                  <span class="top-nav__dropdown-item-title" data-i18n="exTabImage">Image Extract</span>
                  <span class="top-nav__dropdown-item-desc" data-i18n="navDropdownImageDesc">Reveal hidden image payload</span>
                </div>
              </a>
            </div>
          </div>

          <a class="top-nav__link" href="${prefix}steganalysis.html" id="nav-steganalysis">
            <span class="material-symbols-outlined">search_insights</span>
            <span class="text-label-md" data-i18n="navSteganalysis">Text Steganalysis</span>
          </a>

          <a class="top-nav__link" href="${prefix}documentation.html" id="nav-docs">
            <span class="material-symbols-outlined">help</span>
            <span class="text-label-md" data-i18n="navDocs">Documentation</span>
          </a>
        </nav>

        <!-- Dynamic theme toggle / Preferences Trigger button -->
        <div class="top-nav__actions">
          <input type="checkbox" id="toggle-dark-mode" style="display: none !important;" />
          <button class="icon-btn" id="top-nav-settings" aria-label="Settings" title="Settings">
            <span class="material-symbols-outlined">settings</span>
          </button>
        </div>

        <!-- Hamburger (Mobile layout) -->
        <button class="top-nav__hamburger" id="hamburger-btn" aria-label="Open menu">
          <span class="material-symbols-outlined">menu</span>
        </button>
      </div>

      <!-- Mobile Navigation Drawer -->
      <div class="top-nav__mobile-menu" id="mobile-menu">
        <button class="top-nav__link" id="mobile-embed-toggle" aria-expanded="false" type="button" style="border:none; background:none; width:100%; cursor:pointer; display:flex; align-items:center;">
          <span class="material-symbols-outlined">lock</span>
          <span class="text-label-md" data-i18n="navEmbed" style="margin-inline-start: 8px;">Embed</span>
          <span class="material-symbols-outlined" style="margin-inline-start: auto;">expand_more</span>
        </button>
        <div class="top-nav__mobile-dropdown-items" id="mobile-embed-items">
          <a class="top-nav__link" href="${prefix}index.html#text" data-tab="text" data-i18n="emTabText">Text Embed</a>
          <a class="top-nav__link" href="${prefix}index.html#image" data-tab="image" data-i18n="emTabImage">Image Embed</a>
        </div>

        <button class="top-nav__link" id="mobile-extract-toggle" aria-expanded="false" type="button" style="border:none; background:none; width:100%; cursor:pointer; display:flex; align-items:center; margin-top:12px;">
          <span class="material-symbols-outlined">lock_open</span>
          <span class="text-label-md" data-i18n="navExtract" style="margin-inline-start: 8px;">Extract</span>
          <span class="material-symbols-outlined" style="margin-inline-start: auto;">expand_more</span>
        </button>
        <div class="top-nav__mobile-dropdown-items" id="mobile-extract-items">
          <a class="top-nav__link" href="${prefix}extract.html#standard" data-tab="standard" data-i18n="exTabStandard">Standard Extract</a>
          <a class="top-nav__link" href="${prefix}extract.html#scanner" data-tab="scanner" data-i18n="exTabScanner">Scanner</a>
          <a class="top-nav__link" href="${prefix}extract.html#hints" data-tab="hints" data-i18n="exTabHints">Hints</a>
          <a class="top-nav__link" href="${prefix}extract.html#image" data-tab="image" data-i18n="exTabImage">Image Extract</a>
        </div>

        <a class="top-nav__link" href="${prefix}steganalysis.html" style="margin-top:12px; display:flex; align-items:center;">
          <span class="material-symbols-outlined" style="margin-inline-end: 8px;">search_insights</span>
          <span class="text-label-md" data-i18n="navSteganalysis">Text Steganalysis</span>
        </a>

        <a class="top-nav__link" href="${prefix}documentation.html" style="margin-top:12px; display:flex; align-items:center;">
          <span class="material-symbols-outlined" style="margin-inline-end: 8px;">help</span>
          <span class="text-label-md" data-i18n="navDocs">Documentation</span>
        </a>
      </div>
    `;
  }


  // ── HTML Footer Template Builder ──
  function buildFooterHtml() {
    return `
      <div class="main-footer__inner">
        <!-- Brand / Intro Column -->
        <div class="main-footer__brand">
          <div class="main-footer__title" data-i18n="footerTitle">STEGNOLINES</div>
          <p class="text-body-sm" data-i18n="footerSubtitle">
            Advanced Zero-Overhead Contextual Steganography and Cryptography for secure transmission.
          </p>
        </div>
        
        <!-- Multi-column links group -->
        <div class="main-footer__cols-group">
          <!-- EMBED Column -->
          <div class="main-footer__col">
            <div class="main-footer__col-title" data-i18n="footerColEmbed">EMBED</div>
            <ul class="main-footer__col-links">
              <li><a href="${prefix}index.html#text" class="main-footer__link" data-i18n="footerEmbedText">Text Steganography</a></li>
              <li><a href="${prefix}index.html#image" class="main-footer__link" data-i18n="footerEmbedImage">Image Steganography</a></li>
            </ul>
          </div>
          
          <!-- EXTRACT Column -->
          <div class="main-footer__col">
            <div class="main-footer__col-title" data-i18n="footerColExtract">EXTRACT</div>
            <ul class="main-footer__col-links">
              <li><a href="${prefix}extract.html#standard" class="main-footer__link" data-i18n="footerExtractStandard">Standard Extract</a></li>
              <li><a href="${prefix}extract.html#scanner" class="main-footer__link" data-i18n="footerExtractScanner">Chat Scanner</a></li>
              <li><a href="${prefix}extract.html#hints" class="main-footer__link" data-i18n="footerExtractHints">Stego Hints Log</a></li>
              <li><a href="${prefix}extract.html#image" class="main-footer__link" data-i18n="footerExtractImage">Image Payload Recovery</a></li>
            </ul>
          </div>
          
          <!-- STEGANALYSIS Column -->
          <div class="main-footer__col">
            <div class="main-footer__col-title" data-i18n="footerColSteganalysis">STEGANALYSIS</div>
            <ul class="main-footer__col-links">
              <li><a href="${prefix}steganalysis.html" class="main-footer__link" data-i18n="footerSteganalysis">Text Steganalysis</a></li>
            </ul>
          </div>
          
          <!-- DOCUMENTATION Column -->
          <div class="main-footer__col">
            <div class="main-footer__col-title" data-i18n="footerColResources">DOCUMENTATION</div>
            <ul class="main-footer__col-links">
              <li><a href="${prefix}docs/getting-started/overview.html" class="main-footer__link" data-i18n="footerResDocs">Getting started</a></li>
              <li><a href="${prefix}docs/user-guide/embedding.html" class="main-footer__link" data-i18n="footerResUi">User guide</a></li>
              <li><a href="${prefix}docs/technical-reference/security.html" class="main-footer__link" data-i18n="footerResTest">Technical reference</a></li>
              <li><a href="${prefix}docs/development/project-structure.html" class="main-footer__link" data-i18n="footerResDev">Development</a></li>
            </ul>
          </div>
          
          <!-- TEAM Column -->
          <div class="main-footer__col">
            <div class="main-footer__col-title" data-i18n="footerColTeam">TEAM</div>
            <ul class="main-footer__col-links">
              <li><a href="${prefix}about us.html" class="main-footer__link" data-i18n="footerAboutTeam">About Team</a></li>
              <li><a href="${prefix}contact team.html" class="main-footer__link" data-i18n="footerContactTeam">Contact With Team</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div class="main-footer__bottom">
        <span data-i18n="footerCopyright">&copy; 2026 STEGNOLINES. All rights reserved.</span>
        <div class="main-footer__links-group">
          <a href="https://github.com/AkazaUI/Stegnolines" target="_blank" rel="noopener noreferrer" class="icon-btn" data-i18n-title="githubRepoTooltip" data-i18n-tooltip="githubRepoTooltip" aria-label="GitHub Repository" title="GitHub Repository" data-tooltip="GitHub Repository">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="display: block;">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
        </div>
      </div>
    `;
  }

  // ── HTML Settings Modal Template Builder ──
  function buildSettingsModalHtml() {
    return `
      <div class="settings-modal-backdrop" id="settings-modal-backdrop"></div>
      <div class="settings-modal" id="settings-modal" role="dialog" aria-modal="true">
        <!-- Settings Sidebar Navigation -->
        <aside class="settings-modal__sidebar">
          <div class="settings-modal__brand">
            <div class="settings-modal__brand-icon-wrap">
              <span class="material-symbols-outlined">settings</span>
            </div>
            <div class="settings-modal__brand-text">
              <span class="settings-modal__brand-title" data-i18n="settingsTitle">Preferences</span>
              <span class="settings-modal__brand-badge">v2.0</span>
            </div>
          </div>
          <nav class="settings-modal__nav" aria-label="Settings categories">
            <button type="button" class="settings-nav-item active" data-target="general" title="General" data-i18n-title="settingsSectionGeneral" aria-label="General">
              <span class="material-symbols-outlined">tune</span>
              <span data-i18n="settingsSectionGeneral">General</span>
            </button>
            <button type="button" class="settings-nav-item" data-target="policies" title="Privacy & Storage" data-i18n-title="settingsSectionPolicies" aria-label="Privacy & Storage">
              <span class="material-symbols-outlined">shield</span>
              <span data-i18n="settingsSectionPolicies">Privacy & Storage</span>
            </button>
            <button type="button" class="settings-nav-item" id="ar-font-toggle-wrap" data-target="typography" title="Typography" data-i18n-title="settingsSectionTypography" aria-label="Typography" style="display: none;">
              <span class="material-symbols-outlined">text_fields</span>
              <span data-i18n="settingsSectionTypography">Typography</span>
            </button>
            <button type="button" class="settings-nav-item" data-target="about" title="About & Research" data-i18n-title="settingsSectionAbout" aria-label="About & Research">
              <span class="material-symbols-outlined">info</span>
              <span data-i18n="settingsSectionAbout">About & Research</span>
            </button>
          </nav>
        </aside>

        <!-- Settings Main Panel -->
        <div class="settings-modal__main">
          <div class="settings-modal__header">
            <div class="settings-modal__header-left">
              <div class="settings-modal__title" id="settings-current-title" data-i18n="settingsHeaderTitle">Preferences</div>
              <div class="settings-modal__subtitle" id="settings-current-subtitle" data-i18n="settingsSubtitle">Manage application preferences, language, cryptographic parameters, and display settings.</div>
            </div>
            <button class="settings-modal__close" id="settings-modal-close" aria-label="Close settings">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          
          <div class="settings-modal__body">
            <!-- 1. General Tab -->
            <div class="settings-section-content active" id="section-general">
              <!-- Language Selection Card Group -->
              <div class="settings-card-group">
                <div class="settings-card-header">
                  <span class="material-symbols-outlined settings-card-icon">language</span>
                  <div>
                    <div class="settings-row__label" data-i18n="settingsLanguage">Display Language</div>
                    <div class="settings-row__desc" data-i18n="settingsLanguageDesc">Choose the interface display language.</div>
                  </div>
                </div>
                <div class="lang-grid">
                  <button type="button" class="lang-card" id="lang-btn-en" onclick="setLanguage('en')">
                    <div class="lang-card__top">
                      <span class="lang-card__badge">EN</span>
                      <span class="lang-card__indicator"></span>
                    </div>
                    <span class="lang-card__name">English</span>
                    <span class="lang-card__sub">International</span>
                  </button>
                  <button type="button" class="lang-card" id="lang-btn-ar" onclick="setLanguage('ar')">
                    <div class="lang-card__top">
                      <span class="lang-card__badge">AR</span>
                      <span class="lang-card__indicator"></span>
                    </div>
                    <span class="lang-card__name">العربية</span>
                    <span class="lang-card__sub">Arabic</span>
                  </button>
                  <button type="button" class="lang-card" id="lang-btn-fr" onclick="setLanguage('fr')">
                    <div class="lang-card__top">
                      <span class="lang-card__badge">FR</span>
                      <span class="lang-card__indicator"></span>
                    </div>
                    <span class="lang-card__name">Français</span>
                    <span class="lang-card__sub">French</span>
                  </button>
                  <button type="button" class="lang-card" id="lang-btn-zh" onclick="setLanguage('zh')">
                    <div class="lang-card__top">
                      <span class="lang-card__badge">ZH</span>
                      <span class="lang-card__indicator"></span>
                    </div>
                    <span class="lang-card__name">中文</span>
                    <span class="lang-card__sub">Chinese</span>
                  </button>
                  <button type="button" class="lang-card" id="lang-btn-la" onclick="setLanguage('la')">
                    <div class="lang-card__top">
                      <span class="lang-card__badge">LA</span>
                      <span class="lang-card__indicator"></span>
                    </div>
                    <span class="lang-card__name">Latina</span>
                    <span class="lang-card__sub">Latin</span>
                  </button>
                </div>
              </div>

              <!-- Theme & Appearance Card Group -->
              <div class="settings-card-group">
                <div class="settings-card-header">
                  <span class="material-symbols-outlined settings-card-icon">palette</span>
                  <div>
                    <div class="settings-row__label" data-i18n="settingsDarkMode">Theme & Appearance</div>
                    <div class="settings-row__desc" data-i18n="settingsDarkModeDesc">Select between Dark, Light, or System Automatic display modes.</div>
                  </div>
                </div>
                <div class="theme-modes-grid">
                  <button type="button" class="theme-card" id="theme-btn-dark" onclick="setThemeMode('dark')">
                    <div class="theme-card__preview theme-card__preview--dark">
                      <div class="theme-card__preview-bar"></div>
                      <div class="theme-card__preview-box"></div>
                    </div>
                    <div class="theme-card__footer">
                      <span class="material-symbols-outlined theme-card__icon">dark_mode</span>
                      <span class="theme-card__label" data-i18n="settingsThemeDark">Dark Mode</span>
                      <span class="theme-card__check"></span>
                    </div>
                  </button>
                  <button type="button" class="theme-card" id="theme-btn-light" onclick="setThemeMode('light')">
                    <div class="theme-card__preview theme-card__preview--light">
                      <div class="theme-card__preview-bar"></div>
                      <div class="theme-card__preview-box"></div>
                    </div>
                    <div class="theme-card__footer">
                      <span class="material-symbols-outlined theme-card__icon">light_mode</span>
                      <span class="theme-card__label" data-i18n="settingsThemeLight">Light Mode</span>
                      <span class="theme-card__check"></span>
                    </div>
                  </button>
                  <button type="button" class="theme-card" id="theme-btn-system" onclick="setThemeMode('system')">
                    <div class="theme-card__preview theme-card__preview--system">
                      <div class="theme-card__preview-split-left"></div>
                      <div class="theme-card__preview-split-right"></div>
                    </div>
                    <div class="theme-card__footer">
                      <span class="material-symbols-outlined theme-card__icon">devices</span>
                      <span class="theme-card__label" data-i18n="settingsThemeSystem">System Auto</span>
                      <span class="theme-card__check"></span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <!-- 2. Privacy & Storage Tab -->
            <div class="settings-section-content" id="section-policies">
              <div class="settings-card-group">
                <div class="settings-card-header">
                  <span class="material-symbols-outlined settings-card-icon">shield</span>
                  <div>
                    <div class="settings-row__label" data-i18n="settingsHintsStorage">Stego Hints Storage Policy</div>
                    <div class="settings-row__desc" data-i18n="settingsHintsStorageDesc">Select how stego hints and recovery logs are handled on your device.</div>
                  </div>
                </div>

                <div class="policy-cards-grid">
                  <button type="button" class="policy-card selected" id="policy-card-none" onclick="selectSettingsHintsStorageOption('none')">
                    <span class="material-symbols-outlined policy-card__icon">security</span>
                    <div class="policy-card__text">
                      <div class="policy-card__title" data-i18n="hintsOptNone">Do Not Save (Default)</div>
                      <div class="policy-card__desc">Zero storage footprint. No logs saved.</div>
                    </div>
                    <span class="policy-card__radio"></span>
                  </button>

                  <button type="button" class="policy-card" id="policy-card-localStorage" onclick="selectSettingsHintsStorageOption('localStorage')">
                    <span class="material-symbols-outlined policy-card__icon">history</span>
                    <div class="policy-card__text">
                      <div class="policy-card__title" data-i18n="hintsOptLocalStorage">7-Day LocalStorage</div>
                      <div class="policy-card__desc">Auto-expiring local cache in browser.</div>
                    </div>
                    <span class="policy-card__radio"></span>
                  </button>

                  <button type="button" class="policy-card" id="policy-card-file" onclick="selectSettingsHintsStorageOption('file')">
                    <span class="material-symbols-outlined policy-card__icon">description</span>
                    <div class="policy-card__text">
                      <div class="policy-card__title" data-i18n="hintsOptFile">Secure File (JSON)</div>
                      <div class="policy-card__desc">Persist hints to local JSON file.</div>
                    </div>
                    <span class="policy-card__radio"></span>
                  </button>
                </div>

                <!-- Hidden input for legacy compatibility -->
                <input type="hidden" id="settings-hints-storage" value="none">
              </div>

              <!-- Storage Footprint & Reset -->
              <div class="settings-card-group" style="margin-top: 1rem;">
                <div class="settings-card-header">
                  <span class="material-symbols-outlined settings-card-icon">delete_sweep</span>
                  <div>
                    <div class="settings-row__label" data-i18n="settingsResetTitle">Storage Footprint & Cache</div>
                    <div class="settings-row__desc" data-i18n="settingsResetDesc">Inspect used local storage space or reset preferences to defaults.</div>
                  </div>
                </div>
                
                <div class="storage-stats-bar">
                  <div class="storage-stats-info">
                    <span class="material-symbols-outlined" style="color: var(--color-primary);">storage</span>
                    <span>Used Storage: <strong id="settings-storage-usage-text">0 KB</strong> (<span id="settings-storage-count-text">0 items</span>)</span>
                  </div>
                  <button type="button" class="btn btn--outline" onclick="resetAllSettingsPreferences()" style="font-size: 0.82rem; height: 36px;">
                    <span class="material-symbols-outlined" style="font-size: 16px;">restart_alt</span>
                    <span data-i18n="settingsClearStorageBtn">Reset All Preferences</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- 4. Typography Tab -->
            <div class="settings-section-content" id="section-typography">
              <div class="settings-card-group">
                <div class="settings-card-header">
                  <span class="material-symbols-outlined settings-card-icon">font_download</span>
                  <div>
                    <div class="settings-row__label" data-i18n="settingsFont">Arabic Font Family</div>
                    <div class="settings-row__desc" data-i18n="settingsFontDesc">Select the preferred typography for Arabic text presentation.</div>
                  </div>
                </div>

                <div class="font-cards-grid">
                  <button type="button" class="font-card active" id="font-card-thmanyah" onclick="setArabicFont('thmanyah')">
                    <div class="font-card__header">
                      <span class="font-card__title">خط ثمانية (Thmanyah)</span>
                      <span class="badge badge--neutral">Default</span>
                      <span class="font-card__indicator"></span>
                    </div>
                    <div class="font-card__preview" style="font-family: 'Thmanyah', 'Alexandria', sans-serif;">
                      نظام إخفاء متقدم بدون أي تشوهات بصرية أو عبء إضافي.
                    </div>
                  </button>

                  <button type="button" class="font-card" id="font-card-alexandria" onclick="setArabicFont('alexandria')">
                    <div class="font-card__header">
                      <span class="font-card__title">خط الإسكندرية (Alexandria)</span>
                      <span class="badge badge--neutral">Modern</span>
                      <span class="font-card__indicator"></span>
                    </div>
                    <div class="font-card__preview" style="font-family: 'Alexandria', sans-serif;">
                      نظام إخفاء متقدم بدون أي تشوهات بصرية أو عبء إضافي.
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <!-- 5. About & Academic Tab -->
            <div class="settings-section-content" id="section-about">
              <div class="about-card-banner">
                <div class="about-card-badge">Cybersecurity Research 2026</div>
                <h3 class="about-card-title" data-i18n="settingsAboutDesc">Hybrid Text Steganography System Using Bit Mapping & Invisible Characters</h3>
                <p class="about-card-dept" data-i18n="settingsAboutDept">University of Science & Technology — Cyber Security Department</p>
                <p class="about-card-sub" data-i18n="settingsAboutSupervision">Under Supervision of Eng. Mohammed Ali</p>
              </div>

              <div class="settings-card-group" style="margin-top: 1rem;">
                <div class="about-feature-item">
                  <span class="material-symbols-outlined about-feature-icon">verified_user</span>
                  <div class="about-feature-text" data-i18n="settingsAboutZeroBackend">
                    Zero-Server Privacy Guarantee: All computations execute 100% locally in your browser sandbox.
                  </div>
                </div>
                <div class="about-feature-item">
                  <span class="material-symbols-outlined about-feature-icon">auto_stories</span>
                  <div class="about-feature-text">
                    Comprehensive documentation with 10 chapters and full mathematical formulations available in the <a href="documentation.html" style="color: var(--color-primary); text-decoration: underline;">Documentation Portal</a>.
                  </div>
                </div>
                <div class="about-feature-item">
                  <span class="material-symbols-outlined about-feature-icon">terminal</span>
                  <div class="about-feature-text" data-i18n="settingsAboutVersion">
                    STEGNOLINES v2.0 (Build 2026)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  window.toggleSettingsHintsStorageSelect = function(e) {
    e.stopPropagation();
    const options = document.getElementById('settingsHintsStorageOptions');
    if (options) {
      options.classList.toggle('open');
    }
  };

  window.selectSettingsHintsStorageOption = function(value, skipTrigger = false) {
    const hiddenInput = document.getElementById('settings-hints-storage');
    if (hiddenInput) hiddenInput.value = value;
    
    // Update policy cards active state
    document.querySelectorAll('.policy-card').forEach(card => {
      const cardVal = card.id.replace('policy-card-', '');
      card.classList.toggle('selected', cardVal === value);
    });

    // Update label for legacy dropdown if present
    const labelSpan = document.getElementById('settingsHintsStorageLabel');
    const currentLang = localStorage.getItem('stegoLang') || 'en';
    
    if (labelSpan) {
      if (value === 'none') {
        labelSpan.setAttribute('data-i18n', 'hintsOptNone');
        labelSpan.textContent = currentLang === 'ar' ? 'عدم الحفظ نهائياً (الافتراضي)' : 'Do Not Save (Default)';
      } else if (value === 'localStorage') {
        labelSpan.setAttribute('data-i18n', 'hintsOptLocalStorage');
        labelSpan.textContent = currentLang === 'ar' ? 'LocalStorage (حذف تلقائي بعد 7 أيام)' : '7-Day LocalStorage';
      } else if (value === 'file') {
        labelSpan.setAttribute('data-i18n', 'hintsOptFile');
        const isUnsupported = !window.showSaveFilePicker;
        if (currentLang === 'ar') {
          labelSpan.textContent = isUnsupported ? 'ملف محلي آمن (غير مدعوم)' : 'ملف محلي آمن (JSON)';
        } else {
          labelSpan.textContent = isUnsupported ? 'Secure File (Unsupported)' : 'Secure File (JSON)';
        }
      }
    }
    
    // Trigger policy change handler in F_stego_hint.js
    if (!skipTrigger && typeof changeHintsStoragePolicy === 'function') {
      changeHintsStoragePolicy(value);
    }
  };

  // ── Inject HTML & Bind Event Listeners ──
  function initTemplates() {
    // 1. Inject Navbar
    const navPlaceholder = document.getElementById('navbar-placeholder');
    if (navPlaceholder) {
      const topNav = document.createElement('nav');
      topNav.className = 'top-nav';
      topNav.id = 'top-nav';
      topNav.innerHTML = buildNavbarHtml(); // SECURITY: Static template, no user input (safe)
      navPlaceholder.replaceWith(topNav);
    }

    // 2. Inject Footer
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder) {
      const footer = document.createElement('footer');
      footer.className = 'main-footer';
      footer.innerHTML = buildFooterHtml(); // SECURITY: Static template, no user input (safe)
      footerPlaceholder.replaceWith(footer);
    }

    // 3. Inject Settings Modal and Toast Wrap (if missing)
    if (!document.getElementById('settings-modal')) {
      const modalContainer = document.createElement('div');
      modalContainer.innerHTML = buildSettingsModalHtml(); // SECURITY: Static template, no user input (safe)
      document.body.appendChild(modalContainer);
    }

    if (!document.getElementById('sec-toast-wrap')) {
      const toastWrap = document.createElement('div');
      toastWrap.id = 'sec-toast-wrap';
      document.body.appendChild(toastWrap);
    }

    // Synchronize current theme checked states with newly injected inputs
    if (typeof syncThemeToggle === 'function') {
      syncThemeToggle(document.documentElement.classList.contains('dark'));
    }

    // ── Bind Nav Dropdown Mouse Hover Interactions (Desktop) ──
    const desktopDropdowns = document.querySelectorAll('.top-nav__dropdown');
    desktopDropdowns.forEach(dropdown => {
      const trigger = dropdown.querySelector('.top-nav__dropdown-trigger');
      if (!trigger) return;
      dropdown.addEventListener('mouseenter', () => {
        dropdown.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
      });
      dropdown.addEventListener('mouseleave', () => {
        dropdown.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
      });
    });

    // ── Bind Mobile Hamburger Menu Interactions ──
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (hamburgerBtn && mobileMenu) {
      hamburgerBtn.addEventListener('click', () => {
        const isOpen = mobileMenu.classList.contains('is-open');
        mobileMenu.classList.toggle('is-open', !isOpen);
        hamburgerBtn.querySelector('.material-symbols-outlined').textContent = isOpen ? 'menu' : 'close';
      });
    }

    // Mobile navigation accordion toggles
    const mobileEmbedToggle = document.getElementById('mobile-embed-toggle');
    const mobileEmbedItems = document.getElementById('mobile-embed-items');
    if (mobileEmbedToggle && mobileEmbedItems) {
      mobileEmbedToggle.addEventListener('click', () => {
        const isOpen = mobileEmbedItems.classList.contains('is-open');
        mobileEmbedItems.classList.toggle('is-open', !isOpen);
        mobileEmbedToggle.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
      });
    }

    const mobileExtractToggle = document.getElementById('mobile-extract-toggle');
    const mobileExtractItems = document.getElementById('mobile-extract-items');
    if (mobileExtractToggle && mobileExtractItems) {
      mobileExtractToggle.addEventListener('click', () => {
        const isOpen = mobileExtractItems.classList.contains('is-open');
        mobileExtractItems.classList.toggle('is-open', !isOpen);
        mobileExtractToggle.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
      });
    }

    // ── Bind Settings Preferences Modal Controls ──
    const settingsBtn = document.getElementById('top-nav-settings');
    const modalBackdrop = document.getElementById('settings-modal-backdrop');
    const settingsModal = document.getElementById('settings-modal');
    const closeBtn = document.getElementById('settings-modal-close');

    function openSettings() {
      if (settingsModal && modalBackdrop) {
        if (typeof updateStorageFootprintUI === 'function') {
          updateStorageFootprintUI();
        }
        settingsModal.classList.add('active');
        modalBackdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    }

    function closeSettings() {
      if (settingsModal && modalBackdrop) {
        settingsModal.classList.remove('active');
        modalBackdrop.classList.remove('active');
        document.body.style.overflow = '';
      }
    }

    if (settingsBtn) settingsBtn.addEventListener('click', openSettings);
    if (closeBtn) closeBtn.addEventListener('click', closeSettings);
    if (modalBackdrop) modalBackdrop.addEventListener('click', closeSettings);

    // Sidebar tab switching inside settings modal
    const navItems = document.querySelectorAll('.settings-nav-item');
    const sections = document.querySelectorAll('.settings-section-content');
    const tabTitleKeys = {
      general: 'settingsSectionGeneral',
      policies: 'settingsSectionPolicies',
      typography: 'settingsSectionTypography',
      about: 'settingsSectionAbout'
    };

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        navItems.forEach(nav => nav.classList.remove('active'));
        sections.forEach(sec => sec.classList.remove('active'));

        item.classList.add('active');
        const target = item.getAttribute('data-target');
        const section = document.getElementById('section-' + target);
        if (section) section.classList.add('active');

        // Reset scroll position to top when switching tabs
        const modalBody = document.querySelector('.settings-modal__body');
        if (modalBody) modalBody.scrollTop = 0;

        // Dynamically update the header title for mobile clarity
        const titleEl = document.getElementById('settings-current-title');
        if (titleEl && tabTitleKeys[target]) {
          titleEl.setAttribute('data-i18n', tabTitleKeys[target]);
          const currentLang = localStorage.getItem('stegoLang') || 'en';
          if (typeof getTranslation === 'function') {
            titleEl.textContent = getTranslation(tabTitleKeys[target], currentLang);
          } else if (window.translations && window.translations[currentLang] && window.translations[currentLang][tabTitleKeys[target]]) {
            titleEl.textContent = window.translations[currentLang][tabTitleKeys[target]];
          }
        }
      });
    });

    // ── Set default languages and fonts on load (Translate Immediately) ──
    const savedLang = localStorage.getItem('stegoLang') || 'en';
    if (typeof applyLanguage === 'function') {
      applyLanguage(savedLang);
    } else if (typeof applyLanguageUI === 'function') {
      applyLanguageUI(savedLang);
    }

    const savedFont = localStorage.getItem('stegoFont') || 'thmanyah';
    if (typeof applyArabicFont === 'function') {
      applyArabicFont(savedFont);
    } else if (typeof applyArabicFontUI === 'function') {
      applyArabicFontUI(savedFont);
    }

    // Synchronize Hints Storage Policy
    const savedPolicy = localStorage.getItem('stego_hints_storage_method') || 'none';
    if (typeof window.selectSettingsHintsStorageOption === 'function') {
      window.selectSettingsHintsStorageOption(savedPolicy, true);
    }
    if (!window.showSaveFilePicker) {
      const fileOpt = document.getElementById('settings-hints-opt-file');
      if (fileOpt) {
        fileOpt.classList.add('disabled');
        fileOpt.style.opacity = '0.5';
        fileOpt.style.cursor = 'not-allowed';
        fileOpt.style.pointerEvents = 'none';
        fileOpt.textContent = savedLang === 'ar' ? 'ملف محلي آمن (غير مدعوم)' : 'Secure File (Unsupported)';
      }
    }

    // Close custom select dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const options = document.getElementById('settingsHintsStorageOptions');
      const wrapper = document.getElementById('settingsHintsStorageWrapper');
      if (options && wrapper && !wrapper.contains(e.target)) {
        options.classList.remove('open');
      }
    });

    // Dynamically inject onboarding tour CSS and JS
    const tourLink = document.createElement('link');
    tourLink.rel = 'stylesheet';
    tourLink.href = `${prefix}css/components/site-tour.css`;
    document.head.appendChild(tourLink);

    const tourScript = document.createElement('script');
    tourScript.src = `${prefix}js/shared/site-tour.js`;
    document.body.appendChild(tourScript);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTemplates);
  } else {
    initTemplates();
  }
})();
