// The opening as the game plays it: the rendered film (game3d/tools/opening-render.mjs, without lyrics) with the
// karaoke drawn live over it from the same timings as the live player (subtitles.js), so the Lyrics button still
// works and the text stays sharp. Building and drawing the island live gets choppy on an ordinary machine (Jørgen
// 2026-10-10: "we should use the video"); the live player (op.js) stays for checks and renders.
//   opening/index.html?film       the film; with ?embed and ?gate as the live player (posts {opening: 'done'})
//   ?t=41.2                       start there
import { W, H } from './paint.js';
import { drawLyrics } from './subtitles.js';
import { END } from './timeline.js';
import { qs, EMBED, loadFonts, progress, lyricsButton, fit16x9 } from './page.js';

document.body.classList.add('film');
const canvas = document.getElementById('op'); // the karaoke, over the film
const video = document.createElement('video');
video.id = 'film';
video.playsInline = true;
video.preload = 'auto';
// the 720p copy on a phone or a small screen, else 1080p
const small = Math.min(screen.width, screen.height) < 800 || matchMedia('(pointer: coarse)').matches;
video.src = new URL(`../assets/opening/film/opening-${small ? 720 : 1080}.mp4`, import.meta.url).href;
document.body.prepend(video);

const g = canvas.getContext('2d');
fit16x9([video, canvas], (w, h) => {
  canvas.width = Math.round(w * Math.min(2, devicePixelRatio));
  canvas.height = Math.round(h * Math.min(2, devicePixelRatio));
});

const ui = { start: document.getElementById('start'), skip: document.getElementById('skip'), lyrics: document.getElementById('lyrics') };
const lyricsOn = lyricsButton(ui.lyrics);
let playing = false,
  ended = false;

// loading: the fonts, then enough of the film to play through, the rail filling as it buffers
const ready = (async () => {
  progress(0.02, 'Loading the opening');
  await loadFonts();
  await new Promise((resolve) => {
    const buffered = () => (video.buffered.length && video.duration ? video.buffered.end(video.buffered.length - 1) / video.duration : 0);
    const tick = () => progress(0.05 + 0.95 * buffered(), 'Loading the opening');
    video.addEventListener('progress', tick);
    video.addEventListener('canplaythrough', resolve, { once: true });
    video.addEventListener('error', resolve, { once: true }); // no film: the page still ends cleanly from Skip
    video.load();
  });
  if (qs.has('t')) video.currentTime = +qs.get('t');
  progress(1, 'Ready');
})();

function draw() {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, canvas.width, canvas.height);
  if (!lyricsOn()) return;
  g.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  drawLyrics(g, video.currentTime);
}

function loop() {
  if (ended) return;
  draw();
  if (playing && (video.ended || video.currentTime >= END)) finish();
  requestAnimationFrame(loop);
}

async function play() {
  await ready;
  if (ended || playing) return;
  ui.start.hidden = true;
  document.body.classList.add('playing');
  try {
    await video.play();
  } catch (e) {
    // the browser refused sound without a tap: play it muted rather than not at all
    console.warn('film', e);
    video.muted = true;
    await video.play().catch(() => {});
  }
  playing = true;
}

function finish() {
  if (ended) return;
  ended = true;
  playing = false;
  video.pause();
  document.body.classList.add('done');
  if (EMBED) window.parent.postMessage({ opening: 'done' }, '*');
}

ready.then(() => {
  document.body.classList.add('loaded');
  ui.start.disabled = false;
  ui.start.classList.add('ready');
  requestAnimationFrame(loop);
});
video.addEventListener('ended', finish);
ui.start.addEventListener('click', play);
ui.skip.addEventListener('click', finish);
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') finish();
  else if ((e.key === 'Enter' || e.key === ' ') && !playing && !ended) play();
});
// inside the game it starts at once, unless it waits for its Play button (the first visit, ?gate)
if ((EMBED && !qs.has('gate')) || qs.has('autoplay')) play();
