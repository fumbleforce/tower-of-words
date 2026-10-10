// The dorm's entrance hall, in front of Eric's block on the dorm court (scenes/dorm-court.js): the glass front cut
// low with its doors open, a doormat, the side and back walls full height; on the back wall the bank of 24
// mailboxes (2F to 5F, their numbers on them, 203 with Eric's name on tape and a flap that opens), the manager's
// window beside the passage, the notice board right of it; the passage to the stairs, and the roof behind the hall
// under the 2F corridor. Eric walks in; the passage's mouth starts the trip up (places/dorm-court.js).
import * as THREE from 'three';
import { PAL, rbox, wall, tileFloor, textTexture, plane, JP_FONT } from '../../props.js';
import { lightPool } from '../../places/life.js';
import { boxes, openDoor } from '../forecourt/details.js';
import { Parts } from '../outdoor/parts.js';
import { hallRoof } from './frontages.js';
import { BLOCK } from './block.js';
import { MC } from '../../mc.js';
import { HALL, FRONT_Z, BACK_Z, DOOR_X, PASS_X, BLOCK_Z, WEST, EAST, MAIL_X, MANAGER, POOL_Y } from './plan.js';

// the mailbox bank: 6 across, 4 up (2F at the bottom), its doors' size and pitch; 203 is the bottom row's third
const MB = { w: 0.2, h: 0.17, dx: 0.245, dy: 0.205, y0: 0.37, x0: MAIL_X - 0.62, z: BACK_Z + 0.315 };
const MB203 = [MB.x0 + 2 * MB.dx, MB.y0];

// the bank's numbers: 5F at the top down to 2F, 01 to 07 without 04, each at its door's top left. Only the writing,
// on a clear plane over the doors; 203's is on its own flap (mailbox203)
function mailNumbers() {
  const tex = textTexture(
    (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const cw = w / 6,
        rh = h / 4;
      g.textBaseline = 'top';
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 6; c++) {
          const n = `${5 - r}0${[1, 2, 3, 5, 6, 7][c]}`,
            x = c * cw + cw * 0.1,
            y = r * rh + rh * 0.12;
          if (n === '203') continue;
          g.fillStyle = '#3b4048';
          g.font = `700 ${Math.round(rh * 0.3)}px sans-serif`;
          g.fillText(n, x, y);
        }
    },
    768,
    432,
  );
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(6 * 0.245, 4 * 0.205),
    new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.35, roughness: 0.6 }),
  );
  return m;
}

