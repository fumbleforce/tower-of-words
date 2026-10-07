import { actionShot } from '../day4/shot.js';
import { poolAction } from '../day3/pool-action.js';
import { snapshotPeople, restorePeople, cancelSavedWalk, snapshotObject, restoreObject } from '../saved-people.js';
import { karaokeProps, SONG_NUMBER } from './karaoke-props.js';
import { karaokeActions } from './karaoke-actions.js';

export function createKaraokeStage(game, P, w) {
  const props = karaokeProps(P.space),
    action = poolAction(game),
    shot = actionShot(P);
  const moves = karaokeActions(game, P, props, action);
  const people = () => ({ eric: game.player, kenji: P.people.kenji, kuroda: P.people.kuroda });
  let active = false,
    prior = null,
    queue = [],
    selected = false,
    micHolder = null,
    receiptSide = 'front',
    cardAngle = 0;
  const avoids = new Map();
  const ready = () => Object.values(people()).every((r) => r?.root?.parent === P.space && r.sitAt);
  const portrait = () => (P.camera?.aspect || 1.6) < 1;
  const establish = () => shot.focus([0, -1.7], portrait() ? 29 : 8, 0.55, 0.05, 0.57);
  function group(who) {
    if (!portrait()) return establish();
    const p = moves.actor(who).root.position;
    shot.focus([p.x, p.z], 8.8, 0.72, who === 'kenji' ? 0.3 : -0.3, 0.45);
  }
  const table = () => shot.focus([-0.35, -1.75], portrait() ? 5.5 : 4, 0.63, 0.25, 0.56);
  const screen = () => shot.focus([0, -3.5], portrait() ? 10.3 : 3.9, 0.9, 0, 0.16);
  function sync() {
    props.root.visible = active;
    w.restingMicrophone.visible = !active;
    props.queue(queue, selected);
    cardAngle = receiptSide === 'back' ? Math.PI : 0;
    props.card.rotation.y = cardAngle - props.receipt.rotation.y;
  }
  function finish() {
    action.cancel();
    moves.dispose();
    if (active) {
      for (const r of Object.values(people())) if (r) cancelSavedWalk(r);
      if (prior) {
        restorePeople({ kenji: P.people.kenji, kuroda: P.people.kuroda }, prior);
        if (game.place === P) restorePeople({ eric: game.player }, prior);
      }
    }
    for (const [rig, value] of avoids) rig._noAvoid = value;
    avoids.clear();
    active = false;
    prior = null;
    micHolder = null;
    props.reset();
    sync();
    P.cam.release();
    game.walker.sync();
  }
  async function getMic(who) {
    if (micHolder === who) return;
    if (micHolder) {
      await moves.pass(micHolder, who);
      micHolder = who;
      return;
    }
    await moves.walk(who, [-1.41, -1.87], [-0.8, -1.87]);
    await moves.pickup(who, props.microphone);
    micHolder = who;
    const rig = moves.actor(who);
    await moves.carry(who, [rig.root.position.x + 0.25, 0.8, rig.root.position.z]);
  }
  return {
    props,
    moves,
    ready,
    async act({ state, who } = {}) {
      const speaker = who || micHolder || 'kenji';
      who ||= 'kuroda';
      if (state === 'finish') {
        finish();
        return true;
      }
      if (!['eric', 'kenji', 'kuroda'].includes(who)) throw new Error('Unknown karaoke participant ' + who);
      if (!ready()) throw new Error('Karaoke club needs its three actual participants');
      const performStep = async () => {
        if (state === 'start') {
          if (!active) {
            prior = snapshotPeople(people());
            for (const rig of Object.values(people())) {
              avoids.set(rig, rig._noAvoid);
              rig._noAvoid = true;
            }
            active = true;
            queue = [];
            selected = false;
            props.reset();
            sync();
          }
          for (const id of ['kenji', 'kuroda', 'eric']) await moves.sit(id);
          establish();
          return;
        }
        if (!active) throw new Error('Karaoke club action without start');
        if (state === 'group') {
          group(speaker);
          return;
        }
        if (state === 'queue' || state === 'clearQueueExtras') {
          queue =
            state === 'queue'
              ? [
                  { number: '0124', who: 'kenji' },
                  { number: '0286', who: 'kenji' },
                  { number: '0492', who: 'kenji' },
                ]
              : [...queue.filter((q) => q.who !== 'kenji'), ...queue.filter((q) => q.who === 'kenji').slice(0, 1)];
          await moves.walk('kenji', [-0.18, -1.04], [-0.2, -1.75]);
          await moves.reach('kenji', [-0.2, 0.71, -1.75]);
          await moves.sit('kenji');
          sync();
          screen();
          return;
        }
        if (state === 'receiptFront' || state === 'receiptBack') {
          table();
          if (!moves.snapshot().kuroda || moves.snapshot().kuroda.item !== props.receipt.name) {
            await moves.walk('kuroda', [0.44, -2.14], [-0.2, -2.14]);
            await moves.pickup('kuroda', props.receipt);
          }
          await moves.face('kuroda', [0.44, -0.9]);
          await moves.carry('kuroda', [0.22, 0.72, -1.9]);
          const from = cardAngle,
            to = state === 'receiptBack' ? Math.PI : 0;
          await action.wait(
            action.tween(0.55, (k) => {
              cardAngle = from + (to - from) * k;
              props.card.rotation.y = cardAngle - props.receipt.rotation.y;
            }),
          );
          receiptSide = state === 'receiptBack' ? 'back' : 'front';
          sync();
          shot.focus([0.44, -1.92], portrait() ? 5.5 : 3.3, 0.76, 0.08, 0.28);
          return;
        }
        if (state === 'selectNumber') {
          if (moves.snapshot().kuroda?.item === props.receipt.name) {
            await moves.carry('kuroda', [0.19, 0.57, -1.92]);
            moves.drop('kuroda', props.receipt);
            props.receipt.rotation.x = -Math.PI / 2;
          }
          await moves.walk('kuroda', [-0.18, -1.04], [-0.2, -1.75]);
          await moves.reach('kuroda', [-0.2, 0.71, -1.75]);
          if (!queue.some((q) => q.number === SONG_NUMBER)) queue.push({ number: SONG_NUMBER, who: 'kuroda' });
          await moves.sit('kuroda');
          selected = true;
          sync();
          screen();
          return;
        }
        if (['offerMicrophone', 'takeMicrophone', 'keepMicrophone', 'passMicrophone'].includes(state)) {
          if (micHolder && micHolder !== who) shot.focus([0.72, -0.9], portrait() ? 8 : 4.5, 0.72, 0, 0.36);
          else table();
          await getMic(who);
          const r = moves.actor(who),
            p = r.root.position;
          shot.focus([p.x, p.z], portrait() ? 6.6 : 4.5, 0.77, 0, 0.36);
          await moves.carry(who, [
            p.x + Math.sin(r.root.rotation.y) * 0.26,
            0.83,
            p.z + Math.cos(r.root.rotation.y) * 0.26,
          ]);
          return;
        }
        throw new Error('Unknown karaoke activity ' + state);
      };
      let completed = false;
      await action.run(async () => {
        await action.wait(performStep());
        completed = true;
      });
      return completed;
    },
    update() {
      shot.update();
      moves.update();
      if (active) {
        for (const rig of Object.values(people())) rig._noAvoid = true;
        props.card.rotation.y = cardAngle - props.receipt.rotation.y;
      }
    },
    snapshot() {
      return {
        active,
        prior,
        queue,
        selected,
        micHolder,
        receiptSide,
        people: snapshotPeople(people()),
        held: moves.snapshot(),
        shot: shot.snapshot(),
        receipt: snapshotObject(props.receipt),
        microphone: snapshotObject(props.microphone),
      };
    },
    restore(saved) {
      for (const [rig, value] of avoids) rig._noAvoid = value;
      avoids.clear();
      action.cancel();
      moves.dispose();
      props.reset();
      shot.load(null);
      active = !!saved?.active && !!ready();
      prior = active ? saved.prior : null;
      queue = saved?.queue || [];
      selected = !!saved?.selected;
      micHolder = active ? saved.micHolder : null;
      receiptSide = saved?.receiptSide || 'front';
      if (active) {
        for (const rig of Object.values(people())) {
          avoids.set(rig, rig._noAvoid);
          rig._noAvoid = true;
        }
        restorePeople(people(), saved.people);
        restoreObject(props.receipt, saved.receipt);
        restoreObject(props.microphone, saved.microphone);
        moves.restore(saved.held);
        shot.load(saved.shot);
        game.walker.sync();
      }
      sync();
    },
    leave: finish,
  };
}
