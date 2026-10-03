/**
 * @file legacy-matcher.js
 * @description Mechanical extraction of the legacy forensic signature matcher.
 * Preserves exact conditions, thresholds, positions, and reason codes without changes.
 */

(function (global) {
  'use strict';

  /**
   * Matches candidate observations against a legacy signatures registry array.
   *
   * @param {Array} candidateObservations - Observations that are not benign.
   * @param {string} text - Source text.
   * @param {Object} [snowData] - SNOW telemetry.
   * @param {Array} [registryOverride] - Optional registry override. Defaults to global STEGO_SIGNATURES_REGISTRY or StegSignatures.STEGO_SIGNATURES_REGISTRY.
   * @returns {Array<{ signature: Object, positions: Array<number>, reasonCode: string }>}
   */
  function matchSignaturesDetailed(candidateObservations, text, snowData, registryOverride) {
    const registry = registryOverride ||
      (global.StegSignatures && global.StegSignatures.STEGO_SIGNATURES_REGISTRY) ||
      global.STEGO_SIGNATURES_REGISTRY ||
      [];

    const nonBenign = candidateObservations || [];
    const foundSet = new Set(nonBenign.map(r => r.codePoint));
    const matches = [];

    for (let i = 0; i < registry.length; i++) {
      const sig = registry[i];

      // 1. SNOW / Whitespace signature
      if (sig.isSnow || sig.isWhitespace) {
        if (
          snowData &&
          snowData.snowDetected &&
          Array.isArray(snowData.tokens) &&
          snowData.tokens.length >= 2 &&
          Array.isArray(snowData.occurrences) &&
          snowData.occurrences.length >= 3 &&
          snowData.occurrences.some(o => o.codePoint === 0x0009)
        ) {
          const positions = snowData.occurrences.map(o => o.position);
          matches.push({
            signature: sig,
            positions,
            reasonCode: 'SNOW_PATTERN'
          });
        }
        continue;
      }

      // 2. StegoLines Variation Selector Scheme
      if (sig.isVariationSelectorScheme) {
        // Must require a leading contiguous orphan-VS prefix at start (position 0),
        // or contiguous orphan-VS sequence with length >= minCount.
        // Ordinary FE0F selectors after an emoji must NEVER match.
        const orphanVsObs = nonBenign.filter(o => {
          const cp = o.codePoint;
          const isVS = (cp >= 0xFE00 && cp <= 0xFE0F) || (cp >= 0xE0100 && cp <= 0xE01EF);
          return isVS && ((o.reasonCodes && o.reasonCodes.includes('ORPHAN_VS_RUN')) || o.isOrphanVs || o.position === 0);
        });

        const hasLeadingPrefix = orphanVsObs.some(o => o.position === 0);
        if (hasLeadingPrefix && orphanVsObs.length >= sig.minCount) {
          matches.push({
            signature: sig,
            positions: orphanVsObs.map(o => o.position),
            reasonCode: 'SIGNATURE_MATCH'
          });
        }
        continue;
      }

      // 3. Exact Symbol Tools / Research / Watermarks
      if (sig.exactSymbols) {
        const sigSet = new Set(sig.exactSymbols);
        const altSet = sig.altExactSymbols ? new Set(sig.altExactSymbols) : null;

        if (sig.isWatermark) {
          const matchingWatermark = nonBenign.filter(o => sigSet.has(o.codePoint));
          if (matchingWatermark.length >= sig.minCount) {
            matches.push({
              signature: sig,
              positions: matchingWatermark.map(o => o.position),
              reasonCode: 'SIGNATURE_MATCH'
            });
          }
          continue;
        }

        const hasAllPrimary = sig.exactSymbols.every(cp => foundSet.has(cp));
        const hasAllAlt = altSet ? sig.altExactSymbols.every(cp => foundSet.has(cp)) : false;

        if (hasAllPrimary || hasAllAlt) {
          const targetSet = hasAllPrimary ? sigSet : altSet;
          const matchingObs = nonBenign.filter(o => targetSet.has(o.codePoint));
          if (matchingObs.length >= sig.minCount) {
            matches.push({
              signature: sig,
              positions: matchingObs.map(o => o.position),
              reasonCode: 'SIGNATURE_MATCH'
            });
          }
        }
      }
    }

    return matches;
  }

  const MatcherAPI = Object.freeze({
    matchSignaturesDetailed
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MatcherAPI;
  } else {
    global.StegSignatures = global.StegSignatures || {};
    global.StegSignatures.Matcher = MatcherAPI;
    global.StegSignatures.matchSignaturesDetailed = matchSignaturesDetailed;
  }
})(typeof window !== 'undefined' ? window : globalThis);
