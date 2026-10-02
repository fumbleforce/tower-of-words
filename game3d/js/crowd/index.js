// The ambient crowd (Jørgen, 2026-10-02: "there should be plenty of people about, this is a well populated island
// ... dependent on the time of day"): background islanders in the outdoor places, walking between the ends of the
// streets and the doors of open buildings, sitting on benches, standing in pairs talking, waiting at a shut door.
// Who is about in each place and period is data (crowd/data.js; facts in docs/game/places.md, Who's there when).
//
//   await attachCrowd(game, place, name)   once, when the place is built, before the draw-call pass (lifecycle.js);
//                                         sets place.crowd (the bodies: movement and the draw-call pass see them)
//   place.ambient.enter(period)           on entering: everyone placed at once, nobody near Eric
//   (each frame)                          place.update runs the crowd after the place's own update
//
// Rules: they are never story targets (not in place.people or place.things, so no pin, no talk); they never push
// Eric or the story's people (crowd/motion.js); nobody appears or vanishes in view (new walkers start at a street end
// out of view or step out of a door, and leave the same way); while a scene plays nobody new comes and walkers give
// Eric a wide berth; phones and the low tier have fewer (TIERS), with no sun shadows on phones.
import * as THREE from 'three';
import { CROWD } from './data.js';
import { makeBody } from './looks.js';
import { coarseGrid, routeBetween, laneOf, snapFree, clearAt, lineLength, pointAlong } from './paths.js';
import { walkStep, stride, standPose, idleLife, stalled } from './motion.js';
import { placeStill, stillSpots } from './still.js';
import { bodies } from '../movement/shared.js';
import { sim } from '../sim.js';
import { qualityTier, isPhone } from '../settings.js';
import { nextFrame } from '../perf/slice.js';
import { blob } from '../engine.js';

// k: share of the data's counts; cap: most people at once
export const TIERS = {
  phone: [
    { k: 0.55, cap: 14 },
    { k: 0.75, cap: 18 },
    { k: 0.9, cap: 22 },
  ],
  desktop: [
    { k: 0.7, cap: 22 },
    { k: 0.85, cap: 30 },
    { k: 1, cap: 36 },
  ],
};
const Q = new URLSearchParams(location.search);
const TIER_OF = { low: 0, medium: 1, high: 2 };
export function crowdTier() {
  const q = Q.has('q') ? +Q.get('q') : (TIER_OF[qualityTier()] ?? 1);
  const phone = isPhone();
  return {
    ...TIERS[phone ? 'phone' : 'desktop'][Math.max(0, Math.min(2, q))],
    phone,
    q,
  };
}

// a period's numbers at this tier: walkers, sitters, chatting pairs and the queue, within the cap (walkers give first)
export function countsFor(spec, tier) {
  if (!spec) return { walk: 0, sit: 0, chat: 0, queue: 0 };
  const n = (v) => Math.round((v || 0) * tier.k);
  const c = {
    walk: n(spec.walk),
    sit: n(spec.sit),
    chat: n(spec.chat),
    queue: spec.queue ? n(spec.queue[1]) : 0,
  };
  if (spec.walk && !c.walk) c.walk = 1;
  let over = c.walk + c.sit + 2 * c.chat + c.queue - tier.cap;
  for (const k of ['walk', 'sit', 'queue', 'chat'])
    while (over > 0 && c[k] > (k === 'walk' ? 2 : 0)) {
      c[k]--;
      over -= k === 'chat' ? 2 : 1;
    }
  return c;
}

const KINDS = ['office', 'casual', 'elder', 'sport'];
const rnd = (seed) => {
  let s = (Math.abs(Math.floor(seed * 7919)) % 2147483646) + 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};
const hashName = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 9973, 7);

