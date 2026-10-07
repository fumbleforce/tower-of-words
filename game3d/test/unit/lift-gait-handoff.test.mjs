import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parse } from 'espree';
import * as THREE from '../../vendor/three/three.core.js';
import { waitFacingLift } from '../../js/places/lift-turn.js';

function declaration(file, name) {
  const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8');
  const nodes = parse(source, { ecmaVersion: 'latest', sourceType: 'module', range: true }).body;
  const node = nodes
    .map((n) => n.declaration || n)
    .find((n) => n.id?.name === name || n.declarations?.some((d) => d.id.name === name));
  return source.slice(...node.range).replace(/^export /, '');
}
const gaitSource = '../../js/movement/gait.js';
const makeGait = new Function(
  'THREE',
  `const BRISK=2.6, STILL=.7;${declaration(gaitSource, 'makeGait')};return makeGait;`,
)(THREE);
const stopGait = new Function(`${declaration(gaitSource, 'stopGait')};return stopGait;`)();
const stepGait = new Function('walking', `${declaration(gaitSource, 'stepGait')};return stepGait;`)(
  new Function(`const ON=.12,OFF=.05,HOLD=.15;${declaration(gaitSource, 'walking')};return walking;`)(),
);

function fixture(initial = 'walk') {
  const root = new THREE.Object3D(),
    mixer = new THREE.AnimationMixer(root);
  const action = (name, positions) =>
    mixer.clipAction(
      new THREE.AnimationClip(name, 1, [new THREE.NumberKeyframeTrack('.position[y]', [0, 0.5, 1], positions)]),
    );
  const actions = {
    walk: action('walk', [0, 0.1, 0]),
    run: action('run', [0, 0.2, 0]),
    idle: action('idle', [0, 0, 0]),
  };
  let state,
    current,
    fallback = 0;
  const transitions = [],
    player = {
      root,
      scripted: false,
      get state() {
        return state;
      },
      setState(next) {
        if (next === state) return;
        transitions.push(next);
        const a = actions[next];
        a.reset()
          .setEffectiveWeight(1)
          .fadeIn(current ? 0.25 : 0)
          .play();
        current?.fadeOut(0.25);
        current = a;
        state = next;
      },
    };
  const gait = makeGait(
    actions,
    { walkV: 0.5, runV: 1 },
    {
      root,
      idle() {
        fallback++;
        player.setState('idle');
      },
    },
  );
  player.setGait = gait.set;
  const advance = (seconds) => {
    for (let t = 0; t < seconds - 1e-8; t += 1 / 60) {
      gait.step(Math.min(1 / 60, seconds - t), state, 1.25);
      mixer.update(Math.min(1 / 60, seconds - t));
    }
  };
  player.setState(initial);
  gait.set(initial === 'walk' ? 0.61 : null);
  mixer.update(0);
  const waits = [],
    game = {
      player,
      walker: { locked: false },
      async walkTo() {},
      async wait(ms) {
        assert.equal(player.scripted, true);
        assert.equal(player.state, 'idle', 'lift must stop the inherited gait before waiting');
        assert.equal(this.walker.locked, true);
        waits.push(ms);
        advance(ms / 1000);
        assert.ok(
          !actions.walk.isScheduled() || actions.walk.getEffectiveWeight() === 0,
          'the walking clip fades out during the standing wait',
        );
        assert.equal(fallback, 0, 'standing must not depend on the .7-second stationary fallback');
      },
    };
  const lift = {
    place: { hooks: {} },
    site: { out: [0, 0], x: 0, zFront: -1, floor: 'B2' },
    car: {},
    riders: [{ r: { root: {}, blob: {} } }, { r: { root: {}, blob: {} } }],
  };
  return { player, game, lift, waits, transitions, actions, advance };
}

async function realGlide(f, game, root, to, speed) {
  let now = 0,
    done = false;
  const frames = [];
  const shared = fs.readFileSync(new URL('../../js/movement/shared.js', import.meta.url), 'utf8');
  const motion = new Function(
    shared.slice(shared.indexOf('export const ACCEL'), shared.indexOf('// ---------- who')).replaceAll('export ', '') +
      '\nreturn {ACCEL,BRAKE,CORNER,FRAME_MAX,STEP_MAX,TURN,angDiff,turnToward};',
  )();
  const dependencies = {
    THREE,
    ...motion,
    stepGait,
    stopGait,
    rigOf: () => game.player,
    performance: { now: () => now },
    requestAnimationFrame: (fn) => frames.push(fn),
    stuck: new Function(`${declaration('../../js/movement/navigation.js', 'stuck')};return stuck;`)(),
  };
  const walkRig = new Function(
    ...Object.keys(dependencies),
    `${declaration('../../js/movement/scripted.js', 'walkRig')};return walkRig;`,
  )(...Object.values(dependencies));
  const glide = new Function('walkRig', `${declaration('../../js/movement/scripted.js', 'glide')};return glide;`)(
    walkRig,
  );
  new THREE.Group().add(root);
  const pending = glide(game, root, to, speed);
  pending.then(() => {
    done = true;
  });
  for (let i = 0; i < 600 && !done; i++) {
    now += 1000 / 60;
    f.advance(1 / 60);
    for (const frame of frames.splice(0)) frame();
    await Promise.resolve();
  }
  await pending;
  assert.ok(done, 'scripted glide completed within its bound');
  assert.ok(Math.hypot(root.position.x - to[0], root.position.z - to[1]) < 0.03, 'actual glide reaches the doorway');
}

