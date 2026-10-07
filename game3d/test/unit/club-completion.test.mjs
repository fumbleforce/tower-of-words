import assert from 'node:assert/strict';
import { register, registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseSource } from '../../../tools/lib/source-data.mjs';

register(new URL('../support/save-loader.mjs', import.meta.url));
registerHooks({ resolve(s, c, next) {
  if (s === 'three') return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, c);
  if (s.startsWith('three/addons/')) return next(new URL('../../vendor/' + s.slice(13), import.meta.url).href, c);
  return next(s, c);
} });
const storage = new Map();
globalThis.localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) };
globalThis.window = globalThis;
globalThis.location = { search: '' };
globalThis.addEventListener = () => {};
globalThis.fetch = async () => ({ ok: false });
globalThis.document = { createElement() { return { getContext() {
  return new Proxy({ measureText: () => ({ width: 20 }), createRadialGradient: () => ({ addColorStop() {} }) }, { get: (o, k) => k in o ? o[k] : () => {} });
} }; } };
const THREE = await import('../../vendor/three/three.module.js');
const { Runner, flags } = await import('../../js/runner.js');
const { flagKeys } = await import('../../js/narrative/engine-flags.js');
const { createArtStage } = await import('../../js/places/ongoing/art-stage.js');
const { createWinterStage } = await import('../../js/places/ongoing/winter-stage.js');
const { artNodes } = await import('../../story/ongoing/art.js');
const { winterNodes } = await import('../../story/ongoing/winter.js');

