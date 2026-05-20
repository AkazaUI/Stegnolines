// ══════════════════════════════════════════════════════════════
// WASM Bridge — Lightweight Brotli WASM initializer
// ══════════════════════════════════════════════════════════════
//
// Purpose: Initializes the Brotli-WASM compression engine for
//          use in the embedding/extraction pipeline.
//
// This script calls initSync() to instantiate the WASM module
// so that doStreamCompress / doStreamDecompress from compression.js
// are ready when the pipeline runs.
//
// Usage: Load AFTER Wasm_Load_&_Init.JS and BEFORE compression.js.
//
// Dependencies: Wasm_Load_&_Init.JS (WASM_BASE64, initSync, helpers)
// ══════════════════════════════════════════════════════════════

// Declare wasmReady (encoding.js normally owns this variable on
// the standalone compression page, but isn't loaded here).
var wasmReady = false;

(function () {
    'use strict';

    // Guard: skip if WASM engine was already initialized.
    if (wasmReady) return;

    // Ensure the base WASM script has been loaded.
    if (typeof WASM_BASE64 === 'undefined' || typeof initSync !== 'function') {
        console.error('[wasm_bridge] Wasm_Load_&_Init.JS must be loaded before this script.');
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
