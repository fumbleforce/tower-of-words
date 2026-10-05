// Seated people against the furniture round their seat (Jørgen, 2026-10-05, #240, on Emi at her new desk: "why is
// she clipped into the table").
//   node game3d/tools/seat-check.mjs [w] [h]          (BASE=<path to game3d> for a worktree, SHOTS=0 for no stills,
//   ONLY=train,gate for some scenes, QS=&mc=carina adds to the page query: another protagonist's body as Eric)
// For each place where people sit (B2 on day 1 and day 2, the train, the gate's bench, the day-2 party bench, day 3's
// pool benches, common-room sofa and gym benches), it
// measures:
//  - everyone the place seats itself (as placed), and
//  - every 3D-model body there (Eric, Mio and the Meshy cast) put on every seat of that place (the seats the story
//    uses, the desk chairs people are placed on, Emi's guest chair and the lunch crates).
// The body is the posed, skinned mesh (every vertex after the sit clip); the furniture is every other solid mesh
// near the seat. A body vertex inside a solid (odd ray crossings up and down) is an overlap; its depth is the
// shortest of the six axis rays out of it. The seat itself (the cushion under the hips and the chair it belongs to)
// is reported but doesn't fail: sitting presses into it. Anything else deeper than TOL fails: the desk or table top,
// a drawer pedestal, a wall.
// The player (Eric's body, or another protagonist's with QS=&mc=<id>) on each seat the game puts them on also fails
// when it sits in the seat rather than on it ("MC is sitting inside the seats", Jørgen, 2026-10-05): the hips joint
// below the seat top, the hips and thighs more than SINK into it, or more than LEGS of the lower legs inside it.
// Output: game3d/shots/seats/<w>x<h>/ (log.json, one close still per seat and occupant, sheet.webp).
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [W = '1366', H = '860'] = process.argv.slice(2);
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(G, 'shots/seats', `${W}x${H}`);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const phone = +W < 700;
const SHOTS = process.env.SHOTS !== '0';
const TOL = 0.01; // 1 cm: a hand resting on a desk, cloth against an edge
const SINK = 0.03; // 3 cm: the player pressing into a cushion (a seat top given a cm low included); deeper reads as sitting in it
const LEGS = 0.4; // the lower legs in the seat: a third is the back of the calves against a train seat's front lip; half is legs buried
const base = process.env.BASE || 'game3d';
const ONLY = process.env.ONLY?.split(',');
const SCENES = [
  { name: 'office-day1', q: 'place=office', office: true },
  { name: 'office-day2', q: 'day=2&place=office', office: true },
  { name: 'train', q: 'place=train' },
  { name: 'gate', q: 'place=gate' },
  { name: 'party-day2', q: 'day=2&place=shotengai', party: true },
  // day 3: the pool deck's benches (the swimming club), the common room's sofa (Kenji's evening), the gym's benches
  { name: 'pool-day3', q: 'day=3&place=pool' },
  { name: 'commons-day3', q: 'day=3&place=dorm_commons' },
  { name: 'gym-day3', q: 'day=3&place=gym' },
];
const fails = [],
  notes = [];
const log = {};
// who sits on each named seat in the game (besides everyone a place seats itself, checked where they are): Eric at
// his desk, on Emi's guest chair, on his lunch crate, on any free train seat, the gate's bench and the party bench;
// Mio at her desk, her crate and her train seats; Emi at her desk; Mori on the bench
const MINE = {
  my_seat: 'eric', mio_seat: 'mio', emi_seat: 'emi', emi_guest: 'eric', lunch_eric: 'eric', lunch_mio: 'mio',
  seat_aoi: 'eric', seat_far_r: ['eric', 'mio'], seat_near_l: 'eric', seat_near_r: 'eric', seat_mio: 'mio',
  party_seat: 'eric', party_mori: 'mori', bench_r: 'eric',
  deck_bench_s: ['eric', 'emi'], deck_bench_n: 'eric', commons_sofa: ['eric', 'kenji'], gym_bench_n: 'eric', gym_bench_s: ['eric', 'kuro'],
};

