import * as THREE from 'three';

// The camera of an outdoor district that turns with the place (the east lane, the east coast): where Eric is says
// which way it looks and how steeply (poseAt), and it eases there as he walks, snapping on a jump (a trip, a
// restored save). A held direction key keeps the frame it was pressed in (movement/walker.js), so a turn doesn't
// bend the walk.
//
//   const turn = turningCam(cam, (x, z) => ({ yaw, elev }));
//   turn.steer(position, dt) each frame; turn.reset() after a jump
//   followFit(cam, nav, aspect, { yaw, elev })   the plaza's follow framing, fitted at that look and kept through
//                                                 the turns
//   frameFit(cam, aspect, rect, { yaw, elev })    a fixed frame round a rect on the ground (the tennis court)
//   quietly(cam, () => fit...)                    change the framing and let the camera ease to it
export function turningCam(cam, poseAt) {
  let at = null,
    yaw = cam.yaw,
    elev = cam.elev;
  return {
    steer(p, dt) {
      const jump = !at || Math.hypot(p.x - at[0], p.z - at[1]) > 0.8;
      at = [p.x, p.z];
      const want = poseAt(p.x, p.z),
        k = jump ? 1 : 1 - Math.exp(-dt / 0.45);
      yaw += (want.yaw - yaw) * k;
      elev += (want.elev - elev) * k;
      cam.yaw = yaw;
      cam.elev = elev;
    },
    reset() {
      at = null;
    },
  };
}

// as the plaza: the phone's camera distance on both, following him, a little ahead
export function followFit(cam, nav, aspect, look) {
  const [yaw, elev] = [cam.yaw, cam.elev];
  [cam.yaw, cam.elev] = [look.yaw, look.elev];
  const c = Math.cos(look.yaw),
    s = Math.sin(look.yaw);
  const turned = (pts) => pts.map(([x, y, z]) => new THREE.Vector3(x * c + z * s, y, -x * s + z * c));
  const { x0, x1, z0, z1 } = nav,
    clamp = [x0 - 1, x1 + 1, z0 - 1, z1 + 1];
  if (aspect >= 1)
    cam.fit(
      aspect,
      turned([
        [-9.6, 0, 0],
        [9.6, 0, 0],
        [0, 0, -4],
        [0, 0, 4],
      ]),
      new THREE.Vector3(0, 0, 0),
      { follow: true, clamp, lead: -1.4, limY: 0.96 },
    );
  else
    cam.fit(
      aspect,
      turned([
        [-2.9, 0, 0],
        [2.9, 0, 0],
        [0, 0, -2.6],
        [0, 1.2, 2.4],
      ]),
      new THREE.Vector3(0, 0, 0),
      { follow: true, clamp, lead: -3.4 },
    );
  [cam.yaw, cam.elev] = [yaw, elev];
  cam.place();
}

// a fixed frame: the rect [x0, x1, z0, z1] (on the ground) all in view at that look, the camera held on its middle
// (the sports ground's tennis court, both sides of the net)
export function frameFit(cam, aspect, [x0, x1, z0, z1], look) {
  const [yaw, elev] = [cam.yaw, cam.elev];
  [cam.yaw, cam.elev] = [look.yaw, look.elev];
  cam.fit(
    aspect,
    [
      new THREE.Vector3(x0, 0, z0),
      new THREE.Vector3(x1, 0, z0),
      new THREE.Vector3(x0, 0, z1),
      new THREE.Vector3(x1, 0, z1),
      new THREE.Vector3(x0, 1.2, z0),
      new THREE.Vector3(x1, 1.2, z0),
    ],
    new THREE.Vector3((x0 + x1) / 2, 0, (z0 + z1) / 2),
    { limX: 0.94, limY: 0.9 },
  );
  [cam.yaw, cam.elev] = [yaw, elev];
  cam.place();
}

// a new framing without a jump: fit() sets where the camera wants to be, and the shot it had is put back, so the
// follow spring eases it there (the camera's update damps toward its base and distance)
export function quietly(cam, fit) {
  const t = cam.target.clone(),
    d = cam.dist;
  fit();
  cam.target.copy(t);
  cam.dist = d;
  cam.place();
}
