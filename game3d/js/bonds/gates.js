// Later story overrides replace individual steps, including an explicit empty value
// that restores the default name. Other steps keep their earlier overrides.
export function bondGate(id, step, ...overrides) {
  const gates = Object.assign({}, ...overrides);
  return gates[step] || `bond${step}_${id}`;
}

export function storyBondGate(cast, stories, id, step) {
  return bondGate(id, step, cast[id]?.gates, ...stories.map(story => story.gates?.[id]));
}
