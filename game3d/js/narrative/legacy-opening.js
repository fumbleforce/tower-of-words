import { ENGINE_WRITES } from './engine-flags.js';
import { PLACE_FILES } from '../places/definitions.js';

// Old saves had no pending-start marker and could be written before the opening
// supplied its first goal. Infer only that initial state, never an active scene.
export function needsLegacyOpening(saved, story) {
  if (Object.hasOwn(saved, 'pendingStart') || saved.ui?.goal || saved.ended || saved.transition
    || saved.runner?.execution || saved.runner?.queued?.length || !story?.start) return false;
  const progress = new Set(ENGINE_WRITES[PLACE_FILES[saved.place]]?.exact || []);
  const visit = value => {
    if (!value || typeof value !== 'object') return;
    if (typeof value.set === 'string') progress.add(value.set);
    else if (value.set && typeof value.set === 'object') Object.keys(value.set).forEach(key => progress.add(key));
    if (typeof value.inc === 'string') progress.add(value.inc);
    if (typeof value.unset === 'string') progress.add(value.unset);
    Object.values(value).forEach(visit);
  };
  visit(story.nodes);
  // This legacy affinity counter was earned on the train and reused in the
  // office; it cannot establish that the player has started the office visit.
  progress.delete('mio_warm');
  return ![...progress].some(key => !!saved.flags?.[key]);
}
