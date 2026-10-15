import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({ resolve(s, c, next) {
  if (s === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, c);
  if (s.startsWith('three/addons/')) return next(new URL('../../vendor/' + s.slice(13), import.meta.url).href, c);
  return next(s, c);
} });
globalThis.addEventListener = () => {};
globalThis.innerWidth = 1366; globalThis.innerHeight = 860;
globalThis.location = { search: '?q=0' };
globalThis.window = { addEventListener() {} };
globalThis.localStorage = { getItem: () => null };
const context = new Proxy({ measureText: () => ({ width: 100 }), createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) }, { get: (o, k) => o[k] ?? (() => {}) });
globalThis.document = { body: { classList: { contains: () => false, toggle() {} } }, documentElement: { style: { setProperty() {} } }, createElement: () => ({ getContext: () => context }) };
const THREE = await import('../../vendor/three/three.module.js');
const { buildSports } = await import('../../js/scenes/sports.js');
const D = await import('../../js/scenes/sports/deck-plan.js');
const P = await import('../../js/scenes/sports/plan.js');
const { GTAOPass } = await import('../../js/perf/gtao.js');
const { openPoolBasin } = await import('../../js/scenes/sports/pool-basin.js');

test('constructed sports scene has transparent water over an open basin and continuous dry rim', () => {
  const world = buildSports({ poolInterior: true });
  world.root.updateMatrixWorld(true);
  const water = world.root.getObjectByName('pool:water');
  assert.ok(water.material.transparent && !water.material.depthWrite && water.material.uniforms.uSwimmers.value.length === 3);
  assert.equal(water.position.y, .09);
  const ao = Object.create(GTAOPass.prototype); ao.scene=world.root; ao._visibilityCache=[];
  ao._overrideVisibility(); assert.equal(water.visible,false,'transparent water cannot become an opaque AO depth plane');
  ao._restoreVisibility(); assert.equal(water.visible,true,'normal color-pass visibility restores after AO');
  water.visible=false; ao._overrideVisibility(); ao._restoreVisibility(); assert.equal(water.visible,false,'an already hidden surface stays hidden'); water.visible=true;
  const [x0, x1, z0, z1] = D.WATER;
  const ray = new THREE.Raycaster();
  const hits = (x, z) => {
    const p = new THREE.Vector3(...[P.pt([x, z])[0], 2, P.pt([x, z])[1]]);
    world.root.localToWorld(p);
    ray.set(p, new THREE.Vector3(0, -1, 0));
    return ray.intersectObjects(world.root.children, true);
  };
  for (const x of [x0 + D.LANE_W * .5, x0 + D.LANE_W * 2.5, x0 + D.LANE_W * 5.5]) for (const z of [z0 + 2, (z0 + z1) / 2, z1 - 2]) {
    const found = hits(x, z), opaque = found.filter(h => !h.object.material.transparent);
    assert.ok(found.some(h => h.object === water));
    assert.ok(opaque.length && opaque[0].point.y < -1.17, `basin opening ${x},${z}: ${opaque.map(h => h.point.y)}`);
  }
  for (let i = 0; i < D.STEPS.n; i++) {
    const y = hits((D.STEPS.x0 + D.STEPS.x1)/2, D.STEPS.z1-D.STEPS.tread*(i+.5)).find(h => !h.object.material.transparent)?.point.y;
    assert.ok(Math.abs(y-(-.12-i*.35))<1e-5, 'actual supported steps descend below the surface');
  }
  for (const x of [x0 - .15, x1 + .15]) for (const z of [z0 - .15, z0 + .1, (z0 + z1) / 2, z1 - .1, z1 + .15]) {
    const top = hits(x, z).find(h => !h.object.material.transparent);
    assert.ok(top && top.point.y >= .069, 'side/corner coping remains continuous');
  }
  for (const z of [z0 - .15, z1 + .15]) for (const x of [x0 + .1, (x0 + x1) / 2, x1 - .1]) {
    assert.ok(hits(x, z).some(h => !h.object.material.transparent && h.point.y >= .069), 'end coping remains continuous');
  }
});

test('basin clipping preserves transformed exterior attributes, indexed material groups and sea prefix', () => {
  const root = new THREE.Group(), mesh = new THREE.Mesh();
  root.position.set(4, 3, -8); root.rotation.y = .37;
  mesh.name = 'skyline:ground'; mesh.position.set(2, .5, -3); mesh.rotation.y = -.21; mesh.scale.set(1.3, 1, .8); root.add(mesh);
  mesh.updateMatrix();
  const inverse = mesh.matrix.clone().invert();
  const [x0, z0] = P.pt([D.WATER[0], D.WATER[2]]), [x1, z1] = P.pt([D.WATER[1], D.WATER[3]]);
  const points = [[x0-2,z0-2],[x0-2,z1+2],[x1+2,z0-2],[x1+2,z1+2]];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(points.flatMap(([x,z]) => new THREE.Vector3(x,-.13,z).applyMatrix4(inverse).toArray()), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(points.flatMap(([x,z]) => [x*.2,z*.3]), 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(points.flatMap(() => [0,1,0]), 3));
  g.setIndex([0,1,2,2,1,3]); g.addGroup(0,3,0); g.addGroup(3,3,1);
  g.userData.seaSurfaceFaces = 1; g.userData.traversalSkipFaces = 1;
  mesh.geometry = g; openPoolBasin(root);
  const out = mesh.geometry, p = out.attributes.position, uv = out.attributes.uv;
  assert.deepEqual(out.groups.map(g => g.materialIndex), [0,1]);
  assert.equal(out.groups.reduce((n,g) => n+g.count,0), p.count);
  assert.equal(out.userData.seaSurfaceFaces, out.groups[0].count/3);
  assert.equal(out.userData.traversalSkipFaces, out.userData.seaSurfaceFaces);
  let area = 0;
  for (let i=0;i<p.count;i+=3) {
    const tri = [0,1,2].map(k => new THREE.Vector3().fromBufferAttribute(p,i+k).applyMatrix4(mesh.matrix));
    area += new THREE.Vector3().subVectors(tri[1],tri[0]).cross(new THREE.Vector3().subVectors(tri[2],tri[0])).length()/2;
    const center = tri.reduce((v,p) => v.add(p),new THREE.Vector3()).multiplyScalar(1/3);
    assert.ok(center.x <= x0+1e-5 || center.x >= x1-1e-5 || center.z <= z0+1e-5 || center.z >= z1-1e-5, 'no triangle refills the opening');
    for (let k=0;k<3;k++) {
      assert.ok(Math.abs(uv.getX(i+k)-tri[k].x*.2)<1e-5 && Math.abs(uv.getY(i+k)-tri[k].z*.3)<1e-5, 'UVs retain their exterior affine alignment');
      assert.equal(out.attributes.normal.getY(i+k),1);
    }
  }
  assert.ok(Math.abs(area-((x1-x0+4)*(z1-z0+4)-(x1-x0)*(z1-z0)))<1e-4, 'only exact footprint area removed');
});