export async function attachCrowd(game, place, name) {
  const data = CROWD[name];
  const specs = data && Object.values(data.periods);
  if (!specs?.length || !place.nav || Q.has('nocrowd')) return null; // ?nocrowd: none (perf comparisons)
  const tier = crowdTier();
  const K = place.charScale || 1;
  // the pool: as many bodies as the busiest period needs, in a mix of the kinds its periods ask for
  let size = 0;
  const want = { office: 0, casual: 0, elder: 0, sport: 0 };
  for (const s of specs) {
    const c = countsFor(s, tier);
    size = Math.max(size, c.walk + c.sit + 2 * c.chat + c.queue);
    const tot = Object.values(s.who).reduce((a, b) => a + b, 0);
    for (const k of KINDS) want[k] = Math.max(want[k], ((s.who[k] || 0) / tot) * (c.walk + c.sit + 2 * c.chat));
    const jog = (s.flows || []).filter((f) => f[3] === 'jog').length;
    if (jog) want.sport = Math.max(want.sport, Math.min(c.walk, jog + 1));
  }
  const kinds = [];
  for (const k of KINDS) for (let i = 0; i < Math.round(want[k]); i++) kinds.push(k);
  while (kinds.length < size) kinds.push(kinds.length % 2 ? 'casual' : 'office');
  kinds.length = size;
  const seed = hashName(name);
  const pool = [];
  for (let i = 0; i < size; i++) {
    const r = makeBody(kinds[i], i + seed);
    r.ambient = true;
    r.root.visible = false;
    r.root.name = 'crowd';
    if (tier.phone || tier.q === 0) r.root.traverse((o) => o.isMesh && (o.castShadow = false));
    place.space.add(r.root);
    pool.push({ r, kind: kinds[i], state: 'off' });
    if (i % 3 === 2) await nextFrame(); // built a few at a time between frames
  }
  place.crowd = [...(place.crowd || []), ...pool.map((b) => b.r)];
  // contact shadows for all of them in one draw
  const proto = blob(0.5 * K, 0.35);
  const blobs = new THREE.InstancedMesh(proto.geometry, proto.material, size);
  blobs.rotation.x = 0;
  proto.geometry.rotateX(-Math.PI / 2);
  blobs.count = 0;
  blobs.frustumCulled = false;
  blobs.renderOrder = 1;
  blobs.userData.noOutline = true;
  place.space.add(blobs);

  // the walking lines between the ends, found once (in slices between frames)
  place.scene.updateMatrixWorld(true);
  const g = coarseGrid(place.nav);
  await nextFrame();
  const local = (v) => place.space.worldToLocal(v);
  const ends = {};
  for (const [id, e] of Object.entries(data.ends)) {
    if (Array.isArray(e)) {
      const p = snapFree(g, e, 0.45);
      if (p) ends[id] = { at: p };
      continue;
    }
    const t = place.things[e.door];
    if (!t) continue;
    // the door itself, and the floor outside it (the thing's spot, unless the data names the outside: the head
    // office's spot is inside its lobby)
    const a = local(t.anchor(new THREE.Vector3())),
      sp = e.out || t.spot?.();
    const out = sp && snapFree(g, sp, 0.35);
    if (out) ends[id] = { at: out, door: [a.x, a.z] };
  }
  const routes = new Map();
  for (const s of specs)
    for (const [a, b] of s.flows || []) {
      const key = a + '>' + b;
      if (routes.has(key) || !ends[a] || !ends[b]) continue;
      const line = routeBetween(g, ends[a].at, ends[b].at);
      routes.set(key, line && line.length > 1 ? line : null);
      await nextFrame();
    }
  // where people stand and sit: worked out on the first entry, once the finds and every thing are in place
  let spots = null;

  const V = new THREE.Vector3(),
    frustum = new THREE.Frustum(),
    M = new THREE.Matrix4(),
    sphere = new THREE.Sphere(new THREE.Vector3(), 1.4 * K);
  const inView = (x, z) => {
    sphere.center.copy(place.space.localToWorld(V.set(x, 0.9 * K, z)));
    return frustum.intersectsSphere(sphere);
  };
  let period = null,
    counts = null,
    spec = null,
    cool = 0,
    R = rnd(seed);
  const walkers = () => pool.filter((b) => b.state === 'walk');
  const free = () => pool.filter((b) => b.state === 'off');

  function hide(b) {
    b.state = 'off';
    b.r.root.visible = false;
    b.r._walk = false;
    b.r.seated = false;
  }
  // a walker for one of the period's flows: from the start of its line (s = 0) or part way along it
  function launch(fresh) {
    const flows = (spec.flows || []).filter((f) => routes.get(f[0] + '>' + f[1]));
    const tot = flows.reduce((a, f) => a + f[2], 0);
    for (let tries = 0; tries < 6 && flows.length; tries++) {
      let x = R() * tot,
        f = flows[0];
      for (const fl of flows)
        if ((x -= fl[2]) <= 0) {
          f = fl;
          break;
        }
      const [from, to, , kind = 'walk'] = f;
      const A = ends[from],
        B = ends[to];
      // each walker its own lane, right of the line by up to a metre and a half where the way is wide
      const lane = laneOf(g, routes.get(from + '>' + to), (0.15 + R() * 0.95) * K);
      // a new walker steps out of a door, or comes in along the street from further out than anyone can see
      let lead = A.door;
      if (!fresh && !A.door) {
        const [ax, az] = lane[0],
          [bx, bz] = lane[1],
          l = Math.hypot(ax - bx, az - bz) || 1;
        const outs = [0, 3, 6, 9].map((d) => [ax + ((ax - bx) / l) * d, az + ((az - bz) / l) * d]);
        lead = outs.find((p) => !inView(...p));
        if (!lead) continue;
        if (lead === outs[0]) lead = null;
      }
      const body = pickBody(kind === 'jog');
      if (!body) continue;
      const line = [...(lead ? [lead] : []), ...lane, ...(B.door ? [B.door] : [])];
      if (!B.door) {
        // on past the street's end, out of the chunk, until out of view
        const [px, pz] = line[line.length - 2],
          [qx, qz] = line[line.length - 1],
          l = Math.hypot(qx - px, qz - pz) || 1;
        line.push([qx + ((qx - px) / l) * 5, qz + ((qz - pz) / l) * 5]);
      }
      let at = { x: line[0][0], z: line[0][1], leg: 1 };
      if (fresh) {
        const L = lineLength(lane);
        at = pointAlong(lane, L * (0.08 + R() * 0.84));
        at.leg += lead ? 1 : 0;
        if (!clearOfAll(at.x, at.z, 3.5 * K, 1.0 * K)) continue;
      }
      const r = body.r;
      standPose(r);
      r.root.position.set(at.x, 0, at.z);
      const [nx, nz] = line[at.leg];
      r.root.rotation.y = Math.atan2(nx - at.x, nz - at.z);
      r.root.visible = true;
      Object.assign(body, {
        state: 'walk',
        line,
        i: at.leg,
        kind,
        offA: !!lead,
        offZ: true,
        toDoor: !!B.door,
        goal: B.at,
        tail: line.slice(-1), // the door, or the point past the street's end
        more: 0,
        best: Infinity,
        held: 0,
        legAt: -1,
        ghost: false,
        rejoins: 0,
        speed: (kind === 'jog' ? 2.3 : kind === 'stroll' ? 0.75 : 1.0 + R() * 0.3) * K,
        ph: R() * 6,
        moved: 0,
      });
      return true;
    }
    return false;
  }
  // a fresh line from where a walker stands to its end, then its way out (the door, or past the street's end)
  function rejoin(b) {
    if ((b.rejoins = (b.rejoins || 0) + 1) > 2) return false;
    const p = b.r.root.position,
      from = snapFree(g, [p.x, p.z], 0.3),
      way = from && routeBetween(g, from, b.goal);
    if (!way) return false;
    Object.assign(b, { line: [[p.x, p.z], ...way, ...b.tail], i: 1, offA: false, best: Infinity, held: 0 });
    return true;
  }
  function pickBody(sport) {
    const f = free();
    const fit = f.filter((b) => (sport ? b.kind === 'sport' : b.kind !== 'sport' || R() < 0.25));
    const list = fit.length ? fit : sport ? [] : f;
    if (!list.length) return null;
    const w = list.map((b) => (spec.who[b.kind] || 0.3) + 0.05);
    let x = R() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < list.length; i++) if ((x -= w[i]) <= 0) return list[i];
    return list[list.length - 1];
  }
  function clearOfAll(x, z, fromEric, fromOthers) {
    const e = game.player.root.position;
    if (Math.hypot(e.x - x, e.z - z) < fromEric) return false;
    return pool.every(
      (b) => b.state === 'off' || Math.hypot(b.r.root.position.x - x, b.r.root.position.z - z) >= fromOthers,
    );
  }

  // the period's people: on entering everyone at once; when the clock moves while here, only out of view
  function configure(p, fresh) {
    period = p;
    spec = data.periods[p];
    counts = countsFor(spec, tier);
    R = rnd(seed + PERIOD_SEED[p]);
    for (const b of pool)
      if (b.state === 'still' && (fresh || !inView(b.r.root.position.x, b.r.root.position.z))) hide(b);
    if (fresh) for (const b of pool) hide(b);
    if (!spec) return;
    spots ||= stillSpots(game, place, g, data, ends, [...routes.values()].filter(Boolean));
    placeStill(pool, spots, counts, spec, R, { fresh, inView, K, place, game });
    if (fresh) for (let i = 0; i < counts.walk; i++) launch(true);
  }
  const PERIOD_SEED = {
    early: 1,
    morning: 2,
    lunch: 3,
    afternoon: 4,
    evening: 5,
  };

  const _m = new THREE.Matrix4();
  function update(dt) {
    if (game.place !== place || !spec) return;
    if (sim.period !== period) configure(sim.period, false);
    const cam = place.camera;
    M.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    frustum.setFromProjectionMatrix(M);
    const scene = game.busy && !game.transition && !game.busyTrip;
    const list = bodies(game),
      eric = list.find((b) => b.root === game.player.root);
    const wide = scene ? 0.9 * K : 0;
    let n = 0;
    for (const b of pool) {
      if (b.state === 'off') continue;
      const p = b.r.root.position;
      const seen = inView(p.x, p.z);
      if (b.state === 'walk') {
        b.onGrid = !(b.offA && b.i === 1) && !(b.offZ && b.i >= b.line.length - 1);
        // in a scene at the door they are going to (the dorm hall's stairs): they wait for Eric, out of his way
        const door = b.tail[0];
        b.wait =
          scene &&
          b.toDoor &&
          !!eric &&
          Math.hypot(eric.x - door[0], eric.z - door[1]) < 3.5 * K &&
          Math.hypot(p.x - door[0], p.z - door[1]) > 0.8 * K;
        if (b.wait) b.held = 0;
        let done = walkStep(game, b, dt, list, eric, wide);
        // held up (a jam at a corner, the story's people in the way) for a while: a new way round from here; with
        // none, gone if nobody sees, or on through; through a door once at it
        if (stalled(b, dt) && !rejoin(b)) {
          if (!seen) {
            hide(b);
            continue;
          }
          b.ghost = true; // in sight with no way round: on through the other passers-by (never through Eric)
          b.held = 0;
        }
        if (b.toDoor && b.i >= b.line.length - 1 && Math.hypot(door[0] - p.x, door[1] - p.z) < 0.5 * K) done = true;
        // past a street's end and still in sight (a camera that sees the edge): on the same way a while longer
        if (done && seen && !b.toDoor && (b.more = (b.more || 0) + 1) < 4) {
          const [px, pz] = b.line[b.line.length - 2],
            [qx, qz] = b.line[b.line.length - 1];
          b.line.push([qx + (qx - px), qz + (qz - pz)]);
          done = false;
        }
        // gone: through the door, or out past the street's end where nobody sees
        if (done || (b.i >= b.line.length - 1 && !seen && b.offZ)) {
          hide(b);
          continue;
        }
        stride(b, dt, seen);
      } else if (seen) idleLife(b, dt);
      _m.makeTranslation(p.x, 0.006, p.z);
      blobs.setMatrixAt(n++, _m);
    }
    blobs.count = n;
    blobs.instanceMatrix.needsUpdate = true;
    // someone new now and then, while there are fewer about than the period has (not during a scene)
    cool -= dt;
    if (!scene && cool <= 0 && walkers().length < counts.walk) {
      launch(false);
      cool = (0.5 + R() * 1.5) * (6 / Math.max(3, counts.walk));
    }
  }
  const own = place.update.bind(place);
  place.update = (dt, t) => {
    own(dt, t);
    update(dt);
  };
  place.ambient = {
    pool,
    ends,
    routes,
    get spots() {
      return spots;
    },
    tier,
    enter: (p) => configure(p, true),
    counts: () => ({
      period,
      ...counts,
      walking: walkers().length,
      still: pool.filter((b) => b.state === 'still').length,
    }),
    clearAt: (x, z) => clearAt(g, x, z),
  };
  return place.ambient;
}
