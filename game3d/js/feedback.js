// The feedback window (Jørgen, 2026-09-29, review productivity-review: "a feedback window to give in-app feedback
// rather than having to screenshot and post to claude, just a modal with text field and send, that also takes a
// screenshot there and then"). F8 or the note button in the HUD opens it and the game pauses behind it. The
// screenshot (the world and the HUD as they are at that moment) is taken before the window draws. Send posts the
// text, the screenshot and where the game is to tools/review_server.py (POST /api/feedback), which saves them in
// notes/feedback-game/<time>/ and logs the text in notes/feedback-log/.
//
// index.html loads this module only on a local address, before main.js and menu.js, so that while the window is
// open its key listener runs first and no key reaches the game or the menus. The button and F8 only work when
// the server answers GET /api/feedback (./start); tests and captures leave it off unless the URL has ?feedback.

import { capture } from './feedback/capture.js';

const Q = new URLSearchParams(location.search);
const QUIET = (Q.has('test') || Q.has('cap') || Q.has('shell')) && !Q.has('feedback');
const $ = (s, r = document) => r.querySelector(s);
const game = () => window.__game;
const ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h11M4 10.5h8M4 15h5"/><path d="M12.5 20v-2.7l6.4-6.4a1.9 1.9 0 0 1 2.7 2.7l-6.4 6.4z"/></svg>';
const X_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const SEND_TIMEOUT = 10000; // a server that never answers must not keep the window (and the paused game) stuck
const TEXT_FIELD = /^(text|search|email|url|tel|number)$/;
const PLACES = {
  train: 'Monorail',
  gate: 'Head office lobby',
  office: 'IT support, B2',
};

let available = false,
  isOpen = false,
  busy = false,
  sending = null, // the AbortController of the send in flight
  sent = false,
  wasPaused = false,
  draft = '',
  shot = null,
  ctx = null,
  layer = null,
  shotUrl = '',
  releaseView = null;

// ---------- where the game is ----------
async function gather() {
  const g = game();
  let sim = null,
    names = {};
  try {
    ({ sim, PERIOD_NAMES: names } = await import('./sim.js'));
  } catch {
    /* the title before the game has loaded */
  }
  const p = g?.player?.root?.position,
    talk = $('#talk'),
    b = document.body;
  const round = (v) => Math.round(v * 100) / 100;
  return {
    time: new Date().toISOString(),
    build: window.BUILD || '',
    url: location.pathname + location.search,
    screen: b.classList.contains('at-title') ? 'title' : window.__ended ? 'end of day' : 'playing',
    place: g?.place?.name || b.dataset.place || '',
    placeName: PLACES[g?.place?.name] || '',
    period: sim?.period || '',
    periodName: names[sim?.period] || '',
    date: sim?.date || '',
    node: g?.runner?.currentNode || '',
    nodeStack: (g?.runner?.frames || []).map((f) => f.node),
    goal: g?.ui?.goalText || '',
    line:
      talk && !talk.hidden
        ? {
            who: $('.who', talk)?.textContent.trim() || '',
            text: $('.line', talk)?.textContent.trim() || '',
          }
        : null,
    // what the player has typed and not yet sent (the romaji practice answer), which a screenshot alone can lose
    typed: [...document.querySelectorAll('input, textarea')]
      .filter(
        (el) =>
          !layer?.contains(el) &&
          el.value &&
          el.getClientRects().length &&
          (el.tagName === 'TEXTAREA' || TEXT_FIELD.test(el.type)),
      )
      .map((el) => ({
        field: el.getAttribute('aria-label') || el.placeholder || el.className,
        value: el.value,
      })),
    near: g?.near?.label || g?.near?.id || '',
    busy: !!g?.busy,
    player: p
      ? {
          x: round(p.x),
          y: round(p.y),
          z: round(p.z),
          heading: round(g.player.root.rotation.y),
        }
      : null,
    viewport: {
      width: innerWidth,
      height: innerHeight,
      dpr: devicePixelRatio,
      layout: b.classList.contains('phone') ? 'phone' : 'desktop',
    },
    userAgent: navigator.userAgent,
  };
}

