// ══════════════════════════════════════════════════════════════
// Stage 3 — Hide | Step 5: Stego-Object (Assembly / Disassembly)
// ══════════════════════════════════════════════════════════════
//
// Final step: assembles the stego-object by combining invisible
// VS characters with the cover text, or disassembles it during
// extraction by separating VS bytes from visible text.
//
// The VS characters are invisible, so the stego-object looks
// identical to the original cover-text to the human eye.
//
// Dependencies: step4_vs_codec (fromVariationSelector)
//
// ══════════════════════════════════════════════════════════════


/**
 * Extract all Variation Selector bytes from a text string.
 *
 * Iterates over every character, separating VS characters (converted to
 * byte values) from visible text. This is the first step of extraction.
 *
 * @param {string} text - The stego-object (cover text + hidden VS characters).
 * @returns {{ vsBytes: Uint8Array, cleanText: string }}
 *   vsBytes   — The extracted VS byte values.
 *   cleanText — The visible text with all VS characters removed.
 */
function extractVSFromText(text) {
  const vsBytes = [];
  const visibleChars = [];

  for (const char of text) {
    const codePoint = char.codePointAt(0);
    const byteValue = fromVariationSelector(codePoint);

    if (byteValue !== null) {
      vsBytes.push(byteValue);
    } else {
      visibleChars.push(char);
    }
  }

  return { vsBytes: new Uint8Array(vsBytes), cleanText: visibleChars.join('') };
}


/**
 * Build the stego-object by prepending the VS key to the cover-text.
 *
 * The VS characters are invisible, so the stego-object looks identical
 * to the original cover-text to the human eye.
 *
 * @param {string} coverText - The original cover-text.
 * @param {string} vsKeyStr  - The invisible VS-encoded XOR key.
 * @returns {string} The stego-object ready for transmission.
 */
function buildStegoObject(coverText, vsKeyStr) {
  return vsKeyStr + coverText;
}
