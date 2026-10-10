/**
 * StegoLines Production CSS Optimization Pipeline
 * 
 * Pipeline:
 * Source CSS (in _site/css)
 *   ↓
 * PurgeCSS (remove unused CSS with safelist protection)
 *   ↓
 * cssnano via PostCSS (minify and compress output)
 *   ↓
 * Production CSS (in _site/css)
 * 
 * Preserves development CSS in /css untouched.
 */

const fs = require('fs');
const path = require('path');
const { PurgeCSS } = require('purgecss');
const postcss = require('postcss');
const cssnano = require('cssnano');
const purgeConfig = require('./config/purgecss.config');

const PROJECT_ROOT = path.resolve(__dirname, '..').replace(/\\/g, '/');
const OUTPUT_CSS_DIR = path.join(PROJECT_ROOT, '_site', 'css').replace(/\\/g, '/');

function getAllFiles(dir, ext = '.css') {
  const files = [];
  function walk(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    for (const item of fs.readdirSync(currentDir)) {
      const fullPath = path.join(currentDir, item).replace(/\\/g, '/');
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (path.extname(item) === ext) {
        files.push(fullPath);
      }
    }
  }
  walk(dir);
  return files;
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(2)} KB`;
}

/**
 * Inlines all @import url(...) statements inside main.css recursively.
 * Rewrites subfolder relative asset paths (e.g. components/ -> ../assets).
 * Preserves modular files in development while producing a single-request production bundle.
 */
function bundleCssMain(mainCssPath, baseCssDir) {
  if (!fs.existsSync(mainCssPath)) return;

  function inlineImports(filePath, visited = new Set()) {
    const norm = path.resolve(filePath).replace(/\\/g, '/');
    if (visited.has(norm)) return '';
    visited.add(norm);

    if (!fs.existsSync(norm)) {
      console.warn(`⚠️ Warning: CSS file not found for inlining: ${norm}`);
      return '';
    }

    const fileDir = path.dirname(norm);
    let content = fs.readFileSync(norm, 'utf8');

    // Match @import url('...') or @import "..." or @import '...';
    const importRegex = /@import\s+(?:url\(['"]?([^'"\)]+)['"]?\)|['"]([^'"]+)['"])\s*;/g;

    content = content.replace(importRegex, (match, url1, url2) => {
      const target = (url1 || url2).trim();
      const resolved = path.resolve(fileDir, target).replace(/\\/g, '/');
      if (!fs.existsSync(resolved)) {
        console.warn(`⚠️ Warning: Cannot inline nonexistent import: ${target} in ${norm}`);
        return '';
      }

      let inlined = inlineImports(resolved, visited);

      // Adjust relative asset URLs if the imported file was in a subfolder (e.g. components/ or pages/)
      const relDir = path.relative(baseCssDir, path.dirname(resolved)).replace(/\\/g, '/');
      if (relDir && relDir !== '.') {
        inlined = inlined.replace(/url\((['"]?)\.\.\/\.\.\/assets\//g, 'url($1../assets/');
      }

      return `\n/* ── Inlined: ${target} ── */\n${inlined}\n`;
    });

    return content;
  }

  const bundled = inlineImports(mainCssPath);
  fs.writeFileSync(mainCssPath, bundled, 'utf8');
  console.log(`✅ Bundled all CSS imports into ${path.basename(mainCssPath)}`);
}

async function optimizeCss() {
  console.log('='.repeat(75));
  console.log('🚀 StegoLines Production CSS Optimization');
  console.log('   Pipeline: Source CSS -> Inlining -> PurgeCSS -> cssnano -> Production CSS');
  console.log('='.repeat(75));

  if (!fs.existsSync(OUTPUT_CSS_DIR)) {
    console.error('❌ Error: _site/css directory does not exist.');
    console.error('   Please run Eleventy build first (e.g. npm run build:eleventy).');
    process.exit(1);
  }

  // 1. First, bundle all @import rules inside _site/css/main.css into a single file
  const mainCssFile = path.join(OUTPUT_CSS_DIR, 'main.css').replace(/\\/g, '/');
  bundleCssMain(mainCssFile, OUTPUT_CSS_DIR);

  const cssFiles = getAllFiles(OUTPUT_CSS_DIR, '.css');

  if (cssFiles.length === 0) {
    console.warn('⚠️ No CSS files found in _site/css.');
    return;
  }

  // Ensure content glob patterns use forward slashes for fast-glob compatibility on Windows
  const contentPatterns = [
    `${PROJECT_ROOT}/_site/**/*.html`,
    `${PROJECT_ROOT}/*.html`,
    `${PROJECT_ROOT}/js/**/*.js`,
    `${PROJECT_ROOT}/i18n/**/*.json`,
    `${PROJECT_ROOT}/i18n/ssg-engine/**/*.njk`,
    `${PROJECT_ROOT}/i18n/ssg-engine/**/*.js`
  ];

  console.log(`\n📦 Processing ${cssFiles.length} CSS files...`);
  console.log(`   Scanning content in: ${contentPatterns.length} pattern locations\n`);

  let totalBefore = 0;
  let totalAfterPurge = 0;
  let totalAfterNano = 0;

  const results = [];

  for (const filePath of cssFiles) {
    const relPath = path.relative(OUTPUT_CSS_DIR, filePath).replace(/\\/g, '/');
    const originalCss = fs.readFileSync(filePath, 'utf8');
    const sizeBefore = Buffer.byteLength(originalCss, 'utf8');
    totalBefore += sizeBefore;

    // 1. PurgeCSS
    let purgedCss = originalCss;
    try {
      const purgeResult = await new PurgeCSS().purge({
        content: contentPatterns,
        css: [{ raw: originalCss }],
        safelist: purgeConfig.safelist,
        fontFace: false,
        keyframes: false,
        variables: false
      });

      if (purgeResult && purgeResult.length > 0) {
        purgedCss = purgeResult[0].css;
      }
    } catch (err) {
      console.warn(`⚠️ Warning: PurgeCSS failed for ${relPath}, keeping original:`, err.message);
    }

    const sizeAfterPurge = Buffer.byteLength(purgedCss, 'utf8');
    totalAfterPurge += sizeAfterPurge;

    // 2. cssnano via PostCSS
    let minifiedCss = purgedCss;
    try {
      const nanoResult = await postcss([
        cssnano({
          preset: [
            'default',
            {
              discardComments: { removeAll: true }
            }
          ]
        })
      ]).process(purgedCss, { from: undefined });

      minifiedCss = nanoResult.css;
    } catch (err) {
      console.warn(`⚠️ Warning: cssnano failed for ${relPath}, keeping purged:`, err.message);
    }

    const sizeAfterNano = Buffer.byteLength(minifiedCss, 'utf8');
    totalAfterNano += sizeAfterNano;

    // Write optimized CSS back to _site/css/
    fs.writeFileSync(filePath, minifiedCss, 'utf8');

    const reductionPercent = sizeBefore > 0
      ? (((sizeBefore - sizeAfterNano) / sizeBefore) * 100).toFixed(1)
      : '0.0';

    results.push({
      file: relPath,
      sizeBefore,
      sizeAfterPurge,
      sizeAfterNano,
      reductionPercent
    });
  }

  // Print results table
  console.log('-'.repeat(85));
  console.log(
    'File'.padEnd(35) +
    'Original'.padStart(12) +
    'Purged'.padStart(12) +
    'Minified'.padStart(12) +
    'Reduction'.padStart(14)
  );
  console.log('-'.repeat(85));

  for (const r of results) {
    console.log(
      r.file.padEnd(35) +
      formatBytes(r.sizeBefore).padStart(12) +
      formatBytes(r.sizeAfterPurge).padStart(12) +
      formatBytes(r.sizeAfterNano).padStart(12) +
      `-${r.reductionPercent}%`.padStart(14)
    );
  }

  console.log('='.repeat(85));
  console.log('📊 FINAL SUMMARY');
  console.log('='.repeat(85));
  console.log(`Total CSS files processed : ${results.length}`);
  console.log(`Original total size       : ${formatBytes(totalBefore)} (${totalBefore.toLocaleString()} bytes)`);
  console.log(`After PurgeCSS            : ${formatBytes(totalAfterPurge)} (${totalAfterPurge.toLocaleString()} bytes) [${(((totalBefore - totalAfterPurge) / totalBefore) * 100).toFixed(1)}% saved]`);
  console.log(`After cssnano (Final)     : ${formatBytes(totalAfterNano)} (${totalAfterNano.toLocaleString()} bytes) [${(((totalBefore - totalAfterNano) / totalBefore) * 100).toFixed(1)}% total saved]`);
  const totalSaved = totalBefore - totalAfterNano;
  console.log(`Net savings               : ${formatBytes(totalSaved)} (${totalSaved.toLocaleString()} bytes saved)`);
  console.log('='.repeat(85));
}

optimizeCss().catch(err => {
  console.error('Fatal error in CSS optimization pipeline:', err);
  process.exit(1);
});
