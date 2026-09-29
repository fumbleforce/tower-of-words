// Checks the story files against the engine: unknown speakers, words, hooks, ids, spots, missing nodes,
// conditions that don't parse. node game3d/tools/story-check.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');

// what the engine offers, scraped from the sources
const SAYABLE = ['ohayo', 'yoroshiku', 'sumimasen', 'matte', 'akete', 'kite', 'ugoite', 'irete', 'dashite', 'tomatte'];
const words = [...rd('js/lang.js').matchAll(/^\s+(\w+): \{ ja:/gm)].map((m) => m[1]);
const speakers = [...rd('js/runner.js').matchAll(/^\s+(\w+): \{ name:/gm)].map((m) => m[1]);
// global hooks: main.js's H.x, plus the ones sim.js registers (bond, bondStep, remember, fact, relate)
const globalHooks = [...rd('js/main.js').matchAll(/^H\.(\w+) =/gm), ...rd('js/sim.js').matchAll(/H\.(\w+) =/g), ...rd('js/sim.js').matchAll(/hooks\.(\w+) =/g)].map((m) => m[1]).concat(['bond', 'bondStep', 'remember', 'fact', 'relate']);
function placeInfo(file) {
  const s = rd(file);
  const block = (name) => { const i = s.indexOf(`const ${name} = {`); if (i < 0) return ''; let d = 0, j = s.indexOf('{', i); for (let k = j; k < s.length; k++) { if (s[k] === '{') d++; if (s[k] === '}') { d--; if (!d) return s.slice(j, k); } } return ''; };
  const keys = (b) => [...b.matchAll(/^\s{4}(\w+):/gm)].map((m) => m[1]);
  const hooksB = (() => { const i = s.indexOf('hooks: {'); let d = 0; for (let k = s.indexOf('{', i); k < s.length; k++) { if (s[k] === '{') d++; if (s[k] === '}') { d--; if (!d) return s.slice(i, k); } } return ''; })();
  return { things: keys(block('things')), spots: [...block('spots').matchAll(/(\w+): \[/g)].map((m) => m[1]), seats: [...block('seats').matchAll(/(\w+): \{ x/g)].map((m) => m[1]), zones: [...block('zones').matchAll(/(\w+): \(x, z\)/g)].map((m) => m[1]), hooks: [...hooksB.matchAll(/^\s{6}(\w+):/gm)].map((m) => m[1]), people: [...s.matchAll(/const people = \{([^}]*)\}/g)].flatMap((m) => m[1].split(',').map((x) => x.trim().split(':')[0].trim())).filter(Boolean) };
}
const PL = { train: placeInfo('js/places/train.js'), gate: placeInfo('js/places/lobby.js'), office: placeInfo('js/places/office.js') };
const EVENTS = { train: ['start', 'approach', 'arrived', 'chime'], gate: ['start', 'card_red', 'card_ok', 'arch_blocked', 'gate_opened'], office: ['start', 'sat_down'] };

let problems = 0;
const bad = (f, msg) => { problems++; console.log(`${f}: ${msg}`); };
function checkCond(f, c) { if (typeof c !== 'string') return; if (!/^[\w\s!&|()<>=.'"+-]*$/.test(c)) bad(f, `condition has odd characters: ${c}`); try { new Function('F', 'return (' + c.replace(/'[^']*'|"[^"]*"|\b[A-Za-z_]\w*\b/g, (m) => (/^['"]/.test(m) || m === 'true' || m === 'false' ? m : `F(${JSON.stringify(m)})`)) + ');'); } catch { bad(f, `condition doesn't parse: ${c}`); } }
function checkText(f, t) { for (const m of t.matchAll(/\{(\w+)\}/g)) if (!words.includes(m[1])) bad(f, `unknown word {${m[1]}} in "${t.slice(0, 60)}"`); }

for (const name of ['train', 'gate', 'office', 'transitions']) {
  let file = `story/${name}.js`;
  if (!fs.existsSync(path.join(root, file))) { file = `story/placeholder/${name}.js`; console.log(`(${name}: using the placeholder)`); }
  const st = (await import(pathToFileURL(path.join(root, file)).href)).default;
  const P = PL[name];
  const spk = new Set([...speakers, ...Object.keys(st.speakers || {})]);
  const nodes = st.nodes || {};
  const hookOk = (h) => globalHooks.includes(h) || (P && P.hooks.includes(h)) || (name === 'transitions');
  const idOk = (id) => !P || P.things.includes(id) || P.people.includes(id) || P.spots.includes(id) || P.seats.includes(id) || ['eric', 'player', 'mio'].includes(id) || Array.isArray(id);
  function steps(where, list) {
    if (!Array.isArray(list)) { bad(file, `${where} is not a list`); return; }
    for (const s of list) {
      if (typeof s === 'string') {
        const i = s.indexOf(': ');
        if (!s.startsWith('>') && i > 0 && /^\w+$/.test(s.slice(0, i)) && !spk.has(s.slice(0, i))) bad(file, `${where}: unknown speaker ${s.slice(0, i)}`);
        checkText(file, s); continue;
      }
      if (s.say && !spk.has(s.say)) bad(file, `${where}: unknown speaker ${s.say}`);
      if (s.text) checkText(file, s.text);
      if (s.line) checkText(file, s.line);
      if (s.voice && !fs.existsSync(path.join(root, 'audio', s.voice + '.mp3'))) bad(file, `${where}: no audio/${s.voice}.mp3`);
      if (s.go && !nodes[s.go]) bad(file, `${where}: go to missing node ${s.go}`);
      if (s.call && !nodes[s.call]) bad(file, `${where}: call to missing node ${s.call}`);
      if (s.if !== undefined) checkCond(file, s.if);
      if (s.then) steps(where, s.then); if (s.else) steps(where, s.else);
      if (s.choice) for (const o of s.choice) { if (o.go && !nodes[o.go]) bad(file, `${where}: choice goes to missing node ${o.go}`); if (o.call && !nodes[o.call]) bad(file, `${where}: choice calls missing node ${o.call}`); if (o.if) checkCond(file, o.if); checkText(file, o.text || ''); }
      if (s.offer && !SAYABLE.includes(s.offer)) bad(file, `${where}: offer of unknown command ${s.offer}`);
      if (s.do) {
        if (!hookOk(s.do)) bad(file, `${where}: unknown hook ${s.do}`);
        for (const k of ['who', 'to', 'on', 'at', 'id']) if (s[k] !== undefined && typeof s[k] === 'string' && !idOk(s[k]) && !(s.do === 'floor') && !(s.do === 'period') && !(s.do === 'sit' && k === 'at')) bad(file, `${where}: ${s.do} ${k} '${s[k]}' is not a person, object or spot here`);
        if (s.do === 'sit' && P && s.at && !P.seats.includes(s.at)) bad(file, `${where}: no seat '${s.at}'`);
      }
    }
  }
  if (name === 'transitions') { for (const [k, v] of Object.entries(st)) for (const part of ['walk', 'ride', 'arrive']) if (v[part]) steps(`${k}.${part}`, v[part]); continue; }
  if (st.start && !nodes[st.start]) bad(file, `start node ${st.start} is missing`);
  for (const [k, n] of Object.entries(nodes)) steps(k, n);
  for (const [key, v] of Object.entries(st.on || {})) {
    for (const e of Array.isArray(v) ? v : [v]) { const t = typeof e === 'string' ? { node: e } : e; if (!nodes[t.node]) bad(file, `on ${key}: missing node ${t.node}`); if (t.if) checkCond(file, t.if); }
    const g = /^give:(\w+|\*):(\w+)$/.exec(key);
    if (g) { if (g[1] !== '*' && !['coffee', 'tea', 'melon', 'cornsoup'].includes(g[1])) bad(file, `on ${key}: unknown item`); if (P && !P.things.includes(g[2]) && g[2] !== 'mio') bad(file, `on ${key}: no person '${g[2]}' here`); continue; }
    const m = /^(talk|say|near|zone|event):(?:(\w+):)?(.+)$/.exec(key);
    if (!m) { bad(file, `odd trigger ${key}`); continue; }
    const [, kind, cmd, id] = m;
    if (kind === 'say' && !SAYABLE.includes(cmd)) bad(file, `on ${key}: unknown command`);
    if ((kind === 'talk' || kind === 'say' || kind === 'near') && id !== '*' && P && !P.things.includes(id) && id !== 'mio') bad(file, `on ${key}: no object or person '${id}' here`);
    if (kind === 'zone' && P && !P.zones.includes(id)) bad(file, `on ${key}: no zone '${id}'`);
    if (kind === 'event' && !EVENTS[name].includes(id)) bad(file, `on ${key}: no event '${id}'`);
  }
  for (const [id, L] of Object.entries(st.labels || {})) if (Array.isArray(L)) checkCond(file, L[1]);
  for (const [id, c] of Object.entries({ ...(st.show || {}), ...(st.goal || {}) })) { checkCond(file, c); if (P && !P.things.includes(id) && id !== 'mio') bad(file, `show/goal for unknown id ${id}`); }
}
console.log(problems ? `${problems} problem(s)` : 'story check: ok');
process.exitCode = problems ? 1 : 0;
