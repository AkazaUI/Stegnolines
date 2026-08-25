// ══════════════════════════════════════════════════════════════
// JavaScript Features — Image Embedding UI Controller
// ══════════════════════════════════════════════════════════════
//
// Hooks DOM events for image uploading and embedding inside cover text.
// Strips EXIF metadata using off-screen Canvas and runs AVIF WASM compression.
//
// ══════════════════════════════════════════════════════════════

// Constants for Image Steganography
const IMG_FILE_MARKER = 0xFF;
const IMG_BYTES_PER_CHAR = 200; // density
const IMG_MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB limit
const IMG_PLATFORM_LIMIT = 390;

// State Variables
let imgUploadedFile = null; // { name: string, data: Uint8Array, size: number, type: string }
let isOptimizingImg = false;
let imgBypassPlatformGuard = false;
let isImgSegmentationSkipped = false;

// Utility function to convert Eastern Arabic / Persian digits to Western Arabic digits
function toWesternDigits(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/[٠۰]/g, '0').replace(/[١۱]/g, '1').replace(/[٢۲]/g, '2')
    .replace(/[٣۳]/g, '3').replace(/[٤۴]/g, '4').replace(/[٥۵]/g, '5')
    .replace(/[٦۶]/g, '6').replace(/[٧۷]/g, '7').replace(/[٨۸]/g, '8')
    .replace(/[٩۹]/g, '9');
}

// DOM References (Initialized on DOMContentLoaded)
const TRANSLATIONS_EMBED = window.translations;
let $imgCoverText;
let $imgKeyInput;
let $imgUploadArea;
let $imgFileInput;
let $btnImgHideData;
let $imgResultsPanel;
let $imgStegoText;
let $imgMetadataReport;
let $imgMetadataReportText;
let $imgCoverGutter;
let $imgCoverGutterInner;
let $imgCoverCounter;

async function processUploadedImage() {
  if (!imgUploadedFile || !imgUploadedFile.fileObject || isOptimizingImg) return;

  isOptimizingImg = true;
  const file = imgUploadedFile.fileObject;
  const currentLang = localStorage.getItem('stegoLang') || 'en';
  const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  const isAvif = (imgUploadedFile && imgUploadedFile.isAvif) || fileExt === '.avif' || file.type === 'image/avif';

  // Disable main action button
  if ($btnImgHideData) {
    $btnImgHideData.disabled = true;
    $btnImgHideData.style.opacity = '0.55';
    $btnImgHideData.style.pointerEvents = 'none';
  }

  // Show concentric loading spinner state inside `#imgEmbedUploadArea`
  if ($imgUploadArea) {
    $imgUploadArea.classList.remove('has-preview');
    // Remove Change Image button from header during loading
    const headerBtn = document.getElementById('btnChangeImageHeader');
    if (headerBtn) headerBtn.remove();
    $imgUploadArea.style.borderColor = 'var(--color-primary)';
    $imgUploadArea.style.boxShadow = '0 0 12px rgba(187, 209, 0, 0.15)';
    $imgUploadArea.innerHTML = `
      <div class="spinner-wrap" style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 12px; pointer-events: none; box-sizing: border-box;">
        <div class="concentric-spinner">
          <div class="spinner-ring spinner-ring--outer"></div>
          <div class="spinner-ring spinner-ring--inner"></div>
        </div>
        <span style="font-size: 0.8125rem; color: var(--color-primary); font-weight: 600; text-align: center;">
          ${currentLang === 'ar' ? 'جاري تحسين وضغط الصورة السرية...' : 'Optimizing & Compressing Carrier Image...'}
        </span>
      </div>
    `;
  }

  try {
    let compressedData;
    let savedMetadataBytes = 0;
    let compDurationMs = 0;

    if (isAvif) {
      // Skip compression and EXIF stripping completely, just read original file bytes
      const ab = await file.arrayBuffer();
      compressedData = new Uint8Array(ab);
    } else {
      let fileToCompress = file;

      // 1. Off-screen Canvas EXIF/Metadata Stripping
      if (imgUploadedFile && imgUploadedFile.shouldStripMetadata) {
        try {
          const strippedBlob = await stripMetadataWithCanvas(file);
          savedMetadataBytes = Math.max(0, file.size - strippedBlob.size);
          fileToCompress = new File([strippedBlob], file.name, { type: file.type });
        } catch (e) {
          console.warn("Canvas EXIF stripping failed:", e);
        }
      }

      // 2. Determine AVIF parameters — Smart auto-optimization based on file size
      const sizeKB = fileToCompress.size / 1024;
      let quality, speed;
      if (sizeKB < 100) {
        quality = 80; speed = 10;
      } else if (sizeKB < 1024) {
        quality = 70; speed = 9;
      } else {
        quality = 65; speed = 9;
      }

      // 3. Apply AVIF WASM Compression with robust fallback
      const compStartTime = performance.now();
      try {
        compressedData = await window.compressToAvif(fileToCompress, { quality, speed });
        compDurationMs = performance.now() - compStartTime;
      } catch (e) {
        console.warn("AVIF WASM Compression failed, falling back to uncompressed image payload:", e);
        const ab = await fileToCompress.arrayBuffer();
        compressedData = new Uint8Array(ab);
      }
    }

    // Store in memory state
    imgUploadedFile.data = compressedData;
    imgUploadedFile.compressDurationMs = compDurationMs;
    imgUploadedFile.size = compressedData.length;
    imgUploadedFile.savedMetadataBytes = savedMetadataBytes;

    // Create Object URL for compressed image to preview
    const compressedBlob = new Blob([compressedData], { type: isAvif ? (file.type || 'image/avif') : 'image/avif' });
    const compressedPreviewUrl = URL.createObjectURL(compressedBlob);

    // Also create Object URL for original image (before compression)
    const originalPreviewUrl = URL.createObjectURL(file);

    // Render Compressed Image Preview inside upload area
    const savingsPercent = file.size > 0
      ? Math.max(0, ((file.size - compressedData.length) / file.size * 100)).toFixed(1)
      : 0;

    if ($imgUploadArea) {
      $imgUploadArea.classList.add('has-preview');
      $imgUploadArea.style.padding = '0';
      $imgUploadArea.style.overflow = 'hidden';
      $imgUploadArea.style.position = 'relative';
      $imgUploadArea.style.cursor = 'zoom-in';

      // Build the preview HTML with animation classes
      $imgUploadArea.innerHTML = `
        <div class="img-upload-success-check" id="imgSuccessCheckOverlay">
          <div class="success-icon-circle">
            <span class="material-symbols-outlined">check</span>
          </div>
        </div>
        <div class="img-preview-reveal" style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; background: var(--color-surface-container-low);">
          <img
            src="${compressedPreviewUrl}"
            alt=""
            style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: blur(20px) brightness(0.45); opacity: 0.85; pointer-events: none;"
            draggable="false"
          />
          <img
            id="imgUploadPreviewImg"
            class="img-crisp-preview"
            src="${compressedPreviewUrl}"
            alt="${file.name}"
            style="position: relative; max-width: 100%; max-height: 100%; object-fit: contain; display: block; z-index: 1; transition: transform 0.35s ease;"
            draggable="false"
          />
          <div class="img-preview-zoom-overlay" style="z-index: 2;">
            <span class="material-symbols-outlined" style="font-size: 30px;">zoom_in</span>
            <span style="font-size: 0.8rem; font-weight: 600;">${currentLang === 'ar' ? 'انقر للمعاينة والزوم' : 'Click to Preview'}</span>
          </div>
        </div>
        <div class="img-filename-badge" style="
          position: absolute; bottom: 0; left: 0; right: 0;
          background: linear-gradient(transparent, rgba(0,0,0,0.85));
          padding: 24px var(--space-sm) 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          pointer-events: none;
          z-index: 3;
        ">
          <span style="font-size: 0.8rem; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90%;">${file.name}</span>
        </div>
      `;

      // Add success glow + shimmer to the upload area
      $imgUploadArea.classList.add('img-upload-success-glow', 'img-upload-shimmer');

      // Fade out the success check overlay after 1.2s to reveal the image
      setTimeout(() => {
        const checkOverlay = document.getElementById('imgSuccessCheckOverlay');
        if (checkOverlay) {
          checkOverlay.classList.add('fade-out');
          setTimeout(() => checkOverlay.remove(), 400);
        }
      }, 1200);

      // Remove shimmer class after animation completes
      setTimeout(() => {
        $imgUploadArea.classList.remove('img-upload-shimmer');
      }, 2000);

      $imgUploadArea.onclick = null;

      // Inject Change Image button dynamically into the header row
      const headerRow = document.getElementById('imgUploadHeaderRow');
      if (headerRow) {
        if (!document.getElementById('btnChangeImageHeader')) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn-change-image btn-change-image-animated';
          btn.id = 'btnChangeImageHeader';
          btn.innerHTML = `
            <span class="material-symbols-outlined" style="font-size: 16px;">cached</span>
            <span>${currentLang === 'ar' ? 'تغيير الصورة' : 'Change Image'}</span>
          `;
          btn.onclick = (e) => {
            e.stopPropagation();
            $imgFileInput.click();
          };
          headerRow.appendChild(btn);
        }
      }
    }

    imgUploadedFile.originalPreviewUrl = originalPreviewUrl;
    imgUploadedFile.compressedPreviewUrl = compressedPreviewUrl;
    imgUploadedFile.originalSize = file.size;
    imgUploadedFile.originalType = file.type || 'image/jpeg';
    imgUploadedFile.savingsPercent = savingsPercent;

    // Update Diagnostics Panel for EXIF deletion proof
    const diagPanel = document.getElementById('imgMetadataDiagnosticsPanel');
    const diagList = document.getElementById('imgMetadataDiagList');

    if (diagPanel && diagList) {
      if (imgUploadedFile.shouldStripMetadata) {
        const metadataInfo = await parseMetadataInfo(file);
        diagList.replaceChildren();

        let decLat = null;
        let decLon = null;

        metadataInfo.forEach(item => {
          if (item.isCoord) {
            if (item.key === 'decLat') decLat = item.val;
            if (item.key === 'decLon') decLon = item.val;
            return;
          }

          const row = document.createElement('div');
          row.style.display = 'flex';
          row.style.justifyContent = 'space-between';
          row.style.borderBottom = '1px solid var(--color-outline-variant)';
          row.style.padding = '2px 0';

          const keySpan = document.createElement('span');
          keySpan.style.fontWeight = 'bold';
          keySpan.style.color = 'var(--color-secondary)';
          keySpan.textContent = item.key + ':';

          const valSpan = document.createElement('span');
          valSpan.style.textAlign = 'right';
          valSpan.style.wordBreak = 'break-all';
          valSpan.textContent = item.val;

          row.appendChild(keySpan);
          row.appendChild(valSpan);
          diagList.appendChild(row);
        });

        // Render Dynamic Google Maps Embed showing leaked location before deletion
        const mapContainer = document.getElementById('imgMetadataDiagMapContainer');
        const mapIframe = document.getElementById('imgMetadataDiagMap');
        const openMapBtn = document.getElementById('btnOpenInGoogleMaps');
        const rightCol = document.getElementById('imgMetadataDiagRightCol');
        const splitGrid = diagPanel.querySelector('.split-grid');

        if (decLat !== null && decLon !== null) {
          if (mapIframe) mapIframe.src = `https://maps.google.com/maps?q=${decLat},${decLon}&z=15&output=embed`;
          if (mapContainer) mapContainer.style.display = 'block';
          if (openMapBtn) {
            openMapBtn.href = `https://www.google.com/maps/search/?api=1&query=${decLat},${decLon}`;
            openMapBtn.style.display = 'inline-flex';
          }
          if (rightCol) rightCol.style.display = 'flex';
          if (splitGrid) splitGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(240px, 1fr))';
        } else {
          if (mapIframe) mapIframe.src = '';
          if (mapContainer) mapContainer.style.display = 'none';
          if (openMapBtn) openMapBtn.style.display = 'none';
          if (rightCol) rightCol.style.display = 'none';
          if (splitGrid) splitGrid.style.gridTemplateColumns = '1fr';
        }

        diagPanel.style.display = 'block';
      } else {
        diagPanel.style.display = 'none';
        const mapContainer = document.getElementById('imgMetadataDiagMapContainer');
        const mapIframe = document.getElementById('imgMetadataDiagMap');
        const openMapBtn = document.getElementById('btnOpenInGoogleMaps');
        const rightCol = document.getElementById('imgMetadataDiagRightCol');
        if (mapContainer && mapIframe) {
          mapIframe.src = '';
          mapContainer.style.display = 'none';
        }
        if (openMapBtn) openMapBtn.style.display = 'none';
        if (rightCol) rightCol.style.display = 'none';
      }
    }

    updateImgCapacityMeter();
    if (isAvif) {
      showToast(currentLang === 'ar' ? '✅ تم قبول صورة AVIF دون ضغط أو تحليل!' : '✅ AVIF image accepted without compression or analysis!');
    } else {
      showToast(currentLang === 'ar' ? '✅ تم تحسين وضغط الصورة السرية بنجاح!' : '✅ Carrier image optimized & compressed successfully!');
    }

  } catch (error) {
    console.error("Optimization failed:", error);
    clearPreviousImgUploadedFile();
    resetImgUploadAreaUI(currentLang);
    updateImgCapacityMeter();
    showToast(currentLang === 'ar'
      ? '❌ فشلت عملية ضغط وتحسين الصورة لسبب ما. يرجى محاولة رفع الصورة مرة أخرى.'
      : '❌ Image compression and optimization failed. Please try uploading the image again.');
  } finally {
    isOptimizingImg = false;
    if ($btnImgHideData) {
      $btnImgHideData.disabled = false;
      $btnImgHideData.style.opacity = '';
      $btnImgHideData.style.pointerEvents = '';
    }
  }
}