const reachedGlide = new Error('reached first actual glide');
function approach(name, atGlide) {
  const dependencies = {
    stopGait,
    waitFacingLift,
    async anim(game, seconds, frame) {
      const before = game.player.root.position.clone();
      for (let i = 0; i <= 60; i++) {
        frame(i / 60);
        assert.deepEqual(game.player.root.position, before, 'door turn stays in place');
        assert.equal(game.player.state, 'idle');
      }
    },
    ride: {},
    RIDERS: [],
    RIDE_ELEV: 1,
    setAway() {},
    placeRider() {},
    slotW: () => [0, 0],
    shootRide() {},
    elevTo() {},
    sfx() {},
    doorsOpen: async () => {},
    glide: atGlide,
  };
  return new Function(...Object.keys(dependencies), `${declaration('../../js/places/lift.js', name)};return ${name};`)(
    ...Object.values(dependencies),
  );
}

for (const name of ['rideUp', 'rideOut']) {
  test(`${name} ends a mid-stride approach and lets actual movement restart the gait`, async () => {
    const f = fixture();
    const ride = approach(name, async (...args) => {
      assert.equal(f.player.state, 'idle', 'the authored action must not pre-start the walking clip');
      assert.ok(Math.abs(Math.abs(f.player.root.rotation.y) - Math.PI) < 1e-8, 'faces the actual entry before gliding');
      await realGlide(f, ...args);
      assert.equal(f.player.state, 'walk', 'actual glide movement restarts the gait');
      assert.equal(f.actions.walk.getEffectiveWeight(), 1);
      throw reachedGlide;
    });
    await assert.rejects(ride(f.game, f.lift, {}), (e) => e === reachedGlide);
    assert.ok(f.waits.length);
    assert.deepEqual(f.transitions, ['walk', 'idle', 'walk']);
  });

  test(`${name} preserves an already idle arrival`, async () => {
    const f = fixture('idle');
    const ride = approach(name, async () => {
      assert.equal(f.player.state, 'idle');
      throw reachedGlide;
    });
    await assert.rejects(ride(f.game, f.lift, {}), (e) => e === reachedGlide);
    assert.deepEqual(f.transitions, ['idle']);
  });

  test(`${name} waits for a stopped approach to resolve before taking standing ownership`, async () => {
    const f = fixture();
    let resolve;
    f.game.walkTo = () =>
      new Promise((yes) => {
        resolve = yes;
      });
    const pending = approach(name, async () => {
      assert.equal(f.player.state, 'idle');
      throw reachedGlide;
    })(f.game, f.lift, {});
    assert.equal(f.player.scripted, false);
    assert.equal(f.game.walker.locked, false);
    assert.deepEqual(f.transitions, ['walk']);
    // game.walkTo resolves when its route is stopped as well as on arrival.
    resolve();
    await assert.rejects(pending, (e) => e === reachedGlide);
    assert.deepEqual(f.transitions, ['walk', 'idle']);
  });

  test(`${name} stops prior scripted gait bookkeeping before the door hold`, async () => {
    const f = fixture();
    f.player._gait = { on: true, low: 0, ph: 0, amt: 1, v: 0.61, vs: 0.61 };
    const ride = approach(name, async (...args) => {
      assert.equal(f.player._gait.on, false);
      assert.equal(f.player._gait.amt, 0);
      assert.equal(f.player.state, 'idle');
      assert.ok(Math.abs(Math.abs(f.player.root.rotation.y) - Math.PI) < 1e-8, 'faces the actual entry before gliding');
      await realGlide(f, ...args);
      assert.equal(f.player.state, 'walk');
      throw reachedGlide;
    });
    await assert.rejects(ride(f.game, f.lift, {}), (e) => e === reachedGlide);
    assert.deepEqual(f.transitions, ['walk', 'idle', 'walk']);
  });
}

for (const [minimum, rootAt, entry] of [
  [700, [0, 0], [0, -1]],
  [1100, [2, -3], [-1, 1]],
]) {
  test(`door hold ${minimum}ms awaits both its minimum and a bounded turn toward the actual entry`, async () => {
    const f = fixture('idle');
    f.player.root.position.set(rootAt[0], 0, rootAt[1]);
    let finishWait,
      finishTurn,
      frame,
      seconds,
      done = false,
      synced = 0;
    f.game.walker.sync = () => synced++;
    f.game.wait = (ms) => {
      assert.equal(ms, minimum);
      return new Promise((resolve) => {
        finishWait = resolve;
      });
    };
    const pending = waitFacingLift(
      f.game,
      { x: entry[0], zFront: entry[1] - 0.05 },
      (game, duration, update) => {
        seconds = duration;
        frame = update;
        return new Promise((resolve) => {
          finishTurn = resolve;
        });
      },
      minimum,
    ).then(() => {
      done = true;
    });
    const target = Math.atan2(entry[0] - rootAt[0], entry[1] - rootAt[1]);
    assert.ok(seconds + 1e-12 >= (1.5 * Math.abs(target)) / 2.5, 'turn uses the existing angular speed bound');
    const before = f.player.root.position.clone();
    frame(0.5);
    assert.ok(Math.abs(f.player.root.rotation.y - target / 2) < 1e-9, 'turn interpolates instead of snapping');
    assert.deepEqual(f.player.root.position, before);
    if (minimum === 700) finishWait();
    else finishTurn();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(done, false, 'finishing only one operation cannot begin entry');
    frame(1);
    if (minimum === 700) finishTurn();
    else finishWait();
    await pending;
    assert.equal(synced, 1);
    assert.ok(Math.abs(f.game.walker.facing - target) < 1e-9);
    assert.deepEqual(f.player.root.position, before);
  });
}
