// Bond maths, caps and gates, plus a sanity check of day 1's data against the story files.
// node game3d/js/bonds/test.mjs   (exits 1 on the first failure)
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Bonds, STEPS, DAY_CAP, weekOf, dateOf } from './model.js';
import { CAST, WORD_REGISTER } from './cast.js';
import { MOMENTS, REASONS, EXPECT } from './day1.js';

let n = 0;
const t = (name, fn) => { try { fn(); n++; } catch (e) { console.log(`FAIL ${name}\n  ${e.message}`); process.exit(1); } };
const fresh = (cast = {}) => { const flags = {}; const b = new Bonds({ cast, flag: (k) => !!flags[k] }); return { b, flags }; };

t('calendar', () => {
  assert.equal(dateOf(1), 'Thu 1 Oct'); assert.equal(dateOf(5), 'Mon 5 Oct'); assert.equal(dateOf(32), 'Sun 1 Nov');
  assert.equal(weekOf(1), 0); assert.equal(weekOf(4), 0); assert.equal(weekOf(5), 1); assert.equal(weekOf(11), 1); assert.equal(weekOf(12), 2);
});

t('stranger until met, known when met', () => {
  const { b } = fresh();
  b.award('mio', { source: 'talk' });
  assert.equal(b.step('mio'), 0, 'points alone do not make someone known');
  assert.equal(b.meet('mio'), true); assert.equal(b.meet('mio'), false);
  assert.equal(b.step('mio'), 1);
});

t('3 points a day per person, all sources together', () => {
  const { b } = fresh(); b.meet('mio'); b.meet('mori');
  assert.equal(b.award('mio', { source: 'talk' }).added, 1);
  const r = b.award('mio', { source: 'ticket' }); assert.equal(r.added, 2);
  const r2 = b.award('mio', { source: 'ticket' }); assert.equal(r2.added, 0); assert.equal(r2.capped, 'day');
  assert.equal(b.p.mio.pts, DAY_CAP);
  assert.equal(b.award('mori', { source: 'ticket' }).added, 2, 'the cap is per person');
  const big = b.award('mori', { source: 'scene', add: 3, key: 'lunch' }); assert.equal(big.added, 1); assert.equal(big.capped, 'day');
  b.setDay(2);
  assert.equal(b.award('mio', { source: 'ticket' }).added, 2, 'caps reset the next day');
});

t('once rules: greeting once ever, talk once a day, a scene once per key', () => {
  const { b } = fresh(); b.meet('kenji');
  assert.equal(b.award('kenji', { source: 'greet' }).added, 1);
  assert.equal(b.award('kenji', { source: 'greet' }).capped, 'once');
  b.setDay(2);
  assert.equal(b.award('kenji', { source: 'greet' }).capped, 'once', 'greeting counts once, ever');
  assert.equal(b.award('kenji', { source: 'talk' }).added, 1);
  assert.equal(b.award('kenji', { source: 'talk' }).capped, 'once');
  assert.equal(b.award('kenji', { source: 'scene', key: 'a' }).added, 1);
  assert.equal(b.award('kenji', { source: 'scene', key: 'a' }).capped, 'once');
  b.setDay(3);
  assert.equal(b.award('kenji', { source: 'scene', key: 'a' }).capped, 'once', 'a scene never counts twice');
  assert.equal(b.award('kenji', { source: 'talk' }).added, 1, 'talk again the next day');
});

t('bonds never go down', () => {
  const { b } = fresh(); b.meet('mio'); b.award('mio', { source: 'ticket' });
  const r = b.award('mio', { source: 'scene', add: -2, key: 'x' });
  assert.equal(r.added, 0); assert.equal(b.p.mio.pts, 2);
});

