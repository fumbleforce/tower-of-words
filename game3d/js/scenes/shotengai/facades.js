// Fitted details on the existing shop shells. All pieces stay against the walls
// above the walk; doors, approach points and the arcade's clear width are unchanged.
const FRAME = '#46545e',
  SILL = '#b3b7b8',
  PIPE = '#697780';

// A glazed opening in a facade plane. u is horizontal, n points out of the wall.
export function shopWindow(p, x, y, z, w, h, { side = false, n = 1 } = {}) {
  const put = (c, ww, hh, dd, u, yy, depth) =>
    p.box(c, side ? dd : ww, hh, side ? ww : dd, x + (side ? n * depth : u), y + yy, z + (side ? u : n * depth), {
      surf: 'metal',
    });
  for (const u of [-w / 2, w / 2]) put(FRAME, 0.055, h + 0.08, 0.075, u, -0.035, 0.025);
  for (const yy of [0, h]) put(FRAME, w, 0.05, 0.075, 0, yy, 0.025);
  put(FRAME, 0.035, h, 0.075, 0, 0, 0.03);
  put(SILL, w + 0.16, 0.065, 0.2, 0, -0.08, 0.08);
  // A lintel and a shallow transom catch light independently of the dark glazing.
  put(SILL, w + 0.12, 0.045, 0.12, 0, h + 0.055, 0.045);
  put(FRAME, w, 0.025, 0.08, 0, h * 0.7, 0.035);
}

export function shopShell(p, { ua, ub, v0, depth, h, floorH, front, back, n }) {
  const uc = (ua + ub) / 2,
    vc = v0 + depth / 2,
    w = ub - ua;
  for (const v of [front, back]) {
    p.box('#656d72', w - 0.08, 0.18, 0.08, uc, 0, v, { surf: 'stone' });
    p.box('#a1a8ab', w - 0.08, 0.085, 0.1, uc, floorH - 0.06, v, {
      surf: 'concrete',
    });
  }
  // Downpipes follow the back corners rather than protruding into shop doorways.
  for (const u of [ua + 0.13, ub - 0.13]) {
    p.box(PIPE, 0.09, h - 0.15, 0.09, u, 0.08, back - n * 0.09, {
      surf: 'metal',
    });
    for (let y = 0.6; y < h; y += 1.25) p.box(SILL, 0.13, 0.04, 0.13, u, y, back - n * 0.09, { surf: 'metal' });
  }
  for (const u of [ua + 0.025, ub - 0.025]) {
    p.box('#a1a8ab', 0.09, 0.085, depth, u, floorH - 0.06, vc, {
      surf: 'concrete',
    });
    p.box('#656d72', 0.08, 0.18, depth, u, 0, vc, { surf: 'stone' });
  }
}
