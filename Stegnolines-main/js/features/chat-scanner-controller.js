// ══════════════════════════════════════════════════════════════
// JavaScript Features — Chat Scanner UI Controller
// ══════════════════════════════════════════════════════════════
//
// Manages the chat logs scanner interactive UI elements, password toggles,
// platforms select logic, and integrated file dropzone parsing.
//
// ══════════════════════════════════════════════════════════════

let _currentScannerFile = null;
let _currentScannerFileContent = null;

function togglePlatformSelect(e) {
  e.stopPropagation();
  const optionsEl = document.getElementById('platformSelectOptions');
  if (optionsEl) optionsEl.classList.toggle('open');
}

function syncPlatformSelectLabel(lang) {
  const labelSpan = document.getElementById('platformSelectLabel');
  const scannerPlatform = document.getElementById('scannerPlatform');
  if (!labelSpan || !scannerPlatform) return;
  
  const value = scannerPlatform.value || 'auto';
  const opt = document.querySelector(`#platformSelectOptions .custom-option[data-value="${value}"]`);
  if (!opt) return;
  
  const iconWrapper = opt.querySelector('.platform-icon-wrapper');
  const translationKeys = {
    auto: "platformAuto",
    whatsapp_android: "platformWhatsAppAndroid",
    whatsapp_ios: "platformWhatsAppIos",
    facebook: "platformFacebook",
    instagram: "platformInstagram",
    telegram: "platformTelegram",
    x: "platformX",
    tiktok: "platformTikTok",
    youtube: "platformYouTube",
    wechat: "platformWeChat",
    snapchat: "platformSnapchat",
    linkedin: "platformLinkedIn",
    manual: "platformManual",
    generic: "platformGeneric"
  };
  
  const key = translationKeys[value];
  if (key) {
    labelSpan.setAttribute('data-i18n', key);
    let nameText = "";
    
    if (typeof TRANSLATIONS_EXTRACT !== 'undefined' && TRANSLATIONS_EXTRACT[lang] && TRANSLATIONS_EXTRACT[lang][key]) {
      nameText = TRANSLATIONS_EXTRACT[lang][key];
    } else if (typeof translations !== 'undefined' && translations[lang] && translations[lang][key]) {
      nameText = translations[lang][key];
    } else if (typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
      nameText = TRANSLATIONS[lang][key];
    } else {
      const nameSpan = opt.querySelector('[data-i18n]');
      nameText = nameSpan ? nameSpan.textContent.trim() : value;
    }
    
    if (iconWrapper) {
      labelSpan.innerHTML = `
        <span class="platform-icon-wrapper" style="${iconWrapper.getAttribute('style') || ''}">
          ${iconWrapper.innerHTML}
        </span>
        <span>${nameText}</span>
      `;
    } else {
      labelSpan.textContent = nameText;
    }
  }
}

function selectPlatformOption(value, label) {
  const scannerPlatform = document.getElementById('scannerPlatform');
  if (scannerPlatform) scannerPlatform.value = value;
  
  const currentLang = localStorage.getItem('stegoLang') || document.documentElement.getAttribute('lang') || 'en';
  syncPlatformSelectLabel(currentLang);
  
  // Update selected class
  const options = document.querySelectorAll('#platformSelectOptions .custom-option');
  options.forEach(opt => {
    if (opt.getAttribute('data-value') === value) opt.classList.add('selected');
    else opt.classList.remove('selected');
  });
  
  const optionsEl = document.getElementById('platformSelectOptions');
  if (optionsEl) optionsEl.classList.remove('open');

  // If a file is currently loaded in the dropzone, re-parse with the new platform
  if (_currentScannerFile && _currentScannerFileContent) {
    _parseAndApplyFile(_currentScannerFile, _currentScannerFileContent);
  }
}

// ── Scanner Input Mode Switcher (Paste Text vs Upload File) ──
function switchScannerInputMode(mode) {
  const textBtn = document.getElementById('btn-scanner-mode-text');
  const fileBtn = document.getElementById('btn-scanner-mode-file');
  const textPanel = document.getElementById('scanner-mode-text-panel');
  const filePanel = document.getElementById('scanner-mode-file-panel');

  if (mode === 'text') {
    if (textBtn) textBtn.classList.add('active');
    if (fileBtn) fileBtn.classList.remove('active');
    if (textPanel) textPanel.style.display = 'block';
    if (filePanel) filePanel.style.display = 'none';
  } else {
    if (fileBtn) fileBtn.classList.add('active');
    if (textBtn) textBtn.classList.remove('active');
    if (filePanel) filePanel.style.display = 'block';
    if (textPanel) textPanel.style.display = 'none';
  }
}

