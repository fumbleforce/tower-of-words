import { actionShot } from '../day4/shot.js';
import { captureObjects, restoreObjects } from '../day4/saved.js';
import { dayCast } from '../day-cast.js';
import { applyPlan } from '../day3/index.js';
import { PLANS } from './plan.js';
import { MONDAY_DETAILS } from './catalog.js';
import { sim } from '../../sim.js';
import { flags } from '../../narrative/state.js';
import { labelRepair } from './labels.js';
import { selectorRepair } from './selector.js';
import { mondayOffice } from './office.js';
import { mondayCommons } from './commons.js';
import { mondayNotices } from './notices.js';
import { prop, moveProp } from './props.js';

export function attachMonday(game, P, name) {
  const details = MONDAY_DETAILS[name] || {};
  const ids = Object.keys(details).filter((id) => id !== 'mio' && !P.people[id]);
  const cast = dayCast(game, {
    root: P.space,
    K: P.charScale || 1,
    ids,
    have: P.people,
  });
  const shot = actionShot(P);
  P.monday = { shot, cast, hooks: P.hooks, things: P.things, people: cast.people };
  for (const id of ids) {
    P.people[id] = cast.people[id];
    P.things[id] = { ...details[id], ...cast.thing(id) };
  }
  const before = new Set(P.space.children);
  const pieces = [];
  if (name === 'pool') P.things.pool_notice.enabled = () => sim.day >= 4;
  if (name === 'sports') {
    const [x, z] = P.things.court_display.face();
    const cover = prop(P, [0.07, 0.75, 0.72], '#476675', [x + 0.13, 1.25, z]);
    pieces.push({
      restore() {
        cover.visible = sim.day === 5 && !!flags.d4_display_done;
      },
    });
  }
  mondayNotices(P, name);
  if (name === 'forecourt') {
    const labels = labelRepair(game, P);
    pieces.push(labels);
    P.hooks.labelRepair = labels.hook;
  }
  if (name === 'karaoke_booth') {
    const selector = selectorRepair(game, P);
    pieces.push(selector);
    P.hooks.selectorRepair = selector.hook;
    const old = P.kotodamaTargets;
    P.kotodamaTargets = (id) => (id === 'song_terminal' ? selector.magicTargets() : old?.(id));
  }
  if (name === 'office') {
    const office = mondayOffice(game, P, cast);
    pieces.push(office);
    Object.assign(P.hooks, office.hooks);
  }
  if (name === 'dorm_commons') {
    const commons = mondayCommons(game, P);
    pieces.push(commons);
    P.hooks.day5Commons = commons.hook;
  }
  let lunchBox, lid;
  if (name === 'plaza') {
    lunchBox = prop(P, [0.2, 0.065, 0.13], '#c47368', [18.1, 0.67, -6.35]);
    lid = prop(P, [0.22, 0.018, 0.15], '#354e6c', [18.1, 0.71, -6.35]);
    lunchBox.visible = lid.visible = false;
  }
  const props = P.space.children.filter((child) => !before.has(child)).map((child) => [child, child.visible]);
  if (sim.day !== 5) for (const [child] of props) child.visible = false;
  const snapshot = P.snapshotState,
    load = P.restoreState;
  P.snapshotState = () => ({
    ...snapshot?.(),
    monday: {
      props: captureObjects(props.map(([child]) => child)),
      shot: shot.snapshot(),
      pieces: pieces.map((piece) => piece.snapshot?.() || null),
    },
  });
  P.restoreState = (saved) => {
    load?.(saved);
    const state = saved.world?.monday;
    if (!state) return;
    restoreObjects(
      props.map(([child]) => child),
      state.props,
    );
    shot.load(state.shot);
    state.pieces?.forEach((data, i) => {
      if (data) pieces[i]?.load?.(data);
    });
  };
  const update = P.update?.bind(P);
  P.update = (...args) => {
    update?.(...args);
    if (sim.day === 5) {
      shot.update();
      cast.update(args[0]);
      pieces.forEach((piece) => piece.update?.(args[0]));
    }
  };
  P.day5Period = () => {
    for (const [id, rig] of Object.entries(P.people)) if (!cast.people[id]) cast.adopt(id, rig);
    P.sunday?.restore?.();
    applyPlan(cast, P, PLANS[name] || {});
    for (const piece of pieces) piece.restore?.();
    for (const id of Object.keys(PLANS[name] || {})) {
      if (!P.things[id] || !cast.people[id]) continue;
      P.things[id] = { ...P.things[id], ...cast.thing(id) };
    }
    if (lunchBox) lunchBox.visible = lid.visible = sim.period === 'lunch';
    if (name === 'office') {
      P.hooks.machineDoor?.({
        state: sim.period === 'morning' || sim.period === 'lunch' ? 'open' : 'closed',
      });
      P.hooks.copier?.({ state: 'idle' });
    }
    // These are captured before generic Talk records that the colleague was met.
    if (!flags.met_kenji) flags.d5_kenji_needs_intro = true;
    if (!flags.met_mori) flags.d5_mori_needs_intro = true;
    if (!flags.met_emi) flags.d3_emi_needs_intro = true;
  };
  P.day5 = async (a = {}) => {
    if (sim.day !== 5) return;
    for (const [child, visible] of props) child.visible = visible;
    // Mio belongs to lifecycle and is attached after place preparation.
    for (const [id, rig] of Object.entries(P.people)) if (!cast.people[id]) cast.adopt(id, rig);
    if (name === 'office' && P.people.mio) P.things.mio = { ...details.mio, ...cast.thing('mio') };
    if (a.state === 'aoiLunch' && lunchBox) {
      lunchBox.visible = lid.visible = true;
      await moveProp(game, lid, [18.35, 0.67, -6.35]);
      return;
    }
    // Existing callbacks restore the station signoff, booking terminal and other inherited jobs.
    if (P.day3) await P.day3(a);
    else if (P.onDay3) await P.onDay3(a);
    P.day5Period();
  };
}

export function installDay5(game) {
  game.hooks.day5Setup = (a) => game.place?.day5?.(a);
}
