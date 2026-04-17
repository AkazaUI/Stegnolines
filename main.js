
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

      // Render hints log when switching to hints tab
      if (tab === 'hints') renderHintsLog();
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


    // ──────────────────────────────────────────────────────────────
    // PAYLOAD FORMAT  (Message + Optional Hint)
    // ──────────────────────────────────────────────────────────────
    //
    // New format:  [0xFF marker] [1 byte hint_length] [hint bytes...] [message bytes...]
    // Legacy:      [message bytes...]  (first byte ≠ 0xFF since 0xFF is invalid UTF-8)
    //
    const PAYLOAD_MARKER = 0xFF;

    /**
     * Build payload bytes from secret message and optional hint.
     * Returns Uint8Array.
     */
    function buildPayload(secret, hint) {
      const secretBytes = new TextEncoder().encode(secret);
      const hintBytes = (hint && hint.trim())
        ? new TextEncoder().encode(hint.trim())
        : new Uint8Array(0);

      const payload = new Uint8Array(2 + hintBytes.length + secretBytes.length);
      payload[0] = PAYLOAD_MARKER;
      payload[1] = hintBytes.length;
      if (hintBytes.length > 0) {
        payload.set(hintBytes, 2);
      }
      payload.set(secretBytes, 2 + hintBytes.length);
      return payload;
    }

    /**
     * Parse payload bytes → { secret, hint }.
     * Handles both new format (with marker) and legacy (raw message).
     */
    function parsePayload(bytes) {
      if (bytes.length >= 2 && bytes[0] === PAYLOAD_MARKER) {
        // New format
        const hintLen = bytes[1];
        const hint = hintLen > 0
          ? new TextDecoder().decode(bytes.slice(2, 2 + hintLen))
          : '';
        const secret = new TextDecoder().decode(bytes.slice(2 + hintLen));
        return { secret, hint };
      } else {
        // Legacy format — entire payload is the message
        return { secret: new TextDecoder().decode(bytes), hint: '' };
      }
    }


    // ──────────────────────────────────────────────────────────────
    // SHA-256 HASH  (for auto-password from cover text)
    // ──────────────────────────────────────────────────────────────

    /**
     * Compute SHA-256 hash of a string synchronously using SubtleCrypto.
     * Returns a Promise<string> (hex digest).
     */
    async function sha256(message) {
      const encoder = new TextEncoder();
      const data = encoder.encode(message);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
     * Build the final output.
     * Always: [VS key] + [cover text]
     */
    function buildFinalOutput(coverText, vsKeyStr) {
      return vsKeyStr + coverText;
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
    // EMBEDDING  (XOR-Based + VS Key + Optional Hint)
    // ──────────────────────────────────────────────────────────────

    async function generateShiftMap() {
      const coverText = document.getElementById('embedCover').value;
      const secret    = document.getElementById('embedSecret').value;
      const hint      = document.getElementById('embedHint').value;
      let   password  = document.getElementById('embedPassword').value;

      if (!coverText.trim()) return showToast('⚠ الرجاء إدخال النص الغلاف.');
      if (!secret.trim())    return showToast('⚠ الرجاء إدخال الرسالة السرية.');

      // إذا لم يُدخل المستخدم كلمة مرور → نستخدم SHA-256 للنص الغلاف
      if (!password.trim()) {
        password = await sha256(coverText);
        showToast('🔑 لم تُدخل كلمة مرور — تم توليدها تلقائياً من هاش الغلاف (SHA-256).');
      }

      // 1. Build payload (message + optional hint)
      const payloadBytes = buildPayload(secret, hint);
      const msgBits = bytesToBinary(payloadBytes);

      // 2. Convert cover to binary
      const coverBits = stringToBinary(coverText);

      // 3. Capacity check (bits vs bits)
      if (msgBits.length > coverBits.length) {
        showToast(`❌ تحتاج ${msgBits.length} بت لكن الغلاف يحتوي ${coverBits.length} بت فقط.`);
        return;
      }

      // 4. Generate N unique positions in [0, coverBits.length - 1]
      const basePositions = generatePositions(coverBits.length, msgBits.length, password);

      // 5. XOR key: compare cover bit with payload bit
      const xorKey = generateXORKey(coverBits, basePositions, msgBits);

      // 6. Output — Base Positions & Binary XOR Key
      document.getElementById('baseMapOutput').value =
        '[' + basePositions.join(', ') + ']';
      document.getElementById('shiftKeyOutput').value = xorKey;

      // 7. Convert XOR key → VS characters
      const { vsStr, bytesArr } = xorKeyToVSString(xorKey);

      // 8. Build Visual Hex Display
      updateVSVisualization(xorKey, bytesArr);

      // 9. Build Final Output (always VS + cover, no emoji carrier)
      const finalOutput = buildFinalOutput(coverText, vsStr);
      document.getElementById('finalOutput').value = finalOutput;

      // 10. Update Key Size Meter
      updateKeySizeMeter(bytesArr.length, coverText.length);

      // 11. Save hint to localStorage if provided
      if (hint && hint.trim()) {
        saveHint({
          type: 'sent',
          emoji: hint.trim(),
          timestamp: new Date().toISOString()
        });
      }

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
    // EXTRACTION  (Smart — auto-detect VS key + parse hint)
    // ──────────────────────────────────────────────────────────────

    /**
     * Smart extraction:
     * 1. Extract VS bytes from the final message → XOR key
     * 2. Clean text (without VS) = cover text
     * 3. Regenerate positions using password + cover bits length
     * 4. XOR to recover payload → parse into secret + hint
     */
    async function extractSecretMessage() {
      const finalMessage = document.getElementById('extractCover').value;
      let   password     = document.getElementById('extractPassword').value;

      if (!finalMessage.trim()) return showToast('⚠ الرجاء إدخال الرسالة النهائية.');

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
        } else {
          throw new Error('لا توجد أحرف مخفية (VS) في الرسالة. تأكد من لصق الرسالة النهائية كاملة.');
        }

        // إذا لم يُدخل المستخدم كلمة مرور → نستخدم SHA-256 للنص الغلاف (النظيف)
        if (!password.trim()) {
          password = await sha256(coverText);
          showToast('🔑 لم تُدخل كلمة مرور — تم توليدها تلقائياً من هاش الغلاف (SHA-256).');
        }

        // 2. Convert cover to bits
        const coverBits = stringToBinary(coverText);

        if (xorKeyBinary.length > coverBits.length)
          throw new Error(`المفتاح يحتوي ${xorKeyBinary.length} بت لكن الغلاف يحتوي ${coverBits.length} بت فقط.`);

        // 3. Regenerate same positions
        const basePositions = generatePositions(coverBits.length, xorKeyBinary.length, password);

        // 4. Reconstruct payload bits
        let binaryStr = '';
        for (let i = 0; i < xorKeyBinary.length; i++) {
          const coverBit = coverBits[basePositions[i]];
          const keyBit   = xorKeyBinary[i];
          binaryStr += (coverBit === keyBit) ? '0' : '1';
        }

        // 5. Parse payload → secret + hint
        const payloadBytes = binaryToBytes(binaryStr);
        const { secret, hint } = parsePayload(payloadBytes);

        // 6. Display secret message
        document.getElementById('extractResultCard').style.display = 'block';
        document.getElementById('extractedResult').textContent = secret;

        // 7. Display hint if present
        const hintCard = document.getElementById('extractHintCard');
        if (hint) {
          hintCard.style.display = 'block';
          document.getElementById('extractHintEmoji').textContent = hint;
          document.getElementById('extractHintText').textContent = 'الرسالة القادمة ستكون هنا ☝️';

          // Save hint to localStorage
          saveHint({
            type: 'received',
            emoji: hint,
            timestamp: new Date().toISOString()
          });
        } else {
          hintCard.style.display = 'none';
        }

        showToast('✅ تم استخراج الرسالة بنجاح!');
      } catch (e) {
        showToast('❌ ' + e.message);
      }
    }


    // ──────────────────────────────────────────────────────────────
    // CAPACITY METER  (Bit-level, accounts for hint overhead)
    // ──────────────────────────────────────────────────────────────

    function updateCapacityMeter() {
      const coverText = document.getElementById('embedCover').value;
      const secret    = document.getElementById('embedSecret').value;
      const hintEl    = document.getElementById('embedHint');
      const hint      = hintEl ? hintEl.value : '';

      // Cover bits (full binary representation of cover)
      const coverBitsCount = stringToBinary(coverText).length;

      // Build payload to get actual bits needed
      let msgBits = 0;
      if (secret.length > 0 || (hint && hint.trim())) {
        const payload = buildPayload(secret || '', hint || '');
        msgBits = bytesToBinary(payload).length;
      }

      // Max message chars (subtract overhead: 2 bytes marker+hintLen + hint bytes)
      const hintOverheadBytes = 2 + ((hint && hint.trim()) ? new TextEncoder().encode(hint.trim()).length : 0);
      const availableBits = Math.max(0, coverBitsCount - (hintOverheadBytes * 8));
      const maxChars = availableBits > 0 ? Math.floor(availableBits / 8) : 0;

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
    // HINT MANAGEMENT  (localStorage)
    // ──────────────────────────────────────────────────────────────

    const HINTS_STORAGE_KEY = 'stego_hints_log';

    /** Load all hints from localStorage. */
    function loadHints() {
      try {
        const data = localStorage.getItem(HINTS_STORAGE_KEY);
        return data ? JSON.parse(data) : [];
      } catch {
        return [];
      }
    }

    /** Save a new hint entry to localStorage. */
    function saveHint(entry) {
      const hints = loadHints();
      entry.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      hints.unshift(entry); // newest first
      // Keep max 100 entries
      if (hints.length > 100) hints.length = 100;
      localStorage.setItem(HINTS_STORAGE_KEY, JSON.stringify(hints));
    }

    /** Clear all hints from localStorage. */
    function clearHintsLog() {
      if (!confirm('هل تريد مسح جميع التلميحات المحفوظة؟')) return;
      localStorage.removeItem(HINTS_STORAGE_KEY);
      renderHintsLog();
      showToast('🗑 تم مسح سجل التلميحات.');
    }

    /** Get the most recent hint. */
    function getLatestHint() {
      const hints = loadHints();
      return hints.length > 0 ? hints[0] : null;
    }

    /** Render the hints log in the hints tab (separated by type). */
    function renderHintsLog() {
      const receivedContainer = document.getElementById('hintsReceivedContainer');
      const sentContainer = document.getElementById('hintsSentContainer');
      const latestCard = document.getElementById('latestHintCard');
      const clearBtn = document.getElementById('btnClearHints');
      if (!receivedContainer || !sentContainer) return;

      const hints = loadHints();
      const received = hints.filter(h => h.type === 'received');
      const sent = hints.filter(h => h.type === 'sent');

      // Latest hint card
      if (hints.length > 0 && latestCard) {
        latestCard.style.display = 'block';
        const latest = hints[0];
        const typeLabel = latest.type === 'sent' ? '↗ مُرسل' : '↙ مُستقبل';
        const typeClass = latest.type === 'sent' ? 'hint-type-sent' : 'hint-type-received';
        const time = formatHintTime(latest.timestamp);
        document.getElementById('latestHintContent').innerHTML = `
          <div class="hint-active-inner">
            <span class="hint-big-emoji">${escapeHtml(latest.emoji)}</span>
            <div class="hint-active-info">
              <span class="hint-type-badge ${typeClass}">${typeLabel}</span>
              <span class="hint-time">${time}</span>
            </div>
          </div>
        `;
      } else if (latestCard) {
        latestCard.style.display = 'none';
      }

      // Clear button
      if (clearBtn) {
        clearBtn.style.display = hints.length > 0 ? 'inline-flex' : 'none';
      }

      // Render received hints
      receivedContainer.innerHTML = renderHintsList(received, 'received');

      // Render sent hints
      sentContainer.innerHTML = renderHintsList(sent, 'sent');
    }

    /** Render a list of hints of a specific type. */
    function renderHintsList(hints, type) {
      if (hints.length === 0) {
        const icon = type === 'received' ? '↙' : '↗';
        const label = type === 'received' ? 'لا توجد تلميحات مُستقبلة بعد' : 'لا توجد تلميحات مُرسلة بعد';
        return `
          <div class="text-center py-6">
            <span class="text-2xl mb-2 block opacity-20">${icon}</span>
            <p class="text-sm" style="color: rgba(255,255,255,0.2);">${label}</p>
          </div>
        `;
      }

      let html = '<div class="hints-list">';
      for (const h of hints) {
        const time = formatHintTime(h.timestamp);
        html += `
          <div class="hint-row">
            <span class="hint-row-emoji">${escapeHtml(h.emoji)}</span>
            <span class="hint-row-time">${time}</span>
          </div>
        `;
      }
      html += '</div>';
      return html;
    }

    /** Format timestamp for display. */
    function formatHintTime(isoStr) {
      try {
        const d = new Date(isoStr);
        return d.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }) +
               ' ' + d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
      } catch {
        return isoStr;
      }
    }

    /** Escape HTML to prevent XSS. */
    function escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
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