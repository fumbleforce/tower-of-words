// ?test=fast: the whole day plays itself, fast and silent, for QA. Time runs 8x (main.js), lines advance on
// their own, the first reply is taken, and a small driver walks to goals and tries the words it knows on
// whatever answers to them, the way a curious player would. window.__test reports progress and errors.
import { ui, setMuted } from './ui.js';
import { known, SAYABLE } from './lang.js';
import { flags } from './narrative/state.js';
import { doorwayAt } from './movement/doorways.js';
import { day3Tick, preferred } from './testmode-day3.js';
import { day5Tick, day5DeliveryTick } from './testmode-day5.js';
import { DAY4_ROUTE } from './testmode-day4.js';

export function start(game) {
  setMuted(true);
  ui.auto = true;
  import('./move.js').then((m) => m.startMoveCheck(game));
  const T = (window.__test = { log: [], errors: [], places: [], done: false, t0: performance.now() });
  window.addEventListener('error', (e) => T.errors.push(String(e.message)));
  window.addEventListener('unhandledrejection', (e) => T.errors.push(String(e.reason)));
  watchDoorways(game, T);
  const tried = new Set();
  // ?route=social takes the other way through the gate (no akete; sumimasen to the guard)
  const route = new URLSearchParams(location.search).get('route') || 'magic';
  T.route = route;
  // a later day: each choice takes the next reply on each visit (so a menu offered again, "Stay a little longer" or
  // "Head home", moves on); the replies taken are kept for the report. Day 1 keeps the first reply.
  const seenChoice = {};
  T.choices = [];
  ui.autoPick = (chips) => {
    if ((game.sim?.day || 1) === 1) return 0;
    const want = preferred(T, chips); // a reply day 3's route asked for (testmode-day3.js)
    if (want >= 0) {
      T.choices.push(`${game.runner.currentNode}: ${String(chips[want].html).replace(/<[^>]+>/g, '')}`);
      return want;
    }
    const key = (game.runner.currentNode || '') + '|' + chips.map((c) => c.html).join('|');
    const n = (seenChoice[key] = (seenChoice[key] ?? -1) + 1);
    const i = n % chips.length;
    T.choices.push(`${game.runner.currentNode}: ${String(chips[i].html).replace(/<[^>]+>/g, '')}`);
    return i;
  };
  let lastPlace = '',
    idle = 0,
    busyFor = 0;
  setInterval(() => {
    if (window.__ended) {
      T.day = game.sim?.day || 1;
      if (!T.practice && T.day === 1) T.errors.push('the Say practice prompt was never passed');
      T.done = true;
      return;
    }
    // the ticket app (ui/tickets-view.js): open each unread ticket, take a new one, then close the window
    const app = globalThis.document?.getElementById('ticketsApp');
    if (app && !app.hidden) return driveTickets(app, T);
    // the notice board up close (ui/finds-view.js showBoard): take the first slip on offer, then close it
    const board = globalThis.document?.getElementById('boardView');
    if (board && !board.hidden) {
      const slip =
        (game.sim?.day === 4
          ? [...board.querySelectorAll('button.slip')].find((b) => b.parentElement?.textContent.includes('Tennis'))
          : null) || board.querySelector('button.slip');
      if (slip && !T.slipTaken) {
        T.slipTaken = true;
        T.log.push('board: take a slip');
        return slip.click();
      }
      T.log.push('board: close');
      return board.click();
    }
    if (game.sim?.day === 5 && day5DeliveryTick()) return;
    const p = game.place;
    if (!p || !game.walker) return;
    if (p.name !== lastPlace) {
      lastPlace = p.name;
      T.places.push(p.name);
      tried.clear();
      idle = 0;
    }
    if (game.player.seated && game.walker.path) game.walker.stop();
    if (game.busy || game.saying || game.walker.path) {
      if (++busyFor > 600) {
        T.log.push('stuck busy');
        busyFor = 0;
      }
      return;
    }
    busyFor = 0;
    // day 3: the route through the Saturday (testmode-day3.js) before anything else
    if ((game.sim?.day || 1) === 3 && day3Tick(game, T, (T.route3 ||= { i: 0, wait: 0 }))) return;
    if (game.sim?.day === 4 && day3Tick(game, T, (T.route4 ||= { i: 0, wait: 0 }), DAY4_ROUTE)) return;
    if (game.sim?.day === 5 && day5Tick(game, T, (T.route5 ||= { i: 0, wait: 0 }))) return;
    const list = game.markers.list.filter((m) => m.enabled());
    const goals = list.filter((m) => m.goal());
    // social route: at the jam, say すみません to the guard (the way a player takes the social way), not the goal
    // marker (talking to Hamada first leads to 開けて), as js/bonds/day1-check.mjs does
    if (route === 'social' && game.runner.has('say:sumimasen:guard') && !tried.has('social-way')) {
      const g = list.find((m) => m.id === 'guard');
      if (g) {
        tried.add('social-way');
        T.log.push(p.name + ' social: say:sumimasen:guard');
        const s = g.spot();
        game.walker.goTo(s[0], s[1], () => game.sayWord('sumimasen', g));
        return;
      }
    }
    // Greet Kenji before the machine-room walk: its entry zone can interrupt that walk, and the chair now
    // continues straight into the repair request. Keep this bond-check action independent of an idle gap.
    if (p.name === 'office' && flags.kenji_intro && !flags.greeted_kenji && known.has('ohayo')) {
      const kenji = list.find((m) => m.id === 'kenji');
      if (kenji) {
        T.log.push('office say:ohayo:kenji');
        const s = kenji.spot();
        game.walker.goTo(s[0], s[1], () => game.sayWord('ohayo', kenji));
        return;
      }
    }
    // 1. a goal: walk up and use it
    for (const g of goals) {
      if (route === 'social' && g.id === 'kuroda' && game.runner.has('say:sumimasen:guard')) continue;
      const k = 'use:' + g.id + ':' + (idle >> 4);
      if (!tried.has(k)) {
        tried.add(k);
        T.log.push(p.name + ' ' + k);
        game.use(g);
        return;
      }
    }
    // 2. a word that something here answers to, goals first
    const order = [...goals, ...list.filter((m) => !goals.includes(m))];
    for (const m of order)
      for (const w of SAYABLE) {
        if (!known.has(w)) continue;
        const key = `say:${w}:${m.id}`;
        if (tried.has(key) || !game.runner.has(key)) continue;
        if (route === 'social' && w === 'akete') continue;
        tried.add(key);
        T.log.push(p.name + ' ' + key);
        // words go through the same path as the Say menu, practice prompt included (ui.auto types the word)
        const fire = () => {
          if (game.busy) return;
          const before = +(flags['practice_' + w] || 0);
          game.sayWord(w, m).then(() => {
            if (+(flags['practice_' + w] || 0) > before) T.practice = (T.practice || 0) + 1;
          });
        };
        if (game.player.seated) fire();
        else {
          const s = m.spot();
          game.walker.goTo(s[0], s[1], fire);
        }
        return;
      }
    // 3. anything not yet looked at
    for (const m of list) {
      const k = 'use:' + m.id;
      if (!tried.has(k)) {
        tried.add(k);
        T.log.push(p.name + ' ' + k);
        game.use(m);
        return;
      }
    }
    idle++;
    if (idle % 16 === 0) for (const k of [...tried]) if (k.startsWith('use:')) tried.delete(k); // look again
    // a softlock: nothing left to do and no way on. Fails the build.
    if (idle > 300) {
      T.log.push('STUCK: nothing left to try');
      T.errors.push(
        `softlock in ${p.name}: no reachable next goal (goal text: "${game.ui.goalText || ''}", goal markers: ${goals.map((g) => g.id).join(',') || 'none'})`,
      );
      T.done = true;
    }
  }, 60);
}
// one action a tick, as a player would: read an unread ticket, take it if it's new, close the app when all are read
function driveTickets(app, T) {
  const take = app.querySelector('.d-act .take');
  if (take) {
    T.log.push('tickets: take ' + app.querySelector('.d-id')?.textContent);
    return take.click();
  }
  const row = app.querySelector('.tk-rows .tk-row.unread');
  if (row) {
    T.log.push('tickets: read ' + row.dataset.id);
    return row.click();
  }
  T.log.push('tickets: close');
  app.querySelector('.tk-close').click();
}
// No scene starts with Eric in a doorway (movement/doorways.js; Jørgen, 2026-10-04: "trapping me in the door"). Fails
// the day when a trigger zone fires with him in one (the zone must sit clear of it), or when he is still in one as a
// scene's lines begin; a scene that had to walk him out first is logged.
function watchDoorways(game, T) {
  const where = (d) => {
    const p = game.player.root.position;
    return `${game.place.name} ${d.id} at (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`;
  };
  const onTrigger = game.onTrigger;
  game.onTrigger = (key) => {
    const p = game.player?.root.position;
    const d = p && /^zone:/.test(key) && game.runner.has(key) && doorwayAt(game.place, p.x, p.z);
    if (d) T.errors.push(`${key} fired with Eric in a doorway: ${where(d)}`);
    onTrigger?.(key);
  };
  game.onDoorway = (d, still) => {
    T.log.push(`doorway: walked out of ${where(d)} as a scene started`);
    if (still) T.errors.push(`a scene started with Eric in a doorway: ${where(still)}`);
  };
}
