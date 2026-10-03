/**
 * @file steganalysis-controller.js
 * @description Central controller for Steganalysis Chat & Text Forensic Scanner (steganalysis.html).
 * Integrates modular detectors, chat importers, date filters, and threat dashboard.
 * Compatible with browser script tags and module exports.
 */

(function (global) {
  'use strict';

  let currentAnalysis = null;
  let _currentSteganalysisFile = null;
  let _steganalysisUploadedFileText = null;
  let _steganalysisParsedMessages = [];
  let _steganalysisDateBounds = null;
  let _steganalysisDateFrom = '';
  let _steganalysisDateTo = '';
  let _steganalysisFpFrom = null;
  let _steganalysisFpTo = null;

  function t(key) {
    const lang = localStorage.getItem('stegoLang') || document.documentElement.lang || 'en';
    if (window.translations && window.translations[lang] && window.translations[lang][key]) {
      return window.translations[lang][key];
    }
    if (typeof I18N_STEGANALYSIS !== 'undefined') {
      if (I18N_STEGANALYSIS[lang] && I18N_STEGANALYSIS[lang][key]) return I18N_STEGANALYSIS[lang][key];
      if (I18N_STEGANALYSIS['en'] && I18N_STEGANALYSIS['en'][key]) return I18N_STEGANALYSIS['en'][key];
    }
    if (typeof I18N_COMMON !== 'undefined') {
      if (I18N_COMMON[lang] && I18N_COMMON[lang][key]) return I18N_COMMON[lang][key];
      if (I18N_COMMON['en'] && I18N_COMMON['en'][key]) return I18N_COMMON['en'][key];
    }
    return key;
  }

  function _formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function _parseAndApplySteganalysisFile(file, rawText) {
    _currentSteganalysisFile = file;

    const parsedData = global.StegChatImporter
      ? global.StegChatImporter.parseChatFile(file, rawText)
      : { messageList: [], formattedChatText: rawText };

    _steganalysisParsedMessages = parsedData.messageList;
    _steganalysisUploadedFileText = parsedData.formattedChatText;

    const promptEl = document.getElementById('steganalysis-dropzone-prompt');
    const infoBar = document.getElementById('steganalysis-file-info-bar');
    const dropzone = document.getElementById('steganalysis-file-dropzone');

    if (promptEl) promptEl.style.display = 'none';
    if (infoBar) infoBar.style.display = 'flex';
    if (dropzone) dropzone.classList.add('has-file');

    const nameDisplay = document.getElementById('steganalysis-file-name-display');
    const metaDisplay = document.getElementById('steganalysis-file-meta-display');
    const curLang = localStorage.getItem('stegoLang') || document.documentElement.lang || 'en';

    if (nameDisplay) nameDisplay.textContent = file.name;
    if (metaDisplay) {
      const msgCount = _steganalysisParsedMessages.length;
      metaDisplay.textContent = `${_formatBytes(file.size)} • ${msgCount} ${curLang === 'ar' ? 'رسالة' : 'messages'}`;
    }

    // Extract Date Bounds & Initialize Date Filters
    if (global.StegDateFilter) {
      _steganalysisDateBounds = global.StegDateFilter.extractDateBounds(_steganalysisParsedMessages);
      initSteganalysisDateFilter();
    }
  }

  function handleSteganalysisFileUpload(files) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      _parseAndApplySteganalysisFile(file, e.target.result);
      if (typeof showToast === 'function') {
        showToast('✅ ' + t('steganalysisFileLoaded'));
      }
    };

    reader.onerror = () => {
      if (typeof showToast === 'function') {
        showToast('❌ ' + t('steganalysisFileError'));
      }
    };

    reader.readAsText(file, 'utf-8');
  }

  function removeSteganalysisFile(e) {
    if (e) e.stopPropagation();

    _currentSteganalysisFile = null;
    _steganalysisUploadedFileText = null;
    _steganalysisParsedMessages = [];
    _steganalysisDateBounds = null;
    _steganalysisDateFrom = '';
    _steganalysisDateTo = '';

    const promptEl = document.getElementById('steganalysis-dropzone-prompt');
    const infoBar = document.getElementById('steganalysis-file-info-bar');
    const dropzone = document.getElementById('steganalysis-file-dropzone');
    const fileInput = document.getElementById('steganalysis-file-input');
    const dateFilterCard = document.getElementById('steganalysis-date-filter-card');

    if (promptEl) promptEl.style.display = 'flex';
    if (infoBar) infoBar.style.display = 'none';
    if (dropzone) dropzone.classList.remove('has-file');
    if (fileInput) fileInput.value = '';
    if (dateFilterCard) dateFilterCard.style.display = 'none';

    if (_steganalysisFpFrom) { try { _steganalysisFpFrom.destroy(); } catch(err){} _steganalysisFpFrom = null; }
    if (_steganalysisFpTo) { try { _steganalysisFpTo.destroy(); } catch(err){} _steganalysisFpTo = null; }

    const resultsPanel = document.getElementById('steganalysis-results-panel');
    if (resultsPanel) resultsPanel.style.display = 'none';
  }

  function applySteganalysisDateFilter() {
    if (!_steganalysisParsedMessages || _steganalysisParsedMessages.length === 0) return;

    let filteredList = _steganalysisParsedMessages;
    if (global.StegDateFilter) {
      filteredList = global.StegDateFilter.filterMessagesByDateRange(_steganalysisParsedMessages, _steganalysisDateFrom, _steganalysisDateTo);
    }

    _steganalysisUploadedFileText = filteredList.map(m => m.rawText || m.cleanText || (typeof m === 'string' ? m : '')).filter(Boolean).join('\n');

    const statusEl = document.getElementById('steganalysis-date-filter-status');
    const curLang = localStorage.getItem('stegoLang') || document.documentElement.lang || 'en';

    if (statusEl) {
      if (!_steganalysisDateFrom && !_steganalysisDateTo) {
        statusEl.textContent = t('allDates');
        statusEl.className = 'badge badge--draft date-range-filter__status';
      } else {
        const parts = [];
        if (_steganalysisDateFrom) parts.push(_steganalysisDateFrom);
        if (_steganalysisDateTo) parts.push(_steganalysisDateTo);
        statusEl.textContent = parts.join(' ➔ ');
        statusEl.className = 'badge badge--encrypted date-range-filter__status';
      }
    }
  }

  function initSteganalysisDateFilter() {
    const fromInput = document.getElementById('steganalysis-date-from');
    const toInput = document.getElementById('steganalysis-date-to');
    const card = document.getElementById('steganalysis-date-filter-card');
    if (!card) return;

    if (!_steganalysisDateBounds || !_steganalysisDateBounds.hasDates) {
      card.style.display = 'none';
      return;
    }

    card.style.display = 'block';

    const minDate = _steganalysisDateBounds.minDate;
    const maxDate = _steganalysisDateBounds.maxDate;

    const curLang = localStorage.getItem('stegoLang') || document.documentElement.lang || 'en';
    const fpLocale = (curLang === 'ar' && typeof flatpickr !== 'undefined' && flatpickr.l10ns && flatpickr.l10ns.ar)
      ? flatpickr.l10ns.ar
      : { firstDayOfWeek: 0 };

    if (typeof flatpickr !== 'undefined' && fromInput && toInput) {
      if (_steganalysisFpFrom) { try { _steganalysisFpFrom.destroy(); } catch(e){} }
      if (_steganalysisFpTo) { try { _steganalysisFpTo.destroy(); } catch(e){} }

      _steganalysisFpFrom = flatpickr(fromInput, {
        enableTime: true,
        time_24hr: true,
        dateFormat: 'Y-m-d H:i',
        minDate: minDate,
        maxDate: maxDate,
        defaultDate: minDate,
        locale: fpLocale,
        onChange: (selectedDates, dateStr) => {
          _steganalysisDateFrom = dateStr;
          if (_steganalysisFpTo) _steganalysisFpTo.set('minDate', dateStr || minDate);
          applySteganalysisDateFilter();
        }
      });

      _steganalysisFpTo = flatpickr(toInput, {
        enableTime: true,
        time_24hr: true,
        dateFormat: 'Y-m-d H:i',
        minDate: minDate,
        maxDate: maxDate,
        defaultDate: maxDate,
        locale: fpLocale,
        onChange: (selectedDates, dateStr) => {
          _steganalysisDateTo = dateStr;
          if (_steganalysisFpFrom) _steganalysisFpFrom.set('maxDate', dateStr || maxDate);
          applySteganalysisDateFilter();
        }
      });

      _steganalysisDateFrom = fromInput.value;
      _steganalysisDateTo = toInput.value;
    }

    // Setup Presets
    card.querySelectorAll('.date-preset-btn').forEach(btn => {
      btn.onclick = () => {
        const preset = btn.getAttribute('data-preset');
        _applySteganalysisPreset(preset);
      };
    });
  }

  function _applySteganalysisPreset(preset) {
    if (!_steganalysisDateBounds || !_steganalysisDateBounds.hasDates) return;
    const maxDate = new Date(_steganalysisDateBounds.maxDate.getTime());
    let targetFrom = null;
    let targetTo = maxDate;

    if (preset === 'today') {
      targetFrom = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate(), 0, 0, 0);
    } else if (preset === '7days') {
      targetFrom = new Date(maxDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (preset === '30days') {
      targetFrom = new Date(maxDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (preset === 'year') {
      targetFrom = new Date(maxDate.getFullYear(), 0, 1, 0, 0, 0);
    } else if (preset === 'reset') {
      targetFrom = _steganalysisDateBounds.minDate;
      targetTo = _steganalysisDateBounds.maxDate;
    }

    if (targetFrom && global.StegDateFilter) {
      if (_steganalysisFpFrom) _steganalysisFpFrom.setDate(targetFrom, true);
      if (_steganalysisFpTo) _steganalysisFpTo.setDate(targetTo, true);
    }
  }

  function initSteganalysis() {
    const analyzeBtn = document.getElementById('steganalysis-btn');
    const textInput = document.getElementById('steganalysisInput');
    const resultsPanel = document.getElementById('steganalysis-results-panel');
    const dropzone = document.getElementById('steganalysis-file-dropzone');
    const fileInput = document.getElementById('steganalysis-file-input');
    const removeBtn = document.getElementById('steganalysis-btn-remove-file');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', (e) => {
        if (e.target.closest('#steganalysis-btn-remove-file')) return;
        fileInput.click();
      });

      dropzone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          fileInput.click();
        }
      });

      fileInput.addEventListener('change', (e) => {
        handleSteganalysisFileUpload(e.target.files);
      });

      ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('dragover');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('dragover');
        });
      });

      dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt ? dt.files : null;
        if (files && files.length > 0) {
          handleSteganalysisFileUpload(files);
        }
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener('click', removeSteganalysisFile);
    }

    if (!analyzeBtn) return;

    analyzeBtn.addEventListener('click', function () {
      let text = '';
      const hasFile = _steganalysisUploadedFileText && _steganalysisUploadedFileText.trim().length > 0;
      const hasText = textInput && textInput.value && textInput.value.trim().length > 0;

      if (hasFile) {
        text = _steganalysisUploadedFileText;
        if (!_steganalysisParsedMessages || _steganalysisParsedMessages.length <= 1) {
          _steganalysisParsedMessages = global.StegChatImporter
            ? global.StegChatImporter.splitChatIntoMessages(text)
            : [];
        }
      } else if (hasText) {
        text = textInput.value;
        const isChatLog = /(?:^|\r?\n)\d{1,2}\/\d{1,2}\/\d{2,4},\s*\d{1,2}:\d{2}.*?\s*-\s*[^:]+:/m.test(text);
        if (isChatLog && global.StegChatImporter) {
          _steganalysisParsedMessages = global.StegChatImporter.splitChatIntoMessages(text);
        } else {
          _steganalysisParsedMessages = [];
        }
      }

      if (!text || text.trim().length === 0) {
        if (typeof showToast === 'function') {
          showToast('⚠ ' + t('steganalysisEmptyInput'));
        }
        return;
      }

      analyzeBtn.disabled = true;
      analyzeBtn.innerHTML = `
        <span class="material-symbols-outlined btn-spinner">progress_activity</span>
        <span>${t('steganalysisAnalyzing')}</span>
      `;

      setTimeout(() => {
        if (global.StegDetectEngine) {
          currentAnalysis = global.StegDetectEngine.analyzeText(text);
        } else {
          currentAnalysis = { totalFound: 0, results: [], distinctTypes: 0, computationTimeMs: 0, techniques: [] };
        }

        const risk = currentAnalysis.risk;

        if (resultsPanel) resultsPanel.style.display = '';

        if (global.StegThreatDashboard) {
          global.StegThreatDashboard.renderMetrics(currentAnalysis, risk);

          if (!currentAnalysis.evidence || !currentAnalysis.evidence.isSuspicious) {
            if (currentAnalysis.observationCount > 0 && typeof global.StegThreatDashboard.renderCleanWithObservationsState === 'function') {
              global.StegThreatDashboard.renderCleanWithObservationsState(currentAnalysis);
            } else {
              global.StegThreatDashboard.renderCleanState();
            }
          } else {
            global.StegThreatDashboard.renderResultsTable(currentAnalysis, _steganalysisParsedMessages);
          }
        }

        // Save result for Simplified Report Page
        try {
          const simplifiedPayload = {
            inputText: text,
            totalFound: currentAnalysis.totalFound,
            observationCount: currentAnalysis.observationCount || 0,
            distinctTypes: currentAnalysis.distinctTypes,
            computationTimeMs: currentAnalysis.computationTimeMs,
            techniques: currentAnalysis.techniques,
            evidence: currentAnalysis.evidence,
            risk: currentAnalysis.risk,
            matchedSignatures: currentAnalysis.matchedSignatures,
            uniqueSymbols: currentAnalysis.uniqueSymbols,
            rawSymbolsString: currentAnalysis.results.map(r => String.fromCodePoint(r.codePoint)).join(''),
            totalConversationCount: _steganalysisParsedMessages ? _steganalysisParsedMessages.length : 1,
            metadata: {
              sender: (_currentSteganalysisFile ? _currentSteganalysisFile.name : null),
              timestamp: (_steganalysisDateFrom ? `${_steganalysisDateFrom} - ${_steganalysisDateTo}` : new Date().toLocaleString())
            },
            results: currentAnalysis.results,
            observationsSummary: {
              total: currentAnalysis.observationCount || 0,
              benign: currentAnalysis.benignObservationCount || 0,
              ambiguous: currentAnalysis.ambiguousObservationCount || 0
            }
          };
          localStorage.setItem('stegoSimplifiedResult', JSON.stringify(simplifiedPayload));
        } catch (storageErr) {
          console.warn('Failed to save stegoSimplifiedResult to localStorage:', storageErr);
        }

        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = `
          <span class="material-symbols-outlined" style="font-size:18px">search_insights</span>
          <span data-i18n="btnAnalyzeText">${t('btnAnalyzeText')}</span>
        `;

        if (typeof showToast === 'function') {
          showToast('✅ ' + t('steganalysisCompleted'));
        }
        if (resultsPanel && typeof resultsPanel.scrollIntoView === 'function') {
          setTimeout(() => {
            resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      }, 50);
    });
  }

  function applyLanguage(lang) {
    if (currentAnalysis && global.StegThreatDashboard) {
      const risk = currentAnalysis.risk;
      global.StegThreatDashboard.renderMetrics(currentAnalysis, risk);
      if (!currentAnalysis.evidence || !currentAnalysis.evidence.isSuspicious) {
        if (currentAnalysis.observationCount > 0 && typeof global.StegThreatDashboard.renderCleanWithObservationsState === 'function') {
          global.StegThreatDashboard.renderCleanWithObservationsState(currentAnalysis);
        } else {
          global.StegThreatDashboard.renderCleanState();
        }
      } else {
        global.StegThreatDashboard.renderResultsTable(currentAnalysis, _steganalysisParsedMessages);
      }
    }
  }

  global.applyLanguage = applyLanguage;

  global.TextSteganalysis = {
    analyzeText: (text) => global.StegDetectEngine ? global.StegDetectEngine.analyzeText(text) : null,
    splitChatIntoMessages: (raw) => global.StegChatImporter ? global.StegChatImporter.splitChatIntoMessages(raw) : [],
    initSteganalysis,
    renderResultsTable: (analysis) => global.StegThreatDashboard ? global.StegThreatDashboard.renderResultsTable(analysis, _steganalysisParsedMessages) : null,
    renderVisualMap: (text, analysis) => global.StegVisualMap ? global.StegVisualMap.renderVisualMap(text, analysis) : '',
    _parseAndApplySteganalysisFile,
    applyLanguage
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSteganalysis);
  } else {
    initSteganalysis();
  }
})(typeof window !== 'undefined' ? window : globalThis);
