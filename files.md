Embding-Algo/                          
├── embed.html                         
├── extract.html                       
├── about us.html                      
├── contact team.html                  
├── details.html                       (لوحة التحليلات العميقة والتشخيصات الفنية)
├── steganalysis.html                  (صفحة تحليل النصوص الاسترجاعية)
├── New_styles.css                     (ملف جسر التوجيه للملفات القديمة - يستدعي css/main.css)
├── documentation.css                  (ملف قديم مهمل وفارغ - تم نقل محتوياته إلى docs.css)
│
├── assets/                            (مجلد الأصول والوسائط والماركة)
│   ├── brand/
│   │   ├── favicon.png                (أيقونة الموقع الافتراضية الموحدة لجميع الصفحات)
│   │   ├── logo-dark.png & logo-light.png
│   │   └── favicon-perfect-64.png & ... (باقي أحجام الأيقونات)
│   └── media/                         (الصور والوسائط العامة للموقع)
│
├── css/                               (مجلد التنسيقات المنظم والمبني بصيغة الموديولار)
│   ├── main.css                       (الملف المركزي الذي يستورد جميع التنسيقات والصفحات)
│   ├── tokens.css & reset.css & layout.css
│   ├── components/                    (المكونات الذرية القابلة لإعادة الاستخدام)
│   │   ├── navbar.css, buttons.css, inputs.css, cards.css, settings-modal.css ...
│   └── pages/                         (التنسيقات المخصصة لكل صفحة على حدة)
│       ├── embed.css                  (جميع تنسيقات صفحة الإخفاء مدمجة بما فيها حركات الإعدادات المتقدمة)
│       ├── extract.css                (جميع تنسيقات صفحة الاستخراج والماسح التفاعلي للدردشات)
│       ├── details.css & docs.css & steganalysis.css
│
├── js/                                (مجلد البرمجيات الذكي والموزع المهام)
│   ├── shared/                        (أكواد جافا سكريبت المشتركة والمساعدة للواجهات)
│   │   ├── ui-helpers.js, theme-manager.js, text_codec.js, template-loader.js
│   ├── core/                          (المحركات الحسابية والخوارزميات الأساسية للتشفير والضغط)
│   │   ├── crypto/ (aes-ctr.js & sha256.js)
│   │   ├── compression/ (wasm-engine.js & brotli-service.js & avif/...)
│   │   └── stego/ (vs-codec.js & payload-codec.js & stego-composer.js ...)
│   └── features/                      (المتحكمات التفاعلية للواجهات - المستخرجة حديثاً)
│       ├── embed-controller.js        (مستمعي الأحداث لواجهة إخفاء النصوص وإعدادات الأمان)
│       ├── image-embed-controller.js  (معالجة الصور وحذف EXIF واستدعاء ضغط AVIF WASM)
│       ├── extract-controller.js      (منطق واجهة استخراج النصوص ومستمعي الألوان واللغات)
│       ├── image-extract-controller.js(منطق فك تشفير استخراج الصور ومؤقتات الفك)
│       └── chat-scanner-controller.js (منطق ماسح الدردشات التفاعلي وحواجز المنصات)
├── docs/                              (مجلد وثائق التطوير ومستندات التشغيل للمشروع)
└── stegnolines_ui_library/            (مكتبة قوالب واجهات المستخدم المنعزلة للتجربة)