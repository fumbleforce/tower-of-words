// Adaptive reader: short casual lines, rendered per kanji for this player's level. Read, tap any word you need,
// then pick what it means. Includes a one-minute level check.
import { S, save, $, h, sleep, pick, shuffle, shell, showLevel, levelSheet, setLevel, levelFor, toast, renderJP, enableLookups,
  keysOf, wordSuccess, wordSeen, shownKanji, kanjiReadOK, kanjiMiss, grammarMark, noteGrammar, kanaMark, Adapter, Session, LEVELS, plain, labelJP } from '../core.js';

const PROTO = 'reader';
const RUN = 10;

// tier: 1 simplest .. 4 hardest. q[0] is the right meaning.
const LINES = [
  { t: 1, jp: '{今日|きょう}、{雨|あめ}だって。', q: ["It's supposed to rain today", "It's sunny today", 'Today is a day off'] },
  { t: 1, jp: '{水|みず}、ある？', q: ['Got any water?', 'Got any tea?', 'Is it cold?'] },
  { t: 1, jp: '{三時|さんじ}に{来て|きて|来る|te-form: asking someone}ね。', q: ['Come at three', 'Leave at three', 'Call at three'] },
  { t: 1, jp: '{ちょっと}{待って|まって|待つ|te-form: asking someone}。', q: ['Wait a sec', 'Hurry up', 'Go ahead'] },
  { t: 1, jp: '{お腹|おなか}{すいた|すいた|すく|past}。', q: ["I'm hungry", "I'm sleepy", "I'm full"] },
  { t: 1, jp: '{本|ほん}、{読んだ|よんだ|読む|past}？', q: ['Did you read the book?', 'Did you buy the book?', "Where's the book?"] },
  { t: 1, jp: 'この{犬|いぬ}、{大きい|おおきい}ね。', q: ['This dog is big', 'This dog is cute', 'This dog is loud'] },
  { t: 1, jp: '{明日|あした}、{休み|やすみ}？', q: ['Are you off tomorrow?', 'Are you busy tomorrow?', 'Are you coming tomorrow?'] },
  { t: 1, jp: 'コーヒー、{飲む|のむ}？', q: ['Want some coffee?', 'Do you like coffee?', "The coffee's gone"] },
  { t: 1, jp: '{先|さき}に{行って|いって|行く|te-form: asking someone}。', q: ['Go on ahead', 'Come with me', "Don't go"] },
  { t: 1, jp: '{もう}{帰る|かえる}の？', q: ['Heading home already?', 'When are you going home?', "You're late"] },
  { t: 1, jp: 'ここ、{座って|すわって|座る|te-form: asking someone}。', q: ['Sit here', 'Stand here', 'Wait here'] },
  { t: 1, jp: '{何時|なんじ}に{帰る|かえる}？', q: ['What time are you going home?', 'What time did you get here?', 'What time is it?'] },
  { t: 2, jp: '{今日|きょう}は{休んで|やすんで|休む|~ていい: you may}いいよ。', q: ['You can take today off', 'You worked hard today', 'Today is a holiday'] },
  { t: 2, jp: 'もう{始めよう|はじめよう|始める|volitional: let\'s}。', q: ["Let's start now", "Let's stop now", "It's already started"] },
  { t: 3, jp: '{会議|かいぎ}、もう{始めて|はじめて|始める|~てもいい: may I}もいい？', q: ['Can we start the meeting now?', 'Is the meeting over?', 'Can I skip the meeting?'] },
  { t: 3, jp: '{疲れたら|つかれたら|疲れる|~たら: when, once}、{座って|すわって|座る|te-form}ね。', q: ['Sit down when you get tired', "Don't sit down yet", 'You look tired'] },
  { t: 4, jp: '{早めに|はやめに|早め}{帰って|かえって|帰る|te-form}、{休んで|やすんで|休む|te-form}。', q: ['Go home early and rest', 'Come in early tomorrow', 'Rest a bit, then come back'] },
  { t: 4, jp: '{帰る|かえる}{前|まえ}に、{電気|でんき}{消して|けして|消す|te-form}ね。', q: ['Turn off the lights before you go home', 'Turn on the lights when you get home', 'The lights went out'] },
  { t: 1, jp: 'それ、{本当|ほんとう}？', q: ['Is that true?', 'Is that yours?', 'Is that new?'] },
  { t: 2, jp: '{駅|えき}まで{歩こう|あるこう|歩く|volitional: let\'s}。', q: ["Let's walk to the station", "Let's take a taxi", 'The station is far'] },
  { t: 2, jp: '{電車|でんしゃ}、{遅れてる|おくれてる|遅れる|~ている: going on now}。', q: ['The train is running late', 'The train is packed', 'The train already left'] },
  { t: 2, jp: '{会議|かいぎ}、{何時|なんじ}から？', q: ['What time does the meeting start?', "Where's the meeting?", 'Is the meeting over?'] },
  { t: 2, jp: '{窓|まど}、{開けて|あけて|開ける|te-form}くれる？', q: ['Can you open the window?', 'Can you close the window?', 'Is the window open?'] },
  { t: 2, jp: '{お昼|おひる}、{一緒|いっしょ}に{行こう|いこう|行く|volitional: let\'s}。', q: ["Let's go to lunch together", 'I already had lunch', 'Lunch is cancelled'] },
  { t: 2, jp: '{名前|なまえ}、{何|なん}だっけ？', q: ['What was your name again?', 'Nice name', 'Write your name here'] },
  { t: 2, jp: 'エアコン、{強すぎ|つよすぎ|強い|~すぎ: too much}。', q: ['The AC is turned up too high', 'The AC is broken', 'Turn the AC on'] },
  { t: 2, jp: '{傘|かさ}、{忘れた|わすれた|忘れる|past}。', q: ['I forgot my umbrella', 'I lost my wallet', "It's raining"] },
  { t: 2, jp: '{ここ}、{座って|すわって|座る|~てもいい: may I}もいい？', q: ['Can I sit here?', 'Please sit down', "This seat's taken"] },
  { t: 2, jp: '{先週|せんしゅう}の{映画|えいが}、どうだった？', q: ['How was the movie last week?', 'Want to see a movie?', 'The movie starts soon'] },
  { t: 2, jp: '{静か|しずか}にして。{電話|でんわ}{中|ちゅう}。', q: ["Quiet, I'm on the phone", 'Call me later', 'Your phone is ringing'] },
  { t: 2, jp: '{鍵|かぎ}、{持ってる|もってる|持つ|~ている: have on you}？', q: ['Do you have the key?', 'Lock the door', "Where's the key?"] },
  { t: 3, jp: 'その{資料|しりょう}、{見せて|みせて|見せる|te-form}。', q: ['Show me those papers', 'Throw those papers away', 'Copy those papers'] },
  { t: 3, jp: '{終わったら|おわったら|終わる|~たら: when, once}、{連絡|れんらく}して。', q: ["Let me know when you're done", 'Finish it now', "Don't contact me"] },
  { t: 3, jp: '{部長|ぶちょう}には{言わないで|いわないで|言う|~ないで: please don\'t}。', q: ["Don't tell the department head", 'Tell the department head', 'The department head knows'] },
  { t: 3, jp: '{雨|あめ}、{降りそう|ふりそう|降る|~そう: looks like}だね。', q: ['Looks like rain', 'The rain stopped', "It's pouring"] },
  { t: 3, jp: '{印刷|いんさつ}、{終わった|おわった|終わる|past}？', q: ['Is the printing done?', 'Is the printer broken?', 'Print it again'] },
  { t: 3, jp: '{遅れる|おくれる}なら、{早く|はやく|早い}{言って|いって|言う|te-form}。', q: ["If you'll be late, say so early", "Don't be late", 'Come early'] },
  { t: 3, jp: 'これ、{使って|つかって|使う|~てもいい: may I}もいい？', q: ['Can I use this?', 'Can you use this?', "Don't use this"] },
  { t: 3, jp: '{十分後|じゅっぷんご}に{始める|はじめる}よ。', q: ['We start in ten minutes', 'We started ten minutes ago', 'It takes ten minutes'] },
  { t: 3, jp: '{疲れてる|つかれてる|疲れる|~ている}なら、{休んで|やすんで|休む|~ていい: you may}いいよ。', q: ["If you're tired, you can rest", 'You look tired', "Don't rest yet"] },
  { t: 4, jp: '{締め切り|しめきり}、{延びた|のびた|延びる|past}って。', q: ['The deadline got pushed back', 'The deadline is today', 'We missed the deadline'] },
  { t: 4, jp: '{営業|えいぎょう}の{人|ひと}って、{怖い|こわい}よね。', q: ['Sales people are scary, right?', 'Sales are going well', 'Sales called you'] },
  { t: 4, jp: '{忙しい|いそがしい}のに、{悪い|わるい}ね。', q: ['Sorry, when you\'re this busy', "You're too busy", 'Being busy is bad'] },
  { t: 4, jp: '{荷物|にもつ}、{届いた|とどいた|届く|past}？', q: ['Did the package arrive?', 'Send the package', 'Carry the package'] },
  { t: 4, jp: '{課長|かちょう}、{今日|きょう}は{来ない|こない|来る|negative}って。', q: ["The section chief isn't coming today", 'The section chief is here now', 'The section chief is coming later'] },
  { t: 4, jp: '{席|せき}、{替わって|かわって|替わる|te-form}くれない？', q: ['Could we swap seats?', 'Is this seat free?', 'Please sit down'] },
  { t: 4, jp: '{頭|あたま}{痛い|いたい}から、{早退|そうたい}する。', q: ["Headache. I'm leaving early", "I'm running late", "Headache. I'll take something"] },
];
const TIERS_FOR = [[1], [1], [1, 2], [2, 3], [3, 4], [4, 3]];

