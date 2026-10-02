#!/usr/bin/env python3
"""The work tracker: every task, request, decision follow-up and parked item is a GitHub issue in the repo, and
this tool keeps them honest.

    python3 tools/work.py add "Plain title" [--kind task] [--owner claude-main] [--state todo]
                              [--source review:<id>,commit:<sha>,...] [--next "the next concrete step"] [--detail "..."]
    python3 tools/work.py set <#> [--state running] [--owner codex] [--next "..."] [--source ...] [--title ...]
                              [--done-ref <commit or showcase:id>] [--note "why"]
    python3 tools/work.py touch <#> [--next "..."] [--note "..."]    still on it: resets the stale clock
    python3 tools/work.py done <#> [--ref <commit>] [--note "..."]   closes it (drop: set <#> --state dropped --note why)
    python3 tools/work.py list [--state s] [--owner o] [--kind k] [--all]   (closed ones only with --all or --state)
    python3 tools/work.py show <#>                 the issue, its history and comments (Jørgen comments there)
    python3 tools/work.py stale [--brief]          what is stuck or out of sync; exits 1 when anything is
    python3 tools/work.py labels                   create the labels (once per repo)

An issue: title = what gets done, in plain English. Labels `work`, `state:<todo|running|blocked|parked|
waiting-jorgen|done|dropped>`, `kind:<decision-followup|request|task|parked|check-for-jorgen>`, `owner:<claude-main|
claude-agent:<name>|codex|grok|jorgen>`. The body is written by this tool from its hidden `work` block (source, next step,
done ref, the reason); edit issues through this tool, not by hand, or the next change overwrites the body. Done and
dropped close the issue. A commit that finishes one says "Fixes #N" and `work.py done N --ref <commit>` records it.

Sources: review:<id>, showcase:<id>, commit:<sha>, msg:C-0157 / X-0270, file:<path>[:line], request:L<n> and
todo:TODO.md (lines of the lists this replaced, in git at 9391af4).

One home per fact: a Review item holds Jørgen's question and answer, its issue holds the work (owner, state, next
step, done commit). `python3 tools/review.py set-status <id> decided` opens the follow-up issue, quotes the decision
once with a link, and stores the number in review.json as `issue`; a later decision or new feedback on that review
comments on the issue and reopens it. `stale` (also printed by `tools/review.py list`, the answers hook and after
each commit) flags: a decided review without an issue; a review that changed after its issue's last update; a closed
issue whose review is open again; todo, running or blocked issues untouched for 12 h; a decided review whose issues
are all still todo an hour after the decision; parked issues untouched for 24 h. The stale clock is the time this
tool last changed the issue (`touch` resets it), so a comment alone doesn't hide a stall.

The repo is public: every title, body and comment is refused if it names private paths (island/private, reward
scenes, manifest.user.json) or if tools/check/secrets.sh finds a secret in it.
"""
import datetime as dt
import glob
import json
import os
import re
import subprocess
import sys
import tempfile
import time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
REVIEWS = os.path.join(ROOT, 'reviews')
REPO = 'fumbleforce/tower-of-words'
REPO_URL = f'https://github.com/{REPO}'
BIBLE_URL = 'http://127.0.0.1:8771/bible/'  # the local bible (./start); the public site has no bible
OLD_LISTS = '9391af4'  # the commit that still has notes/production-requests.md and TODO.md's open lists
CACHE = '/tmp/claude-1000/work-issues.json'
CACHE_SECONDS = 60
ACTIVE_HOURS, DECISION_HOURS, PARKED_HOURS = 12, 1, 24

KINDS = ('decision-followup', 'request', 'task', 'parked', 'check-for-jorgen')
STATES = ('todo', 'running', 'blocked', 'parked', 'waiting-jorgen', 'done', 'dropped')
CLOSED = ('done', 'dropped')
OWNER_RE = re.compile(r'^(claude-main|claude-agent:[a-z0-9][a-z0-9-]*|codex|grok|jorgen)$')
PRIVATE_RE = re.compile(r'island/private|private/rewards|manifest\.user\.json|reward[ -]scenes?\b', re.I)
FIELDS = 'number,title,labels,body,createdAt,updatedAt,state,url'


