"""Pacing checker: for a player profile, report per line the length and what is new
(words, grammar points, kanji), and flag lines over the day-1 budgets.

Budgets (game/notes/day1-design.md, "Pacing rules"): spoken line 16 characters or fewer where
possible, hard cap 24 (punctuation not counted); at most one item new to the player per line;
choice screens at most two new items across all options.

"New" means new to this profile and not already met earlier in the day (lines are walked in draft
order, so a word introduced once is not counted again later).

Usage (venv): ~/ai/lang/.venv/bin/python tools/lang/pacing.py [--profile jorgen] [--draft game/notes/day1-draft.md]
              [--md report.md]   (all three reference profiles when --profile is omitted)
"""
import argparse
import json
import os
import re
from collections import OrderedDict

from annotate import DRAFT, draft_lines
from common import KATA_RE, OUT, has_kanji, kanji_in

PUNCT = re.compile(r'[、。？！?!…‥「」『』（）()・：:\s　〜~ー―\-]')
SOFT, HARD = 16, 24
SKIP_WORD_POS = {'punct', 'prt', 'aux', 'name', 'num', 'pref', 'suf'}
SPOKEN = ('say', 'msg', 'app', 'sign')
AUX_VERBS = {'くださる', '下さる', '来る', 'くる', '行く', 'いく', 'いる', '居る', 'みる', '見る', 'おく', '置く', 'しまう', 'ある'}
FILLERS = {'ああ', 'あ', 'え', 'へえ', 'ふーん', 'ふふ', 'あはは', 'うん', 'はい', 'おや', 'ほら', 'っ', 'ん', 'ま', 'まあ'}
# counters every learner who knows the 'counters' point can read (number + N5 counter)
BASIC_COUNTERS = set('時分円階人つ回年月日本枚個歳')


def load(name):
    return json.load(open(os.path.join(OUT, name), encoding='utf-8'))


class Profile:
    def __init__(self, pid, spec, words, kanji, grammar):
        self.id, self.spec = pid, spec
        self.words, self.kanji = words, kanji
        w = spec['words']
        self.w_jlpt, self.w_freq, self.w_any = w.get('jlpt'), w.get('freq'), w.get('freq_any')
        self.w_known, self.w_unknown = set(w.get('known', [])), set(w.get('unknown', []))
        k = spec['kanji']
        self.band = k.get('band', 0)
        self.k_read = set(k.get('readable', ''))
        self.k_learn = set(k.get('learning', ''))
        self.k_hidden = set(k.get('hidden', ''))
        self.k_read_jlpt = k.get('readable_jlpt')
        g = spec['grammar']
        if 'known_level' in g:
            self.g_known = {p['id'] for p in grammar if p['level'] >= g['known_level']}
        else:
            self.g_known = set(g.get('known', []))

    def knows_word(self, tok):
        s, b = tok['s'], tok.get('b', tok['s'])
        if tok.get('p') == 'ctr' and 'counters' in self.g_known and b in BASIC_COUNTERS:
            return True
        if s in self.w_unknown or b in self.w_unknown:
            return False
        if s in self.w_known or b in self.w_known:
            return True
        w = self.words.get(str(tok.get('id')))
        if not w:
            return False
        n, f = w.get('n'), w.get('f')
        if self.w_any and f and f <= self.w_any:
            return True
        if self.w_jlpt and n and n >= self.w_jlpt:
            return not self.w_freq or (f is not None and f <= self.w_freq)
        return False

    def kanji_state(self, ch):
        """'read', 'learn' or 'hidden' (day1-design.md, "How text is shown")."""
        if ch in self.k_hidden:
            return 'hidden'
        if ch in self.k_read:
            return 'read'
        if ch in self.k_learn:
            return 'learn'
        n = self.kanji.get(ch, {}).get('n')
        if self.k_read_jlpt and n and n >= self.k_read_jlpt:
            return 'read'
        b = self.band
        if b == 0:
            return 'hidden'
        if b == 1:
            return 'learn' if n == 5 else 'hidden'
        if b == 2:
            return 'read' if n == 5 else 'learn' if n == 4 else 'hidden'
        return 'read' if n in (4, 5) else 'learn'


