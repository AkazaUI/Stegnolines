/**
 * @file visual-diff-map.js
 * @description Renders character-level color-coded visual diff maps and interactive popovers for detected steganography.
 * Compatible with browser script tags and module exports.
 */

(function (global) {
  'use strict';

  function escSafe(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderVisualMap(inputText, analysis) {
    if (!inputText) return '';
    const chars = [...inputText];
    const n = chars.length;

    const resultsMap = new Map();
    if (analysis && Array.isArray(analysis.results)) {
      analysis.results.forEach(r => {
        resultsMap.set(r.position, r);
      });
    }

    const obsMap = new Map();
    if (analysis && Array.isArray(analysis.observations)) {
      analysis.observations.forEach(o => {
        if (!resultsMap.has(o.position)) {
          obsMap.set(o.position, o);
        }
      });
    }

    let html = '';
    const maxPreviewChars = 300000;
    const limit = Math.min(n, maxPreviewChars);

    let i = 0;
    while (i < limit) {
      // 1. Check if there is an actionable steganography finding starting at index i
      if (resultsMap.has(i)) {
        const resultItem = resultsMap.get(i);

        // If it's a homograph, it's a visible substituted character
        if (resultItem.category === 'homograph') {
          const char = chars[i];
          const tooltipText = `${resultItem.name} (${resultItem.hexCode})`;
          html += `<span class="visual-underscore underscore--warning" title="${escSafe(tooltipText)}">${escSafe(char)}</span>`;
          i++;
          continue;
        }

        // Collect all contiguous hidden non-homograph characters at this exact position
        const cluster = [];
        while (i < limit && resultsMap.has(i) && resultsMap.get(i).category !== 'homograph') {
          cluster.push(resultsMap.get(i));
          i++;
        }

        const count = cluster.length;
        const clusterJson = encodeURIComponent(JSON.stringify(cluster.map(c => ({ name: c.name, hexCode: c.hexCode }))));

        // Check if this cluster is Whitespace / SNOW carriers
        const isWhitespaceCluster = cluster.some(item => item.category === 'space');

        if (isWhitespaceCluster) {
          let wsGlyphsHtml = '';
          let tabCount = 0;
          let spaceCount = 0;

          cluster.forEach(item => {
            if (item.codePoint === 0x0009) {
              tabCount++;
              wsGlyphsHtml += `<span class="ws-char ws-char--tab" title="${escSafe(item.name)} (U+0009)">⇥ <span class="ws-char__tag">TAB</span></span>`;
            } else if (item.codePoint === 0x0020) {
              spaceCount++;
              wsGlyphsHtml += `<span class="ws-char ws-char--space" title="${escSafe(item.name)} (U+0020)">·</span>`;
            } else {
              wsGlyphsHtml += `<span class="ws-char ws-char--variant-space" title="${escSafe(item.name)} (${escSafe(item.hexCode)})">␣<span class="ws-char__tag">${escSafe(item.name)}</span></span>`;
            }
          });

          // Whitespace Stego Octal/Binary Token Pill (Tab + 0 to 7 spaces)
          let snowPillHtml = '';
          if (tabCount >= 1) {
            if (tabCount === 1 && spaceCount <= 7) {
              const bits3 = spaceCount.toString(2).padStart(3, '0');
              snowPillHtml = `<span class="ws-snow-pill" title="تقنية إخفاء بالفراغات / Whitespace Steganography: Tab + ${spaceCount} spaces = ${bits3}"><span class="material-symbols-outlined ws-snow-icon">space_bar</span>Whitespace: ${bits3}</span>`;
            } else {
              snowPillHtml = `<span class="ws-snow-pill" title="تقنية إخفاء بالفراغات / Whitespace Steganography: ${tabCount} Tabs, ${spaceCount} Spaces"><span class="material-symbols-outlined ws-snow-icon">space_bar</span>Whitespace</span>`;
            }
          }

          // Check if followed by End-of-Line (line break)
          let eolHtml = '';
          if (i < limit && (chars[i] === '\n' || chars[i] === '\r')) {
            eolHtml = `<span class="ws-char ws-char--eol" title="End of Line / Line Break (↵)">↵</span>`;
          }

          html += `<span class="ws-trace-cluster" data-stego-cluster="${clusterJson}" tabindex="0" role="button" aria-label="${count} whitespace symbols">${wsGlyphsHtml}${snowPillHtml}${eolHtml}</span>`;
          continue;
        }

        let statusClass = 'underscore--stego';
        if (cluster.some(item => item.category === 'directional' || item.category === 'bom')) {
          statusClass = 'underscore--error';
        } else if (cluster.some(item => item.category === 'space' || item.category === 'mongolianFVS')) {
          statusClass = 'underscore--warning';
        }

        html += `<span class="stego-marker ${statusClass}" data-stego-cluster="${clusterJson}" tabindex="0" role="button" aria-label="${count} hidden symbols"><span class="stego-visual-badge">${count}</span></span>`;
        continue;
      }

      // 2. Check if there is a benign or ambiguous observation (observed, not evidence)
      if (obsMap.has(i)) {
        const obsItem = obsMap.get(i);
        if (obsItem.category === 'homograph') {
          // Normal word character in its native script
          html += escSafe(chars[i]);
          i++;
          continue;
        }

        const obsTitle = `${obsItem.name || 'Observed Character'} (${obsItem.hexCode}) — observed, not evidence`;
        html += `<span class="stego-marker stego-marker--neutral" title="${escSafe(obsTitle)}" aria-label="observed, not evidence"><span class="stego-visual-badge stego-visual-badge--neutral">◌</span></span>`;
        i++;
        continue;
      }

      // 2. Normal visible character
      const char = chars[i];
      let charHtml = '';
      if (char === '\n') {
        charHtml = '<br>';
      } else if (char === '\r') {
        i++;
        continue;
      } else if (char === ' ') {
        charHtml = ' ';
      } else {
        charHtml = escSafe(char);
      }

      html += charHtml;
      i++;
    }

    if (n > maxPreviewChars) {
      html += `<div style="margin-top: var(--space-sm); font-style: italic; opacity: 0.5; font-size: 0.75rem;">... [Text truncated for performance]</div>`;
    }

    return html;
  }

  function initStegoPopovers(container) {
    if (!container) return;

    let popover = document.getElementById('stego-floating-popover');
    if (!popover) {
      popover = document.createElement('div');
      popover.id = 'stego-floating-popover';
      popover.className = 'stego-floating-popover';
      popover.innerHTML = `
        <div class="stego-popover-header">
          <div class="stego-popover-title-wrap">
            <span class="material-symbols-outlined stego-popover-icon">shield</span>
            <span class="stego-popover-title">موضع إخفاء سري</span>
          </div>
          <span class="stego-popover-count-pill" id="stego-popover-count">0</span>
        </div>
        <div class="stego-popover-body">
          <div class="stego-popover-list" id="stego-popover-list"></div>
        </div>
        <div class="stego-popover-footer">
          <span class="material-symbols-outlined" style="font-size: 13px; color: var(--color-primary);">info</span>
          <span id="stego-popover-footer-text">💡 تم استخراج الرموز بدقة من هذا الموضع</span>
        </div>
      `;
      document.body.appendChild(popover);
    }

    const curLang = localStorage.getItem('stegoLang') || document.documentElement.lang || 'en';
    let hideTimeout = null;

    const showPopoverFor = (targetEl) => {
      clearTimeout(hideTimeout);
      const rawCluster = targetEl.getAttribute('data-stego-cluster');
      if (!rawCluster) return;

      let cluster = [];
      try {
        cluster = JSON.parse(decodeURIComponent(rawCluster));
      } catch (e) {
        return;
      }
      if (!cluster || cluster.length === 0) return;

      const titleEl = popover.querySelector('.stego-popover-title');
      const countEl = document.getElementById('stego-popover-count');
      const listEl = document.getElementById('stego-popover-list');
      const footerEl = document.getElementById('stego-popover-footer-text');

      const isWhitespace = cluster.some(c => c.category === 'space' || c.hexCode === 'U+0009' || c.hexCode === 'U+0020' || (c.name && c.name.includes('Whitespace')));
      if (titleEl) {
        if (isWhitespace) {
          titleEl.textContent = curLang === 'ar' ? 'أثر مسافات خفية (Whitespace Stego)' : 'Whitespace Steganography Trace';
        } else {
          titleEl.textContent = curLang === 'ar' ? 'موضع إخفاء سري' : 'Hidden Stego Insertion';
        }
      }
      if (countEl) {
        countEl.textContent = curLang === 'ar' ? `${cluster.length} رمز` : `${cluster.length} symbols`;
      }
      if (footerEl) {
        if (isWhitespace) {
          footerEl.textContent = curLang === 'ar'
            ? '💡 تقنية الفراغات (Whitespace) - أدوات محتملة: SNOW, snow2, StegoToolkit'
            : '💡 Whitespace Steganography (Candidate tools: SNOW, snow2, StegoToolkit)';
        } else {
          footerEl.textContent = curLang === 'ar' ? '💡 تم استخراج الرموز بدقة من هذا الموضع' : '💡 Forensic symbols extracted from this position';
        }
      }

      if (listEl) {
        let rowsHtml = '';
        cluster.forEach((item, idx) => {
          rowsHtml += `
            <div class="stego-popover-item">
              <div class="stego-popover-item-left">
                <span class="stego-popover-item-idx">#${idx + 1}</span>
                <span class="stego-popover-item-name">${escSafe(item.name || 'Hidden Symbol')}</span>
              </div>
              <code class="stego-popover-item-hex">${escSafe(item.hexCode || '')}</code>
            </div>
          `;
        });
        listEl.innerHTML = rowsHtml;
      }

      popover.style.display = 'block';
      popover.style.visibility = 'hidden';

      const rect = targetEl.getBoundingClientRect();
      const popoverRect = popover.getBoundingClientRect();

      let top = rect.top - popoverRect.height - 10;
      let left = rect.left + (rect.width / 2) - (popoverRect.width / 2);

      if (top < 10) {
        top = rect.bottom + 10;
      }
      if (left < 12) {
        left = 12;
      } else if (left + popoverRect.width > window.innerWidth - 12) {
        left = window.innerWidth - popoverRect.width - 12;
      }

      popover.style.top = `${top}px`;
      popover.style.left = `${left}px`;
      popover.style.visibility = 'visible';
      popover.classList.add('is-visible');
    };

    const hidePopover = () => {
      hideTimeout = setTimeout(() => {
        if (popover) {
          popover.classList.remove('is-visible');
          setTimeout(() => {
            if (!popover.classList.contains('is-visible')) {
              popover.style.display = 'none';
            }
          }, 180);
        }
      }, 150);
    };

    popover.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
    popover.addEventListener('mouseleave', hidePopover);

    container.querySelectorAll('[data-stego-cluster]').forEach(el => {
      el.addEventListener('mouseenter', () => showPopoverFor(el));
      el.addEventListener('mouseleave', hidePopover);
      el.addEventListener('focus', () => showPopoverFor(el));
      el.addEventListener('blur', hidePopover);
    });
  }

  global.StegVisualMap = {
    escSafe,
    renderVisualMap,
    initStegoPopovers
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      escSafe,
      renderVisualMap,
      initStegoPopovers
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
