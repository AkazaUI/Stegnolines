// ══════════════════════════════════════════════════════════════
// Feature: Stego Capacity Meter
// ══════════════════════════════════════════════════════════════
//
// عداد السعة — يعرض نسبة استخدام سعة Cover:
//   - عدد بتات الغلاف (Cover bits)
//   - أقصى عدد حروف يمكن تضمينها
//   - عدد بتات الرسالة الحالية
//   - نسبة الاستخدام المئوية
//
// Dependencies: step1_cover_binary, step2_stego_payload
// ══════════════════════════════════════════════════════════════


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
