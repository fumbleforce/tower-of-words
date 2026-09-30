// Performance metrics: the F3 overlay (also Settings > Performance numbers) and the per-place recorder the fast test
// reads (window.__perfReport(), written to the fast run's perf.json; budgets in game3d/tools/perf/budgets.json).
//   import { installMetrics } from './perf/metrics.js';
//   installMetrics(game, () => quality);   // once, from main.js
//
// Cost: one requestAnimationFrame callback, and only while the overlay is on or the recorder runs (?test=, ?perf).
// Every frame it stores one frame time in a preallocated typed array. Draw calls and triangles are sampled every
// SAMPLE frames: the renderer's info counters are reset and held for exactly one frame (all passes: shadow, AO,
// outline, main), then read. No allocations per frame; the overlay text is rebuilt twice a second. A tool that
// samples renderer.info itself sets window.__perfHold = true first and restores autoReset = true when done.
// Lifetime: installed once for the page's life; the keydown and settings listeners are never removed. The loop
// stops itself when neither the overlay nor the recorder needs it.
import { settings, setSetting } from '../settings.js';

const SAMPLE = 10; // frames between draw-call samples
const WINDOW = 600; // frames in the overlay's rolling window (about 10 s at 60 fps)
const CAP = 40000; // frames recorded per place (a fast-test day is about 5,000 frames)
const TIERS = ['low', 'medium', 'high'];

// z-index 7: above the HUD and the title, under the loading chip and the menus (.layer, 30)
const CSS = `
#perfHud { position: fixed; right: 12px; top: 64px; z-index: 7; min-width: 196px; padding: 8px 10px; border-radius: 8px;
  background: rgba(16, 18, 23, .82); border: 1px solid rgba(255, 255, 255, .08); color: #eef0f4; pointer-events: none;
  font: 500 12px/1.5 ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; font-variant-numeric: tabular-nums;
  white-space: pre; }
#perfHud[hidden] { display: none; }
#perfHud b { color: #6fd0c6; font-weight: 700; }
#perfHud i { font-style: normal; color: #a9b1bf; }
#perfHud .over { color: #f08a7e; }
body.phone #perfHud { top: 88px; right: 8px; min-width: 0; font-size: 11px; padding: 6px 8px; }
body.at-title #perfHud { top: 12px; }
`;

// one place's recording: frame times every frame, draw calls and triangles every SAMPLE frames
function placeRec() {
  return {
    ft: new Float32Array(CAP),
    n: 0,
    calls: new Float32Array(CAP / SAMPLE),
    tris: new Float32Array(CAP / SAMPLE),
    m: 0,
    worst: 0,
    visits: 0,
    since: 0, // when this visit to the place began (ms)
    // the busiest sampled frame: its calls, ms into its visit, which visit, Eric's x and z, and whether a trip
    // (walk out, crossfade) was on screen, so a peak can be told from a transition
    peak: { calls: 0, ms: 0, visit: 0, x: 0, z: 0, trip: false },
  };
}

// q-quantile of the first n values of a (sorted copy; for reports, not per frame)
function quantile(a, n, q) {
  if (!n) return 0;
  const s = a.slice(0, n).sort();
  return s[Math.min(n - 1, Math.floor(q * n))];
}
const round1 = (x) => Math.round(x * 10) / 10;

