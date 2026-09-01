// ============================================================================
// Pure JavaScript Platform Parsers
// Non-Module JavaScript (file:// Compatible)
// ============================================================================

(function () {
  const SYSTEM_PATTERNS = [
    /^<Media omitted>$/i,
    /^<image omitted>$/i,
    /^<video omitted>$/i,
    /^<sticker omitted>$/i,
    /^<audio omitted>$/i,
    /^<document omitted>$/i,
    /^<GIF omitted>$/i,
    /^image omitted$/i,
    /^video omitted$/i,
    /^sticker omitted$/i,
    /^Messages and calls are end-to-end encrypted\.?\s*.*$/i,
    /^This message was deleted\.?$/i,
    /^You deleted this message\.?$/i,
    /^Missed voice call$/i,
    /^Missed video call$/i,
    /^\+?\d[\d\s\-()]+ (joined|left|was added|was removed|changed the)/i,
    /^.+ (created group|changed the subject|changed this group)/i,
    /^.+ (joined|left) using this group's invite link$/i,
    /^You('re| are) now an admin$/i,
    /^null$/,
  ];

  function isSystemMessage(text) {
    if (!text || !text.trim()) return true;
    const trimmed = text.trim();
    return SYSTEM_PATTERNS.some((p) => p.test(trimmed));
  }

  function fixMetaEncoding(text) {
    if (!text) return '';
    try {
      const bytes = new Uint8Array(Array.from(text).map((c) => c.charCodeAt(0)));
      const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      if (decoded !== text && decoded.length > 0) return decoded;
    } catch { /* ignore */ }
    return text;
  }

  function parseCSVString(text) {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if ((char === '\r' || char === '\n') && !insideQuotes) {
        if (char === '\r' && nextChar === '\n') i++;
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }

    if (currentField.length > 0 || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      if (currentRow.some((f) => f.length > 0)) {
        rows.push(currentRow);
      }
    }

    return rows;
  }

  const WHATSAPP_PATTERNS = [
    /^[\u200E\u200F\s]*\[(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm]|\s*[\u0600-\u06FF]+)?)\]\s+([^:]+?):\s([\s\S]*)/,
    /^[\u200E\u200F\s]*(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm]|\s*[\u0600-\u06FF]+)?)\s+-\s+([^:]+?):\s([\s\S]*)/,
    /^[\u200E\u200F\s]*(\d{4}[-\/\.]\d{1,2}[-\/\.]\d{1,2},?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm]|\s*[\u0600-\u06FF]+)?)\s+-\s+([^:]+?):\s([\s\S]*)/,
  ];

  function parseWhatsAppTxt(text) {
    const lines = text.split('\n');
    const messages = [];
    let ignoredCount = 0;
    let currentMsg = null;

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const lineNum = idx + 1;
      if (!line.trim()) {
        if (currentMsg) currentMsg.rawLines.push('');
        continue;
      }

      const cleanLineForMatch = (typeof extractVSFromText === 'function')
        ? extractVSFromText(line).cleanText
        : line;

      let matched = null;
      for (const pattern of WHATSAPP_PATTERNS) {
        const m = cleanLineForMatch.match(pattern);
        if (m) {
          const timestamp = m[1].trim();
          const sender = m[2].trim();
          let body = m[3];
          const senderIdx = line.indexOf(sender);
          if (senderIdx !== -1) {
            const colonIdx = line.indexOf(':', senderIdx + sender.length);
            if (colonIdx !== -1) {
              body = line.substring(colonIdx + 1);
            }
          }
          matched = { timestamp, sender, body, lineNum };
          break;
        }
      }

      if (matched) {
        if (currentMsg) {
          const clean = currentMsg.rawLines.join('\n').trim();
          if (isSystemMessage(clean)) ignoredCount++;
          else if (clean.length > 0) {
            messages.push(buildMsg('whatsapp', currentMsg.sender, currentMsg.timestamp, currentMsg.rawLines.join('\n'), clean, currentMsg.lineNum));
          }
        }
        currentMsg = { timestamp: matched.timestamp, sender: matched.sender, rawLines: [matched.body], lineNum: matched.lineNum };
      } else if (currentMsg) {
        currentMsg.rawLines.push(line);
      }
    }

    if (currentMsg) {
      const clean = currentMsg.rawLines.join('\n').trim();
      if (isSystemMessage(clean)) ignoredCount++;
      else if (clean.length > 0) {
        messages.push(buildMsg('whatsapp', currentMsg.sender, currentMsg.timestamp, currentMsg.rawLines.join('\n'), clean, currentMsg.lineNum));
      }
    }

    return { platform: 'whatsapp', conversationTitle: null, messages, errors: [], ignoredCount };
  }

  function parseTelegramJson(jsonText) {
    const messages = [];
    let ignoredCount = 0;
    let conversationTitle = null;

    try {
      const data = typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText;
      const chats = data.chats?.list || (data.messages ? [{ name: data.name, messages: data.messages }] : [data]);

      for (const chat of chats) {
        if (chat.name && !conversationTitle) conversationTitle = chat.name;
        const msgs = chat.messages || [];

        for (const m of msgs) {
          if (m.type === 'service') { ignoredCount++; continue; }

          let text = '';
          if (typeof m.text === 'string') text = m.text;
          else if (Array.isArray(m.text)) {
            text = m.text.map((part) => (typeof part === 'string' ? part : part.text || '')).join('');
          }

          const clean = text.trim();
          if (!clean) { ignoredCount++; continue; }

          messages.push(buildMsg('telegram', m.from || m.from_id || null, m.date || null, text, clean));
        }
      }
    } catch (e) {
      return { platform: 'telegram', conversationTitle: null, messages: [], errors: [e.message], ignoredCount: 0 };
    }

    return { platform: 'telegram', conversationTitle, messages, errors: [], ignoredCount };
  }

  function parseTelegramHtml(htmlText) {
    const messages = [];
    let ignoredCount = 0;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');
      const msgEls = doc.querySelectorAll('.message, .default');

      for (const el of msgEls) {
        if (el.classList.contains('service')) { ignoredCount++; continue; }

        const textEl = el.querySelector('.text');
        const text = textEl?.textContent?.trim();
        if (!text) { ignoredCount++; continue; }

        const senderEl = el.querySelector('.from_name');
        const dateEl = el.querySelector('.date');

        messages.push(buildMsg(
          'telegram',
          senderEl?.textContent?.trim() || null,
          dateEl?.getAttribute('title') || dateEl?.textContent?.trim() || null,
          text,
          text
        ));
      }
    } catch (e) {
      return { platform: 'telegram', conversationTitle: null, messages: [], errors: [e.message], ignoredCount: 0 };
    }

    return { platform: 'telegram', conversationTitle: null, messages, errors: [], ignoredCount };
  }

  function parseMetaJson(jsonText, platform = 'facebook') {
    const messages = [];
    let ignoredCount = 0;
    let conversationTitle = null;

    try {
      const data = typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText;
      if (data.title) conversationTitle = fixMetaEncoding(data.title);

      const rawMsgs = Array.isArray(data.messages) ? data.messages : (Array.isArray(data) ? data : []);

      for (const m of rawMsgs) {
        const rawText = m.content || m.text || m.body;
        if (!rawText) { ignoredCount++; continue; }

        const clean = fixMetaEncoding(rawText).trim();
        if (!clean) { ignoredCount++; continue; }

        const sender = m.sender_name ? fixMetaEncoding(m.sender_name) : null;
        let timestamp = null;
        if (m.timestamp_ms) timestamp = new Date(m.timestamp_ms).toISOString();
        else if (m.timestamp) timestamp = new Date(m.timestamp * 1000).toISOString();

        messages.push(buildMsg(platform, sender, timestamp, rawText, clean));
      }
    } catch (e) {
      return { platform, conversationTitle: null, messages: [], errors: [e.message], ignoredCount: 0 };
    }

    return { platform, conversationTitle, messages, errors: [], ignoredCount };
  }

  function parseMetaHtml(htmlText, platform = 'facebook') {
    const messages = [];
    let ignoredCount = 0;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');
      const containerEls = doc.querySelectorAll('.pam._3-95._2pi0._2lej, .message, [role="row"]');

      for (const container of containerEls) {
        const contentEl = container.querySelector('._2ph_._a6-p, .content, p, div > div:last-child');
        const text = contentEl?.textContent?.trim();
        if (!text) { ignoredCount++; continue; }

        const senderEl = container.querySelector('._2ph_._a6-h, .user');
        const dateEl = container.querySelector('._3-94._2lem, .meta');

        messages.push(buildMsg(platform, senderEl?.textContent?.trim() || null, dateEl?.textContent?.trim() || null, text, text));
      }
    } catch (e) {
      return { platform, conversationTitle: null, messages: [], errors: [e.message], ignoredCount: 0 };
    }

    return { platform, conversationTitle: null, messages, errors: [], ignoredCount };
  }

  function parseLinkedInCsv(csvText) {
    const rows = parseCSVString(csvText);
    if (rows.length < 2) return { platform: 'linkedin', conversationTitle: null, messages: [], errors: ['Empty CSV'], ignoredCount: 0 };

    const headers = rows[0].map((h) => h.toUpperCase());
    const contentIdx = headers.findIndex((h) => ['CONTENT', 'MESSAGE', 'BODY', 'TEXT'].includes(h));
    const senderIdx = headers.findIndex((h) => ['FROM', 'SENDER'].includes(h));
    const dateIdx = headers.findIndex((h) => ['DATE', 'TIMESTAMP'].includes(h));

    if (contentIdx === -1) {
      return { platform: 'linkedin', conversationTitle: null, messages: [], errors: ['No message column found in LinkedIn CSV'], ignoredCount: 0 };
    }

    const messages = [];
    let ignoredCount = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const text = row[contentIdx]?.trim();
      if (!text) { ignoredCount++; continue; }

      messages.push(buildMsg(
        'linkedin',
        senderIdx !== -1 ? row[senderIdx] || null : null,
        dateIdx !== -1 ? row[dateIdx] || null : null,
        text,
        text
      ));
    }

    return { platform: 'linkedin', conversationTitle: null, messages, errors: [], ignoredCount };
  }

  const GENERIC_PREFIX_PATTERNS = [
    /^\[?\d{4}[-\/]\d{1,2}[-\/]\d{1,2}[,\s]+\d{1,2}:\d{2}(?::\d{2})?\]?\s*[-–]?\s*[^:]+:\s*/,
    /^\[?\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4}[,\s]+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?\]?\s*[-–]?\s*[^:]+:\s*/,
    /^\[?\d{1,2}:\d{2}(?::\d{2})?\]?\s*[^:]+:\s*/,
    /^[A-Za-z\u0600-\u06FF][\w\s\u0600-\u06FF]{1,30}:\s*/,
  ];

  function parseGenericTxt(text) {
    const lines = text.split('\n');
    const messages = [];
    let ignoredCount = 0;
    let currentMsg = [];
    let currentLineNum = 1;

    // Check if ANY lines match GENERIC_PREFIX_PATTERNS
    let hasPrefixes = false;
    for (const line of lines) {
      if (!line.trim()) continue;
      const cleanLine = (typeof extractVSFromText === 'function') ? extractVSFromText(line).cleanText : line;
      if (GENERIC_PREFIX_PATTERNS.some(p => p.test(cleanLine))) {
        hasPrefixes = true;
        break;
      }
    }

    // If no standard prefixes are found in a multi-line document/conversation, treat each non-empty line as an independent message
    if (!hasPrefixes && lines.filter(l => l.trim().length > 0).length > 1) {
      for (let idx = 0; idx < lines.length; idx++) {
        const line = lines[idx];
        const trimmed = line.trim();
        if (!trimmed) continue;

        let sender = null;
        let body = line;
        const colonMatch = line.match(/^[\u200E\u200F\s]*([A-Za-z\u0600-\u06FF0-9_\-\s]{1,30}):\s*([\s\S]*)$/);
        if (colonMatch && !colonMatch[1].startsWith('http')) {
          sender = colonMatch[1].trim();
          body = colonMatch[2];
        }

        messages.push(buildMsg('generic', sender, null, line, (body || trimmed), idx + 1));
      }
      return { platform: 'generic', conversationTitle: null, messages, errors: [], ignoredCount };
    }

    const flush = () => {
      if (currentMsg.length === 0) return;
      const raw = currentMsg.join('\n').trim();
      if (!raw) return;

      let clean = raw;
      for (const pattern of GENERIC_PREFIX_PATTERNS) {
        const m = clean.match(pattern);
        if (m) { clean = clean.substring(m[0].length).trim(); break; }
      }

      if (!clean) ignoredCount++;
      else messages.push(buildMsg('generic', null, null, raw, clean, currentLineNum));
    };

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      if (!line.trim()) {
        flush();
        currentMsg = [];
        continue;
      }

      const cleanLineForMatch = (typeof extractVSFromText === 'function')
        ? extractVSFromText(line).cleanText
        : line;

      const isNew = GENERIC_PREFIX_PATTERNS.some((p) => p.test(cleanLineForMatch));
      if (isNew && currentMsg.length > 0) {
        flush();
        currentMsg = [line];
        currentLineNum = idx + 1;
      } else {
        if (currentMsg.length === 0) currentLineNum = idx + 1;
        currentMsg.push(line);
      }
    }
    flush();

    return { platform: 'generic', conversationTitle: null, messages, errors: [], ignoredCount };
  }

  function parseGenericCsv(csvText, selectedColumn = null) {
    const rows = parseCSVString(csvText);
    if (rows.length < 2) return { platform: 'generic', conversationTitle: null, messages: [], errors: ['Empty CSV'], ignoredCount: 0 };

    const headers = rows[0];
    let textIdx = -1;

    if (selectedColumn) {
      textIdx = headers.indexOf(selectedColumn);
    } else {
      const candidates = ['content', 'text', 'message', 'body', 'comment', 'description'];
      textIdx = headers.findIndex((h) => candidates.includes(h.toLowerCase().trim()));
    }

    if (textIdx === -1) {
      return {
        platform: 'generic',
        conversationTitle: null,
        messages: [],
        errors: ['Need Column Selection'],
        headers,
        ignoredCount: 0,
      };
    }

    const messages = [];
    let ignoredCount = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const text = row[textIdx]?.trim();
      if (!text) { ignoredCount++; continue; }

      messages.push(buildMsg('generic', null, null, text, text));
    }

    return { platform: 'generic', conversationTitle: null, messages, errors: [], ignoredCount };
  }

  function parseGenericJson(jsonText) {
    const messages = [];

    const extractRecursive = (obj, depth = 0) => {
      if (depth > 10 || !obj) return;
      if (Array.isArray(obj)) {
        for (const item of obj) extractRecursive(item, depth + 1);
        return;
      }

      if (typeof obj === 'object') {
        const keys = ['content', 'text', 'message', 'body', 'comment', 'msg'];
        for (const k of keys) {
          if (typeof obj[k] === 'string' && obj[k].trim()) {
            const text = obj[k].trim();
            messages.push(buildMsg('generic', obj.sender || obj.from || null, obj.date || obj.timestamp || null, text, text));
            return;
          }
        }

        for (const v of Object.values(obj)) {
          if (typeof v === 'object') extractRecursive(v, depth + 1);
        }
      }
    };

    try {
      const data = typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText;
      extractRecursive(data);
    } catch (e) {
      return { platform: 'generic', conversationTitle: null, messages: [], errors: [e.message], ignoredCount: 0 };
    }

    return { platform: 'generic', conversationTitle: null, messages, errors: [], ignoredCount: 0 };
  }

  function parseGenericHtml(htmlText) {
    const messages = [];
    let ignoredCount = 0;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');

      doc.querySelectorAll('script, style, nav, meta, button, header, footer').forEach((el) => el.remove());

      const els = doc.querySelectorAll('.message, .msg, .comment, p, article');
      for (const el of els) {
        const text = el.textContent?.trim();
        if (!text || text.length < 2) { ignoredCount++; continue; }

        messages.push(buildMsg('generic', null, null, text, text));
      }
    } catch (e) {
      return { platform: 'generic', conversationTitle: null, messages: [], errors: [e.message], ignoredCount: 0 };
    }

    return { platform: 'generic', conversationTitle: null, messages, errors: [], ignoredCount };
  }

  async function parseZipArchive(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const extractedFiles = [];

      let offset = 0;
      let hasCentralDir = false;

      // 1. Scan for Central Directory Headers (0x02014b50 - PK\x01\x02)
      while (offset < bytes.length - 46) {
        if (bytes[offset] === 0x50 && bytes[offset + 1] === 0x4b && bytes[offset + 2] === 0x01 && bytes[offset + 3] === 0x02) {
          hasCentralDir = true;
          const compMethod = bytes[offset + 10] | (bytes[offset + 11] << 8);
          const compSize = (bytes[offset + 20] | (bytes[offset + 21] << 8) | (bytes[offset + 22] << 16) | (bytes[offset + 23] << 24)) >>> 0;
          const uncompSize = (bytes[offset + 24] | (bytes[offset + 25] << 8) | (bytes[offset + 26] << 16) | (bytes[offset + 27] << 24)) >>> 0;
          const fileNameLen = bytes[offset + 28] | (bytes[offset + 29] << 8);
          const extraLen = bytes[offset + 30] | (bytes[offset + 31] << 8);
          const commentLen = bytes[offset + 32] | (bytes[offset + 33] << 8);
          const localHeaderOffset = (bytes[offset + 42] | (bytes[offset + 43] << 8) | (bytes[offset + 44] << 16) | (bytes[offset + 45] << 24)) >>> 0;

          const nameBytes = bytes.subarray(offset + 46, offset + 46 + fileNameLen);
          const fileName = new TextDecoder('utf-8').decode(nameBytes);

          if (!fileName.endsWith('/') && !fileName.includes('__MACOSX') && compSize > 0) {
            const ext = fileName.split('.').pop().toLowerCase();
            if (['txt', 'json', 'html', 'htm', 'csv'].includes(ext)) {
              const localFileNameLen = bytes[localHeaderOffset + 26] | (bytes[localHeaderOffset + 27] << 8);
              const localExtraLen = bytes[localHeaderOffset + 28] | (bytes[localHeaderOffset + 29] << 8);
              const dataStart = localHeaderOffset + 30 + localFileNameLen + localExtraLen;
              const dataEnd = dataStart + compSize;

              const compData = bytes.subarray(dataStart, dataEnd);
              let uncompData = null;

              if (compMethod === 0) {
                uncompData = compData;
              } else if (compMethod === 8) {
                try {
                  if (typeof DecompressionStream !== 'undefined') {
                    const ds = new DecompressionStream('deflate-raw');
                    const writer = ds.writable.getWriter();
                    writer.write(compData);
                    writer.close();
                    const resp = new Response(ds.readable);
                    const buf = await resp.arrayBuffer();
                    uncompData = new Uint8Array(buf);
                  }
                } catch (e) {
                  console.warn('Zip deflate error for:', fileName, e);
                }
              }

              if (uncompData) {
                const text = new TextDecoder('utf-8').decode(uncompData);
                extractedFiles.push({ name: fileName, ext, text, size: uncompSize });
              }
            }
          }
          offset += 46 + fileNameLen + extraLen + commentLen;
        } else {
          offset++;
        }
      }

      // 2. Fallback to Local Header scan if Central Directory was not found
      if (!hasCentralDir) {
        offset = 0;
        while (offset < bytes.length - 30) {
          if (bytes[offset] === 0x50 && bytes[offset + 1] === 0x4b && bytes[offset + 2] === 0x03 && bytes[offset + 3] === 0x04) {
            const compMethod = bytes[offset + 8] | (bytes[offset + 9] << 8);
            const compSize = (bytes[offset + 18] | (bytes[offset + 19] << 8) | (bytes[offset + 20] << 16) | (bytes[offset + 21] << 24)) >>> 0;
            const uncompSize = (bytes[offset + 22] | (bytes[offset + 23] << 8) | (bytes[offset + 24] << 16) | (bytes[offset + 25] << 24)) >>> 0;
            const fileNameLen = bytes[offset + 26] | (bytes[offset + 27] << 8);
            const extraLen = bytes[offset + 28] | (bytes[offset + 29] << 8);

            const nameBytes = bytes.subarray(offset + 30, offset + 30 + fileNameLen);
            const fileName = new TextDecoder('utf-8').decode(nameBytes);

            const dataStart = offset + 30 + fileNameLen + extraLen;
            const dataEnd = dataStart + compSize;

            if (!fileName.endsWith('/') && !fileName.includes('__MACOSX') && compSize > 0 && dataEnd <= bytes.length) {
              const ext = fileName.split('.').pop().toLowerCase();
              if (['txt', 'json', 'html', 'htm', 'csv'].includes(ext)) {
                const compData = bytes.subarray(dataStart, dataEnd);
                let uncompData = null;

                if (compMethod === 0) {
                  uncompData = compData;
                } else if (compMethod === 8) {
                  try {
                    if (typeof DecompressionStream !== 'undefined') {
                      const ds = new DecompressionStream('deflate-raw');
                      const writer = ds.writable.getWriter();
                      writer.write(compData);
                      writer.close();
                      const resp = new Response(ds.readable);
                      const buf = await resp.arrayBuffer();
                      uncompData = new Uint8Array(buf);
                    }
                  } catch (e) {
                    console.warn('Zip deflate error for:', fileName, e);
                  }
                }

                if (uncompData) {
                  const text = new TextDecoder('utf-8').decode(uncompData);
                  extractedFiles.push({ name: fileName, ext, text, size: uncompSize });
                }
              }
            }
            offset = dataEnd > offset ? dataEnd : offset + 1;
          } else {
            offset++;
          }
        }
      }

      return extractedFiles;
    } catch (e) {
      console.error('Error unpacking ZIP archive:', e);
      return [];
    }
  }

  function buildMsg(platform, sender, timestamp, rawText, cleanText, lineNumber) {
    return {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sender,
      timestamp,
      lineNumber: lineNumber || null,
      rawText,
      cleanText,
      sourceType: 'message',
    };
  }

  window.ChatParsers = {
    isSystemMessage,
    fixMetaEncoding,
    parseCSVString,
    parseWhatsAppTxt,
    parseTelegramJson,
    parseTelegramHtml,
    parseMetaJson,
    parseMetaHtml,
    parseLinkedInCsv,
    parseGenericTxt,
    parseGenericCsv,
    parseGenericJson,
    parseGenericHtml,
    parseZipArchive,
  };
})();
