"""Identity check for private scene renders: do the faces and hair stay the same person (Jørgen, 2026-10-05: "lets make
sure to verify that the faces / hair remains consistent, especially for mio and eric").

tools/imgqa.py grades a one-character portrait against the approved portrait. A scene render has two or more people, small
faces and angles, so this finds EVERY face (imgutils anime face detection) and matches each one to the cast. Per face:
  who      the cast member whose reference faces (tools/imgqa-ref/scene-cast.json, several per person) are nearest by CCIP
           (imgutils' anime character embedding; 0 = same picture). Among women or men only when the face is clearly one or
           the other (wd14 1girl / 1boy). No reference near enough = `unknown`, which fails: nobody in the cast.
  ccip     the distance to that person's nearest reference, graded pass / warn / fail (THRESH, calibrated below).
  hair     median CIELAB colour of the hair just above the forehead against the same measure on the person's references:
           `dE`, and `hue` = how far the colour sits towards green or towards a plain dark/brown (Mio is dark green bordering
           on black, never plain black; Eric is dark blond, never dark brown).
  glasses  wd14 tagger on the face crop: present or absent against what the person wears (Mio, Eric, Emi have them; Aoi,
           Mizuno, Kuro, Rei and the worker do not). For Mio and Eric imgqa.py's frame fit is run too and shown.
  skin     median CIELAB colour of the cheeks against the references (Mio is pale; flags tan).
  ponytail Eric only: the tagger sees a ponytail on the head crop or not. Not seeing one is "not measurable" (from the front
           it is hidden), so it goes to the visual pass instead of failing.
It flags; the visual pass (looking at the picture next to the approved one) decides, and is written to <round>/identity.json.
CPU only (CUDA hidden), about 2 s a face.

Usage: python3 tools/imgqa_scene.py <round> [<round> ...]   a round folder, or <project>/<round> under island/private/rewards/
       python3 tools/imgqa_scene.py --all                   every round there (not user/, not imagegen/)
       python3 tools/imgqa_scene.py img.webp ... --out DIR  single images
       python3 tools/imgqa_scene.py <round> --regrade       grade the stored measurements again (new thresholds or cast json)
       python3 tools/imgqa_scene.py report                  per round and per person counts from the written reports, the worst
                                                            Mio and Eric pictures, and the sequences.json steps they sit in
Writes <round>/imgqa-scene.json, <round>/imgqa-scene-sheet[-N].webp (the pictures with face boxes, warn and fail first) and
<round>/imgqa-scene-faces[-N].webp (every identified head by person, the approved reference first). Thresholds and what they were
calibrated on: THRESH below. Not measured here: the frame colour and shape of the glasses (Mio's are thick taupe-grey rounded, Eric's
thin silver rectangles; only present / absent is graded), and hair length and style; those are for the visual pass."""
import os
import sys

os.environ.setdefault('CUDA_VISIBLE_DEVICES', '-1')  # CPU only, no GPU lock needed
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import imgqa  # noqa: E402  (re-runs this script in the imaging venv when imgutils is missing)

import json  # noqa: E402
import glob  # noqa: E402
import argparse  # noqa: E402
import subprocess  # noqa: E402
import numpy as np  # noqa: E402
from PIL import Image, ImageDraw, ImageFont  # noqa: E402

REPO = imgqa.REPO
CAST = os.path.join(imgqa.REFDIR, 'scene-cast.json')
COL, FONT = imgqa.COL, imgqa.FONT

