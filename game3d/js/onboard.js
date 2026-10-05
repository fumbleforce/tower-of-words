// The first minutes on the train (notes/ONBOARDING.md): the screen starts with one line about walking and nothing
// else, and each thing arrives when it first matters.
//   - the controls line goes once Eric has walked a few steps (1.2 m), and never comes back; it steps aside while a
//     line or caption is up
//   - no goal and no story hints until he has used E on a person (ui.goal holds the story's goal until then)
//   - the E prompt drops its key cap after five uses; the action word always stays (ui.placeSay reads `uses`)
//   - Say (Q) first shows only at the goal target (the cat); after one use it shows wherever a word works
//   - no Tab/Next, clock, people count or mute chip on the train
// State lives in localStorage so a reload on the train doesn't teach it all again; Start on the title resets it.
import { ui } from './ui.js';

const KEY = 'amakawa-onboard';
const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null') || {};
  } catch {
    return {};
  }
};
const st = Object.assign({ moved: false, talked: false, uses: 0, sayUsed: false }, load());
const keep = () => {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ moved: st.moved, talked: st.talked, uses: st.uses, sayUsed: st.sayUsed }),
    );
  } catch {
    /* */
  }
};
const ob = (window.__onboard = {
  active: false,
  holdGoal: false,
  holdHints: false,
  get uses() {
    return st.uses;
  },
  get sayUsed() {
    return st.sayUsed;
  },
  get moved() {
    return st.moved;
  },
});

export function resetOnboarding() {
  Object.assign(st, { moved: false, talked: false, uses: 0, sayUsed: false });
  walked = 0;
  keep();
}

let line = null,
  walked = 0,
  last = null,
  lastUse = 0;
function controlsLine() {
  if (line) return line;
  line = document.createElement('div');
  line.id = 'ctrlLine';
  line.setAttribute('role', 'status');
  line.hidden = true;
  line.innerHTML =
    '<span class="desk"><span class="k">W</span><span class="k">A</span><span class="k">S</span><span class="k">D</span> , or click or hold the floor to walk</span><span class="tch">Tap or hold the floor to walk</span>';
  document.getElementById('ui').appendChild(line);
  return line;
}
function talkedNow() {
  if (st.talked) return;
  st.talked = true;
  st.moved = true;
  keep();
  ob.holdGoal = false;
  ob.holdHints = false;
  ui.releaseGoal();
}

export function startOnboarding(game) {
  controlsLine();
  // E on anything goes through the runner as talk:<id> first (main.js talk()); a person makes it "talked"
  const trig = game.runner.trigger.bind(game.runner);
  game.runner.trigger = (k, ...a) => {
    if (typeof k === 'string' && k.startsWith('talk:')) {
      const now = performance.now();
      if (now - lastUse > 600) {
        st.uses++;
        keep();
        lastUse = now;
      }
      const id = k.slice(5),
        P = game.place;
      if (
        ob.active &&
        ((P && P.people && P.people[id]) || /person/.test((P && P.things && P.things[id] && P.things[id].kind) || ''))
      )
        talkedNow();
    }
    return trig(k, ...a);
  };
  const say = ui.onSay;
  if (say)
    ui.onSay = (...a) => {
      if (!st.sayUsed) {
        st.sayUsed = true;
        keep();
      }
      return say(...a);
    };

  const tick = () => {
    requestAnimationFrame(tick);
    const g = window.__game;
    if (!g || !g.place || !g.player) return;
    const b = document.body;
    const onTrain = g.place.name === 'train' && !g.test;
    ob.active = onTrain;
    ob.holdGoal = onTrain && !st.talked;
    ob.holdHints = onTrain && !st.talked;
    if (b.classList.contains('ob-active') !== onTrain) b.classList.toggle('ob-active', onTrain);
    // the walking line: shown until he has walked a few steps (not while the title or a scene is up)
    const p = g.player.root.position;
    if (last && !g.busy && !b.classList.contains('at-title')) walked += Math.hypot(p.x - last.x, p.z - last.z);
    last = { x: p.x, z: p.z };
    if (!st.moved && walked > 1.2) {
      st.moved = true;
      keep();
    }
    const show =
      onTrain &&
      !st.moved &&
      !g.busy &&
      !b.classList.contains('at-title') &&
      !b.classList.contains('title-leaving') &&
      !b.classList.contains('paused') &&
      // never over a line: the dialogue box and captions sit where this line does
      !!document.getElementById('talk')?.hidden &&
      !!document.getElementById('caption')?.hidden;
    if (line.hidden === show) line.hidden = !show;
  };
  tick();
}
