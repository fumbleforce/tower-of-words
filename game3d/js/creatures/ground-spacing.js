// Reserve a bird's whole ground step, including pending landings, so paths cannot cross.
const distanceToSegment = (p, a, b) => {
  const x = b.x - a.x,
    z = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * x + (p.z - a.z) * z) / (x * x + z * z || 1)));
  return Math.hypot(p.x - a.x - t * x, p.z - a.z - t * z);
};
const side = (a, b, p) => (b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x);
function distanceBetweenSegments(a, b, c, d) {
  if (side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0) return 0;
  return Math.min(
    distanceToSegment(a, c, d),
    distanceToSegment(b, c, d),
    distanceToSegment(c, a, b),
    distanceToSegment(d, a, b),
  );
}

export function groundPathFree(W, bird, from, to = from) {
  for (const other of W.groundBirds || []) {
    if (other === bird) continue;
    const resting = other.mode === 'rest' && other.on?.kind === 'ground';
    const start = resting ? other.p : other.groundGoal;
    if (!start || Math.abs(start.y - from.y) > 0.2 * W.K) continue;
    const end = resting && ['walk', 'hop'].includes(other.act?.type) ? other.act.to : start;
    if (distanceBetweenSegments(from, to, start, end) < bird.groundRadius + other.groundRadius) return false;
  }
  return true;
}

export function groundSpot(W, bird, home, spread) {
  const offset = Math.random() * Math.PI * 2;
  // A spiral also finds distinct spots when random samples repeatedly hit the same patch.
  for (let i = 0; i < 80; i++) {
    const angle = offset + i * 2.399963229728653;
    const radius = Math.sqrt(i / 79) * spread;
    const p = {
      x: home.x + Math.cos(angle) * radius,
      y: home.y,
      z: home.z + Math.sin(angle) * radius,
    };
    if (W.nav.free(p.x, p.z, bird.groundRadius) && groundPathFree(W, bird, p)) return p;
  }
  return null;
}
