import { readerNotebook } from './notebook.js';
import * as THREE from 'three';
import { Kit } from '../dorms/kit.js';
import { referenceTexture, paperMesh } from './books.js';
import { textTexture, JP_FONT } from '../../props.js';
export function roomDetails(root) {
  const k = new Kit();
  // The same local plan is pinned near the entrance, above shallow back issues.
  k.box('#5b7474', 0.045, 1.22, 1.22, -3.89, 0.52, -2.48, { surf: 'paint' });
  const plan = new THREE.Mesh(
    new THREE.PlaneGeometry(1.05, (1.05 * 940) / 900),
    new THREE.MeshStandardMaterial({ map: referenceTexture('weather-plan'), roughness: 0.95 }),
  );
  plan.position.set(-3.864, 1.13, -2.48);
  plan.rotation.y = Math.PI / 2;
  root.add(plan);
  k.flush(root);
  const shelf = new THREE.Group();
  shelf.name = 'research-back-issues';
  root.add(shelf);
  for (const x of [-3.3, -1.95]) k.box('#65797b', 0.035, 0.5, 0.32, x, 0, -3.13, { surf: 'metal' });
  for (const y of [0.1, 0.44]) k.box('#c8ad80', 1.42, 0.035, 0.37, -2.625, y, -3.13, { surf: 'paint' });
  for (let j = 0; j < 7; j++)
    k.box(['#426e91', '#a55747', '#d0ad57'][j % 3], 0.13, 0.24, 0.24, -3.16 + j * 0.17, 0.135, -3.12, { surf: 'card' });
  k.flush(shelf);
  // A narrow coat stand and umbrella cup keep the west entrance clear.
  k.cyl('#536b70', 0.045, 0.11, 0.025, -3.57, 0.005, 1.52, { surf: 'metal' });
  k.cyl('#687f80', 0.017, 0.017, 1.26, -3.57, 0.03, 1.52, { surf: 'metal' });
  for (const x of [-0.14, 0.14])
    k.box('#536b70', 0.18, 0.025, 0.025, -3.57 + x, 1.23, 1.52, { surf: 'metal', ry: x > 0 ? 0.3 : -0.3 });
  k.cyl('#849d99', 0.13, 0.11, 0.3, -3.25, 0, 1.62, { surf: 'metal' });
  for (const x of [-0.035, 0.035])
    k.box('#4c6269', 0.035, 0.6, 0.035, -3.25 + x, 0.16, 1.62, { surf: 'fabric', rz: x });
  // A small labelled book return, with ordinary unnumbered volumes, remains separate from the active pair.
  const tex = textTexture(
    (g, w, h) => {
      g.fillStyle = '#dde4df';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#35494c';
      g.textAlign = 'center';
      g.font = `600 36px ${JP_FONT}`;
      g.fillText('返却', w / 2, 48);
      g.font = '22px sans-serif';
      g.fillText('RETURN', w / 2, 83);
    },
    256,
    100,
  );
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.56, 0.22),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }),
  );
  label.position.set(2.88, 0.83, 0.45);
  label.rotation.y = -Math.PI / 2;
  root.add(label);
  const sheet = paperMesh('weather-plan', 0.36);
  sheet.position.set(-0.52, 0.642, -1.79);
  root.add(sheet);
  readerNotebook(root);
  k.flush(root);
}
