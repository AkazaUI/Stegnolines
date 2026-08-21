/**
 * STEGNOLINES documentation navigation tree.
 * href values are relative to stegnolines_ui_library/ root.
 */
window.DOCS_QUICKSTART = {
  title: 'Quickstart',
  href: 'docs/getting-started/overview.html',
  icon: 'rocket_launch',
};

window.DOCS_NAV = [
  {
    title: 'Getting started',
    slug: 'getting-started',
    icon: 'play_circle',
    items: [
      { title: 'Overview', href: 'docs/getting-started/overview.html' },
      { title: 'Architecture', href: 'docs/getting-started/architecture.html' },
      { title: 'Components', href: 'docs/getting-started/components.html' },
    ],
  },
  {
    title: 'User guide',
    slug: 'user-guide',
    icon: 'menu_book',
    items: [
      { title: 'Embedding messages', href: 'docs/user-guide/embedding.html' },
      { title: 'Extracting messages', href: 'docs/user-guide/extraction.html' },
      { title: 'Stegoanalysis Extraction', href: 'docs/user-guide/extraction-guide.html' },
      { title: 'Capacity & hints', href: 'docs/user-guide/capacity-and-hints.html' },
      { title: 'Chat platform integration', href: 'docs/user-guide/chat-integration.html' },
    ],
  },
  {
    title: 'Technical reference',
    slug: 'technical-reference',
    icon: 'code',
    items: [
      { title: 'Steganography pipeline', href: 'docs/technical-reference/pipeline.html' },
      { title: 'Security model', href: 'docs/technical-reference/security.html' },
      { title: 'Extraction Engine Architecture', href: 'docs/technical-reference/extraction-engine.html' },
      { title: 'Configuration options', href: 'docs/technical-reference/configuration.html' },
    ],
  },
  {
    title: 'Development',
    slug: 'development',
    icon: 'build',
    items: [
      { title: 'Project structure', href: 'docs/development/project-structure.html' },
      { title: 'Writing documentation', href: 'docs/development/writing-docs.html' },
    ],
  },
];
