#!/usr/bin/env python3
"""Read Jørgen's Review and Showcase feedback from the terminal.

    python3 tools/review.py list              every item and showcase entry: status, new feedback, title; then the
                                              stuck work from tools/work.py stale
    python3 tools/review.py show <id>         the item or entry and all his feedback
    python3 tools/review.py mark-read <id>    mark the latest feedback as read (it stops showing as "new")
    python3 tools/review.py set-status <id> open|decided|superseded [--decision "text"]   (Review items only;
                                              decided opens the follow-up GitHub issue, or comments on the one it has)

<id> is looked up in reviews/, then showcase/, then the private island/private/rewards/reviews/ (show and mark-read
only; private items stay out of list and GitHub); `showcase/<id>` picks the showcase entry. Review items live in
reviews/<id>/review.json (how to add one: reviews/README.md); showcase entries in showcase/<id>/entry.json
(showcase/README.md). His answers are <folder>/<id>/feedback.json, written by the bible's Send button through
tools/review_server.py.
"""
import json
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
REVIEWS = os.path.join(ROOT, 'reviews')
SHOWCASE = os.path.join(ROOT, 'showcase')
# Private Review items: git-ignored, shown only in the private bible, never sent to GitHub (show and mark-read only)
PRIVATE_REVIEWS = os.path.join(ROOT, 'island', 'private', 'rewards', 'reviews')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import work  # noqa: E402  tools/work.py: the work tracker (GitHub issues)


def load(rid, name, base=REVIEWS):
    p = os.path.join(base, rid, name)
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else None


def save(rid, name, data, base=REVIEWS):
    p = os.path.join(base, rid, name)
    tmp = p + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write('\n')
    os.replace(tmp, p)


def _folder(base, marker):
    out = []
    for rid in sorted(os.listdir(base)) if os.path.isdir(base) else []:
        r = load(rid, marker, base) if os.path.isdir(os.path.join(base, rid)) else None
        if r:
            out.append((rid, r, load(rid, 'feedback.json', base)))
    return out


def items():
    """Review items: (id, review.json, feedback.json or None)."""
    return _folder(REVIEWS, 'review.json')


def showcase_items():
    """Showcase entries: (id, entry.json, feedback.json or None)."""
    return _folder(SHOWCASE, 'entry.json')


def unread():
    """Every answer nobody has read yet, from both folders: (kind, id, sent), kind 'review' or 'showcase'."""
    return [(kind, rid, str(fb.get('sent', ''))) for kind, rows in (('review', items()), ('showcase', showcase_items()))
            for rid, _r, fb in rows if fb and not fb.get('read')]


def resolve(rid):
    """'<id>', 'reviews/<id>' or 'showcase/<id>' -> (kind, id, folder). Looks in reviews/ first, then showcase/."""
    rid = rid.strip('/')
    if rid.startswith('showcase/'):
        return 'showcase', rid.split('/', 1)[1], SHOWCASE
    rid = rid.removeprefix('reviews/')
    if not os.path.isfile(os.path.join(REVIEWS, rid, 'review.json')):
        if os.path.isfile(os.path.join(SHOWCASE, rid, 'entry.json')):
            return 'showcase', rid, SHOWCASE
        if os.path.isfile(os.path.join(PRIVATE_REVIEWS, rid, 'review.json')):
            return 'review', rid, PRIVATE_REVIEWS
    return 'review', rid, REVIEWS


def showcase_images(e):
    return list(e.get('images') or []) + [im for sec in e.get('sections') or [] for im in sec.get('images') or []]


def showcase_counts(fb):
    """'2 flagged, 3 comments' for one showcase answer (the entry itself counts like an image)."""
    marks = [fb] + list((fb.get('items') or {}).values())
    f = sum(1 for m in marks if m.get('flag'))
    c = sum(1 for m in marks if str(m.get('comment', '')).strip())
    return ', '.join(x for x in (f'{f} flagged' if f else '', f"{c} comment{'s' if c != 1 else ''}" if c else '') if x) or 'nothing marked'


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
    for rid, e, fb in sorted(showcase_items(), key=lambda x: x[1].get('date', ''), reverse=True):
        new = 'NEW ' if fb and not fb.get('read') else '    '
        print(f"{'showcase':10} {new}{rid:28} {e.get('title', '')}" + (f"  [{showcase_counts(fb)}]" if fb else ''))
    try:
        stuck = work.stale_lines()
    except Exception as e:  # offline or gh not logged in: say so, never fail the list
        stuck = [f'(work tracker not checked: {e})']
    if stuck:
        print('\n' + '\n'.join(stuck))


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


