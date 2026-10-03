import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// A rounded box's vertices take long to work out (about 0.2 ms each on a phone, and a place has hundreds of the
// same slats, legs and frames), so each size is made once and copied into a plain BufferGeometry: each mesh still
// gets its own arrays (the look bakes light into them), and cloning a plain geometry doesn't rebuild a default box.
const rboxGeo = new Map();
export function roundedBox(w, h, d, seg, r) {
  const key = `${w}|${h}|${d}|${seg}|${r}`;
  let src = rboxGeo.get(key);
  if (!src) {
    if (rboxGeo.size > 500) rboxGeo.clear();
    rboxGeo.set(key, (src = new RoundedBoxGeometry(w, h, d, seg, r)));
  }
  const g = new THREE.BufferGeometry();
  for (const [name, a] of Object.entries(src.attributes)) g.setAttribute(name, a.clone());
  for (const gr of src.groups) g.addGroup(gr.start, gr.count, gr.materialIndex);
  return g;
}
