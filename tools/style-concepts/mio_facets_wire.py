# char-mio-facets: the facet map of a flat-shaded picture, as a clean planar graph (Jørgen, 2026-10-01, on
# char-mio-i2i-1: "placing the actual edges where they need to go"). The pictures are drawn in flat facets with
# crisp edges, so the facets are measured, not guessed:
#   1. segment: mean shift flattens the soft shading inside a facet, Felzenszwalb splits the figure into regions;
#   2. merge: neighbours whose shared border is a weak edge (low colour step across it) become one facet, drawn
#      outline strokes (thinner than STROKE px) are split between the regions on either side, and slivers smaller
#      than MIN_AREA join the neighbour they share most border with;
#   3. vectorise: the borders between regions are traced on the pixel-corner grid; corners where three or more
#      regions meet are the facet corners (junctions closer than SNAP become one), and each border between two
#      corners is straightened (Douglas-Peucker, EPS) on its own, so neighbouring facets share exact edges;
#   4. each facet is a polygon over those shared vertices, triangulated (constrained Delaunay), with its own colour
#      (the median of its pixels, away from its edges).
#   ~/ai/cv-venv/bin/python tools/style-concepts/mio_facets_wire.py <map>
# <map> names an entry in mio-facets-maps.json: the picture, its mask (white = figure; else the picture's alpha, else
# not-background), parameters and hand edits (apply_edits). Writes claude-miofacets/wire/<name>.json
# (vertices in the picture's 1024 px frame; facets as rings of vertex ids, holes, triangles, colour) and <name>.webp
# (the facet edges over the picture).
import json
import os
import sys
from collections import defaultdict

import cv2
import numpy as np
import shapely
from scipy import ndimage
from shapely.geometry import Polygon
from skimage import graph as skgraph
from skimage.segmentation import felzenszwalb

import mio_i2i_cam as C

OUT = os.path.join(C.MAIN, 'art/parts/style-concepts/claude-miofacets')
P = dict(clahe=3.0, work=2048, ms_sp=8, ms_sr=12, scale=250, sigma=0.8, min_size=150, weak=7.0, stroke=3.2, min_area=600,
         snap=7.0, eps=4.5)


def figure_mask(im, mask_path, work):
    if mask_path:
        m = cv2.imread(mask_path, cv2.IMREAD_UNCHANGED)
        if m.ndim == 3:
            m = m[..., 3] if m.shape[2] == 4 else m[..., 0]
        return cv2.resize(m, (work, work), interpolation=cv2.INTER_AREA) > 127
    if im.shape[2] == 4:
        return im[..., 3] > 127
    rgb = im[..., :3].astype(np.float32)
    bg = np.median(np.concatenate([rgb[:, :80], rgb[:, -80:]], axis=1), axis=1, keepdims=True)
    m = np.abs(rgb - bg).max(axis=2) > 16
    blue = (rgb[..., 0] > rgb[..., 2] + 18) & (rgb.mean(axis=2) < 205) & (rgb.mean(axis=2) > 120)  # BGR: cast shadows are blue-grey
    m = m & ~blue
    m = ndimage.binary_opening(m, iterations=2)
    lab, n = ndimage.label(m)
    if n > 1:
        sizes = ndimage.sum(m, lab, range(1, n + 1))
        m = np.isin(lab, 1 + np.nonzero(sizes > sizes.max() * 0.02)[0])
    return ndimage.binary_fill_holes(m)


def relabel(lab):
    """Background stays 0, regions become 1..n."""
    out = np.zeros_like(lab)
    u = np.unique(lab[lab > 0])
    lut = np.zeros(lab.max() + 1, np.int64)
    lut[u] = np.arange(1, len(u) + 1)
    out = lut[lab]
    out[lab <= 0] = 0
    return out


def enhance(img):
    """Local contrast on lightness (CLAHE), so the dark hoodie facets step as clearly as the light ones."""
    if P['clahe'] <= 0:
        return img
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    cl = cv2.createCLAHE(clipLimit=P['clahe'], tileGridSize=(16, 16))
    lab[..., 0] = cl.apply(lab[..., 0])
    return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)


