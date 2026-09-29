import { WORDS, known } from '../lang.js';
import { paused } from '../audio/core.js';

// ---------- overheard Japanese ----------
// Eric can't follow it: every character he doesn't know becomes a softened, shifting stand-in glyph, and
// the words he does know (his phrases and commands, plus the line's `clear` list) stay sharp and glossed.
// kana only: two stand-in glyphs side by side must never spell a real word (no kanji)
const POOL =
  'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだでどばびぶべぼぱぴぷぺぽアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモラリルレロワン';
// only sounds stay readable: real words like はい, うん, ええ, まあ, ほら are words he hasn't been taught, so they
// blur like the rest (Jørgen: hai showed as a known word on day 1)
const INTERJ = [
  'えっと',
  'あのう',
  'あの',
  'ああ',
  'あっ',
  'えっ',
  'おっ',
  'うわ',
  'わあ',
  'あー',
  'えー',
  'あ',
  'え',
  'お',
  'ん',
];
export function heardHTML(text, clear = []) {
  // {id} words in an overheard line are sharp and glossed only once he's been taught them (typed, learned or
  // offered); seeing a word glossed somewhere (the train announcement's 本社) doesn't teach it
  text = text.replace(/\{(\w+)\}/g, (_, id) => (WORDS[id] ? WORDS[id].ja : id));
  const keep = [];
  for (const id of known) {
    const w = WORDS[id];
    if (!w) continue;
    for (const ja of [w.ja, ...(w.alias || [])]) keep.push({ ja, gl: `${w.ro}, ${w.en}`, known: true });
  }
  // `clear` entries are readable for this line only: plain text, not styled as known, never added to what he knows
  for (const c of clear || [])
    keep.push(typeof c === 'string' ? { ja: c } : { ja: c.ja, gl: [c.ro, c.en].filter(Boolean).join(', ') });
  keep.sort((a, b) => b.ja.length - a.ja.length);
  let out = '',
    i = 0;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const punct = /[\s、。！？!?…「」ー]/;
  while (i < text.length) {
    // interjections and sounds (あっ, えっ, うん...) are never hidden: only real words he doesn't know are
    if (i === 0 || punct.test(text[i - 1])) {
      const it = INTERJ.find(
        (w) => text.startsWith(w, i) && (i + w.length === text.length || punct.test(text[i + w.length])),
      );
      if (it) {
        out += `<span class="plain">${esc(it)}</span>`;
        i += it.length;
        continue;
      }
    }
    const k = keep.find((w) => text.startsWith(w.ja, i));
    if (k) {
      out += `<span class="${k.known ? 'jp clear' : 'plain'}">${esc(k.ja)}</span>${k.gl ? ` <span class="gl">(${esc(k.gl)})</span>` : ''}`;
      i += k.ja.length;
      continue;
    }
    const ch = text[i];
    if (/[\s、。！？!?…「」]/.test(ch)) out += esc(ch);
    else out += `<span class="gx" data-c="${esc(ch)}">${POOL[(ch.charCodeAt(0) * 7 + i) % POOL.length]}</span>`;
    i++;
  }
  return `<span class="heardico" aria-hidden="true"></span>${out}`;
}
let scrambleTimer = null;
export function scramble(line) {
  clearInterval(scrambleTimer);
  let n = 0;
  scrambleTimer = setInterval(() => {
    if (!line.isConnected || !line.closest('#talk.heard')) {
      clearInterval(scrambleTimer);
      return;
    }
    const g = line.querySelectorAll('.gx');
    if (!g.length) {
      clearInterval(scrambleTimer);
      return;
    }
    for (let k = 0; k < 3; k++) {
      const e = g[(n * 5 + k * 7) % g.length];
      e.textContent = POOL[(Math.random() * POOL.length) | 0];
    }
    n++;
  }, 140);
}

// ---------- text reveal (settings.textSpeed) ----------
// The line writes itself out a few characters at a time. Every character is a span that is already laid out
// (only its opacity changes), so the line never reflows as it appears. A tap shows the rest at once.
export function reveal(line, cps) {
  const chars = [];
  const walk = (n) => {
    for (const c of [...n.childNodes]) {
      if (c.nodeType === 3) {
        const f = document.createDocumentFragment();
        for (const ch of c.textContent) {
          if (/\s/.test(ch)) {
            f.appendChild(document.createTextNode(ch));
            continue;
          }
          const sp = document.createElement('span');
          sp.className = 'rv';
          sp.textContent = ch;
          f.appendChild(sp);
          chars.push(sp);
        }
        c.replaceWith(f);
      } else if (c.nodeType === 1 && c.tagName !== 'RT' && c.tagName !== 'svg') walk(c);
    }
  };
  walk(line);
  const r = { done: !chars.length, onDone: null };
  if (r.done) return r;
  line.classList.add('revealing');
  let i = 0,
    last = performance.now(),
    raf = 0;
  const finish = () => {
    cancelAnimationFrame(raf);
    for (; i < chars.length; i++) chars[i].classList.add('on');
    line.classList.remove('revealing');
    r.done = true;
    r.onDone && r.onDone();
  };
  const tick = (now) => {
    if (!line.isConnected) return;
    if (paused) {
      last = now;
      raf = requestAnimationFrame(tick);
      return;
    }
    const n = Math.floor(((now - last) / 1000) * cps);
    if (n > 0) {
      last += (n / cps) * 1000;
      for (let k = 0; k < n && i < chars.length; k++, i++) chars[i].classList.add('on');
    }
    if (i >= chars.length) finish();
    else raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  // hidden tabs stall rAF: make sure a line is never stuck half-written
  setTimeout(
    () => {
      if (!r.done && line.isConnected) finish();
    },
    (chars.length / cps) * 1000 + 1500,
  );
  r.finish = finish;
  return r;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// a small play button after each taught word in a line: tap it (or the word) to hear the word again
export function addPlayButtons(line) {
  for (const w of line.querySelectorAll('.jp[data-w]')) {
    const id = w.dataset.w;
    if (!WORDS[id] || !WORDS[id].voice) continue;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'wplay';
    b.dataset.w = id;
    b.setAttribute('aria-label', `Hear ${WORDS[id].ro}`);
    b.innerHTML =
      '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="10"/><path d="M8 6.2v7.6l6-3.8z"/></svg>';
    w.after(b);
  }
}
export async function whileUnpaused(ms) {
  await sleep(ms);
  while (paused) await sleep(200);
}
