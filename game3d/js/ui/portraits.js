import { PORTRAITS } from './portrait-data.js';
import { $ } from './dom.js';

// ---------- VN portraits ----------
// Available expressions are declared in ui/portrait-data.js; missing files fall back to neutral.
// Each cut-out's face box (imgutils detect_faces on the neutral image, image pixels [x0, y0, x1, y1]) and image size.
// All expressions of a person share the framing. Every portrait is placed from this: the same face height on screen,
// the chin at the same height, the body cut at the waist.
export const FACE = {
  aoi: { W: 630, H: 810, f: [222, 196, 413, 389] },
  // Eric: x and chin from the detector ([112, 163, 348, 399]); the top kept 191 px above the chin, the old crop's face
  // height, so he shows 25% bigger than the others, as approved (reviews/eric-portrait-final-3). 648 wide so his left
  // shoulder (image right) ends inside the picture (reviews/eric-canvas-1)
  eric: { W: 648, H: 768, f: [112, 208, 348, 399] },
  guard: { W: 597, H: 768, f: [250, 162, 374, 300] },
  kenji: { W: 597, H: 768, f: [221, 167, 384, 335] },
  kuro: { W: 630, H: 809, f: [254, 325, 452, 525] },
  kuroda: { W: 597, H: 768, f: [240, 154, 364, 313] },
  mio: { W: 597, H: 768, f: [192, 214, 361, 383] },
  emi: { W: 597, H: 768, f: [203, 159, 395, 349] },
  mori: { W: 597, H: 768, f: [234, 171, 372, 339] },
};
const EMOTE_FACE = {
  '?': ['suspicious', 'deadpan', 'stern'],
  '!': ['surprised', 'panicked', 'panic'],
  '♪': ['smile', 'grin', 'amused'],
  heart: ['smile', 'embarrassed', 'grin'],
  sweat: ['flustered', 'embarrassed', 'sheepish', 'panicked'],
  zzz: ['sleepy', 'tired'],
  '…': ['tired', 'deadpan'],
};
const faceNow = {};
// what the portraits keep clear of while a prompt waits: a function giving boxes on screen, Eric's first (set by the
// game, narrative/hooks/presentation.js)
let avoidBoxes = () => [];
export function setPortraitAvoid(fn) {
  avoidBoxes = fn;
}
let lastNpc = null;
export function setFace(who, face) {
  faceNow[who] = face;
}
export function faceForEmote(who, kind) {
  const f = (EMOTE_FACE[kind] || []).find((x) => PORTRAITS[who] && PORTRAITS[who].includes(x));
  if (f) faceNow[who] = f;
}
function faceOf(who, face) {
  const list = PORTRAITS[who];
  if (!list) return null;
  return list.includes(face) ? face : list.includes(faceNow[who]) ? faceNow[who] : 'neutral';
}
function portraitSrc(who, face) {
  if (!PORTRAITS[who]) return null;
  return new URL(
    `../../assets/portraits/${who}-${faceOf(who, face)}.webp?v=${encodeURIComponent(window.BUILD || '')}`,
    import.meta.url,
  ).href;
}
const HOPS = new Set(['surprised', 'panicked', 'panic']);
export function showPortraits(t, whoId, face) {
  const S = $('#stage'),
    L = S.querySelector('.por.left'),
    R = S.querySelector('.por.right');
  S.hidden = false;
  if (!whoId) {
    L.hidden = R.hidden = true;
    return;
  } // narration: no portrait
  const set = (el, who, f, listen) => {
    const src = portraitSrc(who, f);
    if (!src) {
      el.hidden = true;
      return;
    }
    const img = el.querySelector('img');
    if (img.getAttribute('src') !== src) {
      img.onerror = () => {
        const n = portraitSrc(who, 'neutral');
        if (img.getAttribute('src') !== n) {
          img.src = n;
          el.style.setProperty('--src', `url("${n}")`);
        }
      };
      img.src = src;
      el.style.setProperty('--src', `url("${src}")`);
      const fc = faceOf(who, f);
      if (!listen && el.dataset.face !== fc && HOPS.has(fc)) {
        el.classList.remove('hop');
        void el.offsetWidth;
        el.classList.add('hop');
      }
      el.dataset.face = fc;
    }
    el.dataset.who = who;
    el.hidden = false;
    el.classList.toggle('listen', !!listen);
  };
  const phone = document.body.classList.contains('phone');
  if (whoId === 'eric') {
    set(R, 'eric', face, false);
    if (!phone && lastNpc && PORTRAITS[lastNpc]) set(L, lastNpc, undefined, true);
    else L.hidden = true;
  } else {
    lastNpc = whoId;
    set(L, whoId, face, false);
    if (!phone && PORTRAITS[whoId]) set(R, 'eric', undefined, true);
    else R.hidden = true;
  }
  if (!PORTRAITS[whoId]) L.hidden = true;
  layoutStage();
}
// Place each portrait from its face box: face height F on screen, chin at the same height for everyone, the body
// cut at the waist by the bottom of the screen (desktop) or by the top of the solid band (phone).
// While a prompt or choice waits on the player (a word to type, replies to pick), no portrait covers Eric (issue #76):
// one that would goes to the other side, else shrinks, else fades out, and it comes back when the lines go on.
const WAYS = [
  { flip: false, k: 1 },
  { flip: true, k: 1 },
  { flip: false, k: 0.7 },
  { flip: true, k: 0.7 },
];
const OFF = WAYS.length; // faded out
let lastKeep = null,
  followRaf = 0;
