import { CANTEEN_MEALS } from '../../gameplay/canteen-meals.js';

// The diner owns one paid tray until it is returned. Saves store the receipt, never a second meal item.
export function canteenMealState(sim, flags) {
  const phase = () => flags.canteen_meal_phase || 'none';
  const current = () => CANTEEN_MEALS[flags.canteen_meal];
  const paid = () => !!flags.canteen_order_id && flags.canteen_paid_id === flags.canteen_order_id;
  return {
    phase,
    current,
    paid,
    outstanding: () => paid() && phase() !== 'returned',
    select(id) {
      if (!CANTEEN_MEALS[id]) throw new Error(`Unknown canteen meal ${id}`);
      if (this.outstanding()) return false;
      flags.canteen_order_id = (flags.canteen_order_id || 0) + 1;
      flags.canteen_meal = id;
      flags.canteen_meal_phase = 'selected';
      flags.canteen_meal_seat = null;
      return true;
    },
    pay() {
      if (paid()) return phase() !== 'returned';
      if (phase() !== 'selected' || !current() || sim.yen < current().price) return false;
      // Debit and entitlement commit synchronously before the action saves. A interrupted handoff stays collectable.
      sim.yen -= current().price;
      flags.canteen_paid_id = flags.canteen_order_id;
      flags.canteen_meal_phase = 'paid';
      return true;
    },
    delivered() {
      return flags.canteen_delivered_id === flags.canteen_order_id;
    },
    deliver() {
      if (!paid()) return false;
      flags.canteen_delivered_id = flags.canteen_order_id;
      return true;
    },
    take() {
      if (!paid() || !['paid', 'parked', 'carried'].includes(phase())) return false;
      flags.canteen_meal_phase = 'carried';
      return true;
    },
    place(seat) {
      if (!seat || !paid() || !['carried', 'table'].includes(phase())) return false;
      flags.canteen_meal_seat = seat;
      flags.canteen_meal_phase = 'table';
      return true;
    },
    park() {
      if (!paid() || phase() !== 'carried') return false;
      flags.canteen_meal_phase = 'parked';
      flags.canteen_meal_seat = null;
      return true;
    },
    eat() {
      if (phase() !== 'table' || !paid() || flags.canteen_eaten_id === flags.canteen_order_id) return false;
      flags.canteen_eaten_id = flags.canteen_order_id;
      flags.canteen_meal_phase = 'eaten';
      return true;
    },
    returnTray() {
      if (!paid() || !['carried', 'table', 'eaten'].includes(phase())) return false;
      flags.canteen_meal_phase = 'returned';
      flags.canteen_meal_seat = null;
      return true;
    },
    cancelSelection() {
      if (phase() === 'selected') flags.canteen_meal_phase = 'none';
    },
    leave() {
      // A carried tray cannot appear outside. Its existing entitlement returns to the collection counter.
      if (phase() === 'carried') {
        flags.canteen_meal_phase = 'paid';
        flags.canteen_meal_seat = null;
      }
    },
  };
}