// ---------- the window ----------
function build() {
  if (layer) return layer;
  layer = document.createElement('div');
  layer.id = 'feedback';
  layer.className = 'layer sheet';
  layer.hidden = true;
  layer.innerHTML = `<div class="scrim"></div>
    <section class="pane" role="dialog" aria-modal="true" aria-labelledby="fbTitle">
      <header><h2 id="fbTitle">Feedback</h2><button type="button" class="x" aria-label="Close">${X_ICON}</button></header>
      <div class="fb-body">
        <textarea rows="5" aria-label="Your feedback" placeholder="What did you notice?"></textarea>
        <figure class="fb-shot"><img alt="The screenshot that goes with it"><figcaption><span class="cap"></span><span class="where"></span></figcaption></figure>
        <p class="fb-status" role="status"></p>
      </div>
      <footer><button type="button" class="done">Send</button><p class="keys">Ctrl+Enter sends · Esc closes</p></footer>
    </section>`;
  document.body.appendChild(layer);
  $('.x', layer).onclick = close;
  $('.scrim', layer).onclick = close;
  $('.done', layer).onclick = () => (sent ? close() : send());
  return layer;
}

function status(msg, kind = '') {
  const s = $('.fb-status', layer);
  s.textContent = msg;
  s.className = 'fb-status ' + kind;
}

async function open() {
  if (isOpen || !available) return;
  isOpen = true;
  const g = game();
  wasPaused = !!g?.paused;
  releaseView = g?.followCamera?.holdView();
  if (g && !wasPaused) setPause(true);
  const [c, cap] = await Promise.all([gather(), capture(layer)]);
  ctx = c;
  shot = cap;
  if (!isOpen) return;
  build();
  sent = false;
  const ta = $('textarea', layer);
  ta.disabled = false;
  ta.value = draft;
  $('.done', layer).textContent = 'Send';
  if (shotUrl) URL.revokeObjectURL(shotUrl);
  shotUrl = shot ? URL.createObjectURL(shot.blob) : '';
  const img = $('.fb-shot img', layer);
  img.hidden = !shot;
  img.src = shotUrl;
  $('.fb-shot .cap', layer).textContent = shot
    ? 'A screenshot of this moment goes with it.'
    : 'The screenshot failed; the text still sends.';
  $('.fb-shot .where', layer).textContent = [
    ctx.placeName || ctx.screen,
    ctx.periodName || ctx.period,
    'build ' + ctx.build,
  ]
    .filter(Boolean)
    .join(' · ');
  status('');
  layer.hidden = false;
  layer.classList.remove('out');
  void layer.offsetWidth;
  layer.classList.add('in');
  ta.focus({ preventScroll: true });
}

function close() {
  if (!isOpen) return;
  sending?.abort('closed'); // closing while it sends gives up on the send; the text stays as the draft
  isOpen = false;
  if (layer && !layer.hidden) {
    const ta = $('textarea', layer);
    if (!sent) draft = ta.value;
    layer.classList.remove('in');
    layer.classList.add('out');
    setTimeout(() => {
      if (!isOpen) layer.hidden = true;
    }, 180);
  }
  // the pause menu may have opened underneath (the tab went to the background); it keeps the game paused
  if (!wasPaused && !window.__shell?.isPaused?.()) setPause(false);
  releaseView?.();
  releaseView = null;
  $('#c')?.focus({ preventScroll: true });
}

function setPause(on) {
  const g = game();
  if (g) g.paused = on;
  document.body.classList.toggle('paused', on);
  import('./ui.js').then((m) => m.pauseAudio(on)).catch(() => {});
}