function getImgCoverCarriers(text) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const seg = new Intl.Segmenter('en', { granularity: 'grapheme' });
    return [...seg.segment(text)].map(s => s.segment);
  }
  return Array.from(text);
}

function stripImageMetadata(fileBytes, fileType) {
  const type = (fileType || '').toLowerCase();
  if (type.includes('jpeg') || type.includes('jpg')) {
    const bytes = new Uint8Array(fileBytes);
    let i = 2; // skip SOI
    const result = [0xFF, 0xD8];
    while (i < bytes.length) {
      if (bytes[i] === 0xFF) {
        const marker = bytes[i + 1];
        if (marker === 0xD9) { // EOI
          result.push(0xFF, 0xD9);
          break;
        }
        if (i + 3 >= bytes.length) break;
        const length = (bytes[i + 2] << 8) + bytes[i + 3];
        if (marker >= 0xE1 && marker <= 0xEF) {
          i += 2 + length;
        } else {
          for (let j = 0; j < 2 + length; j++) {
            if (i + j < bytes.length) result.push(bytes[i + j]);
          }
          i += 2 + length;
        }
      } else {
        result.push(bytes[i]);
        i++;
      }
    }
    return new Uint8Array(result);
  } else if (type.includes('webp')) {
    const bytes = new Uint8Array(fileBytes);
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
      let i = 12;
      const result = Array.from(bytes.subarray(0, 12));
      while (i < bytes.length) {
        if (i + 8 > bytes.length) break;
        const chunkType = String.fromCharCode(bytes[i], bytes[i + 1], bytes[i + 2], bytes[i + 3]);
        const chunkSize = bytes[i + 4] | (bytes[i + 5] << 8) | (bytes[i + 6] << 16) | (bytes[i + 7] << 24);
        const chunkTotalSize = 8 + chunkSize + (chunkSize % 2);
        if (chunkType === 'EXIF' || chunkType === 'ICCP' || chunkType === 'XMP ') {
          i += chunkTotalSize;
        } else {
          for (let j = 0; j < chunkTotalSize; j++) {
            if (i + j < bytes.length) result.push(bytes[i + j]);
          }
          i += chunkTotalSize;
        }
      }
      const newSize = result.length - 8;
      result[4] = newSize & 0xFF;
      result[5] = (newSize >> 8) & 0xFF;
      result[6] = (newSize >> 16) & 0xFF;
      result[7] = (newSize >> 24) & 0xFF;
      return new Uint8Array(result);
    }
  } else if (type.includes('avif')) {
    const bytes = new Uint8Array(fileBytes);
    const result = [];
    let i = 0;
    while (i < bytes.length) {
      if (i + 8 > bytes.length) {
        for (let j = i; j < bytes.length; j++) result.push(bytes[j]);
        break;
      }
      const boxSize = (bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3];
      const boxType = String.fromCharCode(bytes[i + 4], bytes[i + 5], bytes[i + 6], bytes[i + 7]);
      if (boxType === 'exif') {
        i += boxSize;
      } else {
        for (let j = 0; j < boxSize; j++) {
          if (i + j < bytes.length) result.push(bytes[i + j]);
        }
        i += boxSize;
      }
    }
    return new Uint8Array(result);
  }
  return fileBytes;
}

function stripMetadataWithCanvas(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const strippedFile = new File([blob], file.name, { type: file.type || 'image/jpeg' });
            resolve(strippedFile);
          } else {
            resolve(file);
          }
        }, file.type || 'image/jpeg', 0.95);
      } catch (err) {
        console.error("Canvas toBlob error:", err);
        resolve(file);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
  });
}

function promptMetadataStripping() {
  return new Promise((resolve) => {
    const backdrop = document.getElementById('img-metadata-modal-backdrop');
    const modal = document.getElementById('img-metadata-modal');
    const keepBtn = document.getElementById('img-metadata-modal-keep');
    const stripBtn = document.getElementById('img-metadata-modal-strip');

    if (!backdrop || !modal || !keepBtn || !stripBtn) {
      resolve(false);
      return;
    }

    backdrop.classList.add('active');
    modal.classList.add('active');

    function handleChoice(strip) {
      backdrop.classList.remove('active');
      modal.classList.remove('active');
      keepBtn.removeEventListener('click', onKeep);
      stripBtn.removeEventListener('click', onStrip);
      resolve(strip);
    }

    function onKeep() { handleChoice(false); }
    function onStrip() { handleChoice(true); }

    keepBtn.addEventListener('click', onKeep);
    stripBtn.addEventListener('click', onStrip);
  });
}

/**
 * Prompts the user with the Smart Segmentation Modal after image compression.
 * Recommends the exact number of messages required to fit the compressed payload
 * while keeping per-message character counts below IMG_PLATFORM_LIMIT (390)
 * to prevent the "Read More" link on WhatsApp/social platforms.
 */
function promptSegmentation(payloadSizeBytes) {
  return new Promise((resolve) => {
    const backdrop = document.getElementById('img-segmentation-modal-backdrop');
    const modal = document.getElementById('img-segmentation-modal');
    const skipBtn = document.getElementById('img-segmentation-modal-skip');
    const customBtn = document.getElementById('img-segmentation-modal-custom');
    const acceptBtn = document.getElementById('img-segmentation-modal-accept');

    const payloadValEl = document.getElementById('imgSegPayloadValue');
    const recommendedValEl = document.getElementById('imgSegRecommendedValue');
    const customInput = document.getElementById('imgSegCustomInput');
    const warningNotice = document.getElementById('imgSegWarningNotice');
    const btnMinus = document.getElementById('imgSegBtnMinus');
    const btnPlus = document.getElementById('imgSegBtnPlus');

    const gaugeAvgValEl = document.getElementById('imgSegGaugeAvgVal');
    const gaugeRatioValEl = document.getElementById('imgSegGaugeRatioVal');
    const gaugeFillEl = document.getElementById('imgSegGaugeFill');
    const gaugeMaxLabelEl = document.getElementById('imgSegGaugeMaxLabel');

    if (!backdrop || !modal || !acceptBtn || !customBtn || !skipBtn) {
      resolve({ mode: 'skip', count: 0 });
      return;
    }

    const currentLang = localStorage.getItem('stegoLang') || 'en';
    const capacityPerMessage = IMG_PLATFORM_LIMIT - 1; // 389 bytes per line
    const recommendedCount = Math.max(1, Math.ceil(payloadSizeBytes / capacityPerMessage));
    const payloadKB = (payloadSizeBytes / 1024).toFixed(1);

    if (payloadValEl) payloadValEl.textContent = `${payloadKB} KB`;
    if (recommendedValEl) {
      const suffix = (window.translations && window.translations[currentLang] && window.translations[currentLang].imgSegRecommendedSuffix)
        ? window.translations[currentLang].imgSegRecommendedSuffix
        : (currentLang === 'ar' ? ' رسائل' : ' Messages');
      recommendedValEl.textContent = `${recommendedCount}${suffix}`;
    }

    const maxCount = recommendedCount;
    if (gaugeMaxLabelEl) {
      const targetSuffix = currentLang === 'ar' ? 'رسالة (الهدف)' : 'msgs (Target)';
      gaugeMaxLabelEl.textContent = `${recommendedCount} ${targetSuffix}`;
    }

    if (customInput) {
      customInput.min = '1';
      customInput.max = '500';
      customInput.value = String(recommendedCount);
    }

    function updateWarningState(val) {
      const count = parseInt(toWesternDigits(val), 10) || 1;
      const safeThreshold = recommendedCount;
      const warnThreshold = Math.ceil(recommendedCount * 0.75);

      const avgCharsPerMsg = Math.ceil(payloadSizeBytes / count);
      const safetyRatioPct = Math.round((count / recommendedCount) * 100);
      const fillWidthPct = Math.min(100, Math.max(8, Math.round((count / recommendedCount) * 100)));

      // 1. Update Gauge Metric Readouts
      if (gaugeAvgValEl) {
        gaugeAvgValEl.textContent = currentLang === 'ar' 
          ? `~${avgCharsPerMsg} حرف/رسالة` 
          : `~${avgCharsPerMsg} chars/msg`;
      }

      if (gaugeFillEl) {
        gaugeFillEl.style.width = `${fillWidthPct}%`;
        gaugeFillEl.className = 'seg-gauge-fill';
      }

      if (gaugeRatioValEl && gaugeFillEl) {
        if (count >= safeThreshold) {
          gaugeFillEl.classList.add('seg-gauge-fill--safe');
          gaugeRatioValEl.style.color = 'var(--color-primary, #4caf50)';
          const tag = (window.translations && window.translations[currentLang] && window.translations[currentLang].imgSegGaugeOptimal)
            ? window.translations[currentLang].imgSegGaugeOptimal
            : (currentLang === 'ar' ? 'مثالي وآمن' : 'Optimal');
          gaugeRatioValEl.textContent = `${safetyRatioPct}% ${tag}`;
        } else if (count >= warnThreshold) {
          gaugeFillEl.classList.add('seg-gauge-fill--warn');
          gaugeRatioValEl.style.color = '#ff9800';
          const tag = (window.translations && window.translations[currentLang] && window.translations[currentLang].imgSegGaugeFoldRisk)
            ? window.translations[currentLang].imgSegGaugeFoldRisk
            : (currentLang === 'ar' ? 'مُخاطرة طَي' : 'Fold Risk');
          gaugeRatioValEl.textContent = `${safetyRatioPct}% ${tag}`;
        } else {
          gaugeFillEl.classList.add('seg-gauge-fill--danger');
          gaugeRatioValEl.style.color = '#f44336';
          const tag = (window.translations && window.translations[currentLang] && window.translations[currentLang].imgSegGaugeOverflow)
            ? window.translations[currentLang].imgSegGaugeOverflow
            : (currentLang === 'ar' ? 'خطأ طفح' : 'Overflow');
          gaugeRatioValEl.textContent = `${safetyRatioPct}% ${tag}`;
        }
      }

      // 2. Update Notice Alert Box
      if (!warningNotice) return;
      const iconEl = warningNotice.querySelector('.notice-icon');
      const textEl = warningNotice.querySelector('.notice-text');

      warningNotice.className = 'seg-notice';

      if (count >= safeThreshold) {
        warningNotice.classList.add('seg-notice--safe');
        if (iconEl) iconEl.textContent = 'check_circle';
        if (textEl) {
          textEl.textContent = currentLang === 'ar'
            ? `آمن جداً — متوسط طول الرسالة (~${avgCharsPerMsg} حرف) ضمن الحد الآمن لمنع زِر 'قراءة المزيد' على واتساب.`
            : `Safe — Average message size (~${avgCharsPerMsg} chars) is optimal to prevent WhatsApp 'Read More'.`;
        }
      } else if (count >= warnThreshold) {
        warningNotice.classList.add('seg-notice--warn');
        if (iconEl) iconEl.textContent = 'warning';
        if (textEl) {
          textEl.textContent = currentLang === 'ar'
            ? `تنبيه — متوسط طول الرسالة (~${avgCharsPerMsg} حرف) يتجاوز الحد المثالي وقد يظهر زِر 'قراءة المزيد'.`
            : `Warning — Average message size (~${avgCharsPerMsg} chars) exceeds optimal limit and may trigger 'Read More'.`;
        }
      } else {
        warningNotice.classList.add('seg-notice--danger');
        if (iconEl) iconEl.textContent = 'error';
        if (textEl) {
          textEl.textContent = currentLang === 'ar'
            ? `خطأ — عدد الرسائل (${count}) غير كافٍ إطلاقاً لحمل بيانات الصورة السرية بحجم ${payloadKB} KB!`
            : `Error — Message count (${count}) is too low to safely fit the image payload of ${payloadKB} KB!`;
        }
      }
    }

    updateWarningState(recommendedCount);

    function onNumInput(e) {
      let cleanVal = toWesternDigits(e.target.value).replace(/[^0-9]/g, '');
      if (cleanVal !== e.target.value) {
        e.target.value = cleanVal;
      }
      const numVal = parseInt(cleanVal, 10) || 1;
      updateWarningState(numVal);
    }

    function stepMinus() {
      if (!customInput) return;
      let val = parseInt(toWesternDigits(customInput.value), 10) || 1;
      if (val > 1) {
        val--;
        customInput.value = String(val);
        updateWarningState(val);
      }
    }

    function stepPlus() {
      if (!customInput) return;
      let val = parseInt(toWesternDigits(customInput.value), 10) || 1;
      if (val < 500) {
        val++;
        customInput.value = String(val);
        updateWarningState(val);
      }
    }

    function setupHoldToRepeat(btn, actionFn) {
      if (!btn) return () => {};
      let timer = null;
      let interval = null;

      function start(e) {
        if (e.type === 'mousedown' && e.button !== 0) return;
        if (e.cancelable) e.preventDefault();

        actionFn();
        stop();

        timer = setTimeout(() => {
          interval = setInterval(() => {
            actionFn();
          }, 75);
        }, 350);
      }

      function stop() {
        if (timer) { clearTimeout(timer); timer = null; }
        if (interval) { clearInterval(interval); interval = null; }
      }

      btn.addEventListener('mousedown', start);
      btn.addEventListener('touchstart', start, { passive: false });

      window.addEventListener('mouseup', stop);
      btn.addEventListener('mouseleave', stop);
      window.addEventListener('touchend', stop);
      window.addEventListener('touchcancel', stop);

      return function cleanupHold() {
        stop();
        btn.removeEventListener('mousedown', start);
        btn.removeEventListener('touchstart', start);
        window.removeEventListener('mouseup', stop);
        btn.removeEventListener('mouseleave', stop);
        window.removeEventListener('touchend', stop);
        window.removeEventListener('touchcancel', stop);
      };
    }

    const cleanupHoldMinus = setupHoldToRepeat(btnMinus, stepMinus);
    const cleanupHoldPlus = setupHoldToRepeat(btnPlus, stepPlus);

    if (customInput) {
      customInput.addEventListener('input', onNumInput);
      customInput.addEventListener('change', onNumInput);
    }

    backdrop.classList.add('active');
    modal.classList.add('active');

    function cleanup() {
      backdrop.classList.remove('active');
      modal.classList.remove('active');
      if (customInput) {
        customInput.removeEventListener('input', onNumInput);
        customInput.removeEventListener('change', onNumInput);
      }
      if (cleanupHoldMinus) cleanupHoldMinus();
      if (cleanupHoldPlus) cleanupHoldPlus();
      skipBtn.removeEventListener('click', onSkip);
      customBtn.removeEventListener('click', onCustom);
      acceptBtn.removeEventListener('click', onAccept);
    }

    function onSkip() {
      cleanup();
      resolve({ mode: 'skip', count: 0 });
    }

    function onCustom() {
      const cleanVal = customInput ? toWesternDigits(customInput.value) : recommendedCount;
      const val = parseInt(cleanVal, 10) || 1;
      cleanup();
      resolve({ mode: 'custom', count: val });
    }

    function onAccept() {
      cleanup();
      resolve({ mode: 'recommended', count: recommendedCount });
    }

    skipBtn.addEventListener('click', onSkip);
    customBtn.addEventListener('click', onCustom);
    acceptBtn.addEventListener('click', onAccept);
  });
}