def now():
    return dt.datetime.now().astimezone()


def stamp(t=None):
    return (t or now()).strftime('%Y-%m-%dT%H:%M:%S%z')


def parse_time(s):
    if not s:
        return None
    s = str(s)
    if re.fullmatch(r'\d{4}-\d\d-\d\d', s):
        s += 'T12:00:00'
    try:
        t = dt.datetime.fromisoformat(s.replace('Z', '+00:00'))
    except ValueError:
        return None
    return t if t.tzinfo else t.astimezone()


def hours_since(s, at=None):
    t = parse_time(s)
    return ((at or now()) - t).total_seconds() / 3600 if t else 0


def age(h):
    return f'{h:.0f} h' if h < 48 else f'{h / 24:.0f} days'


# ---------------------------------------------------------------- GitHub
def gh(*args, parse=True, stdin=None):
    r = subprocess.run(['gh', *args, '--repo', REPO], capture_output=True, text=True, timeout=60, input=stdin)
    if r.returncode:
        raise RuntimeError(f'gh {" ".join(args[:2])}: {r.stderr.strip()}')
    return json.loads(r.stdout) if parse and r.stdout.strip() else r.stdout


def guard(*texts):
    """Refuse anything private or secret before it goes into the public repo's issues."""
    text = '\n'.join(t for t in texts if t)
    m = PRIVATE_RE.search(text)
    if m:
        sys.exit(f'work: refused, the text names something private ("{m.group(0)}"); issues are public')
    with tempfile.TemporaryDirectory(dir='/tmp/claude-1000') as d:
        with open(os.path.join(d, 'issue.md'), 'w', encoding='utf-8') as f:
            f.write(text)
        r = subprocess.run(['bash', os.path.join(ROOT, 'tools/check/secrets.sh'), 'dir', d], capture_output=True, text=True, cwd=ROOT, timeout=120)
    if r.returncode == 1:
        sys.exit('work: refused, tools/check/secrets.sh found a secret in the text')
    if r.returncode:
        sys.exit(f'work: refused, the secret scan could not run: {(r.stderr or r.stdout).strip()[-300:]}')


def review_md(rid, kind='review'):
    """A Review item or Showcase entry: its file on GitHub (readable on the phone) and its bible page (at home)."""
    folder, file = ('reviews', 'review.json') if kind == 'review' else ('showcase', 'entry.json')
    return f'[{kind.title()} {rid}]({REPO_URL}/blob/main/{folder}/{rid}/{file}) ([bible]({BIBLE_URL}#{kind}/{rid}))'


def ref_md(ref):
    """A source or done ref as Markdown for the issue body."""
    kind, _, v = str(ref).partition(':')
    if kind in ('review', 'showcase'):
        return review_md(v, kind)
    if kind == 'commit':
        return v
    if kind == 'msg':
        return f'`{v}`'
    if kind == 'file':
        path, _, line = v.partition(':')
        return f'[{v}]({REPO_URL}/blob/main/{path}{"#L" + line if line else ""})'
    if kind == 'request':
        n = v.lstrip('L')
        return f'[old request list, line {n}]({REPO_URL}/blob/{OLD_LISTS}/notes/production-requests.md#L{n})'
    if kind == 'todo':
        return f'[the old TODO.md]({REPO_URL}/blob/{OLD_LISTS}/TODO.md)'
    return ref if re.fullmatch(r'[0-9a-f]{7,40}', str(ref)) else f'`{ref}`'


