// ══════════════════════════════════════════════════════════════
// Legacy Compatibility Layer — STEGNOLINES
// ══════════════════════════════════════════════════════════════
//
// This file maintains backwards compatibility for older pages
// by mapping legacy utility requests to the newly modularized
// shared components (ui-helpers.js, theme-manager.js, prng-generator.js).
//
// ══════════════════════════════════════════════════════════════

// ── Shared UI Helpers Dynamic Redirection ──
if (typeof showToast === 'undefined') {
  window.showToast = function(message) {
    if (window.UIHelpers && typeof window.UIHelpers.showToast === 'function') {
      window.UIHelpers.showToast(message);
    } else {
      console.log("Toast:", message);
    }
  };
}

if (typeof switchTab === 'undefined') {
  window.switchTab = function(tabName) {
    if (window.UIHelpers && typeof window.UIHelpers.switchTab === 'function') {
      window.UIHelpers.switchTab(tabName);
    }
  };
}

if (typeof copyToClipboard === 'undefined') {
  window.copyToClipboard = function(elementId) {
    if (window.UIHelpers && typeof window.UIHelpers.copyToClipboard === 'function') {
      window.UIHelpers.copyToClipboard(elementId);
    }
  };
}

if (typeof copyToExtractTab === 'undefined') {
  window.copyToExtractTab = function() {
    if (window.UIHelpers && typeof window.UIHelpers.copyToExtractTab === 'function') {
      window.UIHelpers.copyToExtractTab();
    }
  };
}

if (typeof escapeHtml === 'undefined') {
  window.escapeHtml = function(str) {
    if (window.UIHelpers && typeof window.UIHelpers.escapeHtml === 'function') {
      return window.UIHelpers.escapeHtml(str);
    }
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };
}

if (typeof toggleDetails === 'undefined') {
  window.toggleDetails = function() {
    if (window.UIHelpers && typeof window.UIHelpers.toggleDetails === 'function') {
      window.UIHelpers.toggleDetails();
    }
  };
}

// ── Stego Key Resolution Redirection ──
if (typeof resolveStegoKey === 'undefined') {
  window.resolveStegoKey = async function(stegoKeyText, cleanText) {
    if (typeof window.resolveStegoKeyCore === 'function') {
      return await window.resolveStegoKeyCore(stegoKeyText, cleanText);
    }
    throw new Error("Core stego-key resolver not loaded.");
  };
}
