// The moves between places. Each place provides tripOut (leaving) and tripIn (arriving); this file runs
// them with the transition's dialogue slots from game3d/story/transitions.js. A place with more than one
// neighbour gives per-neighbour moves in tripOutTo / tripInFrom (keyed by the other place's name).
import { ui } from './ui.js';

export async function leave(game, place, slot) {
  const talk = slot.walk ? game.runner.ambient(slot.walk) : null;
  const out = place.tripOutTo?.[game.transition?.to] || place.tripOut;
  if (out) await out(game, slot);
  // the lift ride's lines (slot.ride) run inside the gate's tripOut, between the floors
  if (talk) await Promise.race([talk, game.wait(400)]);
  ui.closeTalk();
}

// the crossfade from the last place (main.js #xfade) must be gone before anyone speaks in the new one (QA round 1: the
// old place ghosted over the first line)
function fadeGone(game) {
  const img = document.getElementById('xfade');
  return new Promise((res) => {
    const t0 = performance.now();
    const tick = () => {
      if (!img || img.hidden || game.test || performance.now() - t0 > 1800) res();
      else setTimeout(tick, 60);
    };
    tick();
  });
}

export async function arrive(game, place, slot) {
  const tripIn = place.tripInFrom?.[game.transition?.from] || place.tripIn;
  if (tripIn) await tripIn(game, slot);
  await fadeGone(game);
  if (slot.arrive && slot.arrive.length) {
    game.busy = true;
    await game.runner.steps(slot.arrive);
    ui.closeTalk();
  }
  ui.caption(null, '');
}
