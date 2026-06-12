// ══════════════════════════════════════════════════════════════
// Shared UX — Interactive Onboarding Tour Script
// ══════════════════════════════════════════════════════════════

(function () {
  // ── Translations dictionary for Tour UI controls ──
  const TOUR_I18N = {
    en: {
      next: "Next",
      back: "Back",
      finish: "Finish",
      skip: "Skip",
      start: "Start Tour",
      close: "Close",
      welcomeTitle: "Interactive Guide",
      welcomeDesc: "Welcome! Click here to take a quick, step-by-step tour of the page and understand all inputs and security features.",
      welcomeHelpDesc: "Need help? Click this button at any time to take a tour of this page's features and settings.",
      genericTitle: "Documentation & Guide",
      genericDesc: "No interactive tour is configured for this page. Would you like to read the detailed documentation?",
      genericBtnDocs: "Read Docs",
      stepOf: "Step {current} of {total}",
    },
    ar: {
      next: "التالي",
      back: "السابق",
      finish: "إنهاء",
      skip: "تخطي",
      start: "ابدأ الجولة",
      close: "إغلاق",
      welcomeTitle: "الدليل التفاعلي",
      welcomeDesc: "مرحباً بك! انقر هنا لأخذ جولة تفاعلية سريعة ومبسطة في الصفحة لفهم جميع المدخلات وميزات الأمان.",
      welcomeHelpDesc: "هل تحتاج لمساعدة؟ انقر على هذا الزر في أي وقت لأخذ جولة في ميزات وإعدادات هذه الصفحة.",
      genericTitle: "دليل الاستخدام والتوثيق",
      genericDesc: "لا توجد جولة تفاعلية مخصصة لهذه الصفحة حالياً. هل تود الانتقال وقراءة التوثيق التفصيلي للمشروع؟",
      genericBtnDocs: "قراءة التوثيق",
      stepOf: "الخطوة {current} من {total}",
    },
    fr: {
      next: "Suivant",
      back: "Précédent",
      finish: "Terminer",
      skip: "Passer",
      start: "Démarrer la visite",
      close: "Fermer",
      welcomeTitle: "Guide Interactif",
      welcomeDesc: "Bienvenue ! Cliquez ici pour suivre un guide rapide étape par étape et comprendre les fonctionnalités.",
      welcomeHelpDesc: "Besoin d'aide ? Cliquez sur ce bouton pour lancer le guide interactif de cette page.",
      genericTitle: "Documentation & Guide",
      genericDesc: "Aucun guide interactif n'est disponible pour cette page. Souhaitez-vous lire la documentation ?",
      genericBtnDocs: "Lire la doc",
      stepOf: "Étape {current} sur {total}",
    },
    zh: {
      next: "下一步",
      back: "上一步",
      finish: "完成",
      skip: "跳过",
      start: "开始向导",
      close: "关闭",
      welcomeTitle: "交互式向导",
      welcomeDesc: "欢迎！点击此处开始快速逐步指南，以了解所有输入与安全功能。",
      welcomeHelpDesc: "需要帮助？随时点击此按钮以查看此页面的功能和设置向导。",
      genericTitle: "文档与指南",
      genericDesc: "此页面暂无交互式向导。您是否想要阅读详细文档？",
      genericBtnDocs: "阅读文档",
      stepOf: "第 {current} 步，共 {total} 步",
    },
    la: {
      next: "Sequens",
      back: "Retro",
      finish: "Finire",
      skip: "Præterire",
      start: "Incipere",
      close: "Claudere",
      welcomeTitle: "Dux Interactivus",
      welcomeDesc: "Salve! Preme hic ut ducem interactivum sequaris et discas omnes modos.",
      welcomeHelpDesc: "Auxilio eges? Preme hoc instrumentum ut spectes duces huius paginae.",
      genericTitle: "Documenta & Dux",
      genericDesc: "Dux interactivus non adest in hac pagina. Visne documenta legere?",
      genericBtnDocs: "Legere",
      stepOf: "Gradus {current} ex {total}",
    }
  };

  // ── Tour configurations for specific pages ──
  const TOUR_CONFIGS = {
    // ── Text Embed Tour ──
    embed: [
      {
        element: '#embed-tabs button[data-tab="text"]',
        placement: "bottom",
        title: {
          en: "Text Embed Tab",
          ar: "تبويب إخفاء النصوص"
        },
        description: {
          en: "This tab is dedicated to hiding your secret messages inside a cover text. It uses advanced steganography algorithms to make the hidden text completely invisible.",
          ar: "هذا التبويب مخصص لإخفاء رسائلك السرية داخل نص عادي (Cover Text). يتم استخدام خوارزميات إخفاء متقدمة لجعل النص المخفي غير مرئي تماماً."
        }
      },
      {
        element: '#guardPlatformWrapper',
        placement: "bottom",
        title: {
          en: "Target Social Platform",
          ar: "المنصة المستهدفة"
        },
        description: {
          en: "Select your target platform (e.g., WhatsApp, Telegram, X). Different platforms have different character limits and formatting rules. This guard ensures your message won't be broken when sent through them.",
          ar: "اختر المنصة التي تنوي إرسال النص إليها (مثل واتساب، تلغرام، إكس). المنصات المختلفة تفرض قيوداً وتنسيقات مختلفة. هذا الخيار يضمن عدم تلف رسالتك أثناء الإرسال."
        }
      },
      {
        element: '#guardPlacementWrapper',
        placement: "bottom",
        title: {
          en: "Placement / Location",
          ar: "موقع الإخفاء"
        },
        description: {
          en: "Choose where the secret message characters should be embedded within the cover text (e.g., at the end, in specific positions, or distributed). This adds another layer of control over your steganographic carrier.",
          ar: "اختر أين سيتم دمج رموز الرسالة السرية داخل النص الحامل (مثل: في النهاية، في مواقع محددة، أو موزعة). هذا يمنحك تحكماً إضافياً في آلية الإخفاء."
        }
      },
      {
        element: '#embedCover',
        placement: "top",
        title: {
          en: "Cover Text Input",
          ar: "النص الحامل (Cover Text)"
        },
        description: {
          en: "Enter the public, innocent-looking cover text. This text is visible to anyone and acts as the carrier. The longer and more natural it is, the more capacity you have to hide messages.",
          ar: "أدخل النص الظاهري العام الذي سيحمل الرسالة السرية. هذا النص يظهر بشكل طبيعي للجميع. كلما كان النص أطول وأكثر طبيعية، زادت القدرة الاستيعابية لإخفاء الرسائل."
        }
      },
      {
        element: '#embedSecretMessage',
        placement: "top",
        title: {
          en: "Secret Message Payload",
          ar: "الرسالة السرية"
        },
        description: {
          en: "Type or paste the private message you wish to hide. It will be compressed and embedded invisibly inside the cover text.",
          ar: "اكتب أو ألصق الرسالة الخاصة التي ترغب في إخفائها. سيتم تشفيرها وضغطها ثم دمجها بشكل غير مرئي تماماً داخل النص الحامل."
        }
      },
      {
        element: '#embedStegoKey',
        placement: "bottom",
        title: {
          en: "Pre-Shared Key (Stego-Key)",
          ar: "المفتاح المشترك مسبقاً"
        },
        description: {
          en: "A password required to embed and extract the message. Only someone who knows this key can recover the hidden secret message, preventing unauthorized decryption.",
          ar: "كلمة مرور مطلوبة لعملية الإخفاء والاستخراج. لا يمكن لأي شخص استرجاع الرسالة السرية المخفية إلا إذا كان يعرف هذا المفتاح، مما يمنع فك التشفير غير المصرح به."
        }
      },
      {
        element: '#embedEncryptionKey',
        placement: "bottom",
        title: {
          en: "Encryption Key (AES-CTR)",
          ar: "مفتاح التشفير"
        },
        description: {
          en: "An optional key that adds cryptographic security. If provided, your secret message is encrypted using AES-CTR before it is embedded, providing double security (Steganography + Cryptography).",
          ar: "مفتاح اختياري يضيف طبقة أمان إضافية. عند تفعيله، سيتم تشفير رسالتك السرية باستخدام خوارزمية AES-CTR قبل إخفائها، مما يوفر حماية مزدوجة (تشفير + إخفاء)."
        }
      },
      {
        element: '#embedHint',
        placement: "bottom",
        title: {
          en: "Password Hint",
          ar: "تلميح كلمة المرور"
        },
        description: {
          en: "An optional text hint that will be visible to the receiver. It helps them remember the Pre-Shared Key without exposing the key itself.",
          ar: "تلميح نصي اختياري يظهر للمستلم لمساعدته في تذكر المفتاح المشترك مسبقاً دون الكشف عن المفتاح نفسه."
        }
      },
      {
        element: '#embedFakeCover',
        placement: "top",
        title: {
          en: "Fake Cover (Plurality Routing)",
          ar: "الغطاء الوهمي (Fake Cover)"
        },
        description: {
          en: "An advanced security feature! If you hide data, suspicious observers might notice hidden characters. With Fake Cover, the hidden characters are moved to a secondary, completely different message. This is a pioneering research feature of this system.",
          ar: "ميزة أمان متقدمة وحصرية! في حال شك أحد المراقبين بوجود أحرف مخفية، تتيح لك هذه الميزة نقل الحروف المخفية إلى رسالة ثانوية وهمية تماماً بدلاً من النص الأساسي. هذه ميزة بحثية رائدة ينفرد بها هذا النظام."
        }
      }
    ],

    // ── Image Embed Tour ──
    embedImage: [
      {
        element: '#embed-tabs button[data-tab="image"]',
        placement: "bottom",
        title: {
          en: "Image Embed Tab",
          ar: "تبويب إخفاء الصور"
        },
        description: {
          en: "This tab is dedicated to hiding entire secret images inside a public cover text. Steganography is combined with private metadata stripping.",
          ar: "هذا التبويب مخصص لإخفاء صورة كاملة بشكل سرّي وغير مرئي داخل نص عادي. يتم دمج تقنية الإخفاء مع تنظيف البيانات الوصفية لحمايتك."
        }
      },
      {
        element: '#imgGuardPlatformWrapper',
        placement: "bottom",
        title: {
          en: "Target Social Platform",
          ar: "المنصة المستهدفة"
        },
        description: {
          en: "Select where you want to send the text containing the hidden image. This ensures network formatting won't corrupt the hidden data.",
          ar: "اختر منصة التواصل الاجتماعي التي تنوي إرسال النص إليها. هذا يضمن عدم تلف محتوى الصورة بسبب معالجة المنصات للنصوص."
        }
      },
      {
        element: '#imgGuardPlacementWrapper',
        placement: "bottom",
        title: {
          en: "Placement / Location",
          ar: "موقع الإخفاء"
        },
        description: {
          en: "Choose where the hidden image bytes should be placed inside the carrier cover text.",
          ar: "اختر أين سيتم دمج رموز الصورة السرية داخل النص الحامل."
        }
      },
      {
        element: '#imgEmbedCover',
        placement: "top",
        title: {
          en: "Cover Text Input",
          ar: "النص الحامل (Cover Text)"
        },
        description: {
          en: "Enter the public cover text. Note that hiding images requires larger capacity, so you will need a relatively longer cover text.",
          ar: "أدخل النص الظاهري العام الذي سيحمل الصورة. نظراً لأن الصور أكبر حجماً، ستحتاج إلى نص أطول نسبياً لتتم عملية الدمج بنجاح."
        }
      },
      {
        element: '#imgEmbedUploadArea',
        placement: "top",
        title: {
          en: "Secret Image Payload",
          ar: "صورة الحمولة السرية"
        },
        description: {
          en: "Drag and drop or select the private image file you want to hide inside the cover text. It will be compressed and encrypted.",
          ar: "اسحب وألصق أو اختر ملف الصورة الخاصة التي ترغب في إخفائها داخل النص. سيتم ضغطها وتشفيرها تلقائياً."
        }
      },
      {
        element: '#imgEmbedKey',
        placement: "bottom",
        title: {
          en: "AES-CTR Decryption Key",
          ar: "مفتاح تشفير AES-CTR"
        },
        description: {
          en: "A required key used to encrypt the payload image. Only someone with this key can recover and view the hidden image.",
          ar: "مفتاح تشفير إلزامي لحماية الصورة. لا يمكن للمستقبل فك تشفير الصورة المخفية واسترجاعها إلا باستخدام هذا المفتاح."
        }
      },
      {
        element: '#btnImgHideData',
        placement: "top",
        title: {
          en: "Embed Image Button",
          ar: "زر إخفاء الصورة"
        },
        description: {
          en: "Click this button to strip metadata, compress, encrypt, and embed the secret image inside the cover text.",
          ar: "انقر على هذا الزر لتنظيف البيانات الوصفية للصورة، وتشفيرها، ودمجها بشكل غير مرئي داخل النص."
        }
      }
    ],

    // ── Standard Extraction Tour ──
    extract: [
      {
        element: '#extract-tabs button[data-tab="standard"]',
        placement: "bottom",
        title: {
          en: "Standard Extraction Tab",
          ar: "تبويب الاستخراج القياسي"
        },
        description: {
          en: "Use this tab to extract hidden messages from text containing hidden steganographic data. You will need the matching Pre-Shared Key.",
          ar: "استخدم هذا التبويب لاستخراج الرسائل السرية من النصوص المخفية الحاملة للبيانات. ستحتاج إلى إدخال المفتاح المشترك مسبقاً المتطابق."
        }
      },
      {
        element: '#extractCover',
        placement: "top",
        title: {
          en: "Stego Text Input",
          ar: "نص الإخفاء المستلم"
        },
        description: {
          en: "Paste the stego-text container (with the hidden message) into this area to begin the extraction process.",
          ar: "قم بلصق النص المستلم الذي يحمل الرسالة السرية المخفية داخل هذه المساحة لبدء عملية التفكيك والاستخراج."
        }
      },
      {
        element: '#extractStegoKey',
        placement: "bottom",
        title: {
          en: "Pre-Shared Key",
          ar: "المفتاح المشترك مسبقاً"
        },
        description: {
          en: "Enter the Pre-Shared Key (Stego-Key) that was used during the embedding phase. Without it, the hidden message cannot be isolated.",
          ar: "أدخل كلمة المرور (المفتاح المشترك مسبقاً) التي تم استخدامها أثناء عملية الإخفاء. بدون هذا المفتاح لن تتمكن من استخلاص الرسالة."
        }
      },
      {
        element: '#extractEncryptionKey',
        placement: "bottom",
        title: {
          en: "AES Decryption Key",
          ar: "مفتاح فك التشفير"
        },
        description: {
          en: "If the message was encrypted using AES-CTR before embedding, enter the decryption key here to automatically decrypt the payload.",
          ar: "إذا تم تشفير الرسالة السرية باستخدام خوارزمية AES أثناء الإخفاء، أدخل مفتاح فك التشفير هنا لفك التشفير تلقائياً."
        }
      },
      {
        element: '#extract-btn',
        placement: "top",
        title: {
          en: "Extract Button",
          ar: "زر الاستخراج"
        },
        description: {
          en: "Click this button to execute the extraction algorithm. If the key matches, the hidden message will be revealed in a result panel.",
          ar: "انقر على هذا الزر لبدء الفك واسترجاع المحتوى السري. في حال مطابقة المفتاح، ستظهر رسالتك السرية أسفل الزر مباشرة."
        }
      }
    ],

    // ── Chat Scanner Tour ──
    extractScanner: [
      {
        element: '#extract-tabs button[data-tab="scanner"]',
        placement: "bottom",
        title: {
          en: "Chat Scanner Tab",
          ar: "تبويب الفاحص الذكي"
        },
        description: {
          en: "This tab is dedicated to scanning entire chat logs or history. If you have a conversation but aren't sure which specific message contains the hidden text, you can copy the whole chat history (even 10, 20, or 40 messages) and paste it here to scan it all at once.",
          ar: "هذا التبويب مخصص لفحص سجلات المحادثات والدردشة بالكامل. إذا كان لديك محادثة مع شخص ما ولست متأكداً في أي رسالة تم إخفاء النص، يمكنك نسخ تاريخ المحادثة بالكامل (حتى 10 أو 20 أو 40 رسالة) ولصقها هنا لفحصها دفعة واحدة."
        }
      },
      {
        element: '#scannerChatInput',
        placement: "top",
        title: {
          en: "Conversation Input",
          ar: "صندوق المحادثات والدردشة"
        },
        description: {
          en: "Paste the copied conversation history here. You can copy a large number of messages from your chat application (WhatsApp, Telegram, etc.). The scanner will automatically process the entire text line-by-line, trying to extract hidden payloads from each message.",
          ar: "ألصق سجل المحادثات المنسوخ هنا. يمكنك نسخ عدد كبير من الرسائل من تطبيق الدردشة الخاص بك (مثل واتساب أو تلغرام). سيقوم الفاحص بتحليل النص بالكامل تلقائياً سطراً بسطر لاستخراج أي حمولة مخفية من كل رسالة."
        }
      },
      {
        element: '#scannerPassword',
        placement: "bottom",
        title: {
          en: "Stego Password Keys",
          ar: "مفاتيح الفك والتحقق"
        },
        description: {
          en: "Enter the stego passwords used. You can add multiple keys to scan the chat against different passwords simultaneously.",
          ar: "أدخل مفاتيح كلمة المرور المستخدمة. يمكنك إضافة أكثر من مفتاح لفحص المحادثات بكلمات مرور متعددة في آن واحد."
        }
      },
      {
        element: '#scannerEncryptionKey',
        placement: "bottom",
        title: {
          en: "AES Decryption Keys",
          ar: "مفاتيح فك تشفير AES"
        },
        description: {
          en: "Add the AES decryption keys if the payloads were cryptographically secured.",
          ar: "أدخل مفاتيح فك التشفير الـ AES الاختيارية في حال كان محتوى الرسائل مشفراً."
        }
      },
      {
        element: '#platformSelectWrapper',
        placement: "bottom",
        title: {
          en: "Target Platform Filter",
          ar: "فلترة المنصات المستهدفة"
        },
        description: {
          en: "Choose the target platform (e.g., WhatsApp, Telegram). When you copy messages from chat apps, they often append platform-specific metadata (timestamps, sender names, system alerts) which acts as noise. By specifying the platform, the scanner filters out this garbage and cleans the text to extract the hidden message accurately.",
          ar: "حدد المنصة المستهدفة (مثل واتساب أو تلغرام). عند نسخ الرسائل من تطبيق دردشة، فإنه قد يتم إرفاق نصوص غير متعلقة بالرسالة (مثل التوقيت، اسم المرسل، أو التنبيهات الخاصة بالتطبيق). بتحديد المنصة، سيقوم البرنامج بتصفية هذه الشوائب والملحقات غير المرغوبة للوصول إلى النص المخفي بدقة."
        }
      },
      {
        element: '#btn-scanner-one-click',
        placement: "top",
        title: {
          en: "Start Scan / Verify",
          ar: "بدء الفحص والتحقق"
        },
        description: {
          en: "Click this button to start scanning. The tool will apply your keys (Pre-Shared Stego Key and AES-CTR key) to all the messages you pasted, clean up the platform noise, and display any successfully extracted hidden payloads in the results table below.",
          ar: "انقر على هذا الزر لبدء الفحص. سيقوم البرنامج بتطبيق المفاتيح المدخلة (المفتاح المشترك ومفتاح التشفير AES-CTR) على كافة الرسائل المنسوخة، وتصفية شوائب المنصات، ثم عرض الرسائل المستخرجة بنجاح في جدول النتائج بالأسفل."
        }
      }
    ],

    // ── Hints Log Tour ──
    extractHints: [
      {
        element: '#extract-tabs button[data-tab="hints"]',
        placement: "bottom",
        title: {
          en: "Stego Hints Log Tab",
          ar: "تبويب سجل التلميحات"
        },
        description: {
          en: "Here you can track the contextual steganography hints you have sent and received.",
          ar: "هنا يمكنك تتبع ومراجعة تلميحات الإخفاء السياقية التي قمت بإرسالها أو استلامها للرجوع إليها لاحقاً."
        }
      },
      {
        element: '#hints-panel',
        placement: "top",
        title: {
          en: "Hints History Log",
          ar: "سجل تلميحات كلمات المرور"
        },
        description: {
          en: "Shows the latest active hint, plus lists of received and sent hints to help you easily recall Pre-Shared Keys.",
          ar: "يعرض التلميح النشط الأخير، بالإضافة إلى قوائم بالتلميحات الواردة والصادرة لمساعدتك في استرجاع مفاتيحك المشتركة بسهولة."
        }
      }
    ],

    // ── Image Extract Tour ──
    extractImage: [
      {
        element: '#extract-tabs button[data-tab="image"]',
        placement: "bottom",
        title: {
          en: "Image Extraction Tab",
          ar: "تبويب استخراج الصور"
        },
        description: {
          en: "This tab is dedicated to recovering hidden secret images from stego-text carriers.",
          ar: "هذا التبويب مخصص لاستخراج واسترجاع الصور السرية المخفية داخل النصوص المستلمة."
        }
      },
      {
        element: '#imgExtractStego',
        placement: "top",
        title: {
          en: "Stego-Text Input",
          ar: "نص الإخفاء المستلم"
        },
        description: {
          en: "Paste the stego-text containing the hidden image into this input area.",
          ar: "قم بلصق نص الإخفاء المستلم الذي يحمل الصورة السرية المدمجة بداخله."
        }
      },
      {
        element: '#imgExtractKey',
        placement: "bottom",
        title: {
          en: "AES-CTR Decryption Key",
          ar: "مفتاح فك تشفير AES-CTR"
        },
        description: {
          en: "Enter the required key used during the image embedding phase to decrypt and restore the picture.",
          ar: "أدخل مفتاح التشفير الإلزامي الذي تم استخدامه أثناء عملية إخفاء الصورة لفك التشفير واستعادتها."
        }
      },
      {
        element: '#img-extract-btn',
        placement: "top",
        title: {
          en: "Extract & Decrypt Button",
          ar: "زر استخراج وفك التشفير"
        },
        description: {
          en: "Click this button to extract the bytes, decrypt, and display the hidden image in the results panel.",
          ar: "انقر على هذا الزر لاستخلاص البيانات، وفك تشفير الصورة، وعرضها في لوحة النتائج بالأسفل."
        }
      }
    ]
  };

  // ── Global Tour State variables ──
  let activeTour = null;
  let currentStepIndex = -1;
  let isOnboardingWelcome = false;
  let isGenericRedirect = false;

  // DOM Elements cache
  let backdropEl = null;
  let highlightBoxEl = null;
  let tooltipEl = null;

  // Get current active language ('en', 'ar', etc.) with English fallback
  function getLang() {
    const lang = localStorage.getItem('stegoLang') || 'en';
    return TOUR_I18N[lang] ? lang : 'en';
  }

  // ── Dynamic Tooltip Positioning and Viewport Boundary Clamping ──
  function positionTooltip(targetRect, placement) {
    if (!tooltipEl) return;

    const tooltipWidth = tooltipEl.offsetWidth;
    const tooltipHeight = tooltipEl.offsetHeight;
    const padding = 12; // distance from highlight box

    let top = 0;
    let left = 0;

    // Check bounds
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    switch (placement) {
      case "top":
        top = targetRect.top - tooltipHeight - padding;
        left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
        break;
      case "bottom":
        top = targetRect.bottom + padding;
        left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
        break;
      case "left":
        top = targetRect.top + (targetRect.height / 2) - (tooltipHeight / 2);
        left = targetRect.left - tooltipWidth - padding;
        break;
      case "right":
        top = targetRect.top + (targetRect.height / 2) - (tooltipHeight / 2);
        left = targetRect.right + padding;
        break;
      default: // smart fallback
        top = targetRect.bottom + padding;
        left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
        break;
    }

    // Clamp Left coordinates to viewport limits
    if (left < 16) {
      left = 16;
    } else if (left + tooltipWidth > viewportWidth - 16) {
      left = viewportWidth - tooltipWidth - 16;
    }

    // Clamp Top coordinates to viewport limits
    if (top < 16) {
      // If top goes off-screen, flip to bottom
      if (placement === "top") {
        top = targetRect.bottom + padding;
        tooltipEl.setAttribute("data-placement", "bottom");
      } else {
        top = 16;
      }
    } else if (top + tooltipHeight > viewportHeight - 16) {
      // If bottom goes off-screen, flip to top
      if (placement === "bottom") {
        top = targetRect.top - tooltipHeight - padding;
        tooltipEl.setAttribute("data-placement", "top");
      } else {
        top = viewportHeight - tooltipHeight - 16;
      }
    }

    tooltipEl.style.top = `${top}px`;
    tooltipEl.style.left = `${left}px`;
  }

  // ── Calculate CSS clip-path to overlay a mask and a cutout hole ──
  function updateSpotlight(targetRect) {
    if (!backdropEl || !highlightBoxEl) return;

    const padding = 6; // Padding around the target element
    const top = targetRect.top - padding;
    const left = targetRect.left - padding;
    const right = targetRect.right + padding;
    const bottom = targetRect.bottom + padding;
    const width = right - left;
    const height = bottom - top;

    // Draw full-screen mask with cutout polygon
    const clipPathValue = `polygon(
      0px 0px, 
      100vw 0px, 
      100vw 100vh, 
      0px 100vh, 
      0px 0px, 
      ${left}px ${top}px, 
      ${left}px ${bottom}px, 
      ${right}px ${bottom}px, 
      ${right}px ${top}px, 
      ${left}px ${top}px
    )`;

    backdropEl.style.clipPath = clipPathValue;
    backdropEl.style.webkitClipPath = clipPathValue;

    // Position the highlight boundary box directly over cutout
    highlightBoxEl.style.top = `${top}px`;
    highlightBoxEl.style.left = `${left}px`;
    highlightBoxEl.style.width = `${width}px`;
    highlightBoxEl.style.height = `${height}px`;
  }

  // ── Re-render / update highlight and tooltip on layout change ──
  function handleLayoutUpdate() {
    if (currentStepIndex === -1 && !isOnboardingWelcome && !isGenericRedirect) return;

    let targetEl = null;
    let placement = "bottom";

    if (isOnboardingWelcome || isGenericRedirect) {
      targetEl = document.querySelector(".floating-guide-btn");
      placement = "left";
    } else if (activeTour && activeTour[currentStepIndex]) {
      targetEl = document.querySelector(activeTour[currentStepIndex].element);
      placement = activeTour[currentStepIndex].placement || "bottom";
    }

    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      updateSpotlight(rect);
      positionTooltip(rect, placement);
    }
  }

  // ── Create tour DOM elements (Backdrop, HighlightBox, Tooltip) if missing ──
  function ensureTourDOM() {
    if (!backdropEl) {
      backdropEl = document.createElement("div");
      backdropEl.className = "stego-tour-backdrop";
      document.body.appendChild(backdropEl);

      // Block interaction with elements behind backdrop except the spotlight cutout
      backdropEl.addEventListener("click", function (e) {
        e.stopPropagation();
        e.preventDefault();
      });
    }

    if (!highlightBoxEl) {
      highlightBoxEl = document.createElement("div");
      highlightBoxEl.className = "stego-tour-highlight-box";
      document.body.appendChild(highlightBoxEl);
    }

    if (!tooltipEl) {
      tooltipEl = document.createElement("div");
      tooltipEl.className = "stego-tour-tooltip";

      // Inner tooltip structures
      tooltipEl.innerHTML = `
        <div class="stego-tour-tooltip__header">
          <h4 class="stego-tour-tooltip__title"></h4>
          <span class="stego-tour-tooltip__step-counter"></span>
        </div>
        <div class="stego-tour-tooltip__body"></div>
        <div class="stego-tour-tooltip__footer">
          <button class="stego-tour-tooltip__btn stego-tour-tooltip__btn--text" id="stego-tour-btn-skip"></button>
          <div style="display:flex; gap:8px;">
            <button class="stego-tour-tooltip__btn stego-tour-tooltip__btn--secondary" id="stego-tour-btn-back"></button>
            <button class="stego-tour-tooltip__btn stego-tour-tooltip__btn--primary" id="stego-tour-btn-next"></button>
          </div>
        </div>
        <div class="stego-tour-tooltip__arrow"></div>
      `;
      document.body.appendChild(tooltipEl);

      // Bind button events
      document.getElementById("stego-tour-btn-skip").addEventListener("click", exitTour);
      document.getElementById("stego-tour-btn-back").addEventListener("click", prevStep);
      document.getElementById("stego-tour-btn-next").addEventListener("click", handleNextClick);
    }
  }

  // ── Unified Next/Proceed Button Click Handler ──
  function handleNextClick() {
    if (isOnboardingWelcome) {
      const pathname = window.location.pathname.toLowerCase();
      const pageName = pathname.split('/').pop().replace('.html', '');
      const hasActiveTour = (pageName === "embed" || pageName === "extract");
      if (hasActiveTour) {
        startTour();
      } else {
        exitTour();
      }
    } else if (isGenericRedirect) {
      const prefix = (typeof getPathPrefix === "function") ? getPathPrefix() : "";
      window.location.href = `${prefix}documentation.html`;
      exitTour();
    } else {
      nextStep();
    }
  }

  // ── Main routing to showcase a specific step index ──
  function renderStep(index) {
    ensureTourDOM();
    isOnboardingWelcome = false;
    isGenericRedirect = false;

    if (!activeTour || index < 0 || index >= activeTour.length) {
      exitTour();
      return;
    }

    // 1. Smooth Fade-Out of Tooltip Content
    if (tooltipEl) {
      tooltipEl.classList.remove("active");
    }

    currentStepIndex = index;
    const step = activeTour[currentStepIndex];
    const targetEl = document.querySelector(step.element);

    // If target element is not on page/hidden, skip automatically
    if (!targetEl || targetEl.offsetParent === null) {
      if (index > currentStepIndex) {
        nextStep();
      } else {
        prevStep();
      }
      return;
    }

    // 2. Automatically expand details accordions if the element is inside one
    const detailsParent = targetEl.closest('details');
    if (detailsParent && !detailsParent.open) {
      detailsParent.open = true;
    }

    // Scroll element smoothly into view
    targetEl.scrollIntoView({ behavior: "smooth", block: "center" });

    // 3. Wait for scrolling and fade-out to complete (300ms transition buffer)
    setTimeout(() => {
      const rect = targetEl.getBoundingClientRect();
      const lang = getLang();

      // Show backdrop and highlight box
      backdropEl.classList.add("active");
      highlightBoxEl.classList.remove("pulse");
      highlightBoxEl.classList.add("active");

      // Update spotlight position and coordinates
      updateSpotlight(rect);

      // Populate tooltip contents
      const titleEl = tooltipEl.querySelector(".stego-tour-tooltip__title");
      const bodyEl = tooltipEl.querySelector(".stego-tour-tooltip__body");
      const stepCounterEl = tooltipEl.querySelector(".stego-tour-tooltip__step-counter");

      const btnSkip = document.getElementById("stego-tour-btn-skip");
      const btnBack = document.getElementById("stego-tour-btn-back");
      const btnNext = document.getElementById("stego-tour-btn-next");

      // Set translations
      titleEl.textContent = step.title[lang] || step.title["en"];
      bodyEl.textContent = step.description[lang] || step.description["en"];
      
      const totalSteps = activeTour.length;
      stepCounterEl.textContent = TOUR_I18N[lang].stepOf
        .replace("{current}", index + 1)
        .replace("{total}", totalSteps);

      // Manage button displays based on step position
      btnSkip.textContent = TOUR_I18N[lang].skip;
      
      if (index === 0) {
        btnBack.style.display = "none";
      } else {
        btnBack.style.display = "inline-flex";
        btnBack.textContent = TOUR_I18N[lang].back;
      }

      if (index === totalSteps - 1) {
        btnNext.textContent = TOUR_I18N[lang].finish;
      } else {
        btnNext.textContent = TOUR_I18N[lang].next;
      }

      // Position tooltip relative to target rect
      tooltipEl.setAttribute("data-placement", step.placement || "bottom");
      positionTooltip(rect, step.placement || "bottom");

      // 4. Smooth Fade-In of Tooltip Content
      tooltipEl.classList.add("active");
    }, 350);
  }

  // ── Progression triggers ──
  function nextStep() {
    if (currentStepIndex < activeTour.length - 1) {
      renderStep(currentStepIndex + 1);
    } else {
      exitTour();
    }
  }

  // ── Regression trigger ──
  function prevStep() {
    if (currentStepIndex > 0) {
      renderStep(currentStepIndex - 1);
    }
  }

  // ── Terminate tour session ──
  function exitTour() {
    currentStepIndex = -1;
    isOnboardingWelcome = false;
    isGenericRedirect = false;

    if (backdropEl) backdropEl.classList.remove("active");
    if (highlightBoxEl) highlightBoxEl.classList.remove("active");
    if (tooltipEl) tooltipEl.classList.remove("active");

    // Save flag that onboarding sequence has completed
    localStorage.setItem("stego_has_seen_onboarding", "true");
  }

  function startTour() {
    const pathname = window.location.pathname.toLowerCase();
    const pageName = pathname.split('/').pop().replace('.html', '');
    let tourKey = null;

    if (pageName === "embed") {
      // Determine which tab is active (Text Embed or Image Embed)
      const activeTab = document.querySelector('#embed-tabs button.tab-btn.active');
      const tabValue = activeTab ? activeTab.getAttribute('data-tab') : 'text';
      if (tabValue === 'image') {
        tourKey = "embedImage";
      } else {
        tourKey = "embed";
      }
    } else if (pageName === "extract") {
      // Determine which tab is active on the extraction page
      const activeTab = document.querySelector('#extract-tabs button.tab-btn.active');
      const tabValue = activeTab ? activeTab.getAttribute('data-tab') : 'standard';
      if (tabValue === 'scanner') {
        tourKey = "extractScanner";
      } else if (tabValue === 'hints') {
        tourKey = "extractHints";
      } else if (tabValue === 'image') {
        tourKey = "extractImage";
      } else {
        tourKey = "extract";
      }
    }

    const lang = getLang();

    if (tourKey && TOUR_CONFIGS[tourKey]) {
      activeTour = TOUR_CONFIGS[tourKey];
      renderStep(0);
    } else {
      // Generic docs popup for pages without a specific step tour (e.g. documentation, team pages)
      ensureTourDOM();
      isOnboardingWelcome = false;
      isGenericRedirect = true;

      const titleEl = tooltipEl.querySelector(".stego-tour-tooltip__title");
      const bodyEl = tooltipEl.querySelector(".stego-tour-tooltip__body");
      const stepCounterEl = tooltipEl.querySelector(".stego-tour-tooltip__step-counter");

      const btnSkip = document.getElementById("stego-tour-btn-skip");
      const btnBack = document.getElementById("stego-tour-btn-back");
      const btnNext = document.getElementById("stego-tour-btn-next");

      titleEl.textContent = TOUR_I18N[lang].genericTitle;
      bodyEl.textContent = TOUR_I18N[lang].genericDesc;
      stepCounterEl.textContent = "";

      btnSkip.textContent = TOUR_I18N[lang].close;
      btnBack.style.display = "none";
      btnNext.textContent = TOUR_I18N[lang].genericBtnDocs;

      // Target the floating button itself for reference anchor
      const helpBtn = document.querySelector(".floating-guide-btn");
      if (helpBtn) {
        const rect = helpBtn.getBoundingClientRect();
        backdropEl.classList.add("active");
        highlightBoxEl.classList.remove("pulse");
        highlightBoxEl.classList.add("active");
        updateSpotlight(rect);
        
        tooltipEl.setAttribute("data-placement", "left");
        tooltipEl.classList.add("active");
        positionTooltip(rect, "left");
      }
    }
  }

  // ── Show welcoming prompt on the help button for new users ──
  function showOnboardingWelcome() {
    const hasSeen = localStorage.getItem("stego_has_seen_onboarding");
    if (hasSeen === "true") return;

    const helpBtn = document.querySelector(".floating-guide-btn");
    if (!helpBtn) return;

    ensureTourDOM();
    isOnboardingWelcome = true;
    isGenericRedirect = false;
    const lang = getLang();

    const rect = helpBtn.getBoundingClientRect();

    backdropEl.classList.add("active");
    highlightBoxEl.classList.add("active");
    highlightBoxEl.classList.add("pulse");
    updateSpotlight(rect);

    const titleEl = tooltipEl.querySelector(".stego-tour-tooltip__title");
    const bodyEl = tooltipEl.querySelector(".stego-tour-tooltip__body");
    const stepCounterEl = tooltipEl.querySelector(".stego-tour-tooltip__step-counter");

    const btnSkip = document.getElementById("stego-tour-btn-skip");
    const btnBack = document.getElementById("stego-tour-btn-back");
    const btnNext = document.getElementById("stego-tour-btn-next");

    titleEl.textContent = TOUR_I18N[lang].welcomeTitle;
    
    // Choose description based on whether there's a tour for this page
    const pathname = window.location.pathname.toLowerCase();
    const pageName = pathname.split('/').pop().replace('.html', '');
    const hasActiveTour = (pageName === "embed" || pageName === "extract");
    bodyEl.textContent = hasActiveTour ? TOUR_I18N[lang].welcomeDesc : TOUR_I18N[lang].welcomeHelpDesc;
    
    stepCounterEl.textContent = "";

    btnSkip.textContent = TOUR_I18N[lang].skip;
    btnBack.style.display = "none";
    btnNext.textContent = hasActiveTour ? TOUR_I18N[lang].start : TOUR_I18N[lang].close;

    tooltipEl.setAttribute("data-placement", "left");
    tooltipEl.classList.add("active");
    positionTooltip(rect, "left");
  }

  // ── Re-render tooltip on language change dynamically ──
  function reRenderCurrentState() {
    if (isOnboardingWelcome) {
      showOnboardingWelcome();
    } else if (isGenericRedirect) {
      startTour();
    } else if (currentStepIndex !== -1 && activeTour) {
      // Re-trigger the render step which fetches matching language strings
      renderStep(currentStepIndex);
    }
  }

  // ── Initialization Hook ──
  function initTour() {
    const helpBtn = document.querySelector(".floating-guide-btn");
    if (helpBtn) {
      // Direct click on the guide button always triggers tour/docs popup
      helpBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        startTour();
      });

      // Listen to tab clicks to dynamically adapt the site tour if it's active
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener("click", () => {
          if (currentStepIndex !== -1 && activeTour) {
            // Wait for tab active class switching to settle
            setTimeout(() => {
              startTour();
            }, 100);
          }
        });
      });

      // Hook up window change observers to keep clip-path matching elements
      window.addEventListener("resize", handleLayoutUpdate);
      window.addEventListener("scroll", handleLayoutUpdate, { passive: true });

      // Create a MutationObserver on html root to detect dynamic lang swaps
      const langObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === "attributes" && mutation.attributeName === "lang") {
            reRenderCurrentState();
          }
        });
      });
      langObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["lang"]
      });

      // Automatically check for new user onboarding callout after 2.5s
      setTimeout(showOnboardingWelcome, 2500);
    }
  }

  // Expose triggers to window global space
  window.startSiteTour = startTour;

  // Run on DOM load completion
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTour);
  } else {
    initTour();
  }
})();
