// The ways out of a place that are open now (notes/minimap-plan.md; docs/game/systems.md, Fast travel): each of the
// place's public `zone:` and `talk:` triggers, resolved with the current flags the way the runner resolves them
// (runner.js entry), and the trip its node makes. Pure: a story, a condition function and the day in, ways out.
//
// A way is `scene` when walking it plays more than the walk: its node does anything besides the one trip (lines, a
// `next` move, a lift opening), its transition has lines (story/transitions.js), or it is the lift to or from B2.
// Fast travel only uses ways that are just a walk. Triggers a private plugin adds never count: lifecycle.js keeps
// the story as the public files wrote it (keepPublic) before a plugin is installed.
import { NEXT, canTravel } from '../places/definitions.js';

const LIFT = 'office'; // B2: reached and left only by the lift
const EXIT = /^(zone|talk):/;

// the story as its files wrote it: the triggers and nodes, copied before a private plugin adds its own
export function keepPublic(story) {
  if (!story || story._public) return;
  const nodes = {};
  for (const [k, v] of Object.entries(story.nodes || {})) nodes[k] = Array.isArray(v) ? [...v] : v;
  Object.defineProperty(story, '_public', { value: { on: { ...(story.on || {}) }, nodes }, enumerable: false });
}
const publicOf = (story) => story?._public || story || {};

// the node a trigger runs now, as runner.entry resolves it (peek: a `once` already used is skipped)
function resolve(list, key, cond, onceDone) {
  for (const e of Array.isArray(list) ? list : [list]) {
    const t = typeof e === 'string' ? { node: e } : e;
    if (!t || !t.node) continue;
    if (t.once && onceDone?.has(key + '>' + t.node)) continue;
    if (!cond(t.if)) continue;
    return t.node;
  }
  return null;
}

// the steps a node runs with these flags: `if` steps opened into their branch, `go` followed once
function flatten(steps, cond, nodes, depth = 0) {
  const out = [];
  for (const s of steps || []) {
    if (s && typeof s === 'object' && 'if' in s && (s.then || s.else)) {
      out.push(...flatten(cond(s.if) ? s.then : s.else, cond, nodes, depth));
    } else if (s && typeof s === 'object' && s.go && depth < 3) {
      out.push(...flatten(nodes[s.go], cond, nodes, depth + 1));
    } else out.push(s);
  }
  return out;
}

const hasLines = (slot) => !!slot && ['walk', 'ride', 'arrive'].some((k) => slot[k]?.length);
export const isLift = (from, to) => from === LIFT || to === LIFT;

// The ways out of `from` now: [{ to, key, node, scene }], one per target (a plain walk wins over a scene).
// opts: cond (condition string -> bool), day, onceDone (the runner's used `once` triggers, for the place he's in),
// transitions (story/transitions.js, for the lines a trip carries).
export function waysOut(from, story, { cond, day = 1, onceDone = null, transitions = null } = {}) {
  const { on = {}, nodes = {} } = publicOf(story);
  const best = new Map();
  for (const [key, list] of Object.entries(on)) {
    if (!EXIT.test(key)) continue;
    const node = resolve(list, key, cond, onceDone);
    if (!node || !nodes[node]) continue;
    const steps = flatten(nodes[node], cond, nodes);
    const moves = steps.filter((s) => s && (s.do === 'trip' || s.do === 'next'));
    if (moves.length !== 1) continue;
    const m = moves[0];
    const to = m.do === 'next' ? NEXT[from] : m.to;
    if (!to || !canTravel(from, to, day)) continue;
    const scene =
      m.do === 'next' || steps.length > 1 || isLift(from, to) || hasLines(transitions?.[`${from}_to_${to}`]);
    const prev = best.get(to);
    if (!prev || (prev.scene && !scene)) best.set(to, { to, key, node, scene });
  }
  return [...best.values()];
}

// every place's ways out now: { place: [way, ...] } for the places given (today's set)
export function waysGraph(stories, places, opts) {
  const g = {};
  for (const p of places) g[p] = stories[p] ? waysOut(p, stories[p], { ...opts, onceDone: opts.onceFor?.(p) }) : [];
  return g;
}
