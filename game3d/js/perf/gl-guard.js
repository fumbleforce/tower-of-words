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

export function installGlGuard({ canvas, renderer, save }) {
  let note = null,
    timer = 0,
    gone = false,
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
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault(); // without this the browser never gives the context back
    console.warn('WebGL context lost');
    say('The graphics stopped. Starting them again...');
    clearTimeout(timer);
    timer = setTimeout(reload, WAIT_MS);
  });
  canvas.addEventListener('webglcontextrestored', () => {
    console.warn('WebGL context restored');
    clearTimeout(timer);
    note?.remove();
    note = null;
    nextCheck = 0; // check the next frames right away
    blank = 0;
  });
  return {
    // after each drawn frame: now and then read one pixel of what was just drawn (still readable in this task). The
    // game draws every pixel opaque, so alpha 0 means nothing reached the canvas.
    afterRender() {
      const now = performance.now();
      if (gone || now < nextCheck) return;
      nextCheck = now + (blank ? 100 : CHECK_MS);
      const gl = renderer.getContext();
      if (gl.isContextLost()) return; // the lost handler is on it
      renderer.setRenderTarget(null);
      gl.readPixels(gl.drawingBufferWidth >> 1, gl.drawingBufferHeight >> 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      blank = px[3] === 0 ? blank + 1 : 0;
      if (blank >= BLANK_CHECKS) {
        console.warn('the 3D view draws nothing');
        reload();
      }
    },
  };
}
