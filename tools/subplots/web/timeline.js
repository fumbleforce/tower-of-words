// The scene as a list of beats: lines and narration edited in place, pictures shown where they play,
// choices and branches with their beats indented under them. Beats move by drag (the handle) or Alt+arrows.
const { document, structuredClone } = globalThis;
import { esc } from './common.js';
import { S, edit, select, recipe } from './store.js';
import { kindOf, KIND_LABEL, speakerOf, textsOf, withText, withSpeaker, newStep, stepAt, listAt, samePath, moveStep, describe, hasJapanese } from './model.js';
import { personName, personColor, portrait, nodeTitle, humanize } from './names.js';
import { conditionSentence } from './conditions.js';
import { pictureFor } from './pictures.js';
import { openPop, closePop } from './pop.js';

const host = () => document.getElementById('timeline');
const key = path => path.join('.');
const parsePath = text => text.split('.').map(x => (/^\d+$/.test(x) ? Number(x) : x));

export function renderTimeline() {
  const root = host();
  const scene = S.scene;
  document.getElementById('empty').hidden = !!scene;
  root.hidden = !scene;
  if (!scene) return;
  const focus = document.activeElement?.closest?.('.timeline [data-field]');
  const focusKey = focus && `${focus.closest('[data-path]')?.dataset.path}|${focus.dataset.field}`;
  const caret = focus ? [focus.selectionStart, focus.selectionEnd] : null;
  const scroll = root.parentElement.scrollTop;
  root.replaceChildren();
  if (!Array.isArray(scene.steps)) {
    root.innerHTML = '<p class="quiet pad">This scene is put together by the game, so it has no beats to edit here. It is kept as it is.</p>';
    return;
  }
  root.append(list(scene.steps, []));
  root.append(addRow([], scene.steps.length, true));
  for (const el of root.querySelectorAll('textarea')) grow(el);
  markSelection();
  root.parentElement.scrollTop = scroll;
  if (focusKey) {
    const [p, f] = focusKey.split('|');
    const el = root.querySelector(`[data-path="${p}"] [data-field="${f}"]`);
    if (el) {
      el.focus({ preventScroll: true });
      if (caret) el.setSelectionRange(...caret);
    }
  }
}

export function markSelection() {
  for (const el of host().querySelectorAll('.beat')) {
    el.classList.toggle('selected', samePath(parsePath(el.dataset.path), S.selected));
  }
}

function list(steps, base) {
  const frag = document.createElement('div');
  frag.className = 'beats';
  frag.dataset.list = key(base);
  if (!steps.length) {
    const empty = document.createElement('div');
    empty.className = 'beats-empty';
    empty.textContent = 'Nothing here yet. Drag a beat here or add one.';
    empty.dataset.dropList = key(base);
    frag.append(empty);
  }
  steps.forEach((step, i) => {
    frag.append(beat(step, [...base, i], i));
    if (i < steps.length - 1) frag.append(addRow(base, i + 1));
  });
  return frag;
}

function beat(step, path, index) {
  const kind = kindOf(step);
  const row = document.createElement('article');
  row.className = `beat k-${kind}`;
  row.dataset.path = key(path);
  row.innerHTML = `<div class="rail"><button class="grip" title="Drag to move (or Alt+↑ ↓)" aria-label="Move beat">⋮⋮</button><span class="num">${index + 1}</span></div><div class="body"></div><div class="tools"><button data-op="dup" title="Duplicate">Copy</button><button data-op="del" title="Delete (Del)">Delete</button></div>`;
  const body = row.querySelector('.body');
  const content = { line, narration, picture, choice, branch, group }[kind] || other;
  content(body, step, path);
  row.addEventListener('pointerdown', e => {
    if (!samePath(S.selected, path)) select(path, { tab: kind === 'picture' ? 'picture' : undefined });
    e.stopPropagation();
  });
  row.querySelector('[data-op=del]').onclick = () => remove(path);
  row.querySelector('[data-op=dup]').onclick = () => duplicate(path);
  drag(row, path);
  return row;
}

