// The lift's cutaway (places/lift.js): while Eric is in the car, the wall in front of it drops to a low cut, the
// way the office's near walls are cut, so the car reads as a lit room. Clip planes cut every mesh of the place that
// stands in a box round the car's doorway (world space; clipIntersection: only the box is cut); signs that only
// reach into the box step out while the wall is down, and a cap in the walls' top colour closes the cut. The lid
// over the car (the site's cap) covers it from the place's camera until the ride starts.
import * as THREE from 'three';
import { isolateLiftMaterials } from './lift-materials.js';

export const CUT = 0.5; // the front wall's height while he's inside
// the wall's full height over the doors, which the cut drops from and rises back to: a tall lobby's wall (the
// head office atrium) runs on above the landing's own wall height
export const wallTop = (site) => site.topH ?? site.wallH;

export const planes = [
  new THREE.Plane(new THREE.Vector3(0, -1, 0), 999),
  new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0),
  new THREE.Plane(new THREE.Vector3(1, 0, 0), 0),
  new THREE.Plane(new THREE.Vector3(0, 0, -1), 0),
  new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
];
// car: { half: the car's half width with its walls, back: its front wall's back face (z from the site's zBack) }
export function clipBox(site, cut, car) {
  const x0 = Math.min(site.x - car.half, site.hole[0] - 0.1) - 0.02,
    x1 = Math.max(site.x + car.half, site.hole[1] + 0.1) + 0.02;
  planes[0].constant = cut;
  planes[1].constant = x0;
  planes[2].constant = -x1;
  planes[3].constant = site.zBack + car.back - 0.02;
  planes[4].constant = -(site.zFront + 0.02);
}

// once per place: clip what stands in the box (but the car, the people and what is marked liftKeep), list the signs
// that reach in (hide), and build the cut's cap, one piece each side of the doorway (never across it: people walk
// through there). doorW: the car's door opening.
export function cutaway(place, carGroup, site, car, doorW) {
  clipBox(site, CUT, car);
  const bx = new THREE.Box3(),
    x0 = planes[1].constant,
    x1 = -planes[2].constant,
    z0 = planes[3].constant,
    z1 = -planes[4].constant;
  const hide = [];
  const clipMesh = isolateLiftMaterials(place, planes);
  const people = new Set();
  for (const r of Object.values(place.people || {})) r && r.root && r.root.traverse((o) => people.add(o));
  place.space.updateMatrixWorld(true);
  place.space.traverse((o) => {
    if (!o.isMesh || people.has(o) || o.userData.liftKeep) return;
    let q = o;
    while (q) {
      if (q === carGroup) return;
      q = q.parent;
    }
    bx.setFromObject(o);
    if (bx.max.y < CUT + 0.03 || bx.max.x < x0 || bx.min.x > x1 || bx.max.z < z0 || bx.min.z > z1) return;
    const inside = (Math.min(bx.max.x, x1) - Math.max(bx.min.x, x0)) / Math.max(1e-3, bx.max.x - bx.min.x);
    // the signs over the doors reach in a little: they stay whole, and step out while the wall is down
    if (inside < 0.5) {
      if (inside > 0.02) hide.push(o);
      return;
    }
    clipMesh(o);
  });
  clipBox(site, 999, car);
  const cutCap = new THREE.Group(),
    capM = new THREE.MeshStandardMaterial({ color: '#a3a9b3', roughness: 0.8 });
  for (const [a, b] of [
    [x0 + 0.02, site.x - doorW / 2],
    [site.x + doorW / 2, x1 - 0.02],
  ]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(b - a, 0.014, z1 - z0), capM);
    m.position.set((a + b) / 2, CUT - 0.007, (z0 + z1) / 2);
    m.receiveShadow = true;
    cutCap.add(m);
  }
  cutCap.visible = false;
  place.space.add(cutCap);
  return { hide, cutCap };
}

// L: the lift in a place (lift.js attachLift); h: the cut's height (999: no cut)
export function setCut(L, h) {
  const prev = L.cut;
  L.cut = h;
  clipBox(L.site, h, L.dims);
  L.cutCap.visible = h < CUT + 0.01;
  // the landing's own doors: while the wall is cut away only the car's doors show (one pair of doors, not two
  // stacked plates; at other floors the car has left this landing anyway). They're open whenever the cut starts.
  const land = L.place.liftLanding;
  if (land) for (const o of land.leaves) o.visible = h >= L.site.wallH;
  for (const o of L.car.hallInd?.userData.meshes || []) o.visible = h >= L.site.wallH;
  // signs half over the car go as the wall starts down and come back as it starts up
  const down = h < prev ? h < L.site.wallH : h <= CUT + 0.01;
  for (const o of L.hide) {
    if (down && o.visible) {
      o.visible = false;
      o.userData.liftHid = true;
    } else if (!down && o.userData.liftHid) {
      o.visible = true;
      o.userData.liftHid = false;
    }
  }
}
export function setCap(L, k) {
  const cap = L.car.cap;
  if (!cap) return;
  cap.material.color.set(L.site.capColor ?? backdrop(L.place.scene) ?? '#000');
  cap.material.opacity = k;
  cap.visible = k > 0.01;
  L.cap = k;
}

// one colour that stands for a place's background: the colour itself, or behind a sky picture (look/sky.js) the
// haze's colour, which the sky meets at the horizon; null with neither
export function backdrop(scene) {
  const bg = scene.background;
  if (bg?.isColor) return bg;
  return bg && scene.fog ? scene.fog.color : null;
}
