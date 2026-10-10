import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
const stubs = {
  '/flavor-finds/objects.js': 'export const makeObject=()=>{throw Error("ineligible prop created")};',
  '/flavor-finds/placement.js': 'export const placement=()=>{};',
  '/flavor-finds/note.js': 'export const readNote=()=>{};',
  '/narrative/state.js': 'export const flags={},cond=()=>false;',
  '/sim.js': 'export const sim={day:1};',
  '/movement/navigation.js': 'export const reachableNear=()=>{};',
};
const hook = registerHooks({
  resolve(s, c, next) {
    return s === 'three' ? { url: 'data:text/javascript,export const MathUtils={};', shortCircuit: true } : next(s, c);
  },
  load(url, c, next) {
    const e = Object.entries(stubs).find(([suffix]) => url.endsWith(suffix));
    return e ? { format: 'module', source: e[1], shortCircuit: true } : next(url, c);
  },
});
const { attachFlavorFinds } = await import('../../js/flavor-finds/index.js');
hook.deregister();
test('optional finds preserve place clocks, receivers and period/restore arguments before their first day', () => {
  const P = {
    things: {},
    cam: { yaw: 0, elev: 1, release() {} },
    value: 2,
    update(dt, t, tag) {
      this.motion = Math.sin(t) * this.value;
      this.tick = [dt, t, tag];
    },
    onPeriod(...args) {
      this.period = args;
    },
    restoreState(...args) {
      this.saved = args;
    },
  };
  const game = { runner: { snapshot: () => ({ execution: null }) } };
  attachFlavorFinds(game, P, 'gym', () => {});
  const tag = {};
  P.update(0.016, 12.5, tag);
  P.onPeriod('morning', tag);
  P.restoreState({ world: {} }, tag);
  assert.equal(P.motion, Math.sin(12.5) * 2);
  assert.deepEqual(P.tick, [0.016, 12.5, tag]);
  assert.deepEqual(P.period, ['morning', tag]);
  assert.deepEqual(P.saved, [{ world: {} }, tag]);
  assert.deepEqual(P.things, {});
});
