// Day-1 choice checks on the real Runner (CPU only, no browser): repeat gifts keep the item, the stuck vending
// machine takes no second order until 動いて, and the "mum" question on the train needs its setup line first.
// node game3d/tools/choice-check.mjs  (bugs from notes/day1-choice-review-codex.md)
import fs from 'node:fs';
import path from 'node:path';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
// ui.js needs a DOM and audio; the runner only needs these few names from it
const UI_STUB = `export const ui = globalThis.__ui; export const voice = () => Promise.resolve(); export const sfx = () => {};
export const setFace = () => {}; export const PORTRAITS = {}; export async function voiceThenBeat() {}`;
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(spec, ctx, next) { if (/\\/ui\\.js$/.test(spec) || spec === './ui.js') return { url: 'data:text/javascript,' + encodeURIComponent(${JSON.stringify(UI_STUB)}), shortCircuit: true }; return next(spec, ctx); }`));
globalThis.window = globalThis.window || {};
globalThis.fetch = async () => ({ ok: false, json: async () => [] });

let pick = () => 0, offered = [];
globalThis.__ui = { say: async () => {}, closeTalk() {}, caption() {}, toast() {}, refreshWords() {}, introSay() {},
  choose: async (_w, _t, opts) => { const texts = opts.map((o) => o.html); offered.push(texts); return pick(texts); } };
const { Runner, flags } = await import(pathToFileURL(path.join(root, 'js/runner.js')).href);
const load = async (n) => (await import(pathToFileURL(path.join(root, `story/${n}.js`)).href)).default;

let fails = 0;
const ok = (c, msg) => { if (!c) { fails++; console.log('FAIL ' + msg); } };
const calls = [];
function fresh(story) {
  for (const k in flags) delete flags[k];
  calls.length = 0; offered = [];
  const inv = [];
  const hooks = new Proxy({ buy: async (s) => { inv.push(s.item); calls.push('buy'); } }, { get: (t, k) => t[k] || (async () => { calls.push(k); }) });
  const game = { hooks, busy: false, queue: [], wait: async () => {}, beat: (f) => f() };
  const r = new Runner(game); r.use({ name: 'test', hooks: {} }, story);
  return { r, inv };
}
const run = async (r, key) => { const n = r.resolve(key); ok(n, `nothing runs for ${key}`); if (n) await r.run(n); };

// 1. gifts: main.js give() consumes only when the matched entry isn't keep: true; mirror that here
const office = await load('office');
ok(/if \(!game\.runner\.entry\(k, \{ peek: true \}\)\.keep\) \{ take\(item\)/.test(fs.readFileSync(path.join(root, 'js/main.js'), 'utf8')), 'main.js give() no longer checks keep before take()');
for (const [who, fav, other] of [['mio', 'coffee', 'tea'], ['mori', 'cornsoup', 'melon'], ['kenji', 'melon', 'coffee']]) {
  const { r } = fresh(office);
  const bag = [fav, other, fav];
  const give = async (item) => {
    const k = [`give:${item}:${who}`, `give:*:${who}`].find((x) => r.has(x));
    if (!k) return 'none';
    if (!r.entry(k, { peek: true }).keep) { bag.splice(bag.indexOf(item), 1); flags[`gave_${item}_${who}`] = true; }
    await r.run(r.resolve(k)); return k;
  };
  await give(fav);
  ok(bag.length === 2 && flags['gifted_' + who], `${who}: first gift not taken`);
  const bond = calls.filter((c) => c === 'bond').length;
  await give(fav); ok(bag.length === 2, `${who}: repeat ${fav} (exact trigger) used up the item`);
  await give(other); ok(bag.length === 2 && !flags[`gave_${other}_${who}`], `${who}: repeat ${other} (wildcard trigger) used up the item`);
  ok(calls.filter((c) => c === 'bond').length === bond, `${who}: repeat gift changed the bond`);
}
{ const { r } = fresh(office); ok(!r.has('give:coffee:tama') && !r.has('give:*:tama'), 'someone with no gift trigger would take the item'); }

// 2. vending: first order sticks, talking again doesn't sell, 動いて drops that one order once, then normal sales
for (const [i, item] of ['coffee', 'tea', 'melon', 'cornsoup'].entries()) {
  const { r, inv } = fresh(office);
  pick = () => i; await run(r, 'talk:vending');
  ok(flags.vend_stuck && flags.vend_want === i + 1 && !inv.length, `${item}: first order didn't stick`);
  pick = () => 3; await run(r, 'talk:vending');
  ok(!inv.length && !calls.includes('vendingDrop') && offered.length === 1, `${item}: the stuck machine sold another drink`);
  await run(r, 'say:ugoite:vending');
  ok(!flags.vend_stuck && inv.join() === item && calls.filter((c) => c === 'vendingDrop').length === 1, `${item}: 動いて didn't drop the order once (${inv})`);
  await run(r, 'say:ugoite:vending'); ok(inv.length === 1, `${item}: 動いて again dropped another`);
  pick = () => 3; await run(r, 'talk:vending');
  ok(inv.join() === `${item},cornsoup`, `${item}: a later purchase didn't work (${inv})`);
}

// 3. train: the mum question only after she mentions her mother
const train = await load('train');
for (const [start, want] of [['mio_catches', false], ['caught', true], ['dropped', true]]) {
  const { r } = fresh(train);
  pick = () => 0; await r.run(start);
  const intro = offered.find((o) => o.some((t) => /I'm Eric/.test(t)));
  ok(intro, `${start}: no introduction choice`);
  if (intro) ok(intro.some((t) => /mum/.test(t)) === want, `${start}: mum question ${want ? 'missing' : 'offered before its setup'}`);
  ok(intro && intro.some((t) => /nod/i.test(t)), `${start}: nod option missing`);
  if (want) {
    const { r: r2 } = fresh(train); pick = (t) => { const j = t.findIndex((x) => /mum/.test(x)); return j >= 0 ? j : 0; };
    await r2.run(start);
    ok(flags.mio_warm === (start === 'caught' ? 2 : 1), `${start}: mum question warmth wrong (${flags.mio_warm})`);
  }
}

console.log(fails ? `${fails} problem(s)` : 'choice-check: ok');
process.exit(fails ? 1 : 0);