function field(path, name, value, placeholder, cls = '') {
  const t = document.createElement('textarea');
  t.rows = 1;
  t.value = value ?? '';
  t.placeholder = placeholder;
  t.dataset.field = name;
  t.className = cls;
  t.spellcheck = true;
  if (hasJapanese(value) || name === 'second') t.lang = 'ja';
  t.addEventListener('input', () => {
    grow(t);
    edit(scene => {
      const list = listAt(scene.steps, path);
      list[path.at(-1)] = withText(list[path.at(-1)], name, t.value, recipe());
    }, { key: key(path) + name, quiet: true });
  });
  return t;
}
const grow = t => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; };

function line(body, step, path) {
  const who = speakerOf(step), texts = textsOf(step, recipe());
  const head = document.createElement('div');
  head.className = 'speaker-line';
  head.innerHTML = `<button class="speaker" style="--c:${esc(personColor(who))}">${portrait(who) ? `<img src="${esc(portrait(who))}" alt="">` : `<span class="initial">${esc(personName(who).slice(0, 1))}</span>`}<span class="name">${esc(personName(who))}</span><span class="caret">▾</span></button>${step.emo ? `<span class="delivery">${esc(humanize(step.emo))}</span>` : ''}`;
  head.querySelector('.speaker').onclick = e => speakerPicker(e.currentTarget, path);
  body.append(head);
  body.append(field(path, 'main', texts.main, recipe() ? 'What they say, in English' : 'What they say', 'text-main'));
  const showSecond = texts.recipe || texts.second !== undefined || hasJapanese(texts.main);
  if (showSecond) {
    const label = texts.recipe ? '日本語' : 'Subtitle';
    const wrap = document.createElement('label');
    wrap.className = 'second';
    wrap.innerHTML = `<span>${label}</span>`;
    wrap.append(field(path, 'second', texts.second, texts.recipe ? 'The same line in Japanese' : 'English shown under the Japanese', 'text-second'));
    body.append(wrap);
  }
}

function narration(body, step, path) {
  const head = document.createElement('div');
  head.className = 'speaker-line';
  head.innerHTML = '<button class="speaker narr"><span class="name">Narration</span><span class="caret">▾</span></button>';
  head.querySelector('.speaker').onclick = e => speakerPicker(e.currentTarget, path);
  body.append(head);
  body.append(field(path, 'main', textsOf(step, recipe()).main, 'What the player needs to know that the scene can’t show', 'text-main narr'));
}

function picture(body, step, path) {
  const pic = pictureFor(step);
  const fig = document.createElement('figure');
  fig.className = 'pic' + (pic.url ? '' : ' missing') + (pic.changed ? ' changed' : '');
  fig.innerHTML = pic.url
    ? `<img src="${esc(pic.url)}" alt="" loading="lazy"><figcaption>${pic.changed ? '<span class="tag new">New picture, saved with the scene</span>' : ''}<button class="change">Change picture</button></figcaption>`
    : '<div class="missing-box"><strong>No picture yet</strong><span>Pick one from the image generator’s history, or compose a new one.</span><button class="change">Choose a picture</button></div>';
  fig.querySelector('img')?.addEventListener('error', () => {
    fig.classList.add('missing');
    fig.querySelector('img').replaceWith(Object.assign(document.createElement('div'), { className: 'missing-box', innerHTML: '<strong>Picture file not found</strong>' }));
  });
  fig.querySelector('.change').onclick = () => select(path, { tab: 'picture' });
  body.append(fig);
  if (step.narration) body.append(field(path, 'main', step.narration, 'Narration over the picture', 'text-main narr'));
  if (step.shot?.cue) {
    const cue = document.createElement('p');
    cue.className = 'cue';
    cue.textContent = 'Sound: ' + step.shot.cue;
    body.append(cue);
  }
}

