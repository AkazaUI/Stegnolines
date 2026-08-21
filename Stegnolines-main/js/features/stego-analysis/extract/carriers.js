/**
 * @file carriers.js
 * @description Single source of truth for invisible, evasive, and steganographic Unicode carrier code points.
 * Compatible with classic script tags and module exports.
 */

(function (global) {
  'use strict';

  const CARRIERS_LIST = Object.freeze([
    // Zero-Width & Invisible Formatting
    { codePoint: 0x200B, name: 'Zero-Width Space', abbr: 'ZWSP', category: 'zeroWidth', defaultSuspicion: 0.9 },
    { codePoint: 0x200C, name: 'Zero-Width Non-Joiner', abbr: 'ZWNJ', category: 'zeroWidth', defaultSuspicion: 0.5 },
    { codePoint: 0x200D, name: 'Zero-Width Joiner', abbr: 'ZWJ', category: 'zeroWidth', defaultSuspicion: 0.5 },
    { codePoint: 0x2060, name: 'Word Joiner', abbr: 'WJ', category: 'zeroWidth', defaultSuspicion: 0.9 },
    { codePoint: 0x00AD, name: 'Soft Hyphen', abbr: 'SHY', category: 'zeroWidth', defaultSuspicion: 0.7 },
    { codePoint: 0x180E, name: 'Mongolian Vowel Separator', abbr: 'MVS', category: 'zeroWidth', defaultSuspicion: 0.9 },
    { codePoint: 0xFEFF, name: 'Zero-Width No-Break Space / BOM', abbr: 'ZWNBSP', category: 'bom', defaultSuspicion: 0.6 },

    // Invisible Operators (U+2061 - U+2064)
    { codePoint: 0x2061, name: 'Function Application', abbr: 'FA', category: 'zeroWidth', defaultSuspicion: 0.95 },
    { codePoint: 0x2062, name: 'Invisible Times', abbr: 'IT', category: 'zeroWidth', defaultSuspicion: 0.95 },
    { codePoint: 0x2063, name: 'Invisible Separator', abbr: 'IS', category: 'zeroWidth', defaultSuspicion: 0.95 },
    { codePoint: 0x2064, name: 'Invisible Plus', abbr: 'IP', category: 'zeroWidth', defaultSuspicion: 0.95 },

    // Deprecated Formatting (U+206A - U+206F)
    { codePoint: 0x206A, name: 'Inhibit Symmetric Swapping', abbr: 'ISS', category: 'directional', defaultSuspicion: 0.95 },
    { codePoint: 0x206B, name: 'Activate Symmetric Swapping', abbr: 'ASS', category: 'directional', defaultSuspicion: 0.95 },
    { codePoint: 0x206C, name: 'Inhibit Arabic Form Shaping', abbr: 'IAFS', category: 'directional', defaultSuspicion: 0.95 },
    { codePoint: 0x206D, name: 'Activate Arabic Form Shaping', abbr: 'AAFS', category: 'directional', defaultSuspicion: 0.95 },
    { codePoint: 0x206E, name: 'National Digit Shapes', abbr: 'NDS', category: 'directional', defaultSuspicion: 0.95 },
    { codePoint: 0x206F, name: 'Nominal Digit Shapes', abbr: 'NODS', category: 'directional', defaultSuspicion: 0.95 },

    // Directional Formatting
    { codePoint: 0x200E, name: 'Left-To-Right Mark', abbr: 'LRM', category: 'directional', defaultSuspicion: 0.7 },
    { codePoint: 0x200F, name: 'Right-To-Left Mark', abbr: 'RLM', category: 'directional', defaultSuspicion: 0.7 },
    { codePoint: 0x202A, name: 'Left-To-Right Embedding', abbr: 'LRE', category: 'directional', defaultSuspicion: 0.9 },
    { codePoint: 0x202B, name: 'Right-To-Left Embedding', abbr: 'RLE', category: 'directional', defaultSuspicion: 0.9 },
    { codePoint: 0x202C, name: 'Pop Directional Formatting', abbr: 'PDF', category: 'directional', defaultSuspicion: 0.9 },
    { codePoint: 0x202D, name: 'Left-To-Right Override', abbr: 'LRO', category: 'directional', defaultSuspicion: 0.95 },
    { codePoint: 0x202E, name: 'Right-To-Left Override', abbr: 'RLO', category: 'directional', defaultSuspicion: 0.95 },

    // Variant Spaces (U+2000–U+200A, U+00A0, U+3000)
    { codePoint: 0x00A0, name: 'No-Break Space', abbr: 'NBSP', category: 'space', defaultSuspicion: 0.4 },
    { codePoint: 0x2000, name: 'En Quad', abbr: 'EQSP', category: 'space', defaultSuspicion: 0.8 },
    { codePoint: 0x2001, name: 'Em Quad', abbr: 'MQSP', category: 'space', defaultSuspicion: 0.8 },
    { codePoint: 0x2002, name: 'En Space', abbr: 'ENSP', category: 'space', defaultSuspicion: 0.8 },
    { codePoint: 0x2003, name: 'Em Space', abbr: 'EMSP', category: 'space', defaultSuspicion: 0.8 },
    { codePoint: 0x2004, name: 'Three-Per-Em Space', abbr: '3MSP', category: 'space', defaultSuspicion: 0.8 },
    { codePoint: 0x2005, name: 'Four-Per-Em Space', abbr: '4MSP', category: 'space', defaultSuspicion: 0.8 },
    { codePoint: 0x2006, name: 'Six-Per-Em Space', abbr: '6MSP', category: 'space', defaultSuspicion: 0.8 },
    { codePoint: 0x2007, name: 'Figure Space', abbr: 'FSP', category: 'space', defaultSuspicion: 0.8 },
    { codePoint: 0x2008, name: 'Punctuation Space', abbr: 'PSP', category: 'space', defaultSuspicion: 0.8 },
    { codePoint: 0x2009, name: 'Thin Space', abbr: 'THSP', category: 'space', defaultSuspicion: 0.8 },
    { codePoint: 0x200A, name: 'Hair Space', abbr: 'HSP', category: 'space', defaultSuspicion: 0.8 },
    { codePoint: 0x202F, name: 'Narrow No-Break Space', abbr: 'NNBSP', category: 'space', defaultSuspicion: 0.7 },
    { codePoint: 0x3000, name: 'Ideographic Space', abbr: 'IDSP', category: 'space', defaultSuspicion: 0.7 },

    // CJK Fillers & Braille Blank
    { codePoint: 0x115F, name: 'Hangul Choseong Filler', abbr: 'HCF', category: 'filler', defaultSuspicion: 0.95 },
    { codePoint: 0x1160, name: 'Hangul Jungseong Filler', abbr: 'HJF', category: 'filler', defaultSuspicion: 0.95 },
    { codePoint: 0x3164, name: 'Hangul Filler', abbr: 'HF', category: 'filler', defaultSuspicion: 0.95 },
    { codePoint: 0xFFA0, name: 'Halfwidth Hangul Filler', abbr: 'HHF', category: 'filler', defaultSuspicion: 0.95 },
    { codePoint: 0x2800, name: 'Braille Pattern Blank', abbr: 'BRAILLE_BLANK', category: 'space', defaultSuspicion: 0.85 }
  ]);

  const CARRIERS_MAP = new Map(CARRIERS_LIST.map(c => [c.codePoint, c]));

  function isVariationSelector(cp) {
    return (cp >= 0xFE00 && cp <= 0xFE0F) || (cp >= 0xE0100 && cp <= 0xE01EF) || (cp >= 0x180B && cp <= 0x180F);
  }

  function isUnicodeTag(cp) {
    return cp >= 0xE0000 && cp <= 0xE007F;
  }

  function isCarrierCodePoint(cp) {
    return CARRIERS_MAP.has(cp) || isVariationSelector(cp) || isUnicodeTag(cp);
  }

  function getCarrierInfo(cp) {
    if (CARRIERS_MAP.has(cp)) {
      return CARRIERS_MAP.get(cp);
    }
    if (cp >= 0xFE00 && cp <= 0xFE0F) {
      const idx = cp - 0xFE00 + 1;
      return { codePoint: cp, name: `Variation Selector ${idx}`, abbr: `VS${idx}`, category: 'variationSelector', defaultSuspicion: 0.9 };
    }
    if (cp >= 0xE0100 && cp <= 0xE01EF) {
      const idx = cp - 0xE0100 + 17;
      return { codePoint: cp, name: `Variation Selector ${idx}`, abbr: `VS${idx}`, category: 'variationSelector', defaultSuspicion: 0.9 };
    }
    if (cp >= 0x180B && cp <= 0x180F) {
      const idx = cp - 0x180B + 1;
      return { codePoint: cp, name: `Mongolian Free Variation Selector ${idx}`, abbr: `FVS${idx}`, category: 'variationSelector', defaultSuspicion: 0.9 };
    }
    if (isUnicodeTag(cp)) {
      const tagChar = cp === 0xE007F ? 'CANCEL' : String.fromCodePoint(cp - 0xE0000);
      return { codePoint: cp, name: `Tag Character '${tagChar}'`, abbr: 'TAG', category: 'tag', defaultSuspicion: 0.95 };
    }
    return null;
  }

  const StegCarriers = {
    CARRIERS_LIST,
    CARRIERS_MAP,
    isVariationSelector,
    isUnicodeTag,
    isCarrierCodePoint,
    getCarrierInfo
  };

  global.StegCarriers = StegCarriers;
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = StegCarriers;
  }
})(typeof window !== 'undefined' ? window : this);
