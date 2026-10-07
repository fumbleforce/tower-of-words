import * as THREE from 'three';
import { walkRig, faceRig, glide } from '../../move.js';
import { diningActions } from '../izakaya/actions.js';
import { cancelSavedWalk } from '../saved-people.js';
import { mioLunchProps } from './props.js';
import { mioLunchHands } from './hands.js';
import { eatMioBento } from './meal.js';
import { markMioChecklist } from './checklist.js';
import { mioLunchEyeline } from './eyeline.js';
import { LUNCH_PLAN as PLAN, LUNCH_SEATS as SEATS, LUNCH_TOP } from './plan.js';

export function mioLunchStage(game, P, state) {
  const props = mioLunchProps(P.space),
    hands = mioLunchHands(game, P.space),
    actions = diningActions();
  const mio = () => P.people.mio || game.mioNpc;
  const rig = (id) => (id === 'eric' ? game.player : mio());
  let phase = 'idle',
    day = null,
    cableParked = false;
  const context = () => ({
    day: game.sim.day,
    period: game.sim.period,
    place: P.name,
    flags: game.flagsRef,
    available: mio()?.root.visible && !mio()?._walk,
  });
  function frame(kind = 'pair') {
    let at = [5.2, -2.1],
      height = 0.54,
      yaw = P.cam.camera.aspect < 1 ? 0 : -0.55,
      width = P.cam.camera.aspect < 1 ? 1.2 : 0.98;
    if (kind === 'meal') {
      at = [5.9, -2.3];
      height = 0.6;
      yaw = -0.9;
      width = P.cam.camera.aspect < 1 ? 0.55 : 0.5;
    }
    if (kind === 'standing') {
      at = [5.45, -1.8];
      height = 0.8;
      yaw = Math.PI;
      width = 0.74;
    }
    if (kind === 'cable') {
      at = [4.45, -2.15];
      height = 0.4;
      yaw = 0.6;
      width = 0.55;
    }
    if (kind === 'intake') {
      at = [5.12, -2.65];
      height = 0.65;
      yaw = -0.9;
      width = 0.72;
    }
    if (kind === 'door') {
      at = [5.1, 0.1];
      height = 0.5;
      yaw = 0.2;
      width = 1;
    }
    if (kind === 'lift') {
      at = [-5.45, -3];
      height = 0.55;
      yaw = 0.1;
      width = 0.95;
    }
    P.cam.closeOn(at, 1, height);
    // officeChatCamera owns lens, fit, release and Continue for this saved opt-in shot.
    P.cam.close.conversationShot = {
      who: 'mio-lunch',
      yaw,
      elev: THREE.MathUtils.degToRad(15),
      fov:
        kind === 'standing'
          ? P.cam.camera.aspect < 1
            ? 116
            : 75
          : P.cam.camera.aspect < 1
            ? kind === 'meal'
              ? 80
              : 110
            : 65,
      minDistance: kind === 'standing' || (kind === 'meal' && P.cam.camera.aspect < 1) ? 1 : 1.6,
      halfWidth: width,
    };
  }
  async function walk(job, person, to, face) {
    await job.wait(walkRig(game, person, to));
    if (Math.hypot(person.root.position.x - to[0], person.root.position.z - to[1]) > 0.32)
      throw new Error('Mio lunch approach is blocked: ' + JSON.stringify({ to, at: person.root.position.toArray() }));
    if (face) await job.wait(faceRig(game, person, face));
    if (person === game.player) game.walker.sync?.();
  }
  async function stand(job, person, seat) {
    if (!person.seated) return;
    const from = person.root.position.clone();
    person.seated = false;
    person.setState('idle');
    await job.wait(
      game.tween(0.45, (k) => {
        if (job.live())
          person.root.position.set(
            THREE.MathUtils.lerp(from.x, seat.walk[0], k),
            THREE.MathUtils.lerp(from.y, 0, k),
            THREE.MathUtils.lerp(from.z, seat.walk[1], k),
          );
      }),
    );
    if (person === game.player) game.walker.sync?.();
  }
  async function perch(job, person, seat) {
    await walk(job, person, seat.walk, [seat.x, seat.z]);
    person.sitAt(seat.x, LUNCH_TOP, seat.z, 0);
    person.seated = true;
    if (person === game.player) game.walker.sync?.();
  }
  async function parkCable(job) {
    if (cableParked) return;
    frame('cable');
    await perch(job, mio(), SEATS.eric);
    mio().pose.bow = 0.25;
    await job.wait(game.wait(350));
    const arm = await hands.reach(job, mio(), hands.point(props.cable).toArray(), 'cable-pickup');
    hands.grip(arm, props.cable);
    await job.wait(hands.move(arm, [4.45, 0.52, -2.12]));
    await job.wait(hands.move(arm, PLAN.cableHook));
    props.cable.rotation.x = Math.PI / 2;
    await job.wait(game.wait(300));
    hands.contact(arm, 'cable-hook');
    await job.wait(game.wait(450));
    arm.prop = null;
    hands.stop(arm);
    mio().pose.bow = 0;
    props.root.attach(props.cable);
    props.cable.position.fromArray(PLAN.cableHook);
    cableParked = true;
    await stand(job, mio(), SEATS.eric);
  }
  async function offer(job, step) {
    if (state.offer(context()) !== step) throw new Error('Wrong Mio lunch offer');
    day = game.sim.day;
    props.root.visible = true;
    P.hooks.machineDoor({ state: 'open' });
    frame();
    await parkCable(job);
    await walk(job, mio(), PLAN.handover.mio, PLAN.handover.player);
    frame();
    props.sheet.visible = step === 3;
    phase = step === 2 ? 'lunch-offer' : 'check-offer';
  }
  async function sit(job) {
    state.advance('accepted');
    await walk(job, game.player, SEATS.eric.walk, [SEATS.mio.x, SEATS.mio.z]);
    await walk(job, mio(), SEATS.mio.walk, [SEATS.eric.x, SEATS.eric.z]);
    for (const [id, seat] of Object.entries(SEATS)) {
      const person = rig(id);
      person.sitAt(seat.x, LUNCH_TOP, seat.z, seat.ry + (id === 'eric' ? -0.3 : 0.3));
      person.seated = true;
      person.seatOut = [...seat.walk];
    }
    game.walker.sync?.();
    const seat = SEATS.mio;
    props.food.position.set(seat.x + Math.sin(seat.ry) * 0.15, LUNCH_TOP + 0.055, seat.z - 0.035);
    props.lid.visible = false;
    state.advance('seated');
    phase = 'seated';
    frame();
  }
  async function eat(job) {
    phase = 'bite';
    frame('meal');
    await eatMioBento(game, job, mio(), props, hands);
    state.advance('ate');
    phase = 'ate';
  }
  async function handover(job) {
    frame('intake');
    await walk(job, mio(), PLAN.sheetApproach, [PLAN.sheetRack[0], PLAN.sheetRack[2]]);
    mio().pose.bow = 0.35;
    await job.wait(game.wait(350));
    const edge = P.space.worldToLocal(props.sheet.localToWorld(new THREE.Vector3(0, 0.015, 0.12)));
    const giver = await hands.reach(job, mio(), edge.toArray(), 'sheet-pickup');
    hands.grip(giver, props.sheet, [0, 0.015, 0.12]);
    mio().pose.bow = 0;
    hands.freeTorso(giver);
    giver.carry = true;
    await walk(job, mio(), PLAN.handover.mio, PLAN.handover.player);
    await walk(job, game.player, PLAN.handover.player, PLAN.handover.mio);
    giver.carry = false;
    frame('standing');
    const taker = await hands.pass(job, giver, game.player, props.sheet, [5.45, 0.65, -1.8], 'sheet-handover');
    hands.freeTorso(taker);
    taker.carry = true;
    state.advance('held');
    phase = 'handover';
    frame('standing');
  }
  async function leaveForLunch(job) {
    await perch(job, mio(), SEATS.mio);
    const arm = await hands.reach(job, mio(), hands.point(props.food).toArray(), 'bento-pickup');
    hands.grip(arm, props.food);
    arm.carry = true;
    await stand(job, mio(), SEATS.mio);
    frame('door');
    for (const to of [PLAN.doorApproach, PLAN.door, PLAN.corridor, PLAN.lobby, PLAN.exit]) await walk(job, mio(), to);
    frame('lift');
    P.hooks.liftOpen();
    await job.wait(game.wait(800));
    await job.wait(glide(game, mio().root, [-5.45, -3.7], 1));
    P.hooks.liftClose();
    await job.wait(game.wait(700));
    phase = 'outside';
    hands.stop(arm);
    mio().root.visible = props.food.visible = false;
    if (mio().blob) mio().blob.visible = false;
    state.advance('away');
    frame('intake');
  }
  async function inspect(job) {
    await walk(job, game.player, PLAN.inspect, [PLAN.intake[0], PLAN.intake[2]]);
    frame('intake');
    phase = 'inspect';
    await job.wait(game.wait(800));
    state.advance('inspected');
  }
  async function mark(job) {
    await perch(job, game.player, SEATS.eric);
    frame('cable');
    phase = 'mark';
    await markMioChecklist(game, job, props, hands);
    state.advance('marked');
  }
  async function returnSheet(job) {
    phase = 'return';
    mio().root.visible = props.food.visible = true;
    if (mio().blob) mio().blob.visible = true;
    const arm = hands.start(mio());
    hands.grip(arm, props.food);
    arm.carry = true;
    frame('lift');
    P.hooks.liftOpen();
    await job.wait(game.wait(800));
    await job.wait(glide(game, mio().root, PLAN.exit, 1));
    P.hooks.liftClose();
    frame('door');
    for (const to of [PLAN.lobby, PLAN.corridor, PLAN.door, PLAN.doorApproach, SEATS.mio.walk])
      await walk(job, mio(), to);
    await perch(job, mio(), SEATS.mio);
    arm.carry = false;
    await job.wait(hands.move(arm, [SEATS.mio.x, LUNCH_TOP + 0.005, SEATS.mio.z + 0.13]));
    hands.stop(arm);
    props.root.attach(props.food);
    props.food.position.set(SEATS.mio.x, LUNCH_TOP + 0.005, SEATS.mio.z + 0.13);
    await stand(job, mio(), SEATS.mio);
    await walk(job, mio(), PLAN.handover.mio, PLAN.handover.player);
    const giver = await hands.reach(job, game.player, hands.point(props.sheet).toArray(), 'marked-sheet-pickup');
    hands.grip(giver, props.sheet);
    giver.carry = true;
    await stand(job, game.player, SEATS.eric);
    await walk(job, game.player, PLAN.handover.player, PLAN.handover.mio);
    giver.carry = false;
    frame('standing');
    const hand = await hands.pass(job, giver, mio(), props.sheet, [5.45, 0.65, -1.8], 'sheet-return');
    hands.freeTorso(hand);
    hand.carry = true;
    state.advance('returned');
    frame('standing');
  }
  async function settle(job) {
    if (state.step === 3) {
      const arm = hands.active.get(mio());
      if (arm?.prop !== props.sheet) throw new Error('Mio has not received her checklist');
    }
    hands.clear();
    for (const [id, seat] of Object.entries(SEATS)) await stand(job, rig(id), seat);
    state.advance('settled');
    phase = 'settled';
  }
  function release() {
    hands.clear();
    if (mio()?.pose) mio().pose.bow = 0;
    P.cam.release();
    props.park();
    if (cableParked) {
      props.cable.position.fromArray(PLAN.cableHook);
      props.cable.rotation.x = Math.PI / 2;
    }
    props.root.visible = false;
    phase = 'idle';
  }
  const handlers = {
    offerLunch: (job) => offer(job, 2),
    offerHelp: (job) => offer(job, 3),
    sit,
    eat,
    handover,
    acceptHelp: async () => {
      state.advance('accepted');
    },
    leaveForLunch,
    inspect,
    mark,
    return: returnSheet,
    settle,
    free: async (job) => {
      await walk(job, mio(), SEATS.mio.walk, [SEATS.mio.x, SEATS.mio.z]);
      state.clear();
      release();
    },
  };
  return {
    props,
    hands,
    context,
    release,
    routine(visible) {
      if (state.phase !== 'idle') return;
      if (day !== game.sim.day) {
        day = game.sim.day;
        cableParked = false;
        props.park();
      }
      props.root.visible = !!visible && !!mio()?.root.visible;
    },
    run({ state: action }) {
      if (!handlers[action]) throw new Error('Unknown Mio lunch action: ' + action);
      return actions.run((job) => handlers[action](job));
    },
    update() {
      hands.update();
      if (phase === 'seated' || phase === 'ate') mioLunchEyeline(mio());
    },
    cancel() {
      actions.cancel();
      hands.clear();
      if (state.phase !== 'idle') {
        cancelSavedWalk(mio());
        cancelSavedWalk(game.player);
      }
      release();
    },
    snapshot: () => ({
      state: state.snapshot(),
      phase,
      day,
      cableParked,
      props: props.snapshot(),
      hands: hands.snapshot({ eric: game.player, mio: mio() }, props),
      bow: mio()?.pose?.bow || 0,
    }),
    restore(saved) {
      actions.cancel();
      hands.clear();
      state.restore(saved?.state);
      phase = saved?.phase || 'idle';
      day = saved?.day ?? null;
      cableParked = !!saved?.cableParked;
      props.restore(saved?.props);
      if (mio()?.pose) mio().pose.bow = saved?.bow || 0;
      hands.restore(saved?.hands, { eric: game.player, mio: mio() }, props);
    },
    get phase() {
      return phase;
    },
  };
}
