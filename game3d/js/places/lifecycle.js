import { assertPlaceRegistered } from '../narrative/registration.js';
import { eventTrigger } from '../narrative/events.js';
import { PLACE_DETAILS, SHARED_THINGS } from './catalog.js';
import { NEXT } from './definitions.js';
import { cancelSavedWalk } from './saved-people.js';
import { attachLift } from './lift.js';
import { lookSteps } from '../look/index.js';
import { sliced, setUrgent, nextFrame } from '../perf/slice.js';
import { optimizePlace } from '../perf/batch.js';
import { lightenForPhone, phoneBatch } from '../perf/phone.js';
import { warmPlace } from '../perf/warm.js';
import { SmoothWalker } from '../move.js';
import { playMusic } from '../ui.js';
import { sim, PERIODS as PERIOD_ORDER, absorb, applySchedule, save } from '../sim.js';
import * as trips from '../trips.js';
import { installFinds, findSpotSteps, syncFinds } from '../finds/index.js';

const MUSIC = { train: 'calm', gate: 'lively', office: 'office' };
// places the draw-call pass (js/perf/batch.js) runs on
const BATCHED = new Set([
  'train',
  'gate',
  'office',
  'forecourt',
  'plaza',
  'dorm_court',
  'dorms',
  'shotengai',
  'east_lane',
  'east_coast',
  'sports',
]);

