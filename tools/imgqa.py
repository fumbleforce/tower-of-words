"""Image QA for cast portrait renders and cut-outs: one command after every render (Jørgen, 2026-09-29: "one automatic
check after every render (glasses, red rim, matte holes, headroom, face drift)").

Every image is compared with the character's approved game portrait (game3d/assets/portraits/<who>-neutral.webp, the
picture FACE in game3d/js/ui/portraits.js describes). Checks, each with pass / warn / fail and a number:
  redrim   share of reddish pixels along the outline (tools/redrim.py).
  glasses  the approved frame (tools/imgqa-ref/<who>-glasses.json, cut from the approved portrait) moved onto this face,
           each lens fitted on its own: `cover` = share of the approved frame line drawn in the approved frame colours,
           `worst` = the same for the weakest part (top, bottom, inner, outer of each lens; a gap where the face shows
           through), `dE` = colour difference of what is drawn on that line (CIELAB).
  matte    cut-outs only: `frame` = share of the frame line that is see-through (alpha < 250) in its worst part,
           `holes` = see-through blobs inside the silhouette (tools/alpha_holes.py, blobs over 40 px at game size).
  framing  `headroom` above the hair; `zoom` = how much the picture must be scaled so the face matches the game's face
           box (1.00 = a plain resize fits), `top` = picture missing above the game crop (needs an outpaint), `eyes` = eye
           line offset from the approved portrait, in % of face height.
  drift    `ccip` = anime character-embedding distance of the face crop to the approved face (imgutils CCIP; 0 = same
           picture), `ssim` = structural similarity of the two face crops lined up by the face box.
It flags; Jørgen still judges, and every attempt still goes on the review page (GUIDE: Show every attempt).

Usage: ~/ai/consist/.venv/bin/python tools/imgqa.py <images...> [--character mio] [--ref approved.webp] [--out DIR]
       (re-runs itself in that venv if started with another python; CPU only, about 2 s an image)
       tools/imgqa.py make-ref <who>   rebuilds tools/imgqa-ref/<who>-glasses.json
Writes DIR/imgqa.json and DIR/imgqa-sheet.webp (DIR defaults to the first image's folder). Thresholds and how they were
calibrated: THRESH below."""
import os
import sys

PY = os.path.expanduser('~/ai/consist/.venv/bin/python')
try:
    import imgutils  # noqa: F401
except ImportError:
    if os.path.exists(PY) and os.path.realpath(sys.executable) != os.path.realpath(PY):
        os.execv(PY, [PY] + sys.argv)
    raise
os.environ.setdefault('HF_HUB_OFFLINE', '1')

import re
import json
import argparse
import warnings
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

warnings.filterwarnings('ignore')
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, 'tools'))
import redrim  # noqa: E402
import framecheck  # noqa: E402

REFDIR = os.path.join(REPO, 'tools', 'imgqa-ref')
# hair that may hang in front of the frame (not a gap in it): Mio's navy fringe (composite.py hair rule)
HAIR = {'mio': lambda rgb: (rgb[..., 2] > rgb[..., 0] + 6) & (rgb.max(-1) < 110)}
FONT = '/usr/share/fonts/TTF/DejaVuSans.ttf'

# pass below the first number, warn up to the second, fail beyond (or the reverse where higher is better). Calibrated on
# rounds mio-phone-2..5 and eric-portrait-anime-2..5 (2026-09-29); the numbers per round are in the skill's notes
# (.claude/skills/portrait-round/SKILL.md, "Reading imgqa").
THRESH = {
    'redrim': (0.02, 0.08),          # share of the outline band
    'glasses_cover': (0.87, 0.85),   # higher is better
    'glasses_worst': (0.70, 0.50),   # higher is better
    'glasses_dE': (8, 15),
    'matte_frame': (0.05, 0.12),     # see-through share of the worst frame part
    'matte_holes': (0, 3),           # blobs where the render shows the figure
    'headroom': (0.03, 0.01),        # share of the height above the hair (tools/framecheck.py wants 3%); under 1% it touches
    'zoom': (0.04, 9),               # |zoom - 1|: a crop is needed (warn only)
    'top': (0.01, 9),                # share of the game crop above the picture: needs padding or an outpaint (warn only)
    'eyes': (0.06, 0.12),            # |eye line offset| / face height
    'ccip': (0.05, 0.09),            # imgutils' own "same character" line is 0.178; ours is much tighter
}


def grade(key, v, thresh=None):
    lo, hi = (thresh or THRESH)[key]
    if v is None:
        return 'warn'
    if hi < lo:  # higher is better
        return 'pass' if v >= lo else 'warn' if v >= hi else 'fail'
    return 'pass' if v <= lo else 'warn' if v <= hi else 'fail'


