// The ticket app on Eric's computer: a Windows 95-style window on a teal desktop with a taskbar, a list of his
// tickets (ID, Subject, From, Status) and the ticket itself. Desktop shows the list over the ticket; the phone shows
// one at a time, with Back. It teaches itself the first time: a yellow tip over the list until he opens a ticket,
// and one by Take ticket until he takes one. A panel (.panel), so Esc closes it (menu.js) and the game's input waits.
//   openTickets({ list, show, date, earned, name, read, take })   resolves when the window is closed
//     list() -> [{ id, title, from, text, pay, status, read }]; earned() -> yen paid for closed tickets; name(id) -> a speaker's name; read(id) marks it read;
//     take(id) -> true when it moved to in progress
import { lineHTML } from '../lang.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const STATUS = { new: 'New', progress: 'In progress', done: 'Done' };
const phone = () => document.body.classList.contains('phone');
const yen = (n) => '¥' + n.toLocaleString('en');
const APP = 'Repair Tickets';
// a small ticket icon in the title bar and on the taskbar button: a slip with a punched hole and two lines
const ICON =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3h12v3a2 2 0 0 0 0 4v3H2v-3a2 2 0 0 0 0-4z" fill="#fff" stroke="#000"/><path d="M5 6h6M5 9h4" stroke="#000080"/></svg>';
const LOGO =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 2l6-1v6H1z" fill="#e2412b"/><path d="M8 1l7-1v7H8z" fill="#3aa83a"/><path d="M1 8h6v6l-6-1z" fill="#2a63d4"/><path d="M8 8h7v7l-7-1z" fill="#f2c118"/></svg>';

// Shut down: a monitor going dark
const POWER =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="2.5" width="13" height="9" fill="#000" stroke="#555"/><path d="M5 14h6M8 11.5V14" stroke="#000"/></svg>';

// Japanese in a ticket: {id} for a word in lang.js, or {ja|romaji|english} written out for a one-off
function textHTML(text) {
  return String(text || '')
    .split(/\n\s*\n/)
    .map((p) => {
      const parts = p.split(/(\{[^{}|]+\|[^{}|]+\|[^{}|]+\})/);
      const html = parts
        .map((s) => {
          const m = /^\{([^{}|]+)\|([^{}|]+)\|([^{}|]+)\}$/.exec(s);
          return m
            ? `<span class="jp" lang="ja">${esc(m[1])}</span> <span class="gl">(${esc(m[2])}, ${esc(m[3])})</span>`
            : lineHTML(s);
        })
        .join('');
      return `<p>${html}</p>`;
    })
    .join('');
}

function build() {
  if ($('#ticketsApp')) return $('#ticketsApp');
  $('#ui').insertAdjacentHTML(
    'beforeend',
    `<div id="ticketsApp" class="panel w95" hidden>
      <div class="w95-desk">
        <section class="w95-win" role="dialog" aria-label="${APP}">
          <header class="w95-title"><span class="ico">${ICON}</span><span class="t">${APP}</span>
            <span class="w95-ctl"><button type="button" class="min" aria-label="Minimise"><i></i></button><button type="button" class="max" aria-label="Maximise"><i></i></button><button type="button" class="x" aria-label="Close">×</button></span>
          </header>
          <nav class="w95-tools">
            <button type="button" class="w95-btn back">‹ Back</button>
            <span class="w95-path"></span>
            <button type="button" class="w95-btn close">Close</button>
          </nav>
          <div class="w95-body">
            <div class="w95-tip list-tip" hidden></div>
            <div class="w95-list sunk" role="listbox" aria-label="Tickets">
              <div class="w95-row hdr" aria-hidden="true"><span class="c-id">ID</span><span class="c-sub">Subject</span><span class="c-from">From</span><span class="c-st">Status</span></div>
              <div class="rows"></div>
            </div>
            <article class="w95-detail sunk"></article>
          </div>
          <footer class="w95-status"><span class="f1 sunk"></span><span class="f2 sunk"></span></footer>
        </section>
      </div>
      <div class="w95-bar">
        <button type="button" class="w95-btn start">${LOGO}<b>Start</b></button>
        <button type="button" class="w95-btn task">${ICON}<span>${APP}</span></button>
        <span class="clock sunk"></span>
        <div class="w95-menu" hidden><div class="side"><b>Amakawa</b>95</div><div class="items">
          <button type="button" class="restore">${ICON}<span>${APP}</span></button>
          <button type="button" class="off">${POWER}<span>Shut down…</span></button>
        </div></div>
      </div>
    </div>`,
  );
  return $('#ticketsApp');
}

