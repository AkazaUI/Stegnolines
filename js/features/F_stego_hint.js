// ══════════════════════════════════════════════════════════════
// Feature: Stego Hint Subsystem
// ══════════════════════════════════════════════════════════════
//
// Manages the hint subsystem that tells the recipient where the
// next message will be. Hints are persisted based on the user's
// preferred storage policy:
//   1. 'localStorage' - Saved in localStorage with a 7-day TTL.
//   2. 'none'         - Discarded immediately for maximum privacy.
//   3. 'file'         - Written to a secure local file on their PC.
//
// Dependencies: utils (escapeHtml, showToast)
// ══════════════════════════════════════════════════════════════

/** localStorage key for the hints log. */
const HINTS_STORAGE_KEY = 'stego_hints_log';

/** localStorage key for the storage policy. */
const HINTS_POLICY_KEY = 'stego_hints_storage_method';

/** Maximum number of hint entries to retain in storage. */
const MAX_HINTS_COUNT = 100;

/** Maximum number of hint entries to DISPLAY in the UI (DoS protection). */
const MAX_DISPLAY_HINTS = 40;

/** Maximum allowed character length for the hint text field (DoS protection). */
const MAX_HINT_TEXT_LENGTH = 60;

/** Maximum allowed character length for the timestamp field (ISO 8601 max = 24). */
const MAX_TIMESTAMP_LENGTH = 24;

/** Maximum allowed file size in bytes for a hints.json file (50 KB). */
const MAX_HINTS_FILE_SIZE_BYTES = 50 * 1024;

/** Time-to-Live (TTL) duration for localStorage hints (7 days in milliseconds). */
const HINTS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// ── Local Translation Dictionary for Modals ──────────────────
const TRANSLATIONS_HINT_MODAL = (typeof I18N_HINTS !== 'undefined') ? I18N_HINTS : {};

// ── Cached file hints array ─────────────────────────────────
window.stego_hints_file_cache = null;
window.stego_hints_file_error = false;
window.stego_hints_error_modal_shown = false;

// ── IndexedDB Controller (Handles file handles securely) ────
const DB_NAME = 'stego_hints_db';
const STORE_NAME = 'handles';
const KEY_NAME = 'hints_file_handle';

function getDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function saveFileHandle(handle) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(handle, KEY_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getFileHandle() {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(KEY_NAME);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    return null;
  }
}

async function removeFileHandle() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(KEY_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Helper to query and request permissions for a FileSystemHandle
async function verifyFilePermission(fileHandle, readWrite) {
  const options = {};
  if (readWrite) {
    options.mode = 'readwrite';
  }
  if ((await fileHandle.queryPermission(options)) === 'granted') {
    return true;
  }
  if ((await fileHandle.requestPermission(options)) === 'granted') {
    return true;
  }
  return false;
}


// ── Hint Type Configuration (DRY) ────────────────────────────

/**
 * Get display configuration for a given hint type.
 *
 * Centralizes the type → label/icon/CSS class mapping.
 *
 * @param {string} type - Either 'sent' or 'received'.
 * @returns {{ label: string, icon: string, cssClass: string }}
 */
function getHintTypeConfig(type) {
  if (type === 'sent') {
    return { label: '↗ Sent', icon: '↗', cssClass: 'hint-type-sent', emptyMessage: 'No sent hints yet' };
  }
  return { label: '↙ Received', icon: '↙', cssClass: 'hint-type-received', emptyMessage: 'No received hints yet' };
}


/**
 * Validates a hints array for corruption or tampering.
 *
 * Security checks:
 *  - Must be a non-null array.
 *  - Each entry must be a plain object with a valid 'type' ('sent'|'received').
 *  - 'hint' field (or legacy 'emoji') must be a string ≤ MAX_HINT_TEXT_LENGTH chars.
 *  - 'timestamp' field must be a string ≤ MAX_TIMESTAMP_LENGTH chars.
 *
 * @param {Array|null} hints - The hints array to validate.
 * @returns {'valid'|'corrupt'|'tampered'} The validation result.
 */
function validateHints(hints) {
  if (hints === null) {
    if (window.stego_hints_file_error) return 'corrupt';
    return 'locked';
  }
  if (!Array.isArray(hints)) return 'corrupt';

  for (const entry of hints) {
    if (!entry || typeof entry !== 'object') return 'corrupt';

    // Check if type has been modified or injected (XSS / Logic Tampering guard)
    if (entry.type !== 'sent' && entry.type !== 'received') {
      return 'tampered_type';
    }

    // Support both 'hint' (new) and 'emoji' (legacy) field names
    const hintText = entry.hint ?? entry.emoji;

    // Field presence and type check
    if (typeof hintText !== 'string' || typeof entry.timestamp !== 'string') {
      return 'corrupt';
    }

    // DoS guard: enforce character length limits on string fields
    if (hintText.length > MAX_HINT_TEXT_LENGTH) {
      return 'tampered_hint';
    }
    if (entry.timestamp.length > MAX_TIMESTAMP_LENGTH) {
      return 'tampered_timestamp';
    }
  }
  return 'valid';
}


// ── Storage Operations ────────────────────────────────────────

/**
 * Load all hint entries from localStorage or cache.
 *
 * Automatically filters out any entries older than 7 days if the policy is localStorage.
 *
 * @returns {Array<object>} The array of hint entries (newest first).
 */
function loadHints() {
  const policy = localStorage.getItem(HINTS_POLICY_KEY) || 'none';
  
  if (policy === 'none') {
    return [];
  }
  
  if (policy === 'file') {
    return window.stego_hints_file_cache || [];
  }

  // LocalStorage Policy
  try {
    const data = localStorage.getItem(HINTS_STORAGE_KEY);
    if (!data) return [];
    
    let hints = JSON.parse(data);
    if (!Array.isArray(hints)) return [];

    // Apply 7-day TTL filter
    const now = Date.now();
    const activeHints = hints.filter(hint => {
      const entryTime = new Date(hint.timestamp).getTime();
      return (now - entryTime) < HINTS_TTL_MS;
    });

    // If some hints expired, rewrite the cleaned array back
    if (activeHints.length !== hints.length) {
      localStorage.setItem(HINTS_STORAGE_KEY, JSON.stringify(activeHints));
    }

    return activeHints;
  } catch {
    return [];
  }
}


/**
 * Save a new hint entry securely in accordance with the active storage policy.
 *
 * Prompts the user to set their policy on their first attempt to save a hint.
 *
 * @param {object} entry - The hint entry to save.
 */
async function saveHint(entry) {
  const policy = localStorage.getItem(HINTS_POLICY_KEY);

  // If policy is not configured, intercept and prompt the user first
  if (!policy) {
    showHintsStoragePreferenceModal(async (selectedPolicy, fileHandle) => {
      if (selectedPolicy === 'none') {
        return;
      }
      
      entry.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      
      if (selectedPolicy === 'file' && fileHandle) {
        try {
          // Merge entry into cache (which has the read file content)
          let hints = window.stego_hints_file_cache || [];
          hints.unshift(entry);
          if (hints.length > MAX_HINTS_COUNT) {
            hints.length = MAX_HINTS_COUNT;
          }

          const writable = await fileHandle.createWritable();
          await writable.write(JSON.stringify(hints, null, 2));
          await writable.close();
          window.stego_hints_file_cache = hints;
        } catch (e) {
          console.error("Failed to write first hint to file:", e);
        }
      } else if (selectedPolicy === 'localStorage') {
        localStorage.setItem(HINTS_STORAGE_KEY, JSON.stringify([entry]));
      }
      renderHintsLog();
    });
    return;
  }

  // 1. Policy: None
  if (policy === 'none') {
    return;
  }

  // Generate unique ID using base-36 timestamp + random suffix
  entry.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

  // 2. Policy: File System Access
  if (policy === 'file') {
    try {
      let handle = await getFileHandle();
      if (!handle) {
        // If handle is missing in IndexedDB, fallback is to show toast or request file initialization
        showToast(TRANSLATIONS_HINT_MODAL[getCurrentLang()].fileSelectPrompt);
        return;
      }

      const hasPermission = await verifyFilePermission(handle, true);
      if (!hasPermission) {
        showToast(TRANSLATIONS_HINT_MODAL[getCurrentLang()].toastPermissionDenied);
        return;
      }

      const file = await handle.getFile();
      const text = await file.text();
      let hints = [];
      const cleanText = text ? text.trim() : "";
      if (cleanText.length > 0) {
        try {
          hints = JSON.parse(cleanText);
          const vState = validateHints(hints);
          if (vState !== 'valid') {
            throw new Error("Invalid format or tampering detected");
          }
        } catch (e) {
          console.error("Hints file is corrupted or tampered during save:", e);
          showToast(TRANSLATIONS_HINT_MODAL[getCurrentLang()].toastSaveErrorCorrupted);
          return;
        }
      } else {
        hints = [];
      }

      hints.unshift(entry);
      if (hints.length > MAX_HINTS_COUNT) {
        hints.length = MAX_HINTS_COUNT;
      }

      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(hints, null, 2));
      await writable.close();

      window.stego_hints_file_cache = hints;
      renderHintsLog();
    } catch (err) {
      console.error("Failed to write to local hints file:", err);
      showToast(TRANSLATIONS_HINT_MODAL[getCurrentLang()].toastErrorFile);
    }
    return;
  }

  // 3. Policy: LocalStorage (Default)
  const hints = loadHints();
  hints.unshift(entry);

  // Enforce storage limit
  if (hints.length > MAX_HINTS_COUNT) {
    hints.length = MAX_HINTS_COUNT;
  }

  localStorage.setItem(HINTS_STORAGE_KEY, JSON.stringify(hints));
  renderHintsLog();
}