def worst(*st):
    return 'fail' if 'fail' in st else 'warn' if 'warn' in st else 'pass'


# ---------------------------------------------------------------------------------------------------------- game data

def face_boxes():
    """FACE from game3d/js/ui/portraits.js: {who: (W, H, [x0, y0, x1, y1])}."""
    src = open(os.path.join(REPO, 'game3d/js/ui/portraits.js'), encoding='utf-8').read()
    out = {}
    for m in re.finditer(r'(\w+):\s*\{\s*W:\s*(\d+),\s*H:\s*(\d+),\s*f:\s*\[([\d,\s]+)\]', src):
        out[m.group(1)] = (int(m.group(2)), int(m.group(3)), [int(x) for x in m.group(4).split(',')])
    return out


def guess_character(path, faces):
    base = os.path.basename(path).lower()
    for who in sorted(faces, key=len, reverse=True):
        if base.startswith(who) or f'/{who}' in path.lower():
            return who
    return None


# ------------------------------------------------------------------------------------------------------------ images

def load(path):
    im = Image.open(path)
    rgba = np.asarray(im.convert('RGBA')).astype(np.float64)
    a = rgba[..., 3]
    cut = im.mode in ('RGBA', 'LA', 'PA') and a.min() < 250
    rgb = rgba[..., :3]
    grey = rgb * (a[..., None] / 255) + 128 * (1 - a[..., None] / 255) if cut else rgb
    return dict(path=path, rgb=rgb, alpha=a if cut else None, cut=cut, grey=grey, h=rgb.shape[0], w=rgb.shape[1])


def to_pil(arr):
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


def lab(rgb):
    c = np.asarray(rgb, np.float64) / 255
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    xyz = c @ np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]]).T
    xyz /= np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def detect_all(pil):
    """Every anime face in a PIL image: [(box [x0, y0, x1, y1], score)], biggest first (tools/imgqa_scene.py uses it too)."""
    from imgutils.detect import detect_faces
    return sorted(([[float(v) for v in b], float(s)] for b, _, s in detect_faces(pil)),
                  key=lambda f: -(f[0][2] - f[0][0]) * (f[0][3] - f[0][1]))


def detect(img):
    """Face box (best score) and up to two eye centres inside it, sorted left to right in the image."""
    from imgutils.detect import detect_eyes
    pil = to_pil(img['grey'])
    faces = detect_all(pil)
    if not faces:
        return None, []
    (x0, y0, x1, y1), _ = max(faces, key=lambda f: f[1] * (f[0][2] - f[0][0]))
    eyes = []
    for (a, b, c, d), _, score in sorted(detect_eyes(pil), key=lambda e: -e[2]):
        cx, cy = (a + c) / 2, (b + d) / 2
        if x0 <= cx <= x1 and y0 <= cy <= y1 and len(eyes) < 2:
            eyes.append((cx, cy))
    return [x0, y0, x1, y1], sorted(eyes)


def figure_mask(img):
    if img['cut']:
        return img['alpha'] > 128
    return framecheck.figure_mask(img['path'])


# ------------------------------------------------------------------------------------------------------- reference

