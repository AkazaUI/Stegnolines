// ══════════════════════════════════════════════════════════════
// Feature: Chat Parser — Multi-Platform Message Extraction
// ══════════════════════════════════════════════════════════════
//
// Parses raw clipboard/exported chat text into structured messages.
// Supports auto-detection and manual selection of chat platforms.
//
// Supported platforms:
//   - WhatsApp (Android & iOS)
//   - Telegram
//   - Discord
//   - Signal
//   - iMessage
//   - Generic fallback (line-by-line)
//
// ══════════════════════════════════════════════════════════════


/**
 * Chat platform definitions with regex patterns.
 *
 * Each platform has:
 *   - name:    Human-readable label for UI
 *   - regex:   Pattern that matches a message-start line
 *   - extract: Function to pull sender and message from a regex match
 *
 * Regex design notes:
 *   - Patterns match the FIRST LINE of each message only
 *   - Multi-line messages are handled by the parser (lines that
 *     don't match any pattern are appended to the previous message)
 *   - All patterns are tested against each line; first match wins
 */
const CHAT_PLATFORMS = {

  // ── WhatsApp Android ────────────────────────────────
  // Format: "12/5/26, 2:30 PM – Ahmed: Message text"
  // Format: "5/12/2026, 14:30 - Ahmed: Message text"
  // Format: "١٢/٦/٢٠٢٦, ٧:٤٦ ص - Ahmed: Message text"
  // Format: "٧:٤٦ ص، ١٢/٦ - Ahmed: Message text"
  whatsapp_android: {
    name: 'WhatsApp (Android)',
    regex: /^([^\n\-–]+?)\s*[-–]\s*([^:]+):\s*(.+)/,
    extract: (match) => ({
      sender: match[2].trim(),
      timestamp: match[1].trim(),
      message: match[3].trim()
    }),
  },

  // ── WhatsApp iOS ────────────────────────────────────
  // Format: "[12/5/26, 2:30:00 PM] Ahmed: Message text"
  // Format: "[٧:٤٦ ص، ١٢/٦] Ahmed: Message text"
  whatsapp_ios: {
    name: 'WhatsApp (iOS)',
    regex: /^\[([^\]\n]+)\]\s*([^:]+):\s*(.+)/,
    extract: (match) => ({
      sender: match[2].trim(),
      timestamp: match[1].trim(),
      message: match[3].trim()
    }),
  },

  // ── Facebook Messenger ──────────────────────────────
  // Format: "Ahmed\nHello my friend\n12:30 PM"
  facebook: {
    name: 'Facebook Messenger',
    regex: /^([^:\n]{1,30})(?:\s+(\d{1,2}:\d{2}\s*(?:[APap][Mm]|ص|م)?))?\s*$/,
    extract: (match) => ({
      sender: match[1].trim(),
      timestamp: (match[2] || '').trim(),
      message: ''
    }),
    multilineBody: true,
  },

  // ── Instagram ───────────────────────────────────────
  // Format: "Ahmed\nHello my friend"
  instagram: {
    name: 'Instagram',
    regex: /^([^:\n]{1,30})(?:\s+(\d{1,2}:\d{2}\s*(?:[APap][Mm]|ص|م)?))?\s*$/,
    extract: (match) => ({
      sender: match[1].trim(),
      timestamp: (match[2] || '').trim(),
      message: ''
    }),
    multilineBody: true,
  },

  // ── Telegram ────────────────────────────────────────
  // Exported format: "Ahmed, [12.05.26 14:30]\nMessage text"
  // Exported format: "Ahmed, [May 12, 2026 at 2:30 PM]\nMessage text"
  // Copy-paste format: "Ahmed:\nMessage text\n\n"
  telegram: {
    name: 'Telegram',
    regex: /^([^,\[:\n]+)(?:,\s*\[([^\]]+)\]|:)\s*$/,
    extract: (match) => ({
      sender: match[1].trim(),
      timestamp: (match[2] || '').trim(),
      message: ''
    }),
    multilineBody: true,
  },

  // ── X (Twitter) ─────────────────────────────────────
  x: {
    name: 'X (Twitter)',
    regex: /^([^:\n]{1,30})(?:\s+@[a-zA-Z0-9_]{1,20})?\s*$/,
    extract: (match) => ({
      sender: match[1].trim(),
      timestamp: '',
      message: ''
    }),
    multilineBody: true,
  },

  // ── TikTok ──────────────────────────────────────────
  tiktok: {
    name: 'TikTok',
    regex: /^([^:\n]{1,30})(?:\s+(\d{1,2}:\d{2}))?\s*$/,
    extract: (match) => ({
      sender: match[1].trim(),
      timestamp: (match[2] || '').trim(),
      message: ''
    }),
    multilineBody: true,
  },

  // ── YouTube ─────────────────────────────────────────
  youtube: {
    name: 'YouTube',
    regex: /^([^:\n]{1,30})(?:\s+(\d{1,2}:\d{2}\s*(?:[APap][Mm]|ص|م)?))?\s*$/,
    extract: (match) => ({
      sender: match[1].trim(),
      timestamp: (match[2] || '').trim(),
      message: ''
    }),
    multilineBody: true,
  },

  // ── WeChat ──────────────────────────────────────────
  wechat: {
    name: 'WeChat',
    regex: /^(?:\[([^\]\n]+)\]\s*)?([^:]{1,30}):\s*(.+)/,
    extract: (match) => ({
      sender: match[2].trim(),
      timestamp: (match[1] || '').trim(),
      message: match[3].trim()
    }),
  },

  // ── Snapchat ────────────────────────────────────────
  snapchat: {
    name: 'Snapchat',
    regex: /^([^:\n]{1,30})(?:\s+(\d{1,2}:\d{2}\s*(?:[APap][Mm]|ص|م)?))?\s*$/,
    extract: (match) => ({
      sender: match[1].trim(),
      timestamp: (match[2] || '').trim(),
      message: ''
    }),
    multilineBody: true,
  },

  // ── LinkedIn ────────────────────────────────────────
  linkedin: {
    name: 'LinkedIn',
    regex: /^([^:\n]{1,30})(?:\s+(\d{1,2}:\d{2}\s*(?:[APap][Mm]|ص|م)?))?\s*$/,
    extract: (match) => ({
      sender: match[1].trim(),
      timestamp: (match[2] || '').trim(),
      message: ''
    }),
    multilineBody: true,
  },

  // ── Manual / Simple Chat ────────────────────────────
  manual: {
    name: 'Manual Input (Name: Message)',
    regex: /^(?:\[([^\]\n]+)\]\s*)?([^:–\-\[\]\n]{1,30})\s*[:–\-]\s*(.+)$|^\[([^\]\n]{1,30})\]\s*(.+)$/,
    extract: (match) => {
      if (match[2]) {
        return {
          sender: match[2].trim(),
          timestamp: (match[1] || '').trim(),
          message: match[3].trim()
        };
      } else {
        return {
          sender: match[4].trim(),
          timestamp: '',
          message: match[5].trim()
        };
      }
    }
  },
};


