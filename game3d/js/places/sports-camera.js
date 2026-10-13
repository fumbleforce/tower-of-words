import { PROTECTED_EDGES } from '../scenes/outdoor/protected-edges.js';
import { pt } from '../scenes/sports/plan.js';

const [[west, north], [, south]] = PROTECTED_EDGES.sports[1].map(pt);
const ease = (value, a, b) => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// From the west grove lawn, look from its public east side instead of through the staff fence.
// The bench and pool walk keep their existing view; the authored turn eases across the lawn.
export function boundaryOverviewPose(x, z, look) {
  const k = (1 - ease(x, west + 2, west + 4)) * ease(z, north - 1, north) * (1 - ease(z, south, south + 1));
  return {
    yaw: look.yaw + (0.2 + ((2 * Math.PI) / 3 - 0.2) * ease(z, south - 4, south - 0.5) - look.yaw) * k,
    elev: look.elev + ((64 * Math.PI) / 180 - look.elev) * k,
  };
}
