/**
 * @file registry.test.js
 * @description Unit tests for SignatureRegistry store, finalization, immutability, and legacy resolution.
 */

'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');

const { SignatureRegistryStore } = require('../../../../js/features/stego-analysis/detect/signatures/registry.js');
const Manifest = require('../../../../js/features/stego-analysis/detect/signatures/manifest.js');

console.log('='.repeat(75));
console.log('🧪 StegoSignatures: Registry & Immutability Tests');
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

function loadAllProfiles(registry) {
  for (const item of Manifest) {
    const fullPath = path.resolve(__dirname, '../../../../js/features/stego-analysis/detect/signatures', item.path);
    const profile = require(fullPath);
    registry.registerProfile(profile);
  }
}

runTest('Registers all 12 profiles from manifest without errors', () => {
  const reg = new SignatureRegistryStore();
  loadAllProfiles(reg);
  assert.strictEqual(reg.getProfiles().length, 12);
  assert.strictEqual(reg.getModes().length, 13);
});

runTest('Both StegZero modes resolve through one producer profile', () => {
  const reg = new SignatureRegistryStore();
  loadAllProfiles(reg);

  const profile = reg.getProfile('tool.stegzero');
  assert.ok(profile, 'Must find profile tool.stegzero');
  assert.strictEqual(profile.modes.length, 2);

  const mode3 = reg.getMode('tool.stegzero', '3bit');
  assert.ok(mode3);
  assert.strictEqual(mode3.legacyId, 'tool_stegzero_3bit');

  const mode1 = reg.getMode('tool.stegzero', '1bit');
  assert.ok(mode1);
  assert.strictEqual(mode1.legacyId, 'tool_stegzero_1bit');

  const res3 = reg.getByLegacyId('tool_stegzero_3bit');
  assert.ok(res3);
  assert.strictEqual(res3.profile.id, 'tool.stegzero');
  assert.strictEqual(res3.mode.id, '3bit');

  const res1 = reg.getByLegacyId('tool_stegzero_1bit');
  assert.ok(res1);
  assert.strictEqual(res1.profile.id, 'tool.stegzero');
  assert.strictEqual(res1.mode.id, '1bit');
});

runTest('StegZero modes contain verified supplied placement signatures', () => {
  const reg = new SignatureRegistryStore();
  loadAllProfiles(reg);

  const profile = reg.getProfile('tool.stegzero');
  for (const mode of profile.modes) {
    assert.strictEqual(mode.placementSignatures.status, 'supplied');
    assert.strictEqual(mode.placementSignatures.definitions.length, 1);
    const def = mode.placementSignatures.definitions[0];
    assert.strictEqual(def.region.value, 'whole');
    assert.strictEqual(def.anchor.value, 'after');
    assert.strictEqual(def.scope.value, 'whole-text');
    assert.strictEqual(def.distribution.value, 'regular');
    assert.strictEqual(def.source.kind, 'source-code');
    assert.strictEqual(def.source.locator, 'interleavePayload()');
  }
});

runTest('Every legacy ID in manifest resolves to its profile and mode', () => {
  const reg = new SignatureRegistryStore();
  loadAllProfiles(reg);

  for (const item of Manifest) {
    for (const legacyId of item.legacyIds) {
      const match = reg.getByLegacyId(legacyId);
      assert.ok(match, `Legacy ID "${legacyId}" must resolve`);
      assert.strictEqual(match.profile.id, item.id);
      assert.strictEqual(match.mode.legacyId, legacyId);
    }
  }
});

runTest('Rejects duplicate profile registration', () => {
  const reg = new SignatureRegistryStore();
  loadAllProfiles(reg);

  const duplicate = reg.getProfile('tool.stegoline');
  assert.throws(() => reg.registerProfile(duplicate), /already registered/);
});

runTest('Finalization enforces deep immutability', () => {
  const reg = new SignatureRegistryStore();
  loadAllProfiles(reg);
  reg.finalizeRegistry();
  assert.strictEqual(reg.isFinalized(), true);

  // Attempt to register after finalization
  assert.throws(() => {
    reg.registerProfile({
      schemaVersion: 1,
      id: 'tool.new',
      kind: 'tool',
      legacyIds: ['tool_new'],
      identity: { name: 'N', titleAr: 'N', titleEn: 'N' },
      modes: []
    });
  }, /already finalized and immutable/);

  // Attempt to mutate profile data
  const profile = reg.getProfile('tool.stegzero');
  assert.ok(Object.isFrozen(profile));
  assert.ok(Object.isFrozen(profile.modes));
  assert.ok(Object.isFrozen(profile.modes[0]));

  assert.throws(() => {
    profile.identity.name = 'Mutated';
  }, /Cannot assign to read only property/);
});

console.log('\nRegistry Tests Summary: ' + passed + '/' + total + ' passed.');
if (passed !== total) process.exit(1);
