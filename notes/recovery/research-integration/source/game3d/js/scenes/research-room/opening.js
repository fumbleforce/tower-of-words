// The core outside a finished ground-floor room remains solid.
export function remainingCore([x0, x1, z0, z1], [a, b, c, d]) {
  const ax = Math.max(x0, a),
    bx = Math.min(x1, b),
    cz = Math.max(z0, c),
    dz = Math.min(z1, d);
  if (ax >= bx || cz >= dz) throw new Error('Interior must intersect its building');
  return [
    [x0, ax, z0, z1],
    [bx, x1, z0, z1],
    [ax, bx, z0, cz],
    [ax, bx, dz, z1],
  ].filter(([a, b, c, d]) => b > a && d > c);
}
