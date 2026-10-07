import { settings, onSettings } from '../settings.js';
import { followAvailable, followAllowed } from './policy.js';
import { followCamera } from './follow.js';
import { followControls } from './controls.js';

export function installFollowCamera(game, canvas) {
  let place = null,
    lens = null,
    active = false,
    held = null;
  const desktop = () =>
    followAvailable({
      width: innerWidth,
      height: innerHeight,
      coarse: matchMedia('(pointer: coarse)').matches,
      pointerLock: !!canvas.requestPointerLock,
    });
  const allowed = () => settings.cameraMode === 'follow' && followAllowed(game, desktop());
  const controls = followControls(game, canvas, {
    available: () => active && !held,
    look: (x, y) => lens?.look(x, y),
    refresh,
  });
  function refresh() {
    if (game.place !== place) {
      lens?.restore();
      lens?.setActive(false);
      controls.release();
      place = game.place;
      lens = null;
      active = false;
      held = null;
    }
    // Feedback pauses the world but keeps the exact rendered lens and room enclosure.
    if (held && desktop() && settings.cameraMode === 'follow') return controls.paint();
    held = null;
    const next = allowed();
    if (active && !next) {
      lens?.restore();
      lens?.setActive(false);
      controls.release();
    }
    active = next;
    if (active && !lens) lens = followCamera(game, place);
    lens?.setActive(active);
    controls.paint();
  }
  const api = {
    refresh,
    releaseMouse: controls.release,
    holdView() {
      if (!active) return () => {};
      const token = {};
      held = token;
      controls.release();
      controls.paint();
      return () => {
        if (held !== token) return;
        held = null;
        refresh();
      };
    },
    beforeStep() {
      lens?.restore();
      refresh();
      if (active && game.walker) game.walker.keyFrame = lens.movementFrame();
    },
    afterStep(drawn = true) {
      refresh();
      if (active && drawn) lens.update();
    },
    get visibilityCamera() {
      return active ? lens?.visibilityCamera : null;
    },
    get active() {
      return active;
    },
    get captured() {
      return controls.locked;
    },
    get yaw() {
      return lens?.yaw;
    },
    get blocked() {
      return !!lens?.blocked;
    },
    get collisionMs() {
      return lens?.collisionMs || 0;
    },
    get distance() {
      return lens?.distance;
    },
  };
  // Restore the authored lens before the normal resize listener fits the place.
  window.addEventListener(
    'resize',
    () => {
      held = null; // A viewport change needs the normal layout fit; the captured PNG stays unchanged.
      lens?.restore();
      refresh();
    },
    true,
  );
  onSettings(refresh);
  game.followCamera = api;
  return api;
}
