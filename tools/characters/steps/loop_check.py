"""loop-check: checks for an animated loop of a cut-out portrait, on its frames (transparent PNGs, one loop, in order).

  ~/ai/sd/venv/bin/python tools/characters/steps/loop_check.py sheet <frames dir> <out.webp> [--every 6] [--cols 6]
      a contact sheet on mid grey, each tile labelled with its frame number
  ~/ai/sd/venv/bin/python tools/characters/steps/loop_check.py crops <frames dir> <x0,y0,x1,y1> <out.webp> [--every 1] [--cols 12]
      the same region of every frame at 1:1 (face, glasses, hair), on mid grey
  ~/ai/sd/venv/bin/python tools/characters/steps/loop_check.py stats <frames dir> [--source still.webp] [--out stats.json]
      seam: the change from the last frame back to the first, against the median change between neighbouring frames
      (a clean loop is about 1x or less); drift: each frame against frame 0 (mean colour difference over the figure,
      and the share of figure pixels that changed by more than 24 levels); source: frame 0 against the still; alpha:
      how much the outline changes over the loop (pixels whose alpha flips across 50%); motion: the largest shift of
      the figure's bounding box and of its top edge, in px.
  ~/ai/sd/venv/bin/python tools/characters/steps/loop_check.py stage <frames dir> <out.webp> --face y0,y1 [--size 1]
          [--frames 0,27,54] [--labels a,b,c]
      the chosen frames at the size the dialogue stage shows the picture (game3d/js/ui/portraits.js layoutStage: desktop
      1366x860, face 112 px, cut 2.25 face heights under the chin; phone 390x844, face 57 px, cut 1.55), on a dim stage;
      --face is the FACE box's top and bottom (chin) in the picture, --size its `size`"""
import json, os, sys, glob
import numpy as np
from PIL import Image, ImageDraw, ImageFont


def frames(d):
    fs = sorted(f for f in glob.glob(os.path.join(d, '*.png')) if os.path.basename(f)[:-4].isdigit())
    if not fs:
        raise SystemExit('no frames in ' + d)
    return fs


def on_grey(im):
    im = im.convert('RGBA')
    bg = Image.new('RGBA', im.size, (128, 128, 128, 255))
    bg.alpha_composite(im)
    return bg.convert('RGB')


def font(n):
    try:
        return ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', n)
    except OSError:
        return ImageFont.load_default()


def grid(tiles, cols, out):
    w, h = tiles[0][1].size
    rows = (len(tiles) + cols - 1) // cols
    sh = Image.new('RGB', (cols * (w + 4) + 4, rows * (h + 22) + 4), (30, 34, 40))
    d = ImageDraw.Draw(sh)
    f = font(13)
    for i, (label, t) in enumerate(tiles):
        x, y = 4 + (i % cols) * (w + 4), 4 + (i // cols) * (h + 22)
        d.text((x + 2, y + 3), label, fill=(235, 238, 242), font=f)
        sh.paste(t, (x, y + 20))
    sh.save(out, 'WEBP', quality=90)
    print(out, sh.size)


def sheet(d, out, every=6, cols=6, width=300):
    tiles = []
    for i, f in enumerate(frames(d)):
        if i % every:
            continue
        im = on_grey(Image.open(f))
        tiles.append((str(i), im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)))
    grid(tiles, cols, out)


def crops(d, box, out, every=1, cols=12):
    tiles = [(str(i), on_grey(Image.open(f)).crop(box)) for i, f in enumerate(frames(d)) if i % every == 0]
    grid(tiles, cols, out)


def load(f):
    a = np.asarray(Image.open(f).convert('RGBA')).astype(np.float32)
    return a[..., :3], a[..., 3] / 255