class Ref:
    def __init__(self, who, path):
        self.who, self.path = who, path
        self.img = load(path)
        self.face, self.eyes = detect(self.img)
        if self.face is None:
            sys.exit(f'no face found in the reference {path}')
        self.fh = self.face[3] - self.face[1]
        fig = figure_mask(self.img)
        rows = np.where(fig.mean(1) > 0.01)[0]
        self.hair_top = int(rows[0]) if len(rows) else 0
        self.feat = None
        self.frame = None
        gp = os.path.join(REFDIR, f'{who}-glasses.json')
        if os.path.exists(gp):
            m = read_mask(gp)
            if m.shape != (self.img['h'], self.img['w']):
                m = np.asarray(Image.fromarray(m.astype(np.uint8) * 255).resize((self.img['w'], self.img['h']), Image.BOX)) >= 128
            self.frame = m
            self._frame_setup()

    def _frame_setup(self):
        m = self.frame
        ys, xs = np.nonzero(m)
        self.pts = np.stack([xs, ys], 1).astype(np.float64)
        core = ndimage.binary_erosion(m, iterations=1)
        self.core = core[ys, xs]  # which frame points are not on its 1 px edge
        # lens of each point: nearer eye; without two eyes, left or right of the frame's middle
        if len(self.eyes) == 2:
            d = [np.hypot(xs - ex, ys - ey) for ex, ey in self.eyes]
            self.lens = np.argmin(d, 0)
            centres = self.eyes
        else:
            mid = np.median(xs)
            self.lens = (xs > mid).astype(int)
            centres = [(xs[self.lens == i].mean(), ys[self.lens == i].mean()) for i in (0, 1)]
        self.seg = np.zeros(len(xs), int)
        self.seg_names = []
        for i in (0, 1):
            # image left is her right (GUIDE: left and right on a character mean hers)
            side = 'her right lens' if i == 0 else 'her left lens'
            sel = self.lens == i
            ang = np.degrees(np.arctan2(ys - centres[i][1], xs - centres[i][0]))  # 0 = image right, 90 = down
            img_left, img_right = (135, 225), (-45, 45)
            outer, inner = (img_left, img_right) if i == 0 else (img_right, img_left)
            for k, (lo, hi) in enumerate(((-135, -45), (45, 135), outer, inner)):
                a = sel & ((ang - lo) % 360 < (hi - lo))
                self.seg[a] = i * 4 + k
            self.seg_names += [f'{side} {n}' for n in ('top', 'bottom', 'outer', 'inner')]
        # the approved frame colours: a few clusters in Lab, and how far the frame's own pixels sit from them
        L = lab(self.img['rgb'][ys, xs])
        self.centres = kmeans(L, 4)
        dist = nearest(L, self.centres)
        self.tol = max(8.0, float(np.percentile(dist, 90))) * 1.3
        self.frame_lab = np.median(L[self.core], 0)

    def ccip(self):
        if self.feat is None:
            self.feat = ccip_feature(self.img, self.face)
        return self.feat


def write_mask(path, m, note):
    """A mask as text (no binaries in git): runs of set pixels per row, [y, x0, x1) each."""
    runs = []
    for y in np.nonzero(m.any(1))[0]:
        row = np.concatenate([[0], m[y].astype(np.int8), [0]])
        d = np.diff(row)
        runs += [[int(y), int(a), int(b)] for a, b in zip(np.nonzero(d == 1)[0], np.nonzero(d == -1)[0])]
    json.dump(dict(note=note, size=[int(m.shape[1]), int(m.shape[0])], runs=runs), open(path, 'w'), separators=(',', ':'))


def read_mask(path):
    d = json.load(open(path))
    m = np.zeros((d['size'][1], d['size'][0]), bool)
    for y, a, b in d['runs']:
        m[y, a:b] = True
    return m


def kmeans(X, k, it=20):
    rng = np.random.default_rng(0)
    c = X[rng.choice(len(X), k, replace=False)]
    for _ in range(it):
        lab_ = np.argmin(((X[:, None] - c[None]) ** 2).sum(-1), 1)
        c = np.array([X[lab_ == i].mean(0) if (lab_ == i).any() else c[i] for i in range(k)])
    return c


def nearest(X, c):
    return np.sqrt(((X[:, None] - c[None]) ** 2).sum(-1)).min(1)


def face_crop(img, box, margin=0.25, size=None):
    x0, y0, x1, y1 = box
    fh = max(x1 - x0, y1 - y0)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    half = fh * (0.5 + margin)
    crop = to_pil(img['grey']).crop((int(cx - half), int(cy - half), int(cx + half), int(cy + half)))
    return crop.resize((size, size), Image.LANCZOS) if size else crop


def ccip_feature(img, box):
    from imgutils.metrics import ccip_extract_feature
    return ccip_extract_feature(face_crop(img, box))


def ssim(a, b):
    a, b = a.astype(np.float64), b.astype(np.float64)
    g = lambda x: ndimage.gaussian_filter(x, 1.5)
    ma, mb = g(a), g(b)
    va, vb, cov = g(a * a) - ma ** 2, g(b * b) - mb ** 2, g(a * b) - ma * mb
    c1, c2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
    return float((((2 * ma * mb + c1) * (2 * cov + c2)) / ((ma ** 2 + mb ** 2 + c1) * (va + vb + c2))).mean())


# ----------------------------------------------------------------------------------------------------------- checks

def check_redrim(img):
    fg = (img['alpha'] > 128) if img['cut'] else None
    share, ring, red = redrim.measure(img['rgb'].astype(int), fg)
    return dict(status=grade('redrim', share), value=round(float(share), 4)), ring & red


