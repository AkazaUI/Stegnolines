/**
 * @file doublespeak.js
 * @description Steganalysis signature profile: Doublespeak.
 */

(function (global) {
  'use strict';

  const profile = {
  "schemaVersion": 1,
  "id": "tool.doublespeak",
  "kind": "tool",
  "legacyIds": [
    "tool_doublespeak"
  ],
  "identity": {
    "name": "Doublespeak",
    "titleAr": "أداة Doublespeak (dblspk)",
    "titleEn": "Doublespeak Covert Text Web-App",
    "url": "https://github.com/dblspk/web-app"
  },
  "modes": [
    {
      "id": "default",
      "legacyId": "tool_doublespeak",
      "enabled": true,
      "carrierSignature": {
        "matcherKind": "legacy-exact-set",
        "exactSymbols": [
          8204,
          8205,
          8288,
          8289,
          8290,
          8291,
          8292,
          8298,
          8299,
          8300,
          8301,
          8302,
          8303,
          65024,
          65025,
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
        "name": "Doublespeak",
        "titleAr": "أداة Doublespeak (dblspk)",
        "titleEn": "Doublespeak Covert Text Web-App",
        "encodingTable": [
          {
            "charName": "zero-width non-joiner",
            "hex": "U+200C",
            "bits": "0000 (0 / 0x0)",
            "desc": "Zero-Width Non-Joiner"
          },
          {
            "charName": "zero-width joiner",
            "hex": "U+200D",
            "bits": "0001 (1 / 0x1)",
            "desc": "Zero-Width Joiner"
          },
          {
            "charName": "word joiner",
            "hex": "U+2060",
            "bits": "0010 (2 / 0x2)",
            "desc": "Word Joiner"
          },
          {
            "charName": "function application",
            "hex": "U+2061",
            "bits": "0011 (3 / 0x3)",
            "desc": "Function Application"
          },
          {
            "charName": "invisible times",
            "hex": "U+2062",
            "bits": "0100 (4 / 0x4)",
            "desc": "Invisible Times"
          },
          {
            "charName": "invisible separator",
            "hex": "U+2063",
            "bits": "0101 (5 / 0x5)",
            "desc": "Invisible Separator"
          },
          {
            "charName": "invisible plus",
            "hex": "U+2064",
            "bits": "0110 (6 / 0x6)",
            "desc": "Invisible Plus"
          },
          {
            "charName": "inhibit symmetric swapping",
            "hex": "U+206A",
            "bits": "0111 (7 / 0x7)",
            "desc": "Inhibit Symmetric Swapping"
          },
          {
            "charName": "activate symmetric swapping",
            "hex": "U+206B",
            "bits": "1000 (8 / 0x8)",
            "desc": "Activate Symmetric Swapping"
          },
          {
            "charName": "inhibit Arabic form shaping",
            "hex": "U+206C",
            "bits": "1001 (9 / 0x9)",
            "desc": "Inhibit Arabic Form Shaping"
          },
          {
            "charName": "activate Arabic form shaping",
            "hex": "U+206D",
            "bits": "1010 (10 / 0xA)",
            "desc": "Activate Arabic Form Shaping"
          },
          {
            "charName": "national digit shapes",
            "hex": "U+206E",
            "bits": "1011 (11 / 0xB)",
            "desc": "National Digit Shapes"
          },
          {
            "charName": "nominal digit shapes",
            "hex": "U+206F",
            "bits": "1100 (12 / 0xC)",
            "desc": "Nominal Digit Shapes"
          },
          {
            "charName": "variation selector-1",
            "hex": "U+FE00",
            "bits": "1101 (13 / 0xD)",
            "desc": "Variation Selector-1"
          },
          {
            "charName": "variation selector-2",
            "hex": "U+FE01",
            "bits": "1110 (14 / 0xE)",
            "desc": "Variation Selector-2"
          },
          {
            "charName": "zero-width non-breaking space",
            "hex": "U+FEFF",
            "bits": "1111 (15 / 0xF)",
            "desc": "ZWNBSP / BOM"
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
