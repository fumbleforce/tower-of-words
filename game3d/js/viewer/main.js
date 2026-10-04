// The character viewer (viewer.html): pick people, islanders and Tama, side by side or one at a time, play their
// animations, and turn, zoom and pan round them, in the code-built look or the chibi one (roster.js). Everything
// shown is in the URL, so a view can be linked:
//   ?c=mio,kuro,worker.2,tama     who (an islander's colours after the dot: worker, or gen-<base> in the chibi look)
//   &a=walk                       what the people do (idle walk run sit phone bow wave shrug nod)
//   &cat=sleep                    what Tama does (sit stand sleep eat wash walk)
//   &one=1                        one at a time
//   &look=chibi                   the chibi look (the code-built people otherwise)
// viewer.html loads this with ?chibi=0&chibitier=hi in the address for the moment chibi.js reads it (the finest mesh
// at every distance; no preloading of the game's crowd), and this puts the address back.
import { stage } from './stage.js';
import { CAST, BASES, ANIMALS, MOVES, CAT_MOVES, LOOKS, make, parseKey, inLook, coloured, variants } from './roster.js';

const Q0 = new URLSearchParams(location.search);
const $ = (s) => document.querySelector(s);

const look = LOOKS.includes(Q0.get('look')) ? Q0.get('look') : 'code';
const state = {
  look,
  keys: (Q0.get('c') || 'eric,mio,kuro,tama').split(',').filter((k) => inLook(look, parseKey(k).id)),
  a: MOVES.includes(Q0.get('a')) ? Q0.get('a') : 'idle',
  cat: CAT_MOVES.includes(Q0.get('cat')) ? Q0.get('cat') : 'sit',
  one: Q0.get('one') === '1',
};
if (state.one) state.keys = state.keys.slice(0, 1);
const lastV = {}; // an islander's colours, kept while it is off the stage
for (const k of state.keys) lastV[parseKey(k).id] = parseKey(k).v;

function writeUrl() {
  const q = new URLSearchParams();
  if (state.keys.length) q.set('c', state.keys.join(','));
  if (state.a !== 'idle') q.set('a', state.a);
  if (state.cat !== 'sit') q.set('cat', state.cat);
  if (state.one) q.set('one', '1');
  if (state.look !== 'code') q.set('look', state.look);
  history.replaceState(null, '', location.pathname + (q.size ? '?' + q.toString().replace(/%2C/g, ',') : ''));
}
writeUrl();

const labels = new Map();
const tagBox = $('#tags');
const st = stage($('#c'), labels);
window.__viewer = { state, st }; // for the headless check (game3d/tools/viewer-check.mjs)

// ---- the panel ----
const chip = (parent, key, text, onClick) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'chip';
  b.dataset.key = key;
  b.textContent = text;
  b.onclick = onClick;
  parent.append(b);
  return b;
};
const whoChips = {};
for (const [sel, list] of [
  ['#cast', CAST],
  ['#islanders', [...BASES.chibi, ...BASES.code]],
  ['#animals', ANIMALS],
])
  for (const [id, name] of list) whoChips[id] = chip($(sel), id, name, () => pick(id));
const moveChips = {};
for (const m of MOVES) moveChips[m] = chip($('#moves'), m, m, () => ((state.a = m), apply()));
const catChips = {};
for (const m of CAT_MOVES) catChips[m] = chip($('#catmoves'), m, m, () => ((state.cat = m), apply()));

function pick(id) {
  const at = state.keys.findIndex((k) => parseKey(k).id === id);
  const key = coloured(id) ? id + '.' + (lastV[id] || 0) : id;
  if (state.one) state.keys = [key];
  else if (at >= 0) state.keys.splice(at, 1);
  else state.keys.push(key);
  apply();
}
$('#mode-row').onclick = () => ((state.one = false), apply());
$('#mode-one').onclick = () => {
  state.one = true;
  state.keys = state.keys.slice(-1);
  apply();
};
$('#colours').onclick = () => {
  state.keys = state.keys.map((k) => {
    const { id, v } = parseKey(k);
    if (!coloured(id)) return k;
    lastV[id] = (v + 1) % variants(id);
    return id + '.' + lastV[id];
  });
  apply();
};
$('#reset').onclick = () => st.fit();
for (const l of LOOKS)
  $('#look-' + l).onclick = () => {
    if (state.look === l) return;
    // the islanders of one look aren't in the other: one of this look's stands in for them
    const had = state.keys.some((k) => coloured(parseKey(k).id));
    state.look = l;
    state.keys = state.keys.filter((k) => inLook(l, parseKey(k).id));
    const first = BASES[l][0][0];
    if (had && !state.keys.some((k) => coloured(parseKey(k).id))) state.keys.push(first + '.' + (lastV[first] || 0));
    apply();
  };

