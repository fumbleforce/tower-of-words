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
const THREE = await import("../../vendor/three/three.module.js");
const { RoomCam } = await import("../../js/cam.js");
const { officeChatCamera } =
  await import("../../js/places/office-chat-camera.js");
const { deskActivity } =
  await import("../../js/places/office-desk-activity.js");
globalThis.window = {};
function fixture() {
  const cam = new RoomCam({ elev: 51, fov: 24 });
  cam.fitDist = 30;
  cam.camera.aspect = 390 / 844;
  const root = new THREE.Group(),
    model = new THREE.Group(),
    head = new THREE.Bone();
  head.name = "Head";
  root.add(model);
  model.add(head);
  root.position.set(-2, 0.1, -3);
  root.rotation.y = Math.PI + 0.6;
  const mio = { root, model, seated: true, state: "sit" };
  const player = { root: new THREE.Group() };
  player.root.position.set(-2.8, 0, -3);
  const place = { cam },
    game = { place, player, mioNpc: mio, busy: true };
  officeChatCamera(game, place);
  return { cam, game, mio, head };
}
test("only a seated conversation gets the pair shot; release and another authored close retain normal camera", () => {
  const { cam, mio } = fixture(),
    ordinary = cam.dir.clone();
  cam.closeOn([-2, -3], 1.3);
  assert.deepEqual(cam.dir, ordinary);
  cam.closeOn([-2, -3], 1.3, 0.5, { conversation: "mio" });
  assert.equal(cam.close.conversationShot.who, "mio");
  assert.deepEqual(cam.close.target.toArray(), [-2.4, 0.25, -3]);
  assert.notDeepEqual(cam.dir, ordinary);
  assert.equal(cam.yaw, 0);
  assert.equal(cam.elev, THREE.MathUtils.degToRad(51));
  cam.release();
  assert.deepEqual(cam.dir, ordinary);
  cam.closeOn([-2, -3], 1.3, 0.5, { conversation: "mio" });
  cam.closeOn([4, 5], 2);
  assert.deepEqual(cam.dir, ordinary);
  assert.deepEqual(cam.close.target.toArray(), [4, 0.5, 5]);
  mio.seated = false;
  cam.closeOn([-2, -3], 1.3, 0.5, { conversation: "mio" });
  assert.equal(cam.close.conversationShot, undefined);
});
test("a serialized conversation shot restores without changing home angles", () => {
  const a = fixture();
  a.cam.closeOn([-2, -3], 1.3, 0.5, { conversation: "mio" });
  const serialized = JSON.parse(
    JSON.stringify({ ...a.cam.close, target: a.cam.close.target.toArray() }),
  );
  const b = fixture();
  b.cam.close = {
    ...serialized,
    target: new THREE.Vector3().fromArray(serialized.target),
  };
  assert.deepEqual(b.cam.dir, a.cam.dir);
  b.cam.release();
  assert.equal(b.cam.yaw, 0);
  assert.equal(b.cam.elev, THREE.MathUtils.degToRad(51));
});
test("listener overlay is bounded over held mixer pose and fades out after cancellation", () => {
  const { cam, game, mio, head } = fixture(),
    update = deskActivity(game),
    rest = head.quaternion.clone();
  cam.closeOn([-2, -3], 1.3, 0.5, { conversation: "mio" });
  const position = mio.root.position.clone();
  for (let i = 0; i < 150; i++) {
    head.quaternion.copy(rest);
    update(mio, 1 / 30, i / 30, false);
  }
  const held = head.quaternion.clone();
  for (let i = 0; i < 100; i++) {
    head.quaternion.copy(rest);
    update(mio, 1 / 30, 5 + i / 30, false);
  }
  assert.ok(held.angleTo(head.quaternion) < 1e-5);
  assert.ok(rest.angleTo(head.quaternion) > 0.5);
  assert.deepEqual(mio.root.position, position);
  cam.release();
  game.busy = false;
  for (let i = 0; i < 100; i++) {
    head.quaternion.copy(rest);
    update(mio, 1 / 30, 10 + i / 30, false);
  }
  assert.ok(rest.angleTo(head.quaternion) < 1e-8);
});

