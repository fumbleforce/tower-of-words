// The pavilion's actual rooms, in island coordinates. A common entrance/corridor reaches either changing room;
// only the protagonist's own room is walkable. The roof/front wall are cut away in the pool place only.
import * as THREE from 'three';
import { PAVILION, PAV_DOOR_Z, pt, rect } from './plan.js';
import { MEN_X, WOMEN_X, DOOR_Z } from './deck-plan.js';
import { bench, STEEL } from '../outdoor/furniture.js';
const [x0, x1, z0, z1] = PAVILION;
const split = (x0 + x1) / 2,
  corridorZ = z0 + 1.8,
  lobbyX = x0 + 1.25;
export const CHANGING_ENTRY = { edge: pt([x0 - 0.02, PAV_DOOR_Z]), inside: pt([x0 + 0.6, PAV_DOOR_Z]) };
export function changingPlan(gender) {
  const woman = gender === 'woman',
    left = woman ? split + 0.12 : lobbyX + 0.12,
    right = woman ? x1 - 0.15 : split - 0.12;
  const doorX = woman ? WOMEN_X : MEN_X,
    roomDoor = (left + right) / 2;
  const benchX = woman ? right - 1.2 : left + 1.2;
  const room = [left, right, corridorZ + 0.12, z1 - 0.12];
  return {
    bounds: rect([x0, x1, z0, z1]),
    walks: [
      [x0 - 0.25, lobbyX, z0 + 0.12, z1 - 0.15],
      [x0 + 0.12, x1 - 0.15, z0 + 0.12, corridorZ - 0.05],
      room,
      [roomDoor - 0.65, roomDoor + 0.65, corridorZ - 0.2, corridorZ + 0.25],
      [doorX - 0.58, doorX + 0.58, z1 - 0.2, z1 + 2.1],
    ].map(rect),
    blocks: [
      rect([benchX - 0.2, benchX + 0.2, z1 - 2.6, z1 - 1.3]),
      rect([left + 0.15, roomDoor - 0.8, corridorZ + 0.12, corridorZ + 0.72]),
      rect([roomDoor + 0.8, right - 0.15, corridorZ + 0.12, corridorZ + 0.72]),
    ],
    corridor: pt([roomDoor, z0 + 0.95]),
    locker: pt([roomDoor, corridorZ + 1.0]),
    shower: pt([woman ? left + 0.8 : right - 0.8, z1 - 0.7]),
    deck: pt([doorX, DOOR_Z + 1.9]),
    seat: { at: pt([benchX, z1 - 1.95]), top: 0.34, ry: woman ? -Math.PI / 2 : Math.PI / 2 },
  };
}
function wall(p, a, b, h = 0.65) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1];
  p.box('#d9ddd8', Math.abs(dx) || 0.14, h, Math.abs(dz) || 0.14, (a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2, {
    surf: 'concrete',
  });
}
export function buildChangingRoom(p, pv, signs, lights) {
  pv.field([x0, x1, z0, z1], {
    pattern: 'grid',
    module: [0.45, 0.45],
    tones: ['#c4d0cc', '#bdcbc8', '#d0d9d5'],
    origin: [x0, z0],
  });
  // Back wall full height; low viewer-facing walls show the floor and door gaps honestly.
  wall(p, [x0, z0], [x1, z0], 2.7);
  wall(p, [x1, z0], [x1, z1], 2.7);
  wall(p, [x0, z0], [x0, PAV_DOOR_Z - 0.65]);
  wall(p, [x0, PAV_DOOR_Z + 0.65], [x0, z1]);
  wall(p, [lobbyX, corridorZ], [lobbyX, z1]);
  wall(p, [split, corridorZ], [split, z1]);
  for (const gender of ['man', 'woman']) {
    const f = changingPlan(gender),
      woman = gender === 'woman',
      left = woman ? split + 0.12 : lobbyX + 0.12,
      right = woman ? x1 - 0.15 : split - 0.12,
      doorX = woman ? WOMEN_X : MEN_X,
      roomDoor = (left + right) / 2;
    wall(p, [left, corridorZ], [roomDoor - 0.6, corridorZ]);
    wall(p, [roomDoor + 0.6, corridorZ], [right, corridorZ]);
    wall(p, [left, z1], [doorX - 0.6, z1]);
    wall(p, [doorX + 0.6, z1], [right, z1]);
    // Numbered lockers, a slatted bench, and a tiled rinse area on the way to the deck.
    let n = 1;
    for (let x = left + 0.38; x < right - 0.3; x += 0.55) {
      if (Math.abs(x - roomDoor) < 0.85) continue;
      p.box(woman ? '#819496' : '#7e929f', 0.5, 1.65, 0.48, x, 0, corridorZ + 0.32);
      p.box('#dce3df', 0.46, 0.035, 0.02, x, 0.82, corridorZ + 0.57);
      p.box(STEEL.dark, 0.025, 0.11, 0.035, x + 0.15, 0.72, corridorZ + 0.59);
      signs.card(String(n++), '', 0.13, 0.13, [x, 1.35, corridorZ + 0.59], 0);
    }
    const [bx, bz] = f.seat.at;
    const offset = pt([0, 0]);
    bench(p, bx - offset[0], bz - offset[1], f.seat.ry, { len: 1.3 });
    const showerX = woman ? left + 0.45 : right - 0.45;
    pv.field([showerX - 0.42, showerX + 0.42, z1 - 1.7, z1 - 0.15], {
      pattern: 'grid',
      module: [0.22, 0.22],
      tones: ['#91b3b5', '#9ababe'],
      origin: [x0, z0],
    });
    p.box(STEEL.mid, 0.045, 1.9, 0.045, showerX, 0, z1 - 1.45);
    p.box(STEEL.pale, 0.18, 0.045, 0.28, showerX, 1.9, z1 - 1.32);
    p.box('#63777b', 0.22, 0.009, 0.22, showerX, 0.011, z1 - 0.65);
    for (let k = 0; k < 5; k++) p.box('#a4b4b5', 0.17, 0.01, 0.009, showerX, 0.02, z1 - 0.71 + k * 0.03);
    p.box(woman ? '#a36b72' : '#527894', 0.28, 0.28, 0.04, doorX + 0.72, 0.9, z1 + 0.075);
    signs.card(
      woman ? '更衣室 女' : '更衣室 男',
      woman ? 'WOMEN' : 'MEN',
      1.3,
      0.32,
      [roomDoor, 1.9, corridorZ + 0.04],
      0,
    );
    lights.glowParts.push(new THREE.BoxGeometry(1.1, 0.07, 0.08).translate(roomDoor, 2.35, z0 + 0.12));
    lights.lit.push([roomDoor, z1 - 2.3, 2.3]);
  }
}
