// Where a jump in Eric's building goes over the edge (movement/falls.js): the court-side parapet of the 2F and 3F
// corridors, and the roof's parapets on the court, the back and the west end. Each is the line the walk grid stops
// him at, in the place's frame, with the way out over it. Jumping at one is a fall, and the clinic.
import { CORR, WEST_END, RETURN, LEVEL_DX } from '../scenes/dorms/layout.js';
import { ROOF } from '../scenes/dorms/roof.js';

export function dormFalls() {
  const corridor = (dx) => ({
    a: [WEST_END + dx, CORR[1] - 0.12],
    b: [RETURN + dx, CORR[1] - 0.12],
    out: [0, 1],
  });
  const r = LEVEL_DX.roof;
  return [
    corridor(LEVEL_DX['2f']),
    corridor(LEVEL_DX['3f']),
    {
      a: [ROOF.x0 + r, ROOF.z1 - 0.14],
      b: [ROOF.x1 + r, ROOF.z1 - 0.14],
      out: [0, 1],
    }, // over the court
    {
      a: [ROOF.x0 + r, ROOF.z0 + 0.14],
      b: [ROOF.x1 + r, ROOF.z0 + 0.14],
      out: [0, -1],
    }, // the back, the gap
    {
      a: [ROOF.x0 + 0.14 + r, ROOF.z0],
      b: [ROOF.x0 + 0.14 + r, ROOF.z1],
      out: [-1, 0],
    }, // the west end
  ];
}