// ── Handle File Upload in Scanner Dropzone ──
async function handleScannerFileUpload(files) {
  if (!files || files.length === 0) return;
  const file = files[0];
  _currentScannerFile = file;

  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'zip') {
    const reader = new FileReader();
    reader.onload = async function(e) {
      const buffer = e.target.result;
      _currentScannerFileContent = buffer;
      if (window.ChatParsers && typeof window.ChatParsers.parseZipArchive === 'function') {
        const extracted = await window.ChatParsers.parseZipArchive(buffer);
        if (extracted && extracted.length > 0) {
          _parseAndApplyFile(file, extracted[0].text);
        } else {
          showToast('⚠ ' + _t('noZipFiles', 'No readable chat files found inside the ZIP.'));
        }
      }
    };
    reader.readAsArrayBuffer(file);
  } else {
    const reader = new FileReader();
    reader.onload = function(e) {
      const text = e.target.result;
      _currentScannerFileContent = text;
      _parseAndApplyFile(file, text);
    };
    reader.readAsText(file, 'utf-8');
  }
}

function _parseAndApplyFile(file, rawText) {
  rawText = (rawText || '').replace(/^\uFEFF/, '').replace(/\r/g, '');
  const platformVal = (document.getElementById('scannerPlatform') && document.getElementById('scannerPlatform').value) || 'auto';
  const ext = file.name.split('.').pop().toLowerCase();
  let parsedResult = null;
  let messageList = [];
  let formattedChatText = '';

  if (window.ChatParsers) {
    const P = window.ChatParsers;
    try {
      if (ext === 'json') {
        if (platformVal === 'telegram') {
          parsedResult = P.parseTelegramJson(rawText);
        } else if (platformVal === 'facebook' || platformVal === 'instagram') {
          parsedResult = P.parseMetaJson(rawText);
        } else {
          // Auto: try telegram, then meta, then generic
          parsedResult = P.parseTelegramJson(rawText);
          if (!parsedResult || !parsedResult.messages || parsedResult.messages.length === 0) {
            parsedResult = P.parseMetaJson(rawText);
          }
          if (!parsedResult || !parsedResult.messages || parsedResult.messages.length === 0) {
            parsedResult = P.parseGenericJson(rawText);
          }
        }
      } else if (ext === 'csv') {
        if (platformVal === 'linkedin') {
          parsedResult = P.parseLinkedInCsv(rawText);
        } else {
          parsedResult = P.parseGenericCsv(rawText);
        }
      } else if (ext === 'html' || ext === 'htm') {
        if (platformVal === 'telegram') {
          parsedResult = P.parseTelegramHtml(rawText);
        } else if (platformVal === 'facebook' || platformVal === 'instagram') {
          parsedResult = P.parseMetaHtml(rawText);
        } else {
          parsedResult = P.parseGenericHtml(rawText);
        }
      } else {
        // .txt or generic
        if (platformVal.startsWith('whatsapp') || platformVal === 'auto') {
          parsedResult = P.parseWhatsAppTxt(rawText);
          if ((!parsedResult || !parsedResult.messages || parsedResult.messages.length === 0) && platformVal === 'auto') {
            parsedResult = P.parseGenericTxt(rawText);
          }
        } else {
          parsedResult = P.parseGenericTxt(rawText);
        }
      }
    } catch (err) {
      console.warn('Parser error in _parseAndApplyFile:', err);
    }
  }

  // Extract messages array safely
  if (parsedResult) {
    if (Array.isArray(parsedResult.messages)) {
      messageList = parsedResult.messages;
    } else if (Array.isArray(parsedResult)) {
      messageList = parsedResult;
    }
  }

  // Format into chat input text
  if (messageList.length > 0) {
    formattedChatText = messageList.map(m => m.rawText || m.cleanText || (typeof m === 'string' ? m : '')).filter(Boolean).join('\n');
  } else {
    formattedChatText = (rawText || '').trim();
  }

  // Save parsed content into memory for scanner engine (do not dump into textarea)
  window._scannerUploadedFileText = formattedChatText;

  // Calculate message count
  const msgCount = messageList.length > 0 ? messageList.length : formattedChatText.split('\n').filter(l => l.trim().length > 0).length;

  // Update dropzone UI (switch from prompt to loaded file view inside the box)
  const promptEl = document.getElementById('scanner-dropzone-prompt');
  const infoBar = document.getElementById('scanner-file-info-bar');
  const dropzone = document.getElementById('scanner-file-dropzone');

  if (promptEl) promptEl.style.display = 'none';
  if (infoBar) infoBar.style.display = 'flex';
  if (dropzone) dropzone.classList.add('has-file');

  const nameDisplay = document.getElementById('scanner-file-name-display');
  const sizeDisplay = document.getElementById('scanner-file-size-display');
  const countTextEl = document.getElementById('scanner-file-msg-count-text');
  const countDisplay = document.getElementById('scanner-file-msg-count');

  if (nameDisplay) nameDisplay.textContent = file.name;
  if (sizeDisplay) sizeDisplay.textContent = `(${_formatBytes(file.size)})`;
  const curLang = localStorage.getItem('stegoLang') || 'en';
  const countStr = curLang === 'ar' ? `${msgCount} رسالة` : `${msgCount} msgs`;
  if (countTextEl) {
    countTextEl.textContent = countStr;
  } else if (countDisplay) {
    countDisplay.textContent = countStr;
  }

  const toastMsg = _t('fileLoadedToast', 'Chat file loaded and parsed successfully!');
  if (typeof showToast === 'function') {
    showToast('✅ ' + toastMsg);
  }
}

