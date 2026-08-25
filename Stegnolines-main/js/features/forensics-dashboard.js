// ══════════════════════════════════════════════════════════════
// JavaScript Features — Forensics Dashboard Controller
// ══════════════════════════════════════════════════════════════
//
// Manages deep analytics and forensic mapping for details.html.
// Renders the cover vs stego difference maps, PRNG chips, XOR
// difference masks, hex matrix dump views, and dynamic explanatory tooltips.
//
// ══════════════════════════════════════════════════════════════

const translations = (typeof window.translations !== 'undefined') ? window.translations : {};

// ── Fallback Mock Trace ──
const MOCK_TRACE = {
  coverText: "Security is not just a technology; it is a system of behaviors and policies that protect our digital legacy and guarantee secure transmission.",
  secretMessage: "SafeSecret101",
  hint: "🔒",
  resolvedStegoKey: "STEGNO-DYNAMIC-2026-KEY",
  encryptionKey: "AES-CTR-SESSION-KEY-DERIVED-FALLBACK-Deterministic",
  payloadSize: 13,
  compressed: true,
  compressedSize: 10,
  messageBitsLength: 80,
  coverBitsLength: 1032,
  basePositions: [
    8, 523, 16, 891, 24, 340, 38, 712, 45, 105, 52, 467, 60, 814, 72, 257,
    80, 629, 95, 180, 110, 398, 118, 751, 126, 54, 134, 942, 142, 302,
    503, 876, 218, 665, 370, 78, 498, 920, 159, 583, 280, 734, 432, 31,
    601, 853, 194, 419, 690, 12, 346, 791, 541, 116, 648, 264, 903, 472,
    170, 825, 380, 67, 560, 718, 244, 892, 508, 155, 636, 327, 780, 442,
    101, 570, 832, 206, 697, 360, 530, 760
  ],
  xorKey: "00100000000111000110010011001111110010010011101111101000001000000111101000110010",
  bytesArr: [32, 28, 100, 207, 201, 59, 232, 32, 122, 50],
  stegoText: "\uE0110\uE010C\uE0114\uE011F\uE0119\uE010B\uE0118\uE0100\uE011A\uE0122Security is not just a technology; it is a system of behaviors and policies that protect our digital legacy and guarantee secure transmission.",
  isSplitMode: false,
  fakeCoverText: "",
  fakeCoverWithVS: "",
  timestamp: new Date().toISOString()
};

// ── Loaded Session State ──
let trace = null;
const VS_BASE_START = 0xFE00;
const VS_SUPPLEMENT_START = 0xE0100;

// ── Load session data on start ──
function initDashboard() {
  try {
    const stored = localStorage.getItem('stegoTrace');
    if (stored) {
      trace = JSON.parse(stored);
      const demoBanner = document.getElementById('demo-banner');
      if (demoBanner) demoBanner.style.display = 'none';
    } else {
      trace = MOCK_TRACE;
      const demoBanner = document.getElementById('demo-banner');
      if (demoBanner) demoBanner.style.display = 'flex';
    }
  } catch (e) {
    console.error('Failed to load active stego session:', e);
    trace = MOCK_TRACE;
    const demoBanner = document.getElementById('demo-banner');
    if (demoBanner) demoBanner.style.display = 'flex';
  }

  renderMetrics();
  renderVisualDiff();
  renderPRNGDetails();
  renderBytesGrid();
  renderHexMatrix();
  initInfoTooltips();

  // Sync settings pills
  const curLang = localStorage.getItem('stegoLang') || 'en';
  if (typeof applyLanguageUI === 'function') {
    applyLanguageUI(curLang);
  } else {
    applyLanguageUI_local(curLang);
  }
  
  const curFont = localStorage.getItem('stegoFont') || 'thmanyah';
  if (typeof applyArabicFontUI === 'function') {
    applyArabicFontUI(curFont);
  }
  
  const curTheme = localStorage.getItem('stegoTheme') || 'dark';
  if (typeof applyThemeUI === 'function') {
    applyThemeUI(curTheme);
  }
}

function hideDemo() {
  const demoBanner = document.getElementById('demo-banner');
  if (demoBanner) demoBanner.style.display = 'none';
}

