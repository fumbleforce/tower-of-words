import * as THREE from 'three';
import { textTexture } from '../../props.js';
// The reader sketches the same three outdoor shapes, then enlarges the small cylinder.
export function readerNotebook(root) {
  const texture = textTexture(
    (g, w, h) => {
      g.fillStyle = '#ece5d0';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#596264';
      g.lineWidth = 4;
      const line = (points) => {
        g.beginPath();
        for (const [i, p] of points.entries()) g[i ? 'lineTo' : 'moveTo'](...p);
        g.stroke();
      };
      g.strokeRect(65, 155, 225, 145);
      line([
        [50, 155],
        [178, 100],
        [305, 155],
      ]);
      for (let y = 173; y < 299; y += 22)
        line([
          [65, y],
          [290, y],
        ]);
      for (const x of [90, 265])
        line([
          [x, 300],
          [x, 410],
        ]);
      line([
        [425, 140],
        [425, 405],
      ]);
      line([
        [368, 158],
        [484, 158],
      ]);
      for (const x of [368, 484]) {
        g.beginPath();
        g.ellipse(x, 158, 16, 9, 0, 0, Math.PI * 2);
        g.stroke();
      }
      const cylinder = (x, y, r, height) => {
        g.beginPath();
        g.ellipse(x, y, r, r * 0.32, 0, 0, Math.PI * 2);
        g.stroke();
        line([
          [x - r, y],
          [x - r, y + height],
        ]);
        line([
          [x + r, y],
          [x + r, y + height],
        ]);
        g.beginPath();
        g.ellipse(x, y + height, r, r * 0.32, 0, 0, Math.PI);
        g.stroke();
      };
      cylinder(342, 365, 14, 52);
      cylinder(702, 162, 60, 225);
      line([
        [364, 383],
        [501, 435],
        [603, 331],
      ]);
      line([
        [578, 340],
        [603, 331],
        [599, 360],
      ]);
    },
    900,
    600,
  );
  const sheet = new THREE.Mesh(
    new THREE.PlaneGeometry(0.38, 0.255),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 1 }),
  );
  sheet.rotation.x = -Math.PI / 2;
  sheet.position.set(0.05, 0.671, -1.84);
  sheet.name = 'research-reader-sketch';
  root.add(sheet);
  return sheet;
}
