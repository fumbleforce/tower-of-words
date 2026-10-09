// The anime opening (game3d/opening/, to the opening theme) over the title, in a frame of its own: the title menu's
// Opening item plays it. The game's sound pauses under it; its own Skip, Esc or its end closes it.
import { pauseAudio } from '../audio/core.js';
import { sfx } from '../ui.js';
import { el } from './dom.js';

export function playOpening() {
  if (document.getElementById('opening')) return;
  const back = document.activeElement;
  const wrap = document.createElement('div');
  wrap.id = 'opening';
  const frame = document.createElement('iframe');
  frame.src = `opening/index.html?embed&v=${encodeURIComponent(window.BUILD || '')}`;
  frame.allow = 'autoplay; fullscreen';
  frame.title = 'Opening';
  wrap.append(frame);
  document.body.append(wrap);
  pauseAudio(true);
  frame.addEventListener('load', () => frame.contentWindow?.focus());
  function done(e) {
    if (e.source !== frame.contentWindow || e.data?.opening !== 'done') return;
    removeEventListener('message', done);
    wrap.classList.add('out');
    setTimeout(() => wrap.remove(), 450);
    pauseAudio(false);
    back?.focus?.();
  }
  addEventListener('message', done);
}

// the title menu's Opening item
export function openingButton() {
  const b = el('button', 'mopening', 'Opening');
  b.onclick = () => {
    sfx('tap');
    playOpening();
  };
  return b;
}
