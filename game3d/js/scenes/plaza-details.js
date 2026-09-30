// The fountain plaza's fittings: the fountain, the tall lamps and their evening pools, the canteen terrace's
// tables and umbrellas, and the lane's kerbs and drains. Repeats are merged per material here; scenes/plaza.js
// places them and merges the rest.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PAL, mat, textTexture, plane, JP_FONT } from '../props.js';
import { lightPool } from '../places/life.js';
import { boxes, planter, tree } from './forecourt/details.js';
import { TOWN } from './town.js';

export function merged(parts, material, { cast = true } = {}) {
  const mesh = new THREE.Mesh(mergeGeometries(parts), material);
  parts.forEach((part) => part.dispose());
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  return mesh;
}

function lathe(points, segments = 40) {
  return new THREE.LatheGeometry(
    points.map(([r, y]) => new THREE.Vector2(r, y)),
    segments,
  );
}
const disc = (r, y, seg = 48) => new THREE.CircleGeometry(r, seg).rotateX(-Math.PI / 2).translate(0, y, 0);

// The fountain: a wide stone basin (radius R, the map's 8.6 across) with a painted blue floor under clear water,
// coins on the floor near the rim, and a two-tier centrepiece whose bowls spill in thin curtains. Returns
// { update(t) } for the ripples.
export function fountain(root, x, z, R) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const W = 0.42, // the rim's width
    H = 0.5, // the rim's height
    WATER = 0.34,
    IN = R - W;
  const stone = mat('#a19c95', { roughness: 0.75 });
  const stoneParts = [
    // the rim: outer wall, a rounded lip, the inner wall down to the floor
    lathe([
      [R + 0.05, 0],
      [R + 0.05, H - 0.06],
      [R, H],
      [IN + 0.02, H],
      [IN, H - 0.06],
      [IN, 0.06],
    ]),
    // the centrepiece: a drum, a column, the lower bowl, a slimmer column, the upper bowl, a finial
    lathe(
      [
        [0.02, 0.06],
        [1.05, 0.06],
        [1.05, 0.52],
        [0.95, 0.6],
        [0.34, 0.62],
        [0.28, 1.2],
        [0.5, 1.28],
        [1.52, 1.42],
        [1.56, 1.52],
        [1.44, 1.54],
        [0.3, 1.46],
        [0.18, 1.5],
        [0.15, 2.08],
        [0.36, 2.12],
        [0.8, 2.22],
        [0.82, 2.3],
        [0.72, 2.31],
        [0.12, 2.26],
        [0.1, 2.5],
        [0.16, 2.56],
        [0.02, 2.66],
      ],
      24,
    ),
  ];
  group.add(merged(stoneParts, stone));
  // the basin floor: painted blue-grey, the colour that makes the water read as water
  // its own material: after dark it glows a little, as if lit from under the water
  const floorMat = new THREE.MeshStandardMaterial({
    color: '#557f8e',
    roughness: 0.55,
    emissive: new THREE.Color('#6fb4c8'),
    emissiveIntensity: 0,
  });
  const floor = new THREE.Mesh(disc(IN, 0.065), floorMat);
  floor.receiveShadow = true;
  group.add(floor);
  // coins: many, a little larger than life so they read at the play camera's distance; most toward the rim
  // the camera sees (south), and a ring round the drum
  const coinsA = [],
    coinsB = [];
  let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 150; i++) {
    const south = i < 95;
    const a = south ? Math.PI * (0.12 + 0.76 * rnd()) : rnd() * Math.PI * 2;
    const r = south ? IN - 0.25 - rnd() * 1.3 : 1.2 + rnd() * 0.5;
    const c = new THREE.CylinderGeometry(0.075, 0.075, 0.012, 10)
      .rotateX((rnd() - 0.5) * 0.3)
      .translate(Math.cos(a) * r, 0.075, Math.sin(a) * r);
    (i % 3 ? coinsA : coinsB).push(c);
  }
  group.add(
    merged(coinsA, mat('#d3d6d2', { roughness: 0.35, metalness: 0.35 }), {
      cast: false,
    }),
  );
  group.add(
    merged(coinsB, mat('#c9b88f', { roughness: 0.35, metalness: 0.35 }), {
      cast: false,
    }),
  );
  // water: the basin, the two bowls, and the curtains falling from the bowls' rims (one see-through mesh)
  const water = new THREE.MeshStandardMaterial({
    color: '#7fb3c2',
    roughness: 0.08,
    metalness: 0.1,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  group.add(
    merged(
      [
        disc(IN, WATER),
        disc(1.46, 1.5, 32),
        disc(0.74, 2.28, 24),
        new THREE.CylinderGeometry(1.56, 1.7, 1.52 - WATER, 32, 1, true).translate(0, (1.52 + WATER) / 2, 0),
        new THREE.CylinderGeometry(0.82, 0.9, 2.3 - 1.5, 24, 1, true).translate(0, (2.3 + 1.5) / 2, 0),
        new THREE.CylinderGeometry(0.02, 0.07, 0.34, 8, 1, true).translate(0, 2.83, 0),
      ],
      water,
      { cast: false },
    ),
  );
  // white water where the curtains land and a few rings on the surface; they breathe in update()
  const foam = new THREE.MeshStandardMaterial({
    color: '#e3ecec',
    roughness: 0.5,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  });
  foam.userData.noInk = true;
  const rings = [];
  for (const [r0, w, y] of [
    [1.62, 0.16, WATER + 0.005],
    [1.95, 0.05, WATER + 0.004],
    [2.5, 0.04, WATER + 0.003],
    [0.84, 0.08, 1.51],
  ])
    rings.push(new THREE.RingGeometry(r0, r0 + w, 48).rotateX(-Math.PI / 2).translate(0, y, 0));
  const foamMesh = merged(rings, foam, { cast: false });
  group.add(foamMesh);
  // the notice on the rim, facing the lane
  const notice = plane(
    1.3,
    0.4,
    textTexture(
      (ctx, w, h) => {
        ctx.fillStyle = '#46545a';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#e5e8df';
        ctx.textAlign = 'center';
        ctx.font = '600 44px ' + JP_FONT;
        ctx.fillText('コインを入れないで', w / 2, 58);
        ctx.font = '600 30px sans-serif';
        ctx.fillText('PLEASE DON’T THROW COINS', w / 2, 106, w - 24);
      },
      448,
      136,
    ),
  );
  notice.position.set(0, H - 0.2, R + 0.06);
  notice.rotation.x = -0.35;
  group.add(notice);
  root.add(group);
  return {
    evening() {
      floorMat.emissiveIntensity = 0.35;
    },
    update(t) {
      const k = 1 + Math.sin(t * 2.1) * 0.025;
      foamMesh.scale.set(k, 1, k);
      foam.opacity = 0.62 + Math.sin(t * 3.3) * 0.08;
    },
  };
}

// Tall lamp posts with a lantern head. The glass is its own material, so the evening can turn it up; the pools
// on the ground are one mesh, shown only after dark.
export function lamps(root, points) {
  const poles = [],
    heads = [],
    glass = [];
  for (const [x, z] of points) {
    poles.push(new THREE.CylinderGeometry(0.05, 0.07, 2.6, 8).translate(x, 1.3, z));
    poles.push(new THREE.CylinderGeometry(0.12, 0.14, 0.18, 8).translate(x, 0.09, z));
    heads.push(new THREE.CylinderGeometry(0.2, 0.14, 0.07, 8).translate(x, 3.0, z));
    heads.push(new THREE.CylinderGeometry(0.15, 0.1, 0.05, 8).translate(x, 2.62, z));
    glass.push(new THREE.CylinderGeometry(0.12, 0.1, 0.34, 8).translate(x, 2.8, z));
  }
  const dark = mat(PAL.dark);
  root.add(merged(poles, dark), merged(heads, dark));
  const lampGlass = new THREE.MeshStandardMaterial({
    color: PAL.lamp,
    emissive: new THREE.Color(PAL.lampEm),
    emissiveIntensity: 0.35,
    roughness: 0.4,
  });
  root.add(merged(glass, lampGlass, { cast: false }));
  // the pools: quads sharing one additive material
  const first = lightPool(0, 0, 1.6, { k: 0.42 });
  const quads = points.map(([x, z]) => new THREE.PlaneGeometry(3.2, 3.2).rotateX(-Math.PI / 2).translate(x, 0.03, z));
  const pools = new THREE.Mesh(mergeGeometries(quads), first.material);
  quads.forEach((q) => q.dispose());
  first.geometry.dispose();
  pools.renderOrder = 1;
  pools.userData.noAO = true;
  pools.name = 'plaza:pools';
  pools.visible = false;
  root.add(pools);
  return {
    evening() {
      lampGlass.emissiveIntensity = 2.6;
      pools.visible = true;
    },
  };
}

// benches round the fountain, each facing it: [x, z, angle from the fountain]
export function benches(root, nav, list, make) {
  for (const [x, z, face] of list) {
    const b = make();
    b.rotation.y = face;
    b.position.set(x, 0, z);
    root.add(b);
    nav.block(x - 0.75, x + 0.75, z - 0.75, z + 0.75);
  }
}

// the canteen terrace: round tables with four chairs under white umbrellas
export function terrace(root, nav, xs, z) {
  const poles = [],
    tops = [],
    chairs = [],
    canopies = [];
  for (const x of xs) {
    poles.push(
      new THREE.CylinderGeometry(0.035, 0.035, 2.3, 6).translate(x, 1.15, z),
      new THREE.CylinderGeometry(0.06, 0.2, 0.05, 8).translate(x, 0.025, z),
    );
    tops.push(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 16).translate(x, 0.72, z));
    for (const [dx, dz] of [
      [0.72, 0],
      [-0.72, 0],
      [0, 0.72],
      [0, -0.72],
    ]) {
      const cx = x + dx,
        cz = z + dz;
      chairs.push(
        new THREE.BoxGeometry(0.34, 0.05, 0.34).translate(cx, 0.44, cz),
        new THREE.BoxGeometry(0.26, 0.42, 0.26).translate(cx, 0.21, cz),
        new THREE.BoxGeometry(dz ? 0.34 : 0.04, 0.34, dz ? 0.04 : 0.34).translate(
          cx + Math.sign(dx) * 0.16,
          0.63,
          cz + Math.sign(dz) * 0.16,
        ),
      );
    }
    // eight-sided canopy with a small cap
    canopies.push(
      new THREE.ConeGeometry(1.25, 0.42, 8).translate(x, 2.28, z),
      new THREE.ConeGeometry(0.12, 0.14, 8).translate(x, 2.55, z),
    );
    nav.block(x - 1.0, x + 1.0, z - 1.0, z + 1.0);
  }
  root.add(merged(poles, mat(PAL.metal)), merged(tops, mat('#d9d7d1')));
  // chair legs read as a solid block at this distance; one dark mesh for seat, back and legs
  root.add(merged(chairs, mat('#59616c')));
  root.add(merged(canopies, mat('#d4d0c7', { roughness: 0.9 })));
}

