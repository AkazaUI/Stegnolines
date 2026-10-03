/**
 * @file threat-dashboard.js
 * @description Forensic UI Dashboard: Threat Meter, Metrics, Suspect Messages, Dual-Hash Console, and Signatures.
 * Compatible with browser script tags and module exports.
 */

(function (global) {
  'use strict';

  const CATEGORY_I18N = Object.freeze({
    zeroWidth: 'catZeroWidth',
    directional: 'catDirectional',
    space: 'catSpace',
    variationSelector: 'catVariationSelector',
    mongolianFVS: 'catMongolianFVS',
    bom: 'catBOM',
    homograph: 'catHomograph'
  });

  function escSafe(str) {
    if (global.StegVisualMap && typeof global.StegVisualMap.escSafe === 'function') {
      return global.StegVisualMap.escSafe(str);
    }
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function getCurLang() {
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem('stegoLang')) {
        return localStorage.getItem('stegoLang');
      }
      if (typeof document !== 'undefined' && document.documentElement && document.documentElement.lang) {
        return document.documentElement.lang;
      }
    } catch (e) {
      // ignore
    }
    return 'en';
  }

  function t(key) {
    const lang = getCurLang();
    if (typeof window !== 'undefined' && window.translations && window.translations[lang] && window.translations[lang][key]) {
      return window.translations[lang][key];
    }
    if (typeof I18N_STEGANALYSIS !== 'undefined') {
      if (I18N_STEGANALYSIS[lang] && I18N_STEGANALYSIS[lang][key]) return I18N_STEGANALYSIS[lang][key];
      if (I18N_STEGANALYSIS['en'] && I18N_STEGANALYSIS['en'][key]) return I18N_STEGANALYSIS['en'][key];
    }
    if (typeof I18N_COMMON !== 'undefined') {
      if (I18N_COMMON[lang] && I18N_COMMON[lang][key]) return I18N_COMMON[lang][key];
      if (I18N_COMMON['en'] && I18N_COMMON['en'][key]) return I18N_COMMON['en'][key];
    }
    return key;
  }

  function getVisualSymbolBadge(cp) {
    if (cp === 0x0020) return '<span class="stego-glyph-badge stego-glyph--space">[Space]</span>';
    if (cp === 0x0009) return '<span class="stego-glyph-badge stego-glyph--space">[Tab]</span>';
    if (global.StegDetectHomoglyphs && global.StegDetectHomoglyphs.HOMOGRAPH_MAP[cp]) {
      return `<span class="stego-glyph-badge stego-glyph--visible">${String.fromCodePoint(cp)}</span>`;
    }
    if (cp === 0x200B) return '<span class="stego-glyph-badge stego-glyph--zwc">ZWSP</span>';
    if (cp === 0x200C) return '<span class="stego-glyph-badge stego-glyph--zwc">ZWNJ</span>';
    if (cp === 0x200D) return '<span class="stego-glyph-badge stego-glyph--zwc">ZWJ</span>';
    if (cp === 0xFEFF) return '<span class="stego-glyph-badge stego-glyph--zwc">BOM</span>';
    if (cp === 0x200E) return '<span class="stego-glyph-badge stego-glyph--bidi">LRM</span>';
    if (cp === 0x200F) return '<span class="stego-glyph-badge stego-glyph--bidi">RLM</span>';
    if (cp === 0x202A) return '<span class="stego-glyph-badge stego-glyph--bidi">LRE</span>';
    if (cp === 0x202C) return '<span class="stego-glyph-badge stego-glyph--bidi">PDF</span>';
    if (cp === 0x202D) return '<span class="stego-glyph-badge stego-glyph--bidi">LRO</span>';
    if (cp === 0x2060) return '<span class="stego-glyph-badge stego-glyph--zwc">WJ</span>';
    if (cp === 0x2061) return '<span class="stego-glyph-badge stego-glyph--op">FA</span>';
    if (cp === 0x2062) return '<span class="stego-glyph-badge stego-glyph--op">IT</span>';
    if (cp === 0x2063) return '<span class="stego-glyph-badge stego-glyph--op">IS</span>';
    if (cp === 0x2064) return '<span class="stego-glyph-badge stego-glyph--op">IP</span>';
    if (cp === 0x206A) return '<span class="stego-glyph-badge stego-glyph--op">ISS</span>';
    if (cp === 0x206B) return '<span class="stego-glyph-badge stego-glyph--op">ASS</span>';
    if (cp === 0x206C) return '<span class="stego-glyph-badge stego-glyph--op">IAFS</span>';
    if (cp === 0x206D) return '<span class="stego-glyph-badge stego-glyph--op">AAFS</span>';
    if (cp === 0x206E) return '<span class="stego-glyph-badge stego-glyph--op">NDS</span>';
    if (cp === 0x206F) return '<span class="stego-glyph-badge stego-glyph--op">NODS</span>';
    if (cp === 0x2205) return '<span class="stego-glyph-badge stego-glyph--op">∅</span>';
    if (cp >= 0xFE00 && cp <= 0xFE0F) return `<span class="stego-glyph-badge stego-glyph--vs">VS${cp - 0xFE00 + 1}</span>`;
    if (cp >= 0xE0100 && cp <= 0xE01EF) return `<span class="stego-glyph-badge stego-glyph--vs">VS${cp - 0xE0100 + 17}</span>`;
    return '<span class="stego-glyph-badge">◌</span>';
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

  function renderCleanWithObservationsState(analysis) {
    const container = document.getElementById('steganalysisResultsBody');
    if (!container) return;

    const obsCount = analysis ? (analysis.observationCount || (analysis.observations ? analysis.observations.length : 0)) : 0;
    const benignCount = analysis ? (analysis.benignObservationCount || 0) : 0;
    const ambiguousCount = analysis ? (analysis.ambiguousObservationCount || 0) : 0;

    container.innerHTML = `
      <div class="steganalysis-clean-state steganalysis-clean-state--observed">
        <div class="steganalysis-clean-state__icon" style="background: rgba(76, 175, 80, 0.12); color: #4CAF50;">
          <span class="material-symbols-outlined">verified_user</span>
        </div>
        <h3 class="steganalysis-clean-state__title" data-i18n="steganalysisCleanWithObsTitle">${t('steganalysisCleanWithObsTitle')}</h3>
        <p class="steganalysis-clean-state__subtitle" data-i18n="steganalysisCleanWithObsSubtitle">${t('steganalysisCleanWithObsSubtitle')}</p>
        <div style="margin-top: var(--space-md); display: flex; gap: var(--space-sm); justify-content: center; flex-wrap: wrap;">
          <span class="badge badge--neutral text-label-xs">
            <span class="material-symbols-outlined" style="font-size: 14px;">visibility</span>
            ${obsCount} ${t('metricObservations') || 'Observations'}
          </span>
          <span class="badge badge--success text-label-xs">
            <span class="material-symbols-outlined" style="font-size: 14px;">check_circle</span>
            ${benignCount} ${t('catBenign') || 'Benign / Typography'}
          </span>
          ${ambiguousCount > 0 ? `
            <span class="badge badge--draft text-label-xs">
              <span class="material-symbols-outlined" style="font-size: 14px;">help</span>
              ${ambiguousCount} ${t('catAmbiguous') || 'Isolated / Ambiguous'}
            </span>
          ` : ''}
        </div>
      </div>
    `;
  }

  function renderHorizontalThreatMeter(analysis, risk) {
    const score = (analysis && analysis.evidence && typeof analysis.evidence.score === 'number')
      ? analysis.evidence.score
      : ((risk && typeof risk.score === 'number') ? risk.score : 0);

    let verdictColor = '#4CAF50';
    if (score >= 80) {
      verdictColor = '#B3261E';
    } else if (score >= 60) {
      verdictColor = '#FF9800';
    } else if (score >= 40) {
      verdictColor = '#E6A817';
    } else {
      verdictColor = '#4CAF50';
    }

    return `
      <div class="threat-meter-horizontal">
        <div class="threat-meter-header">
          <div class="threat-meter-title-wrap">
            <span class="material-symbols-outlined" style="color: ${verdictColor}; font-size: 18px;">speed</span>
            <span>${t('threatMeterLabel')}</span>
          </div>
          <div class="threat-meter-score-wrap">
            <span class="threat-meter-pct" id="threatMeterPercent" style="color: ${verdictColor};">${score}%</span>
          </div>
        </div>
        <div class="threat-meter-track">
          <div class="threat-meter-fill" id="horizontalThreatFill" style="width: ${score}%; background: ${verdictColor};"></div>
        </div>
      </div>
    `;
  }

  function renderDualHashConsole(cleanText, rawStegoText, sIdx) {
    const curLang = getCurLang();
    const copyHint = curLang === 'ar' ? 'انقر للنسخ' : 'Click to copy';

    return `
      <div class="hash-console-block hash-console-block--card">
        <div class="hash-console-toolbar">
          <div class="hash-console-toolbar__title">
            <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 16px;">fingerprint</span>
            <span>${t('hashBlockTitle')}</span>
          </div>
        </div>
        <div class="hash-console-body">
          <div class="hash-console-grid">
            <div class="hash-tile hash-tile--clean btn-copy-card-clean-hash" data-idx="${sIdx}" role="button" tabindex="0" title="${copyHint}">
              <div class="hash-tile__header">
                <div class="hash-tile__label hash-tile__label--clean">
                  <span class="material-symbols-outlined" style="font-size: 15px;">verified</span>
                  <span>${t('hashCleanLabel')}</span>
                </div>
                <span class="hash-tile__hint">
                  <span class="material-symbols-outlined" style="font-size: 13px;">content_copy</span>
                  <span>${copyHint}</span>
                </span>
              </div>
              <code class="hash-tile__code" id="stego-clean-hash-${sIdx}">Computing SHA-256...</code>
            </div>

            <div class="hash-tile hash-tile--stego btn-copy-card-stego-hash" data-idx="${sIdx}" role="button" tabindex="0" title="${copyHint}">
              <div class="hash-tile__header">
                <div class="hash-tile__label hash-tile__label--stego">
                  <span class="material-symbols-outlined" style="font-size: 15px;">lock_clock</span>
                  <span>${t('hashStegoLabel')}</span>
                </div>
                <span class="hash-tile__hint">
                  <span class="material-symbols-outlined" style="font-size: 13px;">content_copy</span>
                  <span>${copyHint}</span>
                </span>
              </div>
              <code class="hash-tile__code" id="stego-stego-hash-${sIdx}">Computing SHA-256...</code>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generates authentic clean text stripped ONLY of actionable steganographic carriers,
   * replacing actionable homoglyphs with canonical forms, and preserving benign and ambiguous observations byte-for-byte.
   *
   * @param {string} rawContent - Raw text of the message.
   * @param {Object} [analysis] - Forensic analysis result containing actionable results.
   * @returns {string} Sanitized clean text.
   */
  function sanitizeForensicText(rawContent, analysis) {
    if (!rawContent || typeof rawContent !== 'string') return '';
    if (!analysis || !Array.isArray(analysis.results)) {
      console.warn('sanitizeForensicText: missing or inconsistent analysis, returning original text');
      return rawContent;
    }

    const chars = Array.from(rawContent);
    const actionableMap = new Map();
    for (const r of analysis.results) {
      if (r && typeof r.position === 'number') {
        actionableMap.set(r.position, r);
      }
    }

    const cleanChars = [];
    for (let i = 0; i < chars.length; i++) {
      const item = actionableMap.get(i);
      if (!item) {
        cleanChars.push(chars[i]);
      } else if (item.category === 'homograph' && item.canonical) {
        cleanChars.push(item.canonical);
      }
      // Actionable non-homographs are omitted (stripped)
    }
    return cleanChars.join('');
  }

  async function computeAndFillCardHashes(cleanText, rawStegoText, sIdx) {
    const cleanEl = document.getElementById(`stego-clean-hash-${sIdx}`);
    const stegoEl = document.getElementById(`stego-stego-hash-${sIdx}`);
    if (!cleanEl || !stegoEl) return;

    // Safety check: ensure cleanText has all trailing whitespace and tabs stripped
    const safeCleanText = (cleanText || '').replace(/[ \t]+(?=\r?\n|$)/g, '');
    const safeStegoText = rawStegoText || '';

    try {
      if (typeof sha256 === 'function') {
        const cleanHash = await sha256(safeCleanText);
        const stegoHash = await sha256(safeStegoText);
        cleanEl.textContent = cleanHash;
        stegoEl.textContent = stegoHash;
      } else {
        cleanEl.textContent = '(sha256 unavailable)';
        stegoEl.textContent = '(sha256 unavailable)';
      }
    } catch (err) {
      console.warn('Error calculating hashes for suspect card', sIdx, err);
      cleanEl.textContent = 'Hash error';
      stegoEl.textContent = 'Hash error';
    }
  }

  function renderMatchedSignaturesSection(matchedSignatures, analysis) {
    const curLang = getCurLang();
    let cardsHtml = '';
    const hasAmbiguity = matchedSignatures.length > 1;

    matchedSignatures.forEach((sig) => {
      const isAr = curLang === 'ar';
      const title = isAr ? (sig.titleAr || sig.name) : (sig.titleEn || sig.name);
      const typeLabel = sig.type === 'tool'
        ? t('signatureTypeTool')
        : (sig.type === 'watermark'
            ? t('signatureTypeWatermark')
            : (sig.type === 'technique' ? (t('signatureTypeTechnique') || (isAr ? 'تقنية إخفاء' : 'Stego Technique')) : t('signatureTypeResearch')));

      const typeIcon = sig.type === 'tool'
        ? 'build'
        : (sig.type === 'watermark' ? 'verified' : (sig.type === 'technique' ? 'category' : 'menu_book'));
      const badgeClass = sig.type === 'tool'
        ? 'badge--primary'
        : (sig.type === 'watermark' ? 'badge--info' : (sig.type === 'technique' ? 'badge--warning' : 'badge--encrypted'));

      const descText = isAr ? (sig.descAr || sig.descEn) : (sig.descEn || sig.descAr);
      let descHtml = '';
      if (descText) {
        descHtml = `
          <div class="stego-signature-desc">
            <span class="material-symbols-outlined" style="font-size: 15px; color: var(--color-primary); flex-shrink: 0; margin-top: 1px;">info</span>
            <span>${escSafe(descText)}</span>
          </div>
        `;
      }

      let candidateToolsHtml = '';
      if (Array.isArray(sig.candidateTools) && sig.candidateTools.length > 0) {
        let toolsCards = '';
        sig.candidateTools.forEach(ct => {
          const ctName = ct.name;
          const ctDesc = isAr ? (ct.descAr || ct.descEn) : (ct.descEn || ct.descAr);
          const ctTag = isAr ? (ct.tagAr || ct.tag) : (ct.tagEn || ct.tag);
          const openLabel = t('signatureCandidateOpenTool') || (isAr ? 'معاينة الأداة' : 'View Tool');

          toolsCards += `
            <div class="stego-candidate-tool-card">
              <div class="stego-candidate-tool-card__header">
                <div class="stego-candidate-tool-card__title-wrap">
                  <span class="material-symbols-outlined stego-candidate-tool-card__icon">terminal</span>
                  <strong class="stego-candidate-tool-card__name">${escSafe(ctName)}</strong>
                  ${ctTag ? `<span class="badge badge--neutral text-label-xs">${escSafe(ctTag)}</span>` : ''}
                </div>
                ${ct.url ? `
                  <a href="${ct.url}" target="_blank" rel="noopener noreferrer" class="stego-candidate-tool-card__link" title="${openLabel}">
                    <span>${openLabel}</span>
                    <span class="material-symbols-outlined" style="font-size: 13px;">open_in_new</span>
                  </a>
                ` : ''}
              </div>
              ${ctDesc ? `<div class="stego-candidate-tool-card__desc">${escSafe(ctDesc)}</div>` : ''}
            </div>
          `;
        });

        candidateToolsHtml = `
          <div class="stego-candidate-tools-wrap">
            <div class="stego-candidate-tools__title">
              <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-primary);">construction</span>
              <span>${t('signatureCandidateToolsTitle') || (isAr ? 'الأدوات المقترحة المحتمل استخدامها' : 'Candidate / Suggested Tools')}</span>
            </div>
            <p class="stego-candidate-tools__subtitle">
              ${t('signatureCandidateToolsSubtitle') || (isAr ? 'أدوات وبرمجيات معروفة تعتمد هذه التقنية وتنتج هذا النمط من الفراغات:' : 'Known tools and utilities that implement this whitespace steganography pattern:')}
            </p>
            <div class="stego-candidate-tools-grid">
              ${toolsCards}
            </div>
          </div>
        `;
      }

      let tableRows = '';
      if (Array.isArray(sig.encodingTable)) {
        sig.encodingTable.forEach(row => {
          tableRows += `
            <tr>
              <td style="font-weight: 600; color: var(--color-on-surface);">${escSafe(row.charName)}</td>
              <td><code class="code-tag">${escSafe(row.hex)}</code></td>
              <td><span class="stego-bit-badge">${escSafe(row.bits)}</span></td>
              <td style="color: var(--color-on-surface-variant);">${escSafe(row.desc)}</td>
            </tr>
          `;
        });
      }

      let noticeHtml = '';
      if (sig.isWatermark) {
        noticeHtml = `
          <div class="stego-notice-banner stego-notice--watermark">
            <span class="material-symbols-outlined">info</span>
            <span>${t('signatureWatermarkNotice')}</span>
          </div>
        `;
      }

      cardsHtml += `
        <div class="stego-signature-card" id="sig-card-${sig.id}">
          <div class="stego-signature-card__header">
            <div class="stego-signature-card__title-wrap">
              <div class="stego-signature-card__icon-wrap">
                <span class="material-symbols-outlined">${typeIcon}</span>
              </div>
              <div>
                <div class="stego-signature-card__title">${escSafe(title)}</div>
                <div class="stego-signature-card__tags">
                  <span class="badge ${badgeClass} text-label-xs">${typeLabel}</span>
                  <span class="badge badge--success text-label-xs">
                    <span class="material-symbols-outlined" style="font-size: 13px;">check_circle</span>
                    ${t('signatureExactBadge')}
                  </span>
                </div>
              </div>
            </div>
            ${sig.url ? `
              <a href="${sig.url}" target="_blank" rel="noopener noreferrer" class="btn btn--outline stego-signature-card__link-btn">
                <span>${t('signatureOpenLink')}</span>
                <span class="material-symbols-outlined" style="font-size: 16px;">open_in_new</span>
              </a>
            ` : ''}
          </div>

          ${descHtml}
          ${noticeHtml}
          ${candidateToolsHtml}

          <div class="stego-signature-table-wrap">
            <div class="stego-signature-table__title">
              <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-primary);">table_chart</span>
              <span>${t('signatureEncodingTableTitle')}</span>
            </div>
            <div class="steganalysis-table-container">
              <table class="stego-signature-table">
                <thead>
                  <tr>
                    <th>${t('signatureColChar')}</th>
                    <th>${t('signatureColHex')}</th>
                    <th>${t('signatureColBits')}</th>
                    <th>${t('signatureColDesc')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRows}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    });

    let ambiguityAlert = '';
    if (hasAmbiguity) {
      ambiguityAlert = `
        <div class="stego-notice-banner stego-notice--ambiguity">
          <span class="material-symbols-outlined">balance</span>
          <span>${t('signatureAmbiguityNotice')}</span>
        </div>
      `;
    }

    return `
      <div class="stego-signature-section">
        <div class="stego-section-header">
          <div class="stego-section-header__title-wrap">
            <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 1.4rem;">fingerprint</span>
            <h3 class="stego-section-header__title">${t('signatureMatchedTitle')}</h3>
          </div>
          <p class="stego-section-header__subtitle">${t('signatureMatchedSubtitle')}</p>
        </div>
        ${ambiguityAlert}
        <div class="stego-signatures-grid">
          ${cardsHtml}
        </div>
      </div>
    `;
  }

  function renderUniqueSymbolsInventorySection(uniqueSymbols, isNatural) {
    if (!uniqueSymbols || uniqueSymbols.length === 0) return '';

    let naturalAlert = '';
    if (isNatural) {
      naturalAlert = `
        <div class="stego-notice-banner stego-notice--natural">
          <span class="material-symbols-outlined">spellcheck</span>
          <span>${t('naturalFormattingNotice')}</span>
        </div>
      `;
    }

    let rowsHtml = '';
    uniqueSymbols.forEach((item, idx) => {
      const catKey = CATEGORY_I18N[item.category] || item.category;
      const catLabel = t(catKey);
      const glyphBadge = getVisualSymbolBadge(item.codePoint);

      rowsHtml += `
        <tr>
          <td style="text-align: center;"><span class="stego-table__index">#${idx + 1}</span></td>
          <td style="text-align: center;">${glyphBadge}</td>
          <td><code class="code-tag">${escSafe(item.hexCode)}</code></td>
          <td style="font-weight: 600; color: var(--color-on-surface);">${escSafe(item.name)}</td>
          <td><span class="steganalysis-cat-chip steganalysis-cat--${item.category}">${escSafe(catLabel)}</span></td>
          <td style="text-align: center; font-weight: 700; color: var(--color-primary);">${item.count}</td>
          <td style="text-align: center;"><span class="stego-pct-badge">${escSafe(item.percentage)}</span></td>
          <td><code class="stego-suggested-bit">${escSafe(item.suggestedBit)}</code></td>
        </tr>
      `;
    });

    return `
      <div class="stego-inventory-section">
        ${naturalAlert}
        <div class="stego-section-header">
          <div class="stego-section-header__title-wrap">
            <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 1.4rem;">dataset</span>
            <h3 class="stego-section-header__title">${t('inventoryTableTitle')}</h3>
          </div>
          <p class="stego-section-header__subtitle">${t('inventoryTableSubtitle')}</p>
        </div>

        <div class="steganalysis-table-container">
          <table class="stego-inventory-table">
            <thead>
              <tr>
                <th style="width: 50px; text-align: center;">#</th>
                <th style="width: 80px; text-align: center;">${t('inventoryColVisual')}</th>
                <th style="width: 110px;">${t('inventoryColHex')}</th>
                <th>${t('inventoryColName')}</th>
                <th style="width: 140px;">${t('inventoryColCategory')}</th>
                <th style="width: 100px; text-align: center;">${t('inventoryColCount')}</th>
                <th style="width: 100px; text-align: center;">${t('inventoryColPercentage')}</th>
                <th style="width: 160px;">${t('inventoryColSuggestedBit')}</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderSignatureOrInventorySection(analysis) {
    if (!analysis) return '';
    if (analysis.matchedSignatures && analysis.matchedSignatures.length > 0) {
      return renderMatchedSignaturesSection(analysis.matchedSignatures, analysis);
    }
    return renderUniqueSymbolsInventorySection(analysis.uniqueSymbols, analysis.linguisticEval && analysis.linguisticEval.isNatural);
  }

  function renderForensicSummaryDashboard(analysis, suspectMessages, totalMessagesCount) {
    const curLang = getCurLang();
    const isAr = curLang === 'ar';

    const risk = analysis.risk || (analysis.evidence ? { level: analysis.evidence.verdict, score: analysis.evidence.score } : { level: 'clean', score: 0 });
    const threatMeterHtml = renderHorizontalThreatMeter(analysis, risk);

    const totalMsgsCount = totalMessagesCount && totalMessagesCount > 0 ? totalMessagesCount : 1;
    const suspectCount = suspectMessages.length;
    let msgsStatVal = '';
    let msgsStatSub = '';

    if (totalMsgsCount > 1) {
      const pct = ((suspectCount / totalMsgsCount) * 100).toFixed(1);
      msgsStatVal = `${suspectCount}`;
      msgsStatSub = `${(t('summaryOfTotalMsgs') || 'of {total} ({pct}%)').replace('{total}', totalMsgsCount).replace('{pct}', pct)}`;
    } else {
      msgsStatVal = `${suspectCount}`;
      msgsStatSub = t('summaryDirectInputMsg') || (isAr ? 'نص مدخل مباشر' : '1 direct text input');
    }

    const sendersSet = new Set();
    suspectMessages.forEach(m => {
      if (m.sender && m.sender.trim().length > 0) {
        sendersSet.add(m.sender.trim());
      }
    });

    let sendersCardHtml = '';
    if (sendersSet.size > 0) {
      const chips = Array.from(sendersSet).map(s => `
        <span class="summary-sender-chip">
          <span class="material-symbols-outlined">person</span>
          <span>${escSafe(s)}</span>
        </span>
      `).join('');

      sendersCardHtml = `
        <div class="forensic-stat-card">
          <div class="forensic-stat-card__label">
            <span class="material-symbols-outlined">group</span>
            <span>${t('summarySuspectSenders') || (isAr ? 'المرسلون المتورطون' : 'Suspect Senders')}</span>
          </div>
          <div class="summary-senders-list">${chips}</div>
        </div>
      `;
    }

    const totalCovert = analysis.totalFound;
    const distinctTypesSub = `${analysis.distinctTypes} ${isAr ? 'أنواع فريدة' : 'distinct types'}`;

    return `
      <div class="forensic-summary-dashboard">
        ${threatMeterHtml}

        <div class="forensic-summary-grid">
          <div class="forensic-stat-card">
            <div class="forensic-stat-card__label">
              <span class="material-symbols-outlined">chat_bubble</span>
              <span>${t('summarySuspectMsgs') || (isAr ? 'الرسائل المخفية' : 'Suspect Messages')}</span>
            </div>
            <div class="forensic-stat-card__value" style="font-size: 1.25rem;">${msgsStatVal}</div>
            ${msgsStatSub ? `<div class="forensic-stat-card__sub">${escSafe(msgsStatSub)}</div>` : ''}
          </div>

          <div class="forensic-stat-card">
            <div class="forensic-stat-card__label">
              <span class="material-symbols-outlined">data_object</span>
              <span>${t('summaryTotalCovert') || (isAr ? 'الرموز المخفية' : 'Hidden Symbols')}</span>
            </div>
            <div class="forensic-stat-card__value" style="font-size: 1.25rem; color: var(--color-primary);">${totalCovert}</div>
            <div class="forensic-stat-card__sub">${escSafe(distinctTypesSub)}</div>
          </div>

          ${sendersCardHtml}
        </div>
      </div>
    `;
  }

  function renderResultsTable(analysis, parsedMessages) {
    const container = document.getElementById('steganalysisResultsBody');
    if (!container) return;

    const curLang = getCurLang();

    // 1. Identify suspect messages
    let suspectMessages = [];
    const messages = parsedMessages || [];

    if (messages.length > 0 && global.StegDetectEngine) {
      const isPlainSingleText = (messages.length === 1 && !messages[0].sender && !messages[0].timestamp);

      messages.forEach((msg, idx) => {
        const rawContent = isPlainSingleText
          ? analysis.inputText
          : (msg.rawText || msg.cleanText || (typeof msg === 'string' ? msg : ''));
        const msgAnalysis = isPlainSingleText
          ? analysis
          : global.StegDetectEngine.analyzeText(rawContent);

        const isSuspicious = msgAnalysis.evidence ? msgAnalysis.evidence.isSuspicious : (msgAnalysis.totalFound > 0);
        if (isSuspicious) {
          suspectMessages.push({
            index: idx + 1,
            lineNumber: msg.lineNumber || (idx + 1),
            sender: msg.sender || null,
            timestamp: msg.timestamp || '',
            rawText: rawContent,
            analysis: msgAnalysis,
            sanitizedText: sanitizeForensicText(rawContent, msgAnalysis)
          });
        }
      });
    }

    const isAnalysisSuspicious = analysis.evidence ? analysis.evidence.isSuspicious : (analysis.totalFound > 0);
    if (suspectMessages.length === 0 && isAnalysisSuspicious) {
      suspectMessages.push({
        index: 1,
        lineNumber: 1,
        sender: null,
        timestamp: '',
        rawText: analysis.inputText,
        analysis: analysis,
        sanitizedText: sanitizeForensicText(analysis.inputText, analysis)
      });
    }

    if (suspectMessages.length === 0) {
      if (analysis.observationCount > 0) {
        renderCleanWithObservationsState(analysis);
      } else {
        renderCleanState();
      }
      return;
    }

    // 2. Build Dashboard Header
    const totalMsgsCount = messages.length > 0 ? messages.length : 1;
    const forensicSummaryDashboardHtml = renderForensicSummaryDashboard(analysis, suspectMessages, totalMsgsCount);

    // 3. Build Suspect Cards
    let suspectCardsHtml = '';
    suspectMessages.forEach((msg, sIdx) => {
      const msgAnalysis = msg.analysis;
      const hexList = msgAnalysis.results.map(r => r.hexCode).join(' ');

      const msgVisualDiff = global.StegVisualMap ? global.StegVisualMap.renderVisualMap(msg.rawText, msgAnalysis) : msg.rawText;
      const msgDualHashHtml = renderDualHashConsole(msg.sanitizedText, msg.rawText, sIdx);
      const msgMatchingSection = renderSignatureOrInventorySection(msgAnalysis);

      const msgPrefix = t('cardMsgIndex') || (curLang === 'ar' ? 'رسالة' : 'Msg');
      const linePrefix = t('cardLineNumber') || (curLang === 'ar' ? 'السطر' : 'Line');

      const senderTooltip = curLang === 'ar' ? 'اسم المرسل' : 'Sender';
      const timeTooltip = curLang === 'ar' ? 'تاريخ وتوقيت الإرسال' : 'Message Timestamp';
      const msgTooltip = curLang === 'ar' ? 'ترتيب الرسالة في المحادثة' : 'Message sequence number in conversation';
      const lineTooltip = curLang === 'ar' ? 'رقم السطر في الملف المصدري' : 'Line number in source text file';

      const senderSpan = msg.sender
        ? `<span class="suspect-sender" title="${senderTooltip}"><span class="material-symbols-outlined" style="font-size:15px; vertical-align:middle; color:var(--color-primary);">person</span><span>${escSafe(msg.sender)}</span></span>`
        : '';

      const timeSpan = msg.timestamp
        ? `<span class="suspect-time" title="${timeTooltip}"><span class="material-symbols-outlined" style="font-size:14px; vertical-align:middle;">schedule</span><span>${escSafe(msg.timestamp)}</span></span>`
        : '';

      const lineSpan = msg.lineNumber
        ? `<span class="suspect-line-badge" title="${lineTooltip}"><span class="material-symbols-outlined" style="font-size:13px; vertical-align:middle;">reorder</span><span>${linePrefix} ${msg.lineNumber}</span></span>`
        : '';

      const idxSpan = `<span class="suspect-idx-badge" title="${msgTooltip}"><span class="material-symbols-outlined" style="font-size:13px; vertical-align:middle;">chat</span><span>${msgPrefix} #${msg.index}</span></span>`;

      suspectCardsHtml += `
        <details class="suspect-message-card" id="suspect-msg-${sIdx}" ${sIdx === 0 ? 'open' : ''}>
          <summary class="suspect-message-header">
            <div class="suspect-message-meta">
              ${idxSpan}
              ${lineSpan}
              ${senderSpan}
              ${timeSpan}
            </div>
            <div class="suspect-header-actions">
              <span class="material-symbols-outlined suspect-chevron">expand_more</span>
            </div>
          </summary>

          <div class="suspect-message-content">
            <div class="suspect-message-body" dir="auto">
              <span class="suspect-message-text" data-idx="${sIdx}" role="button" tabindex="0" title="${curLang === 'ar' ? 'انقر لنسخ غلاف الرسالة مع الرموز المخفية' : 'Click to copy cover message with hidden symbols'}">${msgVisualDiff}</span>
            </div>

            ${msgDualHashHtml}

            <div class="stego-hex-box" id="stego-hex-${sIdx}">
              <div class="stego-hex-header">
                <div class="stego-hex-header__title">
                  <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-primary);">terminal</span>
                  <span>${t('hexSequenceTitle') || 'Extracted Hexadecimal Sequence'}</span>
                </div>
              </div>
              <div class="stego-hex-body">
                <div class="stego-hex-wrapper">
                  <div class="stego-hex-content">
                    <code>${escSafe(hexList)}</code>
                  </div>
                  <div class="stego-hex-hover-toolbar">
                    <button type="button" class="btn-action-secondary btn-copy-suspect-clean" data-idx="${sIdx}" title="${curLang === 'ar' ? 'نسخ النص النظيف بدون الرسالة والرموز المخفية' : 'Copy Clean Text without hidden payload'}">
                      <span class="material-symbols-outlined" style="font-size: 14px; color: #4CAF50;">verified</span>
                      <span>${curLang === 'ar' ? 'نسخ النص النظيف' : 'Copy Clean Text'}</span>
                    </button>
                    <button type="button" class="btn-action-secondary btn-copy-suspect-raw" data-idx="${sIdx}" title="${curLang === 'ar' ? 'نسخ النص الأصلي الحامل للرسالة المخفية' : 'Copy Stego Text with hidden payload'}">
                      <span class="material-symbols-outlined" style="font-size: 14px; color: var(--color-primary);">lock_clock</span>
                      <span>${curLang === 'ar' ? 'نسخ النص المشفر' : 'Copy Stego Text'}</span>
                    </button>
                    <button type="button" class="btn-action-secondary btn-copy-suspect-hex" data-idx="${sIdx}" title="${curLang === 'ar' ? 'نسخ سلسلة الأكواد السداسية' : 'Copy Hexadecimal Sequence'}">
                      <span class="material-symbols-outlined" style="font-size: 14px;">terminal</span>
                      <span>${t('btnCopyHexSequence') || 'Copy Sequence'}</span>
                    </button>
                    <button type="button" class="btn-action-secondary btn-copy-suspect-symbols" data-idx="${sIdx}" title="${curLang === 'ar' ? 'نسخ الرموز المخفية فقط' : 'Copy Covert Symbols Only'}">
                      <span class="material-symbols-outlined" style="font-size: 14px;">data_object</span>
                      <span>${t('btnCopyMessageSymbols') || 'Copy Symbols'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <details class="stego-matching-details">
              <summary>
                <div style="display:flex; align-items:center; gap:6px;">
                  <span class="material-symbols-outlined" style="color:var(--color-primary); font-size:17px;">table_chart</span>
                  <span>${t('matchingDropdownTitle')}</span>
                </div>
                <span class="material-symbols-outlined details-chevron" style="font-size:18px;">expand_more</span>
              </summary>
              <div class="stego-matching-details__body">
                ${msgMatchingSection}
              </div>
            </details>
          </div>
        </details>
      `;
    });

    container.innerHTML = `
      ${forensicSummaryDashboardHtml}

      <div class="stego-suspects-container">
        ${suspectCardsHtml}
      </div>
    `;

    // 4. Fill Threat Meter
    setTimeout(() => {
      const fillEl = document.getElementById('horizontalThreatFill');
      if (fillEl) {
        let confidencePct = 0;
        if (analysis.linguisticEval && analysis.linguisticEval.isNatural) {
          confidencePct = 15;
        } else if (analysis.totalFound > 0) {
          if (analysis.matchedSignatures && analysis.matchedSignatures.length > 0) {
            confidencePct = 99;
          } else if (analysis.totalFound > 20) {
            confidencePct = 95;
          } else if (analysis.totalFound > 5) {
            confidencePct = 85;
          } else {
            confidencePct = 65;
          }
        }
        fillEl.style.width = `${confidencePct}%`;
      }
    }, 60);

    // 5. Compute Hashes
    suspectMessages.forEach((msg, sIdx) => {
      computeAndFillCardHashes(msg.sanitizedText, msg.rawText, sIdx);
    });

    // 6. Setup Copy Handlers
    container.querySelectorAll('.btn-copy-card-clean-hash').forEach(btn => {
      btn.addEventListener('click', function() {
        const sIdx = this.getAttribute('data-idx');
        const codeEl = document.getElementById(`stego-clean-hash-${sIdx}`);
        if (codeEl && codeEl.textContent) {
          navigator.clipboard.writeText(codeEl.textContent).then(() => {
            if (typeof showToast === 'function') showToast('✅ ' + t('toastHashCopied'));
            else alert(t('toastHashCopied'));
          });
        }
      });
    });

    container.querySelectorAll('.btn-copy-card-stego-hash').forEach(btn => {
      btn.addEventListener('click', function() {
        const sIdx = this.getAttribute('data-idx');
        const codeEl = document.getElementById(`stego-stego-hash-${sIdx}`);
        if (codeEl && codeEl.textContent) {
          navigator.clipboard.writeText(codeEl.textContent).then(() => {
            if (typeof showToast === 'function') showToast('✅ ' + t('toastHashCopied'));
            else alert(t('toastHashCopied'));
          });
        }
      });
    });

    container.querySelectorAll('.suspect-message-text').forEach(textEl => {
      textEl.addEventListener('click', function() {
        const sel = window.getSelection();
        if (sel && sel.toString().trim().length > 0) return;
        const idx = parseInt(this.getAttribute('data-idx'), 10);
        const item = suspectMessages[idx];
        if (item && item.rawText) {
          navigator.clipboard.writeText(item.rawText).then(() => {
            if (typeof showToast === 'function') {
              showToast('📋 ' + (t('toastCopiedMessageStego') || 'Stego message copied to clipboard!'));
            }
          });
        }
      });
    });

    container.querySelectorAll('.btn-copy-suspect-symbols').forEach(btn => {
      btn.addEventListener('click', function() {
        const idx = parseInt(this.getAttribute('data-idx'), 10);
        const item = suspectMessages[idx];
        if (item) {
          const rawSymbols = item.analysis.results.map(r => String.fromCodePoint(r.codePoint)).join('');
          navigator.clipboard.writeText(rawSymbols).then(() => {
            if (typeof showToast === 'function') showToast('✅ ' + t('toastCopiedSymbols'));
            else alert(t('toastCopiedSymbols'));
          });
        }
      });
    });

    container.querySelectorAll('.btn-copy-suspect-hex').forEach(btn => {
      btn.addEventListener('click', function() {
        const idx = parseInt(this.getAttribute('data-idx'), 10);
        const item = suspectMessages[idx];
        if (item) {
          const hexStr = item.analysis.results.map(r => r.hexCode).join(' ');
          navigator.clipboard.writeText(hexStr).then(() => {
            if (typeof showToast === 'function') showToast('✅ ' + t('toastCopiedHex'));
            else alert(t('toastCopiedHex'));
          });
        }
      });
    });

    container.querySelectorAll('.btn-copy-suspect-clean').forEach(btn => {
      btn.addEventListener('click', function() {
        const idx = parseInt(this.getAttribute('data-idx'), 10);
        const item = suspectMessages[idx];
        if (item && item.sanitizedText) {
          navigator.clipboard.writeText(item.sanitizedText).then(() => {
            const toastMsg = curLang === 'ar'
              ? '✅ تم نسخ النص النظيف (بدون الرسالة المخفية) إلى الحافظة!'
              : 'Clean text copied to clipboard!';
            if (typeof showToast === 'function') showToast(toastMsg);
            else alert(toastMsg);
          });
        }
      });
    });

    container.querySelectorAll('.btn-copy-suspect-raw').forEach(btn => {
      btn.addEventListener('click', function() {
        const idx = parseInt(this.getAttribute('data-idx'), 10);
        const item = suspectMessages[idx];
        if (item && item.rawText) {
          navigator.clipboard.writeText(item.rawText).then(() => {
            const toastMsg = curLang === 'ar'
              ? '📋 تم نسخ النص الحامل للرسالة المخفية إلى الحافظة!'
              : 'Stego text copied to clipboard!';
            if (typeof showToast === 'function') showToast(toastMsg);
            else alert(toastMsg);
          });
        }
      });
    });

    if (global.StegVisualMap && typeof global.StegVisualMap.initStegoPopovers === 'function') {
      global.StegVisualMap.initStegoPopovers(container);
    }
  }

  global.StegThreatDashboard = {
    renderMetrics,
    renderCleanState,
    renderCleanWithObservationsState,
    renderHorizontalThreatMeter,
    renderDualHashConsole,
    renderMatchedSignaturesSection,
    renderUniqueSymbolsInventorySection,
    renderSignatureOrInventorySection,
    renderForensicSummaryDashboard,
    renderResultsTable,
    computeAndFillCardHashes,
    sanitizeForensicText,
    getVisualSymbolBadge
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      renderMetrics,
      renderCleanState,
      renderCleanWithObservationsState,
      renderHorizontalThreatMeter,
      renderDualHashConsole,
      renderMatchedSignaturesSection,
      renderUniqueSymbolsInventorySection,
      renderSignatureOrInventorySection,
      renderForensicSummaryDashboard,
      renderResultsTable,
      computeAndFillCardHashes,
      sanitizeForensicText,
      getVisualSymbolBadge
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
