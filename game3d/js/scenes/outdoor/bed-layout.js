// Where planted beds go and what shape they take (notes/grounds-system.md; Jørgen, 2026-10-09: "areas like this
// must be avoided, where the plants are contained in these oddly shaped areas, it looks bad"). A bed belongs to the
// place's structure: a straight strip along the path it borders, as long as the stretch it planted and no deeper than
// a strip, with its plants inside it; plants that stood further out stay where they were, loose on the lawn. A bed
// with no path beside it keeps no bed at all: its plants stand loose on the lawn. No Three.js here: the bed builders
// and the map both read the result.
//   alignBeds(beds, walks)   beds: [{ poly, masses: [[x, z, r, ...]], grasses: [[x, z, ...]], ... }], walks:
//                            [x0, x1, z0, z1] walkable rectangles, all in one frame. Returns the beds with
//                            strip: [x0, x1, z0, z1] and poly its four corners, or loose: true (poly kept as the
//                            footprint the plants stand in), and masses/grasses split into the bed's own and loose.

const KERB = 0.16; // the ground's kerb (outdoor/walk-edges.js) stands between a path and its strip

const overlaps = (a, b) => a[0] < b[1] - 1e-6 && a[1] > b[0] + 1e-6 && a[2] < b[3] - 1e-6 && a[3] > b[2] + 1e-6;
const inRect = (x, z, [x0, x1, z0, z1], m = 0) => x >= x0 + m && x <= x1 - m && z >= z0 + m && z <= z1 - m;

// the strip a bed's bounding box makes along one side of a walk, or null when it doesn't border that side
function stripAlong(box, walk, side, { reach, depth, min }) {
  const [bx0, bx1, bz0, bz1] = box,
    [wx0, wx1, wz0, wz1] = walk;
  const alongX = side === 'n' || side === 's';
  const [a0, a1] = alongX ? [Math.max(bx0, wx0), Math.min(bx1, wx1)] : [Math.max(bz0, wz0), Math.min(bz1, wz1)];
  if (a1 - a0 < min) return null;
  const line = { n: wz0, s: wz1, w: wx0, e: wx1 }[side],
    out = side === 's' || side === 'e' ? 1 : -1,
    [near, far] =
      out > 0
        ? alongX
          ? [bz0 - line, bz1 - line]
          : [bx0 - line, bx1 - line]
        : alongX
          ? [line - bz1, line - bz0]
          : [line - bx1, line - bx0];
  if (near > reach || far < KERB + 0.6) return null;
  const c0 = line + out * KERB,
    c1 = line + out * Math.min(KERB + depth, far);
  const [lo, hi] = [Math.min(c0, c1), Math.max(c0, c1)];
  return { rect: alongX ? [a0, a1, lo, hi] : [lo, hi, a0, a1], len: a1 - a0 };
}

export function alignBeds(beds, walks, { reach = 1.2, depth = 1.5, min = 1.5 } = {}) {
  return beds.map((bed) => {
    const xs = bed.poly.map((p) => p[0]),
      zs = bed.poly.map((p) => p[1]),
      box = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
    let best = null;
    for (const w of walks)
      for (const side of ['n', 's', 'w', 'e']) {
        const s = stripAlong(box, w, side, { reach, depth, min });
        if (s && !walks.some((o) => overlaps(o, s.rect)) && (!best || s.len > best.len)) best = s;
      }
    const masses = bed.masses || [],
      grasses = bed.grasses || [];
    if (!best) return { ...bed, loose: true, masses: [], grasses: [], looseMasses: masses, looseGrasses: grasses };
    const r = best.rect;
    // a plant standing in the strip or just beside it is drawn into it, whole; the rest stay loose where they stood
    const near = (p) => inRect(p[0], p[1], [r[0] - 0.4, r[1] + 0.4, r[2] - 0.4, r[3] + 0.4]);
    const into = (p, m) => {
      const mx = Math.min(m, (r[1] - r[0]) / 2),
        mz = Math.min(m, (r[3] - r[2]) / 2);
      return [
        Math.min(r[1] - mx, Math.max(r[0] + mx, p[0])),
        Math.min(r[3] - mz, Math.max(r[2] + mz, p[1])),
        ...p.slice(2),
      ];
    };
    return {
      ...bed,
      strip: r,
      poly: [
        [r[0], r[2]],
        [r[1], r[2]],
        [r[1], r[3]],
        [r[0], r[3]],
      ],
      masses: masses.filter(near).map((m) => into(m, m[2] * 0.6)),
      grasses: grasses.filter(near).map((g) => into(g, 0.15)),
      looseMasses: masses.filter((m) => !near(m)),
      looseGrasses: grasses.filter((g) => !near(g)),
      gaps: (bed.gaps || []).filter(([x, z, gr]) => x > r[0] - gr && x < r[1] + gr && z > r[2] - gr && z < r[3] + gr),
    };
  });
}
