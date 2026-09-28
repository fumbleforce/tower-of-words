// Placeholder art for the train opening, drawn in code. None of these shots has approved art yet; each one is
// listed with its staging in TODO.md ("Train opening: art shots needed"). Every backdrop carries a visible
// "placeholder" tag so nobody mistakes it for final art. Props (cup, badge, cards, phones) are simple drawings.

const tag = what => `<div class="ph-tag">placeholder art<span class="what"> · ${what}</span></div>`;
const svg = (body, vb = '0 0 1600 900', par = 'xMidYMid slice') => `<svg class="ph-svg" viewBox="${vb}" preserveAspectRatio="${par}" aria-hidden="true">${body}</svg>`;

// Seated side view across the carriage: sea and sky only in the windows, water well below.
const carriage = svg(`
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fb8e6"/><stop offset="1" stop-color="#d6ecf8"/></linearGradient>
    <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f86b3"/><stop offset="1" stop-color="#23577c"/></linearGradient>
    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3e7ec"/><stop offset="1" stop-color="#c5ccd5"/></linearGradient>
    <clipPath id="win"><rect x="70" y="170" width="480" height="300" rx="26"/><rect x="610" y="170" width="480" height="300" rx="26"/><rect x="1150" y="170" width="480" height="300" rx="26"/></clipPath>
  </defs>
  <rect width="1600" height="900" fill="url(#wall)"/>
  <rect width="1600" height="110" fill="#f1f3f6"/><rect x="0" y="96" width="1600" height="14" fill="#d7dce2"/>
  <rect x="200" y="30" width="1200" height="26" rx="13" fill="#fdfdfb"/>
  <g clip-path="url(#win)">
    <rect x="0" y="170" width="1600" height="215" fill="url(#sky)"/>
    <rect x="0" y="385" width="1600" height="90" fill="url(#sea)"/>
    <g class="ph-drift" fill="#ffffff">
      <g opacity=".8"><circle cx="260" cy="235" r="22"/><circle cx="286" cy="225" r="28"/><circle cx="316" cy="235" r="22"/><rect x="260" y="235" width="56" height="22"/></g><g opacity=".8"><circle cx="880" cy="215" r="22"/><circle cx="906" cy="205" r="28"/><circle cx="936" cy="215" r="22"/><rect x="880" y="215" width="56" height="22"/></g><g opacity=".8"><circle cx="1380" cy="250" r="22"/><circle cx="1406" cy="240" r="28"/><circle cx="1436" cy="250" r="22"/><rect x="1380" y="250" width="56" height="22"/></g><g opacity=".8"><circle cx="1860" cy="235" r="22"/><circle cx="1886" cy="225" r="28"/><circle cx="1916" cy="235" r="22"/><rect x="1860" y="235" width="56" height="22"/></g><g opacity=".8"><circle cx="2480" cy="215" r="22"/><circle cx="2506" cy="205" r="28"/><circle cx="2536" cy="215" r="22"/><rect x="2480" y="215" width="56" height="22"/></g><g opacity=".8"><circle cx="2980" cy="250" r="22"/><circle cx="3006" cy="240" r="28"/><circle cx="3036" cy="250" r="22"/><rect x="2980" y="250" width="56" height="22"/></g>
    </g>
    <g class="ph-glint" stroke="#cfe6f5" stroke-width="3" stroke-linecap="round" opacity=".8">
      <path d="M120 410h40M420 430h60M700 405h30M980 440h50M1250 415h40M1500 432h60M1720 410h40M2020 430h60M2300 405h30M2580 440h50M2850 415h40M3100 432h60"/>
    </g>
  </g>
  <g fill="none" stroke="#9aa4b0" stroke-width="10"><rect x="70" y="170" width="480" height="300" rx="26"/><rect x="610" y="170" width="480" height="300" rx="26"/><rect x="1150" y="170" width="480" height="300" rx="26"/></g>
  <rect x="0" y="498" width="1600" height="10" fill="#b7bfc9"/>
  <rect x="40" y="540" width="1520" height="110" rx="22" fill="#2e4a6e"/>
  <rect x="40" y="640" width="1520" height="70" rx="16" fill="#27405f"/>
  <rect x="40" y="706" width="1520" height="26" fill="#1c2c42"/>
  <rect x="0" y="732" width="1600" height="168" fill="#8b949f"/>
  <rect x="0" y="732" width="1600" height="8" fill="#a3abb5"/>
  <rect x="1320" y="0" width="16" height="900" fill="#c3cad2"/><rect x="1316" y="0" width="4" height="900" fill="#e6eaee"/>
`) + tag('carriage interior');