def fit_frame(ref, img, face, eyes):
    """Move the approved frame onto this face: a similarity from the face box (and eyes), then each lens searched on its
    own for the best overlap with pixels in the approved frame colours. Returns the moved points and the colour map."""
    s0 = (face[3] - face[1]) / ref.fh
    if len(eyes) == 2 and len(ref.eyes) == 2:
        ac = np.mean(eyes, 0)
        ar = np.mean(ref.eyes, 0)
    else:
        ac = np.array([(face[0] + face[2]) / 2, (face[1] + face[3]) / 2])
        ar = np.array([(ref.face[0] + ref.face[2]) / 2, (ref.face[1] + ref.face[3]) / 2])
    h, w = img['h'], img['w']
    L = lab(img['rgb'])
    like = nearest(L.reshape(-1, 3), ref.centres).reshape(h, w) <= ref.tol
    like = ndimage.binary_dilation(like, iterations=max(1, int(round(s0))))
    moved = np.zeros_like(ref.pts)
    R = 0.10 * (face[3] - face[1])
    for i in (0, 1):
        sel = ref.lens == i
        P = ref.pts[sel] - ar
        best = (-1, None)
        for ds in np.linspace(-0.12, 0.12, 9):
            base = ac + s0 * (1 + ds) * P
            for step, rng_ in ((max(2.0, R / 8), R), (1.0, max(2.0, R / 8))):
                c0 = best[1][1:] if best[1] is not None and step == 1.0 else (0.0, 0.0)
                offs = np.arange(-rng_, rng_ + 1e-6, step)
                for dx in offs + c0[0]:
                    xs = np.clip(np.round(base[:, 0] + dx).astype(int), 0, w - 1)
                    for dy in offs + c0[1]:
                        ys = np.clip(np.round(base[:, 1] + dy).astype(int), 0, h - 1)
                        sc = like[ys, xs].mean()
                        if sc > best[0]:
                            best = (sc, (ds, dx, dy))
        ds, dx, dy = best[1]
        moved[sel] = ac + s0 * (1 + ds) * P + (dx, dy)
    return moved, like


def mirrored(ref):
    """The approved frame flipped about the face's middle, for a head turned the other way: each lens keeps its own
    name (her left stays her left), only its shape is flipped."""
    import copy
    m = copy.copy(ref)
    cx = (ref.face[0] + ref.face[2]) / 2
    m.pts = ref.pts.copy()
    m.pts[:, 0] = 2 * cx - ref.pts[:, 0]
    m.lens = 1 - ref.lens
    m.seg = m.lens * 4 + ref.seg % 4
    m.eyes = sorted((2 * cx - x, y) for x, y in ref.eyes)
    m.is_mirror = True
    return m


def fit_glasses(g, img, face, eyes):
    moved, like = fit_frame(g, img, face, eyes)
    h, w = img['h'], img['w']
    xi = np.clip(np.round(moved[:, 0]).astype(int), 0, w - 1)
    yi = np.clip(np.round(moved[:, 1]).astype(int), 0, h - 1)
    hit = like[yi, xi]
    if g.who in HAIR:
        hit = hit | HAIR[g.who](img['rgb'][yi, xi])
    return dict(pts=moved, hit=hit, xi=xi, yi=yi, geo=g, cover=float(hit.mean()))


def check_glasses(ref, img, face, eyes):
    if ref.frame is None:
        return dict(status='pass', value=None, note=f'no glasses reference for {ref.who}'), None
    if face is None:
        return dict(status='warn', value=None, note='no face found'), None
    fit = max((fit_glasses(g, img, face, eyes) for g in (ref, mirrored(ref))), key=lambda f: f['cover'])
    g, hit, xi, yi = fit['geo'], fit['hit'], fit['xi'], fit['yi']
    segs = {}
    for k, name in enumerate(ref.seg_names):
        sel = g.seg == k
        if sel.sum() >= 8:
            segs[name] = round(float(hit[sel].mean()), 3)
    wname = min(segs, key=segs.get) if segs else None
    wval = segs[wname] if wname else None
    drawn = lab(img['rgb'][yi[g.core], xi[g.core]])
    dE = float(np.linalg.norm(np.median(drawn, 0) - ref.frame_lab))
    st = worst(grade('glasses_cover', fit['cover']), grade('glasses_worst', wval), grade('glasses_dE', dE))
    out = dict(status=st, cover=round(fit['cover'], 3), worst=wval, worst_part=wname, dE=round(dE, 1), parts=segs,
               flipped=bool(getattr(g, 'is_mirror', False)))
    return out, fit


def find_source(path):
    """The render a cut-out was made from: the same name without -cut / -refined, next to it."""
    d, b = os.path.split(path)
    stem = os.path.splitext(b)[0]
    for suf in ('-cut', '-refined'):
        if stem.endswith(suf):
            for ext in ('.png', '.webp'):
                p = os.path.join(d, stem[:-len(suf)] + ext)
                if os.path.exists(p):
                    return p
    return None


