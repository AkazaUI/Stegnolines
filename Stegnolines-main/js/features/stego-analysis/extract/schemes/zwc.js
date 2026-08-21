/**
 * @file zwc.js
 * @description Universal Zero-Width Character (ZWC) steganography decoder.
 * Supports steganography.js (Korevec 4-symbol ZWC), Base-4 dibits, 2-symbol binary ZWC, 7-bit ASCII, and delimiter-framed payloads.
 * Compatible with classic script tags and module exports.
 */

(function (global) {
  'use strict';

  const ZWC_CODEPOINTS = new Set([
    0x200B, // ZWSP
    0x200C, // ZWNJ
    0x200D, // ZWJ
    0xFEFF, // ZWNBSP / BOM
    0x200E, // LRM
    0x200F, // RLM
    0x2060, // WJ
    0x00AD  // SHY
  ]);

  function isZwc(cp) {
    return ZWC_CODEPOINTS.has(cp);
  }

  function getZwcSeq(carrierSeq) {
    return carrierSeq.filter(o => isZwc(o.codePoint));
  }

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
    const score = ((alphaCount + spaceCount) / len) - ((weirdCount / len) * 0.6);
    return Math.max(0, score);
  }

  const zwcScheme = {
    id: 'zwc',
    label: 'Universal Zero-Width Character (ZWC) Engine',

    canApply(profile) {
      const zwcCount = profile.occurrences.filter(o => isZwc(o.codePoint)).length;
      return zwcCount >= 7;
    },

    decode(carrierSeq, profile) {
      const candidates = [];
      const zwcSeq = getZwcSeq(carrierSeq);
      if (zwcSeq.length < 7) return [];

      const cps = zwcSeq.map(o => o.codePoint);
      const uniqueCps = Array.from(new Set(cps)).sort((a, b) => a - b);

      // --- Strategy 1: Canonical steganography.js (Korevec 4-symbol ZWC) ---
      const korevecMap = new Map([
        [0x200B, 0], // ZWSP -> 00
        [0x200C, 1], // ZWNJ -> 01
        [0x200D, 2], // ZWJ  -> 10
        [0xFEFF, 3]  // ZWNBSP -> 11
      ]);

      const korevecBits = [];
      for (const cp of cps) {
        if (korevecMap.has(cp)) {
          const val = korevecMap.get(cp);
          korevecBits.push((val >> 1) & 1);
          korevecBits.push(val & 1);
        }
      }

      if (korevecBits.length >= 8) {
        for (const lsb of [false, true]) {
          for (let offset = 0; offset < Math.min(8, korevecBits.length - 7); offset++) {
            const bytes = [];
            for (let i = offset; i + 8 <= korevecBits.length; i += 8) {
              let byteVal = 0;
              for (let b = 0; b < 8; b++) {
                const bit = korevecBits[i + (lsb ? (7 - b) : b)];
                byteVal = (byteVal << 1) | bit;
              }
              bytes.push(byteVal);
            }
            if (bytes.length < 1) continue;
            const rawBytes = new Uint8Array(bytes);
            const printableRatio = scorePrintableText(bytes);
            const coverageRatio = (bytes.length * 8) / korevecBits.length;
            const lengthBonus = Math.min(bytes.length / 10, 1.0);

            if (printableRatio >= 0.6) {
              let text = '';
              try { text = new TextDecoder('utf-8', { fatal: true }).decode(rawBytes); } catch { text = String.fromCharCode(...bytes); }
              if (text.trim().length > 0) {
                const confidence = Math.round((printableRatio * 50) + (coverageRatio * 30) + (lengthBonus * 20));
                candidates.push({
                  schemeId: 'zwc',
                  label: `steganography.js ZWC (${lsb ? 'LSB' : 'MSB'}, offset ${offset})`,
                  bytes: rawBytes,
                  text: text,
                  confidence: confidence,
                  notes: `Decoded ${bytes.length} bytes using canonical steganography.js 4-symbol ZWC channel.`
                });
              }
            }
          }
        }
      }

      // --- Strategy 2: Base-4 Dibit Permutations (Sorted unique symbols) ---
      if (uniqueCps.length >= 2) {
        const symbols = uniqueCps.slice(0, 4);
        const permute = (arr) => {
          if (arr.length <= 1) return [arr];
          const res = [];
          for (let i = 0; i < arr.length; i++) {
            const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
            for (const p of permute(rest)) {
              res.push([arr[i], ...p]);
            }
          }
          return res;
        };

        const perms = permute([0, 1, 2, 3].slice(0, symbols.length));

        for (const p of perms) {
          const map = new Map();
          symbols.forEach((cp, idx) => map.set(cp, p[idx]));

          const bits = [];
          const bitsPerSymbol = symbols.length > 2 ? 2 : 1;

          for (const cp of cps) {
            if (map.has(cp)) {
              const val = map.get(cp);
              if (bitsPerSymbol === 2) {
                bits.push((val >> 1) & 1);
                bits.push(val & 1);
              } else {
                bits.push(val & 1);
              }
            }
          }

          for (const lsb of [false, true]) {
            for (let offset = 0; offset < Math.min(8, bits.length - 7); offset++) {
              const bytes = [];
              for (let i = offset; i + 8 <= bits.length; i += 8) {
                let byteVal = 0;
                for (let b = 0; b < 8; b++) {
                  const bit = bits[i + (lsb ? (7 - b) : b)];
                  byteVal = (byteVal << 1) | bit;
                }
                bytes.push(byteVal);
              }

              if (bytes.length < 1) continue;

              const rawBytes = new Uint8Array(bytes);
              const printableRatio = scorePrintableText(bytes);
              const coverageRatio = (bytes.length * 8) / bits.length;
              const lengthBonus = Math.min(bytes.length / 10, 1.0);

              if (printableRatio >= 0.6) {
                let text = '';
                try {
                  text = new TextDecoder('utf-8', { fatal: true }).decode(rawBytes);
                } catch {
                  text = String.fromCharCode(...bytes);
                }

                if (text.trim().length > 0) {
                  const confidence = Math.round((printableRatio * 50) + (coverageRatio * 30) + (lengthBonus * 20));
                  candidates.push({
                    schemeId: 'zwc',
                    label: `ZWC Base-${Math.pow(2, bitsPerSymbol)} (${symbols.length} symbols, ${lsb ? 'LSB' : 'MSB'}, offset ${offset})`,
                    bytes: rawBytes,
                    text: text,
                    confidence: confidence,
                    notes: `Decoded ${bytes.length} bytes from ZWC stream (${(coverageRatio * 100).toFixed(0)}% coverage).`
                  });
                }
              }
            }
          }
        }
      }

      // --- Strategy 3: 7-Bit ASCII ZWC ---
      if (uniqueCps.length >= 2) {
        const primaryZero = uniqueCps[0];
        const primaryOne = uniqueCps[1];

        const bits = [];
        for (const cp of cps) {
          if (cp === primaryZero) bits.push(0);
          else if (cp === primaryOne) bits.push(1);
        }

        if (bits.length >= 7) {
          for (let offset = 0; offset < Math.min(7, bits.length - 6); offset++) {
            const bytes = [];
            for (let i = offset; i + 7 <= bits.length; i += 7) {
              let byteVal = 0;
              for (let b = 0; b < 7; b++) {
                byteVal = (byteVal << 1) | bits[i + b];
              }
              bytes.push(byteVal);
            }

            if (bytes.length < 1) continue;
            const rawBytes = new Uint8Array(bytes);
            const printableRatio = scorePrintableText(bytes);
            const coverageRatio = (bytes.length * 7) / bits.length;
            const lengthBonus = Math.min(bytes.length / 10, 1.0);

            if (printableRatio >= 0.7) {
              let text = String.fromCharCode(...bytes);
              const confidence = Math.round((printableRatio * 50) + (coverageRatio * 30) + (lengthBonus * 20));
              candidates.push({
                schemeId: 'zwc',
                label: `ZWC 7-Bit ASCII (offset ${offset})`,
                bytes: rawBytes,
                text: text,
                confidence: confidence,
                notes: `Decoded ${bytes.length} 7-bit ASCII characters.`
              });
            }
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
  global.StegSchemes.zwc = zwcScheme;

  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = { zwcScheme };
  }
})(typeof window !== 'undefined' ? window : this);
