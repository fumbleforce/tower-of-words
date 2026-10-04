// Birds and small animals in the outdoor places (Jørgen, 2026-10-02: "we must make the island feel more alive ...
// and small creatures, birds etc"; docs/game/places.md, each place's "Creatures"). Installed on a place once it is
// built and its static geometry batched (places/lifecycle.js); from then on it steps with the place's own update.
// They are scenery: nothing to use or talk to except the cats, which Eric can pet (pet.js), and they never stand in
// Eric's way (people walk through the birds, which get out of the way first). Off with ?nocreatures.
import * as THREE from 'three';
import { CREATURES, AVOID, BIRD_KINDS, countFor, about } from './catalog.js';
import { PERCHES } from './perches.js';
import { BirdMeshes, Blobs } from './meshes.js';
import { GROUPS } from './birds.js';
import { Cat, Insects } from './others.js';
import { creatureWorld } from './world.js';
import { qualityTier } from '../settings.js';
import { sim } from '../sim.js';
import { creatureCall } from '../ambience.js';
import { petThings } from './pet.js';

const OFF = new URLSearchParams(location.search).has('nocreatures');
let stepping = null; // the place whose creatures stepped last

export function installCreatures(game, place, name) {
  const defs = CREATURES[name];
  if (OFF || !defs || !place.space || !place.nav) return;
  const tier = qualityTier();
  const root = new THREE.Group();
  root.name = 'creatures';
  root.userData.noBatch = true;
  place.space.add(root);
  const blobs = new Blobs(48);
  root.add(blobs.mesh);
  const avoid = (AVOID[name] || []).map((id) => place.things[id]?.spot?.()).filter(Boolean);
  const W = creatureWorld(game, place, PERCHES[name] || {}, { sound: creatureCall, blobs, avoid });
  // one set of instanced meshes per kind of bird, sized for every group of that kind
  const meshes = {};
  for (const kind of BIRD_KINDS) {
    const n = defs.filter((d) => d.kind === kind).reduce((s, d) => s + countFor(d.n, tier), 0);
    if (!n) continue;
    meshes[kind] = new BirdMeshes(kind, n, W.K * 1.25);
    root.add(meshes[kind].group);
  }
  const groups = defs.flatMap((d) => {
    const n = countFor(d.n, tier);
    const g =
      d.kind === 'cat'
        ? new Cat(d, W, root)
        : meshes[d.kind]
          ? new GROUPS[d.kind](d, meshes[d.kind], n, W)
          : new Insects(d, n, W, root);
    g.def = d;
    return [g];
  });
  petThings(
    game,
    place,
    name,
    groups.filter((g) => g instanceof Cat),
  ); // the cats can be petted

  function reset() {
    W.reset();
    for (const g of groups) g.reset(about(g.def.when, sim.period));
  }
  function step(dt) {
    W.t += dt;
    W.look();
    // the first frame after entering (or coming back): everyone placed afresh round Eric
    if (stepping !== place) {
      stepping = place;
      reset();
    }
    blobs.start();
    const live = {};
    for (const g of groups) {
      g.step(dt, about(g.def.when, sim.period));
      if (g.birds?.some((b) => b.mode !== 'off')) live[g.def.kind] = true;
    }
    for (const [kind, m] of Object.entries(meshes)) m.commit(!!live[kind]);
    blobs.commit();
    window.__creatures = api;
  }
  const update = place.update;
  place.update = function (dt, t) {
    update.call(this, dt, t);
    step(Math.min(dt, 0.1));
  };
  // what is where, for the shots tool and checks
  const info = () =>
    groups.map((g) => ({
      id: g.def.id,
      kind: g.def.kind,
      shown: g.birds
        ? g.birds.filter((b) => b.mode !== 'off').length
        : g.bugs
          ? g.bugs.filter((b) => b.on).length
          : +g.root.visible,
      modes: g.birds?.map((b) => b.mode).join(','),
      // how many are on screen now
      seen: (g.birds || g.bugs || [g]).filter(
        (b) => (b.root ? b.root.visible : b.mode ? b.mode !== 'off' : b.on) && W.inView(b.p || b.root.position, 1),
      ).length,
      where: (g.birds || g.bugs || [g])
        .map((b) =>
          (b.p || b.root.position)
            .toArray()
            .map((v) => +v.toFixed(1))
            .join(' '),
        )
        .join(' | '),
    }));
  // evening: for ambience.js (crickets after work); reset: everyone placed afresh (the shots tool, after it sets the time)
  const api = { info, groups, W, reset, evening: () => sim.period === 'evening' };
  place.creatures = api;
}
