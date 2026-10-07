import { diningActions } from '../izakaya/actions.js';
import { actionShot } from '../day4/shot.js';
import { canteenMealState } from './meal-state.js';
import { mealProps, COLLECTION, PARKING, tablePoint } from './meal-props.js';
import { mealHands } from './meal-hands.js';
import { mealService } from './meal-service.js';
import { dinerActivity } from './resident-activity.js';
import { canteenDiners } from './diners.js';
import { canteenServing } from '../../gameplay/canteen-meals.js';
import { flags } from '../../narrative/state.js';
import { sim, save } from '../../sim.js';
import { known } from '../../lang.js';
import { conversationMemory } from '../../conversations/state.js';

export function canteenDining(game, P) {
  const actions = diningActions(),
    shot = actionShot(P),
    hands = mealHands(game, P);
  const state = canteenMealState(sim, flags),
    props = mealProps(P);
  const ambient = dinerActivity(game, P, props);
  let active = false,
    alive = true,
    request = 0;
  const seatId = () =>
    game.player.seated &&
    Object.entries(P.seats).find(
      ([, s]) =>
        game.player.seatOut && Math.hypot(s.out[0] - game.player.seatOut[0], s.out[1] - game.player.seatOut[1]) < 0.1,
    )?.[0];
  function syncFlags() {
    flags.canteen_staff_present = P.people.canteen_worker.root.visible;
    flags.canteen_service_open = canteenServing(sim.day, sim.period);
    flags.canteen_paid = state.outstanding();
    flags.canteen_outstanding = state.outstanding();
    flags.canteen_player_at_shared = seatId() === 'canteen_seat_shared';
    flags.canteen_curry_present =
      flags.canteen_meal === 'curry' &&
      (state.phase() === 'carried' || (state.phase() === 'table' && flags.canteen_meal_seat === 'canteen_seat_shared'));
    flags.canteen_recommendation_ready = conversationMemory.ready('canteen_vegetable_recommendation', known);
  }
  function syncProps() {
    hands.clear();
    if (!state.outstanding()) {
      props.hideTray();
      return;
    }
    const tray = props.tray(flags.canteen_meal);
    tray.root.visible = state.phase() !== 'paid' || state.delivered();
    tray.food.visible = state.phase() !== 'eaten';
    tray.food.scale.y = 1;
    tray.spoon.userData.bite.visible = false;
    tray.root.rotation.set(0, 0, 0);
    if (state.phase() === 'carried') hands.carry(game.player, tray);
    else {
      const seat = P.seats[flags.canteen_meal_seat];
      const at =
        ['table', 'eaten'].includes(state.phase()) && seat
          ? tablePoint(seat)
          : state.phase() === 'parked'
            ? PARKING
            : COLLECTION;
      P.space.add(tray.root);
      if (seat && ['table', 'eaten'].includes(state.phase())) tray.root.rotation.y = seat.ry;
      tray.root.position.set(...at);
    }
  }
  const commit = () => {
    syncFlags();
    save(game);
  };
  function frame(where) {
    where = where.replace('canteen_', '');
    const phone = P.camera.aspect < 1;
    if (where === 'menu') shot.focus([2.25, -6.7], phone ? 6.8 : 5.8, 1.0, -0.15, 0.75);
    else if (where === 'counter') shot.focus([3.85, -6.6], phone ? 6.6 : 5.8, 0.8, 0.9, 0.75);
    else if (where === 'water') shot.focus([9.55, -5.75], phone ? 5.2 : 4.6, 0.8, -1.7, 0.95);
    else if (where === 'drink') shot.focus([9.5, -5.6], phone ? 4.5 : 4.0, 0.8, 0.55, 0.65);
    else if (where === 'return') shot.focus([-10.1, -1.1], 4.5, 0.6, -0.7, 0.7);
    else if (where === 'table') {
      const s = P.seats[seatId() || flags.canteen_meal_seat];
      if (s) shot.focus([s.x, s.z], phone ? 4.8 : 4.4, 0.7, s.ry + 0.45, 0.8);
    } else {
      const r = P.people['canteen_' + where.replace('canteen_', '')];
      if (!r) throw Error('Unknown dining camera ' + where);
      const e = game.player.root.position,
        p = r.root.position;
      const point = [(p.x + e.x) / 2, (p.z + e.z) / 2];
      shot.focus(
        point,
        where === 'cardigan' ? (phone ? 8.8 : 6.2) : phone ? 6.4 : 5.4,
        0.6,
        where === 'cardigan' ? 2.5 : where === 'polo' ? -0.4 : 0.3,
        0.7,
      );
    }
  }
  const service = mealService(game, P, state, props, hands, frame, commit, flags);
  const diners = canteenDiners(game, P, props, hands, frame, flags);
  const api = {
    state,
    props,
    hands,
    get active() {
      return active;
    },
    syncFlags,
    playerTrayPoint() {
      if (!flags.canteen_curry_present) return null;
      return props.tray(flags.canteen_meal).root.position.clone().add({ x: 0, y: 0.1, z: 0 }).toArray();
    },
    enter() {
      if (alive) return;
      alive = true;
      syncFlags();
      syncProps();
      diners.restore();
    },
    async act(a) {
      if (!alive) return false;
      const owned = ++request;
      if (a.state === 'frame') flags.canteen_diner_busy = ambient.busy(a.who);
      ambient.stop();
      active = true;
      try {
        const result = await actions.run(async (job) => {
          const { state: step } = a;
          P.canteenPhase = step;
          if (step === 'sync') syncFlags();
          else if (step === 'release') P.cam.release();
          else if (step === 'exit') {
            await service.park(job);
            P.cam.release();
          } else if (step === 'menu' || step === 'price') {
            frame('menu');
            if (step === 'price') props.price(flags.canteen_meal);
          } else if (step === 'select') {
            if (canteenServing(sim.day, sim.period)) state.select(a.item);
            commit();
          } else if (step === 'pay') {
            if (canteenServing(sim.day, sim.period) || state.paid()) await service.pay(job);
            syncProps();
            commit();
          } else if (step === 'cancelOrder') {
            state.cancelSelection();
            commit();
          } else if (step === 'collect') {
            if ((await service.collect(job)) === false) return false;
          } else if (step === 'pending') await service.pending(job);
          else if (step === 'sit') await service.sit(job, a.seat);
          else if (step === 'eat') await service.eat(job);
          else if (step === 'returnTray') await service.returnTray(job);
          else if (step === 'water') await service.water(job);
          else await diners.act(job, a);
          syncFlags();
          return true;
        });
        return result === true;
      } finally {
        if (alive && owned === request) active = false;
      }
    },
    update(dt) {
      if (!alive) return;
      ambient.update(dt, active || game.busy);
      shot.update();
      hands.update();
      if (!active) syncFlags();
    },
    snapshot() {
      return { camera: shot.snapshot() };
    },
    restore(data) {
      request++;
      actions.cancel();
      active = false;
      alive = true;
      hands.clear();
      syncFlags();
      syncProps();
      diners.restore();
      shot.load(data?.camera);
    },
    leave() {
      alive = false;
      active = false;
      request++;
      actions.cancel();
      hands.clear();
      ambient.stop();
      for (const r of [game.player, ...Object.values(P.people)]) {
        r.root.userData.walkTok = (r.root.userData.walkTok || 0) + 1;
        r.root.userData.faceTok = (r.root.userData.faceTok || 0) + 1;
      }
      state.leave();
      // Places are cached: retained room props are reconstructed from the receipt on re-entry.
      P.cam.release();
    },
  };
  syncFlags();
  syncProps();
  return api;
}