function choice(body, step, path) {
  const head = document.createElement('div');
  head.className = 'kind-head';
  head.innerHTML = `<span class="kind">Choice</span>${step.prompt ? `<span class="quiet">${esc(step.prompt)}</span>` : ''}`;
  body.append(head);
  const opts = document.createElement('div');
  opts.className = 'options';
  step.choice.forEach((c, j) => {
    const o = document.createElement('div');
    o.className = 'option';
    const input = document.createElement('input');
    input.value = c.text || '';
    input.placeholder = 'What Eric says or does';
    input.dataset.field = 'opt' + j;
    input.oninput = () => edit(scene => { stepAt(scene.steps, path).choice[j].text = input.value; }, { key: key(path) + 'opt' + j, quiet: true });
    o.innerHTML = '<span class="arrow">›</span>';
    o.append(input);
    const dest = c.go || c.call;
    const meta = document.createElement('span');
    meta.className = 'dest';
    meta.textContent = dest ? `→ ${nodeTitle(dest)}` : 'carries on';
    if (c.if) meta.textContent += ' · only if ' + conditionSentence(c.if);
    o.append(meta);
    opts.append(o);
  });
  const add = document.createElement('button');
  add.className = 'ghost small';
  add.textContent = 'Add an option';
  add.onclick = () => edit(scene => stepAt(scene.steps, path).choice.push({ text: '' }));
  opts.append(add);
  body.append(opts);
}

function branch(body, step, path) {
  const head = document.createElement('div');
  head.className = 'kind-head';
  head.innerHTML = `<span class="kind">If</span><span class="cond">${esc(conditionSentence(step.if))}</span>`;
  body.append(head);
  for (const [k, label] of [['then', 'Then'], ['else', 'Otherwise']]) {
    if (!Array.isArray(step[k])) continue;
    const arm = document.createElement('div');
    arm.className = 'arm';
    arm.innerHTML = `<div class="arm-label">${label}</div>`;
    arm.append(list(step[k], [...path, k]));
    arm.append(addRow([...path, k], step[k].length, true));
    body.append(arm);
  }
}

function group(body, step, path) {
  const head = document.createElement('div');
  head.className = 'kind-head';
  head.innerHTML = `<span class="kind">${esc(step.label && !/^Picture sequence$/i.test(step.label) ? humanize(step.label) : 'Sequence')}</span>`;
  body.append(head);
  const arm = document.createElement('div');
  arm.className = 'arm';
  arm.append(list(step.sequence, [...path, 'sequence']));
  arm.append(addRow([...path, 'sequence'], step.sequence.length, true));
  body.append(arm);
}

function other(body, step) {
  const p = document.createElement('p');
  p.className = 'direction';
  p.innerHTML = `<span class="kind">${esc(KIND_LABEL[kindOf(step)])}</span> ${esc(describe(step, personName, nodeTitle))}`;
  body.append(p);
}

// The thin "+" between beats, and the full row at the end of a list.
function addRow(listPath, at, full = false) {
  const row = document.createElement('div');
  row.className = full ? 'add-row full' : 'add-row';
  if (full) {
    row.innerHTML = '<span class="quiet">Add</span><button data-k="line">Line</button><button data-k="narration">Narration</button><button data-k="choice">Choice</button>';
    for (const b of row.querySelectorAll('button')) b.onclick = () => insert(listPath, at, b.dataset.k);
  } else {
    row.innerHTML = '<button class="plus" title="Add a beat here" aria-label="Add a beat here">+</button>';
    row.querySelector('.plus').onclick = e => openPop(e.currentTarget, pop => {
      pop.innerHTML = '<div class="menu"><button data-k="line">Line</button><button data-k="narration">Narration</button><button data-k="choice">Choice</button></div>';
      for (const b of pop.querySelectorAll('button')) b.onclick = () => { closePop(); insert(listPath, at, b.dataset.k); };
    });
  }
  return row;
}

// The speaker the last line before `at` had, so a new line goes to the other person in the conversation.
function nextSpeaker(steps, at) {
  const said = steps.slice(0, at).map(speakerOf).filter(Boolean);
  const last = said.at(-1);
  const other = [...said].reverse().find(w => w !== last);
  return other || (last === 'eric' ? 'mio' : 'eric');
}

export function insert(listPath, at, kind) {
  let path;
  edit(scene => {
    const target = listPath.length ? listAt(scene.steps, [...listPath, 0]) : scene.steps;
    target.splice(at, 0, newStep(kind, recipe(), nextSpeaker(target, at)));
    path = [...listPath, at];
  });
  select(path);
  host().querySelector(`[data-path="${key(path)}"] [data-field]`)?.focus();
}

export function remove(path) {
  edit(scene => listAt(scene.steps, path).splice(path.at(-1), 1));
  select(null);
}

