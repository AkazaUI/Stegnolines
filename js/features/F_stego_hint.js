// ══════════════════════════════════════════════════════════════
// Feature: Stego Hint System
// ══════════════════════════════════════════════════════════════
//
// Manages the hint subsystem that tells the recipient where the
// next message will be. Hints are persisted in localStorage and
// categorized as "sent" or "received".
//
// Dependencies: utils (escapeHtml, showToast)
// ══════════════════════════════════════════════════════════════


/** localStorage key for the hints log. */
const HINTS_STORAGE_KEY = 'stego_hints_log';

/** Maximum number of hint entries to retain in storage. */
const MAX_HINTS_COUNT = 100;


// ── Hint Type Configuration (DRY) ────────────────────────────

/**
 * Get display configuration for a given hint type.
 *
 * Centralizes the type → label/icon/CSS class mapping that was
 * previously duplicated across multiple render functions.
 *
 * @param {string} type - Either 'sent' or 'received'.
 * @returns {{ label: string, icon: string, cssClass: string }}
 */
function getHintTypeConfig(type) {
  if (type === 'sent') {
    return { label: '↗ مُرسل', icon: '↗', cssClass: 'hint-type-sent', emptyMessage: 'لا توجد تلميحات مُرسلة بعد' };
  }
  return { label: '↙ مُستقبل', icon: '↙', cssClass: 'hint-type-received', emptyMessage: 'لا توجد تلميحات مُستقبلة بعد' };
}


// ── Storage Operations ────────────────────────────────────────

/**
 * Load all hint entries from localStorage.
 *
 * Returns an empty array if no data exists or if parsing fails,
 * ensuring the rest of the system always receives a valid array.
 *
 * @returns {Array<object>} The array of hint entries (newest first).
 */
function loadHints() {
  try {
    const data = localStorage.getItem(HINTS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}


/**
 * Save a new hint entry to localStorage.
 *
 * Each entry receives a unique ID (timestamp + random suffix).
 * New entries are prepended (newest first), and the list is
 * truncated to MAX_HINTS_COUNT to prevent unbounded storage growth.
 *
 * @param {object} entry - The hint entry to save.
 * @param {string} entry.type      - Either 'sent' or 'received'.
 * @param {string} entry.emoji     - The hint content (emoji or text).
 * @param {string} entry.timestamp - ISO 8601 timestamp.
 */
function saveHint(entry) {
  const hints = loadHints();

  // Generate a unique ID using base-36 timestamp + random suffix
  entry.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  hints.unshift(entry);

  // Enforce storage limit
  if (hints.length > MAX_HINTS_COUNT) {
    hints.length = MAX_HINTS_COUNT;
  }

  localStorage.setItem(HINTS_STORAGE_KEY, JSON.stringify(hints));
}


/**
 * Clear all hints from localStorage after user confirmation.
 *
 * Prompts the user with a confirmation dialog before deleting.
 * Refreshes the hints log display after clearing.
 */
function clearHintsLog() {
  if (!confirm('هل تريد مسح جميع التلميحات المحفوظة؟')) return;

  localStorage.removeItem(HINTS_STORAGE_KEY);
  renderHintsLog();
  showToast('🗑 تم مسح سجل التلميحات.');
}


/**
 * Get the most recent hint entry (regardless of type).
 *
 * @returns {object|null} The latest hint entry, or null if none exist.
 */
function getLatestHint() {
  const hints = loadHints();
  return hints.length > 0 ? hints[0] : null;
}


// ── Rendering ─────────────────────────────────────────────────

/**
 * Render a list of hint entries as HTML.
 *
 * Uses array-based string building for efficient HTML construction.
 * Displays an empty-state message if no hints of the given type exist.
 *
 * @param {Array<object>} hintEntries - The filtered hint entries to render.
 * @param {string}        type        - The hint type ('sent' or 'received').
 * @returns {string} The rendered HTML string.
 */
function renderHintsList(hintEntries, type) {
  const config = getHintTypeConfig(type);

  if (hintEntries.length === 0) {
    return `
      <div class="text-center py-6">
        <span class="text-2xl mb-2 block opacity-20">${config.icon}</span>
        <p class="text-sm" style="color: rgba(255,255,255,0.2);">${config.emptyMessage}</p>
      </div>
    `;
  }

  const rows = hintEntries.map(hintEntry => {
    const formattedTime = formatHintTime(hintEntry.timestamp);
    return `
      <div class="hint-row">
        <span class="hint-row-emoji">${escapeHtml(hintEntry.emoji)}</span>
        <span class="hint-row-time">${formattedTime}</span>
      </div>
    `;
  });

  return `<div class="hints-list">${rows.join('')}</div>`;
}


/**
 * Render the full hints log in the hints tab.
 *
 * Updates three sections:
 *   1. Latest active hint card (shows the most recent hint regardless of type)
 *   2. Received hints list
 *   3. Sent hints list
 * Also toggles the visibility of the clear button.
 */
function renderHintsLog() {
  const receivedContainer = document.getElementById('hintsReceivedContainer');
  const sentContainer     = document.getElementById('hintsSentContainer');
  const latestCard        = document.getElementById('latestHintCard');
  const clearButton       = document.getElementById('btnClearHints');

  if (!receivedContainer || !sentContainer) return;

  const allHints    = loadHints();
  const receivedHints = allHints.filter(hintEntry => hintEntry.type === 'received');
  const sentHints     = allHints.filter(hintEntry => hintEntry.type === 'sent');

  // Render the latest hint card (newest entry regardless of type)
  if (allHints.length > 0 && latestCard) {
    latestCard.style.display = 'block';
    const latestHint = allHints[0];
    const config = getHintTypeConfig(latestHint.type);
    const formattedTime = formatHintTime(latestHint.timestamp);

    document.getElementById('latestHintContent').innerHTML = `
      <div class="hint-active-inner">
        <span class="hint-big-emoji">${escapeHtml(latestHint.emoji)}</span>
        <div class="hint-active-info">
          <span class="hint-type-badge ${config.cssClass}">${config.label}</span>
          <span class="hint-time">${formattedTime}</span>
        </div>
      </div>
    `;
  } else if (latestCard) {
    latestCard.style.display = 'none';
  }

  // Toggle clear button visibility
  if (clearButton) {
    clearButton.style.display = allHints.length > 0 ? 'inline-flex' : 'none';
  }

  // Render separated hint lists
  receivedContainer.innerHTML = renderHintsList(receivedHints, 'received');
  sentContainer.innerHTML     = renderHintsList(sentHints, 'sent');
}


/**
 * Format an ISO timestamp for display in the hints log.
 *
 * Uses Arabic (Saudi) locale for date/time formatting.
 * Falls back to the raw ISO string if parsing fails.
 *
 * @param {string} isoString - An ISO 8601 timestamp string.
 * @returns {string} The formatted date/time string.
 */
function formatHintTime(isoString) {
  try {
    const date = new Date(isoString);
    const datePart = date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
    const timePart = date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    return datePart + ' ' + timePart;
  } catch {
    return isoString;
  }
}
