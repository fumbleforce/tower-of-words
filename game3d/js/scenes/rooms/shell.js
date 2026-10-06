// The shell of a club interior (the gym's corner, the dorm common room, the karaoke desk and booth): a floor, the
// back and side walls full height with their openings, the near wall cut down to a low sill so the camera looks in
// over it (the B2 office's way), the light, and the walk grid. Each room's own scene file lays its furniture on top,
// in a dorms/kit.js Kit, so a room costs a few dozen draw calls.
//
//   const R = { x0, x1, z0, z1, h, near, t }        the room inside its walls (x east, z toward the camera); the walls'
//                                                   height, the near wall's, their thickness
//   shell(root, R, { holes, color, top, inner })    walls: holes { n, s, w, e } as props.js wall() takes them, along
//                                                   x for n and s and along z for w and e; inner: the walls' colour
//   plankFloor(kit, R, { color, seam, w, along })   a boarded floor (the gym's maple, a common room's): one slab,
//                                                   seams every w along x or z
//   roomLights(scene, root, { sky, ground, k, key, lamps })   a soft sky, one shadow-casting key from high above
//                                                   the camera's side, warm or cool lamps as point lights with a pool
//                                                   of light under each
//   roomNav(R, cell)                                the walk grid: the floor inside the walls
import * as THREE from 'three';
import { Nav } from '../../movement/navigation.js';
import { wall } from '../../props.js';
import { lightPool } from '../../places/life.js';
import { roomEnclosure } from './enclosure.js';

export function shell(root, R, { holes = {}, color, top, entryDoor = false } = {}) {
  const { x0, x1, z0, z1, h, near, t } = R;
  const o = (k) => ({ holes: holes[k] || [], ...(color ? { color } : {}), ...(top ? { top } : {}) });
  root.add(wall('x', x0 - t, x1 + t, z0 - t / 2, h, t, o('n')));
  root.add(wall('z', z0, z1, x0 - t / 2, h, t, o('w')));
  root.add(wall('z', z0, z1, x1 + t / 2, h, t, o('e')));
  root.add(wall('x', x0 - t, x1 + t, z1 + t / 2, near, t, o('s')));
  const enclosure = roomEnclosure(root, R, { color });
  const doorHeight = Math.min(1.95, h - 0.12);
  enclosure.wall('x', x0 - t, x1 + t, z1 + t / 2, near, t, o('s'), doorHeight);
  if (entryDoor)
    for (const [lo, hi, bottom] of holes.s || []) if (bottom === 0) enclosure.door('x', lo, hi, z1 + t / 2, doorHeight);
}

export function plankFloor(kit, R, { color, seam, w = 0.2, along = 'z', y = 0 } = {}) {
  const { x0, x1, z0, z1 } = R;
  kit.box(color, x1 - x0, 0.1, z1 - z0, (x0 + x1) / 2, y - 0.1, (z0 + z1) / 2, { surf: 'laminate', cast: false });
  if (along === 'z')
    for (let x = x0 + w; x < x1 - 0.01; x += w)
      kit.box(seam, 0.012, 0.003, z1 - z0, x, y, (z0 + z1) / 2, { cast: false });
  else
    for (let z = z0 + w; z < z1 - 0.01; z += w)
      kit.box(seam, x1 - x0, 0.003, 0.012, (x0 + x1) / 2, y, z, { cast: false });
}

export function roomLights(
  scene,
  root,
  {
    sky = '#e9eef4',
    ground = '#6d675f',
    k = 1.0,
    key = { color: '#fff1dc', k: 1.1, at: [-4, 14, 9] },
    lamps = [],
  } = {},
  R,
) {
  scene.add(new THREE.HemisphereLight(sky, ground, k));
  const sun = new THREE.DirectionalLight(key.color, key.k);
  sun.position.set(...key.at);
  sun.castShadow = true;
  const span = Math.max(R.x1 - R.x0, R.z1 - R.z0) / 2 + 1;
  Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 2, far: 50 });
  sun.target.position.set((R.x0 + R.x1) / 2, 0, (R.z0 + R.z1) / 2);
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  for (const { at, color = '#ffe3bd', k: lk = 1.2, reach = 3.2, pool = 0 } of lamps) {
    const p = new THREE.PointLight(color, lk, reach, 1.6);
    p.position.set(...at);
    root.add(p);
    if (pool) root.add(lightPool(at[0], at[2], pool, { color, k: 0.18 }));
  }
  return sun;
}

export function roomNav({ x0, x1, z0, z1 }, cell = 0.06) {
  return new Nav(x0 + 0.04, x1 - 0.04, z0 + 0.04, z1 - 0.04, cell);
}
