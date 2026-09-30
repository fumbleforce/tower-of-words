import * as THREE from 'three';
import { buildDorms } from '../scenes/dorms.js';
import { stairY } from '../scenes/dorms/stairs.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { glide } from '../move.js';
import { sfx } from '../ui.js';
import { PLACE_DETAILS } from './catalog.js';
import { snapshotPeople, restorePeople } from './saved-people.js';

// Eric's floor and his room. The trip in from the dorm courtyard (dorm-court.js) brings him up the last flight onto
// the 2F landing; he walks the corridor to his door himself, and going in (the enterRoom hook, from the story) drops
// his front wall, opens the door and takes him over the genkan into the room, the view widening to the whole flat.
// It also loads directly with ?place=dorms, on the landing.
export function dormsPlace(game) {
  const w = buildDorms();
  const cam = new RoomCam(w.camera);
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const b = w.bounds;
  // inside: he's in the flat (the room's view, its things); entering: the walk in is playing
  const st = { inside: false, entering: false };
  const inRoom = () => st.inside;
  const spots = {
    landing: w.landing,
    door_203: w.atDoor,
    room_entry: w.roomEntry,
    window_front: w.windowFront,
  };
  const things = {
    door_203: {
      ...PLACE_DETAILS.dorms.things.door_203,
      anchor: (v) => v.set((w.doorstep[0] + w.atDoor[0]) / 2 - 0.1, 1.55, b.near + 0.12),
      spot: () => w.atDoor,
      face: () => [w.doorstep[0], b.near],
      enabled: () => !st.inside && !st.entering,
    },
    window: {
      ...PLACE_DETAILS.dorms.things.window,
      anchor: (v) => v.set(w.window[0], w.windowY, w.window[1]),
      spot: () => w.windowFront,
      face: () => w.window,
      outline: () => w.obj.window,
      enabled: inRoom,
    },
    boxes: {
      ...PLACE_DETAILS.dorms.things.boxes,
      anchor: (v) => v.set(w.boxes.x, 0.5, w.boxes.z),
      spot: () => w.boxes.spot,
      face: () => [w.boxes.x, w.boxes.z],
      outline: () => w.obj.boxes,
      enabled: inRoom,
    },
    bed: {
      ...PLACE_DETAILS.dorms.things.bed,
      anchor: (v) => v.set(w.bed.x, 0.5, w.bed.z),
      spot: () => w.bed.spot,
      face: () => [w.bed.x, w.bed.z],
      outline: () => w.obj.bed,
      enabled: inRoom,
    },
  };

  // the corridor's view: over the court, down onto the corridor, the flats behind it and the stairs; on a desktop
  // the whole way from the landing to his door in one frame, on a phone following him along it
  function corridorFit(aspect) {
    const [c0, c1] = b.corr;
    if (aspect >= 1)
      cam.fit(
        aspect,
        [
          new THREE.Vector3(-1.4, 0, c1),
          new THREE.Vector3(b.east + 0.2, 0, c1),
          new THREE.Vector3(3.3, b.h, b.back - 0.1),
          new THREE.Vector3(3.3, -0.5, b.stairs.half[0]),
        ],
        new THREE.Vector3(3.3, 0, (c0 + c1) / 2 - 0.4),
        { follow: true, clamp: [3.0, 3.6, 1.2, 1.6], limY: 0.92 },
      );
    else
      cam.fit(
        aspect,
        [
          new THREE.Vector3(-1.5, 0, c1),
          new THREE.Vector3(1.5, 0, c1),
          new THREE.Vector3(0, b.h, b.back + 0.6),
          new THREE.Vector3(0, 0, b.stairs.half[1]),
        ],
        new THREE.Vector3(0, 0, (c0 + c1) / 2 - 0.3),
        { follow: true, clamp: [-0.2, b.east - 1.2, 0.8, 1.4], lead: -0.6 },
      );
  }
  // the room's view: the whole flat in one still frame, window wall to front door
  function roomFit(aspect) {
    cam.fit(
      aspect,
      [
        new THREE.Vector3(b.x0, 0, b.near),
        new THREE.Vector3(b.x1, 0, b.near),
        new THREE.Vector3(b.x0, b.h, b.back),
        new THREE.Vector3(b.x1, b.h, b.back),
      ],
      new THREE.Vector3(0, 0.3, (b.back + b.near) / 2 - 0.25), // a little room above for the wall outside
      { limX: aspect >= 1 ? 0.9 : 0.96, limY: 0.9 },
    );
  }
  // a new framing eased into from the current one (fit() places the camera at once)
  function refit() {
    const t = cam.target.clone(),
      d = cam.dist;
    P.fit(cam.camera.aspect);
    cam.target.copy(t);
    cam.dist = d;
    cam.place();
  }
  // the tall front goes see-through and then away, over secs after a wait (its own materials: dorms.js)
  async function fadeFront(front, secs, wait) {
    await game.wait(wait * 1000);
    const ms = [];
    front.traverse((o) => o.isMesh && ms.push(o.material));
    for (const m of ms) m.transparent = true;
    await game.tween(secs, (k) => ms.forEach((m) => (m.opacity = 1 - k)));
    front.visible = false;
    for (const m of ms) ((m.opacity = 1), (m.transparent = false));
  }
  function setInside() {
    st.inside = true;
    w.front.visible = false;
  }

  const P = {
    scene: w.scene,
    camera: cam.camera,
    cam,
    space: w.root,
    nav: w.nav,
    sun: w.sun,
    charScale: K,
    start: w.landing,
    startFacing: -Math.PI / 2, // along the corridor toward his door
    defaultPeriod: 'evening',
    music: 'night',
    grade: {
      exposure: 1.0,
      temp: -0.02,
      sat: 0.74,
      contrast: 1.05,
      lift: [0.01, 0.012, 0.022],
      shadowTint: [-0.01, 0, 0.025],
      highTint: [0.02, 0.008, -0.012],
      vignette: 0.26,
      bloom: 0.32,
      bloomThreshold: 0.8,
      focusBand: 0.3,
    },
    things,
    spots,
    seats: {},
    people: {},
    zones: {
      door_203: (x, z) => !st.inside && Math.abs(x - w.doorstep[0]) < 0.4 && z > b.corr[0] && z < b.corr[0] + 0.45,
    },
    hooks: {
      // in at his door: the front drops, the door swings open, over the genkan to the room, the door shuts
      async enterRoom() {
        if (st.inside || st.entering) return;
        st.entering = true;
        const g = game,
          eric = g.player;
        g.walker.stop?.();
        g.walker.locked = true;
        eric.scripted = true;
        // beside the door, clear of the leaf; it swings out onto the corridor (Jørgen: "the whole wall collapses down
        // and the door doesnt even open"), he steps through, and only then does the tall front fade to the cut-low one
        await glide(g, eric.root, w.beside, 0.6);
        g.walker.faceTo?.(w.doorstep[0], b.near);
        sfx('door');
        await g.tween(0.5, (k) => (w.frontLeaf.rotation.y = w.door.rotation.y = -1.4 * k * (2 - k)));
        await glide(g, eric.root, w.doorstep, 0.5);
        st.inside = true;
        refit();
        cam.closeOn(w.arrive.at, w.arrive.zoom);
        const fade = fadeFront(w.front, 0.7, 0.25);
        await glide(g, eric.root, w.roomEntry, 1.2);
        await fade;
        sfx('door');
        g.tween(0.45, (k) => (w.door.rotation.y = -1.4 * (1 - k * k)));
        eric.setState('idle');
        eric.scripted = false;
        g.walker.sync();
        g.walker.locked = false;
        st.entering = false;
        cam.release();
      },
    },
    fit(aspect) {
      if (st.inside) roomFit(aspect);
      else corridorFit(aspect);
    },
    pick(rc) {
      const point = new THREE.Vector3();
      return rc.ray.intersectPlane(floor, point) ? point : null;
    },
    update() {
      const p = game.player?.root.position;
      if (!p) return;
      // on the stairs (the trip up) his feet follow the flight; anywhere else the floor is level
      p.y = p.x > w.stairFoot[0] - 0.5 && p.z > b.stairs.top ? stairY(p.z) : 0;
      // in the flat without the walk in (a saved game, a still): the room's view
      if (!st.inside && !st.entering && p.z < b.near - 0.05) {
        setInside();
        P.fit(cam.camera.aspect);
      }
    },
    snapshotState() {
      return { player: snapshotPeople({ eric: game.player }) };
    },
    restoreState(saved) {
      if (saved.world?.player) {
        restorePeople({ eric: game.player }, saved.world.player);
        game.walker.sync();
        cam.snap(game.player.root.position);
      }
    },
    async tripIn(g) {
      // up the last flight from the half landing onto the landing, the camera close; then it pulls back along the
      // corridor as he turns into it, and lets go
      const eric = g.player;
      eric.scripted = true;
      eric.root.position.set(w.stairFoot[0], stairY(w.stairFoot[1]), w.stairFoot[1]);
      eric.root.rotation.y = Math.PI;
      cam.closeOn(w.stairTop, 1.7);
      cam.snap(eric.root.position);
      await glide(g, eric.root, w.stairTop, 1.0);
      await glide(g, eric.root, w.landing, 1.1);
      cam.release();
      await glide(g, eric.root, w.corridorIn, 1.2);
      eric.setState('idle');
      eric.scripted = false;
      g.walker.sync();
    },
  };
  return P;
}
