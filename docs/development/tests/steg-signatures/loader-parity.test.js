/**
 * @file loader-parity.test.js
 * @description Verifies loader parity between Node.js CommonJS and browser script-tag loading,
 * and ensures steganalysis.html script tags strictly match the manifest without drift.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const rootDir = path.resolve(__dirname, '../../../..');
const Manifest = require(path.join(rootDir, 'js/features/stego-analysis/detect/signatures/manifest.js'));
const nodeIndex = require(path.join(rootDir, 'js/features/stego-analysis/detect/signatures/index.js'));

console.log('='.repeat(75));
console.log('🧪 StegoSignatures: Loader Parity & Manifest Alignment Suite');
console.log('='.repeat(75));

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

runTest('All files referenced in manifest.js exist on disk', () => {
  assert.ok(Array.isArray(Manifest) && Manifest.length > 0);
  for (const item of Manifest) {
    const fullPath = path.resolve(rootDir, 'js/features/stego-analysis/detect/signatures', item.path);
    assert.ok(fs.existsSync(fullPath), `Profile file does not exist: ${item.path}`);
  }
});

runTest('Browser-style script evaluation produces identical flattened registry to Node', () => {
  const sandbox = {
    window: {},
    console: console
  };
  sandbox.globalThis = sandbox.window;
  vm.createContext(sandbox);

  // Script order:
  const scriptFiles = [
    'js/features/stego-analysis/detect/signatures/contract.js',
    'js/features/stego-analysis/detect/signatures/registry.js',
    ...Manifest.map(m => path.join('js/features/stego-analysis/detect/signatures', m.path).replace(/\\/g, '/')),
    'js/features/stego-analysis/detect/signatures/legacy-adapter.js',
    'js/features/stego-analysis/detect/signatures/legacy-matcher.js',
    'js/features/stego-analysis/detect/signatures/index.js',
    'js/features/stego-analysis/detect/signatures.js'
  ];

  for (const relFile of scriptFiles) {
    const code = fs.readFileSync(path.join(rootDir, relFile), 'utf8');
    vm.runInContext(code, sandbox, { filename: relFile });
  }

  const browserRegistry = sandbox.window.STEGO_SIGNATURES_REGISTRY;
  assert.ok(Array.isArray(browserRegistry), 'Browser registry must be an array');
  assert.strictEqual(browserRegistry.length, 13);
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(browserRegistry)),
    JSON.parse(JSON.stringify(nodeIndex.STEGO_SIGNATURES_REGISTRY))
  );

  assert.strictEqual(typeof sandbox.window.StegSignatures.matchSignaturesDetailed, 'function');
});

runTest('steganalysis.html loads signatures in deterministic manifest order', () => {
  const htmlContent = fs.readFileSync(path.join(rootDir, 'steganalysis.html'), 'utf8');

  // Extract all signature-related script src attributes
  const regex = /<script\s+src="([^"]*features\/stego-analysis\/detect\/signatures[^"]*)"><\/script>/g;
  const scriptTags = [];
  let match;
  while ((match = regex.exec(htmlContent)) !== null) {
    scriptTags.push(match[1]);
  }

  const expectedTags = [
    'js/features/stego-analysis/detect/signatures/contract.js',
    'js/features/stego-analysis/detect/signatures/registry.js',
    ...Manifest.map(m => `js/features/stego-analysis/detect/signatures/${m.path}`),
    'js/features/stego-analysis/detect/signatures/legacy-adapter.js',
    'js/features/stego-analysis/detect/signatures/legacy-matcher.js',
    'js/features/stego-analysis/detect/signatures/index.js',
    'js/features/stego-analysis/detect/signatures.js'
  ];

  assert.strictEqual(
    scriptTags.length,
    expectedTags.length,
    `steganalysis.html must contain exactly ${expectedTags.length} signature scripts, found ${scriptTags.length}`
  );

  for (let i = 0; i < expectedTags.length; i++) {
    assert.strictEqual(
      scriptTags[i],
      expectedTags[i],
      `Script order mismatch at index ${i}: expected ${expectedTags[i]}, found ${scriptTags[i]}`
    );
  }
});

runTest('Old and new CommonJS entrypoints expose compatible APIs', () => {
  const legacyFacade = require(path.join(rootDir, 'js/features/stego-analysis/detect/signatures.js'));
  const modernFacade = require(path.join(rootDir, 'js/features/stego-analysis/detect/signatures/index.js'));

  assert.strictEqual(legacyFacade.STEGO_SIGNATURES_REGISTRY, modernFacade.STEGO_SIGNATURES_REGISTRY);
  assert.strictEqual(legacyFacade.matchSignaturesDetailed, modernFacade.matchSignaturesDetailed);
  assert.ok(Array.isArray(legacyFacade.STEGO_SIGNATURES_REGISTRY));
  assert.strictEqual(typeof legacyFacade.matchSignaturesDetailed, 'function');
});

console.log('\nLoader Parity Summary: ' + passed + '/' + total + ' passed.');
if (passed !== total) process.exit(1);