def image_label(e, key):
    im = next((x for x in showcase_images(e) if x.get('id') == key), {})
    return f"{key} ({im['caption']})" if im.get('caption') else key


def marks(v):
    return f"{'FLAGGED' if v.get('flag') else ''}{' · ' if v.get('flag') and v.get('comment') else ''}{v.get('comment', '')}"


def show_showcase_fb(e, fb, indent=''):
    print(f"{indent}sent {fb.get('sent')}{'' if fb.get('read') else '  (new)'}")
    if fb.get('flag') or fb.get('comment'):
        print(f"{indent}whole entry: {marks(fb)}")
    for k, v in (fb.get('items') or {}).items():
        if v.get('flag') or v.get('comment'):
            print(f"{indent}  {image_label(e, k)}: {marks(v)}")


def cmd_show_showcase(rid):
    e, fb = load(rid, 'entry.json', SHOWCASE), load(rid, 'feedback.json', SHOWCASE)
    if not e:
        sys.exit(f'no showcase entry {rid}')
    print(f"{e.get('title')}  [showcase]  {e.get('date', '')} by {e.get('by', '')}")
    print(e.get('caption', ''))
    commit = e.get('commit')
    if commit:
        print('commit: ' + (', '.join(commit) if isinstance(commit, list) else str(commit)))
    for im in showcase_images(e):
        print(f"  {im.get('id')}: {im.get('caption', '')}  {im.get('image', '')}")
    print(f"page: http://127.0.0.1:8771/bible/#showcase/{rid}")
    if not fb:
        print('\nNo feedback yet.')
        return
    print('\nFeedback:')
    show_showcase_fb(e, fb, '  ')
    for h in reversed(fb.get('history', [])):
        print('\n  earlier:')
        show_showcase_fb(e, h, '    ')


def cmd_show(rid):
    kind, rid, base = resolve(rid)
    if kind == 'showcase':
        return cmd_show_showcase(rid)
    r, fb = load(rid, 'review.json', base), load(rid, 'feedback.json', base)
    if not r:
        sys.exit(f'no review item {rid}')
    print(f"{r.get('title')}  [{r.get('status', 'open')}]  {r.get('date', '')} by {r.get('by', '')}")
    print(r.get('question', ''))
    if r.get('decision'):
        print(f"decision: {r['decision']}")
    if r.get('issue'):
        print(f"follow-up: {work.REPO_URL}/issues/{r['issue']}")
    for o in r.get('options', []):
        print(f"  {o.get('id')}: {o.get('label', '')}  {o.get('image') or o.get('audio') or ''}")
    page = 'island/private/bible/' if base == PRIVATE_REVIEWS else 'bible/'
    print(f"page: http://127.0.0.1:8771/{page}#review/{rid}")
    if not fb:
        print('\nNo feedback yet.')
        return
    print('\nFeedback:')
    show_fb(r, fb, '  ')
    for h in reversed(fb.get('history', [])):
        print('\n  earlier:')
        show_fb(r, h, '    ')


def cmd_mark_read(rid):
    _kind, rid, base = resolve(rid)
    fb = load(rid, 'feedback.json', base)
    if not fb:
        sys.exit(f'no feedback for {rid}')
    fb['read'] = True
    save(rid, 'feedback.json', fb, base)
    print(f'{rid}: marked read')


def cmd_set_status(rid, status, decision=None):
    if status not in ('open', 'decided', 'superseded'):
        sys.exit('status must be open, decided or superseded')
    if resolve(rid)[2] == PRIVATE_REVIEWS:
        sys.exit(f'{rid} is a private item: set its status in its review.json; it gets no GitHub issue')
    r = load(rid, 'review.json')
    if not r:
        sys.exit(f'no review item {rid}')
    r['status'] = status
    fb = load(rid, 'feedback.json')
    if status == 'decided' and not r.get('decided') and fb and fb.get('picked'):
        r['decided'] = fb['picked']  # his latest picks become the decision
    if decision:
        r['decision'] = decision
    if status == 'decided':
        r['decided_at'] = work.stamp()
    save(rid, 'review.json', r)
    print(f'{rid}: {status}')
    if status == 'decided':
        issue, new = work.followup_for(rid, r)
        r['issue'] = int(issue['id'])
        save(rid, 'review.json', r)
        print(f"{'opened' if new else 'updated'} issue #{issue['id']} {issue['url']}. Whoever acts on it: "
              f"python3 tools/work.py set {issue['id']} --state running --owner <you>")


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
