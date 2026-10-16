import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({ resolve(s, c, next) {
  if (s === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, c);
  if (s.startsWith('three/addons/')) return next(new URL('../../vendor/' + s.slice(13), import.meta.url).href, c);
  return next(s, c);
} });
globalThis.location ||= { search: '?plainlook' };
const THREE = await import('../../vendor/three/three.module.js');
const { shell } = await import('../../js/scenes/rooms/shell.js');
const { INTERIOR_CEILING, ceilingHeight } = await import('../../js/scenes/rooms/enclosure.js');
const { dormEnclosures } = await import('../../js/scenes/dorms/enclosure.js');

const hit = (group, from, direction) => new THREE.Raycaster(new THREE.Vector3(...from), new THREE.Vector3(...direction)).intersectObject(group, true).length > 0;

test('low overview rooms have continuous upper walls on all four sides without closing authored openings', () => {
  const root = new THREE.Group();
  shell(root, { x0: -2, x1: 2, z0: -4, z1: 0, h: 1.4, near: .3, t: .1 }, {
    holes: { s: [[-.4, .4, 0, .3]], n: [[-.6, .6, .5, 1.1]] },
  });
  const full = root.getObjectByName('follow-interior');
  assert.equal(full.userData.followEnclosure.height, INTERIOR_CEILING);
  full.visible = true; root.updateMatrixWorld(true);
  // 1.6: above the near wall's door, which stands 1.5 high (movement/clearance.js), so the probe never sits on its top edge
  for (const y of [1.6, 2.8, INTERIOR_CEILING - .05]) {
    for (const direction of [[1,0,0], [-1,0,0], [0,0,1], [0,0,-1]]) {
      assert.ok(hit(full, [0,y,-2], direction), `wall at height ${y}, direction ${direction}`);
    }
  }
  assert.equal(hit(root, [0,.8,-2], [0,0,1]), false, 'door opening stays clear');
  assert.equal(hit(root, [0,.8,-2], [0,0,-1]), false, 'window opening stays clear');
  assert.ok(hit(full, [0,2.8,-2], [0,1,0]), 'ceiling above neutral camera');
  assert.equal(ceilingHeight({h:4.2}), 4.2, 'already tall rooms keep their height');
});

test('dorm front and every perimeter join the higher ceiling in local and translated rooms', () => {
  const root = new THREE.Group(), front = new THREE.Group(), upper = new THREE.Group();
  upper.position.x = 40; root.add(upper);
  const sharedFront = new THREE.Group(); upper.add(sharedFront);
  dormEnclosures(root, front, {fronts: [{group:sharedFront, x0:39, x1:41}]});
  root.updateMatrixWorld(true);
  const groups = [];
  root.traverse(o => { if(o.userData.followEnclosure) groups.push(o); });
  assert.equal(groups.length, 2);
  for(const group of groups) {
    group.visible = true;
    const x = group.parent.position.x;
    for(const direction of [[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]]) assert.ok(hit(group,[x,2.8,-1],direction));
    assert.ok(hit(group,[x,2.8,-1],[0,1,0]));
  }
});

test('changing pavilion closes every upper perimeter and partition junction without blocking either exit', async () => {
  const { buildChangingRoom } = await import('../../js/scenes/sports/changing-room.js');
  const { PAVILION, PAV_DOOR_Z } = await import('../../js/scenes/sports/plan.js');
  const { MEN_X, WOMEN_X } = await import('../../js/scenes/sports/deck-plan.js');
  const { Parts } = await import('../../js/scenes/outdoor/parts.js');
  const root = new THREE.Group(), parts = new Parts();
  globalThis.document = { createElement: () => ({ getContext: () => new Proxy({}, { get: () => () => {} }) }) };
  buildChangingRoom(parts, {field(){}}, {card(){}}, {glowParts:[],lit:[]}, root);
  parts.build(root);
  root.updateMatrixWorld(true);
  const full = root.getObjectByName('follow-interior');
  full.visible=true;
  const [x0,x1,z0,z1]=PAVILION;
  const x=(x0+x1)/2;
  for(const direction of [[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]]) assert.ok(hit(full,[x,2.8,z0+1],direction));
  for(const doorX of [MEN_X,WOMEN_X]) assert.equal(hit(root,[doorX,1,z1-.4],[0,0,1]),false);
  assert.equal(hit(root,[x0+.4,1,PAV_DOOR_Z],[-1,0,0]),false);
});
