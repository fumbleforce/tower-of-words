// The platform shed along the west coast of the station forecourt, the monorail beams arriving on piers, and the
// covered walkway from the shed's stairs to the station's glass front (scenes/station-exterior.js builds the station
// and calls buildShed). All of it on the town's grid, like the station; only the beams curve, out on the approach.
//
// The shed is as the train shows it (places/train.js, train/world.js): one beam down the middle, the car's line,
// with a side platform either side at the car's floor (DECK), and the other way's beam (BEAM2) outside the shed's
// back wall on the sea side. It is the Blender model (scenes/station-model.js, tools/station/station.py): portal
// frames, the platforms with their coping, edge line and tactile strip, a cross deck joining them at the north end over
// the beam's end, a stair down from the east platform's south end (none from the west one: it would come down between
// the beams, and the walkway from it would pass under the car's beam, #403), the curved roof on columns, a glazed back
// wall on the sea side, a railing on the town side and a glazed north end.
// Without the model, a plainer code-built shed of the same plan stands in.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat } from '../props.js';
import { BUILDINGS, PATHS, toLocal } from './island-layout.js';
import { boxes } from './forecourt/details.js';
import { pavingRects } from './town.js';
import {
  stationModel,
  stationLighter,
  stationMesh,
  stationGlass,
  approachGeometry,
  stationSign,
} from './station-model.js';

// The shed from the layout's platform_shed: a rectangle on the grid, running north-south west of the station, its
// centre line (the car's line, CHUNKS.train) down the middle of the traced roof.
const SHED = (() => {
  const [x0, z0, x1, z1] = BUILDINGS.find((b) => b.id === 'platform_shed').rect;
  const [wx, nz] = toLocal('forecourt', x0, z0),
    [ex, sz] = toLocal('forecourt', x1, z1);
  return { c: [(wx + ex) / 2, (nz + sz) / 2], L: sz - nz, half: 4 };
})();
export const DECK = 2.5, // platform level (the monorail car's floor)
  BEAM_TOP = DECK - 0.16, // the beam just under the car floor, as on the ride (train/world.js BEAM_TOP)
  BEAM_H = 0.96,
  EDGE = 1.38, // the platforms' edges from the beam's centre (the car is 2.6 wide)
  BEAM2 = -6.36, // the other way's beam, west of the car's (train/world.js BEAM2_Z over CHUNKS.train.scale)
  CROSS = 2.4; // the cross deck's depth at the shed's north end; the beams end against it
const EAVE = 4.75;

// the code-built shed, for when the model can't be loaded: the same plan in plain boxes
function codeShed(root) {
  const g = new THREE.Group();
  g.position.set(SHED.c[0], 0, SHED.c[1]); // +z points south, down the shed
  root.add(g);
  const L = SHED.L,
    beams = [],
    piers = [],
    deck = [],
    steel = [];
  for (const u of [0, BEAM2]) {
    beams.push([0.84, BEAM_H, L - CROSS, u, BEAM_TOP - BEAM_H, CROSS / 2]);
    for (let v = -L / 2 + 0.6; v < L / 2; v += 4.8)
      if (u === 0 || v > CROSS - L / 2) piers.push([0.6, BEAM_TOP - BEAM_H, 0.6, u, 0, v]);
  }
  deck.push([2 * EDGE, 0.45, CROSS, 0, DECK - 0.45, CROSS / 2 - L / 2]); // the cross deck
  for (const s of [-1, 1]) {
    deck.push([4 - EDGE, 0.45, L, s * (EDGE + 4) * 0.5, DECK - 0.45, 0]);
    steel.push([0.08, 0.03, L, s * (EDGE + 0.2), DECK, 0]);
    for (let v = -L / 2 + 0.6; v < L / 2; v += 4.8) {
      piers.push([0.4, DECK - 0.45, 0.4, s * 3.55, 0, v]);
      steel.push([0.16, EAVE - DECK, 0.16, s * 3.55, DECK, v]);
    }
    // the east platform's stair down from the south end
    if (s > 0)
      for (let i = 0; i < 10; i++) deck.push([1.3, DECK - i * 0.25, 0.34, 2.7, 0, L / 2 - 3.2 + 0.34 * (i + 0.5)]);
  }
  steel.push([0.1, 1.2, L, -4, DECK, 0]); // the back wall's dado
  g.add(boxes(beams, '#9aa0a6'), boxes(piers, '#8a8f96'), boxes(deck, '#7d8288'), boxes(steel, '#6f7782'));
  const roof = new THREE.Mesh(
    new THREE.CylinderGeometry(SHED.half + 0.6, SHED.half + 0.6, L, 16, 1, true, -Math.PI / 2, Math.PI),
    mat('#56697d', { side: THREE.DoubleSide }),
  );
  roof.rotation.x = -Math.PI / 2;
  roof.scale.set(1, 1, 0.2);
  roof.position.set(0, EAVE, 0);
  roof.castShadow = roof.receiveShadow = true;
  g.add(roof);
  return roof;
}

