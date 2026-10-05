// B2's machines, drawn as flat-shaded SVG in the game's look (two or three tones per surface, light
// from the upper left, no outlines), each with small idle motions (kotodama.css, "machines") and a
// dispense played by fireMachine() when a command lands. Every drawing marks where its things come
// out with an invisible .mouth.

import { ms } from './fx.js';

const svg = (vb, body, cls) => `<svg class="m-art ${cls}" viewBox="${vb}" aria-hidden="true">${body}</svg>`;

/* ---------- じはんき: a red street vending machine with a lit sign, two shelves of drinks and the tray ---------- */

const can = (x, y, body, band, mark) => `<g transform="translate(${x} ${y})">
  <rect width="13" height="21" rx="2.5" fill="${body}"/><rect x="9" width="4" height="21" rx="2" fill="#000" opacity=".18"/>
  <rect x="1" y="-1.5" width="11" height="3" rx="1.5" fill="#d9e2e9"/>
  <rect y="8" width="13" height="6" fill="${band}"/>${mark || ''}
  <rect x="2" y="3" width="2" height="15" rx="1" fill="#fff" opacity=".35"/></g>`;
const bottle = (x, y, body, label, cap) => `<g transform="translate(${x} ${y})">
  <rect x="4" y="-2" width="5" height="3" rx="1" fill="${cap}"/><path d="M4 1 h5 l3 5 v15 q0 2 -2 2 h-7 q-2 0 -2 -2 v-15z" fill="${body}"/>
  <rect x="1" y="10" width="11" height="7" fill="${label}"/><rect x="9" y="6" width="3" height="15" fill="#000" opacity=".12"/>
  <rect x="2.5" y="6" width="1.8" height="13" rx=".9" fill="#fff" opacity=".45"/></g>`;
const slot = (x, y, i) => `<g transform="translate(${x} ${y})">
  <rect width="15" height="5" rx="1" fill="#16212b"/><text x="7.5" y="4" font-size="4.2" text-anchor="middle" fill="#e9f1f7" font-family="system-ui, sans-serif" font-weight="700">${[130, 130, 150, 120, 160, 110, 150, 130][i]}</text>
  <rect x="2" y="6.5" width="11" height="4.5" rx="2.2" fill="#e9eef2"/><rect class="vm-led" style="animation-delay:${(i * 0.32).toFixed(2)}s" x="4.5" y="7.7" width="6" height="2.1" rx="1" fill="#46e08a"/></g>`;

