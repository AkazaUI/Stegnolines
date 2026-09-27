const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DOC_ORDER = [
  'getting-started/overview',
  'getting-started/architecture',
  'getting-started/components',
  'user-guide/embedding',
  'user-guide/extraction',
  'user-guide/capacity-and-hints',
  'user-guide/chat-integration',
  'user-guide/variation-selectors',
  'user-guide/extraction-guide',
  'technical-reference/pipeline',
  'technical-reference/literature-review',
  'technical-reference/experimental-results',
  'technical-reference/security',
  'technical-reference/threat-model',
  'technical-reference/algorithms',
  'technical-reference/configuration',
  'technical-reference/glossary',
  'technical-reference/extraction-engine',
  'development/project-structure',
  'development/writing-docs'
];

const METADATA = {
  'getting-started/overview': {
    category: { en: 'Getting started', ar: 'البداية السريعة' },
    name: { en: 'Overview', ar: 'نظرة عامة وبيان المشكلة' },
    title: { en: 'StegoLines — Overview', ar: 'السطور المخفية — نظرة عامة' }
  },
  'getting-started/architecture': {
    category: { en: 'Getting started', ar: 'البداية السريعة' },
    name: { en: 'Architecture', ar: 'البنية الهيكلية للمنظومة' },
    title: { en: 'StegoLines — Architecture', ar: 'السطور المخفية — البنية الهيكلية' }
  },
  'getting-started/components': {
    category: { en: 'Getting started', ar: 'البداية السريعة' },
    name: { en: 'Components', ar: 'مكونات النظام الأساسية' },
    title: { en: 'StegoLines — Components', ar: 'السطور المخفية — مكونات المنظومة' }
  },
  'user-guide/embedding': {
    category: { en: 'User guide', ar: 'دليل المستخدم' },
    name: { en: 'Embedding messages', ar: 'سير عمل التضمين والإخفاء' },
    title: { en: 'StegoLines — Embedding Messages', ar: 'السطور المخفية — التضمين والإخفاء' }
  },
  'user-guide/extraction': {
    category: { en: 'User guide', ar: 'دليل المستخدم' },
    name: { en: 'Extracting messages', ar: 'سير عمل الاستخراج وفك الإخفاء' },
    title: { en: 'StegoLines — Extracting Messages', ar: 'السطور المخفية — استخراج النصوص' }
  },
  'user-guide/capacity-and-hints': {
    category: { en: 'User guide', ar: 'دليل المستخدم' },
    name: { en: 'Capacity & hints', ar: 'سعة التضمين وبروتوكول التلميحات' },
    title: { en: 'StegoLines — Capacity & Hints', ar: 'السطور المخفية — السعة والتلميحات' }
  },
  'user-guide/chat-integration': {
    category: { en: 'User guide', ar: 'دليل المستخدم' },
    name: { en: 'Chat platform integration', ar: 'التكامل مع منصات المحادثة' },
    title: { en: 'StegoLines — Chat Platform Integration', ar: 'السطور المخفية — التكامل مع المحادثات' }
  },
  'user-guide/variation-selectors': {
    category: { en: 'User guide', ar: 'دليل المستخدم' },
    name: { en: 'Variation Selectors & UTF-8 Spec', ar: 'محددات التنوع ومواصفات الترميز' },
    title: { en: 'StegoLines — Variation Selectors & UTF-8 Spec', ar: 'السطور المخفية — محددات التنوع' }
  },
  'user-guide/extraction-guide': {
    category: { en: 'User guide', ar: 'دليل المستخدم' },
    name: { en: 'Zero-Key Extraction Guide', ar: 'دليل التحليل الجنائي بدون مفتاح' },
    title: { en: 'StegoLines — Extraction Guide', ar: 'السطور المخفية — دليل التحليل الجنائي' }
  },
  'technical-reference/pipeline': {
    category: { en: 'Technical reference', ar: 'المرجع التقني' },
    name: { en: 'Steganography pipeline', ar: 'الصياغة الرياضية لخط الأنابيب' },
    title: { en: 'StegoLines — Steganography Pipeline', ar: 'السطور المخفية — خط الأنابيب الرياضي' }
  },
  'technical-reference/literature-review': {
    category: { en: 'Technical reference', ar: 'المرجع التقني' },
    name: { en: 'Literature Review & Prior Art Matrix', ar: 'مراجعة الأدبيات والدراسات السابقة' },
    title: { en: 'StegoLines — Literature Review & Prior Art', ar: 'السطور المخفية — مراجعة الأدبيات' }
  },
  'technical-reference/experimental-results': {
    category: { en: 'Technical reference', ar: 'المرجع التقني' },
    name: { en: 'Experimental Results & Benchmarks', ar: 'النتائج التجريبية ومقاييس الأداء' },
    title: { en: 'StegoLines — Experimental Results & Benchmarks', ar: 'السطور المخفية — النتائج التجريبية' }
  },
  'technical-reference/security': {
    category: { en: 'Technical reference', ar: 'المرجع التقني' },
    name: { en: 'Security model', ar: 'النموذج الأمني ومحاكاة الهجمات' },
    title: { en: 'StegoLines — Security Model', ar: 'السطور المخفية — النموذج الأمني' }
  },
  'technical-reference/threat-model': {
    category: { en: 'Technical reference', ar: 'المرجع التقني' },
    name: { en: 'Threat Modeling & Mitigation Matrix', ar: 'مصفوفة نمذجة التهديدات' },
    title: { en: 'StegoLines — Threat Model', ar: 'السطور المخفية — نمذجة التهديدات' }
  },
  'technical-reference/algorithms': {
    category: { en: 'Technical reference', ar: 'المرجع التقني' },
    name: { en: 'System Algorithms & Pseudo-Code', ar: 'الخوارزميات والكود الزائف' },
    title: { en: 'StegoLines — Algorithms & Pseudo-Code', ar: 'السطور المخفية — الخوارزميات والكود الزائف' }
  },
  'technical-reference/configuration': {
    category: { en: 'Technical reference', ar: 'المرجع التقني' },
    name: { en: 'Configuration options', ar: 'خيارات التكوين والإعدادات' },
    title: { en: 'StegoLines — Configuration Options', ar: 'السطور المخفية — خيارات التكوين' }
  },
  'technical-reference/glossary': {
    category: { en: 'Technical reference', ar: 'المرجع التقني' },
    name: { en: 'Terms, Acronyms & Scientific References', ar: 'قاموس المصطلحات والمراجع' },
    title: { en: 'StegoLines — Terms & References', ar: 'السطور المخفية — قاموس المصطلحات' }
  },
  'technical-reference/extraction-engine': {
    category: { en: 'Technical reference', ar: 'المرجع التقني' },
    name: { en: 'Extraction Engine Architecture', ar: 'بنية محرك استخراج الرسائل' },
    title: { en: 'StegoLines — Extraction Engine', ar: 'السطور المخفية — محرك الاستخراج' }
  },
  'development/project-structure': {
    category: { en: 'Development', ar: 'التطوير' },
    name: { en: 'Project structure', ar: 'هيكلية وبنية ملفات المشروع' },
    title: { en: 'StegoLines — Project Structure', ar: 'السطور المخفية — بنية المشروع' }
  },
  'development/writing-docs': {
    category: { en: 'Development', ar: 'التطوير' },
    name: { en: 'Writing documentation', ar: 'معايير كتابة وتوثيق المنظومة' },
    title: { en: 'StegoLines — Writing Documentation', ar: 'السطور المخفية — كتابة التوثيق' }
  }
};