t('gifts: reaction points, one liked gift a week, a need once', () => {
  const { b, flags } = fresh({ mori: { likes: ['cornsoup'], dislikes: ['coffee'], needs: [{ id: 'thermos', item: 'tea', said: 'mori_said_empty' }] } });
  b.meet('mori');
  assert.equal(b.giftReaction('mori', 'cornsoup'), 'like');
  assert.equal(b.giftReaction('mori', 'coffee'), 'dislike');
  assert.equal(b.giftReaction('mori', 'melon'), 'neutral');
  assert.equal(b.giftReaction('mori', 'tea'), 'neutral', 'a need only counts once they have said it');
  assert.equal(b.award('mori', { source: 'gift', item: 'coffee' }).added, 0);
  assert.equal(b.award('mori', { source: 'gift', item: 'cornsoup' }).added, 1);
  b.setDay(2);
  const again = b.award('mori', { source: 'gift', item: 'cornsoup' });
  assert.equal(again.added, 0); assert.equal(again.capped, 'week');
  b.setDay(5);   // Monday: a new week
  assert.equal(b.award('mori', { source: 'gift', item: 'cornsoup' }).added, 1);
  b.setDay(6);
  flags.mori_said_empty = true;
  assert.equal(b.giftReaction('mori', 'tea'), 'need');
  const need = b.award('mori', { source: 'gift', item: 'tea' });
  assert.equal(need.source, 'need'); assert.equal(need.added, 3);
  assert.equal(b.giftReaction('mori', 'tea'), 'neutral', 'a need is answered once');
});

t('steps 3 to 5 wait on their scenes; points stop at the threshold', () => {
  const { b, flags } = fresh({ mio: { gates: { 3: 'mio_turn' } } });
  b.meet('mio');
  let day = 1;
  const grind = (days) => { for (let i = 0; i < days; i++) { b.setDay(++day); b.award('mio', { source: 'ticket' }); b.award('mio', { source: 'talk' }); } };
  grind(2); assert.equal(b.p.mio.pts, 6); assert.equal(b.step('mio'), 2);
  grind(10); assert.equal(b.p.mio.pts, 14, 'ground points stop at 14 without the turn scene');
  assert.equal(b.step('mio'), 2); assert.equal(b.ready('mio'), 3);
  b.setDay(++day); assert.equal(b.award('mio', { source: 'talk' }).capped, 'gated');
  assert.equal(b.gate('mio', 3), 'mio_turn'); assert.equal(b.gate('mio', 4), 'bond4_mio');
  flags.mio_turn = true;
  assert.equal(b.step('mio'), 3); assert.equal(b.ready('mio'), 0);
  grind(10); assert.equal(b.p.mio.pts, 24); assert.equal(b.step('mio'), 3); assert.equal(b.ready('mio'), 4);
  flags.bond5_mio = true;
  assert.equal(b.step('mio'), 3, 'step 5 needs step 4 first');
  flags.bond4_mio = true;
  assert.equal(b.step('mio'), 5);
  delete flags.bond5_mio;
  assert.equal(b.step('mio'), 4); assert.equal(b.ready('mio'), 5);
});

t('partial award at the gate', () => {
  const { b } = fresh(); b.meet('x');
  b.p.x.pts = 13;
  const r = b.award('x', { source: 'ticket' });
  assert.equal(r.added, 1); assert.equal(r.capped, 'gated'); assert.equal(b.p.x.pts, 14);
});

t('rememberedBy and facts', () => {
  const { b } = fresh();
  assert.equal(b.remember('mio', 'caught bag', 'You caught her lunch bag.'), true);
  assert.equal(b.remember('mio', 'caught_bag', 'again'), false, 'keys are normalised and remembered once');
  assert.equal(b.remembers('mio', 'caught_bag'), true); assert.equal(b.remembers('mori', 'caught_bag'), false);
  for (let i = 0; i < 20; i++) b.remember('mio', 'k' + i, 't' + i);
  assert.equal(b.p.mio.rem.length, 12, 'the shown memory is short');
  assert.equal(b.remembers('mio', 'caught_bag'), true, 'but nothing is forgotten for conditions');
  assert.equal(b.learnFact('mio', 'mum', 'Stays at her mum’s.'), true);
  assert.equal(b.learnFact('mio', 'mum', 'twice'), false);
  b.notice('mio', 'coffee');
  const v = new Bonds({ cast: { mio: { likes: ['coffee', 'melonbread'] } } });
  v.person('mio').noticed.push('coffee');
  assert.deepEqual(v.view('mio', { itemName: (x) => ({ coffee: 'Canned coffee' }[x] || x) }).known, ['Likes canned coffee.'], 'only noticed likes show');
});