/**
 * Clear all hints log from storage.
 */
async function clearHintsLog() {
  const policy = localStorage.getItem(HINTS_POLICY_KEY) || 'none';
  const lang = getCurrentLang();
  
  const confirmed = await showClearHintsConfirmModal();
  if (!confirmed) {
    return;
  }

  if (policy === 'file') {
    try {
      const handle = await getFileHandle();
      if (handle) {
        const hasPermission = await verifyFilePermission(handle, true);
        if (hasPermission) {
          const writable = await handle.createWritable();
          await writable.write("[]");
          await writable.close();
          window.stego_hints_file_cache = [];
          showToast(lang === 'ar' ? '🗑 تم مسح ملف التلميحات.' : '🗑 Hint file cleared.');
        }
      }
    } catch (e) {
      showToast(lang === 'ar' ? '❌ فشل مسح ملف التلميحات.' : '❌ Failed to clear hints file.');
    }
  } else {
    localStorage.removeItem(HINTS_STORAGE_KEY);
    showToast(lang === 'ar' ? '🗑 تم مسح سجل التلميحات.' : '🗑 Hint history cleared.');
  }
  
  renderHintsLog();
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


// ── Preferences Integration ───────────────────────────────────

/**
 * Update the storage policy preference from settings or dialogs.
 * Ensures the showSaveFilePicker is called IMMEDIATELY synchronously inside user activation!
 */
async function changeHintsStoragePolicy(value) {
  const oldPolicy = localStorage.getItem(HINTS_POLICY_KEY);
  if (oldPolicy === value) return;

  if (value === 'file') {
    // Synchronously launch file picker right inside user gesture block!
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: 'hints.json',
        types: [{
          description: 'JSON Files',
          accept: { 'application/json': ['.json'] }
        }]
      });
      
      await saveFileHandle(handle);
      localStorage.setItem(HINTS_POLICY_KEY, 'file');
      localStorage.removeItem(HINTS_STORAGE_KEY); // Absolutely purge localStorage of any hint data
      
      // Read existing or initialize empty JSON
      let hints = [];
      try {
        const file = await handle.getFile();
        const text = await file.text();
        const cleanText = text ? text.trim() : "";
        if (cleanText.length > 0) {
          hints = JSON.parse(cleanText);
          if (!Array.isArray(hints)) {
            throw new Error("Invalid format");
          }
          window.stego_hints_file_error = false;
        } else {
          const writable = await handle.createWritable();
          await writable.write("[]");
          await writable.close();
          hints = [];
          window.stego_hints_file_error = false;
        }
      } catch (e) {
        window.stego_hints_file_error = true;
        window.stego_hints_file_cache = null;
        showHintsErrorModal('corrupt');
        showToast(TRANSLATIONS_HINT_MODAL[getCurrentLang()].toastFileCorrupted);
        // Revert settings dropdown value
        if (typeof window.selectSettingsHintsStorageOption === 'function') {
          window.selectSettingsHintsStorageOption(oldPolicy || 'none', true);
        } else {
          const selectEl = document.getElementById('settings-hints-storage');
          if (selectEl) {
            selectEl.value = oldPolicy || 'none';
          }
        }
        return;
      }
      
      window.stego_hints_file_cache = hints;
      showToast(TRANSLATIONS_HINT_MODAL[getCurrentLang()].toastSaved);
    } catch (e) {
      console.error("File selection failed or cancelled:", e);
      showToast(TRANSLATIONS_HINT_MODAL[getCurrentLang()].toastErrorFile);
      // Revert select dropdown value in settings modal
      if (typeof window.selectSettingsHintsStorageOption === 'function') {
        window.selectSettingsHintsStorageOption(oldPolicy || 'none', true);
      } else {
        const selectEl = document.getElementById('settings-hints-storage');
        if (selectEl) {
          selectEl.value = oldPolicy || 'none';
        }
      }
      return;
    }
  } else {
    localStorage.setItem(HINTS_POLICY_KEY, value);
    window.stego_hints_file_cache = null;
    if (value === 'none') {
      localStorage.removeItem(HINTS_STORAGE_KEY);
    }
    showToast(TRANSLATIONS_HINT_MODAL[getCurrentLang()].toastSaved);
  }

  renderHintsLog();
}


/**
 * Reset storage policy preference on demand to allow prompting again.
 */
