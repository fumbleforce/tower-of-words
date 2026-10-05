// The title's camera (menu.js): the posed shot of the train from outside the car at dawn, and the flight from it
// into the car on Start. Continue lets go of it with no flight (releaseTitleCamera(0)).
import * as THREE from 'three';
import { settings } from '../settings.js';

const game = () => window.__game;
const TITLE_POSE = {
  land: { t: [-2.6, -0.9, 0.6], el: 24, yaw: 30, d: 16, fov: 30 },
  port: { t: [-0.3, -2.0, 0.6], el: 32, yaw: -62, d: 17, fov: 40 },
};
let titleCam = null;
export function poseTitleCamera() {
  const g = game();
  if (!g || !g.place || g.place.name !== 'train' || titleCam) return;
  const cam = g.place.cam,
    camera = g.place.camera;
  const orig = { update: cam.update, fov: camera.fov };
  let t0 = performance.now();
  const place = () => {
    const P = TITLE_POSE[camera.aspect >= 1 ? 'land' : 'port'];
    if (camera.fov !== P.fov) orig.fov = camera.fov; // a resize re-fit the game camera: remember its fov
    const drift = settings.reduceMotion ? 0 : Math.sin((performance.now() - t0) / 9000) * 3.5; // a slow sway of a few degrees
    const el = THREE.MathUtils.degToRad(P.el),
      yw = THREE.MathUtils.degToRad(P.yaw + drift);
    camera.fov = P.fov;
    camera.updateProjectionMatrix();
    camera.position.set(
      P.t[0] + Math.sin(yw) * Math.cos(el) * P.d,
      P.t[1] + Math.sin(el) * P.d,
      P.t[2] + Math.cos(yw) * Math.cos(el) * P.d,
    );
    camera.up.set(0, 1, 0);
    camera.lookAt(P.t[0], P.t[1], P.t[2]);
    camera.updateMatrixWorld();
  };
  cam.update = function () {
    place();
  };
  if (cam.snap) {
    cam._titleSnap = cam.snap;
    cam.snap = function () {
      place();
    };
  }
  place();
  titleCam = { cam, camera, orig, place };
}
// fly from the title shot to the play view; resolves when the camera is back under the game's control
export function releaseTitleCamera(ms = 1600) {
  const tc = titleCam;
  if (!tc) return Promise.resolve();
  titleCam = null;
  const { cam, camera, orig } = tc;
  if (cam._titleSnap) {
    cam.snap = cam._titleSnap;
    delete cam._titleSnap;
  }
  const p0 = camera.position.clone(),
    q0 = camera.quaternion.clone(),
    f0 = camera.fov;
  const done = () => {
    cam.update = orig.update;
    camera.fov = orig.fov;
    camera.updateProjectionMatrix();
  };
  if (settings.reduceMotion || ms <= 0) {
    done();
    cam.snap?.(game().player.root.position);
    return Promise.resolve();
  }
  const start = performance.now();
  return new Promise((res) => {
    // Continue into another place stops this camera's updates before the flight ends: finish on time anyway, or
    // the UI stays hidden under title-leaving (the day's summary never showed after a Continue in the dorms)
    const late = setTimeout(() => {
      done();
      res();
    }, ms + 400);
    cam.update = function (dt, p) {
      camera.fov = orig.fov;
      orig.update.call(this, dt, p); // where the game camera wants to be now
      const k = Math.min(1, (performance.now() - start) / ms),
        e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const pg = camera.position.clone(),
        qg = camera.quaternion.clone();
      camera.position.lerpVectors(p0, pg, e);
      camera.quaternion.slerpQuaternions(q0, qg, e);
      camera.fov = f0 + (orig.fov - f0) * e;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      if (k >= 1) {
        clearTimeout(late);
        done();
        res();
      }
    };
  });
}

// QA: hold the camera at a point k (0..1) of the flight from the title shot into the car, for stills
export function flightAt(k) {
  if (!titleCam) poseTitleCamera();
  const tc = titleCam;
  if (!tc) return;
  const { cam, camera, orig } = tc;
  tc.place();
  const p0 = camera.position.clone(),
    q0 = camera.quaternion.clone(),
    f0 = camera.fov;
  camera.fov = orig.fov;
  (cam._titleSnap || orig.update).call(cam, game().player.root.position);
  const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  const pg = camera.position.clone(),
    qg = camera.quaternion.clone();
  camera.position.lerpVectors(p0, pg, e);
  camera.quaternion.slerpQuaternions(q0, qg, e);
  camera.fov = f0 + (orig.fov - f0) * e;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  cam.update = () => {};
}
