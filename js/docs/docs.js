/**
 * STEGNOLINES — Interactive Scientific Documentation Engine
 * Handles sidebar tree generation, dynamic TOC, search filtering,
 * pagination calculation, theme management, and accessible navigation.
 */

let docsTranslationsLoaded = false;
let domReady = false;
let docsInitialized = false;

function tryInitDocs() {
  if (domReady && (docsTranslationsLoaded || typeof I18N_COMMON !== 'undefined')) {
    initDocs();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  domReady = true;
  tryInitDocs();
});

// Load translation files dynamically if they are not already loaded
(function() {
  const base = window.DOCS_BASE !== undefined ? window.DOCS_BASE : '';
  
  function loadScript(src, callback) {
    const script = document.createElement('script');
    script.src = src;
    script.onload = callback;
    script.onerror = callback;
    document.head.appendChild(script);
  }

  if (typeof I18N_COMMON === 'undefined') {
    loadScript(base + 'js/i18n/common.js', function() {
      loadScript(base + 'js/i18n/docs.js', function() {
        loadScript(base + 'js/i18n/docs-articles.js', function() {
          loadScript(base + 'js/i18n/index.js', function() {
            if (typeof mergeI18n === 'function') {
              window.translations = mergeI18n(I18N_COMMON, I18N_DOCS);
            }
            docsTranslationsLoaded = true;
            tryInitDocs();
          });
        });
      });
    });
  } else {
    if (typeof I18N_DOCS_ARTICLES === 'undefined') {
      loadScript(base + 'js/i18n/docs-articles.js', function() {
        if (typeof mergeI18n === 'function' && typeof I18N_DOCS !== 'undefined') {
          window.translations = mergeI18n(I18N_COMMON, I18N_DOCS);
        }
        docsTranslationsLoaded = true;
        tryInitDocs();
      });
    } else {
      if (typeof mergeI18n === 'function' && typeof I18N_DOCS !== 'undefined') {
        window.translations = mergeI18n(I18N_COMMON, I18N_DOCS);
      }
      docsTranslationsLoaded = true;
    }
  }
})();

