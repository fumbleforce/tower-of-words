// The opening player. Every frame is a pure function of the song time T, so the live page, the scrubber
// (?t=, ?debug) and the frame-exact video export (game3d/tools/opening-render.mjs, through window.OP.frame) show the
// same picture. The music is the clock while it plays.
//   opening/index.html            plays after a tap (browsers need one for sound); Esc/Skip ends it
//   ?t=41.2&still                 one frame at 41.2 s, no sound (for checks)
//   ?debug                        time, bar and shot id in the corner; Space pauses, arrow keys scrub (Shift: finer)
//   ?embed                        inside the game: posts {opening: 'done'} to the parent when it ends or is skipped
//   ?gate                         with ?embed: waits for its Play button (the game's first visit, before any tap)
import * as THREE from 'three';
import { makeCompositor } from './compositor.js';
import { buildStage } from './stage.js';
import { loadPortraits, loadOptional, W, H, clamp } from './paint.js';
import { CAST } from './cast.js';
import { END, beat, BEAT } from './timeline.js';
import { SHOTS } from './shots/index.js';
import { ANIME_ON } from './island.js';
import { drawLyrics } from './subtitles.js';

const qs = new URLSearchParams(location.search);
const STILL = qs.has('still') || qs.has('capture');
const DEBUG = qs.has('debug');
const EMBED = qs.has('embed');
if (qs.has('gate')) document.body.classList.add('gate');
let lyricsOn = qs.get('lyrics') !== '0';
try {
  if (!qs.has('lyrics') && localStorage.getItem('opening.lyrics') === '0') lyricsOn = false;
} catch (e) {
  /* storage blocked: lyrics stay on */
}

const canvas = document.getElementById('op');
const phone = Math.min(innerWidth, innerHeight) < 600 || /Android|iPhone/i.test(navigator.userAgent);
const rtW = qs.has('w') ? +qs.get('w') : phone ? 1280 : 1920;
const rtH = Math.round((rtW * 9) / 16);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: qs.has('capture'), powerPreference: 'high-performance', logarithmicDepthBuffer: true });
renderer.setPixelRatio(1);
renderer.autoClear = false;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // the compositor writes sRGB itself
renderer.toneMapping = THREE.NoToneMapping;

function fit() {
  // 16:9 inside the window, letterboxed
  const vw = innerWidth,
    vh = innerHeight;
  const s = Math.min(vw / 16, vh / 9);
  const w = Math.floor(16 * s),
    h = Math.floor(9 * s);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  renderer.setSize(qs.has('capture') ? rtW : Math.min(rtW, Math.round(w * devicePixelRatio)), qs.has('capture') ? rtH : Math.min(rtH, Math.round(h * devicePixelRatio)), false);
}
fit();
addEventListener('resize', fit);

const comp = makeCompositor(renderer, rtW, rtH);

async function loadFonts() {
  const f = [
    ['OP Dela', '../fonts/op-dela.woff2'],
    ['OP Barlow XB', '../fonts/op-barlow-xb.woff2'],
    ['OP Barlow SB', '../fonts/op-barlow-sb.woff2'],
    ['Zen Kaku Gothic New', '../fonts/zkg-bold.woff2', { weight: '700' }],
    ['OP Sub', '../fonts/op-zkg-sub.woff2', { weight: '700' }],
    ['OP Sub', '../fonts/op-zkg-black.woff2', { weight: '900' }],
    ['Zen Kaku Gothic New', '../fonts/zkg-medium.woff2', { weight: '500' }],
  ];
  await Promise.all(
    f.map(async ([name, url, desc]) => {
      try {
        const ff = new globalThis.FontFace(name, `url(${new URL(url, import.meta.url).href})`, desc);
        document.fonts.add(await ff.load());
      } catch (e) {
        console.warn('font', name, e);
      }
    }),
  );
}

let stage = null,
  shots = [];
// the loading screen (index.html #load): a bar and a line saying what is being built. Building the island takes a
// while and holds the page, so every step lets it paint first
const loadUI = { box: document.getElementById('load'), bar: document.getElementById('load-bar'), say: document.getElementById('load-say') };
const paint = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
function progress(f, label) {
  if (!loadUI.box) return;
  loadUI.bar.style.transform = `scaleX(${clamp(f, 0, 1).toFixed(3)})`;
  if (label) loadUI.say.textContent = label;
}
const ready = (async () => {
  progress(0.01, 'Loading the cast');
  await Promise.all([
    loadFonts(),
    loadPortraits(CAST.portraits()),
    loadOptional({ copyroom: 'copyroom.webp', 'win-eric': 'window/eric-window.webp', 'win-mio-phone': 'window/mio-window-phone.webp', 'win-mio-look': 'window/mio-window-look.webp' }),
  ]);
  await paint();
  stage = await buildStage(renderer, (f, label) => progress(0.05 + f * 0.8, label));
  progress(0.86, 'Seating the passengers');
  await paint();
  shots = SHOTS.map((s) => ({ ...s }));
  for (const s of shots) await s.setup?.(stage);
  progress(0.93, 'Warming up');
  await paint();
  // compile every shader up front so the first play doesn't hitch
  renderer.compile(stage.scene, stage.camera);
  progress(1, 'Ready');
})();

