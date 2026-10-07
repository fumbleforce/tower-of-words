import { poolAction } from './day3/pool-action.js';
import { actionShot } from './day4/shot.js';
import { DIRECTORY_ID } from '../gameplay/island-directory.js';
import { readItemDocument } from '../ui/item-documents.js';
import { printHands } from './print-hands.js';
import { sim, save } from '../sim.js';
// A completed button press, print and pickup grants one saved paper. An interrupted machine action grants nothing.
export function printService(game, P, w) {
  const action = poolAction(game),
    shot = actionShot(P),
    feedAt = w.feed.position.clone(),
    outAt = w.output.position.clone();
  function reset() {
    w.feed.position.copy(feedAt);
    w.feed.visible = true;
    w.output.position.copy(outAt);
    w.output.visible = false;
  }
  let reading = false,
    hands = null;
  const state = { phase: 'idle', buttonContact: null, pickupContact: null };
  async function reach(target, phase) {
    const start = hands.point().toArray();
    state.phase = phase;
    await action.wait(action.tween(0.65, (t) => hands.reach(start.map((v, i) => v + (target[i] - v) * t))));
    return hands.point().distanceTo({ x: target[0], y: target[1], z: target[2] });
  }
  function leave() {
    action.cancel();
    if (reading) game.ui.closeTalk();
    reading = false;
    hands?.dispose();
    hands = null;
    state.phase = 'idle';
    reset();
    P.cam.release();
  }
  async function run() {
    if (sim.inv.includes(DIRECTORY_ID)) {
      await action.run(async () => {
        reading = true;
        await action.wait(readItemDocument(game, DIRECTORY_ID, { alive: () => reading && game.place === P }));
        reading = false;
      });
      return;
    }
    try {
      await action.run(async () => {
        state.buttonContact = null;
        state.pickupContact = null;
        shot.focus([-1, -3.2], innerWidth < 600 ? 6.2 : 5.8, 0.55, 0.6, 0.62);
        shot.update();
        hands = printHands(game, P, w.output);
        if (!hands.ready) throw new Error('Printer requires the player hand');
        await action.wait(game.wait(650));
        state.buttonContact = await reach([-0.48, 0.744, -2.98], 'press');
        await action.wait(game.wait(350));
        hands.rest();
        state.phase = 'printing';
        await action.wait(
          action.tween(0.85, (t) => {
            w.feed.position.z = feedAt.z - 0.35 * t;
            w.feed.position.y = feedAt.y - 0.1 * t;
          }),
        );
        w.feed.visible = false;
        await action.wait(game.wait(300));
        w.output.visible = true;
        await action.wait(
          action.tween(1.05, (t) => {
            w.output.position.x = outAt.x + 0.34 * t;
          }),
        );
        await action.wait(game.wait(550));
        const edge = [w.output.position.x, w.output.position.y, w.output.position.z + 0.19];
        state.pickupContact = await reach(edge, 'pickup');
        await action.wait(game.wait(300));
        hands.pick(edge);
        const p = game.player.root.position;
        await reach([p.x - 0.18, 0.85, p.z + 0.1], 'holding');
        await action.wait(game.wait(450));
        if (!sim.inv.includes(DIRECTORY_ID)) {
          sim.inv.push(DIRECTORY_ID);
          game.ui.refreshBag(sim);
          save(game);
        }
        reading = true;
        await action.wait(readItemDocument(game, DIRECTORY_ID, { alive: () => reading && game.place === P }));
        reading = false;
      });
    } finally {
      hands?.dispose();
      hands = null;
      state.phase = 'idle';
      reset();
      P.cam.release();
    }
  }
  return { run, leave, update: shot.update, state };
}
