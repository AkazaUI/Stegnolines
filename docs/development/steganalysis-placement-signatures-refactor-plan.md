# Placement Signatures refactor — future design reference

> **Deferred — do not implement in the current task.** The user has explicitly deferred researching, defining, and matching placement signatures.
> The authoritative current-scope plan is `docs/development/steganalysis-signatures-file-split-plan.md`.
> Use this document only later, after the user supplies placement facts or explicitly authorizes per-tool research.

## Ownership and objective

- Codex owns architecture, migration rules, and acceptance criteria.
- Antigravity owns this future implementation and research only after the user explicitly authorizes that later phase.
- The objective is to replace the monolithic `js/features/stego-analysis/detect/signatures.js` with a dedicated signatures subsystem where every tool, research method, watermark method, or generic technique has its own profile file.
- A signature must describe both its carrier symbols and **where/how those symbols are placed**. Sharing the same Unicode alphabet is not sufficient for attribution.
- This document is the implementation contract. Do not infer undocumented placement rules merely to complete a profile.

## 1. Verified current state

The current implementation combines three responsibilities in one file:

1. Twelve tool/research/technique/watermark definitions and their presentation metadata.
2. Carrier matching for exact sets, SNOW, variation selectors, and watermarks.
3. Browser globals and CommonJS exports.

Current coupling:

- `detect-engine.js` reads `STEGO_SIGNATURES_REGISTRY` from `StegSignatures` or a global.
- `evidence-assessor.js` calls `matchSignaturesDetailed(candidateObservations, text, snowData)` and converts every returned match into a weight-70 `SIGNATURE_MATCH`/`SNOW_PATTERN` event.
- `threat-dashboard.js` receives only the signature definition, then always renders an “exact” badge.
- `docs/development/tests/steganalysis-detection.test.js` imports the monolithic file directly.
- `steganalysis.html` loads one `detect/signatures.js` classic script before the detectors and assessor.

The current matcher mostly compares Unicode sets and counts. It does not model region, anchor, scope, or distribution.

### Confirmed collision and placement cases

- `tool_stego_tools` and `research_aitsteg` currently use the identical set `[U+200C, U+202C, U+200E, U+202D]`. Symbol equality cannot identify which producer was used.
- The two watermark profiles share most homoglyph symbols. With the current `minCount` rule, the same text can match both.
- StegZero 1-bit uses an alphabet that is a subset of the 3-bit alphabet; incomplete or damaged payloads need explicit ambiguity handling.
- The current whitespace entry represents a technique and lists four candidate tools. It is not evidence for one specific implementation.
- StegoLines itself has at least two placement variants in this repository:
  - `js/core/stego/vs-codec.js::buildStegoObject()` writes a contiguous VS prefix before the cover text.
  - `js/core/stego/multi-message-protocol.js::insertVSAtMidpoint()` writes a contiguous VS block inside the cover, preferably after a space/punctuation boundary near the midpoint.

Therefore one file per producer may export multiple version/mode variants. A single global placement rule per tool is insufficient.

## 2. Target directory structure

Create the following structure:

