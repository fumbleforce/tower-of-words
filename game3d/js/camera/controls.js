// Mouse capture belongs only to free exploration. Native Talk/Say/menu keys remain with the game.
export function followControls(game, canvas, { available, look, refresh }) {
  const button = document.createElement('button');
  button.id = 'cameraLook';
  button.type = 'button';
  button.hidden = true;
  button.setAttribute('aria-label', 'Capture mouse to look around. Escape releases the mouse.');
  button.title = 'Mouse: look · WASD: move · Shift: run · E: interact · Esc: release';
  document.body.append(button);
  const locked = () => document.pointerLockElement === canvas;
  let requested = false,
    failed = false;
  function clear() {
    game.walker?.keys.clear();
    if (game.walker) game.walker.keyFrame = null;
  }
  function release() {
    requested = false;
    clear();
    if (locked()) document.exitPointerLock();
  }
  function paint() {
    button.hidden = !available();
    const text = locked() ? 'Mouse look · Esc to release' : failed ? 'Retry mouse look' : 'Mouse look';
    if (button.textContent !== text) button.textContent = text;
    button.setAttribute('aria-pressed', String(locked()));
  }
  async function capture() {
    refresh();
    if (!available() || locked()) return;
    requested = true;
    failed = false;
    game.hover?.el?.classList.remove('hover');
    game.hover = null;
    clear();
    canvas.focus();
    try {
      await canvas.requestPointerLock();
    } catch {
      requested = false;
      failed = true;
      paint();
    }
  }
  button.addEventListener('click', capture);
  // Avoid the native global Enter/Space interaction while this accessible button has focus.
  button.addEventListener('keydown', (e) => {
    if (['Enter', 'Space'].includes(e.code)) e.stopPropagation();
  });
  document.addEventListener('pointerlockchange', () => {
    if (locked() && (!requested || !available())) release();
    if (!locked()) clear();
    paint();
  });
  document.addEventListener('pointerlockerror', () => {
    requested = false;
    failed = true;
    paint();
  });
  window.addEventListener(
    'pointerdown',
    (e) => {
      if (e.target !== canvas || !available()) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.button === 0 && !locked()) capture();
    },
    true,
  );
  window.addEventListener(
    'pointermove',
    (e) => {
      if (locked() && available()) e.stopImmediatePropagation();
    },
    true,
  );
  window.addEventListener(
    'mousemove',
    (e) => {
      if (!locked() || !available()) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      look(e.movementX, e.movementY);
    },
    true,
  );
  window.addEventListener(
    'keydown',
    (e) => {
      if (locked() && ['Escape', 'Tab'].includes(e.code)) {
        release();
        if (e.code === 'Escape') e.stopImmediatePropagation();
      }
    },
    true,
  );
  window.addEventListener('blur', release);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) release();
  });
  return {
    release,
    paint,
    get locked() {
      return locked();
    },
  };
}
