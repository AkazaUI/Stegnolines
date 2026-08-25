/**
 * @file positional.js
 * @description Positional presence/absence carrier scheme decoder at word boundaries.
 * Compatible with classic script tags and module exports.
 */

(function (global) {
  'use strict';

  const positionalScheme = {
    id: 'positional',
    label: 'Positional Word-Boundary Carrier Channel',

    canApply(profile) {
      return profile.suspectCarrierCount >= 8;
    },

    decode(carrierSeq, profile) {
      const suspectSeq = carrierSeq.filter(o => o.legitimacy === 'suspect');
      if (suspectSeq.length < 8) return [];

      const suspectPositions = new Set(suspectSeq.map(o => o.position));

      const bits = [];
      const minPos = Math.min(...suspectPositions);
      const maxPos = Math.max(...suspectPositions);

      for (let pos = minPos; pos <= maxPos; pos++) {
        bits.push(suspectPositions.has(pos) ? 1 : 0);
      }

      if (bits.length < 8) return [];

      const bytes = [];
      for (let i = 0; i + 8 <= bits.length; i += 8) {
        let b = 0;
        for (let bit = 0; bit < 8; bit++) {
          b = (b << 1) | bits[i + bit];
        }
        bytes.push(b);
      }

      if (bytes.length === 0) return [];

      const rawBytes = new Uint8Array(bytes);
      let asciiCount = 0;
      for (let b of bytes) if ((b & 0x80) === 0) asciiCount++;
      const ratio = asciiCount / bytes.length;

      let text = '';
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(rawBytes);
      } catch {
        text = String.fromCharCode(...bytes);
      }

      return [{
        schemeId: 'positional',
        label: 'Positional Word-Boundary Channel',
        bytes: rawBytes,
        text: text,
        confidence: Math.round(ratio * 80),
        notes: `Extracted ${bytes.length} bytes from positional presence/absence stream.`
      }];
    }
  };

  global.StegSchemes = global.StegSchemes || {};
  global.StegSchemes.positional = positionalScheme;

  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = { positionalScheme };
  }
})(typeof window !== 'undefined' ? window : this);
