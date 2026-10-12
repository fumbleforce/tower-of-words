import * as THREE from 'three';
import { heardHTML } from '../ui/dialogue-text.js';
import { voice } from '../ui.js';
import { logLine } from '../ui/backlog.js';
import { pinTipPosition } from '../ui/pin-tip-layout.js';

// One readable response at a time. It stays until dismissed or the player leaves the person.
export function reactionView(game, place) {
  let box,
    active = null;
  const v = new THREE.Vector3(),
    playerAt = new THREE.Vector3();
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
    box.hidden = false;
    active = person;
    playerAt.copy(game.player.root.position);
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
      Math.hypot(p.x - playerAt.x, p.z - playerAt.z) > 2.5 * (place.charScale || 1)
    )
      return clear();
    if (!r.root.visible) return; // Keep the last readable position if the speaker leaves.
    r.root.getWorldPosition(v);
    v.y += 1.35 * (place.charScale || 1);
    v.project(place.camera);
    if (v.z > 1 || v.z < -1) return;
    box.hidden = false;
    const stage = document.getElementById('ui').getBoundingClientRect();
    const x = ((v.x + 1) * stage.width) / 2,
      y = ((1 - v.y) * stage.height) / 2;
    const width = box.offsetWidth,
      height = box.offsetHeight;
    const avoid = [];
    for (const el of document.querySelectorAll(
      '#hud, #goal, #goal2, #goalArrow, #minimap, #jumpBtn, #sayBtn, #giveBtn',
    )) {
      const b = el.getBoundingClientRect();
      if (b.width && b.height && getComputedStyle(el).visibility !== 'hidden')
        avoid.push({ x0: b.left, y0: b.top, x1: b.right, y1: b.bottom });
    }
    const anchor = { x0: stage.left + x, x1: stage.left + x, y0: stage.top + y, y1: stage.top + y };
    const at = pinTipPosition(
      anchor,
      width,
      height,
      { x0: stage.left + 6, y0: stage.top + 6, x1: stage.right - 6, y1: stage.bottom - 6 },
      avoid,
    );
    box.style.left = `${at.x - stage.left + width / 2}px`;
    box.style.top = `${at.y - stage.top + height}px`;
  }
  return {
    show,
    clear,
    dispose() {
      clear();
      box?.remove();
      box = null;
    },
    update,
    get active() {
      return active;
    },
  };
}
