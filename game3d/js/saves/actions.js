// Saving and loading from play (docs/game/controls-and-ui.md, Saves): quick save (F5, the pause menu, the phone's
// HUD button) and quick load (F9, the pause menu), saving into a slot, loading one, the confirm that comes before a
// load would lose progress, and the autosave's note (its time, picture and goal) for the Continue card.
// A slot is a copy of the autosave (sim.js save), so it resumes the way Continue does (systems.md, Saving): in the
// middle of a scene, that scene starts again from its first line, which the "Quick saved" notice says.
//   const saving = createSaving({ game, grab, openLayer, closeLayer, trap, setPaused }); menu.js
import { ui, sfx } from '../ui.js';
import { sim, save as simSave, periodName } from '../sim.js';
import { PLACE_NAMES } from '../places/definitions.js';
import { createSlotStore, localKV, idbThumbs, KEYS } from './store.js';
import { el } from '../ui/dom.js';

export const kv = localKV();
export const store = createSlotStore({ kv, thumbs: idbThumbs() });
export const migrated = store.migrate().catch(() => 0);

const body = () => document.body.classList;
const atTitle = () => body().contains('at-title');

export const fmtTime = (t) => {
  if (!t) return '';
  const d = new Date(t),
    now = new Date();
  const hm = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return `Today ${hm}`;
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `Yesterday ${hm}`;
  return `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })} ${hm}`;
};
export const placeName = (p) => PLACE_NAMES[p] || p || '';
export const dayPeriod = (info) =>
  [`Day ${info.day || 1}`, periodName(info.period, info.day || 1)].filter(Boolean).join(' · ');

// what a slot shows under its place: the goal, else the line on screen
function currentLine() {
  if (ui.goalText) return ui.goalText;
  const t = document.querySelector('#talk');
  if (!t || t.hidden) return '';
  const who = t.querySelector('.who .nm')?.textContent || '';
  const line = (t.querySelector('.line')?.textContent || '').replace(/\s+/g, ' ').trim();
  return line ? (who ? `${who}: ${line}` : line).slice(0, 140) : '';
}

