#!/usr/bin/env python3
"""Read Jørgen's review feedback from the terminal.

    python3 tools/review.py list              every item: status, new feedback, title
    python3 tools/review.py show <id>         the question, the options and all his feedback
    python3 tools/review.py mark-read <id>    mark the latest feedback as read (it stops showing as "new")
    python3 tools/review.py set-status <id> open|decided|superseded [--decision "text"]

Items live in reviews/<id>/review.json; his answers in reviews/<id>/feedback.json (written by the bible's Send
button through tools/review_server.py). How to add an item: reviews/README.md.
"""
import json
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
REVIEWS = os.path.join(ROOT, 'reviews')


def load(rid, name):
    p = os.path.join(REVIEWS, rid, name)
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else None


def save(rid, name, data):
    p = os.path.join(REVIEWS, rid, name)
    tmp = p + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write('\n')
    os.replace(tmp, p)


def items():
    out = []
    for rid in sorted(os.listdir(REVIEWS)):
        r = load(rid, 'review.json') if os.path.isdir(os.path.join(REVIEWS, rid)) else None
        if r:
            out.append((rid, r, load(rid, 'feedback.json')))
    return out


def label(r, key):
    for o in r.get('options', []):
        if o.get('id') == key:
            return f"{key} ({o.get('label', '')})"
    return key


def cmd_list():
    rows = items()
    order = {'open': 0, 'decided': 1, 'superseded': 2}
    rows.sort(key=lambda x: (order.get(x[1].get('status', 'open'), 3), x[1].get('date', '')), reverse=False)
    for rid, r, fb in rows:
        new = 'NEW ' if fb and not fb.get('read') else '    '
        picked = ', '.join(fb.get('picked', [])) if fb else ''
        print(f"{r.get('status', 'open'):10} {new}{rid:28} {r.get('title', '')}" + (f"  [picked: {picked}]" if picked else ''))


def show_fb(r, fb, indent=''):
    print(f"{indent}sent {fb.get('sent')}{'' if fb.get('read') else '  (new)'}")
    if fb.get('picked'):
        print(f"{indent}picked: " + ', '.join(label(r, k) for k in fb['picked']))
    for k, v in (fb.get('options') or {}).items():
        marks = ' '.join(x for x in ('star' if v.get('star') else '', 'reject' if v.get('reject') else '') if x)
        if marks or v.get('comment'):
            print(f"{indent}  {label(r, k)}: {marks}{' · ' if marks and v.get('comment') else ''}{v.get('comment', '')}")
    if fb.get('comment'):
        print(f"{indent}comment: {fb['comment']}")


def cmd_show(rid):
    r, fb = load(rid, 'review.json'), load(rid, 'feedback.json')
    if not r:
        sys.exit(f'no review item {rid}')
    print(f"{r.get('title')}  [{r.get('status', 'open')}]  {r.get('date', '')} by {r.get('by', '')}")
    print(r.get('question', ''))
    if r.get('decision'):
        print(f"decision: {r['decision']}")
    for o in r.get('options', []):
        print(f"  {o.get('id')}: {o.get('label', '')}  {o.get('image') or o.get('audio') or ''}")
    print(f"page: http://127.0.0.1:8771/bible/#review/{rid}")
    if not fb:
        print('\nNo feedback yet.')
        return
    print('\nFeedback:')
    show_fb(r, fb, '  ')
    for h in reversed(fb.get('history', [])):
        print('\n  earlier:')
        show_fb(r, h, '    ')


def cmd_mark_read(rid):
    fb = load(rid, 'feedback.json')
    if not fb:
        sys.exit(f'no feedback for {rid}')
    fb['read'] = True
    save(rid, 'feedback.json', fb)
    print(f'{rid}: marked read')


def cmd_set_status(rid, status, decision=None):
    if status not in ('open', 'decided', 'superseded'):
        sys.exit('status must be open, decided or superseded')
    r = load(rid, 'review.json')
    if not r:
        sys.exit(f'no review item {rid}')
    r['status'] = status
    fb = load(rid, 'feedback.json')
    if status == 'decided' and not r.get('decided') and fb and fb.get('picked'):
        r['decided'] = fb['picked']  # his latest picks become the decision
    if decision:
        r['decision'] = decision
    save(rid, 'review.json', r)
    print(f'{rid}: {status}')


def main(a):
    if not a or a[0] in ('-h', '--help'):
        print(__doc__)
    elif a[0] == 'list':
        cmd_list()
    elif a[0] == 'show' and len(a) == 2:
        cmd_show(a[1])
    elif a[0] == 'mark-read' and len(a) == 2:
        cmd_mark_read(a[1])
    elif a[0] == 'set-status' and len(a) >= 3:
        dec = a[a.index('--decision') + 1] if '--decision' in a else None
        cmd_set_status(a[1], a[2], dec)
    else:
        sys.exit(__doc__)


if __name__ == '__main__':
    main(sys.argv[1:])
