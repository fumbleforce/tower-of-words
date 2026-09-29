#!/usr/bin/env python3
"""The asset library: scan the repo and write tools/assets/assets.json, one entry per usable asset.

Every entry: id, kind, name, who (character), place, paths, status, status_from (where the status comes from),
source (how it was made), used (where the game uses it), thumb, review (review item id, if any), view (how the
gallery previews it: image, audio, 3D model, code-built chibi or prop, room).

Statuses: approved (Jørgen picked it), provisional (in the game but not approved, or approved then put back under
review), candidate (waiting in an open review or a candidates folder), legacy (from an earlier version of the game),
rejected (not picked, or turned down). Where they come from, strongest first:
  reviews/*/review.json + feedback.json   decided picks, open rounds, superseded rounds
  game3d/story/FORMAT.md "Portraits"      the faces the game shows, approved or PROVISIONAL
  art/approved/README.md                  approved art per bible id
  bible/facts.yaml                        images, models, tracks, history with their statuses
  GUIDE.md                                quoted decisions (voices, music, video, styles)

Usage:
  python3 tools/assets/scan.py              scan, write assets.json, make missing image and audio thumbnails
  python3 tools/assets/scan.py --no-thumbs  scan only (fast)
  python3 tools/assets/scan.py --check      also check that every listed path exists (exit 1 if not)
3D thumbnails need a browser: node tools/assets/render3d.mjs (takes the browser lock).
"""
import hashlib
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime

import yaml

T0 = time.time()

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
HERE = os.path.join(ROOT, 'tools', 'assets')
THUMBS = 'tools/assets/thumbs'
OUT = os.path.join(HERE, 'assets.json')
os.chdir(ROOT)

STATUSES = ['approved', 'provisional', 'candidate', 'legacy', 'rejected']
KINDS = {
    'portrait': 'Portraits and expressions',
    'model': '3D models',
    'animation': 'Animations',
    'prop': 'Props',
    'room': 'Rooms',
    'voice': 'Voice clips',
    'voice-ref': 'Voice references',
    'music': 'Music',
    'ambience': 'Ambience',
    'sfx': 'Sound effects',
    'icon': 'UI icons',
    'style': 'Style presets',
}
PLACES = {'train': 'Train', 'gate': 'Lobby and gate', 'lift': 'Lift', 'office': 'B2 office'}
FACT_STATUS = {'approved': 'approved', 'review': 'provisional', 'draft': 'candidate', 'open': 'candidate',
               'rejected': 'rejected', 'legacy': 'legacy'}


def read(p):
    try:
        with open(p, encoding='utf-8') as f:
            return f.read()
    except OSError:
        return ''


def exists(p):
    return os.path.exists(os.path.join(ROOT, p))


def rel(p):
    return os.path.relpath(os.path.join(ROOT, p), ROOT).replace(os.sep, '/')


def ls(d, pat=None):
    try:
        names = sorted(os.listdir(d))
    except OSError:
        return []
    return [f'{d}/{n}' for n in names if not n.startswith('.') and (pat is None or re.search(pat, n))]


# ------------------------------------------------------------------ quotes from the docs
def quote(path, phrase, limit=320):
    """The sentence holding `phrase` in `path`, for status_from: {path, line, text}."""
    text = read(path)
    if not text:
        return None
    lines = text.split('\n')
    low = phrase.lower()
    for i, l in enumerate(lines):
        if low in l.lower():
            at = l.lower().index(low)
            start = 0
            for m in re.finditer(r'[.!?]["”)]?\s+(?=["“(]?[A-Z0-9Ø])', l):
                if m.end() > at:
                    break
                start = m.end()
            s = re.sub(r'^\s*(?:[-*]|\d+\.)\s+', '', l[start:]).strip()
            if len(s) > limit:
                s = s[:limit].rsplit(' ', 1)[0] + ' …'
            return {'path': path, 'line': i + 1, 'text': s}
    return None


# ------------------------------------------------------------------ JS source helpers
def js_object_body(src, name):
    """Text of `const NAME = { ... }` (or [ ... ]) in a JS source, braces balanced, strings skipped."""
    m = re.search(r'(?:export\s+)?const\s+' + re.escape(name) + r'\s*=\s*', src)
    if not m:
        return None
    i = m.end()
    open_, close = src[i], {'{': '}', '[': ']'}.get(src[i])
    if not close:
        return None
    depth, j, q = 0, i, None
    while j < len(src):
        c = src[j]
        if q:
            if c == '\\':
                j += 1
            elif c == q:
                q = None
        elif c == '/' and src[j + 1:j + 2] == '/':
            j = src.find('\n', j)            # a line comment (its apostrophes aren't quotes)
            if j < 0:
                return None
            continue
        elif c in '\'"`':
            q = c
        elif c == open_:
            depth += 1
        elif c == close:
            depth -= 1
            if depth == 0:
                return src[i:j + 1]
        j += 1
    return None


def words():
    src = read('game3d/js/lang.js')
    out = {}
    for m in re.finditer(r"^\s*([a-z_]+): \{ ja: '([^']+)'(.*)$", src, re.M):
        ro = re.search(r"ro: '([^']+)'", m.group(3))
        en = re.search(r"en: '([^']*)'", m.group(3))
        out[m.group(1)] = {'ja': m.group(2), 'ro': ro.group(1) if ro else m.group(1), 'en': en.group(1) if en else ''}
    return out


WORDS = words()
STORY = {p: read(f'game3d/story/{p}.js') for p in ['train', 'gate', 'office', 'transitions']}
STORY_RESOLVED = {p: re.sub(r'\{([a-z_]+)\}', lambda m: WORDS.get(m.group(1), {}).get('ja', m.group(1)), s) for p, s in STORY.items()}


def speaker_places(who):
    """Places where `who` speaks, with line counts, from the story files."""
    out = {}
    for p, s in STORY.items():
        n = len(re.findall(r"['\"`]" + re.escape(who) + r": ", s)) + len(re.findall(r"say: '" + re.escape(who) + r"'", s))
        if n:
            out[p] = n
    return out


def place_of(p):
    return {'transitions': 'lift', 'lobby': 'gate'}.get(p, p)


# ------------------------------------------------------------------ the cast: names and ids
FACTS = yaml.safe_load(read('bible/facts.yaml')) or {}
BIBLE = {c['id']: c for c in FACTS.get('characters', [])}
GAME_OF = {c['id']: c.get('game') or c['id'] for c in FACTS.get('characters', [])}   # bible id -> game id
NAMES = {}
for c in FACTS.get('characters', []):
    NAMES[GAME_OF[c['id']]] = c.get('name')
for p in STORY.values():
    for m in re.finditer(r"^\s+([a-z0-9_]+): \{ name: '([^']+)'", p, re.M):
        NAMES.setdefault(m.group(1), m.group(2))
NAMES.update({'ann': 'Station announcer', 'gatev': 'Gate voice', 'sales1': 'Sales (1)', 'sales2': 'Sales (2)',
              'commuter': 'Commuter', 'worker': 'Office workers', 'tama': 'Tama (cat)', 'briefcaseMan': 'Man with a briefcase',
              'yui': 'Yui', 'sota': 'Sota', 'music': 'Girl with headphones', 'reader': 'Man with a book',
              'bun': 'Woman with a bun', 'youth': 'Young man', 'stander': 'Man with a bag', 'kuroda': 'Mr. Hamada'})


def who_of_bible(bid):
    return GAME_OF.get(bid, bid)


# ------------------------------------------------------------------ reviews
REVIEWS = {}
for d in ls('reviews'):
    rj = os.path.join(d, 'review.json')
    if not os.path.isfile(rj):
        continue
    try:
        r = json.load(open(rj))
    except Exception:
        continue
    fb = None
    if os.path.isfile(os.path.join(d, 'feedback.json')):
        try:
            fb = json.load(open(os.path.join(d, 'feedback.json')))
        except Exception:
            fb = None
    r['id'] = os.path.basename(d)
    r['feedback'] = fb
    REVIEWS[r['id']] = r


