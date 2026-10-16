"""Outfit change on approved portraits: the start picture and repaint mask for an inpaint recipe, and the game framing
of the result. Face, hair and framing stay the approved portrait's; only the clothes region is repainted.

A spec (JSON, in the round folder) lists the sources, one per approved face:

  {"sources": {"kuro-neutral": {"who": "kuro", "master": "art/production/KB/c-s11.png",
                                "game": "game3d/assets/portraits/kuro-neutral.webp", "work": [768, 1280],
                                "mask": "kuro"}},
   "masks": {"kuro": {"repaint": [[x, y], ...],                      polygon in master pixels, white = repaint
                      "keep": [{"poly": [[x, y], ...], "rgb": [r, g, b], "tol": 70}],   hair inside the polygon whose
                                                                     colour is within tol of rgb (and, with minRG, red at
                                                                     least that much over green) stays, closed, grown 2 px
                      "feather": 4, "background": true, "grow": 3, "headMargin": 40}}}
                                                                     background: repaint the backdrop above the line too
                                                                     (needs fit first), except within headMargin px of
                                                                     the kept head and hair, and above row backdropTop

  prep  <spec> <pass>     writes <round>/start/<source>.png (the master scaled to `work`), <round>/start/mask-<pass>-<source>.png
                          and start/check-<pass>-<source>.png (the mask over the picture, to look at before rendering);
                          a pass uses masks["<mask>@<pass>"] where the spec has one, else masks["<mask>"]
  fit   <spec>            finds how each master sits on its game portrait (scale, offset, mirrored), by matching the
                          face area; writes it into the spec as "fit"
  frame <spec> <source> <cut.png> <out.webp>
                          places a cut-out of a render of that source (work size, RGBA) on the game canvas with the fit
  framed <spec> <source> <render.webp> <out.webp>
                          the same for a raw render, on its own backdrop colour: a framing preview of any attempt
  overlay <base.png> <mask.png> <render> <out.png>
                          the base's pixels over the render inside a mask (blurred 0.7 px): the approved expression
                          step that put Eric's base glasses frame back over each repainted face (cast-faces-1 post.py)
  lineup <out.webp> <title>=<file>[,<file>...] ...
                          rows at the size the game shows portraits on a 1080p desktop (every face 124 px high times
                          the person's size, chins level, cut 2.25 face heights below the chin; FACE in
                          game3d/js/ui/portraits.js and data/mc/*.json). Game-canvas files only; a file whose name has
                          no cast id in it (a 3D capture) is scaled to the row height. The who is the first cast id in
                          the file name.

Run with ~/ai/consist/.venv/bin/python (numpy, scipy, cv2, PIL). First made for art/candidates/portraits/pool-portraits-1
(#633)."""
import json, os, re, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
MAIN = ROOT.split('/.claude/worktrees/')[0]


def path(p):
    q = os.path.join(ROOT, p)
    return q if os.path.exists(q) else os.path.join(MAIN, p)


def load(spec_path):
    spec = json.load(open(spec_path))
    spec['_dir'] = os.path.dirname(os.path.abspath(spec_path))
    return spec


def save(spec, spec_path):
    out = {k: v for k, v in spec.items() if not k.startswith('_')}
    json.dump(out, open(spec_path, 'w'), indent=1)


def person(src, master):
    """The approved game portrait's opaque part, mapped back onto the master canvas (needs the source's fit)."""
    f = src['fit']
    g = Image.open(path(src['game'])).getchannel('A')
    k = f['s']
    big = g.transform(master.size, Image.AFFINE, (k, 0, f['tx'], 0, k, f['ty']), resample=Image.BILINEAR)
    if f['mirror']:
        big = big.transpose(Image.FLIP_LEFT_RIGHT)
    return np.asarray(big) > 128


def mask_for(master, m, src=None):
    """The repaint mask on the master canvas (L, 255 = repaint). With "background": true, the background above the
    repaint line is repainted too (from the approved cut-out), so only the head, hair and neck above the line stay."""
    W, H = master.size
    rep = Image.new('L', (W, H), 0)
    ImageDraw.Draw(rep).polygon([tuple(p) for p in m['repaint']], fill=255)
    rep = np.asarray(rep) > 0
    fig = ndimage.binary_dilation(person(src, master), iterations=m.get('grow', 3)) if m.get('background') else None
    if fig is not None:
        back = ~fig
        if m.get('headMargin'):                   # backdrop this close to the kept head and hair stays as drawn
            head = fig & ~rep
            back &= ~ndimage.binary_dilation(head, iterations=m['headMargin'])
        if 'backdropTop' in m:                    # and backdrop above this row (around the head) stays as drawn
            back[:m['backdropTop']] = False
        rep |= back
    a = np.asarray(master.convert('RGB')).astype(np.int32)
    for k in m.get('keep', []):
        zone = Image.new('L', (W, H), 0)
        ImageDraw.Draw(zone).polygon([tuple(p) for p in k['poly']], fill=255)
        zone = np.asarray(zone) > 0
        if 'rgb' in k:
            d = np.sqrt(((a - np.array(k['rgb'])) ** 2).sum(-1))
            hair = zone & (d < k.get('tol', 60))
            if 'minRG' in k:                      # reddish hair only: red over green by at least this much
                hair &= (a[..., 0] - a[..., 1]) >= k['minRG']
            hair = ndimage.binary_closing(hair, iterations=3)
            hair = ndimage.binary_opening(hair, iterations=1)
            hair = ndimage.binary_dilation(hair, iterations=2) & zone
        else:
            hair = zone
        if fig is not None:                       # a keep zone keeps the figure, never the backdrop around it
            hair &= fig
        rep &= ~hair
    out = Image.fromarray((rep * 255).astype(np.uint8))
    f = m.get('feather', 4)
    return out.filter(ImageFilter.GaussianBlur(f)) if f else out


