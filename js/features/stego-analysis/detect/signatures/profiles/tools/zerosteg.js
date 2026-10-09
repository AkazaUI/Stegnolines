/**
 * @file zerosteg.js
 * @description Steganalysis signature profile: ZeroSteg.
 */

(function (global) {
  'use strict';

  const profile = {
    schemaVersion: 1,
    id: 'tool.zerosteg',
    kind: 'tool',
    legacyIds: [
      'tool_zerosteg'
    ],
    identity: {
      name: 'ZeroSteg',
      titleAr: 'أداة ZeroSteg',
      titleEn: 'ZeroSteg',
      url: 'https://github.com/jasonkimprojects/zerosteg'
    },
    modes: [
      {
        id: 'default',
        legacyId: 'tool_zerosteg',
        enabled: true,
        carrierSignature: {
          matcherKind: 'legacy-exact-set',
          exactSymbols: [
            0x200C, // Zero Width Non-Joiner (0)
            0x200D  // Zero Width Joiner (1)
          ],
          alternateExactSymbols: [],
          minCount: 4,
          legacyFlags: {}
        },
        placementSignatures: {
          status: 'supplied',
          definitions: [
            {
              id: 'zerosteg-scattered',
              enabled: true,
              source: {
                kind: 'source-code',
                reference: 'https://github.com/jasonkimprojects/zerosteg'
              },
              region: {
                value: 'whole',
                labelAr: 'كامل النص',
                labelEn: 'Whole text'
              },
              anchor: {
                value: 'between-characters',
                labelAr: 'بين الأحرف / قبل الأحرف',
                labelEn: 'Between / before characters'
              },
              scope: {
                value: 'whole-text',
                labelAr: 'كامل النص',
                labelEn: 'Whole text'
              },
              distribution: {
                value: 'scattered',
                labelAr: 'عشوائي ومتفرق',
                labelEn: 'Scattered / random'
              },
              descriptionAr: 'يتم توزيع الرموز المخفية عشوائياً وتفريقها بين وقبل الأحرف عبر كامل النص.',
              descriptionEn: 'Hidden symbols are scattered randomly between/before characters across the whole text.'
            }
          ]
        },
        presentation: {
          name: 'ZeroSteg',
          titleAr: 'أداة ZeroSteg',
          titleEn: 'ZeroSteg',
          encodingTable: [
            {
              charName: 'Zero-Width Non-Joiner (ZWNJ)',
              hex: 'U+200C',
              bits: '0',
              desc: 'Bit 0 carrier'
            },
            {
              charName: 'Zero-Width Joiner (ZWJ)',
              hex: 'U+200D',
              bits: '1',
              desc: 'Bit 1 carrier'
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