export const vend = () =>
  svg('0 0 122 212', `
  <defs>
    <linearGradient id="vmBack" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6fbff"/><stop offset="1" stop-color="#b6d3e8"/></linearGradient>
    <linearGradient id="vmSign" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e7eef4"/></linearGradient>
  </defs>
  <ellipse cx="60" cy="206" rx="58" ry="5" fill="#000" opacity=".35"/>
  <path d="M102 6 l12 6 v188 l-12 4z" fill="#97212a"/>
  <rect x="6" y="4" width="96" height="200" rx="6" fill="#c92d36"/>
  <path d="M12 4 h22 v200 h-22 q-6 0 -6 -6 v-188 q0 -6 6 -6z" fill="#d9414a"/>
  <rect x="6" y="4" width="96" height="5" rx="2.5" fill="#ec6a70"/>
  <g class="vm-sign"><rect x="13" y="12" width="82" height="20" rx="3" fill="url(#vmSign)"/>
    <path d="M17 27 q10 -11 22 -5 q8 4 18 -2 l0 5 q-9 6 -18 1 q-12 -6 -22 5z" fill="#d9414a"/>
    <text x="76" y="21" font-size="7.5" text-anchor="middle" fill="#2858c4" font-family="system-ui, sans-serif" font-weight="800" letter-spacing=".5">COLD</text>
    <text x="76" y="28.5" font-size="5" text-anchor="middle" fill="#c92d36" font-family="system-ui, sans-serif" font-weight="800">つめた〜い</text></g>
  <rect x="13" y="36" width="82" height="90" rx="3" fill="#101b25"/>
  <rect class="vm-back" x="16" y="39" width="76" height="84" rx="1.5" fill="url(#vmBack)"/>
  ${can(19, 45, '#e0393e', '#fff', '<path d="M0 11 q6 -3 13 0" stroke="#e0393e" stroke-width="1.2" fill="none"/>')}${can(37, 45, '#22305c', '#e8d9b5', '<circle cx="6.5" cy="11" r="2" fill="#22305c"/>')}${can(55, 45, '#3c8f5a', '#e6f2d8')}${can(73, 45, '#f08a24', '#fff3d6')}
  <rect x="16" y="67" width="76" height="2.5" fill="#7d93a6"/>
  ${[0, 1, 2, 3].map(i => slot(18 + i * 18, 70, i)).join('')}
  ${bottle(20, 88, '#ead6b1', '#8a5a34', '#a4683c')}${bottle(38, 88, '#d6ecf8', '#3d86d6', '#3d86d6')}${bottle(56, 88, '#7cbf8e', '#2f6a42', '#f2f5f7')}${bottle(74, 88, '#f6f1e4', '#d9414a', '#d9414a')}
  <rect x="16" y="110" width="76" height="2.5" fill="#7d93a6"/>
  ${[0, 1, 2, 3].map(i => slot(18 + i * 18, 112, i + 4)).join('')}
  <path d="M16 39 h22 l-16 84 h-6z" fill="#fff" opacity=".13"/><path d="M44 39 h6 l-16 84 h-6z" fill="#fff" opacity=".08"/>
  <rect x="13" y="130" width="82" height="30" rx="3" fill="#a9242c"/>
  <rect x="18" y="134" width="30" height="12" rx="2" fill="#0d1d16"/>
  <text class="vm-lcd" x="33" y="143" font-size="8" text-anchor="middle" fill="#7cf7b2" font-family="ui-monospace, monospace" font-weight="700">¥130</text>
  <circle cx="26" cy="153" r="3.2" fill="#e9eef2"/><circle cx="25.2" cy="152.2" r="1.2" fill="#fff"/>
  <rect x="34" y="150" width="14" height="6" rx="2" fill="#141a1f"/>
  <rect x="56" y="134" width="14" height="22" rx="2.5" fill="#d3dbe1"/><rect x="56" y="134" width="5" height="22" rx="2" fill="#eef3f6"/>
  <rect x="62" y="138" width="2.4" height="11" rx="1.2" fill="#1a2228"/>
  <rect x="74" y="135" width="17" height="9" rx="2" fill="#1a252f"/><rect x="76" y="138.5" width="13" height="2" rx="1" fill="#55636e"/>
  <path class="vm-bill" d="M80 147 l2.5 3 l2.5 -3z" fill="#46e08a"/>
  <rect x="13" y="164" width="82" height="32" rx="4" fill="#a9242c"/>
  <rect x="18" y="168" width="72" height="24" rx="3" fill="#120a0c"/>
  <g class="vm-drop" opacity="0"><rect x="44" y="181" width="20" height="10" rx="2.5" fill="#e0393e"/><rect x="44" y="184" width="20" height="3.5" fill="#fff"/><rect x="62" y="182" width="2" height="8" rx="1" fill="#d9e2e9"/></g>
  <g class="vm-flap"><rect x="18" y="168" width="72" height="20" rx="3" fill="#2f3c47" opacity=".94"/><rect x="18" y="168" width="72" height="4" rx="2" fill="#4c5a66"/>
    <text x="54" y="182" font-size="5.5" text-anchor="middle" fill="#9fb0bd" font-family="system-ui, sans-serif" font-weight="700" letter-spacing="1">PUSH</text></g>
  <rect x="10" y="198" width="88" height="6" rx="2" fill="#3b1519"/>
  <rect class="mouth" x="40" y="172" width="28" height="18" fill="none"/>`, 'vend-art');

/* ---------- ポット: the kitchenette's electric thermos pot on its bit of counter, a mug under the spout ---------- */

const flower = (x, y) => `<g transform="translate(${x} ${y})" fill="#fff" opacity=".9">${[0, 72, 144, 216, 288].map(a => `<circle cx="${(Math.sin((a * Math.PI) / 180) * 2.3).toFixed(2)}" cy="${(-Math.cos((a * Math.PI) / 180) * 2.3).toFixed(2)}" r="1.5"/>`).join('')}<circle r="1.1" fill="#f2c94c"/></g>`;

