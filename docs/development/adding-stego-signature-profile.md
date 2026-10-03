# Guide: Adding a Stego Signature Profile or Mode

This guide explains how to add or update steganography detection signatures in the modular architecture under `js/features/stego-analysis/detect/signatures/`.

---

## 1. Architectural Overview

Signature profiles are organized into domain-specific categories under `profiles/`:

```text
js/features/stego-analysis/detect/signatures/
├── contract.js                # Schema v1 validator and constants
├── registry.js                # Central in-memory registry & immutability store
├── manifest.js                # Canonical ordered list of active profiles
├── legacy-adapter.js          # Flattens profiles into legacy 12-entry registry format
├── legacy-matcher.js          # Forensic matching logic
├── index.js                   # Unified CommonJS & browser facade
└── profiles/
    ├── tools/                 # Real-world stego tools & whitespace schemes (e.g. StegZero, Whitespace/SNOW)
    ├── techniques/            # Generic techniques
    ├── research/              # Academic papers and experimental algorithms
    └── watermarks/            # Text watermarking schemes (ACM papers, homoglyphs)
```

Every profile represents **one producer, research method, or technique** and contains an array of one or more **`modes`**.

---

## 2. Profile Contract (Schema Version 1)

Every profile must satisfy the Schema v1 contract:

```javascript
(function (global) {
  'use strict';

  const profile = {
    schemaVersion: 1,
    id: 'tool.my-tool',                  // Unique profile ID
    kind: 'tool',                        // 'tool' | 'technique' | 'research' | 'watermark'
    legacyIds: ['tool_my_tool_mode1'],   // List of legacy IDs implemented by this profile
    identity: {
      name: 'My Tool Name',
      titleAr: 'اسم الأداة بالعربية',
      titleEn: 'Tool Name in English',
      url: 'https://example.com/tool',   // Optional primary URL
      secondaryUrl: null,                // Optional secondary URL
      doi: null                          // Optional DOI (e.g. for academic papers)
    },
    modes: [
      {
        id: 'mode1',                     // Unique mode ID within this profile
        legacyId: 'tool_my_tool_mode1',  // Must match one entry in profile.legacyIds
        enabled: true,
        carrierSignature: {
          matcherKind: 'legacy-exact-set', // 'legacy-exact-set' | 'legacy-variation-selectors' | 'legacy-whitespace' | 'legacy-watermark-subset'
          exactSymbols: [0x200B, 0x200C],  // Unicode code points
          alternateExactSymbols: [],       // Alternate valid symbol sets (if any)
          minCount: 4,                     // Minimum occurrences to trigger detection
          legacyFlags: {}
        },
        placementSignatures: {
          status: 'pending',             // 'pending' | 'supplied' | 'researched'
          definitions: []                // Must be empty array when status is 'pending'
        },
        presentation: {
          name: 'My Tool (Mode 1)',
          titleAr: 'عنوان العرض بالوضع',
          titleEn: 'Mode 1 Presentation Title',
          descriptionAr: 'الوصف بالعربية',
          descriptionEn: 'Description in English',
          encodingTable: [
            {
              charName: 'Zero-Width Space',
              hex: 'U+200B',
              bits: '0',
              desc: 'Bit 0 carrier'
            }
          ]
        }
      }
    ]
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = profile;
  } else if (global.StegSignatures && global.StegSignatures.Registry) {
    global.StegSignatures.Registry.registerProfile(profile);
  }
})(typeof window !== 'undefined' ? window : globalThis);
```

---

## 3. Adding a New Profile (Step-by-Step)

### Step 1: Create Profile File
Create a new file under the appropriate subdirectory:
- `profiles/tools/<tool-name>.js`
- `profiles/techniques/<technique-name>.js`
- `profiles/research/<paper-name>.js`
- `profiles/watermarks/<watermark-name>.js`

Populate the profile object following the schema above.

### Step 2: Register in `manifest.js`
Open `manifest.js` and add an entry to the `PROFILE_MANIFEST` array:

```javascript
{
  id: 'tool.my-tool',
  path: 'profiles/tools/my-tool.js',
  legacyIds: ['tool_my_tool_mode1']
}
```

### Step 3: Add Script Tag in `steganalysis.html`
Add the `<script>` tag in `steganalysis.html` in the exact manifest position before `legacy-adapter.js`:

```html
<script src="js/features/stego-analysis/detect/signatures/profiles/tools/my-tool.js"></script>
```

### Step 4: Run Tests & Verify Parity
Run the automated test suite:

```bash
npm test
```

The test runner will verify:
- Contract validity (no schema violations, valid code points, empty pending placement container)
- Immutability and registry uniqueness
- Parity between Node.js and browser loading
- Deterministic alignment between `manifest.js` and `steganalysis.html`

---

## 4. Adding a Mode to an Existing Profile

To add a new operational mode to an existing tool (e.g. adding a 2-bit mode to StegZero):

1. Open the profile file (e.g. `profiles/tools/stegzero.js`).
2. Add the mode's legacy ID to `profile.legacyIds`.
3. Append a new mode object to `profile.modes`:
   - Set a distinct `id` (e.g. `'2bit'`).
   - Define its carrier alphabet in `carrierSignature.exactSymbols`.
   - Maintain `placementSignatures: { status: 'pending', definitions: [] }`.
4. Update `manifest.js` if the profile's `legacyIds` list changed.
5. Re-run `npm test`.

---

## 5. Placement Signatures Policy

Every mode **must** contain:

```javascript
placementSignatures: {
  status: 'pending',
  definitions: []
}
```

- When status is `'pending'`, `definitions` **must be empty**.
- Do not invent or assume placement positions (Region, Anchor, Scope, Distribution) without verified user-supplied forensic specifications or authorized research.
- The carrier matcher operates independently of placement definitions until the dedicated placement engine is implemented in a future phase.
