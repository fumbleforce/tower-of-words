// The finds on screen (js/finds/index.js): the Photos chip in the HUD with its count ("Photos 2/5"), the album on
// Eric's phone (the photos he has, empty frames for the rest, and the papers he kept), the close look at one find
// when he picks it up or taps it in the album, and a notice board's posts held up close. All are panels (.panel):
// they sit over the HUD, Esc closes them (menu.js), and the close looks close on any tap.
//   setFindsSource(fn)   fn() -> { photos: [{ id, title, caption, found, print }], papers: [...], count, total }
//   refreshFinds(newId)  updates the chip (and pops it when newId was just found)
//   showFind(id, { fresh })   the close look; resolves when it closes
//   showBoard(posts)          the posts pinned on a board; resolves when it closes
import { drawPrint, drawFlyerHead } from '../finds/prints.js';

let source = () => ({ photos: [], papers: [], count: 0, total: 0 });
export function setFindsSource(fn) {
  source = fn;
}
const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const ICON =
  '<svg viewBox="0 0 24 24"><rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M3.5 15.5l5-4.5 4 3.5 3-2.5 5 4"/><circle cx="15.5" cy="9.5" r="1.4"/></svg>';

function build() {
  if ($('#photosBtn') || !$('#hud')) return !!$('#photosBtn');
  const chip = document.createElement('button');
  chip.id = 'photosBtn';
  chip.className = 'hchip';
  chip.type = 'button';
  chip.hidden = true;
  chip.setAttribute('aria-label', 'Photos');
  chip.innerHTML = `<span class="ic">${ICON}</span><span class="lbl">Photos</span><span class="n">0</span>`;
  $('#hud').insertBefore(chip, $('#muteBtn'));
  chip.onclick = () => openAlbum();
  const ui = $('#ui');
  ui.insertAdjacentHTML(
    'beforeend',
    `<div id="photosPanel" class="panel" hidden><div class="card"><div class="head">Photos <span class="cnt"></span></div><div class="album"></div><div class="papers"></div><button type="button" class="close">Close</button></div></div>
     <div id="findView" class="panel look" hidden><div class="shot"></div></div>
     <div id="boardView" class="panel look" hidden><div class="cork"><div class="posts"></div></div><p class="tapx">Tap to close</p></div>`,
  );
  $('#photosPanel .close').onclick = () => ($('#photosPanel').hidden = true);
  $('#photosPanel').addEventListener('click', (e) => {
    if (e.target.id === 'photosPanel') $('#photosPanel').hidden = true;
  });
  for (const id of ['#findView', '#boardView']) $(id).addEventListener('click', () => ($(id).hidden = true));
  return true;
}

export function refreshFinds(newId) {
  if (!build()) return;
  const s = source();
  const chip = $('#photosBtn');
  const any = s.count || s.papers.some((p) => p.found);
  chip.hidden = !any;
  chip.querySelector('.n').textContent = `${s.count}/${s.total}`;
  if (newId) {
    chip.classList.remove('gain');
    void chip.offsetWidth;
    chip.classList.add('gain');
  }
}

function picture(f, w, h) {
  const cv = f.print === 'flyer' ? drawFlyerHead(w, Math.round(w * 0.42)) : drawPrint(f.print, w, h);
  cv.className = 'pic';
  return cv;
}

function openAlbum() {
  const s = source();
  const p = $('#photosPanel');
  p.querySelector('.cnt').textContent = `${s.count}/${s.total}`;
  const album = p.querySelector('.album');
  album.innerHTML = '';
  for (const f of s.photos) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = f.found ? 'slot got' : 'slot';
    if (f.found) {
      b.appendChild(picture(f, 240, 180));
      b.insertAdjacentHTML('beforeend', `<span class="t">${esc(f.title)}</span>`);
      b.onclick = () => showFind(f.id).then(openAlbum); // back to the album after
    } else {
      b.disabled = true;
      b.setAttribute('aria-label', 'Not found yet');
      b.innerHTML = '<span class="q">?</span>';
    }
    album.appendChild(b);
  }
  const papers = s.papers.filter((x) => x.found);
  const pp = p.querySelector('.papers');
  pp.innerHTML = papers.length ? '<div class="sub">Papers</div>' : '';
  for (const f of papers) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'paper-row';
    b.textContent = f.title;
    b.onclick = () => showFind(f.id).then(openAlbum); // back to the album after
    pp.appendChild(b);
  }
  p.hidden = false;
}

