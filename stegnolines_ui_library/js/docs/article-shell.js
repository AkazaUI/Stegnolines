/**
 * Builds a documentation article page HTML string (for local generation).
 * Run: node js/docs/article-shell.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DOCS = path.join(ROOT, 'docs');

const pages = [
  { file: 'getting-started/overview.html', title: 'Overview', section: 'Getting started', prev: null, next: 'architecture.html',
    body: `<p>STEGNOLINES is a text steganography platform for hiding secret messages inside cover text with zero perceptible overhead when viewed in chat applications.</p>
<h2>What you can do</h2>
<ul><li>Embed secrets into cover messages from the <a href="../../embed.html">Embed</a> interface.</li><li>Extract hidden payloads from stego text via <a href="../../extract.html">Extract</a>.</li><li>Scan exported chat logs for candidate carriers.</li></ul>
<h2>Documentation map</h2>
<p>Use the <a href="../../documentation.html">Documentation Index</a> to browse all topics, or the left sidebar on any article page.</p>` },
  { file: 'getting-started/architecture.html', title: 'Architecture', section: 'Getting started',
    body: `<p>The STEGNOLINES architecture combines a browser-based UI, client-side steganography modules, and optional chat-log analysis features. Cover text enters the pipeline, passes through encoding stages, and returns stego output ready to share.</p>
<h2>High-level flow</h2>
<p>Users provide cover text and a secret on the Embed page. The pipeline builds a payload, derives keys from the pre-shared secret, applies XOR and variable-width encoding, and produces stego text. Extract reverses each stage when the same secret and hint are supplied.</p>
<h2>Component communication</h2>
<h3>Embed UI — Steganography core</h3>
<p>The embed interface collects inputs, validates capacity, and invokes <code>js/stage3_hide/embedding.js</code> to generate stego output.</p>
<h3>Extract UI — Recovery</h3>
<p>The extract interface parses stego text and runs <code>js/stage3_hide/extraction.js</code> with matching secrets and hints.</p>
<h3>Chat scanner</h3>
<p>Optional modules under <code>js/features/</code> parse platform exports and score messages that may carry hidden data.</p>
<h2>Deployment model</h2>
<ul><li><strong>Static hosting:</strong> All UI and algorithms run in the browser; no server is required for embed/extract.</li><li><strong>Local development:</strong> Open HTML files or serve the <code>stegnolines_ui_library</code> folder with any static file server.</li></ul>
<div class="docs-note"><strong>Note</strong> Add architecture diagrams here as you finalize your graduation project documentation.</div>` },
  { file: 'getting-started/components.html', title: 'Components', section: 'Getting started',
    body: `<h2>UI surfaces</h2><ul><li><strong>Embed</strong> — hide secrets in cover text.</li><li><strong>Extract</strong> — recover secrets from stego text.</li><li><strong>Documentation</strong> — this guide.</li></ul>
<h2>JavaScript modules</h2><ul><li><code>js/stage3_hide/</code> — core embed/extract pipeline.</li><li><code>js/features/</code> — chat parsing, hints, capacity, analysis.</li><li><code>js/shared/</code> — codecs and utilities.</li></ul>` },
  { file: 'user-guide/embedding.html', title: 'Embedding messages', section: 'User guide',
    body: `<p>Open <a href="../../embed.html">Embed</a>, paste cover text, enter your secret, set a pre-shared key, and optionally configure a hint. The capacity bar shows how much of the cover is used.</p>
<h2>Steps</h2><ol><li>Enter or paste cover text.</li><li>Enter the secret message.</li><li>Set a strong pre-shared secret.</li><li>Click embed and copy the stego output.</li></ol>` },
  { file: 'user-guide/extraction.html', title: 'Extracting messages', section: 'User guide',
    body: `<p>Open <a href="../../extract.html">Extract</a>, paste stego text, provide the same pre-shared secret and hint used during embedding, then run extraction.</p>
<h2>Troubleshooting</h2><ul><li>Verify the cover was not edited after embedding.</li><li>Confirm hint and secret match exactly.</li></ul>` },
  { file: 'user-guide/capacity-and-hints.html', title: 'Capacity & hints', section: 'User guide',
    body: `<p>Capacity depends on cover length and encoding parameters. The UI shows safe, warning, and critical zones on the progress bar.</p>
<h2>Hints</h2><p>Hints help the extractor locate payload boundaries without revealing the secret. Document your hint format in this section as you finalize the project.</p>` },
  { file: 'user-guide/chat-integration.html', title: 'Chat platform integration', section: 'User guide',
    body: `<p>STEGNOLINES can analyze exported chats from supported platforms using modules in <code>js/features/F_chat_parser.js</code> and <code>F_chat_scanner.js</code>.</p>
<h2>Supported workflows</h2><p>Export chat logs from your platform, load them in the scanner UI, and review candidate messages flagged as potential carriers.</p>` },
  { file: 'technical-reference/pipeline.html', title: 'Steganography pipeline', section: 'Technical reference',
    body: `<p>The pipeline is implemented in staged modules under <code>js/stage3_hide/</code>.</p>
<h2>Stages</h2><ol><li>Payload construction (<code>step1_payload.js</code>)</li><li>PRNG / key derivation (<code>step2_prng.js</code>)</li><li>XOR layer (<code>step3_xor.js</code>)</li><li>Variable-width codec (<code>step4_vs_codec.js</code>)</li><li>Stego object assembly (<code>step5_stego_object.js</code>)</li></ol>` },
  { file: 'technical-reference/security.html', title: 'Security model', section: 'Technical reference',
    body: `<p>Security relies on pre-shared secrets, optional custom salt, and strength feedback via zxcvbn on the embed form.</p>
<h2>Recommendations</h2><ul><li>Use long, unique pre-shared secrets per conversation.</li><li>Do not reuse covers that were publicly posted.</li><li>Treat hints as sensitive metadata.</li></ul>` },
  { file: 'technical-reference/configuration.html', title: 'Configuration options', section: 'Technical reference',
    body: `<p>Advanced settings on the embed page expose optional parameters such as custom salt. Document each flag here as you stabilize the API.</p>` },
  { file: 'development/project-structure.html', title: 'Project structure', section: 'Development',
    body: `<pre style="padding:var(--space-md);background:var(--color-surface-container);border-radius:var(--radius-lg);overflow:auto;font-size:var(--fs-body-sm);">stegnolines_ui_library/
  embed.html  extract.html  documentation.html
  docs/         js/           styles.css
  documentation.css</pre>` },
  { file: 'development/writing-docs.html', title: 'Writing documentation', section: 'Development',
    body: `<p>To add a page, create an HTML file under <code>docs/</code>, add an entry to <code>js/docs/nav-data.js</code>, and use the same layout as existing articles.</p>
<h2>Index page</h2><p>The tree on <a href="../../documentation.html">documentation.html</a> is generated automatically from <code>nav-data.js</code>.</p>` },
];

function shell(meta) {
  const sectionSlug = meta.file.split('/')[0];
  return `<!DOCTYPE html>
<html class="light" lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>STEGNOLINES — ${meta.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="../../styles.css"/>
  <link rel="stylesheet" href="../../documentation.css"/>
  <script>window.DOCS_BASE = '../../';</script>
</head>
<body class="docs-body">
  <nav class="top-nav" id="top-nav">
    <div class="top-nav__inner">
      <a class="top-nav__brand" href="../../index.html">
        <img class="top-nav__brand-logo top-nav__brand-logo--light" src="../../Dark-Logo-T.png" alt="STEGNOLINES"/>
        <img class="top-nav__brand-logo top-nav__brand-logo--dark" src="../../White-Logo-T.png" alt="STEGNOLINES"/>
      </a>
      <nav class="top-nav__links" id="desktop-nav">
        <a class="top-nav__link" href="../../embed.html"><span class="material-symbols-outlined">lock</span><span class="text-label-md">Embed</span></a>
        <a class="top-nav__link" href="../../extract.html"><span class="material-symbols-outlined">lock_open</span><span class="text-label-md">Extract</span></a>
        <a class="top-nav__link" href="#"><span class="material-symbols-outlined">tune</span><span class="text-label-md">Preferences</span></a>
        <a class="top-nav__link top-nav__link--active" href="../../documentation.html" id="nav-docs"><span class="material-symbols-outlined">menu_book</span><span class="text-label-md">Documentation</span></a>
      </nav>
      <div class="top-nav__actions">
        <label class="toggle" title="Toggle dark mode" style="margin-right: var(--space-xs);">
          <input type="checkbox" class="toggle__input" id="toggle-dark-mode"/>
          <div class="toggle__track"></div>
        </label>
        <button class="top-nav__hamburger" id="hamburger-btn" aria-label="Open menu"><span class="material-symbols-outlined">menu</span></button>
      </div>
    </div>
  </nav>
  <div class="top-nav__mobile-menu" id="mobile-menu">
    <a class="top-nav__link" href="../../embed.html">Embed</a>
    <a class="top-nav__link" href="../../extract.html">Extract</a>
    <a class="top-nav__link top-nav__link--active" href="../../documentation.html">Documentation</a>
  </div>
  <div class="docs-wrap">
    <div class="docs-layout">
      <aside class="docs-sidebar" id="docs-sidebar" aria-label="Documentation navigation">
        <p class="docs-sidebar__title"><a href="../../documentation.html">Documentation</a></p>
        <nav id="docs-sidebar-nav"></nav>
      </aside>
      <div class="docs-sidebar-backdrop" id="docs-sidebar-backdrop"></div>
      <div class="docs-main">
        <button type="button" class="docs-sidebar-toggle" id="docs-sidebar-toggle" aria-expanded="false">
          <span class="material-symbols-outlined">menu</span> Contents
        </button>
        <nav class="docs-breadcrumb" aria-label="Breadcrumb">
          <a href="../../documentation.html">Documentation</a>
          <span class="docs-breadcrumb__sep">/</span>
          <span>${meta.section}</span>
          <span class="docs-breadcrumb__sep">/</span>
          <span>${meta.title}</span>
        </nav>
        <article class="docs-article">
          <h1>${meta.title}</h1>
          ${meta.body}
        </article>
        <nav class="docs-pager" aria-label="Documentation pagination">
          <a class="docs-pager__link" id="docs-prev-link" href="#" hidden>
            <span class="docs-pager__dir">Previous</span>
            <span class="docs-pager__label"></span>
          </a>
          <a class="docs-pager__link docs-pager__link--next" id="docs-next-link" href="#" hidden>
            <span class="docs-pager__dir">Next</span>
            <span class="docs-pager__label"></span>
          </a>
        </nav>
      </div>
      <aside class="docs-toc" aria-label="On this page">
        <p class="docs-toc__heading">On this page</p>
        <nav id="docs-onpage-toc"></nav>
      </aside>
    </div>
  </div>
  <!-- Footer -->
  <footer class="main-footer">
    <div class="main-footer__inner">
      <div class="main-footer__brand">
        <div class="main-footer__title" data-i18n="footerTitle">STEGNOLINES</div>
        <p class="text-body-sm" style="max-width: 300px;" data-i18n="footerSubtitle">
          Advanced Zero-Overhead Contextual Steganography and Cryptography for secure transmission.
        </p>
      </div>
      
      <div class="main-footer__cols-group">
        <!-- Column 1: Embed -->
        <div class="main-footer__col">
          <div class="main-footer__col-title" data-i18n="footerColEmbed">Embed</div>
          <ul class="main-footer__col-links">
            <li><a href="../../embed.html#text" class="main-footer__link" data-i18n="footerEmbedText">Text Steganography</a></li>
            <li><a href="../../embed.html#image" class="main-footer__link" data-i18n="footerEmbedImage">Image Steganography</a></li>
          </ul>
        </div>

        <!-- Column 2: Extract -->
        <div class="main-footer__col">
          <div class="main-footer__col-title" data-i18n="footerColExtract">Extract</div>
          <ul class="main-footer__col-links">
            <li><a href="../../extract.html#standard" class="main-footer__link" data-i18n="footerExtractStandard">Standard Extract</a></li>
            <li><a href="../../extract.html#scanner" class="main-footer__link" data-i18n="footerExtractScanner">Chat Scanner</a></li>
            <li><a href="../../extract.html#hints" class="main-footer__link" data-i18n="footerExtractHints">Stego Hints Log</a></li>
            <li><a href="../../extract.html#image" class="main-footer__link" data-i18n="footerExtractImage">Image Payload Recovery</a></li>
          </ul>
        </div>

        <!-- Column 3: Documentation -->
        <div class="main-footer__col">
          <div class="main-footer__col-title" data-i18n="footerColResources">Documentation</div>
          <ul class="main-footer__col-links">
            <li><a href="../../docs/getting-started/overview.html" class="main-footer__link" data-i18n="footerResDocs">Getting started</a></li>
            <li><a href="../../docs/user-guide/embedding.html" class="main-footer__link" data-i18n="footerResUi">User guide</a></li>
            <li><a href="../../docs/technical-reference/pipeline.html" class="main-footer__link" data-i18n="footerResTest">Technical reference</a></li>
            <li><a href="../../docs/development/project-structure.html" class="main-footer__link" data-i18n="footerResDev">Development</a></li>
          </ul>
        </div>

        <!-- Column 4: Team -->
        <div class="main-footer__col">
          <div class="main-footer__col-title" data-i18n="footerColTeam">Team</div>
          <ul class="main-footer__col-links">
            <li><a href="../../about us.html" class="main-footer__link" data-i18n="footerAboutTeam">About Team</a></li>
            <li><a href="../../contact team.html" class="main-footer__link" data-i18n="footerContactTeam">Contact With Team</a></li>
          </ul>
        </div>
      </div>
    </div>
    <div class="main-footer__bottom">
      <span>&copy; 2026 STEGNOLINES. All rights reserved.</span>
    </div>
  </footer>
  <script src="../../js/docs/nav-data.js"></script>
  <script src="../../js/docs/docs.js"></script>
</body>
</html>`;
}

pages.forEach(function (p) {
  const out = path.join(DOCS, p.file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  let html = shell(p);
  html = html.replace(/<motion><\/motion>/g, '');
  html = html.replace(/<\/motion>/g, '');
  fs.writeFileSync(out, html, 'utf8');
  console.log('Wrote', p.file);
});
