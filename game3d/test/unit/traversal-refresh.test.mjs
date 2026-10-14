import assert from "node:assert/strict";
import { test } from "node:test";
import { registerHooks } from "node:module";
registerHooks({
  resolve(s, c, next) {
    return next(
      s === "three"
        ? new URL("../../vendor/three/three.module.js", import.meta.url).href
        : s,
      c,
    );
  },
});
const T = await import("three");
const { createTraversal } = await import("../../js/movement/traversal.js");
const material = new T.MeshStandardMaterial();
const block = (parent, x = 0, y = 0, z = 0) => {
  const mesh = new T.Mesh(new T.BoxGeometry(1, 0.2, 1), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
const near = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);

test("stationary refresh updates a shared deep hierarchy in linear work", () => {
  const space = new T.Group();
  let parent = space;
  for (let i = 0; i < 6; i++) {
    const child = new T.Group();
    parent.add(child);
    parent = child;
  }
  for (let i = 0; i < 120; i++) block(parent, i * 2, -0.1, 0);
  const traversal = createTraversal({ space });
  traversal.refresh();
  const original = T.Object3D.prototype.updateWorldMatrix;
  let calls = 0,
    nodes = 0;
  space.traverse(() => nodes++);
  T.Object3D.prototype.updateWorldMatrix = function (...args) {
    calls++;
    return original.apply(this, args);
  };
  try {
    traversal.refresh();
  } finally {
    T.Object3D.prototype.updateWorldMatrix = original;
  }
  assert.ok(calls < nodes * 2, `${calls} matrix updates for ${nodes} nodes`);
  near(traversal.support(0, 0, 1), 0);
});

test("parent movement, geometry replacement and removal change support on the very next refresh", () => {
  const space = new T.Group(),
    parent = new T.Group();
  space.add(parent);
  const support = block(parent);
  const traversal = createTraversal({ space });
  traversal.refresh();
  near(traversal.support(0, 0, 2), 0.1);
  parent.position.y = 0.4;
  traversal.refresh();
  near(traversal.support(0, 0, 2), 0.5);
  support.geometry = new T.BoxGeometry(1, 0.6, 1);
  traversal.refresh();
  near(traversal.support(0, 0, 2), 0.7);
  support.visible = false;
  traversal.refresh();
  assert.equal(traversal.support(0, 0, 2), null);
  support.visible = true;
  parent.remove(support);
  traversal.refresh();
  assert.equal(traversal.support(0, 0, 2), null);
  parent.add(support);
  parent.position.y = -0.4;
  traversal.refresh();
  near(traversal.support(0, 0, 2), -0.1);
});

test("instanced supports and external sibling roots update immediately as the place frame moves", () => {
  const scene = new T.Scene(),
    space = new T.Group(),
    sibling = new T.Group();
  scene.add(space, sibling);
  const instances = new T.InstancedMesh(
    new T.BoxGeometry(1, 0.2, 1),
    material,
    1,
  );
  sibling.add(instances);
  instances.setMatrixAt(0, new T.Matrix4().makeTranslation(3, 0, 0));
  instances.instanceMatrix.needsUpdate = true;
  const traversal = createTraversal({ space, traversalRoots: [sibling] });
  traversal.refresh();
  near(traversal.support(3, 0, 2), 0.1);
  instances.setMatrixAt(0, new T.Matrix4().makeTranslation(4, 0.5, 0));
  instances.instanceMatrix.needsUpdate = true;
  traversal.refresh();
  assert.equal(traversal.support(3, 0, 2), null);
  near(traversal.support(4, 0, 2), 0.6);
  space.position.x = 1;
  sibling.position.y = 0.3;
  traversal.refresh();
  near(traversal.support(3, 0, 2), 0.9);
});

test("excluded actor and decoration subtrees receive no matrix updates during construction or refresh", () => {
  const space = new T.Group(),
    actor = new T.Group(),
    decoration = new T.Group();
  space.add(actor, decoration);
  decoration.userData.noTraversal = true;
  for (const parent of [actor, decoration])
    for (let i = 0; i < 512; i++) block(parent, 0, 2, 0);
  block(space, 0, -0.1, 0);
  const excluded = new Set();
  actor.traverse((o) => excluded.add(o));
  decoration.traverse((o) => excluded.add(o));
  const original = T.Object3D.prototype.updateWorldMatrix;
  let calls = 0;
  T.Object3D.prototype.updateWorldMatrix = function (...args) {
    if (excluded.has(this)) calls++;
    return original.apply(this, args);
  };
  let traversal;
  try {
    traversal = createTraversal({ space }, [actor]);
    traversal.refresh();
    actor.position.y = 3;
    decoration.position.y = 4;
    traversal.refresh();
  } finally {
    T.Object3D.prototype.updateWorldMatrix = original;
  }
  assert.equal(calls, 0);
  near(traversal.support(0, 0, 10), 0);
});

test("reparented supports change immediately and excluded former sources do no actor matrix work", () => {
  const space = new T.Group(),
    parent = new T.Group(),
    actor = new T.Group();
  space.add(parent, actor);
  const support = block(parent, 0, 0, 0),
    traversal = createTraversal({ space }, [actor]);
  traversal.refresh();
  near(traversal.support(0, 0, 2), 0.1);
  actor.add(support);
  actor.position.y = 0.5;
  const original = T.Object3D.prototype.updateWorldMatrix;
  let calls = 0;
  T.Object3D.prototype.updateWorldMatrix = function (...args) {
    if (this === actor || this === support) calls++;
    return original.apply(this, args);
  };
  try {
    traversal.refresh();
  } finally {
    T.Object3D.prototype.updateWorldMatrix = original;
  }
  assert.equal(calls, 0);
  assert.equal(traversal.support(0, 0, 2), null);
  parent.add(support);
  parent.position.y = 0.4;
  traversal.refresh();
  near(traversal.support(0, 0, 2), 0.5);
});

test("manual local and world matrices retain Three world-update semantics through parent changes", () => {
  const space = new T.Group(),
    parent = new T.Group();
  space.add(parent);
  const support = block(parent);
  support.updateMatrix();
  support.matrixAutoUpdate = false;
  const traversal = createTraversal({ space });
  traversal.refresh();
  near(traversal.support(0, 0, 2), 0.1);
  parent.position.y = 0.5;
  traversal.refresh();
  near(traversal.support(0, 0, 2), 0.6);
  support.matrixWorldAutoUpdate = false;
  support.matrixWorld.makeTranslation(0, 1, 0);
  traversal.refresh();
  near(traversal.support(0, 0, 2), 1.1);
});

test("nested void declarations use their current parent transform during index construction", () => {
  const space = new T.Group(),
    holes = new T.Group();
  space.add(holes);
  holes.position.x = 2;
  holes.userData.traversalVoids = [
    { min: [-0.4, -2, -0.4], max: [0.4, 0.3, 0.4] },
  ];
  const floor = new T.Mesh(new T.BoxGeometry(8, 0.2, 8), material);
  floor.position.y = -0.1;
  space.add(floor);
  const traversal = createTraversal({ space });
  assert.equal(traversal.support(2, 0, 0.2), null);
  near(traversal.support(0, 0, 0.2), 0);
});
