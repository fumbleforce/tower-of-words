// The island drawn for the game's map and the minimap (docs/game/controls-and-ui.md, The map): sea, land, sand,
// green, paths and buildings straight from scenes/island-layout.js, with a shared coastal palette. The shapes are built once
// as Path2D in island units and drawn through the view's transform, so a pan or a zoom is one redraw and nothing is
// kept per zoom level. North (the grid's north, -z) is up.
import { drawLandCover, drawPlanting, drawSea, crown } from './terrain.js';
import { drawGardens } from './gardens.js';
import { mapFootprints, drawRoof, drawGroundLandmarks } from './landmarks.js';
import { BUILDINGS, PATHS, GREEN, COAST, SAND, footprint } from '../../scenes/island-layout.js';

export const INK = {
  sea: '#1b3a45',
  waterLine: '#355c69',
  coast: '#d6d1ab',
  land: '#d7d8b8',
  north: '#c7cca7',
  green: '#b3c494',
  greenEdge: '#94a97d',
  sand: '#e8d4a4',
  path: '#f3ecda',
  lane: '#e3c9a1',
  pathEdge: '#abae92',
  bld: '#a0a7a0',
  bldEdge: '#657770',
  roof: '#d7d9c4',
  shadow: '#75836a77',
  beam: '#526b71',
  fountain: '#71a8ae',
};
// what the map can be panned over: the built half of the island and its water
export const BOUNDS = { x0: -132, x1: 142, z0: -140, z1: 58 };

let layers = null;
const newPath = () => new window.Path2D();
function poly(pts, p = newPath()) {
  pts.forEach(([x, z], i) => (i ? p.lineTo(x, z) : p.moveTo(x, z)));
  p.closePath();
  return p;
}
const rectOf = ([x0, z0, x1, z1]) => [
  [x0, z0],
  [x1, z0],
  [x1, z1],
  [x0, z1],
];
function build() {
  const far = [
    [140, -124],
    [140, -400],
    [-154, -400],
  ];
  const L = {
    land: poly([...COAST.line, ...far]),
    sand: newPath(),
    green: newPath(),
    flat: { path: newPath(), lane: newPath() }, // rects and circles, filled
    lines: [], // [{ path, w, lane, beam }], stroked at their width
    blds: newPath(),
    roofs: [],
    coast: newPath(),
  };
  for (const g of SAND) poly(g.poly || rectOf(g.rect), L.sand);
  for (const g of GREEN) poly(g.poly || rectOf(g.rect), L.green);
  for (const p of PATHS) {
    const lane = p.kind === 'lane';
    if (p.line) {
      const path = newPath();
      p.line.forEach(([x, z], i) => (i ? path.lineTo(x, z) : path.moveTo(x, z)));
      L.lines.push({ path, w: p.w, lane, beam: p.kind === 'beam' });
    } else if (p.rect) poly(rectOf(p.rect), L.flat[lane ? 'lane' : 'path']);
    else if (p.circle) {
      const [x, z, r] = p.circle;
      const t = L.flat[lane ? 'lane' : 'path'];
      t.moveTo(x + r, z);
      t.arc(x, z, r, 0, Math.PI * 2);
    }
  }
  for (const b of mapFootprints(BUILDINGS, footprint)) {
    const points = b.points,
      path = poly(points);
    poly(points, L.blds);
    const xs = points.map((p) => p[0]),
      zs = points.map((p) => p[1]);
    L.roofs.push({
      path,
      id: b.id,
      storeys: b.storeys,
      kind: b.kind,
      roofType: b.roofType,
      box: [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)],
    });
  }
  COAST.line.forEach(([x, z], i) => (i ? L.coast.lineTo(x, z) : L.coast.moveTo(x, z)));
  return L;
}

