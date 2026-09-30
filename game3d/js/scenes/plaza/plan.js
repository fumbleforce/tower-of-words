// The fountain plaza's plan (scenes/plaza.js): every zone from the island layout, in the chunk's frame (x east,
// z south), so the paving, the kerbs, the beds and the lamps line up with each other and with the buildings.
//
//   the circle: the map's round plaza, 23 across round the fountain, paved in rings with a dark border ring. Its
//   south edge is cut straight by the lane's north border: the plaza opens on to the lane there.
//   the lane (route_home): 3 wide, a U round the plaza: in from the west (from head office) at WZ, south at WX,
//   east along the plaza at LZ, north at EX, out east (to the dorms) at EZ. Where it turns, it also runs on straight
//   into the plaza: two short links, west and east, that meet the circle's border ring.
//   the ring bed: a planted band round the circle outside its border, cut open for the links and the terrace
//   the terrace: in front of the canteen, between its glazed front and the circle's north arc
//   the south verge: the lane's planted strip, an avenue, a lawn, and a footpath along the shop street's backs
import * as LAYOUT from '../island-layout.js';

const CHUNK = 'plaza';
export const local = ([x, z]) => LAYOUT.toLocal(CHUNK, x, z);
export const building = (id) => LAYOUT.BUILDINGS.find((b) => b.id === id);
const path = (id) => LAYOUT.PATHS.find((p) => p.id === id);
export const rad = (deg) => (deg * Math.PI) / 180;
const r2 = (v) => Math.round(v * 100) / 100;

// the circle and the fountain
const [PCX, PCZ, RADIUS] = path('fountain_plaza').circle;
export const F = local([PCX, PCZ]);
export const R = RADIUS;
export const BASIN = 4.3; // the map's basin, 8.6 across
export const BORDER = 0.42; // the dark border ring, inside R

// the lane: its centre lines from the layout
export const HALF = path('route_home').w / 2;
export const [LZ, WX, WZ, EX, EZ] = (() => {
  const pts = path('route_home').line.map(local);
  const i = pts.findIndex((p, k) => k + 1 < pts.length && p[0] < F[0] && pts[k + 1][0] > F[0] && p[1] > F[1]);
  return [r2(pts[i][1]), r2(pts[i][0]), r2(pts[i - 1][1]), r2(pts[i + 1][0]), r2(pts[i + 2][1])];
})();
export const LANE_N = LZ - HALF; // the lane's north edge along the plaza: where the circle is cut
export const LANE = {
  w: [-44, WX + HALF, WZ - HALF, WZ + HALF], // in from head office
  wl: [WX - HALF, WX + HALF, WZ + HALF, LZ - HALF], // the west leg, down to the plaza
  s: [WX - HALF, EX + HALF, LZ - HALF, LZ + HALF], // along the plaza (both corners)
  el: [EX - HALF, EX + HALF, EZ + HALF, LZ - HALF], // the east leg
  e: [EX - HALF, 44, EZ - HALF, EZ + HALF], // out to the dorms
};
// the links straight on into the plaza, under the circle's edge
export const LINKS = {
  w: [WX + HALF, F[0] - R + 1, WZ - HALF, WZ + HALF],
  e: [F[0] + R - 1, EX - HALF, EZ - HALF, EZ + HALF],
};
export const LANE_RECTS = [...Object.values(LANE), ...Object.values(LINKS)];

// the canteen and the shop street
const rectOf = (id) => {
  const r = building(id).rect;
  return [...local(r.slice(0, 2)), ...local(r.slice(2))];
};
export const CANTEEN = rectOf('canteen'); // [x0, z0, x1, z1]
export const SHOPS = ((r) => ({ a: local(r), dir: [1, 0], depth: r[3] - r[1], length: r[2] - r[0] }))(
  building('shops_north').rect,
);
export const SHOPS_Z = SHOPS.a[1]; // the shops' backs, toward the lane
// the canteen door, on the fountain's axis (the ground-floor bay nearest it)
export const DOOR_X = (() => {
  const [x0, , x1] = CANTEEN;
  const bays = Math.round((x1 - x0) / 2.3),
    bw = (x1 - x0) / bays;
  let best = x0 + bw / 2;
  for (let i = 0; i < bays; i++) {
    const c = x0 + bw * (i + 0.5);
    if (Math.abs(c - F[0]) < Math.abs(best - F[0])) best = c;
  }
  return best;
})();
// the terrace: from the canteen's front to a line across, the circle's north arc cutting into it
export const TERRACE = [CANTEEN[0] + 2.6, CANTEEN[2] - 0.2, CANTEEN[3], CANTEEN[3] + 4.2];
export const TERRACE_S = TERRACE[3];

// the ring bed round the circle, outside its border: its width, and the arcs it runs over (radians from east
// toward south). Openings: the lane (south, where the circle is cut), the two links, the terrace (north).
export const BAND = 1.35;
const openingAt = ([, , z0, z1], side) => {
  // the angles where the circle's edge crosses a link's two edges, on the west (-1) or east (1) side
  const a = (z) => {
    const s = (z - F[1]) / R;
    return side > 0 ? Math.asin(s) : Math.PI - Math.asin(s);
  };
  return [a(z0), a(z1)].sort((p, q) => p - q);
};
const [LWa, LWb] = openingAt(LINKS.w, -1);
const [LEa, LEb] = openingAt(LINKS.e, 1);
export const OPEN = {
  south: [Math.asin((LANE_N - F[1]) / R), Math.PI - Math.asin((LANE_N - F[1]) / R)],
  west: [LWa - 0.02, LWb + 0.02],
  east: [LEa - 0.02 + Math.PI * 2, LEb + 0.02 + Math.PI * 2],
};
// the bed's arcs, clockwise from the south-west: SW corner, NW (up to the terrace), NE (from the terrace), SE. The
// north arcs end where the bed's outer edge reaches the terrace's south line.
const TA = Math.asin((TERRACE_S - F[1]) / (R + BAND)); // negative: north of the centre
export const ARCS = {
  sw: [OPEN.south[1], OPEN.west[0]],
  nw: [OPEN.west[1], Math.PI - TA],
  ne: [Math.PI * 2 + TA, OPEN.east[0]],
  se: [OPEN.east[1], OPEN.south[0] + Math.PI * 2],
};

// the south verge: the lane's strip (a kerb, a bed of ground cover with a low hedge), then the avenue on the grass;
// trees every 4 on the fountain's axis, bench bays opposite the plaza's corners
export const STRIP = [LANE.s[0], LANE.s[1], LANE.s[3], LANE.s[3] + 1.1];
export const AVENUE_Z = STRIP[3] + 1.0;
export const AVENUE = [-14, -10, -6, -2, 2, 6, 10, 14].map((x) => x + F[0]);
export const BAYS = [-8, 8].map((x) => x + F[0]);
export const FOOTPATH = [-44, 44, SHOPS_Z - 1.7, SHOPS_Z];

export const inRect = (x, z, [x0, x1, z0, z1], m = 0) => x > x0 + m && x < x1 - m && z > z0 + m && z < z1 - m;
export const onLane = (x, z) => LANE_RECTS.some((r) => inRect(x, z, r, 0.25));
export const polar = (a, r) => [F[0] + Math.cos(a) * r, F[1] + Math.sin(a) * r];
