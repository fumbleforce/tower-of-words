// The open scene, its edit history (undo and redo) and the selection. One place for state, so every panel
// reads the same scene and every change goes through edit().
const { setTimeout, clearTimeout } = globalThis;

export const S = {
  authoring: { characters: [], places: [], variables: [], events: [], deliveries: [], words: [], nodes: [] },
  catalog: [],
  scene: null, // what the adapter returned, edited in place
  saved: '', // the editable parts as last saved, to tell when there are changes
  selected: null, // path of the selected beat
  undo: [],
  redo: [],
  listeners: new Set(),
};

const editable = scene => JSON.stringify({
  steps: scene.steps, raw: scene.raw, entries: scene.entries, placement: scene.placement, metadata: scene.metadata,
});

export const isDirty = () => !!S.scene && editable(S.scene) !== S.saved;
export const recipe = () => !!S.scene?.recipe;

export function load(scene) {
  scene.metadata ||= {};
  scene.entries ||= [];
  S.scene = scene;
  S.saved = editable(scene);
  S.undo = [];
  S.redo = [];
  S.selected = null;
  emit('load');
}

export function markSaved(scene) {
  const keepSelection = S.selected;
  scene.metadata ||= {};
  scene.entries ||= [];
  S.scene = scene;
  S.saved = editable(scene);
  S.selected = keepSelection;
  emit('saved');
}

let lastKey = '', lastAt = 0;
// Change the scene. `key` groups fast edits of one field (typing) into one undo step.
// `quiet` skips re-rendering the timeline (the field being typed in already shows the new text).
export function edit(change, { key = '', quiet = false } = {}) {
  if (!S.scene) return;
  const now = Date.now();
  if (!key || key !== lastKey || now - lastAt > 1200) {
    S.undo.push(editable(S.scene));
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
  S.undo.push(editable(S.scene));
  S.redo = [];
  lastKey = '';
}

function restore(snapshot) {
  Object.assign(S.scene, JSON.parse(snapshot));
  lastKey = '';
}
export function undo() {
  if (!S.undo.length) return;
  S.redo.push(editable(S.scene));
  restore(S.undo.pop());
  emit('edit');
}
export function redo() {
  if (!S.redo.length) return;
  S.undo.push(editable(S.scene));
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
