"""Colour variants of a crowd model for Review crowd-pilot-1, made the way the crowd's routing will vary them
(game3d/js/chibi-crowd.js GEN and variant(), chibi.js TINT): a region mask (hair, top, bottom) on the texture, then
each region recoloured to a target colour, keeping each texel's shading against the region's mean brightness. The
formula is the game shader's, in linear light; here it is baked into a texture per variant so the viewer can show it.

The mask: every texel's height on the body (0 soles, 1 crown) from the mesh and its UVs, then the nearest anchor
colour whose height band holds it (chibi_regions.py's method); "keep" anchors (skin, shirt, tie, shoes, eyes) stay,
and so do small loose shells (under 60 vertices: Meshy's floating eyes and brows).

  python3 art/candidates/crowd-pilot-1/variety.py <a|b> <textured glb> <out dir>
Writes <out dir>/mask.png (red hair, green top, blue bottom), regions.json, check.png (texture beside the mask) and
v<i>.webp per variant in VARIANTS.
"""
import io, json, os, struct, sys
import numpy as np
from PIL import Image
from scipy import ndimage

# anchors: (region, hex, height low, height high); region hair | top | bottom | keep
SPEC = {
    'a': [('hair', '#2e2522', 0.62, 1.0), ('hair', '#4a3a33', 0.62, 1.0),
          ('top', '#77797e', 0.03, 0.66), ('top', '#5b5d62', 0.03, 0.66), ('top', '#93959a', 0.03, 0.66),
          ('keep', '#f3d7c4', 0.0, 1.0), ('keep', '#f4f4f2', 0.3, 0.66), ('keep', '#25262b', 0.0, 0.08),
          ('keep', '#1f2026', 0.4, 0.66)],
    'b': [('hair', '#3a2a24', 0.55, 1.0), ('hair', '#563f35', 0.55, 1.0),
          ('top', '#253055', 0.36, 0.66), ('top', '#33406b', 0.36, 0.66),
          ('bottom', '#253055', 0.15, 0.40), ('bottom', '#33406b', 0.15, 0.40),
          ('keep', '#f3d7c4', 0.0, 1.0), ('keep', '#f4f4f2', 0.4, 0.66), ('keep', '#1f2540', 0.0, 0.07),
          ('keep', '#0b1a33', 0.66, 0.86), ('keep', '#1d4f73', 0.66, 0.86), ('keep', '#f4f4f2', 0.66, 0.86)],
}
# the variants shown: (hair, top, bottom, height); None keeps a region as made. Colours from chibi-crowd.js GEN
# (suit for A, blouse for B), heights its +-5%.
VARIANTS = {
    'a': [(None, None, None, 1.09), ('#3b2a20', '#3d4048', None, 1.12), ('#4a4a4c', '#5e5448', None, 1.06),
          ('#141417', '#7a7f86', None, 1.10), (None, '#2c3446', None, 1.05), ('#3b2a20', '#4b5a4a', None, 1.13)],
    'b': [(None, None, None, 1.06), ('#62412c', '#e6dfd0', '#2b2f3a', 1.03), ('#3a2619', '#8a6f5a', '#4a3f38', 1.08),
          ('#141417', '#5c6170', '#2b2f3a', 1.05), (None, '#7a3b3b', '#2b2f3a', 1.02), ('#62412c', '#2f3443', '#4a3f38', 1.09)],
}
REG = ('hair', 'top', 'bottom')


