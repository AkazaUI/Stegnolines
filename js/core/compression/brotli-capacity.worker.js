/**
 * ══════════════════════════════════════════════════════════════
 * StegoLine — Brotli Capacity Web Worker
 * ══════════════════════════════════════════════════════════════
 *
 * Purpose: Performs asynchronous, isolated Brotli (Quality 11) compression
 * calculations on a background thread. Prevents any UI stutter or frame
 * drops on the main thread during typing.
 *
 * Dependencies: wasm-engine.js, wasm-bridge.js, brotli-service.js
 * ══════════════════════════════════════════════════════════════
 */

'use strict';

try {
  importScripts('wasm-engine.js', 'wasm-bridge.js', 'brotli-service.js');
} catch (e) {
  // Graceful fallback if imported scripts path fails in custom origins
  console.warn('[brotli-capacity.worker] Failed to importScripts:', e);
}

self.onmessage = function (e) {
  const { id, payloadBytes } = e.data || {};

  try {
    if (!payloadBytes || payloadBytes.length === 0) {
      self.postMessage({
        id,
        success: true,
        rawBytesLength: 0,
        compressedBytesLength: 0,
        finalBytesLength: 0,
        isCompressed: false,
        savingsPercent: 0
      });
      return;
    }

    const u8Payload = new Uint8Array(payloadBytes);
    const rawLen = u8Payload.length;

    // Perform exact Brotli Stream Compression (Quality 11)
    const compressed = doStreamCompress(u8Payload);
    let finalLen = rawLen;
    let isCompressed = false;

    // In stego-composer.js: 1 byte header (0xFE) is added when compressed is smaller
    if (compressed && compressed.length < rawLen) {
      finalLen = compressed.length + 1;
      isCompressed = true;
    }

    const savingsPercent = (rawLen > 0 && isCompressed)
      ? Math.max(0, ((rawLen - finalLen) / rawLen) * 100)
      : 0;

    self.postMessage({
      id,
      success: true,
      rawBytesLength: rawLen,
      compressedBytesLength: compressed ? compressed.length : rawLen,
      finalBytesLength: finalLen,
      isCompressed,
      savingsPercent
    });
  } catch (err) {
    self.postMessage({
      id,
      success: false,
      error: err.message || 'Worker compression calculation failed.'
    });
  }
};
