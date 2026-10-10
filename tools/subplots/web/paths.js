// One reading path through a scene. At each choice the author picks an option and the scene continues below with
// that option's beats: an option that goes on to another part of the same scene brings that part's beats in, an
// option that only remembers something carries on, and the "if" branches after it follow from what was picked.
// Branches nothing picked decides (who plays, say) have their own switch. No DOM here, so the tests can import it.
import { kindOf } from './model.js';
import { parseCondition } from './conditions.js';

// Parts of the same scene this one reaches through choice options (`go` or `call`), in order of first appearance.
export function choiceTargets(steps, out = []) {
  for (const s of steps || []) {
    if (!s || typeof s !== 'object') continue;
    if (Array.isArray(s.choice)) for (const o of s.choice) for (const t of [o.go, o.call]) if (t && !out.includes(t)) out.push(t);
    for (const k of ['then', 'else', 'sequence']) if (Array.isArray(s[k])) choiceTargets(s[k], out);
  }
  return out;
}

// The flags an option sets: 'flag', { flag: value } or a list of names.
export function flagsSet(option) {
  const v = option?.set;
  if (!v) return {};
  if (typeof v === 'string') return { [v]: true };
  if (Array.isArray(v)) return Object.fromEntries(v.map(k => [k, true]));
  return { ...v };
}

// What identifies a choice across edits: where its options lead, or their words when they lead nowhere.
export function choiceKey(step) {
  return JSON.stringify((step.choice || []).map(o => o.go || o.call || (o.set ? JSON.stringify(o.set) : o.text || '')));
}

// true, false, or undefined when the known values don't decide it.
export function decide(source, known) {
  return evaluate(parseCondition(source), known);
}
function evaluate(n, known) {
  if (!n || n.preserved !== undefined) return undefined;
  if (n.not) { const v = evaluate(n.not, known); return v === undefined ? undefined : !v; }
  if (n.all || n.any) {
    const vs = (n.all || n.any).map(x => evaluate(x, known));
    if (n.all) return vs.includes(false) ? false : vs.every(v => v === true) ? true : undefined;
    return vs.includes(true) ? true : vs.every(v => v === false) ? false : undefined;
  }
  if (!known.has(n.field)) return undefined;
  const v = known.get(n.field);
  switch (n.op) {
    case 'true': return !!v;
    case 'false': return !v;
    case '==': return v === n.value || (v === true && n.value === 1);
    case '!=': return !(v === n.value);
    case '>=': return v >= n.value;
    case '<=': return v <= n.value;
    case '>': return v > n.value;
    case '<': return v < n.value;
    default: return undefined;
  }
}

// The side shown until the author switches it. Who plays: the game starts as Eric, so a branch on mc_<name>
// shows Eric's version. A guard that only stops the scene ({ end: true }) shows the scene going on.
const stops = list => Array.isArray(list) && list.length > 0 && list.every(s => s && typeof s === 'object' && (s.end || s.action === 'end'));
const defaultArm = step => {
  const condition = step.if;
  const v = decide(condition, new Map([['mc_eric', true]]));
  if (v !== undefined) return v ? 'then' : 'else';
  const m = /^\s*(!?)\s*(mc_\w+)\s*$/.exec(condition || '');
  if (m && m[2] !== 'mc_eric') return m[1] ? 'then' : 'else';
  if (stops(step.then) && !stops(step.else)) return 'else';
  return 'then';
};

// The path through `steps` as a tree for the timeline. Every node keeps the beat's address (path), so editing works
// the same inside a branch. `docs(node)` returns another part of the scene ({ steps }) or null; `picks` maps a choice
// key to the option index; `arms` maps a condition to 'then' or 'else'.
export function readingPath(steps, { docs = () => null, picks = new Map(), arms = new Map(), home = '' } = {}) {
  const ctx = { known: new Map(), why: new Map(), shown: new Set([home]), docs, picks, arms };
  return walk(steps || [], [], ctx);
}

function walk(steps, base, ctx) {
  const out = [];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i], path = [...base, i], kind = kindOf(step);
    if (kind === 'group') {
      out.push({ type: 'group', step, path, items: walk(step.sequence, [...path, 'sequence'], ctx) });
      continue;
    }
    if (kind === 'branch') {
      const decided = decide(step.if, ctx.known);
      const arm = decided !== undefined ? (decided ? 'then' : 'else') : ctx.arms.get(step.if) || defaultArm(step);
      const reason = decided !== undefined ? reasonFor(step.if, ctx) : '';
      const list = Array.isArray(step[arm]) ? step[arm] : [];
      out.push({ type: 'branch', step, path, arm, locked: decided !== undefined, reason, hasElse: Array.isArray(step.else), items: walk(list, [...path, arm], ctx) });
      continue;
    }
    if (kind !== 'choice') { out.push({ type: 'beat', step, path }); continue; }
    const key = choiceKey(step);
    const n = step.choice.length;
    const pick = Math.min(Math.max(0, ctx.picks.get(key) ?? 0), Math.max(0, n - 1));
    const option = step.choice[pick] || {};
    // the options not picked count as "not set", unless the picked one sets the same flag
    step.choice.forEach((o, j) => {
      if (j === pick) return;
      for (const f of Object.keys(flagsSet(o))) if (!ctx.known.has(f)) { ctx.known.set(f, false); ctx.why.set(f, option.text || ''); }
    });
    for (const [f, v] of Object.entries(flagsSet(option))) { ctx.known.set(f, v); ctx.why.set(f, option.text || ''); }
    out.push({ type: 'choice', step, path, key, pick });
    const target = option.go || option.call;
    if (!target) continue;
    const doc = ctx.docs(target);
    if (!doc || ctx.shown.has(target)) {
      out.push({ type: 'elsewhere', node: target, option: option.text || '', shownAbove: !!doc });
      if (option.go) { out.push(...rest(steps, i, base)); break; }
      continue;
    }
    ctx.shown.add(target);
    out.push({ type: 'section', node: target, option: option.text || '', call: !option.go, items: walk(doc.steps || [], ['@' + target], ctx) });
    if (option.go) { out.push(...rest(steps, i, base)); break; }
  }
  return out;
}

// Beats after a choice whose picked option goes elsewhere: the game skips them on this path.
function rest(steps, i, base) {
  const left = steps.length - i - 1;
  return left > 0 ? [{ type: 'skipped', count: left, path: [...base, i + 1] }] : [];
}

function reasonFor(condition, ctx) {
  const names = [];
  const tree = parseCondition(condition);
  const visit = n => {
    if (!n) return;
    if (n.field && ctx.why.has(n.field)) names.push(ctx.why.get(n.field));
    (n.all || n.any || []).forEach(visit);
    visit(n.not);
  };
  visit(tree);
  return [...new Set(names.filter(Boolean))].join(', ');
}

// The beats the player sees along the path, in order, for the preview.
export function flatten(items, out = []) {
  for (const it of items) {
    if (it.type === 'beat' || it.type === 'choice') out.push(it);
    else if (it.items) flatten(it.items, out);
  }
  return out;
}

// The picks along the path, for the path bar: [{ path, label }].
export function pathSummary(items, out = []) {
  for (const it of items) {
    if (it.type === 'choice') out.push({ path: it.path, label: it.step.choice[it.pick]?.text || '…' });
    if (it.items) pathSummary(it.items, out);
  }
  return out;
}
