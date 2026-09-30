// The canteen terrace closing after work (docs/game/places.md, plaza): the chairs stand upside down on the tables,
// and a canteen worker in the canteen's teal apron carries the last ones in. At the table nearest the link one chair
// still stands at its south side; the worker holds the one from its east side. The `canteenChair` hook:
//   take   the worker carries theirs over and stops, chair in hand; Eric has his hands on the standing one, looks
//          round at the stacked tables and back at it
//   stack  Eric turns his chair over onto the table, then the worker sets theirs beside it
//   leave  the worker goes back to closing at the next table
//   state: 'open' (before), 'taken', 'stacked', 'closed' (after)
import { PEOPLE, armsHold, walkPose, idle } from '../cast.js';
import { walkPerson, stepPeople } from '../story.js';
import { blob } from '../engine.js';
import { rbox } from '../props.js';
import { K } from '../scenes/office.js';
import { AWNING } from '../scenes/plaza-buildings.js';
import { TERRACE_TABLES as T, chairAt, chairBlock, terraceChair, STACKED_Y } from '../scenes/plaza/furniture.js';
import { flags } from '../narrative/state.js';
import { route } from './route.js';
import { hold, lean } from './eric-hold.js';

// the story's flag once he has helped (story/plaza.js canteen_table): a plaza built later that evening starts from it
const HELPED = 'evening_canteen_helped';
const ease = (k) => k * k * (3 - 2 * k);
const [SOUTH, EAST] = T.loose;