def review_option_status(r, opt_id):
    """Status of one option of a review item, and a line saying why."""
    fb = r.get('feedback') or {}
    picked = set(r.get('decided') or []) | (set(fb.get('picked') or []) if r.get('status') == 'decided' else set())
    o = (fb.get('options') or {}).get(opt_id) or {}
    if o.get('reject'):
        return 'rejected', f"Rejected on the review page ({r['id']})"
    st = r.get('status')
    if st == 'open':
        return 'candidate', f"Waiting in review {r['id']}: {r.get('question', '')}"
    if opt_id in picked:
        return 'approved', f"Picked in review {r['id']}: {r.get('decision') or ''}".strip()
    why = r.get('decision') or fb.get('comment') or ''
    return 'rejected', f"Not picked in review {r['id']} ({st}): {why}".strip()


# ------------------------------------------------------------------ the entries
A = {}          # id -> entry
BY_PATH = {}    # path -> id (first claim wins; the claims below run strongest first)


def add(id_, kind, name, paths, status, status_from, source='', who=None, place=None, used=None, review=None,
        view=None, thumb_from=None, note=None, tags=None, text=None, svg=None):
    paths = list(dict.fromkeys(rel(p) for p in paths if p))
    if not paths and not svg and not view:
        return None
    for p in paths:
        if claims(p) and p in BY_PATH and BY_PATH[p] != id_ and kind != 'animation':   # a clip GLB is also part of its model
            return None                      # someone stronger already claimed this file
    if id_ in A:
        return None
    assert status in STATUSES, (id_, status)
    e = {'id': id_, 'kind': kind, 'name': name, 'who': who, 'place': place, 'paths': paths, 'status': status,
         'status_from': status_from if isinstance(status_from, dict) else {'text': status_from},
         'source': source, 'used': used or [], 'review': review, 'view': view or {}, 'thumb': None}
    if thumb_from:
        e['thumb_from'] = thumb_from
    for k, v in (('note', note), ('tags', tags), ('text', text), ('svg', svg)):
        if v:
            e[k] = v
    A[id_] = e
    for p in paths:
        if claims(p):
            BY_PATH[p] = id_
    return e


def claims(p):
    """Media files belong to one entry; code and docs (cast.js, FORMAT.md) can back many."""
    return bool(re.search(r'\.(webp|png|jpe?g|glb|mp3|wav)$', p)) or (p.endswith('.json') and p.startswith('game3d/assets/'))


def img_view(p):
    return {'type': 'image', 'src': rel(p)}


def portrait_used(who):
    places = speaker_places(who)
    return [f"Dialogue portrait when {NAMES.get(who, who)} speaks: " + ', '.join(f"{PLACES.get(place_of(p), p)} ({n} lines)" for p, n in places.items())] if places else ['Dialogue portrait (no lines in the current story)']


# 1. review items: every option and context image, with the status Jørgen gave it
for rid, r in sorted(REVIEWS.items(), key=lambda kv: kv[1].get('date', ''), reverse=True):
    kind_guess = 'voice-ref' if any(o.get('audio') for o in r.get('options', [])) else 'portrait'
    if rid.startswith('style') or rid.startswith('voice-input'):
        continue   # handled with the style presets / not an asset (UI state shots)
    for o in r.get('options', []):
        imgs = ([o['image']] if o.get('image') else []) + list(o.get('images') or [])
        aud = o.get('audio')
        st, why = review_option_status(r, o['id'])
        label = o.get('label') or o['id']
        who = None
        for w in ['eric', 'mio', 'kenji', 'mori', 'guard', 'kuroda']:
            if w in rid:
                who = w
        if aud:
            add(f"voice-ref/{os.path.splitext(os.path.basename(aud))[0]}", 'voice-ref', label, [aud], st, why,
                source=o.get('note') or r.get('title', ''), who=who, review=rid, view={'type': 'audio', 'src': aud})
        for k, im in enumerate(imgs):
            if not exists(im) or im.startswith('game3d/assets/portraits/'):
                continue                     # in-game faces get their status from FORMAT.md (step 2), with this review linked
            kind = 'portrait'
            base = os.path.splitext(os.path.basename(im))[0]
            add(f"{kind}/{base if len(base) > 8 else rid + '-' + base}", kind, f"{label}" + (f" ({k + 1})" if k else ''), [im], st, why,
                source=(o.get('note') or '') + (' · ' if o.get('note') else '') + r.get('title', ''), who=who, review=rid, view=img_view(im))
    for m in r.get('media', []):
        im = m.get('image')
        if rid in ('mori-3d', 'creator-parts'):
            continue                         # context shots of 3D work; the models carry the review link
        if im and exists(im) and 'art/refs/' not in im and 'sheet' in os.path.basename(im):
            st = 'candidate' if r.get('status') == 'open' else ('legacy' if r.get('status') == 'superseded' else 'rejected' if not r.get('decided') else 'approved')
            add(f"portrait/{os.path.splitext(os.path.basename(im))[0]}", 'portrait', m.get('caption') or r.get('title'), [im],
                st, f"Context sheet in review {rid} ({r.get('status')})", source=r.get('title', ''), review=rid, view=img_view(im),
                tags=['sheet'])

# 2. the faces the game shows (ui.js PORTRAITS), with FORMAT.md's approved / PROVISIONAL split
ui_src = read('game3d/js/ui.js')
fmt = read('game3d/story/FORMAT.md')
fmt_sec = fmt.split('## Portraits', 1)[1].split('\n## ', 1)[0] if '## Portraits' in fmt else ''
FMT = {}
prov = False
for l in fmt_sec.split('\n'):
    if 'PROVISIONAL' in l:
        prov = True
        continue
    m = re.match(r'^\s*-\s*`([a-z]+)`(?:\s*\([^)]*\))?(?:,\s*`([a-z]+)`)?\s*:(.*)$', l)
    if not m:
        continue
    if not l.startswith('  '):
        prov = False
    for w in filter(None, [m.group(1), m.group(2)]):
        FMT.setdefault(w, {'status': 'provisional' if prov else 'approved', 'line': l.strip()[2:], 'lineno': fmt.split('\n').index(l) + 1})
portraits_body = js_object_body(ui_src, 'PORTRAITS') or ''
game_faces = {m.group(1): re.findall(r"'([a-z]+)'", m.group(2)) for m in re.finditer(r"([a-z]+): \[([^\]]*)\]", portraits_body)}
for who, faces in game_faces.items():
    f = FMT.get(who)
    bid = next((b for b, g in GAME_OF.items() if g == who), who)
    if f:
        st, why = f['status'], {'path': 'game3d/story/FORMAT.md', 'line': f['lineno'], 'text': ('PROVISIONAL: ' if f['status'] == 'provisional' else '') + f['line']}
    else:
        ps = (BIBLE.get(bid) or {}).get('portrait_status')
        st = FACT_STATUS.get(ps, 'provisional')
        why = {'path': 'bible/facts.yaml', 'text': f"portrait_status: {ps} ({bid})"}
    for face in faces:
        p = f'game3d/assets/portraits/{who}-{face}.webp'
        if not exists(p):
            continue
        src = f"Cut-out ({'rembg ISNet anime'}), face box in ui.js FACE"
        if f:
            src = f"{f['line'].rstrip('.')}. " + src
        master = (BIBLE.get(bid) or {}).get('images') or []
        if master:
            src += f"; master {master[0][0]}"
        add(f'portrait/{who}-{face}', 'portrait', f"{NAMES.get(who, who)}: {face}", [p], st, why, source=src, who=who,
            used=portrait_used(who), view=img_view(p), tags=['in game'])

