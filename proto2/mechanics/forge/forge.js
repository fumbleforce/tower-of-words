// Spell forge: pick a verb, then build its ending. The object does exactly what the words say.
// te-form asks (works), the imperative orders (works, too hard), the dictionary form only states (nothing),
// the past repeats what the thing did last, ~ないで stops it. A wrong ending fizzles.
import { S, $, h, sleep, pick, shuffle, shell, showLevel, levelSheet, setLevel, toast, wordHTML, enableLookups, showGloss, wordLookup,
  wordSuccess, wordSeen, grammarMark, isUsable, Adapter, Session, startLevel, LEVELS } from '../core.js';

const PROTO = 'forge';
const ROUNDS = 8, CASTS = 3;

/* ---------------- verbs and conjugation ---------------- */
// cls: u (godan), ru (ichidan), kuru, iku. key: only offered once the word is "usable" (Word keys).
export const VERBS = {
  '開く': { r: 'あく', cls: 'u', eff: 'open' },
  '開ける': { r: 'あける', cls: 'ru', eff: 'open-t' },
  '閉まる': { r: 'しまる', cls: 'u', eff: 'close' },
  '閉める': { r: 'しめる', cls: 'ru', eff: 'close-t' },
  '動く': { r: 'うごく', cls: 'u', eff: 'move' },
  '止まる': { r: 'とまる', cls: 'u', eff: 'stop' },
  '止める': { r: 'とめる', cls: 'ru', eff: 'stop-t' },
  '待つ': { r: 'まつ', cls: 'u', eff: 'wait' },
  '落ちる': { r: 'おちる', cls: 'ru', eff: 'fall' },
  '出る': { r: 'でる', cls: 'ru', eff: 'out' },
  '出す': { r: 'だす', cls: 'u', eff: 'out-t' },
  '急ぐ': { r: 'いそぐ', cls: 'u', eff: 'hurry' },
  '飛ぶ': { r: 'とぶ', cls: 'u', eff: 'fly' },
  '鳴る': { r: 'なる', cls: 'u', eff: 'ring' },
  'つく': { r: 'つく', cls: 'u', eff: 'on' },
  '消える': { r: 'きえる', cls: 'ru', eff: 'off' },
  '来る': { r: 'くる', cls: 'kuru', eff: 'come' },
  '行く': { r: 'いく', cls: 'iku', eff: 'go' },
  '寝る': { r: 'ねる', cls: 'ru', eff: 'sleep' },
  '起きる': { r: 'おきる', cls: 'ru', eff: 'wake' },
  '回る': { r: 'まわる', cls: 'u', eff: 'spin' },
  '座る': { r: 'すわる', cls: 'u', eff: 'sit', key: true },
  '休む': { r: 'やすむ', cls: 'u', eff: 'rest', key: true },
  '始める': { r: 'はじめる', cls: 'ru', eff: 'start-t', key: true },
  '帰る': { r: 'かえる', cls: 'u', eff: 'home', key: true },
};
const U_ROW = { う: ['わ', 'い', 'え'], く: ['か', 'き', 'け'], ぐ: ['が', 'ぎ', 'げ'], す: ['さ', 'し', 'せ'], つ: ['た', 'ち', 'て'], ぬ: ['な', 'に', 'ね'], ぶ: ['ば', 'び', 'べ'], む: ['ま', 'み', 'め'], る: ['ら', 'り', 'れ'] };
const TE = { う: 'って', つ: 'って', る: 'って', く: 'いて', ぐ: 'いで', す: 'して', ぬ: 'んで', ぶ: 'んで', む: 'んで' };
// Endings after the stem (the verb minus its last kana; ichidan minus る; 来る keeps nothing).
function endings(id) {
  const v = VERBS[id], last = v.r.slice(-1);
  if (v.cls === 'ru') return { te: 'て', imp: 'ろ', dict: 'る', past: 'た', neg: 'ないで', wrong: ['って', 'いて'] };
  if (v.cls === 'kuru') return { te: 'きて', imp: 'こい', dict: 'くる', past: 'きた', neg: 'こないで', wrong: ['くって', 'きって'] };
  if (v.cls === 'iku') return { te: 'って', imp: 'け', dict: 'く', past: 'った', neg: 'かないで', wrong: ['いて', 'きて'] };
  const te = TE[last], row = U_ROW[last];
  const past = te.replace('て', 'た').replace('で', 'だ');
  // Wrong endings that happen to be real words (帰して, 回して, 急いて) are left out.
  const REAL = { '帰る': ['して'], '回る': ['して'], '急ぐ': ['いて'], '出す': [], '落ちる': [] };
  const wrongPool = ['って', 'いて', 'んで', 'して', row[1] + 'て'].filter(x => x !== te && !(REAL[id] || []).includes(x));
  return { te, imp: row[2], dict: last, past, neg: row[0] + 'ないで', wrong: shuffle(wrongPool).slice(0, 2) };
}
// Surface and reading of the stem shown on the tile row.
function stemOf(id) {
  const v = VERBS[id];
  if (v.cls === 'kuru') return { s: '来', r: '' };
  const cut = 1; // drop the last kana
  return { s: id.slice(0, -cut), r: v.r.slice(0, -cut) };
}
// Grammar ids (data/lang/grammar.json) for the te-form sound rule of each verb and for each form.
function teRule(id) {
  const v = VERBS[id];
  if (v.cls === 'ru' || v.cls === 'kuru') return 'te-ichidan';
  if (v.cls === 'iku') return 'te-ku';
  return { す: 'te-su', ぐ: 'te-gu', ぶ: 'te-bu-mu-nu', む: 'te-bu-mu-nu', ぬ: 'te-bu-mu-nu', う: 'te-u-tsu-ru', つ: 'te-u-tsu-ru', る: 'te-u-tsu-ru', く: 'te-ku' }[v.r.slice(-1)];
}
const FORM_ID = { te: 'te-request', imp: 'imperative', dict: 'dict-form', past: 'past', neg: 'nai-de' };
const FORM_LABEL = { te: 'asking', imp: 'ordering', dict: 'just saying it', past: 'past', neg: 'asking not to', wrong: 'garbled' };

