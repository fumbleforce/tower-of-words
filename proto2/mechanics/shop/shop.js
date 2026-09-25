// Katakana shelf: the list is pictures, the shelf is katakana. Grab the three things on the list.
// A wrong grab flips the tag to show what it really is. Trains katakana reading, the weakest script.
import { S, $, h, sleep, pick, shuffle, shell, showLevel, levelSheet, setLevel, toast, romaji, wordSuccess, wordSeen, wordLookup,
  kanaMark, Adapter, Session, startLevel } from '../core.js';

const PROTO = 'shop';
const ROUNDS = 8;

// t: 1 short and plain, 2 long vowels, small kana, small っ, 3 long words and look-alike letters.
const GOODS = [
  ['パン', 'bread', 1], ['ペン', 'pen', 1], ['ケーキ', 'cake', 1], ['ピザ', 'pizza', 1], ['カメラ', 'camera', 1], ['テレビ', 'television', 1],
  ['バス', 'bus', 1], ['ギター', 'guitar', 1], ['ピアノ', 'piano-keys', 1], ['ドア', 'door', 1], ['タクシー', 'taxi', 1], ['ランプ', 'lamp', 1],
  ['コーヒー', 'coffee', 2], ['ビール', 'beer-stein', 2], ['ワイン', 'wine', 2], ['チーズ', 'cheese', 2], ['クッキー', 'cookie', 2], ['アイス', 'ice-cream', 2],
  ['シャツ', 't-shirt', 2], ['ロボット', 'robot', 2], ['ロケット', 'rocket', 2], ['トラック', 'truck', 2], ['テント', 'tent', 2], ['マイク', 'microphone', 2],
  ['ノート', 'notebook', 2], ['シャワー', 'shower', 2], ['トイレ', 'toilet', 2], ['ソファ', 'couch', 2], ['バッグ', 'handbag', 2], ['オレンジ', 'orange', 2], ['ボール', 'soccer-ball', 2],
  ['ハンバーガー', 'hamburger', 3], ['スーツケース', 'suitcase', 3], ['ヘッドホン', 'headphones', 3], ['プリンター', 'printer', 3], ['パソコン', 'laptop', 3],
  ['スマホ', 'device-mobile', 3], ['ゲーム', 'game-controller', 3], ['エレベーター', 'elevator', 3], ['ポップコーン', 'popcorn', 3], ['キーボード', 'keyboard', 3],
  ['カレンダー', 'calendar', 3], ['トロフィー', 'trophy', 3], ['フォーク', 'fork-knife', 3], ['バスケットボール', 'basketball', 3], ['タブレット', 'device-tablet', 3],
].map(([w, icon, t]) => ({ w, icon, t }));
// Letters that are easy to confuse. A fake tag swaps one of them.
const LOOK = { シ: 'ツ', ツ: 'シ', ソ: 'ン', ン: 'ソ', ク: 'ワ', ワ: 'ク', ス: 'ヌ', チ: 'テ', テ: 'チ', ル: 'レ', レ: 'ル', マ: 'ム', ウ: 'ワ', コ: 'ユ', ト: 'ヒ', ノ: 'メ' };
function fake(w) {
  const idx = [...w].map((c, i) => LOOK[c] ? i : -1).filter(i => i >= 0);
  if (!idx.length) return null;
  const i = pick(idx), a = [...w]; a[i] = LOOK[a[i]]; return a.join('');
}

const cfg = l => [
  { tiers: [1], shelf: 5, fakes: 0, abc: true },
  { tiers: [1, 2], shelf: 6, fakes: 0, abc: true },
  { tiers: [1, 2], shelf: 7, fakes: 1, abc: true },
  { tiers: [2, 3], shelf: 8, fakes: 1, abc: true },
  { tiers: [2, 3], shelf: 9, fakes: 2, abc: false },
  { tiers: [3], shelf: 9, fakes: 2, abc: false },
][l];

const { stage } = shell({ proto: PROTO, title: 'Katakana shelf', side: `
  <p>Grab what is on the list. A wrong grab shows what you actually picked up.</p>
  <p id="cfg"></p>` });

