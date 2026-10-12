// The dorm courtyard's low roofs (scenes/dorm-court.js): the flat roofs over the coin laundry and the entrance
// hall's back, and the sento's tiled roof. All into a Parts collector (outdoor/parts.js), one mesh per colour group.
//   flatRoof(p, [x0, x1, z0, z1], y, { edges, units, vents })   a flat roof at height y: the slab, a parapet with a
//     pale coping on the named edges ('n', 's', 'w', 'e'), a drip line under the coping on the court side, the
//     membrane's lap seams, and the plant on it: air-conditioner units (their fans to the court) and vent cowls
//   tiledRoof(p, { x0, x1, zf, zb, eave, ridge, walls })   a gabled roof of grey kawara, its ridge along x: the two
//     slopes with their tile rolls, the round tile ends along both eaves, the ridge with its end tiles, the gable
//     walls and their bargeboards
//   slope(p, x0, x1, zEave, yEave, zRidge, yRidge)   one tiled slope on its own (a pent roof over a front)
import * as THREE from 'three';
import { copedParapet } from '../outdoor/block-style.js';
import { faces } from '../outdoor/block-face.js';

const SLAB = '#767b83',
  PARAPET = '#9da1a6',
  COPING = '#b8bbba',
  DRIP = '#4b5058',
  UNIT = '#c6c9c7',
  GRILLE = '#6f747b',
  VENT = '#8d9299';

export function flatRoof(p, [x0, x1, z0, z1], y, { edges = 's', units = [], vents = [], wall = PARAPET } = {}) {
  const cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2;
  p.box(SLAB, x1 - x0, 0.14, z1 - z0, cx, y - 0.136, cz, { surf: 'roof' }); // 4 mm proud of y: never level with the walls' tops under it
  const t = 0.1,
    h = 0.18;
  const side = {
    s: [x1 - x0, z1 - t / 2, true],
    n: [x1 - x0, z0 + t / 2, true],
    w: [z1 - z0, x0 + t / 2, false],
    e: [z1 - z0, x1 - t / 2, false],
  };
  for (const s of edges) {
    const [len, at, alongX] = side[s];
    if (alongX) {
      p.box(wall, len, h, t, cx, y, at);
      p.box(COPING, len + 0.04, 0.04, t + 0.06, cx, y + h, at);
    } else {
      p.box(wall, t, h, len, at, y, cz);
      p.box(COPING, t + 0.06, 0.04, len + 0.04, at, y + h, cz);
    }
  }
  // the drip line: a dark shadow gap under the coping along the court side
  if (edges.includes('s')) p.box(DRIP, x1 - x0 + 0.02, 0.03, 0.02, cx, y - 0.16, z1 + 0.005, { cast: false });
  for (const [x, z, turn = 0] of units) {
    p.box(UNIT, 0.72, 0.52, 0.32, x, y, z, { ry: turn });
    p.box(GRILLE, 0.36, 0.36, 0.02, x - 0.12, y + 0.08, z + 0.17, { cast: false });
  }
  for (const [x, z] of vents) {
    p.geo(VENT, new THREE.CylinderGeometry(0.07, 0.07, 0.34, 8).translate(x, y + 0.17, z));
    p.geo(VENT, new THREE.CylinderGeometry(0.15, 0.1, 0.08, 8).translate(x, y + 0.38, z));
  }
}

// Apartment roof finish: one membrane deck, coped outer edges and lap joints. A caller
// can omit the shared side of two wings so an L roof has no wall across its middle.
export function apartmentDeck(p, rect, y, { edges = 'nsew', wall = PARAPET, seams = true } = {}) {
  const [x0, x1, z0, z1] = rect;
  flatRoof(p, rect, y, { edges: '' });
  p.box('#7b7f7d', x1 - x0 - 0.2, 0.015, z1 - z0 - 0.2, (x0 + x1) / 2, y + 0.006, (z0 + z1) / 2);
  const F = faces(rect);
  for (const edge of edges) copedParapet(p, F[edge], y, wall);
  if (seams)
    for (let x = x0 + 1.6; x < x1 - 0.3; x += 1.6)
      p.box('#6b6e6c', 0.025, 0.004, z1 - z0 - 0.3, x, y + 0.022, (z0 + z1) / 2, { cast: false });
  for (const x of [x0 + 0.3, x1 - 0.3])
    p.box('#4b5658', 0.14, 0.008, 0.14, x, y + 0.023, z0 + 0.27, {
      cast: false,
    });
}

