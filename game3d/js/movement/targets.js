import { BODY, bodies, TALK, angDiff } from './shared.js';
import { clearOf, freeNear } from './navigation.js';
import { spaceFrom } from './crowd.js';
import * as THREE from 'three';

// A way round someone standing in a chibi walk's way: a point beside them (right side first), clear of the walls and
// of everyone else, for walkPerson to go through before carrying on to its waypoint. Null if there's no room.
export function detourPoint(game, rig, b, [tx, tz]) {
  const P = game && game.place;
  if (!P) return null;
  const K = P.charScale || 1,
    me = BODY * K,
    p = rig.root.position;
  const dx = tx - p.x,
    dz = tz - p.z,
    dl = Math.hypot(dx, dz) || 1,
    fx = dx / dl,
    fz = dz / dl;
  const others = bodies(game).filter((o) => o.root !== rig.root && o !== b);
  let best = null,
    bs = 1e9;
  for (const side of [1, -1])
    for (const k of [1.0, 1.35, 1.7]) {
      const off = (b.r + me) * k + 0.05,
        cx = b.x - fz * off * side,
        cz = b.z + fx * off * side;
      if (P.nav && (!P.nav.free(cx, cz, P.nav.R) || !P.nav.clear([p.x, p.z], [cx, cz]))) continue; // and a straight way there
      if (!clearOf(others, cx, cz, me)) continue;
      const cost = Math.hypot(cx - p.x, cz - p.z) + Math.hypot(tx - cx, tz - cz) + (side < 0 ? 0.05 : 0);
      if (cost < bs) {
        bs = cost;
        best = [cx, cz];
      }
    }
  return best;
}

// A walk whose end is someone's own position ("walk to Eric") stops at a talking distance in front of them, on the
// walker's side, instead of on top of them. Other ends are returned as they are.
// Any other end within arm's length of Eric (a spot behind his chair while he sits there) moves to the nearest free
// floor at arm's length (SPACE), not more than 0.9 away (Jørgen, 2026-09-29: "models just constantly being too close to
// each other"). Not in the lift cab, whose spots are set by the ride.
export function standOff(game, rig, [x, z]) {
  const P = game && game.place;
  if (!P || !P.space) return [x, z];
  const K = P.charScale || 1,
    from = rig.root.position;
  const others = bodies(game).filter((b) => b.root !== rig.root);
  const on = others.find((b) => Math.hypot(b.x - x, b.z - z) < b.r);
  let tx = x,
    tz = z;
  if (on) {
    const d = Math.hypot(from.x - on.x, from.z - on.z) || 1,
      D = TALK * K;
    tx = on.x + ((from.x - on.x) / d) * D;
    tz = on.z + ((from.z - on.z) / d) * D;
    if (P.nav && !P.nav.free(tx, tz, P.nav.R + 0.02)) [tx, tz] = freeNear(P.nav, others, tx, tz, BODY * K);
  }
  const ok = spaceFrom(game, rig.root);
  if (ok && !ok(tx, tz)) {
    const q = freeNear(
      P.nav,
      others.filter((b) => b.id !== 'tama'),
      tx,
      tz,
      BODY * K,
      ok,
    );
    if (ok(q[0], q[1]) && Math.hypot(q[0] - tx, q[1] - tz) < 0.9) [tx, tz] = q;
  }
  return [tx, tz];
}

// ---------- talking to someone ----------
// Where Eric should stand to talk to a standing person: a talking distance away, on the side he comes from, leaning
// toward their front (no walking round behind someone to reach their face); never inside furniture or another person. Null for seated people (their
// places keep hand-placed spots) and for things. A thing with a `rig` (a stray cat, creatures/pet.js) is approached
// like Tama: close beside her, wherever there is free floor round her (`dists`, its own distances to try).
export function approachSpot(game, item) {
  const P = game.place;
  if (!P || !item || !(item.rig || /person/.test(item.kind || ''))) return null;
  // A counter can require an authored visitor position, even for a standing person.
  if (item.fixedSpot) return item.spot?.() || null;
  const r = item.rig ? item.rig() : P.people && P.people[item.id];
  if (!r || !r.root || !r.root.visible) return null;
  const seatedNow = !!r.seated || (!!r.hips && r.root.position.y > 0.05);
  const nav = P.nav,
    K = P.charScale || 1,
    me = game.player.root.position;
  // their place and heading in the walk grid's space (a rig can sit inside a sub-group of the place)
  const c = r.root.getWorldPosition(new THREE.Vector3());
  P.space.worldToLocal(c);
  const f = new THREE.Vector3(0, 0, 1).applyQuaternion(r.root.getWorldQuaternion(new THREE.Quaternion()));
  f.applyQuaternion(P.space.getWorldQuaternion(new THREE.Quaternion()).invert());
  const x = c.x,
    z = c.z,
    yaw = Math.atan2(f.x, f.z);
  const cat = item.id === 'tama' || !!item.rig;
  const D = (cat ? 0.5 : TALK + (seatedNow ? 0.08 : 0)) * K; // seated: their knees reach into the aisle
  const others = bodies(game).filter((b) => b.root !== r.root && b.root !== game.player.root);
  const toMe = Math.atan2(me.x - x, me.z - z);
  // a cat is small: he keeps out from between her and the camera, so she stays in sight while he pets her
  const cam = cat && P.camera ? P.space.worldToLocal(P.camera.getWorldPosition(new THREE.Vector3())) : null,
    toCam = cam ? Math.atan2(cam.x - x, cam.z - z) : 0,
    hides = (a) => (cam ? Math.max(0, Math.PI / 2 - Math.abs(angDiff(a, toCam))) * 1.8 : 0);
  const cands = [];
  for (const dist of item.dists ? item.dists.map((k) => k * K) : [D, D * 0.85, D * 1.2])
    for (let i = 0; i < 16; i++) {
      const a = yaw + (i / 16) * Math.PI * 2,
        cx = x + Math.sin(a) * dist,
        cz = z + Math.cos(a) * dist;
      if (nav && !nav.free(cx, cz, nav.R + 0.02)) continue;
      if (!clearOf(others, cx, cz, BODY * K)) continue;
      cands.push([
        Math.abs(angDiff(a, yaw)) * 0.45 +
          Math.abs(angDiff(a, toMe)) * 0.75 +
          Math.hypot(cx - me.x, cz - me.z) * 0.15 +
          Math.abs(dist - D) * 2 +
          hides(a),
        cx,
        cz,
      ]);
    }
  cands.sort((p, q) => p[0] - q[0]);
  // the best one he can actually walk to
  for (const [, cx, cz] of cands.slice(0, 8)) {
    if (!nav) return [cx, cz];
    const path = nav.path(me.x, me.z, cx, cz),
      end = path && path[path.length - 1];
    if (end && Math.hypot(end[0] - cx, end[1] - cz) < 0.15) return [cx, cz];
  }
  return null;
}

