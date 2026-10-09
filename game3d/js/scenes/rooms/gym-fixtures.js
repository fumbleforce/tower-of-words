// Gym fittings keep the hall's existing openings and equipment footprints.
import * as THREE from 'three';
import { windowFrame, shelf } from '../../look/detail.js';
import { PAL } from '../../props.js';
import { C, R, GLASS_Z, BLOCK } from './gym-plan.js';

const WINDOW = { width: 1.18, bottom: 1.36, height: 0.54 };
export const GYM_WINDOWS = [-5.6, -3.9, 1.7, 3.4].map((at) => ({ side: 'n', at }));
for (const [side, end] of [
  ['w', GLASS_Z],
  ['e', BLOCK.z0],
])
  for (let at = R.z0 + 1.5; at < end - 0.8; at += 1.7) GYM_WINDOWS.push({ side, at });

export function gymWindowHoles() {
  const holes = { n: [], w: [], e: [] };
  for (const { side, at } of GYM_WINDOWS)
    holes[side].push([
      at - WINDOW.width / 2 - 0.02,
      at + WINDOW.width / 2 + 0.02,
      WINDOW.bottom - 0.02,
      WINDOW.bottom + WINDOW.height + 0.02,
    ]);
  return holes;
}

// Flatten existing prop builders into the room's material batches.
function collect(kit, object, surf) {
  object.updateMatrixWorld(true);
  object.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const opts = {};
    if (mesh.material.roughness !== 0.8) opts.roughness = mesh.material.roughness;
    if (mesh.material.metalness !== 0) opts.metalness = mesh.material.metalness;
    kit.add('#' + mesh.material.color.getHexString(), mesh.geometry.clone().applyMatrix4(mesh.matrixWorld), {
      surf,
      cast: mesh.castShadow,
      opts,
    });
    mesh.geometry.dispose();
  });
}

export function gymWindows(kit) {
  for (const { side, at } of GYM_WINDOWS) {
    const x = side === 'n' ? at : side === 'w' ? R.x0 - R.t / 2 : R.x1 + R.t / 2;
    const z = side === 'n' ? R.z0 - R.t / 2 : at;
    const ry = side === 'w' ? Math.PI / 2 : side === 'e' ? -Math.PI / 2 : 0;
    const frame = windowFrame(WINDOW.width, WINDOW.height);
    frame.position.set(x, WINDOW.bottom, z);
    frame.rotation.y = ry;
    collect(kit, frame, 'frame');
    // Flat outer backing closes the rounded casing joins around the aperture.
    for (const [w, h, dx, dy] of [
      [WINDOW.width + 0.04, 0.02, 0, -0.01],
      [WINDOW.width + 0.04, 0.02, 0, WINDOW.height + 0.01],
      [0.02, WINDOW.height, -WINDOW.width / 2 - 0.01, WINDOW.height / 2],
      [0.02, WINDOW.height, WINDOW.width / 2 + 0.01, WINDOW.height / 2],
    ])
      kit.add(
        PAL.trim,
        new THREE.BoxGeometry(w, h, 0.012).translate(dx, dy, -0.1).rotateY(ry).translate(x, WINDOW.bottom, z),
        { surf: 'frame' },
      );
    // Frosted glazing lies behind the frame, inside the actual wall opening.
    const pane = new THREE.BoxGeometry(WINDOW.width, WINDOW.height, 0.012)
      .translate(0, WINDOW.height / 2, -0.025)
      .rotateY(ry)
      .translate(x, WINDOW.bottom, z);
    kit.add('#b8ced8', pane, {
      cast: false,
      opts: { roughness: 0.28, metalness: 0.12 },
    });
  }
}

export function ballCart(kit, x, z, color, count) {
  const steel = { surf: 'metal' };
  for (const dx of [-0.205, 0.205])
    for (const dz of [-0.205, 0.205]) {
      kit.cyl('#424850', 0.038, 0.038, 0.035, x + dx, 0.02, z + dz, {
        rz: Math.PI / 2,
        seg: 10,
      });
      kit.box(C.steel, 0.018, 0.065, 0.022, x + dx, 0.037, z + dz, steel);
      kit.box(C.steel, 0.022, 0.77, 0.022, x + dx, 0.09, z + dz, steel);
    }
  kit.box(C.steel, 0.46, 0.025, 0.46, x, 0.09, z, steel);
  for (const y of [0.12, 0.36, 0.6, 0.84])
    for (const side of [-1, 1]) {
      kit.box(C.steel, 0.46, 0.018, 0.018, x, y, z + side * 0.222, steel);
      kit.box(C.steel, 0.018, 0.018, 0.46, x + side * 0.222, y, z, steel);
    }
  // Coarse wire panels keep the balls contained without a shimmering fine grid.
  for (const offset of [-0.14, -0.07, 0, 0.07, 0.14])
    for (const side of [-1, 1]) {
      kit.box('#76818a', 0.009, 0.72, 0.009, x + offset, 0.13, z + side * 0.22, steel);
      kit.box('#76818a', 0.009, 0.72, 0.009, x + side * 0.22, 0.13, z + offset, steel);
    }
  kit.box('#424850', 0.28, 0.034, 0.033, x, 0.854, z - 0.22, {
    r: 0.006,
    surf: 'plastic',
  });
  // Full-size balls stack two across, with each layer supported by the one below.
  for (let i = 0; i < count; i++) {
    const bx = x - 0.105 + (i % 2) * 0.21;
    const bz = z - 0.105 + (Math.floor(i / 2) % 2) * 0.21;
    const by = 0.215 + Math.floor(i / 4) * 0.2;
    kit.add(color, new THREE.IcosahedronGeometry(0.1, 1).translate(bx, by, bz));
  }
}

export function equipmentShelf(kit) {
  const frame = shelf(0.9, 0.5, 0.3, { fill: 'none' });
  frame.position.set(-6.9, 0, -11.9);
  frame.rotation.y = -Math.PI / 2;
  collect(kit, frame, 'metal');
  // Recently folded bibs stay on the top shelf, visible in the overhead view.
  for (const [i, color] of ['#e8c34a', '#3f8f6a', '#b5463c'].entries())
    for (let fold = 0; fold < 3; fold++)
      kit.box(color, 0.22, 0.014, 0.22, -6.9, 0.48 + fold * 0.014, -12.15 + i * 0.26, { r: 0.004, surf: 'fabric' });
  for (const [level, color] of ['#e8c34a', '#3f8f6a', '#b5463c'].entries())
    for (const z of [-12.1, -11.7])
      for (let fold = 0; fold < 3; fold++) {
        const y = 0.08 + level * (0.4 / 3) + fold * 0.014;
        kit.box(color, 0.22, 0.014, 0.21, -6.9, y, z + (fold % 2) * 0.008, {
          r: 0.004,
          surf: 'fabric',
        });
      }
}

export function gymMats(kit) {
  for (let i = 0; i < 5; i++) {
    kit.box(i % 2 ? '#3e6aa8' : '#365f98', 0.7, 0.08, 1, -8.85, i * 0.08, -12.35, {
      r: 0.016,
      surf: 'fabric',
    });
    for (const z of [-12.65, -12.05]) {
      for (const end of [-1, 1])
        kit.box('#253e64', 0.06, 0.016, 0.012, -8.47, i * 0.08 + 0.03, z + end * 0.046, { surf: 'fabric' });
      kit.box('#253e64', 0.012, 0.016, 0.104, -8.44, i * 0.08 + 0.03, z, { surf: 'fabric' });
    }
  }
}
