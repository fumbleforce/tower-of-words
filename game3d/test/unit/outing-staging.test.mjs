import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

const hooks = registerHooks({
  resolve(specifier, info, next) {
    if (specifier.endsWith('/settings.js')) return {url:'data:text/javascript,export const settings={};export const isPhone=()=>false;',shortCircuit:true};
    if (specifier === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, info);
    if (specifier.startsWith('three/addons/'))
      return next(new URL('../../vendor/' + specifier.slice(13), import.meta.url).href, info);
    return next(specifier, info);
  },
});
globalThis.location = { search: '' };
const THREE = await import('../../vendor/three/three.module.js');
const { outingActor } = await import('../../js/outings/actor.js');
const { freeOutingSeats, sitOutingPair, cancelOutingSeats } = await import('../../js/outings/seating.js');
const { dayCast } = await import('../../js/places/day-cast.js');
const { PEOPLE } = await import('../../js/cast.js');
const { benchSit } = await import('../../js/crowd/motion.js');
const { snapshotPeople } = await import('../../js/places/saved-people.js');
const { Nav } = await import('../../js/movement/navigation.js');
const coastPlan = await import('../../js/scenes/east-coast/plan.js');
const { TERRACE } = await import('../../js/scenes/dorm-court/cluster-plan.js');
const { bench } = await import('../../js/scenes/outdoor/furniture.js');
const { benchSeats, before } = await import('../../js/places/day3/seats.js');
process.on('exit', () => hooks.deregister());

function place(scale = 1) {
  return {
    space: new THREE.Group(),
    people: {},
    things: {},
    charScale: scale,
    floorY: 0,
    spots: { terrace_bench: [0, 0] },
    start: [-3, 3],
    nav: { R: 0.24, free: () => true, path: (_x, _z, x, z) => [[x, z]] },
  };
}

test('travelling Kenji replaces one resident only and restores the exact local pose and interaction', () => {
  const P = place(),
    Q = place(0.8),
    resident = PEOPLE.kenji();
  P.space.add(resident.root);
  resident.root.position.set(2, 0, 1);
  resident.blob = new THREE.Group();
  P.space.add(resident.blob);
  benchSit(resident, 2, 1, 0, 0.34);
  resident.seatOut = [2, 2];
  resident.savedWalk = [4, 3];
  resident._walk = true;
  P.people.kenji = resident;
  const thing = (P.things.kenji = { label: 'Kenji', spot: () => [2, 2] });
  const prior = snapshotPeople({ kenji: resident });
  const game = { place: P, t: 0 };
  const actor = outingActor(game, { makeShadow: () => new THREE.Group() });
  actor.attach(P);
  actor.attach(Q);
  const localQ = Q.people.kenji;
  actor.attach(P);
  actor.activate(P);
  assert.equal(P.people.kenji, actor.rig);
  assert.equal(Q.people.kenji, localQ);
  assert.notEqual(localQ, actor.rig);
  assert.equal(resident.root.visible, false);
  assert.equal(resident._walk, null);
  assert.equal(actor.rig.seated, false);
  assert.deepEqual(actor.rig.root.position.toArray(), [2, 0, 2]);
  game.place = Q;
  actor.activate(Q);
  assert.equal(P.people.kenji, resident);
  assert.equal(P.things.kenji, thing);
  assert.deepEqual(snapshotPeople({ kenji: resident }), prior);
  assert.equal(Q.people.kenji, actor.rig);
  actor.release();
  assert.equal(Q.people.kenji, localQ);
  assert.equal(localQ.root.visible, false);
  assert.equal(actor.rig.root.parent, null);
  assert.equal(actor.rig.blob.parent, null);
  assert.equal(Q.things.kenji.enabled(), false);
});

test('repeated place changes reset codebuilt seated limbs and scale without accumulating either', () => {
  const P = place(1.6),
    Q = place(0.7),
    game = { place: P, t: 0 };
  const actor = outingActor(game, { makeShadow: () => new THREE.Group() });
  const baseScale = actor.rig.root.scale.x;
  actor.attach(P);
  actor.attach(Q);
  actor.activate(P);
  assert.equal(actor.rig.root.scale.x, baseScale * 1.6);
  benchSit(actor.rig, 0, 0, 0, 0.34);
  game.place = Q;
  actor.activate(Q);
  assert.equal(actor.rig.seated, false);
  assert.equal(actor.rig.root.scale.x, baseScale * 0.7);
  assert.equal(actor.rig.knees[0].rotation.x, 0);
  game.place = P;
  actor.activate(P);
  assert.equal(actor.rig.root.scale.x, baseScale * 1.6);
  actor.release();
});

