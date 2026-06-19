// ══════════════════════════════════════════════════════════════
// JavaScript Features — Embedding UI Controller
// ══════════════════════════════════════════════════════════════
//
// Hooks DOM events for embed.html, processes user inputs, invokes
// composeStego from the core business logic, and renders output results.
//
// Dependencies:
//   - js/core/stego/stego-composer.js
//   - js/shared/ui-helpers.js
//
// ══════════════════════════════════════════════════════════════

// DOM References (Initialized on DOMContentLoaded)
let coverInput;
let secretInput;
let hintInput;
let presharedInput;
let sendToExtractBtn;
let copyMessageBtn;
let strengthBars = [];
let strengthLabel;
let hintPreviewVal;

// Global settings state
let bypassPlatformGuardCheck = false;
let STRENGTH_LABELS = ['None', 'Too Weak', 'Weak', 'Good', 'Very Strong'];

// ── Social Platform Limits Metadata (matching the Arabic table perfectly) ──
const PLATFORM_LIMITS = {
  facebook: {
    name: { en: "Facebook", ar: "فيسبوك" },
    icon: `<svg viewBox="0 0 24 24" fill="#1877F2" width="24" height="24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
    placements: {
      bio: { name: { en: "Bio", ar: "النبذة التعريفية" }, limit: 101 },
      status: { name: { en: "Text Stories", ar: "الحالات / القصص النصية" }, limit: 130 },
      group_desc: { name: { en: "Group Description", ar: "وصف المجموعات / القنوات" }, limit: 50000 },
      comments: { name: { en: "Comments", ar: "التعليقات" }, limit: 8000 },
      posts: { name: { en: "Posts", ar: "المنشورات" }, limit: 63206 },
      dms: { name: { en: "Private Messages (DMs)", ar: "المراسلات الخاصة (DMs)" }, limit: 20000 }
    }
  },
  whatsapp: {
    name: { en: "WhatsApp", ar: "واتساب" },
    icon: `<svg viewBox="0 0 24 24" fill="#25D366" width="24" height="24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`,
    placements: {
      bio: { name: { en: "About / Bio", ar: "الخبر / النبذة التعريفية" }, limit: 50 },
      status: { name: { en: "Text Status", ar: "الحالة النصية" }, limit: 700 },
      group_desc: { name: { en: "Group Description", ar: "وصف المجموعة" }, limit: 2048 },
      dms: { name: { en: "Chat Messages (DMs)", ar: "المراسلات الخاصة" }, limit: 65536 }
    }
  },
  instagram: {
    name: { en: "Instagram", ar: "إنستغرام" },
    icon: `<svg viewBox="0 0 24 24" width="24" height="24"><defs><linearGradient id="ig-grad-guard" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#feda75"/><stop offset="25%" stop-color="#fa7e1e"/><stop offset="50%" stop-color="#d62976"/><stop offset="75%" stop-color="#962fbf"/><stop offset="100%" stop-color="#4f5bd5"/></linearGradient></defs><path fill="url(#ig-grad-guard)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`,
    placements: {
      bio: { name: { en: "Bio", ar: "النبذة التعريفية" }, limit: 150 },
      status: { name: { en: "Notes", ar: "الملاحظات" }, limit: 60 },
      group_desc: { name: { en: "Broadcast Channels", ar: "قنوات البث" }, limit: 1000 },
      comments: { name: { en: "Comments", ar: "التعليقات" }, limit: 2200 },
      posts: { name: { en: "Posts", ar: "المنشورات" }, limit: 2200 },
      dms: { name: { en: "Direct Messages (DMs)", ar: "المراسلات الخاصة (DMs)" }, limit: 1000 }
    }
  },
  telegram: {
    name: { en: "Telegram", ar: "تيليجرام" },
    icon: `<svg viewBox="0 0 24 24" fill="#26A5E4" width="24" height="24"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.56 8.224c-.124 1.312-.66 4.475-.935 5.952-.116.623-.347.83-.568.852-.482.045-.848-.318-1.314-.623-.73-.478-1.144-.775-1.854-1.242-.82-.538-.289-.834.18-1.318.122-.127 2.247-2.057 2.288-2.231a.172.172 0 0 0-.038-.146.183.183 0 0 0-.172-.016c-.073.016-1.24.787-3.498 2.311-.332.228-.632.339-.9.333-.296-.006-.867-.167-1.29-.304-.52-.17-1.127-.26-1.09-.546.018-.15.226-.303.62-.46 2.42-1.054 4.032-1.748 4.84-2.083 2.302-.958 2.78-1.124 3.09-.13z"/></svg>`,
    placements: {
      bio: { name: { en: "Bio", ar: "النبذة التعريفية" }, limit: 70 },
      status: { name: { en: "Stories", ar: "القصص" }, limit: 200 },
      group_desc: { name: { en: "Group / Channel Description", ar: "وصف القناة / المجموعة" }, limit: 255 },
      comments: { name: { en: "Comments / Replies", ar: "التعليقات" }, limit: 4096 },
      posts: { name: { en: "Channel Posts", ar: "المنشورات" }, limit: 4096 },
      dms: { name: { en: "Private Chat (DMs)", ar: "المراسلات الخاصة" }, limit: 4096 }
    }
  },
  twitter: {
    name: { en: "X", ar: "إكس" },
    icon: `<svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
    placements: {
      bio: { name: { en: "Bio", ar: "النبذة التعريفية" }, limit: 160 },
      status: { name: { en: "Space Title", ar: "عنوان المساحة" }, limit: 70 },
      group_desc: { name: { en: "Community Description", ar: "وصف المجتمع" }, limit: 160 },
      posts: { name: { en: "Posts", ar: "المنشورات" }, limit: 280 },
      dms: { name: { en: "Direct Messages (DMs)", ar: "المراسلات الخاصة" }, limit: 10000 }
    }
  },
  tiktok: {
    name: { en: "TikTok", ar: "تيك توك" },
    icon: `<svg viewBox="0 0 16 16" fill="currentColor" width="24" height="24"><path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3V0Z"/></svg>`,
    placements: {
      bio: { name: { en: "Bio", ar: "النبذة التعريفية" }, limit: 80 },
      status: { name: { en: "Story Description", ar: "وصف القصة" }, limit: 4000 },
      group_desc: { name: { en: "Live Stream Title", ar: "عنوان البث المباشر" }, limit: 32 },
      comments: { name: { en: "Comments", ar: "التعليقات" }, limit: 150 },
      posts: { name: { en: "Post Description", ar: "وصف المنشور" }, limit: 4000 },
      dms: { name: { en: "Direct Messages (DMs)", ar: "المراسلات الخاصة" }, limit: 1000 }
    }
  },
  youtube: {
    name: { en: "YouTube", ar: "يوتيوب" },
    icon: `<svg viewBox="0 0 24 24" fill="#FF0000" width="24" height="24"><path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.508 9.388.508 9.388.508s7.517 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
    placements: {
      bio: { name: { en: "Channel Description", ar: "وصف القناة" }, limit: 1000 },
      status: { name: { en: "Shorts Title", ar: "عنوان Shorts" }, limit: 100 },
      group_desc: { name: { en: "Playlist Description", ar: "وصف قوائم التشغيل" }, limit: 500 },
      comments: { name: { en: "Comments", ar: "التعليقات" }, limit: 10000 },
      posts: { name: { en: "Community Posts", ar: "منشورات المنتدى" }, limit: 5000 }
    }
  },
  wechat: {
    name: { en: "WeChat", ar: "وي شات" },
    icon: `<svg viewBox="0 0 24 24" fill="#07C160" width="24" height="24"><path d="M8.28 0C3.7 0 0 3.1 0 6.94c.02 2.17 1.17 4.1 3.07 5.37l-.8 2.37 2.76-1.38c1 .26 2.05.4 3.25.4 4.58 0 8.28-3.1 8.28-6.93C16.56 3.1 12.87 0 8.28 0zm7.4 9.87c.36 0 .72.03 1.07.09.43-2.6-1.85-4.9-5-4.9-3.7 0-6.7 2.3-6.7 5.16 0 1.63.95 3.08 2.47 4.02l-.65 1.93 2.27-1.1c.8.2 1.68.3 2.54.3.36 0 .72-.02 1.07-.06-.2-.67-.32-1.38-.32-2.14 0-1.88 1.4-3.5 3.32-3.5zm-8.8-4.5c.44 0 .8.37.8.8 0 .45-.36.82-.8.82-.45 0-.82-.37-.82-.8 0-.44.37-.8.82-.8zm4.3 0c.43 0 .8.37.8.8 0 .45-.37.82-.8.82-.45 0-.82-.37-.82-.8 0-.44.37-.8.82-.8zm3.2 6c.33 0 .6.28.6.6 0 .34-.27.62-.6.62s-.62-.28-.62-.6c0-.32.28-.6.62-.6zm3.3 0c.32 0 .6.28.6.6 0 .34-.28.62-.6.62s-.6-.28-.6-.6c0-.32.28-.6.6-.6z"/></svg>`,
    placements: {
      bio: { name: { en: "Bio / Signature", ar: "النبذة التعريفية / التوقيع" }, limit: 30 },
      status: { name: { en: "Text Status", ar: "الحالة" }, limit: 32 },
      group_desc: { name: { en: "Group Announcement", ar: "إشعار المجموعة" }, limit: 2000 },
      comments: { name: { en: "Comments", ar: "التعليقات" }, limit: 2000 },
      posts: { name: { en: "Moments Posts", ar: "منشورات Moments" }, limit: 1500 },
      dms: { name: { en: "Chat Messages", ar: "المراسلات" }, limit: 2048 }
    }
  },
  snapchat: {
    name: { en: "Snapchat", ar: "سناب شات" },
    icon: `<svg viewBox="0 0 16 16" fill="#FFFC00" stroke="#000" stroke-width="1.2" width="24" height="24"><path d="M15.943 11.526c-.111-.303-.323-.465-.564-.599a1 1 0 0 0-.123-.064l-.219-.111c-.752-.399-1.339-.902-1.746-1.498a3.4 3.4 0 0 1-.3-.531c-.034-.1-.032-.156-.008-.207a.3.3 0 0 1 .097-.1c.129-.086.262-.173.352-.231.162-.104.289-.187.371-.245.309-.216.525-.446.66-.702a1.4 1.4 0 0 0 .069-1.16c-.205-.538-.713-.872-1.329-.872a1.8 1.8 0 0 0-.487.065c.006-.368-.002-.757-.035-1.139-.116-1.344-.587-2.048-1.077-2.61a4.3 4.3 0 0 0-1.095-.881C9.764.216 8.92 0 7.999 0s-1.76.216-2.505.641c-.412.232-.782.53-1.097.883-.49.562-.96 1.267-1.077 2.61-.033.382-.04.772-.036 1.138a1.8 1.8 0 0 0-.487-.065c-.615 0-1.124.335-1.328.873a1.4 1.4 0 0 0 .067 1.161c.136.256.352.486.66.701.082.058.21.14.371.246l.339.221a.4 4.0 0 0 1 .109.11c.026.053.027.11-.012.217a3.4 3.4 0 0 1-.295.52c-.398.583-.968 1.077-1.696 1.472-.385.204-.786.34-.955.8-.128.348-.044.743.28 1.075q.18.189.409.31a4.4 4.4 0 0 0 1 .4.7.7 0 0 1 .202.09c.118.104.102.26.259.488q.12.178.296.3c.33.229.701.243 1.095.258.355.014.758.03 1.217.18.19.064.389.186.618.328.55.338 1.305.802 2.566.802 1.262 0 2.02-.466 2.576-.806.227-.14.424-.26.609-.321.46-.152.863-.168 1.218-.181.393-.015.764-.03 1.095-.258a1.14 1.14 0 0 0 .336-.368c.114-.192.11-.327.217-.42a.6.6 0 0 1 .19-.087 4.5 4.5 0 0 0 1.014-.404c.16-.087.306-.2.429-.336l.004-.005c.304-.325.38-.709.256-1.047"/></svg>`,
    placements: {
      bio: { name: { en: "Bio", ar: "النبذة التعريفية" }, limit: 150 },
      status: { name: { en: "Story Caption", ar: "تعليق القصة" }, limit: 250 },
      group_desc: { name: { en: "Group Name", ar: "اسم المجموعة" }, limit: 32 },
      dms: { name: { en: "Private Messages (DMs)", ar: "المراسلات الخاصة" }, limit: 1000 }
    }
  },
  linkedin: {
    name: { en: "LinkedIn", ar: "لينكد إن" },
    icon: `<svg viewBox="0 0 24 24" fill="#0A66C2" width="24" height="24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z"/></svg>`,
    placements: {
      bio: { name: { en: "About / Summary", ar: "قسم حول / النبذة التعريفية" }, limit: 2600 },
      status: { name: { en: "Headline", ar: "العنوان المهني" }, limit: 220 },
      group_desc: { name: { en: "Group Description", ar: "وصف المجموعة" }, limit: 2000 },
      comments: { name: { en: "Comments", ar: "التعليقات" }, limit: 1250 },
      posts: { name: { en: "Posts", ar: "المنشورات" }, limit: 3000 },
      dms: { name: { en: "InMail Messages (DMs)", ar: "المراسلات الخاصة" }, limit: 8000 }
    }
  }
};

/**
 * Read and sanitize all user inputs from the embedding panel DOM elements.
 */
function readEmbeddingInputs() {
  return {
    coverText: document.getElementById('embedCover') ? document.getElementById('embedCover').value : '',
    secretMessage: document.getElementById('embedSecretMessage') ? document.getElementById('embedSecretMessage').value : '',
    hint: document.getElementById('embedHint') ? document.getElementById('embedHint').value : '',
    stegoKey: document.getElementById('embedStegoKey') ? document.getElementById('embedStegoKey').value : '',
    fakeCoverText: document.getElementById('embedFakeCover') ? document.getElementById('embedFakeCover').value : '',
  };
}

/**
 * Write embedding results to the DOM output elements.
 */
function displayEmbeddingResults({ basePositions, xorKey, stegoText, cleanCover, fakeCoverWithVS, isSplitMode }) {
  const baseMapOutputEl = document.getElementById('baseMapOutput');
  if (baseMapOutputEl) {
    baseMapOutputEl.value = '[' + basePositions.join(', ') + ']';
  }
  const shiftKeyOutputEl = document.getElementById('shiftKeyOutput');
  if (shiftKeyOutputEl) {
    shiftKeyOutputEl.value = xorKey;
  }

  const baseMapHtml = document.getElementById('baseMapHtml');
  if (baseMapHtml) {
    if (basePositions && basePositions.length > 0) {
      const chipsDiv = document.createElement('div');
      chipsDiv.className = 'chips-container';
      basePositions.forEach(pos => {
        const chip = document.createElement('span');
        chip.className = 'pos-chip';
        const hashMark = document.createElement('span');
        hashMark.style.cssText = 'opacity:0.5; margin-right:1px;';
        hashMark.textContent = '#';
        chip.appendChild(hashMark);
        chip.appendChild(document.createTextNode(pos));
        chipsDiv.appendChild(chip);
      });
      baseMapHtml.replaceChildren(chipsDiv);
    } else {
      const fallback = document.createElement('span');
      fallback.style.cssText = 'opacity:0.5; font-style:italic;';
      fallback.textContent = 'No positions mapped.';
      baseMapHtml.replaceChildren(fallback);
    }
  }

  const xorKeyHtml = document.getElementById('xorKeyHtml');
  if (xorKeyHtml) {
    if (xorKey) {
      let activeCount = 0;
      let inactiveCount = 0;
      let bitsHtml = `<div class="bits-container">`;
      for (let i = 0; i < xorKey.length; i++) {
        const bit = xorKey[i];
        if (bit === '1') {
          activeCount++;
          bitsHtml += `<span class="bit bit--active" title="Position #${i + 1}: Bit modified (1)">1</span>`;
        } else if (bit === '0') {
          inactiveCount++;
          bitsHtml += `<span class="bit bit--inactive" title="Position #${i + 1}: Bit identical (0)">0</span>`;
        } else {
          bitsHtml += bit;
        }
      }
      bitsHtml += `</div>`;

      const totalBits = xorKey.length;
      const activePercent = totalBits > 0 ? ((activeCount / totalBits) * 100).toFixed(1) : 0;
      const inactivePercent = totalBits > 0 ? ((inactiveCount / totalBits) * 100).toFixed(1) : 0;

      const statsBarHtml = `
        <div class="xor-stats-bar" style="display: flex; flex-direction: column; gap: var(--space-xs); margin-bottom: var(--space-md); padding-bottom: var(--space-sm); border-bottom: 1px dashed var(--color-outline-variant); width: 100%;">
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.72rem; font-family: 'Sora', sans-serif; font-weight: 600; color: var(--color-on-surface-variant); opacity: 0.85;">
            <span>XOR DISTRIBUTION STATUS</span>
            <span style="letter-spacing: 0.5px;">Entropy Ratio: ${activePercent}% / ${inactivePercent}%</span>
          </div>
          <div style="display: flex; height: 6px; border-radius: var(--radius-full); overflow: hidden; background: rgba(94, 92, 96, 0.15); margin: 2px 0;">
            <div style="width: ${activePercent}%; background: var(--color-primary); transition: width 0.3s ease;"></div>
            <div style="width: ${inactivePercent}%; background: rgba(94, 92, 96, 0.35); transition: width 0.3s ease;"></div>
          </div>
          <div style="display: flex; gap: var(--space-md); font-size: 0.65rem; color: var(--color-on-surface-variant); opacity: 0.8; font-family: 'Sora', sans-serif; font-weight: 500;">
            <span style="display: inline-flex; align-items: center; gap: 4px;">
              <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--color-primary);"></span>
              ${activeCount} Active Bits (1s) &bull; ${activePercent}%
            </span>
            <span style="display: inline-flex; align-items: center; gap: 4px;">
              <span style="width: 6px; height: 6px; border-radius: 50%; background: rgba(176, 176, 176, 0.6);"></span>
              ${inactiveCount} Inactive Bits (0s) &bull; ${inactivePercent}%
            </span>
          </div>
        </div>
      `;

      xorKeyHtml.innerHTML = statsBarHtml + bitsHtml;
    } else {
      const fallback = document.createElement('span');
      fallback.style.cssText = 'opacity:0.5; font-style:italic;';
      fallback.textContent = 'No XOR key mask generated.';
      xorKeyHtml.replaceChildren(fallback);
    }
  }

  const normalDiv = document.getElementById('outputModeNormal');
  const splitDiv = document.getElementById('outputModeSplit');

  if (isSplitMode) {
    if (normalDiv) normalDiv.style.display = 'none';
    if (splitDiv) splitDiv.style.display = 'block';
    const splitCleanEl = document.getElementById('splitCleanCover');
    if (splitCleanEl) splitCleanEl.value = cleanCover || '';
    const splitFakeEl = document.getElementById('splitFakeCoverOutput');
    if (splitFakeEl) splitFakeEl.value = fakeCoverWithVS || '';
    
    const stegoTextEl = document.getElementById('stegoText');
    if (stegoTextEl) stegoTextEl.value = stegoText || '';
  } else {
    if (normalDiv) normalDiv.style.display = 'block';
    if (splitDiv) splitDiv.style.display = 'none';
    const stegoTextEl = document.getElementById('stegoText');
    if (stegoTextEl) stegoTextEl.value = stegoText || '';
  }
}

/**
 * Main embedding UI handler that hooks the button interaction.
 */
async function performEmbedding() {
  try {
    // Reset previous results panel visibility and clear output
    const resultsPanel = document.getElementById('embed-results-panel');
    if (resultsPanel) resultsPanel.style.display = 'none';
    const stegoTextEl = document.getElementById('stegoText');
    if (stegoTextEl) stegoTextEl.value = '';

    const timeEl = document.getElementById('embedTimeTaken');
    if (timeEl) timeEl.style.display = 'none';

    const { coverText, secretMessage, hint, stegoKey, fakeCoverText } = readEmbeddingInputs();

    if (!coverText.trim()) return showToast('⚠ Please input the cover text.');
    if (!secretMessage) return showToast('⚠ Please input the secret message.');
    if (!stegoKey.trim()) return showToast('⚠ Please input the Pre-Shared Key (Stego-Key).');

    // Check if cover text already contains variation selectors (VS)
    let hasVS = false;
    for (const char of coverText) {
      const codePoint = char.codePointAt(0);
      if (isBaseVariationSelector(codePoint) || isSupplementaryVariationSelector(codePoint)) {
        hasVS = true;
        break;
      }
    }
    if (hasVS) {
      const currentLang = localStorage.getItem('stegoLang') || 'en';
      const errMsg = currentLang === 'ar'
        ? '⚠️ خطأ: نص الغلاف يحتوي بالفعل على أحرف مخفية (أحرف التحويل). يرجى استخدام نص غلاف نظيف.'
        : '⚠️ Error: Cover text already contains hidden characters (Variation Selectors). Please use a clean cover text.';
      showToast(errMsg);
      return;
    }

    if (hint && hint.length > 60) {
      const currentLang = localStorage.getItem('stegoLang') || 'en';
      const errMsg = currentLang === 'ar'
        ? '❌ خطأ: لا يمكن إخفاء البيانات لأن التلميح يتجاوز 60 حرفاً!'
        : '❌ Error: Cannot hide data because the hint exceeds 60 characters!';
      showToast(errMsg);
      return;
    }

    const hasFakeCover = fakeCoverText.trim().length > 0;
    if (hasFakeCover && fakeCoverText.length < secretMessage.length) {
      const currentLang = localStorage.getItem('stegoLang') || 'en';
      const errMsg = currentLang === 'ar'
        ? `❌ خطأ: حجم الغلاف المزيف (${fakeCoverText.length} حرفاً) أقل من حجم الرسالة السرية (${secretMessage.length} حرفاً)! يجب أن يكون أكبر من أو يساوي حجم الرسالة السرية.`
        : `❌ Error: Fake Cover size (${fakeCoverText.length} chars) is less than secret message (${secretMessage.length} chars). It must be >= secret message size.`;
      showToast(errMsg);
      return;
    }

    const encryptionKeyEl = document.getElementById('embedEncryptionKey');
    const encryptionKey = encryptionKeyEl ? encryptionKeyEl.value.trim() : "";

    const startTime = performance.now();
    const trace = await composeStego(coverText, secretMessage, hint, stegoKey, encryptionKey, fakeCoverText);
    const durationMs = performance.now() - startTime;

    displayEmbeddingResults({
      basePositions: trace.basePositions,
      xorKey: trace.xorKey,
      stegoText: trace.stegoText,
      cleanCover: coverText,
      fakeCoverWithVS: trace.fakeCoverWithVS,
      isSplitMode: trace.isSplitMode
    });

    const timeVal = document.getElementById('embedTimeVal');
    const compressTimeVal = document.getElementById('embedCompressTimeVal');
    const compressBadge = document.getElementById('embedCompressTimeBadge');
    if (timeEl && timeVal && compressTimeVal && compressBadge) {
      const currentLang = localStorage.getItem('stegoLang') || 'en';
      
      timeVal.setAttribute('data-duration', durationMs);
      timeVal.textContent = currentLang === 'ar'
        ? `${durationMs.toFixed(1)} ملي ثانية`
        : `${durationMs.toFixed(1)} ms`;
        
      const brotliTime = trace.brotliDurationMs || 0;
      compressTimeVal.setAttribute('data-duration', brotliTime);
      compressTimeVal.textContent = currentLang === 'ar'
        ? `${brotliTime.toFixed(1)} ملي ثانية`
        : `${brotliTime.toFixed(1)} ms`;
        
      if (trace.compressed) {
        compressBadge.setAttribute('data-i18n', 'badgeBrotliActive');
        compressBadge.textContent = currentLang === 'ar' ? 'Brotli نشط' : 'Brotli Active';
        compressBadge.className = 'metric-card__badge metric-card__badge--amber';
      } else {
        compressBadge.setAttribute('data-i18n', 'badgeBrotliBypassed');
        compressBadge.textContent = currentLang === 'ar' ? 'Brotli مستبعد' : 'Brotli Bypassed';
        compressBadge.className = 'metric-card__badge';
      }
      
      timeEl.style.display = 'grid';
    }

    if (trace.isSplitMode) {
      showToast('✅ Generated — Cover is clean + VS characters in the Fake Cover!');
    } else {
      showToast('✅ Key generated and embedded in the cover!');
    }

    if (typeof updateVSVisualization === 'function') {
      updateVSVisualization(trace.xorKey, trace.bytesArr);
    }
    if (typeof updateKeySizeMeter === 'function') {
      updateKeySizeMeter(trace.bytesArr.length, coverText.length);
    }
    if (hint && typeof saveHint === 'function') {
      saveHint({
        type: 'sent',
        hint: hint,
        timestamp: new Date().toISOString(),
      });
    }
    if (typeof updateCapacityMeter === 'function') {
      updateCapacityMeter();
    }

    try {
      localStorage.setItem('stegoTrace', JSON.stringify({
        ...trace,
        coverText,
        secretMessage,
        hint,
        timestamp: new Date().toISOString()
      }));
    } catch (e) {
      console.error('Failed to save stegoTrace:', e);
    }

  } catch (error) {
    showToast('❌ Embedding error: ' + error.message);
  }
}

async function runEmbeddingPipeline() {
  await performEmbedding();
  // Show output + VS sections after embedding
  const stegoVal = document.getElementById('stegoText').value;
  if (stegoVal) {
    document.getElementById('embed-results-panel').style.display = 'block';
    document.getElementById('output-section').style.display = 'block';
    document.getElementById('toggleDetailsBtnWrap').style.display = 'block';
    document.getElementById('btnFullReportWrap').style.display = 'block';

    // Update visual metrics again to reflect correct hint banner visibility
    updateVisualMetrics();

    const vsSection = document.getElementById('vsAnalysisSection');
    if (vsSection && document.getElementById('vsVisualization').value) {
      vsSection.style.display = 'block';
    }
    setTimeout(() => document.getElementById('embed-results-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
  }
}

// ── Password strength (zxcvbn) ──
function assessStrength(value) {
  if (!value || value.length === 0) return 0;
  if (typeof zxcvbn !== 'function') {
    if (value.length < 8) return 1;
    if (value.length < 12) return 2;
    return 3;
  }
  return Math.min(zxcvbn(value).score + 1, 4);
}

function updateStrengthBars(level) {
  if (strengthBars && strengthBars.length > 0) {
    strengthBars.forEach((bar, i) => {
      if (bar) bar.classList.toggle('active', i < level);
    });
  }
  const keys = ['strengthNone', 'strengthTooWeak', 'strengthWeak', 'strengthGood', 'strengthVeryStrong'];
  const key = keys[level];
  const currentLang = localStorage.getItem('stegoLang') || 'en';
  if (strengthLabel) {
    strengthLabel.setAttribute('data-i18n', key);
    strengthLabel.textContent = TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]
      ? TRANSLATIONS[currentLang][key]
      : STRENGTH_LABELS[level];
  }
}

// ── Custom Dropdown JS functions for Platform Selector ──
function toggleGuardPlatformSelect(e) {
  e.stopPropagation();
  const options = document.getElementById('guardPlatformOptions');
  if (options) {
    options.classList.toggle('open');
    const placementOpts = document.getElementById('guardPlacementOptions');
    if (placementOpts) placementOpts.classList.remove('open');
  }
}

function selectGuardPlatformOption(value) {
  const hiddenInput = document.getElementById('guardPlatformSelect');
  if (!hiddenInput) return;
  hiddenInput.value = value;

  const labelSpan = document.getElementById('guardPlatformLabel');
  const currentLang = localStorage.getItem('stegoLang') || 'en';

  if (value === 'none') {
    labelSpan.setAttribute('data-i18n', 'guardPlatformNone');
    labelSpan.textContent = currentLang === 'ar' ? 'لا يوجد' : 'None';
  } else {
    labelSpan.removeAttribute('data-i18n');
    const platformData = PLATFORM_LIMITS[value];
    const pName = platformData.name[currentLang] || platformData.name['en'];
    labelSpan.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="display:flex; align-items:center; justify-content:center; width:20px; height:20px; flex-shrink:0;">
          ${platformData.icon}
        </span>
        <span>${pName}</span>
      </div>
    `;
  }

  const optDivs = document.querySelectorAll('#guardPlatformOptions .custom-option');
  optDivs.forEach(opt => {
    if (opt.getAttribute('data-value') === value) opt.classList.add('selected');
    else opt.classList.remove('selected');
  });

  const options = document.getElementById('guardPlatformOptions');
  if (options) options.classList.remove('open');

  onGuardPlatformChange();
}

