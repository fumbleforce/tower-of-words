// The jump's controls (jump.js): Space on a keyboard, the Jump button on a phone. Space still uses the target in
// reach when he is standing still by it (docs/game/controls-and-ui.md, Controls); walking, running, already in the
// air or with nothing in reach, it jumps. Holding it jumps higher. Only while he is free to walk: no jump in a scene,
// a conversation, a menu, the map, sitting, or while typing.
//   installJump(game, { shadow, ui })   once, at boot: game.jump is the jump (jump.js), with its falls (falls.js)
import { createJump } from './jump.js';
import { installFalls } from './falls.js';

function typing() {
  const a = document.activeElement;
  if (!a) return false;
  if (a.tagName === 'INPUT') return !/^(range|checkbox|radio|button|submit|color|file)$/.test(a.type);
  return a.tagName === 'TEXTAREA' || a.isContentEditable;
}
const titleUp = () => {
  const t = document.getElementById('title');
  return !!(t && !t.hidden && t.offsetParent !== null);
};

export function installJump(game, { shadow, ui }) {
  const free = () =>
    !!game.walker &&
    !!game.place &&
    game.saveEnabled &&
    !game.busy &&
    !game.falling &&
    !game.mapOpen &&
    !game.paused &&
    !game.walker.locked &&
    !game.player.seated &&
    !game.player.scripted &&
    !ui.talking &&
    ui.menuClosed() &&
    !typing() &&
    !titleUp();
  let falls = null;
  const jump = createJump(game, {
    shadow,
    canJump: free,
    onAir: (h) => falls.check(h),
    onVoid: () => falls.recover(),
  });
  falls = installFalls(game, { jump, shadow, ui });
  game.jump = jump;

  // Space: a jump, unless he stands still by something he can use (then it is still Interact, as before)
  const jumps = () => free() && (!game.near || jump.air || game.walker.moving || game.walker.keys.size > 0);
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.code !== 'Space' || !jumps()) return;
      e.preventDefault();
      e.stopImmediatePropagation(); // not also Interact (main.js)
      if (!e.repeat) jump.press();
    },
    true,
  );
  window.addEventListener('keyup', (e) => e.code === 'Space' && jump.release());
  window.addEventListener('blur', () => jump.release());

  // the phone's button, bottom right, beside Say when that shows (css/style.css #jumpBtn)
  const btn = document.createElement('button');
  btn.id = 'jumpBtn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Jump');
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l6 7h-4v5h-4v-5H6z"/><path d="M6 19h12"/></svg>' +
    '<span class="t">Jump</span>';
  const host = document.getElementById('ui') || document.body;
  const say = host.querySelector('#sayMenu');
  if (say) say.after(btn);
  else host.append(btn);
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    btn.setPointerCapture?.(e.pointerId);
    jump.press();
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) btn.addEventListener(ev, () => jump.release());
  btn.addEventListener('click', (e) => e.stopPropagation());
  // shown only while he can jump, so it never sits over a scene or a menu; checked with the jump each frame
  let shown = null;
  const update = jump.update;
  jump.update = (dt) => {
    update(dt);
    const on = free() || jump.air;
    if (on !== shown) btn.hidden = !(shown = on);
  };
  return jump;
}
