// The ground from the dorms' sea terrace up the east coast to the onsen (docs/game/island.md, "Dorms" and "Sports
// and baths"), in the island frame: scenes/island-layout.js spreads these into PATHS, GREEN and its COAST line;
// the east coast chunk builds them (scenes/east-coast.js). Moved here from the day-2 plan (island-plan.js) when the
// chunk was built. On the lane's grid like the rest: walks 2 wide, turning at right angles in squares as wide.
const pairs = (f) => f.reduce((a, v, i) => (i % 2 ? a[a.length - 1].push(v) : a.push([v]), a), []);

export const BATH_PATHS = [
  {
    id: 'east_coast_walk',
    kind: 'walk',
    w: 2,
    line: pairs([129, 10.5, 131, 10.5, 131, -36, 120, -36, 120, -57.5, 104, -57.5]),
    detail:
      'From the dorms’ sea terrace north along the east coast behind dorm_4, west where the coast comes in, north past dorm_6, then west to the courts walk.',
  },
  {
    id: 'onsen_path',
    kind: 'walk',
    w: 2,
    line: pairs([103, -57.5, 103, -80, 123.1, -80]),
    detail:
      'From the courts walk’s east end north along the tennis courts’ fence, then east through the onsen’s trees along its precinct wall to the red gate.',
  },
  {
    id: 'onsen_court',
    kind: 'court',
    rect: [108, -88.2, 129.2, -81.5],
    detail:
      'Inside the onsen’s red gate: a stone walk on the gate’s axis to the entrance porch, raked gravel, pines and a lantern either side.',
  },
  {
    id: 'courts',
    kind: 'court',
    rect: [78, -84, 101, -61],
    detail: 'Two hard tennis courts, fenced, the clubhouse at their north-west corner.',
  },
];

export const BATH_GREEN = [
  {
    id: 'onsen_grounds',
    rect: [104, -118, 140, -60],
    detail: 'Pines and maples round the onsen, its walled precinct and bath courtyards inside them.',
  },
];

// the coast on north from the layout's east coast past the onsen, land on the inside (west)
export const BATH_COAST = pairs([128, -56, 136, -64, 142, -76, 144, -92, 141, -108, 138, -120, 136, -124]);
