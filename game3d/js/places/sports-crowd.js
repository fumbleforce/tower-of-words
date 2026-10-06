// The resurfacing barrier closes the office approach for walkers as well as the player.
export const SPORTS_CLOSED_DAYS = [3, 4];
export function sportsCrowd(data, day) {
  if (!SPORTS_CLOSED_DAYS.includes(day)) return data;
  const open = (end) => (end === 'office_street' ? 'onsen_path' : end);
  return {
    ...data,
    periods: Object.fromEntries(
      Object.entries(data.periods).map(([period, spec]) => [
        period,
        {
          ...spec,
          flows: spec.flows
            .map(([from, to, ...rest]) => [open(from), open(to), ...rest])
            .filter(([from, to]) => from !== to),
        },
      ]),
    ),
  };
}
