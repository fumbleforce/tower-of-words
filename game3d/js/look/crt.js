import * as THREE from 'three';

// Office-only housing: retain the original live screen and its exact local transform.
// The tapered rear fits the existing back-to-back desk gap without moving a screen.
export function crtHousing(group, box, material) {
  const screen = group.children.find((child) => child.geometry?.type === 'PlaneGeometry');
  if (!screen) throw Error('CRT housing requires its original screen');
  const beige = '#d5ceba',
    trim = '#b4ad99';
  group.clear();
  group.add(screen);
  group.name = 'office-crt';
  group.userData.crt = true;
  const geometry = new THREE.BoxGeometry(0.47, 0.33, 0.205);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    if (positions.getZ(i) < 0) {
      positions.setX(i, positions.getX(i) * 0.76);
      positions.setY(i, positions.getY(i) * 0.8);
    }
  }
  geometry.computeVertexNormals();
  const body = new THREE.Mesh(geometry, material(beige));
  body.position.set(0, 0.25, screen.position.z - 0.105);
  body.castShadow = body.receiveShadow = true;
  group.add(body);
  group.add(box(0.3, 0.025, 0.17, trim, { y: 0, z: -0.095, r: 0.008 }));
  group.add(box(0.24, 0.075, 0.13, beige, { y: 0.02, z: -0.095, r: 0.012 }));
  // Bezel rails leave the original picture unobstructed, including its terminal text.
  for (const [w, h, x, y] of [
    [0.47, 0.035, 0, 0.085],
    [0.47, 0.035, 0, 0.38],
    [0.028, 0.26, -0.221, 0.12],
    [0.028, 0.26, 0.221, 0.12],
  ])
    group.add(box(w, h, 0.009, beige, { x, y, z: screen.position.z, r: 0.003 }));
  for (let i = 0; i < 7; i++) {
    const z = screen.position.z - 0.03 - i * 0.02;
    const y = 0.416 - ((screen.position.z - z - 0.0025) / 0.205) * 0.033;
    group.add(box(0.19, 0.002, 0.005, '#777466', { y, z, r: 0, cast: false }));
    group.add(
      box(0.2, 0.008, 0.002, '#777466', { y: 0.15 + i * 0.024, z: screen.position.z - 0.2085, r: 0, cast: false }),
    );
  }
  // Side vents lie on the tapered surface, visible in an ordinary oblique view.
  const slope = (0.235 * 0.24) / 0.205;
  for (const side of [-1, 1])
    for (let i = 0; i < 7; i++) {
      const vent = new THREE.Mesh(new THREE.PlaneGeometry(0.065, 0.005), material('#777466'));
      vent.position.set(side * (0.235 - slope * 0.1095 + 0.0008), 0.16 + i * 0.023, screen.position.z - 0.112);
      vent.rotation.y = Math.atan2(side, -slope);
      group.add(vent);
    }
  for (const x of [0.105, 0.13])
    group.add(box(0.018, 0.009, 0.006, trim, { x, y: 0.102, z: screen.position.z + 0.006, r: 0.002 }));
  group.add(box(0.014, 0.014, 0.007, '#777c65', { x: 0.19, y: 0.1, z: screen.position.z + 0.006, r: 0.003 }));
  return group;
}
