// Drawings for Direct the shot: the stage (the picture's frame with a stand-in figure per person, at the shot's size,
// angle, lens and pose) and the small diagrams on the shot size, angle, lens, facing and light tiles. Geometry comes
// from image-stage.js; this file only draws.
import {esc} from './common.js';
import {figures} from './image-stage.js';

export const PERSON_COLOURS = ['#86b8f0', '#f09ab4', '#93d6a0', '#f0bf86', '#b9a2f0', '#8fd3d6'];
const f = n => Math.round(n * 100) / 100;

// One stand-in at unit u (frame units per head height), head top at y0, centred on x. dir: -1 image left, 1 image
// right, 0 to the camera, 2 away. Coordinates are in frame units × 100.
function figure({x, y0, u, dir, shape, fill, stroke, eyes = true, guide = false, gaze = ''}) {
  const U = u * 100, X = x, Y = y0 * 100;
  const sideOn = dir === -1 || dir === 1;
  const w = sideOn ? 0.62 : 1;
  const sh = 0.95 * U * w, hip = 0.72 * U * w;
  const lean = shape === 'lean' ? 6 : 0;
  const parts = [];
  // shoulders rounded, the waist a little in, the hips out again: a person at a glance, not a box
  const torso = `M${f(X - sh + 0.25 * U)} ${f(Y + 1.3 * U)} L${f(X + sh - 0.25 * U)} ${f(Y + 1.3 * U)} Q${f(X + sh)} ${f(Y + 1.32 * U)} ${f(X + sh)} ${f(Y + 1.7 * U)}`
    + ` L${f(X + hip * 0.86)} ${f(Y + 3.1 * U)} L${f(X + hip)} ${f(Y + 3.95 * U)} L${f(X - hip)} ${f(Y + 3.95 * U)} L${f(X - hip * 0.86)} ${f(Y + 3.1 * U)} L${f(X - sh)} ${f(Y + 1.7 * U)} Q${f(X - sh)} ${f(Y + 1.32 * U)} ${f(X - sh + 0.25 * U)} ${f(Y + 1.3 * U)} Z`;
  const arm = s => `M${f(X + s * sh)} ${f(Y + 1.45 * U)} L${f(X + s * (sh + 0.28 * U))} ${f(Y + 4.1 * U)} L${f(X + s * (sh + 0.02 * U))} ${f(Y + 4.15 * U)} L${f(X + s * (sh - 0.22 * U))} ${f(Y + 1.9 * U)} Z`;
  let legs;
  const lw = 0.3 * U * (sideOn ? 0.8 : 1);
  if (shape === 'sit') {
    const fwd = dir === -1 ? -1 : 1;
    legs = `M${f(X - hip)} ${f(Y + 3.7 * U)} L${f(X + fwd * 1.9 * U)} ${f(Y + 3.8 * U)} L${f(X + fwd * 1.9 * U)} ${f(Y + 5.9 * U)} L${f(X + fwd * 1.5 * U)} ${f(Y + 5.9 * U)} L${f(X + fwd * 1.5 * U)} ${f(Y + 4.5 * U)} L${f(X + hip)} ${f(Y + 4.5 * U)} Z`;
  } else if (shape === 'crouch') {
    legs = `M${f(X - hip)} ${f(Y + 3.7 * U)} L${f(X + hip)} ${f(Y + 3.7 * U)} L${f(X + 1.1 * U)} ${f(Y + 4.6 * U)} L${f(X + 0.6 * U)} ${f(Y + 5.4 * U)} L${f(X - 0.6 * U)} ${f(Y + 5.4 * U)} L${f(X - 1.1 * U)} ${f(Y + 4.6 * U)} Z`;
  } else {
    const spread = shape === 'walk' ? 0.85 * U : 0.18 * U;
    legs = `M${f(X - hip)} ${f(Y + 3.7 * U)} L${f(X + hip)} ${f(Y + 3.7 * U)} L${f(X + spread + lw)} ${f(Y + 7.5 * U)} L${f(X + spread - lw)} ${f(Y + 7.5 * U)} L${f(X)} ${f(Y + 4.6 * U)} L${f(X - spread + lw)} ${f(Y + 7.5 * U)} L${f(X - spread - lw)} ${f(Y + 7.5 * U)} Z`;
  }
  const line = stroke ? `stroke="${stroke}" stroke-width="${f(Math.max(0.6, U * 0.07))}" stroke-linejoin="round"` : '';
  parts.push(`<path d="${legs}" fill="${fill}" ${line}/>`, `<path d="${torso}" fill="${fill}" ${line}/>`);
  if (!sideOn) parts.push(`<path d="${arm(-1)}" fill="${fill}" ${line}/>`, `<path d="${arm(1)}" fill="${fill}" ${line}/>`);
  else parts.push(`<path d="${arm(dir * 0.2)}" fill="${fill}" ${line}/>`);
  parts.push(`<rect x="${f(X - 0.17 * U)}" y="${f(Y + 0.85 * U)}" width="${f(0.34 * U)}" height="${f(0.6 * U)}" fill="${fill}"/>`);
  parts.push(`<ellipse cx="${f(X)}" cy="${f(Y + 0.5 * U)}" rx="${f(0.42 * U)}" ry="${f(0.5 * U)}" fill="${dir === 2 && !guide ? '#3b4250' : fill}" ${line}/>`);
  if (sideOn) parts.push(`<path d="M${f(X + dir * 0.38 * U)} ${f(Y + 0.45 * U)} L${f(X + dir * 0.55 * U)} ${f(Y + 0.62 * U)} L${f(X + dir * 0.36 * U)} ${f(Y + 0.7 * U)} Z" fill="${fill}"/>`);
  if (eyes && !guide && dir !== 2 && U > 2.5) {
    const ey = Y + (gaze === 'down' ? 0.6 : gaze === 'up' ? 0.4 : 0.5) * U, r = f(Math.max(0.35, 0.07 * U));
    const at = dir === 0 ? [-0.16, 0.16] : [dir * 0.22];
    for (const dx of at) parts.push(`<circle cx="${f(X + dx * U)}" cy="${f(ey)}" r="${r}" fill="#11151b"/>`);
  }
  const g = parts.join('');
  if (shape === 'lie') return `<g transform="rotate(-90 ${f(X)} ${f(Y + 0.5 * U)})">${g}</g>`;
  return lean ? `<g transform="rotate(${lean} ${f(X)} ${f(Y + 7.5 * U)})">${g}</g>` : g;
}
const DIR = {left: -1, right: 1, camera: 0, away: 2, '': 0};
function direction(p, list) {
  if (p.facing !== 'partner') return DIR[p.facing] ?? 0;
  const other = list.find(q => q.id === (p.toward || '')) || list.find(q => q.id !== p.id);
  return other ? (other.x >= p.x ? 1 : -1) : 0;
}

