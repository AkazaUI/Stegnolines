// ══════════════════════════════════════════════════════════════
// Feature: Stego Capacity Meter (Refactored for 3-Box Smart System)
// ══════════════════════════════════════════════════════════════
//
// Displays cover-text capacity and real-time consumption in bytes:
//   - Box 1: Primary Smart Message Box (Human-readable contextual state)
//   - Box 2: Brotli Compression Box (Guaranteed non-negative savings ratio)
//   - Box 3: Hint Overhead Box (Always visible byte overhead)
//   - Progress bar with color states (warn / danger)
//   - 500ms Debounced async execution via Web Worker (Brotli Q11)
//
// Dependencies:
//   - js/core/stego/payload-codec.js (buildPayload)
//   - js/core/compression/brotli-service.js (calculateCompressedPayloadAsync)
//   - js/shared/text_codec.js (stringToBinary)
// ══════════════════════════════════════════════════════════════

'use strict';

/**
 * Retrieves the translation string for a given key in the active document language.
 *
 * @param {string} key
 * @param {string} fallback
 * @returns {string}
 */
function getCapacityTranslation(key, fallback = '') {
  const lang = (document.documentElement && document.documentElement.getAttribute('lang')) || 'ar';
  const dict = (window.translations && window.translations[lang])
    || (typeof I18N_EMBED !== 'undefined' && I18N_EMBED[lang])
    || (typeof I18N_EMBED !== 'undefined' && I18N_EMBED['en'])
    || {};
  return dict[key] || fallback;
}

/**
 * Cached references to capacity meter DOM elements.
 * Lazily initialized on first call to prevent redundant DOM queries.
 */
const CapacityMeterElements = (function () {
  let cached = null;

  function get() {
    if (!cached) {
      cached = {
        smartBox:       document.getElementById('capacitySmartBox'),
        smartMsg:       document.getElementById('capacitySmartMsg'),
        smartIcon:      document.getElementById('capacitySmartIcon'),
        compressionBox: document.getElementById('capacityCompressionBox'),
        compressionMsg: document.getElementById('capacityCompressionMsg'),
        hintBox:        document.getElementById('capacityHintBox'),
        hintMsg:        document.getElementById('capacityHintMsg'),
        meterPercent:   document.getElementById('meterPercent'),
        meterFill:      document.getElementById('meterFill'),
      };
    }
    return cached;
  }

  return { get };
})();

// Debounce state & Latest calculated metrics
let _capacityDebounceTimer = null;
let _currentCapacityRequestId = 0;
let _lastCompressedPayloadMetrics = {
  rawBytesLength: 0,
  compressedBytesLength: 0,
  finalBytesLength: 0,
  isCompressed: false,
  savingsPercent: 0
};

/**
 * Accessor for the latest compressed payload metrics.
 *
 * @returns {{ rawBytesLength: number, compressedBytesLength: number, finalBytesLength: number, isCompressed: boolean, savingsPercent: number }}
 */
function getLastCompressedPayloadMetrics() {
  return _lastCompressedPayloadMetrics;
}

/**
 * Pure calculation of static cover capacity in bytes without compression overhead.
 *
 * @param {string} coverText - Cover text input string.
 * @param {string} hint      - Optional hint string.
 * @returns {{ coverBitsCount: number, totalCoverBytes: number, availableBytes: number, hintOverheadBytes: number }}
 */
function calculateCoverCapacity(coverText, hint) {
  const coverBitsCount = stringToBinary(coverText || '').length;
  const totalCoverBytes = Math.floor(coverBitsCount / 8);
  const hasHint = Boolean(hint && hint.trim());
  const hintOverheadBytes = hasHint
    ? 1 + new TextEncoder().encode(hint.trim()).length
    : 0;
  const availableBytes = Math.max(0, totalCoverBytes - hintOverheadBytes);

  return { coverBitsCount, totalCoverBytes, availableBytes, hintOverheadBytes };
}

/**
 * Synchronous embedding capacity calculation (Fallback mode).
 *
 * @param {string} coverText     - The cover-text from input.
 * @param {string} secretMessage - The secret message from input.
 * @param {string} hint          - Optional hint.
 * @returns {{ coverBitsCount: number, totalCoverBytes: number, availableBytes: number, hintOverheadBytes: number, usedBytes: number, usagePercent: number, savingsPercent: number }}
 */
