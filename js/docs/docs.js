/**
 * STEGNOLINES — Interactive Documentation Engine
 * Handles sidebar tree generation, dynamic TOC, search filtering,
 * pagination calculation, theme management, and accessible navigation.
 */
document.addEventListener('DOMContentLoaded', () => {
  const base = window.DOCS_BASE !== undefined ? window.DOCS_BASE : '';
  const currentPath = window.location.pathname.replace(/\\/g, '/');

  // ── 1. THEME SYNCRONIZATION ───────────────────────────────
  const themeToggles = document.querySelectorAll('#toggle-dark-mode');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const savedTheme = localStorage.getItem('stegoTheme');

  let isDarkActive = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);

  const applyTheme = (isDark) => {
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('light', !isDark);
    themeToggles.forEach(toggle => { toggle.checked = isDark; });
  };

  applyTheme(isDarkActive);

  themeToggles.forEach(toggle => {
    toggle.addEventListener('change', function () {
      isDarkActive = this.checked;
      applyTheme(isDarkActive);
      localStorage.setItem('stegoTheme', isDarkActive ? 'dark' : 'light');
    });
  });

  // ── 2. TOP NAV DROPDOWNS & HAMBURGER ──────────────────────
  const dropdowns = document.querySelectorAll('.top-nav__dropdown');
  dropdowns.forEach(dd => {
    const trigger = dd.querySelector('.top-nav__dropdown-trigger');
    if (trigger) {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dd.classList.contains('is-open');
        dropdowns.forEach(o => o.classList.remove('is-open'));
        if (!isOpen) dd.classList.add('is-open');
      });
    }
  });

  // Close dropdowns on document click
  document.addEventListener('click', () => {
    dropdowns.forEach(dd => dd.classList.remove('is-open'));
  });

  // Hamburger Mobile Toggle
  const hamburger = document.getElementById('hamburger-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.toggle('is-open');
      const icon = hamburger.querySelector('.material-symbols-outlined');
      if (icon) {
        icon.textContent = mobileMenu.classList.contains('is-open') ? 'close' : 'menu';
      }
    });
  }

  // Mobile Menu embed/extract toggles
  const mobileEmbedToggle = document.getElementById('mobile-embed-toggle');
  const mobileEmbedItems = document.getElementById('mobile-embed-items');
  if (mobileEmbedToggle && mobileEmbedItems) {
    mobileEmbedToggle.addEventListener('click', () => {
      mobileEmbedItems.classList.toggle('is-open');
      const chevron = mobileEmbedToggle.querySelector('.top-nav__dropdown-chevron');
      if (chevron) {
        chevron.style.transform = mobileEmbedItems.classList.contains('is-open') ? 'rotate(180deg)' : '';
      }
    });
  }

  const mobileExtractToggle = document.getElementById('mobile-extract-toggle');
  const mobileExtractItems = document.getElementById('mobile-extract-items');
  if (mobileExtractToggle && mobileExtractItems) {
    mobileExtractToggle.addEventListener('click', () => {
      mobileExtractItems.classList.toggle('is-open');
      const chevron = mobileExtractToggle.querySelector('.top-nav__dropdown-chevron');
      if (chevron) {
        chevron.style.transform = mobileExtractItems.classList.contains('is-open') ? 'rotate(180deg)' : '';
      }
    });
  }

  // ── 3. PORTAL INDEX GRID GENERATION (documentation.html) ──
  const indexGrid = document.getElementById('docs-index-grid');
  if (indexGrid && window.DOCS_NAV) {
    indexGrid.innerHTML = ''; // clear placeholder
    window.DOCS_NAV.forEach(section => {
      const card = document.createElement('div');
      card.className = 'card docs-index-card';

      const header = document.createElement('div');
      header.className = 'docs-index-card__header';

      const icon = document.createElement('span');
      icon.className = 'material-symbols-outlined docs-index-card__icon';
      icon.textContent = section.icon || 'menu_book';

      const title = document.createElement('h2');
      title.className = 'text-headline-md docs-index-card__title';
      title.textContent = section.title;

      header.appendChild(icon);
      header.appendChild(title);
      card.appendChild(header);

      const list = document.createElement('ul');
      list.className = 'docs-index-card__list';

      section.items.forEach(item => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = base + item.href;
        link.textContent = item.title;
        li.appendChild(link);
        list.appendChild(li);
      });

      card.appendChild(list);
      indexGrid.appendChild(card);
    });

    // ── Instant Search Engine ──
    const searchInput = document.getElementById('docs-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        const cards = document.querySelectorAll('.docs-index-card');

        cards.forEach(card => {
          let hasMatch = false;
          const cardTitle = card.querySelector('.docs-index-card__title').textContent.toLowerCase();
          if (cardTitle.includes(query)) {
            hasMatch = true;
          }

          const items = card.querySelectorAll('.docs-index-card__list li');
          items.forEach(item => {
            const itemText = item.textContent.toLowerCase();
            if (itemText.includes(query)) {
              item.style.display = '';
              hasMatch = true;
            } else {
              item.style.display = query ? 'none' : '';
            }
          });

          card.style.display = hasMatch ? '' : 'none';
        });
      });
    }
  }

  // ── 4. DYNAMIC SIDEBAR TREE GENERATION ────────────────────
  const sidebarNav = document.getElementById('docs-sidebar-nav');
  if (sidebarNav && window.DOCS_NAV) {
    sidebarNav.innerHTML = '';
    window.DOCS_NAV.forEach(section => {
      const sectionDiv = document.createElement('div');
      sectionDiv.className = 'docs-sidebar__section';

      const sectionTitle = document.createElement('div');
      sectionTitle.className = 'docs-sidebar__section-title';
      
      const icon = document.createElement('span');
      icon.className = 'material-symbols-outlined';
      icon.textContent = section.icon || 'play_circle';
      
      const label = document.createElement('span');
      label.textContent = section.title;
      
      sectionTitle.appendChild(icon);
      sectionTitle.appendChild(label);
      sectionDiv.appendChild(sectionTitle);

      const list = document.createElement('ul');
      list.className = 'docs-sidebar__list';

      section.items.forEach(item => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.className = 'docs-sidebar__link';
        link.href = base + item.href;
        link.textContent = item.title;

        // Check active state robustly
        if (currentPath.endsWith(item.href)) {
          link.classList.add('docs-sidebar__link--active');
        }

        li.appendChild(link);
        list.appendChild(li);
      });

      sectionDiv.appendChild(list);
      sidebarNav.appendChild(sectionDiv);
    });

    // ── 5. RESPONSIVE SIDEBAR MOBILE TOGGLES ──────────────────
    const sidebarToggle = document.getElementById('docs-sidebar-toggle');
    const sidebar = document.getElementById('docs-sidebar');
    const backdrop = document.getElementById('docs-sidebar-backdrop');

    if (sidebarToggle && sidebar && backdrop) {
      sidebarToggle.addEventListener('click', () => {
        sidebar.classList.add('is-active');
        backdrop.classList.add('is-active');
        sidebarToggle.setAttribute('aria-expanded', 'true');
      });

      const closeSidebar = () => {
        sidebar.classList.remove('is-active');
        backdrop.classList.remove('is-active');
        sidebarToggle.setAttribute('aria-expanded', 'false');
      };

      backdrop.addEventListener('click', closeSidebar);
    }
  }

  // ── 6. TABLE OF CONTENTS GENERATION ───────────────────────
  const onpageToc = document.getElementById('docs-onpage-toc');
  const articleContent = document.querySelector('.docs-article');
  if (onpageToc && articleContent) {
    onpageToc.innerHTML = '';
    const headings = articleContent.querySelectorAll('h2, h3');
    
    if (headings.length > 0) {
      headings.forEach((heading, idx) => {
        if (!heading.id) {
          const textId = heading.textContent
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-'); // Support Arabic headings
          heading.id = `heading-${textId || idx}`;
        }

        const link = document.createElement('a');
        link.href = `#${heading.id}`;
        link.className = `docs-toc__link docs-toc__link--${heading.tagName.toLowerCase()}`;
        link.textContent = heading.textContent;
        onpageToc.appendChild(link);
      });
    } else {
      // Hide TOC column if no headings are present
      const tocAside = document.querySelector('.docs-toc');
      if (tocAside) tocAside.style.display = 'none';
    }
  }

  // ── 7. PAGINATION GENERATOR (PAGER) ───────────────────────
  const prevLink = document.getElementById('docs-prev-link');
  const nextLink = document.getElementById('docs-next-link');

  if ((prevLink || nextLink) && window.DOCS_NAV) {
    // Flatten menu items for calculation
    const flatItems = [];
    window.DOCS_NAV.forEach(section => {
      section.items.forEach(item => {
        flatItems.push(item);
      });
    });

    // Find current index
    const currentIndex = flatItems.findIndex(item => currentPath.endsWith(item.href));

    if (currentIndex !== -1) {
      // Previous Link
      if (currentIndex > 0 && prevLink) {
        const prevItem = flatItems[currentIndex - 1];
        prevLink.href = base + prevItem.href;
        const labelEl = prevLink.querySelector('.docs-pager__label');
        if (labelEl) labelEl.textContent = prevItem.title;
        prevLink.removeAttribute('hidden');
      }

      // Next Link
      if (currentIndex < flatItems.length - 1 && nextLink) {
        const nextItem = flatItems[currentIndex + 1];
        nextLink.href = base + nextItem.href;
        const labelEl = nextLink.querySelector('.docs-pager__label');
        if (labelEl) labelEl.textContent = nextItem.title;
        nextLink.removeAttribute('hidden');
      }
    }
  }
});
