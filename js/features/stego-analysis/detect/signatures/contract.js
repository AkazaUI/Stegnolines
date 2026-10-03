/**
 * @file contract.js
 * @description Schema contract, constants, and validation rules for Steganalysis signature profiles.
 */

(function (global) {
  'use strict';

  const SCHEMA_VERSION = 1;

  const VALID_KINDS = Object.freeze(['tool', 'technique', 'research', 'watermark']);

  const VALID_MATCHER_KINDS = Object.freeze([
    'legacy-exact-set',
    'legacy-variation-selectors',
    'legacy-whitespace',
    'legacy-watermark-subset'
  ]);

  const VALID_PLACEMENT_STATUSES = Object.freeze(['pending', 'supplied', 'researched']);

  function isPlainObject(val) {
    return val !== null && typeof val === 'object' && !Array.isArray(val);
  }

  function assertString(val, fieldName) {
    if (typeof val !== 'string' || val.trim().length === 0) {
      throw new Error(`Invalid or missing string field: ${fieldName}`);
    }
  }

  function assertNonEmptyArray(val, fieldName) {
    if (!Array.isArray(val) || val.length === 0) {
      throw new Error(`Field must be a non-empty array: ${fieldName}`);
    }
  }

  function validateCodePoint(cp, fieldName) {
    if (!Number.isInteger(cp) || cp < 0 || cp > 0x10FFFF) {
      throw new Error(`Invalid Unicode code point in ${fieldName}: ${cp}`);
    }
  }

  function checkForFunctionsOrDOM(obj, path = 'profile') {
    if (obj === null || obj === undefined) return;
    if (typeof obj === 'function') {
      throw new Error(`Functions are not allowed in profile data: ${path}`);
    }
    if (typeof obj === 'object') {
      // Check for DOM nodes in browser environment
      if (typeof window !== 'undefined' && typeof Node !== 'undefined' && obj instanceof Node) {
        throw new Error(`DOM elements are not allowed in profile data: ${path}`);
      }
      for (const key of Object.keys(obj)) {
        checkForFunctionsOrDOM(obj[key], `${path}.${key}`);
      }
    }
  }

  /**
   * Validates a profile object against Schema v1.
   *
   * @param {Object} profile - Signature profile to validate.
   * @throws {Error} If validation fails.
   */
  function validateProfile(profile) {
    if (!isPlainObject(profile)) {
      throw new Error('Profile must be a non-null object');
    }

    checkForFunctionsOrDOM(profile);

    if (profile.schemaVersion !== SCHEMA_VERSION) {
      throw new Error(`Unsupported schemaVersion: expected ${SCHEMA_VERSION}, received ${profile.schemaVersion}`);
    }

    assertString(profile.id, 'profile.id');

    if (VALID_KINDS.indexOf(profile.kind) === -1) {
      throw new Error(`Invalid profile kind: ${profile.kind}. Expected one of: ${VALID_KINDS.join(', ')}`);
    }

    assertNonEmptyArray(profile.legacyIds, 'profile.legacyIds');
    for (let i = 0; i < profile.legacyIds.length; i++) {
      assertString(profile.legacyIds[i], `profile.legacyIds[${i}]`);
    }

    if (!isPlainObject(profile.identity)) {
      throw new Error('profile.identity must be a non-null object');
    }
    assertString(profile.identity.name, 'profile.identity.name');
    assertString(profile.identity.titleAr, 'profile.identity.titleAr');
    assertString(profile.identity.titleEn, 'profile.identity.titleEn');

    assertNonEmptyArray(profile.modes, 'profile.modes');

    const seenModeIds = new Set();
    /** @type {string[]} */
    const modeLegacyIds = [];

    for (let i = 0; i < profile.modes.length; i++) {
      const mode = profile.modes[i];
      const modePath = `profile.modes[${i}]`;

      if (!isPlainObject(mode)) {
        throw new Error(`${modePath} must be an object`);
      }

      assertString(mode.id, `${modePath}.id`);
      if (seenModeIds.has(mode.id)) {
        throw new Error(`Duplicate mode id "${mode.id}" inside profile "${profile.id}"`);
      }
      seenModeIds.add(mode.id);

      assertString(mode.legacyId, `${modePath}.legacyId`);
      modeLegacyIds.push(mode.legacyId);

      if (typeof mode.enabled !== 'boolean') {
        throw new Error(`${modePath}.enabled must be a boolean`);
      }

      // Carrier Signature validation
      if (!isPlainObject(mode.carrierSignature)) {
        throw new Error(`${modePath}.carrierSignature must be an object`);
      }
      const cs = mode.carrierSignature;

      if (VALID_MATCHER_KINDS.indexOf(cs.matcherKind) === -1) {
        throw new Error(`Invalid matcherKind "${cs.matcherKind}" at ${modePath}. Expected one of: ${VALID_MATCHER_KINDS.join(', ')}`);
      }

      if (cs.matcherKind === 'legacy-exact-set' || cs.matcherKind === 'legacy-watermark-subset') {
        assertNonEmptyArray(cs.exactSymbols, `${modePath}.carrierSignature.exactSymbols`);
        for (let s = 0; s < cs.exactSymbols.length; s++) {
          validateCodePoint(cs.exactSymbols[s], `${modePath}.carrierSignature.exactSymbols[${s}]`);
        }

        if (Array.isArray(cs.alternateExactSymbols)) {
          for (let s = 0; s < cs.alternateExactSymbols.length; s++) {
            validateCodePoint(cs.alternateExactSymbols[s], `${modePath}.carrierSignature.alternateExactSymbols[${s}]`);
          }
        }

        if (!Number.isInteger(cs.minCount) || cs.minCount < 1) {
          throw new Error(`${modePath}.carrierSignature.minCount must be an integer >= 1`);
        }
      }

      if (cs.matcherKind === 'legacy-whitespace') {
        if (!Number.isInteger(cs.minCount) || cs.minCount < 1) {
          throw new Error(`${modePath}.carrierSignature.minCount must be an integer >= 1`);
        }
      }

      if (cs.matcherKind === 'legacy-variation-selectors') {
        if (!Number.isInteger(cs.minCount) || cs.minCount < 1) {
          throw new Error(`${modePath}.carrierSignature.minCount must be an integer >= 1`);
        }
      }

      if (cs.legacyFlags !== undefined && !isPlainObject(cs.legacyFlags)) {
        throw new Error(`${modePath}.carrierSignature.legacyFlags must be an object if present`);
      }

      // Placement Signatures container validation (mandatory placeholder)
      if (!isPlainObject(mode.placementSignatures)) {
        throw new Error(`${modePath}.placementSignatures must be an object`);
      }
      const ps = mode.placementSignatures;

      if (VALID_PLACEMENT_STATUSES.indexOf(ps.status) === -1) {
        throw new Error(`Invalid placement status "${ps.status}" at ${modePath}. Expected one of: ${VALID_PLACEMENT_STATUSES.join(', ')}`);
      }

      if (!Array.isArray(ps.definitions)) {
        throw new Error(`${modePath}.placementSignatures.definitions must be an array`);
      }

      if (ps.status === 'pending' && ps.definitions.length > 0) {
        throw new Error(`${modePath}.placementSignatures with status "pending" must have empty definitions`);
      }

      // Presentation validation
      if (!isPlainObject(mode.presentation)) {
        throw new Error(`${modePath}.presentation must be an object`);
      }
    }

    // Ensure all profile.legacyIds match mode legacyIds
    for (const lid of profile.legacyIds) {
      if (!modeLegacyIds.includes(lid)) {
        throw new Error(`profile.legacyIds contains "${lid}" but no mode implements it in profile "${profile.id}"`);
      }
    }
    for (const lid of modeLegacyIds) {
      if (!profile.legacyIds.includes(lid)) {
        throw new Error(`mode.legacyId "${lid}" is not listed in profile.legacyIds for profile "${profile.id}"`);
      }
    }

    return true;
  }

  const Contract = Object.freeze({
    SCHEMA_VERSION,
    VALID_KINDS,
    VALID_MATCHER_KINDS,
    VALID_PLACEMENT_STATUSES,
    validateProfile
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Contract;
  } else {
    global.StegSignatures = global.StegSignatures || {};
    global.StegSignatures.Contract = Contract;
  }
})(typeof window !== 'undefined' ? window : globalThis);
