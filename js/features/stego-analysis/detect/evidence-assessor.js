/**
 * @file evidence-assessor.js
 * @description Pure Contextual Evidence Assessor for Forensic Steganalysis.
 * Evaluates observations in linguistic/typographic context, deduces evidence events,
 * and determines deterministic risk scores and verdicts without treating existence alone as guilty.
 * Compatible with browser script tags and module exports.
 */

(function (global) {
  'use strict';

  function getSignaturesModule() {
    return (typeof global !== 'undefined' && global.StegSignatures) || {};
  }

  /**
   * Assess observations in context.
   *
   * @param {string} text - Source text.
   * @param {Object} context - Unicode context index from UnicodeContext.build(text).
   * @param {Array} rawObservations - Raw observations from detectors.
   * @param {Object} [snowData] - SNOW telemetry.
   * @param {Array} [signatureDefinitions] - Signature registry.
   * @returns {Object} Assessment outcome.
   */
  function assess(text, context, rawObservations, snowData, signatureDefinitions) {
    const observations = (rawObservations || []).map(o => ({
      ...o,
      disposition: 'ambiguous',
      reasonCodes: Array.isArray(o.reasonCodes) ? [...o.reasonCodes] : [],
      tokenStart: null,
      tokenEnd: null,
      canonical: o.canonical !== undefined ? o.canonical : null
    }));

    const events = [];
    const homoglyphTokensSeen = new Set();
    const widthTokensSeen = new Set();

    // ── Phase 1: Contextual Classification of Individual Observations ──
    for (let idx = 0; idx < observations.length; idx++) {
      const obs = observations[idx];
      const pos = obs.position;
      const cp = obs.codePoint;

      // 1.1 Homoglyphs & Lookalikes
      if (obs.category === 'homograph') {
        const token = context.tokenMap[pos];

        if (token) {
          obs.tokenStart = token.start;
          obs.tokenEnd = token.end;

          // Punctuation & compatibility forms (Roman numerals, Kelvin sign, hyphen)
          if (obs.homoglyphKind === 'compatibility' || obs.homoglyphKind === 'punctuation') {
            obs.disposition = 'benign';
            continue;
          }

          // Fullwidth ASCII characters
          if (obs.homoglyphKind === 'width') {
            if (token.hasAscii && token.hasFullwidth) {
              obs.disposition = 'suspicious';
              obs.reasonCodes.push('MIXED_WIDTH_TOKEN');

              if (!widthTokensSeen.has(token.id)) {
                widthTokensSeen.add(token.id);
                // Collect fullwidth positions in this token
                const tokenFullwidthPositions = [];
                for (let ti = token.start; ti <= token.end; ti++) {
                  const tcp = context.codePoints[ti];
                  if (tcp >= 0xFF01 && tcp <= 0xFF5E) {
                    tokenFullwidthPositions.push(ti);
                  }
                }
                events.push({
                  code: 'MIXED_WIDTH_TOKEN',
                  weight: 40,
                  positions: tokenFullwidthPositions.length > 0 ? tokenFullwidthPositions : [pos],
                  details: { tokenId: token.id, text: token.text }
                });
              }
            } else {
              obs.disposition = 'ambiguous';
            }
            continue;
          }

          // Cross-script lookalikes (Cyrillic / Greek)
          const isAllCyrillic = token.strongScripts.size === 1 && token.strongScripts.has('Cyrillic');
          const isAllGreek = token.strongScripts.size === 1 && token.strongScripts.has('Greek');

          if (isAllCyrillic || isAllGreek) {
            // Entire token is within the same script; perfectly benign
            obs.disposition = 'benign';
            continue;
          }

          // Mixed-script confusable: Latin token containing Cyrillic or Greek lookalikes
          const hasLatin = token.strongScripts.has('Latin');
          const isLookalikeScript = obs.sourceScript === 'Cyrillic' || obs.sourceScript === 'Greek';

          if (hasLatin && isLookalikeScript) {
            obs.disposition = 'suspicious';
            obs.reasonCodes.push('MIXED_SCRIPT_CONFUSABLE');

            if (!homoglyphTokensSeen.has(token.id)) {
              homoglyphTokensSeen.add(token.id);
              // Collect all homoglyph positions in this token
              const tokenHomoPositions = [];
              for (let ti = token.start; ti <= token.end; ti++) {
                const tcp = context.codePoints[ti];
                if (
                  global.StegDetectHomoglyphs &&
                  global.StegDetectHomoglyphs.HOMOGRAPH_MAP[tcp] &&
                  (global.StegDetectHomoglyphs.HOMOGRAPH_MAP[tcp].sourceScript === 'Cyrillic' ||
                   global.StegDetectHomoglyphs.HOMOGRAPH_MAP[tcp].sourceScript === 'Greek')
                ) {
                  tokenHomoPositions.push(ti);
                }
              }
              events.push({
                code: 'MIXED_SCRIPT_CONFUSABLE',
                weight: 40,
                positions: tokenHomoPositions.length > 0 ? tokenHomoPositions : [pos],
                details: { tokenId: token.id, text: token.text, confusable: obs.canonical }
              });
            }
            continue;
          }

          // Other script mixing or isolated symbol
          obs.disposition = 'ambiguous';
          continue;
        }

        // Isolated 1-character token with no surrounding strong script
        obs.disposition = 'ambiguous';
        continue;
      }

      // 1.2 Bidirectional Controls
      if (obs.category === 'directional') {
        // Isolates (LRI, RLI, FSI, PDI)
        if (cp === 0x2066 || cp === 0x2067 || cp === 0x2068 || cp === 0x2069) {
          if (context.isolatePairs.has(pos)) {
            obs.disposition = 'benign';
          } else {
            obs.disposition = 'ambiguous';
          }
          continue;
        }

        // Embeddings and Overrides (LRE, RLE, LRO, RLO with PDF)
        if (cp === 0x202A || cp === 0x202B || cp === 0x202C || cp === 0x202D || cp === 0x202E) {
          // Even if matched, overrides warrant review but are not automatically stego verdicts
          obs.disposition = 'ambiguous';
          continue;
        }

        // Directional Marks (LRM, RLM)
        if (cp === 0x200E || cp === 0x200F) {
          obs.disposition = 'ambiguous';
          continue;
        }

        obs.disposition = 'ambiguous';
        continue;
      }

      // 1.3 Variant Spaces
      if (obs.category === 'space') {
        // French typography or numbers for U+202F
        if (cp === 0x202F && context.isFrenchOrNumericSpace(pos)) {
          obs.disposition = 'benign';
          continue;
        }

        // Check if this variant space is isolated (not part of a contiguous space run)
        const prevCp = pos > 0 ? context.codePoints[pos - 1] : null;
        const nextCp = pos < context.length - 1 ? context.codePoints[pos + 1] : null;
        const isPrevSpace = prevCp !== null && ((prevCp >= 0x2000 && prevCp <= 0x200A) || prevCp === 0x202F || prevCp === 0x00A0);
        const isNextSpace = nextCp !== null && ((nextCp >= 0x2000 && nextCp <= 0x200A) || nextCp === 0x202F || nextCp === 0x00A0);

        if (!isPrevSpace && !isNextSpace) {
          // Single variant space between text characters is benign typography
          obs.disposition = 'benign';
          continue;
        }

        obs.disposition = 'ambiguous';
        continue;
      }

      // 1.4 Variation Selectors
      if (obs.category === 'variationSelector' || obs.category === 'mongolianFVS') {
        // Emoji variation selectors (FE0E / FE0F)
        if (context.isEmojiVs(pos)) {
          obs.disposition = 'benign';
          continue;
        }

        // Mongolian Free Variation Selectors (FVS1-3)
        if (context.isMongolianVs(pos)) {
          obs.disposition = 'benign';
          continue;
        }

        // Ideographic Variation Selectors (VS17-256)
        if (context.isIdeographicVs(pos)) {
          obs.disposition = 'benign';
          continue;
        }

        // Check orphan condition:
        // Position 0, or follows whitespace/control/another selector, or chained selectors
        const prevCp = pos > 0 ? context.codePoints[pos - 1] : null;
        const isPrevWhitespaceOrControl = prevCp !== null && (prevCp <= 0x0020 || prevCp === 0x00A0 || (prevCp >= 0x2000 && prevCp <= 0x200B));
        const isPrevVS = prevCp !== null && ((prevCp >= 0xFE00 && prevCp <= 0xFE0F) || (prevCp >= 0xE0100 && prevCp <= 0xE01EF));

        if (pos === 0 || isPrevWhitespaceOrControl || isPrevVS) {
          obs.isOrphanVs = true;
          obs.disposition = 'ambiguous';
        } else {
          // Single selector after plausible base: conservatively benign
          obs.disposition = 'benign';
        }
        continue;
      }

      // 1.5 Zero-Width Characters and Invisible Formatting
      if (obs.category === 'zeroWidth' || obs.category === 'bom') {
        // Leading Byte Order Mark
        if (context.isLeadingBom(pos, cp)) {
          obs.disposition = 'benign';
          continue;
        }

        // Natural Cursive Joiners (Arabic/Persian/Devanagari)
        if (context.isCursiveJoiner(pos)) {
          obs.disposition = 'benign';
          continue;
        }

        // Emoji ZWJ sequence
        if (context.isEmojiZwj(pos)) {
          obs.disposition = 'benign';
          continue;
        }

        // Native Zero-Width Space scripts (Thai, Lao, Khmer, Myanmar)
        if (context.isZeroWidthSpaceContext(pos)) {
          obs.disposition = 'benign';
          continue;
        }

        // Math invisible operators (Function application, invisible times, plus, separator)
        if (context.isMathContext(pos)) {
          obs.disposition = 'benign';
          continue;
        }

        obs.disposition = 'ambiguous';
        continue;
      }

      obs.disposition = 'ambiguous';
    }

    // ── Phase 2: Structural and Multi-Character Evidence Evaluation ──
    const candidateObservations = observations.filter(o => o.disposition !== 'benign');

    // 2.1 Orphan Variation Selector Runs (>= 2 contiguous orphan VS)
    let orphanVsRun = [];
    for (let i = 0; i < observations.length; i++) {
      const o = observations[i];
      const isVS = (o.codePoint >= 0xFE00 && o.codePoint <= 0xFE0F) || (o.codePoint >= 0xE0100 && o.codePoint <= 0xE01EF);
      if (isVS && (o.isOrphanVs || o.position === 0)) {
        if (orphanVsRun.length === 0 || o.position === orphanVsRun[orphanVsRun.length - 1].position + 1) {
          orphanVsRun.push(o);
        } else {
          if (orphanVsRun.length >= 2) {
            const positions = orphanVsRun.map(item => item.position);
            orphanVsRun.forEach(item => {
              item.disposition = 'suspicious';
              item.reasonCodes.push('ORPHAN_VS_RUN');
            });
            events.push({ code: 'ORPHAN_VS_RUN', weight: 65, positions, details: { count: orphanVsRun.length } });
          }
          orphanVsRun = [o];
        }
      } else {
        if (orphanVsRun.length >= 2) {
          const positions = orphanVsRun.map(item => item.position);
          orphanVsRun.forEach(item => {
            item.disposition = 'suspicious';
            item.reasonCodes.push('ORPHAN_VS_RUN');
          });
          events.push({ code: 'ORPHAN_VS_RUN', weight: 65, positions, details: { count: orphanVsRun.length } });
        }
        orphanVsRun = [];
      }
    }
    if (orphanVsRun.length >= 2) {
      const positions = orphanVsRun.map(item => item.position);
      orphanVsRun.forEach(item => {
        item.disposition = 'suspicious';
        item.reasonCodes.push('ORPHAN_VS_RUN');
      });
      events.push({ code: 'ORPHAN_VS_RUN', weight: 65, positions, details: { count: orphanVsRun.length } });
    }

    // 2.2 Mixed Space Steganography Run (>= 3 contiguous variant spaces with >= 2 distinct codes)
    let spaceRun = [];
    for (let i = 0; i < candidateObservations.length; i++) {
      const o = candidateObservations[i];
      const isVariantSpace = o.category === 'space' && o.codePoint !== 0x0020 && o.codePoint !== 0x0009;
      if (isVariantSpace) {
        if (spaceRun.length === 0 || o.position === spaceRun[spaceRun.length - 1].position + 1) {
          spaceRun.push(o);
        } else {
          evaluateSpaceRun(spaceRun);
          spaceRun = [o];
        }
      } else {
        evaluateSpaceRun(spaceRun);
        spaceRun = [];
      }
    }
    evaluateSpaceRun(spaceRun);

    function evaluateSpaceRun(run) {
      if (run.length >= 3) {
        const distinctCp = new Set(run.map(r => r.codePoint));
        if (distinctCp.size >= 2) {
          const positions = run.map(r => r.position);
          run.forEach(r => {
            r.disposition = 'suspicious';
            r.reasonCodes.push('MIXED_SPACE_RUN');
          });
          events.push({ code: 'MIXED_SPACE_RUN', weight: 40, positions, details: { length: run.length, distinct: distinctCp.size } });
        }
      }
    }

    // 2.3 Covert Carrier Runs (>= 2 contiguous non-legitimate ZWC carriers)
    let carrierRun = [];
    for (let i = 0; i < candidateObservations.length; i++) {
      const o = candidateObservations[i];
      if (o.category === 'zeroWidth' || o.category === 'bom') {
        if (carrierRun.length === 0 || o.position === carrierRun[carrierRun.length - 1].position + 1) {
          carrierRun.push(o);
        } else {
          evaluateCarrierRun(carrierRun);
          carrierRun = [o];
        }
      } else {
        evaluateCarrierRun(carrierRun);
        carrierRun = [];
      }
    }
    evaluateCarrierRun(carrierRun);

    function evaluateCarrierRun(run) {
      if (run.length >= 2) {
        const weight = Math.min(60, 40 + 5 * (run.length - 2));
        const positions = run.map(r => r.position);
        run.forEach(r => {
          r.disposition = 'suspicious';
          r.reasonCodes.push('COVERT_CARRIER_RUN');
        });
        events.push({ code: 'COVERT_CARRIER_RUN', weight, positions, details: { length: run.length } });
      }
    }

    // 2.4 Repeated Orphan BiDi Control (same unmatched control repeating >= 3 times)
    const unmatchedBidiMap = new Map();
    for (const o of candidateObservations) {
      if (o.category === 'directional') {
        const isUnmatched =
          context.unmatchedIsolateInitiators.has(o.position) ||
          context.unmatchedIsolateClosers.has(o.position) ||
          context.unmatchedEmbeddingInitiators.has(o.position) ||
          context.unmatchedEmbeddingClosers.has(o.position);

        if (isUnmatched) {
          if (!unmatchedBidiMap.has(o.codePoint)) {
            unmatchedBidiMap.set(o.codePoint, []);
          }
          unmatchedBidiMap.get(o.codePoint).push(o);
        }
      }
    }

    for (const [ucp, ulist] of unmatchedBidiMap.entries()) {
      if (ulist.length >= 3) {
        const positions = ulist.map(u => u.position);
        ulist.forEach(u => {
          u.disposition = 'suspicious';
          u.reasonCodes.push('REPEATED_ORPHAN_CONTROL');
        });
        events.push({
          code: 'REPEATED_ORPHAN_CONTROL',
          weight: 40,
          positions,
          details: { codePoint: ucp, count: ulist.length }
        });
      }
    }

    // 2.5 64-Code-Point Sliding Windows across candidate observations
    const candidateLen = candidateObservations.length;
    for (let i = 0; i < candidateLen; i++) {
      const windowItems = [];
      for (let j = i; j < candidateLen; j++) {
        if (candidateObservations[j].position - candidateObservations[i].position < 64) {
          windowItems.push(candidateObservations[j]);
        } else {
          break;
        }
      }

      if (windowItems.length >= 2) {
        // BIDI_WITH_COVERT_CARRIER: >= 2 unmatched BiDi controls + covert carrier in 64 window
        const unmatchedBidiInWindow = windowItems.filter(item => {
          return item.category === 'directional' && (
            context.unmatchedIsolateInitiators.has(item.position) ||
            context.unmatchedIsolateClosers.has(item.position) ||
            context.unmatchedEmbeddingInitiators.has(item.position) ||
            context.unmatchedEmbeddingClosers.has(item.position)
          );
        });
        const covertInWindow = windowItems.filter(item => item.category === 'zeroWidth' || item.isOrphanVs);

        if (unmatchedBidiInWindow.length >= 2 && covertInWindow.length >= 1) {
          const combined = [...unmatchedBidiInWindow, ...covertInWindow];
          const positions = Array.from(new Set(combined.map(c => c.position))).sort((a, b) => a - b);
          combined.forEach(c => {
            c.disposition = 'suspicious';
            c.reasonCodes.push('BIDI_WITH_COVERT_CARRIER');
          });
          events.push({
            code: 'BIDI_WITH_COVERT_CARRIER',
            weight: 45,
            positions,
            details: { bidiCount: unmatchedBidiInWindow.length, covertCount: covertInWindow.length }
          });
        }
      }

      if (windowItems.length >= 3) {
        // MIXED_CARRIER_WINDOW: >= 3 candidate carriers with >= 2 distinct codes or categories
        const carrierCandidates = windowItems.filter(item => item.category === 'zeroWidth' || item.category === 'space' || item.isOrphanVs);
        if (carrierCandidates.length >= 3) {
          const distinctCp = new Set(carrierCandidates.map(c => c.codePoint));
          const distinctCats = new Set(carrierCandidates.map(c => c.category));

          if (distinctCp.size >= 2 || distinctCats.size >= 2) {
            const positions = Array.from(new Set(carrierCandidates.map(c => c.position))).sort((a, b) => a - b);
            carrierCandidates.forEach(c => {
              c.disposition = 'suspicious';
              c.reasonCodes.push('MIXED_CARRIER_WINDOW');
            });
            events.push({
              code: 'MIXED_CARRIER_WINDOW',
              weight: 45,
              positions,
              details: { carriersCount: carrierCandidates.length, distinctCp: distinctCp.size, distinctCats: distinctCats.size }
            });
          }
        }
      }
    }

    // ── Phase 3: Exact Tool & Research Signatures Matching ──
    const sigModule = getSignaturesModule();
    const matchFn = sigModule.matchSignaturesDetailed;
    let matchedSignatures = [];

    if (typeof matchFn === 'function') {
      matchedSignatures = matchFn(candidateObservations, text, snowData);
    }

    for (const sm of matchedSignatures) {
      const positions = sm.positions || [];
      const weight = 70;
      const code = sm.reasonCode === 'SNOW_PATTERN' ? 'SNOW_PATTERN' : 'SIGNATURE_MATCH';

      for (const pos of positions) {
        const targetObs = observations.find(o => o.position === pos);
        if (targetObs) {
          targetObs.disposition = 'suspicious';
          targetObs.reasonCodes.push(code);
        }
      }

      events.push({
        code,
        weight,
        positions,
        details: { signatureId: sm.signature.id, name: sm.signature.name }
      });
    }

    // ── Phase 4: Event Deduplication, Scoring, and Verdict ──
    const deduplicatedEvents = [];
    const eventKeysSeen = new Set();
    let mixedScriptTotalWeight = 0;

    for (const evt of events) {
      const sortedPos = [...evt.positions].sort((a, b) => a - b);
      const key = `${evt.code}:${sortedPos.join(',')}`;

      if (!eventKeysSeen.has(key)) {
        eventKeysSeen.add(key);

        let finalWeight = evt.weight;
        if (evt.code === 'MIXED_SCRIPT_CONFUSABLE') {
          // Cap mixed-script confusable at 60 total across tokens
          if (mixedScriptTotalWeight + finalWeight > 60) {
            finalWeight = Math.max(0, 60 - mixedScriptTotalWeight);
          }
          mixedScriptTotalWeight += finalWeight;
        }

        if (finalWeight > 0) {
          deduplicatedEvents.push({
            ...evt,
            weight: finalWeight,
            positions: sortedPos
          });
        }
      }
    }

    // Actionable positions: union of positions contributing to events with weight >= 40
    const actionablePositions = new Set();
    const distinctFamilies = new Set();

    let rawScore = 0;
    for (const evt of deduplicatedEvents) {
      if (evt.weight >= 40) {
        for (const p of evt.positions) {
          actionablePositions.add(p);
        }
      }
      rawScore += evt.weight;

      // Classify event into evidence family
      if (evt.code === 'MIXED_SCRIPT_CONFUSABLE' || evt.code === 'MIXED_WIDTH_TOKEN') {
        distinctFamilies.add('homoglyph');
      } else if (evt.code === 'COVERT_CARRIER_RUN' || evt.code === 'MIXED_CARRIER_WINDOW') {
        distinctFamilies.add('covert_zwc');
      } else if (evt.code === 'ORPHAN_VS_RUN') {
        distinctFamilies.add('vs');
      } else if (evt.code === 'BIDI_WITH_COVERT_CARRIER' || evt.code === 'REPEATED_ORPHAN_CONTROL') {
        distinctFamilies.add('bidi');
      } else if (evt.code === 'MIXED_SPACE_RUN') {
        distinctFamilies.add('space');
      } else if (evt.code === 'SNOW_PATTERN') {
        distinctFamilies.add('snow');
      } else if (evt.code === 'SIGNATURE_MATCH') {
        distinctFamilies.add('signature');
      }
    }

    // High carrier density bonus: adds 10 ONLY when at least one event already exists
    if (deduplicatedEvents.length > 0 && context.length > 0) {
      const density = candidateObservations.length / context.length;
      if (density >= 0.05 && candidateObservations.length >= 5) {
        rawScore += 10;
      }
    }

    const score = Math.min(100, Math.max(0, rawScore));

    // Update observations based on final actionable set
    let benignCount = 0;
    let ambiguousCount = 0;

    for (const obs of observations) {
      if (actionablePositions.has(obs.position)) {
        obs.disposition = 'suspicious';
      } else if (obs.disposition !== 'benign') {
        obs.disposition = 'ambiguous';
        ambiguousCount++;
      } else {
        benignCount++;
      }
    }

    // Verdict Determination
    let verdict = 'clean';
    const hasValidatedSigOrSnow = deduplicatedEvents.some(e => e.code === 'SIGNATURE_MATCH' || e.code === 'SNOW_PATTERN');

    if ((hasValidatedSigOrSnow && actionablePositions.size >= 16) || (score === 100 && distinctFamilies.size >= 2)) {
      verdict = 'critical';
    } else if (score >= 80) {
      verdict = 'high';
    } else if (score >= 60) {
      verdict = 'medium';
    } else if (score >= 40) {
      verdict = 'low';
    } else {
      verdict = 'clean';
    }

    const isSuspicious = verdict !== 'clean';

    return {
      observations,
      actionablePositions,
      observationCount: observations.length,
      benignObservationCount: benignCount,
      ambiguousObservationCount: ambiguousCount,
      score,
      verdict,
      isSuspicious,
      events: deduplicatedEvents,
      features: {
        tokenCount: context.tokens.length,
        candidateCount: candidateObservations.length,
        actionableCount: actionablePositions.size,
        families: Array.from(distinctFamilies)
      },
      matchedSignatures: matchedSignatures.map(sm => sm.signature)
    };
  }

  const EvidenceAssessor = {
    assess
  };

  global.EvidenceAssessor = EvidenceAssessor;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = EvidenceAssessor;
  }
})(typeof window !== 'undefined' ? window : globalThis);
