// Screen boxes round people and things, in CSS px: what the goal arrow and the action menu keep clear of.
import * as THREE from 'three';

let v = null; // made on first use: unit tests load ui.js with a stub three.js

// a screen box round world points (null when any is behind the camera)
export function screenBox(cam, pts) {
  v ||= new THREE.Vector3();
  const b = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
  for (const p of pts) {
    v.copy(p).project(cam);
    if (v.z > 1) return null;
    const x = ((v.x + 1) / 2) * innerWidth,
      y = ((1 - v.y) / 2) * innerHeight;
    b.x0 = Math.min(b.x0, x);
    b.x1 = Math.max(b.x1, x);
    b.y0 = Math.min(b.y0, y);
    b.y1 = Math.max(b.y1, y);
  }
  return b;
}

// a person or thing on screen: from its anchor down to the floor, `keep` metres (default about a body) round it
export function thingBox(g, m) {
  const k = g.place.charScale || 1,
    r = m.keep ?? (/person/.test(m.kind || '') ? 0.35 : 0.45) * k;
  const top = m.anchor(new THREE.Vector3());
  const pts = [top];
  for (let i = 0; i < 8; i++) {
    const t = (i / 8) * Math.PI * 2;
    for (const y of [0, Math.min(top.y, 1)])
      pts.push(new THREE.Vector3(top.x + Math.cos(t) * r, y, top.z + Math.sin(t) * r));
  }
  return screenBox(g.place.camera, pts);
}

// an element's box, or null while it isn't laid out
export function elBox(el) {
  const r = el && el.getBoundingClientRect();
  return r && r.width ? { x0: r.left, x1: r.right, y0: r.top, y1: r.bottom } : null;
}
