// A world piece, declared once (notes/architecture/world-kit.md, "Declaring a piece once, with variation"):
//
//   export const lamp = piece({
//     id: 'street/lamp', family: 'lighting', label: 'Street lamp', fidelity: 'finished',
//     use: "lamp(p, { at: [x, z], face, variant: 'post' })",
//     variants: { post: { h: 3.2 }, arm: { h: 4.2, arm: 0.6 } },
//     vary: { tone: 0.05, wear: [0, 0.3], scale: [0.97, 1.03], turn: 0.05 },
//     build(k, o) { ... },               // geometry, in the piece's own frame, through k (below)
//     footprint: (o) => [[u0, u1, v0, v1]],   // ground it takes from walking, in its own frame
//     spots: (o) => ({ seats: [[u, v, y, face]] }),   // places a place can use: seats, doors, tap targets, plants
//   });
//
// and placed with a position, a facing and an optional seed:
//   lamp(p, { at: [x, z], face, y, variant, seed, level, ...any variant value })
//   fence(p, { from: [x, z], to: [x, z], variant })       a run piece (run: true): its own u runs from -len/2 to len/2
// face: the way the piece looks, radians, 0 = +z (south), as the outdoor kit's benches have it. The piece's frame:
// u across it (to your right as you stand in front of it, looking at it), v toward where it looks, y up.
//
// The seed defaults to the piece id and position (kit/core/rng.js seedAt): two lamps in a row differ a little, and
// one lamp looks the same on every visit. vary keeps that inside chosen limits: tone (a lightness shift, ±), wear
// ([min, max], 0..1, towards grime), scale ([min, max]) and turn (radians, ±; for bins and planters, not walls).
// level: 'phone' | 'standard' | 'high' (kit/core/detail.js); the default is p.level, else 'standard'.
//
// The call returns { blocks, spots, glow } in the place's frame: rects [x0, x1, z0, z1] for the walk grid
// (nav.block), named lists of [x, z, y, face] spots, and what glows at night ({ kind, at: [x, y, z] }, the meshes
// themselves built by kit/core/build.js buildKit). The same go onto p.kit, for a place to take all at once.
import * as THREE from 'three';
import { roundedBox } from '../../perf/rounded-box.js';
import { rng, seedAt, between } from './rng.js';
import { segments } from './detail.js';

const GRIME = new THREE.Color('#4f4b45');
const _c = new THREE.Color(),
  _hsl = {};

// the collector's kit lists (glass, lit panes, lamp heads, pools, and what every piece reported)
export function kitBag(p) {
  return (p.kit ||= {
    glass: [],
    lit: [],
    heads: [],
    pools: [],
    blocks: [],
    spots: {},
    glow: [],
    pieces: 0,
  });
}

