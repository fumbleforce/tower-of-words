// Evening tennis uses the court's floodlights (scenes/sports/court-plan.js MASTS, built by sports/courts.js): one
// light for each lit line of masts, between its two masts at the heads' height. No shadows or offscreen animation work.
import * as THREE from 'three';
import { sim } from '../../sim.js';
import * as C from '../../scenes/sports/court-plan.js';
import { pt } from '../../scenes/sports/plan.js';
export function courtLight(P) {
  const lamps = [];
  for (const x of new Set(C.MASTS.filter((m) => m[3]).map((m) => m[0]))) {
    const [lx, lz] = pt([x, C.CZ]);
    const light = new THREE.PointLight('#e1f0ff', 30, 30, 1.2);
    light.position.set(lx, 6.9, lz);
    light.visible = false;
    P.space.add(light);
    lamps.push(light);
  }
  return () =>
    lamps.forEach((l) => {
      l.visible = sim.day >= 4 && sim.period === 'evening';
    });
}
