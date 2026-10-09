// The world kit's one seeded random (notes/architecture/world-kit.md). The same seed gives the same planting, the
// same bench tone and the same lit windows on every build, so a place looks hand-placed and stays that way.
//   rng(seed)            a random in [0, 1) from a seed (a number); the generator the outdoor kit has always used
//   hash2(x, z, k)       a stable value in [0, 1) for a point, for per-tile variation without a running random
//   hashStr(text)        a whole number from a string (FNV-1a), for a piece id
//   seedAt(id, x, z)     the default seed of a piece placed at (x, z): two pieces in a row come out different
//   between(r, [a, b])   a value between a and b; a single number n means -n..n
//   pick(r, list)        one item of a list

export function rng(seed = 1) {
  let s = (Math.abs(Math.floor(seed * 7919)) % 2147483646) + 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export const hash2 = (x, z, k = 0) => {
  const h = Math.sin(x * 127.1 + z * 311.7 + k * 74.7) * 43758.5453;
  return h - Math.floor(h);
};

export function hashStr(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

// positions are rounded to a centimetre, so a piece moved by a rounding error keeps its look
export const seedAt = (id, x = 0, z = 0) =>
  (hashStr(id) ^ Math.imul(Math.round(x * 100), 73856093) ^ Math.imul(Math.round(z * 100), 19349663)) >>> 0;

export const between = (r, range) =>
  typeof range === 'number' ? (r() * 2 - 1) * range : range[0] + (range[1] - range[0]) * r();

export const pick = (r, list) => list[Math.floor(r() * list.length) % list.length];
