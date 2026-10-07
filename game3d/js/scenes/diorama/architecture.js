import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { roundedBox } from '../../perf/rounded-box.js';

// Station trim is authored as merged axis-aligned boxes. Round each piece independently so the
// window openings, roof fittings and facade fade keep their original positions and ownership.
export function softenStation(root) {
  const names = new Set(['station:trim', 'station:frame', 'station:roof']);
  let pieces = 0;
  root.traverse((mesh) => {
    if (!mesh.isMesh || Array.isArray(mesh.material)) return;
    if (!names.has(mesh.name) && mesh.material.color?.getHexString() !== 'b3b9c0') return;
    const source = mesh.geometry,
      positions = source.attributes.position;
    if (!source.index || positions.count % 24 || source.index.count !== (positions.count / 24) * 36) return;
    const boxes = [],
      bounds = new THREE.Box3(),
      point = new THREE.Vector3(),
      size = new THREE.Vector3(),
      center = new THREE.Vector3();
    for (let start = 0; start < positions.count; start += 24) {
      bounds.makeEmpty();
      for (let i = start; i < start + 24; i++) bounds.expandByPoint(point.fromBufferAttribute(positions, i));
      bounds.getSize(size);
      bounds.getCenter(center);
      const radius = Math.min(0.035, size.x * 0.25, size.y * 0.25, size.z * 0.25);
      boxes.push(roundedBox(size.x, size.y, size.z, 1, radius).translate(center.x, center.y, center.z));
    }
    mesh.geometry = mergeGeometries(boxes);
    mesh.userData.dioramaGeometry = { low: source, high: mesh.geometry };
    mesh.userData.noBatch = true;
    boxes.forEach((g) => g.dispose());
    pieces += boxes.length;
  });
  return pieces;
}

// Keep the tower's structural and cutaway meshes. Broader floor bands and shallow glass reveals
// give its large facade panels depth without changing doors or the lobby's usable footprint.
export function finishOffice(root) {
  root.traverse((mesh) => {
    if (!mesh.isMesh || !/^ho:(frame|glass|gfGlass|lobbyGlass)/.test(mesh.name)) return;
    const isFrame = /^ho:frame/.test(mesh.name);
    const geometry = mesh.geometry.clone(),
      positions = geometry.attributes.position;
    if (!geometry.index || positions.count % 24) return;
    const bounds = new THREE.Box3(),
      point = new THREE.Vector3(),
      size = new THREE.Vector3();
    for (let start = 0; start < positions.count; start += 24) {
      bounds.makeEmpty();
      for (let i = start; i < start + 24; i++) bounds.expandByPoint(point.fromBufferAttribute(positions, i));
      bounds.getSize(size);
      if (isFrame && size.y < 0.46 && bounds.min.y > 2.2 && bounds.max.y < 10 && Math.max(size.x, size.z) > 1) {
        const middle = (bounds.min.y + bounds.max.y) / 2;
        const half = size.y < 0.15 ? 0.22 : 0.34;
        for (let i = start; i < start + 24; i++)
          positions.setY(i, middle + (positions.getY(i) < middle ? -half : half));
      }
      if (!isFrame && size.z < 0.12 && Math.abs(bounds.max.z) < 0.12) {
        for (let i = start; i < start + 24; i++) positions.setZ(i, positions.getZ(i) - 0.07);
      }
    }
    positions.needsUpdate = true;
    geometry.computeBoundingSphere();
    mesh.geometry = geometry;
    if (isFrame) {
      mesh.material = mesh.material.clone();
      mesh.material.color.set('#c6c9c4');
      mesh.material.roughness = 0.82;
      mesh.material.userData.noLook = mesh.userData.noLook = true;
    }
  });
}
