/**
 * ══════════════════════════════════════════════════════════════
 * StegoLine — Core Steganography Engine Web Worker
 * ══════════════════════════════════════════════════════════════
 *
 * Dedicated background worker executing CPU-intensive cryptographic
 * and steganographic pipelines (PBKDF2-100K, Brotli-Q11, AES-256-CTR,
 * CSPRNG Lazy Fisher-Yates, VS-SBox Permutations) completely off
 * the main UI thread.
 *
 * Guarantees 60 FPS silky smooth UI responsiveness with 0ms UI freeze.
 *
 * ══════════════════════════════════════════════════════════════
 */

'use strict';

try {
  importScripts(
    '../compression/wasm-engine.js',
    '../compression/wasm-bridge.js',
    '../compression/brotli-service.js',
    '../crypto/sha256.js',
    '../crypto/aes-ctr.js',
    '../../shared/text_codec.js',
    'payload-codec.js',
    'prng-generator.js',
    'xor-mask.js',
    'vs-codec.js',
    'multi-message-protocol.js',
    'stego-composer.js'
  );
} catch (err) {
  console.warn('[StegoEngineWorker] Warning during importScripts:', err);
}

self.onmessage = async function (e) {
  const { id, action, payload } = e.data || {};

  if (!id || !action) {
    return;
  }

  try {
    switch (action) {
      case 'COMPOSE_STEGO': {
        const {
          coverText,
          secretMessage,
          hint,
          stegoKey,
          encryptionKey,
          fakeCoverText
        } = payload || {};

        const result = await composeStego(
          coverText || '',
          secretMessage || '',
          hint || '',
          stegoKey || '',
          encryptionKey || '',
          fakeCoverText || ''
        );

        self.postMessage({
          id,
          success: true,
          result
        });
        break;
      }

      case 'DECOMPOSE_STEGO': {
        const {
          stegoText,
          rawStegoKey,
          encryptionKey
        } = payload || {};

        const result = await decomposeStego(
          stegoText || '',
          rawStegoKey || '',
          encryptionKey || ''
        );

        self.postMessage({
          id,
          success: true,
          result
        });
        break;
      }

      case 'SCAN_CHAT_PAYLOADS': {
        const onProgress = (prog) => {
          self.postMessage({
            id,
            type: 'PROGRESS',
            percent: prog.percent,
            statusDetail: prog.statusDetail
          });
        };

        const result = await scanChatPayloads(payload, onProgress);

        self.postMessage({
          id,
          success: true,
          result
        });
        break;
      }

      default:
        throw new Error(`[StegoEngineWorker] Unrecognized action: "${action}"`);
    }
  } catch (error) {
    self.postMessage({
      id,
      success: false,
      error: error && error.message ? error.message : String(error)
    });
  }
};

/**
 * Execute combinatorial chat payload scan across all carriers and candidate covers.
 *
 * @param {object} payload - Scan options, carriers, candidate covers, and keys.
 * @param {Function} [onProgress] - Optional progress notification callback.
 * @returns {Promise<{ carrierResults: Array, totalMatchesCount: number }>}
 */
