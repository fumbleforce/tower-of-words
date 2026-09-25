// Listen and act: hear a line, then do what it says. Floors, directions, times, counts, things, people, days.
// Low levels follow along with karaoke text; higher levels hear it first and see the text only after acting.
import { S, $, h, sleep, pick, shuffle, shell, showLevel, levelSheet, setLevel, toast, renderJP, enableLookups, keysOf, plain,
  wordSuccess, wordSeen, grammarMark, noteGrammar, Adapter, Session, startLevel, LEVELS, sayLine, stopAudio, jaVoice, labelJP } from '../core.js';

const PROTO = 'listen';
const RUN = 10;

/* ---------------- vocab for templates ---------------- */
const FLOORS = [
  { id: 'B2', jp: '{地下二階|ちかにかい}' }, { id: 'B1', jp: '{地下一階|ちかいっかい}' }, { id: '1', jp: '{一階|いっかい}' }, { id: '2', jp: '{二階|にかい}' },
  { id: '3', jp: '{三階|さんがい}' }, { id: '4', jp: '{四階|よんかい}' }, { id: '5', jp: '{五階|ごかい}' },
];
const HOURS = [ // office hours: 9-12 morning, 1-6 afternoon
  [9, '{九時|くじ}'], [10, '{十時|じゅうじ}'], [11, '{十一時|じゅういちじ}'], [12, '{十二時|じゅうにじ}'], [13, '{一時|いちじ}'], [14, '{二時|にじ}'],
  [15, '{三時|さんじ}'], [16, '{四時|よじ}'], [17, '{五時|ごじ}'], [18, '{六時|ろくじ}'],
];
const HALF = { 9: '{九時半|くじはん}', 10: '{十時半|じゅうじはん}', 11: '{十一時半|じゅういちじはん}', 13: '{一時半|いちじはん}', 14: '{二時半|にじはん}', 15: '{三時半|さんじはん}', 16: '{四時半|よじはん}', 17: '{五時半|ごじはん}' };
// Hours that sound alike, used as distractors.
const NEAR = { 13: [19, 17, 14], 16: [17, 14, 11], 17: [13, 16, 11], 9: [10, 17, 11], 10: [9, 11, 12], 11: [17, 10, 12], 12: [11, 14, 10], 14: [12, 13, 15], 15: [13, 14, 18], 18: [16, 13, 15] };
const COUNTERS = [
  { tpl: 'コピー、{N}お{願い|ねがい}。', c: [[1, '{一部|いちぶ}'], [2, '{二部|にぶ}'], [3, '{三部|さんぶ}'], [4, '{四部|よんぶ}'], [5, '{五部|ごぶ}'], [6, '{六部|ろくぶ}'], [7, '{七部|ななぶ}'], [8, '{八部|はちぶ}'], [10, '{十部|じゅうぶ}']], t: 1 },
  { tpl: '{紙|かみ}、{N}ちょうだい。', c: [[1, '{一枚|いちまい}'], [2, '{二枚|にまい}'], [3, '{三枚|さんまい}'], [4, '{四枚|よんまい}'], [5, '{五枚|ごまい}'], [7, '{七枚|ななまい}'], [8, '{八枚|はちまい}'], [10, '{十枚|じゅうまい}']], t: 1 },
  { tpl: '{椅子|いす}、あと{N}{要る|いる}。', c: [[1, '{一つ|ひとつ}'], [2, '{二つ|ふたつ}'], [3, '{三つ|みっつ}'], [4, '{四つ|よっつ}'], [5, '{五つ|いつつ}'], [6, '{六つ|むっつ}'], [7, '{七つ|ななつ}'], [8, '{八つ|やっつ}']], t: 2 },
  { tpl: '{今日|きょう}は{N}{来る|くる}って。', c: [[1, '{一人|ひとり}'], [2, '{二人|ふたり}'], [3, '{三人|さんにん}'], [4, '{四人|よにん}'], [5, '{五人|ごにん}'], [6, '{六人|ろくにん}'], [8, '{八人|はちにん}']], t: 2 },
];
const THINGS = [
  { icon: 'pen', jp: ['その{ペン}、{取って|とって|取る|te-form: asking}。'] },
  { icon: 'umbrella', jp: ['{傘|かさ}、{貸して|かして|貸す|te-form: asking}。', '{傘|かさ}、{忘れない|わすれない|忘れる|negative}でね。'] },
  { icon: 'key', jp: ['{鍵|かぎ}、どこ？', '{鍵|かぎ}、{持ってる|もってる|持つ|~ている}？'] },
  { icon: 'coffee', jp: ['コーヒー、{持って|もって|持つ}きて。'] },
  { icon: 'book', jp: ['その{本|ほん}、{読んで|よんで|読む|te-form}いい？', '{本|ほん}、{返して|かえして|返す|te-form: asking}。'] },
  { icon: 'scissors', jp: ['はさみ、ある？'] },
  { icon: 'camera', jp: ['カメラ、{見せて|みせて|見せる|te-form: asking}。'] },
  { icon: 'wallet', jp: ['{財布|さいふ}、{落とした|おとした|落とす|past}よ。'] },
  { icon: 'envelope', jp: ['{封筒|ふうとう}、{一枚|いちまい}ちょうだい。'] },
  { icon: 'device-mobile', jp: ['{携帯|けいたい}、{鳴ってる|なってる|鳴る|~ている}よ。'] },
  { icon: 'laptop', jp: ['パソコン、{借りて|かりて|借りる|te-form}いい？'] },
  { icon: 'handbag', jp: ['{鞄|かばん}、{置いて|おいて|置く|te-form}いいよ。'] },
];
const COLORS = [
  { id: 'red', css: '#e8452c', jp: '{赤|あか}い' }, { id: 'blue', css: '#4f8fe8', jp: '{青|あお}い' }, { id: 'white', css: '#f1f3f6', jp: '{白|しろ}い' },
  { id: 'black', css: '#2a2e36', jp: '{黒|くろ}い' }, { id: 'yellow', css: '#e8c84f', jp: '{黄色|きいろ}い' }, { id: 'green', css: '#58b27a', jp: '{緑|みどり}の' },
];
const PERSON_TPL = ['{N}シャツの{人|ひと}に{渡して|わたして|渡す|te-form: asking}。', '{N}{服|ふく}の{人|ひと}、{誰|だれ}？', '{N}{服|ふく}の{人|ひと}を{呼んで|よんで|呼ぶ|te-form: asking}。'];
const DAYS = [
  { id: 'Mon', jp: '{月曜日|げつようび}' }, { id: 'Tue', jp: '{火曜日|かようび}' }, { id: 'Wed', jp: '{水曜日|すいようび}' }, { id: 'Thu', jp: '{木曜日|もくようび}' },
  { id: 'Fri', jp: '{金曜日|きんようび}' }, { id: 'Sat', jp: '{土曜日|どようび}' }, { id: 'Sun', jp: '{日曜日|にちようび}' },
];
const DAY_TPL = ['{N}、ひま？', '{N}に{会おう|あおう|会う|volitional: let\'s}。', '{N}は{休み|やすみ}だよ。'];
const DIRS = [
  { id: 'right', jp: ['{右|みぎ}に{曲がって|まがって|曲がる|te-form: asking}。', '{出口|でぐち}は{右|みぎ}だよ。', '{右|みぎ}の{ドア}ね。'] },
  { id: 'left', jp: ['{左|ひだり}に{曲がって|まがって|曲がる|te-form: asking}。', '{左|ひだり}の{ドア}ね。', 'トイレは{左|ひだり}。'] },
  { id: 'ahead', jp: ['まっすぐ{行って|いって|行く|te-form: asking}。', 'このまま、まっすぐね。'] },
  { id: 'back', jp: ['{後ろ|うしろ}、{見て|みて|見る|te-form: asking}。', '{後ろ|うしろ}にいるよ。'] },
];
const FLOOR_TPL = [{ t: 1, s: 'エレベーターで{N}ね。' }, { t: 1, s: '{N}に{来て|きて|来る|te-form: asking}。' }, { t: 2, s: '{会議室|かいぎしつ}は{N}だよ。' }, { t: 3, s: '{N}の{奥|おく}の{部屋|へや}。' }];
const TIME_TPL = [{ t: 1, s: '{会議|かいぎ}は{N}から。' }, { t: 1, s: '{N}までにね。' }, { t: 2, s: '{N}に{会おう|あおう|会う|volitional: let\'s}。' }, { t: 3, s: '{N}に{始まる|はじまる}って。' }];

