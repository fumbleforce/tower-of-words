#!/usr/bin/env python3
"""Build the world bible's static data.

    python3 tools/bible/build.py        (./start runs it for you)

Most of the bible is read live by the page itself (bible/live.js fetches GUIDE.md, the game facts in docs/game/,
the story files, lang.js, ui.js, VOICE.md, art/approved/README.md, the design notes and the build ids when it loads).
This script does the parts a browser can't: it checks and resolves bible/facts.yaml (hand-kept facts only),
looks up review pages with git, reads the image prompts, lists folders as a fallback for servers without
directory listings, and writes island/private/bible/private.json (local only). It never reads island/private/user/.

Writes bible/data.json.
"""
import glob
import html
import importlib.util
import json
import os
import re
import subprocess
import time

import yaml

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PUB_OUT = os.path.join(ROOT, 'bible', 'data.json')
PRIV_DIR = os.path.join(ROOT, 'island', 'private', 'bible')
PRIV_OUT = os.path.join(PRIV_DIR, 'private.json')
STATUSES = {'approved', 'draft', 'rejected', 'review', 'legacy'}
WARN = []
_files = {}


def warn(msg):
    WARN.append(msg)


def rel(p):
    return os.path.relpath(p, ROOT)


def archived(path):
    """Known retired paths are citations into the offline backup, never live sources."""
    return bool(path) and (path.startswith(('legacy/', 'art/pixel/', 'tools/pixellab/'))
        or path in ('notes/directions.md', 'notes/island-slice-plan.md', 'notes/map-design.md')
        or (path.startswith('art/island/') and path != 'art/island/island-map-4-topdown.png'))


def exists(p):
    return bool(p) and os.path.exists(os.path.join(ROOT, p))


def read(p):
    if p not in _files:
        with open(os.path.join(ROOT, p), encoding='utf-8') as f:
            _files[p] = f.read().split('\n')
    return _files[p]


# ---------------------------------------------------------------- sources and facts

def source(spec):
    """'path ~ phrase' -> {path, line, label}. The phrase is looked up so the line survives edits."""
    if not spec:
        return None
    if spec.startswith('http'):
        return {'path': spec, 'label': spec}
    n = None
    m = re.search(r'\s#(\d+)$', spec)
    if m:  # "path ~ phrase #2": quote exactly two sentences
        n, spec = int(m.group(1)), spec[:m.start()]
    path, _, phrase = [s.strip() for s in spec.partition('~')]
    if 'island/private/user' in path:
        raise SystemExit('refusing a source in island/private/user')
    out = {'path': path, 'label': path}
    if archived(path):
        return {**out, 'archived': True}
    if not exists(path):
        warn(f'missing source file: {path}')
        return out
    if phrase and not path.endswith(('.webp', '.png', '.wav', '.jpg')):
        lines = read(path)
        hit = next((i for i, l in enumerate(lines) if phrase in l), None)
        if hit is None:
            low = phrase.lower()
            hit = next((i for i, l in enumerate(lines) if low in l.lower()), None)
        if hit is None:
            warn(f'phrase not found in {path}: {phrase!r}')
        else:
            out['line'] = hit + 1
            out['label'] = f'{path}:{hit + 1}'
            out['phrase'] = phrase
    if n:
        out['n'] = n
    return out


def fact(f, where=''):
    """[text, status, source] or {q: 'path ~ phrase', s: status} (a live quote)."""
    if isinstance(f, dict):
        if 'q' in f:
            src = source(f['q'])
            if f.get('s') and f['s'] not in STATUSES:
                warn(f'bad status {f["s"]!r} in {where}')
            return {'q': True, 's': f.get('s', 'approved'), 'src': src}
        return f
    text, status, src = (list(f) + [None, None, None])[:3]
    if status not in STATUSES:
        warn(f'bad status {status!r} in {where}: {text[:60]}')
    return {'t': text, 's': status, 'src': source(src)}


def facts(lst, where=''):
    return [fact(f, where) for f in (lst or [])]


def quotes(lst):
    return [{'q': True, 's': 'approved', 'src': source(s)} for s in (lst or [])]


def image(p, label='', status='draft'):
    if not exists(p) and not archived(p):
        warn(f'missing image: {p}')
    return {'src': p, 'label': label, 's': status, 'archived': archived(p)}


# ---------------------------------------------------------------- markdown helpers