// ── Render Card metrics ──
function renderMetrics() {
  const coverSizeEl = document.getElementById('val-cover-size');
  if (coverSizeEl && typeof animateCounter === 'function') {
    animateCounter(coverSizeEl, trace.coverText.length, ' chars');
  } else if (coverSizeEl) {
    coverSizeEl.textContent = `${trace.coverText.length} chars`;
  }
  
  const coverCapBadge = document.getElementById('val-cover-capacity');
  if (coverCapBadge) {
    const maxCap = Math.floor(trace.coverBitsLength / 8);
    coverCapBadge.textContent = `Cap: ~${maxCap} bytes`;
  }

  const payloadSizeEl = document.getElementById('val-payload-size');
  if (payloadSizeEl && typeof animateCounter === 'function') {
    animateCounter(payloadSizeEl, trace.payloadSize, ' bytes');
  } else if (payloadSizeEl) {
    payloadSizeEl.textContent = `${trace.payloadSize} bytes`;
  }
  
  const payloadCompBadge = document.getElementById('val-payload-comp');
  if (payloadCompBadge) {
    if (trace.compressed) {
      const saved = Math.max(0, trace.payloadSize - trace.compressedSize);
      payloadCompBadge.textContent = `Brotli: -${saved}B saved`;
      payloadCompBadge.style.background = 'rgba(0,204,52,0.12)';
      payloadCompBadge.style.color = 'var(--color-primary)';
    } else {
      payloadCompBadge.textContent = `Brotli: no overhead`;
      payloadCompBadge.style.background = 'rgba(230,168,23,0.1)';
      payloadCompBadge.style.color = '#E6A817';
    }
  }

  const keyBits = trace.xorKey ? trace.xorKey.length : 0;
  const keyBitsEl = document.getElementById('val-key-bits');
  if (keyBitsEl && typeof animateCounter === 'function') {
    animateCounter(keyBitsEl, keyBits, ' bits');
  } else if (keyBitsEl) {
    keyBitsEl.textContent = `${keyBits} bits`;
  }
  
  const keyAutoBadge = document.getElementById('val-key-auto');
  if (keyAutoBadge) {
    keyAutoBadge.textContent = trace.resolvedStegoKey.length > 20 ? 'complex key' : 'standard seed';
  }

  // Embedding density ratio (Capacity Meter)
  let densityVal = 0;
  if (trace.coverBitsLength && trace.coverBitsLength > 0) {
    const msgBits = trace.messageBitsLength || (trace.bytesArr ? trace.bytesArr.length * 8 : 0);
    densityVal = (msgBits / trace.coverBitsLength) * 100;
  } else if (trace.coverText && trace.coverText.length > 0) {
    densityVal = ((trace.bytesArr ? trace.bytesArr.length : 0) / trace.coverText.length) * 100;
  }
  const density = densityVal.toFixed(2);
  const densityEl = document.getElementById('val-density');
  if (densityEl && typeof animateCounter === 'function') {
    animateCounter(densityEl, parseFloat(density), '%');
  } else if (densityEl) {
    densityEl.textContent = `${density}%`;
  }
  
  const densityMeter = document.getElementById('val-density-meter');
  if (densityMeter) {
    densityMeter.style.width = `${Math.min(100, densityVal)}%`;
    densityMeter.classList.remove('warn', 'danger');
    if (densityVal > 90) {
      densityMeter.classList.add('danger');
    } else if (densityVal > 70) {
      densityMeter.classList.add('warn');
    }
  }
}

