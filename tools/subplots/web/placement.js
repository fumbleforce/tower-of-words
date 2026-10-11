// When and where the open scene plays, as one sentence (restrictions.js). Each part of the sentence is a button
// that opens a picker fed by the bible: the way in, the place, the day, the time of day, first time only, who plays,
// the modes, and what must have happened. No condition text is shown or typed anywhere.
const { document, setTimeout } = globalThis;
import { esc } from './common.js';
import { S, edit } from './store.js';
import { placeName } from './names.js';
import { conditionSentence } from './conditions.js';
import { openPop, closePop } from './pop.js';
import * as R from './restrictions.js';
import { names, wayLabel, mapScene } from './storymap.js';

// "Talk to Mio" -> "you talk to Mio", as the sentence reads it
const wayPhrase = label => label.replace(/^./, c => c.toLowerCase()).replace(/^(talk|say|enter|walk|look|use|give|ask|chat) /, 'you $1 ');

// The open scene's ways in as {model, scene (for the sentence), write(model)} rows.
function ways(scene) {
  if (scene.placement) {
    const p = scene.placement, seen = `${scene.scene || ''}_seen`;
    let model = R.readRestrictions(p.condition || '', { seen });
    // the day the recipe names, when the condition doesn't say one
    if (!R.daysOf(model) && p.day) model = { ...model, fallbackDay: p.day };
    return [{
      model, editable: p.condition !== null,
      scene: { place: p.place ? placeName(p.place) : null, placeFixed: p.place === null, showModes: true, showWho: true },
      write: (m, s) => {
        s.placement.condition = R.writeRestrictions(m);
        const d = R.daysOf(m);
        const first = d?.only ?? d?.from ?? d?.list?.[0];
        if (s.placement.day !== null && first) s.placement.day = first;
      },
      setPlace: id => edit(s => { s.placement.place = id; }),
    }];
  }
  const at = mapScene(scene.id);
  const fixedDay = typeof at?.day === 'number' ? at.day : null;
  return scene.entries.map((entry, i) => {
    const model = R.readRestrictions(entry.condition, { once: entry.once });
    // a day file's day, unless the way in names days of its own (a day-1 file also stands in on later days)
    const day = R.daysOf(model) ? null : fixedDay;
    return {
      model, editable: true, entry, index: i,
      scene: { way: entry.event ? wayPhrase(wayLabel(entry, at?.place)) : '', place: at?.place ? placeName(at.place) : undefined, placeFixed: true, day },
      write: (m, s) => { s.entries[i].condition = R.writeRestrictions(m); s.entries[i].once = m.once; },
    };
  });
}

export function renderPlacement(host) {
  const scene = S.scene;
  const rows = ways(scene);
  const at = !scene.placement && mapScene(scene.id);
  if (!scene.placement && scene.startsHere) host.insertAdjacentHTML('beforeend', `<p class="sentence">Plays when you arrive at ${esc(at?.place ? placeName(at.place) : 'this place')}${typeof at?.day === 'number' ? `, on day ${at.day}` : ''}.</p>`);
  rows.forEach(row => {
    const box = document.createElement('div');
    box.className = 'way';
    const pieces = R.sentence(row.model, row.scene, names, conditionSentence);
    // a recipe's own day stands in until the condition names one
    if (row.model.fallbackDay) { const d = pieces.find(p => p.chip === 'day'); if (d) d.text = `on day ${row.model.fallbackDay}`; }
    const p = document.createElement('p');
    p.className = 'sentence';
    for (const piece of pieces) {
      if (!piece.chip || !row.editable) { p.append(piece.text); continue; }
      const b = document.createElement('button');
      b.className = 'chip' + (piece.chip === 'need' ? ' need' : '');
      b.dataset.chip = piece.chip;
      b.textContent = piece.text;
      b.onclick = () => open(b, piece, row);
      p.append(b);
    }
    box.append(p);
    const tools = document.createElement('div');
    tools.className = 'way-tools';
    if (row.editable) {
      const add = document.createElement('button');
      add.className = 'ghost small';
      add.textContent = '+ Add a condition';
      add.onclick = () => pickNeed(add, row);
      tools.append(add);
    } else {
      tools.insertAdjacentHTML('beforeend', '<span class="quiet">This scene’s recipe has no condition to change here.</span>');
    }
    if (row.entry) {
      const rm = document.createElement('button');
      rm.className = 'ghost small danger';
      rm.textContent = 'Remove this way in';
      rm.onclick = () => edit(s => s.entries.splice(row.index, 1));
      tools.append(rm);
    }
    box.append(tools);
    host.append(box);
  });
  if (!scene.placement) {
    if (!rows.length && !scene.startsHere) host.insertAdjacentHTML('beforeend', '<p class="quiet">Nothing starts this part directly. Other parts lead here through a choice or a jump.</p>');
    if (scene.routesEditable) {
      const add = document.createElement('button');
      add.className = 'ghost small';
      add.textContent = 'Add a way in';
      add.onclick = () => pickWay(add, ev => edit(s => s.entries.push({ event: ev, condition: '', once: false })));
      host.append(add);
    } else if (at?.partial) host.insertAdjacentHTML('beforeend', '<p class="quiet">This place builds some of its ways in from code, so they are changed in its story file.</p>');
  }
}

