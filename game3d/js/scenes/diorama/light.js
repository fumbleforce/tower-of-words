import * as THREE from 'three';
import { SE } from '../forecourt/plan.js';

// Aim the wall fixture down and away from the facade; a bare point washes out
// nearby glazing and the roof edge before enough light reaches the bike aisle.
export function rackLight(root) {
  const light = new THREE.SpotLight('#dae4ee', 0, 8, Math.PI / 3, 0.65, 2);
  light.target.position.set(SE + 3, 0, 6.4);
  root.add(light.target);
  return light;
}