def check_matte(ref, img, fit, source=None, see=64):
    if not img['cut']:
        return None
    a = img['alpha']
    # see-through pixels inside the silhouette (tools/alpha_holes.py), counted as blobs over 40 px at game size. Gaps
    # between hair strands are see-through too, so with the render the cut-out came from, only pixels where the render
    # shows the figure (far from the local background colour) count.
    solid = a > 128
    lab_, n = ndimage.label(solid)
    if n:
        sizes = ndimage.sum(solid, lab_, range(1, n + 1))
        solid = ndimage.binary_fill_holes(lab_ == (int(np.argmax(sizes)) + 1))
    inner = ndimage.binary_erosion(solid, iterations=4)
    holes = inner & (a < see)   # mostly see-through; soft strand edges are not holes
    out = {}
    src = source or find_source(img['path'])
    s_rgb = None
    if src:
        s_rgb = np.asarray(Image.open(src).convert('RGB').resize((img['w'], img['h']), Image.LANCZOS)).astype(np.float64)
        # only the render it was really cut from (same framing): the solid pixels must match it
        if np.abs(s_rgb - img['rgb'])[a > 250].mean() > 12:
            out['note'] = f'{os.path.basename(src)} is framed differently from the cut-out; holes not graded'
            src, s_rgb = None, None
    if src:
        w = (a < 13).astype(np.float64)
        num = np.stack([ndimage.gaussian_filter(s_rgb[..., c] * w, 30) for c in range(3)], -1)
        den = ndimage.gaussian_filter(w, 30)[..., None]
        mean = (s_rgb * w[..., None]).sum((0, 1)) / max(w.sum(), 1)
        bg = np.where(den > 1e-3, num / np.maximum(den, 1e-6), mean)
        holes &= np.abs(s_rgb - bg).sum(-1) > 60
        out['source'] = os.path.relpath(src, REPO)
    hl, hn = ndimage.label(holes)
    scale = (768 / img['h']) ** 2
    blobs = [s for s in ndimage.sum(holes, hl, range(1, hn + 1)) if s * scale > 40] if hn else []
    out.update(holes=len(blobs), holes_px=int(holes.sum()))
    st = [grade('matte_holes', len(blobs)) if src else 'pass']
    if not src and 'note' not in out:
        out['note'] = 'no source render found: holes include gaps between hair strands, not graded'
    if fit is not None:
        core = fit['geo'].core
        seeth = a[fit['yi'], fit['xi']] < 250
        parts = {}
        for k, name in enumerate(ref.seg_names):
            sel = (fit['geo'].seg == k) & core
            if sel.sum() >= 8:
                parts[name] = round(float(seeth[sel].mean()), 3)
        if parts:
            wname = max(parts, key=parts.get)
            out.update(frame=parts[wname], frame_part=wname, frame_min_alpha=int(a[fit['yi'][core], fit['xi'][core]].min()),
                       frame_parts=parts)
            st.append(grade('matte_frame', parts[wname]))
    out['status'] = worst(*st)
    return out, (holes if src else None)


def check_framing(ref, img, face, eyes):
    fig = figure_mask(img)
    h, w = fig.shape
    rows = np.where(fig.mean(1) > 0.01)[0]
    top_px = int(rows[0]) if len(rows) else h
    headroom = top_px / h
    out = dict(headroom=round(headroom, 3))
    st = [grade('headroom', headroom)]
    if face is None:
        out.update(status='warn', note='no face found')
        return out, None
    W, H = ref.img['w'], ref.img['h']
    fh = face[3] - face[1]
    k = ref.fh / fh                  # game px per picture px when the face matches the game's face box
    k0 = H / h                       # a plain resize to the game canvas
    zoom = k / k0
    cx, chin = (face[0] + face[2]) / 2, face[3]
    rcx, rchin = (ref.face[0] + ref.face[2]) / 2, ref.face[3]
    x0, y0 = cx - rcx / k, chin - rchin / k   # the game crop, in picture px
    cw, ch = W / k, H / k
    top = max(0.0, -y0) / ch
    short = max(0.0, (y0 + ch) - h) / ch
    hair_game = (top_px - y0) * k   # the top of the hair in the fitted crop, game px
    out.update(zoom=round(zoom, 3), top=round(top, 3), bottom_short=round(short, 3),
               hair_top_game=int(hair_game), hair_top_ref=ref.hair_top,
               crop=[round(x0, 1), round(y0, 1), round(x0 + cw, 1), round(y0 + ch, 1)])
    st += [grade('zoom', abs(zoom - 1)), grade('top', top)]
    if hair_game < 0:
        st.append('fail')
        out['note'] = 'the hair is cut by the top of the game crop'
    if len(eyes) == 2 and len(ref.eyes) == 2:
        ey = (np.mean([e[1] for e in eyes]) - y0) * k
        rey = np.mean([e[1] for e in ref.eyes])
        off = (ey - rey) / ref.fh
        tilt = np.degrees(np.arctan2(eyes[1][1] - eyes[0][1], eyes[1][0] - eyes[0][0]))
        rtilt = np.degrees(np.arctan2(ref.eyes[1][1] - ref.eyes[0][1], ref.eyes[1][0] - ref.eyes[0][0]))
        out.update(eyes=round(float(off), 3), tilt=round(float(tilt - rtilt), 1))
        st.append(grade('eyes', abs(off)))
    out['status'] = worst(*st)
    return out, dict(crop=(x0, y0, x0 + cw, y0 + ch), top_px=top_px)


