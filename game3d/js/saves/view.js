// The saves screen (docs/game/controls-and-ui.md, Saves): save and load from one panel. In play it has Save and Load
// tabs; at the title it is Continue (load only). Save lists the quick slot, the autosave (it can't be written by
// hand) and the twelve slots; Load lists the saves there are. Each card: the picture taken when it was saved, the
// slot's name and the real time, the place, the day and period, and the goal or line. Replacing a save and loading
// over progress ask first (actions.js confirm). Export and Import (transfer.js) sit under the list: Export asks which
// save to write to a file, Import reads a file, checks it, and asks which slot it goes in. Desktop: a centred panel with two columns of cards; phone: a sheet
// from the bottom with one. The panel never grows past the screen (css/saves.css); the list scrolls inside it.
// Keys: arrows move through the cards (Up and Down by row), Left and Right or PageUp and PageDown change tab, Tab
// stays inside, Esc closes (menu.js).
//   const view = savesView({ saving, openLayer, closeLayer, trap, thumbNow }); view.open('save' | 'load')
import { sfx } from '../ui.js';
import { el } from '../ui/dom.js';
import { ALL_IDS, slotLabel } from './store.js';
import { fmtTime, placeName, dayPeriod } from './actions.js';
import { exportText, exportName, parseSave, saveFile, openFile } from './transfer.js';

