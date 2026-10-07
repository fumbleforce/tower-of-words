import * as THREE from 'three';
import { rbox, emissive } from '../props.js';
import { lapSupport, seatedWork } from './seated-work.js';

export function trainLaptop(game, space) {
  const laptop = new THREE.Group(),
    hands = seatedWork(game, space);
  let user = null,
    support = null,
    migrate = null;
  const base = rbox(0.24, 0.015, 0.16, '#b9bec6', { r: 0.006 });
  const kb = rbox(0.2, 0.004, 0.08, '#3a3f48', { y: 0.015, z: -0.02, r: 0.002, cast: false });
  const hinge = new THREE.Group();
  hinge.position.set(0, 0.015, 0.08);
  hinge.rotation.x = 0.3;
  const lid = rbox(0.24, 0.16, 0.012, '#c9ced6', { r: 0.006 });
  lid.position.z = 0.006;
  hinge.add(lid);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.13), emissive('#cfe4ff', '#9fc8ff', 0.8));
  screen.rotation.y = Math.PI;
  screen.position.set(0, 0.08, -0.002);
  hinge.add(screen);
  laptop.add(base, kb, hinge);
  laptop.name = 'train-laptop';
  laptop.seatMio = (rig) => {
    if (rig.id !== 'mio2') return;
    // Keep the saved prop in car coordinates; it must not travel with Mio when she stands or leaves.
    space.attach(laptop);
    support = lapSupport(rig, 0.24, 0.16);
    laptop.position.copy(space.worldToLocal(rig.root.localToWorld(support.clone())));
    user = rig;
  };
  laptop.migrateSeat = (seat) => {
    migrate = seat;
  };
  laptop.updateHands = () => {
    // Apply once after every saved-place decorator has restored its actors.
    if (migrate) {
      const visible = user.root.visible;
      migrate();
      user.root.visible = visible;
      migrate = null;
    }
    if (user?.seated && user.root.visible) {
      laptop.position.copy(space.worldToLocal(user.root.localToWorld(support.clone())));
      if (!game.busy)
        hands(user, laptop, [
          [-0.065, 0.019, -0.02],
          [0.065, 0.019, -0.02],
        ]);
    }
  };
  return laptop;
}
