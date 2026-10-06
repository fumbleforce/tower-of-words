// Checks that the game matches the game facts docs (docs/game/). The docs lead: when this fails, either the game
// drifted from a decision (fix the game) or a change went in without its doc update (fix the doc in the same commit).
//
//   node tools/facts/check.mjs            check every area that has a check
//   node tools/facts/check.mjs --game     print what the game has, to help write or fix a doc
//
// Areas: cast.md (people, names on screen, likes, portraits), places.md (things, spots, zones, who is there when,
// small moments, creatures, nooks), words.md (every word), systems.md (the drinks), stories/*.md (cast, nodes, words taught, flags),
// and every story node belonging to a storyline or a place's small moments.
// Rows or items marked "(to build)" or "(to remove)" are decided but not done yet: while the game still differs
// they're listed as pending and don't fail the check; once the game matches, the check asks for the mark to go.
// Exit code 1 and a list of differences on drift; "facts check: ok" otherwise.
// Only facts that the game itself can confirm are checked. Prose (ages, motives, routines) isn't.
import { DEFAULT_SPEAKERS, PORTRAITS, ITEMS, PLACE_DETAILS, SHARED_THINGS, isEngineFlag } from '../../game3d/js/narrative/contracts.js';
import { storyBondGate } from '../../game3d/js/bonds/gates.js';
import { PLACE_FILES } from '../../game3d/js/places/definitions.js';
import { CHUNKS, PLACES, PLAN_PATHS } from '../../game3d/js/scenes/island-layout.js';
import { PINS } from '../../game3d/js/travel/pins.js';
import { CREATURES } from '../../game3d/js/creatures/catalog.js';
import { CROWD } from '../../game3d/js/crowd/data.js';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const G = (p) => path.join(ROOT, 'game3d', p);
const DOCS = path.join(ROOT, 'docs/game');
const read = (p) => fs.readFileSync(p, 'utf8');
const DUMP = process.argv.includes('--game');

