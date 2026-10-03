/**
 * @file detect-engine.js
 * @description Core Forensic Steganalysis Engine.
 * Coordinates individual detectors (SNOW, ZWC, VS, Homoglyphs, BiDi) with contextual assessment.
 * Separates raw observations from actionable evidence events.
 * Compatible with browser script tags and module exports.
 */

(function (global) {
  'use strict';

  function getModule(name, fallbackPath) {
    if (typeof global !== 'undefined' && global[name]) return global[name];
    if (typeof require !== 'undefined' && fallbackPath) {
      try {
        return require(fallbackPath);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  function isHiddenCodePoint(cp) {
    const detectVs = getModule('StegDetectVs', './detectors/detect-vs.js');
    const detectZwc = getModule('StegDetectZwc', './detectors/detect-zwc.js');
    const detectBidi = getModule('StegDetectBidi', './detectors/detect-bidi.js');

    if (detectVs && detectVs.isVariationSelector && detectVs.isVariationSelector(cp)) return true;
    if (detectZwc && detectZwc.ZWC_MAP && detectZwc.ZWC_MAP[cp]) return true;
    if (detectBidi && detectBidi.BIDI_MAP && detectBidi.BIDI_MAP[cp]) return true;
    return false;
  }

  /**
   * @deprecated Retained for backward compatibility. Downstream code should
   * consume analysis.risk / analysis.evidence.verdict directly.
   */
  function classifyRisk(total, linguisticEval) {
    if (typeof total === 'object' && total !== null && total.evidence) {
      return total.risk;
    }
    if (linguisticEval && linguisticEval.isNatural) {
      return { level: 'clean', i18nKey: 'riskClean', cssClass: 'risk--clean', isNatural: true };
    }
    if (total === 0) return { level: 'clean', i18nKey: 'riskClean', cssClass: 'risk--clean' };
    if (total <= 3) return { level: 'low', i18nKey: 'riskLow', cssClass: 'risk--low' };
    if (total <= 10) return { level: 'medium', i18nKey: 'riskMedium', cssClass: 'risk--medium' };
    if (total <= 30) return { level: 'high', i18nKey: 'riskHigh', cssClass: 'risk--high' };
    return { level: 'critical', i18nKey: 'riskCritical', cssClass: 'risk--critical' };
  }

  function computeUniqueSymbols(results) {
    if (!results || results.length === 0) return [];
    const countsMap = new Map();
    for (const r of results) {
      if (!countsMap.has(r.codePoint)) {
        countsMap.set(r.codePoint, {
          codePoint: r.codePoint,
          hexCode: r.hexCode,
          name: r.name,
          category: r.category,
          count: 0
        });
      }
      countsMap.get(r.codePoint).count++;
    }

    const total = results.length;
    const list = Array.from(countsMap.values());
    list.sort((a, b) => b.count - a.count || a.codePoint - b.codePoint);

    const n = list.length;
    list.forEach((item, idx) => {
      item.percentage = ((item.count / total) * 100).toFixed(1) + '%';
      if (n === 2) {
        item.suggestedBit = idx === 0 ? '0' : '1';
      } else if (n <= 4) {
        item.suggestedBit = idx.toString(2).padStart(2, '0');
      } else if (n <= 8) {
        item.suggestedBit = idx.toString(2).padStart(3, '0');
      } else if (n <= 16) {
        item.suggestedBit = idx.toString(2).padStart(4, '0') + ` (${idx.toString(16).toUpperCase()})`;
      } else {
        item.suggestedBit = `Symbol #${idx + 1}`;
      }
    });

    return list;
  }

  /**
   * Main Forensic Steganalysis Analysis Pipeline.
   *
   * @param {string} inputText - Raw text to analyze.
   * @returns {Object} Comprehensive analysis result adhering to the contract.
   */
  function analyzeText(inputText) {
    const t0 = performance.now();

    if (!inputText || typeof inputText !== 'string') {
      return {
        observations: [],
        observationCount: 0,
        benignObservationCount: 0,
        ambiguousObservationCount: 0,
        results: [],
        totalFound: 0,
        distinctTypes: 0,
        computationTimeMs: 0,
        inputText: '',
        evidence: {
          isSuspicious: false,
          score: 0,
          verdict: 'clean',
          events: [],
          features: {}
        },
        risk: { level: 'clean', score: 0, cssClass: 'risk--clean', i18nKey: 'riskClean', toString: () => 'clean' },
        techniques: [],
        matchedSignatures: [],
        uniqueSymbols: [],
        snowTelemetry: null,
        linguisticEval: { isNatural: false }
      };
    }

    // ── Step 1: Build O(n) Unicode Context Index ──
    const unicodeContextModule = getModule('UnicodeContext', '../shared/unicode-context.js') || {
      build: (t) => {
        const chars = Array.from(t);
        return {
          text: t,
          chars,
          codePoints: chars.map(c => c.codePointAt(0)),
          length: chars.length,
          tokens: [],
          tokenMap: new Array(chars.length).fill(null),
          isolatePairs: new Map(),
          unmatchedIsolateInitiators: new Set(),
          unmatchedIsolateClosers: new Set(),
          embeddingPairs: new Map(),
          unmatchedEmbeddingInitiators: new Set(),
          unmatchedEmbeddingClosers: new Set(),
          prevNonMark: new Array(chars.length).fill(null),
          nextNonMark: new Array(chars.length).fill(null),
          isLeadingBom: (pos, cp) => (cp === 0xFEFF && pos === 0),
          isEmojiBase: () => false,
          isEmojiZwj: () => false,
          isEmojiVs: () => false,
          isMongolianVs: () => false,
          isIdeographicVs: () => false,
          isCursiveJoiner: () => false,
          isZeroWidthSpaceContext: () => false,
          isMathContext: () => false,
          isFrenchOrNumericSpace: () => false
        };
      }
    };
    const context = unicodeContextModule.build(inputText);

    // ── Step 2: Pre-scan Line-ending Trailing Whitespace via detect-snow ──
    let snowData = { occurrences: [], indicesSet: new Set(), snowDetected: false, tokens: [] };
    const detectSnow = getModule('StegDetectSnow', './detectors/detect-snow.js');
    if (detectSnow && typeof detectSnow.detectSnowAndWhitespace === 'function') {
      snowData = detectSnow.detectSnowAndWhitespace(inputText);
    }
    const trailingWsIndices = snowData.indicesSet || new Set();

    // ── Step 3: Collect Raw Detector Observations (O(n)) ──
    const rawObservations = [];
    const chars = context.chars;
    const n = context.length;

    const detectZwc = getModule('StegDetectZwc', './detectors/detect-zwc.js');
    const detectVs = getModule('StegDetectVs', './detectors/detect-vs.js');
    const detectHomoglyphs = getModule('StegDetectHomoglyphs', './detectors/detect-homoglyphs.js');
    const detectBidi = getModule('StegDetectBidi', './detectors/detect-bidi.js');

    // Context lookahead prepass
    const nextVisible = new Array(n);
    let activeNext = [];
    for (let i = n - 1; i >= 0; i--) {
      nextVisible[i] = activeNext.join('');
      const cp = context.codePoints[i];
      if (!isHiddenCodePoint(cp) && cp > 0x001F) {
        activeNext.unshift(chars[i]);
        if (activeNext.length > 3) activeNext.pop();
      }
    }

    let activePrev = [];
    for (let position = 0; position < n; position++) {
      const char = chars[position];
      const cp = context.codePoints[position];
      let match = null;

      // Priority 1: Trailing Whitespace / SNOW
      if (trailingWsIndices.has(position)) {
        if (cp === 0x0009) {
          match = {
            codePoint: 0x0009,
            hexCode: 'U+0009',
            name: 'Trailing Tab (Whitespace Steganography Carrier)',
            category: 'space'
          };
        } else if (cp === 0x0020) {
          match = {
            codePoint: 0x0020,
            hexCode: 'U+0020',
            name: 'Trailing Space (Whitespace Steganography Carrier)',
            category: 'space'
          };
        }
      }

      // Priority 2: Zero-Width Characters
      if (!match && detectZwc && typeof detectZwc.matchZwc === 'function') {
        match = detectZwc.matchZwc(cp);
      }

      // Priority 3: Homoglyphs & Lookalikes
      if (!match && detectHomoglyphs && typeof detectHomoglyphs.matchHomoglyph === 'function') {
        match = detectHomoglyphs.matchHomoglyph(cp, char);
      }

      // Priority 4: Variation Selectors
      if (!match && detectVs && typeof detectVs.matchVs === 'function') {
        match = detectVs.matchVs(cp);
      }

      // Priority 5: BiDi Controls & Variant Spaces
      if (!match && detectBidi && typeof detectBidi.matchBidiOrSpace === 'function') {
        match = detectBidi.matchBidiOrSpace(cp);
      }

      if (match) {
        rawObservations.push({
          ...match,
          position: position,
          contextBefore: activePrev.join(''),
          contextAfter: nextVisible[position] || ''
        });
      } else {
        if (!isHiddenCodePoint(cp) && cp > 0x001F) {
          activePrev.push(char);
          if (activePrev.length > 3) activePrev.shift();
        }
      }
    }

    // ── Step 4: Contextual Evidence Assessment (EvidenceAssessor) ──
    const sigModule = getModule('StegSignatures', './signatures.js');
    const sigRegistry = (sigModule && sigModule.STEGO_SIGNATURES_REGISTRY) || global.STEGO_SIGNATURES_REGISTRY || [];
    const assessorModule = getModule('EvidenceAssessor', './evidence-assessor.js');

    let assessment;
    if (assessorModule && typeof assessorModule.assess === 'function') {
      assessment = assessorModule.assess(inputText, context, rawObservations, snowData, sigRegistry);
    } else {
      // Fallback if assessor not loaded
      const actionablePos = new Set(rawObservations.map(o => o.position));
      assessment = {
        observations: rawObservations,
        actionablePositions: actionablePos,
        observationCount: rawObservations.length,
        benignObservationCount: 0,
        ambiguousObservationCount: 0,
        score: rawObservations.length > 0 ? 50 : 0,
        verdict: rawObservations.length > 0 ? 'low' : 'clean',
        isSuspicious: rawObservations.length > 0,
        events: [],
        features: {},
        matchedSignatures: []
      };
    }

    // ── Step 5: Derive Actionable Results ──
    const actionable = assessment.actionablePositions;
    const observations = assessment.observations;
    const results = observations.filter(item => actionable.has(item.position));

    // ── Step 6: Derive Techniques Taxonomy from Actionable Results ──
    const categoriesMap = {
      zeroWidth: 0,
      variationSelector: 0,
      mongolianFVS: 0,
      homograph: 0,
      space: 0,
      directional: 0,
      bom: 0
    };

    const typesSet = new Set();
    for (const r of results) {
      typesSet.add(r.hexCode);
      if (categoriesMap[r.category] !== undefined) {
        categoriesMap[r.category]++;
      }
    }

    const techniques = [];
    if (categoriesMap.zeroWidth > 0) {
      techniques.push({ id: 'ZWC', nameKey: 'techniqueZWC', count: categoriesMap.zeroWidth });
    }
    if (categoriesMap.variationSelector > 0 || categoriesMap.mongolianFVS > 0) {
      techniques.push({ id: 'VS', nameKey: 'techniqueVS', count: categoriesMap.variationSelector + categoriesMap.mongolianFVS });
    }
    if (categoriesMap.homograph > 0) {
      techniques.push({ id: 'HOMOGRAPH', nameKey: 'techniqueHomograph', count: categoriesMap.homograph });
    }
    if (categoriesMap.space > 0) {
      techniques.push({ id: 'SPACE', nameKey: 'techniqueSpace', count: categoriesMap.space });
    }
    if (categoriesMap.directional > 0 || categoriesMap.bom > 0) {
      techniques.push({ id: 'BIDI', nameKey: 'techniqueBiDi', count: categoriesMap.directional + categoriesMap.bom });
    }

    // ── Step 7: Unique Symbols (from Actionable Results) ──
    const uniqueSymbols = computeUniqueSymbols(results);

    const t1 = performance.now();

    const verdictLevel = assessment.verdict;
    const riskObj = {
      level: verdictLevel,
      score: assessment.score,
      cssClass: `risk--${verdictLevel}`,
      i18nKey: `risk${verdictLevel.charAt(0).toUpperCase() + verdictLevel.slice(1)}`,
      toString: () => verdictLevel
    };

    return {
      observations: observations,
      observationCount: observations.length,
      benignObservationCount: assessment.benignObservationCount,
      ambiguousObservationCount: assessment.ambiguousObservationCount,

      results: results,
      totalFound: results.length,
      distinctTypes: typesSet.size,

      evidence: {
        isSuspicious: assessment.isSuspicious,
        score: assessment.score,
        verdict: assessment.verdict,
        events: assessment.events,
        features: assessment.features
      },

      risk: riskObj,
      techniques: techniques,
      matchedSignatures: assessment.matchedSignatures,
      uniqueSymbols: uniqueSymbols,
      snowTelemetry: snowData,
      linguisticEval: {
        isNatural: assessment.verdict === 'clean' && observations.length > 0
      },
      computationTimeMs: parseFloat((t1 - t0).toFixed(2)),
      inputText: inputText
    };
  }

  global.StegDetectEngine = {
    analyzeText,
    classifyRisk,
    computeUniqueSymbols,
    isHiddenCodePoint
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      analyzeText,
      classifyRisk,
      computeUniqueSymbols,
      isHiddenCodePoint
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