/* ---------------- objects ----------------
   want: effects that solve the goal. fx: what each effect looks like on this object. last: what the past form replays.
   Effects not listed use the generic lines. An effect with "!" is the imperative (overdone) version. */
const OBJ = [
  { icon: 'door', goal: 'The lift door is closing on you. Keep it open.', verbs: ['待つ', '閉まる', '開く'], trans: ['開ける'], want: ['wait', 'open', 'not:close'],
    fx: { wait: ['The door stops halfway and waits politely.', 'freeze'], 'wait!': ['The door freezes so hard the whole lift shudders.', 'shake'], open: ['The door slides back open.', 'grow'], 'open!': ['The door bangs open and bounces off the frame.', 'shake'],
      close: ['The door shuts. You are still outside.', 'shrink'], 'close!': ['The door slams shut like a guillotine.', 'shrink'], 'not:close': ['The door stops closing and stays put.', 'freeze'], 'not:wait': ['The door hurries shut.', 'shrink'], 'not:open': ['The door carries on closing, very determined.', 'shrink'],
      'open-t': ['The door opens... the emergency panel next to it. The alarm starts.', 'flash'] },
    last: 'The door opens and closes again, exactly like it did a minute ago.' },
  { icon: 'printer', goal: 'The old copier is dead. Get it running.', verbs: ['動く', '止まる', '寝る'], trans: ['止める'], want: ['move'],
    fx: { move: ['The copier hums to life and warms up.', 'bounce'], 'move!': ['The copier roars. The floor shakes. Pages everywhere.', 'shake'], stop: ['The copier, already dead, stays very dead.', 'freeze'], 'not:move': ['The copier is now firmly not moving.', 'freeze'],
      sleep: ['The copier goes into sleep mode. It was asleep already.', 'shrink'], 'stop-t': ['The copier stops... the clock on the wall.', 'freeze'] },
    last: 'It prints its own OUT OF ORDER sign. Thirty copies.' },
  { icon: 'printer', goal: 'The copier won\'t stop printing. Paper is piling up. Stop it.', verbs: ['止まる', '動く', '急ぐ', '休む'], trans: ['止める'], want: ['stop', 'not:move', 'rest'],
    fx: { stop: ['The copier stops. Silence.', 'freeze'], 'stop!': ['The copier stops dead and a last page flutters out.', 'shake'], move: ['It prints faster.', 'shake'], 'move!': ['It prints at a terrifying speed.', 'shake'], hurry: ['It prints twice as fast.', 'shake'], 'hurry!': ['Pages shoot across the room.', 'fly'],
      'not:move': ['The copier freezes mid-page.', 'freeze'], rest: ['The copier sighs and goes into sleep mode.', 'shrink'], 'rest!': ['The copier shuts down hard, fans spinning down.', 'shrink'],
      'stop-t': ['The copier stops the paper. The rollers keep screaming.', 'shake'], 'not:stop': ['It keeps printing, now with conviction.', 'shake'] },
    last: 'It prints the last page again. And again.' },
  { icon: 'flower', goal: 'A vase is wobbling on the edge of a shelf. Save it.', verbs: ['落ちる', '待つ', '止まる'], want: ['not:fall', 'stop', 'wait'],
    fx: { fall: ['The vase hops off the shelf. Crash.', 'drop'], 'fall!': ['The vase dives off the shelf. Crash.', 'drop'], stop: ['The vase stops wobbling.', 'freeze'], 'stop!': ['The vase locks in place, perfectly rigid.', 'freeze'], wait: ['The vase freezes mid-wobble.', 'freeze'],
      'not:fall': ['The vase settles back onto the shelf.', 'bounce'], 'not:stop': ['It wobbles harder.', 'shake'], 'not:wait': ['The vase falls without waiting.', 'drop'] },
    last: 'The vase wobbles, just like before.' },
  { icon: 'alarm', goal: 'An alarm clock is ringing in the next room. Make it quiet.', verbs: ['鳴る', '止まる', '寝る'], want: ['not:ring', 'stop'],
    fx: { ring: ['It rings louder.', 'shake'], 'ring!': ['It rings like a fire bell.', 'shake'], stop: ['The ringing stops.', 'freeze'], 'stop!': ['The alarm stops so hard it falls off the table.', 'drop'], 'not:ring': ['The alarm goes quiet.', 'freeze'],
      sleep: ['The alarm lies down on its side. Still ringing.', 'spin'], 'not:stop': ['It keeps ringing, proudly.', 'shake'] },
    last: 'It rings again, the same tune as before.' },
  { icon: 'lightbulb', goal: 'The room is pitch dark. You need light.', verbs: ['つく', '消える'], want: ['on'],
    fx: { on: ['The light comes on.', 'flash'], 'on!': ['The bulb blazes like a stadium floodlight. Your eyes.', 'flash'], off: ['It was already off. Now it is extra off.', 'shrink'], 'not:on': ['The bulb refuses to light.', 'freeze'], 'not:off': ['The bulb stays dark. It was never going to go out.', 'freeze'] },
    last: 'It flickers once, like it did yesterday, and goes dark.' },
  { icon: 'cat', goal: 'A cat is asleep on your keyboard. Get it off.', verbs: ['来る', '起きる', '寝る', '帰る'], want: ['come', 'home'],
    fx: { come: ['The cat walks over and curls up in your lap.', 'bounce'], 'come!': ['The cat launches itself at your face.', 'fly'], wake: ['The cat wakes, stretches, and lies back down on the keys.', 'spin'], sleep: ['The cat, already asleep, sleeps harder.', 'shrink'],
      'not:come': ['The cat decides never to come near you.', 'freeze'], 'not:sleep': ['The cat sits up on the keys, wide awake. Typing.', 'shake'], home: ['The cat jumps down and trots off home.', 'fly'], 'home!': ['The cat sprints out of the building.', 'fly'] },
    last: 'The cat rolls over, the way it did last time. Still on the keys.' },
  { icon: 'dog', goal: 'A dog is pulling toward the road. Make it stay.', verbs: ['行く', '待つ', '座る'], want: ['wait', 'sit', 'not:go'],
    fx: { go: ['The dog bolts off down the street.', 'fly'], 'go!': ['The dog is gone. Just gone.', 'fly'], wait: ['The dog stops and waits, tail going.', 'freeze'], 'wait!': ['The dog freezes like a statue.', 'freeze'], sit: ['The dog sits.', 'shrink'], 'sit!': ['The dog slams down and trembles.', 'shake'], 'not:go': ['The dog stays put.', 'freeze'], 'not:wait': ['The dog runs off without waiting.', 'fly'] },
    last: 'The dog pulls toward the road again, same as before.' },
  { icon: 'balloon', goal: 'A balloon is floating away. Get it back.', verbs: ['飛ぶ', '来る', '落ちる'], want: ['come', 'fall', 'not:fly'],
    fx: { fly: ['The balloon soars up and away.', 'fly'], 'fly!': ['The balloon rockets into the clouds.', 'fly'], come: ['The balloon drifts back to your hand.', 'bounce'], 'come!': ['The balloon smacks into your face.', 'shake'], fall: ['The balloon drops straight into your hands.', 'drop'], 'fall!': ['The balloon plummets and bounces off your head.', 'drop'],
      'not:fly': ['The balloon stops rising and hangs there, low enough to grab.', 'freeze'], 'not:come': ['The balloon floats off, ignoring you.', 'fly'], 'not:fall': ['The balloon floats higher.', 'fly'] },
    last: 'The balloon bobs, like it did a moment ago.' },
  { icon: 'taxi', goal: 'A taxi is driving past. Stop it.', verbs: ['止まる', '行く', '来る'], want: ['stop', 'come'],
    fx: { stop: ['The taxi pulls over.', 'freeze'], 'stop!': ['The taxi slams its brakes. Tyres scream.', 'shake'], go: ['The taxi speeds off.', 'fly'], come: ['The taxi pulls up beside you.', 'bounce'], 'come!': ['The taxi mounts the pavement to reach you.', 'shake'], 'not:stop': ['The taxi keeps going.', 'fly'], 'not:go': ['The taxi slows down... and stops in the middle of the road.', 'freeze'] },
    last: 'The taxi drives past again, like it did a second ago.' },
  { icon: 'train', goal: 'You are running for the train. Make it wait.', verbs: ['待つ', '出る', '急ぐ'], want: ['wait', 'not:out'],
    fx: { wait: ['The doors stay open. You make it.', 'freeze'], 'wait!': ['The train freezes. Every passenger looks round.', 'shake'], out: ['The train pulls out.', 'fly'], 'out!': ['The train leaves at full speed.', 'fly'], hurry: ['The train leaves early.', 'fly'], 'not:out': ['The train stays in the station.', 'freeze'], 'not:wait': ['The train leaves right away.', 'fly'], 'not:hurry': ['The train takes its time. It still leaves without you.', 'fly'] },
    last: 'The doors close, the same way they did at the last station.' },
  { icon: 'umbrella', goal: 'It is pouring and your umbrella is stuck shut. Open it.', verbs: ['開く', '閉まる'], trans: ['開ける'], want: ['open'],
    fx: { open: ['The umbrella pops open.', 'grow'], 'open!': ['It snaps open so hard it turns inside out.', 'shake'], close: ['It squeezes tighter shut.', 'shrink'], 'not:open': ['It stays shut, now on purpose.', 'freeze'], 'not:close': ['Nothing changes. It was already shut.', 'freeze'],
      'open-t': ['The umbrella opens... your bag. Your lunch falls out.', 'drop'] },
    last: 'It folds itself shut again, like it did this morning.' },
  { icon: 'coffee', goal: 'The coffee machine blinks but gives nothing. Get a coffee.', verbs: ['出る', '動く', '止まる'], trans: ['出す'], want: ['out', 'move'],
    fx: { out: ['Coffee pours into your cup.', 'bounce'], 'out!': ['Coffee sprays across the room.', 'shake'], move: ['The machine grinds and fills your cup.', 'bounce'], 'move!': ['The machine rattles across the counter, pouring.', 'shake'], stop: ['The machine was already stopped. It stays stopped.', 'freeze'],
      'not:out': ['Not a drop.', 'freeze'], 'out-t': ['The machine spits out the coins you put in.', 'drop'] },
    last: 'It blinks, exactly like before.' },
  { icon: 'fan', goal: 'The fan is blowing your papers around. Make it stop.', verbs: ['回る', '止まる', '飛ぶ', '休む'], want: ['stop', 'not:spin', 'rest'],
    fx: { spin: ['It spins faster. Papers everywhere.', 'spin'], 'spin!': ['It spins like a jet engine.', 'spin'], stop: ['The fan stops.', 'freeze'], 'stop!': ['The blades stop dead with a clank.', 'shake'], fly: ['The fan lifts off the desk.', 'fly'], 'not:spin': ['The blades slow and stop.', 'freeze'], rest: ['The fan slows down and rests.', 'shrink'] },
    last: 'It turns its head, like it did a moment ago.' },
  { icon: 'laptop', goal: 'Your meeting starts now and the laptop is asleep. Wake it.', verbs: ['起きる', '寝る', '始める'], want: ['wake', 'not:sleep', 'start-t'],
    fx: { wake: ['The screen lights up.', 'flash'], 'wake!': ['The laptop wakes with every fan at full blast.', 'shake'], sleep: ['It sleeps more deeply.', 'shrink'], 'not:wake': ['The screen stays black.', 'freeze'], 'not:sleep': ['The laptop stops dozing and the screen comes on.', 'flash'],
      'start-t': ['The laptop starts the meeting for you. You are in.', 'flash'], 'start-t!': ['The laptop starts the meeting, camera on, volume at full.', 'shake'] },
    last: 'It shows the same spinning circle as before.' },
];
const ICON_SWAP = { door: { open: 'door-open' } };

