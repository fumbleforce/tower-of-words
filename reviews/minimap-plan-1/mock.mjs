// Mock-up of the island map and the HUD minimap for reviews/minimap-plan-1, drawn from the real layout data.
// From the repo root: node reviews/minimap-plan-1/mock.mjs (writes the .svg files and, with rsvg-convert, the .png).
// The pins, states and goal are a made-up Saturday morning at the plaza, for the mock only.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const ROOT = process.cwd();
const L = await import(ROOT + '/game3d/js/scenes/island-layout.js');
const OUT = ROOT + '/reviews/minimap-plan-1';
const FONT = `font-family="Noto Sans CJK JP, sans-serif"`;
const C = {
  sea: '#101a24', land: '#1f252d', north: '#1a1f26', green: '#26332d', sand: '#2e3236', path: '#39424e', lane: '#424c59',
  bld: '#3d4552', bldEdge: '#4d5767', beam: '#4a5361', ink: '#eef0f4', dim: '#a9b1bf', teal: '#6fd0c6', lock: '#5b6370',
  panel: 'rgba(24,27,34,0.92)', edge: 'rgba(255,255,255,0.10)',
};
const f = (n) => +n.toFixed(1);
function base(T, s) {
  const P = ([x, z]) => T(x, z).map(f).join(',');
  const poly = (pts, fill, extra = '') => `<polygon points="${pts.map(P).join(' ')}" fill="${fill}" ${extra}/>`;
  const rect = ([x0, z0, x1, z1], fill, extra = '') => poly([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], fill, extra);
  let o = '';
  const coast = L.COAST.line;
  o += poly([...coast, [140, -124], [140, -400], [-154, -400]], C.land);
  o += poly([...L.HALF_EDGE, [140, -400], [-154, -400]], C.north);
  for (const g of L.SAND) o += poly(g.poly, C.sand);
  for (const g of L.GREEN) o += g.rect ? rect(g.rect, C.green) : poly(g.poly, C.green);
  for (const p of L.PATHS) {
    const col = p.kind === 'lane' ? C.lane : C.path;
    if (p.kind === 'beam')
      o += `<polyline points="${p.line.map(P).join(' ')}" fill="none" stroke="${C.beam}" stroke-width="${f(p.w * s * 0.6)}" stroke-dasharray="${f(s * 2)} ${f(s * 1.2)}"/>`;
    else if (p.rect) o += rect(p.rect, col);
    else if (p.line)
      o += `<polyline points="${p.line.map(P).join(' ')}" fill="none" stroke="${col}" stroke-width="${f(p.w * s)}" stroke-linejoin="round" stroke-linecap="round"/>`;
    else if (p.circle) {
      const [x, z, r] = p.circle;
      const [cx, cy] = T(x, z);
      o += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * s)}" fill="${col}"/>`;
    }
  }
  for (const b of L.BUILDINGS) o += poly(L.footprint(b), C.bld, `stroke="${C.bldEdge}" stroke-width="1"`);
  o += `<polyline points="${coast.map(P).join(' ')}" fill="none" stroke="#2c3a48" stroke-width="2"/>`;
  return o;
}
// pins: state here | go | new | locked; goal adds the flag
const PINS = [
  { id: 'gate', label: 'Station', at: [-14.4, 6.5], st: 'go' },
  { id: 'forecourt', label: 'Forecourt', at: [-6, -1], st: 'go', dy: -1 },
  { id: 'plaza', label: 'Fountain plaza', at: [37.3, -2.75], st: 'here' },
  { id: 'shotengai', label: 'Shop street', at: [30.3, 20.1], st: 'go', sel: true },
  { id: 'east_lane', label: 'East lane', at: [67.5, -6.5], st: 'go', dy: -1 },
  { id: 'dorm_court', label: 'Dorms', at: [80.5, 2], st: 'go' },
  { id: 'east_coast', label: 'East coast', at: [126.5, 10.5], st: 'go', left: true },
  { id: 'sports', label: 'Gym and pool', at: [58.2, -57.5], st: 'new', goal: [67.7, -76] },
  { id: 'office_quarter', label: 'Office street', at: [4.5, -54], st: 'locked' },
  { id: 'harbour', label: 'Harbour', at: [-85, -75], st: 'locked' },
  { id: 'works', label: 'Old works', at: [-66, -106], st: 'locked' },
];
const LOCK = (x, y, k = 1) =>
  `<g transform="translate(${f(x)},${f(y)}) scale(${k})"><rect x="-4.5" y="-1" width="9" height="7" rx="1.5" fill="#20252c"/><path d="M-2.6,-1 v-2.2 a2.6,2.6 0 0 1 5.2,0 v2.2" fill="none" stroke="#20252c" stroke-width="1.6"/></g>`;
