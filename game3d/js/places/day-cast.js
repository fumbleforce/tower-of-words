// People a later day puts in a place that day 1 left empty (day 3: story/day3/README.md, "People placement"). A place
// makes their bodies once with dayCast() and registers each explicitly (people.<id>: cast.people.<id>, things.<id>:
// { ...PLACE_DETAILS.<place>.things.<id>, ...cast.thing(id) }); the day's setup hook (places/day3/) then puts each
// where the day's plan has them for the period, or hides them. Tama is a cat (creatures/cat.js); the attendant and the
// club member wear the approved office bodies A and B (crowd/roles.js), or the code-built office workers' (cast.js
// PEOPLE.worker) if those didn't load; everyone else is the cast's own.
// A person the place already has (day 1's guard at his desk, day 2's Mori) comes in through `have`: their body is
// the place's, home(id) puts them back where the place keeps them, and only the place registers them.
//   dayCast(game, { root, K, ids, have }) -> { people, thing(id), adopt, put, seat, home, hide, hideAll, shown, update }
import { PEOPLE, idle } from '../cast.js';
import { roleBody } from '../chibi-crowd.js';
import { smallSkin } from '../chibi-passengers.js';
import { blob } from '../engine.js';
import { makeCat } from '../creatures/cat.js';
import { benchSit, standPose } from '../crowd/motion.js';

// the two without a cast body of their own: the gym's attendant (short dark hair, grey top) and the club member
const BODY = {
  attendant: () => approved('attendant', 5) || PEOPLE.worker(5),
  member: () => approved('member', 1) || PEOPLE.worker(1),
};
// seen small, as the train's passengers: a 1024 copy of the skin on desktop, 512 on a phone
function approved(role, i) {
  const r = roleBody(role, i, { proxy: true });
  if (r) smallSkin(r.model);
  return r;
}
const CAT_SIZE = 1.15 * 0.9; // her size on Eric's chair in the office (places/garden-cat.js), times the place's scale

export function dayCast(game, { root, K = 1, ids = [], have = {} }) {
  const people = {},
    homes = {},
    own = new Set(); // the bodies made here (the others the place steps and shades itself)
  // someone the place already has: where it keeps them is their home
  function adopt(id, r) {
    if (r.selfGait) r.cat = true; // (a cat: creatures/cat.js)
    people[id] = r;
    homes[id] = {
      at: r.root.position.clone(),
      ry: r.root.rotation.y,
      seated: !!r.seated,
      mode: r.cat ? r.mode : null,
    };
  }
  for (const [id, r] of Object.entries(have)) adopt(id, r);
  for (const id of ids) {
    if (people[id]) continue;
    if (id === 'tama') {
      const r = makeCat('calico', { mode: 'sleep' });
      r.cat = true;
      r.root.scale.setScalar(CAT_SIZE * K);
      r.root.visible = false;
      root.add(r.root);
      people[id] = r;
      own.add(r);
      continue;
    }
    const r = (BODY[id] || PEOPLE[id])();
    if (!r.meshy || r.chibi) r.root.scale.multiplyScalar(K); // chibis stand at the body they replace
    r.root.visible = false;
    root.add(r.root);
    r.blob = blob(0.55, 0.38);
    r.blob.visible = false;
    root.add(r.blob);
    people[id] = r;
    own.add(r);
  }
  const syncBlob = (r) => {
    if (!r.blob) return;
    r.blob.visible = r.root.visible;
    r.blob.position.set(r.root.position.x, 0.004, r.root.position.z);
  };
  // where Eric stands to talk to someone: in front of them (beside a seat's knees when they sit)
  const thing = (id) => {
    const r = people[id];
    return {
      anchor: (v) => {
        r.root.getWorldPosition(v);
        v.y += (r.cat ? 0.45 : 1.25) * K;
        return v;
      },
      // in front of them, or beside them where that is no floor (someone reading a board, a cat on a bench)
      spot: () => {
        const p = r.root.position,
          a0 = r.root.rotation.y,
          d = r.cat ? 0.55 : r.seated ? 0.85 : 0.65,
          nav = game.place?.nav;
        let first = null;
        for (const a of [a0, a0 + Math.PI / 2, a0 - Math.PI / 2, a0 + Math.PI]) {
          const q = [p.x + Math.sin(a) * d, p.z + Math.cos(a) * d];
          first ||= q;
          if (!nav || nav.free(q[0], q[1], 0.15)) return q;
        }
        return first;
      },
      face: () => [r.root.position.x, r.root.position.z],
      enabled: () => r.root.visible && !r._walk,
    };
  };
  const yawTo = ([x, z], face) => (face ? Math.atan2(face[0] - x, face[1] - z) : 0);
  const api = {
    people,
    thing,
    adopt,
    // standing at [x, z], facing the point face (or yaw); a cat in pose (sleep, sit, stand)
    put(id, at, face, { yaw, pose = 'sleep' } = {}) {
      const r = people[id];
      if (!r || !at) return;
      r._walk = null;
      if (r.cat) r.set(pose, { now: true });
      else standPose(r);
      r.seated = false;
      r.root.visible = true;
      r.root.position.set(at[0], r.cat && at[2] !== undefined ? at[2] : 0, at[1]);
      r.root.rotation.y = yaw ?? yawTo(at, face);
      syncBlob(r);
    },
    // on a seat ({ x, z, top, ry }): a place's seat, or one made for the day
    seat(id, s) {
      const r = people[id];
      if (!r || !s) return;
      r._walk = null;
      r.root.visible = true;
      benchSit(r, s.x, s.z, s.ry || 0, s.top);
      syncBlob(r);
      if (r.blob) r.blob.position.set(s.x, 0.004, s.z);
    },
    // back where the place keeps them (only someone it already had)
    home(id) {
      const r = people[id],
        h = homes[id];
      if (!r || !h) return;
      r._walk = null;
      if (!h.seated && !r.cat) {
        standPose(r);
        r.seated = false;
      }
      if (h.mode && r.set) r.set(h.mode, { now: true });
      r.root.position.copy(h.at);
      r.root.rotation.y = h.ry;
      r.root.visible = true;
      syncBlob(r);
    },
    hide(id) {
      const r = people[id];
      if (!r) return;
      r._walk = null;
      r.root.visible = false;
      if (r.blob) r.blob.visible = false;
    },
    hideAll() {
      for (const id of Object.keys(people)) api.hide(id);
    },
    shown: (id) => !!people[id]?.root.visible,
    // a frame: the cat's own steps and pose, and the shadows following anyone a scene walks
    update(dt) {
      for (const r of own) {
        if (!r.root.visible) continue;
        if (r.cat) r.update(dt);
        else {
          if (r.blob) syncBlob(r);
          if (!r.meshy && !r._walk && !r.seated) idle(r, game.t || 0); // a code-built body breathes
        }
      }
    },
  };
  return api;
}
