// Forgiving match between what the recogniser heard and the word Eric is trying to say.
// Pure functions, no DOM: game3d/tools/speech/ runs them in Node too.
//
//   import { matchWord, toRomaji } from './speech-match.js'
//   matchWord('まって。', 'matte')  -> { hit: true, dist: 0, heard: 'mate', want: 'mate' }
//
// How it compares: everything goes to one plain romaji spelling first (kanji forms of the day's words to kana,
// katakana to hiragana, kana to romaji, long vowels and doubled consonants collapsed, l to r), then an
// approximate substring match allows a few letters off, scaled to the word's length. Learners drop the small
// tsu, shorten long vowels, and devoice u (dashite -> dashte, sumimasen -> sumimasn); all of that passes.

// Kana readings and the written forms a recogniser may print for each word Eric can say.
// `core` forms are accepted too (the short よろしく for the full phrase), since the English is always on screen
// and the point is that he said it, not that he said all of it.
export const SPOKEN = {
  matte: { kana: ['まって'], forms: ['待って', '待て', 'まて'] },
  akete: { kana: ['あけて'], forms: ['開けて', '明けて', '空けて'] },
  kite: { kana: ['きて'], forms: ['来て', '着て', '聞いて'] },
  ugoite: { kana: ['うごいて'], forms: ['動いて', '動け'] },
  irete: { kana: ['いれて'], forms: ['入れて', '居れて'] },
  dashite: { kana: ['だして'], forms: ['出して'] },
  tomatte: { kana: ['とまって'], forms: ['止まって', '泊まって', '停まって'] },
  ohayo: { kana: ['おはようございます', 'おはよう'], forms: ['お早うございます', 'お早う'] },
  yoroshiku: { kana: ['よろしくおねがいします', 'よろしく'], forms: ['よろしくお願いします', '宜しくお願いします', '宜しくお願い致します', 'よろしくお願い致します', '宜しく'] },
  sumimasen: { kana: ['すみません', 'すいません'], forms: ['済みません'] },
};

const H = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o', か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko', が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so', ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo', た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do', な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no', は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo', ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po', ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo', ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro', わ: 'wa', を: 'o', ん: 'n', ゔ: 'vu',
  ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o',
};
const SMALL_Y = { ゃ: 'a', ゅ: 'u', ょ: 'o' };

const kataToHira = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

// kana to plain romaji (Hepburn-ish), unknown characters kept as they are
export function kanaToRomaji(s) {
  s = kataToHira(s);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i], n = s[i + 1];
    if (c === 'っ') { out += '\u0001'; continue; }                       // doubled consonant marker, resolved below
    if (c === 'ー') { out += out.slice(-1); continue; }
    let r = H[c];
    if (r === undefined) { out += c; continue; }
    if (n && SMALL_Y[n]) { r = (/^(shi|chi|ji)$/.test(r) ? r.slice(0, -1) : r.slice(0, -1) + 'y') + SMALL_Y[n]; i++; }
    out += r;
  }
  return out.replace(/\u0001(.)/g, '$1$1').replace(/\u0001/g, '');
}

// one comparable spelling: lower case latin only, long vowels and doubled consonants collapsed, l as r
export function canon(s) {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '').replace(/l/g, 'r')
    .replace(/ou/g, 'o').replace(/oo/g, 'o').replace(/uu/g, 'u').replace(/aa/g, 'a').replace(/ii/g, 'i').replace(/ee/g, 'e')
    .replace(/([bcdfghjkmnprstvwz])\1/g, '$1').replace(/tch/g, 'ch');
}

// every written form of every sayable word, longest first, so a kanji answer turns into its kana
const FORM_TO_KANA = Object.values(SPOKEN).flatMap((w) => w.forms.map((f) => [f, w.kana[0]])).sort((a, b) => b[0].length - a[0].length);