t('relations', () => {
  const { b } = fresh({ kenji: { rel: { mori: 'likes' } } });
  assert.equal(b.relation('kenji', 'mori'), 'likes');
  assert.equal(b.relHolds('kenji likes mori'), true); assert.equal(b.relHolds('kenji>mori:likes'), true);
  assert.equal(b.relHolds('mori likes kenji'), false, 'relations are one way');
  b.relate('kenji', 'mio', 'owes'); assert.equal(b.relHolds('kenji owes mio'), true);
  b.relate('kenji', 'mio', 'none'); assert.equal(b.relation('kenji', 'mio'), '');
  assert.throws(() => b.relate('a', 'b', 'hates'));
});

t('save and load', () => {
  const { b, flags } = fresh({ kenji: { rel: { mori: 'likes' } } });
  b.meet('mio'); b.award('mio', { source: 'ticket', why: 'copier' }); b.remember('mio', 'bag', 'You caught it.'); b.learnFact('mio', 'mum', 'Mum.');
  b.relate('mori', 'kenji', 'rivals');
  const json = JSON.parse(JSON.stringify(b.toJSON()));
  const c = new Bonds({ cast: { kenji: { rel: { mori: 'likes' } } }, flag: (k) => !!flags[k] });
  assert.equal(c.load(json), true);
  assert.equal(c.step('mio'), 1); assert.equal(c.p.mio.pts, 2); assert.equal(c.remembers('mio', 'bag'), true);
  assert.equal(c.relation('mori', 'kenji'), 'rivals'); assert.equal(c.relation('kenji', 'mori'), 'likes');
  assert.equal(c.award('mio', { source: 'ticket' }).added, 1, 'the day cap survives a reload');
});

// ---------- day 1 data against the story files ----------
const story = {};
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../story');
for (const p of ['train', 'gate', 'office']) story[p] = (await import(pathToFileURL(path.join(root, p + '.js')).href)).default;
const people = new Set(['mio', 'mori', 'kenji', 'guard', 'kuroda', 'kuro', 'emi', 'aoi', 'rei']);

t('day 1 moments point at real nodes, people and text', () => {
  for (const [pl, list] of Object.entries(MOMENTS)) for (const [node, m] of Object.entries(list)) {
    assert.ok(story[pl].nodes[node], `${pl}: no node ${node}`);
    for (const [who, key, text] of [...(m.remember || []), ...(m.fact || [])]) { assert.ok(people.has(who), `${node}: who ${who}`); assert.ok(key && text && !/—|\\/.test(text), `${node}: ${key} text`); }
    for (const [who, src] of m.bond || []) assert.ok(people.has(who) && src, `${node}: bond`);
  }
  for (const [pl, list] of Object.entries(REASONS)) for (const k of Object.keys(list)) assert.ok(story[pl].nodes[k.split(':')[0]], `${pl}: reason for missing node ${k}`);
});

t('every story bond step has a source', () => {
  const walk = (steps, f) => { for (const s of steps || []) { if (s && typeof s === 'object') { f(s); walk(s.then, f); walk(s.else, f); } } };
  for (const [pl, st] of Object.entries(story)) for (const [node, steps] of Object.entries(st.nodes)) walk(steps, (s) => {
    if (s.do !== 'bond') return;
    const R = REASONS[pl] || {};
    assert.ok(s.source || R[`${node}:${s.who}`] || R[node], `${pl}/${node}: bond for ${s.who} has no source (add one to day1.js REASONS)`);
  });
});

t('cast data', () => {
  for (const [id, c] of Object.entries(CAST)) {
    if (c.register) assert.ok(['casual', 'polite'].includes(c.register), id);
    for (const [b, k] of Object.entries(c.rel || {})) assert.ok(people.has(b) && ['likes', 'owes', 'rivals'].includes(k), `${id} -> ${b}`);
  }
  for (const w of ['ohayo', 'yoroshiku', 'sumimasen', 'matte']) assert.ok(WORD_REGISTER[w], w);
  for (const r of Object.values(EXPECT)) for (const id of Object.keys(r)) assert.ok(people.has(id), id);
  assert.equal(STEPS.length, 6);
});

console.log(`bonds test: ${n} passed`);
