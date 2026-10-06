// Eligibility and save policy are independent of the rendered props.
import { FINDS, NODES } from '../../story/days3-5-finds.js';
export { FINDS, NODES };
export const seenFlag = (id) => `flavor_${id}_seen`;
export const targetId = (id) => `flavor_${id}`;
export function eligible(f, day, condition) {
  return day >= f.from && (!f.until || day <= f.until) && (!f.if || condition(f.if));
}
export function writtenNode(f) {
  return NODES[f.node].map((step) =>
    typeof step === 'string' && step.startsWith('>')
      ? { do: 'flavorFind', id: f.id, state: 'read', text: step.replace(/^>\s*/, '') }
      : step,
  );
}
export function withoutInterruptedLook(snapshot) {
  if (!snapshot.execution?.frames.some((frame) => FINDS.some((f) => f.node === frame.node))) return snapshot;
  return { ...snapshot, execution: null };
}
