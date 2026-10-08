/**
 * @file analyze.worker.js
 * @description Web Worker module wrapper for background hidden message extraction.
 * Pure ES module worker.
 */

import { analyzeTextForExtraction } from './analyze.js';

self.onmessage = async function (e) {
  const { type, text } = e.data || {};

  if (type === 'ANALYZE') {
    try {
      self.postMessage({ type: 'PROGRESS', progress: 20 });
      const result = await analyzeTextForExtraction(text);
      self.postMessage({ type: 'PROGRESS', progress: 100 });
      self.postMessage({ type: 'RESULT', data: result });
    } catch (err) {
      self.postMessage({ type: 'ERROR', error: err.message || 'Worker analysis failed.' });
    }
  }
};
