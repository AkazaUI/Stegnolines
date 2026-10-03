/**
 * @file steganalysis-detection.test.js
 * @description Comprehensive automated test suite for Steganalysis false-positive mitigation,
 * contextual evidence assessment, and forensic contract adherence.
 * Uses node:assert/strict in Node.js.
 */

const assert = require('node:assert/strict');
const path = require('node:path');

// ── Dependency order strictly matching steganalysis.html ──
const rootDir = path.resolve(__dirname, '../../..');

const { STEGO_SIGNATURES_REGISTRY, matchSignaturesDetailed } = require(path.join(rootDir, 'js/features/stego-analysis/detect/signatures.js'));
global.STEGO_SIGNATURES_REGISTRY = STEGO_SIGNATURES_REGISTRY;
global.StegSignatures = { STEGO_SIGNATURES_REGISTRY, matchSignaturesDetailed };

const UnicodeContext = require(path.join(rootDir, 'js/features/stego-analysis/shared/unicode-context.js'));
global.UnicodeContext = UnicodeContext;

const StegDetectSnow = require(path.join(rootDir, 'js/features/stego-analysis/detect/detectors/detect-snow.js'));
global.StegDetectSnow = StegDetectSnow;

const StegDetectZwc = require(path.join(rootDir, 'js/features/stego-analysis/detect/detectors/detect-zwc.js'));
global.StegDetectZwc = StegDetectZwc;

const StegDetectVs = require(path.join(rootDir, 'js/features/stego-analysis/detect/detectors/detect-vs.js'));
global.StegDetectVs = StegDetectVs;

const StegDetectHomoglyphs = require(path.join(rootDir, 'js/features/stego-analysis/detect/detectors/detect-homoglyphs.js'));
global.StegDetectHomoglyphs = StegDetectHomoglyphs;

const StegDetectBidi = require(path.join(rootDir, 'js/features/stego-analysis/detect/detectors/detect-bidi.js'));
global.StegDetectBidi = StegDetectBidi;

const EvidenceAssessor = require(path.join(rootDir, 'js/features/stego-analysis/detect/evidence-assessor.js'));
global.EvidenceAssessor = EvidenceAssessor;

const StegDetectEngine = require(path.join(rootDir, 'js/features/stego-analysis/detect/detect-engine.js'));
global.StegDetectEngine = StegDetectEngine;

const { sanitizeForensicText } = require(path.join(rootDir, 'js/features/stego-analysis/detect/ui/threat-dashboard.js'));

const { analyzeText } = StegDetectEngine;

console.log('='.repeat(75));
console.log('🧪 StegoLines Steganalysis False-Positive & Forensic Contract Suite');
console.log('='.repeat(75));

let passed = 0;
let total = 0;

