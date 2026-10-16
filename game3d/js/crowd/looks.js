// The ambient crowd's bodies: the office pair A and B, and the everyday bodies by kind (crowd/bodies.js crowdBody), each
// in its own colours, with bags. makeBody owns only appearance and bags. Population, route planning and gait remain in
// the crowd controllers.
import * as THREE from 'three';
import { toCreasedNormals, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { S as PROP_SCALE, standIn, missing } from '../train/people.js';
import { hull } from '../train/hull.js';
import { K } from '../scenes/office.js';
import { crowdBody, hold, boneAt } from './bodies.js';
import { approvedCrowd } from './approved-models.js';
import { bagPose } from './bag-pose.js';

// one material for the bags' parts, so each bag merges into one draw
const mat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  flatShading: false,
  roughness: 0.93,
  metalness: 0,
});
mat.userData.noLook = true;
const part = (pts, col) => {
  const m = new THREE.Mesh(toCreasedNormals(hull(pts, col, { grad: 0.12, name: 'bag' }).build(), 0.7), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};
const boxPts = (w, h, d, y = 0) => {
  const out = [];
  for (const x of [-w / 2, w / 2]) for (const yy of [y, y + h]) for (const z of [-d / 2, d / 2]) out.push([x, yy, z]);
  return out;
};

// Bag geometry is in the people's prop units (train/people.js S). The handle supplies its grip point.
function briefcase() {
  const g = new THREE.Group();
  g.add(part(boxPts(0.24, 0.17, 0.07, -0.27), '#2c2f38'));
  g.add(part(boxPts(0.08, 0.03, 0.02, -0.1), '#1e2027'));
  return g;
}
function tote(col) {
  const g = new THREE.Group();
  g.add(
    part(
      [
        [-0.13, -0.42, -0.05],
        [0.13, -0.42, -0.05],
        [-0.13, -0.42, 0.05],
        [0.13, -0.42, 0.05],
        [-0.15, -0.16, -0.06],
        [0.15, -0.16, -0.06],
        [-0.15, -0.16, 0.06],
        [0.15, -0.16, 0.06],
      ],
      col,
    ),
  );
  g.add(part(boxPts(0.025, 0.14, 0.02, -0.17), col)); // the handle up to the hand
  return g;
}
function groceries() {
  const g = tote('#f1efe8');
  g.add(
    part(
      boxPts(0.06, 0.1, 0.05, -0.2).map(([x, y, z]) => [x - 0.05, y, z]),
      '#6f9a4a',
    ),
  ); // a leek's top
  return g;
}
function backpack(col) {
  return part(
    [
      [-0.12, -0.02, -0.1],
      [0.12, -0.02, -0.1],
      [-0.12, -0.02, -0.2],
      [0.12, -0.02, -0.2],
      [-0.11, 0.26, -0.1],
      [0.11, 0.26, -0.1],
      [-0.1, 0.26, -0.19],
      [0.1, 0.26, -0.19],
    ],
    col,
  );
}

// The lower fingers hold the handle; centering it in a large fist buries the bag rim.
// Measured only when creating a bag carrier; the resulting mount follows the bone.
function palmAt(r) {
  const hand = r.model.getObjectByName('LeftHand'),
    box = new THREE.Box3(),
    point = new THREE.Vector3(),
    fingers = [];
  r.root.updateMatrixWorld(true);
  r.model.traverse((mesh) => {
    if (!mesh.isSkinnedMesh) return;
    const { position, skinIndex, skinWeight } = mesh.geometry.attributes;
    if (!skinIndex || !skinWeight) return;
    mesh.skeleton.update();
    for (let i = 0; i < position.count; i++) {
      let weight = 0;
      for (let k = 0; k < 4; k++)
        if (mesh.skeleton.bones[skinIndex.getComponent(i, k)] === hand) weight += skinWeight.getComponent(i, k);
      if (weight < 0.7) continue;
      mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld);
      r.root.worldToLocal(point);
      box.expandByPoint(point);
      fingers.push(point.clone());
    }
  });
  if (box.isEmpty()) return boneAt(r, 'LeftHand');
  const bottom = box.min.y + (box.max.y - box.min.y) * 0.1;
  const grip = fingers.filter((p) => p.y <= bottom);
  return grip.reduce((sum, p) => sum.add(p), point.set(0, 0, 0)).divideScalar(grip.length);
}
// A bag's parts share one material (vertex colours), so they draw as one mesh: a carried prop on a hand bone draws
// on its own every frame, and twice on the desktop (its AO pass), #374. The parts stay in the bag, hidden, as the
// carry checks read them (children[0] the body, children[1] the handle).
function oneMesh(bag) {
  const parts = bag.children.filter((o) => o.isMesh && o.material === mat);
  if (parts.length < 2) return;
  const geometry = mergeGeometries(parts.map((o) => (o.updateMatrix(), o.geometry.clone().applyMatrix4(o.matrix))));
  if (!geometry) return;
  const one = new THREE.Mesh(geometry, mat);
  one.castShadow = one.receiveShadow = true;
  for (const o of parts) o.visible = false;
  bag.add(one);
}
function carryBag(r, bag) {
  bag.name = 'crowd-bag';
  // The broad face runs beside the leg, with the long ends along the walking direction.
  bag.rotation.y = Math.PI / 2;
  const handle = bag.children[1];
  handle.geometry.computeBoundingBox();
  const grip = handle.geometry.boundingBox.getCenter(new THREE.Vector3());
  oneMesh(bag);
  const palm = palmAt(r);
  // These props were drawn for longer procedural arms. Fit their furthest corner
  // inside 60% of the standing hand's ground clearance, leaving room for its gait.
  const bounds = new THREE.Box3().setFromObject(bag);
  const reach = Math.max(bounds.min.distanceTo(grip), bounds.max.distanceTo(grip));
  const fit = Math.min(1, (palm.y * 0.6) / (reach * PROP_SCALE));
  bag.scale.setScalar(fit);
  bag.position.copy(grip).multiplyScalar(-fit);
  const mount = hold(r, bag, palm, 'LeftHand');
  bagPose(r, mount, { palm, bounds, grip, fit, propScale: PROP_SCALE });
}

