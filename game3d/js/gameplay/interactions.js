import * as THREE from 'three';
import { CHARACTER_SCALE, characterHead } from '../character-scale.js';
import { giveItem } from './gifts.js';
import { approachSpot } from '../move.js';
import { needsPractice } from '../mastery.js';
import { learned } from '../feel.js';
import { sfx, voice, voiceThenBeat } from '../ui.js';
import { WORDS, known, SAYABLE } from '../lang.js';
import { defaultReaction } from '../story.js';
import { flags, cond } from '../narrative/state.js';
import { sim, ITEMS, meet, take, peopleHTML } from '../sim.js';
import { isPerson, idleTalk } from './idle-talk.js';
import { installDoorCards } from '../ui/door-card.js';
import { PLAYER_ID } from '../mc.js';
import { travelOf } from './pin-kinds.js';
import { registerReaction, registerDue } from './register-reactions.js';

export function installInteractions(game) {
  const ui = game.ui;
  installDoorCards(game, () => sim); // a shut door's card on screen with its line (ui/door-card.js)
  function thingOn(id, t) {
    const person = game.place && game.place.people[id];
    if (person && person.root && !person.root.visible) return false;
    // a person is always there to talk to: the story's `show` doesn't hide people (idle-talk.js)
    const s = game.story && game.story.show && game.story.show[id];
    if (s !== undefined && !person && !cond(s)) return false;
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
      // a way between places (a door, stairs, the lift, a way out) gets its own symbol and verb (pin-kinds.js)
      const travel = travelOf(place.name, id, t);
      const item = {
        ...t,
        id,
        travel,
        verb: travel ? travel.verb : t.verb,
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
      // a thing whose talk is a flat line (`pin: 'near'` in the catalog), or whose only use is a word of its own (its
      // say: trigger: the fan, the kettle), shows its pin only when Eric is close; with nothing of its own to do (no
      // talk, act or look, no word of its own) it has no pin and can't be picked, whatever words he knows. A thing
      // never takes the generic reply to a word (Jørgen, 2026-10-10, on the guard's monitor: "Stop making random
      // things that have zero consequence or interesting actions/reactions attached to them interactive"). A "no
      // marker" thing stays out unless it's the goal or one of its own words works on it (Jørgen, 2026-09-30: "a
      // hundred 'interactive' things in this room with symbols that dont really do anything interesting";
      // notes/interaction-audit.md)
      if (!isPerson(game, item)) {
        const talks = () => talksNow(item);
        // Say is in its menu only once Say has been taught (the first time it shows only at the goal, onboard.js)
        const other = () => sayOpen() && item.wordable();
        // cached for a moment like wordable: the markers, the targets and the clicks ask every frame
        const does = () => {
          const now = performance.now();
          if (!item._da || now - item._da > 400) {
            item._da = now;
            item._dv = quiet ? (other() ? 'near' : '') : talks() ? t.pin || 'always' : other() ? 'near' : '';
          }
          return item._dv;
        };
        item.enabled = () => thingOn(id, t) && (item.goal() || !!does());
        item.nearOnly = () => !item.goal() && does() === 'near';
        // its only use right now is a word (the fan once he knows tomatte, the fridge): using it opens the Say menu
        item.sayOnly = () => does() === 'near' && !talks() && other();
      }
      const person = place.people[id] || (id === 'mio' ? game.mioNpc : null),
        head = CHARACTER_SCALE !== 1 && characterHead(person);
      if (head && !person.cat && !person.selfGait) {
        const scale = new THREE.Vector3();
        item.anchor = (v) => {
          (characterHead(person) || person.root).getWorldPosition(v);
          person.root.getWorldScale(scale);
          v.y += 0.24 * (person.model ? CHARACTER_SCALE : 1) * scale.y;
          return v;
        };
      }
      game.markers.add(item);
    }
  }
  // the action menu's own Pet/Talk row uses its target straight away (no menu again)
  game.use = (item, options = {}) => use(item, { ...options, direct: true });
  // a tap or click asks for a target's menu; E, Space and Enter use it straight away. The input that led to a use is
  // read from the last pointer press (main.js calls use() from its pointer and key handlers alike)
  let pointerAt = -1e9;
  globalThis.addEventListener?.('pointerdown', () => (pointerAt = performance.now()), true);
  globalThis.addEventListener?.('keydown', () => (pointerAt = -1e9), true);
  // a scene that starts while he walks to something he clicked (a zone he crossed, a queued event) stops that walk: he
  // carries on to it and uses it once the scenes are over (cold playtest 2026-09-30: Mio needed an extra E)
  let cutUse = null;
  const beat = game.beat;
  game.beat = async function (fn) {
    if (this.busy || this.runner?.recoveryError) return beat.call(this, fn);
    if (this.walker.arrive?.use) cutUse = this.walker.arrive.use;
    const place = this.place;
    await beat.call(this, fn);
    if (!cutUse || this.busy) return; // a queued scene carries it on
    const u = cutUse;
    cutUse = null;
    if (this.place === place && !this.walker.path && this.markers.list.includes(u.item) && u.item.enabled())
      use(u.item, u.options);
  };
  // get Eric out of his seat (a tap on the floor or on something out of reach does this)
  function standUp() {
    const pl = game.player;
    if (!pl.seated) return;
    if (pl.seatOut) {
      // off a bench the story sat him on (hooks/movement.js H.sit): back on the free floor in front of it
      pl.root.position.set(pl.seatOut[0], 0, pl.seatOut[1]);
      pl.seatOut = null;
      game.walker.sync?.();
    } else if (game.place.standPerson) game.place.standPerson(PLAYER_ID);
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
  function use(item, { direct = false, trigger = null } = {}) {
    // while Eric is saying a word (its practice prompt, his voice, the answer) a tap on anything else is ignored, so
    // the word is never lost to a new talk; saying is cleared in sayWord's finally, so this can't stick
    if (!item || game.busy || game.saying) return;
    cutUse = null;
    const ask = !direct && performance.now() - pointerAt < 1500;
    ui.closeActs?.();
    if (held() && item.id !== game.hold) {
      holdNudge();
      return;
    }
    const go = () => {
      // he may arrive after a Say started on the way
      if (game.busy || game.saying) return;
      if (item.face) game.walker.faceTo(...item.face());
      // tapped or clicked, with more than one thing to do there (its verb and Say): its menu opens, nothing is used
      // yet (Jørgen, 2026-10-02: the menu opening by itself "is very disruptive"). One thing to do: it's done.
      if (ask && canUse(item) && (sayRow(item) || game.topicFor?.(item.id))) {
        game.targetLock = item;
        game.near = item;
        ui.openActs(item);
        return;
      }
      talk(item, trigger);
    };
    go.use = { item, options: { direct, trigger } }; // the beat wrapper above sends him on to it if a scene cuts this walk
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
  function talk(item, trigger) {
    const person = isPerson(game, item);
    if (game.place.people[item.id]) {
      const introduction = sim.people[item.id]?.introduction;
      if (!introduction || flags[introduction]) meet(game, item.id);
      ui.refreshPeople(sim.met.size);
    }
    // a thing whose only use now is a word (an empty talk node doesn't count): E opens the Say menu
    if (item.sayOnly?.()) return void say();
    if (game.runner.trigger(trigger || 'talk:' + item.id)) return;
    if (item.act) {
      game.beat(() => item.act());
      return;
    }
    const look = item.look;
    if (look) game.beat(() => ui.say(null, typeof look === 'function' ? look() : look));
    else if (person) idleTalk(game, item.id);
  }
  // what E does on a target now: talk to a person, the story's talk: trigger, or the thing's own act or look line.
  // A talk: entry that falls back to an empty node (the chair's `noop`, the copier's look) is nothing to use: the
  // menu got an E row that did nothing there (issue #128; game3d/tools/menu-day-check.mjs checks every moment)
  function talksNow(item) {
    if (item.act || item.look) return true;
    const n = game.runner.resolve('talk:' + item.id, { peek: true });
    return !!n && (game.story.nodes?.[n]?.length ?? 1) > 0;
  }
  function canUse(item) {
    return !!(isPerson(game, item) || talksNow(item));
  }
  const sayOpen = () => {
    const ob = globalThis.__onboard;
    return !ob || !ob.active || ob.sayUsed;
  };
  // Say goes in a target's action menu when a word Eric knows does something there now: a say: trigger for it (or
  // for anything), or a person's reaction to how he says it. A thing with no word of its own gets no Say row: the
  // generic reply any thing gave to a word is gone (Jørgen, 2026-10-10: the guard's monitor offered only "Say a word")
  function saysSomething(item) {
    if (!item || !SAYABLE.some((w) => known.has(w))) return false;
    const hook = (w) => game.runner.has(`say:${w}:${item.id}`) || game.runner.has(`say:${w}:*`);
    return SAYABLE.some((w) => known.has(w) && hook(w)) || registerDue(game, item.id);
  }
  // whether the target's menu has a Say row: a word does something there (or the Say tip is up), and while the
  // train teaches Say, only at the goal (the cat)
  function sayRow(item) {
    const ob = globalThis.__onboard || {};
    if (!item || !SAYABLE.some((w) => known.has(w))) return false;
    if (!saysSomething(item) && !ui.sayIntro) return false;
    return !!(ob.sayUsed || !ob.active || item.goal?.());
  }
  game.canUse = canUse;
  game.saysSomething = saysSomething;
  game.sayRow = sayRow;
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
      // a scene that came up while he was saying it (he walked up to the doors with the prompt open) runs now
      // (runner.js trigger, issue #81); if the word started a scene of its own, that scene runs the queue when it ends
      if (!game.busy && game.queue?.length) game.beat(game.queue.shift());
    }
  }
  async function sayWord0(id, target) {
    // until a word has been typed or said a few times, Say asks for it again (Jørgen: not just clicking it);
    // not with Settings > Skip skill checks on
    if (needsPractice(id) && !globalThis.__settings?.skipChecks) {
      const ok = await ui.typePrompt(
        id,
        {
          who: null,
          text: target ? `Say it to ${sayName(target)}.` : 'Say it.',
        },
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
    // then, now and then, how they took the way he said it (register-reactions.js), after their answer
    const any = `say:${id}:*`,
      by = key && game.runner.has(key) ? key : game.runner.has(any) ? any : null;
    const answer = by && game.runner.resolve?.(by, { peek: true });
    const react = target && isPerson(game, target) ? registerReaction(game, target.id, id, answer) : null;
    if (by) {
      if (by === key) game.found.add(key);
      if (game.runner.trigger(by) && react) game.queue.push(react);
      return;
    }
    // with no answer of their own, their reaction to how he said it is the answer
    game.beat(async () => {
      if (react) await react();
      else if (target) await ui.say(null, defaultReaction(target, id));
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
  ui.peopleHTML = (faceOf) => (ui.clubsHTML?.() || '') + peopleHTML(faceOf); // the joined clubs above the people (clubs/index.js)
  ui.items = ITEMS;
  // the person in reach who can be given something (the Give button and the bag both use it)
  function giveTarget() {
    const t = game.sayTarget;
    return t && game.place.people[t.id] && /person/.test(t.kind || '') ? t : null;
  }
  async function give(picked) {
    if (game.busy || !sim.inv.length || !game.sayTarget) return;
    const target = game.sayTarget;
    const item = picked || (await ui.giveMenu(target.label, sim.inv, ITEMS));
    if (!item || !sim.inv.includes(item)) return;
    if (ITEMS[item]?.giftable === false) {
      ui.toast('Eat your bread at the bakery window seat.');
      return;
    }
    // a refusal (keep: true on the trigger entry, e.g. a second gift) runs its lines but leaves the item in the bag
    if (giveItem({ runner: game.runner, flags, take }, item, target.id)) return;
    game.beat(() =>
      ui.say(null, `${target.label} doesn't seem to want the ${ITEMS[item].name.toLowerCase()}. You keep it.`),
    );
  }
  ui.onGive = () => give();
  // the Bag: a click on a drink gives it to the person in reach (cold playtest 2026-09-30: nothing in it could be clicked)
  const bag = globalThis.document?.getElementById('bagPanel');
  const note = bag?.querySelector('.yen').insertAdjacentElement('afterend', document.createElement('p'));
  if (note) note.className = 'to';
  globalThis.document?.getElementById('bagBtn')?.addEventListener('click', () => {
    const to = !game.busy && giveTarget();
    const verb = document.body.classList.contains('phone') ? 'Tap' : 'Click';
    note.textContent = to ? `${verb} an item to give it to ${to.label}.` : 'Walk up to someone to give them something.';
    bag.classList.toggle('can-give', !!to);
  });
  bag?.querySelector('ul').addEventListener('click', (e) => {
    const li = e.target.closest('li');
    const item = li && sim.inv[[...li.parentNode.children].indexOf(li)];
    if (!item || !bag.classList.contains('can-give') || !giveTarget()) return;
    bag.hidden = true;
    give(item);
  });
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
