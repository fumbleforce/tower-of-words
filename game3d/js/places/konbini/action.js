import { flags } from '../../narrative/state.js';

// Only the current action can publish its result; a cancelled old room cannot stop a new order.
export function konbiniAction(game, place, act) {
  let request = 0;
  return async (args) => {
    const owned = ++request;
    flags.konbini_action_complete = false;
    const completed = await act(args);
    if (game.place === place && request === owned) flags.konbini_action_complete = completed === true;
  };
}
