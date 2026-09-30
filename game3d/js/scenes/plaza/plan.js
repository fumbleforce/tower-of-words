// The fountain plaza's plan (scenes/plaza.js): every zone from the island layout, in the chunk's frame (x east,
// z south), so the paving, the kerbs, the beds and the lamps line up with each other and with the buildings.
//
// Two axes cross at the fountain. East-west: the lane (route_home) comes in from head office on the west, meets the
// circle on the axis, and leaves the circle on the same axis to the east, toward the dorms. North-south: the
// canteen's door, a short link from its terrace to the circle, the fountain.
//
//   the circle: the map's round plaza, 23 across round the fountain, paved in rings with a dark border ring; the
//   lanes and the link run in under its border ring, so it is whole, and they meet it square on
//   the lanes: 3 wide, grey brick between pale borders, west and east of the circle on the axis
//   the link: as wide as the lanes, in the same brick, from the terrace's south edge to the circle
//   the ring bed: a planted band round the circle outside its border, opened only for the two lanes and the link
//   the terrace: the canteen's own, from its glazed front to a seat-height wall, clear of the ring bed by a strip of
//   lawn; the wall is open only where the link starts
//   the lane verges: a kerbed bed with a low hedge along both sides of each lane, the zelkovas behind it
//   the footpath along the shop street's backs, south of the lawn
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

// the lane: its axis is the route's first leg, from head office (the fountain sits on it)
export const HALF = path('route_home').w / 2;
export const LZ = r2(local(path('route_home').line[0])[1]);
const UNDER = Math.sqrt(R * R - HALF * HALF) - 1.0; // how far in the lanes and the link run, under the circle
export const LANE = {
  w: [-44, F[0] - UNDER, LZ - HALF, LZ + HALF], // in from head office
  e: [F[0] + UNDER, 44, LZ - HALF, LZ + HALF], // out toward the dorms
};

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
// the canteen door: the ground-floor bay nearest the fountain's axis (the layout puts one on it)
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
// the terrace: from the canteen's front to its wall
export const TERRACE = [CANTEEN[0] + 2.6, CANTEEN[2] - 0.2, CANTEEN[3], CANTEEN[3] + 4.2];
export const TERRACE_S = TERRACE[3];
// the link from the terrace to the circle, on the door's axis
export const LINK = [DOOR_X - HALF, DOOR_X + HALF, TERRACE_S, F[1] - Math.sqrt(R * R - HALF * HALF) + 1.0];
export const LANE_RECTS = [LANE.w, LANE.e, LINK];

// the ring bed round the circle, outside its border: its width, and the arcs it runs over (radians from east
// toward south). Openings: the lanes (east and west) and the link (north), each where its edges cross the circle.
export const BAND = 1.35;
const GAP = 0.02;
const side = Math.asin(HALF / R); // half the angle a lane's width takes on the circle
const north = (x) => 2 * Math.PI - Math.acos((x - F[0]) / R); // the angle on the north arc over x
export const OPEN = {
  east: [-side - GAP, side + GAP],
  west: [Math.PI - side - GAP, Math.PI + side + GAP],
  north: [north(LINK[0]) - GAP, north(LINK[1]) + GAP],
};
export const ARCS = {
  s: [OPEN.east[1], OPEN.west[0]],
  nw: [OPEN.west[1], OPEN.north[0]],
  ne: [OPEN.north[1], OPEN.east[0] + 2 * Math.PI],
};

// the zelkovas along the lanes, every 4 from the ring bed out to the edge of the view; the lamps stand between
// every other pair
export const AVENUE = [0, 4, 8].map((d) => R + BAND + 3 + d);
export const FOOTPATH = [-44, 44, SHOPS_Z - 1.7, SHOPS_Z];

export const inRect = (x, z, [x0, x1, z0, z1], m = 0) => x > x0 + m && x < x1 - m && z > z0 + m && z < z1 - m;
export const onLane = (x, z) => LANE_RECTS.some((r) => inRect(x, z, r, 0.25));
export const polar = (a, r) => [F[0] + Math.cos(a) * r, F[1] + Math.sin(a) * r];