// ── Visual diff mapping: highlight where VS bit-positions scatter ──
function renderVisualDiff() {
  const visualizer = document.getElementById('diff-visualizer');
  const diffStatus = document.getElementById('val-diff-status');
  const copyBtn = document.getElementById('btn-copy-diff');

  if (!visualizer) return;

  const curLang = localStorage.getItem('stegoLang') || 'en';
  const fallbackText = (translations[curLang] && translations[curLang].noValue) || (curLang === 'ar' ? "لا توجد قيمة" : "No value");

  const coverText = trace.coverText || "";
  const positions = trace.basePositions || [];
  const bytesArr = trace.bytesArr || [];

  if (!coverText || coverText.trim() === "" || positions.length === 0) {
    const fallbackSpan = document.createElement('span');
    Object.assign(fallbackSpan.style, { opacity: '0.6', fontStyle: 'italic', fontSize: 'var(--fs-body-sm)', display: 'block', textAlign: 'center', padding: 'var(--space-md)' });
    fallbackSpan.textContent = fallbackText;
    visualizer.replaceChildren(fallbackSpan);
    if (diffStatus) diffStatus.textContent = curLang === 'ar' ? "0 نقطة إدخال VS" : "0 VS Inject points";
    if (copyBtn) copyBtn.disabled = true;
    return;
  }

  if (copyBtn) copyBtn.disabled = false;

  // 1. Build character ranges
  const encoder = new TextEncoder();
  const charBitRanges = [];
  let bitOffset = 0;
  let displayCharCount = 0;

  for (let i = 0; i < coverText.length; i++) {
    const codePoint = coverText.codePointAt(i);
    let charStr;
    let charByteLen;

    if (codePoint > 0xFFFF) {
      charStr = String.fromCodePoint(codePoint);
      charByteLen = 4;
      i++; // Skip low surrogate
    } else {
      charStr = coverText[i];
      charByteLen = encoder.encode(charStr).length;
    }

    const charBitLen = charByteLen * 8;
    charBitRanges.push({
      displayIdx: displayCharCount,
      bitStart: bitOffset,
      bitEnd: bitOffset + charBitLen - 1
    });
    bitOffset += charBitLen;
    displayCharCount++;
  }

  // 2. Map positions to characters
  const charHits = new Map();

  for (let bitIdx = 0; bitIdx < positions.length; bitIdx++) {
    const bitPos = positions[bitIdx];
    const vsByteIndex = Math.floor(bitIdx / 8);

    let lo = 0, hi = charBitRanges.length - 1;
    let charDisplayIdx = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (bitPos < charBitRanges[mid].bitStart) {
        hi = mid - 1;
      } else if (bitPos > charBitRanges[mid].bitEnd) {
        lo = mid + 1;
      } else {
        charDisplayIdx = charBitRanges[mid].displayIdx;
        break;
      }
    }

    if (!charHits.has(charDisplayIdx)) {
      charHits.set(charDisplayIdx, { count: 0, vsByteIndexes: new Set() });
    }
    const hit = charHits.get(charDisplayIdx);
    hit.count++;
    hit.vsByteIndexes.add(vsByteIndex);
  }

  // 3. Render HTML
  let htmlOutput = "";
  let displayIdx = 0;
  const totalVSBytes = bytesArr.length;

  for (let i = 0; i < coverText.length; i++) {
    const codePoint = coverText.codePointAt(i);
    let char;

    if (codePoint > 0xFFFF) {
      char = String.fromCodePoint(codePoint);
      i++;
    } else {
      char = coverText[i];
    }

    let charHtml = escapeHtmlChar(char);

    if (charHits.has(displayIdx)) {
      const hit = charHits.get(displayIdx);
      const vsIndexes = [...hit.vsByteIndexes].sort((a, b) => a - b);

      const vsInfo = vsIndexes.slice(0, 4).map(vi => {
        if (vi < bytesArr.length) {
          const bv = bytesArr[vi];
          return `<span class="tooltip-val">0x${bv.toString(16).toUpperCase().padStart(2, '0')}</span>`;
        }
        return `<span class="tooltip-val">VS#${vi + 1}</span>`;
      }).join(' ');
      const moreText = vsIndexes.length > 4 ? ` <span style="opacity:0.7">+${vsIndexes.length - 4} more</span>` : '';

      const bitsText = curLang === 'ar' ? `${hit.count} بت مرتبط` : `${hit.count} bit${hit.count > 1 ? 's' : ''} mapped`;
      const vsLabelText = curLang === 'ar' ? `بايتات الـ VS:` : `VS Bytes:`;
      const linkedText = curLang === 'ar' ? `مرتبط بـ ${vsIndexes.length} من أصل ${totalVSBytes} حرف مخفي` : `Linked to ${vsIndexes.length} of ${totalVSBytes} VS chars`;

      const bodyHtml = `<div>${vsLabelText} ${vsInfo}${moreText}</div><div style="opacity: 0.8; margin-top: 4px; font-size: 0.65rem;">${linkedText}</div>`;

      htmlOutput += `<span class="vs-char-spot" data-bits="${encodeURIComponent(bitsText)}" data-body="${encodeURIComponent(bodyHtml)}">${charHtml}</span>`;
    } else {
      htmlOutput += charHtml;
    }

    displayIdx++;
  }

  // SECURITY: All dynamic values are escaped via escapeHtmlChar()
  visualizer.innerHTML = htmlOutput;

  // Initialize global tooltip
  let globalTooltip = document.getElementById('global-stego-tooltip');
  if (!globalTooltip) {
    globalTooltip = document.createElement('div');
    globalTooltip.id = 'global-stego-tooltip';
    globalTooltip.className = 'global-stego-tooltip';
    document.body.appendChild(globalTooltip);
    
    window.addEventListener('scroll', () => {
      globalTooltip.classList.remove('active');
    }, { passive: true });
    
    window.addEventListener('resize', () => {
      globalTooltip.classList.remove('active');
    }, { passive: true });
  }

  // Attach hover events
  const spots = visualizer.querySelectorAll('.vs-char-spot');
  spots.forEach(spot => {
    spot.addEventListener('mouseenter', (e) => {
      const target = e.currentTarget;
      const bitsText = decodeURIComponent(target.getAttribute('data-bits'));
      const bodyHtml = decodeURIComponent(target.getAttribute('data-body'));
      
      globalTooltip.className = 'global-stego-tooltip';
      globalTooltip.style.direction = '';
      globalTooltip.style.textAlign = '';
      
      globalTooltip.replaceChildren();
      const ttHeader = document.createElement('div');
      ttHeader.className = 'tooltip-header';
      const ttIcon = document.createElement('span');
      ttIcon.className = 'material-symbols-outlined';
      Object.assign(ttIcon.style, { fontSize: '1.15rem', verticalAlign: 'middle' });
      ttIcon.textContent = 'memory';
      const ttLabel = document.createElement('span');
      ttLabel.textContent = bitsText;
      ttHeader.append(ttIcon, ttLabel);
      const ttBody = document.createElement('div');
      ttBody.className = 'tooltip-body';
      // SECURITY: bodyHtml is pre-encoded internally from computed numeric VS data
      ttBody.innerHTML = bodyHtml;
      globalTooltip.append(ttHeader, ttBody);
      
      const rect = target.getBoundingClientRect();
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      globalTooltip.style.left = `${rect.left + rect.width / 2 + scrollLeft}px`;
      globalTooltip.style.top = `${rect.top + scrollTop - 8}px`;
      globalTooltip.classList.add('active');
    });
    
    spot.addEventListener('mouseleave', () => {
      globalTooltip.classList.remove('active');
    });
  });

  if (diffStatus) {
    const affectedChars = charHits.size;
    diffStatus.textContent = curLang === 'ar'
      ? `${totalVSBytes} حرف VS مدمج — ${affectedChars} حرف مرتبط`
      : `${totalVSBytes} VS chars — ${affectedChars} characters affected`;
  }
}