# pass up to the first number, warn up to the second, fail beyond (the reverse where higher is better). A person's own values
# (Eric's) are in tools/imgqa-ref/scene-cast.json under `thresh`. What they were set on: the notes below.
THRESH = {
    'ccip': (0.17, 0.24),          # distance to the nearest reference of the matched person
    'unknown': 0.24,               # nearer than this to somebody = that somebody; else `unknown`
    'male_penalty': 0.06,          # added to a woman's distance for a face with stubble when matching
    'min_face': 40,                # px of face height below which nothing is graded (warn: too small to judge)
    'hair_dE': (22, 35),           # CIELAB distance of the hair colour to the person's references
    'mio_green_a': (-3.5, -2.5),   # Mio: median a* of the hair; green is lower, plain black is near 0
    'skin_over': (10, 18),         # pale people: cheek chroma over the references' before warn / fail
    'glasses_want': (0.60, 0.30),  # wd14 `glasses` probability when she / he must wear them (higher is better)
    'glasses_none': (0.30, 0.60),  # when they must not
}
# Calibrated 2026-10-05 on the day-1 hard scene renders (island/private/rewards/day1/hard-1) that Jørgen and the index page marked,
# and on a full-size look at every picture the scene sequences use. Numbers:
#   Mio hair: round-6 dark-green renders have a median a* of -5.6 to -15.9 and the approved-look skimpy portraits -4.3 to -4.6;
#   the renders marked "black-haired Mio" in the earlier rounds sit at -2.5 to +0, so pass <= -3.5, fail > -2.5.
#   Mio skin: the references' cheek chroma is 12.5; the renders marked tanned are 36 to 41, the pale ones 13 to 23: warn over
#   +10, fail over +18 (or the tagger's tan / dark_skin sum >= 0.7).
#   Glasses (wd14 on the head): worn in every picture of the people who wear them (0.76 to 0.97); 0.0 on the worker's bare face
#   and on the renders marked "she wears glasses": the same call both ways, pass >= 0.6 / <= 0.3.
#   CCIP: Mio's good renders are 0.07 to 0.10, the black-haired ones up to 0.17. Eric's approved portrait is ink-style, so his
#   good renders run 0.10 to 0.24 (0.29 in an extreme close-up) and the tool takes 0.22 / 0.30 for him; a man with stubble may be
#   Eric out to 0.32, anyone else must be within 0.24 of someone or is `unknown`.
#   Hair colour of Eric and Emi: only a gross-error test (the measure also picks up background): dE over 28 / 45 for Eric.
CALIBRATION = ('day-1 hard rounds as marked on their index page plus a full-size look at every picture the scene sequences use; '
               'see the comment above THRESH in tools/imgqa_scene.py')


def grade(key, v):
    return imgqa.grade(key, v, THRESH)


def private_root():
    """island/private/rewards: in this checkout, else in the main one (git-ignored, so a worktree has none)."""
    for base in (REPO, os.path.dirname(os.path.abspath(subprocess.check_output(
            ['git', '-C', REPO, 'rev-parse', '--git-common-dir'], text=True).strip() + '/'))):
        p = os.path.join(base, 'island', 'private', 'rewards')
        if os.path.isdir(p):
            return p
    sys.exit('no island/private/rewards here or in the main checkout')


def resolve(p):
    for base in ('', REPO, os.path.dirname(private_root()), private_root()):
        q = os.path.join(base, p)
        if os.path.exists(q):
            return q
    sys.exit(f'not found: {p}')


# ------------------------------------------------------------------------------------------------------------- measures

def box_crop(pil, box, half_factor, size=None):
    x0, y0, x1, y1 = box
    half = max(x1 - x0, y1 - y0) * half_factor
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    c = pil.crop((int(cx - half), int(cy - half), int(cx + half), int(cy + half)))
    return c.resize((size, size), Image.LANCZOS) if size else c


def flat(img):
    """Colours for measuring: a cut-out laid on white (its see-through pixels are black in img['rgb'])."""
    if not img['cut']:
        return img['rgb']
    a = img['alpha'][..., None] / 255
    return img['rgb'] * a + 255 * (1 - a)


def region(rgb, x0, y0, x1, y1):
    h, w = rgb.shape[:2]
    x0, x1 = max(0, int(x0)), min(w, int(x1))
    y0, y1 = max(0, int(y0)), min(h, int(y1))
    return rgb[y0:y1, x0:x1].reshape(-1, 3) if x1 > x0 and y1 > y0 else np.zeros((0, 3))


def skin_lab(rgb, box):
    """Median colour of the cheeks and nose: the middle of the face, under the eyes, above the mouth."""
    x0, y0, x1, y1 = box
    fw, fh = x1 - x0, y1 - y0
    px = region(rgb, x0 + .2 * fw, y0 + .5 * fh, x1 - .2 * fw, y0 + .72 * fh)
    return np.median(imgqa.lab(px), 0) if len(px) else None