export function piece(decl) {
  const { id, variants = { default: {} }, vary = {}, run = false } = decl;
  const first = Object.keys(variants)[0];
  function place(p, opts = {}) {
    const { at, from, to, face: face0 = 0, y = 0, variant = first, seed: seed0, level: level0, ...over } = opts;
    if (!variants[variant]) throw new Error(`${id}: no variant '${variant}'`);
    let x, z, face, len;
    if (run) {
      if (!from || !to) throw new Error(`${id}: a run piece takes from and to`);
      const dx = to[0] - from[0],
        dz = to[1] - from[1];
      len = Math.hypot(dx, dz);
      [x, z, face] = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, Math.atan2(-dz, dx)];
    } else {
      [x, z] = at || [0, 0];
      face = face0;
    }
    const seed = seed0 ?? seedAt(id, x, z);
    const r = rng(seed);
    const level = level0 || p.level || 'standard';
    // the variation drawn first, always in the same order, so a variant's own use of r doesn't move it
    const tone = vary.tone ? between(r, vary.tone) : 0,
      wear = vary.wear ? between(r, vary.wear) : 0,
      scale = vary.scale ? between(r, vary.scale) : 1,
      turn = vary.turn ? between(r, vary.turn) : 0;
    const o = {
      ...variants[variant],
      ...over,
      variant,
      seed,
      level,
      tone,
      wear,
      scale,
    };
    if (run) o.len = len;
    const ry = face + turn;
    const toWorld = (g) => g.scale(scale, scale, scale).rotateY(ry).translate(x, y, z);
    const point = (u, yy, v) => {
      const c = Math.cos(ry),
        s = Math.sin(ry);
      return [x + (u * c + v * s) * scale, y + yy * scale, z + (-u * s + v * c) * scale];
    };
    const bag = kitBag(p);
    const glow = [];
    const k = {
      r,
      level,
      o,
      phone: level === 'phone',
      high: level === 'high',
      seg: (n, min) => segments(n, level, min),
      // a colour with the piece's tone and wear; worn: false keeps it as given (glass, signs, paint that's kept up)
      c(color, { worn = true } = {}) {
        _c.set(color);
        if (tone) {
          _c.getHSL(_hsl);
          _c.setHSL(_hsl.h, _hsl.s, Math.min(1, Math.max(0, _hsl.l + tone)));
        }
        if (worn && wear) _c.lerp(GRIME, wear * 0.35);
        return '#' + _c.getHexString();
      },
      geo(color, g, opts) {
        p.geo(k.c(color, opts), toWorld(g), opts);
        return k;
      },
      // a box standing on y (its bottom), centred at (u, v); round: the radius of its rounded edges
      box(color, w, h, d, u, yy, v, { ry: turnBox = 0, round = 0, ...opts } = {}) {
        // rounded edges cost triangles: none on the phone, a single bevel at the standard level and only on boxes big
        // enough for it to show, a rounder edge at high
        const small = Math.min(w, h, d) < 0.05 && level !== 'high';
        const rr = level === 'phone' || small ? 0 : Math.min(round, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
        const g = rr > 0 ? roundedBox(w, h, d, level === 'high' ? 2 : 1, rr) : new THREE.BoxGeometry(w, h, d);
        if (turnBox) g.rotateY(turnBox);
        return k.geo(color, g.translate(u, yy + h / 2, v), opts);
      },
      // an upright cylinder standing on y; n round segments at the standard level
      cyl(color, rTop, rBottom, h, u, yy, v, { n = 10, ...opts } = {}) {
        return k.geo(
          color,
          new THREE.CylinderGeometry(rTop, rBottom, h, k.seg(n, Math.min(n, 6))).translate(u, yy + h / 2, v),
          opts,
        );
      },
      // a round bar from a to b ([u, y, v])
      bar(color, a, b, radius, { n = 8, ...opts } = {}) {
        const A = new THREE.Vector3(...a),
          B = new THREE.Vector3(...b),
          L = A.distanceTo(B);
        const g = new THREE.CylinderGeometry(radius, radius, L, k.seg(n, 4)).translate(0, L / 2, 0);
        g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize()));
        return k.geo(color, g.translate(...a), opts);
      },
      // window glass (the street style gives it reflections and rooms behind it: scenes/diorama/materials.js)
      glass(g) {
        bag.glass.push(toWorld(g));
        return k;
      },
      // a pane lit after dark (a window, a door's glass), shown only at night
      lit(g, color = '#e8c89a') {
        const w = toWorld(g);
        bag.lit.push([w, color]);
        w.computeBoundingBox();
        glow.push({
          kind: 'pane',
          at: w.boundingBox.getCenter(new THREE.Vector3()).toArray(),
        });
        return k;
      },
      // a lamp's lit head, turned up at night; with its light pool on the ground at (u, v), radius r
      lamp(g, pool = null) {
        const w = toWorld(g);
        bag.heads.push(w);
        w.computeBoundingBox();
        glow.push({
          kind: 'lamp',
          at: w.boundingBox.getCenter(new THREE.Vector3()).toArray(),
          pool: pool?.[2] ?? 0,
        });
        if (pool) {
          const [px, , pz] = point(pool[0], 0, pool[1]);
          bag.pools.push([px, pz, pool[2] * scale]);
        }
        return k;
      },
      point,
    };
    decl.build(k, o);

    const blocks = (decl.footprint?.(o) || []).map(([u0, u1, v0, v1]) => {
      const pts = [point(u0, 0, v0), point(u1, 0, v0), point(u0, 0, v1), point(u1, 0, v1)];
      const xs = pts.map((q) => q[0]),
        zs = pts.map((q) => q[2]);
      return [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)].map((n) => +n.toFixed(3));
    });
    const spots = {};
    for (const [name, list] of Object.entries(decl.spots?.(o) || {})) {
      spots[name] = list.map(([u, v, yy = 0, f = 0]) => {
        const [sx, sy, sz] = point(u, yy, v);
        return [+sx.toFixed(3), +sz.toFixed(3), +sy.toFixed(3), +(ry + f).toFixed(4)];
      });
      (bag.spots[name] ||= []).push(...spots[name]);
    }
    bag.blocks.push(...blocks);
    bag.glow.push(...glow);
    bag.pieces++;
    return { blocks, spots, glow, seed, variant, level };
  }
  place.decl = decl;
  place.id = id;
  return place;
}
