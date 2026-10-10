// What the two opening players share: the live one (op.js, built and drawn in the browser) and the film (film.js,
// the rendered video with the karaoke drawn over it, what the game plays). The page's flags, the fonts, the loading
// screen (index.html #load), the Lyrics button's setting and the 16:9 fit.
export const qs = new URLSearchParams(location.search);
export const EMBED = qs.has('embed');
if (qs.has('gate')) document.body.classList.add('gate');

export async function loadFonts() {
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

// the loading screen: f 0..1 fills the rail, label says what is happening
const load = { bar: document.getElementById('load-bar'), say: document.getElementById('load-say') };
export function progress(f, label) {
  if (!load.bar) return;
  load.bar.style.transform = `scaleX(${Math.min(1, Math.max(0, f)).toFixed(3)})`;
  if (label) load.say.textContent = label;
}
// a moment for the page to paint (between long steps that hold it)
export const paint = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

// the Lyrics button: on unless ?lyrics=0 or the viewer turned it off before (kept in storage). Returns a getter;
// onChange runs after each press
export function lyricsButton(btn, onChange = () => {}) {
  let on = qs.get('lyrics') !== '0';
  try {
    if (!qs.has('lyrics') && localStorage.getItem('opening.lyrics') === '0') on = false;
  } catch {
    /* storage blocked: lyrics stay on */
  }
  const show = () => {
    btn.setAttribute('aria-pressed', String(on));
    btn.textContent = on ? 'Lyrics on' : 'Lyrics off';
  };
  show();
  btn.addEventListener('click', () => {
    on = !on;
    try {
      localStorage.setItem('opening.lyrics', on ? '1' : '0');
    } catch {
      /* storage blocked: the choice lasts this visit */
    }
    show();
    onChange(on);
  });
  return () => on;
}

// 16:9 inside the window, letterboxed: sets each element's CSS size and calls onSize(w, h) (CSS pixels), now and on
// every resize
export function fit16x9(els, onSize = () => {}) {
  const fit = () => {
    const s = Math.min(innerWidth / 16, innerHeight / 9);
    const w = Math.floor(16 * s),
      h = Math.floor(9 * s);
    for (const e of els) {
      e.style.width = w + 'px';
      e.style.height = h + 'px';
    }
    onSize(w, h);
  };
  fit();
  addEventListener('resize', fit);
}
