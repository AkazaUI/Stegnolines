/**
 * @file analyze.js
 * @description Core analysis engine orchestrator: profiling, hypothesis evaluation, ranking, decapsulation, security checks.
 * Compatible with classic script tags and module exports.
 */

(function (global) {
  'use strict';

  const PROMPT_INJECTION_REGEX = /ignore\s+(all\s+)?previous\s+instructions|system\s+prompt|you\s+are\s+now|<\|im_start\|>|exfiltrate|curl|wget|fetch\(/i;
  const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

  function scoreLanguagePlausibility(text) {
    if (!text || text.trim().length === 0) return 0;
    const len = text.length;

    let alphaCount = 0;
    let spaceCount = 0;
    let digitCount = 0;
    let vowelCount = 0;
    let weirdPunctCount = 0;

    const vowels = new Set(['a','e','i','o','u','A','E','I','O','U']);

    for (const char of text) {
      const cp = char.codePointAt(0);
      if ((cp >= 65 && cp <= 90) || (cp >= 97 && cp <= 122) || (cp >= 0x0621 && cp <= 0x064A)) {
        alphaCount++;
        if (vowels.has(char)) vowelCount++;
      } else if (cp === 32 || cp === 10 || cp === 13 || cp === 9) {
        spaceCount++;
      } else if (cp >= 48 && cp <= 57) {
        digitCount++;
      } else if (cp >= 33 && cp <= 126) {
        weirdPunctCount++;
      }
    }

    const alphaRatio = alphaCount / len;
    const spaceRatio = spaceCount / len;
    const digitRatio = digitCount / len;
    const weirdRatio = weirdPunctCount / len;

    let score = (alphaRatio * 0.6) + (spaceRatio * 0.2) + (digitRatio * 0.1) - (weirdRatio * 0.6);

    if (alphaCount > 0 && vowelCount > 0) {
      const vowelRatio = vowelCount / alphaCount;
      if (vowelRatio >= 0.15 && vowelRatio <= 0.6) {
        score += 0.2;
      }
    }

    return Math.max(0, Math.min(1.0, score));
  }

  async function analyzeTextForExtraction(inputText) {
    const startTime = performance.now();

    const profileText = (global.StegProfile && global.StegProfile.profileText) ? global.StegProfile.profileText : function() { return { occurrences: [], suspectOccurrences: [] }; };
    const SCHEMES = global.SCHEMES || [];
    const decapsulate = (global.StegDecapsulate && global.StegDecapsulate.decapsulate) ? global.StegDecapsulate.decapsulate : async function(b) { return { finalText: '', finalBytes: b, chain: [] }; };
    const sanitizeText = (global.StegSanitize && global.StegSanitize.sanitizeText) ? global.StegSanitize.sanitizeText : function(t) { return { sanitizedText: t, removedCount: 0, preservedCount: 0 }; };
    const isCarrierCodePoint = (global.StegCarriers && global.StegCarriers.isCarrierCodePoint) ? global.StegCarriers.isCarrierCodePoint : function() { return false; };

    const profile = profileText(inputText);

    const rawCandidates = [];
    const rejectedHypotheses = [];

    for (const scheme of SCHEMES) {
      if (!scheme.canApply(profile)) {
        rejectedHypotheses.push({
          schemeId: scheme.id,
          label: scheme.label,
          reason: 'Prerequisites not met (insufficient or mismatched carrier types).'
        });
        continue;
      }

      try {
        const results = scheme.decode(profile.occurrences, profile);
        if (results && results.length > 0) {
          rawCandidates.push(...results);
        } else {
          rejectedHypotheses.push({
            schemeId: scheme.id,
            label: scheme.label,
            reason: 'Decoded bitstream resulted in empty or non-viable payload.'
          });
        }
      } catch (err) {
        rejectedHypotheses.push({
          schemeId: scheme.id,
          label: scheme.label,
          reason: `Decoding error: ${err.message}`
        });
      }
    }

    const rankedCandidates = [];

    for (const cand of rawCandidates) {
      const decapsulation = await decapsulate(cand.bytes);
      const decText = decapsulation.finalText;

      const plausibility = scoreLanguagePlausibility(decText);
      const lenBonus = Math.min(decText.length / 8, 1.0) * 20;
      const confidence = Math.min(100, Math.round(cand.confidence * 0.5 + plausibility * 30 + lenBonus));

      const isPromptInjection = PROMPT_INJECTION_REGEX.test(decText);
      const hasNestedPayload = Array.from(decText).some(c => isCarrierCodePoint(c.codePointAt(0)));
      const hasUrls = URL_REGEX.test(decText);

      rankedCandidates.push({
        schemeId: cand.schemeId,
        label: cand.label,
        bytes: decapsulation.finalBytes,
        text: decText,
        confidence,
        notes: cand.notes,
        decapsulation,
        isPromptInjection,
        hasNestedPayload,
        hasUrls
      });
    }

    rankedCandidates.sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return b.text.length - a.text.length;
    });
    const topCandidates = rankedCandidates.slice(0, 3);

    const sanitization = sanitizeText(inputText);

    const durationMs = parseFloat((performance.now() - startTime).toFixed(2));

    return {
      profile,
      topCandidates,
      rejectedHypotheses,
      sanitization,
      durationMs
    };
  }

  const StegAnalyze = { scoreLanguagePlausibility, analyzeTextForExtraction };
  global.StegAnalyze = StegAnalyze;
  global.analyzeTextForExtraction = analyzeTextForExtraction;

  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = StegAnalyze;
  }
})(typeof window !== 'undefined' ? window : this);
