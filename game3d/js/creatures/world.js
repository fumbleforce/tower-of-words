// What the creatures know about the place they are in (W in birds.js and others.js): its walk grid, where the
// surfaces are (perches.js), who is about (Eric, Mio, anyone else with a body), what the camera sees, and which
// perches are taken. Distances given to pick and claim are in metres before the place's people scale (K).
import * as THREE from 'three';

const _v = new THREE.Vector3(),
  _w = new THREE.Vector3();

export function creatureWorld(game, place, pts, { sound, blobs, avoid = [] }) {
  const K = place.charScale || 1;
  const taken = {}; // kind -> Set of taken indices
  const pool = Array.from({ length: 24 }, () => new THREE.Vector3());
  const W = {
    K,
    nav: place.nav,
    t: 0,
    eric: new THREE.Vector3(),
    threats: [],
    // is a point in the place's frame on screen (m: how far out from the middle, 1 = the edge)?
    inView(p, m = 0.95) {
      _w.copy(p);
      place.space.localToWorld(_w);
      _w.project(place.camera);
      return _w.z < 1 && Math.abs(_w.x) < m && Math.abs(_w.y) < m;
    },
    // the people this frame: Eric, Mio when shown, and every other body in the place
    look() {
      place.camera.updateMatrixWorld(); // the camera may have moved since the last render (entering, a snap)
      W.eric.copy(game.player.root.position);
      W.threats.length = 0;
      W.threats.push(W.eric);
      const add = (root) => {
        if (!root || !root.visible || W.threats.length >= pool.length) return;
        const v = pool[W.threats.length];
        root.getWorldPosition(v);
        place.space.worldToLocal(v);
        W.threats.push(v);
      };
      if (game.mioNpc?.root.visible) add(game.mioNpc.root);
      for (const p of Object.values(place.people || {})) if (p && p !== game.mioNpc && p !== game.player) add(p.root);
    },
    // a point of one kind (ground, low, high, green, water): { p, on: { kind, i, y } } or null
    //   near (default Eric), min, max: its distance from near; view: on screen (true) or off it (false);
    //   clear: that far from everyone; maxY: no higher; awayFrom: farther from it than near is; nearest: the
    //   closest one instead of any; ok(p): only where it says yes. Taken ones (claim) are skipped
    pick(kind, o = {}) {
      const a = pts[kind];
      if (!a || !a.length) return null;
      const n = a.length / 3,
        near = o.near || W.eric,
        // a phone held upright sees much less to the sides: what should be on screen is looked for nearer
        narrow = o.view === true && place.camera.aspect < 1 ? 0.55 : 1,
        min = (o.min || 0) * K * narrow,
        max = (o.max ?? 1e9) * K,
        clear = Math.max((o.clear || 0) * narrow, Math.min(o.clear || 0, 3)) * K,
        used = taken[kind];
      const start = Math.floor(Math.random() * n);
      let best = -1,
        bd = Infinity;
      for (let j = 0; j < n; j++) {
        const i = (start + j) % n;
        if (used?.has(i)) continue;
        _v.set(a[i * 3], a[i * 3 + 1], a[i * 3 + 2]);
        if (o.maxY !== undefined && _v.y > o.maxY) continue;
        const d = Math.hypot(_v.x - near.x, _v.z - near.z);
        if (d < min || d > max) continue;
        if (
          o.awayFrom &&
          Math.hypot(_v.x - o.awayFrom.x, _v.z - o.awayFrom.z) <
            Math.hypot(near.x - o.awayFrom.x, near.z - o.awayFrom.z)
        )
          continue;
        if (clear && W.threats.some((t) => Math.hypot(t.x - _v.x, t.z - _v.z) < clear)) continue;
        if (avoid.some(([x, z]) => Math.hypot(x - _v.x, z - _v.z) < 3 * K)) continue; // catalog.js AVOID
        if (o.edge && W.nav.clearance(_v.x, _v.z) > 0.7) continue;
        if (o.ok && !o.ok(_v)) continue;
        // on screen: well inside it; off it: past the edge
        if (o.view === true && !W.inView(_v, 0.75)) continue;
        if (o.view === false && W.inView(_v, 1.05)) continue;
        if (!o.nearest) {
          best = i;
          break;
        }
        if (d < bd) ((bd = d), (best = i));
      }
      if (best < 0) return null;
      const p = new THREE.Vector3(a[best * 3], a[best * 3 + 1], a[best * 3 + 2]);
      return { p, on: { kind, i: best, y: p.y } };
    },
    // pick and take a point for creature c (a perch holds one); free(c) gives it back. kind may be a list, tried in
    // order, first on screen (if view asks for it) and then anywhere
    claim(kind, c, o = {}) {
      const kinds = Array.isArray(kind) ? kind : [kind];
      let s = null;
      for (const k of kinds) if (!s) s = W.pick(k, o);
      if (o.view !== undefined) for (const k of kinds) if (!s) s = W.pick(k, { ...o, view: undefined });
      if (!s) return null;
      kind = s.on.kind;
      W.free(c);
      if (kind !== 'ground') {
        (taken[kind] ||= new Set()).add(s.on.i);
        c.claim = s.on;
      }
      return s;
    },
    free(c) {
      if (c.claim) taken[c.claim.kind]?.delete(c.claim.i);
      c.claim = null;
    },
    sound(name, p) {
      _v.copy(p);
      const d = _v.distanceTo(W.eric) / K;
      if (d > 22) return;
      place.space.localToWorld(_v);
      _v.project(place.camera);
      sound(name, Math.max(0.15, 1 - d / 22), Math.max(-1, Math.min(1, _v.x)));
    },
    blob(p, r, y) {
      blobs.add(p, r, y);
    },
    reset() {
      for (const k of Object.keys(taken)) taken[k].clear();
    },
  };
  return W;
}
