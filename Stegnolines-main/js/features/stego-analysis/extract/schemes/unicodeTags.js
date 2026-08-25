/**
 * @file unicodeTags.js
 * @description Unicode TAG Block (U+E0000–U+E007F) steganography decoder.
 * Compatible with classic script tags and module exports.
 */

(function (global) {
  'use strict';

  function isUnicodeTag(cp) {
    const carriers = global.StegCarriers || {};
    return carriers.isUnicodeTag ? carriers.isUnicodeTag(cp) : (cp >= 0xE0000 && cp <= 0xE007F);
  }

  const unicodeTagsScheme = {
    id: 'unicodeTags',
    label: 'Unicode TAG Block Channel',

    canApply(profile) {
      return profile.occurrences.some(o => isUnicodeTag(o.codePoint));
    },

    decode(carrierSeq, profile) {
      const tagBytes = [];

      for (const occ of carrierSeq) {
        if (isUnicodeTag(occ.codePoint)) {
          if (occ.codePoint !== 0xE007F) {
            tagBytes.push(occ.codePoint - 0xE0000);
          }
        }
      }

      if (tagBytes.length === 0) return [];

      const rawBytes = new Uint8Array(tagBytes);
      let text = '';
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(rawBytes);
      } catch {
        text = String.fromCharCode(...tagBytes);
      }

      return [{
        schemeId: 'unicodeTags',
        label: 'Unicode TAG Block Channel',
        bytes: rawBytes,
        text: text,
        confidence: 100,
        notes: `Directly mapped ${tagBytes.length} TAG characters (U+E0000–U+E007F) to ASCII.`
      }];
    }
  };

  global.StegSchemes = global.StegSchemes || {};
  global.StegSchemes.unicodeTags = unicodeTagsScheme;

  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = { unicodeTagsScheme };
  }
})(typeof window !== 'undefined' ? window : this);
