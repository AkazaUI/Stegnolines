// ══════════════════════════════════════════════════════════════
// JavaScript Features — Image Extraction Controller
// ══════════════════════════════════════════════════════════════
//
// Manages the steganographic extraction of hidden images from stego-text.
// Decrypts payloads using AES-CTR and handles download/preview setups.
//
// Dependencies:
//   - js/core/crypto/aes-ctr.js
//   - js/core/stego/vs-codec.js
//   - js/shared/ui-helpers.js
//
// ══════════════════════════════════════════════════════════════

/**
 * Detects the MIME type of an image byte stream using magic bytes.
 * Supporting PNG, JPEG, WebP, and AVIF.
 *
 * @param {Uint8Array} bytes - The image file bytes.
 * @returns {string|null} The resolved MIME type, or null if unknown.
 */
function detectMimeType(bytes) {
  if (bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return 'image/png';
  }
  if (bytes.length >= 3 &&
      bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return 'image/jpeg';
  }
  if (bytes.length >= 12 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return 'image/webp';
  }
  if (bytes.length >= 12 &&
      bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (brand === 'avif' || brand === 'avis' || brand === 'mif1') {
      return 'image/avif';
    }
  }
  return null;
}

// ── MAIN IMAGE EXTRACTION PIPELINE ──
async function performImageExtraction() {
  const currentLang = localStorage.getItem('stegoLang') || 'en';
  hideImgExtractResultsPanel();

  const timeEl = document.getElementById('imgExtractTimeTaken');
  if (timeEl) timeEl.style.display = 'none';
  const imgDecompressCard = document.getElementById('imgDecompressCard');
  if (imgDecompressCard) imgDecompressCard.style.display = 'none';

  const stegoText = document.getElementById('imgExtractStego').value.trim();
  const stegoKey = document.getElementById('imgExtractKey').value.trim();

  // 1. Validations
  if (!stegoText) {
    showToast(currentLang === 'ar' ? '⚠ الرجاء إدخال النص الإخفائي.' : '⚠ Please input the stego-text.');
    return;
  }
  if (!stegoKey) {
    showToast(currentLang === 'ar' ? '⚠ الرجاء إدخال مفتاح فك التشفير AES-CTR.' : '⚠ Please input the AES-CTR Key.');
    return;
  }

  try {
    const startTime = performance.now();
    // 2. Extract Variation Selector bytes from stego text
    const { vsBytes, cleanText: coverText } = extractVSFromText(stegoText);

    if (vsBytes.length === 0) {
      throw new Error(currentLang === 'ar' ? 'لا توجد أحرف إخفاء (VS) مخفية في النص. تأكد من نسخ النص بالكامل.' : 'No hidden VS characters found in the message. Make sure to paste the complete text.');
    }

    // 3. Verify standard file steganographic payload marker for images
    //    Format: [0xFF marker] [nameLen: 1] [nameBytes: nameLen] [fileSize: 4] [fileData]
    const IMG_FILE_MARKER = 0xFF;
    if (vsBytes[0] !== IMG_FILE_MARKER) {
      throw new Error(currentLang === 'ar' ? 'تنسيق غير صالح: هذا النص الإخفائي لا يحتوي على صورة مخفية.' : 'Invalid format: This stego-text does not contain a hidden image.');
    }

    // 4. Extract Name Length and File Name
    const nameLen = vsBytes[1];
    if (nameLen === 0 || vsBytes.length < 2 + nameLen + 4) {
      throw new Error(currentLang === 'ar' ? 'تنسيق الحمولة غير صالح أو تالف.' : 'Invalid or corrupted payload structure.');
    }

    const nameBytes = vsBytes.subarray(2, 2 + nameLen);
    const fileName = new TextDecoder().decode(nameBytes);

    // 5. Extract File Size (Big Endian)
    let offset = 2 + nameLen;
    const fileSize = (vsBytes[offset] << 24) | (vsBytes[offset+1] << 16) | (vsBytes[offset+2] << 8) | vsBytes[offset+3];
    offset += 4;

    if (vsBytes.length < offset + fileSize) {
      throw new Error(currentLang === 'ar' ? 'حجم البيانات المستخرج غير مكتمل أو تالف.' : 'Extracted data size is incomplete or corrupted.');
    }

    // 6. Extract Encrypted Payload Bytes
    const encryptedData = vsBytes.subarray(offset, offset + fileSize);

    // 7. Decrypt Payload using AES-CTR (coverText is used to derive key/IV deterministically)
    let decryptedBytes;
    try {
      decryptedBytes = await decryptPayloadCtr(encryptedData, stegoKey, coverText);
    } catch (e) {
      throw new Error(currentLang === 'ar' ? 'فشل فك التشفير — تأكد من أن مفتاح AES-CTR صحيح.' : 'Decryption failed — make sure the AES-CTR Key is correct.');
    }

    // 8. Resolve MIME Type based on Magic Bytes (fails if wrong key / corrupted data)
    let mimeType = detectMimeType(decryptedBytes);
    if (!mimeType) {
      throw new Error(currentLang === 'ar'
        ? 'فشل فك التشفير — تأكد من أن مفتاح AES-CTR صحيح أو أن النص غير تالف.'
        : 'Decryption failed — make sure the AES-CTR Key is correct or the text is not corrupted.');
    }

    // 9. Generate Blob and set Preview & Download Link
    const blob = new Blob([decryptedBytes], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);

    const imgPreview = document.getElementById('imgExtractedPreview');
    const downloadBtn = document.getElementById('imgDownloadBtn');

    if (imgPreview) {
      imgPreview.src = blobUrl;
      imgPreview.style.display = 'block';
    }

    if (downloadBtn) {
      downloadBtn.href = blobUrl;
      downloadBtn.download = fileName;
      downloadBtn.style.display = 'inline-flex';
    }

    // 10. Update File Stats Cards
    document.getElementById('imgStatFileName').textContent = fileName;
    document.getElementById('imgStatFileSize').textContent = `${(decryptedBytes.length / 1024).toFixed(2)} KB (${decryptedBytes.length.toLocaleString()} bytes)`;
    document.getElementById('imgStatFileType').textContent = mimeType;

    const durationMs = performance.now() - startTime;

    // Update Extraction Duration card
    const imgExTimeVal = document.getElementById('imgExtractTimeVal');
    if (imgExTimeVal) {
      imgExTimeVal.setAttribute('data-duration', durationMs);
      imgExTimeVal.textContent = currentLang === 'ar'
        ? `${durationMs.toFixed(1)} ملي ثانية`
        : `${durationMs.toFixed(1)} ms`;
    }

    // Measure image decompression (decoding) duration
    const decompressCard = document.getElementById('imgDecompressCard');
    const decompressTimeVal = document.getElementById('imgDecompressTimeVal');
    if (decompressCard && decompressTimeVal) {
      decompressCard.style.display = 'none'; // reset
      const tempImg = new Image();
      tempImg.src = blobUrl;
      const startDecode = performance.now();
      tempImg.decode().then(() => {
        const decodeMs = performance.now() - startDecode;
        decompressTimeVal.setAttribute('data-duration', decodeMs);
        decompressTimeVal.textContent = currentLang === 'ar'
          ? `${decodeMs.toFixed(1)} ملي ثانية`
          : `${decodeMs.toFixed(1)} ms`;
        decompressCard.style.display = 'flex';
      }).catch(err => {
        console.warn('[extract] Image decode failed or skipped:', err);
      });
    }

    if (timeEl) {
      timeEl.style.display = 'grid';
    }

    showImgExtractResultsPanel();
    showToast(currentLang === 'ar' ? '✅ تم استخراج الصورة وفك تشفيرها بنجاح!' : '✅ Image extracted and decrypted successfully!');

  } catch (error) {
    showToast('❌ ' + error.message);
  }
}

