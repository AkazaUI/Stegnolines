
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
    // SHIFT SEARCH  (±9 on the BIT string)
    // ──────────────────────────────────────────────────────────────

    const MAX_SHIFT = 9;

    /**
     * In the cover's BIT string, from position `basePos`,
     * find the nearest bit that equals `desiredBit`.
     * Searches ±1, ±2 … ±9, both directions simultaneously.
     */
    function findNearestShift(coverBits, basePos, desiredBit) {
      const len = coverBits.length;
      if (parseInt(coverBits[basePos], 10) === desiredBit) return 0;

      for (let d = 1; d <= MAX_SHIFT; d++) {
        const fwd = basePos + d;
        const bwd = basePos - d;
        if (fwd < len && parseInt(coverBits[fwd], 10) === desiredBit) return +d;
        if (bwd >= 0 && parseInt(coverBits[bwd], 10) === desiredBit) return -d;
      }
      return null; // Virtually impossible with real text
    }


    // ──────────────────────────────────────────────────────────────
    // SHIFT KEY ENCODING  (2-digit pairs)
    // ──────────────────────────────────────────────────────────────

    /** [0, -1, 3] → "001103" */
    function encodeShifts(shifts) {
      return shifts.map(s => (s < 0 ? '1' : '0') + Math.abs(s)).join('');
    }

    /** "001103" → [0, -1, 3] */
    function decodeShifts(str) {
      const shifts = [];
      for (let i = 0; i < str.length; i += 2) {
        const mag = parseInt(str[i + 1], 10);
        if (isNaN(mag)) throw new Error(`Bad digit at ${i + 1}`);
        shifts.push(str[i] === '1' ? -mag : mag);
      }
      return shifts;
    }


    // ──────────────────────────────────────────────────────────────
    // EMBEDDING  (Bit-Level — no fallback needed)
    // ──────────────────────────────────────────────────────────────

    function generateShiftMap() {
      const coverText = document.getElementById('embedCover').value;
      const secret    = document.getElementById('embedSecret').value;
      const password  = document.getElementById('embedPassword').value;

      if (!coverText.trim()) return showToast('⚠ Please provide cover text.');
      if (!secret.trim())    return showToast('⚠ Please enter a secret message.');
      if (!password.trim())  return showToast('⚠ Please enter a password.');

      // 1. Convert BOTH to binary
      const coverBits = stringToBinary(coverText);
      const msgBits   = stringToBinary(secret);

      // 2. Capacity check (bits vs bits)
      if (msgBits.length > coverBits.length) {
        showToast(`❌ Need ${msgBits.length} bits but cover has ${coverBits.length} bits.`);
        return;
      }

      // 3. Generate N unique positions in [0, coverBits.length - 1]
      //    N = number of message bits
      const basePositions = generatePositions(coverBits.length, msgBits.length, password);

      // 4. Find shift for each bit
      const shifts = [];
      for (let i = 0; i < msgBits.length; i++) {
        const desiredBit = parseInt(msgBits[i], 10);
        const shift = findNearestShift(coverBits, basePositions[i], desiredBit);

        if (shift === null) {
          // Should never happen with real text, but handle gracefully
          showToast(`❌ No match within ±${MAX_SHIFT} at bit position ${basePositions[i]}.`);
          return;
        }
        shifts.push(shift);
      }

      // 5. Output
      document.getElementById('baseMapOutput').value =
        '[' + basePositions.join(', ') + ']';
      document.getElementById('shiftKeyOutput').value = encodeShifts(shifts);
      updateCapacityMeter();
      showToast('✅ Shift key generated!');
    }


    // ──────────────────────────────────────────────────────────────
    // EXTRACTION  (Simple — no fallback needed)
    // ──────────────────────────────────────────────────────────────

    /**
     * 1. Convert cover to bits
     * 2. Regenerate same base positions (same password, same count)
     * 3. actualBitPos = basePos + shift → read bit
     * 4. Collect bits → text
     */
    function extractSecretMessage() {
      const coverText = document.getElementById('extractCover').value;
      const password  = document.getElementById('extractPassword').value;
      const shiftRaw  = document.getElementById('extractShiftKey').value.trim();

      if (!coverText.trim()) return showToast('⚠ Please provide the cover text.');
      if (!password.trim())  return showToast('⚠ Please enter the password.');
      if (!shiftRaw)         return showToast('⚠ Please paste the shift key.');

      try {
        const cleanKey = shiftRaw.replace(/[\[\]\s,]/g, '');
        if (cleanKey.length % 2 !== 0)
          throw new Error('Key length must be even (2 digits per shift).');
        const shifts = decodeShifts(cleanKey);

        // Convert cover to bits
        const coverBits = stringToBinary(coverText);

        if (shifts.length > coverBits.length)
          throw new Error(`Key has ${shifts.length} shifts but cover has ${coverBits.length} bits.`);

        // Regenerate same positions
        const basePositions = generatePositions(coverBits.length, shifts.length, password);

        // Read bits
        let binaryStr = '';
        for (let i = 0; i < shifts.length; i++) {
          const actualPos = basePositions[i] + shifts[i];
          if (actualPos < 0 || actualPos >= coverBits.length)
            throw new Error(`Bit position ${actualPos} out of range [0, ${coverBits.length - 1}].`);
          binaryStr += coverBits[actualPos];
        }

        // Decode
        const decoded = binaryToString(binaryStr);
        document.getElementById('extractResultCard').style.display = 'block';
        document.getElementById('extractedResult').textContent = decoded;
        showToast('✅ Message extracted!');
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
