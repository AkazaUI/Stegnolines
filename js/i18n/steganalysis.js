/**
 * STEGNOLINES — Text Steganalysis Page Translations
 * Page-specific translation keys for the steganalysis analysis interface.
 */
const I18N_STEGANALYSIS = {
  en: {
    // Page header
    steganalysisMainTitle: "Text Steganalysis",
    steganalysisMainSubtitle: "Analyze text for hidden Unicode characters that may indicate steganographic content — without extracting the hidden message.",

    // Input section
    steganalysisCardTitle: "Analysis Workflow",
    steganalysisTextareaLabel: "Input Text",
    steganalysisTextareaPlaceholder: "Paste any chat message or text here to scan for hidden Unicode characters...",
    steganalysisBadgeInput: "Analyze",
    btnAnalyzeText: "Analyze Text",

    // Results section
    steganalysisResultsTitle: "Analysis Results",
    steganalysisResultsSubtitle: "Hidden character detection report for the provided text.",
    visualMapTitle: "Visual Diff Mapped Text",

    // Metric cards
    metricTotalHidden: "Hidden Characters",
    metricDistinctTypes: "Distinct Types",
    metricAnalysisTime: "Analysis Duration",

    // Risk levels
    riskClean: "Clean",
    riskLow: "Low Risk",
    riskMedium: "Medium Risk",
    riskHigh: "High Risk",
    riskCritical: "Critical",

    // Results table
    tableColIndex: "#",
    tableColName: "Character Name",
    tableColHex: "Hex Code",
    tableColCategory: "Category",
    tableColPosition: "Position",
    tableColContext: "Context",
    markerHiddenText: "Hidden",

    // Categories
    catZeroWidth: "Zero-Width",
    catDirectional: "Directional",
    catSpace: "Special Space",
    catVariationSelector: "Variation Selector",
    catMongolianFVS: "Mongolian FVS",
    catBOM: "Byte Order Mark",
    catNormalSpace: "Normal Space",

    // Empty / clean state
    steganalysisCleanTitle: "No Hidden Characters Detected",
    steganalysisCleanSubtitle: "The analyzed text appears clean — no suspicious Unicode characters were found.",
    steganalysisEmptyInput: "Please paste or type text to analyze.",

    // Summary
    steganalysisSummaryLabel: "Verdict",
    steganalysisSummaryClean: "This text does not contain any detectable hidden Unicode characters.",
    steganalysisSummaryFound: "hidden character(s) detected across",
    steganalysisSummaryTypes: "distinct type(s).",
    steganalysisBadgeResult: "Result",

    // Pagination
    pageGoTo: "Go to page",
    pageConfirm: "confirm",
    pagePrev: "Previous",
    pageNext: "Next",
    steganalysisAnalyzing: "Analyzing...",
    steganalysisCompleted: "Analysis completed successfully."
  },

  ar: {
    steganalysisMainTitle: "تحليل النص",
    steganalysisMainSubtitle: "تحليل النص بحثاً عن أحرف يونيكود مخفية قد تشير إلى محتوى مُضمّن — دون استخراج الرسالة المخفية.",

    steganalysisCardTitle: "سير عمل التحليل",
    steganalysisTextareaLabel: "النص المدخل",
    steganalysisTextareaPlaceholder: "الصق أي رسالة محادثة أو نص هنا لفحصه بحثاً عن أحرف يونيكود مخفية...",
    steganalysisBadgeInput: "تحليل",
    btnAnalyzeText: "تحليل النص",

    steganalysisResultsTitle: "نتائج التحليل",
    steganalysisResultsSubtitle: "تقرير الكشف عن الأحرف المخفية في النص المُقدّم.",
    visualMapTitle: "مخطط مقارنة الفروق المرئية للنص",


    metricTotalHidden: "أحرف مخفية",
    metricDistinctTypes: "أنواع مميزة",
    metricAnalysisTime: "مدة التحليل",

    riskClean: "نظيف",
    riskLow: "خطر منخفض",
    riskMedium: "خطر متوسط",
    riskHigh: "خطر عالٍ",
    riskCritical: "حرج",

    tableColIndex: "#",
    tableColName: "اسم الرمز",
    tableColHex: "الكود السداسي",
    tableColCategory: "الفئة",
    tableColPosition: "الموقع",
    tableColContext: "السياق",
    markerHiddenText: "مخفي",


    catZeroWidth: "عرض صفري",
    catDirectional: "اتجاهي",
    catSpace: "مسافة خاصة",
    catVariationSelector: "محدد تنوع",
    catMongolianFVS: "FVS منغولي",
    catBOM: "علامة ترتيب البايت",
    catNormalSpace: "مسافة عادية",

    steganalysisCleanTitle: "لم يتم كشف أحرف مخفية",
    steganalysisCleanSubtitle: "يبدو النص المُحلّل نظيفاً — لم يتم العثور على أحرف يونيكود مشبوهة.",
    steganalysisEmptyInput: "يرجى لصق أو كتابة نص للتحليل.",

    steganalysisSummaryLabel: "الحُكم",
    steganalysisSummaryClean: "هذا النص لا يحتوي على أي أحرف يونيكود مخفية قابلة للكشف.",
    steganalysisSummaryFound: "حرف(أحرف) مخفية تم كشفها عبر",
    steganalysisSummaryTypes: "نوع(أنواع) مميزة.",
    steganalysisBadgeResult: "النتيجة",

    // Pagination
    pageGoTo: "اذهب إلى صفحة",
    pageConfirm: "تأكيد",
    pagePrev: "السابق",
    pageNext: "التالي",
    steganalysisAnalyzing: "جاري التحليل...",
    steganalysisCompleted: "تم اكتمال التحليل بنجاح."
  },

  fr: {
    steganalysisMainTitle: "Stéganalyse de texte",
    steganalysisMainSubtitle: "Analyser le texte pour détecter les caractères Unicode cachés pouvant indiquer un contenu stéganographique — sans extraire le message caché.",

    steganalysisCardTitle: "Flux d'analyse",
    steganalysisTextareaLabel: "Texte d'entrée",
    steganalysisTextareaPlaceholder: "Collez un message ou un texte ici pour rechercher les caractères Unicode cachés...",
    steganalysisBadgeInput: "Analyser",
    btnAnalyzeText: "Analyser le texte",

    steganalysisResultsTitle: "Résultats de l'analyse",
    steganalysisResultsSubtitle: "Rapport de détection des caractères cachés dans le texte fourni.",
    visualMapTitle: "Carte visuelle du texte médico-légal",

    metricTotalHidden: "Caractères cachés",
    metricDistinctTypes: "Types distincts",
    metricAnalysisTime: "Durée de l'analyse",

    riskClean: "Propre",
    riskLow: "Risque faible",
    riskMedium: "Risque moyen",
    riskHigh: "Risque élevé",
    riskCritical: "Critique",

    tableColIndex: "#",
    tableColName: "Nom du caractère",
    tableColHex: "Code hexadécimal",
    tableColCategory: "Catégorie",
    tableColPosition: "Position",
    tableColContext: "Contexte",
    markerHiddenText: "Caché",
 
    catZeroWidth: "Largeur zéro",
    catDirectional: "Directionnel",
    catSpace: "Espace spécial",
    catVariationSelector: "Sélecteur de variation",
    catMongolianFVS: "FVS mongol",
    catBOM: "Marque d'ordre des octets",
    catNormalSpace: "Espace normal",
 
    steganalysisCleanTitle: "Aucun caractère caché détecté",
    steganalysisCleanSubtitle: "Le texte analysé semble propre — aucun caractère Unicode suspect n'a été trouvé.",
    steganalysisEmptyInput: "Veuillez coller ou saisir un texte à analyser.",
 
    steganalysisSummaryLabel: "Verdict",
    steganalysisSummaryClean: "Ce texte ne contient aucun caractère Unicode caché détectable.",
    steganalysisSummaryFound: "caractère(s) caché(s) détecté(s) parmi",
    steganalysisSummaryTypes: "type(s) distinct(s).",
    steganalysisBadgeResult: "Résultat",
 
    // Pagination
    pageGoTo: "Aller à la page",
    pageConfirm: "confirmer",
    pagePrev: "Précédent",
    pageNext: "Suivant",
    steganalysisAnalyzing: "Analyse en cours...",
    steganalysisCompleted: "Analyse complétée avec succès."
  },
 
  zh: {
    steganalysisMainTitle: "文本隐写分析",
    steganalysisMainSubtitle: "分析文本中隐藏的Unicode字符，可能表示隐写内容 — 不提取隐藏的消息。",
 
    steganalysisCardTitle: "分析流程",
    steganalysisTextareaLabel: "输入文本",
    steganalysisTextareaPlaceholder: "在此粘贴任何聊天消息或文本以扫描隐藏的Unicode字符...",
    steganalysisBadgeInput: "分析",
    btnAnalyzeText: "分析文本",
 
    steganalysisResultsTitle: "分析结果",
    steganalysisResultsSubtitle: "提供的文本中隐藏字符的检测报告。",
    visualMapTitle: "视觉法医文本地图",
 
    metricTotalHidden: "隐藏字符",
    metricDistinctTypes: "不同类型",
    metricAnalysisTime: "分析持续时间",
 
    riskClean: "干净",
    riskLow: "低风险",
    riskMedium: "中等风险",
    riskHigh: "高风险",
    riskCritical: "严重",
 
    tableColIndex: "#",
    tableColName: "字符名称",
    tableColHex: "十六进制代码",
    tableColCategory: "类别",
    tableColPosition: "位置",
    tableColContext: "上下文",
    markerHiddenText: "隐藏",
 
    catZeroWidth: "零宽度",
    catDirectional: "方向性",
    catSpace: "特殊空格",
    catVariationSelector: "变体选择器",
    catMongolianFVS: "蒙古语FVS",
    catBOM: "字节顺序标记",
    catNormalSpace: "普通空格",
 
    steganalysisCleanTitle: "未检测到隐藏字符",
    steganalysisCleanSubtitle: "分析的文本看起来很干净 — 未发现可疑的Unicode字符。",
    steganalysisEmptyInput: "请粘贴或输入要分析的文本。",
 
    steganalysisSummaryLabel: "判定",
    steganalysisSummaryClean: "此文本不包含任何可检测到的隐藏Unicode字符。",
    steganalysisSummaryFound: "个隐藏字符被检测到，跨越",
    steganalysisSummaryTypes: "种不同类型。",
    steganalysisBadgeResult: "结果",
 
    // Pagination
    pageGoTo: "转到第",
    pageConfirm: "确认",
    pagePrev: "上一页",
    pageNext: "下一页",
    steganalysisAnalyzing: "分析中...",
    steganalysisCompleted: "分析成功完成。"
  },
 
  la: {
    steganalysisMainTitle: "Steganalysis Textus",
    steganalysisMainSubtitle: "Analysin textum pro characteribus Unicode occultis quae contentum steganographicum indicare possunt — sine extractione nuntii occulti.",
 
    steganalysisCardTitle: "Processus Analyseos",
    steganalysisTextareaLabel: "Textus Input",
    steganalysisTextareaPlaceholder: "Affige nuntium aut textum hic ut characteres Unicode occultos scruteris...",
    steganalysisBadgeInput: "Analysin",
    btnAnalyzeText: "Analysin Textum",
 
    steganalysisResultsTitle: "Resultata Analyseos",
    steganalysisResultsSubtitle: "Relatio detectionis characterum occultorum in textu dato.",
    visualMapTitle: "Tabula Visualis Textus Forensis",
 
    metricTotalHidden: "Characteres Occulti",
    metricDistinctTypes: "Genera Distincta",
    metricAnalysisTime: "Duratio Analyseos",
 
    riskClean: "Mundus",
    riskLow: "Periculum Parvum",
    riskMedium: "Periculum Medium",
    riskHigh: "Periculum Altum",
    riskCritical: "Criticum",
 
    tableColIndex: "#",
    tableColName: "Nomen Characteris",
    tableColHex: "Codex Hexadecimalis",
    tableColCategory: "Categoria",
    tableColPosition: "Positio",
    tableColContext: "Contextus",
    markerHiddenText: "Occultus",



    catZeroWidth: "Latitudo Nulla",
    catDirectional: "Directionalis",
    catSpace: "Spatium Speciale",
    catVariationSelector: "Selector Variationis",
    catMongolianFVS: "FVS Mongolicus",
    catBOM: "Signum Ordinis",
    catNormalSpace: "Spatium Normale",

    steganalysisCleanTitle: "Nulli characteres occulti detecti",
    steganalysisCleanSubtitle: "Textus analysatus mundus apparet — nulli characteres Unicode suspecti inventi sunt.",
    steganalysisEmptyInput: "Quaeso affige aut scribe textum ad analysin.",

    steganalysisSummaryLabel: "Iudicium",
    steganalysisSummaryClean: "Hic textus nullos characteres Unicode occultos detectabiles continet.",
    steganalysisSummaryFound: "character(es) occulti detecti per",
    steganalysisSummaryTypes: "genus(genera) distinctum(a).",
    steganalysisBadgeResult: "Resultatum",

    // Pagination
    pageGoTo: "I ad paginam",
    pageConfirm: "confirmare",
    pagePrev: "Praecedens",
    pageNext: "Sequens",
    steganalysisAnalyzing: "Analysans...",
    steganalysisCompleted: "Analysis prospere peracta est."
  }
};
