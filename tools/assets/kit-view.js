// One world piece for the viewer and the thumbnail renderer (viewer.js buildAsset, view.type 'piece'): calls the
// game's own builder with the variant's arguments from tools/assets/kit.json and builds whatever collectors it
// filled. Tokens in args: $p a Parts collector, $sets blockSets(), $face the south face of a 4 x 2 block, $set a
// lightSet(), $root the preview group, $kit a dorms Kit. `then` calls methods on what the builder returns;
// `nook` builds one nook kit through outdoor/nooks.js; `surface` shows one of look/'s surface kinds on a block.
import * as THREE from 'three';

const G = new URL('../../game3d/js/', import.meta.url).href;
const mod = (p) => import(G + p);

export async function buildPiece(view) {
  const root = new THREE.Group();
  if (view.nook) await nook(view.nook, root);
  else if (view.surface) await surface(view, root);
  else await call(view, root);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = o.castShadow !== false; o.receiveShadow = true; } });
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  if (box.isEmpty()) throw new Error('the builder made nothing to show');
  const g = new THREE.Group();
  g.add(root);
  root.position.y -= Math.min(box.min.y, 0); // stand it on the floor
  return { object: g, actions: [], play() {}, update() {} };
}

async function call(view, root) {
  const m = await mod(view.file);
  const fn = m[view.fn];
  if (typeof fn !== 'function') throw new Error(`${view.file} has no function ${view.fn}`);
  const made = {};
  const need = async (k) => {
    if (made[k]) return made[k];
    if (k === '$p') { const { Parts } = await mod('scenes/outdoor/parts.js'); made[k] = new Parts(); }
    if (k === '$sets' || k === '$face') made.$sets ||= (await mod('scenes/outdoor/block.js')).blockSets();
    if (k === '$face') { const { faces } = await mod('scenes/outdoor/block-face.js'); made[k] = faces([-2, 2, -1, 1]).s; }
    if (k === '$set') made[k] = (await mod('scenes/outdoor/furniture.js')).lightSet();
    if (k === '$kit') { const { Kit } = await mod('scenes/dorms/kit.js'); made[k] = new Kit(); }
    if (k === '$root') made[k] = root;
    return made[k];
  };
  const resolve = async (a) => (typeof a === 'string' && a.startsWith('$') ? need(a) : a);
  const args = [];
  for (const a of view.args || []) args.push(await resolve(a)); // one at a time: $sets and $face share one set
  const many = async (list) => { const out = []; for (const a of list) out.push(await resolve(a)); return out; };
  // a face-based builder takes the sets and a face; the parapet takes the plain collector of those sets
  if (view.args?.includes('$face') && view.args[0] === '$p') args[0] = made.$sets.p;
  let out = fn(...args);
  if (out && typeof out.next === 'function') for (let s = out.next(); !s.done; s = out.next()) out = s.value;
  for (const [method, margs] of view.then || []) out[method](...(await many(margs)));
  if (out && out.isObject3D && !out.parent) root.add(out);
  if (made.$p) made.$p.build(root);
  if (made.$sets) (await mod('scenes/outdoor/block.js')).buildBlockSets(made.$sets, root);
  // a stone lantern lights no pool of its own; the places that use it add one (outdoor/nooks.js)
  if (made.$set && !made.$set.lit.length) made.$set.lit.push([0, 0, 0.55]);
  if (made.$set) made.$set.build(root);
  if (made.$kit) made.$kit.flush(root);
}

async function nook(n, root) {
  const { buildNooks } = await mod('scenes/outdoor/nooks.js');
  const { Parts } = await mod('scenes/outdoor/parts.js');
  // a paving pad under it, so it reads as a spot on the ground; Eric would stand at the front edge looking in
  // (north), so the camera sees the nook the way he does
  const p = new Parts();
  p.box('#8e8a86', 4.2, 0.02, 3.6, 0, 0, -1.5, { cast: false });
  p.build(root);
  buildNooks([{ id: 'preview', at: [0, 0], face: Math.PI, walks: [], ...n }], root);
}

async function surface(view, root) {
  const { setSurface, patchMaterial } = await mod('look/procedural.js');
  const g = new THREE.BoxGeometry(1, 0.6, 1, 8, 8, 8).translate(0, 0.3, 0);
  setSurface(g, view.surface);
  const m = new THREE.MeshStandardMaterial({ color: view.color || '#999999', roughness: 0.8 });
  patchMaterial(m);
  root.add(new THREE.Mesh(g, m));
}
