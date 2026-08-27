/**
 * ══════════════════════════════════════════════════════════════
 * StegoLine — Stego Worker Service (Client Bridge)
 * ══════════════════════════════════════════════════════════════
 *
 * Provides a Promise-based asynchronous abstraction layer over
 * the Stego Engine Web Worker. Offloads CPU-intensive PBKDF2 (100K rounds),
 * Brotli compression (Q11), AES-CTR encryption, and VS Permutations to
 * a dedicated background OS thread.
 *
 * Implements:
 *   - Auto-spawning lazy Web Worker instance
 *   - Request ID multiplexing & concurrency safety
 *   - Automatic fallback to main-thread asynchronous execution
 *   - Memory safety via Promise cleanup & timeout protection
 *
 * Adheres to Clean Code principles (DRY, SRP, Defensive Coding).
 * ══════════════════════════════════════════════════════════════
 */

'use strict';

const StegoWorkerService = (function () {
  let _worker = null;
  let _requestId = 0;
  const _pendingRequests = new Map();
  let _workerFailedPermanently = false;

  /**
   * Determine whether Web Workers are supported in the current environment.
   * @returns {boolean}
   */
  function isWorkerSupported() {
    return typeof Worker !== 'undefined' && !_workerFailedPermanently;
  }

  /**
   * Resolve the Web Worker URL relative to the script location.
   * Prevents broken paths if hosted on subdomains or subdirectories.
   * @returns {string}
   */
  function _resolveWorkerUrl() {
    if (typeof document !== 'undefined' && document.currentScript && document.currentScript.src) {
      try {
        return new URL('stego-engine.worker.js', document.currentScript.src).href;
      } catch (_) {}
    }
    return 'js/core/stego/stego-engine.worker.js';
  }

  /**
   * Get or lazily initialize the Stego Engine Web Worker.
   * @returns {Worker|null}
   */
  function _getOrCreateWorker() {
    if (_workerFailedPermanently) return null;
    if (_worker) return _worker;
    if (typeof Worker === 'undefined') return null;

    try {
      _worker = new Worker(_resolveWorkerUrl());

      _worker.onmessage = function (e) {
        const { id, type, success, result, error, percent, statusDetail } = e.data || {};
        if (id && _pendingRequests.has(id)) {
          const req = _pendingRequests.get(id);

          // Streaming progress update without resolving request
          if (type === 'PROGRESS') {
            if (typeof req.onProgress === 'function') {
              req.onProgress({ percent, statusDetail });
            }
            return;
          }

          const { resolve, reject, timer } = req;
          clearTimeout(timer);
          _pendingRequests.delete(id);

          if (success) {
            resolve(result);
          } else {
            reject(new Error(error || 'Worker execution failed.'));
          }
        }
      };

      _worker.onerror = function (err) {
        console.warn('[StegoWorkerService] Worker runtime error, activating fallback:', err);
        _handleWorkerCrash(err);
      };

      return _worker;
    } catch (err) {
      console.warn('[StegoWorkerService] Unable to initialize Web Worker (fallback enabled):', err);
      _workerFailedPermanently = true;
      return null;
    }
  }

  /**
   * Handle unexpected worker crash by rejecting all pending requests and resetting instance.
   * @param {Error|Event} err
   */
  function _handleWorkerCrash(err) {
    if (_worker) {
      try {
        _worker.terminate();
      } catch (_) {}
      _worker = null;
    }

    _pendingRequests.forEach(({ reject, timer }) => {
      clearTimeout(timer);
      reject(new Error('Stego Web Worker crashed unexpectedly.'));
    });
    _pendingRequests.clear();
  }

  /**
   * Yield execution to the browser event loop so UI frames/spinners can repaint.
   * @returns {Promise<void>}
   */
  function _yieldToMainThread() {
    return new Promise(resolve => {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => setTimeout(resolve, 0));
      } else {
        setTimeout(resolve, 0);
      }
    });
  }

  /**
   * Execute task directly on the main UI thread with yield to avoid UI freeze.
   */
  function _executeMainThreadAction(action, payload, onProgress) {
    return _yieldToMainThread().then(async () => {
      if (action === 'COMPOSE_STEGO') {
        if (typeof composeStego !== 'function') {
          throw new Error('composeStego engine is not available.');
        }
        const { coverText, secretMessage, hint, stegoKey, encryptionKey, fakeCoverText } = payload;
        return await composeStego(coverText, secretMessage, hint, stegoKey, encryptionKey, fakeCoverText);
      } else if (action === 'DECOMPOSE_STEGO') {
        if (typeof decomposeStego !== 'function') {
          throw new Error('decomposeStego engine is not available.');
        }
        const { stegoText, rawStegoKey, encryptionKey } = payload;
        return await decomposeStego(stegoText, rawStegoKey, encryptionKey);
      } else if (action === 'SCAN_CHAT_PAYLOADS') {
        return await _fallbackScanChatPayloads(payload, onProgress);
      } else {
        throw new Error(`Unknown action: ${action}`);
      }
    });
  }

  /**
   * Send a task message to the Web Worker, or execute via main-thread fallback.
   *
   * @param {string} action  - Action name ('COMPOSE_STEGO' | 'DECOMPOSE_STEGO' | 'SCAN_CHAT_PAYLOADS').
   * @param {object} payload - Action arguments object.
   * @param {number} [timeoutMs=120000] - Timeout limit in milliseconds.
   * @param {Function} [onProgress] - Optional streaming progress callback.
   * @returns {Promise<any>}
   */
  function _dispatch(action, payload, timeoutMs = 120000, onProgress = null) {
    const worker = _getOrCreateWorker();

    if (worker) {
      return new Promise((resolve, reject) => {
        const id = ++_requestId;

        const timer = setTimeout(() => {
          if (_pendingRequests.has(id)) {
            _pendingRequests.delete(id);
            reject(new Error(`Stego operation timed out after ${timeoutMs / 1000}s.`));
          }
        }, timeoutMs);

        _pendingRequests.set(id, { resolve, reject, timer, onProgress });

        worker.postMessage({
          id,
          action,
          payload
        });
      }).catch(async (err) => {
        // If worker fails due to runtime script/environment issue, fall back seamlessly to main thread
        if (err && err.message && (err.message.includes('not available') || err.message.includes('not defined') || err.message.includes('Worker'))) {
          console.warn('[StegoWorkerService] Web Worker runtime issue, falling back to main-thread execution:', err);
          _workerFailedPermanently = true;
          return await _executeMainThreadAction(action, payload, onProgress);
        }
        throw err;
      });
    }

    // ── Graceful Fallback: Asynchronous execution on Main Thread ──
    return _executeMainThreadAction(action, payload, onProgress);
  }

  /**
   * Main thread fallback for chat payload scanning when Web Worker is unsupported.
   */
  async function _fallbackScanChatPayloads(payload, onProgress) {
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

      const carrierPct = 30 + Math.min(65, Math.round(((c + 0.2) / totalCarriers) * 65));
      const carrierStatus = currentLang === 'ar'
        ? `جاري فحص الناقل (${c + 1} من ${totalCarriers})... ${carrierPct}%`
        : `Scanning carrier (${c + 1} of ${totalCarriers})... ${carrierPct}%`;

      if (typeof onProgress === 'function') {
        onProgress({ percent: carrierPct, statusDetail: carrierStatus });
      }
      await _yieldToMainThread();

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
            await _yieldToMainThread();
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

  /**
   * Asynchronously compose steganographic data without blocking the UI.
   *
   * @param {string} coverText     - The clean carrier text.
   * @param {string} secretMessage - The secret payload.
   * @param {string} [hint]        - Optional hint.
   * @param {string} stegoKey      - Pre-shared key for PRNG seeding.
   * @param {string} [encryptionKey] - Optional AES-CTR password.
   * @param {string} [fakeCoverText] - Optional fake cover for split mode.
   * @returns {Promise<object>} Stego composition trace object.
   */
  function composeStegoAsync(coverText, secretMessage, hint, stegoKey, encryptionKey, fakeCoverText) {
    return _dispatch('COMPOSE_STEGO', {
      coverText,
      secretMessage,
      hint,
      stegoKey,
      encryptionKey,
      fakeCoverText
    });
  }

  /**
   * Asynchronously decompose steganographic data without blocking the UI.
   *
   * @param {string} stegoText     - The carrier text containing invisible VS characters.
   * @param {string} rawStegoKey   - Pre-shared key.
   * @param {string} [encryptionKey] - Optional AES-CTR password.
   * @returns {Promise<object>} Extracted secret message and hint.
   */
  function decomposeStegoAsync(stegoText, rawStegoKey, encryptionKey) {
    return _dispatch('DECOMPOSE_STEGO', {
      stegoText,
      rawStegoKey,
      encryptionKey
    });
  }

  /**
   * Asynchronously scan chat messages and combinations in background Web Worker.
   *
   * @param {object} scanPayload - Payload containing carriers, cleanMessages, candidateCoversMap, stegoKeys, aesKeys.
   * @param {Function} [onProgress] - Optional progress notification callback.
   * @returns {Promise<{ carrierResults: Array, totalMatchesCount: number }>}
   */
  function scanChatPayloadsAsync(scanPayload, onProgress) {
    return _dispatch('SCAN_CHAT_PAYLOADS', scanPayload, 180000, onProgress);
  }

  /**
   * Eagerly warm up the Web Worker during idle time so first click is instantaneous.
   */
  function warmup() {
    _getOrCreateWorker();
  }

  // Auto warmup on idle / page load
  if (typeof window !== 'undefined') {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => warmup());
    } else {
      setTimeout(() => warmup(), 200);
    }
  }

  /**
   * Terminate the worker instance and release all resources.
   */
  function terminate() {
    if (_worker) {
      try {
        _worker.terminate();
      } catch (_) {}
      _worker = null;
    }
    _pendingRequests.clear();
  }

  return {
    isWorkerSupported,
    composeStegoAsync,
    decomposeStegoAsync,
    scanChatPayloadsAsync,
    _fallbackScanChatPayloads,
    warmup,
    terminate
  };
})();

// Attach globally for accessibility across legacy script tags
if (typeof window !== 'undefined') {
  window.StegoWorkerService = StegoWorkerService;
}
