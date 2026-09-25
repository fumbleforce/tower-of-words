// Register choice: someone speaks to you; you pick a casual or polite reply. The feedback is their reaction.
import { S, $, h, sleep, pick, shuffle, shell, showLevel, levelSheet, setLevel, toast, renderJP, enableLookups, keysOf, plain,
  wordSuccess, wordSeen, grammarMark, noteGrammar, Adapter, Session, startLevel, sayLine, stopAudio, labelJP } from '../core.js';

const PROTO = 'register';
const RUN = 8;

// exp: which register fits. Replies: c casual, p polite, x misunderstood. mood: warm, ok, cool, cold, confused, amused.
const EX = [
  { t: 1, who: 'Coworker', ctx: 'Your age, sits next to you.', icon: 'user', exp: 'c', line: 'それ、{新しい|あたらしい}パソコン？',
    c: ['うん、{昨日|きのう}{来た|きた|来る|past}。', 'いいなあ。', 'warm'], p: ['はい、{昨日|きのう}{来ました|きました|来る|polite past}。', '……なんで{敬語|けいご}？', 'cool'], x: ['うん、{明日|あした}{行く|いく}。', 'え？　パソコンの{話|はなし}だよ。', 'confused'],
    why: 'Same age, same team: casual is normal. Polite keeps them at arm\'s length.' },
  { t: 1, who: 'Friend at a bar', ctx: 'Your age. You drink together often.', icon: 'beer-stein', exp: 'c', line: '{何|なに}{飲む|のむ}？',
    c: ['ビール！', 'よし、{乾杯|かんぱい}しよう。', 'warm'], p: ['ビールをお{願い|ねがい}します。', '{店員|てんいん}じゃないよ、{私|わたし}。', 'amused'], x: ['{三時|さんじ}だよ。', '……{時間|じかん}は{聞いて|きいて|聞く}ないよ。', 'confused'],
    why: 'Friends talk casually. Polite ordering sounds like you think she is the waiter.' },
  { t: 1, who: 'Dorm neighbour', ctx: 'Your age. She spoke casually first.', icon: 'house', exp: 'c', line: '{朝|あさ}、うるさかった？　ごめんね。',
    c: ['ううん、{大丈夫|だいじょうぶ}。', 'よかった。', 'warm'], p: ['いいえ、{大丈夫|だいじょうぶ}です。', 'かたいなあ。{同い年|おないどし}でしょ。', 'cool'], x: ['うん、おいしかった。', '……え、{何|なに}が？', 'confused'],
    why: 'Same age, and she used casual speech first. Match her.' },
  { t: 1, who: 'Coworker', ctx: 'Your age. Monday morning.', icon: 'user', exp: 'c', line: '{週末|しゅうまつ}、{何|なに}してた？',
    c: ['ずっと{寝てた|ねてた|寝る|~ていた: was doing}。', 'わかる。', 'warm'], p: ['ずっと{寝て|ねて|寝る}いました。', 'なんで{急|きゅう}に{丁寧|ていねい}？', 'cool'], x: ['{月曜日|げつようび}だよ。', '……{知ってる|しってる|知る}。', 'confused'],
    why: 'Casual with a peer. A sudden switch to polite sounds cold.' },
  { t: 1, who: 'Drinking buddy', ctx: 'Your age. It is late.', icon: 'beer-stein', exp: 'c', line: 'もう{一杯|いっぱい}{飲もう|のもう|飲む|volitional: let\'s}よ。',
    c: ['もう{無理|むり}。{帰る|かえる}。', 'えー、つまんない。', 'ok'], p: ['もう{無理|むり}です。{帰ります|かえります|帰る|polite}。', 'え、{急|きゅう}にどうしたの？', 'cool'], x: ['うん、{帰ろう|かえろう|帰る|volitional}。', 'え、どっち？', 'confused'],
    why: 'Friends stay casual, even when saying no.' },
  { t: 1, who: 'Intern', ctx: 'Younger than you, first week, a bit lost.', icon: 'user', exp: 'c', line: 'あの、コピー{機|き}は、どこですか？',
    c: ['{地下|ちか}だよ。{一緒|いっしょ}に{行こう|いこう|行く|volitional: let\'s}。', 'ありがとうございます！', 'warm'], p: ['{地下|ちか}です。{一緒|いっしょ}に{行きましょう|いきましょう|行く|polite volitional}。', 'あ、はい……すみません。', 'ok'], x: ['{三時|さんじ}からだよ。', 'え？　コピー{機|き}……。', 'confused'],
    why: 'Seniors usually talk casually to a new intern. Polite is not wrong, just formal, and it makes her nervous.' },
  { t: 2, who: 'Security guard', ctx: 'In his fifties, on duty at the gate.', icon: 'shield', exp: 'p', line: '{社員証|しゃいんしょう}は？',
    p: ['はい、これです。', 'よし。{通って|とおって|通る}いいよ。', 'ok'], c: ['あ、これこれ。', '……{次|つぎ}から、ちゃんとね。', 'cool'], x: ['{九時|くじ}です。', '{時間|じかん}は{聞いて|きいて|聞く}ない。', 'confused'],
    why: 'An older stranger on duty: polite is expected. Casual sounds cheeky.' },
  { t: 2, who: 'Department head', ctx: 'In his sixties. You share the lift.', icon: 'user-circle', exp: 'p', line: '{新人|しんじん}か。もう{慣れた|なれた|慣れる|past}？',
    p: ['はい、{少し|すこし}{慣れました|なれました|慣れる|polite past}。', 'そうか。がんばって。', 'warm'], c: ['うん、{少し|すこし}。', '……うん？', 'cold'], x: ['はい、{新しい|あたらしい}です。', '……そうじゃなくて。', 'confused'],
    why: 'A senior manager: polite. A casual うん lands badly.' },
  { t: 2, who: 'Client', ctx: 'First meeting, at your office.', icon: 'handshake', exp: 'p', line: 'はじめまして。{田中|たなか}です。',
    p: ['はじめまして。よろしくお{願い|ねがい}します。', 'よろしくお{願い|ねがい}します。', 'warm'], c: ['よろしく！', '……あ、はい。', 'cool'], x: ['{田中|たなか}です。', '……え、{私|わたし}も{田中|たなか}です。', 'amused'],
    why: 'A client at a first meeting: polite, always.' },
  { t: 2, who: 'Senior colleague', ctx: 'Five years ahead of you. Talks casually to you.', icon: 'user', exp: 'p', line: 'お{昼|ひる}、もう{食べた|たべた|食べる|past}？',
    p: ['まだです。', 'じゃあ、{一緒|いっしょ}に{行こう|いこう|行く|volitional: let\'s}。', 'warm'], c: ['まだ。', '……まあ、いいけど。', 'cool'], x: ['はい、お{昼|ひる}です。', '……うん、お{昼|ひる}だね。', 'confused'],
    why: 'A senpai can talk casually to you. You still answer politely.' },
  { t: 2, who: 'Your manager', ctx: 'Forties, strict, talks casually to the team.', icon: 'user-circle', exp: 'p', line: 'この{資料|しりょう}、{明日|あした}までにできる？',
    p: ['はい、できます。', '{頼む|たのむ}よ。', 'warm'], c: ['うん、{大丈夫|だいじょうぶ}。', '……「うん」？', 'cold'], x: ['はい、{昨日|きのう}しました。', '……{明日|あした}の{話|はなし}だよ。', 'confused'],
    why: 'Your manager: polite, even when they talk casually to you.' },
  { t: 2, who: 'Shop clerk', ctx: 'At the convenience store. You are the customer.', icon: 'storefront', exp: 'e', line: '{袋|ふくろ}、{要ります|いります|要る|polite}か？',
    c: ['あ、{大丈夫|だいじょうぶ}。', 'はい。', 'ok'], p: ['{大丈夫|だいじょうぶ}です。', 'かしこまりました。', 'ok'], x: ['コーヒーです。', '……{袋|ふくろ}のことです。', 'confused'],
    why: 'As a customer, a short casual answer and a polite one are both fine. 大丈夫 here means "no thanks".' },
  { t: 2, who: 'Junior coworker', ctx: 'Two years younger. Speaks politely to you.', icon: 'user', exp: 'c', line: '{先輩|せんぱい}、これ、{見て|みて|見る}もらえますか？',
    c: ['いいよ。{見せて|みせて|見せる|te-form: asking}。', 'ありがとうございます！', 'warm'], p: ['はい、{見せて|みせて|見せる}ください。', 'え、あ、はい……。', 'ok'], x: ['うん、{見た|みた|見る|past}よ。', 'え、まだ{見せて|みせて|見せる}ないです。', 'confused'],
    why: 'Your junior is polite to you; you can answer casually. Polite back is fine but stiff.' },
  { t: 3, who: 'Gardener on the roof', ctx: 'In his seventies, very easygoing.', icon: 'plant', exp: 'p', soft: true, line: 'トマト、{食べる|たべる}？',
    p: ['いいんですか？　いただきます。', 'どうぞ、どうぞ。', 'warm'], c: ['{食べる|たべる}！', 'はは、{元気|げんき}だね。', 'amused'], x: ['はい、{五時|ごじ}です。', '……{時間|じかん}？', 'confused'],
    why: 'He is much older, so polite is safer. He is easygoing, so casual only gets a laugh.' },
  { t: 3, who: 'Receptionist', ctx: 'At a client\'s company. You are visiting.', icon: 'buildings', exp: 'p', line: 'どちら{様|さま}ですか？',
    p: ['{天川|あまかわ}から{来ました|きました|来る|polite past}。', 'どうぞ、こちらへ。', 'warm'], c: ['{天川|あまかわ}から{来た|きた|来る|past}。', '……{少々|しょうしょう}お{待ち|まち}ください。', 'cool'], x: ['{元気|げんき}です。', '……お{名前|なまえ}を。', 'confused'],
    why: 'Visiting another company: polite. どちら様 is a very polite "who are you?".' },
  { t: 3, who: 'Coworker', ctx: 'Your age. You both stayed late.', icon: 'user', exp: 'c', line: 'まだ{帰らない|かえらない|帰る|negative}の？',
    c: ['うん、もうちょっと。', 'そっか。{無理|むり}しないでね。', 'warm'], p: ['はい、もう{少し|すこし}です。', '……{部長|ぶちょう}みたいな{言い方|いいかた}。', 'amused'], x: ['うん、もう{帰った|かえった|帰る|past}。', '……ここにいるよね？', 'confused'],
    why: 'Late at the office with a peer: casual.' },
];
const MOOD = { warm: ['warmer', 'ok'], ok: ['fine', 'ok'], amused: ['amused', 'meh'], cool: ['cooler', 'bad'], cold: ['cold', 'bad'], confused: ['confused', 'bad'] };