function resetHintsStoragePolicy() {
  localStorage.removeItem(HINTS_POLICY_KEY);
  localStorage.removeItem(HINTS_STORAGE_KEY);
  removeFileHandle().catch(() => {});
  window.stego_hints_file_cache = null;
  
  // Update select element value back to 'none' (default) in Settings modal
  if (typeof window.selectSettingsHintsStorageOption === 'function') {
    window.selectSettingsHintsStorageOption('none', true);
  } else {
    const selectEl = document.getElementById('settings-hints-storage');
    if (selectEl) {
      selectEl.value = 'none';
    }
  }
  
  showToast(getCurrentLang() === 'ar' ? '🔄 تم إعادة تعيين تفضيلات التخزين وسيتم سؤالك في عملية الإخفاء القادمة!' : '🔄 Storage policy reset! You will be prompted on the next embed.');
  renderHintsLog();
}


// ── Rendering ─────────────────────────────────────────────────

/**
 * Render a list of hint entries as HTML.
 */
function renderHintsList(hintEntries, type) {
  const config = getHintTypeConfig(type);

  if (hintEntries.length === 0) {
    return `
      <div class="hint-empty-state">
        <span class="hint-empty-state__icon">${config.icon}</span>
        <p class="hint-empty-state__text">${config.emptyMessage}</p>
      </div>
    `;
  }

  const rows = hintEntries.map(hintEntry => {
    const formattedTime = formatHintTime(hintEntry.timestamp);
    // Support both 'hint' (new field name) and legacy 'emoji' field
    const hintText = hintEntry.hint ?? hintEntry.emoji ?? '';
    return `
      <div class="hint-row">
        <span class="hint-row-emoji">${escapeHtml(hintText)}</span>
        <span class="hint-row-time">${escapeHtml(formattedTime)}</span>
      </div>
    `;
  });

  return `<div class="hints-list">${rows.join('')}</div>`;
}


/**
 * Render the full hints log in the hints tab.
 */
