import * as THREE from 'three';
import { CROWD_TALK } from '../../story/crowd.js';
import { makePickable } from '../gameplay/pick-volumes.js';
import { stopGait } from '../movement/gait.js';
import { inFront, blocking, reactionMemory } from './social-rules.js';
import { reactionView } from './reaction-view.js';

const LABELS = {
  office: 'Office worker',
  officeWoman: 'Office worker',
  elder: 'Older man',
  casual: 'Woman in casual clothes',
  sport: 'Jogger',
};

// Outdoor walkers and sitters, plus the station's existing background people.
export function attachCrowdSocial(game, place, pool = []) {
  const rigs = [...new Set([...(place.crowd || []), ...Object.values(place.extras || {})])];
  if (!rigs.length) return;
  const byRig = new Map(pool.map((b) => [b.r, b]));
  const previousIds = new Map(Object.entries(place.extras || {}).map(([id, r]) => [r, id]));
  const memory = reactionMemory(),
    view = reactionView(game, place);
  const K = place.charScale || 1;
  const pos = new THREE.Vector3();
  let talking = null,
    wasAir = false;
  place.extras ||= {};
  const people = rigs.map((r, index) => {
    const id = previousIds.get(r) || 'crowd' + index;
    const profile = r.socialProfile || (id === 'worker_b' ? 'officeWoman' : 'office');
    const p = {
      id,
      r,
      profile: CROWD_TALK[profile],
      label: LABELS[r.kind === 'sport' ? 'sport' : profile],
      blocked: 0,
      previous: null,
    };
    place.extras[id] = r;
    makePickable(r.root, id);
    place.things[id] = {
      ...place.things[id],
      kind: 'person',
      ambient: true,
      label: p.label,
      verb: 'Talk',
      pin: 'near',
      nearOnly: () => true,
      enabled: () => r.root.visible,
      anchor: (v) => {
        r.root.getWorldPosition(v);
        v.y += 1.25 * K;
        return v;
      },
      spot: () => {
        r.root.getWorldPosition(pos);
        place.space.worldToLocal(pos);
        const me = game.player.root.position;
        const yaw = Math.atan2(me.x - pos.x, me.z - pos.z);
        return [pos.x + Math.sin(yaw) * 0.8 * K, pos.z + Math.cos(yaw) * 0.8 * K];
      },
      face: () => {
        r.root.getWorldPosition(pos);
        place.space.worldToLocal(pos);
        return [pos.x, pos.z];
      },
      act: () => talk(p),
    };
    return p;
  });
  async function say(p, line) {
    await game.ui.say({ name: p.label, color: '#afcbe9' }, line.text, {
      voiceKey: line.voice,
      overheard: true,
      whoId: p.id,
    });
  }
  async function talk(p) {
    if (!p.r.root.visible) return;
    talking = p;
    p.r.socialHold = true;
    view.clear();
    const yaw = p.r.root.rotation.y;
    stopGait(p.r);
    if (!p.r.seated) {
      const me = game.player.root.position,
        q = p.r.root.position;
      p.r.root.rotation.y = Math.atan2(me.x - q.x, me.z - q.z);
    }
    try {
      const topic = p.profile;
      await say(p, topic.hello);
      const choice = await game.ui.choose({ name: p.label }, '', [{ html: topic.prompt }, { html: 'Leave' }], {
        keepLine: true,
        log: false,
      });
      if (choice !== 0) return;
      // The existing typing prompt teaches or practises the reply. Leaving never teaches it.
      await game.hooks.type({
        word: topic.word,
        prompt: topic.prompt,
        from: p.label,
      });
      await say(p, topic.answer);
    } finally {
      p.r.root.rotation.y = yaw;
      p.r.socialHold = false;
      talking = null;
    }
  }
  function react(p, kind) {
    const result = memory.request(p.id, kind);
    if (!result) return;
    const lines = p.profile[result.kind];
    view.show(p, Array.isArray(lines) ? lines[result.index] : lines);
  }
  function update(dt) {
    if (game.place !== place) {
      view.clear();
      return;
    }
    view.update();
    if (game.paused) return;
    memory.tick(dt);
    const air = !!game.jump?.air,
      jumped = air && !wasAir;
    wasAir = air;
    const me = game.player.root.position;
    const available =
      !game.busy &&
      !game.transition &&
      !game.busyTrip &&
      !game.ui._advance &&
      !document.body.classList.contains('at-title');
    let nearest = null,
      best = 2.2 * K;
    for (const p of people) {
      const r = p.r,
        b = byRig.get(r);
      const selected = game.walker.arrive?.use?.item?.id === p.id;
      r.socialHold = talking === p || selected;
      if (r.socialHold) {
        stopGait(r);
        r._walk = false;
      }
      if (!r.root.visible) {
        p.blocked = 0;
        p.previous = null;
        continue;
      }
      r.root.getWorldPosition(pos);
      place.space.worldToLocal(pos);
      const q = { x: pos.x, z: pos.z, yaw: r.root.rotation.y };
      const d = Math.hypot(me.x - q.x, me.z - q.z);
      if (jumped && available && d < best && Math.abs(me.y - pos.y) < 2 * K && inFront(q, me, best)) {
        nearest = p;
        best = d;
      }
      const speed = p.previous && dt ? Math.hypot(q.x - p.previous.x, q.z - p.previous.z) / dt : Infinity;
      p.previous = q;
      const commuter = place._commuters?.find((c) => c.r === r);
      const target = b?.state === 'walk' && !b.stopped ? b.line?.[b.i] : commuter?.path?.[0];
      const yielding = b?.state === 'walk' && !b.stopped && b.yieldingToPlayer;
      p.blocked = available && !r.socialHold && (yielding || blocking(q, me, target, speed, K)) ? p.blocked + dt : 0;
      if (p.blocked >= 0.4 && !view.active) {
        react(p, 'block');
        p.blocked = -4;
      }
    }
    if (nearest) react(nearest, 'jump');
  }
  const own = place.update.bind(place);
  place.update = (dt, t) => {
    update(dt);
    own(dt, t);
  };
  const leave = place.leave?.bind(place);
  place.leave = () => {
    view.dispose();
    for (const p of people) p.r.socialHold = false;
    leave?.();
  };
  place.crowdSocial = { people, view, update };
}