// Execute each exact production hook, with only its enclosing room dependencies supplied.
// Building the entire room would require unrelated live cast/audio loaders.
function wrapper(kind, game, P, stage) {
  const place = kind === 'art' ? 'commons' : 'gym';
  const source = readFileSync(new URL(`../../js/places/${place}.js`, import.meta.url), 'utf8');
  let hook;
  function visit(n) {
    if (!n || typeof n !== 'object') return;
    if (n.type === 'Property' && n.key.name === `${kind}Club` && n.value.type === 'ArrowFunctionExpression') hook = n.value;
    for (const value of Object.values(n)) if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') visit(value);
  }
  visit(parseSource(source));
  assert.ok(hook, 'production place hook exists');
  return Function('flags', 'ACTION_KEYS', 'game', 'P', kind, `return (${source.slice(hook.start, hook.end)})`)(flags, flagKeys(`game3d/js/places/${place}.js`), game, P, stage);
}
function rig() {
  const root = new THREE.Group(), arm = new THREE.Bone(), fore = new THREE.Bone(), hand = new THREE.Bone();
  arm.name = 'RightArm'; fore.name = 'RightForeArm'; hand.name = 'RightHand'; arm.position.y = .9; fore.position.y = -.24; hand.position.y = -.23;
  root.add(arm); arm.add(fore); fore.add(hand);
  return { root, update() {}, setState() {}, sitAt() {} };
}
function fixture(kind) {
  for (const key of Object.keys(flags)) delete flags[key];
  const player = rig(), people = { mori: rig(), emi: rig(), kuro: rig(), attendant: rig() }, space = new THREE.Group();
  space.add(player.root, ...Object.values(people).map(r => r.root));
  const P = { name: kind === 'art' ? 'dorm_commons' : 'gym', people, space, camera: { aspect: 1.6 }, nav: { free: () => true }, cam: {
    yaw: 0, elev: 1, fitDist: 12, release() { this.close = null; }, closeOn(point, zoom, y) { this.close = { point, zoom, y }; },
  } };
  const awards = [], lines = [];
  const game = { player, place: P, walker: { sync() {} }, wait: async () => {}, tween: async (_, f) => f(1), hooks: {
    bond: a => awards.push(a), bondStep: a => awards.push(a), remember: a => awards.push(a), ongoingGoal() {}, save() {},
  } };
  const stage = kind === 'art' ? createArtStage(game, P, { photograph: new THREE.Texture({ width: 10, height: 10 }), approved: true }) : createWinterStage(game, P);
  stage.restore({ active: true, drawing: 'blank', people: {}, props: {}, held: [{ id: 'emi', item: 'winter-organizer-sheet', target: null }] });
  game.hooks[`${kind}Club`] = wrapper(kind, game, P, stage);
  globalThis.__saveTestUI = { say: (...args) => lines.push(args), choose: () => { throw new Error('Canceled story reached a choice'); } };
  game.runner = new Runner(game);
  game.runner.use(P, { nodes: kind === 'art' ? artNodes : winterNodes });
  return { game, P, stage, awards, lines };
}
for (const kind of ['art', 'winter']) {
  test(`${kind}: actual action cancellation stops authored Runner progression`, async () => {
    const f = fixture(kind);
    let reached, resolve;
    const started = new Promise(r => { reached = r; });
    const pause = () => { reached(); return new Promise(r => { resolve = r; }); };
    f.game.tween = pause; f.game.wait = pause;
    const run = f.game.runner.run(kind === 'art' ? 'ongoing_art_mori_draws' : 'ongoing_winter_sheet');
    await started;
    const before = f.lines.length;
    f.stage.leave();
    await run;
    resolve(); await Promise.resolve();
    assert.equal(flags[`${kind}_action_completed`], false);
    assert.equal(f.lines.length, before, 'no narration after cancellation');
    assert.deepEqual(f.awards, [], 'no bond, milestone or memory hook');
    assert.equal(flags[kind === 'art' ? 'ms3_mori' : 'ms3_emi'], undefined);
    assert.equal(f.game.runner.recoveryError, undefined);
    assert.equal(f.game.runner.frames.length, 0);
  });
  test(`${kind}: successful free is accepted and stale place result cannot overwrite a new scene`, async () => {
    const f = fixture(kind), hook = f.game.hooks[`${kind}Club`];
    await hook({ state: 'free' });
    assert.equal(flags[`${kind}_action_completed`], true);
    let resolve;
    const stale = wrapper(kind, f.game, f.P, { act: () => new Promise(r => { resolve = r; }) });
    const pending = stale({ state: 'begin' });
    f.game.place = {};
    flags[`${kind}_action_completed`] = 'new-scene-owned';
    resolve(false); await pending;
    assert.equal(flags[`${kind}_action_completed`], 'new-scene-owned');
  });
}
test('winter milestone cancels at the actual participant turn immediately before the award', async () => {
  const f = fixture('winter');
  const steps = winterNodes.ongoing_winter_sheet;
  const start = steps.findIndex(s => s.do === 'winterClub' && s.state === 'emiTurn');
  f.game.runner.story = { nodes: { ...winterNodes, testedTurn: steps.slice(start) } };
  let reached, finish;
  const started = new Promise(r => { reached = r; });
  f.game.walkTo = () => { reached(); return new Promise(r => { finish = r; }); };
  const pending = f.game.runner.run('testedTurn');
  await started;
  f.stage.leave(); await pending; finish(); await Promise.resolve();
  assert.equal(flags.winter_action_completed, false);
  assert.equal(flags.ms3_emi, undefined);
  assert.deepEqual(f.awards, []);
  assert.deepEqual(f.lines, []);
});
test('completed real art action reaches its authored milestone and memory exactly once', async () => {
  const f = fixture('art');
  await f.game.runner.run('ongoing_art_mori_draws');
  assert.equal(flags.ms3_mori, true);
  assert.equal(flags.art_mori_started, true);
  assert.equal(f.awards.length, 2);
  assert.equal(f.stage.snapshot().active, false);
});
test('every nested art/winter physical action has an immediate completion guard', () => {
  for (const [kind, nodes] of [['art', artNodes], ['winter', winterNodes]]) {
    function inspect(value) {
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          if (value[i]?.do === `${kind}Club`) assert.deepEqual(value[i + 1], { if: `!${kind}_action_completed`, then: [{ end: true }] });
          inspect(value[i]);
        }
      } else if (value && typeof value === 'object') Object.values(value).forEach(inspect);
    }
    inspect(nodes);
  }
});
