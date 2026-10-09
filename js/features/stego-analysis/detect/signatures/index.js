/**
 * @file index.js
 * @description Central facade for Steganalysis signature profiles and detection signatures.
 * Compatible with Node.js CommonJS and browser script tags.
 */

(function (global) {
  'use strict';

  const isNode = typeof module !== 'undefined' && module.exports;

  let Contract;
  let Registry;
  let Manifest;
  let LegacyAdapter;
  let Matcher;

  if (isNode) {
    const path = require('path');
    Contract = require('./contract.js');
    Registry = require('./registry.js');
    Manifest = require('./manifest.js');
    LegacyAdapter = require('./legacy-adapter.js');
    Matcher = require('./legacy-matcher.js');

    // In CommonJS, ensure all profiles from Manifest are loaded and registered
    if (!Registry.isFinalized()) {
      for (const item of Manifest) {
        const fullPath = path.resolve(__dirname, item.path);
        const profile = require(fullPath);
        Registry.registerProfile(profile);
      }
      Registry.finalizeRegistry();
    }
  } else {
    Contract = global.StegSignatures && global.StegSignatures.Contract;
    Registry = global.StegSignatures && global.StegSignatures.Registry;
    Manifest = global.StegSignatures && global.StegSignatures.Manifest;
    LegacyAdapter = global.StegSignatures && global.StegSignatures.LegacyAdapter;
    Matcher = global.StegSignatures && global.StegSignatures.Matcher;

    if (!Registry || !LegacyAdapter || !Matcher) {
      throw new Error('Signatures core dependencies must be loaded before signatures/index.js');
    }

    if (!Registry.isFinalized()) {
      Registry.finalizeRegistry();
    }
  }

  const STEGO_SIGNATURES_REGISTRY = LegacyAdapter.flattenRegistry(Registry);
  const matchSignaturesDetailed = (candidateObservations, text, snowData) => {
    return Matcher.matchSignaturesDetailed(candidateObservations, text, snowData, STEGO_SIGNATURES_REGISTRY);
  };

  // Expose on browser globals
  global.STEGO_SIGNATURES_REGISTRY = STEGO_SIGNATURES_REGISTRY;
  global.StegSignatures = global.StegSignatures || {};
  global.StegSignatures.STEGO_SIGNATURES_REGISTRY = STEGO_SIGNATURES_REGISTRY;
  global.StegSignatures.matchSignaturesDetailed = matchSignaturesDetailed;
  global.StegSignatures.Contract = Contract;
  global.StegSignatures.Registry = Registry;
  global.StegSignatures.SignatureRegistry = Registry;
  global.StegSignatures.LegacyAdapter = LegacyAdapter;
  global.StegSignatures.Manifest = Manifest;

  if (isNode) {
    module.exports = {
      Contract,
      Registry,
      SignatureRegistry: Registry,
      Manifest,
      LegacyAdapter,
      SignatureProfiles: Registry.getProfiles(),
      STEGO_SIGNATURES_REGISTRY,
      matchSignaturesDetailed
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