// kind: office | casual | sport | elder. i picks the variant (clothes, hair, bag)
// A body that did not load is a stand-in that is never drawn, and carries no bag (train/people.js missing).
export function makeBody(kind, i) {
  const gen = (kind === 'office' && approvedCrowd(i)) || crowdBody(kind, i);
  const r = gen || missing(standIn(`crowd ${kind} ${i}`), `crowd ${kind} ${i}`);
  if (gen) r.root.traverse((o) => o.isSkinnedMesh && fitSphere(o));
  r.root.scale.multiplyScalar(K * (0.95 + ((i * 37) % 11) / 100)); // a little taller or shorter each
  // a bag in the left hand or on the back, for some
  const pick = i % 4;
  let bag = null;
  if (kind === 'office' && pick !== 3) bag = pick === 2 ? tote('#5b6474') : briefcase();
  if ((kind === 'casual' && pick === 0) || (kind === 'elder' && pick === 1)) bag = groceries();
  if (kind === 'casual' && pick === 2) bag = tote(['#9db7c9', '#c9a98b', '#a9b88c'][i % 3]);
  const pack = kind === 'casual' && pick === 3 && backpack(['#e39a3b', '#4c6a8a', '#7a8f6a'][i % 3]);
  if (bag && gen) carryBag(r, bag);
  if (pack && gen) hold(r, pack, boneAt(r, 'Spine').add(new THREE.Vector3(0, -0.03, 0.02)), 'Spine02');
  r.socialProfile = kind === 'office' ? (i % 2 ? 'officeWoman' : 'office') : kind === 'elder' ? 'elder' : 'casual';
  r.kind = kind;
  r.carries = !!(gen && (bag || pack));
  r.ph = i * 1.37;
  return r;
}
// A body in the crowd is drawn only when its sphere is in view (meshyFrom draws them always, as the story's people may
// be posed anywhere); its sphere from the standing model, with room for the arms and the walk.
function fitSphere(o) {
  o.geometry.computeBoundingSphere();
  o.boundingSphere = o.geometry.boundingSphere.clone();
  o.boundingSphere.radius *= 1.3;
  o.frustumCulled = true;
}