// Service furniture is grouped beside the stair head, leaving a clear roof route.
// Coordinates belong to the roof plan; different blocks can turn the arrangement.
export function apartmentServices(p, y, { stair, doorZ, tank, units = [], vents = [], wall = PARAPET, detail = true }) {
  if (stair) {
    const [x0, x1, z0, z1] = stair,
      h = 1.3,
      cx = (x0 + x1) / 2,
      cz = (z0 + z1) / 2,
      door = doorZ ?? z1 - 0.6;
    p.box(wall, x1 - x0, h, z1 - z0, cx, y, cz, { surf: 'plaster' });
    flatRoof(p, [x0 - 0.04, x1 + 0.04, z0 - 0.04, z1 + 0.04], y + h, {
      edges: 'nsew',
    });
    p.box('#454f5c', 0.035, 1.22, 0.66, x0 - 0.021, y, door);
    p.box('#a7afb7', 0.04, 0.035, 0.14, x0 - 0.05, y + 0.6, door + 0.2, {
      cast: false,
    });
    p.box('#dce4e7', 0.07, 0.08, 0.17, x0 - 0.05, y + 1.27, door, {
      cast: false,
    });
    p.box('#7f8a92', 0.3, 0.18, 0.3, cx + 0.2, y + h + 0.14, z0 + 0.4);
    p.box('#7f8a92', 0.03, 1.0, 0.03, x1 - 0.3, y + h + 0.14, z0 + 0.4, {
      cast: false,
    });
    if (detail)
      for (let i = 0; i < 4; i++)
        p.box('#7f8a92', 0.48 - i * 0.07, 0.018, 0.018, x1 - 0.3, y + h + 0.74 + i * 0.08, z0 + 0.4, { cast: false });
  }
  if (tank) {
    const [x, z] = tank;
    p.box('#667582', 1.1, 0.25, 0.9, x, y, z);
    p.box('#b9c3c8', 1.0, 0.8, 0.8, x, y + 0.25, z, { surf: 'plastic' });
    for (let i = 1; i < 4; i++)
      p.box('#929fa8', 1.01, 0.016, 0.81, x, y + 0.25 + i * 0.2, z, {
        cast: false,
      });
    p.box('#b9c3c8', 0.2, 0.06, 0.2, x + 0.2, y + 1.05, z, { cast: false });
    if (detail) {
      for (const dz of [-0.15, 0.15])
        p.box('#667582', 0.025, 1.04, 0.025, x + 0.53, y, z + dz, {
          cast: false,
        });
      for (let i = 0; i < 5; i++)
        p.box('#667582', 0.025, 0.025, 0.3, x + 0.53, y + 0.2 + i * 0.2, z, {
          cast: false,
        });
    }
  }
  for (const [x, z, turn = 0] of units) {
    p.box('#667582', 0.75, 0.06, 0.32, x, y, z, { ry: turn, cast: false });
    p.box(UNIT, 0.65, 0.44, 0.28, x, y + 0.06, z, { ry: turn });
    p.box(GRILLE, 0.38, 0.32, 0.018, x + Math.sin(turn) * 0.15, y + 0.12, z + Math.cos(turn) * 0.15, {
      ry: turn,
      cast: false,
    });
  }
  for (const [x, z] of vents) {
    p.box(VENT, 0.09, 0.3, 0.09, x, y, z);
    p.box('#a3adb5', 0.2, 0.06, 0.2, x, y + 0.3, z, { cast: false });
  }
}

const TILE = '#565d67',
  ROLL = '#646b75',
  RIDGE = '#3c4149',
  END = '#3a3f47',
  BARGE = '#4f5763';

