import * as THREE from 'three';
import { mealTray, waterCup, lunchContainer, cashCoins } from '../../scenes/canteen/meals.js';
import { rbox, mat } from '../../props.js';
import { signBoard } from '../../scenes/plaza-buildings.js';
import { CANTEEN_MEALS } from '../../gameplay/canteen-meals.js';

export const COLLECTION = [3.85, 0.684, -6.52];
// A separate counter bay keeps a parked paid tray clear of the handoff and till.
export const PARKING = [0.95, 0.606, -6.455];
export const RETURN = [-10.3, 0.79, -0.61];
export function tablePoint(seat) {
  return [seat.x + Math.sin(seat.ry) * 0.48, 0.624, seat.z + Math.cos(seat.ry) * 0.48];
}
export function mealProps(P) {
  const root = new THREE.Group();
  root.name = 'canteen-dining-props';
  P.space.add(root);
  const add = (object, at) => {
    root.add(object);
    object.position.set(...at);
    return object;
  };
  const shirt = mealTray('curry'),
    cardigan = mealTray('vegetables'),
    polo = mealTray('vegetables');
  add(shirt.root, [-9.35, 0.624, -4.5]);
  add(cardigan.root, [-5.1, 0.624, -1.43]);
  add(polo.root, [8.05, 0.624, -4.5]);
  const container = lunchContainer();
  add(container.root, [-5.52, 0.625, -1.35]);
  const wrapper = add(rbox(0.15, 0.008, 0.11, '#d9dec9'), [8.3, 0.629, -4.6]);
  const badge = add(rbox(0.105, 0.012, 0.075, '#498894'), [-9.7, 0.627, -4.3]);
  const cash = add(new THREE.Group(), [4.05, 0.701, -6.35]);
  cash.visible = false;
  const cup = add(waterCup(), [9.66, 0.61, -5.93]);
  const tap = add(rbox(0.06, 0.075, 0.035, '#426675'), [9.65, 0.81, -5.91]);
  add(rbox(0.035, 0.055, 0.07, '#879b9f'), [9.57, 0.77, -5.93]);
  const stream = add(
    new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.08, 6), mat('#accdd4')),
    [9.57, 0.715, -5.9],
  );
  stream.visible = false;
  const menu = signBoard(
    'カレー / やさい',
    'Lunch: ' +
      Object.values(CANTEEN_MEALS)
        .map((m) => `${m.name} ¥${m.price}`)
        .join('   '),
    1.65,
    0.55,
    '#3f6f77',
  );
  add(rbox(1.7, 0.6, 0.026, '#314c49'), [4.6, 1.35, -8.032]);
  add(menu, [4.6, 1.35, -8.01]);
  let current = null,
    kind = null;
  return {
    root,
    shirt,
    cardigan,
    polo,
    container,
    wrapper,
    badge,
    cash,
    cup,
    tap,
    stream,
    menu,
    tray(id) {
      if (kind !== id) {
        current?.root.removeFromParent();
        current = mealTray(id);
        kind = id;
        root.add(current.root);
      }
      return current;
    },
    hideTray() {
      if (current) current.root.visible = false;
    },
    cashFor(amount) {
      for (const child of [...cash.children]) {
        child.traverse((o) => o.geometry?.dispose());
        cash.remove(child);
      }
      cash.add(cashCoins(amount));
    },
    price(id) {
      const meal = CANTEEN_MEALS[id];
      if (!meal) return;
      this.priceBoard?.removeFromParent();
      this.priceBoard = signBoard(meal.ja, `${meal.name}  ¥${meal.price}`, 0.95, 0.3, '#326a6d');
      add(this.priceBoard, [2.55, 0.95, -6.85]);
    },
    dispose() {
      current?.root.removeFromParent();
      root.removeFromParent();
      cup.removeFromParent();
    },
  };
}
