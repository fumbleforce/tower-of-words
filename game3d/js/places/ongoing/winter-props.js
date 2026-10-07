import * as THREE from 'three';
import { rbox } from '../../props.js';
// All positions belong to the existing gym plan; the net at x=-1.1 remains blocked.
export const WINTER_SPOTS = {
  kuro: [-3.45, -11.15],
  eric: [1.25, -10.15],
  watch: [2.45, -8.6],
  emi: [-6.55, -7.7],
  attendant: [-7.25, -7.7],
  sheet: [-8.98, 0.26, -8.6],
  sheetOut: [-8.2, -8.6],
};
export function winterProps(space) {
  const root = new THREE.Group();
  root.name = 'winter-club-props';
  root.visible = false;
  space.add(root);
  const items = [];
  const add = (obj, name) => {
    obj.name = name;
    obj.userData.noBatch = true;
    root.add(obj);
    items.push(obj);
    return obj;
  };
  const rackets = {};
  for (const [id, color] of [
    ['kuro', '#517f80'],
    ['eric', '#ab694d'],
    ['emi', '#7e7596'],
  ]) {
    const racket = add(new THREE.Group(), 'winter-racket-' + id),
      body = new THREE.Group();
    racket.add(body);
    body.rotation.x = Math.PI / 3;
    const handle = rbox(0.028, 0.13, 0.028, '#454c4f');
    handle.position.y = 0.055;
    body.add(handle);
    const shaft = rbox(0.012, 0.17, 0.012, '#acb4b3');
    shaft.position.y = 0.2;
    body.add(shaft);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.105, 0.009, 6, 24),
      new THREE.MeshStandardMaterial({ color, roughness: 0.65 }),
    );
    ring.scale.y = 1.25;
    ring.position.y = 0.38;
    body.add(ring);
    const lines = [];
    for (const x of [-0.07, -0.035, 0, 0.035, 0.07]) {
      const y = Math.sqrt(0.105 * 0.105 - x * x) * 1.25;
      lines.push(x, 0.38 - y, 0, x, 0.38 + y, 0);
    }
    for (const y of [-0.08, -0.04, 0, 0.04, 0.08]) {
      const x = Math.sqrt(0.105 * 0.105 - (y / 1.25) ** 2);
      lines.push(-x, 0.38 + y, 0, x, 0.38 + y, 0);
    }
    body.add(
      new THREE.LineSegments(
        new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(lines, 3)),
        new THREE.LineBasicMaterial({ color: '#ced4c8' }),
      ),
    );
    const contact = new THREE.Object3D();
    contact.position.y = 0.38;
    body.add(contact);
    racket.visible = false;
    rackets[id] = { root: racket, body, contact };
  }
  const shuttle = add(new THREE.Group(), 'winter-shuttle');
  shuttle.add(
    new THREE.Mesh(
      new THREE.ConeGeometry(0.045, 0.075, 8, 1, true),
      new THREE.MeshStandardMaterial({ color: '#f0f1df', side: THREE.DoubleSide }),
    ),
  );
  const cork = new THREE.Mesh(
    new THREE.SphereGeometry(0.018, 8, 6),
    new THREE.MeshStandardMaterial({ color: '#c6ac82' }),
  );
  cork.position.y = -0.04;
  shuttle.add(cork);
  shuttle.visible = false;
  const paper = add(new THREE.Group(), 'winter-organizer-sheet'),
    paperFace = new THREE.Group();
  paper.add(paperFace);
  const card = new THREE.Mesh(
    new THREE.PlaneGeometry(0.23, 0.3),
    new THREE.MeshStandardMaterial({ color: '#f0edda', side: THREE.DoubleSide }),
  );
  paperFace.add(card);
  const paperGrips = { emi: new THREE.Object3D(), attendant: new THREE.Object3D() };
  paperFace.add(paperGrips.emi, paperGrips.attendant);
  // Opposite lower edges are distinct real contact points on the printed sheet.
  for (let i = 0; i < 6; i++) {
    const line = rbox(0.17, 0.003, 0.002, '#8f9790');
    line.position.set(0, -0.08 + i * 0.03, 0.002);
    card.add(line);
  }
  let paperOwner = null;
  function paperGrip(id) {
    paperOwner = id;
    if (id === 'emi') {
      card.position.set(-0.115, 0.13, 0);
      paperGrips.emi.position.set(0, 0, 0);
      paperGrips.attendant.position.set(-0.23, 0.06, 0);
    } else if (id === 'attendant') {
      card.position.set(0.115, 0.07, 0);
      paperGrips.emi.position.set(0.23, -0.06, 0);
      paperGrips.attendant.position.set(0, 0, 0);
    } else {
      card.position.set(0, 0.13, 0);
      paperFace.rotation.set(0, 0, 0);
    }
    alignPaper();
  }
  function alignPaper() {
    if (paperOwner) paperFace.rotation.y = -paper.rotation.y;
  }
  paperGrip(null);
  paper.visible = false;
  return {
    root,
    items,
    rackets,
    shuttle,
    paper,
    paperGrips,
    paperCard: card,
    paperGrip,
    alignPaper,
    reset() {
      for (const item of items) {
        root.attach(item);
        item.position.set(0, 0, 0);
        item.rotation.set(0, 0, 0);
        item.visible = false;
      }
      paperGrip(null);
      for (const r of Object.values(rackets)) r.body.rotation.set(Math.PI / 3, 0, 0);
    },
  };
}
