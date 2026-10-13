import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import {
  readOuting,
  canInvite,
  inviteOuting,
  pauseOuting,
  resumeOuting,
  finishOuting,
  beginStop,
  completeStop,
  cancelStop,
} from '../../js/outings/model.js';

const context = { day: 2, period: 'evening', weekend: false, met: true, visible: true, available: true };
const roundtrip = (value) => JSON.parse(JSON.stringify(value));

test('Kenji invitations respect the actual supplied schedule and never replace a paused outing', () => {
  assert.equal(canInvite(context), true);
  for (const change of [
    { day: 1 },
    { met: false },
    { visible: false },
    { available: false },
    { period: 'lunch' },
    { period: 'early', weekend: true },
    { period: 'unknown', weekend: true },
  ]) {
    assert.equal(canInvite({ ...context, ...change }), false);
    assert.deepEqual(inviteOuting(null, { ...context, ...change }), readOuting(null));
  }
  for (const period of ['morning', 'lunch', 'afternoon', 'evening'])
    assert.equal(canInvite({ ...context, day: 3, weekend: true, period }), true);
  const paused = pauseOuting(beginStop(inviteOuting(null, context), 'drink'));
  assert.deepEqual(inviteOuting(paused, context), paused);
  assert.deepEqual(resumeOuting(paused, { ...context, available: false }), paused);
});

test('a stop is recorded only by a matching observed completion while the outing is active', () => {
  const invited = inviteOuting(null, context);
  assert.deepEqual(completeStop(invited, 'arcade'), invited);
  const pending = beginStop(invited, 'arcade');
  assert.deepEqual(pending.stops, []);
  assert.deepEqual(beginStop(pending, 'coast'), pending);
  assert.deepEqual(completeStop(pending, 'coast'), pending);
  assert.deepEqual(completeStop(pauseOuting(pending), 'arcade'), pauseOuting(pending));
  const played = completeStop(pending, 'arcade');
  assert.deepEqual(played.stops, ['arcade']);
  assert.equal(played.pending, null);
  assert.deepEqual(beginStop(played, 'arcade'), played);
  assert.deepEqual(beginStop(played, 'unbuilt-place'), played);
  assert.deepEqual(completeStop(played, 'arcade'), played);
  const cancelled = cancelStop(beginStop(played, 'drink'));
  assert.deepEqual(completeStop(cancelled, 'drink'), played);
  assert.deepEqual(invited.stops, []);
});

test('JSON saves preserve a pending action and completed stops through sleep and a later resumption', () => {
  const played = completeStop(beginStop(inviteOuting(null, context), 'arcade'), 'arcade');
  const pending = beginStop(played, 'drink');
  const saved = roundtrip(pauseOuting(pending));
  const resumed = resumeOuting(saved, { ...context, day: 7 });
  assert.equal(resumed.day, 7);
  assert.equal(resumed.status, 'active');
  assert.equal(resumed.pending, 'drink');
  assert.deepEqual(resumed.stops, ['arcade']);
  assert.deepEqual(readOuting(roundtrip(resumed)), resumed);
  assert.deepEqual(readOuting(null).stops, []);
  resumed.stops.push('coast');
  assert.deepEqual(saved.stops, ['arcade']);
  assert.equal(saved.status, 'paused');
});

test('finish remembers the last completed stop, including after an abandoned purchase and a new invitation', () => {
  const played = completeStop(beginStop(inviteOuting(null, context), 'arcade'), 'arcade');
  const bought = completeStop(beginStop(played, 'drink'), 'drink');
  const ended = finishOuting(pauseOuting(beginStop(bought, 'coast')));
  assert.equal(ended.status, 'ended');
  assert.equal(ended.pending, null);
  assert.equal(ended.callback, 'drink');
  assert.deepEqual(ended.stops, ['arcade', 'drink']);
  assert.deepEqual(completeStop(ended, 'coast'), ended);
  const next = inviteOuting(roundtrip(ended), { ...context, day: 8 });
  assert.deepEqual(next.stops, []);
  assert.equal(readOuting(roundtrip(next)).callback, 'drink');
  assert.equal(finishOuting(next).callback, 'drink');
});

test('normalizing save data creates fresh plain data and ignores unsupported stops and actions', () => {
  const input = {
    status: 'paused',
    day: 3,
    period: 'lunch',
    stops: ['arcade', 'arcade', 'unknown'],
    pending: 'arcade',
  };
  const result = readOuting(input);
  assert.deepEqual(result, {
    status: 'paused',
    day: 3,
    period: 'lunch',
    stops: ['arcade'],
    pending: null,
    callback: null,
  });
  input.stops.push('drink');
  assert.deepEqual(result.stops, ['arcade']);
  assert.deepEqual(readOuting('bad save'), readOuting(null));
});

const hooks = registerHooks({
  resolve(specifier, info, next) {
    if (specifier === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, info);
    if (specifier.startsWith('three/addons/'))
      return next(new URL('../../vendor/' + specifier.slice(13), import.meta.url).href, info);
    return next(specifier, info);
  },
});
const THREE = await import('../../vendor/three/three.module.js');
const { createOutingFollower } = await import('../../js/outings/follow.js');
process.on('exit', () => hooks.deregister());

