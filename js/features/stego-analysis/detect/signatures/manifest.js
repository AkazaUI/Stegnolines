/**
 * @file manifest.js
 * @description Canonical, ordered manifest of Steganalysis signature profiles.
 * Used by Node to load profiles and tested against browser script tags to prevent drift.
 */

(function (global) {
  'use strict';

  const PROFILE_MANIFEST = Object.freeze([
    {
      id: 'tool.steganography-tools',
      path: 'profiles/tools/steganography-tools.js',
      legacyIds: ['tool_stego_tools']
    },
    {
      id: 'technique.whitespace',
      path: 'profiles/tools/whitespace.js',
      legacyIds: ['technique_whitespace']
    },
    {
      id: 'tool.doublespeak',
      path: 'profiles/tools/doublespeak.js',
      legacyIds: ['tool_doublespeak']
    },
    {
      id: 'tool.stegzero',
      path: 'profiles/tools/stegzero.js',
      legacyIds: ['tool_stegzero_3bit', 'tool_stegzero_1bit']
    },
    {
      id: 'tool.stegoline',
      path: 'profiles/tools/stegoline.js',
      legacyIds: ['tool_stegoline_emoji']
    },
    {
      id: 'tool.zerosteg',
      path: 'profiles/tools/zerosteg.js',
      legacyIds: ['tool_zerosteg']
    },
    {
      id: 'tool.unicode_steganography',
      path: 'profiles/tools/unicode-steganography.js',
      legacyIds: ['tool_unicode_steganography']
    },
    {
      id: 'research.multilayer-huffman',
      path: 'profiles/research/multilayer-huffman.js',
      legacyIds: ['research_multilayer_huffman']
    },
    {
      id: 'research.aitsteg',
      path: 'profiles/research/aitsteg.js',
      legacyIds: ['research_aitsteg']
    },
    {
      id: 'research.pos-fpe',
      path: 'profiles/research/pos-fpe.js',
      legacyIds: ['research_pos_fpe']
    },
    {
      id: 'research.lisat-2015',
      path: 'profiles/research/lisat-2015.js',
      legacyIds: ['research_lisat_2015']
    },
    {
      id: 'watermark.homoglyph-substitution',
      path: 'profiles/watermarks/homoglyph-substitution.js',
      legacyIds: ['watermark_homoglyphs_sub']
    },
    {
      id: 'watermark.social-media',
      path: 'profiles/watermarks/social-media.js',
      legacyIds: ['watermark_social_media']
    }
  ]);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PROFILE_MANIFEST;
  } else {
    global.StegSignatures = global.StegSignatures || {};
    global.StegSignatures.Manifest = PROFILE_MANIFEST;
  }
})(typeof window !== 'undefined' ? window : globalThis);
