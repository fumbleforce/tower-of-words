import { flags } from '../../narrative/state.js';
import { sim } from '../../sim.js';
import { sfx } from '../../sfx.js';
import { anchor, board, prop, moveProp, frame } from './props.js';

export function selectorRepair(game, P) {
  const at = anchor(P, 'song_terminal');
  const book = prop(P, [0.35, 0.05, 0.28], '#36587e', [at.x + 0.1, at.y + 0.04, at.z]);
  const key = prop(P, [0.08, 0.016, 0.045], '#dc5764', [at.x + 0.015, at.y + 0.015, at.z + 0.15]);
  const screen = board(P, ['Song list', '01   One more song', '02   Summer night', '03   Blue sky'], {
    w: 0.45,
    h: 0.3,
  });
  screen.position.copy(at).add({ x: -0.12, y: 0.015, z: -0.12 });
  screen.rotation.x = -Math.PI / 2;
  const row = prop(P, [0.4, 0.004, 0.05], '#51baa9', [at.x - 0.12, at.y + 0.022, at.z - 0.12]);
  let stopped = false,
    phase = 0;
  function restore() {
    stopped = !!flags.d5_selector_done;
    book.position.set(at.x + (stopped ? 0.58 : 0.1), at.y + 0.04, at.z);
    key.position.y = at.y + 0.015;
  }
  restore();
  function update(dt) {
    if (sim.day !== 5 || stopped) return;
    phase += dt;
    row.position.z = at.z - 0.18 + (Math.floor(phase * 3) % 3) * 0.065;
  }
  async function hook({ state }) {
    if (sim.period !== 'lunch' || !P.people.kenji?.root.visible)
      throw new Error('Selector check requires Kenji at lunch');
    frame(game, 'song_terminal');
    if (state === 'show') {
      restore();
      await game.wait(1100);
    } else if (state === 'key' || state === 'stop') {
      stopped = true;
      key.position.y -= 0.01;
      sfx('tap');
      await game.wait(400);
    } else if (state === 'book') {
      await moveProp(game, book, [at.x + 0.58, at.y + 0.04, at.z]);
      key.position.y = at.y + 0.015;
    } else if (state === 'verify') {
      await game.hooks.gesture({
        who: 'kenji',
        kind: 'point',
        to: 'song_terminal',
      });
      row.position.z = at.z - 0.115;
      stopped = true;
      sfx('tap');
      await game.wait(1100);
    } else throw new Error(`Unknown selector repair state: ${state}`);
  }
  return {
    hook,
    restore,
    update,
    magicTargets() {
      stopped = true;
      return [screen, key];
    },
    snapshot: () => ({ stopped, phase }),
    load(state) {
      stopped = state.stopped;
      phase = state.phase;
    },
  };
}
