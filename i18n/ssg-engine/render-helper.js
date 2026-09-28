/**
 * StegoLines — Multi-Lingual Page Render Helper for Eleventy / Nunjucks
 */

const fs = require('fs');
const path = require('path');
const i18nData = require('./_data/i18nData');
const siteData = require('./_data/site.json');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

const PAGE_KEYS = {
  'index.html': 'embed',
  'extract.html': 'extract',
  'steganalysis.html': 'steganalysis',
  'about.html': 'about',
  'contact.html': 'contact',
  'documentation.html': 'documentation',
  'offline.html': 'offline'
};

function getPageDictionary(pageName, langCode) {
  const pageKey = PAGE_KEYS[pageName] || 'embed';
  const specificDict = i18nData[pageKey] && i18nData[pageKey][langCode] ? i18nData[pageKey][langCode] : {};
  const forensicsDict = (pageKey === 'steganalysis' && i18nData.forensics && i18nData.forensics[langCode]) ? i18nData.forensics[langCode] : {};
  const commonDict = i18nData.common[langCode] || {};
  const hintsDict = i18nData.hints[langCode] || {};
  const toastsDict = i18nData.toasts[langCode] || {};

  // Specific dictionary overrides common so pageTitle/pageDesc don't collide
  return {
    ...commonDict,
    ...hintsDict,
    ...toastsDict,
    ...forensicsDict,
    ...specificDict
  };
}