```text
js/features/stego-analysis/detect/signatures/
├── contract.js
├── registry.js
├── placement-context.js
├── placement-matcher.js
├── matcher.js
├── manifest.js
├── index.js
└── profiles/
    ├── tools/
    │   ├── steganography-tools.js
    │   ├── doublespeak.js
    │   ├── stegzero.js
    │   ├── stegoline-emoji.js
    │   ├── snow.js                 # create only after tool-specific research
    │   ├── snow2.js                # create only after tool-specific research
    │   ├── stegotoolkit-whitespace.js
    │   └── stegsnow.js
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

- `contract.js`: schema constants, enum sets, and profile validation. It contains no profiles.
- `registry.js`: registration, uniqueness checks, immutable lookup, and collision index.
- `placement-context.js`: builds reusable code-point, token, word, line, and insertion-slot facts once per analyzed text.
- `placement-matcher.js`: evaluates the four placement dimensions and returns metrics/reasons.
- `matcher.js`: carrier filtering, variant evaluation, confidence/status, ranking, and ambiguity grouping.
- `manifest.js`: the only ordered list of profile IDs and browser script paths. It contains no signature data.
- `index.js`: public browser/CommonJS facade.
- `profiles/**`: declarative data only. A profile must not inspect the DOM, mutate observations, calculate global risk, or implement its own generic matcher.

Keep the old `detect/signatures.js` temporarily as a compatibility facade. In CommonJS it re-exports `./signatures/index.js`; in the browser it aliases the already-loaded new facade. Delete it only after every importer and test uses the new path.

## 3. Canonical profile contract

Each file exports one producer profile. A profile may contain several variants when the same producer has different modes or versions.

```js
{
  schemaVersion: 1,
  id: 'tool.stegoline.emoji',              // stable producer ID
  kind: 'tool',                             // tool | research | watermark | technique
  lifecycle: {
    status: 'verified',                     // unresearched | provisional | verified | disabled
    versionScope: 'current-repository',
    verifiedAt: 'YYYY-MM-DD',
    notes: ''
  },
  identity: {
    name: 'StegoLines Emoji Encoder',
    titleAr: '...',
    titleEn: '...',
    descriptionAr: '...',
    descriptionEn: '...',
    urls: [{ type: 'source', url: '...' }]
  },
  evidence: {
    sources: [
      {
        type: 'source-code',                // source-code | paper | documentation | generated-sample
        url: '...',
        version: 'commit/tag/version',
        locator: 'file:function or paper section',
        supports: ['carrier', 'placement']
      }
    ]
  },
  presentation: {
    encodingTable: []
  },
  variants: [
    {
      id: 'prefix-vs-v1',                   // unique inside the producer profile
      enabled: true,
      carrier: { /* section 4 */ },
      placement: { /* section 5 */ },
      thresholds: {
        minCarrierCount: 2,
        minPlacementScore: 1,
        minConfidence: 0.85
      },
      fixtures: {
        basePath: 'docs/development/tests/steg-signatures/fixtures/tool.stegoline.emoji/prefix-vs',
        positive: ['positive.json'],
        negative: [
          'negative-region.json',
          'negative-anchor.json',
          'negative-scope.json',
          'negative-distribution.json'
        ],
        collisions: ['collisions.json']
      }
    }
  ]
}
```

### Lifecycle rules

- `unresearched`: structurally migrated but placement has not been established. It may appear in developer diagnostics only and cannot create a `SIGNATURE_MATCH` event.
- `provisional`: evidence exists but is incomplete. It may produce a visible “candidate producer” result, never an exact/confirmed attribution.
- `verified`: carrier and placement are backed by primary evidence and positive/negative fixtures. Only verified variants can become confirmed matches.
- `disabled`: retained for history but excluded from matching.

Do not mark a profile verified merely because its Unicode symbols are known.

## 4. Carrier signature contract

Carrier matching remains separate from placement matching:

```js
carrier: {
  kind: 'code-point-set',
  codePoints: [0x200B, 0x200C],
  alternateSets: [],
  ranges: [],
  setPolicy: 'all',                         // all | any | subset | exact-observed-set
  orderPolicy: 'any',                       // any | declared | repeating-cycle
  sequence: null,
  minUnique: 2,
  maxForeignCarrierRatio: 0,
  encoding: {
    bitsPerSymbol: 1,
    map: [{ codePoint: 0x200B, bits: '0' }]
  }
}
```

Allowed `kind` values:

- `code-point-set`: explicit Unicode alphabet.
- `code-point-range`: variation selectors or other bounded ranges.
- `ordered-sequence`: a magic/header/order is part of the signature.
- `whitespace-tokens`: SNOW-like tab/space tokens at line boundaries.
- `homoglyph-map`: visible original/substitute pairs rather than only a set of substitutes.

Rules:

- Profiles must store integer code points, not mixed `U+XXXX` strings.
- Presentation strings belong in `presentation.encodingTable`, not in matcher logic.
- Duplicate carrier alphabets across profiles are valid and must be indexed as collisions, not rejected.
- The matcher receives all raw observations, not only non-benign observations. A verified carrier+placement structure may make otherwise legitimate-looking characters actionable.
- Symbol matching returns `candidatePositions`, `foreignCarrierPositions`, `symbolScore`, and reason codes; it does not mutate the observations.

## 5. Placement Signature contract

Placement is represented by exactly four top-level properties. Each property has modifiers required to make its semantics deterministic.

```js
placement: {
  region: {
    value: 'start',                         // start | end | interior | whole
    reference: 'text',                      // text | line
    maxVisibleOffset: 0,
    minCoverage: null
  },
  anchor: {
    value: 'before',                        // between-characters | between-words | before | after
    target: { kind: 'visible-content' },    // required for before/after
    tolerance: 0
  },
  scope: {
    value: 'whole-text',                    // single-word | multiple-words | whole-text
    minWords: null,
    maxWords: null
  },
  distribution: {
    value: 'contiguous',                    // contiguous | regular | scattered | random
    expectedGap: null,
    gapTolerance: 0,
    minClusters: 1,
    maxClusters: 1
  }
}
```

### 5.1 Region semantics

Region describes the geometric portion of the selected reference unit:

- `start`: all candidate runs occur before the first visible content, or within `maxVisibleOffset` visible units from it.
- `end`: all candidate runs occur after the last visible content, or within the configured offset from it.
- `interior`: candidate runs have visible content on both sides and do not satisfy start/end.
- `whole`: candidate positions span the cover. `minCoverage` is required and equals `(lastCarrierVisibleRank - firstCarrierVisibleRank) / max(1, visibleLength - 1)`.
- `reference: text` evaluates once over the entire text.
- `reference: line` evaluates independently for affected lines, then aggregates. This is required for line-ending whitespace tools.

### 5.2 Anchor semantics

Anchor identifies the insertion slot:

- `between-characters`: previous and next visible grapheme-like units belong to the same token. Do not treat a position between a base character and its combining mark as a valid slot.
- `between-words`: previous and next visible units belong to different word tokens and the collapsed visible text has a word boundary at the slot.
- `before`: the run immediately precedes the declared target within `tolerance` visible units.
- `after`: the run immediately follows the declared target within `tolerance` visible units.

Allowed target kinds are declarative: `visible-content`, `literal-character`, `literal-word`, `unicode-class`, `break-character`, `line-break`, and `line-end`. Profile files must not contain executable callbacks or arbitrary regular expressions.

### 5.3 Scope semantics

Scope answers how much of the cover participates, independently of geometric region:

- `single-word`: all anchored carriers affect one token ID.
- `multiple-words`: at least `minWords` distinct token IDs participate; enforce `maxWords` when present.
- `whole-text`: placement is not confined to a bounded word selection. Prefix/suffix payload blocks normally use this scope even if their region is small.

### 5.4 Distribution semantics

- `contiguous`: candidate code-point positions form one run, or one run per reference line when `reference: line`.
- `regular`: gaps between ordered carrier slots follow `expectedGap` within `gapTolerance`; if `expectedGap` is omitted, infer the median gap and require every gap to remain within tolerance.
- `scattered`: at least `minClusters` separated clusters occur and their visible span satisfies the configured minimum coverage; no equal-gap claim is made.
- `random`: no stable gap pattern is expected. This is a weak placement feature and cannot confirm a tool unless carrier order/header and source evidence provide sufficient specificity.

### 5.5 Placement result

Every evaluated variant returns all four dimensions, even on failure:

```js
{
  passed: true,
  score: 1,                                  // 0..1
  dimensions: {
    region:       { passed: true, score: 1, observed: 'start', reasons: [] },
    anchor:       { passed: true, score: 1, observed: 'before:visible-content', reasons: [] },
    scope:        { passed: true, score: 1, observed: 'whole-text', reasons: [] },
    distribution: { passed: true, score: 1, observed: 'contiguous', reasons: [] }
  },
  matchedPositions: [],
  rejectedPositions: [],
  metrics: {
    runCount: 1,
    affectedWordCount: 0,
    affectedLineCount: 1,
    coverage: 0,
    gaps: []
  }
}
```

Reason codes must be stable identifiers such as `REGION_EXPECTED_START`, `ANCHOR_NOT_BETWEEN_WORDS`, `SCOPE_TOO_MANY_WORDS`, and `DISTRIBUTION_NOT_CONTIGUOUS`.

## 6. Placement context and positions

`placement-context.js` builds a deterministic index once per input:

- `chars = Array.from(text)` and all public positions remain Unicode code-point indices.
- Reuse `UnicodeContext` token IDs, scripts, and combining-mark predicates.
- Record line IDs and line start/end positions.
- Record previous/next visible units while treating invisible carrier observations as removable for slot analysis.
- Homoglyph observations remain visible characters; they are evaluated as substitutions inside tokens.
- Group consecutive candidate positions into runs.
- Produce insertion-slot facts: prefix, suffix, interior, same-token character boundary, cross-token word boundary, before/after break character, and line end.

Do not use UTF-16 `String.length` offsets in profile matching. When inspecting a producer implementation that uses UTF-16 indices, convert its observed output to code-point positions before comparing fixtures.

Complexity target: context construction `O(n + m)` and all profile evaluation `O(P × m)`, where `P` is enabled variants and `m` is observations. No profile may rescan the full text once per observation.

## 7. Registry and manifest behavior

`registry.js` exposes:

```js
registerProfile(profile)
finalizeRegistry()
getProfile(id)
getProfiles({ kind, status })
getVariant(profileId, variantId)
getCarrierCollisions()
```

Validation at registration/finalization must reject:

- duplicate profile IDs or duplicate variant IDs;
- unknown enum values;
- invalid Unicode code points/ranges;
- empty verified carrier definitions;
- `before`/`after` without a target;
- `whole` region without `minCoverage`;
- `regular` distribution with contradictory gap constraints;
- verified variants without a primary source and positive/negative fixture references;
- functions, DOM nodes, `RegExp` objects, or mutable collections inside profiles.

`finalizeRegistry()` deep-freezes profiles and returns a stable order from `manifest.js`. The manifest must contain each registered profile exactly once. A test must parse `steganalysis.html` and ensure every browser profile script in the manifest is loaded once and after `registry.js`.

Use one registration convention for every profile:

- In a browser classic script, the profile calls `global.StegSignatureRegistry.registerProfile(profile)` after validating that the registry exists.
- In CommonJS, the profile exports the plain object without global side effects. `signatures/index.js` requires each path from the manifest and registers the returned object.
- Loading a browser profile before `registry.js` is a hard startup error; silently dropping a profile is forbidden.
- `index.js` finalizes the registry only after every manifest entry has been registered.

Carrier collisions produce a report keyed by normalized alphabet/range fingerprint. They are expected data used by collision tests; they are not startup errors.

## 8. Matcher and attribution pipeline

Public API:

```js
matchAllSignatures({
  text,
  context,
  observations,
  snowData,
  includeRejected: false
})
```

Pipeline for every enabled variant:

1. Filter all raw observations with the variant's carrier definition.
2. Apply carrier count, unique-symbol, set, sequence, and foreign-carrier constraints.
3. Build run/slot facts from the shared placement context.
4. Evaluate Region, Anchor, Scope, and Distribution independently.
5. Calculate deterministic confidence.
6. Assign status and retain the complete explanation.

Match result:

```js
{
  profileId,
  variantId,
  profile,                                  // immutable normalized profile
  status: 'confirmed',                      // confirmed | probable | candidate | rejected
  confidence: 0.94,
  specificity: 0.88,
  positions: [],
  carrierResult: {},
  placementResult: {},
  reasonCodes: [],
  ambiguityGroup: null
}
```

Status rules:

- `confirmed`: profile is verified, all required carrier and placement constraints pass, and confidence meets `minConfidence`.
- `probable`: verified profile passes carrier rules but one declared soft placement constraint misses, or confidence is below the confirmation threshold. It is informational and non-actionable.
- `candidate`: carrier family matches an unresearched/provisional profile, or placement evidence is insufficient. It is informational and non-actionable.
- `rejected`: include only in tests/developer diagnostics.

Only `confirmed` results create a weight-70 `SIGNATURE_MATCH` or `SNOW_PATTERN` event and promote positions. Probable/candidate matches must never silently become suspicious findings.

### Confidence and specificity

Use explicit weighted components stored in the result:

```text
confidence = 0.40 × carrierScore
           + 0.45 × placementScore
           + 0.15 × source/variant integrity score
