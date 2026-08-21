// ============================================================================
// Unicode Steganography Scanner & Extractor
// Pure Vanilla JavaScript — Non-Module (file:// Compatible)
// ============================================================================

(function () {
  const INVISIBLE_CHAR_MAP = {
    0x200b: 'Zero Width Space',
    0x200c: 'Zero Width Non-Joiner',
    0x200d: 'Zero Width Joiner',
    0x2060: 'Word Joiner',
    0xfeff: 'Zero Width No-Break Space (BOM)',
    0x200e: 'Left-to-Right Mark',
    0x200f: 'Right-to-Left Mark',
    0x202a: 'Left-to-Right Embedding',
    0x202b: 'Right-to-Left Embedding',
    0x202c: 'Pop Directional Formatting',
    0x202d: 'Left-to-Right Override',
    0x202e: 'Right-to-Left Override',
    0x2066: 'Left-to-Right Isolate',
    0x2067: 'Right-to-Left Isolate',
    0x2068: 'First Strong Isolate',
    0x2069: 'Pop Directional Isolate',
    0x00ad: 'Soft Hyphen',
    0x034f: 'Combining Grapheme Joiner',
    0x115f: 'Hangul Choseong Filler',
    0x1160: 'Hangul Jungseong Filler',
    0x17b4: 'Khmer Vowel Inherent Aq',
    0x17b5: 'Khmer Vowel Inherent Aa',
    0x180e: 'Mongolian Vowel Separator',
    0x2061: 'Function Application',
    0x2062: 'Invisible Times',
    0x2063: 'Invisible Separator',
    0x2064: 'Invisible Plus',
  };

  function isVariationSelector(cp) {
    return (cp >= 0xfe00 && cp <= 0xfe0f) || (cp >= 0xe0100 && cp <= 0xe01ef);
  }

  function isInvisibleChar(cp) {
    return cp in INVISIBLE_CHAR_MAP;
  }

  function formatCodePoint(cp) {
    return `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
  }

  function getCodePointName(cp) {
    if (isVariationSelector(cp)) {
      if (cp >= 0xfe00 && cp <= 0xfe0f) {
        return `Variation Selector-${cp - 0xfe00 + 1}`;
      }
      return `Variation Selector-${cp - 0xe0100 + 17}`;
    }
    return INVISIBLE_CHAR_MAP[cp] || `Unknown Invisible U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
  }

  function scanUnicodeText(text) {
    const detectedCodePoints = [];
    let invisibleCharacterCount = 0;
    let variationSelectorCount = 0;
    let index = 0;

    for (const char of text) {
      const cp = char.codePointAt(0);

      if (isVariationSelector(cp)) {
        variationSelectorCount++;
        detectedCodePoints.push({
          codePoint: formatCodePoint(cp),
          rawCodePoint: cp,
          name: getCodePointName(cp),
          char,
          index,
        });
      } else if (isInvisibleChar(cp)) {
        invisibleCharacterCount++;
        detectedCodePoints.push({
          codePoint: formatCodePoint(cp),
          rawCodePoint: cp,
          name: getCodePointName(cp),
          char,
          index,
        });
      }

      index++;
    }

    let status = 'clean';
    if (variationSelectorCount > 0) {
      status = 'stegnolines-payload';  // VS = Stegnolines encrypted (needs key)
    } else if (invisibleCharacterCount > 0) {
      const zwChars = detectedCodePoints.filter(
        (dp) => dp.rawCodePoint === 0x200b || dp.rawCodePoint === 0x200c || dp.rawCodePoint === 0x200d
      );
      status = zwChars.length >= 8 ? 'zw-payload' : 'suspicious';  // ZW = basic stego (no key needed)
    }

    const zwCount = detectedCodePoints.filter(
      (dp) => dp.rawCodePoint === 0x200b || dp.rawCodePoint === 0x200c || dp.rawCodePoint === 0x200d
    ).length;

    const extractionAvailable = zwCount >= 8 && status === 'zw-payload';

    return {
      status,
      invisibleCharacterCount,
      variationSelectorCount,
      detectedCodePoints,
      extractionAvailable,
      extractionResult: null,
    };
  }

  function extractZeroWidthPayload(text) {
    const zwChars = [];
    for (const char of text) {
      const cp = char.codePointAt(0);
      if (cp === 0x200b || cp === 0x200c || cp === 0x200d || cp === 0x2060 || cp === 0xfeff) {
        zwChars.push(cp);
      }
    }

    if (zwChars.length < 8) return null;

    const r1 = tryBinaryDecode(zwChars, 0x200b, 0x200c);
    if (r1) return r1;

    const r2 = tryBinaryDecode(zwChars, 0x200b, 0x200d);
    if (r2) return r2;

    const r3 = tryBinaryDecode(zwChars, 0x200c, 0x200d);
    if (r3) return r3;

    return null;
  }

  function tryBinaryDecode(zwChars, zeroChar, oneChar) {
    const bits = zwChars
      .filter((cp) => cp === zeroChar || cp === oneChar)
      .map((cp) => (cp === zeroChar ? 0 : 1));

    if (bits.length < 8) return null;

    const byteCount = Math.floor(bits.length / 8);
    const bytes = [];

    for (let i = 0; i < byteCount; i++) {
      let byte = 0;
      for (let j = 0; j < 8; j++) {
        byte = (byte << 1) | bits[i * 8 + j];
      }
      bytes.push(byte);
    }

    try {
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
      if (isPrintableText(decoded)) return decoded;
    } catch { /* ignore */ }

    try {
      const ascii = bytes
        .filter((b) => b >= 0x20 && b <= 0x7e)
        .map((b) => String.fromCharCode(b))
        .join('');
      if (ascii.length >= 2 && ascii.length >= byteCount * 0.5) return ascii;
    } catch { /* ignore */ }

    return null;
  }

  function isPrintableText(text) {
    if (!text || text.length === 0) return false;
    let printableCount = 0;
    for (const char of text) {
      const cp = char.codePointAt(0);
      if (
        (cp >= 0x20 && cp <= 0x7e) ||
        (cp >= 0x00a0 && cp <= 0xffff && cp !== 0xfeff) ||
        cp === 0x0a || cp === 0x0d || cp === 0x09
      ) {
        printableCount++;
      }
    }
    return printableCount / text.length >= 0.7;
  }

  window.UnicodeScanner = {
    isVariationSelector,
    isInvisibleChar,
    formatCodePoint,
    getCodePointName,
    scanUnicodeText,
    extractZeroWidthPayload,
  };
})();
