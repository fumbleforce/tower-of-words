import gateStory from '../../story/gate.js';
import { nodeFingerprint } from '../narrative/checkpoint.js';

const OLD_GOAL = 'Take the lift down to B2.';
const EXIT_GOAL = 'Leave the station and walk to head office.';

// Only the two departure goals changed. Accept their exact old arrays, with cursor positions intact.
const goals = new Map();
for (const [node, steps] of Object.entries(gateStory.nodes)) {
  if (!steps.some((step) => step?.do === 'goal' && step.text === EXIT_GOAL)) continue;
  const old = steps.map((step) =>
    step?.do === 'goal' && step.text === EXIT_GOAL ? { ...step, text: OLD_GOAL } : step,
  );
  goals.set(node, {
    before: nodeFingerprint(old),
    after: nodeFingerprint(steps),
  });
}

export function migrateForecourtSave(saved) {
  if (!saved) return saved;
  const next = structuredClone(saved);
  if (next.place === 'gate') {
    if (next.ui?.goal === OLD_GOAL) next.ui.goal = EXIT_GOAL;
    for (const frame of next.runner?.execution?.frames || []) {
      const goal = goals.get(frame.node);
      if (goal && frame.fingerprint === goal.before) frame.fingerprint = goal.after;
      if (frame.staging?.ui?.goal === OLD_GOAL) frame.staging.ui.goal = EXIT_GOAL;
    }
  }
  if (next.transition?.from === 'gate' && next.transition.to === 'office') {
    if (next.runner) {
      next.runner.execution = null;
      next.runner.queued = [];
    }
    // A completed handover resumes at B2; an unfinished station departure takes the new outdoor path.
    next.transition =
      next.place === 'office'
        ? { from: 'forecourt', to: 'office', phase: 'arriving' }
        : { from: 'gate', to: 'forecourt', phase: 'leaving' };
  }
  return next;
}