# the in-game faces that also appear in a review get that review linked
for rid, r in REVIEWS.items():
    for o in r.get('options', []):
        for im in ([o['image']] if o.get('image') else []) + list(o.get('images') or []):
            e = A.get(BY_PATH.get(im))
            if e and not e.get('review'):
                e['review'] = rid

# 3. approved art (art/approved/README.md); the bible can put an approved file back under review
FACT_OF = {}
for c in FACTS.get('characters', []):
    for x in (c.get('images') or []):
        if isinstance(x, list) and len(x) >= 3:
            FACT_OF[x[0]] = (x[2], x[1])
readme = read('art/approved/README.md')
for i, l in enumerate(readme.split('\n')):
    m = re.match(r'^- ([a-z0-9-]+)/([^:]+):\s*(.*)$', l)
    if not m:
        continue
    folder, fname, desc = m.group(1), m.group(2).strip(), m.group(3)
    path = f'art/approved/{folder}/{fname}'
    why = {'path': 'art/approved/README.md', 'line': i + 1, 'text': l[2:]}
    st = 'approved'
    if re.search(r'lists it as rejected|replaced', desc):
        st = 'rejected'
    if 'An idea only' in desc:
        st = 'candidate'
    if FACT_OF.get(path, ('',))[0] == 'review':
        st = 'provisional' if st == 'approved' else 'candidate'
        why = {'path': 'bible/facts.yaml', 'text': FACT_OF[path][1]}
    if folder == 'music' or fname.endswith('/'):
        continue   # music and model folders are handled with their own kinds below
    if folder in ('plaza', 'gate', 'office', 'copyroom', 'dorm'):
        loc = next((x for x in FACTS.get('locations', []) if x.get('image') == path), None) or \
            next((x for x in FACTS.get('locations', []) if x.get('image', '').startswith(f'art/approved/{folder}/')), None)
        fst = (loc or {}).get('facts') or []
        st, why = 'legacy', {'path': 'bible/facts.yaml', 'text': 'The painted backgrounds from the VN era. Legacy: the world is flat-shaded 3D now.' + (' ' + fst[0][0] if fst else '')}
        add(f'room/painting-{folder}-{os.path.splitext(fname)[0]}', 'room', (loc or {}).get('name') or folder, [path], st, why,
            source=desc, place=None, view=img_view(path), tags=['painted background'])
        continue
    who = who_of_bible(folder)
    for p in [path] + [x for x in re.findall(r'art/approved/[^\s,;]+\.(?:webp|png)', desc)]:
        if exists(p):
            add(f'portrait/approved-{folder}-{os.path.splitext(os.path.basename(p))[0]}', 'portrait', f"{NAMES.get(who, folder)}: approved art",
                [p], st, why, source=desc, who=who, view=img_view(p), tags=['master'])

# 4. bible facts: character images and history sheets, legacy locations
for c in FACTS.get('characters', []):
    who = who_of_bible(c['id'])
    rows = [(x[0], x[1], x[2]) for x in (c.get('images') or []) if isinstance(x, list) and len(x) >= 3]
    rows += [(x[1], x[0], x[2]) for x in (c.get('history') or []) if isinstance(x, list) and len(x) >= 3]
    if c.get('portrait'):
        rows.append((c['portrait'], c.get('pick') or 'portrait', 'approved'))
    for path, desc, s in rows:
        if not isinstance(path, str) or not re.search(r'\.(webp|png|jpe?g)$', path) or not exists(path):
            continue
        st = FACT_STATUS.get(s, 'candidate')
        if path.startswith('legacy/') and st == 'approved':
            st = 'legacy'
        add(f"portrait/{c['id']}-{os.path.splitext(os.path.basename(path))[0]}", 'portrait', f"{c.get('name')}: {desc}"[:120], [path], st,
            {'path': 'bible/facts.yaml', 'text': f"{c['id']}: {desc} ({s})"}, source=desc, who=who, view=img_view(path),
            tags=['sheet'] if 'sheet' in path else None)
for loc in FACTS.get('locations', []):
    p = loc.get('image')
    if p and exists(p):
        fst = loc.get('facts') or []
        add(f"room/painting-{loc['id']}", 'room', loc.get('name'), [p], 'legacy' if p.startswith('legacy/') else FACT_STATUS.get(fst[0][1] if fst else 'legacy', 'legacy'),
            {'path': 'bible/facts.yaml', 'text': fst[0][0] if fst else 'VN-era painted background'}, source=f"Pick: {loc.get('pick')}", view=img_view(p),
            tags=['painted background'])

# chibi pictures the 3D models come from
for p, who, desc, st in [('tools/characters/ref/eric-chibi-ref.png', 'eric', "Jørgen's chibi picture of Eric (ChatGPT), the source of his Meshy model", 'approved'),
                         ('tools/characters/ref/mio-chibi-34.png', 'mio', "Jørgen's Mio chibi picture, the style reference for new chibis", 'approved'),
                         ('tools/characters/ref/mio-chibi-34b.png', 'mio', 'Mio chibi picture, variant b', 'approved'),
                         ('tools/characters/ref/mio-chibi-angled.png', 'mio', 'Mio chibi picture, turned for Meshy', 'approved')]:
    if exists(p):
        add(f'portrait/chibi-ref-{os.path.splitext(os.path.basename(p))[0]}', 'portrait', f"{NAMES.get(who)}: chibi reference", [p], st,
            quote('GUIDE.md', 'Chibi style references for 3D characters') or 'GUIDE.md', source=desc, who=who, view=img_view(p), tags=['chibi', '3D reference'])

# ------------------------------------------------------------------ 3D models and animations
CAST_SRC = read('game3d/js/cast.js')
cast3d_on = re.findall(r"'([a-z]+)'", (re.search(r'CAST3D_ON\s*=\s*\[([^\]]*)\]', CAST_SRC) or [None, ''])[1] or '')
meshy_q = quote('GUIDE.md', '3D character workflow (Jørgen, 2026-09-28')
eric_model = (BIBLE.get('mc') or {}).get('model') or {}
mio_model = (BIBLE.get('mio') or {}).get('model') or {}
add('model/eric-meshy', 'model', 'Eric (Meshy)', ls('game3d/assets/eric') + ls('art/approved/mc/meshy', r'\.(glb|json|png)$') + ls('game3d/assets/eric-meshy', r'\.(glb|json|png)$'),
    FACT_STATUS.get(eric_model.get('status'), 'approved'), {'path': 'bible/facts.yaml', 'text': eric_model.get('note', '')},
    source='Meshy image-to-3D from ' + 'tools/characters/ref/eric-chibi-ref.png' + ', auto-rigged, ~1050 polygons (' + (eric_model.get('note', '').split('.')[0]) + '). The game loads game3d/assets/eric/ (slimmed by game3d/tools/slim_glb.py) with base.webp as a matte Lambert texture.',
    who='eric', used=['The player, in every place (main.js loadEric; ?eric=chibi falls back to the code-built chibi)'],
    view={'type': 'meshy', 'id': 'eric', 'height': 1.2}, tags=['in game', 'rigged'])
add('model/mio-meshy', 'model', 'Mio (Meshy)', ls('game3d/assets/mio') + ls('art/approved/mio/meshy') + ls('legacy/side/flat/meshy2/Meshy_AI_Neon_Bun_Guardian_biped'),
    FACT_STATUS.get(mio_model.get('status'), 'approved'), {'path': 'bible/facts.yaml', 'text': mio_model.get('note', '')},
    source="Jørgen's Meshy model (Neon Bun Guardian biped); only colour tweaks in the game (mio.js MIO_COLOURS)", who='mio',
    used=['Mio, in every place (mio.js loadMio)'], view={'type': 'mio', 'height': 1.12}, tags=['in game', 'rigged'])
