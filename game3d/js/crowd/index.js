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
// The mix (Jørgen, 2026-10-02: "they come in waves and all walk the same way, it feels a bit artificial"): new walkers
// set off at random gaps, about as often as people leave, so the numbers drift instead of coming in a rush; each
// period's flows run every way, the commute only the biggest share; each walks at their own pace, some stop on the way
// (crowd/stops.js) and some walk in twos.
//
// Rules: they are never story targets (not in place.people or place.things, so no pin, no talk); they never push
// Eric or the story's people (crowd/motion.js); nobody appears or vanishes in view (new walkers start at a street end
// out of view or step out of a door, and leave the same way); while a scene plays nobody steps out of a door, nobody
// stops on the way, and walkers give Eric a wide berth; phones and the low tier have fewer (TIERS), with no sun shadows on phones.
import * as THREE from 'three';
import { CROWD } from './data.js';
import { makeBody } from './looks.js';
import { coarseGrid, routeBetween, snapFree, clearAt } from './paths.js';
import { walkStep, stride, idleLife, stalled, gliding } from './motion.js';
import { placeStill, stillSpots } from './still.js';
import { wantStop, startStop, stopBeside, stopStep, endStop } from './stops.js';
import { launcher } from './launch.js';
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
  let s = Math.floor(seed * 7919) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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
    // no sun shadow on phones and at quality 0, nor ever for the Meshy chibis (each would draw its whole skinned mesh
    // again into the shadow map): the contact shadows below stand under them
    if (tier.phone || tier.q === 0 || r.meshy) r.root.traverse((o) => o.isMesh && (o.castShadow = false));
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
    gap = Infinity,
    R = rnd(seed);
  const walkers = () => pool.filter((b) => b.state === 'walk');
  const st = {},
    { launch, cadence } = launcher({
      game,
      g,
      K,
      ends,
      routes,
      pool,
      inView,
      st,
    });

  function hide(b) {
    if (b.mate) b.mate.lead = null;
    if (b.lead) b.lead.mate = null;
    Object.assign(b, { mate: null, lead: null, stopped: null });
    b.state = 'off';
    b.r.root.visible = false;
    b.r._walk = false;
    b.r.seated = false;
  }
  // a fresh line from where a walker stands to its end, then its way out (the door, or past the street's end)
  function rejoin(b) {
    if ((b.rejoins = (b.rejoins || 0) + 1) > 2) return false;
    const p = b.r.root.position,
      from = snapFree(g, [p.x, p.z], 0.3),
      way = from && routeBetween(g, from, b.goal);
    if (!way) return false;
    Object.assign(b, {
      line: [[p.x, p.z], ...way, ...b.tail],
      i: 1,
      offA: false,
      best: Infinity,
      held: 0,
    });
    return true;
  }
  // the period's people: on entering everyone at once; when the clock moves while here, only out of view
  function configure(p, fresh) {
    period = p;
    spec = data.periods[p];
    counts = countsFor(spec, tier);
    R = rnd(seed + PERIOD_SEED[p]);
    Object.assign(st, { spec, counts, R });
    for (const b of pool)
      if (b.state === 'still' && (fresh || !inView(b.r.root.position.x, b.r.root.position.z))) hide(b);
    if (fresh) for (const b of pool) hide(b);
    if (!spec) return;
    spots ||= stillSpots(game, place, g, data, ends, [...routes.values()].filter(Boolean));
    placeStill(pool, spots, counts, spec, R, { fresh, inView, K, place, game });
    gap = cadence();
    cool = R() * gap;
    if (fresh) for (let i = 0; i < counts.walk * 2 && walkers().length < counts.walk; i++) launch(true);
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
    const ctx = { g, K, eric, ends, place };
    let n = 0;
    for (const b of pool) {
      if (b.state === 'off') continue;
      const p = b.r.root.position;
      const seen = inView(p.x, p.z);
      if (b.hold > 0) {
        if ((b.hold -= dt) > 0) continue; // not out yet (unseen, no shadow)
        b.r.root.visible = true;
      }
      if (b.state === 'walk' && b.stopped) {
        // stopped on the way: a phone, a shop window, a shoe, a word with the one they walk with (not in a scene)
        // (and on at once when someone in fixed choreography comes by: walkStep steps them out of the way)
        const by = list.some((o) => gliding(o) && Math.hypot(o.x - p.x, o.z - p.z) < 2 * K);
        if (scene || by || stopStep(b, dt, ctx)) endStop(b);
      } else if (b.state === 'walk') {
        // walking together: the second keeps beside the first
        const m = b.lead;
        if (m) {
          const q = m.r.root.position,
            y = b.r.root.rotation.y,
            ahead = (p.x - q.x) * Math.sin(y) + (p.z - q.z) * Math.cos(y);
          // into a door one after the other: the second drops back
          const door = b.toDoor && b.tail[0],
            near = door && Math.hypot(p.x - door[0], p.z - door[1]) < 2.5 * K;
          b.speed = near
            ? b.pace * 0.55
            : m.stopped
              ? b.pace
              : m.speed * Math.max(0.5, Math.min(1.35, 1 - (ahead / K) * 0.6));
        }
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
        b.walked += b.moved * dt;
        if (!scene && wantStop(b, ctx)) {
          startStop(b, R, ctx);
          if (b.mate?.state === 'walk' && !b.mate.stopped) stopBeside(b.mate, b, R, ctx);
        }
      } else if (seen) idleLife(b, dt);
      _m.makeTranslation(p.x, 0.006, p.z);
      blobs.setMatrixAt(n++, _m);
    }
    blobs.count = n;
    blobs.instanceMatrix.needsUpdate = true;
    // someone new at random gaps, about as often as people leave, so the numbers drift instead of coming in a rush;
    // while a scene plays only from a street's end, so the place doesn't empty and then fill in a wave after it
    if ((cool -= dt) <= 0) {
      const now = walkers().length;
      if (now < Math.ceil(counts.walk * 1.25)) launch(false, scene);
      // a little sooner while fewer are about than the period has, a little later while more are
      cool = Math.min(3, -Math.log(1 - R() * 0.95)) * gap * Math.min(1.3, Math.max(0.6, now / counts.walk));
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
