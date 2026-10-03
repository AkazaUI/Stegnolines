/**
 * @file homoglyph-substitution.js
 * @description Steganalysis signature profile: Content-preserving Text Watermarking through Unicode Homoglyph Substitution.
 */

(function (global) {
  'use strict';

  const profile = {
  "schemaVersion": 1,
  "id": "watermark.homoglyph-substitution",
  "kind": "watermark",
  "legacyIds": [
    "watermark_homoglyphs_sub"
  ],
  "identity": {
    "name": "Content-preserving Text Watermarking through Unicode Homoglyph Substitution",
    "titleAr": "بحث العلامة المائية المحافظة على المحتوى عبر متجانسات يونيكود (ACM 2016)",
    "titleEn": "Content-preserving Text Watermarking through Unicode Homoglyph Substitution",
    "doi": "10.1145/2938503.2938510",
    "url": "https://doi.org/10.1145/2938503.2938510"
  },
  "modes": [
    {
      "id": "default",
      "legacyId": "watermark_homoglyphs_sub",
      "enabled": true,
      "carrierSignature": {
        "matcherKind": "legacy-watermark-subset",
        "exactSymbols": [
          8208,
          894,
          8557,
          8558,
          8490,
          8556,
          8559,
          8548,
          8553,
          8573,
          8574,
          8560,
          1112,
          8572,
          8564,
          8569
        ],
        "alternateExactSymbols": [],
        "minCount": 3,
        "legacyFlags": {
          "isWatermark": true
        }
      },
      "placementSignatures": {
        "status": "pending",
        "definitions": []
      },
      "presentation": {
        "name": "Content-preserving Text Watermarking through Unicode Homoglyph Substitution",
        "titleAr": "بحث العلامة المائية المحافظة على المحتوى عبر متجانسات يونيكود (ACM 2016)",
        "titleEn": "Content-preserving Text Watermarking through Unicode Homoglyph Substitution",
        "encodingTable": [
          {
            "charName": "Hyphen (‐)",
            "hex": "0x2010 (vs 0x002D)",
            "bits": "Bit 1 (Alt) vs Bit 0 (Orig)",
            "desc": "الواصلة"
          },
          {
            "charName": "Greek Question Mark (;)",
            "hex": "0x037E (vs 0x003B)",
            "bits": "Bit 1 (Alt) vs Bit 0 (Orig)",
            "desc": "الفاصلة المنقوطة"
          },
          {
            "charName": "Roman Numeral C (Ⅽ)",
            "hex": "0x216D (vs 0x0043)",
            "bits": "Bit 1 (Alt) vs Bit 0 (Orig)",
            "desc": "C كبير"
          },
          {
            "charName": "Roman Numeral D (Ⅾ)",
            "hex": "0x216E (vs 0x0044)",
            "bits": "Bit 1 (Alt) vs Bit 0 (Orig)",
            "desc": "D كبير"
          },
          {
            "charName": "Kelvin Sign (K)",
            "hex": "0x212A (vs 0x004B)",
            "bits": "Bit 1 (Alt) vs Bit 0 (Orig)",
            "desc": "K كبير"
          },
          {
            "charName": "Roman Numeral L (Ⅼ)",
            "hex": "0x216C (vs 0x004C)",
            "bits": "Bit 1 (Alt) vs Bit 0 (Orig)",
            "desc": "L كبير"
          },
          {
            "charName": "Roman Numeral M (Ⅿ)",
            "hex": "0x216F (vs 0x004D)",
            "bits": "Bit 1 (Alt) vs Bit 0 (Orig)",
            "desc": "M كبير"
          },
          {
            "charName": "Roman Numeral V (Ⅴ)",
            "hex": "0x2164 (vs 0x0056)",
            "bits": "Bit 1 (Alt) vs Bit 0 (Orig)",
            "desc": "V كبير"
          },
          {
            "charName": "Roman Numeral X (Ⅹ)",
            "hex": "0x2169 (vs 0x0058)",
            "bits": "Bit 1 (Alt) vs Bit 0 (Orig)",
            "desc": "X كبير"
          },
          {
            "charName": "Small Roman Numeral c (ⅽ)",
            "hex": "0x217D (vs 0x0063)",
            "bits": "Bit 1 (Alt) vs Bit 0 (Orig)",
            "desc": "c صغير"
          },
          {
            "charName": "Small Roman Numeral d (ⅾ)",
            "hex": "0x217E (vs 0x0064)",
            "bits": "Bit 1 (Alt) vs Bit 0 (Orig)",
            "desc": "d صغير"
          },
          {
            "charName": "Small Roman Numeral i (ⅰ)",
            "hex": "0x2170 (vs 0x0069)",
            "bits": "Bit 1 (Alt) vs Bit 0 (Orig)",
            "desc": "i صغير"
          },
          {
            "charName": "Cyrillic Small Je (ј)",
            "hex": "0x0458 (vs 0x006A)",
            "bits": "Bit 1 (Alt) vs Bit 0 (Orig)",
            "desc": "j صغير"
          },
          {
            "charName": "Small Roman Numeral l (ⅼ)",
            "hex": "0x217C (vs 0x006C)",
            "bits": "Bit 1 (Alt) vs Bit 0 (Orig)",
            "desc": "l صغير"
          },
          {
            "charName": "Small Roman Numeral v (ⅴ)",
            "hex": "0x2174 (vs 0x0076)",
            "bits": "Bit 1 (Alt) vs Bit 0 (Orig)",
            "desc": "v صغير"
          },
          {
            "charName": "Small Roman Numeral x (ⅹ)",
            "hex": "0x2179 (vs 0x0078)",
            "bits": "Bit 1 (Alt) vs Bit 0 (Orig)",
            "desc": "x صغير"
          }
        ]
      }
    }
  ]
};

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = profile;
  } else if (global.StegSignatures && global.StegSignatures.Registry) {
    global.StegSignatures.Registry.registerProfile(profile);
  }
})(typeof window !== 'undefined' ? window : globalThis);
