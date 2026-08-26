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