// the Blender-built shed (station-model.js); returns its roof and the walkway's roofs (walkway: false leaves the
// walkway's roofs out, for a place that sees only the shed's north end)
function modelShed(root, { walkway = true } = {}) {
  const lighter = stationLighter();
  for (const n of ['sh_concrete', 'sh_metal', ...(lighter ? [] : ['sh_fine'])]) root.add(stationMesh(n));
  root.add(stationGlass('sh_glass'));
  // the name on the platforms' boards, facing the track
  for (const s of [-1, 1]) {
    const sign = stationSign(2.1, 0.26);
    sign.position.set(SHED.c[0] + s * 2.96, DECK + 1.41, SHED.c[1] + 2);
    sign.rotation.y = -s * (Math.PI / 2);
    root.add(sign);
  }
  const roof = stationMesh('sh_roof'),
    walkRoof = walkway ? stationMesh('wk_roof') : null;
  root.add(roof, ...(walkRoof ? [walkRoof] : []));
  return { roof, walkRoof };
}

// the platform shed alone, without the beams' approach or the covered walkway: what the north campus sees past the
// shed's north end (scenes/campus.js)
export function buildShedOnly(root) {
  if (!stationModel()) return codeShed(root);
  const group = new THREE.Group(),
    { roof } = modelShed(group, { walkway: false });
  // the model's nodes carry no normals; under this place's plain lights (no street-style dressing, as the forecourt
  // has) the shadow lookup then reads NaN and the shed draws black. Its own copies get them; the forecourt's stay as
  // they are
  group.traverse((o) => {
    if (o.isMesh && !o.geometry.attributes.normal) {
      o.geometry = o.geometry.clone();
      o.geometry.computeVertexNormals();
    }
  });
  root.add(group);
  return roof;
}

// Points every ~1.5 along both beams' approach: the car's beam from its end at the shed's south end along the
// layout's beam path, and the other way's beam beside it on the inside of the curve, BEAM2 off.
function approachLines() {
  const line = PATHS.find((p) => p.id === 'beam').line.map(([x, z]) => toLocal('forecourt', x, z));
  const end = [SHED.c[0], SHED.c[1] + SHED.L / 2];
  const pts = [end, ...line.reverse().filter(([, z]) => z > end[1] + 0.5)];
  const curve = new THREE.CatmullRomCurve3(
    pts.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false,
    'centripetal',
  );
  const n = Math.ceil(curve.getLength() / 1.5);
  const a = [],
    b = [];
  for (let i = 0; i <= n; i++) {
    const p = curve.getPointAt(i / n),
      t = curve.getTangentAt(i / n);
    a.push([p.x, p.z]);
    // the right of the way south (west at the shed): (-t.z, t.x)
    b.push([p.x - t.z * -BEAM2, p.z + t.x * -BEAM2]);
  }
  return [a, b];
}

// where no pier may stand: the covered walkway, its west end and the stair's foot
const clearOfWalk = ([x, z]) => !(x > SHED.c[0] - 4.5 && x < 1.5 && z > SHED.c[1] + SHED.L / 2 - 0.6 && z < 19);