def hair_stats(rgb, box, skin):
    """The hair round the head: the band above the box and the strips beside it, without the face, skin-coloured pixels
    (a bare forehead, neck, ear) and near-white. `lab` = median colour of what is left, `green` = share of it that is clearly
    green (a* under -20, b* over 0: Mio's lighter green, not teal light, which has b* under 0), `n` = pixels left."""
    x0, y0, x1, y1 = box
    fw, fh = x1 - x0, y1 - y0
    H, W = rgb.shape[:2]
    ya, yb = max(0, int(y0 - .5 * fh)), min(H, int(y0 + .45 * fh))
    xa, xb = max(0, int(x0 - .3 * fw)), min(W, int(x1 + .3 * fw))
    if yb <= ya or xb <= xa:
        return None
    patch = rgb[ya:yb, xa:xb]
    yy, xx = np.mgrid[ya:yb, xa:xb]
    inside = (xx > x0 + .1 * fw) & (xx < x1 - .1 * fw) & (yy > y0 + .12 * fh)
    L = imgqa.lab(patch)
    keep = ~inside & (L[..., 0] < 90)
    if skin is not None:
        keep &= np.linalg.norm(L - skin, axis=-1) > 25
    if keep.sum() < 0.05 * patch.shape[0] * patch.shape[1] or keep.sum() < 30:
        return None
    k = L[keep]
    o = np.argsort(k[:, 0])
    n = len(k)
    return dict(lab=np.median(k, 0), fill=k[o[int(.65 * n):int(.85 * n) + 1]].mean(0),
                green=float(((k[:, 1] < -20) & (k[:, 2] > 0)).mean()), n=n)


def tags_of(pil, box):
    """wd14 tags on a crop around the head: the glasses, hair colour, ponytail and 1boy / 1girl probabilities."""
    from imgutils.tagging import get_wd14_tags
    _, general, _ = get_wd14_tags(box_crop(pil, box, 1.0), model_name='SwinV2_v3')
    keys = ('glasses', 'sunglasses', 'black_hair', 'green_hair', 'blonde_hair', 'brown_hair', 'multicolored_hair', 'ponytail',
            'short_hair', 'long_hair', 'facial_hair', 'stubble', 'tan', 'dark_skin', '1boy', '1girl', 'hat', 'beauty_mark',
            'mole', 'twintails', 'bob_cut', 'pink_hair', 'orange_hair', 'red_hair', 'grey_hair')
    return {k: round(float(general.get(k, 0)), 2) for k in keys}


# ----------------------------------------------------------------------------------------------------------------- cast

def measure_face(img, pil, box, tags=True):
    """Everything measured on one face before it is known who it is."""
    sk = skin_lab(flat(img), box)
    return dict(box=box, feat=imgqa.ccip_feature(img, box), skin=sk, hair=hair_stats(flat(img), box, sk), tags=tags_of(pil, box) if tags else None)


class Cast:
    def __init__(self):
        self.people = {w: d for w, d in json.load(open(CAST))['people'].items() if d.get('refs')}
        private = os.path.join(private_root(), 'tools', 'imgqa-cast.json')  # git-ignored: more references, private-only people
        if os.path.exists(private):
            for w, d in json.load(open(private))['people'].items():
                if w in self.people:
                    self.people[w]['refs'] = self.people[w]['refs'] + d['refs']
                else:
                    self.people[w] = d
        self.refs = {}
        for who, d in self.people.items():
            feats, hair, skin, head = [], [], [], None
            for r in d['refs']:
                path, _, nth = r.partition('#')  # 'file#1' = the second biggest face of a picture with two people
                img = imgqa.load(resolve(path))
                faces = imgqa.detect_all(imgqa.to_pil(img['grey']))
                if len(faces) <= int(nth or 0):
                    sys.exit(f'no face {nth or 0} in the reference {path}')
                box = faces[int(nth or 0)][0]
                m = measure_face(img, imgqa.to_pil(img['grey']), box, tags=False)
                feats.append(m['feat'])
                head = head or head_crop(img, box)
                if m['skin'] is not None:
                    skin.append(m['skin'])
                if m['hair'] is not None and r in d.get('hair_refs', d['refs']):
                    hair.append(m['hair']['fill'])
            self.refs[who] = dict(feats=feats, hair=np.median(hair, 0) if hair else None,
                                  skin=np.median(skin, 0) if skin else None, head=head)

    def pool(self, path):
        """The people to look for in this file (cast json: only_in)."""
        return [w for w, d in self.people.items() if not d.get('only_in') or any(k in path.lower() for k in d['only_in'])]

    def distances(self, feat, pool):
        """{who: CCIP distance to that person's nearest reference}."""
        from imgutils.metrics import ccip_difference
        return {who: min(float(ccip_difference(feat, f)) for f in self.refs[who]['feats']) for who in pool}

    def assign(self, dists, males):
        """One person per face and one face per person, the cheapest overall (scipy's assignment). A face with stubble or a
        beard pays a little to be a woman; a face nobody is near enough to goes to `unknown`. -> [(who or None, distance)]."""
        from scipy.optimize import linear_sum_assignment
        names = list(dists[0])
        C = np.full((len(dists), len(names) + len(dists)), 0.30)  # nobody: costs like a poor match
        for i, (d, male) in enumerate(zip(dists, males)):
            for j, w in enumerate(names):
                # the wide limit of a person with his own `unknown` (Eric) holds only for a face with stubble
                limit = thr(self.people[w], 'unknown') if male or self.people[w].get('sex') != 'm' else THRESH['unknown']
                if d[w] <= limit:
                    C[i, j] = (d[w] + (THRESH['male_penalty'] if male and self.people[w].get('sex') != 'm' else 0)
                               - ((self.people[w].get('thresh') or {}).get('cost_bonus', 0) if male else 0))
                else:
                    C[i, j] = 1e3  # farther than this person's own limit: not them
        return [(names[j], dists[i][names[j]]) if j < len(names) else (None, min(dists[i].values()))
                for i, j in zip(*linear_sum_assignment(C))]