function runTest(testName, fn) {
  total++;
  try {
    fn();
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${testName}`);
    console.error(`     Error: ${err.message}`);
    throw err;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// 1. Benign and Ambiguous Fixtures (Verdict Must Be Clean)
// ════════════════════════════════════════════════════════════════════════════
console.log('\n[Suite 1: Benign & Ambiguous Fixtures]');

runTest('Each of the 6 reported code points by itself yields clean verdict', () => {
  const reportedPoints = [
    { name: 'U+0441 (Cyrillic Small Es)', text: '\u0441' },
    { name: 'U+0430 (Cyrillic Small A)', text: '\u0430' },
    { name: 'U+2068 (FSI)', text: '\u2068' },
    { name: 'U+2069 (PDI)', text: '\u2069' },
    { name: 'U+202F (Narrow No-Break Space)', text: '\u202F' },
    { name: 'U+2003 (Em Space)', text: '\u2003' }
  ];

  for (const item of reportedPoints) {
    const res = analyzeText(item.text);
    assert.strictEqual(res.evidence.verdict, 'clean', `${item.name} must have clean verdict`);
    assert.strictEqual(res.evidence.isSuspicious, false, `${item.name} must not be suspicious`);
    assert.strictEqual(res.totalFound, 0, `${item.name} must produce 0 actionable results`);
    assert.strictEqual(res.results.length, 0);
    assert.strictEqual(res.observationCount, 1, `${item.name} must still be tracked as an observation`);
  }
});

runTest('Natural Russian sentence with 13 homoglyph letters remains clean', () => {
  const russianText = 'система работает нормально';
  const res = analyzeText(russianText);
  assert.strictEqual(res.evidence.verdict, 'clean');
  assert.strictEqual(res.evidence.isSuspicious, false);
  assert.strictEqual(res.totalFound, 0);
  assert.strictEqual(res.results.length, 0);
  assert.ok(res.observationCount >= 10, 'Observations must be preserved for forensic inventory');
  assert.strictEqual(res.benignObservationCount, res.observationCount);
});

runTest('Natural Greek sentence with lookalikes remains clean', () => {
  const greekText = 'Καλημέρα κόσμε, όλα λειτουργούν καλά';
  const res = analyzeText(greekText);
  assert.strictEqual(res.evidence.verdict, 'clean');
  assert.strictEqual(res.evidence.isSuspicious, false);
  assert.strictEqual(res.totalFound, 0);
  assert.strictEqual(res.benignObservationCount, res.observationCount);
});

runTest('Numeric and French punctuation using U+202F remains clean', () => {
  const frenchText = 'Le prix est de 15\u202F000 € ! «\u202FBonjour !\u202F»';
  const res = analyzeText(frenchText);
  assert.strictEqual(res.evidence.verdict, 'clean');
  assert.strictEqual(res.evidence.isSuspicious, false);
  assert.strictEqual(res.totalFound, 0);
});

runTest('Repeated but separated U+2003 typography remains clean', () => {
  const typographyText = 'Chapter 1\u2003Introduction\nChapter 2\u2003Methodology\nChapter 3\u2003Results';
  const res = analyzeText(typographyText);
  assert.strictEqual(res.evidence.verdict, 'clean');
  assert.strictEqual(res.evidence.isSuspicious, false);
  assert.strictEqual(res.totalFound, 0);
});

runTest('Balanced and nested directional isolates remain clean', () => {
  const bidiText = 'Latin prefix \u2068عربي \u2066مرحبا\u2069 نص\u2069 Latin suffix';
  const res = analyzeText(bidiText);
  assert.strictEqual(res.evidence.verdict, 'clean');
  assert.strictEqual(res.evidence.isSuspicious, false);
  assert.strictEqual(res.totalFound, 0);
});

runTest('One unmatched FSI or one unmatched PDI yields clean verdict without actionable result', () => {
  const resFsi = analyzeText('Hello \u2068 World');
  assert.strictEqual(resFsi.evidence.verdict, 'clean');
  assert.strictEqual(resFsi.totalFound, 0);
  assert.strictEqual(resFsi.observationCount, 1);
  assert.strictEqual(resFsi.ambiguousObservationCount, 1);

  const resPdi = analyzeText('Hello \u2069 World');
  assert.strictEqual(resPdi.evidence.verdict, 'clean');
  assert.strictEqual(resPdi.totalFound, 0);
  assert.strictEqual(resPdi.observationCount, 1);
  assert.strictEqual(resPdi.ambiguousObservationCount, 1);
});

runTest('Normal emoji ❤️❤️ and family ZWJ sequences remain clean', () => {
  const heartText = '❤️❤️';
  const resHeart = analyzeText(heartText);
  assert.strictEqual(resHeart.evidence.verdict, 'clean');
  assert.strictEqual(resHeart.evidence.isSuspicious, false);
  assert.strictEqual(resHeart.totalFound, 0);
  assert.strictEqual(resHeart.matchedSignatures.length, 0);

  const familyEmoji = '👨‍👩‍👧 Family and 👍🏽 thumbs up';
  const resFamily = analyzeText(familyEmoji);
  assert.strictEqual(resFamily.evidence.verdict, 'clean');
  assert.strictEqual(resFamily.totalFound, 0);
});

runTest('Mongolian free variation selectors after Mongolian letters remain clean', () => {
  const mongolianText = '\u1820\u180B\u1821\u180C\u1822\u180D';
  const res = analyzeText(mongolianText);
  assert.strictEqual(res.evidence.verdict, 'clean');
  assert.strictEqual(res.totalFound, 0);
});

runTest('Persian and Arabic text with multiple natural joiners remains clean without count expiration', () => {
  const persianText = 'سلام‌علیکم محترم کتاب‌ها خانه‌ها گل‌ها نامه‌ها پیام‌ها';
  const res = analyzeText(persianText);
  assert.strictEqual(res.evidence.verdict, 'clean');
  assert.strictEqual(res.totalFound, 0);
  assert.ok(res.observationCount >= 6, 'Multiple joiners must be detected');
  assert.strictEqual(res.benignObservationCount, res.observationCount);
});

runTest('Standard leading Byte Order Mark (BOM) remains clean', () => {
  const bomText = '\uFEFFThis document begins with a standard BOM.';
  const res = analyzeText(bomText);
  assert.strictEqual(res.evidence.verdict, 'clean');
  assert.strictEqual(res.totalFound, 0);
  assert.strictEqual(res.observationCount, 1);
  assert.strictEqual(res.benignObservationCount, 1);
});

// ════════════════════════════════════════════════════════════════════════════
// 2. Suspicious Fixtures (Actionable Evidence Required)
// ════════════════════════════════════════════════════════════════════════════
console.log('\n[Suite 2: Suspicious Fixtures with Actionable Evidence]');

runTest('Confusable p\\u0430ypal emits MIXED_SCRIPT_CONFUSABLE for Cyrillic a', () => {
  const attackText = 'p\u0430ypal';
  const res = analyzeText(attackText);

  assert.strictEqual(res.evidence.isSuspicious, true);
  assert.ok(res.evidence.score >= 40);
  assert.strictEqual(res.totalFound, 1);
  assert.strictEqual(res.results[0].position, 1);
  assert.strictEqual(res.results[0].canonical, 'a');

  const confusableEvent = res.evidence.events.find(e => e.code === 'MIXED_SCRIPT_CONFUSABLE');
  assert.ok(confusableEvent, 'Must emit MIXED_SCRIPT_CONFUSABLE');
  assert.deepStrictEqual(confusableEvent.positions, [1]);
});

runTest('Token mixing ASCII and fullwidth characters emits MIXED_WIDTH_TOKEN', () => {
  const mixedWidthText = 'secure１23'; // １ is U+FF11
  const res = analyzeText(mixedWidthText);

  assert.strictEqual(res.evidence.isSuspicious, true);
  assert.ok(res.evidence.score >= 40);
  assert.ok(res.totalFound >= 1);

  const event = res.evidence.events.find(e => e.code === 'MIXED_WIDTH_TOKEN');
  assert.ok(event, 'Must emit MIXED_WIDTH_TOKEN');
  assert.ok(event.positions.includes(6));
});

runTest('Consecutive covert carrier run A\\u200B\\u200C\\u200DB is detected', () => {
  const carrierRunText = 'A\u200B\u200C\u200DB';
  const res = analyzeText(carrierRunText);

  assert.strictEqual(res.evidence.isSuspicious, true);
  assert.ok(res.evidence.score >= 40);
  assert.strictEqual(res.totalFound, 3);
  assert.deepStrictEqual(res.results.map(r => r.position), [1, 2, 3]);

  const runEvent = res.evidence.events.find(e => e.code === 'COVERT_CARRIER_RUN');
  assert.ok(runEvent, 'Must emit COVERT_CARRIER_RUN');
});

runTest('Leading orphan variation selector run matches StegoLines VS signature', () => {
  const orphanVsPayload = String.fromCodePoint(0xFE01, 0xE0100) + 'Cover message';
  const res = analyzeText(orphanVsPayload);

  assert.strictEqual(res.evidence.isSuspicious, true);
  assert.ok(res.evidence.score >= 65);
  assert.ok(res.totalFound >= 2);

  const orphanVsEvent = res.evidence.events.find(e => e.code === 'ORPHAN_VS_RUN');
  assert.ok(orphanVsEvent, 'Must emit ORPHAN_VS_RUN');

  const sigEvent = res.evidence.events.find(e => e.code === 'SIGNATURE_MATCH');
  assert.ok(sigEvent, 'Must emit validated SIGNATURE_MATCH');
  assert.ok(res.matchedSignatures.some(s => s.id === 'tool_stegoline_emoji'));
});

runTest('Mixed space run A\\u2003\\u202F\\u2003B emits MIXED_SPACE_RUN', () => {
  const mixedSpaceText = 'A\u2003\u202F\u2003B';
  const res = analyzeText(mixedSpaceText);

  assert.strictEqual(res.evidence.isSuspicious, true);
  assert.ok(res.evidence.score >= 40);
  assert.strictEqual(res.totalFound, 3);

  const spaceEvent = res.evidence.events.find(e => e.code === 'MIXED_SPACE_RUN');
  assert.ok(spaceEvent, 'Must emit MIXED_SPACE_RUN');
  assert.deepStrictEqual(spaceEvent.positions, [1, 2, 3]);
});

runTest('Multiple unmatched BiDi controls with covert carrier emit BIDI_WITH_COVERT_CARRIER', () => {
  const bidiCarrierText = 'Text \u2068\u2067\u200B more text';
  const res = analyzeText(bidiCarrierText);

  assert.strictEqual(res.evidence.isSuspicious, true);
  const event = res.evidence.events.find(e => e.code === 'BIDI_WITH_COVERT_CARRIER');
  assert.ok(event, 'Must emit BIDI_WITH_COVERT_CARRIER');
});

runTest('Exact tool signatures match their exact symbols and promote positions', () => {
  // tool_stego_tools uses [0x200C, 0x202C, 0x200E, 0x202D]
  const toolPayload = 'Clean ' + String.fromCodePoint(0x200C, 0x202C, 0x200E, 0x202D) + ' text';
  const res = analyzeText(toolPayload);

  assert.strictEqual(res.evidence.isSuspicious, true);
  assert.ok(res.matchedSignatures.some(s => s.id === 'tool_stego_tools'));
  assert.ok(res.totalFound >= 4);
});

runTest('Valid multiline SNOW whitespace structure is detected and promoted', () => {
  const snowText = 'First line with stego\t   \nSecond line with stego\t  \nThird line clean';
  const res = analyzeText(snowText);

  assert.strictEqual(res.evidence.isSuspicious, true);
  const snowEvent = res.evidence.events.find(e => e.code === 'SNOW_PATTERN');
  assert.ok(snowEvent, 'Must emit SNOW_PATTERN');
  assert.ok(res.totalFound >= 3);
});

// ════════════════════════════════════════════════════════════════════════════
// 3. Regression, Invariant, and Sanitization Assertions
// ════════════════════════════════════════════════════════════════════════════
console.log('\n[Suite 3: Regression, Contract & Sanitization Assertions]');

runTest('Sanitizing ❤️❤️ returns byte-identical text', () => {
  const input = '❤️❤️';
  const analysis = analyzeText(input);
  const sanitized = sanitizeForensicText(input, analysis);
  assert.strictEqual(sanitized, input, 'Sanitization must preserve emoji variation selectors byte-for-byte');
});

runTest('Sanitizing p\\u0430ypal replaces only the actionable Cyrillic character with Latin a', () => {
  const input = 'p\u0430ypal';
  const analysis = analyzeText(input);
  const sanitized = sanitizeForensicText(input, analysis);
  assert.strictEqual(sanitized, 'paypal', 'Must canonically normalize only the confusable');
});

runTest('Sanitizing carrier-run removes only promoted positions', () => {
  const input = 'A\u200B\u200C\u200DB';
  const analysis = analyzeText(input);
  const sanitized = sanitizeForensicText(input, analysis);
  assert.strictEqual(sanitized, 'AB', 'Must strip only actionable carriers');
});

runTest('Supplementary-plane character before finding does not shift code-point position', () => {
  // 😀 is U+1F600 (1 code point, 2 UTF-16 code units)
  const input = '😀p\u0430ypal';
  const analysis = analyzeText(input);
  assert.strictEqual(analysis.results.length, 1);
  assert.strictEqual(analysis.results[0].position, 2, 'Code point index must be 2, not UTF-16 offset 3');
});

runTest('Benign U+202F elsewhere does not suppress an exact tool signature', () => {
  const text = '10\u202F000 € ' + String.fromCodePoint(0x200C, 0x202C, 0x200E, 0x202D);
  const analysis = analyzeText(text);
  assert.ok(analysis.matchedSignatures.some(s => s.id === 'tool_stego_tools'), 'Tool signature must still match');
  assert.strictEqual(analysis.results.length, 4, 'Benign 202F must NOT be counted as suspect');
});

runTest('Two ordinary FE0F selectors (❤️❤️) do not match the VS signature', () => {
  const analysis = analyzeText('❤️❤️');
  assert.strictEqual(analysis.matchedSignatures.length, 0);
  assert.strictEqual(analysis.results.length, 0);
});

runTest('Every result position exists in observations and invariant contracts hold', () => {
  const testInputs = [
    'p\u0430ypal',
    'A\u200B\u200C\u200DB',
    'система работает нормально',
    'A\u2003\u202F\u2003B',
    String.fromCodePoint(0xFE01, 0xE0100) + 'Payload'
  ];

  for (const text of testInputs) {
    const res = analyzeText(text);

    assert.strictEqual(res.observationCount, res.observations.length);
    assert.strictEqual(res.totalFound, res.results.length);

    const obsPositions = new Set(res.observations.map(o => o.position));
    for (const r of res.results) {
      assert.ok(obsPositions.has(r.position), `Result position ${r.position} must exist in observations`);
    }
  }
});

runTest('Performance smoke test: 200 KB fixture completes in <= 1000 ms', () => {
  // 200 KB text with occasional benign typography and one covert carrier
  const chunk = 'This is normal English text with occasional 10\u202F000 numbers and punctuation. ';
  const repeatCount = Math.ceil(200000 / chunk.length);
  const largeText = chunk.repeat(repeatCount) + 'p\u0430ypal';

  const t0 = performance.now();
  const res = analyzeText(largeText);
  const duration = performance.now() - t0;

  console.log(`     ⚡ Performance: analyzed ${largeText.length} chars in ${duration.toFixed(2)} ms`);
  assert.ok(duration < 1000, `Execution time ${duration} ms exceeded 1000 ms limit`);
  assert.strictEqual(res.totalFound, 1);
});

console.log('\n' + '='.repeat(75));
console.log(`🎉 ALL ${passed}/${total} STEGANALYSIS DETECTION TESTS PASSED!`);
console.log('='.repeat(75));