export function layoutStage() {
  const S = $('#stage');
  if (!S || S.hidden) return;
  const phone = document.body.classList.contains('phone'),
    vw = innerWidth,
    vh = innerHeight;
  const talk = $('#talk');
  const band = phone ? Math.max(170, (talk.hidden ? 0 : talk.offsetHeight) + 18) : 0;
  S.style.setProperty('--band', band + 'px');
  // phone: a small bust docked to the side, cut on the solid band (QA round 1: a phone portrait covered 60% of the scene)
  const F0 = phone ? Math.min(58, vh * 0.068) : Math.min(124, vh * 0.13);
  const cutK = phone ? 1.55 : 2.25; // chin to the cut, in face heights (the waist on desktop)
  const base = vh - band;
  const keep = promptWaiting(talk) ? avoidBoxes() : [];
  lastKeep = keep.length ? keep : null;
  const taken = [];
  // where a portrait goes at size k, and the box its body covers (about 1.4 face widths each side of the face, from
  // the top of the hair, about half a face above the face box, down to the cut)
  const place = (d, left, k) => {
    const F = F0 * k,
      s = F / (d.f[3] - d.f[1]),
      cx = (d.f[0] + d.f[2]) / 2,
      fw = (d.f[2] - d.f[0]) * s;
    const top = base - cutK * F - d.f[3] * s;
    const fx = phone ? vw * (left ? 0.2 : 0.8) : vw * (left ? 0.16 : 0.86);
    // phone: slide the picture in so all of it stays on screen (Eric's 648-wide image ran 48 px past the right edge at
    // 390 wide); the face size stays the same
    const x = phone ? Math.max(0, Math.min(vw - d.W * s, fx - cx * s)) : fx - cx * s;
    const mid = x + cx * s;
    const body = { x0: mid - 1.4 * fw, x1: mid + 1.4 * fw, y0: top + Math.max(0, d.f[1] * s - F / 2), y1: base };
    return { s, x, top, body };
  };
  const clear = (b) =>
    ![...keep, ...taken].some((o) => b.x0 < o.x1 + 8 && b.x1 > o.x0 - 8 && b.y0 < o.y1 + 8 && b.y1 > o.y0 - 8);
  for (const el of S.querySelectorAll('.por')) {
    const d = FACE[el.dataset.who];
    if (!d || el.hidden) continue;
    const left = el.classList.contains('left');
    const at = (w) => place(d, w.flip ? !left : left, w.k);
    let way = 0;
    if (lastKeep) {
      // keep this prompt's way while it stays clear, so the picture doesn't jump about as the camera moves
      const now = el._way ?? 0;
      way = now < OFF && clear(at(WAYS[now]).body) ? now : WAYS.findIndex((w) => clear(at(w).body));
      if (way < 0) way = OFF;
    }
    el._way = lastKeep ? way : undefined;
    el.classList.toggle('aside', way === OFF);
    const { s, x, top, body } = at(WAYS[way === OFF ? 0 : way]);
    if (way !== OFF) taken.push(body);
    el._body = way === OFF ? null : body; // for tools/prompt-shots.mjs
    el.style.width = d.W * s + 'px';
    el.style.height = d.H * s + 'px';
    el.style.left = x + 'px';
    el.style.top = top + 'px';
    // how far above the cut the image itself ends (Eric's cut-out is shorter); that bottom edge is faded out
    el.style.setProperty('--short', Math.max(0, base - (top + d.H * s)) + 'px');
    el.classList.toggle('short', top + d.H * s < base - 2);
    // cut exactly at the base: the screen edge on desktop, the top of the solid band on phone
    el.style.clipPath = `inset(0 -40px ${Math.max(0, top + d.H * s - base)}px -40px)`;
  }
  // Eric and the camera can move while the prompt waits: follow them until it's answered
  if (lastKeep && !followRaf) followRaf = requestAnimationFrame(follow);
}
// a word to type or replies to pick are up and waiting for the player
export function promptWaiting(talk) {
  return (
    !!talk && !talk.hidden && (talk.classList.contains('typing') || !!talk.querySelector('.chips .chip:not(:disabled)'))
  );
}
function follow() {
  followRaf = 0;
  const S = $('#stage');
  if (!S || S.hidden || !lastKeep) return;
  const keep = promptWaiting($('#talk')) ? avoidBoxes() : [];
  const moved =
    keep.length !== lastKeep.length ||
    keep.some((b, i) => ['x0', 'x1', 'y0', 'y1'].some((k) => Math.abs(b[k] - lastKeep[i][k]) > 2));
  if (moved) layoutStage();
  else followRaf = requestAnimationFrame(follow);
}
addEventListener('resize', () => layoutStage());
// the stage follows the talk panel: shown with it, hidden with it, re-laid out when its content changes (the phone
// band grows with the text)
let stageRaf = 0;
function watchTalk() {
  const t = $('#talk');
  if (!t) {
    setTimeout(watchTalk, 100);
    return;
  }
  new MutationObserver(() => {
    cancelAnimationFrame(stageRaf);
    stageRaf = requestAnimationFrame(() => {
      const S = $('#stage');
      if (t.hidden) {
        S.hidden = true;
        return;
      }
      S.hidden = false;
      S.classList.toggle('narr', t.classList.contains('narr'));
      layoutStage();
    });
  }).observe(t, { attributes: true, childList: true, subtree: true, characterData: true });
}
setTimeout(watchTalk, 0);

export function resetPortraitSpeaker() {
  lastNpc = null;
}
