import { seatRow } from '../../kit/core/seats.js';
// A waiting-room bench in a Kit (dorms/kit.js): a moulded seat and back on two steel frames, with arm rails at the
// ends. The ferry waiting room's (scenes/ferry-terminal/room.js) and the clinic's (scenes/clinic/room.js).
//   waitingBench(k, x, z, facing, { len, seat, back, frame, rail })
// facing: the way someone sitting on it looks (0 toward +z, the camera's side; Math.PI away from it; ±Math.PI / 2
// along x); len: its length (the ferry's is 3.15); the colours of the seat, the back, the frames and the rails.
export function waitingBench(
  k,
  x,
  z,
  facing,
  { len = 3.15, seat = '#4f7c82', back = '#5e858a', frame = '#64747a', rail = '#65777b' } = {},
) {
  seatRow(k, x + Math.sin(facing) * 0.2, z + Math.cos(facing) * 0.2, 0.34, facing, len, { forward: 0 });
  const along = Math.abs(Math.sin(facing)) < 1e-6, // the length runs along x
    fx = Math.sin(facing),
    fz = Math.cos(facing),
    ry = along ? 0 : Math.PI / 2;
  // a box at u along the bench's length and v toward where the sitter looks, w long and d deep
  const put = (color, w, h, d, u, y, v, o) =>
    k.box(color, w, h, d, x + (along ? u : 0) + fx * v, y, z + (along ? 0 : u) + fz * v, { ry, ...o });
  const legX = len / 2 - 0.425,
    railX = len / 2 - 0.125;
  put(seat, len, 0.065, 0.54, 0, 0.275, 0, { surf: 'plastic', r: 0.035 });
  for (const dx of [-legX, legX]) {
    put(frame, 0.075, 0.275, 0.43, dx, 0, 0, { surf: 'metal' });
    put(frame, 0.1, 0.42, 0.045, dx, 0.3, -0.27, { surf: 'metal' });
  }
  put(back, len, 0.35, 0.055, 0, 0.37, -0.28, { surf: 'plastic', r: 0.02 });
  for (const dx of [-railX, railX]) put(rail, 0.055, 0.08, 0.56, dx, 0.57, 0, { surf: 'metal', r: 0.02 });
}
