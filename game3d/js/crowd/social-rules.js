// Pure proximity and cadence rules; the crowd's movement stays in its existing controllers.
export function inFront(person, player, radius) {
  const dx = player.x - person.x,
    dz = player.z - person.z;
  const d = Math.hypot(dx, dz);
  return d < radius && (d < 0.15 || (dx * Math.sin(person.yaw) + dz * Math.cos(person.yaw)) / d > -0.15);
}
export function blocking(person, player, target, speed, scale = 1) {
  if (!target || speed > 0.35 * scale) return false;
  const dx = target[0] - person.x,
    dz = target[1] - person.z;
  const len = Math.hypot(dx, dz);
  if (len < 0.2 * scale) return false;
  const px = player.x - person.x,
    pz = player.z - person.z;
  const along = (px * dx + pz * dz) / len;
  const side = Math.abs(px * dz - pz * dx) / len;
  return along > 0 && along < 1.3 * scale && side < 0.55 * scale;
}
export function reactionMemory() {
  let clock = 0,
    next = 0;
  const people = new Map();
  return {
    tick(dt) {
      clock += dt;
    },
    reset(id) {
      people.delete(id);
    },
    request(id, kind) {
      const m = people.get(id) || {
        count: 0,
        lastJump: -Infinity,
        next: 0,
        index: 0,
      };
      if (kind === 'jump') {
        m.count = clock - m.lastJump < 12 ? m.count + 1 : 1;
        m.lastJump = clock;
      }
      people.set(id, m);
      if (clock < next || clock < m.next) return null;
      next = clock + 3;
      m.next = clock + 5;
      return {
        kind: kind === 'jump' && m.count >= 3 ? 'annoyed' : kind,
        index: m.index++ % 2,
      };
    },
  };
}