function escapeHtmlChar(char) {
  if (char === '<') return '&lt;';
  if (char === '>') return '&gt;';
  if (char === '&') return '&amp;';
  return char;
}

// ── Render PRNG seed and bit difference mask ──
function renderPRNGDetails() {
  const seedEl = document.getElementById('val-seed');
  if (seedEl) seedEl.textContent = trace.resolvedStegoKey;
  
  const aesEl = document.getElementById('val-aes');
  if (aesEl) aesEl.textContent = trace.encryptionKey ? trace.encryptionKey : 'Derived from Stego-key';

  const hintEl = document.getElementById('val-hint');
  if (hintEl) {
    hintEl.textContent = trace.hint || (localStorage.getItem('stegoLang') === 'ar' ? 'لا يوجد تلميح' : 'No hint');
  }

  // chips mapping
  const chipsContainer = document.getElementById('val-chips');
  if (chipsContainer) {
    if (trace.basePositions && trace.basePositions.length > 0) {
      const chipFrags = document.createDocumentFragment();
      trace.basePositions.forEach((pos, i) => {
        const chip = document.createElement('span');
        chip.className = 'pos-chip';
        chip.title = `Active Index #${i}`;
        chip.textContent = `#${pos}`;
        chipFrags.appendChild(chip);
      });
      chipsContainer.replaceChildren(chipFrags);
    } else {
      const noChipsSpan = document.createElement('span');
      Object.assign(noChipsSpan.style, { opacity: '0.5', fontStyle: 'italic', fontSize: '0.7rem' });
      noChipsSpan.textContent = 'No positions generated.';
      chipsContainer.replaceChildren(noChipsSpan);
    }
  }

  const bitsContainer = document.getElementById('val-bits');
  const bitsWrapper = document.getElementById('val-bits-wrapper');
  
  if (bitsContainer) {
    if (trace.xorKey) {
      let activeCount = 0;
      let inactiveCount = 0;
      let bitsHtml = "";
      
      for (let i = 0; i < trace.xorKey.length; i++) {
        const bit = trace.xorKey[i];
        if (bit === '1') {
          activeCount++;
          bitsHtml += `<span class="bit bit--active" title="Position #${i + 1}: Bit modified (1)">1</span>`;
        } else {
          inactiveCount++;
          bitsHtml += `<span class="bit bit--inactive" title="Position #${i + 1}: Bit preserved (0)">0</span>`;
        }
      }
      
      // SECURITY: All dynamic values are numeric bit characters (0 or 1) from trace.xorKey
      bitsContainer.innerHTML = bitsHtml;

      const totalBits = trace.xorKey.length;
      const activePercent = totalBits > 0 ? ((activeCount / totalBits) * 100).toFixed(1) : 0;
      const inactivePercent = totalBits > 0 ? ((inactiveCount / totalBits) * 100).toFixed(1) : 0;

      const statsBarHtml = `
        <div class="xor-stats-bar" style="display: flex; flex-direction: column; gap: var(--space-xs); margin-bottom: var(--space-md); padding-bottom: var(--space-sm); border-bottom: 1px dashed var(--color-outline-variant); width: 100%;">
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.72rem; font-family: 'Sora', sans-serif; font-weight: 600; color: var(--color-on-surface-variant); opacity: 0.85;">
            <span>XOR DISTRIBUTION STATUS</span>
            <span style="letter-spacing: 0.5px;">Entropy Ratio: ${activePercent}% / ${inactivePercent}%</span>
          </div>
          <div style="display: flex; height: 6px; border-radius: var(--radius-full); overflow: hidden; background: rgba(94, 92, 96, 0.15); margin: 2px 0;">
            <div style="width: ${activePercent}%; background: var(--color-primary); transition: width 0.3s ease;"></div>
            <div style="width: ${inactivePercent}%; background: rgba(94, 92, 96, 0.35); transition: width 0.3s ease;"></div>
          </div>
          <div style="display: flex; gap: var(--space-md); font-size: 0.65rem; color: var(--color-on-surface-variant); opacity: 0.8; font-family: 'Sora', sans-serif; font-weight: 500;">
            <span style="display: inline-flex; align-items: center; gap: 4px;">
              <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--color-primary);"></span>
              ${activeCount} Active Bits (1s) &bull; ${activePercent}%
            </span>
            <span style="display: inline-flex; align-items: center; gap: 4px;">
              <span style="width: 6px; height: 6px; border-radius: 50%; background: rgba(176, 176, 176, 0.6);"></span>
              ${inactiveCount} Inactive Bits (0s) &bull; ${inactivePercent}%
            </span>
          </div>
        </div>
      `;

      if (bitsWrapper) {
        const oldBar = bitsWrapper.querySelector('.xor-stats-bar');
        if (oldBar) oldBar.remove();
        // SECURITY: All dynamic values are computed numeric percentages and counts
        bitsWrapper.insertAdjacentHTML('afterbegin', statsBarHtml);
      }
    } else {
      const noXorSpan = document.createElement('span');
      Object.assign(noXorSpan.style, { opacity: '0.5', fontStyle: 'italic', fontSize: '0.7rem' });
      noXorSpan.textContent = 'No XOR key available.';
      bitsContainer.replaceChildren(noXorSpan);
      if (bitsWrapper) {
        const oldBar = bitsWrapper.querySelector('.xor-stats-bar');
        if (oldBar) oldBar.remove();
      }
    }
  }
}