// Real recorded lines from the game's cast (copied into ./audio). src tags them on screen.
const VOICED = [
  { file: 'b9af7f67', who: 'Announcement', t: 2, jp: 'まもなく、{天川|あまかわ}シティ{中央駅|ちゅうおうえき}です。お{出口|でぐち}は{右側|みぎがわ}です。', steps: [{ type: 'dir', ans: 'right' }] },
  { file: '3d3fd3f0', who: 'Emi', t: 3, jp: '{三階|さんがい}の{営業部|えいぎょうぶ}に{行って|いって|行く}、{黒田|くろだ}さんから{書類|しょるい}をもらってきて。', steps: [{ type: 'floor', ans: '3' }] },
  { file: 'c9b5e32a', who: 'Emi', t: 1, jp: '{十一時|じゅういちじ}までにね。', steps: [{ type: 'time', ans: '11:00', opts: ['11:00', '17:00', '10:00', '12:00'] }] },
  { file: '77d5f8e6', who: 'Rei', t: 3, jp: '{悪い|わるい}けど、{今|いま}{忙しい|いそがしい}の。{午後|ごご}に{来て|きて|来る}。', steps: [{ type: 'time', ans: '14:00', opts: ['9:30', '10:30', '11:30', '14:00'] }] },
  { file: '17648e4a', who: 'Mio', t: 3, jp: 'バックアップは、{地下一階|ちかいっかい}の{倉庫|そうこ}にある。でも、かぎがない。', steps: [{ type: 'floor', ans: 'B1' }] },
  { file: 'df985206', who: 'Mio', t: 3, jp: 'かぎは、{五階|ごかい}の{役員室|やくいんしつ}。……{私|わたし}は{行かない|いかない|行く}。こわいから。', steps: [{ type: 'floor', ans: '5' }] },
  { file: 'a5598a08', who: 'Aoi', t: 2, jp: '{部長|ぶちょう}の{資料|しりょう}！　{百枚|ひゃくまい}！　{十時|じゅうじ}まで！', steps: [{ type: 'count', ans: 100, opts: [10, 100, 1000, 7] }, { type: 'time', ans: '10:00', opts: ['10:00', '9:00', '11:00', '16:00'] }] },
  { file: 'bd35bb27', who: 'Mio', t: 1, jp: '{新人|しんじん}くん、{土曜日|どようび}、ひま？', steps: [{ type: 'day', ans: 'Sat' }] },
  { file: '447928fe', who: 'Jun', t: 2, jp: '{日曜日|にちようび}の{朝|あさ}の{市場|いちば}、いいよ。', steps: [{ type: 'day', ans: 'Sun' }] },
  { file: '163b867b', who: 'Ishibashi', t: 2, jp: '{見ない|みない|見る}{顔|かお}だな。IDカードは？', steps: [{ type: 'thing', ans: 'identification-card', opts: ['identification-card', 'wallet', 'key', 'envelope', 'device-mobile', 'book'] }] },
  { file: 'a5bfab6c', who: 'Jun', t: 1, jp: '{金曜日|きんようび}だね。ビール？', steps: [{ type: 'thing', ans: 'beer-stein', opts: ['beer-stein', 'coffee', 'wine', 'pint-glass', 'cake', 'pizza'] }] },
  { file: '68248694', who: 'Aoi', t: 2, jp: 'これ、{昨日|きのう}のお{礼|れい}！　{缶|かん}コーヒー。{好き|すき}？', steps: [{ type: 'thing', ans: 'coffee', opts: ['coffee', 'beer-stein', 'cake', 'cookie', 'bread', 'orange'] }] },
  { file: '8bdf81fe', who: 'Yuzuki', t: 2, jp: 'じゃあ、{写真|しゃしん}。アオイさんも、ここに{立って|たって|立つ}。', steps: [{ type: 'thing', ans: 'camera', opts: ['camera', 'pen', 'book', 'umbrella', 'laptop', 'scissors'] }] },
];

