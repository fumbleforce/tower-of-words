// The station's own fittings in the security room, shared by the room (scenes/lobby.js) and its cut-away seen from
// the forecourt (scenes/station-hall.js), so walking out and looking back shows the same room. In the room's frame:
// x across, z toward the glass entrance, the exit in the back wall at z = -Z.
//   sign(text, sub)       the name board on the back wall (本社 STATION)
//   exitFrame(x, z)       the exit's dark frame and the pale floor plate through it (the room's back wall)
//   exitSign()            the yellow 出口 EXIT sign over the exit
//   fareMachines()        two ticket machines by the exit, the lit fare map over them in one steel surround
//   floorMarks(Z, BZ)     the yellow guide line from the entrance through the gate to the exit, and the exit arrow
//                         painted on the floor past the gate
import * as THREE from 'three';
import { rbox, textTexture, plane, JP_FONT } from '../props.js';
import { Parts } from './outdoor/parts.js';
import { paver } from './outdoor/paving.js';

export const EXIT_X = -1; // the exit's middle in the back wall
export const FARES = { x: -2.88, w: 0.86, d: 0.46 }; // the machines' surround: its middle, width and depth from the wall
const YELLOW = '#efc93c',
  INK = '#23262c';

export function exitFrame(x, z) {
  const g = new THREE.Group();
  for (const side of [-1, 1]) g.add(rbox(0.08, 1.44, 0.16, '#4c515b', { x: side * 0.64 }));
  g.add(rbox(1.36, 0.1, 0.16, '#4c515b', { y: 1.44 }));
  g.add(rbox(1.24, 0.016, 1.5, '#8a9397', { z: -0.65, cast: false }));
  g.position.set(x, 0, z);
  return g;
}

// the station's name board over the gate: the kanji large, the English beside them
export function sign(text, sub) {
  const tex = textTexture(
    (g, W, H) => {
      g.fillStyle = '#2a2f38';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#e9ecf0';
      g.font = '700 120px ' + JP_FONT;
      g.textBaseline = 'middle';
      g.fillText(text, 36, H / 2 + 4);
      g.fillStyle = '#9aa3b0';
      g.font = '600 46px ' + JP_FONT;
      g.fillText(sub, 300, H / 2 + 6);
    },
    640,
    180,
  );
  const grp = new THREE.Group();
  grp.add(plane(1.2, 0.34, tex, { emissiveK: 0.35 }));
  return grp;
}

// the Japanese station kind: black on yellow, the kanji large, an arrow toward the door
function exitTexture(arrow) {
  return textTexture(
    (c, w, h) => {
      c.fillStyle = YELLOW;
      c.fillRect(0, 0, w, h);
      c.fillStyle = INK;
      c.textBaseline = 'middle';
      c.font = '700 96px ' + JP_FONT;
      c.fillText('出口', arrow ? 120 : 40, h / 2 + 4);
      c.font = '700 56px sans-serif';
      c.fillText('EXIT', arrow ? 330 : 270, h / 2 + 6);
      if (arrow) {
        c.font = '700 110px sans-serif';
        c.fillText('↑', 30, h / 2 + 6);
      }
    },
    512,
    144,
  );
}
export function exitSign() {
  const s = plane(0.64, 0.18, exitTexture(false), { emissiveK: 0.45 });
  s.name = 'station:exitSign';
  return s;
}

