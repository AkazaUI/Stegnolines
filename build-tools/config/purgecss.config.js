/**
 * PurgeCSS Configuration for StegoLines
 * 
 * Safely removes unused CSS while protecting all dynamic UI states,
 * template-generated classes, forensic steganalysis badges, and third-party UI components.
 */

module.exports = {
  content: [
    './_site/**/*.html',
    './*.html',
    './js/**/*.js',
    './i18n/**/*.json',
    './i18n/ssg-engine/**/*.njk',
    './i18n/ssg-engine/**/*.js'
  ],
  css: [
    './_site/css/**/*.css'
  ],
  safelist: {
    standard: [
      // Core interactive UI states
      'active',
      'is-active',
      'open',
      'is-open',
      'hidden',
      'show',
      'is-visible',
      'selected',
      'is-selected',
      'disabled',
      'is-disabled',
      'done',
      'pulse',
      'spin',
      'expanded',
      'collapsed',
      'dark',
      'light',
      'warn',
      'danger',
      'success',
      'info',
      'has-preview',
      'has-file',
      'is-corrupted',
      'is-overflow',
      'img-upload-success-glow',
      'img-upload-shimmer',
      'cover-editor__line-num--active',
      'custom-option',
      'pag-btn',
      'bit',
      'bit--active',
      'bit--inactive',
      'col-span-full',
      'card--mb',
      
      // Flatpickr & calendar navigation states
      'arrowUp',
      'arrowDown',
      'arrowTop',
      'startRange',
      'endRange',
      'inRange'
    ],
    greedy: [
      // Dynamic badge & risk families
      /^badge--/,
      /^risk--/,
      /^platform-preview-badge--/,
      /^hint-type-/,
      
      // Dynamic toasts, modals & tooltips
      /^sec-toast/,
      /^toast/,
      /^stego-modal/,
      /^modal--/,
      
      // Dynamic site tour & onboarding highlights
      /^stego-tour-/,
      /^tour-/,
      /^driver-/,
      
      // Third-party Flatpickr datepicker runtime classes
      /^flatpickr-/,
      
      // Forensic Steganalysis & Scanner dynamic DOM classes
      /^steganalysis-cat--/,
      /^is-cat--/,
      /^technique-badge--/,
      /^steganalysis-banner--/,
      /^steganalysis-extract-/,
      /^scanner-carrier-/,
      /^scanner-match-/,
      /^scanner-unmatched-/,
      /^scanner-error-/,
      /^scanner-empty-/,
      /^scanner-subtab/,
      
      // Documentation navigation and TOC links
      /^docs-toc__/,
      
      // Dynamic UI indicators & table rows
      /^strength-bar--/,
      /^stego-table__row--/,
      /^stego-table__content--/,
      /^row--/,
      /^underscore--/,
      /^is-clean-state/,
      /^is-date-filter/,
      /^is-file-/,
      /^is-table/,
      /^is-results/,
      /^is-btn/,
      /^stat-card__/,
      /^details-panel/,
      /^diff-/,
      /^diag-/,
      /^theme-toggle/
    ],
    deep: [
      /^flatpickr-/,
      /^stego-tour-/,
      /^tour-/
    ]
  },
  keyframes: true,
  variables: true
};
