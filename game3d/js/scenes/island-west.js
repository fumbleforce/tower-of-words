// The ground and coast west and south of the station, in the island frame: scenes/island-layout.js spreads the paths
// and green into PATHS, GREEN and MOWN and takes the coastline into COAST; scenes/outdoor/coast.js builds the sea
// wall, rocks, kerbs, terraces and planting from the rest, for the forecourt (scenes/forecourt.js) and for the
// monorail's run in (train/island.js). Picked map: art/island/island-map-4-topdown.png (a rocky coast west of the
// platform shed, pines, a promenade).
//
//   the coastline: one smooth curve through hand-set points, from the north-west down the west side, out round the
//   two terraces and on east to where the seafront's beach begins, arriving along the beach's own line
//   (island-south.js SHORE), so the sea wall bends like a shore rather than in straight runs
//   the coast walk: 2 wide, on the grid, kerbed. From the shed street's north end west along the shed's north end,
//   south past the shed (clear of the second track's beam) to a lookout terrace on a point of the coast, on south to
//   a corner terrace where the coast turns east and the monorail comes in off the bay, then east as the south walk,
//   under the line, to the station's axis, where it meets the walk down from the station's covered walkway and goes
//   on south to the promenade (island-south.js). One loop: no dead ends.
//   the garden south of the station: on the station's axis between its covered walkway and the south walk, a walk
//   with planted beds either side; either side of it a lawn panel mown in bands, a drift of layered planting along
//   the walkway, a cherry; a row of zelkovas between the garden and the line
//   the lawns: mown in bands along their long side (the panel west of the shed, under the line, west of it, the
//   garden's panels); a mown margin either side of the coast walk; longer grass between the walk and the wall
//   the planting: black pines in threes along the wall, shrubs and a clipped bed along the shed, beds of clipped
//   mounds either side of the line, drifts where a lawn meets a walk or a building
const pairs = (f) => f.reduce((a, v, i) => (i % 2 ? a[a.length - 1].push(v) : a.push([v]), a), []);

// ---------- the coastline ----------
// centripetal Catmull-Rom through keys, sampled about every `step`; the ends are kept (the harbour's rocky shores
// use it too, island-harbour.js)
export function smooth(keys, step) {
  const P = [keys[0], ...keys, keys[keys.length - 1]],
    out = [keys[0]];
  for (let i = 1; i + 2 < P.length; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const d = (a, b) => Math.max(1e-6, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])));
    const t1 = d(p0, p1),
      t2 = t1 + d(p1, p2),
      t3 = t2 + d(p2, p3);
    const n = Math.max(1, Math.round(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 1; k <= n; k++) {
      const t = t1 + ((t2 - t1) * k) / n;
      const L = (a, b, ta, tb) => a.map((v, j) => (ta === tb ? v : ((tb - t) * v + (t - ta) * b[j]) / (tb - ta)));
      const A1 = L(p0, p1, 0, t1),
        A2 = L(p1, p2, t1, t2),
        A3 = L(p2, p3, t2, t3);
      const B1 = L(A1, A2, 0, t2),
        B2 = L(A2, A3, t1, t3);
      out.push(L(B1, B2, t1, t2));
    }
  }
  return out;
}
// the coastline's shape: north-west, a shallow bay, the lookout's point, the corner round the south terrace, then
// a long curve east that comes in along the beach's line, to the corner where the beach begins (SHORE's first point)
const COAST_KEYS = pairs([
  -56.8, -32.9, -54.4, -20, -52.6, -9, -50.6, -1.2, -47.6, 5, -46.7, 10, -47.3, 15.5, -47.4, 20.5, -47.2, 25.4, -45.5,
  28.6, -42, 30.6, -34.5, 33.4, -26, 37.4, -21.4, 39.6, -17.4, 41.2,
]);
// The sea wall with armour rocks at its foot, from the north-west round to where the seafront's beach begins; the
// island's COAST.line (island-layout.js) runs along it and on round the beach.
export const WEST_COAST = smooth(COAST_KEYS, 2);
// From that corner the wall turns and curves up the beach's west side to the promenade's wall (island-south.js), the
// beach on its right: the lawn ends on the curve and the sand fills it.
export const WEST_RETURN = smooth(pairs([-17.4, 41.2, -16.3, 37.8, -14.8, 34.7, -13.6, 32.4]), 2);

