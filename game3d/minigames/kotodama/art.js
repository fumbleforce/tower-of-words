// The machines, the things they put out and Tama, drawn as flat-shaded SVG in the game's look:
// two or three tones per surface, light from the upper left, no outlines.

const svg = (vb, body, cls = '') => `<svg class="${cls}" viewBox="${vb}" aria-hidden="true">${body}</svg>`;

/** B2's vending machine: white body, blue band, lit display of cans, the tray at the bottom. */
export const vend = () =>
  svg('0 0 100 180', `
  <rect x="4" y="4" width="92" height="172" rx="6" fill="#c7d2dc"/>
  <rect x="4" y="4" width="84" height="172" rx="6" fill="#eef3f7"/>
  <rect x="4" y="4" width="84" height="16" rx="6" fill="#2f62d6"/>
  <rect x="4" y="14" width="84" height="6" fill="#2f62d6"/>
  <rect x="12" y="26" width="68" height="58" rx="3" fill="#13202c"/>
  <rect x="12" y="26" width="68" height="58" rx="3" fill="url(#vendGlow)"/>
  ${[0, 1, 2, 3].map(i => `<g transform="translate(${18 + i * 16} 34)"><rect width="10" height="18" rx="2" fill="${['#e0393e', '#24315e', '#e0393e', '#24315e'][i]}"/><rect y="7" width="10" height="4" fill="${['#fff', '#e8d9b5', '#fff', '#e8d9b5'][i]}" opacity=".85"/></g>`).join('')}
  ${[0, 1, 2, 3].map(i => `<g transform="translate(${18 + i * 16} 60)"><rect width="10" height="18" rx="2" fill="${['#7cbf8e', '#f0f0f0', '#7cbf8e', '#e0393e'][i]}"/><rect y="5" width="10" height="5" fill="#fff" opacity=".5"/></g>`).join('')}
  ${[0, 1, 2, 3].map(i => `<circle cx="${23 + i * 16}" cy="56" r="2" fill="#6fe3a0"/>`).join('')}
  <rect x="12" y="92" width="44" height="8" rx="2" fill="#d5dde4"/>
  <rect x="64" y="90" width="16" height="22" rx="2" fill="#d5dde4"/>
  <rect x="70" y="94" width="4" height="10" rx="1" fill="#41505e"/>
  <rect x="12" y="140" width="68" height="24" rx="3" fill="#1c2731"/>
  <rect x="14" y="142" width="64" height="7" rx="2" fill="#2a3845"/>
  <defs><linearGradient id="vendGlow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe9ff" stop-opacity=".35"/><stop offset="1" stop-color="#bfe9ff" stop-opacity=".05"/></linearGradient></defs>`, 'm-art');

/** The kitchenette's electric thermos pot (ポット), on its bit of counter. */
export const pot = () =>
  svg('0 0 100 140', `
  <rect x="0" y="104" width="100" height="36" rx="3" fill="#56687a"/>
  <rect x="0" y="104" width="100" height="6" rx="2" fill="#8aa0b4"/>
  <ellipse cx="50" cy="104" rx="30" ry="5" fill="#000" opacity=".25"/>
  <rect x="22" y="38" width="56" height="66" rx="14" fill="#cdd6de"/>
  <rect x="22" y="38" width="48" height="66" rx="14" fill="#f2f5f8"/>
  <rect x="18" y="26" width="64" height="18" rx="8" fill="#9aa8b5"/>
  <rect x="18" y="26" width="56" height="14" rx="7" fill="#b9c5cf"/>
  <rect x="40" y="18" width="20" height="10" rx="4" fill="#7c8a97"/>
  <path d="M78 46 q14 -2 16 10 l-6 2 q-2 -6 -10 -5z" fill="#9aa8b5"/>
  <rect x="34" y="58" width="24" height="14" rx="3" fill="#1d2a36"/>
  <text x="46" y="68.5" font-size="8" text-anchor="middle" fill="#7ff0d8" font-family="monospace">98°</text>
  <circle cx="40" cy="84" r="4" fill="#e56a5a"/><circle cx="52" cy="84" r="4" fill="#5fb7e6"/>`, 'm-art');

/** The kitchenette fridge: pale green, two doors, a note stuck on it. */
export const fridge = () =>
  svg('0 0 100 180', `
  <rect x="6" y="4" width="88" height="172" rx="7" fill="#a9c7bd"/>
  <rect x="6" y="4" width="80" height="172" rx="7" fill="#d4e8e0"/>
  <rect x="6" y="62" width="88" height="4" fill="#94b3a8"/>
  <rect x="72" y="20" width="5" height="30" rx="2" fill="#7f9c91"/>
  <rect x="72" y="76" width="5" height="44" rx="2" fill="#7f9c91"/>
  <rect x="16" y="16" width="22" height="22" fill="#fff4a8" transform="rotate(-6 27 27)"/>
  <rect x="19" y="22" width="15" height="2" fill="#c9b85a" transform="rotate(-6 27 27)"/>
  <rect x="19" y="27" width="11" height="2" fill="#c9b85a" transform="rotate(-6 27 27)"/>
  <circle cx="26" cy="15" r="3" fill="#e0393e"/>
  <rect x="12" y="168" width="76" height="8" rx="2" fill="#5d7a70"/>`, 'm-art');

