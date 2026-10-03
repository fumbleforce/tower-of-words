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