def check_drift(ref, img, face):
    if face is None:
        return dict(status='warn', note='no face found')
    from imgutils.metrics import ccip_difference
    d = float(ccip_difference(ccip_feature(img, face), ref.ccip()))
    a = np.asarray(face_crop(img, face, 0.1, 128).convert('L'))
    b = np.asarray(face_crop(ref.img, ref.face, 0.1, 128).convert('L'))
    s = ssim(a, b)
    return dict(status=grade('ccip', d), ccip=round(d, 3), ssim=round(s, 3))  # ssim follows the pose: shown, not graded


def run(ref, path):
    img = load(path)
    face, eyes = detect(img)
    res = dict(path=os.path.relpath(path, REPO), kind='cut-out' if img['cut'] else 'render', size=[img['w'], img['h']],
               face=face, eyes=[[round(x, 1), round(y, 1)] for x, y in eyes])
    draw = {}
    res['redrim'], draw['red'] = check_redrim(img)
    res['glasses'], fit = check_glasses(ref, img, face, eyes)
    draw['fit'] = fit
    m = check_matte(ref, img, fit)
    if m:
        res['matte'], draw['holes'] = m
    res['framing'], draw['frame'] = check_framing(ref, img, face, eyes)
    res['drift'] = check_drift(ref, img, face)
    res['status'] = worst(*[res[k]['status'] for k in ('redrim', 'glasses', 'matte', 'framing', 'drift') if k in res])
    return res, img, draw


# ------------------------------------------------------------------------------------------------------------ sheet

COL = {'pass': (60, 170, 90), 'warn': (230, 160, 30), 'fail': (215, 50, 50)}


def summary_lines(r):
    L = []
    g = r['redrim']
    L.append(('red rim', g['status'], f"{g['value'] * 100:.1f}%"))
    g = r['glasses']
    if g.get('cover') is not None:
        L.append(('glasses', g['status'], f"cover {g['cover']:.2f}  worst {g['worst']:.2f}  dE {g['dE']:.0f}"))
    elif g.get('note') and 'no glasses' not in g['note']:
        L.append(('glasses', g['status'], g['note']))
    if 'matte' in r:
        g = r['matte']
        fr = f"frame {g['frame']:.2f}  " if 'frame' in g else ''
        L.append(('matte', g['status'], f"{fr}holes {g['holes']}"))
    g = r['framing']
    t = f"head {g['headroom'] * 100:.0f}%"
    if 'zoom' in g:
        t += f"  zoom {g['zoom']:.2f}"
        if g['top'] > 0:
            t += f"  top {g['top'] * 100:.0f}%"
        if 'eyes' in g:
            t += f"  eyes {g['eyes'] * 100:+.0f}%"
    L.append(('framing', g['status'], t))
    g = r['drift']
    L.append(('drift', g['status'], f"ccip {g['ccip']:.3f}  ssim {g['ssim']:.2f}" if 'ccip' in g else g.get('note', '')))
    return L