/**
 * Resets segmentation when user chooses "Skip Segmentation".
 * Trims empty trailing padding lines from cover text and hides gutter line numbers.
 */
let currentImgSegTargetCount = 0;

function resetSegmentation() {
  isImgSegmentationSkipped = true;
  currentImgSegTargetCount = 0;
  if ($imgCoverGutter) {
    $imgCoverGutter.style.display = 'none';
  }
  if ($imgCoverCounter) {
    $imgCoverCounter.style.display = 'none';
  }
  if ($imgCoverText) {
    const existingText = $imgCoverText.value || '';
    const lines = existingText ? existingText.split('\n') : [];

    let lastRealLineIndex = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim().length > 0) {
        lastRealLineIndex = i;
        break;
      }
    }

    const realLines = lastRealLineIndex >= 0 ? lines.slice(0, lastRealLineIndex + 1) : [];
    $imgCoverText.value = realLines.join('\n');
  }
  renderCoverLineNumbers();
  updateCoverMessageCounter();
}

/**
 * Automatically segments/pre-fills the cover text editor with the required
 * number of lines to fit the image payload without "Read More".
 * Smartly trims previous empty padding lines when changing images or re-adjusting.
 */
function applySegmentation(count) {
  isImgSegmentationSkipped = false;
  currentImgSegTargetCount = count;
  if ($imgCoverGutter) {
    $imgCoverGutter.style.display = '';
  }
  if ($imgCoverCounter) {
    $imgCoverCounter.style.display = '';
  }
  if (!$imgCoverText || count <= 0) return;

  const existingText = $imgCoverText.value || '';
  const lines = existingText ? existingText.split('\n') : [];

  let lastRealLineIndex = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim().length > 0) {
      lastRealLineIndex = i;
      break;
    }
  }

  const realLines = lastRealLineIndex >= 0 ? lines.slice(0, lastRealLineIndex + 1) : [];

  let newLines = [];
  if (realLines.length >= count) {
    newLines = realLines;
  } else {
    const paddingNeeded = count - realLines.length;
    newLines = [...realLines, ...Array(paddingNeeded).fill('')];
  }

  $imgCoverText.value = newLines.join('\n');
  renderCoverLineNumbers();
  updateCoverMessageCounter();
}


