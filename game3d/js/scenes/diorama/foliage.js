import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { addCanopyCore, leafCluster } from './canopy.js';
import { rng } from '../outdoor/parts.js';

const within = (r, x, z) => !r || (x >= r[0] && x <= r[1] && z >= r[2] && z <= r[3]);

// Sample the actual crowns and hedge surfaces. Their silhouettes, clearances and tree locations stay put.
// bounds: [x0, x1, z0, z1] in root's frame, the crowns dressed (everything when null), up to maxY; focus: where the
// leaf cards gather (2.5 times as dense as elsewhere; evenly when null), and none outside cardBounds (when given: the
// crowns there get the core alone, far from where the camera goes); leaves: false lays the crown core alone (a
// phone, which never shows the cards); skip(o): meshes left as they are (a part another pass has dressed already)
export function dressFoliage(
  root,
  {
    budget = 55000,
    tileSize = 4,
    leafShadows = true,
    leafScale = 1,
    sun,
    phone = false,
    bounds = null,
    focus = null,
    maxY = 6,
    cardBounds = null,
    leaves: cards = true,
    skip = null,
  } = {},
) {
  root.updateWorldMatrix(true, true);
  const q = rng(711),
    samples = [],
    faces = [],
    remove = [],
    a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3();
  const normal = new THREE.Vector3(),
    ab = new THREE.Vector3(),
    ac = new THREE.Vector3();
  const inverse = root.matrixWorld.clone().invert();
  root.traverse((o) => {
    if (
      o.parent?.name === 'diorama-station-fittings' ||
      !o.isMesh ||
      !['foliage', 'diorama-tree', 'diorama-hedge'].includes(o.userData.surf) ||
      !o.visible ||
      !o.layers.isEnabled(0) ||
      skip?.(o)
    )
      return;
    const g = o.geometry,
      position = g.attributes.position,
      index = g.index;
    const transform = new THREE.Matrix4().multiplyMatrices(inverse, o.matrixWorld);
    const count = index ? index.count : position.count,
      keep = [];
    for (let i = 0; i < count; i += 3) {
      a.fromBufferAttribute(position, index ? index.getX(i) : i).applyMatrix4(transform);
      b.fromBufferAttribute(position, index ? index.getX(i + 1) : i + 1).applyMatrix4(transform);
      c.fromBufferAttribute(position, index ? index.getX(i + 2) : i + 2).applyMatrix4(transform);
      const center = a
        .clone()
        .add(b)
        .add(c)
        .multiplyScalar(1 / 3);
      const inside = within(bounds, center.x, center.z) && center.y <= maxY;
      const canopy = center.y > 0.12 && (Math.max(a.y, b.y, c.y) - Math.min(a.y, b.y, c.y) > 0.025 || center.y > 0.38);
      if (!inside || !canopy) {
        keep.push(index ? index.getX(i) : i, index ? index.getX(i + 1) : i + 1, index ? index.getX(i + 2) : i + 2);
        continue;
      }
      ab.subVectors(b, a);
      ac.subVectors(c, a);
      normal.crossVectors(ab, ac);
      const area = normal.length() / 2;
      normal.normalize();
      faces.push({
        a: a.clone(),
        b: b.clone(),
        c: c.clone(),
        n: normal.clone(),
        area,
        kind: o.userData.surf,
        weight:
          (normal.y < -0.25 ? 0.1 : normal.y > 0.4 ? 1.35 : 1) *
          (!focus ? 1 : within(focus, center.x, center.z) ? 2.5 : 0.8) *
          (within(cardBounds, center.x, center.z) ? 1 : 0),
      });
    }
    if (!keep.length) {
      remove.push(o);
      return;
    }
    const smooth = o.geometry.clone();
    smooth.setIndex(keep);
    smooth.deleteAttribute('normal');
    o.geometry = mergeVertices(smooth, 0.0001);
    o.geometry.computeVertexNormals();
    smooth.dispose();
  });
  for (const mesh of remove) mesh.removeFromParent();
  // Distribute the budget across all eligible crowns, rather than exhausting it on the first mesh.
  const density = cards ? Math.min(210, budget / faces.reduce((sum, f) => sum + f.area * f.weight, 0)) : 0;
  for (const f of faces) {
    for (let j = 0, count = Math.floor(f.area * f.weight * density + q()); j < count; j++) {
      const u = Math.sqrt(q()),
        v = q();
      const p = f.a
        .clone()
        .multiplyScalar(1 - u)
        .addScaledVector(f.b, u * (1 - v))
        .addScaledVector(f.c, u * v)
        .addScaledVector(f.n, (q() - 0.2) * 0.04);
      const clump = Math.sin(p.x * 6.3 + p.y * 4.7) * Math.cos(p.z * 5.9 - p.y * 2.7);
      const inner = q() < 0.28,
        spread = f.kind === 'diorama-tree' ? 0.04 : 0.008;
      p.addScaledVector(f.n, spread * clump * 0.5 + (f.kind === 'diorama-hedge' ? 0.009 : 0.035) + q() * 0.01);
      const tilt = f.n
        .clone()
        .add(
          new THREE.Vector3(
            (q() - 0.5) * 0.7,
            (f.kind === 'diorama-hedge' ? 0.1 : 0.3) + (q() - 0.5) * 0.3,
            (q() - 0.5) * 0.7,
          ),
        )
        .normalize();
      samples.push({
        p,
        n: tilt,
        scale:
          (0.88 + q() * 0.25) * leafScale * (f.kind === 'diorama-tree' ? 1 : f.kind === 'diorama-hedge' ? 0.44 : 0.65),
        tree: f.kind === 'diorama-tree',
        angle: q() * Math.PI * 2,
        tone: (inner ? 0.12 : 0.55) + 0.2 * clump + (q() - 0.5) * 0.25,
      });
    }
  }
  addCanopyCore(root, faces, sun, phone);
  const material = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: leafCluster(),
    alphaTest: 0.4,
    roughness: 0.9,
    side: THREE.DoubleSide,
  });
  material.userData.noLook = true;
  const tiles = new Map();
  for (const sample of samples) {
    const key = Math.floor(sample.p.x / tileSize) + ':' + Math.floor(sample.p.z / tileSize);
    if (!tiles.has(key)) tiles.set(key, []);
    tiles.get(key).push(sample);
  }
  const geometry = new THREE.PlaneGeometry(0.26, 0.3).rotateX(-Math.PI / 2);
  const matrix = new THREE.Matrix4(),
    rotation = new THREE.Quaternion(),
    roll = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0),
    scale = new THREE.Vector3(),
    color = new THREE.Color();
  const colors = ['#405c28', '#537132', '#678740', '#799648', '#8ca556'];
  for (const [key, tile] of tiles) {
    const leaves = new THREE.InstancedMesh(geometry, material, tile.length);
    leaves.name = 'diorama-leaves-' + key;
    leaves.userData.noLook = true;
    leaves.userData.noBatch = true;
    // Every lower-detail prefix covers the complete tile, instead of its first source crown.
    for (let i = tile.length - 1; i > 0; i--) {
      const j = Math.floor(q() * (i + 1));
      [tile[i], tile[j]] = [tile[j], tile[i]];
    }
    tile.forEach((s, i) => {
      rotation.setFromUnitVectors(up, s.n).multiply(roll.setFromAxisAngle(up, s.angle));
      matrix.compose(s.p, rotation, scale.setScalar(s.scale));
      leaves.setMatrixAt(i, matrix);
      color.set(
        (s.tree ? colors : ['#315837', '#436b39', '#517a3d', '#638944', '#78984b'])[
          Math.max(0, Math.min(4, Math.floor(s.tone * 5)))
        ],
      );
      leaves.setColorAt(i, color);
    });
    leaves.castShadow = leafShadows;
    leaves.receiveShadow = true;
    leaves.computeBoundingSphere();
    root.add(leaves);
  }
  return { count: samples.length, tiles: tiles.size };
}