const fmt = n => `${Math.floor(n)}:${n % 1 ? '30' : '00'}`;
function gen(level) {
  const type = pick(level >= 3 ? ['floor', 'dir', 'time', 'count', 'thing', 'person', 'day', 'combo', 'combo'] : ['floor', 'dir', 'time', 'count', 'thing', 'person', 'day']);
  const tMax = level <= 1 ? 1 : level === 2 ? 2 : 3;
  if (type === 'floor') { const f = pick(FLOORS), tp = pick(FLOOR_TPL.filter(x => x.t <= tMax)); return { jp: tp.s.replace('{N}', f.jp), steps: [{ type, ans: f.id }] }; }
  if (type === 'dir') { const d = pick(DIRS); return { jp: pick(d.jp), steps: [{ type, ans: d.id }] }; }
  if (type === 'time') {
    const [hr, w] = pick(HOURS); const half = level >= 2 && HALF[hr] && Math.random() < .5;
    const tp = pick(TIME_TPL.filter(x => x.t <= tMax));
    const ans = hr + (half ? .5 : 0);
    const opts = [ans, ...NEAR[hr].map(x => x + (half ? .5 : 0))];
    if (half) opts[3] = hr;
    return { jp: tp.s.replace('{N}', half ? HALF[hr] : w), steps: [{ type, ans: fmt(ans), opts: opts.map(fmt) }] };
  }
  if (type === 'count') {
    const C = pick(COUNTERS.filter(c => c.t <= Math.max(1, tMax))); const [n, w] = pick(C.c);
    const near = { 1: [7, 2, 8], 2: [10, 3, 8], 3: [4, 8, 6], 4: [7, 5, 3], 5: [9, 1, 4], 6: [8, 3, 9], 7: [1, 4, 8], 8: [6, 3, 1], 10: [2, 6, 8] }[n] || [2, 3, 4];
    return { jp: C.tpl.replace('{N}', w), steps: [{ type, ans: n, opts: [n, ...near] }] };
  }
  if (type === 'thing') { const t = pick(THINGS); return { jp: pick(t.jp), steps: [{ type, ans: t.icon, opts: [t.icon, ...shuffle(THINGS.filter(x => x !== t)).slice(0, level <= 1 ? 3 : 5).map(x => x.icon)] }] }; }
  if (type === 'person') { const c = pick(COLORS); return { jp: pick(PERSON_TPL).replace('{N}', c.jp), steps: [{ type, ans: c.id, opts: [c.id, ...shuffle(COLORS.filter(x => x !== c)).slice(0, level <= 1 ? 2 : 4).map(x => x.id)] }] }; }
  if (type === 'day') { const d = pick(DAYS); return { jp: pick(DAY_TPL).replace('{N}', d.jp), steps: [{ type, ans: d.id }] }; }
  // Two things in one line.
  if (Math.random() < .5) { const f = pick(FLOORS), d = pick(DIRS.slice(0, 2)); return { jp: `${f.jp}の${d.id === 'right' ? '{右|みぎ}' : '{左|ひだり}'}の{部屋|へや}。`, steps: [{ type: 'floor', ans: f.id }, { type: 'dir', ans: d.id }] }; }
  const dd = pick(DAYS), [hr, w] = pick(HOURS);
  return { jp: `${dd.jp}の${w}ね。`, steps: [{ type: 'day', ans: dd.id }, { type: 'time', ans: fmt(hr), opts: [hr, ...NEAR[hr]].map(fmt) }] };
}

