# Signature profiles file split — current implementation plan

## 1. Scope and non-goals

This is the authoritative plan for the current task.

The current objective is **structural separation only**:

- move signature definitions out of the monolithic `js/features/stego-analysis/detect/signatures.js`;
- create one profile file per tool, research method, watermark method, or generic technique;
- allow one producer profile to contain multiple `modes`;
- allow every mode to own a different carrier-symbol signature;
- reserve a typed `placementSignatures` container on every mode so Region/Anchor/Scope/Distribution definitions can be added later;
- preserve the current matcher behavior, risk score, matched IDs, UI output, and public browser/CommonJS API.

Explicitly out of scope now:

- researching where any external tool places its symbols;
- inventing Region, Anchor, Scope, or Distribution values;
- implementing a placement matcher;
- changing signature confidence, attribution, ambiguity, or evidence weights;
- changing which inputs currently match;
- creating separate SNOW-family tool profiles from the current candidate list;
- changing the dashboard or sanitization behavior except where an import path must be updated.

The user will provide placement facts later or explicitly authorize research. Empty placement data is intentional and must not block this refactor.

## 2. Verified current architecture

`js/features/stego-analysis/detect/signatures.js` currently contains:

- twelve flat registry entries;
- tool/research/UI metadata;
- Unicode carrier sets and encoding tables;
- special flags for whitespace, variation selectors, and watermarks;
- `matchSignaturesDetailed()`;
- browser globals and CommonJS exports.

Current consumers:

- `detect-engine.js` reads `STEGO_SIGNATURES_REGISTRY`.
- `evidence-assessor.js` calls `matchSignaturesDetailed(candidateObservations, text, snowData)`.
- `threat-dashboard.js` reads the returned flat signature metadata.
- `steganalysis-controller.js` persists `matchedSignatures`.
- `docs/development/tests/steganalysis-detection.test.js` imports `detect/signatures.js` directly.
- `steganalysis.html` loads `detect/signatures.js` before the detectors and assessor.

The structural refactor must keep these consumers working through a compatibility facade. It must not require all consumers to understand the new nested profile schema immediately.

## 3. Target directory structure

Create:

```text
js/features/stego-analysis/detect/signatures/
├── contract.js
├── registry.js
├── manifest.js
├── legacy-adapter.js
├── legacy-matcher.js
├── index.js
└── profiles/
    ├── tools/
    │   ├── steganography-tools.js
    │   ├── doublespeak.js
    │   ├── stegzero.js
    │   └── stegoline.js
    ├── techniques/
    │   └── whitespace.js
    ├── research/
    │   ├── multilayer-huffman.js
    │   ├── aitsteg.js
    │   ├── pos-fpe.js
    │   └── lisat-2015.js
    └── watermarks/
        ├── homoglyph-substitution.js
        └── social-media.js
```

Responsibilities:

- `contract.js`: schema constants and structural validation only.
- `registry.js`: profile registration, uniqueness checks, ordering, and immutable lookup.
- `manifest.js`: ordered profile ID/path list used by Node and verified against browser script tags.
- `legacy-adapter.js`: flattens profiles and modes back to the current twelve-entry shape.
- `legacy-matcher.js`: current matching behavior with only import/registry plumbing changed.
- `index.js`: stable browser/CommonJS facade exposing new and compatibility APIs.
- `profiles/**`: declarative definitions only; no DOM access, global risk logic, or generic matching branches.

Keep `js/features/stego-analysis/detect/signatures.js` temporarily as a small compatibility facade. It must not retain signature data.

Do not create `placement-context.js` or `placement-matcher.js` in this task. Those belong to the later placement implementation.

## 4. Producer profile contract

One file represents one producer or one generic/research method. Different operational modes belong inside that file.

