// Keeps the 3D view alive on phones (Jørgen, S23 Chrome, 2026-10-02: "After first gaijin scene with mio screen turns
// grey, cant see the people anymore", and "I needed to save and load to get past the grey screens"). The grey was the
// page behind an empty canvas: the game ran on, but nothing was drawn, which is what a lost WebGL context looks like.
// A phone's browser takes the context away when GPU memory runs short and may or may not give it back; three.js asks
// for it back and rebuilds what it owns when it returns. This adds what the player needs around that:
//   - a short note while the view is gone ("The graphics stopped...")
//   - if the context isn't back within WAIT_MS, or the view stays empty after it came back, the game does what his
//     save and load did: it saves and reloads into that save (the title's Continue, menu.js), one tier lighter for
//     the rest of the session, so the next try needs less GPU memory
//   - a resize never sets a zero or invalid size, and the window's resize events are handled once a frame
//   - the frame loop survives an error in one frame
// Back from another app (Jørgen, S23 Chrome, 2026-10-05: "got black screen again on mobile in elevator as i switched
// between apps"): the page background again and no note, so the context was gone but the lost event never reached the
// guard (a frozen tab can miss it), and the sampled pixel was skipped while the context reported lost. Now a context
// found lost without the event counts as lost; coming back to the page (visibilitychange, pageshow, resume) checks
// the context, gives the canvas a fresh drawing buffer and samples the next frames at once; and a sample reads five
// pixels, where all five fully transparent, or all the same pure black, is a dead view (the lift's dark ride is
// #14171d round the lit car, never pure black).
//   import { installGlGuard, lighterAfterLoss, onResizeFrame, validSize, guardedLoop, disposePost } from './perf/gl-guard.js'
const WAIT_MS = 3000;
const CHECK_MS = 2000; // how often a drawn frame is sampled (one pixel, read right after the frame)
const BLANK_CHECKS = 3; // empty samples in a row that count as a dead view
const LOST_KEY = 'amakawa-gl-lost'; // sessionStorage: how many times this tab lost the view
const CONTINUE_FLAG = 'amakawa-continue'; // menu.js: a reload with this set continues straight into the save

const session = {
  get: (k) => {
    try {
      return sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k, v) => {
    try {
      sessionStorage.setItem(k, v);
    } catch {
      /* storage off */
    }
  },
};

// the quality tier to use: one lower for each time this tab already lost the view (never below low)
export const lighterAfterLoss = (tier) => Math.max(0, tier - (+session.get(LOST_KEY) || 0));

export const validSize = (w, h) => Number.isFinite(w) && Number.isFinite(h) && w >= 1 && h >= 1;

// fn runs at most once a frame, after the last of a burst of resize events
export function onResizeFrame(fn) {
  let queued = false;
  window.addEventListener('resize', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      fn();
    });
  });
}

// a requestAnimationFrame loop that keeps running: each distinct error is rethrown once, outside the frame, so it
// still shows as a page error (the fast test fails on it) without stopping the game
export function guardedLoop(tick) {
  const seen = new Set();
  return function frame() {
    requestAnimationFrame(frame);
    try {
      tick();
    } catch (e) {
      const key = String(e && e.message);
      if (seen.has(key)) return;
      seen.add(key);
      setTimeout(() => {
        throw e;
      });
    }
  };
}

// a place's post chain when the next place takes over: its full-screen targets and materials go, except the passes
// in keep (a place's own pass, which stays with the place for its next visit)
export function disposePost(composer, keep = []) {
  if (!composer) return;
  for (const p of composer.passes) if (!keep.includes(p)) p.dispose?.();
  composer.dispose();
}

// where a sample reads the frame: the middle and four points round it
const SPOTS = [
  [0.5, 0.5],
  [0.25, 0.25],
  [0.75, 0.25],
  [0.25, 0.75],
  [0.75, 0.75],
];

