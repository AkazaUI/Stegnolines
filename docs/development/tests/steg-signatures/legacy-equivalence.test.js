/**
 * @file legacy-equivalence.test.js
 * @description Verifies 100% equivalence between legacy registry/matcher and the new modular profiles.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '../../../..');

// Load modern modular facade
const {
  STEGO_SIGNATURES_REGISTRY: modernRegistry,
  matchSignaturesDetailed: modernMatcher
} = require(path.join(rootDir, 'js/features/stego-analysis/detect/signatures/index.js'));

// Also load backward-compatibility facade
const facade = require(path.join(rootDir, 'js/features/stego-analysis/detect/signatures.js'));

// Initialize full detection pipeline dependencies
global.STEGO_SIGNATURES_REGISTRY = modernRegistry;
global.StegSignatures = { STEGO_SIGNATURES_REGISTRY: modernRegistry, matchSignaturesDetailed: modernMatcher };
global.UnicodeContext = require(path.join(rootDir, 'js/features/stego-analysis/shared/unicode-context.js'));
global.StegDetectSnow = require(path.join(rootDir, 'js/features/stego-analysis/detect/detectors/detect-snow.js'));
global.StegDetectZwc = require(path.join(rootDir, 'js/features/stego-analysis/detect/detectors/detect-zwc.js'));
global.StegDetectVs = require(path.join(rootDir, 'js/features/stego-analysis/detect/detectors/detect-vs.js'));
global.StegDetectHomoglyphs = require(path.join(rootDir, 'js/features/stego-analysis/detect/detectors/detect-homoglyphs.js'));
global.StegDetectBidi = require(path.join(rootDir, 'js/features/stego-analysis/detect/detectors/detect-bidi.js'));
global.EvidenceAssessor = require(path.join(rootDir, 'js/features/stego-analysis/detect/evidence-assessor.js'));
const StegDetectEngine = require(path.join(rootDir, 'js/features/stego-analysis/detect/detect-engine.js'));

const fixturesDir = path.join(__dirname, 'fixtures');
const goldenRegistry = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'legacy-registry.json'), 'utf8'));
const goldenMatches = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'legacy-matches.json'), 'utf8'));

console.log('='.repeat(75));
console.log('🧪 StegoSignatures: Legacy Equivalence & Forensic Integrity Suite');
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

runTest('Flattened registry has exactly 12 entries in identical order', () => {
  assert.strictEqual(modernRegistry.length, 12);
  assert.strictEqual(goldenRegistry.length, 12);
  for (let i = 0; i < 12; i++) {
    assert.strictEqual(modernRegistry[i].id, goldenRegistry[i].id);
  }
});

runTest('Every flattened entry matches golden entry 100% deep strictly equal', () => {
  for (let i = 0; i < 12; i++) {
    assert.deepStrictEqual(modernRegistry[i], goldenRegistry[i], `Mismatch in entry ${goldenRegistry[i].id}`);
  }
});

runTest('Signatures facade exports identical registry and matcher to index.js', () => {
  assert.strictEqual(facade.STEGO_SIGNATURES_REGISTRY, modernRegistry);
  assert.strictEqual(facade.matchSignaturesDetailed, modernMatcher);
});

runTest('Matcher and analyzeText produce identical forensic results across all 16 golden fixtures', () => {
  for (const fixture of goldenMatches) {
    const analysis = StegDetectEngine.analyzeText(fixture.text);

    assert.strictEqual(analysis.riskScore, fixture.riskScore, `Risk score mismatch for ${fixture.caseId}`);
    assert.strictEqual(analysis.verdict, fixture.verdict, `Verdict mismatch for ${fixture.caseId}`);

    const matchedIds = analysis.matchedSignatures ? analysis.matchedSignatures.map(s => s.id) : [];
    assert.deepStrictEqual(matchedIds, fixture.matchedSignatureIds, `Matched IDs mismatch for ${fixture.caseId}`);

    assert.deepStrictEqual(analysis.actionablePositions || [], fixture.actionablePositions, `Actionable positions mismatch for ${fixture.caseId}`);

    const eventCodes = analysis.evidence && analysis.evidence.events ? analysis.evidence.events.map(e => e.code) : [];
    assert.deepStrictEqual(eventCodes, fixture.eventCodes, `Event codes mismatch for ${fixture.caseId}`);
  }
});

runTest('StegZero mode output is strictly mutually exclusive based on detected mode', () => {
  // 1. Text with 3-bit payload including repeated 1-bit symbols:
  // Must match ONLY 3-bit Standard Mode and NEVER 1-bit Compatibility Mode
  const text3bitRepeated = 'Cover ' + String.fromCodePoint(
    0x200B, 0x200C, 0x200D, 0x2060, 0x2062, 0x2063, 0x2064, 0xFEFF,
    0x200B, 0x200C, 0x200B, 0x200C
  ) + ' msg';
  const res3 = StegDetectEngine.analyzeText(text3bitRepeated);
  const matched3 = res3.matchedSignatures.map(s => s.id);
  assert.deepStrictEqual(matched3, ['tool_stegzero_3bit'], 'Must match only 3-bit mode');
  assert.strictEqual(res3.matchedSignatures[0].encodingTableTitle, '1. Standard Mode — 3 bits/symbol');

  // 2. Text with 1-bit payload only:
  // Must match ONLY 1-bit Compatibility Mode and NEVER 3-bit Standard Mode
  const text1bitOnly = 'Cover ' + String.fromCodePoint(
    0x200B, 0x200C, 0x200B, 0x200C, 0x200B, 0x200C
  ) + ' msg';
  const res1 = StegDetectEngine.analyzeText(text1bitOnly);
  const matched1 = res1.matchedSignatures.map(s => s.id);
  assert.deepStrictEqual(matched1, ['tool_stegzero_1bit'], 'Must match only 1-bit mode');
  assert.strictEqual(res1.matchedSignatures[0].encodingTableTitle, '2. Compatibility Mode — 1 bit/symbol');
});

console.log('\nLegacy Equivalence Summary: ' + passed + '/' + total + ' passed.');
if (passed !== total) process.exit(1);
