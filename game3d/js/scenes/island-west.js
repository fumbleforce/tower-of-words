// The ground and coast west and south of the station, in the island frame: scenes/island-layout.js spreads the paths
// and green into PATHS and GREEN; scenes/outdoor/coast.js builds the sea wall, rocks, kerbs, terraces and planting
// from the rest, for the forecourt (scenes/forecourt.js) and for the monorail's run in (train/island.js).
// Picked map: art/island/island-map-4-topdown.png (a rocky coast west of the platform shed, pines, a promenade).
//
//   the coast path: 2 wide, on the grid, west of the platform shed and clear of the second track's beam beside it;
//   from a lookout terrace where the coast turns south-east, north past the shed, and along its north end east to
//   the shed street (which runs on north to meet it)
//   the south walk: from the promenade's west end, west across the lawn south of the station and under the line,
//   to a second terrace over the rocks, where the monorail comes in off the bay
//   the coast: a sea wall with a pale coping along the layout's coast line, two rows of armour rocks at its foot
//   the planting: lawn from the shed and the station to the wall; black pines in a row between the coast path and
//   the wall (two rows where the coast widens) and between the two tracks south of the shed; low shrubs between
//   the coast path and the shed (they stay under the second track's beam); a grove of zelkova and cherry south of
//   the station, east of the line
const pairs = (f) => f.reduce((a, v, i) => (i % 2 ? a[a.length - 1].push(v) : a.push([v]), a), []);

// Every walk of the coast, [x0, z0, x1, z1], kerbed round except where another walk meets it. open: sides left
// without a kerb (where the forecourt's street or the promenade carries on); terrace: rails on these (seaward) sides and benches looking `look`
// (radians, as rotation.y: 0 south, -PI/2 west).
export const WALKS = {
  coast_path: { rect: [-42.6, -27.4, -40.6, 8.5] },
  coast_lookout: {
    rect: [-44.1, 8.5, -39.6, 11.5], // out to the wall
    terrace: 'ws',
    look: -Math.PI / 2,
  },
  coast_path_east: { rect: [-40.6, -27.4, -20.75, -25.4] },
  shed_street_north: {
    rect: [-20.75, -27.4, -17.75, -22.1],
    open: 's',
    lane: true,
  },
  south_walk: { rect: [-33.2, 22.5, -16.1, 24.5] },
  south_link: { rect: [-16.1, 22.5, -14.1, 26.9], open: 's' }, // to the promenade (island-south.js)
  south_lookout: {
    rect: [-36.8, 21.5, -33.2, 24.5],
    terrace: 'ws',
    look: -Math.PI / 2,
  },
};
const DETAIL = {
  coast_path: 'The coast path west of the platform shed, between the pines along the sea wall and the shed’s lawn.',
  coast_lookout:
    'A paved terrace at the coast path’s south end, where the coast turns south-east: benches facing the sea.',
  coast_path_east: 'The coast path’s leg east past the shed’s north end, to the head of the shed street.',
  shed_street_north:
    'The shed street’s last stretch north (3 wide on the station’s west face line, as forecourt/plan.js lays it), out of the forecourt’s view, to the coast path.',
  south_walk: 'From the promenade’s west end west across the lawn south of the station, under the monorail line.',
  south_link: 'The south walk’s leg down to the promenade’s west end.',
  south_lookout: 'A terrace over the rocks at the south walk’s west end, where the monorail comes in off the bay.',
};
export const WEST_PATHS = Object.entries(WALKS).map(([id, w]) => ({
  id,
  kind: w.lane ? 'lane' : 'walk',
  rect: w.rect,
  detail: DETAIL[id],
}));

// The coastline's land side, closed round the north-east so it can be drawn as ground (COAST.line runs from the
// north-west round the south to the east).
export const coastLand = (line) => [...line, [140, -200], [-60, -200]];

// The lawn from the platform shed and the station to the sea wall; it stops 0.6 short of the coast line, where
// the wall's coping starts.
export const WEST_GREEN = [
  {
    id: 'coast_lawn',
    poly: pairs([
      -55.4, -30.5, -32.6, -30.5, -32.6, 12, -6, 12, -6, 29.5, -13.6, 29.5, -14.2, 41.6, -30.1, 32.4, -37.5, 24.1,
      -44.3, 10.6, -49.9, -10.1,
    ]),
    detail: 'Lawn from the platform shed west to the sea wall, and south of the station to the coast.',
  },
];

// The sea wall with armour rocks at its foot, from the north-west round to where the seafront's beach begins.
export const WEST_COAST = pairs([-56.8, -32.9, -50.5, -10, -44.9, 10.7, -38, 24.5, -30.4, 33, -13.6, 42.3]);

// Planted beds [x0, z0, x1, z1] along both sides of the monorail line south of the shed, either side of the walk.
export const WEST_BEDS = [
  [-33.4, 15, -32.2, 21.5],
  [-33.4, 25.5, -32.2, 31],
  [-25.2, 15, -24, 21.5],
  [-25.2, 25.5, -24, 32],
];

// Trees on the grid, [kind, x, z, size]; shrub clusters [x, z].
const row = (kind, x, z0, n, s, dz = 4) => Array.from({ length: n }, (_, i) => [kind, x, z0 + i * dz, s]);
// pines in threes along a line, 3 apart, a gap between the groups; the middle one of each a little taller
const threes = (x, z0, groups, s) =>
  Array.from({ length: groups * 3 }, (_, i) => [
    'pine',
    x,
    z0 + i * 3 + Math.floor(i / 3) * 4,
    s + (i % 3 === 1) * 0.2,
  ]);
export const WEST_TREES = [
  ...threes(-44, -26, 3, 1.4), // between the coast path and the wall
  ...threes(-47.6, -24, 2, 1.25), // a second line further out where the coast widens
  ...row('pine', -33.2, 18.5, 2, 1.3, 10), // between the two tracks south of the shed, either side of the walk
  // the grove: a row along the line's east side, then rows east of it toward the promenade
  ...[
    [-23.5, 17],
    [-23.5, 20.5],
    [-23.5, 27],
    [-23.5, 31],
    [-19.5, 18],
    [-15.5, 18],
    [-11.5, 18],
    [-19.5, 28.5],
    [-11.5, 28.5],
  ].map(([x, z], i) => [i % 3 === 1 ? 'sakura' : 'keyaki', x, z, 1.25]),
];
export const WEST_SHRUBS = [
  // between the coast path and the shed, in pairs with a gap after each
  ...[-25, -22.6, -16, -13.6, -7, -4.6, 2, 4.4].map((z) => [-39.4, z]),
  // in the lawn between the pine groups, toward the wall
  ...[
    [-46.2, -16.5],
    [-45.4, -3.5],
    [-49.6, -21],
    [-48.8, -9],
  ],
  ...[-30, -26, -22, -18].flatMap((x) => [
    [x, 21.4],
    [x, 25.6],
  ]), // either side of the south walk
];
