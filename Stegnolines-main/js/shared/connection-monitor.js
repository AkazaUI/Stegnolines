/**
 * STEGNOLINES — Automated Connection & Latency Monitor
 * Monitors connectivity and redirects to offline.html if network is down or extremely slow.
 */
(function() {
  // ── Path Prefix Resolver ──
  function getPathPrefix() {
    const href = window.location.href.replace(/\\/g, '/');
    if (href.includes('/docs/user-guide/')) {
      return '../../';
    } else if (href.includes('/docs/')) {
      return '../';
    }
    return '';
  }

  const prefix = getPathPrefix();
  const isOfflinePage = window.location.href.includes('offline.html');

  function redirectToOffline() {
    if (isOfflinePage) return;
    window.location.href = prefix + 'offline.html?redirect=' + encodeURIComponent(window.location.href);
  }

  // 1. Instant Offline Event Monitoring
  window.addEventListener('offline', redirectToOffline);

  // 2. Initial Status Check
  if (!navigator.onLine) {
    redirectToOffline();
  } else if (window.location.protocol.startsWith('http') && !isOfflinePage) {
    // Only perform latency check on HTTP/S protocols to avoid file:/// CORS blocks
    const checkUrl = prefix + 'assets/brand/favicon.png';
    const controller = new AbortController();
    
    // Timeout of 3.5 seconds
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.warn("STEGNOLINES: Connection latency test timed out (> 3.5s). Redirecting to offline page.");
      redirectToOffline();
    }, 3500);

    fetch(checkUrl, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal
    })
    .then(() => {
      clearTimeout(timeoutId);
    })
    .catch((err) => {
      clearTimeout(timeoutId);
      if (err.name !== 'AbortError') {
        console.warn("STEGNOLINES: Latency check failed. Redirecting to offline page.", err);
        redirectToOffline();
      }
    });
  }
})();
