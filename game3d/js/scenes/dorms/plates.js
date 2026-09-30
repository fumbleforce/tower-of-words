// Small printed plates on Eric's floor: the room numbers over the doors and the 2F sign on the landing. All of them
// share one texture (a row of cells, one per text) and one mesh, so the floor's signs cost a single draw.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { textTexture } from '../../props.js';

const CELL = 128;

// list: [text, x, y (middle), z, w, h] each, facing +z (the camera)
export function plates(list) {
  const texts = [...new Set(list.map(([t]) => t))];
  const tex = textTexture(
    (g, w, h) => {
      texts.forEach((t, i) => {
        const x = i * CELL * 2;
        g.fillStyle = '#e2e3e0';
        g.fillRect(x, 0, CELL * 2, h);
        g.strokeStyle = '#8d939b';
        g.lineWidth = 6;
        g.strokeRect(x + 3, 3, CELL * 2 - 6, h - 6);
        g.fillStyle = '#262a31';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = `700 ${Math.round(h * 0.66)}px sans-serif`;
        g.fillText(t, x + CELL, h * 0.54);
      });
    },
    CELL * 2 * texts.length,
    CELL,
  );
  const geos = list.map(([t, x, y, z, w, h]) => {
    const g = new THREE.PlaneGeometry(w, h).translate(x, y, z);
    const i = texts.indexOf(t),
      uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setX(k, (i + uv.getX(k)) / texts.length);
    return g;
  });
  const mesh = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }));
  mesh.receiveShadow = true;
  geos.forEach((g) => g.dispose());
  return mesh;
}
