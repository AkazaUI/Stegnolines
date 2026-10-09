/**
 * @file legacy-adapter.js
 * @description Adapts modular signature profiles and modes into the legacy flat 12-entry registry.
 * Guarantees 100% backward compatibility and exact object shape parity.
 */

(function (global) {
  'use strict';

  /**
   * Converts a single (profile, mode) pair to a legacy flat entry.
   *
   * @param {Object} profile - Parent profile.
   * @param {Object} mode - Specific mode under the profile.
   * @returns {Object} Legacy flat entry.
   */
  function toLegacyEntry(profile, mode) {
    const legacy = {};

    legacy.id = mode.legacyId;
    legacy.type = profile.kind;
    legacy.name = (mode.presentation && mode.presentation.name) || profile.identity.name;
    legacy.titleAr = (mode.presentation && mode.presentation.titleAr) || profile.identity.titleAr;
    legacy.titleEn = (mode.presentation && mode.presentation.titleEn) || profile.identity.titleEn;

    const descAr = (mode.presentation && mode.presentation.descriptionAr) !== undefined
      ? mode.presentation.descriptionAr
      : profile.identity.descriptionAr;
    if (descAr !== undefined) {
      legacy.descAr = descAr;
    }

    const descEn = (mode.presentation && mode.presentation.descriptionEn) !== undefined
      ? mode.presentation.descriptionEn
      : profile.identity.descriptionEn;
    if (descEn !== undefined) {
      legacy.descEn = descEn;
    }

    if (profile.identity && profile.identity.doi !== undefined) {
      legacy.doi = profile.identity.doi;
    }

    if (profile.identity && profile.identity.url !== undefined) {
      legacy.url = profile.identity.url;
    }

    if (profile.identity && profile.identity.secondaryUrl !== undefined) {
      legacy.secondaryUrl = profile.identity.secondaryUrl;
    }

    const cs = mode.carrierSignature || {};
    if (cs.legacyFlags) {
      for (const [key, val] of Object.entries(cs.legacyFlags)) {
        legacy[key] = val;
      }
    }

    if (cs.exactSymbols !== undefined) {
      legacy.exactSymbols = [...cs.exactSymbols];
    }

    if (Array.isArray(cs.alternateExactSymbols) && cs.alternateExactSymbols.length > 0) {
      legacy.altExactSymbols = [...cs.alternateExactSymbols];
    }

    if (cs.minCount !== undefined) {
      legacy.minCount = cs.minCount;
    }

    if (mode.presentation && mode.presentation.candidateTools !== undefined) {
      legacy.candidateTools = JSON.parse(JSON.stringify(mode.presentation.candidateTools));
    }

    if (mode.presentation && mode.presentation.encodingTableTitle !== undefined) {
      legacy.encodingTableTitle = mode.presentation.encodingTableTitle;
    }

    if (mode.presentation && mode.presentation.encodingTable !== undefined) {
      legacy.encodingTable = JSON.parse(JSON.stringify(mode.presentation.encodingTable));
    }

    return legacy;
  }

  /**
   * Flattens all modes across all registered profiles in order.
   *
   * @param {Object} registry - Signature registry instance.
   * @returns {Array<Object>} Frozen array of legacy flat entries.
   */
  function flattenRegistry(registry) {
    const modes = registry.getModes();
    const flattened = modes.map(({ profile, mode }) => toLegacyEntry(profile, mode));
    return Object.freeze(flattened);
  }

  const LegacyAdapter = Object.freeze({
    toLegacyEntry,
    flattenRegistry
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LegacyAdapter;
  } else {
    global.StegSignatures = global.StegSignatures || {};
    global.StegSignatures.LegacyAdapter = LegacyAdapter;
  }
})(typeof window !== 'undefined' ? window : globalThis);
