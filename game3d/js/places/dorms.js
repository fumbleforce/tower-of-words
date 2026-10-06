import * as THREE from 'three';
import { buildDorms } from '../scenes/dorms.js';
import { RoomCam } from '../cam.js';
import { K } from '../scenes/office.js';
import { glide, freeNear } from '../move.js';
import { sfx } from '../ui.js';
import { PLACE_DETAILS } from './catalog.js';
import { snapshotPeople, restorePeople } from './saved-people.js';
import { sim } from '../sim.js';
import { PLAYER_ID } from '../mc.js';
import { dormFloors } from './dorm-floors.js';
import { dormView, dormDaylight, NIGHT_GRADE } from './dorm-view.js';
import { STAIR, WEST_END, LEVEL_DX } from '../scenes/dorms/layout.js';

// Eric's floor and his room, and the rest of the building he can walk (docs/game/places.md, Eric's dorm building).
// The trip in from the dorm courtyard (dorm-court.js) brings him up the last flight onto the 2F landing; he walks the
// corridor to his door himself, and going in (the enterRoom hook, from the story) drops his front wall, opens the
// door and takes him over the genkan into the room, the view widening to the whole flat. Going out (leaveRoom, or a
// story's trip to the courtyard from inside: tripVia) puts him back on the corridor; from there the stairs go down
// to the courtyard (a later day) and up to 3F and the roof (dorm-floors.js). It also loads with ?place=dorms.
export function dormsPlace(game) {
  const w = buildDorms();
  const cam = new RoomCam(w.camera);
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const b = w.bounds;
  // inside: he's in the flat (the room's view, its things); entering: the walk in or out is playing; level: the
  // floor he's on ('2f', '3f', 'roof')
  const st = { inside: false, entering: false, level: '2f' };
  const inRoom = () => st.inside;
  const floors = dormFloors(game, { w, cam, st, fitNow: () => P.fit(cam.camera.aspect) });
  const spots = {
    landing: w.landing,
    door_203: w.atDoor,
    room_entry: w.roomEntry,
    window_front: w.windowFront,
    desk_front: w.computer.spot,
    landing_3f: floors.spots.landing_3f,
    roof_door: floors.spots.roof_door,
    // the nooks (docs/game/places.md, Nooks)
    dorm_2f_end: floors.spots.dorm_2f_end,
    dorm_kitchen_shelf: floors.spots.dorm_kitchen_shelf,
    dorm_3f_end: floors.spots.dorm_3f_end,
    dorm_laundry_box: floors.spots.dorm_laundry_box,
    dorm_roof_chairs: floors.spots.dorm_roof_chairs,
    dorm_roof_units: floors.spots.dorm_roof_units,
  };
  const things = {
    door_203: {
      ...PLACE_DETAILS.dorms.things.door_203,
      anchor: (v) => v.set((w.doorstep[0] + w.atDoor[0]) / 2 - 0.1, 1.55, b.near + 0.12),
      spot: () => w.atDoor,
      face: () => [w.doorstep[0], b.near],
      enabled: () => st.level === '2f' && !st.inside && !st.entering,
      act: () => P.hooks.enterRoom(), // a day whose story has nothing to say at his door: he just goes in
      goalElse: 'stairs_down', // as the goal while he's on another floor: the way back down
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
    computer: {
      ...PLACE_DETAILS.dorms.things.computer,
      anchor: (v) => v.set(w.computer.x, w.computer.y, w.computer.z),
      spot: () => w.computer.spot,
      face: () => [w.computer.x, w.computer.z],
      outline: () => w.obj.computer,
      enabled: inRoom,
    },
    // day 2 on: out through the genkan and the front door onto the corridor (leaveRoom)
    door_out: {
      ...PLACE_DETAILS.dorms.things.door_out,
      anchor: (v) => v.set(DOOR_MID, 1.0, b.near - 0.05),
      spot: () => OUT_SPOT,
      face: () => [DOOR_MID, b.near],
      enabled: () => inRoom() && !st.entering && sim.day > 1,
      goalElse: 'stairs_down', // once he's out on the corridor, the goal is the way down
    },
    // the stairs to the other floors, and the small things round the building (places/dorm-floors.js)
    stairs_up: {
      ...PLACE_DETAILS.dorms.things.stairs_up,
      ...floors.thing('stairs_up'),
      anchor: (v) => floors.thing('stairs_up').anchor(v),
    },
    stairs_down: {
      ...PLACE_DETAILS.dorms.things.stairs_down,
      ...floors.thing('stairs_down'),
      anchor: (v) => floors.thing('stairs_down').anchor(v),
    },
    kitchen: {
      ...PLACE_DETAILS.dorms.things.kitchen,
      ...floors.thing('kitchen'),
      anchor: (v) => floors.thing('kitchen').anchor(v),
    },
    notices: {
      ...PLACE_DETAILS.dorms.things.notices,
      ...floors.thing('notices'),
      anchor: (v) => floors.thing('notices').anchor(v),
    },
    laundry: {
      ...PLACE_DETAILS.dorms.things.laundry,
      ...floors.thing('laundry'),
      anchor: (v) => floors.thing('laundry').anchor(v),
    },
    drinks: {
      ...PLACE_DETAILS.dorms.things.drinks,
      ...floors.thing('drinks'),
      anchor: (v) => floors.thing('drinks').anchor(v),
    },
    washing: {
      ...PLACE_DETAILS.dorms.things.washing,
      ...floors.thing('washing'),
      anchor: (v) => floors.thing('washing').anchor(v),
    },
    planters: {
      ...PLACE_DETAILS.dorms.things.planters,
      ...floors.thing('planters'),
      anchor: (v) => floors.thing('planters').anchor(v),
    },
  };

  // the front door's middle, the genkan floor in front of it, and a spot in the room to start a day on
  const DOOR_MID = (w.doorstep[0] + w.atDoor[0]) / 2 - 0.1,
    OUT_SPOT = [w.doorstep[0], b.near - 0.35],
    MORNING = freeNear(w.nav, [], -0.1, -1.0, 0) || w.roomEntry;
  const fitFor = dormView(cam, w, st);
  // a new framing eased into from the current one (fit() places the camera at once)
  function refit() {
    const t = cam.target.clone(),
      d = cam.dist;
    P.fit(cam.camera.aspect);
    cam.target.copy(t);
    cam.dist = d;
    cam.place();
  }
  // the tall front goes see-through and then away, over secs after a wait (its own materials: dorms.js); `back`:
  // the other way, from nothing to solid, as he steps out onto the corridor
  async function fadeFront(front, secs, wait, back = false) {
    await game.wait(wait * 1000);
    const ms = [];
    front.traverse((o) => o.isMesh && ms.push(o.material));
    for (const m of ms) ((m.transparent = true), (m.opacity = back ? 0 : 1));
    front.visible = true;
    await game.tween(secs, (k) => ms.forEach((m) => (m.opacity = back ? k : 1 - k)));
    front.visible = back;
    for (const m of ms) ((m.opacity = 1), (m.transparent = false));
  }
  const daylight = dormDaylight(w, (grade) => (P.grade = grade));
  function setInside() {
    st.inside = true;
    w.front.visible = false;
  }
  // he's in front of his door: standing there, or on his way to it (walking past along the corridor isn't going in)
  const atHisDoor = (x, z) => Math.abs(x - w.doorstep[0]) < 0.4 && z > b.corr[0] && z < b.corr[0] + 0.45;
  function headingIn() {
    const wk = game.walker;
    if (wk?.path?.length) return atHisDoor(...wk.path[wk.path.length - 1]);
    return !wk?.keys?.size;
  }
  // a walk that stops now (the door, a scene) and hands him to the script
  function script(g) {
    g.walker.stop?.();
    g.walker.locked = true;
    g.player.scripted = true;
  }
  function unscript(g) {
    g.player.setState('idle');
    g.player.scripted = false;
    g.walker.sync();
    g.walker.locked = false;
  }

  const P = {
    scene: w.scene,
    camera: cam.camera,
    cam,
    space: w.root,
    nav: w.nav,
    sun: w.sun,
    charScale: K,
    // each floor's batches under its own group in the draw-call pass (perf/batch.js), so none spans two floors and
    // gets drawn from both (its shadow-only batches above all, which merge everything under one parent)
    perfMovers: [w.levels.groups['3f'], w.levels.groups.roof],
    start: w.landing,
    startFacing: -Math.PI / 2, // along the corridor toward his door
    defaultPeriod: 'evening',
    photoReady: () => st.inside && !st.entering, // the end card's "Eric's room" is the room, not the corridor (#92)
    music: 'night', // after work; in the morning (day 2) the calm loop (places/lifecycle.js)
    grade: NIGHT_GRADE,
    onPeriod: (period) => daylight(sim.day > 1 && period !== 'evening'), // (day 1 is only ever here after work)
    things,
    spots,
    seats: { desk_chair: w.deskChair },
    people: {},
    zones: {
      door_203: (x, z) => st.level === '2f' && !st.inside && atHisDoor(x, z) && headingIn(),
      // day 2: down off the step onto the genkan tiles, on the way out
      room_exit: (x, z) => st.inside && !st.entering && sim.day > 1 && z > 0.6 && z < b.near && x > b.x0 && x < b.x1,
    },
    // where a nook or a thing on another floor is reached from (game3d/tools/reach-check.mjs): that floor's landing
    reachFrom: ([x]) =>
      x > LEVEL_DX.roof + WEST_END - 1
        ? spots.roof_door
        : x > LEVEL_DX['3f'] + WEST_END - 1
          ? spots.landing_3f
          : w.landing,
    // a story's trip to the courtyard while he's in the flat starts with stepping out onto the corridor; the stairs
    // down are the rest of it, taken from there (dorm-floors.js stairs_down)
    tripVia: (to) => (to === 'dorm_court' && st.inside ? () => P.hooks.leaveRoom() : null),
    hooks: {
      // in at his door: the front drops, the door swings open, over the genkan to the room, the door shuts
      async enterRoom() {
        if (st.inside || st.entering) return;
        st.entering = true;
        const g = game,
          eric = g.player;
        script(g);
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
        unscript(g);
        st.entering = false;
        cam.release();
      },
      // out of the flat: over the genkan, the door swings out, he steps onto the corridor, his front comes back up
      // round the door as the view goes back to the corridor, and the door shuts behind him
      async leaveRoom() {
        if (!st.inside || st.entering) return;
        st.entering = true;
        const g = game,
          eric = g.player;
        if (eric.seated) await game.hooks.stand({ who: PLAYER_ID });
        await g.walkTo(OUT_SPOT[0], OUT_SPOT[1]);
        script(g);
        cam.closeOn(w.arrive.at, w.arrive.zoom);
        sfx('door');
        await g.tween(0.4, (k) => (w.frontLeaf.rotation.y = w.door.rotation.y = -1.4 * k * (2 - k)));
        eric.setState('walk');
        await glide(g, eric.root, w.doorstep, 0.9);
        st.inside = false;
        refit();
        cam.closeOn(w.atDoor, 1.3);
        const fade = fadeFront(w.front, 0.6, 0, true);
        await glide(g, eric.root, w.atDoor, 0.9);
        await fade;
        sfx('door');
        g.tween(0.45, (k) => (w.frontLeaf.rotation.y = w.door.rotation.y = -1.4 * (1 - k * k)));
        unscript(g);
        st.entering = false;
        cam.release();
      },
    },
    fit: (aspect) => fitFor(aspect),
    pick(rc) {
      const point = new THREE.Vector3();
      return rc.ray.intersectPlane(floor, point) ? point : null;
    },
    update(dt) {
      const p = game.player?.root.position;
      if (!p) return;
      // on the flights (the watched moves) his feet follow the treads; anywhere else the floor is level (but for the
      // desk chair, where sitting puts him)
      if (!game.player.seated) p.y = floors.floorY(p);
      floors.follow(p);
      floors.rooms(p, dt);
      // in the flat without the walk in (a saved game, a still): the room's view (not on the stair landing, which
      // runs back past the flat's front wall further east)
      if (
        st.level === '2f' &&
        !st.inside &&
        !st.entering &&
        p.z < b.near - 0.05 &&
        p.x > b.x0 - 0.2 &&
        p.x < b.x1 + 0.2
      ) {
        setInside();
        P.fit(cam.camera.aspect);
      }
    },
    // stills (?cap&st=3f&mx=..&mz=..): the floor to show, Eric already where mx, mz put him
    capState(level) {
      floors.setLevel(level);
      P.fit(cam.camera.aspect);
      cam.snap(game.player.root.position);
    },
    snapshotState() {
      return { player: snapshotPeople({ eric: game.player }), inside: st.inside, level: st.level };
    },
    restoreState(saved) {
      // a new day's opening save (days.js): Eric in the room, the room's view
      if (saved.world?.inside && !saved.world.player) {
        floors.setLevel('2f');
        setInside();
        game.player.root.position.set(MORNING[0], 0, MORNING[1]);
        game.player.root.rotation.y = 0;
        game.walker.facing = 0;
        game.walker.sync();
        P.fit(cam.camera.aspect);
        cam.snap(game.player.root.position);
        return;
      }
      if (saved.world?.player) {
        floors.setLevel(saved.world.level || '2f');
        restorePeople({ eric: game.player }, saved.world.player);
        game.walker.sync();
        P.fit(cam.camera.aspect);
        cam.snap(game.player.root.position);
      }
    },
    // day 2 on, down to the courtyard: from the landing onto the flight down, the camera close; the rest of the
    // stairs are the crossfade. (From inside the flat a story's trip steps out first: tripVia.)
    tripOutTo: {
      async dorm_court(g) {
        const eric = g.player;
        if (st.inside) await P.hooks.leaveRoom();
        const down = w.stairsAt(0).down;
        if (Math.hypot(eric.root.position.x - down[0], eric.root.position.z - down[1]) > 0.15)
          await g.walkTo(down[0], down[1]);
        script(g);
        cam.closeOn(down, 1.7);
        eric.setState('walk');
        await glide(g, eric.root, [down[0], STAIR.top + 0.75], 0.8);
        eric.setState('idle');
      },
    },
    async tripIn(g) {
      // up the last flight from the half landing onto the landing, the camera close; then it pulls back along the
      // corridor as he turns into it, and lets go
      const eric = g.player;
      floors.setLevel('2f');
      if (st.inside) {
        st.inside = false;
        w.front.visible = true;
        P.fit(cam.camera.aspect);
      }
      eric.scripted = true;
      eric.root.position.set(w.stairFoot[0], 0, w.stairFoot[1]);
      eric.root.position.y = floors.floorY(eric.root.position);
      eric.root.rotation.y = Math.PI;
      cam.closeOn(w.stairTop, 1.7);
      cam.snap(eric.root.position);
      await glide(g, eric.root, w.stairTop, 1.0);
      await glide(g, eric.root, w.landing, 1.1);
      cam.release();
      await glide(g, eric.root, w.corridorIn, 1.2);
      // a later day has no landing scene: he goes on along the corridor and in at his door before the room's
      // start node runs (story/day2/README.md)
      if (sim.day > 1) {
        await glide(g, eric.root, w.atDoor, 1.2);
        await P.hooks.enterRoom();
        return;
      }
      unscript(g);
    },
  };
  return P;
}
