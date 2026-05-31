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
 * Display a temporary toast notification at the bottom of the screen.
 *
 * Removes any existing toast before showing the new one. The toast
 * auto-dismisses after 2.8 seconds.
 *
 * @param {string} message - The notification message to display.
 */
function showToast(message) {
  const wrap = document.getElementById('sec-toast-wrap');
  
  // Fallback to legacy toast if wrap is somehow missing
  if (!wrap) {
    document.querySelectorAll('.toast-msg').forEach(el => el.remove());
    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
    return;
  }

  // Determine if it's an error or success message
  const isError = message.includes('❌') || message.includes('⚠') || message.toLowerCase().includes('error');
  
  // Clean emojis from the message for the monospace text
  const cleanMsg = message.replace(/[❌⚠✅📋🗑🔑]/g, '').trim();
  
  // Set dynamic title based on keywords
  let dynamicTitle = isError ? 'Error / Warning' : 'Success';
  const lowerMsg = message.toLowerCase();
  if (lowerMsg.includes('copied')) dynamicTitle = 'Copied';
  if (lowerMsg.includes('extracted')) dynamicTitle = 'Extraction Successful';
  if (lowerMsg.includes('hidden') || lowerMsg.includes('generated') || lowerMsg.includes('embedded')) dynamicTitle = 'Data hidden successfully!';
  if (lowerMsg.includes('please input') || lowerMsg.includes('paste')) dynamicTitle = 'Missing Input';
  if (lowerMsg.includes('key')) dynamicTitle = 'Missing key';

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `sec-toast ${isError ? 'sec-toast--error' : 'sec-toast--success'}`;
  
  toast.innerHTML = `
    <span class="material-symbols-outlined sec-toast__icon">${isError ? 'gpp_bad' : 'check_circle'}</span>
    <div>
      <div class="sec-toast__title">${dynamicTitle}</div>
      <div class="sec-toast__msg">${cleanMsg}</div>
    </div>
  `;

  // Append to wrapper (handles multiple toasts stacking nicely)
  wrap.appendChild(toast);

  // Auto-hide and remove after 3.5 seconds
  setTimeout(() => {
    toast.classList.add('fading');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3500);
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
  const stegoText = document.getElementById('stegoText').value;
  if (!stegoText) return showToast('⚠ No final output to copy.');

  const stegoKey = document.getElementById('embedStegoKey').value;
  const encKey = document.getElementById('embedEncryptionKey') ? document.getElementById('embedEncryptionKey').value : '';

  // Switch to the extraction tab and populate the fields
  switchTab('extract');
  document.getElementById('extractCover').value = stegoText;
  document.getElementById('extractStegoKey').value = stegoKey;
  
  const extractEncKeyEl = document.getElementById('extractEncryptionKey');
  if (extractEncKeyEl) {
    extractEncKeyEl.value = encKey;
  }

  showToast('📋 Output and keys copied to extraction page!');
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
   * Toggle the diagnostics accordion open/closed.
   * Uses CSS class `.open` on the `.diag-accordion` container
   * to animate max-height and visual state transitions.
   */
  function toggle() {
    isVisible = !isVisible;
    const accordion = document.querySelector('.diag-accordion');
    if (accordion) {
      accordion.classList.toggle('open', isVisible);
      
      // Auto-scroll/Focus on content when opened
      if (isVisible) {
        setTimeout(() => {
          accordion.scrollIntoView({ behavior: 'smooth', block: 'start' });
          
          // Lock accordion textareas' min-height once they become visible
          accordion.querySelectorAll('textarea').forEach(textarea => {
            if (textarea.clientHeight > 0 && !textarea.style.minHeight) {
              textarea.style.minHeight = textarea.clientHeight + 'px';
            }
          });
        }, 150); // slight delay to allow the accordion slide-down transition to start
      }
    }
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
 * If the user provided a stego-key, it is used as-is. If no stego-key
 * was provided (empty/whitespace), the SHA-256 hash of the cover-text
 * is used as a deterministic fallback. This ensures the same positions
 * are generated during both embedding and extraction.
 *
 * Dependencies: step2_prng (sha256)
 *
 * @param {string} stegoKey  - The user-supplied stego-key (may be empty).
 * @param {string} coverText - The cover-text to hash if no stego-key given.
 * @returns {Promise<{ resolvedStegoKey: string, wasAutoGenerated: boolean }>}
 */
async function resolveStegoKey(stegoKey, coverText) {
  if (stegoKey.trim()) {
    return { resolvedStegoKey: stegoKey, wasAutoGenerated: false };
  }

  const autoStegoKey = await sha256(coverText);
  return { resolvedStegoKey: autoStegoKey, wasAutoGenerated: true };
}


// ── DEFENSIVE UX: AUTO-LOCK TEXTAREA MIN-HEIGHT TO THEIR INITIAL DESIGN HEIGHT ──
document.addEventListener('DOMContentLoaded', () => {
  // Lock standard visible textareas on layout settle
  setTimeout(() => {
    document.querySelectorAll('textarea').forEach(textarea => {
      if (textarea.clientHeight > 0 && !textarea.style.minHeight) {
        textarea.style.minHeight = textarea.clientHeight + 'px';
      }
    });
  }, 100);
});


// ── NAVIGATION DROPDOWNS & HASH-BASED TAB SWITCHING ──────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Desktop Navbar Dropdowns Toggle (Generic for both Embed and Extract)
  const desktopDropdowns = document.querySelectorAll('.top-nav__dropdown');
  
  desktopDropdowns.forEach(dropdown => {
    const trigger = dropdown.querySelector('.top-nav__dropdown-trigger');
    if (!trigger) return;

    // Show/hide on hover (desktop)
    dropdown.addEventListener('mouseenter', () => {
      dropdown.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
    });

    dropdown.addEventListener('mouseleave', () => {
      dropdown.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
    });

    // Toggle on click (for touch devices/keyboard navigation)
    trigger.addEventListener('click', (e) => {
      if (window.innerWidth >= 768) {
        e.preventDefault();
        const isOpen = dropdown.classList.contains('is-open');
        // Close other dropdowns
        desktopDropdowns.forEach(other => {
          if (other !== dropdown) {
            other.classList.remove('is-open');
            const otherTrigger = other.querySelector('.top-nav__dropdown-trigger');
            if (otherTrigger) otherTrigger.setAttribute('aria-expanded', 'false');
          }
        });
        dropdown.classList.toggle('is-open', !isOpen);
        trigger.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
      }
    });

    // Close when selecting an item
    const dropdownItems = dropdown.querySelectorAll('.top-nav__dropdown-item');
    dropdownItems.forEach(item => {
      item.addEventListener('click', () => {
        dropdown.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
      });
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    desktopDropdowns.forEach(dropdown => {
      const trigger = dropdown.querySelector('.top-nav__dropdown-trigger');
      if (trigger && !dropdown.contains(e.target)) {
        dropdown.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
  });

  // Mobile Navbar Dropdowns Accordions (Generic for both mobile-embed and mobile-extract)
  const mobileToggles = [
    { toggleId: 'mobile-embed-toggle', itemsId: 'mobile-embed-items' },
    { toggleId: 'mobile-extract-toggle', itemsId: 'mobile-extract-items' }
  ];

  mobileToggles.forEach(cfg => {
    const toggle = document.getElementById(cfg.toggleId);
    const items = document.getElementById(cfg.itemsId);

    if (toggle && items) {
      toggle.addEventListener('click', () => {
        const isOpen = items.classList.contains('is-open');
        // Close other mobile panels
        mobileToggles.forEach(otherCfg => {
          if (otherCfg.toggleId !== cfg.toggleId) {
            const otherItems = document.getElementById(otherCfg.itemsId);
            const otherToggle = document.getElementById(otherCfg.toggleId);
            if (otherItems) otherItems.classList.remove('is-open');
            if (otherToggle) {
              const otherChevron = otherToggle.querySelector('.top-nav__dropdown-chevron');
              if (otherChevron) otherChevron.style.transform = 'rotate(0deg)';
            }
          }
        });

        items.classList.toggle('is-open', !isOpen);
        
        // Rotate chevron
        const chevron = toggle.querySelector('.top-nav__dropdown-chevron');
        if (chevron) {
          chevron.style.transform = !isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
          chevron.style.transition = 'transform var(--transition-normal)';
        }
      });

      // Close mobile dropdown and menu when selecting an item
      const dropdownLinks = items.querySelectorAll('.top-nav__dropdown-item');
      dropdownLinks.forEach(link => {
        link.addEventListener('click', () => {
          const mobileMenu = document.getElementById('mobile-menu');
          if (mobileMenu) {
            mobileMenu.classList.remove('is-open');
            const hamIcon = document.querySelector('#hamburger-btn .material-symbols-outlined');
            if (hamIcon) hamIcon.textContent = 'menu';
          }
        });
      });
    }
  });

  // Hash-based Tab Switching
  function selectTabFromHash() {
    const hash = window.location.hash.slice(1);
    // Support both embed tabs (text, image) and extract tabs (standard, scanner, hints)
    const validTabs = ['standard', 'scanner', 'hints', 'text', 'image'];
    if (validTabs.includes(hash)) {
      const targetBtn = document.querySelector(`.tab-btn[data-tab="${hash}"]`);
      if (targetBtn) {
        targetBtn.click();
        
        const mainHeader = document.querySelector('.main-header');
        if (mainHeader) {
          mainHeader.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  }

  window.addEventListener('hashchange', selectTabFromHash);
  setTimeout(selectTabFromHash, 150);
});
