// ══════════════════════════════════════════════════════════════
// brotli-service.js — Compression and Decompression Functions
// ══════════════════════════════════════════════════════════════
// Contains: Normal block compression (Block) + stream compression (Stream)
// Depends on: wasm-engine.js (compress, decompress,
//   CompressStream, DecompressStream, BrotliStreamResultCode functions)
// ══════════════════════════════════════════════════════════════

// ===== Block Compression =====
class BrotliStreamResult {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(BrotliStreamResult.prototype);
        obj.__wbg_ptr = ptr;
        BrotliStreamResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BrotliStreamResultFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_brotlistreamresult_free(ptr, 0);
    }
    get buf() {
        const ret = wasm.__wbg_get_brotlistreamresult_buf(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    get code() {
        return wasm.__wbg_get_brotlistreamresult_code(this.__wbg_ptr);
    }
    get input_offset() {
        return wasm.__wbg_get_brotlistreamresult_input_offset(this.__wbg_ptr) >>> 0;
    }
}

// --- CompressStream Class ---
class CompressStream {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        CompressStreamFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_compressstream_free(ptr, 0);
    }
    compress(input_opt, output_size) {
        var ptr0 = isLikeNone(input_opt) ? 0 : passArray8ToWasm0(input_opt, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.compressstream_compress(this.__wbg_ptr, ptr0, len0, output_size);
        if (ret[2]) throw takeFromExternrefTable0(ret[1]);
        return BrotliStreamResult.__wrap(ret[0]);
    }
    constructor(quality) {
        const ret = wasm.compressstream_new(isLikeNone(quality) ? 0x100000001 : (quality) >>> 0);
        this.__wbg_ptr = ret >>> 0;
        CompressStreamFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    total_out() {
        return wasm.compressstream_total_out(this.__wbg_ptr) >>> 0;
    }
}

// --- DecompressStream Class ---
class DecompressStream {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        DecompressStreamFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_decompressstream_free(ptr, 0);
    }
    decompress(input, output_size) {
        const ptr0 = passArray8ToWasm0(input, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.decompressstream_decompress(this.__wbg_ptr, ptr0, len0, output_size);
        if (ret[2]) throw takeFromExternrefTable0(ret[1]);
        return BrotliStreamResult.__wrap(ret[0]);
    }
    constructor() {
        const ret = wasm.decompressstream_new();
        this.__wbg_ptr = ret >>> 0;
        DecompressStreamFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    total_out() {
        return wasm.decompressstream_total_out(this.__wbg_ptr) >>> 0;
    }
}

// ===== Stream Compression =====
function doStreamCompress(inputBytes) {
    const stream = new CompressStream(11);
    const CHUNK_SIZE = 4096;
    const OUTPUT_SIZE = 4096;
    const outputParts = [];
    let offset = 0;
    while (offset < inputBytes.length) {
        const end = Math.min(offset + CHUNK_SIZE, inputBytes.length);
        const chunk = inputBytes.slice(offset, end);
        let chunkOffset = 0;
        while (chunkOffset < chunk.length) {
            const input = chunk.slice(chunkOffset);
            const result = stream.compress(input, OUTPUT_SIZE);
            if (result.buf.length > 0) outputParts.push(new Uint8Array(result.buf));
            chunkOffset += result.input_offset;
            result.free();
        }
        offset = end;
    }
    let finishing = true;
    while (finishing) {
        const result = stream.compress(null, OUTPUT_SIZE);
        if (result.buf.length > 0) outputParts.push(new Uint8Array(result.buf));
        if (result.code === BrotliStreamResultCode.ResultSuccess) finishing = false;
        result.free();
    }
    stream.free();
    const totalLen = outputParts.reduce((sum, p) => sum + p.length, 0);
    const output = new Uint8Array(totalLen);
    let pos = 0;
    for (const part of outputParts) { output.set(part, pos); pos += part.length; }
    return output;
}

function doStreamDecompress(inputBytes) {
    const stream = new DecompressStream();
    const OUTPUT_SIZE = 4096;
    const outputParts = [];
    let offset = 0;
    while (offset < inputBytes.length) {
        const chunk = inputBytes.slice(offset);
        const result = stream.decompress(chunk, OUTPUT_SIZE);
        if (result.buf.length > 0) outputParts.push(new Uint8Array(result.buf));
        const consumed = result.input_offset;
        const code = result.code;
        result.free();
        offset += consumed;
        if (code === BrotliStreamResultCode.ResultSuccess) break;
        if (consumed === 0 && code !== BrotliStreamResultCode.NeedsMoreOutput) break;
    }
    stream.free();
    const totalLen = outputParts.reduce((sum, p) => sum + p.length, 0);
    const output = new Uint8Array(totalLen);
    let pos = 0;
    for (const part of outputParts) { output.set(part, pos); pos += part.length; }
    return output;
}

// --- Direct Block Compression Functions ---
function compress(buf, raw_options) {
    const ptr0 = passArray8ToWasm0(buf, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.compress(ptr0, len0, raw_options);
    if (ret[3]) throw takeFromExternrefTable0(ret[2]);
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
}

function decompress(buf) {
    const ptr0 = passArray8ToWasm0(buf, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.decompress(ptr0, len0);
    if (ret[3]) throw takeFromExternrefTable0(ret[2]);
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
}

function doBlockCompress(inputBytes) { return compress(inputBytes, { quality: 11 }); }
function doBlockDecompress(inputBytes) { return decompress(inputBytes); }

// ══════════════════════════════════════════════════════════════
// Async Capacity Estimation via Web Worker (Clean Code & High Performance)
// ══════════════════════════════════════════════════════════════

let _brotliCapacityWorker = null;
let _brotliReqId = 0;
const _brotliPendingRequests = new Map();

function _getCapacityWorker() {
    if (_brotliCapacityWorker) return _brotliCapacityWorker;
    if (typeof Worker === 'undefined') return null;

    try {
        _brotliCapacityWorker = new Worker('js/core/compression/brotli-capacity.worker.js');
        _brotliCapacityWorker.onmessage = function (e) {
            const { id, success, rawBytesLength, compressedBytesLength, finalBytesLength, isCompressed, savingsPercent, error } = e.data || {};
            if (_brotliPendingRequests.has(id)) {
                const { resolve, reject } = _brotliPendingRequests.get(id);
                _brotliPendingRequests.delete(id);
                if (success) {
                    resolve({ rawBytesLength, compressedBytesLength, finalBytesLength, isCompressed, savingsPercent });
                } else {
                    reject(new Error(error || 'Worker compression calculation failed'));
                }
            }
        };
        _brotliCapacityWorker.onerror = function (err) {
            console.warn('[brotli-service] Worker error, falling back to main thread:', err);
            _brotliCapacityWorker = null;
        };
    } catch (e) {
        console.warn('[brotli-service] Cannot initialize Web Worker (fallback enabled):', e);
        _brotliCapacityWorker = null;
    }
    return _brotliCapacityWorker;
}

/**
 * Synchronously calculate compressed payload size and savings.
 * Used as fallback or for immediate sync checks.
 *
 * @param {Uint8Array} payloadBytes
 * @returns {{ rawBytesLength: number, compressedBytesLength: number, finalBytesLength: number, isCompressed: boolean, savingsPercent: number }}
 */
function calculateCompressedPayloadSync(payloadBytes) {
    if (!payloadBytes || payloadBytes.length === 0) {
        return {
            rawBytesLength: 0,
            compressedBytesLength: 0,
            finalBytesLength: 0,
            isCompressed: false,
            savingsPercent: 0
        };
    }

    const rawLen = payloadBytes.length;
    let compressed;
    try {
        compressed = doStreamCompress(payloadBytes);
    } catch (e) {
        compressed = payloadBytes;
    }

    let finalLen = rawLen;
    let isCompressed = false;
    if (compressed && compressed.length < rawLen) {
        finalLen = compressed.length + 1; // 0xFE flag overhead
        isCompressed = true;
    }

    const savingsPercent = (rawLen > 0 && isCompressed)
        ? Math.max(0, ((rawLen - finalLen) / rawLen) * 100)
        : 0;

    return {
        rawBytesLength: rawLen,
        compressedBytesLength: compressed ? compressed.length : rawLen,
        finalBytesLength: finalLen,
        isCompressed,
        savingsPercent
    };
}

/**
 * Asynchronously calculates compressed payload metrics using a Web Worker.
 * Preserves O(1) Main Thread performance during user typing.
 *
 * @param {Uint8Array} payloadBytes
 * @returns {Promise<{ rawBytesLength: number, compressedBytesLength: number, finalBytesLength: number, isCompressed: boolean, savingsPercent: number }>}
 */
function calculateCompressedPayloadAsync(payloadBytes) {
    if (!payloadBytes || payloadBytes.length === 0) {
        return Promise.resolve({
            rawBytesLength: 0,
            compressedBytesLength: 0,
            finalBytesLength: 0,
            isCompressed: false,
            savingsPercent: 0
        });
    }

    const worker = _getCapacityWorker();
    if (!worker) {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(calculateCompressedPayloadSync(payloadBytes));
            }, 0);
        });
    }

    return new Promise((resolve, reject) => {
        const reqId = ++_brotliReqId;
        _brotliPendingRequests.set(reqId, { resolve, reject });
        worker.postMessage({ id: reqId, payloadBytes });
    });
}

