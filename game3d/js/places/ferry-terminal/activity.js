import { terminalFood } from './food.js';
import { cancelSavedWalk } from '../saved-people.js';
import * as THREE from 'three';
import { diningActions } from '../izakaya/actions.js';
import { terminalHands } from './hands.js';
import { terminalProps } from '../../scenes/ferry-terminal/props.js';
import { actionShot } from '../day4/shot.js';
import { walkRig, faceRig } from '../../move.js';
import { TRAVELLER, READER, BAG_FLOOR } from '../../scenes/ferry-terminal/plan.js';
import { flags } from '../../narrative/state.js';
import { save } from '../../sim.js';
export function terminalActivity(game, P) {
  const glazing = P.space.getObjectByName('terminal-glazing');
  const actions = diningActions(),
    hands = terminalHands(game, P),
    props = terminalProps(P.space),
    shot = actionShot(P);
  const traveller = P.people.ferry_traveller,
    reader = P.people.ferry_reader,
    staff = P.people.ferry_staff;
  let phase = 'idle',
    readerHand = null,
    active = true,
    readerDown = false;
  const food = terminalFood(game, P, hands, frame);
  const pose = (rig, seat) => {
    if (rig.torso) rig.torso.rotation.x = 0;
    rig.sitAt(seat.x, seat.top, seat.z, seat.ry);
    rig.seated = true;
    rig.seatOut = [seat.x, seat.z + (seat.ry ? -0.7 : 0.7)];
  };
  function reset(holdReader = true) {
    food.clear();
    hands.clear();
    props.reset(!!flags.ferry_bag_moved);
    pose(traveller, TRAVELLER);
    pose(reader, READER);
    if (reader.headK) reader.headK.rotation.y = readerDown ? 0 : -0.26;
    props.root.attach(props.reader);
    props.reader.position.set(-5.7, 0.61, -5.55);
    props.reader.rotation.x = 0;
    readerHand = null;
    if (holdReader && !readerDown) {
      readerHand = hands.hold(reader, props.reader, [-5.52, 0.77, -5.48]);
      props.reader.rotation.x = 0.16;
    }
    phase = 'idle';
  }
  function frame(who) {
    if (glazing) glazing.visible = who === 'window';
    const phone = P.camera.aspect < 1;
    if (who === 'food') {
      const p = game.player.root.position;
      shot.focus([p.x + 0.1, p.z], phone ? 3.8 : 3.7, 0.8, p.z < -4 ? 0.05 : Math.PI - 0.12, 0.33);
    } else if (who === 'seat') {
      const p = game.player.root.position;
      shot.focus([p.x, p.z], phone ? 6 : 4.5, 0.7, game.player.root.rotation.y + 0.2, 0.48);
    } else if (who === 'ferry_staff') shot.focus([4.25, -5.65], phone ? 7.5 : 5.7, 0.9, 0.25, 0.44);
    else if (who === 'window') shot.focus([-6.5, 2.6], 3, 1.2, 2.85, 0.12);
    else if (who === 'ferry_reader') shot.focus([-5.3, -5.15], phone ? 8.5 : 6, 0.75, 0.22, 0.48);
    else shot.focus([-4.5, -3.25], phone ? 8.5 : 6, 0.1, 2.4, 0.58);
  }
  async function walk(job, rig, to, face) {
    await job.wait(walkRig(game, rig, to));
    if (Math.hypot(rig.root.position.x - to[0], rig.root.position.z - to[1]) > 0.3)
      throw Error('Terminal actor approach blocked');
    if (face) await job.wait(faceRig(game, rig, face));
  }
  async function moveBag(job) {
    if (flags.ferry_bag_moved) return;
    frame('ferry_traveller');
    await job.wait(game.wait(700));
    traveller.seated = false;
    traveller.setState('idle');
    traveller.root.position.set(-5.7, 0, -3.65);
    await walk(job, traveller, [-4.8, -3.44], [-4.8, -2.94]);
    const torso = traveller.torso,
      tilt = torso?.rotation.x;
    if (torso) torso.rotation.x = 0.42;
    const arm = hands.start(traveller),
      initial = hands.point(props.bag);
    try {
      phase = 'bag-contact';
      await job.wait(hands.move(arm, initial.toArray()));
      await job.wait(game.wait(400));
      hands.contact(arm, 'bag-pickup');
      P.space.attach(props.bag);
      arm.prop = props.bag;
      arm.offset = new THREE.Vector3();
      phase = 'bag-carry';
      if (torso) torso.rotation.x = tilt;
      await job.wait(hands.move(arm, [-4.55, 0.74, -3.14]));
      const moving = walkRig(game, traveller, [-6.59, -3.63]);
      // Carry target follows the actual body throughout its routed walk.
      arm.carry = true;
      await job.wait(moving);
      arm.carry = false;
      await job.wait(faceRig(game, traveller, [-6.59, -2.8]));
      phase = 'bag-place';
      if (torso) torso.rotation.x = 0.9;
      await job.wait(hands.move(arm, props.bagAt(BAG_FLOOR)));
      await job.wait(game.wait(450));
      hands.contact(arm, 'bag-floor');
      arm.prop = null;
      props.bag.position.set(...props.bagAt(BAG_FLOOR));
      flags.ferry_bag_moved = true;
      save(game);
    } finally {
      hands.stop(arm);
      if (torso && job.live()) torso.rotation.x = tilt;
    }
    await walk(job, traveller, [-5.7, -3.65], [-5.7, -2.8]);
    pose(traveller, TRAVELLER);
    phase = 'idle';
  }
  async function point(job, rig, to, id) {
    await hands.reach(job, rig, to, { id, hold: 550 });
  }
  reset();
  return {
    activate() {
      if (!active) {
        active = true;
        readerDown = false;
        reset();
      }
    },
    props,
    contacts: hands.contacts,
    get phase() {
      return phase;
    },
    frame,
    async act({ state, who = 'ferry_staff', seat, item }) {
      return (
        (await actions.run(async (job) => {
          if (state === 'sit') {
            const s = P.seats[seat];
            if (!s || (seat === 'ferry_window_seat' && !flags.ferry_bag_moved)) return false;
            if (
              !game.player.seated ||
              Math.hypot(game.player.root.position.x - s.x, game.player.root.position.z - s.z) > 0.1
            ) {
              game.standUp?.();
              await job.wait(game.walkTo(...s.out));
              if (Math.hypot(game.player.root.position.x - s.out[0], game.player.root.position.z - s.out[1]) > 0.28)
                throw Error('Terminal seat approach blocked');
              game.player.sitAt(s.x, s.top, s.z, s.ry);
              game.player.seated = true;
              game.player.seatOut = [...s.out];
              game.walker.facing = s.ry;
            }
            frame(
              seat === 'ferry_window_seat' ? 'ferry_traveller' : seat === 'ferry_quiet_seat' ? 'ferry_reader' : 'seat',
            );
          } else if (state === 'foodSync') food.sync();
          else if (state === 'prepareFood') return food.prepare(item);
          else if (state === 'consume') return await food.consume(job);
          else if (state === 'frame') {
            frame(who);
            await job.wait(game.wait(600));
          } else if (state === 'bag') await moveBag(job);
          else if (state === 'seatPoint') {
            const p = game.player.root.position;
            await point(job, game.player, [p.x - 0.25, 0.83, p.z - 0.32], 'player-seat-point');
          } else if (state === 'foodMime') {
            const p = game.player.root.position,
              a = game.player.root.rotation.y;
            await point(
              job,
              game.player,
              [p.x + Math.sin(a) * 0.22, 1.02, p.z + Math.cos(a) * 0.22],
              'player-food-mime',
            );
          } else if (state === 'tidy') {
            frame('ferry_staff');
            await job.wait(game.wait(650));
            phase = 'staff-rack';
            await hands.reach(job, staff, hands.point(props.staff).toArray(), {
              item: props.staff,
              via: [4.87, 0.92, -6.28],
              end: [4.87, 0.8, -6.28],
              id: 'staff-leaflet',
            });
            props.staff.rotation.x = -0.9;
          } else if (state === 'staffSeats') await point(job, staff, [4.05, 0.9, -6.15], 'staff-seats');
          else if (state === 'staffBin') await point(job, staff, [4.98, 0.8, -6.2], 'staff-bin');
          else if (state === 'readerHello') {
            readerDown = true;
            if (reader.headK) reader.headK.rotation.y = 0;
            if (readerHand) hands.stop(readerHand);
            readerHand = null;
            props.reader.position.set(-5.7, 0.61, -5.55);
            props.reader.rotation.x = 0;
            frame('ferry_reader');
          } else if (state === 'window') {
            await point(job, reader, [-5.4, 0.95, -5.2], 'reader-window');
            frame('window');
            await job.wait(game.wait(750));
          } else if (state === 'readerSeat') await point(job, reader, [-5.32, 0.71, -5.64], 'reader-seat');
          else if (state === 'restKnee') {
            await point(job, traveller, [-5.48, 0.55, -3.04], 'traveller-knee');
          } else if (state === 'end') {
            readerDown = false;
            reset();
            if (glazing) glazing.visible = false;
            P.cam.release();
          } else throw Error('Unknown terminal action ' + state);
          phase = 'idle';
          return true;
        })) === true
      );
    },
    update() {
      if (!active) return;
      for (const s of hands.active.values())
        if (s.carry) {
          const p = s.r.root.position,
            a = s.r.root.rotation.y;
          s.target.copy(
            P.space.localToWorld(new THREE.Vector3(p.x + Math.sin(a) * 0.28, 0.74, p.z + Math.cos(a) * 0.28)),
          );
        }
      hands.update();
      shot.update();
    },
    snapshot: () => ({ shot: shot.snapshot(), readerDown }),
    restore(data) {
      actions.cancel();
      active = true;
      readerDown = !!data?.readerDown;
      reset();
      shot.load(data?.shot);
    },
    leave() {
      actions.cancel();
      for (const rig of [traveller, reader, staff]) cancelSavedWalk(rig);
      hands.clear();
      reset(false);
      active = false;
      if (glazing) glazing.visible = false;
      P.cam.release();
    },
  };
}
