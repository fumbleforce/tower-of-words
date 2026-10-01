# char-mio-i2i, the facet wireframe read off a picture (Jørgen, 2026-10-01: "try generating the wireframe ... to try
# lining up all the points"). The pictures are flat-shaded facets, so the facets can be measured, not guessed: flatten
# the soft gradients (mean shift), split the figure into regions of one colour (Felzenszwalb), outline each region as
# a polygon (Douglas-Peucker, 4 px at 1536), and snap corners closer than 6 px into one shared vertex. The result is
# a planar graph of facet corners: where the model's vertices go.
#   ~/ai/cv-venv/bin/python tools/style-concepts/mio_i2i_wire.py <name> <picture> [mask]
# picture: an RGB picture or an RGBA cut-out; mask: optional, white = figure (else alpha, else not-background).
# Writes claude-mioi2i/wire/<name>.json (vertices in the picture's 1024 px frame, polygons as vertex lists, each with
# its median colour) and <name>.webp (the wireframe over the picture: edges magenta, corners yellow).
# Needs OpenCV and scikit-image: ~/ai/cv-venv (python -m venv; pip install opencv-python-headless scikit-image scipy
# pillow).
import json
import os
import sys

import cv2
import numpy as np
from skimage.segmentation import felzenszwalb

import mio_i2i_cam as C

WORK = 1536  # working size
EPS = 4.0  # polygon simplification, px at WORK
SNAP = 6.0  # corners closer than this are one vertex, px at WORK
SCALE = 150  # Felzenszwalb scale: bigger, fewer facets


def figure_mask(im, mask_path):
    if mask_path:
        m = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
        return cv2.resize(m, (WORK, WORK), interpolation=cv2.INTER_NEAREST) > 127
    if im.shape[2] == 4:
        return im[..., 3] > 127
    rgb = im[..., :3].astype(np.float32)
    bg = np.median(np.concatenate([rgb[:, :80], rgb[:, -80:]], axis=1), axis=1, keepdims=True)
    m = np.abs(rgb - bg).max(axis=2) > 16
    blue = (rgb[..., 0] > rgb[..., 2] + 18) & (rgb.mean(axis=2) < 205)  # BGR: cast shadows are blue-grey
    return m & ~blue


def extract(path, mask_path=None):
    im = cv2.imread(path, cv2.IMREAD_UNCHANGED)
    im = cv2.resize(im, (WORK, WORK), interpolation=cv2.INTER_AREA)
    fig = figure_mask(im, mask_path)
    rgb = im[..., :3].copy()
    rgb[~fig] = (230, 227, 224)
    flat = cv2.pyrMeanShiftFiltering(rgb, 6, 14)
    lab = felzenszwalb(cv2.cvtColor(flat, cv2.COLOR_BGR2LAB), scale=SCALE, sigma=0.6, min_size=120)
    lab[~fig] = -1
    verts, polys = [], []

    def vid(p):
        for i, q in enumerate(verts):
            if (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 < SNAP * SNAP:
                return i
        verts.append((float(p[0]), float(p[1])))
        return len(verts) - 1

    for r in np.unique(lab):
        if r < 0:
            continue
        m = (lab == r).astype(np.uint8)
        cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        for c in cs:
            if cv2.contourArea(c) < 80:
                continue
            p = cv2.approxPolyDP(c, EPS, True)[:, 0]
            ids = []
            for q in p:
                i = vid(q)
                if not ids or ids[-1] != i:
                    ids.append(i)
            if len(ids) > 1 and ids[0] == ids[-1]:
                ids.pop()
            if len(ids) >= 3:
                col = np.median(rgb[m > 0], axis=0)[::-1]
                polys.append(dict(v=ids, rgb=[int(x) for x in col]))
    k = 1024 / WORK
    return rgb, dict(source=os.path.relpath(path, C.MAIN), work=WORK, eps=EPS, snap=SNAP, scale=SCALE,
                     verts=[[round(x * k, 2), round(y * k, 2)] for x, y in verts], polys=polys)


def draw(rgb, data, out):
    k = WORK / 1024
    img = rgb.copy()
    edges = set()
    for p in data['polys']:
        v = p['v']
        for a, b in zip(v, v[1:] + v[:1]):
            edges.add((min(a, b), max(a, b)))
    V = [(int(x * k), int(y * k)) for x, y in data['verts']]
    for a, b in edges:
        cv2.line(img, V[a], V[b], (160, 0, 255), 1, cv2.LINE_AA)
    for p in V:
        cv2.circle(img, p, 2, (0, 230, 255), -1)
    ys, xs = np.nonzero((img != rgb).any(axis=2))
    box = img[max(0, ys.min() - 20):ys.max() + 20, max(0, xs.min() - 40):xs.max() + 40]
    cv2.imwrite(out, box, [cv2.IMWRITE_WEBP_QUALITY, 92])
    return len(edges)


def main():
    name, path = sys.argv[1], sys.argv[2]
    mask = sys.argv[3] if len(sys.argv) > 3 else None
    d = os.path.join(C.OUT, 'wire')
    os.makedirs(d, exist_ok=True)
    rgb, data = extract(path, mask)
    json.dump(data, open(os.path.join(d, name + '.json'), 'w'))
    n = draw(rgb, data, os.path.join(d, name + '.webp'))
    print(name, len(data['verts']), 'corners', n, 'edges', len(data['polys']), 'facets')


if __name__ == '__main__':
    main()