/* ---------------- round state and UI ---------------- */
const { stage } = shell({ proto: PROTO, title: 'Spell forge', side: `
  <p>Pick a word, then its ending. The thing you speak to does exactly what you said.</p>
  <p id="forms"></p>` });

function formsFor(level) {
  const f = ['te', 'dict'];
  if (level >= 1) f.push('imp');
  if (level >= 2) f.push('neg');
  if (level >= 3) f.push('past');
  return f;
}
const wrongCount = level => level === 0 ? 0 : level < 3 ? 1 : 2;

function resolve(obj, verbId, form) {
  if (form === 'wrong') return { txt: 'The word comes out garbled. Nothing happens.', anim: 'puff', win: false, fizzle: true };
  if (form === 'dict') return { txt: 'It seems to agree with you. Nothing happens.', anim: 'nod', win: false };
  if (form === 'past') return { txt: obj.last, anim: 'spin', win: false };
  const eff = VERBS[verbId].eff;
  const tag = form === 'neg' ? 'not:' + eff : eff;
  const win = obj.want.includes(tag);
  const key = form === 'imp' ? tag + '!' : tag;
  let fx = obj.fx[key] || obj.fx[tag];
  if (!fx) fx = form === 'neg' ? ['Nothing changes.', 'freeze'] : ['It tries, but that does nothing here.', 'shake'];
  if (form === 'imp' && !obj.fx[key] && win) fx = [fx[0] + ' Much too hard.', 'shake'];
  return { txt: fx[0], anim: fx[1], win, loud: form === 'imp' && win, eff: tag };
}