```js
{
  schemaVersion: 1,
  id: 'tool.stegzero',
  kind: 'tool',                         // tool | technique | research | watermark
  legacyIds: ['tool_stegzero_3bit', 'tool_stegzero_1bit'],
  identity: {
    name: 'StegZero',
    titleAr: '...',
    titleEn: '...',
    descriptionAr: '...',
    descriptionEn: '...',
    url: 'https://stegzero.com/',
    secondaryUrl: null
  },
  modes: [
    {
      id: '3bit',
      legacyId: 'tool_stegzero_3bit',
      enabled: true,
      carrierSignature: {
        matcherKind: 'legacy-exact-set',
        exactSymbols: [0x200B, 0x200C, 0x200D, 0x2060, 0x2062, 0x2063, 0x2064, 0xFEFF],
        alternateExactSymbols: [],
        minCount: 4,
        legacyFlags: {}
      },
      placementSignatures: {
        status: 'pending',              // pending | supplied | researched
        definitions: []
      },
      presentation: {
        name: 'StegZero (3-bit)',
        titleAr: '...',
        titleEn: '...',
        descriptionAr: '...',
        descriptionEn: '...',
        encodingTable: []
      }
    },
    {
      id: '1bit',
      legacyId: 'tool_stegzero_1bit',
      enabled: true,
      carrierSignature: {
        matcherKind: 'legacy-exact-set',
        exactSymbols: [0x200B, 0x200C],
        alternateExactSymbols: [],
        minCount: 4,
        legacyFlags: {}
      },
      placementSignatures: {
        status: 'pending',
        definitions: []
      },
      presentation: {
        name: 'StegZero (1-bit)',
        titleAr: '...',
        titleEn: '...',
        descriptionAr: '...',
        descriptionEn: '...',
        encodingTable: []
      }
    }
  ]
}
```

### Profile-level versus mode-level fields

- Put producer identity, shared URLs, and shared descriptions at profile level.
- Put mode name/title, carrier symbols, count rules, alternate symbol sets, encoding table, and future placement signatures at mode level.
- A profile with one known mode still uses `modes: [{ id: 'default', ... }]`; do not special-case single-mode tools.
- Do not duplicate profile identity inside every mode unless the mode needs a different displayed title/description.
- `legacyId` is mandatory during migration because saved results and UI element IDs may depend on it.

### Mode ownership rule

Every mode is an independent signature unit:

- it may have a completely different Unicode alphabet;
- it may use the same alphabet with a different minimum count or matching type;
- it may later have one or more placement signatures;
- it may be enabled/disabled independently;
- adding a mode changes only that producer file and mode-specific tests, not the generic matcher.

## 5. Carrier signature mapping

Use these `matcherKind` values to preserve current branches without researching new behavior:

| `matcherKind` | Current behavior represented |
|---|---|
| `legacy-exact-set` | current exact/alternate symbol-set and min-count logic |
| `legacy-variation-selectors` | current `isVariationSelectorScheme` branch |
| `legacy-whitespace` | current `isSnow`/`isWhitespace` branch |
| `legacy-watermark-subset` | current `isWatermark` subset/min-count branch |

Field mapping:

- current `exactSymbols` -> `mode.carrierSignature.exactSymbols`;
- current `altExactSymbols` -> `mode.carrierSignature.alternateExactSymbols`;
- current `minCount` -> `mode.carrierSignature.minCount`;
- current special flags -> `matcherKind` plus `legacyFlags` when the compatibility object still needs the flag;
- current `encodingTable` -> `mode.presentation.encodingTable`;
- current `candidateTools` stays under the whitespace technique mode presentation metadata; it does not create unresearched tool profiles.

Do not normalize or reinterpret Unicode symbols in this phase. Flattened compatibility entries must contain the same arrays, values, and ordering as the current registry.

## 6. Reserved Placement Signature container

Every mode must contain this field even though it is not used yet:

```js
placementSignatures: {
  status: 'pending',
  definitions: []
}
```

Rules for the current task:

- `status` is `pending` for all migrated modes unless the user explicitly supplies data.
- `definitions` remains empty.
- The legacy adapter and matcher ignore this field completely.
- Empty placement definitions do not generate warnings, lower confidence, or prevent carrier matches.
- Do not copy assumptions from comments or infer placements from isolated samples.

Reserved future shape, documented only to prevent another schema migration:

```js
{
  id: 'user-supplied-name',
  enabled: false,
  source: {
    kind: 'user-supplied',               // user-supplied | source-code | paper | generated-sample
    reference: ''
  },
  region: { value: 'start' },             // start | end | interior | whole
  anchor: { value: 'between-characters' },// between-characters | between-words | before | after
  scope: { value: 'single-word' },        // single-word | multiple-words | whole-text
  distribution: { value: 'contiguous' }   // contiguous | regular | scattered | random
}
```

The future object may gain deterministic modifiers when placement matching is authorized. The current validator checks only that pending definitions are an array and does not evaluate them.

## 7. Registry, manifest, and loading

`registry.js` exposes:

```js
registerProfile(profile)
finalizeRegistry()
getProfile(profileId)
getMode(profileId, modeId)
getProfiles()
getModes()
```

Validation now enforces:

