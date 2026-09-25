"""Tokenise the game's Japanese lines and write data/lang/lines.json.

Sources: game/data/script.js (via extract_script.mjs) and game/notes/day1-draft.md.
Usage (venv): ~/ai/lang/.venv/bin/python tools/lang/annotate.py [--review out.txt] [--text "日本語"]
"""
import argparse
import json
import os
import re
import subprocess

from common import JA_RE, OUT, ROOT, has_kanji, kata2hira
from tokens import Tokenizer, detect_grammar, public, strip_markup

DRAFT = os.path.join(ROOT, 'game', 'notes', 'day1-draft.md')


def draft_lines(path=DRAFT):
    """Japanese lines from the draft. Handles 'Speaker (expr): jp  /  en', '1) jp  /  en', '[app] jp  /  en',
    '[chat from Emi] ...', spell form lines '出して:  → works', floor labels '三階 営業部: (...)' and '[screen] 部数？'."""
    out = []
    scene = ''
    choices = []  # stack of (indent, line number) for CHOICE headers
    for no, raw in enumerate(open(path, encoding='utf-8'), 1):
        line = raw.rstrip('\n')
        m = re.match(r'^## (\S+)', line)
        if m:
            scene = m.group(1)
            choices = []
            continue
        s = line.strip()
        indent = len(line) - len(line.lstrip())
        if s.startswith('CHOICE'):
            choices = [c for c in choices if c[0] < indent] + [(indent, no)]
            continue
        is_option = bool(re.match(r'^\d+\)', s))
        if s and not is_option:
            choices = [c for c in choices if c[0] < indent]
        if not JA_RE.search(s) or s.startswith(('(', 'CHECK', 'map:', '- ', 'IF ', 'ELSE', 'SPELL', '|', '#')):
            continue
        kind, jps = None, []
        parts = re.split(r'\s{2,}/\s{2,}', s, maxsplit=1)
        if len(parts) == 2:
            left = parts[0]
            kind = 'say'
            if re.match(r'^\d+\)', left):
                kind = 'option'
                left = re.sub(r'^\d+\)\s*', '', left)
            m = re.match(r'^\[([^\]]*)\]\s*', left)
            if m:
                tag = m.group(1)
                kind = 'msg' if ('chat' in tag or 'message' in tag) else 'app' if tag == 'app' else 'sign'
                left = left[m.end():]
            m = re.match(r'^([A-Z][A-Za-z]*)(?:\s*\([^)]*\))?:\s*', left)
            if m:
                if kind == 'say':
                    kind = 'say:' + m.group(1).lower()
                left = left[m.end():]
            if kind == 'option':
                left = left.replace('「', '').replace('」', '')
                if re.fullmatch(r'（[^）]*）.*', left) and not re.search(r'[\u3040-\u30ff\u4e00-\u9fff]', re.sub(r'（[^）]*）', '', left)):
                    kind = 'action'
                left = re.sub(r'[（）]', ' ', left).strip()
            jps = [left]
        else:
            m = re.match(r'^([^\x00-\x7f（(][^:（(]*?)(?:\s*\(typed only\))?:\s+→', s)
            if m:
                kind = 'spell'
                jps = [x.strip() for x in re.split(r'[,、]\s*', m.group(1))]
            else:
                m = re.match(r'^([^\x00-\x1f!-~]+):\s+\(', s)
                if m:
                    kind, jps = 'sign', [m.group(1).replace(' ', '\u3000')]
                else:
                    m = re.match(r'^\[[^\]]*screen[^\]]*\]\s+(\S+)', s)
                    if m:
                        kind, jps = 'sign', [m.group(1)]
        for jp in jps:
            if jp and JA_RE.search(jp):
                item = {'src': f'day1-draft.md:{scene}:{no}', 'kind': kind, 'text': jp, 'line': no, 'scene': scene}
                if is_option and choices:
                    item['choice'] = choices[-1][1]
                out.append(item)
    return out


def script_lines():
    js = subprocess.run(['node', os.path.join(os.path.dirname(__file__), 'extract_script.mjs')],
                        capture_output=True, text=True, check=True).stdout
    out = []
    for x in json.loads(js):
        text, author = strip_markup(x['markup'])
        out.append({'src': x['src'], 'kind': x['kind'], 'text': text, 'author': author})
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--review', help='write a human-readable dump for checking readings')
    ap.add_argument('--text', help='annotate one line and print it')
    args = ap.parse_args()
    tk = Tokenizer()
    if args.text:
        toks = tk.annotate(args.text)
        print(json.dumps({'t': [public(t) for t in toks], 'g': detect_grammar(toks)}, ensure_ascii=False, indent=1))
        return
    items = script_lines() + draft_lines()
    lines = {}
    mismatches = []
    for it in items:
        text = it['text'].strip()
        if not text or not JA_RE.search(text):
            continue
        if text not in lines:
            toks = tk.annotate(text)
            lines[text] = {'src': [], 'kind': it['kind'], 't': [public(t) for t in toks], 'g': detect_grammar(toks)}
        lines[text]['src'].append(it['src'])
        # compare with author ruby in script.js markup
        for surf, rd in it.get('author', []):
            ts = lines[text]['t']
            ok, found = False, []
            if any(surf in t['s'] and t['s'] != surf and rd in kata2hira(t.get('r', '')) for t in ts):
                continue
            for i in range(len(ts)):
                acc, racc = '', ''
                for t in ts[i:]:
                    acc += t['s']
                    racc += kata2hira(t.get('r', t['s']))
                    if not surf.startswith(acc) and not acc.startswith(surf):
                        break
                    if surf in acc:
                        found.append((acc, racc))
                        # the author's word may sit inside a longer token: compare the matching slice
                        if acc == surf and racc == rd or (acc != surf and rd in racc):
                            ok = True
                        break
            if not ok:
                mismatches.append((text, surf, rd, found))
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, 'lines.json'), 'w', encoding='utf-8') as f:
        json.dump({'about': 'Per-line annotations of the game script. Key = the line as plain text (markup stripped). '
                            't = tokens {s surface, r reading (hiragana; absent when s is kana), b dictionary form, '
                            'id JMdict id (see words.json), p part of speech, fu furigana parts [[text, reading]] (empty reading for kana parts), '
                            'num for counters, en for names}; g = grammar point ids (grammar.json).',
                   'lines': lines}, f, ensure_ascii=False, separators=(',', ':'))
    print(f'{len(lines)} lines annotated -> data/lang/lines.json')
    print(f'{len(mismatches)} author-ruby mismatches')
    for m in mismatches:
        print('  ', m)
    if args.review:
        with open(args.review, 'w', encoding='utf-8') as f:
            for i, (text, v) in enumerate(lines.items(), 1):
                toks = ' '.join(t['s'] + (f"[{t['r']}]" if t.get('r') else '') + ('' if t.get('id') or t['p'] in ('punct', 'name', 'num') else '(?)')
                                for t in v['t'])
                f.write(f"{i:3d} {text}\n    {toks}\n    g: {' '.join(v['g'])}\n")


if __name__ == '__main__':
    main()
