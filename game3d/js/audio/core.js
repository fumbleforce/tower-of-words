import { settings, onSettings } from '../settings.js';
import { known } from '../lang.js';
import { MC, playerClip } from '../mc.js';
import { audioKeys } from '../narrative/voice-keys.js';

// ---------- sound ----------
let actx = null;
export let muted = false;
let duckWhile = () => {};
export function setVoiceDucking(handler) {
  duckWhile = handler;
}
export function existingAudioContext() {
  return actx;
}
let voiceSpans = null;
fetch(new URL('../../audio/spans.json?v=' + (window.BUILD || ''), import.meta.url))
  .then((r) => (r.ok ? r.json() : null))
  .then((j) => {
    voiceSpans = j;
  })
  .catch(() => {});
const clips = {};
export function audioContext() {
  if (!actx) {
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      actx = null;
    }
  }
  if (actx && actx.state === 'suspended' && !paused) actx.resume();
  return actx;
}
// ---------- volume buses ----------
// Everything made with Web Audio goes through a bus: sfx, music, voice (the muffled overheard path), ambience
// (for js/ambience.js), each into the master. Voice clips played as <audio> take voice x master as their volume.
// Settings (js/settings.js) move the gains; the mute chip silences the master.
const buses = {};
const vol = (k) => Math.max(0, Math.min(1, +settings[k] || 0));
function busGainValue(name) {
  return name === 'master' ? (muted ? 0 : vol('master')) : name === 'sfx' ? 1 : vol(name);
}
export function audioBus(name = 'sfx') {
  const c = audioContext();
  if (!c) return null;
  if (!buses.master) {
    buses.master = c.createGain();
    buses.master.gain.value = busGainValue('master');
    buses.master.connect(c.destination);
  }
  if (!buses[name]) {
    const g = c.createGain();
    g.gain.value = busGainValue(name);
    g.connect(buses.master);
    buses[name] = g;
  }
  return buses[name];
}
function setBus(name) {
  const g = buses[name];
  if (!g || !actx) return;
  const t = actx.currentTime;
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(g.gain.value, t);
  g.gain.linearRampToValueAtTime(busGainValue(name), t + 0.15);
}
const clipVolume = (key) => (key && key.startsWith('mio') ? 0.75 : 1) * vol('voice') * (muted ? 0 : vol('master'));
onSettings((k) => {
  if (k === 'master') setBus('master');
  if (k === 'music' || k === 'voice' || k === 'ambience') setBus(k);
  if (k === 'master' || k === 'voice')
    for (const [key, a] of Object.entries(clips)) if (a instanceof Audio && !a._fading) a.volume = clipVolume(key);
  if (k === 'voiceOn' && !settings.voiceOn) stopVoice();
});
// ---------- pause (menu.js): Web Audio stops where it is, the voice clip holds its place ----------
export let paused = false;
let pausedClip = null;
export function pauseAudio(on) {
  paused = !!on;
  if (on) {
    if (actx && actx.state === 'running') actx.suspend();
    if (curVoice && !curVoice.paused) {
      pausedClip = curVoice;
      curVoice.pause();
    }
  } else {
    if (actx && actx.state === 'suspended') actx.resume();
    if (pausedClip) {
      const a = pausedClip;
      pausedClip = null;
      a.play().catch(() => {});
    }
  }
}
// One dialogue voice at a time (Jørgen: no overlapping voices when he clicks on). A new clip, or advancing the line,
// fades the current one out over 80 ms and the next starts only after that. window.__voiceLog counts plays and the
// most clips ever sounding at once (the fast test checks it stays 1).
let curVoice = null,
  voiceGen = 0;
const vlog = (window.__voiceLog = { plays: 0, maxActive: 0, overlaps: 0 });
const sounding = () =>
  [...Object.values(clips), clips._muffled].filter(
    (a) => a && a instanceof Audio && !a.paused && !a.ended && !a._fading,
  ).length;
