// hooks that keep the current line on screen (they belong to it)
export const KEEP_TALK = new Set([
  'type',
  'expression',
  'face',
  'emote',
  'voice',
  'sound',
  'hint',
  'goal',
  'learn',
  'bond',
  'meet',
  'set',
  'remember',
  'fact',
  'bondStep',
  'relate',
]);
export const DURABLE_HOOKS = new Set([
  'period',
  'meet',
  'buy',
  'take',
  'bond',
  'bondStep',
  'remember',
  'fact',
  'relate',
]);
export const PERIOD_HOOKS = new Set(['period', 'mioLunchComplete']);
export const WORLD_HOOKS = new Set(['depart', 'bag', 'arrive', 'alight', 'cup', 'lunchSit', 'lunchOver', 'sitDown']);