/**
 * Auto-detect the chat platform from the first few lines of text.
 *
 * Tests each platform's regex against the first 10 non-empty lines.
 * Returns the platform key with the most matches, or 'generic' if
 * no platform matches at least 2 lines.
 *
 * @param {string} rawText - The raw pasted chat text.
 * @returns {string} Platform key (e.g., 'whatsapp_android') or 'generic'.
 */
function detectPlatform(rawText) {
  const lines = rawText.split('\n').filter(l => l.trim()).slice(0, 15);
  const scores = {};

  for (const [key, platform] of Object.entries(CHAT_PLATFORMS)) {
    scores[key] = 0;
    for (const line of lines) {
      if (platform.regex.test(line)) scores[key]++;
    }
  }

  const multilinePlatforms = ['facebook', 'instagram', 'x', 'tiktok', 'youtube', 'snapchat', 'linkedin'];
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  for (const [key, score] of sorted) {
    if (score >= 2) {
      if (multilinePlatforms.includes(key)) {
        const hasHeaderMarker = lines.some(line => /:\s*|\d{1,2}:\d{2}|@\w+/.test(line));
        if (!hasHeaderMarker) continue;
      }
      return key;
    }
  }

  return 'generic';
}


/**
 * Parse raw chat text into an array of structured messages.
 *
 * Handles both single-line and multi-line message formats with O(N) linear performance.
 * Accurately extracts metadata: sender, timestamp, and 1-indexed lineNumber.
 *
 * @param {string} rawText  - The raw pasted chat text.
 * @param {string} platform - Platform key from detectPlatform() or manual selection.
 * @returns {{ sender: string, timestamp: string, lineNumber: number, message: string, rawText: string }[]} Array of parsed messages.
 */
