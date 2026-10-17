// The clothes and alterations shop's side door off the middle alley, and the workroom behind it (island-south.js
// SIDE_DOOR; the room is carved out of the shop's mass by plaza-buildings.js shopStreet). In the island frame.
//   the door: the kit's service door (kit/building/door.js) in the end wall, a wall lantern beside it, a small plate
//   on the wall; shut by default. Open: the leaf swung out on its hinge toward the promenade, held there by a stack
//   of parcels from the evening's delivery, another across the doorway, the loaded hand truck past the leaf, light
//   from the room on the landing
//   the room: a workroom lit from a ceiling fitting, seen only through the doorway: a cutting table with cloth and a
//   pattern on it, a dress form with a jacket being fitted, a rail of finished alterations in clear covers along the
//   far wall and one of garments along the north wall, shelves of cloth, a sewing table by the door, a pegboard of
//   tools, a clock, the back window; scenery, not walked into (kit/interior/workroom.js)
//
//   const t = tailorSteps(group, signs)   group: island-aligned; signs: the place's signSet (the plate goes in it)
//   t.set(open)                            shut or open the door, with what comes with it
//   t.blocks                               island rects [x0, z0, x1, z1] that only an open door's things stand on
//   t.glows                                for the place's light rig: the lantern, the room's light, the spill
import * as THREE from 'three';
import { Parts } from '../outdoor/parts.js';
import { doorway, delivery, garmentRail, dressForm, workTable, fabricShelf, buildKit } from '../../kit/index.js';
import { pools, lightPool } from '../../kit/core/pool.js';
import { STEEL } from '../../kit/core/palette.js';
import { SIDE_DOOR as D } from '../island-south.js';

const OPEN = (75 * Math.PI) / 180; // how far the delivery holds the leaf open
const EAST = Math.PI / 2; // the door looks east, across the alley
const WALL = D.x - 0.03; // the end wall's face (the shop's mass stops 3 cm inside its line)
const [RX0, RZ0, RX1, RZ1] = D.room,
  CEIL = D.ceiling;
const C = {
  floor: '#8f8c84',
  seam: '#817e77',
  wall: '#d8cfc0',
  ceiling: '#e3ded4',
  skirting: '#6f747b',
  board: '#c9b48f',
};
// how much of its own colour the room gives back as light (day, night): its fitting is on whenever the door is open
const ROOM = [0.24, 0.42],
  SPILL = [0.14, 0.24]; // and what the doorway's light gives the leaf and the delivery outside it

// The room's light: each surface's own colour added back, warmed (as station-model.js's bounce), so the lit room
// reads from the alley when the sun's shadow and the dusk would leave it dark
function roomLit(material, uniform) {
  const m = material.clone();
  m.onBeforeCompile = (s) => {
    s.uniforms.uRoom = uniform;
    s.fragmentShader =
      'uniform float uRoom;\n' +
      s.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * uRoom * vec3(1.0, 0.9, 0.74);',
      );
  };
  m.customProgramCacheKey = () => 'tailor-room';
  return m;
}

