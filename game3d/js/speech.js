// Voice input: Eric can say a word instead of typing its romaji, at the typing prompt and when he uses a word.
// Design and numbers: notes/VOICE-INPUT.md.
//
//   import { voiceMode, mountVoice } from './speech.js'
//   const off = mountVoice(hostEl, 'matte', { onHit: () => ..., phone })   // adds the mic row; returns a cleanup
//
// Three modes (Settings > Voice input, settings.voiceInput):
//   'off'     nothing is shown
//   'device'  Whisper runs in the browser (speech-worker.js). The model downloads once (about 77 MB) and is cached;
//             what you say never leaves the device.
//   'browser' the browser's own recogniser (Web Speech API). Quick and small, but Chrome sends the audio to Google.
// The microphone is asked for only the first time the player presses the mic, never before.

import { matchWord, SPOKEN, candidatesFor, scoreHit } from './speech-match.js';
import { WORDS, known } from './lang.js';
import { hasSpeech } from './speech-signal.js';
import { openMic, closeMic, micGranted, micRead, startMic, stopMic, micSamples16k } from './speech-capture.js';
export { micTest } from './speech-capture.js';

// ---------- the on-device recogniser ----------

export const MODELS = {
  base: { id: 'onnx-community/whisper-base', mb: 77 },
  tiny: { id: 'onnx-community/whisper-tiny', mb: 41 },
  moon: { id: 'wmoto-ai/moonshine-tiny-ja-ONNX', mb: 147 }, // Moonshine Tiny JA: tested, see notes/VOICE-INPUT.md
};
export const DEFAULT_MODEL = 'base';
// Which model this device gets (settings.voiceModel: 'auto' | 'base' | 'moon' | 'tiny'). Auto: Whisper base on a
// computer (92% on the bench, about 2.7 s a word on one thread); Moonshine on a phone, where Whisper base would take
// 7 to 10 s (Moonshine: about 50 ms on the desktop bench, 72%, weaker with a strong accent). notes/VOICE-INPUT.md.
export function pickModel() {
  const want = window.__settings && window.__settings.voiceModel;
  if (want && want !== 'auto' && MODELS[want]) return want;
  const phone =
    document.body.classList.contains('phone') ||
    (matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 700);
  return phone ? 'moon' : DEFAULT_MODEL;
}

let worker = null,
  ready = null,
  seq = 0;
const waiting = new Map();
const progressSubs = new Set();
export const engineInfo = { device: null, loadMs: null, model: null };

// start (or reuse) the worker and the model; resolves when it can listen. onProgress(fraction 0..1)
export function loadRecogniser({ model = pickModel(), device = 'auto', dtype, onProgress } = {}) {
  if (onProgress) progressSubs.add(onProgress);
  if (ready) return ready;
  const files = new Map();
  ready = new Promise((res, rej) => {
    worker = new Worker(new URL('./speech-worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      if (data.type === 'progress') {
        files.set(data.file, [data.loaded, data.total]);
        let a = 0,
          b = 0;
        for (const [l, t] of files.values()) {
          a += l;
          b += t || 0;
        }
        const f = b ? a / b : 0;
        for (const fn of progressSubs) fn(f);
      } else if (data.type === 'ready') {
        Object.assign(engineInfo, { device: data.device, loadMs: data.ms, model });
        progressSubs.clear();
        res(engineInfo);
      } else if (data.type === 'text' || data.type === 'error') {
        const w = waiting.get(data.id);
        if (w) {
          waiting.delete(data.id);
          data.type === 'text' ? w.res(data) : w.rej(new Error(data.message));
        } else if (data.type === 'error') {
          rej(new Error(data.message));
          ready = null;
        }
      }
    };
    worker.onerror = (e) => {
      rej(e);
      ready = null;
    };
    worker.postMessage({ type: 'load', model: (MODELS[model] || MODELS[DEFAULT_MODEL]).id, device, dtype });
    engineInfo.model = model;
  });
  return ready;
}
// 16 kHz mono samples to text: resolves { text, ms }
// With `candidates` ({ wordId: [written forms] }) it also scores each word: { text, ms, free, scores }.
export async function transcribe(samples, candidates) {
  await loadRecogniser();
  const id = ++seq;
  return new Promise((res, rej) => {
    waiting.set(id, { res, rej });
    worker.postMessage({ type: 'run', id, samples, candidates }, [samples.buffer]);
  });
}
// the candidates' scores for the recording transcribed last: { free, scores, ms }
export async function scoreLast(candidates) {
  await loadRecogniser();
  const id = ++seq;
  return new Promise((res, rej) => {
    waiting.set(id, { res, rej });
    worker.postMessage({ type: 'run', id, score: true, candidates });
  });
}