function parseChat(rawText, platform) {
  if (!rawText) return [];

  const lines = rawText.split('\n');

  // Generic fallback with lightweight inline check for common header formats
  if (platform === 'generic' || !CHAT_PLATFORMS[platform]) {
    const GENERIC_MSG_REGEX = /^(?:\[([^\]\n]+)\]\s*|([^\n\-–]+?)\s*[-–]\s*)?([^:]+):\s*(.+)$/;
    const messages = [];

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const trimmed = line.trim();
      if (!trimmed) continue;

      const lineNum = idx + 1;
      const cleanLine = (typeof extractVSFromText === 'function')
        ? extractVSFromText(trimmed).cleanText
        : trimmed;

      const match = cleanLine.match(GENERIC_MSG_REGEX);
      if (match) {
        const rawTime = (match[1] || match[2] || '').trim();
        const rawSender = match[3].trim();
        const colonIdx = line.indexOf(':', line.indexOf(rawSender) + rawSender.length);
        const msgText = colonIdx !== -1 ? line.substring(colonIdx + 1).trim() : match[4].trim();

        messages.push({
          sender: rawSender,
          timestamp: rawTime,
          lineNumber: lineNum,
          message: msgText,
          rawText: line
        });
      } else {
        messages.push({
          sender: '',
          timestamp: '',
          lineNumber: lineNum,
          message: trimmed,
          rawText: line
        });
      }
    }
    return messages;
  }

  const config = CHAT_PLATFORMS[platform];
  const messages = [];
  let currentMessage = null;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const lineNum = idx + 1;

    const cleanLineForMatch = (typeof extractVSFromText === 'function')
      ? extractVSFromText(line).cleanText
      : line;

    const match = cleanLineForMatch.match(config.regex);

    if (match) {
      // Save previous message if exists
      if (currentMessage) {
        currentMessage.message = currentMessage.message.trim();
        if (currentMessage.message) messages.push(currentMessage);
      }

      // Start new message
      const extracted = config.extract(match);
      currentMessage = {
        sender: extracted.sender || '',
        timestamp: extracted.timestamp || '',
        lineNumber: lineNum,
        message: extracted.message || '',
        rawText: line
      };

      if (currentMessage.sender) {
        const senderIdx = line.indexOf(currentMessage.sender);
        if (senderIdx !== -1) {
          const colonIdx = line.indexOf(':', senderIdx + currentMessage.sender.length);
          if (colonIdx !== -1) {
            currentMessage.message = line.substring(colonIdx + 1).trim();
          }
        }
      }
    } else {
      // Continuation line or prefix before first match
      const trimmed = line.trim();
      if (trimmed) {
        if (!currentMessage) {
          currentMessage = {
            sender: '',
            timestamp: '',
            lineNumber: lineNum,
            message: '',
            rawText: ''
          };
        }
        currentMessage.message += (currentMessage.message ? '\n' : '') + trimmed;
        currentMessage.rawText += (currentMessage.rawText ? '\n' : '') + line;
      }
    }
  }

  // Don't forget the last message
  if (currentMessage) {
    currentMessage.message = currentMessage.message.trim();
    if (currentMessage.message) messages.push(currentMessage);
  }

  return messages;
}


/**
 * Get a list of all supported platform names for the UI dropdown.
 *
 * @returns {{ key: string, name: string }[]} Array of platform entries.
 */
function getSupportedPlatforms() {
  const platforms = [{ key: 'auto', name: '🔍 Auto Detect' }];
  for (const [key, platform] of Object.entries(CHAT_PLATFORMS)) {
    platforms.push({ key, name: platform.name });
  }
  platforms.push({ key: 'generic', name: '📝 Plain Text (One message per line)' });
  return platforms;
}