def body(item):
    meta = {k: item.get(k) for k in ('source', 'next', 'done_ref', 'reason', 'detail', 'updated') if item.get(k)}
    out = []
    if item.get('reason'):
        out.append(item['reason'])
    if item.get('next'):
        out.append(f'**Next:** {item["next"]}')
    if item.get('done_ref'):
        out.append(f'**Done in:** {ref_md(item["done_ref"])}')
    shown = [s for s in item.get('source') or [] if not (s.startswith('review:') and f'/{s[7:]}/review.json' in (item.get('reason') or ''))]
    if shown:
        out.append('From ' + ', '.join(ref_md(s) for s in shown) + '.')
    if item.get('detail'):
        out.append('\n'.join('> ' + line for line in item['detail'].split('\n')))
    out.append('<!-- work ' + json.dumps(meta, ensure_ascii=False).replace('--', '- -') + ' -->')
    return '\n\n'.join(out) + '\n'


def labels(item):
    return ['work', f'state:{item["state"]}', f'kind:{item["kind"]}', f'owner:{item["owner"]}']


def to_item(i):
    names = [x['name'] for x in i.get('labels', [])]
    pick = lambda pre, dflt: next((x[len(pre):] for x in names if x.startswith(pre)), dflt)  # noqa: E731
    m = re.search(r'<!-- work (.*?) -->', i.get('body') or '', re.S)
    try:
        meta = json.loads(m.group(1).replace('- -', '--')) if m else {}
    except ValueError:
        meta = {}
    return {'id': str(i['number']), 'title': i['title'], 'kind': pick('kind:', 'task'), 'owner': pick('owner:', 'claude-main'),
            'state': pick('state:', 'done' if i.get('state') == 'CLOSED' else 'todo'), 'open': i.get('state') == 'OPEN',
            'source': meta.get('source', []), 'next': meta.get('next', ''), 'done_ref': meta.get('done_ref', ''),
            'reason': meta.get('reason', ''), 'detail': meta.get('detail', ''),
            'created': i.get('createdAt'), 'updated': meta.get('updated') or i.get('updatedAt'), 'url': i.get('url')}


def items(fresh=False):
    """Every work issue, open and closed, from a 60 s cache shared by the CLI, the hook and the review server."""
    try:
        if not fresh and time.time() - os.path.getmtime(CACHE) < CACHE_SECONDS:
            return json.load(open(CACHE, encoding='utf-8'))
    except (OSError, ValueError):
        pass
    out = [to_item(i) for i in gh('issue', 'list', '--label', 'work', '--state', 'all', '--limit', '1000', '--json', FIELDS)]
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    tmp = f'{CACHE}.{os.getpid()}'
    json.dump(out, open(tmp, 'w', encoding='utf-8'), ensure_ascii=False)
    os.replace(tmp, CACHE)
    return out


def drop_cache():
    try:
        os.remove(CACHE)
    except OSError:
        pass


def load(num):
    return to_item(gh('issue', 'view', str(num).lstrip('#'), '--json', FIELDS))


def check(kind=None, owner=None, state=None):
    if kind is not None and kind not in KINDS:
        sys.exit(f'kind must be one of: {", ".join(KINDS)}')
    if state is not None and state not in STATES:
        sys.exit(f'state must be one of: {", ".join(STATES)}')
    if owner is not None and not OWNER_RE.match(owner):
        sys.exit('owner must be claude-main, claude-agent:<name>, codex, grok or jorgen')


def add(title, kind='task', owner='claude-main', state='todo', source=None, next_step='', detail='', reason='', done_ref='',
        updated=None):
    """Open one issue (closed straight away for done or dropped) and return it as an item. `updated` backdates the
    stale clock (for work moved in from older lists)."""
    check(kind, owner, state)
    item = {'title': title, 'kind': kind, 'owner': owner, 'state': state, 'source': source or [], 'next': next_step,
            'detail': detail, 'reason': reason, 'done_ref': done_ref, 'updated': updated or stamp()}
    b = body(item)
    guard(title, b)
    url = gh('issue', 'create', '--title', title, '--body-file', '-', *[a for lab in labels(item) for a in ('--label', lab)],
             parse=False, stdin=b).strip()
    item['id'], item['url'] = url.rsplit('/', 1)[-1], url
    if state in CLOSED:
        gh('issue', 'close', item['id'], '--reason', 'completed' if state == 'done' else 'not planned', parse=False)
    drop_cache()
    return item