def segment(img, fig):
    img = enhance(img)
    flat = cv2.pyrMeanShiftFiltering(img, P['ms_sp'], P['ms_sr'])
    labf = cv2.cvtColor(flat, cv2.COLOR_BGR2LAB).astype(np.float32)
    seg = felzenszwalb(labf, scale=P['scale'], sigma=P['sigma'], min_size=P['min_size']) + 1
    seg[~fig] = 0
    # split regions that the figure mask cut in two
    lab = np.zeros_like(seg)
    nxt = 1
    for r in np.unique(seg[seg > 0]):
        cc, n = ndimage.label(seg == r)
        lab[cc > 0] = cc[cc > 0] + nxt - 1
        nxt += n
    return lab, cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)


def merge_weak(lab, labimg):
    """Join neighbours whose border is a weak edge: the colour step across it (median over the border) under WEAK."""
    g = np.zeros(lab.shape, np.float32)
    # colour step measured 2 px across, so anti-aliased edges count in full
    for ax in (0, 1):
        a = np.roll(labimg, 2, axis=ax)
        b = np.roll(labimg, -2, axis=ax)
        g = np.maximum(g, np.linalg.norm(a - b, axis=2))
    g[lab == 0] = 1000
    g = ndimage.maximum_filter(g, size=1)
    fig = lab > 0
    rag = skgraph.rag_boundary(np.where(fig, lab, 0), g)
    if 0 in rag:
        rag.remove_node(0)

    def wf(graph, src, dst, n):
        d = {'weight': 0.0, 'count': 0}
        a, b = graph[src].get(n, d), graph[dst].get(n, d)
        c = a['count'] + b['count']
        return {'count': c, 'weight': (a['count'] * a['weight'] + b['count'] * b['weight']) / max(c, 1)}

    def mf(graph, src, dst):
        pass

    out = skgraph.merge_hierarchical(np.where(fig, lab, 0), rag, thresh=P['weak'], rag_copy=False,
                                     in_place_merge=True, merge_func=mf, weight_func=wf)
    out = out + 1
    out[~fig] = 0
    return relabel(out)


def dissolve(lab, which):
    """Hand the pixels of the regions in `which` to the nearest other region."""
    kill = np.isin(lab, list(which)) & (lab > 0)
    if not kill.any():
        return lab
    keep = ~kill
    _, (iy, ix) = ndimage.distance_transform_edt(~keep, return_indices=True)
    out = lab.copy()
    out[kill] = lab[iy[kill], ix[kill]]
    return out


def strokes_and_slivers(lab):
    fig = lab > 0
    for _ in range(3):
        n = lab.max()
        objs = ndimage.find_objects(lab)
        thin, small = set(), set()
        for r in range(1, n + 1):
            sl = objs[r - 1]
            if sl is None:
                continue
            m = lab[sl] == r
            a = m.sum()
            if a < P['min_area']:
                small.add(r)
                continue
            dt = ndimage.distance_transform_edt(np.pad(m, 1))
            if dt.max() < P['stroke']:
                thin.add(r)
        if not thin and not small:
            break
        lab = dissolve(lab, thin | small)
        lab[~fig] = 0
        # a region the hand-out split in two becomes two
        lab = split_cc(lab)
    return relabel(lab)


def split_cc(lab):
    out = np.zeros_like(lab)
    nxt = 1
    objs = ndimage.find_objects(lab)
    for r, sl in enumerate(objs, 1):
        if sl is None:
            continue
        cc, n = ndimage.label(lab[sl] == r)
        o = out[sl]
        o[cc > 0] = cc[cc > 0] + nxt - 1
        nxt += n
    return out


# ---- vectorise ---------------------------------------------------------------------------------------------