function duplicate(path) {
  edit(scene => {
    const list = listAt(scene.steps, path), copy = structuredClone(list[path.at(-1)]);
    // a copy is a new beat: it keeps no link to the source helper or the picture slot
    if (copy && typeof copy === 'object') { delete copy.$recipe; delete copy.imageSlot; delete copy.voice; }
    list.splice(path.at(-1) + 1, 0, copy);
  });
  select([...path.slice(0, -1), path.at(-1) + 1]);
}

export function nudge(path, delta) {
  const list = listAt(S.scene.steps, path), to = path.at(-1) + delta;
  if (to < 0 || to >= list.length) return;
  let next;
  edit(scene => { next = moveStep(scene.steps, path, path.slice(0, -1), delta > 0 ? to + 1 : to); });
  select(next);
}

function speakerPicker(anchor, path) {
  const cast = S.authoring.characters.filter(c => c.id !== 'tama' || c.portrait);
  const extra = Object.keys(S.scene.speakers || {}).filter(id => !cast.some(c => c.id === id));
  const people = [...cast.map(c => c.id), ...extra];
  openPop(anchor, pop => {
    pop.innerHTML = `<input class="pop-search" placeholder="Who says it?" aria-label="Find a person"><div class="people"></div>`;
    const input = pop.querySelector('input'), box = pop.querySelector('.people');
    const paint = () => {
      const q = input.value.toLowerCase();
      const rows = ['', ...people].filter(id => !q || personName(id).toLowerCase().includes(q) || id.includes(q));
      box.innerHTML = rows.map(id => `<button data-id="${esc(id)}" style="--c:${esc(id ? personColor(id) : '#c9ced8')}">${portrait(id) ? `<img src="${esc(portrait(id))}" alt="">` : `<span class="initial">${id ? esc(personName(id).slice(0, 1)) : '…'}</span>`}<span>${esc(personName(id))}</span></button>`).join('');
      for (const b of box.querySelectorAll('button')) b.onclick = () => { closePop(); setSpeaker(path, b.dataset.id); };
    };
    input.oninput = paint;
    input.onkeydown = e => { if (e.key === 'Enter') box.querySelector('button')?.click(); };
    paint();
    input.focus();
  });
}

export function setSpeaker(path, who) {
  edit(scene => {
    const list = listAt(scene.steps, path);
    list[path.at(-1)] = withSpeaker(list[path.at(-1)], who, recipe());
  });
}

// Drag by the handle. Drop on the top or bottom half of a beat to go before or after it.
let dragging = null;
function drag(row, path) {
  const grip = row.querySelector('.grip');
  grip.addEventListener('pointerdown', () => { row.draggable = true; });
  row.addEventListener('dragstart', e => {
    if (e.target !== row) return;
    dragging = path;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', key(path));
    row.classList.add('dragging');
  });
  row.addEventListener('dragend', () => {
    row.draggable = false;
    row.classList.remove('dragging');
    dragging = null;
    clearMarks();
  });
}

function clearMarks() {
  for (const el of host().querySelectorAll('.drop-before,.drop-after,.drop-into')) el.classList.remove('drop-before', 'drop-after', 'drop-into');
}

function dropTarget(e) {
  const empty = e.target.closest?.('[data-drop-list]');
  if (empty) return { el: empty, list: empty.dataset.dropList ? parsePath(empty.dataset.dropList) : [], at: 0, mark: 'drop-into' };
  const row = e.target.closest?.('.beat');
  if (!row) return null;
  const path = parsePath(row.dataset.path);
  const r = row.getBoundingClientRect();
  const after = e.clientY > r.top + r.height / 2;
  return { el: row, list: path.slice(0, -1), at: path.at(-1) + (after ? 1 : 0), mark: after ? 'drop-after' : 'drop-before' };
}

export function installDrag() {
  const root = host();
  root.addEventListener('dragover', e => {
    if (!dragging) return;
    const t = dropTarget(e);
    if (!t) return;
    e.preventDefault();
    clearMarks();
    t.el.classList.add(t.mark);
  });
  root.addEventListener('dragleave', e => { if (!root.contains(e.relatedTarget)) clearMarks(); });
  root.addEventListener('drop', e => {
    const t = dropTarget(e);
    const from = dragging;
    clearMarks();
    if (!t || !from) return;
    e.preventDefault();
    let next;
    edit(scene => { next = moveStep(scene.steps, from, t.list, t.at); });
    select(next);
  });
}
