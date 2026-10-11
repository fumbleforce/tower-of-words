// A new public scene from a template, written into a place's story file with the smallest change: the scene and its
// parts are added at the end of the file's `nodes`, and its way in is added to `on` (routes.mjs). Every other line of
// the file stays as it was. The editor's save path (api.py) runs the story checks around the write.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseSource } from '../lib/source-data.mjs';
import { encodeStep, quote, writeList, listItems } from './encode.mjs';
import { encodeRoutes } from './routes.mjs';
import { inspect } from './source.mjs';
import { TEMPLATES, nodeName } from './web/templates.js';

const hash = s => crypto.createHash('sha256').update(s).digest('hex');
const nameOf = p => (p?.type === 'Property' && !p.computed ? p.key.name ?? p.key.value : null);
const prop = (o, name) => o?.properties?.find(p => nameOf(p) === name);
const IDENT = /^[A-Za-z_$][\w$]*$/;

// The story file a day and place play from (game3d/js/days.js): day 1 at the top, days 2 to 5 in day<N>/, later ones in ongoing/.
export function storyFile(day, place) {
  if (!/^[a-z0-9_]+$/.test(place || '')) throw Error('Pick a place');
  const dir = day === 'later' ? 'ongoing/' : Number(day) > 1 ? `day${Number(day)}/` : '';
  return `game3d/story/${dir}${place}.js`;
}

// request: {day, place, template, title, event, who, name, revision?}. Returns {file, resolved, source, changed, id}.
export function prepareCreate(root, request) {
  const template = TEMPLATES.find(t => t.id === request.template);
  if (!template) throw Error('Pick a template');
  if (typeof request.event !== 'string' || !/^(talk|zone|near|look):[\w-]+$/.test(request.event)) throw Error('Pick what starts the scene');
  const file = storyFile(request.day, request.place);
  const resolved = path.join(root, file);
  if (!fs.existsSync(resolved)) throw Error(`There is no story file for this place on this day yet (${file}).`);
  const source = fs.readFileSync(resolved, 'utf8');
  if (request.revision && request.revision !== hash(source)) throw Error('CONFLICT: The story file changed. Reload before adding a scene.');
  // the object that holds the place's nodes and its routes
  const scenes = inspect(source, file);
  const owner = scenes[0]?.owner ?? null;
  const nodes = prop(owner, 'nodes')?.value, on = prop(owner, 'on')?.value;
  if (nodes?.type !== 'ObjectExpression') throw Error('This place’s scenes are put together in code, so a new scene can’t be added here.');
  if (on && on.type !== 'ObjectExpression') throw Error('This place’s ways in are put together in code, so a new scene can’t be added here.');
  const taken = scenes.map(s => s.node);
  const node = nodeName(request.title, taken);
  const who = /^\w+$/.test(request.who || '') ? request.who : 'mio';
  const built = template.build({ who, node, name: typeof request.name === 'string' ? request.name : '' });
  // parts keep the names the template gave them, made unique too
  const rename = {};
  for (const part of Object.keys(built.parts)) rename[part] = nodeName(part, [...taken, node, ...Object.values(rename)]);
  const fix = steps => steps.map(s => (s && typeof s === 'object' && s.choice ? { ...s, choice: s.choice.map(o => ({ ...o, go: rename[o.go] || o.go })) } : s));
  const { indent } = listItems(nodes, source);
  const inner = indent + '  ';
  const nodeText = (name, steps) => `${IDENT.test(name) ? name : quote(name)}: [\n${fix(steps).map(s => inner + encodeStep(s, inner)).join(',\n')},\n${indent}]`;
  const rows = nodes.properties.map((p, i) => ({ from: i, text: source.slice(...p.range) }));
  rows.push({ text: nodeText(node, built.steps) }, ...Object.entries(built.parts).map(([k, steps]) => ({ text: nodeText(rename[k], steps) })));
  const nodesText = writeList(nodes, source, rows);
  // a way in that is already used plays the new scene the first time, before what was there, so nothing else is lost
  const used = !!on && on.properties.some(p => nameOf(p) === request.event);
  const entry = { event: request.event, condition: typeof request.condition === 'string' ? request.condition : '', once: request.once ?? used };
  const edits = [];
  if (on) edits.push({ range: nodes.range, text: nodesText }, { range: on.range, text: encodeRoutes(on, source, node, [entry]) });
  else {
    // no ways in yet: an `on` goes in just before `nodes`
    const props = owner.properties.map((p, i) => ({ from: i, text: p.value === nodes ? source.slice(p.range[0], nodes.range[0]) + nodesText + source.slice(nodes.range[1], p.range[1]) : source.slice(...p.range) }));
    props.splice(owner.properties.findIndex(p => p.value === nodes), 0, { text: `on: { ${quote(entry.event)}: ${quote(node)} }` });
    edits.push({ range: owner.range, text: writeList(owner, source, props) });
  }
  let changed = source;
  for (const e of edits.sort((a, b) => b.range[0] - a.range[0])) changed = changed.slice(0, e.range[0]) + e.text + changed.slice(e.range[1]);
  parseSource(changed);
  if (!inspect(changed, file).some(s => s.node === node)) throw Error('The new scene could not be added to the story file.');
  return { file, resolved, source, changed, node, id: `public:${file}#${node}`, revision: hash(changed) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  try {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    console.log(JSON.stringify(prepareCreate(process.env.SUBPLOTS_ROOT || process.cwd(), JSON.parse(Buffer.concat(chunks)))));
  } catch (e) { console.log(JSON.stringify({ error: e.message })); process.exitCode = 1; }
}