def display(tok, prof):
    """How the engine would show this word: 'kanji', 'ruby' (kanji with reading), 'kana' or None (no kanji)."""
    ks = kanji_in(tok['s'])
    if not ks:
        return None
    states = [prof.kanji_state(c) for c in ks]
    if 'hidden' in states:
        return 'kana'
    if 'learn' in states:
        return 'ruby'
    return 'kanji'


def visible_length(text):
    return len(PUNCT.sub('', text))


def check(prof, items, lines, grammar_names):
    seen_words, seen_grammar, seen_kanji = set(), set(), set()
    rows = []
    for it in items:
        if it['kind'] in ('spell',):
            continue
        ann = lines.get(it['text'].strip())
        if not ann:
            continue
        new_w, kata, ruby, kana_fb = [], [], [], []
        toks = ann['t']
        for ti, t in enumerate(toks):
            prev = toks[ti - 1] if ti else None
            if t['p'] in SKIP_WORD_POS or not re.search(r'[぀-ヿ一-鿿]', t['s']):
                continue
            if t['s'] in FILLERS:
                continue  # interjections and fillers are carried by the voice; not counted
            if t.get('b') in AUX_VERBS and prev and prev['s'] in ('て', 'で'):
                continue  # 〜てください, 〜てくる, 〜ている: counted as grammar, not as a new word
            key = t.get('id') or t.get('b', t['s'])
            if not prof.knows_word(t) and key not in seen_words:
                new_w.append(t['s'] if t['p'] == 'ctr' else t.get('b', t['s']))
            seen_words.add(key)
            if KATA_RE.search(t['s']) and prof.spec.get('katakana') == 'weak':
                kata.append(t['s'])
            d = display(t, prof)
            if d == 'ruby':
                for c in kanji_in(t['s']):
                    if prof.kanji_state(c) == 'learn' and c not in seen_kanji:
                        ruby.append(c)
                    seen_kanji.add(c)
            elif d == 'kana':
                kana_fb.append(t['s'])
        new_g = [g for g in ann['g'] if g not in prof.g_known and g not in seen_grammar]
        seen_grammar.update(ann['g'])
        rows.append({
            'src': it['src'], 'line': it.get('line'), 'kind': it['kind'], 'choice': it.get('choice'),
            'text': it['text'], 'len': visible_length(it['text']),
            'new_words': list(OrderedDict.fromkeys(new_w)), 'new_grammar': new_g,
            'ruby_kanji': ruby, 'kana_fallback': kana_fb, 'katakana': kata,
        })
    # flags
    for r in rows:
        r['items'] = len(r['new_words']) + len(r['new_grammar'])
        f = []
        if r['kind'].startswith(SPOKEN) or r['kind'].startswith('say'):
            if r['len'] > HARD:
                f.append('over 24')
            elif r['len'] > SOFT:
                f.append('over 16')
            if r['items'] > 1:
                f.append(f"{r['items']} new")
            if r['new_words'] and r['new_grammar'] and r['ruby_kanji']:
                f.append('stacked')
        r['flags'] = f
    # choice screens: options grouped by their CHOICE header (or adjacency)
    screens = OrderedDict()
    prev_line, key = None, None
    for r in rows:
        if r['kind'] not in ('option', 'action'):
            prev_line = None
            continue
        if r['choice']:
            key = r['choice']
        elif prev_line is None or r['line'] - prev_line > 2:
            key = f"adj{r['line']}"
        prev_line = r['line']
        screens.setdefault(key, []).append(r)
    screen_flags = []
    for key, opts in screens.items():
        total = sum(o['items'] for o in opts)
        if total > 2:
            screen_flags.append((opts, total))
    return rows, screen_flags