def update(num, note=None, comment=None, **fields):
    """Change fields, rewrite the body, move labels, comment the change, close or reopen. Returns the item."""
    num = str(num).lstrip('#')
    old = load(num)
    check(fields.get('kind'), fields.get('owner'), fields.get('state'))
    item = dict(old)
    for k, v in fields.items():
        if v is not None:
            item[k] = v
    item['updated'] = stamp()
    b = body(item)
    say = comment
    if not say and (note or item['state'] != old['state']):
        say = item['state'] + (f': {note}' if note else '')
    guard(item['title'], b, say)
    drop = [lab for lab in labels(old) if lab not in labels(item)]
    gh('issue', 'edit', num, '--title', item['title'], '--body-file', '-', *[a for lab in labels(item) for a in ('--add-label', lab)],
       *[a for lab in drop for a in ('--remove-label', lab)], parse=False, stdin=b)
    if say:
        gh('issue', 'comment', num, '--body-file', '-', parse=False, stdin=say)
    if item['state'] in CLOSED and old['open']:
        gh('issue', 'close', num, '--reason', 'completed' if item['state'] == 'done' else 'not planned', parse=False)
    elif item['state'] not in CLOSED and not old['open']:
        gh('issue', 'reopen', num, parse=False)
    drop_cache()
    return item


def ensure_labels():
    colours = {'work': '5319e7', 'state': '0e8a16', 'kind': '1d76db', 'owner': 'c5def5'}
    have = {x['name'] for x in gh('label', 'list', '--limit', '500', '--json', 'name')}
    want = ['work'] + [f'state:{s}' for s in STATES] + [f'kind:{k}' for k in KINDS] + \
        ['owner:claude-main', 'owner:codex', 'owner:grok', 'owner:jorgen'] + sorted({f'owner:{i["owner"]}' for i in items()} - {'owner:'})
    for lab in want:
        if lab not in have:
            gh('label', 'create', lab, '--color', colours[lab.split(':')[0]], parse=False)
            print(f'label {lab}')


# ---------------------------------------------------------------- reviews
def review_items():
    out = []
    for p in sorted(glob.glob(os.path.join(REVIEWS, '*', 'review.json'))):
        rid = p.split(os.sep)[-2]
        try:
            r = json.load(open(p, encoding='utf-8'))
        except ValueError:
            continue
        fp = os.path.join(REVIEWS, rid, 'feedback.json')
        fb = json.load(open(fp, encoding='utf-8')) if os.path.exists(fp) else {}
        out.append((rid, r, fb))
    return out


def decided_at(r, fb):
    """review.json decided_at (review.py sets it), else his last send, else the review's date."""
    return r.get('decided_at') or (fb or {}).get('sent') or r.get('date')


def changed_at(r, fb):
    """The latest of the decision and his last send: what the issue must have caught up with."""
    ts = [t for t in (parse_time(r.get('decided_at')), parse_time((fb or {}).get('sent'))) if t]
    return max(ts) if ts else None


def linked(all_items, rid, r=None):
    keys = {f'review:{rid}', f'reviews/{rid}'}
    num = str((r or {}).get('issue') or '')
    return [i for i in all_items if keys & set(i.get('source') or []) or i['id'] == num]


