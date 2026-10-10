// The title's Days entry: a later day straight from the title, the way ?day=N starts it (from the player's own finished
// day before, or a plain one; continue.js dayStartSave). Days opens a short list (day 2 up to days.js LAST_DAY); the
// opening save of the day picked becomes the autosave and the page restarts into it, as the end screen's Start day N
// does. A game in progress is only replaced after a one-line confirm.
import { sfx } from '../ui.js';
import { LAST_DAY } from '../days.js';
import { DEV } from '../dev.js';

export function addDayPicker(menu, before, { inProgress, keys }) {
  if (!DEV) return; // dev mode only (dev.js): the public release has no Days
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'mday2';
  btn.textContent = 'Days';
  menu.insertBefore(btn, before);
  const days = Array.from({ length: LAST_DAY - 1 }, (_, i) => i + 2);
  const pick = document.createElement('div');
  pick.className = 'confirmq daypick';
  pick.hidden = true;
  pick.innerHTML = `<p>Start from another day.</p>
    <div class="mlist row2">${days.map((d) => `<button type="button" class="day" data-day="${d}">Day ${d}</button>`).join('')}<button type="button" class="no primary">Back</button></div>`;
  const ask = document.createElement('div');
  ask.className = 'confirmq';
  ask.hidden = true;
  ask.innerHTML = `<p></p>
    <div class="mlist row2"><button type="button" class="yes"></button><button type="button" class="no primary">Back</button></div>`;
  menu.after(pick, ask);
  let day = 2;
  const start = async () => {
    const { dayStartSave } = await import('../continue.js');
    try {
      localStorage.setItem(keys.SAVE_KEY, JSON.stringify(dayStartSave(day)));
      localStorage.removeItem(keys.AUTO_META);
      sessionStorage.setItem(keys.CONTINUE_FLAG, '1');
    } catch {
      /* storage off: the reload shows the title again */
    }
    document.body.classList.add('reloading');
    setTimeout(() => location.reload(), 200);
  };
  const back = () => {
    pick.hidden = ask.hidden = true;
    menu.hidden = false;
    btn.focus();
  };
  btn.onclick = () => {
    sfx('tap');
    menu.hidden = true;
    pick.hidden = false;
    pick.querySelector('.day').focus();
  };
  for (const b of pick.querySelectorAll('.day'))
    b.onclick = () => {
      sfx('tap');
      day = +b.dataset.day;
      if (!inProgress()) return start();
      pick.hidden = true;
      ask.querySelector('p').textContent = `Start day ${day}? It replaces your game in progress.`;
      ask.querySelector('.yes').textContent = `Start day ${day}`;
      ask.hidden = false;
      ask.querySelector('.no').focus();
    };
  pick.querySelector('.no').onclick = back;
  ask.querySelector('.no').onclick = back;
  ask.querySelector('.yes').onclick = start;
}