def head_crop(img, box, size=200):
    """The head with its hair, for the faces sheet: the face box grown by 40% and shifted up a little."""
    x0, y0, x1, y1 = box
    dy = 0.12 * (y1 - y0)
    return box_crop(imgqa.to_pil(flat(img)), [x0, y0 - dy, x1, y1 - dy], 0.7, size)


def lab3(L):
    return [round(float(v), 1) for v in L]


def is_male(tags):
    """Stubble or a beard: the one thing the tagger sees reliably (its 1boy / 1girl are both high on a kiss close-up)."""
    return max(tags['facial_hair'], tags['stubble']) >= 0.5


def raw_hair(p, ref, h):
    """The hair measurements of one face (graded later by grade_face, so a threshold change needs no new render)."""
    if h is None or ref['hair'] is None or not p.get('hair_check', True):
        return dict(measured=False, note='not checked (cap or no approved look)' if not p.get('hair_check', True) else
                    'hair not measurable (covered, cropped or skin-coloured)')
    return dict(measured=True, fill=lab3(h['fill']), ref=lab3(ref['hair']), median=lab3(h['lab']), green=round(h['green'], 3),
                dE=round(float(np.linalg.norm(h['fill'] - ref['hair'])), 1))


def raw_skin(ref, sk, tags):
    if sk is None or ref['skin'] is None:
        return None
    return dict(lab=lab3(sk), ref=lab3(ref['skin']), chroma=round(float(np.hypot(sk[1], sk[2])), 1),
                ref_chroma=round(float(np.hypot(ref['skin'][1], ref['skin'][2])), 1), tan_tag=round(tags['tan'] + tags['dark_skin'], 2))


def thr(p, key):
    """A threshold, with the person's own override from the cast json (`thresh`)."""
    return (p.get('thresh') or {}).get(key, THRESH[key])


def grade_face(f, p):
    """Statuses of an identified face from its stored measurements and THRESH: ccip, glasses, hair, skin."""
    f['ccip_status'] = imgqa.grade('ccip', f['ccip'], {'ccip': thr(p, 'ccip')})
    st = [f['ccip_status']]
    g = f['glasses']
    g['want'] = bool(p.get('glasses'))
    g['status'] = grade('glasses_want' if g['want'] else 'glasses_none', g['p'])
    st.append(g['status'])
    h = f['hair']
    h.setdefault('measured', 'fill' in h)
    if not h['measured']:
        h['status'] = 'pass' if not p.get('hair_check', True) else 'warn'
    elif p.get('hair_kind') == 'green':
        # Mio: dark green bordering on black. Plain black has a* near 0 (so does a lit wall; b* tells teal light apart)
        a = h['median'][1]
        lo, hi = THRESH['mio_green_a']
        h['status'] = 'pass' if a <= lo else 'warn' if (a <= hi or h['green'] >= 0.03) else 'fail'
        h['rule'] = f'median a* {a:.1f}: green is <= {lo}, plain black is near 0'
    else:
        h['status'] = imgqa.grade('hair_dE', h['dE'], {'hair_dE': thr(p, 'hair_dE')})
    st.append(h['status'])
    s = f.get('skin')
    if s:
        if p.get('skin') == 'pale':
            over = s['chroma'] - s['ref_chroma']
            lo, hi = THRESH['skin_over']
            s['status'] = 'fail' if over > hi or s['tan_tag'] >= 0.7 else 'warn' if over > lo or s['tan_tag'] >= 0.4 else 'pass'
        else:
            s['status'], s['note'] = 'pass', 'shown, not graded (only the pale people are)'
        st.append(s['status'])
    f['status'] = imgqa.worst(*st)
    return f['status']


