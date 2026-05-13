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
  // Format: "12/5/26, 2:30 PM – أحمد: نص الرسالة"
  // Format: "5/12/2026, 14:30 - Ahmed: Message text"
  whatsapp_android: {
    name: 'WhatsApp (Android)',
    regex: /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*([APap][Mm])?\s*[-–]\s*([^:]+):\s*(.+)/,
    extract: (match) => ({ sender: match[4].trim(), message: match[5].trim() }),
  },

  // ── WhatsApp iOS ────────────────────────────────────
  // Format: "[12/5/26, 2:30:00 PM] أحمد: نص الرسالة"
  whatsapp_ios: {
    name: 'WhatsApp (iOS)',
    regex: /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*([APap][Mm])?\]\s*([^:]+):\s*(.+)/,
    extract: (match) => ({ sender: match[4].trim(), message: match[5].trim() }),
  },

  // ── Telegram ────────────────────────────────────────
  // Format: "أحمد, [12.05.26 14:30]\nنص الرسالة"
  // Format: "Ahmed, [May 12, 2026 at 2:30 PM]\nMessage text"
  telegram: {
    name: 'Telegram',
    regex: /^([^,\[]+),\s*\[([^\]]+)\]\s*$/,
    extract: (match) => ({ sender: match[1].trim(), message: '' }),
    multilineBody: true,
  },

  // ── Discord ─────────────────────────────────────────
  // Format: "أحمد — Today at 2:30 PM\nنص الرسالة"
  // Format: "Ahmed — 05/12/2026 2:30 PM\nMessage text"
  discord: {
    name: 'Discord',
    regex: /^(.+?)\s*[—–-]\s*(?:Today at|Yesterday at|\d{1,2}\/\d{1,2}\/\d{2,4})\s+\d{1,2}:\d{2}\s*(?:[APap][Mm])?\s*$/,
    extract: (match) => ({ sender: match[1].trim(), message: '' }),
    multilineBody: true,
  },

  // ── Signal ──────────────────────────────────────────
  // Format: "أحمد, 2:30 PM: نص الرسالة"
  signal: {
    name: 'Signal',
    regex: /^([^,]+),\s+\d{1,2}:\d{2}\s*(?:[APap][Mm])?:\s*(.+)/,
    extract: (match) => ({ sender: match[1].trim(), message: match[2].trim() }),
  },

  // ── iMessage ────────────────────────────────────────
  // Format: "أحمد  2:30 PM\nنص الرسالة"
  imessage: {
    name: 'iMessage',
    regex: /^(.+?)\s{2,}\d{1,2}:\d{2}\s*(?:[APap][Mm])?\s*$/,
    extract: (match) => ({ sender: match[1].trim(), message: '' }),
    multilineBody: true,
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

    } else if (currentMessage) {
      // Continuation line — append to current message body
      const trimmed = line.trim();
      if (trimmed) {
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
  const platforms = [{ key: 'auto', name: '🔍 كشف تلقائي' }];
  for (const [key, platform] of Object.entries(CHAT_PLATFORMS)) {
    platforms.push({ key, name: platform.name });
  }
  platforms.push({ key: 'generic', name: '📝 نص عادي (كل سطر = رسالة)' });
  return platforms;
}