// ---------- the pickers ----------
const apply = (row, change) => edit(s => row.write(change(row.model), s));

function open(anchor, piece, row) {
  if (piece.chip === 'way') return pickWay(anchor, ev => edit(s => { s.entries[row.index].event = ev; }));
  if (piece.chip === 'place') return pickFrom(anchor, 'Where it plays', S.authoring.places.map(p => ({ value: p.id, label: p.name })), id => row.setPlace(id));
  if (piece.chip === 'day') return pickDay(anchor, row);
  if (piece.chip === 'time') return pickTime(anchor, row);
  if (piece.chip === 'once') return pickFrom(anchor, 'How often', [{ value: 'every', label: 'Every time' }, { value: 'once', label: 'Only the first time' }], v => apply(row, m => R.setOnce(m, v === 'once')));
  if (piece.chip === 'who') return pickFrom(anchor, 'Who plays', [{ value: '', label: 'Whoever plays' }, { value: 'eric', label: 'Only when Eric plays' }, { value: 'carina', label: 'Only when Carina plays' }], v => apply(row, m => R.setWho(m, v)));
  if (piece.chip === 'mode') return pickModes(anchor, row);
  if (piece.chip === 'need') return openPop(anchor, pop => {
    pop.innerHTML = `<p class="pop-title">${esc(piece.text)}</p><div class="menu"><button data-rm>Remove this condition</button></div>`;
    pop.querySelector('[data-rm]').onclick = () => { closePop(); apply(row, m => R.removePart(m, piece.index)); };
  });
}

function pickFrom(anchor, title, options, choose) {
  openPop(anchor, pop => {
    pop.innerHTML = `<p class="pop-title">${esc(title)}</p>${options.length > 8 ? '<input class="pop-search" placeholder="Find…">' : ''}<div class="menu scroll"></div>`;
    const menu = pop.querySelector('.menu'), input = pop.querySelector('input');
    const paint = () => {
      const q = (input?.value || '').toLowerCase();
      menu.innerHTML = options.filter(o => !q || o.label.toLowerCase().includes(q)).map(o => `<button data-v="${esc(o.value)}">${esc(o.label)}</button>`).join('');
      for (const b of menu.querySelectorAll('button')) b.onclick = () => { closePop(); choose(options.find(o => String(o.value) === b.dataset.v).value); };
    };
    if (input) { input.oninput = paint; setTimeout(() => input.focus()); }
    paint();
  });
}

// Ways in: what the player does. The scene's own place first.
function pickWay(anchor, choose) {
  const at = mapScene(S.scene.id);
  const here = e => (at?.file && e.sources?.includes(at.file) ? 0 : 1);
  const events = [...S.authoring.events].sort((a, b) => here(a) - here(b));
  pickFrom(anchor, 'Starts when the player…', events.map(e => ({ value: e.id, label: e.label })), choose);
}

function pickDay(anchor, row) {
  const days = R.daysOf(row.model) || (row.model.fallbackDay ? { only: row.model.fallbackDay } : null);
  const kind = !days ? 'any' : days.only ? 'only' : days.list ? 'list' : days.to ? 'between' : 'from';
  const n = days?.only ?? days?.from ?? days?.list?.[0] ?? 1, to = days?.to ?? n + 1;
  const numbers = (v, name) => `<select data-n="${name}">${Array.from({ length: 30 }, (_, i) => `<option ${i + 1 === v ? 'selected' : ''}>${i + 1}</option>`).join('')}</select>`;
  openPop(anchor, pop => {
    pop.innerHTML = `<p class="pop-title">Which days</p>
      <label class="radio"><input type="radio" name="d" value="any" ${kind === 'any' ? 'checked' : ''}> Any day</label>
      <label class="radio"><input type="radio" name="d" value="only" ${kind === 'only' ? 'checked' : ''}> Only day ${numbers(n, 'only')}</label>
      <label class="radio"><input type="radio" name="d" value="from" ${kind === 'from' ? 'checked' : ''}> From day ${numbers(n, 'from')} on</label>
      <label class="radio"><input type="radio" name="d" value="between" ${kind === 'between' ? 'checked' : ''}> From day ${numbers(n, 'a')} to day ${numbers(to, 'b')}</label>
      ${kind === 'list' ? `<label class="radio"><input type="radio" name="d" value="list" checked> ${esc(R.daysPhrase(days))}</label>` : ''}
      <div class="pop-actions"><button class="primary small" data-ok>Use these days</button></div>`;
    const val = k => Number(pop.querySelector(`[data-n=${k}]`).value);
    for (const s of pop.querySelectorAll('select')) s.onchange = () => { s.closest('label').querySelector('input').checked = true; };
    pop.querySelector('[data-ok]').onclick = () => {
      const k = pop.querySelector('input[name=d]:checked').value;
      const spec = k === 'any' ? null : k === 'only' ? { only: val('only') } : k === 'from' ? { from: val('from') } : k === 'between' ? { from: Math.min(val('a'), val('b')), to: Math.max(val('a'), val('b')) } : days;
      closePop();
      apply(row, m => R.setDays(m, spec));
    };
  });
}

