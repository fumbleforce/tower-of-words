import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { after, test } from "node:test";

const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "three")
      return next(
        new URL("../../vendor/three/three.module.js", import.meta.url).href,
        context,
      );
    if (specifier.startsWith("three/addons/"))
      return next(
        new URL("../../vendor/" + specifier.slice(13), import.meta.url).href,
        context,
      );
    return next(specifier, context);
  },
});
after(() => hooks.deregister());
Object.assign(globalThis, {
  location: { search: "" },
  window: {},
  addEventListener() {},
  localStorage: { getItem: () => null },
  document: {},
});
const THREE = await import("../../vendor/three/three.module.js");
const { campusCamera } = await import("../../js/places/campus-camera.js");
const { canteenSave } = await import("../../js/places/canteen-state.js");
const { RoomCam } = await import("../../js/cam.js");
const { followFit } = await import("../../js/places/turning-cam.js");
const { pt, BOUNDS, PRINT_STEP, EXITS } =
  await import("../../js/scenes/campus/plan.js");
const K = 1.18; // Campus actor scale; importing the office scene would preload character assets.

function fixture(aspect) {
  const root = new THREE.Group();
  root.add(
    new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.6).translate(0, 0.6, 0)),
  );
  root.scale.setScalar(K);
  const game = {
    player: { root, setState() {} },
    walker: { sync() {} },
    busy: false,
  };
  globalThis.window.__game = game; // Exercise RoomCam's real keepEric path.
  const cam = new RoomCam({ elev: 55, fov: 28, yaw: 0.22 });
  const turn = campusCamera(cam);
  followFit(
    cam,
    { x0: BOUNDS[0], x1: BOUNDS[1], z0: BOUNDS[2], z1: BOUNDS[3] },
    aspect,
    {
      yaw: 0.22,
      elev: (55 * Math.PI) / 180,
    },
  );
  return { game, cam, turn };
}

function inFrame(cam, position, label) {
  const forward = cam.dir.clone().setY(0).normalize();
  const right = new THREE.Vector3().crossVectors(
    forward,
    new THREE.Vector3(0, 1, 0),
  );
  for (const y of [0, 1.2 * K])
    for (const [a, b] of [
      [0.3, 0],
      [-0.3, 0],
      [0, 0.3],
      [0, -0.3],
    ]) {
      const ndc = position
        .clone()
        .addScaledVector(right, a * K)
        .addScaledVector(forward, b * K);
      ndc.y += y;
      ndc.project(cam.camera);
      assert(
        Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1,
        `${label}: body outside viewport ${ndc.toArray()}`,
      );
    }
}

function firstFrame({ cam, turn, game }, label) {
  const p = game.player.root.position;
  inFrame(cam, p, `${label}, snap`);
  const position = cam.camera.position.clone();
  const rotation = cam.camera.quaternion.clone();
  turn.steer(p, 1 / 60);
  cam.update(1 / 60, p);
  inFrame(cam, p, `${label}, first frame`);
  assert(
    cam.camera.position.distanceTo(position) < 1e-8,
    `${label}: first frame moves a settled camera`,
  );
  assert(
    cam.camera.quaternion.angleTo(rotation) < 1e-7,
    `${label}: first frame changes snap direction`,
  );
}

test("campus Continue applies the local camera pose before the real save restore snaps", () => {
  const points = [
    pt([4.5, -24]),
    pt([-16, -16.6]),
    pt([-19.25, -16.6]),
    pt([-19.25, -10.55]),
    PRINT_STEP,
    EXITS.harbour.in,
  ];
  for (const aspect of [390 / 844, 1366 / 860])
    for (const point of points) {
      const f = fixture(aspect);
      const restore = canteenSave(
        f.game,
        { free: () => true },
        EXITS.forecourt.in,
        f.cam,
        {},
      ).restore;
      const load = ([x, z]) =>
        restore({
          world: {
            player: {
              eric: {
                visible: true,
                position: [x, 0, z],
                rotation: [0, 0, 0, "XYZ"],
              },
            },
          },
        });
      load(point); // Production order: restore snaps before the first place.update.
      firstFrame(f, `${aspect} fresh Continue at ${point}`);
      load(PRINT_STEP); // Reusing the same prepared campus must discard its previous camera pose.
      load(point);
      firstFrame(f, `${aspect} cached Continue at ${point}`);
      load([point[0] + 0.1, point[1]]); // Even a small jump must not reuse turningCam's eased pose.
      firstFrame(f, `${aspect} nearby Continue at ${point}`);
    }
});

test("campus arrival close shots keep their framing through the first update and release", () => {
  for (const aspect of [390 / 844, 1366 / 860])
    for (const point of [
      EXITS.forecourt.arrive,
      EXITS.office_quarter.arrive,
      PRINT_STEP,
      pt([-16, -16.6]),
    ]) {
      const f = fixture(aspect);
      f.game.busy = true;
      const p = f.game.player.root.position;
      p.set(point[0], 0, point[1]);
      // walkIn sets the body, enables its close shot and snaps before glide's first frame.
      f.cam.closeOn(point, 1.5, undefined, { onEric: true });
      f.cam.snap(p);
      assert.equal(f.cam.close.onEric, true);
      assert.equal(f.cam.close.zoom, 1.5);
      firstFrame(f, `${aspect} arrival at ${point}`);
      f.cam.release();
      f.game.busy = false;
      for (let frame = 0; frame < 120; frame++) {
        f.turn.steer(p, 1 / 60);
        f.cam.update(1 / 60, p);
        inFrame(f.cam, p, `${aspect} release at ${point}, frame ${frame}`);
      }
    }
});
