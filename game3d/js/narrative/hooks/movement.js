import * as THREE from 'three';
import { walkRig, faceRig, standOut } from '../../move.js';
import { beginSavedWalk } from '../../places/saved-people.js';
import { save } from '../../sim.js';
import { flags } from '../state.js';
import { flagKeys } from '../engine-flags.js';
const ENGINE_KEYS = flagKeys('game3d/js/narrative/hooks/movement.js');

export function installMovementHooks(game, { rigOf, posOf, aimOf, isPlayer }) {
  const H = game.hooks;
  const ui = game.ui;
  H.walk = async ({ who, to, wait = true, speed, run }) => {
    const p = posOf(to);
    if (!p) return;
    const r = isPlayer(who) ? game.player : rigOf(who);
    if (!r) return;
    if (isPlayer(who) && r.seatOut) game.standUp?.();
    const place = game.place;
    const pr = beginSavedWalk(
      r,
      { to: [...p], ...(speed ? { speed } : {}), ...(run ? { run } : {}) },
      () => {
        if (isPlayer(who)) return game.walkTo(p[0], p[1]);
        if (r.meshy) {
          r.root.visible = true;
          if (r.seated) {
            r.root.position.y = 0;
            r.root.position.z += r.root.position.z < 0 ? 0.45 : -0.45;
          }
          r.seated = false;
          return walkRig(game, r, p, { speed: speed || 1.0, run });
        }
        return place.walkPerson(who, p, { speed, run });
      },
      () => {
        if (game.place === place) save(game);
      },
    );
    if (wait) await pr;
    else
      void pr.catch((error) => {
        game.runner.failRecovery('A character could not finish walking.');
        console.error(error);
      });
  };
  game.resumeWalks = () => {
    for (const [who, person] of Object.entries({ ...game.place.people, eric: game.player })) {
      if (person.savedWalk) void H.walk({ who, ...person.savedWalk, wait: false });
    }
  };
  game.captureStaging = () => {
    const close = game.place.cam?.close;
    return {
      place: game.place.name,
      flags: { ...flags },
      world: game.place.snapshotState?.(),
      ui: { goal: ui.goalText || '', sideGoal: ui.sideText || '', hold: game.hold || null },
      camera: close ? { ...close, ...(close.target ? { target: close.target.toArray() } : {}) } : null,
    };
  };
  game.restoreStaging = (staging) => {
    if (staging.place !== game.place.name) throw new Error('Scene staging belongs to another place');
    game.walker.stop();
    game.place.restoreState?.({ flags: staging.flags, world: staging.world, runner: { execution: true } });
    if (staging.ui) {
      ui.goal(staging.ui.goal);
      ui.sideGoal(staging.ui.sideGoal);
      game.hold = staging.ui.hold;
    }
    const cam = game.place.cam;
    if (cam) {
      cam.close = staging.camera
        ? {
            ...staging.camera,
            ...(staging.camera.target ? { target: new THREE.Vector3().fromArray(staging.camera.target) } : {}),
          }
        : null;
      cam.snap?.(game.player.root.position);
    }
    game.resumeWalks();
  };
  H.face = ({ who, to }) => {
    const p = posOf(to);
    if (!p) return;
    if (isPlayer(who)) {
      game.walker.faceTo(p[0], p[1]);
      return;
    }
    const r = rigOf(who);
    if (!r) return;
    faceRig(game, r, p);
  };
  H.look = ({ who, at }) => {
    const r = rigOf(who);
    const p = aimOf(at);
    if (r && p) r.lookTarget = p;
  };
  // Eric on a bench outside the train and office (those two seat him themselves, with their props): he walks to the
  // spot in front of the seat, sits over the seat point, and later steps back out to free floor (seatOut), so his
  // next walk never starts inside the bench
  const seatsPlayer = () => !['train', 'office'].includes(game.place.name);
  H.sit = async ({ who, at }) => {
    if (isPlayer(who) && seatsPlayer()) {
      const s = game.place.seats[at];
      if (!s || !game.player.sitAt) return;
      const out = s.out || [s.x, s.z + (s.ry ? -0.5 : 0.5)]; // a seat may name the floor you get on from
      await H.walk({ who, to: out });
      game.player.sitAt(s.x, s.top, s.z, s.ry || 0);
      game.player.seated = true;
      game.player.seatOut = out;
      if (game.walker) game.walker.facing = s.ry || 0;
      return;
    }
    const r = rigOf(who);
    if (r && r.meshy) {
      const s = game.place.seats[at];
      if (!s) return;
      r.root.visible = true;
      await H.walk({ who, to: s.out || [s.x, s.z + (s.ry ? -0.5 : 0.5)] });
      r.sitAt(s.x, s.top, s.z, s.ry || 0);
      r.seated = true;
      return;
    }
    await game.place.sitPerson?.(isPlayer(who) ? 'eric' : who, at);
  };
  H.stand = async ({ who }) => {
    const pl = game.player;
    if (isPlayer(who) && pl.seatOut) {
      const dz = pl.seatOut[1] - pl.root.position.z;
      pl.seatOut = null;
      await standOut(game, pl, dz);
      return;
    }
    const r = rigOf(who);
    // Meshy rigs (Mio, and Eric when it's him) stand by leaving the sit pose and stepping off the bench
    if (r && r.meshy && !isPlayer(who)) {
      if (r.seated) await standOut(game, r, r.root.position.z < 0 ? 0.45 : -0.45);
      return;
    }
    await game.place.standPerson?.(who);
  };
  H.cam = ({ on, zoom = 1.8, back }) => {
    if (back) game.place.cam.release?.();
    else {
      const p = posOf(on);
      if (p) game.place.cam.closeOn?.(p, zoom);
    }
  };
  H.show = ({ id }) => {
    const r = game.place.people[id];
    const o = r?.root || game.place.things[id]?.obj;
    if (o) o.visible = true;
    if (r?.blob) r.blob.visible = true;
    flags[ENGINE_KEYS.shown + id] = true;
  };
  H.hide = ({ id }) => {
    const r = game.place.people[id];
    const o = r?.root || game.place.things[id]?.obj;
    if (o) o.visible = false;
    if (r?.blob) r.blob.visible = false;
    flags[ENGINE_KEYS.shown + id] = false;
  };
}
