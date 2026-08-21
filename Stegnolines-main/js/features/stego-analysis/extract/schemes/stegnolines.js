/**
 * @file stegnolines.js
 * @description Stegnolines native Variation Selector scheme decoder.
 * Compatible with classic script tags and module exports.
 */

(function (global) {
  'use strict';

  const stegnolinesScheme = {
    id: 'stegnolines',
    label: 'Stegnolines Native VS Scheme',

    canApply(profile) {
      return profile.suspectOccurrences.some(occ =>
        (occ.codePoint >= 0xFE00 && occ.codePoint <= 0xFE0F) ||
        (occ.codePoint >= 0xE0100 && occ.codePoint <= 0xE01EF)
      );
    },

    decode(carrierSeq, profile) {
      const vsBytes = [];

      for (const occ of carrierSeq) {
        const cp = occ.codePoint;
        if (cp >= 0xFE00 && cp <= 0xFE0F) {
          vsBytes.push(cp - 0xFE00);
        } else if (cp >= 0xE0100 && cp <= 0xE01EF) {
          vsBytes.push(cp - 0xE0100 + 16);
        }
      }

      if (vsBytes.length === 0) return [];

      const rawBytes = new Uint8Array(vsBytes);
      let decodedText = '';
      try {
        decodedText = new TextDecoder('utf-8', { fatal: true }).decode(rawBytes);
      } catch {
        decodedText = String.fromCharCode(...vsBytes);
      }

      return [{
        schemeId: 'stegnolines',
        label: 'Stegnolines Native VS Scheme',
        bytes: rawBytes,
        text: decodedText,
        confidence: 90,
        notes: `Extracted ${vsBytes.length} bytes from Variation Selector stream (U+FE00–U+FE0F & U+E0100–U+E01EF).`
      }];
    }
  };

  global.StegSchemes = global.StegSchemes || {};
  global.StegSchemes.stegnolines = stegnolinesScheme;

  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = { stegnolinesScheme };
  }
})(typeof window !== 'undefined' ? window : this);
