// Pool clothing changes happen at the existing locker, with the shower and steps on the same route.
import { MC } from '../../mc.js';
import * as D from '../../scenes/sports/deck-plan.js';
import { glide } from '../../move.js';

export function poolChanging(game, { action, outfit, active, stepsTop, lane, waterEnd, steps, climbOut, inWater }) {
  // Change at the actual locker, then use the existing shower and steps route.
  async function enter() {
    const door = MC.gender === 'woman' ? D.EXIT_W : D.EXIT;
    const changing = game.place.changing;
    if (changing) {
      await action.wait(game.walkTo(...changing.locker));
      await action.wait(game.wait(400));
      outfit('eric', true);
    } else await action.wait(game.walkTo(door.lane[0], door.lane[1]));
    const e = game.player;
    if (!changing) e.root.position.set(stepsTop[0], 0, stepsTop[1]);
    e.root.rotation.y = Math.PI;
    game.walker.sync?.();
    game.place.cam.snap?.(e.root.position);
    if (changing) {
      await action.wait(game.walkTo(...changing.shower));
      await action.wait(game.wait(350));
      await action.wait(game.walkTo(...changing.deck));
      await action.wait(game.walkTo(...stepsTop));
    }
    e.scripted = true;
    await action.wait(steps('eric', true));
    // Clear the landing and listen from inside the lane, so the others address a person rather than a row.
    await action.wait(glide(game, e.root, [lane, waterEnd - 1.8], 0.7));
  }
  async function exit() {
    const e = game.player;
    if (inWater()) await action.wait(climbOut('eric'));
    else if (e.seated) await action.wait(game.hooks.stand({ who: 'eric' }));
    e.scripted = false;
    game.walker.sync?.();
    if (active('eric') && game.place.changing) {
      await action.wait(game.walkTo(...game.place.changing.shower));
      await action.wait(game.wait(350));
      await action.wait(game.walkTo(...game.place.changing.locker));
      await action.wait(game.wait(400));
      outfit('eric', false);
    }
    return;
  }
  return { enter, exit };
}
