// ══════════════════════════════════════════════════════════════
// Stage 3 — Hide | Step 1: Cover Binary
// ══════════════════════════════════════════════════════════════
//
// تحويل النصوص (Cover / Secret) إلى تمثيل ثنائي والعكس
// هذه الخطوة هي الأساس الذي تُبنى عليه جميع الخطوات التالية
//
// UTF-8 Encoding: 8 bits per byte
// ══════════════════════════════════════════════════════════════


/**
 * String → binary.
 * UTF-8 Encoding (8 bits per byte)
 */
function stringToBinary(str) {
  if (!str) return '';
  const bytes = new TextEncoder().encode(str);
  return bytesToBinary(bytes);
}

/** Binary string → readable text (UTF-8). */
function binaryToString(bin) {
  if (!bin) return '';
  const bytes = binaryToBytes(bin);
  return new TextDecoder().decode(bytes);
}

/** Uint8Array → binary string. */
function bytesToBinary(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += bytes[i].toString(2).padStart(8, '0');
  }
  return bin;
}

/** Binary string → Uint8Array. */
function binaryToBytes(bin) {
  const bytes = new Uint8Array(Math.floor(bin.length / 8));
  for (let i = 0; i + 8 <= bin.length; i += 8) {
    bytes[i / 8] = parseInt(bin.substring(i, i + 8), 2);
  }
  return bytes;
}
