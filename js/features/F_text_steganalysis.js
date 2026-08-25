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
    0x03A5: { name: "Greek Capital Letter Upsilon Υ (Homograph of 'Y')", canonical: 'Y', category: 'homograph' }
  };

  const CANONICAL_SUBSTITUTABLE = new Set([
    0x0061, 0x0065, 0x006F, 0x0070, 0x0063, 0x0078, 0x0079, 0x0069, 0x0073, 0x0064, 0x0076, 0x0075,
    0x0041, 0x0042, 0x0045, 0x004B, 0x004D, 0x0048, 0x004F, 0x0050, 0x0043, 0x0054, 0x0058, 0x0059, 0x005A, 0x0049, 0x004E
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
    // Zero width & variation selectors -> stripped
    if (CHAR_MAP[cp] && CHAR_MAP[cp].category === 'zeroWidth') return '';
    if (CHAR_MAP[cp] && CHAR_MAP[cp].category === 'bom') return '';
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

      if (CHAR_MAP[cp]) {
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

    const t1 = performance.now();

    return {
      results: results,
      totalFound: results.length,
      distinctTypes: typesSet.size,
      computationTimeMs: parseFloat((t1 - t0).toFixed(2)),
      inputText: inputText,
      techniques: techniques
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
  function classifyRisk(total) {
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

  function _parseAndApplySteganalysisFile(file, rawText) {
    rawText = (rawText || '').replace(/^\uFEFF/, '').replace(/\r/g, '');
    const ext = file.name.split('.').pop().toLowerCase();
    let parsedResult = null;
    let messageList = [];
    let formattedChatText = '';

    if (window.ChatParsers) {
      const P = window.ChatParsers;
      try {
        if (ext === 'json') {
          parsedResult = P.parseTelegramJson(rawText);
          if (!parsedResult || !parsedResult.messages || parsedResult.messages.length === 0) {
            parsedResult = P.parseMetaJson(rawText);
          }
          if (!parsedResult || !parsedResult.messages || parsedResult.messages.length === 0) {
            parsedResult = P.parseGenericJson(rawText);
          }
        } else if (ext === 'csv') {
          parsedResult = P.parseGenericCsv(rawText);
        } else if (ext === 'html' || ext === 'htm') {
          parsedResult = P.parseGenericHtml(rawText);
        } else {
          // .txt or generic
          parsedResult = P.parseWhatsAppTxt(rawText);
          if (!parsedResult || !parsedResult.messages || parsedResult.messages.length === 0) {
            parsedResult = P.parseGenericTxt(rawText);
          }
        }
      } catch (err) {
        console.warn('Parser error in _parseAndApplySteganalysisFile:', err);
      }
    }

    if (parsedResult) {
      if (Array.isArray(parsedResult.messages)) {
        messageList = parsedResult.messages;
      } else if (Array.isArray(parsedResult)) {
        messageList = parsedResult;
      }
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
      } else if (hasText) {
        text = textInput.value;
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
        const risk = classifyRisk(currentAnalysis.totalFound);

        if (resultsPanel) resultsPanel.style.display = '';

        renderMetrics(currentAnalysis, risk);

        if (currentAnalysis.totalFound === 0) {
          renderCleanState();
        } else {
          renderResultsTable(currentAnalysis);
          renderSummary(currentAnalysis, risk);
        }

        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = `
          <span class="material-symbols-outlined" style="font-size:18px">search_insights</span>
          <span data-i18n="btnAnalyzeText">${t('btnAnalyzeText')}</span>
        `;

        if (typeof showToast === 'function') {
          showToast('✅ ' + t('steganalysisCompleted'));
        }
        if (resultsPanel) {
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
        const tooltipText = String(count);

        let statusClass = 'underscore--success';
        if (cluster.some(item => item.category === 'directional' || item.category === 'bom')) {
          statusClass = 'underscore--error';
        } else if (cluster.some(item => item.category === 'space' || item.category === 'mongolianFVS' || item.category === 'homograph')) {
          statusClass = 'underscore--warning';
        }

        const spacerHtml = `<span class="visual-underscore-spacer ${statusClass}" title="${escSafe(tooltipText)}">&nbsp;</span>`;
        charHtml = spacerHtml + charHtml;
      }

      html += charHtml;
    }

    if (hiddenClusters.has(n)) {
      const cluster = hiddenClusters.get(n);
      const count = cluster.length;
      const tooltipText = String(count);

      let statusClass = 'underscore--success';
      if (cluster.some(item => item.category === 'directional' || item.category === 'bom')) {
        statusClass = 'underscore--error';
      } else if (cluster.some(item => item.category === 'space' || item.category === 'mongolianFVS' || item.category === 'homograph')) {
        statusClass = 'underscore--warning';
      }

      html += `<span class="visual-underscore-spacer ${statusClass}" title="${escSafe(tooltipText)}">&nbsp;</span>`;
    }

    if (n > maxPreviewChars) {
      html += `<div style="margin-top: var(--space-sm); font-style: italic; opacity: 0.5; font-size: 0.75rem;">... [Text truncated for performance]</div>`;
    }

    return html;
  }

  function renderResultsTable(analysis) {
    const container = document.getElementById('steganalysisResultsBody');
    if (!container) return;

    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const endIdx = Math.min(startIdx + PAGE_SIZE, analysis.results.length);
    const paginatedResults = analysis.results.slice(startIdx, endIdx);

    let tableRows = '';
    paginatedResults.forEach((item, idx) => {
      const catKey = CATEGORY_I18N[item.category] || item.category;
      const catLabel = t(catKey);
      const ctxBefore = escSafe(item.contextBefore);
      const ctxAfter = escSafe(item.contextAfter);
      const globalIdx = startIdx + idx + 1;

      let rowModifier = 'row--warning';
      if (item.category === 'directional' || item.category === 'bom') {
        rowModifier = 'row--error';
      } else if (item.category === 'zeroWidth' || item.category === 'variationSelector') {
        rowModifier = 'row--success';
      }

      tableRows += `
        <tr class="${rowModifier}">
          <td style="text-align: center;"><span class="stego-table__index">#${globalIdx}</span></td>
          <td style="font-family: monospace; font-weight: 600;"><code style="font-family:'Sora', monospace; font-weight:600; color:var(--color-primary); background:rgba(187,209,0,0.08); padding:2px 8px; border-radius:var(--radius-default); font-size:0.75rem;">${item.hexCode}</code></td>
          <td style="font-weight: 600; color: var(--color-on-surface);">${escSafe(item.name)}</td>
          <td><span class="steganalysis-cat-chip steganalysis-cat--${item.category}">${catLabel}</span></td>
          <td><span class="pos-chip">#${item.position}</span></td>
          <td dir="ltr">
            <span class="steganalysis-context">
              ${ctxBefore}<span class="steganalysis-context__marker" title="${t('markerHiddenText')}"><span class="material-symbols-outlined" style="font-size: 11px; font-weight: bold; vertical-align: middle; line-height: 1;">visibility_off</span><span style="font-size: 10px; font-weight: 700; vertical-align: middle; text-transform: uppercase;">${t('markerHiddenText')}</span></span>${ctxAfter}
            </span>
          </td>
        </tr>
      `;
    });

    const techniquesBannerHtml = renderTechniquesBanner(analysis);

    container.innerHTML = `
      ${techniquesBannerHtml}

      <div class="steganalysis-visual-map">
        <div class="visual-map__title">
          <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 1.20rem; vertical-align: middle;">map</span>
          <span>${t('visualMapTitle')}</span>
        </div>
        <div class="visual-map__content" dir="auto">${renderVisualMap(analysis.inputText, analysis)}</div>
      </div>

      <div class="steganalysis-table-container">
        <table class="steganalysis-table">
          <thead>
            <tr>
              <th style="width: 60px; text-align: center;">${t('tableColIndex')}</th>
              <th style="width: 110px;">${t('tableColHex')}</th>
              <th>${t('tableColName')}</th>
              <th style="width: 140px;">${t('tableColCategory')}</th>
              <th style="width: 100px;">${t('tableColPosition')}</th>
              <th>${t('tableColContext')}</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    `;

    renderPagination(analysis.results.length);
    applyScrollReveal();
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSteganalysis);
  } else {
    initSteganalysis();
  }
})();

