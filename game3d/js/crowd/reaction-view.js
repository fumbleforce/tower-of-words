import * as THREE from 'three';
import { heardHTML, scramble } from '../ui/dialogue-text.js';
import { voice } from '../ui.js';
import { logLine } from '../ui/backlog.js';

// One readable response at a time. It stays until dismissed or the player leaves the person.
export function reactionView(game, place) {
  let box,
    active = null;
  const v = new THREE.Vector3();
  function clear() {
    active = null;
    if (box) box.hidden = true;
  }
  function show(person, line) {
    if (!box) {
      if (!document.getElementById('crowd-style')) {
        const link = document.createElement('link');
        link.id = 'crowd-style';
        link.rel = 'stylesheet';
        link.href = new URL('../../css/crowd.css', import.meta.url).href;
        document.head.append(link);
      }
      box = document.createElement('button');
      box.className = 'crowd-reaction';
      box.type = 'button';
      box.setAttribute('aria-label', 'Dismiss crowd reaction');
      box.addEventListener('click', clear);
      document.getElementById('ui').append(box);
    }
    const key = line.voice;
    box.innerHTML = `<span class="crowd-name"></span><span class="crowd-words">${heardHTML(line.text)}</span><span aria-hidden="true" class="crowd-close">×</span>`;
    box.querySelector('.crowd-name').textContent = person.label;
    scramble(box.querySelector('.crowd-words'));
    box.hidden = false;
    active = person;
    voice(key, { muffle: true });
    logLine({
      k: 'line',
      who: person.id,
      name: person.label,
      text: line.text,
      ov: true,
      vk: key,
    });
    update();
  }
  function update() {
    if (!active) return;
    const p = game.player.root.position,
      r = active.r;
    if (
      game.place !== place ||
      game.busy ||
      game.transition ||
      !r.root.visible ||
      Math.hypot(p.x - r.root.position.x, p.z - r.root.position.z) > 3.5 * (place.charScale || 1)
    )
      return clear();
    r.root.getWorldPosition(v);
    v.y += 1.35 * (place.charScale || 1);
    v.project(place.camera);
    if (v.z > 1 || v.z < -1) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    const stage = document.getElementById('ui').getBoundingClientRect();
    const x = ((v.x + 1) * stage.width) / 2,
      y = ((1 - v.y) * stage.height) / 2;
    box.style.left = `${Math.max(120, Math.min(stage.width - 120, x))}px`;
    box.style.top = `${Math.max(65, Math.min(stage.height - 170, y))}px`;
  }
  return {
    show,
    clear,
    update,
    get active() {
      return active;
    },
  };
}
