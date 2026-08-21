// ============================================================================
// Chat Import & Text Extractor — Module Controller & UI Renderer
// Uses Stegnolines Native CSS Classes (card, btn, form-*, toggle, badge, metric-card)
// Non-Module JavaScript (file:// Compatible)
//
// PURPOSE: Extract clean text messages from exported chat files.
//          Supports WhatsApp, Telegram, Facebook, Instagram, X, TikTok,
//          YouTube, WeChat, Snapchat, LinkedIn, and generic formats.
//
// NOTE: This tool does NOT perform steganalysis or steganographic
//       extraction. It simply parses chat exports and presents
//       clean readable text messages.
// ============================================================================

(function () {
  const activeInstances = [];

  const DEFAULT_TRANSLATIONS = {
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
    }
  };

  function initChatScanner(container, showToast, tParam) {
    let selectedFile = null;
    let selectedPlatform = 'auto';
    let lastParseResult = null;
    let searchQuery = '';
    let includeMetadataExport = false;
    let dateFrom = '';
    let dateTo = '';

    function t(key) {
      const curLang = document.documentElement.getAttribute('lang') || localStorage.getItem('stegoLang') || 'en';
      if (tParam && typeof tParam === 'function') {
        const res = tParam(key);
        if (res && res !== key) return res;
      }
      if (window.translations && window.translations[curLang] && window.translations[curLang][key]) {
        return window.translations[curLang][key];
      }
      if (DEFAULT_TRANSLATIONS[curLang] && DEFAULT_TRANSLATIONS[curLang][key]) {
        return DEFAULT_TRANSLATIONS[curLang][key];
      }
      if (DEFAULT_TRANSLATIONS['en'] && DEFAULT_TRANSLATIONS['en'][key]) {
        return DEFAULT_TRANSLATIONS['en'][key];
      }
      return key;
    }

    const PLATFORM_SVGS = {
      auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
      whatsapp: '<svg viewBox="0 0 24 24" fill="#25D366" width="18" height="18"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>',
      telegram: '<svg viewBox="0 0 24 24" fill="#26A5E4" width="18" height="18"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.56 8.224c-.124 1.312-.66 4.475-.935 5.952-.116.623-.347.83-.568.852-.482.045-.848-.318-1.314-.623-.73-.478-1.144-.775-1.854-1.242-.82-.538-.289-.834.18-1.318.122-.127 2.247-2.057 2.288-2.231a.172.172 0 0 0-.038-.146.183.183 0 0 0-.172-.016c-.073.016-1.24.787-3.498 2.311-.332.228-.632.339-.9.333-.296-.006-.867-.167-1.29-.304-.52-.17-1.127-.26-1.09-.546.018-.15.226-.303.62-.46 2.42-1.054 4.032-1.748 4.84-2.083 2.302-.958 2.78-1.124 3.09-.13z"/></svg>',
      facebook: '<svg viewBox="0 0 24 24" fill="#1877F2" width="18" height="18"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
      instagram: '<svg viewBox="0 0 24 24" width="18" height="18"><defs><linearGradient id="ig-cs" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#feda75"/><stop offset="25%" stop-color="#fa7e1e"/><stop offset="50%" stop-color="#d62976"/><stop offset="75%" stop-color="#962fbf"/><stop offset="100%" stop-color="#4f5bd5"/></linearGradient></defs><path fill="url(#ig-cs)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>',
      x: '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
      tiktok: '<svg viewBox="0 0 16 16" fill="currentColor" width="18" height="18"><path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3V0Z"/></svg>',
      youtube: '<svg viewBox="0 0 24 24" fill="#FF0000" width="18" height="18"><path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.508 9.388.508 9.388.508s7.517 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
      wechat: '<svg viewBox="0 0 24 24" fill="#07C160" width="18" height="18"><path d="M8.28 0C3.7 0 0 3.1 0 6.94c.02 2.17 1.17 4.1 3.07 5.37l-.8 2.37 2.76-1.38c1 .26 2.05.4 3.25.4 4.58 0 8.28-3.1 8.28-6.93C16.56 3.1 12.87 0 8.28 0zm7.4 9.87c.36 0 .72.03 1.07.09.43-2.6-1.85-4.9-5-4.9-3.7 0-6.7 2.3-6.7 5.16 0 1.63.95 3.08 2.47 4.02l-.65 1.93 2.27-1.1c.8.2 1.68.3 2.54.3.36 0 .72-.02 1.07-.06-.2-.67-.32-1.38-.32-2.14 0-1.88 1.4-3.5 3.32-3.5zm-8.8-4.5c.44 0 .8.37.8.8 0 .45-.36.82-.8.82-.45 0-.82-.37-.82-.8 0-.44.37-.8.82-.8zm4.3 0c.43 0 .8.37.8.8 0 .45-.37.82-.8.82-.45 0-.82-.37-.82-.8 0-.44.37-.8.82-.8zm3.2 6c.33 0 .6.28.6.6 0 .34-.27.62-.6.62s-.62-.28-.62-.6c0-.32.28-.6.62-.6zm3.3 0c.32 0 .6.28.6.6 0 .34-.28.62-.6.62s-.6-.28-.6-.6c0-.32.28-.6.6-.6z"/></svg>',
      snapchat: '<svg viewBox="0 0 16 16" fill="#FFFC00" width="18" height="18"><path d="M15.943 11.526c-.111-.303-.323-.465-.564-.599a1 1 0 0 0-.123-.064l-.219-.111c-.752-.399-1.339-.902-1.746-1.498a3.4 3.4 0 0 1-.3-.531c-.034-.1-.032-.156-.008-.207a.3.3 0 0 1 .097-.1c.129-.086.262-.173.352-.231.162-.104.289-.187.371-.245.309-.216.525-.446.66-.702a1.4 1.4 0 0 0 .069-1.16c-.205-.538-.713-.872-1.329-.872a1.8 1.8 0 0 0-.487.065c.006-.368-.002-.757-.035-1.139-.116-1.344-.587-2.048-1.077-2.61a4.294 4.294 0 0 0-1.095-.881C9.764.216 8.92 0 7.999 0s-1.76.216-2.505.641c-.412.232-.782.53-1.097.883-.49.562-.96 1.267-1.077 2.61-.033.382-.04.772-.036 1.138a1.8 1.8 0 0 0-.487-.065c-.615 0-1.124.335-1.328.873a1.398 1.398 0 0 0 .067 1.161c.136.256.352.486.66.701.082.058.21.14.371.246l.339.221c.04.03.08.067.109.11.026.053.027.11-.012.217a3.4 3.4 0 0 1-.295.52c-.398.583-.968 1.077-1.696 1.472-.385.204-.786.34-.955.8-.128.348-.044.743.28 1.075.12.126.261.23.409.31a4.4 4.4 0 0 0 1 .4c.065.024.134.06.202.09.118.104.102.26.259.488.08.119.18.22.296.3.33.229.701.243 1.095.258.355.014.758.03 1.217.18.19.064.389.186.618.328.55.338 1.305.802 2.566.802 1.262 0 2.02-.466 2.576-.806.227-.14.424-.26.609-.321.46-.152.863-.168 1.218-.181.393-.015.764-.03 1.095-.258a1.14 1.14 0 0 0 .336-.368c.114-.192.11-.327.217-.42a.6.6 0 0 1 .19-.087 4.5 4.5 0 0 0 1.014-.404c.16-.087.306-.2.429-.336l.004-.005c.304-.325.38-.709.256-1.047"/></svg>',
      linkedin: '<svg viewBox="0 0 24 24" fill="#0A66C2" width="18" height="18"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z"/></svg>',
      generic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    };

    function getPlatformButtons(selected) {
      const platforms = [
        { id: 'auto', label: t('platformAuto') },
        { id: 'whatsapp', label: 'WhatsApp' },
        { id: 'telegram', label: 'Telegram' },
        { id: 'facebook', label: 'Messenger' },
        { id: 'instagram', label: 'Instagram' },
        { id: 'x', label: 'X (Twitter)' },
        { id: 'tiktok', label: 'TikTok' },
        { id: 'youtube', label: 'YouTube' },
        { id: 'wechat', label: 'WeChat' },
        { id: 'snapchat', label: 'Snapchat' },
        { id: 'linkedin', label: 'LinkedIn' },
        { id: 'generic', label: t('platformGeneric') },
      ];
      return platforms.map(p => `
        <button class="platform-btn ${p.id === selected ? 'active' : ''}" data-platform="${p.id}">
          <span class="platform-icon">${PLATFORM_SVGS[p.id]}</span>
          <span>${p.label}</span>
        </button>
      `).join('');
    }

    renderUI();

    function renderUI() {
      container.innerHTML = `
        <h2 class="text-headline-md card__title">
          <span class="material-symbols-outlined" style="font-size: 20px; vertical-align: middle; margin-inline-end: 6px;">chat</span>
          ${t('chatScannerTitle')}
        </h2>

        <div class="stack-xl">
          <!-- Privacy Badge -->
          <div style="display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: rgba(187,209,0,0.06); border: 1px solid rgba(187,209,0,0.15); border-radius: var(--radius-lg);">
            <span class="material-symbols-outlined" style="color: var(--color-primary); font-size: 18px;">shield</span>
            <span class="text-body-sm" style="color: var(--color-on-surface-variant);">${t('privacyNotice')}</span>
          </div>

          <!-- Section 1: Platform Selector -->
          <div>
            <div class="label-row">
              <label class="form-label text-label-md" style="margin-bottom:0">${t('selectPlatform')}</label>
              <span class="badge badge--encrypted text-label-md">
                <span class="material-symbols-outlined">forum</span> ${t('chatApp')}
              </span>
            </div>
            <div class="platform-grid" id="platform-grid">
              ${getPlatformButtons(selectedPlatform)}
            </div>
          </div>

          <!-- Section 2: File Upload Zone -->
          <div class="file-upload" id="dropzone" tabindex="0" role="button" aria-label="${t('chooseFile')}">
            <input type="file" id="file-input" accept=".txt,.json,.html,.htm,.csv,.zip" style="display: none;" />
            <span class="material-symbols-outlined">cloud_upload</span>
            <div class="file-upload__title" id="dropzone-title">${t('dropzoneTitle')}</div>
            <div class="file-upload__hint text-body-sm" id="dropzone-subtitle">${t('dropzoneSubtitle')}</div>
            <div class="text-body-sm" style="color: var(--color-primary); margin-top: 8px; font-family: monospace;" id="dropzone-formats">${t('supportedFormats')}</div>
            <div id="file-info-bar" style="display: none; margin-top: 12px;">
              <span id="file-name-display" style="font-weight: 600; color: var(--color-primary);"></span>
              <button id="btn-remove-file" class="btn btn--danger" style="margin-inline-start: 8px; font-size: 0.75rem; padding: 4px 10px;">
                ${t('removeFile')}
              </button>
            </div>
          </div>

          <!-- Section 3: Advanced Options -->
          <div>
            <button class="collapsible-header" id="btn-toggle-options">
              <span style="display: flex; align-items: center; gap: 8px;">
                <span class="material-symbols-outlined" style="font-size: 18px;">tune</span>
                <span>${t('advancedOptions')}</span>
              </span>
              <span class="material-symbols-outlined" id="collapsible-arrow" style="font-size: 18px; transition: transform 0.2s;">expand_more</span>
            </button>
            <div class="collapsible-content" id="options-content">
              <div class="toggle-row" style="margin-bottom: 8px;">
                <div>
                  <div class="toggle-row__label">${t('removeTimestamps')}</div>
                </div>
                <label class="toggle">
                  <input type="checkbox" class="toggle__input" id="toggle-timestamps" checked />
                  <span class="toggle__track"></span>
                </label>
              </div>
              <div class="toggle-row" style="margin-bottom: 8px;">
                <div>
                  <div class="toggle-row__label">${t('removeSenderNames')}</div>
                </div>
                <label class="toggle">
                  <input type="checkbox" class="toggle__input" id="toggle-senders" checked />
                  <span class="toggle__track"></span>
                </label>
              </div>
              <div class="toggle-row" style="margin-bottom: 8px;">
                <div>
                  <div class="toggle-row__label">${t('ignoreSystem')}</div>
                </div>
                <label class="toggle">
                  <input type="checkbox" class="toggle__input" id="toggle-system" checked />
                  <span class="toggle__track"></span>
                </label>
              </div>
              <div style="margin-top: 12px;">
                <label class="form-label text-label-md">${t('customRegex')}</label>
                <input type="text" id="input-regex" class="form-input" style="font-family: monospace;" placeholder="${t('regexPlaceholder')}" />
              </div>
            </div>
          </div>

          <!-- Process Button -->
          <div class="scanner-actions-wrapper">
            <button id="btn-process" class="scanner-action-btn scanner-action-primary" disabled>
              <span class="scanner-action-icon">⚡</span>
              <span class="scanner-action-content">
                <span class="scanner-action-title">${t('processBtn')}</span>
                <span class="scanner-action-desc">${t('processAction')}</span>
              </span>
            </button>
          </div>

          <!-- Progress Indicator -->
          <div id="progress-card" class="premium-scanner-loader" style="display: none;">
            <div class="scanner-loader-content" style="text-align: center;">
              <h3 class="text-headline-md" id="progress-label" style="color: var(--color-primary);">${t('processing')}</h3>
              <div style="display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; margin-top: 16px;" id="progress-container">
                <span class="badge badge--draft" id="step-reading" style="transition: all 0.2s;">${t('stepReading')}</span>
                <span class="badge badge--draft" id="step-detecting" style="transition: all 0.2s;">${t('stepDetecting')}</span>
                <span class="badge badge--draft" id="step-extracting" style="transition: all 0.2s;">${t('stepExtracting')}</span>
                <span class="badge badge--draft" id="step-cleaning" style="transition: all 0.2s;">${t('stepCleaning')}</span>
                <span class="badge badge--draft" id="step-done" style="transition: all 0.2s;">${t('stepDone')}</span>
              </div>
            </div>
          </div>

          <!-- CSV Column Mapper -->
          <div id="csv-mapper-card" class="scanner-status-box warning" style="display: none;">
            <h3 class="text-headline-md" style="color: #EAB308; font-size: 0.9rem;">${t('csvMapperTitle')}</h3>
            <p class="text-body-sm" style="color: var(--color-on-surface-variant); margin: 8px 0 12px;">${t('csvMapperSubtitle')}</p>
            <div>
              <label class="form-label text-label-md">${t('selectTextCol')}</label>
              <select id="select-csv-col" class="form-select"></select>
            </div>
            <button id="btn-apply-csv-col" class="btn btn--primary" style="margin-top: 12px;">${t('applyMapping')}</button>
          </div>

          <!-- Section 4: Results Dashboard -->
          <div id="results-dashboard" style="display: none;">
            <!-- Metric Cards Grid -->
            <div class="metric-cards-grid">
              <div class="metric-card">
                <span class="metric-card__label">${t('imported')}</span>
                <span class="metric-card__value" id="stat-total">0</span>
              </div>
              <div class="metric-card">
                <span class="metric-card__label">${t('extracted')}</span>
                <span class="metric-card__value" id="stat-extracted" style="color: var(--color-primary);">0</span>
                <span class="metric-card__badge metric-card__badge--primary">${t('messages')}</span>
              </div>
              <div class="metric-card">
                <span class="metric-card__label">${t('ignored')}</span>
                <span class="metric-card__value" id="stat-ignored">0</span>
              </div>
            </div>

            <!-- Search Bar -->
            <div class="filter-bar" style="margin-top: var(--space-lg);">
              <div class="search-box" style="position: relative; flex: 1; min-width: 220px;">
                <span class="material-symbols-outlined" style="position: absolute; top: 50%; transform: translateY(-50%); inset-inline-start: 10px; font-size: 18px; color: var(--color-on-surface-variant); pointer-events: none;">search</span>
                <input type="text" id="input-search" class="form-input" style="padding-inline-start: 36px;" placeholder="${t('searchPlaceholder')}" />
              </div>
            </div>

            <!-- Date Range Filter -->
            <div style="margin-top: var(--space-md); background: rgba(187,209,0,0.04); border: 1px solid rgba(187,209,0,0.12); border-radius: var(--radius-lg); padding: 14px 16px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 10px;">
                <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-primary);">date_range</span>
                <strong class="text-label-md" style="color: var(--color-primary);">${t('dateRangeFilter')}</strong>
                <span class="badge badge--draft text-label-md" id="date-filter-status" style="margin-inline-start: auto;">${t('allDates')}</span>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                  <label class="form-label text-label-md" style="font-size: 0.78rem; opacity: 0.7;">${t('fromDate')}</label>
                  <input type="text" id="input-date-from" class="form-input" placeholder="${t('datePlaceholder')}" autocomplete="off" />
                </div>
                <div>
                  <label class="form-label text-label-md" style="font-size: 0.78rem; opacity: 0.7;">${t('toDate')}</label>
                  <input type="text" id="input-date-to" class="form-input" placeholder="${t('datePlaceholder')}" autocomplete="off" />
                </div>
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px;">
                <button class="btn btn--secondary date-preset-btn" data-preset="today" style="padding: 3px 10px; font-size: 0.72rem;">${t('presetToday')}</button>
                <button class="btn btn--secondary date-preset-btn" data-preset="7days" style="padding: 3px 10px; font-size: 0.72rem;">${t('presetLast7')}</button>
                <button class="btn btn--secondary date-preset-btn" data-preset="30days" style="padding: 3px 10px; font-size: 0.72rem;">${t('presetLast30')}</button>
                <button class="btn btn--secondary date-preset-btn" data-preset="year" style="padding: 3px 10px; font-size: 0.72rem;">${t('presetThisYear')}</button>
                <button class="btn btn--danger date-preset-btn" data-preset="reset" style="padding: 3px 10px; font-size: 0.72rem;">${t('presetReset')}</button>
              </div>
            </div>

            <!-- Message Cards List -->
            <div class="message-list" id="message-list"></div>

            <!-- Export Controls -->
            <div class="card card--mt">
              <h3 class="text-headline-md card__title" style="font-size: 0.9rem;">
                <span class="material-symbols-outlined" style="font-size: 18px; vertical-align: middle;">download</span>
                ${t('exportTitle')}
              </h3>
              <div class="btn-group" style="margin-bottom: 12px;">
                <button id="btn-export-txt" class="btn btn--secondary">${t('exportTxt')}</button>
                <button id="btn-export-json" class="btn btn--secondary">${t('exportJson')}</button>
                <button id="btn-copy-all" class="btn btn--primary">${t('copyAll')}</button>
              </div>
              <label class="toggle-row" style="cursor: pointer; padding: 10px 16px;">
                <span class="toggle-row__label text-body-sm">${t('includeMetadataExport')}</span>
                <label class="toggle">
                  <input type="checkbox" class="toggle__input" id="chk-export-meta" />
                  <span class="toggle__track"></span>
                </label>
              </label>
            </div>
          </div>
        </div>
      `;

      // Update or create details modal in document.body
      let modalContainer = document.getElementById('chat-scanner-modal-wrap');
      if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'chat-scanner-modal-wrap';
        document.body.appendChild(modalContainer);
      }
      modalContainer.innerHTML = `
        <div class="cs-modal-backdrop" id="drawer-backdrop"></div>
        <div class="cs-modal" id="details-drawer">
          <div class="cs-modal__header">
            <h3 class="text-headline-md" style="display: flex; align-items: center; gap: 8px;">
              <span class="material-symbols-outlined" style="font-size: 20px;">info</span>
              <span>${t('detailsTitle')}</span>
            </h3>
            <button id="btn-close-drawer" class="btn btn--secondary" style="padding: 4px 10px;">
              <span class="material-symbols-outlined" style="font-size: 18px;">close</span>
            </button>
          </div>
          <div class="cs-modal__body" id="drawer-body"></div>
        </div>
      `;

      // Restore UI state if existing
      if (selectedFile) {
        const nameDisplay = container.querySelector('#file-name-display');
        if (nameDisplay) nameDisplay.textContent = `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`;
        const infoBar = container.querySelector('#file-info-bar');
        if (infoBar) infoBar.style.display = 'block';
        const dTitle = container.querySelector('#dropzone-title');
        if (dTitle) dTitle.style.display = 'none';
        const dSub = container.querySelector('#dropzone-subtitle');
        if (dSub) dSub.style.display = 'none';
        const dFmt = container.querySelector('#dropzone-formats');
        if (dFmt) dFmt.style.display = 'none';
        const btnProc = container.querySelector('#btn-process');
        if (btnProc) btnProc.disabled = false;
      }

      if (lastParseResult) {
        const dashboard = container.querySelector('#results-dashboard');
        if (dashboard) {
          dashboard.style.display = 'block';
          const msgs = lastParseResult.messages;
          const total = msgs.length + (lastParseResult.ignoredCount || 0);
          const statTotal = container.querySelector('#stat-total');
          const statExtracted = container.querySelector('#stat-extracted');
          const statIgnored = container.querySelector('#stat-ignored');
          if (statTotal) statTotal.textContent = total;
          if (statExtracted) statExtracted.textContent = msgs.length;
          if (statIgnored) statIgnored.textContent = lastParseResult.ignoredCount || 0;

          const sInput = container.querySelector('#input-search');
          if (sInput) sInput.value = searchQuery;

          const fromInput = container.querySelector('#input-date-from');
          const toInput = container.querySelector('#input-date-to');
          if (fromInput) fromInput.value = dateFrom;
          if (toInput) toInput.value = dateTo;

          updateDateFilterStatus();
          renderMessagesList();
        }
      }

      attachEventListeners();
    }

    // ====================================================================
    // EVENT LISTENERS
    // ====================================================================

    function attachEventListeners() {
      const platformBtns = container.querySelectorAll('.platform-btn');
      platformBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          platformBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          selectedPlatform = btn.dataset.platform;
          if (selectedFile) {
            showToast(t('reprocessingPlatform') + btn.textContent.trim(), 'info');
            processFileWorkflow();
          }
        });
      });

      const dropzone = container.querySelector('#dropzone');
      const fileInput = container.querySelector('#file-input');
      const btnRemove = container.querySelector('#btn-remove-file');
      const btnProcess = container.querySelector('#btn-process');

      if (dropzone && fileInput) {
        dropzone.addEventListener('click', () => fileInput.click());
        dropzone.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
        });
        dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
        dropzone.addEventListener('dragleave', (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); });
        dropzone.addEventListener('drop', (e) => {
          e.preventDefault(); dropzone.classList.remove('dragover');
          if (e.dataTransfer.files.length > 0) handleFileSelected(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', (e) => {
          if (e.target.files.length > 0) handleFileSelected(e.target.files[0]);
        });
      }

      if (btnRemove) {
        btnRemove.addEventListener('click', (e) => {
          e.stopPropagation();
          selectedFile = null;
          if (fileInput) fileInput.value = '';
          container.querySelector('#file-info-bar').style.display = 'none';
          container.querySelector('#dropzone-title').style.display = 'block';
          container.querySelector('#dropzone-subtitle').style.display = 'block';
          container.querySelector('#dropzone-formats').style.display = 'block';
          container.querySelector('#results-dashboard').style.display = 'none';
          if (btnProcess) btnProcess.disabled = true;
        });
      }

      const btnToggleOptions = container.querySelector('#btn-toggle-options');
      const optionsContent = container.querySelector('#options-content');
      const collapsibleArrow = container.querySelector('#collapsible-arrow');
      if (btnToggleOptions && optionsContent && collapsibleArrow) {
        btnToggleOptions.addEventListener('click', () => {
          const isOpen = optionsContent.classList.toggle('active');
          collapsibleArrow.style.transform = isOpen ? 'rotate(180deg)' : '';
          btnToggleOptions.style.borderBottomLeftRadius = isOpen ? '0' : '';
          btnToggleOptions.style.borderBottomRightRadius = isOpen ? '0' : '';
        });
      }

      if (btnProcess) {
        btnProcess.addEventListener('click', () => processFileWorkflow());
      }

      // Date range filter listeners
      const inputDateFrom = container.querySelector('#input-date-from');
      const inputDateTo = container.querySelector('#input-date-to');

      if (inputDateFrom && inputDateTo) {
        if (typeof flatpickr !== 'undefined') {
          const currentLang = document.documentElement.getAttribute('lang') || localStorage.getItem('stego-lang') || 'en';
          const fpLocale = (currentLang === 'ar' && flatpickr.l10ns && flatpickr.l10ns.ar) ? flatpickr.l10ns.ar : { firstDayOfWeek: 0 };
          const fpConfig = {
            dateFormat: 'Y-m-d',
            allowInput: true,
            disableMobile: true,
            locale: fpLocale,
            onChange: function(selectedDates, dateStr, instance) {
              if (instance.element.id === 'input-date-from') {
                dateFrom = dateStr;
              } else {
                dateTo = dateStr;
              }
              updateDateFilterStatus();
              renderMessagesList();
            }
          };
          flatpickr(inputDateFrom, fpConfig);
          flatpickr(inputDateTo, fpConfig);
        } else {
          inputDateFrom.addEventListener('change', (e) => {
            dateFrom = e.target.value;
            updateDateFilterStatus();
            renderMessagesList();
          });
          inputDateTo.addEventListener('change', (e) => {
            dateTo = e.target.value;
            updateDateFilterStatus();
            renderMessagesList();
          });
        }
      }

      // Date preset buttons
      container.querySelectorAll('.date-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const preset = btn.dataset.preset;
          const today = new Date();
          const toStr = today.toISOString().split('T')[0];

          if (preset === 'reset') {
            dateFrom = '';
            dateTo = '';
          } else if (preset === 'today') {
            dateFrom = toStr;
            dateTo = toStr;
          } else if (preset === '7days') {
            const d = new Date(today); d.setDate(d.getDate() - 7);
            dateFrom = d.toISOString().split('T')[0];
            dateTo = toStr;
          } else if (preset === '30days') {
            const d = new Date(today); d.setDate(d.getDate() - 30);
            dateFrom = d.toISOString().split('T')[0];
            dateTo = toStr;
          } else if (preset === 'year') {
            dateFrom = today.getFullYear() + '-01-01';
            dateTo = toStr;
          }

          const fromEl = container.querySelector('#input-date-from');
          const toEl = container.querySelector('#input-date-to');
          if (fromEl) fromEl.value = dateFrom;
          if (toEl) toEl.value = dateTo;

          // Update flatpickr instances
          const fpFrom = fromEl ? fromEl._flatpickr : null;
          const fpTo = toEl ? toEl._flatpickr : null;
          if (fpFrom) fpFrom.setDate(dateFrom, false);
          if (fpTo) fpTo.setDate(dateTo, false);
          updateDateFilterStatus();
          renderMessagesList();
        });
      });

      const inputSearch = container.querySelector('#input-search');
      if (inputSearch) {
        inputSearch.addEventListener('input', (e) => {
          searchQuery = e.target.value;
          renderMessagesList();
        });
      }

      // Details modal close handlers
      const closeBtn = document.getElementById('btn-close-drawer');
      const backdrop = document.getElementById('drawer-backdrop');
      if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
      if (backdrop) backdrop.addEventListener('click', closeDrawer);

      const btnExportTxt = container.querySelector('#btn-export-txt');
      if (btnExportTxt) {
        btnExportTxt.addEventListener('click', () => {
          if (!lastParseResult) return;
          const text = window.ChatExport.exportCleanTXT(lastParseResult.messages, includeMetadataExport);
          window.ChatExport.downloadBlob(text, `clean-messages-${lastParseResult.platform}.txt`, 'text/plain');
          showToast(t('exportTxtToast'), 'success');
        });
      }

      const btnExportJson = container.querySelector('#btn-export-json');
      if (btnExportJson) {
        btnExportJson.addEventListener('click', () => {
          if (!lastParseResult) return;
          const json = window.ChatExport.exportCleanJSON(lastParseResult.messages, includeMetadataExport, lastParseResult);
          window.ChatExport.downloadBlob(json, `clean-messages-${lastParseResult.platform}.json`, 'application/json');
          showToast(t('exportJsonToast'), 'success');
        });
      }

      const btnCopyAll = container.querySelector('#btn-copy-all');
      if (btnCopyAll) {
        btnCopyAll.addEventListener('click', async () => {
          if (!lastParseResult) return;
          const allText = lastParseResult.messages.map(m => m.cleanText).join('\n\n');
          await navigator.clipboard.writeText(allText);
          showToast(t('copyAllToast'), 'success');
        });
      }

      const chkMeta = container.querySelector('#chk-export-meta');
      if (chkMeta) {
        chkMeta.addEventListener('change', (e) => {
          includeMetadataExport = e.target.checked;
        });
      }
    }

    // ====================================================================
    // DETAILS MODAL
    // ====================================================================

    function closeDrawer() {
      const modal = document.getElementById('details-drawer');
      const backdrop = document.getElementById('drawer-backdrop');
      if (modal) modal.classList.remove('active');
      if (backdrop) backdrop.classList.remove('active');
      document.body.style.overflow = '';
    }

    function openDetailsDrawer(msgId) {
      const msg = lastParseResult.messages.find(m => m.id === msgId);
      if (!msg) return;

      const drawerBody = document.getElementById('drawer-body');
      if (!drawerBody) return;

      const msgIndex = lastParseResult.messages.indexOf(msg) + 1;
      const charCount = msg.cleanText ? msg.cleanText.length : 0;
      const wordCount = msg.cleanText ? msg.cleanText.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
      const rawBytes = msg.rawText ? new Blob([msg.rawText]).size : 0;
      const cleanBytes = msg.cleanText ? new Blob([msg.cleanText]).size : 0;
      const lineCount = msg.rawText ? msg.rawText.split('\n').length : 1;
      const platform = lastParseResult.platform || 'unknown';
      const convTitle = lastParseResult.conversationTitle || t('unknown');

      drawerBody.innerHTML = `
        <div class="stack-lg">
          <!-- Metadata Grid -->
          <div style="background: rgba(187,209,0,0.04); border: 1px solid rgba(187,209,0,0.12); border-radius: var(--radius-lg); padding: 16px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 12px;">
              <span class="material-symbols-outlined" style="font-size: 18px; color: var(--color-primary);">description</span>
              <strong class="text-label-md" style="color: var(--color-primary);">${t('messageMetadata')}</strong>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px;">
              <div class="text-body-sm">
                <span style="color: var(--color-on-surface-variant); opacity: 0.7;">${t('platform')}</span><br>
                <strong>${escapeHtml(platform.charAt(0).toUpperCase() + platform.slice(1))}</strong>
              </div>
              <div class="text-body-sm">
                <span style="color: var(--color-on-surface-variant); opacity: 0.7;">${t('conversation')}</span><br>
                <strong>${escapeHtml(convTitle)}</strong>
              </div>
              <div class="text-body-sm">
                <span style="color: var(--color-on-surface-variant); opacity: 0.7;">${t('messageNumber')}</span><br>
                <strong>${msgIndex} ${t('of')} ${lastParseResult.messages.length}</strong>
              </div>
              <div class="text-body-sm">
                <span style="color: var(--color-on-surface-variant); opacity: 0.7;">${t('sourceType')}</span><br>
                <strong>${escapeHtml(msg.sourceType || 'message')}</strong>
              </div>
              <div class="text-body-sm">
                <span style="color: var(--color-on-surface-variant); opacity: 0.7;">${t('sender')}</span><br>
                <strong>${escapeHtml(msg.sender || t('unknown'))}</strong>
              </div>
              <div class="text-body-sm">
                <span style="color: var(--color-on-surface-variant); opacity: 0.7;">${t('timestamp')}</span><br>
                <strong>${escapeHtml(msg.timestamp || t('unknown'))}</strong>
              </div>
            </div>
          </div>

          <!-- Text Stats Badges -->
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <span class="badge badge--draft text-label-md">
              <span class="material-symbols-outlined" style="font-size: 14px;">text_fields</span>
              ${charCount} ${t('characters')}
            </span>
            <span class="badge badge--draft text-label-md">
              <span class="material-symbols-outlined" style="font-size: 14px;">notes</span>
              ${wordCount} ${t('words')}
            </span>
            <span class="badge badge--draft text-label-md">
              <span class="material-symbols-outlined" style="font-size: 14px;">straighten</span>
              ${lineCount} ${lineCount !== 1 ? t('linesPlural') : t('lines')}
            </span>
            <span class="badge badge--draft text-label-md">
              <span class="material-symbols-outlined" style="font-size: 14px;">data_usage</span>
              ${rawBytes} ${t('bytesRaw')} · ${cleanBytes} ${t('bytesClean')}
            </span>
          </div>

          <!-- Clean Output -->
          <div>
            <label class="form-label text-label-md">${t('cleanOutput')}</label>
            <div class="scanner-status-box success" style="word-break: break-word;" dir="auto">${escapeHtml(msg.cleanText)}</div>
          </div>

          <!-- Raw Source -->
          <div>
            <label class="form-label text-label-md">${t('rawSource')}</label>
            <pre class="scanner-status-box" style="font-family: monospace; font-size: 0.75rem; white-space: pre-wrap; word-break: break-all;" dir="ltr">${escapeHtml(msg.rawText)}</pre>
          </div>

          <!-- Action Buttons -->
          <div class="btn-group" style="justify-content: flex-end;">
            <button class="btn btn--secondary" onclick="navigator.clipboard.writeText(${JSON.stringify(msg.cleanText || '')}); window._scannerToast('${t('cleanCopied')}');">
              <span class="material-symbols-outlined" style="font-size: 16px;">content_copy</span> ${t('copyClean')}
            </button>
            <button class="btn btn--secondary" onclick="navigator.clipboard.writeText(${JSON.stringify(msg.rawText || '')}); window._scannerToast('${t('rawCopied')}');">
              <span class="material-symbols-outlined" style="font-size: 16px;">raw_on</span> ${t('copyRaw')}
            </button>
          </div>
        </div>
      `;

      const modal = document.getElementById('details-drawer');
      const backdropEl = document.getElementById('drawer-backdrop');
      if (modal && backdropEl) {
        modal.classList.add('active');
        backdropEl.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    }

    // ====================================================================
    // FILE HANDLING & PROCESSING
    // ====================================================================

    function handleFileSelected(file) {
      selectedFile = file;
      const nameDisplay = container.querySelector('#file-name-display');
      if (nameDisplay) nameDisplay.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
      container.querySelector('#file-info-bar').style.display = 'block';
      container.querySelector('#dropzone-title').style.display = 'none';
      container.querySelector('#dropzone-subtitle').style.display = 'none';
      container.querySelector('#dropzone-formats').style.display = 'none';
      container.querySelector('#btn-process').disabled = false;

      showToast(t('fileSelectedToast') + file.name, 'info');
      processFileWorkflow();
    }

    async function processZipWorkflow(file) {
      const progressCard = container.querySelector('#progress-card');
      progressCard.style.display = 'block';
      updateProgressStep('reading');

      showToast(t('unpackingZip'), 'info');
      const zipFiles = await window.ChatParsers.parseZipArchive(file);

      if (!zipFiles || zipFiles.length === 0) {
        progressCard.style.display = 'none';
        showToast(t('noZipFiles'), 'warning');
        return;
      }

      updateProgressStep('detecting');
      await sleep(100);

      updateProgressStep('extracting');
      await sleep(100);

      let combinedMessages = [];
      let totalIgnored = 0;

      for (const zipItem of zipFiles) {
        const result = parseContentByPlatform(zipItem.text, zipItem.ext, selectedPlatform);
        if (result && result.messages && result.messages.length > 0) {
          combinedMessages.push(...result.messages);
          totalIgnored += result.ignoredCount || 0;
        }
      }

      updateProgressStep('cleaning');
      await sleep(100);

      updateProgressStep('done');
      await sleep(150);

      progressCard.style.display = 'none';

      const combinedResult = {
        platform: selectedPlatform,
        conversationTitle: file.name,
        messages: combinedMessages,
        errors: combinedMessages.length === 0 ? ['No messages parsed from files in ZIP'] : [],
        ignoredCount: totalIgnored
      };

      lastParseResult = combinedResult;
      showToast(`${combinedMessages.length} ${t('zipExtractedSuccess')}`, 'success');
      renderDashboard(combinedResult);
    }

    async function processFileWorkflow() {
      if (!selectedFile) return;

      const ext = selectedFile.name.split('.').pop().toLowerCase();
      if (ext === 'zip') {
        await processZipWorkflow(selectedFile);
        return;
      }

      const progressCard = container.querySelector('#progress-card');
      progressCard.style.display = 'block';
      updateProgressStep('reading');

      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target.result;
        updateProgressStep('detecting');
        await sleep(100);

        updateProgressStep('extracting');
        await sleep(100);

        let result = parseContentByPlatform(content, ext, selectedPlatform);

        if (result.errors && result.errors.includes('Need Column Selection')) {
          progressCard.style.display = 'none';
          renderCsvMapper(result.headers, content);
          return;
        }

        updateProgressStep('cleaning');
        await sleep(100);

        updateProgressStep('done');
        await sleep(150);

        progressCard.style.display = 'none';
        lastParseResult = result;
        renderDashboard(result);
      };

      reader.readAsText(selectedFile, 'UTF-8');
    }

    function renderCsvMapper(headers, content) {
      const card = container.querySelector('#csv-mapper-card');
      const select = container.querySelector('#select-csv-col');
      select.innerHTML = headers.map(h => `<option value="${h}">${h}</option>`).join('');
      card.style.display = 'block';

      const btnApply = container.querySelector('#btn-apply-csv-col');
      btnApply.onclick = () => {
        card.style.display = 'none';
        const result = window.ChatParsers.parseGenericCsv(content, select.value);
        lastParseResult = result;
        renderDashboard(result);
      };
    }

    function applyAdvancedOptions(result) {
      if (!result || !result.messages) return;

      const removeTimestamps = container.querySelector('#toggle-timestamps')?.checked;
      const removeSenders = container.querySelector('#toggle-senders')?.checked;
      const ignoreSystem = container.querySelector('#toggle-system')?.checked;
      const customRegexStr = container.querySelector('#input-regex')?.value?.trim();

      let customRegex = null;
      if (customRegexStr) {
        try { customRegex = new RegExp(customRegexStr, 'gi'); } catch (e) { console.warn('Invalid custom regex:', e); }
      }

      let filteredMsgs = [];
      for (let msg of result.messages) {
        if (ignoreSystem && window.ChatParsers.isSystemMessage(msg.cleanText)) {
          result.ignoredCount = (result.ignoredCount || 0) + 1;
          continue;
        }
        if (removeTimestamps) { msg.timestamp = null; }
        if (removeSenders) { msg.sender = null; }
        if (customRegex) { msg.cleanText = msg.cleanText.replace(customRegex, ''); }
        filteredMsgs.push(msg);
      }

      result.messages = filteredMsgs;
    }

    function parseContentByPlatform(content, ext, platform) {
      let p = platform;
      if (p === 'auto') {
        if (ext === 'json') {
          if (content.includes('chats') || content.includes('from_id')) p = 'telegram';
          else if (content.includes('sender_name') || content.includes('timestamp_ms')) p = 'facebook';
          else p = 'generic';
        } else if (ext === 'txt') {
          if (/^\d{1,2}[\/\.]\d{1,2}[\/\.]/m.test(content) || content.includes('end-to-end encrypted')) p = 'whatsapp';
          else p = 'generic';
        } else if (ext === 'csv') {
          if (content.toUpperCase().includes('CONVERSATION ID')) p = 'linkedin';
          else p = 'generic';
        } else {
          p = 'generic';
        }
      }

      let res;
      switch (p) {
        case 'whatsapp': res = window.ChatParsers.parseWhatsAppTxt(content); break;
        case 'telegram': res = ext === 'json' ? window.ChatParsers.parseTelegramJson(content) : window.ChatParsers.parseTelegramHtml(content); break;
        case 'facebook':
        case 'instagram': res = ext === 'json' ? window.ChatParsers.parseMetaJson(content, p) : window.ChatParsers.parseMetaHtml(content, p); break;
        case 'linkedin': res = window.ChatParsers.parseLinkedInCsv(content); break;
        default:
          if (ext === 'json') res = window.ChatParsers.parseGenericJson(content);
          else if (ext === 'csv') res = window.ChatParsers.parseGenericCsv(content);
          else if (ext === 'html' || ext === 'htm') res = window.ChatParsers.parseGenericHtml(content);
          else res = window.ChatParsers.parseGenericTxt(content);
          break;
      }

      applyAdvancedOptions(res);
      return res;
    }

    // ====================================================================
    // PROGRESS UI
    // ====================================================================

    function updateProgressStep(activeStep) {
      const steps = ['reading', 'detecting', 'extracting', 'cleaning', 'done'];
      const activeIdx = steps.indexOf(activeStep);
      steps.forEach((s, i) => {
        const el = container.querySelector(`#step-${s}`);
        if (el) {
          if (i < activeIdx) {
            el.className = 'badge badge--success';
          } else if (s === activeStep) {
            el.className = 'badge badge--encrypted';
            el.style.boxShadow = '0 0 8px rgba(187,209,0,0.3)';
          } else {
            el.className = 'badge badge--draft';
            el.style.boxShadow = '';
          }
        }
      });
    }

    // ====================================================================
    // RENDER RESULTS
    // ====================================================================

    function renderDashboard(result) {
      const dashboard = container.querySelector('#results-dashboard');
      if (!dashboard) return;
      dashboard.style.display = 'block';

      const msgs = result.messages;
      const total = msgs.length + (result.ignoredCount || 0);

      const statTotal = container.querySelector('#stat-total');
      const statExtracted = container.querySelector('#stat-extracted');
      const statIgnored = container.querySelector('#stat-ignored');
      if (statTotal) statTotal.textContent = total;
      if (statExtracted) statExtracted.textContent = msgs.length;
      if (statIgnored) statIgnored.textContent = result.ignoredCount || 0;

      renderMessagesList();
      dashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function renderMessagesList() {
      if (!lastParseResult) return;
      const listEl = container.querySelector('#message-list');
      if (!listEl) return;
      let msgs = lastParseResult.messages;

      // Date range filter
      if (dateFrom || dateTo) {
        const from = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
        const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;
        msgs = msgs.filter(m => {
          if (!m.timestamp) return false;
          const parsed = parseTimestamp(m.timestamp);
          if (!parsed) return false;
          if (from && parsed < from) return false;
          if (to && parsed > to) return false;
          return true;
        });
      }

      // Text search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        msgs = msgs.filter(m => m.cleanText.toLowerCase().includes(q));
      }

      if (msgs.length === 0) {
        listEl.innerHTML = `
          <div style="text-align: center; padding: 2rem; color: var(--color-on-surface-variant);">
            <span class="material-symbols-outlined" style="font-size: 36px; display: block; margin-bottom: 8px; opacity: 0.4;">search_off</span>
            ${t('noResults')}
          </div>
        `;
        return;
      }

      listEl.innerHTML = msgs.map((m, idx) => `
        <div class="msg-card">
          <div class="msg-num">#${idx + 1}</div>
          <div class="msg-content-wrapper">
            <div class="msg-text-preview" dir="auto">${escapeHtml(m.cleanText)}</div>
            <div class="msg-meta-bar">
              ${m.sender ? `<span class="badge badge--draft text-label-md">${escapeHtml(m.sender)}</span>` : ''}
              ${m.timestamp ? `<span class="badge badge--draft text-label-md">${escapeHtml(m.timestamp)}</span>` : ''}
            </div>
          </div>
          <div class="msg-actions">
            <button class="btn btn--secondary btn-view-details" data-id="${m.id}" style="padding: 4px 10px; font-size: 0.75rem;">${t('viewDetails')}</button>
            <button class="btn btn--secondary btn-copy-msg" data-text="${escapeHtml(m.cleanText)}" style="padding: 4px 10px; font-size: 0.75rem;">${t('copy')}</button>
          </div>
        </div>
      `).join('');

      // Wire up View Details buttons
      listEl.querySelectorAll('.btn-view-details').forEach(btn => {
        btn.addEventListener('click', () => openDetailsDrawer(btn.dataset.id));
      });

      // Wire up Copy buttons
      listEl.querySelectorAll('.btn-copy-msg').forEach(btn => {
        btn.addEventListener('click', async () => {
          await navigator.clipboard.writeText(btn.dataset.text);
          showToast(t('msgCopied'), 'success');
        });
      });
    }

    // ====================================================================
    // UTILITIES
    // ====================================================================

    function parseTimestamp(ts) {
      if (!ts) return null;
      ts = ts.trim();

      // ISO format: 2026-07-08T12:00:00 or 2026-07-08
      if (/^\d{4}-\d{2}-\d{2}/.test(ts)) {
        const d = new Date(ts);
        return isNaN(d) ? null : d;
      }

      // WhatsApp: 7/8/2026, 12:00 PM  or  07/08/2026, 12:00  or  7.8.2026, 12:00
      const waMatch = ts.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)/i);
      if (waMatch) {
        let [, d, m, y, time] = waMatch;
        if (y.length === 2) y = '20' + y;
        const dateStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')} ${time}`;
        const parsed = new Date(dateStr);
        return isNaN(parsed) ? null : parsed;
      }

      // DD/MM/YYYY HH:MM or MM/DD/YYYY HH:MM
      const slashMatch = ts.match(/^(\d{1,2})[\/](\d{1,2})[\/](\d{4})(?:[,\s]+(.+))?/);
      if (slashMatch) {
        let [, a, b, y, time] = slashMatch;
        let dateStr = `${y}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
        if (time) dateStr += ' ' + time.trim();
        let parsed = new Date(dateStr);
        if (!isNaN(parsed)) return parsed;

        dateStr = `${y}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`;
        if (time) dateStr += ' ' + time.trim();
        parsed = new Date(dateStr);
        return isNaN(parsed) ? null : parsed;
      }

      const fallback = new Date(ts);
      return isNaN(fallback) ? null : fallback;
    }

    function updateDateFilterStatus() {
      const statusEl = container.querySelector('#date-filter-status');
      if (!statusEl) return;
      if (!dateFrom && !dateTo) {
        statusEl.textContent = t('allDates');
        statusEl.className = 'badge badge--draft text-label-md';
      } else {
        const parts = [];
        if (dateFrom) parts.push(dateFrom);
        parts.push('→');
        if (dateTo) parts.push(dateTo);
        statusEl.textContent = parts.join(' ');
        statusEl.className = 'badge badge--encrypted text-label-md';
      }
    }

    function escapeHtml(str) {
      if (!str) return '';
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Expose toast for inline onclick handlers in modal
    window._scannerToast = showToast;

    const instance = {
      reRender: renderUI,
      applyLanguage: function (lang) {
        renderUI();
      }
    };

    activeInstances.push(instance);
    return instance;
  }

  window.ChatScanner = {
    initChatScanner,
    applyLanguage: function (lang) {
      activeInstances.forEach(inst => {
        if (inst && typeof inst.applyLanguage === 'function') {
          inst.applyLanguage(lang);
        }
      });
    }
  };
})();