def glb(path):
    b = open(path, 'rb').read()
    n = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + n]); blob = b[28 + n:]
    CT = {5123: np.uint16, 5125: np.uint32, 5126: np.float32}
    NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}

    def acc(i):
        a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]
        off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        dt = np.dtype(CT[a['componentType']]); nc = NC[a['type']]
        return np.frombuffer(blob, dt, a['count'] * nc, off).reshape(a['count'], nc)
    p = j['meshes'][0]['primitives'][0]
    V = acc(p['attributes']['POSITION']).astype(np.float64)
    UV = acc(p['attributes']['TEXCOORD_0']).astype(np.float64)
    F = acc(p['indices']).reshape(-1, 3)
    bv = j['bufferViews'][j['images'][0]['bufferView']]
    img = Image.open(io.BytesIO(blob[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']])).convert('RGB')
    return V, UV, F, np.asarray(img)


def shells(V, F):
    """Per vertex: the size (vertex count) of its connected shell, vertices welded by position."""
    key = {}
    rep = np.array([key.setdefault(tuple(np.round(v, 5)), len(key)) for v in V])
    par = np.arange(len(key))

    def find(a):
        while par[a] != a:
            par[a] = par[par[a]]; a = par[a]
        return a
    for a, b, c in rep[F]:
        for x, y in ((a, b), (b, c)):
            ra, rb = find(x), find(y)
            if ra != rb:
                par[ra] = rb
    root = np.array([find(r) for r in rep])
    return np.bincount(root)[root]


def raster(V, UV, F, px, small):
    h = (V[:, 1] - V[:, 1].min()) / np.ptp(V[:, 1])
    height = np.full((px, px), -1.0)
    loose = np.zeros((px, px), bool)
    for f in F:
        c = UV[f] * px                                   # glTF UVs: v down already (row = v * px)
        x0, y0 = np.maximum(np.floor(c.min(0)).astype(int), 0)
        x1, y1 = np.minimum(np.ceil(c.max(0)).astype(int), px - 1)
        xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        (ax, ay), (bx, by), (cx, cy) = c
        d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
        if abs(d) < 1e-12:
            continue
        w0 = ((by - cy) * (xs - cx) + (cx - bx) * (ys - cy)) / d
        w1 = ((cy - ay) * (xs - cx) + (ax - cx) * (ys - cy)) / d
        w2 = 1 - w0 - w1
        e = -0.6 / max(1.0, abs(d) ** 0.5)
        inside = (w0 >= e) & (w1 >= e) & (w2 >= e)
        sub = height[y0:y1 + 1, x0:x1 + 1]
        sub[inside] = (w0 * h[f[0]] + w1 * h[f[1]] + w2 * h[f[2]])[inside]
        if small[f].all():
            loose[y0:y1 + 1, x0:x1 + 1][inside] = True
    return height, loose


def lin(c):
    c = np.asarray(c, np.float64) / 255
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055) * 255


def hexrgb(h):
    return [int(h.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4)]


def main():
    cid, src, out = sys.argv[1:4]
    os.makedirs(out, exist_ok=True)
    V, UV, F, img = glb(src)
    px = img.shape[0]
    height, loose = raster(V, UV, F, px, shells(V, F) < 60)
    covered = height >= 0
    col = img.astype(np.float64)
    best = np.full(img.shape[:2], np.inf); label = np.full(img.shape[:2], -1)
    for r, hx, lo, hi in SPEC[cid]:
        dist = np.sqrt((((col - hexrgb(hx)) * [0.3, 0.59, 0.11]) ** 2).sum(-1) * 3)
        ok = covered & (height >= lo) & (height <= hi) & (dist < best)
        best[ok] = dist[ok]; label[ok] = REG.index(r) if r in REG else -1
    label[loose] = -1                                    # loose small shells (floating eyes, brows) stay as made
    idx = ndimage.distance_transform_edt(~covered, return_distances=False, return_indices=True)
    label = label[idx[0], idx[1]]
    mask = np.stack([ndimage.uniform_filter((label == i).astype(np.float64), 3) for i in range(3)], -1)
    Image.fromarray((mask * 255).round().astype(np.uint8)).save(f'{out}/mask.png')
    L = lin(img) @ [0.2126, 0.7152, 0.0722]
    info = {}
    for i, k in enumerate(REG):
        m = (label == i) & covered
        if m.any():
            info[k] = {'lum': float(L[m].mean()), 'hex': '#%02x%02x%02x' % tuple(int(v) for v in img[m].mean(0)),
                       'share': round(float(m.sum() / covered.sum()), 3)}
    vis = img.copy()
    tint = np.array([[255, 60, 60], [60, 220, 60], [60, 90, 255]])
    for i in range(3):
        m = label == i
        vis[m] = (vis[m] * 0.35 + tint[i] * 0.65).astype(np.uint8)
    Image.fromarray(np.concatenate([img, vis], 1)).resize((px, px // 2)).save(f'{out}/check.png')
    T = lin(img)
    made = []
    for n, (hair, top, bottom, hgt) in enumerate(VARIANTS[cid]):
        t = T.copy()
        for i, (k, hx) in enumerate(zip(REG, (hair, top, bottom))):
            if hx and k in info:
                c = lin(hexrgb(hx))
                new = c * np.clip(L / info[k]['lum'], 0.55, 1.6)[..., None]
                t = t + (new - t) * mask[..., i:i + 1]
        Image.fromarray(srgb(t).round().astype(np.uint8)).save(f'{out}/v{n}.webp', quality=90, method=6)
        made.append({'tex': f'v{n}.webp', 'hair': hair, 'top': top, 'bottom': bottom, 'height': hgt})
    json.dump({'regions': info, 'variants': made}, open(f'{out}/regions.json', 'w'), indent=1)
    print(cid, json.dumps(info))


if __name__ == '__main__':
    main()