// ── Render custom bytes grid ──
function renderBytesGrid() {
  const bytesGrid = document.getElementById('val-vs-bytes-grid');
  const bytesCount = document.getElementById('val-vs-bytes-count');
  
  if (!bytesGrid) return;

  if (!trace.bytesArr || trace.bytesArr.length === 0) {
    const noVsDiv = document.createElement('div');
    Object.assign(noVsDiv.style, { gridColumn: '1/-1', textAlign: 'center', opacity: '0.5', fontStyle: 'italic', fontSize: '0.8rem', padding: 'var(--space-md)' });
    noVsDiv.textContent = 'No VS characters analyzed.';
    bytesGrid.replaceChildren(noVsDiv);
    if (bytesCount) bytesCount.textContent = `0 bytes`;
    return;
  }

  if (bytesCount) {
    bytesCount.textContent = `${trace.bytesArr.length} bytes \u2192 ${trace.bytesArr.length} VS characters`;
  }

  let gridHtml = "";
  trace.bytesArr.forEach((byteValue, index) => {
    const hexValue = '0x' + byteValue.toString(16).toUpperCase().padStart(2, '0');
    const binaryValue = byteValue.toString(2).padStart(8, '0');

    const vsCodePoint = byteValue < 16
      ? 'U+' + (VS_BASE_START + byteValue).toString(16).toUpperCase()
      : 'U+' + (VS_SUPPLEMENT_START + byteValue - 16).toString(16).toUpperCase();

    const paddedIndex = (index + 1).toString().padStart(3, '0');
    gridHtml += `
      <div class="byte-line">
        <span class="idx">#${paddedIndex}</span>
        <span class="bin">${binaryValue}</span>
        <span class="arrow">&rarr;</span>
        <span class="hex">${hexValue}</span>
        <span class="arrow">&rarr;</span>
        <span class="vs">VS[${vsCodePoint}]</span>
      </div>`;
  });

  // SECURITY: All dynamic values are computed numeric byte/hex/binary values
  bytesGrid.innerHTML = gridHtml;
}

// ── Matrix Hex Dump View ──
let currentDiffView = 'text';

function toggleHexView(mode) {
  currentDiffView = mode;
  const diffBlock = document.getElementById('diff-visualizer');
  const hexPanel = document.getElementById('hex-matrix-panel');
  const btnText = document.getElementById('btn-view-text');
  const btnHex = document.getElementById('btn-view-hex');

  if (mode === 'hex') {
    if (diffBlock) diffBlock.style.display = 'none';
    if (hexPanel) hexPanel.classList.add('visible');
    if (btnText) btnText.classList.remove('active');
    if (btnHex) btnHex.classList.add('active');
  } else {
    if (diffBlock) diffBlock.style.display = '';
    if (hexPanel) hexPanel.classList.remove('visible');
    if (btnText) btnText.classList.add('active');
    if (btnHex) btnHex.classList.remove('active');
  }
}

