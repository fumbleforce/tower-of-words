// The monorail car on day 2 (story/day2/train.js): standing at the platform between runs, empty, doors open. Eric
// comes in along the platform from the walkway; a portable door tester stands on the platform by the left-hand doors.
// One use of it runs the check in one go: the doors shut, the light blinks while the sensor is tried, the doors open
// again and the light goes green. Mio waits there only on the promised branch. train.js spreads thing(id) into its
// own registries and calls install(P) once its place is made, so it keeps day 1.
import * as THREE from 'three';
import { sim } from '../sim.js';
import { sfx, hum } from '../sfx.js';
import { glide, walkRig } from '../move.js';
import { rbox, mat, emissive, textTexture, plane } from '../props.js';
import { stationSignoff } from './day3/signoff.js';

// ctx: what the day-1 place keeps to itself: { st, station, setDoors, car, cam, nav, people, kitty, kb, bagObjs,
// props: [cup, folder, laptop, foodBag], LZ, DOOR_X, WALK_X, d3: day 3's part (places/day3/place.js, the guard) }
export function trainDay2(game, ctx) {
  let P = null;
  const { st, station, setDoors, car, cam, nav, people, kitty, kb, bagObjs, props, LZ, DOOR_X, WALK_X, d3 } = ctx;
  const later = () => sim.day > 1;
  // the tester: a grey case on legs on the platform, a lamp on top and a small screen facing the platform
  const TX = -DOOR_X - 0.85,
    TZ = LZ + 0.45;
  const tester = new THREE.Group();
  tester.position.set(TX, 0, TZ);
  tester.add(
    rbox(0.04, 0.62, 0.04, '#5b6170', { x: -0.14, r: 0.01 }),
    rbox(0.04, 0.62, 0.04, '#5b6170', { x: 0.14, r: 0.01 }),
  );
  tester.add(rbox(0.42, 0.3, 0.22, '#9aa1ab', { y: 0.6, r: 0.03 }));
  tester.add(rbox(0.12, 0.05, 0.05, '#3b414c', { y: 0.9, x: -0.12, r: 0.01 })); // the handle's foot
  const lampM = {
    idle: mat('#4a3a2a'),
    test: emissive('#ffb23f', '#ffb23f', 1.8),
    ok: emissive('#5fe08c', '#5fe08c', 1.8),
  };
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), lampM.idle);
  lamp.position.set(0.1, 0.95, 0);
  tester.add(lamp);
  const screens = Object.fromEntries(
    Object.entries({ idle: ['--', '#7f8a96'], test: ['...', '#ffd27a'], ok: ['OK', '#7ff0a6'] }).map(([k, [t, c]]) => {
      const tex = textTexture(
        (g, w, h) => {
          g.fillStyle = '#1b222b';
          g.fillRect(0, 0, w, h);
          g.fillStyle = c;
          g.font = `bold ${h * 0.6}px sans-serif`;
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText(t, w / 2, h / 2 + 4);
        },
        128,
        64,
      );
      return [k, tex];
    }),
  );
  const screen = plane(0.2, 0.1, screens.idle, { emissiveK: 0.9 });
  screen.position.set(-0.04, 0.75, 0.112);
  tester.add(screen);
  tester.visible = false;
  car.add(tester);
  let testState = 'idle',
    motor = null;
  function setTest(state) {
    testState = state;
    lamp.material = lampM[state];
    screen.material.map = screens[state];
    screen.material.emissiveMap = screens[state];
    screen.material.needsUpdate = true;
  }

  // the car stopped at the platform, empty, its doors open; idempotent (every visit and Continue runs it)
  function standing() {
    station.visible = true;
    Object.assign(st, { mode: 'stopped', v: 0, arrived: true, chimeT: -1, hold: false, frozen: false, slide: null });
    st.stopX = st.dist;
    station.position.x = 0;
    if (!st.slide) {
      st.door = st.doorWant = 1;
      setDoors(1);
      nav.unblock('doors');
    }
    for (const [id, r] of Object.entries(people)) {
      if (!r?.root || id === 'mio') continue; // (the place's people include the shared Mio once entered)
      r.root.visible = false;
      if (r.blob) r.blob.visible = false;
    }
    kitty.visible = kb.visible = false;
    for (const b of bagObjs) b.visible = b.userData.blob.visible = false;
    for (const o of props) o.visible = false;
    tester.visible = true;
    if (!nav.rects.some((r) => r.tag === 'tester'))
      nav.blockTagged('tester', TX - 0.26, TX + 0.26, TZ - 0.16, TZ + 0.16);
    const m = game.mioNpc;
    if (m.seated) {
      m.seated = false;
      m.setState('idle');
      m.root.position.y = 0;
      m.root.visible = false;
    }
  }
  const MIO_AT = [-DOOR_X + 0.15, LZ + 1.05];
  const ERIC_AT = [TX - 0.55, TZ + 0.4]; // beside it, so he never hides it from the camera
  const things = {
    door_test: {
      spot: () => ERIC_AT,
      face: () => [TX, TZ],
      enabled: later,
    },
    station_exit: {
      spot: () => [WALK_X + 1.7, LZ + 1.5],
      face: () => [WALK_X, LZ + 1.9],
      enabled: later,
    },
  };
  const zones = { platform_exit: (x, z) => later() && x < WALK_X + 1.3 && z > LZ + 0.6 };
  let doorsOpen, doorsHold;
  const hooks = {
    // { companion }: Mio there too (the promised branch), walking up the platform if she isn't by the doors yet
    // state 'depart': she walks off along the platform to the walkway (to B2), the scene going on, and only then is gone
    async stationSetup({ companion = false, state } = {}) {
      standing();
      const m = game.mioNpc;
      if (state === 'depart') {
        if (!m.root.visible) return;
        const here = game.place;
        void (async () => {
          await walkRig(game, m, [WALK_X + 1.2, LZ + 1.7], { speed: 1.4 });
          await walkRig(game, m, [WALK_X, LZ + 1.95], { speed: 1.4, route: false });
          if (game.place === here) m.root.visible = false;
        })();
        return;
      }
      if (!companion) {
        m.root.visible = false;
        return;
      }
      if (m.root.visible && Math.hypot(m.root.position.x - MIO_AT[0], m.root.position.z - MIO_AT[1]) < 0.3) return;
      m.root.visible = true;
      m.root.position.set(1.6, 0, LZ + 1.4);
      await walkRig(game, m, MIO_AT, { speed: 1.3 });
      m.setState('idle');
      m.root.rotation.y = -Math.PI / 2;
    },
    // the check, in one go: doors shut, the sensor tried (amber), doors open, green
    async doorTest() {
      standing();
      // on the tester and the doors beside it, a little up the screen, clear of the line and its portrait
      const d = cam.dir,
        k = 0.9 / Math.hypot(d.x, d.z);
      cam.closeOn([TX + 0.45 + d.x * k, TZ - 0.25 + d.z * k], 1.9);
      game.walker.faceTo?.(TX, TZ);
      sfx('tap');
      setTest('test');
      P.hooks.doorsClose({});
      await game.wait(1300);
      for (let i = 0; i < 3; i++) {
        sfx('beep');
        lamp.material = lampM.idle;
        await game.wait(220);
        lamp.material = lampM.test;
        await game.wait(220);
      }
      P.hooks.doorsOpen();
      await game.wait(900);
      setTest('ok');
      sfx('ok');
      await game.wait(600);
      cam.release();
    },
  };
  // day 3: the guard witnesses the last check and signs the report off (places/day3/signoff.js)
  const signoff = stationSignoff(game, {
    cast: d3.cast,
    tester,
    doorTest: () => hooks.doorTest(),
    closeDoors(now) {
      if (!now) return P.hooks.doorsClose({});
      st.slide = null;
      st.door = st.doorWant = 0;
      setDoors(0);
    },
    TX,
    TZ,
    WALK_X,
    LZ,
  });
  hooks.stationSignoff = signoff.hook;
  d3.also(() => signoff.arrange());
  // once the place is made: the held doors' motor hums until they're let go (the voice experiment), the walk in from
  // the walkway, and the tester's light kept in the save
  function install(place) {
    P = place;
    P.day3 = (o) => d3.setup(P, o);
    doorsOpen = P.hooks.doorsOpen;
    doorsHold = P.hooks.doorsHold;
    P.hooks.doorsHold = async (a = {}) => {
      const r = doorsHold(a);
      if (later() && a.kotodama && !motor) motor = hum();
      return r;
    };
    P.hooks.doorsOpen = () => {
      motor?.stop();
      motor = null;
      return doorsOpen();
    };
    tripIn();
    keep();
  }
  // in from the walkway along the platform, the camera close on him, to a step short of the doors
  const tripIn = () =>
    (P.tripInFrom = {
      ...P.tripInFrom,
      async gate(g) {
        standing();
        const eric = g.player;
        eric.scripted = true;
        eric.root.position.set(WALK_X, 0, LZ + 1.9);
        eric.root.rotation.y = Math.PI / 2;
        cam.closeOn([WALK_X + 1.5, LZ + 1.5], 1.35);
        cam.snap(eric.root.position);
        eric.setState('walk');
        await glide(g, eric.root, [WALK_X + 1.6, LZ + 1.5], 1.3);
        cam.release();
        await glide(g, eric.root, [-DOOR_X - 1.9, LZ + 1.15], 1.3);
        eric.setState('idle');
        eric.scripted = false;
        g.walker.sync();
      },
    });
  function keep() {
    const snap = P.snapshotState,
      restore = P.restoreState;
    P.snapshotState = () => ({ ...snap(), test: testState });
    P.restoreState = (saved) => {
      restore(saved);
      if (later()) {
        standing();
        setTest(saved.world?.test || 'idle');
      }
    };
  }
  return { thing: (id) => things[id], zones, hooks, install };
}