function parseMetadataInfo(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target.result;
      const view = new DataView(buffer);
      const metadataList = [];

      const size = file.size;
      metadataList.push({ key: 'File Size', val: `${(size / 1024).toFixed(2)} KB` });
      metadataList.push({ key: 'MIME Type', val: file.type || 'image/jpeg' });

      const bytes = new Uint8Array(buffer);

      if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
        metadataList.push({ key: 'Format Marker', val: 'JPEG SOI (Start of Image)' });

        let offset = 2;
        while (offset < bytes.length - 4) {
          if (bytes[offset] === 0xFF) {
            const marker = bytes[offset + 1];
            if (marker === 0xD9) {
              metadataList.push({ key: 'Format Marker', val: 'JPEG EOI (End of Image)' });
              break;
            }
            const length = (bytes[offset + 2] << 8) + bytes[offset + 3];

            if (marker === 0xE1) {
              metadataList.push({ key: 'Metadata Block', val: `APP1 Segment (EXIF / XMP Data) · ${length} bytes` });

              try {
                if (bytes[offset + 4] === 0x45 && bytes[offset + 5] === 0x78 && bytes[offset + 6] === 0x69 && bytes[offset + 7] === 0x66) {
                  const tiffOffset = offset + 10;
                  const bigEndian = bytes[tiffOffset] === 0x4D;
                  const read16 = (o) => bigEndian ? view.getUint16(o) : view.getUint16(o, true);
                  const read32 = (o) => bigEndian ? view.getUint32(o) : view.getUint32(o, true);

                  const firstIFDOffset = read32(tiffOffset + 4);
                  let ifdOffset = tiffOffset + firstIFDOffset;

                  const numEntries = read16(ifdOffset);
                  for (let i = 0; i < numEntries; i++) {
                    const entryOffset = ifdOffset + 2 + i * 12;
                    const tag = read16(entryOffset);
                    const type = read16(entryOffset + 2);
                    const count = read32(entryOffset + 4);
                    const valueOffset = tiffOffset + read32(entryOffset + 8);

                    if (type === 2) {
                      let asciiVal = '';
                      const start = (count <= 4) ? (entryOffset + 8) : valueOffset;
                      for (let j = 0; j < count - 1; j++) {
                        asciiVal += String.fromCharCode(bytes[start + j]);
                      }
                      asciiVal = asciiVal.trim();
                      if (asciiVal) {
                        if (tag === 0x010F) metadataList.push({ key: 'Camera Manufacturer (EXIF Make)', val: asciiVal });
                        else if (tag === 0x0110) metadataList.push({ key: 'Camera Model (EXIF Model)', val: asciiVal });
                        else if (tag === 0x0131) metadataList.push({ key: 'Software Environment', val: asciiVal });
                        else if (tag === 0x0132) metadataList.push({ key: 'Capture Timestamp (DateTime)', val: asciiVal });
                      }
                    } else if (tag === 0x8825) {
                      metadataList.push({ key: 'GPS Structural Pointers (GPSInfo)', val: 'Present (Private Location Tags Detected)' });
                      try {
                        const gpsSubIFDOffset = read32(entryOffset + 8);
                        const subIFDOffset = tiffOffset + gpsSubIFDOffset;
                        const numSubEntries = read16(subIFDOffset);

                        let latRef = '';
                        let latVal = null;
                        let lonRef = '';
                        let lonVal = null;
                        let decLat = null;
                        let decLon = null;

                        const readRational = (o) => {
                          const num = read32(o);
                          const den = read32(o + 4);
                          return den === 0 ? 0 : (num / den);
                        };

                        for (let j = 0; j < numSubEntries; j++) {
                          const subEntryOffset = subIFDOffset + 2 + j * 12;
                          const subTag = read16(subEntryOffset);
                          const subType = read16(subEntryOffset + 2);
                          const subCount = read32(subEntryOffset + 4);
                          const subValOffset = tiffOffset + read32(subEntryOffset + 8);

                          if (subTag === 1 && subType === 2) {
                            latRef = String.fromCharCode(bytes[subEntryOffset + 8]).trim();
                          } else if (subTag === 2 && subType === 5) {
                            const start = subValOffset;
                            const deg = readRational(start);
                            const min = readRational(start + 8);
                            const sec = readRational(start + 16);
                            latVal = `${deg} deg ${min}' ${sec.toFixed(2)}"`;
                            decLat = deg + min / 60 + sec / 3600;
                          } else if (subTag === 3 && subType === 2) {
                            lonRef = String.fromCharCode(bytes[subEntryOffset + 8]).trim();
                          } else if (subTag === 4 && subType === 5) {
                            const start = subValOffset;
                            const deg = readRational(start);
                            const min = readRational(start + 8);
                            const sec = readRational(start + 16);
                            lonVal = `${deg} deg ${min}' ${sec.toFixed(2)}"`;
                            decLon = deg + min / 60 + sec / 3600;
                          }
                        }

                        if (latVal && latRef) {
                          metadataList.push({ key: 'GPS Latitude', val: `${latVal} ${latRef}` });
                          if (decLat !== null) {
                            if (latRef === 'S') decLat = -decLat;
                            metadataList.push({ key: 'decLat', val: decLat, isCoord: true });
                          }
                        }
                        if (lonVal && lonRef) {
                          metadataList.push({ key: 'GPS Longitude', val: `${lonVal} ${lonRef}` });
                          if (decLon !== null) {
                            if (lonRef === 'W') decLon = -decLon;
                            metadataList.push({ key: 'decLon', val: decLon, isCoord: true });
                          }
                        }
                      } catch (gpsErr) {
                        console.warn("GPS SubIFD parsing failed:", gpsErr);
                      }
                    } else if (tag === 0x8769) {
                      try {
                        const exifSubIFDOffset = read32(entryOffset + 8);
                        const subIFDOffset = tiffOffset + exifSubIFDOffset;
                        const numSubEntries = read16(subIFDOffset);
                        for (let j = 0; j < numSubEntries; j++) {
                          const subEntryOffset = subIFDOffset + 2 + j * 12;
                          const subTag = read16(subEntryOffset);
                          const subType = read16(subEntryOffset + 2);
                          const subCount = read32(subEntryOffset + 4);
                          const subValOffset = tiffOffset + read32(subEntryOffset + 8);

                          if (subTag === 0x9003 && subType === 2) {
                            let originalTime = '';
                            const subStart = (subCount <= 4) ? (subEntryOffset + 8) : subValOffset;
                            for (let k = 0; k < subCount - 1; k++) {
                              originalTime += String.fromCharCode(bytes[subStart + k]);
                            }
                            originalTime = originalTime.trim();
                            if (originalTime) {
                              metadataList.push({ key: 'Capture Timestamp (DateTimeOriginal)', val: originalTime });
                            }
                          }
                        }
                      } catch (subErr) {
                        console.warn("SubIFD EXIF tag parsing failed:", subErr);
                      }
                    }
                  }
                }
              } catch (e) {
                console.warn("EXIF tag parser error:", e);
              }
            } else if (marker === 0xE2) {
              metadataList.push({ key: 'Color Calibration Profile', val: `APP2 Segment (ICC Profile) · ${length} bytes` });
            } else if (marker === 0xED) {
              metadataList.push({ key: 'Application Resource', val: `APP13 Segment (Photoshop / IPTC) · ${length} bytes` });
            } else if (marker === 0xFE) {
              metadataList.push({ key: 'File Comment (COM)', val: `Comment Marker · ${length} bytes` });
            }
            offset += 2 + length;
          } else {
            offset++;
          }
        }
      } else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
        metadataList.push({ key: 'Format Marker', val: 'WebP RIFF Container' });

        let offset = 12;
        while (offset < bytes.length - 8) {
          const chunkType = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
          const chunkSize = bytes[offset + 4] | (bytes[offset + 5] << 8) | (bytes[offset + 6] << 16) | (bytes[offset + 7] << 24);

          if (chunkType === 'EXIF') {
            metadataList.push({ key: 'Metadata Block', val: `WebP EXIF Chunk · ${chunkSize} bytes` });
          } else if (chunkType === 'ICCP') {
            metadataList.push({ key: 'Color Calibration Profile', val: `WebP ICCP Chunk · ${chunkSize} bytes` });
          } else if (chunkType === 'XMP ') {
            metadataList.push({ key: 'Application Metadata', val: `WebP XMP Chunk · ${chunkSize} bytes` });
          }
          offset += 8 + chunkSize + (chunkSize % 2);
        }
      } else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
        metadataList.push({ key: 'Format Marker', val: 'PNG Image Stream' });

        let offset = 8;
        while (offset < bytes.length - 8) {
          const chunkSize = (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
          const chunkType = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);

          if (chunkType === 'tEXt' || chunkType === 'zTXt' || chunkType === 'iTXt') {
            let keyText = '';
            let i = offset + 8;
            while (bytes[i] !== 0 && i < offset + 8 + chunkSize) {
              keyText += String.fromCharCode(bytes[i]);
              i++;
            }
            metadataList.push({ key: `PNG Text Chunk (${chunkType})`, val: `Keyword: ${keyText} · ${chunkSize} bytes` });
          } else if (chunkType === 'iCCP') {
            metadataList.push({ key: 'Color Calibration Profile', val: `PNG iCCP Chunk · ${chunkSize} bytes` });
          } else if (chunkType === 'eXIf') {
            metadataList.push({ key: 'Metadata Block', val: `PNG eXIf Chunk (EXIF tags) · ${chunkSize} bytes` });
          }
          offset += 12 + chunkSize;
        }
      }

      if (metadataList.length <= 2) {
        metadataList.push({ key: 'Structural Metadata', val: 'System verified clean metadata or unindexed binary tags.' });
      }

      resolve(metadataList);
    };
    reader.onerror = () => {
      resolve([{ key: 'Analysis Error', val: 'Failed to read image byte stream.' }]);
    };
    reader.readAsArrayBuffer(file.slice(0, 128 * 1024));
  });
}

