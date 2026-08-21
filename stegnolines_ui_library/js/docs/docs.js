/**
 * Shared documentation UI: sidebar, index tree, on-page TOC, prev/next.
 */
(function () {
  'use strict';

  const base = window.DOCS_BASE || '';

  function resolveHref(href) {
    return base + href;
  }

  function flattenNav() {
    const flat = [];
    (window.DOCS_NAV || []).forEach(function (section) {
      (section.items || []).forEach(function (item) {
        flat.push({
          section: section.title,
          title: item.title,
          href: resolveHref(item.href),
        });
      });
    });
    return flat;
  }

  function currentPath() {
    const path = window.location.pathname.replace(/\\/g, '/');
    const parts = path.split('/');
    return parts[parts.length - 1] || 'documentation.html';
  }

  function isActive(href) {
    const target = resolveHref(href);
    const path = window.location.pathname.replace(/\\/g, '/');
    return path.endsWith(href) || path.endsWith(target.split('/').pop());
  }

  function renderSidebarNav(container) {
    if (!container || !window.DOCS_NAV) return;

    const html = window.DOCS_NAV.map(function (section) {
      const open = section.items.some(function (item) { return isActive(item.href); });
      const links = section.items.map(function (item) {
        const active = isActive(item.href) ? ' docs-sidebar__link--active' : '';
        return '<li><a class="docs-sidebar__link' + active + '" href="' + resolveHref(item.href) + '">' + item.title + '</a></li>';
      }).join('');

      return (
        '<li class="docs-sidebar__section' + (open ? ' docs-sidebar__section--open' : '') + '">' +
          '<button type="button" class="docs-sidebar__section-btn" aria-expanded="' + (open ? 'true' : 'false') + '">' +
            '<span class="material-symbols-outlined docs-sidebar__chevron">chevron_right</span>' +
            '<span>' + section.title + '</span>' +
          '</button>' +
          '<ul class="docs-sidebar__children">' + links + '</ul>' +
        '</li>'
      );
    }).join('');

    container.innerHTML = '<ul class="docs-sidebar__list">' + html + '</ul>';

    container.querySelectorAll('.docs-sidebar__section-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const section = btn.closest('.docs-sidebar__section');
        const open = section.classList.toggle('docs-sidebar__section--open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
  }

  const INDEX_VISIBLE_LINKS = 5;

  function renderIndexTree(container) {
    if (!container || !window.DOCS_NAV) return;

    let html = '';

    if (window.DOCS_QUICKSTART) {
      const qs = window.DOCS_QUICKSTART;
      html +=
        '<a class="docs-index-card docs-index-card--featured" href="' + resolveHref(qs.href) + '" data-title="' + qs.title.toLowerCase() + '">' +
          '<div class="docs-index-card__header">' +
            '<span class="material-symbols-outlined">' + (qs.icon || 'rocket_launch') + '</span>' +
            '<span class="docs-index-card__featured-title">' + qs.title + '</span>' +
          '</div>' +
          '<div class="docs-index-card__body">' +
            '<p class="docs-index-card__desc">Start here — overview, setup, and your first embed workflow.</p>' +
          '</div>' +
        '</a>';
    }

    html += window.DOCS_NAV.map(function (section) {
      const icon = section.icon || 'folder';
      const visible = section.items.slice(0, INDEX_VISIBLE_LINKS);
      const hidden = section.items.slice(INDEX_VISIBLE_LINKS);
      const hasMore = hidden.length > 0;

      const visibleLinks = visible.map(function (item) {
        return '<li><a class="docs-index-card__link" href="' + resolveHref(item.href) + '" data-title="' + item.title.toLowerCase() + '">' + item.title + '</a></li>';
      }).join('');

      const hiddenLinks = hidden.map(function (item) {
        return '<li><a class="docs-index-card__link" href="' + resolveHref(item.href) + '" data-title="' + item.title.toLowerCase() + '">' + item.title + '</a></li>';
      }).join('');

      return (
        '<article class="docs-index-card" data-section="' + section.slug + '" data-title="' + section.title.toLowerCase() + '">' +
          '<div class="docs-index-card__header">' +
            '<span class="material-symbols-outlined docs-index-card__section-icon">' + icon + '</span>' +
            '<h2 class="docs-index-card__title">' + section.title + '</h2>' +
          '</div>' +
          '<div class="docs-index-card__body">' +
            '<ul class="docs-index-card__list">' + visibleLinks + '</ul>' +
            (hasMore
              ? '<ul class="docs-index-card__list docs-index-card__list--more" hidden>' + hiddenLinks + '</ul>' +
                '<button type="button" class="docs-index-card__more" aria-expanded="false">' +
                  '<span class="docs-index-card__more-label">More</span>' +
                  '<span class="material-symbols-outlined docs-index-card__more-icon">expand_more</span>' +
                '</button>'
              : '') +
          '</div>' +
        '</article>'
      );
    }).join('');

    container.innerHTML = html;

    container.querySelectorAll('.docs-index-card__more').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const card = btn.closest('.docs-index-card');
        const moreList = card.querySelector('.docs-index-card__list--more');
        const open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        if (moreList) moreList.hidden = open;
        btn.querySelector('.docs-index-card__more-label').textContent = open ? 'More' : 'Less';
        btn.querySelector('.docs-index-card__more-icon').textContent = open ? 'expand_more' : 'expand_less';
      });
    });
  }

  function initIndexSearch() {
    const input = document.getElementById('docs-search-input');
    const grid = document.getElementById('docs-index-grid');
    if (!input || !grid) return;

    function filterCards() {
      const q = input.value.trim().toLowerCase();

      grid.querySelectorAll('.docs-index-card').forEach(function (card) {
        const sectionTitle = card.getAttribute('data-title') || '';
        let visible = !q || sectionTitle.indexOf(q) !== -1;

        card.querySelectorAll('.docs-index-card__link').forEach(function (link) {
          const title = link.getAttribute('data-title') || '';
          const match = !q || title.indexOf(q) !== -1 || sectionTitle.indexOf(q) !== -1;
          link.closest('li').style.display = match ? '' : 'none';
          if (match) visible = true;
        });

        card.hidden = !visible;
      });
    }

    input.addEventListener('input', filterCards);

    const form = input.closest('form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        filterCards();
      });
    }
  }

  function initOnPageToc() {
    const article = document.querySelector('.docs-article');
    const toc = document.getElementById('docs-onpage-toc');
    if (!article || !toc) return;

    const headings = article.querySelectorAll('h2, h3');
    if (!headings.length) {
      toc.closest('.docs-toc').hidden = true;
      return;
    }

    const items = [];
    headings.forEach(function (h, i) {
      if (!h.id) h.id = 'docs-section-' + i;
      const level = h.tagName === 'H2' ? 'docs-toc__link--h2' : 'docs-toc__link--h3';
      items.push('<li><a class="docs-toc__link ' + level + '" href="#' + h.id + '">' + h.textContent + '</a></li>');
    });
    toc.innerHTML = '<ul class="docs-toc__list">' + items.join('') + '</ul>';
  }

  function initPageNav() {
    const prevEl = document.getElementById('docs-prev-link');
    const nextEl = document.getElementById('docs-next-link');
    if (!prevEl && !nextEl) return;

    const flat = flattenNav();
    const file = currentPath();
    let idx = -1;
    flat.forEach(function (item, i) {
      if (item.href.endsWith(file)) idx = i;
    });

    if (idx > 0 && prevEl) {
      prevEl.href = flat[idx - 1].href;
      prevEl.querySelector('.docs-pager__label').textContent = flat[idx - 1].title;
      prevEl.hidden = false;
    } else if (prevEl) {
      prevEl.hidden = true;
    }

    if (idx >= 0 && idx < flat.length - 1 && nextEl) {
      nextEl.href = flat[idx + 1].href;
      nextEl.querySelector('.docs-pager__label').textContent = flat[idx + 1].title;
      nextEl.hidden = false;
    } else if (nextEl) {
      nextEl.hidden = true;
    }
  }

  function initMobileSidebar() {
    const toggle = document.getElementById('docs-sidebar-toggle');
    const sidebar = document.getElementById('docs-sidebar');
    const backdrop = document.getElementById('docs-sidebar-backdrop');
    if (!toggle || !sidebar) return;

    function close() {
      sidebar.classList.remove('is-open');
      if (backdrop) backdrop.classList.remove('is-visible');
      document.body.classList.remove('docs-sidebar-open');
    }

    toggle.addEventListener('click', function () {
      const open = sidebar.classList.toggle('is-open');
      if (backdrop) backdrop.classList.toggle('is-visible', open);
      document.body.classList.toggle('docs-sidebar-open', open);
    });

    if (backdrop) backdrop.addEventListener('click', close);
  }

  function initSiteChrome() {
    const toggle = document.getElementById('toggle-dark-mode');
    if (toggle) {
      toggle.addEventListener('change', function () {
        document.documentElement.classList.toggle('dark', toggle.checked);
        document.documentElement.classList.toggle('light', !toggle.checked);
      });
    }

    const hamburger = document.getElementById('hamburger-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (hamburger && mobileMenu) {
      hamburger.addEventListener('click', function () {
        mobileMenu.classList.toggle('is-open');
        const icon = hamburger.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = mobileMenu.classList.contains('is-open') ? 'close' : 'menu';
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    initSiteChrome();
    renderSidebarNav(document.getElementById('docs-sidebar-nav'));
    renderIndexTree(document.getElementById('docs-index-grid'));
    initIndexSearch();
    initOnPageToc();
    initPageNav();
    initMobileSidebar();

    const docsNav = document.getElementById('nav-docs');
    if (docsNav && (currentPath() === 'documentation.html' || window.location.pathname.indexOf('/docs/') !== -1)) {
      docsNav.classList.add('top-nav__link--active');
    }
  });
})();