function renderHintsLog() {
  const receivedContainer = document.getElementById('hintsReceivedContainer');
  const sentContainer     = document.getElementById('hintsSentContainer');
  const latestCard        = document.getElementById('latestHintCard');
  const clearButton       = document.getElementById('btnClearHints');

  if (!receivedContainer || !sentContainer) return;

  const policy = localStorage.getItem(HINTS_POLICY_KEY) || 'none';
  const lang = getCurrentLang();
  const t = TRANSLATIONS_HINT_MODAL[lang];

  // Set up tab-hints alerts container dynamically
  const tabHints = document.getElementById('tab-hints');
  const hintsPanel = document.getElementById('hints-panel');
  let alertContainer = document.getElementById('hintsTabAlertContainer');
  if (tabHints && hintsPanel) {
    if (!alertContainer) {
      alertContainer = document.createElement('div');
      alertContainer.id = 'hintsTabAlertContainer';
      alertContainer.style.marginBottom = 'var(--space-md)';
      tabHints.insertBefore(alertContainer, hintsPanel);
    }
  }

  // ── Inject Active Storage Status Banner ──
  let bannerEl = document.getElementById('hintsStorageStatusBanner');
  if (!bannerEl && hintsPanel) {
    bannerEl = document.createElement('div');
    bannerEl.id = 'hintsStorageStatusBanner';
    const titleEl = hintsPanel.querySelector('.card__title');
    if (titleEl && titleEl.nextElementSibling) {
      titleEl.parentNode.insertBefore(bannerEl, titleEl.nextElementSibling.nextSibling);
    }
  }

  if (bannerEl) {
    if (policy === 'localStorage') {
      bannerEl.className = 'hints-storage-banner hints-storage-banner--active';
      bannerEl.replaceChildren();
      const lsIconWrap = document.createElement('div');
      lsIconWrap.className = 'hints-storage-banner__icon';
      const lsIcon = document.createElement('span');
      lsIcon.className = 'material-symbols-outlined';
      lsIcon.textContent = 'storage';
      lsIconWrap.appendChild(lsIcon);
      const lsTextWrap = document.createElement('div');
      lsTextWrap.className = 'hints-storage-banner__text';
      const lsLabel = document.createElement('span');
      lsLabel.className = 'hints-storage-banner__label';
      lsLabel.textContent = lang === 'ar' ? 'التخزين المحلي' : 'LocalStorage';
      const lsDesc = document.createElement('span');
      lsDesc.className = 'hints-storage-banner__desc';
      lsDesc.textContent = lang === 'ar' ? 'حذف تلقائي بعد 7 أيام' : '7-Day Auto-Purge';
      lsTextWrap.appendChild(lsLabel);
      lsTextWrap.appendChild(lsDesc);
      bannerEl.appendChild(lsIconWrap);
      bannerEl.appendChild(lsTextWrap);
    } else if (policy === 'none') {
      bannerEl.className = 'hints-storage-banner hints-storage-banner--none';
      bannerEl.replaceChildren();
      const noneIconWrap = document.createElement('div');
      noneIconWrap.className = 'hints-storage-banner__icon';
      const noneIcon = document.createElement('span');
      noneIcon.className = 'material-symbols-outlined';
      noneIcon.textContent = 'block';
      noneIconWrap.appendChild(noneIcon);
      const noneTextWrap = document.createElement('div');
      noneTextWrap.className = 'hints-storage-banner__text';
      const noneLabel = document.createElement('span');
      noneLabel.className = 'hints-storage-banner__label';
      noneLabel.textContent = lang === 'ar' ? 'عدم الحفظ' : 'Do Not Save';
      const noneDesc = document.createElement('span');
      noneDesc.className = 'hints-storage-banner__desc';
      noneDesc.textContent = lang === 'ar' ? 'لن يتم حفظ أي تلميحات' : 'No hints will be stored';
      noneTextWrap.appendChild(noneLabel);
      noneTextWrap.appendChild(noneDesc);
      bannerEl.appendChild(noneIconWrap);
      bannerEl.appendChild(noneTextWrap);
    } else if (policy === 'file') {
      bannerEl.className = 'hints-storage-banner hints-storage-banner--file';
      getFileHandle().then(handle => {
        const fileName = handle ? handle.name : 'hints.json';
        bannerEl.replaceChildren();
        const fileIconWrap = document.createElement('div');
        fileIconWrap.className = 'hints-storage-banner__icon';
        const fileIcon = document.createElement('span');
        fileIcon.className = 'material-symbols-outlined';
        fileIcon.textContent = 'draft';
        fileIconWrap.appendChild(fileIcon);
        const fileTextWrap = document.createElement('div');
        fileTextWrap.className = 'hints-storage-banner__text';
        const fileLabel = document.createElement('span');
        fileLabel.className = 'hints-storage-banner__label';
        fileLabel.textContent = lang === 'ar' ? 'ملف محلي مخصص' : 'Secure Local File';
        const fileDesc = document.createElement('span');
        fileDesc.className = 'hints-storage-banner__desc';
        fileDesc.textContent = fileName;
        fileTextWrap.appendChild(fileLabel);
        fileTextWrap.appendChild(fileDesc);
        bannerEl.appendChild(fileIconWrap);
        bannerEl.appendChild(fileTextWrap);
      });
    }
  }

  // Determine validation state
  let allHints = [];
  let validationState = 'valid';

  if (policy === 'file') {
    if (window.stego_hints_file_cache === null) {
      validationState = window.stego_hints_file_error ? 'corrupt' : 'locked';
    } else {
      allHints = window.stego_hints_file_cache;
      validationState = validateHints(allHints);
    }
  } else {
    allHints = loadHints();
    validationState = validateHints(allHints);
  }

  // Handle error & locked layouts
  if (validationState !== 'valid') {
    if (hintsPanel) hintsPanel.style.display = 'block';
    if (latestCard) latestCard.style.display = 'none';
    if (clearButton) clearButton.style.display = 'none';
    receivedContainer.replaceChildren();
    sentContainer.replaceChildren();

    if (validationState === 'locked') {
      if (alertContainer) {
        alertContainer.replaceChildren();
        const lockedCard = document.createElement('div');
        lockedCard.className = 'card hint-locked-card';

        const lockedIconWrap = document.createElement('div');
        lockedIconWrap.className = 'hint-locked-card__icon-wrap';
        const lockedIcon = document.createElement('span');
        lockedIcon.className = 'material-symbols-outlined';
        lockedIcon.style.fontSize = '30px';
        lockedIcon.textContent = 'lock';
        lockedIconWrap.appendChild(lockedIcon);

        const lockedTitle = document.createElement('h3');
        lockedTitle.className = 'hint-locked-card__title';
        lockedTitle.textContent = t.fileLoadTitle;

        const lockedDesc = document.createElement('p');
        lockedDesc.className = 'hint-locked-card__desc';
        lockedDesc.textContent = t.fileLoadDesc;

        const lockedBtn = document.createElement('button');
        lockedBtn.type = 'button';
        lockedBtn.className = 'btn btn--primary';
        lockedBtn.style.cssText = 'display: inline-flex; align-items: center; gap: 8px;';
        const lockedBtnIcon = document.createElement('span');
        lockedBtnIcon.className = 'material-symbols-outlined';
        lockedBtnIcon.style.fontSize = '18px';
        lockedBtnIcon.textContent = 'folder_open';
        lockedBtn.appendChild(lockedBtnIcon);
        lockedBtn.appendChild(document.createTextNode(' ' + t.lockScreenBtn));
        lockedBtn.addEventListener('click', () => handleLoadHintsFromFile());

        lockedCard.appendChild(lockedIconWrap);
        lockedCard.appendChild(lockedTitle);
        lockedCard.appendChild(lockedDesc);
        lockedCard.appendChild(lockedBtn);
        alertContainer.appendChild(lockedCard);
      }
    } else if (validationState === 'corrupt') {
      if (alertContainer) {
        alertContainer.replaceChildren();
        const corruptCard = document.createElement('div');
        corruptCard.className = 'card hint-error-card';

        const corruptHeader = document.createElement('div');
        corruptHeader.className = 'hint-error-card__header';
        const corruptIconWrap = document.createElement('div');
        corruptIconWrap.className = 'hint-error-card__icon-wrap';
        const corruptIcon = document.createElement('span');
        corruptIcon.className = 'material-symbols-outlined';
        corruptIcon.style.fontSize = '24px';
        corruptIcon.textContent = 'error';
        corruptIconWrap.appendChild(corruptIcon);
        const corruptTitle = document.createElement('h3');
        corruptTitle.className = 'hint-error-card__title';
        corruptTitle.textContent = lang === 'ar' ? 'ملف التلميحات تالف أو غير صالح' : 'Hints File Corrupted or Invalid';
        corruptHeader.appendChild(corruptIconWrap);
        corruptHeader.appendChild(corruptTitle);

        const corruptBody = document.createElement('div');
        corruptBody.className = 'hint-error-card__body';
        const corruptDesc = document.createElement('p');
        corruptDesc.className = 'text-body-md hint-error-card__desc';
        corruptDesc.textContent = lang === 'ar'
          ? 'تم اكتشاف خلل في البنية البرمجية لملف التلميحات المفتوح حالياً (JSON Syntax Error). يرجى إصلاح ملف JSON يدوياً على جهازك، أو اختيار مسار ملف آخر صالح.'
          : 'We detected structural issues with the currently active hints file (JSON Syntax Error). Please repair the JSON file manually on your computer, or select another valid file path.';

        const corruptBtnGroup = document.createElement('div');
        corruptBtnGroup.className = 'hint-error-card__btn-group';

        const corruptResetBtn = document.createElement('button');
        corruptResetBtn.type = 'button';
        corruptResetBtn.className = 'btn btn--secondary';
        const corruptResetIcon = document.createElement('span');
        corruptResetIcon.className = 'material-symbols-outlined';
        corruptResetIcon.style.fontSize = '20px';
        corruptResetIcon.textContent = 'restart_alt';
        corruptResetBtn.appendChild(corruptResetIcon);
        corruptResetBtn.appendChild(document.createTextNode(' ' + (lang === 'ar' ? 'إعادة ضبط الإعدادات' : 'Reset Preferences')));
        corruptResetBtn.addEventListener('click', () => resetHintsStoragePolicy());

        const corruptFileBtn = document.createElement('button');
        corruptFileBtn.type = 'button';
        corruptFileBtn.className = 'btn btn--primary';
        const corruptFileIcon = document.createElement('span');
        corruptFileIcon.className = 'material-symbols-outlined';
        corruptFileIcon.style.fontSize = '20px';
        corruptFileIcon.textContent = 'folder_open';
        corruptFileBtn.appendChild(corruptFileIcon);
        corruptFileBtn.appendChild(document.createTextNode(' ' + (lang === 'ar' ? 'اختيار ملف آخر' : 'Choose Another File')));
        corruptFileBtn.addEventListener('click', () => handleLoadHintsFromFile(true));

        corruptBtnGroup.appendChild(corruptResetBtn);
        corruptBtnGroup.appendChild(corruptFileBtn);
        corruptBody.appendChild(corruptDesc);
        corruptBody.appendChild(corruptBtnGroup);

        corruptCard.appendChild(corruptHeader);
        corruptCard.appendChild(corruptBody);
        alertContainer.appendChild(corruptCard);
      }
      if (!window.stego_hints_error_modal_shown) {
        window.stego_hints_error_modal_shown = true;
        showHintsErrorModal('corrupt');
      }
    } else if (validationState.startsWith('tampered')) {
      let errorDescAr = '';
      let errorDescEn = '';

      if (validationState === 'tampered_type') {
        errorDescAr = 'تحذير: يحتوي ملف التلميحات الحالي على قيم غير صالحة في حقل النوع (Type) (يجب أن تكون sent أو received فقط). تم إيقاف عرض البيانات لحمايتك. نرجو مراجعة الملف أو اختيار مسار ملف تلميحات آمن آخر.';
        errorDescEn = 'Warning: The hints file contains invalid values in the (Type) field (must only be sent or received). Data rendering has been disabled to protect your security. Please review the file or configure another secure hints path.';
      } else if (validationState === 'tampered_hint') {
        errorDescAr = 'تحذير: يحتوي ملف التلميحات الحالي على نص تلميح يتجاوز الحد الأقصى المسموح به (60 حرفاً). تم إيقاف عرض البيانات لحمايتك. نرجو مراجعة الملف أو اختيار مسار ملف تلميحات آمن آخر.';
        errorDescEn = 'Warning: The hints file contains hint text that exceeds the maximum limit (60 characters). Data rendering has been disabled to protect your security. Please review the file or configure another secure hints path.';
      } else if (validationState === 'tampered_timestamp') {
        errorDescAr = 'تحذير: يحتوي ملف التلميحات الحالي على طابع زمني (Timestamp) غير صالح أو تم التلاعب بطوله (الحد الأقصى 24 حرفاً). تم إيقاف عرض البيانات لحمايتك. نرجو مراجعة الملف أو اختيار مسار ملف تلميحات آمن آخر.';
        errorDescEn = 'Warning: The hints file contains an invalid timestamp field or its length has been tampered with (maximum 24 characters). Data rendering has been disabled to protect your security. Please review the file or configure another secure hints path.';
      } else {
        errorDescAr = 'تحذير: تم كشف تعديل غير مصرح به في ملف التلميحات. تم إيقاف عرض البيانات لحمايتك. نرجو مراجعة الملف أو اختيار مسار ملف تلميحات آمن آخر.';
        errorDescEn = 'Warning: Unauthorized modification detected in the hints file. Data rendering has been disabled to protect your security. Please review the file or configure another secure hints path.';
      }

      if (alertContainer) {
        alertContainer.replaceChildren();
        const tamperCard = document.createElement('div');
        tamperCard.className = 'card hint-error-card';

        const tamperHeader = document.createElement('div');
        tamperHeader.className = 'hint-error-card__header';
        const tamperIconWrap = document.createElement('div');
        tamperIconWrap.className = 'hint-error-card__icon-wrap';
        const tamperIcon = document.createElement('span');
        tamperIcon.className = 'material-symbols-outlined';
        tamperIcon.style.fontSize = '24px';
        tamperIcon.textContent = 'warning';
        tamperIconWrap.appendChild(tamperIcon);
        const tamperTitle = document.createElement('h3');
        tamperTitle.className = 'hint-error-card__title';
        tamperTitle.textContent = lang === 'ar' ? 'تنبيه أمني: تم كشف تعديل غير مصرح به' : 'Security Alert: Tampering Detected';
        tamperHeader.appendChild(tamperIconWrap);
        tamperHeader.appendChild(tamperTitle);

        const tamperBody = document.createElement('div');
        tamperBody.className = 'hint-error-card__body';
        const tamperDesc = document.createElement('p');
        tamperDesc.className = 'text-body-md hint-error-card__desc';
        tamperDesc.textContent = lang === 'ar' ? errorDescAr : errorDescEn;

        const tamperBtnGroup = document.createElement('div');
        tamperBtnGroup.className = 'hint-error-card__btn-group';

        const tamperResetBtn = document.createElement('button');
        tamperResetBtn.type = 'button';
        tamperResetBtn.className = 'btn btn--secondary';
        const tamperResetIcon = document.createElement('span');
        tamperResetIcon.className = 'material-symbols-outlined';
        tamperResetIcon.style.fontSize = '20px';
        tamperResetIcon.textContent = 'restart_alt';
        tamperResetBtn.appendChild(tamperResetIcon);
        tamperResetBtn.appendChild(document.createTextNode(' ' + (lang === 'ar' ? 'إعادة ضبط الإعدادات' : 'Reset Preferences')));
        tamperResetBtn.addEventListener('click', () => resetHintsStoragePolicy());

        const tamperFileBtn = document.createElement('button');
        tamperFileBtn.type = 'button';
        tamperFileBtn.className = 'btn btn--primary';
        const tamperFileIcon = document.createElement('span');
        tamperFileIcon.className = 'material-symbols-outlined';
        tamperFileIcon.style.fontSize = '20px';
        tamperFileIcon.textContent = 'folder_open';
        tamperFileBtn.appendChild(tamperFileIcon);
        tamperFileBtn.appendChild(document.createTextNode(' ' + (lang === 'ar' ? 'اختيار ملف آخر' : 'Choose Another File')));
        tamperFileBtn.addEventListener('click', () => handleLoadHintsFromFile(true));

        tamperBtnGroup.appendChild(tamperResetBtn);
        tamperBtnGroup.appendChild(tamperFileBtn);
        tamperBody.appendChild(tamperDesc);
        tamperBody.appendChild(tamperBtnGroup);

        tamperCard.appendChild(tamperHeader);
        tamperCard.appendChild(tamperBody);
        alertContainer.appendChild(tamperCard);
      }
      if (!window.stego_hints_error_modal_shown) {
        window.stego_hints_error_modal_shown = true;
        showHintsErrorModal(validationState);
      }
    }
    return;
  }

  // Restore panel & clean alerts if valid
  if (alertContainer) alertContainer.replaceChildren();
  if (hintsPanel) hintsPanel.style.display = 'block';

  const receivedHints = allHints.filter(hintEntry => hintEntry.type === 'received');
  const sentHints     = allHints.filter(hintEntry => hintEntry.type === 'sent');

  // Render the latest hint card (newest entry regardless of type)
  if (allHints.length > 0 && latestCard) {
    latestCard.style.display = 'block';
    const latestHint = allHints[0];
    const config = getHintTypeConfig(latestHint.type);
    const formattedTime = formatHintTime(latestHint.timestamp);

    // Support both 'hint' (new field name) and legacy 'emoji' field
    const latestHintText = latestHint.hint ?? latestHint.emoji ?? '';
    const latestHintContent = document.getElementById('latestHintContent');
    latestHintContent.replaceChildren();
    const activeInner = document.createElement('div');
    activeInner.className = 'hint-active-inner';
    const bigEmoji = document.createElement('span');
    bigEmoji.className = 'hint-big-emoji';
    bigEmoji.textContent = latestHintText;
    const activeInfo = document.createElement('div');
    activeInfo.className = 'hint-active-info';
    const typeBadge = document.createElement('span');
    typeBadge.className = 'hint-type-badge ' + config.cssClass;
    typeBadge.textContent = config.label;
    const timeSpan = document.createElement('span');
    timeSpan.className = 'hint-time';
    timeSpan.textContent = formattedTime;
    activeInfo.appendChild(typeBadge);
    activeInfo.appendChild(timeSpan);
    activeInner.appendChild(bigEmoji);
    activeInner.appendChild(activeInfo);
    latestHintContent.appendChild(activeInner);
  } else if (latestCard) {
    latestCard.style.display = 'none';
  }

  // Toggle clear button visibility
  if (clearButton) {
    clearButton.style.display = allHints.length > 0 ? 'inline-flex' : 'none';
  }

  // Update section header counts
  const receivedCount = document.getElementById('hintsReceivedCount');
  const sentCount = document.getElementById('hintsSentCount');
  if (receivedCount) receivedCount.textContent = receivedHints.length;
  if (sentCount) sentCount.textContent = sentHints.length;

  // Render separated hint lists
  // SECURITY: All dynamic values are escaped via escapeHtml() in renderHintsList()
  receivedContainer.innerHTML = renderHintsList(receivedHints, 'received');
  sentContainer.innerHTML     = renderHintsList(sentHints, 'sent');
}