export function createSaving({ game, grab, openLayer, closeLayer, setPaused }) {
  const canSave = (g = game()) =>
    !!g?.place &&
    !g.runner?.recoveryError &&
    g.saveEnabled !== false &&
    !atTitle() &&
    !body().contains('title-leaving') &&
    !body().contains('reloading') &&
    !window.__ended;

  async function saveTo(id, thumb = null) {
    const g = game();
    if (!canSave(g)) return false;
    simSave(g);
    const data = kv.get(KEYS.SAVE);
    if (!data) return false;
    return store.write(id, {
      data,
      thumb: thumb || (await grab()),
      line: currentLine(),
      date: sim.date,
    });
  }

  // would loading now lose anything? (the game's state isn't in any quick or manual slot)
  function unsaved() {
    const g = game();
    if (!canSave(g)) return false;
    simSave(g);
    return !store.kept(kv.get(KEYS.SAVE));
  }

  // loading a save: it becomes the autosave, and the page restarts into it (the title's Continue does the rest)
  async function loadInto(info) {
    sfx('tap');
    const g = game();
    const wasEnabled = g ? g.saveEnabled : undefined;
    if (g) g.saveEnabled = false; // nothing in play may write over the save between here and the reload
    if (info.kind !== 'auto' && !(await store.adopt(info.id))) {
      if (g) g.saveEnabled = wasEnabled;
      return false;
    }
    const t = document.querySelector('#title');
    if (info.kind === 'auto' && t && !t.hidden && t.querySelector('.cont') && atTitle()) {
      // the autosave is what main.js already read: continue without a reload
      window.__shell?.closeLayers?.();
      t.querySelector('.cont').click();
      return true;
    }
    try {
      sessionStorage.setItem(KEYS.CONTINUE, '1');
    } catch {
      /* */
    }
    body().add('reloading');
    setTimeout(() => location.reload(), 250);
    return true;
  }

  // a small dialog over everything: true for the first button, false for the second, Esc or a tap outside
  function confirm({ title, where = '', text, yes, no = 'Cancel' }) {
    const g = game();
    const held = g && !g.paused;
    if (held) g.paused = true;
    const d = el(
      'div',
      'layer ask',
      `<div class="scrim" data-no></div>
      <section class="pane" role="alertdialog" aria-modal="true" aria-labelledby="askTitle" aria-describedby="askText">
        <h2 id="askTitle"></h2><p class="where"></p><p class="txt" id="askText"></p>
        <div class="mlist row2"><button type="button" class="yes"></button><button type="button" class="no primary" data-first></button></div>
      </section>`,
    );
    d.querySelector('h2').textContent = title;
    d.querySelector('.where').textContent = where;
    d.querySelector('.where').hidden = !where;
    d.querySelector('.txt').textContent = text;
    d.querySelector('.yes').textContent = yes;
    d.querySelector('.no').textContent = no;
    d.id = 'ask';
    document.querySelector('#ask')?.remove();
    return new Promise((res) => {
      let done = false;
      const finish = (v) => {
        if (done) return;
        done = true;
        if (held && g) g.paused = false;
        closeLayer(d);
        setTimeout(() => d.remove(), 200);
        res(v);
      };
      d.querySelector('.yes').onclick = () => finish(true);
      d.querySelectorAll('.no, [data-no]').forEach((b) => (b.onclick = () => finish(false)));
      d.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          const bs = [...d.querySelectorAll('button')];
          bs[(bs.indexOf(document.activeElement) + 1) % bs.length].focus();
          e.preventDefault();
        }
        e.stopPropagation();
      });
      openLayer(d, () => finish(false));
    });
  }

  // loading from play asks first when it would lose progress; at the title it just loads
  async function loadAsking(info) {
    if (
      unsaved() &&
      !(await confirm({
        title: info.kind === 'quick' ? 'Load your quick save?' : `Load ${info.label}?`,
        where: `${placeName(info.place)} · ${dayPeriod(info)} · saved ${fmtTime(info.at)}`,
        text: "Anything you've done since your last save is lost.",
        yes: 'Load',
        no: 'Keep playing',
      }))
    )
      return false;
    return loadInto(info);
  }

  let busy = false;
  async function quickSave() {
    const g = game();
    if (busy || !canSave(g)) return false;
    busy = true;
    try {
      const mid = !!(g.runner?.frames?.length || ui.talking);
      const ok = await saveTo('quick');
      if (window.__shell?.isPaused?.()) setPaused(false);
      sfx(ok ? 'ok' : 'tap');
      ui.toast(
        ok
          ? `<span class="qs">Quick saved</span>${mid ? `<small class="qsn">Loading it starts this ${ui.talking ? 'conversation' : 'scene'} again from the beginning.</small>` : ''}`
          : "Couldn't save: this browser isn't keeping data for the game.",
      );
      return ok;
    } finally {
      busy = false;
    }
  }
  async function quickLoad() {
    const info = store.info('quick');
    if (!info) {
      if (!atTitle()) ui.toast('No quick save yet. F5 or Quick save in the menu makes one.');
      return false;
    }
    return loadAsking(info);
  }

  // keep a note of when the autosave last changed, with a thumbnail, for the Continue card and the saves screen
  let lastAuto = null;
  function noteAutosave() {
    setInterval(async () => {
      const g = game();
      if (!g || !g.place || atTitle() || body().contains('reloading')) return;
      let raw = null;
      try {
        raw = localStorage.getItem(KEYS.SAVE);
      } catch {
        return;
      }
      if (!raw || raw === lastAuto) return;
      lastAuto = raw;
      await store.noteAuto({
        thumb: await grab(),
        date: sim.date,
        line: currentLine(),
      });
    }, 2500);
  }

  // the phone's quick save button, in the HUD before the menu button
  function addQuickChip(hud, before) {
    if (document.querySelector('#qsaveBtn')) return;
    const b = el(
      'button',
      'hchip utility',
      '<span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h9l3.5 3.5v13.5h-13z"/><path d="M8.5 3.5v4.5h6.5V3.5"/><path d="M12 11.5v6M9.3 14.8l2.7 2.7 2.7-2.7"/></svg></span>Quick save',
    );
    b.id = 'qsaveBtn';
    b.type = 'button';
    b.setAttribute('aria-label', 'Quick save');
    b.onclick = (e) => {
      e.stopPropagation();
      quickSave();
    };
    hud.insertBefore(b, hud.querySelector('#feedbackBtn') || before || null);
  }

  return {
    store,
    canSave,
    saveTo,
    loadInto,
    loadAsking,
    unsaved,
    confirm,
    quickSave,
    quickLoad,
    noteAutosave,
    addQuickChip,
  };
}