// ---------- tapping people ----------
// A tap near a person, or on the floor where the current goal is used, picks them: the distance from the tap to their body (a capsule from the feet to the head,
// as wide as the body on screen plus a finger's margin) or to their pin. People win over things and the floor.
export function pickPerson(game, clientX, clientY, canvas) {
  const P = game.place;
  if (!P || !game.markers) return null;
  const rect = canvas.getBoundingClientRect(),
    W = rect.width,
    H = rect.height,
    cam = P.camera;
  const scr = (v) => {
    v.project(cam);
    return [((v.x + 1) / 2) * W + rect.left, ((1 - v.y) / 2) * H + rect.top];
  };
  const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
  let best = null,
    bd = 1e9;
  for (const m of game.markers.list) {
    if (!/person/.test(m.kind || '') || !(typeof m.enabled === 'function' ? m.enabled() : m.enabled)) continue;
    const r = P.people && P.people[m.id];
    if (!r || !r.root || !r.root.visible) continue;
    const foot = new THREE.Vector3();
    r.root.getWorldPosition(foot);
    const head = m.anchor(new THREE.Vector3());
    const small = /small/.test(m.kind || '');
    const [fx, fy] = scr(foot.clone()),
      [hx, hy] = scr(head.clone());
    const side = scr(foot.clone().addScaledVector(right, (small ? 0.2 : 0.3) * (P.charScale || 1)));
    const half = Math.max(small ? 18 : 22, Math.hypot(side[0] - fx, side[1] - fy)) + 12; // body half-width + finger
    // distance from the tap to the segment feet -> head
    const sx = hx - fx,
      sy = hy - fy,
      L = sx * sx + sy * sy || 1,
      t = Math.max(0, Math.min(1, ((clientX - fx) * sx + (clientY - fy) * sy) / L));
    const d = Math.hypot(clientX - (fx + sx * t), clientY - (fy + sy * t));
    const pin = Math.hypot(clientX - hx, clientY - (hy - 30));
    // the current goal wins a close call (a tap between two people usually means the one the game points at)
    const score = Math.min(d / half, pin / 34) * (m.goal && m.goal() ? 0.7 : 1);
    if (score < 1 && score < bd) {
      bd = score;
      best = m;
    }
  }
  // a tap on the floor where the goal is to be used (its spot, the ring the game draws there) means the goal
  for (const m of game.markers.list) {
    if (!(m.goal && m.goal()) || !(typeof m.enabled === 'function' ? m.enabled() : m.enabled) || !m.spot) continue;
    const sp = m.spot();
    if (!sp) continue;
    const v = new THREE.Vector3(sp[0], P.floorY || 0, sp[1]);
    P.space.localToWorld(v);
    const [sx, sy] = scr(v),
      d = (Math.hypot(clientX - sx, clientY - sy) / 40) * 0.7;
    if (d < 1 && d < bd) {
      bd = d;
      best = m;
    }
  }
  return best;
}

// Something sitting on a seat (the cat on Eric's chair, which "comes with it") hops down onto free floor beside it,
// clear of everyone, before someone sits there and not onto her. Nothing when it isn't on that seat.
export function hopOff(game, obj, seat) {
  const P = game.place;
  if (obj.parent !== seat) return;
  const at = P.space.worldToLocal(seat.getWorldPosition(new THREE.Vector3()));
  P.space.attach(obj);
  obj.position.y = 0;
  if (obj.userData.head) obj.userData.head.rotation.x = 0;
  const others = bodies(game).filter((b) => b.root !== obj && b.root !== game.player.root);
  [obj.position.x, obj.position.z] = freeNear(P.nav, others, at.x + 0.55, at.z + 0.3, 0.3 * (P.charScale || 1));
}