mori_r = REVIEWS.get('mori-3d') or {}
add('model/mori-meshy', 'model', 'Mr. Mori (Meshy test)', ls('game3d/assets/characters/mori', r'\.(glb|webp)$'),
    'approved' if 'mori' in cast3d_on else 'rejected', f"Review mori-3d: {mori_r.get('decision', '')}",
    source='Meshy workflow from a local FLUX.2 Klein chibi picture (tools/characters/, commit b01e6b0)', who='mori',
    used=['Only with ?cast3d=mori (cast.js CAST3D, not in CAST3D_ON)'], review='mori-3d', view={'type': 'meshy', 'id': 'mori', 'height': 1.2})
for p in ls('tools/characters/out', r'\.glb$'):
    add(f'model/{os.path.splitext(os.path.basename(p))[0]}', 'model', os.path.basename(p), [p], 'candidate', 'Test output of tools/characters (not in a review yet)',
        source='tools/characters/meshy.py', view={'type': 'glb', 'src': p})
lib = read('art/parts/library.json')
if lib:
    for sid in ['eric', 'mio']:
        ps = [p for p in [f'art/parts/src/{sid}/mesh.glb', f'art/parts/src/{sid}/tex.webp'] if exists(p)]
        if ps:
            add(f'model/parts-{sid}', 'model', f'Creator parts source: {NAMES.get(sid)}', ps + ['art/parts/library.json'], 'candidate',
                'Creator experiment (paused, notes/OVERNIGHT.md); parts cut from the Meshy models', source='tools/creator (cut.js, recipe.js)', who=sid,
                view={'type': 'glb', 'src': ps[0], 'tex': ps[1] if len(ps) > 1 else None}, tags=['parts'], review='creator-parts' if 'creator-parts' in REVIEWS else None)
for p in ls('legacy/side/flat/meshy', r'\.glb$') + ls('legacy/side/hd2d/figures/models', r'\.glb$'):
    add(f"model/legacy-{os.path.splitext(os.path.basename(p))[0]}", 'model', os.path.basename(p), [p], 'legacy', 'Under legacy/ (reference only)',
        source='Meshy parts round 14b' if 'flat' in p else 'HD-2D figure test', who='mio', view={'type': 'glb', 'src': p})

# code-built chibis (cast.js PEOPLE, avatar.js buildEric, train/people.js passengers and the cat)
people_body = js_object_body(CAST_SRC, 'PEOPLE') or ''
code_files = {f: read(f) for f in ls('game3d/js/places', r'\.js$') + ls('game3d/js/scenes', r'\.js$')}
fmt_gone = quote('game3d/story/FORMAT.md', '`yui`, `sota`, `nao`, `hiro` are gone')
for m in re.finditer(r'^  ([a-zA-Z]+): \((?:i = 0)?\) => \{\n((?:    .*\n)*?)    (?:const r|return)', people_body, re.M):
    pid, comment = m.group(1), re.findall(r'//\s*(.*)', m.group(2))
    used = sorted({place_of(os.path.splitext(os.path.basename(f))[0]) for f, s in code_files.items() if f'PEOPLE.{pid}(' in s})
    if pid == 'worker':
        for i in range(7):
            add(f'model/chibi-worker-{i}', 'model', f'Office worker {i}', ['game3d/js/cast.js'], 'provisional',
                'Code-built chibi in the game; never put to Jørgen as an asset', source='cast.js PEOPLE.worker(' + str(i) + '), chibi() from train/people.js',
                who='worker', place=None, used=[f"Background people in {', '.join(PLACES.get(u, u) for u in used)}"] if used else [],
                view={'type': 'chibi', 'fn': 'worker', 'arg': i}, tags=['code-built'])
        continue
    gone = pid in ('yui', 'sota')
    add(f'model/chibi-{pid}', 'model', f"{NAMES.get(pid, pid)} (chibi)", ['game3d/js/cast.js'], 'legacy' if gone else 'provisional',
        fmt_gone if gone else 'Code-built chibi in the game; never put to Jørgen as an asset',
        source='cast.js PEOPLE.' + pid + ' (chibi() from train/people.js)' + (': ' + comment[0] if comment else ''), who=pid,
        used=([f"Still built in {', '.join(PLACES.get(u, u) for u in used)}, but cut from the story"] if gone and used else
              [f"{PLACES.get(u, u)}" for u in used] or (['Not placed in any scene'] if not gone else [])),
        view={'type': 'chibi', 'fn': pid}, tags=['code-built'])
add('model/chibi-eric', 'model', 'Eric (chibi fallback)', ['game3d/js/avatar.js'], 'provisional', 'The fallback when the Meshy model fails, or with ?eric=chibi',
    source='avatar.js buildEric(): chibi() matched to the approved portrait', who='eric', used=['Only when the Meshy Eric fails to load, or ?eric=chibi'],
    view={'type': 'chibi', 'fn': 'eric'}, tags=['code-built'])
ppl = read('game3d/js/train/people.js')
pas = ppl.split('export function buildPassengers', 1)[1].split('export function', 1)[0] if 'buildPassengers' in ppl else ''
for i, m in enumerate(re.finditer(r'//\s*(\d+)\.\s*(.*)', pas)):
    add(f'model/chibi-passenger-{i + 1}', 'model', f"Passenger: {m.group(2).split(',')[0].split(';')[0]}", ['game3d/js/train/people.js'], 'provisional',
        'Code-built chibi in the game; never put to Jørgen as an asset', source=f'train/people.js buildPassengers() #{i + 1}: {m.group(2)}',
        place='train', used=['Train carriage'], view={'type': 'chibi', 'fn': 'passenger', 'arg': i}, tags=['code-built', 'seated'])
add('model/chibi-cat', 'model', 'Tama (cat)', ['game3d/js/train/people.js'], 'provisional', 'Code-built in the game; never put to Jørgen as an asset',
    source='train/people.js cat()', who='tama', used=['Train (on a seat)', 'Lobby (by the gate)', 'B2 office (on your desk)'], view={'type': 'chibi', 'fn': 'cat'}, tags=['code-built'])
add('model/chibi-old-player', 'model', 'Old player chibi (with backpack)', ['game3d/js/train/people.js'], 'legacy',
    'From the Mio-as-player version (the player is Eric now); buildPlayer() is not called', source='train/people.js buildPlayer()',
    view={'type': 'chibi', 'fn': 'oldplayer'}, tags=['code-built'])

# animations
def anim(id_, who, name, paths, status, why, source, used, view):
    add(f'animation/{id_}', 'animation', name, paths, status, why, source=source, who=who, used=used, view=view, tags=['3D'])


eric_ok = FACT_STATUS.get(eric_model.get('status'), 'approved')
for clip in ['idle', 'walk', 'run', 'sit']:
    anim(f'eric-{clip}', 'eric', f'Eric: {clip}', [f'game3d/assets/eric/{clip}.glb'], eric_ok, {'path': 'art/approved/README.md', 'text': "Eric's Meshy model with the idle, walk, run, sit and to-sit animation GLBs (approved with the model)"},
         'Meshy animation library on the auto-rigged model', [f'Player {clip} state (avatar.js loadMeshy)'], {'type': 'meshy', 'id': 'eric', 'height': 1.2, 'play': clip})
anim('eric-tosit', 'eric', 'Eric: to-sit', ['game3d/assets/eric-meshy/eric-tosit.glb'], eric_ok, 'Came with the approved model', 'Meshy animation library',
     ['Not loaded by the game (the sit clip is held on one frame)'], {'type': 'glb', 'src': 'game3d/assets/eric-meshy/eric-tosit.glb'})
