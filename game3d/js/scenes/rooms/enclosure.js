import * as THREE from 'three';
import { wall, door } from '../../props.js';
import { patchMaterial, setSurface } from '../../look/procedural.js';

// The overview keeps its authored cutaway. Free interior cameras get the missing physical wall
// above that cut and a ceiling at the room's real height. Navigation and apertures are unchanged.
export function roomEnclosure(root, R, { color = '#ddd9d0', ceiling = '#d4d5d2' } = {}) {
  const full = new THREE.Group();
  full.name = 'follow-interior';
  full.visible = false;
  full.userData.followEnclosure = { height: R.h };
  full.userData.noLook = true; // Hidden walls must not change the overview's baked occlusion.
  full.userData.perfAnchor = true; // merged under this group by the draw-call pass, so they show and hide with it
  const materials = new Map();
  root.add(full);
  const put = (object, surface = 'plaster') => {
    object.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = false;
        const material = o.material;
        if (!materials.has(material)) {
          const own = material.clone();
          patchMaterial(own);
          materials.set(material, own);
        }
        o.material = materials.get(material);
        o.geometry = o.geometry.clone();
        setSurface(o.geometry, surface);
      }
    });
    full.add(object);
    return object;
  };
  const top = new THREE.Mesh(
    new THREE.PlaneGeometry(R.x1 - R.x0, R.z1 - R.z0),
    new THREE.MeshStandardMaterial({ color: ceiling, roughness: 0.95, emissive: ceiling, emissiveIntensity: 0.08 }),
  );
  top.rotation.x = Math.PI / 2;
  top.position.set((R.x0 + R.x1) / 2, R.h, (R.z0 + R.z1) / 2);
  put(top);
  return {
    group: full,
    add: put,
    wall(axis, a, b, c, cutHeight, t, { holes = [], top: trim } = {}, apertureHeight = 1.95) {
      if (cutHeight >= R.h) return;
      const openings = holes
        .map(([lo, hi, bottom, height]) => [
          lo,
          hi,
          Math.max(0, bottom - cutHeight),
          Math.max(0, (height === cutHeight ? apertureHeight : height) - cutHeight),
        ])
        .filter((hole) => hole[3] > hole[2]);
      const extension = wall(axis, a, b, c, R.h - cutHeight, t, { color, top: trim || color, holes: openings });
      extension.position.y = cutHeight;
      put(extension);
    },
    door(axis, lo, hi, c, height = 1.95) {
      const leaf = door(hi - lo, height, { windows: true });
      leaf.position.set(axis === 'x' ? (lo + hi) / 2 : c, 0, axis === 'x' ? c : (lo + hi) / 2);
      leaf.rotation.y = axis === 'z' ? Math.PI / 2 : Math.PI;
      put(leaf, 'door');
    },
  };
}