```

- `source/variant integrity` is 1 for verified, at most 0.5 for provisional, and 0 for unresearched.
- An exact ordered header is more specific than an unordered alphabet.
- Literal before/after anchors are more specific than unrestricted random distribution.
- A random-distribution variant cannot be confirmed from a broad two-symbol alphabet alone.

Keep the exact weights in one constants object in `matcher.js`, not in individual profile files.

### Ambiguity and overlapping alphabets

- Evaluate every profile independently; never stop at the first match.
- Do not suppress a match because another profile shares symbols.
- Group confirmed/probable results whose positions overlap by at least 80% and whose carrier fingerprints collide.
- Rank within a group by status, confidence, specificity, then stable manifest order.
- If the top two confirmed results differ by less than 0.05 confidence, preserve both and mark the group ambiguous. The UI must say attribution is unresolved.
- If placement differentiates them, keep the losing profile as rejected/probable diagnostics, not as an exact match.

## 9. Required producer-profile behavior

### StegoLines example with variants

`profiles/tools/stegoline-emoji.js` must contain at least two separately sourced variants after verification:

1. `prefix-vs`: Region=start/text; Anchor=before visible content; Scope=whole text; Distribution=contiguous.
2. `midpoint-vs`: Region=interior/text; Anchor=after a configured break character or between words; Scope=whole text; Distribution=contiguous. Its region tolerance must reflect the actual midpoint search behavior rather than assuming the exact mathematical midpoint.

Both share VS carrier ranges but remain separate variants with different fixture sets and source locators.

### Whitespace family

`profiles/techniques/whitespace.js` identifies a validated whitespace-steganography family pattern only. It may list related producers for presentation, but it must not confirm SNOW, snow2, StegoToolkit, or stegsnow as the exact producer.

Create one tool file for each candidate only after its implementation/version has been researched. If two implementations are indistinguishable from output alone, keep them in one ambiguity group and explicitly state that attribution cannot be resolved.

### Research papers

Each paper profile represents the algorithm described by a specific paper/version, not every later implementation inspired by it. Store DOI/URL and section/table/page locator supporting both carrier and placement claims.

### Watermarks

Store original/substitute pairs in `homoglyph-map`. Placement must describe which eligible letters are substituted and how substitutions are distributed. A minimum count of any three common homoglyphs is not sufficient for paper-level attribution.

## 10. Integration changes

### `evidence-assessor.js`

- Replace the positional legacy call with `matchAllSignatures({ text, context, observations, snowData })`.
- Pass all observations, not `candidateObservations` only.
- Add `SIGNATURE_MATCH` events only for `status === 'confirmed'`.
- Event details include `profileId`, `variantId`, `confidence`, `placement summary`, and ambiguity group.
- Return full `signatureMatches`; retain `matchedSignatures` as a temporary array of confirmed profile definitions for compatibility.

### `detect-engine.js`

- Resolve the new `signatures/index.js` facade.
- Return `signatureMatches` in both empty and populated analysis results.
- Preserve `matchedSignatures` until consumers migrate.

### `threat-dashboard.js`

- Render confirmed, probable, and candidate results separately.
- Replace the unconditional “exact” badge with status-specific labels.
- Show the matched placement variant and four dimensions in an expandable forensic explanation.
- Show an ambiguity notice only for an actual `ambiguityGroup`, not merely because the result count exceeds one.
- A technique-family result must not be presented as a specific tool.

### `steganalysis-controller.js`

- Persist a bounded signature-match summary: IDs, status, confidence, positions, four dimension outcomes, and reasons.
- Do not persist whole profile objects repeatedly.

### Browser and CommonJS loading

Browser order must be:

1. `contract.js`
2. `registry.js`
3. `placement-context.js`
4. `placement-matcher.js`
5. profile files in manifest order
6. `matcher.js`
7. `index.js`
8. temporary compatibility `signatures.js` if still required
9. detectors, `evidence-assessor.js`, and `detect-engine.js`

Node tests import only `signatures/index.js`; that entrypoint requires core modules and every manifest profile itself.

## 11. Exact migration map

| Current ID | Destination | Migration note |
|---|---|---|
| `tool_stego_tools` | `profiles/tools/steganography-tools.js` | Collides with AITSteg; no exact attribution until placement is researched. |
| `technique_whitespace` | `profiles/techniques/whitespace.js` | Remains a family signature; candidate tools split later. |
| `tool_doublespeak` | `profiles/tools/doublespeak.js` | Preserve encoding table; research placement/order. |
| `tool_stegzero_3bit` | `profiles/tools/stegzero.js` | Variant `3bit`. |
| `tool_stegzero_1bit` | `profiles/tools/stegzero.js` | Variant `1bit`. |
| `tool_stegoline_emoji` | `profiles/tools/stegoline-emoji.js` | Split into prefix and midpoint variants. |
| `research_multilayer_huffman` | `profiles/research/multilayer-huffman.js` | Preserve primary and alternate alphabets; verify placement from paper. |
| `research_aitsteg` | `profiles/research/aitsteg.js` | Same current alphabet as steganography-tools; placement/coding order must differentiate or remain ambiguous. |
| `research_pos_fpe` | `profiles/research/pos-fpe.js` | Placement is central to the method; paper evidence required. |
| `research_lisat_2015` | `profiles/research/lisat-2015.js` | Verify whether order/position, not just four symbols, is the actual signature. |
| `watermark_homoglyphs_sub` | `profiles/watermarks/homoglyph-substitution.js` | Convert to original/substitute pairs and distribution rules. |
| `watermark_social_media` | `profiles/watermarks/social-media.js` | Collision test against the other watermark is mandatory. |

Preserve existing public IDs as `legacyIds` for saved analyses and UI links. New IDs are stable dotted IDs; never use display names as keys.

## 12. Phased implementation

### Phase 0 — lock current behavior

- Snapshot the current registry IDs and metadata.
- Add golden tests for current confirmed results, including known ambiguous matches.
- Add a test proving current StegoLines prefix and midpoint outputs, using the repository encoders rather than handcrafted assumptions.

### Phase 1 — infrastructure without behavior change

- Add the folder, schema, registry, manifest, facade, and compatibility adapter.
- Mechanically move definitions into profile files with `lifecycle.status = 'unresearched'` unless primary evidence already exists.
- Run legacy matching through the adapter so existing integration tests remain green during structural review.
- Verify registry/profile output is metadata-equivalent to the old monolith.

### Phase 2 — placement engine in shadow mode

- Implement placement context/matcher and full diagnostic results.
- For each legacy match, run placement matching without changing risk.
- Store differences only in test/debug output: legacy-only, placement-only, confirmed, and ambiguous.
- Build the carrier-collision matrix.

### Phase 3 — profile research and activation

- Research and verify one producer/variant at a time using section 13.
- Add fixtures before changing status to `verified`.
- Switch that variant from legacy matching to placement matching.
- Unresearched profiles remain candidates; they must not retain an “exact” UI badge.

Recommended order:

1. StegoLines variants, because their source is local and behavior is directly reproducible.
2. steganography-tools vs AITSteg collision.
3. StegZero modes and Doublespeak.
4. SNOW-family tools.
5. research algorithms.
6. watermark papers.

### Phase 4 — consumer migration

- Update assessor, engine, dashboard, saved-result contract, localization, and tests to consume `signatureMatches`.
- Enable confirmed placement matches as evidence.
- Keep compatibility fields for one release/test cycle.

### Phase 5 — cleanup

- Remove legacy matcher branches and the old registry array.
- Remove the compatibility facade after project-wide reference search returns zero old imports/globals.
- Update developer documentation for adding a signature profile.

Do not combine Phase 1 and Phase 5 in one change; the compatibility interval makes regressions attributable and reversible.

## 13. Research protocol for each tool or paper

For every producer profile, Antigravity must create a small research record before verification:

1. Identify the exact project/paper and version, commit, release, or publication section.
2. Prefer encoder source code over README descriptions; prefer the primary paper over secondary articles.
3. Locate carrier alphabet, mapping/order, minimum viable payload, framing/header/checksum, and placement function.
4. Generate at least three outputs from different cover lengths and payloads. Do not derive placement from one sample.
5. Record Region, Anchor, Scope, and Distribution separately for every mode/version.
6. Determine whether the placement is mandatory, preferred with tolerance, or random.
7. Create positive fixtures directly from the encoder when runnable. Record generator version and options.
8. Create negative fixtures by moving the same carrier sequence to the wrong region/anchor/scope/distribution.
9. Test against every profile with a colliding carrier fingerprint.
10. Document what cannot be distinguished. Do not manufacture a differentiator when two producers have identical observable output.
11. Mark the profile verified only when both carrier and placement claims have primary evidence and passing fixtures.

Research record location:

```text
docs/development/research/steg-signatures/<profile-id>.md
```

Each record contains source links, version/commit, exact locators, observations, unresolved questions, fixture provenance, and the final four-property placement table.

## 14. Tests

Create:

```text
docs/development/tests/steg-signatures/
├── registry.test.js
├── placement-matcher.test.js
├── profile-contract.test.js
├── collision-matrix.test.js
├── integration.test.js
└── fixtures/
    └── <profile-id>/
        ├── positive.json
        ├── negative-region.json
        ├── negative-anchor.json
        ├── negative-scope.json
        ├── negative-distribution.json
        └── collisions.json