function initDocs() {
  if (docsInitialized) return;
  docsInitialized = true;

  const savedLang = localStorage.getItem('stegoLang') || 'en';

  // ── 1. THEME SYNCHRONIZATION ───────────────────────────
  const themeToggles = document.querySelectorAll('#toggle-dark-mode');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const savedTheme = localStorage.getItem('stegoTheme');

  let isDarkActive = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);

  const applyTheme = (isDark) => {
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('light', !isDark);
    themeToggles.forEach(toggle => { toggle.checked = isDark; });
  };

  applyTheme(isDarkActive);

  themeToggles.forEach(toggle => {
    toggle.addEventListener('change', function () {
      isDarkActive = this.checked;
      applyTheme(isDarkActive);
      localStorage.setItem('stegoTheme', isDarkActive ? 'dark' : 'light');
    });
  });

  // ── 2. TOP NAV DROPDOWNS & HAMBURGER ──────────────────────
  const dropdowns = document.querySelectorAll('.top-nav__dropdown');
  dropdowns.forEach(dd => {
    const trigger = dd.querySelector('.top-nav__dropdown-trigger');
    if (trigger) {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dd.classList.contains('is-open');
        dropdowns.forEach(o => o.classList.remove('is-open'));
        if (!isOpen) dd.classList.add('is-open');
      });
    }
  });

  // Close dropdowns on document click
  document.addEventListener('click', () => {
    dropdowns.forEach(dd => dd.classList.remove('is-open'));
  });

  // Hamburger Mobile Toggle
  const hamburger = document.getElementById('hamburger-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.toggle('is-open');
      const icon = hamburger.querySelector('.material-symbols-outlined');
      if (icon) {
        icon.textContent = mobileMenu.classList.contains('is-open') ? 'close' : 'menu';
      }
    });
  }

  // ── 3. RESPONSIVE SIDEBAR MOBILE TOGGLES ──────────────────
  const sidebarToggle = document.getElementById('docs-sidebar-toggle');
  const sidebar = document.getElementById('docs-sidebar');
  const backdrop = document.getElementById('docs-sidebar-backdrop');

  if (sidebarToggle && sidebar) {
    // Append to body so fixed positioning is completely decoupled from any container
    if (backdrop && backdrop.parentElement !== document.body) {
      document.body.appendChild(backdrop);
    }
    if (sidebar.parentElement !== document.body) {
      document.body.appendChild(sidebar);
    }

    // Add close button to sidebar on mobile if not present
    let closeBtn = sidebar.querySelector('.docs-sidebar__close-btn');
    if (!closeBtn) {
      closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'docs-sidebar__close-btn';
      closeBtn.setAttribute('aria-label', 'Close sidebar');
      closeBtn.innerHTML = '<span class="material-symbols-outlined">close</span>';
      sidebar.prepend(closeBtn);
    }

    const openSidebar = () => {
      sidebar.classList.add('is-active');
      if (backdrop) backdrop.classList.add('is-active');
      sidebarToggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('docs-sidebar-open');
    };

    const closeSidebar = () => {
      sidebar.classList.remove('is-active');
      if (backdrop) backdrop.classList.remove('is-active');
      sidebarToggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('docs-sidebar-open');
    };

    sidebarToggle.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (sidebar.classList.contains('is-active')) {
        closeSidebar();
      } else {
        openSidebar();
      }
    };

    if (backdrop) {
      backdrop.onclick = closeSidebar;
    }

    if (closeBtn) {
      closeBtn.onclick = closeSidebar;
    }

    // Close when clicking any nav link
    sidebar.addEventListener('click', (e) => {
      if (e.target.closest('a')) {
        closeSidebar();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar.classList.contains('is-active')) {
        closeSidebar();
      }
    });
  }

  // ── 4. INSTANT SEARCH ENGINE (documentation.html) ──
  const searchInput = document.getElementById('docs-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const query = this.value.toLowerCase().trim();
      const cards = document.querySelectorAll('.docs-index-card');

      cards.forEach(card => {
        let hasMatch = false;
        const cardTitle = (card.querySelector('.docs-index-card__title')?.textContent || '').toLowerCase();
        const cardDesc = (card.querySelector('.docs-index-card__desc')?.textContent || '').toLowerCase();
        
        if (cardTitle.includes(query) || cardDesc.includes(query)) {
          hasMatch = true;
        }

        const items = card.querySelectorAll('.docs-index-card__list li');
        items.forEach(item => {
          const itemText = item.textContent.toLowerCase();
          if (itemText.includes(query) || (hasMatch && query.length < 3)) {
            item.style.display = '';
            hasMatch = true;
          } else {
            item.style.display = query ? 'none' : '';
          }
        });

        card.style.display = hasMatch ? '' : 'none';
      });
    });
  }

  // ── 5. APPLY INITIAL LANGUAGE TO ALL DOCUMENTATION COMPONENTS ──
  applyLanguage(savedLang);
}

/**
 * Global language dispatcher for Documentation pages.
 * Called in real-time whenever the user switches language in settings modal or header.
 *
 * @param {string} lang - 'ar', 'en', 'fr', 'zh', or 'la'
 */
function applyLanguage(lang) {
  const currentLang = lang || localStorage.getItem('stegoLang') || 'en';
  const dict = (typeof translations !== 'undefined' && translations[currentLang]) ? translations[currentLang] : 
               ((typeof I18N_DOCS !== 'undefined' && I18N_DOCS[currentLang]) ? I18N_DOCS[currentLang] : null);

  // Set document attributes
  document.documentElement.setAttribute('lang', currentLang);
  document.documentElement.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');

  // 1. Translate data-i18n attributes
  translateDataI18nElements(currentLang, dict);

  // 2. Translate full article content body (and headings)
  translateArticleContent(currentLang, dict);

  // 3. Re-render / translate On-Page Table of Contents (TOC)
  renderOnpageToc(currentLang, dict);

  // 4. Re-render / translate Portal Index Grid (documentation.html)
  renderDocsIndexGrid(currentLang, dict);

  // 5. Re-render / translate Sidebar Navigation Tree
  renderDocsSidebarTree(currentLang, dict);

  // 6. Re-render Pager (Previous / Next links)
  renderDocsPager(currentLang, dict);

  // 7. Translate Extras (breadcrumbs, search placeholder, TOC headings, mobile button, etc.)
  translateDocsExtras(currentLang, dict);
}

