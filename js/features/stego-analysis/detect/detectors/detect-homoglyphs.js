/**
 * @file detect-homoglyphs.js
 * @description Forensic detector for Homoglyphs, Lookalikes (Cyrillic/Greek), and Fullwidth ASCII.
 * Compatible with browser script tags and module exports.
 */

(function (global) {
  'use strict';

  const HOMOGRAPH_MAP = Object.freeze({
    // Cyrillic Lowercase Lookalikes
    0x0430: { name: "Cyrillic Small Letter А (Homograph of 'a')", canonical: 'a', category: 'homograph', sourceScript: 'Cyrillic', homoglyphKind: 'cross-script' },
    0x0435: { name: "Cyrillic Small Letter Е (Homograph of 'e')", canonical: 'e', category: 'homograph', sourceScript: 'Cyrillic', homoglyphKind: 'cross-script' },
    0x043E: { name: "Cyrillic Small Letter О (Homograph of 'o')", canonical: 'o', category: 'homograph', sourceScript: 'Cyrillic', homoglyphKind: 'cross-script' },
    0x0440: { name: "Cyrillic Small Letter Р (Homograph of 'p')", canonical: 'p', category: 'homograph', sourceScript: 'Cyrillic', homoglyphKind: 'cross-script' },
    0x0441: { name: "Cyrillic Small Letter С (Homograph of 'c')", canonical: 'c', category: 'homograph', sourceScript: 'Cyrillic', homoglyphKind: 'cross-script' },
    0x0445: { name: "Cyrillic Small Letter Х (Homograph of 'x')", canonical: 'x', category: 'homograph', sourceScript: 'Cyrillic', homoglyphKind: 'cross-script' },
    0x0443: { name: "Cyrillic Small Letter У (Homograph of 'y')", canonical: 'y', category: 'homograph', sourceScript: 'Cyrillic', homoglyphKind: 'cross-script' },
    0x0456: { name: "Cyrillic Small Letter І (Homograph of 'i')", canonical: 'i', category: 'homograph', sourceScript: 'Cyrillic', homoglyphKind: 'cross-script' },
    0x0455: { name: "Cyrillic Small Letter Ѕ (Homograph of 's')", canonical: 's', category: 'homograph', sourceScript: 'Cyrillic', homoglyphKind: 'cross-script' },
    0x0501: { name: "Cyrillic Small Letter Komi De ԁ (Homograph of 'd')", canonical: 'd', category: 'homograph', sourceScript: 'Cyrillic', homoglyphKind: 'cross-script' },

    // Cyrillic Uppercase Lookalikes
    0x0410: { name: "Cyrillic Capital Letter А (Homograph of 'A')", canonical: 'A', category: 'homograph', sourceScript: 'Cyrillic', homoglyphKind: 'cross-script' },
    0x0412: { name: "Cyrillic Capital Letter В (Homograph of 'B')", canonical: 'B', category: 'homograph', sourceScript: 'Cyrillic', homoglyphKind: 'cross-script' },
    0x0415: { name: "Cyrillic Capital Letter Е (Homograph of 'E')", canonical: 'E', category: 'homograph', sourceScript: 'Cyrillic', homoglyphKind: 'cross-script' },
    0x041A: { name: "Cyrillic Capital Letter К (Homograph of 'K')", canonical: 'K', category: 'homograph', sourceScript: 'Cyrillic', homoglyphKind: 'cross-script' },
    0x041C: { name: "Cyrillic Capital Letter М (Homograph of 'M')", canonical: 'M', category: 'homograph', sourceScript: 'Cyrillic', homoglyphKind: 'cross-script' },
    0x041D: { name: "Cyrillic Capital Letter Н (Homograph of 'H')", canonical: 'H', category: 'homograph', sourceScript: 'Cyrillic', homoglyphKind: 'cross-script' },
    0x041E: { name: "Cyrillic Capital Letter О (Homograph of 'O')", canonical: 'O', category: 'homograph', sourceScript: 'Cyrillic', homoglyphKind: 'cross-script' },
    0x0420: { name: "Cyrillic Capital Letter Р (Homograph of 'P')", canonical: 'P', category: 'homograph', sourceScript: 'Cyrillic', homoglyphKind: 'cross-script' },
    0x0421: { name: "Cyrillic Capital Letter С (Homograph of 'C')", canonical: 'C', category: 'homograph', sourceScript: 'Cyrillic', homoglyphKind: 'cross-script' },
    0x0422: { name: "Cyrillic Capital Letter Т (Homograph of 'T')", canonical: 'T', category: 'homograph', sourceScript: 'Cyrillic', homoglyphKind: 'cross-script' },
    0x0425: { name: "Cyrillic Capital Letter Х (Homograph of 'X')", canonical: 'X', category: 'homograph', sourceScript: 'Cyrillic', homoglyphKind: 'cross-script' },
    0x0423: { name: "Cyrillic Capital Letter У (Homograph of 'Y')", canonical: 'Y', category: 'homograph', sourceScript: 'Cyrillic', homoglyphKind: 'cross-script' },

    // Greek Lookalikes
    0x03BF: { name: "Greek Small Letter Omicron ο (Homograph of 'o')", canonical: 'o', category: 'homograph', sourceScript: 'Greek', homoglyphKind: 'cross-script' },
    0x03BD: { name: "Greek Small Letter Nu ν (Homograph of 'v')", canonical: 'v', category: 'homograph', sourceScript: 'Greek', homoglyphKind: 'cross-script' },
    0x03C5: { name: "Greek Small Letter Upsilon υ (Homograph of 'u')", canonical: 'u', category: 'homograph', sourceScript: 'Greek', homoglyphKind: 'cross-script' },
    0x03C1: { name: "Greek Small Letter Rho ρ (Homograph of 'p')", canonical: 'p', category: 'homograph', sourceScript: 'Greek', homoglyphKind: 'cross-script' },
    0x0391: { name: "Greek Capital Letter Alpha Α (Homograph of 'A')", canonical: 'A', category: 'homograph', sourceScript: 'Greek', homoglyphKind: 'cross-script' },
    0x0392: { name: "Greek Capital Letter Beta Β (Homograph of 'B')", canonical: 'B', category: 'homograph', sourceScript: 'Greek', homoglyphKind: 'cross-script' },
    0x0395: { name: "Greek Capital Letter Epsilon Ε (Homograph of 'E')", canonical: 'E', category: 'homograph', sourceScript: 'Greek', homoglyphKind: 'cross-script' },
    0x0396: { name: "Greek Capital Letter Zeta Ζ (Homograph of 'Z')", canonical: 'Z', category: 'homograph', sourceScript: 'Greek', homoglyphKind: 'cross-script' },
    0x0397: { name: "Greek Capital Letter Eta Η (Homograph of 'H')", canonical: 'H', category: 'homograph', sourceScript: 'Greek', homoglyphKind: 'cross-script' },
    0x0399: { name: "Greek Capital Letter Iota Ι (Homograph of 'I')", canonical: 'I', category: 'homograph', sourceScript: 'Greek', homoglyphKind: 'cross-script' },
    0x039A: { name: "Greek Capital Letter Kappa Κ (Homograph of 'K')", canonical: 'K', category: 'homograph', sourceScript: 'Greek', homoglyphKind: 'cross-script' },
    0x039C: { name: "Greek Capital Letter Mu Μ (Homograph of 'M')", canonical: 'M', category: 'homograph', sourceScript: 'Greek', homoglyphKind: 'cross-script' },
    0x039D: { name: "Greek Capital Letter Nu Ν (Homograph of 'N')", canonical: 'N', category: 'homograph', sourceScript: 'Greek', homoglyphKind: 'cross-script' },
    0x039F: { name: "Greek Capital Letter Omicron Ο (Homograph of 'O')", canonical: 'O', category: 'homograph', sourceScript: 'Greek', homoglyphKind: 'cross-script' },
    0x03A1: { name: "Greek Capital Letter Rho Ρ (Homograph of 'P')", canonical: 'P', category: 'homograph', sourceScript: 'Greek', homoglyphKind: 'cross-script' },
    0x03A4: { name: "Greek Capital Letter Tau Τ (Homograph of 'T')", canonical: 'T', category: 'homograph', sourceScript: 'Greek', homoglyphKind: 'cross-script' },
    0x03A7: { name: "Greek Capital Letter Chi Χ (Homograph of 'X')", canonical: 'X', category: 'homograph', sourceScript: 'Greek', homoglyphKind: 'cross-script' },
    0x03A5: { name: "Greek Capital Letter Upsilon Υ (Homograph of 'Y')", canonical: 'Y', category: 'homograph', sourceScript: 'Greek', homoglyphKind: 'cross-script' },

    // Latin & Punctuation Homoglyphs (Watermarking / Spoofing)
    0x2010: { name: "Hyphen ‐ (Homoglyph of ASCII Hyphen-Minus '-')", canonical: '-', category: 'homograph', sourceScript: 'Common', homoglyphKind: 'punctuation' },
    0x037E: { name: "Greek Question Mark ; (Homoglyph of Semicolon ';')", canonical: ';', category: 'homograph', sourceScript: 'Greek', homoglyphKind: 'punctuation' },
    0x216D: { name: "Roman Numeral One Hundred Ⅽ (Homoglyph of 'C')", canonical: 'C', category: 'homograph', sourceScript: 'Latin', homoglyphKind: 'compatibility' },
    0x216E: { name: "Roman Numeral Five Hundred Ⅾ (Homoglyph of 'D')", canonical: 'D', category: 'homograph', sourceScript: 'Latin', homoglyphKind: 'compatibility' },
    0x212A: { name: "Kelvin Sign K (Homoglyph of 'K')", canonical: 'K', category: 'homograph', sourceScript: 'Common', homoglyphKind: 'compatibility' },
    0x216C: { name: "Roman Numeral Fifty Ⅼ (Homoglyph of 'L')", canonical: 'L', category: 'homograph', sourceScript: 'Latin', homoglyphKind: 'compatibility' },
    0x216F: { name: "Roman Numeral One Thousand Ⅿ (Homoglyph of 'M')", canonical: 'M', category: 'homograph', sourceScript: 'Latin', homoglyphKind: 'compatibility' },
    0x2164: { name: "Roman Numeral Five Ⅴ (Homoglyph of 'V')", canonical: 'V', category: 'homograph', sourceScript: 'Latin', homoglyphKind: 'compatibility' },
    0x2169: { name: "Roman Numeral Ten Ⅹ (Homoglyph of 'X')", canonical: 'X', category: 'homograph', sourceScript: 'Latin', homoglyphKind: 'compatibility' },
    0x217D: { name: "Small Roman Numeral One Hundred ⅽ (Homoglyph of 'c')", canonical: 'c', category: 'homograph', sourceScript: 'Latin', homoglyphKind: 'compatibility' },
    0x217E: { name: "Small Roman Numeral Five Hundred ⅾ (Homoglyph of 'd')", canonical: 'd', category: 'homograph', sourceScript: 'Latin', homoglyphKind: 'compatibility' },
    0x2170: { name: "Small Roman Numeral One ⅰ (Homoglyph of 'i')", canonical: 'i', category: 'homograph', sourceScript: 'Latin', homoglyphKind: 'compatibility' },
    0x0458: { name: "Cyrillic Small Letter Je ј (Homoglyph of 'j')", canonical: 'j', category: 'homograph', sourceScript: 'Cyrillic', homoglyphKind: 'cross-script' },
    0x217C: { name: "Small Roman Numeral Fifty ⅼ (Homoglyph of 'l')", canonical: 'l', category: 'homograph', sourceScript: 'Latin', homoglyphKind: 'compatibility' },
    0x2174: { name: "Small Roman Numeral Five ⅴ (Homoglyph of 'v')", canonical: 'v', category: 'homograph', sourceScript: 'Latin', homoglyphKind: 'compatibility' },
    0x2179: { name: "Small Roman Numeral Ten ⅹ (Homoglyph of 'x')", canonical: 'x', category: 'homograph', sourceScript: 'Latin', homoglyphKind: 'compatibility' }
  });

  /**
   * Checks if a code point is a homoglyph or fullwidth ASCII.
   *
   * @param {number} cp - Code point.
   * @param {string} char - Single character string.
   * @returns {Object|null} Homoglyph metadata or null.
   */
  function matchHomoglyph(cp, char) {
    if (HOMOGRAPH_MAP[cp]) {
      const entry = HOMOGRAPH_MAP[cp];
      return {
        codePoint: cp,
        hexCode: 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'),
        name: entry.name,
        category: 'homograph',
        canonical: entry.canonical,
        sourceScript: entry.sourceScript,
        homoglyphKind: entry.homoglyphKind
      };
    }

    // Fullwidth ASCII Variants: U+FF01 to U+FF5E
    if (cp >= 0xFF01 && cp <= 0xFF5E) {
      const canonicalChar = String.fromCharCode(cp - 0xFEE0);
      return {
        codePoint: cp,
        hexCode: 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'),
        name: `Fullwidth ASCII '${char}' (Homograph of '${canonicalChar}')`,
        category: 'homograph',
        canonical: canonicalChar,
        sourceScript: 'Common',
        homoglyphKind: 'width'
      };
    }

    return null;
  }

  global.StegDetectHomoglyphs = {
    HOMOGRAPH_MAP,
    matchHomoglyph
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HOMOGRAPH_MAP, matchHomoglyph };
  }
})(typeof window !== 'undefined' ? window : globalThis);