function renderHexMatrix() {
  const rainBar = document.getElementById('matrix-rain-bar');
  const statsBar = document.getElementById('hex-stats-bar');
  const hexTable = document.getElementById('hex-table');
  if (!hexTable) return;

  const curLang = localStorage.getItem('stegoLang') || 'en';
  const t = translations[curLang] || translations.en;

  const bytesArr = trace.bytesArr || [];
  const xorKey = trace.xorKey || '';

  if (bytesArr.length === 0) {
    if (rainBar) rainBar.replaceChildren();
    if (statsBar) statsBar.replaceChildren();
    const noValDiv = document.createElement('div');
    Object.assign(noValDiv.style, { textAlign: 'center', padding: 'var(--space-lg)', opacity: '0.5', fontStyle: 'italic', fontSize: '0.8rem' });
    noValDiv.textContent = t.noValue || 'No value';
    hexTable.replaceChildren(noValDiv);
    return;
  }

  // Matrix Rain Bar
  if (rainBar) {
    const matrixChars = '01アイウエオカキクケコサシスセソ0123456789ABCDEF';
    const colCount = Math.min(bytesArr.length * 2, 40);
    let rainHtml = '';
    for (let c = 0; c < colCount; c++) {
      const ch = matrixChars[Math.floor(Math.random() * matrixChars.length)];
      const delay = (Math.random() * 2.5).toFixed(2);
      const dur = (1.8 + Math.random() * 1.5).toFixed(2);
      rainHtml += `<span class="matrix-rain-col" style="animation-delay:${delay}s; animation-duration:${dur}s;">${ch}</span>`;
    }
    // SECURITY: All dynamic values are static random characters from a fixed character set
    rainBar.innerHTML = rainHtml;
  }

  // Stats Bar
  if (statsBar) {
    const uniqueSet = new Set(bytesArr);
    const entropy = calcEntropy(bytesArr);
    const maxEntropy = Math.log2(256);
    const entropyPct = ((entropy / maxEntropy) * 100).toFixed(1);

    // SECURITY: All dynamic values are computed numeric statistics and developer-controlled translation strings
    statsBar.innerHTML = `
      <div class="hex-stat-item">
        <span class="material-symbols-outlined" style="font-size:0.9rem; color:var(--color-primary);">memory</span>
        <span class="hex-stat-label">${t.hexStatTotal || 'Total Bytes'}:</span>
        <span class="hex-stat-value">${bytesArr.length}</span>
      </div>
      <div class="hex-stat-item">
        <span class="material-symbols-outlined" style="font-size:0.9rem; color:#E6A817;">fingerprint</span>
        <span class="hex-stat-label">${t.hexStatUnique || 'Unique Values'}:</span>
        <span class="hex-stat-value hex-stat-value--amber">${uniqueSet.size} / 256</span>
      </div>
      <div class="hex-stat-item">
        <span class="material-symbols-outlined" style="font-size:0.9rem; color:var(--color-primary);">query_stats</span>
        <span class="hex-stat-label">${t.hexStatEntropy || 'Entropy'}:</span>
        <span class="hex-stat-value">${entropy.toFixed(3)} bits <span style="opacity:0.6; font-size:0.6rem;">(${entropyPct}%)</span></span>
      </div>
    `;
  }

  // Hex Table
  const BYTES_PER_ROW = 8;
  const rowCount = Math.ceil(bytesArr.length / BYTES_PER_ROW);
  let tableHtml = '';

  for (let row = 0; row < rowCount; row++) {
    const offset = row * BYTES_PER_ROW;
    const offsetStr = '0x' + offset.toString(16).toUpperCase().padStart(4, '0');

    let hexCells = '';
    let asciiCells = '';

    for (let col = 0; col < BYTES_PER_ROW; col++) {
      const idx = offset + col;

      if (col === 4) {
        hexCells += `<span class="hex-sep"></span>`;
      }

      if (idx < bytesArr.length) {
        const bv = bytesArr[idx];
        const hexStr = bv.toString(16).toUpperCase().padStart(2, '0');
        const binStr = bv.toString(2).padStart(8, '0');

        const byteXorBits = xorKey.substring(idx * 8, idx * 8 + 8);
        const isActive = byteXorBits.includes('1');

        const vsCodePoint = bv < 16
          ? (VS_BASE_START + bv).toString(16).toUpperCase()
          : (VS_SUPPLEMENT_START + bv - 16).toString(16).toUpperCase();

        const ascii = (bv >= 32 && bv <= 126) ? String.fromCharCode(bv) : '\u00B7';

        hexCells += `<span class="hex-cell${isActive ? ' hex-cell--active' : ''}" data-idx="${idx}" data-byte="${bv}" data-hex="${hexStr}" data-bin="${binStr}" data-vs="U+${vsCodePoint}" data-vsnum="#${idx + 1}">${hexStr}</span>`;
        asciiCells += `<span class="hex-ascii${isActive ? ' hex-ascii--active' : ''}">${escapeHtmlChar(ascii)}</span>`;
      } else {
        hexCells += `<span class="hex-cell" style="opacity:0.15;">--</span>`;
        asciiCells += `<span class="hex-ascii" style="opacity:0.15;">.</span>`;
      }
    }

    tableHtml += `<div class="hex-row">
      <span class="hex-offset">${offsetStr}</span>
      <span class="hex-values">${hexCells}</span>
      <span class="hex-decoded">${asciiCells}</span>
    </div>`;
  }

  // SECURITY: All dynamic values are computed hex/binary/numeric values escaped via escapeHtmlChar()
  hexTable.innerHTML = tableHtml;

  // Hex Inspector Tooltip
  let inspTooltip = document.getElementById('hex-inspector-tooltip');
  if (!inspTooltip) {
    inspTooltip = document.createElement('div');
    inspTooltip.id = 'hex-inspector-tooltip';
    inspTooltip.className = 'hex-inspector-tooltip';
    document.body.appendChild(inspTooltip);

    window.addEventListener('scroll', () => inspTooltip.classList.remove('active'), { passive: true });
    window.addEventListener('resize', () => inspTooltip.classList.remove('active'), { passive: true });
  }

  // Attach click/hover events
  hexTable.querySelectorAll('.hex-cell[data-byte]').forEach(cell => {
    cell.addEventListener('mouseenter', (e) => {
      const el = e.currentTarget;
      const byteVal = parseInt(el.getAttribute('data-byte'));
      const hexStr = el.getAttribute('data-hex');
      const binStr = el.getAttribute('data-bin');
      const vsStr = el.getAttribute('data-vs');
      const vsNum = el.getAttribute('data-vsnum');

      // SECURITY: All dynamic values are computed from data-* attributes set from numeric byte values
      inspTooltip.innerHTML = `
        <div class="hex-inspector-row">
          <span class="hex-inspector-label">${t.hexInspBinary || 'Binary'}:</span>
          <span class="hex-inspector-val">${binStr}</span>
        </div>
        <div class="hex-inspector-row">
          <span class="hex-inspector-label">${t.hexInspDecimal || 'Decimal'}:</span>
          <span class="hex-inspector-val hex-inspector-val--amber">${byteVal}</span>
        </div>
        <div class="hex-inspector-row">
          <span class="hex-inspector-label">${t.hexInspVsChar || 'VS Char'}:</span>
          <span class="hex-inspector-val">${vsNum}</span>
        </div>
        <div class="hex-inspector-row">
          <span class="hex-inspector-label">${t.hexInspUnicode || 'Unicode'}:</span>
          <span class="hex-inspector-val hex-inspector-val--amber">${vsStr}</span>
        </div>
      `;

      const rect = el.getBoundingClientRect();
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      inspTooltip.style.left = `${rect.left + rect.width / 2 + scrollLeft}px`;
      inspTooltip.style.top = `${rect.bottom + scrollTop}px`;
      inspTooltip.classList.add('active');
    });

    cell.addEventListener('mouseleave', () => {
      inspTooltip.classList.remove('active');
    });
  });
}