// Make applyLanguage globally available so theme-manager.js calls it on language change
window.applyLanguage = applyLanguage;

// Memory cache for original English article HTML bodies
const articleContentCache = {};

/**
 * Translates the full inner HTML content of .docs-article dynamically based on I18N_DOCS_ARTICLES.
 */
function translateArticleContent(lang, dict) {
  const article = document.querySelector('.docs-article');
  if (!article) return;

  const currentPath = window.location.pathname.replace(/\\/g, '/');
  const match = currentPath.match(/docs\/([^\/]+\/[^\/]+?)(?:\.html)?$/i);
  const slug = match ? match[1].replace(/\.html$/, '') : '';

  if (slug && !articleContentCache[slug]) {
    articleContentCache[slug] = article.innerHTML;
  }

  if (slug && window.I18N_DOCS_ARTICLES && window.I18N_DOCS_ARTICLES[lang] && (window.I18N_DOCS_ARTICLES[lang][slug] || window.I18N_DOCS_ARTICLES[lang][slug + '.html'])) {
    article.innerHTML = (window.I18N_DOCS_ARTICLES[lang][slug] || window.I18N_DOCS_ARTICLES[lang][slug + '.html']).trim();
  } else if (slug && lang === 'en' && articleContentCache[slug]) {
    article.innerHTML = articleContentCache[slug];
  } else {
    // Fallback: translate individual headings and notes
    translateArticleHeadings(lang, dict);
  }

  // Re-render KaTeX math formulas if active
  if (typeof renderMathInElement === 'function') {
    try {
      renderMathInElement(article, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false }
        ]
      });
    } catch (e) {}
  }
}

/**
 * Translates article headings (h1, h2, h3) and key callout notes inside the active documentation article.
 */
function translateArticleHeadings(lang, dict) {
  const article = document.querySelector('.docs-article');
  if (!article) return;

  const headings = article.querySelectorAll('h1, h2, h3');
  headings.forEach(heading => {
    if (!heading.hasAttribute('data-orig-text')) {
      heading.setAttribute('data-orig-text', heading.textContent.trim());
    }
    const origText = heading.getAttribute('data-orig-text');
    if (dict && dict[origText]) {
      heading.textContent = dict[origText];
    } else if (lang === 'en') {
      heading.textContent = origText;
    }
  });

  // Also translate docs-note headers/descriptions if present
  const noteStrong = article.querySelector('.docs-note strong');
  if (noteStrong) {
    if (!noteStrong.hasAttribute('data-orig-text')) {
      noteStrong.setAttribute('data-orig-text', noteStrong.textContent.trim());
    }
    const origNote = noteStrong.getAttribute('data-orig-text');
    if (dict && dict[origNote]) {
      noteStrong.textContent = dict[origNote];
    } else if (lang === 'en') {
      noteStrong.textContent = origNote;
    }
  }

  const noteParagraph = article.querySelector('.docs-note p');
  if (noteParagraph) {
    if (!noteParagraph.hasAttribute('data-orig-text')) {
      noteParagraph.setAttribute('data-orig-text', noteParagraph.textContent.trim());
    }
    const origP = noteParagraph.getAttribute('data-orig-text');
    if (dict && dict[origP]) {
      noteParagraph.textContent = dict[origP];
    } else if (lang === 'en') {
      noteParagraph.textContent = origP;
    }
  }
}

/**
 * Dynamically builds and translates the On-Page Table of Contents (TOC).
 */
