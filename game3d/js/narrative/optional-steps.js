// What an optional local plugin (plugins.js) added to a story, so private mode can be switched off and on mid-game
// without a reload and saves stay valid either way. Nothing here names a scene.
//
// A plugin adds whole nodes (optional nodes) and may insert steps into a public node or rewrite one of its conditions.
// recordInstall wraps an install: it notes each public node as it was (its fingerprint and its steps) and marks the
// nodes the install made. The runner then:
//   - with private mode off, starts no optional node and cuts one that is running (Runner.setOptional)
//   - saves each frame with `optional` (the node is a plugin's), `pub` (the fingerprint of the public node as the public
//     story wrote it) and `inserted` (the plugin's step indices in it), annotateFrame
//   - on Continue, fits a saved scene to the story as it is now loaded (adaptExecution): with private mode off a
//     plugin's frames are dropped, and a public node's cursors and done keys move past the steps one mode has and the
//     other hasn't. A save made in either mode resumes in either mode.
import { nodeFingerprint } from './checkpoint.js';

const optional = new WeakSet(); // node arrays a plugin made
const pristine = new WeakMap(); // public node array -> { pub, items: Set of its own steps }

export const isOptionalSteps = (steps) => !!steps && optional.has(steps);

// Running frames (Runner.run): track gives the promise that ends a frame early, cut ends every frame from the first
// optional one up (the scene that called it carries on after the call), and a frame no longer running stops at its
// next step (Runner.steps).
const cuts = new WeakMap();
export const track = (frame) => new Promise((end) => cuts.set(frame, end));
export const untrack = (frame) => cuts.delete(frame);
export const running = (frame) => cuts.has(frame);
export function cut(frames, story) {
  const at = frames.findIndex((f) => isOptionalSteps(story?.nodes?.[f.node]));
  for (const f of at < 0 ? [] : frames.slice(at)) cuts.get(f)?.();
  return at >= 0;
}

// A node's fingerprint as private mode off shows it. A plugin may make a public line read differently while private
// mode is on (a getter on the step); for that moment the setting reads off, so the save compares the public words.
function publicPrint(steps) {
  const s = globalThis.__settings;
  if (!s?.privateMode) return nodeFingerprint(steps);
  s.privateMode = false;
  try {
    return nodeFingerprint(steps);
  } finally {
    s.privateMode = true;
  }
}

// before: the story's node arrays before an install, after: mark the nodes it made. A plugin adds its nodes under new
// names; one that replaced a public node would play in place of the public one with private mode off.
export function recordInstall(story) {
  const before = new Map();
  for (const [name, steps] of Object.entries(story?.nodes || {})) {
    if (!Array.isArray(steps)) continue;
    before.set(name, steps);
    if (!pristine.has(steps) && !optional.has(steps))
      pristine.set(steps, { pub: publicPrint(steps), items: new Set(steps) });
  }
  return () => {
    for (const [name, steps] of Object.entries(story?.nodes || {}))
      if (Array.isArray(steps) && !before.has(name) && !pristine.has(steps)) optional.add(steps);
  };
}

// the indices of a plugin's steps in a public node, and its public fingerprint
function shape(steps) {
  const p = pristine.get(steps);
  if (!p) return { pub: publicPrint(steps), inserted: [] };
  const inserted = [];
  steps.forEach((s, i) => p.items.has(s) || inserted.push(i));
  return { pub: p.pub, inserted };
}

// a frame without the marks below, as the runner keeps it
function bare(frame) {
  const out = { ...frame };
  for (const k of ['optional', 'pub', 'inserted']) delete out[k];
  return out;
}
export const annotate = (frames, story) => frames.map((f) => annotateFrame(f, story?.nodes?.[f.node]));
export function annotateFrame(frame, steps) {
  const out = bare(frame);
  if (!steps) return out;
  if (optional.has(steps)) return { ...out, optional: true };
  const { pub, inserted } = shape(steps);
  return pub === frame.fingerprint && !inserted.length ? out : { ...out, pub, inserted };
}

// top-level index maps between a node with some steps inserted (at) and without them
const toPub = (i, at) => (at.includes(i) ? -1 : i - at.filter((j) => j < i).length);
function fromPub(i, at) {
  let n = i;
  for (const j of [...at].sort((a, b) => a - b)) if (j <= n) n++;
  return n;
}
// a key is JSON.stringify([...path, index]) with an optional suffix; its first number is the top-level step
function moveKey(key, map) {
  const m = /^\[(\d+)(.*)$/.exec(key);
  if (!m) return key;
  const i = map(+m[1]);
  return i < 0 ? null : `[${i}${m[2]}`;
}
const moveObject = (o, map) =>
  Object.fromEntries(
    Object.entries(o || {})
      .map(([k, v]) => [moveKey(k, map), v])
      .filter(([k]) => k !== null),
  );

function moveFrame(frame, map) {
  const cursors = [];
  for (const c of frame.cursors || []) {
    if (c.path.length) {
      const top = map(c.path[0]);
      if (top < 0) continue;
      cursors.push({ ...c, path: [top, ...c.path.slice(1)] });
    } else {
      const i = map(c.index);
      // on a plugin's step: carry on at the public step after it
      cursors.push(i < 0 ? { ...c, index: map.next(c.index), phase: 'step' } : { ...c, index: i });
    }
  }
  return {
    ...frame,
    cursors,
    done: (frame.done || []).map((k) => moveKey(k, map)).filter((k) => k !== null),
    branches: moveObject(frame.branches, map),
    choices: moveObject(frame.choices, map),
    worldAfter: moveObject(frame.worldAfter, map),
  };
}

// The saved execution fitted to the story as loaded now; null when nothing of it is left to resume
export function adaptExecution(execution, story, privateOff) {
  if (!execution || !Array.isArray(execution.frames)) return execution;
  let frames = execution.frames;
  if (privateOff) {
    const at = frames.findIndex((f) => f?.optional || isOptionalSteps(story?.nodes?.[f?.node]));
    if (at === 0) return null;
    if (at > 0) frames = frames.slice(0, at);
  }
  frames = frames.map((frame) => {
    const steps = story?.nodes?.[frame?.node];
    if (!Array.isArray(steps) || optional.has(steps)) return frame;
    const was = frame.inserted || [];
    const now = shape(steps);
    if ((frame.pub || frame.fingerprint) !== now.pub) return frame; // the public story changed: readCheckpoint refuses it
    const fingerprint = nodeFingerprint(steps);
    if (JSON.stringify(was) === JSON.stringify(now.inserted)) return { ...bare(frame), fingerprint };
    const map = (i) => {
      const p = toPub(i, was);
      return p < 0 ? -1 : fromPub(p, now.inserted);
    };
    map.next = (i) => fromPub(i - was.filter((j) => j < i).length, now.inserted); // the public step after a plugin's
    return { ...moveFrame(bare(frame), map), fingerprint };
  });
  return { ...execution, frames };
}