// the room's lining, a hair inside the carved faces, and what is fixed to its walls
function lining(p, signs) {
  const box = (c, x0, x1, y0, y1, z0, z1, o) =>
    p.box(c, x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, y0, (z0 + z1) / 2, o);
  const t = 0.02,
    [dz0, dz1] = [D.z - D.w / 2, D.z + D.w / 2];
  box(C.floor, RX0, RX1, 0, 0.03, RZ0, RZ1, { surf: 'vinyl', cast: false });
  for (let x = RX0 + 0.6; x < RX1; x += 0.6) box(C.seam, x - 0.004, x + 0.004, 0.03, 0.032, RZ0, RZ1, { cast: false });
  box(C.ceiling, RX0, RX1, CEIL - t, CEIL - 0.005, RZ0, RZ1, { cast: false });
  box(C.wall, RX0, RX0 + t, 0, CEIL, RZ0, RZ1, { surf: 'plaster' });
  box(C.wall, RX0, RX1, 0, CEIL, RZ0, RZ0 + t, { surf: 'plaster' });
  box(C.wall, RX0, RX1, 0, CEIL, RZ1 - t, RZ1, { surf: 'plaster' });
  // the door's wall, round the doorway, and the reveal's sides
  box(C.wall, RX1 - t, RX1, 0, CEIL, RZ0, dz0, { surf: 'plaster' });
  box(C.wall, RX1 - t, RX1, 0, CEIL, dz1, RZ1, { surf: 'plaster' });
  box(C.wall, RX1 - t, RX1, D.h, CEIL, dz0, dz1, { surf: 'plaster' });
  for (const z of [dz0, dz1 - t]) box(C.wall, RX1, WALL - 0.01, 0, D.h, z, z + t, { surf: 'plaster' });
  box(C.wall, RX1, WALL - 0.01, D.h - t, D.h, dz0, dz1, { surf: 'plaster' });
  // skirting round the floor
  for (const [x0, x1, z0, z1] of [
    [RX0 + t, RX0 + t + 0.015, RZ0, RZ1],
    [RX0, RX1, RZ0 + t, RZ0 + t + 0.015],
    [RX0, RX1, RZ1 - t - 0.015, RZ1 - t],
    [RX1 - t - 0.015, RX1 - t, RZ0, dz0],
    [RX1 - t - 0.015, RX1 - t, dz1, RZ1],
  ])
    box(C.skirting, x0, x1, 0.03, 0.08, z0, z1, { cast: false });
  // the back window (the kitchen glazing the promenade sees, rear-facades.js) from inside: its frame, the dusk in it
  const wx = -3 + 4.5 * 5.5 + 0.95; // bay 5's middle, the glazing's offset
  box('#46545e', wx - 0.62, wx + 0.62, 1.2, 1.93, RZ1 - t - 0.03, RZ1 - t, { surf: 'metal' });
  box('#5c6f80', wx - 0.56, wx + 0.56, 1.25, 1.88, RZ1 - t - 0.035, RZ1 - t - 0.01, { cast: false });
  box('#b3b7b8', wx - 0.66, wx + 0.66, 1.17, 1.21, RZ1 - t - 0.1, RZ1 - t, { surf: 'stone' });
  // a fitting mirror on the back wall by the door, in a pale frame
  box('#c9c4b8', 23.4, 23.8, 0.12, 1.5, RZ1 - t - 0.025, RZ1 - t, { surf: 'timber' });
  box('#9fb4c0', 23.44, 23.76, 0.16, 1.46, RZ1 - t - 0.03, RZ1 - t - 0.02, { cast: false });
  // the far wall: a pegboard of tools over the cutting table, a clock over the shelves
  const fx = RX0 + t;
  box(C.board, fx, fx + 0.015, 0.9, 1.45, 24.5, 25.4, { surf: 'timber' });
  for (const [z, y, h, c] of [
    [24.62, 1.05, 0.32, '#3a3e44'], // shears
    [24.75, 1.1, 0.28, '#b9bdc2'], // a set square
    [24.95, 0.98, 0.4, '#b9bdc2'], // the long rule
    [25.1, 1.12, 0.22, '#d8b84a'], // a tape measure
    [25.25, 1.08, 0.26, '#7a4a52'], // a pin roll
  ])
    box(c, fx + 0.015, fx + 0.03, y, y + h, z - 0.03, z + 0.03, { cast: false });
  signs.drawn(clock, 0.2, 0.2, [fx + 0.012, 1.64, 25.95], EAST); // over the shelves, straight through the door
  // the order slips pinned on a board on the back wall, west of the window, a ticket on each
  box(C.board, 21.25, 21.95, 1.0, 1.4, RZ1 - t - 0.015, RZ1 - t, { surf: 'timber' });
  for (let i = 0; i < 5; i++) {
    const x = 21.32 + i * 0.13,
      y = 1.12 + (i % 2) * 0.1;
    box('#f1efe8', x, x + 0.1, y, y + 0.14, RZ1 - t - 0.02, RZ1 - t - 0.015, { cast: false });
  }
}

function clock(ctx, W, H) {
  const r = W / 2 - 2;
  ctx.fillStyle = '#f4f2ec';
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#3e434d';
  ctx.stroke();
  ctx.fillStyle = '#3e434d';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.fillRect(W / 2 + Math.sin(a) * r * 0.82 - 1.5, H / 2 - Math.cos(a) * r * 0.82 - 1.5, 3, 3);
  }
  // twenty to seven
  for (const [a, l, w] of [
    [(6.67 / 12) * Math.PI * 2, 0.5, 4],
    [(40 / 60) * Math.PI * 2, 0.75, 2.5],
  ]) {
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(W / 2, H / 2);
    ctx.lineTo(W / 2 + Math.sin(a) * r * l, H / 2 - Math.cos(a) * r * l);
    ctx.stroke();
  }
}

// the room's furniture (kit pieces), placed to be seen through the doorway: the far wall straight ahead, the dress
// form just inside on the left, the table across the middle
function furnish(p) {
  workTable(p, { at: [22.3, 25.22], face: EAST, variant: 'cutting' });
  dressForm(p, { at: [23.2, 25.95], face: EAST, variant: 'pinned' });
  garmentRail(p, { at: [RX0 + 0.24, 24.75], face: EAST, variant: 'covered' });
  fabricShelf(p, { at: [RX0 + 0.16, 25.95], face: EAST, variant: 'bolts' });
  garmentRail(p, { at: [22.2, RZ0 + 0.26], face: 0, variant: 'garments' });
  workTable(p, { at: [23.3, RZ0 + 0.22], face: 0, variant: 'sewing' });
  // a stool at the sewing table, a basket of offcuts under the cutting table's end
  p.box(STEEL.dark, 0.03, 0.4, 0.03, 23.3, 0.03, RZ0 + 0.62);
  p.geo('#4d5f73', new THREE.CylinderGeometry(0.12, 0.12, 0.04, 12).translate(23.3, 0.45, RZ0 + 0.62));
  p.geo('#8f7a62', new THREE.CylinderGeometry(0.15, 0.12, 0.2, 10).translate(22.3, 0.13, 25.72));
  p.box('#c9c2b2', 0.2, 0.05, 0.16, 22.3, 0.2, 25.72, { ry: 0.4 });
}

