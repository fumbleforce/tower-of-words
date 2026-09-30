// The island map (dev flag ?map=1, key M). "Built places": every built place drawn from above where the island
// layout (scenes/island-layout.js) puts it, with Eric. "Compare" (?mapcompare=1): the same drawings over the
// picked island map, rectified to the island frame (or "As drawn", on the original image), with the layout's
// buildings, paths and walk rectangles, a slider for how strongly the built places show, and landmark pairs.
import { CHUNKS, REF, toIsland, toImage } from '../scenes/island-layout.js';
import { renderAll } from './render.js';
import { rectify, localAffine, landmarkGaps, seamGaps } from './reference.js';
import { drawLayout, tag } from './layers.js';
import { PLACE_NAMES } from '../places/definitions.js';

const CSS = `
#map-screen{position:fixed;inset:0;z-index:9000;background:#15181d;color:#e6e9ee;font:14px/1.35 system-ui,sans-serif;
  display:none;touch-action:none;user-select:none}
#map-screen.open{display:block}
#map-screen canvas{position:absolute;inset:0;width:100%;height:100%;cursor:grab}
#map-screen .bar{position:absolute;top:8px;left:8px;right:8px;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
#map-screen button,#map-screen label{background:#262b33;border:1px solid #3a414c;color:#e6e9ee;border-radius:6px;
  padding:5px 9px;font:inherit;display:inline-flex;align-items:center;gap:6px;cursor:pointer}
#map-screen button.on{background:#2f6f73;border-color:#3f8f94}
#map-screen .close{margin-left:auto}
#map-screen input[type=range]{width:110px}
#map-screen .info{position:absolute;left:8px;bottom:8px;max-width:min(560px,calc(100% - 16px));background:#1d2127e6;
  border:1px solid #333a44;border-radius:6px;padding:8px 10px;font-size:12px;white-space:pre-line}
#map-open{position:fixed;left:10px;bottom:84px;z-index:8000;background:#262b33e6;border:1px solid #3a414c;color:#e6e9ee;
  border-radius:6px;padding:7px 12px;font:14px system-ui,sans-serif}
`;
const OUTLINE = '#7fd1d6',
  B2 = '#b79cff',
  ERIC = '#ff6b6b',
  REF_MARK = '#7fd1d6',
  BUILT_MARK = '#ff6b6b';
const OPTS = ['layout', 'drawn', 'basement', 'backdrop'];

