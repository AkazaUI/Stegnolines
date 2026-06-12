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
          ar: "تبويب إخفاء النصوص",
          zh: "文本嵌入标签页",
          fr: "Onglet d'Intégration de Texte",
          la: "Tabula Textus Occultandi"
        },
        description: {
          en: "This tab is dedicated to hiding your secret messages inside a cover text. It uses advanced steganography algorithms to make the hidden text completely invisible.",
          ar: "هذا التبويب مخصص لإخفاء رسائلك السرية داخل نص عادي (Cover Text). يتم استخدام خوارزميات إخفاء متقدمة لجعل النص المخفي غير مرئي تماماً.",
          zh: "此标签页专用于将您的秘密消息隐藏在封面文本中。它使用先进 of the 隐写算法，使隐藏的文本完全不可见。",
          fr: "Cet onglet est dédié à la dissimulation de vos messages secrets dans un texte de couverture. Il utilise des algorithmes de stéganographie avancés pour rendre le texte caché complètement invisible.",
          la: "Haec tabula destinata est ad nuntios secretos intra textum portantis occultandos. Algorithmis steganographicis provectis utitur ut textus occultus omnino invisibilis fiat."
        }
      },
      {
        element: '#guardPlatformWrapper',
        placement: "bottom",
        title: {
          en: "Target Social Platform",
          ar: "المنصة المستهدفة",
          zh: "目标社交平台",
          fr: "Plateforme Sociale Cible",
          la: "Suggestus Socialis Destinatus"
        },
        description: {
          en: "Select your target platform (e.g., WhatsApp, Telegram, X). Different platforms have different character limits and formatting rules. This guard ensures your message won't be broken when sent through them.",
          ar: "اختر المنصة التي تنوي إرسال النص إليها (مثل واتساب، تلغرام، إكس). المنصات المختلفة تفرض قيوداً وتنسيقات مختلفة. هذا الخيار يضمن عدم تلف رسالتك أثناء الإرسال.",
          zh: "选择您的目标平台（例如 WhatsApp、Telegram、X）。不同的平台有不同的字符限制和格式规则。此保护措施可确保您的消息在通过它们发送时不会损坏。",
          fr: "Sélectionnez votre plateforme cible (par ex., WhatsApp, Telegram, X). Les différentes plateformes ont des limites de caractères et des règles de formatage différentes. Ce garde garantit que votre message ne sera pas altéré lors de l'envoi.",
          la: "Elige suggestum destinatum (ex. WhatsApp, Telegram, X). Diversa suggesta diversas limites litterarum et regulas formandi habent. Hoc praesidium cavet ne nuntius tuus corrumpatur."
        }
      },
      {
        element: '#guardPlacementWrapper',
        placement: "bottom",
        title: {
          en: "Placement / Location",
          ar: "موقع الإخفاء",
          zh: "嵌入位置/区域",
          fr: "Emplacement / Position",
          la: "Locus Occultandi"
        },
        description: {
          en: "Choose where the secret message characters should be embedded within the cover text (e.g., at the end, in specific positions, or distributed). This adds another layer of control over your steganographic carrier.",
          ar: "اختر أين سيتم دمج رموز الرسالة السرية داخل النص الحامل (مثل: في النهاية، في مواقع محددة، أو موزعة). هذا يمنحك تحكماً إضافياً في آلية الإخفاء.",
          zh: "选择秘密消息字符在封面文本中嵌入的位置（例如，末尾、特定位置或分散分布）。这为您的隐写载体增加了另一层控制。",
          fr: "Choisissez où les caractères du message secret doivent être intégrés dans le texte de support (par ex., à la fin, à des positions spécifiques, ou distribués). Cela ajoute un niveau de contrôle supplémentaire.",
          la: "Elige ubi litterae nuntii secreti intra textum portantis inserendae sint (ex. in fine, in locis certis, aut distributae)."
        }
      },
      {
        element: '#embedCover',
        placement: "top",
        title: {
          en: "Cover Text Input",
          ar: "النص الحامل (Cover Text)",
          zh: "封面文本输入",
          fr: "Saisie du Texte de Couverture",
          la: "Input Textus Portantis"
        },
        description: {
          en: "Enter the public, innocent-looking cover text. This text is visible to anyone and acts as the carrier. The longer and more natural it is, the more capacity you have to hide messages.",
          ar: "أدخل النص الظاهري العام الذي سيحمل الرسالة السرية. هذا النص يظهر بشكل طبيعي للجميع. كلما كان النص أطول وأكثر طبيعية، زادت القدرة الاستيعابية لإخفاء الرسائل.",
          zh: "输入公开的、看起来无害的封面文本。该文本对任何人都是可见的，并作为载体。文本越长越自然，您隐藏消息的容量就越大。",
          fr: "Saisissez le texte de couverture public et anodin. Ce texte est visible par tous et sert de support. Plus il est long et naturel, plus votre capacité de masquage est grande.",
          la: "Input Textus Portantis"
        }
      },
      {
        element: '#embedSecretMessage',
        placement: "top",
        title: {
          en: "Secret Message Payload",
          ar: "الرسالة السرية",
          zh: "秘密消息载荷",
          fr: "Charge Utile du Message Secret",
          la: "Epistula Secreta"
        },
        description: {
          en: "Type or paste the private message you wish to hide. It will be compressed and embedded invisibly inside the cover text.",
          ar: "اكتب أو ألصق الرسالة الخاصة التي ترغب في إخفائها. سيتم تشفيرها وضغطها ثم دمجها بشكل غير مرئي تماماً داخل النص الحامل.",
          zh: "输入或粘贴您想要隐藏的私密消息。它将被压缩并无形地嵌入到封面文本中。",
          fr: "Saisissez ou collez le message privé que vous souhaitez masquer. Il sera compressé et intégré de manière invisible dans le texte de couverture.",
          la: "Scribe vel adglutina nuntium privatum quem vis occultare. Comprimetur et invisibiliter intra textum portantis inseretur."
        }
      },
      {
        element: '#embedStegoKey',
        placement: "bottom",
        title: {
          en: "Pre-Shared Key (Stego-Key)",
          ar: "المفتاح المشترك مسبقاً",
          zh: "预共享密钥 (隐写密钥)",
          fr: "Clé Pré-Partagée (Clé Stego)",
          la: "Clavis Prae-Compartita (Stego-Clavis)"
        },
        description: {
          en: "A password required to embed and extract the message. Only someone who knows this key can recover the hidden secret message, preventing unauthorized decryption.",
          ar: "كلمة مرور مطلوبة لعملية الإخفاء والاستخراج. لا يمكن لأي شخص استرجاع الرسالة السرية المخفية إلا إذا كان يعرف هذا المفتاح، مما يمنع فك التشفير غير المصرح به.",
          zh: "嵌入和提取消息所需的密码。只有知道此密钥的人才能恢复隐藏的秘密消息，从而防止未经授权的解密。",
          fr: "Un mot de passe requis pour intégrer et extraire le message. Seule une personne connaissant cette clé peut récupérer le message secret, empêchant tout décryptage non autorisé.",
          la: "Tessera necessaria ad nuntium occultandum et extrahendum. Solus qui hanc clavem novit nuntium secretum recuperare potest, prohibens dechiffrationem non autorizatam."
        }
      },
      {
        element: '#embedEncryptionKey',
        placement: "bottom",
        title: {
          en: "Encryption Key (AES-CTR)",
          ar: "مفتاح التشفير",
          zh: "加密密钥 (AES-CTR)",
          fr: "Clé de Chiffrement (AES-CTR)",
          la: "Clavis Encryptionis (AES-CTR)"
        },
        description: {
          en: "An optional key that adds cryptographic security. If provided, your secret message is encrypted using AES-CTR before it is embedded, providing double security (Steganography + Cryptography).",
          ar: "مفتاح اختياري يضيف طبقة أمان إضافية. عند تفعيله، سيتم تشفير رسالتك السرية باستخدام خوارزمية AES-CTR قبل إخفائها، مما يوفر حماية مزدوجة (تشفير + إخفاء).",
          zh: "增加密码学安全性的可选密钥。如果提供，您的秘密消息将在嵌入前使用 AES-CTR 进行加密，从而提供双重安全性（隐写术 + 密码学）。",
          fr: "Une clé facultative qui ajoute une sécurité cryptographique. Si fournie, votre message secret est chiffré en AES-CTR avant d'être intégré, offrant une double protection.",
          la: "Clavis encryptionis quae securitatem cryptographicam addit. Si detur, nuntius secretus encrypted cum AES-CTR antequam occultetur, duplicem securitatem praebens."
        }
      },
      {
        element: '#embedHint',
        placement: "bottom",
        title: {
          en: "Password Hint",
          ar: "تلميح كلمة المرور",
          zh: "密码提示",
          fr: "Indice de Mot de Passe",
          la: "Indicium Tesserae"
        },
        description: {
          en: "An optional text hint that will be visible to the receiver. It helps them remember the Pre-Shared Key without exposing the key itself.",
          ar: "تلميح نصي اختياري يظهر للمسلتل لمساعدته في تذكر المفتاح المشترك مسبقاً دون الكشف عن المفتاح نفسه.",
          zh: "接收者可见的可选文本提示。这有助于他们记住预共享密钥，而不会泄露密钥本身。",
          fr: "Un indice textuel facultatif qui sera visible par le destinataire. Il l'aide à se souvenir de la clé sans exposer la clé elle-même.",
          la: "Indicium facultativum quod receptori patet. Iuvat eum clavis recordatione sine ipsa clavi revelanda."
        }
      },
      {
        element: '#embedFakeCover',
        placement: "top",
        title: {
          en: "Fake Cover (Plurality Routing)",
          ar: "الغطاء الوهمي (Fake Cover)",
          zh: "虚假封面 (多元路由)",
          fr: "Fausse Couverture (Routage de Pluralité)",
          la: "Vectorem Simulatum"
        },
        description: {
          en: "An advanced security feature! If you hide data, suspicious observers might notice hidden characters. With Fake Cover, the hidden characters are moved to a secondary, completely different message. This is a pioneering research feature of this system.",
          ar: "ميزة أمان متقدمة وحصرية! في حال شك أحد المراقبين بوجود أحرف مخفية، تتيح لك هذه الميزة نقل الحروف المخفية إلى رسالة ثانوية وهمية تماماً بدلاً من النص الأساسي. هذه ميزة بحثية رائدة ينفرد بها هذا النظام.",
          zh: "一项先进的安全功能！如果您隐藏了数据，可疑的观察者可能会注意到隐藏的字符。使用虚假封面，隐藏的字符会被移动到第二条完全不同的消息中。这是该系统的一项开创性研究功能。",
          fr: "Une fonctionnalité de sécurité avancée ! Si vous masquez des données, des observateurs pourraient remarquer des caractères cachés. Avec la fausse couverture, les caractères cachés sont exécutés vers un message secondaire différent.",
          la: "Securitas provecta! Si data occultas, inspectores suspiciosi litteras latentes notare possint. Cum Vectore Simulato, litterae occultae in alium nuntium secundarium transferuntur."
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
          ar: "تبويب إخفاء الصور",
          zh: "图像嵌入标签页",
          fr: "Onglet d'Intégration d'Image",
          la: "Tabula Imaginis Occultandae"
        },
        description: {
          en: "This tab is dedicated to hiding entire secret images inside a public cover text. Steganography is combined with private metadata stripping.",
          ar: "هذا التبويب مخصص لإخفاء صورة كاملة بشكل سرّي وغير مرئي داخل نص عادي. يتم دمج تقنية الإخفاء مع تنظيف البيانات الوصفية لحمايتك.",
          zh: "此标签页专用于将整个秘密图像隐藏在公开的封面文本中。隐写术与私密元数据擦除相结合。",
          fr: "Cet onglet est dédié à la dissimulation d'images secrètes masquées dans du texte de support public, combiné au nettoyage des métadonnées privées.",
          la: "Haec tabula destinata est ad imagines secretas intra textum portantis occultandas, una cum purgatione metadatorum."
        }
      },
      {
        element: '#imgGuardPlatformWrapper',
        placement: "bottom",
        title: {
          en: "Target Social Platform",
          ar: "المنصة المستهدفة",
          zh: "目标社交平台",
          fr: "Plateforme Sociale Cible",
          la: "Suggestus Socialis Destinatus"
        },
        description: {
          en: "Select where you want to send the text containing the hidden image. This ensures network formatting won't corrupt the hidden data.",
          ar: "اختر منصة التواصل الاجتماعي التي تنوي إرسال النص إليها. هذا يضمن عدم تلف محتوى الصورة بسبب معالجة المنصات للنصوص.",
          zh: "选择您要发送包含隐藏图像文本的目标平台。这可确保网络格式不会损坏隐藏数据。",
          fr: "Sélectionnez l'application de destination pour le texte contenant l'image. Cela évite que les serveurs n'altèrent les données.",
          la: "Elige ubi nuntium mittere velis. Hoc cavet ne formandi ratio data imaginis corrumpat."
        }
      },
      {
        element: '#imgGuardPlacementWrapper',
        placement: "bottom",
        title: {
          en: "Placement / Location",
          ar: "موقع الإخفاء",
          zh: "嵌入位置/区域",
          fr: "Emplacement / Position",
          la: "Locus Occultandi"
        },
        description: {
          en: "Choose where the hidden image bytes should be placed inside the carrier cover text.",
          ar: "اختر أين سيتم دمج رموز الصورة السرية داخل النص الحامل.",
          zh: "选择隐藏图像字节在载体封面文本中的位置。",
          fr: "Choisissez où placer les octets de l'image cachée dans le texte de support.",
          la: "Elige ubi bytes imaginis occultae in textu portanti ponendi sint."
        }
      },
      {
        element: '#imgEmbedCover',
        placement: "top",
        title: {
          en: "Cover Text Input",
          ar: "النص الحامل (Cover Text)",
          zh: "封面文本输入",
          fr: "Saisie du Texte de Couverture",
          la: "Input Textus Portantis"
        },
        description: {
          en: "Enter the public cover text. Note that hiding images requires larger capacity, so you will need a relatively longer cover text.",
          ar: "أدخل النص الظاهري العام الذي سيحمل الصورة. نظراً لأن الصور أكبر حجماً، ستحتاج إلى نص أطول نسبياً لتتم عملية الدمج بنجاح.",
          zh: "输入公开的封面文本。注意，隐藏图像需要较大的容量，因此您需要相对较长的封面文本。",
          fr: "Saisissez le texte de couverture public. Dissimuler des images exigeant plus de capacité, il vous faudra un texte plus long.",
          la: "Scribe textum portantis publicum. Occultatio imaginis maiorem capacitatem postulat, ergo textu longiore eges."
        }
      },
      {
        element: '#imgEmbedUploadArea',
        placement: "top",
        title: {
          en: "Secret Image Payload",
          ar: "صورة الحمولة السرية",
          zh: "图像载荷",
          fr: "Image Secrète à Intégrer",
          la: "Imago Secreta"
        },
        description: {
          en: "Drag and drop or select the private image file you want to hide inside the cover text. It will be compressed and encrypted.",
          ar: "اسحب وألصق أو اختر ملف الصورة الخاصة التي ترغب في إخفائها داخل النص. سيتم ضغطها وتشفيرها تلقائياً.",
          zh: "拖放或选择要隐藏在封面文本中的私密图像文件。它将被压缩并加密。",
          fr: "Glissez-déposez ou sélectionnez le fichier d'image privé à masquer. Il sera compressé et chiffré automatiquement.",
          la: "Adglutina vel elige imaginem privatam occultandam. Ea comprimetur et encrypta erit."
        }
      },
      {
        element: '#imgEmbedKey',
        placement: "bottom",
        title: {
          en: "AES-CTR Decryption Key",
          ar: "مفتاح تشفير AES-CTR",
          zh: "AES-CTR 加密密钥",
          fr: "Clé de Chiffrement AES-CTR",
          la: "Clavis Encryptionis AES-CTR"
        },
        description: {
          en: "A required key used to encrypt the payload image. Only someone with this key can recover and view the hidden image.",
          ar: "مفتاح تشفير إلزامي لحماية الصورة. لا يمكن للمستقبل فك تشفير الصورة المخفية واسترجاعها إلا باستخدام هذا المفتاح.",
          zh: "用于加密载荷图像的必需密钥。只有拥有此密钥的人才能恢复并查看隐藏图像。",
          fr: "Une clé requise pour chiffrer l'image. Seul le destinataire disposant de cette clé pourra restaurer l'image.",
          la: "Clavis encryptionis ad imaginem encryptandam. Solus possessor clavis imaginem occultam recuperare potest."
        }
      },
      {
        element: '#btnImgHideData',
        placement: "top",
        title: {
          en: "Embed Image Button",
          ar: "زر إخفاء الصورة",
          zh: "嵌入图像按钮",
          fr: "Bouton d'Intégration d'Image",
          la: "Botoniculum Occultandi Imaginis"
        },
        description: {
          en: "Click this button to strip metadata, compress, encrypt, and embed the secret image inside the cover text.",
          ar: "انقر على هذا الزر لتنظيف البيانات الوصفية للصورة، وتشفيرها، ودمجها بشكل غير مرئي داخل النص.",
          zh: "点击此按钮以清除元数据、压缩、加密并将秘密图像嵌入封面文本中。",
          fr: "Cliquez ici pour nettoyer les métadonnées, compresser, chiffrer et intégrer l'image dans le texte.",
          la: "Preme hic ut metadata purges, comprimas, encryptas et imaginem occultam in textu inseras."
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
          ar: "تبويب الاستخراج القياسي",
          zh: "标准提取标签页",
          fr: "Onglet d'Extraction Standard",
          la: "Tabula Extractionis Standard"
        },
        description: {
          en: "Use this tab to extract hidden messages from text containing hidden steganographic data. You will need the matching Pre-Shared Key.",
          ar: "استخدم هذا التبويب لاستخراج الرسائل السرية من النصوص المخفية الحاملة للبيانات. ستحتاج إلى إدخال المفتاح المشترك مسبقاً المتطابق.",
          zh: "使用此标签页从包含隐藏隐写数据的文本中提取秘密消息。您需要匹配的预共享密钥。",
          fr: "Utilisez cet onglet pour extraire des messages cachés. Vous aurez besoin de la clé pré-partagée correspondante.",
          la: "Utere hac tabula ad nuntios secretos extrahendos. Clave prae-compartita eges."
        }
      },
      {
        element: '#extractCover',
        placement: "top",
        title: {
          en: "Stego Text Input",
          ar: "نص الإخفاء المستلم",
          zh: "隐写文本输入",
          fr: "Saisie du Texte Stégo",
          la: "Input Textus Steganographici"
        },
        description: {
          en: "Paste the stego-text container (with the hidden message) into this area to begin the extraction process.",
          ar: "قم بلصق النص المستلم الذي يحمل الرسالة السرية المخفية داخل هذه المساحة لبدء عملية التفكيك والاستخراج.",
          zh: "在此区域粘贴包含隐藏消息的隐写文本容器以开始提取过程。",
          fr: "Collez ici le texte contenant le message secret pour commencer l'extraction.",
          la: "Adglutina textum steganographicum hic ut extractionem incipias."
        }
      },
      {
        element: '#extractStegoKey',
        placement: "bottom",
        title: {
          en: "Pre-Shared Key",
          ar: "المفتاح المشترك مسبقاً",
          zh: "预共享密钥",
          fr: "Clé Pré-Partagée",
          la: "Clavis Prae-Compartita"
        },
        description: {
          en: "Enter the Pre-Shared Key (Stego-Key) that was used during the embedding phase. Without it, the hidden message cannot be isolated.",
          ar: "أدخل كلمة المرور (المفتاح المشترك مسبقاً) التي تم استخدامها أثناء عملية الإخفاء. بدون هذا المفتاح لن تتمكن من استخلاص الرسالة.",
          zh: "输入嵌入阶段使用的预共享密钥（隐写密钥）。没有它，将无法分离隐藏的消息。",
          fr: "Saisissez la clé pré-partagée utilisée lors de l'intégration. Sans elle, le message secret reste inaccessible.",
          la: "Scribe clavem prae-compartitam in occultatione adhibitam. Sine ea, nuntius non legi potest."
        }
      },
      {
        element: '#extractEncryptionKey',
        placement: "bottom",
        title: {
          en: "AES Decryption Key",
          ar: "مفتاح فك التشفير",
          zh: "AES 解密密钥",
          fr: "Clé de Déchiffrement AES",
          la: "Clavis Decryptionis AES"
        },
        description: {
          en: "If the message was encrypted using AES-CTR before embedding, enter the decryption key here to automatically decrypt the payload.",
          ar: "إذا تم تشفير الرسالة السرية باستخدام خوارزمية AES أثناء الإخفاء، أدخل مفتاح فك التشفير هنا لفك التشفير تلقائياً.",
          zh: "如果消息在嵌入前使用 AES-CTR 加密，请在此处输入解密密钥以自动解密载荷。",
          fr: "Si le message a été chiffré en AES-CTR, entrez la clé ici pour le déchiffrer automatiquement.",
          la: "Si nuntius encrypted fuerit, scribe clavem decryptionis hic ut nuntius solvatur."
        }
      },
      {
        element: '#extract-btn',
        placement: "top",
        title: {
          en: "Extract Button",
          ar: "زر الاستخراج",
          zh: "提取按钮",
          fr: "Bouton d'Extraction",
          la: "Botoniculum Extractionis"
        },
        description: {
          en: "Click this button to execute the extraction algorithm. If the key matches, the hidden message will be revealed in a result panel.",
          ar: "انقر على هذا الزر لبدء الفك واسترجاع المحتوى السري. في حال مطابقة المفتاح، ستظهر رسالتك السرية أسفل الزر مباشرة.",
          zh: "点击此按钮执行提取算法。如果密钥匹配，隐藏的消息将在结果面板中显示。",
          fr: "Cliquez sur ce bouton pour lancer l'extraction. Si la clé est correcte, le message s'affichera.",
          la: "Preme hic ut extractionem incipias. Si clavis congruat, nuntius infra ostendetur."
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
          ar: "تبويب الفاحص الذكي",
          zh: "聊天记录扫描标签页",
          fr: "Onglet Scanner de Chat",
          la: "Tabula Perscrutationis Colloquii"
        },
        description: {
          en: "This tab is dedicated to scanning entire chat logs or history. If you have a conversation but aren't sure which specific message contains the hidden text, you can copy the whole chat history (even 10, 20, or 40 messages) and paste it here to scan it all at once.",
          ar: "هذا التبويب مخصص لفحص سجلات المحادثات والدردشة بالكامل. إذا كان لديك محادثة مع شخص ما ولست متأكداً في أي رسالة تم إخفاء النص، يمكنك نسخ تاريخ المحادثة بالكامل (حتى 10 أو 20 أو 40 رسالة) ولصقها هنا لفحصها دفعة واحدة.",
          zh: "此标签页专用于扫描整个聊天记录或历史记录。如果您有对话但不确定具体哪条消息包含隐藏文本，可以复制整个聊天记录（甚至是10、20或40条消息）并粘贴到此处一次性扫描。",
          fr: "Cet onglet sert à scanner l'historique complet d'une conversation. Si vous ne savez pas quel message contient les données, copiez tout l'historique (jusqu'à 10, 20 ou 40 messages) pour tout analyser d'un coup.",
          la: "Haec tabula destinata est ad colloquia perscrutanda. Si nescis quis nuntius data contineat, potes multa colloquia (sicut 10, 20 vel 40 nuntios) simul exscribere et hic perscrutari."
        }
      },
      {
        element: '#scannerChatInput',
        placement: "top",
        title: {
          en: "Conversation Input",
          ar: "صندوق المحادثات والدردشة",
          zh: "对话输入区域",
          fr: "Zone de Saisie de Conversation",
          la: "Input Colloquiorum"
        },
        description: {
          en: "Paste the copied conversation history here. You can copy a large number of messages from your chat application (WhatsApp, Telegram, etc.). The scanner will automatically process the entire text line-by-line, trying to extract hidden payloads from each message.",
          ar: "ألصق سجل المحادثات المنسوخ هنا. يمكنك نسخ عدد كبير من الرسائل من تطبيق الدردشة الخاص بك (مثل واتساب أو تلغرام). سيقوم الفاحص بتحليل النص بالكامل تلقائياً سطراً بسطر لاستخراج أي حمولة مخفية من كل رسالة.",
          zh: "在此处粘贴复制的聊天记录。您可以从聊天应用（如 WhatsApp、Telegram 等）复制大量消息。扫描器将自动逐行处理整个文本，尝试从每条消息中提取隐藏载荷。",
          fr: "Collez l'historique de conversation ici. Le scanner analysera le texte ligne par ligne pour tenter d'extraire la charge utile cachée de chaque message.",
          la: "Adglutina colloquium hic. Scanner omnes lineas perscrutabitur ut nuntios occultos inveniat."
        }
      },
      {
        element: '#scannerPassword',
        placement: "bottom",
        title: {
          en: "Stego Password Keys",
          ar: "مفاتيح الفك والتحقق",
          zh: "隐写密码密钥",
          fr: "Clés de Passe Stego",
          la: "Claves Stego"
        },
        description: {
          en: "Enter the stego passwords used. You can add multiple keys to scan the chat against different passwords simultaneously.",
          ar: "أدخل مفاتيح كلمة المرور المستخدمة. يمكنك إضافة أكثر من مفتاح لفحص المحادثات بكلمات مرور متعددة في آن واحد.",
          zh: "输入所使用的隐写密码。您可以添加多个密钥，以同时使用不同的密码对聊天进行扫描。",
          fr: "Entrez les mots de passe de stéganographie. Vous pouvez saisir plusieurs clés pour tester différents mots de passe en même temps.",
          la: "Scribe claves steganographicas. Potes plures claves addere ut colloquium simul cum eis perscrutetur."
        }
      },
      {
        element: '#scannerEncryptionKey',
        placement: "bottom",
        title: {
          en: "AES Decryption Keys",
          ar: "مفاتيح فك تشفير AES",
          zh: "AES 解密密钥",
          fr: "Clés de Chiffrement AES",
          la: "Claves Decryptionis AES"
        },
        description: {
          en: "Add the AES decryption keys if the payloads were cryptographically secured.",
          ar: "أدخل مفاتيح فك التشفير الـ AES الاختيارية في حال كان محتوى الرسائل مشفراً.",
          zh: "如果载荷已进行加密保护，请添加相应的 AES 解密密钥。",
          fr: "Ajoutez les clés de déchiffrement AES si la charge utile était sécurisée par chiffrement.",
          la: "Adde claves decryptionis AES si nuntii occulti encrypti fuerint."
        }
      },
      {
        element: '#platformSelectWrapper',
        placement: "bottom",
        title: {
          en: "Target Platform Filter",
          ar: "فلترة المنصات المستهدفة",
          zh: "目标平台过滤器",
          fr: "Filtre de Plateforme Cible",
          la: "Colator Suggesti"
        },
        description: {
          en: "Choose the target platform (e.g., WhatsApp, Telegram). When you copy messages from chat apps, they often append platform-specific metadata (timestamps, sender names, system alerts) which acts as noise. By specifying the platform, the scanner filters out this garbage and cleans the text to extract the hidden message accurately.",
          ar: "حدد المنصة المستهدفة (مثل واتساب أو تلغرام). عند نسخ الرسائل من تطبيق دردشة، فإنه قد يتم إرفاق نصوص غير متعلقة بالرسالة (مثل التوقيت، اسم المرسل، أو التنبيهات الخاصة بالتطبيق). بتحديد المنصة، سيقوم البرنامج بتصفية هذه الشوائب والملحقات غير المرغوبة للوصول إلى النص المخفي بدقة.",
          zh: "选择目标平台（如 WhatsApp、Telegram）。从聊天应用复制消息时，它们通常会附加平台特定的元数据（时间戳、发送者姓名、系统通知），这会产生噪点。通过指定平台，扫描器会滤除这些垃圾内容并清洗文本，从而准确提取隐藏消息。",
          fr: "Choisissez la plateforme (WhatsApp, Telegram). Copier des messages y ajoute souvent des métadonnées bruyantes (horodatages, noms). Ce filtre nettoie ces impuretés pour une extraction parfaite.",
          la: "Elige suggestum destinatum (WhatsApp, Telegram). Nuntii excripti saepe sordes (tempora, nomina) habent. Hoc colatorio sordibus purgatis nuntius extrahetur."
        }
      },
      {
        element: '#btn-scanner-one-click',
        placement: "top",
        title: {
          en: "Start Scan / Verify",
          ar: "بدء الفحص والتحقق",
          zh: "开始扫描/验证",
          fr: "Bouton Démarrer l'Analyse",
          la: "Botoniculum Scrutandi"
        },
        description: {
          en: "Click this button to start scanning. The tool will apply your keys (Pre-Shared Stego Key and AES-CTR key) to all the messages you pasted, clean up the platform noise, and display any successfully extracted hidden payloads in the results table below.",
          ar: "انقر على هذا الزر لبدء الفحص. سيقوم البرنامج بتطبيق المفاتيح المدخلة (المفتاح المشترك ومفتاح التشفير AES-CTR) على كافة الرسائل المنسوخة، وتصفية شوائب المنصات، ثم عرض الرسائل المستخرجة بنجاح في جدول النتائج بالأسفل.",
          zh: "点击此按钮开始扫描。该工具将应用您的密钥（预共享隐写密钥和 AES-CTR 密钥）到您粘贴的所有消息中，清除平台噪点，并在下方结果表格中显示成功提取的任何隐藏载荷。",
          fr: "Cliquez pour lancer le scan. L'outil appliquera vos clés sur tous les messages collés, éliminera le bruit des plateformes et affichera les résultats trouvés.",
          la: "Preme hic ut perscrutatio incipiat. Instrumentum claves adhibebit ad omnes nuntios purgatos et eventus infra demonstrabit."
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
          ar: "تبويب سجل التلميحات",
          zh: "提示日志标签页",
          fr: "Onglet des Indices",
          la: "Tabula Indiciorum"
        },
        description: {
          en: "Here you can track the contextual steganography hints you have sent and received.",
          ar: "هنا يمكنك تتبع ومراجعة تلميحات الإخفاء السياقية التي قمت بإرسالها أو استلامها للرجوع إليها لاحقاً.",
          zh: "在此处，您可以跟踪发送和接收的上下文隐写提示。",
          fr: "Ici, vous pouvez suivre les indices de stéganographie contextuels envoyés et reçus.",
          la: "Hic potes inspicere indicia steganographica missa et accepta."
        }
      },
      {
        element: '#hints-panel',
        placement: "top",
        title: {
          en: "Hints History Log",
          ar: "سجل تلميحات كلمات المرور",
          zh: "提示历史记录",
          fr: "Historique des Indices",
          la: "Scribere Indicia History"
        },
        description: {
          en: "Shows the latest active hint, plus lists of received and sent hints to help you easily recall Pre-Shared Keys.",
          ar: "يعرض التلميح النشط الأخير، بالإضافة إلى قوائم بالتلميحات الواردة والصادرة لمساعدتك في استرجاع مفاتيحك المشتركة بسهولة.",
          zh: "显示最新活跃提示，并列出接收和发送的提示，帮助您轻松回忆预共享密钥。",
          fr: "Affiche le dernier indice actif et la liste des indices reçus et envoyés pour vous aider à retrouver les clés.",
          la: "Ostendit indicia novissima et indicat accepta et missa."
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
          ar: "تبويب استخراج الصور",
          zh: "图像提取标签页",
          fr: "Onglet d'Extraction d'Image",
          la: "Tabula Extractionis Imaginis"
        },
        description: {
          en: "This tab is dedicated to recovering hidden secret images from stego-text carriers.",
          ar: "هذا التبويب مخصص لاستخراج واسترجاع الصور السرية المخفية داخل النصوص المستلمة.",
          zh: "此标签页专用于从隐写文本载体中恢复隐藏的秘密图像。",
          fr: "Cet onglet est dédié à la restauration d'images secrètes masquées dans du texte.",
          la: "Hac in tabula imagines secretae ex textibus receptis extrahuntur."
        }
      },
      {
        element: '#imgExtractStego',
        placement: "top",
        title: {
          en: "Stego-Text Input",
          ar: "نص الإخفاء المستلم",
          zh: "隐写文本输入",
          fr: "Saisie du Texte Stégo",
          la: "Input Textus Stego"
        },
        description: {
          en: "Paste the stego-text container (with the hidden message) into this area to begin the extraction process.",
          ar: "قم بلصق نص الإخفاء المستلم الذي يحمل الصورة السرية المدمجة بداخله.",
          zh: "将包含隐藏图像的隐写文本粘贴到此输入区域。",
          fr: "Collez le texte stégo contenant l'image cachée dans cette zone.",
          la: "Adglutina textum steganographicum cum imagine hic."
        }
      },
      {
        element: '#imgExtractKey',
        placement: "bottom",
        title: {
          en: "AES-CTR Decryption Key",
          ar: "مفتاح فك تشفير AES-CTR",
          zh: "AES-CTR 解密密钥",
          fr: "Clé de Déchiffrement AES-CTR",
          la: "Clavis Decryptionis AES-CTR"
        },
        description: {
          en: "Enter the required key used during the image embedding phase to decrypt and restore the picture.",
          ar: "أدخل مفتاح التشفير الإلزامي الذي تم استخدامه أثناء عملية إخفاء الصورة لفك التشفير واستعادتها.",
          zh: "输入图像嵌入阶段所使用的必需密钥，以解密并恢复图像。",
          fr: "Saisissez la clé AES-CTR requise pour déchiffrer et restaurer l'image.",
          la: "Scribe clavem AES-CTR necessariam ad dechiffrandam et restituendam imaginem."
        }
      },
      {
        element: '#img-extract-btn',
        placement: "top",
        title: {
          en: "Extract & Decrypt Button",
          ar: "زر استخراج وفك التشفير",
          zh: "提取并解密按钮",
          fr: "Bouton Extraire et Déchiffrer",
          la: "Botoniculum Extrahendi & Decryptandi"
        },
        description: {
          en: "Click this button to extract the bytes, decrypt, and display the hidden image in the results panel.",
          ar: "انقر على هذا الزر لاستخلاص البيانات، وفك تشفير الصورة، وعرضها في لوحة النتائج بالأسفل.",
          zh: "点击此按钮以提取字节、解密并在下方的结果面板中显示隐藏图像。",
          fr: "Bouton Extraire et Déchiffrer",
          la: "Preme hic ut bytes extrahas et dechiffres, imaginem occultam ostendens."
        }
      }
    ],

    // ── Text Steganalysis Tour ──
    steganalysis: [
      {
        element: '.main-header',
        placement: "bottom",
        title: {
          en: "Text Steganalysis Overview",
          ar: "تحليل النصوص المخفية",
          zh: "文本隐写分析概述",
          fr: "Aperçu de la Stéganalyse de Texte",
          la: "Conspectus Steganalysis Textus"
        },
        description: {
          en: "This tool analyzes text to detect hidden Unicode characters (such as zero-width spaces or direction markers) that may indicate steganography, without requiring password keys.",
          ar: "تتيح لك هذه الأداة فحص النصوص للكشف عن الحروف والرموز غير المرئية (مثل المسافات الصفرية أو علامات الاتجاه) التي قد تشير إلى وجود محتوى مخفٍ، وذلك دون الحاجة إلى كلمات مرور أو مفاتيح.",
          zh: "该工具可分析文本以检测隐藏的 Unicode 字符（例如零宽空格或方向标记），这些字符可能表示存在隐写内容，而无需密码密钥。",
          fr: "Cet outil analyse le texte pour détecter les caractères Unicode cachés (tels que les espaces de largeur nulle ou les marqueurs de direction) qui peuvent indiquer la présence de stéganographie, sans nécessiter de mot de passe.",
          la: "Hoc instrumentum textum perscrutatur ut occultas litteras Unicode (sicut spatia vacua vel signa directionis) deprehendat quae occultationem indicent, sine tesseris."
        }
      },
      {
        element: '#steganalysisInput',
        placement: "top",
        title: {
          en: "Input Text Area",
          ar: "نص التحليل",
          zh: "输入文本区域",
          fr: "Zone de Saisie du Texte",
          la: "Area Indicii Textus"
        },
        description: {
          en: "Paste the text or message you suspect contains hidden steganographic payload here to scan it.",
          ar: "قم بلصق النص أو الرسالة التي تشك في احتوائها على حمولة مخفية هنا لبدء الفحص.",
          zh: "在此处粘贴您怀疑包含隐藏隐写载荷的文本或消息进行扫描。",
          fr: "Collez ici le texte ou le message que vous soupçonnez de contenir des données cachées pour l'analyser.",
          la: "Hic adglutina textum vel epistulam quam suspicaris occultam partem contineat ut eam perscruteris."
        }
      },
      {
        element: '#steganalysis-btn',
        placement: "top",
        title: {
          en: "Analyze Text Button",
          ar: "زر بدء التحليل",
          zh: "分析文本按钮",
          fr: "Bouton Analyser le Texte",
          la: "Botoniculum Perscrutandi"
        },
        description: {
          en: "Click here to run the analysis engine. The tool will parse the text and display a report of any detected hidden characters below.",
          ar: "انقر هنا لبدء تشغيل محرك التحليل. سيقوم البرنامج بفحص النص وعرض تقرير مفصل عن أي رموز أو حروف مخفية تم اكتشافها بالأسفل.",
          zh: "点击此处运行分析引擎。该工具将解析文本并在下方显示检测到的任何隐藏字符的报告。",
          fr: "Cliquez ici pour lancer l'analyse. L'outil examinera le texte et affichera un rapport détaillé des caractères cachés détectés ci-dessous.",
          la: "Preme hic ut perscrutationem incipias. Instrumentum textum examinabit et indicia litterarum occultarum infra ostendet."
        }
      }
    ],

    // ── Deep Stego Analytics Tour ──
    details: [
      {
        element: '.page-header',
        placement: "bottom",
        title: {
          en: "Deep Stego Analytics Hub",
          ar: "مركز التحليلات العميقة للستيجانو",
          zh: "深度隐写分析中心",
          fr: "Hub d'Analyse Approfondie de la Stéganographie",
          la: "Centrum Analysticae Steganographiae Altum"
        },
        description: {
          en: "Welcome to the Deep Analytics Hub! This dashboard is a forensic dashboard that provides a detailed cryptographic and visual breakdown of your steganographic data. It shows how the secret message was hidden inside the cover text, the mathematical distribution, and the security configuration used.",
          ar: "مرحباً بك في مركز التحليلات العميقة! هذه لوحة تحكم جنائية توفر تفكيكاً تشفيرياً وبصرياً دقيقاً لعملية إخفاء البيانات. تتيح لك رؤية كيفية دمج رسالتك السرية داخل النص الحامل، ومخطط التوزيع الرياضي، وإعدادات الحماية والأمان المستخدمة.",
          zh: "欢迎来到深度分析中心！此控制台是一个取证仪表盘，提供了隐写数据的详细加密和视觉分解。它展示了秘密消息是如何隐藏在封面文本中的、数学分布以及所使用的安全配置。",
          fr: "Bienvenue dans le Hub d'Analyse Approfondie ! Ce tableau de bord d'analyse légale fournit une décomposition cryptographique et visuelle détaillée de vos données stéganographiques. Il montre comment le message secret a été masqué dans le texte de couverture, sa distribution mathématique, et la configuration de sécurité utilisée.",
          la: "Salve ad Centrum Analysticae Altum! Haec tabula forensis est quae explicationem cryptographicam et visualem steganographiae tuae accurate demonstrat. Ostendit quomodo epistula occulta intra textum portantis inserta sit, distributionem mathematicam, et configurationem securitatis adhibitam."
        }
      },
      {
        element: '.stats-row',
        placement: "bottom",
        title: {
          en: "Key Metrics Summary",
          ar: "ملخص المؤشرات والمقاييس الرئيسية",
          zh: "关键指标摘要",
          fr: "Résumé des Métriques Clés",
          la: "Summarium Indiciorum Primorum"
        },
        description: {
          en: `This row displays four critical metrics:
1. Cover Character Count: Total length of the original text. This acts as the storage capacity limit.
2. Payload Bytes Count: The size of your secret message. A Brotli flag indicates if compression was used to shrink it.
3. Stego-key Complexity: The security strength of the steganographic key.
4. Embedding Density: The percentage of cover capacity used. Higher density means more character spaces are altered.`,
          ar: `يعرض هذا الصف أربعة مقاييس بالغة الأهمية:
1. عدد أحرف نص التغطية: طول النص الأصلي، وهو ما يحدد الحد الأقصى لسعة الإخفاء.
2. حجم الحمولة بالبايت: حجم الرسالة السرية. تظهر علامة Brotli إذا تم ضغط الرسالة لتقليل استهلاك المساحة.
3. تعقيد مفتاح الإخفاء: القوة الأمنية لكلمة مرور الإخفاء.
4. كثافة التضمين: النسبة المئوية المستخدمة من السعة المتاحة. الكثافة العالية تعني تعديل عدد أكبر من خانات الأحرف.`,
          zh: `此行显示四个关键指标：
1. 封面字符数：原始文本的总长度，决定了最大存储容量限制。
2. 有效载荷字节数：秘密消息的大小，Brotli 标志表示是否启用了压缩以缩小其体积。
3. 隐写密钥复杂度：用于保护隐写过程的密钥安全强度。
4. 嵌入密度：已使用的封面容量百分比。密度越高表示有更多的字符位置被修改。`,
          fr: `Cette ligne affiche quatre métriques cruciales :
1. Nombre de caractères du support : Longueur totale du texte d'origine, agissant comme limite de capacité.
2. Taille de la charge utile (octets) : Taille du message secret. Un indicateur Brotli signale si la compression a été utilisée.
3. Complexité de la clé stégano : Niveau de sécurité et force de la clé stéganographique.
4. Densité d'intégration : Pourcentage de la capacité du support utilisé. Une densité élevée signifie que plus de caractères ont été modifiés.`,
          la: `Haec series quattuor indicia gravia demonstrat :
1. Numerus litterarum portantis: Tota longitudo textus originalis, quae modum capacitatis definit.
2. Magnitudo epistulae occultae (bytes): Magnitudo nuntii secreti. Insigne Brotli ostendit si compressio adhibita sit.
3. Complexitas clavis steganographicae: Fortitudo securitatis clavis tuae.
4. Spissitudo injectionis: Pars capacitatis portantis quae mutata est. Spissitudo maior significat plures litteras commutatas esse.`
        }
      },
      {
        element: '.details-panel',
        placement: "top",
        title: {
          en: "Visual Diff Visualizer",
          ar: "مخطط الفروقات البصرية للمقارنة",
          zh: "视觉差异可视化工具",
          fr: "Visualiseur de Différence Visuelle",
          la: "Visualisator Differentiae Visualis"
        },
        description: {
          en: "This interactive block highlights the exact locations in the text where hidden data was embedded. It uses glowing markers to represent invisible Unicode characters. You can toggle between Text view (to see the formatted text and inspect characters on hover) and Hex Matrix view (to inspect the exact hexadecimal structure and byte entropy metrics).",
          ar: "يعرض هذا القسم التفاعلي المواقع الدقيقة في النص التي تم دمج البيانات المخفية فيها. يستخدم علامات مضيئة لتمثيل أحرف اليونيكود غير المرئية. يمكنك التبديل بين عرض النص (لرؤية النص المنسق وفحص الأحرف عند تمرير الفأرة) وعرض مصفوفة الهكس (لفحص البنية السداسية عشرية ومقاييس عشوائية البايتات/الإنتروبي).",
          zh: "这个交互式区块突出了文本中嵌入隐藏数据的精确位置。它使用发光的标记来表示不可见的 Unicode 字符。您可以在文本视图（查看格式化文本并在悬停时检查字符）和十六进制矩阵视图（检查精确的十六进制结构和字节熵指标）之间进行切换。",
          fr: "Ce bloc interactif met en évidence les emplacements exacts dans le texte où les données secrètes ont été intégrées. Il utilise des marqueurs lumineux pour représenter les caractères Unicode invisibles. Vous pouvez basculer entre la vue Texte (pour lire le texte formaté et inspecter les caractères au survol) et la vue Matrice Hex (pour analyser la structure hexadécimale exacte et les métriques d'entropie des octets).",
          la: "Hic visualisator interactivus accurate demonstrat loca in textu ubi data occulta injecta sint. Utitur notis lucentibus ad indicandas litteras Unicode invisibiles. Potes mutare inter aspectum Textus (ut textum ordinatum videas et litteras inspectes cum cursorem super eas moveas) vel aspectum Matricis Hexae (ut structuram hexam et entropiam byte inspectes)."
        }
      },
      {
        element: '.prng-stats-grid',
        placement: "top",
        title: {
          en: "Cryptographic Keys & Hints",
          ar: "المفاتيح التشفيرية والتلميحات",
          zh: "密码密钥与提示",
          fr: "Clés Cryptographiques et Indices",
          la: "Claves Cryptographicae et Indicia"
        },
        description: {
          en: `This section reveals the core cryptographic components of the session:
1. Resolved Seed Hash: The SHA-256 hash of your password key, used to seed the PRNG to generate indices.
2. AES-CTR Encryption Key: Confirms whether your message was encrypted with AES-256-CTR before being embedded.
3. Secret Message Hint: Displays the password hint stored in metadata, assisting the recipient in recalling the password key.`,
          ar: `يكشف هذا القسم عن المكونات التشفيرية الأساسية للجلسة:
1. هاش البذرة المستنتج: هاش SHA-256 المستخلص من كلمة المرور لتغذية مولّد الأرقام العشوائية وتحديد مواقع الإخفاء.
2. مفتاح تشفير AES-CTR: يؤكد ما إذا كانت رسالتك قد تم تشفيرها بخوارزمية AES-256-CTR قبل إخفائها.
3. تلميح الرسالة السرية: يعرض التلميح المخزن في البيانات الوصفية لمساعدة المستقبل في تذكر كلمة المرور.`,
          zh: `本部分展示了会话的核心加密组件：
1. 解析的种子哈希：密码密钥的 SHA-256 哈希值，用于初始化 PRNG 以生成嵌入索引位置。
2. AES-CTR 加密密钥：确认您的消息在嵌入之前是否已使用 AES-256-CTR 进行了加密。
3. 秘密消息提示：显示存储在元数据中的密码提示，帮助接收者回忆解密所需的密码密钥。`,
          fr: `Cette section révèle les composants cryptographiques fondamentaux de la session :
1. Hachage de graine résolu : Le hachage SHA-256 de votre mot de passe, utilisé pour initialiser le PRNG afin de générer les positions.
2. Clé de chiffrement AES-CTR : Confirme si le message a été chiffré en AES-256-CTR avant son intégration.
3. Indice du message secret : Affiche l'indice de mot de passe facultatif enregistré dans les métadonnées pour aider à retrouver la clé.`,
          la: `Haec sectio principalia elementa cryptographica transactionis aperit :
1. Semen Resolutum: Hash SHA-256 clavis tuae, ad initium generatoris PRNG adhibitum ad indices creandos.
2. Clavis Decryptionis AES-CTR: Indicat utrum epistula encrypted sit cum AES-256-CTR antequam occultaretur.
3. Indicium Epistulae Occultae: Tesserae indicium in metadata scriptum demonstrat, ad iuvandum receptorem clavis recordatione.`
        }
      },
      {
        element: '#val-chips',
        placement: "top",
        title: {
          en: "PRNG Coordinates Mapping",
          ar: "مخطط إحداثيات مولّد الأرقام العشوائية",
          zh: "PRNG 坐标映射",
          fr: "Cartographie des Coordonnées PRNG",
          la: "Tabulatio Coordinatarum PRNG"
        },
        description: {
          en: "This panel visualizes the specific character index coordinates chosen by the Pseudo-Random Number Generator (PRNG). By using your stego key as a seed, the algorithm calculates a scattered sequence of positions inside the cover text. Hidden data bits are only injected at these scattered offsets, preventing an attacker from easily scanning or reconstructing the payload without the key.",
          ar: "توضح هذه اللوحة فهارس الأحرف والمواقع المحددة التي اختارها مولد الأرقام شبه العشوائية (PRNG). باستخدام مفتاح الإخفاء كبذرة، تحسب الخوارزمية سلسلة متباعدة ومشتتة من المواقع داخل النص الحامل. يتم دمج بتات البيانات حصرياً في هذه الإحداثيات، مما يمنع المخترقين من مسح أو إعادة بناء الرسالة المخفية بدون المفتاح.",
          zh: "此面板可视化了由伪随机数生成器（PRNG）选择的特定字符索引坐标。通过将您的隐写密钥用作种子，算法会在封面文本中计算出一系列分散的位置。隐藏的数据位仅嵌入在这些分散的偏移量处，从而防止攻击者在没有密钥的情况下轻松扫描或重构载荷。",
          fr: "Ce panneau visualise les coordonnées d'index de caractères spécifiques choisies par le Générateur de Nombres Pseudo-Aléatoires (PRNG). En utilisant votre clé stégano comme graine, l'algorithme calcule une séquence de positions dispersées dans le texte de support. Les bits secrets ne sont injectés qu'à ces positions, empêchant un attaquant de localiser ou reconstituer la charge utile sans la clé.",
          la: "Haec tabula coordinatas indices litterarum demonstrat quas Generator Numerorum Pseudo-Temere (PRNG) elegit. Clave steganographica pro semine adhibita, calculus seriem locorum sparsorum intra textum portantis efficit. Data occulta tantum in his indicibus ponuntur, ne quis sine clave secreta nuntium invenire aut restituere possit."
        }
      },
      {
        element: '#val-bits',
        placement: "top",
        title: {
          en: "Binary XOR Difference Key Mask",
          ar: "قناع فرق البتّات الثنائي XOR",
          zh: "二进制 XOR 差异密钥掩码",
          fr: "Masque XOR Binaire",
          la: "Persona XOR Binaria"
        },
        description: {
          en: "Here you can see the bitwise comparison mask representing the cryptographic variance between the payload bits and the cover characters. This binary visualization highlights how the steganographic engine applies XOR (Exclusive OR) masking logic to hide the data, ensuring the encoded bits blend into natural patterns of the cover text to avoid statistical anomalies.",
          ar: "هنا يمكنك رؤية قناع مقارنة البتّات الثنائي الذي يوضح التباين التشفيري بين بتّات الحمولة المخفية ورموز النص الحامل. يوضح هذا التمثيل الثنائي كيف يطبق محرك الإخفاء منطق بوابة XOR (أو الاستبعادية) لتغطية البيانات، مما يضمن دمج البتات المشفرة مع الأنماط الطبيعية لنص التغطية لتجنب أي شذوذ إحصائي.",
          zh: "在这里，您可以看到表示有效载荷位与封面字符之间加密差异的的按位比较掩码。这种二进制可视化展示了隐写引擎如何应用 XOR（异或）掩码逻辑来隐藏数据，确保编码位融入封面文本 of the 自然模式中，从而避免统计学上的异常特征。",
          fr: "Ici, vous pouvez voir le masque de comparaison binaire représentant la variance cryptographique entre les bits de la charge utile et les caractères du support. Cette visualisation binaire montre comment le moteur stéganographique applique une logique de masquage XOR (OU exclusif) pour dissimuler les données, garantissant que les bits codés se fondent dans les motifs naturels du texte.",
          la: "Hic personam binariam videre potes quae differentiam inter bit epistulae occultae et litteras portantis demonstrat. Haec repraesentatio ostendit quomodo machina steganographica logicam XOR adhibeat ad occultanda data, ut bit ordinata cum natura textus portantis congruant et anomaliam statisticam vitent."
        }
      },
      {
        element: '#val-vs-bytes-grid',
        placement: "top",
        title: {
          en: "Visual Steganography Hex Stream Matrix",
          ar: "مصفوفة التدفق الست عشري للستيجانوغرافي",
          zh: "视觉隐写十六进制流矩阵",
          fr: "Matrice de Flux Hexadécimal de Stéganographie",
          la: "Matrix Stream Hexae Steganographiae"
        },
        description: {
          en: "This panel shows a forensic, byte-by-byte breakdown of the injected Variation Selector (VS) Unicode characters. In our zero-overhead steganography system, we utilize invisible Unicode Variation Selector characters (from VS1 to VS16) to encode hidden binary bits. Each block represents one byte of the payload, allowing you to click and inspect the exact Unicode hex code, decimal value, and binary bits embedded.",
          ar: "تعرض هذه اللوحة تحليلاً تفصيلياً (بايت ببايت) لأحرف التعتيم والتبديل (Variation Selectors) لليونيكود المحقونة. في نظام الإخفاء ذو الحجم الصفري، نستخدم أحرف التعتيم غير المرئية (من VS1 إلى VS16) لتشفير البتّات الثنائية. يمثل كل مربع بايت واحد من الحمولة، ويمكنك النقر عليه لفحص رمز اليونيكود الست عشري الدقيق، قيمته العشرية، والبتات الثنائية المدمجة.",
          zh: "此面板显示了注入的变体选择器 (VS) Unicode 字符ের详细字节级取证分解。在我们的零开销隐写系统中，我们利用不可见的 Unicode 变体选择器字符（从 VS1 到 VS16）来编码隐藏的二进制位。每个区块代表有效载荷的一个字节，您可以点击并检查嵌入的精确 Unicode 十六进制代码、十进制值和二进制位。",
          fr: "Ce panneau montre une décomposition légale, octet par octet, des caractères Unicode Variation Selector (VS) injectés. Dans notre système de stéganographie sans surcoût, nous utilisons les sélecteurs de variation invisibles (de VS1 à VS16) pour coder les bits binaires masqués. Chaque bloc représente un octet de la charge utile, vous permettant de cliquer pour inspecter son code hexadécimal, sa valeur décimale et ses bits.",
          la: "Haec tabula deconstructum forense, byte post byte, litterarum Variation Selector (VS) Unicode injectarum demonstrat. In steganographia nostra sine onere, utimur litteris invisibilibus VS (a VS1 ad VS16) ad bit binarios occultandos. Singula capsa unum byte repraesentat; potes eam premere ut videas codicem hexam Unicode, valorem decimalem, et bit binarios insertos."
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

    // 1. Calculate initial coordinates and handle flipping if needed
    let finalPlacement = placement;

    if (placement === "top" && targetRect.top - tooltipHeight - padding < 16) {
      // Flip from top to bottom
      top = targetRect.bottom + padding;
      finalPlacement = "bottom";
    } else if (placement === "bottom" && targetRect.bottom + padding + tooltipHeight > viewportHeight - 16) {
      // Flip from bottom to top
      top = targetRect.top - tooltipHeight - padding;
      finalPlacement = "top";
    } else {
      // Keep original placement calculations
      switch (placement) {
        case "top":
          top = targetRect.top - tooltipHeight - padding;
          break;
        case "bottom":
          top = targetRect.bottom + padding;
          break;
        case "left":
        case "right":
          top = targetRect.top + (targetRect.height / 2) - (tooltipHeight / 2);
          break;
        default:
          top = targetRect.bottom + padding;
          break;
      }
    }

    // Apply left positioning based on resolved placement
    switch (placement) {
      case "top":
      case "bottom":
      default:
        left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
        break;
      case "left":
        left = targetRect.left - tooltipWidth - padding;
        break;
      case "right":
        left = targetRect.right + padding;
        break;
    }

    // Update data-placement attribute for arrow styling
    tooltipEl.setAttribute("data-placement", finalPlacement);

    // 2. Final Clamping Phase (guarantees bounds)
    // Clamp Left coordinates
    if (left < 16) {
      left = 16;
    } else if (left + tooltipWidth > viewportWidth - 16) {
      left = viewportWidth - tooltipWidth - 16;
    }

    // Clamp Top coordinates (run after potential flips)
    if (top < 16) {
      top = 16;
    } else if (top + tooltipHeight > viewportHeight - 16) {
      top = viewportHeight - tooltipHeight - 16;
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
      const hasActiveTour = (pageName === "embed" || pageName === "extract" || pageName === "steganalysis" || pageName === "details");
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
    } else if (pageName === "steganalysis") {
      tourKey = "steganalysis";
    } else if (pageName === "details") {
      tourKey = "details";
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
    const hasActiveTour = (pageName === "embed" || pageName === "extract" || pageName === "steganalysis" || pageName === "details");
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
