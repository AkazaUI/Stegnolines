
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
    // STRING ⇋ BINARY  (7-bit ASCII for ≤127, 16-bit for >127)
    // ──────────────────────────────────────────────────────────────

    /**
     * String → binary.
     * charCode ≤ 127 → 7 bits (ASCII-128),
     * charCode > 127 → 16 bits (Unicode).
     */
    function stringToBinary(str) {
      let bin = '';
      for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        bin += c > 127
          ? c.toString(2).padStart(16, '0')
          : c.toString(2).padStart(7, '0');
      }
      return bin;
    }

    /** Binary string → readable text (7 bits at a time for ASCII-128). */
    function binaryToString(bin) {
      let result = '';
      for (let i = 0; i + 7 <= bin.length; i += 7) {
        result += String.fromCharCode(parseInt(bin.substring(i, i + 7), 2));
      }
      return result;
    }

    /** Returns 16 if any char > 127, else 7. */
    function detectBitsPerChar(str) {
      for (let i = 0; i < str.length; i++) {
        if (str.charCodeAt(i) > 127) return 16;
      }
      return 7;
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
    // EMBEDDING  (XOR-Based — Binary Key)
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
      //    0 = match (correct), 1 = mismatch (flip needed)
      const xorKey = generateXORKey(coverBits, basePositions, msgBits);

      // 5. Output
      document.getElementById('baseMapOutput').value =
        '[' + basePositions.join(', ') + ']';
      document.getElementById('shiftKeyOutput').value = xorKey;
      updateCapacityMeter();
      showToast('✅ تم توليد المفتاح الثنائي!');
    }


    // ──────────────────────────────────────────────────────────────
    // EXTRACTION  (XOR-Based — Binary Key)
    // ──────────────────────────────────────────────────────────────

    /**
     * 1. Convert cover to bits
     * 2. Regenerate same base positions (same password, same count)
     * 3. Read cover bit at base position, XOR with key bit
     * 4. Collect bits → text
     */
    function extractSecretMessage() {
      const coverText = document.getElementById('extractCover').value;
      const password  = document.getElementById('extractPassword').value;
      const keyRaw    = document.getElementById('extractShiftKey').value.trim();

      if (!coverText.trim()) return showToast('⚠ الرجاء إدخال النص الغلاف.');
      if (!password.trim())  return showToast('⚠ الرجاء إدخال كلمة المرور.');
      if (!keyRaw)           return showToast('⚠ الرجاء لصق المفتاح الثنائي.');

      try {
        // Clean key: keep only 0s and 1s
        const xorKey = keyRaw.replace(/[^01]/g, '');
        if (xorKey.length === 0)
          throw new Error('المفتاح غير صالح — يجب أن يحتوي على 0 و 1 فقط.');

        // Convert cover to bits
        const coverBits = stringToBinary(coverText);

        if (xorKey.length > coverBits.length)
          throw new Error(`المفتاح يحتوي ${xorKey.length} بت لكن الغلاف يحتوي ${coverBits.length} بت فقط.`);

        // Regenerate same positions
        const basePositions = generatePositions(coverBits.length, xorKey.length, password);

        // Reconstruct message bits: coverBit XOR keyBit
        // If key=0 → cover bit IS the message bit (match)
        // If key=1 → cover bit is FLIPPED → flip it back
        let binaryStr = '';
        for (let i = 0; i < xorKey.length; i++) {
          const coverBit = coverBits[basePositions[i]];
          const keyBit   = xorKey[i];
          // XOR: same → '0', different → '1'
          binaryStr += (coverBit === keyBit) ? '0' : '1';
        }

        // Decode bits → text
        const decoded = binaryToString(binaryStr);
        document.getElementById('extractResultCard').style.display = 'block';
        document.getElementById('extractedResult').textContent = decoded;
        showToast('✅ تم استخراج الرسالة بنجاح!');
      } catch (e) {
        showToast('❌ ' + e.message);
      }
    }


    // ──────────────────────────────────────────────────────────────
    // CAPACITY METER  (Bit-level, language-aware)
    // ──────────────────────────────────────────────────────────────

    function updateCapacityMeter() {
      const coverText = document.getElementById('embedCover').value;
      const secret    = document.getElementById('embedSecret').value;

      // Cover bits (full binary representation of cover)
      const coverBitsCount = stringToBinary(coverText).length;

      // Message bits (actual encoding)
      const msgBits = secret.length > 0 ? stringToBinary(secret).length : 0;

      // Bits per char for the message language
      const bpc = secret.length > 0 ? detectBitsPerChar(secret) : 8;

      // Max message chars at this encoding
      const maxChars = coverBitsCount > 0 ? Math.floor(coverBitsCount / bpc) : 0;

      // Usage %
      const pct = coverBitsCount > 0 ? Math.min(100, (msgBits / coverBitsCount) * 100) : 0;

      // Update DOM
      document.getElementById('mCoverLen').textContent = coverBitsCount.toLocaleString();
      document.getElementById('mMaxChars').textContent =
        maxChars.toLocaleString() + ` (${bpc}bit)`;
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
    // UTILITIES
    // ──────────────────────────────────────────────────────────────

    function copyToClipboard(elementId) {
      const text = document.getElementById(elementId).value;
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
 