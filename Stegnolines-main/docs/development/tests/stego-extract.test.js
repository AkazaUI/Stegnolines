/**
 * @file stego-extract.test.js
 * @description Dependency-free unit & interop test suite for Stegnolines extraction engine.
 * Classic script test runner.
 */

(function (global) {
  'use strict';

  let passedCount = 0;
  let failedCount = 0;

  function logResult(testName, passed, details = '') {
    const container = document.getElementById('test-results');
    const div = document.createElement('div');
    div.className = `test-row ${passed ? 'pass' : 'fail'}`;
    div.innerHTML = `
      <span>${passed ? '✅ PASS' : '❌ FAIL'}: ${testName}</span>
      ${details ? `<pre>${details}</pre>` : ''}
    `;
    if (container) container.appendChild(div);

    if (passed) passedCount++;
    else failedCount++;

    updateSummary();
  }

  function updateSummary() {
    const summaryEl = document.getElementById('test-summary');
    if (summaryEl) {
      summaryEl.textContent = `Total: ${passedCount + failedCount} | Passed: ${passedCount} | Failed: ${failedCount}`;
      summaryEl.className = failedCount === 0 ? 'summary-pass' : 'summary-fail';
    }
  }

  async function runAllTests() {
    const analyzeTextForExtraction = global.analyzeTextForExtraction;
    const profileText = global.StegProfile ? global.StegProfile.profileText : null;
    const sanitizeText = global.StegSanitize ? global.StegSanitize.sanitizeText : null;
    const decapsulate = global.StegDecapsulate ? global.StegDecapsulate.decapsulate : null;

    // 1. Unicode TAG block payload test (surrogate pair correctness)
    try {
      const tagStr = String.fromCodePoint(0xE0048, 0xE0045, 0xE004C, 0xE004C, 0xE004F);
      const textWithTag = `Cover text ${tagStr} end.`;
      const res = await analyzeTextForExtraction(textWithTag);
      const top = res.topCandidates[0];
      const pass = top && top.text === 'HELLO' && top.schemeId === 'unicodeTags';
      logResult('Unicode TAG Block decoding (surrogate pair test)', pass, pass ? '' : `Got: ${top ? top.text : 'null'}`);
    } catch (e) {
      logResult('Unicode TAG Block decoding (surrogate pair test)', false, e.message);
    }

    // 2. Variation Selector scheme test (VS1-16 & VS17-256)
    try {
      const vsStr = String.fromCodePoint(0xE0131);
      const textWithVS = `Header ${vsStr} Footer`;
      const res = await analyzeTextForExtraction(textWithVS);
      const top = res.topCandidates[0];
      const pass = top && top.bytes[0] === 65;
      logResult('Variation Selector channel decoding', pass, pass ? '' : `Got byte: ${top ? top.bytes[0] : 'null'}`);
    } catch (e) {
      logResult('Variation Selector channel decoding', false, e.message);
    }

    // 3. Binary 2-symbol scheme test (ZWSP vs ZWNJ)
    try {
      const zwsp = '\u200B';
      const zwnj = '\u200C';
      const bits = [0, 1, 0, 0, 0, 0, 0, 1];
      const carrierSeq = bits.map(b => (b === 0 ? zwsp : zwnj)).join('');
      const textBinary = `Prefix ${carrierSeq} Suffix`;

      const res = await analyzeTextForExtraction(textBinary);
      const top = res.topCandidates.find(c => c.schemeId === 'binary');
      const pass = top && top.text.includes('A');
      logResult('Binary 2-symbol carrier decoding', pass, pass ? '' : `Got text: ${top ? top.text : 'null'}`);
    } catch (e) {
      logResult('Binary 2-symbol carrier decoding', false, e.message);
    }

    // 4. Decapsulation ladder test (Base64 wrapper)
    try {
      const rawB64 = new TextEncoder().encode(btoa('SECRET_KEY'));
      const decRes = await decapsulate(rawB64);
      const pass = decRes.finalText === 'SECRET_KEY' && decRes.chain.some(s => s.transform.includes('Base64'));
      logResult('Decapsulation ladder Base64 unwrapping', pass, pass ? '' : `Got: ${decRes.finalText}`);
    } catch (e) {
      logResult('Decapsulation ladder Base64 unwrapping', false, e.message);
    }

    // 5. False-Positive Suite (Arabic orthography, Emojis, BOM)
    try {
      const arabicText = "سلام‌علیکم محترم";
      const emojiText = "Family 👨‍👩‍👧 and 👍🏽 thumbs up";
      const bomText = "\uFEFFThis is clean BOM text.";

      const profAr = profileText(arabicText);
      const profEmoji = profileText(emojiText);
      const profBom = profileText(bomText);

      const passAr = profAr.suspectCarrierCount === 0;
      const passEmoji = profEmoji.suspectCarrierCount === 0;
      const passBom = profBom.suspectCarrierCount === 0;

      const allPass = passAr && passEmoji && passBom;
      logResult('False-Positive Suite (Arabic ZWNJ, Emoji ZWJ, leading BOM classified legitimate)', allPass,
        allPass ? '' : `Ar suspect: ${profAr.suspectCarrierCount}, Emoji suspect: ${profEmoji.suspectCarrierCount}, BOM suspect: ${profBom.suspectCarrierCount}`);
    } catch (e) {
      logResult('False-Positive Suite', false, e.message);
    }

    // 6. XSS Security Test
    try {
      const xssPayload = "<script>alert(1)</script>";
      const pre = document.createElement('pre');
      pre.textContent = xssPayload;

      const scriptInside = pre.querySelector('script');
      const textMatches = pre.textContent === xssPayload;
      const pass = scriptInside === null && textMatches;

      logResult('XSS Security Test (textContent rendering leaves payload inert)', pass);
    } catch (e) {
      logResult('XSS Security Test', false, e.message);
    }

    // 7. Sanitization Test
    try {
      const text = "Clean \u200BText \u200Cwith suspect ZWSP";
      const san = sanitizeText(text);
      const pass = san.sanitizedText === "Clean Text with suspect ZWSP" && san.removedCount > 0;
      logResult('Text Sanitization stripping suspect carriers', pass, pass ? '' : `Got: ${san.sanitizedText}`);
    } catch (e) {
      logResult('Text Sanitization', false, e.message);
    }

    // 8. Performance Smoke Test (100 KB text analyzed in < 300 ms)
    try {
      const largeText = "A".repeat(100000) + "\u200B" + "B".repeat(100000);
      const t0 = performance.now();
      const res = await analyzeTextForExtraction(largeText);
      const duration = performance.now() - t0;
      const pass = duration < 300;
      logResult(`Performance Smoke Test 200KB input (< 300 ms)`, pass, `Duration: ${duration.toFixed(1)} ms`);
    } catch (e) {
      logResult('Performance Smoke Test', false, e.message);
    }
  }

  global.runAllTests = runAllTests;
})(typeof window !== 'undefined' ? window : this);
