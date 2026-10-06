import * as THREE from 'three';
import { FINDS, eligible, seenFlag, targetId, writtenNode, withoutInterruptedLook } from './model.js';
import { makeObject } from './objects.js';
import { placement } from './placement.js';
import { readNote } from './note.js';
import { flags, cond } from '../narrative/state.js';
import { sim } from '../sim.js';
import { reachableNear } from '../movement/navigation.js';
import { actionShot } from '../places/day4/shot.js';

const wrapped = new WeakSet();
export function installFlavorFinds(game) {
  game.hooks.flavorFind = (args) => game.place.flavorFinds.run(args);
}
function wrapSnapshots(game) {
  if (wrapped.has(game)) return;
  wrapped.add(game);
  // This pack explicitly restarts an interrupted look from the untouched object. Other story checkpoints are unchanged.
  const snapshot = game.runner.snapshot.bind(game.runner);
  game.runner.snapshot = () => withoutInterruptedLook(snapshot());
}
export function attachFlavorFinds(game, P, name, buildMarkers) {
  const here = FINDS.filter((f) => f.place === name);
  if (!here.length) return;
  wrapSnapshots(game);
  const props = new Map();
  const shot = actionShot(P);
  const available = (f) => eligible(f, sim.day, cond);
  function merge(story) {
    for (const f of here) {
      const id = targetId(f.id);
      if (available(f)) {
        story.nodes[f.node] = writtenNode(f);
        story.on['talk:' + id] = f.node;
      } else {
        delete story.nodes[f.node];
        delete story.on['talk:' + id];
      }
    }
  }
  function sync(story) {
    for (const f of here) {
      const id = targetId(f.id);
      if (!available(f)) {
        if (props.has(f.id)) props.get(f.id).root.visible = false;
        delete P.things[id];
        continue;
      }
      if (!props.has(f.id)) {
        const at = placement(P, f),
          prop = makeObject(f.id);
        prop.root.position.set(at.x, at.y, at.z);
        prop.root.rotation.y = at.yaw;
        P.space.add(prop.root);
        prop.at = at;
        prop.stand = reachableNear(P.nav, P.start[0], P.start[1], at.at[0], at.at[1]) || at.at;
        props.set(f.id, prop);
      }
      const prop = props.get(f.id);
      prop.root.visible = true;
      if (flags[seenFlag(f.id)]) prop.move(1, true);
      P.things[id] = {
        label: f.label,
        kind: 'thing small',
        verb: 'Look',
        pin: 'near',
        anchor: (v) => prop.root.getWorldPosition(v),
        spot: () => prop.stand,
        face: () => [prop.at.x, prop.at.z],
        enabled: () => available(f) && !flags[seenFlag(f.id)],
      };
    }
    if (story) merge(story);
  }
  const update = P.update;
  P.update = function (...args) {
    update?.apply(this, args);
    shot.update();
  };
  const period = P.onPeriod;
  P.onPeriod = function (...args) {
    period?.apply(this, args);
    sync(game.place === P ? game.story : null);
    if (game.place === P) buildMarkers(P);
  };
  const restore = P.restoreState;
  P.restoreState = function (...args) {
    restore?.apply(this, args);
    for (const prop of props.values()) prop.reset();
    sync(game.place === P ? game.story : null);
  };
  P.flavorFinds = {
    sync,
    props,
    async run({ id, state, text }) {
      const f = here.find((f) => f.id === id),
        prop = props.get(id);
      if (!f || !prop || !available(f)) throw new Error(`Unavailable flavor find: ${id}`);
      if (state === 'read') return readNote(game.ui, text);
      if (state === 'look') {
        const player = game.player.root.position,
          a = prop.at;
        const point = [(a.x + player.x) / 2, (a.z + player.z) / 2];
        const span = Math.max(1.7, Math.hypot(a.x - player.x, a.z - player.z) + 0.9);
        const v = THREE.MathUtils.degToRad(P.camera.fov) / 2;
        const distance = Math.max(2.2 / (2 * Math.tan(v)), span / (2 * Math.tan(v) * P.camera.aspect));
        shot.focus(point, distance, Math.max(0.55, a.y * 0.7), a.shotYaw ?? a.yaw + 0.9, a.shotElev ?? 0.75);
        await game.hooks.gesture({ who: 'eric', kind: 'point' });
        await game.tween(0.7, (k) => prop.move(k));
      } else if (state === 'putBack') await game.tween(0.6, (k) => prop.move(k, true));
      else throw new Error(`Unknown flavor find action: ${state}`);
    },
  };
  // Period/eligibility is checked again on entry; no target is added before its condition holds.
  sync(null);
}
