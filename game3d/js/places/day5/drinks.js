import * as THREE from 'three';

// Tableware for Mori's afternoon conversation, separate from the evening drinks.
export function deskDrinks(P) {
  const material = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.65 });
  const piece = (group, geometry, color, at = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(geometry, material(color));
    mesh.position.set(...at);
    mesh.userData.noBatch = true;
    group.add(mesh);
    return mesh;
  };
  const item = (at) => {
    const group = new THREE.Group();
    group.position.set(...at);
    P.space.add(group);
    return group;
  };
  const soup = item([1.7, 0.495, -3.6]);
  piece(soup, new THREE.CylinderGeometry(0.045, 0.045, 0.15, 12), '#e2c353');
  for (const y of [-0.075, 0.075])
    piece(soup, new THREE.CylinderGeometry(0.046, 0.046, 0.008, 12), '#c8cdd0', [0, y, 0]);
  const pot = item([1.45, 0.52, -2.88]);
  const body = piece(pot, new THREE.SphereGeometry(0.1, 12, 8), '#708d9c');
  body.scale.y = 0.9;
  piece(pot, new THREE.CylinderGeometry(0.06, 0.07, 0.025, 12), '#cad6dc', [0, 0.085, 0]);
  piece(pot, new THREE.SphereGeometry(0.02, 8, 6), '#708d9c', [0, 0.11, 0]);
  const spout = piece(pot, new THREE.CylinderGeometry(0.025, 0.045, 0.13, 8), '#708d9c', [0.095, 0.02, 0]);
  spout.rotation.z = -0.95;
  piece(pot, new THREE.TorusGeometry(0.065, 0.014, 6, 12), '#708d9c', [-0.095, 0.025, 0]);
  const tea = item([1.23, 0.475, -2.88]);
  piece(tea, new THREE.CylinderGeometry(0.045, 0.035, 0.11, 12), '#d7e7df');
  piece(tea, new THREE.CylinderGeometry(0.037, 0.037, 0.002, 12), '#685839', [0, 0.056, 0]);
  piece(tea, new THREE.TorusGeometry(0.032, 0.009, 6, 12), '#d7e7df', [0.053, 0.012, 0]);
  return { soup, pot, tea };
}