/**
 * Async handler triggered by lock screen button to load the hints file.
 */
async function handleLoadHintsFromFile(forcePicker = false) {
  const lang = getCurrentLang();
  const t = TRANSLATIONS_HINT_MODAL[lang];
  try {
    let handle = null;
    if (!forcePicker) {
      handle = await getFileHandle();
    }
    if (!handle) {
      // Synchronously prompt user inside click activation
      handle = await window.showSaveFilePicker({
        suggestedName: 'hints.json',
        types: [{
          description: 'JSON Files',
          accept: { 'application/json': ['.json'] }
        }]
      });
      if (!handle) return;
      await saveFileHandle(handle);
    }

    const hasPermission = await verifyFilePermission(handle, true);
    if (!hasPermission) {
      showToast(t.toastPermissionDenied);
      return;
    }

    const file = await handle.getFile();

    // ── DoS Guard #1: File size limit (50 KB) ─────────────────────────────
    if (file.size > MAX_HINTS_FILE_SIZE_BYTES) {
      showToast(t.toastFileTooLarge);
      return;
    }

    const text = await file.text();
    let hints = [];
    const cleanText = text ? text.trim() : "";
    if (cleanText.length > 0) {
      try {
        hints = JSON.parse(cleanText);
        window.stego_hints_file_error = false;
      } catch (e) {
        window.stego_hints_file_error = true;
        window.stego_hints_file_cache = null;
        renderHintsLog();
        showToast(t.toastFileCorrupted);
        return;
      }
    } else {
      hints = [];
      window.stego_hints_file_error = false;
    }

    // ── DoS Guard #2: Entry count cap (40 entries) ─────────────────────────
    let wasTruncated = false;
    if (Array.isArray(hints) && hints.length > MAX_DISPLAY_HINTS) {
      hints = hints.slice(0, MAX_DISPLAY_HINTS);
      wasTruncated = true;
    }

    window.stego_hints_file_cache = hints;
    renderHintsLog();

    // Check validation state to show specific alert toast if tampered
    const vState = validateHints(hints);
    if (vState === 'tampered') {
      showToast(lang === 'ar' ? '⚠️ تنبيه: تم كشف تلاعب في هيكلية الملف.' : '⚠️ Warning: File tampering detected.');
    } else if (wasTruncated) {
      showToast(t.toastHintsTruncated);
    } else {
      showToast(t.toastSaved);
    }
  } catch (err) {
    console.error("Failed to load local hints file:", err);
    showToast(t.toastErrorFile);
  }
}


