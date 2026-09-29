// Checks that the game matches the game facts docs (docs/game/). The docs lead: when this fails, either the game
// drifted from a decision (fix the game) or a change went in without its doc update (fix the doc in the same commit).
//
//   node tools/facts/check.mjs            check every area that has a check (today: the cast)
//   node tools/facts/check.mjs --game     print what the game has, to help write or fix a doc
//
// Exit code 1 and a list of differences on drift; "facts check: ok" otherwise.
// Only facts that the game itself can confirm are checked. Prose in the docs (ages, what people want, why) isn't.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const G = (p) => path.join(ROOT, 'game3d', p);
const read = (p) => fs.readFileSync(p, 'utf8');
const DUMP = process.argv.includes('--game');

// ------------------------------------------------------------------ reading the docs
// A doc table is the first Markdown table under a "## Heading". Cells in backticks are ids; lists are comma-separated;
// "none" or "-" means empty.
function table(md, heading, file) {
  const lines = md.split('\n');
  const i = lines.findIndex((l) => l.replace(/^#+\s*/, '').trim() === heading && /^##\s/.test(l));
  if (i < 0) throw new Error(`${file}: no "## ${heading}" section`);
  const rows = [];
  let head = null;
  for (let k = i + 1; k < lines.length && !/^##\s/.test(lines[k]); k++) {
    const l = lines[k].trim();
    if (!l.startsWith('|')) { if (head) break; continue; }
    const cells = l.slice(1, l.endsWith('|') ? -1 : undefined).split('|').map((c) => c.trim());
    if (!head) { head = cells; continue; }
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
    rows.push(Object.fromEntries(head.map((h, j) => [h, cells[j] ?? ''])));
  }
  if (!head) throw new Error(`${file}: no table under "## ${heading}"`);
  return rows;
}
const id = (cell) => (/`([^`]+)`/.exec(cell) || [, cell])[1].trim();
const list = (cell) => (!cell || /^(none|-|–)$/i.test(cell.trim()) ? [] : cell.split(',').map((s) => s.replace(/`/g, '').trim()).filter(Boolean));
const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

// ------------------------------------------------------------------ reading the game
// Story files are plain data modules, so they're imported. The engine's tables (default speakers, portraits,
// people in each place) are pulled out of the source the same way game3d/tools/story-check.mjs does.
const STORY = { train: 'train', gate: 'gate', lift: 'transitions', office: 'office' };   // place -> story file
const PLACE_JS = { train: 'places/train.js', gate: 'places/lobby.js', office: 'places/office.js' };

function objectLiteral(src, start) {
  const i = src.indexOf(start);
  if (i < 0) return null;
  let d = 0, j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; if (src[k] === '}' && !--d) return new Function(`return (${src.slice(j, k + 1)});`)(); }
  return null;
}

