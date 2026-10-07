import * as THREE from 'three';
import { diningActions } from '../../places/izakaya/actions.js';
import { diningHands } from '../../places/izakaya/hands.js';
import { senderCamera } from './camera.js';
import { faceRig } from '../../move.js';

export const SENDER_SPOTS = {
  sender_console: [4.2, -0.78],
  sender_guest: [4.92, -0.45],
  sender_desk: [-1.25, -1.9],
  sender_door: [5.7, 1.2],
  sender_mori_door: [4.95, 0.1],
};
export function senderStage(game, P, props) {
  const actions = diningActions(),
    hands = diningHands(game, P.space),
    shot = senderCamera(game, P);
  const contacts = [];
  let phase = null;
  let pointing = null,
    carrying = null;
  const present = (who) => {
    const rig = who === 'eric' ? game.player : P.people[who];
    return rig?.root.visible && rig.root.parent === P.space && !rig._walk ? rig : null;
  };
  async function walk(job, who, to) {
    const actor = present(who);
    if (!actor) return false;
    if (actor.seated) await job.wait(game.hooks.stand({ who }));
    await job.wait(game.hooks.walk({ who, to }));
    const rig = present(who);
    if (!rig || (!rig.seated && Math.hypot(rig.root.position.x - to[0], rig.root.position.z - to[1]) > 0.3))
      return false;
    return true;
  }
  function frameConsole() {
    shot.focus([4.5, -0.85], 3.0, 0.68, 2.6, 0.5);
  }
  async function touch(job, who, target, name) {
    const rig = present(who);
    if (!rig) return false;
    const arm = hands.start(rig);
    try {
      await job.wait(hands.move(arm, target));
      hands.update();
      phase = name;
      contacts.push({
        who,
        name,
        gap: hands.distance(arm),
        hand: arm.hand.getWorldPosition(new THREE.Vector3()).toArray(),
        target: P.space.localToWorld(new THREE.Vector3(...target)).toArray(),
      });
      await job.wait(game.wait(700));
    } finally {
      hands.stop(arm);
      phase = null;
    }
    return true;
  }
  return {
    contacts,
    get phase() {
      return phase;
    },
    present,
    async act({ action }) {
      return actions.run(async (job) => {
        if (game.place !== P) return false;
        if (action === 'desk') {
          if (!present('mio') || !(await walk(job, 'eric', SENDER_SPOTS.sender_desk))) return false;
          game.hooks.face({ who: 'eric', to: 'mio' });
          game.hooks.face({ who: 'mio', to: 'eric' });
          shot.pair();
        } else if (action === 'screen') {
          if (!present('mio')) return false;
          shot.focus([-1.84, -2.78], 0.9, 0.5, 1.2, 0.3, 0.3);
          await job.wait(faceRig(game, P.people.mio, [-2, -4]));
          await touch(job, 'mio', [-1.94, 0.448, -2.85], 'desk-keyboard');
          await job.wait(faceRig(game, P.people.mio, SENDER_SPOTS.sender_desk));
          shot.pair();
        } else if (action === 'door') {
          if (!present('mori')) return false;
          P.hooks.machineDoor({ state: 'open' });
          if (!(await walk(job, 'eric', SENDER_SPOTS.sender_door))) return false;
          if (!(await walk(job, 'mori', SENDER_SPOTS.sender_mori_door))) return false;
          game.hooks.face({ who: 'eric', to: 'mori' });
          game.hooks.face({ who: 'mori', to: 'sender_console' });
          shot.focus([4.95, 0.65], 2.3, 0.65, Math.PI, 0.3, 0.8);
          pointing = hands.start(P.people.mori, 'Left');
          await job.wait(hands.move(pointing, [4.58, 0.83, -0.2]));
          phase = 'door-point';
          await job.wait(game.wait(800));
          shot.focus([4.2, -1.3], 1.2, 0.65, 1.1, 0.4, 0.4);
          phase = 'door-referent';
          await job.wait(game.wait(700));
          phase = null;
        } else if (action === 'wake') {
          if (!(await walk(job, 'eric', SENDER_SPOTS.sender_console))) return false;
          game.hooks.face({ who: 'eric', to: [4.2, -1.3] });
          frameConsole();
          if (!(await touch(job, 'eric', [4.36, 0.538, -1.13], 'wake-control'))) return false;
        } else if (action === 'mori' || action === 'mio') {
          if (!(await walk(job, action, SENDER_SPOTS.sender_guest))) return false;
          game.hooks.face({ who: action, to: 'eric' });
          game.hooks.face({ who: 'eric', to: action });
          frameConsole();
        } else if (action === 'point') {
          if (!present('mori')) return false;
          game.hooks.face({ who: 'mori', to: [4.2, -1.3] });
          pointing = hands.start(P.people.mori, 'Left');
          await job.wait(hands.move(pointing, [4.39, 0.83, -1.26]));
        } else if (action === 'moriHome') {
          if (pointing) hands.stop(pointing);
          pointing = null;
          if (!(await walk(job, 'mori', [2.3, -2.55]))) return false;
        } else if (action === 'mioHome' || action === 'note' || action === 'payoff') {
          const mio = present('mio');
          if (!mio) return false;
          if (!mio.seated || Math.hypot(mio.root.position.x + 2, mio.root.position.z + 2.5) > 0.65) {
            if (!(await walk(job, 'mio', [-2, -2.05]))) return false;
            await job.wait(game.hooks.sit({ who: 'mio', at: 'mio_seat' }));
          }
          if (action === 'payoff') {
            if (!(await walk(job, 'eric', SENDER_SPOTS.sender_desk))) return false;
            game.hooks.face({ who: 'eric', to: 'mio' });
            await job.wait(faceRig(game, mio, SENDER_SPOTS.sender_desk));
            shot.pair();
          }
          if (action === 'note') {
            if (!(await walk(job, 'eric', SENDER_SPOTS.sender_desk))) return false;
            await job.wait(faceRig(game, P.people.mio, [-2, -4]));
            shot.focus([-1.84, -2.78], 0.9, 0.5, 1.2, 0.3, 0.3);
            const arm = hands.start(P.people.mio);
            try {
              await job.wait(hands.move(arm, [-1.71, 0.445, -2.72]));
              props.note.visible = true;
              carrying = arm;
              phase = 'note-carry';
              await job.wait(hands.move(arm, [-1.79, 0.445, -2.78]));
              hands.update();
              contacts.push({
                who: 'mio',
                name: 'retained-note',
                gap: hands.distance(arm),
                hand: arm.hand.getWorldPosition(new THREE.Vector3()).toArray(),
                target: P.space.localToWorld(new THREE.Vector3(-1.79, 0.445, -2.78)).toArray(),
              });
              phase = 'note-place';
              await job.wait(game.wait(700));
              carrying = null;
              props.note.position.set(0.21, 0.425, 0.22);
            } finally {
              carrying = null;
              hands.stop(arm);
              phase = null;
            }
            await job.wait(faceRig(game, P.people.mio, SENDER_SPOTS.sender_desk));
            shot.pair();
          }
        } else if (action === 'release') {
          if (pointing) hands.stop(pointing);
          pointing = null;
          props.turnDesk(0);
          P.cam.release();
        }
        return game.place === P;
      });
    },
    update() {
      hands.update();
      if (carrying) {
        props.note.visible = true;
        props.note.position.copy(props.note.parent.worldToLocal(carrying.hand.getWorldPosition(new THREE.Vector3())));
      }
      shot.update();
    },
    snapshot: () => ({
      shot: shot.snapshot(),
      deskTurn: props.deskMonitor.rotation.y,
      pointing: pointing ? P.space.worldToLocal(pointing.target.clone()).toArray() : null,
    }),
    restore(saved) {
      phase = null;
      carrying = null;
      hands.clear();
      pointing = null;
      if (saved?.pointing && present('mori')) {
        pointing = hands.start(P.people.mori, 'Left');
        pointing.target.copy(P.space.localToWorld(new THREE.Vector3(...saved.pointing)));
      }
      shot.load(saved?.shot);
      props.turnDesk(saved?.deskTurn || 0);
    },
    cancel() {
      phase = null;
      carrying = null;
      actions.cancel();
      hands.clear();
      pointing = null;
    },
  };
}
