// ══════════════════════════════════════════════════════════════
// Stage 3 — Hide | Step 4: Stego-Channel (Variation Selectors)
// ══════════════════════════════════════════════════════════════
//
// قناة الإخفاء: ترميز/فك ترميز المفتاح عبر Variation Selectors
// أحرف VS غير مرئية تُلحق بالنص — لا تغير المظهر
//
// VS1–VS16   (U+FE00–U+FE0F)   → bytes 0–15
// VS17–VS256 (U+E0100–U+E01EF) → bytes 16–255
//
// ══════════════════════════════════════════════════════════════


const VS_START      = 0xFE00;   // VS1  (byte 0-15)
const VS_END        = 0xFE0F;   // VS16
const VS_SUP_START  = 0xE0100;  // VS17 (byte 16-255)
const VS_SUP_END    = 0xE01EF;  // VS256

/** Convert a byte (0–255) → invisible Variation Selector character. */
function toVariationSelector(byte) {
  if (byte >= 0 && byte < 16) {
    return String.fromCodePoint(VS_START + byte);
  } else if (byte >= 16 && byte < 256) {
    return String.fromCodePoint(VS_SUP_START + byte - 16);
  }
  return null;
}

/** Convert a Variation Selector codePoint back → byte (0–255). */
function fromVariationSelector(codePoint) {
  if (codePoint >= VS_START && codePoint <= VS_END) {
    return codePoint - VS_START;
  } else if (codePoint >= VS_SUP_START && codePoint <= VS_SUP_END) {
    return codePoint - VS_SUP_START + 16;
  }
  return null;
}

/**
 * Convert binary XOR key → array of bytes → VS string.
 * Pads the binary to a multiple of 8, then converts each byte.
 */
function xorKeyToVSString(binaryKey) {
  const padded = binaryKey.padEnd(Math.ceil(binaryKey.length / 8) * 8, '0');
  let vsStr = '';
  const bytesArr = [];
  for (let i = 0; i + 8 <= padded.length; i += 8) {
    const b = parseInt(padded.substring(i, i + 8), 2);
    bytesArr.push(b);
    vsStr += toVariationSelector(b);
  }
  return { vsStr, bytesArr };
}

/**
 * Extract all VS bytes from a text string.
 * Returns { vsBytes: Uint8Array, cleanText: string }
 */
function extractVSFromText(text) {
  const vsBytes = [];
  let cleanText = '';
  const chars = Array.from(text);
  for (const char of chars) {
    const cp = char.codePointAt(0);
    const b = fromVariationSelector(cp);
    if (b !== null) {
      vsBytes.push(b);
    } else {
      cleanText += char;
    }
  }
  return { vsBytes: new Uint8Array(vsBytes), cleanText };
}

/**
 * Build the final Stego-Object.
 * Always: [VS key] + [cover text]
 */
function buildFinalOutput(coverText, vsKeyStr) {
  return vsKeyStr + coverText;
}