for who, st, why in [('eric', 'provisional', 'Retargeted gesture clips; in the game, never reviewed on their own'),
                     ('mori', 'rejected', f"Mori's model is parked (review mori-3d: {mori_r.get('decision', '')})"),
                     ('mio', 'provisional', 'Retargeted phone pose; in the game, never reviewed on its own')]:
    for g in ['bow', 'wave', 'shrug', 'nod', 'phone']:
        p = f'game3d/assets/characters/{who}/{g}.json'
        if exists(p):
            view = {'type': 'mio', 'height': 1.12, 'phone': True} if who == 'mio' else {'type': 'meshy', 'id': who, 'height': 1.2, **({'phone': True} if g == 'phone' else {'gesture': g})}
            anim(f'{who}-{g}', who, f"{NAMES.get(who)}: {g}", [p], st, why, "Meshy's gesture library, retargeted onto the rig as JSON (tools/characters/retarget.py)",
                 [f"{g.title()} gesture (avatar.js GESTURES; story hook `gesture`)" if g != 'phone' else 'Looking at the phone (story hook `phone`)'], view)
for clip in ['walk', 'run', 'sit', 'tosit']:
    p = f'game3d/assets/mio/{clip}.glb'
    if exists(p):
        anim(f'mio-{clip}', 'mio', f'Mio: {clip}', [p], FACT_STATUS.get(mio_model.get('status'), 'approved'), {'path': 'bible/facts.yaml', 'text': mio_model.get('note', '')},
             'Meshy animation library (Neon Bun Guardian biped)', [f'Mio {clip} state (mio.js loadMio)'] if clip != 'tosit' else ['Sitting down (mio.js)'],
             {'type': 'mio', 'height': 1.12, 'play': 'sit' if clip == 'tosit' else clip})
for clip in ['idle', 'walk', 'run', 'sit']:
    p = f'game3d/assets/characters/mori/{clip}.glb'
    if exists(p):
        anim(f'mori-{clip}', 'mori', f'Mr. Mori: {clip}', [p], 'rejected', f"Mori's model is parked (review mori-3d)", 'Meshy animation library',
             ['Only with ?cast3d=mori'], {'type': 'meshy', 'id': 'mori', 'height': 1.2, 'play': clip})
for clip in ['idle', 'walk']:
    p = f'art/parts/anim/{clip}.glb'
    if exists(p):
        anim(f'parts-{clip}', None, f'Creator parts: {clip}', [p], 'candidate', 'Creator experiment (paused)', 'tools/creator', [], {'type': 'glb', 'src': p})
anim('chibi-walk', None, 'Chibi walk cycle (code)', ['game3d/js/train/people.js'], 'provisional', 'Code animation in the game; never reviewed on its own',
     'train/people.js walkPose(): swinging legs and arms, a small hip bob', ['Every code-built chibi that walks'], {'type': 'chibi', 'fn': 'kenji', 'play': 'walk'})
anim('chibi-sit', None, 'Chibi sit and breathe (code)', ['game3d/js/train/people.js', 'game3d/js/cast.js'], 'provisional', 'Code animation in the game',
     'train/people.js sit() and cast.js idle(): bent legs, hands in the lap, a slow breath', ['Seated passengers and office workers'], {'type': 'chibi', 'fn': 'kenji', 'play': 'sit'})

# ------------------------------------------------------------------ rooms and props
CONST = {'lobby': {'BZ': -0.55, 'Z': 4.5, 'X': 6.3}, 'office': {'CN': 0.2, 'CS': 2.4, 'Z0': -6.4}, 'train': {'LZ': 1.2, 'LX': 4.0, 'DOOR_X': 3.25}}


def num(expr, consts):
    expr = expr.strip()
    if not re.fullmatch(r'[\sA-Z0-9_.+\-*/()]+', expr):
        return None
    try:
        return float(eval(expr, {'__builtins__': {}}, consts))
    except Exception:
        return None


rounds = sorted([d for d in ls('game3d/shots') if re.search(r'/round-\d+$', d)], key=lambda d: int(d.rsplit('-', 1)[1]))
latest = rounds[-1] if rounds else None
ROOMS = [
    ('train', 'Monorail carriage', 'train', 'train.png', {'type': 'room', 'room': 'train'}, 'game3d/js/train/car.js buildCar() and places/train.js'),
    ('platform', 'Honsha platform', 'train', 'platform.png', None, 'places/train.js (the arrival)'),
    ('gate', 'Lobby and security gate', 'gate', 'gate.png', {'type': 'room', 'room': 'lobby'}, 'game3d/js/scenes/lobby.js buildLobby() and places/lobby.js'),
    ('lift', 'Lift car', 'lift', 'lift.png', None, 'game3d/js/places/lift.js attachLift()'),
    ('office', 'B2 IT support floor', 'office', 'office.png', {'type': 'room', 'room': 'office'}, 'game3d/js/scenes/office.js buildOffice() and places/office.js'),
]
critic = quote('bible/facts.yaml', 'The critic log for the three places')
for rid, name, place, shot, view, src in ROOMS:
    sp = f'{latest}/{shot}' if latest and exists(f'{latest}/{shot}') else None
    files = [src.split(' ')[0]] if exists(src.split(' ')[0]) else []
    add(f'room/{rid}', 'room', name, files + ([sp] if sp else []), 'provisional',
        {'path': 'game3d/REVIEW.md', 'text': 'In the game; built in code. The critic log (game3d/REVIEW.md) scores each place; nothing is approved as a room yet.'},
        source=src, place=place, used=[f'Place: {PLACES[place]}'], view=view or ({'type': 'image', 'src': sp} if sp else {}),
        thumb_from=sp if not view else None, note=f'Latest critic shot: {sp}' if sp else None, tags=['in game'])

for f, pl, room in [('game3d/js/places/office.js', 'office', 'office'), ('game3d/js/places/lobby.js', 'gate', 'lobby'), ('game3d/js/places/train.js', 'train', 'train')]:
    src = read(f)
    consts = CONST['train' if room == 'train' else room]
    for m in re.finditer(r"^\s+([a-z_0-9]+): \{ label: '([^']+)'(?:, verb: '[^']+')?, kind: '([^']+)', anchor: (v3|carPt)\(([^()]*(?:\([^()]*\))?[^()]*)\)", src, re.M):
        tid, label, tkind, fn, args = m.groups()
        if 'person' in tkind:
            continue
        parts = [a for a in re.split(r',\s*', args)]
        anchor = [num(a, consts) for a in parts] if len(parts) == 3 else [None]
        line = src[m.start():src.find('\n', m.end())]
        am = re.search(r'\.\.\.at\(([^()]*)\)', line)
        spot = None
        if am:
            sp = [num(a, consts) for a in am.group(1).split(',')]
            if len(sp) >= 2 and None not in sp[:2]:
                spot = sp[:2]
        ok = None not in anchor and not (room == 'train' and abs(anchor[2]) > 1.5)   # the platform is outside the car model
        view = {'type': 'room', 'room': room, 'anchor': anchor, 'spot': spot, 'small': 'small' in tkind} if ok else {'type': 'room', 'room': room}
        add(f'prop/{pl}/{tid}', 'prop', label, [f], 'provisional', 'A named thing in the game (built in code); props are judged with their room',
            source=f"{os.path.basename(f)} things.{tid}; geometry in {'scenes/' + room + '.js' if room != 'train' else 'train/car.js'}", place=pl,
            used=[f"{PLACES[pl]}: tap target '{label}'" + (' (no marker)' if 'noMarker: true' in line else '')], view=view, tags=['in game', tkind])
    # things whose anchor follows an object (a moving bag, the sign): list them without a close-up
    for m in re.finditer(r"^\s+([a-z_0-9]+): \{ label: '([^']+)'(?:, verb: '[^']+')?, kind: '(thing[^']*)', anchor: \(", src, re.M):
        tid, label, tkind = m.groups()
        add(f'prop/{pl}/{tid}', 'prop', label, [f], 'provisional', 'A named thing in the game (built in code)', source=f"{os.path.basename(f)} things.{tid}",
            place=pl, used=[f"{PLACES[pl]}: tap target '{label}'"], view={'type': 'room', 'room': room}, tags=['in game', tkind])

