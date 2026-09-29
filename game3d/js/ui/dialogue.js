import { $, el } from './dom.js';
import { lineHTML } from '../lang.js';
import { settings, CPS } from '../settings.js';
import { voice, stopVoice, muted } from '../audio/core.js';
import { showPortraits, resetPortraitSpeaker } from './portraits.js';
import { heardHTML, scramble, reveal, addPlayButtons, whileUnpaused } from './dialogue-text.js';

// Methods use the UI receiver so input handlers and Runner retain the same state.
export function createDialogue({ sfx }) {
  return {
    // Show a line and wait for a tap. speaker: {name, role, color} or null for narration.
    say(speaker, text, { voiceKey, auto, overheard, clear, whoId, face } = {}) {
      return new Promise((res) => {
        const t = $('#talk');
        showPortraits(t, speaker ? whoId : null, face);
        t.classList.toggle('heard', !!overheard);
        t.hidden = false;
        t.classList.toggle('narr', !speaker);
        t.classList.toggle('phone', !!(speaker && speaker.phone));
        const who = t.querySelector('.who');
        who.innerHTML = speaker
          ? `<span class="nm" style="--c:${speaker.color || '#8fa3c0'}">${speaker.name}</span>${speaker.role ? `<span class="rl">${speaker.role}</span>` : ''}`
          : '';
        const lineEl = t.querySelector('.line');
        lineEl.innerHTML = overheard ? heardHTML(text, clear) : lineHTML(text);
        if (!overheard) addPlayButtons(lineEl);
        t.querySelector('.chips').innerHTML = '';
        const more = t.querySelector('.more');
        more.hidden = false;
        t.classList.remove('in');
        void t.offsetWidth;
        t.classList.add('in');
        this.refreshWords();
        if (overheard) scramble(lineEl);
        const spoken = voiceKey ? voice(voiceKey, { muffle: !!overheard }) : null;
        const started = performance.now();
        this._lines = (this._lines || 0) + 1; // the continue hint shows with words for the first few lines
        if (this.auto) {
          setTimeout(() => {
            this._advance = null;
            stopVoice();
            res();
          }, 15);
          return;
        }
        const cps = CPS[settings.textSpeed] || 0;
        const rv = !overheard && cps ? reveal(lineEl, cps) : { done: true };
        if (!rv.done) {
          more.hidden = true;
          rv.onDone = () => {
            more.hidden = false;
          };
        }
        const adv = (this._advance = () => {
          if (performance.now() - started < 250) return;
          if (!rv.done) {
            rv.finish();
            return;
          } // first tap finishes the line, the next one moves on
          this._advance = null;
          stopVoice();
          sfx('tap');
          res();
        });
        void auto; // lines never move on by a timer of their own; only the player's auto-advance setting does that
        if (settings.autoAdvance) {
          // auto-advance: once the line is written out and the voice has finished (or a reading time has passed)
          const plain = lineEl.textContent.length;
          const revealed = new Promise((r) => {
            if (rv.done) r();
            else {
              const o = rv.onDone;
              rv.onDone = () => {
                o && o();
                r();
              };
            }
          });
          Promise.all([
            revealed,
            spoken && settings.voiceOn && !muted
              ? spoken.then(() => whileUnpaused(700))
              : whileUnpaused(1300 + plain * 45),
          ])
            .then(() => whileUnpaused(250))
            .then(() => {
              if (this._advance === adv && settings.autoAdvance) {
                this._advance = null;
                stopVoice();
                res();
              }
            });
        }
      });
    },
    // Show a line with reply chips; resolves with the chip index. chips: [{html}]
    choose(speaker, text, chips, { voiceKey, glow = -1, keepLine = false, whoId } = {}) {
      return new Promise((res) => {
        const t = $('#talk');
        if (!keepLine || whoId) showPortraits(t, speaker ? whoId : null);
        t.hidden = false;
        t.classList.toggle('narr', !speaker);
        const who = t.querySelector('.who');
        who.innerHTML = speaker
          ? `<span class="nm" style="--c:${speaker.color || '#8fa3c0'}">${speaker.name}</span>${speaker.role ? `<span class="rl">${speaker.role}</span>` : ''}`
          : '';
        if (!keepLine) t.querySelector('.line').innerHTML = text ? lineHTML(text) : '';
        t.querySelector('.more').hidden = true;
        const box = t.querySelector('.chips');
        box.innerHTML = '';
        const shown = performance.now(); // a tap that revealed the chips must not also pick one
        const btns = chips.map((c, i) => {
          const b = el(
            'button',
            'chip' + (i === glow ? ' glow' : '') + (c.cls ? ' ' + c.cls : ''),
            `<span class="k">${i + 1}</span><span class="c">${c.html}</span>`,
          );
          b.type = 'button';
          b.onclick = (e) => {
            e.stopPropagation();
            if (performance.now() - shown < 350) return;
            this._chipKeys = null;
            box.querySelectorAll('.chip').forEach((x) => {
              x.disabled = true;
            });
            b.classList.add('picked');
            stopVoice();
            res(i);
          };
          box.appendChild(b);
          return b;
        });
        this._chipKeys = btns;
        this._advance = null;
        if (this.auto)
          setTimeout(() => {
            const i = Math.min(btns.length - 1, this.autoPick ? this.autoPick(chips) : 0);
            box.querySelectorAll('.chip').forEach((x) => {
              x.disabled = true;
            });
            this._chipKeys = null;
            stopVoice();
            res(i);
          }, 15);
        t.classList.remove('in');
        void t.offsetWidth;
        t.classList.add('in');
        this.refreshWords();
        if (voiceKey) voice(voiceKey);
      });
    },
    // a line nobody has to tap (ambient moments); overheard Japanese is garbled as in the dialogue box
    caption(sp, text, { overheard, clear } = {}) {
      const c = $('#caption');
      if (!text) {
        c.hidden = true;
        return;
      }
      c.hidden = false;
      c.querySelector('.nm').innerHTML = sp ? sp.name : '';
      c.querySelector('.nm').style.color = sp ? sp.color || '' : '';
      const tx = c.querySelector('.tx');
      tx.innerHTML = overheard ? heardHTML(text, clear) : lineHTML(text);
      if (overheard) scramble(tx);
      c.classList.remove('in');
      void c.offsetWidth;
      c.classList.add('in');
    },
    // what the dialogue area shows: continue (with words for the first lines), waiting, or nothing; the tap layer
    syncTalkState() {
      const t = $('#talk'),
        hit = $('#talkHit');
      if (!t || !hit) return;
      const busy = document.body.classList.contains('busy'),
        open = !t.hidden;
      const typing = t.classList.contains('typing'),
        choosing = !!t.querySelector('.chips .chip');
      const canGo = !!this._advance && open && !typing;
      t.classList.toggle('can-go', canGo);
      t.classList.toggle('waiting', open && !canGo && !typing && !choosing);
      // (only write what changed: #talk is watched by a MutationObserver, and even a same-value write is a mutation)
      const hide = !!(this.auto || !(open || busy) || typing || choosing);
      if (hit.hidden !== hide) hit.hidden = hide;
      hit.classList.toggle('go', canGo);
      const phone = document.body.classList.contains('phone');
      const ch = t.querySelector('.more .ch');
      if (ch) {
        const tx = phone ? 'Tap this area to continue' : 'Press Space or click this area to continue',
          hd = (this._lines || 0) > 5;
        if (ch.textContent !== tx) ch.textContent = tx;
        if (ch.hidden !== hd) ch.hidden = hd;
      }
    },
    closeTalk() {
      const t = $('#talk');
      t.hidden = true;
      $('#stage').hidden = true;
      resetPortraitSpeaker();
      this._advance = null;
      this._chipKeys = null;
    },
  };
}