async function scanChatPayloads(payload, onProgress) {
  const {
    carriers = [],
    cleanMessages = [],
    candidateCoversMap = {},
    stegoKeys = [""],
    aesKeys = [""],
    currentLang = 'en'
  } = payload || {};

  if (!carriers || carriers.length === 0) {
    return { carrierResults: [], totalMatchesCount: 0 };
  }

  let totalMatchesCount = 0;
  const carrierResults = [];
  const totalCarriers = carriers.length;
  const totalWorkUnits = totalCarriers * (cleanMessages.length || 1);
  const checkpointInterval = Math.max(1, Math.floor(totalWorkUnits / 100));
  let processedUnits = 0;

  for (let c = 0; c < carriers.length; c++) {
    const carrier = carriers[c];
    const carrierIndex = carrier.index;
    const rawVsIndices = carrier.rawVsIndices || carrier.vsKey;
    const vsKeyLength = rawVsIndices ? rawVsIndices.length : 0;
    const requiredBits = vsKeyLength * 8;
    const carrierMsgText = carrier.carrierMessage || '';
    const vsPrefix = carrier.vsPrefix || (rawVsIndices ? Array.from(rawVsIndices).map(b => (b < 16 ? String.fromCodePoint(0xFE00 + b) : String.fromCodePoint(0xE0100 + b - 16))).join('') : '');

    const matches = [];
    let carrierMatched = false;

    // Fast-path initial carrier progress update
    const carrierPct = 30 + Math.min(65, Math.round(((c + 0.2) / totalCarriers) * 65));
    const carrierStatus = currentLang === 'ar'
      ? `جاري فحص الناقل (${c + 1} من ${totalCarriers})... ${carrierPct}%`
      : `Scanning carrier (${c + 1} of ${totalCarriers})... ${carrierPct}%`;

    if (typeof onProgress === 'function') {
      onProgress({ percent: carrierPct, statusDetail: carrierStatus });
    }

    // 1. Direct Carrier Fast Path: Try decomposeStego on the carrier message directly
    for (const stKey of stegoKeys) {
      for (const aesKey of aesKeys) {
        try {
          if (typeof decomposeStego === 'function' && carrierMsgText) {
            const decResult = await decomposeStego(carrierMsgText, stKey, aesKey);
            if (decResult && decResult.success && decResult.secretMessage) {
              matches.push({
                index: carrierIndex + 1,
                coverText: decResult.coverText || cleanMessages[carrierIndex] || carrier.cleanBody || '',
                secretMessage: decResult.secretMessage,
                hint: decResult.hint,
                type: 'carrier_fallback',
                usedStegoKey: stKey || (currentLang === 'ar' ? 'افتراضي (بدون مفتاح)' : 'Default (No Key)')
              });
              carrierMatched = true;
              break;
            }
          }
        } catch (err) {}
      }
      if (carrierMatched) break;
    }

    // 2. If direct carrier didn't match, test candidate variations of carrier text itself
    if (!carrierMatched) {
      const carrierCoverCandidates = candidateCoversMap[carrierIndex] || [carrier.cleanBody || ''];
      for (const carrierCover of carrierCoverCandidates) {
        if (!carrierCover || carrierCover.length * 8 < requiredBits) continue;

        const candidateStegoObject = (vsPrefix || '') + carrierCover;
        for (const stKey of stegoKeys) {
          for (const aesKey of aesKeys) {
            try {
              if (typeof decomposeStego === 'function') {
                const decResult = await decomposeStego(candidateStegoObject, stKey, aesKey);
                if (decResult && decResult.success && decResult.secretMessage) {
                  matches.push({
                    index: carrierIndex + 1,
                    coverText: decResult.coverText || carrierCover,
                    secretMessage: decResult.secretMessage,
                    hint: decResult.hint,
                    type: 'carrier_fallback',
                    usedStegoKey: stKey || (currentLang === 'ar' ? 'افتراضي (بدون مفتاح)' : 'Default (No Key)')
                  });
                  carrierMatched = true;
                  break;
                }
              }
            } catch (err) {}
          }
          if (carrierMatched) break;
        }
        if (carrierMatched) break;
      }
    }

    // 3. FAKE COVER SCANNING: Try ALL other clean & candidate messages in the chat
    if (!carrierMatched) {
      for (let i = 0; i < cleanMessages.length; i++) {
        if (i === carrierIndex) continue;

        processedUnits++;
        if (processedUnits % checkpointInterval === 0 || processedUnits === totalWorkUnits) {
          const currentPct = 30 + Math.min(68, Math.round((processedUnits / totalWorkUnits) * 68));
          const stepStatus = currentLang === 'ar'
            ? `جاري فحص وتجربة الأغلفة (${processedUnits} من ${totalWorkUnits})... ${currentPct}%`
            : `Testing cover combinations (${processedUnits} of ${totalWorkUnits})... ${currentPct}%`;
          if (typeof onProgress === 'function') {
            onProgress({ percent: currentPct, statusDetail: stepStatus });
          }
        }

        const candidateCovers = candidateCoversMap[i] || [cleanMessages[i] || ''];
        let foundMatchForMsg = false;

        for (const candidateCover of candidateCovers) {
          if (!candidateCover || candidateCover.length * 8 < requiredBits) continue;

          const candidateStegoObject = (vsPrefix || '') + candidateCover;

          for (const stKey of stegoKeys) {
            for (const aesKey of aesKeys) {
              try {
                if (typeof decomposeStego === 'function') {
                  const decResult = await decomposeStego(candidateStegoObject, stKey, aesKey);
                  if (decResult && decResult.success && decResult.secretMessage) {
                    const isDuplicate = matches.some(m => m.secretMessage === decResult.secretMessage);
                    if (!isDuplicate) {
                      matches.push({
                        index: i + 1,
                        coverText: decResult.coverText || candidateCover,
                        secretMessage: decResult.secretMessage,
                        hint: decResult.hint,
                        type: 'normal',
                        usedStegoKey: stKey || (currentLang === 'ar' ? 'افتراضي (بدون مفتاح)' : 'Default (No Key)')
                      });
                    }
                    foundMatchForMsg = true;
                    carrierMatched = true;
                    break;
                  }
                }
              } catch (err) {}
            }
            if (foundMatchForMsg) break;
          }
          if (foundMatchForMsg) break;
        }
        if (carrierMatched) break;
      }
    }

    carrierResults.push({
      carrierIndex,
      vsKeyLength: rawVsIndices ? rawVsIndices.length : 0,
      matches
    });
    totalMatchesCount += matches.length;
  }

  return {
    carrierResults,
    totalMatchesCount
  };
}
