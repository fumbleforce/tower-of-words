// The gate's commuters: three office workers who walk in, tap a reader, pass the arch and leave by the door at the
// back (the station's outdoor exit, where the lift used to be). A small crowd, so the story's people stand out.
import { PEOPLE, HIP } from '../cast.js';
import { blob } from '../engine.js';
import { rbox } from '../props.js';
import { queueStep, turnToward } from '../move.js';
import { K } from '../scenes/office.js';
import { stepGait, stopGait } from '../movement/gait.js';

// w: the built room; st: the gate's state (rush, gateOpen, jam, leaving); readerFlash and openFor: the gate's readers
export function lobbyCommuters(game, w, st, { readerFlash, openFor }) {
  const { BZ, Z } = w;
  const commuters = [];
  [0, 2, 5].forEach((k, i) => {
    const r = PEOPLE.worker(k);
    r.root.scale.multiplyScalar(K);
    if (i === 2) {
      const box = rbox(0.2, 0.12, 0.2, '#f4efe6', { y: -0.3, z: 0.05, r: 0.01 });
      box.add(rbox(0.21, 0.02, 0.05, '#d9534f', { y: 0.11, r: 0.004 }));
      r.arms[1].add(box);
    }
    w.root.add(r.root);
    r.root.visible = false;
    const b = blob(0.5, 0.35);
    w.root.add(b);
    b.visible = false;
    commuters.push({ r, b, t: 1 - i * 3.5, side: i % 2 ? 1 : -1, stage: 'wait', qi: i });
  });
  function stepCommuter(c, dt) {
    const r = c.r,
      p = r.root.position;
    c.t += dt;
    if (c.stage === 'wait') {
      if (c.t > 0 && st.rush && !game.busyTrip && !st.leaving) {
        c.stage = 'in';
        r.root.visible = true;
        c.b.visible = true;
        p.set(c.side * (0.6 + Math.random() * 0.25), 0, Z + 1.6);
        c.path = [
          [c.side * (0.62 + Math.random() * 0.22), Z - 0.9],
          [c.side * 0.93, BZ + 0.55],
        ];
      } // in through the open doorway (|x| < 1.1), never the glass
      return;
    }
    const moveTo = (tx, tz, sp = 1.25) => {
      const ox = p.x,
        oz = p.z;
      const k = queueStep(game, r, tx, tz, sp, dt);
      if (k !== 1) return k === 0 || !!stepGait(r, 0, dt); // waiting in the queue: stands (after a moment)
      // a smooth turn, and none in the last few centimetres, where a nudge from a neighbour flipped the heading
      // back and forth every step (the fast test's spin check caught commuters spinning at the gate)
      if (Math.hypot(tx - p.x, tz - p.z) > 0.15)
        r.root.rotation.y = turnToward(r.root.rotation.y, Math.atan2(tx - p.x, tz - p.z), dt);
      stepGait(r, Math.hypot(p.x - ox, p.z - oz), dt);
      c.b.position.set(p.x, 0.004, p.z);
      return false;
    };
    if (c.stage === 'in') {
      if (!st.gateOpen && c.path.length === 1) {
        c.stage = 'toqueue';
        c.path = [[-1.9 - c.qi * 0.55, BZ + 1.15 + (c.qi % 2) * 0.35]];
      } else if (moveTo(...c.path[0])) {
        c.path.shift();
        if (!c.path.length) {
          c.stage = 'tap';
          c.t = 0;
          stopGait(r);
          r.hips.position.y = HIP;
          r.arms[0].rotation.x = -1.2;
        }
      }
      return;
    }
    if (c.stage === 'toqueue') {
      if (moveTo(...c.path[0], 1.1)) {
        c.stage = 'queue';
        c.t = 0;
        stopGait(r);
        r.hips.position.y = HIP;
        r.root.rotation.y = Math.PI * 0.9;
      }
      return;
    }
    if (c.stage === 'queue') {
      // waiting: a phone out, a glance at the gate now and then, a sigh (shoulders drop)
      r.arms[1].rotation.x = -1.25;
      r.head.rotation.x = 0.35 - Math.max(0, Math.sin(c.t * 0.7 + c.qi)) * 0.35;
      r.head.rotation.y = Math.sin(c.t * 0.4 + c.qi) * 0.4;
      r.torso.position.y = 0.02 - Math.max(0, Math.sin(c.t * 0.9 + c.qi * 2) - 0.96) * 0.3;
      if (st.gateOpen) {
        r.arms[1].rotation.x = 0;
        r.head.rotation.set(0, 0, 0);
        r.torso.position.y = 0.02;
        c.stage = 'in';
        c.path = [[c.side * 0.93, BZ + 0.55]];
      }
      return;
    }
    if (c.stage === 'tap') {
      if (st.jam) {
        if (c.t > 1.5) {
          r.arms[0].rotation.x = 0;
          c.stage = 'back';
        }
        return;
      }
      if (c.t > 0.4 && c.t - dt <= 0.4) {
        readerFlash(c.side > 0 ? 1 : 0, 'green', true);
        openFor(1.6);
      }
      if (c.t > 0.7) {
        r.arms[0].rotation.x = 0;
        c.stage = 'through';
        c.path = [
          [c.side * 0.2, BZ + 0.2],
          [c.side * 0.1, BZ - 0.8],
          [-1.0, -Z + 0.55],
        ];
      }
      return;
    }
    if (c.stage === 'back') {
      if (moveTo(c.side * 1.6, BZ + 1.2)) {
        c.stage = 'tapwait';
        c.t = 0;
        stopGait(r);
      }
      return;
    }
    if (c.stage === 'tapwait') {
      if (!st.jam) {
        c.stage = 'in';
        c.path = [[c.side * 0.93, BZ + 0.5]];
      }
      return;
    }
    if (c.stage === 'through') {
      // Eric is on his way out through the same door: whoever isn't nearly there lets him go first
      if (st.leaving && !c.letGo) {
        r._walk = false;
        stopGait(r);
        return;
      }
      if (c.path.length === 1) w.lifts[0].want = 1;
      if (moveTo(...c.path[0])) {
        c.path.shift();
        if (!c.path.length) {
          c.stage = 'enter';
          c.t = 0;
        }
      }
      return;
    }
    if (c.stage === 'enter') {
      if (moveTo(-1.0, -Z - 0.65, 1.0)) {
        r.root.visible = false;
        c.b.visible = false;
        w.lifts[0].want = 0;
        c.stage = 'wait';
        c.letGo = false;
        c.t = -4 - Math.random() * 5;
      }
    }
  }

  // Eric leaves by their door (the gate's tripOut): from here on nobody new comes in, anyone still on the way holds
  // back (stepCommuter), and he waits for whoever is nearly at the door to go through before he follows.
  async function clearDoor(g) {
    st.leaving = true;
    for (const c of commuters)
      c.letGo =
        c.stage === 'enter' ||
        (c.stage === 'through' &&
          c.path.length === 1 &&
          Math.hypot(c.path[0][0] - c.r.root.position.x, c.path[0][1] - c.r.root.position.z) < 1.0);
    for (let i = 0; i < 60 && commuters.some((c) => c.letGo && c.stage !== 'wait'); i++) await g.wait(100);
  }
  return { list: commuters, step: (dt) => commuters.forEach((c) => stepCommuter(c, dt)), clearDoor };
}