function loadArticlesData() {
  const articlesData = { en: {}, ar: {} };
  const rootDir = path.resolve(__dirname, '..', '..', '..');

  // 1. Load Arabic translations from i18n/dictionaries/docs-articles.js
  const docsArticlesPath = path.join(rootDir, 'i18n', 'dictionaries', 'docs-articles.js');
  if (fs.existsSync(docsArticlesPath)) {
    const code = fs.readFileSync(docsArticlesPath, 'utf8');
    const sandbox = { window: {} };
    vm.createContext(sandbox);
    try {
      vm.runInContext(code, sandbox);
      if (sandbox.window && sandbox.window.I18N_DOCS_ARTICLES && sandbox.window.I18N_DOCS_ARTICLES.ar) {
        articlesData.ar = sandbox.window.I18N_DOCS_ARTICLES.ar;
      }
    } catch (e) {
      console.error('[docsData] Error loading Arabic docs articles:', e.message);
    }
  }

  // 2. Load English content directly from docs/
  const docsBaseDir = path.join(rootDir, 'docs');
  function walkDocFiles(dir) {
    if (!fs.existsSync(dir)) return;
    const list = fs.readdirSync(dir);
    for (const item of list) {
      const full = path.join(dir, item);
      if (fs.statSync(full).isDirectory()) {
        walkDocFiles(full);
      } else if (item.endsWith('.html')) {
        const relKey = path.relative(docsBaseDir, full).replace(/\\/g, '/').replace('.html', '');
        const htmlContent = fs.readFileSync(full, 'utf8');
        const match = htmlContent.match(/<article class="docs-article">([\s\S]*?)<\/article>/i);
        if (match) {
          articlesData.en[relKey] = match[1].trim();
        }
      }
    }
  }
  walkDocFiles(docsBaseDir);

  return articlesData;
}

