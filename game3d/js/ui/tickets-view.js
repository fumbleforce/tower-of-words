// The ticket app on Eric's computer: Amakawa's in-house repair ticket system, a plain company web page in a browser
// (Jørgen, 2026-10-03: "think japanese interfaces, corporate bad but simple design. Some japanese here, and
// learnable"). A blue header with the company mark, a breadcrumb, a thin-bordered zebra table of his tickets
// (No., 件名, 依頼者, 状態) and the ticket as a form table under it, a copyright footer. Desktop shows the list over
// the ticket; the phone shows one at a time, with 戻る Back. The labels are words (tickets/words.js) shown with their
// reading and English; tapping one, or using a button, teaches it. It teaches itself the first time: a tip over the
// list until he opens a ticket, and one by 担当する until he takes one. A panel (.panel), so Esc closes it (menu.js)
// and the game's input waits.
//   openTickets({ list, show, date, earned, name, read, take, learn, isKnown })   resolves when the page is closed
//     list() -> [{ id, title, from, text, pay, status, read }]; earned() -> yen paid for closed tickets;
//     name(id) -> a speaker's name; read(id) marks it read; take(id) -> true when it moved to in progress;
//     learn(id) -> true when the word is new to him; isKnown(id) -> whether he knows the word
import { lineHTML, WORDS } from '../lang.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const STATUS = { new: 'mitaio', progress: 'taiochu', done: 'kanryo' };
const phone = () => document.body.classList.contains('phone');
const yen = (n) => '¥' + n.toLocaleString('en');
const APP = 'Repair Tickets';
const URL = 'http://intra.amakawa.co.jp/shuri/list.do';

// a label: the Japanese with its reading over it, the short English after it. `tap` makes it teach itself on a tap.
function lab(id, { tap = true, en = WORDS[id].label } = {}) {
  const w = WORDS[id];
  const ja = `<ruby lang="ja">${w.ja}<rt>${w.ro}</rt></ruby>`;
  return tap
    ? `<span class="tkw" data-w="${id}" role="button" tabindex="0" title="${esc(w.ro)}: ${esc(w.en)}">${ja}<span class="en">${esc(en)}</span></span>`
    : `<span class="tkw">${ja}<span class="en">${esc(en)}</span></span>`;
}
const badge = (status, tap) => `<span class="tk-badge st-${status}">${lab(STATUS[status], { tap })}</span>`;

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
    `<div id="ticketsApp" class="panel tk" hidden>
      <div class="tk-url" aria-hidden="true"><span class="nav">◀ ▶ ↻</span><span class="addr">${URL}</span></div>
      <section class="tk-page" role="dialog" aria-label="${APP}">
        <header class="tk-head">
          <span class="tk-logo"><b lang="ja">天川</b><span>AMAKAWA<small>GROUP</small></span></span>
          <span class="tk-sys">${APP}<small>Ver.2.03</small></span>
          <button type="button" class="tk-btn tk-close" data-w="tojiru">${lab('tojiru', { tap: false })}</button>
        </header>
        <div class="tk-info"><span class="who">B2 IT · Eric</span><span class="sum"></span><span class="date"></span></div>
        <nav class="tk-crumb">
          <button type="button" class="tk-btn tk-back" data-w="modoru">${lab('modoru', { tap: false })}</button>
          <span class="path"></span>
        </nav>
        <div class="tk-main">
          <div class="tk-tip list-tip" hidden></div>
          <section class="tk-list">
            <h2 class="tk-h">Tickets <span class="cnt"></span></h2>
            <div class="tk-table" role="listbox" aria-label="Tickets">
              <div class="tk-row hdr"><span class="c-id">No.</span><span class="c-sub">${lab('kenmei')}</span><span class="c-from">${lab('iraisha')}</span><span class="c-st">${lab('jotai')}</span></div>
              <div class="tk-rows"></div>
            </div>
          </section>
          <article class="tk-detail"></article>
        </div>
        <div class="tk-learn" aria-live="polite"></div>
        <footer class="tk-foot">Copyright (C) 1996 Amakawa Group. All Rights Reserved.</footer>
      </section>
    </div>`,
  );
  return $('#ticketsApp');
}

