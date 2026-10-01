# Face textures for claude-facetface: take a front-facing anime face (face_gen.py front / expr), lift the eyes,
# brows, nose, mouth, blush and stubble off its skin, place them on the head's texture square, and draw the
# character's glasses over them as flat frames (Mio: taupe-grey rounded rectangles, art/PROMPTS.md "Mio's glasses";
# Eric: silver rectangles, from his portrait). No lighting is baked in: the skin is one flat colour and only drawn
# marks are kept.
#   ~/ai/sd/venv/bin/python tools/style-concepts/face_tex.py <set>         every face of a set in face_tex.json
#   ~/ai/sd/venv/bin/python tools/style-concepts/face_tex.py <set> --sheet a sheet of the set's textures beside the portraits
# face_tex.json: {set: {char: {expr: {src, eyes: [[x, y] image-left eye, [x, y] image-right eye], mouth: [x, y],
#                                     mirror: "left"|"right"|null, blush: 0..1}}}}  (pixel coordinates in src)
# Writes art/parts/style-concepts/claude-facetface/textures/<set>/<char>-<expr>.png (1024 square, sRGB).
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
MAIN = os.path.dirname(subprocess.check_output(['git', '-C', HERE, 'rev-parse', '--path-format=absolute',
                                                '--git-common-dir'], text=True).strip())
OUT = os.path.join(MAIN, 'art/parts/style-concepts/claude-facetface/textures')
N = 1024
# matches facet.py: skin colours, head radius R, eyes at x = +-0.042 m, texture square of side 2.4 R
SKIN = {'mio': '#f2d6c4', 'eric': '#f4d8c6'}
R = {'mio': 0.1, 'eric': 0.105}
FRAME = {'mio': dict(fill=(90, 79, 76), ink=(38, 32, 32), w=0.74, h=0.56, rad=0.3, t=0.042, drop=0.1),
         'eric': dict(fill=(168, 175, 184), ink=(52, 57, 66), w=0.78, h=0.42, rad=0.12, t=0.04, drop=0.06)}


def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def targets(ch):
    px = N / (2.4 * R[ch])
    dx = 0.042 * px
    return np.array([[N / 2 - dx, N / 2], [N / 2 + dx, N / 2]]), px


def lab(a):
    a = a / 255.0
    a = np.where(a > 0.04045, ((a + 0.055) / 1.055) ** 2.4, a / 12.92)
    M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = a @ M.T / np.array([0.9505, 1.0, 1.089])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def similarity(src, dst):
    """2x3 affine (scale, rotation, shift) taking the two src points onto the two dst points."""
    s0, s1 = src
    d0, d1 = dst
    vs, vd = s1 - s0, d1 - d0
    k = np.linalg.norm(vd) / np.linalg.norm(vs)
    a = np.arctan2(vd[1], vd[0]) - np.arctan2(vs[1], vs[0])
    c, s = k * np.cos(a), k * np.sin(a)
    A = np.array([[c, -s], [s, c]])
    t = d0 - A @ s0
    return A, t


def warp(im, A, t):
    """im (PIL) mapped by p' = A p + t into an N x N canvas."""
    Ai = np.linalg.inv(A)
    ti = -Ai @ t
    return im.transform((N, N), Image.AFFINE, (Ai[0, 0], Ai[0, 1], ti[0], Ai[1, 0], Ai[1, 1], ti[1]),
                        resample=Image.BICUBIC, fillcolor=(255, 255, 255, 0))