def followup_for(rid, r, all_items=None):
    """review.py set-status decided: open the follow-up issue, or comment on and reopen the one it has."""
    what = r.get('decision') or ', '.join(r.get('decided') or []) or 'see the review'
    reason = f'Jørgen decided on {review_md(rid)}: “{what}”'
    have = linked(all_items if all_items is not None else items(), rid, r)
    if have:
        i = have[0]
        i = update(i['id'], state='todo' if i['state'] in CLOSED else None, reason=reason,
                   comment=f'The decision on {review_md(rid)} changed: “{what}”. Reopened.' if i['state'] in CLOSED
                   else f'The decision on {review_md(rid)} is now: “{what}”.')
        return i, False
    return add(f"Act on Jørgen's pick: {r.get('title', rid)}", 'decision-followup', 'claude-main', 'todo', [f'review:{rid}'],
               'Do what the decision says and close this with the commit.', reason=reason), True


def review_feedback(rid):
    """New feedback on a decided review that has an issue (called by tools/review_server.py): comment and reopen."""
    p = os.path.join(REVIEWS, rid, 'review.json')
    r = json.load(open(p, encoding='utf-8'))
    if r.get('status') != 'decided' or not r.get('issue'):
        return None
    i = load(r['issue'])
    return update(i['id'], state='todo' if i['state'] in CLOSED else None,
                  comment=f'Jørgen sent new feedback on {review_md(rid)}.' + (' Reopened.' if i['state'] in CLOSED else ''))


# ---------------------------------------------------------------- stale and out of sync
def stale(at=None, all_items=None):
    """Everything stuck or out of sync, oldest first: dicts with id (issue number or review:<id>), title, owner,
    reasons, hours, url."""
    at = at or now()
    all_items = items() if all_items is None else all_items
    by_id, out = {}, []

    def flag(key, title, owner, reason, hours, url):
        if key in by_id:
            by_id[key]['reasons'].append(reason)
            by_id[key]['hours'] = max(by_id[key]['hours'], hours)
            return
        by_id[key] = {'id': key, 'title': title, 'owner': owner, 'reasons': [reason], 'hours': hours, 'url': url}
        out.append(by_id[key])

    for rid, r, fb in review_items():
        st = r.get('status', 'open')
        links = linked(all_items, rid, r)
        url_r = f'{REPO_URL}/blob/main/reviews/{rid}/review.json'
        if st == 'decided':
            h = hours_since(decided_at(r, fb), at)
            if not links:
                flag(f'review:{rid}', r.get('title', rid), 'nobody', f'Review {rid} decided {age(h)} ago, no issue', h, url_r)
                continue
            if h >= DECISION_HOURS and all(i['state'] == 'todo' for i in links):
                i = links[0]
                flag(i['id'], i['title'], i['owner'], f'Review {rid} decided {age(h)} ago, follow-up not started', h, i['url'])
            ch = changed_at(r, fb)
            for i in links:
                up = parse_time(i['updated'])
                if ch and up and ch > up:
                    flag(i['id'], i['title'], i['owner'], f'Review {rid} changed after the issue was last updated', (at - ch).total_seconds() / 3600, i['url'])
        elif st == 'open':
            for i in links:
                if not i['open']:
                    flag(i['id'], i['title'], i['owner'], f'closed, but Review {rid} is open again', 0, i['url'])
    for i in all_items:
        h = hours_since(i['updated'], at)
        if i['state'] in ('todo', 'running', 'blocked') and h >= ACTIVE_HOURS:
            flag(i['id'], i['title'], i['owner'], f'{i["state"]}, untouched for {age(h)}', h, i['url'])
        elif i['state'] == 'parked' and h >= PARKED_HOURS:
            flag(i['id'], i['title'], i['owner'], f'parked for {age(h)}', h, i['url'])
    return sorted(out, key=lambda s: -s['hours'])


def label_of(s):
    return f'#{s["id"]}' if s['id'].isdigit() else s['id']


def stale_lines(limit=12):
    """A short plain list for tools/review.py, the answers hook and post-commit; [] when nothing is stuck."""
    s = stale()
    if not s:
        return []
    lines = [f'Stuck work ({len(s)}; python3 tools/work.py stale; {REPO_URL}/issues?q=label%3Awork):']
    lines += [f'  {label_of(x)} [{x["owner"]}] {"; ".join(x["reasons"])}: {x["title"][:80]}' for x in s[:limit]]
    if len(s) > limit:
        lines.append(f'  and {len(s) - limit} more (python3 tools/work.py stale)')
    return lines


