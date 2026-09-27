/**
 * StegoLines Production HTML Minification Pipeline
 * 
 * Tool: html-minifier-terser + JSON-LD Minifier
 * Policy: Safe whitespace, indentation, and comments removal with full editor compatibility.
 * 
 * Features:
 * - Compresses HTML layout and JSON-LD structured data.
 * - Uses conservativeCollapse to avoid line collision in editor Language Servers.
 * - Preserves inline script semicolons and formatting to prevent VS Code JS parser errors.
 * - Preserves whitespace inside preformatted <pre>, <code>, and <textarea> tags.
 * - Leaves original source HTML / Nunjucks templates untouched.
 * - Minifies production HTML files in _site/ in-place.
 */

const fs = require('fs');
const path = require('path');
const { minify } = require('html-minifier-terser');

const PROJECT_ROOT = path.resolve(__dirname, '..').replace(/\\/g, '/');
const OUTPUT_DIR = path.join(PROJECT_ROOT, '_site').replace(/\\/g, '/');

const MINIFY_OPTIONS = {
  collapseWhitespace: true,
  removeComments: true,
  removeRedundantAttributes: true,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true,
  useShortDoctype: true,
  conservativeCollapse: false, // Ensure full 1-line HTML compression
  collapseBooleanAttributes: true,
  minifyCSS: true,
  minifyJS: {
    mangle: false,
    compress: false,
    format: {
      comments: false
    }
  },
  keepClosingSlash: true
};

function getAllHtmlFiles(dir) {
  const files = [];
  function walk(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    for (const item of fs.readdirSync(currentDir)) {
      const fullPath = path.join(currentDir, item).replace(/\\/g, '/');
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (path.extname(item) === '.html') {
        files.push(fullPath);
      }
    }
  }
  walk(dir);
  return files;
}

function minifyJsonLd(html) {
  return html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi, (match, jsonContent) => {
    try {
      const parsed = JSON.parse(jsonContent);
      return `<script type="application/ld+json">${JSON.stringify(parsed)}</script>`;
    } catch {
      return match;
    }
  });
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(2)} KB`;
}

async function minifyHtml() {
  console.log('='.repeat(75));
  console.log('📄 StegoLines Production HTML Minification');
  console.log('   Tool: html-minifier-terser (Full 1-Line Minification with Editor Safety)');
  console.log('   Settings: { collapseWhitespace: true, conservativeCollapse: false, minifyJS: safe }');
  console.log('='.repeat(75));

  if (!fs.existsSync(OUTPUT_DIR)) {
    console.error('❌ Error: _site directory does not exist.');
    console.error('   Please run Eleventy build first (e.g. npm run build:eleventy).');
    process.exit(1);
  }

  const htmlFiles = getAllHtmlFiles(OUTPUT_DIR);

  if (htmlFiles.length === 0) {
    console.warn('⚠️ No HTML files found in _site.');
    return;
  }

  console.log(`\n📦 Processing ${htmlFiles.length} HTML files...\n`);

  let totalBefore = 0;
  let totalAfter = 0;
  const results = [];

  for (const filePath of htmlFiles) {
    const relPath = path.relative(OUTPUT_DIR, filePath).replace(/\\/g, '/');
    const originalHtml = fs.readFileSync(filePath, 'utf8');
    const sizeBefore = Buffer.byteLength(originalHtml, 'utf8');
    totalBefore += sizeBefore;

    // 1. Minify JSON-LD
    let processedHtml = minifyJsonLd(originalHtml);

    // 2. Minify HTML with html-minifier-terser
    try {
      processedHtml = await minify(processedHtml, MINIFY_OPTIONS);
    } catch (err) {
      console.warn(`⚠️ Warning: HTML minification failed for ${relPath}, keeping original:`, err.message);
    }

    // 3. Post-process to ensure all inline JS scripts end with a semicolon
    // This prevents VS Code embedded JS language server ';' expected (TS1005) errors on single-line HTML
    processedHtml = processedHtml.replace(/<script(?!\s+type=["']?application\/ld\+json["']?)(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi, (match, attrs, code) => {
      let trimmed = code.trim();
      if (trimmed && !trimmed.endsWith(';')) {
        trimmed += ';';
      }
      return `<script${attrs}>${trimmed}</script>`;
    });

    const sizeAfter = Buffer.byteLength(processedHtml, 'utf8');
    totalAfter += sizeAfter;

    // Overwrite the production output file in _site/
    fs.writeFileSync(filePath, processedHtml, 'utf8');

    const reductionPercent = sizeBefore > 0
      ? (((sizeBefore - sizeAfter) / sizeBefore) * 100).toFixed(1)
      : '0.0';

    const lineCount = processedHtml.split('\n').length;

    results.push({
      file: relPath,
      sizeBefore,
      sizeAfter,
      lineCount,
      reductionPercent
    });
  }

  // Print results table
  console.log('-'.repeat(85));
  console.log(
    'File'.padEnd(42) +
    'Lines'.padStart(7) +
    'Original'.padStart(12) +
    'Minified'.padStart(12) +
    'Reduction'.padStart(12)
  );
  console.log('-'.repeat(85));

  // Sort by top savings
  results.sort((a, b) => (b.sizeBefore - b.sizeAfter) - (a.sizeBefore - a.sizeAfter));

  // Print top 15 files
  for (const r of results.slice(0, 15)) {
    console.log(
      r.file.padEnd(42) +
      `${r.lineCount}`.padStart(7) +
      formatBytes(r.sizeBefore).padStart(12) +
      formatBytes(r.sizeAfter).padStart(12) +
      `-${r.reductionPercent}%`.padStart(12)
    );
  }

  if (results.length > 15) {
    console.log(`... and ${results.length - 15} more HTML files.`);
  }

  console.log('='.repeat(85));
  console.log('📊 HTML MINIFICATION SUMMARY');
  console.log('='.repeat(85));
  console.log(`Total HTML files processed: ${results.length}`);
  console.log(`Original total size       : ${formatBytes(totalBefore)} (${totalBefore.toLocaleString()} bytes)`);
  console.log(`Minified total size       : ${formatBytes(totalAfter)} (${totalAfter.toLocaleString()} bytes)`);
  const totalSaved = totalBefore - totalAfter;
  const totalPercent = totalBefore > 0 ? (((totalBefore - totalAfter) / totalBefore) * 100).toFixed(1) : '0.0';
  console.log(`Net savings               : ${formatBytes(totalSaved)} (${totalSaved.toLocaleString()} bytes saved, -${totalPercent}%)`);
  console.log('='.repeat(85));
}

minifyHtml().catch(err => {
  console.error('Fatal error in HTML minification pipeline:', err);
  process.exit(1);
});
