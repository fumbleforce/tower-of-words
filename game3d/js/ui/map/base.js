// The island drawn for the game's map and the minimap (docs/game/controls-and-ui.md, The map): sea, land, sand,
// green, paths and buildings straight from scenes/island-layout.js, in the HUD's slate. The shapes are built once
// as Path2D in island units and drawn through the view's transform, so a pan or a zoom is one redraw and nothing is
// kept per zoom level. North (the grid's north, -z) is up.
import { BUILDINGS, PATHS, GREEN, COAST, SAND, HALF_EDGE, footprint } from '../../scenes/island-layout.js';

export const INK = {
  sea: '#101a24',
  land: '#1f252d',
  north: '#1a1f26',
  green: '#26332d',
  sand: '#2e3236',
  path: '#39424e',
  lane: '#424c59',
  bld: '#3d4552',
  bldEdge: '#4d5767',
  beam: '#4a5361',
  coast: '#2c3a48',
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
    north: poly([...HALF_EDGE, [140, -400], [-154, -400]]),
    sand: newPath(),
    green: newPath(),
    flat: { path: newPath(), lane: newPath() }, // rects and circles, filled
    lines: [], // [{ path, w, lane, beam }], stroked at their width
    blds: newPath(),
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
  for (const b of BUILDINGS) poly(footprint(b), L.blds);
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
  ctx.fillStyle = INK.land;
  ctx.fill(L.land);
  ctx.fillStyle = INK.north;
  ctx.fill(L.north);
  ctx.fillStyle = INK.sand;
  ctx.fill(L.sand);
  ctx.fillStyle = INK.green;
  ctx.fill(L.green);
  ctx.fillStyle = INK.path;
  ctx.fill(L.flat.path);
  ctx.fillStyle = INK.lane;
  ctx.fill(L.flat.lane);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const l of L.lines) {
    if (l.beam) continue;
    ctx.strokeStyle = l.lane ? INK.lane : INK.path;
    ctx.lineWidth = l.w;
    ctx.stroke(l.path);
  }
  ctx.fillStyle = INK.bld;
  ctx.fill(L.blds);
  ctx.strokeStyle = INK.bldEdge;
  ctx.lineWidth = 1 / v.scale;
  ctx.stroke(L.blds);
  // the monorail's beam, dashed, over the ground
  ctx.lineCap = 'butt';
  ctx.strokeStyle = INK.beam;
  ctx.setLineDash([2, 1.2]);
  for (const l of L.lines) {
    if (!l.beam) continue;
    ctx.lineWidth = l.w * 0.6;
    ctx.stroke(l.path);
  }
  ctx.setLineDash([]);
  ctx.strokeStyle = INK.coast;
  ctx.lineWidth = 2 / v.scale;
  ctx.stroke(L.coast);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// island point -> css px in the view, and back
export const toView = (v, x, z) => [v.w / 2 + (x - v.cx) * v.scale, v.h / 2 + (z - v.cz) * v.scale];
export const fromView = (v, px, py) => [v.cx + (px - v.w / 2) / v.scale, v.cz + (py - v.h / 2) / v.scale];
