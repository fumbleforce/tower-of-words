import { eventId } from '../narrative/events.js';
import { flagKeys } from '../narrative/engine-flags.js';
const ENGINE_KEYS = flagKeys('game3d/js/places/office.js');
import { PLACE_DETAILS } from './catalog.js';
import { snapshotPeople, restorePeople, snapshotObject, restoreObject } from './saved-people.js';
import * as THREE from 'three';
import { officeSteps, K, CN, CS, DOORWAYS, EMI } from '../scenes/office.js';
import { sliced } from '../perf/slice.js';
import { RoomCam } from '../cam.js';
import { ui, sfx } from '../ui.js';
import { walkPerson, stepPeople, lookAt } from '../story.js';
import { sit, armsLap, PEOPLE, idle } from '../cast.js';
import { officeDay2 } from './office-day2.js';
import { blob } from '../engine.js';
import { flags } from '../narrative/state.js';
import { glide, walkRig, hopOff } from '../move.js';
import { catWalk, catHop } from '../creatures/cat.js';
import { mat, rbox, PAL } from '../props.js';
import { route } from './route.js';
import { chairPusher } from './office-chair.js';
import { isPlayer } from '../mc.js';
import { officeArrival } from './office-arrival.js';
import { attachSender } from '../investigations/sender/index.js';
export async function officePlace(game) {
  const w = await sliced(officeSteps()); // in slices between frames: it's built while the forecourt is played
  const cam = new RoomCam({ elev: 51, fov: 24 });
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const st = {
    liftK: 0,
    liftWant: 0,
    copier: 'jam',
    fan: 'on',
    fanSpin: 0,
    clockStop: 0,
    mdoor: 0,
    mdoorWant: 0,
    coffee: 0,
    paper: [],
    cans: [],
  };
  const initialChair = snapshotObject(w.myChair);
  const pusher = chairPusher(game, w.myChair);
  const aoi = PEOPLE.aoi();
  aoi.root.scale.multiplyScalar(K);
  aoi.root.visible = false;
  aoi.root.position.set(-5.45, 0, -3.25);
  w.root.add(aoi.root);
  const aoiBlob = blob(0.55, 0.38);
  aoiBlob.visible = false;
  w.root.add(aoiBlob);
  aoi.blob = aoiBlob;
  w.emi.blob = w.emiBlob;
  const rei = PEOPLE.rei();
  rei.root.scale.multiplyScalar(K);
  rei.root.visible = false;
  rei.root.position.set(-5.45, 0, -3.25);
  w.root.add(rei.root);
  const reiBlob = blob(0.55, 0.38);
  reiBlob.visible = false;
  w.root.add(reiBlob);
  rei.blob = reiBlob;
  const people = {
    emi: w.emi,
    kenji: w.kenji,
    mori: w.mori,
    aoi,
    rei,
    tama: w.tamaRig,
  };
  const blobs = { emi: w.emiBlob, aoi: aoiBlob, rei: reiBlob };
  // a steam puff for the kettle and a blinking light on the racks
  const steam = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 8, 6),
    new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0 }),
  );
  steam.position.set(1.45, 0.75, CS + 0.36);
  w.root.add(steam);
  const alarm = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 10, 8),
    new THREE.MeshBasicMaterial({ color: '#ff5a4a' }),
  );
  alarm.position.set(5.2, 1.4, -3.3);
  alarm.visible = false;
  w.root.add(alarm);
  const dS1 = w.dS(1),
    dS0 = w.dS(0);
  // Mori's bow stays clear of the lift doors and the player's arrival point.
  const LIFT_OUT = [-5.45, -2.4],
    MORI_WAIT = [-6.0, -0.75];
  {
    const r = w.mori;
    r.seated = false;
    r.root.position.set(MORI_WAIT[0], 0, MORI_WAIT[1]);
    r.root.rotation.y = Math.atan2(LIFT_OUT[0] - MORI_WAIT[0], LIFT_OUT[1] - MORI_WAIT[1]);
    for (const l of r.legs) l.rotation.set(0, 0, 0);
    for (const k of r.knees) k.rotation.set(0, 0, 0);
    for (const a of r.arms) a.rotation.set(0, 0, 0);
  }
  const moriBlob = blob(0.55, 0.38);
  moriBlob.position.set(MORI_WAIT[0], 0.004, MORI_WAIT[1]);
  w.root.add(moriBlob);
  w.mori.blob = moriBlob;
  blobs.mori = moriBlob;
  const spots = {
    sender_console: [4.2, -0.78],
    sender_guest: [4.92, -0.45],
    sender_desk: [-1.25, -1.9],
    sender_door: [5.7, 1.2],
    sender_mori_door: [4.95, 0.1],
    lift_out: [-5.45, -2.4],
    mori_greet: [(LIFT_OUT[0] + MORI_WAIT[0]) / 2, (LIFT_OUT[1] + MORI_WAIT[1]) / 2],
    lobby: [-5.6, -1.0],
    office_door: [-0.25, 0.9],
    my_seat: [dS1.seat[0], dS1.seat[1] + 0.45],
    emi_seat: [EMI.seat.x, EMI.seat.z],
    emi_door: [(EMI.door[0] + EMI.door[1]) / 2, CS], // her office's doorway, in the corridor's south wall
    emi_desk: EMI.desk, // the middle of her desk (for the camera and pins; walk to emi_seat or EMI.talk)
    copier_front: [-2.95, 4.2],
    coffee_front: [0.7, 4.1],
    corridor_w: [-3.5, 1.3],
    corridor_e: [5.8, 1.3],
    machine_front: [5.1, 1.3],
    mio_by_desk: [-0.2, -2.1],
    kenji_desk: [-2.9, -4.3],
  };
  const seats = {
    my_seat: { x: dS1.seat[0], z: dS1.seat[1], top: 0.24, ry: Math.PI },
    emi_seat: EMI.seat,
    // out: on from behind (in front: the desk)
    mio_seat: { x: dS0.seat[0], z: dS0.seat[1], top: 0.24, ry: Math.PI, out: [dS0.seat[0], dS0.seat[1] + 0.45] },
  };
  const day2 = officeDay2(game, { people, blobs }); // who is at B2 on day 2 (office-day2.js)
  const rigAnchor =
    (rig, h = 1.25) =>
    (v) => {
      rig.root.getWorldPosition(v);
      v.y += h;
      return v;
    };
  const v3 = (x, y, z) => (v) => v.set(x, y, z);
  const at = (x, z, fx, fz) => ({ spot: () => [x, z], face: () => [fx, fz] });
  const Z0 = w.Z0;

  const shut = (o) => !st.mdoorWant && o.position.x > 3.4 && o.position.z < CN;
  const cat = () => w.tama.getWorldPosition(new THREE.Vector3());
  const things = {
    sender_console: { ...PLACE_DETAILS.office.things.sender_console, anchor: v3(4.2, 0.8, -1.3) },
    sender_live: { ...PLACE_DETAILS.office.things.sender_live, anchor: v3(-2, 0.8, -3) },
    emi: {
      ...PLACE_DETAILS.office.things.emi,
      anchor: rigAnchor(w.emi),
      spot: () => (w.emi.seated ? EMI.talk : [w.emi.root.position.x, w.emi.root.position.z - 0.62]),
      face: () => [w.emi.root.position.x, w.emi.root.position.z],
      enabled: () => !w.emi._walk,
    },
    kenji: { ...PLACE_DETAILS.office.things.kenji, anchor: rigAnchor(w.kenji), ...at(-2.9, -4.3, -2.0, -4.34) },
    rei: {
      ...PLACE_DETAILS.office.things.rei,
      anchor: rigAnchor(rei),
      spot: () => [rei.root.position.x, rei.root.position.z + 0.6],
      face: () => [rei.root.position.x, rei.root.position.z],
      enabled: () => rei.root.visible && !rei._walk,
    },
    aoi: {
      ...PLACE_DETAILS.office.things.aoi,
      anchor: rigAnchor(aoi),
      spot: () => [aoi.root.position.x, aoi.root.position.z + 0.6],
      face: () => [aoi.root.position.x, aoi.root.position.z],
      enabled: () => aoi.root.visible && !aoi._walk,
    },
    mori: {
      ...PLACE_DETAILS.office.things.mori,
      anchor: rigAnchor(w.mori),
      spot: () =>
        !flags.greeted_mori
          ? LIFT_OUT
          : w.mori.seated === false
            ? [w.mori.root.position.x, w.mori.root.position.z + 0.6]
            : [2.3, -2.55],
      face: () => [w.mori.root.position.x, w.mori.root.position.z],
      enabled: () => !w.mori._walk,
    },
    tama: {
      ...PLACE_DETAILS.office.things.tama,
      anchor: (v) => {
        w.tama.getWorldPosition(v);
        v.y += 0.45;
        return v;
      },
      spot: () => [cat().x, cat().z + 0.6],
      face: () => [cat().x, cat().z],
      enabled: () => !shut(w.tama.parent === w.root ? w.tama : w.myChair),
    },
    covered: {
      ...PLACE_DETAILS.office.things.covered,
      anchor: v3(w.dN(1).x, 1.0, w.dN(1).z),
      ...at(w.dN(1).x, -5.05, w.dN(1).x, w.dN(1).z),
    },
    covered_monitor: {
      ...PLACE_DETAILS.office.things.covered_monitor,
      anchor: v3(w.dS(2).x, 1.0, w.dS(2).z),
      ...at(w.dS(2).x, -1.75, w.dS(2).x, w.dS(2).z),
    },
    box_crowns: {
      ...PLACE_DETAILS.office.things.box_crowns,
      anchor: v3(-3.5, 1.6, Z0 + 0.3),
      ...at(-3.5, -5.2, -3.5, Z0),
      noMarker: true,
    },
    cups: { ...PLACE_DETAILS.office.things.cups, anchor: v3(0.4, 0.8, CS + 0.42), ...at(0.4, 3.35, 0.4, CS + 0.42) },
    nameplate: {
      ...PLACE_DETAILS.office.things.nameplate,
      anchor: v3(1.55, 0.6, -3.1),
      ...at(2.3, -2.55, 1.55, -3.1),
      noMarker: true,
    },
    my_desk: {
      ...PLACE_DETAILS.office.things.my_desk,
      anchor: v3(dS1.x, 0.95, dS1.z),
      ...at(dS1.seat[0], dS1.seat[1] + 0.5, dS1.x, dS1.z),
    },
    my_chair: {
      ...PLACE_DETAILS.office.things.my_chair,
      anchor: (v) => {
        v.copy(w.myChair.position);
        v.y = 0.75;
        return v;
      },
      spot: () => [w.myChair.position.x + 0.1, w.myChair.position.z + 0.55],
      face: () => [w.myChair.position.x, w.myChair.position.z],
      enabled: () => !flags[ENGINE_KEYS.chairHome] && !shut(w.myChair),
    },
    lift: { ...PLACE_DETAILS.office.things.lift, anchor: v3(-5.45, 1.5, -3.4), ...at(-5.45, -2.8, -5.45, -3.4) },
    vending: {
      ...PLACE_DETAILS.office.things.vending,
      anchor: v3(-4.62, 1.35, -2.3),
      ...at(-4.62, -1.75, -4.62, -2.3),
    },
    bench: {
      ...PLACE_DETAILS.office.things.bench,
      anchor: v3(-6.72, 0.6, -1.4),
      ...at(-6.1, -1.4, -6.72, -1.4),
      noMarker: true,
    },
    stairs: { ...PLACE_DETAILS.office.things.stairs, anchor: v3(-6.45, 1.45, -3.4), ...at(-6.45, -2.8, -6.45, -3.4) },
    office_door: {
      ...PLACE_DETAILS.office.things.office_door,
      anchor: v3(-0.25, 1.5, CN),
      ...at(-0.25, 0.9, -0.25, CN),
      noMarker: true,
    },
    inout_board: {
      ...PLACE_DETAILS.office.things.inout_board,
      anchor: v3(-1.6, 1.35, Z0),
      ...at(-1.4, -5.3, -1.6, Z0),
    },
    clock: {
      ...PLACE_DETAILS.office.things.clock,
      anchor: v3(-1.6, 1.6, Z0),
      ...at(-1.8, -5.3, -1.6, Z0),
      noMarker: true,
    },
    whiteboard: { ...PLACE_DETAILS.office.things.whiteboard, anchor: v3(0.55, 1.3, Z0), ...at(0.55, -5.3, 0.55, Z0) },
    calendar: {
      ...PLACE_DETAILS.office.things.calendar,
      anchor: v3(-0.6, 1.2, Z0),
      ...at(-0.6, -5.3, -0.6, Z0),
      noMarker: true,
    },
    water_cooler: {
      ...PLACE_DETAILS.office.things.water_cooler,
      anchor: v3(-3.85, 1.2, -4.9),
      ...at(-3.3, -4.9, -3.85, -4.9),
    },
    cabinets: {
      ...PLACE_DETAILS.office.things.cabinets,
      anchor: v3(-3.5, 1.35, Z0),
      ...at(-3.5, -5.2, -3.5, Z0),
      noMarker: true,
    },
    fan: { ...PLACE_DETAILS.office.things.fan, anchor: v3(-3.3, 1.0, -2.2), ...at(-3.3, -1.6, -3.3, -2.2) },
    boxes: {
      ...PLACE_DETAILS.office.things.boxes,
      anchor: v3(2.85, 0.6, -1.2),
      ...at(1.8, -1.2, 2.85, -1.2),
      noMarker: true,
    },
    chief_desk: {
      ...PLACE_DETAILS.office.things.chief_desk,
      anchor: v3(1.55, 0.8, -3.36),
      ...at(2.3, -2.55, 1.55, -3.36),
      noMarker: true,
    },
    machine_door: { ...PLACE_DETAILS.office.things.machine_door, anchor: v3(5.1, 1.4, CN), ...at(5.1, 0.8, 5.1, CN) },
    racks: {
      ...PLACE_DETAILS.office.things.racks,
      anchor: v3(5.2, 1.5, -3.3),
      ...at(5.2, -2.1, 5.2, -3.3),
      enabled: () => st.mdoor > 0.5,
    },
    fire_exit: { ...PLACE_DETAILS.office.things.fire_exit, anchor: v3(6.9, 1.45, 1.25), ...at(6.4, 1.25, 7, 1.25) },
    noticeboard: {
      ...PLACE_DETAILS.office.things.noticeboard,
      anchor: v3(-3.0, 1.25, CN),
      ...at(-3.0, 0.85, -3.0, CN),
    },
    extinguisher: {
      ...PLACE_DETAILS.office.things.extinguisher,
      anchor: v3(1.5, 0.8, CN),
      ...at(1.5, 0.85, 1.5, CN),
      noMarker: true,
    },
    hydrant: {
      ...PLACE_DETAILS.office.things.hydrant,
      anchor: v3(2.6, 1.0, CN),
      ...at(2.6, 0.85, 2.6, CN),
      noMarker: true,
    },
    copier: {
      ...PLACE_DETAILS.office.things.copier,
      anchor: v3(-2.95, 1.1, CS + 0.36),
      ...at(-2.95, 4.2, -2.95, CS + 0.36),
    },
    fax: {
      ...PLACE_DETAILS.office.things.fax,
      anchor: v3(-4.27, 0.9, 4.6),
      ...at(-3.8, 4.6, -4.27, 4.6),
      noMarker: true,
    },
    paper_shelf: {
      ...PLACE_DETAILS.office.things.paper_shelf,
      anchor: v3(-4.32, 1.3, 3.55),
      ...at(-3.85, 3.55, -4.32, 3.55),
      noMarker: true,
    },
    worktable: {
      ...PLACE_DETAILS.office.things.worktable,
      anchor: v3(-3.3, 0.8, 5.3),
      ...at(-3.3, 4.75, -3.3, 5.3),
      noMarker: true,
    },
    coffee_machine: {
      ...PLACE_DETAILS.office.things.coffee_machine,
      anchor: v3(1.1, 1.05, CS + 0.36),
      ...at(1.1, 3.35, 1.1, CS + 0.36),
    },
    kettle: {
      ...PLACE_DETAILS.office.things.kettle,
      anchor: v3(1.45, 0.95, CS + 0.36),
      ...at(1.45, 3.35, 1.45, CS + 0.36),
      noMarker: true,
    },
    fridge: {
      ...PLACE_DETAILS.office.things.fridge,
      anchor: v3(-1.8, 1.35, CS + 0.32),
      ...at(-1.8, 3.35, -1.8, CS + 0.32),
    },
    microwave: {
      ...PLACE_DETAILS.office.things.microwave,
      anchor: v3(1.45, 0.95, 4.3),
      ...at(0.8, 4.3, 1.45, 4.3),
      noMarker: true,
    },
    kitchen_table: {
      ...PLACE_DETAILS.office.things.kitchen_table,
      anchor: v3(-0.8, 0.7, 4.6),
      ...at(-0.8, 5.5, -0.8, 4.6),
      noMarker: true,
    },
    toilet_m: { ...PLACE_DETAILS.office.things.toilet_m, anchor: v3(2.6, 1.0, CS), ...at(2.6, 1.85, 2.6, CS) },
    toilet_f: { ...PLACE_DETAILS.office.things.toilet_f, anchor: v3(5.2, 1.0, CS), ...at(5.2, 1.85, 5.2, CS) },
    plant: {
      ...PLACE_DETAILS.office.things.plant,
      anchor: v3(2.95, 1.2, Z0 + 0.45),
      ...at(2.95, -5.3, 2.95, Z0 + 0.45),
      noMarker: true,
    },
  };
  const zones = {
    office: (x, z) => x > -4.2 && x < 3.4 && z < CN && z > Z0,
    // the two rooms with a scene on the way in fire a step past their doorway, never in it (movement/doorways.js)
    emi_office: (x, z) => x < EMI.x && z > CS + 0.45,
    copy_room: (x, z) => x > EMI.x && x < -2.2 && z > CS + 0.45,
    kitchen: (x, z) => x > -2.2 && x < 1.8 && z > CS,
    toilets: (x, z) => x > 1.8 && z > CS,
    machine_room: (x, z) => x > 3.4 && z < CN - 0.45,
    corridor: (x, z) => z > CN && z < CS,
  };

  // paper sheets for the copier
  const sheetM = mat(PAL.paper);
  // the jam you can see before the repair: the status light is steady amber (its own material, not the shared
  // green) and one sheet hangs half out of the feed slot, crumpled; both clear when it runs (Codex review item 3, QA #16)
  const copierLight = w.copier.children[w.copier.children.length - 1];
  const lightM = {
    jam: new THREE.MeshStandardMaterial({
      color: '#f0a830',
      emissive: '#f09a20',
      emissiveIntensity: 0.9,
      roughness: 0.5,
    }),
    ok: copierLight.material,
  };
  const jamSheet = new THREE.Group();
  {
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.004, 0.1), sheetM),
      b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.004, 0.09), sheetM);
    a.position.set(0, 0, 0.05);
    b.position.set(0.01, -0.035, 0.12);
    b.rotation.x = 0.9;
    a.castShadow = b.castShadow = true;
    jamSheet.add(a, b);
    jamSheet.position.set(-0.05, 0.47, 0.3);
    jamSheet.rotation.set(0.35, 0.12, 0.06);
    w.copier.add(jamSheet);
  }
  const showJam = (on) => {
    jamSheet.visible = on;
    copierLight.material = on ? lightM.jam : lightM.ok;
  };
  showJam(!flags.copier_done);
  function sheet() {
    const object = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.004, 0.27), sheetM);
    object.castShadow = true;
    w.root.add(object);
    st.paper.push(object);
    return object;
  }
  function vendingCan() {
    const can = rbox(0.06, 0.1, 0.06, '#7fc07a', { x: -4.62, y: 0.02, z: -1.95, r: 0.02 });
    can.rotation.z = Math.PI / 2;
    w.root.add(can);
    st.cans.push(can);
    return can;
  }
  function spray(n, wild) {
    for (let i = 0; i < n; i++) {
      const s = sheet();
      s.position.set(-2.95 - 0.44 + (Math.random() - 0.5) * 0.05, 0.56, CS + 0.36);
      const a = Math.random() * Math.PI * 2,
        v = wild ? 1.2 + Math.random() * 1.5 : 0;
      s.userData = {
        v: new THREE.Vector3(Math.cos(a) * v, wild ? 1.2 + Math.random() : 0, Math.abs(Math.sin(a)) * v),
        stack: wild ? null : i,
        t: -i * 0.12,
        spin: (Math.random() - 0.5) * 6,
      };
    }
  }
  function stepPaper(dt) {
    for (const s of st.paper) {
      const u = s.userData;
      u.t += dt;
      if (u.t < 0) continue;
      if (u.stack !== null) {
        const ty = 0.56 + u.stack * 0.006;
        s.position.x += (-3.45 - s.position.x) * Math.min(1, dt * 12);
        s.position.y += (ty - s.position.y) * Math.min(1, dt * 12);
        continue;
      }
      if (s.position.y <= 0.004) continue;
      u.v.y -= 9 * dt;
      s.position.addScaledVector(u.v, dt);
      s.rotation.y += u.spin * dt;
      u.v.multiplyScalar(1 - dt * 0.8);
      if (s.position.y < 0.004) {
        s.position.y = 0.004;
        u.v.set(0, 0, 0);
      }
    }
  }

  // ---- lunch (story lunch_mio / lunch_mori / lunch_end) ----
  // Jørgen: "I went to eat with Mori, but I never reach the server room, I am left standing 'eating' in the hallway,
  // without food." The scene used to walk Eric to machine_front, which is the corridor outside the door, and there
  // was no food anywhere. Now lunchSit brings him to a set spot (a walk, then a snap if the walk hasn't made it in
  // time), seats him and his lunch partner, and puts a bento in each lap (Mio) or on the table (Mori). lunchOver
  // clears it all at the 14:00 cut and brings everyone back to the office floor for the afternoon beat.
  const LUNCH_TOP = 0.24; // crate top, the same height as the office chairs, so the sit clip's feet meet the floor
  const lunchSeats = {
    eric: { x: 4.45, z: -2.3, ry: Math.PI / 2, walk: [4.75, -1.8] },
    mio: { x: 5.95, z: -2.3, ry: -Math.PI / 2, walk: [5.95, -1.8] },
  };
  // two crates of backup tapes in the machine room, between the rack row and the cart: the lunch seats
  for (const s of Object.values(lunchSeats)) {
    const c = new THREE.Group();
    c.add(
      rbox(0.42, LUNCH_TOP - 0.02, 0.32, '#56606e', { y: 0, r: 0.02 }),
      rbox(0.44, 0.02, 0.34, '#6b7584', { y: LUNCH_TOP - 0.02, r: 0.006 }),
    );
    for (const dx of [-0.12, 0, 0.12])
      c.add(rbox(0.09, 0.012, 0.3, '#2c3139', { x: dx, y: LUNCH_TOP - 0.004, r: 0.003, cast: false })); // tape spines under the lid slots
    c.position.set(s.x, 0, s.z);
    c.rotation.y = s.ry;
    w.root.add(c);
    w.nav.block(s.x - 0.23, s.x + 0.23, s.z - 0.18, s.z + 0.18);
  }
  function bento(color) {
    const g = new THREE.Group();
    g.add(rbox(0.19, 0.045, 0.13, color, { r: 0.012 })); // box
    g.add(rbox(0.1, 0.012, 0.11, '#f3f1ea', { x: -0.035, y: 0.04, r: 0.004, cast: false })); // rice
    g.add(rbox(0.022, 0.014, 0.022, '#c8424f', { x: -0.035, y: 0.047, r: 0.008, cast: false })); // umeboshi
    g.add(rbox(0.06, 0.02, 0.045, '#e8c34a', { x: 0.05, y: 0.042, z: -0.025, r: 0.006, cast: false })); // tamagoyaki
    g.add(rbox(0.06, 0.018, 0.045, '#5f9a4f', { x: 0.05, y: 0.041, z: 0.027, r: 0.006, cast: false })); // greens, pickles
    const sticks = rbox(0.012, 0.008, 0.2, '#d9c7a0', { x: 0.11, y: 0.028, r: 0.003, cast: false });
    sticks.rotation.y = 0.2;
    g.add(sticks);
    g.scale.setScalar(1.35);
    g.visible = false;
    w.root.add(g);
    return g;
  }
  const lunchFood = { eric: bento('#3d7fa8'), partner: bento('#b8434f') };
  // on someone seated facing ry: in the lap, just in front of the hips
  const inLap = (b, s) => {
    b.position.set(s.x + Math.sin(s.ry) * 0.18, LUNCH_TOP + 0.13, s.z + Math.cos(s.ry) * 0.18);
    b.rotation.y = s.ry;
    b.visible = true;
  };
  // a scripted walk that can't strand the scene: gives up after `ms` (game time) and the caller snaps
  const walkOrGiveUp = (pr, ms) => Promise.race([pr.then(() => true), game.wait(ms).then(() => false)]);
  async function lunchSit({ with: partner = 'mio' } = {}) {
    const me = game.player;
    if (partner === 'mio') {
      if (!st.mdoorWant) P.hooks.machineDoor({ state: 'open' }); // she eats in there, so the door is open
      const es = lunchSeats.eric,
        ms = lunchSeats.mio,
        mio = game.mioNpc;
      // Mio: finish whatever walk she's on (every walk ends by itself: move.js walkRig caps them), then to her crate,
      // while Eric walks in through the door
      let mioWalk = Promise.resolve();
      if (mio) {
        mio.root.visible = true;
        for (let i = 0; i < 40 && mio._walk; i++) await game.wait(150);
        if (!mio._walk && !mio.seated) mioWalk = walkRig(game, mio, ms.walk, { speed: 1.0 });
      }
      // if Eric isn't there in time (a blocked path, the cat, someone in the way), he's put there
      const ok = await walkOrGiveUp(game.walkTo(es.walk[0], es.walk[1]), 9000);
      const miss = Math.hypot(me.root.position.x - es.walk[0], me.root.position.z - es.walk[1]);
      if (!ok || miss > 0.5)
        console.warn(
          `lunch: Eric's walk into the machine room stopped ${miss.toFixed(2)} m short; snapping him to his seat`,
        );
      game.walker.stop();
      me.sitAt(es.x, LUNCH_TOP, es.z, es.ry);
      me.seated = true;
      game.walker.sync?.();
      game.walker.facing = es.ry;
      inLap(lunchFood.eric, es);
      // Mio sits down too; if she's still on the way, her walk is ended and she's put there with him
      if (mio && !mio.seated) {
        if (!(await walkOrGiveUp(mioWalk, 3000))) await endWalk(mio);
        seatMio();
      }
      lunchState.on = true;
      return;
    }
    // with Mori: at the kitchenette table, Eric at its east end, Mori on the far side; lunch on the table
    const spot = [0.05, 4.6];
    const ok = await walkOrGiveUp(game.walkTo(spot[0], spot[1]), 20000); // from the machine room it's about 12 m
    game.walker.stop();
    me.setState('idle');
    const miss = Math.hypot(me.root.position.x - spot[0], me.root.position.z - spot[1]);
    if (!ok || miss > 0.5) {
      console.warn(`lunch: Eric's walk to the kitchenette stopped ${miss.toFixed(2)} m short; snapping him there`);
      me.root.position.set(spot[0], 0, spot[1]);
    }
    game.walker.sync?.();
    game.walker.faceTo(-0.8, 5.2);
    const mo = w.mori;
    if (mo._walk) {
      for (let i = 0; i < 30 && mo._walk; i++) await game.wait(150);
    }
    for (let i = 0; i < 60 && mo._walk?.call; i++) mo._walk(5); // still on the way: finish his walk now (story.js walkPerson)
    if (Math.hypot(mo.root.position.x + 0.8, mo.root.position.z - 5.5) > 0.4) {
      mo._walk = null;
      standUp('mori');
      mo.root.position.set(-0.8, 0, 5.5);
      moriBlob.position.set(-0.8, 0.004, 5.5);
    }
    mo.root.rotation.y = Math.PI;
    const tb = 0.45; // on the kitchen table's top (0.42: scenes/office.js table2 at -0.8, 4.6), box half-height above it
    lunchFood.eric.position.set(-0.52, tb, 4.6);
    lunchFood.eric.rotation.y = -Math.PI / 2;
    lunchFood.eric.visible = true;
    lunchFood.partner.position.set(-0.85, tb, 4.8);
    lunchFood.partner.rotation.y = Math.PI;
    lunchFood.partner.visible = true;
    lunchState.on = true;
  }
  const lunchState = { on: false };
  // ends a walkRig walk now (it stops itself on the next frame when its rig is out of the scene)
  async function endWalk(r) {
    const par = r.root.parent;
    if (!par || !r._walk) return;
    par.remove(r.root);
    for (let i = 0; i < 20 && r._walk; i++) await new Promise((q) => requestAnimationFrame(q));
    par.add(r.root);
  }
  function seatMio() {
    const mio = game.mioNpc,
      s = lunchSeats.mio;
    if (!mio) return;
    mio.root.visible = true;
    mio.sitAt(s.x, LUNCH_TOP, s.z, s.ry);
    mio.seated = true;
    inLap(lunchFood.partner, s);
  }
  // the 14:00 cut: lunch packed away, Eric back on his feet by his desk, Mio at hers and Mori at his, so the
  // afternoon lines (the crackers, Mio's tip about the vending machine) play with everyone in the room
  async function lunchOver() {
    const was = lunchState.on;
    lunchState.on = false;
    lunchFood.eric.visible = lunchFood.partner.visible = false;
    if (was) await ui.fade('', '', 250);
    const me = game.player;
    if (me.seated) {
      me.seated = false;
      me.setState('idle');
      me.root.position.y = 0;
    }
    const [px, pz] = spots.my_seat;
    me.root.position.set(px, 0, pz);
    game.walker.stop();
    game.walker.sync?.();
    game.walker.faceTo(dS0.seat[0], dS0.seat[1]);
    const mio = game.mioNpc;
    if (mio && mio.root.visible) {
      mio.setState('idle');
      mio.seated = false;
      mio.root.position.set(dS0.seat[0], 0, dS0.seat[1] + 0.45);
    }
    const mo = w.mori;
    if (!mo.seated || Math.hypot(mo.root.position.x - 2.16, mo.root.position.z + 3.36) > 0.3) {
      mo._walk = null;
      standUp('mori');
      mo.root.position.set(2.3, 0, -2.55);
      moriBlob.position.set(2.3, 0.004, -2.55);
    }
    cam.snap?.(me.root.position);
    if (was) await ui.unfade();
  }

  const P = {
    // colour grade (js/post.js): cool slate shadows, warm lamp highlights, a little lift so the basement isn't murky
    grade: {
      exposure: 1.12,
      temp: 0.03,
      sat: 0.94,
      contrast: 1.06,
      lift: [0.01, 0.012, 0.02],
      shadowTint: [-0.006, 0, 0.018],
      highTint: [0.02, 0.01, -0.012],
      vignette: 0.26,
      bloom: 0.4,
      bloomThreshold: 0.8,
      focusBand: 0.3,
    },
    _nav: w.nav,
    scene: w.scene,
    camera: cam.camera,
    cam,
    space: w.root,
    nav: w.nav,
    sun: w.sun,
    charScale: K,
    start: [-5.45, -3.05],
    startFacing: 0,
    things,
    people,
    spots,
    zones,
    doorways: DOORWAYS,
    seats,
    defaultPeriod: 'morning',
    fit(aspect) {
      const pts = [];
      for (const x of [w.X0 - 0.2, w.X1 + 0.2])
        for (const z of [w.Z0 - 0.2, w.Z1 + 0.2]) for (const y of [0, 1.45]) pts.push(new THREE.Vector3(x, y, z));
      if (aspect >= 1)
        cam.fit(
          aspect,
          [
            new THREE.Vector3(-6.9, 0, 0),
            new THREE.Vector3(6.9, 0, 0),
            new THREE.Vector3(0, 0.6, w.Z0),
            new THREE.Vector3(0, 0, w.Z1),
          ],
          new THREE.Vector3(0, 0, 0.1),
          { limY: 1.0, limX: 1.0 },
        );
      else
        cam.fit(
          aspect,
          [
            new THREE.Vector3(-2.9, 0, 0),
            new THREE.Vector3(2.9, 0, 0),
            new THREE.Vector3(0, 0, -2.7),
            new THREE.Vector3(0, 1.3, 2.5),
          ],
          new THREE.Vector3(0, 0, 0),
          { follow: true, clamp: [w.X0 + 2.5, w.X1 - 2.5, w.Z0 + 4.4, w.Z1 - 2.4] },
        );
    },
    snapshotState() {
      return {
        machineOpen: st.mdoorWant > 0,
        chairHome: Math.hypot(w.myChair.position.x - dS1.seat[0], w.myChair.position.z - dS1.seat[1]) < 0.1,
        machineDoor: { value: st.mdoor, target: st.mdoorWant },
        chair: snapshotObject(w.myChair),
        blockers: Object.fromEntries(
          ['mdoor', 'mdoorLeaf', 'chair'].map((tag) => [
            tag,
            w.nav.rects.filter((r) => r.tag === tag).map((r) => [...r]),
          ]),
        ),
        copier: st.copier,
        fan: st.fan,
        alarm: !!st.alarm,
        clockStop: st.clockStop,
        lift: { value: st.liftK, target: st.liftWant },
        paper: st.paper.map((s) => ({ ...snapshotObject(s), motion: { ...s.userData, v: s.userData.v.toArray() } })),
        cans: st.cans.map(snapshotObject),
        people: snapshotPeople(people),
        player: snapshotPeople({ eric: game.player }),
        lunch: lunchState.on,
        food: Object.fromEntries(Object.entries(lunchFood).map(([id, object]) => [id, snapshotObject(object)])),
      };
    },
    restoreState(saved) {
      const f = saved.flags || {},
        state = saved.world || {};
      st.mdoorWant = state.machineDoor?.target ?? ((state.machineOpen ?? (f.machineOpen || f.machine_open)) ? 1 : 0);
      st.mdoor = state.machineDoor?.value ?? st.mdoorWant;
      w.machineDoor.rotation.y = -st.mdoor * 1.5;
      w.nav.unblock('mdoor');
      w.nav.unblock('mdoorLeaf');
      if (st.mdoorWant) {
        w.nav.unblock('mdoor');
        w.nav.blockTagged('mdoorLeaf', 5.22, 5.62, CN - 0.8, CN - 0.02);
      } else w.nav.blockTagged('mdoor', 4.7, 5.5, CN - 0.2, CN + 0.12);
      w.nav.unblock('chair');
      restoreObject(w.myChair, state.chair || initialChair);
      if (state.chairHome ?? (f.chairHome || f.chair_back)) {
        w.myChair.position.set(dS1.seat[0], w.myChair.position.y, dS1.seat[1]);
        w.myChair.rotation.y = Math.PI;
      } else w.nav.blockTagged('chair', 5.2, 5.8, -1.6, -1.0);
      if (state.blockers)
        for (const [tag, rects] of Object.entries(state.blockers)) {
          w.nav.unblock(tag);
          rects.forEach((rect) => w.nav.blockTagged(tag, ...rect));
        }
      st.copier = state.copier || (f.copier_done ? 'idle' : 'jam');
      showJam(st.copier === 'jam');
      if (state.fan) st.fan = state.fan;
      st.alarm = !!state.alarm;
      st.clockStop = state.clockStop || 0;
      if (state.lift) {
        st.liftK = state.lift.value;
        st.liftWant = state.lift.target;
        w.openLift(st.liftK);
      }
      if (state.paper) {
        st.paper.forEach((s) => {
          s.removeFromParent();
          s.geometry.dispose();
        });
        st.paper = [];
        for (const data of state.paper) {
          const s = sheet();
          restoreObject(s, data);
          s.userData = { ...data.motion, v: new THREE.Vector3().fromArray(data.motion.v) };
        }
      }
      if (state.cans) {
        st.cans.forEach((can) => {
          can.removeFromParent();
          can.geometry.dispose();
        });
        st.cans = [];
        state.cans.forEach((data) => restoreObject(vendingCan(), data));
      }
      restorePeople(people, state.people);
      lunchState.on = !!state.lunch;
      for (const [id, object] of Object.entries(lunchFood)) restoreObject(object, state.food?.[id]);
      if (saved.runner?.execution && state.player) {
        game.walker.stop();
        restorePeople({ eric: game.player }, state.player);
        game.walker.sync?.();
        game.walker.facing = game.player.root.rotation.y;
        cam.snap?.(game.player.root.position);
      }
    },
    pick(rc) {
      const p = new THREE.Vector3();
      return rc.ray.intersectPlane(floor, p) ? p : null;
    },
    personArrived: officeArrival(people, moriBlob, K),
    walkPerson(id, [x, z], { speed } = {}) {
      const r = people[id];
      if (!r) return Promise.resolve();
      if (r.seated) standUp(id);
      r.root.visible = true;
      if (blobs[id]) blobs[id].visible = true;
      const parent = r.root.parent;
      const pr = r.meshy
        ? walkRig(game, r, [x, z], { speed: speed || 1.0 })
        : walkPerson(r, routeTo(r.root.position, [x, z]), { speed: speed || 1.3, blobM: blobs[id] });
      const token = r.root.userData.walkTok;
      return pr.then(() => {
        if (game.place === P && r.root.parent === parent && r.root.userData.walkTok === token)
          P.personArrived(id, [x, z]);
      });
    },
    async sitPerson(id, seatId) {
      const s = seats[seatId];
      if (isPlayer(id)) {
        await sitMio();
        return;
      }
      const r = people[id];
      if (!r || !s) return;
      await P.walkPerson(id, [s.x, s.z + 0.05]);
      sit(r);
      r.root.position.set(s.x, r.root.position.y + 0.03 * K, s.z - 0.02);
      r.root.rotation.y = Math.PI;
      armsLap(r);
      r.seated = true;
      if (blobs[id]) blobs[id].position.set(s.x, 0.004, s.z);
    },
    placeSeated(id, seatId) {
      const r = id === 'mio' ? game.mioNpc : people[id],
        s = seats[seatId];
      if (!r?.meshy || !s) return;
      r.root.visible = true;
      r.sitAt(s.x, s.top, s.z, s.ry || 0);
      r.seated = true;
    },
    async standPerson(id) {
      if (isPlayer(id)) {
        game.player.seated = false;
        game.player.setState('idle');
        game.player.root.position.y = 0;
        game.player.root.position.z += 0.4;
        return;
      }
      standUp(id);
    },
    update(dt, t) {
      w.update(t);
      w.tamaRig.update(dt);
      stepPeople([w.emi, w.kenji, w.mori, aoi, rei], dt);
      const e = people.emi.root; // her shadow goes where she does (the place's people hold her Meshy body)
      if (e.visible) w.emiBlob.position.set(e.position.x, 0.004, e.position.z);
      if (st.steam > 0) {
        st.steam -= dt;
        steam.material.opacity = Math.min(0.6, st.steam) * 0.8;
        steam.position.y = 0.75 + (1.6 - st.steam) * 0.2;
        steam.scale.setScalar(1 + (1.6 - st.steam));
      } else steam.material.opacity = 0;
      if (st.alarm) {
        alarm.visible = Math.sin(t * 10) > 0;
        if (Math.floor(t * 2) !== st.beepT) {
          st.beepT = Math.floor(t * 2);
          sfx('beep');
        }
      } else alarm.visible = false;
      if (aoi.root.visible && !aoi._walk) idle(aoi, t);
      st.liftK += (st.liftWant - st.liftK) * Math.min(1, dt * 4);
      w.openLift(st.liftK);
      st.mdoor += (st.mdoorWant - st.mdoor) * Math.min(1, dt * 3);
      w.machineDoor.rotation.y = -st.mdoor * 1.5; // on its hinge, into the machine room
      // clock
      if (st.clockStop > 0) st.clockStop -= dt;
      else {
        st.clockT = (st.clockT || 0) + dt;
        w.secHand.rotation.z = (-Math.floor(t) * Math.PI) / 30;
      }
      // 8:55 when the floor opens, ticking with game time; the stop command freezes it
      w.life.hands.userData.set(8 * 60 + 55 + st.clockT / 60, Math.floor(st.clockT));
      // fans
      const fs = st.fan === 'wild' ? 30 : st.fan === 'on' ? 6 : 0;
      st.fanSpin += (fs - st.fanSpin) * Math.min(1, dt * 2);
      w.fanRotor.rotation.z += st.fanSpin * dt;
      w.fanHead.rotation.y = Math.sin(t * 0.5) * 0.6;
      w.fan2Head.rotation.z += 6 * dt;
      // copier: the jam (amber light, a sheet stuck in the feed) until it runs; shake when running or wild
      w.copier.position.x = -2.95 + (st.copier === 'wild' || st.copier === 'run' ? Math.sin(t * 60) * 0.006 : 0);
      {
        const j = st.copier === 'jam';
        if (j !== jamSheet.visible) showJam(j);
      }
      stepPaper(dt);
      pusher.step(dt); // the chair push (office-chair.js)
      const p = game.player.root.position;
      for (const r of Object.values(people)) {
        if (r._walk || !r.hips) continue;
        if (r.lookTarget) lookAt(r, r.lookTarget[0], r.lookTarget[1], 1);
        else if (Math.hypot(p.x - r.root.position.x, p.z - r.root.position.z) < 2.2) lookAt(r, p.x, p.z, 0.8);
        else
          lookAt(
            r,
            r.root.position.x + Math.sin(r.root.rotation.y),
            r.root.position.z + Math.cos(r.root.rotation.y),
            0.8,
          );
      }
    },
    hooks: {
      day5Office: (a) => P.monday.hooks.day5Office(a),
      teamDrinks: (a) => P.monday.hooks.teamDrinks(a),
      copier: async ({ state }) => {
        st.copier = state;
        if (state === 'run') {
          sfx('copier');
          spray(30, false);
          await game.wait(1800);
          st.copier = 'idle';
        }
        if (state === 'wild') {
          sfx('no');
          sfx('copier');
          spray(40, true);
          await game.wait(1500);
          st.copier = 'idle';
        }
      },
      catTo: async ({ to }) => {
        const p = game.posOf(to);
        if (!p) return;
        if (w.tama.parent !== w.root) {
          // off the chair: a hop down, a little way toward where she is going
          w.root.attach(w.tama);
          const q = w.tama.position,
            d = Math.hypot(p[0] - q.x, p[1] - q.z) || 1;
          await catHop(game, w.tamaRig, [q.x + ((p[0] - q.x) / d) * 0.35, q.z + ((p[1] - q.z) / d) * 0.35], 0);
        }
        await catWalk(game, w.tamaRig, p, { speed: 1.1, end: 'sit' });
      },
      chairRoll: async ({ to = 'my_seat' }) => {
        w.nav.unblock('chair');
        sfx('door');
        await pusher.roll(routeTo(w.myChair.position, to === 'my_seat' ? dS1.seat : game.posOf(to)), Math.PI);
        flags[ENGINE_KEYS.chairHome] = to === 'my_seat';
      },
      coffee: async () => {
        sfx('ok');
        st.coffee = 1;
        st.steam = 1.6;
      },
      kettle: ({ state }) => {
        if (state === 'pour') {
          st.steam = 1.6;
          sfx('kettle');
        }
      },
      rackAlarm: ({ state }) => {
        st.alarm = state === 'on';
      },
      machineDoor: ({ state }) => {
        st.mdoorWant = state === 'open' ? 1 : 0;
        if (state === 'open') {
          w.nav.unblock('mdoor');
          w.nav.blockTagged('mdoorLeaf', 5.22, 5.62, CN - 0.8, CN - 0.02);
          flags[ENGINE_KEYS.machineOpen] = true;
        } else {
          w.nav.unblock('mdoorLeaf');
        }
        sfx('door');
      },
      vendingDrop: () => {
        sfx('vending');
        vendingCan();
      },
      clockStop: ({ ms = 3000 }) => {
        st.clockStop = ms / 1000;
      },
      fan: ({ state }) => {
        st.fan = state;
      },
      liftOpen: () => {
        st.liftWant = 1;
        sfx('liftdoor');
      },
      liftClose: () => {
        st.liftWant = 0;
      },
      sitDown: async () => {
        await sitMio();
        game.event(eventId('office', 'sat_down'));
      },
      // lunch: { do: 'lunchSit', with: 'mio' | 'mori' } and { do: 'lunchOver' } (see the lunch block above)
      lunchSit: (s) => lunchSit(s),
      lunchOver: () => lunchOver(),
      officeDay2: day2.hook,
    },
    // the lift's landing doors here (places/lift.js hides them while the wall is cut away and waits on k)
    liftLanding: { leaves: w.leaves, k: () => st.liftK },
    capState(s) {
      if (s.startsWith('mdoor')) {
        st.mdoor = st.mdoorWant = +s.slice(5);
      } // QA stills of the door's swing
      if (s === 'open') st.liftWant = 1;
      if (s === 'sit') {
        w.myChair.position.set(dS1.seat[0], 0, dS1.seat[1]);
        w.myChair.rotation.y = Math.PI;
        placeMioSeated();
      }
      if (s === 'wild') {
        st.copier = 'wild';
        spray(40, true);
      }
    },

    // arriving by lift: close on the doors with the indicator at 3, doors open, Mio steps out, camera eases out
    async tripIn(g, slot) {
      const mio = g.player;
      mio.scripted = true;
      mio.root.position.set(-5.45, 0, -3.25);
      mio.root.rotation.y = 0;
      cam.closeOn([-5.45, -3.3], 2.3);
      cam.snap(mio.root.position);
      ui.lift(g.liftFloor || 'B2');
      await g.wait(600);
      st.liftWant = 1;
      sfx('lift');
      sfx('liftdoor', { at: 0.3 });
      await g.wait(700);
      ui.lift(null);
      mio.setState('walk');
      await glide(g, mio.root, [-5.45, -2.45], 1.2);
      mio.setState('idle');
      mio.scripted = false;
      g.walker.facing = 0;
      mio.root.rotation.y = 0;
      cam.release();
      await g.wait(500);
      st.liftWant = 0;
      void slot;
    },
  };

  // corridor-aware route between the office, corridor, lobby and bottom rooms (for Emi and the chair)
  // people take the walk grid's route; the old door-to-door plan is the fallback if the grid finds no way
  function routeTo(from, to) {
    return route(w.nav, from, to, roomRoute(from, to));
  }
  function roomRoute(from, [x, z]) {
    const area = (px, pz) =>
      pz < CN - 0.1 ? (px < -4.2 ? 'lobby' : px < 3.4 ? 'office' : 'machine') : pz > CS + 0.1 ? 'bottom' : 'corridor';
    const a = area(from.x, from.z),
      b = area(x, z);
    const path = [];
    const doorOf = {
      office: [
        [-0.25, -0.4],
        [-0.25, 1.3],
      ],
      lobby: [
        [-5.0, -0.5],
        [-4.6, 1.3],
      ],
      machine: [
        [5.1, -0.3],
        [5.1, 1.3],
      ],
    };
    const bottomDoor = (px) =>
      px < -2.2
        ? [
            [-4.0, 3.2],
            [-4.0, 1.3],
          ]
        : px < 1.8
          ? [
              [-0.35, 3.2],
              [-0.35, 1.3],
            ]
          : [
              [2.6, 3.2],
              [2.6, 1.3],
            ];
    if (a !== b) {
      if (a === 'bottom') path.push(...bottomDoor(from.x));
      else if (a !== 'corridor') path.push(...doorOf[a]);
      if (b === 'bottom') path.push(...bottomDoor(x).slice().reverse());
      else if (b !== 'corridor') path.push(...doorOf[b].slice().reverse());
    }
    if (b === 'office' && a !== 'office') path.push([x < -0.8 ? -2.9 : 1.2, -1.7]);
    path.push([x, z]);
    return path;
  }
  function standUp(id) {
    const r = people[id];
    if (!r || !r.seated) return;
    r.seated = false;
    r.root.position.y = 0;
    for (const l of r.legs) l.rotation.set(0, 0, 0);
    for (const k of r.knees) k.rotation.set(0, 0, 0);
    for (const a of r.arms) a.rotation.set(0, 0, 0);
    r.root.position.z += 0.45;
  }
  function placeMioSeated() {
    hopOff(game, w.tama, w.myChair);
    const m = game.player;
    m.sitAt(dS1.seat[0], 0.24, dS1.seat[1] + 0.02, Math.PI);
    if (game.walker) game.walker.facing = Math.PI;
    m.seated = true;
  }
  async function sitMio() {
    if (game.player.seated) return;
    if (Math.hypot(w.myChair.position.x - dS1.seat[0], w.myChair.position.z - dS1.seat[1]) > 0.1)
      await P.hooks.chairRoll({ to: 'my_seat' });
    await game.walkTo(...spots.my_seat);
    placeMioSeated();
    await game.wait(600);
  }
  P.lunch = { food: lunchFood, state: lunchState }; // QA (tools/lunch-shots.mjs)
  day2.install(P);
  attachSender(game, P, w);
  return P;
}
export const MIO_SEAT_Y = 0.0,
  MIO_SEAT_DZ = 0.0;