// Custom Dropdown JS functions for Placement Selector
function toggleGuardPlacementSelect(e) {
  e.stopPropagation();
  const platformSelect = document.getElementById('guardPlatformSelect');
  if (platformSelect && platformSelect.value === 'none') return;

  const options = document.getElementById('guardPlacementOptions');
  if (options) {
    options.classList.toggle('open');
    const platformOpts = document.getElementById('guardPlatformOptions');
    if (platformOpts) platformOpts.classList.remove('open');
  }
}

function selectGuardPlacementOption(value) {
  const hiddenInput = document.getElementById('guardPlacementSelect');
  if (!hiddenInput) return;
  hiddenInput.value = value;

  const platformSelect = document.getElementById('guardPlatformSelect');
  const platformKey = platformSelect ? platformSelect.value : 'none';
  const labelSpan = document.getElementById('guardPlacementLabel');
  const currentLang = localStorage.getItem('stegoLang') || 'en';

  if (value === 'none') {
    labelSpan.setAttribute('data-i18n', 'guardPlacementNone');
    labelSpan.textContent = currentLang === 'ar' ? '-- اختر الموضع --' : '-- Choose Placement --';
  } else if (platformKey !== 'none' && PLATFORM_LIMITS[platformKey]) {
    labelSpan.removeAttribute('data-i18n');
    const platformData = PLATFORM_LIMITS[platformKey];
    const placementData = platformData.placements[value];
    if (placementData) {
      labelSpan.textContent = placementData.name[currentLang] || placementData.name['en'];
    }
  }

  const optDivs = document.querySelectorAll('#guardPlacementOptions .custom-option');
  optDivs.forEach(opt => {
    if (opt.getAttribute('data-value') === value) opt.classList.add('selected');
    else opt.classList.remove('selected');
  });

  const options = document.getElementById('guardPlacementOptions');
  if (options) options.classList.remove('open');

  onGuardPlacementChange();
}