// any encoded audio (a recording, an mp3) to 16 kHz mono samples
export async function toMono16k(arrayBuffer) {
  const probe = new OfflineAudioContext(1, 16000, 16000);
  const buf = await probe.decodeAudioData(arrayBuffer);
  if (buf.numberOfChannels === 1 && buf.sampleRate === 16000) return buf.getChannelData(0).slice();
  const off = new OfflineAudioContext(1, Math.ceil(buf.duration * 16000), 16000);
  const src = off.createBufferSource();
  src.buffer = buf;
  src.connect(off.destination);
  src.start();
  return (await off.startRendering()).getChannelData(0).slice();
}

export { SPEECH_MIN, hasSpeech, trimSilence } from './speech-signal.js';

// recognise and judge in one go: { hit, text, heard, other, ms, reason }. reason: 'quiet' when nobody spoke.
// The free transcript is matched first; when that misses, the word's forced-decoding score gets a say (Whisper only).
export async function judge(samples, wordId, ro, floor) {
  if (!hasSpeech(samples, 16000, floor)) return { hit: false, text: '', reason: 'quiet', ms: 0 };
  const r = await transcribe(samples);
  const m = matchWord(r.text, wordId, ro);
  if (m.hit) return { hit: true, text: r.text, heard: m.heard, ms: r.ms, by: 'text' };
  // only a miss pays for the second opinion (about 20 decoder passes)
  let sc = null;
  if (engineInfo.model !== 'moon') {
    try {
      sc = await scoreLast(candidatesFor(Object.keys(SPOKEN)));
    } catch {
      /* keep the miss */
    }
  }
  const hit = scoreHit(sc, wordId);
  return {
    hit,
    text: r.text,
    heard: m.heard,
    other: hit ? null : m.other,
    ms: r.ms + (sc ? sc.ms : 0),
    by: hit ? 'score' : null,
  };
}

// ---------- which mode ----------

// settings.voiceInput: 'off' | 'device' | 'browser' (Settings > Voice input; off until the player turns it on)
export function voiceMode() {
  const m = (window.__settings && window.__settings.voiceInput) || 'off';
  if (m === 'browser' && !browserSpeechAvailable()) return 'off';
  return m;
}
export const browserSpeechAvailable = () => !!(window.SpeechRecognition || window.webkitSpeechRecognition);
// start the model download ahead of time (Settings calls this when the player picks "On this device")
export function prepareVoice(onProgress) {
  return loadRecogniser({ onProgress });
}

// ---------- the browser's recogniser (opt-in; Chrome sends the audio to Google) ----------

function browserListen(onInterim) {
  const R = window.SpeechRecognition || window.webkitSpeechRecognition,
    r = new R();
  r.lang = 'ja-JP';
  r.interimResults = true;
  r.maxAlternatives = 5;
  r.continuous = false;
  const texts = [];
  let err = null;
  const done = new Promise((res) => {
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res0 = e.results[i];
        if (res0.isFinal) for (let k = 0; k < res0.length; k++) texts.push(res0[k].transcript);
        else onInterim && onInterim(res0[0].transcript);
      }
    };
    r.onerror = (e) => {
      err = e.error;
    };
    r.onend = () => res({ texts, err });
  });
  r.start();
  return {
    stop: () => {
      try {
        r.stop();
      } catch {
        /* ended */
      }
    },
    done,
  };
}

