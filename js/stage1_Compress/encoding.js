// ============================================================
// encoding.js — دوال التحويل والترميز
// ============================================================
// يحتوي على: متغيرات الحالة، Base32، صيغ الإخراج
// (ASCII, Bits, Base64, Base32, Unicode)، تحويل المدخلات
// يعتمد على: لا شيء (مستقل)
// ============================================================

// ===== متغيرات عامة =====
let wasmReady = false;
let lastResultBytes = null;
let currentFormat = 'base64';

// ===== جدول Base32 (RFC 4648) =====
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function bytesToBase32(bytes) {
    let result = '';
    let bits = 0;
    let value = 0;
    for (let i = 0; i < bytes.length; i++) {
        value = (value << 8) | bytes[i];
        bits += 8;
        while (bits >= 5) {
            bits -= 5;
            result += BASE32_ALPHABET[(value >>> bits) & 0x1f];
        }
    }
    if (bits > 0) result += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
    while (result.length % 8 !== 0) result += '=';
    return result;
}

function base32ToBytes(str) {
    str = str.replace(/=+$/, '').replace(/\s/g, '').toUpperCase();
    const output = [];
    let bits = 0, value = 0;
    for (let i = 0; i < str.length; i++) {
        const idx = BASE32_ALPHABET.indexOf(str[i]);
        if (idx === -1) throw new Error('حرف غير صالح في Base32: ' + str[i]);
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) { bits -= 8; output.push((value >>> bits) & 0xff); }
    }
    return new Uint8Array(output);
}

// ===== دوال تحويل صيغ العرض =====
function bytesToAscii(bytes) {
    let result = '';
    for (let i = 0; i < bytes.length; i++)
        result += (bytes[i] >= 32 && bytes[i] <= 126) ? String.fromCharCode(bytes[i]) : '.';
    return result;
}

function bytesToBits(bytes) {
    const parts = [];
    for (let i = 0; i < bytes.length; i++) parts.push(bytes[i].toString(2).padStart(8, '0'));
    return parts.join(' ');
}

function bytesToBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}

function bytesToUnicode(bytes) {
    const parts = [];
    for (let i = 0; i < bytes.length; i++) parts.push('U+' + bytes[i].toString(16).toUpperCase().padStart(4, '0'));
    return parts.join(' ');
}

function formatOutput(bytes) {
    switch (currentFormat) {
        case 'ascii': return bytesToAscii(bytes);
        case 'bits': return bytesToBits(bytes);
        case 'base64': return bytesToBase64(bytes);
        case 'base32': return bytesToBase32(bytes);
        case 'unicode': return bytesToUnicode(bytes);
        default: return bytesToBase64(bytes);
    }
}

// ===== دوال تحويل المدخلات =====
function bitsToBytes(bitString) {
    const clean = bitString.replace(/[^01]/g, '');
    if (clean.length === 0) throw new Error('لا توجد بتات صالحة في المدخل');
    const bytes = [];
    for (let i = 0; i < clean.length; i += 8) {
        bytes.push(parseInt(clean.substring(i, i + 8).padEnd(8, '0'), 2));
    }
    return new Uint8Array(bytes);
}

function base64ToBytes(b64) {
    const binary = atob(b64.trim());
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function textToBytes(text) { return new TextEncoder().encode(text); }

function unicodeToBytes(str) {
    const parts = str.trim().split(/\s+/);
    const bytes = [];
    for (const part of parts) {
        const val = parseInt(part.replace(/^U\+/i, ''), 16);
        if (isNaN(val) || val < 0 || val > 255) throw new Error('قيمة Unicode غير صالحة: ' + part);
        bytes.push(val);
    }
    return new Uint8Array(bytes);
}

// ===== قراءة المدخلات =====
function getInputBytes() {
    const inputText = document.getElementById('input-text').value;
    const inputType = document.getElementById('input-type').value;
    if (!inputText.trim()) throw new Error('الرجاء إدخال البيانات أولاً');
    switch (inputType) {
        case 'text': return textToBytes(inputText);
        case 'bits': return bitsToBytes(inputText);
        case 'base64': return base64ToBytes(inputText);
        case 'base32': return base32ToBytes(inputText);
        case 'unicode': return unicodeToBytes(inputText);
        default: return textToBytes(inputText);
    }
}
