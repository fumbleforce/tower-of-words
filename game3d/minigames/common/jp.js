// Japanese text for the minigames: furigana, romaji over katakana, glossed words.
//
// Markup inside a line:
//   [好|す]                 kanji with its kana reading (ruby)
//   {あげました|agemashita|gave}   a word the player can tap for its reading and meaning;
//                           an empty reading ({ミオさん||Mio}) is made from the kana; a fourth field
//                           names Mio's word clip ({まって|matte|wait|matte})
//   *より*                  the grammar the round is about, highlighted
// Katakana runs get their romaji as ruby on their own (GUIDE: katakana always shows its reading).

const KANA = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o', か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so', た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no', は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo', や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro', わ: 'wa', を: 'o', ん: 'n',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go', ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do', ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po', ゔ: 'vu',
};
const LONG = { a: 'ā', i: 'ī', u: 'ū', e: 'ē', o: 'ō' };
const SMALL = { ゃ: 'ya', ゅ: 'yu', ょ: 'yo', ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o' };

const toHira = s => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));

/** Hepburn romaji for kana; ー becomes a macron (コーヒー kōhī). */
export function romaji(kana) {
  const s = toHira(kana);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i], next = s[i + 1];
    if (c === 'っ') {
      const r = KANA[next] || '';
      out += r.startsWith('ch') ? 't' : r[0] || '';
      continue;
    }
    if (c === 'ー') {
      out = out.replace(/[aiueo]$/, v => LONG[v]);
      continue;
    }
    let r = KANA[c];
    if (r === undefined) {
      out += c;
      continue;
    }
    if (next && SMALL[next]) {
      const sm = SMALL[next];
      if (sm.startsWith('y') && /[iy]$/.test(r)) r = /^(shi|chi|ji)$/.test(r) ? r.slice(0, -1) + sm.slice(1) : r.slice(0, -1) + sm;
      else r = r.slice(0, -1) + sm;
      i++;
    }
    out += r;
  }
  return out;
}

const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Ruby for kanji, and romaji over each katakana run.
function rubify(text) {
  return text
    .split(/(\[[^\]|]+\|[^\]]+\])/)
    .map(part => {
      const m = part.match(/^\[([^\]|]+)\|([^\]]+)\]$/);
      if (m) return `<ruby>${esc(m[1])}<rt>${esc(m[2])}</rt></ruby>`;
      return esc(part).replace(/[ァ-ヺー]+/g, run => `<ruby class="kata">${run}<rt>${romaji(run)}</rt></ruby>`);
    })
    .join('');
}

/** Markup to HTML. Glossed words carry data-r (reading) and data-g (meaning) for the tap popover. */
export function jp(markup) {
  return markup
    .split(/(\*[^*]+\*|\{[^}]+\})/)
    .map(part => {
      if (part.startsWith('{') && part.endsWith('}')) {
        const [text, r0 = '', g = '', clip = ''] = part.slice(1, -1).split('|');
        const r = r0 || romaji(plain(text));
        const c = clip ? ` data-clip="${esc(clip)}"` : '';
        return `<span class="w" tabindex="0" data-r="${esc(r)}" data-g="${esc(g)}"${c}>${rubify(text)}</span>`;
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return `<b class="key">${jp(part.slice(1, -1))}</b>`;
      return rubify(part);
    })
    .join('');
}

/** The plain kana of a markup line (readings in place of kanji), for romaji lines and tests. */
export function plain(markup) {
  return markup
    .replace(/\{([^|}]+)[^}]*\}/g, '$1')
    .replace(/\*/g, '')
    .replace(/\[[^\]|]+\|([^\]]+)\]/g, '$1');
}
