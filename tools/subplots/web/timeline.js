// The scene as one reading path of beats: lines and narration edited in place, pictures shown where they play.
// At a choice the author picks an option and the beats that option leads to follow below (paths.js); an "if"
// shows the side the path takes, with a switch when no pick decides it. Beats move by drag (the handle) or
// Alt+arrows, in the scene itself or in a part a choice leads to.
const { document, structuredClone } = globalThis;
import { esc } from './common.js';
import { S, edit, select, recipe, listOf, stepOf, docFor, moveBeat, setPick, setArm } from './store.js';
import { kindOf, KIND_LABEL, speakerOf, textsOf, withText, withSpeaker, newStep, samePath, describe, hasJapanese } from './model.js';
import { personName, personColor, portrait, nodeTitle, humanize } from './names.js';
import { readingPath, pathSummary } from './paths.js';
import { marker, thread } from './comments.js';
import { conditionSentence } from './conditions.js';
import { pictureFor } from './pictures.js';
import { makingLabel } from './versions.js';
import { notesFor } from './checks.js';
import { openPop, closePop } from './pop.js';

const host = () => document.getElementById('timeline');
const key = path => path.join('.');
const parsePath = text => (text ? text.split('.').map(x => (/^\d+$/.test(x) ? Number(x) : x)) : []);

// The reading path for the open scene, with the parts its choices lead to.
export function currentPath() {
  return readingPath(S.scene?.steps, { docs: node => S.linked[node]?.scene || null, picks: S.picks, arms: S.arms, home: S.scene?.node });
}

// "If Carina is playing" reads better than the flag's name.
export function whenLabel(condition) {
  const m = /^\s*(!?)\s*mc_(\w+)\s*$/.exec(condition || '');
  if (m) return `${personName(m[2])} ${m[1] ? 'isn’t' : 'is'} playing`;
  return conditionSentence(condition);
}

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
  const tree = currentPath();
  root.append(pathBar(tree));
  root.append(list(tree, scene.steps, []));
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

// One list of beats along the path (`items` from paths.js), `steps` being the list itself. A choice whose picked
// option goes on elsewhere ends the list there: what follows is that option's part.
const BEAT_TYPES = ['beat', 'choice', 'branch', 'group'];
function list(items, steps, base) {
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
  let cut = false;
  items.forEach((item, n) => {
    if (item.type === 'section') { frag.append(section(item)); cut ||= !item.call; return; }
    if (item.type === 'elsewhere') { frag.append(elsewhere(item)); return; }
    if (item.type === 'skipped') { frag.append(skipped(item)); cut = true; return; }
    const i = item.path.at(-1);
    frag.append(beat(item, i));
    const last = !items.slice(n + 1).some(x => BEAT_TYPES.includes(x.type));
    if (item.type === 'branch' && i < steps.length - 1) frag.append(rejoin());
    if (!last) frag.append(addRow(base, i + 1));
  });
  if (!cut) frag.append(addRow(base, steps.length, true));
  return frag;
}

