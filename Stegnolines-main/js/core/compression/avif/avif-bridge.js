// ══════════════════════════════════════════════════════════════
// WASM Bridge — Lightweight AVIF WASM initializer
// ══════════════════════════════════════════════════════════════
//
// Purpose: Initializes the AVIF-WASM compression engine for
//          use in the embedding/extraction pipeline.
//
// Dependencies: avif-engine.js (AVIF_WASM_BASE64, initAvif, encodeAvif)
// ══════════════════════════════════════════════════════════════

var avifReady = false;
var avifInitError = null;

(async function () {
    'use strict';

    // Helper: decode base64 to ArrayBuffer
    function _base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    // Guard: skip if WASM engine was already initialized.
    if (avifReady) return;

    // Ensure the base WASM script has been loaded.
    if (typeof AVIF_WASM_BASE64 === 'undefined' || typeof initAvif !== 'function') {
        console.error('[avif_bridge] avif-engine.js must be loaded before this script.');
        return;
    }

    // --- Initialize WASM engine synchronously/asynchronously ---
    try {
        var wasmBytes = _base64ToArrayBuffer(AVIF_WASM_BASE64);
        await initAvif(wasmBytes);
        avifReady = true;
        console.log('[avif_bridge] AVIF WASM engine successfully initialized!');
        window.dispatchEvent(new CustomEvent('avif-ready'));
    } catch (err) {
        avifInitError = err;
        console.error('[avif_bridge] Failed to initialize AVIF WASM engine:', err.message);
        window.dispatchEvent(new CustomEvent('avif-failed', { detail: err }));
    }
})();