// resize: sets the canvas and the post chain to the window's size (perf/view.js)
export function installGlGuard({ canvas, renderer, save, resize = () => {} }) {
  let note = null,
    timer = 0,
    gone = false,
    lost = false, // lost and not given back yet
    nextCheck = performance.now() + CHECK_MS,
    blank = 0;
  const px = new Uint8Array(4);
  const say = (text) => {
    if (!note) {
      note = document.createElement('div');
      note.className = 'gl-lost';
      note.setAttribute('role', 'status');
      // inline: a rare screen, kept out of the stylesheet
      note.style.cssText =
        'position:fixed;left:50%;top:40%;transform:translate(-50%,-50%);z-index:60;max-width:80vw;padding:12px 18px;' +
        'border-radius:12px;background:#151a22;border:1px solid rgba(255,255,255,.13);color:#e6eef0;' +
        'font:500 15px/1.4 var(--font, sans-serif);text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.45)';
      document.body.appendChild(note);
    }
    note.textContent = text;
  };
  const reload = () => {
    if (gone) return;
    gone = true;
    try {
      save();
    } catch (err) {
      console.warn('save before the reload failed', err);
    }
    session.set(LOST_KEY, String((+session.get(LOST_KEY) || 0) + 1));
    session.set(CONTINUE_FLAG, '1');
    say('The graphics stopped. Reloading from where you are...');
    document.body.classList.add('reloading');
    setTimeout(() => location.reload(), 250);
  };
  // lost (the event, or the context found lost without it): a note, and WAIT_MS for the browser to give it back
  const onLost = () => {
    if (lost || gone) return;
    lost = true;
    say('The graphics stopped. Starting them again...');
    clearTimeout(timer);
    timer = setTimeout(reload, WAIT_MS);
  };
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault(); // without this the browser never gives the context back
    console.warn('WebGL context lost');
    onLost();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    console.warn('WebGL context restored');
    lost = false;
    clearTimeout(timer);
    note?.remove();
    note = null;
    nextCheck = 0; // check the next frames right away
    blank = 0;
  });
  // back on the page: the context checked, a fresh drawing buffer at the window's size, the next frames sampled
  let backTimer = 0;
  const back = () => {
    if (document.hidden || gone) return;
    nextCheck = 0;
    blank = 0;
    clearTimeout(backTimer);
    backTimer = setTimeout(() => {
      if (document.hidden || gone) return;
      if (renderer.getContext().isContextLost()) {
        console.warn('WebGL context lost while away');
        onLost();
        return;
      }
      if (lost) return;
      // the same size again still gives the canvas a new drawing buffer (a phone can leave the old one undrawable)
      canvas.width = +canvas.width;
      resize();
      nextCheck = 0;
    }, 300);
  };
  document.addEventListener('visibilitychange', back);
  window.addEventListener('pageshow', back);
  document.addEventListener('resume', back);
  // the frame just drawn shows nothing: all five pixels fully transparent, or all the same pure black
  const dead = (gl) => {
    let clear = 0,
      black = 0,
      first = -1;
    for (const [fx, fy] of SPOTS) {
      const x = Math.floor(gl.drawingBufferWidth * fx),
        y = Math.floor(gl.drawingBufferHeight * fy);
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      if (px[3] === 0) clear++;
      const v = px[0] | (px[1] << 8) | (px[2] << 16);
      if (first < 0) first = v;
      if (v === first && Math.max(px[0], px[1], px[2]) <= 6) black++;
    }
    return clear === SPOTS.length || black === SPOTS.length;
  };
  return {
    // after each drawn frame: now and then read a few pixels of what was just drawn (still readable in this task)
    afterRender() {
      const now = performance.now();
      if (gone || now < nextCheck) return;
      nextCheck = now + (blank ? 100 : CHECK_MS);
      const gl = renderer.getContext();
      if (gl.isContextLost()) {
        onLost(); // with or without the lost event
        return;
      }
      if (lost) return; // the browser hasn't given it back yet
      renderer.setRenderTarget(null);
      blank = dead(gl) ? blank + 1 : 0;
      if (blank >= BLANK_CHECKS) {
        console.warn('the 3D view draws nothing');
        reload();
      }
    },
  };
}
