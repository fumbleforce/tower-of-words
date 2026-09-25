// Word keys: words you met in the other prototypes become usable after unaided successes on three separate days.
// Usable verbs unlock as spells in the forge. Days can be simulated. Also shows the three progression tracks.
import { S, save, $, h, sleep, shuffle, shell, showLevel, levelSheet, setLevel, renderJP, lex, wordSuccess, wordLookup, wordDays,
  isUsable, USABLE_DAYS, today, dayNo, Session, kanjiState, levelFor, isKata, closeGloss, GRAMMAR, labelJP } from '../core.js';
import { LEX, KANJI_TIER, SPELL_KEYS } from '../lexicon.js';

const PROTO = 'keys';
const { stage, side } = shell({ proto: PROTO, title: 'Word keys', side: `<p>A word becomes a key after you get it right, with no look-up, on ${USABLE_DAYS} different days. Key verbs turn into spells in the forge.</p>` });
showLevel(levelFor(PROTO) ?? S.prof.level ?? 2);
$('#lvlBtn').onclick = () => levelSheet(levelFor(PROTO) ?? 2, l => { setLevel(PROTO, l); showLevel(l); home(); });

const pips = n => `<span class="pips">${Array.from({ length: USABLE_DAYS }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
const surf = k => { const L = lex(k); return L && L.r && k !== L.r ? `${k}` : k; };
function due() {
  const d = today();
  return Object.entries(S.words)
    .filter(([k, w]) => LEX[k]?.en && w.days.length < USABLE_DAYS && !w.days.includes(d) && !w.lookDays.includes(d))
    .sort((a, b) => (SPELL_KEYS.includes(b[0]) - SPELL_KEYS.includes(a[0])) || b[1].days.length - a[1].days.length)
    .map(([k]) => k);
}

function home(flash = []) {
  closeGloss();
  const d = due();
  const met = Object.keys(S.words).filter(k => LEX[k]?.en);
  stage.innerHTML = `
    <div class="today">
      <div><span class="big">Day ${dayNo()}</span><span class="muted">${d.length ? `${d.length} word${d.length > 1 ? 's' : ''} ready for today's check` : met.length ? 'Nothing left to check today' : 'No words met yet'}</span></div>
      <div class="today-btns">${d.length ? '<button class="btn" id="go">Today\'s check</button>' : ''}<button class="btn ghost" id="next">Next day</button></div>
    </div>
    ${!met.length ? `<p class="empty">Play a round of the <a href="../reader/index.html">reader</a>, <a href="../listen/index.html">listening</a>, <a href="../register/index.html">register</a>, <a href="../forge/index.html">forge</a> or <a href="../shop/index.html">katakana shelf</a> first. Every word you meet there shows up here.</p>` : ''}
    <h3>Spell words</h3>
    <div class="spells">${SPELL_KEYS.map(k => `<div class="spk ${isUsable(k) ? 'open' : ''} ${flash.includes(k) ? 'flash' : ''}"><span class="sw" lang="ja">${renderJP(`{${k}|${LEX[k].r}}`, { level: levelFor(PROTO) ?? 2 })}</span><span class="se">${LEX[k].en}</span>${pips(wordDays(k))}<span class="st">${isUsable(k) ? 'in the forge' : S.words[k] ? 'met' : 'not met yet'}</span></div>`).join('')}</div>
    <div class="tabs" role="tablist"><button class="tab on" data-t="v">Vocabulary</button><button class="tab" data-t="g">Grammar</button><button class="tab" data-t="l">Letters</button></div>
    <div id="track"></div>
    <p class="reset"><button class="linkish" id="reset">Clear all progress</button></p>`;
  $('#next').onclick = () => { S.dayOffset = (S.dayOffset || 0) + 1; save(); document.querySelector('.day').textContent = `Day ${dayNo()}`; home(); };
  if (d.length) $('#go').onclick = () => check(d.slice(0, 8));
  $('#reset').onclick = () => { if (confirm('Clear every stat, level and word in all prototypes?')) { localStorage.removeItem('amakawa.mechanics.v1'); location.reload(); } };
  stage.querySelectorAll('.tab').forEach(t => t.onclick = () => { stage.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === t)); track(t.dataset.t); });
  track('v');
}

function track(t) {
  const el = $('#track');
  if (t === 'v') {
    const words = Object.entries(S.words).filter(([k]) => LEX[k]?.en);
    const group = (title, list) => list.length ? `<h4>${title} <span class="muted">${list.length}</span></h4><div class="wlist">${list.map(([k, w]) => `<span class="wchip" lang="ja" title="${LEX[k].en}">${labelJP(`{${k}|${LEX[k].r || k}}`, levelFor(PROTO) ?? 2)}${pips(w.days.length)}${w.looks ? `<small>${w.looks} look</small>` : ''}</span>`).join('')}</div>` : '';
    el.innerHTML = words.length ? group('Keys', words.filter(([, w]) => w.days.length >= USABLE_DAYS)) + group('On the way', words.filter(([, w]) => w.days.length > 0 && w.days.length < USABLE_DAYS)) + group('Met', words.filter(([, w]) => !w.days.length)) : '<p class="muted">Nothing yet.</p>';
  } else if (t === 'g') {
    const rows = Object.entries(S.grammar);
    const RULES = ['te-su', 'te-gu', 'te-bu-mu-nu', 'te-u-tsu-ru', 'te-ku', 'te-ichidan'];
    const sect = (title, f, lab) => { const r = rows.filter(([k]) => f(k)); return r.length ? `<h4>${title}</h4><div class="glist">${r.map(([k, g]) => `<div class="grow"><span>${lab(k)}</span><span class="gbar"><i style="width:${(g.ok / g.total * 100).toFixed(0)}%"></i></span><span class="mono">${g.ok}/${g.total}</span>${pips(Math.min(USABLE_DAYS, g.days?.length || 0))}</div>`).join('')}</div>` : ''; };
    const name = k => GRAMMAR[k] || k;
    el.innerHTML = (sect('te-form sound rules (built in the forge)', k => RULES.includes(k), name)
      + sect('Grammar points', k => GRAMMAR[k] && !RULES.includes(k), name)
      + sect('Register', k => k.startsWith('register:'), k => k.slice(9))
      + sect('Understood by ear', k => k.startsWith('listen:'), k => k.slice(7).replace('+', ' + '))) || '<p class="muted">Nothing yet.</p>';
  } else {
    const lv = S.prof.level ?? 2;
    const H = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん';
    const K = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    const kst = ch => { const k = S.kana[ch]; return !k ? '' : k.ok >= 2 && k.ok > k.miss * 2 ? 'k2' : 'k1'; };
    const kanji = Object.entries(KANJI_TIER).filter(([c, t]) => t <= 2 || S.kanji[c]).sort((a, b) => a[1] - b[1]);
    el.innerHTML = `<h4>Hiragana</h4><div class="kana">${[...H].map(c => `<span class="${kst(c)}" lang="ja">${c}</span>`).join('')}</div>
      <h4>Katakana</h4><div class="kana">${[...K].map(c => `<span class="${kst(c)}" lang="ja">${c}</span>`).join('')}</div>
      <h4>Kanji <span class="muted">N5 and N4, plus any you have met</span></h4><div class="kana kj">${kanji.map(([c]) => `<span class="s${kanjiState(c, lv)}" lang="ja">${c}</span>`).join('')}</div>
      <p class="legend"><span class="k2">read well</span><span class="k1">seen</span> for kana; <span class="s2">plain</span><span class="s1">with reading</span><span class="s0">as kana</span> for kanji at level ${lv}.</p>`;
  }
}

// Today's check: recall the meaning of each due word. Right with no look-up = one more day toward a key.
async function check(words) {
  const ses = new Session(PROTO, levelFor(PROTO) ?? 2);
  const before = Object.fromEntries(words.map(k => [k, isUsable(k)]));
  const all = Object.keys(LEX).filter(k => LEX[k].en);
  stage.innerHTML = '';
  const prog = h('div', 'progress', words.map(() => '<i></i>').join('')); stage.append(prog);
  const area = h('div', 'kcheck'); stage.append(area);
  for (const [i, k] of words.entries()) {
    prog.children[i].className = 'now';
    const L = LEX[k];
    const wrong = shuffle(all.filter(x => x !== k && LEX[x].en !== L.en && isKata(x) === isKata(k))).slice(0, 2).map(x => LEX[x].en);
    const opts = shuffle([L.en, ...wrong]);
    area.innerHTML = `<p class="muted">What does it mean?</p><div class="line" lang="ja">${renderJP(`{${k}|${L.r || k}}`, { level: levelFor(PROTO) ?? 2, noRuby: true }).replace('class="w"', 'class="wv"')}</div>
      <div class="opts">${opts.map((o, j) => `<button class="opt" data-j="${j}">${o}</button>`).join('')}<button class="opt ghosty" data-j="-1">Not sure</button></div>`;
    ses.begin(labelJP(`{${k}|${L.r || k}}`, levelFor(PROTO) ?? 2));
    const j = await new Promise(r => area.querySelectorAll('.opt').forEach(b => b.onclick = () => r(+b.dataset.j)));
    const ok = j >= 0 && opts[j] === L.en;
    area.querySelectorAll('.opt').forEach(b => { b.disabled = true; const jj = +b.dataset.j; if (jj >= 0 && opts[jj] === L.en) b.classList.add('right'); else if (jj === j) b.classList.add('wrong'); });
    if (ok) wordSuccess([k]); else wordLookup(k);
    ses.end(ok);
    prog.children[i].className = ok ? 'done' : 'miss';
    await sleep(ok ? 500 : 1300);
  }
  const newly = words.filter(k => !before[k] && isUsable(k));
  const spells = newly.filter(k => SPELL_KEYS.includes(k));
  const s = ses.finish(stage, { extraRows: [['New keys', newly.length, newly.join(' ')], ['Day', dayNo(), 'press Next day to move on']], again: () => home(spells) });
  if (newly.length) {
    const b = h('div', 'unlock', `<b>${newly.length > 1 ? 'New keys' : 'New key'}</b> <span lang="ja">${newly.join('、')}</span>${spells.length ? `<p>${spells.join(', ')} can now be cast in the <a href="../forge/index.html">forge</a>.</p>` : ''}`);
    stage.querySelector('.end').prepend(b);
  }
  $('#again').textContent = 'Back to keys';
}

home();
