/**
 * @file unicode-context.js
 * @description Contextual Unicode analysis index, tokenization, directional pairing, and linguistic predicates.
 * Pure module with browser-global (global.UnicodeContext) and CommonJS exports.
 */

(function (global) {
  'use strict';

  // ── Precompiled Unicode Property Regexes (Compiled once at module scope) ──
  const RE_TOKEN_CHAR = /[\p{L}\p{M}\p{N}\p{Pc}]/u;
  const RE_MARK = /\p{M}/u;

  const RE_LATIN = /\p{scx=Latin}/u;
  const RE_CYRILLIC = /\p{scx=Cyrillic}/u;
  const RE_GREEK = /\p{scx=Greek}/u;
  const RE_ARABIC = /\p{scx=Arabic}/u;
  const RE_DEVANAGARI = /\p{scx=Devanagari}/u;
  const RE_MONGOLIAN = /\p{scx=Mongolian}/u;
  const RE_HEBREW = /\p{scx=Hebrew}/u;
  const RE_THAI = /\p{scx=Thai}/u;
  const RE_KHMER = /\p{scx=Khmer}/u;
  const RE_LAO = /\p{scx=Lao}/u;
  const RE_MYANMAR = /\p{scx=Myanmar}/u;
  const RE_HAN = /\p{scx=Han}/u;
  const RE_HIRAGANA = /\p{scx=Hiragana}/u;
  const RE_KATAKANA = /\p{scx=Katakana}/u;
  const RE_HANGUL = /\p{scx=Hangul}/u;

  // Extended Pictographic regex for emoji base detection
  let RE_PICTOGRAPHIC = /** @type {RegExp|null} */ (null);
  try {
    RE_PICTOGRAPHIC = /\p{Extended_Pictographic}/u;
  } catch (e) {
    RE_PICTOGRAPHIC = null;
  }

  /**
   * Resolves the strong script of a single character, ignoring Common and Inherited.
   *
   * @param {string} char
   * @returns {string|null}
   */
  function getStrongScript(char) {
    if (!char) return null;
    if (RE_LATIN.test(char)) return 'Latin';
    if (RE_CYRILLIC.test(char)) return 'Cyrillic';
    if (RE_GREEK.test(char)) return 'Greek';
    if (RE_ARABIC.test(char)) return 'Arabic';
    if (RE_DEVANAGARI.test(char)) return 'Devanagari';
    if (RE_MONGOLIAN.test(char)) return 'Mongolian';
    if (RE_HEBREW.test(char)) return 'Hebrew';
    if (RE_THAI.test(char)) return 'Thai';
    if (RE_KHMER.test(char)) return 'Khmer';
    if (RE_LAO.test(char)) return 'Lao';
    if (RE_MYANMAR.test(char)) return 'Myanmar';
    if (RE_HAN.test(char) || RE_HIRAGANA.test(char) || RE_KATAKANA.test(char)) return 'CJK';
    if (RE_HANGUL.test(char)) return 'Hangul';
    return null;
  }

  /**
   * Checks whether a code point is an emoji-capable base.
   *
   * @param {number|null} cp
   * @returns {boolean}
   */
  function isEmojiBase(cp) {
    if (cp === null || cp === undefined) return false;
    // Core emoji symbol and pictograph ranges
    if (
      (cp >= 0x1F300 && cp <= 0x1FAFF) ||
      (cp >= 0x1F600 && cp <= 0x1F64F) ||
      (cp >= 0x1F680 && cp <= 0x1F6FF) ||
      (cp >= 0x2600 && cp <= 0x27BF) ||
      (cp >= 0x2300 && cp <= 0x23FF) ||
      (cp >= 0x2B00 && cp <= 0x2BFF) ||
      (cp >= 0x1F1E6 && cp <= 0x1F1FF) || // Regional indicator flags
      cp === 0x0023 || cp === 0x002A || (cp >= 0x0030 && cp <= 0x0039) || // Keycaps #, *, 0-9
      cp === 0x203C || cp === 0x2049 || cp === 0x2122 || cp === 0x2139 ||
      (cp >= 0x2194 && cp <= 0x2199) || (cp >= 0x21A9 && cp <= 0x21AA) ||
      (cp >= 0x25AA && cp <= 0x25AB) || cp === 0x25B6 || cp === 0x25C0 ||
      (cp >= 0x25FB && cp <= 0x25FE) || (cp >= 0x2934 && cp <= 0x2935) ||
      cp === 0x3030 || cp === 0x303D || cp === 0x3297 || cp === 0x3299
    ) {
      return true;
    }

    if (RE_PICTOGRAPHIC) {
      try {
        return RE_PICTOGRAPHIC.test(String.fromCodePoint(cp));
      } catch (err) {
        return false;
      }
    }
    return false;
  }

  /**
   * Checks whether a code point belongs to a cursive joining script.
   *
   * @param {number|null} cp
   * @returns {boolean}
   */
  function isJoinerScriptLetter(cp) {
    if (cp === null || cp === undefined) return false;
    return (
      (cp >= 0x0600 && cp <= 0x06FF) || // Arabic
      (cp >= 0x0750 && cp <= 0x077F) || // Arabic Supplement
      (cp >= 0x08A0 && cp <= 0x08FF) || // Arabic Extended-A
      (cp >= 0xFB50 && cp <= 0xFDFF) || // Arabic Presentation Forms-A
      (cp >= 0xFE70 && cp <= 0xFEFF) || // Arabic Presentation Forms-B
      (cp >= 0x0700 && cp <= 0x074F) || // Syriac
      (cp >= 0x0900 && cp <= 0x097F) || // Devanagari
      (cp >= 0x0980 && cp <= 0x09FF) || // Bengali
      (cp >= 0x0A00 && cp <= 0x0A7F) || // Gurmukhi
      (cp >= 0x0A80 && cp <= 0x0AFF) || // Gujarati
      (cp >= 0x0B00 && cp <= 0x0B7F) || // Oriya
      (cp >= 0x0B80 && cp <= 0x0BFF) || // Tamil
      (cp >= 0x0C00 && cp <= 0x0C7F) || // Telugu
      (cp >= 0x0C80 && cp <= 0x0CFF) || // Kannada
      (cp >= 0x0D00 && cp <= 0x0D7F)    // Malayalam
    );
  }

  /**
   * Checks whether a code point belongs to a script that natively uses ZWSP for word breaks.
   *
   * @param {number|null} cp
   * @returns {boolean}
   */
  function isZeroWidthSpaceScript(cp) {
    if (cp === null || cp === undefined) return false;
    return (
      (cp >= 0x0E00 && cp <= 0x0E7F) || // Thai
      (cp >= 0x0E80 && cp <= 0x0EFF) || // Lao
      (cp >= 0x1000 && cp <= 0x109F) || // Myanmar
      (cp >= 0x1780 && cp <= 0x17FF)    // Khmer
    );
  }

  /**
   * Checks whether a code point is a Mongolian letter.
   *
   * @param {number|null} cp
   * @returns {boolean}
   */
  function isMongolianLetter(cp) {
    if (cp === null || cp === undefined) return false;
    return (cp >= 0x1820 && cp <= 0x1878) || (cp >= 0x1880 && cp <= 0x18AA);
  }

  /**
   * Checks whether a code point is a Unified CJK Ideograph.
   *
   * @param {number|null} cp
   * @returns {boolean}
   */
  function isUnifiedIdeograph(cp) {
    if (cp === null || cp === undefined) return false;
    return (
      (cp >= 0x4E00 && cp <= 0x9FFF) ||
      (cp >= 0x3400 && cp <= 0x4DBF) ||
      (cp >= 0x20000 && cp <= 0x2A6DF) ||
      (cp >= 0x2A700 && cp <= 0x2B73F) ||
      (cp >= 0x2B740 && cp <= 0x2B81F) ||
      (cp >= 0x2B820 && cp <= 0x2CEAF) ||
      (cp >= 0xF900 && cp <= 0xFAFF)
    );
  }

  /**
   * Checks whether a code point is a mathematical operator or operand.
   *
   * @param {number|null} cp
   * @returns {boolean}
   */
  function isMathChar(cp) {
    if (cp === null || cp === undefined) return false;
    return (
      (cp >= 0x2200 && cp <= 0x22FF) || // Mathematical Operators
      (cp >= 0x2A00 && cp <= 0x2AFF) || // Supplemental Math Operators
      (cp >= 0x27C0 && cp <= 0x27EF) || // Misc Math Symbols-A
      (cp >= 0x2980 && cp <= 0x29FF) || // Misc Math Symbols-B
      (cp >= 0x1D400 && cp <= 0x1D7FF) || // Mathematical Alphanumeric Symbols
      (cp >= 0x0030 && cp <= 0x0039) || // Digits 0-9
      (cp >= 0x0041 && cp <= 0x005A) || // ASCII Letters
      (cp >= 0x0061 && cp <= 0x007A)
    );
  }

  /**
   * Pure Context Index Builder.
   * Builds one O(n) context index per message.
   *
   * @param {string} text - Source text.
   * @returns {Object} Context index.
   */
  function build(text) {
    const rawText = typeof text === 'string' ? text : '';
    const chars = Array.from(rawText);
    const n = chars.length;
    const codePoints = new Array(n);

    for (let i = 0; i < n; i++) {
      codePoints[i] = chars[i].codePointAt(0);
    }

    // ── 1. Token Boundaries and Token Indexing ──
    const tokens = [];
    const tokenMap = new Array(n).fill(null);

    let currentToken = /** @type {any} */ (null);

    for (let i = 0; i < n; i++) {
      const char = chars[i];
      const isTokenChar = RE_TOKEN_CHAR.test(char);

      if (isTokenChar) {
        if (!currentToken) {
          currentToken = {
            id: tokens.length,
            start: i,
            end: i,
            chars: [char],
            strongScripts: new Set(),
            hasAscii: false,
            hasFullwidth: false,
            homoglyphs: []
          };
        } else {
          currentToken.end = i;
          currentToken.chars.push(char);
        }

        const cp = codePoints[i];
        const script = getStrongScript(char);
        if (script) {
          currentToken.strongScripts.add(script);
        }

        if (
          (cp >= 0x0030 && cp <= 0x0039) ||
          (cp >= 0x0041 && cp <= 0x005A) ||
          (cp >= 0x0061 && cp <= 0x007A)
        ) {
          currentToken.hasAscii = true;
        }

        if (cp >= 0xFF01 && cp <= 0xFF5E) {
          currentToken.hasFullwidth = true;
        }

        tokenMap[i] = currentToken;
      } else {
        if (currentToken) {
          currentToken.text = currentToken.chars.join('');
          currentToken.length = currentToken.chars.length;
          tokens.push(currentToken);
          currentToken = null;
        }
      }
    }

    if (currentToken) {
      currentToken.text = currentToken.chars.join('');
      currentToken.length = currentToken.chars.length;
      tokens.push(currentToken);
    }

    // ── 2. Directional Pairing Maps (Stack-based TR9 matching) ──
    const isolatePairs = new Map();
    const unmatchedIsolateInitiators = new Set();
    const unmatchedIsolateClosers = new Set();
    const isolateStack = /** @type {any[]} */ ([]);

    const embeddingPairs = new Map();
    const unmatchedEmbeddingInitiators = new Set();
    const unmatchedEmbeddingClosers = new Set();
    const embeddingStack = /** @type {any[]} */ ([]);

    for (let i = 0; i < n; i++) {
      const cp = codePoints[i];

      // Directional Isolates: LRI (0x2066), RLI (0x2067), FSI (0x2068) with PDI (0x2069)
      if (cp === 0x2066 || cp === 0x2067 || cp === 0x2068) {
        isolateStack.push({ cp, pos: i, depth: isolateStack.length });
      } else if (cp === 0x2069) {
        if (isolateStack.length > 0) {
          const init = isolateStack.pop();
          isolatePairs.set(init.pos, { peerPos: i, type: 'isolate', depth: init.depth, initiatorCp: init.cp });
          isolatePairs.set(i, { peerPos: init.pos, type: 'isolate', depth: init.depth, initiatorCp: init.cp });
        } else {
          unmatchedIsolateClosers.add(i);
        }
      }

      // Directional Embeddings/Overrides: LRE (0x202A), RLE (0x202B), LRO (0x202D), RLO (0x202E) with PDF (0x202C)
      if (cp === 0x202A || cp === 0x202B || cp === 0x202D || cp === 0x202E) {
        embeddingStack.push({ cp, pos: i, depth: embeddingStack.length });
      } else if (cp === 0x202C) {
        if (embeddingStack.length > 0) {
          const init = embeddingStack.pop();
          embeddingPairs.set(init.pos, { peerPos: i, type: 'embedding', depth: init.depth, initiatorCp: init.cp });
          embeddingPairs.set(i, { peerPos: init.pos, type: 'embedding', depth: init.depth, initiatorCp: init.cp });
        } else {
          unmatchedEmbeddingClosers.add(i);
        }
      }
    }

    for (const item of isolateStack) {
      unmatchedIsolateInitiators.add(item.pos);
    }
    for (const item of embeddingStack) {
      unmatchedEmbeddingInitiators.add(item.pos);
    }

    // ── 3. Previous and Next Non-Mark Code Points (Context Lookaround) ──
    const prevNonMark = new Array(n).fill(null);
    const nextNonMark = new Array(n).fill(null);

    let lastNonMark = null;
    for (let i = 0; i < n; i++) {
      prevNonMark[i] = lastNonMark;
      if (!RE_MARK.test(chars[i])) {
        lastNonMark = codePoints[i];
      }
    }

    let forwardNonMark = null;
    for (let i = n - 1; i >= 0; i--) {
      nextNonMark[i] = forwardNonMark;
      if (!RE_MARK.test(chars[i])) {
        forwardNonMark = codePoints[i];
      }
    }

    return {
      text: rawText,
      chars,
      codePoints,
      length: n,
      tokens,
      tokenMap,

      // Directional pairing
      isolatePairs,
      unmatchedIsolateInitiators,
      unmatchedIsolateClosers,
      embeddingPairs,
      unmatchedEmbeddingInitiators,
      unmatchedEmbeddingClosers,

      // Lookaround
      prevNonMark,
      nextNonMark,

      // Predicates bound to context
      isLeadingBom: (pos, cp) => (cp === 0xFEFF && pos === 0),
      isEmojiBase,
      isEmojiZwj: (pos) => {
        const cp = codePoints[pos];
        if (cp !== 0x200D) return false;
        return isEmojiBase(prevNonMark[pos]) || isEmojiBase(nextNonMark[pos]);
      },
      isEmojiVs: (pos) => {
        const cp = codePoints[pos];
        if (cp !== 0xFE0E && cp !== 0xFE0F) return false;
        return isEmojiBase(prevNonMark[pos]);
      },
      isMongolianVs: (pos) => {
        const cp = codePoints[pos];
        if (cp < 0x180B || cp > 0x180D) return false;
        return isMongolianLetter(prevNonMark[pos]);
      },
      isIdeographicVs: (pos) => {
        const cp = codePoints[pos];
        if (cp < 0xE0100 || cp > 0xE01EF) return false;
        return isUnifiedIdeograph(prevNonMark[pos]);
      },
      isCursiveJoiner: (pos) => {
        const cp = codePoints[pos];
        if (cp !== 0x200C && cp !== 0x200D) return false;
        return isJoinerScriptLetter(prevNonMark[pos]) && isJoinerScriptLetter(nextNonMark[pos]);
      },
      isZeroWidthSpaceContext: (pos) => {
        const cp = codePoints[pos];
        if (cp !== 0x200B) return false;
        return isZeroWidthSpaceScript(prevNonMark[pos]) || isZeroWidthSpaceScript(nextNonMark[pos]);
      },
      isMathContext: (pos) => {
        const cp = codePoints[pos];
        if (cp < 0x2061 || cp > 0x2064) return false;
        return isMathChar(prevNonMark[pos]) || isMathChar(nextNonMark[pos]);
      },
      isFrenchOrNumericSpace: (pos) => {
        const cp = codePoints[pos];
        if (cp !== 0x202F) return false;
        const prev = prevNonMark[pos];
        const next = nextNonMark[pos];

        // French numbers: between digits
        if (prev !== null && next !== null) {
          const isPrevDigit = (prev >= 0x0030 && prev <= 0x0039);
          const isNextDigit = (next >= 0x0030 && next <= 0x0039);
          if (isPrevDigit && isNextDigit) return true;
        }

        // French punctuation: before :, ;, !, ?, », % or after «
        if (next !== null) {
          if (
            next === 0x003A || // :
            next === 0x003B || // ;
            next === 0x0021 || // !
            next === 0x003F || // ?
            next === 0x00BB || // »
            next === 0x0025    // %
          ) {
            return true;
          }
        }
        if (prev !== null && prev === 0x00AB) { // «
          return true;
        }

        // Mongolian NNBSP
        if (prev !== null && isMongolianLetter(prev)) {
          return true;
        }

        return false;
      }
    };
  }

  const UnicodeContext = {
    build,
    getStrongScript,
    isEmojiBase,
    isJoinerScriptLetter,
    isZeroWidthSpaceScript,
    isMongolianLetter,
    isUnifiedIdeograph,
    isMathChar
  };

  global.UnicodeContext = UnicodeContext;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnicodeContext;
  }
})(typeof window !== 'undefined' ? window : globalThis);