def legacy_note(path):
    """Historical notes are optional in a clean public checkout."""
    if archived(path):
        return []
    if not exists(path):
        warn(f'optional historical note missing: {path}; legacy section left empty')
        return []
    return read(path)


def md_section(path, heading):
    lines = legacy_note(path)
    for i, l in enumerate(lines):
        if re.match(r'#{1,3} ', l) and l.lstrip('#').strip().startswith(heading):
            lvl = len(l) - len(l.lstrip('#'))
            body = []
            for m in lines[i + 1:]:
                if re.match(r'#{1,%d} ' % lvl, m):
                    break
                body.append(m)
            return '\n'.join(body).strip(), i + 1
    if not archived(path):
        warn(f'section not found: {path} {heading}')
    return '', None


def md_sections(path, level=2):
    lines = legacy_note(path)
    mark = '#' * level + ' '
    out, cur, start, buf = [], None, 0, []
    for i, l in enumerate(lines):
        if re.match(r'#{1,%d} ' % level, l):
            if cur:
                out.append((cur, '\n'.join(buf).strip(), start))
            cur = l[len(mark):].strip() if l.startswith(mark) else None
            start, buf = i + 1, []
            continue
        buf.append(l)
    if cur:
        out.append((cur, '\n'.join(buf).strip(), start))
    return out


def numbered(path, heading):
    body, line = md_section(path, heading)
    return [{'t': re.sub(r'^\d+\.\s*', '', l), 'src': {'path': path, 'line': line, 'label': f'{path}:{line}'}}
            for l in body.split('\n') if re.match(r'\d+\.', l)]


# ---------------------------------------------------------------- prompts and legacy images

def manifest_prompts():
    p = os.path.join(ROOT, 'art', 'production', 'manifest.json')
    if not os.path.exists(p):
        warn('art/production/manifest.json not found (local only); approved prompts left out')
        return {}
    return {e['name']: e for e in json.load(open(p, encoding='utf-8'))}


def seed_presets():
    try:
        spec = importlib.util.spec_from_file_location('seed', os.path.join(ROOT, 'tools', 'imagegen', 'seed.py'))
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return {c['id']: c['data'] for c in mod.CHARACTERS}
    except Exception as e:  # the dashboard is optional
        warn(f'tools/imagegen/seed.py: {e}')
        return {}


def emi_prompt():
    import ast
    tree = ast.parse(open(os.path.join(ROOT, 'tools', 'emi2.py'), encoding='utf-8').read())
    vals = {}
    for node in tree.body:
        if isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Name):
            try:
                vals[node.targets[0].id] = ast.literal_eval(node.value)
            except Exception:
                pass
    q = ('masterpiece, best quality, score_9, score_8, score_7, year 2025, newest, highres, absurdres, very aesthetic, safe, '
         'anime screenshot, anime coloring, 2d, cel shading, clean lineart, ')
    return {'prompt': q + ', '.join([vals['BASE'], vals['WORK'], vals['FRAME']]), 'negative': vals['N'],
            'model': 'rdbtAnima', 'seed': 41}


def legacy_images(cid):
    """The old expression sets: VN sprites, island-slice sprites, the proto2 gallery sets. None is used by game3d."""
    out, seen = [], set()
    alias = {'kuro': 'luna'}.get(cid, cid)
    sets = [] if cid == 'mc' else [  # the MC's gallery set is under review, so facts.yaml lists it in `images`
        (f'legacy/proto2/gallery/B-{cid}-*.webp', 'Gallery expression set (VN era)'),
        (f'legacy/proto2/gallery/A-{alias}-*.webp', 'Gallery set A (VN era)'),
    ]
    sets += [
        (f'art/island/export/sprites/{cid}-*.webp', 'Island slice dialogue sprite (never picked)'),
        (f'legacy/game/img/ch/{cid}-*.webp', 'VN game sprite'),
    ]
    if cid == 'emi':
        sets.append(('legacy/proto2/emi2/r3-rdbt-work-*.webp', 'Round-3 expression (VN era)'))
    for pat, label in sets:
        for p in sorted(glob.glob(os.path.join(ROOT, pat))):
            name = os.path.basename(p)
            if name in seen or re.search(r'-s10[12]\.webp$', name) or (cid == 'kuro' and 's102' in name):
                continue
            seen.add(name)
            expr = re.sub(r'^(B-|A-)?(%s|%s)-|r3-rdbt-work-|\.webp$' % (cid, alias), '', name)
            out.append({'src': rel(p), 'label': expr, 'note': label, 's': 'legacy'})
    return out