def stats(d, source=None, out=None):
    fs = frames(d)
    c0, a0 = load(fs[0])
    fig = a0 > 0.5
    def diff(c1, a1, c2, a2):
        m = (a1 > 0.5) | (a2 > 0.5)
        dc = np.abs(c1 * a1[..., None] - c2 * a2[..., None]).mean(-1)
        return float(dc[m].mean()), float((dc[m] > 24).mean())
    prev, steps, drift, flips, boxes = (c0, a0), [], [], [], []
    for f in fs:
        c, a = load(f)
        if f != fs[0]:
            steps.append(diff(prev[0], prev[1], c, a)[0])
        drift.append(diff(c0, a0, c, a))
        flips.append(int(((a > 0.5) != fig).sum()))
        ys, xs = np.nonzero(a > 0.5)
        boxes.append((int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())))
        prev = (c, a)
    seam = diff(prev[0], prev[1], c0, a0)[0]
    med = float(np.median(steps)) if steps else 0.0
    b = np.array(boxes)
    res = {'frames': len(fs), 'size': list(c0.shape[1::-1]),
           'seam_change': round(seam, 3), 'median_step_change': round(med, 3),
           'seam_vs_step': round(seam / med, 2) if med else None,
           'drift_mean_max': round(max(x[0] for x in drift), 3), 'drift_changed_share_max': round(max(x[1] for x in drift), 4),
           'drift_worst_frame': int(np.argmax([x[0] for x in drift])),
           'alpha_flips_max_px': max(flips), 'alpha_flips_share_max': round(max(flips) / max(1, int(fig.sum())), 4),
           'box_shift_px': [int(b[:, k].max() - b[:, k].min()) for k in range(4)]}
    if source:
        cs, as_ = load(source)
        if cs.shape == c0.shape:
            res['frame0_vs_source'] = [round(x, 4) for x in diff(cs, as_, c0, a0)]
        else:
            res['frame0_vs_source'] = f'size differs: {list(cs.shape[1::-1])} vs {list(c0.shape[1::-1])}'
    print(json.dumps(res))
    if out:
        json.dump(res, open(out, 'w'), indent=1)
    return res


def stage(d, out, face, size=1.0, idx=(0,), labels=None):
    fs = frames(d)
    f0, f1 = face
    rows = []
    for name, F, cutK in (('desktop 1366x860', min(124, 860 * 0.13), 2.25), ('phone 390x844', min(58, 844 * 0.068), 1.55)):
        k = F * size / (f1 - f0)
        tiles = []
        for j, i in enumerate(idx):
            im = Image.open(fs[min(i, len(fs) - 1)]).convert('RGBA')
            im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
            im = im.crop((0, 0, im.width, min(im.height, round(f1 * k + cutK * F))))
            bg = Image.new('RGBA', im.size, (40, 47, 62, 255))
            bg.alpha_composite(im)
            tiles.append((labels[j] if labels else f'frame {i}', bg.convert('RGB')))
        rows.append((name, tiles))
    w = max(sum(t.width + 6 for _, t in r) + 6 for _, r in rows)
    h = sum(max(t.height for _, t in r) + 46 for _, r in rows) + 6
    sh = Image.new('RGB', (w, h), (24, 28, 36))
    dr = ImageDraw.Draw(sh)
    f = font(13)
    y = 4
    for name, r in rows:
        dr.text((6, y + 2), name, fill=(150, 200, 215), font=f)
        y += 20
        x = 6
        for label, t in r:
            dr.text((x, y + 3), label, fill=(235, 238, 242), font=f)
            sh.paste(t, (x, y + 22))
            x += t.width + 6
        y += max(t.height for _, t in r) + 26
    sh.save(out, 'WEBP', quality=90)
    print(out, sh.size)


def opts(rest):
    o, pos = {}, []
    i = 0
    while i < len(rest):
        if rest[i].startswith('--'):
            o[rest[i][2:]] = rest[i + 1]
            i += 2
        else:
            pos.append(rest[i])
            i += 1
    return o, pos


if __name__ == '__main__':
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    cmd = sys.argv[1]
    o, p = opts(sys.argv[2:])
    if cmd == 'sheet':
        sheet(p[0], p[1], int(o.get('every', 6)), int(o.get('cols', 6)))
    elif cmd == 'crops':
        crops(p[0], tuple(int(v) for v in p[1].split(',')), p[2], int(o.get('every', 1)), int(o.get('cols', 12)))
    elif cmd == 'stage':
        stage(p[0], p[1], tuple(int(v) for v in o['face'].split(',')), float(o.get('size', 1)),
              tuple(int(v) for v in o.get('frames', '0').split(',')), o['labels'].split(',') if 'labels' in o else None)
    elif cmd == 'stats':
        stats(p[0], o.get('source'), o.get('out'))
    else:
        raise SystemExit(__doc__)
