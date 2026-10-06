// The dorm building's camera and light (places/dorms.js): one framing a floor, picked by where Eric is. On a corridor
// floor the corridor's view, following him along it; on the roof the whole depth of the roof; in his flat the whole
// flat in one still frame (cam.fit() with the building's bounds at the floor's x). And the morning or dusk light.
import * as THREE from 'three';
import { WEST_END, LEVEL_DX } from '../scenes/dorms/layout.js';

export const NIGHT_GRADE = {
  exposure: 1.0,
  temp: -0.02,
  sat: 0.74,
  contrast: 1.05,
  lift: [0.01, 0.012, 0.022],
  shadowTint: [-0.01, 0, 0.025],
  highTint: [0.02, 0.008, -0.012],
  vignette: 0.26,
  bloom: 0.32,
  bloomThreshold: 0.8,
  focusBand: 0.3,
};
const DAY_GRADE = { ...NIGHT_GRADE, exposure: 1.06, temp: 0.01, sat: 0.8, vignette: 0.22 };
// the morning and the evening in the building (places/dorms.js onPeriod): setGrade takes the colour grade
export function dormDaylight(w, setGrade) {
  // the morning (day 2 starts here): daylight from the sky in place of dusk, the same lamps on. Each light's dusk
  // values are kept, for after work.
  const dusk = [];
  w.scene.traverse((o) => {
    if (o.isHemisphereLight || o.isDirectionalLight)
      dusk.push({ o, color: o.color.clone(), ground: o.groundColor?.clone(), k: o.intensity });
  });
  const dayBg = new THREE.Color('#39414e'),
    duskBg = w.scene.background.clone();
  function daylight(day) {
    for (const { o, color, ground, k } of dusk) {
      if (!day) {
        o.color.copy(color);
        if (ground) o.groundColor.copy(ground);
        o.intensity = k;
      } else if (o.isHemisphereLight) {
        o.color.set('#d6e0ee');
        o.groundColor.set('#6f6a62');
        o.intensity = 1.55;
      } else if (o.castShadow) {
        o.color.set('#fff0dc');
        o.intensity = 0.95;
      }
    }
    w.scene.background.copy(day ? dayBg : duskBg);
    setGrade(day ? DAY_GRADE : NIGHT_GRADE);
  }
  return daylight;
}

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
