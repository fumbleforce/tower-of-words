# char-mio-facets: a hand-drawn facet map (Jørgen, 2026-10-01: "placing the actual edges where they need to go").
# Every corner was read off the clean reference on a 10 px grid at 4 to 8x zoom and named; every facet is a polygon
# over named corners, so neighbours share corners exactly. The facet's colour is measured: the median of the
# picture inside it, 3 px in from its edges. Optional: each corner moved (within SNAP px) to where the picture's
# colour steps hardest across its edges (snap()).
#   ~/ai/cv-venv/bin/python tools/style-concepts/mio_facets_hand.py <map>
# <map> is an entry in mio-facets-maps.json with "hand": the text file of corners and facets:
#   v <name> <x> <y>                 a corner, in the picture's 1024 px frame
#   f <part> <name> <corner> ...     a facet: its part (head, hairlock, torso, sleeve.L, ...) and its corners in order
# Writes claude-miofacets/wire/<map>.json in the same form as the measured maps (mio_facets_wire.py), and
# <map>.webp: the facets over the picture, each named.
import json
import os
import sys

import cv2
import numpy as np
import shapely
from shapely.geometry import Polygon

import mio_i2i_cam as C
from mio_facets_wire import MAPS, OUT

HERE = os.path.dirname(os.path.abspath(__file__))


def read(path):
    V, Fs = {}, []
    for ln in open(path):
        ln = ln.split('#')[0].split()
        if not ln:
            continue
        if ln[0] == 'v':
            if ln[1] in V:
                raise SystemExit(f'corner {ln[1]} named twice')
            V[ln[1]] = (float(ln[2]), float(ln[3]))
        elif ln[0] == 'f':
            Fs.append(dict(part=ln[1], name=ln[2], ring=ln[3:]))
    for f in Fs:
        for n in f['ring']:
            if n not in V:
                raise SystemExit(f"facet {f['name']}: no corner {n}")
    return V, Fs


def t_junctions(V, Fs, tol=1.2):
    """A corner lying on another facet's edge is put into that edge, so the mesh has no cracks."""
    P = {k: np.array(v) for k, v in V.items()}
    for f in Fs:
        r = f['ring']
        out = []
        for a, b in zip(r, r[1:] + r[:1]):
            out.append(a)
            pa, pb = P[a], P[b]
            ab = pb - pa
            L2 = float(ab @ ab)
            hits = []
            for k, p in P.items():
                if k in (a, b):
                    continue
                t = float((p - pa) @ ab) / L2
                if 0.02 < t < 0.98 and np.linalg.norm(pa + t * ab - p) < tol:
                    hits.append((t, k))
            out += [k for _, k in sorted(hits)]
        f['ring'] = out


def colour(img, pts, k):
    m = np.zeros(img.shape[:2], np.uint8)
    cv2.fillPoly(m, [np.round(np.array(pts) * k * 4).astype(np.int32)], 1, shift=2)
    e = cv2.erode(m, np.ones((3, 3), np.uint8), iterations=int(3 * k))
    px = img[e > 0] if e.sum() > 12 else img[m > 0]
    if not len(px):
        return [0, 0, 0]
    return [int(c) for c in np.median(px, axis=0)[::-1]]


def snap(V, Fs, img, k, rad):
    """Move each corner (by at most rad px) to where the colour steps hardest across its edges."""
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
    nb = {n: set() for n in V}
    for f in Fs:
        r = f['ring']
        for a, b in zip(r, r[1:] + r[:1]):
            nb[a].add(b)
            nb[b].add(a)
    H = lab.shape[0]

    def sample(p):
        x, y = int(round(p[0] * k)), int(round(p[1] * k))
        if 0 <= x < H and 0 <= y < H:
            return lab[y, x]
        return np.array([255.0, 128, 128])

    def score(p, others):
        s = 0.0
        for q in others:
            q = np.array(V[q])
            d = q - p
            L = np.linalg.norm(d)
            if L < 4:
                continue
            n = np.array([-d[1], d[0]]) / L
            for t in np.linspace(0.15, 0.85, 8):
                c = p + t * d
                s += np.linalg.norm(sample(c + 1.5 * n) - sample(c - 1.5 * n))
        return s

    out = dict(V)
    for name, p in V.items():
        if not nb[name]:
            continue
        p = np.array(p)
        best, bs = p, score(p, nb[name])
        for dx in np.arange(-rad, rad + 0.01, 0.5):
            for dy in np.arange(-rad, rad + 0.01, 0.5):
                q = p + (dx, dy)
                s = score(q, nb[name])
                if s > bs * 1.02:
                    best, bs = q, s
        out[name] = (round(float(best[0]), 2), round(float(best[1]), 2))
    return out


