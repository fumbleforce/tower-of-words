import test from 'node:test';
import assert from 'node:assert/strict';
import { Group } from '../../vendor/three/three.module.js';
import { registerHooks } from 'node:module';
const loader = registerHooks({ resolve(specifier, context, next) {
  return specifier === 'three' ? next(new URL('../../vendor/three/three.module.js', import.meta.url).href, context) : next(specifier, context);
} });
const { attachOutingPlace, restoreOutingPlayer } = await import('../../js/outings/attachment.js');
loader.deregister();

function fixture() {
  const rig = () => ({ root: new Group(), seated: false, setState(state) { this.state = state; } });
  const player = rig(), kenji = rig(), calls = [];
  const P = { name: 'east_coast', snapshotState: () => ({ native: 'preserved' }), restoreState() {
    calls.push('native walking-position repair'); player.root.position.set(-46.86, player.root.position.y, 0);
  } };
  const game = { place: P, player, walker: { sync: () => calls.push('sync') }, outing: {
    actor: { rig: kenji, attach() {}, activate() {}, home: () => ({ visible: false }), restoreHome() {} },
    controls: () => true, state: () => ({ status: 'active' }),
  } };
  attachOutingPlace(game, P, P.name);
  return { game, P, player, kenji, calls };
}

test('actual outing attachment restores its seated player after native floor normalization and final setup', () => {
  const { game, P, player, kenji, calls } = fixture();
  player.root.position.set(-1.114, 0.1710657, 1.78); player.root.rotation.y = 0.3;
  player.seated = true; player.seatOut = [-0.524, 1.78];
  kenji.root.position.set(-1.686, 0.2895225, 1.78); kenji.seated = true;
  const saved = { world: P.snapshotState() };
  assert.equal(saved.world.native, 'preserved');
  P.restoreState(saved);
  assert.deepEqual(player.root.position.toArray(), [-1.114, 0.1710657, 1.78]);
  assert.deepEqual(player.seatOut, [-0.524, 1.78]);
  assert.equal(player.root.rotation.y, 0.3); assert.equal(player.state, 'sit');
  assert.deepEqual(kenji.root.position.toArray(), [-1.686, 0.2895225, 1.78]);
  assert.deepEqual(calls, ['native walking-position repair', 'sync']);
  // Continue runs another day setup before its final outing restoration.
  player.root.position.set(-46.86, 0, 0); player.seated = false;
  restoreOutingPlayer(game, saved);
  assert.deepEqual(player.root.position.toArray(), [-1.114, 0.1710657, 1.78]);
  assert.equal(player.seated, true);
});

test('walking saves, other places and old outing capsules retain native position repair', () => {
  const { game, P, player, calls } = fixture();
  player.root.position.set(-1.114, 0, 1.78);
  const saved = { world: P.snapshotState() };
  assert.equal(saved.world.outing.player, undefined);
  P.restoreState(saved);
  assert.deepEqual(player.root.position.toArray(), [-46.86, 0, 0]);
  restoreOutingPlayer(game, { world: { outing: { place: 'plaza', player: { seated: true } } } });
  restoreOutingPlayer(game, { world: { outing: { place: 'east_coast' } } });
  assert.deepEqual(calls, ['native walking-position repair']);
});

test('clock-paused seated capsule survives native normalization without reactivating Kenji', () => {
  const { game, P, player, calls } = fixture();
  game.outing.controls = () => false;
  game.outing.state = () => ({ status: 'paused' });
  game.outing.actor.activate = () => assert.fail('paused Kenji must stay released');
  player.root.position.set(-1.114, 0.1710657, 1.78);
  player.seated = true; player.seatOut = [-0.524, 1.78];
  const saved = { world: P.snapshotState() };
  assert.equal(saved.world.outing.people, undefined);
  assert.equal(saved.world.outing.home, undefined);
  P.restoreState(saved);
  assert.deepEqual(player.root.position.toArray(), [-1.114, 0.1710657, 1.78]);
  assert.equal(player.seated, true);
  assert.deepEqual(calls, ['native walking-position repair', 'sync']);
  player.root.position.set(-46.86, 0, 0);
  restoreOutingPlayer(game, saved);
  assert.deepEqual(player.root.position.toArray(), [-1.114, 0.1710657, 1.78]);
  player.seated = false;
  assert.equal(P.snapshotState().outing, undefined);
});

test('waiting highlights the shop entrance without dropping an existing door goal', () => {
  const { game } = fixture(); let waiting = false, previous = false;
  game.outing.shopDestination = () => waiting;
  const P = { name: 'shotengai', things: { store_door: { goal: () => previous } } };
  attachOutingPlace(game, P, P.name);
  assert.equal(P.things.store_door.goal(), false);
  waiting = true; assert.equal(P.things.store_door.goal(), true);
  waiting = false; previous = true; assert.equal(P.things.store_door.goal(), true);
});