// The picks along the path, at the top of the timeline. Each one goes to its choice. Switches for the branches
// no pick decides and that run through the whole scene (who plays) sit here too, so one click changes them all.
function pathBar(tree) {
  const bar = document.createElement('div');
  bar.className = 'path-bar';
  const picks = pathSummary(tree);
  const conds = new Map();
  const visit = xs => xs.forEach(it => { if (it.type === 'branch' && !it.locked && /^\s*!?\s*mc_\w+\s*$/.test(it.step.if) && !conds.has(it.step.if)) conds.set(it.step.if, it.arm); if (it.items) visit(it.items); });
  visit(tree);
  if (!picks.length && !conds.size) { bar.hidden = true; return bar; }
  bar.innerHTML = '<span class="path-label">Reading</span>';
  if (!picks.length) bar.insertAdjacentHTML('beforeend', '<span class="quiet">the whole scene</span>');
  picks.forEach((p, n) => {
    const b = document.createElement('button');
    b.className = 'path-pick';
    b.dataset.pick = n;
    b.title = 'Go to this choice';
    b.innerHTML = `${n ? '<span class="sep">›</span>' : ''}<span>${esc(p.label)}</span>`;
    b.onclick = () => { select(p.path); host().querySelector(`[data-path="${key(p.path)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
    bar.append(b);
  });
  for (const [c, arm] of conds) bar.append(armSwitch(c, arm, true));
  return bar;
}

function armSwitch(condition, arm, label) {
  const sw = document.createElement('span');
  sw.className = 'arm-switch';
  sw.innerHTML = `${label ? `<span>${esc(whenLabel(condition))}?</span>` : ''}<span class="seg mini" role="group"><button data-arm="then" aria-pressed="${arm === 'then'}">Yes</button><button data-arm="else" aria-pressed="${arm === 'else'}">No</button></span>`;
  sw.querySelectorAll('[data-arm]').forEach(b => {
    b.onpointerdown = e => e.stopPropagation();
    b.onclick = e => { e.stopPropagation(); setArm(condition, b.dataset.arm); };
  });
  return sw;
}

// The beats a picked option leads to, in another part of the scene, continuing the path.
function section(item) {
  const box = document.createElement('section');
  box.className = 'path-section';
  box.dataset.part = item.node;
  const doc = S.linked[item.node]?.scene;
  box.innerHTML = `<header class="path-head"><span class="path-arrow" aria-hidden="true">↓</span><span>After <strong>“${esc(item.option || '…')}”</strong></span><span class="quiet">${item.call ? 'these play, then the scene carries on' : 'the scene goes on here'}</span></header>`;
  box.append(list(item.items, doc?.steps || [], ['@' + item.node]));
  if (item.call) box.append(rejoin('Back in the scene'));
  return box;
}

function elsewhere(item) {
  const p = document.createElement('p');
  p.className = 'path-note';
  p.textContent = item.shownAbove ? `“${item.option}” goes back to beats shown above.` : `“${item.option}” goes on to “${nodeTitle(item.node)}”, outside this scene.`;
  return p;
}

function skipped(item) {
  const p = document.createElement('p');
  p.className = 'path-note';
  p.textContent = `${item.count} more ${item.count === 1 ? 'beat follows' : 'beats follow'} this choice for the other options. Pick one of them to read on here.`;
  return p;
}

function rejoin(text = 'Both ways meet again here') {
  const el = document.createElement('div');
  el.className = 'rejoin';
  el.innerHTML = `<span>${esc(text)}</span>`;
  return el;
}

function beat(item, index) {
  const { step, path } = item;
  const kind = kindOf(step);
  const row = document.createElement('article');
  row.className = `beat k-${kind}`;
  row.dataset.path = key(path);
  row.innerHTML = `<div class="rail"><button class="grip" title="Drag to move (or Alt+↑ ↓)" aria-label="Move beat">⋮⋮</button><span class="num">${index + 1}</span></div><div class="body"></div><div class="tools"><button data-op="comment" title="Ask Claude to change this beat">Comment</button><button data-op="dup" title="Duplicate">Copy</button><button data-op="del" title="Delete (Del)">Delete</button></div>`;
  const mark = marker(path, step);
  if (mark) { row.querySelector('.rail').append(mark); row.classList.add('has-comment'); }
  const body = row.querySelector('.body');
  const content = { line, narration, picture, choice, branch, group }[kind] || other;
  content(body, step, path, item);
  const doc = docFor(path), notes = doc ? notesFor(doc.id, doc.node || String(doc.id).split('#')[1] || '', step) : [];
  if (notes.length) {
    body.insertAdjacentHTML('beforeend', `<ul class="check-notes">${notes.map(n => `<li class="${n.kind}">${esc(n.text)}</li>`).join('')}</ul>`);
    if (notes.some(n => n.kind === 'problem')) row.classList.add('has-problem');
  }
  row.addEventListener('pointerdown', e => {
    if (!samePath(S.selected, path)) select(path, { tab: kind === 'picture' ? 'picture' : undefined });
    e.stopPropagation();
  });
  row.querySelector(':scope > .tools [data-op=del]').onclick = () => remove(path);
  row.querySelector(':scope > .tools [data-op=comment]').onclick = e => thread(e.currentTarget, path, step);
  row.querySelector(':scope > .tools [data-op=dup]').onclick = () => duplicate(path);
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
    edit(() => {
      const list = listOf(path);
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
  const pic = pictureFor(step, docFor(path));
  const making = pic.slot ? makingLabel(docFor(path)?.id, pic.slot) : '';
  const fig = document.createElement('figure');
  fig.className = 'pic' + (pic.url ? '' : ' missing') + (pic.changed ? ' changed' : '');
  fig.innerHTML = pic.url
    ? `<img src="${esc(pic.url)}" alt="" loading="lazy"><span class="tag making" data-making="${esc(JSON.stringify([docFor(path)?.id, pic.slot]))}" ${making ? '' : 'hidden'}>${esc(making)}</span><figcaption>${pic.changed ? '<span class="tag new">New picture, saved with the scene</span>' : ''}<button class="change">Change picture</button></figcaption>`
    : `<div class="missing-box"><strong>No picture yet</strong><span>${step.newPicture ? 'Compose one for this beat in the Picture tab, or pick one from the image generator’s history. Save needs a picture here.' : 'Pick one from the image generator’s history, or compose a new one.'}</span><button class="change">Choose a picture</button></div>`;
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

// A choice: its options as a switch. The picked one is the path the timeline follows below. Its words are edited
// here; the other options' words are edited by picking them, or in the Beat tab.
function choice(body, step, path, item) {
  const head = document.createElement('div');
  head.className = 'kind-head';
  head.innerHTML = `<span class="kind">Choice</span>${step.prompt ? `<span class="quiet">${esc(step.prompt)}</span>` : ''}`;
  body.append(head);
  const pick = item?.pick ?? 0;
  const tabs = document.createElement('div');
  tabs.className = 'option-tabs';
  tabs.setAttribute('role', 'group');
  tabs.setAttribute('aria-label', 'Which option the timeline follows');
  step.choice.forEach((c, j) => {
    const b = document.createElement('button');
    b.setAttribute('aria-pressed', String(j === pick));
    b.dataset.opt = j;
    b.title = j === pick ? 'The beats below follow this option' : 'Follow this option below';
    b.innerHTML = `<span class="opt-text">${esc(c.text || 'Option ' + (j + 1))}</span>${c.if ? `<small>only if ${esc(whenLabel(c.if))}</small>` : ''}`;
    b.onpointerdown = e => e.stopPropagation();
    b.onclick = e => { e.stopPropagation(); if (j !== pick) setPick(item.key, j); };
    tabs.append(b);
  });
  body.append(tabs);
  const c = step.choice[pick];
  if (c) {
    const o = document.createElement('div');
    o.className = 'option';
    const input = document.createElement('input');
    input.value = c.text || '';
    input.placeholder = 'What Eric says or does';
    input.dataset.field = 'opt' + pick;
    input.setAttribute('aria-label', 'Words of the picked option');
    input.oninput = () => edit(() => { stepOf(path).choice[pick].text = input.value; }, { key: key(path) + 'opt' + pick, quiet: true });
    o.innerHTML = '<span class="arrow">›</span>';
    o.append(input);
    const meta = document.createElement('span');
    meta.className = 'dest';
    const dest = c.go || c.call;
    meta.textContent = !dest ? 'carries on below' : !S.linked[dest] ? `goes on to “${nodeTitle(dest)}”` : c.go ? 'goes on below' : 'plays below, then carries on';
    o.append(meta);
    body.append(o);
  }
  const add = document.createElement('button');
  add.className = 'ghost small add-option';
  add.textContent = 'Add an option';
  add.onclick = () => edit(() => stepOf(path).choice.push({ text: '' }));
  body.append(add);
}

// An "if": the side the path takes, with its beats under it. When a pick above decides it, it says so; when
// nothing does (who plays, say), a switch picks the side for every branch with the same rule.
function branch(body, step, path, item) {
  const arm = item?.arm || 'then';
  const head = document.createElement('div');
  head.className = 'kind-head';
  // decided by a pick above: say which pick, not the rule's flag
  if (item?.locked && item.reason) head.innerHTML = `<span class="kind">Because</span><span class="cond">you picked “${esc(item.reason)}”</span><span class="arm-why" title="${esc(whenLabel(step.if))}">these beats play</span>`;
  else head.innerHTML = `<span class="kind">If</span><span class="cond">${esc(whenLabel(step.if))}</span>`;
  if (!item?.locked) head.append(armSwitch(step.if, arm, false));
  body.append(head);
  const box = document.createElement('div');
  box.className = 'arm';
  const steps = Array.isArray(step[arm]) ? step[arm] : null;
  if (steps) box.append(list(item?.items || [], steps, [...path, arm]));
  else {
    box.classList.add('arm-empty');
    box.innerHTML = '<span class="quiet">Nothing extra plays this way.</span>';
    const b = document.createElement('button');
    b.className = 'ghost small';
    b.textContent = 'Add beats for this way';
    b.onclick = () => edit(() => { stepOf(path)[arm] = []; });
    box.append(b);
  }
  body.append(box);
}

function group(body, step, path, item) {
  const head = document.createElement('div');
  head.className = 'kind-head';
  head.innerHTML = `<span class="kind">${esc(step.label && !/^Picture sequence$/i.test(step.label) ? humanize(step.label) : 'Sequence')}</span>`;
  body.append(head);
  const arm = document.createElement('div');
  arm.className = 'arm';
  arm.append(list(item?.items || [], step.sequence, [...path, 'sequence']));
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
  // a picture beat where the recipe can show one (recipes.mjs pictureHelper)
  const picture = recipe() && S.scene?.capabilities?.picture ? '<button data-k="picture">Picture</button>' : '';
  if (full) {
    row.innerHTML = `<span class="quiet">Add</span><button data-k="line">Line</button><button data-k="narration">Narration</button><button data-k="choice">Choice</button>${picture}`;
    for (const b of row.querySelectorAll('button')) b.onclick = () => insert(listPath, at, b.dataset.k);
  } else {
    row.innerHTML = '<button class="plus" title="Add a beat here" aria-label="Add a beat here">+</button>';
    row.querySelector('.plus').onclick = e => openPop(e.currentTarget, pop => {
      pop.innerHTML = `<div class="menu"><button data-k="line">Line</button><button data-k="narration">Narration</button><button data-k="choice">Choice</button>${picture}</div>`;
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
    const target = listOf([...listPath, 0]);
    target.splice(at, 0, newStep(kind, recipe(), nextSpeaker(target, at)));
    path = [...listPath, at];
  });
  select(path, kind === 'picture' ? { tab: 'picture' } : undefined);
  host().querySelector(`[data-path="${key(path)}"] [data-field]`)?.focus();
}

export function remove(path) {
  edit(() => listOf(path).splice(path.at(-1), 1));
  select(null);
}

function duplicate(path) {
  edit(scene => {
    const list = listOf(path), copy = structuredClone(list[path.at(-1)]);
    // a copy is a new beat: it keeps no link to the source helper or the picture slot
    if (copy && typeof copy === 'object') { delete copy.$recipe; delete copy.imageSlot; delete copy.voice; }
    list.splice(path.at(-1) + 1, 0, copy);
  });
  select([...path.slice(0, -1), path.at(-1) + 1]);
}

export function nudge(path, delta) {
  const list = listOf(path), to = path.at(-1) + delta;
  if (to < 0 || to >= list.length) return;
  let next;
  edit(() => { next = moveBeat(path, path.slice(0, -1), delta > 0 ? to + 1 : to); });
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
    const list = listOf(path);
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
    edit(() => { next = moveBeat(from, t.list, t.at); });
    select(next);
  });
}