/* ---------------- level check ---------------- */
import { KANJI_TIER } from '../lexicon.js';
const HIRA = [
  { w: 'ねこ', a: ['neko', 'nuko', 'meko', 'neka'] },
  { w: 'さかな', a: ['sakana', 'sakama', 'kasana', 'sakina'] },
  { w: 'でんしゃ', a: ['densha', 'denshi', 'tensha', 'denya'] },
  { w: 'きょう', a: ['kyou', 'kiyou', 'kyuu', 'chou'] },
  { w: 'ちょっと', a: ['chotto', 'choto', 'chitto', 'tsotto'] },
  { w: 'わすれた', a: ['wasureta', 'wasuneta', 'nesureta', 'wasurete'] },
];
const KATA = [
  { w: 'テレビ', a: ['terebi', 'tenebi', 'terehi', 'tarebi'] },
  { w: 'コーヒー', a: ['koohii', 'kouhai', 'kohii', 'koohee'] },
  { w: 'シャツ', a: ['shatsu', 'nyatsu', 'shashi', 'tsuyatsu'] },
  { w: 'ソース', a: ['soosu', 'noosu', 'sooshi', 'nuusu'] },
  { w: 'パソコン', a: ['pasokon', 'basokon', 'pasoson', 'panokon'] },
  { w: 'メール', a: ['meeru', 'nuuru', 'meeko', 'mooru'] },
];
const KANJI_CHECK = [
  { w: '人', t: 1, a: ['ひと', 'いり', 'はち', 'にゅう'] },
  { w: '日本', t: 1, a: ['にほん', 'にちもと', 'ひほん', 'にっぽ'] },
  { w: '今日', t: 1, a: ['きょう', 'いまび', 'きゅう', 'きのう'] },
  { w: '電車', t: 1, a: ['でんしゃ', 'でんき', 'でんわ', 'くるま'] },
  { w: '名前', t: 1, a: ['なまえ', 'めいぜん', 'なまい', 'なもと'] },
  { w: '午後', t: 1, a: ['ごご', 'ごぜん', 'うしろ', 'こうご'] },
  { w: '仕事', t: 2, a: ['しごと', 'しこと', 'じごと', 'しっこと'] },
  { w: '地下', t: 2, a: ['ちか', 'じか', 'ちした', 'ちげ'] },
  { w: '写真', t: 2, a: ['しゃしん', 'しゃじん', 'しゃし', 'しゃっしん'] },
  { w: '会議', t: 3, a: ['かいぎ', 'かいき', 'がいぎ', 'かいじ'] },
  { w: '資料', t: 3, a: ['しりょう', 'しりょ', 'じりょう', 'しりゅう'] },
  { w: '営業', t: 4, a: ['えいぎょう', 'えいぎょ', 'えぎょう', 'えいごう'] },
];

