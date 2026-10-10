import assert from 'node:assert/strict';
import { register } from 'node:module';
import test from 'node:test';
register(new URL('../support/save-loader.mjs', import.meta.url));
globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.window = {};
globalThis.fetch = async () => ({ ok: false });
const { Runner, flags } = await import('../../js/runner.js');
const { diningAction } = await import('../../js/places/canteen/action.js');
const { canteenMealState } = await import('../../js/places/canteen/meal-state.js');
const { diningActions } = await import('../../js/places/izakaya/actions.js');
const story = (await import('../../story/canteen.js')).default;
function setup(act) {
  for (const key of Object.keys(flags)) delete flags[key];
  flags.place = 'canteen'; flags.canteen_service_open=true; flags.canteen_staff_present=true;
  const place = { name: 'canteen', people: {}, hooks: {} };
  const game = { place, hooks: {save(){},gesture:async()=>{}}, queue: [], wait: async () => {}, found: new Set() };
  place.hooks.canteenDining = diningAction(game, place, args => act(args, game));
  const runner = game.runner = new Runner(game); runner.use(place, story);
  return { game, runner, place };
}
test('real payment checkpoint replays collection without charging twice', async () => {
  const money = { yen: 1000 }, meal = canteenMealState(money, flags); let checkpoint;
  globalThis.__saveTestUI = { choose: (_who, _text, options) => options.findIndex(o => o.html.includes('Keep carrying')) };
  const { game, runner, place } = setup(async ({state}) => {
    if (state === 'pay') { meal.pay(); checkpoint ||= { flags: structuredClone(flags), yen: money.yen, runner: game.runner.snapshot() }; }
    if (state === 'collect') meal.take();
    flags.canteen_paid = meal.outstanding(); return true;
  });
  meal.select('curry'); await runner.run('pay_meal');
  assert.equal(money.yen, 580); assert.equal(checkpoint.runner.execution.frames.at(-1).node, 'pay_meal');
  for (const key of Object.keys(flags)) delete flags[key]; Object.assign(flags, checkpoint.flags); money.yen = checkpoint.yen;
  const resumed = game.runner = new Runner(game); resumed.use(place, story); resumed.restore(checkpoint.runner);
  assert.equal(await resumed.resume(), true); assert.equal(money.yen, 580); assert.equal(meal.phase(), 'carried');
});
test('cancelling the physical bite prevents receipt completion and subsequent dialogue', async () => {
  const actions = diningActions(), money = { yen: 1000 }, meal = canteenMealState(money, flags), lines = [];
  let reached, finish; const contact = new Promise(resolve => { reached = resolve; });
  globalThis.__saveTestUI = { say: (_who, text) => lines.push(text), choose: () => { throw Error('Cancelled meal reached choices'); } };
  const { game, runner } = setup(async ({state}) => {
    if (state !== 'eat') return true;
    return actions.run(async job => { reached(); await job.wait(new Promise(resolve => { finish = resolve; })); meal.eat(); return true; });
  });
  meal.select('curry'); meal.pay(); meal.take(); meal.place('canteen_seat_shared');
  const run = runner.run('eat_meal'); await contact; actions.cancel(); game.place = {name:'plaza'}; flags.place='plaza';
  await run; finish(); await Promise.resolve();
  assert.equal(meal.phase(),'table'); assert.equal(flags.canteen_eaten_id, undefined);
  assert.deepEqual(lines, []); assert.deepEqual(runner.frames, []);
});
test('a cancelled old action cannot replace a newer completion result', async () => {
  const place={}, game={place}; let finish;
  const old = new Promise(resolve=>{finish=resolve;});
  const act = diningAction(game,place,({late})=>late?old:Promise.resolve(true));
  const pending=act({late:true}); await act({}); finish(false); await pending;
  assert.equal(flags.canteen_dining_complete,true);
});
test('a first greeting from the shared chair never asks permission to occupy it again', async()=>{
 const lines=[],offered=[];
 globalThis.__saveTestUI={say:(_who,text)=>lines.push(text),choose:(_who,_text,choices)=>{
   offered.push(...choices.map(c=>c.html));return choices.findIndex(c=>c.html.includes('Leave'));
 }};
 const {runner}=setup(async()=>true);flags.canteen_player_at_shared=true;
 await runner.run('shirt_hello');
 assert.ok(!lines.includes('Is this seat free?'));assert.ok(!offered.some(s=>s.includes('Sit at')));
 assert.equal(flags.canteen_shirt_met,true);
});

test('paid checkpoint outside lunch preserves entitlement and gives the approved collection reply instead of hidden service',async()=>{
 const lines=[],actions=[];globalThis.__saveTestUI={say:(_who,text)=>lines.push(text)};
 const {runner}=setup(async({state})=>{actions.push(state);if(state==='collect')throw Error('Hidden staff delivery');return true;});
 Object.assign(flags,{canteen_meal_phase:'paid',canteen_order_id:8,canteen_paid_id:8,canteen_meal:'curry',canteen_service_open:false,canteen_staff_present:false});
 await runner.run('collect_meal');
 assert.ok(actions.includes('pending'));assert.ok(!actions.includes('collect'));assert.equal(flags.canteen_meal_phase,'paid');assert.equal(flags.canteen_delivered_id,undefined);assert.ok(lines.includes('I’ve already paid. I’ll collect it at lunch.'));
});
