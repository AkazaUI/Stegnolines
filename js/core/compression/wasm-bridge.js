// ══════════════════════════════════════════════════════════════
// WASM Bridge — Lightweight Brotli WASM initializer
// ══════════════════════════════════════════════════════════════
//
// Purpose: Initializes the Brotli-WASM compression engine for
//          use in the embedding/extraction pipeline.
//
// This script calls initSync() to instantiate the WASM module
// so that doStreamCompress / doStreamDecompress from brotli-service.js
// are ready when the pipeline runs.
//
// Dependencies: wasm-engine.js (WASM_BASE64, initSync, helpers)
// ══════════════════════════════════════════════════════════════

var wasmReady = false;

(function () {
    'use strict';

    // Guard: skip if WASM engine was already initialized.
    if (wasmReady) return;

    // Ensure the base WASM script has been loaded.
    if (typeof WASM_BASE64 === 'undefined' || typeof initSync !== 'function') {
        console.error('[wasm_bridge] wasm-engine.js must be loaded before this script.');
        return;
    }

    // --- Initialize WASM engine synchronously ---
    try {
        var wasmBytes = _base64ToArrayBuffer(WASM_BASE64);
        initSync(wasmBytes);
        wasmReady = true;
    } catch (err) {
        console.error('[wasm_bridge] Failed to initialize Brotli WASM engine:', err.message);
    }
})();
