/**
 * @file detect-bidi.js
 * @description Forensic detector for BiDi Directional Overrides, Isolates, Trojan Source, and Variant Spaces.
 * Compatible with browser script tags and module exports.
 */

(function (global) {
  'use strict';

  const BIDI_MAP = Object.freeze({
    // Directional Overrides & Embeddings
    0x200E: { name: 'Left-To-Right Mark (LRM)',         category: 'directional', suspicion: 0.65 },
    0x200F: { name: 'Right-To-Left Mark (RLM)',         category: 'directional', suspicion: 0.65 },
    0x202A: { name: 'Left-to-Right Embedding (LRE)',    category: 'directional', suspicion: 0.90 },
    0x202B: { name: 'Right-to-Left Embedding (RLE)',    category: 'directional', suspicion: 0.90 },
    0x202C: { name: 'Pop Directional Formatting (PDF)', category: 'directional', suspicion: 0.90 },
    0x202D: { name: 'Left-To-Right Override (LRO)',     category: 'directional', suspicion: 0.98 },
    0x202E: { name: 'Right-To-Left Override (RLO)',     category: 'directional', suspicion: 0.98 },

    // Directional Isolates (U+2066 - U+2069)
    0x2066: { name: 'Left-To-Right Isolate (LRI)',      category: 'directional', suspicion: 0.95 },
    0x2067: { name: 'Right-To-Left Isolate (RLI)',      category: 'directional', suspicion: 0.95 },
    0x2068: { name: 'First Strong Isolate (FSI)',       category: 'directional', suspicion: 0.95 },
    0x2069: { name: 'Pop Directional Isolate (PDI)',    category: 'directional', suspicion: 0.95 },

    // Deprecated Formatting Controls (U+206A - U+206F)
    0x206A: { name: 'Inhibit Symmetric Swapping',       category: 'directional', suspicion: 0.98 },
    0x206B: { name: 'Activate Symmetric Swapping',      category: 'directional', suspicion: 0.98 },
    0x206C: { name: 'Inhibit Arabic Form Shaping',      category: 'directional', suspicion: 0.98 },
    0x206D: { name: 'Activate Arabic Form Shaping',     category: 'directional', suspicion: 0.98 },
    0x206E: { name: 'National Digit Shapes',            category: 'directional', suspicion: 0.98 },
    0x206F: { name: 'Nominal Digit Shapes',             category: 'directional', suspicion: 0.98 },

    // Variant Spaces
    0x2000: { name: 'En Quad Space',                    category: 'space',       suspicion: 0.80 },
    0x2001: { name: 'Em Quad Space',                    category: 'space',       suspicion: 0.80 },
    0x2002: { name: 'En Space',                         category: 'space',       suspicion: 0.80 },
    0x2003: { name: 'Em Space',                         category: 'space',       suspicion: 0.80 },
    0x2004: { name: 'Three-Per-Em Space',               category: 'space',       suspicion: 0.80 },
    0x2005: { name: 'Four-Per-Em Space',                category: 'space',       suspicion: 0.80 },
    0x2006: { name: 'Six-Per-Em Space',                 category: 'space',       suspicion: 0.80 },
    0x2007: { name: 'Figure Space',                     category: 'space',       suspicion: 0.80 },
    0x2008: { name: 'Punctuation Space',                category: 'space',       suspicion: 0.80 },
    0x2009: { name: 'Thin Space',                       category: 'space',       suspicion: 0.80 },
    0x200A: { name: 'Hair Space',                       category: 'space',       suspicion: 0.80 },
    0x202F: { name: 'Narrow No-Break Space',            category: 'space',       suspicion: 0.70 },
    0x00A0: { name: 'No-Break Space (NBSP)',            category: 'space',       suspicion: 0.40 },
    0x3000: { name: 'Ideographic Space',                category: 'space',       suspicion: 0.70 },

    // Empty Set Symbol (used in academic stego papers)
    0x2205: { name: 'Empty Set Symbol (Stego Carrier)', category: 'zeroWidth',   suspicion: 0.85 }
  });

  /**
   * Checks if a code point is a directional override or variant space.
   *
   * @param {number} cp - Unicode code point.
   * @returns {Object|null} Directional metadata or null.
   */
  function matchBidiOrSpace(cp) {
    if (BIDI_MAP[cp]) {
      return {
        codePoint: cp,
        hexCode: 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'),
        name: BIDI_MAP[cp].name,
        category: BIDI_MAP[cp].category,
        suspicion: BIDI_MAP[cp].suspicion
      };
    }
    return null;
  }

  global.StegDetectBidi = {
    BIDI_MAP,
    matchBidiOrSpace
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BIDI_MAP, matchBidiOrSpace };
  }
})(typeof window !== 'undefined' ? window : globalThis);