# the reusable prop kit (props.js and friends): builders any place can call
KIT = [('plant', 'Potted plant', 'props.js'), ('bench', 'Bench', 'props.js'), ('wallLamp', 'Wall lamp', 'props.js'), ('lampPost', 'Lamp post', 'props.js'),
       ('door', 'Door', 'props.js'), ('officeChair', 'Office chair', 'props.js'), ('monitor', 'Monitor', 'props.js'), ('desk', 'Desk with clutter', 'props.js'),
       ('filingCabinet', 'Filing cabinet', 'props.js'), ('shelf', 'Shelf with boxes', 'props.js'), ('pinboard', 'Pinboard', 'props.js'), ('clock', 'Wall clock', 'props.js'),
       ('briefcase', 'Briefcase', 'cast.js'), ('mug', 'Mug', 'cast.js'), ('phone', 'Phone', 'train/people.js'), ('book', 'Book', 'train/people.js')]
for fn, label, mod in KIT:
    src = read(f'game3d/js/{mod}')
    if not re.search(r'export function ' + fn + r'\(', src):
        continue
    users = sorted({place_of(os.path.splitext(os.path.basename(f))[0]) for f, s in code_files.items() if re.search(r'\b' + fn + r'\(', s)})
    add(f'prop/kit/{fn}', 'prop', f'{label} (kit)', [f'game3d/js/{mod}'], 'provisional', 'Reusable builder in the game code; never put to Jørgen on its own',
        source=f'{mod} {fn}()', used=[f"Built in {', '.join(PLACES.get(u, u) for u in users)}"] if users else [], view={'type': 'kit', 'fn': fn}, tags=['kit', 'code-built'])

# ------------------------------------------------------------------ audio
manifest = []
try:
    manifest = json.load(open('game3d/audio/manifest.json'))
except Exception:
    pass
MAN = {x['key']: x for x in manifest}
VOICE_OK = {'mio': quote('GUIDE.md', 'Mio: voice A from legacy/proto2/voice-mio'), 'eric': quote('GUIDE.md', 'Eric uses voice design eric-2 with no accent')}
js_all = '\n'.join(read(f) for f in ls('game3d/js', r'\.js$'))


def line_place(text):
    head = re.sub(r'[\s。、！？…「」.,!?]', '', text)[:8]
    if not head:
        return None
    for p, s in STORY_RESOLVED.items():
        if head in re.sub(r'[\s。、！？…「」.,!?]', '', s):
            return place_of(p)
    return None


for p in ls('game3d/audio', r'\.mp3$'):
    key = os.path.splitext(os.path.basename(p))[0]
    m = MAN.get(key)
    if m:
        who = m['speaker']
        st = 'approved' if who in VOICE_OK and VOICE_OK[who] else 'provisional'
        why = VOICE_OK.get(who) if st == 'approved' else "Generated from the story line; the speaker's voice isn't approved yet"
        if isinstance(why, dict):
            why = {**why, 'text': "The speaker's voice is approved: " + why['text']}
        if key.startswith('oh-'):
            src = 'Overheard line, played muffled; game3d/tools/voices.py (heard lines) and the voice pipeline'
        elif key.startswith('word-'):
            src = "Mio saying the word slowly (tap a taught word to hear it again)"
        else:
            src = "Local TTS from the story line (GUIDE, Local first); listed in game3d/audio/manifest.json"
        if m.get('emo'):
            src += f"; delivery tag '{m['emo']}' (VOICE-DIRECTION.md)"
        place = line_place(m['text'])
        used = [f"{NAMES.get(who, who)}: {'overheard ' if m.get('overheard') else ''}line" + (f" in {PLACES.get(place, place)}" if place else '')]
        wid = next((k for k, w in WORDS.items() if key == 'eric-' + k), None)
        if wid:
            place, used = None, [f"Eric says {WORDS[wid]['ro']} from the Say menu"]
        elif key.startswith('word-'):
            place, used = None, [f"Tap {WORDS.get(key[5:], {}).get('ro', key[5:])} to hear it again"]
        add(f'voice/{key}', 'voice', m['text'][:90], [p], st, why, source=src, who=who, place=place, used=used,
            view={'type': 'audio', 'src': p}, text=m['text'], tags=['overheard'] if m.get('overheard') else None)
    else:
        who = key.split('-')[0]
        ref = re.search(r"'" + re.escape(key) + r"'", js_all)
        add(f'voice/{key}', 'voice', key, [p], 'provisional' if ref else 'legacy',
            'Referenced by the game code' if ref else 'Not in game3d/audio/manifest.json and not referenced: an older take (edge-tts, game3d/tools/voices.py)',
            source='edge-tts (game3d/tools/voices.py LINES)', who=who if who in NAMES else None, used=['game3d/js'] if ref else [],
            view={'type': 'audio', 'src': p})

# voice references
VREF = {
    'mio-a': ('approved', quote('GUIDE.md', 'Mio: voice A from legacy/proto2/voice-mio'), 'mio'),
    'mio': ('rejected', quote('GUIDE.md', 'The original casting clip (mio-3) is retired'), 'mio'),
    'eric-voice': ('approved', quote('GUIDE.md', 'Eric uses voice design eric-2 with no accent'), 'eric'),
}
for p in ls('tools/voice-refs', r'\.(wav|mp3)$'):
    key = os.path.splitext(os.path.basename(p))[0]
    txt = read(os.path.splitext(p)[0] + '.txt').strip()
    who = key.split('-')[0]
    who = {'ishibashi': 'guard', 'player': 'eric', 'salaryman': None, 'sales': 'sales1', 'sales1': 'sales1', 'staff': None, 'vending': None, 'lift': None}.get(who, who)
    if key in VREF:
        st, why, who = VREF[key]
    elif key.startswith('eric-nordic'):
        st, why = 'rejected', quote('GUIDE.md', 'not any better, just drop it, English accent instead')
    elif key.endswith('-design'):
        st, why = 'provisional', 'A designed voice (Qwen3 VoiceDesign or Irodori) the game clones from; not approved by ear yet'
    else:
        st, why = 'legacy', 'Cut from the old game\'s lines for the island slice (tools/island_audio/refs.py)'
    add(f'voice-ref/{key}', 'voice-ref', f"{NAMES.get(who, key) if who else key}: {key}", [p] + ([os.path.splitext(p)[0] + '.txt'] if txt else []), st, why,
        source='tools/island_audio/refs.py (slices of old lines)' if 'slice12' in key or 'ref12' in key else 'Voice design or casting clip', who=who,
        view={'type': 'audio', 'src': p}, text=txt[:300] or None)

# music: the approved copies and the game's copies are the same files
MUSIC_PLACE = {}
mm = re.search(r'const MUSIC = \{([^}]*)\}', read('game3d/js/main.js'))
if mm:
    for k, v in re.findall(r"(\w+): '(\w+)'", mm.group(1)):
        MUSIC_PLACE.setdefault(v, []).append(k)