export function createMapScreen(game) {
  const S = { view: 'map', opacity: 0.75, layout: false, drawn: false, basement: false, backdrop: false };
  Object.assign(S, { whole: false, zoom: 1, pan: [0, 0], renders: null });
  const gaps = landmarkGaps(),
    seams = seamGaps();
  let root,
    canvas,
    info,
    slider,
    refImage,
    rectified = null,
    refFailed = false,
    drawing = null;

  function build() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    root = document.createElement('div');
    root.id = 'map-screen';
    root.innerHTML = `<canvas></canvas><div class="bar">
      <button data-view="map">Built places</button><button data-view="compare">Compare with island-map-4</button>
      <label><input type="checkbox" data-opt="layout"> Layout</label>
      <label class="cmp"><input type="checkbox" data-opt="drawn"> As drawn</label>
      <label><input type="checkbox" data-opt="basement"> B2</label>
      <label><input type="checkbox" data-opt="backdrop"> Backdrop</label>
      <label class="cmp">Built <input type="range" min="0" max="100" value="75"></label>
      <button data-act="route">Built route</button><button data-act="whole">Whole map</button><button data-act="in">+</button><button data-act="out">−</button>
      <button class="close" data-act="close">Close (M)</button></div><div class="info"></div>`;
    document.body.appendChild(root);
    canvas = root.querySelector('canvas');
    info = root.querySelector('.info');
    slider = root.querySelector('input[type=range]');
    root.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.view) show({ view: b.dataset.view, layout: b.dataset.view === 'compare', focus: null });
      if (b.dataset.act === 'close') close();
      if (b.dataset.act === 'in' || b.dataset.act === 'out') zoomBy(b.dataset.act === 'in' ? 1.5 : 1 / 1.5);
      if (b.dataset.act === 'route' || b.dataset.act === 'whole')
        show({ whole: b.dataset.act === 'whole', focus: null });
    });
    root.addEventListener('change', (e) => {
      const o = e.target.dataset?.opt;
      if (o) show({ [o]: e.target.checked });
    });
    slider.addEventListener('input', () => ((S.opacity = slider.value / 100), draw()));
    // wheel to zoom about the pointer (+ and − about the middle), drag to pan
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      zoomBy(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2);
    });
    let drag = null;
    canvas.addEventListener(
      'pointerdown',
      (e) => ((drag = [e.clientX, e.clientY]), canvas.setPointerCapture(e.pointerId)),
    );
    canvas.addEventListener('pointermove', (e) => {
      if (!drag) return;
      S.pan[0] += e.clientX - drag[0];
      S.pan[1] += e.clientY - drag[1];
      drag = [e.clientX, e.clientY];
      draw();
    });
    canvas.addEventListener('pointerup', () => (drag = null));
    window.addEventListener('resize', () => isOpen() && draw());
    refImage = new Image();
    refImage.onload = () => {
      rectified = rectify(refImage);
      if (isOpen()) draw();
    };
    refImage.onerror = () => ((refFailed = true), isOpen() && draw());
    refImage.src = REF.image;
  }

  const isOpen = () => !!root && root.classList.contains('open');
  // zoom by k about a point given from the canvas middle (CSS px)
  function zoomBy(k, x = 0, y = 0) {
    const z = Math.min(16, Math.max(0.5, S.zoom * k));
    S.pan[0] -= (x - S.pan[0]) * (z / S.zoom - 1);
    S.pan[1] -= (y - S.pan[1]) * (z / S.zoom - 1);
    S.zoom = z;
    draw();
  }
  // change what is shown; the view and the framing reset zoom and pan
  function show(opts) {
    if (['view', 'whole', 'drawn', 'focus'].some((k) => k in opts)) ((S.zoom = 1), (S.pan = [0, 0]));
    Object.assign(S, opts);
    if (opts.opacity != null) slider.value = Math.round(opts.opacity * 100);
    for (const o of OPTS) root.querySelector(`[data-opt=${o}]`).checked = !!S[o];
    for (const b of root.querySelectorAll('[data-view]')) b.classList.toggle('on', b.dataset.view === S.view);
    for (const el of root.querySelectorAll('.cmp')) el.style.display = S.view === 'compare' ? '' : 'none';
    draw();
  }
  // opts: layout, drawn, basement, backdrop, whole (frame the whole reference), focus (frame one place), opacity
  async function open(view = S.view, opts = {}) {
    if (!root) build();
    root.classList.add('open');
    show({
      view,
      layout: view === 'compare',
      drawn: false,
      whole: false,
      focus: null,
      basement: false,
      backdrop: false,
      ...opts,
    });
    drawing ||= renderAll(game, (name, r) => {
      (S.renders ||= {})[name] = r;
      draw();
    }).then((all) => {
      S.renders = all;
      draw();
    });
    await drawing;
  }
  function close() {
    root?.classList.remove('open');
  }

  const compare = () => S.view === 'compare';
  const drawnView = () => compare() && S.drawn;
  // island point to world (island units, or reference px when "As drawn")
  const world = (x, z) => (drawnView() ? toImage(x, z) : [x, z]);
  function frame(w, h) {
    let xs = [],
      zs = [];
    if (compare() && S.whole) {
      if (drawnView()) ((xs = [0, REF.size[0]]), (zs = [0, REF.size[1]]));
      else if (rectified) {
        xs = [rectified.x0, rectified.x0 + rectified.canvas.width / rectified.ppu];
        zs = [rectified.z0, rectified.z0 + rectified.canvas.height / rectified.ppu];
      }
    }
    if (!xs.length)
      for (const [name, c] of Object.entries(CHUNKS)) {
        if ((c.level < 0 && !S.basement && S.focus !== name) || (S.focus && S.focus !== name)) continue;
        const [x0, x1, z0, z1] = c.view;
        for (const [x, z] of [
          [x0, z0],
          [x1, z0],
          [x0, z1],
          [x1, z1],
        ]) {
          const [u, v] = world(...toIsland(name, x, z));
          xs.push(u);
          zs.push(v);
        }
      }
    const b = [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
    if (S.focus) {
      // one place, with its surroundings
      const px = (b[2] - b[0]) * 0.4,
        pz = (b[3] - b[1]) * 0.4;
      b.splice(0, 4, b[0] - px, b[1] - pz, b[2] + px, b[3] + pz);
    }
    const top = 48,
      s = Math.min(w / (b[2] - b[0]), (h - top) / (b[3] - b[1])) * 0.95 * S.zoom;
    return {
      s,
      ox: w / 2 + S.pan[0] - ((b[0] + b[2]) / 2) * s,
      oy: (top + h) / 2 + S.pan[1] - ((b[1] + b[3]) / 2) * s,
    };
  }

  function draw() {
    if (!isOpen()) return;
    const dpr = window.devicePixelRatio || 1,
      w = canvas.clientWidth,
      h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#15181d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const F = frame(w, h);
    const base = [F.s * dpr, 0, 0, F.s * dpr, F.ox * dpr, F.oy * dpr];
    const P = (x, z) => {
      const [u, v] = world(x, z);
      return [F.ox + u * F.s, F.oy + v * F.s];
    };
    ctx.setTransform(...base);
    if (drawnView() && !refFailed) ctx.drawImage(refImage, 0, 0);
    else if (compare() && rectified) {
      const r = rectified;
      ctx.drawImage(r.canvas, r.x0, r.z0, r.canvas.width / r.ppu, r.canvas.height / r.ppu);
    }
    ctx.globalAlpha = compare() ? S.opacity : 1;
    for (const name of order()) drawPlace(ctx, base, name);
    ctx.globalAlpha = 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (S.layout) drawLayout(ctx, P);
    for (const name of order()) outline(ctx, P, name);
    if (compare()) landmarks(ctx, P);
    eric(ctx, P);
    info.textContent = compare() ? compareText() : mapText();
  }
  // the basement under everything, then the train (its platforms reach over the ground places), the ground, upstairs
  const depth = (n) => (n === 'train' ? -0.5 : CHUNKS[n].level);
  const order = () =>
    Object.keys(CHUNKS)
      .filter((n) => CHUNKS[n].level >= 0 || S.basement)
      .sort((a, b) => depth(a) - depth(b));

  function drawPlace(ctx, base, name) {
    const r = S.renders?.[name];
    if (!r) return;
    const c = CHUNKS[name],
      t = (c.turn * Math.PI) / 180;
    ctx.save();
    ctx.setTransform(...base);
    if (drawnView()) ctx.transform(...localAffine(name));
    ctx.transform(Math.cos(t) * c.scale, Math.sin(t) * c.scale, -Math.sin(t) * c.scale, Math.cos(t) * c.scale, ...c.at);
    if (!S.backdrop) {
      const [x0, x1, z0, z1] = c.view;
      ctx.beginPath();
      ctx.rect(x0, z0, x1 - x0, z1 - z0);
      ctx.clip();
    }
    ctx.drawImage(r.canvas, r.x0, r.z0, r.canvas.width / r.ppu, r.canvas.height / r.ppu);
    ctx.restore();
  }
  function outline(ctx, P, name) {
    const c = CHUNKS[name];
    const [x0, x1, z0, z1] = c.view;
    const pts = [
      [x0, z0],
      [x1, z0],
      [x1, z1],
      [x0, z1],
    ].map(([x, z]) => P(...toIsland(name, x, z)));
    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = c.level < 0 ? B2 : OUTLINE;
    ctx.setLineDash(c.level ? [6, 4] : []);
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p)));
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    const [sx, sy] = P(...toIsland(name, (x0 + x1) / 2, z0));
    const note = c.level < 0 ? ' (B2)' : c.level > 0 ? ' (up)' : '';
    tag(ctx, PLACE_NAMES[name] + note, sx, sy + 12, c.level < 0 ? B2 : OUTLINE);
  }
  function landmarks(ctx, P) {
    for (const g of gaps) {
      const a = P(...g.refAt),
        b = P(...g.built);
      ctx.strokeStyle = '#ffffffdd';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(...a);
      ctx.lineTo(...b);
      ctx.stroke();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = REF_MARK;
      ctx.beginPath();
      ctx.arc(...a, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = BUILT_MARK;
      ctx.beginPath();
      ctx.arc(...b, 4.5, 0, Math.PI * 2);
      ctx.fill();
      tag(ctx, g.anchor ? `${g.label} (anchor)` : `${g.label} ${g.units.toFixed(1)}`, a[0], a[1] - 15, REF_MARK);
    }
  }
  function eric(ctx, P) {
    const name = game.place?.name,
      o = game.player?.root;
    if (!CHUNKS[name] || !o) return;
    const [x, z] = toIsland(name, o.position.x, o.position.z);
    const f = o.rotation.y - (CHUNKS[name].turn * Math.PI) / 180; // facing (sin, cos), turned with the place
    const [sx, sy] = P(x, z),
      [fx, fy] = P(x + Math.sin(f), z + Math.cos(f));
    const a = Math.atan2(fy - sy, fx - sx);
    ctx.fillStyle = ERIC;
    ctx.strokeStyle = '#15181d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx + Math.cos(a) * 13, sy + Math.sin(a) * 13);
    ctx.arc(sx, sy, 7, a + 2.3, a - 2.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    tag(ctx, 'Eric', sx, sy + 22, ERIC);
  }
  function progress() {
    const n = Object.keys(S.renders || {}).length,
      all = Object.keys(CHUNKS).length;
    return n < all ? `Drawing the places from above: ${n} of ${all}\n` : '';
  }
  function mapText() {
    return (
      progress() +
      'Each built place drawn from above where scenes/island-layout.js puts it; dashed outlines are upstairs or B2. ' +
      'Walks between outdoor places crossfade, so the places need not touch. Backdrop: each place’s own background.'
    );
  }
  function compareText() {
    const worst = gaps.filter((g) => !g.anchor).sort((a, b) => b.units - a.units);
    return (
      progress() +
      (refFailed ? `Reference image not found at ${REF.image} (served from the main checkout)\n` : '') +
      (S.drawn
        ? 'On the reference as drawn. '
        : 'The reference rectified onto the island frame (tall buildings lean north). ') +
      'Pink: layout buildings. White: paths. Red: walk rectangles. Ring: the thing on island-map-4; dot: as built. ' +
      'Units apart (1 unit = 1.5 m):\n' +
      worst.map((g) => `${g.label} ${g.units.toFixed(1)}`).join(' · ') +
      '\nCrossfaded walks skip: ' +
      seams.map((s) => `${PLACE_NAMES[s.from]} to ${PLACE_NAMES[s.to]} ${s.units.toFixed(0)}`).join(' · ')
    );
  }

  return {
    open,
    close,
    isOpen,
    draw,
    show,
    gaps,
    seams,
    get ready() {
      return drawing;
    },
  };
}