function approach(root) {
  for (const pts of approachLines()) {
    const piers = [];
    for (let i = 2; i < pts.length; i++) if (i % 4 === 2 && clearOfWalk(pts[i])) piers.push(i);
    const model = approachGeometry(pts, BEAM_TOP, piers, BEAM_H);
    if (model) {
      model.forEach((geometry, k) => {
        if (!geometry) return;
        const m = new THREE.Mesh(geometry, mat(k ? '#8f9396' : '#a3a6a6', { roughness: 0.9 }));
        m.name = 'station:approach';
        m.userData.surf = 'concrete';
        m.castShadow = m.receiveShadow = true;
        root.add(m);
      });
      continue;
    }
    const beam = [],
      cols = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      const [[ax, az], [bx, bz]] = [pts[i], pts[i + 1]];
      beam.push(
        new THREE.BoxGeometry(0.84, BEAM_H, Math.hypot(bx - ax, bz - az) + 0.04)
          .rotateY(Math.atan2(bx - ax, bz - az))
          .translate((ax + bx) / 2, BEAM_TOP - BEAM_H / 2, (az + bz) / 2),
      );
    }
    for (const i of piers)
      cols.push(
        new THREE.BoxGeometry(0.55, BEAM_TOP - BEAM_H, 0.55).translate(pts[i][0], (BEAM_TOP - BEAM_H) / 2, pts[i][1]),
      );
    for (const [list, color] of [
      [beam, '#9aa0a6'],
      [cols, '#8a8f96'],
    ]) {
      if (!list.length) continue;
      const m = new THREE.Mesh(mergeGeometries(list), mat(color));
      list.forEach((g) => g.dispose());
      m.castShadow = m.receiveShadow = true;
      root.add(m);
    }
  }
}

// the covered walkway from the stair's foot: east along the shed's south end from its glazed west end, a step east of
// the beam, then north to the station's glass front
export function coveredWalk(station) {
  const CX = (station.x0 + station.x1) / 2,
    [x, z] = [SHED.c[0], SHED.c[1] + SHED.L / 2 + 2.6];
  return [
    [x + 1.6, CX + 1.2, z - 0.9, z + 0.9],
    [CX - 1.2, CX + 1.2, station.zS, z - 0.9],
  ];
}

// the code-built walkway's roof and posts (without the model)
function codeWalkway(root, station) {
  const { x0: X0, x1: X1, zS: ZS } = station;
  const CX = (X0 + X1) / 2,
    z = SHED.c[1] + SHED.L / 2 + 2.6,
    x0 = SHED.c[0] + 1.6,
    posts = [],
    roofs = [];
  roofs.push([CX + 1.2 - x0, 0.08, 1.8, (x0 + CX + 1.2) / 2, 2.2, z]);
  roofs.push([2.4, 0.08, z - 0.9 - ZS, CX, 2.2, (ZS + z - 0.9) / 2]);
  for (let x = x0 + 0.6; x < CX - 1.2; x += 2.5)
    posts.push([0.08, 2.2, 0.08, x, 0, z - 0.85], [0.08, 2.2, 0.08, x, 0, z + 0.85]);
  for (let zz = ZS + 1.2; zz < z - 0.9; zz += 2.5)
    posts.push([0.08, 2.2, 0.08, CX - 1.15, 0, zz], [0.08, 2.2, 0.08, CX + 1.15, 0, zz]);
  const roof = boxes(roofs, '#56697d');
  root.add(roof, boxes(posts, '#6f7782'));
  return roof;
}

// the shed, the beams and the walkway round `station` (its outline { x0, x1, zN, zS }); returns the shed's roof
export function buildShed(root, station, onWalkRoof = null) {
  let roof, walkRoof;
  if (stationModel()) ({ roof, walkRoof } = modelShed(root));
  else {
    roof = codeShed(root);
    walkRoof = codeWalkway(root, station);
  }
  approach(root);
  root.add(
    pavingRects(coveredWalk(station), 0.9, {
      color: '#8e8a86',
      seam: '#7f7b77',
    }),
  );
  onWalkRoof?.(walkRoof);
  return roof;
}