# ------------------------------------------------------------------------------------------------------------- per image

def analyse(cast, path):
    img = imgqa.load(path)
    pil = imgqa.to_pil(img['grey'])
    res = dict(path=path, size=[img['w'], img['h']])
    meas = []
    for box, score in imgqa.detect_all(pil):
        f = dict(box=[round(v) for v in box], score=round(score, 2), face_h=round(box[3] - box[1]))
        if f['face_h'] < THRESH['min_face']:
            f.update(who='?', status='warn', note=f"face only {f['face_h']} px high: too small to judge")
            meas.append((f, None))
        else:
            meas.append((f, measure_face(img, pil, box)))
    # who: the nearest cast member, one person per picture (a man with stubble is likelier Eric, see Cast.assign)
    idx = [i for i, (f, m) in enumerate(meas) if m is not None]
    pool = cast.pool(path)
    dists = [cast.distances(meas[i][1]['feat'], pool) for i in idx]
    picks = cast.assign(dists, [is_male(meas[i][1]['tags']) for i in idx]) if idx else []
    for i, d, (who, dist) in zip(idx, dists, picks):
        f, m = meas[i]
        near = sorted((v, w) for w, v in d.items())
        f['nearest'] = [[w, round(v, 3)] for v, w in near[:3]]
        f['tags'] = {k: v for k, v in m['tags'].items() if v >= 0.3}
        if who is None:
            f.update(who='unknown', ccip=round(near[0][0], 3), status='fail',
                     note=f"nobody in the cast near enough (nearest {near[0][1]} {near[0][0]:.3f})")
            continue
        if who != near[0][1]:
            f['note'] = f'{near[0][1]} is nearer but is already in the picture or reads male: took {who}'
        p, ref = cast.people[who], cast.refs[who]
        f.update(who=who, ccip=round(dist, 3), glasses=dict(want=bool(p.get('glasses')), p=m['tags']['glasses']),
                 hair=raw_hair(p, ref, m['hair']))
        sk = raw_skin(ref, m['skin'], m['tags'])
        if sk:
            f['skin'] = sk
        if who == 'eric':
            pt = m['tags']['ponytail']
            # not graded: from the front it is hidden, so not seeing one is "not measurable", not a fail
            f['ponytail'] = dict(p=pt, seen=pt >= 0.5, note='' if pt >= 0.5 else 'not seen: hidden or missing, look in the visual pass')
        grade_face(f, p)
    res['faces'] = [f for f, _ in meas]
    return finish(res), img


def finish(res):
    res['status'] = imgqa.worst(*[f['status'] for f in res['faces']]) if res['faces'] else 'warn'
    if not res['faces']:
        res['note'] = 'no face found (back, crop or detail shot)'
    return res


def regrade(cast, rd):
    """Grade again from the stored measurements (after a threshold or cast-json change); returns the results."""
    jp = os.path.join(rd, 'imgqa-scene.json')
    rep = json.load(open(jp))
    for r in rep['images']:
        for f in r['faces']:
            if f['who'] in cast.people and 'glasses' in f:
                p = cast.people[f['who']]
                tg = f.get('tags', {})
                if p.get('sex') == 'm' and f['ccip'] > THRESH['unknown'] and max(tg.get('facial_hair', 0), tg.get('stubble', 0)) < 0.5:
                    # a face without stubble is not Eric on the wide limit (Cast.assign)
                    for k in ('glasses', 'hair', 'skin', 'ponytail'):
                        f.pop(k, None)
                    f.update(note=f"nobody in the cast near enough (nearest {f['who']} {f['ccip']})", who='unknown', status='fail')
                    continue
                grade_face(f, p)
        finish(r)
    rep['thresholds'] = THRESH
    rep['calibration'] = CALIBRATION
    json.dump(rep, open(jp, 'w'), indent=1)
    return rep['images']


