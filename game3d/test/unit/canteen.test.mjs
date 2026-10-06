import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, context);
  if (specifier.startsWith('three/addons/')) return next(new URL('../../vendor/' + specifier.slice(13), import.meta.url).href, context);
  return next(specifier, context);
} });
globalThis.location = { search: '' };
const { buildCanteen } = await import('../../js/scenes/canteen/room.js');
const { TABLES, COUNTER, R, DOOR, PLAZA_DOOR } = await import('../../js/scenes/canteen/plan.js');
const { CANTEEN, DOOR_X } = await import('../../js/scenes/plaza/plan.js');
const { canTravel } = await import('../../js/places/definitions.js');
const { waysOut } = await import('../../js/travel/ways.js');
const { storyPath } = await import('../../js/days.js');
process.on('exit', () => hooks.deregister());

test('actual furnished floor has connected door, service and chair approaches; furniture stays solid', () => {
  const w = buildCanteen();
  for (const p of [w.door.in, w.door.out, ...Object.values(w.spots), ...Object.values(w.seats).map(s => s.out)]) {
    assert.ok(w.nav.free(...p), `free approach ${p}`);
    const path = w.nav.path(...w.door.in, ...p);
    assert.ok(path?.length, `connected approach ${p}`);
    for (const [x, z] of path) assert.ok(w.nav.free(x, z), `path does not clip furniture ${x},${z}`);
  }
  for (const t of TABLES) assert.equal(w.nav.free(t.x, t.z), false);
  assert.equal(w.nav.free(COUNTER.x, COUNTER.z), false);
  assert.equal(w.nav.free(0, R.z0 - 0.1), false);
  assert.equal(PLAZA_DOOR.edge[0], DOOR_X);
  assert.ok(Math.abs(PLAZA_DOOR.edge[1] - CANTEEN[3]) < 0.4);
  assert.ok(Math.abs(DOOR.x + (CANTEEN[0] + CANTEEN[2]) / 2 - DOOR_X) < 1e-10);
});

test('lighting returns to daylight after evening and floor geometry remains unchanged', () => {
  const w = buildCanteen(), before = w.nav.rects.map(r => [...r]);
  w.period('morning'); const light = w.sun.intensity;
  w.period('evening'); assert.ok(w.sun.intensity < light);
  w.period('morning'); assert.equal(w.sun.intensity, light);
  assert.deepEqual(w.nav.rects, before);
});

test('normal story travel enters and leaves the canteen on every playable day, with no dialogue added', async () => {
  for (let day = 1; day <= 5; day++) {
    for (const [from, to] of [['plaza', 'canteen'], ['canteen', 'plaza']]) {
      const story = (await import(new URL('../../js/' + storyPath(from, day), import.meta.url))).default;
      assert.ok(canTravel(from, to, day));
      const way = waysOut(from, story, { day, cond: () => true }).find(w => w.to === to);
      assert.ok(way && !way.scene, `day${day} ${from} door route`);
    }
  }
});

test('saved seated players restore on either real chair; stale seats recover standing on free floor', async () => {
  const { Group } = await import('../../vendor/three/three.module.js');
  const { canteenSave } = await import('../../js/places/canteen-state.js');
  const w=buildCanteen();
  const player={ root:new Group(), setState(s){this.state=s;}, sitAt(x,y,z,ry){this.root.position.set(x,y,z);this.root.rotation.y=ry;this.state='sit';} };
  const game={player,walker:{sync(){}}}, cam={snap(){}};
  const io=canteenSave(game,w.nav,w.door.in,cam,w.seats);
  for(const s of Object.values(w.seats)) {
    player.sitAt(s.x,s.top,s.z,s.ry);player.seated=true;player.seatOut=[...s.out];
    const saved={world:io.snapshot()};
    player.root.position.set(0,0,0);player.seated=false;
    io.restore(saved);
    assert.equal(player.seated,true);assert.equal(player.state,'sit');
    assert.deepEqual(player.root.position.toArray(),[s.x,s.top,s.z]);assert.deepEqual(player.seatOut,s.out);
    assert.equal(w.nav.free(player.root.position.x,player.root.position.z),false,'a valid chair is allowed despite its solid collider');
  }
  const stale={world:io.snapshot()};stale.world.player.eric.position=[TABLES[0].x,1,TABLES[0].z];
  io.restore(stale);
  assert.equal(player.seated,false);assert.equal(player.state,'idle');assert.equal(player.seatOut,null);
  assert.deepEqual(player.root.position.toArray(),[...w.door.in.slice(0,1),0,w.door.in[1]]);
  assert.ok(w.nav.free(player.root.position.x,player.root.position.z));
});
