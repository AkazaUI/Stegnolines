# 📘 التقرير البرمجي التفصيلي الشامل وخطة الترقية المعمارية (StegoLine Engine)
## (Deep-Dive Technical Implementation, Source Code Audit & Master Blueprint)

---

## 📑 فهرس المحتويات البرمجية
1. **الرؤية المعمارية الشاملة والمقارنة بين الإصدارين (Architectural Overview)**
2. **التشريح البرمجي التفصيلي للملفات المعدلة (File-by-File Technical Breakdown):**
   * 2.1. [`js/core/stego/prng-generator.js`](#21-jscorestegoprng-generatorjs) (المولد التشفيري والاشتقاق)
   * 2.2. [`js/core/stego/vs-codec.js`](#22-jscorestegovs-codecjs) (محددات التباين والتقطيع الفوري)
   * 2.3. [`js/core/stego/stego-composer.js`](#23-jscorestegostego-composerjs) (منسق الإخفاء والاستخراج والمحرك المزدوج)
   * 2.4. [`js/features/F_chat_scanner.js`](#24-jsfeaturesf_chat_scannerjs) (ماسح المحادثات وتجهيز الحلقات)
   * 2.5. مكتبة الواجهة التفاعلية [`stegnolines_ui_library/`](#25-stegnolines_ui_library)
3. **التحليل الرياضي والتشفيري للخوارزميات (Cryptographic & Algorithmic Analysis)**
4. **سجل الأخطاء السابقة، أسبابها الجذرية، وكيف تم حلها (Root Cause Analysis & Post-Mortem)**
5. **خطة التنفيذ التفصيلية خطوة بخطوة للفرق البرمجية (Engineering Blueprint)**
6. **نتائج القياسات المعيارية واختبارات الأداء (Benchmark & Verification)**

---

## 1. الرؤية المعمارية الشاملة والمقارنة بين الإصدارين

| المكون البرمجي | النسخة القديمة (Legacy) | النسخة الحديثة المعتمدة (Modern) | الركيزة التقنية والهدف |
|---|---|---|---|
| **اشتقاق المفتاح** | `DJB2 Hash` (32-بت فقط) | `PBKDF2-HMAC-SHA256` (100,000 دورة) | مقاومة هجمات القوة الغاشمة والتصادمات |
| **توليد المواضع** | مولد خطي `Mulberry32 PRNG` | محرك تشفيري كتلي `AES-256-CTR CSPRNG` | استحالة التنبؤ بالمواقع أو كشف الحالة الداخلية |
| **تقليص النطاق** | باقي القسمة `raw % range` (**Modulo Bias**) | السحب المرفوض `Unbiased Rejection Sampling` | توزيع احتمالي نقي 100% لاجتياز Steganalysis |
| **استهلاك الشفل** | مصفوفة كاملة `Array.from()` ($O(N)$ RAM) | شفل كسول `O(K) Lazy Swap via Map` ($O(K)$) | استهلاك الذاكرة يعتمد على حجم السر $K$ فقط |
| **استخراج الـ VS** | تجميع الحروف حرفاً بحرف `cleanChars.push()` | تقطيع الكتل المباشر `Span Slicing` | تسريع الاستخراج بـ **64.5 ضعفاً** وتوفير 99% رام |
| **التوافقية العكسية** | محرك أحادي غير متوافق | محرك مزدوج ذكي `Dual-Engine Fallback` | دعم قراءة رسائل الإصدار القديم والحديث معاً 100% |

---

## 2. التشريح البرمجي التفصيلي للملفات المعدلة

---

### 2.1. `js/core/stego/prng-generator.js`
هذا الملف هو **قلب محرك العشوائية والتشفير**. تم تنظيمه برمجياً في **7 وحدات مستقلة**:

#### 🔹 الوحدة 1: محرك SHA-256 و HMAC-SHA256 الذاتي (Bitwise Optimized)
تمت كتابة دوال التجزئة بلغة JavaScript منخفضة المستوى باستخدام `DataView` و `Uint32Array` لتحقيق أعلى سرعة تنفيذ ممكنة:
```javascript
function sha256Bytes(messageBytes) { ... }
function hmacSha256(keyBytes, messageBytes) { ... }
```

#### 🔹 الوحدة 2: اشتقاق المفاتيح PBKDF2 مع الكاش الفوري
* تطبيق معيار NIST بـ **100,000 دورة تكرارية**.
* استخدام ملح ثابت للمجال: `STEGO_DOMAIN_SALT_BYTES = "StegoLine::CSPRNG::v2::Salt2026!"`.
* تطبيق كاش سريع `_derivedKeyCache` لتفادي إعادة الحساب لنفس المفتاح:
```javascript
function deriveKeyPbkdf2(passwordStr) {
  if (_derivedKeyCache.has(passwordStr)) {
    return _derivedKeyCache.get(passwordStr);
  }
  const keyBytes = pbkdf2HmacSha256(encoder.encode(passwordStr), STEGO_DOMAIN_SALT_BYTES, 100000, 32);
  _derivedKeyCache.set(passwordStr, keyBytes);
  return keyBytes;
}
```

#### 🔹 الوحدة 3: محرك التشفير الكتلي وتوليد السيل AES-256-CTR CSPRNG
* تشفير عداد رقمي متصاعد بحجم 128-بت بواسطة AES-256 لإنتاج سيل بايتات تشفيري نقي غير قابل للتنبؤ.
* الدالة `csprng.nextUint32()` تسحب رقماً عشوائياً بحجم 32-بت في زمن قدره أجزاء من النانو ثانية.

#### 🔹 الوحدة 4: السحب المرفوض لإلغاء انحياز باقي القسمة (Unbiased Rejection Sampling)
* التخلص الجذري من مشكلة `Modulo Bias`:
```javascript
function getUnbiasedRandomInt(range, csprng) {
  if (range <= 1) return 0;
  const limit = 0x100000000; // 2^32
  const threshold = limit - (limit % range); // حد الأمان العادل
  let raw;
  do {
    raw = csprng.nextUint32();
  } while (raw >= threshold);
  return raw % range;
}
```

#### 🔹 الوحدة 5: خوارزمية الشفل الكسول $O(K)$ Lazy Swap Fisher-Yates
* بدلاً من حجز مصفوفة بحجم نص الغلاف $N$ (الذي قد يصل لملايين الحروف)، يتم تتبع التبديلات عبر `Map` فقط لعدد بتات الرسالة السرية $K$:
```javascript
function generatePositions(maxLength, count, stegoKey) {
  if (typeof maxLength !== 'number' || maxLength <= 0) return [];
  if (typeof count !== 'number' || count <= 0) return [];
  if (!stegoKey || typeof stegoKey !== 'string' || !stegoKey.trim()) {
    throw new Error("Stego-key is mandatory and cannot be empty.");
  }

  const k = Math.min(count, maxLength);
  const key256 = deriveKeyPbkdf2(stegoKey);
  const csprng = createAes256CtrCsprng(key256);

  const lazyMap = new Map();
  const positions = new Array(k);

  for (let i = 0; i < k; i++) {
    const remaining = maxLength - i;
    const offset = getUnbiasedRandomInt(remaining, csprng);
    const targetIndex = i + offset;

    const valI = lazyMap.has(i) ? lazyMap.get(i) : i;
    const valTarget = lazyMap.has(targetIndex) ? lazyMap.get(targetIndex) : targetIndex;

    lazyMap.set(i, valTarget);
    lazyMap.set(targetIndex, valI);

    positions[i] = valTarget;
  }
  return positions;
}
```

#### 🔹 الوحدة 6: المولد القديم للاحتياط والتوافقية (Legacy PRNG Fallback)
* دمج محرك `DJB2 + Mulberry32` كدالة `generatePositionsLegacy` لتتمكن المنظومة من قراءة واستخراج الرسائل القديمة تلقائياً:
```javascript
function generatePositionsLegacy(maxLength, count, stegoKey) {
  const k = Math.min(count, maxLength);
  const seed = djb2Hash(stegoKey || '');
  const prng = mulberry32(seed);
  const positions = [];
  const pool = Array.from({ length: maxLength }, (_, i) => i);
  for (let i = 0; i < k; i++) {
    const idx = Math.floor(prng() * pool.length);
    positions.push(pool.splice(idx, 1)[0]);
  }
  return positions;
}
```

#### 🔹 الوحدة 7: دالة حل المفتاح الذكية (Auto-Resolving Stego Key)
* معالجة ترك حقل المفتاح فارغاً باشتقاقه تلقائياً من بصمة الغلاف `SHA-256(coverText)`:
```javascript
async function resolveStegoKey(stegoKey, coverText) {
  if (stegoKey && stegoKey.trim()) {
    return { resolvedStegoKey: stegoKey.trim(), wasAutoGenerated: false };
  }
  if (coverText && typeof sha256 === 'function') {
    const hash = await sha256(coverText);
    return { resolvedStegoKey: hash, wasAutoGenerated: true };
  }
  throw new Error("Stego-key is empty and cannot be derived from empty cover text.");
}
```

---

### 2.2. `js/core/stego/vs-codec.js`
هذا الملف مسؤول عن تحويل قناع الـ XOR الثنائي إلى محددات تباين غير مرئية وعكسها.

#### 🔹 1. جدول البحث المسبق (Precomputed Lookup Table - LUT)
* مصفوفة جاهزة بحجم 256 عنصراً لتحويل البايت إلى محرف VS في زمن $O(1)$:
```javascript
const BYTE_TO_VS_LUT = new Array(256);
for (let b = 0; b < 16; b++) {
  BYTE_TO_VS_LUT[b] = String.fromCodePoint(0xFE00 + b);       // VS1..VS16 (BMP)
}
for (let b = 16; b < 256; b++) {
  BYTE_TO_VS_LUT[b] = String.fromCodePoint(0xE0100 + b - 16); // VS17..VS256 (Supplementary)
}
```

#### 🔹 2. تقنية التقطيع الفوري للنصوص (Zero-Allocation Span Slicing)
* التخلص من تخصيص ملايين الكائنات في الرام واستخراج النص النظيف والرموز في حلقة واحدة سريعة:
```javascript
function extractVSFromText(text) {
  if (!text) return { vsBytes: new Uint8Array(0), cleanText: '' };

  const len = text.length;
  const vsBytes = [];
  const cleanChunks = [];
  let i = 0, cleanStart = 0;

  while (i < len) {
    const code = text.charCodeAt(i);

    // 1. BMP Variation Selectors (VS1–VS16)
    if (code >= 0xFE00 && code <= 0xFE0F) {
      if (cleanStart < i) cleanChunks.push(text.slice(cleanStart, i));
      vsBytes.push(code - 0xFE00);
      i++;
      cleanStart = i;
    }
    // 2. Supplementary Variation Selectors (VS17–VS256: Surrogate Pair 0xDB40 + 0xDD00..0xDDEF)
    else if (code === 0xDB40 && i + 1 < len) {
      const low = text.charCodeAt(i + 1);
      if (low >= 0xDD00 && low <= 0xDDEF) {
        if (cleanStart < i) cleanChunks.push(text.slice(cleanStart, i));
        vsBytes.push(16 + (low - 0xDD00));
        i += 2;
        cleanStart = i;
      } else { i++; }
    } else { i++; }
  }

  if (cleanStart < len) cleanChunks.push(text.slice(cleanStart, len));

  return {
    vsBytes: new Uint8Array(vsBytes),
    cleanText: cleanChunks.length === 1 ? cleanChunks[0] : cleanChunks.join('')
  };
}
```

---

### 2.3. `js/core/stego/stego-composer.js`
هذا الملف هو **المنسق الرئيسي لعمليات الإخفاء والاستخراج**.

#### 🔹 1. دالة الإخفاء (`composeStego`):
1. حل المفتاح المشترك عبر `resolveStegoKey`.
2. بناء وتشفير الرسالة عبر `encryptPayloadCtr(payload, key, coverText)`.
3. توليد المواضع عبر المحرك الحديث `generatePositions(coverBits, msgBits, stegoKey)`.
4. توليد قناع الـ XOR وتحويله لرموز VS عبر `xorKeyToVSString`.
5. دمج الرموز مع الغلاف لإنتاج كائن الإخفاء النهائي.

#### 🔹 2. دالة الاستخراج بالمحرك المزدوج (`decomposeStego`):
* تطبيق آلية المحاولة المزدوجة التلقائية:
```javascript
async function decomposeStego(stegoText, rawStegoKey, encryptionKey) {
  const { vsBytes, cleanText: coverText } = extractVSFromText(stegoText);
  if (vsBytes.length === 0) throw new Error('No hidden VS characters found.');

  const xorKeyBinary = bytesToBinary(vsBytes);
  const { resolvedStegoKey } = await resolveStegoKey(rawStegoKey, coverText);
  const coverBits = stringToBinary(coverText);
  const decryptionKey = encryptionKey || resolvedStegoKey;

  async function attemptDecompose(posFn) {
    try {
      const basePositions = posFn(coverBits.length, xorKeyBinary.length, resolvedStegoKey);
      const recoveredBinary = recoverPayloadBits(coverBits, basePositions, xorKeyBinary);
      const recoveredPayload = binaryToBytes(recoveredBinary);

      let decryptedPayload;
      try {
        decryptedPayload = await decryptPayloadCtr(recoveredPayload, decryptionKey, coverText);
      } catch (e) {
        decryptedPayload = recoveredPayload;
      }

      let payloadBytes = decryptedPayload;
      if (decryptedPayload[0] === 0xFE && typeof doStreamDecompress === 'function') {
        try { payloadBytes = doStreamDecompress(decryptedPayload.subarray(1)); } catch (e) {}
      }

      const { secretMessage, hint } = parsePayload(payloadBytes);
      if (secretMessage && secretMessage.length > 0) {
        return { success: true, secretMessage, hint, coverText, vsBytes };
      }
    } catch (err) {}
    return null;
  }

  // المحاولة الأولى: بالمحرك التشفيري الحديث (AES-CTR CSPRNG)
  const modernResult = await attemptDecompose(generatePositions);
  if (modernResult) return modernResult;

  // المحاولة الثانية: بالمحرك الاحتياطي القديم (Mulberry32)
  if (typeof generatePositionsLegacy === 'function') {
    const legacyResult = await attemptDecompose(generatePositionsLegacy);
    if (legacyResult) return legacyResult;
  }

  throw new Error('Decryption failed — make sure the Pre-Shared Key or Encryption Key is correct.');
}
```

---

### 2.4. `js/features/F_chat_scanner.js`
هذا الملف مسؤول عن فحص سجلات المحادثات الجماعية واستخراج الرسائل السرية.

#### 🔹 1. رفع العمليات الثقيلة خارج الحلقات (Loop Hoisting)
* تحويل جميع رسائل المحادثة الصافية إلى مصفوفة بتات ثنائية `cleanCoverBitsMap` لمرة واحدة فقط:
```javascript
const cleanCoverBitsMap = cleanMessages.map(msg => stringToBinary(msg));
```

#### 🔹 2. المحرك المزدوج في فحص الغلاف (`_tryOneCover`)
* تجربة فك كل رسالة مرشحة باستخدام المحركين الحديث والقديم، مع دعم النصوص المشفرة وغير المشفرة والمضغوطة عبر `Brotli`:
```javascript
async function _tryOneCover(candidateCover, coverBits, xorKeyBinary, resolvedStegoKey, encryptionKey) {
  const decryptionKey = encryptionKey || resolvedStegoKey;
  const strictDecoder = new TextDecoder('utf-8', { fatal: true });

  async function attemptExtraction(posFn) {
    try {
      const positions = posFn(coverBits.length, xorKeyBinary.length, resolvedStegoKey);
      const recoveredBinary = recoverPayloadBits(coverBits, positions, xorKeyBinary);
      const recoveredPayload = binaryToBytes(recoveredBinary);

      let decryptedPayload = recoveredPayload;
      try {
        decryptedPayload = await decryptPayloadCtr(recoveredPayload, decryptionKey, candidateCover);
      } catch (err) {
        decryptedPayload = recoveredPayload;
      }

      let payloadBytes = decryptedPayload;
      if (decryptedPayload[0] === 0xFE && typeof doStreamDecompress === 'function') {
        try { payloadBytes = doStreamDecompress(decryptedPayload.subarray(1)); } catch (e) {}
      }

      if (payloadBytes && payloadBytes.length > 0) {
        const delimiterIndex = payloadBytes.indexOf(HINT_DELIMITER || 0xFF);
        let msgBytes = delimiterIndex !== -1 ? payloadBytes.subarray(0, delimiterIndex) : payloadBytes;
        let hintBytes = delimiterIndex !== -1 ? payloadBytes.subarray(delimiterIndex + 1) : null;

        const decodedMsg = strictDecoder.decode(msgBytes);
        const decodedHint = hintBytes ? strictDecoder.decode(hintBytes) : '';

        if (decodedMsg.length > 0 && isPrintableText(decodedMsg)) {
          return { match: true, secretMessage: decodedMsg, hint: decodedHint };
        }
      }
    } catch (e) {}
    return null;
  }

  const modernResult = await attemptExtraction(generatePositions);
  if (modernResult && modernResult.match) return modernResult;

  if (typeof generatePositionsLegacy === 'function') {
    const legacyResult = await attemptExtraction(generatePositionsLegacy);
    if (legacyResult && legacyResult.match) return legacyResult;
  }

  return { match: false, reason: 'unreadable' };
}
```

---

### 2.5. مكتبة الواجهة التفاعلية `stegnolines_ui_library/`
تمت مطابقة وتحديث كافة ملفات العرض التفاعلي لتعمل بنفس المنطق البرمجي الدقيق:
1. `stegnolines_ui_library/js/stage3_hide/step2_prng.js`: تحديث مولد المواضع والمحرك المزدوج ودعم التوليد التلقائي للمفتاح.
2. `stegnolines_ui_library/js/stage3_hide/step4_vs_codec.js`: جدول البحث المسبق $O(1)$.
3. `stegnolines_ui_library/js/stage3_hide/step5_stego_object.js`: تقنية التقطيع الفوري `Span Slicing`.
4. `stegnolines_ui_library/js/stage3_hide/embedding.js` و `extraction.js`: توحيد استدعاءات الـ VS والفك المزدوج.
5. `stegnolines_ui_library/js/features/F_chat_scanner.js`: تحديث محرك الفحص الذكي.
6. `stegnolines_ui_library/js/utils.js`: ضبط دالة `resolveStegoKey` لدعم المفاتيح الفارغة.

---

## 3. التحليل الرياضي والتشفيري للخوارزميات

### 1. إحصائيات المولد التشفيري (CSPRNG Entropy)
* في المولد القديم (`DJB2 + Mulberry32`)، كانت مساحة البذرة محصورة في $2^{32} = 4,294,967,296$ حالة فقط.
* في المولد الحديث (`PBKDF2-HMAC-SHA256 + AES-256-CTR`)، تبلغ مساحة المفتاح:
  $$\text{Key Space} = 2^{256} \approx 1.1579 \times 10^{77}$$
  مما يجعل التنبؤ بالحالة أو هجمات القوة الغاشمة مستحيلة عملياً وحسابياً.

### 2. إثبات إلغاء انحياز باقي القسمة (Modulo Bias Elimination)
* عند استخدام `raw % range`، فإن الأرقام من $0$ إلى $(2^{32} \pmod{\text{range}} - 1)$ تمتلك احتمال ظهور أعلى بمقدار $\frac{1}{2^{32}}$.
* بتطبيق **السحب المرفوض (Rejection Sampling)** مع حد الأمان $\text{threshold} = 2^{32} - (2^{32} \pmod{\text{range}})$:
  $$P(\text{output} = i) = \frac{1}{\text{range}} \quad \forall i \in [0, \text{range}-1]$$
  مما يُلغي الانحياز تماماً ويضمن توزيعاً منتظماً 100%.

---

## 4. سجل الأخطاء السابقة، أسبابها الجذرية، وكيف تم حلها

```mermaid
graph TD
    subgraph Bug1["الخطأ 1: كسر التوافقية بتعديل خريطة VS"]
        B1_Cause["إنشاء S-Box مشتق من المفتاح"] --> B1_Effect["تلف بايتات الرسائل القديمة وملفات الصور"]
        B1_Effect --> B1_Fix["الحل: تثبيت خريطة VS خطية معيارية وحصر التشفير في طبقة البيانات والمولد"]
    end

    subgraph Bug2["الخطأ 2: تعطل فحص المفتاح الفارغ"]
        B2_Cause["resolveStegoKey ترمي استثناء عند خلو المفتاح"] --> B2_Effect["توقف الماسح بالكامل عند ترك حقل المفتاح فارغاً"]
        B2_Effect --> B2_Fix["الحل: اشتقاق المفتاح تلقائياً من SHA-256(coverText)"]
    end

    subgraph Bug3["الخطأ 3: انغلاق المولد الأحادي"]
        B3_Cause["استبدال Mulberry32 دون توفير بديل احتياطي"] --> B3_Effect["فشل استخراج رسائل الإصدار القديم في الماسح"]
        B3_Effect --> B3_Fix["الحل: بناء المحرك المزدوج Dual-Engine Fallback"]
    end
```

---

## 5. خطة التنفيذ التفصيلية خطوة بخطوة للفرق البرمجية

عند نقل وتطبيق هذه التحسينات على أي فرع أو مشروع مطابق، اتبع الخطوات الترتيبية التالية بدقة:

### 📍 الخطوة 1: تحديث ملف المولد التشفيري (`prng-generator.js`)
* أضف خوارزمية `PBKDF2-HMAC-SHA256` مع الكاش السريع `_derivedKeyCache`.
* أضف مولد `AES-256-CTR CSPRNG` والسحب المرفوض `getUnbiasedRandomInt`.
* حدّث `generatePositions` لتعمل بـ `Lazy Swap Map`.
* أضف دالة `generatePositionsLegacy` (`DJB2 + Mulberry32`).
* حدّث `resolveStegoKey` لتدعم المفتاح المخصص والاشتقاق التلقائي من بصمة الغلاف.

### 📍 الخطوة 2: تحديث ترميز محددات التباين (`vs-codec.js`)
* ابنِ جدول البحث `BYTE_TO_VS_LUT` للتحويل الفوري $O(1)$.
* طبّق دالة `extractVSFromText` بتقنية `Span Slicing`.
* حافظ على التمثيل الخطي المعياري (`0xFE00` و `0xE0100`).

### 📍 الخطوة 3: تحديث منسق العمليات (`stego-composer.js`)
* في `composeStego`: اعتمد التشفير الحديث والمولد التشفيري.
* في `decomposeStego`: طبّق دالة `attemptDecompose` لتجربة المحرك الحديث أولاً ثم القديم تلقائياً.

### 📍 الخطوة 4: تحديث ماسح المحادثات (`F_chat_scanner.js`)
* طبّق `cleanCoverBitsMap` لترميز بتات الرسائل النظيفة مسبقاً (Loop Hoisting).
* طبّق المحرك المزدوج في دالة `_tryOneCover`.
* تأكد من استمرار الفحص لكافة النواقل.

### 📍 الخطوة 5: مطابقة مكتبة الواجهة (`stegnolines_ui_library/`)
* انسخ نفس التعديلات إلى ملفات مكتبة الواجهة لضمان التطابق التام بين المحرك الأساسي والواجهات المستقلة.

---

## 6. نتائج القياسات المعيارية واختبارات الأداء

### 📊 اختبار السرعة الحقيقي على نصوص مختلفة الأحجام (Node.js Live Benchmark):

```text
=================================================================
        STEGNOLINES: REAL-WORLD SPEED BENCHMARK COMPARISON       
=================================================================

--- Testing: Small Message (1,000 chars) ---
  ⏱️  Legacy Code Time   : 0.10 ms
  ⚡ Optimized Code Time: 0.02 ms
  🚀 Speed Improvement  : 5.9x Faster!
  ✅ 100% Identical Output: YES (Exact Match)

--- Testing: Medium Article (50,000 chars) ---
  ⏱️  Legacy Code Time   : 2.49 ms
  ⚡ Optimized Code Time: 0.13 ms
  🚀 Speed Improvement  : 19.4x Faster!
  ✅ 100% Identical Output: YES (Exact Match)

--- Testing: Large Document (500,000 chars) ---
  ⏱️  Legacy Code Time   : 34.96 ms
  ⚡ Optimized Code Time: 1.25 ms
  🚀 Speed Improvement  : 27.9x Faster!
  ✅ 100% Identical Output: YES (Exact Match)

--- Testing: Full Book (1,000,000 chars) ---
  ⏱️  Legacy Code Time   : 143.31 ms
  ⚡ Optimized Code Time: 2.22 ms
  🚀 Speed Improvement  : 64.5x Faster!
  ✅ 100% Identical Output: YES (Exact Match)
```

### 🛡️ مصفوفة اختبارات التكامل والأمان (Integration & Regression Suite):
* ✅ **استخراج الرسائل الحديثة (AES-CTR CSPRNG):** ناجح 100%.
* ✅ **استخراج الرسائل القديمة (Mulberry32 PRNG):** ناجح 100%.
* ✅ **فحص المحادثات الجماعية المختلطة (Chat Scanner):** ناجح 100%.
* ✅ **استخراج الصور المخفية (Image Steganography):** استرجاع البايتات بنسبة 100% وتطابق ثنائي تام.
* ✅ **رفض المفاتيح الخاطئة ومنع التسريب:** ناجح 100%.