const { stage, side } = shell({ proto: PROTO, title: 'Adaptive reader', side: `
  <p>Tap any word to see its meaning. That counts as a look-up.</p>
  <p id="lvInfo"></p>
  <p><button class="linkish" id="recheck">Redo the level check</button></p>` });

function levelInfo(l) { $('#lvInfo').innerHTML = `Level ${l}: ${LEVELS[l].sub}. Readings shown in ${S.prof.reading === 'romaji' ? 'romaji' : 'kana'}.`; }

// A word's tier is its hardest kanji.
for (const k of KANJI_CHECK) k.t = Math.max(...[...k.w].filter(c => /[\u3400-\u9fff]/.test(c)).map(c => KANJI_TIER[c] ?? 5));

async function check() {
  stage.innerHTML = '';
  const box = h('div', 'check'); stage.append(box);
  const res = { hira: 0, hiraN: 0, kata: 0, kataN: 0 };
  const quiz = async (items, kind) => {
    let miss = 0;
    for (const it of shuffle(items).slice(0, 5)) {
      if (miss >= 2) break;
      box.innerHTML = `<p class="muted">${kind === 'hira' ? 'Hiragana' : 'Katakana'}: how is this read?</p><div class="line" lang="ja">${it.w}</div><div class="opts grid2">${shuffle(it.a).map(a => `<button class="opt" data-a="${a}">${a}</button>`).join('')}</div><p class="skipq"><button class="linkish" data-a="?">No idea</button></p>`;
      const a = await new Promise(r => box.querySelectorAll('[data-a]').forEach(b => b.onclick = () => r(b.dataset.a)));
      const ok = a === it.a[0];
      res[kind + 'N']++; if (ok) res[kind]++; else miss++;
      for (const ch of it.w) kanaMark(ch, ok);
      box.querySelector(`[data-a="${it.a[0]}"]`).classList.add('right');
      if (!ok && a !== '?') box.querySelector(`[data-a="${a}"]`)?.classList.add('wrong');
      await sleep(ok ? 350 : 800);
    }
  };
  await quiz(HIRA, 'hira');
  await quiz(KATA, 'kata');
  // Kanji: tap the words you can read, then prove a few.
  box.innerHTML = `<p class="muted">Tap every word you can read. Leave the rest.</p><div class="kgrid">${KANJI_CHECK.map((k, i) => `<button class="ktile" data-i="${i}" lang="ja">${k.w}</button>`).join('')}</div><div class="end-row"><button class="btn" id="kDone">Done</button></div>`;
  box.querySelectorAll('.ktile').forEach(b => b.onclick = () => b.classList.toggle('on'));
  await new Promise(r => $('#kDone', box).onclick = r);
  const claimed = [...box.querySelectorAll('.ktile.on')].map(b => KANJI_CHECK[+b.dataset.i]);
  const proof = claimed.sort((a, b) => b.t - a.t).slice(0, 3);
  const confirmed = [], failed = [];
  for (const k of proof) {
    box.innerHTML = `<p class="muted">Which reading?</p><div class="line" lang="ja">${k.w}</div><div class="opts grid2">${shuffle(k.a).map(a => `<button class="opt" lang="ja" data-a="${a}">${a}</button>`).join('')}</div>`;
    const a = await new Promise(r => box.querySelectorAll('[data-a]').forEach(b => b.onclick = () => r(b.dataset.a)));
    (a === k.a[0] ? confirmed : failed).push(k);
    box.querySelector(`[data-a="${k.a[0]}"]`).classList.add('right');
    await sleep(a === k.a[0] ? 300 : 700);
  }
  const top = confirmed.length ? Math.max(...confirmed.map(k => k.t)) : 0;
  // One step above the hardest tier read, only when two words at that tier were read.
  let level = confirmed.length ? top + (confirmed.filter(k => k.t === top).length >= 2 ? 1 : 0) : (claimed.length ? 1 : 0);
  for (const k of failed) level = Math.min(level, k.t);
  const hiraRate = res.hira / Math.max(1, res.hiraN);
  if (hiraRate < .5) level = Math.min(level, 1);
  else if (level === 0) level = 1;
  level = Math.max(0, Math.min(5, level));
  // Kanji of confirmed words read plain from now on.
  for (const k of confirmed) for (const ch of k.w) if (/[㐀-鿿]/.test(ch)) S.kanji[ch] = { ok: [], miss: 0, st: 2 };
  S.prof.reading = hiraRate < .7 ? 'romaji' : 'kana';
  S.prof.kata = res.kata / Math.max(1, res.kataN);
  S.prof.calibrated = true;
  setLevel(PROTO, level, true);
  for (const p of Object.keys(S.prof.lv)) S.prof.lv[p] = level;
  save();
  box.innerHTML = `<h2>Level ${level}: ${LEVELS[level].name}</h2>
    <p>${LEVELS[level].sub}. Hiragana ${res.hira}/${res.hiraN}, katakana ${res.kata}/${res.kataN}. Readings will show in ${S.prof.reading}.</p>
    <p class="muted">The other prototypes start from this level too, and every one of them keeps adjusting as you play.</p>
    <div class="end-row"><button class="btn" id="goRead">Start reading</button></div>`;
  await new Promise(r => $('#goRead', box).onclick = r);
  history.replaceState(null, '', location.pathname);
  run();
}