export function openTickets({ list, show, date, earned, name, read, take }) {
  const app = build();
  const win = $('.w95-win', app);
  const menu = $('.w95-menu', app);
  let sel = show || null;
  let mode = show ? 'detail' : 'list'; // the phone's one pane at a time

  const close = () => (app.hidden = true);
  const tickets = () => list();
  const cur = () => tickets().find((t) => t.id === sel) || null;

  function pick(id, open) {
    sel = id;
    if (id) read(id);
    if (open) mode = 'detail';
    render();
    if (open && phone()) $('.w95-detail', app).scrollTop = 0;
  }

  function rowsHTML(all) {
    if (!all.length) return '<div class="empty">No tickets.</div>';
    return all
      .map(
        (t) =>
          `<button type="button" role="option" class="w95-row${t.id === sel ? ' on' : ''}${t.read ? '' : ' unread'} st-${t.status}" data-id="${esc(t.id)}" aria-selected="${t.id === sel}">` +
          `<span class="c-id">${esc(t.id)}</span><span class="c-sub">${esc(t.title)}</span>` +
          `<span class="c-from">${esc(name(t.from))}</span><span class="c-st"><i class="dot"></i>${STATUS[t.status]}</span></button>`,
      )
      .join('');
  }

  function detailHTML(t) {
    if (!t) return '<div class="none">Select a ticket to read it.</div>';
    const act =
      t.status === 'new'
        ? `<button type="button" class="w95-btn take">Take ticket</button>`
        : `<div class="note">${t.status === 'done' ? 'Closed.' : 'On your list.'}</div>`;
    return `<div class="d-head"><span class="d-id">${esc(t.id)}</span><h3>${esc(t.title)}</h3></div>
      <dl class="d-meta"><dt>From</dt><dd>${esc(name(t.from))}</dd><dt>Status</dt><dd class="st-${t.status}"><i class="dot"></i>${STATUS[t.status]}</dd>${t.pay ? `<dt>${t.status === 'done' ? 'Paid' : 'Pays'}</dt><dd class="pay">${yen(t.pay)}</dd>` : ''}</dl>
      <div class="d-text">${textHTML(t.text)}</div>
      <div class="d-act">${act}<div class="w95-tip take-tip" hidden></div></div>`;
  }

  function render() {
    const all = tickets();
    const t = cur();
    const onPhone = phone();
    app.classList.toggle('one', onPhone);
    app.dataset.mode = onPhone ? mode : 'both';
    $('.rows', app).innerHTML = rowsHTML(all);
    $('.w95-detail', app).innerHTML = detailHTML(t);
    $('.w95-path', app).textContent = onPhone && mode === 'detail' && t ? t.id : '';
    const open = all.filter((x) => x.status !== 'done').length;
    $('.f1', app).textContent = `${all.length} ticket${all.length === 1 ? '' : 's'}, ${open} open`;
    $('.f2', app).textContent = `Paid to you: ${yen(earned())}`;
    // first use: how to open one, then what Take does
    const listTip = $('.list-tip', app);
    listTip.hidden = !all.length || all.some((x) => x.read) || (onPhone && mode === 'detail');
    listTip.textContent = onPhone ? 'Tap a ticket to read it.' : 'Click a ticket to read it.';
    const takeTip = $('.take-tip', app);
    if (takeTip && t?.status === 'new' && !all.some((x) => x.status === 'progress')) {
      takeTip.hidden = false;
      takeTip.textContent = 'Take ticket puts it on your list. It doesn’t have to be done today.';
    }
    for (const b of app.querySelectorAll('.rows .w95-row')) b.onclick = () => pick(b.dataset.id, true);
    const tk = $('.d-act .take', app);
    if (tk) tk.onclick = () => take(t.id) && render();
    if (sel && !onPhone) $('.rows .on', app)?.scrollIntoView({ block: 'nearest' });
  }

  // the window's controls
  $('.x', app).onclick = close;
  $('.w95-tools .close', app).onclick = close;
  $('.back', app).onclick = () => {
    mode = 'list';
    render();
  };
  $('.max', app).onclick = () => win.classList.toggle('maxed');
  $('.min', app).onclick = () => {
    win.hidden = true;
    $('.task', app).classList.remove('on');
  };
  const restore = () => {
    win.hidden = false;
    menu.hidden = true;
    $('.task', app).classList.add('on');
  };
  $('.task', app).onclick = () => (win.hidden ? restore() : $('.min', app).click());
  $('.start', app).onclick = (e) => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
    $('.start', app).classList.toggle('on', !menu.hidden);
  };
  $('.restore', menu).onclick = restore;
  $('.off', menu).onclick = close;
  app.onclick = (e) => {
    if (!menu.hidden && !e.target.closest('.w95-menu, .start')) {
      menu.hidden = true;
      $('.start', app).classList.remove('on');
    }
  };
  // arrow keys move through the list on a keyboard; Enter opens the selected one on the phone layout
  app.onkeydown = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const ids = tickets().map((t) => t.id);
    if (!ids.length) return;
    e.preventDefault();
    const i = ids.indexOf(sel);
    pick(ids[Math.max(0, Math.min(ids.length - 1, i < 0 ? 0 : i + (e.key === 'ArrowDown' ? 1 : -1)))], false);
  };

  win.hidden = false;
  win.classList.remove('maxed');
  menu.hidden = true;
  $('.task', app).classList.add('on');
  $('.start', app).classList.remove('on');
  $('.clock', app).textContent = date || '';
  if (show) read(show);
  render();
  app.hidden = false;
  app.classList.remove('in');
  void app.offsetWidth;
  app.classList.add('in');
  win.tabIndex = -1;
  win.focus({ preventScroll: true });
  return new Promise((res) => {
    const mo = new MutationObserver(() => {
      if (app.hidden) {
        mo.disconnect();
        res();
      }
    });
    mo.observe(app, { attributes: true, attributeFilter: ['hidden'] });
  });
}