function pickTime(anchor, row) {
  const now = R.periodsOf(row.model);
  openPop(anchor, pop => {
    pop.innerHTML = `<p class="pop-title">Time of day</p>${R.PERIODS.map(p => `<label class="check"><input type="checkbox" value="${p.id}" ${now.includes(p.id) ? 'checked' : ''}> ${esc(p.label)}</label>`).join('')}
      <p class="hint">None ticked: at any time of day.</p><div class="pop-actions"><button class="primary small" data-ok>Use these times</button></div>`;
    pop.querySelector('[data-ok]').onclick = () => {
      const list = [...pop.querySelectorAll('input:checked')].map(i => i.value);
      closePop();
      apply(row, m => R.setPeriods(m, list));
    };
  });
}

function pickModes(anchor, row) {
  openPop(anchor, pop => {
    pop.innerHTML = `<p class="pop-title">Only in these modes</p>
      <label class="check"><input type="checkbox" value="private" ${R.hasMode(row.model, 'private') ? 'checked' : ''}> Private mode</label>
      <label class="check"><input type="checkbox" value="skimpy" ${R.hasMode(row.model, 'skimpy') ? 'checked' : ''}> Skimpy on</label>
      <div class="pop-actions"><button class="primary small" data-ok>Use these</button></div>`;
    pop.querySelector('[data-ok]').onclick = () => {
      const on = k => pop.querySelector(`input[value=${k}]`).checked;
      closePop();
      apply(row, m => R.setMode(R.setMode(m, 'private', on('private')), 'skimpy', on('skimpy')));
    };
  });
}

// people met and words known before the story's own flags
const groupRank = v => ['People', 'Language'].indexOf(v.group) + 1 || 3;

// Something that must have happened (or not): a flag, a word, a person met, a step with someone, from the bible.
function pickNeed(anchor, row) {
  const vars = S.authoring.variables.filter(v => !['day', 'period', 'place'].includes(v.id));
  openPop(anchor, pop => {
    pop.classList.add('wide');
    pop.innerHTML = `<p class="pop-title">Plays only if…</p><input class="pop-search" placeholder="Find a person, a word or something that happened"><div class="menu scroll"></div>`;
    const input = pop.querySelector('input'), menu = pop.querySelector('.menu');
    const paint = () => {
      const q = input.value.toLowerCase();
      const shown = vars.filter(v => !q || `${v.label} ${v.id} ${v.group || ''}`.toLowerCase().includes(q)).sort((a, b) => groupRank(a) - groupRank(b)).slice(0, 80);
      menu.innerHTML = shown.map(v => `<button data-v="${esc(v.id)}"><span>${esc(v.label)}</span><small>${esc(v.group || '')}</small></button>`).join('') || '<p class="quiet pad">Nothing matches.</p>';
      for (const b of menu.querySelectorAll('button')) b.onclick = () => askValue(pop, row, vars.find(v => v.id === b.dataset.v));
    };
    input.oninput = paint;
    setTimeout(() => input.focus());
    paint();
  });
}
// The second step: yes or no for something that happens, a value for a number or a choice.
function askValue(pop, row, v) {
  const yesNo = v.type === 'boolean';
  const phrase = need => R.needPhrase(need, names);
  pop.innerHTML = `<p class="pop-title">${esc(v.label)}</p>${yesNo
    ? `<div class="menu"><button data-op="true">${esc(phrase({ field: v.id, op: 'true' }))}</button><button data-op="false">${esc(phrase({ field: v.id, op: 'false' }))}</button></div>`
    : `<div class="two"><select data-op>${[['==', 'Is'], ['!=', 'Is not'], ['>=', 'At least'], ['<=', 'At most']].filter(([op]) => v.type === 'number' || op === '==' || op === '!=').map(([op, l]) => `<option value="${op}">${l}</option>`).join('')}</select>${v.type === 'number' ? '<input type="number" data-val value="1">' : `<select data-val>${(v.options || []).map(o => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('')}</select>`}</div><div class="pop-actions"><button class="primary small" data-ok>Add</button></div>`}`;
  const add = need => { closePop(); apply(row, m => R.addNeed(m, need)); };
  for (const b of pop.querySelectorAll('button[data-op]')) b.onclick = () => add({ field: v.id, op: b.dataset.op });
  pop.querySelector('[data-ok]')?.addEventListener('click', () => {
    const raw = pop.querySelector('[data-val]').value;
    add({ field: v.id, op: pop.querySelector('select[data-op]').value, value: v.type === 'number' ? Number(raw) : raw });
  });
}