// Exterior: camera behind and to one side of the last car, looking along the guideway to the island.
const reveal = svg(`
  <defs>
    <linearGradient id="rsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6aa9dc"/><stop offset="1" stop-color="#d9eef9"/></linearGradient>
    <linearGradient id="rsea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b9cc4"/><stop offset="1" stop-color="#1f4d70"/></linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#rsky)"/>
  <rect y="430" width="1600" height="470" fill="url(#rsea)"/>
  <g fill="#8fa3b8">
    <rect x="610" y="340" width="40" height="90"/><rect x="655" y="300" width="42" height="130"/><rect x="700" y="260" width="48" height="170"/>
    <rect x="850" y="250" width="46" height="180"/><rect x="900" y="300" width="60" height="130"/><rect x="965" y="280" width="40" height="150"/>
    <rect x="1010" y="340" width="60" height="90"/><rect x="1075" y="365" width="80" height="65"/><rect x="540" y="370" width="66" height="60"/>
  </g>
  <rect x="770" y="180" width="70" height="250" fill="#6f859c"/><circle cx="805" cy="214" r="12" fill="#e8452c"/>
  <rect x="520" y="420" width="660" height="14" fill="#7d8f9f"/>
  <path d="M330 900 L785 445 L805 445 L520 900 Z" fill="#dde3ea"/>
  <path d="M520 900 L805 445 L808 456 L566 900 Z" fill="#9aa6b3"/>
  <g fill="#b9c3cd"><rect x="470" y="790" width="34" height="110"/><rect x="612" y="630" width="24" height="120"/><rect x="705" y="545" width="16" height="80"/><rect x="760" y="490" width="10" height="45"/></g>
  <rect x="652" y="478" width="96" height="78" rx="11" fill="#f5f6f8"/>
  <rect x="664" y="490" width="72" height="26" rx="5" fill="#2b3b52"/>
  <rect x="652" y="526" width="96" height="8" fill="#e8452c"/>
  <rect x="661" y="542" width="12" height="6" rx="2" fill="#c9d0d8"/><rect x="727" y="542" width="12" height="6" rx="2" fill="#c9d0d8"/>
  <path d="M748 486 L770 472 L770 540 L748 556 Z" fill="#dfe4ea"/>`) + tag('island reveal, exterior');

// A close shot facing the open side doors, the platform beyond.
const doors = svg(`
  <rect width="1600" height="900" fill="#cfd5dc"/>
  <rect width="1600" height="110" fill="#eef0f3"/>
  <rect x="650" y="130" width="300" height="610" fill="#eaf3f9"/>
  <rect x="690" y="190" width="150" height="46" rx="6" fill="#2b3b52"/>
  <rect x="870" y="140" width="30" height="430" fill="#c9d0d8"/>
  <path d="M650 560 H950 V740 H650 Z" fill="#aab2bb"/>
  <path d="M650 640 H950 V662 H650 Z" fill="#f2c230"/>
  <rect x="470" y="120" width="180" height="620" rx="8" fill="#aeb7c1"/><rect x="500" y="170" width="120" height="250" rx="8" fill="#dcebf5"/>
  <rect x="950" y="120" width="180" height="620" rx="8" fill="#aeb7c1"/><rect x="980" y="170" width="120" height="250" rx="8" fill="#dcebf5"/>
  <rect x="640" y="120" width="12" height="620" fill="#2a2f37"/><rect x="948" y="120" width="12" height="620" fill="#2a2f37"/>
  <rect x="640" y="734" width="320" height="10" fill="#7d8792"/>
  <rect x="0" y="744" width="1600" height="156" fill="#8b949f"/>
  <rect x="440" y="96" width="720" height="16" fill="#e8452c"/>`) + tag('carriage doors, arrival');

// The island platform under its canopy; the lower company city beyond.
const platform = svg(`
  <rect width="1600" height="900" fill="#d7ecf8"/>
  <g fill="#a9bccd"><rect x="700" y="250" width="70" height="200"/><rect x="775" y="200" width="60" height="250"/><rect x="840" y="280" width="90" height="170"/><rect x="935" y="240" width="70" height="210"/><rect x="1010" y="320" width="120" height="130"/></g>
  <rect x="860" y="170" width="40" height="280" fill="#8ea3b8"/><circle cx="880" cy="192" r="8" fill="#e8452c"/>
  <path d="M760 460 L840 460 L1600 900 L0 900 Z" fill="#b9c0c8"/>
  <path d="M768 460 L778 460 L372 900 L326 900 Z" fill="#f2c230"/>
  <path d="M0 150 L760 390 L760 470 L0 830 Z" fill="#f5f6f8"/>
  <path d="M0 330 L760 420 L760 440 L0 500 Z" fill="#2b3b52"/>
  <path d="M0 560 L760 452 L760 458 L0 580 Z" fill="#e8452c"/>
  <path d="M0 0 H1600 V140 L840 380 L760 380 L0 100 Z" fill="#5d6773"/>
  <g fill="#6c7682"><path d="M1040 330 h14 v250 h-14 z"/><path d="M1300 250 h22 v420 h-22 z"/></g>`) + tag('island platform');