function showImgExtractResultsPanel() {
  const panel = document.getElementById('img-extract-results-panel');
  if (panel) {
    panel.style.display = 'block';
    setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
  }
}

function hideImgExtractResultsPanel() {
  const panel = document.getElementById('img-extract-results-panel');
  if (panel) panel.style.display = 'none';

  // Clear preview image and download link
  const imgPreview = document.getElementById('imgExtractedPreview');
  if (imgPreview) {
    if (imgPreview.src && imgPreview.src.startsWith('blob:')) {
      URL.revokeObjectURL(imgPreview.src);
    }
    imgPreview.src = '';
    imgPreview.style.display = 'none';
  }

  const downloadBtn = document.getElementById('imgDownloadBtn');
  if (downloadBtn) {
    downloadBtn.removeAttribute('href');
    downloadBtn.style.display = 'none';
  }

  // Clear file info stats
  const nameEl = document.getElementById('imgStatFileName');
  const sizeEl = document.getElementById('imgStatFileSize');
  const typeEl = document.getElementById('imgStatFileType');
  if (nameEl) nameEl.textContent = '';
  if (sizeEl) sizeEl.textContent = '';
  if (typeEl) typeEl.textContent = '';
}

// Bind Eye toggle visibility for imgExtractKey and setup button listeners
document.addEventListener('DOMContentLoaded', () => {
  const imgExtractBtn = document.getElementById('img-extract-btn');
  if (imgExtractBtn) {
    imgExtractBtn.addEventListener('click', performImageExtraction);
  }

  const $imgExEyeToggle = document.getElementById('img-ex-eye-toggle-btn');
  const $imgExKeyInput = document.getElementById('imgExtractKey');
  if ($imgExEyeToggle && $imgExKeyInput) {
    $imgExEyeToggle.addEventListener('click', () => {
      const isHidden = $imgExKeyInput.type === 'password';
      $imgExKeyInput.type = isHidden ? 'text' : 'password';
      document.getElementById('img-ex-eye-icon').textContent = isHidden ? 'visibility_off' : 'visibility';
    });
  }

  // If we have forwarded payload from image embedding on hash match
  const hash = window.location.hash;
  if (hash === '#image') {
    const forwarded = localStorage.getItem('stegoTextPayload');
    if (forwarded) {
      const imgStegoTextarea = document.getElementById('imgExtractStego');
      if (imgStegoTextarea) {
        imgStegoTextarea.value = forwarded;
      }
      localStorage.removeItem('stegoTextPayload');
    }
    
    const forwardedKey = localStorage.getItem('stegoKeyPayload');
    if (forwardedKey) {
      const imgKeyField = document.getElementById('imgExtractKey');
      if (imgKeyField) {
        imgKeyField.value = forwardedKey;
      }
      localStorage.removeItem('stegoKeyPayload');
    }
  }
});
