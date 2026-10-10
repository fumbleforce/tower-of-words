// The right column: details of the selected beat, and the scene's placement, notes and revisions.
// Every value with a fixed set of answers is a picker fed by the bible data, never free text.
const { document } = globalThis;
import { esc, api } from './common.js';
import { S, edit, select, recipe, stepOf, listOf, setPick } from './store.js';
import { kindOf, KIND_LABEL, speakerOf, describe } from './model.js';
import { choiceKey } from './paths.js';
import { personName, person, nodeTitle } from './names.js';
import { conditionEditor, selectHTML } from './conditions.js';
import { setSpeaker } from './timeline.js';

function labelled(host, label, control, hint = '') {
  const el = document.createElement('label');
  el.className = 'field';
  el.innerHTML = `<span>${esc(label)}</span>`;
  el.append(control);
  if (hint) el.insertAdjacentHTML('beforeend', `<small>${esc(hint)}</small>`);
  host.append(el);
  return control;
}
function picker(options, value, change, empty) {
  const s = document.createElement('select');
  s.innerHTML = selectHTML(options, value, empty);
  s.onchange = () => change(s.value);
  return s;
}
function number(value, change, { min = 0, max = 100, step = 1 } = {}) {
  const i = document.createElement('input');
  Object.assign(i, { type: 'number', min, max, step, value });
  i.onchange = () => change(Number(i.value));
  return i;
}

// Other parts of the same scene file, for jumps and choice destinations.
function destinations() {
  const id = S.scene.id;
  const prefix = id.startsWith('public:') ? id.split('#')[0] + '#' : id.slice(0, id.lastIndexOf(':') + 1);
  return S.catalog.filter(r => r.id.startsWith(prefix)).map(r => ({ value: r.node, label: nodeTitle(r.node) }));
}

const castOptions = () => {
  const out = S.authoring.characters.map(c => ({ value: c.id, label: c.name }));
  for (const id of Object.keys(S.scene.speakers || {})) if (!out.some(o => o.value === id)) out.push({ value: id, label: personName(id) });
  return out;
};

export function renderBeatTab() {
  const tab = document.getElementById('tabBeat');
  tab.replaceChildren();
  if (!S.scene) { tab.innerHTML = '<p class="quiet pad">Open a scene first.</p>'; return; }
  const path = S.selected, step = path ? stepOf(path) : undefined;
  if (step === undefined) {
    tab.innerHTML = `<p class="quiet">Select a beat to see its details.</p>
      <dl class="keys"><dt>Ctrl Z, Ctrl Shift Z</dt><dd>Undo, redo</dd><dt>Ctrl S</dt><dd>Save</dd><dt>Alt ↑ ↓</dt><dd>Move the selected beat</dd><dt>Ctrl Enter</dt><dd>New line after the selected one</dd><dt>P</dt><dd>Preview from the selected beat</dd></dl>`;
    return;
  }
  const kind = kindOf(step);
  tab.insertAdjacentHTML('beforeend', `<h2 class="tab-title">${esc(KIND_LABEL[kind])} ${esc(path.filter(x => typeof x === 'number').map(x => x + 1).join('.'))}</h2>`);
  const set = (fn, opts) => edit(() => fn(stepOf(path)), opts);
  if (kind === 'line') {
    labelled(tab, 'Speaker', picker(castOptions(), speakerOf(step), v => setSpeaker(path, v), recipe() ? undefined : 'Narration'));
    const deliveries = (S.authoring.deliveries || []).map(d => ({ value: d.id, label: d.label }));
    const canDeliver = typeof step === 'object' && step.deliveryEditable !== false;
    if (canDeliver) labelled(tab, 'Delivery', picker(deliveries, step.emo || '', v => set(s => { if (v) s.emo = v; else delete s.emo; })), 'How the voice reads the line');
    const faces = person(speakerOf(step))?.faces || [];
    if (!recipe() && typeof step === 'object' && faces.length) labelled(tab, 'Face', picker(faces.map(f => ({ value: f.id, label: f.label })), step.face || '', v => set(s => { if (v) s.face = v; else delete s.face; }), 'Default'), 'The portrait shown with the line');
    if (typeof step === 'string') tab.insertAdjacentHTML('beforeend', '<p class="quiet">Pick a delivery or face and the line keeps them.</p>');
    if (typeof step === 'string') {
      const b = document.createElement('button');
      b.className = 'ghost small';
      b.textContent = 'Add delivery and face';
      b.onclick = () => edit(() => { const l = listOf(path); const m = /^(\w+): ([\s\S]*)$/.exec(l[path.at(-1)]); l[path.at(-1)] = { say: m[1], text: m[2] }; });
      tab.append(b);
    }
    if (step.voice) tab.insertAdjacentHTML('beforeend', '<p class="quiet">This line has its own recorded clip. Changing the words drops the clip until a new take is made.</p>');
  } else if (kind === 'narration') {
    tab.insertAdjacentHTML('beforeend', '<p class="quiet">Narration is for what the player can’t see and needs to know. Pick a speaker on the beat to turn it into a line.</p>');
  } else if (kind === 'choice') {
    step.choice.forEach((c, j) => {
      const box = document.createElement('fieldset');
      box.className = 'option-box';
      box.innerHTML = `<legend>Option ${j + 1}</legend>`;
      const follow = document.createElement('button');
      follow.className = 'ghost small follow';
      const picked = (S.picks.get(choiceKey(step)) ?? 0) === j;
      follow.textContent = picked ? 'The timeline follows this option' : 'Follow this option in the timeline';
      follow.disabled = picked;
      follow.onclick = () => setPick(choiceKey(step), j);
      box.append(follow);
      const text = document.createElement('input');
      text.value = c.text || '';
      text.oninput = () => set(s => { s.choice[j].text = text.value; }, { key: 'opt' + j, quiet: true });
      labelled(box, 'Says or does', text);
      labelled(box, 'Then', picker(destinations(), c.go || '', v => set(s => { if (v) s.choice[j].go = v; else delete s.choice[j].go; }), 'Carry on with this scene'));
      const cond = document.createElement('div');
      cond.className = 'cond-box';
      cond.innerHTML = '<span class="field-label">Only offered when</span>';
      const inner = document.createElement('div');
      cond.append(inner);
      conditionEditor(inner, c.if || '', S.authoring.variables, v => set(s => { if (v) s.choice[j].if = v; else delete s.choice[j].if; }));
      box.append(cond);
      const rm = document.createElement('button');
      rm.className = 'ghost small danger';
      rm.textContent = 'Remove option';
      rm.onclick = () => set(s => s.choice.splice(j, 1));
      box.append(rm);
      tab.append(box);
    });
  } else if (kind === 'branch') {
    const cond = document.createElement('div');
    cond.className = 'cond-box';
    cond.innerHTML = '<span class="field-label">Play “Then” when</span>';
    const inner = document.createElement('div');
    cond.append(inner);
    conditionEditor(inner, step.if || '', S.authoring.variables, v => set(s => { s.if = v; }));
    tab.append(cond);
  } else if (kind === 'jump' && (step.go || step.action === 'go')) {
    labelled(tab, 'Goes on to', picker(destinations(), step.go || step.destination, v => set(s => { if (s.action === 'go') s.destination = v; else s.go = v; })));
  } else if (kind === 'picture') {
    shot(tab, step, set);
  } else {
    tab.insertAdjacentHTML('beforeend', `<p>${esc(describe(step, personName, nodeTitle))}</p><p class="quiet">This beat is kept exactly as it is written. You can move it or delete it.</p>`);
  }
}