/* ---------------- reading run ---------------- */
async function run() {
  let level = levelFor(PROTO) ?? 2;
  showLevel(level); levelInfo(level);
  const ad = new Adapter(level, { slowMs: 12000, win: 4 });
  const ses = new Session(PROTO, level);
  const used = new Set();
  stage.innerHTML = '';
  const prog = h('div', 'progress', Array.from({ length: RUN }, () => '<i></i>').join('')); stage.append(prog);
  const area = h('div', 'reader'); stage.append(area);
  enableLookups(area, () => ses.lookup());
  $('#lvlBtn').onclick = () => levelSheet(ad.level, l => { ad.level = l; ad.hist = []; setLevel(PROTO, l); showLevel(l); levelInfo(l); ses.level = l; });
  for (let i = 0; i < RUN; i++) {
    prog.children[i].className = 'now';
    const tiers = TIERS_FOR[ad.level];
    let pool = LINES.filter(l => tiers.includes(l.t) && !used.has(l));
    if (!pool.length) pool = LINES.filter(l => !used.has(l));
    // Lean toward the harder tier of the band.
    const top = pool.filter(l => l.t === Math.max(...tiers));
    const L = pick(top.length && Math.random() < .6 ? top : pool); used.add(L);
    area.innerHTML = `<div class="bubble"><div class="line" lang="ja">${renderJP(L.jp, { level: ad.level })}</div></div><div class="opts"></div>`;
    const optsEl = $('.opts', area);
    const opts = shuffle(L.q.map((q, j) => ({ q, ok: j === 0 })));
    optsEl.innerHTML = opts.map((o, j) => `<button class="opt" data-j="${j}">${o.q}</button>`).join('');
    ses.begin(labelJP(L.jp, ad.level));
    const j = await new Promise(r => optsEl.querySelectorAll('.opt').forEach(b => b.onclick = () => r(+b.dataset.j)));
    const ok = opts[j].ok;
    const looks = ses.cur.lookups;
    optsEl.querySelectorAll('.opt').forEach((b, k) => { b.disabled = true; if (opts[k].ok) b.classList.add('right'); else if (k === j) b.classList.add('wrong'); });
    const keys = keysOf(L.jp); wordSeen(keys);
    const line = $('.line', area);
    if (ok) {
      const looked = new Set([...area.querySelectorAll('.w.looked')].map(w => w.dataset.key));
      wordSuccess(keys.filter(k => !looked.has(k)));
      if (!looks) kanjiReadOK(shownKanji(line, 1));
    } else kanjiMiss(shownKanji(line, 2));
    for (const w of line.querySelectorAll('.w[data-note]')) if (w.dataset.note) grammarMark(noteGrammar(w.dataset.note), ok);
    const it = ses.end(ok);
    prog.children[i].className = ok ? 'done' : 'miss';
    const d = ad.push({ ok, lookups: looks, ms: it.ms });
    if (d) { ses.level = ad.level; setLevel(PROTO, ad.level); showLevel(ad.level); levelInfo(ad.level); toast(d > 0 ? `Level up: ${LEVELS[ad.level].name}` : `Easing off: ${LEVELS[ad.level].name}`, d > 0 ? 'up' : 'down'); }
    await sleep(ok ? 650 : 1500);
  }
  ses.finish(stage, { again: run });
}

$('#recheck').onclick = check;
if (location.hash === '#check' || !S.prof.calibrated) {
  stage.innerHTML = `<div class="intro"><h2>Quick level check</h2><p>About a minute: a few kana, then tap the kanji words you can read. It sets where every prototype starts.</p>
    <div class="end-row"><button class="btn" id="doCheck">Start the check</button><button class="btn ghost" id="skip">Skip, pick a level</button></div></div>`;
  $('#doCheck').onclick = check;
  $('#skip').onclick = () => levelSheet(levelFor(PROTO) ?? 2, l => { setLevel(PROTO, l, true); run(); }, { first: true });
  showLevel(levelFor(PROTO) ?? 2);
} else run();
addEventListener('hashchange', () => { if (location.hash === '#check') { document.querySelector('.sheet-bg')?.remove(); check(); } });
