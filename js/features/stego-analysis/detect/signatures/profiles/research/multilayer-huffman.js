/**
 * @file multilayer-huffman.js
 * @description Steganalysis signature profile: Multilayer Encoding & Huffman (IJACSA 2022).
 */

(function (global) {
  'use strict';

  const profile = {
  "schemaVersion": 1,
  "id": "research.multilayer-huffman",
  "kind": "research",
  "legacyIds": [
    "research_multilayer_huffman"
  ],
  "identity": {
    "name": "Multilayer Encoding & Huffman (IJACSA 2022)",
    "titleAr": "بحث الإخفاء متعدد الطبقات وتشفير هافمان (IJACSA 2022)",
    "titleEn": "Multilayer Encoding with Format-Preserving Encryption & Huffman Coding",
    "doi": "10.14569/IJACSA.2022.0131222",
    "url": "https://doi.org/10.14569/IJACSA.2022.0131222"
  },
  "modes": [
    {
      "id": "default",
      "legacyId": "research_multilayer_huffman",
      "enabled": true,
      "carrierSignature": {
        "matcherKind": "legacy-exact-set",
        "exactSymbols": [
          8203,
          8205,
          8204,
          8292,
          8291,
          8298,
          8709,
          8234
        ],
        "alternateExactSymbols": [
          8203,
          8205,
          8204,
          8292,
          8291,
          8298,
          8234
        ],
        "minCount": 4,
        "legacyFlags": {}
      },
      "placementSignatures": {
        "status": "pending",
        "definitions": []
      },
      "presentation": {
        "name": "Multilayer Encoding & Huffman (IJACSA 2022)",
        "titleAr": "بحث الإخفاء متعدد الطبقات وتشفير هافمان (IJACSA 2022)",
        "titleEn": "Multilayer Encoding with Format-Preserving Encryption & Huffman Coding",
        "encodingTable": [
          {
            "charName": "Zero width character (ZWC)",
            "hex": "U+200B",
            "bits": "000",
            "desc": "Zero-Width Character"
          },
          {
            "charName": "Zero width joiner (ZWJ)",
            "hex": "U+200D",
            "bits": "001",
            "desc": "Zero-Width Joiner"
          },
          {
            "charName": "Zero width no-joiner (ZWNJ)",
            "hex": "U+200C",
            "bits": "010",
            "desc": "Zero-Width Non-Joiner"
          },
          {
            "charName": "Invisible plus (IP)",
            "hex": "U+2064",
            "bits": "011",
            "desc": "Invisible Plus"
          },
          {
            "charName": "Invisible separator (IS)",
            "hex": "U+2063",
            "bits": "100",
            "desc": "Invisible Separator"
          },
          {
            "charName": "Inhibit Symmetric Swapping (ISS)",
            "hex": "U+206A",
            "bits": "101",
            "desc": "Inhibit Symmetric Swapping"
          },
          {
            "charName": "Empty string (∅)",
            "hex": "U+2205",
            "bits": "110",
            "desc": "Empty String Symbol"
          },
          {
            "charName": "Left-To-Right Embedding (LRE)",
            "hex": "U+202A",
            "bits": "111",
            "desc": "Left-To-Right Embedding"
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
