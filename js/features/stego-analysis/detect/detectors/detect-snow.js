/**
 * @file detect-snow.js
 * @description Forensic detector for Covert Whitespace and SNOW (Matthew Kwan) Steganography.
 * Inspects line-ending trailing spaces, tabs, and octal token patterns.
 * Compatible with classic script tags and module exports.
 */

(function (global) {
  'use strict';

  /**
   * Scans input text for line-ending trailing spaces and tabs (SNOW / Whitespace Steganography).
   * 
   * SNOW Tool Mechanics:
   * - Data is hidden at the ends of lines using tabs and spaces.
   * - An octal scheme encodes 3 bits per group:
   *   Tab + 0 spaces = 000 (0)
   *   Tab + 1 space  = 001 (1)
   *   Tab + 2 spaces = 010 (2)
   *   ...
   *   Tab + 7 spaces = 111 (7)
   * - Alternating format: 0 to 7 spaces preceding a tab.
   * 
   * Natural formatting exemptions:
   * - Markdown 2-space line-breaks without tabs -> Clean.
   * - Indented blank lines -> Clean.
   *
   * @param {string} inputText - Raw text to inspect.
   * @returns {Object} Inspection result with suspect occurrences, indices, and SNOW telemetry.
   */
  function detectSnowAndWhitespace(inputText) {
    if (!inputText || typeof inputText !== 'string') {
      return {
        occurrences: [],
        indicesSet: new Set(),
        snowDetected: false,
        tokenCount: 0,
        bitCount: 0,
        tokens: []
      };
    }

    const occurrences = [];
    const indicesSet = new Set();
    const tokens = [];

    // Line regex matching line content followed by trailing spaces/tabs before newline or EOF
    const lineRegex = /(?:^|\r?\n)(.*?)([ \t]+)(?=\r?\n|$)/g;
    let match;
    let lineNumber = 1;

    // We count lines accurately
    const lineBreaks = [];
    for (let idx = 0; idx < inputText.length; idx++) {
      if (inputText[idx] === '\n') {
        lineBreaks.push(idx);
      }
    }

    function getLineNo(charIdx) {
      let low = 0, high = lineBreaks.length - 1;
      while (low <= high) {
        const mid = (low + high) >> 1;
        if (lineBreaks[mid] < charIdx) {
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      return low + 1;
    }

    while ((match = lineRegex.exec(inputText)) !== null) {
      const fullMatch = match[0];
      const lineContent = match[1];
      const trailing = match[2];

      // Exclude empty lines with only indentation
      if (lineContent.trim().length === 0) continue;

      const hasTab = trailing.includes('\t');
      const isMixed = hasTab && trailing.includes(' ');
      const isExcessiveSpaces = !hasTab && trailing.length >= 3;

      // Innocent markdown / soft wrapping: 1 or 2 spaces without tabs
      const isAnomalous = hasTab || isMixed || isExcessiveSpaces;

      if (isAnomalous) {
        // Calculate exact start index of trailing whitespace in inputText
        const matchLeadingOffset = fullMatch.startsWith('\r\n') ? 2 : (fullMatch.startsWith('\n') ? 1 : 0);
        const matchStartInInput = match.index + matchLeadingOffset;
        const lineContentLen = [...lineContent].length;
        
        // Accurate unicode code point slicing
        const preSlice = inputText.slice(0, matchStartInInput);
        const startCharIdx = [...preSlice].length + lineContentLen;
        const trailingChars = [...trailing];
        const lineNo = getLineNo(matchStartInInput);

        for (let i = 0; i < trailingChars.length; i++) {
          const char = trailingChars[i];
          const cp = char.codePointAt(0);
          const currentPos = startCharIdx + i;

          indicesSet.add(currentPos);

          occurrences.push({
            position: currentPos,
            codePoint: cp,
            hexCode: cp === 0x0009 ? 'U+0009' : 'U+0020',
            name: cp === 0x0009 ? 'Trailing Tab (Whitespace Steganography Carrier)' : 'Trailing Space (Whitespace Steganography Carrier)',
            category: 'space',
            line: lineNo,
            isTab: cp === 0x0009
          });
        }

        // Parse SNOW tokens in this trailing segment
        // Standard SNOW: Tab followed by 0-7 spaces
        const snowTokenRegex = /\t([ ]{0,7})/g;
        let st;
        while ((st = snowTokenRegex.exec(trailing)) !== null) {
          const spaceCount = st[1].length;
          const bits3 = spaceCount.toString(2).padStart(3, '0');
          tokens.push({
            line: lineNo,
            rawToken: st[0],
            bits: bits3,
            value: spaceCount,
            type: 'standard_snow (Tab + ' + spaceCount + ' spaces)'
          });
        }

        // Alt SNOW: 0-7 spaces preceding Tab
        const altTokenRegex = /([ ]{0,7})\t/g;
        let at;
        while ((at = altTokenRegex.exec(trailing)) !== null) {
          const spaceCount = at[1].length;
          const bits3 = spaceCount.toString(2).padStart(3, '0');
          tokens.push({
            line: lineNo,
            rawToken: at[0],
            bits: bits3,
            value: spaceCount,
            type: 'alt_snow (' + spaceCount + ' spaces + Tab)'
          });
        }
      }
    }

    const hasTab = occurrences.some(o => o.codePoint === 0x0009);
    const snowDetected = (tokens.length >= 2 && occurrences.length >= 3 && hasTab);
    const bitCount = tokens.length * 3;

    return {
      occurrences,
      indicesSet,
      snowDetected,
      tokenCount: tokens.length,
      bitCount,
      tokens
    };
  }

  global.StegDetectSnow = {
    detectSnowAndWhitespace
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { detectSnowAndWhitespace };
  }
})(typeof window !== 'undefined' ? window : globalThis);
