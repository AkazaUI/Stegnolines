/**
 * @file baseN.js
 * @description Base-4 (2 bits/symbol) and Base-8 (3 bits/symbol) carrier scheme decoder.
 * Compatible with classic script tags and module exports.
 */

(function (global) {
  'use strict';

  const baseNScheme = {
    id: 'baseN',
    label: 'Base-N Multi-Symbol Carrier',

    canApply(profile) {
      if (profile.suspectCarrierCount < 4) return false;
      const distinctSuspectCps = new Set(profile.suspectOccurrences.map(o => o.codePoint));
      return distinctSuspectCps.size >= 3 && distinctSuspectCps.size <= 8;
    },

    decode(carrierSeq, profile) {
      const candidates = [];
      const suspectSeq = carrierSeq.filter(o => o.legitimacy === 'suspect');
      const freqs = new Map();
      for (const occ of suspectSeq) {
        freqs.set(occ.codePoint, (freqs.get(occ.codePoint) || 0) + 1);
      }

      const sortedCps = Array.from(freqs.keys()).sort((a, b) => freqs.get(b) - freqs.get(a));

      if (sortedCps.length >= 4) {
        const cps4 = sortedCps.slice(0, 4);
        const symbolMap = new Map();
        cps4.forEach((cp, val) => symbolMap.set(cp, val));

        const bitStream = [];
        for (const occ of suspectSeq) {
          if (symbolMap.has(occ.codePoint)) {
            const val = symbolMap.get(occ.codePoint);
            bitStream.push((val >> 1) & 1);
            bitStream.push(val & 1);
          }
        }

        if (bitStream.length >= 8) {
          const bytes = [];
          for (let i = 0; i + 8 <= bitStream.length; i += 8) {
            let b = 0;
            for (let bit = 0; bit < 8; bit++) {
              b = (b << 1) | bitStream[i + bit];
            }
            bytes.push(b);
          }

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

          candidates.push({
            schemeId: 'baseN',
            label: 'Base-4 (2 bits/symbol)',
            bytes: rawBytes,
            text: text,
            confidence: Math.round(ratio * 100),
            notes: `Decoded ${bytes.length} bytes using 4 carrier symbols.`
          });
        }
      }

      if (sortedCps.length >= 8) {
        const cps8 = sortedCps.slice(0, 8);
        const symbolMap = new Map();
        cps8.forEach((cp, val) => symbolMap.set(cp, val));

        const bitStream = [];
        for (const occ of suspectSeq) {
          if (symbolMap.has(occ.codePoint)) {
            const val = symbolMap.get(occ.codePoint);
            bitStream.push((val >> 2) & 1);
            bitStream.push((val >> 1) & 1);
            bitStream.push(val & 1);
          }
        }

        if (bitStream.length >= 8) {
          const bytes = [];
          for (let i = 0; i + 8 <= bitStream.length; i += 8) {
            let b = 0;
            for (let bit = 0; bit < 8; bit++) {
              b = (b << 1) | bitStream[i + bit];
            }
            bytes.push(b);
          }

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

          candidates.push({
            schemeId: 'baseN',
            label: 'Base-8 (3 bits/symbol)',
            bytes: rawBytes,
            text: text,
            confidence: Math.round(ratio * 100),
            notes: `Decoded ${bytes.length} bytes using 8 carrier symbols.`
          });
        }
      }

      return candidates;
    }
  };

  global.StegSchemes = global.StegSchemes || {};
  global.StegSchemes.baseN = baseNScheme;

  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = { baseNScheme };
  }
})(typeof window !== 'undefined' ? window : this);
