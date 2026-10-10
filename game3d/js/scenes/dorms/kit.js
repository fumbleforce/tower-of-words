// Eric's dorm room is built from many small boxes (tatami, bedding, box flaps, shoes). The kit collects their
// geometry and adds one mesh per colour, surface and shadow setting, so the whole flat costs a few dozen draw calls.
// Surfaces are the look's kinds (look/procedural.js): 'fabric', 'plaster', 'metal', 'card' and so on.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { roundedBox } from '../../perf/rounded-box.js';
import { mat, sh } from '../../props.js';

const _m = new THREE.Matrix4(),
  _q = new THREE.Quaternion(),
  _e = new THREE.Euler(),
  _p = new THREE.Vector3(),
  _s = new THREE.Vector3(1, 1, 1);

export class Kit {
  constructor() {
    this.sets = new Map();
  }
  add(color, geometry, { surf = null, cast = true, recv = true, opts = {} } = {}) {
    const key = `${color}|${surf}|${cast}|${recv}|${JSON.stringify(opts)}`;
    if (!this.sets.has(key)) this.sets.set(key, { color, surf, cast, recv, opts, parts: [] });
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    for (const name of Object.keys(g.attributes))
      if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    this.sets.get(key).parts.push(g);
    return this;
  }
  // a box standing on y (its bottom), centred on x and z, turned by ry (and rx, rz about its centre); r rounds it
  box(color, w, h, d, x, y, z, { r = 0, ry = 0, rx = 0, rz = 0, seg = 1, ...o } = {}) {
    const g =
      r > 0
        ? roundedBox(w, h, d, seg, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001))
        : new THREE.BoxGeometry(w, h, d);
    _e.set(rx, ry, rz);
    _q.setFromEuler(_e);
    _p.set(x, y + h / 2, z);
    g.applyMatrix4(_m.compose(_p, _q, _s));
    return this.add(color, g, o);
  }
  // many boxes of one colour: [w, h, d, x, y, z] each
  boxes(color, list, o = {}) {
    for (const [w, h, d, x, y, z] of list) this.box(color, w, h, d, x, y, z, o);
    return this;
  }
  // an upright cylinder standing on y
  cyl(color, rTop, rBot, h, x, y, z, { seg = 12, rx = 0, rz = 0, ...o } = {}) {
    const g = new THREE.CylinderGeometry(rTop, rBot, h, seg);
    _e.set(rx, 0, rz);
    _q.setFromEuler(_e);
    _p.set(x, y + h / 2, z);
    g.applyMatrix4(_m.compose(_p, _q, _s));
    return this.add(color, g, o);
  }
  // everything collected, as one mesh per set, into root
  flush(root) {
    for (const s of this.sets.values()) {
      const parts = s.parts.map((g) => {
        if (!g.attributes.uv)
          g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
        return g;
      });
      const mesh = sh(new THREE.Mesh(mergeGeometries(parts), mat(s.color, s.opts)), s.cast, s.recv);
      if (s.surf) mesh.userData.surf = s.surf;
      parts.forEach((g) => g.dispose());
      root.add(mesh);
    }
    this.sets.clear();
    return root;
  }
}
