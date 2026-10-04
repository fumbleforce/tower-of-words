// QA only (?shell=<screen>): opens one shell screen on its own with made-up data, so each can be shot and checked
// in isolation on desktop and phone. game3d/tools/shell-shots.mjs drives it. Never loaded in normal play.
import { sim } from './sim.js';
import { known } from './lang.js';

const Q = new URLSearchParams(location.search);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (f, ms = 30000) => {
  const t0 = performance.now();
  while (!f() && performance.now() - t0 < ms) await wait(80);
};

export async function run(mode, api) {
  const g = window.__game;
  const pics = Q.get('pics'); // a folder with <place>.jpg frames (train.jpg, gate.jpg, forecourt.jpg, ...)
  const pic = (p) => (pics ? `${pics}/${p}.jpg` : null);
  const now = Date.now();
  if (mode === 'load' || mode === 'save') {
    api.store.set(api.SLOT(1), {
      data: { v: 1, place: 'gate', period: 'morning' },
      thumb: pic('gate'),
      place: 'gate',
      period: 'morning',
      date: 'Thu 1 Oct',
      at: now - 26 * 3600e3,
    });
    api.store.set(api.SLOT(2), {
      data: { v: 1, place: 'office', period: 'lunch' },
      thumb: pic('office'),
      place: 'office',
      period: 'lunch',
      date: 'Thu 1 Oct',
      at: now - 40 * 60e3,
    });
    api.store.set(api.AUTO_META, { at: now - 5 * 60e3, thumb: pic('train'), date: 'Thu 1 Oct' });
  }
  const atTitle = () => document.body.classList.contains('at-title');
  if (mode === 'title' || mode === 'settings' || mode === 'load' || mode === 'flight') {
    await until(atTitle);
    await wait(1200);
    if (mode === 'settings') api.openSettings();
    if (mode === 'load') api.openSaves('load');
    if (mode === 'flight') {
      const k = +(Q.get('k') || 0.5);
      window.__shell._flightAt(k);
      document.body.classList.add('title-leaving');
      document.body.classList.remove('at-title');
      const t = document.getElementById('title');
      t.style.opacity = String(Math.max(0, 1 - k * 1.6));
    }
  } else {
    await until(() => g.place && !g.busy, 20000);
    await wait(600);
    g.ui.closeTalk();
    if (mode === 'pause') api.setPaused(true);
    if (mode === 'save') {
      api.setPaused(true);
      await wait(300);
      api.openSaves('save');
    }
    if (['hud', 'act', 'goal'].includes(mode)) {
      // the opening beat is still running: hold the scene as if the player were free to walk
      g.runner.trigger = () => false;
      setInterval(() => {
        document.body.classList.remove('busy');
        g.busy = false;
        g.ui.closeTalk();
      }, 50);
    }
    if (mode === 'act') {
      // stand Eric where several things are in reach, and step the target once so Next shows
      const at = Q.get('at');
      const m = g.markers.list.find((x) => x.id === at) || g.markers.list.find((x) => x.enabled());
      const sp = m.spot();
      g.player.root.position.set(sp[0] + 0.1, g.player.root.position.y, sp[1] + 0.1);
      if (Q.get('cycle')) {
        await wait(400);
        for (let i = 0; i < +Q.get('cycle'); i++) window.__shell.cycleTarget?.();
      }
    }
    if (mode === 'goal') {
      g.ui.goal(Q.get('goal') || 'Find a seat.');
    }
    if (mode === 'talkseq') {
      // a run of lines for click and hover tests: window.__line counts the lines shown
      g.runner.trigger = () => false;
      g.ui.closeTalk();
      const lang = await import('./lang.js');
      lang.known.add('ohayo');
      (async () => {
        for (let i = 0; i < 40; i++) {
          window.__line = i;
          await g.ui.say(
            { name: 'Mio', role: 'programmer', color: '#5fc6bf' },
            `Line ${i + 1}. In the morning you say {ohayo} to everyone here.`,
            { whoId: 'mio' },
          );
        }
      })();
      await wait(800);
    }
    if (mode === 'talk' || mode === 'wait') {
      g.runner.trigger = () => false;
      const known = await import('./lang.js');
      known.known.add('ohayo');
      g.ui.say(
        { name: 'Mio', role: 'programmer', color: '#5fc6bf' },
        Q.get('line') || 'In the morning you say {ohayo} to everyone. The guard really cares about that one.',
        { whoId: 'mio' },
      );
      await wait(900);
      if (mode === 'wait') {
        g.ui._advance = null;
        await wait(200);
        g.ui.waitPulse(innerWidth / 2, innerHeight - 80);
      }
    }
    if (mode === 'hud') {
      g.ui.goal(Q.get('goal') || 'Get through the gate.');
      g.ui.hint("If something won't budge, try a word you know on it.");
      g.ui.toast('New command: <span class="jp">開けて</span> <span class="gl">akete, open</span>');
      if (Q.get('far')) {
        const c = g.place.cam;
        c.closeOn && c.closeOn(Q.get('far').split(',').map(Number), +(Q.get('zoom') || 2.4));
      }
    }
    if (mode === 'loading') {
      document.body.classList.add('trip', 'loading');
    }
    if (mode === 'end') {
      for (const id of ['mio', 'guard', 'kuroda', 'mori', 'kenji']) sim.met.add(id);
      for (const w of ['ohayo', 'yoroshiku', 'sumimasen', 'matte', 'akete', 'ugoite']) known.add(w);
      sim.period = 'evening';
      const photos = {};
      for (const [p, per] of [
        ['train', 'early'],
        ['gate', 'morning'],
        ['forecourt', 'morning'],
        ['office', 'afternoon'],
        ['plaza', 'evening'],
        ['dorm_court', 'evening'],
        ['dorms', 'evening'],
      ])
        if (pic(p)) photos[p] = { src: pic(p), period: per };
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