function calcEntropy(bytes) {
  if (!bytes || bytes.length === 0) return 0;
  const freq = new Map();
  bytes.forEach(b => freq.set(b, (freq.get(b) || 0) + 1));
  let ent = 0;
  const len = bytes.length;
  freq.forEach(count => {
    const p = count / len;
    if (p > 0) ent -= p * Math.log2(p);
  });
  return ent;
}

// ── Copy diff stego-text ──
function copyDiffText(btnElement) {
  const targetStr = trace.isSplitMode ? (trace.fakeCoverWithVS || "") : (trace.stegoText || "");
  const curLang = localStorage.getItem('stegoLang') || 'en';
  
  if (!targetStr || targetStr.trim() === "") {
    showToast(curLang === 'ar' ? '⚠ لا توجد قيمة لنسخها!' : '⚠ No stego text mapped to copy.');
    return;
  }
  
  navigator.clipboard.writeText(targetStr).then(() => {
    showToast(curLang === 'ar' ? '📋 تم نسخ النص بنجاح!' : '📋 Stego-text copied successfully!');
    
    const origChildren = Array.from(btnElement.childNodes).map(n => n.cloneNode(true));
    btnElement.classList.add('floating-btn--success');
    const checkIcon = document.createElement('span');
    checkIcon.className = 'material-symbols-outlined';
    checkIcon.textContent = 'check';
    const copiedLabel = document.createElement('span');
    copiedLabel.textContent = curLang === 'ar' ? 'تم النسخ!' : 'Copied!';
    btnElement.replaceChildren(checkIcon, copiedLabel);
    
    setTimeout(() => {
      btnElement.classList.remove('floating-btn--success');
      btnElement.replaceChildren(...origChildren);
    }, 2000);
  }).catch(() => {
    showToast(curLang === 'ar' ? '❌ فشل النسخ تلقائياً. يرجى النسخ يدوياً.' : '❌ Copy failed. Please copy manually.');
  });
}