function pin(p, T, big) {
  const [x, y] = T(...p.at);
  const r = big ? 11 : 9;
  let o = '';
  if (p.goal) {
    const [gx, gy] = T(...p.goal);
    o += `<g><circle cx="${f(gx)}" cy="${f(gy)}" r="${big ? 22 : 18}" fill="${C.teal}" opacity="0.16"/><path d="M${f(gx - 5)},${f(gy + 13)} V${f(gy - 13)} h14 l-4,6 l4,6 h-14" fill="${C.teal}" stroke="#0e2a28" stroke-width="1.4" stroke-linejoin="round"/></g>`;
  }
  if (p.sel) o += `<circle cx="${f(x)}" cy="${f(y)}" r="${r + 8}" fill="none" stroke="${C.ink}" stroke-width="2" opacity="0.6"/>`;
  if (p.st === 'here') {
    o += `<circle cx="${f(x)}" cy="${f(y)}" r="${r + 9}" fill="${C.teal}" opacity="0.18"/><circle cx="${f(x)}" cy="${f(y)}" r="${r + 1}" fill="${C.teal}" stroke="#0e2a28" stroke-width="2"/>`;
    o += `<path d="M${f(x + 8)},${f(y)} L${f(x - 5)},${f(y - 6.5)} L${f(x - 2)},${f(y)} L${f(x - 5)},${f(y + 6.5)} Z" fill="#0e2a28"/>`;
  } else if (p.st === 'go')
    o += `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="${C.ink}" stroke="#11151a" stroke-width="2"/><circle cx="${f(x)}" cy="${f(y)}" r="${r - 5}" fill="#11151a"/>`;
  else if (p.st === 'new')
    o += `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="#11151a" stroke="${C.dim}" stroke-width="2.4" stroke-dasharray="3.2 2.6"/>`;
  else o += `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="${C.lock}" stroke="#11151a" stroke-width="2"/>` + LOCK(x, y - 1.5, big ? 1.1 : 0.95);
  const fs_ = big ? 15 : 13.5,
    pad = 7,
    w = p.label.length * fs_ * 0.56 + pad * 2,
    h = fs_ + 10;
  const lx = p.left ? x - r - 6 - w : x + r + 6,
    ly = y - h / 2 + (p.dy || 0) * (h + 4);
  const col = p.st === 'locked' ? '#8b93a0' : p.st === 'new' ? C.dim : C.ink;
  o += `<rect x="${f(lx)}" y="${f(ly)}" width="${f(w)}" height="${f(h)}" rx="${f(h / 2)}" fill="${C.panel}" stroke="${p.st === 'here' ? C.teal : C.edge}"/>`;
  o += `<text x="${f(lx + pad)}" y="${f(ly + h / 2 + fs_ * 0.36)}" ${FONT} font-size="${fs_}" font-weight="500" fill="${col}">${p.label}</text>`;
  return o;
}
const svg = (W, H, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`;
const T0 = (s, x0, z0, ox, oy) => (x, z) => [ox + (x - x0) * s, oy + (z - z0) * s];
const btn = (x, y, w, h, label, primary, fs = 16) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${primary ? C.teal : '#2a313b'}" stroke="${primary ? 'none' : C.edge}"/><text x="${x + w / 2}" y="${y + h / 2 + fs * 0.36}" text-anchor="middle" ${FONT} font-size="${fs}" font-weight="700" fill="${primary ? '#0e2a28' : C.ink}">${label}</text>`;
const closeX = (x, y, s = 44) =>
  `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="10" fill="#2a313b" stroke="${C.edge}"/><path d="M${x + s / 2 - 7},${y + s / 2 - 7} l14,14 M${x + s / 2 + 7},${y + s / 2 - 7} l-14,14" stroke="${C.ink}" stroke-width="2.4" stroke-linecap="round"/>`;
const text = (x, y, t, size, col = C.ink, weight = 500, extra = '') =>
  `<text x="${x}" y="${y}" ${FONT} font-size="${size}" font-weight="${weight}" fill="${col}" ${extra}>${t}</text>`;
const dot = (x, y, st) =>
  st === 'go'
    ? `<circle cx="${x}" cy="${y}" r="6" fill="${C.ink}"/><circle cx="${x}" cy="${y}" r="2.6" fill="#11151a"/>`
    : st === 'new'
      ? `<circle cx="${x}" cy="${y}" r="6" fill="none" stroke="${C.dim}" stroke-width="2" stroke-dasharray="2.6 2"/>`
      : st === 'here'
        ? `<circle cx="${x}" cy="${y}" r="6.5" fill="${C.teal}"/>`
        : `<circle cx="${x}" cy="${y}" r="6" fill="${C.lock}"/>`;
const flag = (x, y, k = 1) => `<path d="M${x},${y + 16 * k} V${y} h${11 * k} l${-3 * k},${4.5 * k} l${3 * k},${4.5 * k} h${-11 * k}" fill="${C.teal}"/>`;

// ---------- phone, map open, a place picked ----------
{
  const W = 390,
    H = 844,
    s = 3.25;
  const T = T0(s, 12, -104, 0, 56);
  let o = `<rect width="${W}" height="${H}" fill="${C.sea}"/>` + base(T, s);
  o += PINS.map((p) => pin(p, T, true)).join('');
  o += `<rect width="${W}" height="64" fill="${C.panel}"/><line x1="0" y1="64" x2="${W}" y2="64" stroke="${C.edge}"/>`;
  o += text(16, 30, 'Map', 19, C.ink, 700) + text(16, 51, 'Sat 3 Oct · Morning', 13, C.dim);
  o += closeX(W - 56, 10);
  o += `<rect x="12" y="74" width="196" height="34" rx="8" fill="${C.panel}" stroke="${C.edge}"/>` + flag(24, 83) + text(42, 96, 'Go to the pool.', 14);
  const y0 = 588;
  o += `<rect x="0" y="${y0}" width="${W}" height="${H - y0 + 20}" rx="18" fill="#181c22" stroke="${C.edge}"/><rect x="${W / 2 - 22}" y="${y0 + 8}" width="44" height="4" rx="2" fill="#3a414c"/>`;
  o += text(20, y0 + 46, 'Shop street', 22, C.ink, 700) + text(20, y0 + 72, 'Been here · about 1 min on foot', 14, C.dim);
  o += `<line x1="20" y1="${y0 + 90}" x2="${W - 20}" y2="${y0 + 90}" stroke="${C.edge}"/>`;
  o += dot(30, y0 + 116, 'new') + text(46, y0 + 121, 'Karaoke box', 15, C.dim) + text(W - 20, y0 + 121, 'not been yet', 13, '#7d8593', 500, 'text-anchor="end"');
  o += btn(20, y0 + 150, 168, 52, 'Cancel', false) + btn(202, y0 + 150, 168, 52, 'Go there', true);
  o += text(W / 2, y0 + 234, 'Drag or pinch to move the map', 12, '#7d8593', 500, 'text-anchor="middle"');
  fs.writeFileSync(OUT + '/phone-map.svg', svg(W, H, o));
}

// ---------- desktop, map open, side panel ----------
{
  const W = 1366,
    H = 860,
    PW = 360,
    s = 3.5;
  const T = T0(s, -128, -138, 14, 70);
  let o = `<rect width="${W}" height="${H}" fill="${C.sea}"/>` + base(T, s);
  o += PINS.map((p) => pin(p, T, false)).join('');
  o += `<rect width="${W - PW}" height="56" fill="${C.panel}"/>` + text(22, 36, 'Map', 20, C.ink, 700) + text(80, 36, 'Sat 3 Oct · Morning', 14, C.dim);
  o += `<rect x="${W - PW - 230}" y="12" width="216" height="32" rx="8" fill="#20252c" stroke="${C.edge}"/>` + flag(W - PW - 218, 20) + text(W - PW - 200, 34, 'Go to the pool.', 14);
  const lx = 24,
    ly = H - 96;
  o += `<rect x="${lx - 10}" y="${ly - 24}" width="226" height="112" rx="10" fill="${C.panel}" stroke="${C.edge}"/>`;
  [
    ['here', 'You are here'],
    ['go', 'Been here: fast travel'],
    ['new', 'Not been yet: walk there'],
    ['locked', 'Not open today'],
  ].forEach(([st, t], i) => {
    o +=
      (st === 'locked' ? `<circle cx="${lx + 8}" cy="${ly + i * 24 - 4}" r="7" fill="${C.lock}"/>` + LOCK(lx + 8, ly + i * 24 - 5.5, 0.7) : dot(lx + 8, ly + i * 24 - 4, st)) +
      text(lx + 24, ly + i * 24 + 1, t, 13, C.dim);
  });
  o += text(W - PW - 16, H - 16, 'Drag to pan · wheel to zoom · M or Esc closes', 12, '#7d8593', 500, 'text-anchor="end"');
  const px = W - PW;
  o += `<rect x="${px}" y="0" width="${PW}" height="${H}" fill="#181c22"/><line x1="${px}" y1="0" x2="${px}" y2="${H}" stroke="${C.edge}"/>`;
  o += closeX(W - 60, 12) + text(W - 70, 40, 'Esc', 12, '#7d8593', 500, 'text-anchor="end"');
  o += text(px + 24, 92, 'Shop street', 24, C.ink, 700) + text(px + 24, 118, 'Been here · about 1 min on foot', 14, C.dim);
  o += dot(px + 32, 150, 'new') + text(px + 48, 155, 'Karaoke box', 15, C.dim) + text(W - 24, 155, 'not been yet', 13, '#7d8593', 500, 'text-anchor="end"');
  o += btn(px + 24, 178, PW - 48, 50, 'Go there   (Enter)', true);
  o += `<line x1="${px + 24}" y1="252" x2="${W - 24}" y2="252" stroke="${C.edge}"/>`;
  const rows = [
    ['HERE', [['here', 'Fountain plaza', '']]],
    ['FAST TRAVEL', [['go', 'Shop street', '1 min'], ['go', 'East lane', '1 min'], ['go', 'Dorms', '2 min'], ['go', 'Forecourt', '2 min'], ['go', 'Station', '2 min'], ['go', 'East coast', '3 min']]],
    ['NOT BEEN YET', [['new', 'Gym and pool', 'Goal']]],
    ['NOT OPEN TODAY', [['locked', 'Office street', ''], ['locked', 'Harbour', ''], ['locked', 'Old works', '']]],
  ];
  let y = 284;
  for (const [h, items] of rows) {
    o += text(px + 24, y, h, 11, '#7d8593', 700, 'letter-spacing="0.8"');
    y += 10;
    for (const [st, name, note] of items) {
      if (name === 'Shop street') o += `<rect x="${px + 12}" y="${y}" width="${PW - 24}" height="34" rx="8" fill="#232a33" stroke="${C.teal}" stroke-opacity="0.6"/>`;
      o +=
        (st === 'locked' ? `<circle cx="${px + 32}" cy="${y + 17}" r="6" fill="${C.lock}"/>` : dot(px + 32, y + 17, st)) +
        text(px + 48, y + 22, name, 15, st === 'locked' ? '#8b93a0' : st === 'new' ? C.dim : C.ink);
      if (note) o += (note === 'Goal' ? flag(W - 66, y + 9, 0.8) : '') + text(W - 28, y + 22, note, 13, note === 'Goal' ? C.teal : '#7d8593', 500, 'text-anchor="end"');
      y += 36;
    }
    y += 18;
  }
  fs.writeFileSync(OUT + '/desktop-map.svg', svg(W, H, o));
}

// ---------- the minimap in the HUD, phone and desktop (the game view as a plain backdrop) ----------
function minimap(cx, cy, size, s, focus) {
  const T = (x, z) => [cx + (x - focus[0]) * s, cy + (z - focus[1]) * s];
  const id = `mm${size}`;
  let o = `<clipPath id="${id}"><rect x="${cx - size / 2}" y="${cy - size / 2}" width="${size}" height="${size}" rx="14"/></clipPath>`;
  o += `<g clip-path="url(#${id})"><rect x="${cx - size / 2}" y="${cy - size / 2}" width="${size}" height="${size}" fill="${C.sea}"/>${base(T, s)}`;
  for (const p of PINS.filter((p) => p.st !== 'here')) {
    const [x, y] = T(...p.at);
    o += `<circle cx="${f(x)}" cy="${f(y)}" r="3.6" fill="${p.st === 'go' ? C.ink : p.st === 'new' ? C.dim : C.lock}"/>`;
  }
  const [gx, gy] = T(67.7, -76);
  const e = size / 2 - 9,
    dx = gx - cx,
    dy = gy - cy,
    k = Math.min(1, e / Math.max(Math.abs(dx), Math.abs(dy)));
  o += `<circle cx="${f(cx + dx * k)}" cy="${f(cy + dy * k)}" r="6" fill="${C.teal}" stroke="#0e2a28" stroke-width="1.5"/>`;
  o += `<path d="M${cx + 9},${cy} L${cx - 6},${cy - 7} L${cx - 2},${cy} L${cx - 6},${cy + 7} Z" fill="${C.teal}" stroke="#0e2a28" stroke-width="1.5"/></g>`;
  o += `<rect x="${cx - size / 2}" y="${cy - size / 2}" width="${size}" height="${size}" rx="14" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="1.5"/>`;
  return o;
}
const scene = (W, H) =>
  `<defs><linearGradient id="g${W}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4b5866"/><stop offset="1" stop-color="#2b333c"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g${W})"/>` +
  text(W / 2, H / 2, '(the game view)', 16, 'rgba(255,255,255,0.35)', 500, 'text-anchor="middle"');
const chip = (x, y, w, t) => `<rect x="${x}" y="${y}" width="${w}" height="34" rx="8" fill="${C.panel}" stroke="${C.edge}"/>` + text(x + w / 2, y + 22, t, 13, C.ink, 500, 'text-anchor="middle"');
const menu = (x, y) =>
  `<rect x="${x}" y="${y}" width="38" height="34" rx="8" fill="${C.panel}" stroke="${C.edge}"/><path d="M${x + 10},${y + 11} h18 M${x + 10},${y + 17} h18 M${x + 10},${y + 23} h18" stroke="${C.ink}" stroke-width="2"/>`;
{
  const W = 390,
    H = 844;
  let o = scene(W, H);
  o += `<rect x="10" y="10" width="178" height="34" rx="8" fill="${C.panel}" stroke="${C.edge}"/>` + flag(22, 19) + text(40, 32, 'Go to the pool.', 14);
  o += chip(196, 10, 136, 'Sat 3 Oct · Morning') + menu(W - 48, 10);
  o += minimap(W - 10 - 44, 54 + 44, 88, 1.5, [32, -2.75]);
  o += text(W - 54, 160, 'tap to open the map', 11, 'rgba(255,255,255,0.75)', 500, 'text-anchor="middle"');
  fs.writeFileSync(OUT + '/phone-hud.svg', svg(W, H, o));
}
{
  const W = 1366,
    H = 860;
  let o = scene(W, H);
  o += `<rect x="16" y="16" width="230" height="38" rx="8" fill="${C.panel}" stroke="${C.edge}"/>` + flag(30, 26) + text(50, 41, 'Go to the pool.', 15);
  o += chip(W - 470, 16, 170, 'Sat 3 Oct · Morning') + chip(W - 292, 16, 80, 'People 7') + chip(W - 204, 16, 72, 'Words 9') + chip(W - 124, 16, 60, 'Bag 1') + menu(W - 56, 16);
  o += minimap(W - 16 - 90, 62 + 90, 180, 2.2, [32, -2.75]);
  o += `<rect x="${W - 196}" y="252" width="24" height="22" rx="5" fill="#eef0f4"/>` + text(W - 184, 268, 'M', 13, '#11151a', 700, 'text-anchor="middle"') + text(W - 164, 268, 'or click: the map', 12, 'rgba(255,255,255,0.75)');
  fs.writeFileSync(OUT + '/desktop-hud.svg', svg(W, H, o));
}
for (const n of ['phone-map', 'desktop-map', 'phone-hud', 'desktop-hud'])
  execFileSync('rsvg-convert', ['-o', `${OUT}/${n}.png`, `${OUT}/${n}.svg`]);
console.log('ok');
