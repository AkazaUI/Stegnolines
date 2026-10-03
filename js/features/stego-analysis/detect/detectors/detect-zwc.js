/**
 * @file detect-zwc.js
 * @description Forensic detector for Zero-Width Characters (ZWC), Invisible Formatting, and Linguistic Baseline Evaluation.
 * Compatible with browser script tags and module exports.
 */

(function (global) {
  'use strict';

  const ZWC_MAP = Object.freeze({
    0x200B: { name: 'Zero-Width Space',                  category: 'zeroWidth', defaultSuspicion: 0.95 },
    0x200C: { name: 'Zero-Width Non-Joiner (ZWNJ)',       category: 'zeroWidth', defaultSuspicion: 0.60 },
    0x200D: { name: 'Zero-Width Joiner (ZWJ)',           category: 'zeroWidth', defaultSuspicion: 0.60 },
    0x2060: { name: 'Word Joiner',                       category: 'zeroWidth', defaultSuspicion: 0.95 },
    0x00AD: { name: 'Soft Hyphen',                       category: 'zeroWidth', defaultSuspicion: 0.70 },
    0x180E: { name: 'Mongolian Vowel Separator',         category: 'zeroWidth', defaultSuspicion: 0.90 },
    0xFEFF: { name: 'Zero-Width No-Break Space / BOM',   category: 'bom',       defaultSuspicion: 0.75 },
    0x2061: { name: 'Function Application (Invisible)',  category: 'zeroWidth', defaultSuspicion: 0.95 },
    0x2062: { name: 'Invisible Times',                   category: 'zeroWidth', defaultSuspicion: 0.95 },
    0x2063: { name: 'Invisible Separator',               category: 'zeroWidth', defaultSuspicion: 0.95 },
    0x2064: { name: 'Invisible Plus',                    category: 'zeroWidth', defaultSuspicion: 0.95 }
  });

  /**
   * @deprecated Retained for legacy backwards compatibility. Real contextual assessment
   * is performed by EvidenceAssessor.
   *
   * @param {Array} results - Detected suspect characters.
   * @param {string} text - Full source text.
   * @returns {Object} { isNatural: boolean, reason: string }
   */
  function evaluateLinguisticBaseline(results, text) {
    if (!results || results.length === 0) {
      return { isNatural: false, reason: 'none' };
    }

    // Standard Arabic/Persian ligatures and bidi directionals
    const NATURAL_SET = new Set([0x200C, 0x200D, 0x200E, 0x200F]);
    const foundSet = new Set(results.map(r => r.codePoint));

    let allInNaturalSet = true;
    for (const cp of foundSet) {
      if (!NATURAL_SET.has(cp)) {
        allInNaturalSet = false;
        break;
      }
    }

    if (!allInNaturalSet) {
      return { isNatural: false, reason: 'unnaturalCharactersPresent' };
    }

    // Check for clustering (consecutive hidden characters)
    let hasConsecutive = false;
    for (let i = 0; i < results.length - 1; i++) {
      if (results[i + 1].position === results[i].position + 1) {
        hasConsecutive = true;
        break;
      }
    }

    const isNatural = !hasConsecutive;
    return {
      isNatural: isNatural,
      reason: isNatural ? 'isolatedTypographic' : 'excessiveOrClustered'
    };
  }

  /**
   * Checks if a code point is a known Zero-Width Character.
   *
   * @param {number} cp - Unicode code point.
   * @returns {Object|null} Character metadata or null.
   */
  function matchZwc(cp) {
    if (ZWC_MAP[cp]) {
      return {
        codePoint: cp,
        hexCode: 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'),
        name: ZWC_MAP[cp].name,
        category: ZWC_MAP[cp].category,
        suspicion: ZWC_MAP[cp].defaultSuspicion
      };
    }
    return null;
  }

  global.StegDetectZwc = {
    ZWC_MAP,
    matchZwc,
    evaluateLinguisticBaseline
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ZWC_MAP, matchZwc, evaluateLinguisticBaseline };
  }
})(typeof window !== 'undefined' ? window : globalThis);
