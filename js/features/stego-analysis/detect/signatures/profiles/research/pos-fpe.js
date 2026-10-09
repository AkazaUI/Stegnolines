/**
 * @file pos-fpe.js
 * @description Steganalysis signature profile: Text Steganography Based on POS Tagging & FPE.
 */

(function (global) {
  'use strict';

  const profile = {
  "schemaVersion": 1,
  "id": "research.pos-fpe",
  "kind": "research",
  "legacyIds": [
    "research_pos_fpe"
  ],
  "identity": {
    "name": "Text Steganography Based on POS Tagging & FPE",
    "titleAr": "بحث الإخفاء بوسم أقسام الكلام والتشفير المحافظ على التنسيق (POS & FPE)",
    "titleEn": "Text Steganography Based on Part-of-Speech Tagging & FPE",
    "url": "https://scholar.google.com/scholar?q=New+Text+Steganography+Technique+Based+on+Part-of-Speech+Tagging+and+Format-Preserving+Encryption"
  },
  "modes": [
    {
      "id": "default",
      "legacyId": "research_pos_fpe",
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
          8290,
          8709,
          8234,
          8237,
          8236,
          8288,
          8294,
          8296
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
        "name": "Text Steganography Based on POS Tagging & FPE",
        "titleAr": "بحث الإخفاء بوسم أقسام الكلام والتشفير المحافظ على التنسيق (POS & FPE)",
        "titleEn": "Text Steganography Based on Part-of-Speech Tagging & FPE",
        "encodingTable": [
          {
            "charName": "Zero width space (ZWS)",
            "hex": "U+200B",
            "bits": "0000",
            "desc": "Zero Width Space"
          },
          {
            "charName": "Zero width joiner (ZWJ)",
            "hex": "U+200D",
            "bits": "0001",
            "desc": "Zero Width Joiner"
          },
          {
            "charName": "Zero width no-joiner (ZWNJ)",
            "hex": "U+200C",
            "bits": "0010",
            "desc": "Zero Width Non-Joiner"
          },
          {
            "charName": "Invisible plus (IP)",
            "hex": "U+2064",
            "bits": "0011",
            "desc": "Invisible Plus"
          },
          {
            "charName": "Invisible separator (IS)",
            "hex": "U+2063",
            "bits": "0100",
            "desc": "Invisible Separator"
          },
          {
            "charName": "Inhibit Symmetric Swapping (ISS)",
            "hex": "U+206A",
            "bits": "0101",
            "desc": "Inhibit Symmetric Swapping"
          },
          {
            "charName": "Invisible Time (IT)",
            "hex": "U+2062",
            "bits": "0110",
            "desc": "Invisible Time"
          },
          {
            "charName": "Empty string ('''')",
            "hex": "U+2205",
            "bits": "0111",
            "desc": "Empty String Symbol"
          },
          {
            "charName": "Left-To-Right Embedding (LRE)",
            "hex": "U+202A",
            "bits": "1000",
            "desc": "Left-To-Right Embedding"
          },
          {
            "charName": "Left-To-Right Override (LRO)",
            "hex": "U+202D",
            "bits": "1001",
            "desc": "Left-To-Right Override"
          },
          {
            "charName": "Pop Directional Formatting (PDF)",
            "hex": "U+202C",
            "bits": "1010",
            "desc": "Pop Directional Formatting"
          },
          {
            "charName": "Word Joiner (WJ)",
            "hex": "U+2060",
            "bits": "1011",
            "desc": "Word Joiner"
          },
          {
            "charName": "Left-To-Right Isolate (LRI)",
            "hex": "U+2066",
            "bits": "1100",
            "desc": "Left-To-Right Isolate"
          },
          {
            "charName": "First Strong Isolate (FSI)",
            "hex": "U+2068",
            "bits": "1101",
            "desc": "First Strong Isolate"
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
