// Regression for poses changed inside onBeforeRender, after scene matrix preparation.
import fs from "node:fs";
import assert from "node:assert/strict";
import * as THREE from "../../vendor/three/three.module.js";
const source = fs.readFileSync(
  new URL("../../js/crowd/bag-pose.js", import.meta.url),
  "utf8",
);
const moduleText = source.replace(
  "from 'three'",
  `from '${new URL("../../vendor/three/three.module.js", import.meta.url).href}'`,
);
const { bagPose } = await import(
  "data:text/javascript;base64," + Buffer.from(moduleText).toString("base64")
);
const root = new THREE.Group(),
  model = new THREE.Group(),
  arm = new THREE.Bone(),
  forearm = new THREE.Bone(),
  hand = new THREE.Bone(),
  mount = new THREE.Group();
arm.name = "LeftArm";
forearm.name = "LeftForeArm";
hand.name = "LeftHand";
arm.position.set(0.05, 0.9, 0);
mount.position.set(-0.025, -0.06, 0.01);
forearm.position.y = -0.2;
hand.position.y = -0.2;
root.rotation.y = 0.3;
root.add(model);
model.add(arm);
arm.add(forearm);
forearm.add(hand);
hand.add(mount);
const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1),
  count = geometry.attributes.position.count;
geometry.setAttribute(
  "skinIndex",
  new THREE.Uint16BufferAttribute(
    Array.from({ length: count * 4 }, (_, i) => (i % 4 === 0 ? 2 : 0)),
    4,
  ),
);
geometry.setAttribute(
  "skinWeight",
  new THREE.Float32BufferAttribute(
    Array.from({ length: count * 4 }, (_, i) => (i % 4 === 0 ? 1 : 0)),
    4,
  ),
);
const skin = new THREE.SkinnedMesh(geometry),
  skeleton = new THREE.Skeleton([arm, forearm, hand]);
model.add(skin);
root.updateMatrixWorld(true);
skin.bind(skeleton);
let phase = 0;
const rig = {
  root,
  model,
  meshy: true,
  seated: false,
  sitAt() {},
  update() {
    arm.rotation.set(Math.sin(phase) * 0.4, 0, 0.45);
    forearm.rotation.z = Math.cos(phase) * 0.2;
    hand.rotation.x = Math.sin(phase) * 0.3;
    phase += 0.2;
  },
};
bagPose(rig, mount, {
  palm: new THREE.Vector3(0.2, 0.5, 0),
  bounds: new THREE.Box3(
    new THREE.Vector3(-0.1, -0.3, -0.03),
    new THREE.Vector3(0.1, 0, 0.03),
  ),
  grip: new THREE.Vector3(),
  fit: 1,
  propScale: 1,
});
let maxWorldTilt = 0,
  maxPaletteError = 0,
  maxWristTilt = 0,
  minGripX = Infinity;
for (let frame = 0; frame < 30; frame++) {
  rig._ph = frame >= 10 && frame < 20;
  root.rotation.y = 0.3 + frame * 0.02;
  root.updateMatrixWorld(true); // Scene preparation happens BEFORE the late callback.
  rig.update(1 / 30);
  // Read raw published matrices immediately. No getWorld* or update call may repair them.
  const tilt = new THREE.Quaternion()
    .setFromRotationMatrix(mount.matrixWorld)
    .angleTo(root.quaternion);
  const wristTilt = new THREE.Quaternion()
    .setFromRotationMatrix(hand.matrixWorld)
    .angleTo(root.quaternion);
  maxWristTilt = Math.max(maxWristTilt, wristTilt);
  assert(
    wristTilt < 0.000001,
    `Frame ${frame}: carrying wrist tilted away from relaxed pose (${wristTilt})`,
  );
  const gripX = new THREE.Vector3()
    .setFromMatrixPosition(mount.matrixWorld)
    .applyMatrix4(root.matrixWorld.clone().invert()).x;
  minGripX = Math.min(minGripX, gripX);
  // No leg in this fixture: 0.1 bag half-width plus the production 0.025 margin.
  assert(
    Math.abs(gripX - 0.125) < 1e-8,
    `Frame ${frame}: loaded arm missed its lateral grip target (${gripX})`,
  );
  const expected = new THREE.Matrix4().multiplyMatrices(
    hand.matrixWorld,
    skeleton.boneInverses[2],
  );
  const actual = new THREE.Matrix4().fromArray(skeleton.boneMatrices, 32);
  const paletteError = Math.max(
    ...actual.elements.map((value, i) =>
      Math.abs(value - expected.elements[i]),
    ),
  );
  maxWorldTilt = Math.max(maxWorldTilt, tilt);
  maxPaletteError = Math.max(maxPaletteError, paletteError);
  assert(
    tilt < 0.000001,
    `Frame ${frame}: mount world matrix was not published before draw (${tilt})`,
  );
  assert(
    paletteError < 0.000001,
    `Frame ${frame}: skin palette does not match posed bones (${paletteError})`,
  );
}
console.log(
  "PASS late carry pose publishes mount matrix and native skin palette",
  JSON.stringify({ maxWorldTilt, maxPaletteError, maxWristTilt, minGripX }),
);
