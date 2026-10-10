import { bagItemHTML } from './ui/bag-item.js';
import { clockHTML, updateClock } from './ui/clock-button.js';
export { PORTRAITS } from './ui/portrait-data.js';
// HTML overlay: goal, words, the train's LED board, the talk panel, replies, fades, the end card.
import { lineHTML, WORDS, COMMANDS, PHRASES, known, cmdHTML, iconHTML } from './lang.js';
import { settings, onSettings } from './settings.js';
import { mountVoice, VOICE_CSS, voiceMode } from './speech.js';
import { notePractice, needsPractice, pipsHTML, MASTERY_CSS } from './mastery.js';
// the practice dots' css ships with mastery.js; the voice row injects its own
{
  const st = document.createElement('style');
  st.id = 'mastery-css';
  st.textContent = MASTERY_CSS;
  document.head.appendChild(st);
}
void VOICE_CSS;

import { $, el } from './ui/dom.js';
import { actMenu } from './ui/act-menu.js';
import { showPortraits, resetPortraitSpeaker, thumbStyle } from './ui/portraits.js';
import { createDialogue, installVn } from './ui/dialogue.js';
import { addFieldPlayButton } from './ui/dialogue-text.js';
export { FACE, setFace, faceForEmote, layoutStage, newScene } from './ui/portraits.js';

// Existing UI imports remain valid while audio ownership moves to its modules.
import { voice, stopVoice, setAudioMuted, isMuted, setVoiceDucking } from './audio/core.js';
import { duckWhile } from './audio/music.js';
import { PLAYER_ID } from './mc.js';
export { audioBus, pauseAudio, voice, stopVoice, voiceThenBeat, isMuted, unlockAudio } from './audio/core.js';
export { playMusic } from './audio/music.js';
setVoiceDucking(duckWhile);
export function setMuted(m) {
  setAudioMuted(m);
  const b = document.getElementById('muteBtn');
  if (b) b.classList.toggle('off', m);
}

// Sound files keep their existing asynchronous loading.
let SFX = null;
import('./sfx.js').then((module) => {
  SFX = module;
});
export function sfx(kind, options) {
  return SFX ? SFX.sfx(kind, options) : undefined;
}
export function stopSfx(kind, ms = 40) {
  return SFX ? SFX.stopSfx(kind, ms) : undefined;
}
function noise(c, len) {
  const n = c.createBufferSource(),
    buf = c.createBuffer(1, Math.ceil(c.sampleRate * len), c.sampleRate),
    d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  n.buffer = buf;
  return n;
}
// a dull knock: a short burst of low-passed noise with a falling sine under it
function thump(c, out, t, v, hz) {
  const n = noise(c, 0.2),
    f = c.createBiquadFilter(),
    gg = c.createGain();
  f.type = 'lowpass';
  f.frequency.value = 320;
  gg.gain.setValueAtTime(v, t);
  gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  n.connect(f);
  f.connect(gg);
  gg.connect(out);
  n.start(t);
  const o = c.createOscillator(),
    og = c.createGain();
  o.frequency.setValueAtTime(hz * 1.6, t);
  o.frequency.exponentialRampToValueAtTime(hz, t + 0.08);
  og.gain.setValueAtTime(v * 1.2, t);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  o.connect(og);
  og.connect(out);
  o.start(t);
  o.stop(t + 0.25);
}