export function canteenClosing(game, root, nav, chairs) {
  const x = T.xs[T.shared],
    z = T.z,
    next = T.xs[T.shared + 1]; // the next table east, where the worker is closing up
  const his = terraceChair(),
    theirs = terraceChair();
  his.name = 'evening:chair-first';
  theirs.name = 'evening:chair-second';
  root.add(his, theirs);
  his.userData.noBatch = theirs.userData.noBatch = true; // they move: the draw-call pass leaves them alone
  // the worker: a background worker in white, with the canteen's apron
  const r = PEOPLE.worker(25);
  r.root.scale.multiplyScalar(K);
  r.torso.add(rbox(0.25, 0.3, 0.02, AWNING.canvas, { y: -0.15, z: 0.105, r: 0.008, seg: 1 }));
  r.root.add(blob(0.45, 0.35));
  root.add(r.root);
  const AT = {
    // behind the standing chair and a little east of it, so the camera (on this spot) sees the chair and the worker
    eric: [x + 0.4, z + 1.3],
    start: [next + 0.5, z + 1.35], // on the way over, their chair in their hands
    table: [x + 1.2, z + 0.55], // at the table's east side
    closing: [next + 0.2, z + 1.25], // back at the next table, wiping it down
  };
  const face = (p, q) => Math.atan2(q[0] - p[0], q[1] - p[1]);
  let state = 'open',
    carrying = false,
    wiping = false;
  const shown = () => !!flags.going_home;

  const put = (c, p) => {
    c.position.set(p.x, p.stacked ? STACKED_Y : 0, p.z);
    c.rotation.set(0, p.yaw, p.stacked ? Math.PI : 0);
  };
  // the chair in the worker's hands: held out in front of them at hip height, its back toward them
  const inHands = () => {
    const p = r.root.position,
      a = r.root.rotation.y;
    return { x: p.x + Math.sin(a) * 0.36, y: 0.24, z: p.z + Math.cos(a) * 0.36, yaw: a + Math.PI };
  };
  const pulled = () => ({ ...chairAt(x, z, SOUTH), z: chairAt(x, z, SOUTH).z + 0.12 });
  const stand = (at, yaw) => {
    r._walk = null;
    walkPose(r, 0, 0);
    r.root.position.set(at[0], 0, at[1]);
    r.root.rotation.y = yaw;
  };
  function set(s) {
    state = s;
    const evening = shown();
    chairs.day.visible = !evening;
    chairs.closed.visible = evening;
    r.root.visible = evening;
    const stacked = evening && (s === 'stacked' || s === 'closed');
    put(his, s === 'taken' ? pulled() : chairAt(x, z, SOUTH, stacked));
    carrying = evening && (s === 'open' || s === 'taken');
    wiping = evening && s === 'closed';
    if (s === 'open') stand(AT.start, -Math.PI / 2);
    else if (s === 'closed') stand(AT.closing, Math.PI);
    else stand(AT.table, face(AT.table, AT.eric));
    if (!carrying) put(theirs, chairAt(x, z, EAST, stacked));
    hold(game.player, 'reach', s === 'taken');
    // the walk grid: the chairs standing round the tables in the day, none once they are up on the tables; the two
    // loose ones only while they stand on the ground (not in the worker's hands)
    nav.unblock('terrace-chairs');
    const standing = !evening
      ? [chairAt(x, z, SOUTH), chairAt(x, z, EAST)]
      : s === 'open'
        ? [chairAt(x, z, SOUTH)]
        : [];
    for (const b of [...(evening ? [] : chairs.blocks), ...standing.map(chairBlock)])
      nav.blockTagged('terrace-chairs', ...b);
  }

  // a chair lifted, turned over and set upside down on the table (from wherever it is now)
  function turnOver(c, to, dur) {
    const p0 = c.position.clone(),
      yaw0 = c.rotation.y,
      yaw1 = yaw0 + Math.atan2(Math.sin(to.yaw - yaw0), Math.cos(to.yaw - yaw0));
    return game.tween(dur, (k) => {
      const e = ease(k);
      c.position.set(
        p0.x + (to.x - p0.x) * e,
        p0.y + (STACKED_Y - p0.y) * e + Math.sin(Math.PI * k) * 0.35,
        p0.z + (to.z - p0.z) * e,
      );
      c.rotation.set(0, yaw0 + (yaw1 - yaw0) * e, Math.PI * e);
    });
  }
  const walk = (to) => walkPerson(r, route(nav, r.root.position, to), { speed: 1.0 });
  const turnTo = (yaw, dur = 0.35) => {
    const from = r.root.rotation.y,
      to = from + Math.atan2(Math.sin(yaw - from), Math.cos(yaw - from));
    return game.tween(dur, (k) => (r.root.rotation.y = from + (to - from) * ease(k)));
  };

  const hooks = {
    canteenChair: async ({ state: step }) => {
      const eric = game.player;
      if (step === 'take' && state === 'open') {
        game.walker.faceTo(x, z);
        const over = walk(AT.table);
        await game.wait(500);
        hold(eric, 'reach', true); // his hands on the back of the last chair, pulling it out to sit
        const from = chairAt(x, z, SOUTH);
        await game.tween(0.5, (k) => put(his, { ...from, z: from.z + 0.12 * ease(k) }));
        await over;
        await turnTo(face(AT.table, AT.eric)); // they stop, chair in hand, and look at him
        await game.wait(500);
        hold(eric, 'reach', false); // he looks round at the tables with their chairs up, and back at his
        game.walker.faceTo(T.xs[T.shared - 1], z);
        await game.wait(1100);
        game.walker.faceTo(x, z);
        await game.wait(500);
        hold(eric, 'reach', true);
        await game.wait(300);
        set('taken');
      } else if (step === 'stack' && (state === 'open' || state === 'taken')) {
        await lean(game, 0.35, 0.3);
        await turnOver(his, chairAt(x, z, SOUTH, true), 1.1);
        hold(eric, 'reach', false);
        await lean(game, 0, 0.3);
        await turnTo(face(AT.table, [x, z]));
        carrying = false;
        await turnOver(theirs, chairAt(x, z, EAST, true), 1.0);
        walkPose(r, 0, 0);
        await turnTo(face(AT.table, AT.eric));
        set('stacked');
      } else if (step === 'leave' && state !== 'closed') {
        if (state !== 'stacked') set('stacked');
        await walk(AT.closing);
        await turnTo(Math.PI);
        wiping = true;
        set('closed');
      } else if (!['take', 'stack', 'leave'].includes(step)) console.warn('canteenChair: unknown step', step);
    },
  };
  set(flags[HELPED] ? 'closed' : 'open');
  return {
    anchor: (v) => v.set(x, 1.0, z + 0.3),
    spot: () => AT.eric,
    face: () => [x, z],
    obj: his,
    person: r,
    hooks,
    snapshot: () => state,
    restore: (s) => set(s || state),
    sync: () => set(flags[HELPED] ? 'closed' : state),
    update(dt, t) {
      if (!r.root.visible) return;
      stepPeople([r], dt);
      if (!r._walk) idle(r, t);
      if (carrying) {
        armsHold(r, -1.0, 0.35);
        const h = inHands();
        theirs.position.set(h.x, h.y, h.z);
        theirs.rotation.set(0, h.yaw, 0);
      } else if (wiping) {
        // a cloth over the table: the right arm out, going round in small circles
        r.arms[0].rotation.x = -1.05 + Math.sin(t * 3.1) * 0.12;
        r.arms[0].rotation.z = 0.25 + Math.cos(t * 3.1) * 0.12;
      }
    },
  };
}