function fixture(options = {}) {
  const space = new THREE.Group();
  const makePerson = (x) => {
    const root = new THREE.Group();
    root.position.x = x;
    space.add(root);
    return {
      root,
      state: 'idle',
      setState(state) {
        this.state = state;
      },
    };
  };
  const rig = makePerson(0),
    player = makePerson(5),
    calls = [],
    paths = [],
    pending = [];
  const nav = {
    R: 0.25,
    path(x, z, tx, tz) {
      paths.push([x, z, tx, tz]);
      return [[tx, tz]];
    },
    free: () => true,
    clear: () => true,
    collide: (x, z) => [x, z],
  };
  const game = { player, place: { space, nav, people: { kenji: rig } }, timeScale: 1 };
  const walk = (_game, person, to, opts) => {
    calls.push({ to, opts });
    person.root.userData.walkTok = (person.root.userData.walkTok || 0) + 1;
    person._walk = true;
    return new Promise((resolve) =>
      pending.push(() => {
        person._walk = false;
        resolve();
      }),
    );
  };
  const follower = createOutingFollower(game, { person: () => rig, walk, ...options });
  return { game, rig, player, calls, paths, pending, follower };
}

test('following requests a navigable point behind the player and never restarts a failed target in place', async () => {
  const { game, rig, player, calls, paths, pending, follower } = fixture();
  follower.update();
  assert.equal(paths.length, 1);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].to[0] < player.root.position.x - 1);
  assert.equal(calls[0].opts.route, true);
  assert.equal(calls[0].opts.avoid, true);
  assert.equal(rig.root.position.x, 0);
  pending.shift()();
  await Promise.resolve();
  for (let i = 0; i < 60; i++) follower.update();
  assert.equal(calls.length, 1);
  player.root.position.x += 1;
  game.place.nav.path = () => null;
  follower.update();
  assert.equal(calls.length, 1);
  follower.dispose();
});

test('busy, scripted, seated, and place changes cancel owned following without touching a newer story walk', () => {
  for (const block of [
    ({ game }) => {
      game.busy = true;
    },
    ({ game }) => {
      game.walker = { path: { scripted: true } };
    },
    ({ player }) => {
      player.seated = true;
    },
    ({ game }) => {
      game.place = { ...game.place };
    },
  ]) {
    const f = fixture();
    f.follower.update();
    const token = f.rig.root.userData.walkTok;
    block(f);
    f.follower.update();
    assert.ok(f.rig.root.userData.walkTok > token);
    f.follower.dispose();
  }
  const f = fixture();
  f.follower.update();
  const storyToken = ++f.rig.root.userData.walkTok;
  f.game.busy = true;
  f.follower.update();
  assert.equal(f.rig.root.userData.walkTok, storyToken);
  assert.equal(f.rig._walk, true);
  f.follower.dispose();
});

test('disposing while a real walkRig frame is pending cancels it before it can move or revive', async () => {
  const originalRAF = globalThis.requestAnimationFrame;
  const originalWindow = globalThis.window;
  const raf = [];
  globalThis.window = {};
  globalThis.requestAnimationFrame = (fn) => raf.push(fn);
  try {
    const { game, rig, follower } = fixture({ walk: undefined });
    follower.update();
    assert.equal(rig._walk, true);
    assert.ok(raf.length);
    follower.dispose();
    const before = rig.root.position.clone();
    for (const fn of raf.splice(0)) fn();
    await Promise.resolve();
    game.player.root.position.x += 5;
    follower.update();
    assert.deepEqual(rig.root.position, before);
    assert.equal(rig._walk, null);
    assert.equal(raf.length, 0);
  } finally {
    if (originalRAF) globalThis.requestAnimationFrame = originalRAF;
    else delete globalThis.requestAnimationFrame;
    if (originalWindow) globalThis.window = originalWindow;
    else delete globalThis.window;
  }
});

test('an old cancelled promise cannot release the follower ownership of a new walk', async () => {
  const f = fixture();
  f.follower.update();
  const first = f.pending.shift();
  f.follower.pause();
  f.player.root.position.x += 2;
  f.follower.update();
  const token = f.rig.root.userData.walkTok;
  first();
  await Promise.resolve();
  f.follower.pause();
  assert.ok(f.rig.root.userData.walkTok > token);
  assert.equal(f.calls.length, 2);
  f.follower.dispose();
});

test('explicit trip ownership allows following scripted travel but cannot override seating or controller blocking', () => {
  for (const field of ['scripted', '_walk']) {
    const normal = fixture();
    normal.player[field] = true;
    normal.follower.update();
    assert.equal(normal.calls.length, 0);
    normal.follower.dispose();
  }
  let blocked = false;
  const trip = fixture({ allowBusy: () => true, blocked: () => blocked });
  trip.game.busy = true;
  trip.game.walker = { path: { scripted: true } };
  trip.player.scripted = true;
  trip.player._walk = true;
  trip.follower.update();
  assert.equal(trip.calls.length, 1);
  const firstToken = trip.rig.root.userData.walkTok;
  trip.player.seated = true;
  trip.follower.update();
  assert.ok(trip.rig.root.userData.walkTok > firstToken);
  trip.player.seated = false;
  blocked = true;
  trip.follower.update();
  assert.equal(trip.calls.length, 1);
  trip.follower.dispose();
});
