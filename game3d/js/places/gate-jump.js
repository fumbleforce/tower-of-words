// Day 1 at the security gate (story/gate.js): a jump over the shut gate, and coming back in from the forecourt.
// lobby.js hands over its gate state, registers sendBack as a hook and calls reopen from its onDay.
import { glide } from '../movement/scripted.js';
import { flags } from '../narrative/state.js';

// sfx: ui.js's, handed over by lobby.js so this file loads without a page (test/unit/gate-jump.test.mjs)
export function gateJump(game, { st, BZ, cam, setGate, gateOpenFlag, sfx }) {
  // the jump (gate_jumped): the guard lets the flaps open and Eric walks back through to the readers' side. A jammed
  // gate can't open, so then the frame crossfades to him standing there instead.
  async function sendBack() {
    const eric = game.player,
      back = [0, BZ + 0.85];
    game.walker.stop();
    eric.scripted = true;
    game.walker.locked = true;
    if (st.jam) {
      const snap = game.snapshot();
      eric.root.position.set(back[0], 0, back[1]);
      cam.snap(eric.root.position);
      game.crossfade(snap);
      await game.wait(600);
    } else {
      sfx('flap');
      st.flapWant = 1;
      eric.setState('walk');
      await glide(game, eric.root, [0, BZ - 0.6], 1.3, true);
      await glide(game, eric.root, back, 1.3, true);
      if (!st.gateOpen) st.flapWant = 0;
    }
    eric.setState('idle');
    eric.root.rotation.y = Math.PI;
    game.walker.facing = Math.PI;
    game.walker.sync?.();
    eric.scripted = false;
    game.walker.locked = false;
  }
  // back in from the forecourt after the story opened the gate: it stays open, even in a room built again
  function reopen(day) {
    if (day > 1 || !flags[gateOpenFlag] || st.gateOpen) return;
    setGate('open');
    st.flap = 1;
  }
  return { sendBack, reopen };
}