// mailbox 203: its flap with the number, hinged on the left, and under it on the bank a strip of tape with Eric's
// name, so the tape and what's inside show together when the flap is open; the dark inside behind the flap, and a
// folded bakery flyer in there (the `mailbox203` hook, places/dorm-court.js)
function mailbox203(root) {
  const [x, y] = MB203,
    { w, h, z } = MB;
  const face = textTexture(
    (g, cw, ch) => {
      g.fillStyle = '#b4b9bf';
      g.fillRect(0, 0, cw, ch);
      g.fillStyle = '#3b4048';
      g.textBaseline = 'top';
      g.font = `700 ${Math.round(ch * 0.3)}px sans-serif`;
      g.fillText('203', cw * 0.1, ch * 0.12);
      g.fillStyle = '#2f343c';
      g.fillRect(cw * 0.3, ch * 0.62, cw * 0.4, ch * 0.09);
    },
    256,
    218,
  );
  const flap = new THREE.Group();
  flap.name = 'evening:mailbox-flap'; // stable names for QA (the evening discoveries' checks)
  flap.position.set(x - w / 2, y, z + 0.01);
  // two draws, not six: the box's faces in the order +x -x +y -y -z +z, so the five plain ones are one group
  const box = new THREE.BoxGeometry(w, h, 0.012),
    idx = Array.from(box.index.array);
  box.setIndex([...idx.slice(0, 24), ...idx.slice(30, 36), ...idx.slice(24, 30)]);
  box.clearGroups();
  box.addGroup(0, 30, 0);
  box.addGroup(30, 6, 1);
  const leaf = new THREE.Mesh(box, [
    new THREE.MeshStandardMaterial({ color: '#a9aeb4', roughness: 0.6 }),
    new THREE.MeshStandardMaterial({ map: face, roughness: 0.55 }),
  ]);
  leaf.position.set(w / 2, h / 2, 0);
  flap.add(leaf);
  root.add(flap);
  const tape = plane(
    w + 0.02,
    0.055,
    textTexture(
      (g, cw, ch) => {
        g.fillStyle = '#f1efe6';
        g.fillRect(0, 0, cw, ch);
        g.fillStyle = '#2a2e35';
        g.textBaseline = 'middle';
        g.font = `500 ${Math.round(ch * 0.62)}px ${JP_FONT}`;
        g.fillText(MC.name_jp, cw * 0.05, ch * 0.54, cw * 0.56);
        g.font = `600 ${Math.round(ch * 0.5)}px sans-serif`;
        g.fillText(MC.name.toUpperCase(), cw * 0.66, ch * 0.54, cw * 0.3);
      },
      256,
      64,
    ),
  );
  tape.position.set(x, y - 0.034, z - 0.002);
  tape.rotation.z = -0.02;
  root.add(tape);
  // the inside: dark, the flyer standing folded in it
  root.add(boxes([[w - 0.01, h - 0.01, 0.004, x, y + 0.005, z - 0.004]], '#23272e'));
  const flyer = plane(
    0.16,
    0.13,
    textTexture(
      (g, cw, ch) => {
        g.fillStyle = '#efe4c8';
        g.fillRect(0, 0, cw, ch);
        g.fillStyle = '#c98a4a';
        g.beginPath();
        g.ellipse(cw * 0.26, ch * 0.5, cw * 0.17, ch * 0.24, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#8a5a2e';
        for (const k of [-1, 0, 1]) g.fillRect(cw * (0.24 + k * 0.07), ch * 0.36, cw * 0.02, ch * 0.28);
        g.fillStyle = '#5a3a22';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = `700 ${Math.round(ch * 0.4)}px ${JP_FONT}`;
        g.fillText('パン', cw * 0.7, ch * 0.4);
        g.font = `700 ${Math.round(ch * 0.2)}px sans-serif`;
        g.fillText('BAKERY', cw * 0.7, ch * 0.74);
      },
      256,
      205,
    ),
  );
  flyer.position.set(x - 0.003, y + h / 2 + 0.005, z - 0.0005);
  flyer.rotation.z = 0.06;
  flyer.visible = false;
  flyer.name = 'evening:mailbox-flyer';
  root.add(flyer);
  return { flap, flyer, at: [x, z], y: y + h / 2 };
}

// the manager's room's window beside the passage: a sliding pane with a ledge, the curtain drawn and the light off
// for the night, its plate above (管理人室 MANAGER)
function managerWindow(root) {
  const [a, b] = MANAGER,
    y0 = 0.75,
    y1 = 1.35,
    c = (a + b) / 2,
    z = BACK_Z + 0.09;
  const folds = [];
  for (let i = 0; i < 6; i++)
    folds.push([(b - a) / 6 + 0.01, y1 - y0, 0.03, a + (b - a) * ((i + 0.5) / 6), y0, BACK_Z - 0.03 + (i % 2) * 0.02]);
  root.add(
    boxes(
      folds.filter((_, i) => i % 2),
      '#6b7584',
    ),
  );
  root.add(
    boxes(
      folds.filter((_, i) => !(i % 2)),
      '#737d8c',
    ),
  );
  root.add(
    boxes(
      [
        [b - a + 0.08, 0.04, 0.06, c, y0 - 0.04, z],
        [b - a + 0.08, 0.04, 0.06, c, y1, z],
        [0.04, y1 - y0, 0.06, a - 0.02, y0, z],
        [0.04, y1 - y0, 0.06, b + 0.02, y0, z],
        [0.03, y1 - y0, 0.05, c + 0.02, y0, z + 0.01],
      ],
      '#5d636c',
    ),
  );
  root.add(rbox(b - a + 0.12, 0.04, 0.16, '#a9adb3', { x: c, y: y0 - 0.06, z: z + 0.07, r: 0.01, cast: false }));
  const plate = plane(
    0.5,
    0.13,
    textTexture(
      (g, w, h) => {
        g.fillStyle = '#e4e3de';
        g.fillRect(0, 0, w, h);
        g.fillStyle = '#2f343c';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = `700 ${h * 0.46}px ${JP_FONT}`;
        g.fillText('管理人室', w * 0.33, h * 0.52);
        g.font = `600 ${h * 0.3}px sans-serif`;
        g.fillText('MANAGER', w * 0.79, h * 0.54);
      },
      512,
      132,
    ),
  );
  plate.position.set(c, y1 + 0.16, z + 0.005);
  root.add(plate);
}

// the entrance hall: cut-low glass front with open doors, side and back walls full height, the mailboxes, the
// manager's window, the notice board and the passage at the back to the stairs. Eric walks in; the passage's mouth
// starts the trip up (places/dorm-court.js)
export function hall(root, nav) {
  const [x0, x1] = HALL;
  // 2 mm over the court's paving bed, which runs in under its front edge (and under the 4 mm door track)
  root.add(tileFloor(x0, x1, BACK_Z, FRONT_Z, 0.6, { color: '#9c9aa0', seam: '#8d8b91', seamW: 0.015, y: 0.002 }));
  const opts = { color: '#7f848c', top: '#a6abb2' };
  root.add(
    wall('x', x0 - 0.09, x1 + 0.09, FRONT_Z, 0.5, 0.18, { ...opts, holes: [[DOOR_X - 0.85, DOOR_X + 0.85, 0, 1]] }),
  );
  const door = openDoor();
  door.position.set(DOOR_X, 0, FRONT_Z);
  door.scale.y = 0.29;
  root.add(door);
  // the doormat just inside
  root.add(rbox(1.0, 0.012, 0.5, '#4f555e', { x: DOOR_X, y: 0.004, z: FRONT_Z - 0.4, r: 0.004, cast: false }));
  for (const x of [x0, x1]) root.add(wall('z', BACK_Z - 0.09, FRONT_Z, x, 2.2, 0.18, opts));
  root.add(
    wall('x', x0 - 0.09, x1 + 0.09, BACK_Z, 2.2, 0.18, {
      ...opts,
      holes: [
        [MANAGER[0], MANAGER[1], 0.75, 1.35],
        [PASS_X - 0.45, PASS_X + 0.45, 0, 1.5],
      ],
    }),
  );
  // the passage beyond: a short corridor floor lit at its far end, where the block's ground floor begins
  root.add(
    tileFloor(PASS_X - 0.5, PASS_X + 0.5, BLOCK_Z, BACK_Z, 0.5, { color: '#7d8089', seam: '#71747c', seamW: 0.012 }),
  );
  root.add(
    boxes(
      [
        [0.1, 2.2, BACK_Z - BLOCK_Z, PASS_X - 0.55, 0, (BACK_Z + BLOCK_Z) / 2],
        [0.1, 2.2, BACK_Z - BLOCK_Z, PASS_X + 0.55, 0, (BACK_Z + BLOCK_Z) / 2],
        [1.2, 2.2, 0.1, PASS_X, 0, BLOCK_Z],
        // the manager's room behind the window: dark, so the window never shows the court through it
        [0.5, 1.0, 0.3, (MANAGER[0] + MANAGER[1]) / 2, 0.6, BACK_Z - 0.26],
      ],
      '#5d626c',
    ),
  );
  root.add(lightPool(PASS_X, BACK_Z - 0.7, 0.55, { k: 0.3 }));
  // the roof behind the hall, under the 2F corridor: flat, its parapet along the front, a unit and a vent on it
  const roof = new Parts();
  hallRoof(roof, { x0, x1, back: BLOCK_Z + BLOCK.corridor, front: BACK_Z + 0.09 });
  roof.build(root);
  // mailboxes: a grey steel bank of 24 small doors on the back wall, 2F to 5F, their numbers on them
  const mx = MAIL_X,
    parts = [];
  root.add(rbox(1.5, 0.9, 0.22, '#9a9fa6', { x: mx, y: 0.3, z: BACK_Z + 0.2, r: 0.015 }));
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 6; c++)
      if (r || c !== 2) parts.push([MB.w, MB.h, 0.02, MB.x0 + c * MB.dx, MB.y0 + r * MB.dy, MB.z]);
  root.add(boxes(parts, '#b4b9bf'));
  root.add(
    boxes(
      parts.map(([, , , x, y, z]) => [0.07, 0.015, 0.025, x + 0.04, y + 0.03, z + 0.005]),
      PAL.charcoal,
    ),
  );
  const nums = mailNumbers();
  nums.position.set(mx, 0.37 + (4 * 0.205 - 0.035) / 2, BACK_Z + 0.328);
  root.add(nums);
  nav.block(mx - 0.85, mx + 0.85, BACK_Z, BACK_Z + 0.45);
  const mailbox = mailbox203(root);
  managerWindow(root);
  nav.block(MANAGER[0] - 0.1, MANAGER[1] + 0.1, BACK_Z, BACK_Z + 0.25);
  // the notice board, right of the passage: narrow, between the passage's jamb and the side wall, clear of the opening
  const nx = x1 - 0.27;
  root.add(rbox(0.26, 0.5, 0.04, '#c9c6bd', { x: nx, y: 0.7, z: BACK_Z + 0.12, r: 0.01, cast: false }));
  root.add(
    boxes(
      [
        [0.1, 0.22, 0.01, nx - 0.06, 0.8, BACK_Z + 0.145],
        [0.1, 0.14, 0.01, nx + 0.06, 0.92, BACK_Z + 0.145],
        [0.09, 0.16, 0.01, nx + 0.06, 0.74, BACK_Z + 0.145],
      ],
      PAL.paper,
    ),
  );
  const light = new THREE.PointLight('#ffd8a8', 2.2, 3.8, 1.8);
  light.position.set((x0 + x1) / 2, 1.6, (FRONT_Z + BACK_Z) / 2);
  root.add(light);
  root.add(lightPool((x0 + x1) / 2, (FRONT_Z + BACK_Z) / 2, 1.2, { k: 0.26, sx: 1.4 }));
  root.add(lightPool(DOOR_X, FRONT_Z + 0.6, 0.8, { k: 0.2, y: POOL_Y }));
  // the hall and everything north of the court's back line, except the hall itself and its passage
  nav.block(WEST, x0 + 0.1, BACK_Z, FRONT_Z - 0.55);
  nav.block(x1 - 0.1, EAST, BACK_Z, FRONT_Z + 0.1);
  nav.block(x0, DOOR_X - 0.8, FRONT_Z - 0.1, FRONT_Z + 0.1);
  nav.block(DOOR_X + 0.8, x1, FRONT_Z - 0.1, FRONT_Z + 0.1);
  // the back wall and the passage: Eric only goes through it on the watched trip up (places/dorm-court.js), which
  // opens its tagged block so he waits for his floor on floor
  nav.block(WEST, PASS_X - 0.5, BACK_Z - 1.3, BACK_Z + 0.1);
  nav.block(PASS_X + 0.5, EAST, BACK_Z - 1.3, BACK_Z + 0.1);
  nav.blockTagged('passage', PASS_X - 0.5, PASS_X + 0.5, BACK_Z - 1.3, BACK_Z + 0.1);
  return mailbox;
}