def mini_arcs():
    path = 'notes/mini-stories.md'
    arcs = {}
    for head, body, line in md_sections(path, 2):
        m = re.match(r'(\d+)\. (.+?): (.+)', head)
        if not m or line > 430:
            continue
        for n in re.split(r' and ', m.group(2)):
            arcs.setdefault(n.strip().lower(), []).append(
                {'title': head, 'md': body, 'src': {'path': path, 'line': line, 'label': f'{path}:{line}'}})
    return arcs


# ---------------------------------------------------------------- review pages

def git(*args):
    try:
        return subprocess.run(['git', *args], cwd=ROOT, capture_output=True, text=True).stdout
    except Exception:
        return ''


def page_title(p):
    if not p.endswith('.html'):
        return '', ''
    s = open(os.path.join(ROOT, p), encoding='utf-8', errors='replace').read()
    t = re.search(r'<title>(.*?)</title>', s, re.S)
    h = re.search(r'<h1[^>]*>(.*?)</h1>', s, re.S)
    clean = lambda x: html.unescape(re.sub(r'<[^>]+>', '', x)).strip() if x else ''
    return clean(t.group(1) if t else ''), clean(h.group(1) if h else '')


def reviews(notes):
    tracked = set(git('ls-files').split('\n'))
    pages = []
    for pat in ['legacy/proto2/**/*.html', 'legacy/side/**/*.html', 'game3d/design/*.html', 'art/company/local2/index.html',
                'art/concept/index.html', 'legacy/mvp/index.html', 'legacy/island/web/index.html']:
        for p in sorted(glob.glob(os.path.join(ROOT, pat), recursive=True)):
            r = rel(p)
            if any(x in r for x in ('/node_modules/', '/vendor/', '/qa/')):
                continue
            pages.append(r)
    pages += [k for k in notes if not k.startswith('http') and k not in pages]
    out = []
    for r in pages:
        if archived(r):
            what, status, note = (list(notes.get(r, [])) + ['', '', ''])[:3]
            out.append({'path': r, 'title': what or r, 'what': what, 'status': status or 'legacy',
                        'note': note, 'date': '', 'where': 'offline archive', 'group': 'legacy',
                        'area': '/'.join(r.split('/')[:2]), 'archived': True})
            continue
        if not exists(r):
            warn(f'review page missing: {r}')
            continue
        title, h1 = page_title(r)
        n = notes.get(r)
        if not n:
            if re.search(r'/(js|tools|img|media|ref|shots)/', r):
                continue
            warn(f'review page without a note in facts.yaml: {r}')
            n = ['(No note yet.)', 'open', '']
        what, status, note = (list(n) + ['', '', ''])[:3]
        if r.startswith('legacy/'):
            group = 'legacy'
        else:
            group = 'legacy' if status == 'legacy' else 'current'
        date = git('log', '-1', '--format=%cs', '--', r).strip() if r in tracked else ''
        if not date:
            date = time.strftime('%Y-%m-%d', time.localtime(os.path.getmtime(os.path.join(ROOT, r))))
        where = 'tracked' if r in tracked else ('local only (git-ignored)' if subprocess.run(['git', 'check-ignore', '-q', r], cwd=ROOT).returncode == 0 else 'not committed')
        out.append({'path': r, 'title': title or h1 or os.path.basename(r), 'what': what, 'status': status, 'note': note,
                    'date': date, 'where': where, 'group': group, 'area': r.split('/')[0] if not r.startswith('legacy/') else '/'.join(r.split('/')[:2])})
    for key, n in notes.items():
        if key.startswith('http'):
            what, status, note = (list(n) + ['', '', ''])[:3]
            out.append({'path': key, 'title': 'Image gen dashboard', 'what': what, 'status': status, 'note': note,
                        'date': '', 'where': 'local server', 'group': 'current', 'area': 'local', 'external': True})
    out.sort(key=lambda o: (o['date'], o['path']), reverse=True)
    return out


# ---------------------------------------------------------------- folder snapshots (fallback for the live page)

def listing(d, exts):
    full = os.path.join(ROOT, d)
    if not os.path.isdir(full):
        return []
    return sorted(f for f in os.listdir(full) if f.endswith(exts) or (exts == ('/',) and os.path.isdir(os.path.join(full, f))))


# ---------------------------------------------------------------- build