const { stage } = shell({ proto: PROTO, title: 'Casual or polite', side: `
  <p>Answer the way this person expects. Tap a word in a reply to see its meaning without choosing it.</p>` });

async function run(level) {
  showLevel(level);
  const ad = new Adapter(level, { slowMs: 12000 });
  const ses = new Session(PROTO, level);
  let regHit = 0, missRead = 0;
  $('#lvlBtn').onclick = () => levelSheet(ad.level, l => { ad.level = l; ad.hist = []; setLevel(PROTO, l); showLevel(l); ses.level = l; });
  stage.innerHTML = '';
  const prog = h('div', 'progress', Array.from({ length: RUN }, () => '<i></i>').join('')); stage.append(prog);
  const area = h('div', 'reg'); stage.append(area);
  enableLookups(area, () => ses.lookup());
  const used = new Set();
  for (let i = 0; i < RUN; i++) {
    prog.children[i].className = 'now';
    const lv = ad.level;
    const maxT = lv <= 1 ? 2 : lv <= 3 ? 2 : 3;
    let pool = EX.filter(e => e.t <= maxT && !used.has(e));
    if (!pool.length) pool = EX.filter(e => !used.has(e));
    // Alternate so the right register isn't always the same.
    const last = [...used].pop();
    const flip = pool.filter(e => last && e.exp !== last.exp);
    const E = pick(flip.length && Math.random() < .6 ? flip : pool); used.add(E);
    const kinds = lv <= 1 ? ['c', 'p'] : ['c', 'p', 'x'];
    const opts = shuffle(kinds);
    area.innerHTML = `
      <div class="who"><i class="ph-fill ph-${E.icon}"></i><div><b>${E.who}</b><span>${E.ctx}</span></div><span class="mood" id="mood"></span></div>
      <div class="said-line"><div class="line small" lang="ja">${renderJP(E.line, { level: lv })}</div></div>
      <div class="replies">${opts.map(k => `<div class="reply" role="button" tabindex="0" data-k="${k}"><i class="ph ph-chat-circle"></i><span class="rj" lang="ja">${renderJP(E[k][0], { level: lv })}</span></div>`).join('')}</div>
      <div class="after" id="after"></div>`;
    ses.begin(labelJP(E.line, lv));
    sayLine($('.said-line .line', area), { text: plain(E.line), follow: true });
    const k = await new Promise(r => area.querySelectorAll('.reply').forEach(b => { b.onclick = () => r(b.dataset.k); b.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') r(b.dataset.k); }; }));
    stopAudio();
    const [rjp, react, mood] = E[k];
    const regOk = k !== 'x' && (E.exp === 'e' || E.exp === k);
    const partial = k !== 'x' && !regOk && E.soft;
    if (regOk) regHit++; if (k === 'x') missRead++;
    area.querySelectorAll('.reply').forEach(b => { b.classList.add(b.dataset.k === k ? 'picked' : 'faded'); b.onclick = null; });
    await sleep(300);
    $('#mood').textContent = MOOD[mood][0]; $('#mood').className = 'mood ' + MOOD[mood][1];
    area.querySelector('.who').classList.add('m-' + MOOD[mood][1]);
    const after = $('#after');
    after.innerHTML = `<div class="react-line"><div class="line small" lang="ja">${renderJP(react, { level: lv })}</div></div><div class="after-row"><button class="linkish" id="why">Why?</button><button class="btn" id="next">Next</button></div>`;
    sayLine($('.react-line .line', after), { text: plain(react), follow: true });
    $('#why').onclick = () => { ses.lookup(); $('#why').outerHTML = `<p class="why">${E.why}</p>`; };
    const it = ses.end(regOk, { reg: k, exp: E.exp });
    const keys = [...keysOf(E.line), ...keysOf(rjp)]; wordSeen(keys);
    if (regOk && !it.lookups) wordSuccess(keys);
    grammarMark('register:' + (E.exp === 'e' ? 'either' : E.exp === 'c' ? 'casual' : 'polite'), regOk || partial);
    for (const w of area.querySelectorAll('.reply.picked .w[data-note]')) grammarMark(noteGrammar(w.dataset.note), regOk);
    prog.children[i].className = regOk ? 'done' : 'miss';
    const d = ad.push({ ok: regOk, lookups: it.lookups, ms: it.ms });
    if (d) { ses.level = ad.level; setLevel(PROTO, ad.level); showLevel(ad.level); toast(d > 0 ? 'Level up: trickier people' : 'Easing off', d > 0 ? 'up' : 'down'); }
    await new Promise(r => { $('#next').onclick = r; });
    stopAudio();
  }
  ses.finish(stage, { extraRows: [['Register right', `${regHit}/${RUN}`, ''], ['Misread', missRead, 'reply did not fit the question']], again: () => run(ad.level) });
}

startLevel(PROTO).then(run);
