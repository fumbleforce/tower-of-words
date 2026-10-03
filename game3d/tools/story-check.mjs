import { allowedConditionCharacters, compileCondition } from '../js/narrative/conditions.js';
import { WORDS, SAYABLE } from '../js/lang.js';
import { DEFAULT_SPEAKERS, ITEMS, PLACE_DETAILS, STORY_FILES, GLOBAL_HOOKS, PLACE_EVENTS } from '../js/narrative/contracts.js';
import { canTravel } from '../js/places/definitions.js';
import { FINDS } from '../js/finds/spots.js';
import TICKETS from '../story/tickets.js';
// Checks the story files against the engine: unknown speakers, words, hooks, ids, spots, missing nodes,
// conditions that don't parse. node game3d/tools/story-check.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

// Runtime declarations; place registries migrate next.
const words = Object.keys(WORDS);
const speakers = Object.keys(DEFAULT_SPEAKERS);
const globalHooks = GLOBAL_HOOKS;
const PL = Object.fromEntries(Object.entries(PLACE_DETAILS).map(([id, details]) => [id, { ...details, things: Object.keys(details.things) }]));
const EVENTS = Object.fromEntries(Object.entries(PLACE_EVENTS).map(([place, events]) => [place, Object.values(events).map(event => event.id)]));

let problems = 0;
const bad = (f, msg) => { problems++; console.log(`${f}: ${msg}`); };
function checkCond(f, c) {
  if (typeof c !== 'string') return;
  if (!allowedConditionCharacters(c)) bad(f, `condition has odd characters: ${c}`);
  if (compileCondition(c).error) bad(f, `condition doesn't parse: ${c}`);
}
function checkText(f, t) { for (const m of t.matchAll(/\{(\w+)\}/g)) if (!words.includes(m[1])) bad(f, `unknown word {${m[1]}} in "${t.slice(0, 60)}"`); }

// the tickets (story/tickets.js): ids like T-0002, who sent each, its words and its closing condition
for (const [id, t] of Object.entries(TICKETS)) {
  const f = 'tickets.js';
  if (!/^T-\d{4}$/.test(id)) bad(f, `ticket id '${id}' is not like T-0002`);
  for (const k of ['title', 'from', 'text']) if (typeof t[k] !== 'string' || !t[k]) bad(f, `${id}: no ${k}`);
  checkText(f, t.text || '');
  if (t.done !== undefined) checkCond(f, t.done);
  if (!Number.isInteger(t.pay) || t.pay < 0) bad(f, `${id}: pay '${t.pay}' is not a whole number of yen`);
}

for (const name of STORY_FILES) {
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
        if (s.do === 'trip' && !canTravel(name, s.to)) bad(file, `${where}: no trip from ${name} to '${s.to}' (places/definitions.js TRIPS)`);
        if (s.do === 'find' && !FINDS[s.id]) bad(file, `${where}: find '${s.id}' is not a find (js/finds/spots.js)`);
        if (s.do === 'ticket') for (const k of ['add', 'start', 'close']) if (s[k] !== undefined && !TICKETS[s[k]]) bad(file, `${where}: ticket ${k} '${s[k]}' is not in story/tickets.js`);
        if (s.do === 'tickets' && s.show !== undefined && !TICKETS[s.show]) bad(file, `${where}: tickets show '${s.show}' is not in story/tickets.js`);
        if (s.do !== 'find') for (const k of ['who', 'to', 'on', 'at', 'id']) if (s[k] !== undefined && typeof s[k] === 'string' && !idOk(s[k]) && !(s.do === 'floor') && !(s.do === 'period') && !(s.do === 'trip') && !(s.do === 'sit' && k === 'at')) bad(file, `${where}: ${s.do} ${k} '${s[k]}' is not a person, object or spot here`);
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
    if (g) { if (g[1] !== '*' && !Object.hasOwn(ITEMS, g[1])) bad(file, `on ${key}: unknown item`); if (P && !P.things.includes(g[2]) && g[2] !== 'mio') bad(file, `on ${key}: no person '${g[2]}' here`); continue; }
    // idle:<person>: what they say when the story has nothing for them (FORMAT.md, Triggers). A person here, and a
    // line or two that doesn't move the story on
    const idle = /^idle:(\w+)$/.exec(key);
    if (idle) {
      const who = PLACE_DETAILS[name]?.things?.[idle[1]];
      if (idle[1] !== 'mio' && !/person/.test(who?.kind || '')) bad(file, `on ${key}: no person '${idle[1]}' here`);
      for (const e of Array.isArray(v) ? v : [v]) {
        const n = typeof e === 'string' ? e : e.node;
        const walk = (list) => { for (const s of list || []) if (s && typeof s === 'object') {
          if (['goal', 'next', 'trip', 'end', 'hold', 'type', 'kotodama'].includes(s.do) || s.choice || s.offer || s.go) bad(file, `on ${key}: idle node ${n} moves the story on (${s.do || Object.keys(s)[0]}); idle lines only talk`);
          walk(s.then); walk(s.else);
        } };
        walk(nodes[n]);
      }
      continue;
    }
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
