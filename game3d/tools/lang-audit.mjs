import { STORY_FILES } from '../js/places/definitions.js';
import { DEFAULT_SPEAKERS } from '../js/narrative/speakers.js';
// Language audit for day 1. node game3d/tools/lang-audit.mjs [--brief] [--json]
//
// Walks the day in story order (every branch of every choice, both routes through the gate, both lunches),
// tracks which words Eric has been taught at each point, and flags every place where Japanese he hasn't been
// taught shows up as readable text: story lines, choice buttons, hints, overheard lines (their `clear` lists and
// the interjections the gibberish filter leaves readable), labels and names, signs and props drawn in the 3D
// scenes, and the UI. It also lists where each word is taught and how often it comes back afterwards.
//
// Taught = typed ({ do: 'type' }), `learn` or `offer`. A glossed {id} in a line is explained on the spot but
// doesn't teach the word, and an overheard {id} stays gibberish until it's taught. Same rule as the engine (lang.js `known`).
//
// Levels: ERROR = readable Japanese he can't read and nothing explains it, or a broken word id. WARN = readable
// Japanese outside the taught set that is glossed on the spot (a `clear` entry or a hand gloss), or a taught word
// that never comes back. INFO = everything else worth knowing. Exit code 1 when there is any ERROR.
//
// When the story's main line changes, update MAIN below (the tool checks every node it names exists).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { heardTextData, javascriptTextGroups, speechHintUsesKnownWord } from '../../tools/lib/language-source.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const imp = async (p) => (await import(pathToFileURL(path.join(root, p)).href));
const args = new Set(process.argv.slice(2));

const { WORDS } = await imp('js/lang.js');
const uiSrc = rd('js/ui/dialogue-text.js');
const { INTERJ, POOL, glossed: usesInterjectionGlosses } = heardTextData(uiSrc);
// interjections that are only sounds; the rest of INTERJ (はい, うん, ええ, まあ, ほら, あの...) are words
// (hesitation fillers like えっと read as "um" in any language, so they count as sounds too)
const SOUNDS = new Set(['あ', 'え', 'お', 'ん', 'あっ', 'えっ', 'おっ', 'ああ', 'あー', 'えー', 'うわ', 'わあ', 'えっと', 'あの', 'あのう']);
// Word interjections are fine once the UI actually reads their glossary.
const { INTERJ_GLOSS = {} } = await imp('js/lang.js');
const GLOSSED_INTERJ = usesInterjectionGlosses ? new Set(Object.keys(INTERJ_GLOSS)) : new Set();

// The main line: the nodes every player passes through, in order. 'a|b' = one of these (a route choice).
// Everything else in `on` is a side trigger; it's walked from the earliest point its conditions can hold.
const MAIN = [
  ['train', ['intro', 'seat', 'mio_catches|caught|dropped', 'lesson', 'ohayo_cat', 'lesson3', 'approach', 'arrival', 'platform', 'mio_phone']],
  ['transitions', ['train_to_gate']],
  ['gate', ['lobby_in', 'card_red', 'word_say|way_social', 'past_gate', 'to_lift']],
  ['transitions', ['gate_to_office']],
  ['office', ['office_in', 'yoroshiku_mori|ohayo_mori', 'kenji_first', 'mio_opens|akete_machine', 'machine_in', 'chair_push', 'ticket', 'copier', 'ticket_done', 'work_afternoon', 'ending']],
];

const STORY = {};
for (const n of STORY_FILES) {
  const f = fs.existsSync(path.join(root, `story/${n}.js`)) ? `story/${n}.js` : `story/placeholder/${n}.js`;
  STORY[n] = (await imp(f)).default;
}
// transitions become pseudo nodes of their own
STORY.transitions = { nodes: Object.fromEntries(Object.entries(STORY.transitions).filter(([k]) => /_to_/.test(k)).map(([k, v]) => [k, [...(v.walk || []), ...(v.arrive || []), ...(v.ride || [])]])), on: {}, speakers: STORY.transitions.speakers };

