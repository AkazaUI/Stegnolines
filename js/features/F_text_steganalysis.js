// ══════════════════════════════════════════════════════════════
// STEGNOLINES — Text Steganalysis Detection Engine & UI Controller
// ══════════════════════════════════════════════════════════════
//
// Scans input text for hidden Unicode characters (zero-width,
// directional overrides, variation selectors, special spaces)
// and reports their type, position, and context — without
// attempting to decode/extract any steganographic payload.
//
// ══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── PAGINATION CONFIGURATION & STATE ────────────────────────
  const PAGE_SIZE = 50;
  let currentAnalysis = null;
  let currentPage = 1;

  // ── CHARACTER LOOKUP MAP ────────────────────────────────────
  // Maps Unicode code points to { name, category } for all
  // detectable steganographic characters.

  const CHAR_MAP = {
    // ── Zero-Width Characters ──
    0x200B: { name: 'Zero-Width Space',          category: 'zeroWidth' },
    0x200C: { name: 'Zero-Width Non-Joiner',     category: 'zeroWidth' },
    0x200D: { name: 'Zero-Width Joiner',         category: 'zeroWidth' },
    0xFEFF: { name: 'Zero-Width No-Break Space', category: 'bom' },

    // ── Directional Override Characters ──
    0x200E: { name: 'Left-To-Right Mark',        category: 'directional' },
    0x200F: { name: 'Right-To-Left Mark',        category: 'directional' },
    0x202A: { name: 'Left-to-Right Embedding',   category: 'directional' },
    0x202B: { name: 'Right-to-Left Embedding',   category: 'directional' },
    0x202C: { name: 'POP Directional Formatting', category: 'directional' },
    0x202D: { name: 'Left-To-Right Override',    category: 'directional' },
    0x202E: { name: 'Right-To-Left Override',    category: 'directional' },

    // ── Special Space Characters ──
    0x200A: { name: 'Hair Space',                category: 'space' },
    0x2000: { name: 'En Quad',                   category: 'space' },
    0x2004: { name: 'Three-Per-Em Space',        category: 'space' },
    0x2005: { name: 'Four-Per-Em Space',         category: 'space' },
    0x2006: { name: 'Six-Per-Em Space',          category: 'space' },
    0x2007: { name: 'Figure Space',              category: 'space' },
    0x2008: { name: 'Punctuation Space',         category: 'space' },
    0x2009: { name: 'Thin Space',                category: 'space' },
    0x202F: { name: 'Narrow No-Break Space',     category: 'space' },

    // ── Mongolian Vowel Separator ──
    0x180E: { name: 'Mongolian Vowel Separator', category: 'zeroWidth' },
  };

  // ── RANGE-BASED DETECTION GROUPS ────────────────────────────
  // For large contiguous ranges, we check bounds instead of
  // individual map entries for O(1) performance.

  const RANGES = [
    {
      start: 0xFE00,
      end: 0xFE0F,
      namePrefix: 'Variation Selector',
      category: 'variationSelector',
      indexOffset: 1   // VS1 = FE00, VS2 = FE01, ...
    },
    {
      start: 0xE0100,
      end: 0xE01EF,
      namePrefix: 'Variation Selector',
      category: 'variationSelector',
      indexOffset: 17   // VS17 = E0100, VS18 = E0101, ...
    },
    {
      start: 0x180B,
      end: 0x180F,
      namePrefix: 'Mongolian Free Variation Selector',
      category: 'mongolianFVS',
      indexOffset: 1   // FVS1 = 180B, FVS2 = 180C, ...
    }
  ];

  // ── CORE ANALYSIS FUNCTION ──────────────────────────────────

  /**
   * Analyze input text for hidden Unicode characters.
   *
   * @param {string} inputText — The raw text to scan.
   * @returns {{ results: Array, totalFound: number, distinctTypes: number, computationTimeMs: number }}
   */
  function analyzeText(inputText) {
    const t0 = performance.now();
    const results = [];
    const typesSet = new Set();

    const chars = [...inputText];
    const n = chars.length;

    // 1. Backward pass to pre-calculate contextAfter (next 3 visible characters)
    const nextVisible = new Array(n);
    let activeNext = [];

    for (let i = n - 1; i >= 0; i--) {
      nextVisible[i] = activeNext.join('');
      const cp = chars[i].codePointAt(0);
      if (!isHiddenCodePoint(cp) && cp > 0x001F) {
        activeNext.unshift(chars[i]);
        if (activeNext.length > 3) {
          activeNext.pop();
        }
      }
    }

    // 2. Forward pass to detect hidden characters and capture contextBefore (last 3 visible characters)
    let activePrev = [];

    for (let position = 0; position < n; position++) {
      const char = chars[position];
      const cp = char.codePointAt(0);

      let match = null;

      // Check map
      if (CHAR_MAP[cp]) {
        match = {
          codePoint: cp,
          hexCode: 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'),
          name: CHAR_MAP[cp].name,
          category: CHAR_MAP[cp].category,
        };
      }

      // Check ranges
      if (!match) {
        for (const range of RANGES) {
          if (cp >= range.start && cp <= range.end) {
            const idx = cp - range.start + range.indexOffset;
            match = {
              codePoint: cp,
              hexCode: 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'),
              name: range.namePrefix + ' ' + idx + ' (VS' + idx + ')',
              category: range.category,
            };
            break;
          }
        }
      }

      if (match) {
        results.push({
          ...match,
          position: position,
          contextBefore: activePrev.join(''),
          contextAfter: nextVisible[position],
        });

        typesSet.add(match.hexCode);
      } else {
        if (!isHiddenCodePoint(cp) && cp > 0x001F) {
          activePrev.push(char);
          if (activePrev.length > 3) {
            activePrev.shift();
          }
        }
      }
    }

    const t1 = performance.now();

    return {
      results: results,
      totalFound: results.length,
      distinctTypes: typesSet.size,
      computationTimeMs: parseFloat((t1 - t0).toFixed(2)),
      inputText: inputText
    };

  }

  /**
   * Check if a code point is in the detectable hidden character set.
   */
  function isHiddenCodePoint(cp) {
    if (CHAR_MAP[cp]) return true;
    for (const range of RANGES) {
      if (cp >= range.start && cp <= range.end) return true;
    }
    return false;
  }

  // ── RISK CLASSIFICATION ─────────────────────────────────────

  /**
   * Classify the risk level based on total hidden characters found.
   *
   * @param {number} total — Total hidden characters detected.
   * @returns {{ level: string, i18nKey: string, cssClass: string }}
   */
  function classifyRisk(total) {
    if (total === 0) return { level: 'clean', i18nKey: 'riskClean', cssClass: 'risk--clean' };
    if (total <= 3) return { level: 'low', i18nKey: 'riskLow', cssClass: 'risk--low' };
    if (total <= 10) return { level: 'medium', i18nKey: 'riskMedium', cssClass: 'risk--medium' };
    if (total <= 30) return { level: 'high', i18nKey: 'riskHigh', cssClass: 'risk--high' };
    return { level: 'critical', i18nKey: 'riskCritical', cssClass: 'risk--critical' };
  }

  // ── CATEGORY i18n KEY MAPPING ───────────────────────────────

  const CATEGORY_I18N = {
    zeroWidth: 'catZeroWidth',
    directional: 'catDirectional',
    space: 'catSpace',
    variationSelector: 'catVariationSelector',
    mongolianFVS: 'catMongolianFVS',
    bom: 'catBOM',
  };

  // ── UI CONTROLLER ───────────────────────────────────────────

  function initSteganalysis() {
    const analyzeBtn = document.getElementById('steganalysis-btn');
    const textInput = document.getElementById('steganalysisInput');
    const resultsPanel = document.getElementById('steganalysis-results-panel');

    if (!analyzeBtn || !textInput) return;

    analyzeBtn.addEventListener('click', function () {
      const text = textInput.value;

      if (!text || text.trim().length === 0) {
        if (typeof showToast === 'function') {
          showToast('⚠ ' + t('steganalysisEmptyInput'));
        }
        return;
      }

      // Show spinner & disable button
      analyzeBtn.disabled = true;
      // SECURITY: Static button content with no user input (safe)
      analyzeBtn.innerHTML = `
        <span class="material-symbols-outlined btn-spinner">progress_activity</span>
        <span>${t('steganalysisAnalyzing')}</span>
      `;

      setTimeout(() => {
        // Run analysis
        currentAnalysis = analyzeText(text);
        currentPage = 1;
        const risk = classifyRisk(currentAnalysis.totalFound);

        // Show results panel
        if (resultsPanel) resultsPanel.style.display = '';

        // Render metrics
        renderMetrics(currentAnalysis, risk);

        // Render results state
        if (currentAnalysis.totalFound === 0) {
          renderCleanState();
        } else {
          renderResultsTable(currentAnalysis);
          renderSummary(currentAnalysis, risk);
        }
        // Restore button state
        analyzeBtn.disabled = false;
        // SECURITY: Static button content with no user input (safe)
        analyzeBtn.innerHTML = `
          <span class="material-symbols-outlined" style="font-size:18px">search_insights</span>
          <span data-i18n="btnAnalyzeText">${t('btnAnalyzeText')}</span>
        `;

        // Show completed toast
        if (typeof showToast === 'function') {
          showToast('✅ ' + t('steganalysisCompleted'));
        }
        // Smooth scroll to results
        if (resultsPanel) {
          setTimeout(() => {
            resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      }, 50);
    });
  }

  /**
   * Get translation for a key.
   */
  function t(key) {
    const lang = localStorage.getItem('stegoLang') || document.documentElement.lang || 'en';
    if (window.translations && window.translations[lang] && window.translations[lang][key]) {
      return window.translations[lang][key];
    }
    // Fallback to English from I18N_STEGANALYSIS
    if (typeof I18N_STEGANALYSIS !== 'undefined') {
      if (I18N_STEGANALYSIS[lang] && I18N_STEGANALYSIS[lang][key]) return I18N_STEGANALYSIS[lang][key];
      if (I18N_STEGANALYSIS['en'] && I18N_STEGANALYSIS['en'][key]) return I18N_STEGANALYSIS['en'][key];
    }
    return key;
  }

  // ── RENDER FUNCTIONS ────────────────────────────────────────

  function renderMetrics(analysis, risk) {
    // Total hidden
    const totalEl = document.getElementById('steganalysisTotalVal');
    if (totalEl) {
      totalEl.textContent = analysis.totalFound;
      if (typeof animateCounter === 'function' && analysis.totalFound > 0) {
        animateCounter(totalEl, analysis.totalFound, '', 600);
      }
    }

    // Distinct types
    const typesEl = document.getElementById('steganalysisTypesVal');
    if (typesEl) {
      typesEl.textContent = analysis.distinctTypes;
      if (typeof animateCounter === 'function' && analysis.distinctTypes > 0) {
        animateCounter(typesEl, analysis.distinctTypes, '', 600);
      }
    }

    // Computation time
    const timeEl = document.getElementById('steganalysisTimeVal');
    if (timeEl) {
      timeEl.textContent = analysis.computationTimeMs + ' ms';
    }


  }

  function getRiskIcon(level) {
    switch (level) {
      case 'clean': return 'verified';
      case 'low': return 'info';
      case 'medium': return 'warning';
      case 'high': return 'gpp_bad';
      case 'critical': return 'dangerous';
      default: return 'help';
    }
  }

  function renderCleanState() {
    const container = document.getElementById('steganalysisResultsBody');
    if (!container) return;

    // SECURITY: Static template with translation keys (no user input, safe)
    container.innerHTML = `
      <div class="steganalysis-clean-state">
        <div class="steganalysis-clean-state__icon">
          <span class="material-symbols-outlined">shield_with_heart</span>
        </div>
        <h3 class="steganalysis-clean-state__title" data-i18n="steganalysisCleanTitle">${t('steganalysisCleanTitle')}</h3>
        <p class="steganalysis-clean-state__subtitle" data-i18n="steganalysisCleanSubtitle">${t('steganalysisCleanSubtitle')}</p>
      </div>
    `;
  }

  function renderVisualMap(inputText, analysis) {
    if (!inputText) return '';
    const chars = [...inputText];
    const n = chars.length;

    // Map of position -> result item
    const resultsMap = new Map();
    analysis.results.forEach(r => {
      resultsMap.set(r.position, r);
    });

    // Group hidden characters by their "association target" index.
    // We associate a cluster of hidden characters with the index of the next visible character.
    // If a cluster is at the end of the text, we associate it with index n (the end).
    const hiddenClusters = new Map();
    
    let currentCluster = [];
    for (let i = 0; i <= n; i++) {
      if (i < n && resultsMap.has(i)) {
        currentCluster.push(resultsMap.get(i));
      } else {
        if (currentCluster.length > 0) {
          hiddenClusters.set(i, currentCluster);
          currentCluster = [];
        }
      }
    }
    let html = '';
    const maxPreviewChars = 300000;
    const limit = Math.min(n, maxPreviewChars);

    for (let i = 0; i < limit; i++) {
      // Skip hidden characters from direct output
      if (resultsMap.has(i)) {
        continue;
      }

      const char = chars[i];
      const hasClusterBefore = hiddenClusters.has(i);
      let charHtml = '';
      if (char === '\n') {
        charHtml = '<br>';
      } else if (char === '\r') {
        continue;
      } else if (char === ' ') {
        charHtml = ' '; // Normal space allows native wrapping
      } else {
        charHtml = escSafe(char);
      }

      if (hasClusterBefore) {
        const cluster = hiddenClusters.get(i);
        const count = cluster.length;
        const tooltipText = String(count);

        let statusClass = 'underscore--success';
        if (cluster.some(item => item.category === 'directional' || item.category === 'bom')) {
          statusClass = 'underscore--error';
        } else if (cluster.some(item => item.category === 'space' || item.category === 'mongolianFVS')) {
          statusClass = 'underscore--warning';
        }

        // Prepend a spacer underline instead of wrapping the character itself
        const spacerHtml = `<span class="visual-underscore-spacer ${statusClass}" title="${escSafe(tooltipText)}">&nbsp;</span>`;
        charHtml = spacerHtml + charHtml;
      }

      html += charHtml;
    }

    // Handle trailing hidden characters
    if (hiddenClusters.has(n)) {
      const cluster = hiddenClusters.get(n);
      const count = cluster.length;
      const tooltipText = String(count);

      let statusClass = 'underscore--success';
      if (cluster.some(item => item.category === 'directional' || item.category === 'bom')) {
        statusClass = 'underscore--error';
      } else if (cluster.some(item => item.category === 'space' || item.category === 'mongolianFVS')) {
        statusClass = 'underscore--warning';
      }

      html += `<span class="visual-underscore-spacer ${statusClass}" title="${escSafe(tooltipText)}">&nbsp;</span>`;
    }

    if (n > maxPreviewChars) {
      html += `<div style="margin-top: var(--space-sm); font-style: italic; opacity: 0.5; font-size: 0.75rem;">... [Text truncated for performance / تم اقتطاع النص للحفاظ على الأداء]</div>`;
    }

    return html;
  }

  function renderResultsTable(analysis) {
    const container = document.getElementById('steganalysisResultsBody');
    if (!container) return;

    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const endIdx = Math.min(startIdx + PAGE_SIZE, analysis.results.length);
    const paginatedResults = analysis.results.slice(startIdx, endIdx);

    let tableRows = '';
    paginatedResults.forEach((item, idx) => {
      const catKey = CATEGORY_I18N[item.category] || item.category;
      const catLabel = t(catKey);
      const ctxBefore = escSafe(item.contextBefore);
      const ctxAfter = escSafe(item.contextAfter);
      const globalIdx = startIdx + idx + 1;

      // Determine status class based on category
      let rowModifier = 'row--warning';
      if (item.category === 'directional' || item.category === 'bom') {
        rowModifier = 'row--error';
      } else if (item.category === 'zeroWidth' || item.category === 'variationSelector') {
        rowModifier = 'row--success';
      }

      tableRows += `
        <tr class="${rowModifier}">
          <td style="text-align: center;"><span class="stego-table__index">#${globalIdx}</span></td>
          <td style="font-family: monospace; font-weight: 600;"><code style="font-family:'Sora', monospace; font-weight:600; color:#E6A817; background:rgba(230,168,23,0.08); padding:2px 8px; border-radius:var(--radius-default); font-size:0.75rem;">${item.hexCode}</code></td>
          <td style="font-weight: 600; color: var(--color-on-surface);">${escSafe(item.name)}</td>
          <td><span class="steganalysis-cat-chip steganalysis-cat--${item.category}">${catLabel}</span></td>
          <td><span class="pos-chip">#${item.position}</span></td>
          <td dir="ltr">
            <span class="steganalysis-context">
              ${ctxBefore}<span class="steganalysis-context__marker" title="${t('markerHiddenText')}"><span class="material-symbols-outlined" style="font-size: 11px; font-weight: bold; vertical-align: middle; line-height: 1;">visibility_off</span><span style="font-size: 10px; font-weight: 700; vertical-align: middle; text-transform: uppercase;">${t('markerHiddenText')}</span></span>${ctxAfter}
            </span>
          </td>
        </tr>
      `;
    });

    // SECURITY: All dynamic values are escaped via escSafe() or derived from strict code variables (safe)
    container.innerHTML = `
      <!-- Visual forensic text mapping panel -->
      <div class="steganalysis-visual-map">
        <div class="visual-map__title">
          <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 1.20rem; vertical-align: middle;">map</span>
          <span>${t('visualMapTitle')}</span>
        </div>
        <div class="visual-map__content" dir="auto">${renderVisualMap(analysis.inputText, analysis)}</div>
      </div>

      <div class="steganalysis-table-container">
        <table class="steganalysis-table">
          <thead>
            <tr>
              <th style="width: 60px; text-align: center;">${t('tableColIndex')}</th>
              <th style="width: 110px;">${t('tableColHex')}</th>
              <th>${t('tableColName')}</th>
              <th style="width: 140px;">${t('tableColCategory')}</th>
              <th style="width: 100px;">${t('tableColPosition')}</th>
              <th>${t('tableColContext')}</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    `;

    renderPagination(analysis.results.length);
    applyScrollReveal();
  }


  function applyScrollReveal() {
    const rows = document.querySelectorAll('.steganalysis-table tbody tr');
    if (rows.length === 0) return;

    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.05
    };

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry, idx) => {
        if (entry.isIntersecting) {
          // Staggered delay for rows in viewport
          setTimeout(() => {
            entry.target.classList.add('reveal-visible');
          }, idx * 45); // 45ms staggering
          obs.unobserve(entry.target);
        }
      });
    }, observerOptions);

    rows.forEach(row => {
      observer.observe(row);
    });
  }


  function renderPagination(totalFound) {
    const container = document.getElementById('steganalysisResultsBody');
    if (!container) return;

    const totalPages = Math.ceil(totalFound / PAGE_SIZE);
    if (totalPages <= 1) return;

    const pagWrap = document.createElement('div');
    pagWrap.className = 'steganalysis-pagination';

    // Previous Page Button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pag-btn';
    // SAFE: Build icon via createElement + textContent (no innerHTML)
    const prevIcon = document.createElement('span');
    prevIcon.className = 'material-symbols-outlined';
    prevIcon.style.fontSize = '18px';
    prevIcon.textContent = 'chevron_left';
    prevBtn.appendChild(prevIcon);
    prevBtn.title = t('pagePrev');
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        goToPage(currentPage);
      }
    });
    pagWrap.appendChild(prevBtn);

    // Page Numbers
    const pageNumbers = getPageNumbers(totalPages, currentPage);
    pageNumbers.forEach(page => {
      if (page === '...') {
        const span = document.createElement('span');
        span.className = 'pag-ellipsis';
        span.textContent = '...';
        pagWrap.appendChild(span);
      } else {
        const btn = document.createElement('button');
        btn.className = 'pag-btn' + (page === currentPage ? ' active' : '');
        btn.textContent = page;
        btn.addEventListener('click', () => {
          currentPage = page;
          goToPage(currentPage);
        });
        pagWrap.appendChild(btn);
      }
    });
    // Next Page Button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'pag-btn';
    // SAFE: Build icon via createElement + textContent (no innerHTML)
    const nextIcon = document.createElement('span');
    nextIcon.className = 'material-symbols-outlined';
    nextIcon.style.fontSize = '18px';
    nextIcon.textContent = 'chevron_right';
    nextBtn.appendChild(nextIcon);
    nextBtn.title = t('pageNext');
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        goToPage(currentPage);
      }
    });
    pagWrap.appendChild(nextBtn);

    container.appendChild(pagWrap);
  }

  function getPageNumbers(totalPages, current) {
    const pages = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (current <= 4) {
        pages.push(2, 3, 4, 5);
        pages.push('...');
        pages.push(totalPages);
      } else if (current >= totalPages - 3) {
        pages.push('...');
        for (let i = totalPages - 4; i < totalPages; i++) {
          pages.push(i);
        }
        pages.push(totalPages);
      } else {
        pages.push('...');
        pages.push(current - 1, current, current + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  }

  function goToPage(page) {
    renderResultsTable(currentAnalysis);
    
    // Smooth scroll back to table start
    const tableWrap = document.querySelector('.stego-table');
    if (tableWrap) {
      tableWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function renderSummary(analysis, risk) {
    const summaryEl = document.getElementById('steganalysisSummary');
    if (!summaryEl) return;
    summaryEl.style.display = '';

    const summaryText = document.getElementById('steganalysisSummaryText');
    if (summaryText) {
      if (analysis.totalFound === 0) {
        summaryText.textContent = t('steganalysisSummaryClean');
      } else {
        summaryText.textContent = `${analysis.totalFound} ${t('steganalysisSummaryFound')} ${analysis.distinctTypes} ${t('steganalysisSummaryTypes')}`;
      }
    }
  }

  /**
   * Escape HTML special characters (XSS prevention).
   */
  function escSafe(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── INITIALIZATION ──────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSteganalysis);
  } else {
    initSteganalysis();
  }
})();