async function run(level) {
  showLevel(level);
  const ad = new Adapter(level, { slowMs: 15000 });
  const ses = new Session(PROTO, level);
  let wrong = 0, abcs = 0;
  $('#lvlBtn').onclick = () => levelSheet(ad.level, l => { ad.level = l; ad.hist = []; setLevel(PROTO, l); showLevel(l); ses.level = l; });
  stage.innerHTML = '';
  const prog = h('div', 'progress', Array.from({ length: ROUNDS }, () => '<i></i>').join('')); stage.append(prog);
  const area = h('div', 'shop'); stage.append(area);
  for (let r = 0; r < ROUNDS; r++) {
    prog.children[r].className = 'now';
    const c = cfg(ad.level);
    $('#cfg').textContent = `Shelf of ${c.shelf}${c.fakes ? `, with ${c.fakes} look-alike tag${c.fakes > 1 ? 's' : ''}` : ''}${c.abc ? '. Tap abc on a tag for its romaji.' : '.'}`;
    const pool = GOODS.filter(g => c.tiers.includes(g.t));
    const want = shuffle(pool).slice(0, 3);
    const others = shuffle(GOODS.filter(g => !want.includes(g) && c.tiers.some(t => Math.abs(t - g.t) <= 1))).slice(0, c.shelf - 3 - c.fakes);
    const fakes = [];
    for (const g of shuffle(want)) { if (fakes.length >= c.fakes) break; const f = fake(g.w); if (f && !GOODS.some(x => x.w === f)) fakes.push({ w: f, icon: null, fake: true }); }
    const shelf = shuffle([...want, ...others, ...fakes]);
    area.innerHTML = `
      <div class="list"><span class="lab">List</span>${want.map(g => `<span class="need" data-w="${g.w}"><i class="ph-fill ph-${g.icon}"></i></span>`).join('')}</div>
      <div class="shelf">${shelf.map((g, i) => `<div class="tag" role="button" tabindex="0" data-i="${i}"><span class="tw" lang="ja">${g.w}</span>${c.abc ? '<button class="abc" aria-label="Romaji">abc</button>' : ''}</div>`).join('')}</div>`;
    ses.begin(want.map(g => g.w).join(' '));
    let found = 0, miss = 0;
    const lookedUp = new Set();
    await new Promise(done => {
      area.querySelectorAll('.tag').forEach(el => {
        const g = shelf[+el.dataset.i];
        el.querySelector('.abc')?.addEventListener('click', e => {
          e.stopPropagation(); abcs++; ses.lookup(); lookedUp.add(g.w); if (!g.fake) wordLookup(g.w);
          el.querySelector('.abc').outerHTML = `<span class="ro">${romaji(g.w)}</span>`;
        });
        const grab = async () => {
          if (el.classList.contains('got') || el.classList.contains('flip')) return;
          ses.tap();
          if (want.includes(g)) {
            el.classList.add('got'); found++;
            area.querySelector(`.need[data-w="${g.w}"]`).classList.add('got');
            for (const ch of g.w) kanaMark(ch, true);
            if (found === 3) done();
          } else {
            miss++; wrong++;
            for (const ch of g.w) kanaMark(ch, false);
            el.classList.add('flip');
            el.insertAdjacentHTML('beforeend', `<span class="flipside">${g.icon ? `<i class="ph-fill ph-${g.icon}"></i>` : '<span class="nw">not a word</span>'}</span>`);
            await sleep(1100); el.classList.remove('flip'); el.querySelector('.flipside')?.remove();
          }
        };
        el.onclick = grab; el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') grab(); };
      });
    });
    const ok = miss === 0;
    const it = ses.end(ok, { misses: miss });
    wordSeen(want.map(g => g.w));
    wordSuccess(want.filter(g => !lookedUp.has(g.w)).map(g => g.w));
    prog.children[r].className = ok ? 'done' : 'miss';
    const d = ad.push({ ok, lookups: it.lookups, ms: it.ms });
    if (d) { ses.level = ad.level; setLevel(PROTO, ad.level); showLevel(ad.level); toast(d > 0 ? 'Level up: longer words, bigger shelf' : 'Easing off: shorter words', d > 0 ? 'up' : 'down'); }
    await sleep(600);
  }
  ses.finish(stage, { extraRows: [['Wrong grabs', wrong, ''], ['Romaji peeks', abcs, '']], again: () => run(ad.level) });
}

startLevel(PROTO).then(run);