test("Emi shot and listener never activate Mio listener, and vice versa", () => {
  const { cam, game, mio, head } = fixture();
  const root = new THREE.Group(),
    model = new THREE.Group(),
    emiHead = new THREE.Bone();
  emiHead.name = "Head";
  root.add(model);
  model.add(emiHead);
  root.position.set(-5.8, 0.1, 4.9);
  let stepped = 0;
  const emi = {
    root,
    model,
    seated: true,
    state: "sit",
    stepNow() {
      stepped++;
      emiHead.quaternion.identity();
    },
  };
  game.place.people = { emi, mio };
  const mioWork = deskActivity(game, "mio"),
    emiWork = deskActivity(game, "emi");
  cam.closeOn([-5.8, 4.9], 1.3, 0.5, { conversation: "emi" });
  assert.equal(cam.close.conversationShot.who, "emi");
  for (let i = 0; i < 100; i++) {
    head.quaternion.identity();
    mioWork(mio, 1 / 30, i / 30, false);
    emiWork(emi, 1 / 30, i / 30, false);
  }
  assert.ok(head.quaternion.angleTo(new THREE.Quaternion()) < 1e-8);
  assert.ok(emiHead.quaternion.angleTo(new THREE.Quaternion()) > 0.05);
  assert.equal(stepped, 100);
  cam.closeOn([-2, -3], 1.3, 0.5, { conversation: "mio" });
  for (let i = 0; i < 100; i++) {
    head.quaternion.identity();
    mioWork(mio, 1 / 30, i / 30, false);
    emiWork(emi, 1 / 30, i / 30, false);
  }
  assert.ok(head.quaternion.angleTo(new THREE.Quaternion()) > 0.5);
  assert.ok(emiHead.quaternion.angleTo(new THREE.Quaternion()) < 1e-8);
});

const { conversationCamera } =
  await import("../../js/places/conversation-camera.js");
function streetFixture() {
  const cam = new RoomCam({ elev: 51, fov: 24 }),
    root = new THREE.Group(),
    player = { root: new THREE.Group() };
  root.position.set(1, 0, 0);
  cam.fitDist = 30;
  cam.camera.aspect = 390 / 844;
  const leaveResult = Promise.resolve("left");
  const place = {
    cam,
    people: { aoi: { root } },
    leave() {
      return leaveResult;
    },
  };
  conversationCamera({ player }, place, {
    aoi: { yaw: -0.85, elev: 35, fov: 45, minDistance: 4.5, halfWidth: 1 },
  });
  return { cam, place, player, leaveResult };
}
function projectionMatches(cam) {
  const expected = cam.camera.clone();
  expected.updateProjectionMatrix();
  assert.deepEqual(
    cam.camera.projectionMatrix.elements,
    expected.projectionMatrix.elements,
  );
}
test("saved pair lens uses current projection and restores on release, ordinary shot and leave", () => {
  const { cam, place, player, leaveResult } = streetFixture();
  const open = () => cam.closeOn([1, 0], 1.3, 0.5, { conversation: "aoi" });
  open();
  projectionMatches(cam);
  assert.equal(cam.camera.fov, 45);
  const [, distance] = cam.wanted(player.root.position);
  assert.ok(
    Math.abs(distance - 1 / (Math.tan(Math.PI / 8) * cam.camera.aspect)) < 1e-8,
  );
  assert.equal(cam.fitDist, 30);
  const saved = JSON.parse(
    JSON.stringify({ ...cam.close, target: cam.close.target.toArray() }),
  );
  cam.release();
  assert.equal(cam.camera.fov, 24);
  projectionMatches(cam);
  cam.close = { ...saved, target: new THREE.Vector3().fromArray(saved.target) };
  cam.snap(player.root.position);
  assert.equal(cam.camera.fov, 45);
  projectionMatches(cam);
  cam.closeOn([2, 3], 2);
  assert.equal(cam.camera.fov, 24);
  projectionMatches(cam);
  open();
  assert.equal(place.leave(), leaveResult);
  assert.equal(cam.camera.fov, 24);
  projectionMatches(cam);
});
test("resize retains home fit distance, updates lens projection and leaves ordinary resize untouched", () => {
  const { cam, player } = streetFixture(),
    stock = new RoomCam({ elev: 51, fov: 24 });
  const points = [new THREE.Vector3(-4, 0, -4), new THREE.Vector3(4, 2, 4)],
    centre = new THREE.Vector3();
  cam.closeOn([1, 0], 1.3, 0.5, { conversation: "aoi" });
  for (const aspect of [1366 / 860, 390 / 844]) {
    stock.fit(aspect, points, centre);
    cam.fit(aspect, points, centre);
    assert.equal(cam.fitDist, stock.fitDist);
    assert.equal(cam.camera.fov, 45);
    projectionMatches(cam);
    assert.equal(cam.dist, cam.wanted(player.root.position)[1]);
  }
  cam.close = null;
  cam.fit(1.5, points, centre);
  stock.fit(1.5, points, centre);
  assert.equal(cam.camera.fov, 24);
  assert.equal(cam.fitDist, stock.fitDist);
  projectionMatches(cam);
  cam.closeOn([2, 3], 2);
  stock.closeOn([2, 3], 2);
  cam.fit(1.5, points, centre);
  stock.fit(1.5, points, centre);
  assert.equal(cam.camera.fov, 24);
  assert.equal(cam.dist, stock.dist);
  assert.deepEqual(cam.target, stock.target);
});