// ---- the stage ----
const made = new Map(), // look|key -> Promise of the entity
  ready = new Map(); // look|key -> the entity, once made
const at = (key) => state.look + '|' + key;
const loading = new Set(),
  failed = new Set();
function entity(key) {
  const k = at(key);
  if (!made.has(k)) {
    loading.add(k);
    made.set(
      k,
      make(state.look, key)
        .catch((e) => {
          console.error('viewer', key, e);
          failed.add(k);
          toast(`Couldn't load ${key}`);
          return null;
        })
        .then((e) => {
          if (e) ready.set(k, e);
          return e;
        })
        .finally(() => {
          loading.delete(k);
          paint();
        }),
    );
  }
  return made.get(k);
}

let token = 0;
async function apply() {
  writeUrl();
  paint();
  const mine = ++token;
  const list = (await Promise.all(state.keys.map(entity))).filter(Boolean);
  if (mine !== token) return;
  // entities off the stage drop their tags; islanders in other colours are made again when picked, so let them go
  for (const [e, el] of labels)
    if (!list.includes(e)) {
      el.remove();
      labels.delete(e);
    }
  for (const k of ready.keys())
    if (!state.keys.map(at).includes(k) && coloured(parseKey(k.split('|')[1]).id)) {
      made.delete(k);
      ready.delete(k);
    }
  st.set(list);
  for (const e of list) {
    if (!labels.has(e)) {
      const el = document.createElement('div');
      el.className = 'tag';
      el.textContent = e.label;
      tagBox.append(el);
      labels.set(e, el);
    }
    const want = e.kind === 'cat' ? state.cat : state.a;
    if (e.playing !== want) {
      e.playing = want;
      e.play(want);
    }
  }
  paint();
}

// what the panel shows: who is on, which moves anyone shown has, the mode
function paint() {
  const on = new Set(state.keys.map((k) => parseKey(k).id));
  for (const [id, b] of Object.entries(whoChips)) {
    b.setAttribute('aria-pressed', on.has(id));
    b.hidden = !inLook(state.look, id);
    const key = state.keys.find((k) => parseKey(k).id === id);
    b.classList.toggle('busy', !!key && loading.has(at(key)));
    b.classList.toggle('bad', !!key && failed.has(at(key)));
    if (coloured(id)) b.dataset.n = key ? parseKey(key).v + 1 : '';
  }
  const people = state.keys.filter((k) => parseKey(k).id !== 'tama');
  const has = new Set(people.flatMap((k) => ready.get(at(k))?.anims || []));
  for (const [m, b] of Object.entries(moveChips)) {
    b.setAttribute('aria-pressed', m === state.a);
    b.hidden = !!has.size && !has.has(m);
  }
  $('#moves-sec').hidden = !people.length;
  for (const [m, b] of Object.entries(catChips)) b.setAttribute('aria-pressed', m === state.cat);
  $('#cat-sec').hidden = !on.has('tama');
  $('#colours').hidden = ![...on].some(coloured);
  for (const l of LOOKS) $('#look-' + l).setAttribute('aria-pressed', state.look === l);
  $('#mode-row').setAttribute('aria-pressed', !state.one);
  $('#mode-one').setAttribute('aria-pressed', state.one);
  $('#empty').hidden = state.keys.length > 0;
}

let toastT = 0;
function toast(text) {
  const t = $('#toast');
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => (t.hidden = true), 4000);
}

// the touch hint fades after a few seconds, or at the first touch
const hint = $('#hint');
const hide = () => hint.classList.add('gone');
setTimeout(hide, 6000);
$('#c').addEventListener('pointerdown', hide, { once: true });

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  st.frame(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
apply().then(() => (window.__viewerReady = true));
