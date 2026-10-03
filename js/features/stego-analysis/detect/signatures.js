/**
 * @file signatures.js
 * @description Backward compatibility facade for Steganography Signatures.
 * Forwards to the modular signatures architecture under signatures/index.js.
 * This facade retains NO signature definitions directly.
 */

(function (global) {
  'use strict';

  let SignaturesModule;

  if (typeof module !== 'undefined' && module.exports) {
    SignaturesModule = require('./signatures/index.js');
  } else {
    SignaturesModule = global.StegSignatures || {};
  }

  const STEGO_SIGNATURES_REGISTRY = SignaturesModule.STEGO_SIGNATURES_REGISTRY;
  const matchSignaturesDetailed = SignaturesModule.matchSignaturesDetailed;

  global.STEGO_SIGNATURES_REGISTRY = STEGO_SIGNATURES_REGISTRY;
  global.StegSignatures = global.StegSignatures || {};
  global.StegSignatures.STEGO_SIGNATURES_REGISTRY = STEGO_SIGNATURES_REGISTRY;
  global.StegSignatures.matchSignaturesDetailed = matchSignaturesDetailed;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      STEGO_SIGNATURES_REGISTRY,
      matchSignaturesDetailed,
      ...SignaturesModule
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