// ── Info Tooltips ──
function initInfoTooltips() {
  let globalTooltip = document.getElementById('global-stego-tooltip');
  if (!globalTooltip) {
    globalTooltip = document.createElement('div');
    globalTooltip.id = 'global-stego-tooltip';
    globalTooltip.className = 'global-stego-tooltip';
    document.body.appendChild(globalTooltip);
  }

  const triggers = document.querySelectorAll('.info-trigger');
  triggers.forEach(trigger => {
    trigger.addEventListener('mouseenter', (e) => {
      const el = e.currentTarget;
      const key = el.getAttribute('data-tip-key');
      const curLang = localStorage.getItem('stegoLang') || 'en';
      const t = translations[curLang] || translations.en;
      const desc = t[key] || '';
      
      if (!desc) return;
      
      globalTooltip.className = 'global-stego-tooltip multiline';
      
      if (curLang === 'ar') {
        globalTooltip.style.direction = 'rtl';
        globalTooltip.style.textAlign = 'right';
      } else {
        globalTooltip.style.direction = 'ltr';
        globalTooltip.style.textAlign = 'left';
      }

      let titleKey = key.replace('tip', 'metric');
      if (key.startsWith('tipSeed') || key.startsWith('tipAes') || key.startsWith('tipHint')) {
        titleKey = key.replace('tip', 'label');
      } else if (key === 'tipDiff') {
        titleKey = 'panelDiffTitle';
      } else if (key === 'tipVsStream') {
        titleKey = 'panelVsStreamTitle';
      } else if (key === 'tipPrngCoords') {
        titleKey = 'panelPrngCoordsTitle';
      } else if (key === 'tipXorMask') {
        titleKey = 'panelXorMaskTitle';
      }

      const titleText = t[titleKey] || '';

      // SECURITY: titleText and desc are developer-controlled translation strings, not user input
      globalTooltip.innerHTML = `
        <div class="tooltip-header" style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px; padding-bottom: 6px; font-weight: 700; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
          <span class="material-symbols-outlined" style="font-size: 1.1rem; color: var(--color-primary);">info</span>
          <span>${titleText}</span>
        </div>
        <div class="tooltip-body" style="font-size: 0.72rem; line-height: 1.45; white-space: normal; color: rgba(255, 255, 255, 0.85);">
          ${desc}
        </div>
      `;
      
      if (document.documentElement.classList.contains('light')) {
        const bodyEl = globalTooltip.querySelector('.tooltip-body');
        if (bodyEl) bodyEl.style.color = 'rgba(0, 0, 0, 0.8)';
        const headerEl = globalTooltip.querySelector('.tooltip-header');
        if (headerEl) headerEl.style.borderBottomColor = 'rgba(0, 0, 0, 0.1)';
        const iconEl = globalTooltip.querySelector('.material-symbols-outlined');
        if (iconEl) iconEl.style.color = 'var(--color-tertiary)';
      }

      const rect = el.getBoundingClientRect();
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      globalTooltip.style.left = `${rect.left + rect.width / 2 + scrollLeft}px`;
      globalTooltip.style.top = `${rect.top + scrollTop - 8}px`;
      globalTooltip.classList.add('active');
    });

    trigger.addEventListener('mouseleave', () => {
      globalTooltip.classList.remove('active');
    });

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      trigger.dispatchEvent(new Event('mouseenter'));
    });
  });
}

function applyLanguageUI_local(lang) {
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  
  const btnEn = document.getElementById('lang-btn-en');
  const btnAr = document.getElementById('lang-btn-ar');
  if (btnEn) btnEn.classList.toggle('active', lang === 'en');
  if (btnAr) btnAr.classList.toggle('active', lang === 'ar');

  const arFontToggle = document.getElementById('ar-font-toggle-wrap');
  if (arFontToggle) {
    arFontToggle.style.display = lang === 'ar' ? 'flex' : 'none';
  }

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang] && translations[lang][key]) {
      el.textContent = translations[lang][key];
    }
  });

  document.querySelectorAll('[data-i18n-tooltip]').forEach(el => {
    const key = el.getAttribute('data-i18n-tooltip');
    if (translations[lang] && translations[lang][key]) {
      el.setAttribute('data-tooltip', translations[lang][key]);
    }
  });
}

// Bind dashboard triggers
document.addEventListener('DOMContentLoaded', () => {
  const btnText = document.getElementById('btn-view-text');
  const btnHex = document.getElementById('btn-view-hex');
  if (btnText) btnText.addEventListener('click', () => toggleHexView('text'));
  if (btnHex) btnHex.addEventListener('click', () => toggleHexView('hex'));

  const btnCopyDiff = document.getElementById('btn-copy-diff');
  if (btnCopyDiff) {
    btnCopyDiff.addEventListener('click', function() {
      copyDiffText(this);
    });
  }

  const btnDismissDemo = document.getElementById('dismiss-demo-btn');
  if (btnDismissDemo) btnDismissDemo.addEventListener('click', hideDemo);

  // Initialize
  if (document.getElementById('diff-visualizer') || document.getElementById('hex-table')) {
    initDashboard();
  }
});