// The fare map: the monorail's line across the island as a bar with its stops, fares under them, Honsha marked
function fareTexture() {
  return textTexture(
    (c, w, h) => {
      c.fillStyle = '#cfd3d2';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#2f5d8a';
      c.fillRect(0, 0, w, 58);
      c.fillStyle = '#ffffff';
      c.font = '700 36px sans-serif';
      c.textBaseline = 'middle';
      c.fillText('FARES', 24, 30);
      c.font = '600 26px sans-serif';
      c.fillText('Amakawa Monorail', 170, 31);
      const y = 150,
        stops = 7;
      c.fillStyle = '#3f8f6f';
      c.fillRect(40, y - 9, w - 80, 18);
      for (let i = 0; i < stops; i++) {
        const x = 40 + ((w - 80) * i) / (stops - 1);
        const here = i === 2;
        c.fillStyle = here ? '#d2463c' : '#ffffff';
        c.beginPath();
        c.arc(x, y, here ? 20 : 14, 0, Math.PI * 2);
        c.fill();
        c.lineWidth = 5;
        c.strokeStyle = here ? '#8f2a24' : '#3f8f6f';
        c.stroke();
        c.fillStyle = '#39404b';
        c.font = '600 26px sans-serif';
        c.textAlign = 'center';
        c.fillText(here ? 'HERE' : String(150 + Math.abs(i - 2) * 40), x, y + 52);
        c.fillStyle = '#9aa0a8';
        c.fillRect(x - 26, y - 62, 52, 12);
      }
      c.textAlign = 'left';
    },
    512,
    256,
  );
}
// the machines' fronts: a touch screen each, the coin and card slots, the ticket tray
function machineTexture() {
  return textTexture(
    (c, w, h) => {
      c.fillStyle = '#c4c8cc';
      c.fillRect(0, 0, w, h);
      for (const x0 of [0, w / 2]) {
        c.fillStyle = '#2f5d8a';
        c.fillRect(x0 + 14, 16, w / 2 - 28, 30);
        c.fillStyle = '#ffffff';
        c.font = '700 22px sans-serif';
        c.textBaseline = 'middle';
        c.fillText('TICKETS', x0 + 30, 32);
        c.fillStyle = '#1f2a36';
        c.fillRect(x0 + 18, 64, w / 2 - 36, 104);
        c.fillStyle = '#5c9fd6';
        for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) c.fillRect(x0 + 30 + k * 36, 76 + r * 30, 28, 22);
        c.fillStyle = '#6d737c';
        c.fillRect(x0 + 24, 196, 40, 10); // coins
        c.fillRect(x0 + 84, 196, 34, 10); // card
        c.fillStyle = '#454b54';
        c.fillRect(x0 + 22, 236, w / 2 - 44, 26); // the ticket tray
      }
      c.fillStyle = '#b3b8be';
      c.fillRect(w / 2 - 2, 0, 4, h);
    },
    256,
    288,
  );
}

// Returns the group, its back against z = 0 (the wall's inner face), centred on x = 0, facing +z
export function fareMachines() {
  const g = new THREE.Group();
  const p = new Parts();
  const { w, d } = FARES;
  p.box('#5b616b', w, 1.86, 0.08, 0, 0, 0.04); // the surround's back panel
  for (const s of [-1, 1]) p.box('#5b616b', 0.05, 1.86, d, (s * (w - 0.05)) / 2, 0, d / 2); // its cheeks
  p.box('#5b616b', w + 0.04, 0.06, 0.16, 0, 1.86, 0.08); // its cap
  for (const s of [-1, 1]) p.box('#c9ccd0', w / 2 - 0.07, 1.12, d - 0.1, (s * (w / 2 - 0.02)) / 2, 0, d / 2 - 0.02);
  p.box('#8a9099', w - 0.1, 0.03, 0.08, 0, 0.78, d - 0.02); // the ledge under the slots
  p.build(g);
  const front = plane(w - 0.12, 1.05, machineTexture(), { emissiveK: 0.06 });
  front.position.set(0, 0.56, d - 0.07 + 0.003);
  const map = plane(w - 0.14, 0.48, fareTexture(), { emissiveK: 0.14 });
  map.position.set(0, 1.5, 0.085);
  g.add(front, map);
  return g;
}

// The guide line and the exit arrow; y: the floor's top. Returns a group.
export function floorMarks(Z, BZ, { y = 0 } = {}) {
  const g = new THREE.Group();
  const pv = paver({ y });
  pv.tactile([
    [0, Z - 1.5],
    [0, BZ + 0.45],
  ]);
  pv.tactile([
    [0, BZ - 0.45],
    [0, -Z + 1.35],
    [EXIT_X, -Z + 1.35],
    [EXIT_X, -Z + 0.3],
  ]);
  pv.build(g);
  const arrow = plane(1.5, 0.42, exitTexture(true));
  arrow.rotation.x = -Math.PI / 2;
  arrow.position.set(EXIT_X - 1.05, y + 0.004, -Z + 2.3);
  arrow.material.transparent = false;
  g.add(arrow);
  return g;
}