export const pot = () =>
  svg('0 0 112 150', `
  <rect x="0" y="118" width="112" height="32" rx="2" fill="#435565"/>
  <rect x="0" y="112" width="112" height="9" rx="2" fill="#8ea2b4"/><rect x="0" y="112" width="112" height="3" rx="1.5" fill="#b3c3d0"/>
  <ellipse cx="62" cy="113" rx="32" ry="4" fill="#000" opacity=".22"/>
  <path class="pot-stream" d="M15 46 v58" stroke="#a9defa" stroke-width="3.2" stroke-linecap="round" fill="none" opacity="0"/>
  <path d="M34 36 q-6 -26 28 -28 q34 2 28 28" stroke="#77889a" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <rect x="34" y="40" width="58" height="72" rx="12" fill="#d6d1c5"/>
  <rect x="34" y="40" width="48" height="72" rx="12" fill="#f5f2ea"/>
  <rect x="34" y="94" width="58" height="13" fill="#4f9a86"/><rect x="34" y="94" width="48" height="13" fill="#6fb8a2"/>
  ${flower(44, 100.5)}${flower(58, 100.5)}${flower(72, 100.5)}
  <rect x="30" y="30" width="66" height="15" rx="7" fill="#93a3b2"/><rect x="30" y="30" width="56" height="12" rx="6" fill="#b9c6d1"/>
  <path d="M30 37 h-12 q-5 0 -5 5 v4 h6 v-3 h11z" fill="#93a3b2"/><path d="M30 37 h-12 q-5 0 -5 5 v1 h17z" fill="#b9c6d1"/>
  <rect x="36" y="18" width="54" height="14" rx="7" fill="#a6b5c2"/><rect x="36" y="18" width="44" height="11" rx="5.5" fill="#cbd5de"/>
  <g class="pot-pump"><rect x="52" y="9" width="22" height="11" rx="4.5" fill="#d8642c"/><rect x="52" y="9" width="18" height="8" rx="4" fill="#f08a4b"/><path d="M59 12.5 h8 l-4 4z" fill="#fff" opacity=".85"/></g>
  <rect x="39" y="50" width="7" height="38" rx="3.5" fill="#c5d1da"/>
  <rect class="pot-water" x="40" y="62" width="5" height="25" rx="2.5" fill="#5fb3e6"/>
  <circle class="pot-float" cx="42.5" cy="62" r="2.6" fill="#e65a4a"/>
  <rect x="52" y="52" width="32" height="34" rx="5" fill="#26323d"/><rect x="52" y="52" width="32" height="5" rx="2.5" fill="#33414d"/>
  <rect x="55.5" y="56" width="25" height="12" rx="2" fill="#0e231e"/>
  <text x="66" y="65.5" font-size="8.5" text-anchor="middle" fill="#7ff0d8" font-family="ui-monospace, monospace" font-weight="700">98°</text>
  <circle class="pot-warm" cx="60" cy="74" r="2.4" fill="#ffa040"/><circle cx="68" cy="74" r="2.4" fill="#5a2c2c"/><circle cx="76" cy="74" r="2.4" fill="#2c4a5a"/>
  <rect x="57" y="79" width="22" height="4.5" rx="2.2" fill="#5fb7e6"/>
  <g class="pot-steam" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round">
    <path class="s1" d="M80 16 q-4 -5 0 -9 q4 -4 0 -8" opacity=".55"/><path class="s2" d="M86 14 q-4 -5 0 -9 q4 -4 0 -8" opacity=".45"/></g>
  <g class="pot-mug"><path d="M24 98 q9 -1 8 7 q-1 6 -8 5" stroke="#cfd8df" stroke-width="3" fill="none"/>
    <rect x="4" y="96" width="22" height="18" rx="4" fill="#d6dfe6"/><rect x="4" y="96" width="17" height="18" rx="4" fill="#f2f6f9"/>
    <rect x="4" y="102" width="22" height="4" fill="#5fb7a7"/><ellipse cx="15" cy="96.5" rx="11" ry="2.4" fill="#9fb0bd"/>
    <ellipse class="pot-tea" cx="15" cy="96.8" rx="9.5" ry="1.8" fill="#9cc65a" opacity="0"/></g>
  <rect class="mouth" x="4" y="88" width="22" height="18" fill="none"/>`, 'pot-art');

/* ---------- れいぞうこ: a mint two-door fridge covered in notes, Tama's photo on it ---------- */