// ---------- the mic row ----------

const WORD_CLIP = (id) => new URL(`../audio/word-${id}.mp3`, import.meta.url).href;
const MIC_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21"/></svg>';
const say = (t) => t.replace(/</g, '&lt;');
let told = false; // the privacy line shows on the first press of a session

// Adds the mic and "Hold V or the mic and say it" to a typing prompt. host: the prompt block (ui.js .tp). Returns a cleanup.
// opts: { onHit(info), phone, ro (the romaji, for matching), ja (to show what was heard), candidates (ids to tell apart) }
export function mountVoice(host, id, opts = {}) {
  const mode = voiceMode();
  if (mode === 'off' || !host) return () => {};
  injectCSS();
  const phone = !!opts.phone,
    keyName = keyLabel((window.__settings && window.__settings.voiceKey) || 'KeyV');
  const row = document.createElement('div');
  row.className = 'vc';
  row.dataset.state = 'idle';
  row.innerHTML =
    `<span class="vc-or">or</span><button type="button" class="vc-mic" aria-label="Hold to say it">${MIC_SVG}<span class="vc-ring"></span></button>` +
    `<div class="vc-side"><div class="vc-meter" aria-hidden="true">${'<i></i>'.repeat(9)}</div><div class="vc-msg" aria-live="polite"></div><div class="vc-bar" hidden><i></i></div></div>`;
  const anchor = host.querySelector('.tp-in');
  if (anchor) anchor.after(row);
  else host.appendChild(row);
  const btn = row.querySelector('.vc-mic'),
    msg = row.querySelector('.vc-msg'),
    bars = [...row.querySelectorAll('.vc-meter i')],
    bar = row.querySelector('.vc-bar');
  const idleText = phone ? 'Hold the mic and say it' : `Hold <kbd>${keyName}</kbd> or the mic and say it`;
  let state = 'idle',
    misses = 0,
    alive = true,
    raf = 0,
    t0 = 0,
    tapMode = false,
    recording = null,
    quietSince = 0,
    web = null,
    gen = 0;
  // the answer block has one hint line: the mic's message, unless a typing hint came after it (ui.js sets data-last)
  const set = (s, html) => {
    state = s;
    row.dataset.state = s;
    if (html != null) msg.innerHTML = html;
    if (s !== 'idle' && row.parentNode) row.parentNode.dataset.last = 'voice';
  };
  set('idle', idleText);
  micGranted().then((ok) => {
    if (ok && alive && state === 'idle')
      openMic().catch(() => {
        /* the press will say */
      });
  });

  const meter = () => {
    if (!alive || state !== 'listening') return;
    const { lv, talk, heardSpeech } = micRead(),
      now = performance.now();
    bars.forEach((b, i) => {
      const k = Math.max(0.12, Math.min(1, lv * (0.6 + 0.4 * Math.sin(now / 90 + i * 1.7) ** 2) * 1.25));
      b.style.transform = `scaleY(${k.toFixed(3)})`;
    });
    row.style.setProperty('--lv', lv.toFixed(3));
    // tap-to-talk stops by itself: after speech, 0.9 s of quiet; or 6 s in all
    if (talk) quietSince = now;
    if (tapMode && ((heardSpeech && now - quietSince > 900) || now - t0 > 6000)) {
      stop();
      return;
    }
    raf = requestAnimationFrame(meter);
  };

  async function start() {
    if (!alive || state === 'listening' || state === 'thinking' || state === 'hit') return;
    const my = ++gen;
    if (!told) {
      told = true;
      set(
        'asking',
        mode === 'browser'
          ? 'The browser will ask for the microphone. Chrome sends what you say to Google to turn it into text.'
          : 'The browser will ask for the microphone. What you say stays on this device.',
      );
    }
    try {
      await openMic();
    } catch (e) {
      if (!alive || my !== gen) return;
      set(
        'blocked',
        "The microphone is blocked, so type it instead. You can allow the mic in the browser's site settings.",
      );
      return;
    }
    if (!alive || my !== gen) return;
    if (mode === 'device' && !engineInfo.device) {
      set(
        'loading',
        `Getting the voice model ready (${MODELS[pickModel()].mb} MB, only this once). You can type meanwhile.`,
      );
      bar.hidden = false;
      try {
        await loadRecogniser({ onProgress: (f) => (bar.firstElementChild.style.width = `${Math.round(f * 100)}%`) });
      } catch {
        bar.hidden = true;
        set('blocked', "The voice model didn't load. Type it for now; it will try again next time.");
        return;
      }
      bar.hidden = true;
      if (!alive) return;
      set('idle', 'Ready. ' + idleText);
      return; // they let go long ago; the next press listens
    }
    if (!downAt) tapMode = true; // let go during the permission prompt: stop on silence
    recording = startMic();
    t0 = quietSince = performance.now();
    if (recording.ctx.state === 'suspended') recording.ctx.resume();
    if (mode === 'browser')
      web = browserListen((t) => {
        msg.innerHTML = `<span class="vc-heard jp">${say(t)}</span>`;
      });
    set('listening', "Listening. Let go when you're done.");
    raf = requestAnimationFrame(meter);
  }

  async function stop() {
    if (state !== 'listening') return;
    cancelAnimationFrame(raf);
    const captured = recording,
      drained = stopMic(captured);
    set('thinking', '<span class="vc-dots"><i></i><i></i><i></i></span>');
    let hit = false,
      heardText = '',
      other = null,
      quiet = false;
    try {
      if (mode === 'browser') {
        web.stop();
        const { texts, err } = await web.done;
        await drained;
        if (!alive) return;
        web = null;
        if (err === 'not-allowed' || err === 'service-not-allowed') {
          set('blocked', "The browser won't let the game listen, so type it instead.");
          return;
        }
        if (err === 'network') {
          set('miss', 'The browser\'s recogniser needs the internet. Try "On this device" in Settings, or type it.');
          return;
        }
        quiet = !texts.length;
        for (const t of texts) {
          const m = matchWord(t, id, opts.ro);
          if (m.hit) {
            hit = true;
            heardText = t;
            break;
          }
          other = other || m.other;
          heardText = heardText || t;
        }
      } else {
        await drained;
        if (!alive) return;
        const s = await micSamples16k(captured);
        if (!alive) return;
        const r = await judge(s, id, opts.ro, captured.recordingFloor);
        hit = r.hit;
        heardText = r.text;
        other = r.other;
        quiet = r.reason === 'quiet';
      }
    } catch (e) {
      if (!alive) return;
      console.warn('voice:', e);
      set('miss', 'Something went wrong with the recogniser. Type it for now.');
      return;
    }
    if (!alive) return;
    if (hit) {
      showHit();
      setTimeout(() => alive && opts.onHit && opts.onHit({ via: 'voice', text: heardText }), 520);
      return;
    }
    misses++;
    showMiss({ quiet, other, heardText });
  }
  function showHit() {
    set('hit', `<b>${say(opts.ja || '')}</b> Got it.`);
    host.querySelectorAll('.tp-ro .lt').forEach((l) => l.classList.add('on'));
  }
  function showMiss({ quiet, other, heardText }) {
    let line;
    if (quiet)
      line = phone
        ? "Didn't hear anything. Hold the mic while you talk."
        : `Didn't hear anything. Hold ${keyName} or the mic while you talk.`;
    else if (other && hintJa(other))
      line = `That sounded like <span class="jp">${hintJa(other)}</span>. Try again, or type it.`;
    else
      line = `Didn't catch that${heardText ? ` (heard <span class="jp">${say(heardText.slice(0, 16))}</span>)` : ''}. Try again, or type it.`;
    if (misses >= 2 && !quiet) line += ' <button type="button" class="vc-hear">Hear it</button>';
    set('miss', line);
    const h = msg.querySelector('.vc-hear');
    if (h)
      h.onclick = (e) => {
        e.stopPropagation();
        playWord(id);
      };
  }

  // hold the mic (pointer) or the key; a quick tap listens until you stop talking
  let downAt = 0;
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (state === 'listening') {
      stop();
      return;
    }
    downAt = performance.now();
    tapMode = false;
    start();
  });
  const up = (e) => {
    if (!downAt) return;
    e && e.stopPropagation();
    const held = performance.now() - downAt;
    downAt = 0;
    if (held < 280) {
      tapMode = true;
      return;
    }
    stop();
  };
  btn.addEventListener('pointerup', up);
  btn.addEventListener('pointercancel', up);
  btn.addEventListener('pointerleave', (e) => {
    if (downAt && performance.now() - downAt >= 280) up(e);
  });
  btn.addEventListener('click', (e) => e.stopPropagation());
  const code = (window.__settings && window.__settings.voiceKey) || 'KeyV';
  const kd = (e) => {
    if (e.code !== code) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.repeat) return;
    downAt = performance.now();
    tapMode = false;
    start();
  };
  const ku = (e) => {
    if (e.code !== code) return;
    e.preventDefault();
    e.stopPropagation();
    up();
  };
  if (!phone) {
    addEventListener('keydown', kd, true);
    addEventListener('keyup', ku, true);
  }

  const cleanup = () => {
    alive = false;
    cancelAnimationFrame(raf);
    if (web) web.stop();
    removeEventListener('keydown', kd, true);
    removeEventListener('keyup', ku, true);
    row.remove();
    closeMic();
  };
  // for the state sheet (game3d/tools/speech/states.html): show a state without a microphone
  cleanup.demo = (st, d = {}) => {
    if (st === 'idle') set('idle', idleText);
    else if (st === 'asking')
      set(
        'asking',
        mode === 'browser'
          ? 'The browser will ask for the microphone. Chrome sends what you say to Google to turn it into text.'
          : 'The browser will ask for the microphone. What you say stays on this device.',
      );
    else if (st === 'loading') {
      set(
        'loading',
        `Getting the voice model ready (${MODELS[pickModel()].mb} MB, only this once). You can type meanwhile.`,
      );
      bar.hidden = false;
      bar.firstElementChild.style.width = (d.progress ?? 40) + '%';
    } else if (st === 'listening') {
      set('listening', "Listening. Let go when you're done.");
      row.style.setProperty('--lv', d.level ?? 0.6);
      bars.forEach((b, i) => {
        b.style.transform = `scaleY(${[0.3, 0.6, 0.9, 0.7, 1, 0.8, 0.5, 0.35, 0.2][i]})`;
      });
    } else if (st === 'thinking') set('thinking', '<span class="vc-dots"><i></i><i></i><i></i></span>');
    else if (st === 'hit') showHit();
    else if (st === 'miss') {
      misses = d.misses ?? 1;
      showMiss(d);
    } else if (st === 'blocked')
      set(
        'blocked',
        "The microphone is blocked, so type it instead. You can allow the mic in the browser's site settings.",
      );
  };
  return cleanup;
}

