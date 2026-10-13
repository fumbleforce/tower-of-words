import { PEOPLE, idle } from '../cast.js';
import { blob } from '../engine.js';
import { snapshotPeople, restorePeople, cancelSavedWalk } from '../places/saved-people.js';
import { stopGait } from '../movement/gait.js';
import { standPose } from '../crowd/motion.js';
import { freeNear } from '../movement/navigation.js';
import { bodies } from '../movement/shared.js';
import { COMPANION } from './catalog.js';

// Each place keeps its own resident; only the active place refers to the travelling rig.
export function outingActor(game, { makeRig = PEOPLE.kenji, makeShadow = blob } = {}) {
  const rig = makeRig(),
    baseScale = rig.root.scale.clone(),
    records = new WeakMap(),
    spaces = new WeakMap();
  rig.root.visible = false;
  rig.blob = makeShadow(0.55, 0.38);
  rig.blob.visible = false;
  let current = null;

  function attach(P) {
    if (records.has(P)) return;
    // Registration requires a local person even where the schedule never puts Kenji.
    let resident = P.people.kenji;
    if (!resident) {
      resident = makeRig();
      if (!resident.meshy || resident.chibi) resident.root.scale.multiplyScalar(P.charScale || 1);
      resident.root.visible = false;
      P.space.add(resident.root);
      P.people.kenji = resident;
    }
    const record = { resident, thing: P.things.kenji, home: null };
    records.set(P, record);
    spaces.set(P.space, record);
    const person = () => (current === P ? rig : resident);
    record.companion = {
      ...record.thing,
      ...COMPANION,
      anchor(v) {
        person().root.getWorldPosition(v);
        v.y += 1.2 * (P.charScale || 1);
        return v;
      },
      spot() {
        const r = person(),
          p = r.root.position,
          scale = P.charScale || 1;
        for (const a of [r.root.rotation.y, r.root.rotation.y + Math.PI / 2, r.root.rotation.y - Math.PI / 2]) {
          const q = [p.x + Math.sin(a) * 0.8 * scale, p.z + Math.cos(a) * 0.8 * scale];
          if (P.nav.free(...q, P.nav.R)) return q;
        }
        return [p.x, p.z];
      },
      face: () => [person().root.position.x, person().root.position.z],
      enabled: () => person().root.visible && !person()._walk,
    };
    P.things.kenji ||= record.companion;
  }

  function release() {
    cancelSavedWalk(rig);
    stopGait(rig);
    rig.root.visible = rig.blob.visible = false;
    rig.root.removeFromParent();
    rig.blob.removeFromParent();
    if (current) {
      const record = records.get(current);
      current.people.kenji = record.resident;
      current.things.kenji = record.thing || record.companion;
      if (record.home) restorePeople({ kenji: record.resident }, record.home);
      record.home = null;
    }
    current = null;
  }

  function activate(P) {
    if (current === P) {
      P.people.kenji = rig;
      P.things.kenji = records.get(P).companion;
      update();
      return;
    }
    const record = records.get(P);
    if (!record) throw Error('Outing actor needs a registered place');
    release();
    const resident = record.resident;
    record.home = snapshotPeople({ kenji: resident });
    cancelSavedWalk(resident);
    stopGait(resident);
    rig.root.position.copy(resident.root.position);
    rig.root.rotation.copy(resident.root.rotation);
    let at = [rig.root.position.x, rig.root.position.z];
    if (resident.seated) {
      const yaw = resident.root.rotation.y,
        gap = 0.85 * (P.charScale || 1);
      at = resident.seatOut || [at[0] + Math.sin(yaw) * gap, at[1] + Math.cos(yaw) * gap];
      at = freeNear(
        P.nav,
        bodies(game).filter((b) => b.root !== resident.root),
        ...at,
        0.3 * (P.charScale || 1),
      );
    }
    record.approach = [...at];
    resident.root.visible = false;
    if (resident.blob) resident.blob.visible = false;
    P.people.kenji = rig;
    P.things.kenji = record.companion;
    P.space.add(rig.root, rig.blob);
    rig.root.scale.copy(baseScale);
    if (!rig.meshy || rig.chibi) rig.root.scale.multiplyScalar(P.charScale || 1);
    standPose(rig);
    rig.seatOut = null;
    rig.lookTarget = null;
    rig.root.position.set(at[0], P.floorY || 0, at[1]);
    rig.root.visible = true;
    current = P;
    update();
  }

  function update() {
    if (!current || current !== game.place) return;
    const record = records.get(current),
      resident = record.resident;
    current.things.kenji = record.companion;
    resident.root.visible = false;
    if (resident.blob) resident.blob.visible = false;
    rig.blob.visible = rig.root.visible;
    rig.blob.position.set(rig.root.position.x, (current.floorY || 0) + 0.004, rig.root.position.z);
    if (!rig.meshy && !rig._walk && !rig.seated) idle(rig, game.t || 0);
  }
  return {
    rig,
    attach,
    activate,
    release,
    update,
    current: () => current,
    resident: (P) => records.get(P)?.resident,
    home: () => (current ? { ...records.get(current).home.kenji, approach: records.get(current).approach } : null),
    restoreHome(value) {
      if (!current || !value) return;
      const record = records.get(current);
      record.home = { kenji: structuredClone(value) };
      record.approach = value.approach ? [...value.approach] : null;
    },
    scheduled: (id, person, space) =>
      id === 'kenji' && person === rig ? spaces.get(space)?.resident || person : person,
  };
}