window.toggleImgCompressionCompare = function () {
  const panel = document.getElementById('imgCompressionComparePanel');
  if (!panel) return;
  const isOpening = !panel.classList.contains('open');
  panel.classList.toggle('open');
  if (isOpening) {
    const body = document.getElementById('imgCompressionCompareBody');
    setTimeout(() => (body || panel).scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
  }
};

window.openImgLightbox = function (imgId) {
  const src = document.getElementById(imgId)?.src;
  if (!src) return;
  const backdrop = document.getElementById('imgLightboxBackdrop');
  const lightImg = document.getElementById('imgLightboxImg');
  if (!backdrop || !lightImg) return;
  lightImg.src = src;
  backdrop.classList.add('active');
  document.body.style.overflow = 'hidden';
};

window.closeImgLightbox = function () {
  const backdrop = document.getElementById('imgLightboxBackdrop');
  if (backdrop) backdrop.classList.remove('active');
  document.body.style.overflow = '';
};

window.toggleImgMetadataDetails = function () {
  const panel = document.getElementById('imgMetadataDiagnosticsPanel');
  if (!panel) return;

  const isOpening = !panel.classList.contains('open');
  panel.classList.toggle('open');

  if (isOpening) {
    const body = document.getElementById('imgMetadataDiagBody');
    setTimeout(() => {
      (body || panel).scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  }
};

function clearPreviousImgUploadedFile() {
  if (imgUploadedFile) {
    if (imgUploadedFile.originalPreviewUrl) {
      try { URL.revokeObjectURL(imgUploadedFile.originalPreviewUrl); } catch (e) { }
    }
    if (imgUploadedFile.compressedPreviewUrl) {
      try { URL.revokeObjectURL(imgUploadedFile.compressedPreviewUrl); } catch (e) { }
    }
    imgUploadedFile = null;
  }
}

function resetImgUploadAreaUI(currentLang) {
  isImgSegmentationSkipped = false;
  if ($imgCoverCounter) $imgCoverCounter.style.display = '';
  if ($imgCoverGutter) $imgCoverGutter.style.display = '';

  if ($imgUploadArea) {
    $imgUploadArea.classList.remove('has-preview', 'img-upload-success-glow', 'img-upload-shimmer');
    $imgUploadArea.style.padding = '';
    $imgUploadArea.style.overflow = '';
    $imgUploadArea.style.position = '';
    $imgUploadArea.style.cursor = '';
    $imgUploadArea.style.borderColor = '';
    $imgUploadArea.style.boxShadow = '';
    $imgUploadArea.innerHTML = `
      <span class="material-symbols-outlined" id="imgUploadIcon">cloud_upload</span>
      <p class="text-body-md file-upload__title" id="imgUploadTitle" data-i18n="imgDropzoneHint">
        ${currentLang === 'ar' ? 'قم بسحب وإفلات صورتك السرية هنا أو انقر للتصفح' : 'Drag & drop your secret image here or click to browse'}
      </p>
      <p class="text-body-sm file-upload__hint" id="imgUploadHint" data-i18n="imgDropzoneLimits" style="margin-top: 4px; color: var(--color-on-surface-variant);">
        ${currentLang === 'ar' ? 'المسموح: JPEG, WebP, Avif, PNG · الحد الأقصى: 2 ميجابايت' : 'Allowed: JPEG, WebP, Avif, PNG · Max size: 2MB'}
      </p>
    `;
    const headerBtn = document.getElementById('btnChangeImageHeader');
    if (headerBtn) headerBtn.remove();
    const btnEditSeg = document.getElementById('btnEditSegmentation');
    if (btnEditSeg) btnEditSeg.style.display = 'none';
    const diagPanel = document.getElementById('imgMetadataDiagnosticsPanel');
    if (diagPanel) diagPanel.style.display = 'none';
  }
}

async function handleImgFileSelect(file) {
  const currentLang = localStorage.getItem('stegoLang') || 'en';
  clearPreviousImgUploadedFile();

  const validExtensions = ['.jpg', '.jpeg', '.webp', '.avif', '.png'];
  const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  const isValidExtension = validExtensions.includes(fileExt);

  if (!isValidExtension) {
    showToast(TRANSLATIONS_EMBED[currentLang].imgErrFormat || '❌ Invalid format: Only JPEG, WebP, Avif, and PNG images are allowed.');
    return;
  }

  if (file.size > IMG_MAX_FILE_SIZE) {
    showToast(TRANSLATIONS_EMBED[currentLang].imgErrSize || '❌ File too large: Maximum allowed size is 2MB.');
    return;
  }

  const hasValidSignature = await isValidImageSignature(file);
  if (!hasValidSignature) {
    showToast(currentLang === 'ar'
      ? '❌ محتوى الملف غير صالح: الملف المرفوع ليس صورة حقيقية حتى وإن كان الامتداد صحيحاً.'
      : '❌ Invalid file content: The uploaded file is not a valid image despite its extension.');
    return;
  }

  const isRenderable = await canRenderAsImage(file);
  if (!isRenderable) {
    showToast(currentLang === 'ar'
      ? '❌ تعذر معالجة الصورة: الملف تالف أو لا يحتوي على بيانات صورة صالحة.'
      : '❌ Failed to process image: The file is corrupted or does not contain valid image data.');
    return;
  }

  const isAvif = fileExt === '.avif' || file.type === 'image/avif';

  imgUploadedFile = {
    name: file.name,
    data: null,
    size: file.size,
    type: file.type || ('image/' + fileExt.substring(1)),
    fileObject: file,
    savedMetadataBytes: 0,
    shouldStripMetadata: false,
    isAvif: isAvif
  };

  let shouldStrip = false;
  if (!isAvif) {
    shouldStrip = await promptMetadataStripping();
  }
  imgUploadedFile.shouldStripMetadata = shouldStrip;

  updateImgCapacityMeter();
  await processUploadedImage();

  // Prompt Smart Message Segmentation after image compression
  if (imgUploadedFile && imgUploadedFile.data) {
    const btnEditSeg = document.getElementById('btnEditSegmentation');
    if (btnEditSeg) btnEditSeg.style.display = 'inline-flex';

    const nameBytes = new TextEncoder().encode(imgUploadedFile.name);
    const nameLen = Math.min(nameBytes.length, 255);
    const totalPayloadSize = 1 + 1 + nameLen + 4 + imgUploadedFile.data.length;

    const segResult = await promptSegmentation(totalPayloadSize);
    if (segResult) {
      if (segResult.mode === 'skip') {
        resetSegmentation();
      } else if (segResult.count > 0) {
        applySegmentation(segResult.count);
      }
    }
  }

  updateCoverMessageCounter();
}

/**
 * Renders line numbers in the cover editor gutter.
 * Each line gets a numbered span; the active (last-typed) line is highlighted.
 */
function renderCoverLineNumbers() {
  if (!$imgCoverText || !$imgCoverGutterInner) return;

  const lines = $imgCoverText.value.split('\n');
  const lineCount = Math.max(lines.length, 1);

  // Only re-render if count changed
  const currentNums = $imgCoverGutterInner.children.length;
  if (currentNums === lineCount) {
    // Just update active state
    const cursorPos = $imgCoverText.selectionStart;
    const textBeforeCursor = $imgCoverText.value.substring(0, cursorPos);
    const activeLine = textBeforeCursor.split('\n').length;
    for (let i = 0; i < currentNums; i++) {
      const el = $imgCoverGutterInner.children[i];
      el.classList.toggle('cover-editor__line-num--active', i + 1 === activeLine);
    }
    return;
  }

  // Full re-render
  const cursorPos = $imgCoverText.selectionStart;
  const textBeforeCursor = $imgCoverText.value.substring(0, cursorPos);
  const activeLine = textBeforeCursor.split('\n').length;

  const fragment = document.createDocumentFragment();
  for (let i = 1; i <= lineCount; i++) {
    const span = document.createElement('span');
    span.className = 'cover-editor__line-num';
    if (i === activeLine) span.classList.add('cover-editor__line-num--active');
    span.textContent = i;
    fragment.appendChild(span);
  }
  $imgCoverGutterInner.replaceChildren(fragment);
  syncCoverGutterScroll();
}

/**
 * Syncs the gutter scroll position with the textarea scroll.
 */
function syncCoverGutterScroll() {
  if (!$imgCoverText || !$imgCoverGutter) return;
  $imgCoverGutter.scrollTop = $imgCoverText.scrollTop;
}

/**
 * Dynamically recalculates and updates the cover message counter.
 *
 * Logic per the specification:
 * - Initial: requiredMessages = Math.ceil(totalPayload / (limit - avgLineSize - id))
 * - Per written line: chunk = limit - cover_text_size - id
 *   remaining payload shrinks by chunk; required messages recalculates.
 * - The counter reflects: "تم كتابة X من أصل Y رسائل مطلوبة"
 */
function updateCoverMessageCounter() {
  if (!$imgCoverText || !$imgCoverCounter) return;

  // Hide counter if no image uploaded yet OR if segmentation was skipped
  if (!imgUploadedFile || !imgUploadedFile.size || isImgSegmentationSkipped) {
    $imgCoverCounter.style.display = 'none';
    return;
  }

  $imgCoverCounter.style.display = '';

  const currentLang = localStorage.getItem('stegoLang') || 'en';
  const limit = IMG_PLATFORM_LIMIT; // 390
  const id = 1; // 1 byte for chunk ID

  function formatCounterHtml(w, r) {
    if (currentLang === 'ar') {
      return `تم كتابة <span class="counter-written">${w}</span> من أصل <span class="counter-required">${r}</span> رسائل مطلوبة`;
    } else if (currentLang === 'fr') {
      return `<span class="counter-written">${w}</span> sur <span class="counter-required">${r}</span> messages requis écrits`;
    } else if (currentLang === 'zh') {
      return `已撰写 <span class="counter-written">${w}</span> / <span class="counter-required">${r}</span> 条所需消息`;
    } else if (currentLang === 'la') {
      return `<span class="counter-written">${w}</span> ex <span class="counter-required">${r}</span> nuntiis scriptis`;
    } else {
      return `Written <span class="counter-written">${w}</span> of <span class="counter-required">${r}</span> required messages`;
    }
  }

  const imageSize = imgUploadedFile.size;
  const nameBytes = new TextEncoder().encode(imgUploadedFile.name);
  const nameLen = Math.min(nameBytes.length, 255);
  let totalPayload = 1 + 1 + nameLen + 4 + imageSize;

  const text = $imgCoverText.value || '';
  const lines = text.split('\n');

  let writtenCount = 0;
  let remainingPayload = totalPayload;

  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i];
    if (lineText.length === 0) continue;

    const coverTextSize = lineText.length;
    const chunk = Math.max(0, limit - coverTextSize - id);

    if (chunk > 0) {
      writtenCount++;
      remainingPayload -= chunk;
      if (remainingPayload <= 0) break;
    }
  }

  let requiredMessages;
  if (remainingPayload <= 0) {
    requiredMessages = writtenCount;
  } else {
    const avgCapacity = writtenCount > 0
      ? Math.floor((totalPayload - remainingPayload) / writtenCount)
      : (limit - id);

    const additionalNeeded = avgCapacity > 0
      ? Math.ceil(remainingPayload / avgCapacity)
      : Math.ceil(remainingPayload / (limit - id));

    requiredMessages = writtenCount + additionalNeeded;
  }

  const initialEstimate = Math.ceil(totalPayload / (limit - id));
  if (requiredMessages < initialEstimate && remainingPayload > 0) {
    requiredMessages = initialEstimate;
  }

  $imgCoverCounter.innerHTML = formatCounterHtml(writtenCount, requiredMessages);
}

// Global reference for language switcher
window.updateCoverMessageCounter = updateCoverMessageCounter;

function updateImgCapacityMeter() {
  if (!$imgCoverText) return;
  const coverText = ($imgCoverText.value || '').trim();
  const coverLines = coverText.split(/\r?\n/);
  let totalCapacity = 0;
  for (let i = 0; i < coverLines.length; i++) {
    let capacity = IMG_PLATFORM_LIMIT - coverLines[i].length - 1;
    if (capacity > 0) totalCapacity += capacity;
  }

  let imageSize = imgUploadedFile ? imgUploadedFile.size : 0;
  let nameBytesLength = imgUploadedFile ? new TextEncoder().encode(imgUploadedFile.name).length : 0;
  let requiredPayloadSize = imgUploadedFile ? (1 + 1 + nameBytesLength + 4 + imageSize) : 0;

  const imgCoverCharsEl = document.getElementById('imgCoverChars');
  const imgMaxBytesEl = document.getElementById('imgMaxBytes');
  const imgMsgBytesEl = document.getElementById('imgMsgBytes');
  const imgUsageEl = document.getElementById('imgUsage');

  if (imgCoverCharsEl) imgCoverCharsEl.textContent = coverText.length;
  if (imgMaxBytesEl) imgMaxBytesEl.textContent = `${totalCapacity.toLocaleString('en-US')} B`;
  if (imgMsgBytesEl) imgMsgBytesEl.textContent = `${imageSize.toLocaleString('en-US')} B`;
  if (imgUsageEl) imgUsageEl.textContent = `${requiredPayloadSize} / ${totalCapacity} B`;

  const percent = totalCapacity > 0 ? Math.min((requiredPayloadSize / totalCapacity) * 100, 100) : 0;
  const percentEl = document.getElementById('imgMeterPercent');
  const fillEl = document.getElementById('imgMeterFill');

  if (percentEl) percentEl.textContent = `${percent.toFixed(1)}%`;
  if (fillEl) {
    fillEl.style.width = `${percent}%`;
    fillEl.className = 'progress-fill';
    if (percent >= 90) fillEl.classList.add('danger');
    else if (percent >= 70) fillEl.classList.add('warn');
  }

  updateImgGuardValidation(coverText.length + requiredPayloadSize); // Keep or modify based on your preference
}

function updateImgGuardValidation(projectedLength) {
  const platformSelect = document.getElementById('imgGuardPlatformSelect');
  const placementSelect = document.getElementById('imgGuardPlacementSelect');
  if (!platformSelect || platformSelect.value === 'none') return;

  const platformKey = platformSelect.value;
  const placementKey = placementSelect ? placementSelect.value : 'none';
  const previewCard = document.getElementById('imgGuardPreviewCard');

  if (platformKey === 'none' || placementKey === 'none' || !PLATFORM_LIMITS[platformKey]) {
    if (previewCard) previewCard.style.display = 'none';
    return;
  }

  if (previewCard) previewCard.style.display = 'block';

  const platformData = PLATFORM_LIMITS[platformKey];
  const placementData = platformData.placements[placementKey];
  const limit = placementData.limit;
  const currentLang = localStorage.getItem('stegoLang') || 'en';

  const iconWrap = document.getElementById('imgGuardPreviewIcon');
  if (iconWrap) iconWrap.innerHTML = platformData.icon;

  const nameEl = document.getElementById('imgGuardPreviewName');
  if (nameEl) nameEl.textContent = platformData.name[currentLang] || platformData.name['en'];

  const placementEl = document.getElementById('imgGuardPreviewPlacement');
  if (placementEl) placementEl.textContent = placementData.name[currentLang] || placementData.name['en'];

  const limitText = document.getElementById('imgGuardPreviewLimitText');
  const labelChars = currentLang === 'ar' ? 'حرف' : 'chars';
  if (limitText) limitText.textContent = `${currentLang === 'ar' ? 'الحد الاقصى' : 'Limit'}: ${limit.toLocaleString('en-US')} ${labelChars}`;

  const countText = document.getElementById('imgGuardPreviewCountText');
  if (countText) countText.textContent = `${projectedLength.toLocaleString('en-US')} / ${limit.toLocaleString('en-US')} ${labelChars}`;

  const fill = document.getElementById('imgGuardPreviewProgressFill');
  const ratio = Math.min((projectedLength / limit) * 100, 100);
  if (fill) {
    fill.style.width = `${ratio}%`;
    fill.style.background = ''; // Clear inline background styling
    fill.classList.remove('warn', 'danger');
    if (projectedLength > limit) {
      fill.classList.add('danger');
    } else if (projectedLength > limit * 0.8) {
      fill.classList.add('warn');
    }
  }

  const badge = document.getElementById('imgGuardPreviewBadge');
  const badgeText = document.getElementById('imgGuardPreviewBadgeText');
  const badgeIcon = document.getElementById('imgGuardPreviewBadgeIcon');

  if (badge && badgeText && badgeIcon) {
    if (projectedLength <= limit) {
      badge.className = 'platform-preview-badge platform-preview-badge--safe';
      badgeIcon.textContent = 'check_circle';
      badgeText.textContent = currentLang === 'ar' ? 'آمن' : 'Safe';
    } else {
      badge.className = 'platform-preview-badge platform-preview-badge--danger';
      badgeIcon.textContent = 'warning';
      badgeText.textContent = currentLang === 'ar' ? 'غير متوافق' : 'Exceeded';
    }
  }
}

async function performImageEmbedding() {
  const currentLang = localStorage.getItem('stegoLang') || 'en';
  hideImgResultsPanel();

  const gridEl = document.getElementById('imgTimeTakenGrid');
  if (gridEl) gridEl.style.display = 'none';
  const embedCardEl = document.getElementById('imgEmbedTimeCard');
  if (embedCardEl) embedCardEl.style.display = 'none';
  const compressCardEl = document.getElementById('imgCompressTimeCard');
  if (compressCardEl) compressCardEl.style.display = 'none';

  const coverText = $imgCoverText ? $imgCoverText.value : '';
  const stegoKey = $imgKeyInput ? $imgKeyInput.value.trim() : '';

  // ── EMOJI INPUT VALIDATION ──
  const emojiError = validateEmojiInputs([
    { el: $imgCoverText, name: { en: "Cover Text", ar: "نص الغلاف" } },
    { el: $imgKeyInput, name: { en: "AES-CTR Key", ar: "مفتاح تشفير AES-CTR" } }
  ]);
  if (emojiError) return;

  if (!coverText || coverText.length === 0) {
    showToast(TRANSLATIONS_EMBED[currentLang].imgErrNoCover || '⚠ Please input the cover text.');
    return;
  }

  // Check if cover text already contains variation selectors (VS)
  let hasVS = false;
  for (const char of coverText) {
    const codePoint = char.codePointAt(0);
    if (isBaseVariationSelector(codePoint) || isSupplementaryVariationSelector(codePoint)) {
      hasVS = true;
      break;
    }
  }
  if (hasVS) {
    const errMsg = currentLang === 'ar'
      ? '⚠️ خطأ: نص الغلاف يحتوي بالفعل على أحرف مخفية (أحرف التحويل). يرجى استخدام نص غلاف نظيف.'
      : '⚠️ Error: Cover text already contains hidden characters (Variation Selectors). Please use a clean cover text.';
    showToast(errMsg);
    return;
  }

  if (!imgUploadedFile) {
    showToast(TRANSLATIONS_EMBED[currentLang].imgErrNoImage || '⚠ Please upload a secret image.');
    return;
  }
  if (!stegoKey) {
    showToast(TRANSLATIONS_EMBED[currentLang].imgErrNoKey || '⚠ Please input the AES-CTR Key.');
    return;
  }

  const origBtnText = $btnImgHideData.innerHTML;
  $btnImgHideData.disabled = true;
  $btnImgHideData.innerHTML = `
    <span class="material-symbols-outlined spin" style="animation: spin 1.2s linear infinite; display: inline-block; vertical-align: middle; margin-right: 6px;">autorenew</span>
    <span>${currentLang === 'ar' ? 'جاري التحسين والتضمين...' : 'Optimizing & Embedding...'}</span>
  `;

  try {
    if (!imgUploadedFile || !imgUploadedFile.data) {
      throw new Error(currentLang === 'ar'
        ? 'لم يتم العثور على بيانات الصورة المضغوطة بشكل صحيح. يرجى إعادة رفع الصورة.'
        : 'Compressed image data not found. Please re-upload the image.');
    }

    const startTime = performance.now();
    const compressedData = imgUploadedFile.data;
    const savedMetadataBytes = imgUploadedFile.savedMetadataBytes || 0;

    const nameBytes = new TextEncoder().encode(imgUploadedFile.name);
    const nameLen = Math.min(nameBytes.length, 255);
    const payloadSize = 1 + 1 + nameLen + 4 + compressedData.length;

    const coverLines = coverText.split(/\r?\n/);

    // Precise validation if segmentation target was chosen
    if (!isImgSegmentationSkipped && currentImgSegTargetCount > 0) {
      if (coverLines.length < currentImgSegTargetCount) {
        const segNoticeMsg = currentLang === 'ar'
          ? `⚠️ تذكير: لقد حددت تقسيم النص إلى ${currentImgSegTargetCount} رسالة، ولكن النص يحتوي على ${coverLines.length} رسالة فقط. يرجى إكمال ${currentImgSegTargetCount} رسالة أو اضغط زر [تعديل التقسيم].`
          : `⚠️ Notice: You selected ${currentImgSegTargetCount} messages segmentation, but typed only ${coverLines.length} lines. Please complete ${currentImgSegTargetCount} messages or click [Edit Segmentation].`;
        showToast(segNoticeMsg);
        return;
      }
    }

    let usedCoverLines = [];
    let chunkSizes = [];
    let accumulated = 0;

    for (let i = 0; i < coverLines.length; i++) {
      let capacity = IMG_PLATFORM_LIMIT - coverLines[i].length - 1; // 1 byte for ID
      if (capacity > 0) {
        usedCoverLines.push(coverLines[i]);
        let toTake = Math.min(capacity, payloadSize - accumulated);
        chunkSizes.push(toTake);
        accumulated += toTake;
        if (accumulated >= payloadSize) break;
      }
    }

    // Check if Multi-Message Protocol is active or available
    const useMultiMessageProtocol = (typeof window.MultiMessageProtocol !== 'undefined');

    if (useMultiMessageProtocol) {
      // ── FOLD-AWARE ADAPTIVE MULTI-MESSAGE EMBEDDING PIPELINE ──
      const origCoverLines = coverText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      
      // Derive AES encrypted payload
      const encryptedData = await encryptPayloadCtr(compressedData, stegoKey, coverText);

      // Build complete unchunked container payload: [0xFF marker][nameLen][nameBytes][fileSize][encryptedData]
      const containerSize = 1 + 1 + nameLen + 4 + encryptedData.length;
      const fullContainer = new Uint8Array(containerSize);

      let off = 0;
      fullContainer[off++] = IMG_FILE_MARKER;
      fullContainer[off++] = nameLen;
      fullContainer.set(nameBytes.subarray(0, nameLen), off);
      off += nameLen;

      const size = encryptedData.length;
      fullContainer[off++] = (size >>> 24) & 0xFF;
      fullContainer[off++] = (size >>> 16) & 0xFF;
      fullContainer[off++] = (size >>> 8) & 0xFF;
      fullContainer[off++] = size & 0xFF;
      fullContainer.set(encryptedData, off);

      // Compute full payload SHA-256 digest
      const fullPayloadSha256 = await window.MultiMessageProtocol.computeSha256Raw(fullContainer);

      // Generate 8-byte Transfer ID
      const transferId = new Uint8Array(8);
      crypto.getRandomValues(transferId);

      // Compute adaptive chunking plan
      const chunkPlan = window.MultiMessageProtocol.computeAdaptiveChunks(fullContainer, origCoverLines);
      const totalParts = chunkPlan.totalChunks;

      window.currentStegoMessages = [];
      window.copiedSegIndices = new Set();

      let accordionItemsHtml = '';

      for (let i = 0; i < totalParts; i++) {
        const chunkInfo = chunkPlan.chunks[i];
        const coverLine = chunkInfo.coverText;

        // Build 64-byte binary framing header
        const headerBytes = window.MultiMessageProtocol.buildChunkHeader(
          transferId,
          i,
          totalParts,
          containerSize,
          chunkInfo.chunkDataLen,
          chunkInfo.chunkCrc32,
          fullPayloadSha256
        );

        // Combine Header + Chunk Payload
        const packetBytes = new Uint8Array(headerBytes.length + chunkInfo.chunkData.length);
        packetBytes.set(headerBytes, 0);
        packetBytes.set(chunkInfo.chunkData, headerBytes.length);

        // Encode binary packet into Variation Selectors
        let vsString = '';
        for (const b of packetBytes) {
          vsString += toVariationSelector(b);
        }

        // Fold-Aware Safe Midpoint Insertion into cover text
        const stegoLine = window.MultiMessageProtocol.insertVSAtMidpoint(coverLine, vsString);

        window.currentStegoMessages.push(stegoLine);

        const boxId = `imgStegoBox_${i}`;
        const cleanText = coverLine;
        const defaultLabel = currentLang === 'ar' ? `رسالة التغطية (${i + 1})` : `Cover Message (${i + 1})`;
        const cleanPreview = cleanText.length > 45 
          ? cleanText.substring(0, 45) + '...' 
          : (cleanText || defaultLabel);

        const partBadgeText = currentLang === 'ar' 
          ? `الجزء ${i + 1}/${totalParts}` 
          : `Part ${i + 1}/${totalParts}`;

        // Estimate fold safety (< 4096 UTF-16 units is safe for WhatsApp)
        const utf16Len = stegoLine.length;
        const isFoldSafe = utf16Len <= 4096;
        const foldBadgeHtml = isFoldSafe
          ? `<span class="badge badge--safe" style="font-size: 0.7rem; padding: 2px 6px;">${currentLang === 'ar' ? 'آمن من التغيير' : 'Fold-Safe'}</span>`
          : `<span class="badge badge--warn" style="font-size: 0.7rem; padding: 2px 6px;">${currentLang === 'ar' ? 'قد يتجاوز الطي' : 'Large'}</span>`;

        accordionItemsHtml += `
          <div class="seg-accordion-item" id="segAccItem_${i}">
            <div class="seg-accordion-header" onclick="toggleSegAccordion(${i})">
              <div class="seg-accordion-header-left">
                <span class="seg-accordion-badge">${partBadgeText}</span>
                ${foldBadgeHtml}
                <span class="seg-accordion-preview">${escapeHtml(cleanPreview)}</span>
              </div>
              <div class="seg-accordion-header-right">
                <span class="seg-accordion-status" id="segAccStatus_${i}">
                  <span class="material-symbols-outlined" style="font-size: 14px;">radio_button_unchecked</span>
                  <span data-i18n="imgSegOutputReadyBadge">${currentLang === 'ar' ? 'جاهز' : 'Ready'}</span>
                </span>
                <button type="button" class="btn btn--secondary btn--sm" onclick="event.stopPropagation(); copySegMessage(${i}, '${boxId}', this)" style="padding: 4px 10px; font-size: 0.75rem; gap: 4px;">
                  <span class="material-symbols-outlined" style="font-size: 14px;">content_copy</span>
                  <span data-i18n="btnCopy">${currentLang === 'ar' ? 'نسخ' : 'Copy'}</span>
                </button>
                <span class="material-symbols-outlined seg-chevron-icon">expand_more</span>
              </div>
            </div>
            <div class="seg-accordion-body">
              <div class="editor-block">
                <textarea class="editor-block__textarea" id="${boxId}" rows="3" readonly>${stegoLine}</textarea>
              </div>
              <div style="display:flex; justify-content:space-between; margin-top: 6px; font-size: 0.75rem; color: var(--color-on-surface-variant);">
                <span>CRC32: <code>0x${chunkInfo.chunkCrc32.toString(16).toUpperCase()}</code></span>
                <span>Length: ${utf16Len} UTF-16 units</span>
              </div>
            </div>
          </div>
        `;
      }

    const dashboardHtml = `
      <div class="seg-dashboard-box">
        <div class="seg-dashboard-header">
          <div class="seg-dashboard-title-wrap">
            <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 22px;">splitscreen</span>
            <h3 class="seg-dashboard-title" data-i18n="imgSegOutputTitle">${currentLang === 'ar' ? 'رسائل النص المخفي المقسمة' : 'Segmented Stego-Text Messages'}</h3>
            <span class="badge badge--primary" style="font-family: monospace;">${totalParts} ${currentLang === 'ar' ? 'رسائل' : 'Msgs'}</span>
          </div>
          <div class="seg-dashboard-actions">
            <button type="button" class="btn btn--secondary btn--sm" id="btnSegExpandCollapseAll" onclick="toggleAllSegAccordions()" style="padding: 6px 12px; font-size: 0.78rem; gap: 4px;">
              <span class="material-symbols-outlined" style="font-size: 16px;">unfold_more</span>
              <span id="btnSegExpandText" data-i18n="imgSegOutputExpandAll">${currentLang === 'ar' ? 'توسيع الكل' : 'Expand All'}</span>
            </button>
            <button type="button" class="btn btn--primary btn--sm" id="btnSegCopyAll" onclick="copyAllSegMessages(this)" style="padding: 6px 12px; font-size: 0.78rem; gap: 6px;">
              <span class="material-symbols-outlined" style="font-size: 16px;">content_copy</span>
              <span data-i18n="imgSegOutputCopyAll">${currentLang === 'ar' ? 'نسخ جميع الرسائل' : 'Copy All Messages'}</span>
            </button>
          </div>
        </div>

        <div class="seg-progress-bar-wrap">
          <div class="seg-progress-bar-info">
            <span data-i18n="imgSegOutputProgress">${currentLang === 'ar' ? 'إنجاز النسخ:' : 'Copy Progress:'}</span>
            <span id="segCopyProgressText">0 / ${totalParts} (0%)</span>
          </div>
          <div class="seg-progress-bar-track">
            <div class="seg-progress-bar-fill" id="segCopyProgressFill" style="width: 0%;"></div>
          </div>
        </div>

        <div class="seg-accordion-list" id="segAccordionList">
          ${accordionItemsHtml}
        </div>
      </div>
    `;

      const container = document.getElementById('imgDistributedOutputContainer');
      if (container) {
        container.innerHTML = dashboardHtml;
      }
    } else {
      // Single message fallback
      if (accumulated < payloadSize) {
        const capacityErrMsg = currentLang === 'ar'
          ? '⚠️ نص التغطية الحالي لا يكفي لحمل الصورة المشفرة. يرجى إضافة أسطر جديدة أو استخدام زر [تعديل التقسيم].'
          : '⚠️ Cover text length is insufficient for the encrypted image payload. Please add more lines or use [Edit Segmentation].';
        showToast(capacityErrMsg);
        return;
      }
    }

    const durationMs = performance.now() - startTime;

    let hasTiming = false;
    const embedTimeVal = document.getElementById('imgEmbedTimeVal');
    if (embedCardEl && embedTimeVal) {
      embedTimeVal.setAttribute('data-duration', durationMs);
      embedTimeVal.textContent = currentLang === 'ar'
        ? `${durationMs.toFixed(1)} ملي ثانية`
        : `${durationMs.toFixed(1)} ms`;
      embedCardEl.style.display = 'flex';
      hasTiming = true;
    }

    const compressTimeVal = document.getElementById('imgCompressTimeVal');
    if (compressCardEl && compressTimeVal && imgUploadedFile.compressDurationMs !== undefined) {
      const compDurationMs = imgUploadedFile.compressDurationMs;
      compressTimeVal.setAttribute('data-duration', compDurationMs);
      compressTimeVal.textContent = currentLang === 'ar'
        ? `${compDurationMs.toFixed(1)} ملي ثانية`
        : `${compDurationMs.toFixed(1)} ms`;
      compressCardEl.style.display = 'flex';
      hasTiming = true;
    }

    if (hasTiming && gridEl) {
      gridEl.style.display = 'grid';
    }

    showImgResultsPanel();

    if ($imgMetadataReport && $imgMetadataReportText) {
      if (imgUploadedFile && imgUploadedFile.shouldStripMetadata && savedMetadataBytes > 0) {
        const savedKB = (savedMetadataBytes / 1024).toFixed(2);
        $imgMetadataReportText.textContent = currentLang === 'ar'
          ? `${savedKB} كيلوبايت`
          : `${savedKB} KB`;
        $imgMetadataReport.style.display = 'flex';
      } else {
        $imgMetadataReport.style.display = 'none';
      }
    }

    (function populateCompressionCompare() {
      if (!imgUploadedFile || !imgUploadedFile.originalPreviewUrl) return;

      const panel = document.getElementById('imgCompressionComparePanel');
      const badge = document.getElementById('imgCompressionSavingsBadge');
      const savingsEl = document.getElementById('imgCompressionSavingsText');
      const summaryBefore = document.getElementById('imgSummaryBeforeSize');
      const summaryAfter = document.getElementById('imgSummaryAfterSize');
      const beforeImg = document.getElementById('imgBeforePreview');
      const beforeImgBlur = document.getElementById('imgBeforePreviewBlur');
      const afterImg = document.getElementById('imgAfterPreview');
      const afterImgBlur = document.getElementById('imgAfterPreviewBlur');
      const beforeSize = document.getElementById('imgBeforeSize');
      const afterSize = document.getElementById('imgAfterSize');
      const beforeFmt = document.getElementById('imgBeforeFormat');

      if (!panel) return;

      const isAvif = (imgUploadedFile.originalType === 'image/avif') || (imgUploadedFile.name.toLowerCase().endsWith('.avif'));
      if (isAvif) {
        panel.style.display = 'none';
        return;
      } else {
        panel.style.display = 'block';
      }

      const origMime = (imgUploadedFile.originalType || 'image/jpeg').toUpperCase().replace('IMAGE/', '');
      const origKB = (imgUploadedFile.originalSize / 1024).toFixed(1);
      const compKB = (imgUploadedFile.size / 1024).toFixed(1);
      const pct = parseFloat(imgUploadedFile.savingsPercent || 0);

      if (beforeImg) beforeImg.src = imgUploadedFile.originalPreviewUrl;
      if (beforeImgBlur) beforeImgBlur.src = imgUploadedFile.originalPreviewUrl;
      if (afterImg) afterImg.src = imgUploadedFile.compressedPreviewUrl;
      if (afterImgBlur) afterImgBlur.src = imgUploadedFile.compressedPreviewUrl;
      if (beforeSize) beforeSize.textContent = `${origKB} KB`;
      if (afterSize) afterSize.textContent = `${compKB} KB`;
      if (summaryBefore) summaryBefore.textContent = `${origKB} KB`;
      if (summaryAfter) summaryAfter.textContent = `${compKB} KB`;
      if (beforeFmt) beforeFmt.textContent = origMime;
      if (badge) badge.textContent = `-${pct}% Saved`;
      if (savingsEl) savingsEl.textContent = `-${pct}%`;
    })();

    showToast(currentLang === 'ar' ? '✅ تم تضمين الصورة بنجاح في نص التغطية!' : '✅ Image embedded inside cover text successfully!');

  } catch (error) {
    const errPrefix = currentLang === 'ar' ? '❌ خطأ أثناء التضمين: ' : '❌ Embedding error: ';
    showToast(errPrefix + error.message);
  } finally {
    $btnImgHideData.disabled = false;
    $btnImgHideData.innerHTML = origBtnText;
  }
}

function closeImgGuardModal() {
  document.getElementById('platform-warning-modal-backdrop').classList.remove('active');
  document.getElementById('platform-warning-modal').classList.remove('active');
}

function showImgResultsPanel() {
  if ($imgResultsPanel) {
    $imgResultsPanel.style.display = 'block';
    setTimeout(() => $imgResultsPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
  }
}

function hideImgResultsPanel() {
  if ($imgResultsPanel) $imgResultsPanel.style.display = 'none';
}

// Helper to check magic bytes
async function isValidImageSignature(file) {
  try {
    const headerBytes = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file.slice(0, 12));
    });

    if (headerBytes.length < 4) return false;

    // 1. JPEG: FF D8 FF
    if (headerBytes[0] === 0xFF && headerBytes[1] === 0xD8 && headerBytes[2] === 0xFF) {
      return true;
    }

    // 2. PNG: 89 50 4E 47
    if (headerBytes[0] === 0x89 && headerBytes[1] === 0x50 && headerBytes[2] === 0x4E && headerBytes[3] === 0x47) {
      return true;
    }

    // 3. WebP: RIFF ... WEBP
    if (headerBytes.length >= 12 &&
      headerBytes[0] === 0x52 && headerBytes[1] === 0x49 && headerBytes[2] === 0x46 && headerBytes[3] === 0x46 &&
      headerBytes[8] === 0x57 && headerBytes[9] === 0x45 && headerBytes[10] === 0x42 && headerBytes[11] === 0x50
    ) {
      return true;
    }

    // 4. AVIF: brand check
    const isFtyp = headerBytes[4] === 0x66 && headerBytes[5] === 0x74 && headerBytes[6] === 0x79 && headerBytes[7] === 0x70;
    const isAvifBrand = (headerBytes[8] === 0x61 && headerBytes[9] === 0x76 && headerBytes[10] === 0x69 && headerBytes[11] === 0x66) ||
      (headerBytes[8] === 0x61 && headerBytes[9] === 0x76 && headerBytes[10] === 0x69 && headerBytes[11] === 0x75) ||
      (headerBytes[8] === 0x6D && headerBytes[9] === 0x69 && headerBytes[10] === 0x66 && headerBytes[11] === 0x31);
    if (isFtyp && isAvifBrand) {
      return true;
    }

    return false;
  } catch (e) {
    return false;
  }
}