# ----------------------------------------------------------------------------------------------------------------- sheet

def tile(res, img, TH=300):
    s = TH / img['h']
    tw = int(img['w'] * s)
    pic = imgqa.to_pil(img['rgb']).resize((tw, TH), Image.LANCZOS)
    d = ImageDraw.Draw(pic)
    font = ImageFont.truetype(FONT, 13)
    for f in res['faces']:
        c = COL[f['status']]
        x0, y0, x1, y1 = [v * s for v in f['box']]
        d.rectangle([x0, y0, x1, y1], outline=c, width=3)
        t = f"{f['who']} {f.get('ccip', '')}"
        d.rectangle([x0, y0 - 15, x0 + 7 * len(t) + 6, y0], fill=c)
        d.text((x0 + 3, y0 - 15), t, font=font, fill=(255, 255, 255))
    out = Image.new('RGB', (tw, TH + 22), (24, 26, 30))
    out.paste(pic, (0, 0))
    d = ImageDraw.Draw(out)
    d.rectangle([0, TH, tw, TH + 22], fill=COL[res['status']])
    d.text((4, TH + 3), os.path.splitext(os.path.basename(res['path']))[0][:int(tw / 7)], font=font, fill=(255, 255, 255))
    return out


def write_sheets(round_dir, tiles, per=48, cols=6):
    for old in glob.glob(os.path.join(round_dir, 'imgqa-scene-sheet*.webp')):
        os.remove(old)
    made = []
    for n in range(0, max(len(tiles), 1), per):
        page = tiles[n:n + per]
        if not page:
            break
        rows = [page[i:i + cols] for i in range(0, len(page), cols)]
        W = max(sum(t.width for t in r) + 6 * (len(r) + 1) for r in rows)
        H = sum(max(t.height for t in r) + 6 for r in rows) + 38
        sh = Image.new('RGB', (W, H), (14, 15, 18))
        ImageDraw.Draw(sh).text((6, 8), 'imgqa_scene: box colour = grade of that face (green pass, orange warn, red fail); label = who and '
                                'CCIP distance; bar = worst face of the picture; warn and fail first', font=ImageFont.truetype(FONT, 14),
                                fill=(220, 220, 220))
        y = 34
        for r in rows:
            x = 6
            for t in r:
                sh.paste(t, (x, y))
                x += t.width + 6
            y += max(t.height for t in r) + 6
        p = os.path.join(round_dir, 'imgqa-scene-sheet.webp' if n == 0 else f'imgqa-scene-sheet-{n // per + 1}.webp')
        sh.save(p, quality=85)
        made.append(p)
    return made


# ------------------------------------------------------------------------------------------------------------------ rounds

SKIP_DIRS = {'cut', 'ref', 'ctl', 'web', 'work', '__pycache__', 'rejected_thumbs'}
# not renders of this cast: Jørgen's own folders, scripts, and September's round-27/28 (the other characters, 450 pictures that
# only produce false matches); name a round on the command line to check it anyway
SKIP_TOP = {'user', 'imagegen', 'tools', 'workflows', 'reviews', 'story', 'docs', 'archive'}
# the rounds sit in rewards/<project>/<topic>-<n>/ (island/PRIVATE.md, Layout); archive/ is not checked
PROJECTS = ('skimpy', 'peeks', 'day1', 'characters')


def round_images(rd):
    imgs = []
    for root, dirs, files in os.walk(rd):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith('qa-')]
        names = set(files)
        for fn in sorted(files):
            stem, ext = os.path.splitext(fn)
            if ext.lower() not in ('.webp', '.png', '.jpg'):
                continue
            if stem.startswith(('ref-', 'sheet', 'imgqa')) or stem.endswith(('-cut', '-refined')):
                continue
            if ext.lower() == '.png' and stem + '.webp' in names:
                continue
            if os.path.basename(root) == 'raw' and os.path.exists(os.path.join(os.path.dirname(root), stem + '.webp')):
                continue  # the raw render of a final that sits beside the folder
            imgs.append(os.path.join(root, fn))
    return imgs