// ---- in the page ----
async function inPage({ scene, TOL, phase, placed = [] }) {
  const THREE = await import('three');
  const g = window.__game,
    P = g.place;
  const frames = (n = 3) => new Promise((r) => { const f = () => (--n <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  // the people: the place's own, Mio and Eric
  const rigs = { ...(P.people || {}) };
  rigs.eric = g.player;
  if (g.mioNpc) rigs.mio = g.mioNpc;
  if (scene.party) {
    // the party's two bodies (they wait hidden until the story brings them)
    for (const [id, r] of Object.entries(P.people || {})) rigs[id] = r;
  }
  const roots = new Set(Object.values(rigs).map((r) => r?.root).filter(Boolean));
  const isPerson = (o) => {
    for (let p = o; p; p = p.parent) if (roots.has(p)) return true;
    return false;
  };
  const shown = (o) => {
    for (let p = o; p; p = p.parent) if (!p.visible) return false;
    return true;
  };
  const hipsOf = (r) => {
    let h = null;
    if (r.model) r.model.traverse((o) => { if (!h && o.isBone && /hips/i.test(o.name)) h = o; });
    return h || r.hips || r.root;
  };
  const world = (o) => o.getWorldPosition(new THREE.Vector3());
  // the body: every vertex of every drawn mesh of the rig, posed (skinned)
  function body(r) {
    r.root.updateMatrixWorld(true);
    const pts = [],
      v = new THREE.Vector3();
    // the vertices the body sits on: skinned mostly to the hips or a thigh bone (pts.seat, indices into pts / 3)
    pts.seat = [];
    pts.bone = [];
    r.root.traverse((o) => {
      if (!o.isMesh || !shown(o) || o.material?.transparent || !o.geometry?.attributes?.position) return;
      const pos = o.geometry.attributes.position,
        si = o.isSkinnedMesh && o.geometry.attributes.skinIndex,
        sw = si && o.geometry.attributes.skinWeight,
        sitBone = si && o.skeleton.bones.map((b) => /hips|pelvis|up_?leg|thigh/i.test(b.name) && !/spine/i.test(b.name));
      for (let i = 0; i < pos.count; i++) {
        o.getVertexPosition(i, v);
        v.applyMatrix4(o.matrixWorld);
        if (si) {
          let best = 0,
            bone = -1;
          for (let k = 0; k < 4; k++)
            if (sw.getComponent(i, k) > best) {
              best = sw.getComponent(i, k);
              bone = si.getComponent(i, k);
            }
          if (sitBone[bone]) pts.seat.push(pts.length / 3);
          pts.bone[pts.length / 3] = o.skeleton.bones[bone]?.name;
        }
        pts.push(v.x, v.y, v.z);
      }
    });
    return pts;
  }
  // furniture: solid, drawn, non-person meshes, as world-space triangles with their bounds (batched originals too;
  // the merged batches themselves are skipped so nothing counts twice)
  const furn = [];
  const SC = P.scene || g.scene;
  SC.updateMatrixWorld(true);
  SC.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || o.userData.perfBatch || !shown(o)) return;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!m || m.transparent || m.userData?.noLook || isPerson(o)) return;
    const geo = o.geometry,
      pos = geo?.attributes?.position;
    if (!pos) return;
    const box = new THREE.Box3().setFromObject(o);
    const sz = box.getSize(new THREE.Vector3());
    if (Math.min(sz.x, sz.y, sz.z) < 0.004 || sz.y < 0.03) return; // planes, floors
    furn.push({ o, box, tris: null });
  });
  const triOf = (f) => {
    if (f.tris) return f.tris;
    const geo = f.o.geometry,
      pos = geo.attributes.position,
      idx = geo.index,
      n = idx ? idx.count : pos.count,
      t = new Float32Array(n * 3),
      v = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(pos, idx ? idx.getX(i) : i).applyMatrix4(f.o.matrixWorld);
      t[i * 3] = v.x;
      t[i * 3 + 1] = v.y;
      t[i * 3 + 2] = v.z;
    }
    return (f.tris = t);
  };
  // crossings of a ray (o, axis d) with a triangle soup: [count, nearest]
  function cast(t, ox, oy, oz, dx, dy, dz) {
    let c = 0,
      near = Infinity;
    for (let i = 0; i < t.length; i += 9) {
      const ax = t[i], ay = t[i + 1], az = t[i + 2];
      const e1x = t[i + 3] - ax, e1y = t[i + 4] - ay, e1z = t[i + 5] - az;
      const e2x = t[i + 6] - ax, e2y = t[i + 7] - ay, e2z = t[i + 8] - az;
      const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
      const det = e1x * px + e1y * py + e1z * pz;
      if (Math.abs(det) < 1e-12) continue;
      const inv = 1 / det,
        sx = ox - ax, sy = oy - ay, sz = oz - az;
      const u = (sx * px + sy * py + sz * pz) * inv;
      if (u < 0 || u > 1) continue;
      const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
      const w = (dx * qx + dy * qy + dz * qz) * inv;
      if (w < 0 || u + w > 1) continue;
      const s = (e2x * qx + e2y * qy + e2z * qz) * inv;
      if (s > 0) {
        c++;
        if (s < near) near = s;
      }
    }
    return [c, near];
  }
  const AX = [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
  // where the place meant the hips to go: the root for the Meshy people (sitAt keeps it over the seated hips) and the
  // code-built ones, the root plus her seat offset for Mio (mio.js sitOff)
  const seatPoint = (r) => {
    const p = r.root.position.clone();
    if (r.sitOff) p.add(r.sitOff);
    return r.root.parent ? r.root.parent.localToWorld(p) : p;
  };
  // the seat under that point: the first solid below it, and the chair it's part of (a group under 1.2 m)
  function seatOf(r) {
    const h = world(hipsOf(r)),
      at = seatPoint(r),
      y0 = (r.root.parent ? r.root.parent.getWorldPosition(new THREE.Vector3()).y : 0) + 0.6;
    // the highest solid under a few points round it (a slatted bench has gaps)
    let best = null;
    for (const [dx, dz] of [[0, 0], [0.04, 0], [-0.04, 0], [0, 0.04], [0, -0.04], [0.08, 0.08], [-0.08, -0.08]])
      for (const f of furn) {
        const b = f.box,
          px = at.x + dx,
          pz = at.z + dz;
        if (px < b.min.x || px > b.max.x || pz < b.min.z || pz > b.max.z || b.min.y > y0) continue;
        const [c, d] = cast(triOf(f), px + 1e-4, y0, pz + 1.3e-4, 0, -1, 0);
        // a seat is under the hips joint (3 cm of slack for one sunk into it): a bench back or armrest the side
        // samples catch is higher than that
        if (c && y0 - d < h.y + 0.03 && (!best || d < best.d)) best = { f, d };
      }
    const off = Math.hypot(h.x - at.x, h.z - at.z);
    if (!best) return { top: null, parts: new Set(), hip: h, at, off };
    const top = y0 - best.d;
    let grp = best.f.o;
    for (let p = grp.parent; p && p !== SC; p = p.parent) {
      const s = new THREE.Box3().setFromObject(p).getSize(new THREE.Vector3());
      if (Math.max(s.x, s.z) > 1.2 || s.y > 1.6) break;
      grp = p;
    }
    const parts = new Set();
    grp.traverse((o) => parts.add(o));
    return { top, parts, hip: h, at, off };
  }
  const name = (o) => {
    const bits = [];
    for (let p = o; p && p !== SC && bits.length < 3; p = p.parent) if (p.name) bits.push(p.name);
    const b = new THREE.Box3().setFromObject(o);
    const c = b.getCenter(new THREE.Vector3());
    return `${bits.join('<') || o.geometry?.type || 'mesh'} @(${c.x.toFixed(2)},${b.max.y.toFixed(2)},${c.z.toFixed(2)})`;
  };
  // overlaps of one seated rig with the furniture round it. Each solid it enters is the seat (its own chair or bench),
  // a desk or table (above the seat top and ahead of the seat: the top, a drawer pedestal, a modesty panel) or other
  // (a bench back, a wall). Only desks and tables fail.
  function measure(r) {
    const pts = body(r);
    const seat = seatOf(r);
    const top = seat.top ?? seat.hip.y - 0.06; // no chair under the point (Eric's, away in the machine room)
    const fwd = r.root.getWorldDirection(new THREE.Vector3());
    const bb = new THREE.Box3();
    for (let i = 0; i < pts.length; i += 3) bb.expandByPoint(new THREE.Vector3(pts[i], pts[i + 1], pts[i + 2]));
    // the triangles near the body (merged street furniture spans a whole chunk): every one whose footprint meets
    // the body's, which keeps each solid round a body vertex whole for the vertical rays
    const near = [];
    for (const f of furn) {
      if (!f.box.intersectsBox(bb)) continue;
      const t = triOf(f),
        keep = [];
      for (let i = 0; i < t.length; i += 9) {
        const x0 = Math.min(t[i], t[i + 3], t[i + 6]), x1 = Math.max(t[i], t[i + 3], t[i + 6]);
        const z0 = Math.min(t[i + 2], t[i + 5], t[i + 8]), z1 = Math.max(t[i + 2], t[i + 5], t[i + 8]);
        if (x1 < bb.min.x - 0.3 || x0 > bb.max.x + 0.3 || z1 < bb.min.z - 0.3 || z0 > bb.max.z + 0.3) continue;
        for (let j = 0; j < 9; j++) keep.push(t[i + j]);
      }
      if (keep.length) near.push({ f, t: new Float32Array(keep), seat: seat.parts.has(f.o) });
    }
    // per vertex: inside which solid, how deep, and whether that's a desk or table: above the seat top and ahead
    // of the seat point (knees in a drawer pedestal, the chest in the desk top) and not the seat's own chair; a
    // bench back, the wall behind or the floor under the feet is "other"
    const hits = new Map();
    // how far the body goes down into the seat ("MC is sitting inside the seats", Jørgen, 2026-10-05): the deepest
    // body vertex inside the seat's surface, below its top (for the log: the back of a calf in a seat's front lip is
    // fine), and the share of the lower legs' vertices inside it (legs buried in a deep cushion is not)
    let sink = { depth: 0, what: '' };
    const legs = new Set(),
      legsIn = new Set();
    pts.bone.forEach((b, j) => b && /leg|foot|toe/i.test(b) && !/up_?leg/i.test(b) && legs.add(j));
    // the underside of the seated body: its lowest hips or thigh vertex over the seat (up to 20 cm ahead of the seat
    // point; the knees can hang past the front edge), from the seat top (negative: below it)
    let under = Infinity;
    for (const j of pts.seat) {
      const i = j * 3,
        ahead = (pts[i] - seat.at.x) * fwd.x + (pts[i + 2] - seat.at.z) * fwd.z;
      if (ahead < 0.2) under = Math.min(under, pts[i + 1] - top);
    }
    for (let i = 0; i < pts.length; i += 3) {
      const x = pts[i] + 1.1e-5, y = pts[i + 1] + 0.7e-5, z = pts[i + 2] + 1.3e-5;
      for (const n of near) {
        const b = n.f.box;
        if (x < b.min.x || x > b.max.x || y < b.min.y || y > b.max.y || z < b.min.z || z > b.max.z) continue;
        const [cu, du] = cast(n.t, x, y, z, 0, 1, 0);
        if (!(cu & 1)) continue;
        const [cd, dd] = cast(n.t, x, y, z, 0, -1, 0);
        if (!(cd & 1)) continue;
        let depth = Math.min(du, dd);
        for (const [dx, dy, dz] of AX.slice(2)) depth = Math.min(depth, cast(n.t, x, y, z, dx, dy, dz)[1]);
        const ahead = (x - seat.at.x) * fwd.x + (z - seat.at.z) * fwd.z;
        // the seat's surface: its own cushion or a neighbouring one at the same height (a gap between two)
        const surface = n.seat || Math.abs(b.max.y - top) < 0.03;
        if (surface && top - y > sink.depth) sink = { depth: top - y, what: name(n.f.o), ahead: +ahead.toFixed(3), bone: pts.bone[i / 3] };
        if (surface && legs.has(i / 3)) legsIn.add(i / 3);
        const kind = n.seat ? 'seat' : y > top + 0.03 && ahead > 0.12 ? 'table' : 'other';
        const key = n.f.o.uuid + kind;
        const k = hits.get(key) || { what: name(n.f.o), kind, depth: 0, verts: 0 };
        k.verts++;
        if (depth > k.depth) {
          // the deepest vertex, from the seat point: across (to the sitter's left), up from the seat top, ahead
          const side = (x - seat.at.x) * fwd.z - (z - seat.at.z) * fwd.x;
          k.deepest = [side, y - top, ahead].map((v) => +v.toFixed(3));
        }
        k.depth = Math.max(k.depth, depth);
        hits.set(key, k);
      }
    }
    const list = [...hits.values()].map((h) => ({ ...h, depth: +h.depth.toFixed(3) })).sort((a, b) => b.depth - a.depth);
    const tables = list.filter((h) => h.kind === 'table');
    return {
      seatTop: seat.top === null ? null : +seat.top.toFixed(3),
      hip: [seat.hip.x, seat.hip.y, seat.hip.z].map((v) => +v.toFixed(3)),
      at: [seat.at.x, seat.at.z].map((v) => +v.toFixed(3)),
      hipOff: +seat.off.toFixed(3), // how far the hips are from where the place seated them
      hipUp: seat.top === null ? null : +(seat.hip.y - seat.top).toFixed(3), // hips joint over the seat top
      sink: +sink.depth.toFixed(3),
      sinkInto: sink.what,
      sinkAhead: sink.ahead,
      sinkBone: sink.bone,
      under: under === Infinity ? null : +under.toFixed(3),
      legsIn: legs.size ? +(legsIn.size / legs.size).toFixed(3) : null,
      verts: pts.length / 3,
      worst: tables.length ? tables[0].depth : 0,
      over: tables.filter((h) => h.depth > TOL),
      other: list.filter((h) => h.kind === 'other' && h.depth > TOL).slice(0, 3),
    };
  }
  // the deeper of two frames into the seat, and the lower hips
  const low = (p, q) => (p === null || q === null ? null : Math.min(p, q));
  const deeper = (a, b) => ({
    ...(a.sink > b.sink ? { sink: a.sink, sinkInto: a.sinkInto } : { sink: b.sink, sinkInto: b.sinkInto }),
    hipUp: low(a.hipUp, b.hipUp),
    under: low(a.under, b.under),
    legsIn: a.legsIn === null || b.legsIn === null ? null : Math.max(a.legsIn, b.legsIn),
  });
  // the first frame after sitting (what a still or a paused game shows) and after the clips have settled
  const both = async (r) => {
    await frames(2);
    const a = measure(r);
    window.__advance(0.6);
    await frames(2);
    const b = measure(r);
    const w = a.worst > b.worst ? a : b;
    return { ...b, worst: w.worst, over: w.over, first: a.worst, settled: b.worst, hipOffMax: Math.max(a.hipOff, b.hipOff), ...deeper(a, b) };
  };
  const res = { placed: [], tried: [] };
  if (phase === 'placed') {
    // as placed by the place itself
    for (const [id, r] of Object.entries(rigs))
      if (r?.root && shown(r.root) && (r.seated || r.state === 'sit')) res.placed.push({ id, meshy: !!r.meshy });
    const before = res.placed.map((p) => measure(rigs[p.id]));
    window.__advance(0.6);
    await frames(2);
    res.placed.forEach((p, i) => {
      const a = before[i],
        b = measure(rigs[p.id]),
        w = a.worst > b.worst ? a : b;
      Object.assign(p, b, { worst: w.worst, over: w.over, first: a.worst, settled: b.worst, hipOffMax: Math.max(a.hipOff, b.hipOff), ...deeper(a, b) });
    });
    return res;
  }
  // every model body on every seat
  const seats = {};
  for (const [k, s] of Object.entries(P.seats || {})) if (s && s.top !== undefined) seats[k] = { ...s };
  for (const p of placed)
    if (p.seatTop !== null) {
      const r = rigs[p.id];
      seats['at_' + p.id] = { x: p.at[0], z: p.at[1], top: p.seatTop, ry: r.root.rotation.y, local: false };
    }
  if (scene.office) {
    P.capState?.('sit'); // Eric's chair back at his desk (on day 1 it starts in the machine room)
    const { EMI } = await import('./js/scenes/office.js');
    if (EMI.guest) seats.emi_guest = { ...EMI.guest };
    seats.lunch_eric = { x: 4.45, z: -2.3, top: 0.24, ry: Math.PI / 2 };
    seats.lunch_mio = { x: 5.95, z: -2.3, top: 0.24, ry: -Math.PI / 2 };
  }
  const bodies = Object.entries(rigs).filter(([, r]) => r?.meshy && r.sitAt);
  const vis = new Map(Object.entries(rigs).map(([id, r]) => [id, r?.root?.visible]));
  for (const [, r] of bodies) r.root.visible = false;
  for (const [sid, s] of Object.entries(seats)) {
    for (const [id, r] of bodies) {
      // seat coordinates are the place's own (the rig's parent space), except at_<id>: world
      let x = s.x,
        z = s.z;
      if (s.local === false && r.root.parent) {
        const v = r.root.parent.worldToLocal(new THREE.Vector3(s.x, 0, s.z));
        x = v.x;
        z = v.z;
      }
      // whoever sits there now steps out of the way while another body is tried
      const sitter = sid.startsWith('at_') && sid !== 'at_' + id ? rigs[sid.slice(3)] : null;
      if (sitter) sitter.root.visible = false;
      r.setState?.('idle');
      r.root.visible = true;
      r.sitAt(x, s.top, z, s.ry || 0);
      r.seated = true;
      res.tried.push({ seat: sid, id, ...(await both(r)) });
      r.root.visible = false;
      if (sitter) sitter.root.visible = vis.get(sid.slice(3));
    }
  }
  res.seats = seats;
  return res;
}

