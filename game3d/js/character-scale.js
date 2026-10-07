// Review character-scale-1: the selected 15% reduction is the default; queries retain earlier comparisons.
// Scale before measuring seats and strides; world roots, props and navigation keep their units.
export function characterScale(search = '') {
  const value = new URLSearchParams(search).get('charscale');
  return value === '100' ? 1 : value === '67' ? 0.67 : 0.85;
}
export const CHARACTER_SCALE = characterScale(typeof location === 'undefined' ? '' : location.search);

// Cast adapters expose a replaceable head pivot; Mio exposes only its model.
const heads = new WeakMap();
export function characterHead(person) {
  if (person?.head) return person.head;
  const model = person?.model;
  if (!model) return null;
  if (heads.has(model)) return heads.get(model);
  let head = null;
  model.traverse((bone) => {
    if (bone.isBone && /^(mixamorig)?Head$/.test(bone.name)) head = bone;
  });
  heads.set(model, head);
  return head;
}
