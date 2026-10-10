// What a click, tap or hover is on (Jørgen, 2026-10-10: "things that have interaction should be clickable, not just the
// marker, the whole object/person ... The exit door out of security, the door "area" should be clickable, right now
// only the top of the doorframe is clickable"). docs/game/controls-and-ui.md, Interact.
//
// One rule for every target in the markers list, in this order:
//   1. its own meshes as drawn: the nearest visible mesh of any target under the cursor (a hidden mesh never counts,
//      so a body a plugin hides is not picked through, and the one shown in its place is)
//   2. its pick volume, when no mesh of any target was under the cursor:
//      - a person: a box round the whole body as it stands now (its visible meshes, and a skinned body's bones), so
//        the gaps between arms and legs and a walking figure's outline all count
//      - a doorway (a door, the lift, stairs, or an exit marked `doorway` in pin-kinds.js TRAVEL_PINS): a box filling the opening
//        from the floor to just over the pin, as wide as a door, facing the spot Eric uses it from
// A volume is plain maths, not a mesh: nothing is added to the scene, so it never draws. Things are picked by their
// own meshes only (rule 1): a box round a counter would swallow floor clicks inside it. A thing whose meshes are merged
// into the place (no object of its own) can stand in a box the same way: `pickBox: { w, h }` on the thing, metres wide
// and high, from the floor under its pin, facing its spot (the plaza's notice board).
//
//   makePickable(object3d, itemId)  something else that shows the target `itemId` (a plugin's body standing in for a
//                                   person, a private pin's prop): its meshes are picked and outlined as the target's,
//                                   and for a person it joins the body's box. Returns a function that undoes it.
//   installPicking(game, objsOf)    { modelAt(raycaster) }: the target a ray is on, or null (also game.pickAt)
import * as THREE from 'three';
import { travelOf } from './pin-kinds.js';

const extra = new Map(); // item id -> Set of objects made pickable for it
export function makePickable(object3d, itemId) {
  if (!object3d || !itemId) return () => {};
  if (!extra.has(itemId)) extra.set(itemId, new Set());
  extra.get(itemId).add(object3d);
  return () => extra.get(itemId)?.delete(object3d);
}

// the objects made pickable for `id` that hang in the current place
export function pickablesOf(game, id) {
  const set = extra.get(id),
    root = game.place?.space;
  if (!set || !root) return [];
  const out = [];
  for (const o of set) {
    let p = o;
    while (p && p !== root) p = p.parent;
    if (p) out.push(o);
  }
  return out;
}

// a mesh that is shown: it and every parent up to `top` visible
function shown(o, top) {
  for (let p = o; p; p = p.parent) {
    if (!p.visible) return false;
    if (p === top) return true;
  }
  return true;
}
// a stand-in that rays are meant to pass (a shadow-only proxy, a batch drawn for parts that are picked themselves)
const passes = (o) => Object.prototype.hasOwnProperty.call(o, 'raycast') && o.raycast.length === 0;

const isPerson = (m) => /person/.test(m.kind || '');
const DOOR_KINDS = new Set(['door', 'lift', 'stairs']);
const DOOR_W = 1.2, // metres: a door and its frame
  DOOR_OVER = 0.25, // above the pin's anchor (it sits at the top of the opening)
  DOOR_DEPTH = 0.5,
  BONE_PAD = 0.12; // round a skinned body's bones: the flesh and clothes on them

const _m = new THREE.Matrix4(),
  _inv = new THREE.Matrix4(),
  _v = new THREE.Vector3(),
  _q = new THREE.Quaternion(),
  _s = new THREE.Vector3(),
  _b = new THREE.Box3(),
  _ray = new THREE.Ray(),
  _hit = new THREE.Vector3();

// the box round everything shown under `objs`, in the frame `frame` (a world matrix without scale)
function bodyBox(objs, frame, out) {
  out.makeEmpty();
  _inv.copy(frame).invert();
  for (const top of objs)
    top.traverseVisible((o) => {
      if (!o.isMesh || o.userData.noOutline || passes(o) || !o.geometry) return;
      if (o.isSkinnedMesh && o.skeleton) {
        for (const bone of o.skeleton.bones) {
          _v.setFromMatrixPosition(bone.matrixWorld).applyMatrix4(_inv);
          _b.min.copy(_v).subScalar(BONE_PAD);
          _b.max.copy(_v).addScalar(BONE_PAD);
          out.union(_b);
        }
        return;
      }
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      _b.copy(o.geometry.boundingBox).applyMatrix4(_m.multiplyMatrices(_inv, o.matrixWorld));
      out.union(_b);
    });
  return out;
}

