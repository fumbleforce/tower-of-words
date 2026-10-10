// Birds of one kind share a rigid skinned batch: one draw call for the whole flock, with each body and wing
// retaining its own transform. Insects and ground discs are instanced; empty groups draw nothing.
// No shadow pass: a soft disc under each creature on a surface (one more call for all of them) grounds it.
import * as THREE from 'three';
import { rigidBatch } from '../perf/rigid-batch.js';
import { updateInstanceBounds } from '../perf/instance-bounds.js';
import { birdGeometry, blobTexture } from './models.js';

const mat = () => {
  const m = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.9,
    metalness: 0,
  });
  m.userData.noLook = true; // keeps its flat colours (look/index.js), like the people
  return m;
};
const _m = new THREE.Matrix4(),
  _w = new THREE.Matrix4(),
  _q = new THREE.Quaternion(),
  _e = new THREE.Euler(0, 0, 0, 'YXZ'),
  _s = new THREE.Vector3(),
  _p = new THREE.Vector3();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

function instanced(geo, material, cap) {
  const m = new THREE.InstancedMesh(geo, material, cap);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.receiveShadow = true;
  m.castShadow = false;
  m.userData.noBatch = true; // they move: the draw-call pass leaves them alone (perf/batch.js)
  m.userData.creature = true;
  for (let i = 0; i < cap; i++) m.setMatrixAt(i, ZERO);
  return m;
}

// A kind of bird: up to cap of them. pose(i, b) writes bird i from its state b: p (position), yaw, pitch, roll,
// flap (the wings' angle up from level), fold (0 spread, 1 folded along the back), size.
export class BirdMeshes {
  constructor(kind, cap, scale) {
    const g = birdGeometry(kind);
    this.kind = kind;
    this.cap = cap;
    this.scale = scale;
    const [sx, sy, sz] = g.shoulder;
    this.shoulders = [
      new THREE.Matrix4().makeTranslation(sx, sy, sz),
      new THREE.Matrix4().makeTranslation(-sx, sy, sz),
    ];
    const m = mat();
    this.body = instanced(g.body, m, cap);
    this.left = instanced(g.wing, m, cap);
    this.right = instanced(g.right, m, cap);
    this.group = new THREE.Group();
    this.batch = rigidBatch([this.body, this.left, this.right]);
    this.batch.mesh.userData.creature = true;
    this.group.add(this.batch.mesh);
    this.used = 0;
  }
  pose(i, b) {
    _e.set(b.pitch, b.yaw, b.roll);
    _q.setFromEuler(_e);
    _s.setScalar(this.scale * (b.size || 1));
    _m.compose(b.p, _q, _s);
    this.body.setMatrixAt(i, _m);
    // each wing: spread, it is raised or lowered by the flap (about z); folded, it hangs against the flank (turned
    // about its span) and points back along the body (about y). The right one is the left's mirror image, so its
    // turns about y and z go the other way
    for (const [k, wing] of [this.left, this.right].entries()) {
      const s = k ? -1 : 1;
      _e.set(-b.fold * 1.3, s * b.fold * 1.5, s * (b.flap - b.fold * 0.15), 'YZX');
      _q.setFromEuler(_e);
      _w.compose(_p.set(0, 0, 0), _q, _s.set(1, 1, 1 - 0.4 * b.fold)); // folded, it is narrower too
      _w.premultiply(this.shoulders[k]).premultiply(_m);
      wing.setMatrixAt(i, _w);
    }
    _e.order = 'YXZ';
  }
  hide(i) {
    this.body.setMatrixAt(i, ZERO);
    this.left.setMatrixAt(i, ZERO);
    this.right.setMatrixAt(i, ZERO);
  }
  commit(any) {
    this.group.visible = any;
    if (!any) return;
    this.batch.commit();
  }
}

// The soft discs under creatures on a surface: place(i, p, r) or hide(i).
export class Blobs {
  constructor(cap) {
    const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({
      map: blobTexture(),
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    material.userData.noLook = true;
    this.mesh = instanced(geo, material, cap);
    this.mesh.receiveShadow = false;
    this.mesh.renderOrder = 1;
    this.n = 0;
  }
  start() {
    this.n = 0;
  }
  add(p, r, y = p.y) {
    if (this.n >= this.mesh.count) return;
    _m.makeScale(r * 2, 1, r * 2).setPosition(p.x, y + 0.012, p.z);
    this.mesh.setMatrixAt(this.n++, _m);
  }
  commit() {
    for (let i = this.n; i < this.mesh.count; i++) this.mesh.setMatrixAt(i, ZERO);
    this.mesh.visible = this.n > 0;
    updateInstanceBounds(this.mesh);
  }
}

// Insects: one shape each, flapped by squashing it across. pose(i, p, yaw, flap) with flap 0 (flat) to 1 (closed).
export class InsectMeshes {
  constructor(geo, cap, scale) {
    this.mesh = instanced(geo, mat(), cap);
    this.scale = scale;
  }
  pose(i, p, yaw, flap, color) {
    _e.set(0, yaw, 0);
    _q.setFromEuler(_e);
    _s.set(this.scale * (1 - 0.8 * flap), this.scale, this.scale);
    _m.compose(p, _q, _s);
    this.mesh.setMatrixAt(i, _m);
    if (color) this.mesh.setColorAt(i, color);
  }
  hide(i) {
    this.mesh.setMatrixAt(i, ZERO);
  }
  commit(any) {
    this.mesh.visible = any;
    if (!any) return;
    updateInstanceBounds(this.mesh);
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
