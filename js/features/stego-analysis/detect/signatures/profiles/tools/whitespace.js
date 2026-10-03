/**
 * @file whitespace.js
 * @description Steganalysis signature profile: Whitespace Steganography (SNOW Family Tools).
 */

(function (global) {
  'use strict';

  const profile = {
    schemaVersion: 1,
    id: 'technique.whitespace',
    kind: 'technique',
    legacyIds: [
      'technique_whitespace'
    ],
    identity: {
      name: 'Whitespace Steganography',
      titleAr: 'تقنية إخفاء البيانات بالفراغات (Whitespace Steganography)',
      titleEn: 'Whitespace Steganography (Tabs & Spaces)',
      descriptionAr: 'تقنية إخفاء وحقن بتات سرية بنهايات الأسطر بالاعتماد على التتابع المنطقي لمحارف المسافات والتابات (Trailing Whitespace).',
      descriptionEn: 'Steganography technique that conceals secret data at line endings using sequences of tabs and spaces.'
    },
    modes: [
      {
        id: 'default',
        legacyId: 'technique_whitespace',
        enabled: true,
        carrierSignature: {
          matcherKind: 'legacy-whitespace',
          minCount: 3,
          legacyFlags: {
            isSnow: true,
            isWhitespace: true
          }
        },
        placementSignatures: {
          status: 'pending',
          definitions: []
        },
        presentation: {
          name: 'Whitespace Steganography',
          titleAr: 'تقنية إخفاء البيانات بالفراغات (Whitespace Steganography)',
          titleEn: 'Whitespace Steganography (Tabs & Spaces)',
          descriptionAr: 'تقنية إخفاء وحقن بتات سرية بنهايات الأسطر بالاعتماد على التتابع المنطقي لمحارف المسافات والتابات (Trailing Whitespace).',
          descriptionEn: 'Steganography technique that conceals secret data at line endings using sequences of tabs and spaces.',
          candidateTools: [
            {
              name: 'SNOW (Matthew Kwan)',
              tag: 'الأصلية الكلاسيكية',
              tagEn: 'Classic Original',
              url: 'https://darkside.com.au/snow/',
              descAr: 'أداة SNOW الأصلية والأكثر شهرة المعتمدة على الترميز الثماني (Tab + من 0 إلى 7 مسافات = 3 بت لكل مجموعة).',
              descEn: 'The original and widely referenced tool using 3-bit octal encoding (Tab + 0 to 7 spaces).'
            },
            {
              name: 'snow2 (systemslibrarian)',
              tag: 'محدثة مفتوحة المصدر',
              tagEn: 'Modern Open-Source',
              url: 'https://github.com/systemslibrarian/snow2',
              descAr: 'تطوير حديث ومفتوح المصدر مستند إلى خوارزمية وبروتوكول SNOW مع تحسينات في التوافقية والأداء.',
              descEn: 'Modern open-source reimplementation of the SNOW whitespace steganography tool.'
            },
            {
              name: 'StegoToolkit Whitespace Hider',
              tag: 'أداة ويب تفاعلية',
              tagEn: 'Web App',
              url: 'https://stegotoolkit.com/steganography/whitespace-steganography-hider',
              descAr: 'أداة ويب سحابية حديثة تتيح إخفاء واستخراج النصوص المشفرة عبر توليد أنماط المسافات والتابات.',
              descEn: 'Interactive web-based utility for hiding and extracting secret text via whitespace and tab characters.'
            },
            {
              name: 'stegsnow (Debian / Linux)',
              tag: 'حزمة نظام سطر أوامر',
              tagEn: 'Linux CLI Package',
              url: 'https://manpages.debian.org/testing/stegsnow/stegsnow.1.en.html',
              descAr: 'حزمة أدوات سطر الأوامر الرسمية المتوفرة على توزيعات لينكس (Debian/Ubuntu/Kali) للفحص الجنائي.',
              descEn: 'Standard Linux package for trailing whitespace concealment in text files.'
            }
          ],
          encodingTable: [
            {
              charName: 'Tab',
              hex: 'U+0009',
              bits: '000 (0)',
              desc: 'Tab (0)'
            },
            {
              charName: 'Tab + 1 space',
              hex: 'U+0009 + 0x0020',
              bits: '001 (1)',
              desc: 'Tab + 1 space (1)'
            },
            {
              charName: 'Tab + 2 spaces',
              hex: 'U+0009 + 2x0x0020',
              bits: '010 (2)',
              desc: 'Tab + 2 spaces (2)'
            },
            {
              charName: 'Tab + 3 spaces',
              hex: 'U+0009 + 3x0x0020',
              bits: '011 (3)',
              desc: 'Tab + 3 spaces (3)'
            },
            {
              charName: 'Tab + 4 spaces',
              hex: 'U+0009 + 4x0x0020',
              bits: '100 (4)',
              desc: 'Tab + 4 spaces (4)'
            },
            {
              charName: 'Tab + 5 spaces',
              hex: 'U+0009 + 5x0x0020',
              bits: '101 (5)',
              desc: 'Tab + 5 spaces (5)'
            },
            {
              charName: 'Tab + 6 spaces',
              hex: 'U+0009 + 6x0x0020',
              bits: '110 (6)',
              desc: 'Tab + 6 spaces (6)'
            },
            {
              charName: 'Tab + 7 spaces',
              hex: 'U+0009 + 7x0x0020',
              bits: '111 (7)',
              desc: 'Tab + 7 spaces (7)'
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
