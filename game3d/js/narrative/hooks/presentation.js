import * as THREE from 'three';
import { sfx, voice, setFace, faceForEmote } from '../../ui.js';
const EMOTE_SVG = {
  heart:
    '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="#e0607a" stroke="#b8405a"/>',
  sweat: '<path d="M12 3c3 4.2 5 7 5 9.6a5 5 0 0 1-10 0C7 10 9 7.2 12 3z" fill="#7cc4f0" stroke="#3e8fc4"/>',
  nine: '<circle cx="12" cy="12" r="8.5" fill="#fff" stroke="#2a2f3a" stroke-width="1.8"/><path d="M12 12V6.2M12 12H7.2" stroke="#2a2f3a" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="12" r="1.2" fill="#2a2f3a"/>',
  phone:
    '<rect x="7" y="3" width="10" height="18" rx="2.2" fill="#fff" stroke="#2a2f3a" stroke-width="1.8"/><path d="M10.5 18h3" stroke="#2a2f3a" stroke-width="1.6" stroke-linecap="round"/><path d="M3.5 9.5c-.8 1.6-.8 3.4 0 5M20.5 9.5c.8 1.6.8 3.4 0 5" stroke="#4f6aa8" stroke-width="1.7" fill="none" stroke-linecap="round"/>',
  note: '<path d="M9 17.5V6l9-2v11.5" fill="none" stroke="#2a2f3a" stroke-width="1.9"/><circle cx="7" cy="17.5" r="2.3" fill="#2a2f3a"/><circle cx="16" cy="15.5" r="2.3" fill="#2a2f3a"/>',
};
const FLOORS = ['B2', 'B1', '1', '2', '3', '4', '5'];

export function installPresentationHooks(game, { rigOf, isPlayer, canvas, TS }) {
  const H = game.hooks;
  const ui = game.ui;
  // { do: 'goal', text } sets the main goal; { do: 'goal', text, side: true } a side goal under it ('' clears either)
  H.goal = ({ text, side }) => (side ? ui.sideGoal(text) : ui.goal(text));
  H.hint = ({ text, what }) => {
    if (what === 'say') ui.introSay(text);
    else ui.hint(text, 5000);
  };
  H.wait = ({ ms }) => game.wait(ms);
  H.hold = ({ who }) => {
    game.hold = who || null;
  };
  H.sound = ({ name }) => sfx(name);

  // { do: 'phone', who: 'mio', state: 'buzz' | 'look' | 'away' }: her phone. buzz: a buzz and a phone bubble over
  // her head, repeating until she looks; look/away: her rig's phone pose if it has one (characters agent), else nothing.
  // Other people (the guard in the lobby) go to the place's own phone hook.
  let phoneBuzz = 0;
  H.phone = async (s) => {
    const rig = s.who === 'mio' ? game.mioNpc : isPlayer(s.who) ? game.player : null;
    if (!rig) return game.place.hooks?.phone?.(s);
    clearInterval(phoneBuzz);
    phoneBuzz = 0;
    if (s.state === 'buzz') {
      // the phone bubble stays up (no timers on anything the player should catch) until she looks at the phone
      H.emote({ who: s.who, kind: 'phone', ms: 1e9, id: 'phone-' + s.who });
      sfx('buzz');
      phoneBuzz = setInterval(() => sfx('buzz'), 1400 / TS);
      return;
    }
    document.querySelector(`.emote[data-id="phone-${s.who}"]`)?.remove();
    // her portrait looks at the phone while she does (face 'phone', neutral until the art lands)
    if (s.who === 'mio') setFace('mio', s.state === 'look' ? 'phone' : 'neutral');
    if (rig.phone) await rig.phone(s.state);
  };
  H.voice = ({ key }) => voice(key);
  H.expression = ({ who, face }) => setFace(who, face);
  H.emote = ({ who, kind, ms = 1900, id }) => {
    faceForEmote(who, kind);
    const el = document.createElement('div');
    el.className = 'emote';
    if (id) el.dataset.id = id;
    const k = kind === '9' ? 'nine' : kind === '♪' ? 'note' : kind;
    if (EMOTE_SVG[k])
      el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${EMOTE_SVG[k]}</svg>${k === 'nine' ? '<span class="lbl">9:00</span>' : ''}`;
    else {
      el.innerHTML = `<span class="tx">${kind === '…' ? '···' : kind}</span>`;
      if (kind === '!') el.classList.add('bang');
      if (kind === 'zzz') el.classList.add('zzz');
    }
    if (k === 'nine') {
      el.classList.add('wide');
      ms = Math.max(ms, 3200);
    }
    document.getElementById('ui').appendChild(el);
    const t0 = performance.now();
    const f = () => {
      const dt = performance.now() - t0;
      if (dt > ms || !el.isConnected) {
        el.remove();
        return;
      }
      const v = new THREE.Vector3();
      if (isPlayer(who)) game.player.root.getWorldPosition(v);
      else rigOf(who)?.root.getWorldPosition(v);
      v.y += 1.55 * (game.place.charScale || 1);
      v.project(game.place.camera);
      const W = canvas.clientWidth,
        Hh = canvas.clientHeight,
        bw = el.offsetWidth || 64,
        bh = el.offsetHeight || 64;
      let x = ((v.x + 1) / 2) * W,
        y = ((1 - v.y) / 2) * Hh - Math.min(10, dt * 0.012);
      // someone off screen: no bubble pinned to the edge pointing at nothing (QA round 1)
      const off = v.z > 1 || v.x < -1.05 || v.x > 1.05 || v.y < -1.05 || v.y > 1.05;
      el.style.visibility = off ? 'hidden' : '';
      // the bubble's bottom sits at y; keep it inside the screen, and under the head if the top is too close
      const below = y - bh - 12 < 8;
      el.classList.toggle('below', below);
      if (below) y += bh + 40;
      x = Math.max(bw / 2 + 8, Math.min(W - bw / 2 - 8, x));
      y = Math.max(bh + 8, Math.min(Hh - 8, y));
      // keep clear of the HUD and the goal chip: drop below them if the bubble would sit on one
      for (const id of ['hud', 'goal', 'goal2']) {
        const r = document.getElementById(id);
        if (!r || r.hidden || !r.offsetParent) continue;
        const q = r.getBoundingClientRect();
        if (x + bw / 2 > q.left && x - bw / 2 < q.right && y > q.top && y - bh < q.bottom) y = q.bottom + bh + 6;
      }
      el.style.transform = `translate(${x}px, ${y}px)`;
      el.style.opacity = dt < 120 ? String(dt / 120) : dt > ms - 400 ? String(Math.max(0, (ms - dt) / 400)) : '1';
      requestAnimationFrame(f);
    };
    f();
  };
  H.floor = async ({ to }) => {
    let i = FLOORS.indexOf(game.liftFloor || '1');
    const j = FLOORS.indexOf(String(to));
    if (j < 0) return;
    const dir = j < i ? 'down' : 'up';
    ui.lift(FLOORS[i], dir);
    while (i !== j) {
      await game.wait(750);
      i += j > i ? 1 : -1;
      game.liftFloor = FLOORS[i];
      ui.lift(FLOORS[i], dir);
    }
    sfx('lift');
  };
  H.liftDoors = ({ state }) => {
    if (state === 'open') sfx('lift');
    sfx('liftdoor', { at: state === 'open' ? 0.3 : 0 });
  };
}