function renderOnpageToc(lang, dict) {
  const onpageToc = document.getElementById('docs-onpage-toc');
  const articleContent = document.querySelector('.docs-article');
  if (!onpageToc || !articleContent) return;

  onpageToc.replaceChildren(); // SAFE: clear without innerHTML
  const headings = articleContent.querySelectorAll('h2, h3');
  
  if (headings.length > 0) {
    headings.forEach((heading, idx) => {
      if (!heading.id) {
        const origText = heading.getAttribute('data-orig-text') || heading.textContent;
        const textId = origText
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-'); // Support Arabic headings
        heading.id = `heading-${textId || idx}`;
      }

      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.className = `docs-toc__link docs-toc__link--${heading.tagName.toLowerCase()}`;
      link.textContent = heading.textContent;
      onpageToc.appendChild(link);
    });
  } else {
    const tocAside = document.querySelector('.docs-toc');
    if (tocAside) tocAside.style.display = 'none';
  }
}

/**
 * Translates standard data-i18n tags on the page.
 */
function translateDataI18nElements(lang, dict) {
  if (!dict) return;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      const hasIcon = el.querySelector('.material-symbols-outlined');
      if (hasIcon) {
        el.childNodes.forEach(child => {
          if (child.nodeType === Node.TEXT_NODE && child.textContent.trim().length > 0) {
            child.textContent = dict[key];
          }
        });
      } else {
        el.textContent = dict[key];
      }
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) {
      el.setAttribute('placeholder', dict[key]);
    }
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (dict[key]) {
      el.setAttribute('title', dict[key]);
    }
  });

  document.querySelectorAll('[data-i18n-tooltip]').forEach(el => {
    const key = el.getAttribute('data-i18n-tooltip');
    if (dict[key]) {
      el.setAttribute('data-tooltip', dict[key]);
    }
  });
}

/**
 * Dynamically builds and translates the Documentation Portal cards on documentation.html.
 */
function renderDocsIndexGrid(lang, dict) {
  const indexGrid = document.getElementById('docs-index-grid');
  if (!indexGrid || !window.DOCS_NAV) return;

  const base = window.DOCS_BASE !== undefined ? window.DOCS_BASE : '';
  indexGrid.replaceChildren(); // SAFE: clear placeholder

  window.DOCS_NAV.forEach(section => {
    const card = document.createElement('div');
    card.className = 'card docs-index-card';
    card.setAttribute('data-section-slug', section.slug);

    // Header with Icon, Title, and Badge
    const header = document.createElement('div');
    header.className = 'docs-index-card__header';

    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined docs-index-card__icon';
    icon.textContent = section.icon || 'menu_book';

    const headerTextWrap = document.createElement('div');
    headerTextWrap.className = 'docs-index-card__header-text';

    const title = document.createElement('h2');
    title.className = 'text-headline-md docs-index-card__title';
    title.textContent = (dict && dict[section.title]) || section.title;

    const descKey = `${section.slug}-desc`;
    const desc = document.createElement('p');
    desc.className = 'docs-index-card__desc text-body-sm';
    desc.textContent = (dict && dict[descKey]) || section.description || '';

    headerTextWrap.appendChild(title);
    if (section.description) {
      headerTextWrap.appendChild(desc);
    }

    const countBadge = document.createElement('span');
    countBadge.className = 'badge badge--neutral docs-index-card__badge';
    const topicsLabel = (dict && dict.topicsCount) || (lang === 'ar' ? 'مقالات' : 'topics');
    countBadge.textContent = `${section.items.length} ${topicsLabel}`;

    header.appendChild(icon);
    header.appendChild(headerTextWrap);
    header.appendChild(countBadge);
    card.appendChild(header);

    // Topic link list
    const list = document.createElement('ul');
    list.className = 'docs-index-card__list';

    section.items.forEach(item => {
      const li = document.createElement('li');
      li.className = 'docs-index-card__item';

      const link = document.createElement('a');
      link.href = base + item.href;
      link.className = 'docs-index-card__link';

      const itemTitleSpan = document.createElement('span');
      itemTitleSpan.className = 'docs-index-card__item-title';
      itemTitleSpan.textContent = (dict && dict[item.title]) || item.title;

      link.appendChild(itemTitleSpan);

      if (item.desc) {
        const itemDescSpan = document.createElement('span');
        itemDescSpan.className = 'docs-index-card__item-desc';
        const itemDescKey = `${item.title}-desc`;
        itemDescSpan.textContent = (dict && dict[itemDescKey]) || item.desc;
        link.appendChild(itemDescSpan);
      }

      const arrowIcon = document.createElement('span');
      arrowIcon.className = 'material-symbols-outlined docs-index-card__item-arrow';
      arrowIcon.textContent = lang === 'ar' ? 'arrow_back' : 'arrow_forward';
      link.appendChild(arrowIcon);

      li.appendChild(link);
      list.appendChild(li);
    });

    card.appendChild(list);
    indexGrid.appendChild(card);
  });
}