async function canRenderAsImage(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(true);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(false);
    };
    img.src = url;
  });
}

function toggleImgGuardPlatformSelect(e) {
  e.stopPropagation();
  const options = document.getElementById('imgGuardPlatformOptions');
  if (options) {
    options.classList.toggle('open');
    const placementOpts = document.getElementById('imgGuardPlacementOptions');
    if (placementOpts) placementOpts.classList.remove('open');
  }
}

function toggleImgGuardPlacementSelect(e) {
  e.stopPropagation();
  const platformSelect = document.getElementById('imgGuardPlatformSelect');
  if (platformSelect && platformSelect.value === 'none') return;

  const options = document.getElementById('imgGuardPlacementOptions');
  if (options) {
    options.classList.toggle('open');
    const platformOpts = document.getElementById('imgGuardPlatformOptions');
    if (platformOpts) platformOpts.classList.remove('open');
  }
}

function selectImgGuardPlatformOption(value) {
  const hiddenInput = document.getElementById('imgGuardPlatformSelect');
  if (!hiddenInput) return;
  hiddenInput.value = value;

  const labelSpan = document.getElementById('imgGuardPlatformLabel');
  const currentLang = localStorage.getItem('stegoLang') || 'en';

  if (value === 'none') {
    labelSpan.setAttribute('data-i18n', 'guardPlatformNone');
    labelSpan.textContent = currentLang === 'ar' ? 'لا يوجد' : 'None';
  } else {
    labelSpan.removeAttribute('data-i18n');
    const platformData = PLATFORM_LIMITS[value];
    const pName = platformData.name[currentLang] || platformData.name['en'];
    labelSpan.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="display:flex; align-items:center; justify-content:center; width:20px; height:20px; flex-shrink:0;">
          ${platformData.icon}
        </span>
        <span>${pName}</span>
      </div>
    `;
  }

  // Sync active class in select options
  document.querySelectorAll('#imgGuardPlatformOptions .custom-option').forEach(opt => {
    opt.classList.toggle('selected', opt.getAttribute('data-value') === value);
  });

  document.getElementById('imgGuardPlatformOptions').classList.remove('open');
  onImgGuardPlatformChange();
}

function selectImgGuardPlacementOption(value) {
  const hiddenInput = document.getElementById('imgGuardPlacementSelect');
  if (!hiddenInput) return;
  hiddenInput.value = value;

  const platformSelect = document.getElementById('imgGuardPlatformSelect');
  const platformKey = platformSelect ? platformSelect.value : 'none';
  const labelSpan = document.getElementById('imgGuardPlacementLabel');
  const currentLang = localStorage.getItem('stegoLang') || 'en';

  if (value === 'none') {
    labelSpan.setAttribute('data-i18n', 'guardPlacementNone');
    labelSpan.textContent = currentLang === 'ar' ? '-- اختر الموضع --' : '-- Choose Placement --';
  } else if (platformKey !== 'none' && PLATFORM_LIMITS[platformKey]) {
    labelSpan.removeAttribute('data-i18n');
    const platformData = PLATFORM_LIMITS[platformKey];
    const placementData = platformData.placements[value];
    if (placementData) {
      labelSpan.textContent = placementData.name[currentLang] || placementData.name['en'];
    }
  }

  document.querySelectorAll('#imgGuardPlacementOptions .custom-option').forEach(opt => {
    opt.classList.toggle('selected', opt.getAttribute('data-value') === value);
  });

  document.getElementById('imgGuardPlacementOptions').classList.remove('open');
  updateImgCapacityMeter(); // trigger guard validation refresh
}

function onImgGuardPlatformChange() {
  const platformSelect = document.getElementById('imgGuardPlatformSelect');
  const placementSelect = document.getElementById('imgGuardPlacementSelect');
  const placementTrigger = document.getElementById('imgGuardPlacementTrigger');
  const currentLang = localStorage.getItem('stegoLang') || 'en';

  if (!platformSelect || !placementSelect || !placementTrigger) return;

  const val = platformSelect.value;
  if (val === 'none') {
    // Disable placement
    placementTrigger.style.pointerEvents = 'none';
    placementTrigger.style.opacity = '0.5';
    selectImgGuardPlacementOption('none');
    document.getElementById('imgGuardPreviewCard').style.display = 'none';
  } else {
    // Enable placement
    placementTrigger.style.pointerEvents = 'auto';
    placementTrigger.style.opacity = '1';

    // Populate options
    const container = document.getElementById('imgGuardPlacementOptions');
    container.innerHTML = '';

    const platformData = PLATFORM_LIMITS[val];
    Object.keys(platformData.placements).forEach((pk, idx) => {
      const opt = document.createElement('div');
      opt.className = 'custom-option';
      opt.setAttribute('data-value', pk);
      opt.onclick = () => selectImgGuardPlacementOption(pk);
      opt.textContent = platformData.placements[pk].name[currentLang] || platformData.placements[pk].name['en'];
      container.appendChild(opt);

      // default select first placement
      if (idx === 0) selectImgGuardPlacementOption(pk);
    });

    document.getElementById('imgGuardPreviewCard').style.display = 'block';
  }
}

function initImgPlatformGuardDropdowns() {
  const platformOptionsContainer = document.getElementById('imgGuardPlatformOptions');
  if (!platformOptionsContainer) return;
  const currentLang = localStorage.getItem('stegoLang') || 'en';

  platformOptionsContainer.innerHTML = '';

  const noneOpt = document.createElement('div');
  noneOpt.className = 'custom-option selected';
  noneOpt.setAttribute('data-value', 'none');
  noneOpt.onclick = () => selectImgGuardPlatformOption('none');
  noneOpt.innerHTML = `<span data-i18n="guardPlatformNone">${currentLang === 'ar' ? 'لا يوجد' : 'None'}</span>`;
  platformOptionsContainer.appendChild(noneOpt);

  Object.keys(PLATFORM_LIMITS).forEach(key => {
    const opt = document.createElement('div');
    opt.className = 'custom-option';
    opt.setAttribute('data-value', key);
    opt.onclick = () => selectImgGuardPlatformOption(key);

    const platformData = PLATFORM_LIMITS[key];
    const pName = platformData.name[currentLang] || platformData.name['en'];
    opt.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="display:flex; align-items:center; justify-content:center; width:20px; height:20px; flex-shrink:0;">
          ${platformData.icon}
        </span>
        <span>${pName}</span>
      </div>
    `;
    platformOptionsContainer.appendChild(opt);
  });

  // Default select none
  selectImgGuardPlatformOption('none');
}