// view: { cx, cz } (the island point at the canvas centre), scale (css px a unit), w, h (css px), dpr
export function drawBase(ctx, v) {
  layers ||= build();
  const L = layers,
    k = v.scale * v.dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = INK.sea;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(k, 0, 0, k, v.dpr * (v.w / 2 - v.cx * v.scale), v.dpr * (v.h / 2 - v.cz * v.scale));
  // Coast contours stay in the water: the land drawn next masks their inland half.
  ctx.lineJoin = 'round';
  drawSea(ctx, L.coast);
  ctx.fillStyle = INK.land;
  ctx.fill(L.land);
  ctx.save();
  ctx.clip(L.land);
  for (const key of ['sand', 'green']) {
    ctx.fillStyle = INK[key];
    ctx.fill(L[key]);
  }
  drawLandCover(ctx, L.green, v.detail !== false);
  ctx.strokeStyle = INK.greenEdge;
  ctx.lineWidth = 0.4;
  ctx.stroke(L.green);
  ctx.restore();
  ctx.lineCap = 'round';
  // A narrow verge separates pale paving from land and planting at every zoom.
  ctx.strokeStyle = INK.pathEdge;
  ctx.lineWidth = 0.6;
  ctx.stroke(L.flat.path);
  ctx.stroke(L.flat.lane);
  for (const l of L.lines) {
    if (l.beam) continue;
    ctx.lineWidth = l.w + 0.7;
    ctx.stroke(l.path);
  }
  ctx.fillStyle = INK.path;
  ctx.fill(L.flat.path);
  ctx.fillStyle = INK.lane;
  ctx.fill(L.flat.lane);
  ctx.strokeStyle = INK.path;
  for (const l of L.lines) {
    if (l.beam) continue;
    ctx.lineWidth = l.w;
    ctx.strokeStyle = l.lane ? INK.lane : INK.path;
    ctx.stroke(l.path);
  }
  drawPlanting(ctx, v.detail !== false);
  drawGardens(ctx, crown, v.detail !== false);
  drawGroundLandmarks(ctx, v.detail !== false);
  ctx.save();
  ctx.translate(0.7, 0.9);
  ctx.fillStyle = INK.shadow;
  ctx.fill(L.blds);
  ctx.restore();
  ctx.fillStyle = INK.bld;
  ctx.fill(L.blds);
  ctx.strokeStyle = INK.bldEdge;
  ctx.lineWidth = 0.45;
  ctx.stroke(L.blds);
  for (const roof of L.roofs) drawRoof(ctx, roof, v.detail !== false);
  // The fountain basin is a real landmark, centred in the existing paved circle.
  const fountain = PATHS.find((p) => p.id === 'fountain_plaza').circle;
  ctx.beginPath();
  ctx.arc(fountain[0], fountain[1], 4.3, 0, Math.PI * 2);
  ctx.fillStyle = INK.fountain;
  ctx.fill();
  ctx.strokeStyle = INK.path;
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(fountain[0], fountain[1], 1.2, 0, Math.PI * 2);
  ctx.fillStyle = INK.path;
  ctx.fill();
  // A rail centreline with ties is distinct from walkable paths.
  ctx.lineCap = 'butt';
  for (const l of L.lines) {
    if (!l.beam) continue;
    ctx.strokeStyle = INK.beam;
    ctx.lineWidth = 0.5;
    ctx.stroke(l.path);
    ctx.setLineDash([0.45, 1.4]);
    ctx.lineWidth = l.w;
    ctx.strokeStyle = l.lane ? INK.lane : INK.path;
    ctx.stroke(l.path);
  }
  ctx.setLineDash([]);
  ctx.strokeStyle = INK.coast;
  ctx.lineWidth = 0.55;
  ctx.stroke(L.coast);
  // The drawn south-half map ends here; fade its northern continuation rather than
  // suggesting a large empty, finished district beyond the mapped extent.
  if (v.detail !== false) {
    ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
    const edge = v.h / 2 + (BOUNDS.z0 - v.cz) * v.scale;
    if (edge > 0) {
      const fade = ctx.createLinearGradient(0, Math.max(0, edge - 45), 0, edge + 18);
      fade.addColorStop(0, '#e4e3ce');
      fade.addColorStop(1, '#e4e3ce00');
      ctx.fillStyle = fade;
      ctx.fillRect(0, 0, v.w, edge + 18);
      if (edge > 160) {
        ctx.font = '500 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#61746b';
        ctx.fillText('Northern island', v.w / 2, edge - 28);
      }
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// island point -> css px in the view, and back
export const toView = (v, x, z) => [v.w / 2 + (x - v.cx) * v.scale, v.h / 2 + (z - v.cz) * v.scale];
export const fromView = (v, px, py) => [v.cx + (px - v.w / 2) / v.scale, v.cz + (py - v.h / 2) / v.scale];