export function tailorSteps(group, signs) {
  const at = [WALL, D.z];
  // the frame, the lantern, the hood and the step: always there
  const frame = new Parts();
  doorway(frame, { at, face: EAST, variant: 'service', hole: true, part: 'frame' });
  const fixed = buildKit(frame, group, { poolY: 0.03 });
  // its lantern is off by day (the rig turns it up after work from this)
  for (const m of fixed.meshes) if (m.name === 'kit:lamps') m.material.emissiveIntensity = 0.04;
  // the plate on the wall beside the door, under the lantern (clear of the leaf when it stands open)
  signs.board('ようふく', 'DELIVERIES', '#7a4f56', 0.44, 0.22, [WALL + 0.012, 1.08, D.z - D.w / 2 - 0.38], EAST);

  // the leaf, shut and open, each built once
  const leaf = (open) => {
    const g = new THREE.Group(),
      p = new Parts();
    g.name = open ? 'tailor:open' : 'tailor:shut';
    doorway(p, { at, face: EAST, variant: 'service', hole: true, part: 'leaf', open });
    buildKit(p, g);
    group.add(g);
    return g;
  };
  const shut = leaf(0),
    open = leaf(OPEN);
  // what comes with an open door: the delivery holding it, the room's light on the landing
  const load = new Parts();
  // (the stack against the leaf, a low parcel with a bolt of cloth across the rest of the doorway, so the room shows
  // over them; the hand truck parked past the leaf)
  delivery(load, { at: [WALL + 0.62, D.z + 0.06], face: EAST, variant: 'stack' });
  delivery(load, { at: [WALL + 0.42, D.z - 0.36], face: EAST, variant: 'roll' });
  delivery(load, { at: [WALL + 0.86, D.z + 0.36], face: Math.PI * 0.75, variant: 'trolley' }); // its wheels to the alley
  // (what stands in the doorway's light: the open leaf and the delivery take a share of the room's light at night)
  const uSpill = { value: SPILL[0] };
  load.build(open);
  open.traverse(
    (m) => m.isMesh && m.material.vertexColors && !m.material.transparent && (m.material = roomLit(m.material, uSpill)),
  );
  // (one pool on the landing, one on the step's top, which would hide the first where it starts)
  const spill = pools([[WALL + 0.8, D.z, 1]], 1.2, { k: 0.12, color: '#ffe2b8' }),
    sill = pools([[WALL + 0.17, D.z, 1]], 0.45, { k: 0.2, color: '#ffe2b8', y: 0.085 });
  spill.name = 'tailor:spill';
  sill.name = 'tailor:spill';
  // the lantern's light washing the wall round it after work
  const wash = lightPool(WALL + 0.012, D.z - D.w / 2 - 0.38, 0.85, { k: 0.3, color: '#ffd9a0', y: 0 });
  wash.rotation.set(0, EAST, 0);
  wash.position.set(WALL + 0.012, D.h + 0.05, D.z - D.w / 2 - 0.38);
  wash.name = 'tailor:wash';
  wash.visible = false;
  group.add(wash);
  open.add(spill, sill);
  open.traverse((m) => m.isMesh && (m.name ||= 'tailor:open'));
  shut.traverse((m) => m.isMesh && (m.name ||= 'tailor:shut'));

  // the room, lit by its own fitting
  const room = new THREE.Group(),
    p = new Parts(),
    uRoom = { value: ROOM[0] };
  room.name = 'tailor:room';
  lining(p, signs);
  furnish(p);
  // the ceiling fitting: a white housing, the tube under it lit
  p.box('#e9e9e4', 0.95, 0.05, 0.16, (RX0 + RX1) / 2, CEIL - 0.07, (RZ0 + RZ1) / 2);
  p.box('#fffaf0', 0.88, 0.025, 0.06, (RX0 + RX1) / 2, CEIL - 0.095, (RZ0 + RZ1) / 2, {
    cast: false,
    opts: { emissive: '#fff6e6', emissiveIntensity: 1.4 },
  });
  for (const m of p.build(room)) {
    m.material = roomLit(m.material, uRoom);
    m.name = 'tailor:room';
  }
  group.add(room);

  let isOpen = false;
  const set = (o) => {
    isOpen = !!o;
    shut.visible = !isOpen;
    open.visible = isOpen;
  };
  set(false);
  let night = false;
  const glows = [
    ...fixed.glows,
    {
      set(n) {
        night = n;
        uRoom.value = ROOM[n ? 1 : 0];
        spill.userData.set(n ? 0.42 : 0.12);
        sill.userData.set(n ? 0.5 : 0.2);
        uSpill.value = SPILL[n ? 1 : 0];
        wash.visible = n;
      },
    },
  ];
  return {
    set,
    get open() {
      return isOpen;
    },
    get night() {
      return night;
    },
    // the landing in front of the doorway, which the delivery, the leaf and the parcels fill while it is open
    blocks: [[WALL + 0.03, D.landing[1], D.x + 1.05, D.landing[3]]],
    glows,
  };
}
