/**
 * STEGNOLINES — Internationalization (i18n) Utility
 * Merges common translations (navigation, footer, preferences) with page-specific and component-specific translations.
 */

/**
 * Merges multiple translation dictionaries together.
 * Dictionaries passed later in the arguments take priority in case of key collisions.
 * 
 * @param {...Object} dicts - The translation dictionaries to merge
 * @returns {Object} The merged translations dictionary
 */
function mergeI18n(...dicts) {
  const merged = {};
  const allLangs = new Set();
  
  dicts.forEach(dict => {
    if (dict) {
      Object.keys(dict).forEach(lang => allLangs.add(lang));
    }
  });
  
  allLangs.forEach(lang => {
    merged[lang] = {};
    dicts.forEach(dict => {
      if (dict && dict[lang]) {
        merged[lang] = { ...merged[lang], ...dict[lang] };
      }
    });
  });
  
  return merged;
}
