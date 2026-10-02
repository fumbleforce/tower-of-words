// The map's "Day 2 plan" view (map/screen.js): the south half of the island as docs/game/island.md plans it. Over
// the built places it draws the layout's buildings, paths and green muted, the plan's streets, courts, piers, green,
// coast and one new building in their own ink (scenes/island-plan.js), the half's edge, and every place's name in
// English and Japanese.
import {
  BUILDINGS,
  PATHS,
  GREEN,
  COAST,
  HALF_EDGE,
  PLAN_COAST,
  PLAN_BUILDINGS,
  PLAN_PATHS,
  PLAN_GREEN,
  PLACES,
  footprint,
} from '../scenes/island-layout.js';
import { shape, rectPts, circlePts, ribbon } from './layers.js';

const INK = {
  building: '#c9ced6',
  path: '#9aa3ad',
  green: '#7fbf7a',
  coast: '#6fb7ff',
  plan: '#ffd36b',
  edge: '#ff8a65',
  label: '#ffffff',
  ja: '#ffe7a3',
};
// the half's frame on the map
export const HALF_BOUNDS = { x: [-158, 148], z: [-138, 54] };

const outlineOf = (p) => (p.line ? ribbon(p.line, p.w) : p.circle ? circlePts(p.circle) : rectPts(p.rect));
function fillStroke(ctx, P, pts, fill, stroke, width = 1.2, dash = []) {
  shape(ctx, P, pts);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.setLineDash(dash);
  ctx.lineWidth = width;
  ctx.strokeStyle = stroke;
  ctx.stroke();
  ctx.setLineDash([]);
}
const middle = (pts) => pts.reduce((s, [x, z]) => [s[0] + x / pts.length, s[1] + z / pts.length], [0, 0]);
// a place's label point: its building's footprint middle, or its own point
export function placePoint(p) {
  if (!p.b) return p.at;
  const b = BUILDINGS.find((o) => o.id === p.b) || PLAN_BUILDINGS.find((o) => o.id === p.b);
  return b ? middle(footprint(b)) : p.at;
}

export function drawPlan(ctx, P) {
  ctx.save();
  ctx.lineJoin = 'round';
  for (const line of [COAST.line, ...PLAN_COAST]) {
    ctx.strokeStyle = INK.coast;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 5]);
    shape(ctx, P, line, false);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const g of GREEN) fillStroke(ctx, P, g.poly || rectPts(g.rect), INK.green + '22', INK.green + '88', 1);
  for (const g of PLAN_GREEN) fillStroke(ctx, P, rectPts(g.rect), INK.green + '33', INK.plan, 1.2, [5, 4]);
  for (const p of PATHS) if (p.kind !== 'beam') fillStroke(ctx, P, outlineOf(p), INK.path + '33', INK.path + 'aa', 1);
  for (const p of PLAN_PATHS) fillStroke(ctx, P, outlineOf(p), INK.plan + '40', INK.plan, 1.4);
  for (const b of BUILDINGS) fillStroke(ctx, P, footprint(b), '#ffffff10', INK.building, 1.2);
  for (const b of PLAN_BUILDINGS) fillStroke(ctx, P, rectPts(b.rect), '#15181d99', INK.plan, 1.8);
  ctx.strokeStyle = INK.edge;
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 6]);
  shape(ctx, P, HALF_EDGE, false);
  ctx.stroke();
  ctx.setLineDash([]);
  const [ex, ez] = HALF_EDGE[1];
  label(ctx, ...P(ex + 30, ez - 4), 'North half (not mapped)', '', INK.edge, []);
  const placed = [];
  for (const p of PLACES) label(ctx, ...P(...placePoint(p)), p.en, p.ja, INK.label, placed);
  ctx.restore();
}

// a two-line label (English over Japanese) on a dark chip, nudged up or down until it overlaps no earlier label
function label(ctx, x, y, en, ja, color, placed) {
  ctx.font = '600 12px system-ui, sans-serif';
  const we = ctx.measureText(en).width;
  ctx.font = '500 12px "Noto Sans CJK JP", "Noto Sans JP", system-ui, sans-serif';
  const wj = ja ? ctx.measureText(ja).width : 0;
  const w = Math.max(we, wj) + 8,
    h = ja ? 30 : 16;
  let top = y - h / 2;
  for (const dy of [0, 16, -16, 32, -32, 48, -48, 64, -64]) {
    const t = y - h / 2 + dy;
    if (!placed.some((r) => x - w / 2 < r[2] && x + w / 2 > r[0] && t < r[3] && t + h > r[1])) {
      top = t;
      break;
    }
  }
  placed.push([x - w / 2, top, x + w / 2, top + h]);
  ctx.fillStyle = '#15181de0';
  ctx.fillRect(x - w / 2, top, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillText(en, x, top + 12);
  if (!ja) return;
  ctx.fillStyle = INK.ja;
  ctx.font = '500 12px "Noto Sans CJK JP", "Noto Sans JP", system-ui, sans-serif';
  ctx.fillText(ja, x, top + 26);
}
