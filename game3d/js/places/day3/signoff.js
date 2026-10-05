// The station's sign-off of the door repair on day 3 (ticket T-0002, story/day3/train.js): the car still standing out
// of service with the portable tester by its doors (places/train-day2.js), and the guard on the platform beside it
// during a morning visit while the report waits for his signature. `stationSignoff` states: test (the same check as
// day 2's: doors shut, the sensor tried, doors open, green), retrieve (he takes the tester and its leads clear of the
// doors), close (the doors shut for the last time), sign (he corrects the time he wrote and signs), leave (he walks
// back along the platform toward his desk). Signed off, the car stays shut and the tester gone on every return.
import { flags } from '../../narrative/state.js';
import { sim } from '../../sim.js';
import { sfx } from '../../sfx.js';
import { walkRig, faceRig } from '../../move.js';

// ctx: { cast (day-cast.js, with the guard), tester, standing(), doorTest(), closeDoors(now), TX, TZ, WALK_X, LZ }
export function stationSignoff(game, ctx) {
  const { cast, tester, TX, TZ, WALK_X, LZ } = ctx;
  const guard = cast.people.guard;
  const BY = [TX + 0.8, TZ + 0.85], // beside the tester, clear of Eric's place in front of it
    AT_TESTER = [TX + 0.4, TZ + 0.35];
  const signed = () => flags.ticket_T0002 === 'done';
  const eligible = () => sim.period === 'morning' && flags.d2_ticket_done && !signed();
  const clearTester = () => {
    tester.visible = false;
    game.place?.nav.unblock('tester');
  };
  function arrange() {
    if (signed()) {
      clearTester();
      ctx.closeDoors(true);
    }
    if (eligible()) cast.put('guard', BY, [TX - 0.55, TZ + 0.4]);
    else cast.hide('guard');
  }
  async function hook({ state } = {}) {
    if (state === 'test') return ctx.doorTest();
    if (state === 'retrieve') {
      await walkRig(game, guard, AT_TESTER, { speed: 1.0 });
      await game.wait(450);
      sfx('tap');
      clearTester();
      await game.wait(300);
      await walkRig(game, guard, BY, { speed: 1.0 });
      faceRig(game, guard, [TX - 0.55, TZ + 0.4]);
      return;
    }
    if (state === 'close') {
      ctx.closeDoors(false);
      await game.wait(1400);
      return;
    }
    if (state === 'sign') {
      await game.wait(500);
      sfx('tap');
      await game.wait(500);
      sfx('ok');
      return;
    }
    if (state === 'leave') {
      const here = game.place;
      void (async () => {
        await walkRig(game, guard, [WALK_X + 1.2, LZ + 1.7], { speed: 1.2 });
        await walkRig(game, guard, [WALK_X, LZ + 1.95], { speed: 1.2, route: false });
        if (game.place === here) cast.hide('guard');
      })();
    }
  }
  return { arrange, hook };
}
