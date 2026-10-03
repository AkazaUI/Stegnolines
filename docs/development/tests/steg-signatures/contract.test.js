/**
 * @file contract.test.js
 * @description Unit tests for signature profile Schema v1 contract and validation rules.
 */

const assert = require('node:assert/strict');
const path = require('node:path');

const Contract = require('../../../../js/features/stego-analysis/detect/signatures/contract.js');
const { validateProfile, SCHEMA_VERSION, VALID_KINDS, VALID_MATCHER_KINDS, VALID_PLACEMENT_STATUSES } = Contract;

console.log('='.repeat(75));
console.log('🧪 StegoSignatures: Contract & Validation Tests');
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

function createBaseProfile() {
  return {
    schemaVersion: 1,
    id: 'tool.test-fixture',
    kind: 'tool',
    legacyIds: ['tool_test_fixture_mode_a'],
    identity: {
      name: 'Test Tool',
      titleAr: 'أداة اختبار',
      titleEn: 'Test Tool',
      url: 'https://example.com'
    },
    modes: [
      {
        id: 'mode-a',
        legacyId: 'tool_test_fixture_mode_a',
        enabled: true,
        carrierSignature: {
          matcherKind: 'legacy-exact-set',
          exactSymbols: [0x200B, 0x200C],
          alternateExactSymbols: [],
          minCount: 2,
          legacyFlags: {}
        },
        placementSignatures: {
          status: 'pending',
          definitions: []
        },
        presentation: {
          name: 'Mode A',
          titleAr: 'الوضع أ',
          titleEn: 'Mode A'
        }
      }
    ]
  };
}

runTest('Contract exposes required constants and validator', () => {
  assert.strictEqual(SCHEMA_VERSION, 1);
  assert.ok(Array.isArray(VALID_KINDS));
  assert.ok(Array.isArray(VALID_MATCHER_KINDS));
  assert.ok(Array.isArray(VALID_PLACEMENT_STATUSES));
  assert.strictEqual(typeof validateProfile, 'function');
});

runTest('Accepts valid single-mode profile', () => {
  const profile = createBaseProfile();
  assert.strictEqual(validateProfile(profile), true);
});

runTest('Accepts valid multi-mode profile', () => {
  const profile = createBaseProfile();
  profile.legacyIds.push('tool_test_fixture_mode_b');
  profile.modes.push({
    id: 'mode-b',
    legacyId: 'tool_test_fixture_mode_b',
    enabled: true,
    carrierSignature: {
      matcherKind: 'legacy-exact-set',
      exactSymbols: [0x200D, 0x2060],
      alternateExactSymbols: [],
      minCount: 3,
      legacyFlags: {}
    },
    placementSignatures: {
      status: 'pending',
      definitions: []
    },
    presentation: {
      name: 'Mode B',
      titleAr: 'الوضع ب',
      titleEn: 'Mode B'
    }
  });
  assert.strictEqual(validateProfile(profile), true);
});

runTest('Rejects non-object or null profile', () => {
  assert.throws(() => validateProfile(null), /must be a non-null object/);
  assert.throws(() => validateProfile('str'), /must be a non-null object/);
});

runTest('Rejects unsupported schemaVersion', () => {
  const p = createBaseProfile();
  p.schemaVersion = 2;
  assert.throws(() => validateProfile(p), /Unsupported schemaVersion/);
});

runTest('Rejects invalid kind', () => {
  const p = createBaseProfile();
  p.kind = 'invalid-kind';
  assert.throws(() => validateProfile(p), /Invalid profile kind/);
});

runTest('Rejects duplicate mode IDs within profile', () => {
  const p = createBaseProfile();
  p.legacyIds.push('tool_test_fixture_mode_a_duplicate');
  p.modes.push({
    ...p.modes[0],
    legacyId: 'tool_test_fixture_mode_a_duplicate'
  });
  assert.throws(() => validateProfile(p), /Duplicate mode id/);
});

runTest('Rejects mode legacyId not listed in profile.legacyIds', () => {
  const p = createBaseProfile();
  p.modes[0].legacyId = 'unlisted_legacy_id';
  assert.throws(() => validateProfile(p), /(not listed in profile\.legacyIds|no mode implements it)/);
});

runTest('Rejects invalid carrier code point', () => {
  const p = createBaseProfile();
  p.modes[0].carrierSignature.exactSymbols = [0x200B, 0x110000]; // Out of range
  assert.throws(() => validateProfile(p), /Invalid Unicode code point/);

  p.modes[0].carrierSignature.exactSymbols = [0x200B, -1];
  assert.throws(() => validateProfile(p), /Invalid Unicode code point/);

  p.modes[0].carrierSignature.exactSymbols = [0x200B, 2.5];
  assert.throws(() => validateProfile(p), /Invalid Unicode code point/);
});

runTest('Rejects invalid matcherKind', () => {
  const p = createBaseProfile();
  p.modes[0].carrierSignature.matcherKind = 'non-existent-matcher';
  assert.throws(() => validateProfile(p), /Invalid matcherKind/);
});

runTest('Rejects missing or invalid placementSignatures container', () => {
  const p1 = createBaseProfile();
  delete p1.modes[0].placementSignatures;
  assert.throws(() => validateProfile(p1), /placementSignatures must be an object/);

  const p2 = createBaseProfile();
  p2.modes[0].placementSignatures.status = 'unknown-status';
  assert.throws(() => validateProfile(p2), /Invalid placement status/);
});

runTest('Requires pending placement status to have empty definitions', () => {
  const p = createBaseProfile();
  p.modes[0].placementSignatures.status = 'pending';
  p.modes[0].placementSignatures.definitions = [{ fake: true }];
  assert.throws(() => validateProfile(p), /must have empty definitions/);
});

runTest('Rejects functions in profile data', () => {
  const p = createBaseProfile();
  p.identity.helper = () => true;
  assert.throws(() => validateProfile(p), /Functions are not allowed/);
});

console.log('\nContract Tests Summary: ' + passed + '/' + total + ' passed.');
if (passed !== total) process.exit(1);
