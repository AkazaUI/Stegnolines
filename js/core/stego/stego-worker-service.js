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
   * Get or lazily initialize the Stego Engine Web Worker.
   * @returns {Worker|null}
   */
  function _getOrCreateWorker() {
    if (_workerFailedPermanently) return null;
    if (_worker) return _worker;
    if (typeof Worker === 'undefined') return null;

    try {
      _worker = new Worker('js/core/stego/stego-engine.worker.js');

      _worker.onmessage = function (e) {
        const { id, success, result, error } = e.data || {};
        if (id && _pendingRequests.has(id)) {
          const { resolve, reject, timer } = _pendingRequests.get(id);
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
   * Send a task message to the Web Worker, or execute via main-thread fallback.
   *
   * @param {string} action  - Action name ('COMPOSE_STEGO' | 'DECOMPOSE_STEGO').
   * @param {object} payload - Action arguments object.
   * @param {number} [timeoutMs=60000] - Timeout limit in milliseconds.
   * @returns {Promise<any>}
   */
  function _dispatch(action, payload, timeoutMs = 60000) {
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

        _pendingRequests.set(id, { resolve, reject, timer });

        worker.postMessage({
          id,
          action,
          payload
        });
      });
    }

    // ── Graceful Fallback: Asynchronous execution on Main Thread ──
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
      } else {
        throw new Error(`Unknown action: ${action}`);
      }
    });
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
    warmup,
    terminate
  };
})();

// Attach globally for accessibility across legacy script tags
if (typeof window !== 'undefined') {
  window.StegoWorkerService = StegoWorkerService;
}
