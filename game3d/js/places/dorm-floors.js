// The floors of Eric's building past his own corridor (docs/game/places.md, Eric's dorm building): 3F and the roof,
// built beside 2F in the dorms scene (scenes/dorms/levels.js), and the stairs between them. Going up or down is a
// watched move like a trip between places: he walks onto the flight with the camera close, the frame crossfades to
// the next floor, he comes up or down onto its landing (or out of the stair house onto the roof) and the camera
// lets go. Down from 2F is the trip to the dorm courtyard (places/dorms.js). The lights move with him rather than
// each floor having its own (scenes/dorms.js), and so does the sun's shadow.
import * as THREE from 'three';
import { glide } from '../move.js';
import { sfx } from '../ui.js';
import { sim } from '../sim.js';
import { DORM_LOOKS } from '../../story/dorm-building.js';
import { LEVEL_DX, STAIR, CORR, H, NEAR } from '../scenes/dorms/layout.js';
import { stairY, stairUpY, UP_TOP } from '../scenes/dorms/stairs.js';

const SUN_DIR = new THREE.Vector3(-0.3, 1, 0.55).normalize().multiplyScalar(20);

// st: the dorms place's state (inside, entering, level); fitNow: refits the camera for the floor he is on
export function dormFloors(game, { w, cam, st, fitNow }) {
  const L = w.levels,
    S = { '2f': w.stairsAt(LEVEL_DX['2f']), '3f': w.stairsAt(LEVEL_DX['3f']) },
    R = L.roof;
  const free = () => !st.inside && !st.entering;
  const on = (level) => () => free() && st.level === level;
  // the lights as built, 2F's, to put back
  const lights = w.lights,
    home = {};
  for (const [k, l] of Object.entries(lights))
    if (l.isPointLight) home[k] = { at: l.position.clone(), color: l.color.clone(), k: l.intensity };
  // where each floor puts them: [x, y, z, colour, intensity] (null: off, out of the way)
  const d3 = LEVEL_DX['3f'],
    dr = LEVEL_DX.roof,
    corrZ = (CORR[0] + CORR[1]) / 2;
  const PUT = {
    '3f': {
      stair: [...L.lights['3f'].toArray(), '#dfe7f5', 1.1],
      corridor: [d3 - 4.6, 1.3, corrZ, '#dfe7f5', 1.2], // by 306's and the laundry's doors
      shared: [L.laundry.at[0] + 1.0, H + 0.1, -1.1, '#eef3ff', 1.7], // the laundry's fluorescent
      ceiling: [d3, H + 0.1, -1.35, '#ffdcb0', 1.5], // 303's room light
      desklamp: [d3 + 0.72, 0.75, -2.3, '#ffc98a', 1.2], // 303's desk lamp
      hood: null,
      out: null,
    },
    roof: {
      stair: [...L.lights.roof.toArray(), '#dfe7f5', 1.4], // the bulkhead over the stair house door
      corridor: [dr - 4.8, 1.8, -0.4, '#c9d3e6', 0.8], // the sky over the washing
      ceiling: [dr - 8.6, 1.4, 0.6, '#d6dceb', 0.8], // the west end
      shared: [dr + 4.3, 1.6, -0.9, '#c9d3e6', 0.7], // over the water tank
      desklamp: null,
      hood: null,
      out: null,
    },
  };
  function setLevel(level) {
    st.level = level;
    for (const [k, l] of Object.entries(lights)) {
      if (!l.isPointLight) continue;
      const put = level === '2f' ? undefined : PUT[level][k];
      if (put === undefined) {
        l.position.copy(home[k].at);
        l.color.copy(home[k].color);
        l.intensity = home[k].k;
      } else if (put === null) l.intensity = 0;
      else {
        l.position.set(put[0], put[1], put[2]);
        l.color.set(put[3]);
        l.intensity = put[4];
      }
    }
    sunAt(LEVEL_DX[level]);
  }
  // the sun's shadow box kept round him, in steps so it doesn't swim: 8 units across on the flat (as built), 12 out
  // on a corridor or the roof, where the camera follows him past the old box's ends
  let sunX = 0;
  function sunAt(x, wide = !st.inside) {
    sunX = x;
    w.sun.target.position.set(x, 0, 0);
    w.sun.position.copy(SUN_DIR).add(w.sun.target.position);
    w.sun.target.updateMatrixWorld();
    const c = w.sun.shadow.camera,
      half = wide ? 6 : 4;
    if (c.right !== half) {
      c.left = -half;
      c.right = half;
      c.updateProjectionMatrix();
    }
  }
  function follow(p) {
    if (st.inside) return (sunX || w.sun.shadow.camera.right !== 4) && sunAt(0, false);
    const x = Math.round(p.x / 2) * 2;
    if (x !== sunX || w.sun.shadow.camera.right !== 6) sunAt(x, true);
  }

  // the moves: onto the flight with the camera close, the crossfade, off the flight on the next floor
  async function moveTo(level, leave, arrive) {
    const g = game,
      eric = g.player;
    g.walker.stop?.();
    g.walker.locked = true;
    eric.scripted = true;
    await leave(g, eric);
    const shot = g.snapshot?.();
    setLevel(level);
    fitNow();
    await arrive(g, eric, () => g.crossfade?.(shot));
    eric.setState('idle');
    eric.scripted = false;
    g.walker.sync();
    g.walker.locked = false;
    cam.release();
  }
  // up lane B a few treads, out of view of the floor below
  const upB = async (g, eric) => {
    const s = S[st.level];
    cam.closeOn(s.up, 1.7);
    await glide(g, eric.root, [s.up[0], UP_TOP - 0.12], 0.8);
  };
  // down lane A toward the half landing
  const downA = async (g, eric) => {
    const s = S[st.level];
    cam.closeOn(s.down, 1.7);
    await glide(g, eric.root, [s.down[0], STAIR.top + 0.75], 0.8);
  };
  // onto a corridor floor's landing up lane A from its half landing (coming up)
  const upOnto = (level) => async (g, eric, fade) => {
    const s = S[level];
    eric.root.position.set(s.down[0], stairY(STAIR.half[0] + 0.3), STAIR.half[0] + 0.3);
    eric.root.rotation.y = Math.PI;
    cam.closeOn(s.down, 1.7);
    cam.snap(eric.root.position);
    fade();
    await glide(g, eric.root, [s.down[0], STAIR.top - 0.35], 1.0);
    await glide(g, eric.root, s.landing, 1.1);
  };
  // onto a corridor floor's landing down lane B from above (coming down)
  const downOnto = (level) => async (g, eric, fade) => {
    const s = S[level];
    eric.root.position.set(s.up[0], stairUpY(UP_TOP - 0.12), UP_TOP - 0.12);
    eric.root.rotation.y = Math.PI;
    cam.closeOn(s.up, 1.7);
    cam.snap(eric.root.position);
    fade();
    await glide(g, eric.root, s.up, 1.0);
    await glide(g, eric.root, s.landing, 1.1);
  };
  // the stair house door on the roof: swung out or shut
  const door = (g, open) => {
    sfx('door');
    const from = R.door.rotation.y,
      to = open ? -1.5 : 0;
    return g.tween(0.45, (k) => (R.door.rotation.y = from + (to - from) * k * (2 - k)));
  };
  const outOnRoof = async (g, eric, fade) => {
    eric.root.position.set(R.in[0], 0, R.in[1]);
    eric.root.rotation.y = -Math.PI / 2;
    R.door.rotation.y = -1.5;
    cam.closeOn(R.out, 1.6);
    cam.snap(eric.root.position);
    fade();
    await glide(g, eric.root, R.out, 0.9);
    await glide(g, eric.root, [R.out[0] - 0.5, R.out[1]], 0.9);
    door(g, false);
  };
  const inFromRoof = async (g, eric) => {
    cam.closeOn(R.out, 1.6);
    await door(g, true);
    await glide(g, eric.root, R.in, 0.9);
    R.door.rotation.y = 0;
  };
  const goUp = () => (st.level === '2f' ? moveTo('3f', upB, upOnto('3f')) : moveTo('roof', upB, outOnRoof));
  const goDown = () => {
    if (st.level === 'roof') return moveTo('3f', inFromRoof, downOnto('3f'));
    if (st.level === '3f') return moveTo('2f', downA, downOnto('2f'));
    game.hooks.trip({ to: 'dorm_court' }); // 2F: the trip down to the courtyard (places/dorms.js tripOutTo)
  };

  // the way up and down on each floor; the small things to look at (their lines: story/dorm-building.js). The place
  // registers each by name with its catalog entry (places/dorms.js)
  const things = {
    stairs_up: {
      anchor: (v) => v.set(S[st.level === 'roof' ? '3f' : st.level].up[0], 1.0, STAIR.top + 0.3),
      spot: () => S[st.level].up,
      face: () => [S[st.level].up[0], STAIR.top + 1],
      enabled: () => free() && st.level !== 'roof',
      act: goUp,
    },
    // the way down: the flight down on a corridor floor (on 2F once the day lets him out), the stair house's door
    stairs_down: {
      anchor: (v) =>
        st.level === 'roof' ? v.set(R.out[0] + 0.3, 1.3, R.out[1]) : v.set(S[st.level].down[0], 1.0, STAIR.top + 0.25),
      spot: () => (st.level === 'roof' ? R.out : S[st.level].down),
      face: () => (st.level === 'roof' ? [R.in[0], R.in[1]] : [S[st.level].down[0], STAIR.top + 1]),
      enabled: () => free() && (st.level !== '2f' || sim.day > 1),
      act: goDown,
    },
    kitchen: look('kitchen', L.kitchen, 0.7, on('2f')),
    notices: look('notices', { at: L.board.at, spot: L.board.spot }, L.board.y + 0.1, on('2f')),
    laundry: look('laundry', L.laundry, 0.9, on('3f')),
    drinks: look('drinks', L.drinks, 1.3, on('3f')),
    washing: look('washing', R.washing, 1.3, on('roof')),
    planters: look('planters', R.planters, 0.8, on('roof')),
  };
  function look(id, { at, spot }, y, enabled) {
    return {
      anchor: (v) => v.set(at[0], y, at[1]),
      spot: () => spot,
      face: () => at,
      enabled,
      look: DORM_LOOKS[id],
    };
  }
  // the shared rooms' tall fronts: faded out while he is in the room, so it shows over the low wall, as his flat's
  // does (scenes/dorms/shared.js)
  const fronts = L.fronts.map((f) => {
    const mats = [];
    f.group.traverse((o) => o.isMesh && mats.push(o.material));
    return { ...f, mats, k: 1 };
  });
  function rooms(p, dt) {
    for (const f of fronts) {
      const want = st.level === f.level && p.x > f.x0 && p.x < f.x1 && p.z < NEAR + 0.2 ? 0 : 1;
      if (f.k === want) continue;
      f.k = want > f.k ? Math.min(1, f.k + dt * 2.5) : Math.max(0, f.k - dt * 2.5);
      for (const m of f.mats) {
        m.transparent = f.k < 1;
        m.opacity = f.k;
      }
      f.group.visible = f.k > 0;
    }
  }
  // his height on the flights: down lane A, up lane B, level everywhere else (the roof has no flights in view)
  function floorY(p) {
    if (st.level === 'roof' || p.z <= STAIR.top) return 0;
    const lx = p.x - LEVEL_DX[st.level];
    if (lx >= STAIR.b[0] - 0.03) return stairUpY(p.z);
    if (lx >= STAIR.a[0] - 0.45) return stairY(p.z);
    return 0;
  }
  return {
    thing: (id) => things[id], // what a thing does here; its label is the catalog's (places/dorms.js)
    spots: {
      landing_3f: S['3f'].landing,
      roof_door: R.out,
      ...L.nooks,
    },
    setLevel,
    follow,
    rooms,
    floorY,
    // the camera on a corridor floor follows him along it; these are its limits there, at the floor's x
    dx: () => LEVEL_DX[st.level],
  };
}
