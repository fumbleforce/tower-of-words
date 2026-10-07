import * as THREE from 'three';
import { roundedBox } from '../../perf/rounded-box.js';
import { mound, grass } from '../outdoor/planting.js';
import * as P from './plan.js';

const NO = { cast: false };
const METAL = { cast: false, surf: 'metal' };
const STONE = { cast: false, surf: 'concrete' };
const rounded = (p, color, w, h, d, x, y, z, r = 0.025) =>
  p.geo(color, roundedBox(w, h, d, r).translate(x, y + h / 2, z), NO);

// Four wheeled containers on a continuous washable pad. Their fronts face the street.
export function sortingBay(p, signs) {
  const x = P.STREET[1] + 0.55,
    start = P.W2_COURT[3] + 0.9,
    end = start + 3 * 0.85;
  p.box('#a0a39b', 1.02, 0.035, end - start + 0.96, x, 0, (start + end) / 2, STONE);
  // A shallow channel takes runoff along the back, with broad, readable grate bars.
  p.box('#465455', 0.12, 0.006, end - start + 0.85, x + 0.42, 0.036, (start + end) / 2, NO);
  for (let z = start - 0.35; z < end + 0.4; z += 0.16) p.box('#919c99', 0.1, 0.006, 0.035, x + 0.42, 0.042, z, METAL);
  const kinds = [
    ['#527788', 'かん', 'CANS'],
    ['#657f72', 'びん', 'GLASS'],
    ['#aa9d63', 'ペットボトル', 'PET BOTTLES'],
    ['#946860', 'かみ', 'PAPER'],
  ];
  kinds.forEach(([color, kana, en], i) => {
    const z = start + i * 0.85;
    // Wheels touch the pad; the body's lower edge sits above their axle.
    for (const dz of [-0.235, 0.235])
      p.geo(
        '#3c474a',
        new THREE.CylinderGeometry(0.065, 0.065, 0.055, 10).rotateX(Math.PI / 2).translate(x + 0.22, 0.1, z + dz),
        NO,
      );
    for (const dz of [-0.21, 0.21]) p.box('#3c474a', 0.08, 0.115, 0.08, x - 0.22, 0.035, z + dz, NO);
    rounded(p, color, 0.59, 0.65, 0.59, x, 0.14, z, 0.045);
    rounded(p, '#3e4b4e', 0.65, 0.065, 0.65, x, 0.79, z);
    // Raised hinge and lifting lip distinguish a working lid from a black roof.
    p.box('#87968c', 0.055, 0.045, 0.38, x + 0.29, 0.83, z, METAL);
    rounded(p, '#b4bdb2', 0.045, 0.05, 0.22, x - 0.335, 0.795, z, 0.008);
    p.box('#233236', 0.01, 0.09, 0.35, x - 0.301, 0.62, z, NO);
    for (const dz of [-0.22, 0.22]) p.box('#87968c', 0.018, 0.38, 0.025, x - 0.301, 0.19, z + dz, NO);
    // Labels belong to the container faces; no new lesson or interaction is implied.
    signs.card(kana, en, 0.43, 0.2, [x - 0.308, 0.45, z], -Math.PI / 2);
    p.box('#dedbc8', 0.46, 0.004, 0.03, x - 0.08, 0.036, z + 0.36, NO);
  });
  // A narrow gravel edge gives the concrete a deliberate boundary with the lawn.
  p.box('#8c9581', 0.26, 0.016, end - start + 1.1, x + 0.65, 0, (start + end) / 2, { ...NO, surf: 'soil' });
  for (let i = 0; i < 5; i++) grass(p, x + 0.7, start - 0.35 + i * 0.76, { h: 0.13, seed: 841 + i });
}

