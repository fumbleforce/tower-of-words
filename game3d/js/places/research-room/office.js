import * as THREE from 'three';
import { paperGrips } from './paper-grip.js';
import { flags } from '../../narrative/state.js';
import { known } from '../../lang.js';
import { conversationMemory } from '../../conversations/state.js';
import { referenceEligibility } from '../../reading-room/evidence.js';
import { diningActions } from '../izakaya/actions.js';
import { deskActivity } from '../office-desk-activity.js';
import { diningHands } from '../izakaya/hands.js';
import { paperMesh } from '../../scenes/research-room/books.js';
import { found, take } from '../../finds/index.js';
import { showFind } from '../../ui/finds-view.js';

const SHEET = [1.85, 0.423, -3.16],
  VISITOR = [2.28, -2.71],
  OFFER = [2.1, 0.52, -3.075];
export function attachResearchOffice(game, P) {
  const actions = diningActions(),
    hands = diningHands(game, P.space),
    grips = paperGrips(P.space, hands),
    contacts = [],
    listen = deskActivity(game, 'mori');
  const original = paperMesh('copier-paper', 0.23),
    copy = new THREE.Group();
  copy.name = 'research-mori-copy';
  copy.add(paperMesh('mori-copy', 0.23));
  P.space.add(original, copy);
  original.position.set(...SHEET);
  original.position.y -= 0.001;
  let arm = null,
    owned = null,
    phase = null,
    shot = null,
    restoredOwner = null;
  const ready = () => referenceEligibility(P, flags, conversationMemory, known, game.sim.day);
  const localHand = (s) => P.space.worldToLocal(s.hand.getWorldPosition(new THREE.Vector3()));
  function resetPaper() {
    P.space.attach(copy);
    copy.position.set(...SHEET);
    copy.rotation.set(0, 0, 0);
    copy.visible = game.sim.day >= 2 && !found('research_mori_copy');
    original.visible = game.sim.day >= 2;
  }
  function focus(point, distance, height, yaw, elev, halfWidth, owner = globalThis.crypto.randomUUID()) {
    shot = { point, distance, height, yaw, elev, halfWidth, owner };
    P.cam.closeOn(point, P.cam.fitDist / distance, height);
    owned = P.cam.close;
    owned.conversationShot = {
      who: 'mori',
      researchOfficeOwner: owner,
      yaw,
      elev,
      fov: 55,
      minDistance: distance,
      halfWidth,
    };
    P.cam.snap(game.player.root.position);
  }
  const pair = () => {
    // Discuss the sheet in front of Mori; turn back to him for the physical exchange.
    game.hooks.face({ who: 'eric', to: [SHEET[0], SHEET[2]] });
    focus([2.28, -2.97], 2.4, 0.62, -1.05, 0.35, 0.7);
  };
  const insert = () => focus([1.78, -3.15], 1.1, 0.43, -0.75, 0.8, 0.38);
  function rest() {
    if (arm) {
      arm.prop = null;
      grips.stop(arm);
      arm = null;
    }
    phase = null;
  }
  function release() {
    rest();
    grips.clear();
    hands.clear();
    if (
      (owned && P.cam.close === owned) ||
      (restoredOwner && P.cam.close?.conversationShot?.researchOfficeOwner === restoredOwner)
    ) {
      P.cam.release();
      // The ordinary lens is restored immediately; use its traversal distance too.
      // Otherwise the narrow lens briefly magnifies the player at the insert distance.
      P.cam.snap(game.player.root.position);
    }
    owned = null;
    shot = null;
    restoredOwner = null;
    resetPaper();
  }
  async function reach(job, rig, target, id) {
    const s = hands.start(rig, 'Left');
    try {
      await job.wait(hands.move(s, target));
      await job.wait(game.wait(150));
      const gap = hands.distance(s);
      contacts.push({ id, gap, hand: localHand(s).toArray(), target });
      if (gap > 0.065) throw Error('Paper contact is outside reach: ' + id + ' ' + gap);
      return s;
    } catch (error) {
      hands.stop(s);
      throw error;
    }
  }
  async function desk(job) {
    if (!ready().available) return false;
    if (game.player.seated) await job.wait(game.hooks.stand({ who: 'eric' }));
    await job.wait(game.hooks.walk({ who: 'eric', to: VISITOR }));
    if (Math.hypot(game.player.root.position.x - VISITOR[0], game.player.root.position.z - VISITOR[1]) > 0.25)
      return false;
    game.hooks.face({ who: 'eric', to: 'mori' });
    pair();
    return true;
  }
  async function gripAt(job, s, edge, id) {
    const target = new THREE.Vector3(...edge);
    for (let attempt = 0; attempt < 8; attempt++) {
      const wrist = attempt
        ? localHand(s)
            .add(target.clone().sub(grips.contact(s)).multiplyScalar(0.5))
            .toArray()
        : grips.wrist(s, edge);
      await job.wait(hands.move(s, wrist, attempt ? 0.16 : 0.55));
      await job.wait(game.wait(80));
      if (grips.contact(s).distanceTo(target) < 0.008) break;
    }
    const at = grips.contact(s),
      gap = at.distanceTo(target);
    contacts.push({ id, gap, surface: at.toArray(), target: edge });
    if (gap > 0.025) throw Error('Rendered paper grip outside reach: ' + id + ' ' + gap);
  }
  async function handoff(job) {
    if (found('research_mori_copy')) return true;
    rest();
    game.hooks.face({ who: 'eric', to: 'mori' });
    insert();
    const moriEdge = [0.115, 0, 0],
      receiverEdge = [0.01, 0, 0.12];
    arm = grips.start(hands.start(P.people.mori, 'Left'), [-1, 0, 0]);
    await gripAt(job, arm, [SHEET[0] + moriEdge[0], SHEET[1], SHEET[2]], 'mori-copy-pickup');
    grips.hold(arm, copy, moriEdge);
    phase = 'copy-pickup';
    await job.wait(game.wait(350));
    await gripAt(job, arm, [OFFER[0] + moriEdge[0], OFFER[1], OFFER[2]], 'mori-copy-offer');
    focus([copy.position.x, copy.position.z], 0.9, copy.position.y + 0.045, -1.55, 1.0, 0.3);
    phase = 'copy-presented';
    const received = grips.start(hands.start(game.player, 'Left'), [0, 0, -1]);
    try {
      const edge = copy.position
        .clone()
        .add(new THREE.Vector3(...receiverEdge))
        .toArray();
      await gripAt(job, received, edge, 'player-copy-receive');
      const a = grips.bounds(arm),
        b = grips.bounds(received);
      const separation = Math.max(b.min.x - a.max.x, a.min.x - b.max.x, b.min.z - a.max.z, a.min.z - b.max.z);
      contacts.push({ id: 'distinct-rendered-hands', separation, mori: a, player: b });
      if (separation < 0.025) throw Error('Paper hands overlap: ' + separation);
      phase = 'copy-offer';
      await job.wait(game.wait(700));
      grips.hold(received, copy, receiverEdge);
      phase = 'copy-withdrawal';
      await job.wait(hands.move(arm, [2.24, 0.47, -3.28]));
      await job.wait(game.wait(250));
      rest();
      phase = 'copy-received';
      await gripAt(job, received, [VISITOR[0] - 0.15, 0.5, VISITOR[1]], 'player-copy-stow');
      await job.wait(game.wait(200));
      copy.visible = false;
      await take(game, 'research_mori_copy', { show: false });
    } finally {
      grips.stop(received);
      phase = null;
    }
    pair();
    phase = 'copy-complete';
    await job.wait(game.wait(650));
    phase = null;
    return true;
  }
  const provider = {
    contacts,
    hands,
    copy,
    original,
    ready,
    get phase() {
      return phase;
    },
    async act({ state }) {
      if (state === 'release') {
        release();
        return true;
      }
      if (!ready().available) return false;
      return actions.run(async (job) => {
        try {
          if (state === 'desk') return await desk(job);
          if (state === 'show' || state === 'showCopy') {
            rest();
            resetPaper();
            insert();
            arm = await reach(job, P.people.mori, [SHEET[0] + 0.1, SHEET[1] + 0.035, SHEET[2]], 'show-old-reference');
            phase = 'paper-show';
            await job.wait(game.wait(600));
            if (state === 'showCopy') await job.wait(showFind('research_mori_copy'));
            rest();
            pair();
            return true;
          }
          if (state === 'point') {
            rest();
            insert();
            arm = await reach(
              job,
              P.people.mori,
              [SHEET[0] + 0.1, SHEET[1] + 0.032, SHEET[2] + 0.04],
              'point-old-request',
            );
            phase = 'paper-point';
            return true;
          }
          if (state === 'handoff') return await handoff(job);
          throw Error('Unknown office reference action ' + state);
        } catch (error) {
          if (job.live()) release();
          throw error;
        }
      });
    },
  };
  const update = P.update,
    leave = P.leave,
    restore = P.restoreState,
    snapshot = P.snapshotState,
    onDay = P.onDay;
  P.update = function (...args) {
    update?.apply(this, args);
    if (P.cam.close?.conversationShot?.researchOfficeOwner) listen(P.people.mori, args[0], args[1], false);
    hands.update();
    grips.update();
  };
  P.leave = function (...args) {
    actions.cancel();
    release();
    const panel = document.querySelector('#findView');
    if (panel) panel.hidden = true;
    return leave?.apply(this, args);
  };
  P.snapshotState = function (...args) {
    return {
      ...snapshot?.apply(this, args),
      researchOffice: {
        shot:
          P.cam.close === owned ||
          (restoredOwner && P.cam.close?.conversationShot?.researchOfficeOwner === restoredOwner)
            ? shot
            : null,
        point: phase === 'paper-point' && arm ? P.space.worldToLocal(arm.target.clone()).toArray() : null,
      },
    };
  };
  P.restoreState = function (saved, ...args) {
    actions.cancel();
    release();
    const result = restore?.call(this, saved, ...args);
    resetPaper();
    const state = saved.world?.researchOffice;
    if (ready().available && state?.point?.length === 3) {
      arm = hands.start(P.people.mori, 'Left');
      arm.target.copy(P.space.localToWorld(new THREE.Vector3(...state.point)));
      phase = 'paper-point';
    }
    if (ready().available && state?.shot) {
      const s = state.shot;
      focus(s.point, s.distance, s.height, s.yaw, s.elev, s.halfWidth, s.owner);
      restoredOwner = s.owner;
    }
    return result;
  };
  P.onDay = function (...args) {
    onDay?.apply(this, args);
    resetPaper();
  };
  P.researchOffice = provider;
  resetPaper();
  return provider;
}