function renderLocalizedPage(pageName, langCode, isRoot = false) {
  const pagePath = path.join(ROOT_DIR, pageName);
  if (!fs.existsSync(pagePath)) {
    throw new Error(`Page not found: ${pagePath}`);
  }

  let html = fs.readFileSync(pagePath, 'utf8');
  const dict = getPageDictionary(pageName, langCode);
  const isAr = langCode === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const titleKey = pageName === 'index.html' ? 'index' : pageName.replace('.html', '');
  const title = (siteData.titles[titleKey] && siteData.titles[titleKey][langCode])
    ? siteData.titles[titleKey][langCode]
    : `StegnoLines — ${titleKey}`;

  const domain = (siteData && siteData.domain) ? siteData.domain : 'https://stegnolines.com';
  const cleanSlug = pageName === 'index.html' ? '' : pageName.replace('.html', '');
  const rootPageUrl = cleanSlug ? `${domain}/${cleanSlug}` : `${domain}/`;
  const canonicalUrl = isRoot
    ? rootPageUrl
    : `${domain}/${langCode}/${cleanSlug}`;

  // 1. Update <html ...> tag
  html = html.replace(/<html[^>]*>/i, `<html lang="${langCode}" dir="${dir}" data-arabic-font="cairo" data-ssg-rendered="true">`);

  // 2. Update <title>
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);

  // 3. Update canonical and hreflangs
  html = html.replace(/<link rel="canonical"[^>]*\/?>/i, `<link rel="canonical" href="${canonicalUrl}" />`);

  const hreflangBlock = [
    `<link rel="alternate" hreflang="en" href="${rootPageUrl}" />`,
    `<link rel="alternate" hreflang="ar" href="${domain}/ar/${cleanSlug}" />`,
    `<link rel="alternate" hreflang="fr" href="${domain}/fr/${cleanSlug}" />`,
    `<link rel="alternate" hreflang="zh" href="${domain}/zh/${cleanSlug}" />`,
    `<link rel="alternate" hreflang="la" href="${domain}/la/${cleanSlug}" />`,
    `<link rel="alternate" hreflang="x-default" href="${rootPageUrl}" />`
  ].join('\n  ');

  // Replace any existing alternate hreflangs
  html = html.replace(/(<link rel="alternate" hreflang="[^"]*"[^>]*\/?>\s*)+/gi, '');
  html = html.replace(/<link rel="canonical"[^>]*\/?>/i, match => `${match}\n  ${hreflangBlock}`);

  // 4. Update OpenGraph / Twitter metadata
  const brandName = isAr ? 'السطور المخفية' : 'StegnoLines';
  html = html.replace(/<meta property="og:title"[^>]*\/?>/i, `<meta property="og:title" content="${title}" />`);
  html = html.replace(/<meta property="og:url"[^>]*\/?>/i, `<meta property="og:url" content="${canonicalUrl}" />`);
  html = html.replace(/<meta property="og:site_name"[^>]*\/?>/i, `<meta property="og:site_name" content="${brandName}" />`);
  html = html.replace(/<meta name="twitter:title"[^>]*\/?>/i, `<meta name="twitter:title" content="${title}" />`);
  html = html.replace(/<meta name="twitter:url"[^>]*\/?>/i, `<meta name="twitter:url" content="${canonicalUrl}" />`);

  // 5. Update Meta Description, Keywords, and AI Search queries
  const metaDesc = (siteData.metaDescriptions && siteData.metaDescriptions[titleKey] && siteData.metaDescriptions[titleKey][langCode])
    ? siteData.metaDescriptions[titleKey][langCode]
    : null;

  const keywords = (siteData.keywords && siteData.keywords[titleKey] && siteData.keywords[titleKey][langCode])
    ? siteData.keywords[titleKey][langCode]
    : null;

  const aiQuery = (siteData.aiQueries && siteData.aiQueries[titleKey] && siteData.aiQueries[titleKey][langCode])
    ? siteData.aiQueries[titleKey][langCode]
    : null;

  if (metaDesc) {
    html = html.replace(/<meta\s+name="description"[\s\S]*?content="[^"]*"[^>]*\/?>/i, `<meta name="description" content="${metaDesc}" />`);
    html = html.replace(/<meta\s+property="og:description"[\s\S]*?content="[^"]*"[^>]*\/?>/i, `<meta property="og:description" content="${metaDesc}" />`);
    html = html.replace(/<meta\s+name="twitter:description"[\s\S]*?content="[^"]*"[^>]*\/?>/i, `<meta name="twitter:description" content="${metaDesc}" />`);
  }

  if (keywords) {
    html = html.replace(/<meta\s+name="keywords"[\s\S]*?content="[^"]*"[^>]*\/?>/i, `<meta name="keywords" content="${keywords}" />`);
  }

  if (aiQuery) {
    if (html.includes('name="ai-query"')) {
      html = html.replace(/<meta\s+name="ai-query"[^>]*\/?>/i, `<meta name="ai-query" content="${aiQuery}" />`);
    } else {
      html = html.replace(/(<meta\s+name="keywords"[^>]*\/?>)/i, `$1\n  <meta name="ai-query" content="${aiQuery}" />`);
    }
  }

  // 6. Add Cairo font preload for Arabic
  if (isAr && !html.includes('family=Cairo')) {
    const cairoLink = `<link rel="preconnect" href="https://fonts.googleapis.com">\n  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet" />`;
    html = html.replace('</head>', `  ${cairoLink}\n</head>`);
  }

  // 6. Translate tags with data-i18n
  // Two passes to handle nested containers safely
  for (let pass = 0; pass < 2; pass++) {
    html = html.replace(/<([a-zA-Z0-9\-]+)([^>]*?)data-i18n="([^"]+)"([^>]*)>([\s\S]*?)<\/\1>/g, (match, tag, before, key, after, inner) => {
      const val = dict[key];
      if (val !== undefined && val !== null) {
        // If inner contains material icon, keep icon intact
        const iconMatch = inner.match(/<span class="material-symbols-outlined"[^>]*>[\s\S]*?<\/span>/);
        if (iconMatch) {
          return `<${tag}${before}data-i18n="${key}"${after}>${iconMatch[0]} ${val}</${tag}>`;
        }
        return `<${tag}${before}data-i18n="${key}"${after}>${val}</${tag}>`;
      }
      return match;
    });
  }

  // 7. Translate attributes: data-i18n-placeholder, data-i18n-title, data-i18n-tooltip
  html = html.replace(/data-i18n-placeholder="([^"]+)"(?:\s+placeholder="[^"]*")?/g, (m, key) => {
    const val = dict[key];
    return val ? `data-i18n-placeholder="${key}" placeholder="${val}"` : m;
  });

  html = html.replace(/data-i18n-title="([^"]+)"(?:\s+title="[^"]*")?/g, (m, key) => {
    const val = dict[key];
    return val ? `data-i18n-title="${key}" title="${val}"` : m;
  });

  html = html.replace(/data-i18n-tooltip="([^"]+)"(?:\s+data-tooltip="[^"]*")?/g, (m, key) => {
    const val = dict[key];
    return val ? `data-i18n-tooltip="${key}" data-tooltip="${val}"` : m;
  });

  // 8. Adjust asset paths relatively based on depth (NO server root slashes!)
  // Root pages stay relative: css/main.css, js/..., assets/...
  // Subfolder pages (e.g. /ar/, /en/) prefix with ../ so they work offline and on GitHub Pages!
  if (!isRoot) {
    html = html.replace(/(href|src)=["']css\//g, '$1="../css/');
    html = html.replace(/(href|src)=["']js\//g, '$1="../js/');
    html = html.replace(/(href|src)=["']assets\//g, '$1="../assets/');
    html = html.replace(/(href|src)=["']i18n\//g, '$1="../i18n/');
  }

  return html;
}

module.exports = {
  renderLocalizedPage,
  PAGE_KEYS
};
