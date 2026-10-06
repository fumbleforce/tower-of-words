// Two beginners use the west court; the singles players and Rei's doubles partner use the east court.
import { captureObjects, restoreObjects } from './saved.js';
import { snapshotPeople, restorePeople } from '../saved-people.js';
import { sim } from '../../sim.js';
import { isSunday } from './calendar.js';
import { flags } from '../../narrative/state.js';
import { dayCast } from '../day-cast.js';
import { walkRig, faceRig } from '../../move.js';
import { benchSit, standPose } from '../../crowd/motion.js';
import { sfx } from '../../sfx.js';
import * as C from '../../scenes/sports/court-plan.js';
import { pt } from '../../scenes/sports/plan.js';
import { racket, ball, bottle, basket, shoeLace } from './tennis-props.js';
import { racketSwing, adjustShoe } from './tennis-motion.js';
import { courtLight } from './court-light.js';
import { courtRepair } from './court-repair.js';

export function tennisCourt(game, P, cast, shot) {
  const repair = courtRepair(game, P, shot),
    lights = courtLight(P);
  const guests = [0, 1, 2].map(() => dayCast(game, { root: P.space, K: P.charScale, ids: ['member'] }));
  const rackets = [racket(), racket('#d56861'), racket('#788abc')];
  const held = [null, null, null];
  const b = ball(),
    drinks = [bottle(), bottle()],
    basketProp = basket(),
    benchBall = ball(),
    lace = shoeLace();
  for (const o of [...rackets, b, ...drinks, basketProp, benchBall, lace]) {
    o.visible = false;
    P.space.add(o);
  }
  const near = pt([C.CX, C.CZ + 4.4]),
    far = pt([C.CX, C.CZ - 4.4]);
  const outside = pt([C.GATE_X - 1.3, C.COURTS[3] + 0.28]);
  const gate = pt([C.GATE_X, C.COURTS[3] - 0.9]);
  const gateOut = pt([C.GATE_X, C.COURTS[3] + 0.28]);
  const east = pt([C.CXS[1], C.CZ]);
  const bench = P.seats.court_bench;
  let basketHeld = false,
    session = false;
  const rig = (id) => (id === 'eric' ? game.player : P.people[id]);
  const at = (o, [x, z], y = 0.055) => {
    o.position.set(x, y, z);
    o.visible = true;
  };
  const focus = (p, zoom = 1.2, yaw = 0.35) =>
    shot.focus(
      p,
      zoom >= 2.4 ? 7 : zoom >= 1.8 ? 12 : zoom >= 1.5 ? 14 : zoom >= 1.2 ? 16 : 32,
      0.65,
      yaw,
      zoom < 1.2 ? 0.9 : 0.62,
    );
  const hold = (o, who, dx = 0.25, y = 0.7, dz = 0.2) => {
    const r = rig(who),
      yaw = r.root.rotation.y;
    o.position.set(
      r.root.position.x + dx * Math.cos(yaw) + dz * Math.sin(yaw),
      r.root.position.y + y,
      r.root.position.z - dx * Math.sin(yaw) + dz * Math.cos(yaw),
    );
    const handName = dx < 0 ? 'LeftHand' : 'RightHand';
    const hand =
      (r.model || r.root).getObjectByName(handName) || (r.model || r.root).getObjectByName('mixamorig' + handName);
    if (hand) {
      hand.getWorldPosition(o.position);
      P.space.worldToLocal(o.position);
      if (o === basketProp) o.position.y -= 0.25;
    }
    o.rotation.set(0, yaw, o === basketProp ? 0 : Math.PI);
    o.visible = r.root.visible;
  };
  const walk = (id, to) => walkRig(game, rig(id), to, { speed: 1.8 });
  async function flight(from, to, high = 0.9) {
    at(b, from, 0.7);
    sfx('tap');
    await game.tween(0.7, (k) =>
      b.position.set(
        from[0] + (to[0] - from[0]) * k,
        0.7 + Math.sin(k * Math.PI) * high,
        from[1] + (to[1] - from[1]) * k,
      ),
    );
  }
  const swing = (id) => racketSwing(game, rig(id));
  async function rally() {
    held[0] = 'eric';
    held[1] = 'aoi';
    session = true;
    await walk('eric', near);
    await walk('aoi', far);
    faceRig(game, rig('eric'), far);
    faceRig(game, rig('aoi'), near);
    focus(pt([C.CX, C.CZ]), 1);
    for (let i = 0; i < 4; i++) {
      await swing(i % 2 ? 'aoi' : 'eric');
      await flight(i % 2 ? far : near, i % 2 ? near : far);
    }
  }
  function restore() {
    repair.restore();
    lights();
    const active = isSunday() && sim.period === 'evening';
    guests.forEach((g, i) =>
      active
        ? g.put('member', [east[0] + (i === 2 ? 3 : i ? 1 : -1), east[1] + (i === 0 ? -5 : 5)], east)
        : g.hideAll(),
    );
    session = false;
    basketHeld = active && !flags.d4_tennis_done;
    held[0] = null;
    held[2] = active && flags.d4_tennis_done ? 'rei' : null;
    held[1] = active && flags.d4_tennis_done ? 'aoi' : null;
    for (const r of rackets) r.visible = active || sim.period === 'afternoon';
    b.visible = false;
    lace.visible = false;
    basketProp.visible = active;
    if (active && !basketHeld) at(basketProp, [gate[0] - 0.7, gate[1]], 0.12);
    if (active) at(benchBall, [bench.x + 0.5, bench.z + 1.0]);
    else benchBall.visible = false;
    drinks.forEach((d) => {
      d.visible = false;
    });
  }
  const benchThing = {
    label: 'Ball by the bench',
    kind: 'thing small',
    verb: 'Look',
    anchor: (v) => {
      benchBall.getWorldPosition(v);
      v.y += 0.25;
      return v;
    },
    spot: () => [bench.x + 1.3, bench.z + 1],
    face: () => [bench.x, bench.z + 1],
    enabled: () => isSunday() && sim.period === 'evening' && !flags.d4_bottle_seen,
  };
  async function serve(id) {
    held[1] = 'aoi';
    await walk(id, near);
    faceRig(game, rig(id), far);
    focus(near, 1.9);
    await game.wait(400);
    at(b, near, 1.5);
    await racketSwing(game, rig(id), true);
    await flight(near, far, 1.6);
  }
  async function tennisSession({ state }) {
    if (state === 'begin') {
      restore();
      session = true;
      shot.focus(east, 42, 0.6, 0.35, 0.9);
      await game.wait(900);
      const offer = [gate[0], gate[1] - 1.4];
      await walk('rei', offer);
      await walk('aoi', [offer[0] - 1.0, offer[1]]);
      await game.walkTo?.(offer[0] + 0.8, offer[1] - 1.0);
      faceRig(game, game.player, offer);
      faceRig(game, rig('rei'), [offer[0] + 0.8, offer[1] - 1.0]);
      faceRig(game, rig('aoi'), [offer[0] + 0.8, offer[1] - 1.0]);
      shot.focus([offer[0], offer[1] - 0.3], 17, 0.6, Math.PI - 0.2, 0.62);
    } else if (state === 'racket') {
      held[0] = 'rei';
      held[1] = 'rei';
      shot.focus([gate[0], gate[1] - 1.7], 17, 0.6, Math.PI - 0.2, 0.62);
      await game.hooks.gesture({ who: 'rei', kind: 'point', to: 'eric' });
    } else if (state === 'basketDown') {
      basketHeld = false;
      at(basketProp, [gate[0] - 0.7, gate[1]], 0.12);
      held[0] = 'eric';
      held[1] = 'aoi';
    } else if (state === 'aoiRally') {
      await rally();
      focus(gateOut, 1.5);
      await game.tween(1, (k) =>
        b.position.set(near[0] + (outside[0] - near[0]) * k, 0.05, near[1] + (outside[1] - near[1]) * k),
      );
    } else if (state === 'fetch') {
      for (const p of [gate, gateOut, outside]) await walk('aoi', p);
      b.visible = false;
      await game.hooks.gesture({ who: 'aoi', kind: 'bow' });
      for (const p of [gateOut, gate, far]) await walk('aoi', p);
      focus(pt([C.CX, C.CZ]), 1);
    } else if (state === 'aoiAgain' || state === 'repeat') await rally();
    else if (state === 'serve') await serve('rei');
    else if (state === 'aoiTurn') {
      await walk('rei', [near[0] + 1.4, near[1]]);
      await serve('aoi');
    } else if (state === 'doubles') {
      // Across the run-off strip to the east court, clear of either net.
      const crossing = [east[0], near[1]];
      await walk('rei', crossing);
      faceRig(game, rig('rei'), [east[0], east[1] - 5]);
      b.visible = false;
      held[1] = 'aoi';
      held[2] = 'rei';
    } else if (state === 'drink') {
      await walk('eric', [bench.x + 1.2, bench.z - 0.45]);
      await walk('aoi', [bench.x + 1.2, bench.z + 0.45]);
      benchSit(game.player, bench.x, bench.z - 0.43, bench.ry, bench.top);
      cast.seat('aoi', { ...bench, z: bench.z + 0.43 });
      held[0] = null;
      focus([bench.x + 0.3, bench.z], 1.8, Math.PI / 2 + 0.2);
      drinks.forEach((d, i) => at(d, [bench.x + 0.4, bench.z + (i ? 0.8 : -0.8)], 0.11));
    } else if (state === 'shoe') {
      lace.visible = true;
      await adjustShoe(game, rig('aoi'));
    } else if (state === 'bottle') {
      focus([bench.x + 0.6, bench.z + 1], 2.4);
      const p = [bench.x + 0.5, bench.z + 1.0];
      at(benchBall, [p[0] + 0.45, p[1]]);
      await game.tween(0.65, (k) => {
        benchBall.position.x = p[0] + 0.45 * (1 - k);
      });
      at(drinks[0], [p[0] - 0.04, p[1]], 0.13);
      const member = rig('member'),
        yaw = member.root.rotation.x;
      await adjustShoe(game, member);
      await game.tween(1, (k) => {
        member.root.rotation.x = yaw + Math.sin(k * Math.PI) * 0.4;
      });
      await game.tween(0.4, (k) => {
        drinks[0].position.y = 0.13 + k * 0.55;
      });
      benchBall.visible = false;
      drinks[0].visible = false;
    } else if (state === 'free') {
      held[0] = null;
      b.visible = false;
      session = false;
      standPose(game.player);
      game.player.seated = false;
      game.player.root.position.y = 0;
      game.walker.sync();
      if (Math.abs(game.player.root.position.x - bench.x) < 0.5) {
        await walk('eric', [bench.x + 1.3, game.player.root.position.z]);
        game.walker.sync();
      }
      P.cam.release();
      if (!flags.d4_tennis_done) {
        cast.put('aoi', [gate[0] - 0.9, gate[1]], near);
        cast.put('rei', gate, near);
        basketHeld = true;
        held[1] = null;
      }
    }
  }
  return {
    restore,
    snapshot: () => ({
      held: [...held],
      session,
      basketHeld,
      repair: repair.snapshot(),
      objects: captureObjects([...rackets, b, ...drinks, basketProp, benchBall, lace]),
      guests: guests.map((g) => snapshotPeople(g.people)),
    }),
    load: (s) => {
      held.splice(0, 3, ...s.held);
      session = s.session;
      basketHeld = s.basketHeld;
      repair.load(s.repair);
      restoreObjects([...rackets, b, ...drinks, basketProp, benchBall, lace], s.objects);
      guests.forEach((g, i) => restorePeople(g.people, s.guests[i]));
    },
    things: { bench_ball: benchThing },
    hooks: { courtRepair: repair.hook, tennisSession },
    update(dt) {
      lights();
      guests.forEach((g) => g.update(dt));
      if (!isSunday()) {
        rackets.forEach((r) => {
          r.visible = false;
        });
        return;
      }
      rackets.forEach((r, i) => {
        if (held[i]) hold(r, held[i], i === 1 && held[i] === 'rei' ? -0.25 : 0.25);
        else if (sim.period === 'evening') {
          at(r, [gate[0] - 0.7 + i * 0.15, gate[1] + 0.3], 0.18);
          r.rotation.z = 1.1;
        } else r.visible = false;
      });
      if (lace.visible) {
        const r = rig('aoi'),
          foot = (r.model || r.root).getObjectByName('RightFoot');
        if (foot) {
          foot.getWorldPosition(lace.position);
          P.space.worldToLocal(lace.position);
          lace.position.y += 0.015;
        } else {
          lace.position.copy(r.root.position);
          lace.position.x += 0.3;
          lace.position.y = 0.12;
        }
        lace.rotation.y = r.root.rotation.y;
      }
      if (basketHeld) hold(basketProp, 'aoi', 0, 0.65, 0.28);
      if (!session && flags.d4_tennis_done) held[1] = sim.period === 'evening' ? 'aoi' : null;
    },
  };
}
