import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { SCENES, NODES } from './index.js';
import { compileCondition, createConditionEvaluator } from '../../js/narrative/conditions.js';
import { expandMc, PROTAGONISTS } from '../../js/mc.js';
const cast = ['mio', 'mori', 'kenji', 'emi', 'guard', 'kuroda', 'kuro', 'aoi', 'rei', 'tama'];
const tags = new Set([...readFileSync(new URL('../VOICE-DIRECTION.md', import.meta.url), 'utf8').matchAll(/^\| (\w+) \|/gm)].map(m => m[1]));
for (const who of cast) for (const step of [2, 3]) assert(SCENES.some(s => s.who === who && s.step === step));
function inspect(steps) {
  for (const s of steps) {
    assert(!s.wait); if (s.if) assert(!compileCondition(s.if).error);
    if (s.say) {
      assert(tags.has(s.emo), `Unregistered voice tag ${s.emo}`);
      assert(!Object.hasOwn(s, 'en'), `English subtitle in conversation: ${s.say}`);
      if (['mori', 'guard', 'kuroda', 'aoi', 'member'].includes(s.say)) assert(s.overheard, `Unblurred Japanese: ${s.say}`);
      assert(!/\bEric\b|エリック|Carina|カリーナ/.test(s.text), 'Literal protagonist name');
    }
    if (s.go) assert(NODES[s.go]); if (s.call) assert(NODES[s.call]);
    assert(s.do !== 'bond', 'Early milestones cannot manufacture points');
    assert(s.do !== 'ticket' && s.do !== 'find');
    if (s.then) inspect(s.then); if (s.else) inspect(s.else);
    for (const c of s.choice || []) { assert(NODES[c.go]); if (c.if) assert(!compileCondition(c.if).error); }
  }
}
Object.values(NODES).forEach(inspect);
for (const mc of Object.values(PROTAGONISTS)) assert(!JSON.stringify(expandMc(structuredClone(NODES), mc)).includes('{mc.'));
function play(node, flags, picks) {
  const f = { ...flags }, hooks = [], lines = [], cond = createConditionEvaluator(key => f[key] ?? false);
  let position = 0, budget = 500;
  function steps(list) {
    for (const s of list) {
      assert(--budget > 0);
      if (s.set) typeof s.set === 'string' ? f[s.set] = true : Object.assign(f, s.set);
      if (s.unset) delete f[s.unset];
      if (s.if) { const r = steps(cond(s.if) ? s.then || [] : s.else || []); if (r) return r; }
      if (s.say) lines.push(`${s.name || s.say}: ${s.text}${s.overheard ? ' [Japanese; unknown words blur]' : ''}`);
      if (s.call) { const r = run(s.call); if (r?.pending) return r; }
      if (s.go) return run(s.go) || { stop: true };
      if (s.end) return { stop: true };
      if (s.choice) {
        const options = s.choice.filter(c => !c.if || cond(c.if));
        if (position >= picks.length) return { pending: options.map(c => c.go) };
        const selected = picks[position++], c = options.find(c => c.go === selected); assert(c, 'Unavailable choice');
        lines.push(`CHOICE: ${c.text}`); return run(c.go) || { stop: true };
      }
      if (s.do) {
        if (['milestone', 'gesture', 'face', 'look'].includes(s.do)) lines.push(`STAGE: ${s.do} ${s.who || ''} ${s.state || s.kind || ''} ${s.to || s.at || ''}`.trim());
        hooks.push(s); if (s.do === 'bondStep') f['bond' + s.to + '_' + s.who] = true; }
    }
  }
  function run(id) { return steps(NODES[id]); }
  return { ...(run(node) || {}), flags: f, hooks, lines };
}
let routes = 0; const transcripts = [];
for (const scene of SCENES) {
  assert(!compileCondition(scene.if).error);
  const flags = { day: scene.from, place: scene.place, period: scene.period, d3_aoi_intro: true, d4_rei_intro: true, d4_tennis_done: true, d3_swim_done: true, d3_kuro_intro: true };
  for (const who of cast) { flags['step_' + who] = 2; flags['bondready_' + who] = 3; }
  for (const history of [{}, { lunch_mori: true, d4_played_aoi: true }, { d4_watched_rei: true }]) {
    const queue = [[]];
    while (queue.length) {
      const picks = queue.shift(), p = play(scene.node, { ...flags, ...history }, picks);
      if (p.pending) { queue.push(...p.pending.map(id => [...picks, id])); continue; }
      routes++;
      const complete = scene.step === 1 ? !picks.includes('milestone_leave') : p.flags['ms' + scene.step + '_' + scene.who];
      const gates = p.hooks.filter(h => h.do === 'bondStep');
      assert.equal(gates.length, complete && scene.step === 3 ? 1 : 0);
      assert.equal(p.hooks.filter(h => h.do === 'period').length, complete && scene.cost === 'next' ? 1 : 0);
      if (complete && scene.cost === 'next') {
        const period = p.hooks.findIndex(h => h.do === 'period');
        const completionSave = p.hooks.findLastIndex(h => h.do === 'save');
        assert(period < completionSave, 'Save must include the consumed period');
        assert(!p.hooks.slice(0, period).some(h => h.do === 'save'), 'No completed-scene save before its time cost');
      }
      if (complete && scene.step >= 2) {
        const replay = play(scene.node, p.flags, []);
        assert(!replay.pending); assert.equal(replay.hooks.filter(h => ['bondStep', 'period', 'remember'].includes(h.do)).length, 0);
      }
      if (!Object.keys(history).length) transcripts.push(`\n## ${scene.node} ${picks.join(', ')}\n${p.lines.join('\n')}`);
    }
  }
}
if (process.argv[2]) writeFileSync(process.argv[2], transcripts.join('\n'));
console.log(`${SCENES.length} milestone offers; ${routes} branches: gates, costs, deferral, replay and protagonist tokens pass.`);
