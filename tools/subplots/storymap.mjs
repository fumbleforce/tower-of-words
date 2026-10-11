// The story map's data for the public game: for every scene (a node of a story file) the day and place it plays in,
// its ways in (the file's `on` triggers and `start`) and its routes out (choices, jumps, calls, next place, trips).
// Read statically, like source.mjs: story modules are parsed, never run. The editor draws it (web/storymap.js).
//
//   node tools/subplots/storymap.mjs          (JSON on stdout; SUBPLOTS_ROOT picks the project)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSource, staticValue, visitSource } from '../lib/source-data.mjs';
import { inspect } from './source.mjs';

const nameOf = p => (p?.type === 'Property' && !p.computed ? p.key.name ?? p.key.value : null);
const prop = (node, name) => node?.properties?.find(p => nameOf(p) === name)?.value;
const literal = node => { try { return staticValue(node); } catch { return undefined; } };

// The places in the order the game plays them (places/definitions.js STORY_FILES), and their names.
export function placesOf(root) {
  const file = path.join(root, 'game3d/js/places/definitions.js');
  if (!fs.existsSync(file)) return [];
  const ast = parseSource(fs.readFileSync(file, 'utf8'));
  let order = [], names = {};
  visitSource(ast, node => {
    if (node.type !== 'VariableDeclarator') return;
    if (node.id.name === 'STORY_FILES') order = literal(node.init) || [];
    if (node.id.name === 'PLACE_NAMES') for (const p of node.init?.properties || []) if (nameOf(p)) names[nameOf(p)] = literal(p.value) ?? null;
  });
  const ids = [...order.filter(id => id in names), ...Object.keys(names).filter(id => !order.includes(id))];
  return ids.map(id => ({ id, name: names[id] }));
}

// Which day and place a story file plays in. Day 1 is game3d/story/<place>.js, days 2 to 5 are day<N>/, the days after
// are ongoing/ (game3d/js/days.js). Conversations and investigations are talk menus that open on any day. The engine's
// placeholders only play when a place has no story file, so they are left off the map.
export function fileWhere(file, places) {
  const rel = file.replace(/^game3d\/story\//, '').replace(/\.js$/, '');
  const parts = rel.split('/');
  const base = parts.at(-1);
  const place = places.includes(base) ? base : null;
  if (parts[0] === 'placeholder') return null;
  const dayDir = /^day(\d+)$/.exec(parts[0]);
  if (dayDir && parts.length > 1) return { day: Number(dayDir[1]), place, area: place || base };
  if (parts[0] === 'ongoing' && parts.length > 1) return { day: 'later', place, area: place || base };
  if (parts.length > 1) return { day: 'any', place: null, area: parts[0] + '/' + base };
  return { day: place ? 1 : 'any', place, area: place || base };
}

// A trigger's value: a node name, { node, if, once }, or a list of these. Entries written in code are skipped.
function triggerRows(valueNode) {
  const items = valueNode?.type === 'ArrayExpression' ? valueNode.elements : [valueNode];
  const out = [];
  for (const item of items) {
    const v = literal(item);
    if (typeof v === 'string') out.push({ node: v, condition: '', once: false });
    else if (v && typeof v === 'object' && typeof v.node === 'string') out.push({ node: v.node, condition: typeof v.if === 'string' ? v.if : '', once: !!v.once });
  }
  return out;
}

// Every `on` trigger the object lists itself. Spread-in triggers (`...familiar.on`) are code: `partial` says so.
function routesOf(owner) {
  const on = prop(owner, 'on');
  const out = new Map();
  let partial = false;
  if (on && on.type !== 'ObjectExpression') partial = true;
  for (const p of on?.properties || []) {
    const event = nameOf(p);
    if (!event) { partial = true; continue; }
    triggerRows(p.value).forEach((row, i) => {
      if (!out.has(row.node)) out.set(row.node, []);
      out.get(row.node).push({ event, condition: row.condition, once: row.once, order: i });
    });
  }
  return { byNode: out, partial };
}

// Where a scene's steps lead: choices, jumps and calls to other parts of the file, the next place, trips.
export function routesOut(steps) {
  const out = [];
  const seen = new Set();
  const add = route => {
    const key = `${route.kind}>${route.to}>${route.label || ''}`;
    if (!seen.has(key)) { seen.add(key); out.push(route); }
  };
  const walk = list => {
    for (const s of Array.isArray(list) ? list : []) {
      if (!s || typeof s !== 'object' || Array.isArray(s)) continue;
      if (typeof s.go === 'string') add({ kind: 'jump', to: s.go });
      if (typeof s.call === 'string') add({ kind: 'call', to: s.call });
      if (Array.isArray(s.choice)) for (const o of s.choice) {
        if (!o || typeof o !== 'object') continue;
        const to = typeof o.go === 'string' ? o.go : typeof o.call === 'string' ? o.call : null;
        if (to) add({ kind: 'choice', to, label: typeof o.text === 'string' ? o.text : '' });
      }
      if (s.do === 'next') add({ kind: 'next', to: '' });
      if (s.do === 'trip' && typeof s.to === 'string') add({ kind: 'trip', to: s.to });
      for (const k of ['then', 'else', 'sequence']) walk(s[k]);
    }
  };
  walk(steps);
  return out;
}

export function storyMap(root) {
  const places = placesOf(root);
  const placeIds = places.map(p => p.id);
  const scenes = [];
  const errors = [];
  const dir = path.join(root, 'game3d/story');
  const files = [];
  const walk = d => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isSymbolicLink()) continue;
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else if (e.name.endsWith('.js')) files.push(path.relative(root, f).split(path.sep).join('/'));
    }
  };
  walk(dir);
  for (const file of files.sort()) {
    const where = fileWhere(file, placeIds);
    if (!where) continue;
    let found;
    try { found = inspect(fs.readFileSync(path.join(root, file), 'utf8'), file); } catch (e) { errors.push({ file, error: e.message }); continue; }
    const owners = new Map();
    for (const s of found) {
      if (!owners.has(s.owner)) owners.set(s.owner, { routes: routesOf(s.owner), start: literal(prop(s.owner, 'start')) });
      const { routes, start } = owners.get(s.owner);
      const entries = (routes.byNode.get(s.node) || []).map(({ order, ...e }) => e);
      if (start === s.node) entries.unshift({ event: 'start', condition: '', once: false });
      scenes.push({
        id: s.id, file, node: s.node, day: where.day, place: where.place, area: where.area,
        count: s.steps?.length ?? null, entries, routes: routesOut(s.steps), partial: routes.partial,
      });
    }
  }
  return { places, days: [1, 2, 3, 4, 5, 'later', 'any'], scenes, errors };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try { process.stdout.write(JSON.stringify(storyMap(process.env.SUBPLOTS_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')))); }
  catch (e) { process.stdout.write(JSON.stringify({ error: e.message })); process.exitCode = 1; }
}
