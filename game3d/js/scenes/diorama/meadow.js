import * as THREE from 'three';
import { southLinkFrame } from '../forecourt/south-link.js';
import { rng } from '../outdoor/parts.js';

export function meadowDetail(root, nav, { budget = 10000, shadows = true } = {}) {
  const trees = (root.userData.dioramaPlanting || []).filter((plant) => plant.kind === 'tree');
  const nearRoot = (p) =>
    trees.reduce((near, tree) => Math.min(near, Math.hypot(p.x - tree.x, p.z - tree.z) / tree.scale), Infinity);
  const q = rng(1207),
    spots = [],
    faces = [],
    rootInverse = root.matrixWorld.clone().invert();
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3(),
    normal = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isMesh || !o.visible || !o.layers.isEnabled(0) || !['foliage', 'grass', 'soil'].includes(o.userData.surf))
      return;
    const g = o.geometry,
      p = g.attributes.position,
      index = g.index,
      t = new THREE.Matrix4().multiplyMatrices(rootInverse, o.matrixWorld);
    for (let i = 0, n = index ? index.count : p.count; i < n; i += 3) {
      a.fromBufferAttribute(p, index ? index.getX(i) : i).applyMatrix4(t);
      b.fromBufferAttribute(p, index ? index.getX(i + 1) : i + 1).applyMatrix4(t);
      c.fromBufferAttribute(p, index ? index.getX(i + 2) : i + 2).applyMatrix4(t);
      if (
        Math.max(a.x, b.x, c.x) < 3 ||
        Math.min(a.x, b.x, c.x) > 27 ||
        Math.max(a.z, b.z, c.z) < -0.5 ||
        Math.min(a.z, b.z, c.z) > 16 ||
        (a.y + b.y + c.y) / 3 > 0.43
      )
        continue;
      normal.crossVectors(b.clone().sub(a), c.clone().sub(a));
      const area = normal.length() / 2;
      normal.normalize();
      if (normal.y < 0.8) continue;
      faces.push({ a: a.clone(), b: b.clone(), c: c.clone(), area });
    }
  });
  const path = southLinkFrame('forecourt').walk;
  let accepted = 0;
  for (const f of faces)
    for (let j = 0, count = Math.floor(f.area * 240 + q()); j < count; j++) {
      const u = Math.sqrt(q()),
        v = q();
      const p = f.a
        .clone()
        .multiplyScalar(1 - u)
        .addScaledVector(f.b, u * (1 - v))
        .addScaledVector(f.c, u * v);
      if (p.x < 3 || p.x > 27 || p.z < -0.5 || p.z > 16) continue;
      if (p.x > path[0] && p.x < path[1] && p.z > path[2]) continue;
      if (p.y <= 0.04 && nav.extra(p.x, p.z)) continue;
      const patch = Math.sin(p.x * 2.1 + Math.cos(p.z * 1.3)) + Math.cos(p.z * 2.3 - Math.sin(p.x * 1.5));
      const ring = Math.exp(-Math.pow((nearRoot(p) - 0.8) / 0.45, 2));
      if (patch < -0.95 || q() > 0.18 + 0.82 * ring) continue;
      accepted++;
      if (spots.length < budget) spots.push(p);
      else {
        const slot = Math.floor(q() * accepted);
        if (slot < spots.length) spots[slot] = p;
      }
    }
  const vertices = [],
    shades = [];
  for (let blade = 0; blade < 5; blade++) {
    const angle = blade * 2.4,
      height = 0.04 + blade * 0.009;
    const x = Math.cos(angle) * 0.03,
      z = Math.sin(angle) * 0.03;
    const bend = new THREE.Vector3(Math.cos(angle) * 0.035, height, Math.sin(angle) * 0.035);
    vertices.push(x - 0.016, 0, z, x + 0.016, 0, z, bend.x, bend.y, bend.z);
    shades.push(0.55, 0.65, 0.45, 0.55, 0.65, 0.45, 1, 1, 0.8);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(shades, 3));
  g.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    vertexColors: true,
    side: THREE.DoubleSide,
    roughness: 1,
  });
  m.userData.noLook = true;
  const mesh = new THREE.InstancedMesh(g, m, spots.length);
  mesh.name = 'diorama-meadow';
  mesh.userData.noBatch = true;
  mesh.userData.noLook = true;
  const t = new THREE.Object3D(),
    color = new THREE.Color(),
    greens = ['#546f32', '#6a873b', '#80964a', '#789343'];
  spots.forEach((p, i) => {
    t.position.copy(p);
    t.rotation.y = q() * Math.PI * 2;
    const patch = 0.5 + 0.5 * Math.sin(p.x * 1.8 + Math.cos(p.z * 2.4));
    t.scale.set(0.95 + q() * 0.4, 0.55 + patch * 0.55 + q() * 0.3, 0.95 + q() * 0.4);
    t.updateMatrix();
    mesh.setMatrixAt(i, t.matrix);
    mesh.setColorAt(i, color.set(greens[i % 4]));
  });
  mesh.castShadow = shadows;
  mesh.receiveShadow = true;
  mesh.computeBoundingSphere();
  root.add(mesh);
  const flowers = [];
  for (let i = 0; i < spots.length; i += 9) {
    const p = spots[i];
    // Loose patches leave mown ground between them; all roots lie on sampled planting surfaces.
    if (nearRoot(p) < 1.35 && Math.sin(p.x * 2.2) + Math.cos(p.z * 1.7) > 0.35) flowers.push(p);
  }
  const flowerVertices = [];
  for (let j = 0; j < 5; j++) {
    const angle = (j * Math.PI * 2) / 5,
      cx = Math.cos(angle) * 0.021,
      cz = Math.sin(angle) * 0.021;
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2,
        b = ((k + 1) * Math.PI) / 2;
      flowerVertices.push(
        cx,
        0.065,
        cz,
        cx + Math.cos(a) * 0.018,
        0.058,
        cz + Math.sin(a) * 0.018,
        cx + Math.cos(b) * 0.018,
        0.058,
        cz + Math.sin(b) * 0.018,
      );
    }
  }
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.Float32BufferAttribute(flowerVertices, 3));
  fg.computeVertexNormals();
  const fm = new THREE.MeshStandardMaterial({
    color: '#fff3d9',
    side: THREE.DoubleSide,
    roughness: 0.9,
  });
  fm.userData.noLook = true;
  const blooms = new THREE.InstancedMesh(fg, fm, flowers.length);
  blooms.name = 'diorama-meadow-flowers';
  blooms.userData.noBatch = true;
  flowers.forEach((p, i) => {
    t.position.copy(p);
    t.rotation.y = q() * Math.PI * 2;
    t.scale.setScalar(0.75 + q() * 0.55);
    t.updateMatrix();
    blooms.setMatrixAt(i, t.matrix);
  });
  blooms.receiveShadow = true;
  blooms.computeBoundingSphere();
  root.add(blooms);
  return { grass: spots.length, flowers: flowers.length };
}