function initPlatformGuardDropdowns() {
  const platformOptionsContainer = document.getElementById('guardPlatformOptions');
  const placementOptionsContainer = document.getElementById('guardPlacementOptions');
  const placementTrigger = document.getElementById('guardPlacementTrigger');
  const placementSelect = document.getElementById('guardPlacementSelect');
  if (!platformOptionsContainer) return;

  const currentLang = localStorage.getItem('stegoLang') || 'en';
  const hiddenInput = document.getElementById('guardPlatformSelect');
  const selectedPlatform = hiddenInput ? hiddenInput.value : 'none';
  const selectedPlacement = placementSelect ? placementSelect.value : 'none';

  platformOptionsContainer.replaceChildren();

  const noneOpt = document.createElement('div');
  noneOpt.className = `custom-option${selectedPlatform === 'none' ? ' selected' : ''}`;
  noneOpt.setAttribute('data-value', 'none');
  noneOpt.onclick = () => selectGuardPlatformOption('none');
  const noneSpan = document.createElement('span');
  noneSpan.setAttribute('data-i18n', 'guardPlatformNone');
  noneSpan.textContent = currentLang === 'ar' ? 'لا يوجد' : 'None';
  noneOpt.appendChild(noneSpan);
  platformOptionsContainer.appendChild(noneOpt);

  Object.keys(PLATFORM_LIMITS).forEach(key => {
    const opt = document.createElement('div');
    opt.className = `custom-option${selectedPlatform === key ? ' selected' : ''}`;
    opt.setAttribute('data-value', key);
    opt.onclick = () => selectGuardPlatformOption(key);
    opt.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="display:flex; align-items:center; justify-content:center; width:20px; height:20px; flex-shrink:0;">
          ${PLATFORM_LIMITS[key].icon}
        </span>
        <span>${PLATFORM_LIMITS[key].name[currentLang] || PLATFORM_LIMITS[key].name['en']}</span>
      </div>
    `;
    platformOptionsContainer.appendChild(opt);
  });

  const labelSpan = document.getElementById('guardPlatformLabel');
  if (labelSpan) {
    if (selectedPlatform === 'none') {
      labelSpan.setAttribute('data-i18n', 'guardPlatformNone');
      labelSpan.textContent = currentLang === 'ar' ? 'لا يوجد' : 'None';
    } else if (PLATFORM_LIMITS[selectedPlatform]) {
      labelSpan.removeAttribute('data-i18n');
      const platformData = PLATFORM_LIMITS[selectedPlatform];
      const pName = platformData.name[currentLang] || platformData.name['en'];
      labelSpan.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="display:flex; align-items:center; justify-content:center; width:20px; height:20px; flex-shrink:0;">
            ${platformData.icon}
          </span>
          <span>${pName}</span>
        </div>
      `;
    }
  }

  if (selectedPlatform !== 'none' && PLATFORM_LIMITS[selectedPlatform]) {
    if (placementTrigger) {
      placementTrigger.style.pointerEvents = 'auto';
      placementTrigger.style.opacity = '1';
    }

    if (placementOptionsContainer) {
      placementOptionsContainer.replaceChildren();
      const platformData = PLATFORM_LIMITS[selectedPlatform];
      Object.keys(platformData.placements).forEach(key => {
        const opt = document.createElement('div');
        opt.className = `custom-option${selectedPlacement === key ? ' selected' : ''}`;
        opt.setAttribute('data-value', key);
        opt.onclick = () => selectGuardPlacementOption(key);
        opt.textContent = platformData.placements[key].name[currentLang] || platformData.placements[key].name['en'];
        placementOptionsContainer.appendChild(opt);
      });
    }

    const pLabelSpan = document.getElementById('guardPlacementLabel');
    if (pLabelSpan) {
      if (selectedPlacement !== 'none' && PLATFORM_LIMITS[selectedPlatform].placements[selectedPlacement]) {
        pLabelSpan.removeAttribute('data-i18n');
        pLabelSpan.textContent = PLATFORM_LIMITS[selectedPlatform].placements[selectedPlacement].name[currentLang] || PLATFORM_LIMITS[selectedPlatform].placements[selectedPlacement].name['en'];
      } else {
        pLabelSpan.setAttribute('data-i18n', 'guardPlacementNone');
        pLabelSpan.textContent = currentLang === 'ar' ? '-- اختر الموضع --' : '-- Choose Placement --';
      }
    }

    onGuardPlacementChange();
  } else {
    if (hiddenInput) hiddenInput.value = 'none';
    if (placementSelect) placementSelect.value = 'none';

    const pLabelSpan = document.getElementById('guardPlacementLabel');
    if (pLabelSpan) {
      pLabelSpan.setAttribute('data-i18n', 'guardPlacementNone');
      pLabelSpan.textContent = currentLang === 'ar' ? '-- اختر الموضع --' : '-- Choose Placement --';
    }

    if (placementTrigger) {
      placementTrigger.style.pointerEvents = 'none';
      placementTrigger.style.opacity = '0.5';
    }
    if (placementOptionsContainer) placementOptionsContainer.replaceChildren();
  }
}

