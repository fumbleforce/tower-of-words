// The dorm building's camera (places/dorms.js): one framing a floor, picked by where Eric is. On a corridor
// floor the corridor's view, following him along it; on the roof the whole depth of the roof; in his flat the whole
// flat in one still frame (cam.fit() with the building's bounds at the floor's x). Its light by period is the
// light rig's (scenes/dorms.js, kit/light/looks.js DORM).
import * as THREE from 'three';
import { WEST_END, LEVEL_DX } from '../scenes/dorms/layout.js';

// st: the place's state (inside, level)
export function dormView(cam, w, st) {
  const b = w.bounds;
  // the corridor's view: over the court, down onto the corridor, the flats behind it and the stairs; on a desktop
  // most of the corridor in one frame, following him from the end wall to the landing; on a phone following him
  function corridorFit(aspect) {
    const [c0, c1] = b.corr,
      dx = LEVEL_DX[st.level];
    if (aspect >= 1)
      cam.fit(
        aspect,
        [
          new THREE.Vector3(dx - 1.4, 0, c1),
          new THREE.Vector3(dx + b.east + 0.2, 0, c1),
          new THREE.Vector3(dx + 3.3, b.h, b.back - 0.1),
          new THREE.Vector3(dx + 3.3, -0.5, b.stairs.half[0]),
        ],
        new THREE.Vector3(dx + 3.3, 0, (c0 + c1) / 2 - 0.4),
        { follow: true, clamp: [dx + WEST_END + 4.6, dx + 3.6, 1.2, 1.6], limY: 0.92 },
      );
    else
      cam.fit(
        aspect,
        [
          new THREE.Vector3(dx - 1.5, 0, c1),
          new THREE.Vector3(dx + 1.5, 0, c1),
          new THREE.Vector3(dx, b.h, b.back + 0.6),
          new THREE.Vector3(dx, 0, b.stairs.half[1]),
        ],
        new THREE.Vector3(dx, 0, (c0 + c1) / 2 - 0.3),
        { follow: true, clamp: [dx + WEST_END + 1.3, dx + b.east - 1.2, -0.6, 1.4], lead: -0.6 },
      );
  }
  // the roof's: the whole depth of the roof, from the front parapet to the next block's wall over the back one
  function roofFit(aspect) {
    const R = w.levels.bounds.roof,
      dx = LEVEL_DX.roof,
      zm = (R.z0 + R.z1) / 2;
    if (aspect >= 1)
      cam.fit(
        aspect,
        [
          new THREE.Vector3(dx - 4.6, 0, R.z1),
          new THREE.Vector3(dx + 4.6, 0, R.z1),
          new THREE.Vector3(dx, 1.6, R.z0 - 1.0),
          new THREE.Vector3(dx, -0.4, R.z1 + 0.3),
        ],
        new THREE.Vector3(dx, 0, zm),
        { follow: true, clamp: [dx + R.x0 + 4.3, dx + R.x1 + 0.9, zm - 1.3, zm - 1.0], limY: 0.92 },
      );
    else
      cam.fit(
        aspect,
        [
          new THREE.Vector3(dx - 1.5, 0, R.z1),
          new THREE.Vector3(dx + 1.5, 0, R.z1),
          new THREE.Vector3(dx, 0.6, R.z0 - 0.4),
          new THREE.Vector3(dx, -0.3, R.z1 + 0.3),
        ],
        new THREE.Vector3(dx, 0, zm),
        { follow: true, clamp: [dx + R.x0 + 1.4, dx + R.x1 + 0.8, zm - 1.0, zm - 0.6] },
      );
  }
  // the room's view: the whole flat in one still frame, window wall to front door
  function roomFit(aspect) {
    cam.fit(
      aspect,
      [
        new THREE.Vector3(b.x0, 0, b.near),
        new THREE.Vector3(b.x1, 0, b.near),
        new THREE.Vector3(b.x0, b.h, b.back),
        new THREE.Vector3(b.x1, b.h, b.back),
      ],
      new THREE.Vector3(0, 0.3, (b.back + b.near) / 2 - 0.25), // a little room above for the wall outside
      { limX: aspect >= 1 ? 0.9 : 0.96, limY: 0.9 },
    );
  }
  return (aspect) => {
    if (st.inside) roomFit(aspect);
    else if (st.level === 'roof') roofFit(aspect);
    else corridorFit(aspect);
  };
}
