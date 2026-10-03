// Each cast chibi's build (Review chibi-proportions-1). Jørgen, 2026-10-03: "The chibis are bit odd proportions
// sometimes, kuro looks like a fat short baby rather than the sharp refined secretary". Meshy made every chibi on the
// same template (a head about a third of the height, short stubby legs); BUILDS reshapes each one once, when its
// files load, so the clips still play on the same skeleton:
//   head    the head (with hair, glasses and face) scaled at its joint; 0.85 is the earlier "a little too big" fix
//   torso   [width, height, depth] of the hips and spine: a slimmer waist, a longer or rounder trunk
//   chest   [width, height, depth] of the top spine bone only, over torso (a fuller or narrower chest)
//   legs    [length, thickness] of the thighs and shins (the feet keep their size)
//   arms    [length, thickness] of the upper arms and forearms
//   feet, hands   their size (1: as Meshy made them)
// The mesh is deformed in its rest pose (each vertex by its bones' share of the scaling), the joints move with it, the
// skeleton is bound again there, and the feet are put back on the ground. The hips' height in every clip grows with
// the legs, so the feet stay on the floor, and the strides with the share of the height the legs take (the clips'
// speeds were measured on Meshy's proportions). The scenes still fit everyone to their standing height.
import * as THREE from 'three';

const PLAIN = { head: 0.85 };
export const BUILDS = {
  // Jørgen's words: "sharp refined secretary", not "a fat short baby": slim waist and limbs, long legs, smaller head,
  // smaller hands and feet (about 3 heads tall from 2.2, counting her bun)
  kuro: {
    head: 0.7,
    torso: [0.8, 1.15, 0.84],
    chest: [1, 1, 1.04],
    legs: [1.7, 0.8],
    arms: [1.25, 0.82],
    feet: 0.85,
    hands: 0.78,
  },
  // a refined adult build like Kuro's (her face is a new model: Review chibi-proportions-1)
  rei: { head: 0.74, torso: [0.84, 1.12, 0.86], legs: [1.6, 0.84], arms: [1.2, 0.84], feet: 0.88, hands: 0.82 },
  // small tweaks where the figure didn't say who they are; Eric, Mio, the guard and Aoi stay as they were
  mori: { head: 0.82, torso: [1.05, 1.06, 1.08], legs: [1.06, 1] }, // older: a settled middle, a longer trunk
  kenji: { head: 0.85, torso: [1.2, 1, 1.25], legs: [1, 1.08], arms: [1, 1.08] }, // rounder, as his portrait
  emi: { head: 0.84, torso: [0.94, 1.03, 0.96], chest: [1.14, 1, 1.3], hips: [1.24, 1, 1.15], legs: [1.1, 0.98] }, // curvy
  kuroda: { head: 0.83, torso: [0.92, 1.06, 0.92], legs: [1.1, 0.9], arms: [1.06, 0.9] }, // thin and tired
};
// ?chibibuild=0 shows Meshy's proportions (with the 0.85 head), to compare
const OFF = typeof location !== 'undefined' && new URLSearchParams(location.search).get('chibibuild') === '0';
export const buildOf = (id) => (OFF ? PLAIN : BUILDS[id] || PLAIN);

const LEGS = ['LeftUpLeg', 'LeftLeg', 'RightUpLeg', 'RightLeg'];
const ARMS = ['LeftArm', 'LeftForeArm', 'RightArm', 'RightForeArm'];
const TORSO = ['Hips', 'Spine02', 'Spine01', 'Spine'];
const diag = ([x, y, z]) => new THREE.Matrix3().set(x, 0, 0, 0, y, 0, 0, 0, z);
// length along the bone (towards its child joint) and thickness across it
function along(d, len, thick) {
  const m = new THREE.Matrix3().multiplyScalar(0);
  const e = m.elements,
    a = d.toArray();
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) e[j * 3 + i] = (i === j ? thick : 0) + (len - thick) * a[i] * a[j];
  return m;
}

