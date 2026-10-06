// Only ordinary transforms and booleans cross the save boundary.
export const captureObjects = (objects) =>
  objects.map((o) => ({ p: o.position.toArray(), r: o.rotation.toArray(), s: o.scale.toArray(), v: o.visible }));
export function restoreObjects(objects, saved = []) {
  saved.forEach((s, i) => {
    if (!objects[i]) return;
    objects[i].position.fromArray(s.p);
    objects[i].rotation.fromArray(s.r);
    if (s.s) objects[i].scale.fromArray(s.s);
    objects[i].visible = s.v;
  });
}
