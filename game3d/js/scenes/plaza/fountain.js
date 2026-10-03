// The fountain in the middle of the plaza (scenes/plaza.js): a wide stone basin (radius R, the map's 8.6 across)
// with a painted blue floor under clear water, coins on the floor near the rim, and a two-tier centrepiece with a
// small jet on top whose bowls spill in thin curtains. The water moves: light glints drift over the surface, the
// curtains fall, rings spread where they land. After dark the floor is lit from under the water, so the coins keep
// their shine. The no-coins sign is set into the rim's outer face, on the curve, a little east of the south axis
// (where Eric stands to look, it stays in view). Returns { update(t), evening() }.
import * as THREE from 'three';
import { mat, textTexture, JP_FONT } from '../../props.js';
import { merged } from '../plaza-buildings.js';

function lathe(points, segments = 40) {
  return new THREE.LatheGeometry(
    points.map(([r, y]) => new THREE.Vector2(r, y)),
    segments,
  );
}
const disc = (r, y, seg = 48) => new THREE.CircleGeometry(r, seg).rotateX(-Math.PI / 2).translate(0, y, 0);
const rnd = (() => {
  let s = 7;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
})();

// glints on the water: short bright wavy strokes on black, for an emissive map that drifts
function glintTexture() {
  const t = textTexture(
    (ctx, w, h) => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      ctx.lineCap = 'round';
      for (let i = 0; i < 160; i++) {
        const a = rnd() * Math.PI * 2,
          r = Math.sqrt(rnd()) * w * 0.47;
        const x = w / 2 + Math.cos(a) * r,
          y = h / 2 + Math.sin(a) * r,
          L = 2 + rnd() * 6;
        ctx.strokeStyle = `rgba(255,255,255,${0.25 + rnd() * 0.45})`;
        ctx.lineWidth = 0.8 + rnd() * 1.0;
        ctx.beginPath();
        ctx.moveTo(x - L, y);
        ctx.quadraticCurveTo(x, y - 1 - rnd() * 2, x + L, y);
        ctx.stroke();
      }
    },
    256,
    256,
  );
  t.colorSpace = THREE.NoColorSpace;
  t.center.set(0.5, 0.5);
  return t;
}