// Duplicate updateImgGuardValidation function removed to avoid conflict.

// Bind DOM elements on load
document.addEventListener('DOMContentLoaded', () => {
  $imgCoverText = document.getElementById('imgEmbedCover');
  $imgKeyInput = document.getElementById('imgEmbedKey');
  $imgUploadArea = document.getElementById('imgEmbedUploadArea');
  $imgFileInput = document.getElementById('imgEmbedFileInput');
  $btnImgHideData = document.getElementById('btnImgHideData');
  $imgResultsPanel = document.getElementById('img-embed-results-panel');
  $imgStegoText = document.getElementById('imgStegoText');
  $imgMetadataReport = document.getElementById('imgMetadataCard');
  $imgMetadataReportText = document.getElementById('imgMetadataSavedVal');

  // Cover Editor — line numbers + counter references
  $imgCoverGutter = document.getElementById('imgCoverGutter');
  $imgCoverGutterInner = document.getElementById('imgCoverGutterInner');
  $imgCoverCounter = document.getElementById('imgCoverCounter');

  if ($btnImgHideData) {
    $btnImgHideData.addEventListener('click', performImageEmbedding);
  }

  // Edit Segmentation button listener (Flexibility to re-configure segmentation anytime)
  const btnEditSeg = document.getElementById('btnEditSegmentation');
  if (btnEditSeg) {
    btnEditSeg.addEventListener('click', async () => {
      if (!imgUploadedFile || !imgUploadedFile.data) return;
      const nameBytes = new TextEncoder().encode(imgUploadedFile.name);
      const nameLen = Math.min(nameBytes.length, 255);
      const totalPayloadSize = 1 + 1 + nameLen + 4 + imgUploadedFile.data.length;

      const segResult = await promptSegmentation(totalPayloadSize);
      if (segResult) {
        if (segResult.mode === 'skip') {
          resetSegmentation();
        } else if (segResult.count > 0) {
          applySegmentation(segResult.count);
        }
      }
    });
  }

  // Eye toggle for image key
  const imgEyeBtn = document.getElementById('img-eye-toggle-btn');
  if (imgEyeBtn && $imgKeyInput) {
    imgEyeBtn.addEventListener('click', () => {
      const isHidden = $imgKeyInput.type === 'password';
      $imgKeyInput.type = isHidden ? 'text' : 'password';
      const eyeIcon = document.getElementById('img-eye-icon');
      if (eyeIcon) {
        eyeIcon.textContent = isHidden ? 'visibility_off' : 'visibility';
      }
    });
  }

  if ($imgKeyInput) {
    $imgKeyInput.addEventListener('input', () => {
      const counterEl = document.getElementById('img-key-counter');
      if (counterEl) {
        counterEl.textContent = `${$imgKeyInput.value.length} ${getCharsLabel()}`;
      }
    });
  }

  // Upload area click & drop handlers
  if ($imgUploadArea && $imgFileInput) {
    $imgUploadArea.addEventListener('click', (e) => {
      if (!$imgUploadArea.classList.contains('has-preview')) {
        $imgFileInput.click();
      } else {
        if (e.target.id === 'btnChangeImageHeader' || e.target.closest('#btnChangeImageHeader')) {
          $imgFileInput.click();
        } else {
          const previewImg = $imgUploadArea.querySelector('#imgUploadPreviewImg');
          if (previewImg) {
            openImgLightbox(previewImg.id);
          }
        }
      }
    });

    $imgFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleImgFileSelect(e.target.files[0]);
      }
    });

    $imgUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!$imgUploadArea.classList.contains('has-preview')) {
        $imgUploadArea.classList.add('dragover');
      }
    });

    $imgUploadArea.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      $imgUploadArea.classList.remove('dragover');
    });

    $imgUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      $imgUploadArea.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleImgFileSelect(e.dataTransfer.files[0]);
      }
    });
  }

  // ── Cover Editor: line numbers, scroll sync, counter ──
  if ($imgCoverText) {
    // Combined input handler: line numbers + capacity meter
    $imgCoverText.addEventListener('input', () => {
      renderCoverLineNumbers();
      updateImgCapacityMeter();
    });

    // Update message counter ONLY when Enter is pressed
    $imgCoverText.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        setTimeout(() => {
          updateCoverMessageCounter();
        }, 0);
      }
    });

    // Scroll sync: mirror textarea scrollTop to gutter
    $imgCoverText.addEventListener('scroll', () => {
      syncCoverGutterScroll();
    });

    // Track cursor movement for active line highlighting
    $imgCoverText.addEventListener('click', () => {
      renderCoverLineNumbers();
    });
    $imgCoverText.addEventListener('keyup', () => {
      renderCoverLineNumbers();
    });

    // Initial render
    renderCoverLineNumbers();
    updateCoverMessageCounter();
  }

  // Custom select bindings for Image platform guard are handled via inline onclick attributes in HTML to prevent double toggling.

  // Close custom dropdowns when clicking outside for image tab
  document.addEventListener('click', function (e) {
    const wrapper = document.getElementById('imgGuardPlatformWrapper');
    if (wrapper && !wrapper.contains(e.target)) {
      const options = document.getElementById('imgGuardPlatformOptions');
      if (options) options.classList.remove('open');
    }
    const placementWrapper = document.getElementById('imgGuardPlacementWrapper');
    if (placementWrapper && !placementWrapper.contains(e.target)) {
      const placementOptions = document.getElementById('imgGuardPlacementOptions');
      if (placementOptions) placementOptions.classList.remove('open');
    }
  });

