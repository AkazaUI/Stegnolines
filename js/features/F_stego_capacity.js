// ══════════════════════════════════════════════════════════════
// Feature: Stego Capacity Meter (Refactored for Maximum Compression Utilization)
// ══════════════════════════════════════════════════════════════
//
// Displays the cover-text's embedding capacity and real-time usage:
//   - Total cover bits available
//   - Maximum characters that can be embedded
//   - Exact compressed message bit consumption via Web Worker (Brotli Q11)
//   - 500ms Debounced async execution ensuring O(1) Main Thread performance
//   - Usage percentage with color-coded meter bar (Green / Amber / Red)
//
// Dependencies:
//   - js/core/stego/payload-codec.js (buildPayload, bytesToBinary)
//   - js/core/compression/brotli-service.js (calculateCompressedPayloadAsync)
//   - js/shared/text_codec.js (stringToBinary)
// ══════════════════════════════════════════════════════════════

'use strict';

/**
 * Cached references to capacity meter DOM elements.
 * Lazily initialized on first call to prevent redundant DOM queries.
 */
const CapacityMeterElements = (function () {
  let cached = null;

  function get() {
    if (!cached) {
      cached = {
        coverLen:     document.getElementById('mCoverLen'),
        maxChars:     document.getElementById('mMaxChars'),
        msgBits:      document.getElementById('mMsgBits'),
        usage:        document.getElementById('mUsage'),
        meterPercent: document.getElementById('meterPercent'),
        meterFill:    document.getElementById('meterFill'),
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
 * Pure calculation of static cover capacity without compression overhead.
 *
 * @param {string} coverText - Cover text input string.
 * @param {string} hint      - Optional hint string.
 * @returns {{ coverBitsCount: number, maxChars: number }}
 */
function calculateCoverCapacity(coverText, hint) {
  const coverBitsCount = stringToBinary(coverText || '').length;
  const hasHint = hint && hint.trim();
  const hintOverheadBytes = hasHint
    ? 1 + new TextEncoder().encode(hint.trim()).length
    : 0;
  const availableBits = Math.max(0, coverBitsCount - (hintOverheadBytes * 8));
  const maxChars = availableBits > 0 ? Math.floor(availableBits / 8) : 0;

  return { coverBitsCount, maxChars };
}

/**
 * Synchronous embedding capacity calculation (Fallback mode).
 *
 * @param {string} coverText     - The cover-text from input.
 * @param {string} secretMessage - The secret message from input.
 * @param {string} hint          - Optional hint.
 * @returns {{ coverBitsCount: number, maxChars: number, msgBits: number, usagePercent: number }}
 */
function calculateEmbeddingCapacity(coverText, secretMessage, hint) {
  const { coverBitsCount, maxChars } = calculateCoverCapacity(coverText, hint);

  let msgBits = 0;
  if ((secretMessage && secretMessage.length > 0) || (hint && hint.trim())) {
    try {
      const payload = buildPayload(secretMessage || '', hint || '');
      const metrics = (typeof calculateCompressedPayloadSync === 'function')
        ? calculateCompressedPayloadSync(payload)
        : { finalBytesLength: payload.length };
      msgBits = metrics.finalBytesLength * 8;
    } catch (e) {
      msgBits = (secretMessage ? secretMessage.length : 0) * 8;
    }
  }

  const usagePercent = coverBitsCount > 0
    ? Math.min(100, (msgBits / coverBitsCount) * 100)
    : 0;

  return { coverBitsCount, maxChars, msgBits, usagePercent };
}

/**
 * Updates the capacity meter UI element values and progress bar colors.
 *
 * @param {number} coverBitsCount
 * @param {number} maxChars
 * @param {number} msgBits
 * @param {number} usagePercent
 */
function applyCapacityMeterDOM(coverBitsCount, maxChars, msgBits, usagePercent) {
  const elements = CapacityMeterElements.get();
  if (!elements.coverLen) return;

  elements.coverLen.textContent     = coverBitsCount.toLocaleString();
  elements.maxChars.textContent     = maxChars.toLocaleString() + ' (byte)';
  elements.msgBits.textContent      = msgBits.toLocaleString();
  elements.usage.textContent        = `${msgBits} / ${coverBitsCount}`;
  elements.meterPercent.textContent = usagePercent.toFixed(1) + '%';

  const meterFillElement = elements.meterFill;
  if (meterFillElement) {
    meterFillElement.style.width = usagePercent + '%';
    meterFillElement.classList.remove('warn', 'danger');

    if (usagePercent > 90) {
      meterFillElement.classList.add('danger');
    } else if (usagePercent > 70) {
      meterFillElement.classList.add('warn');
    }
  }
}

/**
 * Main Capacity Meter Update handler.
 *
 * Employs a 500ms Debounce window with background Web Worker execution.
 * Ensures the UI remains responsive (60fps) during active typing while
 * evaluating full Brotli Q11 compression in the background.
 *
 * @param {boolean} immediate - If true, skips the debounce timer and updates immediately.
 */
function updateCapacityMeter(immediate = false) {
  const coverEl   = document.getElementById('embedCover');
  const secretEl  = document.getElementById('embedSecretMessage');
  const hintEl    = document.getElementById('embedHint');

  const coverText     = coverEl ? coverEl.value.trim() : '';
  const secretMessage = secretEl ? secretEl.value : '';
  const hint          = hintEl ? hintEl.value : '';

  // 1. Instant update for static cover metrics (O(1) Main Thread operation)
  const { coverBitsCount, maxChars } = calculateCoverCapacity(coverText, hint);
  const elements = CapacityMeterElements.get();
  if (elements.coverLen) {
    elements.coverLen.textContent = coverBitsCount.toLocaleString();
    elements.maxChars.textContent = maxChars.toLocaleString() + ' (byte)';
  }

  // Clear pending debounce timer
  if (_capacityDebounceTimer) {
    clearTimeout(_capacityDebounceTimer);
    _capacityDebounceTimer = null;
  }

  const requestId = ++_currentCapacityRequestId;

  const performAsyncCalculation = async () => {
    // If no secret message and no hint, reset metrics cleanly
    if (!secretMessage && (!hint || !hint.trim())) {
      _lastCompressedPayloadMetrics = {
        rawBytesLength: 0,
        compressedBytesLength: 0,
        finalBytesLength: 0,
        isCompressed: false,
        savingsPercent: 0
      };
      applyCapacityMeterDOM(coverBitsCount, maxChars, 0, 0);
      if (typeof updateGuardValidation === 'function') {
        updateGuardValidation();
      }
      return;
    }

    try {
      const payloadBytes = buildPayload(secretMessage || '', hint || '');
      
      // Asynchronously compress using Web Worker (or async fallback)
      const metrics = (typeof calculateCompressedPayloadAsync === 'function')
        ? await calculateCompressedPayloadAsync(payloadBytes)
        : calculateCompressedPayloadSync(payloadBytes);

      // Prevent race conditions: ensure this request is the latest
      if (requestId !== _currentCapacityRequestId) return;

      _lastCompressedPayloadMetrics = metrics;

      const msgBits = metrics.finalBytesLength * 8;
      const usagePercent = coverBitsCount > 0
        ? Math.min(100, (msgBits / coverBitsCount) * 100)
        : 0;

      applyCapacityMeterDOM(coverBitsCount, maxChars, msgBits, usagePercent);

      // Trigger social platform guard validation with the accurate compressed size
      if (typeof updateGuardValidation === 'function') {
        updateGuardValidation();
      }
    } catch (err) {
      console.warn('[F_stego_capacity] Error in async capacity calculation:', err);
      const fallbackMetrics = calculateEmbeddingCapacity(coverText, secretMessage, hint);
      applyCapacityMeterDOM(
        fallbackMetrics.coverBitsCount,
        fallbackMetrics.maxChars,
        fallbackMetrics.msgBits,
        fallbackMetrics.usagePercent
      );
    }
  };

  if (immediate) {
    performAsyncCalculation();
  } else {
    // Extended Debounce: 500ms for optimal typing comfort and zero UI lag
    _capacityDebounceTimer = setTimeout(performAsyncCalculation, 500);
  }
}
