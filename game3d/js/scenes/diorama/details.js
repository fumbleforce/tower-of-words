import * as THREE from 'three';
import { Parts, rng } from '../outdoor/parts.js';
import { addOccluder } from '../occluders.js';
import { STATION } from '../station-exterior.js';

// Fittings are fixed to the station's existing east wall, outside the bicycle aisle.
export function streetDetails(root, station, environment) {
  const p = new Parts(),
    q = rng(411),
    x = STATION.x1;
  const foliage = { surf: 'foliage' },
    metal = { surf: 'metal' },
    stone = { surf: 'stone' };
  for (const z of [STATION.zN + 0.35, STATION.zS - 0.35]) {
    p.geo('#686d67', new THREE.CylinderGeometry(0.035, 0.035, 3.72, 8).translate(x + 0.085, 1.86, z), metal);
    for (const y of [0.18, 1.5, 2.85]) p.box('#454e48', 0.1, 0.035, 0.13, x + 0.085, y, z, metal);
    p.box('#303830', 0.4, 0.012, 0.46, x + 0.32, 0.012, z, { cast: false });
    for (let j = 0; j < 9; j++) p.box('#737b75', 0.37, 0.013, 0.021, x + 0.32, 0.025, z - 0.19 + j * 0.047, metal);
  }
  // Upper windows are spaced by the station builder's existing five-bay rhythm.
  for (let bay = 0; bay < 5; bay++) {
    const z = STATION.zN + 1.8 * (bay + 0.5);
    p.box('#737267', 0.28, 0.2, 1.12, x + 0.19, 2.12, z, stone);
    p.box('#3d362a', 0.22, 0.014, 1.02, x + 0.19, 2.321, z, { cast: false });
    for (let j = 0; j < 12; j++) {
      const zz = z - 0.47 + j * 0.085,
        xx = x + 0.18 + (q() - 0.5) * 0.12;
      for (let leaf = 0; leaf < 8; leaf++) {
        const g = new THREE.CircleGeometry(0.075, 5)
          .scale(0.65, 1.5, 1)
          .rotateX(-Math.PI / 2 + (q() - 0.5))
          .rotateY(q() * Math.PI * 2)
          .translate(xx + (q() - 0.5) * 0.15, 2.36 + q() * 0.16, zz + (q() - 0.5) * 0.13);
        p.geo(leaf % 3 ? '#678a42' : '#436830', g, {
          ...foliage,
          opts: { side: THREE.DoubleSide },
        });
      }
      if (j % 3 === 0)
        p.geo('#e8d694', new THREE.IcosahedronGeometry(0.035, 1).translate(xx + 0.04, 2.5, zz), { cast: false });
    }
  }
  // Keep upper fittings on the same visibility and fade lifecycle as their facade.
  const detailRoot = new THREE.Group();
  detailRoot.name = 'diorama-station-fittings';
  const meshes = p.build(detailRoot);
  root.add(detailRoot);
  for (const [i, mesh] of meshes.entries()) {
    mesh.name = 'diorama-station-detail-' + i;
    mesh.userData.noBatch = true;
    mesh.material = mesh.material.clone();
    mesh.material.userData.noLook = true;
    if (mesh.userData.surf === 'metal') {
      mesh.material.metalness = 0.72;
      mesh.material.roughness = 0.27;
      mesh.material.envMap = environment;
      mesh.material.envMapIntensity = 0.8;
    }
  }
  const facade = station.occ.occluders.find((o) => o.name.startsWith('station'));
  if (facade) addOccluder(station.occ, meshes, facade.test, { name: 'diorama-station' });

  return meshes.length;
}
