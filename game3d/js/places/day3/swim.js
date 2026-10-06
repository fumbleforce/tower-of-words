// Day-three pool choreography: visible equipment, changing-room route, swimming and shared bench endings.
// Hook state names are the contract used by story/clubs.js; place exit cancels every in-flight action.
import { flags } from '../../narrative/state.js';
import { sim } from '../../sim.js';
import { sfx } from '../../sfx.js';
import { poolProps, poolEquipmentSave } from './pool-props.js';
import { walkRig, faceRig, glide } from '../../move.js';
import { MC } from '../../mc.js';
import * as D from '../../scenes/sports/deck-plan.js';
import { pt, DECK } from '../../scenes/sports/plan.js';
import { swimmerPose, faceSwimmer } from './swim-pose.js';
import { poolAction } from './pool-action.js';
import { poolHandling } from './pool-handling.js';
import { poolEquipmentActions } from './pool-equipment.js';
import { poolCamera } from './pool-camera.js';

const [WX0, WZ0] = pt([D.WATER[0], D.WATER[2]]),
  [WX1, WZ1] = pt([D.WATER[1], D.WATER[3]]); // the water, in the sports chunk's frame
const LANE = WX0 + D.LANE_W / 2; // the first lane's middle, the steps' lane
const LANE2 = WX0 + D.LANE_W * 1.5;
const STEPS_TOP = [LANE, WZ1 + D.COPING + 0.35];
const SEAT_S = pt(D.SEATS.deck_bench_s.at);
const SEAT_N = pt(D.SEATS.deck_bench_n.at);
const TOP = D.SEATS.deck_bench_s.top;
const EAST = Math.PI / 2;
const KURO_REST = [SEAT_S[0] + 0.55, SEAT_S[1] + 1.55]; // at the south bench's end, by Emi

