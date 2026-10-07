// Cartographic land cover, clipped to the built layout. The small crowns are symbols,
// not additional world geometry; individually plotted trees use the builders' coordinates.
import { GREEN, MOWN } from '../../scenes/island-layout.js';
import { WEST_TREES, WEST_BEDS } from '../../scenes/island-west.js';
import { SOUTH_TREES, SOUTH_SHRUBS, UMBRELLAS, HUTS } from '../../scenes/island-south.js';
import { OFFICE_BELTS } from '../../scenes/office-quarter/planting-plan.js';
import { rectPts, shape } from './shapes.js';
import {
  CAMPUS_GARDENS,
  CAMPUS_TREES,
  PRINT_FOUNDATIONS,
  PRINT_SERVICE_PAD,
} from '../../scenes/campus/landscape-plan.js';

export const plantedTrees = [...WEST_TREES, ...SOUTH_TREES, ...CAMPUS_TREES];
export function polygonContains(points, x, z) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [a, b] = points[i],
      [c, d] = points[j];
    if (b > z !== d > z && x < ((c - a) * (z - b)) / (d - b) + a) inside = !inside;
  }
  return inside;
}
// Sparse irregular marks describe planted areas without the stamped grid of a texture tile.
export function coverMarks(regions = GREEN) {
  return regions.flatMap((g, index) => {
    const points = g.poly || rectPts(g.rect),
      xs = points.map((p) => p[0]),
      zs = points.map((p) => p[1]);
    const x0 = Math.min(...xs),
      z0 = Math.min(...zs),
      w = Math.max(...xs) - x0,
      h = Math.max(...zs) - z0;
    let seed = index + 812;
    const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
    const out = [],
      grove = /grove|trees|onsen/.test(g.id);
    for (let i = 0; i < Math.min(150, (w * h) / (grove ? 15 : 24)); i++) {
      const x = x0 + random() * w,
        z = z0 + random() * h,
        r = 0.45 + random() * (grove ? 1.5 : 0.65);
      if (polygonContains(points, x, z)) out.push({ x, z, r, grove, region: g.id });
    }
    return out;
  });
}
export const officeRegions = OFFICE_BELTS.map(([r], i) => ({
  id: `office-grove-${i}`,
  rect: [r[0], r[2], r[1], r[3]],
}));
let marks, officeMarks;
export function drawLandCover(ctx, greenPath, detail) {
  ctx.save();
  ctx.clip(greenPath);
  for (const m of MOWN) {
    if (!m.rect) continue;
    const [x, z, x1, z1] = m.rect;
    ctx.fillStyle = '#c3cd9d';
    ctx.fillRect(x, z, x1 - x, z1 - z);
  }
  if (detail)
    for (const m of (marks ||= coverMarks())) {
      ctx.beginPath();
      ctx.ellipse(m.x, m.z, m.r * 1.5, m.r, -0.35, 0, Math.PI * 2);
      ctx.fillStyle = m.grove ? '#849c70' : '#a4b586';
      ctx.fill();
      if (m.grove) {
        ctx.beginPath();
        ctx.arc(m.x - m.r * 0.2, m.z - m.r * 0.2, m.r * 0.65, 0, Math.PI * 2);
        ctx.fillStyle = '#9db584';
        ctx.fill();
      }
    }
  ctx.restore();
  ctx.fillStyle = '#aabd8d';
  for (const {
    rect: [x, z, x1, z1],
  } of officeRegions)
    ctx.fillRect(x, z, x1 - x, z1 - z);
  if (detail) for (const m of (officeMarks ||= coverMarks(officeRegions))) crown(ctx, m.x, m.z, m.r * 0.8);
}
export function crown(ctx, x, z, size) {
  ctx.beginPath();
  ctx.arc(x + 0.4, z + 0.45, size, 0, Math.PI * 2);
  ctx.fillStyle = '#6f87685c';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, z, size, 0, Math.PI * 2);
  ctx.fillStyle = '#5c8064';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - size * 0.2, z - size * 0.23, size * 0.7, 0, Math.PI * 2);
  ctx.fillStyle = '#88a57a';
  ctx.fill();
}
export function drawPlanting(ctx, detail) {
  ctx.fillStyle = '#919787';
  for (const garden of CAMPUS_GARDENS) {
    shape(ctx, (x, z) => [x, z], garden.poly);
    ctx.fill();
  }
  ctx.fillStyle = '#c0bfb0';
  for (const [x, z, x1, z1] of [...PRINT_FOUNDATIONS, PRINT_SERVICE_PAD]) ctx.fillRect(x, z, x1 - x, z1 - z);
  ctx.fillStyle = '#6f916c';
  for (const [x, z, x1, z1] of WEST_BEDS) ctx.fillRect(x, z, x1 - x, z1 - z);
  if (!detail) return;
  for (const [, x, z, size] of plantedTrees) crown(ctx, x, z, size);
  ctx.fillStyle = '#729268';
  for (const [x, z] of SOUTH_SHRUBS) {
    ctx.beginPath();
    ctx.arc(x, z, 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const [x, z] of UMBRELLAS) {
    ctx.beginPath();
    ctx.arc(x, z, 0.95, 0, Math.PI * 2);
    ctx.fillStyle = '#ece2c8';
    ctx.fill();
    ctx.strokeStyle = '#aa8764';
    ctx.lineWidth = 0.2;
    ctx.stroke();
  }
  ctx.fillStyle = '#ae7f61';
  for (const [x, z] of HUTS) ctx.fillRect(x - 0.8, z - 0.6, 1.6, 1.2);
}
export function drawSea(ctx, coastPath) {
  // Bathymetric bands are graphic coast offsets, not invented navigable islands.
  for (const [width, color] of [
    [42, '#244952'],
    [27, '#2c5660'],
    [15, '#386d73'],
    [6, '#67918c'],
  ]) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke(coastPath);
  }
  ctx.strokeStyle = '#8cb0a566';
  ctx.lineWidth = 0.25;
  ctx.setLineDash([3, 4]);
  ctx.stroke(coastPath);
  ctx.setLineDash([]);
}