function seatingFixture() {
  const P = place();
  const bench = new THREE.Group();
  bench.userData.seats = [{ x: 0, z: 0, len: 1.8, facing: 0 }];
  P.space.add(bench);
  const person = (x, z) => {
    const root = new THREE.Group();
    root.position.set(x, 0, z);
    P.space.add(root);
    return {
      root,
      meshy: true,
      setState(state) {
        this.state = state;
      },
      sitAt(x, y, z, yaw) {
        root.position.set(x, y, z);
        root.rotation.y = yaw;
        this.state = 'sit';
      },
    };
  };
  const player = person(-3, 3),
    companion = person(-2, 3),
    pending = [];
  P.people.kenji = companion;
  const game = {
    place: P,
    player,
    walker: { sync() {} },
    standUp() {
      player.seated = false;
    },
  };
  const walk = (_game, rig, to) => {
    rig.root.userData.walkTok = (rig.root.userData.walkTok || 0) + 1;
    rig._walk = true;
    return new Promise((resolve) =>
      pending.push(() => {
        rig.root.position.set(to[0], 0, to[1]);
        rig._walk = false;
        resolve();
      }),
    );
  };
  return { game, P, player, companion, pending, walk, person, seats: freeOutingSeats(game, companion) };
}

test('only two actual adjacent free bench seats can be approached; saved invented seats and blocked routes fail', async () => {
  const f = seatingFixture();
  assert.equal(f.seats.length, 2);
  const invented = f.seats.map((s) => ({ ...s, x: s.x + 8 }));
  assert.equal(await sitOutingPair(f.game, f.companion, invented, () => true, { walk: f.walk }), false);
  assert.equal(f.pending.length, 0);
  f.P.nav.path = () => null;
  assert.equal(await sitOutingPair(f.game, f.companion, f.seats, () => true, { walk: f.walk }), false);
  assert.equal(f.pending.length, 0);
  f.P.people.other = f.person(f.seats[0].x, f.seats[0].z);
  assert.equal(freeOutingSeats(f.game, f.companion), null);
});

test('both actors arrive before real seat poses are applied and their stand-up points are retained', async () => {
  const f = seatingFixture();
  const result = sitOutingPair(f.game, f.companion, f.seats, () => true, { walk: f.walk });
  assert.equal(f.pending.length, 2);
  f.pending.shift()();
  await Promise.resolve();
  assert.equal(!!f.player.seated, false);
  f.pending.shift()();
  assert.equal(await result, true);
  for (const [i, rig] of [f.player, f.companion].entries()) {
    assert.equal(rig.seated, true);
    assert.equal(rig.state, 'sit');
    assert.deepEqual(rig.root.position.toArray(), [f.seats[i].x, f.seats[i].top, f.seats[i].z]);
    assert.deepEqual(rig.seatOut, [f.seats[i].x, f.seats[i].z + 0.85]);
  }
});

test('seat occupancy is checked again after approach instead of seating on a new arrival', async () => {
  const f = seatingFixture();
  const result = sitOutingPair(f.game, f.companion, f.seats, () => true, { walk: f.walk });
  f.P.people.other = f.person(f.seats[0].x, f.seats[0].z);
  f.pending.forEach((resolve) => resolve());
  assert.equal(await result, false);
  assert.equal(!!f.player.seated, false);
  assert.equal(!!f.companion.seated, false);
});

test('stop cancellation owns both approach walks and preserves a newer scripted walk', async () => {
  const f = seatingFixture();
  const result = sitOutingPair(f.game, f.companion, f.seats, () => true, { walk: f.walk });
  const playerToken = ++f.player.root.userData.walkTok;
  const companionToken = f.companion.root.userData.walkTok;
  cancelOutingSeats(f.game);
  assert.equal(f.player.root.userData.walkTok, playerToken);
  assert.ok(f.companion.root.userData.walkTok > companionToken);
  f.pending.forEach((resolve) => resolve());
  assert.equal(await result, false);
  assert.equal(!!f.player.seated, false);
  assert.equal(!!f.companion.seated, false);
});

