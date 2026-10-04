import * as THREE from 'three';
import {
  MESHY_KINDS,
  CHIBI_KINDS,
  CUE_KINDS,
  meshyGesture,
  MESHY_SHORT,
  meshyShort,
  chibiGesture,
  chibiCue,
  stepRigLayers,
} from './rig-gestures.js';

export function installGesturesHooks(game, { whoRig, aimOf }) {
  const H = game.hooks;
  // ---------- small staged moves (bow, gestures, props), so beats are shown instead of narrated ----------
  const tweens = [];
  game.tween = (dur, fn) => new Promise((res) => tweens.push({ t: 0, dur, fn, res }));
  function stepTweens(dt) {
    for (let i = tweens.length - 1; i >= 0; i--) {
      const w = tweens[i];
      w.t += dt;
      const k = Math.min(1, w.t / w.dur);
      w.fn(k);
      if (k >= 1) {
        tweens.splice(i, 1);
        w.res();
      }
    }
  }
  game.stepTweens = stepTweens;
  game.stepRigLayers = (dt) => stepRigLayers(game.place?.people, dt);
  const bell = (k) => Math.sin(Math.PI * Math.min(1, k)) ** 0.7; // 0 -> 1 -> 0, holding at the top
  H.bow = async ({ who, depth = 'small' }) => {
    const r = whoRig(who);
    if (!r) return;
    const d = depth === 'deep' ? 1 : 0.5,
      dur = depth === 'deep' ? 1.6 : 1.1;
    if (r.pose) {
      await game.tween(dur, (k) => {
        r.pose.bow = bell(k) * d;
      });
      r.pose.bow = 0;
      return;
    }
    if (r.torso) {
      const x0 = r.torso.rotation.x;
      await game.tween(dur, (k) => {
        r.torso.rotation.x = x0 + bell(k) * d * 0.9;
        r.head.rotation.x = bell(k) * d * 0.3;
      });
      r.torso.rotation.x = x0;
    }
  };
  H.gesture = async ({ who, kind, to, low }) => {
    const r = whoRig(who);
    // Meshy rigs: nod, bow, shrug, wave as short drawn moves of about a second (their library clips run 2 to 13 s)
    if (r && r.meshy && MESHY_SHORT.has(kind)) return meshyShort(game, r, kind);
    if (r && r.meshy && kind === 'nine') {
      game.place.clock?.userData.highlight(true);
      H.emote({ who, kind: 'nine', ms: 3600 });
      await game.wait(2600);
      game.place.clock?.userData.highlight(false);
      return;
    }
    if (r && r.meshy && MESHY_KINDS.has(kind))
      return meshyGesture(game, r, kind, { to, low, face: to ? () => H.face({ who, to }) : null });
    if (!r || !r.arms || r.meshy) return;
    // a directed nod or point (the train passengers' "that seat"): drawn over the rig's idle, see rig-gestures.js
    if (CUE_KINDS.has(kind)) return chibiCue(game, r, kind, to ? aimOf(to) : null);
    const save = r.arms.map((a) => a.rotation.clone()),
      hy = r.hips.position.y,
      legs = r.legs.map((l) => l.rotation.x),
      knees = r.knees.map((q) => q.rotation.x);
    if (kind === 'nine') {
      // "at nine": he points up at the wall clock (which lights up, the nine picked out) and a 9:00 clock shows over him
      const clk = game.place.clock;
      clk?.userData.highlight(true);
      // frame him and the clock together for the moment, then back to whatever the story had
      const cam = game.place.cam,
        prev = cam?.close;
      if (clk && cam?.closeOn) {
        const c = clk.getWorldPosition(new THREE.Vector3());
        game.place.space.worldToLocal(c);
        const g0 = r.root.position;
        cam.closeOn([(c.x + g0.x) / 2, (c.z + g0.z) / 2 + 0.6], 1.25);
      }
      H.emote({ who, kind: 'nine', ms: 3600 });
      const h0 = r.head.rotation.clone();
      // arm straight up and out, toward the clock behind him; head turned up at it
      await game.tween(2.8, (k) => {
        const b = bell(k);
        r.arms[1].rotation.set(save[1].x + (-0.3 - save[1].x) * b, 0, save[1].z + (2.7 - save[1].z) * b);
        r.head.rotation.x = h0.x - 0.3 * b;
      });
      r.head.rotation.copy(h0);
      clk?.userData.highlight(false);
      if (cam) {
        if (prev) cam.close = prev;
        else cam.release?.();
      }
    } else if (CHIBI_KINDS.has(kind)) await chibiGesture(game, r, kind, save);
    else if (kind === 'skijump') {
      // crouch with arms back, slide, then spring up with arms forward, and land
      await game.tween(2.6, (k) => {
        const crouch = k < 0.55 ? Math.sin(((k / 0.55) * Math.PI) / 2) : Math.max(0, 1 - (k - 0.55) / 0.12);
        const air = k > 0.58 && k < 0.85 ? Math.sin(((k - 0.58) / 0.27) * Math.PI) : 0;
        for (const l of r.legs) l.rotation.x = -0.6 * crouch;
        for (const q of r.knees) q.rotation.x = 1.1 * crouch;
        r.hips.position.y = hy - 0.07 * crouch + 0.12 * air;
        r.torso.rotation.x = 0.5 * crouch + 0.3 * air;
        for (const a of r.arms) a.rotation.x = crouch > 0.1 && air === 0 && k < 0.6 ? 0.7 * crouch : -1.3 * air;
      });
      r.hips.position.y = hy;
      r.torso.rotation.x = 0;
      r.legs.forEach((l, i) => {
        l.rotation.x = legs[i];
      });
      r.knees.forEach((q, i) => {
        q.rotation.x = knees[i];
      });
    } else if (kind === 'shrug') {
      await game.tween(1.0, (k) => {
        const b = bell(k);
        r.arms[0].rotation.z = save[0].z + 0.5 * b;
        r.arms[1].rotation.z = save[1].z - 0.5 * b;
        r.torso.position.y = 0.02 + 0.02 * b;
      });
    } else if (kind === 'finger') {
      await game.tween(1.4, (k) => {
        r.arms[1].rotation.set(save[1].x + (-2.0 - save[1].x) * bell(k), 0, save[1].z + 0.3 * bell(k));
      });
    }
    r.arms.forEach((a, i) => a.rotation.copy(save[i]));
  };
  // headphones: a place's own (the girl with headphones on the train, train/discoveries.js); Mio's were removed
  // (Jørgen: no props on his models), so for her, or in a place without any, it does nothing
  H.headphones = (s) => (s.who === 'mio' ? undefined : game.place?.hooks?.headphones?.(s));
}
