/**
 * @file stegoline.js
 * @description Steganalysis signature profile: Stegoline – Emoji encoder.
 */

(function (global) {
  'use strict';

  const profile = {
  "schemaVersion": 1,
  "id": "tool.stegoline",
  "kind": "tool",
  "legacyIds": [
    "tool_stegoline_emoji"
  ],
  "identity": {
    "name": "Stegoline – Emoji encoder",
    "titleAr": "Stegoline – مشفر الرموز التعبيرية (Emoji Encoder)",
    "titleEn": "Stegoline – Emoji Encoder",
    "url": "https://stegnolines.com/",
    "secondaryUrl": "https://emoji-encoder.vercel.app/?mode=encode"
  },
  "modes": [
    {
      "id": "emoji",
      "legacyId": "tool_stegoline_emoji",
      "enabled": true,
      "carrierSignature": {
        "matcherKind": "legacy-variation-selectors",
        "minCount": 2,
        "legacyFlags": {
          "isVariationSelectorScheme": true
        }
      },
      "placementSignatures": {
        "status": "pending",
        "definitions": []
      },
      "presentation": {
        "name": "Stegoline – Emoji encoder",
        "titleAr": "Stegoline – مشفر الرموز التعبيرية (Emoji Encoder)",
        "titleEn": "Stegoline – Emoji Encoder",
        "encodingTable": [
          {
            "charName": "Basic variation selectors (VS1–VS16)",
            "hex": "U+FE00 – U+FE0F",
            "bits": "16 characters (4-bit nibble)",
            "desc": "Basic Variation Selectors"
          },
          {
            "charName": "Variation selectors supplement (VS17–VS256)",
            "hex": "U+E0100 – U+E01EF",
            "bits": "240 characters (8-bit byte)",
            "desc": "Variation Selectors Supplement"
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
