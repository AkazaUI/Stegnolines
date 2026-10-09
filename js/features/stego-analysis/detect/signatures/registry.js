/**
 * @file registry.js
 * @description Central in-memory registry for Steganalysis signature profiles.
 * Supports registration, validation, finalization, and immutable lookups.
 */

(function (global) {
  'use strict';

  const Contract = (typeof module !== 'undefined' && module.exports)
    ? require('./contract.js')
    : (global.StegSignatures && global.StegSignatures.Contract);

  if (!Contract) {
    throw new Error('Contract module must be loaded before registry.js');
  }

  function deepFreeze(obj) {
    if (!obj || typeof obj !== 'object' || Object.isFrozen(obj)) {
      return obj;
    }
    Object.freeze(obj);
    for (const key of Object.getOwnPropertyNames(obj)) {
      const prop = obj[key];
      if (prop !== null && (typeof prop === 'object' || typeof prop === 'function')) {
        deepFreeze(prop);
      }
    }
    return obj;
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  class SignatureRegistryStore {
    constructor() {
      this._profiles = [];
      this._profileMap = new Map();
      this._legacyIdMap = new Map();
      this._modeMap = new Map(); // key: `${profileId}:${modeId}`
      this._finalized = false;
    }

    /**
     * Resets the registry state (mainly for testing).
     */
    reset() {
      this._profiles = [];
      this._profileMap.clear();
      this._legacyIdMap.clear();
      this._modeMap.clear();
      this._finalized = false;
    }

    /**
     * Registers a new profile into the registry.
     *
     * @param {Object} rawProfile - Signature profile object.
     */
    registerProfile(rawProfile) {
      if (this._finalized) {
        throw new Error('Cannot register profile: registry is already finalized and immutable.');
      }

      Contract.validateProfile(rawProfile);

      if (this._profileMap.has(rawProfile.id)) {
        throw new Error(`Profile with id "${rawProfile.id}" is already registered.`);
      }

      // Check legacyId global uniqueness across all previously registered profiles
      for (const legacyId of rawProfile.legacyIds) {
        if (this._legacyIdMap.has(legacyId)) {
          throw new Error(`legacyId "${legacyId}" is already registered by profile "${this._legacyIdMap.get(legacyId).profileId}".`);
        }
      }

      // Clone to isolate from external mutation prior to finalization
      const profileCopy = deepClone(rawProfile);

      this._profiles.push(profileCopy);
      this._profileMap.set(profileCopy.id, profileCopy);

      for (const mode of profileCopy.modes) {
        this._legacyIdMap.set(mode.legacyId, { profileId: profileCopy.id, modeId: mode.id });
        this._modeMap.set(`${profileCopy.id}:${mode.id}`, { profile: profileCopy, mode });
      }

      return profileCopy;
    }

    /**
     * Finalizes the registry, freezing all data structures and profiles deeply.
     */
    finalizeRegistry() {
      if (this._finalized) return;

      for (const profile of this._profiles) {
        deepFreeze(profile);
      }
      deepFreeze(this._profiles);

      this._finalized = true;
    }

    /**
     * Checks if the registry is finalized.
     * @returns {boolean}
     */
    isFinalized() {
      return this._finalized;
    }

    /**
     * Retrieves a profile by its profile ID.
     *
     * @param {string} profileId
     * @returns {Object|null}
     */
    getProfile(profileId) {
      return this._profileMap.get(profileId) || null;
    }

    /**
     * Retrieves a mode by profileId and modeId.
     *
     * @param {string} profileId
     * @param {string} modeId
     * @returns {Object|null}
     */
    getMode(profileId, modeId) {
      const entry = this._modeMap.get(`${profileId}:${modeId}`);
      return entry ? entry.mode : null;
    }

    /**
     * Retrieves an entry ({ profile, mode }) by legacyId.
     *
     * @param {string} legacyId
     * @returns {{ profile: Object, mode: Object }|null}
     */
    getByLegacyId(legacyId) {
      const ref = this._legacyIdMap.get(legacyId);
      if (!ref) return null;
      return this._modeMap.get(`${ref.profileId}:${ref.modeId}`) || null;
    }

    /**
     * Returns an array of all registered profiles in registration order.
     * @returns {Array<Object>}
     */
    getProfiles() {
      return [...this._profiles];
    }

    /**
     * Returns an array of all modes in order of profiles and their modes.
     * @returns {Array<{ profile: Object, mode: Object }>}
     */
    getModes() {
      const result = [];
      for (const profile of this._profiles) {
        for (const mode of profile.modes) {
          result.push({ profile, mode });
        }
      }
      return result;
    }
  }

  // Singleton instance
  const defaultRegistry = new SignatureRegistryStore();

  const RegistryAPI = {
    SignatureRegistryStore,
    registerProfile: (profile) => defaultRegistry.registerProfile(profile),
    finalizeRegistry: () => defaultRegistry.finalizeRegistry(),
    isFinalized: () => defaultRegistry.isFinalized(),
    getProfile: (profileId) => defaultRegistry.getProfile(profileId),
    getMode: (profileId, modeId) => defaultRegistry.getMode(profileId, modeId),
    getByLegacyId: (legacyId) => defaultRegistry.getByLegacyId(legacyId),
    getProfiles: () => defaultRegistry.getProfiles(),
    getModes: () => defaultRegistry.getModes(),
    resetRegistry: () => defaultRegistry.reset()
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = RegistryAPI;
  } else {
    global.StegSignatures = global.StegSignatures || {};
    global.StegSignatures.Registry = RegistryAPI;
  }
})(typeof window !== 'undefined' ? window : globalThis);
