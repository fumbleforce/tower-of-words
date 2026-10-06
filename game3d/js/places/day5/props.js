import * as THREE from 'three';
import { rbox, textTexture } from '../../props.js';

export function anchor(P, id) {
  const v = P.things[id].anchor(new THREE.Vector3());
  return P.space.worldToLocal(v);
}
export function board(P, lines, { w = 0.5, h = 0.3, color = '#eef3f4' } = {}) {
  const tex = textTexture(
    (g, W, H) => {
      g.fillStyle = color;
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#192c39';
      g.textAlign = 'left';
      g.font = `${Math.round(H / (lines.length + 1.7))}px sans-serif`;
      lines.forEach((line, i) => g.fillText(line, W * 0.06, (H * (i + 0.9)) / (lines.length + 0.5)));
    },
    768,
    Math.round((768 * h) / w),
  );
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({
      map: tex,
      side: THREE.DoubleSide,
      roughness: 0.8,
    }),
  );
  mesh.userData.noBatch = true;
  P.space.add(mesh);
  return mesh;
}
export function prop(P, size, color, at) {
  const mesh = rbox(...size, color, { r: Math.min(...size) * 0.12 });
  mesh.userData.noBatch = true;
  mesh.position.set(...at);
  P.space.add(mesh);
  return mesh;
}
export async function moveProp(game, prop, to, seconds = 0.65) {
  const from = prop.position.clone();
  await game.tween(seconds, (t) => prop.position.lerpVectors(from, new THREE.Vector3(...to), t));
}
export function inHand(P, item, who, { side = 1, height = 0.68 } = {}) {
  const rig = P.people[who];
  if (!rig?.root.visible) throw new Error(`Cannot hand an item to absent ${who}`);
  const p = rig.root.position,
    a = rig.root.rotation.y;
  item.position.set(
    p.x + Math.cos(a) * 0.18 * side + Math.sin(a) * 0.22,
    height,
    p.z - Math.sin(a) * 0.18 * side + Math.cos(a) * 0.22,
  );
  item.visible = true;
}
export function frame(game, id, distance = 2.4) {
  const P = game.place,
    person = P.people[id];
  const at = person ? person.root.position : anchor(P, id);
  P.monday.shot.focus([at.x, at.z], distance, person ? 0.75 : at.y, 0.35, person ? 0.3 : 0.7);
}
