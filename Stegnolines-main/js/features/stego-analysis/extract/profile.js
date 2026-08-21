/**
 * @file profile.js
 * @description Analyzes text to compute carrier metrics, histograms, gap distributions, entropy, and legitimacy classifications.
 * Compatible with classic script tags and module exports.
 */

(function (global) {
  'use strict';

  function getCarriersModule() {
    return global.StegCarriers || {};
  }

  function isArabicLetter(cp) {
    return (
      (cp >= 0x0600 && cp <= 0x06FF) ||
      (cp >= 0x0750 && cp <= 0x077F) ||
      (cp >= 0x08A0 && cp <= 0x08FF) ||
      (cp >= 0xFB50 && cp <= 0xFDFF) ||
      (cp >= 0xFE70 && cp <= 0xFEFF)
    );
  }

  function isDevanagariLetter(cp) {
    return cp >= 0x0900 && cp <= 0x097F;
  }

  function isJoinerScriptLetter(cp) {
    return isArabicLetter(cp) || isDevanagariLetter(cp);
  }

  function isEmojiRelated(cp) {
    return (
      (cp >= 0x1F300 && cp <= 0x1F9FF) ||
      (cp >= 0x1F600 && cp <= 0x1F64F) ||
      (cp >= 0x1F680 && cp <= 0x1F6FF) ||
      (cp >= 0x2600 && cp <= 0x27BF) ||
      (cp >= 0x1F1E6 && cp <= 0x1F1FF) ||
      (cp >= 0x1F900 && cp <= 0x1F9FF) ||
      (cp >= 0x1FA70 && cp <= 0x1FAFF) ||
      cp === 0xFE0F || cp === 0xFE0E
    );
  }

  function profileText(text) {
    const carriers = getCarriersModule();
    const getCarrierInfo = carriers.getCarrierInfo || function() { return null; };
    const isUnicodeTag = carriers.isUnicodeTag || function() { return false; };

    const codePoints = Array.from(text).map(c => c.codePointAt(0));
    const n = codePoints.length;

    const occurrences = [];
    const histogram = new Map();

    for (let i = 0; i < n; i++) {
      const cp = codePoints[i];
      const info = getCarrierInfo(cp);

      if (info) {
        let legitimacy = 'suspect';
        let reason = 'Suspicious carrier placement';

        const prevCp = i > 0 ? codePoints[i - 1] : null;
        const nextCp = i < n - 1 ? codePoints[i + 1] : null;

        if (cp === 0xFEFF && i === 0 && (n === 1 || codePoints[1] !== 0xFEFF)) {
          legitimacy = 'legitimate';
          reason = 'Standard Unicode Byte Order Mark at text start';
        } else if ((cp === 0x200C || cp === 0x200D) && prevCp && nextCp && isJoinerScriptLetter(prevCp) && isJoinerScriptLetter(nextCp)) {
          legitimacy = 'legitimate';
          reason = 'Natural cursive joiner between script characters';
        } else if ((cp === 0x200D || cp === 0xFE0F) && ((prevCp && isEmojiRelated(prevCp)) || (nextCp && isEmojiRelated(nextCp)))) {
          legitimacy = 'legitimate';
          reason = 'Standard Emoji ZWJ / Variation Selector sequence';
        } else if (isUnicodeTag(cp)) {
          legitimacy = 'suspect';
          reason = 'Unicode Tag character (potential hidden payload)';
        }

        occurrences.push({
          codePoint: cp,
          position: i,
          info,
          legitimacy,
          reason
        });

        histogram.set(cp, (histogram.get(cp) || 0) + 1);
      }
    }

    const suspectOccurrences = occurrences.filter(o => o.legitimacy === 'suspect');
    const suspectCarrierCount = suspectOccurrences.length;
    const legitimateCarrierCount = occurrences.length - suspectCarrierCount;

    let longestConsecutiveRun = 0;
    let currentRun = 0;
    let prevPos = -2;

    for (const occ of suspectOccurrences) {
      if (occ.position === prevPos + 1) {
        currentRun++;
      } else {
        currentRun = 1;
      }
      if (currentRun > longestConsecutiveRun) {
        longestConsecutiveRun = currentRun;
      }
      prevPos = occ.position;
    }

    const gapDistribution = [];
    for (let i = 1; i < suspectOccurrences.length; i++) {
      gapDistribution.push(suspectOccurrences[i].position - suspectOccurrences[i - 1].position - 1);
    }

    let carrierEntropy = 0;
    if (suspectCarrierCount > 0) {
      const suspectFreqs = new Map();
      for (const occ of suspectOccurrences) {
        suspectFreqs.set(occ.codePoint, (suspectFreqs.get(occ.codePoint) || 0) + 1);
      }
      for (const count of suspectFreqs.values()) {
        const p = count / suspectCarrierCount;
        carrierEntropy -= p * Math.log2(p);
      }
    }

    const visibleCount = n - occurrences.length;
    const carrierRatio = n > 0 ? occurrences.length / n : 0;

    return {
      totalCodePoints: n,
      visibleCount,
      carrierCount: occurrences.length,
      suspectCarrierCount,
      legitimateCarrierCount,
      carrierRatio,
      occurrences,
      suspectOccurrences,
      histogram,
      longestConsecutiveRun,
      gapDistribution,
      carrierEntropy,
      divBy7: suspectCarrierCount > 0 && suspectCarrierCount % 7 === 0,
      divBy8: suspectCarrierCount > 0 && suspectCarrierCount % 8 === 0,
      divBy16: suspectCarrierCount > 0 && suspectCarrierCount % 16 === 0
    };
  }

  const StegProfile = {
    isArabicLetter,
    isDevanagariLetter,
    isJoinerScriptLetter,
    isEmojiRelated,
    profileText
  };

  global.StegProfile = StegProfile;
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = StegProfile;
  }
})(typeof window !== 'undefined' ? window : this);
