import test from 'node:test';
import assert from 'node:assert/strict';
import { inFront, blocking, reactionMemory } from '../../js/crowd/social-rules.js';
import { CROWD_TALK } from '../../story/crowd.js';

test('jump reactions are local and in front, not from the other side of the street', () => {
  const p = { x: 0, z: 0, yaw: 0 };
  assert(inFront(p, { x: 0, z: 1 }, 2));
  assert(!inFront(p, { x: 0, z: -1 }, 2));
  assert(!inFront(p, { x: 0, z: 3 }, 2));
});
test('obstruction requires the player on the attempted route and pedestrian slowed', () => {
  const p = { x: 0, z: 0 };
  assert(blocking(p, { x: 0, z: 0.8 }, [0, 5], 0));
  assert(!blocking(p, { x: 1, z: 0.8 }, [0, 5], 0));
  assert(!blocking(p, { x: 0, z: -0.8 }, [0, 5], 0));
  assert(!blocking(p, { x: 0, z: 0.8 }, [0, 5], 1));
  assert(!blocking(p, { x: 0, z: 0.8 }, null, 0));
});
test('crowd takes turns and only repeated close jumping earns annoyed line', () => {
  const m = reactionMemory();
  assert.equal(m.request('a', 'jump').kind, 'jump');
  assert.equal(m.request('b', 'block'), null);
  m.tick(3);
  assert.equal(m.request('a', 'jump'), null);
  m.tick(3);
  assert.equal(m.request('a', 'jump').kind, 'annoyed');
  m.tick(13);
  assert.equal(m.request('a', 'jump').kind, 'jump');
});
test('every profile offers two non-hostile variants and fully voiced blurred conversations', () => {
  const keys = new Set();
  for (const p of Object.values(CROWD_TALK)) {
    assert.equal(p.jump.length, 2);
    assert.equal(p.block.length, 2);
    for (const line of [p.hello, p.answer, ...p.jump, ...p.block, p.annoyed]) {
      assert(line.say && line.voice && line.emo);
      assert.equal(line.overheard, true);
      assert(!line.en && !line.clear);
      assert(!keys.has(line.voice)); keys.add(line.voice);
    }
    assert(!p.jump.some(l => l.text.includes('ばか')));
  }
});

test('background extras use free reachable approaches around furniture', async () => {
  const { registerHooks } = await import('node:module');
  const vendor = new URL('../../vendor/three/three.module.js', import.meta.url).href;
  const hooks = registerHooks({ resolve(s, c, next) {
    return s === 'three' ? { url: vendor, shortCircuit: true } : next(s, c);
  } });
  try {
    const THREE = await import(vendor);
    const { approachSpot } = await import('../../js/movement/targets.js');
    const { Nav } = await import('../../js/movement/navigation.js');
    const space = new THREE.Group(), player = { root: new THREE.Group() }, npc = { root: new THREE.Group(), seated: true };
    space.add(player.root, npc.root);
    player.root.position.set(0, 0, -3);
    const nav = new Nav(-5, 5, -5, 5), originalFree = nav.free.bind(nav);
    // A bench back blocks the direct approach from Eric's side; the open front remains reachable.
    nav.free = (x, z, r) => originalFree(x, z, r) && !(Math.abs(x) < 1 && z < 0 && z > -1);
    const game = { player, place: { space, extras: { passer: npc }, crowd: [npc], people: {}, nav, charScale: 1 } };
    const spot = approachSpot(game, { id: 'passer', kind: 'person' });
    assert(spot, 'extras must resolve a reachable talking position');
    assert(nav.free(...spot), 'approach must be outside the blocked bench back');
    assert(spot[1] >= 0 || Math.abs(spot[0]) >= 1);
  } finally { hooks.deregister(); }
});