// ══════════════════════════════════════════════════════════════
// Global Handlers for Segmented Stego Output Dashboard & Accordion Cards
// ══════════════════════════════════════════════════════════════
window.copySegMessage = function(index, elementId, btnElement) {
  const textarea = document.getElementById(elementId);
  if (!textarea || !textarea.value) return;

  const currentLang = localStorage.getItem('stegoLang') || 'en';

  navigator.clipboard.writeText(textarea.value).then(() => {
    if (window.copiedSegIndices) {
      window.copiedSegIndices.add(index);
    }
    updateSegCopyProgressTracker();

    const itemEl = document.getElementById(`segAccItem_${index}`);
    if (itemEl) itemEl.classList.add('seg-accordion-item--copied');

    const statusEl = document.getElementById(`segAccStatus_${index}`);
    if (statusEl) {
      statusEl.className = 'seg-accordion-status seg-accordion-status--copied';
      statusEl.innerHTML = `
        <span class="material-symbols-outlined" style="font-size: 14px; color: var(--color-primary);">check_circle</span>
        <span>${currentLang === 'ar' ? 'تم النسخ' : 'Copied'}</span>
      `;
    }

    if (btnElement) {
      const origText = btnElement.innerHTML;
      btnElement.innerHTML = `
        <span class="material-symbols-outlined" style="font-size: 14px;">check</span>
        <span>${currentLang === 'ar' ? 'تم' : 'Done'}</span>
      `;
      setTimeout(() => {
        btnElement.innerHTML = origText;
      }, 2000);
    }

    const toastMsg = currentLang === 'ar' 
      ? `📋 تم نسخ الجزء (${index + 1}) إلى الحافظة!` 
      : `📋 Part (${index + 1}) copied to clipboard!`;
    showToast(toastMsg);
  }).catch(() => {
    showToast('❌ Copy failed. Please select manually.');
  });
};

window.copyAllSegMessages = function(btnElement) {
  if (!window.currentStegoMessages || window.currentStegoMessages.length === 0) return;

  const currentLang = localStorage.getItem('stegoLang') || 'en';
  const allText = window.currentStegoMessages.join('\n\n');

  navigator.clipboard.writeText(allText).then(() => {
    const total = window.currentStegoMessages.length;
    if (window.copiedSegIndices) {
      for (let i = 0; i < total; i++) {
        window.copiedSegIndices.add(i);
        const itemEl = document.getElementById(`segAccItem_${i}`);
        if (itemEl) itemEl.classList.add('seg-accordion-item--copied');

        const statusEl = document.getElementById(`segAccStatus_${i}`);
        if (statusEl) {
          statusEl.className = 'seg-accordion-status seg-accordion-status--copied';
          statusEl.innerHTML = `
            <span class="material-symbols-outlined" style="font-size: 14px; color: var(--color-primary);">check_circle</span>
            <span>${currentLang === 'ar' ? 'تم النسخ' : 'Copied'}</span>
          `;
        }
      }
    }
    updateSegCopyProgressTracker();

    if (btnElement) {
      const origHtml = btnElement.innerHTML;
      btnElement.innerHTML = `
        <span class="material-symbols-outlined" style="font-size: 16px;">check_circle</span>
        <span>${currentLang === 'ar' ? 'تم نسخ جميع الرسائل!' : 'All Messages Copied!'}</span>
      `;
      setTimeout(() => {
        btnElement.innerHTML = origHtml;
      }, 2500);
    }

    const toastMsg = currentLang === 'ar' 
      ? `✅ تم نسخ جميع الـ ${total} رسائل بنجاح إلى الحافظة!` 
      : `✅ Copied all ${total} messages to clipboard!`;
    showToast(toastMsg);
  }).catch(() => {
    showToast('❌ Copy all failed.');
  });
};

window.toggleSegAccordion = function(index) {
  const itemEl = document.getElementById(`segAccItem_${index}`);
  if (itemEl) {
    itemEl.classList.toggle('seg-accordion-item--expanded');
  }
};

window.toggleAllSegAccordions = function() {
  const list = document.getElementById('segAccordionList');
  if (!list) return;

  const items = list.querySelectorAll('.seg-accordion-item');
  const btnTextEl = document.getElementById('btnSegExpandText');
  const btnBtn = document.getElementById('btnSegExpandCollapseAll');
  const currentLang = localStorage.getItem('stegoLang') || 'en';

  let hasUnexpanded = false;
  items.forEach(item => {
    if (!item.classList.contains('seg-accordion-item--expanded')) {
      hasUnexpanded = true;
    }
  });

  items.forEach(item => {
    if (hasUnexpanded) {
      item.classList.add('seg-accordion-item--expanded');
    } else {
      item.classList.remove('seg-accordion-item--expanded');
    }
  });

  if (btnBtn) {
    const iconEl = btnBtn.querySelector('.material-symbols-outlined');
    if (iconEl) {
      iconEl.textContent = hasUnexpanded ? 'unfold_less' : 'unfold_more';
    }
  }
  if (btnTextEl) {
    btnTextEl.textContent = hasUnexpanded 
      ? (currentLang === 'ar' ? 'طي الكل' : 'Collapse All')
      : (currentLang === 'ar' ? 'توسيع الكل' : 'Expand All');
  }
};

function updateSegCopyProgressTracker() {
  if (!window.currentStegoMessages) return;
  const total = window.currentStegoMessages.length;
  const copiedCount = window.copiedSegIndices ? window.copiedSegIndices.size : 0;
  const pct = Math.round((copiedCount / total) * 100);

  const fillEl = document.getElementById('segCopyProgressFill');
  const textEl = document.getElementById('segCopyProgressText');

  if (fillEl) fillEl.style.width = `${pct}%`;
  if (textEl) textEl.textContent = `${copiedCount} / ${total} (${pct}%)`;
}


  // Initialize dropdowns
  initImgPlatformGuardDropdowns();
  updateImgCapacityMeter();
});
