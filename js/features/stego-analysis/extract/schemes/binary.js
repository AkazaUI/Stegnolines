/**
 * @file binary.js
 * @description Generic 2-symbol binary carrier scheme decoder with length & coverage weighting.
 * Compatible with classic script tags and module exports.
 */

(function (global) {
  'use strict';

  function scorePrintableText(bytes) {
    if (!bytes || bytes.length === 0) return 0;
    let alphaCount = 0;
    let spaceCount = 0;
    let weirdCount = 0;

    for (const b of bytes) {
      if ((b >= 65 && b <= 90) || (b >= 97 && b <= 122) || (b >= 0x0600 && b <= 0x06FF) || (b >= 48 && b <= 57)) {
        alphaCount++;
      } else if (b === 32 || b === 10 || b === 13 || b === 9) {
        spaceCount++;
      } else if (b >= 33 && b <= 126) {
        weirdCount++;
      }
    }
    const len = bytes.length;
    const score = ((alphaCount + spaceCount) / len) - ((weirdCount / len) * 0.5);
    return Math.max(0, score);
  }

  const binaryScheme = {
    id: 'binary',
    label: 'Generic 2-Symbol Binary Carrier',

    canApply(profile) {
      if (profile.suspectCarrierCount < 8) return false;
      const distinctSuspectCps = new Set(profile.suspectOccurrences.map(o => o.codePoint));
      return distinctSuspectCps.size >= 2;
    },

    decode(carrierSeq, profile) {
      const candidates = [];
      const suspectSeq = carrierSeq.filter(o => o.legitimacy === 'suspect');
      if (suspectSeq.length < 8) return [];

      const freqs = new Map();
      for (const occ of suspectSeq) {
        freqs.set(occ.codePoint, (freqs.get(occ.codePoint) || 0) + 1);
      }
      const sortedCps = Array.from(freqs.keys()).sort((a, b) => freqs.get(b) - freqs.get(a));
      const cpA = sortedCps[0];
      const cpB = sortedCps[1];

      const cpAInfo = suspectSeq.find(o => o.codePoint === cpA)?.info.abbr || `U+${cpA.toString(16)}`;
      const cpBInfo = suspectSeq.find(o => o.codePoint === cpB)?.info.abbr || `U+${cpB.toString(16)}`;

      const mappings = [
        { name: `${cpAInfo}=0, ${cpBInfo}=1`, zeroCp: cpA, oneCp: cpB },
        { name: `${cpAInfo}=1, ${cpBInfo}=0`, zeroCp: cpB, oneCp: cpA }
      ];

      const bitOrders = [
        { name: 'MSB-first', lsb: false },
        { name: 'LSB-first', lsb: true }
      ];

      for (const mapConfig of mappings) {
        const bits = [];
        for (const occ of suspectSeq) {
          if (occ.codePoint === mapConfig.zeroCp) {
            bits.push(0);
          } else if (occ.codePoint === mapConfig.oneCp) {
            bits.push(1);
          }
        }

        if (bits.length < 8) continue;

        for (const orderConfig of bitOrders) {
          for (let offset = 0; offset < Math.min(8, bits.length - 7); offset++) {
            const bytes = [];
            for (let i = offset; i + 8 <= bits.length; i += 8) {
              let byteVal = 0;
              for (let b = 0; b < 8; b++) {
                const bit = bits[i + (orderConfig.lsb ? (7 - b) : b)];
                byteVal = (byteVal << 1) | bit;
              }
              bytes.push(byteVal);
            }

            if (bytes.length === 0) continue;

            const rawBytes = new Uint8Array(bytes);
            let text = '';
            try {
              text = new TextDecoder('utf-8', { fatal: true }).decode(rawBytes);
            } catch {
              text = String.fromCharCode(...bytes);
            }

            const printableRatio = scorePrintableText(bytes);
            const coverageRatio = (bytes.length * 8) / bits.length;
            const lengthBonus = Math.min(bytes.length / 10, 1.0);

            const confidence = Math.round((printableRatio * 50) + (coverageRatio * 30) + (lengthBonus * 20));

            candidates.push({
              schemeId: 'binary',
              label: `Binary (${mapConfig.name}, ${orderConfig.name}, offset ${offset})`,
              bytes: rawBytes,
              text: text,
              confidence: confidence,
              notes: `Extracted ${bytes.length} bytes (${(coverageRatio * 100).toFixed(0)}% stream coverage, ${(printableRatio * 100).toFixed(0)}% printable).`
            });
          }
        }
      }

      candidates.sort((a, b) => {
        if (b.confidence !== a.confidence) return b.confidence - a.confidence;
        return b.bytes.length - a.bytes.length;
      });

      return candidates.slice(0, 5);
    }
  };

  global.StegSchemes = global.StegSchemes || {};
  global.StegSchemes.binary = binaryScheme;

  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = { binaryScheme };
  }
})(typeof window !== 'undefined' ? window : this);