function onGuardPlatformChange() {
  const platformSelect = document.getElementById('guardPlatformSelect');
  const placementSelect = document.getElementById('guardPlacementSelect');
  const placementTrigger = document.getElementById('guardPlacementTrigger');
  const placementOptionsContainer = document.getElementById('guardPlacementOptions');
  const previewCard = document.getElementById('guardPreviewCard');

  const platformKey = platformSelect.value;
  const currentLang = localStorage.getItem('stegoLang') || 'en';

  if (platformKey === 'none') {
    if (placementSelect) placementSelect.value = 'none';

    const labelSpan = document.getElementById('guardPlacementLabel');
    if (labelSpan) {
      labelSpan.setAttribute('data-i18n', 'guardPlacementNone');
      labelSpan.textContent = currentLang === 'ar' ? '-- اختر الموضع --' : '-- Choose Placement --';
    }

    if (placementTrigger) {
      placementTrigger.style.pointerEvents = 'none';
      placementTrigger.style.opacity = '0.5';
    }

    if (placementOptionsContainer) placementOptionsContainer.replaceChildren();
    previewCard.style.display = 'none';
    return;
  }

  if (placementTrigger) {
    placementTrigger.style.pointerEvents = 'auto';
    placementTrigger.style.opacity = '1';
  }

  if (placementOptionsContainer) {
    placementOptionsContainer.replaceChildren();
    const platformData = PLATFORM_LIMITS[platformKey];
    const placementKeys = Object.keys(platformData.placements);

    placementKeys.forEach((key, index) => {
      const opt = document.createElement('div');
      opt.className = `custom-option${index === 0 ? ' selected' : ''}`;
      opt.setAttribute('data-value', key);
      opt.onclick = () => selectGuardPlacementOption(key);
      opt.textContent = platformData.placements[key].name[currentLang] || platformData.placements[key].name['en'];
      placementOptionsContainer.appendChild(opt);
    });

    const defaultPlacement = placementKeys[0];
    if (placementSelect) placementSelect.value = defaultPlacement;

    const labelSpan = document.getElementById('guardPlacementLabel');
    if (labelSpan) {
      labelSpan.removeAttribute('data-i18n');
      labelSpan.textContent = platformData.placements[defaultPlacement].name[currentLang] || platformData.placements[defaultPlacement].name['en'];
    }
  }

  onGuardPlacementChange();
}