test('real coast terrace benches are reached from free ends when the coastal wall blocks front approaches', async () => {
  const f = seatingFixture();
  const P = (f.game.place = { ...f.P, charScale: 1.18 });
  for (const child of [...P.space.children]) if (child.userData.seats) child.removeFromParent();
  const metadata = new THREE.Group(),
    collector = { box() {} };
  for (const x of [TERRACE[0] + 1.1, TERRACE[1] - 1.1]) {
    const local = coastPlan.pt([x, TERRACE[3] - 0.7]);
    bench(collector, ...local, 0, { len: 1.3 });
  }
  metadata.userData.seats = collector.seats;
  P.space.add(metadata);
  const [x0, x1, z0, z1] = coastPlan.BOUNDS;
  P.nav = new Nav(x0 - 0.2, x1 + 0.2, z0 - 0.2, z1 + 0.2, 0.12);
  P.nav.extra = (x, z) => coastPlan.WALKS.some((r) => coastPlan.inRect(x, z, r, -0.02));
  for (const r of coastPlan.FURNITURE) P.nav.block(...r);
  P.spots.terrace_bench = coastPlan.pt([TERRACE[1] - 1.1, TERRACE[3] - 1.35]);
  f.player.root.position.set(-46.86, 0, 0);
  f.companion.root.position.set(-46.86, 0, 0.84);
  const built = benchSeats(P);
  assert.equal(built.length, 4);
  assert.ok(built.every((s) => !P.nav.free(...before(s, 0.85 * P.charScale), P.nav.R)));
  // The east bench is in use. The free west bench still fits the actual body circles.
  const occupied = built.find((s) => s.x > 0);
  P.people.other = f.person(occupied.x, occupied.z);
  const seats = freeOutingSeats(f.game, f.companion);
  assert.ok(seats);
  assert.ok(seats.every((s) => s.x < 0));
  const sit = sitOutingPair(f.game, f.companion, seats, () => true, { walk: f.walk });
  assert.equal(f.pending.length, 2);
  f.pending.forEach((resolve) => resolve());
  assert.equal(await sit, true);
  for (const rig of [f.player, f.companion]) assert.ok(P.nav.free(...rig.seatOut, P.nav.R));
});

test('lazy day schedules adopt their local resident when handed the travelling rig', () => {
  const P = place(), Q = place(), game = {place: P, t:0};
  const actor = outingActor(game, {makeShadow:()=>new THREE.Group()});
  game.outing={actor};actor.attach(P);actor.attach(Q);
  const local=P.people.kenji, other=Q.people.kenji;
  actor.activate(P);actor.rig.root.position.set(8,0,9);
  const cast=dayCast(game,{root:P.space});cast.adopt('kenji',P.people.kenji);
  assert.equal(cast.people.kenji,local);cast.put('kenji',[1,1]);
  assert.deepEqual(actor.rig.root.position.toArray(),[8,0,9]);
  const qCast=dayCast(game,{root:Q.space});qCast.adopt('kenji',actor.rig);
  assert.equal(qCast.people.kenji,other);
});

test('restored resident schedule cannot leave the active companion interaction bound to a hidden body',()=>{
  const P=place(),game={place:P,t:0};const actor=outingActor(game,{makeShadow:()=>new THREE.Group()});
  actor.attach(P);actor.activate(P);const companionThing=P.things.kenji;
  P.things.kenji={enabled:()=>false};actor.activate(P);
  assert.equal(P.things.kenji,companionThing);assert.equal(P.things.kenji.enabled(),true);
});
test('saved resident home retains the real seat approach across companion reconstruction',()=>{
  const P=place(),game={place:P,t:0};const resident=PEOPLE.kenji();
  P.space.add(resident.root);benchSit(resident,2,1,0,.34);P.people.kenji=resident;
  const actor=outingActor(game,{makeShadow:()=>new THREE.Group()});actor.attach(P);actor.activate(P);
  const home=JSON.parse(JSON.stringify(actor.home()));
  assert.equal(home.seated,true);assert.notDeepEqual(home.approach,[2,1]);
  actor.release();actor.activate(P);actor.restoreHome(home);assert.deepEqual(actor.home(),home);
});
