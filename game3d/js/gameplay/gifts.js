import { ITEMS } from './items.js';
import { flagKeys } from '../narrative/engine-flags.js';
const KEYS = flagKeys('game3d/js/gameplay/gifts.js');

// UI chooses the item; this operation consumes it only when the selected story
// entry accepts it. Triggering stays synchronous, as in the original main handler.
export function giveItem({ runner, flags, take }, item, target) {
  if (ITEMS[item]?.giftable === false) return null;
  const key = [`give:${item}:${target}`, `give:*:${target}`].find((candidate) => runner.has(candidate));
  if (!key) return null;
  if (!runner.entry(key, { peek: true }).keep) {
    take(item);
    flags[KEYS.gave + item + '_' + target] = true;
  }
  runner.trigger(key);
  return key;
}
