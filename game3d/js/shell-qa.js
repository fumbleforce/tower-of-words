// QA only (?shell=<screen>): opens one shell screen on its own with made-up data, so each can be shot and checked
// in isolation on desktop and phone. game3d/tools/shell-shots.mjs drives it. Never loaded in normal play.
import { sim } from './sim.js';
import { known } from './lang.js';

const Q = new URLSearchParams(location.search);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (f, ms = 30000) => { const t0 = performance.now(); while (!f() && performance.now() - t0 < ms) await wait(80); };

export async function run(mode, api) {
  const g = window.__game;
  const pics = Q.get('pics');       // a folder with train.jpg, gate.jpg, office.jpg (frames of each place)
  const pic = (p) => (pics ? `${pics}/${p}.jpg` : null);
  const now = Date.now();
  if (mode === 'load' || mode === 'save') {
    api.store.set(api.SLOT(1), { data: { v: 1, place: 'gate', period: 'morning' }, thumb: pic('gate'), place: 'gate', period: 'morning', date: 'Thu 1 Oct', at: now - 26 * 3600e3 });
    api.store.set(api.SLOT(2), { data: { v: 1, place: 'office', period: 'lunch' }, thumb: pic('office'), place: 'office', period: 'lunch', date: 'Thu 1 Oct', at: now - 40 * 60e3 });
    api.store.set(api.AUTO_META, { at: now - 5 * 60e3, thumb: pic('train'), date: 'Thu 1 Oct' });
  }
  const atTitle = () => document.body.classList.contains('at-title');
  if (mode === 'title' || mode === 'settings' || mode === 'load') {
    await until(atTitle);
    await wait(1200);
    if (mode === 'settings') api.openSettings();
    if (mode === 'load') api.openSaves('load');
  } else {
    await until(() => g.place && !g.busy, 20000);
    await wait(600);
    g.ui.closeTalk();
    if (mode === 'pause') api.setPaused(true);
    if (mode === 'save') { api.setPaused(true); await wait(300); api.openSaves('save'); }
    if (mode === 'hud') {
      // the opening beat is still running: hold the scene as if the player were free to walk
      g.runner.trigger = () => false; setInterval(() => { document.body.classList.remove('busy'); g.busy = false; g.ui.closeTalk(); }, 50);
      g.ui.goal(Q.get('goal') || 'Get through the gate.');
      g.ui.hint('If something won\'t budge, try a word you know on it.');
      g.ui.toast('New command: <span class="jp">開けて</span> <span class="gl">akete, open</span>');
      if (Q.get('far')) { const c = g.place.cam; c.closeOn && c.closeOn(Q.get('far').split(',').map(Number), 2.4); }
    }
    if (mode === 'loading') { document.body.classList.add('trip', 'loading'); }
    if (mode === 'end') {
      for (const id of ['mio', 'guard', 'kuroda', 'mori', 'kenji']) sim.met.add(id);
      Object.assign(sim.people, {
        mio: sim.people.mio || { name: 'Mio', about: 'Programmer. The only one with English. Hates bowing. Drinks black canned coffee.', color: '#5fc6bf' },
        guard: sim.people.guard || { name: 'The guard', about: 'Strict, fair, no English. Feeds a cat he says is not there.', color: '#8ea2c8' },
        kuroda: sim.people.kuroda || { name: 'Mr. Hamada', about: 'Accounts, 12th floor. Asleep on every train, late through every gate.', color: '#b3a58f' },
        mori: sim.people.mori || { name: 'Mr. Mori', about: 'Used to be a manager. Formal and kind. Makes the tea. Rinses his corn soup cans.', color: '#b9a3d3' },
        kenji: sim.people.kenji || { name: 'Kenji', about: 'Engineer. Casual. Borrowed your chair. Lives on melon soda.', color: '#9fb6d8' },
      });
      for (const w of ['ohayo', 'yoroshiku', 'sumimasen', 'matte', 'akete', 'ugoite']) known.add(w);
      sim.period = 'evening';
      const photos = {};
      for (const [p, per] of [['train', 'commute'], ['gate', 'morning'], ['office', 'afternoon']]) if (pic(p)) photos[p] = { src: pic(p), period: per };
      Object.assign(window.__shell.photos, photos);
      const { showEnd } = await import('./end.js');
      g.story = { ...(g.story || {}), outro: Q.get('outro') || g.story?.outro };
      await showEnd(g);
    }
  }
  api.hideBoot();
  await wait(700);
  window.__shellReady = true;
}
