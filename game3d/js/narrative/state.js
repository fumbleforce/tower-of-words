import { known } from '../lang.js';
import { KNOW_PREFIX } from './engine-flags.js';
import { createConditionEvaluator } from './conditions.js';

// One shared object: save hydration and existing consumers keep its identity.
export const flags = {};
export const cond = createConditionEvaluator((key) =>
  key.startsWith(KNOW_PREFIX) ? known.has(key.slice(KNOW_PREFIX.length)) : (flags[key] ?? 0),
);