// ---------------------------------------------------------------- findings
const findings = [];   // { level, owner, where, msg, text }
const seenIssue = new Map();
function flag(level, owner, where, msg, text = '') {
  const key = `${level}|${where}|${msg}`;
  if (seenIssue.has(key)) { seenIssue.get(key).n++; return; }
  const f = { level, owner, where, msg, text: text.length > 90 ? text.slice(0, 88) + '…' : text, n: 1 };
  seenIssue.set(key, f); findings.push(f);
}

// ---------------------------------------------------------------- Japanese helpers
const JP = /[぀-ヿ㐀-鿿０-９ｦ-ﾟ々〆ヶ]+/g;
const isJP = (s) => /[぀-ヿ㐀-鿿]/.test(s);
const FORMS = [];   // [ja, id] longest first
for (const [id, w] of Object.entries(WORDS)) for (const ja of [w.ja, ...(w.alias || [])]) FORMS.push([ja, id]);
FORMS.sort((a, b) => b[0].length - a[0].length);
const wordOf = (s) => (FORMS.find(([ja]) => ja === s) || [])[1];

// ---------------------------------------------------------------- the walk
const teach = new Map();   // word -> [{ how, where, main }]
const uses = new Map();    // word -> Set(where)
const glossed = new Set(); // words shown glossed in a line: explained, so raw text of them later is fine, but not known
const sayTargets = new Map(); // word -> Set(place:target)
let MAINLINE = true;
function taught(word, how, where, st) {
  // typing, learning or taking the button after a glossed line adds to the same teaching moment
  if (st.has(word)) { const t = (teach.get(word) || []).find((x) => x.where.split('#')[0] === where.split('#')[0]); if (t && !t.how.includes(how)) t.how += `, then ${how}`; else used(word, where); return; }
  st.add(word);
  if (!teach.has(word)) teach.set(word, []);
  const list = teach.get(word);
  if (!list.some((t) => t.where === where)) list.push({ how, where, main: MAINLINE });
}
function used(word, where) { if (!uses.has(word)) uses.set(word, new Set()); uses.get(word).add(where); }

