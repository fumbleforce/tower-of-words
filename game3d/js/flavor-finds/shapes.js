// Small code-built objects use the same materials as the places around them.
import * as THREE from 'three';
import { rbox, mat, textTexture } from '../props.js';
export const group = () => new THREE.Group();
export function box(g, w, h, d, color, x = 0, y = 0, z = 0) {
  const o = rbox(w, h, d, color);
  o.position.set(x, y, z);
  g.add(o);
  return o;
}
export function cylinder(g, radius, h, color, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, h, 16), mat(color));
  o.position.set(x, y, z);
  g.add(o);
  return o;
}
export function loop(g, radius, tube, color, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 6, 18), mat(color));
  o.position.set(x, y, z);
  g.add(o);
  return o;
}
export function paper(g, lines, w = 0.25, h = 0.18) {
  const tex = textTexture(
    (ctx, width, height) => {
      ctx.fillStyle = '#f2f1eb';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#bfc4c6';
      ctx.strokeRect(5, 5, width - 10, height - 10);
      ctx.fillStyle = '#3d4a52';
      ctx.font = '34px sans-serif';
      ctx.textAlign = 'center';
      lines.forEach((line, i) => ctx.fillText(line, width / 2, ((i + 1) * height) / (lines.length + 1), width - 24));
    },
    512,
    384,
  );
  const o = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }),
  );
  g.add(o);
  return o;
}
export function twoSidedPaper(g, front, back, w, h) {
  const card = group();
  g.add(card);
  const a = paper(card, front, w, h),
    b = paper(card, back, w, h);
  a.material.side = b.material.side = THREE.FrontSide;
  b.rotation.y = Math.PI;
  b.position.z = -0.001;
  return card;
}
export function book(g, color = '#44788b') {
  box(g, 0.4, 0.025, 0.3, color);
  box(g, 0.38, 0.04, 0.28, '#eeeee5', 0, 0.027);
  const hinge = group();
  g.add(hinge);
  hinge.position.set(-0.2, 0.05, 0);
  box(hinge, 0.4, 0.015, 0.3, color, 0.2);
  return hinge;
}
export function cup(g) {
  cylinder(g, 0.105, 0.17, '#7bafb9', 0, 0.09);
  cylinder(g, 0.083, 0.007, '#354b53', 0, 0.179);
  loop(g, 0.065, 0.016, '#7bafb9', 0.11, 0.095).rotation.y = Math.PI / 2;
}
export function saucer(g, y = 0) {
  const o = group();
  g.add(o);
  o.position.y = y;
  cylinder(o, 0.15, 0.016, '#dce4e3');
  loop(o, 0.128, 0.013, '#dce4e3', 0, 0.014).rotation.x = Math.PI / 2;
  return o;
}
export function dynamic(g) {
  g.traverse((o) => {
    o.userData.noBatch = true;
  });
  return g;
}