function onGuardPlacementChange() {
  const platformSelect = document.getElementById('guardPlatformSelect');
  const placementSelect = document.getElementById('guardPlacementSelect');
  const previewCard = document.getElementById('guardPreviewCard');

  const platformKey = platformSelect.value;
  const placementKey = placementSelect.value;

  if (platformKey === 'none' || !placementKey || placementKey === 'none') {
    previewCard.style.display = 'none';
    return;
  }

  const platformData = PLATFORM_LIMITS[platformKey];
  const placementData = platformData.placements[placementKey];
  const currentLang = localStorage.getItem('stegoLang') || 'en';

  document.getElementById('guardPreviewName').textContent = platformData.name[currentLang] || platformData.name['en'];
  document.getElementById('guardPreviewPlacement').textContent = placementData.name[currentLang] || placementData.name['en'];
  document.getElementById('guardPreviewIcon').innerHTML = platformData.icon;
  document.getElementById('guardPreviewLimitText').textContent = `${currentLang === 'ar' ? 'الحد الأقصى:' : 'Limit:'} ${placementData.limit} ${currentLang === 'ar' ? 'حرف' : 'chars'}`;

  previewCard.style.display = 'block';
  bypassPlatformGuardCheck = false;

  updateGuardValidation();
}

function updateGuardValidation() {
  const platformSelect = document.getElementById('guardPlatformSelect');
  const placementSelect = document.getElementById('guardPlacementSelect');
  if (!platformSelect || platformSelect.value === 'none') return;

  const platformKey = platformSelect.value;
  const placementKey = placementSelect ? placementSelect.value : 'none';
  if (placementKey === 'none' || !placementKey) return;

  const platformData = PLATFORM_LIMITS[platformKey];
  const placementData = platformData.placements[placementKey];
  const limit = placementData.limit;
  const currentLang = localStorage.getItem('stegoLang') || 'en';

  const coverText = coverInput.value;
  const secretMessage = secretInput.value;
  const hintVal = hintInput.value;

  let vsCharsCount = 0;
  if (secretMessage.length > 0 || (hintVal && hintVal.trim())) {
    try {
      const payload = buildPayload(secretMessage || '', hintVal || '');
      const msgBitsLength = bytesToBinary(payload).length;
      vsCharsCount = Math.ceil(msgBitsLength / 8);
    } catch (e) { }
  }

  const fakeCoverText = document.getElementById('embedFakeCover').value.trim();
  const hasFakeCover = fakeCoverText.length > 0;

  let finalLength = vsCharsCount + coverText.length;
  if (hasFakeCover) {
    finalLength = vsCharsCount + fakeCoverText.length;
  }

  const countText = document.getElementById('guardPreviewCountText');
  if (countText) {
    countText.textContent = `${finalLength} / ${limit} ${currentLang === 'ar' ? 'حرف' : 'chars'}`;
  }

  const progressFill = document.getElementById('guardPreviewProgressFill');
  if (progressFill) {
    const percentage = Math.min(100, (finalLength / limit) * 100);
    progressFill.style.width = percentage + '%';

    const badge = document.getElementById('guardPreviewBadge');
    const badgeText = document.getElementById('guardPreviewBadgeText');
    const badgeIcon = document.getElementById('guardPreviewBadgeIcon');

    badge.classList.remove('platform-preview-badge--safe', 'platform-preview-badge--warn', 'platform-preview-badge--danger');
    progressFill.classList.remove('warn', 'danger');

    if (finalLength > limit) {
      badge.classList.add('platform-preview-badge--danger');
      badgeText.textContent = currentLang === 'ar' ? 'متجاوز للحد' : 'Exceeded';
      badgeIcon.textContent = 'cancel';
      progressFill.classList.add('danger');
    } else if (finalLength > limit * 0.8) {
      badge.classList.add('platform-preview-badge--warn');
      badgeText.textContent = currentLang === 'ar' ? 'يقترب من الحد' : 'Approaching';
      badgeIcon.textContent = 'warning';
      progressFill.classList.add('warn');
    } else {
      badge.classList.add('platform-preview-badge--safe');
      badgeText.textContent = currentLang === 'ar' ? 'آمن' : 'Safe';
      badgeIcon.textContent = 'check_circle';
    }
  }
}