// Reshapes the loaded scene (shared by every copy) and the clips' JSON in place; returns the factor for the strides.
export function shapeChibi(scene, clipsJson, b) {
  scene.updateMatrixWorld(true);
  const box0 = new THREE.Box3().setFromObject(scene);
  const H0 = box0.max.y - box0.min.y;
  const mesh = [];
  scene.traverse((o) => o.isSkinnedMesh && mesh.push(o));
  const bones = mesh[0].skeleton.bones;
  const byName = Object.fromEntries(bones.map((x) => [x.name, x]));
  const pos = new Map(bones.map((x) => [x, x.getWorldPosition(new THREE.Vector3())]));
  const child = (x) => x.children.find((c) => c.isBone);
  // the linear part of each bone's change, in the scene's axes
  const lin = new Map();
  const spec = (x) => {
    const n = x.name;
    if (n === 'Head') return new THREE.Matrix3().multiplyScalar(b.head ?? 1);
    if (n === 'Spine' && (b.chest || b.torso)) {
      const t = b.torso || [1, 1, 1],
        c = b.chest || [1, 1, 1];
      return diag(t.map((v, i) => v * c[i]));
    }
    if (n === 'Hips' && b.hips) return diag((b.torso || [1, 1, 1]).map((v, i) => v * b.hips[i]));
    if (TORSO.includes(n) && b.torso) return diag(b.torso);
    const limb = LEGS.includes(n) ? b.legs : ARMS.includes(n) ? b.arms : null;
    if (limb) {
      const d = pos.get(child(x)).clone().sub(pos.get(x)).normalize();
      return along(d, limb[0], limb[1]);
    }
    // feet and hands keep their size unless the build says, the neck and shoulders theirs; the head's extra bones and
    // the toes go with their parent
    if (/Foot$/.test(n)) return new THREE.Matrix3().multiplyScalar(b.feet ?? 1);
    if (/Hand$/.test(n)) return new THREE.Matrix3().multiplyScalar(b.hands ?? 1);
    if (/^neck$|Shoulder$/.test(n)) return new THREE.Matrix3();
    return null;
  };
  const moved = new Map();
  const walk = (x, parentLin) => {
    const L = spec(x) || parentLin || new THREE.Matrix3();
    lin.set(x, L);
    if (!moved.has(x)) moved.set(x, pos.get(x).clone());
    for (const c of x.children) {
      if (!c.isBone) continue;
      // a child joint moves with its parent's scaling
      moved.set(c, pos.get(c).clone().sub(pos.get(x)).applyMatrix3(L).add(moved.get(x)));
      walk(c, L);
    }
  };
  const roots = bones.filter((x) => !x.parent?.isBone);
  roots.forEach((r) => walk(r, null));
  // deform each mesh in the scene's space
  const pts = [];
  let minY = Infinity;
  const v = new THREE.Vector3(),
    w = new THREE.Vector3(),
    t = new THREE.Vector3(),
    M = new THREE.Matrix3(),
    rest = new THREE.Matrix4(),
    Lb = new THREE.Matrix3();
  for (const m of mesh) {
    const g = m.geometry,
      P = g.attributes.position,
      N = g.attributes.normal,
      si = g.attributes.skinIndex,
      sw = g.attributes.skinWeight;
    const out = new Float32Array(P.count * 3),
      nout = N ? new Float32Array(N.count * 3) : null;
    const sk = m.skeleton;
    m.updateMatrixWorld(true);
    const boneMat = sk.bones.map((x, i) => new THREE.Matrix4().multiplyMatrices(x.matrixWorld, sk.boneInverses[i]));
    for (let i = 0; i < P.count; i++) {
      rest.elements.fill(0);
      Lb.elements.fill(0);
      t.set(0, 0, 0);
      for (let k = 0; k < 4; k++) {
        const wt = sw.getComponent(i, k);
        if (!wt) continue;
        const bone = sk.bones[si.getComponent(i, k)];
        const re = rest.elements,
          be = boneMat[si.getComponent(i, k)].elements;
        for (let e = 0; e < 16; e++) re[e] += wt * be[e];
        const le = Lb.elements,
          ll = lin.get(bone).elements;
        for (let e = 0; e < 9; e++) le[e] += wt * ll[e];
      }
      // where the point is at rest: the bones' matrices on the bound point (three.js's skinning, in the scene's space)
      rest.multiply(m.bindMatrix);
      v.fromBufferAttribute(P, i).applyMatrix4(rest);
      for (let k = 0; k < 4; k++) {
        const wt = sw.getComponent(i, k);
        if (!wt) continue;
        const bone = sk.bones[si.getComponent(i, k)];
        // where this bone takes the point: its joint's new place plus its scaling of the offset from the joint
        w.copy(v).sub(pos.get(bone)).applyMatrix3(lin.get(bone)).add(moved.get(bone));
        t.addScaledVector(w, wt);
      }
      out.set([t.x, t.y, t.z], i * 3);
      minY = Math.min(minY, t.y);
      if (nout) {
        M.setFromMatrix4(rest).invert().transpose();
        w.fromBufferAttribute(N, i).applyMatrix3(M);
        w.applyMatrix3(Lb.invert().transpose()).normalize();
        nout.set([w.x, w.y, w.z], i * 3);
      }
    }
    pts.push([m, out, nout]);
  }
  // feet back on the ground
  const lift = -minY;
  for (const p of moved.values()) p.y += lift;
  for (const [m, out, nout] of pts) {
    // the skeleton is bound again at the new rest (calculateInverses), so the points go in before bindMatrix
    const inv = m.bindMatrix.clone().invert(),
      nm = new THREE.Matrix3().setFromMatrix4(m.bindMatrix).transpose();
    for (let i = 0; i < out.length; i += 3) {
      v.fromArray(out, i);
      v.y += lift;
      v.applyMatrix4(inv).toArray(out, i);
      if (nout) w.fromArray(nout, i).applyMatrix3(nm).normalize().toArray(nout, i);
    }
    const g = m.geometry;
    g.setAttribute('position', new THREE.BufferAttribute(out, 3));
    if (nout) g.setAttribute('normal', new THREE.BufferAttribute(nout, 3));
    g.computeBoundingBox();
    g.computeBoundingSphere();
    m.boundingBox = null;
    m.boundingSphere = null;
  }
  // the joints to their new places, rotations kept, and the skeleton bound there
  const hips = byName.Hips;
  const h0 = pos.get(hips).y;
  for (const x of bones) {
    const p = moved.get(x).clone();
    x.parent.updateMatrixWorld(true);
    x.position.copy(x.parent.worldToLocal(p));
    x.updateMatrixWorld(true);
  }
  for (const m of mesh) m.skeleton.calculateInverses();
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const H1 = box.max.y - box.min.y;
  const k = moved.get(hips).y / h0;
  // the clips' hips heights grow with the legs (the armature has no turn, so its local y scales as the world's)
  for (const c of Object.values(clipsJson)) {
    for (const tr of c.tracks || []) {
      if (tr.name !== hips.name + '.position') continue;
      for (let i = 1; i < tr.values.length; i += 3) tr.values[i] *= k;
    }
  }
  return { stride: moved.get(hips).y / H1 / (h0 / H0), height: H1, heads: H1 / headSize(scene, byName, moved) };
}
// the head's height over the whole figure, for the report (crown above the chin, roughly from the neck joint)
function headSize(scene, byName, moved) {
  const box = new THREE.Box3().setFromObject(scene);
  return box.max.y - moved.get(byName.neck).y;
}