// resolves when the panel is hidden (a tap on it, Esc in menu.js, or a test)
function whenHidden(el) {
  return new Promise((res) => {
    const mo = new MutationObserver(() => {
      if (el.hidden) {
        mo.disconnect();
        res();
      }
    });
    mo.observe(el, { attributes: true, attributeFilter: ['hidden'] });
  });
}

const lines = (list) =>
  (list || [])
    .map(
      (l) =>
        `<p class="ln">${l.ja ? `<span class="ja" lang="ja">${esc(l.ja)}</span>` : ''}${l.en ? `<span class="en">${esc(l.en)}</span>` : ''}</p>`,
    )
    .join('');

export function showFind(id, { fresh = false } = {}) {
  build();
  const s = source();
  const f = [...s.photos, ...s.papers].find((x) => x.id === id);
  if (!f) return Promise.resolve();
  const v = $('#findView');
  const shot = v.querySelector('.shot');
  shot.className = `shot ${f.kind}`;
  shot.innerHTML = '';
  const frame = document.createElement('div');
  frame.className = 'frame';
  frame.appendChild(picture(f, 640, 480));
  if (f.kind === 'paper') frame.insertAdjacentHTML('beforeend', lines(f.lines));
  shot.appendChild(frame);
  const n = s.photos.findIndex((x) => x.id === id);
  const note = !fresh
    ? ''
    : f.kind === 'photo'
      ? `Added to Photos · ${s.count} of ${s.total}`
      : 'Taken. It stays in Photos, under Papers.';
  shot.insertAdjacentHTML(
    'beforeend',
    `<div class="cap"><div class="t">${esc(f.title)}</div>${f.caption ? `<div class="c">${esc(f.caption)}</div>` : ''}${note ? `<div class="got">${esc(note)}</div>` : ''}</div>`,
  );
  shot.style.setProperty('--tilt', `${n % 2 ? 1.2 : -1.4}deg`);
  $('#photosPanel').hidden = true;
  v.hidden = false;
  v.classList.remove('in');
  void v.offsetWidth;
  v.classList.add('in');
  return whenHidden(v);
}

// posts: [{ title, ja, en, lines: [{ ja, en }], color }]; laid out as papers pinned in a loose grid
const COLORS = { white: '#f1efe8', yellow: '#ece1b0', blue: '#cfe0e9', pink: '#eed2d2', green: '#d9e6cc' };
const ORDER = ['white', 'yellow', 'blue', 'white', 'pink', 'green'];
export function showBoard(posts) {
  build();
  const v = $('#boardView');
  const box = v.querySelector('.posts');
  box.innerHTML = '';
  v.style.setProperty('--cols', posts.length <= 4 ? 2 : 3); // four as two rows of two, not three and one
  posts.slice(0, 6).forEach((p, i) => {
    const d = document.createElement('div');
    d.className = 'post';
    d.style.setProperty('--bg', COLORS[p.color] || COLORS[ORDER[i % ORDER.length]]);
    d.style.setProperty('--tilt', `${[-1.6, 1.1, -0.6, 1.7, -1.2, 0.8][i % 6]}deg`);
    d.innerHTML =
      '<i class="pin"></i>' +
      (p.title ? `<div class="pt">${esc(p.title)}</div>` : '') +
      lines(p.lines || [{ ja: p.ja, en: p.en }]);
    box.appendChild(d);
  });
  v.hidden = false;
  v.classList.remove('in');
  void v.offsetWidth;
  v.classList.add('in');
  return whenHidden(v);
}
