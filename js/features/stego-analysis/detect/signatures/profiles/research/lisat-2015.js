/**
 * @file lisat-2015.js
 * @description Steganalysis signature profile: Highly efficient novel text steganography algorithms (LISAT 2015).
 */

(function (global) {
  'use strict';

  const profile = {
  "schemaVersion": 1,
  "id": "research.lisat-2015",
  "kind": "research",
  "legacyIds": [
    "research_lisat_2015"
  ],
  "identity": {
    "name": "Highly efficient novel text steganography algorithms (LISAT 2015)",
    "titleAr": "بحث خوارزميات الإخفاء النصي عالية الكفاءة (IEEE LISAT 2015)",
    "titleEn": "Highly Efficient Novel Text Steganography Algorithms (IEEE LISAT 2015)",
    "doi": "10.1109/LISAT.2015.7160209",
    "url": "https://doi.org/10.1109/LISAT.2015.7160209"
  },
  "modes": [
    {
      "id": "default",
      "legacyId": "research_lisat_2015",
      "enabled": true,
      "carrierSignature": {
        "matcherKind": "legacy-exact-set",
        "exactSymbols": [
          8204,
          8206,
          8207,
          8205
        ],
        "alternateExactSymbols": [],
        "minCount": 4,
        "legacyFlags": {}
      },
      "placementSignatures": {
        "status": "pending",
        "definitions": []
      },
      "presentation": {
        "name": "Highly efficient novel text steganography algorithms (LISAT 2015)",
        "titleAr": "بحث خوارزميات الإخفاء النصي عالية الكفاءة (IEEE LISAT 2015)",
        "titleEn": "Highly Efficient Novel Text Steganography Algorithms (IEEE LISAT 2015)",
        "encodingTable": [
          {
            "charName": "Zero-Width-Non-Joiner (ZWNJ)",
            "hex": "U+200C",
            "bits": "Decimal 8204",
            "desc": "Zero-Width Non-Joiner"
          },
          {
            "charName": "Left-To-Right Mark (LRM)",
            "hex": "U+200E",
            "bits": "Decimal 8206",
            "desc": "Left-To-Right Mark"
          },
          {
            "charName": "Right-To-Left Mark (RLM)",
            "hex": "U+200F",
            "bits": "Decimal 8207",
            "desc": "Right-To-Left Mark"
          },
          {
            "charName": "Zero-Width-Joiner (ZWJ)",
            "hex": "U+200D",
            "bits": "Decimal 8205",
            "desc": "Zero-Width Joiner"
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
