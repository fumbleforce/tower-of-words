// Day 2's party food on the shop street's promenade (shotengai-party.js stages the people): the canteen's takeaway
// on a navy tray on the bench between Eric's and Mori's seats, wrapped until it's opened; Mio's jar of pickles at
// her feet, the bag of drinks and the takeaway boxes at Mori's. What Eric is given is laid by his seat, each change
// with a close look from over the sea rail. After the goodbye the tray goes to the back alley with Mori, who packs the
// rest into the boxes or hands Eric one more rice ball. The state is plain data, so the save keeps it.
import * as THREE from 'three';
import { rbox, mat, sh } from '../props.js';
import { flags } from '../narrative/state.js';
import { sfx } from '../ui.js';

export const TOP = 0.34; // the bench's slats (scenes/outdoor/furniture.js; crowd/still.js)
// the bench pair at the foot of the east walk, in the chunk's frame: island (66, FURNITURE_Z - 0.1) turned by the
// chunk (local x = -(island z - 20.15), local z = island x - 64.5); the sea is toward -x
export const BENCH = [-11.3, 1.5],
  SEA_X = BENCH[0] - 0.3, // the sea-facing bench's seat line
  FACE = -Math.PI / 2; // looking out to sea

export function partyFoodSet(game, { w, seats, spots, ALLEY, getP }) {
  // ---- the food: a tray on the bench between them, Mio's jar, a bag of drinks at Mori's feet ----
  const food = new THREE.Group();
  w.root.add(food);
  const onigiri = () => {
    const g = new THREE.Group();
    const rice = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.045, 3), mat('#f3f1ea')));
    rice.rotation.x = Math.PI / 2;
    rice.position.y = 0.05;
    const nori = sh(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), mat('#1f2a24')));
    nori.position.y = 0.03;
    g.add(rice, nori);
    return g;
  };
  const sandwich = () => {
    const g = new THREE.Group();
    const bread = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.04, 3), mat('#efe3c4')));
    bread.rotation.x = Math.PI / 2;
    bread.position.y = 0.05;
    const egg = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.044, 3), mat('#f2d264')));
    egg.rotation.x = Math.PI / 2;
    egg.position.y = 0.05;
    g.add(bread, egg);
    return g;
  };
  const tray = new THREE.Group();
  tray.add(rbox(0.36, 0.025, 0.24, '#2f3a55', { r: 0.008 }));
  const cloth = rbox(0.3, 0.05, 0.2, '#b8573f', { r: 0.03 }); // the wrapped bundle, before it's opened
  const items = { riceball: [], sandwich: [] };
  for (let i = 0; i < 3; i++) {
    const a = onigiri(),
      b = sandwich();
    a.position.set(-0.11 + i * 0.11, 0.025, -0.05);
    b.position.set(-0.11 + i * 0.11, 0.025, 0.06);
    a.rotation.y = b.rotation.y = 0.3 * i;
    tray.add(a, b);
    items.riceball.push(a);
    items.sandwich.push(b);
  }
  tray.add(cloth);
  tray.position.set(SEA_X, TOP, BENCH[1]);
  tray.rotation.y = FACE;
  const jar = new THREE.Group();
  jar.add(sh(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 14), mat('#a7c38a', { roughness: 0.3 }))));
  jar.children[0].position.y = 0.06;
  const lid = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.025, 14), mat('#c9473f')));
  lid.position.y = 0.13;
  jar.add(lid);
  const bag = rbox(0.22, 0.24, 0.12, '#e6e2d6', { r: 0.02 }); // the convenience bag of drinks
  const can = () => sh(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.11, 12), mat('#3a8f8a')));
  // the canteen's takeaway boxes, stacked by the bag; in the alley after the party Mori packs the rest into them
  const boxes = new THREE.Group();
  for (let i = 0; i < 2; i++) {
    const b = rbox(0.26, 0.07, 0.18, '#c8b08a', { y: i * 0.075, r: 0.01 });
    b.add(rbox(0.27, 0.012, 0.19, '#a98f68', { y: 0.06, r: 0.004, cast: false }));
    boxes.add(b);
  }
  const plate = new THREE.Group(); // the sandwiches passed along to Mio, in her hands
  food.add(tray, jar, bag, boxes, plate);
  const LAP = [SEA_X - 0.2, seats.party_seat.z]; // in front of Eric, at his knees
  const held = new THREE.Group(); // what Eric has been given, by his seat
  food.add(held);
  let looking = false; // the food's close look: the camera steeper (install's update)
  const state = {
    opened: false,
    took: null,
    drinks: 0,
    more: 0,
    pickles: false,
    passed: false,
    packed: false,
    left: 0,
  };
  const leftover = onigiri(); // the one Mori hands Eric in the alley
  leftover.visible = false;
  food.add(leftover);

  function placeFood(where) {
    food.visible = where !== 'none';
    if (where === 'alley') {
      const [ax, az] = ALLEY;
      tray.position.set(ax + 0.35, 0.02, az);
      boxes.position.set(ax + 0.4, 0.02, az - 0.35);
      tray.visible = !state.packed;
      jar.visible = bag.visible = held.visible = plate.visible = false;
      return;
    }
    tray.position.set(SEA_X, TOP, BENCH[1]);
    boxes.position.set(SEA_X + 0.45, 0, seats.party_mori.z - 0.6);
    tray.visible = jar.visible = bag.visible = held.visible = plate.visible = true;
    jar.position.set(SEA_X + 0.55, 0, spots.party_mio[1] - 0.25); // at Mio's feet
    bag.position.set(SEA_X + 0.45, 0, seats.party_mori.z - 0.25);
  }
  function syncFood() {
    cloth.visible = !state.opened;
    for (const k of Object.keys(items)) for (const it of items[k]) it.visible = state.opened;
    held.clear();
    let n = 0;
    const lay = (o) => {
      o.position.set(LAP[0], TOP + 0.005, LAP[1] + 0.22 - n * 0.12);
      n++;
      held.add(o);
    };
    if (state.took) {
      items[state.took][0].visible = false;
      lay(state.took === 'riceball' ? onigiri() : sandwich());
    }
    for (let i = 1; i <= state.more && i < 3; i++) {
      const kind = state.took === 'sandwich' ? 'riceball' : 'sandwich';
      items[kind][i - 1].visible = false;
      lay(kind === 'riceball' ? onigiri() : sandwich());
    }
    for (let i = 0; i < Math.min(2, state.drinks); i++) {
      const c = can();
      c.position.y = 0.055;
      const g = new THREE.Group();
      g.add(c);
      lay(g);
    }
    lid.position.y = state.pickles ? 0.02 : 0.13;
    lid.position.x = state.pickles ? 0.09 : 0;
    // the sandwiches still on the tray, passed to Mio: on a plate in her hands
    plate.clear();
    if (state.passed) {
      const mio = game.mioNpc.root.position;
      plate.position.set(mio.x - 0.25, 0.78, mio.z);
      items.sandwich.forEach((it, i) => {
        if (!it.visible) return;
        it.visible = false;
        const b = sandwich();
        b.position.set(-0.05 + (i % 2) * 0.1, 0, i > 1 ? 0.06 : -0.04);
        plate.add(b);
      });
    }
    if (state.packed) for (const k of Object.keys(items)) for (const it of items[k]) it.visible = false;
  }

  // in the alley after the party: Mori settles the rice balls left into the boxes (packLeftovers), or hands Eric one
  // of them to eat there (leftovers)
  async function alleyFood(s) {
    const [ax, az] = ALLEY;
    if (s === 'packLeftovers' && !state.packed) {
      await game.tween(0.8, (k) => (tray.position.y = 0.02 + Math.sin(k * Math.PI) * 0.3));
      state.packed = true;
      tray.visible = false;
      sfx('tap');
      return;
    }
    if (s === 'leftovers' && state.left < 2) {
      state.left++;
      const e = game.player.root.position,
        a = game.player.root.rotation.y;
      const to = [e.x + Math.sin(a) * 0.3, 0.8, e.z + Math.cos(a) * 0.3];
      leftover.visible = true;
      await game.tween(0.7, (k) =>
        leftover.position.set(
          ax + 0.4 + (to[0] - ax - 0.4) * k,
          0.2 + (to[1] - 0.2) * k,
          az - 0.35 + (to[2] - az + 0.35) * k,
        ),
      );
      sfx('tap');
      await game.wait(1200);
      leftover.visible = false; // eaten
    }
  }

  return {
    state,
    place: placeFood,
    sync: syncFood,
    looking: () => looking,
    // after the meal, from the story's flags (a Continue, a trip back)
    fromFlags() {
      state.opened = !!flags.d2_ate || state.opened;
      if (flags.d2_ate && !state.took) state.took = flags.d2_food === 'sandwich' ? 'sandwich' : 'riceball';
    },
    // Kenji collects the boxes and the bag at the goodbye
    gather() {
      boxes.visible = bag.visible = false;
    },
    async hook({ state: s, food: f } = {}) {
      const P = getP();
      if (s === 'open') state.opened = true;
      if (s === 'take') state.took = f === 'sandwich' ? 'sandwich' : 'riceball';
      if (s === 'sharePickles') state.pickles = true;
      if (s === 'drink') state.drinks++;
      if (s === 'offerMore' && state.more < 2) state.more++;
      if (s === 'passSandwiches') state.passed = true;
      if (s === 'packLeftovers' || s === 'leftovers') return alleyFood(s);
      sfx('tap');
      syncFood();
      // a close look at the food on the bench, from higher up over the sea rail, then back to the shot it was in
      const cam = P.cam,
        before = cam.close;
      const at =
        s === 'sharePickles'
          ? [jar.position.x, jar.position.z]
          : s === 'passSandwiches'
            ? [plate.position.x, plate.position.z]
            : [SEA_X, BENCH[1] + 0.25];
      cam.closeOn([at[0] + 0.25, at[1]], 3.6, TOP);
      looking = true;
      await game.wait(1400);
      looking = false;
      if (before) cam.close = before;
      else cam.release();
      await game.wait(800); // back in the group's shot before the next line
    },
  };
}
