import { flags } from '../../narrative/state.js';

// A cancelled physical hook resolves quietly, but its authored caller must stop too.
export function bakeryAction(game, place, act) {
  return async (args) => {
    flags.bakery_action_complete = false;
    const completed = await act(args);
    flags.bakery_action_complete = game.place === place && completed === true;
  };
}
