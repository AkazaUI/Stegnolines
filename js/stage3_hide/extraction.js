// ══════════════════════════════════════════════════════════════
// Stage 3 — Hide | Extraction Orchestrator
// ══════════════════════════════════════════════════════════════
//
// منسّق عملية الاستخراج (Extraction)
// يربط الخطوات 4→1 بالعكس:
//   step4: Decode Stego-Channel (VS → XOR key binary)
//   step3: Regenerate Positions (password → same positions)
//   step1: XOR + Binary → Bytes
//   step2: Parse Stego-Payload → { secret, hint }
//
// Dependencies: step1, step2, step3, step4, utils, F_stego_hint
// ══════════════════════════════════════════════════════════════


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
    // ── Step 4: Decode Stego-Channel (extract VS bytes)
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

    // ── Step 1: Cover → Binary
    const coverBits = stringToBinary(coverText);

    if (xorKeyBinary.length > coverBits.length)
      throw new Error(`المفتاح يحتوي ${xorKeyBinary.length} بت لكن الغلاف يحتوي ${coverBits.length} بت فقط.`);

    // ── Step 3: Regenerate same positions
    const basePositions = generatePositions(coverBits.length, xorKeyBinary.length, password);

    // ── Reconstruct payload bits (XOR recovery)
    let binaryStr = '';
    for (let i = 0; i < xorKeyBinary.length; i++) {
      const coverBit = coverBits[basePositions[i]];
      const keyBit   = xorKeyBinary[i];
      binaryStr += (coverBit === keyBit) ? '0' : '1';
    }

    // ── Step 2: Parse Stego-Payload → secret + hint
    const payloadBytes = binaryToBytes(binaryStr);
    const { secret, hint } = parsePayload(payloadBytes);

    // ── Display secret message
    document.getElementById('extractResultCard').style.display = 'block';
    document.getElementById('extractedResult').textContent = secret;

    // ── Display hint if present
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
