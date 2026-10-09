import * as THREE from 'three';
import { rng } from '../outdoor/parts.js';
import { clippedHedge } from './planting-shapes.js';
import { rootBed } from './root-bed.js';
import { plantGeometry, plantTips, trunkName, hedgeGeometries } from '../outdoor/plant-models.js';

const inside = (x, z) => x >= -8 && x <= 33 && z >= -13 && z <= 19;

function branch(p, from, to, radius, tip) {
  const a = new THREE.Vector3(...from),
    b = new THREE.Vector3(...to),
    direction = b.clone().sub(a);
  const geometry = new THREE.CylinderGeometry(tip, radius, direction.length(), 6);
  geometry.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()),
  );
  geometry.translate(...a.add(b).multiplyScalar(0.5).toArray());
  p.geo('#77644b', geometry, { surf: 'bark' });
}

// Semantic replacement happens before Parts merges bark and leaves. Returning true suppresses the old plant.
export function streetPlanting() {
  const records = [];
  return {
    records,
    tree(p, plant) {
      const { species, x, z, scale: s, seed } = plant;
      if (!inside(x, z)) return false;
      const name = trunkName(species, seed),
        ry = seed * 2.39996;
      const modelled = !!plantGeometry(name);
      const baseY = rootBed(p, x, z, s, seed, { codeTrunk: !modelled });
      if (modelled) {
        // the Blender-built trunk (outdoor/plant-models.js), a crown mass at the end of each main limb
        records.push({ kind: 'tree', ...plant, baseY });
        p.geo('#77644b', plantGeometry(name, [x, baseY - 0.01, z], s, ry), { surf: 'bark', shade: true });
        const spread = species === 'ginkgo' ? 0.47 : species === 'sakura' ? 0.86 : 0.74;
        for (const [cx, cy, cz, k] of plantTips(name, [x, baseY, z], s, ry)) {
          if (k < 0.8 && species !== 'ginkgo') continue; // the twigs reach into a neighbouring crown
          const geometry = new THREE.IcosahedronGeometry(1, 0);
          geometry.scale(
            spread * 0.86 * k * s,
            (species === 'pine' ? 0.22 : 0.36) * Math.max(0.8, k) * s,
            spread * 0.86 * k * s,
          );
          geometry.rotateY(seed * 0.7 + cx);
          geometry.translate(cx, cy + 0.16 * s, cz);
          p.geo('#557b38', geometry, { surf: 'diorama-tree' });
        }
        return true;
      }
      records.push({ kind: 'tree', ...plant, baseY });
      const q = rng(seed + 415),
        narrow = species === 'ginkgo',
        pine = species === 'pine';
      const spread = narrow ? 0.47 : species === 'sakura' ? 0.86 : 0.74;
      const clear = pine ? 1.05 : 1.35;
      const fork = [x + (q() - 0.5) * 0.13 * s, clear * s, z];
      branch(p, [x, 0.03, z], fork, 0.12 * s, 0.07 * s);
      const crowns = [];
      for (let i = 0; i < 3; i++) {
        const angle = seed * 0.61 + (i * Math.PI * 2) / 3;
        const reach = spread * 0.65 * s;
        const end = [x + Math.cos(angle) * reach, (clear + 0.52 + q() * 0.12) * s, z + Math.sin(angle) * reach];
        branch(p, fork, end, 0.062 * s, 0.025 * s);
        crowns.push([end[0], end[1] + 0.22 * s, end[2], spread * 0.83 * s, (pine ? 0.22 : 0.34) * s]);
      }
      crowns.push([x, (clear + 1.02) * s, z, spread * 0.91 * s, 0.35 * s]);
      for (const [cx, cy, cz, radius, depth] of crowns) {
        const geometry = new THREE.IcosahedronGeometry(1, 0);
        geometry.scale(radius, depth, radius * (species === 'sakura' ? 0.88 : 1));
        geometry.rotateY(seed * 0.7);
        geometry.translate(cx, cy, cz);
        p.geo('#557b38', geometry, { surf: 'diorama-tree' });
      }
      return true;
    },
    hedge(p, hedge) {
      const { a, b, w, h, y } = hedge;
      if (!inside((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) return false;
      records.push({ kind: 'hedge', ...hedge });
      const plants = hedgeGeometries(a, b, hedge);
      if (plants) {
        for (const { geometry } of plants) p.geo('#3f633b', geometry, { surf: 'diorama-hedge', shade: true });
        return true;
      }
      const alongX = Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]);
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const geometry = clippedHedge(alongX ? length : w, h, alongX ? w : length);
      geometry.translate((a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2);
      p.geo('#3f633b', geometry, { surf: 'diorama-hedge' });
      return true;
    },
  };
}
