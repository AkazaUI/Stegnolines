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

/**
 * Automatically detects all loaded dictionary objects in global scope
 * and initializes window.translations if not already populated.
 */
function autoInitTranslations() {
  if (typeof window === 'undefined') return;
  const candidateDicts = [
    typeof I18N_COMMON !== 'undefined' ? I18N_COMMON : null,
    typeof I18N_EMBED !== 'undefined' ? I18N_EMBED : null,
    typeof I18N_EXTRACT !== 'undefined' ? I18N_EXTRACT : null,
    typeof I18N_STEGANALYSIS !== 'undefined' ? I18N_STEGANALYSIS : null,
    typeof I18N_ABOUT !== 'undefined' ? I18N_ABOUT : null,
    typeof I18N_CONTACT !== 'undefined' ? I18N_CONTACT : null,
    typeof I18N_DOCS !== 'undefined' ? I18N_DOCS : null,
    typeof I18N_OFFLINE !== 'undefined' ? I18N_OFFLINE : null,
    typeof I18N_HINTS !== 'undefined' ? I18N_HINTS : null,
    typeof I18N_TOASTS !== 'undefined' ? I18N_TOASTS : null
  ].filter(Boolean);

  if (candidateDicts.length > 0) {
    window.translations = mergeI18n(...candidateDicts);
  }
}

if (typeof window !== 'undefined') {
  autoInitTranslations();
}
