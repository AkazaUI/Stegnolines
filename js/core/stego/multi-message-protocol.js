/**
 * Multi-Message Framing Protocol & Utility Module
 * Stegnolines - Fold-Aware Adaptive Multi-Message Image Embedding
 *
 * Implements:
 * 1. Unicode & Text Measurement Utilities (CodePoints, UTF-16, UTF-8, Graphemes, Words)
 * 2. WhatsApp & Social Platform Profiles
 * 3. Binary Framing Header (64 Bytes) with Magic 'SLM', Transfer ID, CRC32, and SHA-256
 * 4. Midpoint Safe Word-Boundary Insertion Logic
 * 5. Adaptive Chunking Engine
 */

(function (exports) {
  'use strict';

  // ══════════════════════════════════════════════════════════════
  // 1. UNICODE & MEASUREMENT UTILITIES
  // ══════════════════════════════════════════════════════════════

  /**
   * Counts total Unicode Code Points in a string (handles surrogate pairs correctly).
   * @param {string} str
   * @returns {number}
   */
  function countCodePoints(str) {
    if (!str) return 0;
    return Array.from(str).length;
  }

  /**
   * Counts UTF-16 Code Units in a string (JavaScript default .length).
   * @param {string} str
   * @returns {number}
   */
  function countUtf16Units(str) {
    return str ? str.length : 0;
  }

  /**
   * Counts UTF-8 encoded bytes in a string.
   * @param {string} str
   * @returns {number}
   */
  function countUtf8Bytes(str) {
    if (!str) return 0;
    return new TextEncoder().encode(str).length;
  }

  /**
   * Counts User-Perceived Grapheme Clusters (extended emoji sequences, compound symbols).
   * Uses Intl.Segmenter if available, falling back to Array.from.
   * @param {string} str
   * @returns {number}
   */
  function countGraphemes(str) {
    if (!str) return 0;
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
      let count = 0;
      for (const _ of segmenter.segment(str)) {
        count++;
      }
      return count;
    }
    return countCodePoints(str);
  }

  /**
   * Counts words in a string accurately across languages (Arabic, English, French, Latin, Chinese).
   * Uses Intl.Segmenter if available, falling back to regex word boundaries.
   * @param {string} str
   * @returns {number}
   */
  function countWords(str) {
    if (!str || !str.trim()) return 0;
    const trimmed = str.trim();

    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
      let count = 0;
      for (const segment of segmenter.segment(trimmed)) {
        if (segment.isWordLike) {
          count++;
        }
      }
      if (count > 0) return count;
    }

    // Fallback regex splitting for mixed/multilingual text
    const words = trimmed.split(/[\s,.\u060C\u061B!؟?:;""''()\[\]{}—–-]+/).filter(w => w.length > 0);
    return words.length;
  }

  /**
   * Validates cover text for multi-message embedding rules:
   * - At least 10 words total
   * - Natural punctuation & sentences preferred
   * - Safe insertion midpoint possible (at least 3 words before and after)
   * @param {string} coverText
   * @returns {{ valid: boolean, wordCount: number, errorEn: string, errorAr: string }}
   */
  function validateMultiCoverText(coverText) {
    const wordCount = countWords(coverText);
    if (!coverText || !coverText.trim()) {
      return {
        valid: false,
        wordCount: 0,
        errorEn: 'Cover text cannot be empty.',
        errorAr: 'نص الغلاف لا يمكن أن يكون فارغاً.'
      };
    }
    if (wordCount < 10) {
      return {
        valid: false,
        wordCount: wordCount,
        errorEn: `Cover text is too short (${wordCount} words). Minimum 10 words required for natural steganographic insertion.`,
        errorAr: `نص الغلاف قصير جداً (${wordCount} كلمة). يلزم 10 كلمات على الأقل لإدراج النص المخفي بشكل طبيعي.`
      };
    }
    return { valid: true, wordCount: wordCount, errorEn: '', errorAr: '' };
  }

  // ══════════════════════════════════════════════════════════════
  // 2. CRC32 CHECKSUM & HASH UTILITIES
  // ══════════════════════════════════════════════════════════════

  // Precomputed CRC32 Lookup Table
  const CRC32_TABLE = new Uint32Array(256);
  (function () {
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      CRC32_TABLE[i] = c >>> 0;
    }
  })();

  /**
   * Computes IEEE 802.3 CRC32 checksum for a Uint8Array byte buffer.
   * @param {Uint8Array} data
   * @returns {number} 32-bit unsigned integer
   */
  function computeCRC32(data) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ data[i]) & 0xFF];
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  /**
   * Computes SHA-256 digest of Uint8Array data returning a 32-byte Uint8Array.
   * Uses Web Crypto API (`crypto.subtle.digest`).
   * @param {Uint8Array} data
   * @returns {Promise<Uint8Array>}
   */
  async function computeSha256Raw(data) {
    if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
      const buf = await crypto.subtle.digest('SHA-256', data);
      return new Uint8Array(buf);
    }
    // Fallback: If sha256.js window.sha256 is present
    if (typeof exports.sha256 === 'function') {
      const hex = exports.sha256(data);
      const result = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        result[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
      }
      return result;
    }
    throw new Error('SHA-256 Crypto Provider not available.');
  }

  // ══════════════════════════════════════════════════════════════
  // 3. BINARY FRAMING HEADER (64 BYTES)
  // ══════════════════════════════════════════════════════════════

  /**
   * Magic Signature for StegnoLines Multi-Message Protocol: "SLM" (0x53, 0x4C, 0x4D)
   */
  const MAGIC_BYTES = new Uint8Array([0x53, 0x4C, 0x4D]);
  const PROTOCOL_VERSION = 1;
  const HEADER_SIZE = 64;

  /**
   * Checks if a byte buffer starts with the Multi-Message Magic Signature 'SLM'.
   * @param {Uint8Array} bytes
   * @returns {boolean}
   */
  function isMultiMessageMagic(bytes) {
    if (!bytes || bytes.length < 3) return false;
    return bytes[0] === MAGIC_BYTES[0] &&
           bytes[1] === MAGIC_BYTES[1] &&
           bytes[2] === MAGIC_BYTES[2];
  }

  /**
   * Builds a 64-byte binary framing header for a payload chunk.
   *
   * Header Layout:
   *  0..2   (3B)  : Magic 'SLM' (0x53 0x4C 0x4D)
   *  3      (1B)  : Version (0x01)
   *  4..11  (8B)  : Transfer ID (Random crypto bytes)
   *  12..13 (2B)  : Chunk Index (Uint16 Big-Endian, 0-indexed)
   *  14..15 (2B)  : Total Chunks (Uint16 Big-Endian)
   *  16..19 (4B)  : Original Total Payload Length (Uint32 Big-Endian)
   *  20..23 (4B)  : Current Chunk Data Length (Uint32 Big-Endian)
   *  24..27 (4B)  : Chunk Data CRC32 Checksum (Uint32 Big-Endian)
   *  28..31 (4B)  : Reserved (0x00000000)
   *  32..63 (32B) : SHA-256 of Total Encrypted Payload (Full Integrity Digest)
   *
   * @param {Uint8Array} transferId 8-byte transfer identifier
   * @param {number} chunkIndex 0-indexed chunk index
   * @param {number} totalChunks total count of chunks
   * @param {number} origPayloadLen total length of encrypted payload
   * @param {number} chunkDataLen byte length of chunk data payload
   * @param {number} chunkCrc32 CRC32 of current chunk data
   * @param {Uint8Array} fullPayloadSha256 32-byte SHA-256 digest of full payload
   * @returns {Uint8Array} 64-byte header buffer
   */
  function buildChunkHeader(transferId, chunkIndex, totalChunks, origPayloadLen, chunkDataLen, chunkCrc32, fullPayloadSha256) {
    const header = new Uint8Array(HEADER_SIZE);
    const view = new DataView(header.buffer);

    // 0..2 Magic 'SLM'
    header.set(MAGIC_BYTES, 0);

    // 3 Version
    header[3] = PROTOCOL_VERSION;

    // 4..11 Transfer ID (8 bytes)
    if (transferId && transferId.length >= 8) {
      header.set(transferId.subarray(0, 8), 4);
    }

    // 12..13 Chunk Index
    view.setUint16(12, chunkIndex, false);

    // 14..15 Total Chunks
    view.setUint16(14, totalChunks, false);

    // 16..19 Original Payload Length
    view.setUint32(16, origPayloadLen, false);

    // 20..23 Current Chunk Data Length
    view.setUint32(20, chunkDataLen, false);

    // 24..27 CRC32
    view.setUint32(24, chunkCrc32, false);

    // 28..31 Reserved
    view.setUint32(28, 0, false);

    // 32..63 Full Payload SHA-256 Digest (32 bytes)
    if (fullPayloadSha256 && fullPayloadSha256.length === 32) {
      header.set(fullPayloadSha256, 32);
    }

    return header;
  }

  /**
   * Parses a 64-byte binary framing header from a byte buffer.
   * @param {Uint8Array} bytes
   * @returns {Object|null} Header metadata object or null if invalid
   */
  function parseChunkHeader(bytes) {
    if (!bytes || bytes.length < HEADER_SIZE) return null;
    if (!isMultiMessageMagic(bytes)) return null;

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    const version = bytes[3];
    if (version !== PROTOCOL_VERSION) return null;

    const transferId = bytes.slice(4, 12);
    const transferIdHex = Array.from(transferId).map(b => b.toString(16).padStart(2, '0')).join('');

    const chunkIndex = view.getUint16(12, false);
    const totalChunks = view.getUint16(14, false);
    const origPayloadLen = view.getUint32(16, false);
    const chunkDataLen = view.getUint32(20, false);
    const chunkCrc32 = view.getUint32(24, false);
    const fullPayloadSha256 = bytes.slice(32, 64);
    const fullPayloadSha256Hex = Array.from(fullPayloadSha256).map(b => b.toString(16).padStart(2, '0')).join('');

    return {
      version,
      transferId,
      transferIdHex,
      chunkIndex,
      totalChunks,
      origPayloadLen,
      chunkDataLen,
      chunkCrc32,
      fullPayloadSha256,
      fullPayloadSha256Hex
    };
  }

  // ══════════════════════════════════════════════════════════════
  // 4. FOLD-AWARE MIDPOINT SAFE INSERTION LOGIC
  // ══════════════════════════════════════════════════════════════

  /**
   * Finds a safe insertion index near the middle of cover text, aligned to a natural word boundary.
   *
   * Target Zone: 40% to 60% of total string length.
   * Searches for whitespace or sentence punctuation (. , ! ? ؟ ،) closest to the exact 50% midpoint.
   *
   * @param {string} text Cover text string
   * @returns {number} Character index for safe insertion
   */
  function findSafeMidpointInsertionIndex(text) {
    if (!text || text.length === 0) return 0;
    const len = text.length;

    // For very short strings, append at end
    if (len < 20) return Math.floor(len / 2);

    const midpoint = Math.floor(len / 2);
    const searchRadius = Math.floor(len * 0.20); // Search within 30% .. 70% range

    let bestIndex = midpoint;
    let minDistance = Infinity;

    // Preferred break characters (space, newline, sentence boundary punctuation)
    const breakChars = new Set([' ', '\n', '\r', '.', '!', '?', '؟', '،', ';', ':', '—', '-']);

    for (let offset = 0; offset <= searchRadius; offset++) {
      // Check forward from midpoint
      const fwd = midpoint + offset;
      if (fwd < len && breakChars.has(text[fwd])) {
        // Position right after whitespace/punctuation
        const candidate = fwd + 1;
        const dist = Math.abs(candidate - midpoint);
        if (dist < minDistance) {
          minDistance = dist;
          bestIndex = candidate;
          break; // Found closest forward break
        }
      }

      // Check backward from midpoint
      const bwd = midpoint - offset;
      if (bwd > 0 && breakChars.has(text[bwd])) {
        const candidate = bwd + 1;
        const dist = Math.abs(candidate - midpoint);
        if (dist < minDistance) {
          minDistance = dist;
          bestIndex = candidate;
          break; // Found closest backward break
        }
      }
    }

    // Verify index doesn't split a Unicode surrogate pair
    if (bestIndex > 0 && bestIndex < len) {
      const prevCode = text.charCodeAt(bestIndex - 1);
      const currCode = text.charCodeAt(bestIndex);
      // High surrogate (0xD800-0xDBFF) followed by Low surrogate (0xDC00-0xDFFF)
      if (prevCode >= 0xD800 && prevCode <= 0xDBFF && currCode >= 0xDC00 && currCode <= 0xDFFF) {
        bestIndex++; // Move past the low surrogate
      }
    }

    return bestIndex;
  }

  /**
   * Embeds Variation Selector (VS) string into cover text at the optimal safe midpoint.
   *
   * @param {string} coverText Plain visible cover text
   * @param {string} vsString String of encoded Variation Selectors
   * @param {number} [customInsertionIndex] Optional explicit insertion index
   * @returns {string} Final steganographic message text
   */
  function insertVSAtMidpoint(coverText, vsString, customInsertionIndex) {
    if (!coverText) return vsString;
    if (!vsString) return coverText;

    const idx = (typeof customInsertionIndex === 'number' && customInsertionIndex >= 0)
      ? customInsertionIndex
      : findSafeMidpointInsertionIndex(coverText);

    return coverText.slice(0, idx) + vsString + coverText.slice(idx);
  }

  /**
   * Extracts hidden Variation Selectors from a steganographic message string,
   * returning both the clean visible cover text and the extracted VS bytes buffer.
   *
   * @param {string} stegoMsg Steganographic message containing hidden VS characters
   * @returns {{ cleanText: string, vsBytes: Uint8Array }}
   */
  function extractVSFromMessage(stegoMsg) {
    if (!stegoMsg) return { cleanText: '', vsBytes: new Uint8Array(0) };

    const cleanChars = [];
    const vsBytesList = [];

    // Helper functions from vs-codec.js
    const fromVS = (typeof exports.fromVariationSelector === 'function')
      ? exports.fromVariationSelector
      : (cp) => {
        if (cp >= 0xFE00 && cp <= 0xFE0F) return cp - 0xFE00;
        if (cp >= 0xE0100 && cp <= 0xE01EF) return 16 + (cp - 0xE0100);
        return null;
      };

    const isVS = (typeof exports.isVariationSelector === 'function')
      ? exports.isVariationSelector
      : (cp) => {
        return (cp >= 0xFE00 && cp <= 0xFE0F) || (cp >= 0xE0100 && cp <= 0xE01EF);
      };

    for (const char of stegoMsg) {
      const codePoint = char.codePointAt(0);
      if (isVS(codePoint)) {
        const byteVal = fromVS(codePoint);
        if (byteVal !== null) {
          vsBytesList.push(byteVal);
        }
      } else {
        cleanChars.push(char);
      }
    }

    return {
      cleanText: cleanChars.join(''),
      vsBytes: new Uint8Array(vsBytesList)
    };
  }

  // ══════════════════════════════════════════════════════════════
  // 5. WHATSAPP PLATFORM PROFILE & ADAPTIVE CHUNKING
  // ══════════════════════════════════════════════════════════════

  const WHATSAPP_PROFILE = {
    key: 'whatsapp',
    name: { en: 'WhatsApp', ar: 'واتساب' },
    // Threshold before "Read More" button fold triggers (UTF-16 units / chars)
    // First fold limit is ~4096 chars on mobile clients
    firstFoldLimit: 4096,
    // Maximum safe single message length before platform trim
    maxSendLimit: 65536,
    // Target maximum payload VS bytes per message chunk (default: 450 bytes)
    // 450 VS bytes = 450 VS code points. Hidden VS chars take 2 to 4 UTF-16 units each.
    // 450 * 3.5 units avg + 300 cover chars = ~1875 units, well within 4096 fold threshold!
    maxVsBytesPerChunk: 450,
    safetyMarginRatio: 0.15
  };

  /**
   * Calculates adaptive multi-message chunk distribution for a given payload.
   * Ensures each resulting stego message stays comfortably below the WhatsApp "Read More" fold threshold.
   *
   * @param {Uint8Array} encryptedPayload The complete encrypted payload
   * @param {Array<string>} coverTexts Array of user-provided cover texts (one per required message)
   * @param {Object} [profile] Platform profile (defaults to WHATSAPP_PROFILE)
   * @returns {Object} Chunking plan: { totalChunks, chunks: [{ index, coverText, chunkData, header, packet }] }
   */
  function computeAdaptiveChunks(encryptedPayload, coverTexts, profile = WHATSAPP_PROFILE) {
    const totalPayloadLen = encryptedPayload.length;
    const maxVsBytes = profile.maxVsBytesPerChunk || 450;

    // Calculate total chunks needed
    let totalChunks = Math.ceil(totalPayloadLen / maxVsBytes);
    if (totalChunks < 1) totalChunks = 1;

    // Ensure we have enough cover texts provided
    while (coverTexts.length < totalChunks) {
      // Repeat or prompt fallback cover texts
      coverTexts.push(coverTexts[coverTexts.length - 1] || 'هذا نص غلاف تلقائي لنقل بيانات الصورة المشفرة بأمان عبر المحادثة.');
    }

    const targetChunkSize = Math.ceil(totalPayloadLen / totalChunks);
    const chunks = [];
    let offset = 0;

    for (let i = 0; i < totalChunks; i++) {
      const currentChunkLen = (i === totalChunks - 1)
        ? (totalPayloadLen - offset)
        : Math.min(targetChunkSize, totalPayloadLen - offset);

      const chunkData = encryptedPayload.subarray(offset, offset + currentChunkLen);
      offset += currentChunkLen;

      const chunkCrc32 = computeCRC32(chunkData);

      chunks.push({
        index: i,
        coverText: coverTexts[i] || '',
        chunkData: chunkData,
        chunkDataLen: currentChunkLen,
        chunkCrc32: chunkCrc32
      });
    }

    return {
      totalChunks,
      totalPayloadLen,
      chunks
    };
  }

  // ══════════════════════════════════════════════════════════════
  // EXPORTS REGISTRATION
  // ══════════════════════════════════════════════════════════════

  exports.countCodePoints = countCodePoints;
  exports.countUtf16Units = countUtf16Units;
  exports.countUtf8Bytes = countUtf8Bytes;
  exports.countGraphemes = countGraphemes;
  exports.countWords = countWords;
  exports.validateMultiCoverText = validateMultiCoverText;

  exports.computeCRC32 = computeCRC32;
  exports.computeSha256Raw = computeSha256Raw;

  exports.MAGIC_BYTES = MAGIC_BYTES;
  exports.PROTOCOL_VERSION = PROTOCOL_VERSION;
  exports.HEADER_SIZE = HEADER_SIZE;

  exports.isMultiMessageMagic = isMultiMessageMagic;
  exports.buildChunkHeader = buildChunkHeader;
  exports.parseChunkHeader = parseChunkHeader;

  exports.findSafeMidpointInsertionIndex = findSafeMidpointInsertionIndex;
  exports.insertVSAtMidpoint = insertVSAtMidpoint;
  exports.extractVSFromMessage = extractVSFromMessage;

  exports.WHATSAPP_PROFILE = WHATSAPP_PROFILE;
  exports.computeAdaptiveChunks = computeAdaptiveChunks;

})(typeof exports !== 'undefined' ? exports : ((typeof self !== 'undefined' ? self : this).MultiMessageProtocol = {}));
