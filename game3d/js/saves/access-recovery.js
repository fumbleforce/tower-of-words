// Historical saves can refer to the removed northwest staff entrance.
import { STAFF_GATE } from '../scenes/forecourt/access-plan.js';
import { toLocal } from '../scenes/island-layout.js';
const gate = STAFF_GATE.map((p) => toLocal('forecourt', ...p));
const PROTECTED_DAY2 = new Set(['office_quarter', 'harbour', 'campus', 'print_shop', 'ferry_terminal']);
const removedRoute = (place, frame) =>
  (place === 'forecourt' && frame.node === 'to_campus') || (place === 'campus' && frame.node === 'to_forecourt');

export function accessRecoveryReason(saved) {
  if (saved.ended) return null;
  const day = saved.day ?? 1; // Original v1 saves may omit the day.
  if (Number.isInteger(day) && day >= 1 && day <= 5) {
    if (day === 2 && PROTECTED_DAY2.has(saved.place)) return 'route';
    const t = saved.transition;
    if ((t?.from === 'forecourt' && t.to === 'campus') || (t?.from === 'campus' && t.to === 'forecourt'))
      return 'route';
    if (
      (saved.runner?.execution?.frames || []).some((frame) =>
        removedRoute(saved.runner.execution.place || saved.place, frame),
      ) ||
      (saved.runner?.queued || []).some((frame) => removedRoute(saved.place, frame))
    )
      return 'route';
  }
  // Idle ground points on the former staff approach otherwise override snapToWalk.
  // Keep supported benches, roofs and active unrelated scenes under their normal restoration rules.
  const p = saved.surface;
  if (
    saved.place === 'forecourt' &&
    !saved.runner?.execution &&
    !saved.transition &&
    p &&
    [p.x, p.z, p.y].every(Number.isFinite) &&
    Math.abs(p.y) < 0.25 &&
    p.x >= gate[0][0] &&
    p.x <= gate[1][0] &&
    p.z < gate[0][1] + 0.1
  )
    return 'surface';
  return null;
}
export const needsAccessRecovery = (saved) => accessRecoveryReason(saved) !== null;
