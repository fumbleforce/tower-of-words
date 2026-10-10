// The Chat rule for what the player knows (issue #399): a choice with `needs` shows only when its own `if` holds and
// every named piece of knowledge (story/conversations/needs.js) has been learned. Folded into `if` when the shared
// conversations join a place's story, so the runner, saves and checks see one ordinary condition.
import { NEEDS } from '../../story/conversations/needs.js';
import { createConditionEvaluator } from '../narrative/conditions.js';

export function needsCondition(needs) {
  return []
    .concat(needs)
    .map((key) => {
      if (!NEEDS[key]) throw new Error(`Chat choice needs '${key}', which is not in story/conversations/needs.js`);
      return `(${NEEDS[key]})`;
    })
    .join(' && ');
}

function fold(option) {
  if (!option.needs) return option;
  const { needs, ...rest } = option;
  const known = needsCondition(needs);
  return { ...rest, if: rest.if ? `(${rest.if}) && ${known}` : known };
}

function steps(list) {
  if (!Array.isArray(list)) return list;
  return list.map((step) => {
    if (!step || typeof step !== 'object') return step;
    const out = { ...step };
    if (out.choice) out.choice = out.choice.map(fold);
    if (out.then) out.then = steps(out.then);
    if (out.else) out.else = steps(out.else);
    return out;
  });
}

export function applyNeeds(nodes) {
  return Object.fromEntries(Object.entries(nodes).map(([name, list]) => [name, steps(list)]));
}

// For labels outside a choice (topicFor): the same needs, read from a flags object.
export function knows(key, flags) {
  return createConditionEvaluator((name) => flags[name] ?? 0)(needsCondition(key));
}
