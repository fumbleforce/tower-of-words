// The swimming club's last outdoor swim on day 3's evening (story/clubs.js club_swimming_pool, story/day3/pool.js), on
// the pool deck (places/pool.js). Before it: Emi in by the steps with the club's bags, Kuro already in the water at
// the steps, a member with the equipment list, the attendant packing the unused floats on the south deck. The water
// is a plane over the deck (scenes/sports/pool.js), so someone in it stands lower, shoulders up.
// `poolSession` states (each finishes before the next line, no timers, no swim controls):
//   begin     the four framed together          list      the member hands Emi the list
//   handover  Emi takes the bags to the attendant herself, he takes them
//   bags      the player carries them a few steps to beside the steps and comes back
//   enter     the player changes (the protagonist's own changing room) and goes down the steps
//   emiEnter  Emi leaves the list dry on the bench and goes in      length  a length and back (the player too when
//   swimming: Kuro finishes beside them)      another  the list with the attendant, a second length
//   sit       the swimmers out, towels, seated with the player      free  the player up, free on the deck, the group
//   stays      exit  a swimming player out, changed back, on the deck by the door      goggles  the member collects
//   her goggles off the fence corner
// With d3_swim_done the group is resting on the benches on every return; before it, the session waits at Emi.
import * as THREE from 'three';
import { flags } from '../../narrative/state.js';
import { sim } from '../../sim.js';
import { sfx } from '../../sfx.js';
import { rbox } from '../../props.js';
import { walkRig, faceRig, glide } from '../../move.js';
import { MC } from '../../mc.js';
import * as D from '../../scenes/sports/deck-plan.js';
import { pt, DECK } from '../../scenes/sports/plan.js';

const [WX0, WZ0] = pt([D.WATER[0], D.WATER[2]]),
  [WX1, WZ1] = pt([D.WATER[1], D.WATER[3]]); // the water, in the sports chunk's frame
const LANE = WX0 + D.LANE_W / 2; // the first lane's middle, the steps' lane
const LANE2 = WX0 + D.LANE_W * 1.5;
const IN_Y = -0.72; // standing in the water: shoulders up
const STEPS_TOP = [LANE, WZ1 + D.COPING + 0.35];
const SEAT_S = pt(D.SEATS.deck_bench_s.at);
const SEAT_N = pt(D.SEATS.deck_bench_n.at);
const TOP = D.SEATS.deck_bench_s.top;
const EAST = Math.PI / 2;
const KURO_REST = [SEAT_S[0] + 0.55, SEAT_S[1] + 1.55]; // at the south bench's end, by Emi