// ---------- the walks ----------
// Every walk of the coast, [x0, z0, x1, z1], kerbed round except where another walk meets it. open: sides left
// without a kerb (where the forecourt's street, the promenade or the station's walkway carries on); terrace: rails
// on these (seaward) sides and two benches looking `look` (radians, as rotation.y: 0 south, -PI/2 west).
const AXIS = [-15.65, -13.25]; // the station's axis: its covered walkway's north leg (station-shed.js)
const WALKWAY_S = 17.1; // the walkway's south edge
const TERRACE = '#a19d94'; // the terraces' paler stone, so they read as places to stop
export const WALKS = {
  coast_path: { rect: [-42.6, -27.4, -40.6, 8] },
  coast_lookout: { rect: [-46.1, 8, -40.6, 12], terrace: 'w', look: -Math.PI / 2, slabs: true },
  coast_path_south: { rect: [-42.6, 12, -40.6, 21] },
  // a bay off the walk's sea side halfway along it, two benches looking out over the wall
  coast_bay: {
    rect: [-44.6, -11.4, -42.6, -8.4],
    slabs: true,
    benches: [
      [-43.9, -10.65, -Math.PI / 2],
      [-43.9, -9.15, -Math.PI / 2],
    ],
  },
  south_lookout: { rect: [-46.1, 21, -40.6, 26.2], terrace: 'ws', look: -Math.PI / 4, slabs: true },
  coast_path_east: { rect: [-40.6, -27.4, -20.75, -25.4] },
  shed_street_north: {
    rect: [-20.75, -27.4, -17.75, -22.1],
    open: 's',
    lane: true,
  },
  coast_south_walk: { rect: [-40.6, 22.5, AXIS[1], 24.5] },
  station_walk: { rect: [AXIS[0], WALKWAY_S, AXIS[1], 22.5], open: 'n' },
  garden_arcade: { rect: [-11.45, 23.7, -5.5, 25.3], open: 'e' },
  garden_return: { rect: [-13.25, 25.3, -10.85, 26.4] },
  south_link: { rect: [AXIS[0], 24.5, AXIS[1], 26.9], open: 's' }, // to the promenade (island-south.js)
  // where the south walk meets the station's axis: a square in the terraces' stone, two benches on its east side
  garden_square: {
    rect: [AXIS[0] - 1.8, 22.1, AXIS[1] + 1.8, 25.3],
    slabs: true,
    benches: [
      [AXIS[1] + 1.15, 22.95, -Math.PI / 2],
      [AXIS[1] + 1.15, 24.55, -Math.PI / 2],
    ],
  },
};
const DETAIL = {
  coast_path: 'The coast walk west of the platform shed, between the pines along the sea wall and the shed’s lawn.',
  coast_lookout: 'A paved terrace on a point of the coast where the walk passes: a rail and benches facing the sea.',
  coast_path_south: 'The coast walk on south from the lookout to the corner terrace.',
  coast_bay: 'A paved bay off the coast walk’s sea side, two benches looking out over the wall.',
  south_lookout:
    'A terrace on the corner where the coast turns east, over the rocks: the monorail comes in off the bay in front of it.',
  coast_path_east: 'The coast walk’s leg east past the shed’s north end, to the head of the shed street.',
  shed_street_north:
    'The shed street’s last stretch north (3 wide on the station’s west face line, as forecourt/plan.js lays it), out of the forecourt’s view, to the coast walk.',
  coast_south_walk:
    'From the corner terrace east across the lawn south of the station, under the line, to the station’s axis.',
  station_walk: 'Down the station’s axis from its covered walkway, between planted beds, to the south walk.',
  south_link: 'On down the station’s axis from the south walk to the promenade’s west end.',
  garden_arcade: 'The garden square’s east path to the arcade’s western passage.',
  garden_return: 'A paved return around the south garden bench to the promenade link.',
  garden_square: 'A square of slabs where the south walk meets the station’s axis, with two benches.',
};
export const WEST_PATHS = Object.entries(WALKS).map(([id, w]) => ({
  id,
  kind: w.lane ? 'lane' : 'walk',
  rect: w.rect,
  ...(w.slabs && { color: TERRACE }),
  detail: DETAIL[id],
}));

// The coastline's land side, closed round the north so it can be drawn as ground (COAST.line runs from the
// north-west round the harbour and the south to the east).
export const coastLand = (line) => [...line, [140, -200], [-160, -200]];

