// ══════════════════════════════════════════════════════════════
// Shared Utility — High-Performance Text Codec (Binary ↔ Text)
// ══════════════════════════════════════════════════════════════

'use strict';

const SHARED_TEXT_ENCODER = new TextEncoder();
const SHARED_TEXT_DECODER = new TextDecoder('utf-8', { fatal: true });

const BYTE_TO_BIN_LUT = new Array(256);
for (let b = 0; b < 256; b++) {
  BYTE_TO_BIN_LUT[b] = b.toString(2).padStart(8, '0');
}

function stringToBinary(str) {
  if (!str) return '';
  const encodedBytes = SHARED_TEXT_ENCODER.encode(str);
  return bytesToBinary(encodedBytes);
}

function binaryToString(binaryString) {
  if (!binaryString) return '';
  const decodedBytes = binaryToBytes(binaryString);
  return SHARED_TEXT_DECODER.decode(decodedBytes);
}

function bytesToBinary(bytes) {
  if (!bytes || bytes.length === 0) return '';
  const len = bytes.length;
  const parts = new Array(len);
  for (let i = 0; i < len; i++) {
    parts[i] = BYTE_TO_BIN_LUT[bytes[i]];
  }
  return parts.join('');
}

function binaryToBytes(binaryString) {
  if (!binaryString) return new Uint8Array(0);

  const byteCount = binaryString.length >> 3;
  const bytes = new Uint8Array(byteCount);

  for (let i = 0; i < byteCount; i++) {
    const base = i << 3;
    bytes[i] = ((binaryString.charCodeAt(base) & 1) << 7) |
               ((binaryString.charCodeAt(base + 1) & 1) << 6) |
               ((binaryString.charCodeAt(base + 2) & 1) << 5) |
               ((binaryString.charCodeAt(base + 3) & 1) << 4) |
               ((binaryString.charCodeAt(base + 4) & 1) << 3) |
               ((binaryString.charCodeAt(base + 5) & 1) << 2) |
               ((binaryString.charCodeAt(base + 6) & 1) << 1) |
               (binaryString.charCodeAt(base + 7) & 1);
  }

  return bytes;
}
