import { grocery, basket, PRODUCT_X } from '../../scenes/konbini/products.js';
import { bag } from '../../scenes/bakery/models.js';
import { signBoard } from '../../scenes/plaza-buildings.js';
import { SPOTS, SEAT, COUNTER, BASKET, CLERK } from '../../scenes/konbini/plan.js';
import { shopHands } from './handling.js';
import { diningActions } from '../izakaya/actions.js';
import { actionShot } from '../day4/shot.js';
import { konbiniTrade } from './trade.js';
import { PRODUCT_IDS, PACKAGING } from './products.js';
import { sim, save } from '../../sim.js';
import { readNote } from '../../flavor-finds/note.js';
import { flags } from '../../narrative/state.js';
export function konbiniStage(game, P, w) {
  const actions = diningActions(),
    hands = shopHands(game, P),
    shot = actionShot(P),
    trade = konbiniTrade(sim, flags);
  const models = {
    basket: basket(),
    bag: bag(),
    ...Object.fromEntries(PRODUCT_IDS.map((id) => [id, grocery(id)])),
    openMilk: grocery('milk', { opened: true }),
    openRice: grocery('riceball', { opened: true }),
  };
  for (const [key, o] of Object.entries(models)) {
    o.name = 'konbini-' + key;
    o.userData.noBatch = true;
    P.space.add(o);
  }
  models.bag.scale.y = 0.7;
  let display = null,
    displayedTotal = null;
  const pose = (o, at, shown = true) => {
    P.space.add(o);
    o.position.set(...at);
    o.rotation.set(0, 0, 0);
    o.visible = shown;
  };
  const slot = (id) => [BASKET[0], BASKET[1] + 0.025, BASKET[2] + (trade.basket().indexOf(id) - 1) * 0.125];
  function total() {
    const value = trade.total();
    if (displayedTotal === value) return;
    displayedTotal = value;
    if (display) {
      display.removeFromParent();
      display.traverse((o) => {
        if (o.material?.map) {
          o.material.map.dispose();
          o.material.dispose();
          o.geometry?.dispose();
        }
      });
    }
    display = signBoard(String(trade.total()), 'YEN', 0.31, 0.18, '#304d62');
    display.position.copy(w.total.position);
    display.rotation.copy(w.total.rotation);
    display.userData.noBatch = true;
    P.space.add(display);
    w.total.visible = false;
  }
  function sync() {
    hands.clear();
    P.people.konbini_clerk.root.position.set(CLERK[0], 0, CLERK[1]);
    P.people.konbini_clerk.setState?.('idle');
    if (P.people.konbini_clerk.torso) P.people.konbini_clerk.torso.rotation.x = 0;
    trade.sync();
    total();
    w.fridge.forEach((pane, i) => {
      pane.position.x = -0.54 + (i ? 1 : -1) * 0.68;
    });
    const r = trade.receipt();
    pose(models.basket, BASKET, r.phase === 'selected');
    models.basket.rotation.y = Math.PI / 2;
    pose(models.bag, [-1.15, COUNTER.top + 0.2, -1.35], r.phase === 'paid');
    for (const id of PRODUCT_IDS) pose(models[id], slot(id), r.phase === 'selected' && r.items.includes(id));
    models.openMilk.visible = models.openRice.visible = false;
  }
  const commit = () => {
    trade.sync();
    game.ui.refreshBag(sim);
    save(game);
  };
  function frame(where = 'checkout') {
    const phone = P.camera.aspect < 1;
    if (where === 'window') shot.focus([SEAT.x, -0.8], phone ? 5.7 : 4.9, 0.8, -0.22, 0.34);
    else if (where === 'fridge') shot.focus([-0.6, -3.12], phone ? 7.8 : 6.8, 0.91, 0.2, 0.65);
    else shot.focus([-1.17, -1.4], phone ? 9 : 6, 0.86, 0.1, 0.72);
  }
  async function select(job, id, remove = false) {
    if (!PRODUCT_IDS.includes(id)) throw Error('Unknown shop item ' + id);
    if (trade.receipt().phase === 'paid') return;
    if (!remove && trade.receipt().phase === 'selected' && trade.basket().includes(id)) return;
    if (!remove && trade.receipt().phase === 'selected' && trade.basket().length === 3) {
      trade.add(id);
      commit();
      return;
    }
    const i = PRODUCT_X[id] < -0.54 ? 0 : 1,
      side = i ? 1 : -1,
      pane = w.fridge[i],
      o = models[id];
    frame('fridge');
    await hands.slide(job, pane, true, side);
    if (remove) {
      await hands.walk(job, SPOTS.checkout, -Math.PI / 2);
      await hands.move(job, game.player, o, [PRODUCT_X[id], 0.72, -3.5], {
        via: [PRODUCT_X[id], -3.27],
        facing: Math.PI,
      });
      trade.remove(id);
    } else {
      await hands.walk(job, [PRODUCT_X[id], -3.27], Math.PI);
      pose(o, [PRODUCT_X[id], 0.72, -3.5]);
      // Selection is saved only after the real package reaches the basket.
      const target = [
        BASKET[0],
        BASKET[1] + 0.025,
        BASKET[2] + (trade.receipt().phase === 'selected' ? trade.basket().length - 1 : -1) * 0.125,
      ];
      pose(models.basket, BASKET);
      models.basket.rotation.y = Math.PI / 2;
      await hands.move(job, game.player, o, target, {
        via: [SPOTS.checkout[0], target[2] + 0.15],
        facing: -Math.PI / 2,
        grip: [0.05, 0.04, 0],
      });
      trade.add(id);
    }
    commit();
    await hands.slide(job, pane, false, side);
    sync();
    await hands.walk(job, SPOTS.checkout, -Math.PI / 2);
    frame();
  }
  async function pack(job) {
    frame();
    pose(models.bag, [-1.18, COUNTER.top + 0.2, -1.82]);
    for (const id of trade.basket()) {
      pose(models[id], slot(id));
      await hands.move(job, P.people.konbini_clerk, models[id], [-1.18, COUNTER.top + 0.07, -1.82], {
        grip: [-0.05, 0.025, 0],
      });
      models[id].visible = false;
    }
    await hands.move(job, P.people.konbini_clerk, models.bag, [-1.15, COUNTER.top + 0.2, -1.35], {
      grip: [-0.09, 0.01, 0],
    });
    models.basket.visible = false;
  }
  async function sit(job) {
    if (!game.player.seated) {
      await hands.walk(job, SEAT.out, 0);
      game.player.sitAt(SEAT.x, SEAT.top, SEAT.z, SEAT.ry);
      game.player.seated = true;
      game.player.seatOut = [...SEAT.out];
      game.walker.facing = SEAT.ry;
    }
    frame('window');
  }
  sync();
  return {
    models,
    trade,
    contacts: hands.contacts,
    act({ state, item }) {
      return actions.run(async (job) => {
        if (state === 'frame') {
          trade.sync();
          total();
          frame();
        } else if (state === 'add' || state === 'remove') await select(job, item, state === 'remove');
        else if (state === 'pay') {
          trade.pay();
          commit();
        } else if (state === 'bag') await pack(job);
        else if (state === 'take') {
          await hands.walk(job, [SPOTS.checkout[0], -1.2], -Math.PI / 2);
          pose(models.bag, [-1.15, COUNTER.top + 0.2, -1.35]);
          await hands.move(job, game.player, models.bag, [-0.75, 0.88, -1.35], { grip: [0.09, 0.01, 0] });
          trade.finish();
          models.bag.visible = false;
          commit();
        } else if (state === 'cancel') {
          for (const id of [...trade.basket()]) await select(job, id, true);
          trade.cancel();
          sync();
          commit();
        } else if (state === 'sit') await sit(job);
        else if (state === 'prepareConsume') {
          trade.prepareConsume(item);
          commit();
        } else if (state === 'consume') {
          await sit(job);
          const id = flags.konbini_food_item;
          if (flags.konbini_consumed_id === flags.konbini_food_id || !trade.canConsume(id)) return true;
          const o = models[id];
          pose(o, [SEAT.x, 0.72, -0.69]);
          await hands.move(job, game.player, o, [SEAT.x, 0.72, -0.69], { steady: true, hold: 300 });
          o.visible = false;
          const opened = id === 'milk' ? models.openMilk : models.openRice;
          pose(opened, [SEAT.x, 0.72, -0.69]);
          await hands.move(
            job,
            game.player,
            opened,
            id === 'milk' ? [SEAT.x, 0.77, SEAT.z + 0.445] : [SEAT.x, 0.81, SEAT.z + 0.27],
            {
              steady: true,
              grip: id === 'milk' ? 0.09 : -0.035,
              tilt: id === 'milk' ? -1.3 : 0,
              localGrip: id === 'milk' ? [0, 0.2, 0] : null,
              hold: 750,
            },
          );
          trade.consume();
          commit();
          opened.visible = false;
        } else if (state === 'inspect') {
          frame('fridge');
          await job.wait(readNote(game.ui, PACKAGING[item].join(' · ')));
        } else if (state === 'end') {
          P.cam.release();
          commit();
        } else throw Error('Unknown konbini action ' + state);
        return true;
      });
    },
    update() {
      hands.update();
      shot.update();
    },
    snapshot: () => ({ shot: shot.snapshot() }),
    restore(data) {
      actions.cancel();
      sync();
      shot.load(data?.shot);
    },
    leave() {
      actions.cancel();
      hands.clear();
      trade.cancel();
      P.cam.release();
      sync();
    },
  };
}