def features(e, ch):
    """The face's drawn marks as RGBA on an N square, in texture space."""
    im = Image.open(os.path.join(MAIN, e['src'])).convert('RGBA')
    eyes = np.array(e['eyes'], float)
    mouth = np.array(e['mouth'], float)
    tgt, px = targets(ch)
    A, t = similarity(eyes, tgt)
    w = warp(im, A, t)
    a = np.asarray(w).astype(float)
    rgb, alpha0 = a[..., :3], a[..., 3] / 255
    m2 = A @ mouth + t
    iod = tgt[1, 0] - tgt[0, 0]
    # the render's own skin: the median of the cheeks, under each eye
    cheeks = []
    for ex in tgt[:, 0]:
        y0, x0 = int(N / 2 + 0.33 * iod), int(ex)
        cheeks.append(rgb[y0 - 12:y0 + 12, x0 - 25:x0 + 25].reshape(-1, 3))
    skin = np.median(np.concatenate(cheeks), 0)
    # match the render's skin to the model's, so whatever is kept round the marks sits on the same colour
    rgb = np.clip(rgb * (np.array(hexrgb(SKIN[ch]), float) / skin), 0, 255)
    skin = np.array(hexrgb(SKIN[ch]), float)
    # keep what is drawn, drop what is shading: a mark differs from the skin in hue (iris, eye white, lips, blush)
    # or is much darker than it (lash lines, brows, pupils). Skin in shadow only darkens a little at the same hue.
    L, sk = lab(rgb), lab(skin[None, None])[0, 0]
    dab = np.linalg.norm(L[..., 1:] - sk[1:], axis=-1)
    dl = sk[0] - L[..., 0]
    ab0, ab1 = e.get('hue', (10, 24))
    l0, l1 = e.get('dark', (28, 48))
    al = np.maximum(np.clip((dab - ab0) / (ab1 - ab0), 0, 1), np.clip((dl - l0) / (l1 - l0), 0, 1)) * alpha0
    # where marks are kept: a band across the eyes and brows (out to the outer eye corners), and a narrower oval
    # round the nose, mouth and chin, so the jaw outline and hair at the sides stay out
    yy, xx = np.mgrid[0:N, 0:N].astype(float)
    cx = N / 2
    top = N / 2 - e.get('brow', 0.62) * iod
    band_bot = N / 2 + 0.3 * iod
    bw = e.get('width', 1.0) * iod

    def ramp(v, edge, soft):
        return np.clip((edge - v) / soft, 0, 1)

    band = ramp(np.abs(xx - cx), bw, 0.12 * iod) * ramp(top - yy, 0, 0.1 * iod) * ramp(yy - band_bot, 0, 0.15 * iod)
    bot = m2[1] + e.get('chin', 0.22) * iod
    ly0 = N / 2
    lrx, lry = e.get('lower', 0.5) * iod, (bot - ly0)
    low = np.clip((1 - ((xx - cx) / lrx) ** 2 - ((yy - ly0) / lry) ** 2) / 0.25, 0, 1) * (yy > ly0)
    al = al * np.maximum(band, low)
    # inside each eye keep every pixel: a pale iris is close to the skin's colour and would drop out (blank eyes)
    ew, eh = e.get('eye', (0.3, 0.12))
    for ex, ey in tgt:
        inside = np.clip((1 - ((xx - ex) / (ew * iod)) ** 2 - ((yy - ey) / (eh * iod)) ** 2) / 0.3, 0, 1)
        al = np.maximum(al, inside * alpha0)
    # the mouth is drawn faint (lips near the skin's colour): take it with lower thresholds
    mb = e.get('mouth_boost', 0)
    if mb:
        near = ramp(np.abs(xx - m2[0]), 0.32 * iod, 0.08 * iod) * ramp(np.abs(yy - m2[1]), 0.1 * iod, 0.05 * iod)
        am = np.maximum(np.clip((dab - 3) / 8, 0, 1), np.clip((dl - 6) / 14, 0, 1)) * alpha0
        al = np.maximum(al, np.clip(am * mb, 0, 1) * near)
    out = np.dstack([rgb, al * 255]).astype(np.uint8)
    out = Image.fromarray(out, 'RGBA')
    if e.get('mirror'):
        half = out.crop((0, 0, N // 2, N)) if e['mirror'] == 'left' else out.crop((N // 2, 0, N, N))
        flip = half.transpose(Image.FLIP_LEFT_RIGHT)
        out = Image.new('RGBA', (N, N))
        if e['mirror'] == 'left':
            out.paste(half, (0, 0))
            out.paste(flip, (N // 2, 0))
        else:
            out.paste(flip, (0, 0))
            out.paste(half, (N // 2, 0))
    return out, skin


def glasses(d, ch, e):
    f = FRAME[ch]
    tgt, px = targets(ch)
    iod = tgt[1, 0] - tgt[0, 0]
    w, h, t = f['w'] * iod, f['h'] * iod, max(3, f['t'] * iod)
    for ex, ey in tgt:
        cy = ey + f['drop'] * h + e.get('frame_dy', 0) * iod
        box = (ex - w / 2, cy - h / 2, ex + w / 2, cy + h / 2)
        r = f['rad'] * h
        d.rounded_rectangle(box, radius=r, outline=f['ink'], width=int(t + 4))
        inner = (box[0] + 2, box[1] + 2, box[2] - 2, box[3] - 2)
        d.rounded_rectangle(inner, radius=r - 2, outline=f['fill'], width=int(t))
    # the bridge, a little above the lens centres
    by = tgt[0, 1] + f['drop'] * h - 0.22 * h
    x0, x1 = tgt[0, 0] + w / 2, tgt[1, 0] - w / 2
    d.line((x0 - 2, by, x1 + 2, by), fill=f['ink'], width=int(t + 4))
    d.line((x0 - 2, by, x1 + 2, by), fill=f['fill'], width=int(t))


def make(ch, e):
    feat, skin = features(e, ch)
    base = Image.new('RGBA', (N, N), hexrgb(SKIN[ch]) + (255,))
    base.alpha_composite(feat)
    if e.get('glasses', True):
        glasses(ImageDraw.Draw(base), ch, e)
    out = base.convert('RGB')
    if e.get('bold'):
        # bolder marks for the game camera, where the face is a few pixels across: every dark line (lashes,
        # pupils, brows, frames, mouth) spreads by bold // 2 pixels; colours and skin are left alone
        a = np.asarray(out).astype(float)
        r = e['bold'] // 2
        m = a.copy()
        for dy in range(-r, r + 1):  # a round brush, so lines stay round at their ends
            for dx in range(-r, r + 1):
                if dx * dx + dy * dy <= r * r + 0.5:
                    m = np.minimum(m, np.roll(np.roll(a, dy, 0), dx, 1))
        dark = (m.mean(-1) < e.get('bold_level', 90))[..., None]
        out = Image.fromarray(np.where(dark, np.minimum(a, m), a).astype(np.uint8))
    return out


def sheet(tset, cfg):
    from PIL import ImageFont
    try:
        f = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 22)
    except OSError:
        f = ImageFont.load_default()
    rows = []
    for ch, exprs in cfg.items():
        cells = [(f'{ch} portrait (approved)', Image.open(os.path.join(MAIN, f'game3d/assets/portraits/{ch}-neutral.webp')))]
        for ex, e in exprs.items():
            cells.append((f'source: {os.path.basename(e["src"])}', Image.open(os.path.join(MAIN, e['src']))))
            cells.append((f'texture {tset}: {ch}-{ex}', Image.open(os.path.join(OUT, tset, f'{ch}-{ex}.png'))))
        rows.append(cells)
    W = 420
    cols = max(len(r) for r in rows)
    sh = Image.new('RGB', (cols * W, len(rows) * (W + 34)), (250, 250, 250))
    dr = ImageDraw.Draw(sh)
    for ri, r in enumerate(rows):
        for ci, (cap, im) in enumerate(r):
            im = im.convert('RGBA')
            k = min((W - 8) / im.width, (W - 8) / im.height)
            im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
            bg = Image.new('RGBA', im.size, (229, 232, 236, 255))
            bg.alpha_composite(im)
            sh.paste(bg.convert('RGB'), (ci * W + (W - im.width) // 2, ri * (W + 34) + 34))
            dr.text((ci * W + 6, ri * (W + 34) + 6), cap, fill=(30, 30, 30), font=f)
    p = os.path.join(OUT, tset, 'sheet.webp')
    sh.save(p, quality=88)
    print('SHEET', p)


def main():
    tset = sys.argv[1]
    cfg = json.load(open(os.path.join(HERE, 'face_tex.json')))[tset]
    os.makedirs(os.path.join(OUT, tset), exist_ok=True)
    for ch, exprs in cfg.items():
        for ex, e in exprs.items():
            p = os.path.join(OUT, tset, f'{ch}-{ex}.png')
            make(ch, e).save(p)
            print('wrote', p)
    sheet(tset, cfg)


if __name__ == '__main__':
    main()