// ---------- the lawn ----------
// the coast line moved `d` inland (the sea is on its right)
function inland(line, d) {
  return line.map((p, i) => {
    const a = line[Math.max(0, i - 1)],
      b = line[Math.min(line.length - 1, i + 1)],
      L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [p[0] + ((b[1] - a[1]) / L) * d, p[1] - ((b[0] - a[0]) / L) * d];
  });
}
// The lawn from the platform shed and the station to the sea wall; it stops 0.6 short of the coast line, where
// the wall's coping starts, and along the wall's return up the beach's west side.
const LAWN_N = -30.5;
const shore = inland(WEST_COAST, 0.6).filter(([, z]) => z > LAWN_N);
export const WEST_GREEN = [
  {
    id: 'coast_lawn',
    poly: [
      ...pairs([-32.6, LAWN_N, -32.6, 12, -6, 12, -6, 29.5, -14.2, 29.5]),
      ...inland(WEST_RETURN, 0.6).reverse(),
      ...shore.reverse(),
      [WEST_COAST[0][0] + 1.3, LAWN_N],
    ],
    detail: 'Lawn from the platform shed west to the sea wall, and south of the station to the coast.',
  },
];

// Mown bands and longer grass over the lawn (skyline.js draws them between the green and the paths): `rough` is
// the longer grass between the coast walk and the wall, `bands` lays a rect in stripes along its long side, every
// other one a shade lighter, `margin` a mown strip either side of a walk.
const GRASS = { rough: '#58664f', light: '#71825f', margin: '#65745c' };
const bands = ([x0, z0, x1, z1], w = 1.6) => {
  const alongZ = z1 - z0 > x1 - x0,
    [a, b] = alongZ ? [x0, x1] : [z0, z1],
    n = Math.max(2, Math.round((b - a) / w)),
    s = (b - a) / n;
  return Array.from({ length: Math.floor(n / 2) }, (_, i) => {
    const [c, d] = [a + s * (2 * i + 1), a + s * (2 * i + 2)];
    return {
      rect: alongZ ? [c, z0, d, z1] : [x0, c, x1, d],
      color: GRASS.light,
    };
  });
};
export const WEST_MOWN = [
  // the longer grass between the coast walk and the wall (the coast's own polygon, cut at the walk's west edge),
  // and the north strip past the shed
  {
    poly: [
      ...inland(WEST_COAST, 0.6)
        .filter(([, z]) => z > LAWN_N && z < 21)
        .map(([x, z]) => [x, z]),
      [-43.6, 21],
      [-43.6, -28.4],
      [-32.6, -28.4],
      [-32.6, LAWN_N],
    ],
    color: GRASS.rough,
    y: -0.14,
  },
  // a mown margin either side of the coast walk
  { rect: [-43.6, -28.4, -42.6, 21], color: GRASS.margin },
  { rect: [-40.6, -24.6, -39.9, 21], color: GRASS.margin },
  // the panel between the coast walk and the shed, mown along it
  ...bands([-39.9, -24.6, -33.9, 11.6], 1.5),
  // west of the line, between the walk and the second track's beam
  ...bands([-39.9, 12.4, -34.4, 22.1], 1.4),
  // under the line between its two beds, along it
  ...bands([-32, 13.2, -25.4, 22.1], 1.65),
  ...bands([-32, 24.9, -25.4, 32], 1.65),
  // the garden's two panels either side of the station's axis, mown across
  ...bands([-22.6, 19.4, -17.4, 22.1], 0.9),
  ...bands([-11.6, 19.4, -6.4, 22.1], 0.9),
].map((b) => ({ y: -0.136, ...b }));