// falling water: pale streaks of different lengths on clear, repeated round the curtain and scrolled down
function streakTexture() {
  const t = textTexture(
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < 26; i++) {
        const x = rnd() * w,
          y = rnd() * h,
          L = h * (0.3 + rnd() * 0.5);
        const g = ctx.createLinearGradient(0, y, 0, y + L);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.5, `rgba(255,255,255,${0.5 + rnd() * 0.4})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        for (const dy of [0, -h]) ctx.fillRect(x, y + dy, 1.5 + rnd() * 2, L);
      }
      ctx.fillStyle = 'rgba(220,236,240,0.35)';
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillRect(0, 0, w, h);
    },
    64,
    128,
  );
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 1);
  return t;
}

export function fountain(root, x, z, R) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const W = 0.42, // the rim's width
    H = 0.5, // the rim's height
    WATER = 0.34,
    IN = R - W;
  const stone = mat('#a3a19c', { roughness: 0.75 });
  const stoneParts = [
    // the rim: outer wall, a rounded lip, the inner wall down to the floor
    lathe(
      [
        [R + 0.05, 0],
        [R + 0.05, H - 0.06],
        [R, H],
        [IN + 0.02, H],
        [IN, H - 0.06],
        [IN, 0.06],
      ],
      72,
    ),
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
  // the basin floor: painted blue-grey, the colour that makes the water read as water; after dark it glows a
  // little, as if lit from under the water
  const floorMat = new THREE.MeshStandardMaterial({
    color: '#557f8e',
    roughness: 0.55,
    emissive: new THREE.Color('#6fb4c8'),
    emissiveIntensity: 0,
  });
  const floor = new THREE.Mesh(disc(IN, 0.065), floorMat);
  floor.receiveShadow = true;
  group.add(floor);
  // coins: many, a little larger than life so they read at the play camera's distance; most toward the rim the
  // camera sees (south), and a ring round the drum. Their own materials: after dark they catch the underwater light
  const coinsA = [],
    coinsB = [];
  for (let i = 0; i < 150; i++) {
    const south = i < 95;
    const a = south ? Math.PI * (0.12 + 0.76 * rnd()) : rnd() * Math.PI * 2;
    const r = south ? IN - 0.25 - rnd() * 1.3 : 1.2 + rnd() * 0.5;
    const c = new THREE.CylinderGeometry(0.075, 0.075, 0.012, 10)
      .rotateX((rnd() - 0.5) * 0.3)
      .translate(Math.cos(a) * r, 0.075, Math.sin(a) * r);
    (i % 3 ? coinsA : coinsB).push(c);
  }
  const coinMat = (color, glow) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.35,
      metalness: 0.35,
      emissive: new THREE.Color(glow),
      emissiveIntensity: 0,
    });
  const silver = coinMat('#d3d6d2', '#dfe6e4'),
    brass = coinMat('#c9b88f', '#e6d6a8');
  group.add(merged(coinsA, silver, { cast: false }), merged(coinsB, brass, { cast: false }));

  // the water in the basin and the bowls: clear, with drifting glints
  const glints = glintTexture();
  const water = new THREE.MeshStandardMaterial({
    color: '#7fb3c2',
    roughness: 0.08,
    metalness: 0.1,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    emissive: new THREE.Color('#e8f6f8'),
    emissiveMap: glints,
    emissiveIntensity: 0.35,
  });
  group.add(merged([disc(IN, WATER, 72), disc(1.46, 1.5, 32), disc(0.74, 2.28, 24)], water, { cast: false }));
  // the curtains falling from the bowls' rims, and the jet on top
  const streaks = streakTexture();
  const fall = new THREE.MeshStandardMaterial({
    color: '#e6f2f4',
    map: streaks,
    roughness: 0.3,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const curtains = merged(
    [
      new THREE.CylinderGeometry(1.56, 1.72, 1.52 - WATER, 40, 1, true).translate(0, (1.52 + WATER) / 2, 0),
      new THREE.CylinderGeometry(0.82, 0.92, 2.3 - 1.5, 28, 1, true).translate(0, (2.3 + 1.5) / 2, 0),
      new THREE.CylinderGeometry(0.03, 0.08, 0.5, 8, 1, true).translate(0, 2.9, 0),
    ],
    fall,
    { cast: false },
  );
  group.add(curtains);
  // white water where the curtains land, and two rings of ripples that spread from it and fade, one after the
  // other
  const foam = new THREE.MeshStandardMaterial({
    color: '#e3ecec',
    roughness: 0.5,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  });
  foam.userData.noInk = true;
  const foamMesh = merged(
    [
      new THREE.RingGeometry(1.62, 1.82, 48).rotateX(-Math.PI / 2).translate(0, WATER + 0.005, 0),
      new THREE.RingGeometry(0.84, 0.94, 32).rotateX(-Math.PI / 2).translate(0, 1.51, 0),
      new THREE.SphereGeometry(0.12, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 2.64, 0),
    ],
    foam,
    { cast: false },
  );
  group.add(foamMesh);
  const ripples = [0, 0.5].map(() => {
    const m = new THREE.MeshStandardMaterial({
      color: '#eef5f5',
      roughness: 0.4,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    m.userData.noInk = true;
    const mesh = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.035, 64).rotateX(-Math.PI / 2), m);
    mesh.position.y = WATER + 0.004;
    mesh.name = 'fountain:ripple';
    group.add(mesh);
    return mesh;
  });

  // the notice, set into the rim's outer face on its curve
  const SIGN_W = 1.45,
    SIGN_A = 0.42; // its middle, radians east of south
  const tex = textTexture(
    (ctx, w, h) => {
      ctx.fillStyle = '#3f4d55';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(230,234,226,0.55)';
      ctx.lineWidth = 3;
      ctx.strokeRect(6, 6, w - 12, h - 12);
      ctx.fillStyle = '#eceee8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 50px ' + JP_FONT;
      ctx.fillText('コインを入れないで', w / 2, h * 0.36, w - 40);
      ctx.font = '600 28px sans-serif';
      ctx.fillText('PLEASE DON’T THROW COINS', w / 2, h * 0.76, w - 40);
    },
    620,
    128,
  );
  const len = SIGN_W / (R + 0.07);
  const sign = new THREE.Mesh(
    new THREE.CylinderGeometry(R + 0.07, R + 0.07, 0.3, 16, 1, true, SIGN_A - len / 2, len),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }),
  );
  sign.position.y = 0.25;
  sign.receiveShadow = true;
  group.add(sign);
  root.add(group);

  return {
    evening() {
      floorMat.emissiveIntensity = 0.35;
      silver.emissiveIntensity = 0.32;
      brass.emissiveIntensity = 0.3;
      water.emissiveIntensity = 0.5;
    },
    update(t) {
      glints.rotation = t * 0.035;
      glints.offset.set(Math.sin(t * 0.37) * 0.015, Math.cos(t * 0.29) * 0.015);
      streaks.offset.y = t * 0.9;
      const k = 1 + Math.sin(t * 2.1) * 0.02;
      foamMesh.scale.set(k, 1, k);
      foam.opacity = 0.62 + Math.sin(t * 3.3) * 0.08;
      ripples.forEach((m, i) => {
        const f = (t * 0.32 + i * 0.5) % 1; // 0 to 1 over about three seconds
        const s = 1.8 + f * (IN - 2.0);
        m.scale.set(s, 1, s);
        m.material.opacity = 0.5 * Math.sin(f * Math.PI) * (1 - f * 0.5);
      });
    },
  };
}
