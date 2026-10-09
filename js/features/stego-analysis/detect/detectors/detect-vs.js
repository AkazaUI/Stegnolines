/**
 * @file detect-vs.js
 * @description Forensic detector for Unicode Variation Selectors (VS1–VS256) & Mongolian FVS.
 * Compatible with browser script tags and module exports.
 */

(function (global) {
  'use strict';

  const VS_RANGES = Object.freeze([
    {
      start: 0xFE00,
      end: 0xFE0F,
      namePrefix: 'Variation Selector',
      indexOffset: 1,
      category: 'variationSelector',
      suspicion: 0.85
    },
    {
      start: 0xE0100,
      end: 0xE01EF,
      namePrefix: 'Variation Selector Supplement',
      indexOffset: 17,
      category: 'variationSelector',
      suspicion: 0.95
    },
    {
      start: 0x180B,
      end: 0x180D,
      namePrefix: 'Mongolian Free Variation Selector',
      indexOffset: 1,
      category: 'mongolianFVS',
      suspicion: 0.90
    }
  ]);

  /**
   * Checks if a code point is a Unicode Variation Selector.
   *
   * @param {number} cp - Unicode code point.
   * @returns {Object|null} VS metadata or null.
   */
  function matchVs(cp) {
    for (let i = 0; i < VS_RANGES.length; i++) {
      const range = VS_RANGES[i];
      if (cp >= range.start && cp <= range.end) {
        const vsIndex = cp - range.start + range.indexOffset;
        return {
          codePoint: cp,
          hexCode: 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'),
          name: `${range.namePrefix} ${vsIndex}`,
          category: range.category,
          vsIndex: vsIndex,
          suspicion: range.suspicion
        };
      }
    }
    return null;
  }

  function isVariationSelector(cp) {
    return (cp >= 0xFE00 && cp <= 0xFE0F) ||
           (cp >= 0xE0100 && cp <= 0xE01EF) ||
           (cp >= 0x180B && cp <= 0x180D);
  }

  global.StegDetectVs = {
    VS_RANGES,
    matchVs,
    isVariationSelector
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VS_RANGES, matchVs, isVariationSelector };
  }
})(typeof window !== 'undefined' ? window : globalThis);
