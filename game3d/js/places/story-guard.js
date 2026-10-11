// The story for a place has to load before a trip leaves anything (places/lifecycle.js travel). If it will not, he
// stays where he is with his goal, nothing is saved, and he can try again.
export async function storyLoads(game, name, prepare, { arriving = false } = {}) {
  try {
    await prepare(name);
    return true;
  } catch (error) {
    console.error(error);
    if (!arriving) game.transition = null; // set by the hook that asked for the trip, never saved
    game.ui.toast("That place couldn't load. Try again.");
    return false;
  }
}
