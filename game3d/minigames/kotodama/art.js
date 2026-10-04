// The things the machines put out, Tama and the wall clock, drawn as flat-shaded SVG in the game's look:
// two or three tones per surface, light from the upper left, no outlines. The machines are machines.js.

const svg = (vb, body, cls = '') => `<svg class="${cls}" viewBox="${vb}" aria-hidden="true">${body}</svg>`;

/** The things the machines put out. */
export const ITEMS = {
  cola: () => svg('0 0 40 56', `<ellipse cx="20" cy="51" rx="12" ry="3" fill="#8f1c22"/><rect x="8" y="8" width="24" height="43" rx="3" fill="#b8252b"/><rect x="8" y="8" width="18" height="43" rx="3" fill="#e0393e"/>
    <path d="M8 31 q8 -9 24 -5 v5 q-13 -4 -24 6z" fill="#fff"/><path d="M8 37 q10 -8 24 -3 v2 q-12 -4 -24 4z" fill="#ffd0d2" opacity=".7"/>
    <rect x="9" y="4" width="22" height="6" rx="3" fill="#aab6bf"/><rect x="9" y="4" width="17" height="4" rx="2" fill="#e3e9ee"/><rect x="11" y="12" width="3" height="15" rx="1.5" fill="#fff" opacity=".4"/>`, 'it'),
  coffee: () => svg('0 0 40 56', `<ellipse cx="20" cy="51" rx="10" ry="2.6" fill="#0f1630"/><rect x="10" y="9" width="20" height="42" rx="3" fill="#18213f"/><rect x="10" y="9" width="15" height="42" rx="3" fill="#2a3a6e"/>
    <rect x="10" y="22" width="20" height="12" fill="#c9b48a"/><rect x="10" y="22" width="15" height="12" fill="#efe2c4"/><ellipse cx="18" cy="28" rx="3.2" ry="4" fill="#6b3d22"/><path d="M18 24.5 q-1.5 3.5 0 7" stroke="#efe2c4" stroke-width="1" fill="none"/>
    <rect x="10.5" y="5" width="19" height="5" rx="2.5" fill="#aab6bf"/><rect x="10.5" y="5" width="14" height="3.5" rx="1.7" fill="#e3e9ee"/><rect x="12.5" y="12" width="2.5" height="8" rx="1.2" fill="#fff" opacity=".35"/><rect x="12.5" y="37" width="2.5" height="10" rx="1.2" fill="#fff" opacity=".25"/>`, 'it'),
  tea: () => svg('0 0 48 48', `<ellipse cx="24" cy="44" rx="15" ry="2.5" fill="#000" opacity=".2"/><path d="M9 17 h30 l-3 23 q-1 4 -5 4 h-14 q-4 0 -5 -4z" fill="#4f8a62"/><path d="M9 17 h24 l-3 23 q-1 4 -5 4 h-8 q-4 0 -5 -4z" fill="#79b98a"/>
    <path d="M10 26 h28 l-.6 4 h-26.8z" fill="#3f7552"/><path d="M10 26 h22 l-.5 4 h-21z" fill="#5d9c72"/>
    <ellipse cx="24" cy="17" rx="15" ry="3.6" fill="#a9d36e"/><ellipse cx="22" cy="16.6" rx="9" ry="1.6" fill="#c6e597"/>
    <path class="it-steam" d="M18 11 q-3 -3 0 -6 q3 -3 0 -5 M27 11 q-3 -3 0 -6 q3 -3 0 -5" stroke="#fff" stroke-width="2" fill="none" opacity=".65" stroke-linecap="round"/>`, 'it'),
  milk: () => svg('0 0 40 56', `<path d="M8 18 l12 -10 l12 10 v34 h-24z" fill="#c7d2dd"/><path d="M8 18 l12 -10 l5 4 v40 h-17z" fill="#fbfdff"/><path d="M8 18 l12 -10 v4 l-12 10z" fill="#e8eef4"/>
    <rect x="8" y="29" width="24" height="13" fill="#2f69c9"/><rect x="8" y="29" width="17" height="13" fill="#4f8cec"/><path d="M12 34 q3 -3 6 0 q-1 4 -6 2z" fill="#fff"/><circle cx="21" cy="36" r="1.6" fill="#fff"/>
    <rect x="17.5" y="3" width="5" height="6" fill="#c7d2dd"/><rect x="10" y="44" width="2.5" height="6" rx="1.2" fill="#fff" opacity=".6"/>`, 'it'),
  pudding: () => svg('0 0 48 48', `<ellipse cx="24" cy="42" rx="20" ry="4.5" fill="#bcc8d2"/><ellipse cx="24" cy="41" rx="20" ry="3.6" fill="#eef3f7"/>
    <path d="M12 40 l4 -23 h16 l4 23z" fill="#e2a93a"/><path d="M12 40 l4 -23 h11 l-1.5 23z" fill="#f6cf5a"/>
    <path d="M16 17 h16 l-.6 5 q-2 3 -3 0 q-2 4 -4 0 q-2 3 -4 0 q-2 4 -4 -1z" fill="#8f4f22"/><ellipse cx="24" cy="17" rx="8" ry="2.4" fill="#b8703a"/><ellipse cx="22" cy="16.6" rx="3.5" ry=".9" fill="#e0a06a"/>
    <rect x="15.5" y="25" width="2" height="10" rx="1" fill="#fff" opacity=".45"/>`, 'it'),
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

/** The wall clock, set to a shift's hour. */
export function clock(hour) {
  const a = ((hour % 12) / 12) * 360;
  return svg('0 0 60 60', `<circle cx="30" cy="30" r="27" fill="#d9e1e8"/><circle cx="30" cy="30" r="23" fill="#f5f8fa"/>
  ${Array.from({ length: 12 }, (_, i) => `<rect x="29" y="9" width="2" height="${i % 3 ? 3 : 5}" fill="#5b6a78" transform="rotate(${i * 30} 30 30)"/>`).join('')}
  <rect class="hh" x="28.5" y="16" width="3" height="15" rx="1.5" fill="#26313c" transform="rotate(${a} 30 30)"/>
  <rect class="mh" x="29.25" y="10" width="1.5" height="21" rx=".75" fill="#26313c"/>
  <circle cx="30" cy="30" r="2.5" fill="#e0393e"/>`, 'clock');
}
