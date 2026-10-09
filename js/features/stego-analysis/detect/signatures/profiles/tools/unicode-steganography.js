/**
 * @file unicode-steganography.js
 * @description Steganalysis signature profile: Unicode Steganography with Zero-Width Characters (330k).
 */

(function (global) {
  'use strict';

  const profile = {
    schemaVersion: 1,
    id: 'tool.unicode_steganography',
    kind: 'tool',
    legacyIds: [
      'tool_unicode_steganography'
    ],
    identity: {
      name: 'Unicode Steganography with Zero-Width Characters',
      titleAr: 'أداة Unicode Steganography with Zero-Width Characters (330k)',
      titleEn: 'Unicode Steganography with Zero-Width Characters (330k)',
      url: 'https://330k.github.io/misc_tools/unicode_steganography.html',
      secondaryUrl: 'https://github.com/330k/misc_tools'
    },
    modes: [
      {
        id: 'default',
        legacyId: 'tool_unicode_steganography',
        enabled: true,
        carrierSignature: {
          matcherKind: 'legacy-exact-set',
          exactSymbols: [
            0x200C, // Zero Width Non-Joiner (ZWNJ)
            0x200D, // Zero Width Joiner (ZWJ)
            0x202C, // Pop Directional Formatting (PDF)
            0xFEFF  // Zero Width No-Break Space (ZWNBSP / BOM)
          ],
          alternateExactSymbols: [],
          minCount: 4,
          legacyFlags: {}
        },
        placementSignatures: {
          status: 'supplied',
          definitions: [
            {
              id: 'unicode-stego-330k-random-segment',
              enabled: true,
              source: {
                kind: 'source-code',
                reference: 'https://github.com/330k/misc_tools/tree/gh-pages',
                repositoryUrl: 'https://github.com/330k/misc_tools',
                locator: 'combine_shuffle_string()'
              },
              region: {
                value: 'whole',
                labelAr: 'كامل النص',
                labelEn: 'Whole text'
              },
              anchor: {
                value: 'before-after-segment',
                labelAr: 'قبل أو بعد كلمة/مقطع نصي، وقد يكون المقطع حرفًا واحدًا',
                labelEn: 'Before or after word/segment (segment can be a single character)'
              },
              scope: {
                value: 'whole-text',
                labelAr: 'كامل النص',
                labelEn: 'Whole text'
              },
              distribution: {
                value: 'random',
                labelAr: 'عشوائي',
                labelEn: 'Random'
              },
              descriptionAr: 'الأداة لا تضع الرموز بين أحرف الكلمة نفسها، بل تضع مجموعة الرموز المخفية قبل أو بعد مقطع نصي/كلمة عبر كامل النص بشكل عشوائي، وقد يكون المقطع أحيانًا حرفًا واحدًا فقط.',
              descriptionEn: 'The tool inserts hidden zero-width symbol sequences before or after words/segments (which may be a single character) randomly across the whole text.'
            }
          ]
        },
        presentation: {
          name: 'Unicode Steganography (330k)',
          titleAr: 'أداة Unicode Steganography with Zero-Width Characters (330k)',
          titleEn: 'Unicode Steganography with Zero-Width Characters (330k)',
          descriptionAr: 'أداة إخفاء نصوص مفتوحة المصدر تستخدم رموز بعرض صفري وتخزنها قبل أو بعد الكلمات والمقاطع النصية. المجموعة الافتراضية تعتمد 4 رموز (U+200C, U+200D, U+202C, U+FEFF)، مع إمكانية تخصيص الأبجدية من بين 10 رموز غير مرئية.',
          descriptionEn: 'Open-source zero-width text steganography tool embedding data before or after words/text segments. Default mode uses 4 symbols (U+200C, U+200D, U+202C, U+FEFF) with support for customizable 10-symbol alphabets.',
          encodingTableTitle: 'Default Mode — 4 symbols (Base 4 / 2 bits per symbol)',
          encodingTable: [
            {
              charName: 'Zero-Width Non-Joiner (ZWNJ)',
              hex: 'U+200C',
              bits: '00',
              desc: 'Digit 0 (Default)'
            },
            {
              charName: 'Zero-Width Joiner (ZWJ)',
              hex: 'U+200D',
              bits: '01',
              desc: 'Digit 1 (Default)'
            },
            {
              charName: 'Pop Directional Formatting (PDF)',
              hex: 'U+202C',
              bits: '10',
              desc: 'Digit 2 (Default)'
            },
            {
              charName: 'Zero-Width No-Break Space (ZWNBSP)',
              hex: 'U+FEFF',
              bits: '11',
              desc: 'Digit 3 (Default)'
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
