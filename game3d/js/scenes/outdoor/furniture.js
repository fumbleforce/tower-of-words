// Street furniture for the outdoor kit (scenes/outdoor/): lamps, benches, bins, bollards and finger signs, built
// into a Parts collector (outdoor/parts.js) so a whole row costs one mesh per colour. Place them with along()
// and pair() from outdoor/parts.js: lamps at an even pitch on an edge, benches under trees facing the space,
// bins beside benches, bollards across an opening.
//   const lights = lightSet(); lamps(lights, p, points, { kind })   lamps; lights.build(root, { poolY }) makes every
//                                           lit part and every light pool of a place one mesh each (the pools poolY
//                                           over the ground, if the paving is raised); .evening() turns them up
//   bench(p, x, z, facing, { len, back })   slatted, on two stone legs; facing: the way a sitter looks (radians)
//   bins(p, x, z, facing)                   the sorted pair (cans and bottles, burnables) every Japanese street has
//   bollard(p, x, z)                        stone, with a steel cap
//   fingerSign(root, p, x, z, boards)       a post with pointing boards: [{ text, sub, dir: 1 | -1 }]
import * as THREE from 'three';
import { textTexture, plane, JP_FONT } from '../../props.js';
import { pools } from './parts.js';

export const STEEL = { dark: '#3e434d', mid: '#5b616b', pale: '#9aa0aa' };
const WOOD = '#9b958c',
  STONE = '#8b8d90';

// the lamps' lit parts share one material of their own, so the evening can turn them up without touching the
// lamps of other places
function glowMat() {
  return new THREE.MeshStandardMaterial({
    color: '#f4ede2',
    emissive: new THREE.Color('#ffd9a0'),
    emissiveIntensity: 0.35,
    roughness: 0.4,
  });
}

// the lit parts and light pools of all a place's lamps, gathered by lamps() and built once: one mesh of lanterns,
// one of pools, however many lamps
export function lightSet() {
  const glowParts = [],
    lit = [];
  return {
    glowParts,
    lit,
    build(root, { poolY } = {}) {
      const glow = glowMat();
      const glowMesh = new THREE.Mesh(mergeFlat(glowParts.map((g) => (g.index ? g.toNonIndexed() : g))), glow);
      glowMesh.castShadow = false;
      root.add(glowMesh);
      const poolMesh = pools(lit, 1, { k: 0.16, y: poolY });
      root.add(poolMesh);
      return {
        evening() {
          glow.emissiveIntensity = 2.6;
          glow.color.set('#fff3dc');
          poolMesh.userData.set(0.42);
        },
      };
    },
  };
}

// points: [[x, z], ...]. kind 'post': a slim pole with a lantern on top (courts, the plaza); 'arm': a taller pole
// with a short arm and a lit head over the road side (`dirs`: radians per point, default east); 'lantern': the
// lantern alone, standing on something `y` high (a gatepost). pool: the light pool's radius; poolShift moves it off
// the lamp's foot (toward the path it lights). The lit parts go into `set` (lightSet()).
export function lamps(set, p, points, { kind = 'post', dirs = [], pool = 0.95, y = 0, poolShift = [0, 0] } = {}) {
  const { glowParts, lit } = set;
  const lantern = (x, z, y0) => {
    p.geo(STEEL.dark, new THREE.CylinderGeometry(0.11, 0.07, 0.06, 8).translate(x, y0 + 0.03, z)); // collar
    glowParts.push(new THREE.CylinderGeometry(0.1, 0.1, 0.28, 8).translate(x, y0 + 0.2, z));
    p.geo(STEEL.dark, new THREE.CylinderGeometry(0.15, 0.13, 0.05, 8).translate(x, y0 + 0.365, z)); // cap
  };
  points.forEach(([x, z], i) => {
    if (kind === 'lantern') {
      lantern(x, z, y);
      lit.push([x + poolShift[0], z + poolShift[1], pool]);
      return;
    }
    p.box(STEEL.dark, 0.2, 0.08, 0.2, x, 0, z); // the base plate
    if (kind === 'post') {
      p.geo(STEEL.dark, new THREE.CylinderGeometry(0.035, 0.05, 2.3, 6).translate(x, 1.15 + 0.08, z));
      lantern(x, z, 2.37);
      lit.push([x + poolShift[0], z + poolShift[1], pool]);
    } else {
      const a = dirs[i] ?? 0,
        [ux, uz] = [Math.cos(a), -Math.sin(a)];
      p.geo(STEEL.dark, new THREE.CylinderGeometry(0.035, 0.055, 2.7, 6).translate(x, 1.35 + 0.08, z));
      const hx = x + ux * 0.42,
        hz = z + uz * 0.42;
      p.box(STEEL.dark, Math.abs(ux) * 0.44 + 0.05, 0.05, Math.abs(uz) * 0.44 + 0.05, x + ux * 0.2, 2.72, z + uz * 0.2);
      p.box(STEEL.dark, 0.36, 0.08, 0.36, hx, 2.66, hz, { ry: a });
      glowParts.push(new THREE.BoxGeometry(0.3, 0.07, 0.3).rotateY(a).translate(hx, 2.63, hz));
      lit.push([hx, hz, pool]);
    }
  });
  return set;
}

