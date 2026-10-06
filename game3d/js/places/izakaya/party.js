import { dayCast } from '../day-cast.js';
import { walkRig } from '../../move.js';
import { walkPerson, stepPeople, lookAt } from '../../story.js';
import { standPose } from '../../crowd/motion.js';
import { flags } from '../../narrative/state.js';
import { sim } from '../../sim.js';
import { route } from '../route.js';
import { snapshotPeople, restorePeople } from '../saved-people.js';
import { izakayaFood } from './food.js';
import { diningActions } from './actions.js';
import { dinnerLooks } from './looks.js';
export function izakayaParty(game, w, K) {
  const cast = dayCast(game, { root: w.root, K, ids: ['mori', 'kenji', 'emi'], have: { mio: game.mioNpc } }),
    people = cast.people;
  const food = izakayaFood(game, w, people),
    looks = dinnerLooks(game, people);
  const actions = diningActions(),
    walks = new Map();
  let P,
    packed = false;
  const seat = (id) => w.seats['party_' + id];
  function arrange() {
    if (sim.day !== 2 || !flags.d2_shift_done) {
      cast.hideAll();
      food.models.group.visible = false;
      return;
    }
    food.models.group.visible = true;
    packed = !!flags.d2_party_done;
    for (const id of Object.keys(people)) {
      if (packed && ['mio', 'kenji'].includes(id)) cast.hide(id);
      else cast.seat(id, seat(id));
    }
    food.fromFlags();
  }
  async function walk(id, to) {
    return actions.run(async (job) => {
      const r = people[id];
      if (!r) return;
      if (r.seated) {
        const s = seat(id);
        standPose(r);
        r.seated = false;
        r.setState?.('idle');
        r.root.position.set(s.out[0], 0, s.out[1]);
      }
      if (!w.nav.path(r.root.position.x, r.root.position.z, ...to)) throw new Error('Izakaya route is blocked: ' + id);
      const pending = r.meshy
        ? walkRig(game, r, to, { speed: 1.2 })
        : walkPerson(r, route(w.nav, r.root.position, to), { speed: 1.2, blobM: r.blob });
      const owned = { token: r.root.userData.walkTok, step: r._walk };
      walks.set(r, owned);
      try {
        await job.wait(pending);
      } finally {
        if (walks.get(r) === owned) walks.delete(r);
      }
    });
  }
  async function setup({ state } = {}) {
    return actions.run(async (job) => {
      if (state === 'gather') {
        for (const id of Object.keys(people)) if (!people[id].root.visible) cast.seat(id, seat(id));
        return;
      }
      if (state === 'pack') {
        for (const id of ['mio', 'kenji']) {
          if (!people[id].root.visible) continue;
          await job.wait(walk(id, w.door.in));
          cast.hide(id);
        }
        packed = true;
        return;
      }
      arrange();
    });
  }
  return {
    cast,
    people,
    food,
    thing(id) {
      const item = cast.thing(id),
        r = people[id];
      let head;
      r.root.traverse((o) => {
        if (o.isBone && /^(mixamorig)?Head$/.test(o.name)) head = o;
      });
      return {
        ...item,
        anchor(v) {
          if (!head) return item.anchor(v);
          head.getWorldPosition(v);
          v.y += 0.24;
          return v;
        },
      };
    },
    setup,
    install(place) {
      P = place;
      P.walkPerson = walk;
      P.sitPerson = (id, key) =>
        actions.run(async (job) => {
          const s = w.seats[key];
          await job.wait(walk(id, s.out));
          cast.seat(id, s);
        });
    },
    update(dt, t) {
      cast.update(dt);
      stepPeople(Object.values(people), dt);
      for (const r of Object.values(people)) {
        if (r.root.visible && r.lookTarget && !r.meshy) lookAt(r, ...r.lookTarget, 1);
      }
      food.update();
      looks.update(dt);
    },
    clear() {
      for (const [r, owned] of walks) {
        if (r.meshy && r.root.userData.walkTok === owned.token) r.root.userData.walkTok++;
        if (r._walk === owned.step) {
          r._walk = null;
          r._noAvoid = false;
          r.setGait?.(0);
        }
      }
      walks.clear();
      actions.cancel();
      food.clear();
      looks.clear();
    },
    snapshot: () => ({ people: snapshotPeople(people), food: { ...food.state }, packed }),
    restore(data) {
      if (!data) return;
      packed = !!data.packed;
      restorePeople(people, data.people);
      for (const [id, r] of Object.entries(people)) if (r.seated && r.root.visible) cast.seat(id, seat(id));
      food.restore(data.food);
    },
  };
}