// ---------- which shots are live at T ----------
// A shot owns [t0, t1). The next shot's `in` transition runs across its start: `d` seconds long, `at` of it
// before the cut (at = 1: finishes on the cut, 0.5: centred on it, 0: starts on it).
function live(T) {
  let i = shots.findIndex((s) => T >= s.t[0] && T < s.t[1]);
  if (i < 0) i = T < shots[0].t[0] ? 0 : shots.length - 1;
  const cur = shots[i];
  // an incoming transition into the next shot that has started already
  const nx = shots[i + 1];
  if (nx?.in && nx.in.type !== 'cut') {
    const d = nx.in.d ?? 0.4,
      at = nx.in.at ?? 0.5;
    const a = nx.t[0] - d * at;
    if (T >= a) return { A: cur, B: nx, p: clamp((T - a) / d), tr: nx.in };
  }
  // the transition into this shot that is still finishing
  if (cur.in && cur.in.type !== 'cut' && i > 0) {
    const d = cur.in.d ?? 0.4,
      at = cur.in.at ?? 0.5;
    const b = cur.t[0] + d * (1 - at);
    if (T < b) return { A: shots[i - 1], B: cur, p: clamp((T - (cur.t[0] - d * at)) / d), tr: cur.in };
  }
  return { A: cur, B: null, p: 0, tr: { type: 'cut' } };
}

// draw one shot into compositor slot `which`
function renderShot(shot, which, T) {
  const lt = T - shot.t[0];
  const slot = comp.slots[which];
  const has3 = !!shot.scene3d;
  if (has3) {
    stage.reset();
    shot.scene3d(stage, lt, T);
    stage.render(T, slot.rt);
  }
  const has2 = !!shot.draw;
  if (has2) {
    const g = slot.c2.g;
    // a clean context for every shot: a clip or save another shot's drawing left behind would make clearRect clear
    // only part of the canvas, and the last shot would show through (the ID card over the station)
    if (g.reset) g.reset();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, rtW, rtH);
    g.setTransform(rtW / W, 0, 0, rtH / H, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    shot.draw(g, lt, T, stage);
  }
  // the sun's lens flare, when the shot asks for one and the sun is in front of the camera: [u, v, strength]
  let flare = null;
  if (has3 && shot.flare) {
    const a = shot.flare(lt, T);
    const sp = stage.sunOnScreen();
    if (a > 0 && sp) flare = [sp[0], sp[1], a];
  }
  comp.bind(which, { has3, has2, bloom: shot.bloom, exposure: shot.exposure, flare, far: stage.camera.far, ink: ANIME_ON ? (shot.ink ?? 1) : 0 });
}

function frame(T) {
  if (!stage) return;
  const L = live(T);
  renderShot(L.A, 0, T);
  if (L.B) renderShot(L.B, 1, T);
  else comp.bind(1, { has3: false, has2: false });
  // post effects: the live shots' own, plus the fade in at the start and out at the end
  const fx = { flash: 0, chroma: 0, zoom: 1, shake: [0, 0], fade: 0 };
  for (const s of [L.A, L.B]) {
    if (!s?.fx) continue;
    const f = s.fx(T - s.t[0], T);
    if (!f) continue;
    fx.flash = Math.max(fx.flash, f.flash || 0);
    if (f.flashColor) fx.flashColor = f.flashColor;
    fx.chroma = Math.max(fx.chroma, f.chroma || 0);
    fx.zoom *= f.zoom || 1;
    if (f.shake) fx.shake = [fx.shake[0] + f.shake[0], fx.shake[1] + f.shake[1]];
    if (f.grain !== undefined) fx.grain = f.grain;
    if (f.vignette !== undefined) fx.vignette = f.vignette;
    fx.fade = Math.max(fx.fade, f.fade || 0);
  }
  fx.fade = Math.max(fx.fade, 1 - clamp(T / 0.9), clamp((T - (END - 2.6)) / 2.6) ** 1.4);
  // the lyrics on the overlay
  let lyr = false;
  if (lyricsOn) {
    const og = comp.overlay.g;
    og.setTransform(1, 0, 0, 1, 0, 0);
    og.clearRect(0, 0, rtW, rtH);
    og.setTransform(rtW / W, 0, 0, rtH / H, 0, 0);
    lyr = drawLyrics(og, T);
  }
  comp.bindOverlay(lyr);
  const p = L.tr.type === 'cut' ? 0 : L.p;
  comp.draw(T, { type: L.tr.type, p, param: L.tr.param, band: L.tr.band }, fx);
  if (DEBUG) debugLine(T, L);
}

