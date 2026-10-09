/**
 * @file chat-importer.js
 * @description Bridges chat log ingestion to the centralized window.ChatParsers module.
 * Zero duplicate regex parsing logic.
 * Compatible with browser script tags and module exports.
 */

(function (global) {
  'use strict';

  /**
   * Line-by-line fallback message splitter for generic plain text files.
   *
   * @param {string} rawText - Raw input text.
   * @returns {Array} List of structured messages.
   */
  function splitChatIntoMessages(rawText) {
    if (!rawText) return [];

    // Check if rawText actually contains chat timestamp patterns (e.g. WhatsApp format)
    const waHeaderRegex = /(?:^|\r?\n)(\d{1,2}\/\d{1,2}\/\d{2,4},\s*\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\s*-\s*([^:]+):\s*(.*)/;
    if (!waHeaderRegex.test(rawText)) {
      // Plain text: return a single message entry preserving the EXACT rawText verbatim
      return [{
        timestamp: null,
        sender: null,
        rawText: rawText,
        cleanText: rawText
      }];
    }

    const lines = rawText.split(/\r?\n/);
    const messages = [];
    let currentMsg = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // WhatsApp timestamp line heuristic: "M/D/YY, H:MM [AM/PM] - Sender: Message"
      const waMatch = line.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4},\s*\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\s*-\s*([^:]+):\s*(.*)$/);
      if (waMatch) {
        if (currentMsg) messages.push(currentMsg);
        currentMsg = {
          timestamp: waMatch[1],
          sender: waMatch[2].trim(),
          rawText: waMatch[3],
          cleanText: waMatch[3]
        };
        continue;
      }

      // Multi-line continuation of existing message (preserve empty lines inside message body!)
      if (currentMsg) {
        currentMsg.rawText += '\n' + line;
        currentMsg.cleanText += '\n' + line;
      } else {
        if (line.trim().length === 0) continue;
        currentMsg = {
          timestamp: null,
          sender: null,
          rawText: line,
          cleanText: line
        };
      }
    }

    if (currentMsg) messages.push(currentMsg);
    return messages;
  }

  /**
   * Ingests and parses an uploaded chat export file using window.ChatParsers.
   *
   * @param {File} file - Browser File object.
   * @param {string} rawText - File contents text.
   * @returns {Object} { messageList: Array, formattedChatText: string }
   */
  function parseChatFile(file, rawText) {
    const cleanBOM = (rawText || '').replace(/^\uFEFF/, '');
    const normalizedRawText = cleanBOM.replace(/\r/g, '');
    const ext = file && file.name ? file.name.split('.').pop().toLowerCase() : 'txt';
    let messageList = [];
    let formattedChatText = '';

    if (global.ChatParsers) {
      const P = global.ChatParsers;
      try {
        if (ext === 'json') {
          let parsed = P.parseTelegramJson(normalizedRawText);
          if (!parsed || !parsed.messages || parsed.messages.length === 0) parsed = P.parseMetaJson(normalizedRawText);
          if (!parsed || !parsed.messages || parsed.messages.length === 0) parsed = P.parseGenericJson(normalizedRawText);
          if (parsed && Array.isArray(parsed.messages)) messageList = parsed.messages;
        } else if (ext === 'csv') {
          const parsed = P.parseGenericCsv(normalizedRawText);
          if (parsed && Array.isArray(parsed.messages)) messageList = parsed.messages;
        } else if (ext === 'html' || ext === 'htm') {
          const parsed = P.parseGenericHtml(normalizedRawText);
          if (parsed && Array.isArray(parsed.messages)) messageList = parsed.messages;
        } else {
          // Plain .txt: try WhatsApp
          const parsed = P.parseWhatsAppTxt ? P.parseWhatsAppTxt(normalizedRawText) : null;
          if (parsed && Array.isArray(parsed.messages) && parsed.messages.length > 0) {
            messageList = parsed.messages;
          }
        }
      } catch (err) {
        console.warn('Parser error in ChatImporter:', err);
      }
    }

    if (!messageList || messageList.length === 0) {
      // Use cleanBOM to preserve native CRLF for non-chat text files
      messageList = splitChatIntoMessages(cleanBOM);
    }

    if (messageList.length === 1 && !messageList[0].sender && !messageList[0].timestamp) {
      formattedChatText = cleanBOM;
    } else if (messageList.length > 0) {
      formattedChatText = messageList.map(m => m.rawText || m.cleanText || (typeof m === 'string' ? m : '')).filter(Boolean).join('\n');
    } else {
      formattedChatText = cleanBOM;
    }

    return {
      messageList,
      formattedChatText
    };
  }

  global.StegChatImporter = {
    parseChatFile,
    splitChatIntoMessages
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parseChatFile, splitChatIntoMessages };
  }
})(typeof window !== 'undefined' ? window : globalThis);