// "That sounded like X" names X only when Eric has learned it, spelled the way the game teaches it
const hintJa = (k) => (WORDS[k] && known.has(k) ? WORDS[k].ja : null);

function playWord(id) {
  const s = window.__settings || {},
    a = new Audio(WORD_CLIP(id));
  a.volume = Math.max(0, Math.min(1, (s.voice ?? 1) * (s.master ?? 1)));
  a.playbackRate = 0.85;
  a.play().catch(() => {});
}
function keyLabel(code) {
  return code.replace(/^Key/, '').replace(/^Digit/, '');
}

let cssDone = false;
function injectCSS() {
  if (cssDone) return;
  cssDone = true;
  const st = document.createElement('style');
  st.id = 'voice-css';
  st.textContent = VOICE_CSS;
  document.head.appendChild(st);
}
// The mic row. Same system as the typing prompt: dark field, teal for "on", coral for trouble, no glow.
export const VOICE_CSS = `
.vc { --lv: 0; display: flex; align-items: center; gap: 12px; margin-top: 6px; min-height: 52px; pointer-events: auto; }
.vc-or { color: var(--ink-dim, #a9b1bf); font-size: 14px; }
.vc-mic { position: relative; flex: none; width: 48px; height: 48px; border-radius: 50%; border: 1px solid rgba(111, 208, 198, .45); background: #151920; color: var(--accent, #6fd0c6); display: grid; place-items: center; cursor: pointer; touch-action: none; -webkit-user-select: none; user-select: none; padding: 0; }
.vc-mic svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; }
.vc-mic:hover { border-color: var(--accent, #6fd0c6); }
.vc-mic:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(111, 208, 198, .35); }
.vc-ring { position: absolute; inset: -5px; border-radius: 50%; border: 2px solid var(--accent, #6fd0c6); opacity: 0; transform: scale(calc(1 + var(--lv) * .35)); transition: opacity .15s; pointer-events: none; }
.vc-side { display: grid; gap: 4px; min-width: 0; }
.vc-msg { color: var(--ink-dim, #a9b1bf); font-size: 14px; line-height: 1.35; }
.vc-msg kbd { font: 600 12px/1 var(--font, system-ui); padding: 2px 6px; border-radius: 5px; border: 1px solid rgba(255,255,255,.18); color: var(--ink, #eef0f4); }
.vc-msg .jp { color: var(--jp, #ffc9a8); }
.vc-meter { display: none; height: 18px; align-items: center; gap: 3px; }
.vc-meter i { width: 4px; height: 18px; border-radius: 2px; background: var(--accent, #6fd0c6); transform: scaleY(.12); transform-origin: 50% 50%; }
.vc-bar { height: 4px; width: min(220px, 60vw); border-radius: 2px; background: rgba(255,255,255,.1); overflow: hidden; }
.vc-bar i { display: block; height: 100%; width: 0; background: var(--accent, #6fd0c6); transition: width .2s; }
.vc-hear { margin-left: 4px; padding: 2px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,.18); background: #232833; color: var(--ink, #eef0f4); font: inherit; font-size: 13px; cursor: pointer; }
.vc[data-state="listening"] .vc-mic { background: var(--accent, #6fd0c6); color: #10151c; border-color: var(--accent, #6fd0c6); }
.vc[data-state="listening"] .vc-ring { opacity: .55; }
.vc[data-state="listening"] .vc-meter { display: flex; }
.vc[data-state="thinking"] .vc-mic { opacity: .7; }
.vc[data-state="hit"] .vc-mic { background: var(--accent, #6fd0c6); color: #10151c; }
.vc[data-state="hit"] .vc-msg { color: var(--accent, #6fd0c6); }
.vc[data-state="hit"] .vc-msg b { color: var(--jp, #ffc9a8); font-weight: 600; margin-right: 4px; }
.vc[data-state="miss"] .vc-mic { border-color: rgba(240, 138, 126, .7); color: var(--warn, #f08a7e); }
.vc[data-state="blocked"] .vc-mic { opacity: .45; }
.vc-dots { display: inline-flex; gap: 4px; }
.vc-dots i { width: 6px; height: 6px; border-radius: 50%; background: var(--ink-dim, #a9b1bf); animation: vcdot 1s infinite ease-in-out; }
.vc-dots i:nth-child(2) { animation-delay: .15s; } .vc-dots i:nth-child(3) { animation-delay: .3s; }
@keyframes vcdot { 0%, 100% { opacity: .25; } 50% { opacity: 1; } }
body.reduce-motion .vc-dots i { animation: none; opacity: .7; }
body.phone .vc-mic { width: 56px; height: 56px; }
body.phone .vc-msg { font-size: 13px; }
`;
