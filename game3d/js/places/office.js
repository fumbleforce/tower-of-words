// Place 3, the office floor, as the engine side: things, spots, zones, the command effects and the arrival by lift.
// Every word said here comes from game3d/story/office.js (placeholder: story/placeholder/office.js).
import * as THREE from 'three';
import { buildOffice, K, CN, CS } from '../scenes/office.js';
import { RoomCam } from '../cam.js';
import { ui, sfx } from '../ui.js';
import { walkPerson, stepPeople, lookAt } from '../story.js';
import { sit, armsLap, PEOPLE, idle } from '../cast.js';
import { blob } from '../engine.js';
import { flags } from '../runner.js';
import { glide } from './lobby.js';
import { walkRig } from '../move.js';
import { mat, rbox, PAL } from '../props.js';
import { route } from './route.js';

export async function officePlace(game) {
  const w = buildOffice();
  const cam = new RoomCam({ elev: 51, fov: 24 });
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const st = { liftK: 0, liftWant: 0, copier: 'jam', fan: 'on', fanSpin: 0, clockStop: 0, mdoor: 0, mdoorWant: 0, coffee: 0, paper: [], chairTo: null };
  const aoi = PEOPLE.aoi(); aoi.root.scale.multiplyScalar(K); aoi.root.visible = false; aoi.root.position.set(-5.45, 0, -3.25); w.root.add(aoi.root);
  const aoiBlob = blob(0.55, 0.38); aoiBlob.visible = false; w.root.add(aoiBlob); aoi.blob = aoiBlob; w.emi.blob = w.emiBlob;
  const rei = PEOPLE.rei(); rei.root.scale.multiplyScalar(K); rei.root.visible = false; rei.root.position.set(-5.45, 0, -3.25); w.root.add(rei.root);
  const reiBlob = blob(0.55, 0.38); reiBlob.visible = false; w.root.add(reiBlob); rei.blob = reiBlob;
  const people = { emi: w.emi, kenji: w.kenji, mori: w.mori, aoi, rei, tama: { root: w.tama, head: w.tama.userData.head } };
  const blobs = { emi: w.emiBlob, aoi: aoiBlob, rei: reiBlob };
  // a steam puff for the kettle and a blinking light on the racks
  const steam = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0 })); steam.position.set(1.45, 0.75, CS + 0.36); w.root.add(steam);
  const alarm = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: '#ff5a4a' })); alarm.position.set(5.2, 1.4, -3.3); alarm.visible = false; w.root.add(alarm);
  const dS1 = w.dS(1), dS0 = w.dS(0);
  // Mori waits for him on the landing: about 1.7 m out from the lift and off to the stairs side, facing the spot
  // where Eric stops (LIFT_OUT, places/lift.js), clear of the doors, of anyone else stepping out (they go 0.7 m to
  // either side) and of the way to the corridor on the right, so his deep bow can't reach into Eric
  // (Jørgen: "Mori stands right in front of you and bows into your model")
  const LIFT_OUT = [-5.45, -2.4], MORI_WAIT = [-6.0, -0.75];
  { const r = w.mori; r.seated = false; r.root.position.set(MORI_WAIT[0], 0, MORI_WAIT[1]); r.root.rotation.y = Math.atan2(LIFT_OUT[0] - MORI_WAIT[0], LIFT_OUT[1] - MORI_WAIT[1]); for (const l of r.legs) l.rotation.set(0, 0, 0); for (const k of r.knees) k.rotation.set(0, 0, 0); for (const a of r.arms) a.rotation.set(0, 0, 0); }
  const moriBlob = blob(0.55, 0.38); moriBlob.position.set(MORI_WAIT[0], 0.004, MORI_WAIT[1]); w.root.add(moriBlob); w.mori.blob = moriBlob; blobs.mori = moriBlob;

  const spots = {
    lift_out: [-5.45, -2.4], mori_greet: [(LIFT_OUT[0] + MORI_WAIT[0]) / 2, (LIFT_OUT[1] + MORI_WAIT[1]) / 2], lobby: [-5.6, -1.0], office_door: [-0.25, 0.9], my_seat: [dS1.seat[0], dS1.seat[1] + 0.45], emi_seat: [dS0.seat[0], dS0.seat[1]],
    copier_front: [-2.95, 4.2], coffee_front: [0.7, 4.1], corridor_w: [-3.5, 1.3], corridor_e: [5.8, 1.3], machine_front: [5.1, 1.3],
  };
  const seats = { my_seat: { x: dS1.seat[0], z: dS1.seat[1], top: 0.24, ry: Math.PI }, emi_seat: { x: dS0.seat[0], z: dS0.seat[1], top: 0.24, ry: Math.PI }, mio_seat: { x: dS0.seat[0], z: dS0.seat[1], top: 0.24, ry: Math.PI } };
  const rigAnchor = (rig, h = 1.25) => (v) => { rig.root.getWorldPosition(v); v.y += h; return v; };
  const v3 = (x, y, z) => (v) => v.set(x, y, z);
  const at = (x, z, fx, fz) => ({ spot: () => [x, z], face: () => [fx, fz] });
  const Z0 = w.Z0;

  const things = {
    emi: { label: 'Emi', kind: 'person', anchor: rigAnchor(w.emi), spot: () => (w.emi.seated ? [dS0.seat[0] - 0.55, dS0.seat[1] + 0.5] : [w.emi.root.position.x, w.emi.root.position.z - 0.62]), face: () => [w.emi.root.position.x, w.emi.root.position.z], enabled: () => !w.emi._walk },
    kenji: { label: 'Kenji', kind: 'person', anchor: rigAnchor(w.kenji), ...at(-2.9, -4.3, -2.0, -4.34) },
    rei: { label: 'Rei', kind: 'person', anchor: rigAnchor(rei), spot: () => [rei.root.position.x, rei.root.position.z + 0.6], face: () => [rei.root.position.x, rei.root.position.z], enabled: () => rei.root.visible && !rei._walk },
    aoi: { label: 'Aoi', kind: 'person', anchor: rigAnchor(aoi), spot: () => [aoi.root.position.x, aoi.root.position.z + 0.6], face: () => [aoi.root.position.x, aoi.root.position.z], enabled: () => aoi.root.visible && !aoi._walk },
    mori: { label: 'Mr. Mori', kind: 'person', anchor: rigAnchor(w.mori), spot: () => (!flags.greeted_mori ? LIFT_OUT : w.mori.seated === false ? [w.mori.root.position.x, w.mori.root.position.z + 0.6] : [2.3, -2.55]), face: () => [w.mori.root.position.x, w.mori.root.position.z], enabled: () => !w.mori._walk },
    tama: { label: 'Cat', verb: 'Pet', kind: 'person small', anchor: (v) => { w.tama.getWorldPosition(v); v.y += 0.45; return v; }, spot: () => { const v = new THREE.Vector3(); w.tama.getWorldPosition(v); return [v.x, v.z + 0.6]; }, face: () => { const v = new THREE.Vector3(); w.tama.getWorldPosition(v); return [v.x, v.z]; } },
    covered: { label: 'Covered desk', kind: 'thing small', anchor: v3(w.dN(1).x, 1.0, w.dN(1).z), ...at(w.dN(1).x, -5.05, w.dN(1).x, w.dN(1).z) },
    covered_monitor: { label: 'Covered monitor', kind: 'thing small', anchor: v3(w.dS(2).x, 1.0, w.dS(2).z), ...at(w.dS(2).x, -1.75, w.dS(2).x, w.dS(2).z) },
    box_crowns: { label: 'Box', kind: 'thing small', anchor: v3(-3.5, 1.6, Z0 + 0.3), ...at(-3.5, -5.2, -3.5, Z0), noMarker: true },
    cups: { label: 'Cups', kind: 'thing small', anchor: v3(0.4, 0.8, CS + 0.42), ...at(0.4, 3.35, 0.4, CS + 0.42) },
    nameplate: { label: 'Nameplate', kind: 'thing small', anchor: v3(1.55, 0.6, -3.1), ...at(2.3, -2.55, 1.55, -3.1), noMarker: true },
    my_desk: { label: 'Your desk', kind: 'thing', anchor: v3(dS1.x, 0.95, dS1.z), ...at(dS1.seat[0], dS1.seat[1] + 0.5, dS1.x, dS1.z) },
    my_chair: { label: 'Your chair', kind: 'thing', anchor: (v) => { v.copy(w.myChair.position); v.y = 0.75; return v; }, spot: () => [w.myChair.position.x + 0.1, w.myChair.position.z + 0.55], face: () => [w.myChair.position.x, w.myChair.position.z], enabled: () => !flags.chairHome },
    lift: { label: 'Lift', kind: 'thing small', anchor: v3(-5.45, 1.5, -3.4), ...at(-5.45, -2.8, -5.45, -3.4) },
    vending: { label: 'Vending machine', kind: 'thing small', anchor: v3(-4.62, 1.35, -2.3), ...at(-4.62, -1.75, -4.62, -2.3) },
    bench: { label: 'Bench', kind: 'thing small', anchor: v3(-6.72, 0.6, -1.4), ...at(-6.1, -1.4, -6.72, -1.4), noMarker: true },
    stairs: { label: 'Stairs', kind: 'thing small', anchor: v3(-6.45, 1.45, -3.4), ...at(-6.45, -2.8, -6.45, -3.4) },
    office_door: { label: 'Office door', kind: 'thing small', anchor: v3(-0.25, 1.5, CN), ...at(-0.25, 0.9, -0.25, CN), noMarker: true },
    inout_board: { label: 'In/out board', kind: 'thing small', anchor: v3(-1.6, 1.35, Z0), ...at(-1.4, -5.3, -1.6, Z0) },
    clock: { label: 'Clock', kind: 'thing small', anchor: v3(-1.6, 1.6, Z0), ...at(-1.8, -5.3, -1.6, Z0), noMarker: true },
    whiteboard: { label: 'Whiteboard', kind: 'thing small', anchor: v3(0.55, 1.3, Z0), ...at(0.55, -5.3, 0.55, Z0) },
    calendar: { label: 'Calendar', kind: 'thing small', anchor: v3(-0.6, 1.2, Z0), ...at(-0.6, -5.3, -0.6, Z0), noMarker: true },
    water_cooler: { label: 'Water cooler', kind: 'thing small', anchor: v3(-3.85, 1.2, -4.9), ...at(-3.3, -4.9, -3.85, -4.9) },
    cabinets: { label: 'Cabinets', kind: 'thing small', anchor: v3(-3.5, 1.35, Z0), ...at(-3.5, -5.2, -3.5, Z0), noMarker: true },
    fan: { label: 'Fan', kind: 'thing small', anchor: v3(-3.3, 1.0, -2.2), ...at(-3.3, -1.6, -3.3, -2.2) },
    boxes: { label: 'Boxes', kind: 'thing small', anchor: v3(2.85, 0.6, -1.2), ...at(2.3, -1.2, 2.85, -1.2), noMarker: true },
    chief_desk: { label: "Mr. Mori's desk", kind: 'thing small', anchor: v3(1.55, 0.8, -3.36), ...at(2.3, -2.55, 1.55, -3.36), noMarker: true },
    machine_door: { label: 'Machine room', kind: 'thing small', anchor: v3(5.1, 1.4, CN), ...at(5.1, 0.8, 5.1, CN) },
    racks: { label: 'Server racks', kind: 'thing small', anchor: v3(5.2, 1.5, -3.3), ...at(5.2, -2.1, 5.2, -3.3), enabled: () => st.mdoor > 0.5 },
    fire_exit: { label: 'Fire exit', kind: 'thing small', anchor: v3(6.9, 1.45, 1.25), ...at(6.4, 1.25, 7, 1.25) },
    noticeboard: { label: 'Noticeboard', kind: 'thing small', anchor: v3(-3.0, 1.25, CN), ...at(-3.0, 0.85, -3.0, CN) },
    extinguisher: { label: 'Extinguisher', kind: 'thing small', anchor: v3(1.5, 0.8, CN), ...at(1.5, 0.85, 1.5, CN), noMarker: true },
    hydrant: { label: 'Hydrant', kind: 'thing small', anchor: v3(2.6, 1.0, CN), ...at(2.6, 0.85, 2.6, CN), noMarker: true },
    copier: { label: 'Copier', kind: 'thing', anchor: v3(-2.95, 1.1, CS + 0.36), ...at(-2.95, 4.2, -2.95, CS + 0.36) },
    fax: { label: 'Fax', kind: 'thing small', anchor: v3(-5.4, 0.9, CS + 0.3), ...at(-5.4, 3.4, -5.4, CS + 0.3), noMarker: true },
    paper_shelf: { label: 'Paper shelf', kind: 'thing small', anchor: v3(-6.7, 1.3, 3.6), ...at(-6.2, 3.6, -6.7, 3.6), noMarker: true },
    worktable: { label: 'Worktable', kind: 'thing small', anchor: v3(-4.4, 0.8, 4.7), ...at(-4.4, 3.9, -4.4, 4.7), noMarker: true },
    coffee_machine: { label: 'Coffee machine', kind: 'thing', anchor: v3(1.1, 1.05, CS + 0.36), ...at(1.1, 3.35, 1.1, CS + 0.36) },
    kettle: { label: 'Kettle', kind: 'thing small', anchor: v3(1.45, 0.95, CS + 0.36), ...at(1.45, 3.35, 1.45, CS + 0.36), noMarker: true },
    fridge: { label: 'Fridge', kind: 'thing small', anchor: v3(-1.8, 1.35, CS + 0.32), ...at(-1.8, 3.35, -1.8, CS + 0.32) },
    microwave: { label: 'Microwave', kind: 'thing small', anchor: v3(1.45, 0.95, 4.3), ...at(0.8, 4.3, 1.45, 4.3), noMarker: true },
    kitchen_table: { label: 'Table', kind: 'thing small', anchor: v3(-0.8, 0.7, 4.6), ...at(-0.8, 5.5, -0.8, 4.6), noMarker: true },
    toilet_m: { label: "Men's toilet", kind: 'thing small', anchor: v3(2.6, 1.0, CS), ...at(2.6, 1.85, 2.6, CS) },
    toilet_f: { label: "Women's toilet", kind: 'thing small', anchor: v3(5.2, 1.0, CS), ...at(5.2, 1.85, 5.2, CS) },
    plant: { label: 'Plant', kind: 'thing small', anchor: v3(2.95, 1.2, Z0 + 0.45), ...at(2.95, -5.3, 2.95, Z0 + 0.45), noMarker: true },
  };
  const zones = {
    office: (x, z) => x > -4.2 && x < 3.4 && z < CN && z > Z0,
    copy_room: (x, z) => x < -2.2 && z > CS,
    kitchen: (x, z) => x > -2.2 && x < 1.8 && z > CS,
    toilets: (x, z) => x > 1.8 && z > CS,
    machine_room: (x, z) => x > 3.4 && z < CN,
    corridor: (x, z) => z > CN && z < CS,
  };

  // paper sheets for the copier
  const sheetM = mat(PAL.paper);
  // the jam you can see before the repair: the status light is steady amber (its own material, not the shared
  // green) and one sheet hangs half out of the feed slot, crumpled; both clear when it runs (Codex review item 3, QA #16)
  const copierLight = w.copier.children[w.copier.children.length - 1];
  const lightM = { jam: new THREE.MeshStandardMaterial({ color: '#f0a830', emissive: '#f09a20', emissiveIntensity: 0.9, roughness: 0.5 }), ok: copierLight.material };
  const jamSheet = new THREE.Group();
  { const a = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.004, 0.1), sheetM), b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.004, 0.09), sheetM);
    a.position.set(0, 0, 0.05); b.position.set(0.01, -0.035, 0.12); b.rotation.x = 0.9; a.castShadow = b.castShadow = true; jamSheet.add(a, b);
    jamSheet.position.set(-0.05, 0.47, 0.3); jamSheet.rotation.set(0.35, 0.12, 0.06); w.copier.add(jamSheet); }
  const showJam = (on) => { jamSheet.visible = on; copierLight.material = on ? lightM.jam : lightM.ok; };
  showJam(!flags.copier_done);
  function spray(n, wild) {
    for (let i = 0; i < n; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.004, 0.27), sheetM); s.castShadow = true;
      s.position.set(-2.95 - 0.44 + (Math.random() - 0.5) * 0.05, 0.56, CS + 0.36);
      const a = Math.random() * Math.PI * 2, v = wild ? 1.2 + Math.random() * 1.5 : 0;
      s.userData = { v: new THREE.Vector3(Math.cos(a) * v, wild ? 1.2 + Math.random() : 0, Math.abs(Math.sin(a)) * v), stack: wild ? null : i, t: -i * 0.12, spin: (Math.random() - 0.5) * 6 };
      w.root.add(s); st.paper.push(s);
    }
  }
  function stepPaper(dt) {
    for (const s of st.paper) {
      const u = s.userData; u.t += dt; if (u.t < 0) continue;
      if (u.stack !== null) { const ty = 0.56 + u.stack * 0.006; s.position.x += (-3.45 - s.position.x) * Math.min(1, dt * 12); s.position.y += (ty - s.position.y) * Math.min(1, dt * 12); continue; }
      if (s.position.y <= 0.004) continue;
      u.v.y -= 9 * dt; s.position.addScaledVector(u.v, dt); s.rotation.y += u.spin * dt; u.v.multiplyScalar(1 - dt * 0.8);
      if (s.position.y < 0.004) { s.position.y = 0.004; u.v.set(0, 0, 0); }
    }
  }

  const P = {
    // colour grade (js/post.js): cool slate shadows, warm lamp highlights, a little lift so the basement isn't murky
    grade: { exposure: 1.12, temp: 0.03, sat: 0.94, contrast: 1.06, lift: [0.01, 0.012, 0.02], shadowTint: [-0.006, 0, 0.018], highTint: [0.02, 0.01, -0.012], vignette: 0.26, bloom: 0.4, bloomThreshold: 0.8, focusBand: 0.3 },
    _nav: w.nav,
    scene: w.scene, camera: cam.camera, cam, space: w.root, nav: w.nav, sun: w.sun, charScale: K,
    start: [-5.45, -3.05], startFacing: 0, things, people, spots, zones, seats, defaultPeriod: 'morning',
    fit(aspect) {
      const pts = [];
      for (const x of [w.X0 - 0.2, w.X1 + 0.2]) for (const z of [w.Z0 - 0.2, w.Z1 + 0.2]) for (const y of [0, 1.45]) pts.push(new THREE.Vector3(x, y, z));
      if (aspect >= 1) cam.fit(aspect, [new THREE.Vector3(-6.9, 0, 0), new THREE.Vector3(6.9, 0, 0), new THREE.Vector3(0, 0.6, w.Z0), new THREE.Vector3(0, 0, w.Z1)], new THREE.Vector3(0, 0, 0.1), { limY: 1.0, limX: 1.0 });
      else cam.fit(aspect, [new THREE.Vector3(-2.9, 0, 0), new THREE.Vector3(2.9, 0, 0), new THREE.Vector3(0, 0, -2.7), new THREE.Vector3(0, 1.3, 2.5)], new THREE.Vector3(0, 0, 0), { follow: true, clamp: [w.X0 + 2.5, w.X1 - 2.5, w.Z0 + 4.4, w.Z1 - 2.4] });
    },
    pick(rc) { const p = new THREE.Vector3(); return rc.ray.intersectPlane(floor, p) ? p : null; },
    walkPerson(id, [x, z], { speed } = {}) {
      const r = people[id]; if (!r) return Promise.resolve();
      if (r.seated) standUp(id);
      if (r.root && !r.hips) return walkRig(game, r, [x, z], { speed: speed || 1.0 });
      r.root.visible = true; if (blobs[id]) blobs[id].visible = true;
      const chief = id === 'mori' && Math.hypot(x - 2.3, z + 2.55) < 0.05;
      const path = routeTo(r.root.position, chief ? [2.3, -2.7] : [x, z]);
      const pr = walkPerson(r, path, { speed: speed || 1.3, blobM: blobs[id] });
      // Mori walking back to his desk sits down in the chief's chair
      return chief ? pr.then(() => { sit(r); r.root.position.set(2.16, r.root.position.y + 0.03 * K, -3.36); r.root.rotation.y = -Math.PI / 2; armsLap(r); r.seated = true; moriBlob.position.set(2.2, 0.004, -3.36); }) : pr;
    },
    async sitPerson(id, seatId) {
      const s = seats[seatId];
      if ((id === 'eric' || id === 'player')) { await sitMio(); return; }
      const r = people[id]; if (!r || !s) return;
      await P.walkPerson(id, [s.x, s.z + 0.05]);
      sit(r); r.root.position.set(s.x, r.root.position.y + 0.03 * K, s.z - 0.02); r.root.rotation.y = Math.PI; armsLap(r); r.seated = true;
      if (blobs[id]) blobs[id].position.set(s.x, 0.004, s.z);
    },
    async standPerson(id) { if ((id === 'eric' || id === 'player')) { game.player.seated = false; game.player.setState('idle'); game.player.root.position.y = 0; game.player.root.position.z += 0.4; return; } standUp(id); },
    update(dt, t) {
      w.update(t);
      stepPeople([w.emi, w.kenji, w.mori, aoi, rei], dt);
      if (st.steam > 0) { st.steam -= dt; steam.material.opacity = Math.min(0.6, st.steam) * 0.8; steam.position.y = 0.75 + (1.6 - st.steam) * 0.2; steam.scale.setScalar(1 + (1.6 - st.steam)); } else steam.material.opacity = 0;
      if (st.alarm) { alarm.visible = Math.sin(t * 10) > 0; if (Math.floor(t * 2) !== st.beepT) { st.beepT = Math.floor(t * 2); sfx('beep'); } } else alarm.visible = false;
      if (aoi.root.visible && !aoi._walk) idle(aoi, t);
      st.liftK += (st.liftWant - st.liftK) * Math.min(1, dt * 4); w.openLift(st.liftK);
      st.mdoor += (st.mdoorWant - st.mdoor) * Math.min(1, dt * 3); w.machineDoor.rotation.y = -st.mdoor * 1.5;   // on its hinge, into the machine room
      // clock
      if (st.clockStop > 0) st.clockStop -= dt; else { st.clockT = (st.clockT || 0) + dt; w.secHand.rotation.z = -Math.floor(t) * Math.PI / 30; }
      // 8:55 when the floor opens, ticking with game time; the stop command freezes it
      w.life.hands.userData.set(8 * 60 + 55 + st.clockT / 60, Math.floor(st.clockT));
      // fans
      const fs = st.fan === 'wild' ? 30 : st.fan === 'on' ? 6 : 0;
      st.fanSpin += (fs - st.fanSpin) * Math.min(1, dt * 2);
      w.fanRotor.rotation.z += st.fanSpin * dt; w.fanHead.rotation.y = Math.sin(t * 0.5) * 0.6;
      w.fan2Head.rotation.z += 6 * dt;
      // copier: the jam (amber light, a sheet stuck in the feed) until it runs; shake when running or wild
      w.copier.position.x = -2.95 + (st.copier === 'wild' || st.copier === 'run' ? Math.sin(t * 60) * 0.006 : 0);
      { const j = st.copier === 'jam' && !flags.copier_done; if (j !== jamSheet.visible) showJam(j); }
      stepPaper(dt);
      // the chair rolling to its spot
      if (st.chairTo) {
        const c = w.myChair.position, [x, z] = st.chairTo[0], d = Math.hypot(x - c.x, z - c.z);
        if (d < 0.04) { st.chairTo.shift(); if (!st.chairTo.length) { st.chairTo = null; w.myChair.rotation.y = Math.PI; if (st.chairDone) st.chairDone(); } }
        else { const s = Math.min(d, 2.2 * dt); c.x += (x - c.x) / d * s; c.z += (z - c.z) / d * s; w.myChair.rotation.y += dt * 8; }
      }
      const p = game.player.root.position;
      for (const r of Object.values(people)) {
        if (r._walk || !r.hips) continue;
        if (r.lookTarget) lookAt(r, r.lookTarget[0], r.lookTarget[1], 1);
        else if (Math.hypot(p.x - r.root.position.x, p.z - r.root.position.z) < 2.2) lookAt(r, p.x, p.z, 0.8);
        else lookAt(r, r.root.position.x + Math.sin(r.root.rotation.y), r.root.position.z + Math.cos(r.root.rotation.y), 0.8);
      }
    },
    hooks: {
      copier: async ({ state }) => {
        st.copier = state;
        if (state === 'run') { sfx('ok'); spray(30, false); await game.wait(1800); st.copier = 'idle'; }
        if (state === 'wild') { sfx('no'); spray(40, true); await game.wait(1500); st.copier = 'idle'; }
      },
      catTo: async ({ to }) => {
        const p = game.posOf(to); if (!p) return;
        if (w.tama.parent !== w.root) { w.root.attach(w.tama); w.tama.position.y = 0; }
        w.tama.userData.head.rotation.x = 0;
        await walkRig(game, w.tama, p, { speed: 1.1 });
      },
      chairRoll: ({ to = 'my_seat' }) => new Promise((res) => {
        w.nav.unblock('chair');
        const [x, z] = to === 'my_seat' ? dS1.seat : game.posOf(to);
        const c = w.myChair.position;
        const path = routeTo(c, [x, z]);
        st.chairTo = path; st.chairDone = () => { flags.chairHome = to === 'my_seat'; res(); };
        sfx('door');
      }),
      coffee: async () => { sfx('ok'); st.coffee = 1; st.steam = 1.6; },
      kettle: ({ state }) => { if (state === 'pour') { st.steam = 1.6; sfx('ok'); } },
      rackAlarm: ({ state }) => { st.alarm = state === 'on'; },
      machineDoor: ({ state }) => { st.mdoorWant = state === 'open' ? 1 : 0; if (state === 'open') { w.nav.unblock('mdoor'); w.nav.blockTagged('mdoorLeaf', 5.22, 5.62, CN - 0.8, CN - 0.02); flags.machineOpen = true; } else { w.nav.unblock('mdoorLeaf'); } sfx('door'); },
      vendingDrop: () => { sfx('tap'); setTimeout(() => sfx('tap'), 180); const can = rbox(0.06, 0.1, 0.06, '#7fc07a', { x: -4.62, y: 0.02, z: -1.95, r: 0.02 }); can.rotation.z = Math.PI / 2; w.root.add(can); },
      clockStop: ({ ms = 3000 }) => { st.clockStop = ms / 1000; },
      fan: ({ state }) => { st.fan = state; },
      liftOpen: () => { st.liftWant = 1; sfx('lift'); },
      liftClose: () => { st.liftWant = 0; },
      sitDown: async () => { await sitMio(); game.event('sat_down'); },
    },
    capState(s) {
      if (s.startsWith('mdoor')) { st.mdoor = st.mdoorWant = +s.slice(5); }   // QA stills of the door's swing
      if (s === 'open') st.liftWant = 1;
      if (s === 'sit') { w.myChair.position.set(dS1.seat[0], 0, dS1.seat[1]); w.myChair.rotation.y = Math.PI; placeMioSeated(); }
      if (s === 'wild') { st.copier = 'wild'; spray(40, true); }
    },

    // arriving by lift: close on the doors with the indicator at 3, doors open, Mio steps out, camera eases out
    async tripIn(g, slot) {
      const mio = g.player; mio.scripted = true;
      mio.root.position.set(-5.45, 0, -3.25); mio.root.rotation.y = 0;
      cam.closeOn([-5.45, -3.3], 2.3); cam.snap(mio.root.position);
      ui.lift(g.liftFloor || 'B2');
      await g.wait(600);
      st.liftWant = 1; sfx('lift');
      await g.wait(700);
      ui.lift(null);
      mio.setState('walk');
      await glide(g, mio.root, [-5.45, -2.45], 1.2);
      mio.setState('idle'); mio.scripted = false; g.walker.facing = 0; mio.root.rotation.y = 0;
      cam.release();
      await g.wait(500);
      st.liftWant = 0;
      void slot;
    },
  };

  // corridor-aware route between the office, corridor, lobby and bottom rooms (for Emi and the chair)
  // people take the walk grid's route; the old door-to-door plan is the fallback if the grid finds no way
  function routeTo(from, to) { return route(w.nav, from, to, roomRoute(from, to)); }
  function roomRoute(from, [x, z]) {
    const area = (px, pz) => (pz < CN - 0.1 ? (px < -4.2 ? 'lobby' : px < 3.4 ? 'office' : 'machine') : pz > CS + 0.1 ? 'bottom' : 'corridor');
    const a = area(from.x, from.z), b = area(x, z);
    const path = [];
    const doorOf = { office: [[-0.25, -0.4], [-0.25, 1.3]], lobby: [[-5.0, -0.5], [-4.6, 1.3]], machine: [[5.1, -0.3], [5.1, 1.3]] };
    const bottomDoor = (px) => (px < -2.2 ? [[-4.0, 3.2], [-4.0, 1.3]] : px < 1.8 ? [[-0.35, 3.2], [-0.35, 1.3]] : [[2.6, 3.2], [2.6, 1.3]]);
    if (a !== b) {
      if (a === 'bottom') path.push(...bottomDoor(from.x)); else if (a !== 'corridor') path.push(...doorOf[a]);
      if (b === 'bottom') path.push(...bottomDoor(x).slice().reverse()); else if (b !== 'corridor') path.push(...doorOf[b].slice().reverse());
    }
    if (b === 'office' && a !== 'office') path.push([x < -0.8 ? -2.9 : 1.2, -1.7]);
    path.push([x, z]);
    return path;
  }
  function standUp(id) {
    const r = people[id]; if (!r || !r.seated) return;
    r.seated = false; r.root.position.y = 0; for (const l of r.legs) l.rotation.set(0, 0, 0); for (const k of r.knees) k.rotation.set(0, 0, 0); for (const a of r.arms) a.rotation.set(0, 0, 0);
    r.root.position.z += 0.45;
  }
  function placeMioSeated() {
    const m = game.player;
    m.sitAt(dS1.seat[0], 0.24, dS1.seat[1] + 0.02, Math.PI); if (game.walker) game.walker.facing = Math.PI;
    m.seated = true;
  }
  async function sitMio() {
    if (game.player.seated) return;
    if (!flags.chairHome) { await P.hooks.chairRoll({ to: 'my_seat' }); }
    await game.walkTo(dS1.seat[0], dS1.seat[1] + 0.45);
    placeMioSeated();
    await game.wait(600);
  }
  return P;
}
export const MIO_SEAT_Y = 0.0, MIO_SEAT_DZ = 0.0;
    // the lift's landing doors here (places/lift.js hides them while the wall is cut away and waits on k)
    liftLanding: { leaves: w.leaves, k: () => st.liftK },
