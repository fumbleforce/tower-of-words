// Outdoor-kit collectors split into cells on a grid (for backdrop that spreads wide, like the dorm cluster,
// dorm-court/cluster.js): each cell is its own Parts collector (outdoor/parts.js) and its own paver
// (outdoor/paving.js), so a cell the camera can't see is culled whole instead of one merged mesh being drawn for all.
// A geometry goes to the cell its middle is in; a paving field to the cell of its middle. Nothing in them casts a
// shadow (backdrop), so each cell has as few meshes as its kinds of surface.
//   const c = cells([88, 96, 104], [0, 10]);   x cuts, z cuts
//   c.parts.box(...), c.parts.geo(...); c.paver.field(...); c.parts.build(root); c.paver.build(root)
import { Parts } from '../outdoor/parts.js';
import { paver } from '../outdoor/paving.js';

export function cells(xcuts, zcuts) {
  const nz = zcuts.length + 1,
    n = (xcuts.length + 1) * nz;
  const at = (x, z) => xcuts.filter((c) => x >= c).length * nz + zcuts.filter((c) => z >= c).length;
  const ps = Array.from({ length: n }, () => new Parts()),
    pvs = Array.from({ length: n }, () => paver());
  const parts = {
    geo(color, g, o) {
      g.computeBoundingBox();
      const { min, max } = g.boundingBox;
      ps[at((min.x + max.x) / 2, (min.z + max.z) / 2)].geo(color, g, { ...o, cast: false });
      return parts;
    },
    box(color, w, h, d, x, y, z, o) {
      ps[at(x, z)].box(color, w, h, d, x, y, z, { ...o, cast: false });
      return parts;
    },
    build: (root) => ps.flatMap((p) => p.build(root)),
  };
  const pv = {
    field(r, o) {
      pvs[at((r[0] + r[1]) / 2, (r[2] + r[3]) / 2)].field(r, o);
    },
    build: (root) => pvs.flatMap((p) => p.build(root)),
  };
  return { parts, paver: pv, xcuts };
}
