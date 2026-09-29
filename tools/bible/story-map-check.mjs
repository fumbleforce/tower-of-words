// Checks that the bible's story map can read the day: every story file imports, every condition parses, and the
// graph builds (bible/story-graph.js, the same loader the page uses). Prints the drift signals the page shows.
//
//   node tools/bible/story-map-check.mjs          (exit 1 if a file doesn't load or a condition doesn't parse)
//   node tools/bible/story-map-check.mjs --quiet  (only the problems)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const { STORY_FILES, ENGINE_FILES, buildGraph } = await import(pathToFileURL(path.join(root, 'bible/story-graph.js')).href);
const quiet = process.argv.includes('--quiet');

const mods = {}, files = {}, errors = [];
for (const p of STORY_FILES) {
  const f = path.join(root, 'game3d/story', p + '.js');
  try { mods[p] = (await import(pathToFileURL(f).href + '?t=' + Date.now())).default; if (!mods[p]) throw new Error('no default export'); }
  catch (e) { errors.push(`game3d/story/${p}.js: ${e.message}`); }
  try { files[`game3d/story/${p}.js`] = fs.readFileSync(f, 'utf8'); } catch (_) { /* reported above */ }
}
for (const p of ENGINE_FILES) {
  try { files[p] = fs.readFileSync(path.join(root, p), 'utf8'); } catch (e) { errors.push(`${p}: ${e.message}`); }
}
let G;
try { G = buildGraph({ mods, files, errors }); } catch (e) { console.log(`story map: the graph didn't build: ${e.stack}`); process.exit(1); }

const D = G.drift;
const fatal = [...G.errors, ...D.badConds.map((c) => `${c.where}: condition "${c.cond}" doesn't parse (${c.why})`), ...D.missing.map((m) => `${m.place} ${m.where}: no node ${m.to}`)];
const n = [...G.nodes.values()];
if (!quiet) {
  console.log(`story map: ${G.places.map((p) => `${p.id} ${p.nodes.length}`).join(', ')} nodes; ${G.edges.length} edges; ${G.flags.size} flags; place order ${G.places.map((p) => p.id).join(' → ')}`);
  const list = (title, rows) => { if (rows.length) { console.log(`\n${title} (${rows.length})`); rows.forEach((r) => console.log('  ' + r)); } };
  list('Unreachable nodes', D.unreachable.map((u) => `${u.node}: ${u.why}`));
  list('Triggers that can never run', D.blocked.map((b) => `${b.node} via ${b.trigger}: ${b.why}`));
  list('Flags read but never set', D.readNeverSet.map((f) => `${f.flag}: read at ${f.read.map((r) => r.node || `${r.place} ${r.where}`).join(', ')}`));
  list('Dead ends', D.deadEnds.map((d) => `${d.node}: ${d.why}`));
  list('Flags set but never read', D.setNeverRead.map((f) => `${f.flag}: set in ${[...new Set(f.set.map((s) => s.node))].join(', ')}`));
}
if (fatal.length) { console.log(`\nstory map: ${fatal.length} problem(s)`); fatal.forEach((f) => console.log('  - ' + f)); process.exit(1); }
console.log(`\nstory map: every story file loads and parses (${n.length} nodes)`);
