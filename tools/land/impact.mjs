// Which places a change can move in the place budget check (#389), so a land re-measures only those and reuses the
// earlier passes of the rest. A place's numbers come from the modules its place file imports (directly or through
// other modules), plus the files those modules name; code the whole game loads (main.js and what it imports, outside
// the place files) can move every place. When in doubt (a module nothing imports by name, an asset no module names,
// the budget tool itself) every place counts as changed. Tested in game3d/test/unit/land-queue.test.mjs.
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// Never loaded by a place: tests, captures, tools (except the budget tool), docs, sound (no draw calls or memory
// on the GPU), the opening (a page of its own in a frame over the title) and the side pages.
const NO_PLACE = [
  /^game3d\/(test|shots|qa|design|audio|opening)\//,
  /^game3d\/js\/(showcase|viewer|vrm)\//,
  /^game3d\/tools\/(?!perf\/)/,
  /\.md$/i,
  /^game3d\/(showcase|viewer|vrm-test)\.html$/,
];
// Outside game3d/, only the budget tool's own helpers and the npm packages (Playwright) matter.
const ALL_OUTSIDE = /^(package(-lock)?\.json|tools\/lib\/(browser-job|browser-gpu-slots|static-server|build-stamp|place-source)\.mjs)$/;
const LOCK = 'tools/assets/assets.lock.json';
const JS = /\.m?js$/;
// The page's modules: main.js and menu.js, and the ones index.html adds on a local host or with ?map.
const entriesOf = html => [...new Set([...html.matchAll(/['"]\.\/(js\/[^'"?]+\.m?js)/g)].map(m => 'game3d/' + m[1]))];

const IMPORT = /\bimport\s*(?:[^'"`;()]*?\bfrom\s*)?['"]([^'"\n]+)['"]|\bexport\s*(?:\*|\{[^}]*\})\s*(?:as\s+\w+\s*)?from\s*['"]([^'"\n]+)['"]|\bimport\(\s*['"]([^'"\n]+)['"]\s*\)/g;
const BARE = { three: 'game3d/vendor/three/three.module.js' };

export function importsOf(file, source) {
  const out = new Set();
  for (const match of source.matchAll(IMPORT)) {
    const spec = (match[1] || match[2] || match[3]).replace(/[?#].*$/, '');
    if (spec.startsWith('.')) out.add(path.posix.normalize(path.posix.join(path.posix.dirname(file), spec)));
    else if (BARE[spec]) out.add(BARE[spec]);
    else if (spec.startsWith('three/addons/')) out.add('game3d/vendor/' + spec.slice('three/addons/'.length));
  }
  return [...out];
}

export function placeFilesOf(definitions) {
  const block = /export const PLACE_FILES = \{([^}]*)\}/.exec(definitions)?.[1] || '';
  return Object.fromEntries([...block.matchAll(/(\w+):\s*'([^']+)'/g)].map(m => [m[1], m[2]]));
}

// sources: Map of game3d module path -> text (runtime modules only); placeFiles: { place: module path }; entries: the
// modules index.html loads.
export function buildGraph(sources, placeFiles, entries = ['game3d/js/main.js']) {
  const edges = new Map([...sources].map(([file, text]) => [file, importsOf(file, text).filter(f => sources.has(f))]));
  const placeModules = new Set(Object.values(placeFiles));
  const closure = (start, stopAtPlaces) => {
    const seen = new Set(), todo = [start];
    while (todo.length) {
      const file = todo.pop();
      if (seen.has(file) || !sources.has(file)) continue;
      if (stopAtPlaces && placeModules.has(file)) continue;
      seen.add(file);
      todo.push(...edges.get(file));
    }
    return seen;
  };
  const shared = new Set(entries.flatMap(entry => [...closure(entry, true)]));
  return { sources, shared,
    places: Object.fromEntries(Object.entries(placeFiles).map(([place, file]) => [place, closure(file, false)])) };
}

// 'all' or the list of places one changed file can move.
export function affectedBy(file, graph) {
  if (NO_PLACE.some(rule => rule.test(file))) return [];
  if (!file.startsWith('game3d/')) return ALL_OUTSIDE.test(file) ? 'all' : [];
  if (JS.test(file)) {
    if (graph.shared.has(file)) return 'all';
    const hit = Object.keys(graph.places).filter(place => graph.places[place].has(file));
    return hit.length ? hit : 'all';
  }
  // an asset, style sheet or data file: the places whose modules name it
  const name = path.posix.basename(file), referrers = [...graph.sources].filter(([, text]) => text.includes(name));
  if (!referrers.length) return 'all';
  const places = new Set();
  for (const [referrer] of referrers) {
    const hit = affectedBy(referrer, graph);
    if (hit === 'all') return 'all';
    hit.forEach(place => places.add(place));
  }
  return [...places];
}

// 'all' or the Set of places the changed files can move, judged in each tree's module graph (before and after).
export function affectedPlaces(changed, graphs) {
  const places = new Set();
  for (const file of changed) for (const graph of graphs) {
    const hit = affectedBy(file, graph);
    if (hit === 'all') return 'all';
    hit.forEach(place => places.add(place));
  }
  return places;
}

// The locked files whose bytes differ between two asset lock files (each { files: { path: { sha256 } } }).
export function lockDelta(before, after) {
  const a = before?.files || {}, b = after?.files || {};
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(file => a[file]?.sha256 !== b[file]?.sha256);
}

// Which places to measure on a candidate: a place reuses its last pass (cache: { place: commit }) when nothing
// between that commit and the candidate can move it. impact(from, to) is affectedPlaces for the change between them.
export function planPlaces(places, cache, candidate, impact) {
  const measure = [], reused = {}, byCommit = new Map();
  for (const place of places) {
    const from = cache[place];
    if (!from) { measure.push(place); continue; }
    if (!byCommit.has(from)) byCommit.set(from, from === candidate ? new Set() : impact(from, candidate));
    const hit = byCommit.get(from);
    if (hit === 'all' || hit.has(place)) measure.push(place); else reused[place] = from;
  }
  return { measure, reused };
}

// The git side: module graphs and changed files read straight from commits (no checkout).
export function gitImpact(cwd) {
  const git = (args, input) => execFileSync('git', args, { cwd, input, encoding: 'utf8', maxBuffer: 256 << 20 });
  const graphs = new Map();
  const exists = commit => { try { git(['cat-file', '-e', `${commit}^{commit}`]); return true; } catch { return false; } };
  const blobs = (commit, files) => {
    const out = execFileSync('git', ['cat-file', '--batch'], { cwd, input: files.map(f => `${commit}:${f}`).join('\n') + '\n', maxBuffer: 1 << 30 });
    const texts = new Map();
    let at = 0;
    for (const file of files) {
      const end = out.indexOf(10, at), header = out.subarray(at, end).toString().split(' ');
      if (header[1] === 'missing') { at = end + 1; continue; }
      const size = Number(header[2]);
      texts.set(file, out.subarray(end + 1, end + 1 + size).toString('utf8'));
      at = end + 1 + size + 1;
    }
    return texts;
  };
  const graphAt = commit => {
    if (graphs.has(commit)) return graphs.get(commit);
    const files = git(['ls-tree', '-r', '-z', '--name-only', commit, '--', 'game3d']).split('\0')
      .filter(f => JS.test(f) && !f.startsWith('game3d/vendor/') && !NO_PLACE.some(rule => rule.test(f)));
    const sources = blobs(commit, files);
    let html = '';
    try { html = git(['show', `${commit}:game3d/index.html`]); } catch { /* no page: main.js alone */ }
    const entries = entriesOf(html);
    const graph = buildGraph(sources, placeFilesOf(sources.get('game3d/js/places/definitions.js') || ''),
      entries.length ? entries : undefined);
    graphs.set(commit, graph);
    return graph;
  };
  const lockAt = commit => { try { return JSON.parse(git(['show', `${commit}:${LOCK}`])); } catch { return null; } };
  const changedFiles = (from, to) => {
    const files = git(['diff', '--name-only', '-z', '--no-renames', from, to]).split('\0').filter(Boolean);
    return files.flatMap(f => f === LOCK ? lockDelta(lockAt(from), lockAt(to)) : [f]);
  };
  const impact = (from, to) => exists(from) ? affectedPlaces(changedFiles(from, to), [graphAt(to), graphAt(from)]) : 'all';
  const placesAt = commit => Object.keys(graphAt(commit).places);
  return { impact, placesAt, changedFiles };
}
