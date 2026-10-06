// The existing desk fan, split into movable head, blades and lever for the repair.
import { captureObjects, restoreObjects } from './saved.js';
import * as THREE from 'three';
import { mat, rbox } from '../../props.js';
import { flags } from '../../narrative/state.js';
import { sim } from '../../sim.js';
import { movable } from './tennis-props.js';
import { sfx } from '../../sfx.js';
export function fanRepair(game, P, shot) {
  const anchor = P.things.desk_fan.anchor(new THREE.Vector3());
  P.space.worldToLocal(anchor);
  const root = new THREE.Group(),
    head = new THREE.Group(),
    blades = new THREE.Group();
  root.position.set(anchor.x, anchor.y - 0.5, anchor.z);
  root.rotation.y = Math.PI / 2 + 0.35;
  root.add(rbox(0.18, 0.04, 0.16, '#d6d2c6', { y: 0.02 }), rbox(0.03, 0.16, 0.03, '#bdb9ad', { y: 0.12 }));
  const lever = rbox(0.03, 0.05, 0.045, '#7c8f8a', {
    x: 0.06,
    y: 0.055,
    z: 0.04,
  });
  root.add(lever, head);
  head.position.set(0, 0.27, 0.03);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.08, 10), mat('#c9c4b6'));
  hub.rotation.x = Math.PI / 2;
  hub.position.z = -0.04;
  head.add(hub, blades);
  for (let i = 0; i < 3; i++) {
    const blade = rbox(0.05, 0.1, 0.006, '#8fb3ad', { y: 0.055 });
    const g = new THREE.Group();
    g.add(blade);
    g.rotation.z = (i * Math.PI * 2) / 3;
    blades.add(g);
  }
  for (const r of [0.12, 0.07]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.005, 4, 18), mat('#a8afb2'));
    ring.position.z = 0.012;
    head.add(ring);
  }
  movable(root);
  P.space.add(root);
  let running = false,
    inspecting = false,
    time = 0;
  const restore = () => {
    running = !!flags.d4_fan_done;
    lever.rotation.x = running ? 0 : 0.55;
    lever.position.y = running ? 0.075 : 0.055;
  };
  const prior = P.kotodamaTargets;
  P.kotodamaTargets = (id) => (id === 'desk_fan' ? [root] : prior?.(id));
  async function hook({ state }) {
    const point = P.things.desk_fan.face();
    const attendant = P.people.attendant.root.position;
    const centre = state === 'show' ? [(point[0] + attendant.x) / 2, (point[1] + attendant.z) / 2] : point;
    shot.focus(centre, state === 'show' ? 14 : 9, 0.8, Math.PI / 2 + 0.35, 0.5);
    if (state === 'show') {
      restore();
      await game.wait(450);
    } else if (state === 'lever' || state === 'start') {
      await game.tween(0.6, (k) => {
        lever.rotation.x = 0.55 * (1 - k);
        lever.position.y = 0.055 + 0.02 * k;
      });
      running = true;
      sfx('tap');
    } else if (state === 'oscillate') {
      inspecting = true;
      await game.tween(3.2, (k) => {
        head.rotation.y = Math.sin(k * Math.PI * 2) * 0.8;
      });
      inspecting = false;
    }
  }
  return {
    restore,
    snapshot: () => ({ running, time, objects: captureObjects([head, blades, lever]) }),
    load: (s) => {
      running = s.running;
      time = s.time;
      restoreObjects([head, blades, lever], s.objects);
    },
    hooks: { fanRepair: hook },
    update(dt) {
      if (!running && sim.day !== 4) running = !!flags.d4_fan_done;
      if (running) {
        blades.rotation.z += dt * 20;
        time += dt;
        if (!inspecting) head.rotation.y = Math.sin(time * 0.8) * 0.8;
      }
    },
  };
}
