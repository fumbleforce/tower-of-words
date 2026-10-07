import * as THREE from 'three';
import { staffCounterRoute } from '../../scenes/canteen/plan.js';
import { walkRig, faceRig } from '../../move.js';
import { BODY, bodies } from '../../movement/shared.js';
import { canteenServing } from '../../gameplay/canteen-meals.js';
import { COLLECTION, PARKING, RETURN, tablePoint } from './meal-props.js';

export function mealService(game, P, state, props, hands, frame, commit, flags) {
  const player = game.player;
  const tray = () => props.tray(flags.canteen_meal);
  async function walk(job, at, face) {
    if (player.seated) await job.wait(game.hooks.stand({ who: 'eric' }));
    await job.wait(walkRig(game, player, at));
    if (Math.hypot(player.root.position.x - at[0], player.root.position.z - at[1]) > 0.18)
      throw Error('Canteen approach blocked');
    if (face) await job.wait(faceRig(game, player, face));
  }
  // Grip the front or rear rim inside its corners, within either protagonist's reach.
  function contactGrip(t, wrist, centre = t.root.position) {
    return [-0.18, 0.18]
      .flatMap((x) => [-0.19, 0.19].map((z) => new THREE.Vector3(x, 0.018, z).applyEuler(t.root.rotation)))
      .sort((a, b) => centre.clone().add(a).distanceTo(wrist) - centre.clone().add(b).distanceTo(wrist))[0];
  }
  async function take(job, at) {
    const t = tray();
    hands.stopCarry();
    const arm = hands.start(player),
      wrist = hands.point(arm.hand);
    hands.stop(arm);
    const grip = contactGrip(t, wrist);
    await hands.reach(job, player, t.root.position.clone().add(grip).toArray(), {
      id: 'tray-take',
      item: t.root,
      grip: grip.toArray(),
      end: [wrist.x, wrist.y, wrist.z],
      hold: 250,
    });
    hands.carry(player, t);
    await job.wait(game.wait(350));
    hands.contacts.push(...hands.carryContacts());
  }
  async function put(job, at, rig = player) {
    const t = tray();
    hands.update();
    const held = hands.active.get(rig);
    const wrist = held ? hands.point(held.hand) : t.root.position.clone();
    const grip = hands.rigidCarryGrip(rig) || contactGrip(t, wrist, new THREE.Vector3(...at));
    const from = t.root.position.clone().add(grip);
    hands.stopCarry();
    await hands.reach(job, rig, from.toArray(), {
      item: t.root,
      grip: grip.toArray(),
      end: new THREE.Vector3(...at).add(grip).toArray(),
      id: rig === player ? 'tray-place' : 'staff-tray-place',
    });
  }
  async function collect(job) {
    if (state.phase() === 'carried') return;
    if (!['paid', 'parked'].includes(state.phase())) return;
    const at = state.phase() === 'parked' ? PARKING : COLLECTION;
    frame('counter');
    if (state.phase() === 'paid' && !state.delivered()) {
      if (!P.people.canteen_worker.root.visible || !canteenServing(game.sim.day, game.sim.period)) return false;
      await deliver(job);
    }
    await walk(job, [at[0], -6.03], [at[0], -7]);
    await take(job, at);
    state.take();
    commit();
  }
  async function deliver(job) {
    const worker = P.people.canteen_worker,
      t = tray(),
      radius = Math.max(BODY * worker.root.scale.x, bodies(game).find((body) => body.root === worker.root)?.r || 0),
      route = staffCounterRoute(radius);
    t.root.visible = true;
    hands.carry(worker, t);
    for (const target of route.slice(1)) {
      await job.wait(faceRig(game, worker, target));
      await job.wait(walkRig(game, worker, target, { route: false, avoid: false, speed: 0.8 }));
    }
    await job.wait(faceRig(game, worker, [3.85, -6]));
    hands.update();
    await put(job, COLLECTION, worker);
    state.deliver();
    commit();
    for (const target of route.slice(0, -1).reverse()) {
      await job.wait(faceRig(game, worker, target));
      await job.wait(walkRig(game, worker, target, { route: false, avoid: false, speed: 0.8 }));
    }
    await job.wait(faceRig(game, worker, [1.8, -6]));
  }
  async function park(job) {
    if (state.phase() !== 'carried') return;
    frame('counter');
    await walk(job, [PARKING[0], -6.1], [PARKING[0], -7]);
    await put(job, PARKING);
    state.park();
    commit();
  }
  async function sit(job, id) {
    const seat = P.seats[id];
    if (!seat) throw Error('Unknown canteen chair ' + id);
    if (player.seated) await job.wait(game.hooks.stand({ who: 'eric' }));
    await job.wait(game.hooks.sit({ who: 'eric', at: id }));
    frame('table');
    if (state.phase() === 'carried') {
      await put(job, tablePoint(seat));
      state.place(id);
      commit();
    }
  }
  async function returnTray(job) {
    if (!['carried', 'table', 'eaten'].includes(state.phase())) return;
    if (state.phase() !== 'carried') {
      const seat = P.seats[flags.canteen_meal_seat];
      if (!seat) return;
      if (
        !player.seated ||
        !player.seatOut ||
        Math.hypot(player.seatOut[0] - seat.out[0], player.seatOut[1] - seat.out[1]) > 0.1
      )
        await sit(job, flags.canteen_meal_seat);
      await take(job, tablePoint(seat));
    }
    frame('return');
    await walk(job, [-10.3, -1.08], [-10.3, -0.5]);
    await put(job, RETURN);
    state.returnTray();
    commit();
  }
  async function mouthAction(job, object, lipLocal, { drink = false } = {}) {
    const arm = hands.start(player);
    let yaw = player.root.rotation.y;
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    let head = player.headK || player.head;
    player.root.traverse((o) => {
      if (o.isBone && /^(mixamorig)?Head$/.test(o.name)) head = o;
    });
    if (!head) throw Error('Canteen action needs a real head anchor');
    // Food meets the neutral face; this action never bends the spine toward its target.
    for (let i = arm.chain.length - 1; i >= 0; i--)
      if (/Spine$/.test(arm.chain[i].name)) {
        arm.chain[i].quaternion.copy(arm.base[i]);
        arm.chain.splice(i, 1);
        arm.base.splice(i, 1);
      }
    let restoreBody = () => {};
    let neutralHead, neutralMouth;
    const oldParent = object.parent,
      oldPosition = object.position.clone(),
      oldRotation = object.rotation.clone();
    P.space.attach(object);
    const grip = new THREE.Vector3(0, drink ? 0.025 : 0, drink ? 0 : -0.045);
    try {
      await job.wait(hands.move(arm, object.position.clone().add(grip).toArray()));
      arm.prop = object;
      arm.offset = grip.clone().negate();
      if (drink) {
        // Lift before turning away from the dispenser; the cup follows the real wrist throughout.
        const held = player.root.worldToLocal(arm.hand.getWorldPosition(new THREE.Vector3()));
        arm.follow = () => arm.target.copy(player.root.localToWorld(held.clone()));
        await job.wait(faceRig(game, player, [9.5, -4.8]));
        arm.follow = null;
        frame('drink');
        await job.wait(game.wait(500));
        yaw = player.root.rotation.y;
        forward.set(Math.sin(yaw), 0, Math.cos(yaw));
      }
      // Hold the existing torso/neck pose during the bite or sip. The arm solver cannot chase an idle bob.
      const body = [];
      for (let bone = head; bone && bone !== player.root; bone = bone.parent)
        body.push({ bone, position: bone.position.clone(), rotation: bone.quaternion.clone() });
      const stepNow = player.stepNow;
      player.stepNow = function (...args) {
        stepNow?.apply(this, args);
        for (const b of body) {
          b.bone.position.copy(b.position);
          b.bone.quaternion.copy(b.rotation);
        }
      };
      restoreBody = () => {
        player.stepNow = stepNow;
      };
      player.stepNow();
      player.root.updateWorldMatrix(true, true);
      neutralHead = hands.point(head);
      neutralMouth = neutralHead.clone().addScaledVector(forward, 0.21);
      neutralMouth.y -= 0.035;
      object.rotation.set(drink ? -0.35 : 0, yaw, 0);
      for (let i = 0; i < 5; i++) {
        const mouth = neutralMouth.clone();
        const lip = lipLocal.clone().applyEuler(object.rotation);
        await job.wait(hands.move(arm, mouth.sub(lip).add(grip).toArray(), i ? 0.14 : 0.6));
        await job.wait(game.wait(90));
      }
      P.canteenPhase = drink ? 'water-contact' : 'spoon-contact';
      await job.wait(game.wait(650));
      const mouth = neutralMouth.clone();
      hands.contacts.push({
        id: drink ? 'cup-mouth' : 'spoon-mouth',
        headShift: hands.point(head).distanceTo(neutralHead),
        currentLipGap: P.space.worldToLocal(object.localToWorld(lipLocal.clone())).distanceTo(
          hands
            .point(head)
            .addScaledVector(forward, 0.21)
            .add(new THREE.Vector3(0, -0.035, 0)),
        ),
        gap: hands.point(object).distanceTo(mouth),
        lipGap: P.space.worldToLocal(object.localToWorld(lipLocal.clone())).distanceTo(mouth),
      });
      await job.wait(
        hands.move(arm, [player.root.position.x + forward.x * 0.3, 0.7, player.root.position.z + forward.z * 0.3]),
      );
    } finally {
      arm.follow = null;
      restoreBody();
      hands.stop(arm);
      oldParent.add(object);
      object.position.copy(oldPosition);
      object.rotation.copy(oldRotation);
    }
  }
  return {
    walk,
    collect,
    park,
    sit,
    returnTray,
    async pending(job) {
      await walk(job, [COLLECTION[0], -6.03], [COLLECTION[0], -7]);
      frame('counter');
    },
    async pay(job) {
      if (state.paid()) return true;
      if (!state.current() || game.sim.yen < state.current().price) return false;
      frame('counter');
      await walk(job, [3.85, -6.03], [3.85, -7]);
      const arm = hands.start(player),
        at = hands.point(arm.hand);
      hands.stop(arm);
      props.cashFor(state.current().price);
      props.cash.visible = true;
      P.space.add(props.cash);
      props.cash.position.copy(at);
      try {
        await hands.reach(job, player, at.toArray(), {
          item: props.cash,
          end: [4.02, 0.701, -6.31],
          id: 'payment',
          hold: 450,
        });
        state.pay();
        commit();
        return true;
      } finally {
        if (!job.live()) props.cash.visible = false;
      }
    },
    async eat(job) {
      const seat = P.seats[flags.canteen_meal_seat];
      if (state.phase() !== 'table' || !seat) return;
      if (!player.seated || Math.hypot(player.root.position.x - seat.x, player.root.position.z - seat.z) > 0.15)
        await sit(job, flags.canteen_meal_seat);
      frame('table');
      await job.wait(game.wait(450));
      for (const remaining of [0.7, 0.35, 0]) {
        tray().spoon.userData.bite.visible = true;
        await mouthAction(job, tray().spoon, new THREE.Vector3(0, 0.008, 0.075));
        tray().spoon.userData.bite.visible = false;
        tray().food.scale.y = remaining;
      }
      state.eat();
      tray().food.visible = false;
      commit();
    },
    async water(job) {
      await park(job);
      await walk(job, [9.56, -5.65], [9.56, -6.1]);
      frame('water');
      await job.wait(game.wait(450));
      const cup = props.cup,
        water = cup.children[1],
        rest = [9.66, 0.61, -5.93];
      water.visible = false;
      try {
        await hands.reach(job, player, [rest[0], rest[1] + 0.05, rest[2]], {
          item: cup,
          grip: [0, 0.05, 0],
          end: [9.57, 0.66, -5.9],
          id: 'cup-under-outlet',
        });
        await hands.reach(job, player, hands.point(props.tap).toArray(), { id: 'water-control', hold: 250 });
        props.tap.rotation.x = -0.25;
        props.stream.visible = true;
        P.canteenPhase = 'water-fill';
        water.visible = true;
        await job.wait(
          game.tween(0.8, (k) => {
            if (job.live()) water.position.y = 0.025 + 0.074 * k;
          }),
        );
        props.stream.visible = false;
        props.tap.rotation.x = 0;
        await mouthAction(job, cup, new THREE.Vector3(0, 0.106, 0.025), { drink: true });
        await job.wait(faceRig(game, player, [9.56, -6.1]));
        frame('water');
        await hands.reach(job, player, [9.57, 0.66, -5.9], {
          item: cup,
          grip: [0, 0.05, 0],
          end: [rest[0], rest[1] + 0.05, rest[2]],
          id: 'cup-return',
        });
      } finally {
        props.stream.visible = false;
        props.tap.rotation.x = 0;
        cup.position.set(...rest);
      }
    },
  };
}