/* ---------------- act panels ---------------- */
const PROMPT = { floor: 'Press the floor', dir: 'Which way?', time: 'When?', count: 'How many?', thing: 'Tap it', person: 'Tap the person', day: 'Which day?' };
function panel(step, level) {
  const t = step.type;
  if (t === 'floor') return `<div class="lift">${['5', '4', '3', '2', '1', 'B1', 'B2'].map(f => `<button class="act fl" data-a="${f}">${f}</button>`).join('')}</div>`;
  if (t === 'dir') return `<div class="dirs"><button class="act d-ahead" data-a="ahead"><i class="ph-fill ph-arrow-up"></i></button><button class="act d-left" data-a="left"><i class="ph-fill ph-arrow-left"></i></button><span class="you"><i class="ph-fill ph-person-simple"></i></span><button class="act d-right" data-a="right"><i class="ph-fill ph-arrow-right"></i></button><button class="act d-back" data-a="back"><i class="ph-fill ph-arrow-down"></i></button></div>`;
  if (t === 'time') return `<div class="grid">${shuffle(step.opts).map(o => `<button class="act clock" data-a="${o}">${o}</button>`).join('')}</div>`;
  if (t === 'count') return `<div class="grid">${shuffle(step.opts).map(o => `<button class="act num" data-a="${o}">${o}</button>`).join('')}</div>`;
  if (t === 'thing') return `<div class="grid">${shuffle(step.opts).map(o => `<button class="act thing" data-a="${o}" aria-label="${o}"><i class="ph-fill ph-${o}"></i></button>`).join('')}</div>`;
  if (t === 'person') return `<div class="people">${shuffle(step.opts).map(o => `<button class="act person" data-a="${o}" aria-label="${o}" style="--c:${COLORS.find(c => c.id === o).css}"><i class="ph-fill ph-person"></i></button>`).join('')}</div>`;
  if (t === 'day') return `<div class="week">${DAYS.map(d => `<button class="act wday" data-a="${d.id}">${d.id}</button>`).join('')}</div>`;
}