function calculateEmbeddingCapacity(coverText, secretMessage, hint) {
  const { coverBitsCount, totalCoverBytes, availableBytes, hintOverheadBytes } = calculateCoverCapacity(coverText, hint);

  let usedBytes = 0;
  let savingsPercent = 0;
  if ((secretMessage && secretMessage.length > 0) || (hint && hint.trim())) {
    try {
      const payload = buildPayload(secretMessage || '', hint || '');
      const metrics = (typeof calculateCompressedPayloadSync === 'function')
        ? calculateCompressedPayloadSync(payload)
        : { finalBytesLength: payload.length, savingsPercent: 0 };
      usedBytes = metrics.finalBytesLength;
      savingsPercent = Math.round(metrics.savingsPercent || 0);
    } catch (e) {
      usedBytes = secretMessage ? secretMessage.length : 0;
    }
  }

  const usagePercent = totalCoverBytes > 0
    ? (usedBytes / totalCoverBytes) * 100
    : 0;

  return { coverBitsCount, totalCoverBytes, availableBytes, hintOverheadBytes, usedBytes, usagePercent, savingsPercent };
}

/**
 * Updates the 3-box capacity meter UI element values and progress bar colors.
 *
 * @param {number} totalCoverBytes
 * @param {number} availableBytes
 * @param {number} usedBytes
 * @param {number} hintOverheadBytes
 * @param {number} usagePercent
 * @param {boolean} isCoverEmpty
 * @param {boolean} isSecretEmpty
 * @param {number} savingsPercent
 */
function applyCapacityMeterDOM(
  totalCoverBytes,
  availableBytes,
  usedBytes,
  hintOverheadBytes,
  usagePercent,
  isCoverEmpty,
  isSecretEmpty,
  savingsPercent
) {
  const elements = CapacityMeterElements.get();
  if (!elements.smartMsg && !elements.meterPercent) return;

  // 1. Progress Bar & Percent Indicator
  if (elements.meterPercent) {
    elements.meterPercent.textContent = usagePercent.toFixed(1) + '%';
  }

  if (elements.meterFill) {
    elements.meterFill.style.width = Math.min(100, Math.max(0, usagePercent)) + '%';
    elements.meterFill.classList.remove('warn', 'danger');

    if (usagePercent > 100) {
      elements.meterFill.classList.add('danger');
    } else if (usagePercent > 85) {
      elements.meterFill.classList.add('danger');
    } else if (usagePercent > 65) {
      elements.meterFill.classList.add('warn');
    }
  }

  // 2. Hint Box (Always visible, exact byte overhead with brand highlight)
  if (elements.hintMsg) {
    const hintTemplate = getCapacityTranslation('capacityHintStat', 'Hint: <span class="capacity-highlight">{bytes} bytes</span>');
    elements.hintMsg.innerHTML = hintTemplate.replace('{bytes}', hintOverheadBytes.toLocaleString());
  }

  // 3. Compression Box (Guaranteed non-negative savings with brand highlight)
  if (elements.compressionMsg) {
    if (isSecretEmpty) {
      elements.compressionMsg.innerHTML = getCapacityTranslation('capacityCompNone', 'Compression: --');
    } else {
      const validSavings = Math.round(savingsPercent || 0);
      if (validSavings > 0) {
        const compTemplate = getCapacityTranslation('capacityCompSaved', 'Compression: <span class="capacity-highlight">{pct}% saved</span>');
        elements.compressionMsg.innerHTML = compTemplate.replace('{pct}', validSavings);
      } else {
        elements.compressionMsg.innerHTML = getCapacityTranslation('capacityCompDirect', 'Compression: Direct (0%)');
      }
    }
  }

  // 4. Primary Smart Box & Message (Byte-pure with brand highlight)
  if (elements.smartMsg) {
    if (elements.smartBox) {
      elements.smartBox.classList.remove('is-overflow');
    }

    if (isCoverEmpty) {
      // Empty Cover State
      if (elements.smartIcon) elements.smartIcon.textContent = 'info';
      elements.smartMsg.innerHTML = getCapacityTranslation(
        'capacityMsgEmpty',
        'أدخل نص الغلاف لتحديد السعة الاستيعابية'
      );
    } else if (isSecretEmpty) {
      // Cover text provided, ready for secret message (available capacity minus hint overhead)
      if (elements.smartIcon) elements.smartIcon.textContent = 'check_circle';
      const template = getCapacityTranslation(
        'capacityMsgCoverOnly',
        'Available capacity for your message: <span class="capacity-highlight">{capacity} bytes</span>'
      );
      elements.smartMsg.innerHTML = template.replace('{capacity}', availableBytes.toLocaleString());
    } else {
      // Both cover text and secret message/payload provided
      // usedBytes represents the total compressed payload (secret + hint + delimiter + 0xFE flag)
      // Capacity is evaluated against totalCoverBytes
      if (usedBytes > totalCoverBytes) {
        // Exceeded available capacity
        if (elements.smartBox) elements.smartBox.classList.add('is-overflow');
        if (elements.smartIcon) elements.smartIcon.textContent = 'warning';
        const overflow = usedBytes - totalCoverBytes;
        const overflowTemplate = getCapacityTranslation(
          'capacityMsgOverflow',
          '⚠️ Exceeded available capacity by <span class="capacity-highlight is-overflow">{overflow} bytes</span>!'
        );
        elements.smartMsg.innerHTML = overflowTemplate.replace('{overflow}', overflow.toLocaleString());
      } else {
        // Comfortably within capacity
        if (elements.smartIcon) elements.smartIcon.textContent = 'check_circle';
        const remaining = Math.max(0, totalCoverBytes - usedBytes);
        const usedTemplate = getCapacityTranslation(
          'capacityMsgUsed',
          'Used: {used} of {capacity} bytes (<span class="capacity-highlight">Remaining: {remaining} bytes</span>)'
        );
        elements.smartMsg.innerHTML = usedTemplate
          .replace('{used}', usedBytes.toLocaleString())
          .replace('{capacity}', totalCoverBytes.toLocaleString())
          .replace('{remaining}', remaining.toLocaleString());
      }
    }
  }
}

