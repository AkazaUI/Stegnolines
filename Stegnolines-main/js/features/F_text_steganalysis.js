// ══════════════════════════════════════════════════════════════
// STEGNOLINES — Text Steganalysis Detection Engine & Forensic Controller
// ══════════════════════════════════════════════════════════════
//
// Scans input text for hidden Unicode characters (zero-width,
// directional overrides, variation selectors, special spaces)
// and Homograph (Homoglyph) / Fullwidth letter and digit substitutions.
//
// Features:
//   - Multi-Technique Taxonomy Classification (ZWC, VS, HOMOGRAPH, SPACE, BIDI)
//   - Universal Zero-Key Forensic Message Extractor (Restored Text, Evasive Character Sequence, Bit Matrix Payload)
//   - Visual Forensic Diff Mapping & Risk Assessment
//
// ══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── PAGINATION CONFIGURATION & STATE ────────────────────────
  const PAGE_SIZE = 50;
  let currentAnalysis = null;
  let currentPage = 1;

  // ── CHARACTER LOOKUP MAP ────────────────────────────────────
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
    0x2000: { name: 'En Quad Space',             category: 'space' },
    0x2001: { name: 'Em Quad Space',             category: 'space' },
    0x2002: { name: 'En Space',                  category: 'space' },
    0x2003: { name: 'Em Space',                  category: 'space' },
    0x2004: { name: 'Three-Per-Em Space',        category: 'space' },
    0x2005: { name: 'Four-Per-Em Space',         category: 'space' },
    0x2006: { name: 'Six-Per-Em Space',          category: 'space' },
    0x2007: { name: 'Figure Space',              category: 'space' },
    0x2008: { name: 'Punctuation Space',         category: 'space' },
    0x2009: { name: 'Thin Space',                category: 'space' },
    0x200A: { name: 'Hair Space',                category: 'space' },
    0x202F: { name: 'Narrow No-Break Space',     category: 'space' },

    // ── Mongolian Vowel Separator ──
    0x180E: { name: 'Mongolian Vowel Separator', category: 'zeroWidth' },
  };

  // ── HOMOGRAPH (HOMOGLYPH) LOOKUP DICTIONARY ─────────────────
  const HOMOGRAPH_MAP = {
    // Cyrillic Lowercase Lookalikes
    0x0430: { name: "Cyrillic Small Letter А (Homograph of 'a')", canonical: 'a', category: 'homograph' },
    0x0435: { name: "Cyrillic Small Letter Е (Homograph of 'e')", canonical: 'e', category: 'homograph' },
    0x043E: { name: "Cyrillic Small Letter О (Homograph of 'o')", canonical: 'o', category: 'homograph' },
    0x0440: { name: "Cyrillic Small Letter Р (Homograph of 'p')", canonical: 'p', category: 'homograph' },
    0x0441: { name: "Cyrillic Small Letter С (Homograph of 'c')", canonical: 'c', category: 'homograph' },
    0x0445: { name: "Cyrillic Small Letter Х (Homograph of 'x')", canonical: 'x', category: 'homograph' },
    0x0443: { name: "Cyrillic Small Letter У (Homograph of 'y')", canonical: 'y', category: 'homograph' },
    0x0456: { name: "Cyrillic Small Letter І (Homograph of 'i')", canonical: 'i', category: 'homograph' },
    0x0455: { name: "Cyrillic Small Letter Ѕ (Homograph of 's')", canonical: 's', category: 'homograph' },
    0x0501: { name: "Cyrillic Small Letter Komi De ԁ (Homograph of 'd')", canonical: 'd', category: 'homograph' },

    // Cyrillic Uppercase Lookalikes
    0x0410: { name: "Cyrillic Capital Letter А (Homograph of 'A')", canonical: 'A', category: 'homograph' },
    0x0412: { name: "Cyrillic Capital Letter В (Homograph of 'B')", canonical: 'B', category: 'homograph' },
    0x0415: { name: "Cyrillic Capital Letter Е (Homograph of 'E')", canonical: 'E', category: 'homograph' },
    0x041A: { name: "Cyrillic Capital Letter К (Homograph of 'K')", canonical: 'K', category: 'homograph' },
    0x041C: { name: "Cyrillic Capital Letter М (Homograph of 'M')", canonical: 'M', category: 'homograph' },
    0x041D: { name: "Cyrillic Capital Letter Н (Homograph of 'H')", canonical: 'H', category: 'homograph' },
    0x041E: { name: "Cyrillic Capital Letter О (Homograph of 'O')", canonical: 'O', category: 'homograph' },
    0x0420: { name: "Cyrillic Capital Letter Р (Homograph of 'P')", canonical: 'P', category: 'homograph' },
    0x0421: { name: "Cyrillic Capital Letter С (Homograph of 'C')", canonical: 'C', category: 'homograph' },
    0x0422: { name: "Cyrillic Capital Letter Т (Homograph of 'T')", canonical: 'T', category: 'homograph' },
    0x0425: { name: "Cyrillic Capital Letter Х (Homograph of 'X')", canonical: 'X', category: 'homograph' },
    0x0423: { name: "Cyrillic Capital Letter У (Homograph of 'Y')", canonical: 'Y', category: 'homograph' },

    // Greek Lookalikes
    0x03BF: { name: "Greek Small Letter Omicron ο (Homograph of 'o')", canonical: 'o', category: 'homograph' },
    0x03BD: { name: "Greek Small Letter Nu ν (Homograph of 'v')", canonical: 'v', category: 'homograph' },
    0x03C5: { name: "Greek Small Letter Upsilon υ (Homograph of 'u')", canonical: 'u', category: 'homograph' },
    0x03C1: { name: "Greek Small Letter Rho ρ (Homograph of 'p')", canonical: 'p', category: 'homograph' },
    0x0391: { name: "Greek Capital Letter Alpha Α (Homograph of 'A')", canonical: 'A', category: 'homograph' },
    0x0392: { name: "Greek Capital Letter Beta Β (Homograph of 'B')", canonical: 'B', category: 'homograph' },
    0x0395: { name: "Greek Capital Letter Epsilon Ε (Homograph of 'E')", canonical: 'E', category: 'homograph' },
    0x0396: { name: "Greek Capital Letter Zeta Ζ (Homograph of 'Z')", canonical: 'Z', category: 'homograph' },
    0x0397: { name: "Greek Capital Letter Eta Η (Homograph of 'H')", canonical: 'H', category: 'homograph' },
    0x0399: { name: "Greek Capital Letter Iota Ι (Homograph of 'I')", canonical: 'I', category: 'homograph' },
    0x039A: { name: "Greek Capital Letter Kappa Κ (Homograph of 'K')", canonical: 'K', category: 'homograph' },
    0x039C: { name: "Greek Capital Letter Mu Μ (Homograph of 'M')", canonical: 'M', category: 'homograph' },
    0x039D: { name: "Greek Capital Letter Nu Ν (Homograph of 'N')", canonical: 'N', category: 'homograph' },
    0x039F: { name: "Greek Capital Letter Omicron Ο (Homograph of 'O')", canonical: 'O', category: 'homograph' },
    0x03A1: { name: "Greek Capital Letter Rho Ρ (Homograph of 'P')", canonical: 'P', category: 'homograph' },
    0x03A4: { name: "Greek Capital Letter Tau Τ (Homograph of 'T')", canonical: 'T', category: 'homograph' },
    0x03A7: { name: "Greek Capital Letter Chi Χ (Homograph of 'X')", canonical: 'X', category: 'homograph' },
    0x03A5: { name: "Greek Capital Letter Upsilon Υ (Homograph of 'Y')", canonical: 'Y', category: 'homograph' }
  };

  const CANONICAL_SUBSTITUTABLE = new Set([
    0x0061, 0x0065, 0x006F, 0x0070, 0x0063, 0x0078, 0x0079, 0x0069, 0x0073, 0x0064, 0x0076, 0x0075,
    0x0041, 0x0042, 0x0045, 0x004B, 0x004D, 0x0048, 0x004F, 0x0050, 0x0043, 0x0054, 0x0058, 0x0059, 0x005A, 0x0049, 0x004E
  ]);

  // ── RANGE-BASED DETECTION GROUPS ────────────────────────────
  const RANGES = [
    {
      start: 0xFE00,
      end: 0xFE0F,
      namePrefix: 'Variation Selector',
      category: 'variationSelector',
      indexOffset: 1
    },
    {
      start: 0xE0100,
      end: 0xE01EF,
      namePrefix: 'Variation Selector',
      category: 'variationSelector',
      indexOffset: 17
    },
    {
      start: 0x180B,
      end: 0x180F,
      namePrefix: 'Mongolian Free Variation Selector',
      category: 'mongolianFVS',
      indexOffset: 1
    },
    {
      start: 0xFF01,
      end: 0xFF5E,
      namePrefix: 'Fullwidth ASCII Homograph',
      category: 'homograph',
      indexOffset: 1
    }
  ];

  // Helper to resolve canonical character for any code point
  function getCanonicalChar(cp) {
    if (HOMOGRAPH_MAP[cp]) {
      return HOMOGRAPH_MAP[cp].canonical;
    }
    // Fullwidth ASCII Range (U+FF01 to U+FF5E) -> Canonical ASCII (Shift is 0xFEE0)
    if (cp >= 0xFF01 && cp <= 0xFF5E) {
      return String.fromCharCode(cp - 0xFEE0);
    }
    // Special spaces -> normal space
    if (CHAR_MAP[cp] && CHAR_MAP[cp].category === 'space') {
      return ' ';
    }
    // Zero width & variation selectors -> stripped
    if (CHAR_MAP[cp] && CHAR_MAP[cp].category === 'zeroWidth') return '';
    if (CHAR_MAP[cp] && CHAR_MAP[cp].category === 'bom') return '';
    for (const range of RANGES) {
      if (cp >= range.start && cp <= range.end) {
        if (range.category === 'variationSelector' || range.category === 'mongolianFVS') return '';
      }
    }
    return String.fromCodePoint(cp);
  }

  // ── CORE ANALYSIS FUNCTION ──────────────────────────────────
  function analyzeText(inputText) {
    const t0 = performance.now();
    const results = [];
    const typesSet = new Set();
    const categoriesMap = {
      zeroWidth: 0,
      variationSelector: 0,
      mongolianFVS: 0,
      homograph: 0,
      space: 0,
      directional: 0,
      bom: 0
    };

    const chars = [...inputText];
    const n = chars.length;

    // 1. Backward pass for contextAfter
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

    // 2. Forward pass for detection
    let activePrev = [];

    for (let position = 0; position < n; position++) {
      const char = chars[position];
      const cp = char.codePointAt(0);

      let match = null;

      if (CHAR_MAP[cp]) {
        match = {
          codePoint: cp,
          hexCode: 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'),
          name: CHAR_MAP[cp].name,
          category: CHAR_MAP[cp].category,
        };
      } else if (HOMOGRAPH_MAP[cp]) {
        match = {
          codePoint: cp,
          hexCode: 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'),
          name: HOMOGRAPH_MAP[cp].name,
          category: HOMOGRAPH_MAP[cp].category,
        };
      } else {
        for (const range of RANGES) {
          if (cp >= range.start && cp <= range.end) {
            let nameStr = range.namePrefix + ' ' + (cp - range.start + range.indexOffset);
            if (cp >= 0xFF01 && cp <= 0xFF5E) {
              const canonicalChar = String.fromCharCode(cp - 0xFEE0);
              nameStr = `Fullwidth ASCII '${char}' (Homograph of '${canonicalChar}')`;
            }
            match = {
              codePoint: cp,
              hexCode: 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'),
              name: nameStr,
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
        if (categoriesMap[match.category] !== undefined) {
          categoriesMap[match.category]++;
        }
      } else {
        if (!isHiddenCodePoint(cp) && cp > 0x001F) {
          activePrev.push(char);
          if (activePrev.length > 3) {
            activePrev.shift();
          }
        }
      }
    }

    // 3. Aggregate Steganographic Techniques Taxonomy
    const techniques = [];
    if (categoriesMap.zeroWidth > 0) {
      techniques.push({ id: 'ZWC', nameKey: 'techniqueZWC', count: categoriesMap.zeroWidth });
    }
    if (categoriesMap.variationSelector > 0 || categoriesMap.mongolianFVS > 0) {
      techniques.push({ id: 'VS', nameKey: 'techniqueVS', count: categoriesMap.variationSelector + categoriesMap.mongolianFVS });
    }
    if (categoriesMap.homograph > 0) {
      techniques.push({ id: 'HOMOGRAPH', nameKey: 'techniqueHomograph', count: categoriesMap.homograph });
    }
    if (categoriesMap.space > 0) {
      techniques.push({ id: 'SPACE', nameKey: 'techniqueSpace', count: categoriesMap.space });
    }
    if (categoriesMap.directional > 0 || categoriesMap.bom > 0) {
      techniques.push({ id: 'BIDI', nameKey: 'techniqueBiDi', count: categoriesMap.directional + categoriesMap.bom });
    }

    const t1 = performance.now();

    return {
      results: results,
      totalFound: results.length,
      distinctTypes: typesSet.size,
      computationTimeMs: parseFloat((t1 - t0).toFixed(2)),
      inputText: inputText,
      techniques: techniques
    };
  }

  function isHiddenCodePoint(cp) {
    if (CHAR_MAP[cp] || HOMOGRAPH_MAP[cp]) return true;
    for (const range of RANGES) {
      if (cp >= range.start && cp <= range.end) return true;
    }
    return false;
  }



  // ── RISK CLASSIFICATION ─────────────────────────────────────
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
    homograph: 'catHomograph'
  };

  // ── UI CONTROLLER & RENDERING ───────────────────────────────
  function initSteganalysis() {
    const analyzeBtn = document.getElementById('steganalysis-btn');
    const textInput = document.getElementById('steganalysisInput');
    const resultsPanel = document.getElementById('steganalysis-results-panel');

    if (!analyzeBtn || !textInput) return;

    analyzeBtn.addEventListener('click', function () {
      const text = textInput.value;

      if (typeof validateEmojiInputs === 'function') {
        const emojiError = validateEmojiInputs([
          { el: textInput, name: { en: "Input Text", ar: "النص المدخل" } }
        ]);
        if (emojiError) return;
      }

      if (!text || text.trim().length === 0) {
        if (typeof showToast === 'function') {
          showToast('⚠ ' + t('steganalysisEmptyInput'));
        }
        return;
      }

      analyzeBtn.disabled = true;
      analyzeBtn.innerHTML = `
        <span class="material-symbols-outlined btn-spinner">progress_activity</span>
        <span>${t('steganalysisAnalyzing')}</span>
      `;

      setTimeout(() => {
        currentAnalysis = analyzeText(text);
        currentPage = 1;
        const risk = classifyRisk(currentAnalysis.totalFound);

        if (resultsPanel) resultsPanel.style.display = '';

        renderMetrics(currentAnalysis, risk);

        if (currentAnalysis.totalFound === 0) {
          renderCleanState();
        } else {
          renderResultsTable(currentAnalysis);
          renderSummary(currentAnalysis, risk);
        }

        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = `
          <span class="material-symbols-outlined" style="font-size:18px">search_insights</span>
          <span data-i18n="btnAnalyzeText">${t('btnAnalyzeText')}</span>
        `;

        if (typeof showToast === 'function') {
          showToast('✅ ' + t('steganalysisCompleted'));
        }
        if (resultsPanel) {
          setTimeout(() => {
            resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      }, 50);
    });
  }

  function t(key) {
    const lang = localStorage.getItem('stegoLang') || document.documentElement.lang || 'en';
    if (window.translations && window.translations[lang] && window.translations[lang][key]) {
      return window.translations[lang][key];
    }
    if (typeof I18N_STEGANALYSIS !== 'undefined') {
      if (I18N_STEGANALYSIS[lang] && I18N_STEGANALYSIS[lang][key]) return I18N_STEGANALYSIS[lang][key];
      if (I18N_STEGANALYSIS['en'] && I18N_STEGANALYSIS['en'][key]) return I18N_STEGANALYSIS['en'][key];
    }
    return key;
  }

  function renderMetrics(analysis, risk) {
    const totalEl = document.getElementById('steganalysisTotalVal');
    if (totalEl) {
      totalEl.textContent = analysis.totalFound;
      if (typeof animateCounter === 'function' && analysis.totalFound > 0) {
        animateCounter(totalEl, analysis.totalFound, '', 600);
      }
    }

    const typesEl = document.getElementById('steganalysisTypesVal');
    if (typesEl) {
      typesEl.textContent = analysis.distinctTypes;
      if (typeof animateCounter === 'function' && analysis.distinctTypes > 0) {
        animateCounter(typesEl, analysis.distinctTypes, '', 600);
      }
    }

    const timeEl = document.getElementById('steganalysisTimeVal');
    if (timeEl) {
      timeEl.textContent = analysis.computationTimeMs + ' ms';
    }
  }

  function renderCleanState() {
    const container = document.getElementById('steganalysisResultsBody');
    if (!container) return;

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

  function renderTechniquesBanner(analysis) {
    if (!analysis.techniques || analysis.techniques.length === 0) return '';

    let badgesHtml = '';
    analysis.techniques.forEach(tech => {
      badgesHtml += `
        <div class="technique-badge technique-badge--${tech.id}">
          <span class="material-symbols-outlined" style="font-size: 16px;">psychology</span>
          <span>${t(tech.nameKey)}</span>
          <span class="technique-badge__count">${tech.count}</span>
        </div>
      `;
    });

    return `
      <div class="steganography-techniques-banner">
        <div class="steganography-techniques-banner__title">
          <span class="material-symbols-outlined" style="color: var(--color-primary);">hub</span>
          <span>${t('techniqueTitle')}</span>
        </div>
        <div class="steganography-techniques-banner__list">
          ${badgesHtml}
        </div>
      </div>
    `;
  }

  function renderVisualMap(inputText, analysis) {
    if (!inputText) return '';
    const chars = [...inputText];
    const n = chars.length;

    const resultsMap = new Map();
    analysis.results.forEach(r => {
      resultsMap.set(r.position, r);
    });

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
      const char = chars[i];
      const resultItem = resultsMap.get(i);

      if (resultItem && resultItem.category === 'homograph') {
        const tooltipText = `${resultItem.name} (${resultItem.hexCode})`;
        html += `<span class="visual-underscore underscore--warning" title="${escSafe(tooltipText)}">${escSafe(char)}</span>`;
        continue;
      }

      if (resultsMap.has(i)) {
        continue;
      }

      let charHtml = '';
      if (char === '\n') {
        charHtml = '<br>';
      } else if (char === '\r') {
        continue;
      } else if (char === ' ') {
        charHtml = ' ';
      } else {
        charHtml = escSafe(char);
      }

      if (hiddenClusters.has(i)) {
        const cluster = hiddenClusters.get(i);
        const count = cluster.length;
        const tooltipText = String(count);

        let statusClass = 'underscore--success';
        if (cluster.some(item => item.category === 'directional' || item.category === 'bom')) {
          statusClass = 'underscore--error';
        } else if (cluster.some(item => item.category === 'space' || item.category === 'mongolianFVS' || item.category === 'homograph')) {
          statusClass = 'underscore--warning';
        }

        const spacerHtml = `<span class="visual-underscore-spacer ${statusClass}" title="${escSafe(tooltipText)}">&nbsp;</span>`;
        charHtml = spacerHtml + charHtml;
      }

      html += charHtml;
    }

    if (hiddenClusters.has(n)) {
      const cluster = hiddenClusters.get(n);
      const count = cluster.length;
      const tooltipText = String(count);

      let statusClass = 'underscore--success';
      if (cluster.some(item => item.category === 'directional' || item.category === 'bom')) {
        statusClass = 'underscore--error';
      } else if (cluster.some(item => item.category === 'space' || item.category === 'mongolianFVS' || item.category === 'homograph')) {
        statusClass = 'underscore--warning';
      }

      html += `<span class="visual-underscore-spacer ${statusClass}" title="${escSafe(tooltipText)}">&nbsp;</span>`;
    }

    if (n > maxPreviewChars) {
      html += `<div style="margin-top: var(--space-sm); font-style: italic; opacity: 0.5; font-size: 0.75rem;">... [Text truncated for performance]</div>`;
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

      let rowModifier = 'row--warning';
      if (item.category === 'directional' || item.category === 'bom') {
        rowModifier = 'row--error';
      } else if (item.category === 'zeroWidth' || item.category === 'variationSelector') {
        rowModifier = 'row--success';
      }

      tableRows += `
        <tr class="${rowModifier}">
          <td style="text-align: center;"><span class="stego-table__index">#${globalIdx}</span></td>
          <td style="font-family: monospace; font-weight: 600;"><code style="font-family:'Sora', monospace; font-weight:600; color:var(--color-primary); background:rgba(187,209,0,0.08); padding:2px 8px; border-radius:var(--radius-default); font-size:0.75rem;">${item.hexCode}</code></td>
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

    const techniquesBannerHtml = renderTechniquesBanner(analysis);

    container.innerHTML = `
      ${techniquesBannerHtml}

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
          setTimeout(() => {
            entry.target.classList.add('reveal-visible');
          }, idx * 45);
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

    const prevBtn = document.createElement('button');
    prevBtn.className = 'pag-btn';
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

    const nextBtn = document.createElement('button');
    nextBtn.className = 'pag-btn';
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

  function escSafe(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSteganalysis);
  } else {
    initSteganalysis();
  }
})();