// ---------- debug ----------
const dbg = DEBUG ? document.body.appendChild(Object.assign(document.createElement('div'), { id: 'dbg' })) : null;
function debugLine(T, L) {
  const b = (T - beat(0)) / BEAT;
  dbg.textContent = `${T.toFixed(2)}s  bar ${Math.floor(b / 4)}.${Math.floor(b % 4) + 1}  ${L.A.id}${L.B ? ' > ' + L.B.id + ' ' + L.p.toFixed(2) : ''}`;
}

// ---------- playback ----------
const audio = new Audio(new URL('../audio/music/opening.mp3', import.meta.url).href);
audio.preload = 'auto';
let playing = false,
  t0wall = 0,
  tOffset = +(qs.get('t') || 0);
let lastAudio = -1,
  lastAudioWall = 0;
// the song's time: the audio clock, smoothed between its coarse updates
function now() {
  if (!playing) return tOffset;
  const a = audio.currentTime;
  const w = performance.now() / 1000;
  if (a !== lastAudio) {
    lastAudio = a;
    lastAudioWall = w;
  }
  if (audio.paused || audio.ended) return a;
  return a + Math.min(0.12, w - lastAudioWall);
}

let ended = false;
function finish() {
  if (ended) return;
  ended = true;
  playing = false;
  audio.pause();
  document.body.classList.add('done');
  if (EMBED) window.parent.postMessage({ opening: 'done' }, '*');
}

function loop() {
  if (ended) return;
  const T = now();
  frame(T);
  if (playing && (T >= END || audio.ended)) finish();
  requestAnimationFrame(loop);
}

const ui = {
  start: document.getElementById('start'),
  skip: document.getElementById('skip'),
  lyrics: document.getElementById('lyrics'),
};
function showLyricsState() {
  ui.lyrics.setAttribute('aria-pressed', String(lyricsOn));
  ui.lyrics.textContent = lyricsOn ? 'Lyrics on' : 'Lyrics off';
}
showLyricsState();
ui.lyrics.addEventListener('click', () => {
  lyricsOn = !lyricsOn;
  try {
    localStorage.setItem('opening.lyrics', lyricsOn ? '1' : '0');
  } catch (e) {
    /* storage blocked: the choice lasts this visit */
  }
  showLyricsState();
  if (!playing) frame(tOffset);
});
async function play() {
  await ready;
  if (ended) return; // skipped while it was loading
  ui.start.hidden = true;
  document.body.classList.add('playing');
  audio.currentTime = tOffset;
  try {
    await audio.play();
  } catch (e) {
    console.warn('audio', e);
    // no sound allowed: run on the wall clock
  }
  if (ended) {
    // skipped while the sound was starting
    audio.pause();
    return;
  }
  playing = true;
  t0wall = performance.now();
  if (audio.paused) {
    // fall back to a wall clock if the browser refused the sound
    const base = tOffset;
    audio.__fallback = true;
    Object.defineProperty(audio, 'currentTime', { get: () => base + (performance.now() - t0wall) / 1000, configurable: true });
  }
}

window.OP = {
  ready,
  get stage() {
    return stage;
  },
  duration: END,
  // render one frame at T (s) and resolve when it is on the canvas
  frame: async (T) => {
    await ready;
    frame(T);
    return true;
  },
};

if (STILL) {
  ready.then(() => {
    frame(tOffset);
    document.body.classList.add('still');
  });
} else {
  ready.then(() => {
    document.body.classList.add('loaded');
    ui.start.disabled = false;
    ui.start.classList.add('ready');
    frame(tOffset);
    requestAnimationFrame(loop);
  });
  ui.start.addEventListener('click', play);
  ui.skip.addEventListener('click', finish);
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') finish();
    else if ((e.key === 'Enter' || e.key === ' ') && !playing && !ended) play();
    else if (DEBUG && e.key === ' ' && playing) {
      // pause and go on, to look at a moment closely
      if (audio.paused) audio.play().catch(() => {});
      else audio.pause();
      e.preventDefault();
    }
    else if (DEBUG && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      const d = (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? BEAT / 4 : BEAT);
      if (playing) audio.currentTime = clamp(audio.currentTime + d, 0, END);
      else tOffset = clamp(tOffset + d, 0, END);
    }
  });
  // inside the game the opening starts at once, unless it waits for its Play button (the first visit, ?gate)
  if ((EMBED && !qs.has('gate')) || qs.has('autoplay')) play();
}
