// ══════════════════════════════════════════════════════════════
// Feature: Stego Analysis (Visual Key Inspection)
// ══════════════════════════════════════════════════════════════
//
// Visual inspection tools for the steganographic key:
//   - Hex visualization: shows each byte as Binary → Hex → VS Codepoint
//   - Key size meter: displays the ratio of key bytes to cover characters
//
// Dependencies: step4_stego_channel (VS_BASE_START, VS_SUPPLEMENT_START)
// ══════════════════════════════════════════════════════════════


// ── Key Size Meter Color Thresholds ───────────────────────────
// Semantic color constants for the key-to-cover ratio meter.

/** Green — key is small relative to cover (healthy, ≤ 50%). */
const METER_COLOR_HEALTHY = '#00cc34';
/** Yellow — key is getting large (warning, 50–80%). */
const METER_COLOR_WARNING = '#eab308';
/** Red — key approaches cover size (danger, > 80%). */
const METER_COLOR_DANGER  = '#ef4444';


/**
 * Format a single key byte into a visualization line.
 *
 * Shows the byte index, its binary representation, hex value,
 * and the corresponding VS Unicode codepoint.
 *
 * @param {number} byteValue - The byte value (0–255).
 * @param {number} index     - The zero-based byte index.
 * @returns {string} A formatted visualization line.
 */
function formatKeyByteLine(byteValue, index) {
  const hexValue = '0x' + byteValue.toString(16).toUpperCase().padStart(2, '0');
  const binaryValue = byteValue.toString(2).padStart(8, '0');

  // Determine the VS codepoint based on the byte range
  const vsCodePoint = byteValue < 16
    ? 'U+' + (VS_BASE_START + byteValue).toString(16).toUpperCase()
    : 'U+' + (VS_SUPPLEMENT_START + byteValue - 16).toString(16).toUpperCase();

  const paddedIndex = (index + 1).toString().padStart(3);
  return `Byte ${paddedIndex}: ${binaryValue}  →  ${hexValue}  →  VS[${vsCodePoint}]`;
}

/**
 * Format a single key byte into an interactive HTML line.
 */
function formatKeyByteLineHtml(byteValue, index) {
  const hexValue = '0x' + byteValue.toString(16).toUpperCase().padStart(2, '0');
  const binaryValue = byteValue.toString(2).padStart(8, '0');

  const vsCodePoint = byteValue < 16
    ? 'U+' + (VS_BASE_START + byteValue).toString(16).toUpperCase()
    : 'U+' + (VS_SUPPLEMENT_START + byteValue - 16).toString(16).toUpperCase();

  const paddedIndex = (index + 1).toString().padStart(3, '0');
  return `<div class="byte-line"><span class="idx">#${paddedIndex}</span><span class="bin">${binaryValue}</span><span class="arrow">&rarr;</span><span class="hex">${hexValue}</span><span class="arrow">&rarr;</span><span class="vs">VS[${vsCodePoint}]</span></div>`;
}


/**
 * Update the VS Visualization displays with a hex breakdown of the key.
 * 
 * Supports both hidden legacy textarea fallback and modern premium HTML readout.
 *
 * @param {string}   binaryKey - The XOR key as a binary string.
 * @param {number[]} bytesArr  - The key's byte values (for per-byte display).
 */
function updateVSVisualization(binaryKey, bytesArr) {
  // 1. Maintain fallback legacy textarea if present
  const visualizationElement = document.getElementById('vsVisualization');
  if (visualizationElement) {
    const outputLines = [];
    outputLines.push(`── Binary Key (${binaryKey.length} bits) ──`);
    for (let i = 0; i < bytesArr.length; i++) {
      outputLines.push(formatKeyByteLine(bytesArr[i], i));
    }
    outputLines.push('');
    outputLines.push(`── Total: ${bytesArr.length} bytes = ${bytesArr.length} hidden VS characters ──`);
    visualizationElement.value = outputLines.join('\n');
  }

  // 2. Render modern HTML breakdown if present
  const htmlContainer = document.getElementById('vsVisualizationHtml');
  if (htmlContainer) {
    if (bytesArr && bytesArr.length > 0) {
      let htmlContent = `<div style="margin-bottom: var(--space-sm); font-weight: 600; color: var(--color-on-surface-variant); opacity: 0.7; font-size: 0.72rem; letter-spacing: 0.5px; font-family: 'Sora', sans-serif;">BINARY KEY &mdash; ${binaryKey.length} BITS</div>`;
      htmlContent += `<div class="vs-bytes-grid">`;
      for (let i = 0; i < bytesArr.length; i++) {
        htmlContent += formatKeyByteLineHtml(bytesArr[i], i);
      }
      htmlContent += `</div>`;
      htmlContent += `<div style="margin-top: var(--space-sm); padding-top: var(--space-xs); border-top: 1px solid var(--color-outline-variant); font-weight: 600; color: var(--color-on-surface-variant); opacity: 0.7; font-size: 0.72rem; font-family: 'Sora', sans-serif;">${bytesArr.length} bytes \u2192 ${bytesArr.length} VS characters</div>`;
      htmlContainer.innerHTML = htmlContent;
    } else {
      htmlContainer.innerHTML = `<span style="opacity: 0.5; font-style: italic;">No VS characters analyzed.</span>`;
    }
  }
}


/**
 * Update the key size meter that shows the ratio of key bytes to cover length.
 *
 * The meter bar changes color based on the ratio:
 *   - Green  (≤ 50%): healthy — key is small relative to cover
 *   - Yellow (50–80%): warning — key is getting large
 *   - Red    (> 80%): danger — key approaches cover size
 *
 * @param {number} keyByteCount     - Number of bytes in the VS key.
 * @param {number} coverCharCount   - Number of characters in the cover text.
 */
function updateKeySizeMeter(keyByteCount, coverCharCount) {
  const countElement = document.getElementById('vsKeyCount');
  const meterElement = document.getElementById('vsKeyMeter');
  if (!countElement || !meterElement) return;

  countElement.textContent = `${keyByteCount} bytes / ${coverCharCount} chars`;

  // Calculate the ratio as a percentage (capped at 100%)
  const ratioPercent = coverCharCount > 0
    ? Math.min(100, (keyByteCount / coverCharCount) * 100)
    : 0;

  meterElement.style.width = ratioPercent + '%';

  // Color coding based on severity thresholds
  if (ratioPercent > 80) {
    meterElement.style.background = METER_COLOR_DANGER;
  } else if (ratioPercent > 50) {
    meterElement.style.background = METER_COLOR_WARNING;
  } else {
    meterElement.style.background = METER_COLOR_HEALTHY;
  }
}