// ── Validate and Get Active Scanner Input (Enforces Mutual Exclusion) ──
window.getScannerInputValidation = function() {
  const chatInput = document.getElementById('scannerChatInput');
  const textareaText = (chatInput && chatInput.value && chatInput.value.trim()) || '';
  const fileText = (window._scannerUploadedFileText && window._scannerUploadedFileText.trim()) || '';

  if (textareaText.length > 0 && fileText.length > 0) {
    return { status: 'conflict', text: '' };
  }
  if (fileText.length > 0) {
    return { status: 'file', text: fileText };
  }
  if (textareaText.length > 0) {
    return { status: 'text', text: textareaText };
  }
  return { status: 'empty', text: '' };
};

// ── Get Active Scanner Input Text (Uploaded File OR Pasted Textarea) ──
window.getScannerInputText = function() {
  const res = (typeof window.getScannerInputValidation === 'function')
    ? window.getScannerInputValidation()
    : { status: 'empty', text: '' };
  return res.text || '';
};

// ── Remove Loaded Scanner File ──
function removeScannerFile(e) {
  if (e) e.stopPropagation();
  _currentScannerFile = null;
  _currentScannerFileContent = null;
  window._scannerUploadedFileText = null;

  const fileInput = document.getElementById('scanner-file-input');
  if (fileInput) fileInput.value = '';

  const promptEl = document.getElementById('scanner-dropzone-prompt');
  const infoBar = document.getElementById('scanner-file-info-bar');
  const dropzone = document.getElementById('scanner-file-dropzone');

  if (infoBar) infoBar.style.display = 'none';
  if (promptEl) promptEl.style.display = 'flex';
  if (dropzone) dropzone.classList.remove('has-file');
}

function _formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function _t(key, fallback) {
  const lang = localStorage.getItem('stegoLang') || document.documentElement.lang || 'en';
  if (window.translations && window.translations[lang] && window.translations[lang][key]) {
    return window.translations[lang][key];
  }
  if (typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
    return TRANSLATIONS[lang][key];
  }
  return fallback;
}

