/**
 * STEGNOLINES — Complete Scientific & Technical Documentation Navigation Tree
 * Built from the official research specifications:
 * "Hybrid Text Steganography System Using Bit Mapping & Invisible Characters"
 */
window.DOCS_QUICKSTART = {
  title: 'Overview & Problem Statement',
  href: 'docs/getting-started/overview.html',
  icon: 'rocket_launch',
};

window.DOCS_NAV = [
  {
    title: 'Getting started',
    slug: 'getting-started',
    icon: 'play_circle',
    description: 'System background, problem statement, core objectives, and platform scope.',
    items: [
      { title: 'Overview', href: 'docs/getting-started/overview.html', desc: 'Background, real-world leaks, objectives, and problem statement' },
      { title: 'Architecture', href: 'docs/getting-started/architecture.html', desc: '4-tier layered architecture, physical diagram, and trust boundaries' },
      { title: 'Components', href: 'docs/getting-started/components.html', desc: 'Core system modules, interfaces, and defense-in-depth principles' },
    ],
  },
  {
    title: 'User guide',
    slug: 'user-guide',
    icon: 'menu_book',
    description: 'Practical workflows for embedding, standard extracting, chat scanning, and capacity management.',
    items: [
      { title: 'Embedding messages', href: 'docs/user-guide/embedding.html', desc: 'Complete 4-phase sender workflow and parameter configuration' },
      { title: 'Extracting messages', href: 'docs/user-guide/extraction.html', desc: 'Receiver extraction workflow, key re-derivation, and decompression' },
      { title: 'Chat platform integration', href: 'docs/user-guide/chat-integration.html', desc: 'Scanner engine, multi-message transcript analysis, and candidate detection' },
      { title: 'Capacity & hints', href: 'docs/user-guide/capacity-and-hints.html', desc: 'Capacity calculation formulas, 0xFE compression flags, and hints protocol' },
      { title: 'Variation Selectors Guide', href: 'docs/user-guide/variation-selectors.html', desc: 'Unicode VS ranges (U+FE00 & U+E0100) and UTF-8 encoding mechanics' },
      { title: 'Stegoanalysis Extraction', href: 'docs/user-guide/extraction-guide.html', desc: 'Zero-key forensic inspection and carrier classification guide' },
    ],
  },
  {
    title: 'Technical reference',
    slug: 'technical-reference',
    icon: 'code',
    description: 'Mathematical specs, literature review, pseudo-codes, threat modeling, and glossary.',
    items: [
      { title: 'Steganography pipeline', href: 'docs/technical-reference/pipeline.html', desc: 'Mathematical formulations: PBKDF2, AES-256-CTR CSPRNG, Unbiased Sampling, XOR, VS LUT' },
      { title: 'Literature Review & Prior Art', href: 'docs/technical-reference/literature-review.html', desc: 'In-depth analysis of 16 prior studies and comparative research matrix' },
      { title: 'Experimental Results & Benchmarks', href: 'docs/technical-reference/experimental-results.html', desc: '4 Baselines, capacity tables, Brotli space savings, and 9-platform robustness' },
      { title: 'Security model', href: 'docs/technical-reference/security.html', desc: 'Mathematical brute-force cracking simulation (17.5 days/1M trials) & CIA triad' },
      { title: 'Threat Modeling & Mitigation', href: 'docs/technical-reference/threat-model.html', desc: 'Comprehensive Threat Modeling matrix (Table 4.1), countermeasures, and residual risks' },
      { title: 'Algorithm Pseudo-Code', href: 'docs/technical-reference/algorithms.html', desc: 'Complete pseudo-code listings for UI, Scanner, WASM Brotli, Crypto, and Stego engines' },
      { title: 'Configuration options', href: 'docs/technical-reference/configuration.html', desc: 'Runtime configuration, PBKDF2 rounds, WASM parameters, and limits' },
      { title: 'Terms & Acronyms Glossary', href: 'docs/technical-reference/glossary.html', desc: '35+ terms & abbreviations table and 38 peer-reviewed scientific citations' },
    ],
  },
  {
    title: 'Development',
    slug: 'development',
    icon: 'build',
    description: 'Unit testing verification, test suites breakdown, and ESLint security static analysis.',
    items: [
      { title: 'Project structure & Testing', href: 'docs/development/project-structure.html', desc: '9 Jest test suites (139 tests passed) and ESLint security static code analysis' },
      { title: 'Writing documentation', href: 'docs/development/writing-docs.html', desc: 'Scientific documentation standards, i18n synchronization, and contribution guide' },
    ],
  },
];
