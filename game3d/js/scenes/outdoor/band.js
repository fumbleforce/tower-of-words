// Bands past a place's exits (#260, "the outer grounds should be fully modelled"): a place builds the ground just
// past each of its exits with the neighbour's own builders, kept to a few rectangles, so walking toward an exit shows
// the next place modelled (its paving, kerbs, lamps and planting) instead of the skyline's flat colour.
//   const b = band([[x0, x1, z0, z1], ...])     rects in the builder's frame; they must not overlap
//   b.paver(pv)    a paver (outdoor/paving.js) that lays only the parts of each field inside the band
//   b.parts(p)     a Parts collector (outdoor/parts.js) that keeps only geometry reaching into the band
//   b.lights(set)  a lightSet (outdoor/furniture.js) that keeps only the lanterns and pools inside it
//   b.shade(sh)    a shade() collector (outdoor/shade.js) likewise
//   b.prune(group) drops the group's children (signs, bikes) that lie wholly outside it
//   b.hits(rect), b.has(x, z)
// The neighbour's builder takes the band as an option (`clip`) and wraps its collectors with it; it also skips the
// parts it can tell lie outside (a park, a block's front), so the band costs little to build. band.shift(dx, dz)
// moves the rects into another frame (the plaza's, where the east lane's builders work).
import * as THREE from 'three';

const _b = new THREE.Box3();

export function band(rects, { pad = 0 } = {}) {
  const hit = (x0, x1, z0, z1) =>
    rects.some((r) => x1 > r[0] - pad && x0 < r[1] + pad && z1 > r[2] - pad && z0 < r[3] + pad);
  const has = (x, z) => hit(x, x, z, z);
  const geoHits = (g) => {
    g.computeBoundingBox();
    const { min, max } = g.boundingBox;
    return hit(min.x, max.x, min.z, max.z);
  };
  const b = {
    rects,
    hit,
    has,
    hits: ([x0, x1, z0, z1]) => hit(x0, x1, z0, z1),
    shift: (dx, dz) =>
      band(
        rects.map(([x0, x1, z0, z1]) => [x0 + dx, x1 + dx, z0 + dz, z1 + dz]),
        { pad },
      ),
    paver(pv) {
      const out = {
        field(r, o = {}) {
          // the pattern keeps the whole field's origin, so a clipped field lines up with the neighbour's own
          const origin = o.origin || [r[0], r[2]];
          for (const q of rects) {
            const c = [Math.max(r[0], q[0]), Math.min(r[1], q[1]), Math.max(r[2], q[2]), Math.min(r[3], q[3])];
            if (c[1] - c[0] > 0.02 && c[3] - c[2] > 0.02) pv.field(c, { ...o, origin });
          }
          return out;
        },
        border(r, o) {
          return pv.border.call(out, r, o);
        },
        tactile() {
          return out; // guide lines are for the walked ground only
        },
      };
      return out;
    },
    parts(p) {
      const out = {
        geo(color, g, o) {
          if (geoHits(g)) p.geo(color, g, o);
          else g.dispose();
          return out;
        },
        box(color, w, h, d, x, y, z, o = {}) {
          const r = o.ry ? Math.max(w, d) / 2 : 0;
          if (hit(x - (r || w / 2), x + (r || w / 2), z - (r || d / 2), z + (r || d / 2)))
            p.box(color, w, h, d, x, y, z, o);
          return out;
        },
      };
      return out; // benches' seats stay off it: nobody walks the band
    },
    lights(set) {
      return {
        glowParts: {
          push: (...gs) => gs.forEach((g) => geoHits(g) && set.glowParts.push(g)),
        },
        lit: {
          push: (...ls) => ls.forEach((l) => has(l[0], l[1]) && set.lit.push(l)),
        },
      };
    },
    shade(sh) {
      return {
        tree: (x, z, s) => has(x, z) && sh.tree(x, z, s),
        block: (r, h) => b.hits(r) && sh.block(r, h),
      };
    },
    prune(group) {
      for (const o of [...group.children]) {
        _b.setFromObject(o);
        if (_b.isEmpty() || !hit(_b.min.x, _b.max.x, _b.min.z, _b.max.z)) group.remove(o);
      }
      return group;
    },
  };
  return b;
}