// The stage: people [{id, name, female}] in the shot's order; aspect = width / height; selected = a person's id.
// guide: grey-scale figures on black, near ones lighter, as a depth guide picture would want them (not sent yet: the
// words alone placed people well in the 2026-10-11 test, notes/tools/scene-editor.md).
export function stageSvg(c, presets, people, {aspect, selected = '', guide = false} = {}) {
  const A = aspect * 100, geo = figures(c, presets, people), {cam} = geo;
  const colour = id => PERSON_COLOURS[Math.max(0, people.findIndex(p => p.id === id)) % PERSON_COLOURS.length];
  const H = f(Math.max(-40, Math.min(140, geo.horizon * 100)));
  const out = [];
  if (cam.angle === 'top') {
    out.push(`<rect width="${f(A)}" height="100" fill="${guide ? '#3a3a3a' : '#232a33'}"/>`);
    if (!guide) for (let i = 1; i < 6; i++) out.push(`<line x1="${f(A * i / 6)}" y1="0" x2="${f(A * i / 6)}" y2="100" class="stage-grid"/>`, `<line x1="0" y1="${f(100 * i / 6)}" x2="${f(A)}" y2="${f(100 * i / 6)}" class="stage-grid"/>`);
    const r = Math.max(3, Math.min(22, geo.unit * 100 * 1.1));
    for (const p of [...geo.people].sort((a, b) => a.d - b.d)) {
      const x = p.x * A, y = 18 + 70 * (1 - p.d), d = direction(p, geo.people);
      const ang = d === -1 ? 180 : d === 1 ? 0 : d === 2 ? 270 : 90;
      const fill = guide ? '#d0d0d0' : colour(p.id);
      out.push(`<g data-fig="${esc(p.id)}" class="stage-fig${p.id === selected ? ' on' : ''}"><ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r)}" ry="${f(r * 0.48)}" fill="${fill}" transform="rotate(${ang - 90} ${f(x)} ${f(y)})"/>
        <circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.42)}" fill="${guide ? '#f0f0f0' : '#3b4250'}" stroke="${fill}" stroke-width="1"/>
        ${guide ? '' : `<path d="M${f(x)} ${f(y)} l${f(Math.cos(ang * Math.PI / 180) * r * 0.9)} ${f(Math.sin(ang * Math.PI / 180) * r * 0.9)}" stroke="#11151b" stroke-width="1.4"/><text x="${f(x)}" y="${f(y - r * 0.7)}" class="stage-name">${esc(p.name)}</text>`}</g>`);
    }
  } else {
    if (guide) {
      out.push(`<rect width="${f(A)}" height="100" fill="#121212"/><defs><linearGradient id="gfloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c1c1c"/><stop offset="1" stop-color="#5a5a5a"/></linearGradient></defs>`);
      if (H < 100) out.push(`<rect y="${Math.max(0, H)}" width="${f(A)}" height="${f(100 - Math.max(0, H))}" fill="url(#gfloor)"/>`);
    } else {
      out.push(`<rect width="${f(A)}" height="100" fill="#1a1f27"/>`);
      if (H < 100) out.push(`<rect y="${Math.max(0, H)}" width="${f(A)}" height="${f(100 - Math.max(0, H))}" fill="#222a34"/>`);
      const vx = A / 2, spread = {'wide-lens': 2.6, normal: 1.6, long: 0.9, shallow: 1.4}[cam.lens] || 1.6;
      if (H < 100) for (let i = -4; i <= 4; i++) out.push(`<line x1="${f(vx)}" y1="${H}" x2="${f(vx + i * A * spread / 4)}" y2="${f(H + (100 - H) * 3)}" class="stage-grid"/>`);
      if (H > 0 && H < 100) out.push(`<line x1="0" y1="${H}" x2="${f(A)}" y2="${H}" class="stage-horizon"/>`);
    }
    for (const p of geo.people) {
      const d = direction(p, geo.people);
      const grey = Math.round(110 + 135 * p.k);
      const fill = guide ? `rgb(${grey},${grey},${grey})` : colour(p.id);
      const blur = !guide && cam.lens === 'shallow' && p.d > 0.4 ? ' opacity=".55"' : '';
      out.push(`<g data-fig="${esc(p.id)}" class="stage-fig${p.id === selected ? ' on' : ''}"${blur}>${figure({x: p.x * A, y0: p.headTop, u: p.unit, dir: d, shape: geo.pose, fill, guide, gaze: p.gaze,
        stroke: guide ? '' : p.id === selected ? '#f4f6f8' : 'rgba(10,12,16,.55)'})}</g>`);
    }
    if (!guide) {
      // what each person looks at, and their name over the head (kept inside the frame)
      for (const p of geo.people) {
        const target = p.gaze === 'partner' ? geo.people.find(q => q.id === (p.lookAt || '') && q.id !== p.id) || geo.people.find(q => q.id !== p.id) : null;
        const ey = (p.headTop + 0.5 * p.unit) * 100;
        if (target) out.push(`<line x1="${f(p.x * A)}" y1="${f(ey)}" x2="${f(target.x * A)}" y2="${f((target.headTop + 0.5 * target.unit) * 100)}" class="stage-gaze"/>`);
        const ty = Math.max(5, Math.min(97, p.headTop * 100 - 2));
        out.push(`<text x="${f(p.x * A)}" y="${f(ty)}" class="stage-name${p.id === selected ? ' on' : ''}">${esc(p.name)}</text>`);
      }
    }
  }
  const tilt = cam.tilt ? ` transform="rotate(-7 ${f(A / 2)} 50)"` : '';
  return `<svg class="stage-svg" viewBox="0 0 ${f(A)} 100" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Where the people stand in the picture">
    <defs><clipPath id="stageClip${guide ? 'G' : ''}"><rect width="${f(A)}" height="100"/></clipPath></defs><g clip-path="url(#stageClip${guide ? 'G' : ''})"><g${tilt}>${out.join('')}</g></g>
    ${guide ? '' : `<rect width="${f(A)}" height="100" class="stage-frame"/>`}</svg>`;
}

