import assert from 'node:assert/strict';
import { register } from 'node:module';
import test from 'node:test';
register(new URL('../support/save-loader.mjs', import.meta.url));
globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.window = {};
globalThis.fetch = async () => ({ ok: false });
const { Runner, flags } = await import('../../js/runner.js');
const { konbiniAction } = await import('../../js/places/konbini/action.js');
const { diningActions } = await import('../../js/places/izakaya/actions.js');
const { konbiniTrade } = await import('../../js/places/konbini/trade.js');
const story = (await import('../../story/konbini.js')).default;
test('actual Runner stops the selected order after place cancellation, before checkout, payment or dialogue', async () => {
  for (const key of Object.keys(flags)) delete flags[key];
  const lines = [], actions = diningActions(), sim = { yen: 1000, inv: [] }, place = { name: 'konbini', people: {}, hooks: {} };
  const game = { place, sim, hooks: {}, queue: [], wait: async () => {}, found: new Set() };
  const trade = konbiniTrade(sim, flags); let release, reached;
  const held = new Promise(resolve => { reached = resolve; });
  globalThis.__saveTestUI = { say: (_, line) => lines.push(line), choose: () => { throw Error('Cancelled order reached choice'); } };
  place.hooks.konbiniShop = konbiniAction(game, place, args => actions.run(async job => {
    assert.equal(args.state, 'add'); trade.add(args.item); reached();
    await job.wait(new Promise(resolve => { release = resolve; }));
    return true;
  }));
  const runner = game.runner = new Runner(game); runner.use(place, story);
  const running = runner.run('milk_add'); await held;
  game.place = { name: 'shotengai' }; trade.cancel(); actions.cancel();
  await running; release(); await Promise.resolve();
  assert.deepEqual(sim, { yen: 1000, inv: [] }); assert.deepEqual(lines, []);
  assert.equal(flags.konbini_action_complete, false); assert.equal(flags.konbini_phase, 'cancelled');
  assert.deepEqual(runner.frames, []); assert.equal(runner.recoveryError, undefined);
});
test('completed physical action reaches normal browsing without awarding inventory', async () => {
  for(const key of Object.keys(flags))delete flags[key];
  const sim={yen:1000,inv:[]}, place={name:'konbini',people:{},hooks:{}},game={place,sim,hooks:{},queue:[],wait:async()=>{},found:new Set()};
  const trade=konbiniTrade(sim,flags);
  globalThis.__saveTestUI={say:()=>{},choose:(_who,_line,choices)=>choices.length-1};
  place.hooks.konbiniShop=konbiniAction(game,place,async args=>{if(args.state==='add')trade.add(args.item);return true;});
  const runner=game.runner=new Runner(game);runner.use(place,story);await runner.run('milk_add');
  assert.deepEqual(trade.basket(),['milk']);assert.deepEqual(sim,{yen:1000,inv:[]});assert.equal(flags.konbini_action_complete,true);
});

test('a stale completion cannot replace a newer shop action result', async () => {
  const place={},game={place};let finish;
  const pending=new Promise(resolve=>{finish=resolve;});
  const perform=konbiniAction(game,place,({old})=>old?pending:Promise.resolve(true));
  const previous=perform({old:true});await perform({});assert.equal(flags.konbini_action_complete,true);
  finish(false);await previous;assert.equal(flags.konbini_action_complete,true);
});
test('an old room cannot write the flag after a new place starts its own action', async () => {
  const place={},game={place};let finish;const pending=new Promise(resolve=>{finish=resolve;});
  const previous=konbiniAction(game,place,()=>pending)({});game.place={};flags.konbini_action_complete=true;
  finish(false);await previous;assert.equal(flags.konbini_action_complete,true);
});