tracks = {os.path.basename(x[0]): x for x in (FACTS.get('audio') or {}).get('tracks', [])}
for p in ls('art/approved/music', r'\.mp3$') + ls('game3d/audio/music', r'\.mp3$'):
    name = os.path.splitext(os.path.basename(p))[0]
    t = tracks.get(os.path.basename(p))
    paths = [x for x in [f'art/approved/music/{name}.mp3', f'game3d/audio/music/{name}.mp3'] if exists(x)]
    used = [f'Background loop in {PLACES.get(pl, pl)}' for pl in MUSIC_PLACE.get(name, [])]
    if name == 'night':
        used.append('After work (main.js switches to the night loop)')
    add(f'music/{name}', 'music', (t[1] if t else name), paths, FACT_STATUS.get(t[2], 'approved') if t else 'provisional',
        quote('GUIDE.md', 'Music: the game uses Lyria only') if name not in ('opening', 'opening-tv') else quote('GUIDE.md', 'Opening theme = "Mastered: softer"'),
        source='Lyria loop, crossfading into itself' if name not in ('opening', 'opening-tv') else 'YuE2 (CC BY-NC 4.0); TV edit by tools/opening/tv_edit.py',
        used=used, view={'type': 'audio', 'src': paths[-1]})

# ambience beds and sound effects
picks = {}
try:
    picks = json.load(open('tools/feel/picks.json'))
except Exception:
    pass
amb_src = read('game3d/js/ambience.js')
beds = dict(re.findall(r"(\w+): '(bed_\w+)'", (re.search(r'const BEDS = \{([^}]*)\}', amb_src) or [None, ''])[1] or ''))
for p in ls('game3d/audio/amb', r'\.mp3$'):
    name = os.path.splitext(os.path.basename(p))[0]
    places = [k for k, v in beds.items() if v == name]
    pk = picks.get(name)
    add(f'ambience/{name}', 'ambience', name.replace('bed_', '').title() + ' bed', [p], 'provisional', 'Made by the feel agent; not reviewed by ear yet',
        source=(f'Stable Audio 3 take {pk[0]} (tools/feel/sa3_gen.py), levelled and looped by tools/feel/build_audio.py' if pk else 'tools/feel/build_audio.py'),
        place=next((pl for pl in places if pl in PLACES), None), used=[f'Looping bed in {pl}' for pl in places], view={'type': 'audio', 'src': p})
sfx_src = read('game3d/js/sfx.js')
kmap = {}
for k, files in re.findall(r"^\s+(\w+): \{ f: \[([^\]]*)\]", sfx_src, re.M):
    for f in re.findall(r"'([\w-]+)'", files):
        kmap.setdefault(f, []).append(k)
for p in ls('game3d/audio/sfx', r'\.mp3$'):
    name = os.path.splitext(os.path.basename(p))[0]
    kinds = kmap.get(name, [])
    calls = sorted({k for k in kinds if re.search(r"sfx\(['\"]" + k + r"['\"]", js_all)})
    events = [pl for pl, body in re.findall(r"(\w+): \[((?:[^\[\]]|\[[^\]]*\])*)\]", amb_src) if f"f: '{name}'" in body]
    used = ([f"sfx('{k}')" for k in calls] + [f'Ambience one-shot in {pl}' for pl in events]) or [f"Kind '{k}' in sfx.js" for k in kinds]
    pk = picks.get(name)
    add(f'sfx/{name}', 'sfx', name.replace('_', ' '), [p], 'provisional', 'Made by the feel agent; not reviewed by ear yet',
        source=(f'Stable Audio 3 take {pk[0]} (tools/feel/sa3_gen.py), levelled by build_audio.py' if pk else 'Synthesised (tools/feel/synth.py, one soft mallet family), levelled by build_audio.py'),
        used=used, view={'type': 'audio', 'src': p})

# ------------------------------------------------------------------ UI icons (inline SVG in the game code)
lang_src = read('game3d/js/lang.js')
icon_body = js_object_body(lang_src, 'ICON') or ''
for k, svg in re.findall(r"^\s+(\w+): '([^']*)'", icon_body, re.M):
    w = WORDS.get(k, {})
    add(f'icon/word-{k}', 'icon', f"{w.get('ro', k)} {w.get('ja', '')}".strip(), ['game3d/js/lang.js'], 'provisional',
        'In the game; not reviewed as an icon set', source='Hand-drawn 24×24 line icon (lang.js ICON)',
        used=[f"Say menu and word chips for {w.get('ro', k)} ({w.get('en', '')})"], svg=f'<svg viewBox="0 0 24 24">{svg}</svg>', tags=['word'])
emote_body = js_object_body(read('game3d/js/main.js'), 'EMOTE_SVG') or ''
for k, svg in re.findall(r"^\s*'?([\w♪…]+)'?: '([^']*)'", emote_body, re.M):
    add(f'icon/emote-{k}', 'icon', f'Emote: {k}', ['game3d/js/main.js'], 'provisional',
        quote('GUIDE.md', 'Over-head icons and labels (Jørgen)') or 'In the game', source='main.js EMOTE_SVG', used=['Over-head emote bubble (story hook `emote`)'],
        svg=f'<svg viewBox="0 0 24 24">{svg}</svg>', tags=['emote'])
for f in ['game3d/js/ui.js', 'game3d/js/menu.js', 'game3d/js/engine.js', 'game3d/js/speech.js']:
    src = read(f)
    for m in re.finditer(r'<svg viewBox="0 0 (\d+) (\d+)"[^>]*>(.*?)</svg>', src):
        before = src[max(0, m.start() - 200):m.start()]
        before = before[before.rfind('\n') + 1:] if '\n' in before[-120:] else before
        lab = (re.findall(r'aria-label="([^"]+)"', before) or re.findall(r'id="(\w+)"', before)
               or re.findall(r"el\('\w+', '([\w ]+)'", before) or re.findall(r"const ([A-Za-z_]{3,})\s*=", before))
        label = {'hchip icon': 'Pause menu (cog)', 'goalarrow': 'Goal arrow', 'MIC_SVG': 'Microphone', 'paw': 'Pet (paw)'}.get(lab[-1] if lab else '', lab[-1] if lab else 'Icon')
        if label == 'icon':
            label = 'Talk' if 'l-4 3.5' in m.group(3) else 'Use'
        body = m.group(3)
        if '${' in body:
            continue
        h = hashlib.sha1(body.encode()).hexdigest()[:6]
        label = {'28b857': 'Close (cross)', '0ff963': 'Hear the word again', 'f4e55c': 'Use'}.get(h, label)
        where = f'{os.path.basename(f)}: {label}'
        dup = next((e for e in A.values() if e['kind'] == 'icon' and e['id'].endswith('-' + h)), None)
        if dup:                               # the same drawing used in several places (the close cross)
            if where not in dup['used']:
                dup['used'].append(where)
            if f not in dup['paths']:
                dup['paths'].append(f)
            continue
        add(f"icon/{re.sub(r'[^a-z0-9]+', '-', label.lower()).strip('-')}-{h}", 'icon', label,
            [f], 'provisional', 'In the game; not reviewed as an icon set', source=f'Inline SVG in {os.path.basename(f)}',
            used=[where], svg=f'<svg viewBox="0 0 {m.group(1)} {m.group(2)}">{body}</svg>', tags=['hud'])

# ------------------------------------------------------------------ style presets
style_src = read('game3d/js/style/index.js')
rough = REVIEWS.get('style-rough') or {}
rough_fb = (rough.get('feedback') or {}).get('comment', '')
for m in re.finditer(r"\n  (\d+): \{\n    name: '([^']+)',\n    note: '([^']+)'", style_src):
    n, name, note = m.groups()
    shot = f'game3d/design/style/rough/style-{n}.jpg'
    in_rough = exists(shot) and any(o['id'] == n for o in rough.get('options', []))
    st, why = ('candidate', 'A look from the style study, added after the rough round; not put to Jørgen yet')
    if in_rough:
        st, why = 'candidate', f"Rough round style-rough (superseded, none picked). Jørgen: \"{rough_fb}\""
    add(f'style/world-{n}', 'style', f'World look {n}: {name}', ['game3d/js/style/index.js'] + ([shot] if exists(shot) else []), st, why,
        source=f'game3d/js/style (toon.js cel shading, ink.js outline pass, post.js palette); try it with ?style={n}', review='style-rough' if in_rough else None,
        used=[f'Only with ?style={n}'], view={'type': 'image', 'src': shot} if exists(shot) else {}, thumb_from=shot if exists(shot) else None, note=note, tags=['world look'])