- unique profile IDs;
- unique mode IDs inside each profile;
- globally unique `legacyId` values;
- valid `kind` and `matcherKind` enums;
- at least one mode per profile;
- integer Unicode code points in valid range;
- `minCount >= 1` where required;
- `placementSignatures.status` and `.definitions` on every mode;
- pending placement status with an empty definitions array;
- no functions or DOM objects in profile data.

Registration convention:

- Browser: `contract.js` and `registry.js` load first; each classic profile script registers its object immediately.
- CommonJS: profile modules export plain objects without global side effects; `index.js` requires manifest paths and registers them.
- `index.js` finalizes and deep-freezes the registry after all manifest entries load.
- Missing, duplicate, or out-of-order browser profiles are hard errors in development/tests, not silent omissions.

`manifest.js` is the only ordered list of profile script paths. A test compares it with `steganalysis.html` so browser and Node registries cannot drift.

## 8. Legacy adapter and no-behavior-change guarantee

`legacy-adapter.js` converts each mode into one object with current flat fields:

```js
function toLegacyEntry(profile, mode) {
  return {
    id: mode.legacyId,
    type: profile.kind,
    name: mode.presentation.name || profile.identity.name,
    titleAr: mode.presentation.titleAr || profile.identity.titleAr,
    titleEn: mode.presentation.titleEn || profile.identity.titleEn,
    descAr: mode.presentation.descriptionAr || profile.identity.descriptionAr,
    descEn: mode.presentation.descriptionEn || profile.identity.descriptionEn,
    url: profile.identity.url,
    secondaryUrl: profile.identity.secondaryUrl,
    exactSymbols: mode.carrierSignature.exactSymbols,
    altExactSymbols: mode.carrierSignature.alternateExactSymbols,
    minCount: mode.carrierSignature.minCount,
    encodingTable: mode.presentation.encodingTable,
    ...mode.carrierSignature.legacyFlags,
    ...mode.presentation.legacyMetadata
  };
}
```

The implementation must preserve optional-field absence. Do not emit empty fields where the current entry omitted them if golden output depends on object shape.

`index.js` exports:

```js
{
  SignatureProfiles,
  SignatureRegistry,
  STEGO_SIGNATURES_REGISTRY,             // frozen flattened twelve-entry array
  matchSignaturesDetailed                // current call signature and behavior
}
```

It also sets the current browser globals:

```js
global.STEGO_SIGNATURES_REGISTRY
global.StegSignatures.STEGO_SIGNATURES_REGISTRY
global.StegSignatures.matchSignaturesDetailed
```

`legacy-matcher.js` is a mechanical extraction of the current function. Permitted changes are limited to receiving the flattened registry and resolving imports. Do not rewrite conditions, thresholds, positions, or reason codes.

## 9. Exact migration map

| Current registry ID | New profile file | Mode ID |
|---|---|---|
| `tool_stego_tools` | `profiles/tools/steganography-tools.js` | `default` |
| `technique_whitespace` | `profiles/techniques/whitespace.js` | `default` |
| `tool_doublespeak` | `profiles/tools/doublespeak.js` | `default` |
| `tool_stegzero_3bit` | `profiles/tools/stegzero.js` | `3bit` |
| `tool_stegzero_1bit` | `profiles/tools/stegzero.js` | `1bit` |
| `tool_stegoline_emoji` | `profiles/tools/stegoline.js` | `emoji` |
| `research_multilayer_huffman` | `profiles/research/multilayer-huffman.js` | `default` |
| `research_aitsteg` | `profiles/research/aitsteg.js` | `default` |
| `research_pos_fpe` | `profiles/research/pos-fpe.js` | `default` |
| `research_lisat_2015` | `profiles/research/lisat-2015.js` | `default` |
| `watermark_homoglyphs_sub` | `profiles/watermarks/homoglyph-substitution.js` | `default` |
| `watermark_social_media` | `profiles/watermarks/social-media.js` | `default` |

The adapter preserves this exact order.

Do not split the four whitespace candidate tools now; they are presentation candidates under a technique, not independently verified signatures.

## 10. Implementation phases

### Phase 0 — baseline lock

- serialize the current registry into a golden fixture;
- record the ordered twelve IDs;
- record representative matcher results for exact set, VS, whitespace, watermark, no-match, and ambiguous-match inputs;
- record current `analyzeText()` matched IDs, score, events, and actionable positions for those inputs.

### Phase 1 — contract and registry

- add contract, registry, and manifest;
- implement validation and finalization;
- test a synthetic two-mode profile;
- do not connect the new registry to production yet.

### Phase 2 — mechanical profile extraction

- move one current entry at a time into its destination profile/mode;
- combine StegZero's entries as two modes in one file;
- set every placement container to pending/empty;
- do not improve, correct, research, translate, or reorder existing data;
- compare every flattened entry with its golden entry.

