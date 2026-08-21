// ══════════════════════════════════════════════════════════════
// avif-service.js — AVIF Image Compression Service
// ══════════════════════════════════════════════════════════════
// Provides high-level browser-based AVIF WASM Compression.
// Depends on: avif-engine.js, avif-bridge.js
// ══════════════════════════════════════════════════════════════

(function () {
    'use strict';

    /**
     * Extracts raw ImageData (RGBA) from any image file (PNG/JPEG/WebP) using a canvas.
     */
    async function getImagePixels(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);
            img.src = objectUrl;

            img.onload = () => {
                URL.revokeObjectURL(objectUrl);
                try {
                    const canvas = typeof OffscreenCanvas !== 'undefined'
                        ? new OffscreenCanvas(img.width, img.height)
                        : document.createElement('canvas');
                    
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    const ctx = canvas.getContext('2d');
                    if (!ctx) throw new Error("Could not acquire 2D rendering context.");
                    
                    ctx.drawImage(img, 0, 0);
                    const imageData = ctx.getImageData(0, 0, img.width, img.height);
                    resolve(imageData);
                } catch (err) {
                    reject(new Error("Pixel extraction failed: " + err.message));
                }
            };

            img.onerror = (err) => {
                URL.revokeObjectURL(objectUrl);
                reject(new Error("Failed to load image file."));
            };
        });
    }

    /**
     * Compresses any image File/Blob into high-efficiency AVIF format directly.
     */
    async function compressToAvif(file, options = {}) {
        if (!avifReady) {
            if (window.avifInitError) {
                throw new Error("AVIF WASM engine failed to initialize: " + window.avifInitError.message);
            }
            // Wait for it to become ready or fail
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    window.removeEventListener('avif-ready', onReady);
                    window.removeEventListener('avif-failed', onFailed);
                    reject(new Error("AVIF WASM engine initialization timed out. Please check console errors."));
                }, 5000);

                const onReady = () => {
                    clearTimeout(timeout);
                    window.removeEventListener('avif-failed', onFailed);
                    resolve();
                };
                const onFailed = (e) => {
                    clearTimeout(timeout);
                    window.removeEventListener('avif-ready', onReady);
                    reject(new Error("AVIF WASM engine failed to initialize: " + (e.detail ? e.detail.message : "Unknown error")));
                };
                window.addEventListener('avif-ready', onReady, { once: true });
                window.addEventListener('avif-failed', onFailed, { once: true });
            });
        }

        const quality = options.quality !== undefined ? options.quality : 70;
        const speed = options.speed !== undefined ? options.speed : 9;

        // 1. Extract raw RGBA pixels from the file
        const imageData = await getImagePixels(file);

        // 2. Perform direct in-memory compression using the initialized WASM engine
        const compressedBuffer = await window.encodeAvif(imageData, { quality, speed });
        
        return new Uint8Array(compressedBuffer);
    }

    // Expose global hooks
    window.getImagePixels = getImagePixels;
    window.compressToAvif = compressToAvif;
})();