s0 = 'game3d/design/style/rough/style-0.jpg'
add('style/world-0', 'style', 'World look 0: current', [s0] if exists(s0) else ['game3d/js/style/index.js'], 'provisional',
    'The look the game ships with (no ?style flag); the texture avenues are in review style-avenues', source='post.js grade per place, flat-shaded 3D',
    review='style-avenues', used=['Every place (default)'], view={'type': 'image', 'src': s0} if exists(s0) else {}, tags=['world look'])

# image-model presets: the ComfyUI workflows (tools/workflows/README.md describes them)
wf_readme = read('tools/workflows/README.md')
wf_desc = {m.group(1): m.group(2) for m in re.finditer(r'^- `([\w.\-<>]+?)(?:\.json)?`[^:]*:\s*(.*)$', wf_readme, re.M)}
anima_q = quote('GUIDE.md', 'RDBT Anima is the main model')
video_q = quote('GUIDE.md', 'Wan 2.2 14B (lightx2v) is pretty good')
for p in ls('tools/workflows', r'\.json$'):
    name = os.path.splitext(os.path.basename(p))[0]
    if name.startswith('reward'):
        continue
    d = wf_desc.get(name) or wf_desc.get(re.sub(r'^video2-\w+-', 'video2-<source>-', name)) or ''
    if name.startswith(('anima-', 'location-bg', 'lllite-inpaint', 'blockout-', 'composite-')):
        st, why = 'approved', anima_q
    elif re.search(r'14b-lx', name):
        st, why = 'approved', video_q
    elif re.search(r'5b|wan22|causal', name):
        st, why = 'rejected', quote('GUIDE.md', 'the 5B is completely unusable') or 'GUIDE.md, Video'
    elif name.startswith(('island-', 'video2-', 'promptlab-', 'opening-', 'figures-', 'likeforlike', 'tsubasa', 'puppet', 'sdxl', 'yue2', 'stable-audio')):
        st, why = 'legacy', 'A workflow from an earlier round (kept loadable, GUIDE: save every ComfyUI workflow)'
    else:
        st, why = 'candidate', 'Saved workflow'
    add(f'style/workflow-{name}', 'style', f'ComfyUI: {name}', [p], st, why, source=d or 'tools/workflows/README.md',
        used=[], note=d or None, tags=['ComfyUI workflow'])
add('style/prompt-playbook', 'style', 'Anime image style (prompt playbook)', ['art/PROMPTS.md', 'art/STYLE.md'], 'approved', anima_q,
    source='RDBT Anima, Euler A 30 steps CFG 5, style anchors first ("anime screenshot, anime coloring, 2d, cel shading"), drift negatives',
    used=['Every portrait and background'], tags=['prompts'])

# ------------------------------------------------------------------ git-ignored files never go in the manifest
def ignored(paths):
    if not paths:
        return set()
    r = subprocess.run(['git', 'check-ignore', '--stdin'], input='\n'.join(paths), capture_output=True, text=True, cwd=ROOT)
    return set(r.stdout.split())


allp = sorted({p for e in A.values() for p in e['paths']})
ign = ignored(allp)
for e in list(A.values()):
    e['paths'] = [p for p in e['paths'] if p not in ign and 'island/private' not in p]
    if not e['paths'] and not e.get('svg') and e['view'].get('type') not in ('chibi', 'kit'):
        del A[e['id']]


# ------------------------------------------------------------------ thumbnails
def thumb_name(src, ext):
    return f"{THUMBS}/{hashlib.sha1(src.encode()).hexdigest()[:16]}.{ext}"


def fresh(src, dst):
    try:
        return os.path.getmtime(dst) >= os.path.getmtime(src)
    except OSError:
        return False


def make_thumbs(entries, do=True):
    os.makedirs(THUMBS, exist_ok=True)
    made = 0
    for e in entries:
        v = e['view']
        src = e.get('thumb_from') or (v.get('src') if v.get('type') == 'image' else None)
        if src and re.search(r'\.(png|webp|jpe?g)$', src, re.I) and exists(src):
            dst = thumb_name(src, 'webp')
            if do and not fresh(src, dst):
                from PIL import Image
                try:
                    im = Image.open(src)
                    im.thumbnail((420, 420))
                    if im.mode not in ('RGB', 'RGBA'):
                        im = im.convert('RGBA')
                    im.save(dst, 'WEBP', quality=82)
                    made += 1
                except Exception as ex:
                    print('thumb failed', src, ex)
            if exists(dst):
                e['thumb'] = dst
        elif v.get('type') == 'audio' and exists(v['src']):
            dst = thumb_name(v['src'], 'png')
            if do and not fresh(v['src'], dst):
                r = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', v['src'], '-filter_complex',
                                    'aformat=channel_layouts=mono,showwavespic=s=360x64:colors=#3fc1b0:scale=sqrt', '-frames:v', '1', dst], capture_output=True)
                if r.returncode == 0:
                    made += 1
            if exists(dst):
                e['thumb'] = dst
        elif v.get('type') in ('meshy', 'mio', 'glb', 'chibi', 'kit', 'room'):
            dst = f"{THUMBS}/3d-{re.sub(r'[^a-z0-9]+', '-', e['id'].lower())}.webp"
            e['thumb3d'] = dst
            if exists(dst):
                e['thumb'] = dst
        e.pop('thumb_from', None)
    return made


def main():
    args = sys.argv[1:]
    entries = sorted(A.values(), key=lambda e: (list(KINDS).index(e['kind']), STATUSES.index(e['status']), e.get('who') or '~', e['id']))
    made = make_thumbs(entries, do='--no-thumbs' not in args)
    counts = {'kind': {}, 'status': {}, 'kind_status': {}}
    for e in entries:
        counts['kind'][e['kind']] = counts['kind'].get(e['kind'], 0) + 1
        counts['status'][e['status']] = counts['status'].get(e['status'], 0) + 1
        ks = counts['kind_status'].setdefault(e['kind'], {})
        ks[e['status']] = ks.get(e['status'], 0) + 1
    who = sorted({e['who'] for e in entries if e.get('who')})
    data = {
        'generated': datetime.now().astimezone().isoformat(timespec='seconds'),
        'kinds': KINDS, 'statuses': STATUSES, 'places': PLACES,
        'names': {w: NAMES.get(w, w) for w in who},
        'reviews': {k: {'title': r.get('title'), 'status': r.get('status')} for k, r in REVIEWS.items()},
        'counts': counts,
        'assets': entries,
    }
    tmp = OUT + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=0, separators=(',', ':'))
    os.replace(tmp, OUT)
    stale3d = sum(1 for e in entries if e.get('thumb3d') and not e.get('thumb'))
    missing = [(e['id'], p) for e in entries for p in e['paths'] + ([e['thumb']] if e.get('thumb') else []) if not exists(p)]
    print(f"{len(entries)} assets ({', '.join(f'{k} {v}' for k, v in counts['kind'].items())}); "
          f"{', '.join(f'{k} {v}' for k, v in counts['status'].items())}; {made} new thumbnails; "
          f"{stale3d} 3D thumbnails missing (node tools/assets/render3d.mjs); {time.time() - T0:.1f} s")
    if '--check' in args:
        for i, p in missing:
            print('MISSING', i, p)
        print('check:', 'every listed path exists' if not missing else f'{len(missing)} missing paths')
        sys.exit(1 if missing else 0)


if __name__ == '__main__':
    main()
