import { flagKeys } from '../narrative/engine-flags.js';
import { seedVisited } from '../travel/visited.js';
const KEYS = flagKeys('game3d/js/saves/day2.js');
const REVISION = 2;
// These conversations moved from the outdoor bench into the restaurant.
const PARTY_NODES = new Set([
  'd2_after_work',
  'd2_drink_word',
  'd2_empty_bench',
  'd2_go_word',
  'd2_goodnight',
  'd2_kenji_party',
  'd2_kenji_wait',
  'd2_leftovers',
  'd2_mio_party',
  'd2_mio_wait',
  'd2_more_drink',
  'd2_more_food',
  'd2_mori_drink',
  'd2_mori_go_reply',
  'd2_mori_party',
  'd2_mori_rest',
  'd2_mori_rest_again',
  'd2_mori_rest_end',
  'd2_mori_rest_idle',
  'd2_mori_see_reply',
  'd2_mori_wait',
  'd2_no_drink',
  'd2_norway',
  'd2_party_free',
  'd2_quiet',
  'd2_seat_menu',
  'd2_stay',
  'd2_supper',
  'd2_take_food',
  'd2_topic',
]);

// Old checkpoints index the previous scripts. Resume at the place's progress-aware
// opening instead of interpreting those indices against revised dialogue.
export function migrateDay2Save(saved) {
  if (saved.day !== 2 || saved.flags?.[KEYS.d2_content_revision] === REVISION || saved.ended) return saved;
  const nodes = [...(saved.runner?.execution?.frames || []), ...(saved.runner?.queued || [])].map(
    (frame) => frame.node,
  );
  const moveParty =
    saved.place === 'shotengai' &&
    (nodes.some((node) => PARTY_NODES.has(node)) || (saved.flags?.d2_ate && !saved.flags?.d2_party_done));
  const restart = moveParty || nodes.some((node) => typeof node === 'string' && node.startsWith('d2_'));
  const flags = { ...saved.flags };
  flags[KEYS.d2_content_revision] = REVISION;
  if (!restart) return { ...saved, flags };
  const place = moveParty ? 'izakaya' : saved.place;
  flags[KEYS.place] = place;
  return {
    ...saved,
    flags,
    place,
    pendingStart: place,
    world: null,
    transition: null,
    visited: [...new Set([...(saved.visited || seedVisited(saved)), place])],
    runner: { ...saved.runner, execution: null, queued: [] },
    ui: { ...saved.ui, hold: null, goal: '' },
  };
}
