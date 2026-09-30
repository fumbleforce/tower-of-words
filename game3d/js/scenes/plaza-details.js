import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, textTexture, plane, JP_FONT } from '../props.js';
import { boxes } from './forecourt/details.js';

function merged(parts, material) {
  const mesh = new THREE.Mesh(mergeGeometries(parts), material);
  parts.forEach((part) => part.dispose());
  mesh.receiveShadow = true;
  return mesh;
}

function profile(points, segments = 28) {
  return new THREE.LatheGeometry(
    points.map(([r, y]) => new THREE.Vector2(r, y)),
    segments,
  );
}

export function fountain(root, x, z, radius) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  // The basin has an inner wall and a low lip. A capped cylinder would cover the water.
  const stone = merged(
    [
      profile([
        [radius + 0.04, 0.02],
        [radius + 0.04, 0.18],
        [radius + 0.02, 0.25],
        [radius - 0.16, 0.25],
        [radius - 0.16, 0.06],
        [radius + 0.04, 0.02],
      ]),
      new THREE.CircleGeometry(radius - 0.16, 28).rotateX(-Math.PI / 2).translate(0, 0.05, 0),
      new THREE.CylinderGeometry(0.14, 0.24, 0.68, 10).translate(0, 0.4, 0),
      profile(
        [
          [0.12, 0.7],
          [0.32, 0.7],
          [0.62, 0.84],
          [0.62, 0.9],
          [0.54, 0.9],
          [0.5, 0.84],
          [0.12, 0.77],
          [0.12, 0.7],
        ],
        20,
      ),
      new THREE.CylinderGeometry(0.045, 0.07, 0.25, 8).translate(0, 1.005, 0),
    ],
    mat('#9a9690', { roughness: 0.7 }),
  );
  stone.castShadow = true;
  group.add(stone);
  const waterParts = [
    new THREE.CircleGeometry(radius - 0.16, 28).rotateX(-Math.PI / 2).translate(0, 0.17, 0),
    new THREE.CircleGeometry(0.52, 20).rotateX(-Math.PI / 2).translate(0, 0.865, 0),
  ];
  // Two narrow spills make the shallow pool read as water at the walking camera distance.
  for (const side of [-1, 1]) {
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(side * 0.5, 0.865, 0.12),
      new THREE.Vector3(side * 0.78, 0.84, 0.2),
      new THREE.Vector3(side * 0.82, 0.18, 0.32),
    );
    waterParts.push(new THREE.TubeGeometry(curve, 7, 0.026, 4, false));
  }
  group.add(
    merged(
      waterParts,
      mat('#6d96a2', {
        roughness: 0.22,
        metalness: 0.06,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      }),
    ),
  );
  const ripples = [];
  for (const [x0, z0, r] of [
    [-0.82, 0.32, 0.18],
    [0.82, 0.32, 0.23],
    [0.38, -0.7, 0.12],
  ])
    ripples.push(new THREE.RingGeometry(r, r + 0.018, 16).rotateX(-Math.PI / 2).translate(x0, 0.174, z0));
  const foam = merged(ripples, mat('#9db8ba', { roughness: 0.6 }));
  foam.material.userData.noInk = true;
  group.add(foam);
  // The existing look-at line mentions coins and a notice. Both are visible from the approach.
  const coins = [];
  for (let i = 0; i < 38; i++) {
    const angle = i * 2.4,
      r = 0.4 + (i % 9) * 0.095;
    coins.push(
      new THREE.CircleGeometry(0.05 + (i % 3) * 0.006, 8)
        .rotateX(-Math.PI / 2)
        .translate(Math.cos(angle) * r, 0.055, Math.sin(angle) * r),
    );
  }
  group.add(merged(coins, mat('#bac0b8', { roughness: 0.5, metalness: 0.15 })));
  const notice = plane(
    0.8,
    0.28,
    textTexture(
      (ctx, w, h) => {
        ctx.fillStyle = '#46545a';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#e5e8df';
        ctx.textAlign = 'center';
        ctx.font = '600 37px ' + JP_FONT;
        ctx.fillText('コインを入れないで', w / 2, 50);
        ctx.font = '600 26px sans-serif';
        ctx.fillText('NO COINS', w / 2, 92);
      },
      384,
      112,
    ),
  );
  notice.position.set(0, 0.26, radius + 0.045);
  notice.rotation.x = -0.45;
  group.add(notice);
  root.add(group);
}

export function laneDetails(root, nav) {
  // Low kerbs sit outside the walking strip. Drain slots and repaired paving break up the straight lane.
  const kerbs = [],
    drains = [],
    slots = [];
  for (const [a, b] of [
    [-7.8, -4.4],
    [-4.2, -0.2],
    [0, 3.8],
    [4, 7.8],
  ])
    kerbs.push([b - a, 0.07, 0.12, (a + b) / 2, -0.02, 1.08]);
  root.add(boxes(kerbs, '#95958f'));
  for (const x of [-4.5, 4.6]) {
    drains.push([0.58, 0.012, 0.25, x, 0.004, 0.83]);
    for (let i = 0; i < 7; i++) slots.push([0.035, 0.004, 0.18, x - 0.24 + i * 0.08, 0.019, 0.83]);
  }
  root.add(boxes(drains, '#686f74'), boxes(slots, '#414a50'));
  const repairs = boxes(
    [
      [0.7, 0.002, 0.5, -2.62, 0.004, 0.52],
      [0.42, 0.002, 0.6, 3.55, 0.004, 0.2],
    ],
    '#918e87',
  );
  repairs.castShadow = false;
  root.add(repairs);
  // A small bin beside the east bench, away from the cross-island route.
  const bin = boxes(
    [
      [0.34, 0.54, 0.34, 3.55, 0, -4.05],
      [0.38, 0.05, 0.38, 3.55, 0.54, -4.05],
    ],
    '#626f71',
  );
  root.add(bin, boxes([[0.23, 0.055, 0.012, 3.55, 0.43, -3.873]], '#303d43'));
  nav.block(3.33, 3.77, -4.27, -3.83);
}