// Low kerbs on the lane's south edge and a few drain grates, along the lane's centre line (sampled points).
export function laneDetails(root, line, half) {
  const kerbs = [],
    drains = [],
    slots = [];
  for (let i = 0; i + 1 < line.length; i++) {
    const [a, b] = [line[i], line[i + 1]];
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      L = Math.hypot(dx, dz),
      nx = -dz / L,
      nz = dx / L;
    const mx = (a[0] + b[0]) / 2 + nx * (half + 0.06),
      mz = (a[1] + b[1]) / 2 + nz * (half + 0.06);
    kerbs.push(new THREE.BoxGeometry(L + 0.02, 0.1, 0.14).rotateY(-Math.atan2(dz, dx)).translate(mx, 0.03, mz));
    if (i % 9 === 4) {
      const ang = -Math.atan2(dz, dx),
        gx = (a[0] + b[0]) / 2 + nx * (half - 0.28),
        gz = (a[1] + b[1]) / 2 + nz * (half - 0.28);
      drains.push(new THREE.BoxGeometry(0.62, 0.012, 0.28).rotateY(ang).translate(gx, 0.026, gz));
      for (let k = 0; k < 7; k++) {
        const o = -0.24 + k * 0.08;
        slots.push(
          new THREE.BoxGeometry(0.035, 0.004, 0.2).rotateY(ang).translate(gx + (dx / L) * o, 0.034, gz + (dz / L) * o),
        );
      }
    }
  }
  root.add(merged(kerbs, mat('#9a9993')));
  if (drains.length)
    root.add(merged(drains, mat('#686f74'), { cast: false }), merged(slots, mat('#414a50'), { cast: false }));
}