// one slope from its eave (z at y) up to the ridge, its tiles in rolls down the fall; sgn +1 falls toward +z
export function slope(p, x0, x1, zEave, yEave, zRidge, yRidge) {
  const run = zEave - zRidge,
    rise = yRidge - yEave;
  const len = Math.hypot(run, rise),
    tilt = Math.atan2(rise, Math.abs(run)) * Math.sign(run);
  const zc = (zEave + zRidge) / 2,
    yc = (yEave + yRidge) / 2;
  const plane = (w, h, d, x, dy) => new THREE.BoxGeometry(w, h, d).rotateX(tilt).translate(x, yc + dy, zc);
  p.geo(TILE, plane(x1 - x0, 0.07, len, (x0 + x1) / 2, 0));
  // the rolls: a rounded ridge of tiles every 0.22 down the slope
  for (let x = x0 + 0.11; x < x1 - 0.05; x += 0.22)
    p.geo(ROLL, plane(0.08, 0.05, len - 0.04, x, 0.055), { cast: false });
  // the round tile ends along the eave
  p.geo(
    END,
    new THREE.CylinderGeometry(0.05, 0.05, x1 - x0, 6)
      .rotateZ(Math.PI / 2)
      .translate((x0 + x1) / 2, yEave + 0.02, zEave),
  );
}

export function tiledRoof(
  p,
  {
    x0,
    x1,
    zf,
    zb,
    eave,
    ridge,
    walls = [x0, x1],
    wallZ = [zb, zf],
    wallTop = eave,
    gableWall = '#c9c6bf',
    ends = [true, true],
  },
) {
  const zr = (zf + zb) / 2;
  slope(p, x0, x1, zf, eave, zr, ridge);
  slope(p, x0, x1, zb, eave, zr, ridge);
  // the ridge: a stack of tiles, a pale line of mortar under its cap, and the end tiles (onigawara)
  p.box(RIDGE, x1 - x0 + 0.06, 0.14, 0.2, (x0 + x1) / 2, ridge + 0.01, zr);
  p.box('#6d737c', x1 - x0 + 0.04, 0.025, 0.22, (x0 + x1) / 2, ridge + 0.02, zr, { cast: false });
  for (const [i, x] of [x0, x1].entries()) {
    if (!ends[i]) continue;
    p.box(RIDGE, 0.1, 0.26, 0.26, x, ridge - 0.02, zr);
    // the gable: a triangle of wall under the roof, and the bargeboards along its two edges
    // the shape is drawn as (-z, y) so a quarter turn about y lays it on the gable's plane; then just inside the end
    const onSlope = (zz) => eave + (ridge - eave) * (1 - Math.abs(zz - zr) / Math.abs(zf - zr)) - 0.06;
    const [wb, wf] = wallZ;
    const tri = new THREE.Shape(
      [
        [wf, wallTop - 0.02],
        [wf, onSlope(wf)],
        [zr, ridge - 0.06],
        [wb, onSlope(wb)],
        [wb, wallTop - 0.02],
      ].map(([zz, yy]) => new THREE.Vector2(-zz, yy)),
    );
    const g = new THREE.ExtrudeGeometry(tri, { depth: 0.1, bevelEnabled: false, curveSegments: 1 });
    g.rotateY(Math.PI / 2).translate(walls[i] + (i ? -0.1 : 0), 0, 0);
    p.geo(gableWall, g);
    for (const s of [1, -1]) {
      const [za, zb2] = s > 0 ? [zf, zr] : [zb, zr];
      const run = za - zb2,
        rise = ridge - eave,
        len = Math.hypot(run, rise);
      const bb = new THREE.BoxGeometry(0.05, 0.14, len + 0.06)
        .rotateX(Math.atan2(rise, Math.abs(run)) * Math.sign(run))
        .translate(x + (i ? 0.02 : -0.02), (eave + ridge) / 2 + 0.02, (za + zb2) / 2);
      p.geo(BARGE, bb);
    }
  }
}
