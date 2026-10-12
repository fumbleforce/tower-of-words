// The market crossing stays on the fountain’s south axis in island coordinates.
// Shared by the physical shop shells, distant proxies and the player map.
export const MARKET_ROUTE = {
  x: 37.29,
  w: 4.5,
  x0: 35.04,
  x1: 39.54,
  seamZ: 12.6,
  northZ: 7.5,
  shoreZ: 32.4,
};
export function splitMarketSpan(x0, x1) {
  const { x0: a, x1: b } = MARKET_ROUTE;
  return [
    [x0, Math.min(x1, a)],
    [Math.max(x0, b), x1],
  ].filter(([u, v]) => v > u);
}

export function marketFootprints(building) {
  if (!['shops_north', 'shops_south', 'arcade'].includes(building.id)) return [building];
  const [x0, z0, x1, z1] = building.rect;
  return splitMarketSpan(x0, x1).map(([a, b]) => ({ ...building, rect: [a, z0, b, z1] }));
}