def build():
    F = yaml.safe_load(open(os.path.join(ROOT, 'bible', 'facts.yaml'), encoding='utf-8'))
    prompts = manifest_prompts()
    presets = seed_presets()
    arcs = mini_arcs()

    chars = []
    for c in F['characters']:
        cid = c['id']
        where = f'character {cid}'
        o = {k: c[k] for k in ('id', 'name', 'group', 'pick', 'game', 'story_name', 'approved_art', 'voice_prefix',
                               'walkthrough', 'portrait_status', 'idea', 'model3d') if k in c}
        if c.get('portrait'):
            o['portrait'] = image(c['portrait'], c.get('pick', ''), 'approved')
        if c.get('portrait_note'):
            o['portrait_note'] = fact(c['portrait_note'], where)
        if o.get('walkthrough') and not exists(o['walkthrough']):
            warn(f'missing walkthrough {o["walkthrough"]}')
        o['images'] = [image(p, l, s) for p, l, s in c.get('images', [])]
        if c.get('model'):
            m = c['model']
            o['model'] = {**m, 'exists': exists(m['dir']), 'src': source(m.get('src'))}
        for k in ('decisions', 'facts', 'rejected', 'legacy'):
            o[k] = facts(c.get(k), where)
        o['history'] = [{'label': l, 'path': p, 's': s, 'exists': exists(p), 'archived': archived(p)} for l, p, s in c.get('history', [])]
        for h in o['history']:
            if not h['exists'] and not h['archived']:
                warn(f'missing history page {h["path"]}')
        pr = []
        if cid == 'emi':
            pr.append({'title': 'Approved portrait prompt (round 3, RDBT seed 41)', 's': 'approved', **emi_prompt(),
                       'src': {'path': 'tools/emi2.py', 'label': 'tools/emi2.py'}})
        elif c.get('prompt_id') and c['prompt_id'] in prompts:
            e = prompts[c['prompt_id']]
            pr.append({'title': f'Approved portrait prompt ({c["prompt_id"]})', 's': 'approved', 'prompt': e['prompt'],
                       'negative': e['negative'], 'model': e.get('model'), 'seed': e.get('seed'),
                       'src': {'path': 'art/production/manifest.json', 'label': 'art/production/manifest.json (local only)'}})
        if cid in presets:
            d = presets[cid]
            text = ', '.join(x for x in [d.get('name'), d.get('age'), d.get('look'), d.get('signature'), d.get('build')] if x)
            pr.append({'title': 'Image dashboard preset (reward look)', 's': 'draft', 'prompt': text,
                       'outfit': d.get('outfit', ''), 'negative': d.get('negative', ''), 'notes': d.get('notes', ''),
                       'src': {'path': 'tools/imagegen/seed.py', 'label': 'tools/imagegen/seed.py'}})
        o['prompts'] = pr
        o['legacy_images'] = legacy_images(cid) if not c.get('idea') else []
        o['legacy_arcs'] = arcs.get(c['name'].lower(), []) if cid != 'mc' else []
        chars.append(o)

    places = []
    for p in F['places']:
        o = dict(p)
        o['quotes'] = quotes(p.get('quotes'))
        if not exists(p['ref']):
            warn(f'missing place ref {p["ref"]}')
        places.append(o)

    locs = []
    for l in F['locations']:
        o = {k: l.get(k) for k in ('id', 'name', 'pick')}
        o['image'] = image(l['image'], l.get('pick') or l['name'], 'legacy')
        o['facts'] = facts(l.get('facts'), l['id'])
        o['pages'] = [{'path': p, 'exists': exists(p)} for p in l.get('pages', [])]
        locs.append(o)

    S = F['story']
    story = {'legacy': facts(S['legacy']),
             'legacy_docs': [{'title': d['title'], 'path': d['doc'], 'exists': exists(d['doc']), 'archived': archived(d['doc'])} for d in S['legacy_docs']]}
    for d in story['legacy_docs']:
        if not d['exists'] and not d['archived']:
            warn(f'missing legacy doc {d["path"]}')

    rules = [{'group': g['group'], 'quotes': quotes(g['quotes'])} for g in F['rules']]
    A = F['art']
    art = {'models': facts(A['models']), 'quotes': quotes(A['quotes']), 'donts': facts(A['donts'])}
    AU = F['audio']
    audio = {'music': facts(AU['music']), 'quotes': quotes(AU['quotes']),
             'tracks': [{'src': p, 'label': l, 's': s, 'exists': exists(p)} for p, l, s in AU['tracks']]}

    Q = F['questions']
    item = lambda row: {'t': row[0], 'src': source(row[1]), 'char': row[2] if len(row) > 2 else None}
    qs = {
        'open': [item(r) for r in Q['open']],
        'conflicts': [item(r) for r in Q['conflicts']],
        'closed': [{'t': t, 'src': source(s)} for t, s in Q['closed']],
        'closes': [{'match': m, 'src': source(s)} for m, s in Q['closes']],
        'legacy': [item(r) for r in Q['legacy']],
        'legacy_lists': [
            {'title': 'Questions at the end of notes/mini-stories.md', 'items': numbered('notes/mini-stories.md', 'Open questions for Jørgen')},
            {'title': 'Decisions the island slice plan needed', 'items': numbered('notes/island-slice-plan.md', '18. Decisions needed')},
            {'title': 'Map questions (pixel era)', 'items': numbered('notes/map-design.md', '11. Questions')},
        ],
    }

    data = {
        'generated': time.strftime('%Y-%m-%d %H:%M'),
        'characters': chars,
        'removed': facts(F['removed']),
        'cast_rules': facts(F['cast_rules']),
        'places': places,
        'locations': locs,
        'places_mentioned': facts(F['places_mentioned']),
        'story': story,
        'rules': rules,
        'legacy_rules': facts(F['legacy_rules']),
        'art': art,
        'audio': audio,
        'reviews': reviews(F['reviews']),
        'questions': qs,
        # fallbacks for the live page when the server gives no directory listings
        'snapshot': {
            'game3d/assets/portraits/': listing('game3d/assets/portraits', ('.webp',)),
            'tools/voice-refs/': listing('tools/voice-refs', ('.wav',)),
            'notes/walkthrough/': listing('notes/walkthrough', ('.md',)),
            'docs/game/stories/': listing('docs/game/stories', ('.md',)),
            'game3d/shots/': [d + '/' for d in listing('game3d/shots', ('/',))],
            'reviews/': [d + '/' for d in listing('reviews', ('/',))],
        },
    }
    s = json.dumps(data, ensure_ascii=False, indent=1)
    for m in re.finditer(r'"(?:path|src|file|img|page)": "island/private[^"]*"', s):
        raise SystemExit('public data links into island/private: ' + m.group(0))
    open(PUB_OUT, 'w', encoding='utf-8').write(s)
    print(f'wrote {rel(PUB_OUT)}: {len(chars)} characters, {len(data["reviews"])} review pages, '
          f'{len(qs["open"])} open questions')
    build_private(chars)


