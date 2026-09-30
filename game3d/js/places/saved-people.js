// Only transforms and pose data cross the save boundary; no rig objects or animation callbacks.
export function cancelSavedWalk(person) {
  const motion = person.root?.userData;
  if (motion) {
    motion.walkTok = (motion.walkTok || 0) + 1;
    motion.faceTok = (motion.faceTok || 0) + 1;
  }
  person._walk = null;
  person.savedWalk = null;
  person._savedWalkPromise = null;
}

export function beginSavedWalk(person, destination, move, onComplete) {
  if (person._savedWalkPromise && JSON.stringify(person.savedWalk) === JSON.stringify(destination))
    return person._savedWalkPromise;
  const pending = structuredClone(destination);
  person.savedWalk = pending;
  const promise = Promise.resolve()
    .then(move)
    .then(() => {
      if (person.savedWalk !== pending) return;
      person.savedWalk = null;
      person._savedWalkPromise = null;
      onComplete();
    });
  person._savedWalkPromise = promise;
  return promise;
}

export function snapshotObject(object) {
  return { visible: object.visible, position: object.position.toArray(), rotation: object.rotation.toArray() };
}
export function restoreObject(object, data) {
  if (!data) return;
  object.visible = data.visible;
  object.position.fromArray(data.position);
  object.rotation.fromArray(data.rotation);
}
function poseParts(person) {
  const rig = person.rig || person;
  const parts = {};
  for (const name of ['hips', 'torso', 'head', 'arms', 'legs', 'knees']) {
    const value = rig[name];
    if (Array.isArray(value))
      value.forEach((part, i) => {
        parts[`${name}${i}`] = part;
      });
    else if (value?.position && value?.rotation) parts[name] = value;
  }
  if (person.rig?.root) parts.rigRoot = person.rig.root;
  return parts;
}
export function snapshotPeople(people) {
  return Object.fromEntries(
    Object.entries(people)
      .filter(([, p]) => p?.root)
      .map(([id, person]) => [
        id,
        {
          ...snapshotObject(person.root),
          seated: !!person.seated,
          ...(person.seatOut ? { seatOut: [...person.seatOut] } : {}),
          lookTarget: person.lookTarget ? [...person.lookTarget] : null,
          blob: person.blob ? snapshotObject(person.blob) : null,
          ...(person.savedWalk ? { walk: structuredClone(person.savedWalk) } : {}),
          pose: Object.fromEntries(
            Object.entries(poseParts(person)).map(([name, object]) => [name, snapshotObject(object)]),
          ),
        },
      ]),
  );
}
export function restorePeople(people, data = {}) {
  for (const [id, saved] of Object.entries(data)) {
    const person = people[id];
    if (!person?.root) continue;
    cancelSavedWalk(person);
    person.savedWalk = saved.walk ? structuredClone(saved.walk) : null;
    person.lookTarget = saved.lookTarget ? [...saved.lookTarget] : null;
    person.setState?.(saved.seated ? 'sit' : 'idle');
    person.seated = saved.seated;
    person.seatOut = saved.seatOut ? [...saved.seatOut] : null;
    restoreObject(person.root, saved);
    if (person.blob) restoreObject(person.blob, saved.blob);
    for (const [name, object] of Object.entries(poseParts(person))) restoreObject(object, saved.pose?.[name]);
  }
}