/** The things the machines put out. */
export const ITEMS = {
  cola: () => svg('0 0 40 56', `<rect x="8" y="6" width="24" height="46" rx="4" fill="#b8252b"/><rect x="8" y="6" width="19" height="46" rx="4" fill="#e0393e"/><path d="M8 30 q10 -10 24 -4 v6 q-12 -6 -24 4z" fill="#fff"/><rect x="10" y="3" width="20" height="5" rx="2" fill="#c9d2da"/><rect x="11" y="10" width="3" height="16" rx="1.5" fill="#fff" opacity=".35"/>`, 'it'),
  coffee: () => svg('0 0 40 56', `<rect x="10" y="10" width="20" height="42" rx="3" fill="#18213f"/><rect x="10" y="10" width="16" height="42" rx="3" fill="#24315e"/><rect x="10" y="24" width="20" height="10" fill="#e8d9b5"/><circle cx="20" cy="29" r="3" fill="#24315e"/><rect x="12" y="6" width="16" height="5" rx="2" fill="#c9d2da"/><rect x="13" y="13" width="3" height="9" rx="1.5" fill="#fff" opacity=".3"/>`, 'it'),
  tea: () => svg('0 0 48 48', `<path d="M8 16 h32 l-3 26 q-1 4 -5 4 h-16 q-4 0 -5 -4z" fill="#5e9c70"/><path d="M8 16 h26 l-3 26 q-1 4 -5 4 h-10 q-4 0 -5 -4z" fill="#7cbf8e"/><ellipse cx="24" cy="16" rx="16" ry="4" fill="#b6d77a"/><path d="M18 9 q3 -4 0 -7 M26 10 q3 -4 0 -8" stroke="#fff" stroke-width="2" fill="none" opacity=".6" stroke-linecap="round"/>`, 'it'),
  milk: () => svg('0 0 40 56', `<path d="M8 18 l12 -10 l12 10 v34 h-24z" fill="#cfd8e2"/><path d="M8 18 l12 -10 l6 5 v39 h-18z" fill="#fbfdff"/><rect x="8" y="30" width="24" height="12" fill="#3d7be0"/><rect x="8" y="30" width="18" height="12" fill="#5590ef"/><rect x="18" y="4" width="4" height="6" fill="#cfd8e2"/>`, 'it'),
  pudding: () => svg('0 0 48 48', `<ellipse cx="24" cy="42" rx="20" ry="4" fill="#dfe6ec"/><path d="M12 40 l4 -24 h16 l4 24z" fill="#e8b83f"/><path d="M12 40 l4 -24 h10 l-2 24z" fill="#f6cf5a"/><path d="M16 16 h16 l-1 6 q-7 3 -14 0z" fill="#9c5a2a"/><ellipse cx="24" cy="16" rx="8" ry="2.5" fill="#b8703a"/>`, 'it'),
};

/** Tama, a calico cat, sitting. */
export const cat = () =>
  svg('0 0 80 80', `
  <ellipse cx="40" cy="74" rx="24" ry="4" fill="#000" opacity=".25"/>
  <path d="M60 66 q14 -2 12 -16" stroke="#2b2b30" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M20 72 q-2 -30 20 -32 q22 2 20 32z" fill="#f4efe6"/>
  <path d="M40 40 q16 2 19 22 q-10 -4 -14 -14z" fill="#e8954a"/>
  <path d="M22 60 q2 -10 10 -14 q-2 12 -10 14z" fill="#2b2b30"/>
  <circle cx="40" cy="30" r="15" fill="#f4efe6"/>
  <path d="M27 22 l2 -14 l9 9z" fill="#e8954a"/><path d="M53 22 l-2 -14 l-9 9z" fill="#2b2b30"/>
  <path d="M40 16 q12 0 14 12 q-8 -2 -14 -10z" fill="#e8954a"/>
  <ellipse cx="34" cy="30" rx="2" ry="3" fill="#2b2b30" class="eye"/><ellipse cx="46" cy="30" rx="2" ry="3" fill="#2b2b30" class="eye"/>
  <path d="M38 35 l2 2 l2 -2" stroke="#c2707a" stroke-width="1.5" fill="none"/>`, 'cat-art');

export const MACHINE_ART = { vend, pot, fridge };

/** The wall clock, set to a shift's hour. */
export function clock(hour) {
  const a = ((hour % 12) / 12) * 360;
  return svg('0 0 60 60', `<circle cx="30" cy="30" r="27" fill="#d9e1e8"/><circle cx="30" cy="30" r="23" fill="#f5f8fa"/>
  ${Array.from({ length: 12 }, (_, i) => `<rect x="29" y="9" width="2" height="${i % 3 ? 3 : 5}" fill="#5b6a78" transform="rotate(${i * 30} 30 30)"/>`).join('')}
  <rect class="hh" x="28.5" y="16" width="3" height="15" rx="1.5" fill="#26313c" transform="rotate(${a} 30 30)"/>
  <rect class="mh" x="29.25" y="10" width="1.5" height="21" rx=".75" fill="#26313c"/>
  <circle cx="30" cy="30" r="2.5" fill="#e0393e"/>`, 'clock');
}