function openPlatformWarningModal(platformData, placementData, finalLength, limit) {
  const currentLang = localStorage.getItem('stegoLang') || 'en';
  const pName = platformData.name[currentLang] || platformData.name['en'];
  const plName = placementData.name[currentLang] || placementData.name['en'];

  let descriptionHtml = '';
  if (currentLang === 'ar') {
    descriptionHtml = `تنبيه: حجم النص الإخفائي النهائي المتوقع هو <strong>${finalLength} حرفاً</strong> (بما في ذلك أحرف الإخفاء غير المرئية)، وهو ما <strong>يتجاوز الحد الأقصى</strong> المسموح به في منصة <strong>${pName}</strong> لموضع <strong>(${plName})</strong> البالغ <strong>${limit} حرفاً</strong> فقط.<br><br>إذا قمت بالنشر، فقد تقوم المنصة بقص النص تلقائياً، مما يؤدي إلى <strong>تلف وضياع الرسالة السرية تماماً</strong>.`;
  } else {
    descriptionHtml = `Warning: The expected final stego-text length is <strong>${finalLength} characters</strong> (including invisible variation selectors), which <strong>exceeds the limit</strong> of <strong>${limit} characters</strong> allowed on <strong>${pName}</strong> for <strong>(${plName})</strong>.<br><br>If you post this, the platform may truncate your text, <strong>fully corrupting and destroying the hidden message</strong>.`;
  }

  document.getElementById('platform-warning-modal-desc').innerHTML = descriptionHtml;

  const warningModal = document.getElementById('platform-warning-modal');
  const warningBackdrop = document.getElementById('platform-warning-modal-backdrop');
  if (warningModal && warningBackdrop) {
    warningModal.style.display = 'flex';
    requestAnimationFrame(() => {
      warningModal.classList.add('active');
      warningBackdrop.classList.add('active');
      document.body.classList.add('settings-modal-open');
    });
  }
}

function closePlatformWarningModal() {
  const warningModal = document.getElementById('platform-warning-modal');
  const warningBackdrop = document.getElementById('platform-warning-modal-backdrop');
  if (warningModal && warningBackdrop) {
    warningModal.classList.remove('active');
    warningBackdrop.classList.remove('active');
    document.body.classList.remove('settings-modal-open');
    setTimeout(() => { warningModal.style.display = 'none'; }, 300);
  }
}

/* ── Live visual update (password strength + hint preview) ── */
function updateVisualMetrics() {
  if (!presharedInput || !hintInput || !coverInput || !secretInput) {
    return;
  }
  updateStrengthBars(assessStrength(presharedInput.value));
  const keyCounterEl = document.getElementById('preshared-counter');
  if (keyCounterEl) keyCounterEl.textContent = `${presharedInput.value.length} chars`;

  const hintLen = hintInput.value.length;
  const hintCounterEl = document.getElementById('embedHintCounter');
  const hintErrorEl = document.getElementById('embedHintError');
  const currentLang = localStorage.getItem('stegoLang') || 'en';

  if (hintCounterEl) {
    hintCounterEl.textContent = `${hintLen}/60`;
    if (hintLen > 60) {
      hintCounterEl.style.color = 'var(--color-error)';
      hintInput.classList.add('form-input--error');
      if (hintErrorEl) {
        hintErrorEl.textContent = currentLang === 'ar' ? '⚠️ لا يمكن أن يتجاوز التلميح 60 حرفاً' : '⚠️ Hint cannot exceed 60 characters';
        hintErrorEl.style.display = 'block';
      }
    } else {
      hintCounterEl.style.color = 'var(--color-on-surface-variant)';
      hintInput.classList.remove('form-input--error');
      if (hintErrorEl) {
        hintErrorEl.style.display = 'none';
      }
    }
  }

  const hintBanner = document.getElementById('hint-banner-container');
  const hintVal = hintInput.value.trim();
  if (hintBanner) {
    hintBanner.style.display = hintVal ? 'flex' : 'none';
  }
  if (hintPreviewVal) {
    hintPreviewVal.textContent = hintVal;
  }

  updateGuardValidation();
}

/* ── Social sharing helpers ── */
function getShareText() {
  const text = document.getElementById('stegoText').value;
  if (!text) { showToast('⚠ No output to share. Run embedding first.'); return null; }
  return text;
}

function getImageShareText() {
  const text = document.getElementById('imgStegoText').value;
  if (!text) { showToast('⚠ No output to share. Run embedding first.'); return null; }
  return text;
}

// Dynamic copies
function copyResultText(elementId, btnElement) {
  const textarea = document.getElementById(elementId);
  if (!textarea || !textarea.value) {
    showToast('⚠ No output to copy. Run embedding first.');
    return;
  }

  navigator.clipboard.writeText(textarea.value).then(() => {
    showToast('📋 Copied to Clipboard!');
    const origHtml = btnElement.innerHTML;
    btnElement.classList.add('floating-btn--success');
    btnElement.innerHTML = `
      <span class="material-symbols-outlined">check</span>
      <span>Copied!</span>
    `;

    setTimeout(() => {
      btnElement.classList.remove('floating-btn--success');
      btnElement.innerHTML = origHtml;
    }, 2000);
  }).catch(() => {
    showToast('❌ Copy failed. Please select and copy manually.');
  });
}

function switchResultTab(event, tabId) {
  event.preventDefault();
  const container = event.target.closest('.tab-container');
  const contents = container.querySelectorAll('.tab-content');
  const buttons = container.querySelectorAll('.tab-btn');

  contents.forEach(content => content.classList.remove('active'));
  buttons.forEach(btn => btn.classList.remove('active'));

  container.querySelector(`#${tabId}`).classList.add('active');
  event.currentTarget.classList.add('active');
}

// Settings modal open/close logic
function openSettingsModal() {
  const settingsModal = document.getElementById('settings-modal');
  const settingsBackdrop = document.getElementById('settings-modal-backdrop');
  if (settingsModal && settingsBackdrop) {
    settingsModal.style.display = 'flex';
    requestAnimationFrame(() => {
      settingsModal.classList.add('active');
      settingsBackdrop.classList.add('active');
      document.body.classList.add('settings-modal-open');
    });
    const navToggle = document.getElementById('toggle-dark-mode');
    const modalToggle = document.getElementById('toggle-dark-mode-modal');
    if (navToggle && modalToggle) modalToggle.checked = navToggle.checked;
  }
}

function closeSettingsModal() {
  const settingsModal = document.getElementById('settings-modal');
  const settingsBackdrop = document.getElementById('settings-modal-backdrop');
  if (settingsModal && settingsBackdrop) {
    settingsModal.classList.remove('active');
    settingsBackdrop.classList.remove('active');
    document.body.classList.remove('settings-modal-open');
    setTimeout(() => { settingsModal.style.display = 'none'; }, 300);
  }
}

// Localization and fonts setup
const TRANSLATIONS = window.translations;

