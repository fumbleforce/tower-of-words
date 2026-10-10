// The open scene, its edit history (undo and redo) and the selection. One place for state, so every panel
// reads the same scene and every change goes through edit().
const { setTimeout, clearTimeout } = globalThis;
import { listAt, pathOfList, isInside } from './model.js';

export const S = {
  authoring: { characters: [], places: [], variables: [], events: [], deliveries: [], words: [], nodes: [] },
  catalog: [],
  scene: null, // what the adapter returned, edited in place
  saved: '', // the editable parts as last saved, to tell when there are changes
  linked: {}, // other parts of the same scene that its choices lead to, by node: { scene, saved }
  picks: new Map(), // the reading path: choice key -> option index (paths.js)
  arms: new Map(), // condition -> 'then' | 'else', for branches no pick decides
  selected: null, // path of the selected beat
  undo: [],
  redo: [],
  listeners: new Set(),
};

const editable = scene => JSON.stringify({
  steps: scene.steps, raw: scene.raw, entries: scene.entries, placement: scene.placement, metadata: scene.metadata,
});

// Every part of the scene the editor has open: the scene itself ('') and the parts its choices lead to.
export const docs = () => (S.scene ? [{ node: '', scene: S.scene, saved: S.saved }, ...Object.entries(S.linked).map(([node, d]) => ({ node, ...d }))] : []);
export const dirtyDocs = () => docs().filter(d => editable(d.scene) !== d.saved);
export const isDirty = () => dirtyDocs().length > 0;

// A beat in another part has a path that starts with '@node'.
const part = path => (typeof path?.[0] === 'string' && path[0].startsWith('@') ? path[0].slice(1) : '');
export const docFor = path => (part(path) ? S.linked[part(path)]?.scene : S.scene);
const inner = path => (part(path) ? path.slice(1) : path);
export const listOf = path => listAt(docFor(path).steps, inner(path));
export const stepOf = path => {
  const doc = path && docFor(path);
  if (!doc || !Array.isArray(doc.steps)) return undefined;
  return inner(path).reduce((x, k) => x?.[k], doc.steps);
};
// Move the beat at `from` to sit before index `to` in the list at `toList`, in the same part or another one.
// Returns the beat's new path. Refuses to drop a branch into itself.
export function moveBeat(from, toList, to) {
  if (isInside([...toList, 0], from)) return from;
  const dest = listOf([...toList, 0]), source = listOf(from), index = from.at(-1);
  const [step] = source.splice(index, 1);
  const at = dest === source && index < to ? to - 1 : to;
  dest.splice(at, 0, step);
  const where = part(toList);
  return [...(where ? ['@' + where] : []), ...pathOfList(docFor(toList).steps, dest), at];
}
const snapshot = () => JSON.stringify({ main: editable(S.scene), linked: Object.fromEntries(Object.entries(S.linked).map(([n, d]) => [n, editable(d.scene)])) });

// Another part of the scene, read from the adapter.
export function addLinked(node, scene) {
  scene.metadata ||= {};
  scene.entries ||= [];
  S.linked[node] = { scene, saved: editable(scene) };
}

export const recipe = () => !!S.scene?.recipe;

export function load(scene) {
  scene.metadata ||= {};
  scene.entries ||= [];
  S.scene = scene;
  S.saved = editable(scene);
  S.linked = {};
  S.picks = new Map();
  S.arms = new Map();
  S.undo = [];
  S.redo = [];
  S.selected = null;
  emit('load');
}

// A part was saved: `node` is '' for the scene itself. The other parts keep their edits.
export function markSaved(scene, node = '') {
  scene.metadata ||= {};
  scene.entries ||= [];
  if (node) S.linked[node] = { scene, saved: editable(scene) };
  else { S.scene = scene; S.saved = editable(scene); }
  emit('saved');
}
// The source file changed under a part when another part of the same file was saved: take the new revision
// if that part itself is unchanged on disk.
export function refreshRevision(node, fresh) {
  const d = node ? S.linked[node] : { scene: S.scene, saved: S.saved };
  if (!d) return false;
  const before = JSON.parse(d.saved);
  if (JSON.stringify(fresh.steps) !== JSON.stringify(before.steps)) return false;
  d.scene.revision = fresh.revision;
  d.scene.raw = fresh.raw;
  if (fresh.images) d.scene.images = fresh.images;
  // raw is part of what counts as saved
  const savedNow = editable({ ...before, raw: fresh.raw });
  if (node) d.saved = savedNow; else S.saved = savedNow;
  return true;
}

export function setPick(key, index) {
  S.picks.set(key, index);
  emit('path');
}
export function setArm(condition, arm) {
  S.arms.set(condition, arm);
  emit('path');
}

let lastKey = '', lastAt = 0;
// Change the scene. `key` groups fast edits of one field (typing) into one undo step.
// `quiet` skips re-rendering the timeline (the field being typed in already shows the new text).
export function edit(change, { key = '', quiet = false } = {}) {
  if (!S.scene) return;
  const now = Date.now();
  if (!key || key !== lastKey || now - lastAt > 1200) {
    S.undo.push(snapshot());
    if (S.undo.length > 300) S.undo.shift();
    S.redo = [];
  }
  lastKey = key;
  lastAt = now;
  change(S.scene);
  emit(quiet ? 'typing' : 'edit');
}

// Record the state before an outside change (the composer edits the scene itself).
export function checkpoint() {
  S.undo.push(snapshot());
  S.redo = [];
  lastKey = '';
}

function restore(text) {
  const { main, linked } = JSON.parse(text);
  Object.assign(S.scene, JSON.parse(main));
  for (const [n, d] of Object.entries(linked || {})) if (S.linked[n]) Object.assign(S.linked[n].scene, JSON.parse(d));
  lastKey = '';
}
export function undo() {
  if (!S.undo.length) return;
  S.redo.push(snapshot());
  restore(S.undo.pop());
  emit('edit');
}
export function redo() {
  if (!S.redo.length) return;
  S.undo.push(snapshot());
  restore(S.redo.pop());
  emit('edit');
}

export function select(path, { tab } = {}) {
  S.selected = path;
  emit('select', { tab });
}

export function on(fn) {
  S.listeners.add(fn);
}
function emit(type, detail = {}) {
  for (const fn of S.listeners) fn(type, detail);
}

// Save a draft to the server a few seconds after the last change, so a closed tab loses nothing.
let draftTimer = null;
export function scheduleDraft(save) {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(save, 2500);
}
export function cancelDraft() {
  clearTimeout(draftTimer);
}
