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
import { sim, PERIODS as PERIOD_ORDER, absorb, applySchedule, save, periodName } from '../sim.js';
import * as trips from '../trips.js';
import { installFinds, findSpotSteps, syncFinds } from '../finds/index.js';
import { installTickets } from '../tickets/index.js';
import { installClubs, withClubs, clubArrival } from '../clubs/index.js';
import { installDay3 } from './day3/place.js';
import { noteBenches } from './day3/seats.js';
import { installBoot, installPlacePlugin, watchPlacePlugins } from '../plugins.js';
import { installCreatures } from '../creatures/index.js';
import { attachCrowd } from '../crowd/index.js';
import { liftPeople } from '../look/char-lift.js';
import { keepPublic } from '../travel/ways.js';
import { noteVisit } from '../travel/visited.js';

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
  'karaoke',
  'karaoke_booth',
  'east_lane',
  'east_coast',
  'dorm_commons',
  'sports',
  'pool',
  'gym',
  'office_quarter',
  'harbour',
  'works',
]);

export function createPlaceLifecycle(
  game,
  { PLACES, setComposer, resize, size, buildMarkers, nearSet, zoneSet, snapshot, crossfade },
) {
  const ui = game.ui;
  installFinds(game); // the photos and papers Eric picks up (finds/index.js)
  installTickets(game); // the repair tickets and their app on Eric's computers (tickets/index.js)
  installClubs(game); // the clubs and the notice board (clubs/index.js)
  installDay3(game); // Saturday's people and scenes, the story's day3Setup (places/day3/)
  watchPlacePlugins(game);
  // preparation runs a slice a frame while a place is being played, flat out while the player waits for it
  setUrgent(() => !game.place || document.body.classList.contains('loading'));
  async function prepare(name) {
    if (!game.prepared[name])
      game.prepared[name] = (async () => {
        const story = await game.runner.load(name);
        const place = await PLACES[name](game, story);
        assertPlaceRegistered(place, name, PLACE_DETAILS[name]);
        place.name = name;
        noteBenches(place); // its benches' seats, before the draw-call pass merges them (places/day3/seats.js)
        await installBoot();
        keepPublic(story); // its ways out as the public story wrote them, for fast travel (travel/ways.js)
        await installPlacePlugin(name, { game, story, place });
        await nextFrame();
        attachLift(game, place); // walk-in lift (places/lift.js)
        await nextFrame();
        await attachCrowd(game, place, name); // the outdoor places' passers-by, before the draw-call pass (crowd/)
        // surface patterns, baked light (look/index.js); materials patched in place, in slices between frames so the
        // place being played doesn't stall (js/perf/slice.js)
        await sliced(lookSteps(place, game));
        lightenForPhone(place, name); // phones only: less detail where it barely shows (js/perf/phone.js)
        // a place built for the screen's shape (the train's cut-away) takes it now, so the draw-call pass merges
        // what will be shown, not what entering would rebuild
        const [w, h] = size();
        place.layout?.(w / h);
        if (BATCHED.has(name)) optimizePlace(place, { game, ...phoneBatch() });
        installCreatures(game, place, name); // birds and small animals outdoors (creatures/index.js), after the batching
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
    const { place } = await prepare(name);
    // the story for today (days.js): a place built on the title's day 1 still plays a later day's set
    const story = withClubs(await game.runner.load(name)); // with the club sessions (clubs/index.js)
    if (game.place && game.place.leave) game.place.leave();
    cancelSavedWalk(game.player);
    cancelSavedWalk(game.mioNpc);
    game.hold = null;
    game.place = place;
    game.story = story;
    document.body.dataset.place = name;
    noteVisit(name); // the places he has been to, for the map (travel/visited.js)
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
    place.onDay?.(sim.day); // what a day changes in a place (day 2's closed streets: places/closure.js)
    setComposer(place);
    liftPeople(game, place); // the people's evening lift, where the grade asks for one (look/char-lift.js)
    resize();
    place.cam?.snap?.(game.player.root.position);
    absorb(story);
    if (
      !resuming &&
      sim.day === 1 &&
      place.defaultPeriod &&
      PERIOD_ORDER.indexOf(sim.period) < PERIOD_ORDER.indexOf(place.defaultPeriod)
    )
      sim.period = place.defaultPeriod;
    applySchedule(game, { instant: true });
    place.ambient?.enter(sim.period); // the crowd for this period, everyone at once (crowd/index.js)
    ui.clock(sim.date, periodName(sim.period)); // a weekend's own names (sim.js periodName)
    const music = place.music === 'night' ? 'calm' : place.music; // a night place by day (day 2's morning room)
    playMusic(sim.period === 'evening' ? 'night' : music || MUSIC[name] || 'calm');
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
  // move plays. No black screens. Fast travel (travel/go.js): no leaving move, and he arrives as he would on foot
  // from `via`, the route's last place before this one.
  async function travel(name, { arriving = false, fromName, fast = false, via } = {}) {
    const from = arriving ? { name: fromName } : fast ? { name: via } : game.place;
    game.transition = {
      from: from.name,
      to: name,
      phase: arriving ? 'arriving' : 'leaving',
      ...(fast ? { fast } : {}),
    };
    save(game);
    game.busy = true;
    game.walker.locked = true;
    document.body.classList.add('busy', 'trip');
    let built = false;
    const ready = prepare(name).then((r) => ((built = true), r));
    const tr = await game.runner.load('transitions');
    const slot = (tr && tr[`${from.name}_to_${name}`]) || {};
    if (fast) game.walker.stop();
    else if (!arriving) await trips.leave(game, from, slot);
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
    // a later day: a way out he arrives standing in (B2's lift, back up at the forecourt) waits until he steps out of
    // it and back in, so a trip never turns straight round
    if (sim.day > 1) {
      const p = game.player.root.position;
      for (const [z, inside] of Object.entries(game.place.zones || {})) if (inside(p.x, p.z)) zoneSet.add(z);
    }
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
    clubArrival(game, name); // a club Eric is in that meets here now: its next session, after the place's start
  }
  return { prepare, enter, travel, startScene };
}
