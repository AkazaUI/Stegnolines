// ══════════════════════════════════════════════════════════════
// Feature: Stego Capacity Meter
// ══════════════════════════════════════════════════════════════
//
// Displays the cover text's embedding capacity and current usage:
//   - Total cover bits available
//   - Maximum characters that can be embedded
//   - Current message bit consumption
//   - Usage percentage with a color-coded meter bar
//
// Dependencies: step1_cover_binary (stringToBinary),
//               step2_stego_payload (buildPayload, bytesToBinary)
// ══════════════════════════════════════════════════════════════


/**
 * Cached references to capacity meter DOM elements.
 *
 * Lazily initialized on first call to avoid querying the DOM
 * every time the meter updates (which happens on every keystroke).
 * Returns null for each element if it doesn't exist in the DOM.
 *
 * @returns {object} An object containing cached DOM element references.
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


/**
 * Calculate the current embedding capacity and usage statistics.
 *
 * Pure computation — no DOM interaction. This makes the logic
 * testable and separates concerns from the display layer.
 *
 * @param {string} coverText - The cover text from the input field.
 * @param {string} secret    - The secret message from the input field.
 * @param {string} hint      - The optional hint string.
 * @returns {{ coverBitsCount: number, maxChars: number, msgBits: number, usagePercent: number }}
 */
function calculateCapacity(coverText, secret, hint) {
  const coverBitsCount = stringToBinary(coverText).length;

  // Calculate actual message bits if there's content to embed
  let msgBits = 0;
  if (secret.length > 0 || (hint && hint.trim())) {
    const payload = buildPayload(secret || '', hint || '');
    msgBits = bytesToBinary(payload).length;
  }

  // Calculate max embeddable characters (subtract payload overhead)
  const hintOverheadBytes = 2 + ((hint && hint.trim())
    ? new TextEncoder().encode(hint.trim()).length
    : 0);
  const availableBits = Math.max(0, coverBitsCount - (hintOverheadBytes * 8));
  const maxChars = availableBits > 0 ? Math.floor(availableBits / 8) : 0;

  // Usage percentage (capped at 100%)
  const usagePercent = coverBitsCount > 0
    ? Math.min(100, (msgBits / coverBitsCount) * 100)
    : 0;

  return { coverBitsCount, maxChars, msgBits, usagePercent };
}


/**
 * Update the capacity meter UI with current statistics.
 *
 * Reads the current input values, calculates capacity, and updates
 * all meter DOM elements. The meter bar color transitions through
 * green → yellow (>70%) → red (>90%) based on usage percentage.
 */
function updateCapacityMeter() {
  const coverText = document.getElementById('embedCover').value;
  const secret    = document.getElementById('embedSecret').value;
  const hintEl    = document.getElementById('embedHint');
  const hint      = hintEl ? hintEl.value : '';

  const { coverBitsCount, maxChars, msgBits, usagePercent } = calculateCapacity(coverText, secret, hint);

  // Update DOM elements from cache
  const elements = CapacityMeterElements.get();
  elements.coverLen.textContent     = coverBitsCount.toLocaleString();
  elements.maxChars.textContent     = maxChars.toLocaleString() + ' (byte)';
  elements.msgBits.textContent      = msgBits.toLocaleString();
  elements.usage.textContent        = `${msgBits} / ${coverBitsCount}`;
  elements.meterPercent.textContent = usagePercent.toFixed(1) + '%';

  // Update meter bar width and color class
  const meterFillElement = elements.meterFill;
  meterFillElement.style.width = usagePercent + '%';
  meterFillElement.classList.remove('warn', 'danger');

  if (usagePercent > 90) {
    meterFillElement.classList.add('danger');
  } else if (usagePercent > 70) {
    meterFillElement.classList.add('warn');
  }
}
