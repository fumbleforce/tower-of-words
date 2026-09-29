// The day as a graph, built from the story files themselves (game3d/story/*.js, format in game3d/story/FORMAT.md)
// and shared engine declarations (place order in game3d/js/places/definitions.js, named flags and events).
// Pure data, no DOM: the bible's story map (bible/story-map.js) draws it, and tools/bible/story-map-check.mjs runs
// it in node to prove every story file still loads and parses.
//
// Shared compilation decides condition validity. The analysis below infers requirements only for its supported subset.
// Trigger lists work like Runner.entry(): the first entry whose `if` holds runs, so a later entry also needs every
// earlier one to fail (unless the earlier one is `once`).
import { DEFAULT_SPEAKERS, NEXT, PLACE_FILES, STORY_FILES, ENGINE_WRITES, PLACE_EVENTS } from '../game3d/js/narrative/contracts.js';
export { STORY_FILES } from '../game3d/js/narrative/contracts.js';
import { allowedConditionCharacters, compileCondition } from '../game3d/js/narrative/conditions.js';
import { CAST } from '../game3d/js/bonds/cast.js';
import { storyBondGate } from '../game3d/js/bonds/gates.js';

// ------------------------------------------------------------------ conditions
function tokens(src) {
  const out = [];
  const re = /\s*(?:(\d+(?:\.\d+)?)|('[^']*'|"[^"]*")|([A-Za-z_]\w*)|(===|!==|==|!=|>=|<=|&&|\|\||[!()<>]))/y;
  let m, i = 0;
  while (i < src.length) {
    re.lastIndex = i;
    m = re.exec(src);
    if (!m || m[0] === '') { if (/^\s*$/.test(src.slice(i))) break; throw new Error(`can't read "${src.slice(i)}"`); }
    i = re.lastIndex;
    if (m[1] !== undefined) out.push({ t: 'num', v: +m[1] });
    else if (m[2] !== undefined) out.push({ t: 'str', v: m[2].slice(1, -1) });
    else if (m[3] !== undefined) out.push(m[3] === 'true' || m[3] === 'false' ? { t: 'bool', v: m[3] === 'true' } : { t: 'id', v: m[3] });
    else if (m[4] !== undefined) out.push({ t: 'op', v: m[4] });
  }
  return out;
}
// or := and ('||' and)* ; and := cmp ('&&' cmp)* ; cmp := not (op not)? ; not := '!' not | atom
function parseCondSubset(src) {
  if (src === undefined || src === null || src === true) return { k: 'true' };
  if (src === false) return { k: 'false' };
  const T = tokens(String(src));
  let p = 0;
  const peek = () => T[p], eat = (v) => { if (T[p] && T[p].v === v) { p++; return true; } return false; };
  const or = () => { let a = and(); while (eat('||')) a = { k: 'or', a, b: and() }; return a; };
  const and = () => { let a = cmp(); while (eat('&&')) a = { k: 'and', a, b: cmp() }; return a; };
  const not = () => (eat('!') ? { k: 'not', a: not() } : atom());
  const cmp = () => {
    const a = not();
    const o = peek();
    if (o && o.t === 'op' && /^(===|!==|==|!=|>=|<=|<|>)$/.test(o.v)) { p++; return { k: 'cmp', op: o.v, a, b: not() }; }
    return a;
  };
  const atom = () => {
    const t = T[p++];
    if (!t) throw new Error('condition ends early');
    if (t.v === '(') { const e = or(); if (!eat(')')) throw new Error('missing )'); return e; }
    if (t.t === 'id') return { k: 'flag', v: t.v };
    if (t.t === 'num' || t.t === 'str' || t.t === 'bool') return { k: 'lit', v: t.v };
    throw new Error(`unexpected ${t.v}`);
  };
  const e = or();
  if (p < T.length) throw new Error(`unexpected ${T[p].v}`);
  return e;
}
export function parseCond(src) {
  if (src === undefined || src === null || typeof src === 'boolean') return parseCondSubset(src);
  if (!allowedConditionCharacters(src)) throw new Error(`condition has odd characters: ${src}`);
  const compiled = compileCondition(src);
  if (compiled.error) throw compiled.error;
  try { return parseCondSubset(src); }
  catch { return { k: 'opaque', source: src, flags: compiled.flags }; }
}
export function condFlags(ast, out = new Set()) {
  if (!ast) return out;
  if (ast.k === 'flag') out.add(ast.v);
  if (ast.k === 'opaque') for (const flag of ast.flags) out.add(flag);
  for (const x of [ast.a, ast.b]) if (x && typeof x === 'object') condFlags(x, out);
  return out;
}
// What must hold for the expression to have the value `want`: Map flag -> true (set / non-zero) or false (unset).
// null means "can't be satisfied". Comparisons: `x >= 2` needs x set; `x == 'y'` needs x set; others say nothing.
function need(ast, want = true) {
  switch (ast.k) {
    case 'true': return want ? new Map() : null;
    case 'false': return want ? null : new Map();
    case 'lit': return (!!ast.v) === want ? new Map() : null;
    case 'flag': return new Map([[ast.v, want]]);
    case 'not': return need(ast.a, !want);
    case 'cmp': {
      const f = ast.a.k === 'flag' ? ast.a.v : ast.b.k === 'flag' ? ast.b.v : null;
      const lit = ast.a.k === 'lit' ? ast.a.v : ast.b.k === 'lit' ? ast.b.v : null;
      if (!f) return new Map();
      const positive = (/^(>=|>)$/.test(ast.op) && lit >= (ast.op === '>' ? 0 : 1)) || (/^(==|===)$/.test(ast.op) && lit && lit !== 0);
      return want && positive ? new Map([[f, true]]) : new Map();
    }
    case 'and': case 'or': {
      const both = (ast.k === 'and') === want;   // and-true or or-false: every side must hold
      const x = need(ast.a, want), y = need(ast.b, want);
      if (both) return merge(x, y);
      if (!x) return y; if (!y) return x;
      const out = new Map();
      for (const [k, v] of x) if (y.has(k) && y.get(k) === v) out.set(k, v);
      return out;
    }
  }
  return new Map();
}
function merge(x, y) {
  if (!x || !y) return null;
  const out = new Map(x);
  for (const [k, v] of y) { if (out.has(k) && out.get(k) !== v) return null; out.set(k, v); }
  return out;
}
const safeNeed = (src, want = true) => { try { return need(parseCond(src), want); } catch { return new Map(); } };

// ------------------------------------------------------------------ engine facts
// Runtime-backed declarations; source reads below are only for story line references.
export function engineFacts() {
  const exact = new Map(), prefix = new Map();
  for (const [file, spec] of Object.entries(ENGINE_WRITES)) {
    for (const [kind, map] of [['exact', exact], ['prefix', prefix]]) for (const key of spec[kind]) {
      if (!map.has(key)) map.set(key, new Set());
      map.get(key).add(file);
    }
  }
  const events = Object.fromEntries(Object.entries(PLACE_EVENTS).map(([place, entries]) => [place,
    Object.fromEntries(Object.values(entries).filter(event => event.source === 'place').map(event => [event.id, event.hook]))]));
  return { next: NEXT, exact, prefix, placeFile: PLACE_FILES, events, speakers: DEFAULT_SPEAKERS };
}

// ------------------------------------------------------------------ the graph
const short = (t, n = 90) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
export function lineOf(s) {
  if (typeof s === 'string') {
    if (s.startsWith('>')) return { who: null, text: s.replace(/^>\s*/, '') };
    const i = s.indexOf(': ');
    if (i > 0 && /^\w+$/.test(s.slice(0, i))) return { who: s.slice(0, i), text: s.slice(i + 2) };
    return { who: null, text: s };
  }
  if (s && s.say) return { who: s.say, text: s.text || '', overheard: !!s.overheard, name: s.name };
  return null;
}

export function buildGraph({ mods, files = {}, errors = [], cast = CAST }) {
  const E = engineFacts(files);
  const G = { speakers: { transitions: { ...engineFacts(files).speakers, ...((mods.transitions || {}).speakers || {}) } }, places: [], nodes: new Map(), edges: [], flags: new Map(), errors: [...errors], engine: E, drift: {} };
  const flag = (f) => { if (!G.flags.has(f)) G.flags.set(f, { name: f, set: [], read: [] }); return G.flags.get(f); };
  const edgeKey = new Map();
  const edge = (from, to, kind, label = '', extra = {}) => {
    const k = `${from}>${to}>${kind}`;
    if (edgeKey.has(k)) { const e = edgeKey.get(k); if (label && !e.labels.includes(label)) e.labels.push(label); return e; }
    const e = { from, to, kind, labels: label ? [label] : [], ...extra };
    edgeKey.set(k, e); G.edges.push(e); return e;
  };
  const missing = [];

  // places in the order the engine plays them: the first place nobody leads to, then NEXT
  const placeIds = STORY_FILES.filter((p) => p !== 'transitions' && mods[p]);
  const targets = new Set(Object.values(E.next));
  const order = [];
  let cur = placeIds.find((p) => !targets.has(p)) || placeIds[0];
  while (cur && !order.includes(cur)) { order.push(cur); cur = E.next[cur]; }
  for (const p of placeIds) if (!order.includes(p)) order.push(p);
  const storiesThrough = Object.fromEntries(order.map((place, i) =>
    [place, order.slice(0, i + 1).map(id => mods[id]).filter(Boolean)]));

  // ---- walk every node's steps
  function walkSteps(node, list, conds, gateStories = storiesThrough[node.place] || []) {
    if (!Array.isArray(list)) { node.problems.push('steps are not a list'); return; }
    for (const s of list) {
      const ln = lineOf(s);
      if (ln) { node.lines++; if (!node.first) node.first = ln; if (ln.who) node.speakers.add(ln.who); }
      if (!s || typeof s !== 'object') continue;
      const here = conds.length ? conds.join(' && ') : '';
      if (s.set !== undefined) for (const f of typeof s.set === 'string' ? [s.set] : Object.keys(s.set)) node.sets.push({ flag: f, how: 'set', cond: here });
      if (s.unset) node.sets.push({ flag: s.unset, how: 'unset', cond: here });
      if (s.inc) node.sets.push({ flag: s.inc, how: 'inc', cond: here });
      if (s.learn) teach(node, s.learn, 'learn', here);
      if (s.offer) teach(node, s.offer, 'offer', here);
      if (s.if !== undefined && (s.then || s.else)) {
        node.reads.push({ cond: String(s.if), where: 'if' });
        if (s.then) walkSteps(node, s.then, [...conds, `(${s.if})`], gateStories);
        if (s.else) walkSteps(node, s.else, [...conds, `!(${s.if})`], gateStories);
      }
      if (s.go) node.jumps.push({ to: s.go, kind: 'go', cond: here });
      if (s.call) node.jumps.push({ to: s.call, kind: 'call', cond: here });
      if (s.choice) {
        node.choices.push(s);
        for (const o of s.choice) {
          if (o.if) node.reads.push({ cond: String(o.if), where: 'choice' });
          const c = [here, o.if ? `(${o.if})` : ''].filter(Boolean).join(' && ');
          if (o.set !== undefined) for (const f of typeof o.set === 'string' ? [o.set] : Object.keys(o.set)) node.sets.push({ flag: f, how: 'choice', cond: c, choice: o.text });
          if (o.go) node.jumps.push({ to: o.go, kind: 'choice', label: o.text, cond: c });
          if (o.call) node.jumps.push({ to: o.call, kind: 'choice', label: o.text, cond: c, call: true });
          if (!o.go && !o.call) node.jumps.push({ to: null, kind: 'choice', label: o.text, cond: c });
        }
      }
      if (s.do) {
        const d = s.do;
        node.hooks.add(d);
        if (d === 'type' && s.word) { teach(node, s.word, 'type', here); node.sets.push({ flag: 'typed_' + s.word, how: 'type', cond: here }); }
        if (d === 'next') node.exit = 'next';
        if (d === 'end') node.exit = 'end';
        if (d === 'period' && s.to) { node.periods.push(s.to); node.sets.push({ flag: 'period', how: 'period', value: s.to, cond: here }); }
        if (d === 'meet' && s.who) node.sets.push({ flag: 'met_' + s.who, how: 'meet', cond: here });
        if (d === 'bondStep' && s.who && s.to) node.sets.push({ flag: storyBondGate(cast, gateStories, s.who, s.to), how: 'bondStep', cond: here });
        if (d === 'remember' && s.who && s.id) node.sets.push({ flag: `rem_${s.who}_${s.id}`, how: 'remember', cond: here });
        if (d === 'fact' && s.who && s.id) node.sets.push({ flag: `fact_${s.who}_${s.id}`, how: 'fact', cond: here });
        if (d === 'buy' && s.item) node.sets.push({ flag: 'bought_' + s.item, how: 'buy', cond: here });
        if (d === 'goal' && !s.side) node.goals.push(String(s.text || ''));
      }
    }
  }
  function teach(node, word, how, cond) {
    node.teaches.push({ word, how });
    node.sets.push({ flag: 'know_' + word, how, cond });
  }
  const newNode = (id, place, name, steps, extra = {}) => {
    const n = { id, place, name, steps, entries: [], lines: 0, first: null, speakers: new Set(), sets: [], reads: [], jumps: [], choices: [],
      teaches: [], hooks: new Set(), periods: [], goals: [], exit: null, problems: [], ...extra };
    G.nodes.set(id, n);
    return n;
  };

  for (const place of order) {
    const st = mods[place];
    const P = { id: place, start: st.start || null, next: E.next[place] || null, nodes: [], triggers: [], ambient: [], checks: [],
      speakers: { ...E.speakers, ...(st.speakers || {}) }, file: `game3d/story/${place}.js` };
    const text = (files[P.file] || '').split('\n');
    const lineOfNode = (name) => { const i = text.findIndex((l) => new RegExp(`^\\s*['"]?${name.replace(/[^\w]/g, '')}['"]?\\s*:\\s*\\[`).test(l)); return i >= 0 ? i + 1 : null; };
    G.places.push(P);
    G.speakers[place] = P.speakers;
    for (const [name, steps] of Object.entries(st.nodes || {})) {
      const n = newNode(`${place}:${name}`, place, name, steps, { line: lineOfNode(name) });
      walkSteps(n, steps, []);
      P.nodes.push(n.id);
    }
    // ambient moments are small scenes of their own
    for (const a of st.ambient || []) {
      const n = newNode(`${place}:~${a.id}`, place, `~${a.id}`, a.lines || [], { ambient: a });
      walkSteps(n, a.lines || [], []);
      if (a.set) n.sets.push({ flag: a.set, how: 'ambient', cond: '' });
      P.nodes.push(n.id);
      n.entries.push({ trigger: `ambient near ${a.near || (a.who || [])[0] || '?'}`, cond: [a.if, a.period ? `period ${[].concat(a.period).join('/')}` : ''].filter(Boolean).join(' · '), ifCond: a.if || '', req: safeNeed(a.if), ok: true });
      if (a.if) n.reads.push({ cond: a.if, where: 'ambient' });
    }
    // conditions on markers and labels only read flags
    for (const [k, c] of Object.entries({ ...(st.show || {}) })) P.checks.push({ where: `show ${k}`, cond: c });
    for (const [k, c] of Object.entries({ ...(st.goal || {}) })) P.checks.push({ where: `goal ${k}`, cond: c });
    for (const [k, L] of Object.entries(st.labels || {})) if (Array.isArray(L) && L[1]) P.checks.push({ where: `label ${k}`, cond: L[1] });
    // triggers
    if (st.start) {
      if (st.nodes && st.nodes[st.start]) G.nodes.get(`${place}:${st.start}`).entries.push({ trigger: 'start', cond: '', ifCond: '', req: new Map(), ok: true, start: true });
      else missing.push({ place, where: 'start', to: st.start });
    }
    for (const [key, v] of Object.entries(st.on || {})) {
      const list = (Array.isArray(v) ? v : [v]).map((e) => (typeof e === 'string' ? { node: e } : e));
      const m = /^say:(\w+):/.exec(key);
      const implicit = m ? `know_${m[1]}` : null;
      let before = new Map(), shadowedBy = null;
      list.forEach((t, i) => {
        let own;
        try { own = need(parseCond(t.if), true); } catch (e) { own = new Map(); P.checks.push({ where: `on ${key}`, cond: t.if, bad: e.message }); }
        let req = merge(own, before);
        if (implicit) req = merge(req, new Map([[implicit, true]]));
        const entry = { trigger: key, index: i, of: list.length, cond: t.if || '', ifCond: t.if || '', once: !!t.once, keep: !!t.keep, req, ok: true };
        if (shadowedBy !== null) { entry.ok = false; entry.why = `never reached: entry ${shadowedBy + 1} of ${key} always matches first`; }
        else if (!req) { entry.ok = false; entry.why = 'its condition contradicts the entries before it'; }
        P.triggers.push({ key, entry, node: t.node });
        const target = G.nodes.get(`${place}:${t.node}`);
        if (!target) missing.push({ place, where: `on ${key}`, to: t.node });
        else target.entries.push(entry);
        // a later entry needs this one to fail, unless this one is once (it can be used up)
        if (!t.once) {
          if (!t.if) shadowedBy = shadowedBy ?? i;
          else before = merge(before, safeNeed(t.if, false)) || before;
        }
      });
    }
  }
  // transitions: one slot per NEXT pair
  const tr = mods.transitions || {};
  for (const [from, to] of Object.entries(E.next)) {
    const key = `${from}_to_${to}`, slot = tr[key];
    if (!slot) continue;
    const steps = [...(slot.walk || []), ...(slot.ride || []), ...(slot.arrive || [])];
    const tt = (files['game3d/story/transitions.js'] || '').split('\n').findIndex((l) => new RegExp(`^\\s*${key}\\s*:`).test(l));
    const n = newNode(`transitions:${key}`, 'transitions', key, steps, { transition: { from, to, slot }, line: tt >= 0 ? tt + 1 : null });
    walkSteps(n, [...(slot.walk || []), ...(slot.ride || [])], [], storiesThrough[from] || []);
    walkSteps(n, slot.arrive || [], [], storiesThrough[to] || []);
    n.entries.push({ trigger: `leaving ${from}`, cond: '', ifCond: '', req: new Map(), ok: true });
  }
  for (const k of Object.keys(tr)) if (k !== 'speakers' && !/^\w+_to_\w+$/.test(k)) G.errors.push(`transitions.js: odd key ${k}`);
  for (const k of Object.keys(tr)) { const mm = /^(\w+)_to_(\w+)$/.exec(k); if (mm && E.next[mm[1]] !== mm[2]) G.errors.push(`transitions.js: ${k} is never played (places/definitions.js NEXT has ${mm[1]} → ${E.next[mm[1]] || 'nothing'})`); }

  // ---- edges: jumps, place changes, flag unlocks
  for (const n of G.nodes.values()) {
    for (const j of n.jumps) {
      if (!j.to) continue;
      const to = `${n.place}:${j.to}`;
      if (!G.nodes.has(to)) { missing.push({ place: n.place, where: n.name, to: j.to }); continue; }
      edge(n.id, to, j.kind === 'choice' ? 'choice' : j.kind, j.label || '', { cond: j.cond, call: j.kind === 'call' || j.call });
    }
    if (n.exit === 'next') {
      const to = E.next[n.place];
      if (!to) { n.problems.push(`does next, but places/definitions.js has no place after ${n.place}`); continue; }
      const tn = G.nodes.get(`transitions:${n.place}_to_${to}`);
      const startOf = (p) => { const P = G.places.find((x) => x.id === p); return P && P.start ? `${p}:${P.start}` : null; };
      if (tn) { edge(n.id, tn.id, 'next'); const s = startOf(to); if (s && G.nodes.has(s)) edge(tn.id, s, 'next'); }
      else { const s = startOf(to); if (s && G.nodes.has(s)) edge(n.id, s, 'next'); }
    }
  }
  // a place hook that fires a story event (arrive -> event:approach) leads to that event's trigger
  for (const n of G.nodes.values()) {
    const ev = E.events[n.place] || {};
    for (const [name, hook] of Object.entries(ev)) {
      if (!hook || !n.hooks.has(hook)) continue;
      n.firesEvents = true;
      for (const t of G.nodes.values()) if (t.place === n.place && t.entries.some((e) => e.trigger === 'event:' + name)) edge(n.id, t.id, 'event', `${hook} → ${name}`);
    }
  }
  for (const n of G.nodes.values()) for (const e of n.entries) {
    const m = /^event:(\w+)$/.exec(e.trigger);
    if (m && m[1] !== 'start') { const h = (E.events[n.place] || {})[m[1]]; e.firedBy = h ? `the ${h} hook (${E.placeFile[n.place]})` : `the place code (${E.placeFile[n.place] || 'no place file'})`; }
  }
  // who sets what
  for (const n of G.nodes.values()) for (const s of n.sets) flag(s.flag).set.push({ node: n.id, how: s.how, cond: s.cond, choice: s.choice });
  // who reads what
  const readAt = (f, where) => flag(f).read.push(where);
  for (const n of G.nodes.values()) {
    for (const e of n.entries) {
      if (e.ifCond) for (const f of condFlags(safeParse(e.ifCond))) readAt(f, { node: n.id, where: e.trigger, cond: e.ifCond });
      if (/^say:(\w+):/.test(e.trigger)) readAt(`know_${e.trigger.split(':')[1]}`, { node: n.id, where: e.trigger, cond: 'the Say menu', implicit: true });
    }
    for (const r of n.reads) if (r.where !== 'ambient') for (const f of condFlags(safeParse(r.cond))) readAt(f, { node: n.id, where: r.where, cond: r.cond });
  }
  for (const P of G.places) for (const c of P.checks) for (const f of condFlags(safeParse(c.cond))) readAt(f, { place: P.id, where: c.where, cond: c.cond });

  // leaf replies: a node that jumps nowhere, moves no place, teaches nothing and sets nothing the story reads.
  // They answer a poke; drawing the flags that open them would bury the story in lines, so they are "side talk".
  const readSoFar = new Set([...G.flags.values()].filter((F) => F.read.length).map((F) => F.name));
  for (const n of G.nodes.values()) {
    n.leaf = !n.jumps.some((j) => j.to) && !n.exit && !n.teaches.length && !n.periods.length && !n.choices.length && !n.transition && !n.firesEvents
      && !n.sets.some((s) => s.how !== 'unset' && readSoFar.has(s.flag));
  }
  // unlock edges: a node that sets a flag a trigger entry needs, to the node that entry runs
  for (const n of G.nodes.values()) for (const e of n.entries) {
    if (n.leaf) continue;
    if (!e.ok || !e.req) continue;
    for (const [f, v] of e.req) {
      if (!v) continue;
      for (const s of (G.flags.get(f) || { set: [] }).set) {
        if (s.how === 'unset' || s.node === n.id) continue;
        edge(s.node, n.id, 'unlock', f, { cross: G.nodes.get(s.node).place !== n.place });
      }
    }
  }

  // ---- is a flag set anywhere?
  const engineSets = (f) => {
    if (E.exact.has(f)) return [...E.exact.get(f)];
    for (const [p, where] of E.prefix) if (f.startsWith(p) && f.length > p.length) return [...where];
    return null;
  };
  const isSet = (f) => (G.flags.get(f) || { set: [] }).set.some((s) => s.how !== 'unset') || !!engineSets(f);
  for (const F of G.flags.values()) F.engine = engineSets(F.name);

  // entries whose needs can't be met: a flag they need is never set by anything
  for (const n of G.nodes.values()) for (const e of n.entries) {
    if (!e.ok || !e.req) continue;
    const never = [...e.req].filter(([f, v]) => v && !isSet(f)).map(([f]) => f);
    if (never.length) { e.ok = false; e.why = `needs ${never.join(', ')}, which nothing sets`; }
  }

  // ---- reachability: from every entry that can run, along go / call / choice / next
  const reach = new Set(), stack = [];
  for (const n of G.nodes.values()) if (n.entries.some((e) => e.ok)) { reach.add(n.id); stack.push(n.id); }
  const out = new Map();
  for (const e of G.edges) if (e.kind !== 'unlock') (out.get(e.from) || out.set(e.from, []).get(e.from)).push(e.to);
  while (stack.length) for (const t of out.get(stack.pop()) || []) if (!reach.has(t)) { reach.add(t); stack.push(t); }
  for (const n of G.nodes.values()) n.reachable = reach.has(n.id);

  // ---- side talk: poke-and-reply nodes that change nothing the story reads
  const inFlow = new Set(G.edges.filter((e) => e.kind !== 'unlock' || true).map((e) => e.to));
  const readFlags = new Set([...G.flags.values()].filter((F) => F.read.length).map((F) => F.name));
  for (const n of G.nodes.values()) {
    const outs = G.edges.filter((e) => e.from === n.id);
    n.side = n.leaf && !n.entries.some((e) => e.start) && !G.edges.some((e) => e.to === n.id && e.kind !== 'unlock');
    n.order = 0;
  }

  // ---- drift signals
  const D = G.drift;
  D.missing = missing;
  D.unreachable = [...G.nodes.values()].filter((n) => !n.reachable && !(n.name === 'noop')).map((n) => ({ node: n.id, why: n.entries.length ? n.entries.map((e) => e.why).filter(Boolean).join('; ') : 'no trigger, start, go or call leads here' }));
  D.blocked = [];
  for (const n of G.nodes.values()) for (const e of n.entries) if (!e.ok && n.reachable) D.blocked.push({ node: n.id, trigger: e.trigger, why: e.why });
  D.readNeverSet = [...G.flags.values()].filter((F) => F.read.length && !isSet(F.name) && !['place', 'period', 'day'].includes(F.name)).map((F) => ({ flag: F.name, read: F.read }));
  D.setNeverRead = [...G.flags.values()].filter((F) => !F.read.length && F.set.some((s) => s.how !== 'unset') && !/^(know_|typed_|met_|rem_|fact_|bought_)/.test(F.name) && F.name !== 'period').map((F) => ({ flag: F.name, set: F.set }));
  // dead ends: a reachable node that leaves the player with an empty goal line and nothing it does opens anything
  D.deadEnds = [];
  for (const n of G.nodes.values()) {
    if (!n.reachable || n.exit || n.side || n.firesEvents) continue;
    const lastGoal = n.goals.length ? n.goals[n.goals.length - 1] : null;
    const outs = G.edges.filter((e) => e.from === n.id);
    if (lastGoal === '' && !outs.length) D.deadEnds.push({ node: n.id, why: 'clears the goal line, and nothing it sets opens a next step' });
  }
  for (const P of G.places) {
    const exits = P.nodes.map((id) => G.nodes.get(id)).filter((n) => n.exit && n.reachable);
    P.exits = exits.map((n) => n.id);
    if (!exits.length) D.deadEnds.push({ node: P.start ? `${P.id}:${P.start}` : P.id, why: `no reachable node in ${P.id} moves on (next) or ends the day (end)` });
    if (P.next && !exits.some((n) => n.exit === 'next')) D.deadEnds.push({ node: P.id, why: `places/definitions.js says ${P.id} leads to ${P.next}, but no reachable node runs next` });
  }
  D.badConds = G.places.flatMap((P) => P.checks.filter((c) => c.bad).map((c) => ({ place: P.id, where: c.where, cond: c.cond, why: c.bad })));
  for (const n of G.nodes.values()) for (const r of n.reads) try { parseCond(r.cond); } catch (e) { D.badConds.push({ place: n.place, where: n.id, cond: r.cond, why: e.message }); }
  for (const P of G.places) for (const c of P.checks) if (!c.bad) try { parseCond(c.cond); } catch (e) { D.badConds.push({ place: P.id, where: c.where, cond: c.cond, why: e.message }); }

  // ---- rank inside each place (for list order): start first, then by shortest path from any entry
  const dist = new Map();
  const q = [];
  for (const n of G.nodes.values()) if (n.entries.some((e) => e.start)) { dist.set(n.id, 0); q.push(n.id); }
  const allOut = new Map();
  for (const e of G.edges) (allOut.get(e.from) || allOut.set(e.from, []).get(e.from)).push(e.to);
  while (q.length) { const id = q.shift(); for (const t of allOut.get(id) || []) if (!dist.has(t)) { dist.set(t, dist.get(id) + 1); q.push(t); } }
  for (const n of G.nodes.values()) n.order = dist.has(n.id) ? dist.get(n.id) : 999;
  return G;
}
function safeParse(c) { try { return parseCond(c); } catch { return null; } }

// ------------------------------------------------------------------ loading
// Browser: import the story files and read the engine files from the served repo (ROOT is the repo root URL).
export async function loadStoryGraph(ROOT) {
  const base = new URL(ROOT, location.href);
  const mods = {}, files = {}, errors = [];
  await Promise.all([
    ...STORY_FILES.map(async (p) => {
      const path = `game3d/story/${p}.js`;
      try { mods[p] = (await import(new URL(path, base).href + '?t=' + Date.now())).default; if (!mods[p]) throw new Error('no default export'); }
      catch (e) { errors.push(`${path}: ${e.message}`); delete mods[p]; }
      try { const r = await fetch(new URL(path, base), { cache: 'no-cache' }); if (r.ok) files[path] = await r.text(); } catch (_) { /* line numbers only */ }
    }),
  ]);
  return buildGraph({ mods, files, errors });
}