// ---------- planting ----------
// Planted beds [x0, z0, x1, z1]: ground cover with clipped mounds along the long side. Along the shed's west face,
// along the coast walk's sea side, either side of the station walk.
export const WEST_BEDS = [
  [-33.6, -24, -32.8, 11.6], // a clipped band at the foot of the shed
  // low beds along the coast walk's sea side, broken where the walk passes the lookout
  [-44.3, -25, -43.7, -11.8],
  [-44.3, -8, -43.7, 6.6],
  [AXIS[0] - 1.25, WALKWAY_S + 0.45, AXIS[0] - 0.2, 22.1],
  [AXIS[1] + 0.2, WALKWAY_S + 0.45, AXIS[1] + 1.25, 22.1],
];
// Drifts of layered planting [x0, x1, z0, z1, back]: tall at the back side, low in front (forecourt/gardens.js drift)
export const WEST_DRIFTS = [
  // along the covered walkway's south edge, either side of the station walk, the tall layer against the walkway
  [-23, -17.1, WALKWAY_S + 0.3, 19.1, 'n'],
  [-11.8, -6.4, WALKWAY_S + 0.3, 19.1, 'n'],
  // along the south walk's south edge east of the line, low toward the walk
  [-23, -18, 24.8, 26.4, 's'],
  // either side of the line south of the shed, either side of the walk: what the train passes over as it comes in
  [-34.8, -31.4, 17.6, 21.8, 's'],
  [-34.8, -31.4, 25.2, 31, 'n'],
  [-25.8, -23.8, 17.6, 21.8, 's'],
  [-25.8, -23.8, 25.2, 32, 'n'],
  // in the longer grass where the coast widens, and west of the line along the south walk
  [-51, -46.4, -8.4, -6.4, 'n'],
  [-50.4, -46.6, -19.4, -17.6, 's'],
  [-39.6, -34.8, 20.4, 22.2, 'n'],
  // on the lawn south of the walk, in the wedge between the line and the wall
  [-37.6, -32.6, 27, 28.8, 's'],
  [-24.4, -19.4, 32.2, 34, 's'],
];

// Trees on the grid, [kind, x, z, size]; shrub clusters [x, z].
const row = (kind, x, z0, n, s, dz = 4) => Array.from({ length: n }, (_, i) => [kind, x, z0 + i * dz, s]);
// black pines in threes along the wall, `off` inland of it, 2.8 apart in a group and GAP between groups; the middle
// one of each a little taller. None on or beside a walk or terrace, nor where the line comes in over the wall.
const near = ([x0, z0, x1, z1], x, z, m) => x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m;
function wallPines(off, gap, s) {
  const line = inland(WEST_COAST, off),
    spots = [];
  for (let i = 0, run = 0, k = 0; i + 1 < line.length; i++) {
    const [a, b] = [line[i], line[i + 1]],
      L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (; run < L; k++) {
      const t = run / L;
      spots.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      run += k % 3 === 2 ? gap : 2.4;
    }
    run -= L;
  }
  const free = ([x, z]) => z > LAWN_N + 1 && x < -16 && !Object.values(WALKS).some((w) => near(w.rect, x, z, 1));
  // a group goes in whole or not at all
  const out = [];
  for (let g = 0; g + 2 < spots.length; g += 3) {
    const three = spots.slice(g, g + 3);
    if (three.every(free)) three.forEach(([x, z], k) => out.push(['pine', x, z, s + (k === 1) * 0.2]));
  }
  return out;
}
export const WEST_TREES = [
  ...wallPines(2.7, 3.6, 1.6), // along the wall, all the way round
  // a pine either side of each terrace, on the lawn
  ['pine', -44.6, 6.4, 1.5],
  ['pine', -38.6, 20.2, 1.4],
  // clipped pines in the beds along the line's east side, seen from the train as it comes in
  ['pine', -24.6, 19.6, 1.05],
  ['pine', -24.6, 27.4, 1.1],
  ['pine', -24.6, 30.8, 1.0],
  ...row('pine', -33.2, 18.5, 2, 1.3, 10), // between the two tracks south of the shed, either side of the walk
  // the garden: a row of zelkovas between it and the line, a cherry in each panel, zelkovas south of the walk
  ...[20.6, 28.4].map((z) => ['keyaki', -23.4, z, 1.2]),
  ['sakura', -20.2, 20.9, 1.25],
  ['sakura', -8.8, 20.9, 1.2],
  ['keyaki', -19.6, 29.2, 1.25],
  ['keyaki', -9.6, 25.8, 1.0],
];
export const WEST_SHRUBS = [
  // between the coast walk and the shed, in pairs with a gap after each
  ...[-25, -22.6, -16, -13.6, -7, -4.6, 2, 4.4].map((z) => [-39.4, z]),
  // on the corners of the two terraces, inland
  ...[
    [-40, 7.4],
    [-40, 12.6],
    [-39.9, 20.4],
  ],
  // either side of the south walk west of the line
  ...[-39, -36.4].flatMap((x) => [
    [x, 21.6],
    [x, 25.4],
  ]),
];
