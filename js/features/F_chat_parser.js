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
    extract: (match) => ({ sender: match[2].trim(), message: match[3].trim() }),
  },

  // ── WhatsApp iOS ────────────────────────────────────
  // Format: "[12/5/26, 2:30:00 PM] Ahmed: Message text"
  // Format: "[٧:٤٦ ص، ١٢/٦] Ahmed: Message text"
  whatsapp_ios: {
    name: 'WhatsApp (iOS)',
    regex: /^\[([^\]\n]+)\]\s*([^:]+):\s*(.+)/,
    extract: (match) => ({ sender: match[2].trim(), message: match[3].trim() }),
  },

  // ── Facebook Messenger ──────────────────────────────
  // Format: "Ahmed\nHello my friend\n12:30 PM"
  // Format: "Ahmed\n12:30 PM\nHello my friend"
  facebook: {
    name: 'Facebook Messenger',
    regex: /^([^:\n]{1,30})\s*(?:\d{1,2}:\d{2}\s*(?:[APap][Mm]|ص|م)?)?\s*$/,
    extract: (match) => ({ sender: match[1].trim(), message: '' }),
    multilineBody: true,
  },

  // ── Instagram ───────────────────────────────────────
  // Format: "Ahmed\nHello my friend"
  instagram: {
    name: 'Instagram',
    regex: /^([^:\n]{1,30})\s*(?:\d{1,2}:\d{2}\s*(?:[APap][Mm]|ص|م)?)?\s*$/,
    extract: (match) => ({ sender: match[1].trim(), message: '' }),
    multilineBody: true,
  },

  // ── Telegram ────────────────────────────────────────
  // Exported format: "Ahmed, [12.05.26 14:30]\nMessage text"
  // Exported format: "Ahmed, [May 12, 2026 at 2:30 PM]\nMessage text"
  // Copy-paste format: "Ahmed:\nMessage text\n\n"  (Name: on its own line)
  telegram: {
    name: 'Telegram',
    regex: /^([^,\[:\n]+)(?:,\s*\[([^\]]+)\]|:)\s*$/,
    extract: (match) => ({ sender: match[1].trim(), message: '' }),
    multilineBody: true,
  },

  // ── X (Twitter) ─────────────────────────────────────
  // Format: "Ahmed\n@ahmed_handle\nHello my friend"
  x: {
    name: 'X (Twitter)',
    regex: /^([^:\n]{1,30})(?:\s+@[a-zA-Z0-9_]{1,20})?\s*$/,
    extract: (match) => ({ sender: match[1].trim(), message: '' }),
    multilineBody: true,
  },

  // ── TikTok ──────────────────────────────────────────
  // Format: "Ahmed\nHello my friend"
  tiktok: {
    name: 'TikTok',
    regex: /^([^:\n]{1,30})\s*(?:\d{1,2}:\d{2})?\s*$/,
    extract: (match) => ({ sender: match[1].trim(), message: '' }),
    multilineBody: true,
  },

  // ── YouTube ─────────────────────────────────────────
  // Format: "Ahmed\n12:30 PM\nMessage text"
  youtube: {
    name: 'YouTube',
    regex: /^([^:\n]{1,30})\s*(?:\d{1,2}:\d{2}\s*(?:[APap][Mm]|ص|م)?)?\s*$/,
    extract: (match) => ({ sender: match[1].trim(), message: '' }),
    multilineBody: true,
  },

  // ── WeChat ──────────────────────────────────────────
  // Format: "Ahmed: Message text"
  // Format: "[12:30] Ahmed: Message text"
  wechat: {
    name: 'WeChat',
    regex: /^(?:\[([^\]\n]+)\]\s*)?([^:]{1,30}):\s*(.+)/,
    extract: (match) => ({ sender: match[2].trim(), message: match[3].trim() }),
  },

  // ── Snapchat ────────────────────────────────────────
  // Format: "Ahmed\nHello my friend"
  snapchat: {
    name: 'Snapchat',
    regex: /^([^:\n]{1,30})\s*(?:\d{1,2}:\d{2}\s*(?:[APap][Mm]|ص|م)?)?\s*$/,
    extract: (match) => ({ sender: match[1].trim(), message: '' }),
    multilineBody: true,
  },

  // ── LinkedIn ────────────────────────────────────────
  // Format: "Ahmed\n12:30 PM\nMessage text"
  linkedin: {
    name: 'LinkedIn',
    regex: /^([^:\n]{1,30})\s*(?:\d{1,2}:\d{2}\s*(?:[APap][Mm]|ص|م)?)?\s*$/,
    extract: (match) => ({ sender: match[1].trim(), message: '' }),
    multilineBody: true,
  },

  // ── Manual / Simple Chat ────────────────────────────
  // Format: "Ahmed: Message text" or "Ahmed: Message text"
  // Format: "Ahmed - Message" or "Ahmed - Message"
  // Format: "[Ahmed] Message" or "[Ahmed] Message"
  manual: {
    name: 'Manual Input (Name: Message)',
    regex: /^([^:–\-\[\]\n]{1,30})\s*[:–\-]\s*(.+)$|^\[([^\]\n]{1,30})\]\s*(.+)$/,
    extract: (match) => {
      if (match[1]) {
        return { sender: match[1].trim(), message: match[2].trim() };
      } else {
        return { sender: match[3].trim(), message: match[4].trim() };
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

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] >= 2 ? best[0] : 'generic';
}


/**
 * Parse raw chat text into an array of structured messages.
 *
 * Handles both single-line and multi-line message formats.
 * For multi-line platforms (Telegram, Discord, iMessage), lines
 * that don't match the header pattern are appended to the
 * previous message's body.
 *
 * @param {string} rawText  - The raw pasted chat text.
 * @param {string} platform - Platform key from detectPlatform() or manual selection.
 * @returns {{ sender: string, message: string }[]} Array of parsed messages.
 */
function parseChat(rawText, platform) {
  // Generic fallback — each non-empty line is a separate message
  if (platform === 'generic' || !CHAT_PLATFORMS[platform]) {
    return rawText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => ({ sender: '', message: line }));
  }

  const config = CHAT_PLATFORMS[platform];
  const lines = rawText.split('\n');
  const messages = [];
  let currentMessage = null;

  for (const line of lines) {
    const match = line.match(config.regex);

    if (match) {
      // Save previous message if exists
      if (currentMessage) {
        currentMessage.message = currentMessage.message.trim();
        if (currentMessage.message) messages.push(currentMessage);
      }

      // Start new message
      currentMessage = config.extract(match);

    } else {
      // Continuation line or prefix before first match — append to current message body
      const trimmed = line.trim();
      if (trimmed) {
        if (!currentMessage) {
          currentMessage = { sender: '', message: '' };
        }
        currentMessage.message += (currentMessage.message ? '\n' : '') + trimmed;
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