const { stage } = shell({ proto: PROTO, title: 'Listen and act', side: `
  <p>Listen, then do what the line says. Replay is slower.</p>
  <p id="mode"></p><p id="tts" class="src"></p>` });

const modeFor = level => level <= 1 ? 'karaoke+ruby' : level === 2 ? 'karaoke' : 'listen-first';
const rateFor = level => level <= 1 ? .85 : level >= 4 ? 1.1 : 1;
const MODE_TXT = { 'karaoke+ruby': 'Text follows the voice, with readings.', karaoke: 'Text follows the voice.', 'listen-first': 'Voice first. The text appears after you act.' };

async function run(level) {
  showLevel(level);
  let v = null;
  jaVoice().then(x => { v = x; $('#tts').textContent = x ? `Browser voice: ${x.name}` : 'No Japanese browser voice on this device. Lines without a recording play as timed text.'; });
  const ad = new Adapter(level, { slowMs: 12000 });
  const ses = new Session(PROTO, level);
  let replays = 0;
  $('#lvlBtn').onclick = () => levelSheet(ad.level, l => { ad.level = l; ad.hist = []; setLevel(PROTO, l); showLevel(l); ses.level = l; });
  stage.innerHTML = '';
  const prog = h('div', 'progress', Array.from({ length: RUN }, () => '<i></i>').join('')); stage.append(prog);
  const area = h('div', 'listen'); stage.append(area);
  enableLookups(area, () => ses.lookup());
  const usedVoice = new Set();
  for (let i = 0; i < RUN; i++) {
    prog.children[i].className = 'now';
    const lv = ad.level, mode = modeFor(lv);
    $('#mode').textContent = MODE_TXT[mode];
    const vpool = VOICED.filter(x => x.t <= Math.max(1, lv) && !usedVoice.has(x));
    let item;
    if (vpool.length && Math.random() < .35) { item = pick(vpool); usedVoice.add(item); } else item = gen(lv);
    const hidden = mode === 'listen-first';
    area.innerHTML = `
      <div class="src">${item.file ? `Recorded voice: ${item.who}` : v ? 'Browser voice (TTS)' : 'No audio: read along'}</div>
      <div class="linebox ${hidden ? 'hidden' : ''}"><div class="line" lang="ja">${renderJP(item.jp, { level: lv })}</div><div class="veil">Listening</div></div>
      <div class="tools"><button class="btn ghost small" id="rep"><i class="ph ph-arrow-counter-clockwise"></i>Again, slower</button>${hidden ? '<button class="linkish" id="showT">Show text</button>' : ''}</div>
      <p class="prompt"></p><div class="panel"></div>`;
    const play = async (rate) => { const line = $('.line', area); const fresh = line.cloneNode(true); fresh.classList.remove('karaoke', 'done'); fresh.querySelectorAll('.k').forEach(k => k.replaceWith(k.textContent)); line.replaceWith(fresh); return sayLine(area.querySelector('.line'), { file: item.file ? `../audio/${item.file}.mp3` : null, text: plain(item.jp), rate, follow: !hidden }); };
    ses.begin(labelJP(item.jp, lv));
    let peek = false;
    play(rateFor(lv));
    $('#rep').onclick = () => { ses.replay(); replays++; play(.85 * rateFor(lv)); };
    if (hidden) $('#showT').onclick = () => { peek = true; ses.lookup(); area.querySelector('.linebox').classList.remove('hidden'); $('#showT').remove(); };
    let allOk = true;
    for (const [si, step] of item.steps.entries()) {
      $('.prompt', area).textContent = (item.steps.length > 1 ? `${si + 1} of ${item.steps.length}: ` : '') + PROMPT[step.type];
      const p = $('.panel', area); p.innerHTML = panel(step, lv);
      const a = await new Promise(r => p.querySelectorAll('.act').forEach(b => b.onclick = () => r(b.dataset.a)));
      const ok = String(a) === String(step.ans);
      p.querySelectorAll('.act').forEach(b => { b.disabled = true; if (String(b.dataset.a) === String(step.ans)) b.classList.add('right'); else if (b.dataset.a === a) b.classList.add('wrong'); });
      if (!ok) allOk = false;
      await sleep(ok ? 450 : 1100);
    }
    area.querySelector('.linebox').classList.remove('hidden');
    const it = ses.end(allOk);
    const keys = keysOf(item.jp); wordSeen(keys);
    if (allOk && !it.replays && !peek) wordSuccess(keys);
    for (const w of area.querySelectorAll('.line .w[data-note]')) if (w.dataset.note) grammarMark(noteGrammar(w.dataset.note), allOk);
    grammarMark('listen:' + item.steps.map(s => s.type).join('+'), allOk);
    prog.children[i].className = allOk ? 'done' : 'miss';
    const d = ad.push({ ok: allOk, lookups: it.lookups + it.replays, ms: it.ms });
    if (d) { ses.level = ad.level; setLevel(PROTO, ad.level); showLevel(ad.level); toast(d > 0 ? `Level up: ${MODE_TXT[modeFor(ad.level)]}` : `Easing off: ${MODE_TXT[modeFor(ad.level)]}`, d > 0 ? 'up' : 'down'); }
    await sleep(hidden ? 1400 : 700);
    stopAudio();
  }
  ses.finish(stage, { extraRows: [['Replays', replays, 'slower repeats']], again: () => run(ad.level) });
}

startLevel(PROTO).then(run);
