// ══════════════════════════════════════════════════════════════
// Stage 3 — Hide | Embedding Orchestrator
// ══════════════════════════════════════════════════════════════
//
// منسّق عملية التضمين (Embedding)
// يربط الخطوات 1→4 بالترتيب:
//   step1: Cover → Binary
//   step2: Build Stego-Payload
//   step3: Generate Stego-Key (Positions + XOR)
//   step4: Encode via Stego-Channel (VS)
//
// Dependencies: step1, step2, step3, step4, utils,
//               F_stego_capacity, F_stego_analysis, F_stego_hint
// ══════════════════════════════════════════════════════════════


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

  // ── Step 2: Build Stego-Payload (message + optional hint)
  const payloadBytes = buildPayload(secret, hint);
  const msgBits = bytesToBinary(payloadBytes);

  // ── Step 1: Cover → Binary
  const coverBits = stringToBinary(coverText);

  // ── Capacity check (bits vs bits)
  if (msgBits.length > coverBits.length) {
    showToast(`❌ تحتاج ${msgBits.length} بت لكن الغلاف يحتوي ${coverBits.length} بت فقط.`);
    return;
  }

  // ── Step 3: Generate Stego-Key (positions + XOR)
  const basePositions = generatePositions(coverBits.length, msgBits.length, password);
  const xorKey = generateXORKey(coverBits, basePositions, msgBits);

  // Output — Base Positions & Binary XOR Key
  document.getElementById('baseMapOutput').value =
    '[' + basePositions.join(', ') + ']';
  document.getElementById('shiftKeyOutput').value = xorKey;

  // ── Step 4: Encode via Stego-Channel (VS)
  const { vsStr, bytesArr } = xorKeyToVSString(xorKey);

  // ── Features: Visualization
  updateVSVisualization(xorKey, bytesArr);

  // ── Build Final Stego-Object
  const finalOutput = buildFinalOutput(coverText, vsStr);
  document.getElementById('finalOutput').value = finalOutput;

  // ── Features: Key Size Meter
  updateKeySizeMeter(bytesArr.length, coverText.length);

  // ── Features: Save hint
  if (hint && hint.trim()) {
    saveHint({
      type: 'sent',
      emoji: hint.trim(),
      timestamp: new Date().toISOString()
    });
  }

  // ── Features: Capacity Meter
  updateCapacityMeter();
  showToast('✅ تم توليد المفتاح وتضمينه في الغلاف!');
}
