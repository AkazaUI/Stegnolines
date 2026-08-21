/**
 * @file variationSel.js
 * @description Direct Variation Selector byte decoder (U+FE00–FE0F / U+E0100–E01EF).
 * Compatible with classic script tags and module exports.
 */

(function (global) {
  'use strict';

  function isVariationSelector(cp) {
    const carriers = global.StegCarriers || {};
    return carriers.isVariationSelector ? carriers.isVariationSelector(cp) : ((cp >= 0xFE00 && cp <= 0xFE0F) || (cp >= 0xE0100 && cp <= 0xE01EF));
  }

  const variationSelScheme = {
    id: 'variationSel',
    label: 'Variation Selector Direct Byte Channel',

    canApply(profile) {
      return profile.occurrences.some(o => isVariationSelector(o.codePoint));
    },

    decode(carrierSeq, profile) {
      const bytes = [];

      for (const occ of carrierSeq) {
        const cp = occ.codePoint;
        if (cp >= 0xFE00 && cp <= 0xFE0F) {
          bytes.push(cp - 0xFE00);
        } else if (cp >= 0xE0100 && cp <= 0xE01EF) {
          bytes.push(cp - 0xE0100 + 16);
        } else if (cp >= 0x180B && cp <= 0x180F) {
          bytes.push(cp - 0x180B);
        }
      }

      if (bytes.length === 0) return [];

      const rawBytes = new Uint8Array(bytes);
      let asciiMsbCount = 0;
      for (let b of bytes) if ((b & 0x80) === 0) asciiMsbCount++;
      const ratio = asciiMsbCount / bytes.length;

      let text = '';
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(rawBytes);
      } catch {
        text = String.fromCharCode(...bytes);
      }

      return [{
        schemeId: 'variationSel',
        label: 'Variation Selector Direct Byte Channel',
        bytes: rawBytes,
        text: text,
        confidence: Math.round(ratio * 95),
        notes: `Extracted ${bytes.length} bytes directly from variation selector code points.`
      }];
    }
  };

  global.StegSchemes = global.StegSchemes || {};
  global.StegSchemes.variationSel = variationSelScheme;

  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = { variationSelScheme };
  }
})(typeof window !== 'undefined' ? window : this);