def fmt_items(r, grammar_names):
    parts = []
    if r['new_words']:
        parts.append('words: ' + ', '.join(r['new_words']))
    if r['new_grammar']:
        parts.append('grammar: ' + ', '.join(grammar_names.get(g, g) for g in r['new_grammar']))
    if r['ruby_kanji']:
        parts.append('kanji with reading: ' + ''.join(r['ruby_kanji']))
    return '; '.join(parts)


def report(prof, rows, screen_flags, grammar_names, max_rows=40):
    spoken = [r for r in rows if r['kind'] not in ('option', 'action')]
    flagged = [r for r in spoken if r['flags']]
    over_items = [r for r in spoken if r['items'] > 1]
    out = [f"### {prof.spec['name']}", '']
    nw = sum(len(r['new_words']) for r in rows)
    ng = sum(len(r['new_grammar']) for r in rows)
    kana = sum(len(r['kana_fallback']) for r in rows)
    out.append(f"- {len(spoken)} lines and {len(rows) - len(spoken)} options checked. New over the day: {nw} words, {ng} grammar points.")
    out.append(f"- Lines over the one-new-item budget: {len(over_items)} of {len(spoken)}. "
               f"Over 16 characters: {sum(1 for r in spoken if r['len'] > SOFT)}; over 24: {sum(1 for r in spoken if r['len'] > HARD)}.")
    out.append(f"- Choice screens over two new items: {len(screen_flags)}.")
    out.append(f"- Words shown in kana because a kanji is still hidden: {kana}.")
    if prof.spec.get('katakana') == 'weak':
        out.append(f"- Katakana words to read (weak script): {sum(len(r['katakana']) for r in rows)}.")
    out.append('')
    if flagged:
        worst = sorted(flagged, key=lambda r: (-r['items'], -r['len']))[:max_rows]
        worst = sorted(worst, key=lambda r: r['line'] or 0)
        out.append('| Line | Text | Len | New | Flags |')
        out.append('|---|---|---|---|---|')
        for r in worst:
            out.append(f"| {r['src'].split(':', 1)[1]} | {r['text']} | {r['len']} | {fmt_items(r, grammar_names)} | {', '.join(r['flags'])} |")
        if len(flagged) > max_rows:
            out.append(f"\n({len(flagged) - max_rows} more flagged lines not shown.)")
        out.append('')
    if screen_flags:
        out.append('Choice screens over budget:')
        out.append('')
        for opts, total in screen_flags:
            out.append(f"- {opts[0]['src'].split(':', 1)[1]} ({total} new): " + ' / '.join(o['text'] for o in opts))
        out.append('')
    return '\n'.join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--profile', help='beginner, jorgen or n3 (default: all)')
    ap.add_argument('--draft', default=DRAFT)
    ap.add_argument('--md', help='write the markdown report here')
    ap.add_argument('--json', help='write per-line results as JSON')
    args = ap.parse_args()
    words = load('words.json')['words']
    kanji = load('kanji.json')['kanji']
    grammar = load('grammar.json')['points']
    gnames = {p['id']: p['name'] for p in grammar}
    lines = load('lines.json')['lines']
    items = draft_lines(args.draft)
    missing = [it['text'] for it in items if it['text'].strip() not in lines]
    if missing:
        from tokens import Tokenizer, detect_grammar, public
        tk = Tokenizer()
        for text in missing:
            toks = tk.annotate(text.strip())
            lines[text.strip()] = {'t': [public(t) for t in toks], 'g': detect_grammar(toks)}
    specs = load('profiles.json')['profiles']
    pids = [args.profile] if args.profile else list(specs)
    parts, all_rows = [], {}
    for pid in pids:
        prof = Profile(pid, specs[pid], words, kanji, grammar)
        rows, screens = check(prof, items, lines, gnames)
        all_rows[pid] = rows
        parts.append(report(prof, rows, screens, gnames))
    text = '\n'.join(parts)
    if args.md:
        open(args.md, 'w', encoding='utf-8').write(text)
    else:
        print(text)
    if args.json:
        json.dump(all_rows, open(args.json, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