export const PLACEHOLDER = { carriage, reveal, doors, platform };

// Props shown over the scene. `jp(markup, gl)` renders tappable Japanese.
const card = (inner, vb) => `<svg class="ins-svg" viewBox="${vb}" aria-hidden="true">${inner}</svg>`;
const cup = (x, y, rot, holder = '') => `<g transform="translate(${x} ${y}) rotate(${rot})">${holder}<path d="M-26 -60 L26 -60 L20 20 L-20 20 Z" fill="#fbfbf9" stroke="#9aa3ad" stroke-width="3"/><rect x="-24" y="-38" width="48" height="26" fill="#2f8f89"/><rect x="-30" y="-72" width="60" height="14" rx="5" fill="#e9ecef" stroke="#9aa3ad" stroke-width="3"/></g>`;
const hand = (x, y, rot, fill = '#f3d6c6') => `<g transform="translate(${x} ${y}) rotate(${rot})"><ellipse rx="34" ry="22" fill="${fill}" stroke="#c9a896" stroke-width="2"/></g>`;
const bench = `<rect width="640" height="360" fill="#2e4a6e"/><rect y="300" width="640" height="60" fill="#27405f"/><path d="M0 40 H640" stroke="#3a5a82" stroke-width="3"/>`;
const folder = (x, y, rot) => `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-110" y="-80" width="220" height="160" rx="8" fill="#9cc3e6" stroke="#6f97bd" stroke-width="3"/><rect x="-100" y="-70" width="120" height="10" rx="4" fill="#7aa7d1"/></g>`;
// Her laptop, open on her lap: screen (lit) above, keyboard below with her hands on it.
const laptop = (open = true) => open
  ? `<g transform="translate(160 200)"><rect x="-120" y="-150" width="240" height="140" rx="10" fill="#59636e"/><rect x="-108" y="-140" width="216" height="118" rx="6" fill="#bfe0f5"/><rect x="-90" y="-120" width="120" height="8" rx="3" fill="#7fa6c2"/><rect x="-90" y="-100" width="160" height="8" rx="3" fill="#7fa6c2"/><rect x="-90" y="-80" width="90" height="8" rx="3" fill="#7fa6c2"/><path d="M-130 -10 H130 L150 110 H-150 Z" fill="#8e98a3"/><g fill="#6f7985">${[0, 1, 2, 3].map(r => `<rect x="${-118 + r * 4}" y="${4 + r * 22}" width="${236 - r * 8}" height="14" rx="3"/>`).join('')}</g>${hand(-60, 70, -10)}${hand(60, 70, 10)}</g>`
  : `<g transform="translate(160 240)"><path d="M-130 -20 H130 L145 40 H-145 Z" fill="#8e98a3"/><rect x="-130" y="-26" width="260" height="10" rx="4" fill="#59636e"/>${hand(80, 10, 10)}</g>`;
