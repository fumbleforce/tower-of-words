// No renderer or dialogue dependency: the saved order is the transaction receipt.
import { BREADS } from '../../scenes/bakery/plan.js';
export function bakeryTrade(sim, flags) {
  const receipt = () => ({
    id: flags.bakery_order_id || 0,
    item: flags.bakery_item,
    phase: flags.bakery_phase || 'none',
  });
  return {
    receipt,
    select(item) {
      if (!BREADS[item]) throw new Error(`Unknown bakery item ${item}`);
      if (flags.bakery_phase === 'selected' && flags.bakery_item === item) return receipt();
      flags.bakery_order_id = (flags.bakery_order_id || 0) + 1;
      flags.bakery_item = item;
      flags.bakery_phase = 'selected';
      flags.bakery_cant_pay = false;
      return receipt();
    },
    pay() {
      const r = receipt(),
        product = BREADS[r.item];
      if (r.id && flags.bakery_paid_id === r.id) return true;
      if (r.phase !== 'selected' || !product) return false;
      if (sim.yen < product.price) {
        flags.bakery_cant_pay = true;
        return false;
      }
      // Synchronous commit: no saved state can contain a debit without the item and receipt.
      sim.yen -= product.price;
      sim.inv.push(r.item);
      flags.bakery_paid_id = r.id;
      flags.bakery_phase = 'paid';
      flags.bakery_cant_pay = false;
      return true;
    },
    cancel() {
      if (flags.bakery_phase === 'selected') flags.bakery_phase = 'cancelled';
    },
    finish() {
      if (flags.bakery_paid_id === flags.bakery_order_id) flags.bakery_phase = 'complete';
    },
    canEat(item = flags.bakery_item) {
      return !!BREADS[item] && sim.inv.includes(item);
    },
    prepareEat(item = flags.bakery_item) {
      if (!this.canEat(item)) return false;
      if (flags.bakery_eat_phase !== 'selected' || flags.bakery_eat_item !== item)
        flags.bakery_eat_id = (flags.bakery_eat_id || 0) + 1;
      flags.bakery_eat_item = item;
      flags.bakery_eat_phase = 'selected';
      return true;
    },
    eat() {
      const id = flags.bakery_eat_id,
        item = flags.bakery_eat_item;
      if (!id || flags.bakery_eaten_id === id || !this.canEat(item)) return false;
      sim.inv.splice(sim.inv.indexOf(item), 1);
      flags.bakery_eaten_id = id;
      flags.bakery_eat_phase = 'complete';
      return true;
    },
  };
}
