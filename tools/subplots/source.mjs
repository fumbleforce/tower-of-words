// Edit individual story properties without executing modules or replacing unrelated source.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseSource, staticValue, visitSource } from '../lib/source-data.mjs';
const hash = s => crypto.createHash('sha256').update(s).digest('hex');
const key = p => p?.type === 'Property' && !p.computed ? p.key.name ?? p.key.value : null;
const prop = (o, name) => o?.properties?.find(p => key(p) === name);
const literal = n => { try { return staticValue(n); } catch { return null; } };
export function inspect(source, file) {
  const ast = parseSource(source), scenes = [];
  visitSource(ast, node => {
    const nodes = node.type === 'ObjectExpression' && prop(node, 'nodes')?.value;
    if (nodes?.type !== 'ObjectExpression') return;
    for (const p of nodes.properties) {
      const name = key(p);
      if (!name) continue;
      const steps = literal(p.value);
      scenes.push({ id: `public:${file}#${name}`, provider: 'public', title: name.replaceAll('_', ' '),
        node: name, file, group: file.replace(/^game3d\/story\//, '').replace(/\.js$/, ''),
        steps: Array.isArray(steps) ? steps : null, raw: source.slice(...p.value.range),
        range: p.value.range, owner: node, revision: hash(source) });
    }
  });
  return scenes;
}
function target(root, id) {
  if (typeof id !== 'string' || !id.startsWith('public:')) throw Error('Unknown scene provider');
  const [file, name, extra] = id.slice(7).split('#');
  if (extra || !name || !file.startsWith('game3d/story/') || !file.endsWith('.js')) throw Error('Invalid scene id');
  const dir = fs.realpathSync(path.join(root, 'game3d/story'));
  const resolved = fs.realpathSync(path.resolve(root, file));
  if (!resolved.startsWith(dir + path.sep)) throw Error('Scene is outside the story folder');
  const source = fs.readFileSync(resolved, 'utf8');
  const matches = inspect(source, file).filter(s => s.node === name);
  if (matches.length !== 1) throw Error('Scene is missing or ambiguous');
  return { scene: matches[0], resolved, source };
}
function entries(on, node) {
  const out = [];
  for (const [event, value] of Object.entries(on || {})) {
    for (const v of Array.isArray(value) ? value : [value]) {
      if (v === node || v?.node === node) out.push({event, condition: v?.if || '', once: !!v?.once});
    }
  }
  return out;
}
function readScene(root, id) {
  const {scene:s,source} = target(root,id), on = prop(s.owner,'on'), start = prop(s.owner,'start');
  const routes = on ? literal(on.value) : {};
  const {owner,range,...rest}=s;
  const speakers = literal(prop(owner,'speakers')?.value) || {};
  return {...rest, speakers, entries: entries(routes,s.node), routesEditable: routes !== null,
    startsHere: literal(start?.value) === s.node, metadata: {},
    sourceLine: source.slice(0,range[0]).split('\n').length};
}
function routeChanges(on, node, rows) {
  const next = structuredClone(on || {});
  // Keep every other node's routes, including their relative priority.
  for (const [event,value] of Object.entries(next)) {
    const list = Array.isArray(value) ? value : [value];
    const matching = list.findIndex(v => v === node || v?.node === node);
    if (matching < 0) continue;
    const previous=list.filter(v=>v===node||v?.node===node);
    const replacements = rows.filter(r => r.event === event).map((r,i) => {
      const replacement={...(typeof previous[i]==='object'?previous[i]:{}),node};
      delete replacement.if; delete replacement.once;
      if(r.condition)replacement.if=r.condition; if(r.once)replacement.once=true;
      return replacement;
    });
    const kept = list.filter(v => v !== node && v?.node !== node);
    kept.splice(Math.min(matching,kept.length),0,...replacements);
    if (!kept.length) delete next[event]; else next[event] = kept.length === 1 ? kept[0] : kept;
  }
  for (const event of new Set(rows.map(r=>r.event))) {
    if (entries(next,node).some(e => e.event === event)) continue;
    const values=rows.filter(r=>r.event===event).map(r=>({node,...(r.condition?{if:r.condition}:{}),...(r.once?{once:true}:{})}));
    const existing=Object.hasOwn(next,event)?(Array.isArray(next[event])?next[event]:[next[event]]):[];
    const combined=[...values,...existing];next[event]=combined.length===1?combined[0]:combined;
  }
  return next;
}
function validateSteps(steps) {
  if (!Array.isArray(steps)) throw Error('A scene must contain a sequence of steps');
  const check = xs => xs.forEach(s => {
    if (typeof s === 'string') return;
    if (!s || typeof s !== 'object' || Array.isArray(s)) throw Error('Each step must be text or an action');
    if (s.say && typeof s.text !== 'string') throw Error('Dialogue needs text');
    if (s.choice && (!Array.isArray(s.choice) || s.choice.some(c => !c || typeof c.text !== 'string'))) throw Error('Each choice needs a label');
    for (const k of ['then','else']) if (s[k]) check(s[k]);
  });
  check(steps);
}
function proposed(root, data) {
  const {scene:s,resolved,source} = target(root,data.id);
  if (data.revision !== hash(source)) throw Error('CONFLICT: This story changed outside the editor. Reload it before saving.');
  let raw = data.raw;
  if (data.steps !== null && data.steps !== undefined) { validateSteps(data.steps); raw = JSON.stringify(data.steps,null,2); }
  if (typeof raw !== 'string' || raw.length > 500000) throw Error('Missing or oversized scene');
  const expression = parseSource(`const steps = (${raw});`).body[0]?.declarations?.[0]?.init;
  if (!expression || !['ArrayExpression','CallExpression','Identifier','MemberExpression','ConditionalExpression'].includes(expression.type)) throw Error('A scene expression must produce a sequence of steps');
  const edits = [{range:s.range,text:raw}], on = prop(s.owner,'on'), old = on ? literal(on.value) : {};
  if (data.entries) {
    if (!Array.isArray(data.entries)) throw Error('Invalid encounter conditions');
    for (const r of data.entries) {
      if (!r || typeof r.event !== 'string' || !/^[\w:.-]+$/.test(r.event) || typeof r.condition !== 'string') throw Error('Each entry needs a valid event and condition');
      if (r.condition) {
        if (!/^[\w\s!&|()<>=.'"+-]*$/.test(r.condition)) throw Error('This condition uses characters the game does not support');
        // Syntax only; conditions are never executed by the editor.
        const ast = parseSource(`(${r.condition});`);
        visitSource(ast,n => { if (['CallExpression','NewExpression','AssignmentExpression','UpdateExpression','MemberExpression','ArrowFunctionExpression','FunctionExpression'].includes(n.type)) throw Error('Conditions may compare flags and values, not run code'); });
      }
    }
    if (old === null && data.entries.length) throw Error('These routes use code. Edit their source instead.');
    if (old !== null && JSON.stringify(entries(old,s.node)) !== JSON.stringify(data.entries)) {
      const text=JSON.stringify(routeChanges(old,s.node,data.entries),null,2);
      edits.push(on ? {range:on.value.range,text} : {range:[s.owner.range[0]+1,s.owner.range[0]+1],text:`\n on: ${text},`});
    }
  }
  let changed=source;
  for(const e of edits.sort((a,b)=>b.range[0]-a.range[0])) changed=changed.slice(0,e.range[0])+e.text+changed.slice(e.range[1]);
  parseSource(changed);
  return {resolved,source,changed,revision:hash(changed)};
}
export function run(root, data) {
  if (data.action === 'catalog') {
    const scenes=[],errors=[];
    function walk(dir) { for(const e of fs.readdirSync(dir,{withFileTypes:true})) {
      if(e.isSymbolicLink()) continue;
      const f=path.join(dir,e.name);
      if(e.isDirectory()) walk(f);
      else if(e.name.endsWith('.js')) { const file=path.relative(root,f).split(path.sep).join('/');
        try { scenes.push(...inspect(fs.readFileSync(f,'utf8'),file).map(({id,provider,title,node,group,steps})=>({id,provider,title,node,group,count:steps?.length ?? null}))); }
        catch(e) { errors.push({file,error:e.message}); }
      }
    }}
    walk(path.join(root,'game3d/story'));return {scenes,errors};
  }
  if(data.action === 'read') return readScene(root,data.id);
  if(['validate','prepare'].includes(data.action)) {
    const p=proposed(root,data);
    return data.action === 'prepare' ? p : {ok:true,revision:p.revision};
  }
  throw Error('Unknown source operation');
}
if (process.argv[1] === new URL(import.meta.url).pathname) {
  try { const chunks=[];for await(const c of process.stdin)chunks.push(c); const data=JSON.parse(Buffer.concat(chunks));console.log(JSON.stringify(run(process.env.SUBPLOTS_ROOT || process.cwd(),data))); }
  catch(e) { console.log(JSON.stringify({error:e.message}));process.exitCode=1; }
}
