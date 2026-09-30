// ?test=fast: the whole day plays itself, fast and silent, for QA. Time runs 8x (main.js), lines advance on
// their own, the first reply is taken, and a small driver walks to goals and tries the words it knows on
// whatever answers to them, the way a curious player would. window.__test reports progress and errors.
import { ui, setMuted } from './ui.js';
import { known, SAYABLE } from './lang.js';
import { flags } from './narrative/state.js';

export function start(game) {
  setMuted(true);
  ui.auto = true;
  import('./move.js').then((m) => m.startMoveCheck(game));
  const T = (window.__test = { log: [], errors: [], places: [], done: false, t0: performance.now() });
  window.addEventListener('error', (e) => T.errors.push(String(e.message)));
  window.addEventListener('unhandledrejection', (e) => T.errors.push(String(e.reason)));
  const tried = new Set();
  // ?route=social takes the other way through the gate (no akete; sumimasen to the guard)
  const route = new URLSearchParams(location.search).get('route') || 'magic';
  T.route = route;
  let lastPlace = '',
    idle = 0,
    busyFor = 0;
  setInterval(() => {
    if (window.__ended) {
      if (!T.practice) T.errors.push('the Say practice prompt was never passed');
      T.done = true;
      return;
    }
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
