// The island map, loaded by index.html only with ?map=1 or ?mapcompare=1 (a dev tool, not part of the game yet).
// Key M or the Map button opens and closes it; ?mapcompare=1 opens the compare view straight away.
// window.__map is the handle game3d/tools/map-shots.mjs drives.
import { createMapScreen } from './screen.js';

const game = await new Promise((resolve) => {
  const t = setInterval(() => {
    const g = window.__game;
    if (g?.renderer && g.place && g.prepare) {
      clearInterval(t);
      resolve(g);
    }
  }, 200);
});
const map = createMapScreen(game);
window.__map = map;

const toggle = () => (map.isOpen() ? map.close() : map.open());
const button = document.createElement('button');
button.id = 'map-open';
button.type = 'button';
button.textContent = 'Map';
button.addEventListener('click', toggle);
document.body.appendChild(button);

// while the map is open, keys belong to it: M or Escape close it, nothing reaches the game
window.addEventListener(
  'keydown',
  (e) => {
    if (e.target.closest?.('input, textarea, [contenteditable]') && !map.isOpen()) return;
    if (e.code === 'KeyM') {
      toggle();
      e.preventDefault();
      e.stopPropagation();
    } else if (map.isOpen()) {
      if (e.code === 'Escape') map.close();
      e.stopPropagation();
    }
  },
  true,
);

if (/[?&]mapcompare/.test(location.search)) map.open('compare');