// an English line (lineHTML): {id} words glossed, anything else Japanese is shown raw
function checkLine(text, st, where, owner = 'story', kind = 'line') {
  if (typeof text !== 'string') return;
  for (const m of text.matchAll(/\{(\w+)\}/g)) {
    const id = m[1];
    if (!WORDS[id]) { flag('ERROR', owner, where, `{${id}} is not a word in lang.js (shows as raw "${id}")`, text); continue; }
    if (kind === 'choice') { flag('ERROR', owner, where, `{${id}} in a choice button isn't rendered (buttons don't gloss); it shows as "{${id}}"`, text); continue; }
    if (st.has(id)) used(id, where); else { st.add('~' + id); glossed.add(id); }   // explained here, not taught
  }
  const bare = text.replace(/\{\w+\}/g, ' ');
  for (const m of bare.matchAll(JP)) {
    const run = m[0], after = bare.slice(m.index + run.length);
    const id = wordOf(run);
    if (id && (st.has(id) || st.has('~' + id))) { if (st.has(id)) used(id, where); flag('INFO', owner, where, `${st.has(id) ? 'taught' : 'glossed earlier:'} word ${run} written raw, without its gloss (use {${id}})`, text); continue; }
    if (id) { flag('ERROR', owner, where, `${run} (${id}) appears before it's taught, raw`, text); continue; }
    if (INTERJ.includes(run) || /^[あえおうんーっ]+$/.test(run)) { flag(SOUNDS.has(run) ? 'INFO' : 'WARN', owner, where, `interjection ${run} shown readable in an English line`, text); continue; }
    if (/^\s*\(\s*[a-zA-Zāīūēō]/.test(after)) { flag('WARN', owner, where, `${run} hand-glossed in the text, outside the taught set`, text); continue; }
    flag('ERROR', owner, where, `readable Japanese ${run} that hasn't been taught and isn't glossed`, text);
  }
}
// an overheard line (heardHTML): taught words sharp, `clear` readable, sounds readable, the rest gibberish
const SPANS = fs.existsSync(path.join(root, 'audio/spans.json')) ? JSON.parse(rd('audio/spans.json')) : {};
const { heardKey } = await imp('tools/heardkey.mjs');
function checkHeard(s, st, where) {
  let text = s.text || '';
  const key = s.voice || heardKey(text), sharp = new Set();
  for (const m of text.matchAll(/\{(\w+)\}/g)) {
    const id = m[1];
    if (!WORDS[id]) { flag('ERROR', 'story', where, `{${id}} is not a word in lang.js`, text); continue; }
    if (st.has(id)) used(id, where); else flag('INFO', 'story', where, `{${id}} isn't taught yet here, so it shows as gibberish`, text);
  }
  text = text.replace(/\{(\w+)\}/g, (_, id) => (WORDS[id] ? WORDS[id].ja : id));
  const keep = [];
  for (const [ja, id] of FORMS) if (st.has(id)) keep.push({ ja, id });
  for (const c of s.clear || []) {
    const ja = typeof c === 'string' ? c : c.ja;
    if (!text.includes(ja)) flag('ERROR', 'story', where, `clear entry ${ja} isn't in the line`, text);
    const id = wordOf(ja);
    if (!isJP(ja)) { /* B2, IT, 1994: fine */ }
    else if (id && st.has(id)) flag('INFO', 'story', where, `clear entry ${ja} is already a taught word (not needed)`, text);
    else flag('WARN', 'story', where, `clear: ${ja}${typeof c === 'object' && c.en ? ` (${c.en})` : ' (no gloss)'} readable, outside the taught set`, text);
    keep.push({ ja, clear: true });
  }
  keep.sort((a, b) => b.ja.length - a.ja.length);
  const punct = /[\s、。！？!?…「」ー]/;
  let i = 0;
  while (i < text.length) {
    if (i === 0 || punct.test(text[i - 1])) {
      const it = INTERJ.find((w) => text.startsWith(w, i) && (i + w.length === text.length || punct.test(text[i + w.length])));
      if (it) { if (!SOUNDS.has(it) && !GLOSSED_INTERJ.has(it)) flag('WARN', 'shell', where, `the gibberish filter leaves the word ${it} readable with no gloss (INTERJ in ui.js; gloss it from lang.js INTERJ_GLOSS)`, text); i += it.length; continue; }
    }
    const k = keep.find((w) => text.startsWith(w.ja, i));
    if (k) { if (k.id) { used(k.id, where); sharp.add(k.id); } i += k.ja.length; continue; }
    i++;
  }
  // listening: a word he knows should come through clear in the muffled voice (audio/spans.json, from tools/voices.py)
  for (const m of (s.text || '').matchAll(/\{(\w+)\}/g)) if (WORDS[m[1]] && st.has(m[1])) sharp.add(m[1]);
  if (!fs.existsSync(path.join(root, 'audio', key + '.mp3'))) { flag('INFO', 'builder', where, `no voice clip ${key}.mp3 yet (run tools/voices.py)`, s.text); return; }
  for (const id of sharp) if (!(SPANS[key] || []).some(([, , w]) => w === id)) flag('WARN', 'builder', where, `voice: ${WORDS[id].ja} is sharp on screen but stays muffled in the clip (no span in audio/spans.json)`, s.text);
}

const memo = new Map(), busy = new Set();
const sig = (st) => [...st].sort().join(',');
const dedupe = (arr) => { const m = new Map(); for (const s of arr) m.set(sig(s), s); return [...m.values()]; };
let PLACE = 'train';

function runNode(name, st) {
  const nodes = STORY[PLACE].nodes || {};
  if (!nodes[name]) { flag('ERROR', 'story', `${PLACE}/${name}`, 'missing node'); return [st]; }
  const key = `${PLACE}/${name}|${sig(st)}|${MAINLINE}`;
  if (memo.has(key)) return memo.get(key).map((s) => new Set(s));
  if (busy.has(key)) return [st];
  busy.add(key);
  const r = runList(nodes[name], [st], `${PLACE}/${name}`);
  const out = dedupe([...r.cont, ...r.stop]);
  busy.delete(key); memo.set(key, out);
  return out.map((s) => new Set(s));
}
function runList(list, states, where) {
  let cont = states; const stop = [];
  (list || []).forEach((s, i) => {
    const next = [];
    for (const st of cont) { const r = step(s, new Set(st), `${where}#${i}`); next.push(...r.cont); stop.push(...r.stop); }
    cont = dedupe(next);
  });
  return { cont, stop: dedupe(stop) };
}
function speakerOf(str) { const i = str.indexOf(': '); return i > 0 && /^\w+$/.test(str.slice(0, i)) ? [str.slice(0, i), str.slice(i + 2)] : [null, str.replace(/^>\s*/, '')]; }
function step(s, st, where) {
  if (typeof s === 'string') { checkLine(speakerOf(s)[1], st, where); return { cont: [st], stop: [] }; }
  if (s.say) {
    if (s.overheard) checkHeard(s, st, where); else checkLine(s.text, st, where);
    if (s.name && isJP(s.name)) flag('ERROR', 'story', where, `speaker name ${s.name} in Japanese`);
    return { cont: [st], stop: [] };
  }
  if (s.choice) {
    if (s.prompt) checkLine(speakerOf(s.prompt)[1], st, where);
    const cont = [], stop = [];
    for (const o of s.choice) {
      checkLine(o.text || '', st, `${where} "${(o.text || '').slice(0, 24)}"`, 'story', 'choice');
      let sts = [new Set(st)];
      if (o.call) sts = sts.flatMap((x) => runNode(o.call, x));
      if (o.go) stop.push(...sts.flatMap((x) => runNode(o.go, x))); else cont.push(...sts);
    }
    return { cont: dedupe(cont), stop: dedupe(stop) };
  }
  if (s.offer) {
    if (s.line) checkLine(speakerOf(s.line)[1], st, where);
    if (!WORDS[s.offer]) flag('ERROR', 'story', where, `offer of unknown word ${s.offer}`);
    else taught(s.offer, 'offer (button)', where, st);
    return { cont: [st], stop: [] };
  }
  if (s.learn) {
    if (!WORDS[s.learn]) flag('ERROR', 'story', where, `learn of unknown word ${s.learn}`);
    else taught(s.learn, 'learn (heard)', where, st);
    return { cont: [st], stop: [] };
  }
  let cont = [st], stop = [];
  if (s.if !== undefined && (s.then || s.else)) {
    const a = runList(s.then || [], [st], where + '.then'), b = runList(s.else || [], [st], where + '.else');
    cont = dedupe([...a.cont, ...b.cont]); stop = dedupe([...a.stop, ...b.stop]);
  }
  if (s.go) return { cont: [], stop: dedupe([...stop, ...cont.flatMap((x) => runNode(s.go, x))]) };
  if (s.call) cont = dedupe(cont.flatMap((x) => runNode(s.call, x)));
  if (s.do) {
    if (s.do === 'type') {
      for (const x of cont) {
        if (s.prompt) checkLine(speakerOf(s.prompt)[1], x, where);
        if (!WORDS[s.word]) flag('ERROR', 'story', where, `type of unknown word ${s.word}`);
        else taught(s.word, 'typed', where, x);
      }
    } else if (s.do === 'hint' || s.do === 'announce') for (const x of cont) checkLine(s.text || '', x, where, s.do === 'hint' ? 'story' : 'story');
    else if (s.do === 'goal' && s.text && isJP(s.text.replace(/\{\w+\}/g, ''))) flag('INFO', 'story', where, 'goal text has Japanese (goal text is hidden in the UI today)', s.text);
  }
  if (s.end) return { cont: [], stop: dedupe([...stop, ...cont]) };
  return { cont, stop };
}

// static: every flag a node (and what it jumps to) can set
const flagMemo = new Map();
function flagsOf(place, name, seen = new Set()) {
  const k = place + '/' + name; if (flagMemo.has(k)) return flagMemo.get(k); if (seen.has(k)) return new Set(); seen.add(k);
  const out = new Set();
  const walk = (list) => { for (const s of list || []) { if (!s || typeof s !== 'object') continue;
    if (typeof s.set === 'string') out.add(s.set); else if (s.set) Object.keys(s.set).forEach((f) => out.add(f));
    if (s.inc) out.add(s.inc); if (s.do === 'period') out.add('period:' + s.to);
    if (s.learn) out.add('know_' + s.learn); if (s.offer) out.add('know_' + s.offer); if (s.do === 'type') out.add('know_' + s.word);
    walk(s.then); walk(s.else);
    for (const n of [s.go, s.call]) if (n) flagsOf(place, n, seen).forEach((f) => out.add(f));
    for (const o of s.choice || []) { if (typeof o.set === 'string') out.add(o.set); for (const n of [o.go, o.call]) if (n) flagsOf(place, n, seen).forEach((f) => out.add(f)); }
  } };
  walk((STORY[place].nodes || {})[name]);
  flagMemo.set(k, out); return out;
}
// positive flags a condition needs (only from a top-level chain of &&)
function needs(cond) {
  if (!cond || typeof cond !== 'string') return [];
  if (/\|\|/.test(cond.replace(/\([^()]*\)/g, ''))) return [];
  return cond.split('&&').map((t) => t.trim()).filter((t) => /^\w+$/.test(t)).map((t) => t);
}

// ---------------------------------------------------------------- run the main line
let states = [new Set()];
const at = {};   // place -> [{ states, flags }] per main index
for (const [place, seq] of MAIN) {
  PLACE = place; MAINLINE = true;
  const nodes = STORY[place].nodes || {};
  at[place] = at[place] || [];
  let fl = new Set(at[place].length ? at[place][at[place].length - 1].flags : []);
  for (const item of seq) {
    at[place].push({ states, flags: new Set(fl) });
    const alts = item.split('|');
    for (const a of alts) if (!nodes[a]) flag('WARN', 'language', `${place}/${a}`, 'MAIN in lang-audit.mjs names a node that no longer exists; skipped (update MAIN)');
    const have = alts.filter((a) => nodes[a]);
    if (have.length) states = dedupe(have.flatMap((a) => states.flatMap((st) => runNode(a, new Set(st)))));
    for (const a of alts) if (nodes[a]) flagsOf(place, a).forEach((f) => fl.add(f));
  }
  at[place].push({ states, flags: new Set(fl) });
}
const endStates = states;

// ---------------------------------------------------------------- side triggers
MAINLINE = false;
const mainNodes = new Set(MAIN.flatMap(([p, seq]) => seq.flatMap((x) => x.split('|').map((n) => p + '/' + n))));
for (const place of ['train', 'gate', 'office']) {
  PLACE = place;
  const st = STORY[place];
  const entries = [];
  for (const [key, v] of Object.entries(st.on || {})) for (const e of (Array.isArray(v) ? v : [v])) { const t = typeof e === 'string' ? { node: e } : e; entries.push({ key, node: t.node, cond: t.if }); }
  for (const amb of st.ambient || []) entries.push({ key: 'ambient:' + amb.id, lines: amb.lines, cond: [amb.if, amb.period && `period:${amb.period}`].filter(Boolean).join(' && ') });
  for (const [who, list] of Object.entries(st.bonds || {})) for (const b of list || []) entries.push({ key: 'bond:' + who, node: b.node });
  for (const e of entries) {
    if (e.node && mainNodes.has(place + '/' + e.node)) continue;
    const m = /^say:(\w+):(.+)$/.exec(e.key);
    if (m && m[2] !== '*') { if (!sayTargets.has(m[1])) sayTargets.set(m[1], new Set()); sayTargets.get(m[1]).add(`${place}:${m[2]}`); }
    const want = needs(e.cond ? e.cond.replace(/period:(\w+)/g, 'period_$1') : '').map((f) => f.replace(/^period_/, 'period:'));
    if (m) want.push('know_' + m[1]);
    const list = at[place];
    let idx = list.findIndex((a, i) => i > 0 && want.every((f) => a.flags.has(f) || (f.startsWith('know_') && a.states.some((s) => s.has(f.slice(5))))));
    if (idx < 0) idx = list.length - 1;
    let sts = list[idx].states;
    if (m) sts = sts.filter((s) => s.has(m[1])); if (!sts.length) sts = list[idx].states;
    for (const s0 of sts) {
      if (e.lines) runList(e.lines, [new Set(s0)], `${place}/${e.key}`);
      else runNode(e.node, new Set(s0));
    }
  }
  // a say-trigger on a main-line node still gives the word a target
  for (const [key] of Object.entries(st.on || {})) { const m = /^say:(\w+):(.+)$/.exec(key); if (m && m[2] !== '*') { if (!sayTargets.has(m[1])) sayTargets.set(m[1], new Set()); sayTargets.get(m[1]).add(`${place}:${m[2]}`); } }
}

// ---------------------------------------------------------------- names, labels, people
for (const place of STORY_FILES) {
  const st = STORY[place];
  for (const [id, sp] of Object.entries(st.speakers || {})) for (const k of ['name', 'role']) if (sp[k] && isJP(sp[k])) flag('ERROR', 'story', `${place} speakers.${id}`, `name plate ${k} in Japanese: ${sp[k]}`);
  for (const [id, p] of Object.entries(st.people || {})) for (const k of ['name', 'about']) if (p[k] && isJP(p[k])) flag('ERROR', 'story', `${place} people.${id}`, `People panel ${k} has Japanese`, p[k]);
  for (const [id, l] of Object.entries(st.labels || {})) { const t = Array.isArray(l) ? l[0] : l; if (isJP(t)) flag('ERROR', 'story', `${place} labels.${id}`, `marker label in Japanese: ${t}`); }
}
for (const [id, speaker] of Object.entries(DEFAULT_SPEAKERS)) for (const text of [speaker.name, speaker.role]) if (text && isJP(text)) flag('ERROR', 'builder', `narrative/speakers.js speaker ${id}`, `default name plate in Japanese: ${text}`);

// ---------------------------------------------------------------- the 3D scenes and the UI
const everTaught = new Set(teach.keys());
const alwaysTaught = new Set([...everTaught].filter((w) => endStates.every((s) => s.has(w))));
// signs and props: a word taught, or shown glossed in a line, on every route is explained by the time he sees it
const alwaysMet = new Set([...everTaught, ...glossed].filter((w) => endStates.every((s) => s.has(w) || s.has('~' + w))));
const OWN = (f) => (/^js\/(places|scenes|train\/(car|world|hull|kit)|props)/.test(f) ? 'world' : /^js\/(cast|mio|avatar|train\/people)/.test(f) ? 'characters' : /^(js\/(ui|end|menu|settings)\.js|css\/|index\.html)/.test(f) ? 'shell' : 'builder');
const files = [];
const walkDir = (d) => { for (const e of fs.readdirSync(path.join(root, d), { withFileTypes: true })) { const p = path.posix.join(d, e.name); if (e.isDirectory()) walkDir(p); else if (/\.(js|css|html)$/.test(e.name)) files.push(p); } };
walkDir('js'); walkDir('css'); files.push('index.html');
// Internal data modules: their Japanese literals are lookup data, never put on screen as they stand.
// Each one names what it holds and gets its own check below instead of the on-screen text scan.
const DATA_MODULES = {
  'js/speech-match.js': 'recogniser aliases and kana tables for matching what the mic heard (SPOKEN, H)',
};
const NOT_GLOSS = /^(#|\d|center|middle|left|right|top|bottom|alphabetic|round|butt|square|bold|normal|italic|anonymous|sans-serif|serif)/;
for (const f of files) {
  if (f === 'js/lang.js' || DATA_MODULES[f] || !fs.existsSync(path.join(root, f))) continue;
  const source = rd(f);
  const groups = f.endsWith('.js') ? javascriptTextGroups(source, f === 'js/ui/dialogue-text.js' ? ['POOL', 'INTERJ'] : [])
    : source.split('\n').map((raw, n) => {
    // drop comments (// outside strings, /* */ on one line)
    let line = '', q = null;
    for (let i = 0; i < raw.length; i++) { const c = raw[i]; if (q) { line += c; if (c === '\\') { line += raw[++i] || ''; continue; } if (c === q) q = null; continue; } if (c === '/' && raw[i + 1] === '/') break; if (c === '/' && raw[i + 1] === '*') { const e = raw.indexOf('*/', i + 2); if (e < 0) break; i = e + 1; continue; } if (c === "'" || c === '"' || c === '`') q = c; line += c; }
    const lits = [...line.matchAll(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g)].map((m) => m[0].slice(1, -1));
    return lits.map(value => ({ value, line: n + 1 }));
  });
  for (const group of groups) {
    const lits = group.map(entry => entry.value);
    const jpLits = group.filter(entry => isJP(entry.value));
    if (!jpLits.length) continue;
    const gloss = lits.some((l) => !isJP(l) && /[A-Za-z]{3,}/.test(l) && !NOT_GLOSS.test(l) && !/px|JP_FONT/.test(l));
    for (const { value: l, line: lineNumber } of jpLits) for (const m of l.matchAll(JP)) {
      const run = m[0], id = wordOf(run) || wordOf(run.replace(/[ビル室]+$/, ''));
      const where = `${f}:${lineNumber}`;
      const base = FORMS.find(([ja]) => run.startsWith(ja) && run !== ja);
      if (id && alwaysMet.has(id) && run === WORDS[id].ja) flag('INFO', OWN(f), where, `shows ${alwaysTaught.has(id) ? 'taught' : 'glossed'} word ${run} (${id})${gloss ? ' with English beside it' : ', no gloss (fine: he knows it by then)'}`);
      else if (gloss) flag('INFO', OWN(f), where, `${run} has English or romaji beside it`, l);
      else if (base && alwaysTaught.has(base[1])) flag('WARN', OWN(f), where, `${run}: starts with taught ${base[0]} but the rest (${run.slice(base[0].length)}) isn't taught or glossed`, l);
      else flag('ERROR', OWN(f), where, `readable Japanese ${run} with no English beside it, never taught`, l);
    }
  }
}
// speech-match.js: the one spelling of SPOKEN that reaches the screen is the mic's "That sounded like X" hint.
// speech.js takes it from lang.js (WORDS[k].ja) and shows it only for a word the player knows (known.has).
{
  const { SPOKEN = {} } = await imp('js/speech-match.js');
  const src = rd('js/speech.js');
  const fromLang = speechHintUsesKnownWord(src);
  if (!fromLang) flag('WARN', 'builder', 'js/speech.js "That sounded like"', 'the hint no longer takes lang.js WORDS[id].ja for known words only; update the speech-match check in lang-audit.mjs');
  for (const id of Object.keys(SPOKEN)) if (!WORDS[id]) flag('ERROR', 'builder', `js/speech-match.js SPOKEN.${id}`, 'not a word in lang.js; the mic can\'t name it');
}
// the gibberish glyph pool: real kanji side by side can spell real words
{
  const COMMON = ['会社', '部長', '時間', '問題', '今日', '明日', '来月', '上下', '大小', '中出', '見出', '出来', '日本', '火木', '行来', '月火', '水木', '金土', '大人', '入口', '出口'];
  const pool = new Set(POOL);
  const hits = COMMON.filter((w) => [...w].every((c) => pool.has(c)));
  const kanji = [...POOL].filter((c) => /[一-鿿]/.test(c));
  if (kanji.length) flag('WARN', 'shell', 'js/ui/dialogue-text.js POOL', `the gibberish stand-in glyphs include ${kanji.length} real kanji (${kanji.join('')}); neighbours can spell real words like ${hits.slice(0, 6).join(', ')}`);
}

// ---------------------------------------------------------------- reuse
const report = [];
for (const [w, list] of teach) {
  const first = list.find((t) => t.main) || list[0];
  const firstNode = first.where.split('#')[0];
  const later = [...(uses.get(w) || [])].filter((u) => u.split('#')[0] !== firstNode);
  const targets = [...(sayTargets.get(w) || [])];
  const always = alwaysTaught.has(w);
  report.push({ w, ja: WORDS[w].ja, how: first.how, where: first.where, always, also: list.filter((t) => t !== first).map((t) => `${t.how} at ${t.where}`), textUses: later.length, uses: later, targets });
  if (!later.length && !targets.length) flag('WARN', 'story', first.where, `taught word ${WORDS[w].ja} (${w}) is never used again: not in a later line, and nothing answers to it`);
  else if (!later.length) flag('INFO', 'story', first.where, `${WORDS[w].ja} (${w}) never appears in a later line (only as a Say target: ${targets.length})`);
  if (!always) flag('INFO', 'story', first.where, `${WORDS[w].ja} (${w}) is only taught on some routes`);
}
for (const id of Object.keys(WORDS)) if (!teach.has(id)) flag('INFO', 'language', `lang.js ${id}`, `${WORDS[id].ja} is in lang.js but not taught on day 1`);

// ---------------------------------------------------------------- output
const order = { ERROR: 0, WARN: 1, INFO: 2 };
findings.sort((a, b) => order[a.level] - order[b.level] || a.owner.localeCompare(b.owner) || a.where.localeCompare(b.where));
const count = (l) => findings.filter((f) => f.level === l).length;
if (args.has('--json')) { console.log(JSON.stringify({ findings, words: report }, null, 1)); }
else if (args.has('--brief')) {
  console.log(`lang-audit: ${count('ERROR')} errors, ${count('WARN')} warnings, ${report.length} words taught (${report.filter((r) => r.always).length} on every route)`);
  for (const f of findings.filter((x) => x.level === 'ERROR')) console.log(`  ERROR [${f.owner}] ${f.where}: ${f.msg}`);
} else {
  console.log('Words taught on day 1, in story order:');
  for (const r of report) console.log(`  ${r.ja} (${r.w}): ${r.how} at ${r.where}${r.always ? '' : ' [some routes only]'}; later lines ${r.textUses}, Say targets ${r.targets.length}${r.targets.length ? ' (' + r.targets.join(', ') + ')' : ''}`);
  console.log('');
  for (const lvl of ['ERROR', 'WARN', 'INFO']) {
    const fs_ = findings.filter((f) => f.level === lvl); if (!fs_.length) continue;
    console.log(`${lvl} (${fs_.length})`);
    for (const f of fs_) console.log(`  [${f.owner}] ${f.where}: ${f.msg}${f.text ? `\n      "${f.text}"` : ''}`);
    console.log('');
  }
  console.log(`${count('ERROR')} errors, ${count('WARN')} warnings, ${count('INFO')} notes.`);
}
process.exitCode = count('ERROR') ? 1 : 0;