export function keyLabel(code) {
  return /^Key[A-Z]$/.test(code)
    ? code.slice(3)
    : /^Digit\d$/.test(code)
      ? code.slice(5)
      : code.replace(/^(Arrow)/, '');
}
// ---------- layout ----------
export const ui = {
  ...createDialogue({ sfx }),
  root: null,
  build() {
    const r = $('#ui');
    this.root = r;
    r.innerHTML = `
      <div id="marks"></div>
      <div id="top">
        <div id="goal" hidden>
          <button class="gl" type="button" aria-label="Current goal"><span class="ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 21V4"/><path d="M6 4.5h11l-2.5 4 2.5 4H6"/></svg></span><span class="t"></span><span class="hk" hidden aria-hidden="true">?</span></button>
          <div id="goal2" hidden aria-live="polite"><span class="t"></span></div>
          <div id="hint" hidden role="status"><span class="hx"></span><button type="button" class="hclose" aria-label="Hide tip"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
        </div>
        <div class="tr" id="hud">
          ${clockHTML}
          <button id="peopleBtn" class="hchip" type="button" hidden aria-label="People you've met"><span class="ic"><svg viewBox="0 0 24 24"><circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.6-3.3 2.8-5 5.5-5s4.9 1.7 5.5 5"/><circle cx="16.5" cy="9.5" r="2.6"/><path d="M15.5 14.2c2.4.1 4.3 1.6 4.9 4.8"/></svg></span><span class="lbl">People</span><span class="n">0</span></button>
          <button id="bagBtn" class="hchip" type="button" hidden aria-label="Bag"><span class="ic"><svg viewBox="0 0 24 24"><path d="M6 8h12l-1 11H7L6 8z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg></span><span class="lbl">Bag</span><span class="n">0</span></button>
          <button id="cmdsBtn" class="hchip" type="button" hidden aria-label="Words you can say"><span class="ic"><svg viewBox="0 0 24 24"><path d="M5 5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7l-4 3.5V16H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><path d="M8 9.5h8M8 12.5h5"/></svg></span><span class="lbl">Words</span><span class="n">0</span></button>
          <button id="muteBtn" class="hchip icon" type="button" aria-label="Sound on or off"><svg viewBox="0 0 24 24"><path d="M4 10v4h3.5L12 18V6L7.5 10H4z"/><path class="w" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg></button>
        </div>
      </div>
      <div id="board" hidden><div class="led"></div></div>
      <div id="stage" hidden><div class="focus"></div>
        <div class="por left" hidden><img alt=""><div class="grade"></div><div class="rim"></div></div>
        <div class="por right" hidden><img alt=""><div class="grade"></div><div class="rim"></div></div>
      </div>
      <div id="talk" hidden>
        <div class="who"></div>
        <div class="line"></div>
        <div class="chips"></div>
        <div class="more" aria-hidden="true"><span class="ch">Click to continue</span><i></i></div>
        <div class="wait" aria-hidden="true"><i></i><i></i><i></i></div>
      </div>
      <div id="peoplePanel" class="panel" hidden><div class="card"><div class="head">People</div><ul></ul><button type="button" class="close">Close</button></div></div>
      <div id="bagPanel" class="panel" hidden><div class="card"><div class="head">Bag</div><p class="yen"></p><ul></ul><button type="button" class="close">Close</button></div></div>
      <button id="giveBtn" type="button" hidden><span class="t">Give</span><span class="to"></span></button>
      <div id="actMenu" hidden role="group" aria-label="Actions"></div>
      <div id="talkHit" hidden aria-hidden="true"></div>
      <button id="sayBtn" type="button" hidden aria-label="Say a word"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7l-4 3.5V16H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/></svg><span class="t">Say</span><span class="key" aria-hidden="true">Q</span></button>
      <div id="sayMenu" hidden><div class="head"></div><div class="list"></div><button type="button" class="cancel">Never mind</button></div>
      <div id="toast" hidden role="status"></div>
      <div id="caption" hidden><span class="nm"></span><span class="tx"></span></div>
      <div id="liftInd" hidden><span class="arrow">▲</span><span class="fl">1</span></div>
      <div id="fade"><div class="title"></div><div class="sub"></div></div>
      <div id="end" hidden></div>
    `;
    $('#cmdsBtn').onclick = () => this.showCmds();
    $('#sayBtn').onclick = (e) => {
      e.stopPropagation();
      this.onSay && this.onSay();
    };
    $('#giveBtn').onclick = (e) => {
      e.stopPropagation();
      this.onGive && this.onGive();
    };
    $('#peopleBtn').onclick = () => {
      $('#peoplePanel ul').innerHTML = this.peopleHTML ? this.peopleHTML(thumbStyle) : '';
      $('#peoplePanel').hidden = false;
    };
    $('#bagBtn').onclick = () => {
      $('#bagPanel').hidden = false;
    };
    for (const id of ['#peoplePanel', '#bagPanel'])
      $(id + ' .close').onclick = () => {
        $(id).hidden = true;
      };
    $('#sayMenu .cancel').onclick = () => {
      $('#sayMenu').hidden = true;
      this._sayRes && this._sayRes(null);
    };
    $('#muteBtn').onclick = (e) => {
      e.stopPropagation();
      setMuted(!isMuted());
      $('#muteBtn').classList.toggle('off', isMuted());
    };
    // the hint stays until it's closed or the goal moves on; the goal chip brings it back
    // the tip line inside the goal box: its close button hides it (the Say tip for good); the goal line brings a
    // closed story hint back
    $('#hint .hclose').onclick = (e) => {
      e.stopPropagation();
      if (this._sayTipHTML) this._sayTipOff?.();
      else this.hideHint();
    };
    $('#goal .gl').onclick = (e) => {
      e.stopPropagation();
      if (this._hintHTML) this.hint(this._hintHTML);
      else {
        const g = $('#goal');
        g.classList.remove('pop');
        void g.offsetWidth;
        g.classList.add('pop');
      }
    };
    this.setSayKey(settings.keySay);
    installVn(this); // the dialogue box's Log, Auto, Skip, Hide and Replay (ui/vn-controls.js)
    onSettings((k, v) => {
      if (k === 'keySay') this.setSayKey(v);
    });
    // advancing the talk panel: tap anywhere on it, or Space/Enter
    // The whole screen moves the story on while a line is up (Jørgen: the tiny arrow was hard to hit). A tap on a
    // taught word plays it instead. While the story is busy (a walk, a door) a tap shows the wait marker instead of
    // doing nothing, and asks main.js to hurry the scripted move along (game.skip, if it has one).
    const tapTalk = (e) => {
      // the play button is a <button>: check it before the button guard below, or it does nothing
      const pb = e.target.closest('.wplay');
      if (pb) {
        e.stopPropagation();
        e.preventDefault();
        this.sayWord(pb.dataset.w, pb);
        return;
      }
      if (e.target.closest('.chip, .tp-in, button')) return;
      const w = e.target.closest('.jp[data-w]');
      if (w) {
        e.stopPropagation();
        e.preventDefault();
        this.sayWord(
          w.dataset.w,
          w.nextElementSibling && w.nextElementSibling.classList.contains('wplay') ? w.nextElementSibling : w,
        );
        return;
      }
      e.stopPropagation();
      if (this._advance) {
        this._advance();
        return;
      }
      this.waitPulse(e.clientX, e.clientY);
    };
    $('#talk').addEventListener('pointerdown', tapTalk);
    $('#talkHit').addEventListener('pointerdown', tapTalk);
    setInterval(() => this.syncTalkState(), 80);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        if (this._advance) {
          e.preventDefault();
          this._advance();
        }
      }
      if (this._chipKeys && /^Digit[1-9]$/.test(e.code)) {
        const b = this._chipKeys[+e.code.slice(5) - 1];
        if (b) b.click();
      } else if (this._sayKeys && /^Digit[1-9]$/.test(e.code)) {
        const b = this._sayKeys[+e.code.slice(5) - 1];
        if (b) b.click();
      }
      if (e.code === 'Escape' && !$('#sayMenu').hidden) $('#sayMenu .cancel').click();
    });
  },
  // The current goal, in the story's words, as a HUD chip that stays until the story changes it (Jørgen, playtest:
  // the goal must be unmistakable). A new goal clears the old hint. Tapping the chip shows the hint again.
  goal(text) {
    const g = $('#goal');
    // onboarding (notes/ONBOARDING.md rule 5): no goal until talking has been taught; it shows then
    if (window.__onboard && window.__onboard.holdGoal && text) {
      this._heldGoal = text;
      this.goalText = text;
      g.hidden = true;
      return;
    }
    this._heldGoal = '';
    const was = this._shownGoal || '';
    this._shownGoal = text || '';
    this.goalText = text || '';
    if (text !== was) {
      this._hintHTML = '';
      this.hideHint();
    }
    g.classList.toggle('nogoal', !text);
    if (!text) {
      this._syncGoalBox();
      return;
    }
    g.querySelector('.t').innerHTML = lineHTML(text, { count: false });
    g.querySelector('.gl').setAttribute('aria-label', 'Goal: ' + g.querySelector('.t').textContent);
    this._syncGoalBox();
    if (text !== was) {
      g.classList.remove('pop');
      void g.offsetWidth;
      g.classList.add('pop');
    }
  },
  // a side goal: a second, smaller line under the main one (QA round 1: a side poke replaced the main goal)
  sideGoal(text) {
    const g = $('#goal2');
    if (!g) return;
    this.sideText = text || '';
    if (!text) {
      g.hidden = true;
      this._syncGoalBox();
      return;
    }
    g.hidden = false;
    g.querySelector('.t').innerHTML = lineHTML(text, { count: false });
    this._syncGoalBox();
  },
  // the goal box (top left) holds the goal line, a side goal and the current tip; it shows while any of them does
  _syncGoalBox() {
    const g = $('#goal');
    if (!g) return;
    const held = window.__onboard && window.__onboard.holdGoal && this._heldGoal;
    const any = (!held && !!this._shownGoal) || !$('#goal2').hidden || !$('#hint').hidden;
    g.hidden = !any;
    this._placeToast();
  },
  // on desktop the notice sits under the goal box, which grows while a tip shows
  _placeToast() {
    const t = $('#toast'),
      g = $('#goal');
    if (!t || document.body.classList.contains('phone')) return;
    const z = +getComputedStyle(document.documentElement).getPropertyValue('--ui') || 1;
    t.style.top = g && !g.hidden && g.offsetParent ? Math.round(g.getBoundingClientRect().bottom / z + 8) + 'px' : '';
  },
  releaseGoal() {
    if (this._heldGoal) {
      const t = this._heldGoal;
      this._heldGoal = '';
      this.goal(t);
    }
  },
  setSayKey(code) {
    const k = $('#sayBtn .key');
    if (k) k.textContent = keyLabel(code || 'KeyQ');
  },
  refreshWords() {
    const b = $('#cmdsBtn'),
      was = this._wordsN;
    this._wordsN = known.size;
    b.hidden = known.size === 0;
    b.querySelector('.n').textContent = known.size;
    // a word was just learned: the chip pops once, its border lit in the accent (css #cmdsBtn.gain)
    if (was !== undefined && known.size > was) {
      b.classList.remove('gain');
      void b.offsetWidth; // restarts the pop if it's still running
      b.classList.add('gain');
    }
  },
  // the Words panel (ui/words-view.js): a layer of the shell's (menu.js)
  showCmds() {
    window.__shell?.toggleWords?.();
  },
  // the Say menu: resolves with a command id or null
  closeSayMenu() {
    const m = $('#sayMenu');
    if (m && !m.hidden) {
      m.hidden = true;
      this._sayKeys = null;
      if (this._sayRes) {
        const r = this._sayRes;
        this._sayRes = null;
        r(null);
      }
    }
  },
  sayMenu(targetName) {
    this._sayTipOff?.();
    return new Promise((res) => {
      const m = $('#sayMenu');
      m.querySelector('.head').innerHTML = targetName ? `Say to <b>${targetName}</b>` : 'Say';
      const list = m.querySelector('.list');
      list.innerHTML = '';
      let n = 0;
      for (const [title, ids] of [
        ['Phrases', PHRASES],
        ['Commands', COMMANDS],
      ]) {
        const have = ids.filter((id) => known.has(id));
        if (!have.length) continue;
        list.appendChild(el('div', 'sec', title));
        for (const id of have) {
          const b = el(
            'button',
            'cmd' + (WORDS[id].phrase ? ' phrase' : '') + (needsPractice(id) ? ' practice' : ''),
            `<span class="k">${++n}</span>${cmdHTML(id)}${pipsHTML(id)}`,
          );
          b.type = 'button';
          b.onclick = (e) => {
            e.stopPropagation();
            m.hidden = true;
            this._sayKeys = null;
            res(id);
          };
          list.appendChild(b);
        }
      }
      this._sayKeys = [...list.querySelectorAll('button.cmd')];
      this._sayRes = (v) => {
        this._sayKeys = null;
        res(v);
      };
      m.hidden = false;
    });
  },
  // the first time Eric knows a word: the Say button pulses and a short tip points at it
  introSay() {
    // once per game (flag say_tip), worded for the input in use, closed by the first Say (QA round 1)
    const F = window.__game && window.__game.flagsRef;
    if (F && F.say_tip) return;
    const touch = document.body.classList.contains('phone') || matchMedia('(pointer: coarse)').matches;
    const key = keyLabel((settings && settings.keySay) || 'KeyQ');
    this._sayTipHTML = touch
      ? 'Tap who you want to talk to, then <b>Say a word</b>.'
      : `Press <span class="k">${key}</span> to say a word you know.`;
    this.sayIntro = true;
    this._showTip();
    // closing it (or the first Say) puts back the story hint it covered, if that was still open
    const off = () => {
      this._sayTipHTML = '';
      this.sayIntro = false;
      this._sayTipOff = null;
      if (F) F.say_tip = true;
      this._showTip();
    };
    this._sayTipOff = off;
  },

  sayReady(on) {
    $('#sayBtn').classList.toggle('ready', !!on);
  },
  // the action menu beside the target: openActs, closeActs, placeSay (ui/act-menu.js)
  ...actMenu({ keyLabel, settings }),
  // No text leaves on a timer (Jørgen: "completely inaccessible"). A hint stays until the player closes it or the
  // goal moves on (the ms argument is ignored); the goal chip shows it again.
  // Tips live in the goal box, as a second line under the goal (Jørgen: one place for goal and tips). One tip at a
  // time: the Say tip while it's up, else the story hint.
  hint(html) {
    if (!html) {
      this.hideHint();
      return;
    }
    // onboarding: the first screen has one line only (the controls); story hints wait until talking is taught
    if (window.__onboard && window.__onboard.holdHints) return;
    this._hintHTML = html;
    this._hintOpen = true;
    this._showTip();
  },
  hideHint() {
    this._hintOpen = false;
    this._showTip();
  },
  _showTip() {
    const h = $('#hint');
    if (!h) return;
    const html = this._sayTipHTML || (this._hintOpen && this._hintHTML) || '';
    const was = h.hidden ? '' : h.dataset.tip || '';
    h.hidden = !html;
    if (html && html !== was) {
      h.querySelector('.hx').innerHTML = html;
      h.classList.remove('in');
      void h.offsetWidth;
      h.classList.add('in');
    }
    h.dataset.tip = html;
    h.querySelector('.hclose').setAttribute('aria-label', this._sayTipHTML ? 'Got it' : 'Hide tip');
    const k = $('#goal .hk');
    if (k) k.hidden = !(this._hintHTML && !html);
    this._syncGoalBox();
  },
  // A notice (a new word, something picked up) stays until the player's next action after it has been up a moment:
  // a tap, a click or a key anywhere. Nothing is swallowed; the action does what it would anyway.
  toast(html) {
    const t = $('#toast');
    t.innerHTML = html;
    t.hidden = false;
    t.classList.remove('in');
    void t.offsetWidth;
    t.classList.add('in');
    this._placeToast();
    const id = (this._toastId = (this._toastId || 0) + 1);
    const arm = () => {
      const off = (e) => {
        if (e.type === 'keydown' && /^(Shift|Control|Alt|Meta)/.test(e.key)) return;
        removeEventListener('pointerdown', off, true);
        removeEventListener('keydown', off, true);
        if (this._toastId === id) t.hidden = true;
      };
      addEventListener('pointerdown', off, true);
      addEventListener('keydown', off, true);
    };
    if (this.auto) {
      t.hidden = true;
      return;
    }
    // armed after a beat, so the tap that made it appear doesn't also clear it
    new Promise((r) => setTimeout(r, 1200)).then(() => {
      if (this._toastId === id && !t.hidden) arm();
    });
  },
  board(text, { voiceKey } = {}) {
    const b = $('#board');
    if (!text) {
      b.classList.remove('in');
      setTimeout(() => {
        if (!b.classList.contains('in')) b.hidden = true;
      }, 400);
      return;
    }
    b.hidden = false;
    b.querySelector('.led').innerHTML = lineHTML(text);
    b.classList.remove('in');
    void b.offsetWidth;
    b.classList.add('in');
    this.refreshWords();
    if (voiceKey) voice(voiceKey);
  },
  lift(floor, dir) {
    const l = $('#liftInd');
    if (floor == null) {
      l.hidden = true;
      return;
    }
    l.hidden = false;
    l.querySelector('.fl').textContent = floor;
    l.querySelector('.arrow').textContent = dir === 'down' ? '▼' : '▲';
  },
  menuClosed() {
    return $('#sayMenu').hidden && !document.querySelector('.panel:not([hidden]), #words:not([hidden])');
  },
  clock: updateClock,
  refreshPeople(n) {
    const b = $('#peopleBtn');
    b.hidden = !n;
    b.querySelector('.n').textContent = n;
  },
  refreshBag(sim) {
    const b = $('#bagBtn');
    b.hidden = !sim.inv.length;
    b.querySelector('.n').textContent = sim.inv.length;
    $('#bagPanel .yen').textContent = `¥${sim.yen} left`;
    $('#bagPanel ul').innerHTML = sim.inv.map((id) => bagItemHTML(id, this.items?.[id])).join('');
  },
  setGiveTarget(name, on) {
    const g = $('#giveBtn');
    g.hidden = !on;
    const t = g.querySelector('.to');
    if (t.textContent !== (name || '')) t.textContent = name || '';
  },
  // pick an item to give: resolves with the item id or null
  giveMenu(targetName, inv, items) {
    return new Promise((res) => {
      const m = $('#sayMenu');
      m.querySelector('.head').innerHTML = `Give to <b>${targetName}</b>`;
      const list = m.querySelector('.list');
      list.innerHTML = '';
      [...new Set(inv)].forEach((id, i) => {
        const b = el(
          'button',
          'cmd',
          `<span class="k">${i + 1}</span><span class="en">${items[id] ? items[id].name : id}</span>`,
        );
        b.type = 'button';
        b.onclick = (e) => {
          e.stopPropagation();
          m.hidden = true;
          this._sayKeys = null;
          res(id);
        };
        list.appendChild(b);
      });
      this._sayKeys = [...list.children];
      this._sayRes = (v) => {
        this._sayKeys = null;
        res(v);
      };
      m.hidden = false;
    });
  },
  // Type the romaji of a word. Forgiving: case, spaces, hyphens and long vowels (ō = ou = oo = o) don't matter.
  // Each letter lights up as it's typed; a wrong try shows where it went off. Resolves when it's right.
  typePrompt(id, prompt, opts = {}) {
    return new Promise((res) => {
      // portraits: a lesson prompt shows the person who asks (Eric listening); Eric saying a word to someone or
      // something shows Eric alone (QA round 1: Mio showed for "Say it to Cat" and for machines)
      if (!prompt?.whoId) resetPortraitSpeaker();
      showPortraits($('#talk'), prompt?.whoId || PLAYER_ID);
      const w = WORDS[id];
      const canon = (s) =>
        s
          .toLowerCase()
          .normalize('NFC')
          .replace(/[āâ]/g, 'a')
          .replace(/[īî]/g, 'i')
          .replace(/[ūû]/g, 'u')
          .replace(/[ēê]/g, 'e')
          .replace(/[ōô]/g, 'o')
          .replace(/[^a-z]/g, '')
          .replace(/ou/g, 'o')
          .replace(/oo/g, 'o')
          .replace(/uu/g, 'u')
          .replace(/aa/g, 'a')
          .replace(/ii/g, 'i');
      const target = canon(w.ro);
      // display tokens: each romaji letter of the word, with long vowels as one token
      const toks = [];
      for (const ch of w.ro) {
        if (/\s|-/.test(ch)) toks.push({ ch, sp: true });
        else toks.push({ ch });
      }
      const t = $('#talk');
      t.hidden = false;
      t.classList.remove('narr', 'heard', 'phone');
      t.classList.add('typing');
      t.querySelector('.who').innerHTML = '';
      t.querySelector('.line').innerHTML =
        (prompt
          ? `<div class="tp-prompt">${prompt.who ? `<span class="tp-who" style="color:${prompt.who.color || '#8fa3c0'}">${prompt.who.name}</span> ` : ''}${lineHTML(prompt.text)}</div>`
          : '') +
        // two blocks: the word (icon, kana, romaji, meaning) and the answer (input, mic, one hint line, never mind)
        `<div class="tp"><div class="tp-word">${iconHTML(id, 'wi tp-ico')}<div class="tp-jp jp">${w.ja}</div><div class="tp-ro">${toks.map((k) => (k.sp ? '<span class="sp"> </span>' : `<span class="lt">${k.ch}</span>`)).join('')}</div><div class="tp-en">${w.en}</div></div>` +
        `<div class="tp-ans"><input class="tp-in" type="text" inputmode="latin" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="${voiceMode() === 'off' ? 'Type it in romaji' : 'Type it in romaji or say it'}" aria-label="Type ${w.ro}"><div class="tp-hint"></div>${opts.cancel ? '<button type="button" class="tp-cancel">Never mind</button>' : ''}</div></div>`;
      t.querySelector('.chips').innerHTML = '';
      t.querySelector('.more').hidden = true;
      t.classList.remove('in');
      void t.offsetWidth;
      t.classList.add('in');
      this._advance = null;
      this._chipKeys = null;
      const inp = t.querySelector('.tp-in'),
        hint = t.querySelector('.tp-hint');
      addFieldPlayButton(t.querySelector('.tp-jp'), id);
      const letters = [...t.querySelectorAll('.tp-ro .lt')];
      const offVoice = mountVoice(t.querySelector('.tp'), id, {
        phone: document.body.classList.contains('phone'),
        ro: w.ro,
        ja: w.ja,
        onHit: () => done('voice'),
      });
      // which display letters each canonical position covers
      const map = [];
      {
        let c = '';
        letters.forEach((el, i) => {
          const before = canon(c);
          c += el.textContent;
          const after = canon(c);
          for (let k = before.length; k < after.length; k++) map[k] = i;
          if (after.length === before.length) map[before.length - 1] = i;
        });
      }
      let tries = 0;
      const paint = () => {
        const v = canon(inp.value);
        let ok = 0;
        while (ok < v.length && v[ok] === target[ok]) ok++;
        const lit = ok ? map[ok - 1] : -1;
        letters.forEach((el, i) => {
          el.classList.toggle('on', i <= lit);
          el.classList.toggle('bad', v.length > ok && i === (ok < target.length ? map[ok] : -1));
        });
        return v === target;
      };
      let over = false;
      const done = (how = 'typed') => {
        if (over) return;
        over = true;
        offVoice();
        notePractice(id, how);
        t.classList.remove('typing');
        stopVoice();
        sfx('ok');
        res(true);
      };
      const cancel = () => {
        if (over) return;
        over = true;
        offVoice();
        t.classList.remove('typing');
        res(false);
      };
      const cb = t.querySelector('.tp-cancel');
      if (cb)
        cb.onclick = (e) => {
          e.stopPropagation();
          cancel();
        };
      inp.addEventListener('input', () => {
        if (paint()) setTimeout(() => done('typed'), 250);
      });
      inp.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Escape' && opts.cancel) {
          cancel();
          return;
        }
        if (e.key !== 'Enter') return;
        if (paint()) {
          done('typed');
          return;
        }
        tries++;
        sfx('no');
        const v = canon(inp.value);
        let ok = 0;
        while (ok < v.length && v[ok] === target[ok]) ok++;
        const next = letters[map[Math.min(ok, target.length - 1)]];
        hint.parentNode.dataset.last = 'type'; // the hint line shows the typing hint, not the mic's message
        hint.innerHTML =
          tries < 3
            ? `Close. Next letter: <b>${next ? next.textContent : ''}</b>. Follow the letters under the word.`
            : `Type it just as shown: <b>${w.ro}</b>`;
      });
      if (this.auto) {
        setTimeout(() => {
          inp.value = w.ro;
          paint();
          done('typed');
        }, 20);
        return;
      }
      setTimeout(() => inp.focus(), 60);
    });
  },
  // play a taught word again without moving the story on: Mio saying it slowly in Japanese (audio/word-<id>.mp3), never
  // Eric's clip (Jørgen, 2026-09-30: "when I click on words during conversation, it should be mio saying it in japanese")
  sayWord(id, el) {
    const w = WORDS[id];
    if (!w || !w.voice) {
      sfx('tap');
      return;
    }
    const p = voice('word-' + id);
    if (el) {
      el.classList.add('playing');
      p.then(() => el.classList.remove('playing'));
    }
  },
  waitPulse(x, y) {
    const t = $('#talk');
    if (t && !t.hidden) {
      t.classList.remove('pulse');
      void t.offsetWidth;
      t.classList.add('pulse');
    } else {
      let d = $('#waitDot');
      if (!d) {
        d = el('div', '', '<i></i><i></i><i></i>');
        d.id = 'waitDot';
        $('#ui').appendChild(d);
      }
      d.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
      d.classList.remove('on');
      void d.offsetWidth;
      d.classList.add('on');
    }
    window.__game?.skip?.();
  },
  get talking() {
    return !$('#talk').hidden;
  },
  fade(title, sub = '', hold = 1400) {
    const f = $('#fade');
    f.querySelector('.title').textContent = title || '';
    f.querySelector('.sub').innerHTML = sub || '';
    f.classList.add('on');
    return new Promise((res) => setTimeout(res, 650 + hold));
  },
  unfade() {
    $('#fade').classList.remove('on');
    return new Promise((res) => setTimeout(res, 600));
  },
  showEnd(html) {
    const e = $('#end');
    e.innerHTML = html;
    e.hidden = false;
    requestAnimationFrame(() => e.classList.add('in'));
  },
};