/**
 * Format an ISO timestamp for display in the hints log.
 */
function formatHintTime(isoString) {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date");
    }
    const datePart = date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
    const timePart = date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    return datePart + ' ' + timePart;
  } catch {
    return isoString;
  }
}


// ── Helper Languages and System checks ──────────────────────────

function getCurrentLang() {
  return localStorage.getItem('stegoLang') || 'en';
}


// ── Premium First-Use Choice Modal ──────────────────────────────

function showHintsStoragePreferenceModal(onSelect) {
  const lang = getCurrentLang();
  const t = TRANSLATIONS_HINT_MODAL[lang];

  // 1. Remove existing dialog if somehow present
  const oldModal = document.getElementById('hint-policy-modal');
  const oldBackdrop = document.getElementById('hint-policy-backdrop');
  if (oldModal) return; // already open, do not spawn another

  // 2. Inject Modal Backdrop & Panel elements
  const backdrop = document.createElement('div');
  backdrop.className = 'stego-modal-backdrop';
  backdrop.id = 'hint-policy-backdrop';

  const modal = document.createElement('div');
  modal.className = 'stego-modal';
  modal.id = 'hint-policy-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.style.width = 'min(500px, 92vw)';

  // SECURITY: Static modal template built from developer-controlled translation strings (safe)
  modal.innerHTML = `
    <div class="stego-modal__header" style="text-align: ${lang === 'ar' ? 'right' : 'left'}">
      <div class="stego-modal__icon-wrap" style="background: rgba(187, 209, 0, 0.1); color: var(--color-primary);">
        <span class="material-symbols-outlined" style="font-size:24px;">lightbulb</span>
      </div>
      <div class="stego-modal__title">${t.modalTitle}</div>
    </div>
    <div class="stego-modal__body" style="display: flex; flex-direction: column; gap: var(--space-md); text-align: ${lang === 'ar' ? 'right' : 'left'}">
      <p style="font-size: var(--fs-body-sm); color: var(--color-on-surface-variant); margin-bottom: 4px; line-height:1.5;">${t.modalSubtitle}</p>
      
      <!-- Option 1: Do Not Save (Default) -->
      <div class="choice-card" data-value="none">
        <input type="radio" name="hint-storage-policy" value="none" style="position: absolute; opacity: 0; pointer-events: none;" checked />
        <span class="choice-card__indicator"></span>
        <div style="display: flex; flex-direction: column; gap: 2px; width: 100%;">
          <span class="choice-card__title">
            ${t.optNoneTitle}
            <span class="badge-neon" style="background: rgba(187, 209, 0, 0.15); color: var(--color-primary); font-size: 0.6rem; padding: 1px 7px; border-radius: var(--radius-full); font-weight: 500; letter-spacing: 0.3px; transition: all 0.25s ease;">${t.defaultBadge}</span>
          </span>
          <span class="choice-card__desc">${t.optNoneDesc}</span>
        </div>
      </div>

      <!-- Option 2: LocalStorage -->
      <div class="choice-card" data-value="localStorage">
        <input type="radio" name="hint-storage-policy" value="localStorage" style="position: absolute; opacity: 0; pointer-events: none;" />
        <span class="choice-card__indicator"></span>
        <div style="display: flex; flex-direction: column; gap: 2px; width: 100%;">
          <span class="choice-card__title">${t.optLocalTitle}</span>
          <span class="choice-card__desc">${t.optLocalDesc}</span>
        </div>
      </div>

      <!-- Option 3: Secure Local File -->
      <div id="hint-opt-file-label" class="choice-card" data-value="file" style="${!window.showSaveFilePicker ? 'opacity: 0.6; cursor: not-allowed;' : ''}">
        <input type="radio" id="hint-radio-file" name="hint-storage-policy" value="file" style="position: absolute; opacity: 0; pointer-events: none;" ${!window.showSaveFilePicker ? 'disabled' : ''} />
        <span class="choice-card__indicator"></span>
        <div style="display: flex; flex-direction: column; gap: 2px; width: 100%;">
          <span class="choice-card__title">
            ${t.optFileTitle}
            ${!window.showSaveFilePicker ? `<span class="badge" style="background: rgba(179,38,30,0.1); color: var(--color-error); font-size: 0.65rem; padding: 2px 6px; border-radius: var(--radius-full); font-weight: normal;">${t.optFileUnsupported}</span>` : ''}
          </span>
          <span class="choice-card__desc">${t.optFileDesc}</span>
        </div>
      </div>

      <!-- Settings change note -->
      <div style="display: flex; align-items: flex-start; gap: 8px; padding: 10px 14px; background: rgba(230, 168, 23, 0.08); border-radius: var(--radius-sm); border: 1px solid rgba(230, 168, 23, 0.25); text-align: ${lang === 'ar' ? 'right' : 'left'}">
        <span class="material-symbols-outlined" style="font-size: 18px; color: #E6A817; flex-shrink: 0; margin-top: 1px;">info</span>
        <span style="font-size: 0.78rem; color: var(--color-on-surface); font-weight: 500; line-height: 1.45;">${t.settingsNote}</span>
      </div>
    </div>
    <div class="stego-modal__footer" style="justify-content: ${lang === 'ar' ? 'flex-start' : 'flex-end'};">
      <button type="button" class="btn btn--secondary" id="hint-policy-cancel">${t.btnCancel}</button>
      <button type="button" class="btn btn--primary" id="hint-policy-save">${t.btnSave}</button>
    </div>
  `;

  document.body.appendChild(backdrop);
  document.body.appendChild(modal);

  // 3. Trigger premium fade-in animations via active classes
  setTimeout(() => {
    backdrop.classList.add('active');
    modal.classList.add('active');
  }, 50);

  // Keep track of selection directly in JS for 100% bulletproof extraction!
  let selectedPolicy = 'none';

  // 4. Highlight borders of radio button selection cards interactively
  const cards = modal.querySelectorAll('.choice-card');
  cards.forEach(card => {
    const radio = card.querySelector('input[type="radio"]');
    if (!radio) return;
    
    // Bind click anywhere on the card to select the radio button
    card.addEventListener('click', () => {
      if (radio.disabled) return;
      
      radio.checked = true;
      selectedPolicy = radio.value;
      
      // Update visual styles
      cards.forEach(c => {
        c.classList.remove('active');
      });
      card.classList.add('active');
    });
  });

  // Set initial active card styling
  const policyVal = localStorage.getItem(HINTS_POLICY_KEY) || 'none';
  selectedPolicy = policyVal;
  const initialRadio = modal.querySelector(`input[name="hint-storage-policy"][value="${policyVal}"]`);
  if (initialRadio && !initialRadio.disabled) {
    initialRadio.checked = true;
    initialRadio.closest('.choice-card').classList.add('active');
  }

  // 5. Wire action button events
  function closeModal() {
    modal.classList.remove('active');
    backdrop.classList.remove('active');
    setTimeout(() => {
      modal.remove();
      backdrop.remove();
    }, 300);
  }

  document.getElementById('hint-policy-cancel').onclick = closeModal;
  
  // The Save click event listener is a synchronous user gesture block!
  document.getElementById('hint-policy-save').onclick = async () => {
    const val = selectedPolicy;
    if (val === 'file') {
      // Synchronously pop open the file picker directly inside the user click!
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: 'hints.json',
          types: [{
            description: 'JSON Files',
            accept: { 'application/json': ['.json'] }
          }]
        });
        
        await saveFileHandle(handle);
        localStorage.setItem(HINTS_POLICY_KEY, 'file');
        localStorage.removeItem(HINTS_STORAGE_KEY); // Purge localStorage stego hints immediately!
        
        // Read existing or initialize empty JSON
        let hints = [];
        try {
          const file = await handle.getFile();
          const text = await file.text();
          hints = JSON.parse(text || "[]");
          if (!Array.isArray(hints)) hints = [];
        } catch (e) {
          hints = [];
        }
        
        window.stego_hints_file_cache = hints;
        showToast(t.toastSaved);
        
        // Execute callback
        await onSelect('file', handle);
      } catch (err) {
        console.error("Secure hints file picker was closed or failed:", err);
        showToast(t.toastErrorFile);
        return; // Do not close the modal dialog
      }
    } else {
      localStorage.setItem(HINTS_POLICY_KEY, val);
      if (val === 'none') {
        localStorage.removeItem(HINTS_STORAGE_KEY);
      }
      showToast(t.toastSaved);
      await onSelect(val);
    }
    closeModal();
    renderHintsLog();
  };
}

