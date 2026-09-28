// HTML overlay: goal, words, the train's LED board, the talk panel with reply chips, fades and the end card.
import { lineHTML, WORDS, COMMANDS, PHRASES, known, seen, cmdHTML, iconHTML, INTERJ_GLOSS } from './lang.js';
import { settings, onSettings, CPS } from './settings.js';

const $ = (s) => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

// ---------- sound ----------
let actx = null, muted = false;
let voiceSpans = null;
fetch(new URL('../audio/spans.json?v=' + (window.BUILD || ''), import.meta.url)).then((r) => (r.ok ? r.json() : null)).then((j) => { voiceSpans = j; }).catch(() => {});
const clips = {};
function ac() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch { actx = null; } } if (actx && actx.state === 'suspended' && !paused) actx.resume(); return actx; }
// ---------- volume buses ----------
// Everything made with Web Audio goes through a bus: sfx, music, voice (the muffled overheard path), ambience
// (for js/ambience.js), each into the master. Voice clips played as <audio> take voice x master as their volume.
// Settings (js/settings.js) move the gains; the mute chip silences the master.
const buses = {};
const vol = (k) => Math.max(0, Math.min(1, +settings[k] || 0));
function busGainValue(name) { return name === 'master' ? (muted ? 0 : vol('master')) : name === 'sfx' ? 1 : vol(name); }
export function audioBus(name = 'sfx') {
  const c = ac(); if (!c) return null;
  if (!buses.master) { buses.master = c.createGain(); buses.master.gain.value = busGainValue('master'); buses.master.connect(c.destination); }
  if (!buses[name]) { const g = c.createGain(); g.gain.value = busGainValue(name); g.connect(buses.master); buses[name] = g; }
  return buses[name];
}
function setBus(name) { const g = buses[name]; if (!g || !actx) return; const t = actx.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(busGainValue(name), t + 0.15); }
const clipVolume = (key) => (key && key.startsWith('mio') ? 0.75 : 1) * vol('voice') * (muted ? 0 : vol('master'));
onSettings((k) => {
  if (k === 'master') setBus('master');
  if (k === 'music' || k === 'voice' || k === 'ambience') setBus(k);
  if (k === 'master' || k === 'voice') for (const [key, a] of Object.entries(clips)) if (a instanceof Audio && !a._fading) a.volume = clipVolume(key);
  if (k === 'voiceOn' && !settings.voiceOn) stopVoice();
});
// ---------- pause (menu.js): Web Audio stops where it is, the voice clip holds its place ----------
let paused = false, pausedClip = null;
export function pauseAudio(on) {
  paused = !!on;
  if (on) { if (actx && actx.state === 'running') actx.suspend(); if (curVoice && !curVoice.paused) { pausedClip = curVoice; curVoice.pause(); } }
  else { if (actx && actx.state === 'suspended') actx.resume(); if (pausedClip) { const a = pausedClip; pausedClip = null; a.play().catch(() => {}); } }
}
// One dialogue voice at a time (Jørgen: no overlapping voices when he clicks on). A new clip, or advancing the line,
// fades the current one out over 80 ms and the next starts only after that. window.__voiceLog counts plays and the
// most clips ever sounding at once (the fast test checks it stays 1).
let curVoice = null, voiceGen = 0;
const vlog = (window.__voiceLog = { plays: 0, maxActive: 0, overlaps: 0 });
const sounding = () => [...Object.values(clips), clips._muffled].filter((a) => a && a instanceof Audio && !a.paused && !a.ended && !a._fading).length;
export function stopVoice(ms = 80) {
  voiceGen++; // a clip still starting up for the old line won't play on
  const a = curVoice; curVoice = null;
  if (!a || a.paused || a.ended) return 0;
  a._fading = true;
  const v0 = a.volume, t0 = performance.now();
  const tick = () => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    try { a.volume = v0 * (1 - k); } catch { /* */ }
    if (k < 1) requestAnimationFrame(tick); else { a.pause(); a._fading = false; }
  };
  // rAF stalls in hidden tabs; a timer makes sure it stops anyway
  requestAnimationFrame(tick); setTimeout(() => { if (a._fading) { a.pause(); a._fading = false; } }, ms + 30);
  return ms;
}
// Returns a promise that resolves when the clip has finished (or at once if there is no sound), so a caller can
// let a speaker finish: Eric's words must never be cut off by the next line.
export function voice(key, opts = {}) {
  if (muted || !key || !settings.voiceOn) return Promise.resolve();
  const wait = stopVoice(80);
  const gen = voiceGen;
  return new Promise((res) => {
    const go = () => { if (gen !== voiceGen) return res(); playVoice(key, opts, gen, res); };
    if (wait) setTimeout(go, wait + 5); else go();
  });
}
// wait for someone to finish speaking, then a short beat
export async function voiceThenBeat(p, beat = 300) { if (window.__test) return; await p; await new Promise((r) => setTimeout(r, beat)); }
function started(a, gen) {
  if (gen !== voiceGen) { a.pause(); return; }
  curVoice = a; vlog.plays++;
  const n = sounding(); vlog.maxActive = Math.max(vlog.maxActive, n); if (n > 1) vlog.overlaps++;
  duckWhile(a);
}
function playVoice(key, { rate = 1, muffle = false } = {}, gen = voiceGen, done = () => {}) {
  if (muted) return done();
  // finish: when it ends, is stopped, fails, or after 8 s at most
  let fin = false, began = false; const end = () => { if (!fin) { fin = true; done(); } }; setTimeout(end, 8000);
  // if it never starts (no audio device, autoplay blocked), don't hold anyone up
  setTimeout(() => { if (!began) end(); }, 1200);
  if (muffle) {
    // overheard speech: heavily muffled (low-pass, quieter), except the words he knows, which come through clear.
    // audio/spans.json lists those words' times per clip [[t0, t1], ...]; the two paths crossfade in 40 ms.
    const c = ac(); if (!c) return;
    try {
      const a = new Audio(new URL(`../audio/${key}.mp3`, import.meta.url).href); a.crossOrigin = 'anonymous';
      const src = c.createMediaElementSource(a), f = c.createBiquadFilter(), f2 = c.createBiquadFilter(), wet = c.createGain(), dry = c.createGain();
      f.type = 'lowpass'; f.frequency.value = 380; f.Q.value = 0.5; f2.type = 'lowpass'; f2.frequency.value = 380; f2.Q.value = 0.5;
      const vb = audioBus('voice');
      src.connect(f); f.connect(f2); f2.connect(wet); wet.connect(vb);
      src.connect(dry); dry.connect(vb);
      const W = 0.55, X = 0.04;
      wet.gain.value = W; dry.gain.value = 0;
      // entries are [t0, t1, wordId] (clear only once he knows that word) or [t0, t1, 'clear'] (always clear)
      // clear spans, merged where they touch or overlap: two words back to back (すみません、すみません) used to
      // schedule clashing ramps, and the second word stayed muffled
      const spans = [];
      for (const [s, e] of ((voiceSpans && voiceSpans[key]) || []).filter(([, , id]) => id === 'clear' || known.has(id) || seen.has(id)).map(([s, e]) => [s, e]).sort((a, b) => a[0] - b[0])) {
        const last = spans[spans.length - 1];
        if (last && s <= last[1] + 2 * X + 0.02) last[1] = Math.max(last[1], e); else spans.push([s, e]);
      }
      a.addEventListener('playing', () => {
        const t0 = c.currentTime - a.currentTime;
        for (const [s, e] of spans) {
          dry.gain.setValueAtTime(0, t0 + s - X); dry.gain.linearRampToValueAtTime(1, t0 + s);
          dry.gain.setValueAtTime(1, t0 + e); dry.gain.linearRampToValueAtTime(0, t0 + e + X);
          wet.gain.setValueAtTime(W, t0 + s - X); wet.gain.linearRampToValueAtTime(0, t0 + s);
          wet.gain.setValueAtTime(0, t0 + e); wet.gain.linearRampToValueAtTime(W, t0 + e + X);
        }
      }, { once: true });
      if (clips._muffled) clips._muffled.pause(); clips._muffled = a;
      for (const ev of ['ended', 'pause', 'error']) a.addEventListener(ev, function onEv() { if (paused && pausedClip === a) { a.addEventListener(ev, onEv, { once: true }); return; } end(); }, { once: true });
      a.play().then(() => { began = true; started(a, gen); }).catch(end);
    } catch { /* no audio */ }
    return;
  }
  try {
    const a = clips[key] || (clips[key] = new Audio(new URL(`../audio/${key}.mp3`, import.meta.url).href));
    a._fading = false; a.pause(); a.currentTime = 0; a.playbackRate = rate; a.volume = clipVolume(key);
    for (const ev of ['ended', 'pause', 'error']) a.addEventListener(ev, function onEv() { if (paused && pausedClip === a) { a.addEventListener(ev, onEv, { once: true }); return; } end(); }, { once: true });
    a.play().then(() => { began = true; started(a, gen); }).catch(end);
  } catch { /* no audio */ }
}
// sound effects: feel's levelled sound files (sfx.js), through audioBus('sfx')
// (loaded after this module: sfx.js imports ui.js for its buses, so a static import here would be a cycle)
let SFX = null, AMB = null;
import('./sfx.js').then((m) => { SFX = m; }); import('./ambience.js').then((m) => { AMB = m; });
export function sfx(kind, o) { return SFX ? SFX.sfx(kind, o) : undefined; }
export function stopSfx(kind, ms = 40) { return SFX ? SFX.stopSfx(kind, ms) : undefined; }
function noise(c, len) {
  const n = c.createBufferSource(), buf = c.createBuffer(1, Math.ceil(c.sampleRate * len), c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  n.buffer = buf; return n;
}
// a dull knock: a short burst of low-passed noise with a falling sine under it
function thump(c, out, t, v, hz) {
  const n = noise(c, 0.2), f = c.createBiquadFilter(), gg = c.createGain();
  f.type = 'lowpass'; f.frequency.value = 320; gg.gain.setValueAtTime(v, t); gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  n.connect(f); f.connect(gg); gg.connect(out); n.start(t);
  const o = c.createOscillator(), og = c.createGain(); o.frequency.setValueAtTime(hz * 1.6, t); o.frequency.exponentialRampToValueAtTime(hz, t + 0.08);
  og.gain.setValueAtTime(v * 1.2, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.22); o.connect(og); og.connect(out); o.start(t); o.stop(t + 0.25);
}

// ---------- music ----------
// Lyria loops (audio/music/*.mp3), one per place. Each loop is played as overlapping copies with a 2 s crossfade
// so the seam never clicks; places crossfade over 2.5 s; voices duck the music while someone talks.
const MUSIC_VOL = 0.2, DUCK = 0.4;
const music = { name: null, bus: null, duck: null, bufs: {}, cur: null, timer: 0 };
async function musicBuf(name) {
  if (!music.bufs[name]) music.bufs[name] = fetch(new URL(`../audio/music/${name}.mp3?v=${window.BUILD || ''}`, import.meta.url)).then((r) => r.arrayBuffer()).then((b) => ac().decodeAudioData(b));
  return music.bufs[name];
}
export async function playMusic(name) {
  const c = ac(); if (!c || name === music.name) return;
  music.name = name;
  if (!music.bus) { music.bus = c.createGain(); music.duck = c.createGain(); music.bus.gain.value = MUSIC_VOL; music.bus.connect(music.duck); music.duck.connect(audioBus('music')); }
  const t = c.currentTime;
  if (music.cur) { const old = music.cur; old.stopped = true; clearTimeout(old.timer); old.g.gain.cancelScheduledValues(t); old.g.gain.setValueAtTime(old.g.gain.value, t); old.g.gain.linearRampToValueAtTime(0, t + 2.5); for (const s of old.srcs) s.stop(t + 2.6); music.cur = null; }
  if (!name) return;
  let buf; try { buf = await musicBuf(name); } catch { return; }
  if (music.name !== name) return;
  const g = c.createGain(); g.connect(music.bus);
  const track = { g, srcs: [], stopped: false, timer: 0 };
  music.cur = track;
  const X = 2, start = c.currentTime + 0.05;
  g.gain.setValueAtTime(0, start); g.gain.linearRampToValueAtTime(1, start + 2.5);
  const play = (at, fadeIn) => {
    if (track.stopped) return;
    const s = c.createBufferSource(), sg = c.createGain(); s.buffer = buf; s.connect(sg); sg.connect(g);
    const end = at + buf.duration;
    sg.gain.setValueAtTime(fadeIn ? 0 : 1, at); if (fadeIn) sg.gain.linearRampToValueAtTime(1, at + X);
    sg.gain.setValueAtTime(1, end - X); sg.gain.linearRampToValueAtTime(0, end);
    s.start(at); s.stop(end + 0.05);
    track.srcs.push(s); if (track.srcs.length > 3) track.srcs.shift();
    const next = end - X;
    track.timer = setTimeout(() => play(next, true), Math.max(0, (next - c.currentTime - 1) * 1000));
  };
  play(start, false);
}
// voices duck the music
let duckN = 0;
function duckMusic(on) {
  AMB?.duck(on);
  const c = actx; if (!c || !music.duck) return;
  duckN = Math.max(0, duckN + (on ? 1 : -1));
  const t = c.currentTime; music.duck.gain.cancelScheduledValues(t); music.duck.gain.setValueAtTime(music.duck.gain.value, t);
  music.duck.gain.linearRampToValueAtTime(duckN ? DUCK : 1, t + (duckN ? 0.15 : 0.6));
}
function duckWhile(a) {
  duckMusic(true); let done = false;
  const off = () => { if (!done) { done = true; duckMusic(false); } };
  a.addEventListener('ended', off, { once: true }); a.addEventListener('pause', off, { once: true }); a.addEventListener('error', off, { once: true });
}
export function setMuted(m) {
  muted = m; if (m) for (const a of Object.values(clips)) a.pause();
  setBus('master');
  const b = document.getElementById('muteBtn'); if (b) b.classList.toggle('off', m);
}
export function isMuted() { return muted; }
export function unlockAudio() { ac(); }

// ---------- VN portraits ----------
// Approved art only: cut-outs of the bible portraits (bible/facts.yaml `portrait:`, proto2/cast-fixed/*-after.webp).
// One neutral face each for now; expressions will be face repaints of the same portrait. Faces a story asks for that
// don't exist yet fall back to neutral. People without approved art get a name plate only.
// Provisional (the art agent's picks, not approved yet): Eric seed 734 v2, Mori 713, Kenji 711, Hamada (speaker kuroda) 721,
// the guard Ishibashi. See story/FORMAT.md.
export const PORTRAITS = { mio: ['neutral', 'smile', 'deadpan', 'surprised', 'embarrassed', 'tired'], aoi: ['neutral'], kuro: ['neutral'],
  eric: ['neutral', 'surprised', 'tired'], mori: ['neutral', 'smile', 'flustered'], kenji: ['neutral', 'grin', 'sheepish'],
  kuroda: ['neutral', 'sleepy', 'panicked'], guard: ['neutral', 'stern', 'amused'], emi: ['neutral'] };
// Mio's new faces are still being made: they are listed so they switch in by name when the files land; until then
// a missing file falls back to neutral (the img's error handler below).
// Each cut-out's face box (imgutils detect_faces on the neutral image, image pixels [x0, y0, x1, y1]) and image size.
// All expressions of a person share the framing. Every portrait is placed from this: the same face height on screen,
// the chin at the same height, the body cut at the waist.
export const FACE = {
  aoi: { W: 630, H: 810, f: [222, 196, 413, 389] }, eric: { W: 597, H: 768, f: [218, 211, 390, 402] },
  guard: { W: 597, H: 768, f: [250, 162, 374, 300] }, kenji: { W: 597, H: 768, f: [229, 169, 371, 330] },
  kuro: { W: 630, H: 809, f: [254, 325, 452, 525] }, kuroda: { W: 597, H: 768, f: [240, 154, 364, 313] },
  mio: { W: 597, H: 768, f: [192, 214, 361, 383] }, emi: { W: 597, H: 768, f: [203, 159, 395, 349] }, mori: { W: 597, H: 768, f: [234, 171, 372, 339] },
};
const EMOTE_FACE = { '?': ['suspicious', 'deadpan', 'stern'], '!': ['surprised', 'panicked', 'panic'], '♪': ['smile', 'grin', 'amused'], heart: ['smile', 'embarrassed', 'grin'], sweat: ['flustered', 'embarrassed', 'sheepish', 'panicked'], zzz: ['sleepy', 'tired'], '…': ['tired', 'deadpan'] };
const faceNow = {};
let lastNpc = null;
export function setFace(who, face) { faceNow[who] = face; }
export function faceForEmote(who, kind) { const f = (EMOTE_FACE[kind] || []).find((x) => PORTRAITS[who] && PORTRAITS[who].includes(x)); if (f) faceNow[who] = f; }
function faceOf(who, face) { const list = PORTRAITS[who]; if (!list) return null; return list.includes(face) ? face : list.includes(faceNow[who]) ? faceNow[who] : 'neutral'; }
function portraitSrc(who, face) {
  if (!PORTRAITS[who]) return null;
  return new URL(`../assets/portraits/${who}-${faceOf(who, face)}.webp?v=${encodeURIComponent(window.BUILD || '')}`, import.meta.url).href;
}
const HOPS = new Set(['surprised', 'panicked', 'panic']);
function showPortraits(t, whoId, face) {
  const S = $('#stage'), L = S.querySelector('.por.left'), R = S.querySelector('.por.right');
  S.hidden = false;
  if (!whoId) { L.hidden = R.hidden = true; return; }          // narration: no portrait
  const set = (el, who, f, listen) => {
    const src = portraitSrc(who, f); if (!src) { el.hidden = true; return; }
    const img = el.querySelector('img');
    if (img.getAttribute('src') !== src) {
      img.onerror = () => { const n = portraitSrc(who, 'neutral'); if (img.getAttribute('src') !== n) { img.src = n; el.style.setProperty('--src', `url("${n}")`); } };
      img.src = src; el.style.setProperty('--src', `url("${src}")`);
      const fc = faceOf(who, f);
      if (!listen && el.dataset.face !== fc && HOPS.has(fc)) { el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop'); }
      el.dataset.face = fc;
    }
    el.dataset.who = who; el.hidden = false; el.classList.toggle('listen', !!listen);
  };
  const phone = document.body.classList.contains('phone');
  if (whoId === 'eric') { set(R, 'eric', face, false); if (!phone && lastNpc && PORTRAITS[lastNpc]) set(L, lastNpc, undefined, true); else L.hidden = true; }
  else { lastNpc = whoId; set(L, whoId, face, false); if (!phone && PORTRAITS[whoId]) set(R, 'eric', undefined, true); else R.hidden = true; }
  if (!PORTRAITS[whoId]) L.hidden = true;
  layoutStage();
}
// Place each portrait from its face box: face height F on screen, chin at the same height for everyone, the body
// cut at the waist by the bottom of the screen (desktop) or by the top of the solid band (phone).
export function layoutStage() {
  const S = $('#stage'); if (!S || S.hidden) return;
  const phone = document.body.classList.contains('phone'), vw = innerWidth, vh = innerHeight;
  const talk = $('#talk');
  const band = phone ? Math.max(170, (talk.hidden ? 0 : talk.offsetHeight) + 18) : 0;
  S.style.setProperty('--band', band + 'px');
  const F = phone ? Math.min(92, vh * 0.1) : Math.min(124, vh * 0.13);
  const cutK = phone ? 1.95 : 2.25;                 // chin to the cut, in face heights (the waist on desktop)
  const base = vh - band;
  for (const el of S.querySelectorAll('.por')) {
    const d = FACE[el.dataset.who]; if (!d || el.hidden) continue;
    const s = F / (d.f[3] - d.f[1]), cx = (d.f[0] + d.f[2]) / 2;
    const chin = base - cutK * F, top = chin - d.f[3] * s;
    const left = el.classList.contains('left');
    const fx = phone ? vw * (left ? 0.36 : 0.64) : vw * (left ? 0.16 : 0.86);
    el.style.width = d.W * s + 'px'; el.style.height = d.H * s + 'px';
    el.style.left = fx - cx * s + 'px'; el.style.top = top + 'px';
    // how far above the cut the image itself ends (Eric's cut-out is shorter); that bottom edge is faded out
    el.style.setProperty('--short', Math.max(0, base - (top + d.H * s)) + 'px');
    el.classList.toggle('short', top + d.H * s < base - 2);
    // cut exactly at the base: the screen edge on desktop, the top of the solid band on phone
    el.style.clipPath = `inset(0 -40px ${Math.max(0, top + d.H * s - base)}px -40px)`;
  }
}
addEventListener('resize', () => layoutStage());
// the stage follows the talk panel: shown with it, hidden with it, re-laid out when its content changes (the phone
// band grows with the text)
let stageRaf = 0;
function watchTalk() {
  const t = $('#talk'); if (!t) { setTimeout(watchTalk, 100); return; }
  new MutationObserver(() => {
    cancelAnimationFrame(stageRaf);
    stageRaf = requestAnimationFrame(() => { const S = $('#stage'); if (t.hidden) { S.hidden = true; return; } S.hidden = false; S.classList.toggle('narr', t.classList.contains('narr')); layoutStage(); });
  }).observe(t, { attributes: true, childList: true, subtree: true, characterData: true });
}
setTimeout(watchTalk, 0);

// ---------- overheard Japanese ----------
// Eric can't follow it: every character he doesn't know becomes a softened, shifting stand-in glyph, and
// the words he does know (his phrases and commands, plus the line's `clear` list) stay sharp and glossed.
// kana only: two stand-in glyphs side by side must never spell a real word (no kanji)
const POOL = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだでどばびぶべぼぱぴぷぺぽアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモラリルレロワン';
const INTERJ = ['えっと', 'あのう', 'あの', 'ああ', 'あっ', 'えっ', 'ええ', 'うん', 'おっ', 'うわ', 'わあ', 'まあ', 'ほら', 'はい', 'あー', 'えー', 'あ', 'え', 'お', 'ん'];
function heardHTML(text, clear = []) {
  // {id} words written into an overheard line are what the listener catches: shown sharp and glossed
  const marked = [];
  text = text.replace(/\{(\w+)\}/g, (_, id) => { if (WORDS[id]) { marked.push(id); seen.add(id); return WORDS[id].ja; } return id; });
  const keep = marked.map((id) => ({ ja: WORDS[id].ja, gl: `${WORDS[id].ro}, ${WORDS[id].en}`, known: true }));
  for (const id of new Set([...known, ...seen])) { const w = WORDS[id]; if (!w) continue; for (const ja of [w.ja, ...(w.alias || [])]) keep.push({ ja, gl: `${w.ro}, ${w.en}`, known: true }); }
  // `clear` entries are readable for this line only: plain text, not styled as known, never added to what he knows
  for (const c of clear || []) keep.push(typeof c === 'string' ? { ja: c } : { ja: c.ja, gl: [c.ro, c.en].filter(Boolean).join(', ') });
  keep.sort((a, b) => b.ja.length - a.ja.length);
  let out = '', i = 0;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const punct = /[\s、。！？!?…「」ー]/;
  while (i < text.length) {
    // interjections and sounds (あっ, えっ, うん...) are never hidden: only real words he doesn't know are
    if (i === 0 || punct.test(text[i - 1])) {
      const it = INTERJ.find((w) => text.startsWith(w, i) && (i + w.length === text.length || punct.test(text[i + w.length])));
      if (it) { out += `<span class="plain">${esc(it)}</span>${INTERJ_GLOSS[it] ? ` <span class="gl">(${esc(INTERJ_GLOSS[it])})</span>` : ''}`; i += it.length; continue; }
    }
    const k = keep.find((w) => text.startsWith(w.ja, i));
    if (k) { out += `<span class="${k.known ? 'jp clear' : 'plain'}">${esc(k.ja)}</span>${k.gl ? ` <span class="gl">(${esc(k.gl)})</span>` : ''}`; i += k.ja.length; continue; }
    const ch = text[i];
    if (/[\s、。！？!?…「」]/.test(ch)) out += esc(ch);
    else out += `<span class="gx" data-c="${esc(ch)}">${POOL[(ch.charCodeAt(0) * 7 + i) % POOL.length]}</span>`;
    i++;
  }
  return `<span class="heardico" aria-hidden="true"></span>${out}`;
}
let scrambleTimer = null;
function scramble(line) {
  clearInterval(scrambleTimer);
  let n = 0;
  scrambleTimer = setInterval(() => {
    if (!line.isConnected || !line.closest('#talk.heard')) { clearInterval(scrambleTimer); return; }
    const g = line.querySelectorAll('.gx'); if (!g.length) { clearInterval(scrambleTimer); return; }
    for (let k = 0; k < 3; k++) { const e = g[(n * 5 + k * 7) % g.length]; e.textContent = POOL[(Math.random() * POOL.length) | 0]; }
    n++;
  }, 140);
}

// ---------- text reveal (settings.textSpeed) ----------
// The line writes itself out a few characters at a time. Every character is a span that is already laid out
// (only its opacity changes), so the line never reflows as it appears. A tap shows the rest at once.
function reveal(line, cps) {
  const chars = [];
  const walk = (n) => {
    for (const c of [...n.childNodes]) {
      if (c.nodeType === 3) {
        const f = document.createDocumentFragment();
        for (const ch of c.textContent) { if (/\s/.test(ch)) { f.appendChild(document.createTextNode(ch)); continue; } const sp = document.createElement('span'); sp.className = 'rv'; sp.textContent = ch; f.appendChild(sp); chars.push(sp); }
        c.replaceWith(f);
      } else if (c.nodeType === 1 && c.tagName !== 'RT' && c.tagName !== 'svg') walk(c);
    }
  };
  walk(line);
  const r = { done: !chars.length, onDone: null };
  if (r.done) return r;
  line.classList.add('revealing');
  let i = 0, last = performance.now(), raf = 0;
  const finish = () => { cancelAnimationFrame(raf); for (; i < chars.length; i++) chars[i].classList.add('on'); line.classList.remove('revealing'); r.done = true; r.onDone && r.onDone(); };
  const tick = (now) => {
    if (!line.isConnected) return;
    if (paused) { last = now; raf = requestAnimationFrame(tick); return; }
    const n = Math.floor(((now - last) / 1000) * cps);
    if (n > 0) { last += (n / cps) * 1000; for (let k = 0; k < n && i < chars.length; k++, i++) chars[i].classList.add('on'); }
    if (i >= chars.length) finish(); else raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  // hidden tabs stall rAF: make sure a line is never stuck half-written
  setTimeout(() => { if (!r.done && line.isConnected) finish(); }, (chars.length / cps) * 1000 + 1500);
  r.finish = finish;
  return r;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// slow clips for taught words (<voice>-slow), if the voice agent made them
const slowClips = new Set();
fetch(new URL('../audio/index.json?v=' + (window.BUILD || ''), import.meta.url)).then((r) => (r.ok ? r.json() : [])).then((l) => l.forEach((k) => { if (/-slow$/.test(k)) slowClips.add(k); })).catch(() => {});
export function keyLabel(code) { return /^Key[A-Z]$/.test(code) ? code.slice(3) : /^Digit\d$/.test(code) ? code.slice(5) : code.replace(/^(Arrow)/, ''); }
async function whileUnpaused(ms) { await sleep(ms); while (paused) await sleep(200); }

// ---------- layout ----------
export const ui = {
  root: null,
  build() {
    const r = $('#ui');
    this.root = r;
    r.innerHTML = `
      <div id="marks"></div>
      <div id="top">
        <button id="goal" type="button" hidden aria-label="Current goal"><span class="ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 21V4"/><path d="M6 4.5h11l-2.5 4 2.5 4H6"/></svg></span><span class="t"></span><span class="hk" hidden aria-hidden="true">?</span></button>
        <div class="tr" id="hud">
          <div id="clock" class="hchip" hidden><span class="ic"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg></span><span class="d"></span><span class="p"></span></div>
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
      <div id="cmdsPanel" hidden><div class="card"><div class="head">Words you can say</div><p class="note">Use the Say button. It speaks to whoever or whatever is nearest.</p><ul></ul><button type="button" class="close">Close</button></div></div>
      <div id="peoplePanel" class="panel" hidden><div class="card"><div class="head">People</div><ul></ul><button type="button" class="close">Close</button></div></div>
      <div id="bagPanel" class="panel" hidden><div class="card"><div class="head">Bag</div><p class="yen"></p><ul></ul><button type="button" class="close">Close</button></div></div>
      <button id="giveBtn" type="button" hidden><span class="t">Give</span><span class="to"></span></button>
      <div id="actMenu" hidden role="group" aria-label="Actions"></div>
      <div id="talkHit" hidden aria-hidden="true"></div>
      <button id="sayBtn" type="button" hidden aria-label="Say a word"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7l-4 3.5V16H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/></svg><span class="t">Say</span><span class="key" aria-hidden="true">Q</span></button>
      <div id="sayTip" hidden><b>Say</b> speaks a word you know to whoever or whatever is nearest. Try it when you're stuck.<button type="button">Got it</button></div>
      <div id="sayMenu" hidden><div class="head"></div><div class="list"></div><button type="button" class="cancel">Never mind</button></div>
      <div id="hint" hidden role="status"><span class="hx"></span><button type="button" class="hclose" aria-label="Hide hint"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
      <div id="toast" hidden role="status"></div>
      <div id="caption" hidden><span class="nm"></span><span class="tx"></span></div>
      <div id="liftInd" hidden><span class="arrow">▲</span><span class="fl">1</span></div>
      <img id="xfade" alt="" hidden>
      <div id="fade"><div class="title"></div><div class="sub"></div></div>
      <div id="end" hidden></div>
    `;
    $('#cmdsBtn').onclick = () => this.showCmds();
    $('#cmdsPanel .close').onclick = () => { $('#cmdsPanel').hidden = true; };
    $('#sayBtn').onclick = (e) => { e.stopPropagation(); this.onSay && this.onSay(); };
    $('#giveBtn').onclick = (e) => { e.stopPropagation(); this.onGive && this.onGive(); };
    $('#peopleBtn').onclick = () => { $('#peoplePanel ul').innerHTML = this.peopleHTML ? this.peopleHTML() : ''; $('#peoplePanel').hidden = false; };
    $('#bagBtn').onclick = () => { $('#bagPanel').hidden = false; };
    for (const id of ['#peoplePanel', '#bagPanel']) $(id + ' .close').onclick = () => { $(id).hidden = true; };
    $('#sayMenu .cancel').onclick = () => { $('#sayMenu').hidden = true; this._sayRes && this._sayRes(null); };
    $('#muteBtn').onclick = (e) => { e.stopPropagation(); setMuted(!isMuted()); $('#muteBtn').classList.toggle('off', isMuted()); };
    // the hint stays until it's closed or the goal moves on; the goal chip brings it back
    $('#hint .hclose').onclick = (e) => { e.stopPropagation(); this.hideHint(); };
    $('#goal').onclick = (e) => { e.stopPropagation(); if (this._hintHTML) this.hint(this._hintHTML); else { const g = $('#goal'); g.classList.remove('pop'); void g.offsetWidth; g.classList.add('pop'); } };
    this.setSayKey(settings.keySay);
    onSettings((k, v) => { if (k === 'keySay') this.setSayKey(v); });
    // advancing the talk panel: tap anywhere on it, or Space/Enter
    // The whole screen moves the story on while a line is up (Jørgen: the tiny arrow was hard to hit). A tap on a
    // taught word plays it instead. While the story is busy (a walk, a door) a tap shows the wait marker instead of
    // doing nothing, and asks main.js to hurry the scripted move along (game.skip, if it has one).
    const tapTalk = (e) => {
      if (e.target.closest('.chip, .tp-in, button')) return;
      const w = e.target.closest('.jp[data-w]'); if (w) { e.stopPropagation(); e.preventDefault(); this.sayWord(w.dataset.w, w); return; }
      e.stopPropagation();
      if (this._advance) { this._advance(); return; }
      this.waitPulse(e.clientX, e.clientY);
    };
    $('#talk').addEventListener('pointerdown', tapTalk);
    $('#talkHit').addEventListener('pointerdown', tapTalk);
    setInterval(() => this.syncTalkState(), 80);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'Enter') { if (this._advance) { e.preventDefault(); this._advance(); } }
      if (this._chipKeys && /^Digit[1-9]$/.test(e.code)) { const b = this._chipKeys[+e.code.slice(5) - 1]; if (b) b.click(); }
      else if (this._sayKeys && /^Digit[1-9]$/.test(e.code)) { const b = this._sayKeys[+e.code.slice(5) - 1]; if (b) b.click(); }
      if (e.code === 'Escape' && !$('#sayMenu').hidden) $('#sayMenu .cancel').click();
    });
  },
  // The current goal, in the story's words, as a HUD chip that stays until the story changes it (Jørgen, playtest:
  // the goal must be unmistakable). A new goal clears the old hint. Tapping the chip shows the hint again.
  goal(text) {
    const g = $('#goal');
    const was = this.goalText || '';
    this.goalText = text || '';
    if (text !== was) { this._hintHTML = ''; this.hideHint(); }
    if (!text) { g.hidden = true; return; }
    g.hidden = false;
    g.querySelector('.t').innerHTML = lineHTML(text, { count: false });
    g.setAttribute('aria-label', 'Goal: ' + g.querySelector('.t').textContent);
    if (text !== was) { g.classList.remove('pop'); void g.offsetWidth; g.classList.add('pop'); }
  },
  setSayKey(code) { const k = $('#sayBtn .key'); if (k) k.textContent = keyLabel(code || 'KeyQ'); },
  refreshWords() {
    const b = $('#cmdsBtn');
    b.hidden = known.size === 0;
    b.querySelector('.n').textContent = known.size;
  },
  showCmds() {
    const row = (id) => { const w = WORDS[id]; return `<li class="wrow">${iconHTML(id)}<span class="cw"><span class="jp">${w.ja}</span><span class="rd">${w.ro} · ${w.en}</span></span></li>`; };
    const ph = PHRASES.filter((id) => known.has(id)), cm = COMMANDS.filter((id) => known.has(id));
    $('#cmdsPanel ul').innerHTML = (ph.length ? `<li class="sec">Phrases</li>${ph.map(row).join('')}` : '') + (cm.length ? `<li class="sec">Commands <span>(they make old machines listen)</span></li>${cm.map(row).join('')}` : '');
    $('#cmdsPanel').hidden = false;
  },
  // the Say menu: resolves with a command id or null
  sayMenu(targetName) {
    return new Promise((res) => {
      const m = $('#sayMenu');
      m.querySelector('.head').innerHTML = targetName ? `Say to <b>${targetName}</b>` : 'Say';
      const list = m.querySelector('.list'); list.innerHTML = '';
      let n = 0;
      for (const [title, ids] of [['Phrases', PHRASES], ['Commands', COMMANDS]]) {
        const have = ids.filter((id) => known.has(id)); if (!have.length) continue;
        list.appendChild(el('div', 'sec', title));
        for (const id of have) {
          const b = el('button', 'cmd' + (WORDS[id].phrase ? ' phrase' : ''), `<span class="k">${++n}</span>${cmdHTML(id)}`); b.type = 'button';
          b.onclick = (e) => { e.stopPropagation(); m.hidden = true; this._sayKeys = null; res(id); };
          list.appendChild(b);
        }
      }
      this._sayKeys = [...list.querySelectorAll('button.cmd')];
      this._sayRes = (v) => { this._sayKeys = null; res(v); };
      m.hidden = false;
    });
  },
  // the first time Eric knows a word: the Say button pulses and a short tip points at it
  introSay(text) {
    const b = $('#sayBtn'), tip = $('#sayTip');
    this.sayIntro = true;
    if (text) tip.firstChild.textContent !== undefined && (tip.innerHTML = `${lineHTML(text)}<button type="button">Got it</button>`);
    b.classList.add('pulse'); tip.hidden = false;
    const off = () => { tip.hidden = true; b.classList.remove('pulse'); this.sayIntro = false; };
    tip.querySelector('button').onclick = (e) => { e.stopPropagation(); off(); };
    b.addEventListener('click', off, { once: true });
  },
  sayReady(on) { $('#sayBtn').classList.toggle('ready', !!on); },
  setSayTarget() {},
  // the Say button sits beside whoever or whatever Eric can talk to, only when a word can be used there
  // The action menu (Jørgen's playtest: Talk and Say were separate popups that came and went on their own). One small
  // menu beside the current target: its verb on E (Talk, Look, Pet...) and Say on Q, stacked, both whenever both
  // apply; Next cycles through things in reach when several are close (menu.js). main.js calls this every frame
  // with where the Say target is and whether a word does something there.
  placeSay(x, y, show) {
    $('#sayBtn').hidden = true;
    const act = $('#actMenu'), g = window.__game; if (!act || !g) return;
    const blocked = !$('#sayMenu').hidden || !$('#cmdsPanel').hidden || [...document.querySelectorAll('.panel')].some((p) => !p.hidden) || document.body.classList.contains('busy') || document.body.classList.contains('trip') || this.talking;
    const near = g.near, st = g.sayTarget;
    const target = near || (show ? st : null);
    if (!target || blocked) { act.hidden = true; this._actKey = ''; return; }
    const phone = document.body.classList.contains('phone');
    const verb = target.el ? target.el.querySelector('.vb')?.textContent : '', name = target.label || '';
    const sayTo = show && st && st !== target ? st.label : '';
    const cyc = this.cycleInfo && this.cycleInfo.n > 1 ? this.cycleInfo : null;
    const key = [target.id, verb, name, show, sayTo, near ? 1 : 0, cyc ? cyc.i + '/' + cyc.n : '', phone, settings.keySay].join('|');
    if (key !== this._actKey) {
      this._actKey = key;
      const k = (c) => (phone ? '' : `<span class="k">${c}</span>`);
      act.innerHTML = (near ? `<button type="button" class="act use">${k('E')}<span class="vb">${verb || 'Look'}</span><span class="nm">${name}</span></button>` : '') +
        (show ? `<button type="button" class="act say">${k(keyLabel(settings.keySay || 'KeyQ'))}<span class="vb">Say</span><span class="nm">${sayTo ? 'to ' + sayTo : 'a word'}</span></button>` : '') +
        (cyc ? `<button type="button" class="act next">${k('Tab')}<span class="vb">Next</span><span class="nm">${cyc.i + 1} of ${cyc.n}</span></button>` : '');
      act.querySelector('.use')?.addEventListener('click', (e) => { e.stopPropagation(); g.use(g.near || target); });
      act.querySelector('.say')?.addEventListener('click', (e) => { e.stopPropagation(); this.onSay && this.onSay(); });
      act.querySelector('.next')?.addEventListener('click', (e) => { e.stopPropagation(); this.cycleInfo?.next(); });
    }
    act.hidden = false;
    // beside the target's pin (the marker's own position), kept on screen
    const m = target.el && target.el.style.transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
    let px = m ? +m[1] : x, py = m ? +m[2] : y;
    const sc = phone ? 1 : (+getComputedStyle(document.documentElement).getPropertyValue('--ui') || 1);
    const W = innerWidth, H = innerHeight, aw = (act.offsetWidth || 200) * sc, ah = (act.offsetHeight || 100) * sc;
    const flip = px + 34 + aw > W - 8;
    let ax = flip ? px - 34 - aw : px + 34, ay = py - 70 * sc;
    ax = Math.max(8, Math.min(W - aw - 8, ax)); ay = Math.max((phone ? 110 : 70) * sc, Math.min(H - ah - 12, ay));
    act.style.transform = `translate(${Math.round(ax)}px, ${Math.round(ay)}px) scale(${sc})`;
    act.classList.toggle('flip', flip);
  },
  // No text leaves on a timer (Jørgen: "completely inaccessible"). A hint stays until the player closes it or the
  // goal moves on (the ms argument is ignored); the goal chip shows it again.
  hint(html) {
    const h = $('#hint');
    if (!html) { this.hideHint(); return; }
    this._hintHTML = html;
    h.querySelector('.hx').innerHTML = html; h.hidden = false;
    h.classList.remove('in'); void h.offsetWidth; h.classList.add('in');
    $('#goal .hk').hidden = true;
  },
  hideHint() { const h = $('#hint'); if (h) h.hidden = true; const k = $('#goal .hk'); if (k) k.hidden = !this._hintHTML; },
  // A notice (a new word, something picked up) stays until the player's next action after it has been up a moment:
  // a tap, a click or a key anywhere. Nothing is swallowed; the action does what it would anyway.
  toast(html) {
    const t = $('#toast'); t.innerHTML = html; t.hidden = false; t.classList.remove('in'); void t.offsetWidth; t.classList.add('in');
    const id = (this._toastId = (this._toastId || 0) + 1);
    const arm = () => {
      const off = (e) => { if (e.type === 'keydown' && /^(Shift|Control|Alt|Meta)/.test(e.key)) return; removeEventListener('pointerdown', off, true); removeEventListener('keydown', off, true); if (this._toastId === id) t.hidden = true; };
      addEventListener('pointerdown', off, true); addEventListener('keydown', off, true);
    };
    if (this.auto) { t.hidden = true; return; }
    // armed after a beat, so the tap that made it appear doesn't also clear it
    new Promise((r) => setTimeout(r, 1200)).then(() => { if (this._toastId === id && !t.hidden) arm(); });
  },
  board(text, { voiceKey } = {}) {
    const b = $('#board');
    if (!text) { b.classList.remove('in'); setTimeout(() => { if (!b.classList.contains('in')) b.hidden = true; }, 400); return; }
    b.hidden = false; b.querySelector('.led').innerHTML = lineHTML(text);
    b.classList.remove('in'); void b.offsetWidth; b.classList.add('in');
    this.refreshWords();
    if (voiceKey) voice(voiceKey);
  },
  // Show a line and wait for a tap. speaker: {name, role, color} or null for narration.
  say(speaker, text, { voiceKey, auto, overheard, clear, whoId, face } = {}) {
    return new Promise((res) => {
      const t = $('#talk');
      showPortraits(t, speaker ? whoId : null, face);
      t.classList.toggle('heard', !!overheard);
      t.hidden = false; t.classList.toggle('narr', !speaker); t.classList.toggle('phone', !!(speaker && speaker.phone));
      const who = t.querySelector('.who');
      who.innerHTML = speaker ? `<span class="nm" style="--c:${speaker.color || '#8fa3c0'}">${speaker.name}</span>${speaker.role ? `<span class="rl">${speaker.role}</span>` : ''}` : '';
      const lineEl = t.querySelector('.line');
      lineEl.innerHTML = overheard ? heardHTML(text, clear) : lineHTML(text);
      t.querySelector('.chips').innerHTML = '';
      const more = t.querySelector('.more');
      more.hidden = false;
      t.classList.remove('in'); void t.offsetWidth; t.classList.add('in');
      this.refreshWords();
      if (overheard) scramble(lineEl);
      const spoken = voiceKey ? voice(voiceKey, { muffle: !!overheard }) : null;
      const started = performance.now();
      if (this.auto) { setTimeout(() => { this._advance = null; stopVoice(); res(); }, 15); return; }
      const cps = CPS[settings.textSpeed] || 0;
      const rv = !overheard && cps ? reveal(lineEl, cps) : { done: true };
      if (!rv.done) { more.hidden = true; rv.onDone = () => { more.hidden = false; }; }
      const adv = this._advance = () => {
        if (performance.now() - started < 250) return;
        if (!rv.done) { rv.finish(); return; }          // first tap finishes the line, the next one moves on
        this._advance = null; stopVoice(); sfx('tap'); res();
      };
      void auto;   // lines never move on by a timer of their own; only the player's auto-advance setting does that
      if (settings.autoAdvance) {
        // auto-advance: once the line is written out and the voice has finished (or a reading time has passed)
        const plain = lineEl.textContent.length;
        const revealed = new Promise((r) => { if (rv.done) r(); else { const o = rv.onDone; rv.onDone = () => { o && o(); r(); }; } });
        Promise.all([revealed, spoken && settings.voiceOn && !muted ? spoken.then(() => whileUnpaused(700)) : whileUnpaused(1300 + plain * 45)])
          .then(() => whileUnpaused(250))
          .then(() => { if (this._advance === adv && settings.autoAdvance) { this._advance = null; stopVoice(); res(); } });
      }
    });
  },
  // Show a line with reply chips; resolves with the chip index. chips: [{html}]
  choose(speaker, text, chips, { voiceKey, glow = -1, keepLine = false, whoId } = {}) {
    return new Promise((res) => {
      const t = $('#talk');
      if (!keepLine || whoId) showPortraits(t, speaker ? whoId : null);
      t.hidden = false; t.classList.toggle('narr', !speaker);
      const who = t.querySelector('.who');
      who.innerHTML = speaker ? `<span class="nm" style="--c:${speaker.color || '#8fa3c0'}">${speaker.name}</span>${speaker.role ? `<span class="rl">${speaker.role}</span>` : ''}` : '';
      if (!keepLine) t.querySelector('.line').innerHTML = text ? lineHTML(text) : '';
      t.querySelector('.more').hidden = true;
      const box = t.querySelector('.chips'); box.innerHTML = '';
      const shown = performance.now();   // a tap that revealed the chips must not also pick one
      const btns = chips.map((c, i) => {
        const b = el('button', 'chip' + (i === glow ? ' glow' : '') + (c.cls ? ' ' + c.cls : ''), `<span class="k">${i + 1}</span><span class="c">${c.html}</span>`);
        b.type = 'button';
        b.onclick = (e) => { e.stopPropagation(); if (performance.now() - shown < 350) return; this._chipKeys = null; box.querySelectorAll('.chip').forEach((x) => { x.disabled = true; }); b.classList.add('picked'); stopVoice(); res(i); };
        box.appendChild(b); return b;
      });
      this._chipKeys = btns;
      this._advance = null;
      if (this.auto) setTimeout(() => { const i = Math.min(btns.length - 1, this.autoPick ? this.autoPick(chips) : 0); box.querySelectorAll('.chip').forEach((x) => { x.disabled = true; }); this._chipKeys = null; stopVoice(); res(i); }, 15);
      t.classList.remove('in'); void t.offsetWidth; t.classList.add('in');
      this.refreshWords();
      if (voiceKey) voice(voiceKey);
    });
  },
  caption(sp, text) {
    const c = $('#caption');
    if (!text) { c.hidden = true; return; }
    c.hidden = false;
    c.querySelector('.nm').innerHTML = sp ? sp.name : '';
    c.querySelector('.nm').style.color = sp ? (sp.color || '') : '';
    c.querySelector('.tx').innerHTML = lineHTML(text);
    c.classList.remove('in'); void c.offsetWidth; c.classList.add('in');
  },
  lift(floor, dir) { const l = $('#liftInd'); if (floor == null) { l.hidden = true; return; } l.hidden = false; l.querySelector('.fl').textContent = floor; l.querySelector('.arrow').textContent = dir === 'down' ? '▼' : '▲'; },
  menuClosed() { return $('#sayMenu').hidden && $('#cmdsPanel').hidden && $('#peoplePanel').hidden && $('#bagPanel').hidden; },
  clock(date, period) { const c = $('#clock'); c.hidden = false; c.querySelector('.d').textContent = date; c.querySelector('.p').textContent = period; },
  refreshPeople(n) { const b = $('#peopleBtn'); b.hidden = !n; b.querySelector('.n').textContent = n; },
  refreshBag(sim) {
    const b = $('#bagBtn'); b.hidden = !sim.inv.length; b.querySelector('.n').textContent = sim.inv.length;
    $('#bagPanel .yen').textContent = `¥${sim.yen} left`;
    $('#bagPanel ul').innerHTML = sim.inv.map((i) => `<li>${(this.items && this.items[i] && this.items[i].name) || i}</li>`).join('');
  },
  setGiveTarget(name, on) { const g = $('#giveBtn'); g.hidden = !on; const t = g.querySelector('.to'); if (t.textContent !== (name || '')) t.textContent = name || ''; },
  // pick an item to give: resolves with the item id or null
  giveMenu(targetName, inv, items) {
    return new Promise((res) => {
      const m = $('#sayMenu');
      m.querySelector('.head').innerHTML = `Give to <b>${targetName}</b>`;
      const list = m.querySelector('.list'); list.innerHTML = '';
      [...new Set(inv)].forEach((id, i) => { const b = el('button', 'cmd', `<span class="k">${i + 1}</span><span class="en">${items[id] ? items[id].name : id}</span>`); b.type = 'button'; b.onclick = (e) => { e.stopPropagation(); m.hidden = true; this._sayKeys = null; res(id); }; list.appendChild(b); });
      this._sayKeys = [...list.children];
      this._sayRes = (v) => { this._sayKeys = null; res(v); };
      m.hidden = false;
    });
  },
  // Type the romaji of a word. Forgiving: case, spaces, hyphens and long vowels (ō = ou = oo = o) don't matter.
  // Each letter lights up as it's typed; a wrong try shows where it went off. Resolves when it's right.
  typePrompt(id, prompt) {
    return new Promise((res) => {
      const w = WORDS[id];
      const canon = (s) => s.toLowerCase().normalize('NFC').replace(/[āâ]/g, 'a').replace(/[īî]/g, 'i').replace(/[ūû]/g, 'u').replace(/[ēê]/g, 'e').replace(/[ōô]/g, 'o')
        .replace(/[^a-z]/g, '').replace(/ou/g, 'o').replace(/oo/g, 'o').replace(/uu/g, 'u').replace(/aa/g, 'a').replace(/ii/g, 'i');
      const target = canon(w.ro);
      // display tokens: each romaji letter of the word, with long vowels as one token
      const toks = []; for (const ch of w.ro) { if (/\s|-/.test(ch)) toks.push({ ch, sp: true }); else toks.push({ ch }); }
      const t = $('#talk'); t.hidden = false; t.classList.remove('narr', 'heard', 'phone'); t.classList.add('typing');
      t.querySelector('.who').innerHTML = '';
      t.querySelector('.line').innerHTML = (prompt ? `<div class="tp-prompt">${prompt.who ? `<span class="tp-who" style="color:${prompt.who.color || '#8fa3c0'}">${prompt.who.name}</span> ` : ''}${lineHTML(prompt.text)}</div>` : '') +
        `<div class="tp"><div class="tp-jp jp">${iconHTML(id, 'wi tp-ico')}${w.ja}</div><div class="tp-ro">${toks.map((k) => (k.sp ? '<span class="sp"> </span>' : `<span class="lt">${k.ch}</span>`)).join('')}</div><div class="tp-en">${w.en}</div>` +
        `<input class="tp-in" type="text" inputmode="latin" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Type it in romaji" aria-label="Type ${w.ro}"><div class="tp-hint"></div></div>`;
      t.querySelector('.chips').innerHTML = ''; t.querySelector('.more').hidden = true;
      t.classList.remove('in'); void t.offsetWidth; t.classList.add('in');
      this._advance = null; this._chipKeys = null;
      const inp = t.querySelector('.tp-in'), hint = t.querySelector('.tp-hint');
      const letters = [...t.querySelectorAll('.tp-ro .lt')];
      // which display letters each canonical position covers
      const map = []; { let c = ''; letters.forEach((el, i) => { const before = canon(c); c += el.textContent; const after = canon(c); for (let k = before.length; k < after.length; k++) map[k] = i; if (after.length === before.length) map[before.length - 1] = i; }); }
      let tries = 0;
      const paint = () => {
        const v = canon(inp.value); let ok = 0; while (ok < v.length && v[ok] === target[ok]) ok++;
        const lit = ok ? map[ok - 1] : -1;
        letters.forEach((el, i) => { el.classList.toggle('on', i <= lit); el.classList.toggle('bad', v.length > ok && i === (ok < target.length ? map[ok] : -1)); });
        return v === target;
      };
      const done = () => { t.classList.remove('typing'); stopVoice(); sfx('ok'); res(); };
      inp.addEventListener('input', () => { if (paint()) setTimeout(done, 250); });
      inp.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key !== 'Enter') return;
        if (paint()) { done(); return; }
        tries++; sfx('no');
        const v = canon(inp.value); let ok = 0; while (ok < v.length && v[ok] === target[ok]) ok++;
        const next = letters[map[Math.min(ok, target.length - 1)]];
        hint.innerHTML = tries < 3 ? `Close. Next letter: <b>${next ? next.textContent : ''}</b>. Follow the letters under the word.` : `Type it just as shown: <b>${w.ro}</b>`;
      });
      if (this.auto) { setTimeout(() => { inp.value = w.ro; paint(); done(); }, 20); return; }
      setTimeout(() => inp.focus(), 60);
    });
  },
  // play a taught word again (slowly if there's a slow clip), without moving the story on
  sayWord(id, el) {
    const w = WORDS[id]; if (!w || !w.voice) { sfx('tap'); return; }
    const slow = slowClips.has(w.voice + '-slow');
    voice(slow ? w.voice + '-slow' : w.voice, slow ? {} : { rate: 0.9 });
    if (el) { el.classList.remove('said'); void el.offsetWidth; el.classList.add('said'); }
  },
  // what the dialogue area shows: continue (with words for the first lines), waiting, or nothing; the tap layer
  syncTalkState() {
    const t = $('#talk'), hit = $('#talkHit'); if (!t || !hit) return;
    const busy = document.body.classList.contains('busy'), open = !t.hidden;
    const typing = t.classList.contains('typing'), choosing = !!t.querySelector('.chips .chip');
    const canGo = !!this._advance && open && !typing;
    t.classList.toggle('can-go', canGo);
    t.classList.toggle('waiting', open && !canGo && !typing && !choosing);
    // (only write what changed: #talk is watched by a MutationObserver, and even a same-value write is a mutation)
    const hide = !!(this.auto || !(open || busy) || typing || choosing); if (hit.hidden !== hide) hit.hidden = hide;
    hit.classList.toggle('go', canGo);
    if (canGo && this._shownLine !== t.querySelector('.line')?.textContent) { this._shownLine = t.querySelector('.line')?.textContent; this._lines = (this._lines || 0) + 1; }
    const phone = document.body.classList.contains('phone');
    const ch = t.querySelector('.more .ch');
    if (ch) { const tx = phone ? 'Tap to continue' : 'Click to continue', hd = (this._lines || 0) > 8; if (ch.textContent !== tx) ch.textContent = tx; if (ch.hidden !== hd) ch.hidden = hd; }
  },
  waitPulse(x, y) {
    const t = $('#talk');
    if (t && !t.hidden) { t.classList.remove('pulse'); void t.offsetWidth; t.classList.add('pulse'); }
    else {
      let d = $('#waitDot'); if (!d) { d = el('div', '', '<i></i><i></i><i></i>'); d.id = 'waitDot'; $('#ui').appendChild(d); }
      d.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`; d.classList.remove('on'); void d.offsetWidth; d.classList.add('on');
    }
    window.__game?.skip?.();
  },
  closeTalk() { const t = $('#talk'); t.hidden = true; $('#stage').hidden = true; lastNpc = null; this._advance = null; this._chipKeys = null; },
  get talking() { return !$('#talk').hidden; },
  fade(title, sub = '', hold = 1400) {
    const f = $('#fade');
    f.querySelector('.title').textContent = title || '';
    f.querySelector('.sub').innerHTML = sub || '';
    f.classList.add('on');
    return new Promise((res) => setTimeout(res, 650 + hold));
  },
  unfade() { $('#fade').classList.remove('on'); return new Promise((res) => setTimeout(res, 600)); },
  showEnd(html) { const e = $('#end'); e.innerHTML = html; e.hidden = false; requestAnimationFrame(() => e.classList.add('in')); },
};
