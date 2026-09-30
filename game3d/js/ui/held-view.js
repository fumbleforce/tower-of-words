// A close look at something a person holds up for Eric: a phone's screen (a photo, a video, a reminder) or pieces of
// paper side by side (the reader's book page and printout). The pictures are canvases drawn or rendered by the place
// (train/held-screens.js, train/screen-scenes.js); this only frames them (desktop: right of centre, beside the person
// the camera frames; phone: across the top), clear of the dialogue and the portraits, and never takes a tap (the line
// underneath still moves on).
//   showHeld(id, items)   items: [{ canvas, frame: 'phone' | 'sheet', tilt (degrees) }]; replaces what was shown
//   ringHeld(id, [x, y])  a soft ring on the first item at x, y (0..1 of its picture), e.g. a finger on the photo
//   hideHeld(id)          takes it away (only if `id` is what's shown; no id: whatever is shown)
import { el } from './dom.js';

let box = null,
  shown = null;

function root() {
  if (box) return box;
  box = el('div', '');
  box.id = 'held';
  box.hidden = true;
  box.setAttribute('aria-hidden', 'true');
  document.getElementById('ui').appendChild(box);
  return box;
}

export function showHeld(id, items) {
  const b = root();
  b.innerHTML = '';
  for (const it of items) {
    const f = el('div', `hv ${it.frame || 'phone'}${it.canvas.width < it.canvas.height ? ' tall' : ''}`);
    f.style.setProperty('--tilt', `${it.tilt || 0}deg`);
    f.style.setProperty('--ar', `${it.canvas.width} / ${it.canvas.height}`);
    const scr = el('div', 'scr');
    it.canvas.classList.add('pic');
    scr.appendChild(it.canvas);
    f.appendChild(scr);
    b.appendChild(f);
  }
  b.dataset.id = id;
  b.hidden = false;
  b.classList.remove('in', 'out');
  void b.offsetWidth;
  b.classList.add('in');
  shown = id;
}

export function ringHeld(id, at) {
  if (!box || shown !== id) return;
  box.querySelector('.ring')?.remove();
  if (!at) return;
  const scr = box.querySelector('.scr');
  const r = el('i', 'ring');
  r.style.left = `${at[0] * 100}%`;
  r.style.top = `${at[1] * 100}%`;
  scr?.appendChild(r);
}

export function hideHeld(id) {
  if (!box || box.hidden || (id && shown !== id)) return;
  shown = null;
  box.classList.remove('in');
  box.classList.add('out');
  const b = box;
  setTimeout(() => {
    if (!shown) {
      b.hidden = true;
      b.innerHTML = '';
    }
  }, 220);
}

export const heldShown = () => shown;