/**
 * Prompts the user with a beautiful modal to confirm clearing the hints log.
 * Returns a Promise resolving to true (confirm) or false (cancel).
 */
function showClearHintsConfirmModal() {
  return new Promise((resolve) => {
    const lang = getCurrentLang();
    const t = TRANSLATIONS_HINT_MODAL[lang];

    // Prevent duplicates
    const oldModal = document.getElementById('hint-confirm-modal');
    if (oldModal) {
      resolve(false);
      return;
    }

    const backdrop = document.createElement('div');
    backdrop.className = 'stego-modal-backdrop';
    backdrop.id = 'hint-confirm-backdrop';

    const modal = document.createElement('div');
    modal.className = 'stego-modal';
    modal.id = 'hint-confirm-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.style.width = 'min(500px, 92vw)';

    const title = t.confirmClearTitle;
    const desc = t.confirmClearDesc;
    const icon = 'delete_forever';
    const iconColor = 'var(--color-error)';
    const iconBg = 'rgba(179, 38, 30, 0.1)';

    // SECURITY: Static confirmation modal template built from developer-controlled translation strings (safe)
    modal.innerHTML = `
      <div class="stego-modal__header" style="text-align: ${lang === 'ar' ? 'right' : 'left'}">
        <div class="stego-modal__icon-wrap" style="background: ${iconBg}; color: ${iconColor};">
          <span class="material-symbols-outlined" style="font-size:24px;">${icon}</span>
        </div>
        <div class="stego-modal__title">${title}</div>
      </div>
      <div class="stego-modal__body" style="text-align: ${lang === 'ar' ? 'right' : 'left'}; font-size: var(--fs-body-md); color: var(--color-on-surface-variant); line-height: 1.6;">
        <p>${desc}</p>
      </div>
      <div class="stego-modal__footer" style="justify-content: ${lang === 'ar' ? 'flex-start' : 'flex-end'};">
        <button type="button" class="btn btn--secondary" id="hint-confirm-cancel">${t.btnCancel}</button>
        <button type="button" class="btn btn--danger" id="hint-confirm-proceed">${t.btnConfirmClear}</button>
      </div>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(modal);

    setTimeout(() => {
      backdrop.classList.add('active');
      modal.classList.add('active');
    }, 50);

    function closeModal(result) {
      modal.classList.remove('active');
      backdrop.classList.remove('active');
      setTimeout(() => {
        modal.remove();
        backdrop.remove();
        resolve(result);
      }, 300);
    }

    // Cancel triggers
    backdrop.onclick = () => closeModal(false);
    document.getElementById('hint-confirm-cancel').onclick = () => closeModal(false);
    
    // Proceed trigger
    document.getElementById('hint-confirm-proceed').onclick = () => closeModal(true);
  });
}

/**
 * Premium Modal to show file corruption or tampering alert.
 * Matches design pattern of EXIF/Metadata stripping modal.
 */

function showHintsErrorModal(type) {
  const lang = getCurrentLang();
  const t = TRANSLATIONS_HINT_MODAL[lang];

  // Prevent duplicate modals
  const oldModal = document.getElementById('hint-error-modal');
  if (oldModal) return;

  const backdrop = document.createElement('div');
  backdrop.className = 'stego-modal-backdrop';
  backdrop.id = 'hint-error-backdrop';

  const modal = document.createElement('div');
  modal.className = 'stego-modal';
  modal.id = 'hint-error-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.style.width = 'min(500px, 92vw)';

  let title, desc, icon, iconColor, iconBg;
  if (type === 'corrupt') {
    title = lang === 'ar' ? 'ملف التلميحات تالف أو غير صالح' : 'Hints File Corrupted or Invalid';
    desc = lang === 'ar' 
      ? 'تم اكتشاف خلل في البنية البرمجية لملف التلميحات المفتوح حالياً (JSON Syntax Error). يرجى إصلاح ملف JSON يدوياً على جهازك، أو اختيار مسار ملف آخر صالح.' 
      : 'We detected structural issues with the currently active hints file (JSON Syntax Error). Please repair the JSON file manually on your computer, or select another valid file path.';
    icon = 'error';
    iconColor = 'var(--color-error)';
    iconBg = 'rgba(179, 38, 30, 0.1)';
  } else {
    title = lang === 'ar' ? 'تنبيه أمني: تم كشف تعديل غير مصرح به' : 'Security Alert: Tampering Detected';
    icon = 'security';
    iconColor = 'var(--color-error)';
    iconBg = 'rgba(179, 38, 30, 0.1)';

    if (type === 'tampered_type') {
      desc = lang === 'ar'
        ? 'تحذير: يحتوي ملف التلميحات الحالي على قيم غير صالحة في حقل النوع (Type) (يجب أن تكون sent أو received فقط). تم إيقاف عرض البيانات لحمايتك. نرجو مراجعة الملف أو اختيار مسار ملف تلميحات آمن آخر.'
        : 'Warning: The hints file contains invalid values in the (Type) field (must only be sent or received). Data rendering has been disabled to protect your security. Please review the file or configure another secure hints path.';
    } else if (type === 'tampered_hint') {
      desc = lang === 'ar'
        ? 'تحذير: يحتوي ملف التلميحات الحالي على نص تلميح يتجاوز الحد الأقصى المسموح به (60 حرفاً). تم إيقاف عرض البيانات لحمايتك. نرجو مراجعة الملف أو اختيار مسار ملف تلميحات آمن آخر.'
        : 'Warning: The hints file contains hint text that exceeds the maximum limit (60 characters). Data rendering has been disabled to protect your security. Please review the file or configure another secure hints path.';
    } else if (type === 'tampered_timestamp') {
      desc = lang === 'ar'
        ? 'تحذير: يحتوي ملف التلميحات الحالي على طابع زمني (Timestamp) غير صالح أو تم التلاعب بطوله (الحد الأقصى 24 حرفاً). تم إيقاف عرض البيانات لحمايتك. نرجو مراجعة الملف أو اختيار مسار ملف تلميحات آمن آخر.'
        : 'Warning: The hints file contains an invalid timestamp field or its length has been tampered with (maximum 24 characters). Data rendering has been disabled to protect your security. Please review the file or configure another secure hints path.';
    } else {
      desc = lang === 'ar'
        ? 'تحذير: تم كشف تعديل غير مصرح به في ملف التلميحات. تم إيقاف عرض البيانات لحمايتك. نرجو مراجعة الملف أو اختيار مسار ملف تلميحات آمن آخر.'
        : 'Warning: Unauthorized modification detected in the hints file. Data rendering has been disabled to protect your security. Please review the file or configure another secure hints path.';
    }
  }

  // SECURITY: Static error modal template built from developer-controlled translation strings (safe)
  modal.innerHTML = `
    <div class="stego-modal__header" style="text-align: ${lang === 'ar' ? 'right' : 'left'}">
      <div class="stego-modal__icon-wrap" style="background: ${iconBg}; color: ${iconColor};">
        <span class="material-symbols-outlined" style="font-size:24px;">${icon}</span>
      </div>
      <div class="stego-modal__title">${title}</div>
    </div>
    <div class="stego-modal__body" style="text-align: ${lang === 'ar' ? 'right' : 'left'}; font-size: var(--fs-body-md); color: var(--color-on-surface-variant); line-height: 1.6;">
      <p>${desc}</p>
    </div>
    <div class="stego-modal__footer" style="justify-content: ${lang === 'ar' ? 'flex-start' : 'flex-end'};">
      <button type="button" class="btn btn--secondary" id="hint-error-reset">${lang === 'ar' ? 'إعادة ضبط الإعدادات' : 'Reset Preferences'}</button>
      <button type="button" class="btn btn--primary" id="hint-error-browse">${lang === 'ar' ? 'اختيار ملف آخر' : 'Choose Another File'}</button>
    </div>
  `;

  document.body.appendChild(backdrop);
  document.body.appendChild(modal);

  setTimeout(() => {
    backdrop.classList.add('active');
    modal.classList.add('active');
  }, 50);

  function closeModal() {
    modal.classList.remove('active');
    backdrop.classList.remove('active');
    setTimeout(() => {
      modal.remove();
      backdrop.remove();
    }, 300);
  }

  backdrop.onclick = closeModal;

  document.getElementById('hint-error-reset').onclick = () => {
    window.stego_hints_error_modal_shown = false;
    resetHintsStoragePolicy();
    closeModal();
  };

  document.getElementById('hint-error-browse').onclick = async () => {
    window.stego_hints_error_modal_shown = false;
    closeModal();
    await handleLoadHintsFromFile(true);
  };
}

// Initialize hints page tab rendering and check permissions on load
document.addEventListener('DOMContentLoaded', async () => {
  // If the policy is 'file', check and request read permissions silently
  const policy = localStorage.getItem(HINTS_POLICY_KEY);
  if (policy === 'file') {
    try {
      const handle = await getFileHandle();
      if (handle) {
        // Query permissions. Do not trigger popups unless the user visits the hints page tab or clicks load hints.
        const options = { mode: 'readwrite' };
        if ((await handle.queryPermission(options)) === 'granted') {
          const file = await handle.getFile();

          // ── DoS Guard #1: File size limit (50 KB) — silent load ──────────
          if (file.size > MAX_HINTS_FILE_SIZE_BYTES) {
            console.warn('Hints file exceeds 50 KB limit — silent load skipped.');
            window.stego_hints_file_error = false;
            window.stego_hints_file_cache = [];
          } else {
            const text = await file.text();
            let hints = [];
            try {
              const cleanText = text ? text.trim() : "";
              if (cleanText.length > 0) {
                hints = JSON.parse(cleanText);
                if (!Array.isArray(hints)) hints = [];
                // ── DoS Guard #2: Entry count cap (40 entries) — silent load ──
                if (hints.length > MAX_DISPLAY_HINTS) {
                  hints = hints.slice(0, MAX_DISPLAY_HINTS);
                }
                window.stego_hints_file_error = false;
              }
            } catch (err) {
              console.error("Silent hints load failed: file is corrupted", err);
              hints = null;
              window.stego_hints_file_error = true;
            }
            window.stego_hints_file_cache = hints;
          }
        }
      }
    } catch (e) {
      console.warn("Could not check files silently on startup:", e);
    }
  }

  // Bind hints render log triggers
  const hintsTabBtn = document.querySelector('[data-tab="hints"]');
  if (hintsTabBtn) {
    hintsTabBtn.addEventListener('click', renderHintsLog);
  }
  
  // Call initial render log in extract.html hints panel if tab is active
  if (window.location.hash === '#hints') {
    setTimeout(renderHintsLog, 200);
  }
});
