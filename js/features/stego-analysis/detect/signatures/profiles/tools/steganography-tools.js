/**
 * @file steganography-tools.js
 * @description Steganalysis signature profile: steganography-tools.
 */

(function (global) {
  'use strict';

  const profile = {
  "schemaVersion": 1,
  "id": "tool.steganography-tools",
  "kind": "tool",
  "legacyIds": [
    "tool_stego_tools"
  ],
  "identity": {
    "name": "steganography-tools",
    "titleAr": "أداة steganography-tools (priyansh-15)",
    "titleEn": "steganography-tools (priyansh-15)",
    "url": "https://github.com/priyansh-15/steganography-tools"
  },
  "modes": [
    {
      "id": "default",
      "legacyId": "tool_stego_tools",
      "enabled": true,
      "carrierSignature": {
        "matcherKind": "legacy-exact-set",
        "exactSymbols": [
          8204,
          8236,
          8206,
          8237
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
        "name": "steganography-tools",
        "titleAr": "أداة steganography-tools (priyansh-15)",
        "titleEn": "steganography-tools (priyansh-15)",
        "encodingTable": [
          {
            "charName": "Zero Width Non-Joiner (ZWNJ)",
            "hex": "U+200C",
            "bits": "00",
            "desc": "Zero Width Non-Joiner"
          },
          {
            "charName": "Pop Directional Formatting (PDF)",
            "hex": "U+202C",
            "bits": "01",
            "desc": "Pop Directional Formatting"
          },
          {
            "charName": "Left-to-Right Mark (LRM)",
            "hex": "U+200E",
            "bits": "10",
            "desc": "Left-to-Right Mark"
          },
          {
            "charName": "Left-to-Right Override (LRO)",
            "hex": "U+202D",
            "bits": "11",
            "desc": "Left-to-Right Override"
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
