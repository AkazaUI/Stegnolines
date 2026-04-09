
    // ──────────────────────────────────────────────────────────────
    // TAB SWITCHING
    // ──────────────────────────────────────────────────────────────
    function switchTab(tab) {
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

      document.getElementById('tab-' + tab).classList.add('active');
      document.getElementById('tab-' + tab).setAttribute('aria-selected', 'true');
      document.getElementById('panel-' + tab).classList.add('active');
    }



    // ──────────────────────────────────────────────────────────────
    // STRING ⇋ BINARY  (UTF-8)
    // ──────────────────────────────────────────────────────────────

    /**
     * String → binary.
     * UTF-8 Encoding (8 bits per byte)
     */
    function stringToBinary(str) {
      if (!str) return '';
      const bytes = new TextEncoder().encode(str);
      let bin = '';
      for (let i = 0; i < bytes.length; i++) {
        bin += bytes[i].toString(2).padStart(8, '0');
      }
      return bin;
    }

    /** Binary string → readable text (UTF-8). */
    function binaryToString(bin) {
      if (!bin) return '';
      const bytes = new Uint8Array(Math.floor(bin.length / 8));
      for (let i = 0; i + 8 <= bin.length; i += 8) {
        bytes[i / 8] = parseInt(bin.substring(i, i + 8), 2);
      }
      return new TextDecoder().decode(bytes);
    }


    // ──────────────────────────────────────────────────────────────
    // VARIATION SELECTORS  (Unicode Steganography)
    // ──────────────────────────────────────────────────────────────

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
     * Build the final output based on emoji mode.
     * - No emoji: [VS key] + [cover text]
     * - With emoji: [cover text] + [emoji + VS key]
     */
    function buildFinalOutput(coverText, vsKeyStr, emoji) {
      if (!emoji || emoji === 'none') {
        // بدون إيموجي: المفتاح المخفي ثم نص الغلاف
        return vsKeyStr + coverText;
      } else {
        // مع إيموجي: نص الغلاف ثم الإيموجي + المفتاح المخفي
        return coverText + emoji + vsKeyStr;
      }
    }


    // ──────────────────────────────────────────────────────────────
    // SEEDED PRNG  (Mulberry32)
    // ──────────────────────────────────────────────────────────────

    function passwordToSeed(pw) {
      let h = 5381;
      for (let i = 0; i < pw.length; i++)
        h = ((h << 5) + h + pw.charCodeAt(i)) | 0;
      return h >>> 0;
    }

    function mulberry32(seed) {
      let s = seed | 0;
      return function () {
        s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }


    // ──────────────────────────────────────────────────────────────
    // UNIQUE RANDOM POSITIONS  (Partial Fisher-Yates)
    // ──────────────────────────────────────────────────────────────

    /**
     * Generate `count` unique positions in [0, maxLen-1].
     * Seeded by password → deterministic.
     */
    function generatePositions(maxLen, count, password) {
      const rng = mulberry32(passwordToSeed(password));
      const pool = Array.from({ length: maxLen }, (_, i) => i);
      const out = [];
      for (let i = 0; i < count && i < maxLen; i++) {
        const j = i + Math.floor(rng() * (maxLen - i));
        [pool[i], pool[j]] = [pool[j], pool[i]];
        out.push(pool[i]);
      }
      return out;
    }


    // ──────────────────────────────────────────────────────────────
    // XOR KEY GENERATION
    // ──────────────────────────────────────────────────────────────

    /**
     * Compare cover bit at each position with the desired message bit.
     * If they match → '0', if they differ → '1'.
     * Result: a binary string (only 0s and 1s) — easy to compress.
     */
    function generateXORKey(coverBits, basePositions, msgBits) {
      let key = '';
      for (let i = 0; i < msgBits.length; i++) {
        const coverBit = coverBits[basePositions[i]];
        const msgBit   = msgBits[i];
        key += (coverBit === msgBit) ? '0' : '1';
      }
      return key;
    }


    // ──────────────────────────────────────────────────────────────
    // EMOJI STATE
    // ──────────────────────────────────────────────────────────────
    let selectedCarrierEmoji = 'none'; // 'none' or an emoji character


    // ──────────────────────────────────────────────────────────────
    // EMBEDDING  (XOR-Based + VS Key Embedding)
    // ──────────────────────────────────────────────────────────────

    function generateShiftMap() {
      const coverText = document.getElementById('embedCover').value;
      const secret    = document.getElementById('embedSecret').value;
      const password  = document.getElementById('embedPassword').value;

      if (!coverText.trim()) return showToast('⚠ الرجاء إدخال النص الغلاف.');
      if (!secret.trim())    return showToast('⚠ الرجاء إدخال الرسالة السرية.');
      if (!password.trim())  return showToast('⚠ الرجاء إدخال كلمة المرور.');

      // 1. Convert BOTH to binary
      const coverBits = stringToBinary(coverText);
      const msgBits   = stringToBinary(secret);

      // 2. Capacity check (bits vs bits)
      if (msgBits.length > coverBits.length) {
        showToast(`❌ تحتاج ${msgBits.length} بت لكن الغلاف يحتوي ${coverBits.length} بت فقط.`);
        return;
      }

      // 3. Generate N unique positions in [0, coverBits.length - 1]
      const basePositions = generatePositions(coverBits.length, msgBits.length, password);

      // 4. XOR key: compare cover bit with message bit
      const xorKey = generateXORKey(coverBits, basePositions, msgBits);

      // 5. Output — Base Positions & Binary XOR Key
      document.getElementById('baseMapOutput').value =
        '[' + basePositions.join(', ') + ']';
      document.getElementById('shiftKeyOutput').value = xorKey;

      // 6. Convert XOR key → VS characters
      const { vsStr, bytesArr } = xorKeyToVSString(xorKey);

      // 7. Build Visual Hex Display
      updateVSVisualization(xorKey, bytesArr);

      // 8. Build Final Output
      const finalOutput = buildFinalOutput(coverText, vsStr, selectedCarrierEmoji);
      document.getElementById('finalOutput').value = finalOutput;

      // 9. Update Key Size Meter
      updateKeySizeMeter(bytesArr.length, coverText.length);

      updateCapacityMeter();
      showToast('✅ تم توليد المفتاح وتضمينه في الغلاف!');
    }


    /**
     * Update the VS Visualization box with hex representation.
     */
    function updateVSVisualization(binaryKey, bytesArr) {
      const vizBox = document.getElementById('vsVisualization');
      if (!vizBox) return;

      // Build visualization lines
      let lines = [];
      lines.push(`── المفتاح الثنائي (${binaryKey.length} بت) ──`);

      // Show bytes in groups
      let hexLine = '';
      let binLine = '';
      for (let i = 0; i < bytesArr.length; i++) {
        const hexVal = '0x' + bytesArr[i].toString(16).toUpperCase().padStart(2, '0');
        const binVal = bytesArr[i].toString(2).padStart(8, '0');
        const vsCodePoint = bytesArr[i] < 16
          ? 'U+' + (VS_START + bytesArr[i]).toString(16).toUpperCase()
          : 'U+' + (VS_SUP_START + bytesArr[i] - 16).toString(16).toUpperCase();

        lines.push(`بايت ${(i+1).toString().padStart(3)}: ${binVal}  →  ${hexVal}  →  VS[${vsCodePoint}]`);
      }

      lines.push('');
      lines.push(`── المجموع: ${bytesArr.length} بايت = ${bytesArr.length} حرف VS مخفي ──`);

      vizBox.value = lines.join('\n');
    }


    /**
     * Update the key size meter.
     */
    function updateKeySizeMeter(keyBytes, coverLen) {
      const countEl = document.getElementById('vsKeyCount');
      const meterEl = document.getElementById('vsKeyMeter');
      if (!countEl || !meterEl) return;

      countEl.textContent = `${keyBytes} bytes / ${coverLen} chars`;

      // Ratio: key bytes vs cover characters
      const ratio = coverLen > 0 ? Math.min(100, (keyBytes / coverLen) * 100) : 0;
      meterEl.style.width = ratio + '%';
      meterEl.style.background = ratio > 80 ? '#ef4444' : (ratio > 50 ? '#eab308' : '#00cc34');
    }


    // ──────────────────────────────────────────────────────────────
    // EXTRACTION  (Smart — auto-detect VS key in message)
    // ──────────────────────────────────────────────────────────────

    /**
     * Smart extraction:
     * 1. Extract VS bytes from the final message → XOR key
     * 2. Clean text (without VS) = cover text (may have trailing emoji)
     * 3. Regenerate positions using password + cover bits length
     * 4. XOR to recover secret
     */
    function extractSecretMessage() {
      const finalMessage = document.getElementById('extractCover').value;
      const password     = document.getElementById('extractPassword').value;

      if (!finalMessage.trim()) return showToast('⚠ الرجاء إدخال الرسالة النهائية.');
      if (!password.trim())     return showToast('⚠ الرجاء إدخال كلمة المرور.');

      try {
        // 1. Extract VS bytes and clean text
        const { vsBytes, cleanText } = extractVSFromText(finalMessage);

        let xorKeyBinary = '';
        let coverText = cleanText;

        if (vsBytes.length > 0) {
          // Auto-detection: VS bytes found → reconstruct binary key
          for (let i = 0; i < vsBytes.length; i++) {
            xorKeyBinary += vsBytes[i].toString(2).padStart(8, '0');
          }

          // Show the extracted key in the key field for visibility
          const keyField = document.getElementById('extractShiftKey');
          if (keyField) keyField.value = xorKeyBinary;

        } else {
          // Fallback: no VS bytes found, try reading from the key field
          const keyRaw = document.getElementById('extractShiftKey').value.trim();
          if (!keyRaw) return showToast('⚠ لا توجد أحرف VS مخفية ولم يتم إدخال مفتاح يدوي.');
          xorKeyBinary = keyRaw.replace(/[^01]/g, '');
          if (xorKeyBinary.length === 0)
            throw new Error('المفتاح غير صالح — يجب أن يحتوي على 0 و 1 فقط.');
        }

        // 2. Convert cover to bits
        const coverBits = stringToBinary(coverText);

        if (xorKeyBinary.length > coverBits.length)
          throw new Error(`المفتاح يحتوي ${xorKeyBinary.length} بت لكن الغلاف يحتوي ${coverBits.length} بت فقط.`);

        // 3. Regenerate same positions
        const basePositions = generatePositions(coverBits.length, xorKeyBinary.length, password);

        // 4. Reconstruct message bits
        let binaryStr = '';
        for (let i = 0; i < xorKeyBinary.length; i++) {
          const coverBit = coverBits[basePositions[i]];
          const keyBit   = xorKeyBinary[i];
          binaryStr += (coverBit === keyBit) ? '0' : '1';
        }

        // 5. Decode bits → text
        // Trim the binary key to actual message length (remove padding bits)
        const decoded = binaryToString(binaryStr);
        document.getElementById('extractResultCard').style.display = 'block';
        document.getElementById('extractedResult').textContent = decoded;
        showToast('✅ تم استخراج الرسالة بنجاح!');
      } catch (e) {
        showToast('❌ ' + e.message);
      }
    }


    // ──────────────────────────────────────────────────────────────
    // CAPACITY METER  (Bit-level)
    // ──────────────────────────────────────────────────────────────

    function updateCapacityMeter() {
      const coverText = document.getElementById('embedCover').value;
      const secret    = document.getElementById('embedSecret').value;

      // Cover bits (full binary representation of cover)
      const coverBitsCount = stringToBinary(coverText).length;

      // Message bits (actual encoding)
      const msgBits = secret.length > 0 ? stringToBinary(secret).length : 0;

      // Bits per char for the message language
      const bpc = 8; // UTF-8 base bit length (1 byte)

      // Max message chars at this encoding
      const maxChars = coverBitsCount > 0 ? Math.floor(coverBitsCount / bpc) : 0;

      // Usage %
      const pct = coverBitsCount > 0 ? Math.min(100, (msgBits / coverBitsCount) * 100) : 0;

      // Update DOM
      document.getElementById('mCoverLen').textContent = coverBitsCount.toLocaleString();
      document.getElementById('mMaxChars').textContent =
        maxChars.toLocaleString() + ` (byte)`;
      document.getElementById('mMsgBits').textContent = msgBits.toLocaleString();
      document.getElementById('mUsage').textContent = `${msgBits} / ${coverBitsCount}`;
      document.getElementById('meterPercent').textContent = pct.toFixed(1) + '%';

      const fill = document.getElementById('meterFill');
      fill.style.width = pct + '%';
      fill.classList.remove('warn', 'danger');
      if (pct > 90) fill.classList.add('danger');
      else if (pct > 70) fill.classList.add('warn');
    }


    // ──────────────────────────────────────────────────────────────
    // EMOJI SELECTION
    // ──────────────────────────────────────────────────────────────

    function selectCarrierEmoji(emoji) {
      selectedCarrierEmoji = emoji;

      // Update button states
      document.querySelectorAll('.emoji-selector-btn').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.emoji === emoji) btn.classList.add('selected');
      });
    }


    // ──────────────────────────────────────────────────────────────
    // TOGGLE DETAILS (Base Map + Binary Key)
    // ──────────────────────────────────────────────────────────────

    let detailsVisible = false;

    function toggleDetails() {
      detailsVisible = !detailsVisible;
      const sections = document.querySelectorAll('.detail-section');
      const btn = document.getElementById('toggleDetailsBtn');
      sections.forEach(s => {
        s.style.display = detailsVisible ? 'block' : 'none';
      });
      btn.textContent = detailsVisible ? '🔽 إخفاء التفاصيل' : '🔼 عرض التفاصيل (Base Map + XOR Key)';
    }


    // ──────────────────────────────────────────────────────────────
    // COPY TO EXTRACT TAB
    // ──────────────────────────────────────────────────────────────

    function copyToExtractTab() {
      const finalOutput = document.getElementById('finalOutput').value;
      if (!finalOutput) return showToast('⚠ لا يوجد ناتج نهائي للنسخ.');

      // Copy password too
      const password = document.getElementById('embedPassword').value;

      // Switch to extract tab
      switchTab('extract');

      // Fill in the fields
      document.getElementById('extractCover').value = finalOutput;
      document.getElementById('extractPassword').value = password;

      showToast('📋 تم نسخ الناتج وكلمة المرور إلى صفحة الفك!');
    }


    // ──────────────────────────────────────────────────────────────
    // UTILITIES
    // ──────────────────────────────────────────────────────────────

    function copyToClipboard(elementId) {
      const el = document.getElementById(elementId);
      const text = el.value || el.textContent;
      if (!text) return showToast('⚠ Nothing to copy.');
      navigator.clipboard.writeText(text).then(
        () => showToast('📋 Copied!'),
        () => showToast('❌ Copy failed.')
      );
    }

    function showToast(message) {
      document.querySelectorAll('.toast-msg').forEach(el => el.remove());
      const toast = document.createElement('div');
      toast.className = 'toast-msg';
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2800);
    }

    // Initialize
    updateCapacityMeter();