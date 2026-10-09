/**
 * @file stegzero.js
 * @description Steganalysis signature profile: StegZero (Standard 3-bit & Compatibility 1-bit Modes).
 */

(function (global) {
  'use strict';

  const profile = {
    schemaVersion: 1,
    id: 'tool.stegzero',
    kind: 'tool',
    legacyIds: [
      'tool_stegzero_3bit',
      'tool_stegzero_1bit'
    ],
    identity: {
      name: 'StegZero',
      titleAr: 'أداة StegZero',
      titleEn: 'StegZero',
      url: 'https://stegzero.com/',
      repoUrl: 'https://github.com/Clevis22/StegZero'
    },
    modes: [
      {
        id: '3bit',
        legacyId: 'tool_stegzero_3bit',
        enabled: true,
        carrierSignature: {
          matcherKind: 'legacy-exact-set',
          exactSymbols: [
            0x200B, // Zero Width Space (000)
            0x200C, // Zero Width Non-Joiner (001)
            0x200D, // Zero Width Joiner (010)
            0x2060, // Word Joiner (011)
            0x2062, // Invisible Times (100)
            0x2063, // Invisible Separator (101)
            0x2064, // Invisible Plus (110)
            0xFEFF  // Zero Width No-Break Space / BOM (111)
          ],
          alternateExactSymbols: [],
          minCount: 4,
          legacyFlags: {}
        },
        placementSignatures: {
          status: 'supplied',
          definitions: [
            {
              id: 'stegzero-standard-interleave',
              enabled: true,
              source: {
                kind: 'source-code',
                reference: 'https://github.com/Clevis22/StegZero/blob/main/stegzero-protocol.js',
                repositoryUrl: 'https://github.com/Clevis22/StegZero',
                locator: 'interleavePayload()'
              },
              region: {
                value: 'whole',
                labelAr: 'كامل النص',
                labelEn: 'Whole text'
              },
              anchor: {
                value: 'after',
                labelAr: 'بعد الأحرف',
                labelEn: 'After visible characters'
              },
              scope: {
                value: 'whole-text',
                labelAr: 'كامل النص',
                labelEn: 'Whole text'
              },
              distribution: {
                value: 'regular',
                labelAr: 'منتظم',
                labelEn: 'Regular'
              },
              descriptionAr: 'يتم توزيع الحمولة المخفية بالتتابع بعد كل حرف ظاهر بالتساوي قدر الإمكان عبر كامل النص عبر دالة interleavePayload، وليست كتلة في البداية أو النهاية.',
              descriptionEn: 'Hidden payload is interleaved sequentially and evenly across the entire text after visible characters via interleavePayload.'
            }
          ]
        },
        presentation: {
          name: 'StegZero (1. Standard Mode — 3 bits/symbol)',
          titleAr: 'أداة StegZero (1. Standard Mode — 3 bits/symbol)',
          titleEn: 'StegZero (1. Standard Mode — 3 bits/symbol)',
          encodingTableTitle: '1. Standard Mode — 3 bits/symbol',
          encodingTable: [
            {
              charName: 'Zero-Width Space (ZWSP)',
              hex: 'U+200B',
              bits: '000',
              desc: 'Zero-Width Space'
            },
            {
              charName: 'Zero-Width Non-Joiner (ZWNJ)',
              hex: 'U+200C',
              bits: '001',
              desc: 'Zero-Width Non-Joiner'
            },
            {
              charName: 'Zero-Width Joiner (ZWJ)',
              hex: 'U+200D',
              bits: '010',
              desc: 'Zero-Width Joiner'
            },
            {
              charName: 'Word Joiner (WJ)',
              hex: 'U+2060',
              bits: '011',
              desc: 'Word Joiner'
            },
            {
              charName: 'Invisible Times',
              hex: 'U+2062',
              bits: '100',
              desc: 'Invisible Times'
            },
            {
              charName: 'Invisible Separator',
              hex: 'U+2063',
              bits: '101',
              desc: 'Invisible Separator'
            },
            {
              charName: 'Invisible Plus',
              hex: 'U+2064',
              bits: '110',
              desc: 'Invisible Plus'
            },
            {
              charName: 'Zero-Width No-Break Space / BOM',
              hex: 'U+FEFF',
              bits: '111',
              desc: 'ZWNBS / BOM'
            }
          ]
        }
      },
      {
        id: '1bit',
        legacyId: 'tool_stegzero_1bit',
        enabled: true,
        carrierSignature: {
          matcherKind: 'legacy-exact-set',
          exactSymbols: [
            0x200B, // Zero-Width Space (0)
            0x200C  // Zero-Width Non-Joiner (1)
          ],
          alternateExactSymbols: [],
          minCount: 4,
          legacyFlags: {}
        },
        placementSignatures: {
          status: 'supplied',
          definitions: [
            {
              id: 'stegzero-compat-interleave',
              enabled: true,
              source: {
                kind: 'source-code',
                reference: 'https://github.com/Clevis22/StegZero/blob/main/stegzero-protocol.js',
                repositoryUrl: 'https://github.com/Clevis22/StegZero',
                locator: 'interleavePayload()'
              },
              region: {
                value: 'whole',
                labelAr: 'كامل النص',
                labelEn: 'Whole text'
              },
              anchor: {
                value: 'after',
                labelAr: 'بعد الأحرف',
                labelEn: 'After visible characters'
              },
              scope: {
                value: 'whole-text',
                labelAr: 'كامل النص',
                labelEn: 'Whole text'
              },
              distribution: {
                value: 'regular',
                labelAr: 'منتظم',
                labelEn: 'Regular'
              },
              descriptionAr: 'يتم توزيع الحمولة المخفية بالتتابع بعد كل حرف ظاهر بالتساوي قدر الإمكان عبر كامل النص عبر دالة interleavePayload، وليست كتلة في البداية أو النهاية.',
              descriptionEn: 'Hidden payload is interleaved sequentially and evenly across the entire text after visible characters via interleavePayload.'
            }
          ]
        },
        presentation: {
          name: 'StegZero (2. Compatibility Mode — 1 bit/symbol)',
          titleAr: 'أداة StegZero (2. Compatibility Mode — 1 bit/symbol)',
          titleEn: 'StegZero (2. Compatibility Mode — 1 bit/symbol)',
          encodingTableTitle: '2. Compatibility Mode — 1 bit/symbol',
          encodingTable: [
            {
              charName: 'Zero-Width Space (ZWSP)',
              hex: 'U+200B',
              bits: '0',
              desc: 'Zero-Width Space'
            },
            {
              charName: 'Zero-Width Non-Joiner (ZWNJ)',
              hex: 'U+200C',
              bits: '1',
              desc: 'Zero-Width Non-Joiner'
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
