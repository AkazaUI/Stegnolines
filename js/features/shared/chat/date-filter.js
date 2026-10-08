/**
 * @file date-filter.js
 * @description Date and Time range filtering logic for chat forensics (Flatpickr integration).
 * Compatible with browser script tags and module exports.
 */

(function (global) {
  'use strict';

  function formatDateYMD(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function formatDateTimeYMDHM(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${hh}:${mm}`;
  }

  function parseTimestamp(ts) {
    if (!ts) return null;
    if (ts instanceof Date) return isNaN(ts.getTime()) ? null : ts;
    if (typeof ts === 'number') {
      const d = ts > 1e11 ? new Date(ts) : new Date(ts * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof ts !== 'string') return null;

    ts = ts.trim().replace(/^[\[\(]/, '').replace(/[\]\)]$/, '').trim();

    // 1. ISO format or YYYY-MM-DD
    const isoMatch = ts.match(/^(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([APap][Mm]))?)?/);
    if (isoMatch) {
      let [, y, m, d, hh, mm, ss, ampm] = isoMatch;
      let hour = hh ? parseInt(hh, 10) : 0;
      if (ampm) {
        if (ampm.toLowerCase() === 'pm' && hour < 12) hour += 12;
        if (ampm.toLowerCase() === 'am' && hour === 12) hour = 0;
      }
      const parsed = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), hour, mm ? parseInt(mm, 10) : 0, ss ? parseInt(ss, 10) : 0);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    // 2. Day/Month/Year or Month/Day/Year
    const dmyMatch = ts.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([APap][Mm]))?)?/);
    if (dmyMatch) {
      let [, p1, p2, yr, hh, mm, ss, ampm] = dmyMatch;
      if (yr.length === 2) yr = '20' + yr;
      let n1 = parseInt(p1, 10);
      let n2 = parseInt(p2, 10);
      let y = parseInt(yr, 10);
      let hour = hh ? parseInt(hh, 10) : 0;
      if (ampm) {
        if (ampm.toLowerCase() === 'pm' && hour < 12) hour += 12;
        if (ampm.toLowerCase() === 'am' && hour === 12) hour = 0;
      }
      const minute = mm ? parseInt(mm, 10) : 0;

      let parsed1 = new Date(y, n2 - 1, n1, hour, minute);
      if (n1 <= 12 && n2 > 12) {
        parsed1 = new Date(y, n1 - 1, n2, hour, minute);
      }
      if (!isNaN(parsed1.getTime())) return parsed1;
    }

    const fallback = new Date(ts);
    return isNaN(fallback.getTime()) ? null : fallback;
  }

  function extractDateBounds(messageList) {
    if (!Array.isArray(messageList) || messageList.length === 0) {
      return null;
    }
    const validTimestamps = [];
    for (let i = 0; i < messageList.length; i++) {
      const m = messageList[i];
      if (m && m.timestamp) {
        const d = parseTimestamp(m.timestamp);
        if (d && !isNaN(d.getTime())) {
          validTimestamps.push(d.getTime());
        }
      }
    }
    if (validTimestamps.length === 0) {
      return null;
    }
    const minTime = Math.min(...validTimestamps);
    const maxTime = Math.max(...validTimestamps);
    const minDate = new Date(minTime);
    const maxDate = new Date(maxTime);
    return {
      minDateStr: formatDateYMD(minDate),
      maxDateStr: formatDateYMD(maxDate),
      minDateTimeStr: formatDateTimeYMDHM(minDate),
      maxDateTimeStr: formatDateTimeYMDHM(maxDate),
      minDate,
      maxDate,
      minTime,
      maxTime,
      hasDates: true
    };
  }

  function filterMessagesByDateRange(messages, fromStr, toStr) {
    if (!Array.isArray(messages) || messages.length === 0) return [];
    if (!fromStr && !toStr) return messages;

    const fromDate = fromStr ? parseTimestamp(fromStr) : null;
    const toDate = toStr ? parseTimestamp(toStr) : null;

    const fromTime = fromDate ? fromDate.getTime() : -Infinity;
    const toTime = toDate ? toDate.getTime() : Infinity;

    return messages.filter(m => {
      if (!m || !m.timestamp) return true; // keep messages without timestamps
      const d = parseTimestamp(m.timestamp);
      if (!d || isNaN(d.getTime())) return true;
      const t = d.getTime();
      return t >= fromTime && t <= toTime;
    });
  }

  global.StegDateFilter = {
    formatDateYMD,
    formatDateTimeYMDHM,
    parseTimestamp,
    extractDateBounds,
    filterMessagesByDateRange
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      formatDateYMD,
      formatDateTimeYMDHM,
      parseTimestamp,
      extractDateBounds,
      filterMessagesByDateRange
    };
  }
})(typeof window !== 'undefined' ? window : globalThis);