/**
 * Dynamically builds and translates the Sidebar Navigation Tree on documentation article pages.
 */
function renderDocsSidebarTree(lang, dict) {
  const sidebarNav = document.getElementById('docs-sidebar-nav');
  if (!sidebarNav || !window.DOCS_NAV) return;

  const base = window.DOCS_BASE !== undefined ? window.DOCS_BASE : '';
  const currentPath = window.location.pathname.replace(/\\/g, '/');

  sidebarNav.replaceChildren(); // SAFE: clear placeholder

  window.DOCS_NAV.forEach(section => {
    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'docs-sidebar__section';

    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'docs-sidebar__section-title';
    
    const iconWrap = document.createElement('span');
    iconWrap.className = 'docs-sidebar__section-icon';
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.textContent = section.icon || 'play_circle';
    iconWrap.appendChild(icon);
    
    const label = document.createElement('span');
    label.className = 'docs-sidebar__section-text';
    label.textContent = (dict && dict[section.title]) || section.title;
    
    sectionTitle.appendChild(iconWrap);
    sectionTitle.appendChild(label);
    sectionDiv.appendChild(sectionTitle);

    const list = document.createElement('ul');
    list.className = 'docs-sidebar__list';

    section.items.forEach(item => {
      const li = document.createElement('li');
      li.className = 'docs-sidebar__item';
      const link = document.createElement('a');
      link.className = 'docs-sidebar__link';
      link.href = base + item.href;
      
      const bullet = document.createElement('span');
      bullet.className = 'docs-sidebar__bullet';
      
      const linkText = document.createElement('span');
      linkText.className = 'docs-sidebar__link-text';
      linkText.textContent = (dict && dict[item.title]) || item.title;

      link.appendChild(bullet);
      link.appendChild(linkText);

      // Check active state robustly
      if (currentPath.endsWith(item.href)) {
        link.classList.add('docs-sidebar__link--active');
      }

      li.appendChild(link);
      list.appendChild(li);
    });

    sectionDiv.appendChild(list);
    sidebarNav.appendChild(sectionDiv);
  });
}

/**
 * Re-renders pagination buttons (Previous / Next links).
 */
function renderDocsPager(lang, dict) {
  const prevLink = document.getElementById('docs-prev-link');
  const nextLink = document.getElementById('docs-next-link');

  if ((prevLink || nextLink) && window.DOCS_NAV) {
    const base = window.DOCS_BASE !== undefined ? window.DOCS_BASE : '';
    const currentPath = window.location.pathname.replace(/\\/g, '/');

    const flatItems = [];
    window.DOCS_NAV.forEach(section => {
      section.items.forEach(item => {
        flatItems.push(item);
      });
    });

    const currentIndex = flatItems.findIndex(item => currentPath.endsWith(item.href));

    if (currentIndex !== -1) {
      if (currentIndex > 0 && prevLink) {
        const prevItem = flatItems[currentIndex - 1];
        prevLink.href = base + prevItem.href;
        const labelEl = prevLink.querySelector('.docs-pager__label');
        if (labelEl) {
          labelEl.textContent = (dict && dict[prevItem.title]) || prevItem.title;
        }
        prevLink.removeAttribute('hidden');
      }

      if (currentIndex < flatItems.length - 1 && nextLink) {
        const nextItem = flatItems[currentIndex + 1];
        nextLink.href = base + nextItem.href;
        const labelEl = nextLink.querySelector('.docs-pager__label');
        if (labelEl) {
          labelEl.textContent = (dict && dict[nextItem.title]) || nextItem.title;
        }
        nextLink.removeAttribute('hidden');
      }
    }
  }
}

