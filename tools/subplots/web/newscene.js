// New scene: pick a template, the day and place, and what the player does to start it; the scene is written into
// that place's story file (create.mjs, with the story checks) and opens in the timeline, ready to write.
const { document } = globalThis;
import { esc, api } from './common.js';
import { S } from './store.js';
import { placeName, personName } from './names.js';
import { TEMPLATES } from './templates.js';
import { DAYS } from './storymap.js';

const $ = id => document.getElementById(id);

// The story files of a day by place, from the map (a place with no file on that day has no story to add to).
function placesOn(day) {
  const files = new Map();
  for (const s of S.map?.scenes || []) if (s.day === day && s.place) files.set(s.place, s.file);
  const order = (S.map?.places || []).map(p => p.id);
  return [...files].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0])).map(([place, file]) => ({ place, file }));
}
// What starts it: the talk targets that place's story files already use (on any day), people or things as the template wants.
function waysAt(place, wants) {
  const files = new Set((S.map?.scenes || []).filter(s => s.place === place).map(s => s.file));
  const people = new Set(S.authoring.characters.map(c => c.id));
  return S.authoring.events.filter(e => e.id.startsWith('talk:') && e.sources?.some(f => files.has(f)))
    .filter(e => (wants === 'person') === people.has(e.id.slice(5)))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function openNewScene({ day, area, onCreated }) {
  const dialog = $('newDialog');
  let template = TEMPLATES[0].id;
  let pickDay = typeof day === 'number' || day === 'later' ? day : 1;
  let place = area;
  const paint = () => {
    const t = TEMPLATES.find(x => x.id === template);
    const places = placesOn(pickDay);
    if (!places.some(p => p.place === place)) place = places[0]?.place || '';
    const ways = waysAt(place, t.starts);
    dialog.innerHTML = `<form method="dialog" class="new-scene">
      <h2>New scene</h2>
      <div class="templates">${TEMPLATES.map(x => `<label class="template${x.id === template ? ' on' : ''}"><input type="radio" name="t" value="${x.id}" ${x.id === template ? 'checked' : ''}><strong>${esc(x.title)}</strong><span>${esc(x.about)}</span></label>`).join('')}</div>
      <div class="two">
        <label>Day<select name="day">${DAYS.filter(d => d.id !== 'any').map(d => `<option value="${d.id}" ${d.id === pickDay ? 'selected' : ''}>${esc(d.title)}</option>`).join('')}</select></label>
        <label>Place<select name="place">${places.map(p => `<option value="${p.place}" ${p.place === place ? 'selected' : ''}>${esc(placeName(p.place))}</option>`).join('')}</select></label>
      </div>
      <label>Starts when the player…<select name="event">${ways.map(w => `<option value="${esc(w.id)}">${esc(w.label)}</option>`).join('') || '<option value="">Nothing here to start it from yet</option>'}</select></label>
      <label>What it is about<input name="title" placeholder="A few words, such as Mio at the mailboxes" required></label>
      <p class="quiet">It goes into ${esc(placeName(place) || 'the place')}’s story for ${esc(DAYS.find(d => d.id === pickDay)?.title.toLowerCase() || '')} and opens here, ready to write. The words in brackets say what to write. If what starts it already starts another scene, the new one plays the first time and the old one after that. You can change this under When it plays.</p>
      <p class="error" hidden></p>
      <div class="dialog-actions"><button value="cancel" formnovalidate>Cancel</button><button class="primary" value="add" ${ways.length ? '' : 'disabled'}>Add the scene</button></div>
    </form>`;
    const form = dialog.querySelector('form');
    for (const r of form.querySelectorAll('input[name=t]')) r.onchange = () => { template = r.value; paint(); };
    form.elements.day.onchange = () => { pickDay = form.elements.day.value === 'later' ? 'later' : Number(form.elements.day.value); paint(); };
    form.elements.place.onchange = () => { place = form.elements.place.value; paint(); };
    form.onsubmit = async e => {
      if (e.submitter?.value !== 'add') return;
      e.preventDefault();
      const ev = form.elements.event.value, who = ev.slice(5);
      const err = form.querySelector('.error');
      err.hidden = true;
      e.submitter.disabled = true;
      e.submitter.textContent = 'Adding and checking…';
      try {
        const made = await api('create', { day: pickDay, place, template, title: form.elements.title.value, event: ev, who, name: personName(who) });
        dialog.close();
        onCreated(made);
      } catch (error) {
        err.hidden = false;
        err.textContent = error.data?.problems ? `${error.message} ${error.data.problems.join(' · ')}` : error.message;
        e.submitter.disabled = false;
        e.submitter.textContent = 'Add the scene';
      }
    };
  };
  paint();
  dialog.showModal();
  dialog.querySelector('input[name=title]').focus();
}