def build(cfg):
    V, Fs = read(os.path.join(HERE, cfg['hand']))
    img = cv2.imread(os.path.join(C.MAIN, cfg['source']))
    k = img.shape[0] / 1024
    if cfg.get('snap'):
        V = snap(V, Fs, img, k, cfg['snap'])
    t_junctions(V, Fs)
    names = list(V)
    vid = {n: i for i, n in enumerate(names)}
    polys = []
    for i, f in enumerate(Fs):
        pts = [V[n] for n in f['ring']]
        poly = Polygon(pts)
        if not poly.is_valid:
            print('facet', f['name'], 'is not a simple polygon:', shapely.is_valid_reason(poly))
        tris = []
        T = shapely.constrained_delaunay_triangles(poly if poly.is_valid else shapely.make_valid(poly))
        lookup = {(round(x, 3), round(y, 3)): vid[n] for n, (x, y) in ((n, V[n]) for n in f['ring'])}
        for t in getattr(T, 'geoms', []):
            c = [(round(x, 3), round(y, 3)) for x, y in list(t.exterior.coords)[:3]]
            if all(p in lookup for p in c):
                tris.append([lookup[p] for p in c])
            else:
                print('facet', f['name'], 'triangle off its corners', c)
        polys.append(dict(id=i + 1, name=f['name'], part=f['part'], ring=[vid[n] for n in f['ring']], holes=[],
                          tris=tris, rgb=colour(img, pts, k), area=round(poly.area, 1),
                          c=list(poly.representative_point().coords[0])))
    return dict(source=cfg['source'], hand=cfg['hand'], snap=cfg.get('snap', 0),
                verts=[list(V[n]) for n in names], names=names, polys=polys), img


def draw(data, img, out, scale=2):
    W = 1024 * scale
    im = cv2.resize(img, (W, W), interpolation=cv2.INTER_AREA)
    V = np.array(data['verts']) * scale
    for p in data['polys']:
        r = p['ring']
        cv2.polylines(im, [np.round(V[r] * 4).astype(np.int32)], True, (200, 0, 255), 2, cv2.LINE_AA, shift=2)
    for x, y in V:
        cv2.circle(im, (int(x), int(y)), 3, (0, 230, 255), -1)
    for p in data['polys']:
        x, y = np.array(p['c']) * scale
        cv2.putText(im, p['name'], (int(x) - 8, int(y) + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (255, 255, 255), 1,
                    cv2.LINE_AA)
    cv2.imwrite(out, im, [cv2.IMWRITE_WEBP_QUALITY, 92])


def flat(data, out):
    """The facets painted in their colours (what the mesh's front render should show)."""
    im = np.full((1024, 1024, 3), (230, 227, 224), np.uint8)
    V = np.array(data['verts'])
    for p in data['polys']:
        for t in p['tris']:
            cv2.fillPoly(im, [np.round(V[t] * 4).astype(np.int32)], tuple(p['rgb'][::-1]), shift=2)
    cv2.imwrite(out, im)


def main():
    name = sys.argv[1]
    cfg = json.load(open(MAPS))[name]
    data, img = build(cfg)
    d = os.path.join(OUT, 'wire')
    os.makedirs(d, exist_ok=True)
    json.dump(data, open(os.path.join(d, name + '.json'), 'w'))
    draw(data, img, os.path.join(d, name + '.webp'))
    flat(data, os.path.join(d, name + '-flat.png'))
    print(name, len(data['verts']), 'corners', len(data['polys']), 'facets',
          sum(len(p['tris']) for p in data['polys']), 'triangles')


if __name__ == '__main__':
    main()
