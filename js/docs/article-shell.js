/**
 * Builds a documentation article page HTML string (for local generation).
 * Run: node js/docs/article-shell.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DOCS = path.join(ROOT, 'docs');

const pages = [
  { 
    file: 'getting-started/overview.html', 
    title: 'Overview', 
    section: 'Getting started', 
    prev: null, 
    next: 'architecture.html',
    body: `<p>STEGNOLINES is an academic-grade, zero-overhead steganographic and cryptographic framework designed to conceal high-entropy payloads (such as encrypted text, images, or metadata) inside innocent cover text. Unlike traditional text steganography that alters formatting or introduces suspicious characters, STEGNOLINES achieves absolute zero-overhead invisibility, preserving the semantic, stylistic, and visual characteristics of the carrier message when viewed across standard chat applications.</p>

<h2>The Paradigms of Steganography & Cryptography</h2>
<p>While <strong>Cryptography</strong> secures data by making it unreadable to unauthorized observers (guaranteeing <em>Confidentiality</em>), <strong>Steganography</strong> secures data by concealing the very existence of the communication channel itself (guaranteeing <em>Unobservability</em>). STEGNOLINES unifies these paradigms: the payload is first encrypted using AES-256-CTR to ensure military-grade confidentiality, and then embedded into the cover text using Unicode Variation Selector mapping to ensure absolute visual undetectability.</p>

<h2>Core Architectural Goals</h2>
<ul>
  <li><strong>Mathematical Undetectability (Zero-Overhead):</strong> No physical characters are injected into the rendered lines, ensuring zero distortion of the cover text.</li>
  <li><strong>Cryptographic Robustness:</strong> PBKDF2-HMAC-SHA256 key derivation with 100,000 iterations to withstand high-powered dictionary attacks.</li>
  <li><strong>Zero-Overhead Metadata:</strong> Hints and boundary markers are packed using UTF-8 illegal byte separators, adding 0 bytes of visual overhead.</li>
  <li><strong>Platform Compatibility:</strong> Safe for transmission across major modern secure chat and email networks (e.g., Signal, WhatsApp, Telegram, Outlook).</li>
</ul>` 
  },
  { 
    file: 'getting-started/architecture.html', 
    title: 'Architecture', 
    section: 'Getting started',
    body: `<p>The STEGNOLINES system is structured into five cohesive pipeline layers. The architecture is designed to decouple user-interface mechanics from pure algorithmic operations, enabling high performance and robust cryptographic guarantees.</p>

<h2>Algorithmic Flow Layers</h2>
<div class="docs-note">
  <strong>System Layer Blueprint</strong>
  <p>1. <strong>Payload Orchestration:</strong> Brotli Compression -> Boundary Marker Insertion (with zero-overhead delimiters).</p>
  <p>2. <strong>Cryptographic Engine:</strong> PBKDF2 Counter Block Derivation -> AES-256-CTR Cipherstream Execution.</p>
  <p>3. <strong>CSPRNG Spatial Generator:</strong> PBKDF2 Key Derivation (100k rounds) -> AES-256-CTR CSPRNG -> Unbiased Rejection Sampling -> O(K) Lazy Fisher-Yates (with Dual-Engine Legacy Fallback).</p>
  <p>4. <strong>Bitwise Hide/XOR Masking:</strong> Generating XOR keys by comparing selected cover bits and ciphertext bits.</p>
  <p>5. <strong>Unicode Variation Selector (VS) Codec:</strong> Translating XOR key bytes into invisible BMP/Supplementary range variation selectors.</p>
</div>

<h2>High-Level Dataflow</h2>
<h3>The Embedding Process</h3>
<p>When a user conceals a message, the orchestrator translates the plain text and hint into bytes, compresses them, and runs AES-256-CTR. The key and counter are dynamically derived via PBKDF2 utilizing a salt built from the SHA-256 hash of the cover text. Deterministic bit positions in the cover text are calculated using the AES-256-CTR CSPRNG with Unbiased Rejection Sampling and O(K) Lazy Fisher-Yates mapping (seeded by deriving the stego-key with PBKDF2-HMAC-SHA256). The stego composer compares the cover bits at those positions with the ciphertext bits, generating an XOR key. This XOR key is mapped byte-by-byte to invisible Variation Selector characters, which are prepended to the cover text, forming the stego object.</p>

<h3>The Extraction Process</h3>
<p>The receiver's extraction engine captures the stego object, extracts the invisible Variation Selector bytes, and converts them back to the binary XOR key. The cover text is resolved and run through the dual-engine extraction pipeline (trying modern CSPRNG first, then legacy Mulberry32 fallback) to retrieve the exact same bit positions. By applying bitwise XOR between the cover bits at those positions and the XOR key, the ciphertext is reconstructed, decrypted using AES-CTR, decompressed via Brotli, and split into the original secret message and hint.</p>` 
  },
  { 
    file: 'getting-started/components.html', 
    title: 'Components', 
    section: 'Getting started',
    body: `<p>STEGNOLINES is modularly architected, consisting of independent JavaScript files in the <code>js/core/</code> directory. Each module manages a specific cryptographic or steganographic pipeline phase, maximizing testability and algorithmic purity.</p>

<h2>Modular Directory Breakdown</h2>
<ul>
  <li><strong>Cryptographic Core (<code>js/core/crypto/</code>):</strong>
    <ul>
      <li><code>aes-ctr.js</code>: Zero-overhead symmetric cipher stream engine executing AES-256 in Counter Mode, backed by PBKDF2-HMAC-SHA256 key derivation.</li>
      <li><code>sha256.js</code>: Pure asynchronous cryptographic hash engine used for cover verification and auto-key generation.</li>
    </ul>
  </li>
  <li><strong>Steganographic Pipeline (<code>js/core/stego/</code>):</strong>
    <ul>
      <li><code>payload-codec.js</code>: Packages secret messages and hints into single-byte delimited byte arrays.</li>
      <li><code>prng-generator.js</code>: Executes PBKDF2-HMAC-SHA256, AES-256-CTR CSPRNG, and Unbiased Rejection Sampling to generate deterministic, unbiased bit indices with dual-engine legacy fallback.</li>
      <li><code>xor-mask.js</code>: Executes the bitwise exclusive-OR masking operations between cover carrier bits and payload bits.</li>
      <li><code>vs-codec.js</code>: Codes bytes into invisible Unicode Variation Selector characters and decodes them back.</li>
      <li><code>stego-composer.js</code>: The master orchestrator that integrates all compression, encryption, PRNG mapping, and VS codecs into single-call hide/extract APIs.</li>
    </ul>
  </li>
  <li><strong>User Interface Library:</strong>
    <ul>
      <li><code>js/shared/template-loader.js</code>: Dynamically injects premium layouts, multi-language settings, and preference modal windows.</li>
      <li><code>js/shared/theme-manager.js</code>: Manages themes (Dark/Light FOUC prevention) and language UI bindings.</li>
    </ul>
  </li>
</ul>` 
  },
  { 
    file: 'user-guide/embedding.html', 
    title: 'Embedding messages', 
    section: 'User guide',
    body: `<p>Embedding a secret message inside cover text is straightforward but utilizes advanced configurations underneath to optimize capacity and cryptographic security.</p>

<h2>Embedding Phase Workflow</h2>
<ol>
  <li><strong>Cover Text Selection:</strong> Paste the text that will carry your hidden payload. The longer and more linguistically rich the cover text is, the higher its bit capacity.</li>
  <li><strong>Secret Inputting:</strong> Input the private message or upload a micro-image.</li>
  <li><strong>Pre-Shared Keys & Passwords:</strong> 
    <ul>
      <li><strong>Stego Key:</strong> Used to seed the PRNG for bit positioning. If left empty, it deterministically hashes the cover text using SHA-256.</li>
      <li><strong>Encryption Key:</strong> Used to encrypt the message using AES-CTR-256. If left empty, it defaults to the Stego Key.</li>
    </ul>
  </li>
  <li><strong>Optional Hints:</strong> You can append an optional hint to let the receiver know which password to use, costing only 1 byte of capacity.</li>
  <li><strong>Split Mode (Cover Substitution):</strong> You can select a "Fake Cover" to display on screen while embedding the payload. The invisible VS sequence will be prepended to the fake cover, sending the secret safely.</li>
</ol>` 
  },
  { 
    file: 'user-guide/extraction.html', 
    title: 'Extracting messages', 
    section: 'User guide',
    body: `<p>Extraction reverses the embedding pipeline to restore the original compressed, encrypted secret payload with absolute integrity.</p>

<h2>Successful Extraction Requirements</h2>
<ul>
  <li><strong>Complete Carrier Copying:</strong> You must copy the entire carrier text containing the invisible Unicode Variation Selector bytes. Missing even one invisible selector character will corrupt the XOR stream alignment.</li>
  <li><strong>Key Synchronization:</strong> You must input the exact Stego Key and Encryption Key used during the embedding phase.</li>
</ul>

<h2>Interactive UI Features</h2>
<ul>
  <li><strong>Standard Extraction Tab:</strong> Allows standard manual extraction of text and images using keys.</li>
  <li><strong>Scanner Tab:</strong> Allows paste-scanning of entire chat transcripts, parsing them line by line to detect candidate carriers.</li>
  <li><strong>Stego Hints Log:</strong> Maintains an active record of hints extracted from stego texts, helping you remember keys.</li>
  <li><strong>Diagnostics Dashboard:</strong> Renders a highly visual hex-matrix diff and capacity distribution chart.</li>
</ul>` 
  },
  { 
    file: 'user-guide/capacity-and-hints.html', 
    title: 'Capacity & hints', 
    section: 'User guide',
    body: `<p>Understanding Shannon capacity constraints and zero-overhead hint mechanisms is crucial for utilizing steganographic systems effectively.</p>

<h2>Shannon Capacity & Text Carrier Metrics</h2>
<p>Each character in the cover text provides a finite number of bits. In JavaScript, strings are UTF-16 encoded, yielding 16 bits per character. The maximum Shannon capacity $C_{max}$ in bits is determined by:
$$C_{max} = 16 \times N_{char}$$
Where $N_{char}$ is the number of characters in the cover text. The payload bit length $K$ must satisfy $K \le C_{max}$. The capacity indicator in the UI alerts you through green (safe), yellow (warning), and red (critical) states.</p>

<h2>Zero-Overhead Hint Ingress</h2>
<p>STEGNOLINES packages the secret message and hint into a unified byte stream. When a hint is present, a separator byte is injected between them:
$$\text{Payload} = [\text{Message Bytes}] + [0\text{xFF}] + [\text{Hint Bytes}]$$
The byte $0\text{xFF}$ is an illegal byte in the UTF-8 specification, which means it can NEVER appear in valid UTF-8 text. Therefore, $0\text{xFF}$ serves as an absolute, zero-overhead boundary marker that can be recognized instantly during extraction without adding any padding or sizing metadata!</p>` 
  },
  { 
    file: 'user-guide/chat-integration.html', 
    title: 'Chat platform integration', 
    section: 'User guide',
    body: `<p>STEGNOLINES integrates cleanly with chat platforms by analyzing message transcripts exported from apps like WhatsApp, Telegram, or WeChat.</p>

<h2>Carrier Robustness in Chat Systems</h2>
<p>Modern chat platforms handle Unicode characters reliably. Because Variation Selector characters (VS1-VS256) are standard, non-rendering Unicode characters, they survive transmission through most platform databases, styling engines, and compression algorithms without stripping, preserving the hidden payload.</p>

<h2>Analyzing Chat Logs</h2>
<ol>
  <li>Export your conversation transcript in text (.txt) format from your chat app.</li>
  <li>Load or paste the transcript into the **Scanner** section.</li>
  <li>The scanner will parse each line, analyze it for the presence of Variation Selector characters, and flag any candidate messages.</li>
  <li>Select the candidate line, input the keys, and retrieve the hidden payload instantly!</li>
</ol>` 
  },
  { 
    file: 'technical-reference/pipeline.html', 
    title: 'Steganography pipeline', 
    section: 'Technical reference',
    body: `<p>This reference describes the detailed mathematical modeling and algorithmic stages of the STEGNOLINES Hide and Extract pipeline.</p>

<h2>Mathematical Pipeline Formulations</h2>

<h3>1. Key & Counter Block Derivation (PBKDF2-HMAC-SHA256)</h3>
<p>A high-entropy cryptographic salt $S$ is derived from the cover text carrier to ensure uniqueness:
$$S = \text{SHA256}(\text{CoverText})[0\dots 15]$$
The AES-256 key and CTR counter block are derived using the password:
$$\text{DerivedBytes} = \text{PBKDF2}(\text{Password}, S, 100000) \quad \text{(384 bits generated)}$$
$$\text{Key}_{AES} = \text{DerivedBytes}[0\dots 31] \quad \text{(256 bits)}$$
$$\text{Counter}_{CTR} = \text{DerivedBytes}[32\dots 47] \quad \text{(128 bits)}$$</p>

<h3>2. Symmetric Cipher Stream (AES-CTR-256)</h3>
<p>Encryption operates in Counter mode to achieve zero-overhead size matches:
$$\text{CipherBytes} = \text{AES-CTR}(\text{PayloadBytes}, \text{Key}_{AES}, \text{Counter}_{CTR})$$
The ciphertext $\text{CipherBytes}$ is translated into a binary stream of bits $M = [m_1, m_2, \dots, m_K]$.</p>

<h3>3. PBKDF2 Key Derivation & AES-256-CTR CSPRNG</h3>
<p>The stego-key is derived into a 256-bit key using PBKDF2-HMAC-SHA256 with 100,000 iterations:
$$\text{Key}_{256} = \text{PBKDF2}(\text{StegoKey}, \text{Salt}_{\text{domain}}, 100000) \quad \text{(256 bits)}$$
This key seeds the AES-256-CTR CSPRNG block cipher generator. Unbiased rejection sampling eliminates modulo bias, yielding uniformly distributed random bit indices $P = [p_1, p_2, \dots, p_K]$ via an $O(K)$ Lazy Fisher-Yates shuffle (with automatic fallback to legacy Mulberry32 for older messages).</p>

<h3>4. Deterministic Shuffling & Bit XOR Masking</h3>
<p>The bitwise positions $P = [p_1, p_2, \dots, p_K]$ are generated using a partial Fisher-Yates shuffle. For each ciphertext bit $m_j$ and selected cover bit $c_{p_j}$, the XOR key bit $k_j$ is:
$$k_j = c_{p_j} \oplus m_j$$
During extraction, the reverse bitwise exclusive-OR recovers the payload:
$$m_j = c_{p_j} \oplus k_j$$
Since $(c_{p_j} \oplus m_j) \oplus c_{p_j} = m_j$, the original payload is reconstructed perfectly.</p>

<h3>5. Unicode Variation Selector Mapping</h3>
<p>The XOR key bytes $B \in [0, 255]$ are mapped into the Unicode Variation Selector character ranges:
$$\text{VS\_CodePoint}(B) = \begin{cases}
0\text{xFE00} + B & \text{if } 0 \le B \le 15 \quad \text{(BMP Range VS1-VS16)} \\
0\text{xE0100} + B - 16 & \text{if } 16 \le B \le 255 \quad \text{(Supplementary Range VS17-VS256)}
\end{cases}$$</p>` 
  },
  { 
    file: 'technical-reference/security.html', 
    title: 'Security model', 
    section: 'Technical reference',
    body: `<p>STEGNOLINES implements a security model based on strong cryptographic primitives and optimal steganographic unobservability.</p>

<h2>Cryptographic Assurances</h2>
<ul>
  <li><strong>AES-256-CTR Strength:</strong> Backed by PBKDF2-HMAC-SHA256 with 100,000 iterations. This makes brute-force attacks computationally infeasible under current mathematical bounds.</li>
  <li><strong>Dynamic Counter-based Salt:</strong> Because the salt is dynamically derived from the SHA-256 hash of the Cover Text, the same password will yield different keys for different covers, neutralizing pre-computed table attacks (Rainbow tables).</li>
</ul>

<h2>Steganographic Defensive Parameters</h2>
<ul>
  <li><strong>Resistance to Statistical Scans:</strong> Because the cover text carrier is completely unmodified, standard statistical linguistics checks (such as word frequency analysis or letter-pair entropy) show zero deviation, keeping communications perfectly stealthy.</li>
  <li><strong>Key Strength Analysis:</strong> The embed interface runs the <code>zxcvbn</code> algorithm, verifying key entropy and blockading weak, easily brute-forced passwords.</li>
</ul>` 
  },
  { 
    file: 'technical-reference/configuration.html', 
    title: 'Configuration options', 
    section: 'Technical reference',
    body: `<p>Advanced parameters enable tuning of the embedding and encryption pipelines to meet specific security and carrier constraints.</p>

<h2>Available System Parameters</h2>
<ul>
  <li><strong>Stego Key:</strong> Seeds the AES-256-CTR CSPRNG position generator. If left empty, it defaults to the SHA-256 hash of the cover text.</li>
  <li><strong>Encryption Key:</strong> Seeds the PBKDF2 parameters. If omitted, it defaults to the Stego Key to simplify UX.</li>
  <li><strong>Compression Toggle:</strong> Controls whether Brotli compression is run. Brotli is automatically bypassed if the compressed size is greater than the raw payload size (ensuring minimal bit overhead).</li>
  <li><strong>Split Mode Cover Text:</strong> Permits users to specify a surrogate cover text. The invisible Variation Selector characters are prepended to this surrogate text, allowing you to completely change the visible carrier message for the observer.</li>
</ul>` 
  },
  { 
    file: 'development/project-structure.html', 
    title: 'Project structure', 
    section: 'Development',
    body: `<p>The project directory structure is designed for clean modular separation, ease of development, and production-ready static deployment.</p>

<h2>System Directory Layout</h2>
<pre style="padding:var(--space-md);background:var(--color-surface-container);border-radius:var(--radius-lg);overflow:auto;font-size:var(--fs-body-sm);">
Embding-Algo/
  ├── index.html              # Dynamic Embedding Interface
  ├── extract.html            # Dynamic Extraction Interface
  ├── documentation.html      # Documentation Index
  ├── docs/                   # Compiled HTML Documentation Pages
  │   ├── getting-started/
  │   ├── user-guide/
  │   └── technical-reference/
  ├── css/                    # Modular Styling Files
  │   ├── components/
  │   ├── pages/
  │   │   ├── docs.css        # Documentation-specific CSS rules
  │   │   └── embed.css
  │   ├── layout.css
  │   └── tokens.css          # Design System Token Map
  └── js/                     # Component Architecture
      ├── core/               # Cryptography & Steganography Core
      │   ├── crypto/         # aes-ctr, sha256 engines
      │   └── stego/          # vs-codec, prng, xor, composer
      └── features/           # scanner, diagnostics dashboard
</pre>` 
  },
  { 
    file: 'development/writing-docs.html', 
    title: 'Writing documentation', 
    section: 'Development',
    body: `<p>The documentation in STEGNOLINES is compiled statically from a single source of truth inside the generator script: <code>js/docs/article-shell.js</code>.</p>

<h2>Compiling Documentation</h2>
<p>To update or add documentation pages, follow these steps:</p>
<ol>
  <li>Open the master build script: [article-shell.js](file:///e:/مشروع%20التخرج/Embding-Algo/js/docs/article-shell.js).</li>
  <li>Locate the <code>pages</code> array and update the corresponding HTML content inside the page objects.</li>
  <li>If you wish to add a new page, append a new object to the array, defining its <code>file</code>, <code>title</code>, <code>section</code>, and <code>body</code>.</li>
  <li>Ensure any new page is registered in the sidebar tree in [nav-data.js](file:///e:/مشروع%20التخرج/Embding-Algo/js/docs/nav-data.js).</li>
  <li>Run the build script using Node.js:
    <pre style="padding:8px 12px; background:var(--color-surface-container); border-radius:var(--radius-default); display:inline-block; font-family:monospace;">node js/docs/article-shell.js</pre>
  </li>
  <li>The build script will automatically compile, format, and generate the static HTML files under the <code>docs/</code> folder.</li>
</ol>` 
  },
];

function shell(meta) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>STEGNOLINES — ${meta.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=Alexandria:wght@400;600;700&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="../../New_styles.css"/>
  <link rel="stylesheet" href="../../css/main.css"/>
  <link rel="stylesheet" href="../../css/pages/docs.css"/>
  <script>
    (function() {
      // Retrieve theme preference immediately to prevent FOUC
      const savedTheme = localStorage.getItem('stegoTheme');
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else if (savedTheme === 'light') {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }

      // Retrieve language preference immediately
      const savedLang = localStorage.getItem('stegoLang') || 'en';
      document.documentElement.setAttribute('lang', savedLang);
      document.documentElement.setAttribute('dir', savedLang === 'ar' ? 'rtl' : 'ltr');

      // Retrieve Arabic font preference immediately
      const savedFont = localStorage.getItem('stegoFont') || 'thmanyah';
      document.documentElement.setAttribute('data-arabic-font', savedFont);

      window.DOCS_BASE = '../../';
    })();
  </script>
</head>
<body class="docs-body">
  <script src="../../js/features/page-loader.js"></script>
  <!-- ═══ Top Navigation ═══ -->
  <nav class="top-nav" id="top-nav">
    <div class="top-nav__inner">

      <!-- Brand -->
      <a class="top-nav__brand" href="../../index.html" id="brand-link">
        <img class="top-nav__brand-logo top-nav__brand-logo--light" src="../../assets/brand/logo-dark.png" alt="STEGNOLINES"/>
        <img class="top-nav__brand-logo top-nav__brand-logo--dark" src="../../assets/brand/logo-light.png" alt="STEGNOLINES"/>
      </a>

      <!-- Desktop Nav Links -->
      <nav class="top-nav__links" id="desktop-nav">
        <div class="top-nav__dropdown" id="nav-embed-dropdown">
          <button class="top-nav__dropdown-trigger" id="nav-embed" aria-expanded="false" aria-haspopup="true">
            <span class="material-symbols-outlined">lock</span>
            <span class="text-label-md" data-i18n="navEmbed">Embed</span>
            <span class="material-symbols-outlined top-nav__dropdown-chevron">expand_more</span>
          </button>
          <div class="top-nav__dropdown-panel" id="embed-dropdown-panel">
            <a class="top-nav__dropdown-item" href="../../index.html#text" data-tab="text">
              <div class="top-nav__dropdown-item-icon">
                <span class="material-symbols-outlined">description</span>
              </div>
              <div class="top-nav__dropdown-item-text">
                <span class="top-nav__dropdown-item-title" data-i18n="emTabText">Text Embed</span>
                <span class="top-nav__dropdown-item-desc" data-i18n="navDropdownTextDesc">Conceal secret text inside cover text</span>
              </div>
            </a>
            <a class="top-nav__dropdown-item" href="../../index.html#image" data-tab="image">
              <div class="top-nav__dropdown-item-icon">
                <span class="material-symbols-outlined">image</span>
              </div>
              <div class="top-nav__dropdown-item-text">
                <span class="top-nav__dropdown-item-title" data-i18n="emTabImage">Image Embed</span>
                <span class="top-nav__dropdown-item-desc" data-i18n="navDropdownImageDesc">Hide a mini image inside cover text</span>
              </div>
            </a>
          </div>
        </div>

        <div class="top-nav__dropdown" id="nav-extract-dropdown">
          <button class="top-nav__dropdown-trigger" id="nav-extract" aria-expanded="false" aria-haspopup="true">
            <span class="material-symbols-outlined">lock_open</span>
            <span class="text-label-md" data-i18n="navExtract">Extract</span>
            <span class="material-symbols-outlined top-nav__dropdown-chevron">expand_more</span>
          </button>
          <div class="top-nav__dropdown-panel" id="extract-dropdown-panel">
            <a class="top-nav__dropdown-item" href="../../extract.html#standard" data-tab="standard">
              <div class="top-nav__dropdown-item-icon">
                <span class="material-symbols-outlined">screen_search_desktop</span>
              </div>
              <div class="top-nav__dropdown-item-text">
                <span class="top-nav__dropdown-item-title" data-i18n="exTabStandard">Standard Extract</span>
                <span class="top-nav__dropdown-item-desc" data-i18n="navDropdownStandardDesc">Decrypt with key & params</span>
              </div>
            </a>
            <a class="top-nav__dropdown-item" href="../../extract.html#scanner" data-tab="scanner">
              <div class="top-nav__dropdown-item-icon">
                <span class="material-symbols-outlined">cell_tower</span>
              </div>
              <div class="top-nav__dropdown-item-text">
                <span class="top-nav__dropdown-item-title" data-i18n="exTabScanner">Scanner</span>
                <span class="top-nav__dropdown-item-desc" data-i18n="navDropdownScannerDesc">Scan chat history for secrets</span>
              </div>
            </a>
            <a class="top-nav__dropdown-item" href="../../extract.html#hints" data-tab="hints">
              <div class="top-nav__dropdown-item-icon">
                <span class="material-symbols-outlined">lightbulb</span>
              </div>
              <div class="top-nav__dropdown-item-text">
                <span class="top-nav__dropdown-item-title" data-i18n="exTabHints">Hints</span>
                <span class="top-nav__dropdown-item-desc" data-i18n="navDropdownHintsDesc">View stego hints log</span>
              </div>
            </a>
            <a class="top-nav__dropdown-item" href="../../extract.html#image" data-tab="image">
              <div class="top-nav__dropdown-item-icon">
                <span class="material-symbols-outlined">image</span>
              </div>
              <div class="top-nav__dropdown-item-text">
                <span class="top-nav__dropdown-item-title" data-i18n="exTabImage">Image Extract</span>
                <span class="top-nav__dropdown-item-desc" data-i18n="navDropdownImageDesc">Reveal hidden image payload</span>
              </div>
            </a>
          </div>
        </div>

        <a class="top-nav__link top-nav__link--active" href="../../documentation.html" id="nav-docs">
          <span class="material-symbols-outlined">help</span>
          <span class="text-label-md" data-i18n="navDocs">Documentation</span>
        </a>
      </nav>

      <!-- Dynamic theme toggle / Preferences Trigger button -->
      <div class="top-nav__actions">
        <input type="checkbox" id="toggle-dark-mode" style="display: none !important;" />
        <button class="icon-btn" id="top-nav-settings" aria-label="Settings" title="Settings">
          <span class="material-symbols-outlined">settings</span>
        </button>
      </div>

      <!-- Hamburger (Mobile layout) -->
      <button class="top-nav__hamburger" id="hamburger-btn" aria-label="Open menu">
        <span class="material-symbols-outlined">menu</span>
      </button>
    </div>
  </nav>

  <!-- Mobile Navigation Drawer -->
  <div class="top-nav__mobile-menu" id="mobile-menu">
    <button class="top-nav__link" id="mobile-embed-toggle" type="button" style="border:none; background:none; width:100%; text-align:left; cursor:pointer; display:flex; align-items:center;">
      <span class="material-symbols-outlined">lock</span>
      <span class="text-label-md" data-i18n="navEmbed" style="margin-left: 8px;">Embed</span>
      <span class="material-symbols-outlined" style="margin-left: auto;">expand_more</span>
    </button>
    <div class="top-nav__mobile-dropdown-items" id="mobile-embed-items" style="display:none; padding-left: 20px;">
      <a class="top-nav__link" href="../../index.html#text" data-tab="text" data-i18n="emTabText">Text Embed</a>
      <a class="top-nav__link" href="../../index.html#image" data-tab="image" data-i18n="emTabImage">Image Embed</a>
    </div>

    <button class="top-nav__link" id="mobile-extract-toggle" type="button" style="border:none; background:none; width:100%; text-align:left; cursor:pointer; display:flex; align-items:center; margin-top:12px;">
      <span class="material-symbols-outlined">lock_open</span>
      <span class="text-label-md" data-i18n="navExtract" style="margin-left: 8px;">Extract</span>
      <span class="material-symbols-outlined" style="margin-left: auto;">expand_more</span>
    </button>
    <div class="top-nav__mobile-dropdown-items" id="mobile-extract-items" style="display:none; padding-left: 20px;">
      <a class="top-nav__link" href="../../extract.html#standard" data-tab="standard" data-i18n="exTabStandard">Standard Extract</a>
      <a class="top-nav__link" href="../../extract.html#scanner" data-tab="scanner" data-i18n="exTabScanner">Scanner</a>
      <a class="top-nav__link" href="../../extract.html#hints" data-tab="hints" data-i18n="exTabHints">Hints</a>
      <a class="top-nav__link" href="../../extract.html#image" data-tab="image" data-i18n="exTabImage">Image Extract</a>
    </div>

    <a class="top-nav__link" href="../../documentation.html" style="margin-top:12px; display:flex; align-items:center;">
      <span class="material-symbols-outlined" style="margin-right: 8px;">help</span>
      <span class="text-label-md" data-i18n="navDocs">Documentation</span>
    </a>
  </div>

  <div class="docs-wrap">
    <div class="docs-layout">
      <!-- Sidebar Column -->
      <aside class="docs-sidebar" id="docs-sidebar" aria-label="Documentation navigation">
        <p class="docs-sidebar__title"><a href="../../documentation.html">Documentation</a></p>
        <nav id="docs-sidebar-nav"></nav>
      </aside>
      
      <div class="docs-sidebar-backdrop" id="docs-sidebar-backdrop"></div>
      
      <!-- Main Content Column -->
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
        
        <!-- Pager -->
        <nav class="docs-pager" aria-label="Documentation pagination">
          <a class="docs-pager__link docs-pager__link--prev" id="docs-prev-link" href="#" hidden>
            <span class="material-symbols-outlined docs-pager__icon" aria-hidden="true">arrow_back</span>
            <div class="docs-pager__text">
              <span class="docs-pager__dir" data-i18n="prevBtn">Previous</span>
              <span class="docs-pager__label"></span>
            </div>
          </a>
          <a class="docs-pager__link docs-pager__link--next" id="docs-next-link" href="#" hidden>
            <div class="docs-pager__text">
              <span class="docs-pager__dir" data-i18n="nextBtn">Next</span>
              <span class="docs-pager__label"></span>
            </div>
            <span class="material-symbols-outlined docs-pager__icon" aria-hidden="true">arrow_forward</span>
          </a>
        </nav>
      </div>
      
      <!-- Secondary TOC Column -->
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
            <li><a href="../../index.html#text" class="main-footer__link" data-i18n="footerEmbedText">Text Steganography</a></li>
            <li><a href="../../index.html#image" class="main-footer__link" data-i18n="footerEmbedImage">Image Steganography</a></li>
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

  <script src="../../js/utils.js"></script>
  <script src="../../js/shared/theme-manager.js"></script>
  <script src="../../js/docs/nav-data.js"></script>
  <script src="../../js/docs/docs.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const savedLang = localStorage.getItem('stegoLang') || 'en';
      const guideBtn = document.querySelector('.floating-guide-btn');
      if (guideBtn) {
        guideBtn.setAttribute('data-tooltip', savedLang === 'ar' ? 'إرشادات الموقع' : 'Site Guide');
      }
    });
  </script>

  <!-- Floating Help/Guide Button -->
  <button type="button" class="floating-guide-btn" data-tooltip="Site Guide">
    <span class="material-symbols-outlined">help</span>
  </button>
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