export function openTickets({
  list,
  show,
  date,
  earned,
  name,
  read,
  take,
  learn = () => false,
  isKnown = () => false,
}) {
  const app = build();
  let sel = show || null;
  let mode = show ? 'detail' : 'list'; // the phone's one pane at a time

  const close = () => (app.hidden = true);
  const tickets = () => list();
  const cur = () => tickets().find((t) => t.id === sel) || null;

  // a label tapped or a button used: the word is his, and the line under the page says so
  function teach(id) {
    if (!WORDS[id] || !learn(id)) return;
    const w = WORDS[id];
    $('.tk-learn', app).innerHTML = `New word in your Words: <b lang="ja">${w.ja}</b> ${esc(w.ro)}, ${esc(w.en)}`;
    marks();
  }
  // known labels lose the dotted underline that says "tap me"; the hint goes once one is known
  function marks() {
    for (const el of app.querySelectorAll('.tkw[data-w]')) el.classList.toggle('kn', isKnown(el.dataset.w));
    const learnLine = $('.tk-learn', app);
    if (!learnLine.innerHTML && !Object.keys(WORDS).some((id) => WORDS[id].ui === 'tickets' && isKnown(id)))
      learnLine.textContent = `${phone() ? 'Tap' : 'Click'} a Japanese label to learn it.`;
  }

  function pick(id, open) {
    sel = id;
    if (id) read(id);
    if (open) mode = 'detail';
    render();
    if (open && phone()) $('.tk-main', app).scrollTop = 0;
  }

  function rowsHTML(all) {
    if (!all.length) return '<div class="empty">No tickets.</div>';
    return all
      .map(
        (t) =>
          `<button type="button" role="option" class="tk-row${t.id === sel ? ' on' : ''}${t.read ? '' : ' unread'} st-${t.status}" data-id="${esc(t.id)}" aria-selected="${t.id === sel}">` +
          `<span class="c-id">${esc(t.id)}</span><span class="c-sub">${esc(t.title)}</span>` +
          `<span class="c-from">${esc(name(t.from))}</span><span class="c-st">${badge(t.status, false)}</span></button>`,
      )
      .join('');
  }

  function detailHTML(t) {
    if (!t) return '<div class="none">Select a ticket to read it.</div>';
    const act =
      t.status === 'new'
        ? `<button type="button" class="tk-btn main take" data-w="tanto">${lab('tanto', { tap: false })}</button>`
        : `<span class="note">${t.status === 'done' ? 'Closed.' : 'On your list.'}</span>`;
    const pay = t.pay
      ? `<tr><th>${lab('hoshu')}</th><td class="pay">${yen(t.pay)}${t.status === 'done' ? ' <span class="paid">Paid</span>' : ''}</td></tr>`
      : '';
    return `<h2 class="tk-h d-head"><span class="d-id">${esc(t.id)}</span> Ticket</h2>
      <table class="tk-form d-meta">
        <tr><th>${lab('kenmei')}</th><td class="d-title">${esc(t.title)}</td></tr>
        <tr><th>${lab('iraisha')}</th><td>${esc(name(t.from))}</td></tr>
        <tr><th>${lab('jotai')}</th><td>${badge(t.status, true)}</td></tr>
        ${pay}
        <tr><th>Details</th><td class="d-text">${textHTML(t.text)}</td></tr>
      </table>
      <div class="d-act">${act}<div class="tk-tip take-tip" hidden></div></div>`;
  }

  function render() {
    const all = tickets();
    const t = cur();
    const onPhone = phone();
    app.classList.toggle('one', onPhone);
    app.dataset.mode = onPhone ? mode : 'both';
    $('.tk-rows', app).innerHTML = rowsHTML(all);
    $('.tk-detail', app).innerHTML = detailHTML(t);
    $('.path', app).innerHTML =
      `Top › Repair tickets${t && (!onPhone || mode === 'detail') ? ` › <b>${esc(t.id)}</b>` : ''}`;
    const open = all.filter((x) => x.status !== 'done').length;
    $('.cnt', app).textContent = `${all.length} ticket${all.length === 1 ? '' : 's'}, ${open} open`;
    $('.sum', app).textContent = `Paid to you: ${yen(earned())}`;
    // first use: how to open one, then what Take does
    const listTip = $('.list-tip', app);
    listTip.hidden = !all.length || all.some((x) => x.read) || (onPhone && mode === 'detail');
    listTip.textContent = onPhone ? 'Tap a ticket to read it.' : 'Click a ticket to read it.';
    const takeTip = $('.take-tip', app);
    if (takeTip && t?.status === 'new' && !all.some((x) => x.status === 'progress')) {
      takeTip.hidden = false;
      takeTip.textContent = 'Take ticket puts it on your list. It doesn’t have to be done today.';
    }
    for (const b of app.querySelectorAll('.tk-rows .tk-row')) b.onclick = () => pick(b.dataset.id, true);
    const tk = $('.d-act .take', app);
    if (tk)
      tk.onclick = () => {
        if (!take(t.id)) return;
        render();
        teach('tanto');
      };
    marks();
    if (sel && !onPhone) $('.tk-rows .on', app)?.scrollIntoView({ block: 'nearest' });
  }

  // the page's controls
  $('.tk-close', app).onclick = () => {
    teach('tojiru');
    close();
  };
  $('.tk-back', app).onclick = () => {
    mode = 'list';
    render();
    teach('modoru');
  };
  // a tapped label teaches its word (the rows' badges don't: a tap there opens the ticket)
  const tapWord = (e) => {
    const w = e.target.closest('.tkw[data-w]');
    if (!w) return false;
    e.preventDefault();
    e.stopPropagation();
    teach(w.dataset.w);
    return true;
  };
  app.onclick = tapWord;
  // arrow keys move through the list on a keyboard; Enter or Space on a label teaches it
  app.onkeydown = (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && tapWord(e)) return;
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const ids = tickets().map((t) => t.id);
    if (!ids.length) return;
    e.preventDefault();
    const i = ids.indexOf(sel);
    pick(ids[Math.max(0, Math.min(ids.length - 1, i < 0 ? 0 : i + (e.key === 'ArrowDown' ? 1 : -1)))], false);
  };

  $('.tk-learn', app).textContent = '';
  $('.date', app).textContent = date || '';
  if (show) read(show);
  render();
  app.hidden = false;
  app.classList.remove('in');
  void app.offsetWidth;
  app.classList.add('in');
  const page = $('.tk-page', app);
  page.tabIndex = -1;
  page.focus({ preventScroll: true });
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