async function readGame() {
  const runner = read(G('js/runner.js'));
  const defaults = objectLiteral(runner, 'const DEFAULT_SPEAKERS = {');
  const portraits = objectLiteral(read(G('js/ui.js')), 'export const PORTRAITS = {');
  const { CAST } = await import(pathToFileURL(G('js/bonds/cast.js')).href);

  // people standing in each place, with the label shown over them
  const labels = {};
  for (const [place, file] of Object.entries(PLACE_JS)) {
    labels[place] = {};
    for (const m of read(G('js/' + file)).matchAll(/^\s+(\w+): \{ label: '([^']+)'(?:, verb: '[^']*')?, kind: 'person/gm)) labels[place][m[1]] = m[2];
  }
  // main.js adds a few people to every place (Mio)
  for (const m of read(G('js/main.js')).matchAll(/place\.things\.(\w+) = place\.things\.\1 \|\| \{ label: '([^']+)'/g)) for (const place of Object.keys(labels)) labels[place][m[1]] ||= m[2];

  // who takes part in each place's story: speaks, is talked or given to, or is moved by a step
  const stories = {}, takes = {};
  for (const [place, file] of Object.entries(STORY)) {
    const st = (await import(pathToFileURL(G(`story/${file}.js`)).href)).default;
    stories[place] = st;
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
    for (const n of Object.values(st.nodes || {})) walk(n);
    for (const a of st.ambient || []) walk(a.lines);
    if (file === 'transitions') for (const v of Object.values(st)) if (v && typeof v === 'object') for (const part of ['walk', 'ride', 'arrive']) walk(v[part]);
    for (const key of Object.keys(st.on || {})) { const m = /^(?:talk|near|say:\w+|give:[\w*]+):(\w+)$/.exec(key); if (m) ids.add(m[1]); }
    takes[place] = ids;
  }
  // a person is anyone the engine can name or show; objects (doors, the copier) drop out here
  const people = new Set([...Object.keys(defaults), ...Object.values(stories).flatMap((s) => Object.keys(s.speakers || {})), ...Object.values(labels).flatMap(Object.keys), 'tama']);
  const where = {};
  for (const [place, ids] of Object.entries(takes)) for (const p of ids) if (people.has(p)) (where[p] ||= []).push(place);
  const plate = (place, p) => ((stories[place].speakers || {})[p] || {}).name || (defaults[p] || {}).name || '';
  return { defaults, portraits, CAST, labels, where, people, plate };
}

// ------------------------------------------------------------------ the cast (docs/game/cast.md)
function checkCast(game, bad) {
  const file = 'docs/game/cast.md';
  const md = read(path.join(ROOT, file));
  const cast = table(md, 'Day 1 cast', file);
  const names = table(md, 'Names on screen', file);
  const bonds = table(md, 'What they like', file);
  const faces = table(md, 'Portraits', file);
  const unused = table(md, 'In the code but not in day 1', file);
  const docIds = new Set(cast.map((r) => id(r.Id)));
  const unusedIds = new Set(unused.map((r) => id(r.Id)));

  // 1. everyone in day 1 is in the doc, where the doc says, and nobody else
  for (const [p, places] of Object.entries(game.where)) {
    if (!docIds.has(p)) bad(file, `\`${p}\` takes part in ${places.join(', ')} but isn't in "Day 1 cast"`);
  }
  for (const r of cast) {
    const p = id(r.Id), want = list(r['Takes part in']), got = game.where[p] || [];
    if (!got.length) { bad(file, `\`${p}\` is in "Day 1 cast" but takes part nowhere in the story files`); continue; }
    if (!same(want, got)) bad(file, `\`${p}\` takes part in ${got.join(', ')}; the doc says ${want.join(', ') || 'nowhere'}`);
  }
  // 2. every person the engine knows about has a line somewhere, even if day 1 doesn't use them
  for (const p of game.people) if (!docIds.has(p) && !unusedIds.has(p)) bad(file, `the game defines \`${p}\` but the doc doesn't mention it (add it to a table, or remove it from the game)`);
  for (const p of unusedIds) {
    if (!game.people.has(p)) bad(file, `\`${p}\` is listed under "In the code but not in day 1" but the game no longer has it (drop the row)`);
    if (game.where[p]) bad(file, `\`${p}\` is listed as not in day 1, but takes part in ${game.where[p].join(', ')}`);
  }

  // 3. the names the player sees: the plate on their lines and the label over them, per place
  const seen = new Set();
  for (const r of names) {
    const p = id(r.Id), place = r.Place.trim();
    seen.add(p + '@' + place);
    const plate = game.plate(place, p), label = (game.labels[place] || {})[p] || '';
    const want = (c) => (/^(none|-|–)$/i.test(c.trim()) ? '' : c.trim());
    if (want(r['Name plate']) !== plate) bad(file, `\`${p}\` in ${place}: the name plate says "${plate || 'nothing'}", the doc says "${want(r['Name plate']) || 'nothing'}"`);
    if (want(r['Label over them']) !== label) bad(file, `\`${p}\` in ${place}: the label says "${label || 'nothing'}", the doc says "${want(r['Label over them']) || 'nothing'}"`);
  }
  for (const [p, places] of Object.entries(game.where)) for (const place of places) if (docIds.has(p) && !seen.has(p + '@' + place)) bad(file, `"Names on screen" has no row for \`${p}\` in ${place}`);

  // 4. likes, dislikes, the Japanese they expect, how they get on (game3d/js/bonds/cast.js)
  const bondIds = new Set();
  for (const r of bonds) {
    const p = id(r.Id); bondIds.add(p);
    const c = game.CAST[p];
    if (!c) { bad(file, `\`${p}\` is in "What they like" but not in game3d/js/bonds/cast.js`); continue; }
    if (!same(list(r.Likes), c.likes || [])) bad(file, `\`${p}\` likes ${JSON.stringify(c.likes || [])} in the game, ${JSON.stringify(list(r.Likes))} in the doc`);
    if (!same(list(r.Dislikes), c.dislikes || [])) bad(file, `\`${p}\` dislikes ${JSON.stringify(c.dislikes || [])} in the game, ${JSON.stringify(list(r.Dislikes))} in the doc`);
    const reg = /^(none|-|–)$/i.test(r.Expects.trim()) ? undefined : r.Expects.trim();
    if (reg !== c.register) bad(file, `\`${p}\` expects "${c.register || 'nothing set'}" Japanese in the game, "${reg || 'nothing set'}" in the doc`);
    const rel = Object.fromEntries(list(r['Gets on with']).map((s) => { const m = /^(\w+) \((\w+)\)$/.exec(s); return m ? [m[1], m[2]] : [s, '?']; }));
    if (JSON.stringify(Object.entries(rel).sort()) !== JSON.stringify(Object.entries(c.rel || {}).sort())) bad(file, `\`${p}\` gets on with ${JSON.stringify(c.rel || {})} in the game, ${JSON.stringify(rel)} in the doc`);
  }
  for (const p of Object.keys(game.CAST)) if (!bondIds.has(p)) bad(file, `game3d/js/bonds/cast.js has \`${p}\`, "What they like" doesn't`);

  // 5. portrait faces: the table in the doc, the game's list, and the files on disk
  const faceIds = new Set();
  for (const r of faces) {
    const p = id(r.Id); faceIds.add(p);
    const want = list(r.Faces), got = game.portraits[p] || [];
    if (!same(want, got)) bad(file, `\`${p}\` has faces ${got.join(', ') || 'none'} in the game, ${want.join(', ') || 'none'} in the doc`);
    for (const f of want) if (!fs.existsSync(G(`assets/portraits/${p}-${f}.webp`))) bad(file, `\`${p}\` face "${f}" is listed but game3d/assets/portraits/${p}-${f}.webp doesn't exist (the game falls back to neutral)`);
  }
  for (const p of Object.keys(game.portraits)) if (!faceIds.has(p)) bad(file, `the game has portraits for \`${p}\`, "Portraits" doesn't list them`);
}

// ------------------------------------------------------------------ run
const game = await readGame();
if (DUMP) {
  console.log('Takes part in:'); for (const [p, w] of Object.entries(game.where)) console.log(`  ${p}: ${w.join(', ')}`);
  console.log('Names on screen:'); for (const [p, w] of Object.entries(game.where)) for (const place of w) console.log(`  ${p} @ ${place}: plate "${game.plate(place, p)}", label "${(game.labels[place] || {})[p] || ''}"`);
  console.log('People the engine defines but day 1 never uses:', [...game.people].filter((p) => !game.where[p]).join(', '));
  console.log('Bonds:', JSON.stringify(game.CAST));
  console.log('Portraits:', JSON.stringify(game.portraits));
  process.exit(0);
}
let problems = 0;
const bad = (f, msg) => { problems++; console.log(`${f}: ${msg}`); };
for (const [area, fn] of [['cast', checkCast]]) {
  try { fn(game, bad); } catch (e) { bad(area, e.message); }
}
if (problems) { console.log(`\nfacts check: FAILED, ${problems} difference(s) between docs/game/ and the game`); process.exit(1); }
console.log('facts check: ok');
