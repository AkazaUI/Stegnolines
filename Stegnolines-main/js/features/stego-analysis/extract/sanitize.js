/**
 * @file sanitize.js
 * @description Sanitizes text by stripping suspect steganographic carriers while preserving legitimate orthography.
 * Compatible with classic script tags and module exports.
 */

(function (global) {
  'use strict';

  function sanitizeText(text) {
    const profileText = (global.StegProfile && global.StegProfile.profileText) ? global.StegProfile.profileText : function() { return { suspectOccurrences: [], occurrences: [] }; };
    const profile = profileText(text);
    const suspectPositions = new Set(profile.suspectOccurrences.map(o => o.position));

    const codePoints = Array.from(text).map(c => c.codePointAt(0));
    const cleanCodePoints = [];

    let removedCount = 0;
    let preservedCount = 0;

    for (let i = 0; i < codePoints.length; i++) {
      if (suspectPositions.has(i)) {
        removedCount++;
      } else {
        cleanCodePoints.push(codePoints[i]);
        if (profile.occurrences.some(o => o.position === i)) {
          preservedCount++;
        }
      }
    }

    const sanitizedText = String.fromCodePoint(...cleanCodePoints);

    return {
      sanitizedText,
      removedCount,
      preservedCount
    };
  }

  const StegSanitize = { sanitizeText };
  global.StegSanitize = StegSanitize;

  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = StegSanitize;
  }
})(typeof window !== 'undefined' ? window : this);
