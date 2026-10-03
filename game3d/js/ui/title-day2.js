// The title's Day 2 entry: day 2 straight from the title, the way ?day=2 starts it (from the player's own finished
// day 1, or a plain one; continue.js dayStartSave). Its opening save becomes the autosave and the page restarts
// into it, as the end screen's Start day two does. A game in progress is only replaced after a one-line confirm.
import { sfx } from '../ui.js';

export function addDayTwo(menu, before, { inProgress, keys }) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'mday2';
  btn.textContent = 'Day 2';
  menu.insertBefore(btn, before);
  const ask = document.createElement('div');
  ask.className = 'confirmq';
  ask.hidden = true;
  ask.innerHTML = `<p>Start day 2? It replaces your game in progress.</p>
    <div class="mlist row2"><button type="button" class="yes">Start day 2</button><button type="button" class="no primary">Back</button></div>`;
  menu.after(ask);
  const start = async () => {
    const { dayStartSave } = await import('../continue.js');
    try {
      localStorage.setItem(keys.SAVE_KEY, JSON.stringify(dayStartSave(2)));
      localStorage.removeItem(keys.AUTO_META);
      sessionStorage.setItem(keys.CONTINUE_FLAG, '1');
    } catch {
      /* storage off: the reload shows the title again */
    }
    document.body.classList.add('reloading');
    setTimeout(() => location.reload(), 200);
  };
  btn.onclick = () => {
    sfx('tap');
    if (!inProgress()) return start();
    menu.hidden = true;
    ask.hidden = false;
    ask.querySelector('.no').focus();
  };
  ask.querySelector('.no').onclick = () => {
    ask.hidden = true;
    menu.hidden = false;
    btn.focus();
  };
  ask.querySelector('.yes').onclick = start;
}