// a close still of one seat with its occupant (the place's own camera, eased right in)
async function closeShot(page, file, { who, seat }) {
  const ok = await page.evaluate(
    async ({ who, seat }) => {
      const g = window.__game,
        P = g.place;
      const rigs = { ...(P.people || {}), eric: g.player, mio: g.mioNpc };
      const r = rigs[who];
      if (!r) return false;
      if (!document.getElementById('seat-check-style'))
        document.head.insertAdjacentHTML('beforeend', '<style id="seat-check-style">.mark{display:none!important}</style>');
      if (seat) {
        r.setState?.('idle');
        r.root.visible = true;
        r.sitAt(seat.x, seat.top, seat.z, seat.ry || 0);
        r.seated = true;
      }
      const v = r.root.getWorldPosition(new (r.root.position.constructor)());
      if (who !== 'eric' && g.player !== r) g.player.root.visible = false;
      const c = P.cam;
      if (!c?.closeOn) return false;
      const local = c.toLocal ? c.toLocal(v) : [v.x, v.z];
      c.closeOn(Array.isArray(local) ? local : [v.x, v.z], +(globalThis.__seatZoom || 3.6), 0.45);
      c.snap(g.player.root.position);
      await new Promise((q) => setTimeout(q, 400));
      return true;
    },
    { who, seat },
  );
  if (ok) await page.screenshot({ path: file, type: 'jpeg', quality: 85 });
  return ok;
}

