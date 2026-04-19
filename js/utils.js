// ══════════════════════════════════════════════════════════════
// Shared Utilities
// ══════════════════════════════════════════════════════════════
//
// أدوات مشتركة تُستخدم عبر جميع الملفات:
//   - Tab Switching
//   - Toast Notifications
//   - Clipboard
//   - HTML Escaping
//   - Toggle Details
//   - Copy to Extract Tab
//
// ══════════════════════════════════════════════════════════════


// ── TAB SWITCHING ─────────────────────────────────────────────

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


// ── TOAST NOTIFICATIONS ───────────────────────────────────────

function showToast(message) {
  document.querySelectorAll('.toast-msg').forEach(el => el.remove());
  const toast = document.createElement('div');
  toast.className = 'toast-msg';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
}


// ── CLIPBOARD ─────────────────────────────────────────────────

function copyToClipboard(elementId) {
  const el = document.getElementById(elementId);
  const text = el.value || el.textContent;
  if (!text) return showToast('⚠ Nothing to copy.');
  navigator.clipboard.writeText(text).then(
    () => showToast('📋 Copied!'),
    () => showToast('❌ Copy failed.')
  );
}


// ── COPY TO EXTRACT TAB ──────────────────────────────────────

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


// ── HTML ESCAPING (XSS Prevention) ────────────────────────────

/** Escape HTML to prevent XSS. */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}


// ── TOGGLE DETAILS ────────────────────────────────────────────

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
