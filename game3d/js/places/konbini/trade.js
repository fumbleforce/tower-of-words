import { product, PRODUCT_IDS } from './products.js';
const FOOD = new Set(['milk', 'riceball']);
// A basket is a saved order, not an inventory award. Payment commits its contents once.
export function konbiniTrade(sim, flags) {
  const basket = () => [...new Set(flags.konbini_basket || [])].filter((id) => PRODUCT_IDS.includes(id));
  const receipt = () => ({ id: flags.konbini_order_id || 0, phase: flags.konbini_phase || 'none', items: basket() });
  const total = () => basket().reduce((sum, id) => sum + product(id).price, 0);
  function sync() {
    const ids = ['selected', 'paid'].includes(flags.konbini_phase) ? basket() : [];
    flags.konbini_count = ids.length;
    flags.konbini_total = total();
    flags.konbini_selected_milk = ids.includes('milk');
    flags.konbini_selected_riceball = ids.includes('riceball');
    flags.konbini_selected_tea = ids.includes('tea');
    flags.konbini_selected_coffee = ids.includes('coffee');
    flags.konbini_has_milk = sim.inv.includes('milk');
    flags.konbini_has_riceball = sim.inv.includes('riceball');
  }
  return {
    basket,
    receipt,
    total,
    sync,
    add(id) {
      if (!product(id)) throw Error(`Unknown konbini product ${id}`);
      if (flags.konbini_phase === 'paid') return false;
      let ids = basket();
      if (flags.konbini_phase !== 'selected') {
        ids = [];
        flags.konbini_order_id = (flags.konbini_order_id || 0) + 1;
      }
      if (ids.includes(id)) return true;
      if (ids.length >= 3) {
        flags.konbini_full = true;
        return false;
      }
      flags.konbini_basket = [...ids, id];
      flags.konbini_phase = 'selected';
      flags.konbini_cant_pay = flags.konbini_full = false;
      sync();
      return true;
    },
    remove(id) {
      if (flags.konbini_phase !== 'selected') return false;
      flags.konbini_basket = basket().filter((item) => item !== id);
      flags.konbini_full = flags.konbini_cant_pay = false;
      sync();
      return true;
    },
    pay() {
      const r = receipt();
      if (r.id && flags.konbini_paid_id === r.id) return true;
      if (r.phase !== 'selected' || !r.items.length) return false;
      if (sim.yen < total()) {
        flags.konbini_cant_pay = true;
        return false;
      }
      sim.yen -= total();
      sim.inv.push(...r.items);
      flags.konbini_paid_id = r.id;
      flags.konbini_phase = 'paid';
      flags.konbini_cant_pay = false;
      sync();
      return true;
    },
    finish() {
      if (flags.konbini_paid_id === flags.konbini_order_id) flags.konbini_phase = 'complete';
    },
    cancel() {
      if (flags.konbini_phase === 'selected') {
        flags.konbini_basket = [];
        flags.konbini_phase = 'cancelled';
        sync();
      }
    },
    canConsume: (id) => FOOD.has(id) && sim.inv.includes(id),
    prepareConsume(id) {
      if (!this.canConsume(id)) return false;
      if (flags.konbini_food_phase !== 'selected' || flags.konbini_food_item !== id)
        flags.konbini_food_id = (flags.konbini_food_id || 0) + 1;
      flags.konbini_food_item = id;
      flags.konbini_food_phase = 'selected';
      return true;
    },
    consume() {
      const id = flags.konbini_food_id,
        item = flags.konbini_food_item;
      if (!id || flags.konbini_consumed_id === id || !this.canConsume(item)) return false;
      sim.inv.splice(sim.inv.indexOf(item), 1);
      flags.konbini_consumed_id = id;
      flags.konbini_food_phase = 'complete';
      sync();
      return true;
    },
  };
}
