// ══════════════════════════════════════════════════════════════
// JavaScript Features — Chat Scanner UI Controller
// ══════════════════════════════════════════════════════════════
//
// Manages the chat logs scanner interactive UI elements, password toggles,
// and platforms select logic.
//
// ══════════════════════════════════════════════════════════════

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
    
    // Attempt to resolve translations from extract dictionary
    if (typeof TRANSLATIONS_EXTRACT !== 'undefined' && TRANSLATIONS_EXTRACT[lang] && TRANSLATIONS_EXTRACT[lang][key]) {
      nameText = TRANSLATIONS_EXTRACT[lang][key];
    } else if (typeof translations !== 'undefined' && translations[lang] && translations[lang][key]) {
      nameText = translations[lang][key];
    } else if (typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
      nameText = TRANSLATIONS[lang][key];
    } else {
      // Fallback to option DOM text content
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
}

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

  // Close dropdown when clicking outside
  document.addEventListener('click', function(e) {
    const wrapper = document.getElementById('platformSelectWrapper');
    const optionsEl = document.getElementById('platformSelectOptions');
    if (wrapper && !wrapper.contains(e.target) && optionsEl) {
      optionsEl.classList.remove('open');
    }
  });
});
