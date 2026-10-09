/**
 * @file aitsteg.js
 * @description Steganalysis signature profile: AITSteg: Text Steganography via Social Media (IEEE ACCESS 2018).
 */

(function (global) {
  'use strict';

  const profile = {
  "schemaVersion": 1,
  "id": "research.aitsteg",
  "kind": "research",
  "legacyIds": [
    "research_aitsteg"
  ],
  "identity": {
    "name": "AITSteg: Text Steganography via Social Media (IEEE ACCESS 2018)",
    "titleAr": "بحث AITSteg للإخفاء عبر وسائل التواصل (IEEE ACCESS 2018)",
    "titleEn": "AITSteg: Innovative Technique for Hidden Transmission via Social Media",
    "doi": "10.1109/ACCESS.2018.2866063",
    "url": "https://doi.org/10.1109/ACCESS.2018.2866063"
  },
  "modes": [
    {
      "id": "default",
      "legacyId": "research_aitsteg",
      "enabled": true,
      "carrierSignature": {
        "matcherKind": "legacy-exact-set",
        "exactSymbols": [
          8204,
          8236,
          8237,
          8206
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
        "name": "AITSteg: Text Steganography via Social Media (IEEE ACCESS 2018)",
        "titleAr": "بحث AITSteg للإخفاء عبر وسائل التواصل (IEEE ACCESS 2018)",
        "titleEn": "AITSteg: Innovative Technique for Hidden Transmission via Social Media",
        "encodingTable": [
          {
            "charName": "ZWNJ - Zero Width Non-Joiner",
            "hex": "U+200C",
            "bits": "00",
            "desc": "Zero-Width Non-Joiner"
          },
          {
            "charName": "PDF - Pop Directional Formatting",
            "hex": "U+202C",
            "bits": "01",
            "desc": "Pop Directional Formatting"
          },
          {
            "charName": "LRO - Left-to-Right Override",
            "hex": "U+202D",
            "bits": "10",
            "desc": "Left-to-Right Override"
          },
          {
            "charName": "LRM - Left-to-Right Mark",
            "hex": "U+200E",
            "bits": "11",
            "desc": "Left-to-Right Mark"
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
