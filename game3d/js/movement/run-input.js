// Running for the player (Jørgen, 2026-09-30: "I'd like to have Shift button to run, and caps lock to toggle running").
//   heldRun()   true while Shift is held or Caps Lock is on. Caps Lock is read from the keyboard's own state
//               (getModifierState) on every key and pointer event, so it never drifts from the light on the key.
//               While a text field has focus (a word to type, the feedback note) neither runs: they only change the text.
//   doubleTap()  this press on the floor is the second of two near each other within 0.4 s: the phone's run (a double
//                click does the same).
// SmoothWalker (walker.js) turns these into speed and gait.run.
const keys = { shift: false, caps: false };
let prev = null,
  press = null; // the last two presses
const on = globalThis.addEventListener ? globalThis.addEventListener.bind(globalThis) : () => {}; // no window in node checks
for (const type of ['keydown', 'keyup', 'pointerdown', 'pointermove'])
  on(
    type,
    (e) => {
      keys.shift = e.shiftKey;
      if (type === 'pointerdown') [prev, press] = [press, { t: e.timeStamp, x: e.clientX, y: e.clientY }];
      if (e.getModifierState) keys.caps = e.getModifierState('CapsLock');
    },
    true,
  );
on('blur', () => (keys.shift = false));

function typing() {
  const a = globalThis.document?.activeElement;
  if (!a) return false;
  if (a.tagName === 'INPUT') return !/^(range|checkbox|radio|button|submit|color|file)$/.test(a.type);
  return a.tagName === 'TEXTAREA' || a.isContentEditable;
}

export const heldRun = () => (keys.shift || keys.caps) && !typing();

export function doubleTap() {
  const again = !!prev && !!press && press.t - prev.t < 400 && Math.hypot(press.x - prev.x, press.y - prev.y) < 48;
  if (again) press = null; // a third tap starts over
  return again;
}