function applyLanguage(lang) {
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

  document.querySelectorAll('.lang-pill').forEach(pill => {
    pill.classList.toggle('active', pill.id === `lang-btn-${lang}`);
  });

  const arFontToggle = document.getElementById('ar-font-toggle-wrap');
  if (arFontToggle) {
    if (lang === 'ar') {
      arFontToggle.style.display = 'flex';
    } else {
      arFontToggle.style.display = 'none';
      if (arFontToggle.classList.contains('active')) {
        const generalBtn = document.querySelector('.settings-nav-item[data-target="general"]');
        if (generalBtn) generalBtn.click();
      }
    }
  }

  if (typeof STRENGTH_LABELS !== 'undefined') {
    if (lang === 'ar') {
      STRENGTH_LABELS[0] = 'لا يوجد';
      STRENGTH_LABELS[1] = 'ضعيف جداً';
      STRENGTH_LABELS[2] = 'ضعيف';
      STRENGTH_LABELS[3] = 'جيد';
      STRENGTH_LABELS[4] = 'قوي جداً';
    } else {
      STRENGTH_LABELS[0] = 'None';
      STRENGTH_LABELS[1] = 'Too Weak';
      STRENGTH_LABELS[2] = 'Weak';
      STRENGTH_LABELS[3] = 'Good';
      STRENGTH_LABELS[4] = 'Very Strong';
    }
  }

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (TRANSLATIONS && TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
      const hasIcon = el.querySelector('.material-symbols-outlined');
      if (hasIcon) {
        el.childNodes.forEach(child => {
          if (child.nodeType === Node.TEXT_NODE && child.textContent.trim().length > 0) {
            child.textContent = TRANSLATIONS[lang][key];
          }
        });
      } else {
        el.textContent = TRANSLATIONS[lang][key];
      }
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (TRANSLATIONS && TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
      el.setAttribute('placeholder', TRANSLATIONS[lang][key]);
    }
  });

  document.querySelectorAll('[data-i18n-tooltip]').forEach(el => {
    const key = el.getAttribute('data-i18n-tooltip');
    if (TRANSLATIONS && TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
      el.setAttribute('data-tooltip', TRANSLATIONS[lang][key]);
    }
  });

  initPlatformGuardDropdowns();

  const embedTimeVal = document.getElementById('embedTimeVal');
  if (embedTimeVal && embedTimeVal.getAttribute('data-duration')) {
    const duration = parseFloat(embedTimeVal.getAttribute('data-duration'));
    embedTimeVal.textContent = lang === 'ar'
      ? `${duration.toFixed(1)} ملي ثانية`
      : `${duration.toFixed(1)} ms`;
  }
  const embedCompressTimeVal = document.getElementById('embedCompressTimeVal');
  if (embedCompressTimeVal && embedCompressTimeVal.getAttribute('data-duration')) {
    const duration = parseFloat(embedCompressTimeVal.getAttribute('data-duration'));
    embedCompressTimeVal.textContent = lang === 'ar'
      ? `${duration.toFixed(1)} ملي ثانية`
      : `${duration.toFixed(1)} ms`;
  }
  const embedCompressTimeBadge = document.getElementById('embedCompressTimeBadge');
  if (embedCompressTimeBadge) {
    const key = embedCompressTimeBadge.getAttribute('data-i18n');
    if (key && TRANSLATIONS && TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
      embedCompressTimeBadge.textContent = TRANSLATIONS[lang][key];
    }
  }
  const imgEmbedTimeVal = document.getElementById('imgEmbedTimeVal');
  if (imgEmbedTimeVal && imgEmbedTimeVal.getAttribute('data-duration')) {
    const duration = parseFloat(imgEmbedTimeVal.getAttribute('data-duration'));
    imgEmbedTimeVal.textContent = lang === 'ar'
      ? `${duration.toFixed(1)} ملي ثانية`
      : `${duration.toFixed(1)} ms`;
  }
  const imgCompressTimeVal = document.getElementById('imgCompressTimeVal');
  if (imgCompressTimeVal && imgCompressTimeVal.getAttribute('data-duration')) {
    const duration = parseFloat(imgCompressTimeVal.getAttribute('data-duration'));
    imgCompressTimeVal.textContent = lang === 'ar'
      ? `${duration.toFixed(1)} ملي ثانية`
      : `${duration.toFixed(1)} ms`;
  }

  updateVisualMetrics();
}

function applyArabicFont(font) {
  document.documentElement.setAttribute('data-arabic-font', font);
  document.querySelectorAll('.font-pill').forEach(pill => {
    pill.classList.toggle('active', pill.id === `font-btn-${font}`);
  });
}

function copyToExtractTab() {
  const stegoText = document.getElementById('stegoText').value;
  if (!stegoText) return showToast('⚠ No output to send.');
  localStorage.setItem('stegoTextPayload', stegoText);
  const stegoKey = document.getElementById('embedStegoKey').value;
  if (stegoKey) localStorage.setItem('stegoKeyPayload', stegoKey);
  const encKey = document.getElementById('embedEncryptionKey').value;
  if (encKey) localStorage.setItem('stegoEncKeyPayload', encKey);
  showToast('📋 Forwarding to Extraction Page...');
  setTimeout(() => { window.location.href = 'extract.html'; }, 600);
}

