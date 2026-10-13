// Historical saves can refer to the removed northwest staff entrance.
import { supportsDay } from '../content-scope.js';
import { STAFF_GATE, STAFF_FENCE } from '../scenes/forecourt/access-plan.js';
import { toLocal } from '../scenes/island-layout.js';
const gate = STAFF_GATE.map((p) => toLocal('forecourt', ...p));
const staffEast = toLocal('forecourt', ...STAFF_FENCE[0][1])[0];
const PROTECTED_DAY2 = new Set(['office_quarter', 'harbour', 'campus', 'print_shop', 'ferry_terminal']);
const removedRoute = (place, frame, day) => {
  const to = place === 'forecourt' ? 'campus' : place === 'campus' ? 'forecourt' : null;
  if (!to) return false;
  if (day > 5) return frame.node === `ongoing_to_${to}`;
  // Days 2–5 reuse the original campus story; authored forecourt routes acquire a day prefix on days 3–5.
  return frame.node === `to_${to}` || (place === 'forecourt' && day >= 3 && frame.node === `d${day}_to_campus`);
};

export function accessRecoveryReason(saved) {
  if (saved.ended) return null;
  const day = saved.day ?? 1; // Original v1 saves may omit the day.
  if (supportsDay(day)) {
    if (day === 2 && PROTECTED_DAY2.has(saved.place)) return 'route';
    const t = saved.transition;
    if ((t?.from === 'forecourt' && t.to === 'campus') || (t?.from === 'campus' && t.to === 'forecourt'))
      return 'route';
    if (
      (saved.runner?.execution?.frames || []).some((frame) =>
        removedRoute(saved.runner.execution.place || saved.place, frame, day),
      ) ||
      (saved.runner?.queued || []).some((frame) => removedRoute(saved.place, frame, day))
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
    p.x <= staffEast &&
    p.z < gate[0][1] + 0.1
  )
    return 'surface';
  return null;
}
export const needsAccessRecovery = (saved) => accessRecoveryReason(saved) !== null;