// a small bin
export function bin(root, nav, x, z) {
  root.add(
    boxes(
      [
        [0.34, 0.54, 0.34, x, 0, z],
        [0.38, 0.05, 0.38, x, 0.54, z],
      ],
      '#626f71',
    ),
  );
  nav.block(x - 0.22, x + 0.22, z - 0.22, z + 0.22);
}

// grass beds with trees on the paving: [x, z, radius, trees]
export function groves(root, list) {
  const beds = [],
    rims = [];
  list.forEach(([x, z, r, n], i) => {
    beds.push(new THREE.CircleGeometry(r, 20).rotateX(-Math.PI / 2).translate(x, 0.1, z));
    rims.push(new THREE.CylinderGeometry(r + 0.12, r + 0.12, 0.1, 20, 1, true).translate(x, 0.05, z));
    for (let k = 0; k < n; k++) {
      const a = k * 2.4 + i,
        t = tree(i * 3 + k + 1, 1.3 + ((i + k) % 3) * 0.2);
      t.position.set(x + Math.cos(a) * r * 0.45 * (n > 1), 0.1, z + Math.sin(a) * r * 0.45 * (n > 1));
      root.add(t);
    }
    const shrubs = planter(r * 1.1);
    shrubs.position.set(x, 0, z + r * 0.55);
    root.add(shrubs);
  });
  root.add(merged(beds, mat(TOWN.grass, { roughness: 0.95 }), { cast: false }));
  root.add(merged(rims, mat('#9a9993')));
}
