// The light round the lift car during a ride (places/lift.js): the dim while he boards (setDark), and the dark once
// the car has left the place's floor (setAway), when everything outside the car goes out of the frame.
import * as THREE from 'three';

const DARK = 0.4; // how much of a place's own light stays on during the ride (dimmed, not black: QA round 1)
const DARK_BG = new THREE.Color('#14171d'),
  BG_K = 0.45; // the background goes this far toward DARK_BG
const lerp = (a, b, k) => a + (b - a) * k;

// light and background: k 0 = the place as built, 1 = the ride's dim
export function setDark(L, k) {
  const sc = L.place.scene;
  if (!L.base) {
    L.base = [];
    sc.traverse((o) => {
      if (o.isLight && !isOurs(L, o)) L.base.push([o, o.intensity]);
    });
    L.bg = sc.background ? sc.background.clone() : null;
  }
  for (const [o, i] of L.base) o.intensity = i * lerp(1, DARK, k);
  // the additive light pools on the floors (life.js) are painted light: they dim with the rest
  if (!L.pools) {
    L.pools = [];
    sc.traverse((o) => {
      if (o.isMesh && o.material && o.material.blending === THREE.AdditiveBlending && !isOurs(L, o))
        L.pools.push([o.material, o.material.opacity]);
    });
  }
  for (const [m, a] of L.pools) m.opacity = a * lerp(1, DARK, k);
  if (L.bg) sc.background = L.bg.clone().lerp(DARK_BG, lerp(k * BG_K, 1, L.away));
  L.dark = k;
}
// k 0 = the car at this place's floor, 1 = away from it: a shroud in the ride's background colour closes over the
// place from just above its walls, with a hole where the camera looks down into the car (and onto the landing
// while the doors are open at another floor), so only the car in its shaft and the people in it are seen. Nothing
// in the place is hidden or changed (hiding it made the draw-call pass merge it all again on the way home).
// Called every frame while away, since the camera is still easing in.
export function setAway(L, k) {
  L.away = k;
  setDark(L, L.dark);
  if (!L.shroud) {
    if (!k) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(4 * 6 * 3), 3));
    L.shroud = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, fog: false, side: THREE.DoubleSide }),
    );
    L.shroud.frustumCulled = false;
    L.shroud.renderOrder = 5;
    L.shroud.userData.noBatch = true;
    L.place.space.add(L.shroud);
  }
  const m = L.shroud;
  m.visible = k > 0;
  if (!m.visible) return;
  m.material.opacity = k;
  m.material.color.copy(L.place.scene.background || DARK_BG);
  // the hole: the car's box (and the landing's floor) seen from the camera, where the lines of sight cross the shroud
  const { site, box, car } = L,
    h = Math.max(site.wallH, box.top) + 0.06,
    c = L.place.space.worldToLocal(L.cam.camera.getWorldPosition(new THREE.Vector3()));
  let x0 = Infinity,
    x1 = -Infinity,
    z0 = Infinity,
    z1 = -Infinity;
  const front = box.front + (car.land > 0.01 ? box.landing : 0);
  for (const x of [-box.half, box.half])
    for (const y of [0, box.top])
      for (const z of [box.back, front]) {
        const px = site.x + x,
          pz = site.zBack + z,
          t = (h - c.y) / (y - c.y);
        const qx = c.x + t * (px - c.x),
          qz = c.z + t * (pz - c.z);
        ((x0 = Math.min(x0, qx)), (x1 = Math.max(x1, qx)), (z0 = Math.min(z0, qz)), (z1 = Math.max(z1, qz)));
      }
  const R = 60,
    X0 = site.x - R,
    X1 = site.x + R,
    Z0 = site.zBack - R,
    Z1 = site.zBack + R;
  const a = m.geometry.attributes.position;
  let i = 0;
  for (const [u0, u1, v0, v1] of [
    [X0, X1, Z0, z0],
    [X0, X1, z1, Z1],
    [X0, x0, z0, z1],
    [x1, X1, z0, z1],
  ])
    for (const [u, v] of [
      [u0, v0],
      [u1, v0],
      [u1, v1],
      [u0, v0],
      [u1, v1],
      [u0, v1],
    ])
      a.setXYZ(i++, u, h, v);
  a.needsUpdate = true;
}
function isOurs(L, o) {
  let q = o;
  while (q) {
    if (q === L.car.g) return true;
    q = q.parent;
  }
  return false;
}

// a place built in daylight and lit for the evening later (relightLift in lift.js): put everything back as built
// (the dim, and the dark a morning ride left it in), then forget it, so the next ride dims the evening's light
export function forgetLight(L) {
  if (!L.base) return;
  setAway(L, 0);
  setDark(L, 0);
  L.base = null;
}
