// ============================================================================
// Stegnolines — Chat Import & Stego Scanner Main Integration Controller
// Uses Stegnolines Shared i18n & Theme Managers
// Non-Module JavaScript (file:// Compatible)
// ============================================================================

(function () {
  const scannerTranslations = {
    en: {
      chatScannerTitle: 'Chat Import & Text Extractor',
      chatScannerSubtitle: 'Import exported social-media chats and extract clean text messages — 100% local processing.',
      privacyNotice: '100% Local Processing — Uploaded chats never leave your device.',
      selectPlatform: 'Select Platform',
      chatApp: 'Chat App',
      platformAuto: 'Auto Detect',
      platformGeneric: 'Generic File',
      dropzoneTitle: 'Drop your chat export file here',
      dropzoneSubtitle: 'or click to browse',
      supportedFormats: 'Supported formats: .txt, .json, .html, .csv, .zip',
      chooseFile: 'Choose File',
      removeFile: 'Remove File',
      advancedOptions: 'Advanced Options',
      removeTimestamps: 'Remove timestamps from visible output',
      removeSenderNames: 'Remove sender names from visible output',
      ignoreSystem: 'Ignore media placeholders / system messages',
      customRegex: 'Custom cleanup regex rule',
      regexPlaceholder: 'Pattern to strip (e.g. \\[photo\\])...',
      processBtn: 'Extract Text Messages',
      processAction: 'Parse → Clean → Extract text messages',
      processing: 'Processing...',
      stepReading: 'Reading',
      stepDetecting: 'Detecting',
      stepExtracting: 'Extracting',
      stepCleaning: 'Cleaning',
      stepDone: 'Done',
      csvMapperTitle: 'CSV Column Mapping Required',
      csvMapperSubtitle: 'Auto-detection failed. Select the column containing message content:',
      selectTextCol: 'Message Content Column',
      applyMapping: 'Apply Column Mapping',
      imported: 'Imported',
      extracted: 'Extracted',
      messages: 'Messages',
      ignored: 'Ignored',
      searchPlaceholder: 'Search clean messages...',
      dateRangeFilter: 'Date Range Filter',
      allDates: 'All dates',
      fromDate: 'From Date',
      toDate: 'To Date',
      datePlaceholder: 'YYYY-MM-DD',
      presetToday: 'Today',
      presetLast7: 'Last 7 days',
      presetLast30: 'Last 30 days',
      presetThisYear: 'This Year',
      presetReset: '✕ Reset',
      noResults: 'No messages match the current filter.',
      exportTitle: 'Export Options',
      exportTxt: '📄 Clean (TXT)',
      exportJson: '📋 Clean (JSON)',
      copyAll: '📎 Copy All',
      includeMetadataExport: 'Include sender and timestamp metadata in exports (may expose personal data)',
      detailsTitle: 'Message Details & Metadata',
      messageMetadata: 'Message Metadata',
      platform: 'Platform',
      conversation: 'Conversation',
      messageNumber: 'Message #',
      sourceType: 'Source Type',
      sender: 'Sender',
      timestamp: 'Timestamp',
      unknown: 'Unknown',
      of: 'of',
      characters: 'characters',
      words: 'words',
      lines: 'line',
      linesPlural: 'lines',
      bytesRaw: 'bytes (raw)',
      bytesClean: 'bytes (clean)',
      cleanOutput: 'Clean Message Output',
      rawSource: 'Raw Export Line',
      viewDetails: 'View Details',
      copy: 'Copy',
      copyClean: 'Copy Clean',
      copyRaw: 'Copy Raw',
      cleanCopied: '📋 Clean text copied!',
      rawCopied: '📋 Raw text copied!',
      msgCopied: 'Message text copied!',
      copyAllToast: 'Copied all clean text to clipboard!',
      exportTxtToast: 'Exported TXT successfully',
      exportJsonToast: 'Exported JSON successfully',
      reprocessingPlatform: 'Reprocessing with platform: ',
      fileSelectedToast: 'File selected: ',
      unpackingZip: 'Unpacking ZIP archive...',
      noZipFiles: 'No readable text/chat files found inside ZIP archive.',
      zipExtractedSuccess: 'messages extracted from ZIP archive!'
    },
    ar: {
      chatScannerTitle: 'استيراد المحادثات واستخراج النصوص',
      chatScannerSubtitle: 'استيراد سجل محادثات تطبيقات التواصل الاجتماعي واستخراج النصوص النظيفة — معالجة محلية بالكامل.',
      privacyNotice: 'معالجة محلية 100% — ملفات المحادثات لا تغادر جهازك أبداً.',
      selectPlatform: 'اختر المنصة',
      chatApp: 'تطبيق محادثة',
      platformAuto: 'كشف تلقائي',
      platformGeneric: 'ملف عام',
      dropzoneTitle: 'أسقط ملف تصدير المحادثة هنا',
      dropzoneSubtitle: 'أو انقر للتصفح من جهازك',
      supportedFormats: 'الصيغ المدعومة: .txt, .json, .html, .csv, .zip',
      chooseFile: 'اختر ملف',
      removeFile: 'إزالة الملف',
      advancedOptions: 'خيارات متقدمة',
      removeTimestamps: 'إزالة الطوابع الزمنية من النواتج المعروضة',
      removeSenderNames: 'إزالة أسماء المرسلين من النواتج المعروضة',
      ignoreSystem: 'تجاهل رسائل النظام والوسائط المؤقتة',
      customRegex: 'قاعدة Regex مخصصة للتنظيف',
      regexPlaceholder: 'نمط للحذف (مثال: \\[صورة\\])...',
      processBtn: 'استخراج الرسائل النصية',
      processAction: 'تحليل ← تنظيف ← استخراج الرسائل النصية',
      processing: 'جارٍ المعالجة...',
      stepReading: 'قراءة الملف',
      stepDetecting: 'كشف التنسيق',
      stepExtracting: 'استخراج النصوص',
      stepCleaning: 'تنظيف المحتوى',
      stepDone: 'اكتمل',
      csvMapperTitle: 'تعيين أعمدة CSV مطلوب',
      csvMapperSubtitle: 'فشل الكشف التلقائي. اختر العمود الذي يحتوي على نص الرسالة:',
      selectTextCol: 'عمود محتوى الرسالة',
      applyMapping: 'تطبيق تعيين الأعمدة',
      imported: 'مستوردة',
      extracted: 'المستخرجة',
      messages: 'رسائل',
      ignored: 'متجاهلة',
      searchPlaceholder: 'البحث في الرسائل النظيفة...',
      dateRangeFilter: 'فلتر نطاق التاريخ',
      allDates: 'جميع التواريخ',
      fromDate: 'من تاريخ',
      toDate: 'إلى تاريخ',
      datePlaceholder: 'سنة-شهر-يوم',
      presetToday: 'اليوم',
      presetLast7: 'آخر 7 أيام',
      presetLast30: 'آخر 30 يومًا',
      presetThisYear: 'هذه السنة',
      presetReset: '✕ إعادة تعيين',
      noResults: 'لا توجد رسائل تطابق الفلتر الحالي.',
      exportTitle: 'خيارات التصدير',
      exportTxt: '📄 نص نظيف (TXT)',
      exportJson: '📋 نص نظيف (JSON)',
      copyAll: '📎 نسخ الكل',
      includeMetadataExport: 'تضمين البيانات الوصفية (المرسل والطابع الزمني) في ملفات التصدير',
      detailsTitle: 'تفاصيل الرسالة والبيانات الوصفية',
      messageMetadata: 'بيانات الرسالة الوصفية',
      platform: 'المنصة',
      conversation: 'المحادثة',
      messageNumber: 'رقم الرسالة',
      sourceType: 'نوع المصدر',
      sender: 'المرسل',
      timestamp: 'الطابع الزمني',
      unknown: 'غير معروف',
      of: 'من',
      characters: 'حرف',
      words: 'كلمة',
      lines: 'سطر',
      linesPlural: 'أسطر',
      bytesRaw: 'بايت (خام)',
      bytesClean: 'بايت (نظيف)',
      cleanOutput: 'نص الرسالة النظيف المستخرج',
      rawSource: 'السطر الأصلي الخام من ملف التصدير',
      viewDetails: 'عرض التفاصيل',
      copy: 'نسخ',
      copyClean: 'نسخ النص النظيف',
      copyRaw: 'نسخ النص الخام',
      cleanCopied: '📋 تم نسخ النص النظيف!',
      rawCopied: '📋 تم نسخ النص الخام!',
      msgCopied: 'تم نسخ نص الرسالة!',
      copyAllToast: 'تم نسخ جميع النصوص النظيفة للحافظة!',
      exportTxtToast: 'تم تصدير ملف TXT بنجاح',
      exportJsonToast: 'تم تصدير ملف JSON بنجاح',
      reprocessingPlatform: 'إعادة المعالجة باستخدام المنصة: ',
      fileSelectedToast: 'تم اختيار الملف: ',
      unpackingZip: 'جارٍ فك حزمة ملف ZIP...',
      noZipFiles: 'لم يتم العثور على ملفات محادثة قابلة للقراءة داخل ملف ZIP.',
      zipExtractedSuccess: 'رسالة تم استخراجها من حزمة ZIP بنجاح!'
    },
  };

  // Merge into global translations
  if (typeof window.translations !== 'undefined') {
    if (window.translations.en) Object.assign(window.translations.en, scannerTranslations.en);
    if (window.translations.ar) Object.assign(window.translations.ar, scannerTranslations.ar);
  } else {
    window.translations = scannerTranslations;
  }
  window.TRANSLATIONS = window.translations;

  function getCurrentLanguage() {
    return document.documentElement.getAttribute('lang') || localStorage.getItem('stego-lang') || 'en';
  }

  function t(key) {
    const lang = getCurrentLanguage();
    const dict = (window.translations && window.translations[lang]) ? window.translations[lang] : (scannerTranslations[lang] || scannerTranslations.en);
    return dict[key] || (scannerTranslations.en && scannerTranslations.en[key]) || key;
  }

  function showToastMessage(msg, type = 'info') {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, type);
    } else {
      let container = document.querySelector('#toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
      }
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = msg;
      container.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  }

  // Global applyLanguage function called by theme-manager.js and template-loader.js
  window.applyLanguage = function (lang) {
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

    // Update data-i18n static labels
    const dict = window.translations ? window.translations[lang] : scannerTranslations[lang];
    if (dict) {
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
          const hasIcon = el.querySelector('.material-symbols-outlined');
          if (hasIcon) {
            el.childNodes.forEach(child => {
              if (child.nodeType === Node.TEXT_NODE && child.textContent.trim().length > 0) {
                child.textContent = dict[key];
              }
            });
          } else {
            el.textContent = dict[key];
          }
        }
      });

      document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (dict[key]) {
          el.setAttribute('placeholder', dict[key]);
        }
      });
    }

    // Inform ChatScanner to re-render in the new language
    if (window.ChatScanner && typeof window.ChatScanner.applyLanguage === 'function') {
      window.ChatScanner.applyLanguage(lang);
    }
  };

  let scannerInstance = null;

  document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('#panel-chat-scanner');
    if (container && window.ChatScanner) {
      const initLang = getCurrentLanguage();
      document.documentElement.setAttribute('lang', initLang);
      document.documentElement.setAttribute('dir', initLang === 'ar' ? 'rtl' : 'ltr');

      scannerInstance = window.ChatScanner.initChatScanner(container, showToastMessage, t);

      // Translate static page elements on load
      if (typeof window.applyLanguage === 'function') {
        window.applyLanguage(initLang);
      }
    }
  });
})();