```

Use escaped Unicode in JSON so invisible contents are reviewable. Each fixture includes `text`, expected code-point positions, expected profile/variant, expected status, and expected dimension outcomes.

### Contract and loader tests

- Reject duplicate IDs/variants and invalid enums/code points.
- Reject verified profiles without sources and fixtures.
- Deep-freeze finalized profiles.
- Ensure the manifest, registry, HTML script tags, and Node entrypoint contain the same profiles exactly once.
- Ensure every legacy ID resolves to its new profile.

### Placement unit matrix

For the same carrier alphabet, test:

- prefix passes start and fails end/interior;
- suffix passes end and fails start;
- midpoint block passes interior;
- carrier between two letters of one token passes between-characters;
- carrier between tokens passes between-words;
- before/after literal and break-character targets respect tolerance;
- one affected word versus multiple words versus whole-text scope;
- contiguous, fixed-gap regular, scattered clusters, and random distributions;
- line-relative end placement across multiple lines;
- combining marks and supplementary-plane characters preserve code-point positions.

### Collision tests

- The shared `tool_stego_tools`/AITSteg alphabet cannot yield two confirmed attributions unless each placement independently passes.
- The two watermark profiles remain ambiguous when observable evidence is indistinguishable.
- Moving a valid sequence from one tool's start placement to another tool's end placement changes the winner without changing symbols.
- StegZero 1-bit samples do not become 3-bit confirmed matches.
- Family whitespace matches do not claim a specific SNOW implementation without its verified profile.

### StegoLines regression tests

- A payload from `buildStegoObject()` matches `prefix-vs`.
- A payload from `insertVSAtMidpoint()` matches `midpoint-vs`.
- The same VS block at the wrong placement is candidate/rejected, not confirmed.
- Ordinary emoji `FE0F` selectors match neither variant.

### Integration tests

- Only confirmed matches create evidence events/actionable positions.
- Candidate/probable matches remain visible but do not increase forensic risk.
- Event positions equal the confirmed match's contributing positions.
- `signatureMatches` survives controller serialization without whole-profile duplication.
- Dashboard labels and ambiguity notices follow status/group data.
- Existing false-positive, extraction, sanitization, and build tests remain green.

### Performance

- Analyze a 200 KB fixture with the full registry in at most the existing detection-suite budget.
- Log context-build time and aggregate profile-match time separately.
- Add a guard proving profiles do not rescan the full text once per observation.

## 15. Files expected to change

New subsystem and profile files:

- everything under `js/features/stego-analysis/detect/signatures/` listed in section 2.

Existing integration files:

- `js/features/stego-analysis/detect/signatures.js` — temporary facade, later removal.
- `js/features/stego-analysis/detect/evidence-assessor.js`
- `js/features/stego-analysis/detect/detect-engine.js`
- `js/features/stego-analysis/detect/ui/threat-dashboard.js`
- `js/features/stego-analysis/detect/steganalysis-controller.js`
- `steganalysis.html`
- `i18n/dictionaries/steganalysis.js`
- `docs/development/tests/steganalysis-detection.test.js`
- `package.json`

New research/tests:

- `docs/development/research/steg-signatures/*.md`
- `docs/development/tests/steg-signatures/**`

Check build tooling for any explicit JavaScript allow-list after adding the files. Do not change unrelated extraction decoders; they may consume confirmed profile metadata later through a separate integration task.

## 16. Verification sequence

For each phase, report:

1. Serena diagnostics for every changed JavaScript file.
2. Registry/contract tests.
3. Placement matcher tests.
4. Collision matrix tests.
5. Existing `npm run test:steganalysis`.
6. Existing extraction regression suite.
7. `npm test` and `npm run build`.
8. Manual browser verification of a prefix VS sample, midpoint VS sample, wrong-placement sample, normal emoji, exact-symbol ambiguity, and a line-ending whitespace sample.
9. A project-wide reference search proving no unintended dependency remains on removed globals or the old monolithic data.

## 17. Definition of done

The refactor is complete only when:

- every active producer/research/watermark definition lives in its own profile file;
- multi-mode producers use explicit variants in that producer's file;
- the four placement properties have deterministic, tested semantics;
- profiles with identical symbols are evaluated independently by placement;
- only verified carrier+placement matches are confirmed/actionable;
- unresolved or indistinguishable producers are honestly reported as candidates/ambiguous;
- the dashboard no longer labels every registry hit as exact;
- adding a new producer requires only a profile, research record, fixtures, and manifest entry—not editing generic matcher branches;
- browser and Node registries are identical;
- all contract, collision, integration, regression, performance, and build checks pass;
- the compatibility facade and legacy matcher are removed only after zero remaining references are verified.
