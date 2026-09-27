/**
 * StegoLines — Eleventy (11ty) Multi-Lingual Architecture Configuration
 * 
 * Compiles all 5 language routes (/en/, /ar/, /fr/, /zh/, /la/) and root routes,
 * preserving 100% of client-side cryptography, Brotli WASM, and forensic tools.
 */

const fs = require('fs');
const path = require('path');
const { renderLocalizedPage } = require('./i18n/ssg-engine/render-helper');

module.exports = function(eleventyConfig) {
  // Passthrough copy for static web assets
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("css");
  eleventyConfig.addPassthroughCopy("js");
  eleventyConfig.addPassthroughCopy("i18n/dictionaries");
  eleventyConfig.addPassthroughCopy("robots.txt");
  eleventyConfig.addPassthroughCopy("llms.txt");
  eleventyConfig.addPassthroughCopy("llms-full.txt");

  // Nunjucks filter for localized page rendering
  eleventyConfig.addFilter("renderLocalized", function(pageName, langCode, isRoot) {
    return renderLocalizedPage(pageName, langCode, !!isRoot);
  });

  // i18n helper filter
  eleventyConfig.addFilter("i18n", function(key, lang, dictionary) {
    if (!dictionary || !dictionary[lang]) return key;
    return dictionary[lang][key] || key;
  });

  // Post-build hook: generate comprehensive multi-lingual sitemap.xml in _site
  eleventyConfig.on('eleventy.after', async ({ dir }) => {
    const outputDir = dir.output;
    const projectRoot = path.resolve(__dirname);

    // Generate comprehensive multi-lingual sitemap.xml
    generateSitemap(projectRoot, outputDir);
  });

  return {
    dir: {
      input: "i18n/ssg-engine",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    templateFormats: ["html", "njk"],
    htmlTemplateEngine: "njk"
  };
};

function generateSitemap(root, outputDir) {
  const domain = 'https://stegnolines.com';
  const subLanguages = ['ar', 'fr', 'zh', 'la'];
  const pages = [
    { slug: '', priority: '1.0', changefreq: 'weekly' },
    { slug: 'extract', priority: '0.9', changefreq: 'weekly' },
    { slug: 'steganalysis', priority: '0.9', changefreq: 'weekly' },
    { slug: 'about', priority: '0.8', changefreq: 'monthly' },
    { slug: 'contact', priority: '0.7', changefreq: 'monthly' },
    { slug: 'documentation', priority: '0.8', changefreq: 'weekly' },
    { slug: 'offline', priority: '0.6', changefreq: 'monthly' }
  ];

  const docsArticles = [
    'getting-started/overview',
    'getting-started/architecture',
    'getting-started/components',
    'user-guide/embedding',
    'user-guide/extraction',
    'user-guide/capacity-and-hints',
    'user-guide/chat-integration',
    'user-guide/variation-selectors',
    'user-guide/extraction-guide',
    'technical-reference/pipeline',
    'technical-reference/literature-review',
    'technical-reference/experimental-results',
    'technical-reference/security',
    'technical-reference/threat-model',
    'technical-reference/algorithms',
    'technical-reference/configuration',
    'technical-reference/glossary',
    'technical-reference/extraction-engine',
    'development/project-structure',
    'development/writing-docs'
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;

  // Main tool pages across all languages (root for English, subfolder for others)
  for (const page of pages) {
    const pathSlug = page.slug ? `/${page.slug}` : '';
    const rootUrl = page.slug ? `${domain}/${page.slug}` : `${domain}/`;

    // Root URL (English)
    xml += `  <url>\n    <loc>${rootUrl}</loc>\n`;
    xml += `    <xhtml:link rel="alternate" hreflang="en" href="${rootUrl}" />\n`;
    for (const lang of subLanguages) {
      xml += `    <xhtml:link rel="alternate" hreflang="${lang}" href="${domain}/${lang}${pathSlug}" />\n`;
    }
    xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${rootUrl}" />\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>\n`;

    // Localized language directory URLs (/ar/, /fr/, /zh/, /la/)
    for (const lang of subLanguages) {
      xml += `  <url>\n    <loc>${domain}/${lang}${pathSlug}</loc>\n`;
      xml += `    <xhtml:link rel="alternate" hreflang="en" href="${rootUrl}" />\n`;
      for (const altLang of subLanguages) {
        xml += `    <xhtml:link rel="alternate" hreflang="${altLang}" href="${domain}/${altLang}${pathSlug}" />\n`;
      }
      xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${rootUrl}" />\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>\n`;
    }
  }

  // Documentation articles (en and ar)
  for (const docSlug of docsArticles) {
    const rootDocUrl = `${domain}/docs/${docSlug}`;
    const arDocUrl = `${domain}/ar/docs/${docSlug}`;

    // Root English: /docs/{docSlug}
    xml += `  <url>\n    <loc>${rootDocUrl}</loc>\n`;
    xml += `    <xhtml:link rel="alternate" hreflang="en" href="${rootDocUrl}" />\n`;
    xml += `    <xhtml:link rel="alternate" hreflang="ar" href="${arDocUrl}" />\n`;
    xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${rootDocUrl}" />\n`;
    xml += `    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;

    // Localized Arabic: /ar/docs/{docSlug}
    xml += `  <url>\n    <loc>${arDocUrl}</loc>\n`;
    xml += `    <xhtml:link rel="alternate" hreflang="en" href="${rootDocUrl}" />\n`;
    xml += `    <xhtml:link rel="alternate" hreflang="ar" href="${arDocUrl}" />\n`;
    xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${rootDocUrl}" />\n`;
    xml += `    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
  }

  xml += `</urlset>\n`;

  // Write sitemap.xml dynamically to output directory (_site)
  if (fs.existsSync(outputDir)) {
    fs.writeFileSync(path.join(outputDir, 'sitemap.xml'), xml, 'utf8');
  }
}
