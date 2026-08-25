/**
 * STEGNOLINES — Branded Page Transition Loader & Navigation Interceptor
 * 
 * Self-contained, hardware-accelerated premium CSS loader that eliminates
 * FOUC (Font Flash of Unstyled Content) and transition stuttering by waiting 
 * for browser Font Loading API, enforcing minimum duration, and using 
 * high-performance CSS keyframe compositor animations.
 */
(function() {
  // ── INJECT PREMIUM CSS STYLES INSTANTLY ──
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .page-loader {
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      background: #12130a; /* Pure deep stego background */
      display: flex; align-items: center; justify-content: center;
      z-index: 9999999;
      opacity: 1; visibility: visible;
      transition: opacity 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), visibility 0.4s;
      overflow: hidden;
      box-sizing: border-box;
    }
    .page-loader.fade-out {
      opacity: 0;
      pointer-events: none;
      visibility: hidden;
    }
    .stego-loader-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
    }
    .stego-loader-spinner {
      position: relative;
      width: 100px;
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    /* Concentric morphing compositor rings */
    .stego-loader-ring {
      position: absolute;
      border-radius: 50%;
      border: 3px solid transparent;
      animation: stego-rotate var(--duration) linear infinite;
      box-sizing: border-box;
    }
    .stego-loader-ring--outer {
      width: 100%; height: 100%;
      border-top-color: #bbf100;
      border-bottom-color: #7da300;
      --duration: 2s;
      filter: drop-shadow(0 0 10px rgba(187, 241, 0, 0.45));
    }
    .stego-loader-ring--middle {
      width: 78%; height: 78%;
      border-left-color: #7da300;
      border-right-color: #ffffff;
      --duration: 1.4s;
      animation-direction: reverse;
      filter: drop-shadow(0 0 8px rgba(125, 163, 0, 0.35));
    }
    .stego-loader-ring--inner {
      width: 56%; height: 56%;
      border-top-color: #ffffff;
      border-bottom-color: #bbf100;
      --duration: 0.9s;
      filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.5));
    }
    /* Inner pulsing core logo or symbol */
    .stego-loader-core {
      width: 25%; height: 25%;
      background: #bbf100;
      border-radius: 50%;
      box-shadow: 0 0 25px rgba(187, 241, 0, 0.9);
      animation: stego-pulse 1s ease-in-out infinite alternate;
      box-sizing: border-box;
    }
    .stego-loader-text {
      font-family: 'Sora', sans-serif;
      font-size: 1.05rem;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: 3px;
      text-transform: uppercase;
      animation: stego-text-pulse 1.4s ease-in-out infinite alternate;
      text-shadow: 0 0 12px rgba(187, 241, 0, 0.6);
    }
    @keyframes stego-rotate {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes stego-pulse {
      0% { transform: scale(0.8); opacity: 0.5; }
      100% { transform: scale(1.15); opacity: 1; }
    }
    @keyframes stego-text-pulse {
      0% { opacity: 0.45; transform: scale(0.97); }
      100% { opacity: 1; transform: scale(1.03); }
    }
  `;
  document.head.appendChild(styleEl);

  // ── DOM INJECTION ──
  // Pre-build loader DOM element with CSS spinner
  const loader = document.createElement('div');
  loader.className = 'page-loader';
  loader.id = 'page-loader';
  loader.innerHTML = `
    <div class="stego-loader-container">
      <div class="stego-loader-spinner">
        <div class="stego-loader-ring stego-loader-ring--outer"></div>
        <div class="stego-loader-ring stego-loader-ring--middle"></div>
        <div class="stego-loader-ring stego-loader-ring--inner"></div>
        <div class="stego-loader-core"></div>
      </div>
      <div class="stego-loader-text">STEGNOLINES</div>
    </div>
  `;
  
  // Prepend loader immediately if body is ready, otherwise defer
  if (document.body) {
    document.body.prepend(loader);
  } else {
    const observer = new MutationObserver((mutations, obs) => {
      if (document.body) {
        document.body.prepend(loader);
        obs.disconnect();
      }
    });
    observer.observe(document.documentElement, { childList: true });
  }

  // ── SMART FADE OUT & NETWORK DURATION CONTROL ──
  const loadStartTime = Date.now();
  const FAST_LOAD_THRESHOLD = 1500; // 1.5 seconds threshold for fast connection
  const MIN_FAST_LOAD_TIME = 800;   // 0.8 seconds minimum duration for fast connection (premium visual transition)
  const MAX_LOAD_TIME = 6000;       // 6.0 seconds maximum loading time before slowness/offline handling
  let hasFaded = false;
  let failsafeTimeoutId = null;

  async function fadeOutLoader() {
    if (hasFaded) return;

    // Premium Font Loading API integration: wait until Google Fonts/Material Symbols are fully loaded
    if (document.fonts && typeof document.fonts.ready === 'object') {
      try {
        await document.fonts.ready;
      } catch (e) {
        // Fallback on font load failure
      }
    }

    // Double check hasFaded in case the 6-second timeout triggered while we were waiting for fonts
    if (hasFaded) return;
    hasFaded = true;

    // Clear failsafe/slowness timeout since we are fading out successfully
    if (failsafeTimeoutId) {
      clearTimeout(failsafeTimeoutId);
    }

    const loaderEl = document.getElementById('page-loader');
    if (loaderEl) {
      const elapsed = Date.now() - loadStartTime;
      let remaining = 0;

      if (elapsed <= FAST_LOAD_THRESHOLD) {
        // Fast load: enforce a tiny aesthetic delay to prevent jar/flicker
        remaining = Math.max(0, MIN_FAST_LOAD_TIME - elapsed);
      } else {
        // Slow load (but under 6s): hide immediately to show content as fast as possible
        remaining = 0;
      }

      setTimeout(() => {
        loaderEl.classList.add('fade-out');
      }, remaining);
    }
  }

  // Bind loader removal to window load
  if (document.readyState === 'complete') {
    fadeOutLoader();
  } else {
    window.addEventListener('load', fadeOutLoader);
  }

  // Failsafe handling: if loader persists for > 6 seconds, fade out loader directly
  failsafeTimeoutId = setTimeout(() => {
    if (hasFaded) return;
    hasFaded = true;
    const loaderEl = document.getElementById('page-loader');
    if (loaderEl) {
      loaderEl.classList.add('fade-out');
    }
  }, MAX_LOAD_TIME);

  // ── EFFICIENT NAVIGATION INTERCEPTION ──
  // Intercept all internal page-to-page navigation links to play exit transitions
  document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', function(e) {
      const anchor = e.target.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      // Ignore anchor hashes, javascript triggers, mailto/tel protocols, and blank targets
      if (href.startsWith('#') || 
          href.startsWith('javascript:') || 
          href.startsWith('mailto:') || 
          href.startsWith('tel:') || 
          anchor.getAttribute('target') === '_blank') {
        return;
      }

      // Parse current and target URLs to check if they point to the same page
      try {
        const currentUrl = new URL(window.location.href);
        const targetUrl = new URL(href, window.location.href);
        if (currentUrl.origin === targetUrl.origin && 
            currentUrl.pathname === targetUrl.pathname && 
            currentUrl.search === targetUrl.search) {
          // Same page, different hash. Bypass loader.
          return;
        }
      } catch (err) {}

      // Check if the link points to a relative internal page view
      const isInternal = href.endsWith('.html') || 
                         href.includes('.html#') || 
                         href.startsWith('/') || 
                         href.startsWith('../') || 
                         (!href.includes('://') && !href.startsWith('//'));
      
      if (!isInternal) return;

      // Intercept standard navigation
      e.preventDefault();

      // Trigger exit transition
      const loaderEl = document.getElementById('page-loader');
      if (loaderEl) {
        loaderEl.classList.remove('fade-out');
        
        // Relocate screen window after the overlay fully fades back in
        setTimeout(() => {
          window.location.href = href;
        }, 300); // Perfectly synced with CSS fade transition

        // Failsafe backup: if page relocation is canceled or slow, fade loader back out after 8s
        setTimeout(() => {
          if (loaderEl) loaderEl.classList.add('fade-out');
        }, 8000);
      } else {
        window.location.href = href;
      }
    });
  });
})();
