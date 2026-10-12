import * as THREE from 'three';
import { PAL, plant, rbox, shelf } from '../props.js';

// The existing binder divider, turned toward the huddle table in its new corner.
export function referenceShelf() {
  const group = new THREE.Group();
  group.add(shelf(1.4, 0.56, 0.34, { fill: 'binders', seed: 13 }));
  group.add(rbox(1.44, 0.03, 0.38, '#c9ccd0', { y: 0.56, r: 0.01 }));
  for (const [x, seed] of [
    [-0.52, 33],
    [0.53, 35],
  ]) {
    const p = plant({ size: 0.5, seed });
    p.position.set(x, 0.58, 0);
    group.add(p);
  }
  group.add(
    rbox(0.3, 0.06, 0.24, PAL.dark, { y: 0.58, r: 0.01 }),
    rbox(0.28, 0.03, 0.22, PAL.paper, { y: 0.64, r: 0.004 }),
  );
  return group;
}
