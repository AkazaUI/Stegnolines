// ══════════════════════════════════════════════════════════════
// STEGNOLINES — Text Steganalysis Detection Engine & Forensic Controller
// ══════════════════════════════════════════════════════════════
//
// Scans input text for hidden Unicode characters (zero-width,
// directional overrides, variation selectors, special spaces)
// and Homograph (Homoglyph) / Fullwidth letter and digit substitutions.
//
// Features:
//   - Multi-Technique Taxonomy Classification (ZWC, VS, HOMOGRAPH, SPACE, BIDI)
//   - Universal Zero-Key Forensic Message Extractor (Restored Text, Evasive Character Sequence, Bit Matrix Payload)
//   - Visual Forensic Diff Mapping & Risk Assessment
//
// ══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── PAGINATION CONFIGURATION & STATE ────────────────────────
  const PAGE_SIZE = 50;
  let currentAnalysis = null;
  let currentPage = 1;

  // ── CHARACTER LOOKUP MAP ────────────────────────────────────
  const CHAR_MAP = {
    // ── Zero-Width Characters ──
    0x200B: { name: 'Zero-Width Space',          category: 'zeroWidth' },
    0x200C: { name: 'Zero-Width Non-Joiner',     category: 'zeroWidth' },
    0x200D: { name: 'Zero-Width Joiner',         category: 'zeroWidth' },
    0xFEFF: { name: 'Zero-Width No-Break Space', category: 'bom' },

    // ── Directional Override Characters ──
    0x200E: { name: 'Left-To-Right Mark',        category: 'directional' },
    0x200F: { name: 'Right-To-Left Mark',        category: 'directional' },
    0x202A: { name: 'Left-to-Right Embedding',   category: 'directional' },
    0x202B: { name: 'Right-to-Left Embedding',   category: 'directional' },
    0x202C: { name: 'POP Directional Formatting', category: 'directional' },
    0x202D: { name: 'Left-To-Right Override',    category: 'directional' },
    0x202E: { name: 'Right-To-Left Override',    category: 'directional' },

    // ── Special Space Characters ──
    0x2000: { name: 'En Quad Space',             category: 'space' },
    0x2001: { name: 'Em Quad Space',             category: 'space' },
    0x2002: { name: 'En Space',                  category: 'space' },
    0x2003: { name: 'Em Space',                  category: 'space' },
    0x2004: { name: 'Three-Per-Em Space',        category: 'space' },
    0x2005: { name: 'Four-Per-Em Space',         category: 'space' },
    0x2006: { name: 'Six-Per-Em Space',          category: 'space' },
    0x2007: { name: 'Figure Space',              category: 'space' },
    0x2008: { name: 'Punctuation Space',         category: 'space' },
    0x2009: { name: 'Thin Space',                category: 'space' },
    0x200A: { name: 'Hair Space',                category: 'space' },
    0x202F: { name: 'Narrow No-Break Space',     category: 'space' },

    // ── Mongolian Vowel Separator ──
    0x180E: { name: 'Mongolian Vowel Separator', category: 'zeroWidth' },

    // ── Invisible Mathematical Operators (U+2060 - U+2064) ──
    0x2060: { name: 'Word Joiner',               category: 'zeroWidth' },
    0x2061: { name: 'Function Application',      category: 'zeroWidth' },
    0x2062: { name: 'Invisible Times',           category: 'zeroWidth' },
    0x2063: { name: 'Invisible Separator',       category: 'zeroWidth' },
    0x2064: { name: 'Invisible Plus',            category: 'zeroWidth' },

    // ── Deprecated Formatting Controls (U+206A - U+206F) ──
    0x206A: { name: 'Inhibit Symmetric Swapping', category: 'directional' },
    0x206B: { name: 'Activate Symmetric Swapping', category: 'directional' },
    0x206C: { name: 'Inhibit Arabic Form Shaping', category: 'directional' },
    0x206D: { name: 'Activate Arabic Form Shaping', category: 'directional' },
    0x206E: { name: 'National Digit Shapes',     category: 'directional' },
    0x206F: { name: 'Nominal Digit Shapes',      category: 'directional' },

    // ── Directional Isolates (U+2066 - U+2069) ──
    0x2066: { name: 'Left-To-Right Isolate',     category: 'directional' },
    0x2067: { name: 'Right-To-Left Isolate',     category: 'directional' },
    0x2068: { name: 'First Strong Isolate',      category: 'directional' },
    0x2069: { name: 'Pop Directional Isolate',   category: 'directional' },

    // ── Special Symbols Used in Steganography Research ──
    0x2205: { name: 'Empty Set Symbol',          category: 'zeroWidth' },
    0x00AD: { name: 'Soft Hyphen',               category: 'zeroWidth' },
  };

  // ── HOMOGRAPH (HOMOGLYPH) LOOKUP DICTIONARY ─────────────────
  const HOMOGRAPH_MAP = {
    // Cyrillic Lowercase Lookalikes
    0x0430: { name: "Cyrillic Small Letter А (Homograph of 'a')", canonical: 'a', category: 'homograph' },
    0x0435: { name: "Cyrillic Small Letter Е (Homograph of 'e')", canonical: 'e', category: 'homograph' },
    0x043E: { name: "Cyrillic Small Letter О (Homograph of 'o')", canonical: 'o', category: 'homograph' },
    0x0440: { name: "Cyrillic Small Letter Р (Homograph of 'p')", canonical: 'p', category: 'homograph' },
    0x0441: { name: "Cyrillic Small Letter С (Homograph of 'c')", canonical: 'c', category: 'homograph' },
    0x0445: { name: "Cyrillic Small Letter Х (Homograph of 'x')", canonical: 'x', category: 'homograph' },
    0x0443: { name: "Cyrillic Small Letter У (Homograph of 'y')", canonical: 'y', category: 'homograph' },
    0x0456: { name: "Cyrillic Small Letter І (Homograph of 'i')", canonical: 'i', category: 'homograph' },
    0x0455: { name: "Cyrillic Small Letter Ѕ (Homograph of 's')", canonical: 's', category: 'homograph' },
    0x0501: { name: "Cyrillic Small Letter Komi De ԁ (Homograph of 'd')", canonical: 'd', category: 'homograph' },

    // Cyrillic Uppercase Lookalikes
    0x0410: { name: "Cyrillic Capital Letter А (Homograph of 'A')", canonical: 'A', category: 'homograph' },
    0x0412: { name: "Cyrillic Capital Letter В (Homograph of 'B')", canonical: 'B', category: 'homograph' },
    0x0415: { name: "Cyrillic Capital Letter Е (Homograph of 'E')", canonical: 'E', category: 'homograph' },
    0x041A: { name: "Cyrillic Capital Letter К (Homograph of 'K')", canonical: 'K', category: 'homograph' },
    0x041C: { name: "Cyrillic Capital Letter М (Homograph of 'M')", canonical: 'M', category: 'homograph' },
    0x041D: { name: "Cyrillic Capital Letter Н (Homograph of 'H')", canonical: 'H', category: 'homograph' },
    0x041E: { name: "Cyrillic Capital Letter О (Homograph of 'O')", canonical: 'O', category: 'homograph' },
    0x0420: { name: "Cyrillic Capital Letter Р (Homograph of 'P')", canonical: 'P', category: 'homograph' },
    0x0421: { name: "Cyrillic Capital Letter С (Homograph of 'C')", canonical: 'C', category: 'homograph' },
    0x0422: { name: "Cyrillic Capital Letter Т (Homograph of 'T')", canonical: 'T', category: 'homograph' },
    0x0425: { name: "Cyrillic Capital Letter Х (Homograph of 'X')", canonical: 'X', category: 'homograph' },
    0x0423: { name: "Cyrillic Capital Letter У (Homograph of 'Y')", canonical: 'Y', category: 'homograph' },

    // Greek Lookalikes
    0x03BF: { name: "Greek Small Letter Omicron ο (Homograph of 'o')", canonical: 'o', category: 'homograph' },
    0x03BD: { name: "Greek Small Letter Nu ν (Homograph of 'v')", canonical: 'v', category: 'homograph' },
    0x03C5: { name: "Greek Small Letter Upsilon υ (Homograph of 'u')", canonical: 'u', category: 'homograph' },
    0x03C1: { name: "Greek Small Letter Rho ρ (Homograph of 'p')", canonical: 'p', category: 'homograph' },
    0x0391: { name: "Greek Capital Letter Alpha Α (Homograph of 'A')", canonical: 'A', category: 'homograph' },
    0x0392: { name: "Greek Capital Letter Beta Β (Homograph of 'B')", canonical: 'B', category: 'homograph' },
    0x0395: { name: "Greek Capital Letter Epsilon Ε (Homograph of 'E')", canonical: 'E', category: 'homograph' },
    0x0396: { name: "Greek Capital Letter Zeta Ζ (Homograph of 'Z')", canonical: 'Z', category: 'homograph' },
    0x0397: { name: "Greek Capital Letter Eta Η (Homograph of 'H')", canonical: 'H', category: 'homograph' },
    0x0399: { name: "Greek Capital Letter Iota Ι (Homograph of 'I')", canonical: 'I', category: 'homograph' },
    0x039A: { name: "Greek Capital Letter Kappa Κ (Homograph of 'K')", canonical: 'K', category: 'homograph' },
    0x039C: { name: "Greek Capital Letter Mu Μ (Homograph of 'M')", canonical: 'M', category: 'homograph' },
    0x039D: { name: "Greek Capital Letter Nu Ν (Homograph of 'N')", canonical: 'N', category: 'homograph' },
    0x039F: { name: "Greek Capital Letter Omicron Ο (Homograph of 'O')", canonical: 'O', category: 'homograph' },
    0x03A1: { name: "Greek Capital Letter Rho Ρ (Homograph of 'P')", canonical: 'P', category: 'homograph' },
    0x03A4: { name: "Greek Capital Letter Tau Τ (Homograph of 'T')", canonical: 'T', category: 'homograph' },
    0x03A7: { name: "Greek Capital Letter Chi Χ (Homograph of 'X')", canonical: 'X', category: 'homograph' },
    0x03A5: { name: "Greek Capital Letter Upsilon Υ (Homograph of 'Y')", canonical: 'Y', category: 'homograph' },

    // ── Latin & Punctuation Homoglyphs (Watermarking / Spoofing) ──
    0x2010: { name: "Hyphen ‐ (Homoglyph of ASCII Hyphen-Minus '-')", canonical: '-', category: 'homograph' },
    0x037E: { name: "Greek Question Mark ; (Homoglyph of Semicolon ';')", canonical: ';', category: 'homograph' },
    0x216D: { name: "Roman Numeral One Hundred Ⅽ (Homoglyph of 'C')", canonical: 'C', category: 'homograph' },
    0x216E: { name: "Roman Numeral Five Hundred Ⅾ (Homoglyph of 'D')", canonical: 'D', category: 'homograph' },
    0x212A: { name: "Kelvin Sign K (Homoglyph of 'K')", canonical: 'K', category: 'homograph' },
    0x216C: { name: "Roman Numeral Fifty Ⅼ (Homoglyph of 'L')", canonical: 'L', category: 'homograph' },
    0x216F: { name: "Roman Numeral One Thousand Ⅿ (Homoglyph of 'M')", canonical: 'M', category: 'homograph' },
    0x2164: { name: "Roman Numeral Five Ⅴ (Homoglyph of 'V')", canonical: 'V', category: 'homograph' },
    0x2169: { name: "Roman Numeral Ten Ⅹ (Homoglyph of 'X')", canonical: 'X', category: 'homograph' },
    0x217D: { name: "Small Roman Numeral One Hundred ⅽ (Homoglyph of 'c')", canonical: 'c', category: 'homograph' },
    0x217E: { name: "Small Roman Numeral Five Hundred ⅾ (Homoglyph of 'd')", canonical: 'd', category: 'homograph' },
    0x2170: { name: "Small Roman Numeral One ⅰ (Homoglyph of 'i')", canonical: 'i', category: 'homograph' },
    0x0458: { name: "Cyrillic Small Letter Je ј (Homoglyph of 'j')", canonical: 'j', category: 'homograph' },
    0x217C: { name: "Small Roman Numeral Fifty ⅼ (Homoglyph of 'l')", canonical: 'l', category: 'homograph' },
    0x2174: { name: "Small Roman Numeral Five ⅴ (Homoglyph of 'v')", canonical: 'v', category: 'homograph' },
    0x2179: { name: "Small Roman Numeral Ten ⅹ (Homoglyph of 'x')", canonical: 'x', category: 'homograph' }
  };

  const CANONICAL_SUBSTITUTABLE = new Set([
    0x0061, 0x0065, 0x006F, 0x0070, 0x0063, 0x0078, 0x0079, 0x0069, 0x0073, 0x0064, 0x0076, 0x0075,
    0x0041, 0x0042, 0x0045, 0x004B, 0x004D, 0x0048, 0x004F, 0x0050, 0x0043, 0x0054, 0x0058, 0x0059, 0x005A, 0x0049, 0x004E,
    0x002D, 0x003B, 0x006A, 0x006C
  ]);

  // ── RANGE-BASED DETECTION GROUPS ────────────────────────────
  const RANGES = [
    {
      start: 0xFE00,
      end: 0xFE0F,
      namePrefix: 'Variation Selector',
      category: 'variationSelector',
      indexOffset: 1
    },
    {
      start: 0xE0100,
      end: 0xE01EF,
      namePrefix: 'Variation Selector',
      category: 'variationSelector',
      indexOffset: 17
    },
    {
      start: 0x180B,
      end: 0x180F,
      namePrefix: 'Mongolian Free Variation Selector',
      category: 'mongolianFVS',
      indexOffset: 1
    },
    {
      start: 0xFF01,
      end: 0xFF5E,
      namePrefix: 'Fullwidth ASCII Homograph',
      category: 'homograph',
      indexOffset: 1
    }
  ];

  // Helper to resolve canonical character for any code point
  function getCanonicalChar(cp) {
    if (HOMOGRAPH_MAP[cp]) {
      return HOMOGRAPH_MAP[cp].canonical;
    }
    // Fullwidth ASCII Range (U+FF01 to U+FF5E) -> Canonical ASCII (Shift is 0xFEE0)
    if (cp >= 0xFF01 && cp <= 0xFF5E) {
      return String.fromCharCode(cp - 0xFEE0);
    }
    // Special spaces -> normal space
    if (CHAR_MAP[cp] && CHAR_MAP[cp].category === 'space') {
      return ' ';
    }
    // Zero width, directional & BOM characters -> stripped
    if (CHAR_MAP[cp] && (CHAR_MAP[cp].category === 'zeroWidth' || CHAR_MAP[cp].category === 'directional' || CHAR_MAP[cp].category === 'bom')) return '';
    for (const range of RANGES) {
      if (cp >= range.start && cp <= range.end) {
        if (range.category === 'variationSelector' || range.category === 'mongolianFVS') return '';
      }
    }
    return String.fromCodePoint(cp);
  }

  // ── CORE ANALYSIS FUNCTION ──────────────────────────────────
  function analyzeText(inputText) {
    const t0 = performance.now();
    const results = [];
    const typesSet = new Set();
    const categoriesMap = {
      zeroWidth: 0,
      variationSelector: 0,
      mongolianFVS: 0,
      homograph: 0,
      space: 0,
      directional: 0,
      bom: 0
    };

    const chars = [...inputText];
    const n = chars.length;

    // 0. Pre-scan line-ending trailing whitespace (SNOW / whitespace steganography)
    // NOTE: Single spaces (' ' / 0x0020) are natural text formatting.
    // Covert whitespace (SNOW / Whitespace Steg) requires either:
    // 1) Contains a Tab (\t / U+0009)
    // 2) OR contains a repeated pattern of 2 or more consecutive trailing spaces/tabs ([ \t]{2,})
    const trailingWsIndices = new Set();
    const lineRegex = /(?:^|\n)(.*?)([ \t]+)(?=\r?\n|$)/g;
    let lm;
    while ((lm = lineRegex.exec(inputText)) !== null) {
      const fullMatch = lm[0];
      const lineContent = lm[1];
      const trailing = lm[2];

      const hasTab = trailing.includes('\t');
      const isRepeatedOrTab = hasTab || trailing.length >= 2;

      if (isRepeatedOrTab) {
        const matchStartInInput = lm.index + (fullMatch.startsWith('\n') ? 1 : 0);
        const startCharIdx = [...inputText.slice(0, matchStartInInput + lineContent.length)].length;
        const trailingLen = [...trailing].length;
        for (let i = 0; i < trailingLen; i++) {
          trailingWsIndices.add(startCharIdx + i);
        }
      }
    }

    // 1. Backward pass for contextAfter
    const nextVisible = new Array(n);
    let activeNext = [];

    for (let i = n - 1; i >= 0; i--) {
      nextVisible[i] = activeNext.join('');
      const cp = chars[i].codePointAt(0);
      if (!isHiddenCodePoint(cp) && cp > 0x001F) {
        activeNext.unshift(chars[i]);
        if (activeNext.length > 3) {
          activeNext.pop();
        }
      }
    }

    // 2. Forward pass for detection
    let activePrev = [];

    for (let position = 0; position < n; position++) {
      const char = chars[position];
      const cp = char.codePointAt(0);

      let match = null;

      if (trailingWsIndices.has(position)) {
        if (cp === 0x0009) {
          match = {
            codePoint: 0x0009,
            hexCode: 'U+0009',
            name: 'Trailing Tab (SNOW / Whitespace Carrier)',
            category: 'space'
          };
        } else if (cp === 0x0020) {
          match = {
            codePoint: 0x0020,
            hexCode: 'U+0020',
            name: 'Trailing Space (SNOW / Whitespace Carrier)',
            category: 'space'
          };
        }
      } else if (CHAR_MAP[cp]) {
        match = {
          codePoint: cp,
          hexCode: 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'),
          name: CHAR_MAP[cp].name,
          category: CHAR_MAP[cp].category,
        };
      } else if (HOMOGRAPH_MAP[cp]) {
        match = {
          codePoint: cp,
          hexCode: 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'),
          name: HOMOGRAPH_MAP[cp].name,
          category: HOMOGRAPH_MAP[cp].category,
        };
      } else {
        for (const range of RANGES) {
          if (cp >= range.start && cp <= range.end) {
            let nameStr = range.namePrefix + ' ' + (cp - range.start + range.indexOffset);
            if (cp >= 0xFF01 && cp <= 0xFF5E) {
              const canonicalChar = String.fromCharCode(cp - 0xFEE0);
              nameStr = `Fullwidth ASCII '${char}' (Homograph of '${canonicalChar}')`;
            }
            match = {
              codePoint: cp,
              hexCode: 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'),
              name: nameStr,
              category: range.category,
            };
            break;
          }
        }
      }

      if (match) {
        results.push({
          ...match,
          position: position,
          contextBefore: activePrev.join(''),
          contextAfter: nextVisible[position],
        });

        typesSet.add(match.hexCode);
        if (categoriesMap[match.category] !== undefined) {
          categoriesMap[match.category]++;
        }
      } else {
        if (!isHiddenCodePoint(cp) && cp > 0x001F) {
          activePrev.push(char);
          if (activePrev.length > 3) {
            activePrev.shift();
          }
        }
      }
    }

    // 3. Aggregate Steganographic Techniques Taxonomy
    const techniques = [];
    if (categoriesMap.zeroWidth > 0) {
      techniques.push({ id: 'ZWC', nameKey: 'techniqueZWC', count: categoriesMap.zeroWidth });
    }
    if (categoriesMap.variationSelector > 0 || categoriesMap.mongolianFVS > 0) {
      techniques.push({ id: 'VS', nameKey: 'techniqueVS', count: categoriesMap.variationSelector + categoriesMap.mongolianFVS });
    }
    if (categoriesMap.homograph > 0) {
      techniques.push({ id: 'HOMOGRAPH', nameKey: 'techniqueHomograph', count: categoriesMap.homograph });
    }
    if (categoriesMap.space > 0) {
      techniques.push({ id: 'SPACE', nameKey: 'techniqueSpace', count: categoriesMap.space });
    }
    if (categoriesMap.directional > 0 || categoriesMap.bom > 0) {
      techniques.push({ id: 'BIDI', nameKey: 'techniqueBiDi', count: categoriesMap.directional + categoriesMap.bom });
    }

    // 4. Natural Linguistic Baseline Evaluation (Arabic / Persian / Oriental ligatures)
    const linguisticEval = evaluateLinguisticBaseline(results, inputText);

    // 5. Strict Exact Signature Matching (Tools / Research / Watermarks)
    const matchedSignatures = matchStegoSignatures(results, inputText, linguisticEval.isNatural);

    // 6. Compute Unique Deduplicated Symbols Inventory
    const uniqueSymbols = computeUniqueSymbols(results);

    const t1 = performance.now();

    return {
      results: results,
      totalFound: results.length,
      distinctTypes: typesSet.size,
      computationTimeMs: parseFloat((t1 - t0).toFixed(2)),
      inputText: inputText,
      techniques: techniques,
      linguisticEval: linguisticEval,
      matchedSignatures: matchedSignatures,
      uniqueSymbols: uniqueSymbols
    };
  }

  function isHiddenCodePoint(cp) {
    if (CHAR_MAP[cp] || HOMOGRAPH_MAP[cp]) return true;
    for (const range of RANGES) {
      if (cp >= range.start && cp <= range.end) return true;
    }
    return false;
  }



  // ── RISK CLASSIFICATION ─────────────────────────────────────
  function classifyRisk(total, linguisticEval) {
    if (linguisticEval && linguisticEval.isNatural) {
      return { level: 'low', i18nKey: 'riskLow', cssClass: 'risk--low', isNatural: true };
    }
    if (total === 0) return { level: 'clean', i18nKey: 'riskClean', cssClass: 'risk--clean' };
    if (total <= 3) return { level: 'low', i18nKey: 'riskLow', cssClass: 'risk--low' };
    if (total <= 10) return { level: 'medium', i18nKey: 'riskMedium', cssClass: 'risk--medium' };
    if (total <= 30) return { level: 'high', i18nKey: 'riskHigh', cssClass: 'risk--high' };
    return { level: 'critical', i18nKey: 'riskCritical', cssClass: 'risk--critical' };
  }

  // ── CATEGORY i18n KEY MAPPING ───────────────────────────────
  const CATEGORY_I18N = {
    zeroWidth: 'catZeroWidth',
    directional: 'catDirectional',
    space: 'catSpace',
    variationSelector: 'catVariationSelector',
    mongolianFVS: 'catMongolianFVS',
    bom: 'catBOM',
    homograph: 'catHomograph'
  };

  // ── PREDEFINED STEGANOGRAPHY SIGNATURES REGISTRY (PDF TABLES) ──
  const STEGO_SIGNATURES_REGISTRY = [
    // ── 1. Tools (الأدوات) ──
    {
      id: 'tool_stego_tools',
      type: 'tool',
      name: 'steganography-tools',
      titleAr: 'أداة steganography-tools (priyansh-15)',
      titleEn: 'steganography-tools (priyansh-15)',
      url: 'https://github.com/priyansh-15/steganography-tools',
      exactSymbols: [0x200C, 0x202C, 0x200E, 0x202D],
      minCount: 4,
      encodingTable: [
        { charName: 'Zero Width Non-Joiner (ZWNJ)', hex: 'U+200C', bits: '00', desc: 'Zero Width Non-Joiner' },
        { charName: 'Pop Directional Formatting (PDF)', hex: 'U+202C', bits: '01', desc: 'Pop Directional Formatting' },
        { charName: 'Left-to-Right Mark (LRM)', hex: 'U+200E', bits: '10', desc: 'Left-to-Right Mark' },
        { charName: 'Left-to-Right Override (LRO)', hex: 'U+202D', bits: '11', desc: 'Left-to-Right Override' }
      ]
    },
    {
      id: 'tool_snow',
      type: 'tool',
      name: 'SNOW Tool',
      titleAr: 'أداة SNOW (darkside.com.au)',
      titleEn: 'SNOW Steganography Tool',
      url: 'https://darkside.com.au/snow/',
      isSnow: true,
      minCount: 2,
      encodingTable: [
        { charName: 'Tab', hex: 'U+0009', bits: '000 (0)', desc: 'Tab (0)' },
        { charName: 'Tab + 1 space', hex: 'U+0009 + 0x0020', bits: '001 (1)', desc: 'Tab + 1 space (1)' },
        { charName: 'Tab + 2 spaces', hex: 'U+0009 + 2x0x0020', bits: '010 (2)', desc: 'Tab + 2 spaces (2)' },
        { charName: 'Tab + 3 spaces', hex: 'U+0009 + 3x0x0020', bits: '011 (3)', desc: 'Tab + 3 spaces (3)' },
        { charName: 'Tab + 4 spaces', hex: 'U+0009 + 4x0x0020', bits: '100 (4)', desc: 'Tab + 4 spaces (4)' },
        { charName: 'Tab + 5 spaces', hex: 'U+0009 + 5x0x0020', bits: '101 (5)', desc: 'Tab + 5 spaces (5)' },
        { charName: 'Tab + 6 spaces', hex: 'U+0009 + 6x0x0020', bits: '110 (6)', desc: 'Tab + 6 spaces (6)' },
        { charName: 'Tab + 7 spaces', hex: 'U+0009 + 7x0x0020', bits: '111 (7)', desc: 'Tab + 7 spaces (7)' }
      ]
    },
    {
      id: 'tool_doublespeak',
      type: 'tool',
      name: 'Doublespeak',
      titleAr: 'أداة Doublespeak (dblspk)',
      titleEn: 'Doublespeak Covert Text Web-App',
      url: 'https://github.com/dblspk/web-app',
      exactSymbols: [
        0x200C, 0x200D, 0x2060, 0x2061, 0x2062, 0x2063, 0x2064,
        0x206A, 0x206B, 0x206C, 0x206D, 0x206E, 0x206F, 0xFE00, 0xFE01, 0xFEFF
      ],
      minCount: 4,
      encodingTable: [
        { charName: 'zero-width non-joiner', hex: 'U+200C', bits: '0000 (0 / 0x0)', desc: 'Zero-Width Non-Joiner' },
        { charName: 'zero-width joiner', hex: 'U+200D', bits: '0001 (1 / 0x1)', desc: 'Zero-Width Joiner' },
        { charName: 'word joiner', hex: 'U+2060', bits: '0010 (2 / 0x2)', desc: 'Word Joiner' },
        { charName: 'function application', hex: 'U+2061', bits: '0011 (3 / 0x3)', desc: 'Function Application' },
        { charName: 'invisible times', hex: 'U+2062', bits: '0100 (4 / 0x4)', desc: 'Invisible Times' },
        { charName: 'invisible separator', hex: 'U+2063', bits: '0101 (5 / 0x5)', desc: 'Invisible Separator' },
        { charName: 'invisible plus', hex: 'U+2064', bits: '0110 (6 / 0x6)', desc: 'Invisible Plus' },
        { charName: 'inhibit symmetric swapping', hex: 'U+206A', bits: '0111 (7 / 0x7)', desc: 'Inhibit Symmetric Swapping' },
        { charName: 'activate symmetric swapping', hex: 'U+206B', bits: '1000 (8 / 0x8)', desc: 'Activate Symmetric Swapping' },
        { charName: 'inhibit Arabic form shaping', hex: 'U+206C', bits: '1001 (9 / 0x9)', desc: 'Inhibit Arabic Form Shaping' },
        { charName: 'activate Arabic form shaping', hex: 'U+206D', bits: '1010 (10 / 0xA)', desc: 'Activate Arabic Form Shaping' },
        { charName: 'national digit shapes', hex: 'U+206E', bits: '1011 (11 / 0xB)', desc: 'National Digit Shapes' },
        { charName: 'nominal digit shapes', hex: 'U+206F', bits: '1100 (12 / 0xC)', desc: 'Nominal Digit Shapes' },
        { charName: 'variation selector-1', hex: 'U+FE00', bits: '1101 (13 / 0xD)', desc: 'Variation Selector-1' },
        { charName: 'variation selector-2', hex: 'U+FE01', bits: '1110 (14 / 0xE)', desc: 'Variation Selector-2' },
        { charName: 'zero-width non-breaking space', hex: 'U+FEFF', bits: '1111 (15 / 0xF)', desc: 'ZWNBSP / BOM' }
      ]
    },
    {
      id: 'tool_stegzero_3bit',
      type: 'tool',
      name: 'StegZero (3-bit)',
      titleAr: 'أداة StegZero (نظام 3 بت)',
      titleEn: 'StegZero (3-bit Mode)',
      url: 'https://stegzero.com/',
      exactSymbols: [0x200B, 0x200C, 0x200D, 0x2060, 0x2062, 0x2063, 0x2064, 0xFEFF],
      minCount: 4,
      encodingTable: [
        { charName: 'Zero-Width Space (ZWSP)', hex: 'U+200B', bits: '000', desc: 'Zero-Width Space' },
        { charName: 'Zero-Width Non-Joiner (ZWNJ)', hex: 'U+200C', bits: '001', desc: 'Zero-Width Non-Joiner' },
        { charName: 'Zero-Width Joiner (ZWJ)', hex: 'U+200D', bits: '010', desc: 'Zero-Width Joiner' },
        { charName: 'Word Joiner (WJ)', hex: 'U+2060', bits: '011', desc: 'Word Joiner' },
        { charName: 'Invisible Times', hex: 'U+2062', bits: '100', desc: 'Invisible Times' },
        { charName: 'Invisible Separator', hex: 'U+2063', bits: '101', desc: 'Invisible Separator' },
        { charName: 'Invisible Plus', hex: 'U+2064', bits: '110', desc: 'Invisible Plus' },
        { charName: 'Zero-Width No-Break Space / BOM', hex: 'U+FEFF', bits: '111', desc: 'ZWNBS / BOM' }
      ]
    },
    {
      id: 'tool_stegzero_1bit',
      type: 'tool',
      name: 'StegZero (1-bit)',
      titleAr: 'أداة StegZero (نظام 1 بت الثنائي)',
      titleEn: 'StegZero (1-bit Binary Mode)',
      url: 'https://stegzero.com/',
      exactSymbols: [0x200B, 0x200C],
      minCount: 4,
      encodingTable: [
        { charName: 'Zero-Width Space (ZWSP)', hex: 'U+200B', bits: '0', desc: 'Zero-Width Space' },
        { charName: 'Zero-Width Non-Joiner (ZWNJ)', hex: 'U+200C', bits: '1', desc: 'Zero-Width Non-Joiner' }
      ]
    },
    {
      id: 'tool_stegoline_emoji',
      type: 'tool',
      name: 'Stegoline – Emoji encoder',
      titleAr: 'Stegoline – مشفر الرموز التعبيرية (Emoji Encoder)',
      titleEn: 'Stegoline – Emoji Encoder',
      url: 'https://stegnolines.com/',
      secondaryUrl: 'https://emoji-encoder.vercel.app/?mode=encode',
      isVariationSelectorScheme: true,
      minCount: 2,
      encodingTable: [
        { charName: 'Basic variation selectors (VS1–VS16)', hex: 'U+FE00 – U+FE0F', bits: '16 characters (4-bit nibble)', desc: 'Basic Variation Selectors' },
        { charName: 'Variation selectors supplement (VS17–VS256)', hex: 'U+E0100 – U+E01EF', bits: '240 characters (8-bit byte)', desc: 'Variation Selectors Supplement' }
      ]
    },

    // ── 2. Academic Research Papers (الأبحاث بالرموز المخفية) ──
    {
      id: 'research_multilayer_huffman',
      type: 'research',
      name: 'Multilayer Encoding & Huffman (IJACSA 2022)',
      titleAr: 'بحث الإخفاء متعدد الطبقات وتشفير هافمان (IJACSA 2022)',
      titleEn: 'Multilayer Encoding with Format-Preserving Encryption & Huffman Coding',
      doi: '10.14569/IJACSA.2022.0131222',
      url: 'https://doi.org/10.14569/IJACSA.2022.0131222',
      exactSymbols: [0x200B, 0x200D, 0x200C, 0x2064, 0x2063, 0x206A, 0x2205, 0x202A],
      altExactSymbols: [0x200B, 0x200D, 0x200C, 0x2064, 0x2063, 0x206A, 0x202A],
      minCount: 4,
      encodingTable: [
        { charName: 'Zero width character (ZWC)', hex: 'U+200B', bits: '000', desc: 'Zero-Width Character' },
        { charName: 'Zero width joiner (ZWJ)', hex: 'U+200D', bits: '001', desc: 'Zero-Width Joiner' },
        { charName: 'Zero width no-joiner (ZWNJ)', hex: 'U+200C', bits: '010', desc: 'Zero-Width Non-Joiner' },
        { charName: 'Invisible plus (IP)', hex: 'U+2064', bits: '011', desc: 'Invisible Plus' },
        { charName: 'Invisible separator (IS)', hex: 'U+2063', bits: '100', desc: 'Invisible Separator' },
        { charName: 'Inhibit Symmetric Swapping (ISS)', hex: 'U+206A', bits: '101', desc: 'Inhibit Symmetric Swapping' },
        { charName: 'Empty string (∅)', hex: 'U+2205', bits: '110', desc: 'Empty String Symbol' },
        { charName: 'Left-To-Right Embedding (LRE)', hex: 'U+202A', bits: '111', desc: 'Left-To-Right Embedding' }
      ]
    },
    {
      id: 'research_aitsteg',
      type: 'research',
      name: 'AITSteg: Text Steganography via Social Media (IEEE ACCESS 2018)',
      titleAr: 'بحث AITSteg للإخفاء عبر وسائل التواصل (IEEE ACCESS 2018)',
      titleEn: 'AITSteg: Innovative Technique for Hidden Transmission via Social Media',
      doi: '10.1109/ACCESS.2018.2866063',
      url: 'https://doi.org/10.1109/ACCESS.2018.2866063',
      exactSymbols: [0x200C, 0x202C, 0x202D, 0x200E],
      minCount: 4,
      encodingTable: [
        { charName: 'ZWNJ - Zero Width Non-Joiner', hex: 'U+200C', bits: '00', desc: 'Zero-Width Non-Joiner' },
        { charName: 'PDF - Pop Directional Formatting', hex: 'U+202C', bits: '01', desc: 'Pop Directional Formatting' },
        { charName: 'LRO - Left-to-Right Override', hex: 'U+202D', bits: '10', desc: 'Left-to-Right Override' },
        { charName: 'LRM - Left-to-Right Mark', hex: 'U+200E', bits: '11', desc: 'Left-to-Right Mark' }
      ]
    },
    {
      id: 'research_pos_fpe',
      type: 'research',
      name: 'Text Steganography Based on POS Tagging & FPE',
      titleAr: 'بحث الإخفاء بوسم أقسام الكلام والتشفير المحافظ على التنسيق (POS & FPE)',
      titleEn: 'Text Steganography Based on Part-of-Speech Tagging & FPE',
      url: 'https://scholar.google.com/scholar?q=New+Text+Steganography+Technique+Based+on+Part-of-Speech+Tagging+and+Format-Preserving+Encryption',
      exactSymbols: [
        0x200B, 0x200D, 0x200C, 0x2064, 0x2063, 0x206A, 0x2062,
        0x2205, 0x202A, 0x202D, 0x202C, 0x2060, 0x2066, 0x2068
      ],
      minCount: 4,
      encodingTable: [
        { charName: 'Zero width space (ZWS)', hex: 'U+200B', bits: '0000', desc: 'Zero Width Space' },
        { charName: 'Zero width joiner (ZWJ)', hex: 'U+200D', bits: '0001', desc: 'Zero Width Joiner' },
        { charName: 'Zero width no-joiner (ZWNJ)', hex: 'U+200C', bits: '0010', desc: 'Zero Width Non-Joiner' },
        { charName: 'Invisible plus (IP)', hex: 'U+2064', bits: '0011', desc: 'Invisible Plus' },
        { charName: 'Invisible separator (IS)', hex: 'U+2063', bits: '0100', desc: 'Invisible Separator' },
        { charName: 'Inhibit Symmetric Swapping (ISS)', hex: 'U+206A', bits: '0101', desc: 'Inhibit Symmetric Swapping' },
        { charName: 'Invisible Time (IT)', hex: 'U+2062', bits: '0110', desc: 'Invisible Time' },
        { charName: 'Empty string (\'\'\'\')', hex: 'U+2205', bits: '0111', desc: 'Empty String Symbol' },
        { charName: 'Left-To-Right Embedding (LRE)', hex: 'U+202A', bits: '1000', desc: 'Left-To-Right Embedding' },
        { charName: 'Left-To-Right Override (LRO)', hex: 'U+202D', bits: '1001', desc: 'Left-To-Right Override' },
        { charName: 'Pop Directional Formatting (PDF)', hex: 'U+202C', bits: '1010', desc: 'Pop Directional Formatting' },
        { charName: 'Word Joiner (WJ)', hex: 'U+2060', bits: '1011', desc: 'Word Joiner' },
        { charName: 'Left-To-Right Isolate (LRI)', hex: 'U+2066', bits: '1100', desc: 'Left-To-Right Isolate' },
        { charName: 'First Strong Isolate (FSI)', hex: 'U+2068', bits: '1101', desc: 'First Strong Isolate' }
      ]
    },
    {
      id: 'research_lisat_2015',
      type: 'research',
      name: 'Highly efficient novel text steganography algorithms (LISAT 2015)',
      titleAr: 'بحث خوارزميات الإخفاء النصي عالية الكفاءة (IEEE LISAT 2015)',
      titleEn: 'Highly Efficient Novel Text Steganography Algorithms (IEEE LISAT 2015)',
      doi: '10.1109/LISAT.2015.7160209',
      url: 'https://doi.org/10.1109/LISAT.2015.7160209',
      exactSymbols: [0x200C, 0x200E, 0x200F, 0x200D],
      minCount: 4,
      encodingTable: [
        { charName: 'Zero-Width-Non-Joiner (ZWNJ)', hex: 'U+200C', bits: 'Decimal 8204', desc: 'Zero-Width Non-Joiner' },
        { charName: 'Left-To-Right Mark (LRM)', hex: 'U+200E', bits: 'Decimal 8206', desc: 'Left-To-Right Mark' },
        { charName: 'Right-To-Left Mark (RLM)', hex: 'U+200F', bits: 'Decimal 8207', desc: 'Right-To-Left Mark' },
        { charName: 'Zero-Width-Joiner (ZWJ)', hex: 'U+200D', bits: 'Decimal 8205', desc: 'Zero-Width Joiner' }
      ]
    },

    // ── 3. Watermarking Research (أبحاث العلامات المائية) ──
    {
      id: 'watermark_homoglyphs_sub',
      type: 'watermark',
      name: 'Content-preserving Text Watermarking through Unicode Homoglyph Substitution',
      titleAr: 'بحث العلامة المائية المحافظة على المحتوى عبر متجانسات يونيكود (ACM 2016)',
      titleEn: 'Content-preserving Text Watermarking through Unicode Homoglyph Substitution',
      doi: '10.1145/2938503.2938510',
      url: 'https://doi.org/10.1145/2938503.2938510',
      isWatermark: true,
      exactSymbols: [0x2010, 0x037E, 0x216D, 0x216E, 0x212A, 0x216C, 0x216F, 0x2164, 0x2169, 0x217D, 0x217E, 0x2170, 0x0458, 0x217C, 0x2174, 0x2179],
      minCount: 3,
      encodingTable: [
        { charName: 'Hyphen (‐)', hex: '0x2010 (vs 0x002D)', bits: 'Bit 1 (Alt) vs Bit 0 (Orig)', desc: 'الواصلة' },
        { charName: 'Greek Question Mark (;)', hex: '0x037E (vs 0x003B)', bits: 'Bit 1 (Alt) vs Bit 0 (Orig)', desc: 'الفاصلة المنقوطة' },
        { charName: 'Roman Numeral C (Ⅽ)', hex: '0x216D (vs 0x0043)', bits: 'Bit 1 (Alt) vs Bit 0 (Orig)', desc: 'C كبير' },
        { charName: 'Roman Numeral D (Ⅾ)', hex: '0x216E (vs 0x0044)', bits: 'Bit 1 (Alt) vs Bit 0 (Orig)', desc: 'D كبير' },
        { charName: 'Kelvin Sign (K)', hex: '0x212A (vs 0x004B)', bits: 'Bit 1 (Alt) vs Bit 0 (Orig)', desc: 'K كبير' },
        { charName: 'Roman Numeral L (Ⅼ)', hex: '0x216C (vs 0x004C)', bits: 'Bit 1 (Alt) vs Bit 0 (Orig)', desc: 'L كبير' },
        { charName: 'Roman Numeral M (Ⅿ)', hex: '0x216F (vs 0x004D)', bits: 'Bit 1 (Alt) vs Bit 0 (Orig)', desc: 'M كبير' },
        { charName: 'Roman Numeral V (Ⅴ)', hex: '0x2164 (vs 0x0056)', bits: 'Bit 1 (Alt) vs Bit 0 (Orig)', desc: 'V كبير' },
        { charName: 'Roman Numeral X (Ⅹ)', hex: '0x2169 (vs 0x0058)', bits: 'Bit 1 (Alt) vs Bit 0 (Orig)', desc: 'X كبير' },
        { charName: 'Small Roman Numeral c (ⅽ)', hex: '0x217D (vs 0x0063)', bits: 'Bit 1 (Alt) vs Bit 0 (Orig)', desc: 'c صغير' },
        { charName: 'Small Roman Numeral d (ⅾ)', hex: '0x217E (vs 0x0064)', bits: 'Bit 1 (Alt) vs Bit 0 (Orig)', desc: 'd صغير' },
        { charName: 'Small Roman Numeral i (ⅰ)', hex: '0x2170 (vs 0x0069)', bits: 'Bit 1 (Alt) vs Bit 0 (Orig)', desc: 'i صغير' },
        { charName: 'Cyrillic Small Je (ј)', hex: '0x0458 (vs 0x006A)', bits: 'Bit 1 (Alt) vs Bit 0 (Orig)', desc: 'j صغير' },
        { charName: 'Small Roman Numeral l (ⅼ)', hex: '0x217C (vs 0x006C)', bits: 'Bit 1 (Alt) vs Bit 0 (Orig)', desc: 'l صغير' },
        { charName: 'Small Roman Numeral v (ⅴ)', hex: '0x2174 (vs 0x0076)', bits: 'Bit 1 (Alt) vs Bit 0 (Orig)', desc: 'v صغير' },
        { charName: 'Small Roman Numeral x (ⅹ)', hex: '0x2179 (vs 0x0078)', bits: 'Bit 1 (Alt) vs Bit 0 (Orig)', desc: 'x صغير' }
      ]
    },
    {
      id: 'watermark_social_media',
      type: 'watermark',
      name: 'Text Watermarking in Social Media (ACM 2017)',
      titleAr: 'بحث العلامات المائية النصية في وسائل التواصل (ACM 2017)',
      titleEn: 'Text Watermarking in Social Media (ACM 2017)',
      doi: '10.1145/3110025.3116203',
      url: 'https://doi.org/10.1145/3110025.3116203',
      isWatermark: true,
      exactSymbols: [0x2010, 0x216D, 0x216E, 0x216C, 0x216F, 0x2164, 0x2169, 0x217D, 0x217E, 0x2170, 0x0458, 0x217C, 0x2174, 0x2179],
      minCount: 3,
      encodingTable: [
        { charName: 'Hyphen (‐)', hex: '0x2010 (vs 0x002D)', bits: 'Bit 1 (Alt) vs Bit 0 (Orig)', desc: 'الواصلة' },
        { charName: 'Roman Numeral C (Ⅽ)', hex: '0x216D (vs 0x0043)', bits: 'Bit 1 (Alt) vs Bit 0 (Orig)', desc: 'C كبير' },
        { charName: 'Roman Numeral D (Ⅾ)', hex: '0x216E (vs 0x0044)', bits: 'Bit 1 (Alt) vs Bit 0 (Orig)', desc: 'D كبير' },
        { charName: 'Roman Numeral L (Ⅼ)', hex: '0x216C (vs 0x004C)', bits: 'Bit 1 (Alt) vs Bit 0 (Orig)', desc: 'L كبير' },
        { charName: 'Roman Numeral M (Ⅿ)', hex: '0x216F (vs 0x004D)', bits: 'Bit 1 (Alt) vs Bit 0 (Orig)', desc: 'M كبير' },
        { charName: 'Roman Numeral V (Ⅴ)', hex: '0x2164 (vs 0x0056)', bits: 'Bit 1 (Alt) vs Bit 0 (Orig)', desc: 'V كبير' },
        { charName: 'Roman Numeral X (Ⅹ)', hex: '0x2169 (vs 0x0058)', bits: 'Bit 1 (Alt) vs Bit 0 (Orig)', desc: 'X كبير' },
        { charName: 'Small Roman Numeral c (ⅽ)', hex: '0x217D (vs 0x0063)', bits: 'Bit 1 (Alt) vs Bit 0 (Orig)', desc: 'c صغير' },
        { charName: 'Small Roman Numeral d (ⅾ)', hex: '0x217E (vs 0x0064)', bits: 'Bit 1 (Alt) vs Bit 0 (Orig)', desc: 'd صغير' },
        { charName: 'Small Roman Numeral i (ⅰ)', hex: '0x2170 (vs 0x0069)', bits: 'Bit 1 (Alt) vs Bit 0 (Orig)', desc: 'i صغير' },
        { charName: 'Cyrillic Small Je (ј)', hex: '0x0458 (vs 0x006A)', bits: 'Bit 1 (Alt) vs Bit 0 (Orig)', desc: 'j صغير' },
        { charName: 'Small Roman Numeral l (ⅼ)', hex: '0x217C (vs 0x006C)', bits: 'Bit 1 (Alt) vs Bit 0 (Orig)', desc: 'l صغير' },
        { charName: 'Small Roman Numeral v (ⅴ)', hex: '0x2174 (vs 0x0076)', bits: 'Bit 1 (Alt) vs Bit 0 (Orig)', desc: 'v صغير' },
        { charName: 'Small Roman Numeral x (ⅹ)', hex: '0x2179 (vs 0x0078)', bits: 'Bit 1 (Alt) vs Bit 0 (Orig)', desc: 'x صغير' }
      ]
    }
  ];

  // ── EVALUATE LINGUISTIC BASELINE (FALSE POSITIVE PREVENTION) ──
  function evaluateLinguisticBaseline(results, text) {
    if (!results || results.length === 0) return { isNatural: false };

    // Standard Arabic/Persian ligatures and bidi directionals
    const NATURAL_SET = new Set([0x200C, 0x200D, 0x200E, 0x200F]);
    const foundSet = new Set(results.map(r => r.codePoint));

    let allInNaturalSet = true;
    for (const cp of foundSet) {
      if (!NATURAL_SET.has(cp)) {
        allInNaturalSet = false;
        break;
      }
    }

    if (!allInNaturalSet) {
      return { isNatural: false };
    }

    // Check for clustering (consecutive hidden characters)
    let hasConsecutive = false;
    for (let i = 0; i < results.length - 1; i++) {
      if (results[i + 1].position === results[i].position + 1) {
        hasConsecutive = true;
        break;
      }
    }

    // Natural occurrence is isolated and small in quantity (<= 3 in total)
    const isNatural = !hasConsecutive && results.length <= 3;
    return {
      isNatural: isNatural,
      reason: isNatural ? 'isolatedTypographic' : 'excessiveOrClustered'
    };
  }

  // ── STRICT EXACT SIGNATURE MATCHING (NO EXTRA, NO MISSING) ──
  function matchStegoSignatures(results, text, isNatural) {
    if (isNatural) return [];
    if (!results || results.length === 0) return [];

    const foundSet = new Set(results.map(r => r.codePoint));
    const totalFound = results.length;
    const matched = [];

    // Check SNOW pattern specifically (line-end trailing tab + spaces)
    const snowMatches = text ? text.match(/\t[ ]{0,7}(?:\r?\n|$)/g) : null;
    const hasSnowPattern = snowMatches && snowMatches.length >= 2;

    for (const sig of STEGO_SIGNATURES_REGISTRY) {
      if (sig.isSnow) {
        const hasTab = foundSet.has(0x0009);
        const onlyWhitespace = Array.from(foundSet).every(cp => cp === 0x0009 || cp === 0x0020);
        if (hasTab && onlyWhitespace && totalFound >= sig.minCount) {
          matched.push(sig);
        }
        continue;
      }

      if (sig.isVariationSelectorScheme) {
        let onlyVS = true;
        for (const cp of foundSet) {
          const isVS = (cp >= 0xFE00 && cp <= 0xFE0F) || (cp >= 0xE0100 && cp <= 0xE01EF);
          if (!isVS) {
            onlyVS = false;
            break;
          }
        }
        if (onlyVS && totalFound >= sig.minCount) {
          matched.push(sig);
        }
        continue;
      }

      if (sig.exactSymbols) {
        // Strict set equality check (دون زيادة أو نقصان)
        const sigSet = new Set(sig.exactSymbols);
        let exactMatch = (foundSet.size === sigSet.size);
        if (exactMatch) {
          for (const cp of sigSet) {
            if (!foundSet.has(cp)) {
              exactMatch = false;
              break;
            }
          }
        }

        if (!exactMatch && sig.altExactSymbols) {
          const altSet = new Set(sig.altExactSymbols);
          if (foundSet.size === altSet.size) {
            let altMatch = true;
            for (const cp of altSet) {
              if (!foundSet.has(cp)) {
                altMatch = false;
                break;
              }
            }
            if (altMatch) exactMatch = true;
          }
        }

        if (exactMatch && totalFound >= sig.minCount) {
          matched.push(sig);
        }
      }
    }

    return matched;
  }

  // ── COMPUTE UNIQUE DEDUPLICATED SYMBOLS INVENTORY ────────────
  function computeUniqueSymbols(results) {
    if (!results || results.length === 0) return [];
    const countsMap = new Map();
    for (const r of results) {
      if (!countsMap.has(r.codePoint)) {
        countsMap.set(r.codePoint, {
          codePoint: r.codePoint,
          hexCode: r.hexCode,
          name: r.name,
          category: r.category,
          count: 0
        });
      }
      countsMap.get(r.codePoint).count++;
    }

    const total = results.length;
    const list = Array.from(countsMap.values());
    list.sort((a, b) => b.count - a.count || a.codePoint - b.codePoint);

    const n = list.length;
    list.forEach((item, idx) => {
      item.percentage = ((item.count / total) * 100).toFixed(1) + '%';
      if (n === 2) {
        item.suggestedBit = idx === 0 ? '0' : '1';
      } else if (n <= 4) {
        item.suggestedBit = idx.toString(2).padStart(2, '0');
      } else if (n <= 8) {
        item.suggestedBit = idx.toString(2).padStart(3, '0');
      } else if (n <= 16) {
        item.suggestedBit = idx.toString(2).padStart(4, '0') + ` (${idx.toString(16).toUpperCase()})`;
      } else {
        item.suggestedBit = `Symbol #${idx + 1}`;
      }
    });

    return list;
  }

  function getVisualSymbolBadge(cp) {
    if (cp === 0x0020) return '<span class="stego-glyph-badge stego-glyph--space">[Space]</span>';
    if (cp === 0x0009) return '<span class="stego-glyph-badge stego-glyph--space">[Tab]</span>';
    if (HOMOGRAPH_MAP[cp]) return `<span class="stego-glyph-badge stego-glyph--visible">${String.fromCodePoint(cp)}</span>`;
    if (cp === 0x200B) return '<span class="stego-glyph-badge stego-glyph--zwc">ZWSP</span>';
    if (cp === 0x200C) return '<span class="stego-glyph-badge stego-glyph--zwc">ZWNJ</span>';
    if (cp === 0x200D) return '<span class="stego-glyph-badge stego-glyph--zwc">ZWJ</span>';
    if (cp === 0xFEFF) return '<span class="stego-glyph-badge stego-glyph--zwc">BOM</span>';
    if (cp === 0x200E) return '<span class="stego-glyph-badge stego-glyph--bidi">LRM</span>';
    if (cp === 0x200F) return '<span class="stego-glyph-badge stego-glyph--bidi">RLM</span>';
    if (cp === 0x202A) return '<span class="stego-glyph-badge stego-glyph--bidi">LRE</span>';
    if (cp === 0x202C) return '<span class="stego-glyph-badge stego-glyph--bidi">PDF</span>';
    if (cp === 0x202D) return '<span class="stego-glyph-badge stego-glyph--bidi">LRO</span>';
    if (cp === 0x2060) return '<span class="stego-glyph-badge stego-glyph--zwc">WJ</span>';
    if (cp === 0x2061) return '<span class="stego-glyph-badge stego-glyph--op">FA</span>';
    if (cp === 0x2062) return '<span class="stego-glyph-badge stego-glyph--op">IT</span>';
    if (cp === 0x2063) return '<span class="stego-glyph-badge stego-glyph--op">IS</span>';
    if (cp === 0x2064) return '<span class="stego-glyph-badge stego-glyph--op">IP</span>';
    if (cp === 0x206A) return '<span class="stego-glyph-badge stego-glyph--op">ISS</span>';
    if (cp === 0x206B) return '<span class="stego-glyph-badge stego-glyph--op">ASS</span>';
    if (cp === 0x206C) return '<span class="stego-glyph-badge stego-glyph--op">IAFS</span>';
    if (cp === 0x206D) return '<span class="stego-glyph-badge stego-glyph--op">AAFS</span>';
    if (cp === 0x206E) return '<span class="stego-glyph-badge stego-glyph--op">NDS</span>';
    if (cp === 0x206F) return '<span class="stego-glyph-badge stego-glyph--op">NODS</span>';
    if (cp === 0x2205) return '<span class="stego-glyph-badge stego-glyph--op">∅</span>';
    if (cp >= 0xFE00 && cp <= 0xFE0F) return `<span class="stego-glyph-badge stego-glyph--vs">VS${cp - 0xFE00 + 1}</span>`;
    if (cp >= 0xE0100 && cp <= 0xE01EF) return `<span class="stego-glyph-badge stego-glyph--vs">VS${cp - 0xE0100 + 17}</span>`;
    return '<span class="stego-glyph-badge">◌</span>';
  }

  // ── RENDER MATCHED SIGNATURES SECTION ────────────────────────
  function renderMatchedSignaturesSection(matchedSignatures, analysis) {
    const curLang = localStorage.getItem('stegoLang') || document.documentElement.lang || 'en';

    let cardsHtml = '';
    const hasAmbiguity = matchedSignatures.length > 1;

    matchedSignatures.forEach((sig) => {
      const isAr = curLang === 'ar';
      const title = isAr ? (sig.titleAr || sig.name) : (sig.titleEn || sig.name);
      const typeLabel = sig.type === 'tool'
        ? t('signatureTypeTool')
        : (sig.type === 'watermark' ? t('signatureTypeWatermark') : t('signatureTypeResearch'));

      const typeIcon = sig.type === 'tool' ? 'build' : (sig.type === 'watermark' ? 'verified' : 'menu_book');
      const badgeClass = sig.type === 'tool' ? 'badge--primary' : (sig.type === 'watermark' ? 'badge--info' : 'badge--encrypted');

      let tableRows = '';
      sig.encodingTable.forEach(row => {
        tableRows += `
          <tr>
            <td style="font-weight: 600; color: var(--color-on-surface);">${escSafe(row.charName)}</td>
            <td><code class="code-tag">${escSafe(row.hex)}</code></td>
            <td><span class="stego-bit-badge">${escSafe(row.bits)}</span></td>
            <td style="color: var(--color-on-surface-variant); font-size: 0.85rem;">${escSafe(row.desc)}</td>
          </tr>
        `;
      });

      let noticeHtml = '';
      if (sig.isWatermark) {
        noticeHtml = `
          <div class="stego-notice-banner stego-notice--watermark">
            <span class="material-symbols-outlined">info</span>
            <span>${t('signatureWatermarkNotice')}</span>
          </div>
        `;
      }

      cardsHtml += `
        <div class="stego-signature-card" id="sig-card-${sig.id}">
          <div class="stego-signature-card__header">
            <div class="stego-signature-card__title-wrap">
              <div class="stego-signature-card__icon-wrap">
                <span class="material-symbols-outlined">${typeIcon}</span>
              </div>
              <div>
                <div class="stego-signature-card__title">${escSafe(title)}</div>
                <div class="stego-signature-card__tags">
                  <span class="badge ${badgeClass} text-label-xs">${typeLabel}</span>
                  <span class="badge badge--success text-label-xs">
                    <span class="material-symbols-outlined" style="font-size: 13px;">check_circle</span>
                    ${t('signatureExactBadge')}
                  </span>
                </div>
              </div>
            </div>
            ${sig.url ? `
              <a href="${sig.url}" target="_blank" rel="noopener noreferrer" class="btn btn--outline stego-signature-card__link-btn">
                <span>${t('signatureOpenLink')}</span>
                <span class="material-symbols-outlined" style="font-size: 16px;">open_in_new</span>
              </a>
            ` : ''}
          </div>

          ${noticeHtml}

          <div class="stego-signature-table-wrap">
            <div class="stego-signature-table__title">
              <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-primary);">table_chart</span>
              <span>${t('signatureEncodingTableTitle')}</span>
            </div>
            <div class="steganalysis-table-container">
              <table class="stego-signature-table">
                <thead>
                  <tr>
                    <th>${t('signatureColChar')}</th>
                    <th>${t('signatureColHex')}</th>
                    <th>${t('signatureColBits')}</th>
                    <th>${t('signatureColDesc')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRows}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    });

    let ambiguityAlert = '';
    if (hasAmbiguity) {
      ambiguityAlert = `
        <div class="stego-notice-banner stego-notice--ambiguity">
          <span class="material-symbols-outlined">balance</span>
          <span>${t('signatureAmbiguityNotice')}</span>
        </div>
      `;
    }

    return `
      <div class="stego-signature-section">
        <div class="stego-section-header">
          <div class="stego-section-header__title-wrap">
            <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 1.4rem;">fingerprint</span>
            <h3 class="stego-section-header__title">${t('signatureMatchedTitle')}</h3>
          </div>
          <p class="stego-section-header__subtitle">${t('signatureMatchedSubtitle')}</p>
        </div>
        ${ambiguityAlert}
        <div class="stego-signatures-grid">
          ${cardsHtml}
        </div>
      </div>
    `;
  }

  // ── RENDER UNIQUE SYMBOLS INVENTORY (FALLBACK WHEN NO MATCH) ──
  function renderUniqueSymbolsInventorySection(uniqueSymbols, isNatural) {
    if (!uniqueSymbols || uniqueSymbols.length === 0) return '';

    let naturalAlert = '';
    if (isNatural) {
      naturalAlert = `
        <div class="stego-notice-banner stego-notice--natural">
          <span class="material-symbols-outlined">spellcheck</span>
          <span>${t('naturalFormattingNotice')}</span>
        </div>
      `;
    }

    let rowsHtml = '';
    uniqueSymbols.forEach((item, idx) => {
      const catKey = CATEGORY_I18N[item.category] || item.category;
      const catLabel = t(catKey);
      const glyphBadge = getVisualSymbolBadge(item.codePoint);

      rowsHtml += `
        <tr>
          <td style="text-align: center;"><span class="stego-table__index">#${idx + 1}</span></td>
          <td style="text-align: center;">${glyphBadge}</td>
          <td><code class="code-tag">${escSafe(item.hexCode)}</code></td>
          <td style="font-weight: 600; color: var(--color-on-surface);">${escSafe(item.name)}</td>
          <td><span class="steganalysis-cat-chip steganalysis-cat--${item.category}">${escSafe(catLabel)}</span></td>
          <td style="text-align: center; font-weight: 700; color: var(--color-primary);">${item.count}</td>
          <td style="text-align: center;"><span class="stego-pct-badge">${escSafe(item.percentage)}</span></td>
          <td><code class="stego-suggested-bit">${escSafe(item.suggestedBit)}</code></td>
        </tr>
      `;
    });

    return `
      <div class="stego-inventory-section">
        ${naturalAlert}
        <div class="stego-section-header">
          <div class="stego-section-header__title-wrap">
            <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 1.4rem;">dataset</span>
            <h3 class="stego-section-header__title">${t('inventoryTableTitle')}</h3>
          </div>
          <p class="stego-section-header__subtitle">${t('inventoryTableSubtitle')}</p>
        </div>

        <div class="steganalysis-table-container">
          <table class="stego-inventory-table">
            <thead>
              <tr>
                <th style="width: 50px; text-align: center;">#</th>
                <th style="width: 80px; text-align: center;">${t('inventoryColVisual')}</th>
                <th style="width: 110px;">${t('inventoryColHex')}</th>
                <th>${t('inventoryColName')}</th>
                <th style="width: 140px;">${t('inventoryColCategory')}</th>
                <th style="width: 100px; text-align: center;">${t('inventoryColCount')}</th>
                <th style="width: 100px; text-align: center;">${t('inventoryColPercentage')}</th>
                <th style="width: 160px;">${t('inventoryColSuggestedBit')}</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ── ROUTER FOR SIGNATURE VS INVENTORY RENDERING ───────────────
  function renderSignatureOrInventorySection(analysis) {
    if (!analysis) return '';
    if (analysis.matchedSignatures && analysis.matchedSignatures.length > 0) {
      return renderMatchedSignaturesSection(analysis.matchedSignatures, analysis);
    }
    return renderUniqueSymbolsInventorySection(analysis.uniqueSymbols, analysis.linguisticEval && analysis.linguisticEval.isNatural);
  }

  // ── FILE UPLOAD STATE & CONTROLLER ───────────────────────────
  let _currentSteganalysisFile = null;
  let _currentSteganalysisFileContent = null;
  let _steganalysisUploadedFileText = null;
  let _steganalysisParsedMessages = [];
  let _steganalysisDateBounds = null;
  let _steganalysisDateFrom = '';
  let _steganalysisDateTo = '';
  let _steganalysisFpFrom = null;
  let _steganalysisFpTo = null;

  function _formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function _formatDateYMD(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function _formatDateTimeYMDHM(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${hh}:${mm}`;
  }

  function _extractDateBounds(messageList) {
    if (!Array.isArray(messageList) || messageList.length === 0) {
      return null;
    }
    const validTimestamps = [];
    for (const m of messageList) {
      if (m && m.timestamp) {
        const d = parseTimestamp(m.timestamp);
        if (d && !isNaN(d.getTime())) {
          validTimestamps.push(d.getTime());
        }
      }
    }
    if (validTimestamps.length === 0) {
      return null;
    }
    const minTime = Math.min(...validTimestamps);
    const maxTime = Math.max(...validTimestamps);
    const minDate = new Date(minTime);
    const maxDate = new Date(maxTime);
    return {
      minDateStr: _formatDateYMD(minDate),
      maxDateStr: _formatDateYMD(maxDate),
      minDateTimeStr: _formatDateTimeYMDHM(minDate),
      maxDateTimeStr: _formatDateTimeYMDHM(maxDate),
      minDate,
      maxDate,
      minTime,
      maxTime,
      hasDates: true
    };
  }

  function parseTimestamp(ts) {
    if (!ts) return null;
    if (ts instanceof Date) return isNaN(ts.getTime()) ? null : ts;
    if (typeof ts === 'number') {
      const d = ts > 1e11 ? new Date(ts) : new Date(ts * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof ts !== 'string') return null;

    ts = ts.trim().replace(/^[\[\(]/, '').replace(/[\]\)]$/, '').trim();

    // 1. ISO format or YYYY-MM-DD
    const isoMatch = ts.match(/^(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([APap][Mm]))?)?/);
    if (isoMatch) {
      let [, y, m, d, hh, mm, ss, ampm] = isoMatch;
      let hour = hh ? parseInt(hh, 10) : 0;
      if (ampm) {
        if (ampm.toLowerCase() === 'pm' && hour < 12) hour += 12;
        if (ampm.toLowerCase() === 'am' && hour === 12) hour = 0;
      }
      const parsed = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), hour, mm ? parseInt(mm, 10) : 0, ss ? parseInt(ss, 10) : 0);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    // 2. Day/Month/Year or Month/Day/Year
    const dmyMatch = ts.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([APap][Mm]))?)?/);
    if (dmyMatch) {
      let [, p1, p2, yr, hh, mm, ss, ampm] = dmyMatch;
      if (yr.length === 2) yr = '20' + yr;
      let n1 = parseInt(p1, 10);
      let n2 = parseInt(p2, 10);
      let y = parseInt(yr, 10);
      let hour = hh ? parseInt(hh, 10) : 0;
      if (ampm) {
        if (ampm.toLowerCase() === 'pm' && hour < 12) hour += 12;
        if (ampm.toLowerCase() === 'am' && hour === 12) hour = 0;
      }
      const minute = mm ? parseInt(mm, 10) : 0;
      const second = ss ? parseInt(ss, 10) : 0;

      if (n1 > 12) {
        const parsed = new Date(y, n2 - 1, n1, hour, minute, second);
        if (!isNaN(parsed.getTime())) return parsed;
      } else if (n2 > 12) {
        const parsed = new Date(y, n1 - 1, n2, hour, minute, second);
        if (!isNaN(parsed.getTime())) return parsed;
      } else {
        const parsed = new Date(y, n2 - 1, n1, hour, minute, second);
        if (!isNaN(parsed.getTime())) return parsed;
      }
    }

    const fallback = new Date(ts);
    return isNaN(fallback.getTime()) ? null : fallback;
  }

  function _parseDateTimeFilterStr(str, isEnd) {
    if (!str) return null;
    str = str.trim();
    if (str.length <= 10) {
      return isEnd ? new Date(str + 'T23:59:59.999').getTime() : new Date(str + 'T00:00:00').getTime();
    }
    const norm = str.replace(' ', 'T');
    const d = new Date(norm + (norm.length <= 16 ? ':00' : ''));
    if (!isNaN(d.getTime())) return d.getTime();
    const fallback = new Date(str);
    return isNaN(fallback.getTime()) ? null : fallback.getTime();
  }

  function applySteganalysisDateFilter() {
    if (!_steganalysisParsedMessages || _steganalysisParsedMessages.length === 0) {
      return;
    }

    const totalMsgs = _steganalysisParsedMessages.length;
    let filteredList = _steganalysisParsedMessages;

    // Enforce bounds if known
    if (_steganalysisDateBounds && _steganalysisDateBounds.hasDates) {
      const minT = _steganalysisDateBounds.minTime;
      const maxT = _steganalysisDateBounds.maxTime;

      if (_steganalysisDateFrom) {
        const t = _parseDateTimeFilterStr(_steganalysisDateFrom, false);
        if (t !== null && t < minT) _steganalysisDateFrom = _steganalysisDateBounds.minDateTimeStr;
        if (t !== null && t > maxT) _steganalysisDateFrom = _steganalysisDateBounds.maxDateTimeStr;
      }
      if (_steganalysisDateTo) {
        const t = _parseDateTimeFilterStr(_steganalysisDateTo, true);
        if (t !== null && t < minT) _steganalysisDateTo = _steganalysisDateBounds.minDateTimeStr;
        if (t !== null && t > maxT) _steganalysisDateTo = _steganalysisDateBounds.maxDateTimeStr;
      }
    }

    const hasFrom = !!_steganalysisDateFrom;
    const hasTo = !!_steganalysisDateTo;

    if (hasFrom || hasTo) {
      const fromTime = hasFrom ? _parseDateTimeFilterStr(_steganalysisDateFrom, false) : -Infinity;
      const toTime = hasTo ? _parseDateTimeFilterStr(_steganalysisDateTo, true) : Infinity;

      let lastKnownTime = null;
      filteredList = _steganalysisParsedMessages.filter(m => {
        let t = m.timestamp ? parseTimestamp(m.timestamp) : null;
        if (t) {
          lastKnownTime = t.getTime();
        }
        const checkTime = t ? t.getTime() : lastKnownTime;
        if (checkTime === null) {
          return true;
        }
        return checkTime >= fromTime && checkTime <= toTime;
      });
    }

    if (filteredList.length > 0) {
      _steganalysisUploadedFileText = filteredList.map(m => m.rawText || m.cleanText || (typeof m === 'string' ? m : '')).filter(Boolean).join('\n');
    } else {
      _steganalysisUploadedFileText = '';
    }

    const statusEl = document.getElementById('steganalysis-date-filter-status');
    const countTextEl = document.getElementById('steganalysis-file-msg-count-text');
    const curLang = localStorage.getItem('stegoLang') || document.documentElement.lang || 'en';

    if (!hasFrom && !hasTo) {
      if (statusEl) {
        statusEl.textContent = t('allDates') || (curLang === 'ar' ? 'جميع الأوقات والتواريخ' : 'All dates & times');
        statusEl.className = 'badge badge--draft date-range-filter__status';
      }
      const countStr = curLang === 'ar' ? `${totalMsgs} رسالة` : `${totalMsgs} msgs`;
      if (countTextEl) countTextEl.textContent = countStr;
    } else {
      if (statusEl) {
        const parts = [];
        if (hasFrom) parts.push(_steganalysisDateFrom);
        parts.push('→');
        if (hasTo) parts.push(_steganalysisDateTo);
        statusEl.textContent = parts.join(' ');
        statusEl.className = 'badge badge--encrypted date-range-filter__status';
      }
      const countStr = curLang === 'ar'
        ? `${filteredList.length} / ${totalMsgs} رسالة`
        : `${filteredList.length} / ${totalMsgs} msgs`;
      if (countTextEl) countTextEl.textContent = countStr;
    }
  }

  function initSteganalysisDateFilter() {
    const fromInput = document.getElementById('steganalysis-date-from');
    const toInput = document.getElementById('steganalysis-date-to');
    const card = document.getElementById('steganalysis-date-filter-card');
    if (!card) return;

    if (!_steganalysisDateBounds || !_steganalysisDateBounds.hasDates) {
      card.style.display = 'none';
      return;
    }

    card.style.display = 'block';

    const minDate = _steganalysisDateBounds.minDate;
    const maxDate = _steganalysisDateBounds.maxDate;

    const curLang = localStorage.getItem('stegoLang') || document.documentElement.lang || 'en';
    const fpLocale = (curLang === 'ar' && typeof flatpickr !== 'undefined' && flatpickr.l10ns && flatpickr.l10ns.ar)
      ? flatpickr.l10ns.ar
      : { firstDayOfWeek: 0 };

    if (typeof flatpickr !== 'undefined' && fromInput && toInput) {
      if (_steganalysisFpFrom) { try { _steganalysisFpFrom.destroy(); } catch(e){} }
      if (_steganalysisFpTo) { try { _steganalysisFpTo.destroy(); } catch(e){} }

      _steganalysisFpFrom = flatpickr(fromInput, {
        enableTime: true,
        time_24hr: true,
        dateFormat: 'Y-m-d H:i',
        minDate: minDate,
        maxDate: maxDate,
        allowInput: true,
        disableMobile: true,
        locale: fpLocale,
        onChange: function(selectedDates, dateStr) {
          _steganalysisDateFrom = dateStr;
          if (_steganalysisFpTo && selectedDates.length > 0) {
            _steganalysisFpTo.set('minDate', selectedDates[0]);
          }
          _updateSteganalysisPresetActive(null);
          applySteganalysisDateFilter();
        }
      });

      _steganalysisFpTo = flatpickr(toInput, {
        enableTime: true,
        time_24hr: true,
        dateFormat: 'Y-m-d H:i',
        minDate: minDate,
        maxDate: maxDate,
        allowInput: true,
        disableMobile: true,
        locale: fpLocale,
        onChange: function(selectedDates, dateStr) {
          _steganalysisDateTo = dateStr;
          if (_steganalysisFpFrom && selectedDates.length > 0) {
            _steganalysisFpFrom.set('maxDate', selectedDates[0]);
          }
          _updateSteganalysisPresetActive(null);
          applySteganalysisDateFilter();
        }
      });
    } else {
      if (fromInput) {
        fromInput.oninput = (e) => {
          _steganalysisDateFrom = e.target.value;
          _updateSteganalysisPresetActive(null);
          applySteganalysisDateFilter();
        };
      }
      if (toInput) {
        toInput.oninput = (e) => {
          _steganalysisDateTo = e.target.value;
          _updateSteganalysisPresetActive(null);
          applySteganalysisDateFilter();
        };
      }
    }

    const presetBtns = card.querySelectorAll('.date-preset-btn');
    presetBtns.forEach(btn => {
      btn.onclick = () => {
        const preset = btn.dataset.preset;
        _applySteganalysisPreset(preset);
      };
    });
  }

  function _updateSteganalysisPresetActive(activePreset) {
    const card = document.getElementById('steganalysis-date-filter-card');
    if (!card) return;
    card.querySelectorAll('.date-preset-btn').forEach(btn => {
      if (activePreset && btn.dataset.preset === activePreset) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function _applySteganalysisPreset(preset) {
    if (!_steganalysisDateBounds || !_steganalysisDateBounds.hasDates) return;

    const fromInput = document.getElementById('steganalysis-date-from');
    const toInput = document.getElementById('steganalysis-date-to');
    const minDate = _steganalysisDateBounds.minDate;
    const maxDate = _steganalysisDateBounds.maxDate;

    let fromStr = '';
    let toStr = '';

    if (preset === 'today') {
      fromStr = _formatDateYMD(maxDate) + ' 00:00';
      toStr = _formatDateTimeYMDHM(maxDate);
    } else if (preset === '7days') {
      toStr = _formatDateTimeYMDHM(maxDate);
      const d = new Date(maxDate);
      d.setDate(d.getDate() - 7);
      fromStr = _formatDateTimeYMDHM(d < minDate ? minDate : d);
    } else if (preset === '30days') {
      toStr = _formatDateTimeYMDHM(maxDate);
      const d = new Date(maxDate);
      d.setDate(d.getDate() - 30);
      fromStr = _formatDateTimeYMDHM(d < minDate ? minDate : d);
    } else if (preset === 'year') {
      toStr = _formatDateTimeYMDHM(maxDate);
      const yearStart = new Date(maxDate.getFullYear(), 0, 1, 0, 0, 0);
      fromStr = _formatDateTimeYMDHM(yearStart < minDate ? minDate : yearStart);
    } else if (preset === 'reset') {
      fromStr = '';
      toStr = '';
    }

    _steganalysisDateFrom = fromStr;
    _steganalysisDateTo = toStr;

    if (_steganalysisFpFrom) {
      _steganalysisFpFrom.set('minDate', minDate);
      _steganalysisFpFrom.set('maxDate', toStr ? _parseDateTimeFilterStr(toStr, true) : maxDate);
      _steganalysisFpFrom.setDate(fromStr, false);
    } else if (fromInput) {
      fromInput.value = fromStr;
    }

    if (_steganalysisFpTo) {
      _steganalysisFpTo.set('minDate', fromStr ? _parseDateTimeFilterStr(fromStr, false) : minDate);
      _steganalysisFpTo.set('maxDate', maxDate);
      _steganalysisFpTo.setDate(toStr, false);
    } else if (toInput) {
      toInput.value = toStr;
    }

    _updateSteganalysisPresetActive(preset === 'reset' ? null : preset);
    applySteganalysisDateFilter();
  }

  async function handleSteganalysisFileUpload(files) {
    if (!files || files.length === 0) return;
    const file = files[0];
    _currentSteganalysisFile = file;

    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'zip') {
      const reader = new FileReader();
      reader.onload = async function(e) {
        const buffer = e.target.result;
        _currentSteganalysisFileContent = buffer;
        if (window.ChatParsers && typeof window.ChatParsers.parseZipArchive === 'function') {
          const extracted = await window.ChatParsers.parseZipArchive(buffer);
          if (extracted && extracted.length > 0) {
            _parseAndApplySteganalysisFile(file, extracted[0].text);
          } else {
            if (typeof showToast === 'function') {
              showToast('⚠ ' + (t('noZipFiles') || 'No readable text/chat files found inside the ZIP.'));
            }
          }
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = function(e) {
        const text = e.target.result;
        _currentSteganalysisFileContent = text;
        _parseAndApplySteganalysisFile(file, text);
      };
      reader.readAsText(file, 'utf-8');
    }
  }

  function splitChatIntoMessages(rawText) {
    if (!rawText) return [];
    rawText = (rawText || '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    if (!rawText) return [];

    if (window.ChatParsers) {
      const P = window.ChatParsers;
      try {
        const wa = P.parseWhatsAppTxt(rawText);
        if (wa && Array.isArray(wa.messages) && wa.messages.length > 1) {
          return wa.messages.map((m, idx) => ({
            index: idx + 1,
            lineNumber: m.lineNumber || (idx + 1),
            sender: m.sender || null,
            timestamp: m.timestamp || null,
            rawText: m.rawText || m.cleanText || '',
            cleanText: m.cleanText || m.rawText || ''
          }));
        }

        const gen = P.parseGenericTxt(rawText);
        if (gen && Array.isArray(gen.messages) && gen.messages.length > 1) {
          return gen.messages.map((m, idx) => ({
            index: idx + 1,
            lineNumber: m.lineNumber || (idx + 1),
            sender: m.sender || null,
            timestamp: m.timestamp || null,
            rawText: m.rawText || m.cleanText || '',
            cleanText: m.cleanText || m.rawText || ''
          }));
        }
      } catch (err) {
        console.warn('Error running ChatParsers:', err);
      }
    }

    // Generic multi-line fallback: split lines
    const lines = rawText.split('\n');
    if (lines.length > 1) {
      const msgs = [];
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.length > 0) {
          let sender = null;
          let body = line;
          const colonMatch = line.match(/^[\u200E\u200F\s]*([A-Za-z\u0600-\u06FF0-9_\-\s]{1,30}):\s*([\s\S]*)$/);
          if (colonMatch && !colonMatch[1].startsWith('http')) {
            sender = colonMatch[1].trim();
            body = colonMatch[2];
          }

          msgs.push({
            index: msgs.length + 1,
            lineNumber: idx + 1,
            sender: sender,
            timestamp: null,
            rawText: body || line,
            cleanText: body || line
          });
        }
      });
      if (msgs.length > 1) return msgs;
    }

    return [{
      index: 1,
      lineNumber: 1,
      sender: null,
      timestamp: null,
      rawText: rawText,
      cleanText: rawText
    }];
  }

  function _parseAndApplySteganalysisFile(file, rawText) {
    rawText = (rawText || '').replace(/^\uFEFF/, '').replace(/\r/g, '');
    const ext = file.name.split('.').pop().toLowerCase();
    let messageList = [];
    let formattedChatText = '';

    if (window.ChatParsers) {
      const P = window.ChatParsers;
      try {
        if (ext === 'json') {
          let parsed = P.parseTelegramJson(rawText);
          if (!parsed || !parsed.messages || parsed.messages.length === 0) parsed = P.parseMetaJson(rawText);
          if (!parsed || !parsed.messages || parsed.messages.length === 0) parsed = P.parseGenericJson(rawText);
          if (parsed && Array.isArray(parsed.messages)) messageList = parsed.messages;
        } else if (ext === 'csv') {
          const parsed = P.parseGenericCsv(rawText);
          if (parsed && Array.isArray(parsed.messages)) messageList = parsed.messages;
        } else if (ext === 'html' || ext === 'htm') {
          const parsed = P.parseGenericHtml(rawText);
          if (parsed && Array.isArray(parsed.messages)) messageList = parsed.messages;
        } else {
          // .txt or generic file: run splitChatIntoMessages
          messageList = splitChatIntoMessages(rawText);
        }
      } catch (err) {
        console.warn('Parser error in _parseAndApplySteganalysisFile:', err);
      }
    }

    if (!messageList || messageList.length === 0) {
      messageList = splitChatIntoMessages(rawText);
    }

    _steganalysisParsedMessages = messageList;

    if (messageList.length > 0) {
      formattedChatText = messageList.map(m => m.rawText || m.cleanText || (typeof m === 'string' ? m : '')).filter(Boolean).join('\n');
    } else {
      formattedChatText = (rawText || '').trim();
    }

    _steganalysisUploadedFileText = formattedChatText;

    const msgCount = messageList.length > 0 ? messageList.length : formattedChatText.split('\n').filter(l => l.trim().length > 0).length;

    const promptEl = document.getElementById('steganalysis-dropzone-prompt');
    const infoBar = document.getElementById('steganalysis-file-info-bar');
    const dropzone = document.getElementById('steganalysis-file-dropzone');
    const dateFilterCard = document.getElementById('steganalysis-date-filter-card');

    if (promptEl) promptEl.style.display = 'none';
    if (infoBar) infoBar.style.display = 'flex';
    if (dropzone) dropzone.classList.add('has-file');

    const nameDisplay = document.getElementById('steganalysis-file-name-display');
    const sizeDisplay = document.getElementById('steganalysis-file-size-display');
    const countTextEl = document.getElementById('steganalysis-file-msg-count-text');

    if (nameDisplay) nameDisplay.textContent = file.name;
    if (sizeDisplay) sizeDisplay.textContent = `(${_formatBytes(file.size)})`;

    const curLang = localStorage.getItem('stegoLang') || document.documentElement.lang || 'en';
    const countStr = curLang === 'ar' ? `${msgCount} رسالة` : `${msgCount} msgs`;
    if (countTextEl) countTextEl.textContent = countStr;

    // Calculate date bounds from parsed messages
    _steganalysisDateBounds = _extractDateBounds(messageList);

    // Show and initialize Date Range Filter card ONLY if valid dates exist in the chat
    if (dateFilterCard) {
      if (_steganalysisDateBounds && _steganalysisDateBounds.hasDates) {
        dateFilterCard.style.display = 'block';
        _steganalysisDateFrom = '';
        _steganalysisDateTo = '';
        initSteganalysisDateFilter();
        _applySteganalysisPreset('reset');
      } else {
        dateFilterCard.style.display = 'none';
        _steganalysisDateFrom = '';
        _steganalysisDateTo = '';
      }
    }

    if (typeof showToast === 'function') {
      showToast('✅ ' + (t('fileLoadedToast') || 'Chat file loaded and parsed successfully!'));
    }
  }

  function removeSteganalysisFile(e) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    _currentSteganalysisFile = null;
    _currentSteganalysisFileContent = null;
    _steganalysisUploadedFileText = null;
    _steganalysisParsedMessages = [];
    _steganalysisDateBounds = null;
    _steganalysisDateFrom = '';
    _steganalysisDateTo = '';

    const fileInput = document.getElementById('steganalysis-file-input');
    if (fileInput) fileInput.value = '';

    const promptEl = document.getElementById('steganalysis-dropzone-prompt');
    const infoBar = document.getElementById('steganalysis-file-info-bar');
    const dropzone = document.getElementById('steganalysis-file-dropzone');
    const dateFilterCard = document.getElementById('steganalysis-date-filter-card');

    if (infoBar) infoBar.style.display = 'none';
    if (promptEl) promptEl.style.display = 'flex';
    if (dropzone) dropzone.classList.remove('has-file');

    if (dateFilterCard) {
      dateFilterCard.style.display = 'none';
      const fromInput = document.getElementById('steganalysis-date-from');
      const toInput = document.getElementById('steganalysis-date-to');
      if (fromInput) fromInput.value = '';
      if (toInput) toInput.value = '';
      if (_steganalysisFpFrom) { try { _steganalysisFpFrom.clear(); } catch(e){} }
      if (_steganalysisFpTo) { try { _steganalysisFpTo.clear(); } catch(e){} }
    }
  }

  // ── UI CONTROLLER & RENDERING ───────────────────────────────
  function initSteganalysis() {
    const analyzeBtn = document.getElementById('steganalysis-btn');
    const textInput = document.getElementById('steganalysisInput');
    const resultsPanel = document.getElementById('steganalysis-results-panel');
    const dropzone = document.getElementById('steganalysis-file-dropzone');
    const fileInput = document.getElementById('steganalysis-file-input');
    const removeBtn = document.getElementById('steganalysis-btn-remove-file');

    // Setup Dropzone Event Handlers
    if (dropzone && fileInput) {
      dropzone.addEventListener('click', (e) => {
        if (e.target.closest('#steganalysis-btn-remove-file')) return;
        fileInput.click();
      });

      dropzone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          fileInput.click();
        }
      });

      fileInput.addEventListener('change', (e) => {
        handleSteganalysisFileUpload(e.target.files);
      });

      ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('dragover');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('dragover');
        });
      });

      dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt ? dt.files : null;
        if (files && files.length > 0) {
          handleSteganalysisFileUpload(files);
        }
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener('click', removeSteganalysisFile);
    }

    if (!analyzeBtn) return;

    analyzeBtn.addEventListener('click', function () {
      let text = '';
      const hasFile = _steganalysisUploadedFileText && _steganalysisUploadedFileText.trim().length > 0;
      const hasText = textInput && textInput.value && textInput.value.trim().length > 0;

      if (hasFile) {
        text = _steganalysisUploadedFileText;
        if (!_steganalysisParsedMessages || _steganalysisParsedMessages.length <= 1) {
          _steganalysisParsedMessages = splitChatIntoMessages(text);
        }
      } else if (hasText) {
        text = textInput.value;
        _steganalysisParsedMessages = splitChatIntoMessages(text);
      }

      if (!text || text.trim().length === 0) {
        if (typeof showToast === 'function') {
          showToast('⚠ ' + t('steganalysisEmptyInput'));
        }
        return;
      }

      if (!hasFile && textInput && typeof validateEmojiInputs === 'function') {
        const emojiError = validateEmojiInputs([
          { el: textInput, name: { en: "Input Text", ar: "النص المدخل" } }
        ]);
        if (emojiError) return;
      }

      analyzeBtn.disabled = true;
      analyzeBtn.innerHTML = `
        <span class="material-symbols-outlined btn-spinner">progress_activity</span>
        <span>${t('steganalysisAnalyzing')}</span>
      `;

      setTimeout(() => {
        currentAnalysis = analyzeText(text);
        currentPage = 1;
        const risk = classifyRisk(currentAnalysis.totalFound, currentAnalysis.linguisticEval);

        if (resultsPanel) resultsPanel.style.display = '';

        renderMetrics(currentAnalysis, risk);

        if (currentAnalysis.totalFound === 0) {
          renderCleanState();
        } else {
          renderResultsTable(currentAnalysis);
          renderSummary(currentAnalysis, risk);
        }

        // Store result for Simplified Report Page
        try {
          // Identify suspect messages (only messages containing stego characters)
          let suspectMessages = [];
          if (_steganalysisParsedMessages && _steganalysisParsedMessages.length > 0) {
            _steganalysisParsedMessages.forEach((msg, idx) => {
              const msgText = msg.rawText || msg.cleanText || (typeof msg === 'string' ? msg : '');
              const msgAnalysis = analyzeText(msgText);
              if (msgAnalysis.totalFound > 0) {
                suspectMessages.push({
                  index: idx + 1,
                  sender: msg.sender || (_currentSteganalysisFile ? _currentSteganalysisFile.name : `Participant #${idx+1}`),
                  timestamp: msg.timestamp || new Date().toLocaleString(),
                  rawText: msgText,
                  totalFound: msgAnalysis.totalFound,
                  techniques: msgAnalysis.techniques,
                  results: msgAnalysis.results,
                  sanitizedText: (function() {
                    if (window.StegSanitize && typeof window.StegSanitize.sanitizeText === 'function') {
                      return window.StegSanitize.sanitizeText(msgText).sanitizedText;
                    }
                    return msgText.replace(/[\u{200B}-\u{200F}\u{202A}-\u{202E}\u{FE00}-\u{FE0F}\u{E0100}-\u{E01EF}]/gu, '');
                  })()
                });
              }
            });
          }

          const cleanWholeText = (function() {
            if (window.StegSanitize && typeof window.StegSanitize.sanitizeText === 'function') {
              return window.StegSanitize.sanitizeText(text).sanitizedText;
            }
            return text.replace(/[\u{200B}-\u{200F}\u{202A}-\u{202E}\u{FE00}-\u{FE0F}\u{E0100}-\u{E01EF}]/gu, '');
          })();

          const simplifiedPayload = {
            inputText: text,
            totalFound: currentAnalysis.totalFound,
            distinctTypes: currentAnalysis.distinctTypes,
            computationTimeMs: currentAnalysis.computationTimeMs,
            techniques: currentAnalysis.techniques,
            linguisticEval: currentAnalysis.linguisticEval,
            matchedSignatures: currentAnalysis.matchedSignatures,
            uniqueSymbols: currentAnalysis.uniqueSymbols,
            rawSymbolsString: currentAnalysis.results.map(r => String.fromCodePoint(r.codePoint)).join(''),
            sanitizedText: cleanWholeText,
            totalConversationCount: _steganalysisParsedMessages ? _steganalysisParsedMessages.length : 1,
            suspectMessages: suspectMessages,
            metadata: {
              sender: (_currentSteganalysisFile ? _currentSteganalysisFile.name : null),
              timestamp: (_steganalysisDateFrom ? `${_steganalysisDateFrom} - ${_steganalysisDateTo}` : new Date().toLocaleString())
            },
            results: currentAnalysis.results
          };
          localStorage.setItem('stegoSimplifiedResult', JSON.stringify(simplifiedPayload));
        } catch (storageErr) {
          console.warn('Failed to save stegoSimplifiedResult to localStorage:', storageErr);
        }

        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = `
          <span class="material-symbols-outlined" style="font-size:18px">search_insights</span>
          <span data-i18n="btnAnalyzeText">${t('btnAnalyzeText')}</span>
        `;

        if (typeof showToast === 'function') {
          showToast('✅ ' + t('steganalysisCompleted'));
        }
        if (resultsPanel && typeof resultsPanel.scrollIntoView === 'function') {
          setTimeout(() => {
            resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      }, 50);
    });
  }

  function t(key) {
    const lang = localStorage.getItem('stegoLang') || document.documentElement.lang || 'en';
    if (window.translations && window.translations[lang] && window.translations[lang][key]) {
      return window.translations[lang][key];
    }
    if (typeof I18N_STEGANALYSIS !== 'undefined') {
      if (I18N_STEGANALYSIS[lang] && I18N_STEGANALYSIS[lang][key]) return I18N_STEGANALYSIS[lang][key];
      if (I18N_STEGANALYSIS['en'] && I18N_STEGANALYSIS['en'][key]) return I18N_STEGANALYSIS['en'][key];
    }
    if (typeof I18N_COMMON !== 'undefined') {
      if (I18N_COMMON[lang] && I18N_COMMON[lang][key]) return I18N_COMMON[lang][key];
      if (I18N_COMMON['en'] && I18N_COMMON['en'][key]) return I18N_COMMON['en'][key];
    }
    return key;
  }

  function renderMetrics(analysis, risk) {
    const totalEl = document.getElementById('steganalysisTotalVal');
    if (totalEl) {
      totalEl.textContent = analysis.totalFound;
      if (typeof animateCounter === 'function' && analysis.totalFound > 0) {
        animateCounter(totalEl, analysis.totalFound, '', 600);
      }
    }

    const typesEl = document.getElementById('steganalysisTypesVal');
    if (typesEl) {
      typesEl.textContent = analysis.distinctTypes;
      if (typeof animateCounter === 'function' && analysis.distinctTypes > 0) {
        animateCounter(typesEl, analysis.distinctTypes, '', 600);
      }
    }

    const timeEl = document.getElementById('steganalysisTimeVal');
    if (timeEl) {
      timeEl.textContent = analysis.computationTimeMs + ' ms';
    }
  }

  function renderCleanState() {
    const container = document.getElementById('steganalysisResultsBody');
    if (!container) return;

    container.innerHTML = `
      <div class="steganalysis-clean-state">
        <div class="steganalysis-clean-state__icon">
          <span class="material-symbols-outlined">shield_with_heart</span>
        </div>
        <h3 class="steganalysis-clean-state__title" data-i18n="steganalysisCleanTitle">${t('steganalysisCleanTitle')}</h3>
        <p class="steganalysis-clean-state__subtitle" data-i18n="steganalysisCleanSubtitle">${t('steganalysisCleanSubtitle')}</p>
      </div>
    `;
  }

  function renderTechniquesBanner(analysis) {
    if (!analysis.techniques || analysis.techniques.length === 0) return '';

    let badgesHtml = '';
    analysis.techniques.forEach(tech => {
      badgesHtml += `
        <div class="technique-badge technique-badge--${tech.id}">
          <span class="material-symbols-outlined" style="font-size: 16px;">psychology</span>
          <span>${t(tech.nameKey)}</span>
          <span class="technique-badge__count">${tech.count}</span>
        </div>
      `;
    });

    return `
      <div class="steganography-techniques-banner">
        <div class="steganography-techniques-banner__title">
          <span class="material-symbols-outlined" style="color: var(--color-primary);">hub</span>
          <span>${t('techniqueTitle')}</span>
        </div>
        <div class="steganography-techniques-banner__list">
          ${badgesHtml}
        </div>
      </div>
    `;
  }

  function renderVisualMap(inputText, analysis) {
    if (!inputText) return '';
    const chars = [...inputText];
    const n = chars.length;

    const resultsMap = new Map();
    analysis.results.forEach(r => {
      resultsMap.set(r.position, r);
    });

    const hiddenClusters = new Map();
    let currentCluster = [];
    for (let i = 0; i <= n; i++) {
      if (i < n && resultsMap.has(i)) {
        currentCluster.push(resultsMap.get(i));
      } else {
        if (currentCluster.length > 0) {
          hiddenClusters.set(i, currentCluster);
          currentCluster = [];
        }
      }
    }

    let html = '';
    const maxPreviewChars = 300000;
    const limit = Math.min(n, maxPreviewChars);

    for (let i = 0; i < limit; i++) {
      const char = chars[i];
      const resultItem = resultsMap.get(i);

      if (resultItem && resultItem.category === 'homograph') {
        const tooltipText = `${resultItem.name} (${resultItem.hexCode})`;
        html += `<span class="visual-underscore underscore--warning" title="${escSafe(tooltipText)}">${escSafe(char)}</span>`;
        continue;
      }

      if (resultsMap.has(i)) {
        continue;
      }

      let charHtml = '';
      if (char === '\n') {
        charHtml = '<br>';
      } else if (char === '\r') {
        continue;
      } else if (char === ' ') {
        charHtml = ' ';
      } else {
        charHtml = escSafe(char);
      }

      if (hiddenClusters.has(i)) {
        const cluster = hiddenClusters.get(i);
        const count = cluster.length;
        const clusterJson = encodeURIComponent(JSON.stringify(cluster.map(c => ({ name: c.name, hexCode: c.hexCode }))));

        let statusClass = 'underscore--stego';
        if (cluster.some(item => item.category === 'directional' || item.category === 'bom')) {
          statusClass = 'underscore--error';
        } else if (cluster.some(item => item.category === 'space' || item.category === 'mongolianFVS' || item.category === 'homograph')) {
          statusClass = 'underscore--warning';
        }

        charHtml = `<span class="visual-underscore ${statusClass}" data-stego-cluster="${clusterJson}">${charHtml}<span class="stego-visual-badge">${count}</span></span>`;
      }

      html += charHtml;
    }

    if (hiddenClusters.has(n)) {
      const cluster = hiddenClusters.get(n);
      const count = cluster.length;
      const clusterJson = encodeURIComponent(JSON.stringify(cluster.map(c => ({ name: c.name, hexCode: c.hexCode }))));

      let statusClass = 'underscore--stego';
      if (cluster.some(item => item.category === 'directional' || item.category === 'bom')) {
        statusClass = 'underscore--error';
      } else if (cluster.some(item => item.category === 'space' || item.category === 'mongolianFVS' || item.category === 'homograph')) {
        statusClass = 'underscore--warning';
      }

      html += `<span class="visual-underscore ${statusClass}" data-stego-cluster="${clusterJson}">&nbsp;<span class="stego-visual-badge">${count}</span></span>`;
    }

    if (n > maxPreviewChars) {
      html += `<div style="margin-top: var(--space-sm); font-style: italic; opacity: 0.5; font-size: 0.75rem;">... [Text truncated for performance]</div>`;
    }

    return html;
  }

  // ── RENDER HORIZONTAL THREAT METER ─────────────────────────────
  function renderHorizontalThreatMeter(analysis, risk) {
    let confidencePct = 0;
    let verdictLabel = t('riskClean');
    let verdictColor = '#4CAF50';

    if (analysis.linguisticEval && analysis.linguisticEval.isNatural) {
      confidencePct = 15;
      verdictLabel = t('riskLow');
      verdictColor = '#E6A817';
    } else if (analysis.totalFound > 0) {
      if (analysis.matchedSignatures && analysis.matchedSignatures.length > 0) {
        confidencePct = 99;
      } else if (analysis.totalFound > 20) {
        confidencePct = 95;
      } else if (analysis.totalFound > 5) {
        confidencePct = 85;
      } else {
        confidencePct = 65;
      }

      if (confidencePct > 70) {
        verdictLabel = t('riskCritical') || 'Critical Risk';
        verdictColor = '#B3261E';
      } else {
        verdictLabel = t('riskMedium') || 'Suspicious Activity';
        verdictColor = '#E6A817';
      }
    }

    const curLang = localStorage.getItem('stegoLang') || document.documentElement.lang || 'en';
    const totalFoundText = curLang === 'ar' ? `${analysis.totalFound} رمز مكتشف` : `${analysis.totalFound} symbols detected`;

    return `
      <div class="threat-meter-horizontal">
        <div class="threat-meter-header">
          <div class="threat-meter-title-wrap">
            <span class="material-symbols-outlined" style="color: ${verdictColor}; font-size: 22px;">speed</span>
            <span>${t('threatMeterLabel')}</span>
          </div>
          <div class="threat-meter-score-wrap">
            <span class="text-body-xs" style="color: var(--color-on-surface-variant); font-weight: 600;">${totalFoundText}</span>
            <span class="threat-meter-score-badge" style="background: ${verdictColor}22; color: ${verdictColor}; border: 1px solid ${verdictColor}55;">
              ${confidencePct}% • ${verdictLabel}
            </span>
          </div>
        </div>
        <div class="threat-meter-track">
          <div class="threat-meter-fill" id="horizontalThreatFill" style="width: 0%; background: ${verdictColor};"></div>
        </div>
        <div class="threat-meter-ticks">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>
    `;
  }

  // ── RENDER DUAL SHA-256 HASH CONSOLE (PER SUSPECT MESSAGE) ───
  function renderDualHashConsole(cleanText, rawStegoText, sIdx) {
    const curLang = localStorage.getItem('stegoLang') || document.documentElement.lang || 'en';
    const copyHint = curLang === 'ar' ? 'انقر للنسخ' : 'Click to copy';

    return `
      <div class="hash-console-block hash-console-block--card">
        <div class="hash-console-toolbar">
          <div class="hash-console-toolbar__title">
            <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 16px;">fingerprint</span>
            <span>${t('hashBlockTitle')}</span>
          </div>
        </div>
        <div class="hash-console-body">
          <div class="hash-console-grid">
            <!-- Column 1: Clean Cover Hash Tile -->
            <div class="hash-tile hash-tile--clean btn-copy-card-clean-hash" data-idx="${sIdx}" role="button" tabindex="0" title="${copyHint}">
              <div class="hash-tile__header">
                <div class="hash-tile__label hash-tile__label--clean">
                  <span class="material-symbols-outlined" style="font-size: 15px;">verified</span>
                  <span>${t('hashCleanLabel')}</span>
                </div>
                <span class="hash-tile__hint">
                  <span class="material-symbols-outlined" style="font-size: 13px;">content_copy</span>
                  <span>${copyHint}</span>
                </span>
              </div>
              <code class="hash-tile__code" id="stego-clean-hash-${sIdx}">Computing SHA-256...</code>
            </div>

            <!-- Column 2: Stego Cover Hash Tile -->
            <div class="hash-tile hash-tile--stego btn-copy-card-stego-hash" data-idx="${sIdx}" role="button" tabindex="0" title="${copyHint}">
              <div class="hash-tile__header">
                <div class="hash-tile__label hash-tile__label--stego">
                  <span class="material-symbols-outlined" style="font-size: 15px;">lock_clock</span>
                  <span>${t('hashStegoLabel')}</span>
                </div>
                <span class="hash-tile__hint">
                  <span class="material-symbols-outlined" style="font-size: 13px;">content_copy</span>
                  <span>${copyHint}</span>
                </span>
              </div>
              <code class="hash-tile__code" id="stego-stego-hash-${sIdx}">Computing SHA-256...</code>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ── TRIGGER ASYNC SHA-256 CALCULATION FOR A SPECIFIC SUSPECT CARD ─
  async function computeAndFillCardHashes(cleanText, rawStegoText, sIdx) {
    const cleanEl = document.getElementById(`stego-clean-hash-${sIdx}`);
    const stegoEl = document.getElementById(`stego-stego-hash-${sIdx}`);
    if (!cleanEl || !stegoEl) return;

    try {
      if (typeof sha256 === 'function') {
        const cleanHash = await sha256(cleanText);
        const stegoHash = await sha256(rawStegoText);
        cleanEl.textContent = cleanHash;
        stegoEl.textContent = stegoHash;
      } else {
        cleanEl.textContent = '(sha256 unavailable)';
        stegoEl.textContent = '(sha256 unavailable)';
      }
    } catch (err) {
      console.warn('Error calculating hashes for suspect card', sIdx, err);
      cleanEl.textContent = 'Hash error';
      stegoEl.textContent = 'Hash error';
    }
  }

  // ── MAIN RESULTS TABLE OVERHAUL (SUSPECT MESSAGES ONLY) ────────
  function renderResultsTable(analysis) {
    const container = document.getElementById('steganalysisResultsBody');
    if (!container) return;

    const curLang = localStorage.getItem('stegoLang') || document.documentElement.lang || 'en';

    // 1. Determine Suspect Messages (Only messages that contain steganography)
    let suspectMessages = [];
    if (_steganalysisParsedMessages && _steganalysisParsedMessages.length > 0) {
      _steganalysisParsedMessages.forEach((msg, idx) => {
        const rawContent = msg.rawText || msg.cleanText || (typeof msg === 'string' ? msg : '');
        const msgAnalysis = analyzeText(rawContent);
        if (msgAnalysis.totalFound > 0) {
          suspectMessages.push({
            index: idx + 1,
            lineNumber: msg.lineNumber || (idx + 1),
            sender: msg.sender || (_currentSteganalysisFile ? _currentSteganalysisFile.name : null),
            timestamp: msg.timestamp || '',
            rawText: rawContent,
            analysis: msgAnalysis,
            sanitizedText: (function() {
              if (window.StegSanitize && typeof window.StegSanitize.sanitizeText === 'function') {
                return window.StegSanitize.sanitizeText(rawContent).sanitizedText;
              }
              return rawContent.replace(/[\u{200B}-\u{200F}\u{202A}-\u{202E}\u{FE00}-\u{FE0F}\u{E0100}-\u{E01EF}]/gu, '');
            })()
          });
        }
      });
    }

    // If direct text input without multiple chat messages, treat as a single suspect item if it has hidden characters
    if (suspectMessages.length === 0 && analysis.totalFound > 0) {
      suspectMessages.push({
        index: 1,
        lineNumber: 1,
        sender: null,
        timestamp: '',
        rawText: analysis.inputText,
        analysis: analysis,
        sanitizedText: (function() {
          if (window.StegSanitize && typeof window.StegSanitize.sanitizeText === 'function') {
            return window.StegSanitize.sanitizeText(analysis.inputText).sanitizedText;
          }
          return analysis.inputText.replace(/[\u{200B}-\u{200F}\u{202A}-\u{202E}\u{FE00}-\u{FE0F}\u{E0100}-\u{E01EF}]/gu, '');
        })()
      });
    }

    // If no suspect messages found at all, render clean state
    if (suspectMessages.length === 0) {
      renderCleanState();
      return;
    }

    // 2. Build Top Components (Horizontal Threat Meter ONLY - No global hash box)
    const threatMeterHtml = renderHorizontalThreatMeter(analysis, classifyRisk(analysis.totalFound, analysis.linguisticEval));

    // 3. Build Suspect Messages Cards (Scanner-like output with embedded hash & hex)
    let suspectCardsHtml = '';
    suspectMessages.forEach((msg, sIdx) => {
      const msgAnalysis = msg.analysis;
      const hexList = msgAnalysis.results.map(r => r.hexCode).join(' ');

      // Visual diff for this message only
      const msgVisualDiff = renderVisualMap(msg.rawText, msgAnalysis);

      // Dual Hash Console for this message only
      const msgDualHashHtml = renderDualHashConsole(msg.sanitizedText, msg.rawText, sIdx);

      // Collapsible matching section for this message
      const msgMatchingSection = renderSignatureOrInventorySection(msgAnalysis);

      const senderSpan = msg.sender ? `<span class="suspect-sender">${escSafe(msg.sender)}</span>` : '';
      const timeSpan = msg.timestamp ? `<span class="suspect-time"><span class="material-symbols-outlined" style="font-size:13px;">schedule</span>${escSafe(msg.timestamp)}</span>` : '';
      const lineSpan = msg.lineNumber ? `<span class="suspect-line-badge">L${msg.lineNumber}</span>` : '';

      suspectCardsHtml += `
        <div class="suspect-message-card" id="suspect-msg-${sIdx}">
          <!-- Header (Scanner Style) -->
          <div class="suspect-message-header">
            <div class="suspect-message-meta">
              <span class="suspect-idx-badge">#${msg.index}</span>
              ${lineSpan}
              ${senderSpan}
              ${timeSpan}
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="suspect-stego-badge">
                <span class="material-symbols-outlined" style="font-size:14px; vertical-align:middle;">warning</span>
                ${msgAnalysis.totalFound} ${curLang === 'ar' ? 'رمز مخفي' : 'hidden symbols'}
              </span>
            </div>
          </div>

          <!-- Visual Diff Mapped Body for this message only -->
          <div class="suspect-message-body" dir="auto">
            ${msgVisualDiff}
          </div>

          <!-- Dual SHA-256 Hash Console for this message only -->
          ${msgDualHashHtml}

          <!-- Hexadecimal Sequence String Box with Single-Row Hover Actions Toolbar -->
          <div class="stego-hex-box" id="stego-hex-${sIdx}">
            <div class="stego-hex-header">
              <div class="stego-hex-header__title">
                <span class="material-symbols-outlined" style="font-size: 16px; color: var(--color-primary);">terminal</span>
                <span>${t('hexSequenceTitle') || 'Extracted Hexadecimal Sequence'}</span>
              </div>
            </div>
            <div class="stego-hex-wrapper">
              <div class="stego-hex-content">
                <code>${escSafe(hexList)}</code>
              </div>
              <div class="stego-hex-hover-toolbar">
                <button type="button" class="btn-action-secondary btn-copy-suspect-hex" data-idx="${sIdx}" title="${curLang === 'ar' ? 'نسخ سلسلة الأكواد السداسية' : 'Copy Hexadecimal Sequence'}">
                  <span class="material-symbols-outlined" style="font-size: 14px;">terminal</span>
                  <span>${t('btnCopyHexSequence') || 'Copy Sequence'}</span>
                </button>
                <button type="button" class="btn-action-secondary btn-copy-suspect-clean" data-idx="${sIdx}" title="${curLang === 'ar' ? 'نسخ الرسالة بعد تنظيفها' : 'Copy Clean Sanitized Message'}">
                  <span class="material-symbols-outlined" style="font-size: 14px;">cleaning_services</span>
                  <span>${t('btnCopyMessageClean') || 'Copy Clean Message'}</span>
                </button>
                <button type="button" class="btn-action-secondary btn-copy-suspect-stego" data-idx="${sIdx}" title="${curLang === 'ar' ? 'نسخ الرسالة مع أحرف الإخفاء' : 'Copy Raw Stego Message'}">
                  <span class="material-symbols-outlined" style="font-size: 14px;">lock_open</span>
                  <span>${t('btnCopyMessageStego') || 'Copy Stego Message'}</span>
                </button>
                <button type="button" class="btn-action-secondary btn-copy-suspect-symbols" data-idx="${sIdx}" title="${curLang === 'ar' ? 'نسخ الرموز المخفية فقط' : 'Copy Covert Symbols Only'}">
                  <span class="material-symbols-outlined" style="font-size: 14px;">data_object</span>
                  <span>${t('btnCopyMessageSymbols') || 'Copy Symbols'}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Collapsible Matching Table Dropdown (Only appears when clicked) -->
          <details class="stego-matching-details">
            <summary>
              <div style="display:flex; align-items:center; gap:6px;">
                <span class="material-symbols-outlined" style="color:var(--color-primary); font-size:17px;">table_chart</span>
                <span>${t('matchingDropdownTitle')}</span>
              </div>
              <span class="material-symbols-outlined details-chevron" style="font-size:18px;">expand_more</span>
            </summary>
            <div class="stego-matching-details__body">
              ${msgMatchingSection}
            </div>
          </details>
        </div>
      `;
    });

    const totalMsgsCount = _steganalysisParsedMessages && _steganalysisParsedMessages.length > 0 ? _steganalysisParsedMessages.length : 1;
    const filterBannerText = totalMsgsCount > 1
      ? (t('chatFilterBannerFound') || `Steganography detected in {stegoCount} of {totalCount} messages in this conversation.`)
          .replace('{stegoCount}', suspectMessages.length)
          .replace('{totalCount}', totalMsgsCount)
      : (t('chatFilterBannerSingle') || `Single input text analyzed. Hidden characters detected.`);

    container.innerHTML = `
      ${threatMeterHtml}

      <div class="stego-chat-filter-banner" style="display:flex; align-items:center; justify-content:space-between; background:var(--color-surface-container); border:1px solid var(--color-outline-variant); border-radius:var(--radius-md); padding:10px 16px; margin-bottom:var(--space-md);">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="material-symbols-outlined" style="color:var(--color-primary); font-size:20px;">filter_alt</span>
          <span style="font-weight:600; font-size:0.9rem;">${escSafe(filterBannerText)}</span>
        </div>
        <span class="badge badge--primary" style="font-weight:700;">${suspectMessages.length} ${curLang === 'ar' ? 'رسائل مشتبهة' : 'suspect msgs'}</span>
      </div>

      <div class="stego-suspects-container">
        ${suspectCardsHtml}
      </div>
    `;

    // 4. Trigger Smooth Fill of Horizontal Threat Meter
    setTimeout(() => {
      const fillEl = document.getElementById('horizontalThreatFill');
      if (fillEl) {
        let pct = 0;
        if (analysis.totalFound > 20) pct = 95;
        else if (analysis.totalFound > 5) pct = 85;
        else if (analysis.totalFound > 0) pct = 65;
        fillEl.style.width = `${pct}%`;
      }
    }, 60);

    // 5. Compute Hashes Asynchronously per Suspect Card
    suspectMessages.forEach((msg, sIdx) => {
      computeAndFillCardHashes(msg.sanitizedText, msg.rawText, sIdx);
    });

    // 6. Setup Copy Handlers for Per-Card Hashes
    container.querySelectorAll('.btn-copy-card-clean-hash').forEach(btn => {
      btn.addEventListener('click', function() {
        const sIdx = this.getAttribute('data-idx');
        const codeEl = document.getElementById(`stego-clean-hash-${sIdx}`);
        if (codeEl && codeEl.textContent) {
          navigator.clipboard.writeText(codeEl.textContent).then(() => {
            if (typeof showToast === 'function') showToast('✅ ' + t('toastHashCopied'));
            else alert(t('toastHashCopied'));
          });
        }
      });
    });

    container.querySelectorAll('.btn-copy-card-stego-hash').forEach(btn => {
      btn.addEventListener('click', function() {
        const sIdx = this.getAttribute('data-idx');
        const codeEl = document.getElementById(`stego-stego-hash-${sIdx}`);
        if (codeEl && codeEl.textContent) {
          navigator.clipboard.writeText(codeEl.textContent).then(() => {
            if (typeof showToast === 'function') showToast('✅ ' + t('toastHashCopied'));
            else alert(t('toastHashCopied'));
          });
        }
      });
    });

    // 7. Setup Copy Handlers for Suspect Cards
    container.querySelectorAll('.btn-copy-suspect-clean').forEach(btn => {
      btn.addEventListener('click', function() {
        const idx = parseInt(this.getAttribute('data-idx'), 10);
        const item = suspectMessages[idx];
        if (item) {
          navigator.clipboard.writeText(item.sanitizedText).then(() => {
            if (typeof showToast === 'function') showToast('✅ ' + t('toastCopiedMessageClean'));
            else alert(t('toastCopiedMessageClean'));
          });
        }
      });
    });

    container.querySelectorAll('.btn-copy-suspect-stego').forEach(btn => {
      btn.addEventListener('click', function() {
        const idx = parseInt(this.getAttribute('data-idx'), 10);
        const item = suspectMessages[idx];
        if (item) {
          navigator.clipboard.writeText(item.rawText).then(() => {
            if (typeof showToast === 'function') showToast('✅ ' + t('toastCopiedMessageStego'));
            else alert(t('toastCopiedMessageStego'));
          });
        }
      });
    });

    container.querySelectorAll('.btn-copy-suspect-symbols').forEach(btn => {
      btn.addEventListener('click', function() {
        const idx = parseInt(this.getAttribute('data-idx'), 10);
        const item = suspectMessages[idx];
        if (item) {
          const rawSymbols = item.analysis.results.map(r => String.fromCodePoint(r.codePoint)).join('');
          navigator.clipboard.writeText(rawSymbols).then(() => {
            if (typeof showToast === 'function') showToast('✅ ' + t('toastCopiedSymbols'));
            else alert(t('toastCopiedSymbols'));
          });
        }
      });
    });

    container.querySelectorAll('.btn-copy-suspect-hex').forEach(btn => {
      btn.addEventListener('click', function() {
        const idx = parseInt(this.getAttribute('data-idx'), 10);
        const item = suspectMessages[idx];
        if (item) {
          const hexStr = item.analysis.results.map(r => r.hexCode).join(' ');
          navigator.clipboard.writeText(hexStr).then(() => {
            if (typeof showToast === 'function') showToast('✅ ' + t('toastCopiedHex'));
            else alert(t('toastCopiedHex'));
          });
        }
      });
    });

    // 8. Initialize Modern Floating Stego Popovers
    initStegoPopovers(container);
  }

  // ── Modern Floating Stego Tooltip / Popover Controller ──
  function initStegoPopovers(container) {
    if (!container) return;

    let popover = document.getElementById('stego-floating-popover');
    if (!popover) {
      popover = document.createElement('div');
      popover.id = 'stego-floating-popover';
      popover.className = 'stego-floating-popover';
      popover.innerHTML = `
        <div class="stego-popover-header">
          <div class="stego-popover-title-wrap">
            <span class="material-symbols-outlined stego-popover-icon">shield</span>
            <span class="stego-popover-title">موضع إخفاء سري</span>
          </div>
          <span class="stego-popover-count-pill" id="stego-popover-count">0</span>
        </div>
        <div class="stego-popover-body">
          <div class="stego-popover-list" id="stego-popover-list"></div>
        </div>
        <div class="stego-popover-footer">
          <span class="material-symbols-outlined" style="font-size: 13px; color: var(--color-primary);">info</span>
          <span id="stego-popover-footer-text">💡 تم استخراج الرموز بدقة من هذا الموضع</span>
        </div>
      `;
      document.body.appendChild(popover);
    }

    const curLang = localStorage.getItem('stegoLang') || document.documentElement.lang || 'en';
    let hideTimeout = null;

    const showPopoverFor = (targetEl) => {
      clearTimeout(hideTimeout);
      const rawCluster = targetEl.getAttribute('data-stego-cluster');
      if (!rawCluster) return;

      let cluster = [];
      try {
        cluster = JSON.parse(decodeURIComponent(rawCluster));
      } catch (e) {
        return;
      }
      if (!cluster || cluster.length === 0) return;

      const titleEl = popover.querySelector('.stego-popover-title');
      const countEl = document.getElementById('stego-popover-count');
      const listEl = document.getElementById('stego-popover-list');
      const footerEl = document.getElementById('stego-popover-footer-text');

      if (titleEl) {
        titleEl.textContent = curLang === 'ar' ? 'موضع إخفاء سري' : 'Hidden Stego Insertion';
      }
      if (countEl) {
        countEl.textContent = curLang === 'ar' ? `${cluster.length} رمز` : `${cluster.length} symbols`;
      }
      if (footerEl) {
        footerEl.textContent = curLang === 'ar' ? '💡 تم استخراج الرموز بدقة من هذا الموضع' : '💡 Forensic symbols extracted from this position';
      }

      if (listEl) {
        let rowsHtml = '';
        cluster.forEach((item, idx) => {
          rowsHtml += `
            <div class="stego-popover-item">
              <div class="stego-popover-item-left">
                <span class="stego-popover-item-idx">#${idx + 1}</span>
                <span class="stego-popover-item-name">${escSafe(item.name || 'Hidden Symbol')}</span>
              </div>
              <code class="stego-popover-item-hex">${escSafe(item.hexCode || '')}</code>
            </div>
          `;
        });
        listEl.innerHTML = rowsHtml;
      }

      // Position Popover with collision detection
      popover.style.display = 'block';
      popover.style.visibility = 'hidden';

      const rect = targetEl.getBoundingClientRect();
      const popoverRect = popover.getBoundingClientRect();

      let top = rect.top - popoverRect.height - 10;
      let left = rect.left + (rect.width / 2) - (popoverRect.width / 2);

      if (top < 10) {
        top = rect.bottom + 10;
      }
      if (left < 12) {
        left = 12;
      } else if (left + popoverRect.width > window.innerWidth - 12) {
        left = window.innerWidth - popoverRect.width - 12;
      }

      popover.style.top = `${top}px`;
      popover.style.left = `${left}px`;
      popover.style.visibility = 'visible';
      popover.classList.add('is-visible');
    };

    const hidePopover = () => {
      hideTimeout = setTimeout(() => {
        if (popover) {
          popover.classList.remove('is-visible');
          setTimeout(() => {
            if (!popover.classList.contains('is-visible')) {
              popover.style.display = 'none';
            }
          }, 180);
        }
      }, 150);
    };

    popover.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
    popover.addEventListener('mouseleave', hidePopover);

    container.querySelectorAll('[data-stego-cluster]').forEach(el => {
      el.addEventListener('mouseenter', () => showPopoverFor(el));
      el.addEventListener('mouseleave', hidePopover);
      el.addEventListener('focus', () => showPopoverFor(el));
      el.addEventListener('blur', hidePopover);
    });
  }

  function applyScrollReveal() {
    const rows = document.querySelectorAll('.steganalysis-table tbody tr');
    if (rows.length === 0) return;

    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.05
    };

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry, idx) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('reveal-visible');
          }, idx * 45);
          obs.unobserve(entry.target);
        }
      });
    }, observerOptions);

    rows.forEach(row => {
      observer.observe(row);
    });
  }

  function renderPagination(totalFound) {
    const container = document.getElementById('steganalysisResultsBody');
    if (!container) return;

    const totalPages = Math.ceil(totalFound / PAGE_SIZE);
    if (totalPages <= 1) return;

    const pagWrap = document.createElement('div');
    pagWrap.className = 'steganalysis-pagination';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'pag-btn';
    const prevIcon = document.createElement('span');
    prevIcon.className = 'material-symbols-outlined';
    prevIcon.style.fontSize = '18px';
    prevIcon.textContent = 'chevron_left';
    prevBtn.appendChild(prevIcon);
    prevBtn.title = t('pagePrev');
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        goToPage(currentPage);
      }
    });
    pagWrap.appendChild(prevBtn);

    const pageNumbers = getPageNumbers(totalPages, currentPage);
    pageNumbers.forEach(page => {
      if (page === '...') {
        const span = document.createElement('span');
        span.className = 'pag-ellipsis';
        span.textContent = '...';
        pagWrap.appendChild(span);
      } else {
        const btn = document.createElement('button');
        btn.className = 'pag-btn' + (page === currentPage ? ' active' : '');
        btn.textContent = page;
        btn.addEventListener('click', () => {
          currentPage = page;
          goToPage(currentPage);
        });
        pagWrap.appendChild(btn);
      }
    });

    const nextBtn = document.createElement('button');
    nextBtn.className = 'pag-btn';
    const nextIcon = document.createElement('span');
    nextIcon.className = 'material-symbols-outlined';
    nextIcon.style.fontSize = '18px';
    nextIcon.textContent = 'chevron_right';
    nextBtn.appendChild(nextIcon);
    nextBtn.title = t('pageNext');
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        goToPage(currentPage);
      }
    });
    pagWrap.appendChild(nextBtn);

    container.appendChild(pagWrap);
  }

  function getPageNumbers(totalPages, current) {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (current <= 4) {
        pages.push(2, 3, 4, 5);
        pages.push('...');
        pages.push(totalPages);
      } else if (current >= totalPages - 3) {
        pages.push('...');
        for (let i = totalPages - 4; i < totalPages; i++) {
          pages.push(i);
        }
        pages.push(totalPages);
      } else {
        pages.push('...');
        pages.push(current - 1, current, current + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  }

  function goToPage(page) {
    renderResultsTable(currentAnalysis);
    const tableWrap = document.querySelector('.stego-table');
    if (tableWrap) {
      tableWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function renderSummary(analysis, risk) {
    const summaryEl = document.getElementById('steganalysisSummary');
    if (!summaryEl) return;
    summaryEl.style.display = '';

    const summaryText = document.getElementById('steganalysisSummaryText');
    if (summaryText) {
      if (analysis.totalFound === 0) {
        summaryText.textContent = t('steganalysisSummaryClean');
      } else if (analysis.linguisticEval && analysis.linguisticEval.isNatural) {
        summaryText.textContent = t('naturalFormattingNotice');
      } else if (analysis.matchedSignatures && analysis.matchedSignatures.length > 0) {
        const curLang = localStorage.getItem('stegoLang') || document.documentElement.lang || 'en';
        const names = analysis.matchedSignatures.map(s => curLang === 'ar' ? (s.titleAr || s.name) : (s.titleEn || s.name)).join(' / ');
        summaryText.textContent = `${analysis.totalFound} ${t('steganalysisSummaryFound')} ${analysis.distinctTypes} ${t('steganalysisSummaryTypes')} — [${t('signatureMatchedTitle')}: ${names}]`;
      } else {
        summaryText.textContent = `${analysis.totalFound} ${t('steganalysisSummaryFound')} ${analysis.distinctTypes} ${t('steganalysisSummaryTypes')}`;
      }
    }
  }

  function escSafe(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  window.TextSteganalysis = {
    analyzeText,
    splitChatIntoMessages,
    initSteganalysis,
    renderResultsTable,
    _parseAndApplySteganalysisFile
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSteganalysis);
  } else {
    initSteganalysis();
  }
})();