def prep(spec, tag):
    """tag names the pass: its masks are masks["<mask>@<tag>"] where the spec has one, else masks["<mask>"]."""
    sd = os.path.join(spec['_dir'], 'start')
    os.makedirs(sd, exist_ok=True)
    for name, s in spec['sources'].items():
        master = Image.open(path(s['master'])).convert('RGB')
        W, H = s['work']
        mk = mask_for(master, spec['masks'].get(f"{s['mask']}@{tag}", spec['masks'][s['mask']]), s)
        master.resize((W, H), Image.LANCZOS).save(os.path.join(sd, f'{name}.png'))
        mk.resize((W, H), Image.BILINEAR).save(os.path.join(sd, f'mask-{tag}-{name}.png'))
        tint = Image.new('RGB', master.size, (255, 0, 160))
        check = Image.composite(Image.blend(master, tint, 0.55), master, mk)
        check.resize((W // 2, H // 2), Image.LANCZOS).save(os.path.join(sd, f'check-{tag}-{name}.png'))
        print(name, f'start/{name}.png', f'start/mask-{tag}-{name}.png', f'{np.asarray(mk).mean() / 2.55:.0f}% repainted')


def fit_one(master, game):
    """Scale s, offset (tx, ty) and mirror so that game ~ master scaled by s with its origin at (tx, ty)."""
    import cv2
    g = np.asarray(game.convert('RGBA')).astype(np.float32)
    al = g[..., 3]
    ys, xs = np.nonzero(al > 250)
    # the face area: the opaque part of the upper middle of the canvas
    gw, gh = game.size
    x0, x1, y0, y1 = int(gw * .3), int(gw * .7), int(gh * .12), int(gh * .42)
    tpl = g[y0:y1, x0:x1, :3].astype(np.float32)
    tmask = np.repeat((al[y0:y1, x0:x1] > 250).astype(np.float32)[..., None], 3, -1)
    best = None
    for mirror in (False, True):
        m = master.transpose(Image.FLIP_LEFT_RIGHT) if mirror else master
        mg = np.asarray(m.convert('RGB')).astype(np.float32)

        def score(s):
            r = cv2.resize(mg, (round(m.width * s), round(m.height * s)), interpolation=cv2.INTER_AREA)
            if r.shape[0] < tpl.shape[0] or r.shape[1] < tpl.shape[1]:
                return -1e9, None
            res = cv2.matchTemplate(r, tpl, cv2.TM_SQDIFF, mask=tmask)
            v, _, loc, _ = cv2.minMaxLoc(res)
            return -v / tmask.sum(), loc
        lo, hi = 0.3, 1.2
        cands = [(score(s), s) for s in np.arange(lo, hi, 0.01)]
        (v, loc), s = max(cands, key=lambda c: c[0][0])
        for step in (0.002, 0.0004):
            cands = [(score(t), t) for t in np.arange(s - 5 * step, s + 5 * step, step)]
            (v, loc), s = max(cands, key=lambda c: c[0][0])
        if best is None or v > best['score']:
            best = dict(score=round(float(v), 2), s=float(s), tx=float(x0 - loc[0]), ty=float(y0 - loc[1]), mirror=mirror,
                        canvas=[gw, gh])
    return best


def fit(spec, spec_path):
    for name, s in spec['sources'].items():
        f = fit_one(Image.open(path(s['master'])), Image.open(path(s['game'])))
        s['fit'] = f
        print(name, f)
    save(spec, spec_path)


def frame(spec, name, cut_path, out_path):
    s = spec['sources'][name]
    f = s['fit']
    master = Image.open(path(s['master']))
    cut = Image.open(cut_path).convert('RGBA').resize(master.size, Image.LANCZOS)
    if f['mirror']:
        cut = cut.transpose(Image.FLIP_LEFT_RIGHT)
    gw, gh = f['canvas']
    k = f['s']
    # game (u, v) = master (x, y) * s + (tx, ty): scale (premultiplied, so edges keep no background tint), then place
    small = cut.convert('RGBa').resize((round(master.width * k), round(master.height * k)), Image.LANCZOS).convert('RGBA')
    placed = Image.new('RGBA', (gw, gh), (0, 0, 0, 0))
    placed.paste(small, (round(f['tx']), round(f['ty'])))   # a plain copy onto the empty canvas keeps the alpha
    placed.save(out_path, 'WEBP', quality=92, method=6)
    print(out_path)


def place_rgb(spec, name, render_path):
    s = spec['sources'][name]
    f = s['fit']
    master = Image.open(path(s['master']))
    im = Image.open(render_path).convert('RGB').resize(master.size, Image.LANCZOS)
    if f['mirror']:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    a = np.asarray(im)
    bg = tuple(int(v) for v in np.median(np.concatenate([a[:30, :30].reshape(-1, 3), a[:30, -30:].reshape(-1, 3)]), 0))
    k = f['s']
    small = im.resize((round(master.width * k), round(master.height * k)), Image.LANCZOS)
    out = Image.new('RGB', tuple(f['canvas']), bg)
    out.paste(small, (round(f['tx']), round(f['ty'])))
    return out


def faces():
    """FACE boxes of the game (portraits.js) and the protagonists' crops (data/mc/*.json)."""
    import re
    src = open(path('game3d/js/ui/portraits.js')).read()
    out = {}
    for m in re.finditer(r"(\w+): \{ W: (\d+), H: (\d+), f: \[([\d, ]+)\](?:, size: ([\d.]+))?", src):
        out[m[1]] = dict(W=int(m[2]), H=int(m[3]), f=[int(v) for v in m[4].split(',')], size=float(m[5] or 1))
    for mc in ('eric', 'carina'):
        c = json.load(open(path(f'game3d/data/mc/{mc}.json')))['portrait']['crop']
        out[mc] = dict(W=c['W'], H=c['H'], f=c['f'], size=1.0)
    return out


def lineup(out_path, rows):
    from PIL import ImageFont
    F = faces()
    font = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 16)
    FH, BELOW, PAD, BG = 124, 2.25, 14, (24, 28, 38)
    built = []
    for title, files in rows:
        tiles = []
        for fp in files:
            name = os.path.basename(fp)
            who = next((w for w in sorted(F, key=len, reverse=True) if re.search(rf'(^|[-_/]){w}([-_.]|$)', name)), None) \
                if not name.startswith(('1366-', '390-')) else None
            im = Image.open(fp).convert('RGBA')
            if who:
                d = F[who]
                k = FH * d['size'] / (d['f'][3] - d['f'][1])
                chin, cut = d['f'][3] * k, d['f'][3] * k + BELOW * FH * d['size']
                im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS).crop((0, 0, round(im.width * k), round(cut)))
                tiles.append((im, chin, name))
            else:
                tiles.append((im, None, name))
        top = max((c for _, c, _ in tiles if c), default=200)
        H = round(max((t.height - c + top for t, c, _ in tiles if c), default=400))
        row = []
        for t, c, n in tiles:
            if c is None:                          # a 3D capture: as tall as the row
                t = t.resize((round(t.width * H / t.height), H), Image.LANCZOS)
                row.append((t, 0, n))
            else:
                row.append((t, round(top - c), n))
        W = sum(t.width for t, _, _ in row) + PAD * (len(row) + 1)
        canvas = Image.new('RGB', (W, H + 50), BG)
        d = ImageDraw.Draw(canvas)
        d.text((PAD, 6), title, fill=(235, 235, 235), font=font)
        x = PAD
        for t, y, n in row:
            canvas.paste(t, (x, 30 + y), t)
            d.text((x, H + 32), re.sub(r'-r\d{6}-\d{6}-\w{3}-\d|-game|\.webp', '', n)[:30], fill=(170, 175, 190), font=font)
            x += t.width + PAD
        built.append(canvas)
    W = max(c.width for c in built)
    sheet = Image.new('RGB', (W, sum(c.height for c in built)), BG)
    y = 0
    for c in built:
        sheet.paste(c, (0, y)); y += c.height
    sheet.save(out_path, 'WEBP', quality=90, method=6)
    print(out_path, sheet.size)


if __name__ == '__main__':
    cmd, sp = sys.argv[1], sys.argv[2]
    if cmd == 'overlay':
        base, mk, rd, out = sys.argv[2:6]
        r = Image.open(rd).convert('RGB')
        m = Image.open(mk).convert('L').resize(r.size, Image.BILINEAR).filter(ImageFilter.GaussianBlur(0.7))
        Image.composite(Image.open(base).convert('RGB').resize(r.size, Image.LANCZOS), r, m).save(out)
        sys.exit()
    if cmd == 'lineup':
        lineup(sp, [(a.split('=', 1)[0], a.split('=', 1)[1].split(',')) for a in sys.argv[3:]])
        sys.exit()
    spec = load(sp)
    if cmd == 'prep':
        prep(spec, sys.argv[3])
    elif cmd == 'fit':
        fit(spec, sp)
    elif cmd == 'frame':
        frame(spec, *sys.argv[3:6])
    elif cmd == 'framed':
        place_rgb(spec, sys.argv[3], sys.argv[4]).save(sys.argv[5], 'WEBP', quality=90, method=6)
    else:
        sys.exit(__doc__)
