import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// A rounded box's vertices take long to work out (about 0.2 ms each on a phone, and a place has hundreds of the
// same slats, legs and frames), so each size is made once and copied into a plain BufferGeometry: each mesh still
// gets its own arrays (the look bakes light into them), and cloning a plain geometry doesn't rebuild a default box.
const rboxGeo = new Map();
// Under this radius the rounding is less than a pixel from every camera (the desktop's third-person view comes to
// about 1.5 m, where a pixel is over a millimetre), so a small box is a plain one: 12 triangles instead of 108 to 588
// (#374: the CRTs' vent slats, thin trims; callers clamp the radius to the box, so thin parts come out at 0). Not a
// long one (0.6 m or more): the baked light (look/bake.js) lives on its vertices, and a plain box has only its ends.
const SHARP = 0.0015;
export function roundedBox(w, h, d, seg, r) {
  const sharp = !(r >= SHARP) && Math.max(w, h, d) < 0.6;
  const key = sharp ? `${w}|${h}|${d}` : `${w}|${h}|${d}|${seg}|${r}`;
  let src = rboxGeo.get(key);
  if (!src) {
    if (rboxGeo.size > 500) rboxGeo.clear();
    src = sharp ? new THREE.BoxGeometry(w, h, d).toNonIndexed() : new RoundedBoxGeometry(w, h, d, seg, r);
    rboxGeo.set(key, src);
  }
  const g = new THREE.BufferGeometry();
  for (const [name, a] of Object.entries(src.attributes)) g.setAttribute(name, a.clone());
  for (const gr of src.groups) g.addGroup(gr.start, gr.count, gr.materialIndex);
  // its shadow is cast through a plain box of the same size (perf/shadow-proxy.js): the shadow filter's soft edge is
  // wider than the rounding
  if (!sharp) g.userData.shadowBox = [w, h, d];
  return g;
}
