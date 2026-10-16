"""region-mask: the hair, top and bottom regions of a crowd body's texture, so each copy in the game wears its own
colours (game3d/js/crowd/tint.js). Lifted from art/candidates/crowd-pilot-1/variety.py's mask: every texel's height
on the body (0 soles, 1 crown) from the mesh and its UVs, then the nearest anchor colour whose height band holds it;
"keep" anchors (skin, shirt, shoes, eyes) stay as made, and so do small loose shells (under 60 vertices: Meshy's
floating eyes and brows), and so does the face window (face_tris(): the face and its fringe, as the live crowd
masks leave it). The texture itself is untouched.

Settings: anchors ([[region, hex, low, high], ...], region hair | top | bottom | keep), size (1024), face ({zmin,
half_w, nz}, or false to tint the face window too).
Writes build/game/<id>/mask.webp (red hair, green top, blue bottom) and regions.json (each region's mean linear
luminance, mean colour and share of the texture), and build/mask-check.png (the texture beside the regions)."""
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage
from glbio import Glb

REG = ('hair', 'top', 'bottom')


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


def raster(V, UV, F, px, small, face):
    h = (V[:, 1] - V[:, 1].min()) / np.ptp(V[:, 1])
    height = np.full((px, px), -1.0)
    loose = np.zeros((px, px), bool)
    front = np.zeros((px, px), bool)
    for t, f in enumerate(F):
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
        if face[t]:
            front[y0:y1 + 1, x0:x1 + 1][inside] = True
    return height, loose, front


def face_tris(V, F, zmin=0.58, half_w=0.16, nz=0.35):
    """The face window of the face-uv step (front-facing, above zmin, near the middle; glTF: y up, front +z): the
    face and the fringe over it keep their own colours, so a tint never reaches the eyes or mouth."""
    P = V[F]
    n = np.cross(P[:, 1] - P[:, 0], P[:, 2] - P[:, 0])
    n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-12
    c = P.mean(1)
    H = np.ptp(V[:, 1])
    xc = (V[:, 0].min() + V[:, 0].max()) / 2
    return (c[:, 1] > V[:, 1].min() + H * zmin) & (n[:, 2] > nz) & (np.abs(c[:, 0] - xc) < H * half_w)


def lin(c):
    c = np.asarray(c, np.float64) / 255
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def hexrgb(h):
    return [int(h.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4)]


def run(ctx, o):
    g = Glb(ctx.files['rigged'])
    a = g.prim()['attributes']
    V = g.acc(a['POSITION']).astype(np.float64)
    UV = g.acc(a['TEXCOORD_0']).astype(np.float64)
    F = g.acc(g.prim()['indices']).reshape(-1, 3)
    d = os.path.join(ctx.dirs['game'], ctx.id)
    img = np.asarray(Image.open(os.path.join(d, 'base.webp')).convert('RGB'))
    px = img.shape[0]
    face = face_tris(V, F, **o.get('face', {})) if o.get('face') is not False else np.zeros(len(F), bool)
    height, loose, front = raster(V, UV, F, px, shells(V, F) < 60, face)
    covered = height >= 0
    col = img.astype(np.float64)
    best = np.full(img.shape[:2], np.inf); label = np.full(img.shape[:2], -1)
    for r, hx, lo, hi in o['anchors']:
        dist = np.sqrt((((col - hexrgb(hx)) * [0.3, 0.59, 0.11]) ** 2).sum(-1) * 3)
        ok = covered & (height >= lo) & (height <= hi) & (dist < best)
        best[ok] = dist[ok]; label[ok] = REG.index(r) if r in REG else -1
    label[loose | front] = -1
    idx = ndimage.distance_transform_edt(~covered, return_distances=False, return_indices=True)
    label = label[idx[0], idx[1]]
    mask = np.stack([ndimage.uniform_filter((label == i).astype(np.float64), 3) for i in range(3)], -1)
    size = o.get('size', 1024)
    Image.fromarray((mask * 255).round().astype(np.uint8)).resize((size, size), Image.LANCZOS).save(
        os.path.join(d, 'mask.webp'), quality=90, method=6)
    L = lin(img) @ [0.2126, 0.7152, 0.0722]
    info = {}
    for i, k in enumerate(REG):
        m = (label == i) & covered
        if m.any():
            info[k] = {'lum': round(float(L[m].mean()), 4), 'hex': '#%02x%02x%02x' % tuple(int(v) for v in img[m].mean(0)),
                       'share': round(float(m.sum() / covered.sum()), 4)}
    json.dump(info, open(os.path.join(d, 'regions.json'), 'w'), indent=2)
    vis = img.copy()
    tint = np.array([[255, 60, 60], [60, 220, 60], [60, 90, 255]])
    for i in range(3):
        m = label == i
        vis[m] = (vis[m] * 0.35 + tint[i] * 0.65).astype(np.uint8)
    Image.fromarray(np.concatenate([img, vis], 1)).resize((px, px // 2)).save(ctx.path('build', 'mask-check.png'))
    print('regions', json.dumps(info))
