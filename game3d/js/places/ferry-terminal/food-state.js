import { ITEMS } from '../../gameplay/items.js';
export const TERMINAL_FOOD = [
  'milk',
  'riceball',
  'curry_bread',
  'butter_roll',
  'coffee',
  'tea',
  'melon',
  'cornsoup',
].filter((id) => ITEMS[id]);
// Terminal-only eating receipts. One prepared action may be replayed by Continue, but never consumed twice.
export function terminalFoodState(sim, flags) {
  const available = (id) => TERMINAL_FOOD.includes(id) && sim.inv.includes(id);
  return {
    available,
    sync() {
      for (const id of TERMINAL_FOOD) flags['ferry_has_' + id] = available(id);
    },
    prepare(id) {
      if (!available(id)) return false;
      if (flags.ferry_food_phase !== 'selected' || flags.ferry_food_item !== id)
        flags.ferry_food_id = (flags.ferry_food_id || 0) + 1;
      flags.ferry_food_item = id;
      flags.ferry_food_phase = 'selected';
      return true;
    },
    pending() {
      return (
        flags.ferry_food_phase === 'selected' &&
        flags.ferry_consumed_id !== flags.ferry_food_id &&
        available(flags.ferry_food_item)
      );
    },
    consume() {
      if (!this.pending()) return false;
      sim.inv.splice(sim.inv.indexOf(flags.ferry_food_item), 1);
      flags.ferry_consumed_id = flags.ferry_food_id;
      flags.ferry_food_phase = 'complete';
      this.sync();
      return true;
    },
  };
}