// ── DOM Initialization ──
document.addEventListener('DOMContentLoaded', () => {
  /* ── Helper to bind eye toggle to an input element ── */
  function bindEyeToggle(btn, input) {
    if (!btn || !input) return;
    btn.addEventListener('click', () => {
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      const icon = btn.querySelector('.material-symbols-outlined');
      if (icon) {
        icon.textContent = isHidden ? 'visibility_off' : 'visibility';
      }
    });
  }

  // Bind first stego key eye toggle
  const firstStegoInput = document.getElementById('scannerPassword');
  const firstStegoEye = document.querySelector('.scanner-stego-eye');
  if (firstStegoInput && firstStegoEye) {
    bindEyeToggle(firstStegoEye, firstStegoInput);
  }

  // Bind first AES key eye toggle
  const firstAesInput = document.getElementById('scannerEncryptionKey');
  const firstAesEye = document.querySelector('.scanner-aes-eye');
  if (firstAesInput && firstAesEye) {
    bindEyeToggle(firstAesEye, firstAesInput);
  }

  // ── Manage Stego Keys List ──
  const btnAddStegoKey = document.getElementById('btnAddScannerStegoKey');
  const stegoContainer = document.getElementById('scannerStegoKeysContainer');
  if (btnAddStegoKey && stegoContainer) {
    btnAddStegoKey.addEventListener('click', () => {
      const row = document.createElement('div');
      row.className = 'key-input-row key-input-row-animated';
      row.style.cssText = 'display: flex; gap: var(--space-sm); align-items: center;';

      const wrap = document.createElement('div');
      wrap.className = 'input-eye-wrap';
      wrap.style.cssText = 'flex: 1; position: relative;';

      const input = document.createElement('input');
      input.className = 'form-input scanner-stego-key-input';
      input.type = 'password';

      const currentLang = localStorage.getItem('stegoLang') || 'en';
      const placeholder = currentLang === 'ar' ? 'أدخل المفتاح المشترك...' : 'Enter key...';
      input.placeholder = placeholder;

      const eyeBtn = document.createElement('button');
      eyeBtn.className = 'eye-toggle-btn scanner-stego-eye';
      eyeBtn.type = 'button';
      eyeBtn.setAttribute('aria-label', 'Toggle key visibility');
      eyeBtn.innerHTML = '<span class="material-symbols-outlined">visibility</span>';

      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn--danger btn-remove-key';
      delBtn.type = 'button';
      delBtn.setAttribute('aria-label', 'Remove key');
      delBtn.style.cssText = 'padding: 6px; display: flex; align-items: center; justify-content: center; height: 38px; width: 38px; border-radius: var(--radius-default); flex-shrink: 0;';
      delBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 20px;">delete</span>';

      wrap.appendChild(input);
      wrap.appendChild(eyeBtn);
      row.appendChild(wrap);
      row.appendChild(delBtn);
      stegoContainer.appendChild(row);

      bindEyeToggle(eyeBtn, input);
      delBtn.addEventListener('click', () => {
        row.classList.add('removing');
        row.addEventListener('animationend', () => row.remove());
        setTimeout(() => row.remove(), 310);
      });
    });
  }

  // ── Manage AES Keys List ──
  const btnAddAesKey = document.getElementById('btnAddScannerAesKey');
  const aesContainer = document.getElementById('scannerAesKeysContainer');
  if (btnAddAesKey && aesContainer) {
    btnAddAesKey.addEventListener('click', () => {
      const row = document.createElement('div');
      row.className = 'key-input-row key-input-row-animated';
      row.style.cssText = 'display: flex; gap: var(--space-sm); align-items: center;';

      const wrap = document.createElement('div');
      wrap.className = 'input-eye-wrap';
      wrap.style.cssText = 'flex: 1; position: relative;';

      const input = document.createElement('input');
      input.className = 'form-input scanner-aes-key-input';
      input.type = 'password';

      const currentLang = localStorage.getItem('stegoLang') || 'en';
      const placeholder = currentLang === 'ar' ? 'أدخل مفتاح التشفير AES...' : 'Enter AES decryption key...';
      input.placeholder = placeholder;

      const eyeBtn = document.createElement('button');
      eyeBtn.className = 'eye-toggle-btn scanner-aes-eye';
      eyeBtn.type = 'button';
      eyeBtn.setAttribute('aria-label', 'Toggle AES key visibility');
      eyeBtn.innerHTML = '<span class="material-symbols-outlined">visibility</span>';

      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn--danger btn-remove-key';
      delBtn.type = 'button';
      delBtn.setAttribute('aria-label', 'Remove key');
      delBtn.style.cssText = 'padding: 6px; display: flex; align-items: center; justify-content: center; height: 38px; width: 38px; border-radius: var(--radius-default); flex-shrink: 0;';
      delBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 20px;">delete</span>';

      wrap.appendChild(input);
      wrap.appendChild(eyeBtn);
      row.appendChild(wrap);
      row.appendChild(delBtn);
      aesContainer.appendChild(row);

      bindEyeToggle(eyeBtn, input);
      delBtn.addEventListener('click', () => {
        row.classList.add('removing');
        row.addEventListener('animationend', () => row.remove());
        setTimeout(() => row.remove(), 310);
      });
    });
  }

  // ── Drag & Drop Event Listeners for Scanner Dropzone ──
  const dropzone = document.getElementById('scanner-file-dropzone');
  if (dropzone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
      }, false);
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        handleScannerFileUpload(dt.files);
      }
    }, false);
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', function(e) {
    const wrapper = document.getElementById('platformSelectWrapper');
    const optionsEl = document.getElementById('platformSelectOptions');
    if (wrapper && !wrapper.contains(e.target) && optionsEl) {
      optionsEl.classList.remove('open');
    }
  });
});