/**
 * Translates extra documentation elements: breadcrumbs, TOC headings, mobile contents button, sidebar header, etc.
 */
function translateDocsExtras(savedLang, dict) {
  const translationsDict = dict || ((typeof translations !== 'undefined' && translations[savedLang]) ? translations[savedLang] : 
                          ((typeof I18N_DOCS !== 'undefined' && I18N_DOCS[savedLang]) ? I18N_DOCS[savedLang] : null));
  if (!translationsDict) return;
  
  // 1. Translate search placeholder
  const searchInput = document.getElementById('docs-search-input');
  if (searchInput && translationsDict.docsSearchPlaceholder) {
    searchInput.setAttribute('placeholder', translationsDict.docsSearchPlaceholder);
    searchInput.setAttribute('data-i18n-placeholder', 'docsSearchPlaceholder');
  }

  // 2. Translate breadcrumbs
  const breadcrumb = document.querySelector('.docs-breadcrumb');
  if (breadcrumb) {
    const links = breadcrumb.querySelectorAll('a');
    links.forEach(link => {
      if (link.textContent.trim().toLowerCase() === 'documentation' || link.textContent.trim().includes('توثيق')) {
        link.textContent = savedLang === 'ar' ? 'فهرس التوثيق' : 'Documentation';
      }
    });
    const spans = breadcrumb.querySelectorAll('span:not(.docs-breadcrumb__sep)');
    if (spans.length >= 2) {
      const secText = spans[0].textContent.trim();
      const titleText = spans[1].textContent.trim();
      spans[0].textContent = translationsDict[secText] || secText;
      spans[1].textContent = translationsDict[titleText] || titleText;
    }
  }

  // 3. Translate "On this page" heading in TOC sidebar
  const tocHeading = document.querySelector('.docs-toc__heading');
  if (tocHeading) {
    tocHeading.textContent = translationsDict.onThisPage || 
                             (savedLang === 'ar' ? 'في هذه الصفحة' : 
                              savedLang === 'fr' ? 'Sur cette page' :
                              savedLang === 'zh' ? '本页内容' :
                              savedLang === 'la' ? 'In hac pagina' : 'On this page');
  }
  
  // 4. Translate "Contents" button text on mobile
  const sidebarToggle = document.getElementById('docs-sidebar-toggle');
  if (sidebarToggle) {
    const textNode = Array.from(sidebarToggle.childNodes).find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0);
    const label = savedLang === 'ar' ? 'المحتويات' : 
                  savedLang === 'fr' ? 'Contenu' :
                  savedLang === 'zh' ? '目录' :
                  savedLang === 'la' ? 'Index' : 'Contents';
    if (textNode) {
      textNode.textContent = ' ' + label;
    } else {
      const icon = sidebarToggle.querySelector('.material-symbols-outlined');
      if (icon) {
        sidebarToggle.replaceChildren(icon, document.createTextNode(' ' + label));
      }
    }
  }

  // 5. Translate sidebar main title
  const sidebarTitleLink = document.querySelector('.docs-sidebar__title a');
  if (sidebarTitleLink) {
    sidebarTitleLink.textContent = translationsDict.sidebarTitle || 
                                  (savedLang === 'ar' ? 'فهرس وثائق المنظومة' : 
                                   savedLang === 'fr' ? 'Documentation' :
                                   savedLang === 'zh' ? '系统文档' :
                                   savedLang === 'la' ? 'Documentatio' : 'Documentation');
  }

  // 6. Translate floating guide button tooltip
  const guideBtn = document.querySelector('.floating-guide-btn');
  if (guideBtn) {
    guideBtn.setAttribute('data-tooltip', savedLang === 'ar' ? 'إرشادات الموقع' : 
                                         savedLang === 'fr' ? 'Guide du site' :
                                         savedLang === 'zh' ? '网站指南' :
                                         savedLang === 'la' ? 'Dux situs' : 'Site Guide');
  }
}
