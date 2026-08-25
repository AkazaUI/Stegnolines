// ============================================================================
// Chat Import & Stego Scanner — Export Helpers
// Non-Module JavaScript (file:// Compatible)
// ============================================================================

(function () {
  function exportCleanTXT(messages, includeMetadata) {
    return messages
      .map((m, i) => {
        if (includeMetadata) {
          const parts = [`[${i + 1}]`];
          if (m.sender) parts.push(`Sender: ${m.sender}`);
          if (m.timestamp) parts.push(`Time: ${m.timestamp}`);
          parts.push(m.cleanText);
          return parts.join('\n');
        }
        return m.cleanText;
      })
      .join('\n\n');
  }

  function exportCleanJSON(messages, includeMetadata, result) {
    const data = {
      exportedAt: new Date().toISOString(),
      platform: result.platform,
      conversationTitle: result.conversationTitle,
      messageCount: messages.length,
      messages: messages.map((m, i) => {
        const base = {
          index: i + 1,
          text: m.cleanText,
        };
        if (includeMetadata) {
          base.sender = m.sender;
          base.timestamp = m.timestamp;
          base.rawText = m.rawText;
        }
        return base;
      }),
    };
    return JSON.stringify(data, null, 2);
  }

  function exportScanReportJSON(result) {
    const report = {
      exportedAt: new Date().toISOString(),
      platform: result.platform,
      conversationTitle: result.conversationTitle,
      totalImported: result.messages.length + result.ignoredCount,
      messagesCount: result.messages.length,
      ignoredCount: result.ignoredCount,
      messages: result.messages.map((m, i) => ({
        index: i + 1,
        cleanText: m.cleanText,
        scan: m.scan,
      })),
    };
    return JSON.stringify(report, null, 2);
  }

  function exportSuspiciousCSV(messages) {
    const suspicious = messages.filter((m) => m.scan.status !== 'clean');
    const header = 'Index,Status,Invisible Count,VS Count,Clean Text\n';
    const rows = suspicious.map((m, i) => {
      const text = m.cleanText.replace(/"/g, '""').replace(/\n/g, ' ');
      return `${i + 1},"${m.scan.status}",${m.scan.invisibleCharacterCount},${m.scan.variationSelectorCount},"${text}"`;
    });

    return '\uFEFF' + header + rows.join('\n');
  }

  function downloadBlob(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  window.ChatExport = {
    exportCleanTXT,
    exportCleanJSON,
    exportScanReportJSON,
    exportSuspiciousCSV,
    downloadBlob,
  };
})();