async function run(level) {
  showLevel(level);
  const ad = new Adapter(level, { slowMs: 14000, win: 4 });
  const ses = new Session(PROTO, level);
  let clean = 0, loud = 0, fizzles = 0;
  $('#lvlBtn').onclick = () => levelSheet(ad.level, l => { ad.level = l; ad.hist = []; setLevel(PROTO, l); showLevel(l); ses.level = l; });
  const order = shuffle(OBJ);
  stage.innerHTML = '';
  const prog = h('div', 'progress', Array.from({ length: ROUNDS }, () => '<i></i>').join('')); stage.append(prog);
  const scene = h('div', 'scene'); stage.append(scene);
  enableLookups(scene, () => ses.lookup());
  for (let r = 0; r < ROUNDS; r++) {
    prog.children[r].className = 'now';
    const lv = ad.level;
    $('#forms').textContent = `Endings at this level: ${formsFor(lv).map(f => FORM_LABEL[f]).join(', ')}.`;
    const obj = order[r % order.length];
    let verbs = obj.verbs.filter(v => !VERBS[v].key || isUsable(v));
    if (lv >= 3 && obj.trans) verbs = verbs.concat(obj.trans);
    // Low levels see fewer verbs, always including one that works.
    const works = verbs.filter(v => formsFor(lv).filter(f => f === 'te' || f === 'neg').some(f => resolve(obj, v, f).win));
    if (lv <= 1) verbs = shuffle([pick(works), ...shuffle(verbs.filter(v => !works.includes(v))).slice(0, lv === 0 ? 0 : 1)]);
    else verbs = shuffle(verbs);
    scene.innerHTML = `
      <p class="goal">${obj.goal}</p>
      <div class="said" id="said"></div>
      <div class="obj"><i class="ph-fill ph-${obj.icon}" id="objIcon"></i></div>
      <p class="react" id="react"></p>
      <div class="casts" id="casts" title="Casts left">${'<i></i>'.repeat(CASTS)}</div>
      <div class="verbs" id="verbs">${verbs.map(v => `<button class="verb" data-v="${v}">${wordHTML({ s: v, r: VERBS[v].r, k: v }, { level: lv }).replace('class="w"', 'class="wv"')}<span class="vi" title="Meaning" role="button" aria-label="Meaning"><i class="ph ph-question"></i></span>${VERBS[v].key ? '<span class="keymark" title="Unlocked in Word keys">key</span>' : ''}</button>`).join('')}</div>
      <div class="ends" id="ends"></div>`;
    const icon = $('#objIcon'), react = $('#react'), said = $('#said');
    scene.querySelectorAll('.vi').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation(); const w = b.parentElement.querySelector('.wv');
      showGloss(w); wordLookup(w.dataset.key); ses.lookup();
    }));
    ses.begin(obj.goal);
    let won = false, casts = 0, firstClean = false;
    let nextVerb = null;
    while (casts < CASTS && !won) {
      const verbId = nextVerb || await new Promise(res => {
        scene.querySelectorAll('.verb').forEach(b => b.onclick = e => { if (e.target.closest('.vi')) return; res(b.dataset.v); });
      });
      nextVerb = null;
      scene.querySelectorAll('.verb').forEach(b => b.classList.toggle('on', b.dataset.v === verbId));
      ses.tap();
      const E = endings(verbId), st = stemOf(verbId);
      const forms = formsFor(lv);
      let tiles = forms.map(f => ({ f, e: E[f] }));
      tiles = tiles.concat(E.wrong.slice(0, wrongCount(lv)).map(e => ({ f: 'wrong', e })));
      tiles = shuffle(tiles);
      const kuru = VERBS[verbId].cls === 'kuru';
      const stemHTML = kuru ? '' : wordHTML({ s: st.s, r: st.r, k: verbId }, { level: lv }).replace('class="w"', 'class="wv"');
      $('#ends').innerHTML = `<div class="stem">${stemHTML}</div><div class="tiles">${tiles.map((t, i) => `<button class="tile" data-i="${i}" lang="ja">${t.e}</button>`).join('')}</div>`;
      const pickT = await new Promise(res => {
        $('#ends').querySelectorAll('.tile').forEach(b => b.onclick = () => res(tiles[+b.dataset.i]));
        scene.querySelectorAll('.verb').forEach(b => b.onclick = e => { if (e.target.closest('.vi')) return; res({ switchTo: b.dataset.v }); });
      });
      if (pickT.switchTo) { nextVerb = pickT.switchTo; continue; }
      casts++;
      $('#casts').children[casts - 1].classList.add('used');
      const spell = `${stemHTML}${pickT.e}`;
      said.innerHTML = `<span class="spell" lang="ja">${spell}</span><span class="form">${FORM_LABEL[pickT.f]}</span>`;
      said.classList.remove('go'); void said.offsetWidth; said.classList.add('go');
      const out = resolve(obj, verbId, pickT.f);
      if (pickT.f === 'wrong') { fizzles++; grammarMark(teRule(verbId), false, true); }
      else if (pickT.f === 'te') grammarMark(teRule(verbId), true, true);
      if (FORM_ID[pickT.f]) grammarMark(FORM_ID[pickT.f], out.win, true);
      await sleep(350);
      icon.className = `ph-fill ph-${ICON_SWAP[obj.icon]?.[out.eff] || obj.icon}`;
      icon.classList.remove('a-' + icon.dataset.a); void icon.offsetWidth; icon.dataset.a = out.anim; icon.classList.add('a-' + out.anim);
      react.textContent = out.txt;
      react.className = 'react ' + (out.win ? (out.loud ? 'loud' : 'win') : 'miss');
      if (out.win) { won = true; if (casts === 1) { firstClean = !out.loud; if (firstClean) clean++; } if (out.loud) loud++; wordSuccess([verbId]); }
      await sleep(out.win ? 1500 : 1100);
      if (!won && casts < CASTS) { icon.className = `ph-fill ph-${obj.icon}`; $('#ends').innerHTML = ''; scene.querySelectorAll('.verb').forEach(b => b.classList.remove('on')); }
    }
    if (!won) {
      // Show one way it would have worked.
      const sol = verbs.flatMap(v => ['te', 'neg'].filter(f => formsFor(lv).includes(f)).map(f => ({ v, f }))).find(x => resolve(obj, x.v, x.f).win);
      if (sol) { const E = endings(sol.v); const st = stemOf(sol.v); react.innerHTML = `Out of casts. This would have worked: <span lang="ja" class="solution">${VERBS[sol.v].cls === 'kuru' ? E[sol.f] : wordHTML({ s: st.s, r: st.r, k: sol.v }, { level: lv }).replace('class="w"', 'class="wv"') + E[sol.f]}</span>`; react.className = 'react'; await sleep(2200); }
    }
    wordSeen(verbs);
    const it = ses.end(won && casts === 1, { casts });
    prog.children[r].className = won ? 'done' : 'miss';
    const d = ad.push({ ok: won && casts === 1, lookups: it.lookups, ms: it.ms });
    if (d) { ses.level = ad.level; setLevel(PROTO, ad.level); showLevel(ad.level); toast(d > 0 ? `Level up: new endings` : `Easing off: fewer endings`, d > 0 ? 'up' : 'down'); }
  }
  ses.finish(stage, { extraRows: [['First-cast wins', clean, 'clean, not overdone'], ['Too loud', loud, 'imperative wins'], ['Fizzles', fizzles, 'wrong endings']], again: () => run(ad.level) });
}

startLevel(PROTO).then(run);
