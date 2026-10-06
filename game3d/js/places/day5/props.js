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
      const size = Math.round(H / (lines.length + 1.7));
      g.font = `${size}px sans-serif`;
      const widest = Math.max(1, ...lines.map((line) => g.measureText(line).width));
      g.font = `${Math.floor(size * Math.min(1, (W * 0.88) / widest))}px sans-serif`;
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
  const name = side < 0 ? 'LeftHand' : 'RightHand';
  const hand =
    (rig.model || rig.root).getObjectByName(name) ||
    (rig.model || rig.root).getObjectByName('mixamorig' + name) ||
    rig.arms?.[side < 0 ? 0 : 1]?.userData.hand;
  if (hand) {
    hand.getWorldPosition(item.position);
    P.space.worldToLocal(item.position);
  }
  item.visible = true;
}
export function frame(game, id) {
  const P = game.place,
    person = P.people[id];
  const at = person ? person.root.position.clone() : anchor(P, id);
  const sizes = {
    vending: [3.4, 3.8],
    copier: [2.2, 1.8],
    office_door: [1.5, 2],
    label_printer: [1.4, 1],
    song_terminal: [1.3, 0.9],
    art_table: [1.8, 1],
    drying_rack: [0.75, 0.65],
  };
  const reception = id === 'kuro' && P.name === 'forecourt';
  const seatedAoi = id === 'aoi' && P.name === 'dorm_commons';
  const lunchAoi = id === 'aoi' && P.name === 'plaza';
  const deskMori = id === 'mori' && P.name === 'office' && at.z < -2;
  const [width, height] = lunchAoi
    ? [2.6, 2.4]
    : deskMori
      ? [3, 2.8]
      : reception
        ? [2.6, 2.4]
        : seatedAoi
          ? [2.2, 1.8]
          : id === 'mio' && P.name === 'office'
            ? [2.3, 2.2]
            : sizes[id] || [1.5, 2];
  const tangent = Math.tan((P.camera.fov * Math.PI) / 360);
  const distance = 1.1 * Math.max(width / (2 * tangent * P.camera.aspect), height / (2 * tangent));
  if (id === 'vending') at.set(-5.45, 0.9, -1.25);
  if (id === 'label_printer') at.x += 0.2;
  if (reception) {
    at.x -= 0.3;
    at.z += 0.4;
  }
  if (seatedAoi) at.x += 0.45;
  if (deskMori) at.set(1.9, 0.8, -2.9);
  P.monday.shot.focus(
    [at.x, at.z],
    distance,
    person ? 0.85 : at.y,
    deskMori ? 0 : 0.35,
    lunchAoi ? 0.7 : deskMori ? 0.85 : reception || seatedAoi ? 0.75 : id === 'vending' ? 0.65 : person ? 0.4 : 0.7,
  );
}
