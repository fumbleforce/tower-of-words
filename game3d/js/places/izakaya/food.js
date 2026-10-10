import * as THREE from 'three';
import { dinnerModels, skewer, vegetables } from './food-models.js';
import { diningActions } from './actions.js';
import { diningHands } from './hands.js';
import { TABLE } from '../../scenes/izakaya/plan.js';
import { flags } from '../../narrative/state.js';
export function izakayaFood(game, w, people) {
  const contacts = [],
    actions = diningActions();
  const models = dinnerModels(w.root),
    hands = diningHands(game, w.root);
  const state = {
    opened: false,
    took: null,
    drinks: 0,
    drink: 'water',
    more: 0,
    pickles: false,
    passed: false,
    packed: false,
    left: 0,
    toast: 0,
  };
  const cupHomes = Object.fromEntries(Object.entries(models.cups).map(([id, c]) => [id, c.position.clone()]));
  const portions = {};
  for (const [id, plate] of Object.entries(models.plates)) {
    const a = skewer(),
      b = vegetables();
    a.position.z = -0.04;
    b.position.z = 0.045;
    plate.add(a, b);
    portions[id] = { yakitori: a, vegetables: b };
  }
  const rig = (id) => (id === 'eric' ? game.player : people[id]);
  function drinkColor() {
    models.cups.eric.liquid.traverse((o) => o.material?.color.set(state.drink === 'tea' ? '#60776a' : '#bdced0'));
  }
  function sync() {
    hands.clear();
    drinkColor();
    for (const [id, c] of Object.entries(models.cups)) {
      models.group.add(c);
      c.position.copy(cupHomes[id]);
      c.rotation.set(0, 0, 0);
    }
    for (const [id, items] of Object.entries(portions))
      for (const [food, o] of Object.entries(items)) {
        models.plates[id].add(o);
        o.position.set(0, 0, food === 'yakitori' ? -0.04 : 0.045);
        o.rotation.set(0, 0, 0);
        o.visible = id !== 'eric' || state.took !== food;
      }
    models.group.add(models.pickles);
    models.pickles.position.set(0.58, TABLE.top, -1.66);
    models.platters.yakitori.visible = models.platters.vegetables.visible = true;
    models.boxes.visible = models.lid.visible = true;
    models.lid.position.set(
      state.packed ? -0.1 : -0.3,
      TABLE.top + (state.packed ? 0.07 : 0),
      state.packed ? -2.52 : -2.55,
    );
    portions.mori.yakitori.visible = !state.packed;
    models.platters.vegetables.position.x = state.passed ? 0.16 : -0.08;
  }
  const local = (o) => {
    const p = o.getWorldPosition(new THREE.Vector3());
    return w.root.worldToLocal(p);
  };
  async function lift(job, id, object, { sip = false } = {}) {
    const r = rig(id);
    if (!r?.root.visible) return;
    const s = hands.start(r),
      home = local(object),
      parent = object.parent,
      position = object.position.clone();
    try {
      await job.wait(hands.move(s, home.toArray()));
      contacts.push({
        id,
        gap: hands.distance(s),
        at: home.toArray(),
        hand: s.hand.getWorldPosition(new THREE.Vector3()).toArray(),
        joints: s.chain.map((b) => b.getWorldPosition(new THREE.Vector3()).toArray()),
      });
      // Keep contact: the object's origin is the wrist grip, not a separate interpolated prop path.
      w.root.attach(object);
      s.prop = object;
      const p = r.root.position,
        a = r.root.rotation.y;
      const target = [p.x + Math.sin(a) * 0.3, sip ? 1.04 : 0.92, p.z + Math.cos(a) * 0.3];
      await job.wait(hands.move(s, target, 0.65));
      await job.wait(game.wait(sip ? 500 : 650));
      if (sip) object.rotation.z = 0.32;
      await job.wait(hands.move(s, home.toArray(), 0.65));
      s.prop = null;
    } finally {
      if (job.live()) {
        parent.add(object);
        object.position.copy(position);
        object.rotation.set(0, 0, 0);
      }
      hands.stop(s);
    }
  }
  async function seatPlayer(job) {
    if (game.player.seated) return;
    const s = w.seats.party_seat;
    await job.wait(game.walkTo(...s.out));
    game.player.sitAt(s.x, s.top, s.z, s.ry);
    game.player.seated = true;
    game.player.seatOut = [...s.out];
    game.walker.facing = s.ry;
  }
  async function hook({ state: s, food = 'yakitori', drink = 'water' } = {}) {
    return actions.run(async (job) => {
      if (s === 'open') {
        state.opened = true;
        await job.wait(game.wait(350));
        return;
      }
      if (s === 'toast') {
        await job.wait(
          Promise.all(
            Object.entries(models.cups)
              .filter(([id]) => rig(id)?.root.visible)
              .map(([id, c]) => lift(job, id, c)),
          ),
        );
        state.toast++;
        return;
      }
      if (s === 'drink') {
        await seatPlayer(job);
        state.drink = drink === 'tea' ? 'tea' : 'water';
        drinkColor();
        await job.wait(lift(job, 'eric', models.cups.eric, { sip: true }));
        state.drinks++;
        return;
      }
      if (s === 'take' || s === 'offerMore' || s === 'leftovers') {
        await seatPlayer(job);
        const chosen = food === 'vegetables' ? 'vegetables' : 'yakitori';
        const o = portions.eric[chosen];
        o.visible = true;
        await job.wait(lift(job, 'eric', o, { sip: true }));
        o.visible = false;
        if (s === 'take') state.took = chosen;
        else if (s === 'offerMore') state.more++;
        else state.left++;
        return;
      }
      if (s === 'sharePickles') {
        const o = models.pickles;
        await job.wait(lift(job, 'mio', o));
        state.pickles = true;
        return;
      }
      if (s === 'passVegetables' || s === 'passSandwiches') {
        await seatPlayer(job);
        const dish = models.platters.vegetables;
        dish.position.set(-0.08, TABLE.top, -1.72);
        // Each person slides the same dish by its near rim; it stays supported by the tabletop.
        for (const [id, side, edge, to] of [
          ['eric', 'Right', -0.15, 0.04],
          ['mio', 'Left', 0.15, 0.16],
        ]) {
          const reach = hands.start(rig(id), side),
            from = dish.position.x;
          try {
            await job.wait(hands.move(reach, [from + edge, TABLE.top + 0.04, -1.6]));
            contacts.push({ id, action: 'pass', gap: hands.distance(reach) });
            await job.wait(
              game.tween(0.7, (k) => {
                if (!job.live()) return;
                dish.position.x = from + (to - from) * k;
                reach.target.copy(
                  w.root.localToWorld(new THREE.Vector3(dish.position.x + edge, TABLE.top + 0.04, -1.6)),
                );
              }),
            );
          } finally {
            hands.stop(reach);
          }
        }
        state.passed = true;
        return;
      }
      if (s === 'packLeftovers' && !state.packed) {
        const o = portions.mori.yakitori,
          reach = hands.start(people.mori, 'Left');
        models.boxes.visible = true;
        try {
          await job.wait(hands.move(reach, local(o).toArray()));
          contacts.push({ id: 'mori', action: 'pack', gap: hands.distance(reach) });
          w.root.attach(o);
          reach.prop = o;
          await job.wait(hands.move(reach, [-0.1, TABLE.top + 0.13, -2.52]));
          reach.prop = null;
          models.boxes.attach(o);
          o.visible = false;
          await job.wait(hands.move(reach, local(models.lid).toArray()));
          contacts.push({ id: 'mori', action: 'lid', gap: hands.distance(reach) });
          reach.prop = models.lid;
          await job.wait(hands.move(reach, [-0.1, TABLE.top + 0.16, -2.52], 0.4));
          await job.wait(hands.move(reach, [-0.1, TABLE.top + 0.07, -2.52], 0.4));
          reach.prop = null;
        } finally {
          hands.stop(reach);
        }
        state.packed = true;
        sync();
      }
    });
  }
  return {
    state,
    contacts,
    models,
    hook,
    update: hands.update,
    clear() {
      actions.cancel();
      sync();
    },
    sync,
    fromFlags() {
      state.opened ||= !!flags.d2_ate;
      if (flags.d2_ate && !state.took) state.took = flags.d2_food === 'vegetables' ? 'vegetables' : 'yakitori';
      sync();
    },
    restore(s) {
      if (s) Object.assign(state, s);
      sync();
    },
  };
}
