// ══════════════════════════════════════════════════════════════
// Feature: Stego Hint System
// ══════════════════════════════════════════════════════════════
//
// نظام التلميحات — يُخبر المستلم أين ستكون الرسالة التالية
// يُخزّن التلميحات في localStorage مع تصنيف (مُرسل / مُستقبل)
//
// Dependencies: utils (escapeHtml, showToast)
// ══════════════════════════════════════════════════════════════


const HINTS_STORAGE_KEY = 'stego_hints_log';

/** Load all hints from localStorage. */
function loadHints() {
  try {
    const data = localStorage.getItem(HINTS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/** Save a new hint entry to localStorage. */
function saveHint(entry) {
  const hints = loadHints();
  entry.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  hints.unshift(entry); // newest first
  // Keep max 100 entries
  if (hints.length > 100) hints.length = 100;
  localStorage.setItem(HINTS_STORAGE_KEY, JSON.stringify(hints));
}

/** Clear all hints from localStorage. */
function clearHintsLog() {
  if (!confirm('هل تريد مسح جميع التلميحات المحفوظة؟')) return;
  localStorage.removeItem(HINTS_STORAGE_KEY);
  renderHintsLog();
  showToast('🗑 تم مسح سجل التلميحات.');
}

/** Get the most recent hint. */
function getLatestHint() {
  const hints = loadHints();
  return hints.length > 0 ? hints[0] : null;
}

/** Render the hints log in the hints tab (separated by type). */
function renderHintsLog() {
  const receivedContainer = document.getElementById('hintsReceivedContainer');
  const sentContainer = document.getElementById('hintsSentContainer');
  const latestCard = document.getElementById('latestHintCard');
  const clearBtn = document.getElementById('btnClearHints');
  if (!receivedContainer || !sentContainer) return;

  const hints = loadHints();
  const received = hints.filter(h => h.type === 'received');
  const sent = hints.filter(h => h.type === 'sent');

  // Latest hint card
  if (hints.length > 0 && latestCard) {
    latestCard.style.display = 'block';
    const latest = hints[0];
    const typeLabel = latest.type === 'sent' ? '↗ مُرسل' : '↙ مُستقبل';
    const typeClass = latest.type === 'sent' ? 'hint-type-sent' : 'hint-type-received';
    const time = formatHintTime(latest.timestamp);
    document.getElementById('latestHintContent').innerHTML = `
      <div class="hint-active-inner">
        <span class="hint-big-emoji">${escapeHtml(latest.emoji)}</span>
        <div class="hint-active-info">
          <span class="hint-type-badge ${typeClass}">${typeLabel}</span>
          <span class="hint-time">${time}</span>
        </div>
      </div>
    `;
  } else if (latestCard) {
    latestCard.style.display = 'none';
  }

  // Clear button
  if (clearBtn) {
    clearBtn.style.display = hints.length > 0 ? 'inline-flex' : 'none';
  }

  // Render received hints
  receivedContainer.innerHTML = renderHintsList(received, 'received');

  // Render sent hints
  sentContainer.innerHTML = renderHintsList(sent, 'sent');
}

/** Render a list of hints of a specific type. */
function renderHintsList(hints, type) {
  if (hints.length === 0) {
    const icon = type === 'received' ? '↙' : '↗';
    const label = type === 'received' ? 'لا توجد تلميحات مُستقبلة بعد' : 'لا توجد تلميحات مُرسلة بعد';
    return `
      <div class="text-center py-6">
        <span class="text-2xl mb-2 block opacity-20">${icon}</span>
        <p class="text-sm" style="color: rgba(255,255,255,0.2);">${label}</p>
      </div>
    `;
  }

  let html = '<div class="hints-list">';
  for (const h of hints) {
    const time = formatHintTime(h.timestamp);
    html += `
      <div class="hint-row">
        <span class="hint-row-emoji">${escapeHtml(h.emoji)}</span>
        <span class="hint-row-time">${time}</span>
      </div>
    `;
  }
  html += '</div>';
  return html;
}

/** Format timestamp for display. */
function formatHintTime(isoStr) {
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }) +
           ' ' + d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoStr;
  }
}
