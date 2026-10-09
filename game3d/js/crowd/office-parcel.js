import * as THREE from 'three';
import { rbox, PAL } from '../props.js';
import { CHARACTER_SCALE } from '../character-scale.js';

// A small taped carton, supported from below. The free hand still taps the gate.
export function carryOfficeParcel(rig) {
  const k = CHARACTER_SCALE;
  const size = new THREE.Vector3(0.17, 0.08, 0.1).multiplyScalar(k);
  const parcel = new THREE.Group();
  parcel.name = 'office-parcel';
  parcel.add(rbox(size.x, size.y, size.z, PAL.box, { y: -size.y / 2, r: 0.003 }));
  parcel.add(rbox(0.018 * k, 0.001, size.z + 0.001, '#d8c29e', { y: size.y / 2, r: 0 }));
  if (!rig.approvedCrowd) {
    parcel.position.set(0, -0.22, 0.06);
    rig.arms[1].add(parcel);
    return;
  }
  rig.root.add(parcel);
  const arm = rig.model.getObjectByName('LeftArm');
  const elbow = rig.model.getObjectByName('LeftForeArm');
  const hand = rig.model.getObjectByName('LeftHand');
  const spine = rig.model.getObjectByName('Spine');
  const joints = [arm, elbow, hand];
  const animated = joints.map((bone) => bone.quaternion.clone());
  const carrying = animated.map((q) => q.clone());
  const point = new THREE.Vector3(),
    shoulder = new THREE.Vector3(),
    wrist = new THREE.Vector3();
  const bend = new THREE.Vector3(),
    direction = new THREE.Vector3(),
    pole = new THREE.Vector3();
  const from = new THREE.Vector3(),
    to = new THREE.Vector3();
  const rootRotation = new THREE.Quaternion(),
    parentRotation = new THREE.Quaternion();
  const turn = new THREE.Quaternion(),
    world = new THREE.Quaternion();
  const at = (bone, out) => rig.root.worldToLocal(bone.getWorldPosition(out));
  rig.root.updateMatrixWorld(true);
  const restSpine = at(spine, new THREE.Vector3());
  const upper = at(arm, point).distanceTo(at(elbow, shoulder));
  const lower = at(elbow, point).distanceTo(at(hand, shoulder));
  const handRotation = hand.getWorldQuaternion(new THREE.Quaternion());
  rig.root.getWorldQuaternion(rootRotation);
  handRotation.premultiply(rootRotation.clone().invert()).invert();
  // Native hand's +Y runs toward the fingertips; its palm lies in XY.
  const palmUp = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)),
  );
  const palm = new THREE.Box3();
  at(hand, wrist);
  let front = -Infinity;
  const skeletons = new Set();
  const palmVertices = [];
  rig.model.traverse((mesh) => {
    if (!mesh.isSkinnedMesh) return;
    skeletons.add(mesh.skeleton);
    mesh.skeleton.update();
    const { position, skinIndex, skinWeight } = mesh.geometry.attributes;
    for (let i = 0; i < position.count; i++) {
      let handWeight = 0,
        bodyWeight = 0;
      for (let j = 0; j < 4; j++) {
        const bone = mesh.skeleton.bones[skinIndex.getComponent(i, j)];
        const weight = skinWeight.getComponent(i, j);
        if (bone === hand) handWeight += weight;
        if (/^(Hips|Spine\d*|LeftUpLeg|RightUpLeg)$/.test(bone.name)) bodyWeight += weight;
      }
      if (handWeight < 0.6 && bodyWeight < 0.5) continue;
      mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld);
      rig.root.worldToLocal(point);
      if (bodyWeight >= 0.5 && Math.abs(point.y - (restSpine.y - 0.095 * k)) < size.y) front = Math.max(front, point.z);
      if (handWeight >= 0.6) {
        palmVertices.push([mesh, i]);
        palm.expandByPoint(point.sub(wrist).applyQuaternion(handRotation).applyQuaternion(palmUp));
      }
    }
  });
  const support = palm.getCenter(new THREE.Vector3());
  support.y = palm.max.y;
  const center = new THREE.Vector3(0.105 * k, restSpine.y - 0.095 * k, front + size.z / 2 + 0.009 * k);
  const aim = (bone, child, target) => {
    at(bone, from);
    at(child, direction).sub(from).normalize();
    to.copy(target).sub(from).normalize();
    turn.setFromUnitVectors(direction.applyQuaternion(rootRotation), to.applyQuaternion(rootRotation));
    bone.getWorldQuaternion(world).premultiply(turn);
    bone.parent.getWorldQuaternion(parentRotation);
    bone.quaternion.copy(parentRotation.invert().multiply(world));
    bone.updateWorldMatrix(false, true);
  };
  const poseArm = () => {
    at(arm, shoulder);
    direction.subVectors(wrist, shoulder);
    const reach = Math.min(direction.length(), upper + lower - 1e-6);
    direction.normalize();
    const along = (upper * upper - lower * lower + reach * reach) / (2 * reach);
    const outward = Math.sqrt(Math.max(0, upper * upper - along * along));
    pole.set(0.6, -1, -0.25).addScaledVector(direction, -pole.dot(direction)).normalize();
    bend.copy(shoulder).addScaledVector(direction, along).addScaledVector(pole, outward);
    aim(arm, elbow, bend);
    aim(elbow, hand, wrist);
    hand.parent.getWorldQuaternion(parentRotation);
    hand.quaternion.copy(parentRotation.invert().multiply(rootRotation).multiply(palmUp));
    rig.model.updateMatrixWorld(true);
    for (const skeleton of skeletons) skeleton.update();
  };
  let posed = false;
  const update = rig.update;
  rig.update = (...args) => {
    if (posed) joints.forEach((bone, i) => bone.quaternion.copy(animated[i]));
    update(...args);
    joints.forEach((bone, i) => {
      animated[i].copy(bone.quaternion);
      bone.quaternion.copy(carrying[i]);
    });
    rig.root.updateMatrixWorld(true);
    rig.root.getWorldQuaternion(rootRotation);
    parcel.position.copy(center).add(at(spine, point).sub(restSpine));
    parcel.updateWorldMatrix(false, true);
    wrist.copy(parcel.position).sub(support);
    wrist.y -= size.y / 2 + 0.003 * k;
    poseArm();
    // Skin around the wrist blends forearm and hand. Fit the visible palm, not
    // just its joint: changing the elbow angle changes that support surface.
    for (let pass = 0; pass < 2; pass++) {
      let top = -Infinity;
      for (const [mesh, i] of palmVertices) {
        mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld);
        rig.root.worldToLocal(point);
        if (Math.abs(point.x - parcel.position.x) < size.x / 2 && Math.abs(point.z - parcel.position.z) < size.z / 2)
          top = Math.max(top, point.y);
      }
      wrist.y += parcel.position.y - size.y / 2 - 0.003 * k - top;
      poseArm();
    }
    posed = true;
  };
  // Step before either the prop or its carrier is drawn, regardless of material order.
  parcel.traverse((mesh) => {
    if (!mesh.isMesh) return;
    mesh.onBeforeRender = () => rig.stepNow();
  });
  rig.update(0);
}