export function createPlaceLifecycle(
  game,
  { PLACES, setComposer, resize, size, buildMarkers, nearSet, zoneSet, snapshot, crossfade },
) {
  const ui = game.ui;
  installFinds(game); // the photos and papers Eric picks up (finds/index.js)
  // preparation runs a slice a frame while a place is being played, flat out while the player waits for it
  setUrgent(() => !game.place || document.body.classList.contains('loading'));
  async function prepare(name) {
    if (!game.prepared[name])
      game.prepared[name] = (async () => {
        const story = await game.runner.load(name);
        const place = await PLACES[name](game, story);
        assertPlaceRegistered(place, name, PLACE_DETAILS[name]);
        place.name = name;
        await nextFrame();
        attachLift(game, place); // walk-in lift (places/lift.js)
        await nextFrame();
        // surface patterns, baked light (look/index.js); materials patched in place, in slices between frames so the
        // place being played doesn't stall (js/perf/slice.js)
        await sliced(lookSteps(place, game));
        lightenForPhone(place, name); // phones only: less detail where it barely shows (js/perf/phone.js)
        // a place built for the screen's shape (the train's cut-away) takes it now, so the draw-call pass merges
        // what will be shown, not what entering would rebuild
        const [w, h] = size();
        place.layout?.(w / h);
        if (BATCHED.has(name)) optimizePlace(place, { game, ...phoneBatch() });
        await nextFrame(); // the pass's first scan and the finds' floor raycasts each take a frame's time on a phone
        await sliced(findSpotSteps(game, place)); // after the draw-call pass, so each print stays its own mesh to hide
        await nextFrame();
        // shaders and textures ready before the first frame there, so entering doesn't stall (js/perf/warm.js)
        place.warm = await warmPlace(game.renderer, place, {
          extra: [game.player?.root, game.mioNpc?.root],
          overrides: game.overrideMaterials?.() || [],
        });
        return { place, story };
      })();
    return game.prepared[name];
  }
  async function enter(name, { persist = true, resuming = false } = {}) {
    const { place, story } = await prepare(name);
    if (game.place && game.place.leave) game.place.leave();
    cancelSavedWalk(game.player);
    cancelSavedWalk(game.mioNpc);
    game.hold = null;
    game.place = place;
    game.story = story;
    document.body.dataset.place = name;
    game.runner.use(place, story);
    if (!resuming) game.pendingStart = name;
    place.space.add(game.player.root);
    place.space.add(game.mioNpc.root);
    game.mioNpc.root.visible = false;
    game.mioNpc.root.scale.setScalar(place.charScale || 1);
    game.mioNpc.setState('idle');
    place.people.mio = game.mioNpc;
    const mr = game.mioNpc.root;
    place.things.mio = place.things.mio || {
      ...SHARED_THINGS.mio,
      anchor: (v) => {
        mr.getWorldPosition(v);
        v.y += 1.12 * (place.charScale || 1);
        return v;
      },
      spot: () => {
        const r = mr.rotation.y;
        return [mr.position.x + Math.sin(r) * 0.6, mr.position.z + Math.cos(r) * 0.6];
      },
      face: () => [mr.position.x, mr.position.z],
      enabled: () => mr.visible,
    };
    game.mioNpc.seated = false;
    game.mioNpc.root.position.y = 0;
    if (place.spots.mio_start) game.mioNpc.root.position.set(place.spots.mio_start[0], 0, place.spots.mio_start[1]);
    place.placeMio?.(game.mioNpc);
    game.player.root.scale.setScalar(place.charScale || 1);
    game.player.seated = false;
    game.player.scripted = false;
    game.player.setState('idle');
    game.player.root.visible = true;
    game.walker = new SmoothWalker(game.player.root, place.nav, { speed: 1.3 });
    game.walker.facing = place.startFacing ?? Math.PI;
    game.player.root.rotation.y = game.walker.facing;
    const [sx, sz] = place.start;
    game.player.root.position.set(sx, place.floorY ?? 0, sz);
    place.onPeriod?.(sim.period); // a chunk built in the morning, entered after work, takes the evening light
    setComposer(place);
    resize();
    place.cam?.snap?.(game.player.root.position);
    absorb(story);
    if (
      !resuming &&
      place.defaultPeriod &&
      PERIOD_ORDER.indexOf(sim.period) < PERIOD_ORDER.indexOf(place.defaultPeriod)
    )
      sim.period = place.defaultPeriod;
    applySchedule(game, { instant: true });
    ui.clock(
      sim.date,
      {
        early: 'Early morning',
        morning: 'Morning at work',
        lunch: 'Lunch',
        afternoon: 'Afternoon',
        evening: 'After work',
      }[sim.period],
    );
    playMusic(sim.period === 'evening' ? 'night' : place.music || MUSIC[name] || 'calm');
    syncFinds(place); // prints already picked up stay gone, also after a load
    buildMarkers(place);
    ui.goal('');
    if (persist) save(game);
    nearSet.clear();
    zoneSet.clear();
    return place;
  }

  // The trip between places: the old place plays its leaving move while the next one is ready (it was built
  // in the background), then a soft crossfade from the last frame into the next place, where its arriving
  // move plays. No black screens.
  async function travel(name, { arriving = false, fromName } = {}) {
    const from = arriving ? { name: fromName } : game.place;
    game.transition = { from: from.name, to: name, phase: arriving ? 'arriving' : 'leaving' };
    save(game);
    game.busy = true;
    game.walker.locked = true;
    document.body.classList.add('busy', 'trip');
    let built = false;
    const ready = prepare(name).then((r) => ((built = true), r));
    const tr = await game.runner.load('transitions');
    const slot = (tr && tr[`${from.name}_to_${name}`]) || {};
    if (!arriving) await trips.leave(game, from, slot);
    // body.loading (the chip, and a dimmed frame) only when the player is actually held up: the leaving walk is
    // over and the next place is still being built. A place built ahead (the lift, the outdoor chunks) never shows it.
    if (!built) {
      document.body.classList.add('loading');
      await ready;
      document.body.classList.remove('loading');
    }
    if (!arriving) {
      const snap = snapshot();
      game.transition.phase = 'arriving';
      await enter(name);
      crossfade(snap);
    }
    await trips.arrive(game, game.place, slot);
    document.body.classList.remove('busy', 'trip');
    game.busy = false;
    game.walker.locked = false;
    game.player.scripted = false;
    if (NEXT[name]) setTimeout(() => prepare(NEXT[name]), 1500);
    game.transition = null;
    startScene(name);
  }
  game.travel = travel;
  game.prepare = prepare; // a place can build a side-trip neighbour ahead, as the player heads for it

  function startScene(name) {
    game.pendingStart = null;
    if (game.runner.has(eventTrigger(name, 'start'))) game.runner.trigger(eventTrigger(name, 'start'));
    else if (game.story.start) game.beat(() => game.runner.run(game.story.start));
    else save(game);
  }
  return { prepare, enter, travel, startScene };
}