// Drag a figure on the stage: sideways places it, up and down moves it back and forward. onMove(id, {x, d}) while
// dragging (redraw only), onDone(id, {x, d}) once at the end; onPick(id) on a click.
export function bindStage(host, {get, onMove, onDone, onPick}) {
  // the handlers sit on the stage's box, which stays while the drawing inside it is redrawn during a drag
  host.onpointerdown = e => {
    const g = e.target.closest('[data-fig]'); if (!g) return;
    e.preventDefault();
    const id = g.dataset.fig, start = get(id), box = host.querySelector('.stage-svg').getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    let moved = false, now = start;
    host.setPointerCapture(e.pointerId);
    host.onpointermove = m => {
      const dx = (m.clientX - sx) / box.width, dy = (m.clientY - sy) / box.height;
      if (Math.abs(dx) + Math.abs(dy) > 0.01) moved = true;
      now = {x: Math.max(0.04, Math.min(0.96, start.x + dx)), d: Math.max(0, Math.min(1, start.d - dy * 1.6))};
      if (moved) onMove(id, now);
    };
    host.onpointerup = host.onpointercancel = () => {
      host.onpointermove = host.onpointerup = host.onpointercancel = null;
      if (moved) onDone(id, now); else onPick(id);
    };
  };
}

// The small diagrams on the tiles (shot size, angle, lens, other camera words, light direction, facing).
const one = (c, x = 0.5) => ({cameras: [], ...c, stage: {people: {a: {x, d: 0, placed: true, ...(c.who || {})}}}});
export function diagramSvg(kind, name) {
  const wrap = (body, vb = '0 0 48 34') => `<svg class="dia" viewBox="${vb}" aria-hidden="true">${body}</svg>`;
  const person = [{id: 'a', name: ''}];
  if (kind === 'shot') {
    const presets = {camera: [{id: 's', data: {group: 'shot', diagram: name}}]};
    const g = figures(one({cameras: ['s']}), presets, person).people[0];
    const fig = figure({x: 70.6, y0: g.headTop, u: g.unit, dir: 0, shape: 'stand', fill: '#c9d3df', eyes: true});
    return wrap(`<rect width="141.2" height="100" fill="#1a1f27"/><g clip-path="url(#diaClip)">${fig}</g><defs><clipPath id="diaClip"><rect width="141.2" height="100"/></clipPath></defs>`, '0 0 141.2 100');
  }
  if (kind === 'angle') {
    const cam = {eye: [8, 12, 0], high: [6, 3, 32], low: [6, 30, -32], top: [24, 2, 90]}[name];
    if (!cam) return '';
    const [cx, cy, a] = cam;
    const body = '<rect x="30" y="6" width="5" height="5" rx="2.5" fill="#c9d3df"/><path d="M29 12h7l-1 12h-5z" fill="#c9d3df"/><path d="M30 24h2v8h-2zM33 24h2v8h-2z" fill="#c9d3df"/><line x1="2" y1="32.5" x2="46" y2="32.5" stroke="#4a5462"/>';
    const camera = `<g transform="translate(${cx} ${cy}) rotate(${a})"><rect x="-4" y="-2.5" width="8" height="5" rx="1" fill="#6fd0c6"/><path d="M4 -1.5l3 -1.5v6l-3 -1.5z" fill="#6fd0c6"/></g>`;
    const ray = `<line x1="${cx}" y1="${cy}" x2="32.5" y2="${name === 'top' ? 9 : 12}" stroke="#6fd0c6" stroke-dasharray="1.5 1.5"/>`;
    return wrap(body + ray + camera);
  }
  if (kind === 'lens') {
    const half = {'wide-lens': 15, normal: 8, long: 3.5, shallow: 8}[name];
    if (half == null) return '';
    const far = name === 'shallow' ? '<circle cx="40" cy="17" r="4" fill="#c9d3df" opacity=".35"/><circle cx="26" cy="17" r="3" fill="#c9d3df"/>' : '<circle cx="34" cy="17" r="3" fill="#c9d3df"/>';
    return wrap(`<path d="M7 17 L46 ${17 - half * 1.05} L46 ${17 + half * 1.05} Z" fill="rgba(111,208,198,.16)" stroke="#6fd0c6" stroke-width=".8"/>${far}<rect x="2" y="14" width="7" height="6" rx="1" fill="#6fd0c6"/>`);
  }
  if (kind === 'light') {
    const at = {front: [24, 31], left: [4, 14], right: [44, 14], back: [24, 3], above: [24, 2]}[name];
    const figure = '<rect width="48" height="34" fill="#1a1f27"/><circle cx="24" cy="12" r="4" fill="#8a94a3"/><path d="M18 17h12l-2 14h-8z" fill="#8a94a3"/>';
    if (name === 'none') return wrap(`${figure}<line x1="10" y1="31" x2="38" y2="31" stroke="#4a5462" stroke-dasharray="1.5 1.5"/>`);
    if (!at) return '';
    const rim = name === 'back' ? '<ellipse cx="24" cy="17" rx="6.5" ry="9" fill="none" stroke="#f3d27a" stroke-width="1"/>' : '';
    return wrap(`${figure}${rim}<circle cx="${at[0]}" cy="${at[1]}" r="2.6" fill="#f3d27a"/><line x1="${at[0]}" y1="${at[1]}" x2="${f(at[0] + (24 - at[0]) * 0.45)}" y2="${f(at[1] + (15 - at[1]) * 0.45)}" stroke="#f3d27a" stroke-width="1"/>`);
  }
  if (kind === 'facing') {
    const ang = {camera: 90, left: 180, right: 0, away: 270}[name];
    if (name === 'partner') return wrap('<circle cx="16" cy="17" r="6" fill="#c9d3df"/><path d="M22 17l5 -3v6z" fill="#6fd0c6"/><circle cx="36" cy="17" r="5" fill="none" stroke="#8a94a3" stroke-dasharray="1.5 1.5"/>');
    if (ang == null) return '';
    const r = ang * Math.PI / 180;
    return wrap(`<circle cx="24" cy="15" r="7" fill="#c9d3df"/><path d="M${f(24 + Math.cos(r) * 7)} ${f(15 + Math.sin(r) * 7)} l${f(Math.cos(r + 0.5) * -4)} ${f(Math.sin(r + 0.5) * -4)} M${f(24 + Math.cos(r) * 7)} ${f(15 + Math.sin(r) * 7)} l${f(Math.cos(r - 0.5) * -4)} ${f(Math.sin(r - 0.5) * -4)}" stroke="#6fd0c6" stroke-width="1.6"/><path d="M${f(24 + Math.cos(r) * 7)} ${f(15 + Math.sin(r) * 7)} L${f(24 + Math.cos(r) * 13)} ${f(15 + Math.sin(r) * 13)}" stroke="#6fd0c6" stroke-width="1.6"/><line x1="6" y1="32" x2="42" y2="32" stroke="#4a5462"/><text x="24" y="31" class="dia-cam">camera</text>`);
  }
  if (kind === 'other') {
    const d = {tilt: '<g transform="rotate(-12 24 17)"><rect x="8" y="5" width="32" height="24" fill="none" stroke="#6fd0c6"/><circle cx="24" cy="13" r="3.5" fill="#c9d3df"/><path d="M19 17h10l-1 12h-8z" fill="#c9d3df"/></g>',
      behind: '<circle cx="24" cy="10" r="5" fill="#3b4250" stroke="#c9d3df"/><path d="M16 16h16l-2 16h-12z" fill="#c9d3df"/>',
      side: '<circle cx="24" cy="10" r="5" fill="#c9d3df"/><path d="M28 9l3 2l-3 1z" fill="#c9d3df"/><path d="M20 16h8l-1 16h-6z" fill="#c9d3df"/>',
      pov: '<path d="M4 34 L14 22 L20 24 L12 34Z M44 34 L34 22 L28 24 L36 34Z" fill="#c9d3df"/><circle cx="24" cy="12" r="5" fill="none" stroke="#6fd0c6"/>',
      selfie: '<circle cx="20" cy="15" r="5" fill="#c9d3df"/><path d="M13 21h14l-2 13h-10z" fill="#c9d3df"/><path d="M26 22 L37 8" stroke="#c9d3df" stroke-width="2.4"/><rect x="34" y="3" width="6" height="9" rx="1" fill="#6fd0c6"/>',
      shoulder: '<circle cx="22" cy="10" r="5" fill="#3b4250" stroke="#c9d3df"/><path d="M14 16h16l-2 16h-12z" fill="#c9d3df"/><circle cx="17.5" cy="10" r="1" fill="#11151b"/>',
      viewer: '<circle cx="24" cy="14" r="8" fill="#c9d3df"/><circle cx="21" cy="14" r="1.2" fill="#11151b"/><circle cx="27" cy="14" r="1.2" fill="#11151b"/>'}[name];
    return d ? wrap(d) : '';
  }
  return '';
}