module.exports = function() {
  const articlesJson = loadArticlesData();
  const result = [];

  // Targets:
  // 1. Root English: /docs/{slug}.html
  // 2. Localized Arabic: /ar/docs/{slug}.html
  const targets = [
    { lang: 'en', isRoot: true, prefix: '' },
    { lang: 'ar', isRoot: false, prefix: '/ar' }
  ];

  for (const target of targets) {
    const lang = target.lang;
    const isRoot = target.isRoot;
    const articles = articlesJson[lang] || {};

    for (let i = 0; i < DOC_ORDER.length; i++) {
      const slug = DOC_ORDER[i];
      const rawContent = articles[slug];
      if (!rawContent) continue;

      const meta = METADATA[slug] || {
        category: { en: 'Documentation', ar: 'التوثيق' },
        name: { en: slug, ar: slug },
        title: { en: 'StegoLines — Documentation', ar: 'السطور المخفية — التوثيق' }
      };

      const prevSlug = i > 0 ? DOC_ORDER[i - 1] : null;
      const nextSlug = i < DOC_ORDER.length - 1 ? DOC_ORDER[i + 1] : null;

      const docRelBase = '../../docs/';

      const prev = prevSlug ? {
        slug: prevSlug,
        name: (METADATA[prevSlug] && METADATA[prevSlug].name[lang]) ? METADATA[prevSlug].name[lang] : prevSlug,
        url: `${docRelBase}${prevSlug}.html`
      } : null;

      const next = nextSlug ? {
        slug: nextSlug,
        name: (METADATA[nextSlug] && METADATA[nextSlug].name[lang]) ? METADATA[nextSlug].name[lang] : nextSlug,
        url: `${docRelBase}${nextSlug}.html`
      } : null;

      const permalink = isRoot
        ? `/docs/${slug}.html`
        : `/${lang}/docs/${slug}.html`;

      result.push({
        lang,
        dir: lang === 'ar' ? 'rtl' : 'ltr',
        slug,
        isRoot,
        permalink,
        category: meta.category[lang],
        name: meta.name[lang],
        title: meta.title[lang],
        content: rawContent,
        prev,
        next
      });
    }
  }

  return result;
};
