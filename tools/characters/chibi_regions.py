"""Colour-variant masks for the generic chibis (chibi_game.py GEN; game3d/js/chibi.js tints them).

For each tier of a generic it finds which texels of the baked texture are hair, top and bottom, from a few anchor
colours per region and the height on the body each texel comes from (the hair is never below the neck, trousers never
above the waist), and writes next to the game files:
  mask<suffix>.webp      red = hair, green = top, blue = bottom (soft edges), half the texture's size, lossless
  base<suffix>.webp      the baked texture again, its dark specks in light clothes and bare legs mended (specks())
  regions<suffix>.json   per region the mean linear luminance and colour of its texels (the shader keeps each texel's
                         shading relative to that mean when it recolours)
Anchors: art/candidates/chibi-crowd-1/regions.json, { "gen-suit": { "hair": [[hex, ylo, yhi], ...], "top": [...],
"bottom": [...], "keep": [...] } }, heights 0 (soles) to 1 (top of the head). A texel goes to the nearest anchor whose
band holds its height; "keep" anchors (skin, shirt, tie, shoes, eyes) stay as they are.
Inputs are the mesh, UVs and baked PNG chibi_game.py keeps in art/parts/chibi-crowd-1/game/<id><suffix>/.
  uv run --python 3.12 --with numpy --with scipy --with pillow tools/characters/chibi_regions.py [id ...] [--sheet]
CHIBI_TIER=-lo: only that tier. --sheet also writes art/parts/chibi-crowd-1/game/<id>-regions.png (the texture beside the mask) to check by eye.
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
MAIN = ROOT.split('/.claude/worktrees/')[0]
KEEP = os.path.join(os.environ.get('CHIBI_PARTS', os.path.join(MAIN, 'art/parts')), 'chibi-crowd-1', 'game')
SPEC = json.load(open(os.path.join(ROOT, 'art/candidates/chibi-crowd-1/regions.json')))
OUT = os.path.join(ROOT, 'game3d/assets/characters')
REGIONS = ('hair', 'top', 'bottom')
SPECK = 0.0003  # of the texture's texels: a speck, not a painted detail


def lin(c):
    c = np.asarray(c, dtype=np.float64) / 255
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def hexrgb(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) for i in (0, 2, 4)]


def raster(mesh, uv, px):
    """per texel: covered, and the height on the body (0 soles .. 1 crown) of the surface it shows"""
    pos = np.array(mesh['positions'])
    up = int(np.argmax(pos.max(0) - pos.min(0)))  # the chibi is taller than it is wide or deep
    h = pos[:, up]
    # the head is the wide end: compare the spread of the top and bottom tenths
    lo, hi = h.min(), h.max()
    span = lambda m: np.ptp(pos[m][:, [a for a in range(3) if a != up]], axis=0).prod() if m.any() else 0
    if span(h < lo + 0.1 * (hi - lo)) > span(h > hi - 0.1 * (hi - lo)):
        h = -h
        lo, hi = h.min(), h.max()
    h = (h - lo) / (hi - lo)
    height = np.full((px, px), -1.0)
    tris = [f for f in mesh['faces']]
    for f, corners in zip(tris, uv['corners']):
        c = np.array(corners) * px
        c[:, 1] = px - c[:, 1]  # v up -> image rows down
        x0, y0 = np.floor(c.min(0)).astype(int)
        x1, y1 = np.ceil(c.max(0)).astype(int)
        x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, px - 1), min(y1, px - 1)
        xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        (ax, ay), (bx, by), (cx, cy) = c
        d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
        if abs(d) < 1e-12:
            continue
        w0 = ((by - cy) * (xs - cx) + (cx - bx) * (ys - cy)) / d
        w1 = ((cy - ay) * (xs - cx) + (ax - cx) * (ys - cy)) / d
        w2 = 1 - w0 - w1
        e = -0.6 / max(1.0, abs(d) ** 0.5)  # half a texel of slack so chart edges are covered
        inside = (w0 >= e) & (w1 >= e) & (w2 >= e)
        if not inside.any():
            continue
        hv = w0 * h[f[0]] + w1 * h[f[1]] + w2 * h[f[2]]
        sub = height[y0:y1 + 1, x0:x1 + 1]
        sub[inside] = hv[inside]
    return height


def specks(img, label, covered, height):
    """Dark specks inside a light garment: where the bake's rays met the garment's dark inside (folds of the
    decimated copy facing in), a few texels came out near black. Inside the skirt they took the skirt's label and
    showed black on its colour as made, and near the hair they took the hair's and showed the hair's colour on the
    jacket; on bare legs they showed as dark flecks. A dark patch smaller than SPECK of the texture, surrounded by a
    region whose texels are light (or by skin below the head), joins that region and takes the colour of its nearest
    texels there; returns the image, the labels and how many texels were fixed."""
    L = img.astype(np.float64) @ [0.3, 0.59, 0.11]
    px = img.shape[0]
    out, lab = img.copy(), label.copy()
    dark = covered & (L < 60)
    parts, n = ndimage.label(dark)
    if not n:
        return out, lab, 0
    sizes = ndimage.sum(dark, parts, range(1, n + 1))
    bad = np.zeros_like(covered)
    boxes = ndimage.find_objects(parts)
    for i in np.nonzero(sizes < SPECK * px * px)[0]:
        y, x = boxes[i]
        y = slice(max(y.start - 3, 0), y.stop + 3)
        x = slice(max(x.start - 3, 0), x.stop + 3)
        m = parts[y, x] == i + 1
        ring = ndimage.binary_dilation(m, iterations=2) & ~m & covered[y, x]
        if not ring.any():
            continue
        sub = lab[y, x]
        r = np.bincount(sub[ring] + 1, minlength=4).argmax() - 1  # the surrounding label (-1 keep)
        # in skin (keep) only below the head, where nothing dark is painted (the face has its eyes, brows and mouth)
        if r < 0 and height[y, x][m].mean() > 0.42:
            continue
        if np.median(L[y, x][ring & (sub == r)]) < 110:
            continue
        sub[m] = r
        bad[y, x] |= m
    # each takes the colour of the nearest texel that isn't dark (its region's, as it is surrounded by it)
    if bad.any():
        good = covered & ~dark
        idx = ndimage.distance_transform_edt(~good, return_distances=False, return_indices=True)
        out[bad] = img[idx[0][bad], idx[1][bad]]
    fixed = int(bad.sum())
    return out, lab, fixed


def regions(gid, suffix, spec, sheet):
    d = os.path.join(KEEP, gid + suffix)
    mesh = json.load(open(os.path.join(d, 'mesh.json')))
    uv = json.load(open(os.path.join(d, 'uv.json')))
    img = np.asarray(Image.open(os.path.join(d, 'base.png')).convert('RGB'))
    px = img.shape[0]
    height = raster(mesh, uv, px)
    covered = height >= 0
    # anchors: (region index or -1 for keep, rgb, ylo, yhi)
    anchors = [(REGIONS.index(k) if k in REGIONS else -1, hexrgb(a[0]), a[1], a[2])
               for k, lst in spec.items() if k in REGIONS + ('keep',) for a in lst]
    col = img.astype(np.float64)
    best = np.full(img.shape[:2], np.inf)
    label = np.full(img.shape[:2], -1)
    for r, rgb, ylo, yhi in anchors:
        dist = np.sqrt((((col - rgb) * [0.3, 0.59, 0.11]) ** 2).sum(-1) * 3)
        ok = covered & (height >= ylo) & (height <= yhi) & (dist < best)
        best[ok] = dist[ok]
        label[ok] = r
    img, label, fixed = specks(img, label, covered, height)
    # uncovered texels (the padding between charts) take their nearest covered texel's label
    idx = ndimage.distance_transform_edt(~covered, return_distances=False, return_indices=True)
    label = label[idx[0], idx[1]]
    mask = np.zeros(img.shape, dtype=np.float64)
    for i in range(3):
        mask[..., i] = label == i
    mask = ndimage.uniform_filter(mask, size=(3, 3, 1))
    small = Image.fromarray((mask * 255).round().astype(np.uint8)).resize((px // 2, px // 2), Image.BILINEAR)
    out = os.path.join(OUT, 'chibi-' + gid)
    for f in (f'mask{suffix}.webp', f'regions{suffix}.json', f'base{suffix}.webp'):  # a worktree's link: replaced
        if os.path.islink(os.path.join(out, f)):
            os.remove(os.path.join(out, f))
    small.save(os.path.join(out, f'mask{suffix}.webp'), 'WEBP', lossless=True, method=6)
    # the texture with its specks mended (chibi_game.py's settings); the bake in KEEP stays as it came
    Image.fromarray(img).save(os.path.join(out, f'base{suffix}.webp'), 'WEBP', quality=90, method=6)
    info = {}
    L = lin(img) @ [0.2126, 0.7152, 0.0722]
    for i, k in enumerate(REGIONS):
        m = (label == i) & covered
        if m.any():
            info[k] = {'lum': round(float(L[m].mean()), 4), 'hex': '#%02x%02x%02x' % tuple(int(v) for v in img[m].mean(0)),
                       'share': round(float(m.sum() / covered.sum()), 3)}
    json.dump(info, open(os.path.join(out, f'regions{suffix}.json'), 'w'))
    print(gid + suffix, 'specks mended', fixed, json.dumps(info))
    if sheet:
        vis = img.copy()
        tint = np.array([[255, 60, 60], [60, 220, 60], [60, 90, 255]])
        for i in range(3):
            m = label == i
            vis[m] = (vis[m] * 0.35 + tint[i] * 0.65).astype(np.uint8)
        both = np.concatenate([img, vis], axis=1)
        Image.fromarray(both).save(os.path.join(KEEP, f'{gid}{suffix}-regions.png'))


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    for gid in args or list(SPEC):
        for suffix in ('', '-lo', '-far'):
            if os.environ.get('CHIBI_TIER', suffix) == suffix and os.path.exists(os.path.join(KEEP, gid + suffix, 'mesh.json')):
                regions(gid, suffix, SPEC[gid], '--sheet' in sys.argv)