async function send() {
  if (busy || sent || !layer) return;
  const ta = $('textarea', layer),
    btn = $('.done', layer);
  const text = ta.value.trim();
  if (!text) {
    status('Write something first.', 'bad');
    ta.focus();
    return;
  }
  busy = true;
  btn.disabled = true;
  btn.classList.add('sending');
  btn.textContent = 'Sending…';
  status('Sending…');
  const ac = new AbortController();
  sending = ac;
  const timer = setTimeout(() => ac.abort('timeout'), SEND_TIMEOUT);
  try {
    const data = shot
      ? await new Promise((res, rej) => {
          const fr = new FileReader();
          fr.onload = () => res(fr.result);
          fr.onerror = rej;
          fr.readAsDataURL(shot.blob);
        })
      : null;
    const r = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, shot: data, context: ctx }),
      signal: ac.signal,
    });
    const j = await r.json().catch(() => ({}));
    if (ac.signal.aborted) throw new Error('aborted');
    if (!r.ok || !j.ok) throw new Error(j.error || `the server answered ${r.status}`);
    sent = true;
    draft = '';
    ta.disabled = true;
    btn.textContent = 'Back to the game';
    status(`Sent. Saved in ${j.folder}/`, 'ok');
  } catch (err) {
    draft = ta.value; // kept for the next try, here or after closing
    if (ac.signal.reason === 'timeout')
      status(
        `Not sent: the server didn't answer in ${SEND_TIMEOUT / 1000} s. Send again, or close and try later.`,
        'bad',
      );
    else if (ac.signal.reason !== 'closed') status(`Not sent (${err.message}). Is ./start running?`, 'bad');
  } finally {
    clearTimeout(timer);
    if (sending === ac) sending = null;
    busy = false;
    btn.disabled = false;
    btn.classList.remove('sending');
    if (!sent) btn.textContent = 'Send';
    if (sent) btn.focus();
  }
}

// ---------- keys, pointer and the HUD button ----------
addEventListener(
  'keydown',
  (e) => {
    if (!available) return;
    if (e.code === 'F8') {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!e.repeat) isOpen ? close() : open();
      return;
    }
    if (!isOpen) return;
    // nothing reaches the game or the menus while the window is open; typing still goes into the text field
    e.stopImmediatePropagation();
    if (e.code === 'Escape') {
      e.preventDefault();
      close();
    } else if ((e.code === 'Enter' || e.code === 'NumpadEnter') && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      sent ? close() : send();
    } else if (e.key === 'Tab' && layer) {
      const f = [...layer.querySelectorAll('textarea:not([disabled]), button:not([disabled])')];
      const i = f.indexOf(document.activeElement);
      f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length]?.focus();
      e.preventDefault();
    }
  },
  true,
);
// taps inside the window don't count as taps on the game (main.js hurries scripted moves on any pointerdown)
for (const t of ['pointerdown', 'mousedown', 'touchstart'])
  addEventListener(
    t,
    (e) => {
      if (isOpen && layer && layer.contains(e.target)) e.stopImmediatePropagation();
    },
    { capture: true, passive: true },
  );

function addButton() {
  const hud = $('#hud');
  if (!hud) return setTimeout(addButton, 250);
  if ($('#feedbackBtn')) return;
  const b = document.createElement('button');
  b.id = 'feedbackBtn';
  b.className = 'hchip icon';
  b.type = 'button';
  b.title = 'Feedback (F8)';
  b.setAttribute('aria-label', 'Send feedback');
  b.innerHTML = ICON;
  b.onclick = (e) => {
    e.stopPropagation();
    open();
  };
  hud.insertBefore(b, $('#pauseBtn', hud));
}

async function probe() {
  if (QUIET) return;
  try {
    const r = await fetch('/api/feedback', { cache: 'no-store' });
    available = r.ok && (await r.json()).ok === true;
  } catch {
    available = false;
  }
  if (!available) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/feedback.css?v=' + encodeURIComponent(window.BUILD || '');
  document.head.appendChild(link);
  addButton();
}
probe();
window.__feedback = {
  open,
  close,
  send,
  isOpen: () => isOpen,
  available: () => available,
};
