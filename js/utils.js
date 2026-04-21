// ══════════════════════════════════════════════════════════════
// Shared Utilities
// ══════════════════════════════════════════════════════════════
//
// Common tools used across all modules:
//   - Tab Switching
//   - Toast Notifications
//   - Clipboard Operations
//   - HTML Escaping (XSS Prevention)
//   - Detail Panel Toggle
//   - Copy to Extract Tab
//   - Password Resolution (shared by Embedding & Extraction)
//
// ══════════════════════════════════════════════════════════════


// ── TAB SWITCHING ─────────────────────────────────────────────

/**
 * Switch the active tab in the UI.
 *
 * Deactivates all tab buttons and panels, then activates the
 * selected tab and its corresponding panel. If the "hints" tab
 * is selected, the hints log is rendered immediately.
 *
 * @param {string} tabName - The tab identifier (e.g., 'embed', 'extract', 'hints').
 */
function switchTab(tabName) {
  // Deactivate all tabs
  document.querySelectorAll('.tab-btn').forEach(button => {
    button.classList.remove('active');
    button.setAttribute('aria-selected', 'false');
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.remove('active');
  });

  // Activate the selected tab and panel
  const tabButton = document.getElementById('tab-' + tabName);
  const tabPanel  = document.getElementById('panel-' + tabName);

  tabButton.classList.add('active');
  tabButton.setAttribute('aria-selected', 'true');
  tabPanel.classList.add('active');

  // Render hints log lazily when switching to the hints tab
  if (tabName === 'hints') renderHintsLog();
}


// ── TOAST NOTIFICATIONS ───────────────────────────────────────

/**
 * Display a temporary toast notification at the bottom of the screen.
 *
 * Removes any existing toast before showing the new one. The toast
 * auto-dismisses after 2.8 seconds.
 *
 * @param {string} message - The notification message to display.
 */
function showToast(message) {
  // Remove any existing toasts to prevent stacking
  document.querySelectorAll('.toast-msg').forEach(el => el.remove());

  const toast = document.createElement('div');
  toast.className = 'toast-msg';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 2800);
}


// ── CLIPBOARD ─────────────────────────────────────────────────

/**
 * Copy the text content of a DOM element to the clipboard.
 *
 * Works with both form elements (uses `.value`) and regular
 * elements (uses `.textContent`). Shows a toast on success or failure.
 *
 * @param {string} elementId - The ID of the DOM element to copy from.
 */
function copyToClipboard(elementId) {
  const element = document.getElementById(elementId);
  const text = element.value || element.textContent;

  if (!text) return showToast('⚠ Nothing to copy.');

  navigator.clipboard.writeText(text).then(
    () => showToast('📋 Copied!'),
    () => showToast('❌ Copy failed.')
  );
}


// ── COPY TO EXTRACT TAB ──────────────────────────────────────

/**
 * Copy the final embedding output and password to the extraction tab.
 *
 * This is a convenience function that lets the user quickly test
 * the extraction pipeline without manually copy-pasting values.
 */
function copyToExtractTab() {
  const finalOutput = document.getElementById('finalOutput').value;
  if (!finalOutput) return showToast('⚠ لا يوجد ناتج نهائي للنسخ.');

  const password = document.getElementById('embedPassword').value;

  // Switch to the extraction tab and populate the fields
  switchTab('extract');
  document.getElementById('extractCover').value = finalOutput;
  document.getElementById('extractPassword').value = password;

  showToast('📋 تم نسخ الناتج وكلمة المرور إلى صفحة الفك!');
}


// ── HTML ESCAPING (XSS Prevention) ────────────────────────────

/**
 * Escape a string to prevent XSS when inserting into HTML.
 *
 * Leverages the browser's built-in escaping by setting textContent
 * on a temporary element and reading back the innerHTML.
 *
 * @param {string} str - The raw string to escape.
 * @returns {string} The HTML-escaped string.
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}


// ── TOGGLE DETAILS ────────────────────────────────────────────

/**
 * Self-contained module for toggling the detail sections.
 *
 * Wrapped in an IIFE to avoid polluting the global scope with
 * the `detailsVisible` mutable state variable.
 */
const DetailsToggle = (function () {
  let isVisible = false;

  /**
   * Toggle the visibility of all `.detail-section` elements.
   * Updates the button text to reflect the current state.
   */
  function toggle() {
    isVisible = !isVisible;
    const sections = document.querySelectorAll('.detail-section');
    const button   = document.getElementById('toggleDetailsBtn');

    sections.forEach(section => {
      section.style.display = isVisible ? 'block' : 'none';
    });

    button.textContent = isVisible
      ? '🔽 إخفاء التفاصيل'
      : '🔼 عرض التفاصيل (Base Map + XOR Key)';
  }

  return { toggle };
})();

// Global alias for backward compatibility with HTML onclick attributes
function toggleDetails() {
  DetailsToggle.toggle();
}


// ── PASSWORD RESOLUTION (Shared by Embedding & Extraction) ────

/**
 * Resolve the password to use for PRNG seeding.
 *
 * If the user provided a password, it is used as-is. If no password
 * was provided (empty/whitespace), the SHA-256 hash of the cover text
 * is used as a deterministic fallback. This ensures the same positions
 * are generated during both embedding and extraction.
 *
 * @param {string} password  - The user-supplied password (may be empty).
 * @param {string} coverText - The cover text to hash if no password given.
 * @returns {Promise<{ resolvedPassword: string, wasAutoGenerated: boolean }>}
 */
async function resolvePassword(password, coverText) {
  if (password.trim()) {
    return { resolvedPassword: password, wasAutoGenerated: false };
  }

  const autoPassword = await sha256(coverText);
  return { resolvedPassword: autoPassword, wasAutoGenerated: true };
}
