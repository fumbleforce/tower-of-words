import * as THREE from 'three';
import { tray, bread, bag, tongs } from '../../scenes/bakery/models.js';
import { SPOTS, SEAT, COUNTER } from '../../scenes/bakery/plan.js';
import { diningHands } from '../izakaya/hands.js';
import { diningActions } from '../izakaya/actions.js';
import { actionShot } from '../day4/shot.js';
import { bakeryTrade } from './trade.js';
import { sim, save } from '../../sim.js';
import { flags } from '../../narrative/state.js';
export function bakeryStage(game, P) {
  const actions = diningActions(),
    hands = diningHands(game, P.space),
    shot = actionShot(P),
    trade = bakeryTrade(sim, flags);
  const models = {
    tray: tray(),
    bag: bag(),
    tongs: tongs(),
    curry_bread: bread('curry_bread'),
    butter_roll: bread('butter_roll'),
  };
  for (const [key, o] of Object.entries(models)) {
    o.name = `bakery-${key}`;
    o.userData.noBatch = true;
    P.space.add(o);
  }
  models.bag.scale.y = 0.7;
  const contacts = [];
  let carry = null;
  const clerk = P.people.bakery_clerk;
  const pose = (o, x, y, z, shown = true) => {
    P.space.add(o);
    o.position.set(x, y, z);
    o.rotation.set(0, 0, 0);
    o.visible = shown;
  };
  function sync() {
    hands.clear();
    if (clerk.torso) clerk.torso.rotation.x = 0;
    carry = null;
    const r = trade.receipt(),
      selected = r.phase === 'selected',
      paid = r.phase === 'paid',
      returned = r.phase === 'cancelled';
    pose(
      models.tray,
      returned ? -1.3 : COUNTER.x,
      returned ? 0.73 : COUNTER.top + 0.018,
      returned ? -1.07 : COUNTER.z,
      selected || returned,
    );
    pose(models.bag, 0.65, COUNTER.top + 0.2, -2.82, paid);
    pose(models.tongs, -1.32, 0.82, -0.92, true);
    for (const id of ['curry_bread', 'butter_roll'])
      pose(models[id], 0.5, COUNTER.top + 0.043, -3.01, selected && r.item === id);
    if ((selected || returned) && models[r.item]) {
      models.tray.attach(models[r.item]);
      models[r.item].position.set(-0.05, 0.025, -0.04);
      models[r.item].visible = true;
    }
    flags.bakery_can_eat = trade.canEat();
    flags.bakery_has_curry = trade.canEat('curry_bread');
    flags.bakery_has_roll = trade.canEat('butter_roll');
  }
  const commit = () => {
    flags.bakery_can_eat = trade.canEat();
    flags.bakery_has_curry = trade.canEat('curry_bread');
    flags.bakery_has_roll = trade.canEat('butter_roll');
    game.ui.refreshBag(sim);
    save(game);
  };
  function frame(where = 'checkout') {
    const phone = P.camera.aspect < 1;
    if (where === 'window') {
      shot.focus([SEAT.x, -0.8], phone ? 5.7 : 4.9, 0.8, -0.22, 0.34);
      return;
    }
    const [x, z] = where === 'rack' ? [-0.8, -1.7] : [0.55, -2.91];
    shot.focus([x, z], phone ? 8.2 : 7.2, 0.88, where === 'rack' ? 0 : -1.0, where === 'rack' ? 0.6 : 0.96);
  }
  async function walk(job, to, facing) {
    game.standUp?.();
    await job.wait(game.walkTo(...to));
    if (Math.hypot(game.player.root.position.x - to[0], game.player.root.position.z - to[1]) > 0.28)
      throw new Error('Bakery approach is blocked');
    game.walker.facing = facing;
    game.player.root.rotation.y = facing;
  }
  async function reach(
    job,
    actor,
    object,
    target,
    {
      carryTo = null,
      dropTo = [COUNTER.x, COUNTER.top + 0.018, COUNTER.z],
      facing = Math.PI,
      grip = 0,
      hold = 0,
      steady = false,
    } = {},
  ) {
    const torso = actor === clerk ? actor.torso : null,
      tilt = torso?.rotation.x;
    if (torso) torso.rotation.x = 0.44;
    const arm = hands.start(actor),
      at = P.space.worldToLocal(object.getWorldPosition(new THREE.Vector3()));
    if (steady) {
      const spine = arm.chain.findIndex((b) => /Spine$/.test(b.name));
      if (spine >= 0) {
        arm.chain.splice(spine, 1);
        arm.base.splice(spine, 1);
      }
    }
    try {
      const gripAt = Array.isArray(grip) ? new THREE.Vector3(...grip) : new THREE.Vector3(0, grip, 0);
      at.add(gripAt);
      await job.wait(hands.move(arm, at.toArray()));
      contacts.push({
        actor: actor === game.player ? 'player' : 'clerk',
        action: object.name,
        gap: hands.distance(arm),
        target: arm.target.toArray(),
        hand: arm.hand.getWorldPosition(new THREE.Vector3()).toArray(),
        joints: arm.chain.map((b) => b.getWorldPosition(new THREE.Vector3()).toArray()),
      });
      P.space.attach(object);
      arm.prop = object;
      arm.offset = gripAt.clone().negate();
      await job.wait(hands.move(arm, new THREE.Vector3(...target).add(gripAt).toArray()));
      if (carryTo) {
        carry = arm;
        await walk(job, carryTo, facing);
        carry = null;
        await job.wait(hands.move(arm, new THREE.Vector3(...dropTo).add(gripAt).toArray()));
      }
      contacts.push({
        actor: actor === game.player ? 'player' : 'clerk',
        action: object.name + '-setdown',
        gap: hands.distance(arm),
      });
      if (hold) await job.wait(game.wait(hold));
      arm.prop = null;
      object.position.set(...(carryTo ? dropTo : target));
    } finally {
      if (carry === arm) carry = null;
      hands.stop(arm);
      if (torso && job.live()) torso.rotation.x = tilt;
    }
  }
  async function select(job, item) {
    trade.select(item);
    sync();
    commit();
    frame('rack');
    await walk(job, SPOTS.bread_rack, -Math.PI / 2);
    const chosen = models[item],
      other = item === 'curry_bread' ? 'butter_roll' : 'curry_bread';
    models[other].visible = false;
    pose(chosen, -1.3, 0.73, -1.68);
    pose(models.tray, -1.3, 0.73, -1.07);
    // The tong blades meet the bread before it moves; both follow the wrist during the lift.
    const arm = hands.start(game.player);
    try {
      await job.wait(hands.move(arm, [-1.3, 0.86, -1.53]));
      pose(models.tongs, -1.3, 0.86, -1.53);
      arm.prop = models.tongs;
      models.tongs.attach(chosen);
      chosen.position.set(0, -0.13, -0.14);
      contacts.push({
        actor: 'player',
        action: 'tongs',
        gap: hands.distance(arm),
        target: arm.target.toArray(),
        hand: arm.hand.getWorldPosition(new THREE.Vector3()).toArray(),
      });
      carry = arm;
      await walk(job, [-1.03, -0.8], -Math.PI / 2);
      carry = null;
      await job.wait(hands.move(arm, [-1.3, 0.85, -0.92]));
      models.tray.attach(chosen);
      chosen.position.set(-0.05, 0.025, -0.04);
      chosen.rotation.set(0, 0, 0);
      arm.prop = null;
      pose(models.tongs, -1.32, 0.82, -0.92);
    } finally {
      hands.stop(arm);
    }
    await walk(job, [-1.03, -0.8], -Math.PI / 2);
    await reach(job, game.player, models.tray, [-0.75, 0.84, -1.6], { carryTo: SPOTS.checkout, grip: [0, 0, 0.1] });
    await walk(job, [0.55, -2.05], Math.PI);
    frame();
  }
  async function pay(job) {
    if (!trade.pay()) {
      commit();
      return;
    }
    commit();
    frame();
    const chosen = models[trade.receipt().item];
    pose(chosen, 0.5, COUNTER.top + 0.043, -3.01);
    models.tray.visible = true;
    pose(models.bag, 0.6, COUNTER.top + 0.2, -2.9);
    await reach(job, clerk, chosen, [0.6, 0.82, -2.9]);
    chosen.visible = false;
    await reach(job, clerk, models.bag, [0.65, COUNTER.top + 0.2, -2.82], { grip: [0, -0.07, -0.06] });
    models.tray.visible = false;
    await walk(job, [0.55, -2.05], Math.PI);
  }
  async function takeBag(job) {
    await walk(job, SPOTS.checkout, Math.PI);
    pose(models.bag, 0.65, COUNTER.top + 0.2, -2.82);
    await reach(job, game.player, models.bag, [0.59, 0.83, -2.53], { grip: -0.07 });
    trade.finish();
    commit();
    models.bag.visible = false;
  }
  async function sit(job) {
    if (!game.player.seated) {
      await walk(job, SEAT.out, 0);
      game.player.sitAt(SEAT.x, SEAT.top, SEAT.z, SEAT.ry);
      game.player.seated = true;
      game.player.seatOut = [...SEAT.out];
      game.walker.facing = SEAT.ry;
    }
    frame('window');
  }
  sync();
  return {
    contacts,
    models,
    trade,
    async act({ state, item }) {
      return actions.run(async (job) => {
        if (state === 'frame') {
          flags.bakery_can_eat = trade.canEat();
          flags.bakery_has_curry = trade.canEat('curry_bread');
          flags.bakery_has_roll = trade.canEat('butter_roll');
          frame();
        } else if (state === 'select') await select(job, item);
        else if (state === 'pay') await pay(job);
        else if (state === 'take') await takeBag(job);
        else if (state === 'cancel') {
          if (trade.receipt().phase === 'selected') {
            await walk(job, SPOTS.checkout, Math.PI);
            frame('rack');
            await reach(job, game.player, models.tray, [0.55, 0.84, -2.4], {
              carryTo: [-1.03, -0.8],
              dropTo: [-1.3, 0.73, -1.07],
              facing: -Math.PI / 2,
              grip: [0, 0, 0.1],
            });
          }
          trade.cancel();
          sync();
          commit();
        } else if (state === 'sit') await sit(job);
        else if (state === 'prepareEat') {
          trade.prepareEat(item);
          commit();
        } else if (state === 'eat') {
          await sit(job);
          const item = flags.bakery_eat_item;
          if (!trade.eat()) return;
          commit();
          const b = models[item];
          pose(b, SEAT.x, 0.72, -0.69);
          await reach(job, game.player, b, [SEAT.x, 0.81, SEAT.z + 0.27], { hold: 750, steady: true, grip: -0.035 });
          b.visible = false;
        } else if (state === 'end') {
          P.cam.release();
          commit();
        } else throw new Error(`Unknown bakery action ${state}`);
        return true;
      });
    },
    update() {
      if (carry) {
        const p = game.player.root.position,
          a = game.player.root.rotation.y;
        carry.target.copy(
          P.space.localToWorld(new THREE.Vector3(p.x + Math.sin(a) * 0.28, 0.84, p.z + Math.cos(a) * 0.28)),
        );
      }
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
      trade.cancel();
      actions.cancel();
      hands.clear();
      carry = null;
      P.cam.release();
      sync();
    },
  };
}