export function poolClub(game, { root, cast }) {
  const P = () => game.place;
  const action = poolAction(game),
    handling = poolHandling(root);
  const camera = poolCamera(game);
  const who = (id) => (id === 'eric' ? game.player : cast.people[id]);
  const poses = new Map();
  const waterPose = (id) => {
    const r = who(id);
    if (!poses.has(r)) poses.set(r, swimmerPose(r));
    return poses.get(r);
  };
  const dry = (id) => poses.get(who(id))?.leave();
  const { bags, bagItems, list, floats, towels, goggles } = poolProps(root);
  const equipment = poolEquipmentSave(root, [list, floats, goggles, ...towels, ...bagItems]);
  const FENCE = pt([DECK[0] + 0.12, DECK[3] - 1.4]); // the west fence by the corner nook, a hand's height
  goggles.position.set(FENCE[0], 1.05, FENCE[1]);
  goggles.rotation.y = EAST;
  const BAGS_AT = pt(D.BAG_RACKS[0]),
    ATTENDANT = [LANE + 1.6, WZ1 + 1.6],
    BAGS_ATT = pt(D.BAG_RACKS[1]);
  const setAt = (o, [x, z], y = 0.12) => {
    o.visible = true;
    o.position.set(x, y, z);
  };
  // someone in the water at [x, z]: lowered, facing along the lane
  const inWater = (id, [x, z], face = Math.PI) => {
    const r = who(id);
    if (!r) return;
    if (id === 'eric') {
      r.root.position.set(x, 0, z);
      r.root.rotation.y = face;
      waterPose(id).enter();
      return;
    }
    cast.put(id, [x, z], null, { yaw: face });
    waterPose(id).enter();
    if (r.blob) r.blob.visible = false;
  };
  // the group as the story has got to it, on every arrival and Continue (no timers: each state just set)
  function arrange() {
    for (const pose of poses.values()) pose.leave();
    handling.drop(who('emi'));
    handling.drop(who('member'));
    handling.drop(game.player);
    bagItems.forEach((bag, i) => {
      bags.add(bag);
      bag.position.set(i * 0.38, 0, 0);
      bag.rotation.set(0, 0, 0);
    });
    goggles.visible = sim.day === 3 && sim.period === 'evening' && !flags.d3_goggles_returned && !!flags.club_swimming;
    if (sim.day !== 3 || sim.period !== 'evening') {
      for (const o of [bags, list, floats, ...towels]) o.visible = false;
      for (const id of ['emi', 'kuro', 'attendant', 'member']) cast.hide(id);
      return;
    }
    setAt(floats, [ATTENDANT[0] + 0.7, ATTENDANT[1] - 0.2], 0.05);
    cast.put('attendant', ATTENDANT, [ATTENDANT[0] + 0.7, ATTENDANT[1] - 0.2]);
    if (flags.d3_swim_done) {
      // resting after the swim: Emi and Kuro on the south bench with their towels, the bags with the attendant
      cast.seat('emi', {
        x: SEAT_S[0] + 0.02,
        z: SEAT_S[1] + 0.62,
        top: TOP,
        ry: EAST,
      });
      cast.put('kuro', KURO_REST, [SEAT_S[0] + 0.6, SEAT_S[1]]);
      cast.put('member', [SEAT_N[0] + 1.2, SEAT_N[1] - 0.5], [SEAT_N[0], SEAT_N[1]]);
      setAt(bags, BAGS_ATT, 0.415);
      setAt(list, [ATTENDANT[0] - 0.45, ATTENDANT[1] + 0.3], 0.02);
      towels.forEach((t, i) =>
        setAt(t, i ? [KURO_REST[0] + 0.3, KURO_REST[1] + 0.35] : [SEAT_S[0] + 0.05, SEAT_S[1] + 1.0], i ? 0.02 : 0.36),
      );
      return;
    }
    cast.put('emi', [STEPS_TOP[0] - 1.6, STEPS_TOP[1] - 0.25], [LANE, WZ1]);
    cast.put('member', [STEPS_TOP[0] - 1.0, STEPS_TOP[1] - 1.25], [STEPS_TOP[0] - 1.6, STEPS_TOP[1] - 0.25]);
    inWater('kuro', [LANE2, WZ1 - 1.8], 0); // leave the wall-side crossing to the shared steps clear
    setAt(bags, BAGS_AT, 0.415);
    handling.hold(who('member'), list);
    for (const t of towels) t.visible = false;
  }

  // The visible locker/shower route before the steps. Outfit replacement awaits approved swimwear meshes.
  async function changeAndEnter() {
    const door = MC.gender === 'woman' ? D.EXIT_W : D.EXIT;
    const changing = P().changing;
    if (changing) {
      await action.wait(game.walkTo(...changing.locker));
      await action.wait(game.wait(400));
    } else await action.wait(game.walkTo(door.lane[0], door.lane[1]));
    const e = game.player;
    if (!changing) e.root.position.set(STEPS_TOP[0], 0, STEPS_TOP[1]);
    e.root.rotation.y = Math.PI;
    game.walker.sync?.();
    P().cam.snap?.(e.root.position);
    if (changing) {
      await action.wait(game.walkTo(...changing.shower));
      await action.wait(game.wait(350));
      await action.wait(game.walkTo(...changing.deck));
      await action.wait(game.walkTo(...STEPS_TOP));
    }
    e.scripted = true;
    await action.wait(steps('eric', true));
    // Clear the landing and listen from inside the lane, so the others address a person rather than a row.
    await action.wait(glide(game, e.root, [LANE, WZ1 - 1.8], 0.7));
  }
  async function steps(id, entering) {
    const r = who(id),
      pose = waterPose(id);
    const bottom = [LANE, WZ1 - 0.6],
      from = entering ? STEPS_TOP : bottom,
      to = entering ? bottom : STEPS_TOP;
    r.root.rotation.y = entering ? Math.PI : 0;
    pose.enter('tread', entering ? 0 : 1);
    await action.wait(
      action.tween(1.4, (k) => {
        r.root.position.x = from[0] + (to[0] - from[0]) * k;
        r.root.position.z = from[1] + (to[1] - from[1]) * k;
        pose.setDepth(entering ? k : 1 - k);
      }),
    );
    if (!entering) dry(id);
  }
  async function climbOut(id, to) {
    const r = who(id);
    await action.wait(glide(game, r.root, [LANE, WZ1 - 0.6], 1.0));
    await action.wait(steps(id, false));
    r.setState?.('idle');
    if (id === 'eric') {
      r.scripted = false;
      game.walker.sync?.();
    } else if (to) await action.wait(walkRig(game, r, to, { speed: 1.1 }));
  }
  async function sitPlayer() {
    const s = P().seats.deck_bench_s,
      out = s.out;
    await action.wait(game.walkTo(...out));
    game.player.sitAt(s.x, s.top, s.z, s.ry);
    game.player.seated = true;
    game.player.seatOut = out;
    game.walker.facing = s.ry;
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
      waterPose(id).enter('swim');
      return [r, x, r.root.position.z, id];
    });
    const far = WZ0 + 1.2,
      near = WZ1 - 1.8;
    const cam = P().cam;
    camera.clear();
    cam.closeOn?.([(WX0 + WX1) / 2, (WZ0 + WZ1) / 2], 0.9);
    sfx('flap');
    await action.wait(
      action.tween(8, (k) =>
        from.forEach(([r, x, z0]) => {
          r.root.position.set(x, r.root.position.y, z0 + (far - z0) * k);
          r.root.rotation.y = Math.PI;
        }),
      ),
    );
    await action.wait(
      action.tween(8, (k) =>
        from.forEach(([r, x]) => {
          r.root.position.set(x, r.root.position.y, far + (near - far) * k);
          r.root.rotation.y = 0;
        }),
      ),
    );
    for (const [, , , id] of from) waterPose(id).enter();
    sfx('flap');
    if (withPlayer) {
      // Kuro finishes beside the player and waits at the wall
      const k = who('kuro');
      k.root.position.set(LANE + 0.75, k.root.position.y, near);
      camera.frame([LANE2, near]);
    }
  }

  const { putListAway, carryBags, collectList } = poolEquipmentActions(game, {
    action,
    handling,
    who,
    setAt,
    list,
    bagItems,
    source: BAGS_AT,
    target: BAGS_ATT,
    seat: SEAT_S,
  });

  const hooks = {
    async poolSession({ state } = {}) {
      const cam = P().cam;
      if (!['length', 'another', 'emiEnter'].includes(state)) camera.clear();
      if (state === 'begin') {
        arrange();
        game.walker.faceTo?.(STEPS_TOP[0] - 1.6, STEPS_TOP[1] - 0.25);
        cam.closeOn?.([STEPS_TOP[0] - 0.6, STEPS_TOP[1] - 0.6], 1.25);
        return;
      }
      if (state === 'list') {
        const member = who('member'),
          emi = who('emi'),
          ep = emi.root.position;
        cam.closeOn?.([ep.x + 0.25, ep.z], 1.9);
        handling.hold(member, list);
        await action.wait(walkRig(game, member, [ep.x + 0.5, ep.z], { speed: 1.0 }));
        await action.wait(faceRig(game, member, [ep.x, ep.z]));
        await action.wait(faceRig(game, emi, [member.root.position.x, member.root.position.z]));
        handling.reach(emi, list.position.toArray());
        await action.wait(game.wait(500));
        handling.drop(member);
        handling.hold(emi, list);
        sfx('tap');
        return;
      }
      if (state === 'handover' || state === 'bags') {
        const id = state === 'bags' ? 'eric' : 'emi',
          r = who(id);
        await action.wait(putListAway());
        cam.closeOn?.([(BAGS_AT[0] + BAGS_ATT[0]) / 2, (BAGS_AT[1] + BAGS_ATT[1]) / 2], 1.35);
        await action.wait(carryBags(id));
        await action.wait(faceRig(game, who('attendant'), [r.root.position.x, r.root.position.z]));
        await action.wait(walkRig(game, r, [STEPS_TOP[0] - 0.7, STEPS_TOP[1] - 0.3], { speed: 1.1 }));
        if (id === 'eric') game.walker.sync();
        return;
      }
      if (state === 'enter') return changeAndEnter();
      if (state === 'emiEnter') {
        await action.wait(putListAway());
        const emi = who('emi');
        await action.wait(walkRig(game, emi, STEPS_TOP, { speed: 1.0 }));
        await action.wait(steps('emi', true));
        await action.wait(glide(game, emi.root, [LANE2 + D.LANE_W, WZ1 - 0.6], 0.9));
        const listener = flags.d3_player_swims ? who('eric').root.position : who('kuro').root.position;
        await action.wait(faceRig(game, emi, [listener.x, listener.z]));
        if (flags.d3_player_swims) {
          const k = who('kuro').root.position;
          await faceSwimmer(game, action, k);
          await action.wait(faceRig(game, who('kuro'), [listener.x, listener.z]));
        }
        camera.frame([LANE2, WZ1 - 0.9]);
        sfx('flap');
        return;
      }
      if (state === 'length') {
        await action.wait(swimLength(!!flags.d3_player_swims));
        return;
      }
      if (state === 'another') {
        await action.wait(Promise.all([collectList(), swimLength(!!flags.d3_player_swims)]));
        return;
      }
      if (state === 'sit') {
        await action.wait(climbOut('emi', [SEAT_S[0] + 0.65, SEAT_S[1] + 0.62]));
        await action.wait(climbOut('kuro', KURO_REST));
        const swims = !!flags.d3_player_swims;
        if (swims) {
          await action.wait(climbOut('eric'));
          await action.wait(sitPlayer());
        } else if (!game.player.seated) await action.wait(sitPlayer());
        // Emi beside the player on the bench, Kuro at its end with her towel (the player's own place is its middle)
        cast.seat('emi', {
          x: SEAT_S[0] + 0.02,
          z: SEAT_S[1] + 0.62,
          top: TOP,
          ry: EAST,
        });
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
        if (game.player.seated) await action.wait(game.hooks.stand({ who: 'eric' }));
        return;
      }
      if (state === 'exit') {
        const e = game.player;
        if (poses.get(e)?.active) await action.wait(climbOut('eric'));
        else if (e.seated) await action.wait(game.hooks.stand({ who: 'eric' }));
        e.scripted = false;
        game.walker.sync?.();
        return;
      }
      if (state === 'goggles') {
        const m = who('member');
        await action.wait(
          walkRig(game, m, [FENCE[0] + 0.7, FENCE[1] - 0.6], {
            speed: 1.2,
          }),
        );
        await action.wait(faceRig(game, m, FENCE));
        await action.wait(game.wait(300));
        goggles.visible = false;
        sfx('tap');
      }
    },
  };
  const runSession = hooks.poolSession;
  hooks.poolSession = (args) => action.run(() => runSession(args));
  // the goggles on the fence, members only (the story's show), until she has them back
  const gogglesThing = {
    anchor: (v) => v.set(FENCE[0], 1.4, FENCE[1]),
    spot: () => [FENCE[0] + 0.75, FENCE[1]],
    face: () => FENCE,
    enabled: () => goggles.visible,
  };
  return {
    arrange,
    hooks,
    goggles: () => gogglesThing,
    update() {
      camera.update();
      handling.update();
      for (const [rig, pose] of poses) if (pose.active && rig.blob) rig.blob.visible = false;
    },
    snapshot() {
      return {
        camera: camera.snapshot(),
        swimmers: Object.fromEntries(['eric', 'emi', 'kuro'].map((id) => [id, poses.get(who(id))?.mode || null])),
        sheetHolder: ['member', 'emi'].find((id) => who(id) === handling.owner(list)) || null,
        props: equipment.snapshot(),
      };
    },
    restore(saved = {}) {
      camera.restore(saved.camera);
      for (const [id, mode] of Object.entries(saved.swimmers || saved)) {
        if (!who(id) || !['tread', 'swim'].includes(mode)) continue;
        waterPose(id).enter(mode);
        if (id === 'eric') game.player.scripted = true;
      }
      equipment.restore(saved.props);
      handling.drop(who('member'));
      handling.drop(who('emi'));
      if (saved.sheetHolder && who(saved.sheetHolder)) handling.hold(who(saved.sheetHolder), list);
    },
    playerInWater() {
      return !!poses.get(game.player)?.active;
    },
    leave() {
      camera.dispose();
      action.cancel();
      game.walker.stop();
      game.player.scripted = false;
      for (const id of ['eric', 'emi', 'kuro', 'member', 'attendant']) {
        const r = who(id);
        if (!r) continue;
        r.root.userData.walkTok = (r.root.userData.walkTok || 0) + 1;
        r.root.userData.faceTok = (r.root.userData.faceTok || 0) + 1;
      }
      for (const pose of poses.values()) pose.dispose();
      poses.clear();
      handling.dispose();
    },
  };
}