export function poolClub(game, { root, cast }) {
  const P = () => game.place;
  const who = (id) => (id === 'eric' ? game.player : cast.people[id]);
  // the club's bags (three, the blue one Emi's), the equipment list, the floats being packed, two towels, the goggles
  const bag = (c) => rbox(0.34, 0.24, 0.2, c, { r: 0.05 });
  const bags = new THREE.Group();
  [
    ['#2f6fb0', 0],
    ['#5b6470', 0.38],
    ['#8a4b3a', 0.76],
  ].forEach(([c, dx]) => {
    const b = bag(c);
    b.position.x = dx;
    bags.add(b);
  });
  const list = rbox(0.21, 0.01, 0.29, '#f5f3ec', { r: 0.002 });
  const floats = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const f = rbox(0.42, 0.06, 0.3, ['#f0c33a', '#3a8fd0', '#e45a4a'][i % 3], { r: 0.02 });
    f.position.set((i % 2) * 0.05, i * 0.065, 0);
    floats.add(f);
  }
  const towels = [rbox(0.5, 0.03, 0.3, '#e9eef2', { r: 0.01 }), rbox(0.5, 0.03, 0.3, '#f2c9c4', { r: 0.01 })];
  const goggles = new THREE.Group();
  goggles.add(rbox(0.16, 0.05, 0.03, '#2b8fd6', { r: 0.015 }), rbox(0.2, 0.012, 0.012, '#1d2329', { y: 0.02 }));
  for (const o of [bags, list, floats, ...towels, goggles]) {
    o.visible = false;
    o.userData.noBatch = true;
    root.add(o);
  }
  const FENCE = pt([DECK[0] + 0.12, DECK[3] - 1.4]); // the west fence by the corner nook, a hand's height
  goggles.position.set(FENCE[0], 1.05, FENCE[1]);
  goggles.rotation.y = EAST;
  const BAGS_AT = [STEPS_TOP[0] - 2.3, STEPS_TOP[1] - 0.9],
    BAGS_BY_STEPS = [STEPS_TOP[0] - 1.15, STEPS_TOP[1] + 0.15],
    ATTENDANT = [LANE + 1.6, WZ1 + 1.6],
    BAGS_ATT = [ATTENDANT[0] + 0.5, ATTENDANT[1] + 0.55];
  const setAt = (o, [x, z], y = 0.12) => {
    o.visible = true;
    o.position.set(x, y, z);
  };
  // someone in the water at [x, z]: lowered, facing along the lane
  const inWater = (id, [x, z], face = Math.PI) => {
    const r = who(id);
    if (!r) return;
    if (id === 'eric') {
      r.root.position.set(x, IN_Y, z);
      r.root.rotation.y = face;
      return;
    }
    cast.put(id, [x, z], null, { yaw: face });
    r.root.position.y = IN_Y;
    if (r.blob) r.blob.visible = false;
  };
  // the group as the story has got to it, on every arrival and Continue (no timers: each state just set)
  function arrange() {
    goggles.visible = sim.period === 'evening' && !flags.d3_goggles_returned && !!flags.club_swimming;
    if (sim.period !== 'evening') {
      for (const o of [bags, list, floats, ...towels]) o.visible = false;
      for (const id of ['emi', 'kuro', 'attendant', 'member']) cast.hide(id);
      return;
    }
    setAt(floats, [ATTENDANT[0] + 0.7, ATTENDANT[1] - 0.2], 0.05);
    cast.put('attendant', ATTENDANT, [ATTENDANT[0] + 0.7, ATTENDANT[1] - 0.2]);
    if (flags.d3_swim_done) {
      // resting after the swim: Emi and Kuro on the south bench with their towels, the bags with the attendant
      cast.seat('emi', { x: SEAT_S[0] + 0.02, z: SEAT_S[1] + 0.62, top: TOP, ry: EAST });
      cast.put('kuro', KURO_REST, [SEAT_S[0] + 0.6, SEAT_S[1]]);
      cast.put('member', [SEAT_N[0] + 1.2, SEAT_N[1] - 0.5], [SEAT_N[0], SEAT_N[1]]);
      setAt(bags, BAGS_ATT, 0.12);
      setAt(list, [ATTENDANT[0] - 0.45, ATTENDANT[1] + 0.3], 0.02);
      towels.forEach((t, i) =>
        setAt(t, i ? [KURO_REST[0] + 0.3, KURO_REST[1] + 0.35] : [SEAT_S[0] + 0.05, SEAT_S[1] + 1.0], i ? 0.02 : 0.36),
      );
      return;
    }
    cast.put('emi', [STEPS_TOP[0] - 1.6, STEPS_TOP[1] - 0.25], [LANE, WZ1]);
    cast.put('member', [STEPS_TOP[0] - 1.0, STEPS_TOP[1] - 1.25], [STEPS_TOP[0] - 1.6, STEPS_TOP[1] - 0.25]);
    inWater('kuro', [LANE2, WZ1 - 0.9], 0); // in the second lane, clear of the steps
    setAt(bags, BAGS_AT, 0.12);
    list.visible = false;
    for (const t of towels) t.visible = false;
  }

  // the player down the steps into the first lane (after changing, behind a short dark: the changing rooms)
  async function changeAndEnter() {
    const door = MC.gender === 'woman' ? D.EXIT_W : D.EXIT;
    await game.walkTo(door.lane[0], door.lane[1]);
    await game.ui.fade('', '', 500);
    const e = game.player;
    e.root.position.set(STEPS_TOP[0], 0, STEPS_TOP[1]);
    e.root.rotation.y = Math.PI;
    game.walker.sync?.();
    P().cam.snap?.(e.root.position);
    await game.ui.unfade();
    e.scripted = true;
    e.setState('walk');
    await glide(game, e.root, [LANE, WZ1 - 0.6], 0.9);
    e.root.position.y = IN_Y;
    e.setState('idle');
  }
  async function climbOut(id, to) {
    const r = who(id);
    if (id === 'eric') {
      await glide(game, r.root, [LANE, WZ1 - 0.6], 1.0);
      r.root.position.y = 0;
      r.setState?.('walk');
      await glide(game, r.root, STEPS_TOP, 0.9);
      r.setState?.('idle');
      r.scripted = false;
      game.walker.sync?.();
      return;
    }
    r.root.position.y = 0;
    cast.put(id, STEPS_TOP, to);
    await walkRig(game, r, to, { speed: 1.1 });
  }
  // a length and back: the swimmers along their lanes, heads up
  async function swimLength(withPlayer) {
    const rows = [
      ['kuro', LANE2],
      ['emi', LANE2 + D.LANE_W],
    ];
    if (withPlayer) rows.push(['eric', LANE]);
    const from = rows.map(([id, x]) => {
      const r = who(id);
      if (id !== 'eric') inWater(id, [x, r.root.position.z], Math.PI);
      return [r, x, r.root.position.z];
    });
    const far = WZ0 + 1.2,
      near = WZ1 - 0.9;
    const cam = P().cam;
    cam.closeOn?.([(WX0 + WX1) / 2, (WZ0 + WZ1) / 2], 0.9);
    sfx('flap');
    await game.tween(3.2, (k) =>
      from.forEach(([r, x, z0], i) => {
        r.root.position.set(x, IN_Y + Math.sin(k * 30 + i) * 0.03, z0 + (far - z0) * k);
        r.root.rotation.y = Math.PI;
      }),
    );
    await game.tween(3.2, (k) =>
      from.forEach(([r, x], i) => {
        r.root.position.set(x, IN_Y + Math.sin(k * 30 + i) * 0.03, far + (near - far) * k);
        r.root.rotation.y = 0;
      }),
    );
    sfx('flap');
    if (withPlayer) {
      // Kuro finishes beside the player and waits at the wall
      const k = who('kuro');
      k.root.position.set(LANE + 0.75, IN_Y, near);
      cam.closeOn?.([LANE + 0.4, near], 1.6);
    }
  }

  const hooks = {
    async poolSession({ state } = {}) {
      const cam = P().cam;
      if (state === 'begin') {
        arrange();
        game.walker.faceTo?.(STEPS_TOP[0] - 1.6, STEPS_TOP[1] - 0.25);
        cam.closeOn?.([STEPS_TOP[0] - 0.6, STEPS_TOP[1] - 0.6], 1.25);
        return;
      }
      if (state === 'list') {
        await faceRig(
          game,
          who('member'),
          who('emi')
            .root.position.toArray()
            .filter((_, i) => i !== 1),
        );
        setAt(list, [STEPS_TOP[0] - 1.45, STEPS_TOP[1] - 0.6], 0.95);
        sfx('tap');
        return;
      }
      if (state === 'handover') {
        const emi = who('emi');
        setAt(list, [SEAT_S[0] + 0.05, SEAT_S[1] + 0.5], 0.36); // the list on the bench, dry
        await walkRig(game, emi, [ATTENDANT[0] - 0.7, ATTENDANT[1] - 0.1], { speed: 1.1 });
        await faceRig(game, emi, ATTENDANT);
        await faceRig(
          game,
          who('attendant'),
          emi.root.position.toArray().filter((_, i) => i !== 1),
        );
        sfx('tap');
        setAt(bags, BAGS_ATT, 0.12);
        await game.wait(400);
        await walkRig(game, emi, [STEPS_TOP[0] - 0.7, STEPS_TOP[1] - 0.3], { speed: 1.1 });
        return;
      }
      if (state === 'bags') {
        await game.walkTo(BAGS_AT[0] + 0.5, BAGS_AT[1] - 0.45);
        sfx('tap');
        bags.visible = false;
        await game.walkTo(BAGS_BY_STEPS[0] - 0.5, BAGS_BY_STEPS[1] - 0.6);
        setAt(bags, BAGS_BY_STEPS, 0.12);
        sfx('tap');
        await game.walkTo(BAGS_AT[0] + 0.8, BAGS_AT[1] - 0.8);
        return;
      }
      if (state === 'enter') return changeAndEnter();
      if (state === 'emiEnter') {
        const emi = who('emi');
        if (list.visible && list.position.y > 0.5) setAt(list, [SEAT_S[0] + 0.05, SEAT_S[1] + 0.5], 0.36);
        await walkRig(game, emi, STEPS_TOP, { speed: 1.0 });
        await glide(game, emi.root, [LANE + 0.4, WZ1 - 0.5], 0.8);
        inWater('emi', [LANE + 0.4, WZ1 - 0.6], 0);
        sfx('flap');
        return;
      }
      if (state === 'length') {
        await swimLength(!!flags.d3_player_swims);
        return;
      }
      if (state === 'another') {
        setAt(list, [ATTENDANT[0] - 0.45, ATTENDANT[1] + 0.3], 0.02);
        await swimLength(!!flags.d3_player_swims);
        return;
      }
      if (state === 'sit') {
        const swims = !!flags.d3_player_swims;
        if (swims) {
          await climbOut('eric');
          await game.hooks.sit({ who: 'eric', at: 'deck_bench_s' });
        } else if (!game.player.seated) await game.hooks.sit({ who: 'eric', at: 'deck_bench_s' });
        // Emi beside the player on the bench, Kuro at its end with her towel (the player's own place is its middle)
        cast.seat('emi', { x: SEAT_S[0] + 0.02, z: SEAT_S[1] + 0.62, top: TOP, ry: EAST });
        cast.put('kuro', KURO_REST, [SEAT_S[0] + 0.6, SEAT_S[1]]);
        towels.forEach((t, i) =>
          setAt(
            t,
            i ? [KURO_REST[0] + 0.3, KURO_REST[1] + 0.35] : [SEAT_S[0] + 0.05, SEAT_S[1] + 1.0],
            i ? 0.02 : 0.36,
          ),
        );
        cam.closeOn?.([SEAT_S[0] + 0.6, SEAT_S[1]], 1.5);
        return;
      }
      if (state === 'free') {
        if (game.player.seated) await game.hooks.stand({ who: 'eric' });
        return;
      }
      if (state === 'exit') {
        const e = game.player;
        if (e.root.position.y < -0.1) await climbOut('eric');
        else if (e.seated) await game.hooks.stand({ who: 'eric' });
        e.scripted = false;
        game.walker.sync?.();
        return;
      }
      if (state === 'goggles') {
        const m = who('member');
        await walkRig(game, m, [FENCE[0] + 0.7, FENCE[1] - 0.6], { speed: 1.2 });
        await faceRig(game, m, FENCE);
        await game.wait(300);
        goggles.visible = false;
        sfx('tap');
      }
    },
  };
  // the goggles on the fence, members only (the story's show), until she has them back
  const gogglesThing = {
    anchor: (v) => v.set(FENCE[0], 1.4, FENCE[1]),
    spot: () => [FENCE[0] + 0.75, FENCE[1]],
    face: () => FENCE,
    enabled: () => goggles.visible,
  };
  return { arrange, hooks, goggles: () => gogglesThing };
}
