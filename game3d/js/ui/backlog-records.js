// A rolling conversation record, separate from durable story facts and clue state.
export const LOG_LIMIT = 400;
const dayNumber = (value, fallback = 1) => (Number.isInteger(value) && value > 0 ? value : fallback);

export function restoreLog(data, saveDay) {
  if (!Array.isArray(data?.items)) return [];
  const legacyDay = dayNumber(data.day, dayNumber(saveDay));
  return data.items
    .filter((e) => e && (e.k === 'line' || e.k === 'pick'))
    .slice(-LOG_LIMIT)
    .map((e) => ({
      ...structuredClone(e),
      day: dayNumber(e.day, legacyDay),
      // Older saves did not record vocabulary at the time. Do not infer it from today's knowledge.
      knownAtTime: Array.isArray(e.knownAtTime) ? [...e.knownAtTime] : null,
    }));
}

export function recordEntry(entry, context) {
  return {
    ...structuredClone(entry),
    day: dayNumber(context.day),
    period: context.period || '',
    place: context.place || '',
    node: context.node || '',
    knownAtTime: [...context.known],
  };
}

export function sameLine(a, b) {
  return (
    a?.k === 'line' &&
    b.k === 'line' &&
    ['text', 'who', 'en', 'ov', 'day', 'period', 'place', 'node'].every((key) => a[key] === b[key])
  );
}