// the distance along `ray` (world) to `box` in the frame `frame`, or Infinity
function rayBox(ray, box, frame) {
  if (box.isEmpty()) return Infinity;
  _ray.copy(ray).applyMatrix4(_inv.copy(frame).invert());
  if (!_ray.intersectBox(box, _hit)) return Infinity;
  return _hit.applyMatrix4(frame).distanceTo(ray.origin);
}

export function installPicking(game, objsOf) {
  const box = new THREE.Box3(),
    frame = new THREE.Matrix4(),
    a = new THREE.Vector3(),
    s = new THREE.Vector3();

  // a person's body box and its frame (their root's place and turn, unscaled), or false
  function personVolume(m) {
    const P = game.place,
      r = P.people?.[m.id],
      t = P.things?.[m.id];
    const objs = [r?.root?.visible ? r.root : t?.obj?.visible ? t.obj : null, ...pickablesOf(game, m.id)].filter(
      Boolean,
    );
    if (!objs.length) return false;
    objs[0].updateWorldMatrix(true, true);
    objs[0].matrixWorld.decompose(_v, _q, _s);
    frame.compose(_v, _q, _s.set(1, 1, 1));
    bodyBox(objs, frame, box);
    return !box.isEmpty();
  }

  // a doorway's box (or a thing's pickBox): the opening under its pin, facing the spot it is used from, or false
  function boxVolume(m) {
    const P = game.place,
      t = P.things?.[m.id];
    if (!t?.anchor) return false;
    const own = t.pickBox || null,
      way = own ? null : travelOf(P.name, m.id, t);
    if (!own && !way?.doorway && !DOOR_KINDS.has(way?.kind)) return false;
    const scale = P.space.getWorldScale(s).y;
    t.anchor(a);
    const floor = P.space.localToWorld(_v.set(0, P.floorY || 0, 0)).y;
    // facing: from the opening toward the spot in front of it
    let yaw = 0;
    const sp = t.spot?.();
    if (sp) {
      const f = P.space.localToWorld(_v.set(sp[0], P.floorY || 0, sp[1]));
      if (Math.hypot(f.x - a.x, f.z - a.z) > 1e-3) yaw = Math.atan2(f.x - a.x, f.z - a.z);
    }
    frame.compose(_v.set(a.x, floor, a.z), _q.setFromAxisAngle(_s.set(0, 1, 0), yaw), _s.set(1, 1, 1));
    const w = (own?.w ?? DOOR_W) * scale,
      h = own?.h != null ? own.h * scale : a.y - floor + DOOR_OVER * scale,
      d = DOOR_DEPTH * scale;
    box.min.set(-w / 2, 0, -d / 2);
    box.max.set(w / 2, h, d / 2);
    return true;
  }

  function modelAt(ray) {
    if (!game.place || !game.markers) return null;
    ray.layers.enable(31); // original interactive meshes remain pickable when batched
    let best = null,
      bd = Infinity;
    // 1. the meshes as drawn
    for (const m of game.markers.list) {
      if (!m.enabled()) continue;
      for (const o of objsOf(m)) {
        const hit = ray.intersectObject(o, true).find((h) => shown(h.object, o));
        if (hit && hit.distance < bd) {
          bd = hit.distance;
          best = m;
        }
      }
    }
    if (best) return best;
    // 2. the volumes
    for (const m of game.markers.list) {
      if (!m.enabled()) continue;
      const vol = isPerson(m) ? personVolume(m) : boxVolume(m);
      if (!vol) continue;
      const d = rayBox(ray.ray, box, frame);
      if (d < bd) {
        bd = d;
        best = m;
      }
    }
    return best;
  }
  game.pickAt = modelAt; // for the checks (tools/pick-check.mjs)
  return { modelAt };
}