await withBrowserJob('seat-check', async (browser) => {
  for (const sc of SCENES.filter((s) => !ONLY || ONLY.includes(s.name))) {
    const context = await browser.newContext({ viewport: { width: +W, height: +H }, isMobile: phone, hasTouch: phone });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:8771/${base}/index.html?cap&q=1&${sc.q}${process.env.QS || ''}`, { timeout: 60000 });
    await page.waitForFunction(() => window.__done && window.__game?.place, null, { timeout: 120000 });
    await page.waitForTimeout(1500);
    const run = (phase, placed) => page.evaluate(inPage, { scene: sc, TOL, phase, placed }).catch((e) => ({ error: e.message }));
    const shoot = async (list) => {
      for (const s of SHOTS ? list : []) {
        const f = path.join(out, `${sc.name}--${s.tag}.jpg`);
        await closeShot(page, f, s).catch((e) => errors.push(`shot ${s.tag}: ${e.message}`));
      }
    };
    const one = await run('placed');
    if (one.error) fails.push(`${sc.name}: ${one.error}`);
    await shoot((one.placed || []).map((p) => ({ who: p.id, seat: null, tag: `${p.id}-placed` })));
    const two = one.error ? { tried: [] } : await run('tried', one.placed);
    if (two.error) fails.push(`${sc.name}: ${two.error}`);
    const res = { placed: one.placed || [], tried: two.tried || [], seats: two.seats || {} };
    log[sc.name] = res;
    // fails for whoever sits there in the game; any other body on the seat only reports (a seat to fix before
    // the story puts that person there)
    const say = (label, m, strict = true, player = false) => {
      const bad = [],
        others = [];
      if (m.hipOffMax > 0.1) bad.push(`hips ${m.hipOffMax} m off the seat point`);
      if (m.over.length) bad.push(m.over.map((o) => `${o.depth} m into ${o.what}`).join('; '));
      // the player on top of the seat, not in it: the hips joint over the seat top, the seat of the trousers no
      // deeper than SINK into it, and the lower legs hanging in front of it, not buried in it
      const sunk = [];
      if (m.hipUp !== null && m.hipUp < 0) sunk.push(`hips ${-m.hipUp} m below the seat top`);
      if (m.under !== null && m.under < -SINK) sunk.push(`seat of the body ${-m.under} m down into the seat`);
      if (m.legsIn !== null && m.legsIn > LEGS) sunk.push(`${Math.round(m.legsIn * 100)}% of the lower legs inside ${m.sinkInto}`);
      if (sunk.length) (strict && player ? bad : others).push(...sunk);
      if (bad.length) (strict ? fails : notes).push(`${sc.name} ${label}: ${bad.join('; ')}`);
      if (others.length) notes.push(`${sc.name} ${label}: ${others.join('; ')}`);
      const other = m.other.length ? `  (also ${m.other.map((o) => `${o.depth} into ${o.what}`).join('; ')})` : '';
      console.log(`${sc.name.padEnd(12)} ${label.padEnd(22)} seat ${m.seatTop} desk/table ${m.first} first frame, ${m.settled} settled, hips off ${m.hipOffMax}, hips up ${m.hipUp}, under ${m.under}, legs in ${m.legsIn} ${m.over.length ? 'OVERLAP' : 'ok'}${other}`);
    };
    for (const p of res.placed) say(`${p.id} as placed`, p, true, p.id === 'eric');
    for (const t of res.tried) say(`${t.id} on ${t.seat}`, t, t.seat === 'at_' + t.id || [MINE[t.seat]].flat().includes(t.id), t.id === 'eric');
    const placedAt = (who, s) => res.placed.some((p) => p.id === who && Math.hypot(p.at[0] - s.x, p.at[1] - s.z) < 0.15);
    await shoot(
      Object.entries(MINE)
        .flatMap(([sid, who]) => [who].flat().map((w) => [sid, w]))
        .filter(([sid, who]) => res.seats[sid] && !placedAt(who, res.seats[sid]))
        .map(([sid, who]) => ({ who, seat: res.seats[sid], tag: `${sid}-${who}` })),
    );
    if (errors.length) fails.push(`${sc.name} page errors: ${errors.slice(0, 3).join(' | ')}`);
    await context.close();
  }
}, { timeoutMs: 560000, gpuWaitMs: 300000 });
fs.writeFileSync(path.join(out, 'log.json'), JSON.stringify(log, null, 1));
if (SHOTS) {
  try {
    execFileSync('python3', [path.join(G, 'tools/seat-sheet.py'), out], { stdio: 'inherit' });
  } catch (e) {
    console.warn('sheet:', e.message);
  }
}
if (notes.length) console.log('Not seated there in the game, but would overlap:\n' + notes.join('\n'));
console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'PASS', `(${out})`);
process.exit(fails.length ? 1 : 0);
