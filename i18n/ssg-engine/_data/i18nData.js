const fs = require('fs');
const path = require('path');
const vm = require('vm');

const i18nDir = path.resolve(__dirname, '..', '..', 'dictionaries');

function loadDict(fileName, varName) {
  const filePath = path.join(i18nDir, fileName);
  if (!fs.existsSync(filePath)) return {};
  const code = fs.readFileSync(filePath, 'utf8');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  try {
    return vm.runInContext(code + '\n;' + varName + ';', sandbox) || {};
  } catch (err) {
    console.error(`[i18nData] Failed to load ${fileName}:`, err.message);
    return {};
  }
}

const common = loadDict('common.js', 'I18N_COMMON');
const embed = loadDict('embed.js', 'I18N_EMBED');
const extract = loadDict('extract.js', 'I18N_EXTRACT');
const steganalysis = loadDict('steganalysis.js', 'I18N_STEGANALYSIS');
const about = loadDict('about.js', 'I18N_ABOUT');
const contact = loadDict('contact.js', 'I18N_CONTACT');
const docs = loadDict('docs.js', 'I18N_DOCS');
const offline = loadDict('offline.js', 'I18N_OFFLINE');
const hints = loadDict('hints.js', 'I18N_HINTS');
const toasts = loadDict('toasts.js', 'I18N_TOASTS');

const languages = ['en', 'ar', 'fr', 'zh', 'la'];
const merged = {};

for (const lang of languages) {
  merged[lang] = {
    ...(common[lang] || {}),
    ...(embed[lang] || {}),
    ...(extract[lang] || {}),
    ...(steganalysis[lang] || {}),
    ...(about[lang] || {}),
    ...(contact[lang] || {}),
    ...(docs[lang] || {}),
    ...(offline[lang] || {}),
    ...(hints[lang] || {}),
    ...(toasts[lang] || {})
  };
}

module.exports = {
  merged,
  common,
  embed,
  extract,
  steganalysis,
  about,
  contact,
  docs,
  offline,
  hints,
  toasts
};