# ---------------------------------------------------------------- CLI
def row(i):
    return f'{i["state"]:14} #{i["id"]:<5} [{i["owner"]}] {i["title"][:90]}' + (f'\n{"":21}next: {i["next"]}' if i.get('next') and i['open'] else '')


def opts(a, *names):
    out, pos, k = {}, [], 0
    while k < len(a):
        if a[k].startswith('--') and a[k][2:] in names:
            flag = a[k][2:]
            if flag in ('all', 'brief'):
                out[flag] = True
                k += 1
                continue
            if k + 1 >= len(a):
                sys.exit(f'--{flag} needs a value')
            out[flag], k = a[k + 1], k + 2
        elif a[k].startswith('--'):
            sys.exit(f'unknown option {a[k]}\n\n{__doc__}')
        else:
            pos.append(a[k])
            k += 1
    return out, pos


def split(v):
    return [s.strip() for s in v.split(',') if s.strip()] if v else None


def main(a):
    if not a or a[0] in ('-h', '--help'):
        print(__doc__)
        return 0
    cmd, a = a[0], a[1:]
    if cmd == 'add':
        o, pos = opts(a, 'kind', 'owner', 'state', 'source', 'next', 'detail')
        if len(pos) != 1:
            sys.exit('add needs one title')
        i = add(pos[0], o.get('kind', 'task'), o.get('owner', 'claude-main'), o.get('state', 'todo'), split(o.get('source')),
                o.get('next', ''), o.get('detail', ''))
        print(f'#{i["id"]} {i["url"]}')
    elif cmd in ('set', 'touch', 'done'):
        o, pos = opts(a, 'state', 'owner', 'next', 'source', 'title', 'done-ref', 'note', 'kind', 'ref')
        if len(pos) != 1:
            sys.exit(f'{cmd} needs one issue number')
        f = {'state': 'done' if cmd == 'done' else o.get('state'), 'owner': o.get('owner'), 'next': o.get('next'),
             'title': o.get('title'), 'kind': o.get('kind'), 'done_ref': o.get('done-ref') or o.get('ref'), 'source': split(o.get('source'))}
        i = update(pos[0], o.get('note'), comment=('still on it' + (f': {o["note"]}' if o.get('note') else '')) if cmd == 'touch' else None, **f)
        print(f'#{i["id"]}: {i["state"]}')
    elif cmd == 'list':
        o, _ = opts(a, 'state', 'owner', 'kind', 'all')
        order = {s: n for n, s in enumerate(('running', 'blocked', 'waiting-jorgen', 'todo', 'parked', 'done', 'dropped'))}
        rows = [i for i in items() if (o.get('all') or o.get('state') or i['state'] not in CLOSED)
                and all(not o.get(k) or i.get(k) == o[k] or (k == 'owner' and i['owner'].startswith(o[k])) for k in ('state', 'owner', 'kind'))]
        for i in sorted(rows, key=lambda i: (order.get(i['state'], 9), int(i['id']))):
            print(row(i))
        print(f'{len(rows)} issues')
    elif cmd == 'show':
        if not a:
            sys.exit('show needs an issue number')
        print(gh('issue', 'view', a[0].lstrip('#'), '--comments', parse=False))
    elif cmd == 'stale':
        o, _ = opts(a, 'brief')
        try:
            lines = stale_lines(limit=8 if o.get('brief') else 1000)
        except RuntimeError as e:
            print(f'work: could not read the issues ({e})')
            return 2
        print('\n'.join(lines) if lines else 'Nothing stuck.')
        return 1 if lines else 0
    elif cmd == 'labels':
        ensure_labels()
    else:
        sys.exit(__doc__)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