// what the recogniser printed, as one comparable romaji string
export function heardRomaji(text) {
  let s = (text || '').normalize('NFKC').replace(/(えーと|えっと|ええと|えー|あのー|あの|うーん|んー|エート|エット|エー|アノ)[、,\s]*/g, '');
  for (const [f, k] of FORM_TO_KANA) s = s.split(f).join(k);
  s = kataToHira(s).replace(/[\s、。，．,.!?！？「」『』…・〜~"'()（）\[\]-]/g, '');
  return canon(kanaToRomaji(s));
}

// the comparable spellings the word may be said as
export function targets(id, ro) {
  const w = SPOKEN[id];
  const list = w ? w.kana.map((k) => canon(kanaToRomaji(k))) : [];
  if (ro) list.push(canon(ro));
  return [...new Set(list)];
}

// Edit costs by sound: the consonants carry a word, so a wrong or missing consonant costs 1, while vowel slips
// (e for i, "kait" for kite, "E-rate" for irete) and the glides y, w, h cost half. A few consonant pairs that learners
// and recognisers swap (r/d, s/z, t/d, k/g, m/n, b/v) cost half too.
const VOW = new Set(['a', 'i', 'u', 'e', 'o']), SOFT = new Set(['a', 'i', 'u', 'e', 'o', 'y', 'w', 'h']);
const NEAR = ['bv', 'rd', 'sz', 'td', 'kg', 'mn'];
function near(a, b) { return NEAR.some((p) => (p[0] === a && p[1] === b) || (p[1] === a && p[0] === b)); }
const sub = (a, b) => (a === b ? 0 : (VOW.has(a) && VOW.has(b)) || near(a, b) ? 0.5 : 1);
const indel = (c) => (SOFT.has(c) ? 0.5 : 1);

// edit distance between `want` and the heard text. With `inside`, `want` may sit anywhere in `heard`
// (Sellers' approximate substring match), and each letter of `heard` left over beyond two costs a quarter,
// so a short word hidden in a long sentence (kite in gemushite) doesn't pass.
export function distance(want, heard, inside = false) {
  const m = want.length, n = heard.length;
  let prev = new Array(n + 1), cur = new Array(n + 1);
  prev[0] = 0; for (let j = 1; j <= n; j++) prev[j] = inside ? 0 : prev[j - 1] + indel(heard[j - 1]);
  const start = [...prev].map((_, j) => j);                       // where the match began (substring mode)
  let sPrev = start.slice(), sCur = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    cur[0] = prev[0] + indel(want[i - 1]); sCur[0] = 0;
    for (let j = 1; j <= n; j++) {
      const d = prev[j - 1] + sub(want[i - 1], heard[j - 1]), u = prev[j] + indel(want[i - 1]), l = cur[j - 1] + indel(heard[j - 1]);
      if (d <= u && d <= l) { cur[j] = d; sCur[j] = sPrev[j - 1]; } else if (u <= l) { cur[j] = u; sCur[j] = sPrev[j]; } else { cur[j] = l; sCur[j] = sCur[j - 1]; }
    }
    [prev, cur] = [cur, prev]; [sPrev, sCur] = [sCur, sPrev];
  }
  if (!inside) return prev[n];
  let best = Infinity;
  for (let j = 0; j <= n; j++) { const used = j - sPrev[j], left = n - used; best = Math.min(best, prev[j] + 0.25 * Math.max(0, left - 2)); }
  return best;
}
export const fullDistance = (a, b) => distance(a, b, false);

// how far off still counts: about a quarter of the word, at least one
export function tolerance(len) { return Math.max(1, Math.floor(len * 0.26)); }

// Did they say the word? Returns { hit, dist, heard, want } (and `other` when it sounded like another word he knows).
// `ro` is the word's romaji from lang.js (optional).
export function matchWord(text, id, ro) {
  const heard = heardRomaji(text);
  let best = { hit: false, dist: Infinity, heard, want: '' };
  if (!heard) return best;
  for (const want of targets(id, ro)) {
    const d = distance(want, heard, true);
    if (d < best.dist) best = { hit: d <= tolerance(want.length), dist: d, heard, want };
  }
  // 止まって (tomatte) holds まって (matte): when the whole answer is closer to another word Eric can say, it's that one
  if (best.hit) {
    const own = fullDistance(best.want, heard);
    for (const other of Object.keys(SPOKEN)) {
      if (other === id) continue;
      for (const t of targets(other)) {
        const d = fullDistance(t, heard);
        if (d < own && d <= tolerance(t.length)) return { ...best, hit: false, other };
      }
    }
  }
  return best;
}

// which of several words (the Say menu's) the text is closest to; null when none is close enough
export function bestOf(text, ids, roOf = () => null) {
  let best = null;
  for (const id of ids) { const m = matchWord(text, id, roOf(id)); if (m.hit && (!best || m.dist < best.dist)) best = { id, ...m }; }
  return best;
}

// ---------- the second opinion: forced-decoding scores (speech-worker.js) ----------
// For each word the recogniser also reports how likely its written forms are for this audio (mean log-probability
// per token), next to how likely its own free transcript is. A learner's accent often makes the free transcript some
// other word (よろしく came out 喜悔しましょう) while the target still scores close to it and above every other word.
export const SCORE_RULE = { margin: 1.0, floor: -2.5, lead: 0.3 };
// the forms each word is scored as: its kana and its usual written form
export function candidatesFor(ids) {
  return Object.fromEntries(ids.filter((id) => SPOKEN[id]).map((id) => [id, [...new Set([SPOKEN[id].kana[0], SPOKEN[id].forms[0] || SPOKEN[id].kana[0]])]]));
}
export function scoreHit(r, id, rule = SCORE_RULE) {
  if (!r || !r.scores || r.scores[id] == null) return false;
  const s = r.scores[id];
  let other = -Infinity; for (const [k, v] of Object.entries(r.scores)) if (k !== id) other = Math.max(other, v);
  return s >= rule.floor && s >= r.free - rule.margin && s >= other + rule.lead;
}
