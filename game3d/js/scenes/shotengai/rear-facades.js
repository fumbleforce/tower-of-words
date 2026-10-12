// Service-side variant of the shop facade kit. Back doors, kitchen windows and
// upstairs rooms share the front's framed glazing; hardware is fixed to the wall.
import * as THREE from 'three';
import { shopWindow } from './facades.js';

export const REAR_DOOR_OFFSET = -1.03;

const FRAME = '#46545e',
  SILL = '#b3b7b8';
export function rearFacade(p, panes, box, { u, back, n, floorH, storeys, bay }) {
  const put = (color, w, h, d, x, y, z, surf = 'metal') => p.box(color, w, h, d, u + x, y, back + n * z, { surf });
  // Two upstairs rooms per bay. Their proportions and joinery match the fronts.
  for (let s = 1; s < storeys; s++)
    for (const x of [-1.02, 1.02]) {
      const y = floorH * (s + 0.28),
        h = floorH * 0.45;
      panes.push(box(1.2, h, 0.05, u + x, y, back));
      shopWindow(p, u + x, y, back, 1.2, h, { n });
    }
  // A painted steel service door set within a dark reveal, with a panel,
  // threshold and lever; the small hood is physically supported off the frame.
  const door = REAR_DOOR_OFFSET,
    doorH = floorH * 0.8;
  put(FRAME, 0.98, doorH + 0.08, 0.07, door, 0.035, 0.02);
  put(bay % 3 === 0 ? '#617d78' : '#71818b', 0.82, doorH - 0.08, 0.035, door, 0.08, 0.075);
  put(FRAME, 0.64, 0.035, 0.025, door, 0.43, 0.103);
  put(SILL, 0.11, 0.18, 0.035, door + 0.27, 0.88, 0.103);
  put(FRAME, 0.18, 0.035, 0.06, door + 0.23, 0.98, 0.137);
  put(SILL, 1.07, 0.07, 0.22, door, 0, 0.08, 'stone');
  put('#697780', 1.22, 0.07, 0.46, door, doorH + 0.18, 0.2);
  for (const x of [-0.4, 0.4]) put(FRAME, 0.04, 0.18, 0.28, door + x, doorH + 0.02, 0.12);
  // Kitchen glazing sits above the worktop, distinct from the full-height door.
  const wy = 1.24,
    wh = Math.min(0.65, floorH * 0.3);
  panes.push(box(1.18, wh, 0.05, u + 0.95, wy, back));
  shopWindow(p, u + 0.95, wy, back, 1.18, wh, { n });
  // Wall-mounted condenser below the window: feet/brackets, fan grille and
  // supply conduit make its purpose readable without filling the footpath.
  put('#a3a9b0', 0.83, 0.54, 0.28, 0.95, 0.3, 0.16);
  for (const x of [0.67, 1.23]) {
    put(FRAME, 0.06, 0.11, 0.32, x, 0.2, 0.16);
    put(FRAME, 0.06, 0.35, 0.04, x, 0.2, 0.025);
  }
  p.geo(
    FRAME,
    new THREE.CylinderGeometry(0.19, 0.19, 0.018, 12).rotateX(Math.PI / 2).translate(u + 0.82, 0.58, back + n * 0.31),
    { surf: 'metal' },
  );
  for (let y = 0.42; y < 0.79; y += 0.075) put(SILL, 0.71, 0.018, 0.025, 0.95, y, 0.325);
  put('#697780', 0.055, 0.94, 0.07, 1.45, 0.3, 0.075);
}
