import { showFind } from '../ui/finds-view.js';
import { currentPage } from './model.js';
import { paperId } from './pages.js';
// Direct book controls share the existing paper surface; Papers itself remains read-only.
export async function readReference({ state, change, keep, found, seen, alive }) {
  let done = false;
  while (!done && alive()) {
    const s = state(),
      page = currentPage(s);
    if (!page) break;
    const closed = showFind(paperId(page)),
      panel = document.querySelector('#findView');
    seen(page);
    const controls = document.createElement('div');
    controls.className = 'reference-controls';
    let action = null;
    const add = (label, run) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.onclick = (event) => {
        event.stopPropagation();
        action = run;
        panel.hidden = true;
      };
      controls.appendChild(b);
    };
    add(s.pages[s.active.book] ? 'Previous page' : 'Next page', () =>
      change({ type: 'turn', page: s.pages[s.active.book] ? 0 : 1 }),
    );
    add(s.marks[s.active.book] === s.pages[s.active.book] ? 'Remove bookmark' : 'Mark this page', () =>
      change({ type: 'mark', clear: s.marks[s.active.book] === s.pages[s.active.book] }),
    );
    if (!found(paperId(page))) add('Save this reference', () => keep(page));
    else {
      const saved = document.createElement('span');
      saved.textContent = 'Saved in Papers';
      saved.className = 'reference-saved';
      controls.appendChild(saved);
    }
    add('Close book view', () => {
      done = true;
    });
    panel.querySelector('.shot').appendChild(controls);
    await closed;
    controls.remove();
    if (!alive()) break;
    if (action) await action();
    else done = true;
  }
}