export function installMetrics(game, qualityNow = () => null) {
  const renderer = game.renderer;
  const info = renderer.info;
  const params = new URLSearchParams(location.search);
  const recording = params.has('test') || params.has('perf');
  const recs = Object.create(null);

  // overlay state: a ring of recent frame times and a scratch copy to sort
  const ring = new Float32Array(WINDOW);
  const scratch = new Float32Array(WINDOW);
  let ringAt = 0,
    ringN = 0;
  let calls = 0,
    tris = 0;

  let lastPlace = null;
  let last = 0,
    frame = 0,
    armed = false,
    running = false,
    el = null;

  function overlayOn() {
    return !!settings.perfOverlay;
  }

  function tick(now) {
    if (!overlayOn() && !recording) {
      running = false;
      if (armed) info.autoReset = true;
      armed = false;
      if (el) el.hidden = true;
      return;
    }
    requestAnimationFrame(tick);
    const dt = last ? now - last : 0;
    last = now;
    frame++;
    // a hidden tab stops frames; that gap is not a frame
    const real = dt > 0 && dt < 5000;
    const name = game.place && game.place.name;
    let rec = null;
    if (recording && name) rec = recs[name] || (recs[name] = placeRec());
    if (rec && game.place !== lastPlace) {
      lastPlace = game.place;
      rec.visits++;
      rec.since = now;
    }
    if (real) {
      ring[ringAt] = dt;
      ringAt = (ringAt + 1) % WINDOW;
      if (ringN < WINDOW) ringN++;
      if (rec && rec.n < CAP) {
        rec.ft[rec.n++] = dt;
        if (dt > rec.worst) rec.worst = dt;
      }
    }
    // draw calls: counters were reset one frame ago and held; what they hold now is exactly one frame.
    // window.__perfHold: a tool is sampling renderer.info itself (tools/perf/ab.mjs); leave the counters alone.
    // A tool that toggles autoReset on its own (autoReset already off) is left alone too.
    if (window.__perfHold) armed = false;
    else if (armed) {
      armed = false;
      info.autoReset = true;
      if (info.render.calls > 0) {
        calls = info.render.calls;
        tris = info.render.triangles;
        if (rec && rec.m < rec.calls.length) {
          rec.calls[rec.m] = calls;
          rec.tris[rec.m++] = tris;
          if (calls > rec.peak.calls) {
            const pk = rec.peak,
              e = game.player && game.player.root.position;
            pk.calls = calls;
            pk.ms = Math.round(now - rec.since);
            pk.visit = rec.visits;
            pk.x = e ? round1(e.x) : 0;
            pk.z = e ? round1(e.z) : 0;
            pk.trip = document.body.classList.contains('trip');
          }
        }
      }
    } else if (frame % SAMPLE === 0 && info.autoReset) {
      info.autoReset = false;
      info.reset();
      armed = true;
    }
    if (el && !el.hidden && frame % 30 === 0) draw();
  }

  function start() {
    if (running) return;
    running = true;
    last = 0;
    requestAnimationFrame(tick);
  }

  function build() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    el = document.createElement('div');
    el.id = 'perfHud';
    el.setAttribute('aria-hidden', 'true');
    el.hidden = true;
    document.body.appendChild(el);
  }

  function draw() {
    let sum = 0;
    for (let i = 0; i < ringN; i++) sum += scratch[i] = ring[i];
    const avg = ringN ? sum / ringN : 0;
    // 1% low: the frame rate of the slowest 1% of recent frames
    const sorted = scratch.subarray(0, ringN).sort();
    const p99 = ringN ? sorted[Math.min(ringN - 1, Math.floor(0.99 * ringN))] : 0;
    const fps = avg ? 1000 / avg : 0;
    const low = p99 ? 1000 / p99 : 0;
    const mem = info.memory;
    const heap = performance.memory ? (performance.memory.usedJSHeapSize / 1048576).toFixed(0) + ' MB' : 'n/a';
    const q = qualityNow();
    const place = (game.place && game.place.name) || '-';
    const gl = renderer.userData && renderer.userData.software ? 'software GL' : 'GPU';
    el.innerHTML =
      `<b>${fps.toFixed(0).padStart(3)}</b> fps  <i>avg</i> ${avg.toFixed(1)} ms\n` +
      `<i>1% low</i> <span class="${low && low < 30 ? 'over' : ''}">${low.toFixed(0)} fps</span> (${p99.toFixed(1)} ms)\n` +
      `<i>calls</i>  ${calls.toLocaleString('en')}\n` +
      `<i>tris</i>   ${tris.toLocaleString('en')}\n` +
      `<i>geo</i> ${mem.geometries}  <i>tex</i> ${mem.textures}\n` +
      `<i>heap</i>   ${heap}\n` +
      `<i>place</i>  ${place}\n` +
      `<i>tier</i>   ${q == null ? '-' : TIERS[q] || q}  <i>${gl}</i>`;
  }

  function show() {
    if (!el) build();
    el.hidden = !overlayOn();
    if (!el.hidden) {
      ringN = 0;
      ringAt = 0;
      el.textContent = 'measuring…';
      start();
    }
  }

  // F3 toggles the same setting as the switch in Settings, so the choice is kept
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'F3' || e.repeat) return;
    e.preventDefault();
    setSetting('perfOverlay', !settings.perfOverlay);
  });
  window.addEventListener('amakawa:settings', (e) => {
    if (e.detail && e.detail.key === 'perfOverlay') show();
  });

  // the fast test's numbers: per place, frame times (median, 1% low, worst), draw calls and triangles (median, max)
  window.__perfReport = () => {
    const places = {};
    for (const [name, r] of Object.entries(recs)) {
      places[name] = {
        frames: r.n,
        medianMs: round1(quantile(r.ft, r.n, 0.5)),
        p99Ms: round1(quantile(r.ft, r.n, 0.99)),
        worstMs: round1(r.worst),
        samples: r.m,
        calls: Math.round(quantile(r.calls, r.m, 0.5)),
        callsMax: Math.round(quantile(r.calls, r.m, 1)),
        callsMaxAt: { ...r.peak },
        tris: Math.round(quantile(r.tris, r.m, 0.5)),
        trisMax: Math.round(quantile(r.tris, r.m, 1)),
      };
    }
    return {
      layout: document.body.classList.contains('phone') ? 'phone' : 'desktop',
      viewport: [innerWidth, innerHeight],
      gl: renderer.userData && renderer.userData.software ? 'software' : 'gpu',
      gpu: (renderer.userData && renderer.userData.gpu) || '',
      quality: qualityNow(),
      sampleEvery: SAMPLE,
      places,
    };
  };

  if (recording) start();
  if (overlayOn()) show();
}