def all_rounds():
    root = private_root()
    out = []
    for d in sorted(os.listdir(root)):
        p = os.path.join(root, d)
        if not os.path.isdir(p) or d in SKIP_TOP:
            continue
        if d in PROJECTS:
            out += [os.path.join(p, r) for r in sorted(os.listdir(p)) if os.path.isdir(os.path.join(p, r))]
        else:
            out.append(p)
    return out


def write_faces_sheet(rd, cast, heads, cols=8, per=96):
    """imgqa-scene-faces.webp: the head of every identified face, grouped by person with the approved reference first, so a
    glance shows hair colour, ponytail, glasses and face against it (the visual pass starts here)."""
    for old in glob.glob(os.path.join(rd, 'imgqa-scene-faces*.webp')):
        os.remove(old)
    font = ImageFont.truetype(FONT, 12)
    tiles = []
    order = ['eric', 'mio'] + sorted({w for w, *_ in heads} - {'eric', 'mio'})
    for who in order:
        mine = sorted((h for h in heads if h[0] == who), key=lambda h: ({'fail': 0, 'warn': 1, 'pass': 2}[h[1]], h[2]))
        if not mine:
            continue
        group = []
        if who in cast.refs:
            group.append((cast.refs[who]['head'], f'APPROVED {who}', (70, 70, 200)))
        group += [(h[3], h[2], COL[h[1]]) for h in mine]
        for im, label, c in group:
            t = Image.new('RGB', (204, 226), c)
            t.paste(im, (2, 2))
            ImageDraw.Draw(t).text((3, 205), label[:32], font=font, fill=(255, 255, 255))
            tiles.append(t)
        while len(tiles) % cols:
            tiles.append(Image.new('RGB', (204, 226), (14, 15, 18)))
    made = []
    for n in range(0, len(tiles), per):
        page = tiles[n:n + per]
        rows = (len(page) + cols - 1) // cols
        sh = Image.new('RGB', (cols * 208 + 4, rows * 230 + 4), (14, 15, 18))
        for i, t in enumerate(page):
            sh.paste(t, (4 + (i % cols) * 208, 4 + (i // cols) * 230))
        p = os.path.join(rd, 'imgqa-scene-faces.webp' if n == 0 else f'imgqa-scene-faces-{n // per + 1}.webp')
        sh.save(p, quality=85)
        made.append(p)
    return made


def build_sheets(cast, rd, results):
    """The contact sheets (warn and fail first) and the faces sheet, from the stored boxes and the pictures."""
    tiles, heads = [], []
    for r in results:
        img = imgqa.load(os.path.join(rd, r['path']))
        tiles.append(tile(r, img))
        stem = os.path.splitext(os.path.basename(r['path']))[0][-22:]
        heads += [(f['who'], f['status'], f"{stem} {f['ccip']}", head_crop(img, f['box'])) for f in r['faces'] if 'ccip' in f]
    order = sorted(range(len(results)), key=lambda i: ({'fail': 0, 'warn': 1, 'pass': 2}[results[i]['status']], i))
    return write_sheets(rd, [tiles[i] for i in order]) + write_faces_sheet(rd, cast, heads) if tiles else []


def run_round(cast, rd, files=None, sheets=True, again=False):
    """Measure every picture of a round (again = only grade the stored measurements anew) and write the report and sheets."""
    if again:
        results = regrade(cast, rd)
    else:
        imgs = files or round_images(rd)
        results = []
        for i, p in enumerate(imgs):
            r, _ = analyse(cast, p)
            r['path'] = os.path.relpath(p, rd)
            results.append(r)
            fs = '  '.join(f"{f['who']}:{f.get('ccip', '-')}:{f['status']}" for f in r['faces']) or 'no face'
            print(f"{r['status'].upper():4} {i + 1}/{len(imgs)} {r['path']:52} {fs}", flush=True)
        json.dump(dict(round=os.path.relpath(rd, private_root()), thresholds=THRESH, calibration=CALIBRATION, images=results),
                  open(os.path.join(rd, 'imgqa-scene.json'), 'w'), indent=1)
    made = build_sheets(cast, rd, results) if sheets else []
    print('report', os.path.join(rd, 'imgqa-scene.json'), '\nsheets', *made, flush=True)
    return results


# ----------------------------------------------------------------------------------------------------------------- report

def reasons(f):
    """Which checks of a face are not a pass, in a few words."""
    if f['who'] in ('unknown', '?'):
        return [f.get('note', '')]
    out = [f"ccip {f['ccip']}"] if f.get('ccip_status') != 'pass' else []
    if f['glasses']['status'] != 'pass':
        out.append(f"glasses p={f['glasses']['p']} ({'must wear' if f['glasses']['want'] else 'must not wear'})")
    h = f['hair']
    if h['status'] != 'pass':
        out.append('hair not measurable' if not h.get('measured', 'fill' in h) else f"hair {h.get('rule') or 'dE ' + str(h['dE'])}")
    s = f.get('skin')
    if s and s['status'] != 'pass':
        out.append(f"skin chroma {s['chroma']} (ref {s['ref_chroma']}), tan tag {s['tan_tag']}")
    return out


def report():
    """Per round counts, the worst Mio and Eric pictures, and what the scene sequences use (printed as plain text)."""
    root = private_root()
    seq = json.load(open(os.path.join(root, 'sequences.json')))
    steps = {}
    for sid, lst in seq.items():
        if not sid.startswith('_') and '.' not in sid:  # the whole-scene lists; the .a .b segments only repeat them
            for i, s in enumerate(lst):
                if s.get('src'):
                    steps.setdefault(os.path.normpath(s['src']), []).append(f'{sid} step {i + 1}')
    bad = {'mio': [], 'eric': []}
    used = {}
    for rd in all_rounds():
        jp = os.path.join(rd, 'imgqa-scene.json')
        if not os.path.exists(jp):
            continue
        name = os.path.relpath(rd, root)
        rep = json.load(open(jp))
        cnt = {}
        for im in rep['images']:
            used[os.path.join(name, im['path'])] = im
            for f in im['faces']:
                c = cnt.setdefault(f['who'], dict(pass_=0, warn=0, fail=0))
                c['pass_' if f['status'] == 'pass' else f['status']] += 1
                if f['who'] in bad and f['status'] != 'pass':
                    bad[f['who']].append(((f['status'] == 'fail', len(reasons(f)), f.get('ccip', 0)), name + '/' + im['path'], f))
        print(f"{name}: {len(rep['images'])} images | " + ' | '.join(
            f"{w} {c['pass_']} pass {c['warn']} warn {c['fail']} fail" for w, c in sorted(cnt.items())))
    for w in bad:
        print(f'\nworst {w} (fail first, then most failed checks):')
        for key, p, f in sorted(bad[w], key=lambda b: b[0], reverse=True)[:25]:
            print(f"  {f['status']:4} {p}  {'; '.join(reasons(f))}  {steps.get(os.path.normpath(p), '')}")
    print('\nsequence pictures and their faces:')
    for p, v in sorted(steps.items()):
        im = used.get(p)
        faces = '  '.join(f"{f['who']}:{f['status']}" for f in im['faces']) if im else 'not measured'
        print(f'  {p}  {faces}   {v}')


def main():
    if len(sys.argv) > 1 and sys.argv[1] == 'report':
        return report()
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('targets', nargs='*', help='round folders (or names under island/private/rewards/), or images with --out')
    ap.add_argument('--all', action='store_true')
    ap.add_argument('--out', help='folder for the report when giving single images')
    ap.add_argument('--no-sheet', action='store_true')
    ap.add_argument('--regrade', action='store_true', help='grade the stored measurements again (new thresholds or cast json) and redraw the sheets')
    a = ap.parse_args()
    cast = Cast()
    kw = dict(sheets=not a.no_sheet, again=a.regrade)
    if a.all:
        for rd in all_rounds():
            run_round(cast, rd, **kw)
    elif not a.targets:
        sys.exit('give a round folder, images with --out, or --all')
    elif all(os.path.isdir(t) or os.path.isdir(os.path.join(private_root(), t)) for t in a.targets):
        for t in a.targets:
            run_round(cast, t if os.path.isdir(t) else os.path.join(private_root(), t), **kw)
    else:
        run_round(cast, a.out or os.path.dirname(os.path.abspath(a.targets[0])), files=[resolve(t) for t in a.targets], **kw)


if __name__ == '__main__':
    main()