// Surface and maintenance detail around the existing instruments. The lawn stays open
// so nearby vegetation does not screen the wind mast or shelter the rain collector.
export function stationDetails(p, signs) {
  const [x0, x1, z0, z1] = P.STATION,
    gx = (P.STATION_GATE[0] + P.STATION_GATE[1]) / 2;
  // The gate's threshold meets the research walk. Flat slabs reach the screen's service side.
  for (let i = 0; i < 5; i++)
    p.box(i % 2 ? '#adb0a3' : '#a3a797', 0.58, 0.018, 0.5, gx, 0.022, z1 - 0.17 - i * 0.55, STONE);
  p.box('#a3a797', 1.25, 0.018, 0.5, gx - 0.35, 0.022, z1 - 2.92, STONE);
  // Narrow gravel strips under the fence avoid another large featureless rectangle.
  for (const x of [x0 + 0.12, x1 - 0.12])
    p.box('#a3a891', 0.18, 0.012, z1 - z0 - 0.18, x, 0.022, (z0 + z1) / 2, { ...NO, surf: 'soil' });
  for (const z of [z0 + 0.12, z1 - 0.12]) {
    if (z === z0 + 0.12) p.box('#a3a891', x1 - x0 - 0.18, 0.012, 0.18, (x0 + x1) / 2, 0.022, z, NO);
    else
      for (const [a, b] of [
        [x0 + 0.1, P.STATION_GATE[0]],
        [P.STATION_GATE[1], x1 - 0.1],
      ])
        p.box('#a3a891', b - a, 0.012, 0.18, (a + b) / 2, 0.022, z, NO);
  }
  // Footings and fittings stay inside the existing blocked instrument footprints.
  for (const [dx, dz] of [
    [-0.3, -0.3],
    [0.3, -0.3],
    [-0.3, 0.3],
    [0.3, 0.3],
  ])
    p.box('#babcb1', 0.16, 0.035, 0.16, -42.9 + dx, 0, z0 + 2 + dz, STONE);
  p.geo(
    '#a6aeaa',
    new THREE.TorusGeometry(0.125, 0.015, 4, 12).rotateX(Math.PI / 2).translate(-40, 0.6, z0 + 1.6),
    METAL,
  );
  p.geo('#3e5557', new THREE.CylinderGeometry(0.108, 0.108, 0.004, 12).translate(-40, 0.601, z0 + 1.6), NO);
  p.box('#a2a69b', 0.25, 0.045, 0.25, -39.6, 0, z1 - 1.4, STONE);
  for (const dx of [-0.08, 0.08])
    for (const dz of [-0.08, 0.08])
      p.geo(
        '#535f60',
        new THREE.CylinderGeometry(0.018, 0.018, 0.02, 6).translate(-39.6 + dx, 0.055, z1 - 1.4 + dz),
        NO,
      );
  // Two rails bolt the board to the last two existing fence posts, clear of the gate.
  const bays = Math.ceil((x1 - P.STATION_GATE[1]) / 2.2),
    railWidth = (x1 - P.STATION_GATE[1]) / bays;
  for (const y of [0.57, 0.78]) {
    p.box('#485a59', railWidth + 0.06, 0.045, 0.04, x1 - railWidth / 2, y, z1 - 0.005, METAL);
    for (const x of [x1 - railWidth, x1]) p.box('#a6b2aa', 0.08, 0.07, 0.055, x, y - 0.012, z1, METAL);
  }
  p.box('#536967', 0.72, 0.32, 0.05, x1 - 0.65, 0.53, z1 + 0.015, METAL);
  signs.board('かんそくち', 'WEATHER STATION', '#536967', 0.69, 0.28, [x1 - 0.65, 0.69, z1 + 0.045]);
  // Low planting outside the north/west boundary, away from the service route and sensors.
  for (let i = 0; i < 5; i++) {
    const x = x0 - 0.55,
      z = z0 + 0.6 + i * 0.92;
    mound(p, x, z, 0.34, i % 2 ? '#78886a' : '#6b805f', { squash: 0.27 });
    grass(p, x - 0.18, z + 0.27, { h: 0.18, seed: 870 + i });
  }
}
