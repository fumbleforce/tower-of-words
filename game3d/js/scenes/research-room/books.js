import * as THREE from 'three';
import { rbox } from '../../props.js';
import { REFERENCES, pageUrl } from '../../reading-room/pages.js';
import { bookLocations, currentPage, loadReading } from '../../reading-room/model.js';
import { SHELF, TABLE_PAGES, SEATS } from './plan.js';
const textures = new Map();
export function referenceTexture(page) {
  if (!textures.has(page)) {
    const t = new THREE.TextureLoader().load(pageUrl(page));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    textures.set(page, t);
  }
  return textures.get(page);
}
export function paperMesh(page, width = 0.34) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, (width * 940) / 900),
    new THREE.MeshStandardMaterial({ map: referenceTexture(page), roughness: 0.93, side: THREE.DoubleSide }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.name = `research-paper:${page}`;
  mesh.userData.noBatch = true;
  return mesh;
}
export function readingBooks(root) {
  const books = {};
  for (const [id, ref] of Object.entries(REFERENCES)) {
    const group = new THREE.Group();
    group.name = `research-book:${id}`;
    group.add(rbox(0.4, 0.034, 0.44, ref.color, { r: 0.005 }));
    group.add(rbox(0.376, 0.024, 0.415, '#ece7d6', { x: 0.006, y: 0.01, r: 0.002 }));
    const print = paperMesh(ref.pages[0], 0.355);
    print.position.y = 0.037;
    group.add(print);
    const bookmark = rbox(0.025, 0.004, 0.13, '#ba8a55', { x: 0.135, y: 0.044, z: 0.21, r: 0.001 });
    group.add(bookmark);
    root.add(group);
    books[id] = { group, print, bookmark };
  }
  const api = {
    books,
    sync(state) {
      const locations = bookLocations(state);
      for (const [id, prop] of Object.entries(books)) {
        const seated = locations[id] !== 'shelf',
          at = seated ? TABLE_PAGES[locations[id]] : SHELF[id];
        root.attach(prop.group);
        prop.group.position.set(...at);
        prop.group.rotation.set(0, seated ? Math.PI - SEATS[locations[id]].ry : 0, 0);
        prop.print.material.map = referenceTexture(seated ? currentPage(state) : REFERENCES[id].pages[state.pages[id]]);
        prop.bookmark.visible = state.marks[id] !== null;
      }
    },
  };
  api.sync(loadReading());
  return api;
}
