// The east coast's lookout on day 2 (story/day2/east_coast.js): after work Mr. Hamada is at the coin telescope, wiping
// its lens; he steps aside so Eric can look, and the view frames the shoreline below, where narrow maintenance steps
// go down the sea wall between the armour rocks, the lowest washed by the water. The steps are part of the coast
// (they stay there on every day) and can't be walked. east-coast.js spreads thing(id), people, spots and the
// coastVisit hook into its own registries and calls install(P) once its place is made.
import * as THREE from 'three';
import { PEOPLE, idle } from '../cast.js';
import { blob } from '../engine.js';
import { walkPerson, stepPeople, lookAt } from '../story.js';
import { flags } from '../narrative/state.js';
import { sim } from '../sim.js';
import { rbox, mat, sh } from '../props.js';
import { glide } from '../move.js';
import { route } from './route.js';

// the lookout nook (scenes/east-coast/plan.js NOOKS: at [5.2, -46.5], facing +x, the rail at x 6.65, the telescope
// at [6.25, -47.05] with its eyepiece toward the path)
const EYE = [5.82, -47.05], // standing at the eyepiece
  ASIDE = [5.55, -45.95], // clear of it, by the rail
  BACK = [5.3, -46.4], // safe standing space on the pad
  VIEW = [7.75, -48.3], // the shoreline below, where the camera looks
  STEPS = [7.05, -48.42]; // the steps' head on the coping, in the gap between the rocks south of the telescope

export function coastVisit(game, { w, K }) {
  let P = null;
  const later = () => sim.day > 1;
  const kuroda = PEOPLE.kuroda();
  if (!kuroda.meshy || kuroda.chibi) kuroda.root.scale.multiplyScalar(K); // chibis stand at the body they replace
  kuroda.root.visible = false;
  w.root.add(kuroda.root);
  kuroda.blob = blob(0.55, 0.38);
  kuroda.blob.visible = false;
  w.root.add(kuroda.blob);

  // the maintenance steps: a narrow flight off the sea wall's low coping (y 0.2) down into the water (y -0.2) between
  // the armour rocks, square to the wall, which runs north-north-east here; the lowest two wet and under the surface
  const steps = new THREE.Group(),
    d = [0.95, -0.31]; // seaward, square to the wall
  steps.position.set(STEPS[0], 0, STEPS[1]);
  steps.rotation.y = Math.atan2(-d[1], d[0]); // local x along d
  for (let i = 0; i < 5; i++) {
    const t = rbox(0.24, 0.08, 0.6, i > 2 ? '#56605f' : '#9a9d97', { r: 0.012, cast: false });
    t.position.set(0.12 + i * 0.22, 0.1 - i * 0.1, 0);
    steps.add(t);
  }
  const post = sh(new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.5, 0.035), mat('#c9a54a')), false, false);
  post.position.set(0.02, 0.45, 0.34);
  steps.add(post);
  w.root.add(steps);
  // the telescope's coin slot, taped over: "Free to use" (story/day2/east_coast.js)
  const tape = rbox(0.012, 0.035, 0.1, '#ece6d6', { r: 0.002, cast: false });
  tape.position.set(6.158, 0.985, -47.05);
  w.root.add(tape);

  const things = {
    kuroda: {
      anchor: (v) => {
        kuroda.root.getWorldPosition(v);
        v.y += 1.25 * K;
        return v;
      },
      spot: () => {
        const p = kuroda.root.position;
        return [p.x - 0.1, p.z + 0.8]; // beside him on the pad, not between him and the camera
      },
      face: () => [kuroda.root.position.x, kuroda.root.position.z],
      enabled: () => kuroda.root.visible && !kuroda._walk,
    },
  };
  const place = (r, [x, z], face) => {
    r._walk = null;
    r.root.visible = true;
    r.root.position.set(x, 0, z);
    r.root.rotation.y = Math.atan2(face[0] - x, face[1] - z);
    r.blob.visible = true;
    r.blob.position.set(x, 0.004, z);
  };
  const wipe = (k) => {
    const [l, r] = kuroda.arms;
    r.rotation.x = -1.35 + Math.sin(k * Math.PI * 8) * 0.18;
    r.rotation.z = -0.2 + Math.sin(k * Math.PI * 8) * 0.12;
    l.rotation.x = -0.4;
  };
  let looking = false;
  const hooks = {
    // arrive: after work he is at the telescope (or by the rail, once he has let Eric look); in the morning only the
    // telescope. clean: he wipes the eyepiece. offer: he steps aside. view: Eric at the eyepiece, the shoreline framed
    // from above. away: Eric back on the pad.
    async coastVisit({ state = 'arrive' } = {}) {
      if (state === 'arrive') {
        if (!later() || !flags.d2_shift_done) {
          kuroda.root.visible = kuroda.blob.visible = false;
          return;
        }
        if (flags.d2_hamada_seen) place(kuroda, ASIDE, [8, -46]);
        else place(kuroda, EYE, [6.25, -47.05]);
        return;
      }
      if (state === 'clean') {
        await game.tween(1.6, wipe);
        for (const a of kuroda.arms) a.rotation.set(0, 0, 0);
        return;
      }
      if (state === 'offer') {
        await walkPerson(kuroda, route(w.nav, kuroda.root.position, ASIDE), { speed: 1.0, blobM: kuroda.blob });
        kuroda.root.rotation.y = Math.atan2(8 - ASIDE[0], -46 - ASIDE[1]);
        return;
      }
      const eric = game.player;
      if (state === 'view') {
        await game.walkTo(...EYE);
        eric.scripted = true;
        await glide(game, eric.root, EYE, 0.6);
        eric.root.rotation.y = Math.PI / 2;
        game.walker.facing = Math.PI / 2;
        eric.setState('idle');
        eric.scripted = false;
        P.cam.closeOn(VIEW, 2.6, 0);
        looking = true;
        await game.wait(1500);
        return;
      }
      if (state === 'away') {
        looking = false;
        await game.walkTo(...BACK);
      }
    },
  };
  function install(placeObj) {
    P = placeObj;
    const cam = P.cam;
    const update = P.update;
    P.update = (dt, t) => {
      const elev = cam.elev;
      update(dt, t);
      // looking down at the shoreline: the camera steeper over the rail than the coast's turning look
      if (looking) cam.elev = elev + ((62 * Math.PI) / 180 - elev) * Math.min(1, dt * 2.5);
      if (!kuroda.root.visible) return;
      stepPeople([kuroda], dt);
      if (kuroda._walk) return;
      idle(kuroda, t);
      const p = game.player.root.position;
      if (Math.hypot(p.x - kuroda.root.position.x, p.z - kuroda.root.position.z) < 2.5) lookAt(kuroda, p.x, p.z, 0.8);
    };
    const release = cam.release.bind(cam);
    cam.release = () => {
      looking = false;
      return release();
    };
    const onDay = P.onDay;
    P.onDay = (d) => {
      onDay?.(d);
      hooks.coastVisit({ state: 'arrive' });
    };
  }
  return { thing: (id) => things[id], people: { kuroda }, spots: { lookout_view: VIEW }, hooks, install };
}
