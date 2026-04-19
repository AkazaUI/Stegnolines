// ══════════════════════════════════════════════════════════════
// Feature: Stego Analysis (Visual Key Inspection)
// ══════════════════════════════════════════════════════════════
//
// العرض المرئي للمفتاح — يعرض تفاصيل تحويل البتات:
//   Binary → Bytes → Hex → VS Codepoints
//
// + عداد حجم Stego-Key مقارنة بحجم Cover
//
// Dependencies: step4_stego_channel (VS_START, VS_SUP_START)
// ══════════════════════════════════════════════════════════════


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