export const fridge = () =>
  svg('0 0 112 204', `
  <ellipse cx="54" cy="199" rx="54" ry="5" fill="#000" opacity=".35"/>
  <g class="fr-hum">
  <path d="M96 9 l11 6 v178 l-11 4z" fill="#7aa294"/>
  <rect x="6" y="6" width="92" height="192" rx="11" fill="#a9cfc0"/>
  <path d="M17 6 h14 v192 h-14 q-11 0 -11 -11 v-170 q0 -11 11 -11z" fill="#c4e3d6"/>
  <rect x="11" y="11" width="82" height="50" rx="8" fill="#cfeadf"/><rect x="11" y="11" width="82" height="4" rx="2" fill="#e2f4ec"/>
  <rect x="83" y="22" width="5" height="26" rx="2.5" fill="#dfe7ec"/><rect x="85.5" y="22" width="2.5" height="26" rx="1.2" fill="#aab8c1"/>
  <rect x="44" y="15" width="16" height="4" rx="2" fill="#e8eef1"/>
  <g class="fr-note"><rect x="20" y="22" width="22" height="22" fill="#fff1a1" transform="rotate(-6 31 33)"/>
    <path d="M23 30 h14 M23 35 h10 M23 40 h12" stroke="#c4ae4e" stroke-width="1.6" transform="rotate(-6 31 33)"/>
    <circle cx="30" cy="21" r="3" fill="#e0393e"/><circle cx="29.2" cy="20.2" r="1" fill="#fff" opacity=".6"/></g>
  <rect x="9" y="62" width="86" height="4" fill="#89b0a2"/>
  <g class="fr-inside"><rect x="11" y="68" width="82" height="118" rx="6" fill="#fff6dd"/>
    <rect x="11" y="68" width="82" height="9" rx="4" fill="#fffbee"/>
    <rect x="11" y="106" width="82" height="3" fill="#d9e2e6"/><rect x="11" y="146" width="82" height="3" fill="#d9e2e6"/>
    <g transform="translate(24 80)"><path d="M0 8 l7 -7 l7 7 v18 h-14z" fill="#f4f8fb"/><rect y="13" width="14" height="7" fill="#3d7be0"/><rect x="5" y="-3" width="4" height="4" fill="#cfd8e2"/></g>
    <g transform="translate(46 90)"><rect width="10" height="16" rx="2" fill="#7cbf8e"/><rect x="3" y="-3" width="4" height="3" fill="#2f6a42"/></g>
    <g transform="translate(26 128)"><path d="M0 18 l3 -14 h12 l3 14z" fill="#f2c94c"/><path d="M3 4 h12 l-1 4 q-5 2 -10 0z" fill="#9c5a2a"/></g>
    <g transform="translate(52 128)"><path d="M0 18 l3 -14 h12 l3 14z" fill="#f2c94c"/><path d="M3 4 h12 l-1 4 q-5 2 -10 0z" fill="#9c5a2a"/></g>
    <rect x="14" y="160" width="76" height="20" rx="3" fill="#e5eef1"/></g>
  <g class="fr-door"><rect x="11" y="68" width="82" height="118" rx="8" fill="#cfeadf"/><rect x="11" y="68" width="82" height="4" rx="2" fill="#e2f4ec"/>
    <rect x="83" y="78" width="5" height="44" rx="2.5" fill="#dfe7ec"/><rect x="85.5" y="78" width="2.5" height="44" rx="1.2" fill="#aab8c1"/>
    <g transform="rotate(5 38 98)"><rect x="24" y="80" width="28" height="32" fill="#fbfbf8"/><rect x="27" y="83" width="22" height="20" fill="#7fb3d9"/>
      <ellipse cx="38" cy="100" rx="8" ry="5.5" fill="#f4efe6"/><circle cx="38" cy="93" r="5" fill="#f4efe6"/><path d="M33 91 l1 -5 l3 3z" fill="#e8954a"/><path d="M43 91 l-1 -5 l-3 3z" fill="#2b2b30"/>
      <circle cx="36" cy="93" r=".9" fill="#2b2b30"/><circle cx="40" cy="93" r=".9" fill="#2b2b30"/></g>
    <circle cx="38" cy="79.5" r="2.6" fill="#3d7be0"/>
    <g transform="rotate(-4 66 140)"><rect x="54" y="124" width="24" height="32" fill="#fff"/><rect x="54" y="124" width="24" height="6" fill="#f08a4b"/>
      <path d="M57 135 h16 M57 140 h12 M57 145 h15 M57 150 h9" stroke="#b9c4cc" stroke-width="1.5"/></g>
    <circle cx="66" cy="123" r="2.6" fill="#46b07c"/>
    <rect x="22" y="160" width="20" height="10" rx="5" fill="#ffd36b"/><text x="32" y="167.5" font-size="5.5" text-anchor="middle" fill="#6b4a12" font-family="system-ui, sans-serif" font-weight="800">タマ×</text></g>
  <rect x="14" y="188" width="76" height="7" rx="2" fill="#5d7a70"/>
  ${[0, 1, 2, 3, 4, 5, 6].map(i => `<rect x="${20 + i * 10}" y="190" width="6" height="2.5" rx="1" fill="#3e554d"/>`).join('')}
  <circle class="fr-led" cx="86" cy="191.3" r="1.5" fill="#6fe3ff"/>
  </g>
  <g class="fr-mist" fill="#e8f7ff">${[[30, 120, 6], [52, 150, 8], [76, 110, 5], [64, 170, 6], [40, 176, 7]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" opacity="0"/>`).join('')}</g>
  <rect class="mouth" x="30" y="110" width="44" height="40" fill="none"/>`, 'fridge-art');

export const MACHINE_ART = { vend, pot, fridge };

/* ---------- the dispense: what each machine does when a command lands ---------- */

const play = (root, sel, frames, opts) => {
  const out = [];
  for (const e of root.querySelectorAll(sel)) out.push(e.animate(frames, { duration: ms(opts.duration), delay: ms(opts.delay || 0), easing: opts.easing || 'ease-in-out', fill: 'none', iterations: opts.iterations || 1 }));
  return out;
};

const FIRE = {
  vend: m => {
    play(m, '.vm-back', [{ filter: 'none' }, { filter: 'brightness(1.35)' }, { filter: 'none' }], { duration: 500 });
    play(m, '.vm-led', [{ opacity: 1, fill: '#fff' }, { opacity: 0.2 }, { opacity: 1, fill: '#fff' }, { opacity: 1 }], { duration: 420 });
    play(m, '.vm-sign', [{ opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }], { duration: 300, iterations: 2 });
    // The can drops with a clunk, then the flap swings up as it is taken out.
    play(m, '.vend-art', [{ transform: 'none' }, { transform: 'translateY(1.5%) scale(1.02, .98)', offset: 0.35 }, { transform: 'none' }], { duration: 300, delay: 160, easing: 'ease-out' });
    play(m, '.vm-drop', [{ opacity: 0, transform: 'translateY(-14px)' }, { opacity: 1, transform: 'none', offset: 0.25 }, { opacity: 1, transform: 'none', offset: 0.6 }, { opacity: 0, transform: 'none' }], { duration: 900, delay: 120, easing: 'ease-in' });
    play(m, '.vm-flap', [{ transform: 'none' }, { transform: 'none', offset: 0.3 }, { transform: 'scaleY(.2)', offset: 0.5 }, { transform: 'scaleY(.2)', offset: 0.75 }, { transform: 'none' }], { duration: 1000, easing: 'ease-out' });
    return 420;
  },
  pot: m => {
    play(m, '.pot-pump', [{ transform: 'none' }, { transform: 'translateY(4px)', offset: 0.2 }, { transform: 'translateY(4px)', offset: 0.7 }, { transform: 'none' }], { duration: 900 });
    play(m, '.pot-stream', [{ opacity: 0, strokeDasharray: '0 80' }, { opacity: 1, strokeDasharray: '60 80', offset: 0.3 }, { opacity: 1, strokeDasharray: '60 80', offset: 0.75 }, { opacity: 0, strokeDasharray: '60 80' }], { duration: 900 });
    play(m, '.pot-tea', [{ opacity: 0 }, { opacity: 1, offset: 0.5 }, { opacity: 1, offset: 0.9 }, { opacity: 0 }], { duration: 1300 });
    play(m, '.pot-water, .pot-float', [{ transform: 'none' }, { transform: 'translateY(4px)' }], { duration: 900, easing: 'ease-out' });
    play(m, '.pot-steam path', [{ opacity: 0.5, transform: 'none' }, { opacity: 1, transform: 'translateY(-8px) scale(1.6)' }, { opacity: 0, transform: 'translateY(-14px) scale(2)' }], { duration: 800 });
    play(m, '.pot-warm', [{ fill: '#ffa040' }, { fill: '#ff4b3a' }, { fill: '#ffa040' }], { duration: 900 });
    return 520;
  },
  fridge: m => {
    play(m, '.fr-door', [{ transform: 'none' }, { transform: 'scaleX(.12)', offset: 0.28 }, { transform: 'scaleX(.12)', offset: 0.7 }, { transform: 'scaleX(1.02)', offset: 0.92 }, { transform: 'none' }], { duration: 1100, easing: 'ease-in-out' });
    play(m, '.fr-mist circle', [{ opacity: 0, transform: 'none' }, { opacity: 0.85, transform: 'translateX(10px) scale(1.4)', offset: 0.35 }, { opacity: 0, transform: 'translate(26px, 6px) scale(2.2)' }], { duration: 1000, delay: 180, easing: 'ease-out' });
    play(m, '.fr-note', [{ transform: 'none' }, { transform: 'rotate(-8deg)' }, { transform: 'rotate(4deg)' }, { transform: 'none' }], { duration: 700, delay: 150 });
    return 360;
  },
};

/** Plays a machine's dispense. Resolves when its things are ready to come out (the flap is open). */
export function fireMachine(body, id) {
  const wait = FIRE[id] ? FIRE[id](body) : 0;
  return new Promise(r => setTimeout(r, ms(wait)));
}