// A local plugin may serve some clips from elsewhere: fn(key) returns a URL, or null to use audio/<key>.mp3.
let clipResolver = null;
export function setClipResolver(fn) {
  clipResolver = fn;
}
const clipUrl = (key) => clipResolver?.(key) || new URL(`../../audio/${key}.mp3`, import.meta.url).href;
export function stopVoice(ms = 80) {
  voiceGen++; // a clip still starting up for the old line won't play on
  const a = curVoice;
  curVoice = null;
  if (!a || a.paused || a.ended) return 0;
  a._fading = true;
  const v0 = a.volume,
    t0 = performance.now();
  const tick = () => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    try {
      a.volume = v0 * (1 - k);
    } catch {
      /* */
    }
    if (k < 1) requestAnimationFrame(tick);
    else {
      a.pause();
      a._fading = false;
    }
  };
  // rAF stalls in hidden tabs; a timer makes sure it stops anyway
  requestAnimationFrame(tick);
  setTimeout(() => {
    if (a._fading) {
      a.pause();
      a._fading = false;
    }
  }, ms + 30);
  return ms;
}
// Returns a promise that resolves when the clip has finished (or at once if there is no sound), so a caller can
// let a speaker finish: Eric's words must never be cut off by the next line.
export function voice(key, opts = {}) {
  if (muted || !key || !settings.voiceOn) return Promise.resolve();
  key = playerClip(key, MC, (k) => audioKeys.has(k)); // the player's word clips in the protagonist's voice
  const wait = stopVoice(80);
  const gen = voiceGen;
  return new Promise((res) => {
    const go = () => {
      if (gen !== voiceGen) return res();
      playVoice(key, opts, gen, res);
    };
    if (wait) setTimeout(go, wait + 5);
    else go();
  });
}
// wait for someone to finish speaking, then a short beat
export async function voiceThenBeat(p, beat = 300) {
  if (window.__test) return;
  await p;
  await new Promise((r) => setTimeout(r, beat));
}
function started(a, gen) {
  if (gen !== voiceGen) {
    a.pause();
    return;
  }
  curVoice = a;
  vlog.plays++;
  const n = sounding();
  vlog.maxActive = Math.max(vlog.maxActive, n);
  if (n > 1) vlog.overlaps++;
  duckWhile(a);
}
function playVoice(key, { rate = 1, muffle = false } = {}, gen = voiceGen, done = () => {}) {
  if (muted) return done();
  // finish: when it ends, is stopped, fails, or after 8 s at most
  let fin = false,
    began = false;
  const end = () => {
    if (!fin) {
      fin = true;
      done();
    }
  };
  setTimeout(end, 8000);
  // if it never starts (no audio device, autoplay blocked), don't hold anyone up
  setTimeout(() => {
    if (!began) end();
  }, 1200);
  if (muffle) {
    // overheard speech: heavily muffled (low-pass, quieter), except the words he knows, which come through clear.
    // audio/spans.json lists those words' times per clip [[t0, t1], ...]; the two paths crossfade in 40 ms.
    const c = audioContext();
    if (!c) return;
    try {
      const a = new Audio(clipUrl(key));
      a.crossOrigin = 'anonymous';
      const src = c.createMediaElementSource(a),
        f = c.createBiquadFilter(),
        f2 = c.createBiquadFilter(),
        wet = c.createGain(),
        dry = c.createGain();
      f.type = 'lowpass';
      f.frequency.value = 380;
      f.Q.value = 0.5;
      f2.type = 'lowpass';
      f2.frequency.value = 380;
      f2.Q.value = 0.5;
      const vb = audioBus('voice');
      src.connect(f);
      f.connect(f2);
      f2.connect(wet);
      wet.connect(vb);
      src.connect(dry);
      dry.connect(vb);
      const W = 0.55,
        X = 0.04;
      wet.gain.value = W;
      dry.gain.value = 0;
      // entries are [t0, t1, wordId] (clear only once he knows that word) or [t0, t1, 'clear'] (always clear)
      // clear spans, merged where they touch or overlap: two words back to back (すみません、すみません) used to
      // schedule clashing ramps, and the second word stayed muffled
      const spans = [];
      for (const [s, e] of ((voiceSpans && voiceSpans[key]) || [])
        .filter(([, , id]) => id === 'clear' || known.has(id))
        .map(([s, e]) => [s, e])
        .sort((a, b) => a[0] - b[0])) {
        const last = spans[spans.length - 1];
        if (last && s <= last[1] + 2 * X + 0.02) last[1] = Math.max(last[1], e);
        else spans.push([s, e]);
      }
      a.addEventListener(
        'playing',
        () => {
          const t0 = c.currentTime - a.currentTime;
          for (const [s, e] of spans) {
            dry.gain.setValueAtTime(0, t0 + s - X);
            dry.gain.linearRampToValueAtTime(1, t0 + s);
            dry.gain.setValueAtTime(1, t0 + e);
            dry.gain.linearRampToValueAtTime(0, t0 + e + X);
            wet.gain.setValueAtTime(W, t0 + s - X);
            wet.gain.linearRampToValueAtTime(0, t0 + s);
            wet.gain.setValueAtTime(0, t0 + e);
            wet.gain.linearRampToValueAtTime(W, t0 + e + X);
          }
        },
        { once: true },
      );
      if (clips._muffled) clips._muffled.pause();
      clips._muffled = a;
      for (const ev of ['ended', 'pause', 'error'])
        a.addEventListener(
          ev,
          function onEv() {
            if (paused && pausedClip === a) {
              a.addEventListener(ev, onEv, { once: true });
              return;
            }
            end();
          },
          { once: true },
        );
      a.play()
        .then(() => {
          began = true;
          started(a, gen);
        })
        .catch(end);
    } catch {
      /* no audio */
    }
    return;
  }
  try {
    const a = clips[key] || (clips[key] = new Audio(clipUrl(key)));
    a._fading = false;
    a.pause();
    a.currentTime = 0;
    a.playbackRate = rate;
    a.volume = clipVolume(key);
    for (const ev of ['ended', 'pause', 'error'])
      a.addEventListener(
        ev,
        function onEv() {
          if (paused && pausedClip === a) {
            a.addEventListener(ev, onEv, { once: true });
            return;
          }
          end();
        },
        { once: true },
      );
    a.play()
      .then(() => {
        began = true;
        started(a, gen);
      })
      .catch(end);
  } catch {
    /* no audio */
  }
}
export function setAudioMuted(m) {
  muted = m;
  if (m) for (const a of Object.values(clips)) a.pause();
  setBus('master');
}
export function isMuted() {
  return muted;
}
export function unlockAudio() {
  audioContext();
}
