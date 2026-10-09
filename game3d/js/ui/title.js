import { unlockAudio, sfx } from '../ui.js';
import { gateStart } from './new-game.js';

export async function title(saved) {
  const t = document.getElementById('title');
  t.hidden = false;
  const cont = t.querySelector('.cont');
  cont.hidden = !(saved && saved.place);
  gateStart(t); // Start opens the new-game screen first (ui/new-game.js)
  const pick = await new Promise((res) => {
    t.querySelector('.go').addEventListener('click', () => res('new'), { once: true });
    cont.addEventListener('click', () => res('continue'), { once: true });
  });
  unlockAudio();
  sfx('tap');
  t.classList.add('out');
  setTimeout(() => {
    t.hidden = true;
  }, 700);
  return pick;
}