// DOM events configuration
document.addEventListener('DOMContentLoaded', () => {
  const settingsBtn = document.getElementById('top-nav-settings');
  const settingsModal = document.getElementById('settings-modal');
  const settingsBackdrop = document.getElementById('settings-modal-backdrop');
  const toggleDarkModeCheck = document.getElementById('toggle-dark-mode');

  coverInput = document.getElementById('embedCover');
  secretInput = document.getElementById('embedSecretMessage');
  hintInput = document.getElementById('embedHint');
  presharedInput = document.getElementById('embedStegoKey');
  sendToExtractBtn = document.getElementById('send-to-extract-btn');
  copyMessageBtn = document.getElementById('copy-message-btn');
  hintPreviewVal = document.getElementById('hint-preview-value');
  strengthLabel = document.getElementById('strength-label');

  strengthBars = [
    document.getElementById('sb-1'),
    document.getElementById('sb-2'),
    document.getElementById('sb-3'),
    document.getElementById('sb-4')
  ];

  const btn = document.getElementById('embed-btn');
  if (btn) {
    btn.addEventListener('click', performEmbedding);
  }

  // Click handler for generate map button
  const btnGenerateMap = document.getElementById('btnGenerateMap');
  if (btnGenerateMap) {
    btnGenerateMap.addEventListener('click', async () => {
      updateVisualMetrics();
      const platformSelect = document.getElementById('guardPlatformSelect');
      const placementSelect = document.getElementById('guardPlacementSelect');

      if (platformSelect && platformSelect.value !== 'none' && !bypassPlatformGuardCheck) {
        const platformKey = platformSelect.value;
        const placementKey = placementSelect ? placementSelect.value : 'none';
        if (placementKey !== 'none' && placementKey) {
          const platformData = PLATFORM_LIMITS[platformKey];
          const placementData = platformData.placements[placementKey];
          const limit = placementData.limit;

          const coverText = coverInput.value;
          const secretMessage = secretInput.value;
          const hintVal = hintInput.value;

          let vsCharsCount = 0;
          if (secretMessage.length > 0 || (hintVal && hintVal.trim())) {
            try {
              const payload = buildPayload(secretMessage || '', hintVal || '');
              const msgBitsLength = bytesToBinary(payload).length;
              vsCharsCount = Math.ceil(msgBitsLength / 8);
            } catch (e) { }
          }

          const fakeCoverText = document.getElementById('embedFakeCover').value.trim();
          const hasFakeCover = fakeCoverText.length > 0;

          let finalLength = vsCharsCount + coverText.length;
          if (hasFakeCover) {
            finalLength = vsCharsCount + fakeCoverText.length;
          }

          if (finalLength > limit) {
            const currentLang = localStorage.getItem('stegoLang') || 'en';
            if (currentLang === 'ar') {
              showToast(`❌ خطأ: تم تجاوز الحد الأقصى للمنصة المستهدفة (${finalLength} / ${limit} حرفاً)!`);
            } else {
              showToast(`❌ Error: Target platform limit exceeded (${finalLength} / ${limit} chars)!`);
            }
            openPlatformWarningModal(platformData, placementData, finalLength, limit);
            return;
          }
        }
      }

      await runEmbeddingPipeline();
    });
  }

  // Warning modal setup
  const warningCancelBtn = document.getElementById('platform-warning-modal-cancel');
  const warningBackdrop = document.getElementById('platform-warning-modal-backdrop');
  const warningProceedBtn = document.getElementById('platform-warning-modal-proceed');
  if (warningCancelBtn && warningBackdrop && warningProceedBtn) {
    warningCancelBtn.addEventListener('click', closePlatformWarningModal);
    warningBackdrop.addEventListener('click', closePlatformWarningModal);
    warningProceedBtn.addEventListener('click', async () => {
      bypassPlatformGuardCheck = true;
      closePlatformWarningModal();
      await runEmbeddingPipeline();
    });
  }

  // Eye password togglers
  const eyeBtn = document.getElementById('eye-toggle-btn');
  if (eyeBtn) {
    eyeBtn.addEventListener('click', () => {
      const input = document.getElementById('embedStegoKey');
      const icon = document.getElementById('eye-icon');
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      icon.textContent = isHidden ? 'visibility_off' : 'visibility';
    });
  }

  const encEyeBtn = document.getElementById('enc-eye-toggle-btn');
  if (encEyeBtn) {
    encEyeBtn.addEventListener('click', () => {
      const input = document.getElementById('embedEncryptionKey');
      const icon = document.getElementById('enc-eye-icon');
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      icon.textContent = isHidden ? 'visibility_off' : 'visibility';
    });
  }

  // Input hooks for metrics
  if (coverInput) coverInput.addEventListener('input', updateVisualMetrics);
  if (secretInput) secretInput.addEventListener('input', updateVisualMetrics);
  if (hintInput) hintInput.addEventListener('input', updateVisualMetrics);
  if (presharedInput) presharedInput.addEventListener('input', updateVisualMetrics);
  const encryptionKeyEl = document.getElementById('embedEncryptionKey');
  if (encryptionKeyEl) encryptionKeyEl.addEventListener('input', updateVisualMetrics);

  // Sharing social platforms click events
  const shares = [
    { id: 'share-whatsapp', url: (t) => `https://wa.me/?text=${encodeURIComponent(t)}`, isLink: true },
    { id: 'share-facebook', url: () => 'https://www.facebook.com/', copyText: 'Copied for Facebook' },
    { id: 'share-instagram', copyText: 'Copied for Instagram' },
    { id: 'share-x', url: (t) => `https://x.com/intent/tweet?text=${encodeURIComponent(t)}`, isLink: true },
    { id: 'share-snapchat', copyText: 'Copied for Snapchat' },
    { id: 'share-messenger', url: (t) => `fb-messenger://share/?link=${encodeURIComponent(t)}`, isLink: true },
    { id: 'share-telegram', url: (t) => `https://t.me/share/url?url=${encodeURIComponent(t)}`, isLink: true },
    { id: 'share-youtube', url: () => 'https://www.youtube.com/', copyText: 'Copied for YouTube' },
    { id: 'share-linkedin', url: () => 'https://www.linkedin.com/', copyText: 'Copied for LinkedIn' },
    { id: 'share-tiktok', url: () => 'https://www.tiktok.com/', copyText: 'Copied for TikTok' },
    { id: 'share-wechat', copyText: 'Copied for WeChat' }
  ];

  shares.forEach(s => {
    const el = document.getElementById(s.id);
    if (el) {
      el.addEventListener('click', () => {
        const t = getShareText();
        if (!t) return;
        if (s.copyText) {
          navigator.clipboard.writeText(t).then(() => {
            showToast('📋 ' + s.copyText);
            if (s.url) window.open(s.url(), '_blank');
          });
        } else if (s.url) {
          window.open(s.url(t), '_blank');
        }
      });
    }
  });

  const imgShares = [
    { id: 'img-share-whatsapp', url: (t) => `https://wa.me/?text=${encodeURIComponent(t)}`, isLink: true },
    { id: 'img-share-facebook', url: () => 'https://www.facebook.com/', copyText: 'Copied for Facebook' },
    { id: 'img-share-instagram', copyText: 'Copied for Instagram' },
    { id: 'img-share-x', url: (t) => `https://x.com/intent/tweet?text=${encodeURIComponent(t)}`, isLink: true },
    { id: 'img-share-snapchat', copyText: 'Copied for Snapchat' },
    { id: 'img-share-messenger', url: (t) => `fb-messenger://share/?link=${encodeURIComponent(t)}`, isLink: true },
    { id: 'img-share-telegram', url: (t) => `https://t.me/share/url?url=${encodeURIComponent(t)}`, isLink: true },
    { id: 'img-share-youtube', url: () => 'https://www.youtube.com/', copyText: 'Copied for YouTube' },
    { id: 'img-share-linkedin', url: () => 'https://www.linkedin.com/', copyText: 'Copied for LinkedIn' },
    { id: 'img-share-tiktok', url: () => 'https://www.tiktok.com/', copyText: 'Copied for TikTok' },
    { id: 'img-share-wechat', copyText: 'Copied for WeChat' }
  ];

  imgShares.forEach(s => {
    const el = document.getElementById(s.id);
    if (el) {
      el.addEventListener('click', () => {
        const t = getImageShareText();
        if (!t) return;
        if (s.copyText) {
          navigator.clipboard.writeText(t).then(() => {
            showToast('📋 ' + s.copyText);
            if (s.url) window.open(s.url(), '_blank');
          });
        } else if (s.url) {
          window.open(s.url(t), '_blank');
        }
      });
    }
  });

  // Settings modal controls hook
  if (settingsBtn && settingsModal) {
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openSettingsModal();
    });
    const settingsCloseBtn = document.getElementById('settings-modal-close');
    if (settingsCloseBtn) settingsCloseBtn.addEventListener('click', closeSettingsModal);
    if (settingsBackdrop) settingsBackdrop.addEventListener('click', closeSettingsModal);
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && settingsModal.classList.contains('active')) closeSettingsModal();
    });

    const modalDarkToggle = document.getElementById('toggle-dark-mode-modal');
    const navDarkToggle = document.getElementById('toggle-dark-mode');
    if (modalDarkToggle && navDarkToggle) {
      modalDarkToggle.addEventListener('change', () => {
        navDarkToggle.checked = modalDarkToggle.checked;
        navDarkToggle.dispatchEvent(new Event('change'));
      });
    }

    const navItems = settingsModal.querySelectorAll('.settings-nav-item');
    const sections = settingsModal.querySelectorAll('.settings-section-content');
    const sectionTitle = document.getElementById('active-section-title');

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const target = item.getAttribute('data-target');
        navItems.forEach(btn => btn.classList.toggle('active', btn === item));
        sections.forEach(sec => sec.classList.toggle('active', sec.id === `section-${target}`));

        if (sectionTitle) {
          const spanText = item.querySelector('span:not(.material-symbols-outlined)').textContent;
          sectionTitle.textContent = spanText;
          const i18nAttr = item.querySelector('span:not(.material-symbols-outlined)').getAttribute('data-i18n');
          if (i18nAttr) sectionTitle.setAttribute('data-i18n', i18nAttr);
          else sectionTitle.removeAttribute('data-i18n');
        }
      });
    });
  }

  // Dom Dark Mode Toggle setup
  if (toggleDarkModeCheck) {
    toggleDarkModeCheck.addEventListener('change', function () {
      const isCurrentlyChecked = this.checked;
      document.documentElement.classList.toggle('dark', isCurrentlyChecked);
      document.documentElement.classList.toggle('light', !isCurrentlyChecked);
      localStorage.setItem('stegoTheme', isCurrentlyChecked ? 'dark' : 'light');
    });
  }

  if (copyMessageBtn) {
    copyMessageBtn.addEventListener('click', () => {
      const textarea = document.getElementById('stegoText');
      if (textarea && textarea.value) {
        navigator.clipboard.writeText(textarea.value).then(() => {
          showToast('📋 Copied to Clipboard!');
        });
      }
    });
  }

  if (sendToExtractBtn) {
    sendToExtractBtn.addEventListener('click', copyToExtractTab);
  }

  // Smooth scroll and focus on Advanced Settings when opened
  const advancedDetails = document.querySelector('.advanced-settings-details');
  if (advancedDetails) {
    advancedDetails.addEventListener('toggle', function () {
      if (this.open) {
        setTimeout(() => {
          this.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }
    });
  }

  // Setup Language and Font from Storage
  const initLang = localStorage.getItem('stegoLang') || 'en';
  applyLanguage(initLang);
  const initFont = localStorage.getItem('stegoFont') || 'thmanyah';
  applyArabicFont(initFont);
});