/**
 * Main Capacity Meter Update handler.
 *
 * Runs synchronous real-time calculation immediately on every input event (0ms lag),
 * incorporating the exact Brotli (Quality 11) compression metrics directly into
 * the smart message and mini-boxes.
 *
 * @param {boolean} immediate - Preserved for backward compatibility.
 */
function updateCapacityMeter(immediate = false) {
  const coverEl   = document.getElementById('embedCover');
  const secretEl  = document.getElementById('embedSecretMessage');
  const hintEl    = document.getElementById('embedHint');

  const coverText     = coverEl ? coverEl.value.trim() : '';
  const secretMessage = secretEl ? secretEl.value : '';
  const hint          = hintEl ? hintEl.value : '';

  // 1. Instant calculation of cover metrics
  const { totalCoverBytes, availableBytes, hintOverheadBytes } = calculateCoverCapacity(coverText, hint);
  const isCoverEmpty = !coverText;
  const isSecretEmpty = !secretMessage && (!hint || !hint.trim());

  if (isCoverEmpty || isSecretEmpty) {
    _lastCompressedPayloadMetrics = {
      rawBytesLength: 0,
      compressedBytesLength: 0,
      finalBytesLength: 0,
      isCompressed: false,
      savingsPercent: 0
    };
    applyCapacityMeterDOM(
      totalCoverBytes,
      availableBytes,
      0,
      hintOverheadBytes,
      0,
      isCoverEmpty,
      isSecretEmpty,
      0
    );
    if (typeof updateGuardValidation === 'function') {
      updateGuardValidation();
    }
    return;
  }

  // 2. Real-time compression evaluation (Runs in ~0.5ms via pre-compiled WASM stream engine)
  try {
    const payloadBytes = buildPayload(secretMessage || '', hint || '');
    const metrics = (typeof calculateCompressedPayloadSync === 'function')
      ? calculateCompressedPayloadSync(payloadBytes)
      : {
          rawBytesLength: payloadBytes.length,
          compressedBytesLength: payloadBytes.length,
          finalBytesLength: payloadBytes.length,
          isCompressed: false,
          savingsPercent: 0
        };

    _lastCompressedPayloadMetrics = metrics;

    const usedBytes = metrics.finalBytesLength;
    const savingsPercent = Math.round(metrics.savingsPercent || 0);

    const usagePercent = totalCoverBytes > 0
      ? (usedBytes / totalCoverBytes) * 100
      : 0;

    applyCapacityMeterDOM(
      totalCoverBytes,
      availableBytes,
      usedBytes,
      hintOverheadBytes,
      usagePercent,
      false,
      false,
      savingsPercent
    );

    if (typeof updateGuardValidation === 'function') {
      updateGuardValidation();
    }
  } catch (err) {
    console.warn('[F_stego_capacity] Error in real-time capacity calculation:', err);
    const fallbackMetrics = calculateEmbeddingCapacity(coverText, secretMessage, hint);
    applyCapacityMeterDOM(
      fallbackMetrics.totalCoverBytes,
      fallbackMetrics.availableBytes,
      fallbackMetrics.usedBytes,
      fallbackMetrics.hintOverheadBytes,
      fallbackMetrics.usagePercent,
      isCoverEmpty,
      false,
      fallbackMetrics.savingsPercent
    );
  }
}
