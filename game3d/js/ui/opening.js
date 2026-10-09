// The anime opening (game3d/opening/, to the opening theme) over the title, in a frame of its own. It plays once on
// a player's first visit, before the title menu (from its own Play button, since a browser only lets sound start
// after a tap), and again from the title menu's Opening item. It ends by pushing in on the train to the title's own
// framing and fading to black, and the title fades up from there. The game's sound pauses under it; its own Skip,
// Esc or its end closes it.
import { pauseAudio } from '../audio/core.js';
import { sfx } from '../ui.js';
import { el } from './dom.js';

const SEEN = 'amakawa.openingSeen';

// gate: wait for the opening's own Play button (no tap has happened yet to allow its sound)
export function playOpening({ gate = false } = {}) {
  if (document.getElementById('opening')) return;
  const back = document.activeElement;
  const wrap = document.createElement('div');
  wrap.id = 'opening';
  const frame = document.createElement('iframe');
  frame.src = `opening/index.html?embed${gate ? '&gate' : ''}&v=${encodeURIComponent(window.BUILD || '')}`;
  frame.allow = 'autoplay; fullscreen';
  frame.title = 'Opening';
  wrap.append(frame);
  document.body.append(wrap);
  pauseAudio(true);
  frame.addEventListener('load', () => frame.contentWindow?.focus());
  try {
    localStorage.setItem(SEEN, '1');
  } catch {
    /* storage blocked: it may show again next visit */
  }
  function done(e) {
    if (e.source !== frame.contentWindow || e.data?.opening !== 'done') return;
    removeEventListener('message', done);
    wrap.classList.add('out');
    setTimeout(() => wrap.remove(), 900);
    pauseAudio(false);
    back?.focus?.();
  }
  addEventListener('message', done);
}

// on the first visit only, and never in a test or capture run (the QA tools drive the title themselves)
function firstVisit() {
  const q = new URLSearchParams(location.search);
  if (navigator.webdriver || ['test', 'cap', 'shell', 'day', 'map'].some((k) => q.has(k))) return;
  let seen = true;
  try {
    seen = localStorage.getItem(SEEN) === '1';
  } catch {
    /* storage blocked: skip it rather than show it on every visit */
  }
  if (!seen) playOpening({ gate: true });
}

// the title menu's Opening item; building it (with the title) is also when the first visit's opening starts
export function openingButton() {
  const b = el('button', 'mopening', 'Opening');
  b.onclick = () => {
    sfx('tap');
    playOpening();
  };
  setTimeout(firstVisit, 0);
  return b;
}
