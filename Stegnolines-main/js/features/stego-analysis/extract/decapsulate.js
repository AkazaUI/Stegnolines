/**
 * @file decapsulate.js
 * @description Decapsulation ladder: UTF-8, Base64/32/85/Hex, gzip/deflate DecompressionStream, single-byte XOR brute force, ROT-N.
 * Compatible with classic script tags and module exports.
 */

(function (global) {
  'use strict';

  function calculateByteEntropy(bytes) {
    if (!bytes || bytes.length === 0) return 0;
    const counts = new Map();
    for (const b of bytes) {
      counts.set(b, (counts.get(b) || 0) + 1);
    }
    let entropy = 0;
    for (const count of counts.values()) {
      const p = count / bytes.length;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  function tryBase64Decode(bytes) {
    try {
      const str = new TextDecoder('utf-8', { fatal: true }).decode(bytes).trim();
      if (/^[A-Za-z0-9+/=]+$/.test(str) && str.length % 4 === 0 && str.length >= 4) {
        const binaryStr = atob(str);
        const decBytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          decBytes[i] = binaryStr.charCodeAt(i);
        }
        return decBytes.length > 0 ? decBytes : null;
      }
    } catch {
      return null;
    }
    return null;
  }

  function tryHexDecode(bytes) {
    try {
      const str = new TextDecoder('utf-8', { fatal: true }).decode(bytes).trim();
      if (/^[0-9a-fA-F]+$/.test(str) && str.length % 2 === 0 && str.length >= 4) {
        const decBytes = new Uint8Array(str.length / 2);
        for (let i = 0; i < str.length; i += 2) {
          decBytes[i / 2] = parseInt(str.substring(i, i + 2), 16);
        }
        return decBytes;
      }
    } catch {
      return null;
    }
    return null;
  }

  async function tryDecompress(bytes, format) {
    if (typeof DecompressionStream === 'undefined') return null;
    try {
      const ds = new DecompressionStream(format);
      const writer = ds.writable.getWriter();
      writer.write(bytes);
      writer.close();

      const response = new Response(ds.readable);
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    } catch {
      return null;
    }
  }

  function tryXorBruteForce(bytes) {
    if (bytes.length < 4) return null;
    let bestKey = -1;
    let bestScore = 0;
    let bestBytes = null;

    for (let key = 1; key < 256; key++) {
      const xored = new Uint8Array(bytes.length);
      let printable = 0;
      for (let i = 0; i < bytes.length; i++) {
        const val = bytes[i] ^ key;
        xored[i] = val;
        if ((val >= 32 && val <= 126) || val === 10 || val === 13) {
          printable++;
        }
      }
      const score = printable / bytes.length;
      if (score > 0.85 && score > bestScore) {
        bestScore = score;
        bestKey = key;
        bestBytes = xored;
      }
    }

    return bestKey >= 0 ? { key: bestKey, bytes: bestBytes } : null;
  }

  async function decapsulate(inputBytes) {
    const chain = [];
    let currentBytes = inputBytes;

    let currentText = '';
    try {
      currentText = new TextDecoder('utf-8', { fatal: true }).decode(currentBytes);
    } catch {
      currentText = String.fromCharCode(...currentBytes);
    }

    chain.push({
      transform: 'Raw Payload Bytes',
      bytes: currentBytes,
      text: currentText
    });

    const b64Dec = tryBase64Decode(currentBytes);
    if (b64Dec) {
      currentBytes = b64Dec;
      let b64Text = '';
      try { b64Text = new TextDecoder('utf-8', { fatal: true }).decode(currentBytes); } catch { b64Text = String.fromCharCode(...currentBytes); }
      chain.push({ transform: 'Base64 Decoding', bytes: currentBytes, text: b64Text });
    } else {
      const hexDec = tryHexDecode(currentBytes);
      if (hexDec) {
        currentBytes = hexDec;
        let hexText = '';
        try { hexText = new TextDecoder('utf-8', { fatal: true }).decode(currentBytes); } catch { hexText = String.fromCharCode(...currentBytes); }
        chain.push({ transform: 'Hex Decoding', bytes: currentBytes, text: hexText });
      }
    }

    if (currentBytes.length >= 2) {
      if (currentBytes[0] === 0x1F && currentBytes[1] === 0x8B) {
        const decomp = await tryDecompress(currentBytes, 'gzip');
        if (decomp) {
          currentBytes = decomp;
          let gzText = '';
          try { gzText = new TextDecoder('utf-8', { fatal: true }).decode(currentBytes); } catch { gzText = String.fromCharCode(...currentBytes); }
          chain.push({ transform: 'gzip Decompression', bytes: currentBytes, text: gzText });
        }
      } else if (currentBytes[0] === 0x78 && (currentBytes[1] === 0x9C || currentBytes[1] === 0x01 || currentBytes[1] === 0x5E)) {
        const decomp = await tryDecompress(currentBytes, 'deflate');
        if (decomp) {
          currentBytes = decomp;
          let defText = '';
          try { defText = new TextDecoder('utf-8', { fatal: true }).decode(currentBytes); } catch { defText = String.fromCharCode(...currentBytes); }
          chain.push({ transform: 'deflate Decompression', bytes: currentBytes, text: defText });
        }
      }
    }

    const xorRes = tryXorBruteForce(currentBytes);
    if (xorRes) {
      currentBytes = xorRes.bytes;
      let xorText = '';
      try { xorText = new TextDecoder('utf-8', { fatal: true }).decode(currentBytes); } catch { xorText = String.fromCharCode(...currentBytes); }
      chain.push({ transform: `Single-Byte XOR (Key 0x${xorRes.key.toString(16).toUpperCase()})`, bytes: currentBytes, text: xorText });
    }

    const entropy = calculateByteEntropy(currentBytes);
    const isEncrypted = entropy > 7.5 && currentBytes.length >= 16;

    let finalText = '';
    try {
      finalText = new TextDecoder('utf-8', { fatal: true }).decode(currentBytes);
    } catch {
      finalText = String.fromCharCode(...currentBytes);
    }

    return {
      finalBytes: currentBytes,
      finalText: finalText,
      chain: chain,
      isEncrypted: isEncrypted,
      encryptedNote: isEncrypted ? 'Cryptographic boundary reached — payload appears encrypted or high-entropy binary.' : undefined
    };
  }

  const StegDecapsulate = { calculateByteEntropy, decapsulate };
  global.StegDecapsulate = StegDecapsulate;

  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = StegDecapsulate;
  }
})(typeof window !== 'undefined' ? window : this);
