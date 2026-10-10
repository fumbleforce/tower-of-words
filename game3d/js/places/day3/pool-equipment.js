import { walkRig, faceRig } from '../../move.js';
import { sfx } from '../../sfx.js';
import { TABLE } from '../../scenes/sports/deck-plan.js';
import { pt } from '../../scenes/sports/plan.js';

export function poolEquipmentActions(game, { action, handling, who, setAt, list, bagItems, source, target, seat }) {
  async function putListAway() {
    const emi = who('emi');
    if (handling.owner(list) !== emi) return;
    const at = [seat[0] + 0.05, seat[1] + 0.5];
    await action.wait(walkRig(game, emi, [at[0] + 0.55, at[1]], { speed: 1.1 }));
    await action.wait(faceRig(game, emi, at));
    handling.reach(emi, [at[0], 0.36, at[1]]);
    await action.wait(game.wait(350));
    handling.drop(emi);
    setAt(list, at, 0.36);
  }

  async function carryBags(id) {
    const r = who(id);
    for (let i = 0; i < bagItems.length; i++) {
      const bag = bagItems[i],
        pickup = [source[0] + i * 0.38, source[1]],
        dropoff = [target[0] + i * 0.38, target[1]];
      await action.wait(walkRig(game, r, [pickup[0] - 0.2, pickup[1] + 0.43], { speed: 1.1 }));
      await action.wait(faceRig(game, r, pickup));
      handling.reach(r, [pickup[0], 0.635, pickup[1]]);
      await action.wait(game.wait(350));
      handling.hold(r, bag, 0.22);
      await action.wait(walkRig(game, r, [dropoff[0] - 0.2, dropoff[1] + 0.43], { speed: 1.1 }));
      await action.wait(faceRig(game, r, dropoff));
      handling.reach(r, [dropoff[0], 0.635, dropoff[1]]);
      await action.wait(game.wait(350));
      handling.drop(r);
      setAt(bag, dropoff, 0.415);
      bag.rotation.set(0, 0, 0);
      sfx('tap');
    }
  }

  async function collectList() {
    const r = who('attendant'),
      at = [seat[0] + 0.05, seat[1] + 0.5],
      table = pt(TABLE);
    await action.wait(walkRig(game, r, [at[0] + 0.55, at[1]], { speed: 1.2 }));
    await action.wait(faceRig(game, r, at));
    handling.reach(r, [at[0], 0.36, at[1]]);
    await action.wait(game.wait(300));
    handling.hold(r, list);
    await action.wait(walkRig(game, r, [table[0] - 0.9, table[1]], { speed: 1.2 }));
    await action.wait(faceRig(game, r, table));
    handling.reach(r, [table[0] - 0.45, 0.505, table[1]]);
    await action.wait(game.wait(300));
    handling.drop(r);
    setAt(list, [table[0] - 0.45, table[1]], 0.505);
  }
  return { putListAway, carryBags, collectList };
}
