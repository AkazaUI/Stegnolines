/**
 * @file stegzero.js
 * @description Steganalysis signature profile: StegZero.
 */

(function (global) {
  'use strict';

  const profile = {
  "schemaVersion": 1,
  "id": "tool.stegzero",
  "kind": "tool",
  "legacyIds": [
    "tool_stegzero_3bit",
    "tool_stegzero_1bit"
  ],
  "identity": {
    "name": "StegZero",
    "titleAr": "أداة StegZero",
    "titleEn": "StegZero",
    "url": "https://stegzero.com/"
  },
  "modes": [
    {
      "id": "3bit",
      "legacyId": "tool_stegzero_3bit",
      "enabled": true,
      "carrierSignature": {
        "matcherKind": "legacy-exact-set",
        "exactSymbols": [
          8203,
          8204,
          8205,
          8288,
          8290,
          8291,
          8292,
          65279
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
        "name": "StegZero (3-bit)",
        "titleAr": "أداة StegZero (نظام 3 بت)",
        "titleEn": "StegZero (3-bit Mode)",
        "encodingTable": [
          {
            "charName": "Zero-Width Space (ZWSP)",
            "hex": "U+200B",
            "bits": "000",
            "desc": "Zero-Width Space"
          },
          {
            "charName": "Zero-Width Non-Joiner (ZWNJ)",
            "hex": "U+200C",
            "bits": "001",
            "desc": "Zero-Width Non-Joiner"
          },
          {
            "charName": "Zero-Width Joiner (ZWJ)",
            "hex": "U+200D",
            "bits": "010",
            "desc": "Zero-Width Joiner"
          },
          {
            "charName": "Word Joiner (WJ)",
            "hex": "U+2060",
            "bits": "011",
            "desc": "Word Joiner"
          },
          {
            "charName": "Invisible Times",
            "hex": "U+2062",
            "bits": "100",
            "desc": "Invisible Times"
          },
          {
            "charName": "Invisible Separator",
            "hex": "U+2063",
            "bits": "101",
            "desc": "Invisible Separator"
          },
          {
            "charName": "Invisible Plus",
            "hex": "U+2064",
            "bits": "110",
            "desc": "Invisible Plus"
          },
          {
            "charName": "Zero-Width No-Break Space / BOM",
            "hex": "U+FEFF",
            "bits": "111",
            "desc": "ZWNBS / BOM"
          }
        ]
      }
    },
    {
      "id": "1bit",
      "legacyId": "tool_stegzero_1bit",
      "enabled": true,
      "carrierSignature": {
        "matcherKind": "legacy-exact-set",
        "exactSymbols": [
          8203,
          8204
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
        "name": "StegZero (1-bit)",
        "titleAr": "أداة StegZero (نظام 1 بت الثنائي)",
        "titleEn": "StegZero (1-bit Binary Mode)",
        "encodingTable": [
          {
            "charName": "Zero-Width Space (ZWSP)",
            "hex": "U+200B",
            "bits": "0",
            "desc": "Zero-Width Space"
          },
          {
            "charName": "Zero-Width Non-Joiner (ZWNJ)",
            "hex": "U+200C",
            "bits": "1",
            "desc": "Zero-Width Non-Joiner"
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