const INS = {
  seat: () => card(`${bench}${laptop(true)}${folder(440, 200, -4)}<g class="tip">${cup(470, 150, 28)}</g><path d="M520 90 q20 10 16 34 M540 110 q16 8 12 26" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>`, '0 0 640 360') + `<div class="ins-cap">Her laptop · her folder on the empty seat · her coffee</div>`,
  'seat-caught': () => card(`${bench}${laptop(true)}${folder(440, 200, -4)}${hand(440, 240, 20)}${cup(470, 150, 0)}${hand(470, 140, 0, '#f6e3d8')}`, '0 0 640 360') + `<div class="ins-cap">Your hand on the cup</div>`,
  'seat-saved': () => card(`${bench}${laptop(false)}${folder(440, 210, -4)}${cup(470, 150, 0)}${hand(470, 150, 0)}`, '0 0 640 360') + `<div class="ins-cap">Her hand on the cup, laptop shut</div>`,
  badge: jp => `<div class="badge-card"><div class="bc-top">AMAKAWA</div><div class="bc-row"><div class="bc-photo"></div><div class="bc-info"><div class="bc-new">NEW HIRE</div><div class="bc-dept">${jp('{企画室|きかくしつ}７', { 企画室: 'Planning Office; 企画室７ = Planning Office 7, your team' })}</div><div class="bc-code"></div></div></div><div class="bc-film"></div></div><div class="ins-cap">Your new company badge</div>`,
  dorm: jp => `<div class="dorm-card"><svg viewBox="0 0 60 40" aria-hidden="true"><rect x="4" y="20" width="52" height="10" rx="2" fill="#2e4a6e"/><rect x="4" y="12" width="14" height="10" rx="3" fill="#9cc3e6"/><rect x="4" y="30" width="4" height="8" fill="#2e4a6e"/><rect x="52" y="30" width="4" height="8" fill="#2e4a6e"/></svg><div class="dc-jp">${jp('{寮|りょう}', { 寮: 'dorm, company housing' })}</div><div class="dc-no">A · 203</div></div><div class="ins-cap">Another card from your backpack</div>`,
  folder: () => card(`<rect width="640" height="360" fill="#2e4a6e"/><g transform="translate(320 180) rotate(-3)"><rect x="-230" y="-150" width="460" height="300" rx="10" fill="#9cc3e6"/><rect x="-210" y="-135" width="420" height="270" fill="#fbfbf9"/>${[0, 1, 2, 3, 4, 5, 6].map(i => `<rect x="-190" y="${-110 + i * 34}" width="380" height="2" fill="#c5ccd5"/><rect x="-190" y="${-100 + i * 34}" width="${120 + (i * 37) % 90}" height="10" rx="3" fill="#8e98a3"/><rect x="80" y="${-100 + i * 34}" width="${50 + (i * 23) % 50}" height="10" rx="3" fill="#8e98a3"/>`).join('')}<path d="M-40 -30 L100 -26" stroke="#e8452c" stroke-width="4"/></g>`, '0 0 640 360') + `<div class="ins-cap">Her folder: a table of figures</div>`,
  caller: jp => `<div class="caller"><div class="cl-top">Incoming call</div><img class="cl-av" src="img/ch/emi-smile.webp" alt=""><div class="cl-name">${jp('エミ', { エミ: 'Emi (a name)' })}</div><div class="cl-btns"><span class="cl-no">✕</span><span class="cl-yes">✓</span></div></div><div class="ins-cap">Her phone</div>`,
  reibadge: jp => `<div class="badge-card"><div class="bc-top">AMAKAWA</div><div class="bc-row"><div class="bc-photo silver"></div><div class="bc-info"><div class="bc-name">${jp('{黒田|くろだ}　レイ', { 黒田: 'Kuroda (a family name; it comes first)', レイ: 'Rei (a given name)' })}</div><div class="bc-dept">${jp('{営業部|えいぎょうぶ}', { 営業部: 'the Sales department' })}</div></div></div></div><div class="ins-cap">Her badge</div>`,
};
export const insertHTML = (name, jp) => (INS[name] ? INS[name](jp) : '');

// The housing card on the player's phone: dorm A, room 203, and the delivery photo of his boxes at the door.
export const housingHTML = jp => `<div class="hs-card"><span class="hc-jp">${jp('{寮|りょう}')}</span><span class="hc-no">A · 203</span><small>Move-in: today</small></div>
<div class="hs-photo">${card(`<rect width="400" height="260" fill="#d9dee4"/><rect y="200" width="400" height="60" fill="#aab2bb"/>
  <rect x="230" y="40" width="120" height="170" fill="#8e9baa"/><rect x="250" y="60" width="80" height="26" rx="3" fill="#f5f6f8"/><text x="290" y="80" font-size="20" font-family="IBM Plex Mono, monospace" text-anchor="middle" fill="#2b3b52">203</text><circle cx="335" cy="130" r="5" fill="#d7dce2"/>
  <g stroke="#b8a98f" stroke-width="2"><rect x="40" y="130" width="100" height="80" fill="#e4d4b4"/><rect x="140" y="150" width="80" height="60" fill="#e9dcc0"/><rect x="60" y="80" width="80" height="52" fill="#efe3c8"/></g>
  <g stroke="#c9b58c" stroke-width="6"><path d="M90 130 V210"/><path d="M180 150 V210"/><path d="M100 80 V132"/></g>
  <rect x="150" y="165" width="40" height="18" rx="3" fill="#e8452c"/><text x="170" y="178" font-size="8" font-family="IBM Plex Mono, monospace" text-anchor="middle" fill="#fff">AMAKAWA</text>
  <g transform="translate(78 92)" fill="none" stroke="#2b3b52" stroke-width="2.4"><path d="M0 4 h22 v18 q0 8 -8 8 h-6 q-8 0 -8 -8 z"/><path d="M22 9 q9 0 9 7 q0 7 -9 7"/></g>`, '0 0 400 260')}<small>Delivery photo: your boxes at room 203</small></div>`;