def trace(lab):
    """Borders between regions on the pixel-corner grid -> chains of corner points between junctions, each with the
    two labels it separates."""
    L = np.pad(lab, 1, constant_values=0)
    H, W = L.shape  # corners are (i, j) with 0..H, 0..W; pixel (i, j) has corners (i, j)..(i+1, j+1)
    # crack edges: horizontal edge (i, j)-(i, j+1) separates pixel (i-1, j) and (i, j)
    hz = np.zeros((H + 1, W), bool)
    hz[1:H] = L[:-1] != L[1:]
    vt = np.zeros((H, W + 1), bool)
    vt[:, 1:W] = L[:, :-1] != L[:, 1:]
    deg = np.zeros((H + 1, W + 1), np.int8)
    deg[:, :-1] += hz
    deg[:, 1:] += hz
    deg[:-1, :] += vt
    deg[1:, :] += vt
    Lp = np.pad(L, 1, constant_values=0)  # Lp[i, j] = L[i-1, j-1]
    q = np.stack([Lp[:-1, :-1], Lp[:-1, 1:], Lp[1:, :-1], Lp[1:, 1:]])  # the 4 pixels round corner (i, j)
    nd = (q[0] != q[1]).astype(int) + (q[0] != q[2]) + (q[0] != q[3])
    distinct = np.ones(deg.shape, int)
    distinct += (q[1] != q[0])
    distinct += (q[2] != q[0]) & (q[2] != q[1])
    distinct += (q[3] != q[0]) & (q[3] != q[1]) & (q[3] != q[2])
    junc = (distinct >= 3) | (deg == 4)
    del nd

    def edges_at(i, j):
        out = []
        if j < W and hz[i, j]:
            out.append(('h', i, j, (i, j + 1)))
        if j > 0 and hz[i, j - 1]:
            out.append(('h', i, j - 1, (i, j - 1)))
        if i < H and vt[i, j]:
            out.append(('v', i, j, (i + 1, j)))
        if i > 0 and vt[i - 1, j]:
            out.append(('v', i - 1, j, (i - 1, j)))
        return out

    used_h = np.zeros_like(hz)
    used_v = np.zeros_like(vt)

    def sides(e):
        k, i, j = e[0], e[1], e[2]
        if k == 'h':
            return tuple(sorted((int(L[i - 1, j]), int(L[i, j]))))
        return tuple(sorted((int(L[i, j - 1]), int(L[i, j]))))

    def mark(e):
        if e[0] == 'h':
            used_h[e[1], e[2]] = True
        else:
            used_v[e[1], e[2]] = True

    def used(e):
        return used_h[e[1], e[2]] if e[0] == 'h' else used_v[e[1], e[2]]

    chains = []

    def walk(start, e):
        pts = [start]
        lr = sides(e)
        cur = start
        while True:
            mark(e)
            nxt = e[3]
            pts.append(nxt)
            if junc[nxt] or nxt == start:
                break
            cand = [f for f in edges_at(*nxt) if not used(f)]
            if not cand:
                break
            e = cand[0]
            cur = nxt
        chains.append((pts, lr))

    ji, jj = np.nonzero(junc & (deg > 0))
    for i, j in zip(ji, jj):
        for e in edges_at(i, j):
            if not used(e):
                walk((i, j), e)
    # closed loops with no junction on them
    for arr, kind in ((hz, 'h'), (vt, 'v')):
        ii, jj2 = np.nonzero(arr & ~(used_h if kind == 'h' else used_v))
        for i, j in zip(ii, jj2):
            e = (kind, i, j, (i, j + 1) if kind == 'h' else (i + 1, j))
            if used(e):
                continue
            start = (i, j)
            junc[start] = True
            walk(start, e)
    # corner (i, j) in padded-label space is image point (x = j - 1, y = i - 1)
    return [([(j - 1.0, i - 1.0) for i, j in pts], lr) for pts, lr in chains]


def dp(pts, eps):
    pts = np.asarray(pts, float)
    if len(pts) < 3:
        return pts
    if np.allclose(pts[0], pts[-1]):
        # closed: split at the point farthest from the start
        k = int(np.argmax(np.linalg.norm(pts - pts[0], axis=1)))
        a = dp(pts[:k + 1], eps)
        b = dp(pts[k:], eps)
        return np.concatenate([a, b[1:]])
    a, b = pts[0], pts[-1]
    ab = b - a
    n = np.hypot(*ab)
    if n < 1e-9:
        d = np.linalg.norm(pts - a, axis=1)
    else:
        w = pts - a
        d = np.abs(ab[0] * w[:, 1] - ab[1] * w[:, 0]) / n
    k = int(np.argmax(d))
    if d[k] <= eps:
        return np.array([a, b])
    return np.concatenate([dp(pts[:k + 1], eps)[:-1], dp(pts[k:], eps)])


