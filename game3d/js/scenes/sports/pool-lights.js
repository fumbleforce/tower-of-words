// Four shielded sports fixtures light the lanes and deck after sunset. No shadow maps per fixture.
import * as THREE from 'three';
import { POOL, FLOODLIGHTS } from './deck-plan.js';
import { STEEL } from '../outdoor/furniture.js';

export function poolFloodlights(root, parts) {
  const lamps = [],
    faces = [];
  const material = new THREE.MeshStandardMaterial({
    color: '#dce4e8',
    emissive: '#e8f2ff',
    emissiveIntensity: 0,
    roughness: 0.45,
  });
  material.userData.noLook = true;
  for (const [x, z] of FLOODLIGHTS) {
    parts.box(STEEL.mid, 0.16, 5.4, 0.16, x, 0, z);
    parts.box(STEEL.dark, 0.45, 0.16, 0.45, x, 0, z);
    const target = new THREE.Object3D();
    target.position.set(POOL.x, 0, z < POOL.z ? POOL.z - 3 : POOL.z + 3);
    root.add(target);
    const light = new THREE.SpotLight('#e4efff', 0, 32, Math.PI * 0.31, 0.65, 2);
    light.position.set(x, 5.4, z);
    light.target = target;
    light.castShadow = false;
    light.name = 'pool:floodlight';
    root.add(light);
    lamps.push(light);
    const fixture = new THREE.Group();
    fixture.position.copy(light.position);
    fixture.lookAt(target.position);
    fixture.userData.noBatch = true;
    const housing = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.48, 0.16),
      new THREE.MeshStandardMaterial({ color: STEEL.dark, roughness: 0.7 }),
    );
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.73, 0.36), material);
    face.position.z = 0.086;
    fixture.add(housing, face);
    root.add(fixture);
    faces.push(face);
  }
  return {
    lamps,
    faces,
    onPeriod(period) {
      const evening = period === 'evening';
      for (const light of lamps) light.intensity = evening ? 210 : 0;
      material.emissiveIntensity = evening ? 3 : 0.05;
    },
  };
}
