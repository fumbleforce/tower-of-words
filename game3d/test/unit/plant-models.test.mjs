// The Blender-built planting and bench (tools/grounds/planting.py, game3d/assets/outdoor/planting.glb; issue #362):
// every node the builders ask for is in the file, each trunk says where its crowns go, the triangle counts stay
// inside what a phone can draw across a planted court, and a hedge run is covered end to end by its plants.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'three')
      return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, context);
    if (specifier.startsWith('three/addons/'))
      return next(new URL('../../vendor/' + specifier.slice(13), import.meta.url).href, context);
    return next(specifier, context);
  },
});
Object.assign(globalThis, { location: { search: '' }, window: {} }); // what parts.js's imports read
const THREE = await import('three');
const { setPlantModels, hedgeGeometries, benchGeometries, plantTips, trunkName } = await import(
  '../../js/scenes/outdoor/plant-models.js'
);
const { Parts } = await import('../../js/scenes/outdoor/parts.js');

const NODES = {
  trunk_keyaki: 260, trunk_keyaki_b: 260, trunk_sakura: 240, trunk_sakura_b: 240, trunk_pine: 220,
  trunk_ginkgo: 200, trunk_maple: 200, bush_a: 80, bush_b: 80, bush_c: 80, hedge_a: 170, hedge_b: 170,
  hedge_c: 170, bench_end: 400, bench_end_low: 200, bench_seat: 220, bench_seat_low: 130,
};

function gltf() {
  const b = fs.readFileSync(new URL('../../assets/outdoor/planting.glb', import.meta.url));
  return JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString());
}

test('planting.glb has every node, within its triangle budget, and trunks list their crowns', (t) => {
  if (!fs.existsSync(new URL('../../assets/outdoor/planting.glb', import.meta.url))) return t.skip('asset not pulled');
  const j = gltf();
  for (const [name, most] of Object.entries(NODES)) {
    const node = j.nodes.find((n) => n.name === name);
    assert.ok(node, name);
    const prim = j.meshes[node.mesh].primitives[0];
    const tris = (prim.indices != null ? j.accessors[prim.indices].count : j.accessors[prim.attributes.POSITION].count) / 3;
    assert.ok(tris <= most, `${name}: ${tris} triangles, budget ${most}`);
    assert.ok(prim.attributes.COLOR_0 != null, `${name}: shading colours`);
    if (name.startsWith('trunk_')) assert.ok(JSON.parse(node.extras.tips).length >= 3, `${name}: crowns`);
  }
});

// stand-ins: a unit block for a hedge plant, a trunk with two tips, bench parts
const block = () => new THREE.BoxGeometry(1, 0.6, 0.5).translate(0, 0.3, 0);
setPlantModels({
  hedge_a: { geometry: block(), tips: [] },
  hedge_b: { geometry: block(), tips: [] },
  hedge_c: { geometry: block(), tips: [] },
  trunk_keyaki: { geometry: block(), tips: [[0.5, 1.8, 0, 1], [-0.5, 1.9, 0, 1]] },
  bench_end: { geometry: new THREE.BoxGeometry(0.05, 0.8, 0.5), tips: [] },
  bench_seat: { geometry: new THREE.BoxGeometry(1, 0.03, 0.4), tips: [] },
});

test('a hedge run is covered from end to end, along x and along z', () => {
  for (const [a, b] of [
    [[2, 5], [7.3, 5]],
    [[-1, 0], [-1, 3.2]],
  ]) {
    const plants = hedgeGeometries(a, b, { w: 0.4, h: 0.5, seed: 3 });
    const box = new THREE.Box3();
    for (const { geometry } of plants) box.union(geometry.computeBoundingBox() || geometry.boundingBox);
    const alongX = a[1] === b[1];
    const [lo, hi] = alongX ? [box.min.x, box.max.x] : [box.min.z, box.max.z];
    const [start, end] = alongX ? [a[0], b[0]] : [a[1], b[1]];
    assert.ok(Math.abs(lo - (start - 0.03)) < 1e-6, `starts at its end: ${lo}`);
    assert.ok(Math.abs(hi - (end + 0.03)) < 1e-6, `ends at its end: ${hi}`);
    assert.ok(box.max.y <= 0.5 * 1.04 + 1e-6 && box.max.y >= 0.5 * 0.95 - 1e-6, 'its height');
    const across = alongX ? box.max.z - box.min.z : box.max.x - box.min.x;
    assert.ok(Math.abs(across - 0.4) < 1e-6, `its width: ${across}`);
  }
});

test('crowns follow the trunk when it turns and scales', () => {
  const tips = plantTips(trunkName('keyaki', 2), [10, 0, 5], 2, Math.PI / 2);
  assert.equal(tips.length, 2);
  assert.ok(Math.abs(tips[0][0] - 10) < 1e-6 && Math.abs(tips[0][2] - 4) < 1e-6 && Math.abs(tips[0][1] - 3.6) < 1e-6);
});

test('the bench keeps its ends inside its length, and shading colours multiply the colour given', () => {
  const { iron, wood } = benchGeometries(1.6);
  iron.computeBoundingBox();
  wood.computeBoundingBox();
  assert.ok(Math.abs(wood.boundingBox.max.x - 0.8) < 1e-6);
  assert.ok(Math.abs(iron.boundingBox.max.x - (0.8 - 0.12 + 0.025)) < 1e-6);
  const g = new THREE.BoxGeometry(1, 1, 1);
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Array(g.attributes.position.count * 3).fill(0.25), 3));
  const p = new Parts();
  p.geo('#808080', g, { shade: true });
  const [mesh] = p.build(new THREE.Group());
  const c = mesh.geometry.attributes.color;
  assert.ok(Math.abs(c.getX(0) - new THREE.Color('#808080').r * 0.5) < 1e-6);
});
