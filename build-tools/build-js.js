/**
 * StegoLines Production JavaScript Minification Pipeline
 * 
 * Tool: Terser
 * Policy: Whitespace, newlines, and comments removal ONLY.
 * 
 * Explicitly disabled:
 * - NO name mangling (mangle: false)
 * - NO code restructuring or expression compression (compress: false)
 * 
 * Result:
 * - 100% preserves variable names, function names, classes, and logic.
 * - Leaves source /js files untouched for development.
 * - Writes optimized JS into _site/js/ for production.
 */

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const PROJECT_ROOT = path.resolve(__dirname, '..').replace(/\\/g, '/');
const OUTPUT_DIR = path.join(PROJECT_ROOT, '_site').replace(/\\/g, '/');
const TARGET_DIRS = [
  path.join(OUTPUT_DIR, 'js').replace(/\\/g, '/'),
  path.join(OUTPUT_DIR, 'i18n').replace(/\\/g, '/')
];

function getAllFiles(dir, ext = '.js') {
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

async function minifyJs() {
  console.log('='.repeat(75));
  console.log('⚡ StegoLines Production JavaScript Minification');
  console.log('   Tool: Terser (Comments, newlines, and whitespace removal ONLY)');
  console.log('   Settings: { mangle: false, compress: false, comments: false }');
  console.log('   Targets: _site/js/ and _site/i18n/ (including translation dictionaries)');
  console.log('='.repeat(75));

  if (!fs.existsSync(OUTPUT_DIR)) {
    console.error('❌ Error: _site directory does not exist.');
    console.error('   Please run Eleventy build first (e.g. npm run build:eleventy).');
    process.exit(1);
  }

  const jsFiles = [];
  for (const dir of TARGET_DIRS) {
    if (fs.existsSync(dir)) {
      jsFiles.push(...getAllFiles(dir, '.js'));
    }
  }

  if (jsFiles.length === 0) {
    console.warn('⚠️ No JS files found in _site/js or _site/i18n.');
    return;
  }

  console.log(`\n📦 Processing ${jsFiles.length} JavaScript files...\n`);

  let totalBefore = 0;
  let totalAfter = 0;
  const results = [];

  for (const filePath of jsFiles) {
    const relPath = path.relative(OUTPUT_DIR, filePath).replace(/\\/g, '/');
    const originalCode = fs.readFileSync(filePath, 'utf8');
    const sizeBefore = Buffer.byteLength(originalCode, 'utf8');
    totalBefore += sizeBefore;

    let minifiedCode = originalCode;
    try {
      const result = await minify(originalCode, {
        mangle: false,
        compress: false,
        format: {
          comments: false
        }
      });

      if (result.code) {
        minifiedCode = result.code;
      }
    } catch (err) {
      console.warn(`⚠️ Warning: Terser failed for ${relPath}, keeping original:`, err.message);
    }

    const sizeAfter = Buffer.byteLength(minifiedCode, 'utf8');
    totalAfter += sizeAfter;

    // Overwrite the file in _site/js/ (production output only)
    fs.writeFileSync(filePath, minifiedCode, 'utf8');

    const reductionPercent = sizeBefore > 0
      ? (((sizeBefore - sizeAfter) / sizeBefore) * 100).toFixed(1)
      : '0.0';

    results.push({
      file: relPath,
      sizeBefore,
      sizeAfter,
      reductionPercent
    });
  }

  // Print results table
  console.log('-'.repeat(85));
  console.log(
    'File'.padEnd(45) +
    'Original'.padStart(12) +
    'Minified'.padStart(12) +
    'Reduction'.padStart(14)
  );
  console.log('-'.repeat(85));

  // Sort by savings amount
  results.sort((a, b) => (b.sizeBefore - b.sizeAfter) - (a.sizeBefore - a.sizeAfter));

  for (const r of results) {
    console.log(
      r.file.padEnd(45) +
      formatBytes(r.sizeBefore).padStart(12) +
      formatBytes(r.sizeAfter).padStart(12) +
      `-${r.reductionPercent}%`.padStart(14)
    );
  }

  console.log('='.repeat(85));
  console.log('📊 JAVASCRIPT MINIFICATION SUMMARY');
  console.log('='.repeat(85));
  console.log(`Total JS files processed  : ${results.length}`);
  console.log(`Original total size       : ${formatBytes(totalBefore)} (${totalBefore.toLocaleString()} bytes)`);
  console.log(`Minified total size       : ${formatBytes(totalAfter)} (${totalAfter.toLocaleString()} bytes)`);
  const totalSaved = totalBefore - totalAfter;
  const totalPercent = totalBefore > 0 ? (((totalBefore - totalAfter) / totalBefore) * 100).toFixed(1) : '0.0';
  console.log(`Net savings               : ${formatBytes(totalSaved)} (${totalSaved.toLocaleString()} bytes saved, -${totalPercent}%)`);
  console.log('='.repeat(85));
}

minifyJs().catch(err => {
  console.error('Fatal error in JS minification pipeline:', err);
  process.exit(1);
});
