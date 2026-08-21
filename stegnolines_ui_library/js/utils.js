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
//   - Stego-Key Resolution (shared by Embedding & Extraction)
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
 * Display a modern toast notification.
 * Supports both (type, title, msg) format and legacy (message) format.
 *
 * @param {string} type - 'success' or 'error' (or message in legacy format)
 * @param {string} [title] - The title of the toast
 * @param {string} [msg] - The message body
 */
function showToast(type, title, msg) {
  // Backward compatibility with single-string messages
  if (msg === undefined && title === undefined) {
    let rawText = type || '';
    if (rawText.includes('⚠') || rawText.includes('❌') || rawText.includes('Error') || rawText.includes('?')) {
      type = 'error';
      title = 'Error';
    } else {
      type = 'success';
      title = 'Success';
    }
    // Remove common emojis used in the old code
    msg = rawText.replace(/^[⚠❌✅📋?]\s*/, '').trim();
  }

  // Ensure the toast container exists
  let secToastWrap = document.getElementById('sec-toast-wrap');
  if (!secToastWrap) {
    secToastWrap = document.createElement('div');
    secToastWrap.id = 'sec-toast-wrap';
    secToastWrap.style.position = 'fixed';
    secToastWrap.style.bottom = 'var(--space-lg)';
    secToastWrap.style.left = 'var(--space-lg)';
    secToastWrap.style.zIndex = '9999';
    secToastWrap.style.display = 'flex';
    secToastWrap.style.flexDirection = 'column';
    secToastWrap.style.gap = 'var(--space-sm)';
    secToastWrap.style.maxWidth = '380px';
    secToastWrap.style.pointerEvents = 'none';
    document.body.appendChild(secToastWrap);
  }

  const icon = type === 'success' ? 'check_circle' : 'security';
  const el = document.createElement('div');
  el.className = `sec-toast sec-toast--${type}`;
  el.innerHTML = `
    <span class="material-symbols-outlined sec-toast__icon">${icon}</span>
    <div>
      <div class="sec-toast__title">${title}</div>
      <div class="sec-toast__msg">${msg}</div>
    </div>
    <div class="sec-toast__progress" style="animation-duration: 5.5s;"></div>`;
  
  secToastWrap.appendChild(el);
  
  setTimeout(() => {
    el.classList.add('fading');
    el.addEventListener('animationend', () => el.remove());
  }, 5500);
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
 * Copy the stego-object and stego-key to the extraction tab.
 *
 * This is a convenience function that lets the user quickly test
 * the extraction pipeline without manually copy-pasting values.
 */
function copyToExtractTab() {
  const stegoObject = document.getElementById('stegoObject').value;
  if (!stegoObject) return showToast('⚠ None / No text text text.');

  const stegoKey = document.getElementById('embedStegoKey').value;

  // Switch to the extraction tab and populate the fields
  switchTab('extract');
  document.getElementById('extractCover').value = stegoObject;
  document.getElementById('extractStegoKey').value = stegoKey;

  showToast('📋 text text text text text text text text!');
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
      ? '🔽 text text'
      : '🔼 text text (Base Map + XOR Key)';
  }

  return { toggle };
})();

// Global alias for backward compatibility with HTML onclick attributes
function toggleDetails() {
  DetailsToggle.toggle();
}


// ── STEGO-KEY RESOLUTION (Shared by Embedding & Extraction) ──

/**
 * Resolve the stego-key to use for Step 2 (PRNG seeding).
 *
 * Checks that the user provided a stego-key. The key is now mandatory and
 * cannot be empty.
 *
 * @param {string} stegoKey  - The user-supplied stego-key.
 * @param {string} coverText - Unused (maintained for signature compatibility).
 * @returns {Promise<{ resolvedStegoKey: string, wasAutoGenerated: boolean }>}
 */
async function resolveStegoKey(stegoKey, coverText) {
  if (stegoKey && stegoKey.trim()) {
    return { resolvedStegoKey: stegoKey, wasAutoGenerated: false };
  }
  throw new Error("Stego-key is mandatory and cannot be empty.");
}