# ---------------------------------------------------------------- private (local only)

def build_private(chars):
    base = os.path.join(ROOT, 'island', 'private', 'rewards')
    if not os.path.isdir(base):
        print('no island/private/rewards; private bible skipped')
        return
    os.makedirs(PRIV_DIR, exist_ok=True)
    ids = {c['id'] for c in chars if c['id'] not in ('mc', 'cctv', 'goro', 'jun', 'ishibashi', 'mori', 'kenji', 'hamada')}
    names = {c['name'].split()[-1]: c['id'] for c in chars if c['id'] in ids}

    def owners(cid_text, note=''):
        own = [t for t in cid_text.split('-') if t in ids]
        if not own:
            own = [names[n] for n in names if re.search(r'\b%s\b' % n, note)]
        return own

    def thumb(folder, rid):
        for p in (f'{folder}/web/{rid}.webp', f'{folder}/img/{rid}.webp', f'{folder}/img/{rid}.png'):
            if os.path.exists(os.path.join(base, p)):
                return 'island/private/rewards/' + p
        warn(f'no thumbnail for {folder}/{rid}')
        return None

    per = {i: [] for i in ids}
    group = []
    lines = open(os.path.join(base, 'CONCEPTS.md'), encoding='utf-8').read().split('\n')
    picks = json.load(open(os.path.join(base, 'archive', 'picks.json'), encoding='utf-8'))
    for i, l in enumerate(lines):
        m = re.match(r'## (\d+)\. (.+?): (.+?) \(`([a-z0-9-]+)`\)', l)
        if not m:
            continue
        rid = m.group(4)
        body = []
        for x in lines[i + 1:]:
            if x.startswith('## ') or x.startswith('---'):
                break
            body.append(x)
        body = '\n'.join(body).strip()
        stage = re.search(r'^Stage: (.+)$', body, re.M)
        trig = re.search(r'^Trigger: (.+)$', body, re.M)
        p = picks.get(rid, {})
        it = {'id': rid, 'title': f'{m.group(2)}: {m.group(3)}', 'round': 'concepts (2026-09-26)',
              'stage': stage.group(1) if stage else '', 'trigger': trig.group(1) if trig else '',
              'src': {'path': 'island/private/rewards/CONCEPTS.md', 'line': i + 1, 'label': f'island/private/rewards/CONCEPTS.md:{i + 1}'},
              'page': 'island/private/rewards/archive/index.html',
              'private': [{'id': x, 'img': thumb('archive', x)} for x in p.get('private', [])],
              'discreet': [{'id': x, 'img': thumb('archive', x)} for x in p.get('discreet', [])],
              'by': 'proposed pick (agent)', 's': 'draft'}
        own = owners(rid, body[:600])
        if not own or rid.startswith(('team', 'group')):
            group.append(it)
        for o in own:
            per[o].append(it)
    if 'mio-karaoke' in picks and 'mio' in per:
        p = picks['mio-karaoke']
        per['mio'].append({'id': 'mio-karaoke', 'title': "Mio: the slice's karaoke photo", 'round': 'island slice',
                           'private': [{'id': x, 'img': thumb('archive', x)} for x in p.get('private', [])],
                           'discreet': [{'id': x, 'img': thumb('archive', x)} for x in p.get('discreet', [])],
                           'page': 'island/private/rewards/archive/index.html', 'by': 'proposed pick (agent)', 's': 'draft'})
    for rnd in ('round-27', 'round-28'):
        n = json.load(open(os.path.join(base, 'archive', rnd, 'notes.json'), encoding='utf-8'))
        rend = n['renders']
        for cid_, v in n['concepts'].items():
            pick = v.get('pick')
            by_j = v.get('pick_by') == 'jorgen' or 'Jørgen' in rend.get(pick, {}).get('verdict', '')
            it = {'id': cid_, 'title': cid_, 'round': rnd, 'pick': pick, 'img': thumb('archive/' + rnd, pick) if pick else None,
                  'note': rend.get(pick, {}).get('note', ''), 'critic': v.get('critic_note', ''), 'scores': v.get('scores', {}),
                  'by': "Jørgen's pick" if by_j else 'critic pick (agent)', 's': 'approved' if by_j else 'draft',
                  'page': f'island/private/rewards/archive/{rnd}/index.html'}
            if v.get('why'):
                it['why'] = v['why']
            own = owners(cid_, it['note'])
            if not own or cid_.startswith(('group', 'team')):
                group.append(it)
            for o in own:
                per[o].append(it)
        for rid, v in rend.items():
            if 'Jørgen' in v.get('verdict', '') and not any(rid == x.get('pick') for lst in per.values() for x in lst):
                for o in owners(rid, v.get('note', '')):
                    per[o].append({'id': rid, 'title': rid, 'round': rnd, 'pick': rid, 'img': thumb('archive/' + rnd, rid), 'note': v['note'],
                                   'by': "Jørgen's pick", 's': 'approved', 'page': f'island/private/rewards/archive/{rnd}/index.html'})
    priv = {
        'generated': time.strftime('%Y-%m-%d %H:%M'),
        'rewards': per,
        'group': group,
        'pages': [
            {'path': 'island/private/rewards/archive/index.html', 'title': 'Reward scenes, first sessions (concepts 1 to 17)'},
            {'path': 'island/private/rewards/archive/round-27/index.html', 'title': 'Round 27: 31 concepts in the round-2 style'},
            {'path': 'island/private/rewards/archive/round-28/index.html', 'title': 'Round 28: 41 concepts, RDBT only, and the Kiyoko age test'},
            {'path': 'http://127.0.0.1:8772/', 'title': 'Image gen dashboard (tools/imagegen/run.sh)'},
        ],
        'rules': [
            {'q': True, 's': 'approved', 'src': source('GUIDE.md ~ Model (2026-09-27, after round 27)')},
            {'q': True, 's': 'approved', 'src': source('GUIDE.md ~ Limit test (Jørgen')},
        ],
    }
    open(PRIV_OUT, 'w', encoding='utf-8').write(json.dumps(priv, ensure_ascii=False, indent=1))
    print(f'wrote {rel(PRIV_OUT)}: {sum(len(v) for v in per.values())} character reward entries, {len(group)} group scenes')


if __name__ == '__main__':
    build()
    if WARN:
        print(f'\n{len(WARN)} warnings:')
        for w in WARN:
            print(' -', w)
