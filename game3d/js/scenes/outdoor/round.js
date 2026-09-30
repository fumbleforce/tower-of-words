// Round work for the outdoor kit (scenes/outdoor/): paving laid in rings round a centre (a round plaza, the apron of
// a fountain), and curved kerbs, walls and beds that follow an arc. Angles are in radians from east (+x) toward
// south (+z), so a point at angle a and radius r is (cx + r cos a, cz + r sin a).
//   const rp = roundPaver([cx, cz], { clip: [[0, 1, 5.4]] });   keep only z <= 5.4 (half-planes [nx, nz, d]: n.p <= d)
//   rp.ring(r0, r1, { course: 0.45, stone: 0.6, tones: GRANITE.pale });   courses of stones, staggered
//   rp.build(root)                      one mesh: the grout and every stone, coloured per vertex
//   arcBox(p, color, [cx, cz], r0, r1, a0, a1, { y, h })   a curved solid (kerb, wall, coping, the soil of a bed)
//   arcSpan(c, r, zLine, side)          the angle where a circle meets a line z = zLine, for ending an arc on it
import * as THREE from 'three';
import { mat } from '../../props.js';
import { hash2 } from './parts.js';

const GROUT = '#6f6f70';

// a triangle clipped by half-planes: the convex polygon left (possibly empty)
function clipTri(tri, planes) {
  let poly = tri;
  for (const [nx, nz, d] of planes) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i],
        b = poly[(i + 1) % poly.length];
      const da = nx * a[0] + nz * a[1] - d,
        db = nx * b[0] + nz * b[1] - d;
      if (da <= 0) out.push(a);
      if (da * db < 0) {
        const t = da / (da - db);
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    }
    poly = out;
    if (poly.length < 3) return [];
  }
  return poly;
}

export function roundPaver([cx, cz], { y = 0, clip = [] } = {}) {
  const pos = [],
    col = [];
  const c = new THREE.Color();
  // an annular sector as triangles (k pieces along the arc), clipped, at height h in colour `color`
  const sector = (r0, r1, a0, a1, h, color) => {
    const k = Math.max(1, Math.ceil(((a1 - a0) * r1) / 0.35));
    const P = (r, a) => [cx + r * Math.cos(a), cz + r * Math.sin(a)];
    for (let i = 0; i < k; i++) {
      const t0 = a0 + ((a1 - a0) * i) / k,
        t1 = a0 + ((a1 - a0) * (i + 1)) / k;
      const q = [P(r0, t0), P(r1, t0), P(r1, t1), P(r0, t1)];
      for (const tri of [
        [q[0], q[2], q[1]],
        [q[0], q[3], q[2]],
      ]) {
        const poly = clipTri(tri, clip);
        for (let j = 1; j + 1 < poly.length; j++)
          for (const v of [poly[0], poly[j], poly[j + 1]])
            (pos.push(v[0], y + h, v[1]), col.push(color.r, color.g, color.b));
      }
    }
  };
  return {
    // courses of stones from r0 out to r1: each course `course` deep, its stones about `stone` long, every other
    // course shifted half a stone; each stone a tone from `tones`, varied a little. a0..a1 limits the arc.
    ring(
      r0,
      r1,
      {
        course = 0.45,
        stone = 0.6,
        tones,
        vary = 0.06,
        gap = 0.02,
        seed = 1,
        h = 0.006,
        a0 = 0,
        a1 = Math.PI * 2,
      } = {},
    ) {
      const g = c.clone().set(GROUT);
      sector(r0, r1, a0, a1, h - 0.004, g);
      const n = Math.max(1, Math.round((r1 - r0) / course)),
        dr = (r1 - r0) / n;
      for (let i = 0; i < n; i++) {
        const ra = r0 + dr * i,
          rb = ra + dr,
          rm = (ra + rb) / 2;
        const m = Math.max(3, Math.round(((a1 - a0) * rm) / stone)),
          da = (a1 - a0) / m;
        const shift = i % 2 && a1 - a0 >= Math.PI * 2 - 1e-6 ? da / 2 : 0;
        for (let j = 0; j < m; j++) {
          const s0 = a0 + shift + da * j,
            s1 = s0 + da;
          const x = cx + rm * Math.cos((s0 + s1) / 2),
            z = cz + rm * Math.sin((s0 + s1) / 2);
          const t = c.clone().set(tones[Math.floor(hash2(x, z, seed) * tones.length) % tones.length]);
          t.multiplyScalar(1 + (hash2(z, x, seed + 3) - 0.5) * vary);
          const ga = gap / 2 / rm;
          sector(ra + gap / 2, rb - gap / 2, s0 + ga, s1 - ga, h, t);
        }
      }
      return this;
    },
    build(root) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, mat('#ffffff', { vertexColors: true }));
      m.receiveShadow = true;
      m.userData.surf = 'concrete';
      root.add(m);
      return m;
    },
  };
}

// a curved solid between radii r0 and r1 over the angles a0..a1, from y up h: its top, both curved faces and its
// two ends, faceted about every 0.4 along the outer arc. Added to a Parts collector.
export function arcBox(p, color, [cx, cz], r0, r1, a0, a1, { y = 0, h = 0.1, cast = false, surf = 'concrete' } = {}) {
  const k = Math.max(2, Math.ceil(((a1 - a0) * r1) / 0.4));
  const pos = [];
  const P = (r, a, yy) => [cx + r * Math.cos(a), yy, cz + r * Math.sin(a)];
  const quad = (a, b, c2, d) => pos.push(...a, ...b, ...c2, ...a, ...c2, ...d);
  const y1 = y + h;
  for (let i = 0; i < k; i++) {
    const t0 = a0 + ((a1 - a0) * i) / k,
      t1 = a0 + ((a1 - a0) * (i + 1)) / k;
    quad(P(r0, t0, y1), P(r0, t1, y1), P(r1, t1, y1), P(r1, t0, y1)); // top
    quad(P(r1, t0, y), P(r1, t0, y1), P(r1, t1, y1), P(r1, t1, y)); // outer face
    quad(P(r0, t1, y), P(r0, t1, y1), P(r0, t0, y1), P(r0, t0, y)); // inner face
  }
  quad(P(r0, a0, y), P(r0, a0, y1), P(r1, a0, y1), P(r1, a0, y)); // the ends
  quad(P(r1, a1, y), P(r1, a1, y1), P(r0, a1, y1), P(r0, a1, y));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  p.geo(color, g, { cast, surf });
  return p;
}

// where a circle of radius r round c meets the line z = zLine: the angle on the east side (side 1) or the west
// side (side -1), in radians from east toward south
export function arcSpan([, cz], r, zLine, side = 1) {
  const s = Math.max(-1, Math.min(1, (zLine - cz) / r));
  const a = Math.asin(s);
  return side > 0 ? a : Math.PI - a;
}