def vectorise(lab):
    chains = trace(lab)
    # snap junctions: endpoints closer than SNAP become one corner
    ends = []
    for pts, _ in chains:
        ends.append(pts[0])
        ends.append(pts[-1])
    E = np.unique(np.array(ends), axis=0)
    parent = list(range(len(E)))

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    from scipy.spatial import cKDTree
    tree = cKDTree(E)
    for a, b in tree.query_pairs(P['snap']):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb
    groups = defaultdict(list)
    for i in range(len(E)):
        groups[find(i)].append(i)
    cen = {}
    for r, ids in groups.items():
        c = E[ids].mean(axis=0)
        for i in ids:
            cen[tuple(E[i])] = (round(float(c[0]), 2), round(float(c[1]), 2))
    segs = []
    for pts, lr in chains:
        a, b = cen[pts[0]], cen[pts[-1]]
        p = dp(pts, P['eps'])
        p = [tuple(x) for x in p.tolist()]
        p[0], p[-1] = a, b
        # drop inner points that the snap left on top of an end
        q = [p[0]] + [x for x in p[1:-1] if np.hypot(x[0] - a[0], x[1] - a[1]) > 1.5 and
                      np.hypot(x[0] - b[0], x[1] - b[1]) > 1.5] + [p[-1]]
        if len(q) == 2 and q[0] == q[1]:
            continue
        segs.append((q, lr))
    return segs


def rings_for(segs):
    """Per region: its border pieces linked into closed rings."""
    by = defaultdict(list)
    for k, (pts, lr) in enumerate(segs):
        for r in set(lr):
            if r > 0:
                by[r].append(k)
    out = {}
    for r, ks in by.items():
        pieces = [list(segs[k][0]) for k in ks]
        rings = []
        while pieces:
            ring = pieces.pop()
            guard = 0
            while ring[0] != ring[-1] and guard < 10000:
                guard += 1
                hit = False
                for i, pc in enumerate(pieces):
                    if pc[0] == ring[-1]:
                        ring += pc[1:]
                    elif pc[-1] == ring[-1]:
                        ring += pc[::-1][1:]
                    else:
                        continue
                    pieces.pop(i)
                    hit = True
                    break
                if not hit:
                    break
            if ring[0] == ring[-1] and len(ring) >= 4:
                rings.append(ring[:-1])
        out[r] = rings
    return out


def facets(lab, segs, rgb):
    rings = rings_for(segs)
    vid = {}
    verts = []

    def v(p):
        if p not in vid:
            vid[p] = len(verts)
            verts.append(p)
        return vid[p]

    out = []
    er = None
    for r, rs in rings.items():
        polys = [Polygon(x) for x in rs]
        polys = [p for p in polys if p.is_valid and p.area > 4] or [shapely.make_valid(Polygon(x)) for x in rs]
        if not polys:
            continue
        rs2 = sorted(zip(polys, rs), key=lambda t: -t[0].area)
        outer_p, outer = rs2[0]
        holes = [h for p, h in rs2[1:] if outer_p.contains(p.representative_point())]
        poly = Polygon(outer, holes)
        if not poly.is_valid:
            poly = shapely.make_valid(poly)
        tris = []
        try:
            T = shapely.constrained_delaunay_triangles(poly)
            for t in getattr(T, 'geoms', []):
                c = list(t.exterior.coords)[:3]
                tris.append([v((round(x, 2), round(y, 2))) for x, y in c])
        except Exception as e:  # noqa: BLE001
            print('triangulate failed', r, e)
        m = lab == r
        er = ndimage.binary_erosion(m, iterations=3)
        px = rgb[er] if er.sum() > 20 else rgb[m]
        col = np.median(px, axis=0)
        out.append(dict(id=int(r), ring=[v(p) for p in outer], holes=[[v(p) for p in h] for h in holes],
                        tris=tris, rgb=[int(c) for c in col], area=float(poly.area),
                        c=list(poly.representative_point().coords[0])))
    return verts, out


