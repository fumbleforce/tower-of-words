// Continue: a save played on from where it was (the title's Continue, a loaded slot, a new day's opening save made
// by days.js). Rebuild the saved place directly; arrival cinematics and opening scenes belong to new visits.
import { sim, restore, save, loadSave } from './sim.js';
import { flags } from './narrative/state.js';
import { canTravel } from './places/definitions.js';
import { needsLegacyOpening } from './narrative/legacy-opening.js';
import { showEnd } from './end.js';
import { nextDaySave, sampleDayEnd } from './days.js';

export function createContinue(game, { enter, travel, startScene, PLACES }) {
  const ui = game.ui;
  return async function continueFrom(saved) {
    game.busy = true;
    restore(game, saved);
    await enter(saved.place || 'train', { persist: false, resuming: true });
    game.place.restoreState?.(saved);
    globalThis.__shell?.titleEntered?.(); // from the title's Continue: its shot fades to this place (menu.js)
    // Schedule hooks may set visibility flags; saved progression remains authoritative.
    for (const key of Object.keys(flags)) delete flags[key];
    Object.assign(flags, saved.flags || {});
    ui.refreshWords();
    ui.refreshPeople(sim.met.size);
    ui.refreshBag(sim);
    ui.goal(saved.ui?.goal || '');
    ui.sideGoal(saved.ui?.sideGoal || '');
    game.hold = saved.ui?.hold || null;
    game.busy = false;
    game.saveEnabled = true;
    const transition = saved.transition;
    if (saved.ended) {
      showEnd(game);
      save(game);
    } else if (transition && canTravel(transition.from, transition.to, sim.day) && PLACES[transition.to]) {
      await travel(transition.to, { arriving: saved.place === transition.to, fromName: transition.from });
    } else if (saved.runner?.execution || saved.runner?.queued?.length)
      await game.beat(async () => {
        await game.runner.resume();
      });
    // a later day's start nodes only set things up and point the way (story/day2/README.md): they run on every
    // Continue, so the place's people and props are where the story has got to
    else if (saved.pendingStart === game.place.name || sim.day > 1 || needsLegacyOpening(saved, game.story))
      startScene(game.place.name);
    else {
      game.resumeWalks();
      save(game);
    }
  };
}

// ?day=N: the opening save of day N, made from the autosave when it is the finished day before, else from a sample
// finished day before (&history=mio|mori|cold, and for day 3 ,keep: days.js sampleDayEnd)
// (&place=<id>: that place instead of Eric's room, for looking at a place on that day)
export function dayStartSave(day, history = 'mio', place = null) {
  const prev = loadSave();
  const base = prev?.ended && prev.day === day - 1 ? prev : sampleDayEnd(day, history);
  const save = nextDaySave({ ...base, day: day - 1 });
  return place && place !== save.place ? { ...save, place, pendingStart: place, world: null } : save;
}
