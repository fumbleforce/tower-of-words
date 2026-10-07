// Routine time stops with dialogue. Collected litter never reappears on Continue.
export function gardenState(saved = {}) {
  return {
    day: Number.isInteger(saved.day) ? saved.day : null,
    period: saved.period || null,
    patch: saved.patch === 1 ? 1 : 0,
    phase: ['sweep', 'collect', 'walk', 'rest'].includes(saved.phase) ? saved.phase : 'sweep',
    time: Math.max(0, Math.min(18, Number(saved.time) || 0)),
    collected: [0, 1].map((i) => Math.max(0, Math.min(1, Number(saved.collected?.[i]) || 0))),
    at: Array.isArray(saved.at) && saved.at.length === 2 && saved.at.every(Number.isFinite) ? [...saved.at] : null,
  };
}
export function freeBench(seats, people) {
  return (
    Object.entries(seats).find(
      ([, s]) =>
        !people.some((r) => r?.root.visible && Math.hypot(r.root.position.x - s.x, r.root.position.z - s.z) < 0.72),
    )?.[0] || null
  );
}
