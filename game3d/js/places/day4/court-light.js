// Evening tennis uses the court's floodlights. No shadows or offscreen animation work.
import * as THREE from 'three';
import { rbox } from '../../props.js';
import { sim } from '../../sim.js';
import * as C from '../../scenes/sports/court-plan.js';
import { pt } from '../../scenes/sports/plan.js';
export function courtLight(P) {
  const lamps = [];
  for (const x of [C.COURTS[0] + 0.12, C.COURTS[1] - 0.12]) {
    const [lx, lz] = pt([x, C.CZ]);
    P.space.add(rbox(0.1, 5.8, 0.1, '#798992', { x: lx, y: 2.9, z: lz }));
    const housing = rbox(0.42, 0.14, 0.3, '#c7d6dd', { x: lx, y: 5.8, z: lz });
    P.space.add(housing);
    const light = new THREE.PointLight('#e1f0ff', 30, 30, 1.2);
    light.position.set(lx, 5.6, lz);
    light.visible = false;
    P.space.add(light);
    lamps.push(light);
  }
  return () =>
    lamps.forEach((l) => {
      l.visible = sim.day >= 4 && sim.period === 'evening';
    });
}
