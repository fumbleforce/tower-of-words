import * as THREE from 'three';
import { followAllowed } from './policy.js';

// The player's own view of the play camera (Jørgen, 2026-10-10: "make scrolling zoom in rather than open up the log"
// and "middle mouse hold does free camera rotation. clicking camera resets to the top down view"): the wheel zooms,
// holding the middle button and dragging orbits (yaw and pitch), a contextual Reset view button resets. The offset
// sits on the place shot (cam.js reads `userView`; camera/follow.js reads it for third person), so it is
// shown only in free play and eases away while a story or conversation camera has the shot, then comes back.
export const ZOOM = [0.35, 1.25]; // times the place's own distance (smaller = closer)
export const PITCH = [-0.75, 0.45]; // radians added to the place's elevation (the sum is clamped in cam.js)
const SMOOTH = 0.18;

export const userView = {
  zoom: 1, // wanted
  yaw: 0,
  pitch: 0,
  shown: { zoom: 1, yaw: 0, pitch: 0 }, // what is applied this frame
  blend: 1, // 1 in free play, eased to 0 while a story camera has the shot
  reset() {
    this.zoom = 1;
    this.yaw = 0;
    this.pitch = 0;
  },
  // eased toward the wanted values; the scripted blend fades the whole offset
  step(dt, free) {
    const k = 1 - Math.exp(-dt / SMOOTH),
      s = this.shown;
    this.blend += ((free ? 1 : 0) - this.blend) * (1 - Math.exp(-dt / 0.35));
    s.zoom += (this.zoom - s.zoom) * k;
    s.yaw += (this.yaw - s.yaw) * k;
    s.pitch += (this.pitch - s.pitch) * k;
  },
  get f() {
    return 1 + (this.shown.zoom - 1) * this.blend;
  },
  get dyaw() {
    return this.shown.yaw * this.blend;
  },
  get dpitch() {
    return this.shown.pitch * this.blend;
  },
};

const touchOnly = () => matchMedia('(pointer: coarse)').matches || innerWidth < 700 || innerHeight < 600;

export function installUserView(game, canvas) {
  const over = (e) => e.target === canvas || e.target.id === 'marks' || e.target.id === 'ui';
  const input = () => !touchOnly() && followAllowed(game, true);
  // the shot belongs to the story when any of these hold; the player's offset waits
  const free = () => {
    const cam = game.place?.cam;
    return (
      !!game.place &&
      !game.busy &&
      !game.saying &&
      !game.transition &&
      !game.player?.scripted &&
      !cam?.close &&
      !cam?.releasing
    );
  };
  let place = null;
  game.userView = userView;
  window.addEventListener(
    'wheel',
    (e) => {
      if (!over(e) || !input()) return;
      e.preventDefault();
      userView.zoom = THREE.MathUtils.clamp(userView.zoom * Math.exp(e.deltaY * 0.0012), ZOOM[0], ZOOM[1]);
    },
    { passive: false, capture: true },
  );
  let drag = null;
  window.addEventListener(
    'pointerdown',
    (e) => {
      if (e.button !== 1 || !over(e) || !input()) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    },
    true,
  );
  window.addEventListener(
    'pointermove',
    (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!(e.buttons & 4)) return (drag = null);
      userView.yaw -= (e.clientX - drag.x) * 0.006;
      userView.pitch = THREE.MathUtils.clamp(userView.pitch + (e.clientY - drag.y) * 0.004, PITCH[0], PITCH[1]);
      drag.x = e.clientX;
      drag.y = e.clientY;
    },
    true,
  );
  const end = (e) => {
    if (drag && e.pointerId === drag.id) drag = null;
  };
  window.addEventListener('pointerup', end, true);
  window.addEventListener('pointercancel', end, true);
  window.addEventListener('blur', () => (drag = null));
  // the middle button's own auto-scroll and paste-on-click
  window.addEventListener('mousedown', (e) => e.button === 1 && over(e) && e.preventDefault(), true);
  window.addEventListener('auxclick', (e) => e.button === 1 && over(e) && e.preventDefault(), true);

  // Offer a reset only when the player has changed the view.
  const button = document.createElement('button');
  button.id = 'cameraReset';
  button.type = 'button';
  button.hidden = true;
  button.textContent = 'Reset view';
  button.title = 'Reset zoom and rotation';
  button.setAttribute('aria-label', 'Reset zoom and rotation');
  button.addEventListener('click', () => {
    userView.reset();
    button.hidden = true;
    button.blur();
  });
  button.addEventListener('keydown', (e) => {
    if (['Enter', 'Space'].includes(e.code)) e.stopPropagation();
  });
  document.body.append(button);

  // every frame, before the camera is placed
  return (dt) => {
    if (game.place !== place) {
      place = game.place;
      userView.reset();
      Object.assign(userView.shown, { zoom: 1, yaw: 0, pitch: 0 });
    }
    userView.step(dt, free());
    const changed = userView.zoom !== 1 || userView.yaw !== 0 || userView.pitch !== 0;
    const show = changed && !touchOnly() && free() && followAllowed(game, true);
    if (button.hidden === show) button.hidden = !show;
  };
}