function mergeFlat(list) {
  let n = 0;
  for (const g of list) n += g.attributes.position.count;
  const P = new Float32Array(n * 3),
    N = new Float32Array(n * 3);
  let o = 0;
  for (const g of list) {
    P.set(g.attributes.position.array, o * 3);
    N.set(g.attributes.normal.array, o * 3);
    o += g.attributes.position.count;
    g.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  return g;
}

// a bench: facing is the way the sitter looks (0 = +z, south; Math.PI = north)
export function bench(p, x, z, facing = 0, { len = 1.6, back = true } = {}) {
  const c = Math.cos(facing),
    s = Math.sin(facing);
  // local (u across the seat, v toward where the sitter looks) to world
  const put = (color, w, h, d, u, y, v) =>
    p.box(color, w, h, d, x + u * c + v * s, y, z - u * s + v * c, { ry: facing });
  for (const u of [-len / 2 + 0.18, len / 2 - 0.18]) put(STONE, 0.12, 0.3, 0.42, u, 0, 0);
  for (let i = 0; i < 4; i++) put(WOOD, len, 0.04, 0.09, 0, 0.3, -0.16 + i * 0.105);
  if (back) {
    for (const u of [-len / 2 + 0.18, len / 2 - 0.18]) put(STEEL.mid, 0.04, 0.34, 0.04, u, 0.3, -0.24);
    for (let i = 0; i < 2; i++) put(WOOD, len, 0.08, 0.035, 0, 0.42 + i * 0.12, -0.25);
  }
}

// the sorted bins: two slim boxes with coloured openings (blue: cans and bottles; grey-green: burnables)
export function bins(p, x, z, facing = 0) {
  const c = Math.cos(facing),
    s = Math.sin(facing);
  [
    [-0.2, '#5d7896'],
    [0.2, '#6e8468'],
  ].forEach(([u, band]) => {
    const bx = x + u * c,
      bz = z - u * s;
    p.box('#8d939b', 0.34, 0.6, 0.3, bx, 0, bz, { ry: facing });
    p.box(band, 0.36, 0.08, 0.32, bx, 0.44, bz, { ry: facing });
    p.box('#3e434d', 0.2, 0.05, 0.02, bx + 0.155 * s, 0.5, bz + 0.155 * c, { ry: facing });
  });
}

export function bollard(p, x, z) {
  p.geo(STONE, new THREE.CylinderGeometry(0.08, 0.09, 0.5, 8).translate(x, 0.25, z));
  p.geo(STEEL.pale, new THREE.CylinderGeometry(0.085, 0.085, 0.05, 8).translate(x, 0.44, z));
}

// a finger sign: boards [{ text, sub, dir }] one above another, pointing east (dir 1) or west (-1); `turn` spins
// the whole sign about its post (radians, 0 = boards run along x)
export function fingerSign(root, p, x, z, boards, { turn = 0 } = {}) {
  p.geo(STEEL.dark, new THREE.CylinderGeometry(0.04, 0.05, 2.1, 6).translate(x, 1.05, z));
  p.geo(STEEL.dark, new THREE.CylinderGeometry(0.07, 0.07, 0.05, 6).translate(x, 2.12, z));
  boards.forEach(({ text, sub, dir = 1 }, i) => {
    const tex = textTexture(
      (ctx, w, h) => {
        ctx.fillStyle = '#3f4650';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#e8e9e6';
        ctx.textBaseline = 'middle';
        ctx.textAlign = dir > 0 ? 'left' : 'right';
        const x0 = dir > 0 ? 26 : w - 26;
        ctx.font = '600 50px sans-serif';
        ctx.fillText(text + (dir > 0 ? '  →' : ''), x0, h * 0.36, w - 60);
        if (dir < 0) {
          ctx.textAlign = 'left';
          ctx.fillText('←', 26, h * 0.36);
          ctx.textAlign = 'right';
        }
        ctx.globalAlpha = 0.72;
        ctx.font = '500 34px ' + JP_FONT;
        ctx.fillText(sub || '', x0, h * 0.76, w - 60);
      },
      512,
      128,
    );
    const b = plane(0.9, 0.22, tex);
    const y = 1.85 - i * 0.3,
      [bx, bz] = [x + Math.cos(turn) * dir * 0.47, z - Math.sin(turn) * dir * 0.47];
    b.position.set(bx + Math.sin(turn) * 0.021, y, bz + Math.cos(turn) * 0.021);
    b.rotation.y = turn;
    root.add(b);
    p.box(STEEL.dark, 0.94, 0.25, 0.035, bx, y - 0.125, bz, { ry: turn }); // the board itself, behind its face
  });
}