const esc = (t) =>
  String(t || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
const X = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';

export function savesView({ saving, openLayer, closeLayer, trap, thumbNow }) {
  const { store } = saving;
  let s = null,
    mode = 'load',
    pick = null, // 'export' (which save goes to a file) or 'import' (which slot the file goes in)
    incoming = null; // the checked file waiting for its slot
  const inGame = () => !document.body.classList.contains('at-title') && !!window.__game?.place;

  function build() {
    if (s) return s;
    s = el(
      'div',
      'layer sheet',
      `<div class="scrim" data-close></div>
      <section class="pane" role="dialog" aria-modal="true" aria-labelledby="savesTitle">
        <header class="shead"><h2 id="savesTitle"></h2>
          <div class="modes" role="tablist" aria-label="Save or load"><button type="button" role="tab" data-mode="save">Save</button><button type="button" role="tab" data-mode="load">Load</button></div>
          <button type="button" class="x" data-close aria-label="Close">${X}</button></header>
        <div class="slots mlist" role="list"></div>
        <footer class="sfoot"><p class="note" aria-live="polite"></p>
          <div class="xfer"><button type="button" data-x="export">Export</button><button type="button" data-x="import">Import</button><button type="button" data-x="cancel">Cancel</button></div></footer>
      </section>`,
    );
    s.id = 'saves';
    s.hidden = true;
    document.body.appendChild(s);
    s.querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => closeLayer(s)));
    s.querySelectorAll('[data-mode]').forEach(
      (b) =>
        (b.onclick = () => {
          if (b.dataset.mode === mode) return;
          sfx('tap');
          pick = incoming = null;
          render(b.dataset.mode, { focusTab: true });
        }),
    );
    s.querySelector('[data-x="export"]').onclick = () => {
      sfx('tap');
      pick = 'export';
      render(mode, { note: 'Choose the save to export.' });
    };
    s.querySelector('[data-x="import"]').onclick = importFile;
    s.querySelector('[data-x="cancel"]').onclick = () => {
      sfx('tap');
      pick = incoming = null;
      render(mode);
    };
    s.addEventListener('keydown', keys);
    return s;
  }

  function keys(e) {
    const a = document.activeElement;
    const tabs = [...s.querySelectorAll('.modes button')].filter((b) => b.offsetParent !== null);
    if (
      tabs.length &&
      (e.key === 'PageUp' || e.key === 'PageDown' || (tabs.includes(a) && /^Arrow(Left|Right)$/.test(e.key)))
    ) {
      pick = incoming = null;
      render(mode === 'save' ? 'load' : 'save', { focusTab: tabs.includes(a) });
      sfx('tap');
      e.preventDefault();
    } else if (/^Arrow/.test(e.key) && (a?.classList.contains('slot') || tabs.includes(a))) {
      const cards = [...s.querySelectorAll('.slot:not([disabled])')];
      const cols = getComputedStyle(s.querySelector('.slots')).gridTemplateColumns.split(' ').length || 1;
      const all = [...s.querySelectorAll('.slot')];
      if (tabs.includes(a)) {
        if (e.key === 'ArrowDown') cards[0]?.focus();
      } else {
        const i = all.indexOf(a);
        const step = {
          ArrowLeft: -1,
          ArrowRight: 1,
          ArrowUp: -cols,
          ArrowDown: cols,
        }[e.key];
        let j = i + step;
        while (all[j] && all[j].disabled) j += step > 0 ? 1 : -1;
        if (all[j]) all[j].focus();
        else if (step < 0)
          (tabs.find((t) => t.getAttribute('aria-selected') === 'true') || s.querySelector('.x')).focus();
      }
      e.preventDefault();
    } else trap(s, e);
    e.stopPropagation();
  }

  function card(id, info) {
    const label = slotLabel(id);
    const b = el('button', 'slot' + (info ? '' : ' empty'));
    b.type = 'button';
    b.dataset.id = id;
    b.setAttribute('role', 'listitem');
    const empty =
      id === 'auto'
        ? 'Saves by itself at each new place'
        : pick === 'import'
          ? 'Empty. Import here'
          : mode === 'save'
            ? 'Empty. Save here'
            : 'Empty';
    b.innerHTML =
      `<span class="thumb"><span class="blank"></span></span><span class="meta">` +
      `<span class="top"><span class="nm">${label}</span>${info?.at ? `<span class="at">${esc(fmtTime(info.at))}</span>` : ''}</span>` +
      (info
        ? `<span class="pl">${esc(placeName(info.place))}</span><span class="tm">${esc(dayPeriod(info))}</span>` +
          (info.line ? `<span class="ln">${esc(info.line)}</span>` : '')
        : `<span class="pl dim">${empty}</span>`) +
      '</span>';
    b.setAttribute(
      'aria-label',
      info
        ? `${label}: ${placeName(info.place)}, ${dayPeriod(info)}${info.line ? ', ' + info.line : ''}${info.at ? ', saved ' + fmtTime(info.at) : ''}`
        : `${label}, ${empty}`,
    );
    if (info)
      store.thumb(id).then((src) => {
        if (!src || !b.isConnected) return;
        const img = new Image();
        img.alt = '';
        img.src = src;
        b.querySelector('.thumb').replaceChildren(img);
      });
    return b;
  }

  function render(m, { focusId = null, focusTab = false, note = '' } = {}) {
    build();
    mode = inGame() ? m : 'load';
    s.dataset.mode = mode;
    const game = inGame();
    s.querySelector('h2').textContent = game ? 'Saves' : 'Continue';
    s.querySelector('.modes').hidden = !game;
    s.querySelectorAll('.modes button').forEach((b) => {
      const on = b.dataset.mode === mode;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    const list = s.querySelector('.slots');
    list.innerHTML = '';
    s.dataset.pick = pick || '';
    const writing = pick === 'import' || (!pick && mode === 'save');
    for (const id of ALL_IDS) {
      const info = store.info(id);
      if (!writing && !info) continue;
      if (pick === 'import' && id === 'auto') continue;
      const c = card(id, info);
      if (writing && id === 'auto') c.disabled = true;
      c.onclick = () =>
        pick === 'export'
          ? exportSlot(id, info)
          : pick === 'import'
            ? importInto(id, info)
            : mode === 'save'
              ? saveInto(id, info)
              : saving.loadAsking(info);
      list.appendChild(c);
    }
    if (!list.children.length) list.appendChild(el('p', 'none', 'No saves yet.'));
    s.querySelector('.note').textContent = note;
    list.querySelectorAll('[data-first]').forEach((x) => delete x.dataset.first);
    const first = list.querySelector('.slot:not([disabled])');
    if (first) first.dataset.first = '';
    const want = focusTab
      ? s.querySelector('.modes [aria-selected="true"]')
      : focusId != null
        ? list.querySelector(`.slot[data-id="${focusId}"]`)
        : null;
    if (want) want.focus({ preventScroll: false });
    return s;
  }

  async function saveInto(id, info) {
    sfx('tap');
    if (
      info &&
      !(await saving.confirm({
        title: `Replace ${slotLabel(id)}?`,
        where: `${placeName(info.place)} · ${dayPeriod(info)} · saved ${fmtTime(info.at)}`,
        text: 'The save in this slot is replaced with your game now.',
        yes: 'Replace',
        no: 'Cancel',
      }))
    )
      return;
    const ok = await saving.saveTo(id, await thumbNow());
    if (ok) sfx('ok');
    render('save', {
      focusId: id,
      note: ok ? `Saved to ${slotLabel(id)}.` : "Couldn't save: this browser isn't keeping data for the game.",
    });
    if (ok) s.querySelector(`.slot[data-id="${id}"]`)?.classList.add('just');
  }

  async function exportSlot(id, info) {
    sfx('tap');
    pick = null;
    const r = await saveFile(exportName(info), exportText(info, await store.thumb(id))).catch((e) => ({
      ok: false,
      error: e?.message,
    }));
    render(mode, {
      focusId: id,
      note: r.ok ? `Exported ${slotLabel(id)}.` : r.canceled ? '' : "Couldn't write the file.",
    });
  }

  // the file picker opens from the click itself (a browser only allows it then)
  async function importFile() {
    sfx('tap');
    pick = incoming = null;
    const got = await openFile().catch(() => ({ ok: false }));
    if (!got.ok) return render(mode, { note: got.canceled ? '' : "Couldn't read the file." });
    const check = parseSave(got.text);
    if (!check.ok) return render(mode, { note: check.error });
    pick = 'import';
    incoming = check.slot;
    const d = check.slot.data;
    render(mode, {
      note: `Choose a slot for the imported save (${placeName(d.place)} · ${dayPeriod({ day: d.day, period: d.period })}).`,
    });
  }

  async function importInto(id, info) {
    sfx('tap');
    if (
      info &&
      !(await saving.confirm({
        title: `Replace ${slotLabel(id)}?`,
        where: `${placeName(info.place)} · ${dayPeriod(info)} · saved ${fmtTime(info.at)}`,
        text: 'The save in this slot is replaced with the imported one.',
        yes: 'Replace',
        no: 'Cancel',
      }))
    )
      return;
    const ok = !!incoming && (await store.write(id, incoming));
    pick = incoming = null;
    if (ok) sfx('ok');
    render('load', {
      focusId: id,
      note: ok ? `Imported into ${slotLabel(id)}.` : "Couldn't save: this browser isn't keeping data for the game.",
    });
    if (ok) s.querySelector(`.slot[data-id="${id}"]`)?.classList.add('just');
  }

  return {
    open(m) {
      pick = incoming = null;
      const v = render(m);
      openLayer(v, () => closeLayer(v));
    },
    render,
  };
}
