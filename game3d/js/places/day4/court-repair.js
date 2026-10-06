import { flags } from '../../narrative/state.js';
import { walkRig, faceRig } from '../../move.js';
import { rbox } from '../../props.js';
import { sfx } from '../../sfx.js';
import { scorePanel, movable } from './tennis-props.js';

export function courtRepair(game, P, shot) {
  const [x, z] = P.things.court_display.face();
  const score = scorePanel();
  score.panel.rotation.y = Math.PI / 2;
  score.panel.position.set(x + 0.084, 1.26, z - 0.16);
  const cap = movable(
    rbox(0.045, 0.055, 0.084, '#ec6350', {
      x: x + 0.093,
      y: 1.05,
      z: z - 0.21,
    }),
  );
  P.space.add(score.panel, cap);
  let fixed = false,
    count = 0;
  const restore = () => {
    fixed = !!flags.d4_display_done;
    cap.rotation.x = fixed ? 0 : 0.32;
    cap.position.x = x + 0.093;
    score.set((count = fixed ? 1 : 0));
  };
  async function press() {
    await walkRig(game, P.people.rei, [x + 0.65, z + 0.1]);
    faceRig(game, P.people.rei, [x, z]);
    await game.hooks.gesture({
      who: 'rei',
      kind: 'point',
      to: 'court_display',
    });
    const from = cap.position.x;
    await game.tween(0.22, (k) => {
      cap.position.x = from - Math.sin(k * Math.PI) * 0.02;
    });
    sfx('tap');
    score.set(++count);
    if (!fixed) {
      await game.wait(280);
      score.set(++count);
      sfx('tap');
    }
    await game.wait(500);
  }
  return {
    restore,
    snapshot: () => ({ fixed, count }),
    load: (s) => {
      fixed = s.fixed;
      count = s.count;
      score.set(count);
      cap.rotation.x = fixed ? 0 : 0.32;
    },
    async hook({ state }) {
      shot.focus([x + 0.25, z], 5.8, 0.9, Math.PI / 2 + 0.25, 0.45);
      if (state === 'fault') {
        restore();
        await press();
      } else if (state === 'reseat') {
        const y = cap.position.y;
        await game.tween(0.8, (k) => {
          cap.position.y = y + Math.sin(k * Math.PI) * 0.16;
          cap.rotation.x = 0.32 * (1 - k);
        });
        fixed = true;
        sfx('tap');
      } else if (state === 'verify') await press();
      else if (state === 'away') {
        restore();
        P.cam.release();
      }
    },
  };
}