function shot(tab, step, set) {
  const s = step.shot || {};
  const upd = (k, v) => set(x => { x.shot = { ...x.shot, [k]: v }; });
  const editable = !step.$recipe || /^(\.\.\.)?(gap|shot)\(/.test(step.$recipe);
  if (!editable) { tab.insertAdjacentHTML('beforeend', '<p class="quiet">This picture’s framing comes from the scene’s own settings and is kept as it is.</p>'); return; }
  labelled(tab, 'Framing', picker([{ value: 'cover', label: 'Fill the screen' }, { value: 'contain', label: 'Show the whole picture' }], s.fit || 'cover', v => upd('fit', v)));
  const spots = [['50% 50%', 'Centre'], ['50% 20%', 'Top'], ['50% 80%', 'Bottom'], ['25% 50%', 'Left'], ['75% 50%', 'Right']];
  const focus = spots.some(([v]) => v === (s.focus || '50% 50%')) ? s.focus || '50% 50%' : s.focus;
  labelled(tab, 'Keep in view', picker(spots.map(([value, label]) => ({ value, label })), focus, v => upd('focus', v)));
  labelled(tab, 'Fade in, seconds', number((s.fade ?? 700) / 1000, v => upd('fade', Math.round(v * 1000)), { max: 10, step: 0.1 }));
  labelled(tab, 'Slow zoom, %', number(Math.round((s.push ?? 0) * 100), v => upd('push', v / 100), { max: 50 }));
  const cue = document.createElement('input');
  cue.value = s.cue || '';
  cue.placeholder = 'What the player hears';
  cue.oninput = () => set(x => { x.shot = { ...x.shot, cue: cue.value }; }, { key: 'cue', quiet: true });
  labelled(tab, 'Sound', cue);
}

export function renderSceneTab() {
  const tab = document.getElementById('tabScene');
  tab.replaceChildren();
  const scene = S.scene;
  if (!scene) { tab.innerHTML = '<p class="quiet pad">Open a scene first.</p>'; return; }
  const priv = scene.audience === 'private';
  tab.insertAdjacentHTML('beforeend', `<section class="facts"><span class="tag ${priv ? 'private' : 'public'}">${priv ? 'Private · Adult' : 'Public game'}</span><p class="where">${esc(scene.where || '')}</p><p class="quiet">${priv ? 'Plays only in private mode. Saving rebuilds the private scene files and runs the private checks.' : 'Part of the public game. Saving writes this scene back into its story file.'}</p></section>`);

  const place = document.createElement('section');
  place.innerHTML = '<h3>When it plays</h3>';
  tab.append(place);
  if (scene.placement) {
    const p = scene.placement;
    if (p.place !== null) labelled(place, 'Place', picker(S.authoring.places.map(x => ({ value: x.id, label: x.name })), p.place, v => edit(s => { s.placement.place = v; })));
    if (p.day !== null) labelled(place, 'Day', picker([1, 2, 3, 4, 5].map(d => ({ value: d, label: `Day ${d}` })), p.day, v => edit(s => { s.placement.day = Number(v); })));
    if (p.condition !== null) {
      const box = document.createElement('div');
      box.className = 'cond-box';
      box.innerHTML = '<span class="field-label">Shown when</span>';
      const inner = document.createElement('div');
      box.append(inner);
      conditionEditor(inner, p.condition, S.authoring.variables, v => edit(s => { s.placement.condition = v; }));
      place.append(box);
    }
    if (Object.values(p).every(v => v === null)) place.insertAdjacentHTML('beforeend', '<p class="quiet">This part plays inside its scene, in the order the scene sets.</p>');
  } else {
    scene.entries.forEach((entry, i) => {
      const box = document.createElement('fieldset');
      box.className = 'option-box';
      box.innerHTML = `<legend>Starts when</legend>`;
      labelled(box, 'The player', picker(S.authoring.events.map(e => ({ value: e.id, label: e.label })), entry.event, v => edit(s => { s.entries[i].event = v; }), 'Choose what the player does'));
      const inner = document.createElement('div');
      conditionEditor(inner, entry.condition, S.authoring.variables, v => edit(s => { s.entries[i].condition = v; }));
      const cond = document.createElement('div');
      cond.className = 'cond-box';
      cond.innerHTML = '<span class="field-label">And</span>';
      cond.append(inner);
      box.append(cond);
      const once = document.createElement('label');
      once.className = 'check';
      once.innerHTML = `<input type="checkbox" ${entry.once ? 'checked' : ''}> Only the first time`;
      once.querySelector('input').onchange = e => edit(s => { s.entries[i].once = e.target.checked; });
      box.append(once);
      const rm = document.createElement('button');
      rm.className = 'ghost small danger';
      rm.textContent = 'Remove';
      rm.onclick = () => edit(s => s.entries.splice(i, 1));
      box.append(rm);
      place.append(box);
    });
    if (!scene.entries.length) place.insertAdjacentHTML('beforeend', '<p class="quiet">Nothing starts this part directly. Other parts lead here through a choice or a jump.</p>');
    if (scene.routesEditable) {
      const add = document.createElement('button');
      add.className = 'ghost small';
      add.textContent = 'Add a way in';
      add.onclick = () => edit(s => s.entries.push({ event: '', condition: '', once: false }));
      place.append(add);
    }
  }

  const notes = document.createElement('section');
  notes.innerHTML = '<h3>Notes</h3>';
  const t = document.createElement('textarea');
  t.rows = 4;
  t.placeholder = 'Intent, staging, ideas to try. Kept with the editor, not in the game.';
  t.value = scene.metadata.notes || '';
  t.oninput = () => edit(s => { s.metadata.notes = t.value; }, { key: 'notes', quiet: true });
  notes.append(t);
  tab.append(notes);

  const rev = document.createElement('section');
  rev.innerHTML = '<h3>Revisions</h3>';
  const history = scene.history || [];
  if (!history.length) rev.insertAdjacentHTML('beforeend', '<p class="quiet">Each save keeps the version before it here.</p>');
  for (const v of history) {
    const row = document.createElement('div');
    row.className = 'revision';
    const when = new Date(Number(v.replace('.json', '')) / 1e6);
    row.innerHTML = `<span>${esc(when.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }))}</span><button class="ghost small">Restore</button>`;
    row.querySelector('button').onclick = async () => {
      const old = await api('history?id=' + encodeURIComponent(scene.id) + '&version=' + encodeURIComponent(v));
      if (!old) return;
      edit(s => {
        Object.assign(s, { steps: old.steps, raw: old.raw, entries: old.entries || [], placement: old.placement, metadata: old.metadata || {} });
        if (old.images) s.images = old.images;
        s.restoreVersion = v;
      });
      select(null);
    };
    rev.append(row);
  }
  if (history.length) rev.insertAdjacentHTML('beforeend', '<p class="quiet">Restore puts that version in the editor. Save to make it the scene again, or undo to go back.</p>');
  tab.append(rev);
}