def apply_edits(lab, ed):
    """Hand edits to the measured map, in the 1024 frame: cuts (polylines that split a region where the picture has
    an edge the segmentation missed), merges (regions under these points are one facet), dissolve (boxes: regions
    centred inside are handed to their neighbours; the face's eyes, brows and mouth, which are texture)."""
    W = lab.shape[0]
    k = W / 1024
    fig = lab > 0
    if ed.get('cuts'):
        B = np.zeros(lab.shape, np.uint8)
        for line in ed['cuts']:
            cv2.polylines(B, [np.array([[x * k, y * k] for x, y in line], np.int32)], False, 1, 2)
        B = (B > 0) & fig
        lab2 = lab.copy()
        lab2[B] = 0
        lab2 = split_cc(lab2)
        _, (iy, ix) = ndimage.distance_transform_edt(lab2 == 0, return_indices=True)
        lab2[B] = lab2[iy[B], ix[B]]
        lab2[~fig] = 0
        lab = lab2
    for pts in ed.get('merge', []):
        ids = {int(lab[int(y * k), int(x * k)]) for x, y in pts} - {0}
        if len(ids) > 1:
            t = min(ids)
            lab[np.isin(lab, list(ids))] = t
    if ed.get('dissolve'):
        cy = ndimage.center_of_mass(fig, lab, range(1, lab.max() + 1))
        kill = set()
        for r, (yy, xx) in enumerate(cy, 1):
            if np.isnan(yy):
                continue
            for x0, y0, x1, y1 in ed['dissolve']:
                if x0 * k <= xx <= x1 * k and y0 * k <= yy <= y1 * k:
                    kill.add(r)
        lab = dissolve(lab, kill)
        lab[~fig] = 0
    return relabel(lab)


def extract(path, mask_path=None, edits=None):
    W = P['work']
    im = cv2.imread(path, cv2.IMREAD_UNCHANGED)
    im = cv2.resize(im, (W, W), interpolation=cv2.INTER_AREA)
    fig = figure_mask(im, mask_path, W)
    img = np.ascontiguousarray(im[..., :3])
    lab, labimg = segment(img, fig)
    n0 = lab.max()
    lab = merge_weak(lab, labimg)
    n1 = lab.max()
    if edits:
        lab = apply_edits(lab, edits)
    lab = strokes_and_slivers(lab)
    print('regions', n0, '-> weak merged', n1, '-> clean', lab.max())
    segs = vectorise(lab)
    rgb = img[..., ::-1]
    verts, polys = facets(lab, segs, rgb)
    k = 1024 / W
    for p in polys:
        p['c'] = [round(p['c'][0] * k, 2), round(p['c'][1] * k, 2)]
        p['area'] = round(p['area'] * k * k, 1)
    data = dict(source=os.path.relpath(path, C.MAIN), params=P,
                verts=[[round(x * k, 3), round(y * k, 3)] for x, y in verts], polys=polys,
                edges=[[[round(x * k, 3), round(y * k, 3)] for x, y in pts] for pts, _ in segs])
    return img, lab, data


def draw(img, data, out, scale=2):
    """The facet edges over the picture (edges magenta, corners yellow), at `scale` x the 1024 frame."""
    W = 1024 * scale
    base = cv2.resize(img, (W, W), interpolation=cv2.INTER_AREA)
    over = base.copy()
    for pts in data['edges']:
        p = np.array([[x * scale, y * scale] for x, y in pts], np.int32)
        cv2.polylines(over, [p], False, (200, 0, 255), 1 if scale < 2 else 2, cv2.LINE_AA)
    for x, y in data['verts']:
        cv2.circle(over, (int(x * scale), int(y * scale)), 2 if scale < 2 else 3, (0, 230, 255), -1)
    cv2.imwrite(out, over, [cv2.IMWRITE_WEBP_QUALITY, 92])


MAPS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mio-facets-maps.json')


def main():
    name = sys.argv[1]
    cfg = json.load(open(MAPS))[name]
    P.update(cfg.get('params', {}))
    path = os.path.join(C.MAIN, cfg['source'])
    mask = os.path.join(C.MAIN, cfg['mask']) if cfg.get('mask') else None
    d = os.path.join(OUT, 'wire')
    os.makedirs(d, exist_ok=True)
    img, lab, data = extract(path, mask, cfg.get('edits'))
    json.dump(data, open(os.path.join(d, name + '.json'), 'w'))
    np.save(os.path.join(d, name + '-labels.npy'), lab.astype(np.int32))
    draw(img, data, os.path.join(d, name + '.webp'))
    print(name, len(data['verts']), 'vertices', len(data['edges']), 'edges', len(data['polys']), 'facets',
          sum(len(p['tris']) for p in data['polys']), 'triangles')


if __name__ == '__main__':
    main()