def tile(res, img, draw, ref, TH=560, label=None):
    s = TH / img['h']
    tw = int(img['w'] * s)
    if img['cut']:
        yy, xx = np.mgrid[:img['h'], :img['w']]
        chk = np.where(((yy // 12 + xx // 12) % 2)[..., None] == 0, 200, 150).astype(np.float64)
        a = img['alpha'][..., None] / 255
        base = img['rgb'] * a + chk * (1 - a)
    else:
        base = img['rgb'].copy()
    red = draw.get('red')
    if red is not None and red.any():
        base[ndimage.binary_dilation(red, iterations=2)] = (255, 0, 255)
    holes = draw.get('holes')
    if holes is not None and holes.any():
        base[holes] = (0, 255, 255)
    pic = to_pil(base).resize((tw, TH), Image.LANCZOS)
    d = ImageDraw.Draw(pic)
    face = res.get('face')
    fr = draw.get('frame')
    if fr:
        x0, y0, x1, y1 = [v * s for v in fr['crop']]
        d.rectangle([x0, y0, x1, y1], outline=(255, 220, 0), width=2)
        # where the face has to be: the approved face box inside the game crop
        k = (x1 - x0) / ref.img['w']
        fx0, fy0, fx1, fy1 = [x0 + ref.face[0] * k, y0 + ref.face[1] * k, x0 + ref.face[2] * k, y0 + ref.face[3] * k]
        d.rectangle([fx0, fy0, fx1, fy1], outline=(255, 220, 0), width=1)
    if face:
        d.rectangle([v * s for v in face], outline=(0, 200, 255), width=2)
    # glasses inset: the band around the eyes, 2.5x, with the approved frame line coloured by hit / miss
    inset = None
    fit = draw.get('fit')
    if fit is not None and face:
        fh = face[3] - face[1]
        pts = fit['pts']
        bx0, by0 = pts[:, 0].min() - 0.08 * fh, pts[:, 1].min() - 0.08 * fh
        bx1, by1 = pts[:, 0].max() + 0.08 * fh, pts[:, 1].max() + 0.08 * fh
        z = tw / (bx1 - bx0)
        crop = to_pil(base).crop((int(bx0), int(by0), int(bx1), int(by1)))
        inset = crop.resize((tw, max(1, int((by1 - by0) * z))), Image.LANCZOS)
        di = ImageDraw.Draw(inset)
        miss = ~fit['hit']
        if 'matte' in res and img['cut']:
            miss = miss | (img['alpha'][fit['yi'], fit['xi']] < 250)
        for (x, y), m in zip(pts[::2], miss[::2]):
            X, Y = (x - int(bx0)) * z, (y - int(by0)) * z
            if m:
                di.ellipse([X - 1.5, Y - 1.5, X + 1.5, Y + 1.5], fill=(255, 30, 30))
    font = ImageFont.truetype(FONT, 15)
    fontb = ImageFont.truetype(FONT, 17)
    lines = summary_lines(res)
    txt_h = 26 + 20 * len(lines)
    H = TH + (inset.height if inset else 0) + txt_h
    out = Image.new('RGB', (tw, H), (24, 26, 30))
    out.paste(pic, (0, 0))
    if inset:
        out.paste(inset, (0, TH))
    d = ImageDraw.Draw(out)
    y = TH + (inset.height if inset else 0) + 4
    name = label or os.path.splitext(os.path.basename(res['path']))[0]
    d.rectangle([0, y - 4, tw, y + 20], fill=COL[res['status']] if not label else (70, 70, 80))
    d.text((6, y), name[:44], font=fontb, fill=(255, 255, 255))
    y += 24
    for lab_, st, t in lines:
        d.ellipse([6, y + 4, 16, y + 14], fill=COL[st])
        d.text((22, y), f'{lab_}: {t}', font=font, fill=(230, 230, 230))
        y += 20
    return out


def sheet(tiles, path, cols=6):
    rows = [tiles[i:i + cols] for i in range(0, len(tiles), cols)]
    W = max(sum(t.width for t in r) + 8 * (len(r) + 1) for r in rows)
    H = sum(max(t.height for t in r) + 8 for r in rows) + 8 + 34
    out = Image.new('RGB', (W, H), (14, 15, 18))
    d = ImageDraw.Draw(out)
    d.text((8, 8), 'imgqa: yellow = game crop and where the face must sit; blue = detected face; magenta = red rim; '
           'cyan = holes; red dots = approved frame line missing or see-through', font=ImageFont.truetype(FONT, 16),
           fill=(220, 220, 220))
    y = 42
    for r in rows:
        x = 8
        for t in r:
            out.paste(t, (x, y))
            x += t.width + 8
        y += max(t.height for t in r) + 8
    out.save(path, quality=88)


# ---------------------------------------------------------------------------------------------------------- make-ref

def make_ref(who):
    """Cut the glasses frame out of the approved game portrait. Each one was looked at over the portrait before it was
    committed; rebuild and look again if the portrait changes."""
    ref = load(os.path.join(REPO, f'game3d/assets/portraits/{who}-neutral.webp'))
    H, W = ref['h'], ref['w']
    if who == 'mio':
        # the frame by colour on the approved source canvas that the game portraits are scaled copies of
        # (tools/portrait_candidates.mio_frame_mask), without the hair strands that cross it, and with the stretch of
        # her left lens's top bar that her fringe hides in the portrait filled in (mio-phone-3 composite.py, the same
        # frame the phone portrait was given): that stretch is where rounds 3 and 4 showed her face through the frame
        sys.path.insert(0, os.path.join(REPO, 'art/candidates/portraits/mio-phone-3'))
        from portrait_candidates import mio_frame_mask
        import composite
        src = os.path.join(REPO, 'art/production/RF/mio.png')
        A = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
        am = mio_frame_mask(src, grow=2).astype(np.float32)
        am[(A[..., 2] > A[..., 0] + 6) & (A.max(-1) < 110)] = 0
        A, am = composite.fill_hidden_bar(A, am)
        m = ndimage.binary_erosion(am > 0.5, iterations=2)
        m = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize((W, H), Image.BOX)) >= 128
    elif who == 'eric':
        # silver-grey frame: low saturation, not bluish or warm, in the glasses band, minus the eyes (their whites are
        # the same greys) and the hair hatching above the temple arm
        img = ref.copy()
        a = ref['alpha'][..., None] / 255
        rgb = ref['rgb'] * a + np.array([0, 255, 0]) * (1 - a)
        r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
        v, sat = rgb.max(-1), rgb.max(-1) - rgb.min(-1)
        rule = (v > 55) & (np.abs(b - r) < 20) & (sat < 40)
        band = np.zeros(rule.shape, bool)
        band[195:280, 100:383] = True
        band[185:207, 290:383] = False
        img['grey'] = rgb
        _, eyes = detect(img)
        from imgutils.detect import detect_eyes
        for (ex0, ey0, ex1, ey1), _, _ in detect_eyes(to_pil(rgb)):
            band[ey0 + 1:ey1 - 1, ex0 + 1:ex1 - 1] = False
        m0 = rule & band
        c = ndimage.binary_closing(m0, iterations=2)
        lb, n = ndimage.label(c)
        sizes = ndimage.sum(c, lb, range(1, n + 1))
        m = np.isin(lb, [i + 1 for i in range(n) if sizes[i] >= 0.15 * sizes.max()]) & m0
    else:
        sys.exit(f'no recipe for {who}; add one to make_ref')
    os.makedirs(REFDIR, exist_ok=True)
    out = os.path.join(REFDIR, f'{who}-glasses.json')
    write_mask(out, m, f'glasses frame of game3d/assets/portraits/{who}-neutral.webp, made by tools/imgqa.py make-ref {who}')
    print(out, int(m.sum()), 'px')


# ------------------------------------------------------------------------------------------------------------- main

def main():
    if len(sys.argv) > 2 and sys.argv[1] == 'make-ref':
        return make_ref(sys.argv[2])
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('images', nargs='+')
    ap.add_argument('--character', '-c')
    ap.add_argument('--ref', help='approved portrait (default game3d/assets/portraits/<who>-neutral.webp)')
    ap.add_argument('--out', help='folder for imgqa.json and imgqa-sheet.webp (default: the first image\'s folder)')
    ap.add_argument('--name', default='imgqa', help='file name stem for the report and sheet')
    ap.add_argument('--cols', type=int, default=6)
    ap.add_argument('--no-sheet', action='store_true')
    a = ap.parse_args()
    faces = face_boxes()
    who = a.character or guess_character(a.images[0], faces)
    if not who:
        sys.exit('say which character: --character mio|eric|...')
    refp = a.ref or os.path.join(REPO, f'game3d/assets/portraits/{who}-neutral.webp')
    ref = Ref(who, refp)
    out_dir = a.out or os.path.dirname(os.path.abspath(a.images[0]))
    os.makedirs(out_dir, exist_ok=True)
    results, tiles = [], []
    if not a.no_sheet:
        rr, ri, rd = run(ref, refp)
        tiles.append(tile(rr, ri, rd, ref, label=f'approved: {os.path.basename(refp)}'))
    for p in a.images:
        r, img, draw = run(ref, p)
        results.append(r)
        print(f"{r['status'].upper():4}  {os.path.basename(p):48} " +
              '  '.join(f'{k}={st}:{t}' for k, st, t in summary_lines(r)), flush=True)
        if not a.no_sheet:
            tiles.append(tile(r, img, draw, ref))
    rep = dict(character=who, ref=os.path.relpath(refp, REPO), face_box_game=faces.get(who),
               ref_face_detected=ref.face, thresholds=THRESH, images=results)
    jp = os.path.join(out_dir, a.name + '.json')
    json.dump(rep, open(jp, 'w'), indent=1)
    print('report', os.path.relpath(jp, REPO))
    if not a.no_sheet:
        sp = os.path.join(out_dir, a.name + '-sheet.webp')
        sheet(tiles, sp, a.cols)
        print('sheet ', os.path.relpath(sp, REPO))


if __name__ == '__main__':
    main()