// ------------------------------------------------------------------ reading the docs
// A section is everything under a heading up to the next heading of the same or a higher level. A table is the
// first Markdown table in a section. Cells in backticks are ids; lists are comma-separated; "none" or "-" is empty.
const NONE = /^(none|-|–)$/i;
const PENDING = /\((to build|to remove)\)/i;
function section(md, test, level = 2, file = '') {
  const lines = md.split('\n');
  const hx = new RegExp(`^#{1,${level}}\\s`);
  const i = lines.findIndex((l) => new RegExp(`^#{${level}}\\s`).test(l) && test(l.replace(/^#+\s*/, '').trim()));
  if (i < 0) return null;
  let j = i + 1;
  while (j < lines.length && !hx.test(lines[j])) j++;
  return lines.slice(i + 1, j).join('\n');
}
function tableIn(text) {
  if (text == null) return null;
  const rows = []; let head = null;
  for (const raw of text.split('\n')) {
    const l = raw.trim();
    if (!l.startsWith('|')) { if (head) break; continue; }
    const cells = l.slice(1, l.endsWith('|') ? -1 : undefined).split('|').map((c) => c.trim());
    if (!head) { head = cells; continue; }
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
    rows.push(Object.fromEntries(head.map((h, j) => [h, cells[j] ?? ''])));
  }
  return head ? rows : null;
}
function table(md, heading, file, level = 2) {
  const s = section(md, (h) => h === heading, level, file);
  if (s == null) throw new Error(`${file}: no "${'#'.repeat(level)} ${heading}" section`);
  const t = tableIn(s);
  if (!t) throw new Error(`${file}: no table under "${heading}"`);
  return t;
}
const id = (cell) => (/`([^`]+)`/.exec(cell) || [, cell])[1].trim();
const ids = (text) => [...(text || '').matchAll(/`([^`]+)`/g)].map((m) => m[1]);
const clean = (s) => s.replace(PENDING, '').replace(/`/g, '').trim();
const list = (cell) => (!cell || NONE.test(cell.trim()) ? [] : cell.split(',').map(clean).filter(Boolean));
const pendingIn = (cell) => (!cell ? [] : cell.split(',').filter((s) => PENDING.test(s)).map(clean));
const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const val = (c) => (NONE.test((c || '').trim()) ? '' : (c || '').trim());

// ------------------------------------------------------------------ reading the game
// Story files and engine tables (speakers, portraits, items and place registrations) are imported as data.
const STORY = { train: 'train', gate: 'gate', forecourt: 'forecourt', plaza: 'plaza', lift: 'transitions', office: 'office', dorm_court: 'dorm_court', dorms: 'dorms' };   // place -> story file
export async function readGame(load = file => import(pathToFileURL(G(file)).href)) {
  const defaults = DEFAULT_SPEAKERS, portraits = PORTRAITS, items = ITEMS;
  const { CAST } = await load('js/bonds/cast.js');
  const { WORDS } = await load('js/lang.js');

  // Labels come from the same declarations spread into the actual factories.
  const places = Object.fromEntries(Object.entries(PLACE_DETAILS).map(([id, details]) => {
    const things = { ...details.things };
    for (const [key, shared] of Object.entries(SHARED_THINGS)) things[key] ||= shared;
    return [id, {
      things: Object.fromEntries(Object.entries(things).map(([key, { label, kind }]) => [key, { label, kind }])),
      spots: details.spots, seats: details.seats, zones: details.zones,
    }];
  }));

  const stories = {}, takes = {}, nodes = {}, flagsSet = new Set();
  for (const [place, file] of Object.entries(STORY)) stories[place] = (await load(`story/${file}.js`)).default;
  const order = Object.keys(STORY).filter(place => STORY[place] !== 'transitions');
  const storiesThrough = Object.fromEntries(order.map((place, i) =>
    [place, order.slice(0, i + 1).map(id => stories[id])]));
  const lineSpeakers = (steps, out = new Set(), types = [], gateStories = []) => {
    if (!Array.isArray(steps)) return { out, types };
    for (const s of steps) {
      if (typeof s === 'string') { const m = /^(\w+): /.exec(s); if (m) out.add(m[1]); continue; }
      if (!s || typeof s !== 'object') continue;
      if (typeof s.say === 'string') out.add(s.say);
      if (s.do === 'type') types.push({ word: s.word, from: s.from || '' });
      if (s.set) for (const k of typeof s.set === 'string' ? [s.set] : Object.keys(s.set)) flagsSet.add(k);
      if (typeof s.inc === 'string') flagsSet.add(s.inc);
      if (s.do === 'bondStep' && s.who && s.to) flagsSet.add(storyBondGate(CAST, gateStories, s.who, s.to));
      for (const k of ['then', 'else', 'lines']) lineSpeakers(s[k], out, types, gateStories);
      if (s.choice) for (const o of s.choice) { if (o.set) for (const k of typeof o.set === 'string' ? [o.set] : Object.keys(o.set)) flagsSet.add(k); lineSpeakers(o.then, out, types, gateStories); }
    }
    return { out, types };
  };
  for (const [place, file] of Object.entries(STORY)) {
    const st = stories[place];
    const ids = new Set();
    const walk = (steps) => {
      if (!Array.isArray(steps)) return;
      for (const s of steps) {
        if (typeof s === 'string') { const m = /^(\w+): /.exec(s); if (m) ids.add(m[1]); continue; }
        if (!s || typeof s !== 'object') continue;
        for (const k of ['say', 'who', 'id']) if (typeof s[k] === 'string') ids.add(s[k]);
        for (const k of ['then', 'else', 'lines']) walk(s[k]);
        if (s.choice) for (const o of s.choice) walk(o.then);
      }
    };
    // every node of the file, with who speaks in it and the words it teaches
    const N = (nodes[file + '.js'] = {});
    for (const [n, steps] of Object.entries(st.nodes || {})) { walk(steps); const r = lineSpeakers(steps, undefined, undefined, storiesThrough[place]); N[n] = { speakers: r.out, types: r.types }; }
    for (const a of st.ambient || []) { walk(a.lines); const r = lineSpeakers(a.lines, undefined, undefined, storiesThrough[place]); N['ambient:' + a.id] = { speakers: r.out, types: r.types }; if (a.set) flagsSet.add(a.set); }
    if (file === 'transitions') for (const [slot, v] of Object.entries(st)) if (v && typeof v === 'object' && slot !== 'speakers') for (const part of ['walk', 'ride', 'arrive']) if (Array.isArray(v[part]) && v[part].length) { walk(v[part]); const [from, to] = slot.split('_to_'); const r = lineSpeakers(v[part], undefined, undefined, storiesThrough[part === 'arrive' ? to : from]); N[`${slot}.${part}`] = { speakers: r.out, types: r.types }; }
    for (const key of Object.keys(st.on || {})) { const m = /^(?:talk|near|say:\w+|give:[\w*]+):(\w+)$/.exec(key); if (m) ids.add(m[1]); }
    takes[place] = ids;
  }
  // built-in flags the engine sets (story/FORMAT.md)
  const builtIn = { test: isEngineFlag };

  // a person is anyone the engine can name or show; objects (doors, the copier) drop out here
  const personIn = (place) => Object.entries((places[place] || {}).things || {}).filter(([, t]) => /person/.test(t.kind)).map(([k]) => k);
  const people = new Set([...Object.keys(defaults), ...Object.values(stories).flatMap((s) => Object.keys(s.speakers || {})), ...Object.keys(places).flatMap(personIn)]);
  const where = {};
  for (const [place, got] of Object.entries(takes)) for (const p of got) if (people.has(p)) (where[p] ||= []).push(place);
  const plate = (place, p) => ((stories[place].speakers || {})[p] || {}).name || (defaults[p] || {}).name || '';
  // the label over someone: the story's `labels` win over the engine's; a [text, cond] pair shows text while cond holds
  const label = (place, p) => {
    const L = (stories[place].labels || {})[p], t = ((places[place] || {}).things || {})[p];
    if (Array.isArray(L)) return `${L[0]} (while \`${L[1]}\`), else ${t ? t.label : ''}`;
    return L || (t ? t.label : '');
  };
  // the People panel's names (story/people.js, the one home of the panel's text)
  const panel = Object.fromEntries(Object.entries((await load('story/people.js')).default).map(([p, v]) => [p, v.name]));
  return { defaults, portraits, items, CAST, WORDS, places, stories, where, people, plate, label, panel, nodes, flagsSet, builtIn, personIn };
}

// ------------------------------------------------------------------ the checks
let problems = 0; const pending = [];
const bad = (f, msg) => { problems++; console.log(`${f}: ${msg}`); };
const later = (f, msg) => pending.push(`${f}: ${msg}`);

// cast.md
function checkCast(game) {
  const file = 'docs/game/cast.md';
  const md = read(path.join(DOCS, 'cast.md'));
  const every = table(md, 'Everyone', file);
  const names = table(md, 'Names on screen', file);
  const changes = table(md, 'Where a name changes', file, 3);
  const bonds = table(md, 'What they like', file);
  const faces = table(md, 'Portraits', file);
  const unused = table(md, 'In the code, in no storyline', file);
  const everyIds = new Set(every.map((r) => id(r.Id)));

  // 1. everyone the game has is in "Everyone" or in the unused table, and nobody else
  const unusedIds = new Set(unused.map((r) => id(r.Id)));
  for (const p of game.people) if (!everyIds.has(p) && !unusedIds.has(p)) bad(file, `the game has \`${p}\` but "Everyone" doesn't (add them, or remove them from the game)`);
  for (const p of everyIds) if (!game.people.has(p)) bad(file, `\`${p}\` is in "Everyone" but the game doesn't have them`);
  for (const r of unused) {
    const p = id(r.Id), mark = PENDING.test(r['What it is'] + r['Why it\'s there']);
    if (everyIds.has(p)) bad(file, `\`${p}\` is in both "Everyone" and "In the code, in no storyline"`);
    if (!game.people.has(p)) { bad(file, `\`${p}\` is gone from the game: drop its row from "In the code, in no storyline"`); continue; }
    if (game.where[p]) bad(file, `\`${p}\` is listed as in no storyline, but the story files use it (${game.where[p].join(', ')})`);
    else if (mark) later(file, `\`${p}\` is still in the code (to remove)`);
  }

  // 2. the names the player sees: plate and label per place (a "Where a name changes" row, else the default row),
  //    and the name in the People panel
  const def = Object.fromEntries(names.map((r) => [id(r.Id), r]));
  const chg = Object.fromEntries(changes.map((r) => [id(r.Id) + '@' + r.Place.trim(), r]));
  const used = new Set();
  for (const [p, places] of Object.entries(game.where)) for (const place of places) {
    const k = p + '@' + place, row = chg[k] || def[p];
    if (chg[k]) used.add(k);
    if (!row) { bad(file, `"Names on screen" has no row for \`${p}\``); continue; }
    const plate = game.plate(place, p), label = game.label(place, p);
    if (val(row['Name plate']) !== plate) bad(file, `\`${p}\` in ${place}: the name plate says "${plate || 'nothing'}", the doc says "${val(row['Name plate']) || 'nothing'}"${chg[k] ? '' : ' (add a "Where a name changes" row if it differs here)'}`);
    if (val(row['Label over them']) !== label) bad(file, `\`${p}\` in ${place}: the label says "${label || 'nothing'}", the doc says "${val(row['Label over them']) || 'nothing'}"${chg[k] ? '' : ' (add a "Where a name changes" row if it differs here)'}`);
  }
  for (const k of Object.keys(chg)) if (!used.has(k)) bad(file, `"Where a name changes" has \`${k.replace('@', '` in ')}, but they don't appear there`);
  for (const r of names) {
    const p = id(r.Id);
    if (!game.people.has(p)) bad(file, `"Names on screen" has \`${p}\`, which the game doesn't have`);
    if (val(r['People panel']) !== (game.panel[p] || '')) bad(file, `\`${p}\` shows as "${game.panel[p] || 'nothing'}" in the People panel, the doc says "${val(r['People panel']) || 'nothing'}"`);
  }
  for (const p of Object.keys(game.where)) if (!def[p]) bad(file, `"Names on screen" has no row for \`${p}\``);

  // 3. likes, dislikes, the Japanese they expect, how they get on (game3d/js/bonds/cast.js)
  const bondIds = new Set();
  for (const r of bonds) {
    const p = id(r.Id); bondIds.add(p);
    const c = game.CAST[p];
    if (!c) { bad(file, `\`${p}\` is in "What they like" but not in game3d/js/bonds/cast.js`); continue; }
    if (!same(list(r.Likes), c.likes || [])) bad(file, `\`${p}\` likes ${JSON.stringify(c.likes || [])} in the game, ${JSON.stringify(list(r.Likes))} in the doc`);
    if (!same(list(r.Dislikes), c.dislikes || [])) bad(file, `\`${p}\` dislikes ${JSON.stringify(c.dislikes || [])} in the game, ${JSON.stringify(list(r.Dislikes))} in the doc`);
    const reg = val(r.Expects) || undefined;
    if (reg !== c.register) bad(file, `\`${p}\` expects "${c.register || 'nothing set'}" Japanese in the game, "${reg || 'nothing set'}" in the doc`);
    const rel = Object.fromEntries(list(r['Gets on with']).map((s) => { const m = /^(\w+) \((\w+)\)$/.exec(s); return m ? [m[1], m[2]] : [s, '?']; }));
    if (JSON.stringify(Object.entries(rel).sort()) !== JSON.stringify(Object.entries(c.rel || {}).sort())) bad(file, `\`${p}\` gets on with ${JSON.stringify(c.rel || {})} in the game, ${JSON.stringify(rel)} in the doc`);
  }
  for (const p of Object.keys(game.CAST)) if (!bondIds.has(p)) bad(file, `game3d/js/bonds/cast.js has \`${p}\`, "What they like" doesn't`);

  // 4. portrait faces: the table, the game's list and the files on disk
  const faceIds = new Set();
  for (const r of faces) {
    const p = id(r.Id); faceIds.add(p);
    const want = list(r.Faces), todo = new Set(pendingIn(r.Faces)), got = game.portraits[p] || [];
    if (!same(want, got)) bad(file, `\`${p}\` has faces ${got.join(', ') || 'none'} in the game, ${want.join(', ') || 'none'} in the doc`);
    for (const f of want) {
      const there = fs.existsSync(G(`assets/portraits/${p}-${f}.webp`));
      if (todo.has(f)) { if (there) bad(file, `\`${p}\` face "${f}" exists now: remove its "(to build)" mark`); else later(file, `\`${p}\` face "${f}" (to build): game3d/assets/portraits/${p}-${f}.webp isn't there yet, so the game shows neutral`); }
      else if (!there) bad(file, `\`${p}\` face "${f}" is listed but game3d/assets/portraits/${p}-${f}.webp doesn't exist (the game falls back to neutral)`);
    }
  }
  for (const p of Object.keys(game.portraits)) if (!faceIds.has(p)) bad(file, `the game has portraits for \`${p}\`, "Portraits" doesn't list them`);
}

// places.md trips: "Getting between places" lists one trip per line, "- `from` → `to`, how: text", between the
// built places (their "## ... (`id`)" sections) and the planned ones ("- Name (`id`): text" under "Places decided but
// not built"). The bible's places diagram reads these lines, so each must parse and name a known place.
function checkTrips() {
  const file = 'docs/game/places.md';
  const md = read(path.join(DOCS, 'places.md'));
  const built = new Set([...md.matchAll(/^## .+? \(`([a-z0-9_]+)`\)\s*$/gm)].map((m) => m[1]));
  const unbuilt = section(md, (h) => h === 'Places decided but not built', 2, file) || '';
  const planned = new Set([...unbuilt.matchAll(/^- .+? \(`([a-z0-9_]+)`\): /gm)].map((m) => m[1]));
  const trips = section(md, (h) => h === 'Getting between places', 2, file);
  if (trips == null) { bad(file, 'no "## Getting between places" section'); return; }
  const reached = new Set();
  for (const l of trips.split('\n').filter((x) => /^- /.test(x))) {
    const m = /^- `([a-z0-9_]+)` → `([a-z0-9_]+)`, [^:]+: \S/.exec(l);
    if (!m) { bad(file, `"Getting between places": not a trip line ("- \`from\` → \`to\`, how: text"): ${l.slice(0, 60)}`); continue; }
    for (const end of [m[1], m[2]]) {
      reached.add(end);
      if (!built.has(end) && !planned.has(end)) bad(file, `"Getting between places": \`${end}\` is neither a built place nor in "Places decided but not built"`);
    }
  }
  for (const place of Object.keys(STORY)) if (!reached.has(place)) bad(file, `"Getting between places": no trip to or from \`${place}\``);
}

// places.md "Where the places sit on the island": one row per built place, matching CHUNKS in
// game3d/js/scenes/island-layout.js (island point of its (0, 0), turn, scale, level)
function checkIsland() {
  const file = 'docs/game/places.md';
  const rows = table(read(path.join(DOCS, 'places.md')), 'Where the places sit on the island', file);
  const seen = new Set();
  for (const r of rows) {
    const place = id(r.Place), c = CHUNKS[place];
    seen.add(place);
    if (!c) { bad(file, `"Where the places sit on the island": \`${place}\` has no entry in island-layout.js CHUNKS`); continue; }
    const want = { x: c.at[0], z: c.at[1], Turn: c.turn, Scale: c.scale, Level: c.level };
    for (const [col, v] of Object.entries(want))
      if (!(Math.abs(+r[col] - v) < 0.005)) bad(file, `"Where the places sit on the island": \`${place}\` ${col} is ${r[col]}, island-layout.js has ${v}`);
  }
  for (const place of Object.keys(CHUNKS)) if (!seen.has(place)) bad(file, `"Where the places sit on the island": no row for \`${place}\``);
  for (const place of Object.keys(STORY)) if (place !== 'lift' && !CHUNKS[place]) bad(file, `"Where the places sit on the island": \`${place}\` is built but not placed`);
  // "On the map": each place's pin (an island point) or the place it is inside, matching game3d/js/travel/pins.js
  const pins = table(read(path.join(DOCS, 'places.md')), 'On the map', file), pinned = new Set();
  for (const r of pins) {
    const place = id(r.Place), p = PINS[place];
    pinned.add(place);
    if (!p) { bad(file, `"On the map": \`${place}\` has no pin in travel/pins.js`); continue; }
    const inside = id(r.In || '');
    if ((p.in || '') !== inside) bad(file, `"On the map": \`${place}\` is in "${inside}", pins.js has "${p.in || ''}"`);
    if (p.at && !(Math.abs(+r.x - p.at[0]) < 0.005 && Math.abs(+r.z - p.at[1]) < 0.005)) bad(file, `"On the map": \`${place}\` is at ${r.x}, ${r.z}, pins.js has ${p.at.join(', ')}`);
  }
  for (const place of Object.keys(CHUNKS)) if (!pinned.has(place)) bad(file, `"On the map": no row for \`${place}\``);
}

// island.md: every place table row (Id, Place "English (日本語)") against PLACES, and the "Streets and paths" table
// against PLAN_PATHS, both in game3d/js/scenes/island-plan.js
function checkIslandPlan() {
  const file = 'docs/game/island.md', md = read(path.join(DOCS, 'island.md'));
  const blocks = md.split(/\n(?!\|)/).map(tableIn).filter((t) => t && t.length && 'Id' in t[0]);
  const places = blocks.filter((t) => 'Place' in t[0]).flat(), code = new Map(PLACES.map((p) => [p.id, p]));
  for (const r of places) {
    const p = code.get(id(r.Id)), want = p && `${p.en} (${p.ja})`;
    if (!p) bad(file, `place \`${id(r.Id)}\` has no label in island-plan.js PLACES`);
    else if (r.Place !== want) bad(file, `place \`${p.id}\` is "${r.Place}", island-plan.js has "${want}"`);
  }
  const rowIds = new Set(places.map((r) => id(r.Id)));
  for (const p of PLACES) if (!rowIds.has(p.id)) bad(file, `no row for place \`${p.id}\` (island-plan.js PLACES)`);
  const paths = table(md, 'Streets and paths', file).map((r) => id(r.Id));
  if (!same(paths, PLAN_PATHS.map((p) => p.id))) bad(file, `"Streets and paths" lists ${paths.join(', ')}; island-plan.js PLAN_PATHS has ${PLAN_PATHS.map((p) => p.id).join(', ')}`);
}

// places.md: one "## <Name> (`<place>`)" section per place, with ### Things, Spots, Zones, Who's there when, Small moments
const smallMoments = {};   // story file -> node ids claimed by places.md
function checkPlaces(game) {
  const file = 'docs/game/places.md';
  const md = read(path.join(DOCS, 'places.md'));
  for (const place of Object.keys(STORY)) {
    const sec = section(md, (h) => h.endsWith(`(\`${place}\`)`), 2, file);
    if (sec == null) { bad(file, `no "## ... (\`${place}\`)" section`); continue; }
    const sub = (name) => section(sec, (h) => h === name, 3, file);
    const storyFile = STORY[place] + '.js';
    // small moments: nodes for the coverage check
    const sm = tableIn(sub('Small moments'));
    for (const r of sm || []) for (const n of ids(r.Nodes)) {
      (smallMoments[storyFile] ||= new Set()).add(n);
      if (!game.nodes[storyFile][n]) bad(file, `${place}, "Small moments": \`${n}\` isn't a node in game3d/story/${storyFile}`);
    }
    const P = game.places[place];
    if (!P) continue;   // the lift has no things of its own
    // things (not people): ids and labels
    const th = tableIn(sub('Things'));
    if (!th) { bad(file, `${place}: no "### Things" table`); continue; }
    const docThings = new Set();
    for (const r of th) {
      const t = id(r.Id); docThings.add(t);
      const g = P.things[t];
      if (!g || /person/.test(g.kind)) { if (PENDING.test(r.Id + r['What it is'])) later(file, `${place}: \`${t}\` (to build)`); else bad(file, `${place}: \`${t}\` is in "Things" but not in ${PLACE_FILES[place]}`); continue; }
      const lab = game.label(place, t);
      if (val(r.Label) !== lab) bad(file, `${place}: \`${t}\` is labelled "${lab}" in the game, "${val(r.Label)}" in the doc`);
    }
    for (const [t, g] of Object.entries(P.things)) if (!/person/.test(g.kind) && !docThings.has(t)) bad(file, `${place}: the game has \`${t}\` ("${g.label}"), "Things" doesn't`);
    // spots and zones
    for (const [name, got] of [['Spots', P.spots], ['Seats', P.seats], ['Zones', P.zones]]) {
      const want = ids(sub(name));
      if (!same(want, got)) bad(file, `${place}: ${name.toLowerCase()} are ${got.join(', ')} in the game, ${want.join(', ') || 'none'} in the doc`);
    }
    // who is there, and where the schedule puts them
    const who = tableIn(sub("Who's there when"));
    if (!who) { bad(file, `${place}: no "### Who's there when" table`); continue; }
    const sch = game.stories[place].schedule || {}, here = game.personIn(place);
    const docWho = new Set();
    for (const r of who) {
      const p = id(r.Id); docWho.add(p);
      if (!here.includes(p)) bad(file, `${place}: \`${p}\` is in "Who's there when" but has no body there`);
      const want = schedText(r.Schedule), got = schedOf(sch[p]);
      if (want !== got) bad(file, `${place}: \`${p}\`'s schedule is "${got || '-'}" in the game, "${want || '-'}" in the doc`);
    }
    for (const p of here) if (!docWho.has(p)) bad(file, `${place}: \`${p}\` has a body there but isn't in "Who's there when"`);
    for (const p of Object.keys(sch)) if (!here.includes(p)) bad(file, `${place}: the story schedules \`${p}\`, who has no body there`);
  }
}
// places.md: each outdoor place's "### Creatures" table (Id, Kind, How many, When) against creatures/catalog.js
function checkCreatures() {
  const file = 'docs/game/places.md';
  const md = read(path.join(DOCS, 'places.md'));
  const heads = [...md.matchAll(/^## .*\(`([a-z_]+)`\)\s*$/gm)].map((m) => m[1]);
  for (const place of heads) {
    const sec = section(md, (h) => h.endsWith(`(\`${place}\`)`), 2, file);
    const rows = tableIn(section(sec, (h) => h === 'Creatures', 3, file));
    const game = CREATURES[place];
    if (!rows && !game) continue;
    if (!rows) { bad(file, `${place}: the game has creatures (game3d/js/creatures/catalog.js), there is no "### Creatures" table`); continue; }
    if (!game) { bad(file, `${place}: "### Creatures" lists creatures, game3d/js/creatures/catalog.js has none there`); continue; }
    const seen = new Set();
    for (const r of rows) {
      const c = id(r.Id); seen.add(c);
      const g = game.find((x) => x.id === c);
      if (!g) { bad(file, `${place}: creatures \`${c}\` aren't in game3d/js/creatures/catalog.js`); continue; }
      for (const [col, want] of [['Kind', g.kind], ['How many', String(g.n)], ['When', g.when]])
        if (val(r[col]).replace(/`/g, '') !== want) bad(file, `${place}, creatures \`${c}\`: ${col.toLowerCase()} is "${want}" in the game, "${val(r[col])}" in the doc`);
      // the cats are Pet targets (creatures/pet.js); nothing else is
      if ((g.kind === 'cat') !== /Can be petted\./.test(r.Where || '')) bad(file, `${place}, creatures \`${c}\`: ${g.kind === 'cat' ? 'a cat can be petted in the game; its Where should say "Can be petted."' : 'only cats can be petted'}`);
    }
    for (const g of game) if (!seen.has(g.id)) bad(file, `${place}: the game has creatures \`${g.id}\` (${g.kind}), "Creatures" doesn't`);
  }
}
// places.md: each outdoor place's crowd table ("| Period | Walking | Sitting | Talking | Waiting | Stop on the way |
// In twos |", in "Who's there when", the last two as percentages) against game3d/js/crowd/data.js; a place with no
// crowd there has no table
function checkCrowd() {
  const file = 'docs/game/places.md';
  const md = read(path.join(DOCS, 'places.md'));
  for (const [place, d] of Object.entries(CROWD)) {
    const sec = section(md, (h) => h.endsWith(`(\`${place}\`)`), 2, file);
    if (sec == null) { bad(file, `no "## ... (\`${place}\`)" section for the crowd in game3d/js/crowd/data.js`); continue; }
    const who = section(sec, (h) => h === "Who's there when", 3, file) || '';
    const at = who.indexOf('| Period |');
    const rows = at < 0 ? [] : tableIn(who.slice(at)) || [];
    const periods = Object.entries(d.periods);
    if (!periods.length) { if (at >= 0) bad(file, `${place}: a crowd table, but game3d/js/crowd/data.js has no crowd there`); continue; }
    if (at < 0) { bad(file, `${place}: no crowd table ("| Period | Walking | ...") in "Who's there when"`); continue; }
    for (const [p, s] of periods) {
      const r = rows.find((x) => id(x.Period) === p);
      if (!r) { bad(file, `${place}: the crowd has a ${p} in game3d/js/crowd/data.js, the crowd table doesn't`); continue; }
      const want = {
        Walking: s.walk || 0,
        Sitting: s.sit || 0,
        Talking: s.chat || 0,
        Waiting: s.queue ? s.queue[1] : 0,
        'Stop on the way': Math.round((s.stop || 0) * 100),
        'In twos': Math.round((s.twos || 0) * 100),
      };
      for (const [col, v] of Object.entries(want)) {
        const got = val(r[col]) === '' ? 0 : parseFloat(val(r[col]));
        if (got !== v) bad(file, `${place}, crowd, ${p}: ${col.toLowerCase()} is ${v} in game3d/js/crowd/data.js, ${val(r[col]) || '-'} in the doc`);
      }
    }
    for (const r of rows) if (!d.periods[id(r.Period)]) bad(file, `${place}: the crowd table has ${id(r.Period)}, game3d/js/crowd/data.js doesn't`);
  }
}

// places.md: every place whose catalog lists nooks (game3d/js/places/catalog*.js `nooks`, the named spots kept for
// later secrets, encounters and collectibles) has a "### Nooks" table under its section with the same ids, and each
// nook is one of the place's spots
function checkNooks() {
  const file = 'docs/game/places.md';
  const md = read(path.join(DOCS, 'places.md'));
  for (const [place, d] of Object.entries(PLACE_DETAILS)) {
    const sec = section(md, (h) => h.endsWith(`(\`${place}\`)`), 2, file);
    const t = sec == null ? null : tableIn(section(sec, (h) => h === 'Nooks', 3, file));
    const doc = (t || []).map((r) => id(r.Id)),
      got = d.nooks || [];
    if (!got.length && !doc.length) continue;
    if (sec == null) { bad(file, `${place} has nooks but no "## ... (\`${place}\`)" section`); continue; }
    if (!same(doc, got)) bad(file, `${place}: nooks are ${got.join(', ') || 'none'} in the game, ${doc.join(', ') || 'none'} in the doc's "### Nooks"`);
    for (const n of got) if (!d.spots.includes(n)) bad(file, `${place}: nook \`${n}\` isn't one of its spots`);
  }
}
// a schedule as text, the way the doc writes it: "hidden all day", or "morning `racks`, evening hidden"
const PERIODS = ['early', 'morning', 'lunch', 'afternoon', 'evening'];
function schedOf(per) {
  if (!per) return '';
  const cell = (e) => (!e ? '' : e.hide ? 'hidden' : e.sit ? `sits \`${e.sit}\`` : e.at ? `\`${Array.isArray(e.at) ? e.at.join(', ') : e.at}\`` : '');
  if (per['*'] && Object.keys(per).length === 1) return per['*'].hide ? 'hidden all day' : `all day ${cell(per['*'])}`;
  return PERIODS.filter((p) => per[p] || per['*']).map((p) => `${p} ${cell(per[p] || per['*'])}`).join(', ');
}
const schedText = (c) => (NONE.test((c || '').trim()) ? '' : (c || '').trim());

// words.md
function checkWords(game) {
  const file = 'docs/game/words.md';
  const rows = table(read(path.join(DOCS, 'words.md')), 'Words', file);
  const seen = new Set();
  for (const r of rows) {
    const w = id(r.Id); seen.add(w);
    const g = game.WORDS[w];
    if (!g) { bad(file, `\`${w}\` isn't in game3d/js/lang.js`); continue; }
    const kind = g.cmd ? 'command' : g.phrase ? 'phrase' : g.ui ? 'label' : 'word';
    for (const [col, want] of [['Japanese', g.ja], ['Reading', g.ro], ['Meaning', g.en], ['Kind', kind]]) if (val(r[col]) !== want) bad(file, `\`${w}\`: ${col.toLowerCase()} is "${want}" in the game, "${val(r[col])}" in the doc`);
  }
  for (const w of Object.keys(game.WORDS)) if (!seen.has(w)) bad(file, `game3d/js/lang.js has \`${w}\`, "Words" doesn't`);
}

// systems.md: the drinks
function checkSystems(game) {
  const file = 'docs/game/systems.md';
  const rows = table(read(path.join(DOCS, 'systems.md')), 'Gifts', file);
  const seen = new Set();
  for (const r of rows) {
    const it = id(r.Id); seen.add(it);
    const g = game.items[it];
    if (!g) { bad(file, `item \`${it}\` isn't in game3d/js/gameplay/items.js ITEMS`); continue; }
    if (val(r.Name) !== g.name) bad(file, `\`${it}\` is called "${g.name}" in the game, "${val(r.Name)}" in the doc`);
    if (+val(r.Price).replace(/[^\d]/g, '') !== g.price) bad(file, `\`${it}\` costs ¥${g.price} in the game, ${val(r.Price)} in the doc`);
  }
  for (const it of Object.keys(game.items)) if (!seen.has(it)) bad(file, `sim.js has the item \`${it}\`, "Gifts" doesn't`);
}

// stories/*.md
function checkStories(game) {
  const dir = path.join(DOCS, 'stories');
  const claimed = {}, taughtIn = {};
  const everyone = new Set(tableIn(section(read(path.join(DOCS, 'cast.md')), (h) => h === 'Everyone')).map((r) => id(r.Id)));
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md') && x !== 'README.md').sort()) {
    const file = 'docs/game/stories/' + f;
    const md = read(path.join(dir, f));
    const cast = new Set(ids(section(md, (h) => h === 'Cast', 2) || ''));
    if (!cast.size) bad(file, 'no "## Cast" line with ids');
    for (const p of cast) if (!everyone.has(p)) bad(file, `\`${p}\` is in the cast but not in cast.md "Everyone"`);
    const nodeRows = tableIn(section(md, (h) => h === 'Nodes', 2));
    if (!nodeRows) { bad(file, 'no "## Nodes" table'); continue; }
    const speakers = new Set(), types = [];
    for (const r of nodeRows) {
      const sf = id(r.File);
      if (!game.nodes[sf]) { bad(file, `"Nodes" names \`${sf}\`, which isn't a story file`); continue; }
      for (const n of ids(r.Nodes)) {
        const N = game.nodes[sf][n];
        if (!N) { bad(file, `\`${n}\` isn't a node in game3d/story/${sf}`); continue; }
        (claimed[sf] ||= new Set()).add(n);
        for (const s of N.speakers) speakers.add(s);
        for (const t of N.types) types.push({ ...t, node: n });
      }
    }
    for (const s of speakers) if (!cast.has(s)) bad(file, `\`${s}\` speaks in its nodes but isn't in its Cast line`);
    // words taught: one row per `type` step in its nodes
    const wt = tableIn(section(md, (h) => h === 'Words taught', 2)) || [];
    const key = (w, b, n) => `${w}|${b}|${n}`;
    const want = new Set(wt.map((r) => key(id(r.Word), id(r.By), id(r.Node))));
    const got = new Set(types.map((t) => key(t.word, t.from, t.node)));
    for (const k of got) (taughtIn[k] ||= []).push(want.has(k) ? file : null);
    for (const k of want) if (!got.has(k)) { const [w, b, n] = k.split('|'); bad(file, `"Words taught" has \`${w}\` from \`${b}\` in \`${n}\`, but no such typing step is in its nodes`); }
    for (const t of types) if (!game.WORDS[t.word]) bad(file, `node \`${t.node}\` teaches \`${t.word}\`, which lang.js doesn't have`);
    // flags it names must exist in the story files
    const fl = tableIn(section(md, (h) => h === 'Choices and flags', 2)) || [];
    for (const r of fl) for (const fg of ids(r.Flag)) if (!game.flagsSet.has(fg) && !game.builtIn.test(fg)) bad(file, `flag \`${fg}\` is never set in the story files`);
  }
  // every word taught is listed in one storyline that has its node (once: words.md has the word itself)
  for (const [k, files] of Object.entries(taughtIn)) {
    const [w, b, n] = k.split('|'), listed = files.filter(Boolean);
    if (!listed.length) bad('docs/game/stories', `node \`${n}\` teaches \`${w}\` (from \`${b || 'nobody'}\`), but no storyline with that node lists it under "Words taught"`);
    if (listed.length > 1) bad('docs/game/stories', `\`${w}\` in \`${n}\` is listed under "Words taught" in ${listed.join(' and ')}: list it once`);
  }
  // every node belongs somewhere
  for (const [sf, N] of Object.entries(game.nodes)) for (const n of Object.keys(N)) {
    if (!(claimed[sf] && claimed[sf].has(n)) && !(smallMoments[sf] && smallMoments[sf].has(n))) bad('docs/game/stories', `node \`${n}\` in game3d/story/${sf} isn't in any storyline's "Nodes" or a place's "Small moments"`);
  }
}

// ------------------------------------------------------------------ run
if (process.argv[1] === fileURLToPath(import.meta.url)) {
const game = await readGame();
if (DUMP) {
  console.log('People:', [...game.people].join(', '));
  console.log('Names on screen:'); for (const [p, w] of Object.entries(game.where)) for (const place of w) console.log(`  ${p} @ ${place}: plate "${game.plate(place, p)}", label "${game.label(place, p)}"`);
  console.log('People panel:', JSON.stringify(game.panel));
  console.log('People the engine defines that no story file uses:', [...game.people].filter((p) => !game.where[p]).join(', '));
  console.log('Bonds:', JSON.stringify(game.CAST));
  console.log('Portraits:', JSON.stringify(game.portraits));
  for (const [place, P] of Object.entries(game.places)) {
    console.log(`\n${place}:`);
    for (const [t, g] of Object.entries(P.things)) console.log(`  ${/person/.test(g.kind) ? 'person' : 'thing '} ${t}: "${game.label(place, t)}"`);
    console.log('  spots:', P.spots.join(', ')); console.log('  zones:', P.zones.join(', '));
    for (const [p, per] of Object.entries(game.stories[place].schedule || {})) console.log(`  schedule ${p}: ${schedOf(per)}`);
  }
  console.log('\nNodes:'); for (const [sf, N] of Object.entries(game.nodes)) console.log(`  ${sf}: ${Object.keys(N).join(', ')}`);
  console.log('\nWords taught (type steps):'); for (const [sf, N] of Object.entries(game.nodes)) for (const [n, v] of Object.entries(N)) for (const t of v.types) console.log(`  ${t.word} from ${t.from} in ${sf} ${n}`);
  process.exit(0);
}
for (const [area, fn] of [['cast', checkCast], ['places', checkPlaces], ['nooks', checkNooks], ['creatures', checkCreatures], ['crowd', checkCrowd], ['trips', checkTrips], ['island', checkIsland], ['island plan', checkIslandPlan], ['words', checkWords], ['systems', checkSystems], ['stories', checkStories]]) {
  try { fn(game); } catch (e) { bad(area, e.message); }
}
if (pending.length) { console.log(`\nPending (decided, not done yet):`); for (const p of pending) console.log('  ' + p); }
if (problems) { console.log(`\nfacts check: FAILED, ${problems} difference(s) between docs/game/ and the game`); process.exit(1); }
console.log(`\nfacts check: ok${pending.length ? ` (${pending.length} pending)` : ''}`);
}
