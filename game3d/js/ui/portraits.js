import { PORTRAITS, TEXT_PORTRAITS } from './portrait-data.js';
import { portraitSource } from '../plugins.js';
import { $ } from './dom.js';
import { onKeyboard } from './keyboard-fit.js';
import { MC, isPlayer } from '../mc.js';

// ---------- VN portraits ----------
// Available expressions are declared in ui/portrait-data.js; missing files fall back to neutral.
// Each cut-out's face box (imgutils detect_faces on the neutral image, image pixels [x0, y0, x1, y1]) and image size;
// `size` scales one person's picture about the chin (default 1).
// All expressions of a person share the framing. Every portrait is placed from this: the same face height on screen,
// the chin at the same height, the body cut at the waist.
export const FACE = {
  aoi: { W: 597, H: 768, f: [219, 167, 381, 336] },
  // the protagonist's, with why it is cut that way (data/mc/<id>.json portrait.crop and its note)
  [MC.portrait.set]: MC.portrait.crop,
  guard: { W: 597, H: 768, f: [222, 167, 378, 334] },
  kenji: { W: 597, H: 768, f: [219, 166, 383, 335] },
  // Kuro: extended down to the waist (reviews/kuro-body-1, c-s11), and shown 15% smaller than the others (size 0.85):
  // Jørgen, "she is 15% too large / zoomed in compared to the others"
  kuro: { W: 630, H: 1048, f: [254, 325, 452, 525], size: 0.85 },
  kuroda: { W: 597, H: 768, f: [237, 167, 362, 338] },
  mio: { W: 597, H: 768, f: [192, 214, 361, 383] },
  emi: { W: 597, H: 768, f: [217, 168, 383, 337] },
  mori: { W: 597, H: 768, f: [228, 171, 371, 334] },
  // Rei: rei-i65-2102 (reviews/rei-portrait-1) extended down to the waist (reviews/rei-body-1, b-s11)
  rei: { W: 533, H: 838, f: [160, 210, 316, 383] },
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
// the player's lines and faces (id 'eric', mc.js PLAYER_ID) use the protagonist's portrait set
const ME = MC.portrait.set;
const pid = (who) => (isPlayer(who) ? ME : who);
export function setFace(who, face) {
  faceNow[pid(who)] = face;
}
export function faceForEmote(who, kind) {
  who = pid(who);
  const f = (EMOTE_FACE[kind] || []).find((x) => PORTRAITS[who] && PORTRAITS[who].includes(x));
  if (f) faceNow[who] = f;
}
function faceOf(who, face) {
  const list = PORTRAITS[who];
  if (!list) return null;
  return list.includes(face) ? face : list.includes(faceNow[who]) ? faceNow[who] : 'neutral';
}
function workSrc(who, face) {
  if (!PORTRAITS[who]) return null;
  return new URL(
    `../../assets/portraits/${who}-${faceOf(who, face)}.webp?v=${encodeURIComponent(window.BUILD || '')}`,
    import.meta.url,
  ).href;
}
function portraitSrc(who, face) {
  const named = faceOf(who, face);
  if (!named) return null;
  return portraitSource(who, named) || workSrc(who, named);
}
// Pictures are loaded and decoded before they are shown. An <img> given a new src keeps painting its old picture until
// the new one arrives, so on a slow phone a new conversation opened on the last person talked to (Jørgen: "Whenever i
// talk to someone new, i first initially see the last person i talked to"). A new person stays hidden until their
// picture is ready and then fades in; a new expression of the person already showing swaps in when it is ready.
const loading = new Map(); // src -> Promise<boolean>, holding its Image so the decoded picture stays in memory
const ready = new Set();
function preload(src) {
  if (!src) return Promise.resolve(false);
  let p = loading.get(src);
  if (!p) {
    const im = new Image();
    im.decoding = 'async';
    im.src = src;
    p = im.decode().then(
      () => (ready.add(src), true),
      () => false,
    );
    p.im = im;
    loading.set(src, p);
  }
  return p;
}
// everyone who speaks in a scene's steps, nested branches included
function speakersIn(steps, out = new Set()) {
  for (const s of steps || []) {
    const lines = typeof s === 'string' ? [s] : s && typeof s === 'object' ? [s.prompt, s.line] : [];
    for (const l of lines) {
      const m = typeof l === 'string' && /^(\w+): /.exec(l);
      if (m) out.add(m[1]);
    }
    if (s && typeof s === 'object') {
      if (s.say) out.add(s.say);
      for (const v of Object.values(s)) if (Array.isArray(v)) speakersIn(v, out);
    }
  }
  return out;
}
// A scene starts (runner.js): everyone back on their neutral face, since a face set on a line lasts for its scene
// only, and every picture of everyone who speaks in it starts loading, so it's ready when they talk.
export function newScene(steps) {
  for (const who in PORTRAITS) faceNow[who] = undefined;
  if (typeof Image === 'undefined') return; // tooling runs the story without a page
  for (const id of speakersIn(steps)) {
    const who = TEXT_PORTRAITS[id]?.[0] || id;
    for (const f of PORTRAITS[who] || []) preload(portraitSrc(who, f));
  }
}
// everyone's neutral picture, once the game has settled after boot, so a first talk needn't wait on the network
if (typeof Image !== 'undefined')
  setTimeout(() => {
    const all = () => Object.keys(PORTRAITS).forEach((who) => preload(portraitSrc(who, 'neutral')));
    if (globalThis.requestIdleCallback) globalThis.requestIdleCallback(all, { timeout: 4000 });
    else all();
  }, 6000);
// a small round face for the backlog: the face box, a little wider, filling a square (CSS percentages, any size)
export function thumbStyle(whoId, face) {
  whoId = pid(whoId);
  const text = TEXT_PORTRAITS[whoId];
  if (text) [whoId, face] = [text[0], PORTRAITS[text[0]].includes(face) ? face : text[1]];
  const F = FACE[whoId],
    src = portraitSrc(whoId, face);
  if (!F || !src) return '';
  const [x0, y0, x1, y1] = F.f,
    R = (y1 - y0) * 1.5,
    cx = (x0 + x1) / 2,
    cy = (y0 + y1) / 2 + (y1 - y0) * 0.08;
  const pct = (c, n) => ((Math.max(0, c - R / 2) / (n - R)) * 100).toFixed(1);
  return `background-image:url('${src}');background-size:${((F.W / R) * 100).toFixed(1)}% auto;background-position:${pct(cx, F.W)}% ${pct(cy, F.H)}%`;
}
const HOPS = new Set(['surprised', 'panicked', 'panic']);
export function showPortraits(t, whoId, face) {
  whoId = pid(whoId);
  const text = TEXT_PORTRAITS[whoId]; // a text message: the sender's portrait
  if (text) [whoId, face] = [text[0], PORTRAITS[text[0]].includes(face) ? face : text[1]];
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
    if (el._want !== src) {
      const img = el.querySelector('img');
      // the same person already on screen keeps their old face until the new one is ready; anyone else is hidden
      // until theirs is
      const same = el.dataset.who === who && !el.hidden && !el.classList.contains('wait');
      el._want = src;
      const put = (s) => {
        if (img.getAttribute('src') !== s) img.src = s;
        el.style.setProperty('--src', `url("${s}")`);
        el.classList.remove('wait');
      };
      if (ready.has(src)) put(src);
      else {
        if (!same) el.classList.add('wait');
        preload(src)
          .then((ok) => (ok ? src : preload(workSrc(who, 'neutral')).then((n) => (n ? workSrc(who, 'neutral') : null))))
          .then((s) => {
            if (el._want === src && s) put(s);
          });
      }
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
  if (whoId === ME) {
    set(R, ME, face, false);
    if (!phone && lastNpc && PORTRAITS[lastNpc]) set(L, lastNpc, undefined, true);
    else L.hidden = true;
  } else {
    lastNpc = whoId;
    set(L, whoId, face, false);
    if (!phone && PORTRAITS[whoId]) set(R, ME, undefined, true);
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
      s = (F * (d.size || 1)) / (d.f[3] - d.f[1]),
      cx = (d.f[0] + d.f[2]) / 2,
      fw = (d.f[2] - d.f[0]) * s;
    let top = base - cutK * F - d.f[3] * s;
    // a picture that ends within a few px of the cut (Kuro at size 0.85 ends 3 px short at 1366x860) is set down onto
    // it, so it ends hard like the others; only one that ends visibly early (Eric) keeps the faded edge below
    const gap = base - (top + d.H * s);
    if (gap > 0 && gap <= 6) top += gap;
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
onKeyboard(() => layoutStage()); // the phone keyboard opened or closed (keyboard-fit.js)
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
