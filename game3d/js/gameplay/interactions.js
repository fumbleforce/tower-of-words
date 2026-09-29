import * as THREE from 'three';
import { giveItem } from './gifts.js';
import { approachSpot } from '../move.js';
import { needsPractice } from '../mastery.js';
import { learned } from '../feel.js';
import { sfx, voice, voiceThenBeat } from '../ui.js';
import { WORDS, known, SAYABLE } from '../lang.js';
import { defaultReaction } from '../story.js';
import { flags, cond } from '../narrative/state.js';
import { sim, ITEMS, meet, take, peopleHTML } from '../sim.js';

export function installInteractions(game) {
  const ui = game.ui;
  function thingOn(id, t) {
    const person = game.place && game.place.people[id];
    if (person && person.root && !person.root.visible) return false;
    const s = game.story && game.story.show && game.story.show[id];
    if (s !== undefined && !cond(s)) return false;
    if (t.enabled !== undefined) return typeof t.enabled === 'function' ? t.enabled() : t.enabled;
    return true;
  }
  function buildMarkers(place) {
    game.markers.clear();
    const labels = (game.story && game.story.labels) || {};
    for (const [id, t] of Object.entries(place.things)) {
      // noMarker things (door_l, the plant...) stay unmarked, except while the story makes one of them the goal
      // (the train's "Wait by the doors" goal was on door_l and had no marker: a softlock)
      const quiet = !!t.noMarker;
      const L = labels[id];
      const item = {
        ...t,
        id,
        label: Array.isArray(L) ? L[0] : L || t.label,
        labelIf: Array.isArray(L) ? { text: L[0], cond: L[1], other: t.label } : null,
        labelCond: cond,
        enabled: () => thingOn(id, t),
        goal: () => {
          const g = game.story && game.story.goal && game.story.goal[id];
          return g !== undefined ? cond(g) : false;
        },
        // a thing that a word he knows does something to right now
        // (cached for a moment: it is asked every frame)
        wordable: () => {
          const now = performance.now();
          if (!item._wa || now - item._wa > 400) {
            item._wa = now;
            item._wv =
              !/person/.test(t.kind || '') && SAYABLE.some((w) => known.has(w) && game.runner.has(`say:${w}:${id}`));
          }
          return item._wv;
        },
      };
      if (quiet) item.enabled = () => thingOn(id, t) && item.goal();
      game.markers.add(item);
    }
  }
  game.use = (item) => use(item);
  // get Eric out of his seat (a tap on the floor or on something out of reach does this)
  function standUp() {
    const pl = game.player;
    if (!pl.seated) return;
    if (game.place.standPerson) game.place.standPerson('eric');
    else {
      pl.seated = false;
      pl.setState('idle');
      pl.root.position.y = 0;
    }
    pl.seated = false;
    pl.setState('idle');
  }
  game.standUp = standUp;
  // a story hold ({ do: 'hold', who: 'mori' }): he stays with that person until the story lets go. Walking and taps on
  // anything else do nothing but get a small bow from them; that person and the Say menu still work. Only once he knows
  // a word that person answers to, so a hold can never shut him in (Jørgen: left Mori standing and got stuck in the office)
  function held() {
    const h = game.hold;
    return !!(
      h &&
      !game.busy &&
      game.place &&
      game.place.people[h] &&
      SAYABLE.some((w) => known.has(w) && game.runner.has(`say:${w}:${h}`))
    );
  }
  function holdNudge() {
    if (game._holdBow) return;
    game._holdBow = true;
    game.walker.stop();
    Promise.resolve(game.hooks.bow({ who: game.hold })).finally(() => {
      game._holdBow = false;
    });
  }
  function use(item) {
    if (!item || game.busy) return;
    if (held() && item.id !== game.hold) {
      holdNudge();
      return;
    }
    const go = () => {
      if (game.busy) return;
      if (item.face) game.walker.faceTo(...item.face());
      talk(item);
    };
    const sp = approachSpot(game, item) || (item.spot ? item.spot() : null);
    // seated: he talks from his seat to what's within reach; for anything further he stands up and walks over
    if (game.player.seated) {
      const p = game.player.root.position,
        a = item.anchor(new THREE.Vector3());
      game.place.space.worldToLocal(a);
      if (Math.hypot(p.x - a.x, p.z - a.z) < 1.3) {
        go();
        return;
      }
      standUp();
    }
    if (sp) {
      const p = game.player.root.position;
      if (Math.hypot(p.x - sp[0], p.z - sp[1]) < 0.12) go();
      else game.walker.goTo(sp[0], sp[1], go);
    } else go();
  }
  function talk(item) {
    if (game.place.people[item.id]) {
      meet(game, item.id);
      ui.refreshPeople(sim.met.size);
    }
    if (game.runner.trigger('talk:' + item.id)) return;
    if (item.act) {
      game.beat(() => item.act());
      return;
    }
    const look = item.look;
    if (look) game.beat(() => ui.say(null, typeof look === 'function' ? look() : look));
  }
  async function say() {
    // one Say at a time: no reopening while the last word's reaction is still coming (QA round 1: menu under the dialogue, the cat line twice)
    if (game.busy || !SAYABLE.some((w) => known.has(w)) || game.saying) return;
    const target = game.sayTarget;
    const id = await ui.sayMenu(target ? target.label : null);
    if (!id) return;
    await sayWord(id, target);
  }
  // saying a chosen word to a target, as the Say menu does (the fast test drives words through this too)
  async function sayWord(id, target) {
    game.saying = true;
    try {
      return await sayWord0(id, target);
    } finally {
      game.saying = false;
    }
  }
  async function sayWord0(id, target) {
    // until a word has been typed or said a few times, Say asks for it again (Jørgen: not just clicking it)
    if (needsPractice(id)) {
      const ok = await ui.typePrompt(
        id,
        { who: null, text: target ? `Say it to ${sayName(target)}.` : 'Say it.' },
        { cancel: true },
      );
      ui.closeTalk();
      if (!ok) return;
    }
    const key = target ? `say:${id}:${target.id}` : null;
    if (target && target.face) game.walker.faceTo(...target.face());
    const spoken = voice(WORDS[id].voice);
    game.mioSays(id);
    // Eric finishes his word before anyone answers
    await voiceThenBeat(spoken, 300);
    if (key && game.runner.has(key)) {
      game.found.add(key);
      game.runner.trigger(key);
      return;
    }
    if (game.runner.has(`say:${id}:*`)) {
      game.runner.trigger(`say:${id}:*`);
      return;
    }
    game.beat(async () => {
      if (target) await ui.say(null, defaultReaction(target, id));
      else await ui.say(null, `You say ${WORDS[id].ja} to nobody in particular. Nobody in particular does anything.`);
    });
  }
  // "Say it to Mio.", "Say it to the sleeping man.", "Say it to the machine room."
  function sayName(t) {
    const l = t.label || '';
    return /^(Mr|Ms|Mrs)\.? |^[A-Z][a-z]+$/.test(l) && /person/.test(t.kind || '')
      ? l
      : 'the ' + l.charAt(0).toLowerCase() + l.slice(1);
  }
  ui.onSay = say;
  game.sayWord = sayWord;
  ui.peopleHTML = peopleHTML;
  ui.items = ITEMS;
  async function give() {
    if (game.busy || !sim.inv.length || !game.sayTarget) return;
    const target = game.sayTarget;
    const item = await ui.giveMenu(target.label, sim.inv, ITEMS);
    if (!item) return;
    // a refusal (keep: true on the trigger entry, e.g. a second gift) runs its lines but leaves the item in the bag
    if (giveItem({ runner: game.runner, flags, take }, item, target.id)) return;
    game.beat(() =>
      ui.say(null, `${target.label} doesn't seem to want the ${ITEMS[item].name.toLowerCase()}. You keep it.`),
    );
  }
  ui.onGive = give;
  game.sim = sim;
  // a small moment when a bond steps up (sim.js fires amakawa:bondstep); meeting someone (0 to 1) stays quiet
  window.addEventListener('amakawa:bondstep', (e) => {
    const d = e.detail || {};
    if (!d.to || d.to <= 1 || d.to < d.from) return;
    const nm = (sim.people[d.who] && sim.people[d.who].name) || d.who;
    ui.toast?.(`${nm}: ${d.name || 'closer'}`, 3000);
    sfx('word');
  });
  game.learned = (kind) => learned(game, kind);

  return { buildMarkers, use, standUp, held, holdNudge, say };
}
