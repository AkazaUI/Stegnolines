/**
 * @file index.js
 * @description Central registry of all steganography schemes.
 * Compatible with classic script tags and module exports.
 */

(function (global) {
  'use strict';

  const schemesObj = global.StegSchemes || {};
  const SCHEMES = Object.freeze([
    schemesObj.stegnolines,
    schemesObj.unicodeTags,
    schemesObj.variationSel,
    schemesObj.zwc,
    schemesObj.binary,
    schemesObj.baseN,
    schemesObj.positional
  ].filter(Boolean));

  global.SCHEMES = SCHEMES;

  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = { SCHEMES };
  }
})(typeof window !== 'undefined' ? window : this);