### Phase 3 — adapter and matcher extraction

- implement the legacy adapter;
- move the current matcher mechanically into `legacy-matcher.js`;
- expose the old registry/matcher API from `index.js`;
- pass all golden matcher outputs before browser integration.

### Phase 4 — browser/CommonJS integration

- replace monolithic loading with core scripts, profile scripts, and `index.js`;
- turn old `detect/signatures.js` into the compatibility facade;
- keep engine and assessor behavior unchanged;
- verify both the direct new entrypoint and old facade.

Browser order:

1. `signatures/contract.js`
2. `signatures/registry.js`
3. profile scripts in manifest order
4. `signatures/legacy-adapter.js`
5. `signatures/legacy-matcher.js`
6. `signatures/index.js`
7. `detect/signatures.js` facade if still loaded
8. existing detectors, assessor, engine, UI, and controller

### Phase 5 — structural cleanup

- verify the facade contains no signature definitions;
- add contributor documentation for adding a producer or mode;
- retain the facade until separate cleanup is safe;
- do not begin placement research or matching.

## 11. Tests

Create:

```text
docs/development/tests/steg-signatures/
├── contract.test.js
├── registry.test.js
├── legacy-equivalence.test.js
├── loader-parity.test.js
└── fixtures/
    ├── legacy-registry.json
    └── legacy-matches.json
```

Contract tests:

- accept single-mode and multi-mode profiles;
- reject duplicate profile, mode, and legacy IDs;
- reject invalid carrier code points and matcher kinds;
- require placement containers on every mode and require pending definitions to be empty;
- confirm a second mode needs no generic matcher edit.

Registry/adapter tests:

- flattened registry has exactly twelve entries in current order;
- every flattened object equals its golden object, including optional fields and nested arrays;
- both StegZero modes resolve through one producer profile;
- every legacy ID resolves to its profile/mode;
- finalized data is deeply immutable.

Matcher equivalence tests compare old and extracted outputs for:

- matched IDs and order;
- positions and reason codes;
- SNOW, VS, watermark, ambiguous, and no-match cases.

Integration tests require `analyzeText()` to return identical score, verdict, events, actionable positions, and matched IDs before and after the split.

Loader parity tests require:

- Node and browser-style loading to produce identical flattened registries;
- manifest paths to exist and register once;
- HTML order to match the manifest;
- old and new CommonJS entrypoints to expose compatible APIs;
- no profile to be silently skipped.

Regression/build checks:

- existing steganalysis and extraction tests;
- `npm test` and `npm run build`;
- manual browser comparison for representative inputs.

## 12. Files expected to change

New:

- all files under `js/features/stego-analysis/detect/signatures/` listed in section 3;
- `docs/development/tests/steg-signatures/**`;
- `docs/development/adding-stego-signature-profile.md`.

Existing:

- `js/features/stego-analysis/detect/signatures.js` — facade only;
- `steganalysis.html` — deterministic new load order;
- `docs/development/tests/steganalysis-detection.test.js` — import adaptation only;
- `package.json` — focused structural test command included in `npm test`.

Change engine, assessor, dashboard, controller, localization, or CSS only when strictly required for imports. Behavioral/UI changes are out of scope.

## 13. Future placement workflow — not current implementation

When the user later supplies a placement signature:

1. edit only that producer mode;
2. change status from `pending` to `supplied`;
3. add one or more Region/Anchor/Scope/Distribution definitions;
4. add provenance and positive/negative fixtures;
5. validate the data contract;
6. implement placement matching only in a separately approved task.

If research is authorized instead, research one tool/mode at a time. Never infer a producer solely from a shared alphabet.

The current matcher ignores future placement definitions until the placement-engine task is implemented. Adding data alone must not change forensic verdicts.

## 14. Definition of done for the current task

Complete only when:

- the old monolith contains no signature definitions;
- every current producer/research/watermark/technique has its own profile file;
- StegZero 1-bit and 3-bit are independent modes in one tool file;
- all profiles, including single-mode profiles, use the modes contract;
- every mode owns its carrier signature and an empty pending placement container;
- all twelve legacy IDs, metadata, carrier arrays, ordering, and matcher outputs are preserved;
- risk, evidence, positions, dashboard results, and sanitization behavior are unchanged;
- browser and CommonJS registries are identical;
- adding a future mode requires only the producer file and its tests;
- no placement research or placement matcher was introduced;
- contract, equivalence, loader, regression, build, and manual checks pass.
